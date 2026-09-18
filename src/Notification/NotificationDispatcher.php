<?php
/**
 * Notification dispatcher (§7, NB-4, REST review 2026-07-12).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Notification;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Availability\BusinessTimezone;
use Aponto\Booking\Booking;
use Aponto\Booking\Repository\ActivityRepository;
use Aponto\Booking\ManageToken;
use Aponto\Booking\TokenGenerator;
use Aponto\Frontend\BookingManagePage;
use Aponto\Installation\Seeder;
use Aponto\Plan;
use Aponto\Rest\Support\TimezoneLabel;
use Aponto\Support\Clock;
use Aponto\Support\Crypto;
use Aponto\Support\Logger;
use Aponto\Support\Settings;

/**
 * Turns committed domain changes into email deliveries (§7).
 *
 * CREATED notifications use a transactional outbox (REST-1): {@see self::queueCreated()} runs
 * INSIDE the reservation transaction (via the engine's on-persist seam) — it renders NOW (with the
 * request-scoped raw token), claims a unique `dispatch_key` and persists the encrypted payload as a
 * `queued` row. A rollback removes the rows with the booking (acceptance #9). Post-commit the
 * controller calls {@see self::flushBooking()} to send; if the process dies first, the cleanup cron
 * ({@see self::retryPending()}) sends the still-queued rows from their cipher — the customer never
 * loses the manage link. A replay flushes leftovers without creating new rows.
 *
 * STATUS/RESCHEDULE notifications are dispatched post-commit by the listener (claim → send → mark);
 * a crash between claim and send is likewise recovered by the cron.
 *
 * MANAGE TOKEN (D-R25 + D-R26, founder 2026-08-02): DURABLE for the booking's lifetime and present
 * in EVERY customer lifecycle email. Creation anchors it once; nothing rotates it, so this
 * dispatcher never writes `bookings.token_hash`. Post-creation emails REBUILD the same token by
 * derivation ({@see ManageToken}) rather than carrying it, so `{manage_link}`/`{cancel_link}`/
 * `{ics_link}` resolve in the confirmed, rescheduled, reminder and cancelled emails too — while the
 * raw token is still never stored (NB-4, §5 invariant 8). When derivation cannot reproduce the
 * stored hash — a legacy pre-D-R26 booking, an erased booking, or a site without a derivation
 * secret — the placeholders render EMPTY and the optional-line contract strips the line, which is
 * exactly the D-R25/D-R3 behaviour those cases keep.
 *
 * MODULE MESSAGES (D-R29): {@see self::queueModuleMessage()} is the one public seam a module sender
 * uses. It carries its copy inline and its send guard as data, and otherwise travels the identical
 * policy → recipient → token → flood → render → encrypt → claim path, so a module inherits every
 * safety property of the core outbox instead of re-implementing (or skipping) one. The seam names no
 * module and lives in shared code (§5 invariant 2).
 *
 * Key handling (REST-7): with a missing/placeholder `SECURE_AUTH_KEY` NOTHING is encrypted under a
 * source-code key. The mail still goes out once from the in-memory rendering, but the row keeps an
 * empty cipher + `no_secure_auth_key` (non-retryable) and the admin is told to define the key.
 */
final class NotificationDispatcher {

	/**
	 * Encryption domain for the rendered payload.
	 */
	private const MAIL_DOMAIN = 'aponto-mail';

	/**
	 * Error marker for deliveries persisted without a usable encryption key (REST-7).
	 */
	public const NO_KEY_ERROR = 'no_secure_auth_key';

	/**
	 * Placeholders that resolve to a MANAGE-TOKEN URL. A payload carrying any of these embeds the
	 * booking's manage token, so it rides the `_token_hash` send guard. The public booking-page link
	 * ({@see Placeholders} `booking_page_link`) is NOT here — it is not token-bound.
	 *
	 * @var list<string>
	 */
	private const LIVE_TOKEN_PLACEHOLDERS = array( 'manage_link', 'cancel_link', 'ics_link' );

	/**
	 * Attempts value that permanently excludes a delivery from the cron retry query (which requires
	 * `attempts < 2`). Used for TERMINAL drops — payloads that must never be sent (token no longer
	 * live, reminder stale) — as opposed to transient transport failures, which increment attempts
	 * and stay retryable.
	 */
	private const ATTEMPTS_EXHAUSTED = 2;

	/**
	 * Queue outcomes reported by {@see self::queueModuleMessage()} (D-R29 review finding 1).
	 *
	 * The distinction that matters to a caller keeping its own sent-state is DEFINITIVE vs UNKNOWN,
	 * not success vs failure:
	 *
	 * - `QUEUED` and `DUPLICATE` both mean a delivery row for this dispatch key EXISTS — the first
	 *   because this call created it, the second because an earlier one did. Either way the message
	 *   is now the outbox's responsibility and the caller must not queue it again.
	 * - `SUPPRESSED` is a DELIBERATE refusal — the policy filter said suppress, the template is
	 *   disabled, the recipient is unusable, or a flood cap fired. The system answered; re-asking on
	 *   the next tick would only reproduce the same answer, and for the flood caps it would mean
	 *   retrying an email the site explicitly capped.
	 * - `FAILED` is the only UNKNOWN: something threw. Nothing can be concluded about whether a row
	 *   exists, so a caller that recorded a claim before calling must be able to reclaim it.
	 *
	 * {@see self::queueModuleMessage()} for why a caller cannot infer this from the ledger itself.
	 */
	public const OUTCOME_QUEUED = 'queued';

	/** A delivery row for this dispatch key already existed — see {@see self::OUTCOME_QUEUED}. */
	public const OUTCOME_DUPLICATE = 'duplicate';

	/** Deliberately not queued (policy, no recipient, flood cap). */
	public const OUTCOME_SUPPRESSED = 'suppressed';

	/**
	 * The template for this message is switched OFF, so there was never anything to send.
	 *
	 * Split out of {@see self::OUTCOME_SUPPRESSED} in 2026-09-03's review because the two are
	 * different FACTS and the admin UI was conflating them into "Customer notified": `suppressed`
	 * means the system declined to send a message it has, `disabled` means the site never turned
	 * that email on (true of `booking_completed_customer` and `booking_no_show_customer` on every
	 * fresh install). {@see self::queueModuleMessage()} folds it back into `suppressed` so the
	 * module seam's published contract keeps its original four values.
	 */
	public const OUTCOME_DISABLED = 'disabled';

	/** An exception was swallowed — nothing is known about whether a row exists. */
	public const OUTCOME_FAILED = 'failed';

	/**
	 * Crypto primitive, or null when no usable key material exists (REST-7).
	 *
	 * @var Crypto|null
	 */
	private ?Crypto $crypto;

	/**
	 * Deliveries ledger.
	 *
	 * @var DeliveryRepository
	 */
	private DeliveryRepository $deliveries;

	/**
	 * Template store.
	 *
	 * @var TemplateRepository
	 */
	private TemplateRepository $templates;

	/**
	 * Sender.
	 *
	 * @var SyncSender
	 */
	private SyncSender $sender;

	/**
	 * Activity log.
	 *
	 * @var ActivityRepository
	 */
	private ActivityRepository $activities;

	/**
	 * Manage-token hasher — used ONLY to pin a payload's `_token_hash` send guard. The dispatcher
	 * never mints a token any more (D-R25: the token is durable, minted once at creation).
	 *
	 * @var TokenGenerator
	 */
	private TokenGenerator $tokens;

	/**
	 * Durable manage-token derivation (D-R26) — rebuilds a booking's ONE manage link for every
	 * lifecycle email. Returns null for a legacy/erased booking, which is what keeps the D-R25
	 * self-strip alive exactly where it is still correct.
	 *
	 * @var ManageToken
	 */
	private ManageToken $manage_token;

	/**
	 * In-memory rendered payloads of THIS request's queued rows, keyed by delivery id — lets the
	 * post-commit flush send even when no cipher could be persisted (REST-7 degrade).
	 *
	 * @var array<int, array{to:string, subject:string, body:string, _token_hash?:string, _reminder?:array{status:string, start:string}, _guard?:array{status_in:list<string>, payment?:list<string>, start:string, end:string, version:string}}>
	 */
	private array $pending_payloads = array();

	/**
	 * The CUSTOMER-facing outcome of this request's status-change notification, keyed by booking id
	 * (D-R33 / review P2-5). Request-scoped like {@see self::$pending_payloads}: the write service
	 * queues inside its transaction and the REST controller reads back right after, so there is no
	 * ledger query that could answer this without racing the row it is asking about.
	 *
	 * Only the customer job is recorded. The admin and staff copies are bookkeeping the person
	 * clicking the button does not need a sentence about.
	 *
	 * @var array<int, string>
	 */
	private array $status_outcomes = array();

	/**
	 * Delivery row id claimed for that customer job, so {@see self::statusOutcomeFor()} can report
	 * what the flush DID with it. Queue-time acceptance is not delivery: the flush is synchronous in
	 * the same request (SyncSender), so by the time the controller answers, the real result is known
	 * and there is no excuse for reporting the optimistic one (review round 2, P2-b).
	 *
	 * @var array<int, int>
	 */
	private array $status_delivery_ids = array();

	/**
	 * What {@see self::flushBooking()} did with each delivery id it handled this request:
	 * `sent` or `failed`. A row it never reached (another actor held the lease) is simply absent,
	 * which is what leaves the outcome at `queued` — handed to the cron, not yet attempted.
	 *
	 * @var array<int, string>
	 */
	private array $flush_results = array();

	/**
	 * The delivery id the last {@see self::queueJob()} call claimed, or 0. Read immediately by
	 * {@see self::recordStatusOutcome()} — the alternative was threading an out-parameter through
	 * five call sites that have no other use for it.
	 *
	 * @var int
	 */
	private int $last_queued_delivery_id = 0;

	/**
	 * Delivery row ids {@see self::queueStatusChanged()} claimed for a booking, keyed by booking id
	 * and reset at the start of each such call — so this is exactly ONE status change's rows, not
	 * the request's running total.
	 *
	 * It exists because the write model's compensation has to delete the rows IT created, and the
	 * only actor that knows which those are is the one that claimed them. Inferring the set by
	 * diffing two `SELECT … WHERE status='queued'` snapshots (the first attempt at this) is wrong
	 * in both directions under concurrency: a row queued by another request between the snapshots
	 * looks like ours and gets deleted, and our own row leased to `processing` by a concurrent
	 * sender disappears from the diff and escapes (review round 3, P2-1).
	 *
	 * @var array<int, list<int>>
	 */
	private array $claimed_delivery_ids = array();

	/**
	 * The CUSTOMER template each status transition sends, or absent when the transition has none.
	 *
	 * One map rather than four string literals scattered through the branches below: it is also
	 * what tells the fail-safe catch whether silence means "nothing to send" (`none`) or "we failed
	 * before we could even try" (`not_queued`) — a distinction that would rot instantly if the two
	 * places disagreed about which statuses email the customer (review round 3, P2-2).
	 *
	 * @var array<string, string>
	 */
	private const CUSTOMER_STATUS_TEMPLATES = array(
		'confirmed' => 'booking_confirmed_customer',
		'cancelled' => 'booking_cancelled_customer',
		'completed' => 'booking_completed_customer',
		'no_show'   => 'booking_no_show_customer',
	);

	/**
	 * Construct the dispatcher.
	 *
	 * @param \wpdb            $wpdb      Database handle.
	 * @param Settings         $settings  Core settings.
	 * @param Clock            $clock     Clock.
	 * @param BusinessTimezone $timezones Business-timezone resolver.
	 * @param string|null      $auth_key  Key material override (tests); null reads SECURE_AUTH_KEY.
	 */
	public function __construct(
		private \wpdb $wpdb,
		private Settings $settings,
		private Clock $clock,
		private BusinessTimezone $timezones,
		?string $auth_key = null
	) {
		$key                = $auth_key ?? ( defined( 'SECURE_AUTH_KEY' ) ? (string) SECURE_AUTH_KEY : '' );
		$this->crypto       = Crypto::isUsableKeyMaterial( $key ) ? new Crypto( $key ) : null;
		$this->deliveries   = new DeliveryRepository( $wpdb, $clock );
		$this->templates    = new TemplateRepository( $wpdb );
		$this->sender       = new SyncSender( $settings );
		$this->activities   = new ActivityRepository( $wpdb, $clock );
		$this->tokens       = new TokenGenerator();
		$this->manage_token = new ManageToken( $wpdb, $this->tokens, $auth_key );
	}

	/**
	 * Whether a usable encryption key is available (REST-7).
	 */
	public function keyUsable(): bool {
		return null !== $this->crypto;
	}

	/**
	 * Queue the created notifications INSIDE the reservation transaction (outbox, REST-1).
	 * Fail-safe: nothing thrown here may abort the reservation.
	 *
	 * @param Booking     $booking     Booking snapshot (persisted, uncommitted).
	 * @param string|null $raw_token   Raw manage token (request-scoped), or null.
	 * @param string      $base_policy Base policy (`send`|`suppress`).
	 */
	public function queueCreated( Booking $booking, ?string $raw_token, string $base_policy = 'send' ): void {
		try {
			// PAY-ONLINE HOLD (D-R38j): a booking whose order is an unpaid hold is not a booking yet.
			// Telling the customer "we received your booking" and the owner "you have a new booking"
			// at a moment when neither is true is the single most confusing thing this feature could
			// do — the owner would prepare for appointments that dissolve twenty minutes later. The
			// three `created` jobs are therefore skipped here and queued by
			// {@see self::queueDeferredCreated()} when the payment lands, under the SAME dispatch
			// keys, so a paid hold produces exactly the mail an ordinary booking would have.
			//
			// The predicate reads the ORDER, which the payment on-persist step has already written in
			// this same transaction. An order with `payment_status = 'none'` — every on-site booking,
			// every free booking, every site that takes no online payments — takes the branch below
			// byte-for-byte as before.
			if ( $this->isUnpaidHold( $booking->id ) ) {
				$this->activities->log(
					'booking',
					$booking->id,
					'notification_deferred_payment',
					array( 'trigger' => 'created' ),
					'system'
				);

				return;
			}

			$policy = $this->policy( $base_policy, 'created', $booking );
			$ctx    = NotificationContext::forBooking( $booking, $this->wpdb, $this->settings, $this->timezones );

			$customer_template = 'confirmed' === $booking->status ? 'booking_confirmed_customer' : 'booking_received_customer';
			$this->queueJob( 'created', '', $customer_template, $ctx->customerEmail(), $booking, $raw_token, $policy, $ctx );
			$this->queueJob( 'created', '', 'booking_created_admin', $this->adminEmail(), $booking, $raw_token, $policy, $ctx );
			$this->queueStaffJob( 'created', '', 'booking_created_staff', $booking, $raw_token, $policy, $ctx );
		} catch ( \Throwable $failure ) {
			unset( $failure ); // Outbox is fail-safe — never abort the reservation for a notification.
		}
	}

	/**
	 * Queue the `created` notifications a pay-online hold deferred, now that the payment landed
	 * (D-R38j).
	 *
	 * Same trigger, same discriminator and therefore the SAME dispatch keys the suppressed jobs
	 * would have claimed — so if anything ever queued them after all, this answers `duplicate`
	 * instead of sending a second copy.
	 *
	 * `$include_customer` is false when the booking has just been CONFIRMED by the payment, because
	 * the transition already queued `booking_confirmed_customer` and the customer does not need to
	 * be told twice about one appointment.
	 *
	 * @param Booking $booking          Booking snapshot, re-read after the payment.
	 * @param bool    $include_customer Whether to queue the customer's `received` copy too.
	 */
	public function queueDeferredCreated( Booking $booking, bool $include_customer ): void {
		try {
			$policy = $this->policy( 'send', 'created', $booking );
			$ctx    = NotificationContext::forBooking( $booking, $this->wpdb, $this->settings, $this->timezones );

			if ( $include_customer ) {
				$template = 'confirmed' === $booking->status ? 'booking_confirmed_customer' : 'booking_received_customer';
				$this->queueJob( 'created', '', $template, $ctx->customerEmail(), $booking, null, $policy, $ctx );
			}
			$this->queueJob( 'created', '', 'booking_created_admin', $this->adminEmail(), $booking, null, $policy, $ctx );
			$this->queueStaffJob( 'created', '', 'booking_created_staff', $booking, null, $policy, $ctx );
		} catch ( \Throwable $failure ) {
			unset( $failure ); // Fail-safe: a notification never breaks a payment that already settled.
		}
	}

	/**
	 * Queue the "complete your payment" reminder for a live unpaid hold (D-R38j).
	 *
	 * Sent by the payments tick rather than at reserve time, and once per order: the unique dispatch
	 * key `payment_pending:{booking}:{order}:payment_pending_customer` is what makes the once-ness
	 * structural instead of a flag somebody has to maintain.
	 *
	 * @param Booking $booking       Booking snapshot.
	 * @param string  $discriminator Order id, so one booking's hold is one message.
	 * @return string One of the `OUTCOME_*` constants.
	 */
	public function queuePaymentPending( Booking $booking, string $discriminator ): string {
		return $this->queueModuleMessage(
			'payment_pending',
			$discriminator,
			array( 'key' => 'payment_pending_customer' ),
			$booking,
			array(
				// Re-checked at SEND time, not just at queue time: a retry from the cron must never
				// tell somebody who has already paid to complete their payment, and must never chase
				// a booking that was cancelled in the meantime.
				'status_in'         => array( 'pending' ),
				'payment_status_in' => array( 'pending' ),
				'pin_version'       => true,
			)
		);
	}

	/**
	 * Queue the refund notice (D-R38j).
	 *
	 * @param Booking $booking        Booking snapshot.
	 * @param int     $transaction_id Refund transaction id — the discriminator (Codex #15).
	 * @param int     $amount_minor   Amount refunded, in minor units.
	 * @return string One of the `OUTCOME_*` constants.
	 */
	public function queuePaymentRefunded( Booking $booking, int $transaction_id, int $amount_minor ): string {
		$order    = $this->orderRow( $booking->id );
		$currency = null === $order ? '' : (string) ( $order['currency'] ?? '' );
		$decimals = \Aponto\Support\Settings::currencyExponent( $currency );
		$amount   = number_format( $amount_minor / ( 10 ** $decimals ), $decimals, '.', '' );

		// The discriminator is the refund's ROW ID, not its amount (Codex #15): two refunds of the
		// same amount on one booking — a €20 partial refunded twice — would otherwise share a
		// dispatch key, and the customer would be told about only the first.
		return $this->queueModuleMessage(
			'refund',
			(string) $transaction_id,
			array( 'key' => 'payment_refunded_customer' ),
			$booking,
			array(
				'payment_status_in' => array( 'partial', 'refunded' ),
				'pin_version'       => true,
			),
			array( 'refund_amount' => '' === $currency ? $amount : $amount . ' ' . strtoupper( $currency ) )
		);
	}

	/**
	 * Whether the booking's `created` jobs ever reached the outbox (Codex M).
	 *
	 * The recovery question for a payment that committed and then died before its notifications were
	 * queued. Asked by the ledger's reclaim path, and answered from the deliveries ledger rather than
	 * from any flag, because the ledger is the thing that would actually be missing.
	 *
	 * @param int $booking_id Booking id.
	 */
	public function hasCreatedDeliveries( int $booking_id ): bool {
		$table = $this->wpdb->prefix . 'aponto_notification_deliveries';
		$sql   = "SELECT COUNT(*) FROM {$table} WHERE booking_id = %d AND dispatch_key LIKE %s";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		return (int) $this->wpdb->get_var( $this->wpdb->prepare( $sql, $booking_id, $this->wpdb->esc_like( 'created:' . $booking_id . ':' ) . '%' ) ) > 0;
	}

	/**
	 * Whether a booking's order is an unpaid pay-online HOLD.
	 *
	 * Reads the order row directly rather than through a repository so the outbox keeps no
	 * dependency it does not already have; the query is the same one
	 * {@see NotificationContext::forBooking()} already runs, on a path that runs once per booking.
	 *
	 * @param int $booking_id Booking id.
	 */
	private function isUnpaidHold( int $booking_id ): bool {
		$order = $this->orderRow( $booking_id );
		if ( null === $order ) {
			return false;
		}

		return 'pending' === (string) ( $order['payment_status'] ?? 'none' )
			&& '' !== (string) ( $order['hold_expires_at'] ?? '' );
	}

	/**
	 * The booking's order row, or null.
	 *
	 * `SELECT *` with `?? ''` readers, so this runs unchanged against a schema that predates
	 * `hold_expires_at` (§5 invariant 4).
	 *
	 * @param int $booking_id Booking id.
	 * @return array<string, mixed>|null
	 */
	private function orderRow( int $booking_id ): ?array {
		$p   = $this->wpdb->prefix;
		$sql = "SELECT o.* FROM {$p}aponto_orders o
			INNER JOIN {$p}aponto_order_items oi ON oi.order_id = o.id
			WHERE oi.booking_id = %d LIMIT 1";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; id bound via prepare().
		$row = $this->wpdb->get_row( $this->wpdb->prepare( $sql, $booking_id ), ARRAY_A );

		return is_array( $row ) ? $row : null;
	}

	/**
	 * Send this booking's queued outbox rows (post-commit). Uses the in-memory payload of this
	 * request when present, else decrypts the persisted cipher (replay / crash recovery kick).
	 *
	 * @param int $booking_id Booking id.
	 * @return int Rows sent.
	 */
	public function flushBooking( int $booking_id ): int {
		$sent = 0;
		foreach ( $this->deliveries->queuedForBooking( $booking_id ) as $row ) {
			$payload = $this->pending_payloads[ $row['id'] ] ?? $this->decryptPayload( $row['payload_cipher'] );
			unset( $this->pending_payloads[ $row['id'] ] );

			if ( ! $this->deliveries->lease( $row['id'] ) ) {
				continue; // V1: another actor owns this send.
			}

			if ( null === $payload ) {
				$code = '' === $row['payload_cipher'] ? self::NO_KEY_ERROR : 'decrypt_failed';
				$this->deliveries->markFailed( $row['id'], $row['attempts'] + 1, $code );
				$this->flush_results[ $row['id'] ] = 'failed';
				$this->sendFailure( $row['id'], $code );
				continue;
			}

			// Send gate (Codex review E items 1–3): re-verify the payload's guards against the
			// COMMITTED booking row after winning the lease — a link whose hash was never accepted
			// or was superseded, or a reminder whose booking changed, is dropped, never sent.
			$block = $this->sendBlockReason( $booking_id, $payload );
			if ( '' !== $block ) {
				$this->deliveries->markFailed( $row['id'], self::ATTEMPTS_EXHAUSTED, $block );
				$this->flush_results[ $row['id'] ] = 'failed';
				$this->sendFailure( $row['id'], $block );
				continue;
			}

			if ( $this->sendPayload( $payload ) ) {
				$this->deliveries->markSent( $row['id'] );
				$this->flush_results[ $row['id'] ] = 'sent';
				++$sent;
			} else {
				$this->deliveries->markFailed( $row['id'], $row['attempts'] + 1, 'wp_mail_false' );
				$this->flush_results[ $row['id'] ] = 'failed';
				$this->sendFailure( $row['id'], 'wp_mail_false' );
			}
		}

		return $sent;
	}

	/**
	 * The customer-facing notification outcome of the status change just applied to this booking
	 * (rest-contract §2.9 addendum 2026-09-03), for the admin UI's toast:
	 *
	 * - `sent`       — the mailer accepted it during this request's flush. The ONLY value that may
	 *                  be reported as "the customer was notified".
	 * - `queued`     — a row exists but this request did not attempt it (another actor holds the
	 *                  lease), so the cron will. Real, but not yet delivery.
	 * - `failed`     — the attempt was made and refused: `wp_mail()` returned false, the payload
	 *                  would not decrypt, or a send guard dropped it. A Send-log row exists.
	 * - `not_queued` — the outbox could not even accept the job (an exception was swallowed by the
	 *                  fail-safe). Distinct from `failed` precisely because NO log row exists, so
	 *                  telling the admin to go and read one would be bad advice.
	 * - `suppressed` — deliberately not sent (notify off, flood cap, no usable address).
	 * - `disabled`   — the site has that template switched off; nothing was ever going to be sent.
	 * - `none`       — this transition has no customer email at all (a restore, say).
	 *
	 * CALL THIS AFTER {@see self::flushBooking()}. The flush is synchronous in the same request, so
	 * the true result is available before the response is built; an earlier revision answered at
	 * queue time and reported `queued` for a send that had already failed (review round 2, P2-b).
	 *
	 * @param int $booking_id Booking id.
	 */
	public function statusOutcomeFor( int $booking_id ): string {
		$outcome = $this->status_outcomes[ $booking_id ] ?? 'none';
		if ( self::OUTCOME_QUEUED !== $outcome ) {
			return $outcome; // suppressed / disabled / not_queued / none — the flush changes nothing.
		}

		$delivery_id = $this->status_delivery_ids[ $booking_id ] ?? 0;

		// Absent from the flush results = the flush never got to this row (lease lost), so it is
		// genuinely still queued for the cron rather than sent or failed.
		return $this->flush_results[ $delivery_id ] ?? self::OUTCOME_QUEUED;
	}

	/**
	 * Remember the customer job's outcome — and the row it claimed — for
	 * {@see self::statusOutcomeFor()}.
	 *
	 * @param int    $booking_id Booking id.
	 * @param string $outcome    One of the `OUTCOME_*` constants.
	 */
	private function recordStatusOutcome( int $booking_id, string $outcome ): void {
		// DUPLICATE means a row for this exact mutation was already claimed — the message is real
		// and on its way, so it follows the same post-flush lookup `queued` does.
		$resolved = self::OUTCOME_DUPLICATE === $outcome ? self::OUTCOME_QUEUED : $outcome;

		// FAILED is the fail-safe's "an exception was swallowed": nothing is known to exist, and
		// crucially there is no Send-log row to point the admin at (review round 2, P2-a).
		if ( self::OUTCOME_FAILED === $resolved ) {
			$resolved = 'not_queued';
		}

		$this->status_outcomes[ $booking_id ]     = $resolved;
		$this->status_delivery_ids[ $booking_id ] = $this->last_queued_delivery_id;
	}

	/**
	 * Queue the status-transition notifications INSIDE the write transaction (V3 outbox — same
	 * pattern as created; runs via the write service's on-persist seam). Fail-safe: nothing thrown
	 * here may abort the transition.
	 *
	 * @param Booking $booking      Booking snapshot (new state, uncommitted).
	 * @param string  $to           New status.
	 * @param string  $base_policy  Base policy carried by the domain event (`send`|`suppress`).
	 * @param string  $reason       Cancellation reason (cancelled transition only), else ''.
	 * @param string  $initiated_by Actor descriptor (`customer`, `admin:{id}`, `system`), else ''.
	 */
	public function queueStatusChanged( Booking $booking, string $to, string $base_policy = 'send', string $reason = '', string $initiated_by = '' ): void {
		// One status change = one set of claimed rows AND one outcome. Reset both first: these are
		// request-scoped maps and a booking can be transitioned more than once in a request (undo,
		// re-mark, or simply two REST calls served by the same container). Without the reset a
		// transition that queues NOTHING — a restore, or one whose outbox threw — silently
		// inherited the previous transition's answer, so `statusOutcomeFor()` would report the
		// confirm email as if it belonged to the restore (found by the P2-2 tests).
		$this->claimed_delivery_ids[ $booking->id ] = array();
		unset( $this->status_outcomes[ $booking->id ], $this->status_delivery_ids[ $booking->id ] );

		try {
			$policy = $this->policy( $base_policy, 'status_changed', $booking );
			$ctx    = NotificationContext::forBooking( $booking, $this->wpdb, $this->settings, $this->timezones );

			if ( 'confirmed' === $to ) {
				$this->recordStatusOutcome( $booking->id, $this->queueJob( 'status', $to . ':' . $booking->mutation_version, self::CUSTOMER_STATUS_TEMPLATES['confirmed'], $ctx->customerEmail(), $booking, null, $policy, $ctx ) );
			} elseif ( 'cancelled' === $to ) {
				$mutation = $to . ':' . $booking->mutation_version;
				$this->recordStatusOutcome( $booking->id, $this->queueJob( 'status', $mutation, self::CUSTOMER_STATUS_TEMPLATES['cancelled'], $ctx->customerEmail(), $booking, null, $policy, $ctx, $reason ) );
				if ( str_starts_with( $initiated_by, 'customer' ) ) {
					// SPEC-P1 §3.2: booking_cancelled_admin fires for CUSTOMER-initiated (token)
					// cancellations only — an admin cancelling in wp-admin is not emailed about
					// their own action (Codex review item 6).
					//
					// `system` IS ALSO EXCLUDED, AND DELIBERATELY (D-R40d, QA run 2 observation). The
					// one system-initiated cancellation is `payment_hold_expired` — an abandoned
					// checkout — and those are routine: mailing the owner about every visitor who
					// closed the tab is the kind of noise that gets a template switched off, taking
					// the customer-cancellation notice they DO want with it. The slot is freed, the
					// staff member is told below, and the booking's own activity trail records
					// `payment_hold_expired`, so nothing is hidden — it is just not pushed.
					$this->queueJob( 'status', $mutation, 'booking_cancelled_admin', $this->adminEmail(), $booking, null, $policy, $ctx, $reason );
				}
				// The staff member is told WHATEVER cancelled the booking, unlike the admin rule
				// above: the admin exemption exists because the admin performed the action, and an
				// admin cancelling in wp-admin has not told the assigned staff member anything.
				// Losing a slot off your own calendar is news to you either way.
				$this->queueStaffJob( 'status', $mutation, 'booking_cancelled_staff', $booking, null, $policy, $ctx, $reason );
			} elseif ( 'completed' === $to ) {
				$this->recordStatusOutcome( $booking->id, $this->queueJob( 'status', $to . ':' . $booking->mutation_version, self::CUSTOMER_STATUS_TEMPLATES['completed'], $ctx->customerEmail(), $booking, null, $policy, $ctx ) );
			} elseif ( 'no_show' === $to ) {
				// D-R33 — FREE core, so no staff-policy term here (contrast the staff pair above,
				// which is contributed by the Premium multi-staff provider). Nothing is sent unless
				// the site enabled the template, which ships OFF; the customer-only audience is
				// deliberate — the owner is the person who just clicked "Mark as no-show", so
				// telling them is noise.
				//
				// SEND GUARD (adversarial review 2026-09-03). This is the only status email whose
				// claim can be RETRACTED by a one-click undo, and its copy carries no live-token
				// placeholder — so without an explicit guard `sendBlockReason()` would class the
				// payload "unguarded, always deliverable" and a cron retry after a failed first
				// attempt would tell a customer they missed an appointment the site no longer
				// thinks they missed. `status_in` pins the claim itself; no instant is pinned,
				// because a reschedule cannot happen from `no_show` (it is terminal apart from the
				// undo) and pinning the start would only drop mail the undo already invalidates.
				$this->recordStatusOutcome(
					$booking->id,
					$this->queueJob(
						'status',
						$to . ':' . $booking->mutation_version,
						self::CUSTOMER_STATUS_TEMPLATES['no_show'],
						$ctx->customerEmail(),
						$booking,
						null,
						$policy,
						$ctx,
						'',
						null,
						self::normalizeGuard(
							array(
								'status_in'   => array( 'no_show' ),
								'pin_version' => true,
							)
						)
					)
				);
			}
		} catch ( \Throwable $failure ) {
			unset( $failure ); // Outbox is fail-safe — never abort the write for a notification.

			// ...but silence is not an outcome. A throw BEFORE the first recordStatusOutcome() —
			// the `aponto_notification_policy` filter, context construction — used to leave the
			// field at `none`, which the admin UI reads as "this transition sends no customer
			// email" and reports as nothing at all. For a transition that DOES have a customer
			// template, the truth is `not_queued`: we meant to send and never got as far as a row
			// (review round 3, P2-2). A template-less transition (restore) keeps `none`.
			if ( ! isset( $this->status_outcomes[ $booking->id ] ) && isset( self::CUSTOMER_STATUS_TEMPLATES[ $to ] ) ) {
				$this->recordStatusOutcome( $booking->id, self::OUTCOME_FAILED );
			}
		}
	}

	/**
	 * The delivery rows the last {@see self::queueStatusChanged()} call claimed for this booking.
	 *
	 * The write model's identity-failure compensation deletes exactly these — see
	 * {@see self::$claimed_delivery_ids} for why it must not infer them from the table instead.
	 *
	 * @param int $booking_id Booking id.
	 * @return list<int>
	 */
	public function claimedDeliveryIdsFor( int $booking_id ): array {
		return $this->claimed_delivery_ids[ $booking_id ] ?? array();
	}

	/**
	 * Queue the reschedule notification INSIDE the write transaction (V3 outbox). Fail-safe.
	 *
	 * @param Booking $booking     Booking snapshot (new state, uncommitted).
	 * @param string  $base_policy Base policy carried by the domain event.
	 */
	public function queueRescheduled( Booking $booking, string $base_policy = 'send' ): void {
		try {
			// Retire any LEGACY reminder row FIRST, before the notification policy is consulted: a
			// booking's eligibility for a future reminder must not depend on whether the site chose to
			// email anyone about this particular reschedule.
			$this->retireLegacyReminder( $booking->id );

			$policy = $this->policy( $base_policy, 'rescheduled', $booking );
			$ctx    = NotificationContext::forBooking( $booking, $this->wpdb, $this->settings, $this->timezones );

			$this->queueJob( 'rescheduled', (string) $booking->ics_sequence, 'booking_rescheduled_customer', $ctx->customerEmail(), $booking, null, $policy, $ctx );
		} catch ( \Throwable $failure ) {
			unset( $failure ); // Outbox is fail-safe.
		}
	}

	/**
	 * Retire a booking's PRE-D-R29 reminder delivery row when the booking is rescheduled
	 * (review finding 3).
	 *
	 * The upgrade hazard this closes: reminder dispatch keys used to be start-INDEPENDENT
	 * (`reminder:{id}::booking_reminder_customer`), so a row written by an older build stands for
	 * "this booking was reminded" rather than "this booking was reminded for THAT start". D-R29's
	 * scan pre-filter counts any non-stale reminder row as already-handled, so after an upgrade a
	 * booking carrying such a row could be rescheduled to any new time and would never be reminded
	 * again — the exact bug D-R29 set out to fix, surviving in the rows that predate the fix.
	 *
	 * Moving the booking is what makes the legacy row meaningless, so the reschedule is where it is
	 * retired: the row keeps its status and its place in the Send log, and only gains the
	 * `reminder_stale` marker the pre-filter already knows to ignore. The start-keyed claim still
	 * guarantees one reminder per start, so this cannot cause a double-send — it only restores the
	 * booking's eligibility for the start it now has.
	 *
	 * Deliberately NOT a migration: rewriting every historical reminder row at upgrade time would
	 * un-remind bookings that were never rescheduled and are still correctly blocked.
	 *
	 * @param int $booking_id Booking id.
	 */
	private function retireLegacyReminder( int $booking_id ): void {
		$this->deliveries->markErrorByDispatchKey(
			$this->dispatchKey( 'reminder', $booking_id, '', 'booking_reminder_customer' ),
			'reminder_stale'
		);
	}

	/**
	 * Queue the 24h reminder for a confirmed booking (A5). Not transactional — the reminder cron
	 * calls this then {@see self::flushBooking()}; a crash after the claim is recovered from the
	 * cipher by {@see self::retryPending()} exactly like every other outbox row. The unique
	 * dispatch_key makes it idempotent, so the reminder is sent at most once PER START even if the
	 * due-window query returns the booking on several hourly ticks — the discriminator is the
	 * booking's current start ({@see self::reminderDiscriminator()}, D-R29), so a rescheduled booking
	 * can be reminded again at its new time. The seeded template carries {manage_link},
	 * which D-R26 rebuilds by derivation — the reminder mints nothing and writes nothing, it simply
	 * renders the booking's one durable link. The payload pins the booking's status/start
	 * (`_reminder` guard): after the send lease is won — on the flush AND on every cron retry — the
	 * booking is re-checked, and a cancel/reschedule between queue and send drops the stale reminder
	 * instead of sending it (Codex review E item 2). Fail-safe: never throws to the caller.
	 *
	 * @param Booking $booking Confirmed booking snapshot.
	 */
	public function queueReminder( Booking $booking ): void {
		try {
			$ctx = NotificationContext::forBooking( $booking, $this->wpdb, $this->settings, $this->timezones );
			$this->queueJob( 'reminder', $this->reminderDiscriminator( $booking ), 'booking_reminder_customer', $ctx->customerEmail(), $booking, null, 'send', $ctx );
		} catch ( \Throwable $failure ) {
			unset( $failure ); // Outbox is fail-safe — a reminder never breaks the cron pass.
		}
	}

	/**
	 * The Free reminder's dispatch discriminator: the booking's CURRENT start, minute-precision
	 * (`Ymd-Hi`). Public so {@see ReminderScheduler} builds the same key its pre-filter looks for —
	 * one definition, two readers.
	 *
	 * Start-dependence is the fix for the reschedule bug (D-R29): the key used to be start-INDEPENDENT
	 * (`reminder:{id}::booking_reminder_customer`), so once a booking's reminder had been claimed it
	 * could never be claimed again — a booking moved to a new day kept the claim of the old one and
	 * silently lost its reminder. Keyed by start, a reschedule opens a NEW key while the old start's
	 * key still blocks a duplicate send for the start it was written for.
	 *
	 * @param Booking $booking Booking snapshot.
	 */
	public function reminderDiscriminator( Booking $booking ): string {
		return $booking->start_utc->format( 'Ymd-Hi' );
	}

	/**
	 * Queue ONE module-authored message for a booking (extension-surface §2, D-R29).
	 *
	 * The generic queue seam a module sender needs. Everything that makes the core outbox safe is
	 * reused verbatim — the `aponto_notification_policy` filter, the recipient check, the manage-token
	 * derivation (D-R26), the flood caps, the locale/render pipeline, NB-4 payload encryption, the
	 * unique `dispatch_key` claim and the ledger — so a module never re-implements any of it and can
	 * never bypass one of them. This method is FREE-SHIPPED and names no module: the copy, the
	 * uniqueness discriminator and the send guard all arrive as data (§5 invariant 2).
	 *
	 * Unlike the seeded templates, module copy is NOT a `aponto_notifications` row: the caller passes
	 * `subject`/`body` inline, and the module owns storage, validation and the admin UI for them. The
	 * template registry stays the closed 8-row set it was (`TemplateRepository` has no insert).
	 *
	 * The `$guard` spec is stored INSIDE the encrypted payload (no schema change) and re-evaluated at
	 * every send site after the lease is won ({@see self::sendBlockReason()}): the booking's status
	 * must still be one of `status_in`, and each pinned INSTANT must still be the one the copy was
	 * rendered from — `pin_start` for the appointment's start, `pin_end` for its end. A message keyed
	 * to when an appointment ENDS pins the end rather than the start, because that is the instant its
	 * own schedule was computed from; pinning neither would let a reschedule deliver a follow-up for
	 * an appointment that has moved back into the future (review finding 2).
	 *
	 * RETURNS the outcome ({@see self::OUTCOME_QUEUED} and friends) rather than void, because a
	 * caller that keeps its own long-horizon sent-state has to know whether a delivery row now
	 * exists. It cannot find that out afterwards: the dispatch key is built here from private parts,
	 * and reading the ledger back would race with the very row it is looking for. The claim step of
	 * this call IS the authoritative answer, so it is the thing that gets returned.
	 *
	 * Fail-safe: never throws to the caller — a module message must not break the pass that queued it.
	 *
	 * @param string                                                                                                             $trigger       Trigger key (also the flood-exemption axis — see {@see self::flooded()}).
	 * @param string                                                                                                             $discriminator Uniqueness discriminator within `{trigger}:{booking}:…:{key}`.
	 * @param array{key?:string, subject?:string, body?:string, recipient_kind?:string}                                          $template      Inline copy: ledger key, subject, body, and `customer`|`admin` recipient.
	 * @param Booking                                                                                                            $booking       Booking snapshot the message is about.
	 * @param array{status_in?:list<string>, payment_status_in?:list<string>, pin_start?:bool, pin_end?:bool, pin_version?:bool} $guard Send-time guard spec.
	 * @param array<string, string>                                                                                              $extras        Per-message placeholder values (e.g. `refund_amount`).
	 * @return string One of the `OUTCOME_*` constants.
	 */
	public function queueModuleMessage( string $trigger, string $discriminator, array $template, Booking $booking, array $guard, array $extras = array() ): string {
		try {
			$key     = mb_substr( (string) ( $template['key'] ?? ( 'module_' . $trigger ) ), 0, 64 );
			$subject = (string) ( $template['subject'] ?? '' );
			$body    = (string) ( $template['body'] ?? '' );

			// A caller may name a SEEDED template instead of supplying copy (D-R38j). The payment
			// messages do exactly that: they need this seam's guard support, but their copy belongs in
			// the notifications editor like every other lifecycle email, so the admin can edit it and
			// switch it off. Passing `key` with no subject/body resolves the row; a module supplying
			// inline copy (D-R29 reminder steps) reaches none of this and behaves exactly as before.
			$seeded = null;
			if ( '' === trim( $subject ) && '' === trim( $body ) ) {
				$seeded = $this->templates->find( $key );
				if ( null === $seeded ) {
					return self::OUTCOME_SUPPRESSED; // Nothing to say — deliberate, and retrying cannot help.
				}
			}

			if ( null !== $seeded ) {
				$is_customer = 'customer' === (string) ( $seeded['recipient'] ?? 'customer' );
				$resolved    = $seeded;
			} else {
				$is_customer = 'admin' !== (string) ( $template['recipient_kind'] ?? 'customer' );
				$resolved    = array(
					'subject'   => $subject,
					'body'      => $body,
					'recipient' => $is_customer ? 'customer' : 'admin',
					'enabled'   => 1,
				);
			}

			$policy = $this->policy( 'send', $trigger, $booking );
			$ctx    = NotificationContext::forBooking( $booking, $this->wpdb, $this->settings, $this->timezones );
			if ( array() !== $extras ) {
				$ctx = $ctx->withExtras( $extras );
			}
			$recipient = $is_customer ? $ctx->customerEmail() : $this->adminEmail();

			$outcome = $this->queueJob( $trigger, $discriminator, $key, $recipient, $booking, null, $policy, $ctx, '', $resolved, self::normalizeGuard( $guard ) );

			// `DISABLED` is folded into `SUPPRESSED` because this method's return enum is published
			// to modules and must not gain a value they were never told about. It is reachable now
			// that a caller may name a SEEDED template (D-R38j): `payment_refunded_customer` ships
			// OFF, and a template the site owner has not switched on is a deliberate refusal, which
			// is exactly what `SUPPRESSED` already means — re-asking would only get the same answer.
			return self::OUTCOME_DISABLED === $outcome ? self::OUTCOME_SUPPRESSED : $outcome;
		} catch ( \Throwable $failure ) {
			unset( $failure ); // Fail-safe — a module message never breaks its caller.

			return self::OUTCOME_FAILED;
		}
	}

	/**
	 * Normalize a caller-supplied guard spec into the exact shape the payload stores.
	 *
	 * @param array{status_in?:list<string>, payment_status_in?:list<string>, pin_start?:bool, pin_end?:bool, pin_version?:bool} $guard Raw guard spec.
	 * @return array{status_in:list<string>, payment_status_in:list<string>, pin_start:bool, pin_end:bool, pin_version:bool}
	 */
	private static function normalizeGuard( array $guard ): array {
		return array(
			'status_in'         => self::normalizeStatusList( $guard['status_in'] ?? null ),
			// PAYMENT term (D-R38j), additive beside `status_in`. It answers a question the booking
			// status cannot: a hold and a paid booking are BOTH `pending` on the booking row, so a
			// "complete your payment" retry guarded only by booking status would happily mail
			// somebody who has already paid.
			'payment_status_in' => self::normalizeStatusList( $guard['payment_status_in'] ?? null ),
			'pin_start'         => true === ( $guard['pin_start'] ?? false ),
			'pin_end'           => true === ( $guard['pin_end'] ?? false ),
			'pin_version'       => true === ( $guard['pin_version'] ?? false ),
		);
	}

	/**
	 * Normalize one guard status list to unique non-empty strings.
	 *
	 * @param mixed $raw Raw list from the caller.
	 * @return list<string>
	 */
	private static function normalizeStatusList( $raw ): array {
		$out = array();
		foreach ( is_array( $raw ) ? $raw : array() as $status ) {
			if ( is_string( $status ) && '' !== $status ) {
				$out[] = $status;
			}
		}

		return array_values( array_unique( $out ) );
	}

	/**
	 * Render + send a template to a fixture recipient (test-send; no ledger/flood — rest-contract §2.13).
	 *
	 * @param string $template_key Template key.
	 * @param string $email        Recipient.
	 */
	public function testSend( string $template_key, string $email ): bool {
		$template = $this->templates->find( $template_key );
		if ( null === $template ) {
			return false;
		}

		$switched = $this->enterMailLocale();
		try {
			\Aponto\Support\Translations::loadCurrentLocale();
			$placeholders = $this->fixturePlaceholders( $email );
			$subject      = Placeholders::renderSubject( $this->localizeTemplate( (string) $template['subject'] ), $placeholders );
			$body         = Placeholders::renderBody( $this->localizeTemplate( (string) $template['body'] ), $placeholders );
		} finally {
			$this->exitMailLocale( $switched );
		}

		return $this->sendPayload(
			array(
				'to'      => $email,
				'subject' => $subject,
				'body'    => $body,
			)
		);
	}

	/**
	 * Cron pass (§7, REST-1, V1): first reclaim expired send leases (`processing` > 15 minutes —
	 * the sender died mid-send), then send failed rows with a retry left and stale queued rows
	 * whose flush never ran, each from its ciphered payload — the raw token is never rebuilt.
	 * Every send is guarded by the atomic lease, so a concurrent flush or a second cron pass can
	 * never double-send a row.
	 *
	 * @return int Rows sent this pass.
	 */
	public function retryPending(): int {
		$lease_cutoff = $this->clock->now()->sub( new \DateInterval( 'PT15M' ) )->format( 'Y-m-d H:i:s' );
		$this->deliveries->reclaimExpiredLeases( $lease_cutoff );

		$stale = $this->clock->now()->sub( new \DateInterval( 'PT1H' ) )->format( 'Y-m-d H:i:s' );
		$sent  = 0;

		foreach ( $this->deliveries->pendingForRetry( $stale ) as $row ) {
			if ( ! $this->deliveries->lease( $row['id'] ) ) {
				continue; // V1: another actor owns this send.
			}

			$payload = $this->decryptPayload( $row['payload_cipher'] );
			if ( null === $payload ) {
				$this->deliveries->markFailed( $row['id'], $row['attempts'] + 1, 'decrypt_failed' );
				$this->sendFailure( $row['id'], 'decrypt_failed' );
				continue;
			}

			// Same send gate as the flush (items 1–3): the crash-recovery path must never resend a
			// payload whose token hash no booking row currently holds, or a stale reminder (item 2's
			// retry-path cover — a cancel/reschedule between queue and this retry drops the row).
			$block = $this->sendBlockReason( $row['booking_id'], $payload );
			if ( '' !== $block ) {
				$this->deliveries->markFailed( $row['id'], self::ATTEMPTS_EXHAUSTED, $block );
				$this->sendFailure( $row['id'], $block );
				continue;
			}

			if ( $this->sendPayload( $payload ) ) {
				$this->deliveries->markSent( $row['id'] );
				++$sent;
			} else {
				$this->deliveries->markFailed( $row['id'], $row['attempts'] + 1, 'wp_mail_false' );
				$this->sendFailure( $row['id'], 'wp_mail_false' );
			}
		}

		return $sent;
	}

	/**
	 * A page of the deliveries ledger for the admin "Send log" (A3 — U4, view-only). Reads newest
	 * first and derives a PARTIALLY-MASKED recipient by decrypting the stored cipher just for its
	 * `to` field — the ledger itself keeps only the recipient HASH, so nothing new is persisted and
	 * the address stays encrypted at rest. A pruned (sent > 7d) or key-less (REST-7) row shows no
	 * recipient. No PII (full address, subject or body) ever leaves this method.
	 *
	 * @param int $page     1-based page number.
	 * @param int $per_page Rows per page (1–100).
	 * @return array{items: list<array{id:int, template_key:string, recipient_masked:string, status:string, error:string, created_at:string, updated_at:string}>, total:int, page:int, per_page:int}
	 */
	public function mailLog( int $page, int $per_page ): array {
		$page     = max( 1, $page );
		$per_page = max( 1, min( 100, $per_page ) );
		$offset   = ( $page - 1 ) * $per_page;

		$items = array();
		foreach ( $this->deliveries->page( $per_page, $offset ) as $row ) {
			$payload = $this->decryptPayload( (string) $row['payload_cipher'] );
			$items[] = array(
				'id'               => (int) $row['id'],
				'template_key'     => (string) $row['template_key'],
				'recipient_masked' => null !== $payload ? self::maskEmail( (string) $payload['to'] ) : '',
				'status'           => (string) $row['status'],
				'error'            => (string) $row['last_error_code'],
				'created_at'       => (string) $row['created_at'],
				'updated_at'       => (string) $row['updated_at'],
			);
		}

		return array(
			'items'    => $items,
			'total'    => $this->deliveries->countAll(),
			'page'     => $page,
			'per_page' => $per_page,
		);
	}

	/**
	 * Queue one outbox row (render + claim, NO send). Skips disabled templates, honours suppress
	 * (activity only — rides the transaction) and the flood caps.
	 *
	 * @param string                                                                                                             $trigger       Trigger key.
	 * @param string                                                                                                             $discriminator Uniqueness discriminator.
	 * @param string                                                                                                             $template_key  Template key.
	 * @param string                                                                                                             $recipient     Recipient email.
	 * @param Booking                                                                                                            $booking       Booking snapshot.
	 * @param string|null                                                                                                        $raw_token     Raw token (created only).
	 * @param string                                                                                                             $policy        Effective policy.
	 * @param NotificationContext                                                                                                $ctx           Render context.
	 * @param string                                                                                                             $cancel_reason Cancellation reason for `{cancel_reason}`, else ''.
	 * @param array{subject:string, body:string, recipient:string, enabled:int}|null                                             $template      Inline copy from a module (D-R29); null reads the seeded template row.
	 * @param array{status_in:list<string>, payment_status_in:list<string>, pin_start:bool, pin_end:bool, pin_version:bool}|null $guard Module send-guard spec; null keeps the core guard behaviour.
	 * @return string One of the `OUTCOME_*` constants. Core callers ignore it; the module seam
	 *                ({@see self::queueModuleMessage()}) reports it onward.
	 */
	private function queueJob( string $trigger, string $discriminator, string $template_key, string $recipient, Booking $booking, ?string $raw_token, string $policy, NotificationContext $ctx, string $cancel_reason = '', ?array $template = null, ?array $guard = null ): string {
		$this->last_queued_delivery_id = 0;

		$prepared = $this->prepareJob( $trigger, $discriminator, $template_key, $recipient, $booking, $raw_token, $policy, $ctx, $cancel_reason, $template, $guard );
		if ( self::OUTCOME_QUEUED !== $prepared['outcome'] ) {
			return $prepared['outcome'];
		}

		$this->pending_payloads[ $prepared['id'] ]    = $prepared['payload'];
		$this->last_queued_delivery_id                = $prepared['id'];
		$this->claimed_delivery_ids[ $booking->id ][] = $prepared['id'];

		return self::OUTCOME_QUEUED;
	}

	/**
	 * Queue one notification addressed to the booking's ASSIGNED staff member (business map P2a,
	 * shipped with `multi_staff` — D-R28).
	 *
	 * GATED by the `multi_staff` module (D-R42): on Free the visible staff member IS the
	 * owner, who already receives the `*_admin` pair at the business address — queueing a staff copy
	 * there would simply mail the same person twice about the same booking.
	 *
	 * No new dispatch-key namespace is needed: {@see self::dispatchKey()} mixes the template key
	 * in, so the staff job is distinct from the admin job it rides beside even when the trigger,
	 * booking and discriminator are identical. Flood accounting is unchanged too — the template's
	 * `recipient` is `staff`, so `prepareJob()` reads it as non-customer and it lands in the same
	 * bucket the admin mail already used (per-booking cap applies, per-customer/day does not).
	 *
	 * A staff row with no email is not an error: `prepareJob()` drops a job whose recipient fails
	 * `is_email()`, which is exactly the right behaviour for a resource-type "staff" row.
	 *
	 * @param string              $trigger       Trigger key.
	 * @param string              $discriminator Uniqueness discriminator.
	 * @param string              $template_key  Staff template key.
	 * @param Booking             $booking       Booking snapshot.
	 * @param string|null         $raw_token     Raw token (created only).
	 * @param string              $policy        Effective policy.
	 * @param NotificationContext $ctx           Render context.
	 * @param string              $cancel_reason Cancellation reason for `{cancel_reason}`, else ''.
	 */
	private function queueStaffJob( string $trigger, string $discriminator, string $template_key, Booking $booking, ?string $raw_token, string $policy, NotificationContext $ctx, string $cancel_reason = '' ): void {
		if ( ! Plan::instance()->has( 'multi_staff' ) ) {
			return;
		}

		$this->queueJob( $trigger, $discriminator, $template_key, $this->staffEmail( $booking ), $booking, $raw_token, $policy, $ctx, $cancel_reason );
	}

	/**
	 * Shared render + policy + flood + claim step. Always returns an OUTCOME; on
	 * {@see self::OUTCOME_QUEUED} it also carries the claimed row id and the rendered payload.
	 *
	 * The outcome is reported rather than collapsed to null (review finding 1) because "nothing was
	 * claimed" hides a distinction a caller with its own sent-state depends on: a DUPLICATE means the
	 * row is already there, a SUPPRESSED means the system deliberately declined, and only a FAILED
	 * leaves the question open. Fail-safe: never throws.
	 *
	 * @param string                                                                                                             $trigger       Trigger key.
	 * @param string                                                                                                             $discriminator Uniqueness discriminator.
	 * @param string                                                                                                             $template_key  Template key.
	 * @param string                                                                                                             $recipient     Recipient email.
	 * @param Booking                                                                                                            $booking       Booking snapshot.
	 * @param string|null                                                                                                        $raw_token     Raw token (created only).
	 * @param string                                                                                                             $policy        Effective policy.
	 * @param NotificationContext                                                                                                $ctx           Render context.
	 * @param string                                                                                                             $cancel_reason Cancellation reason for `{cancel_reason}`, else ''.
	 * @param array{subject:string, body:string, recipient:string, enabled:int}|null                                             $template      Inline copy from a module (D-R29); null reads the seeded template row.
	 * @param array{status_in:list<string>, payment_status_in:list<string>, pin_start:bool, pin_end:bool, pin_version:bool}|null $guard Module send-guard spec; null keeps the core guard behaviour.
	 * @return array{outcome:string, id?:int, payload?:array{to:string, subject:string, body:string, _token_hash?:string, _reminder?:array{status:string, start:string}, _guard?:array{status_in:list<string>, payment?:list<string>, start:string, end:string, version:string}}}
	 */
	private function prepareJob( string $trigger, string $discriminator, string $template_key, string $recipient, Booking $booking, ?string $raw_token, string $policy, NotificationContext $ctx, string $cancel_reason = '', ?array $template = null, ?array $guard = null ): array {
		try {
			// A module supplies its copy INLINE (D-R29); core triggers read the seeded row. Both then
			// travel the identical render/claim path below, so nothing downstream knows the difference.
			$template = $template ?? $this->templates->find( $template_key );
			if ( null === $template || 1 !== (int) $template['enabled'] ) {
				return array( 'outcome' => self::OUTCOME_DISABLED );
			}

			if ( 'suppress' === $policy ) {
				$this->activities->log(
					'booking',
					$booking->id,
					'notification_suppressed',
					array(
						'template' => $template_key,
						'trigger'  => $trigger,
					),
					'system'
				);

				return array( 'outcome' => self::OUTCOME_SUPPRESSED );
			}

			if ( '' === $recipient || ! is_email( $recipient ) ) {
				return array( 'outcome' => self::OUTCOME_SUPPRESSED );
			}

			$recipient_hash = hash( 'sha256', strtolower( trim( $recipient ) ) );
			$is_customer    = 'customer' === (string) ( $template['recipient'] ?? '' );

			// D-R26 (founder-directed 2026-08-02): REBUILD the booking's durable manage token so
			// EVERY customer lifecycle email carries the same working link — created, confirmed,
			// rescheduled, reminder and cancelled alike (the cancelled link opens the read-only
			// view, which is the behaviour LatePoint/Amelia customers expect). This is a pure
			// derivation, not a rotation: `token_hash` is never written here (D-R25 holds), and the
			// raw token is still never at rest (§5 invariant 8).
			//
			// Null means the link CANNOT be rebuilt, and the optional-line contract then strips the
			// line exactly as D-R25 did ({@see Placeholders}). Three honest cases: a LEGACY booking
			// created before D-R26 (its random hash cannot be re-derived — no migration, no rewrite),
			// an ERASED booking (the Anonymizer replaced the hash, so nothing derives to it), and a
			// site with no derivation secret (REST-7 degrade).
			if ( null === $raw_token && $is_customer && $this->templateWantsLiveToken( $template ) ) {
				$raw_token = $this->manage_token->rawFor( $booking->id, $booking->created_at, $booking->token_hash );
			}

			if ( $this->flooded( $booking->id, $recipient_hash, $is_customer, $trigger ) ) {
				$this->activities->log(
					'booking',
					$booking->id,
					'notification_suppressed_flood',
					array( 'template' => $template_key ),
					'system'
				);
				return array( 'outcome' => self::OUTCOME_SUPPRESSED );
			}

			// Render the copy under the site locale with the plugin textdomain loaded (REST send
			// context does not load it just-in-time — finding U3 BUG-04), and translate the stored
			// default template through the catalog. Studio-first placeholders for admin templates.
			// Everything after the switch runs inside try/finally, so an exception mid-render can
			// never leave the process stuck in the mail locale (r1 review item 6).
			$switched = $this->enterMailLocale();
			try {
				\Aponto\Support\Translations::loadCurrentLocale();
				$placeholders = $ctx->placeholders( $raw_token, $cancel_reason, $is_customer ? 'customer' : 'admin' );
				$subject      = Placeholders::renderSubject( $this->localizeTemplate( (string) $template['subject'] ), $placeholders );
				$body         = Placeholders::renderBody( $this->localizeTemplate( (string) $template['body'] ), $placeholders );
			} finally {
				$this->exitMailLocale( $switched );
			}
			$payload = array(
				'to'      => $recipient,
				'subject' => $subject,
				'body'    => $body,
			);

			// SEND GUARDS (Codex review E items 1–3), encrypted inside the cipher — no schema change:
			// `_token_hash` pins the manage-token hash this payload's links were rendered from; the
			// send gate ({@see self::sendBlockReason()}) delivers the email only while the booking row
			// still holds EXACTLY that hash. Under D-R25 nothing rotates that hash any more, so the
			// pin is a defence-in-depth invariant rather than a live drop path (see the send gate for
			// why it is kept). `_reminder` pins the reminder's status/start so a cancel or reschedule
			// between queue and send drops the stale reminder (item 2).
			if ( null !== $raw_token && '' !== $raw_token && $this->templateWantsLiveToken( $template ) ) {
				$payload['_token_hash'] = $this->tokens->hash( $raw_token );
			}
			if ( null !== $guard ) {
				// A module's own guard (D-R29). `_guard` is a SEPARATE payload key rather than a
				// widened `_reminder`, so the Free reminder's payload stays byte-identical and a row
				// queued by an older build still decrypts and re-checks exactly as it was written.
				$payload['_guard'] = array(
					'status_in' => $guard['status_in'],
					// Additive third term (D-R38j). Written only when the caller asked for it, so a
					// payload queued by an older build decrypts and re-checks exactly as it was
					// written — the same additive discipline `pin_version` followed.
					'payment'   => $guard['payment_status_in'],
					'start'     => $guard['pin_start'] ? $booking->start_utc->format( 'Y-m-d H:i:s' ) : '',
					'end'       => $guard['pin_end'] ? $booking->end_utc->format( 'Y-m-d H:i:s' ) : '',
					// GENERATION pin (review round 2). `status_in` alone answers "is the booking in
					// the right state?", which a booking can RE-ENTER: undo a no-show, reschedule,
					// mark absent again, and a stale delivery from the first mark passes the status
					// check on retry — mailing a duplicate, or the pre-reschedule date. The row's
					// monotonic `mutation_version` answers the stricter question this copy actually
					// depends on: "is the booking still the same GENERATION the copy was rendered
					// from?" Additive — a caller that does not pin it stores '' and is unaffected,
					// which is how D-R29's reminder steps keep their existing behaviour.
					'version'   => $guard['pin_version'] ? (string) $booking->mutation_version : '',
				);
			} elseif ( 'reminder' === $trigger ) {
				$payload['_reminder'] = array(
					'status' => $booking->status,
					'start'  => $booking->start_utc->format( 'Y-m-d H:i:s' ),
				);
			}

			$cipher     = '';
			$error_code = self::NO_KEY_ERROR;
			if ( null !== $this->crypto ) {
				$cipher     = $this->crypto->encrypt( (string) wp_json_encode( $payload ), self::MAIL_DOMAIN );
				$error_code = '';
			}

			$dispatch_key = $this->dispatchKey( $trigger, $booking->id, $discriminator, $template_key );
			$id           = $this->deliveries->claim( $dispatch_key, $template_key, $booking->id, $recipient_hash, $cipher, $error_code );
			if ( null === $id ) {
				// The unique dispatch key was already taken, so a delivery row for this exact message
				// EXISTS — reported distinctly from a suppression because, to a caller tracking its own
				// sent-state, "already in the outbox" is just as final as "put in the outbox".
				return array( 'outcome' => self::OUTCOME_DUPLICATE );
			}

			// D-R25: nothing follows the claim any more. A1's compensated token activation used to
			// live here (rotate → drop the claimed delivery when the UPDATE touched no row, plus a
			// per-booking `tokrot` advisory lock on the out-of-TX reminder path); with a durable
			// token there is no post-claim write to compensate, so the whole lock-ordering hazard it
			// carried (in-TX row→tokrot vs reminder tokrot→row, round-2 review N1) is gone with it.
			// Invariant 5 stays satisfied by construction: this step performs no side effect at all.
			return array(
				'outcome' => self::OUTCOME_QUEUED,
				'id'      => $id,
				'payload' => $payload,
			);
		} catch ( \Throwable $failure ) {
			unset( $failure ); // Fail-safe — notifications never break the booking write.

			return array( 'outcome' => self::OUTCOME_FAILED );
		}
	}

	/**
	 * Send a rendered payload, swallowing transport exceptions. Guard fields (`_token_hash`,
	 * `_reminder`, `_guard`) are internal bookkeeping — only to/subject/body reach the transport.
	 *
	 * @param array{to:string, subject:string, body:string, _token_hash?:string, _reminder?:array{status:string, start:string}, _guard?:array{status_in:list<string>, payment?:list<string>, start:string, end:string, version:string}} $payload Rendered payload.
	 */
	private function sendPayload( array $payload ): bool {
		try {
			return $this->sender->send( $payload['to'], $payload['subject'], $payload['body'] );
		} catch ( \Throwable $e ) {
			unset( $e );

			return false;
		}
	}

	/**
	 * Emit a PII-free notification transport failure for the structured logger.
	 *
	 * @param int    $delivery_id Delivery row id.
	 * @param string $reason      Stable internal reason.
	 */
	private function sendFailure( int $delivery_id, string $reason ): void {
		try {
			/**
			 * Fires after a notification transport failure.
			 *
			 * @param int    $delivery_id Delivery row id.
			 * @param string $reason      Stable internal reason.
			 */
			do_action( 'aponto_notification_send_failure', $delivery_id, $reason );
		} catch ( \Throwable $listener_failure ) {
			unset( $listener_failure );
		}
	}

	/**
	 * Decrypt a persisted payload cipher, or null when absent/unreadable. The send-guard fields
	 * (`_token_hash`, `_reminder`, `_guard`) ride the cipher and are preserved so the crash-recovery
	 * send path re-checks them exactly like the in-request flush (items 1–3).
	 *
	 * @param string $cipher Base64 blob ('' = none).
	 * @return array{to:string, subject:string, body:string, _token_hash?:string, _reminder?:array{status:string, start:string}, _guard?:array{status_in:list<string>, payment?:list<string>, start:string, end:string, version:string}}|null
	 */
	private function decryptPayload( string $cipher ): ?array {
		if ( '' === $cipher || null === $this->crypto ) {
			return null;
		}

		$json = $this->crypto->decrypt( $cipher, self::MAIL_DOMAIN );
		if ( null === $json ) {
			return null;
		}

		$payload = json_decode( $json, true );
		if ( ! is_array( $payload ) || ! isset( $payload['to'], $payload['subject'], $payload['body'] ) ) {
			return null;
		}

		$out = array(
			'to'      => (string) $payload['to'],
			'subject' => (string) $payload['subject'],
			'body'    => (string) $payload['body'],
		);
		if ( isset( $payload['_token_hash'] ) && is_string( $payload['_token_hash'] ) ) {
			$out['_token_hash'] = $payload['_token_hash'];
		}
		if ( isset( $payload['_reminder'] ) && is_array( $payload['_reminder'] ) ) {
			$out['_reminder'] = array(
				'status' => (string) ( $payload['_reminder']['status'] ?? '' ),
				'start'  => (string) ( $payload['_reminder']['start'] ?? '' ),
			);
		}
		if ( isset( $payload['_guard'] ) && is_array( $payload['_guard'] ) ) {
			$statuses = array();
			foreach ( is_array( $payload['_guard']['status_in'] ?? null ) ? $payload['_guard']['status_in'] : array() as $status ) {
				$statuses[] = (string) $status;
			}
			$payment_statuses = array();
			foreach ( is_array( $payload['_guard']['payment'] ?? null ) ? $payload['_guard']['payment'] : array() as $payment_status ) {
				$payment_statuses[] = (string) $payment_status;
			}
			$out['_guard'] = array(
				'status_in' => $statuses,
				// COPIED, not dropped (Codex #12). This method rebuilds the payload for the CRON RETRY
				// path, and a term it forgets is a guard that silently stops applying: the in-request
				// flush honoured `payment`, the retry an hour later did not, and a customer who had
				// paid in the meantime was chased for payment anyway.
				'payment'   => $payment_statuses,
				'start'     => (string) ( $payload['_guard']['start'] ?? '' ),
				'end'       => (string) ( $payload['_guard']['end'] ?? '' ),
				// Absent in rows written before the generation pin existed: '' means "not pinned",
				// so an older row keeps behaving exactly as it did when it was queued.
				'version'   => (string) ( $payload['_guard']['version'] ?? '' ),
			);
		}

		return $out;
	}

	/**
	 * Whether either flood cap is reached.
	 *
	 * REMINDERS ARE EXEMPT FROM THE PER-BOOKING CAP (D-R29). That cap counts EVERY delivery row a
	 * booking ever produced, in any status, and a routine booking already burns four of the default
	 * five (received/confirmed customer + created admin + one lifecycle mail) — so the reminder, which
	 * is by construction the LAST message a booking sends, was the one the cap silently ate. The cap
	 * exists to bound a runaway lifecycle loop, and a reminder is not one: each is claimed under a
	 * unique start-keyed `dispatch_key` and, for module steps, under a per-step sent-state row, so its
	 * count is bounded by configuration rather than by events. The per-CUSTOMER/day cap still counts
	 * every row including reminders — that is the cap that protects a person's inbox (D-R19), and
	 * nothing about reminders makes it safe to leave a mailbox unbounded.
	 *
	 * @param int    $booking_id     Booking id.
	 * @param string $recipient_hash Recipient hash.
	 * @param bool   $is_customer    Whether the template targets the customer.
	 * @param string $trigger        Trigger key (`reminder` is exempt from the per-booking cap).
	 */
	private function flooded( int $booking_id, string $recipient_hash, bool $is_customer, string $trigger = '' ): bool {
		$per_booking = max( 1, (int) $this->settings->get( 'notifications.flood_per_booking' ) );
		$per_day     = max( 1, (int) $this->settings->get( 'notifications.flood_per_customer_day' ) );

		if ( 'reminder' !== $trigger && $this->deliveries->countForBooking( $booking_id ) >= $per_booking ) {
			return true;
		}
		if ( ! $is_customer ) {
			return false; // Admin is exempt from the per-customer/day cap.
		}

		$today = $this->clock->now()->format( 'Y-m-d' );

		return $this->deliveries->countForRecipientOnDay( $recipient_hash, $today ) >= $per_day;
	}

	/**
	 * Compute the effective policy through the filter.
	 *
	 * @param string  $base    Base policy.
	 * @param string  $trigger Trigger.
	 * @param Booking $booking Booking.
	 */
	private function policy( string $base, string $trigger, Booking $booking ): string {
		/**
		 * Filter the effective notification policy (`send`|`suppress`).
		 *
		 * @param string  $policy  Base policy.
		 * @param string  $trigger Trigger key.
		 * @param Booking $booking Booking snapshot.
		 */
		$policy = apply_filters( 'aponto_notification_policy', $base, $trigger, $booking );

		return 'suppress' === $policy ? 'suppress' : 'send';
	}

	/**
	 * Build a deterministic dispatch key.
	 *
	 * @param string $trigger       Trigger.
	 * @param int    $booking_id    Booking id.
	 * @param string $discriminator Discriminator.
	 * @param string $template_key  Template key.
	 */
	private function dispatchKey( string $trigger, int $booking_id, string $discriminator, string $template_key ): string {
		return mb_substr( $trigger . ':' . $booking_id . ':' . $discriminator . ':' . $template_key, 0, 191 );
	}

	/**
	 * Whether a template's stored subject/body carries any manage-token URL placeholder, so the
	 * rendered payload embeds the booking's manage link and must ride the `_token_hash` send guard.
	 * Reads the ADMIN-EDITED template text, so an admin who removes the link opts the email out of
	 * the guard and one who adds it opts in.
	 *
	 * @param array<string, mixed> $template Template row.
	 */
	private function templateWantsLiveToken( array $template ): bool {
		$text = (string) ( $template['subject'] ?? '' ) . ' ' . (string) ( $template['body'] ?? '' );
		foreach ( self::LIVE_TOKEN_PLACEHOLDERS as $key ) {
			if ( str_contains( $text, '{' . $key . '}' ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * The send gate (Codex review E items 1–3): the reason a leased payload must NOT be sent, or ''
	 * when it is deliverable. Applied at EVERY send site (flush and cron retry) after the lease win,
	 * re-reading the committed booking row:
	 *
	 * - `_token_hash` (any payload whose links embed a manage token): deliver only while EXACTLY
	 *   this hash is the booking's stored `token_hash`, so a customer is never mailed a link that
	 *   does not work.
	 *
	 *   Under D-R25 (durable token) this is a PURE DEFENSIVE INVARIANT — no shipped path is known to
	 *   reach it. The dispatcher no longer writes `token_hash` at all, so the original supersede
	 *   case (a later email rotating the hash out from under a queued one) cannot occur. The only
	 *   remaining writer is privacy anonymization/erasure, and that does NOT reach this gate either:
	 *   {@see \Aponto\Privacy\Anonymizer} blanks `payload_cipher` in the SAME transaction that
	 *   replaces the hash, and {@see DeliveryRepository::pendingForRetry()} excludes cipher-less
	 *   rows — so an erased booking's still-queued email is never decrypted, never leased and never
	 *   sent. Mail safety there comes from the erased cipher, not from this check.
	 *
	 *   It is kept rather than deleted because it is the last line of a defence-in-depth chain
	 *   whose cost is one indexed read on a path that already reads the booking row: any FUTURE
	 *   writer of `token_hash` — a re-issue feature, a repair CLI, a third-party UPDATE — would
	 *   otherwise silently regain the ability to mail a dead link. Deleting a guard because today's
	 *   callers happen not to trip it is how that class of bug comes back.
	 * - `_reminder` (Free reminder payloads): deliver only while the booking still exists in the
	 *   queued status with the queued start — a cancel/reschedule between queue and send (or retry)
	 *   makes the rendered copy wrong, so the row drops instead (item 2).
	 * - `_guard` (module payloads, D-R29): the same idea, parameterised by the module that queued the
	 *   message — the status must be one of `status_in`, and each INSTANT is compared only when the
	 *   caller pinned it. A message scheduled from the appointment's END pins the end rather than the
	 *   start, which is what a before-start check cannot express and what a no-check version gets
	 *   wrong: an admin who reschedules a finished appointment back into the future would otherwise
	 *   receive the follow-up written for the old end, AND a second one when the new end comes round
	 *   (review finding 2). Dropping answers `guard_unmet`, terminal like the other guard drops.
	 *
	 * @param int|null                                                                                                                                                                                                                  $booking_id Booking id from the delivery row.
	 * @param array{to:string, subject:string, body:string, _token_hash?:string, _reminder?:array{status:string, start:string}, _guard?:array{status_in:list<string>, payment?:list<string>, start:string, end:string, version:string}} $payload Rendered payload.
	 * @return string Stable drop reason (`token_superseded`|`reminder_stale`|`guard_unmet`|`guard_booking_missing`), or ''.
	 */
	private function sendBlockReason( ?int $booking_id, array $payload ): string {
		$token_hash = (string) ( $payload['_token_hash'] ?? '' );
		$reminder   = $payload['_reminder'] ?? null;
		$guard      = $payload['_guard'] ?? null;
		if ( '' === $token_hash && ! is_array( $reminder ) && ! is_array( $guard ) ) {
			return ''; // Unguarded payload (admin/no-link email) — always deliverable.
		}

		if ( null === $booking_id || $booking_id <= 0 ) {
			return 'guard_booking_missing';
		}

		$table = $this->wpdb->prefix . 'aponto_bookings';
		// phpcs:disable PluginCheck.Security.DirectDB.UnescapedDBParameter -- Constant plugin table; the only runtime value is bound by prepare() before execution.
		$sql = "SELECT status, start_datetime_utc, end_datetime_utc, token_hash, mutation_version FROM {$table} WHERE id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Constant table; id bound via prepare(); authoritative re-check right before the send.
		$row = $this->wpdb->get_row( $this->wpdb->prepare( $sql, $booking_id ), ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		// phpcs:enable PluginCheck.Security.DirectDB.UnescapedDBParameter
		if ( ! is_array( $row ) ) {
			return 'guard_booking_missing';
		}

		if ( '' !== $token_hash && (string) $row['token_hash'] !== $token_hash ) {
			return 'token_superseded';
		}

		if ( is_array( $reminder ) ) {
			$status = (string) ( $reminder['status'] ?? '' );
			$start  = (string) ( $reminder['start'] ?? '' );
			if ( (string) $row['status'] !== $status || (string) $row['start_datetime_utc'] !== $start ) {
				return 'reminder_stale';
			}
		}

		if ( is_array( $guard ) ) {
			$statuses = is_array( $guard['status_in'] ?? null ) ? $guard['status_in'] : array();
			if ( array() !== $statuses && ! in_array( (string) $row['status'], $statuses, true ) ) {
				return 'guard_unmet';
			}
			$pinned_version = (string) ( $guard['version'] ?? '' );
			if ( '' !== $pinned_version && (string) $row['mutation_version'] !== $pinned_version ) {
				// The booking has been written since this copy was rendered. Re-entering the same
				// STATUS is not the same thing as being the same booking generation, which is the
				// hole the status-only guard left (review round 2).
				return 'guard_unmet';
			}
			$pinned_start = (string) ( $guard['start'] ?? '' );
			if ( '' !== $pinned_start && (string) $row['start_datetime_utc'] !== $pinned_start ) {
				return 'guard_unmet';
			}
			$pinned_end = (string) ( $guard['end'] ?? '' );
			if ( '' !== $pinned_end && (string) $row['end_datetime_utc'] !== $pinned_end ) {
				return 'guard_unmet';
			}
			// PAYMENT term (D-R38j). Read only when the payload carries it, so no existing payload
			// pays for a second query — and re-read from the ORDER, not from anything this payload
			// remembered, because the whole point is that the money may have moved since.
			$payment_statuses = is_array( $guard['payment'] ?? null ) ? $guard['payment'] : array();
			if ( array() !== $payment_statuses ) {
				$order = $this->orderRow( $booking_id );
				$state = null === $order ? 'none' : (string) ( $order['payment_status'] ?? 'none' );
				if ( ! in_array( $state, $payment_statuses, true ) ) {
					return 'guard_unmet';
				}
			}
		}

		return '';
	}

	/**
	 * Partially mask an email for the Send log (A3): first two characters of the local part and of
	 * the domain name survive, the TLD is kept for debugging, everything else is bulleted — e.g.
	 * `maria@gmail.com` → `ma•••@gm•••.com`. Returns '' for a malformed address.
	 *
	 * @param string $email Full email address.
	 */
	public static function maskEmail( string $email ): string {
		$at = mb_strpos( $email, '@' );
		if ( false === $at || 0 === $at ) {
			return '';
		}
		$local  = mb_substr( $email, 0, $at );
		$domain = mb_substr( $email, $at + 1 );
		$dot    = mb_strrpos( $domain, '.' );
		if ( false === $dot ) {
			return self::maskFragment( $local ) . '@' . self::maskFragment( $domain );
		}

		return self::maskFragment( $local ) . '@' . self::maskFragment( mb_substr( $domain, 0, $dot ) ) . mb_substr( $domain, $dot );
	}

	/**
	 * Mask one address fragment: keep up to two leading characters, bullet the rest (min one bullet).
	 *
	 * @param string $fragment Local part or domain name.
	 */
	private static function maskFragment( string $fragment ): string {
		$len = mb_strlen( $fragment );
		if ( $len <= 2 ) {
			return mb_substr( $fragment, 0, 1 ) . '•';
		}

		return mb_substr( $fragment, 0, 2 ) . str_repeat( '•', min( 3, $len - 2 ) );
	}

	/**
	 * The owner/admin recipient for booking alerts: the configured `business.email` when set to a
	 * valid address, else the WordPress admin email (fleet-r1 Fix 2; finding U1 BUG-3). The wizard
	 * prefills `business.email` with the email the owner enters in step 4, so alerts reach the
	 * address the owner set — not a leftover WP admin email a different person installed with.
	 * A non-empty but INVALID stored value falls back too, with a structured warning so the owner
	 * can learn why alerts moved (r1 review item 3; visible when debug logging is on).
	 */
	private function adminEmail(): string {
		$configured = trim( (string) $this->settings->get( 'business.email' ) );
		if ( '' !== $configured ) {
			if ( false !== is_email( $configured ) ) {
				return $configured;
			}
			try {
				( new Logger( $this->settings, $this->clock ) )->log(
					'aponto_invalid_business_email',
					'warning',
					'business.email is not a valid address; booking alerts fall back to the WordPress admin email.'
				);
			} catch ( \Throwable $log_failure ) {
				unset( $log_failure ); // Logging must never break a send.
			}
		}

		return (string) get_option( 'admin_email' );
	}

	/**
	 * The recipient for a staff notification: the assigned member's own `aponto_staff.email`
	 * (D-R28). Reads the same table {@see NotificationContext} already reads for `{staff_name}`.
	 *
	 * Deliberately has NO fallback to the admin address. An empty or malformed value means "this
	 * staff row has no mailbox" — a resource-type row, or a member whose email was cleared — and
	 * `prepareJob()` drops such a job silently. Falling back would quietly redirect one member's
	 * mail to the owner, which is the opposite of what a per-staff notification is for.
	 *
	 * @param Booking $booking Booking snapshot.
	 */
	private function staffEmail( Booking $booking ): string {
		$table = $this->wpdb->prefix . 'aponto_staff';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		$email = $this->wpdb->get_var( $this->wpdb->prepare( "SELECT email FROM {$table} WHERE id = %d", $booking->staff_id ) );

		return trim( (string) $email );
	}

	/**
	 * Enter the mail-render locale: switch to the SITE locale (the business's configured language —
	 * right for both customer and admin copy even when an admin in another locale triggered the
	 * send). Pure switch, no other side effect — the caller loads the textdomain INSIDE its
	 * try/finally so any failure still restores the locale (r1 review item 6).
	 */
	private function enterMailLocale(): bool {
		return switch_to_locale( get_locale() );
	}

	/**
	 * Leave the mail-render locale, restoring the request locale when a switch was made. The
	 * mail-locale textdomain load replaced the process-wide `aponto` catalog, so re-pin it to the
	 * restored request locale — otherwise a localized email would leave the textdomain stuck in
	 * the mail locale for the rest of the request (and, in tests, the next case).
	 *
	 * @param bool $switched Whether {@see self::enterMailLocale()} switched the locale.
	 */
	private function exitMailLocale( bool $switched ): void {
		if ( ! $switched ) {
			return;
		}
		restore_previous_locale();
		// `$reloadable = true` is NOT cosmetic. Without it `unload_textdomain()` records the domain
		// in `$l10n_unloaded`, which permanently disables WordPress' just-in-time loading for
		// `aponto` for the REST of the request — so on a non-English site every Aponto string
		// rendered after an email was sent silently fell back to English (the admin screen that
		// triggered the send, the response it rendered, the next mail queued in the same request).
		unload_textdomain( 'aponto', true );
		\Aponto\Support\Translations::loadCurrentLocale();
	}

	/**
	 * Translate an admin-stored template string through the catalog — but ONLY when it still
	 * BINARY-matches a seeded default (r1 review item 6, same `===` philosophy as the copy
	 * migrations): the seeded English defaults ARE the msgids (extraction anchors live in
	 * {@see Seeder::translatableDefaults()}), so an unmodified default localizes, while a template
	 * the admin edited — even one that happens to coincide with some other catalog msgid — is
	 * ALWAYS returned verbatim, exactly as the admin wrote it.
	 *
	 * @param string $text Stored subject or body.
	 */
	private function localizeTemplate( string $text ): string {
		if ( '' === $text || ! in_array( $text, self::defaultTemplateStrings(), true ) ) {
			return $text;
		}

		// phpcs:ignore WordPress.WP.I18n.LowLevelTranslationFunction, WordPress.WP.I18n.NonSingularStringLiteralText -- Runtime catalog lookup of a verbatim seeded default; the literals are registered for extraction in Seeder::translatableDefaults().
		return translate( $text, 'aponto' );
	}

	/**
	 * The exact seeded default subjects and bodies (the translatable msgids), memoized per process.
	 *
	 * @return list<string>
	 */
	private static function defaultTemplateStrings(): array {
		static $defaults = null;
		if ( null === $defaults ) {
			$defaults = array();
			foreach ( Seeder::templates() as $template ) {
				$defaults[] = (string) $template['subject'];
				$defaults[] = (string) $template['body'];
			}
		}

		return $defaults;
	}

	/**
	 * Fixture placeholder values for test-send.
	 *
	 * @param string $email Recipient (used as the sample customer email).
	 * @return array<string, string>
	 */
	private function fixturePlaceholders( string $email ): array {
		$tz     = $this->timezones->forLocation( 0 );
		$now    = $this->clock->now();
		$ts     = $now->getTimestamp();
		$date   = (string) $this->settings->get( 'date_format' );
		$time   = (string) $this->settings->get( 'time_format' );
		$manage = BookingManagePage::manageUrl( 'sample-token' );

		return array(
			'customer_name'     => 'Alex Sample',
			'customer_email'    => $email,
			'customer_phone'    => '+1 555 0100',
			'service_name'      => 'Sample Service',
			'staff_name'        => 'Sample Staff',
			'booking_date'      => (string) wp_date( $date, $ts, $tz ),
			// The one shared time format path (SPEC-P1 §3.3); the fixture uses a single timezone.
			'booking_time'      => NotificationContext::formatBookingTime( (string) wp_date( $time, $ts, $tz ), TimezoneLabel::label( $tz, $now ), null ),
			'booking_end_time'  => (string) wp_date( $time, $ts + HOUR_IN_SECONDS, $tz ),
			'booking_timezone'  => TimezoneLabel::label( $tz, $now ),
			'business_name'     => (string) $this->settings->get( 'business.name' ),
			'business_address'  => (string) $this->settings->get( 'business.address' ),
			'business_phone'    => (string) $this->settings->get( 'business.phone' ),
			'site_name'         => Settings::blogName(),
			'booking_status'    => 'confirmed',
			'order_code'        => 'AP-SAMPL',
			'cancel_reason'     => __( 'Schedule conflict', 'aponto' ),
			'manage_link'       => $manage,
			'cancel_link'       => $manage,
			'ics_link'          => rest_url( 'aponto/v1/public/bookings/sample-token/ics' ),
			'booking_page_link' => NotificationContext::bookingPageUrl(),
			// Sample preview: the resume link uses the same placeholder token as the manage link, so
			// a test send shows the shape without minting anything real.
			'payment_link'      => \Aponto\Frontend\BookingManagePage::resumeUrl( 'sample-token' ),
		);
	}
}

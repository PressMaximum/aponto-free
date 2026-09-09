<?php
/**
 * `aponto_transactions` reader/writer (D-R38, extension-surface §5b.4).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Payments;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Database\StorageException;
use Aponto\Support\Clock;

/**
 * The money ledger: one row per charge or refund ATTEMPT, written before the gateway is called and
 * updated with what came back.
 *
 * Two properties are load-bearing and shape every method here.
 *
 * **Fail-closed writes.** Every statement result is checked and a failure throws
 * {@see StorageException} rather than returning false. A payment row that silently did not persist
 * is worse than a failed request: the customer's money moves and this side has no record of why.
 *
 * **Compare-and-swap on transitions.** `markBegun()`, `markSucceeded()` and `markFailed()` all carry
 * the expected current status in their `WHERE`, so two racing actors (the confirm leg and the
 * webhook, or the expiry cron and a late confirm) cannot both "win" a transition. A caller learns
 * which one it was from the affected-row count instead of from a read it took a moment earlier —
 * the D-R34f rule, applied to the row that records money.
 */
final class TransactionRepository {

	/**
	 * Charge attempt.
	 */
	public const KIND_CHARGE = 'charge';

	/**
	 * Refund attempt.
	 */
	public const KIND_REFUND = 'refund';

	/**
	 * Written, not yet resolved.
	 */
	public const STATUS_PENDING = 'pending';

	/**
	 * Money moved.
	 */
	public const STATUS_SUCCEEDED = 'succeeded';

	/**
	 * The attempt is over and money did not move.
	 */
	public const STATUS_FAILED = 'failed';

	/**
	 * A void is IN FLIGHT for this charge (Codex #10).
	 *
	 * The expiry tick and the customer's own hold release both have to call the gateway, and the
	 * structural rule forbids doing that inside the per-order lock. The row is therefore moved to
	 * this claimed state under the lock and the lock is released before the HTTP call — so a second
	 * tick arriving mid-void sees a claim rather than a `pending` row it would race. `updated_at`
	 * doubles as the claim's LEASE: a worker that died mid-void leaves a `voiding` row that
	 * {@see self::reclaimStaleVoid()} takes back after {@see self::VOID_LEASE_SECONDS}.
	 */
	public const STATUS_VOIDING = 'voiding';

	/**
	 * A CAPTURE is in flight for this charge (D-R40c).
	 *
	 * The mirror image of {@see self::STATUS_VOIDING}, and it exists for the same reason read from
	 * the other end. `PaymentService::confirm()` decides `hold_open` and then calls the gateway with
	 * no lock held; without a durable claim, the expiry cron or the customer's own cancel could void
	 * and release the booking inside that window, and the capture would charge for a slot that had
	 * already been given back. The row is moved here under the per-order lock BEFORE the HTTP, every
	 * hold-release path refuses while the claim is live, and the claim is handed back under the lock
	 * that applies the outcome. `updated_at` is the lease, exactly as for a void.
	 */
	public const STATUS_CAPTURING = 'capturing';

	/**
	 * How long a `voiding` claim may be held before another tick may take it over, in seconds.
	 */
	public const VOID_LEASE_SECONDS = 300;

	/**
	 * How long a `capturing` claim may be held before it is treated as the wreckage of a died
	 * request, in seconds (D-R40c).
	 *
	 * The same 300 s as a void, and deliberately the same number: both bound one gateway round trip
	 * made outside the lock, and a second constant would only be a second thing to keep in step.
	 */
	public const CAPTURE_LEASE_SECONDS = 300;

	/**
	 * How long a charge attempt may sit claimed with no `gateway_ref` before it is treated as the
	 * wreckage of a died request, in seconds (Codex B).
	 *
	 * Long enough to cover a slow gateway create plus the local write; short enough that a customer
	 * who reloads is not stuck behind a dead attempt. Inside the window a replay is told to WAIT
	 * rather than retiring an attempt whose intent may be seconds from existing — retiring it there
	 * is how one hold ends up with two remote intents.
	 */
	public const BEGIN_LEASE_SECONDS = 60;

	/**
	 * The `failure_code` that marks a live charge attempt whose VERIFICATION could not be reached
	 * (D-R40e, verify round — the retrieval fallback, corrected).
	 *
	 * D-R40e made `begin` retrieve the authoritative object when the create response states no
	 * binding. The first cut then read a TRANSPORT failure of that retrieve as "the object is not
	 * ours" — a reference conflict — which is a claim nobody made: a timed-out GET says nothing
	 * about the object, and the object certainly exists, because the create that named it succeeded.
	 * Closing the row there spent one of three attempts, wrote a false `reference_conflict` anomaly,
	 * and sent the next attempt out under a NEW sequence — i.e. minted a SECOND remote object for a
	 * hold that already had one.
	 *
	 * The row therefore stays `pending` and carries this code instead: the claim is alive, its
	 * `idempotency_key` is unchanged, and the next attempt REUSES it, so the provider answers the
	 * replayed key with the object it already created and the verification is simply retried.
	 */
	public const VERIFICATION_UNAVAILABLE = 'verification_unavailable';

	/**
	 * How long a refund may sit `pending` before the tick re-dispatches it, in seconds (Codex J).
	 */
	public const REFUND_LEASE_SECONDS = 600;

	/**
	 * Maximum reconcile attempts for a stuck pending refund before it is failed for a human.
	 */
	public const MAX_REFUND_RECONCILES = 3;

	/**
	 * Statuses that mean a charge attempt is still in flight — neither settled nor abandoned.
	 *
	 * `capturing` belongs here for the same reason `voiding` does (D-R40c): a charge whose capture is
	 * on the network is still the order's live attempt, and treating it as absent would let the begin
	 * path mint a rival intent for the same hold.
	 *
	 * @var list<string>
	 */
	public const IN_FLIGHT = array( self::STATUS_PENDING, self::STATUS_VOIDING, self::STATUS_CAPTURING );

	/**
	 * THE LEASE COLUMN IS `updated_at`.
	 *
	 * Every claim this table carries — a charge attempt waiting for its `gateway_ref`, a `voiding`
	 * charge, a `pending` refund waiting to settle — is fenced on `updated_at` rather than on a
	 * dedicated `claimed_at`. The column already means exactly the right thing: it is stamped when
	 * the claim is written and moves only when the row's state changes, so "how long has this claim
	 * been held" is `now - updated_at` with no second column to keep honest. Every takeover compares
	 * the EXACT value it read (`WHERE updated_at = …`), so two workers noticing the same abandoned
	 * claim in the same second cannot both win it.
	 *
	 * Construct the repository.
	 *
	 * @param \wpdb $wpdb  Database handle.
	 * @param Clock $clock Clock.
	 */
	public function __construct(
		private \wpdb $wpdb,
		private Clock $clock
	) {}

	/**
	 * Fully-qualified table name.
	 */
	private function table(): string {
		return $this->wpdb->prefix . 'aponto_transactions';
	}

	/**
	 * Insert a `pending` attempt — the durable intent, written BEFORE the gateway is called.
	 *
	 * @param int                     $order_id        Order id.
	 * @param int|null                $booking_id      Booking id (denormalised for reads).
	 * @param string                  $gateway         Module code.
	 * @param string                  $kind            `charge` or `refund`.
	 * @param int                     $amount_minor    Amount in minor units.
	 * @param string                  $currency        ISO-4217 currency.
	 * @param string                  $idempotency_key Stable key handed to the driver.
	 * @param \DateTimeImmutable|null $expires_at      Hold deadline the attempt inherits.
	 * @param int|null                $parent_id       For a refund, the charge it refunds.
	 * @return int Inserted row id.
	 * @throws StorageException When the insert fails.
	 */
	public function insertPending(
		int $order_id,
		?int $booking_id,
		string $gateway,
		string $kind,
		int $amount_minor,
		string $currency,
		string $idempotency_key,
		?\DateTimeImmutable $expires_at = null,
		?int $parent_id = null
	): int {
		$now = $this->clock->nowSql();

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Ledger insert; no cache layer applies to a money row.
		$inserted = $this->wpdb->insert(
			$this->table(),
			array(
				'order_id'        => $order_id,
				'booking_id'      => $booking_id,
				'gateway'         => $gateway,
				'kind'            => $kind,
				'status'          => self::STATUS_PENDING,
				'amount_minor'    => $amount_minor,
				'currency'        => $currency,
				'gateway_ref'     => '',
				'payment_ref'     => '',
				'parent_id'       => $parent_id,
				'idempotency_key' => $idempotency_key,
				'failure_code'    => '',
				'expires_at'      => null === $expires_at ? null : $expires_at->format( 'Y-m-d H:i:s' ),
				'meta'            => null,
				'created_at'      => $now,
				'updated_at'      => $now,
			),
			array( '%d', '%d', '%s', '%s', '%s', '%d', '%s', '%s', '%s', '%d', '%s', '%s', '%s', '%s', '%s', '%s' )
		);

		if ( false === $inserted || (int) $this->wpdb->insert_id <= 0 ) {
			throw StorageException::fromSqlError( esc_html( 'payment transaction insert' ), esc_html( (string) $this->wpdb->last_error ) );
		}

		return (int) $this->wpdb->insert_id;
	}

	/**
	 * Record the gateway reference and the browser-facing client parameters on a `pending` attempt.
	 *
	 * Compare-and-swap on `status = pending` AND on the row still having no reference: a second
	 * `begin` for the same row (a retried request that raced) must not overwrite the reference the
	 * first one stored, because the customer's browser may already be paying against it.
	 *
	 * @param int                     $id            Transaction id.
	 * @param string                  $gateway_ref   Gateway-side reference.
	 * @param array<string, string>   $client_params Browser-facing parameters (no secrets — §5b.3).
	 * @param \DateTimeImmutable|null $expires_at    Intent expiry reported by the gateway.
	 * @return bool Whether this call was the one that stored the reference.
	 * @throws StorageException When the update fails.
	 */
	public function markBegun( int $id, string $gateway_ref, array $client_params, ?\DateTimeImmutable $expires_at ): bool {
		$meta = array() === $client_params ? '' : (string) wp_json_encode( self::metaFor( $client_params ) );

		// The expiry clause is BRANCHED rather than wrapped in `COALESCE( %s, … )` because
		// `wpdb::prepare()` casts a null `%s` argument to the empty string, which MySQL would then
		// store as an invalid datetime. A nullable value therefore never travels through prepare()
		// in this class; the SQL differs instead.
		$expiry_clause = null === $expires_at ? '' : ', expires_at = %s';
		$sql           = 'UPDATE ' . $this->table() . ' SET gateway_ref = %s, meta = %s' . $expiry_clause
			. ', updated_at = %s WHERE id = %d AND status = %s AND gateway_ref = %s';

		$args = array( $gateway_ref, $meta );
		if ( null !== $expires_at ) {
			$args[] = $expires_at->format( 'Y-m-d H:i:s' );
		}
		$args[] = $this->clock->nowSql();
		$args[] = $id;
		$args[] = self::STATUS_PENDING;
		$args[] = '';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare -- Constant table; every value bound via prepare(); the interpolated fragment is a fixed %s clause.
		$affected = $this->wpdb->query( $this->wpdb->prepare( $sql, $args ) );

		if ( false === $affected ) {
			throw StorageException::fromSqlError( esc_html( 'payment transaction begin' ), esc_html( (string) $this->wpdb->last_error ) );
		}

		return (int) $affected > 0;
	}

	/**
	 * Resolve a `pending` attempt as succeeded.
	 *
	 * `meta` is cleared in the same statement, which is the whole reason this method sets it: the
	 * only thing it ever held is the in-flight intent's browser-facing parameters, and once the
	 * payment is settled they are a stale secret-shaped string sitting in the database for no
	 * purpose (privacy-inventory). Settled is genuinely terminal, so this one is unconditional — but
	 * it only reaches THIS row, and the order's earlier attempts are swept by the caller with
	 * {@see self::clearClientParams()} (D-R40g).
	 *
	 * @param int    $id          Transaction id.
	 * @param string $payment_ref Gateway payment reference.
	 * @param string $gateway_ref Gateway-side reference (kept when the driver reports none).
	 * @return bool Whether THIS call performed the transition.
	 * @throws StorageException When the update fails.
	 */
	public function markSucceeded( int $id, string $payment_ref, string $gateway_ref = '' ): bool {
		// A driver that reports no reference must not blank the one already stored, so the clause is
		// branched rather than written with a conditional expression: the value is either present and
		// bound, or the column is left out of the statement entirely.
		$ref_clause = '' === $gateway_ref ? '' : ', gateway_ref = %s';
		// The DURABLE subset survives (D-R39c, Codex A.3). `meta = NULL` also erased the record of
		// which Stripe environment took the money, so a cross-mode refund could only be discovered by
		// asking the gateway with the CURRENT key — which is exactly the call that fails first. What
		// is kept is a two-value flag; the browser-facing parameters still go.
		$retained    = $this->retainedMeta( $id );
		$meta_clause = null === $retained ? ', meta = NULL' : ', meta = %s';

		$sql = 'UPDATE ' . $this->table() . ' SET status = %s, payment_ref = %s' . $ref_clause
			. ', failure_code = %s' . $meta_clause . ', updated_at = %s WHERE id = %d AND status IN ( %s, %s, %s )';

		$args = array( self::STATUS_SUCCEEDED, $payment_ref );
		if ( '' !== $gateway_ref ) {
			$args[] = $gateway_ref;
		}
		$args[] = '';
		if ( null !== $retained ) {
			$args[] = $retained;
		}
		$args[] = $this->clock->nowSql();
		$args[] = $id;
		$args[] = self::STATUS_PENDING;
		$args[] = self::STATUS_VOIDING;
		$args[] = self::STATUS_CAPTURING;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare -- Constant table; every value bound via prepare(); the interpolated fragment is a fixed %s clause.
		$affected = $this->wpdb->query( $this->wpdb->prepare( $sql, $args ) );

		if ( false === $affected ) {
			throw StorageException::fromSqlError( esc_html( 'payment transaction succeed' ), esc_html( (string) $this->wpdb->last_error ) );
		}

		return (int) $affected > 0;
	}

	/**
	 * Settle a REFUND row, and say whether THIS call is the one that settled it (D-R40e, verify B.1).
	 *
	 * A dedicated compare-and-swap rather than {@see self::markSucceeded()}, for two reasons that
	 * only apply to refunds.
	 *
	 * **(1) `failed` IS A LEGAL SOURCE HERE.** A refund that the reconcile tick gave up on is failed
	 * with `refund_unreconciled` — a statement about THIS SITE's attempts to read the gateway, not
	 * about the money. The gateway may still settle it, and the `refund_succeeded` webhook that says
	 * so is the authoritative answer; leaving the row failed under a refund the gateway has paid is a
	 * ledger that disagrees with the bank. A CHARGE has no equivalent transition, which is why
	 * `markSucceeded()` deliberately does not accept `failed` and this method does.
	 *
	 * **(2) THE CALLER MUST BE ABLE TO LOSE.** `applyRemoteRefund()` reads the row, decides the
	 * order's new status, writes an activity line and queues a customer email. Every one of those is
	 * a consequence of the transition, so it may only happen when the transition actually happened —
	 * and the affected-row count is the only honest source of that, since two deliveries of one
	 * settlement can be inside this method at the same time.
	 *
	 * @param int    $id          Transaction id.
	 * @param string $gateway_ref The gateway's REFUND reference (rest-contract §2.21).
	 * @param string $payment_ref The originating charge's reference.
	 * @return int Rows this call moved: 1 when it won the transition, 0 when it lost.
	 * @throws StorageException When the update fails.
	 */
	public function markRefundSucceeded( int $id, string $gateway_ref, string $payment_ref ): int {
		$ref_clause = '' === $gateway_ref ? '' : ', gateway_ref = %s';
		$sql        = 'UPDATE ' . $this->table() . ' SET status = %s, payment_ref = %s' . $ref_clause
			. ', failure_code = %s, meta = NULL, updated_at = %s WHERE id = %d AND kind = %s AND status IN ( %s, %s )';

		$args = array( self::STATUS_SUCCEEDED, $payment_ref );
		if ( '' !== $gateway_ref ) {
			$args[] = $gateway_ref;
		}
		$args[] = '';
		$args[] = $this->clock->nowSql();
		$args[] = $id;
		$args[] = self::KIND_REFUND;
		$args[] = self::STATUS_PENDING;
		$args[] = self::STATUS_FAILED;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare -- Constant table; every value bound via prepare(); the interpolated fragment is a fixed %s clause.
		$affected = $this->wpdb->query( $this->wpdb->prepare( $sql, $args ) );

		if ( false === $affected ) {
			throw StorageException::fromSqlError( esc_html( 'payment refund succeed' ), esc_html( (string) $this->wpdb->last_error ) );
		}

		return max( 0, (int) $affected );
	}

	/**
	 * Park a live charge attempt whose verification could not be reached (D-R40e, verify B.2).
	 *
	 * The row stays `pending` and keeps its `idempotency_key`; only the reason moves. Lease-fenced,
	 * because the begin path calls this with NO lock held — between the gateway call and here another
	 * actor may have retired this claim, and a write that revived it would resurrect an attempt
	 * somebody else has already replaced.
	 *
	 * The `gateway_ref = ''` term is part of the same statement of intent: an attempt that DID record
	 * a reference is a live intent, and nothing about an unreachable verification applies to it.
	 *
	 * @param int    $id    Transaction id.
	 * @param string $lease The `updated_at` this caller read.
	 * @return bool Whether the row was still this caller's and took the mark.
	 * @throws StorageException When the update fails.
	 */
	public function holdForVerification( int $id, string $lease ): bool {
		$sql = 'UPDATE ' . $this->table() . ' SET failure_code = %s, updated_at = %s'
			. " WHERE id = %d AND status = %s AND gateway_ref = '' AND updated_at = %s";

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; every value bound via prepare(); lease-fenced compare-and-swap.
		$affected = $this->wpdb->query( $this->wpdb->prepare( $sql, self::VERIFICATION_UNAVAILABLE, $this->clock->nowSql(), $id, self::STATUS_PENDING, $lease ) );

		if ( false === $affected ) {
			throw StorageException::fromSqlError( esc_html( 'payment transaction verification hold' ), esc_html( (string) $this->wpdb->last_error ) );
		}

		return (int) $affected > 0;
	}

	/**
	 * Take a parked attempt back for another verification round (D-R40e, verify B.2).
	 *
	 * The counterpart of {@see self::holdForVerification()}, and the whole point of the pair: the row
	 * — and therefore the idempotency key stored on it — is REUSED, so the retry presents the key the
	 * remote object was created under instead of minting a second object under a new sequence. The
	 * mark is cleared in the same statement, so a second request arriving while this one is inside
	 * the gateway call sees an ordinary fresh claim and is told to wait rather than reusing it too.
	 *
	 * @param int $id Transaction id.
	 * @return bool Whether THIS call took the attempt over.
	 * @throws StorageException When the update fails.
	 */
	public function reclaimForVerification( int $id ): bool {
		$sql = 'UPDATE ' . $this->table() . " SET failure_code = '', updated_at = %s"
			. " WHERE id = %d AND status = %s AND gateway_ref = '' AND failure_code = %s";

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; every value bound via prepare(); compare-and-swap on the parked row.
		$affected = $this->wpdb->query( $this->wpdb->prepare( $sql, $this->clock->nowSql(), $id, self::STATUS_PENDING, self::VERIFICATION_UNAVAILABLE ) );

		if ( false === $affected ) {
			throw StorageException::fromSqlError( esc_html( 'payment transaction verification reclaim' ), esc_html( (string) $this->wpdb->last_error ) );
		}

		return (int) $affected > 0;
	}

	/**
	 * Resolve a `pending` attempt as failed, with a short machine reason.
	 *
	 * ### A RETIRED ATTEMPT ON AN OPEN HOLD KEEPS ITS `client_params` (D-R40g)
	 *
	 * Clearing `meta` here was written when `failed` meant TERMINAL, and it contradicted D-R40c(7)
	 * the moment {@see self::claimForCapture()} started accepting a `failed` row: the row goes back
	 * to `pending` through {@see self::releaseCaptureClaim()} and is once more the order's live
	 * attempt — with the browser-facing parameters of its still-usable gateway reference already
	 * destroyed. Both re-read paths (`PaymentService::beginPayment()`, i.e. the booking-POST replay
	 * and `POST /public/bookings/{token}/pay`) then rebuilt the block from a NULL `meta` and answered
	 * `begin` with an EMPTY `client_params`, so the customer held an unexpired slot they had no way
	 * to pay for. Stripe's `client_secret` cannot be re-derived either: it comes only from the
	 * intent's create/retrieve response, and no re-read path may call a gateway — that would put HTTP
	 * inside the per-order lock. So it is KEPT.
	 *
	 * `$retryable` is the caller's answer to "is this reference still worth retrying on?", and only
	 * a decline is: a gateway DECLINE (`payment_intent.payment_failed`, `PAYMENT.CAPTURE.DECLINED`)
	 * leaves the object alive and re-confirmable, while an EXPIRED session, an abandoned begin and an
	 * amount mismatch leave nothing to retry on. It defaults to FALSE so a new caller drops the
	 * parameters unless it has said otherwise — the privacy-inventory default, not an opt-out.
	 *
	 * What ENDS the retry window is the HOLD, and the hold closing is not a transition on this row:
	 * a `failed` charge is invisible to {@see self::pendingCharge()}, so the release path scrubs the
	 * ORDER with {@see self::clearClientParams()} rather than relying on a status change here.
	 *
	 * @param int    $id           Transaction id.
	 * @param string $failure_code Short PII-free code (`expired`, `cancelled`, `amount_mismatch`, …).
	 * @param bool   $retryable    Whether the gateway reference stays usable for another attempt on
	 *                             the same still-open hold (D-R40g). True KEEPS `meta`.
	 * @return bool Whether THIS call performed the transition.
	 * @throws StorageException When the update fails.
	 */
	public function markFailed( int $id, string $failure_code, bool $retryable = false ): bool {
		// From ANY in-flight state: a charge being voided when the tick decides to release the hold is
		// resolved from `voiding`, not from `pending` (Codex #10), and one whose capture answered is
		// resolved from `capturing` (D-R40c).
		//
		// The `meta` clause is BRANCHED rather than made conditional in SQL: leaving the column out of
		// the statement entirely is the only way to say "do not touch it" that cannot be got wrong by
		// a CASE expression, and it is the same shape the nullable-datetime clauses in this class use.
		$meta_clause = $retryable ? '' : ', meta = NULL';
		$sql         = 'UPDATE ' . $this->table() . ' SET status = %s, failure_code = %s' . $meta_clause . ', updated_at = %s'
			. ' WHERE id = %d AND status IN ( %s, %s, %s )';

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare -- Constant table; every value bound via prepare(); the interpolated fragment is a fixed, placeholder-free clause; compare-and-swap on an in-flight row. The sniff cannot follow a multi-line prepare() call, so the block is disabled rather than one line ignored.
		$affected = $this->wpdb->query(
			$this->wpdb->prepare(
				$sql,
				self::STATUS_FAILED,
				mb_substr( $failure_code, 0, 64 ),
				$this->clock->nowSql(),
				$id,
				self::STATUS_PENDING,
				self::STATUS_VOIDING,
				self::STATUS_CAPTURING
			)
		);
		// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare

		if ( false === $affected ) {
			throw StorageException::fromSqlError( esc_html( 'payment transaction fail' ), esc_html( (string) $this->wpdb->last_error ) );
		}

		return (int) $affected > 0;
	}

	/**
	 * Drop the browser-facing parameters of EVERY attempt on an order (D-R40g).
	 *
	 * The terminal half of the {@see self::markFailed()} rule, and it has to be addressed by ORDER
	 * rather than by row: a retired attempt that kept its `client_params` is `failed`, and `failed`
	 * is exactly what {@see self::pendingCharge()} filters out — so the hold-release path holds no
	 * id for the row it needs to scrub, and a superseded earlier attempt would survive the payment
	 * of a later one either way. Callers run it wherever the hold CLOSES: released, voided, expired,
	 * or paid. Once it does, the stored intent secret is what the privacy inventory always said it
	 * was — a stale secret-shaped string with nothing left to authorise.
	 *
	 * Deliberately state-blind and kind-blind: this is a privacy sweep, and a sweep with a status
	 * filter is a sweep with a hole in it. `meta IS NOT NULL` keeps it a no-op on the ordinary order
	 * that never stored any.
	 *
	 * **IT STRIPS `client_params`, IT DOES NOT BLANK THE COLUMN (merge of D-R39c, Codex A.3).** The
	 * durable subset — `mode`, the account the money went to — has to outlive the payment so a refund
	 * months later can be refused before it spends a call it cannot make, and on the paid path this
	 * sweep runs in the SAME transaction as {@see self::markSucceeded()}, immediately after it has
	 * kept exactly that. A `meta = NULL` here would undo it silently. Each row is therefore rewritten
	 * to {@see self::durableSubset()} of what it held, and only a row with nothing durable left goes
	 * to NULL. Row-at-a-time rather than one statement because the value is computed from the stored
	 * JSON, and MySQL's JSON functions and the SQLite drop-in do not agree on how to do that in SQL.
	 *
	 * @param int $order_id Order id.
	 * @throws StorageException When a rewrite fails.
	 */
	public function clearClientParams( int $order_id ): void {
		$select = 'SELECT id, meta FROM ' . $this->table() . ' WHERE order_id = %d AND meta IS NOT NULL';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; the id is bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $select, $order_id ), ARRAY_A );
		if ( ! is_array( $rows ) ) {
			return;
		}

		// `updated_at` is deliberately NOT stamped: it is this table's lease column, and a privacy
		// sweep that moved it would look to every fenced compare-and-swap like a claim being taken.
		foreach ( $rows as $row ) {
			$id   = (int) ( $row['id'] ?? 0 );
			$kept = self::durableSubset( (string) ( $row['meta'] ?? '' ) );

			// Two whole statements rather than one with a spliced clause: the branch is over whether a
			// value is bound at all, and writing it out is both what the rest of this class does with
			// a nullable column and what keeps the sniff able to read the prepare() call.
			if ( null === $kept ) {
				$sql = 'UPDATE ' . $this->table() . ' SET meta = NULL WHERE id = %d';
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; the id is bound via prepare().
				$affected = $this->wpdb->query( $this->wpdb->prepare( $sql, $id ) );
			} else {
				$sql = 'UPDATE ' . $this->table() . ' SET meta = %s WHERE id = %d';
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; every value bound via prepare().
				$affected = $this->wpdb->query( $this->wpdb->prepare( $sql, $kept, $id ) );
			}

			if ( false === $affected ) {
				throw StorageException::fromSqlError( esc_html( 'payment transaction params sweep' ), esc_html( (string) $this->wpdb->last_error ) );
			}
		}
	}

	/**
	 * Record the gateway's references on a refund that is still settling (Codex #7).
	 *
	 * The row stays `pending` — the money has not moved — but it now carries the reference the
	 * settlement webhook will arrive with, which is what makes that webhook resolvable.
	 *
	 * **BOTH REFERENCES, IN THE CONTRACT'S SHAPE (D-R40e, Codex #3).** The first cut wrote the refund
	 * id into `payment_ref` and left `gateway_ref` empty — the very shape D-R40d had just replaced on
	 * the settled path — so the admin response to a PENDING refund contradicted rest-contract §2.21,
	 * and the legacy resolver, which opens ONLY on an empty `gateway_ref`, read a row written seconds
	 * ago as one written before the change. `gateway_ref` is the refund id and `payment_ref` the
	 * originating charge's reference, on the pending path exactly as on the settled one.
	 *
	 * @param int    $id          Transaction id.
	 * @param string $gateway_ref The gateway's REFUND reference.
	 * @param string $payment_ref The originating charge's reference.
	 * @throws StorageException When the update fails.
	 */
	public function markPendingRef( int $id, string $gateway_ref, string $payment_ref ): void {
		$sql = 'UPDATE ' . $this->table() . ' SET gateway_ref = %s, payment_ref = %s, updated_at = %s WHERE id = %d AND status = %s';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare(); compare-and-swap on the pending row.
		$affected = $this->wpdb->query( $this->wpdb->prepare( $sql, $gateway_ref, $payment_ref, $this->clock->nowSql(), $id, self::STATUS_PENDING ) );
		if ( false === $affected ) {
			throw StorageException::fromSqlError( esc_html( 'payment refund reference write' ), esc_html( (string) $this->wpdb->last_error ) );
		}
	}

	/**
	 * Retire a claim this worker owns, fenced on the lease it read (Codex D).
	 *
	 * The plain {@see self::markFailed()} compare-and-swaps on STATUS only, which is enough inside the
	 * per-order lock and not enough outside it: between reading a row and retiring it, another actor
	 * can have taken the same row over, and status alone cannot tell the two apart. Callers that run
	 * with no lock held — the begin path's failure branches, the stale-attempt sweep — use this and
	 * pass the `updated_at` they saw.
	 *
	 * It clears `meta` UNCONDITIONALLY, unlike {@see self::markFailed()} (D-R40g): every caller is a
	 * begin-path failure branch or the stale-attempt sweep, and each of those retires a row whose
	 * gateway reference was never stored — an abandoned claim, a discarded one, a create that
	 * refused. There is nothing to retry on, so there is nothing worth keeping the parameters for.
	 *
	 * @param int    $id           Transaction id.
	 * @param string $failure_code Short PII-free code.
	 * @param string $lease        The `updated_at` this caller read.
	 * @return bool Whether THIS call retired the row.
	 * @throws StorageException When the update fails.
	 */
	public function markFailedIfUnchanged( int $id, string $failure_code, string $lease ): bool {
		$sql = 'UPDATE ' . $this->table() . ' SET status = %s, failure_code = %s, meta = NULL, updated_at = %s'
			. ' WHERE id = %d AND status IN ( %s, %s, %s ) AND updated_at = %s';

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; every value bound via prepare(); lease-fenced compare-and-swap. The sniff cannot follow a multi-line prepare() call.
		$affected = $this->wpdb->query(
			$this->wpdb->prepare(
				$sql,
				self::STATUS_FAILED,
				mb_substr( $failure_code, 0, 64 ),
				$this->clock->nowSql(),
				$id,
				self::STATUS_PENDING,
				self::STATUS_VOIDING,
				self::STATUS_CAPTURING,
				$lease
			)
		);
		// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		if ( false === $affected ) {
			throw StorageException::fromSqlError( esc_html( 'payment transaction fenced fail' ), esc_html( (string) $this->wpdb->last_error ) );
		}

		return (int) $affected > 0;
	}

	/**
	 * Whether an in-flight charge's claim is still FRESH — i.e. a request is probably still inside
	 * its gateway call (Codex B).
	 *
	 * @param array<string, mixed> $row Charge row.
	 * @param \DateTimeImmutable   $now Current instant.
	 */
	public function isClaimFresh( array $row, \DateTimeImmutable $now ): bool {
		$lease = (string) ( $row['updated_at'] ?? '' );
		if ( '' === $lease ) {
			return false;
		}

		return $lease > $now->sub( new \DateInterval( 'PT' . self::BEGIN_LEASE_SECONDS . 'S' ) )->format( 'Y-m-d H:i:s' );
	}

	/**
	 * One row by id, or null.
	 *
	 * @param int $id Transaction id.
	 * @return array<string, mixed>|null
	 */
	public function find( int $id ): ?array {
		$sql = 'SELECT * FROM ' . $this->table() . ' WHERE id = %d';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; id bound via prepare().
		$row = $this->wpdb->get_row( $this->wpdb->prepare( $sql, $id ), ARRAY_A );

		return is_array( $row ) ? $row : null;
	}

	/**
	 * Every attempt for an order, oldest first.
	 *
	 * @param int $order_id Order id.
	 * @return list<array<string, mixed>>
	 */
	public function forOrder( int $order_id ): array {
		$sql = 'SELECT * FROM ' . $this->table() . ' WHERE order_id = %d ORDER BY id ASC';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; id bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $order_id ), ARRAY_A );

		return is_array( $rows ) ? array_values( $rows ) : array();
	}

	/**
	 * The newest `pending` charge for an order, or null.
	 *
	 * @param int $order_id Order id.
	 * @return array<string, mixed>|null
	 */
	public function pendingCharge( int $order_id ): ?array {
		// IN-FLIGHT, not merely `pending`: a charge whose void is being dispatched (Codex #10) — or
		// whose capture is (D-R40c) — is still the order's live attempt, and treating it as absent
		// would let a second actor create a rival intent for the same hold.
		$sql = 'SELECT * FROM ' . $this->table() . ' WHERE order_id = %d AND kind = %s AND status IN ( %s, %s, %s ) ORDER BY id DESC LIMIT 1';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		$row = $this->wpdb->get_row( $this->wpdb->prepare( $sql, $order_id, self::KIND_CHARGE, self::STATUS_PENDING, self::STATUS_VOIDING, self::STATUS_CAPTURING ), ARRAY_A );

		return is_array( $row ) ? $row : null;
	}

	/**
	 * Claim an in-flight charge for a VOID, under the per-order lock (Codex #10).
	 *
	 * Compare-and-swap `pending → voiding`, or a takeover of a `voiding`/`capturing` claim whose
	 * lease has expired — a worker that died mid-call must not freeze the hold forever, and an
	 * abandoned CAPTURE claim would otherwise leave the intent alive with nothing left to void it
	 * (D-R40c). A LIVE capture claim is refused here on purpose; the caller checks for one first and
	 * answers its own way (skip the tick, or `409`).
	 *
	 * **Returns the LEASE IT WROTE, not a bool** (D-R40c, Codex #8 of the verify round). The caller
	 * hands the claim back with `releaseVoidClaim( $id, $lease )`, which fences on `updated_at` — and
	 * the value it used to pass was the `updated_at` READ BEFORE the claim, which this statement has
	 * just overwritten. The fence therefore matched nothing, the row stayed `voiding`, and a failed
	 * void could not be retried until the 300 s lease expired instead of on the very next tick.
	 *
	 * @param int $id Transaction id.
	 * @return string The claim's `updated_at` when THIS call owns the void, '' when it does not.
	 * @throws StorageException When the update fails.
	 */
	public function claimForVoid( int $id ): string {
		$stale = $this->clock->now()->sub( new \DateInterval( 'PT' . self::VOID_LEASE_SECONDS . 'S' ) )->format( 'Y-m-d H:i:s' );
		$lease = $this->clock->nowSql();
		$sql   = 'UPDATE ' . $this->table() . ' SET status = %s, updated_at = %s'
			. ' WHERE id = %d AND ( status = %s OR ( status IN ( %s, %s ) AND updated_at < %s ) )';

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; every value bound via prepare(); void-claim compare-and-swap.
		$affected = $this->wpdb->query(
			$this->wpdb->prepare(
				$sql,
				self::STATUS_VOIDING,
				$lease,
				$id,
				self::STATUS_PENDING,
				self::STATUS_VOIDING,
				self::STATUS_CAPTURING,
				$stale
			)
		);
		// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		if ( false === $affected ) {
			throw StorageException::fromSqlError( esc_html( 'payment transaction void claim' ), esc_html( (string) $this->wpdb->last_error ) );
		}

		return (int) $affected > 0 ? $lease : '';
	}

	/**
	 * Claim an in-flight charge for a CAPTURE, under the per-order lock (D-R40c).
	 *
	 * The mirror of {@see self::claimForVoid()}, and the reason it exists is the whole of the verify
	 * round's first `P1`: `PaymentService::confirm()` reads "the hold is still open", releases the
	 * lock, and calls the gateway — and between those two moments the expiry cron or the customer's
	 * own cancel could void the intent and give the slot away, after which the capture charges
	 * somebody for an appointment that no longer exists. A `pending` charge is therefore moved here
	 * BEFORE the network call, and every release path refuses while the claim is live.
	 *
	 * Claimable from `pending`, from `failed`, or as a takeover of a `capturing` claim whose lease has
	 * expired. A `voiding` row is NOT claimable: a release is already on the network for it, and the
	 * honest answer to "may I capture?" there is no.
	 *
	 * ### A FAILED ATTEMPT IS A RETRYABLE ONE WHILE ITS HOLD IS OPEN (QA C1/D-R40)
	 *
	 * A decline retires the row (`failed`), and retrying on the SAME gateway reference is a designed
	 * flow in both drivers: a wallet's `instrument_declined` cure is a restart — a second approval on
	 * the same order — and an intent that a failure webhook already retired is confirmed again with
	 * another card on the same client secret. Both come back
	 * through `PaymentService::confirm()` with the same `{ref}`, so a claim that only accepted
	 * `pending` answered "not mine to capture", dispatched nothing, and left an order that the
	 * customer HAS now paid for sitting unpaid until its hold expired. `failed` is a retired attempt,
	 * not a closed one; what closes it is the HOLD, and the caller only ever claims while that hold is
	 * open (a closed hold is refused before this method is reached, and the money-moving driver
	 * refuses again on `hold_open = false`). The lease semantics are identical either way: the row
	 * becomes the order's live attempt again for 300 s, every hold-release path refuses while the
	 * claim is live, and an abandoned claim is reclaimable exactly as before.
	 *
	 * That re-claimability is also why a decline no longer clears the row's `client_params`: a row
	 * this method can take back is one the customer can still be asked to pay on, so its
	 * browser-facing parameters have to outlive the decline ({@see self::markFailed()}, D-R40g).
	 *
	 * @param int $id Transaction id.
	 * @return string The claim's `updated_at` when THIS call owns the capture, '' when it does not.
	 * @throws StorageException When the update fails.
	 */
	public function claimForCapture( int $id ): string {
		$stale = $this->clock->now()->sub( new \DateInterval( 'PT' . self::CAPTURE_LEASE_SECONDS . 'S' ) )->format( 'Y-m-d H:i:s' );
		$lease = $this->clock->nowSql();
		$sql   = 'UPDATE ' . $this->table() . ' SET status = %s, updated_at = %s'
			. ' WHERE id = %d AND ( status IN ( %s, %s ) OR ( status = %s AND updated_at < %s ) )';

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; every value bound via prepare(); capture-claim compare-and-swap.
		$affected = $this->wpdb->query(
			$this->wpdb->prepare(
				$sql,
				self::STATUS_CAPTURING,
				$lease,
				$id,
				self::STATUS_PENDING,
				self::STATUS_FAILED,
				self::STATUS_CAPTURING,
				$stale
			)
		);
		// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		if ( false === $affected ) {
			throw StorageException::fromSqlError( esc_html( 'payment transaction capture claim' ), esc_html( (string) $this->wpdb->last_error ) );
		}

		return (int) $affected > 0 ? $lease : '';
	}

	/**
	 * Give a `capturing` claim back (D-R40c).
	 *
	 * Called under the lock that applies the capture's outcome, so that everything downstream —
	 * `markSucceeded`, `safeFail`, the `unverified_amount` note — sees the ordinary `pending` row it
	 * has always seen. Fenced on the lease, because a claim whose lease expired can have been taken
	 * over by a void in the meantime and handing back somebody else's claim would be the same bug
	 * from the other side.
	 *
	 * `$status` is the state the row is handed back TO, and it exists because a claim can now be
	 * taken from a retired attempt as well as a live one. The outcome-application path always hands
	 * back `pending` and lets the outcome decide the row's final state; the path that has NO outcome
	 * — the driver answered `WP_Error`, so nothing is known — hands the row back to the state it was
	 * claimed FROM, because a transport failure is not evidence that undoes a decline that already
	 * happened.
	 *
	 * @param int    $id     Transaction id.
	 * @param string $lease  The `updated_at` of the claim this caller took ('' = status-only CAS).
	 * @param string $status State to hand the row back to: `pending` (default) or `failed`.
	 * @throws StorageException When the update fails.
	 */
	public function releaseCaptureClaim( int $id, string $lease = '', string $status = self::STATUS_PENDING ): void {
		$to    = self::STATUS_FAILED === $status ? self::STATUS_FAILED : self::STATUS_PENDING;
		$fence = '' === $lease ? '' : ' AND updated_at = %s';
		$sql   = 'UPDATE ' . $this->table() . ' SET status = %s, updated_at = %s WHERE id = %d AND status = %s' . $fence;

		$args = array( $to, $this->clock->nowSql(), $id, self::STATUS_CAPTURING );
		if ( '' !== $lease ) {
			$args[] = $lease;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare -- Constant table; every value bound via prepare(); the interpolated fragment is a fixed %s clause.
		$affected = $this->wpdb->query( $this->wpdb->prepare( $sql, $args ) );
		if ( false === $affected ) {
			throw StorageException::fromSqlError( esc_html( 'payment transaction capture release' ), esc_html( (string) $this->wpdb->last_error ) );
		}
	}

	/**
	 * Whether a charge row carries a LIVE capture claim — i.e. a gateway capture is on the network
	 * for it right now (D-R40c).
	 *
	 * The freshness test is what keeps the guard from becoming a deadlock: a worker that died mid
	 * capture leaves a `capturing` row, and after the lease it is reclaimable by a void exactly as an
	 * abandoned void claim is.
	 *
	 * @param array<string, mixed> $row Charge row.
	 * @param \DateTimeImmutable   $now Current instant.
	 */
	public function isCaptureClaimLive( array $row, \DateTimeImmutable $now ): bool {
		if ( self::STATUS_CAPTURING !== (string) ( $row['status'] ?? '' ) ) {
			return false;
		}

		$lease = (string) ( $row['updated_at'] ?? '' );

		return '' !== $lease
			&& $lease > $now->sub( new \DateInterval( 'PT' . self::CAPTURE_LEASE_SECONDS . 'S' ) )->format( 'Y-m-d H:i:s' );
	}

	/**
	 * Give a `voiding` claim back as `pending` (Codex #10).
	 *
	 * The path that needs this is the one the review found: the void answered `already_paid` but the
	 * capture could not confirm it. Marking the row failed there would release a slot that may have
	 * been paid for, so the attempt is handed back untouched and the next tick tries again.
	 *
	 * @param int    $id    Transaction id.
	 * @param string $lease The `updated_at` of the claim this caller took ('' = status-only CAS).
	 * @throws StorageException When the update fails.
	 */
	public function releaseVoidClaim( int $id, string $lease = '' ): void {
		// FENCED on the lease when the caller has one (Codex D): this runs with no lock held, and a
		// `voiding` row can have been taken over by a later tick in the meantime. Handing back a
		// claim that is no longer ours would let two ticks void the same intent.
		$fence = '' === $lease ? '' : ' AND updated_at = %s';
		$sql   = 'UPDATE ' . $this->table() . ' SET status = %s, updated_at = %s WHERE id = %d AND status = %s' . $fence;

		$args = array( self::STATUS_PENDING, $this->clock->nowSql(), $id, self::STATUS_VOIDING );
		if ( '' !== $lease ) {
			$args[] = $lease;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare -- Constant table; every value bound via prepare(); the interpolated fragment is a fixed %s clause.
		$affected = $this->wpdb->query( $this->wpdb->prepare( $sql, $args ) );
		if ( false === $affected ) {
			throw StorageException::fromSqlError( esc_html( 'payment transaction void release' ), esc_html( (string) $this->wpdb->last_error ) );
		}
	}

	/**
	 * How many charge attempts an order has had (Codex #2 — the retry bound).
	 *
	 * @param int $order_id Order id.
	 */
	public function chargeAttempts( int $order_id ): int {
		$sql = 'SELECT COUNT(*) FROM ' . $this->table() . ' WHERE order_id = %d AND kind = %s';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		return (int) $this->wpdb->get_var( $this->wpdb->prepare( $sql, $order_id, self::KIND_CHARGE ) );
	}

	/**
	 * The settled charge for an order, or null.
	 *
	 * @param int $order_id Order id.
	 * @return array<string, mixed>|null
	 */
	public function succeededCharge( int $order_id ): ?array {
		$sql = 'SELECT * FROM ' . $this->table() . ' WHERE order_id = %d AND kind = %s AND status = %s ORDER BY id DESC LIMIT 1';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		$row = $this->wpdb->get_row( $this->wpdb->prepare( $sql, $order_id, self::KIND_CHARGE, self::STATUS_SUCCEEDED ), ARRAY_A );

		return is_array( $row ) ? $row : null;
	}

	/**
	 * Record why an IN-FLIGHT attempt has not settled, leaving it in flight.
	 *
	 * The row stays `pending`: a `pending` outcome asserts nothing, the hold is still alive and a
	 * later retrieve or webhook can still settle it. What changes is that the reason is now readable
	 * — without this the confirm leg answered `pending` with no explanation, and the one code that
	 * must reach the customer (`unverified_amount`, "do not retry") had nowhere to travel.
	 *
	 * @param int    $id           Transaction id.
	 * @param string $failure_code Short machine code.
	 * @return bool Whether the row was still in flight and took the write.
	 * @throws StorageException When the update fails.
	 */
	public function noteInFlightFailure( int $id, string $failure_code ): bool {
		$sql = 'UPDATE ' . $this->table() . ' SET failure_code = %s, updated_at = %s WHERE id = %d AND status = %s';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare(); compare-and-swap on the pending row.
		$affected = $this->wpdb->query( $this->wpdb->prepare( $sql, mb_substr( $failure_code, 0, 64 ), $this->clock->nowSql(), $id, self::STATUS_PENDING ) );

		if ( false === $affected ) {
			throw StorageException::fromSqlError( esc_html( 'payment transaction note' ), esc_html( (string) $this->wpdb->last_error ) );
		}

		return (int) $affected > 0;
	}

	/**
	 * Refresh the reason on an already-FAILED charge row (QA BUG-3).
	 *
	 * A customer who is declined twice on the same intent produces one row and two reasons: core
	 * retires the row on the first failure, so the second — "you mistyped the CVC" after "not enough
	 * funds" — had nowhere to go, and the confirm leg kept answering with the stale one. Only the
	 * operational column moves; status, amounts, references and the lease are untouched, and the
	 * compare-and-swap on `status = failed` means this can never revive or overwrite a live attempt.
	 *
	 * @param int    $id           Transaction id.
	 * @param string $failure_code New short machine reason.
	 * @throws StorageException When the update itself fails.
	 */
	public function refreshFailureCode( int $id, string $failure_code ): bool {
		$sql = 'UPDATE ' . $this->table() . ' SET failure_code = %s, updated_at = %s WHERE id = %d AND status = %s AND failure_code <> %s';

		$code = mb_substr( $failure_code, 0, 64 );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare(); compare-and-swap on the failed row.
		$affected = $this->wpdb->query( $this->wpdb->prepare( $sql, $code, $this->clock->nowSql(), $id, self::STATUS_FAILED, $code ) );

		if ( false === $affected ) {
			throw StorageException::fromSqlError( esc_html( 'payment transaction note' ), esc_html( (string) $this->wpdb->last_error ) );
		}

		return (int) $affected > 0;
	}

	/**
	 * The most recent charge attempt for an order in ANY state, or null (Codex Q).
	 *
	 * The confirm-leg response reads this to explain a decline. Deliberately state-blind: the row a
	 * customer needs an explanation for is a FAILED one, which every other accessor here filters out.
	 *
	 * @param int $order_id Order id.
	 * @return array<string, mixed>|null
	 */
	public function latestCharge( int $order_id ): ?array {
		$sql = 'SELECT * FROM ' . $this->table() . ' WHERE order_id = %d AND kind = %s ORDER BY id DESC LIMIT 1';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		$row = $this->wpdb->get_row( $this->wpdb->prepare( $sql, $order_id, self::KIND_CHARGE ), ARRAY_A );

		return is_array( $row ) ? $row : null;
	}

	/**
	 * Whether an order has ever had a charge attempt in ANY state.
	 *
	 * This is the predicate the manual Q9 PATCH is refused on (D-R38i). It deliberately counts a
	 * FAILED charge too: an order that once went to a gateway is a gateway-tracked order, and an
	 * operator flipping its status by hand afterwards is exactly the ambiguity the refusal exists to
	 * prevent.
	 *
	 * @param int $order_id Order id.
	 */
	public function hasAnyCharge( int $order_id ): bool {
		$sql = 'SELECT COUNT(*) FROM ' . $this->table() . ' WHERE order_id = %d AND kind = %s';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		return (int) $this->wpdb->get_var( $this->wpdb->prepare( $sql, $order_id, self::KIND_CHARGE ) ) > 0;
	}

	/**
	 * Total refunded so far for an order, in minor units (settled refunds only).
	 *
	 * @param int $order_id Order id.
	 */
	public function refundedMinor( int $order_id ): int {
		// Settled AND in-flight (Codex #7): a refund the gateway has accepted but not yet settled is
		// money already promised away, so it RESERVES its amount. Counting only settled refunds would
		// let a second operator refund the same money while the first refund is still in flight.
		$sql = 'SELECT COALESCE( SUM(amount_minor), 0 ) FROM ' . $this->table() . ' WHERE order_id = %d AND kind = %s AND status IN ( %s, %s )';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		return (int) $this->wpdb->get_var( $this->wpdb->prepare( $sql, $order_id, self::KIND_REFUND, self::STATUS_SUCCEEDED, self::STATUS_PENDING ) );
	}

	/**
	 * Total SETTLED refunds for an order, in minor units — the figure the order's own status is
	 * derived from (a `pending` refund has not moved money yet).
	 *
	 * @param int $order_id Order id.
	 */
	public function settledRefundMinor( int $order_id ): int {
		$sql = 'SELECT COALESCE( SUM(amount_minor), 0 ) FROM ' . $this->table() . ' WHERE order_id = %d AND kind = %s AND status = %s';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		return (int) $this->wpdb->get_var( $this->wpdb->prepare( $sql, $order_id, self::KIND_REFUND, self::STATUS_SUCCEEDED ) );
	}

	/**
	 * Whether a refund is in flight for an order (Codex #7).
	 *
	 * @param int $order_id Order id.
	 */
	public function hasPendingRefund( int $order_id ): bool {
		$sql = 'SELECT COUNT(*) FROM ' . $this->table() . ' WHERE order_id = %d AND kind = %s AND status = %s';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		return (int) $this->wpdb->get_var( $this->wpdb->prepare( $sql, $order_id, self::KIND_REFUND, self::STATUS_PENDING ) ) > 0;
	}

	/**
	 * Pending refunds whose lease has expired — the tick reconciles them (Codex J).
	 *
	 * A refund that reached the gateway and never came back used to reserve its amount forever: the
	 * order stayed `paid`, every further refund answered `409`, and only a human reading the database
	 * could tell why. These rows are re-dispatched with the SAME idempotency key, which every gateway
	 * answers with the ORIGINAL result rather than a second refund.
	 *
	 * @param string $cutoff UTC `Y-m-d H:i:s`; rows not touched since this are due.
	 * @param int    $limit  Maximum rows to return.
	 * @return list<array<string, mixed>>
	 */
	public function stalePendingRefunds( string $cutoff, int $limit ): array {
		$sql = 'SELECT * FROM ' . $this->table() . ' WHERE kind = %s AND status = %s AND updated_at < %s ORDER BY id ASC LIMIT %d';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, self::KIND_REFUND, self::STATUS_PENDING, $cutoff, max( 1, $limit ) ), ARRAY_A );

		return is_array( $rows ) ? array_values( $rows ) : array();
	}

	/**
	 * A PENDING refund of this order matching an amount and currency (Codex J).
	 *
	 * The webhook correlation path. A gateway that settles a refund with a reference core never saw —
	 * because the response that carried it was lost — must not produce a SECOND refund row; matching
	 * the amount and currency of an outstanding reservation is what turns that event into the
	 * settlement of the refund it actually is.
	 *
	 * @param int    $order_id Order id.
	 * @param int    $amount   Amount in minor units.
	 * @param string $currency ISO-4217 currency.
	 * @return array<string, mixed>|null
	 */
	public function findPendingRefundMatching( int $order_id, int $amount, string $currency ): ?array {
		$sql = 'SELECT * FROM ' . $this->table() . ' WHERE order_id = %d AND kind = %s AND status = %s'
			. ' AND amount_minor = %d AND UPPER(currency) = %s ORDER BY id ASC LIMIT 1';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		$row = $this->wpdb->get_row( $this->wpdb->prepare( $sql, $order_id, self::KIND_REFUND, self::STATUS_PENDING, $amount, strtoupper( $currency ) ), ARRAY_A );

		return is_array( $row ) ? $row : null;
	}

	/**
	 * Count and record one reconcile attempt on a pending refund (Codex J).
	 *
	 * Stored in `meta`, which is otherwise unused on a refund row and is cleared by every terminal
	 * transition — so the counter cannot outlive the attempt it belongs to.
	 *
	 * @param int $id Transaction id.
	 * @return int The attempt number this call represents (1-based).
	 * @throws StorageException When the update fails.
	 */
	public function bumpReconcileAttempts( int $id ): int {
		$row      = $this->find( $id );
		$meta     = is_array( $row ) ? json_decode( (string) ( $row['meta'] ?? '' ), true ) : null;
		$attempts = is_array( $meta ) ? (int) ( $meta['reconcile_attempts'] ?? 0 ) : 0;
		++$attempts;

		$sql = 'UPDATE ' . $this->table() . ' SET meta = %s, updated_at = %s WHERE id = %d AND status = %s';

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; every value bound via prepare(); compare-and-swap on the pending row. The sniff cannot follow a multi-line prepare() call.
		$affected = $this->wpdb->query(
			$this->wpdb->prepare(
				$sql,
				(string) wp_json_encode( array( 'reconcile_attempts' => $attempts ) ),
				$this->clock->nowSql(),
				$id,
				self::STATUS_PENDING
			)
		);
		// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		if ( false === $affected ) {
			throw StorageException::fromSqlError( esc_html( 'payment refund reconcile counter' ), esc_html( (string) $this->wpdb->last_error ) );
		}

		return $attempts;
	}

	/**
	 * A refund row by its gateway reference, whatever its status (Codex #6/#7 idempotency).
	 *
	 * @param string $gateway    Module code.
	 * @param string $refund_ref Gateway refund reference.
	 * @return array<string, mixed>|null
	 */
	public function findRefundByRef( string $gateway, string $refund_ref ): ?array {
		if ( '' === $refund_ref ) {
			return null;
		}

		// TWO SHAPES, AND THE SECOND TERM IS DELIBERATELY NARROW (D-R40d, QA run 2 BUG-5). Since
		// D-R40d a refund row stores the REFUND id in `gateway_ref` and the originating charge's
		// reference in `payment_ref`, which is what rest-contract §2.21 documents. Rows written
		// before that carry the refund id in `payment_ref` with `gateway_ref` empty, and they must
		// keep resolving — so the legacy leg is admitted ONLY for rows whose `gateway_ref` is empty.
		// Without that guard the lookup would also match a NEW refund row by the charge reference it
		// now stores, and `resolveOrder()` asks this question with exactly that value.
		$sql = 'SELECT * FROM ' . $this->table() . ' WHERE gateway = %s AND kind = %s'
			. " AND ( gateway_ref = %s OR ( gateway_ref = '' AND payment_ref = %s ) ) ORDER BY id DESC LIMIT 1";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		$row = $this->wpdb->get_row( $this->wpdb->prepare( $sql, $gateway, self::KIND_REFUND, $refund_ref, $refund_ref ), ARRAY_A );

		return is_array( $row ) ? $row : null;
	}

	/**
	 * The next 1-based sequence number for an order + kind, used to build the idempotency key.
	 *
	 * @param int    $order_id Order id.
	 * @param string $kind     `charge` or `refund`.
	 */
	public function nextSequence( int $order_id, string $kind ): int {
		$sql = 'SELECT COUNT(*) FROM ' . $this->table() . ' WHERE order_id = %d AND kind = %s';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		return 1 + (int) $this->wpdb->get_var( $this->wpdb->prepare( $sql, $order_id, $kind ) );
	}

	/**
	 * Resolve an attempt from a gateway-side reference.
	 *
	 * Scoped to the gateway as well as the reference, so one module's ids can never resolve another
	 * module's row — the confirm route takes both from an unauthenticated request.
	 *
	 * @param string $gateway     Module code.
	 * @param string $gateway_ref Gateway-side reference.
	 * @return array<string, mixed>|null
	 */
	public function findByGatewayRef( string $gateway, string $gateway_ref ): ?array {
		if ( '' === $gateway_ref ) {
			return null;
		}
		$sql = 'SELECT * FROM ' . $this->table() . ' WHERE gateway = %s AND gateway_ref = %s ORDER BY id DESC LIMIT 1';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		$row = $this->wpdb->get_row( $this->wpdb->prepare( $sql, $gateway, $gateway_ref ), ARRAY_A );

		return is_array( $row ) ? $row : null;
	}

	/**
	 * Resolve an attempt from a gateway PAYMENT reference (the id a refund webhook carries).
	 *
	 * @param string $gateway     Module code.
	 * @param string $payment_ref Gateway payment reference.
	 * @return array<string, mixed>|null
	 */
	public function findByPaymentRef( string $gateway, string $payment_ref ): ?array {
		if ( '' === $payment_ref ) {
			return null;
		}
		$sql = 'SELECT * FROM ' . $this->table() . ' WHERE gateway = %s AND payment_ref = %s AND kind = %s ORDER BY id DESC LIMIT 1';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		$row = $this->wpdb->get_row( $this->wpdb->prepare( $sql, $gateway, $payment_ref, self::KIND_CHARGE ), ARRAY_A );

		return is_array( $row ) ? $row : null;
	}

	/**
	 * Whether a settled refund already exists for a gateway refund reference (webhook idempotency).
	 *
	 * @param string $gateway    Module code.
	 * @param string $refund_ref Gateway refund reference.
	 */
	public function hasRefundRef( string $gateway, string $refund_ref ): bool {
		if ( '' === $refund_ref ) {
			return false;
		}
		// Both stored shapes, on the same narrow terms as {@see self::findRefundByRef()} (D-R40d).
		$sql = 'SELECT COUNT(*) FROM ' . $this->table() . ' WHERE gateway = %s AND kind = %s'
			. " AND ( gateway_ref = %s OR ( gateway_ref = '' AND payment_ref = %s ) )";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		return (int) $this->wpdb->get_var( $this->wpdb->prepare( $sql, $gateway, self::KIND_REFUND, $refund_ref, $refund_ref ) ) > 0;
	}

	/**
	 * The browser-facing client parameters stored on an in-flight attempt.
	 *
	 * @param array<string, mixed> $row Transaction row.
	 * @return array<string, string>
	 */
	/**
	 * Keys of `client_params` that are DURABLE — kept on the row after settlement (D-R39c, Codex A.3).
	 *
	 * `client_params` as a whole is in-flight browser material and is wiped the moment a transaction
	 * leaves `pending` (privacy-inventory). A very small subset is not: it describes WHICH ACCOUNT
	 * the money went to, and that fact has to outlive the payment, because a refund months later has
	 * to be refused when the site has since switched environments. `mode` is the only member, and it
	 * is a two-value flag — no secret, no reference, nothing customer-shaped.
	 *
	 * Core keeps the list rather than the driver, because core owns the row; a driver opts in simply
	 * by naming the key in its `client_params`.
	 *
	 * @var list<string>
	 */
	public const DURABLE_META_KEYS = array( 'mode' );

	/**
	 * The `meta` payload for an in-flight attempt: the browser parameters, plus a copy of the durable
	 * keys at the top level so settlement can keep them without parsing what it is about to delete.
	 *
	 * @param array<string, string> $client_params Parameters the driver handed the browser.
	 * @return array<string, mixed>
	 */
	private static function metaFor( array $client_params ): array {
		$meta = array( 'client_params' => $client_params );
		foreach ( self::DURABLE_META_KEYS as $key ) {
			if ( isset( $client_params[ $key ] ) && is_scalar( $client_params[ $key ] ) ) {
				$meta[ $key ] = (string) $client_params[ $key ];
			}
		}

		return $meta;
	}

	/**
	 * One durable meta value off a stored row, or `''`.
	 *
	 * @param array<string, mixed>|null $row Transaction row.
	 * @param string                    $key One of {@see self::DURABLE_META_KEYS}.
	 */
	public static function durableMeta( ?array $row, string $key ): string {
		if ( ! is_array( $row ) || ! in_array( $key, self::DURABLE_META_KEYS, true ) ) {
			return '';
		}
		$meta = json_decode( (string) ( $row['meta'] ?? '' ), true );

		return is_array( $meta ) && isset( $meta[ $key ] ) && is_scalar( $meta[ $key ] ) ? (string) $meta[ $key ] : '';
	}

	/**
	 * The `meta` a settled row keeps: the durable keys and nothing else, or NULL when there are none.
	 *
	 * @param int $id Transaction id.
	 */
	private function retainedMeta( int $id ): ?string {
		$sql = 'SELECT meta FROM ' . $this->table() . ' WHERE id = %d';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; the id is bound via prepare().
		$raw = $this->wpdb->get_var( $this->wpdb->prepare( $sql, $id ) );

		return self::durableSubset( (string) $raw );
	}

	/**
	 * The durable keys of a stored `meta`, re-encoded — or NULL when it holds none (D-R39c, D-R40g).
	 *
	 * Shared by the two writes that RETIRE browser-facing parameters while keeping the record of
	 * which account the money went to: settlement ({@see self::markSucceeded()}) and the hold-close
	 * sweep ({@see self::clearClientParams()}). They must agree, and the reason is a merge hazard
	 * worth naming: the sweep runs in the SAME transaction as `markSucceeded()` on the paid path, so
	 * a sweep that wrote a bare `meta = NULL` would erase the `mode` settlement had just gone to
	 * trouble to keep, and a cross-mode refund months later would be back to asking the gateway with
	 * a key that cannot answer.
	 *
	 * @param string $raw Stored `meta` JSON.
	 */
	private static function durableSubset( string $raw ): ?string {
		$meta = json_decode( $raw, true );
		if ( ! is_array( $meta ) ) {
			return null;
		}

		$kept = array();
		foreach ( self::DURABLE_META_KEYS as $key ) {
			if ( isset( $meta[ $key ] ) && is_scalar( $meta[ $key ] ) ) {
				$kept[ $key ] = (string) $meta[ $key ];
			}
		}

		return array() === $kept ? null : (string) wp_json_encode( $kept );
	}

	/**
	 * The browser-facing parameters stored on an in-flight attempt, or `[]`.
	 *
	 * @param array<string, mixed> $row Transaction row.
	 * @return array<string, string>
	 */
	public static function clientParams( array $row ): array {
		$meta = json_decode( (string) ( $row['meta'] ?? '' ), true );
		if ( ! is_array( $meta ) || ! is_array( $meta['client_params'] ?? null ) ) {
			return array();
		}

		$out = array();
		foreach ( $meta['client_params'] as $key => $value ) {
			if ( is_scalar( $value ) ) {
				$out[ (string) $key ] = (string) $value;
			}
		}

		return $out;
	}

	/**
	 * Delete every transaction attached to a booking (hard-delete cascade).
	 *
	 * @param int $booking_id Booking id.
	 * @throws StorageException When the delete fails.
	 */
	public function deleteForBooking( int $booking_id ): void {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Cascade delete for an admin hard delete.
		$result = $this->wpdb->delete( $this->table(), array( 'booking_id' => $booking_id ), array( '%d' ) );
		if ( false === $result ) {
			throw StorageException::fromSqlError( esc_html( 'payment transactions delete' ), esc_html( (string) $this->wpdb->last_error ) );
		}
	}
}

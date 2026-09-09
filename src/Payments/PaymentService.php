<?php
/**
 * Order payment state machine (D-R38).
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

use Aponto\Availability\BlockingPolicy;
use Aponto\Booking\Booking;
use Aponto\Booking\BookingStatusService;
use Aponto\Booking\Repository\ActivityRepository;
use Aponto\Booking\Repository\BookingMetaRepository;
use Aponto\Booking\Repository\BookingRepository;
use Aponto\Booking\Repository\OrderRepository;
use Aponto\Booking\StaffLockFactory;
use Aponto\Database\Lock;
use Aponto\Database\StorageException;
use Aponto\Database\TransactionGuard;
use Aponto\Notification\NotificationDispatcher;
use Aponto\Support\Clock;
use Aponto\Support\DomainException;
use Aponto\Support\Logger;
use Aponto\Support\Settings;
use WP_Error;

/**
 * The one place an order's `payment_status` changes, and the one place a payment turns into a
 * booking status change.
 *
 * ### The shape every mutation follows (the STRUCTURAL RULE)
 *
 *   take the per-order lock → re-read the order/row INSIDE the lock → write a DURABLE CLAIMED state
 *   by compare-and-swap → release the lock → do the gateway HTTP → re-take the lock → re-read →
 *   compare-and-swap the result, or compensate when the decision went stale → release
 *
 * The first cut of this class held the lock across the gateway call. It worked, and it was wrong for
 * two reasons the adversarial review named: a 3-second lock timeout against a gateway that can take
 * 30 makes every concurrent leg answer `503` on exactly the day the gateway is slow, and holding a
 * lock across an uncontrolled remote timeout is the hazard D-R34(a) settled for calendars — where a
 * wrong answer costs a slot, and here it costs money. So the network work happens with NO lock held,
 * and what makes that safe is that the intent to do it is DURABLE before the call and re-checked
 * after it: a claimed row (`pending` charge, `voiding` charge, `pending` refund) is the record that
 * survives a crash mid-call, and every write that follows the call is a compare-and-swap on the
 * state the caller expected to find.
 *
 * ### Why the caller's snapshot is never trusted
 *
 * Every entry point re-reads under the lock before deciding, and every write is a compare-and-swap
 * on the status it expects. That is D-R34f as code: a value read at one moment and acted on at
 * another is only usable if the action re-checks the read. Here the consequence of getting it wrong
 * is not a stale cache but a double refund, or a slot released out from under a customer who has
 * just paid for it.
 *
 * ### Connection identity (E1)
 *
 * An advisory lock dies with its connection, and wpdb silently RECONNECTS on "server has gone away"
 * — after which the critical section believes it holds a lock that is gone. Every section therefore
 * re-verifies `$lock->connectionId()` against {@see TransactionGuard::currentConnectionId()} before
 * its first write and again immediately before COMMIT, exactly as `ReservationService` and
 * `ProjectionLease` do. A mismatch throws the retryable {@see PaymentLockTimeout} and never
 * continues.
 *
 * ### The booking transition
 *
 * `BookingStatusService` opens its own transaction and `TransactionGuard` fail-closes on an ambient
 * one (R3-3), so a transition runs AFTER our commit and still inside the lock — the window where the
 * payment is durable and no other payment actor can interleave.
 */
final class PaymentService {

	/**
	 * Seconds to wait for a per-order lock before giving up.
	 *
	 * Stays at 3 s. With the gateway HTTP moved OUTSIDE the lock (the structural rule above) the
	 * critical sections are pure database work measured in milliseconds, so a concurrent leg no
	 * longer waits behind a slow gateway and no longer needs a longer timeout to avoid a false 503.
	 */
	private const LOCK_TIMEOUT = 3;

	/**
	 * Inline HTTP budget for a driver call made on a visitor-facing request, in seconds.
	 */
	private const INLINE_BUDGET = 8;

	/**
	 * HTTP budget for a driver call made from cron, in seconds.
	 */
	private const CRON_BUDGET = 20;

	/**
	 * Grace after a hold expires before the slot is released (D-R38g).
	 */
	private const EXPIRY_GRACE_MINUTES = 5;

	/**
	 * How long a `void` may keep failing before the site OWNER is told, in hours (D-R40c).
	 *
	 * **This is an escalation threshold, not a release deadline** — and that distinction is the whole
	 * of the verify round's fourth `P1`. D-R40b released the hold past this bound, reasoning that an
	 * approved-but-uncaptured attempt is dead at every gateway by then. The reasoning is
	 * plausible and the conclusion is not available to us: elapsed time is not evidence about a
	 * REMOTE fact. A capture that settled seconds before the deadline, followed by six hours of an
	 * unreachable gateway, looks exactly the same from here as an abandoned checkout — and releasing
	 * there cancels a booking somebody paid for and resells the slot, which is the one outcome this
	 * whole subsystem exists to prevent. Nothing in either gateway's API proves a payment is dead
	 * because six hours passed.
	 *
	 * So the hold is KEPT while the answer is unknown, for as long as it stays unknown, and what
	 * happens at six hours is that a PERSON is brought in: one `void_unresolved` anomaly, one admin
	 * "payment needs review" message, and the order's retries drop to {@see self::VOID_RETRY_BACKOFF_HOURS}.
	 * The resolution is an admin cancelling the booking — which re-attempts the void and, if it still
	 * fails, proceeds anyway under `void_unresolved_admin_override`. A human deciding to give up on a
	 * payment is a different act from a timer doing it unattended, and only one of them can be told
	 * about the money.
	 */
	private const VOID_UNRESOLVED_GRACE_HOURS = 6;

	/**
	 * How often an ESCALATED order's `void` is retried afterwards, in hours (D-R40c).
	 *
	 * Before the escalation every tick retries, because the answer may still be seconds away. After
	 * it, the fact has been reported and a person owns it, so retrying every five minutes forever
	 * only spends HTTP against a gateway that is not answering — and each of those calls carries the
	 * tick's whole budget. Hourly still catches the credential that gets replaced or the outage that
	 * ends. The backed-off order does not occupy a slot in the tick's SELECT either (verify round 2):
	 * `OrderRepository::expiredHoldIds()` anti-joins the marker inside the query, because a batch
	 * whose whole width is orders it then skips is a batch that has stopped doing anything.
	 */
	private const VOID_RETRY_BACKOFF_HOURS = 1;

	/**
	 * How old an unpaid hold must be before it earns a reminder email (D-R38j).
	 */
	private const REMINDER_AFTER_MINUTES = 10;

	/**
	 * Maximum charge attempts per order (Codex #2).
	 *
	 * A crash between the gateway create and the local `markBegun` leaves a claimed row with no
	 * reference, and the customer must be able to try again rather than staring at "unavailable"
	 * until the hold expires. The bound is what stops a retry loop from creating intents forever;
	 * each abandoned one expires on the gateway's own schedule.
	 */
	private const MAX_CHARGE_ATTEMPTS = 3;

	/**
	 * How long the widget should wait before re-asking for a payment block that is still being
	 * created, in milliseconds (Codex B).
	 */
	private const BEGIN_RETRY_AFTER_MS = 1500;

	/**
	 * Fail-closed transaction control + connection identity.
	 *
	 * @var TransactionGuard
	 */
	private TransactionGuard $tx;

	/**
	 * Construct the service.
	 *
	 * @param \wpdb                  $wpdb          Database handle.
	 * @param Clock                  $clock         Clock.
	 * @param Settings               $settings      Core settings.
	 * @param OrderRepository        $orders        Order repository.
	 * @param TransactionRepository  $transactions  Payment ledger.
	 * @param PaymentDispatcher      $dispatcher    Driver dispatch.
	 * @param BookingRepository      $bookings      Booking repository.
	 * @param BookingStatusService   $status        Booking status write model.
	 * @param NotificationDispatcher $notifications Notification dispatcher.
	 * @param ActivityRepository     $activities    Activity log.
	 * @param BookingMetaRepository  $meta          Booking metadata (the reminder marker).
	 * @param StaffLockFactory       $locks         Lock factory (per-order locks).
	 * @param Logger|null            $logger        Structured logger for anomalies.
	 */
	public function __construct(
		private \wpdb $wpdb,
		private Clock $clock,
		private Settings $settings,
		private OrderRepository $orders,
		private TransactionRepository $transactions,
		private PaymentDispatcher $dispatcher,
		private BookingRepository $bookings,
		private BookingStatusService $status,
		private NotificationDispatcher $notifications,
		private ActivityRepository $activities,
		private BookingMetaRepository $meta,
		private StaffLockFactory $locks,
		private ?Logger $logger = null
	) {
		$this->tx = new TransactionGuard( $wpdb );
	}

	// -- Settings ------------------------------------------------------------------------------

	/**
	 * The site's payment mode: `off`, `optional` or `required`.
	 */
	public function mode(): string {
		return (string) $this->settings->get( 'payments.mode' );
	}

	/**
	 * Whether the site can actually take an online payment right now (Codex #1).
	 *
	 * Keyed on OFFERED codes, not merely active ones: a shipped, enabled module whose driver is not
	 * configured cannot charge anybody, and offering it produces a booking form that fails at its
	 * last step. A site in `required` mode with nothing offered therefore behaves exactly like `off`
	 * — refusing every booking because no gateway is set up would take the site's bookings down.
	 */
	public function enabled(): bool {
		return 'off' !== $this->mode() && array() !== PaymentRegistry::offeredCodes();
	}

	/**
	 * Configured hold length in minutes.
	 */
	public function holdMinutes(): int {
		return (int) $this->settings->get( 'payments.hold_minutes' );
	}

	/**
	 * The deadline a hold created now would carry.
	 */
	public function holdDeadline(): \DateTimeImmutable {
		return $this->clock->now()->add( new \DateInterval( 'PT' . max( 1, $this->holdMinutes() ) . 'M' ) );
	}

	/**
	 * Whether a paid booking should confirm itself (founder Q5).
	 */
	public function autoConfirms(): bool {
		return (bool) $this->settings->get( 'payments.auto_confirm' );
	}

	// -- Initiation ----------------------------------------------------------------------------

	/**
	 * Can this booking still be PAID, and by which gateway (D-R38, resume path)?
	 *
	 * The "complete your payment" email is the only thing standing between an abandoned checkout and
	 * a lost booking, and until now it had nowhere to send anyone: the widget could only resume a
	 * hold from `sessionStorage`, i.e. only in the tab that created it. This is the question the
	 * public resume route has to answer before it does anything else, and it is deliberately a
	 * READ: it decides eligibility, it does not begin anything. {@see self::beginPayment()} is still
	 * the one place an attempt is claimed, so the resume path inherits every rule that already holds
	 * there — reuse an in-flight intent, bounded attempts, no HTTP inside the lock.
	 *
	 * A hold is resumable only while it is BOTH unpaid and unexpired. Both halves matter and they
	 * fail differently: an order that has been paid must never be offered a second payment, and one
	 * whose deadline has passed has already had its slot released (or is about to), so sending the
	 * customer to a payment form would take money for an appointment that no longer exists. The
	 * caller gets the real `payment_status` back either way, because "you have already paid" and
	 * "that hold expired — book again" are different things to tell somebody.
	 *
	 * @param int $booking_id Booking id.
	 * @return array{ok: bool, payment_status: string, gateway: string, expires_at: ?string, order: array<string, mixed>|null}
	 */
	public function resumableHold( int $booking_id ): array {
		$order  = $this->orders->findForBooking( $booking_id );
		$status = null === $order ? 'none' : (string) $order['payment_status'];
		$expiry = null === $order ? null : $this->holdExpiry( $order );
		$live   = 'pending' === $status
			&& null !== $expiry
			&& $expiry->getTimestamp() > $this->clock->now()->getTimestamp();

		// The gateway that already owns this hold, or — for a hold whose first attempt never got
		// far enough to record one — whatever the site offers now. Never a gateway the site has
		// since switched off: `isOffered()` is the same predicate the booking route uses, so a
		// resume can never advertise a method that would fail at the last step.
		$gateway = null === $order ? '' : (string) ( $order['gateway'] ?? '' );
		if ( '' === $gateway ) {
			$offered = PaymentRegistry::offeredCodes();
			$gateway = $offered[0] ?? '';
		}

		return array(
			'ok'             => $live && '' !== $gateway && PaymentRegistry::isOffered( $gateway ),
			'payment_status' => $status,
			'gateway'        => $gateway,
			'expires_at'     => $this->iso( $expiry ),
			'order'          => $order,
		);
	}

	/**
	 * Release ONE hold whose deadline has already passed, on demand (D-R40h, QA run 2 FINDING-4).
	 *
	 * `aponto_payments_tick` owns hold expiry, and it runs on WP-Cron — which on a quiet site can be
	 * minutes away. Until it does, a hold past its deadline is refused by {@see self::resumableHold()}
	 * while the slot it holds is still held, so the resume screen told the customer "the slot was
	 * released… book again" and the booking they were sent back to make was unavailable. This is the
	 * SAME per-order routine the tick uses, called for the one order the customer is looking at, so
	 * the sentence is true by the time it is read.
	 *
	 * Deliberately the tick's exact arguments — void before cancel, the `voiding` claim rules of
	 * D-R38b, the same activity action and system actor — because a second release path with its own
	 * opinions about money is precisely what D-R38 exists to prevent. The tick's GRACE is not applied
	 * here: the grace exists so an unattended timer does not race a confirm that is still arriving,
	 * and the live-capture claim already refuses this call while one is on the network. This caller is
	 * the customer, holding the link, being told the window closed.
	 *
	 * Every refusal is the caller's to absorb: a live capture claim throws {@see PaymentException},
	 * a contended lock {@see PaymentLockTimeout}, and both mean "somebody else is finishing this" —
	 * the honest answer then is the refusal the route was about to give anyway.
	 *
	 * @param int $booking_id Booking id.
	 * @return bool Whether a hold was released by THIS call.
	 * @throws PaymentException   `aponto_payment_state` when a capture is on the network.
	 * @throws PaymentLockTimeout When the per-order lock cannot be taken.
	 */
	public function expireHoldNow( int $booking_id ): bool {
		$order = $this->orders->findForBooking( $booking_id );
		if ( null === $order || 'pending' !== (string) $order['payment_status'] ) {
			return false;
		}

		$expiry = $this->holdExpiry( $order );
		if ( null === $expiry || $expiry->getTimestamp() > $this->clock->now()->getTimestamp() ) {
			return false;
		}

		return $this->releaseHold( (int) $order['id'], 'hold_expired', 'expired', 'payment_hold_expired', 'system', true );
	}

	/**
	 * Give the browser something to pay with: reuse the live intent, or create one (D-R38b/c).
	 *
	 * ONE entry point for both the original request and its replay (Codex #2). Two separate methods
	 * meant a fresh request racing a replay could create two intents for one hold, and it meant a
	 * replay after a crashed create was stuck reporting `unavailable` until the hold expired even
	 * though the customer was sitting there able to pay.
	 *
	 * The shape is the structural rule:
	 *
	 *   1. lock → re-read the order and its in-flight charge. A usable intent (a row with a
	 *      `gateway_ref`) is returned as-is. Otherwise ABANDON the unusable row and insert a fresh
	 *      claimed one — the durable intent — then release.
	 *   2. no lock held: call the gateway.
	 *   3. lock → re-read. If the row or the order moved meanwhile (the hold expired, the customer
	 *      cancelled, another leg paid) the just-created gateway intent is orphaned deliberately and
	 *      voided best-effort; otherwise compare-and-swap the reference onto the row and CHECK that
	 *      the swap took.
	 *
	 * A driver failure does NOT roll the booking back: the hold is alive, the customer can retry, and
	 * the expiry cron cleans up if nobody does.
	 *
	 * @param Booking $booking                Committed booking.
	 * @param string  $gateway                Payment module code.
	 * @param bool    $propagate_lock_timeout Whether a contended per-order lock may surface as the
	 *                                        contract's retryable `503` instead of an `unavailable`
	 *                                        block (the resume route; never the create route).
	 * @return array<string, mixed> The `payment` response block (rest-contract §3.3).
	 * @throws PaymentLockTimeout When the lock is contended and the caller asked to hear about it.
	 */
	public function beginPayment( Booking $booking, string $gateway, bool $propagate_lock_timeout = false ): array {
		$order_id = (int) $booking->order_id;
		if ( $order_id <= 0 || ! PaymentRegistry::isOffered( $gateway ) ) {
			return $this->unavailableBlock( $gateway, $order_id );
		}

		// Arm the tick BEFORE the gateway call: the hold is already durable, and a request that dies
		// inside the call must still leave a scheduled event that will release the slot.
		PaymentCron::arm();

		try {
			$claim = $this->claimChargeAttempt( $order_id, $booking->id, $gateway );
		} catch ( PaymentLockTimeout $failure ) {
			// A CONTENDED LOCK IS RETRYABLE, AND WHO ASKED DECIDES WHETHER IT MAY SAY SO (D-R39c,
			// Codex A.8). On the RESUME route nothing has been committed, so the honest answer is the
			// contract's `503 aponto_lock_timeout` — a `200 unavailable` there tells a customer their
			// gateway is broken when the truth is "two tabs, try again in a second". On the CREATE
			// route a booking has ALREADY been committed post-commit, and turning that into a 503
			// would lose the confirmation for a booking that exists; there the block stays.
			if ( $propagate_lock_timeout ) {
				throw $failure;
			}

			return $this->unavailableBlock( $gateway, $order_id );
		} catch ( StorageException $failure ) {
			unset( $failure );

			return $this->unavailableBlock( $gateway, $order_id );
		}

		if ( isset( $claim['expired'] ) ) {
			// Nothing to retry: the slot is gone or going. `retryable` false stops the widget
			// offering another attempt, and the code tells it to say so rather than "gateway
			// unavailable".
			return $this->unavailableBlock( $gateway, $order_id, false, 'hold_expired' );
		}

		if ( isset( $claim['reuse'] ) ) {
			return $claim['reuse'];
		}
		if ( ! isset( $claim['txn_id'] ) ) {
			return $this->unavailableBlock( $gateway, $order_id );
		}

		$order  = $claim['order'];
		$txn_id = (int) $claim['txn_id'];
		$key    = (string) $claim['key'];

		// ---- No lock held from here: the gateway call is outside the critical section. ----
		$result = $this->dispatcher->begin(
			new PaymentBeginRequest(
				$gateway,
				$order_id,
				(string) $order['code'],
				$booking->id,
				(int) $order['total_minor'],
				(string) $order['currency'],
				$this->customerEmail( $booking->customer_id ),
				$this->serviceName( $booking->service_id ),
				$this->holdExpiry( $order ) ?? $this->holdDeadline(),
				(string) get_locale()
			),
			$this->context( $key, 'begin', true )
		);

		if ( $result instanceof WP_Error ) {
			// A VERIFICATION THAT COULD NOT BE REACHED IS NOT A FAILED ATTEMPT (D-R40e, verify B.2).
			// The driver created the remote object and then could not READ IT BACK — a transport
			// failure of the confirming GET. Retiring the row there would spend one of three attempts
			// on nothing and, worse, send the next attempt out under a NEW sequence and a new key,
			// which is how one hold acquires a second live intent. The claim therefore stays alive
			// with its key untouched; the retry reuses the row, replays the same key, and the
			// provider answers with the object it already created.
			if ( self::isVerificationUnavailable( $result ) ) {
				$this->holdForVerification( $txn_id, (string) $claim['lease'] );

				return $this->unavailableBlock( $gateway, $order_id );
			}

			// THE DRIVER'S OWN REASON SURVIVES ONTO THE ROW (D-R40d, QA run 2 BUG-3). Every begin
			// failure used to be stored as the bare `begin_failed`, so a DETERMINISTIC refusal — an
			// amount the gateway's currency has no minor unit for, a currency it does not take —
			// looked exactly like a timeout: the customer was invited to retry an attempt that can
			// never succeed, and the operator had nothing to look at anywhere in the system.
			$refusal   = self::refusalCode( $result );
			$deterrent = '' !== $refusal;
			$this->safeFailFenced( $txn_id, $deterrent ? $refusal : 'begin_failed', (string) $claim['lease'] );

			if ( $deterrent ) {
				// Operator-side, on the two surfaces that CAN name one order: the anomaly log and the
				// booking's own activity feed. The module `status` block cannot carry this — readiness
				// is asked without an order, and the price that cannot be charged belongs to one.
				$this->anomaly( $gateway, $order_id, $refusal );
				$this->logBeginRefusal( $booking->id, $gateway, $refusal, (int) $order['total_minor'], (string) $order['currency'] );
			}

			return $this->unavailableBlock( $gateway, $order_id, ! $deterrent );
		}

		return $this->settleChargeAttempt( $order_id, $gateway, $txn_id, $key, $result, (string) $claim['lease'] );
	}

	/**
	 * Phase 1 of {@see self::beginPayment()}: under the lock, reuse or claim an attempt.
	 *
	 * @param int    $order_id   Order id.
	 * @param int    $booking_id Booking id.
	 * @param string $gateway    Module code.
	 * @return array{expired?: bool, reuse?: array<string, mixed>, txn_id?: int, key?: string, lease?: string, order?: array<string, mixed>}
	 * @throws PaymentLockTimeout When the lock cannot be taken or its connection identity is lost.
	 * @throws StorageException When a durable write in the critical section fails.
	 */
	private function claimChargeAttempt( int $order_id, int $booking_id, string $gateway ): array {
		$lock = $this->acquire( $order_id );

		try {
			$order = $this->orders->find( $order_id );
			if ( null === $order || 'pending' !== (string) $order['payment_status'] ) {
				return array();
			}

			// THE DEADLINE IS RE-READ UNDER THE LOCK (D-R39c, Codex A.1). `payment_status = pending`
			// stays true for the whole gap between the deadline and the tick that acts on it, so a
			// resume link opened in that gap — or a replay of the original request — used to mint a
			// fresh intent for a slot that was already being given away. Nothing is released here;
			// the cron still owns that. This only refuses to START anything on a finished hold.
			if ( ! $this->holdIsLive( $order_id, $order ) ) {
				return array( 'expired' => true );
			}

			$charge = $this->transactions->pendingCharge( $order_id );
			if ( is_array( $charge ) && '' !== (string) $charge['gateway_ref'] ) {
				// A usable intent already exists — the replay case, and also a second tab.
				return array(
					'reuse' => array(
						'gateway'       => (string) $charge['gateway'],
						'status'        => 'begin',
						'gateway_ref'   => (string) $charge['gateway_ref'],
						'client_params' => self::paramsBlock( TransactionRepository::clientParams( $charge ) ),
						'expires_at'    => $this->iso( $this->holdExpiry( $order ) ),
					),
				);
			}

			// A CLAIM PARKED BY AN UNREACHABLE VERIFICATION IS REUSED, KEY AND ALL (D-R40e, verify
			// B.2). It is the one claim with no reference whose remote object is known to EXIST: the
			// create succeeded and only the confirming read did not. Minting a fresh sequence for it
			// would put a second live object on the gateway for one hold and spend an attempt on a
			// call that has already been made — so this attempt continues under the row's stored key
			// and the provider replays the object rather than creating one. The mark is cleared by
			// the takeover, so a request arriving while THIS one is on the network sees an ordinary
			// fresh claim and is told to wait, exactly as below.
			if ( is_array( $charge )
				&& '' === (string) $charge['gateway_ref']
				&& TransactionRepository::VERIFICATION_UNAVAILABLE === (string) $charge['failure_code'] ) {
				$this->assertLockIntact( $lock );
				if ( $this->transactions->reclaimForVerification( (int) $charge['id'] ) ) {
					$reclaimed = $this->transactions->find( (int) $charge['id'] );

					return array(
						'txn_id' => (int) $charge['id'],
						'key'    => (string) $charge['idempotency_key'],
						'order'  => $order,
						'lease'  => is_array( $reclaimed ) ? (string) $reclaimed['updated_at'] : '',
					);
				}
			}

			// A claim with NO reference and a FRESH lease is not wreckage — it is another request
			// still inside its gateway call (Codex B). Retiring it here and starting a new attempt is
			// how ONE hold ends up with TWO remote intents: the first request's `markBegun` then fails
			// its CAS and voids, but for a moment the gateway holds two live intents for one booking,
			// and a customer with two tabs can pay the wrong one. The honest answer is "wait" — the
			// widget re-asks after `retry_after_ms` and gets the reference the other request stored.
			if ( is_array( $charge ) && $this->transactions->isClaimFresh( $charge, $this->clock->now() ) ) {
				return array(
					'reuse' => array(
						'gateway'        => (string) $charge['gateway'],
						'status'         => 'pending',
						'gateway_ref'    => '',
						'client_params'  => (object) array(),
						'expires_at'     => $this->iso( $this->holdExpiry( $order ) ),
						'retry_after_ms' => self::BEGIN_RETRY_AFTER_MS,
					),
				);
			}

			if ( $this->transactions->chargeAttempts( $order_id ) >= self::MAX_CHARGE_ATTEMPTS ) {
				return array();
			}

			$this->assertLockIntact( $lock );

			// A claim with no reference whose lease has EXPIRED is the fingerprint of a request that
			// died between the gateway create and the local write. It cannot be reused (nobody knows
			// what it refers to) and it must not block the next attempt, so it is retired — fenced on
			// the exact lease we just read, so a request that came back to life in the meantime keeps
			// its row. Its orphaned gateway intent expires on the gateway's own schedule.
			if ( is_array( $charge ) ) {
				$this->safeFailFenced( (int) $charge['id'], 'begin_abandoned', (string) $charge['updated_at'] );
			}

			$sequence = $this->transactions->nextSequence( $order_id, TransactionRepository::KIND_CHARGE );
			$key      = PaymentRegistry::idempotencyKey( $order_id, TransactionRepository::KIND_CHARGE, $sequence );
			$txn_id   = $this->transactions->insertPending(
				$order_id,
				$booking_id,
				$gateway,
				TransactionRepository::KIND_CHARGE,
				(int) $order['total_minor'],
				(string) $order['currency'],
				$key,
				$this->holdExpiry( $order )
			);

			$this->assertLockIntact( $lock );

			$created = $this->transactions->find( $txn_id );

			return array(
				'txn_id' => $txn_id,
				'key'    => $key,
				'order'  => $order,
				// The lease this attempt owns, so every write made outside the lock below can fence
				// on it rather than on status alone (Codex D).
				'lease'  => is_array( $created ) ? (string) $created['updated_at'] : '',
			);
		} finally {
			$lock->release();
		}
	}

	/**
	 * Phase 3 of {@see self::beginPayment()}: re-take the lock and commit the reference, or discard.
	 *
	 * @param int                $order_id Order id.
	 * @param string             $gateway  Module code.
	 * @param int                $txn_id   Claimed charge row.
	 * @param string             $key      Idempotency key of the attempt.
	 * @param PaymentBeginResult $result   What the gateway created.
	 * @param string             $lease    The claim's `updated_at`, for the out-of-lock CAS (Codex D).
	 * @return array<string, mixed> The `payment` response block.
	 */
	private function settleChargeAttempt( int $order_id, string $gateway, int $txn_id, string $key, PaymentBeginResult $result, string $lease ): array {
		$stale   = false;
		$expired = false;

		try {
			$lock = $this->acquire( $order_id );
		} catch ( DomainException $failure ) {
			unset( $failure );
			// The lock could not be re-taken. The intent exists at the gateway and this side cannot
			// record it, so the row is retired and the customer retries; the orphan expires remotely.
			// FENCED (Codex D): this write happens with NO lock held, so it compare-and-swaps on the
			// lease this attempt was created with rather than on status alone.
			$this->safeFailFenced( $txn_id, 'begin_abandoned', $lease );
			$this->voidOrphan( $gateway, $result->gateway_ref, $order_id, 'begin_stale' );

			return $this->unavailableBlock( $gateway, $order_id );
		}

		try {
			$order = $this->orders->find( $order_id );
			$row   = $this->transactions->find( $txn_id );

			// The SAME predicate the claim used, asked again on the far side of the gateway call
			// (D-R39c, Codex A.1): a hold can cross its deadline while the intent is being created,
			// and publishing the reference then would hand the browser something to pay with for a
			// slot the next tick releases. `$expired` is tracked separately so the customer is told
			// which of the two things happened.
			$expired      = null !== $order && ! $this->holdIsLive( $order_id, $order );
			$still_wanted = null !== $order
				&& ! $expired
				&& 'pending' === (string) $order['payment_status']
				&& is_array( $row )
				&& TransactionRepository::STATUS_PENDING === (string) $row['status'];

			if ( $still_wanted ) {
				$this->assertLockIntact( $lock );
				// CHECKED (Codex #2): a compare-and-swap that touched no row means the state moved
				// between the read above and this write, and returning success on it would hand the
				// browser a reference this side does not consider live.
				$stale = ! $this->transactions->markBegun( $txn_id, $result->gateway_ref, $result->client_params, $result->expires_at );
				$this->assertLockIntact( $lock );
			} else {
				$stale = true;
			}

			if ( ! $stale ) {
				return array(
					'gateway'       => $gateway,
					'status'        => 'begin',
					'gateway_ref'   => $result->gateway_ref,
					'client_params' => self::paramsBlock( $result->client_params ),
					'expires_at'    => $this->iso( $this->holdExpiry( is_array( $order ) ? $order : array() ) ),
				);
			}

			// FENCED even though the lock is held (Codex D audit): the row was read at the top of this
			// section and this is the write that acts on that read, so it compare-and-swaps on the
			// attempt's own lease rather than on status alone.
			$this->assertLockIntact( $lock );
			$this->safeFailFenced( $txn_id, $expired ? 'hold_expired' : 'begin_stale', $lease );
		} catch ( StorageException $failure ) {
			unset( $failure );
			$stale = true;
		} finally {
			$lock->release();
		}

		// Outside the lock, per the structural rule: the just-created intent is not wanted, so it is
		// cancelled best-effort. A failure here costs an abandoned intent the gateway expires itself.
		$this->voidOrphan( $gateway, $result->gateway_ref, $order_id, $expired ? 'hold_expired' : 'begin_stale' );
		unset( $key );

		return $expired
			? $this->unavailableBlock( $gateway, $order_id, false, 'hold_expired' )
			: $this->unavailableBlock( $gateway, $order_id );
	}

	/**
	 * Best-effort cancellation of an intent this side decided not to keep.
	 *
	 * @param string $gateway     Module code.
	 * @param string $gateway_ref Reference to cancel.
	 * @param int    $order_id    Order id (for the log context).
	 * @param string $reason      Machine reason.
	 */
	private function voidOrphan( string $gateway, string $gateway_ref, int $order_id, string $reason ): void {
		if ( '' === $gateway_ref ) {
			return;
		}
		$this->dispatcher->void(
			new VoidRequest( $gateway, $gateway_ref, $this->orderCode( $order_id ), $reason ),
			$this->context( 'payments:' . $order_id . ':void:orphan', 'void', true ),
			$order_id
		);
	}

	// -- Confirmation legs ---------------------------------------------------------------------

	// phpcs:disable Squiz.Commenting.FunctionCommentThrowTag.WrongNumber -- The sniff counts SYNTACTIC `throw` statements. The lock-timeout and the post-ROLLBACK re-throw documented on this method are raised by `acquire()`/`assertLockIntact()` and by the transaction guard, which it cannot see — and they are exactly the exceptions a caller has to handle, so the tags stay and the count check is waived for this one method.
	/**
	 * The widget's confirmation leg (rest-contract §3.8): ask the GATEWAY what happened, then apply.
	 *
	 * Structural rule: the capture runs with NO lock held, and its outcome is applied under a fresh
	 * lock that re-reads the order — so a webhook that settled the same payment while the capture was
	 * in flight simply wins, and this leg's apply becomes a no-op.
	 *
	 * ### `hold_open` is SERIALIZED, not remembered (D-R40c)
	 *
	 * The first cut computed `hold_open` and dispatched, which left the answer true for the length of
	 * a gateway round trip during which the expiry cron, the customer's own cancel or an admin
	 * confirm could void the intent and give the slot back. The per-order lock further down protects
	 * the LEDGER; it never protected the charge itself. So the decision is now made UNDER the lock and
	 * made DURABLE in the same breath: the charge row is compare-and-swapped `pending → capturing`
	 * with a 300 s lease before the lock is released, every hold-release path refuses while that claim
	 * is live, and the claim is handed back under the lock that applies the outcome — after which
	 * everything downstream sees the ordinary `pending` row it has always seen.
	 *
	 * And the rule that falls out of it, which matters more than the mechanism: **when the hold is
	 * open and the claim cannot be taken, nothing is dispatched at all.** A capture that MOVES money
	 * may not run on a decision no one has serialized. A CLOSED hold still dispatches with
	 * `hold_open = false`, because there the money-moving driver refuses without any HTTP and the
	 * retrieve-shaped driver (Stripe) has a late payment that only this leg can record.
	 *
	 * ### A DECLINE DOES NOT END THE ATTEMPT; THE HOLD DOES (QA C1/D-R40)
	 *
	 * The customer who is refused and picks another funding source comes back HERE, on the same
	 * `{ref}`: a wallet's `instrument_declined` cure is a restart of the SAME approval, and an intent
	 * retired by a failure webhook is confirmed again on the same client secret. The claim therefore takes a `failed` row as readily as a `pending` one
	 * while the hold is open — and only while it is open, since a closed hold never reaches the
	 * claim at all. Anything else answers a paid customer with their old state and lets the hold
	 * expire under a payment that DID go through.
	 *
	 * @param string $gateway Payment module code.
	 * @param string $ref     Gateway-side reference from the widget.
	 * @return array<string, mixed>|null Response payload, or null for the uniform 404.
	 * @throws PaymentException   When the driver fails.
	 * @throws PaymentLockTimeout When a per-order lock cannot be taken, or its connection identity
	 *                            is lost mid-section (E1).
	 */
	public function confirm( string $gateway, string $ref ): ?array {
		// phpcs:enable Squiz.Commenting.FunctionCommentThrowTag.WrongNumber
		$charge = $this->transactions->findByGatewayRef( $gateway, $ref );
		if ( null === $charge || TransactionRepository::KIND_CHARGE !== (string) $charge['kind'] ) {
			// An unknown, foreign or refund-shaped reference is the SAME uniform 404 as an unknown
			// module: this route is public and must not confirm which references exist.
			return null;
		}

		$order_id = (int) $charge['order_id'];
		$txn_id   = (int) $charge['id'];
		$order    = $this->orders->find( $order_id );
		if ( null === $order ) {
			return null;
		}

		if ( in_array( (string) $order['payment_status'], array( 'paid', 'partial', 'refunded' ), true ) ) {
			return $this->stateFor( $order_id );
		}

		// ---- Phase 1: under the lock, decide and claim. ----
		$lease        = '';
		$claimed_from = TransactionRepository::STATUS_PENDING;
		$hold_open    = false;
		$lock         = $this->acquire( $order_id );
		try {
			$order = $this->orders->find( $order_id );
			if ( null === $order ) {
				return null;
			}
			if ( in_array( (string) $order['payment_status'], array( 'paid', 'partial', 'refunded' ), true ) ) {
				// Settled between the first read and the lock. Nothing to capture.
				return $this->stateFor( $order_id );
			}

			$hold_open = $this->holdIsOpen( $order_id, $order );
			if ( $hold_open ) {
				$this->assertLockIntact( $lock );
				// The state the claim is taken FROM, read under the same lock that takes it. A claim
				// from a RETIRED attempt is the retry flow (`TransactionRepository::claimForCapture()`)
				// and the row must go back to `failed` — not to `pending` — if the driver then answers
				// `WP_Error`, since a transport failure knows nothing about the decline that preceded
				// it. Only the no-outcome path uses this; an outcome always decides for itself.
				$live         = $this->transactions->find( $txn_id );
				$claimed_from = is_array( $live ) && TransactionRepository::STATUS_FAILED === (string) $live['status']
					? TransactionRepository::STATUS_FAILED
					: TransactionRepository::STATUS_PENDING;
				$lease        = $this->transactions->claimForCapture( $txn_id );
				if ( '' === $lease ) {
					// The row is not ours to capture: a void is already on the network for it, another
					// request is inside its own capture, or the attempt is retired. Answering the current
					// state is the honest reply — and the one that cannot charge for a slot somebody else
					// is in the middle of releasing.
					return $this->stateFor( $order_id );
				}
				$this->assertLockIntact( $lock );
			}
		} finally {
			$lock->release();
		}

		// ---- Phase 2: no lock held — the gateway call. ----
		$outcome = $this->dispatcher->capture(
			new CaptureRequest(
				$gateway,
				$ref,
				(int) $order['total_minor'],
				(string) $order['currency'],
				(string) $order['code'],
				$hold_open
			),
			$this->context( (string) $charge['idempotency_key'], 'capture', true ),
			$order_id
		);

		if ( $outcome instanceof WP_Error ) {
			if ( '' !== $lease ) {
				// The claim goes back BEFORE the exception does: leaving it standing would freeze every
				// hold-release path on this order for the whole lease over a request that is already
				// over. Best effort, and deliberately swallowing its own failures — the caller must
				// learn that the DRIVER failed, and a lock timeout on the way out would replace that
				// answer with a different one. An unreleased claim expires by itself.
				try {
					$release = $this->acquire( $order_id );
					try {
						$this->assertLockIntact( $release );
						$this->safeReleaseCaptureClaim( $txn_id, $lease, $claimed_from );
					} finally {
						$release->release();
					}
				} catch ( \Throwable $failure ) {
					unset( $failure );
				}
			}

			throw PaymentException::driverFailed();
		}

		// ---- Phase 3: under the lock again, hand the claim back and apply. ----
		$lock = $this->acquire( $order_id );
		try {
			if ( '' !== $lease ) {
				$this->assertLockIntact( $lock );
				$this->safeReleaseCaptureClaim( $txn_id, $lease );
			}
			$this->applyOutcome( $order_id, $gateway, $outcome, $txn_id, $lock );
		} finally {
			$lock->release();
		}

		return $this->stateFor( $order_id );
	}

	/**
	 * Apply one verified webhook event (rest-contract §3.9).
	 *
	 * The caller holds the event-ledger lease, so this runs at most once per event at a time — and,
	 * because a lease can be reclaimed after a crash, it is written to be safe to run again.
	 *
	 * @param string       $gateway Payment module code.
	 * @param WebhookEvent $event   Normalized event.
	 * @return array{status: string, order_id: int} Ledger status and the order it resolved to.
	 * @throws PaymentLockTimeout When the per-order lock cannot be taken.
	 * @throws StorageException When a durable write fails — including the CONTENDED case (an InnoDB
	 *                          deadlock or lock-wait timeout inside the apply's own transaction),
	 *                          which the route must answer `503` rather than `500` (D-R40d).
	 */
	public function applyEvent( string $gateway, WebhookEvent $event ): array {
		if ( $event->isIgnorable() ) {
			return $this->ledgerResult( 'skipped', 0 );
		}

		$order_id = $this->resolveOrder( $gateway, $event );
		if ( $order_id <= 0 ) {
			// An event for an order this site does not have is `ignored` and answered `200`: telling
			// a gateway to retry something that can never match is a retry loop with no end.
			return $this->ledgerResult( 'skipped', 0 );
		}

		$lock = $this->acquire( $order_id );

		try {
			switch ( $event->type ) {
				case WebhookEvent::PAYMENT_SUCCEEDED:
					$applied = $this->applyOutcome(
						$order_id,
						$gateway,
						new PaymentOutcome(
							PaymentOutcome::PAID,
							$event->amount_minor,
							$event->currency,
							$event->payment_ref,
							$event->gateway_ref,
							'',
							$event->occurred_at
						),
						0,
						$lock
					);

					return $this->ledgerResult( $applied, $order_id );

				case WebhookEvent::PAYMENT_FAILED:
				case WebhookEvent::SESSION_EXPIRED:
					// The charge row is resolved, but the HOLD is deliberately left alone: exactly one
					// place in this plugin cancels a booking for non-payment, and that is the expiry
					// cron. A failed attempt is not the same as an abandoned booking — the customer is
					// very often still on the page, about to try another card.
					$charge = $this->transactions->pendingCharge( $order_id );
					if ( null === $charge ) {
						// No live attempt — but a REPEAT decline on the same intent still carries a
						// newer reason than the retired row holds (QA BUG-3). Refresh it so the confirm
						// leg stops quoting the first failure at a customer who has since hit a
						// different one. Only the operational column moves.
						$repeat = WebhookEvent::PAYMENT_FAILED === $event->type ? $event->failureCode() : '';
						$latest = '' === $repeat ? null : $this->transactions->latestCharge( $order_id );
						if ( is_array( $latest ) && TransactionRepository::STATUS_FAILED === (string) $latest['status'] ) {
							try {
								$this->transactions->refreshFailureCode( (int) $latest['id'], $repeat );
							} catch ( StorageException $failure ) {
								unset( $failure ); // Best effort: an unwritable note must not fail a webhook.
							}
						}

						return $this->ledgerResult( 'skipped', $order_id );
					}
					// The gateway's DECLINE REASON, when it sent one (Codex Q). `failure_code` is already
					// a column; without this the row said only "failed", and the one question the
					// customer asks — why? — had no answer anywhere in the system. Folded onto the
					// closed vocabulary at the value object, so nothing provider-shaped is stored.
					$reason = $event->failureCode();
					// A DECLINE IS RETRYABLE, AN EXPIRY IS NOT (D-R40g). `payment_intent.payment_failed`
					// / `PAYMENT.CAPTURE.DECLINED` leave the gateway object alive and confirmable with
					// another card on the same reference — which is the flow D-R40c(7) built
					// `claimForCapture()` for — so the row keeps the `client_params` the replay and
					// `/pay` hand back. A session that EXPIRED at the gateway has nothing left to
					// confirm, so its parameters go.
					$declined = WebhookEvent::SESSION_EXPIRED !== $event->type;
					$code     = '' !== $reason ? $reason : ( $declined ? 'failed' : 'expired' );
					$this->assertLockIntact( $lock );
					$this->safeFail( (int) $charge['id'], $code, $declined );

					return $this->ledgerResult( 'applied', $order_id );

				case WebhookEvent::REFUND_SUCCEEDED:
					return $this->ledgerResult( $this->applyRemoteRefund( $order_id, $gateway, $event, $lock ), $order_id );

				case WebhookEvent::REFUND_FAILED:
					return $this->ledgerResult( $this->applyRefundFailure( $order_id, $gateway, $event, $lock ), $order_id );

				default:
					// `payment_pending` and anything else recognised-but-inert: nothing to write, and
					// saying so honestly is better than recording a change that did not happen.
					return $this->ledgerResult( 'skipped', $order_id );
			}
		} finally {
			$lock->release();
		}
	}

	// -- Hold lifecycle ------------------------------------------------------------------------

	/**
	 * Release expired unpaid holds (D-R38g). Bounded; safe to run concurrently with anything.
	 *
	 * Two orders are deliberately walked past rather than processed. One whose `void` has already
	 * been ESCALATED is retried at most hourly (D-R40c) — the fact is reported, a person owns it, and
	 * a gateway call every five minutes buys nothing but latency for the holds behind it. And one
	 * with a live CAPTURE claim throws {@see PaymentException} from `releaseHold()`, which the catch
	 * below absorbs as "not this tick": a payment is being taken for that slot right now, and the
	 * next tick is a perfectly good time to look again.
	 *
	 * The backed-off orders are excluded by the SCAN, not by this loop (verify round 2): filtering
	 * after a `LIMIT` means a hundred stuck holds fill every batch with orders the loop then skips,
	 * and the hundred-and-first hold is never looked at again. The in-loop check stays as the guard
	 * for the narrow race it is actually good for — a marker written by an overlapping tick between
	 * the scan and this order's turn.
	 *
	 * @param int $limit Maximum orders to process this tick.
	 * @return int Holds released.
	 */
	public function expireHolds( int $limit = 100 ): int {
		$now    = $this->clock->now();
		$cutoff = $now->sub( new \DateInterval( 'PT' . self::EXPIRY_GRACE_MINUTES . 'M' ) )->format( 'Y-m-d H:i:s' );
		$retry  = $now->sub( new \DateInterval( 'PT' . self::VOID_RETRY_BACKOFF_HOURS . 'H' ) )->format( 'Y-m-d H:i:s' );

		$released = 0;
		foreach ( $this->orders->expiredHoldIds( $cutoff, $limit, $retry ) as $order_id ) {
			try {
				if ( $this->voidRetryBackoffActive( $order_id ) ) {
					continue;
				}
				if ( $this->releaseHold( $order_id, 'hold_expired', 'expired', 'payment_hold_expired', 'system', true ) ) {
					++$released;
				}
			} catch ( PaymentException | PaymentLockTimeout $expected ) {
				// The two ORDINARY refusals, and neither is news: a capture is on the network for this
				// slot, or another writer holds the order. The next tick looks again.
				unset( $expected );
			} catch ( \Throwable $failure ) {
				// ANYTHING ELSE IS REPORTED (Codex round on PR #42). One stuck order must never stop
				// the batch — but swallowing a storage or code failure silently meant a hold that can
				// never be released looked exactly like a hold that is merely busy, forever, with the
				// slot kept out of sale and nothing anywhere to say why. The exception CLASS is a safe
				// machine token; its message is not (§5 invariant 8), so it never leaves the process.
				$this->anomaly( '', $order_id, 'hold_release_failed:' . self::classToken( $failure ) );
			}
		}

		return $released;
	}

	/**
	 * Release a live unpaid hold because the CUSTOMER cancelled it (D-R38k).
	 *
	 * @param int $booking_id Booking id.
	 * @return string `released` (the hold is gone, cancel freely), `paid` (money arrived — apply the
	 *                ordinary cancel policy) or `not_a_hold` (nothing payment-related here).
	 * @throws PaymentException   `aponto_payment_state` (409) when a capture is on the network for
	 *                            this order (D-R40c). The widget locks its UI for the length of a
	 *                            gateway attempt, so the customer meets this only in a real race —
	 *                            and the honest answer to "cancel this" while their card is being
	 *                            charged is "not yet", never a released slot.
	 * @throws PaymentLockTimeout When the per-order lock cannot be taken.
	 */
	public function releaseHoldForCancel( int $booking_id ): string {
		$order = $this->orders->findForBooking( $booking_id );
		if ( null === $order || 'pending' !== (string) $order['payment_status'] ) {
			return 'not_a_hold';
		}

		// `cancel_booking` is FALSE here: the caller performs the cancellation itself, with the
		// customer's own reason and actor, and doing it twice would make the second transition throw
		// `InvalidTransition` and turn a successful release into a 409.
		$order_id = (int) $order['id'];
		if ( $this->releaseHold( $order_id, 'hold_released', 'cancelled', 'hold_released', 'customer', false ) ) {
			return 'released';
		}

		$fresh = $this->orders->find( $order_id );
		if ( null !== $fresh && in_array( (string) $fresh['payment_status'], array( 'paid', 'partial', 'refunded' ), true ) ) {
			return 'paid';
		}

		return 'not_a_hold';
	}

	// phpcs:disable Squiz.Commenting.FunctionCommentThrowTag.WrongNumber -- The sniff counts SYNTACTIC `throw` statements. The lock-timeout and the post-ROLLBACK re-throw documented on this method are raised by `acquire()`/`assertLockIntact()` and by the transaction guard, which it cannot see — and they are exactly the exceptions a caller has to handle, so the tags stay and the count check is waived for this one method.
	/**
	 * Release ONE hold: claim the void under the lock, call the gateway outside it, then finish.
	 *
	 * The three-phase shape is the whole of Codex #10. The old version dispatched `void` and then
	 * `capture` while holding the lock, and — worse — treated ANY `already_paid` answer as "the money
	 * arrived", so a capture that came back `failed`, `pending` or mismatched still fell through to
	 * releasing the slot on the next tick. Here, an `already_paid` void completes ONLY when an actual
	 * PAID outcome is applied; every other answer hands the claim back and leaves the hold exactly as
	 * it was, so the next tick tries again rather than cancelling a booking somebody paid for.
	 *
	 * @param int    $order_id       Order id.
	 * @param string $reason         Machine reason handed to the gateway's void.
	 * @param string $code           Failure code recorded on the charge row.
	 * @param string $action         Activity action to log.
	 * @param string $actor          Activity actor.
	 * @param bool   $cancel_booking Whether THIS call also cancels the booking. False when the caller
	 *                               owns the cancellation (the customer's own cancel route), because
	 *                               cancelling twice makes the second transition throw.
	 * @param bool   $force_void     ADMIN OVERRIDE (D-R40c): release even when the driver's `void`
	 *                               answers `WP_Error`. Only the admin cancel path passes `true` —
	 *                               an operator cancelling a booking by hand has decided about a
	 *                               payment core cannot get an answer on, and the override is
	 *                               recorded as `void_unresolved_admin_override`. Every unattended
	 *                               caller leaves it `false`, because a timer must never make that
	 *                               decision on their behalf.
	 * @return bool Whether the hold was released.
	 * @throws PaymentException   `aponto_payment_state` when a CAPTURE claim is live for this order:
	 *                            a payment is being taken for the slot this call wants to release.
	 * @throws PaymentLockTimeout When a per-order lock cannot be taken, or its connection identity
	 *                            is lost mid-section (E1).
	 * @throws \Throwable         Re-thrown after ROLLBACK when a durable write fails.
	 */
	private function releaseHold( int $order_id, string $reason, string $code, string $action, string $actor, bool $cancel_booking, bool $force_void = false ): bool {
		// phpcs:enable Squiz.Commenting.FunctionCommentThrowTag.WrongNumber
		// ---- Phase 1: under the lock, claim the void. ----
		$lock        = $this->acquire( $order_id );
		$charge      = null;
		$gateway     = '';
		$claim_lease = '';
		try {
			$order = $this->orders->find( $order_id );
			if ( null === $order || 'pending' !== (string) $order['payment_status'] ) {
				return false;
			}
			$gateway = (string) $order['gateway'];

			$in_flight = $this->transactions->pendingCharge( $order_id );

			// A CAPTURE IS ON THE NETWORK FOR THIS ORDER (D-R40c). `confirm()` has already decided,
			// under this same lock, that the hold was open — and releasing now would take the slot out
			// from under a payment that is being taken for it at this moment. The refusal is a THROW
			// because the three callers need three different answers and only one of them is a person:
			// the expiry cron catches it per order and retries on the next tick, while the customer's
			// cancel route and the admin's PATCH turn it into `409 aponto_payment_state` — the widget
			// locks its UI for the length of a gateway attempt, so a customer meets this only in a real
			// race. An EXPIRED claim is not live: it is the wreckage of a died request, and
			// `claimForVoid()` takes it over below.
			if ( is_array( $in_flight ) && $this->transactions->isCaptureClaimLive( $in_flight, $this->clock->now() ) ) {
				throw PaymentException::state();
			}

			if ( is_array( $in_flight ) && '' !== (string) $in_flight['gateway_ref'] && PaymentRegistry::isActive( $gateway ) ) {
				$this->assertLockIntact( $lock );
				$claim_lease = $this->transactions->claimForVoid( (int) $in_flight['id'] );
				if ( '' === $claim_lease ) {
					// Another tick owns the void right now; leave the hold to it.
					return false;
				}
				$this->assertLockIntact( $lock );
				$charge = $in_flight;
			}
		} finally {
			$lock->release();
		}

		// ---- Phase 2: no lock held — the gateway calls. ----
		$paid_outcome = null;
		if ( is_array( $charge ) ) {
			$void = $this->dispatcher->void(
				new VoidRequest( $gateway, (string) $charge['gateway_ref'], $this->orderCode( $order_id ), $reason ),
				$this->context( (string) $charge['idempotency_key'], 'void', false ),
				$order_id
			);

			if ( $void instanceof WP_Error ) {
				// A DRIVER FAILURE KEEPS THE HOLD (D-R40b, Codex #6) — and, since D-R40c, it keeps it
				// for as long as the failure lasts rather than for six hours.
				//
				// `not_required` means the driver VERIFIED there is nothing at the gateway to cancel;
				// a `WP_Error` means it could not find out — missing credentials, a malformed
				// response, a status it does not know, the gateway simply down. Those are opposite
				// facts, and this code used to act on both the same way: an order that might already
				// be captured had its slot released and its booking cancelled for non-payment.
				//
				// D-R40b then bounded the protection at six hours, on the reasoning that the money is
				// not coming by then. It is not our reasoning to make: the clock says nothing about a
				// remote fact, and the failure it produces is the expensive one — a booking cancelled
				// and its slot resold under a payment that did settle. What six hours buys now is a
				// PERSON: one anomaly, one admin message, and hourly retries thereafter
				// ({@see self::noteUnresolvedVoid()}). The exception is an admin who has decided to
				// cancel anyway, which is what `$force_void` is.
				if ( ! $force_void ) {
					$this->noteUnresolvedVoid( $order_id, $gateway );
					$this->safeReleaseVoidClaim( (int) $charge['id'], $claim_lease );

					return false;
				}

				// THE ADMIN OVERRIDE. The booking is being cancelled by hand, the void still cannot be
				// confirmed, and the operator has taken that on. The release proceeds and the record
				// says who decided — an admin acting on a payment they can see in the gateway's own
				// dashboard is exactly the actor this state was escalated to.
				$this->anomaly( $gateway, $order_id, 'void_unresolved_admin_override' );
			}

			if ( $void instanceof VoidResult && $void->isAlreadyPaid() ) {
				$order   = $this->orders->find( $order_id );
				$outcome = null === $order ? null : $this->dispatcher->capture(
					new CaptureRequest( $gateway, (string) $charge['gateway_ref'], (int) $order['total_minor'], (string) $order['currency'], (string) $order['code'] ),
					$this->context( (string) $charge['idempotency_key'], 'capture', false ),
					$order_id
				);

				if ( $outcome instanceof PaymentOutcome && PaymentOutcome::PAID === $outcome->status ) {
					$paid_outcome = $outcome;
				} else {
					// `already_paid` and no confirmed PAID outcome. Releasing the slot now could cancel
					// a booking somebody paid for, so NOTHING is resolved: the claim goes back and the
					// next tick retries. Fail-closed, at the price of a slot held a little longer.
					$this->anomaly( $gateway, $order_id, 'void_conflict' );
					$this->safeReleaseVoidClaim( (int) $charge['id'], $claim_lease );

					return false;
				}
			}
		}

		// ---- Phase 3: under the lock again, apply the decision. ----
		$lock = $this->acquire( $order_id );
		try {
			$order = $this->orders->find( $order_id );
			if ( null === $order || 'pending' !== (string) $order['payment_status'] ) {
				// Settled while we were on the network; nothing to release.
				if ( is_array( $charge ) ) {
					$this->safeReleaseVoidClaim( (int) $charge['id'], $claim_lease );
				}

				return false;
			}

			if ( null !== $paid_outcome ) {
				// ONLY `applied` or `duplicate` count as "the money is on the books" (Codex H). A
				// `mismatch` or a `skipped` means the capture did NOT settle this order — treating it
				// as completion left the charge marked failed and the hold released, so the next tick
				// cancelled a booking the gateway believes is paid. Anything else hands the claim back
				// and retries on the next tick.
				$applied = $this->applyOutcome( $order_id, $gateway, $paid_outcome, is_array( $charge ) ? (int) $charge['id'] : 0, $lock );
				if ( ! in_array( $applied, array( 'applied', 'duplicate' ), true ) && is_array( $charge ) ) {
					$this->anomaly( $gateway, $order_id, 'void_conflict' );
					$this->safeReleaseVoidClaim( (int) $charge['id'], $claim_lease );
				}

				return false;
			}

			$booking_id = $this->orders->bookingIdFor( $order_id );
			$booking    = $booking_id > 0 ? $this->bookings->find( $booking_id ) : null;

			// THE BOOKING MOVES FIRST (Codex C). Releasing the order rows before cancelling meant a
			// window in which the booking was `pending` with no hold behind it — during which the
			// expiry scan no longer saw it, an admin could confirm it, and nothing would ever pay for
			// it. And an admin who confirmed the booking WHILE the void was in flight has taken the
			// appointment over deliberately: the honest answer there is to drop the hold and leave the
			// booking confirmed, not to cancel an appointment somebody just accepted.
			$admin_took_over = $cancel_booking
				&& $booking instanceof Booking
				&& 'pending' !== $booking->status;

			if ( $cancel_booking && ! $admin_took_over ) {
				$this->cancelBooking( $booking_id, 'payment_hold_expired' );

				$fresh = $this->bookings->find( $booking_id );
				if ( $fresh instanceof Booking && 'cancelled' !== $fresh->status ) {
					// The transition refused (a concurrent actor moved it). Treat that as the
					// admin-took-over case rather than releasing the hold under a live booking.
					$admin_took_over = true;
				}
			}

			$this->assertLockIntact( $lock );
			$this->tx->begin();
			try {
				if ( is_array( $charge ) ) {
					$this->transactions->markFailed( (int) $charge['id'], $admin_took_over ? 'admin_confirmed' : $code );
				}
				// THE HOLD IS WHAT ENDS THE RETRY WINDOW, SO THE HOLD IS WHAT SCRUBS (D-R40g). A
				// decline now leaves its `client_params` on the row so the customer can pay on the
				// same reference — and a `failed` row is invisible to `pendingCharge()`, so the
				// `markFailed()` above never reaches it. Addressed by ORDER, in this transaction, it
				// catches that row and every superseded earlier attempt at once: the slot is gone,
				// nothing can be confirmed against those intents again, and what is left behind is
				// the stale secret-shaped string the privacy inventory says must not linger.
				$this->transactions->clearClientParams( $order_id );
				if ( ! $this->orders->releaseHold( $order_id ) ) {
					$this->tx->rollback();

					return false;
				}
				$this->activities->log(
					'booking',
					$booking_id,
					$admin_took_over ? 'hold_released_admin_confirmed' : $action,
					array( 'gateway' => $gateway ),
					$admin_took_over ? 'admin' : $actor
				);
				$this->assertLockIntact( $lock );
				$this->tx->commit();
			} catch ( \Throwable $failure ) {
				$this->tx->rollback();
				throw $failure;
			}

			return true;
		} finally {
			$lock->release();
		}
	}

	/**
	 * Drop a live hold because an ADMIN confirmed the booking by hand (Codex C).
	 *
	 * Without this, `PATCH status=confirmed` on an unpaid hold produced the one state the whole design
	 * exists to prevent: a confirmed appointment with a live gateway intent behind it, which the
	 * customer could still pay — and which the expiry cron would then find `confirmed` and walk past,
	 * leaving the money unreconciled. The admin has made the call, so the intent is voided, the order
	 * goes back to `none` and the booking is left exactly as the admin set it.
	 *
	 * @param int $booking_id Booking id.
	 * @return bool Whether a hold was released.
	 * @throws PaymentException   `aponto_payment_state` (409) when a capture is on the network for
	 *                            this order (D-R40c) — the customer is paying for the very slot the
	 *                            admin is confirming, and the two decisions must not interleave.
	 * @throws PaymentLockTimeout When a per-order lock cannot be taken.
	 */
	public function releaseHoldForAdminConfirm( int $booking_id ): bool {
		$order = $this->orders->findForBooking( $booking_id );
		if ( null === $order || 'pending' !== (string) $order['payment_status'] ) {
			return false;
		}

		// `cancel_booking = false`: the booking is being CONFIRMED, not cancelled. Everything else —
		// the void, the claim, the order reset — is the ordinary release.
		return $this->releaseHold( (int) $order['id'], 'admin_confirmed', 'admin_confirmed', 'hold_released_admin_confirmed', 'admin', false );
	}

	/**
	 * Drop a live hold because an ADMIN cancelled the booking by hand (D-R40c).
	 *
	 * This is the RESOLUTION path for an unresolved void, and the reason it exists as its own entry
	 * point. Since D-R40c no timer ever releases a hold whose `void` will not confirm; the hold is
	 * kept, the owner is told once, and the retry drops to hourly. Somebody therefore has to be able
	 * to end it, and the person who can is the one who administers the booking and can see the
	 * payment in their own gateway dashboard. So an admin cancel re-attempts the void — most of the
	 * time the gateway has recovered and this is an ordinary release — and, when it still cannot get
	 * an answer, releases anyway under `void_unresolved_admin_override`.
	 *
	 * `cancel_booking = false`: the caller performs the cancellation itself, with its own actor and
	 * reason, exactly as the customer's cancel route does. Doing it twice would make the second
	 * transition throw and turn a successful release into a `409`.
	 *
	 * @param int $booking_id Booking id.
	 * @return bool Whether a hold was released.
	 * @throws PaymentException   `aponto_payment_state` (409) when a capture is on the network.
	 * @throws PaymentLockTimeout When a per-order lock cannot be taken.
	 */
	public function releaseHoldForAdminCancel( int $booking_id ): bool {
		$order = $this->orders->findForBooking( $booking_id );
		if ( null === $order || 'pending' !== (string) $order['payment_status'] ) {
			return false;
		}

		return $this->releaseHold( (int) $order['id'], 'admin_cancelled', 'cancelled', 'hold_released', 'admin', false, true );
	}

	/**
	 * Run a caller's work under this order's payment lock (Codex C).
	 *
	 * The admin PATCH needs the booking transition and the order mutation to be ONE serialized
	 * decision — two locks taken in sequence would let a webhook settle the payment between them. The
	 * lock is passed to the callback explicitly rather than remembered on the instance, which is the
	 * `ProjectionLease` rule (D-R34d): "do I hold this?" is answered by the argument list, never by
	 * state that outlives the request that set it.
	 *
	 * @param int      $order_id Order id.
	 * @param callable $work     `function (Lock $lock): mixed`.
	 * @return mixed The callback's return value.
	 * @throws PaymentLockTimeout When the per-order lock cannot be taken.
	 */
	public function withOrderLock( int $order_id, callable $work ) {
		$lock = $this->acquire( $order_id );

		try {
			return $work( $lock );
		} finally {
			$lock->release();
		}
	}

	/**
	 * Send the "complete your payment" reminder for holds that are old enough (D-R38j).
	 *
	 * No lock: the only write is a notification claim and a booking-meta marker, both idempotent.
	 *
	 * @param int $limit Maximum reminders to queue this tick.
	 * @return int Reminders queued.
	 */
	public function sendHoldReminders( int $limit = 50 ): int {
		$now            = $this->clock->now();
		$created_before = $now->sub( new \DateInterval( 'PT' . self::REMINDER_AFTER_MINUTES . 'M' ) )->format( 'Y-m-d H:i:s' );
		$alive_after    = $now->format( 'Y-m-d H:i:s' );

		$sent = 0;
		foreach ( $this->orders->remindableHoldIds( $created_before, $alive_after, $limit ) as $order_id ) {
			try {
				$booking_id = $this->orders->bookingIdFor( $order_id );
				$booking    = $booking_id > 0 ? $this->bookings->find( $booking_id ) : null;
				if ( ! $booking instanceof Booking || 'pending' !== $booking->status ) {
					continue;
				}

				$outcome = $this->notifications->queuePaymentPending( $booking, (string) $order_id );

				// Mark the order dealt with on any DEFINITIVE outcome (Codex #14) — queued, already in
				// the outbox, or deliberately declined. Only `failed` (an exception, so nothing is
				// known) leaves it eligible for the next tick. Without this a suppressed reminder had
				// no ledger row to anti-join against and its order re-entered every batch forever,
				// starving newer holds of the 50 slots.
				if ( NotificationDispatcher::OUTCOME_FAILED !== $outcome ) {
					$this->meta->setKey( $booking_id, OrderRepository::REMINDED_META_KEY, $this->clock->nowSql() );
				}

				if ( NotificationDispatcher::OUTCOME_QUEUED === $outcome ) {
					$this->notifications->flushBooking( $booking_id );
					++$sent;
				}
			} catch ( \Throwable $failure ) {
				unset( $failure ); // One order must never stop the batch.
			}
		}

		return $sent;
	}

	// -- Refunds -------------------------------------------------------------------------------

	// phpcs:disable Squiz.Commenting.FunctionCommentThrowTag.WrongNumber -- The sniff counts SYNTACTIC `throw` statements. The lock-timeout and the post-ROLLBACK re-throw documented on this method are raised by `acquire()`/`assertLockIntact()` and by the transaction guard, which it cannot see — and they are exactly the exceptions a caller has to handle, so the tags stay and the count check is waived for this one method.
	/**
	 * Refund a booking's order, in full or in part (founder Q6, rest-contract §2.21).
	 *
	 * Structural rule again: the amount is reserved by a `pending` refund row written under the lock,
	 * the gateway call happens with no lock held, and the result is applied under a fresh lock. The
	 * reservation is what stops two operators refunding the same money at once — a second refund sees
	 * the in-flight amount in `refundedMinor()` and is refused before it reaches the gateway.
	 *
	 * @param int      $booking_id   Booking id.
	 * @param int|null $amount_minor Amount to refund, or null for the remaining amount.
	 * @param string   $actor        Actor descriptor for the activity log.
	 * @param string   $reason       Operator reason (may be '').
	 * @return array{transaction: array<string, mixed>, order: array<string, mixed>}|null
	 *         Null when the booking has no order at all (uniform 404).
	 * @throws PaymentException   When the state, the module or the driver refuses.
	 * @throws PaymentLockTimeout When a per-order lock cannot be taken, or its connection identity
	 *                            is lost mid-section (E1).
	 */
	public function refund( int $booking_id, ?int $amount_minor, string $actor, string $reason = '' ): ?array {
		// phpcs:enable Squiz.Commenting.FunctionCommentThrowTag.WrongNumber
		$existing = $this->orders->findForBooking( $booking_id );
		if ( null === $existing ) {
			return null;
		}
		$order_id = (int) $existing['id'];

		// Declared before the phases so the values the gateway call needs survive the lock scope.
		$gateway = '';
		$amount  = 0;
		$key     = '';
		$txn_id  = 0;
		$charge  = array();
		$order   = array();

		// ---- Phase 1: under the lock, validate and RESERVE. ----
		$lock = $this->acquire( $order_id );
		try {
			$order = $this->orders->find( $order_id );
			if ( null === $order ) {
				return null;
			}

			$gateway = (string) $order['gateway'];
			if ( ! PaymentRegistry::isActive( $gateway ) ) {
				// D-R31 retention: the data stays readable, the ACTION needs the module.
				throw PaymentException::unavailable();
			}
			if ( ! in_array( (string) $order['payment_status'], array( 'paid', 'partial' ), true ) ) {
				throw PaymentException::state();
			}
			if ( $this->transactions->hasPendingRefund( $order_id ) ) {
				// A refund is already in flight; its amount is reserved and a second operator must
				// wait rather than race it (Codex #7).
				throw PaymentException::state();
			}

			$charge = $this->transactions->succeededCharge( $order_id );
			if ( null === $charge ) {
				throw PaymentException::state();
			}

			$paid      = (int) $charge['amount_minor'];
			$remaining = $paid - $this->transactions->refundedMinor( $order_id );
			$amount    = null === $amount_minor ? $remaining : $amount_minor;
			if ( $remaining <= 0 || $amount < 1 || $amount > $remaining ) {
				throw PaymentException::state();
			}

			$sequence = $this->transactions->nextSequence( $order_id, TransactionRepository::KIND_REFUND );
			$key      = PaymentRegistry::idempotencyKey( $order_id, TransactionRepository::KIND_REFUND, $sequence );

			$this->assertLockIntact( $lock );
			$txn_id = $this->transactions->insertPending(
				$order_id,
				$booking_id,
				$gateway,
				TransactionRepository::KIND_REFUND,
				$amount,
				(string) $order['currency'],
				$key,
				null,
				(int) $charge['id']
			);
			$this->assertLockIntact( $lock );
		} finally {
			$lock->release();
		}

		// ---- Phase 2: no lock held — the gateway call. ----
		$result = $this->dispatcher->refund(
			new RefundRequest(
				$gateway,
				(string) $charge['payment_ref'],
				(string) $charge['gateway_ref'],
				$amount,
				(string) $order['currency'],
				(string) $order['code'],
				$reason,
				$key,
				// The environment the ORIGINAL charge was taken in, kept on the row through
				// settlement (D-R39c, Codex A.3), so the driver can refuse a cross-environment
				// refund before it spends a call it cannot make.
				TransactionRepository::durableMeta( $charge, 'mode' )
			),
			$this->context( $key, 'refund', true ),
			$order_id
		);

		if ( $result instanceof WP_Error ) {
			$this->safeFail( $txn_id, 'refund_failed' );
			// A driver may say the ORDER, not the gateway, is what forbids this — the cross-mode
			// refund of D-R39b is the case that made the seam necessary. `502 aponto_payment_error`
			// would tell the operator to retry something that will never work, and hide a fix they
			// could apply in two clicks. The COPY is the driver's, but only because core cannot know
			// it; the shape stays core's own 409, and nothing a gateway said is ever echoed.
			if ( 'aponto_payment_state' === (string) $result->get_error_code() ) {
				throw PaymentException::state( esc_html( (string) $result->get_error_message() ) );
			}
			throw PaymentException::driverFailed();
		}

		// The reported figures MUST match what was asked for (Codex #8). A gateway that refunded a
		// different amount, or in a different currency, has not done what the operator authorised;
		// recording it as if it had would put a wrong number in the ledger and the wrong status on the
		// order.
		// And a SETTLED refund must STATE what it moved (Codex G). Every gateway on this contract
		// reports the figure; a driver that does not has either not read the gateway's answer or is
		// guessing, and recording a settlement on a guess puts a number in the ledger nothing
		// verified. `pending` is exempt — nothing has moved yet, and the settling webhook carries the
		// figures.
		$reported_currency = strtoupper( $result->currency );
		$order_currency    = strtoupper( (string) $order['currency'] );
		$figures_missing   = RefundResult::SUCCEEDED === $result->status
			&& ( 1 > $result->amount_minor || '' === $reported_currency );
		if ( $figures_missing
			|| ( $result->amount_minor > 0 && $amount !== $result->amount_minor )
			|| ( '' !== $reported_currency && $order_currency !== $reported_currency ) ) {
			$this->safeFail( $txn_id, 'amount_mismatch' );
			$this->anomaly( $gateway, $order_id, 'refund_amount_mismatch' );
			throw PaymentException::driverFailed();
		}

		$ref = '' === $result->refund_ref ? $key : $result->refund_ref;

		// ---- Phase 3: under the lock again, settle. ----
		$lock = $this->acquire( $order_id );
		try {
			if ( RefundResult::PENDING === $result->status ) {
				// A pending refund settles NOTHING (Codex #7): the money has not moved, the order keeps
				// its status, and no customer is told about a refund that may yet fail. The row's
				// amount stays reserved, and a `refund_succeeded`/`refund_failed` webhook finishes it.
				//
				// It DOES carry both references though (D-R40e, Codex #3): the contract's refund shape
				// is `gateway_ref` = refund id, `payment_ref` = originating charge, and a row that
				// wrote only one of them made the admin response contradict §2.21 the moment a refund
				// went pending — and made the legacy resolver treat a row written seconds ago as old.
				$this->transactions->markPendingRef( $txn_id, $ref, self::refundPaymentRef( $charge, $ref ) );
				$transaction = $this->transactions->find( $txn_id );

				return array(
					'transaction' => null === $transaction ? array() : $transaction,
					'order'       => $this->orderSummary( $order_id ),
				);
			}

			$this->settleRefund( $order_id, $gateway, $booking_id, $txn_id, $ref, $amount, $actor, $lock );

			$transaction = $this->transactions->find( $txn_id );

			return array(
				'transaction' => null === $transaction ? array() : $transaction,
				'order'       => $this->orderSummary( $order_id ),
			);
		} finally {
			$lock->release();
		}
	}

	/**
	 * Re-dispatch refunds that reached the gateway and never came back (Codex J).
	 *
	 * A `pending` refund reserves its amount, so one that is stuck reserves it forever: the order
	 * stays `paid`, every further refund answers `409`, and only somebody reading the database can
	 * tell why. The cure is not to guess — it is to ASK AGAIN with the same idempotency key, which
	 * every gateway answers with the ORIGINAL refund rather than a second one. Bounded, because a
	 * gateway that keeps refusing is a human problem: after {@see TransactionRepository::MAX_REFUND_RECONCILES}
	 * the row is failed with `refund_unreconciled` and an anomaly is logged so the operator sees it.
	 *
	 * @param int $limit Maximum refunds to reconcile this tick.
	 * @return int Refunds settled.
	 */
	public function reconcileStaleRefunds( int $limit = 20 ): int {
		$cutoff = $this->clock->now()
			->sub( new \DateInterval( 'PT' . TransactionRepository::REFUND_LEASE_SECONDS . 'S' ) )
			->format( 'Y-m-d H:i:s' );

		$settled = 0;
		foreach ( $this->transactions->stalePendingRefunds( $cutoff, $limit ) as $row ) {
			try {
				if ( $this->reconcileOneRefund( $row ) ) {
					++$settled;
				}
			} catch ( \Throwable $failure ) {
				unset( $failure ); // One stuck refund must never stop the batch.
			}
		}

		return $settled;
	}

	/**
	 * Reconcile ONE stuck refund, in the three-phase shape (Codex J).
	 *
	 * @param array<string, mixed> $row Pending refund row.
	 * @return bool Whether the refund settled.
	 * @throws PaymentLockTimeout When a per-order lock cannot be taken.
	 */
	private function reconcileOneRefund( array $row ): bool {
		$order_id = (int) $row['order_id'];
		$txn_id   = (int) $row['id'];
		$gateway  = (string) $row['gateway'];

		// ---- Phase 1: under the lock, count the attempt (which also refreshes the lease, so a
		// second tick does not pick the same row up while this one is on the network). ----
		$lock    = $this->acquire( $order_id );
		$charge  = null;
		$order   = null;
		$give_up = false;
		try {
			$current = $this->transactions->find( $txn_id );
			if ( ! is_array( $current ) || TransactionRepository::STATUS_PENDING !== (string) $current['status'] ) {
				return false; // Settled or retired since the scan.
			}

			$this->assertLockIntact( $lock );
			$attempts = $this->transactions->bumpReconcileAttempts( $txn_id );
			$this->assertLockIntact( $lock );

			if ( $attempts > TransactionRepository::MAX_REFUND_RECONCILES ) {
				$give_up = true;
			} else {
				$charge = $this->transactions->succeededCharge( $order_id );
				$order  = $this->orders->find( $order_id );
			}
		} finally {
			$lock->release();
		}

		if ( $give_up ) {
			$this->safeFail( $txn_id, 'refund_unreconciled' );
			$this->anomaly( $gateway, $order_id, 'refund_unreconciled' );

			return false;
		}

		if ( ! is_array( $charge ) || ! is_array( $order ) || ! PaymentRegistry::isActive( $gateway ) ) {
			return false;
		}

		// ---- Phase 2: no lock held — ask the gateway again with the SAME key. ----
		$amount = (int) $row['amount_minor'];
		$key    = (string) $row['idempotency_key'];
		$result = $this->dispatcher->refund(
			new RefundRequest(
				$gateway,
				(string) $charge['payment_ref'],
				(string) $charge['gateway_ref'],
				$amount,
				(string) $row['currency'],
				(string) $order['code'],
				'reconcile',
				$key,
				TransactionRepository::durableMeta( $charge, 'mode' )
			),
			$this->context( $key, 'refund', false ),
			$order_id
		);

		if ( $result instanceof WP_Error || RefundResult::SUCCEEDED !== $result->status ) {
			return false; // Still unsettled; the next tick tries again until the bound is reached.
		}

		// ---- Phase 3: under the lock again, settle. ----
		return (bool) $this->withOrderLock(
			$order_id,
			function ( Lock $lock ) use ( $order_id, $gateway, $txn_id, $result, $amount, $key ): bool {
				$current = $this->transactions->find( $txn_id );
				if ( ! is_array( $current ) || TransactionRepository::STATUS_PENDING !== (string) $current['status'] ) {
					return false; // A webhook settled it while we were asking.
				}

				$booking_id = $this->orders->bookingIdFor( $order_id );
				$this->settleRefund( $order_id, $gateway, $booking_id, $txn_id, '' === $result->refund_ref ? $key : $result->refund_ref, $amount, 'system:reconcile', $lock );

				return true;
			}
		);
	}

	/**
	 * Settle one refund row and the order status in ONE transaction, then notify.
	 *
	 * @param int    $order_id   Order id.
	 * @param string $gateway    Module code.
	 * @param int    $booking_id Booking id.
	 * @param int    $txn_id     Refund row.
	 * @param string $ref        Gateway refund reference.
	 * @param int    $amount     Refunded amount, minor units.
	 * @param string $actor      Activity actor.
	 * @param Lock   $lock       The held per-order lock (identity re-verified around the writes).
	 * @throws \Throwable Re-thrown after ROLLBACK when a durable write fails.
	 */
	private function settleRefund( int $order_id, string $gateway, int $booking_id, int $txn_id, string $ref, int $amount, string $actor, Lock $lock ): void {
		$charge = $this->transactions->succeededCharge( $order_id );
		$paid   = null === $charge ? 0 : (int) $charge['amount_minor'];

		$this->assertLockIntact( $lock );
		$this->tx->begin();
		try {
			$this->transactions->markSucceeded( $txn_id, self::refundPaymentRef( $charge, $ref ), $ref );
			$settled = $this->transactions->settledRefundMinor( $order_id );
			$this->orders->markRefundStatus( $order_id, $settled >= $paid && $paid > 0 ? 'refunded' : 'partial' );
			$this->activities->log(
				'booking',
				$booking_id,
				'refund',
				array(
					'gateway' => $gateway,
					'amount'  => $amount,
					'ref'     => $ref,
				),
				$actor
			);
			$this->assertLockIntact( $lock );
			$this->tx->commit();
		} catch ( \Throwable $failure ) {
			$this->tx->rollback();
			throw $failure;
		}

		$this->notifyRefund( $booking_id, $txn_id, $amount );
	}

	/**
	 * Apply a refund that settled at the gateway rather than here — a dashboard refund, or the
	 * settlement of a refund this site started and left `pending` (Codex #6/#7).
	 *
	 * No HTTP on this path, so the whole apply is ONE transaction. It is also written to be safe to
	 * run twice, because an event-ledger lease can be reclaimed after a crash: a refund row already
	 * `succeeded` for this reference with the order not yet settled finishes the settlement; both
	 * done is a duplicate.
	 *
	 * @param int          $order_id Order id.
	 * @param string       $gateway  Module code.
	 * @param WebhookEvent $event    Refund event.
	 * @param Lock         $lock     The held per-order lock.
	 * @return string `applied`, `duplicate`, `mismatch` or `skipped`.
	 * @throws \Throwable Re-thrown after ROLLBACK when a durable write fails.
	 */
	private function applyRemoteRefund( int $order_id, string $gateway, WebhookEvent $event, Lock $lock ): string {
		$charge = $this->transactions->succeededCharge( $order_id );
		if ( null === $charge ) {
			return 'skipped';
		}

		$order = $this->orders->find( $order_id );
		if ( null === $order ) {
			return 'skipped';
		}

		// The event MUST carry a positive amount in the order's currency (Codex #8). A refund event
		// with no figure used to be read as "refund the remainder", which turns a partial refund
		// nobody could see into a full one.
		// EMPTY CURRENCY IS INVALID HERE (Codex G): an amount with no currency cannot be compared with
		// anything, and this leg settles money.
		$reported_currency = strtoupper( $event->currency );
		$order_currency    = strtoupper( (string) $order['currency'] );
		if ( 1 > $event->amount_minor || '' === $reported_currency || $order_currency !== $reported_currency ) {
			$this->anomaly( $gateway, $order_id, 'refund_amount_mismatch' );

			return 'mismatch';
		}

		$existing = $this->transactions->findRefundByRef( $gateway, $event->payment_ref );

		// CORRELATION (Codex J). A gateway can settle a refund with a reference core never stored —
		// because the response carrying it was lost — and inserting a second row for it would double
		// the refunded total. An outstanding reservation of the SAME amount and currency on this order
		// is that refund; the event settles it and stamps the reference it was missing.
		if ( ! is_array( $existing ) ) {
			$existing = $this->transactions->findPendingRefundMatching( $order_id, $event->amount_minor, $event->currency );
		}

		$paid       = (int) $charge['amount_minor'];
		$booking_id = $this->orders->bookingIdFor( $order_id );

		if ( is_array( $existing ) && TransactionRepository::STATUS_SUCCEEDED === (string) $existing['status'] ) {
			// Already settled. Re-derive the order status anyway: a crash between the row write and
			// the order write would otherwise leave a refunded order reading `paid` forever.
			return $this->reconcileSettledRefund( $order_id, (int) $existing['id'], $paid, $lock );
		}

		if ( is_array( $existing ) ) {
			// Settling a reservation: the event must agree with the row it is settling (Codex G).
			// Otherwise the ledger would record one figure and the gateway another. The test is on
			// EVERY unsettled row, not only a `pending` one (D-R40e, verify B.1): since the settling
			// compare-and-swap accepts a row this site had failed, that row has to pass the same
			// agreement check as a reservation — it is being settled by exactly the same event.
			if ( (int) $existing['amount_minor'] !== $event->amount_minor
				|| strtoupper( (string) $existing['currency'] ) !== $reported_currency ) {
				$this->anomaly( $gateway, $order_id, 'refund_mismatch' );

				return 'mismatch';
			}
		}

		$already   = $this->transactions->settledRefundMinor( $order_id );
		$remaining = $paid - $already;
		if ( $remaining < 1 ) {
			return 'duplicate';
		}
		if ( $event->amount_minor > $remaining ) {
			// NOT clamped (Codex #8): a gateway reporting more than this order can owe back means the
			// two sides disagree about the money, and quietly shrinking the figure would hide it.
			$this->anomaly( $gateway, $order_id, 'refund_exceeds_paid' );

			return 'mismatch';
		}

		$amount = $event->amount_minor;
		$ref    = '' === $event->payment_ref ? ( 'evt:' . $event->event_id ) : $event->payment_ref;

		$this->assertLockIntact( $lock );
		$this->tx->begin();
		try {
			if ( is_array( $existing ) ) {
				// The settlement of a refund this site started and left pending.
				$txn_id = (int) $existing['id'];
			} else {
				$sequence = $this->transactions->nextSequence( $order_id, TransactionRepository::KIND_REFUND );
				$txn_id   = $this->transactions->insertPending(
					$order_id,
					$booking_id > 0 ? $booking_id : null,
					$gateway,
					TransactionRepository::KIND_REFUND,
					$amount,
					(string) $charge['currency'],
					PaymentRegistry::idempotencyKey( $order_id, TransactionRepository::KIND_REFUND, $sequence ),
					null,
					(int) $charge['id']
				);
			}

			// THE TRANSITION IS THE PERMISSION FOR EVERYTHING BELOW IT (D-R40e, verify B.1).
			//
			// The first cut called `markSucceeded()` and ignored its answer — and `markSucceeded()`
			// is a compare-and-swap that deliberately refuses a `failed` row. So a refund the
			// reconcile tick had given up on (`refund_unreconciled`) stayed `failed` under a late,
			// perfectly valid `refund_succeeded` webhook, while the four writes that are supposed to
			// FOLLOW the settlement ran anyway: the order went `partial`, the activity feed recorded
			// a refund, and the customer was emailed about money the ledger still says was never
			// returned. `refunded_minor` — which counts settled rows — stayed 0, so the order and its
			// own transactions disagreed with each other.
			//
			// {@see TransactionRepository::markRefundSucceeded()} accepts `pending|failed` (the
			// gateway, not this site's reconcile budget, decides whether a refund settled) and
			// reports the affected-row count. Losing it means somebody else settled this row first.
			if ( 1 > $this->transactions->markRefundSucceeded( $txn_id, $ref, self::refundPaymentRef( $charge, $ref ) ) ) {
				$this->tx->rollback();

				return $this->refundAlreadySettled( $order_id, $txn_id, $paid, $lock );
			}

			$existing = array( 'id' => $txn_id );

			$settled = $this->transactions->settledRefundMinor( $order_id );
			$this->orders->markRefundStatus( $order_id, $settled >= $paid ? 'refunded' : 'partial' );
			$this->activities->log(
				'booking',
				$booking_id,
				'refund',
				array(
					'gateway' => $gateway,
					'amount'  => $amount,
					'ref'     => $ref,
				),
				'gateway:' . $gateway
			);
			$this->assertLockIntact( $lock );
			$this->tx->commit();
		} catch ( \Throwable $failure ) {
			$this->tx->rollback();
			throw $failure;
		}

		$this->notifyRefund( $booking_id, (int) $existing['id'], $amount );

		return 'applied';
	}

	/**
	 * A settlement this delivery did NOT win (D-R40e, verify B.1): re-read, then answer honestly.
	 *
	 * Two deliveries of one settlement — or a webhook racing the confirm leg — reach the same row,
	 * and only one of them may write the order, the activity line and the customer's email. The loser
	 * has still seen a true statement from the gateway, so it re-reads: a row somebody else settled is
	 * a `duplicate` whose order status is re-derived (that half is idempotent and repairs a crash
	 * between the two writes), and a row that is settled by nobody is a no-op this delivery has no
	 * standing to force.
	 *
	 * @param int  $order_id Order id.
	 * @param int  $txn_id   The refund row this delivery tried to settle.
	 * @param int  $paid     Minor units the charge collected.
	 * @param Lock $lock     The per-order lock `applyEvent()` holds (E1 identity check).
	 * @return string `applied` or `duplicate`.
	 * @throws PaymentLockTimeout When the lock's connection identity is lost (E1).
	 */
	private function refundAlreadySettled( int $order_id, int $txn_id, int $paid, Lock $lock ): string {
		$row = $this->transactions->find( $txn_id );
		if ( ! is_array( $row ) || TransactionRepository::STATUS_SUCCEEDED !== (string) $row['status'] ) {
			return 'duplicate';
		}

		return $this->reconcileSettledRefund( $order_id, $txn_id, $paid, $lock );
	}

	/**
	 * Re-derive an order's payment status from the refunds that have actually SETTLED (Codex F).
	 *
	 * Runs in its OWN transaction with the lock assertion around it — a recovery path that writes
	 * unprotected is exactly the class of bug it exists to repair — and it reads the order again
	 * rather than trusting a snapshot taken before the racing writer committed.
	 *
	 * `assertLockIntact()` raises the retryable `PaymentLockTimeout` when the E1 connection identity
	 * has moved; it is not tagged here because the sniff counts syntactic `throw` statements.
	 *
	 * IT ALSO RECOVERS THE CUSTOMER'S REFUND NOTICE (Codex round on PR #42). The notification is a
	 * POST-COMMIT side effect, so a worker that dies between the settling COMMIT and `notifyRefund()`
	 * leaves money returned and nobody told — and every later delivery of that event reaches this
	 * method and answers `duplicate`, closing the ledger row forever. Re-queuing is safe because the
	 * outbox claims a UNIQUE `dispatch_key` built from the refund's own row id
	 * ({@see \Aponto\Notification\NotificationDispatcher::queuePaymentRefunded()}), so a second
	 * queue for the same refund is refused by the database rather than by a flag someone has to
	 * maintain. It runs AFTER the status work, so a mail is never sent for a write that then failed.
	 *
	 * @param int  $order_id Order id.
	 * @param int  $txn_id   The refund row that settled — the notice's idempotency key.
	 * @param int  $paid     Minor units the charge collected.
	 * @param Lock $lock     The per-order lock `applyEvent()` holds (E1 identity check).
	 * @return string `applied` when the status moved, `duplicate` when there was nothing to move.
	 * @throws \Throwable Re-thrown after ROLLBACK when the durable write fails.
	 */
	private function reconcileSettledRefund( int $order_id, int $txn_id, int $paid, Lock $lock ): string {
		$outcome = $this->deriveSettledRefundStatus( $order_id, $paid, $lock );
		$this->recoverRefundNotice( $order_id, $txn_id );

		return $outcome;
	}

	/**
	 * Queue the customer's refund notice for a settled refund that may never have got one.
	 *
	 * Idempotent through the outbox's unique `dispatch_key`, and silent about everything else: a row
	 * that is not `succeeded` has no notice to owe, and a booking that has gone has nobody to tell.
	 *
	 * @param int $order_id Order id.
	 * @param int $txn_id   Refund transaction id.
	 */
	private function recoverRefundNotice( int $order_id, int $txn_id ): void {
		$row = $this->transactions->find( $txn_id );
		if ( ! is_array( $row ) || TransactionRepository::STATUS_SUCCEEDED !== (string) $row['status'] ) {
			return;
		}

		$booking_id = $this->orders->bookingIdFor( $order_id );
		if ( $booking_id > 0 ) {
			$this->notifyRefund( $booking_id, $txn_id, (int) $row['amount_minor'] );
		}
	}

	/**
	 * The status half of {@see self::reconcileSettledRefund()}.
	 *
	 * @param int  $order_id Order id.
	 * @param int  $paid     Minor units the charge collected.
	 * @param Lock $lock     The per-order lock `applyEvent()` holds (E1 identity check).
	 * @return string `applied` when the status moved, `duplicate` when there was nothing to move.
	 * @throws \Throwable Re-thrown after ROLLBACK when the durable write fails.
	 */
	private function deriveSettledRefundStatus( int $order_id, int $paid, Lock $lock ): string {
		$order   = $this->orders->find( $order_id );
		$settled = $this->transactions->settledRefundMinor( $order_id );
		if ( null === $order || $settled < 1 || ! in_array( (string) $order['payment_status'], array( 'paid', 'partial' ), true ) ) {
			return 'duplicate';
		}

		// NOTHING TO RE-DERIVE IS A DUPLICATE, NOT AN APPLY (D-R40h, QA run 2 FINDING-2). Every
		// sibling delivery of one PARTIAL refund lands here with the order already reading `partial`,
		// so the write below would set the value that is already stored — and calling a delivery that
		// changed nothing `applied` is both a transaction nobody needed and a ledger row that
		// overstates what happened. The repair this method exists for (a crash between the refund row
		// and the order write) still runs, because there the stored status and the derived one differ.
		$target = $settled >= $paid ? 'refunded' : 'partial';
		if ( $target === (string) $order['payment_status'] ) {
			return 'duplicate';
		}

		$this->assertLockIntact( $lock );
		$this->tx->begin();
		try {
			$this->orders->markRefundStatus( $order_id, $settled >= $paid ? 'refunded' : 'partial' );
			$this->assertLockIntact( $lock );
			$this->tx->commit();
		} catch ( \Throwable $failure ) {
			$this->tx->rollback();
			throw $failure;
		}

		return 'applied';
	}

	/**
	 * A refund the gateway had accepted did not settle (Codex #7): retire the reservation.
	 *
	 * @param int          $order_id Order id.
	 * @param string       $gateway  Module code.
	 * @param WebhookEvent $event    Refund-failed event.
	 * @param Lock         $lock     The per-order lock `applyEvent()` holds (E1 identity check).
	 * @return string `applied` or `skipped`.
	 * @throws PaymentLockTimeout When the lock's connection identity is lost (E1).
	 */
	private function applyRefundFailure( int $order_id, string $gateway, WebhookEvent $event, Lock $lock ): string {
		$row = $this->transactions->findRefundByRef( $gateway, $event->payment_ref );
		if ( ! is_array( $row ) || TransactionRepository::STATUS_PENDING !== (string) $row['status'] ) {
			return 'skipped';
		}

		// The lock is HELD by `applyEvent()`; the identity check belongs to this write, not to the
		// method that took the lock (Codex D audit). `markFailed()` is itself a compare-and-swap on
		// the in-flight statuses, so a row settled between the read above and here is left alone.
		$this->assertLockIntact( $lock );
		$this->safeFail( (int) $row['id'], 'refund_failed' );
		$this->anomaly( $gateway, $order_id, 'refund_failed' );

		return 'applied';
	}

	// -- Manual payment status ------------------------------------------------------------------

	/**
	 * Refuse a manual `payment_status` PATCH on a gateway-tracked order (D-R38i).
	 *
	 * Called by the controller BEFORE it does anything else, so a refused PATCH writes nothing at all
	 * — not the status transition, not the internal note (Codex #3).
	 *
	 * @param int $order_id Order id.
	 * @throws PaymentException When the order carries any gateway charge.
	 */
	public function assertManualStatusAllowed( int $order_id ): void {
		if ( $this->transactions->hasAnyCharge( $order_id ) ) {
			throw PaymentException::state();
		}
	}

	// phpcs:disable Squiz.Commenting.FunctionCommentThrowTag.WrongNumber -- The sniff counts SYNTACTIC `throw` statements. The lock-timeout and the post-ROLLBACK re-throw documented on this method are raised by `acquire()`/`assertLockIntact()` and by the transaction guard, which it cannot see — and they are exactly the exceptions a caller has to handle, so the tags stay and the count check is waived for this one method.
	/**
	 * Apply the manual Q9 payment switch under the per-order lock (Codex #3).
	 *
	 * The refusal is re-checked INSIDE the lock, not just in the controller: between the controller's
	 * check and this write a webhook could have created the very charge row that makes the order
	 * gateway-tracked. Hold clearing rides the same statement set — a manual `paid` ends the hold, and
	 * doing it in a second best-effort write afterwards (the first cut) meant a failure there was
	 * swallowed and the expiry cron could still see a live deadline.
	 *
	 * @param int           $order_id Order id.
	 * @param string        $status   `none` or `paid`.
	 * @param string        $actor    Activity actor.
	 * @param callable|null $in_tx    Optional extra write that must commit or roll back with this one.
	 * @return string The order's payment status afterwards.
	 * @throws PaymentException   When the order is gateway-tracked or has vanished.
	 * @throws PaymentLockTimeout When the per-order lock cannot be taken, or its connection identity
	 *                            is lost mid-section (E1).
	 * @throws \Throwable         Re-thrown after ROLLBACK when a durable write fails.
	 */
	public function markManual( int $order_id, string $status, string $actor, ?callable $in_tx = null ): string {
		// phpcs:enable Squiz.Commenting.FunctionCommentThrowTag.WrongNumber
		return $this->withOrderLock(
			$order_id,
			fn ( Lock $lock ): string => $this->markManualUnderLock( $lock, $order_id, $status, $actor, $in_tx )
		);
	}

	// phpcs:disable Squiz.Commenting.FunctionCommentThrowTag.WrongNumber -- The sniff counts SYNTACTIC `throw` statements; the lock-identity failure and the post-ROLLBACK re-throw documented below are raised by `assertLockIntact()` and by the transaction guard, which it cannot see.
	/**
	 * The body of {@see self::markManual()}, for a caller that ALREADY holds the order lock.
	 *
	 * The admin PATCH takes the lock ONCE and performs the booking transition and this mutation inside
	 * it (Codex C). Two locks taken in sequence would leave a window between them in which a webhook
	 * could settle the payment — after the refusal check had already decided the order was not
	 * gateway-tracked.
	 *
	 * @param Lock          $lock     The held per-order lock.
	 * @param int           $order_id Order id.
	 * @param string        $status   `none` or `paid`.
	 * @param string        $actor    Activity actor.
	 * @param callable|null $in_tx    Optional extra write that must commit or roll back with this one.
	 * @return string The order's payment status afterwards.
	 * @throws PaymentException   When the order is gateway-tracked or has vanished.
	 * @throws PaymentLockTimeout When the lock's connection identity is lost mid-section (E1).
	 * @throws \Throwable         Re-thrown after ROLLBACK when a durable write fails.
	 */
	public function markManualUnderLock( Lock $lock, int $order_id, string $status, string $actor, ?callable $in_tx = null ): string {
		// phpcs:enable Squiz.Commenting.FunctionCommentThrowTag.WrongNumber
		$order = $this->orders->find( $order_id );
		if ( null === $order ) {
			throw PaymentException::state();
		}
		if ( $this->transactions->hasAnyCharge( $order_id ) ) {
			throw PaymentException::state();
		}

		$current = (string) $order['payment_status'];
		if ( $current === $status ) {
			if ( null !== $in_tx ) {
				$this->runInTransaction( $in_tx, $lock );
			}

			return $current;
		}

		$booking_id = $this->orders->bookingIdFor( $order_id );

		$this->assertLockIntact( $lock );
		$this->tx->begin();
		try {
			$this->orders->markManualPaymentStatus( $order_id, $status, $current );
			$this->activities->log(
				'booking',
				$booking_id,
				'payment_status_changed',
				array(
					'from' => $current,
					'to'   => $status,
				),
				$actor
			);
			if ( null !== $in_tx ) {
				$in_tx();
			}
			$this->assertLockIntact( $lock );
			$this->tx->commit();
		} catch ( \Throwable $failure ) {
			$this->tx->rollback();
			throw $failure;
		}

		return $status;
	}

	/**
	 * Run a caller-supplied write in its own transaction (the no-payment-change branch of
	 * {@see self::markManual()}).
	 *
	 * @param callable $in_tx Write to run.
	 * @param Lock     $lock  The held per-order lock.
	 * @throws \Throwable Re-thrown after ROLLBACK when the caller's write fails.
	 */
	private function runInTransaction( callable $in_tx, Lock $lock ): void {
		$this->assertLockIntact( $lock );
		$this->tx->begin();
		try {
			$in_tx();
			$this->assertLockIntact( $lock );
			$this->tx->commit();
		} catch ( \Throwable $failure ) {
			$this->tx->rollback();
			throw $failure;
		}
	}

	// -- Core application ------------------------------------------------------------------------

	/**
	 * Apply a gateway outcome to an order. MUST be called under the per-order lock.
	 *
	 * @param int            $order_id Order id.
	 * @param string         $gateway  Module code.
	 * @param PaymentOutcome $outcome  What the gateway reported.
	 * @param int            $txn_id   Charge row to resolve (0 = look one up / create one).
	 * @param Lock           $lock     The held per-order lock (identity re-verified around writes).
	 * @return string `applied`, `duplicate`, `mismatch` or `skipped`.
	 * @throws \Throwable Re-thrown after ROLLBACK when a durable write fails.
	 */
	private function applyOutcome( int $order_id, string $gateway, PaymentOutcome $outcome, int $txn_id, Lock $lock ): string {
		if ( ! $outcome->isRecognized() ) {
			return 'skipped';
		}

		if ( PaymentOutcome::PAID !== $outcome->status ) {
			if ( in_array( $outcome->status, array( PaymentOutcome::FAILED, PaymentOutcome::EXPIRED ), true ) ) {
				$row = $txn_id > 0 ? $this->transactions->find( $txn_id ) : $this->transactions->pendingCharge( $order_id );
				if ( is_array( $row ) && in_array( (string) $row['status'], TransactionRepository::IN_FLIGHT, true ) ) {
					$code = '' === $outcome->failure_code ? $outcome->status : $outcome->failure_code;
					$this->assertLockIntact( $lock );
					// A DECLINE KEEPS THE ROW'S `client_params`, AN EXPIRY DOES NOT (D-R40g). The hold
					// is not released here either way — that is the expiry cron's job alone — so a
					// declined attempt is still the order's live one and the customer is very often
					// about to try another card on the same reference. It must not be handed a `begin`
					// block with nothing in it.
					$this->safeFail( (int) $row['id'], $code, PaymentOutcome::FAILED === $outcome->status );

					return 'applied';
				}

				// The row is already RETIRED, and the driver still has something better to say
				// (D-R40b). The case that needs this is `hold_released`: the hold was released
				// first — by the expiry cron, or by the customer's own cancel — which marked the
				// charge `expired`/`cancelled`, and only THEN did the confirm leg arrive and the
				// driver refuse to charge. Both of those stored codes fold to `other` at the
				// response boundary, so the customer would be shown a generic failure with a retry
				// button for a slot that no longer exists; `hold_released` is in the closed
				// vocabulary precisely so the widget can offer another TIME instead.
				//
				// Strictly an UPGRADE, never a downgrade: it only fires when the driver's code is
				// one the response vocabulary knows and the stored one is not, so an operator never
				// loses a specific provider token to a vaguer one. Same shape as the repeat-decline
				// refresh in `applyEvent()` — only the operational column moves.
				$this->refreshRetiredFailure( $order_id, $outcome->failure_code, $lock );
			}

			// A PENDING outcome that CARRIES a reason still has something to say (2026-09-05). The
			// row stays `pending` — nothing has been decided, the hold is alive and a later retrieve
			// or webhook can still settle it — but the reason is written down, because otherwise the
			// confirm leg answers `pending` with no explanation and `unverified_amount` (whose whole
			// message is "do NOT pay again until we have checked") never reaches the customer at all.
			// An ordinary `processing` carries no code and leaves the row exactly as it was.
			if ( PaymentOutcome::PENDING === $outcome->status && '' !== $outcome->failure_code ) {
				$row = $txn_id > 0 ? $this->transactions->find( $txn_id ) : $this->transactions->pendingCharge( $order_id );
				if ( is_array( $row ) && TransactionRepository::STATUS_PENDING === (string) $row['status'] ) {
					$this->assertLockIntact( $lock );
					try {
						$this->transactions->noteInFlightFailure( (int) $row['id'], $outcome->failure_code );
					} catch ( StorageException $failure ) {
						unset( $failure ); // Best effort: an unwritable note must not fail the request.
					}
				}
			}

			return 'skipped';
		}

		$order = $this->orders->find( $order_id );
		if ( null === $order ) {
			return 'skipped';
		}

		if ( in_array( (string) $order['payment_status'], array( 'paid', 'partial', 'refunded' ), true ) ) {
			// RECOVERY (Codex M): a reclaimed event whose order is already paid but whose `created`
			// mail never reached the outbox is the fingerprint of a worker that committed the payment
			// and died before queueing. Re-queue idempotently — the dispatch keys are unique, so a
			// booking that DID get its mail answers `duplicate` and nothing is sent twice.
			$this->recoverDeferredCreated( $order_id );

			return 'duplicate';
		}

		// STRICT (Codex #9). A PAID outcome must report the order's exact amount in the order's
		// currency. The earlier tolerance — "a REPORTED amount must be right, but need not be
		// reported" — let a driver settle an order on the strength of a bare `paid`, which is the one
		// assertion this system must never take on trust: it is the difference between "the customer
		// paid what they owed" and "something happened at the gateway". A driver whose first response
		// omits the figures must fetch the authoritative object before answering (extension-surface
		// §5b.2).
		$expected_amount   = (int) $order['total_minor'];
		$expected_currency = strtoupper( (string) $order['currency'] );
		$matches           = $outcome->amount_minor === $expected_amount
			&& '' !== $outcome->currency
			&& strtoupper( $outcome->currency ) === $expected_currency;

		if ( ! $matches ) {
			$row = $txn_id > 0 ? $this->transactions->find( $txn_id ) : $this->transactions->pendingCharge( $order_id );
			if ( is_array( $row ) ) {
				$this->safeFail( (int) $row['id'], 'amount_mismatch' );
			}
			$this->anomaly( $gateway, $order_id, 'amount_mismatch' );

			return 'mismatch';
		}

		$booking_id = $this->orders->bookingIdFor( $order_id );
		$booking    = $booking_id > 0 ? $this->bookings->find( $booking_id ) : null;

		// LATE PAYMENT is decided on BOTH facts (Codex #11): the order may still read `pending`
		// because `pending_auto_cancel_hours` cancelled the booking without touching the order, and
		// treating that as an ordinary hold would "confirm" a cancelled appointment and mail the
		// customer about a booking that no longer exists. The booking half goes through the shared
		// blocking predicate (D-R40c) — the same one `holdIsOpen()` asks, so the question "does this
		// appointment still occupy its slot" has exactly one answer in this class.
		$is_live_hold = 'pending' === (string) $order['payment_status'] && $this->bookingHoldsSlot( $booking );

		$this->assertLockIntact( $lock );
		$this->tx->begin();
		try {
			$row = $txn_id > 0 ? $this->transactions->find( $txn_id ) : $this->transactions->pendingCharge( $order_id );
			if ( is_array( $row ) && in_array( (string) $row['status'], TransactionRepository::IN_FLIGHT, true ) ) {
				$this->transactions->markSucceeded( (int) $row['id'], $outcome->payment_ref, $outcome->gateway_ref );
			} else {
				// No in-flight row: a webhook can be the FIRST thing this site hears about a payment
				// (a browser that never came back, an intent created by a request that then died).
				$sequence = $this->transactions->nextSequence( $order_id, TransactionRepository::KIND_CHARGE );
				$new_id   = $this->transactions->insertPending(
					$order_id,
					$booking_id > 0 ? $booking_id : null,
					$gateway,
					TransactionRepository::KIND_CHARGE,
					$expected_amount,
					(string) $order['currency'],
					PaymentRegistry::idempotencyKey( $order_id, TransactionRepository::KIND_CHARGE, $sequence )
				);
				$this->transactions->markSucceeded( $new_id, $outcome->payment_ref, $outcome->gateway_ref );
			}

			// PAID IS TERMINAL FOR THE WHOLE ORDER (D-R40g). `markSucceeded()` clears the settling
			// row's own parameters; this clears the ones a DECLINED earlier attempt is now allowed to
			// keep. Nobody is going to be asked to pay on this order again, so nothing here has a
			// reader left. Both writes keep the DURABLE subset — the `mode` the money went to, which a
			// cross-environment refund is refused on months later (D-R39c, Codex A.3) — so the two can
			// safely share this transaction.
			$this->transactions->clearClientParams( $order_id );

			if ( ! $this->orders->markPaid( $order_id, $gateway, $outcome->payment_ref ) ) {
				$this->tx->rollback();

				return 'duplicate';
			}

			$this->activities->log(
				'booking',
				$booking_id,
				$is_live_hold ? 'payment_received' : 'payment_received_after_expiry',
				array(
					'gateway' => $gateway,
					'amount'  => $expected_amount,
					'ref'     => $outcome->payment_ref,
				),
				'gateway:' . $gateway
			);

			// THE OUTBOX RIDES THE PAYMENT (Codex M). Queued INSIDE this transaction, so a worker that
			// commits the money and then dies cannot leave a paid booking nobody was told about — the
			// same transactional-outbox guarantee `queueCreated()` gives an ordinary reservation
			// (REST-1/V3). Only the jobs that do not depend on the transition go here: the admin and
			// staff copies always, and the customer's `received` copy when auto-confirm is OFF (with
			// it on, the transition below queues `booking_confirmed_customer` in its own transaction).
			if ( $is_live_hold && $booking instanceof Booking ) {
				$this->notifications->queueDeferredCreated( $booking, ! $this->autoConfirms() );
			}

			$this->assertLockIntact( $lock );
			$this->tx->commit();
		} catch ( \Throwable $failure ) {
			$this->tx->rollback();
			throw $failure;
		}

		// Post-commit, still under the per-order lock.
		if ( $is_live_hold ) {
			$this->confirmPaidBooking( $booking_id, $gateway );
		} else {
			$this->announceLatePayment( $booking_id, $gateway );
		}

		return 'applied';
	}

	/**
	 * Confirm a booking whose hold has just been paid, and release the notifications the hold
	 * suppressed (D-R38j).
	 *
	 * @param int    $booking_id Booking id.
	 * @param string $gateway    Module code (the actor recorded on the transition).
	 */
	private function confirmPaidBooking( int $booking_id, string $gateway ): void {
		$booking = $booking_id > 0 ? $this->bookings->find( $booking_id ) : null;
		if ( ! $booking instanceof Booking ) {
			return;
		}

		if ( 'pending' === $booking->status && $this->autoConfirms() ) {
			try {
				// Queues `booking_confirmed_customer` inside its OWN transaction (V3 outbox); the
				// admin/staff copies were already queued with the payment (Codex M).
				$this->status->transition( $booking_id, 'confirmed', 'gateway:' . $gateway, '', false, 'send' );
			} catch ( DomainException $failure ) {
				unset( $failure ); // Someone else moved it; the payment stands either way.
			}
		}

		$this->notifications->flushBooking( $booking_id );
	}

	/**
	 * Re-queue the `created` jobs a crashed worker never got to (Codex M).
	 *
	 * Idempotent by construction: `queueDeferredCreated()` claims the same unique dispatch keys the
	 * original attempt would have, so a booking whose mail DID land answers `duplicate` and nothing is
	 * sent twice. The ledger check first keeps the common path to one indexed read.
	 *
	 * @param int $order_id Order id.
	 */
	private function recoverDeferredCreated( int $order_id ): void {
		$booking_id = $this->orders->bookingIdFor( $order_id );
		if ( $booking_id <= 0 || $this->notifications->hasCreatedDeliveries( $booking_id ) ) {
			return;
		}

		$booking = $this->bookings->find( $booking_id );
		if ( ! $this->bookingHoldsSlot( $booking ) || ! $booking instanceof Booking ) {
			return;
		}

		$this->notifications->queueDeferredCreated( $booking, 'confirmed' !== $booking->status );
		$this->notifications->flushBooking( $booking_id );
	}

	/**
	 * Tell the owner that money arrived for a booking that had already been released (D-R38h).
	 *
	 * The booking is NOT resurrected: the slot may already belong to somebody else, and quietly
	 * re-creating the appointment would double-book a stranger.
	 *
	 * @param int    $booking_id Booking id.
	 * @param string $gateway    Module code.
	 */
	private function announceLatePayment( int $booking_id, string $gateway ): void {
		$this->anomaly( $gateway, $this->orderIdFor( $booking_id ), 'late_payment' );

		$booking = $booking_id > 0 ? $this->bookings->find( $booking_id ) : null;
		if ( ! $booking instanceof Booking ) {
			return;
		}

		$this->notifications->queueModuleMessage(
			'payment_late',
			(string) $booking_id,
			array(
				'key'            => 'payment_late_admin',
				'recipient_kind' => 'admin',
				'subject'        => __( 'Payment received for a booking that had expired', 'aponto' ),
				'body'           => __(
					"A payment arrived after this booking's hold had already expired, so the appointment was released and is NOT booked.\n\nService: {service_name}\nWhen: {booking_date} {booking_time}\nCustomer: {customer_name} ({customer_email})\nReference: {order_code}\nAmount paid: {amount_paid}\n\nPlease refund the customer or re-book them.",
					'aponto'
				),
			),
			$booking,
			array()
		);
		$this->notifications->flushBooking( $booking_id );
	}

	/**
	 * Queue the refund notice for a booking.
	 *
	 * @param int $booking_id     Booking id.
	 * @param int $transaction_id Refund transaction id — the discriminator (Codex #15).
	 * @param int $amount_minor   Refunded amount in minor units.
	 */
	private function notifyRefund( int $booking_id, int $transaction_id, int $amount_minor ): void {
		$booking = $booking_id > 0 ? $this->bookings->find( $booking_id ) : null;
		if ( ! $booking instanceof Booking ) {
			return;
		}
		$this->notifications->queuePaymentRefunded( $booking, $transaction_id, $amount_minor );
		$this->notifications->flushBooking( $booking_id );
	}

	// -- Shared helpers --------------------------------------------------------------------------

	/**
	 * Cancel the booking behind a released hold, then flush its mail.
	 *
	 * @param int    $booking_id Booking id.
	 * @param string $reason     Machine reason recorded on the transition.
	 */
	private function cancelBooking( int $booking_id, string $reason ): void {
		$booking = $booking_id > 0 ? $this->bookings->find( $booking_id ) : null;
		if ( ! $booking instanceof Booking || 'pending' !== $booking->status ) {
			return;
		}

		try {
			$this->status->transition( $booking_id, 'cancelled', 'system', $reason, false, 'send' );
			$this->notifications->flushBooking( $booking_id );
		} catch ( DomainException $failure ) {
			unset( $failure ); // Already moved by a concurrent actor.
		}
	}

	/**
	 * Acquire the per-order lock or fail with the retryable lock-timeout error.
	 *
	 * @param int $order_id Order id.
	 * @throws PaymentLockTimeout When the lock cannot be taken.
	 */
	private function acquire( int $order_id ): Lock {
		$lock = $this->locks->forOrder( $order_id );
		if ( ! $lock->acquire( self::LOCK_TIMEOUT ) ) {
			throw new PaymentLockTimeout();
		}

		return $lock;
	}

	/**
	 * Verify the held lock still belongs to the CURRENT database connection (E1).
	 *
	 * Advisory locks die with their connection and wpdb silently reconnects on "server has gone
	 * away"; after that the critical section believes it holds a lock that is gone, and every write
	 * it makes is unserialized. Called before the first write of a section and again immediately
	 * before COMMIT — the `ReservationService::assertLocksIntact()` / `ProjectionLease::covers()`
	 * pattern, applied to money.
	 *
	 * @param Lock $lock The lock this section is running under.
	 * @throws PaymentLockTimeout When identity is lost.
	 */
	private function assertLockIntact( Lock $lock ): void {
		$current = $this->tx->currentConnectionId();
		if ( null === $current || $lock->connectionId() !== $current ) {
			throw new PaymentLockTimeout();
		}
	}

	/**
	 * Build a per-attempt driver context.
	 *
	 * @param string $key    Stable idempotency key.
	 * @param string $verb   Verb being dispatched.
	 * @param bool   $inline Whether this runs on a visitor-facing request.
	 */
	private function context( string $key, string $verb, bool $inline ): PaymentContext {
		$budget = $inline ? self::INLINE_BUDGET : self::CRON_BUDGET;

		return new PaymentContext( $key, $verb, 1, $this->clock->now()->getTimestamp() + $budget, $inline );
	}

	/**
	 * Resolve which order a webhook event is about (Codex #13).
	 *
	 * LOCAL REFERENCES FIRST, and only local references may resolve. The first cut trusted the order
	 * code out of gateway metadata, which is attacker-influenced in a way the references are not: a
	 * verified event carrying somebody else's order code would have been applied to that order. Now
	 * the resolution is `(gateway, gateway_ref)` then `(gateway, payment_ref)` against rows THIS site
	 * wrote, and the metadata is only a CONSISTENCY CHECK — present and disagreeing means the event
	 * is ignored and an anomaly is recorded, never that the metadata wins.
	 *
	 * @param string       $gateway Module code.
	 * @param WebhookEvent $event   Event.
	 */
	private function resolveOrder( string $gateway, WebhookEvent $event ): int {
		// EVERY non-empty reference is resolved, and they must AGREE (Codex I). Taking the first hit
		// and stopping meant an event whose `gateway_ref` belonged to one order and whose
		// `payment_ref` belonged to another was applied to whichever happened to be looked up first —
		// a coin toss between two real orders, decided by lookup order rather than by evidence.
		$candidates = array();
		foreach (
			array(
				$this->transactions->findByGatewayRef( $gateway, $event->gateway_ref ),
				$this->transactions->findByPaymentRef( $gateway, $event->payment_ref ),
				$this->transactions->findRefundByRef( $gateway, $event->payment_ref ),
			) as $found
		) {
			if ( is_array( $found ) ) {
				$candidates[ (int) $found['order_id'] ] = $found;
			}
		}

		if ( array() === $candidates ) {
			return 0;
		}
		if ( count( $candidates ) > 1 ) {
			$this->anomaly( $gateway, (int) array_key_first( $candidates ), 'reference_conflict' );

			return 0;
		}

		$row      = reset( $candidates );
		$order_id = (int) $row['order_id'];
		$order    = $this->orders->find( $order_id );
		if ( null === $order ) {
			return 0;
		}

		if ( '' !== $event->order_code && (string) $order['code'] !== $event->order_code ) {
			$this->anomaly( $gateway, $order_id, 'reference_conflict' );

			return 0;
		}

		if ( $event->booking_id > 0 && $this->orders->bookingIdFor( $order_id ) !== $event->booking_id ) {
			$this->anomaly( $gateway, $order_id, 'reference_conflict' );

			return 0;
		}

		return $order_id;
	}

	/**
	 * The public state payload the confirm route answers with (rest-contract §3.8).
	 *
	 * @param int $order_id Order id.
	 * @return array<string, mixed>
	 */
	private function stateFor( int $order_id ): array {
		$order      = $this->orders->find( $order_id );
		$booking_id = $this->orders->bookingIdFor( $order_id );
		$booking    = $booking_id > 0 ? $this->bookings->find( $booking_id ) : null;

		$state = array(
			'order_code'     => null === $order ? '' : (string) $order['code'],
			'payment_status' => null === $order ? 'none' : (string) $order['payment_status'],
			'booking_status' => $booking instanceof Booking ? $booking->status : '',
			'expires_at'     => null === $order ? null : $this->iso( $this->holdExpiry( $order ) ),
		);

		// ADDITIVE (Codex Q, rest-contract §3.8): why the last attempt failed, so the widget can say
		// something the customer can act on instead of "payment failed". Present only when the order
		// is NOT settled and the latest charge actually carries a reason — a paid order has nothing
		// to explain — and REDACTED to the closed vocabulary at the boundary, because a gateway's own
		// decline text is written for a merchant dashboard and can quote the cardholder's own data.
		if ( ! in_array( $state['payment_status'], array( 'paid', 'partial', 'refunded' ), true ) ) {
			$latest = $this->transactions->latestCharge( $order_id );
			$stored = is_array( $latest ) ? (string) $latest['failure_code'] : '';
			$reason = PaymentOutcome::normalizeFailureCode( $stored );

			// A row still IN FLIGHT only repeats a reason the vocabulary actually knows (2026-09-05).
			// On a `failed` row `other` is honest — something went wrong and core cannot say what. On
			// a `pending` one it is a lie: nothing has gone wrong, and the widget renders `other` as a
			// failure with a retry button. So an operator-facing code that folds to `other` stays in
			// the column, where it is searchable, and out of the response.
			if ( is_array( $latest )
				&& TransactionRepository::STATUS_PENDING === (string) $latest['status']
				&& $reason !== $stored ) {
				$reason = '';
			}

			if ( '' !== $reason ) {
				$state['failure_code'] = $reason;
			}
		}

		return $state;
	}

	/**
	 * A compact order summary for the refund response.
	 *
	 * @param int $order_id Order id.
	 * @return array<string, mixed>
	 */
	private function orderSummary( int $order_id ): array {
		$order = $this->orders->find( $order_id );
		if ( null === $order ) {
			return array();
		}

		return array(
			'id'             => (int) $order['id'],
			'payment_status' => (string) $order['payment_status'],
			'total_minor'    => (int) $order['total_minor'],
			'currency'       => (string) $order['currency'],
			'refunded_minor' => $this->transactions->settledRefundMinor( $order_id ),
		);
	}

	/**
	 * The `payment` block for a gateway that could not be reached (rest-contract §3.3).
	 *
	 * `expires_at` CARRIES THE LIVE HOLD (QA BUG-5). rest-contract §3.3 says of this status that the
	 * booking exists and the hold is alive, and that the customer may retry until `expires_at` — so
	 * hard-coding `null` withheld the deadline on exactly the screen where the gateway has just
	 * failed and retrying is the whole job. It stays `null` when there is genuinely no hold: an order
	 * that never got one, or one whose hold has already been released.
	 *
	 * `retryable` IS ADDITIVE AND DEFAULTS TO TRUE (D-R40d, QA run 2 BUG-3). `unavailable` covers two
	 * very different situations — a gateway that was momentarily unreachable, and one that has
	 * REFUSED this order's amount or currency outright — and the block said the same thing about
	 * both: "your slot is held until 3:45 PM", i.e. try again, for a refusal that is the same every
	 * time. `false` is the widget's signal to stop inviting a retry. A client that does not know the
	 * field behaves exactly as before.
	 *
	 * @param string $gateway   Module code.
	 * @param int    $order_id  Order the block is about, or 0 when there is none.
	 * @param bool   $retryable    Whether trying again could plausibly succeed.
	 * @param string $failure_code Closed-vocabulary reason, when there is one to give.
	 * @return array<string, mixed>
	 */
	private function unavailableBlock( string $gateway, int $order_id = 0, bool $retryable = true, string $failure_code = '' ): array {
		$order = $order_id > 0 ? $this->orders->find( $order_id ) : null;

		$block = array(
			'gateway'       => $gateway,
			'status'        => 'unavailable',
			'gateway_ref'   => '',
			'client_params' => (object) array(),
			'expires_at'    => null === $order ? null : $this->iso( $this->holdExpiry( $order ) ),
			'retryable'     => $retryable,
		);

		// ADDITIVE and only when there is something to say (D-R39c). `unavailable` has always been
		// several situations wearing one word; `retryable` split the two that differ in what the
		// widget should OFFER, and this names the one case where the customer has to be told
		// something else entirely — the deadline has passed, so there is nothing to retry.
		$code = PaymentOutcome::normalizeFailureCode( $failure_code );
		if ( '' !== $code ) {
			$block['failure_code'] = $code;
		}

		return $block;
	}

	/**
	 * `client_params` in the shape rest-contract §3.3 documents: an OBJECT, never an empty array.
	 *
	 * PHP's empty array serialises as JSON `[]`, so a block with no parameters contradicted the
	 * contract — which documents `{}` on `unavailable`, where {@see self::unavailableBlock()} has
	 * always cast — and handed the widget a value of a different TYPE depending on how many keys it
	 * had. The same cast on the two `begin` returns makes the field one shape everywhere. It is
	 * defensive as of D-R40g: a `begin` whose parameters had been destroyed by a decline was how the
	 * empty case was reached in practice, and that no longer happens.
	 *
	 * @param array<string, string> $params Stored or driver-supplied parameters.
	 * @return array<string, string>|\stdClass
	 */
	private static function paramsBlock( array $params ) {
		return array() === $params ? (object) array() : $params;
	}

	/**
	 * What a settled REFUND row stores in `payment_ref` (D-R40d, QA run 2 BUG-5).
	 *
	 * The contract (rest-contract §2.21) documents a refund transaction as `gateway_ref: re_123,
	 * payment_ref: pi_123` — the refund's own id, and the reference of the charge it gives back. The first cut put
	 * the refund id in `payment_ref` and left `gateway_ref` empty, so the row recorded WHAT was
	 * refunded nowhere and the contract said something the API did not. `gateway_ref` is now the
	 * refund id at every write site; this is the other half.
	 *
	 * The refund id is the FALLBACK rather than an empty string, because a row with no reference at
	 * all is worse than one with a duplicated reference: `markSucceeded()` writes `payment_ref`
	 * unconditionally, and a charge that settled without a payment reference would otherwise blank
	 * the only handle the row has.
	 *
	 * @param array<string, mixed>|null $charge     The originating charge row, when known.
	 * @param string                    $refund_ref The gateway's refund reference.
	 */
	private static function refundPaymentRef( ?array $charge, string $refund_ref ): string {
		$ref = is_array( $charge ) ? (string) ( $charge['payment_ref'] ?? '' ) : '';
		if ( '' === $ref && is_array( $charge ) ) {
			$ref = (string) ( $charge['gateway_ref'] ?? '' );
		}

		return '' === $ref ? $refund_ref : $ref;
	}

	/**
	 * The machine reason for a begin failure that WILL happen again, or `''` when retrying could work
	 * (D-R40d, QA run 2 BUG-3; classifier corrected by D-R40e, Codex #4 and #6).
	 *
	 * **THE CLASSIFIER IS AN EXPLICIT DRIVER FLAG, NOT AN HTTP STATUS.** The first cut read `422` as
	 * "unrepresentable", which is true of the status a driver mints for its OWN precision and
	 * currency refusals and false of the `422` a PROVIDER sends: an unprocessable-entity about
	 * merchant-account state clears the moment the account is fixed, and meanwhile the charge row had
	 * been closed `failed` and the widget had dropped the retry button on a hold that was still
	 * alive. A driver now says so itself — `deterministic_refusal => true` in the `WP_Error` data —
	 * and everything without that flag stays retryable, which is the safe default because the cost of
	 * a needless retry is one HTTP call and the cost of a wrong refusal is the booking.
	 *
	 * **AND CORE READS `reason`, NOTHING ELSE (Codex #6).** The fallback used to strip a driver
	 * prefix off the error code with a regex naming the two built-in gateways, which put the name of
	 * a PREMIUM module into free-shipped core and gave a third-party driver different normalization
	 * from the built-ins. Core sanitizes the published field to the closed alphabet `failure_code`
	 * holds and does not parse error codes at all; a driver that flags a refusal without naming a
	 * reason gets the generic one.
	 *
	 * @param WP_Error $error Driver failure.
	 */
	private static function refusalCode( WP_Error $error ): string {
		$data = $error->get_error_data();
		if ( ! is_array( $data ) || true !== ( $data['deterministic_refusal'] ?? null ) ) {
			return '';
		}

		$raw   = isset( $data['reason'] ) && is_string( $data['reason'] ) ? $data['reason'] : '';
		$clean = mb_substr( (string) preg_replace( '/[^a-z0-9_]/', '', strtolower( $raw ) ), 0, 64 );

		return '' === $clean ? 'refused' : $clean;
	}

	/**
	 * Write the operator-facing activity line for a deterministic begin refusal (QA run 2 BUG-3).
	 *
	 * Reuses the existing booking activity channel rather than adding a REST route: the person who
	 * has to act — "this gateway has no minor unit for HUF, round the service price" — is looking at the
	 * booking, and the amount that cannot be charged is a fact about that order.
	 *
	 * @param int    $booking_id Booking id.
	 * @param string $gateway    Module code.
	 * @param string $reason     Machine refusal code.
	 * @param int    $amount     Order total, minor units.
	 * @param string $currency   Order currency.
	 */
	private function logBeginRefusal( int $booking_id, string $gateway, string $reason, int $amount, string $currency ): void {
		if ( $booking_id <= 0 ) {
			return;
		}

		try {
			$this->activities->log(
				'booking',
				$booking_id,
				'payment_refused',
				array(
					'gateway'  => $gateway,
					'reason'   => $reason,
					'amount'   => $amount,
					'currency' => $currency,
				),
				'gateway:' . $gateway
			);
		} catch ( \Throwable $failure ) {
			unset( $failure ); // Best effort: an unwritable note must not change the customer's answer.
		}
	}

	/**
	 * Turn an apply outcome into the event-ledger status.
	 *
	 * @param string $applied  Outcome from the apply step.
	 * @param int    $order_id Order id.
	 * @return array{status: string, order_id: int}
	 */
	private function ledgerResult( string $applied, int $order_id ): array {
		$status = 'applied' === $applied ? PaymentEventLedger::STATUS_APPLIED : PaymentEventLedger::STATUS_IGNORED;
		if ( 'mismatch' === $applied ) {
			$status = PaymentEventLedger::STATUS_FAILED;
		}

		return array(
			'status'   => $status,
			'order_id' => $order_id,
		);
	}

	/**
	 * Whether a driver failure says "I could not VERIFY", not "this is not yours" (D-R40e, verify
	 * B.2).
	 *
	 * The flag is read, never inferred — the same rule as `deterministic_refusal` (Codex #4), and for
	 * the same reason: only the driver knows whether the object it could not read back is one it had
	 * just created. Core stays gateway-agnostic; it reads one boolean out of the `WP_Error` data and
	 * parses nothing else.
	 *
	 * @param WP_Error $error Driver failure.
	 */
	private static function isVerificationUnavailable( WP_Error $error ): bool {
		$data = $error->get_error_data();

		return is_array( $data ) && true === ( $data['verification_unavailable'] ?? null );
	}

	/**
	 * Park a live claim for a later verification round without letting a storage failure escape.
	 *
	 * A failure to write the mark is not a reason to fail the booking: the row simply stays a claim
	 * with no reference, and the ordinary stale-claim sweep retires it after the begin lease — the
	 * behaviour this path had before the mark existed.
	 *
	 * @param int    $txn_id Transaction id.
	 * @param string $lease  The `updated_at` this caller read.
	 */
	private function holdForVerification( int $txn_id, string $lease ): void {
		try {
			$this->transactions->holdForVerification( $txn_id, $lease );
		} catch ( StorageException $failure ) {
			unset( $failure );
		}
	}

	/**
	 * Mark a transaction failed without letting a storage failure escape a best-effort path.
	 *
	 * @param int    $txn_id    Transaction id.
	 * @param string $code      Failure code.
	 * @param bool   $retryable Whether the gateway reference stays usable on the still-open hold, in
	 *                          which case the row keeps its `client_params` (D-R40g). Only a DECLINE
	 *                          is: an expired session, an amount mismatch and an abandoned begin all
	 *                          leave nothing to confirm a second time.
	 */
	private function safeFail( int $txn_id, string $code, bool $retryable = false ): void {
		try {
			$this->transactions->markFailed( $txn_id, $code, $retryable );
		} catch ( StorageException $failure ) {
			unset( $failure );
		}
	}

	/**
	 * Mark a transaction failed OUTSIDE the lock, fenced on the lease the caller read (Codex D).
	 *
	 * Status alone is not enough evidence with no lock held: between the read and this write another
	 * actor can have taken the same row over, and both would then be writing to a row only one of
	 * them owns.
	 *
	 * @param int    $txn_id Transaction id.
	 * @param string $code   Failure code.
	 * @param string $lease  The `updated_at` this caller read ('' falls back to the status-only CAS).
	 */
	private function safeFailFenced( int $txn_id, string $code, string $lease ): void {
		try {
			if ( '' === $lease ) {
				$this->transactions->markFailed( $txn_id, $code );

				return;
			}
			$this->transactions->markFailedIfUnchanged( $txn_id, $code, $lease );
		} catch ( StorageException $failure ) {
			unset( $failure );
		}
	}

	/**
	 * Hand a `voiding` claim back without letting a storage failure escape.
	 *
	 * @param int    $txn_id Transaction id.
	 * @param string $lease  The `updated_at` of the claim this caller took ('' = status-only CAS).
	 */
	private function safeReleaseVoidClaim( int $txn_id, string $lease = '' ): void {
		try {
			$this->transactions->releaseVoidClaim( $txn_id, $lease );
		} catch ( StorageException $failure ) {
			unset( $failure ); // The lease expires on its own; the next tick reclaims it.
		}
	}

	/**
	 * Record that a hold's `void` will not resolve, and escalate it ONCE (D-R40c).
	 *
	 * Inside the grace this does nothing at all: the answer may be seconds away, every tick retries,
	 * and a log line per tick per stuck order is noise that hides the finding it is supposed to be.
	 * Past it three things happen together — the `void_unresolved` anomaly, one admin "payment needs
	 * review" message, and the marker whose value backs the order off to hourly retries. The anomaly
	 * fires once per order (the marker's insert is the lock); the MESSAGE is re-attempted on every
	 * due retry, because at-most-once is already guaranteed by its dispatch key and a marker written
	 * before a queue that failed would otherwise lose the escalation permanently.
	 *
	 * Measured from the hold's own DEADLINE rather than from the first failure, because that is the
	 * value already stored and the one an operator can reason about: "this slot has been stuck for
	 * six hours" is a sentence, "this void has failed eleven times" is not. An order with no readable
	 * deadline is never escalated — the missing value is the unknown here, and an unknown must not be
	 * the reason somebody is mailed about a payment that may be perfectly fine.
	 *
	 * @param int    $order_id Order id.
	 * @param string $gateway  Module code.
	 */
	private function noteUnresolvedVoid( int $order_id, string $gateway ): void {
		$order    = $this->orders->find( $order_id );
		$deadline = null === $order ? null : $this->holdExpiry( $order );
		if ( null === $deadline ) {
			return;
		}

		$stuck_for = $this->clock->now()->getTimestamp() - $deadline->getTimestamp();
		if ( $stuck_for < self::VOID_UNRESOLVED_GRACE_HOURS * HOUR_IN_SECONDS ) {
			return;
		}

		$booking_id = $this->orders->bookingIdFor( $order_id );
		if ( $booking_id <= 0 ) {
			return;
		}

		try {
			$first = $this->meta->insertIfAbsent( $booking_id, OrderRepository::VOID_UNRESOLVED_META_KEY, $this->clock->nowSql() );
		} catch ( StorageException $failure ) {
			unset( $failure ); // An unwritable marker must not fail the tick; the hold is kept either way.

			return;
		}

		if ( $first ) {
			$this->anomaly( $gateway, $order_id, 'void_unresolved' );
		} else {
			// Already reported. Only the backoff clock moves, so the next attempt is an hour out.
			$this->meta->setKey( $booking_id, OrderRepository::VOID_UNRESOLVED_META_KEY, $this->clock->nowSql() );
		}

		// THE MESSAGE IS RE-ATTEMPTED ON EVERY DUE RETRY, the anomaly is not (verify round 2).
		// The marker was written BEFORE the mail was queued, so a queue that failed exactly once —
		// an outbox claim that lost its connection, a storage error `queueModuleMessage()` swallows
		// and reports as an outcome nobody read — burned the one chance an operator had of hearing
		// about a hold that will never resolve by itself. The dispatch key is unique per
		// `(trigger, booking, key)`, so re-attempting cannot mail anyone twice; the marker's job is
		// the hourly BACKOFF and the once-per-order anomaly, and it keeps both.
		$this->announceUnresolvedVoid( $booking_id );
	}

	/**
	 * Whether an ESCALATED order's `void` is inside its hourly backoff (D-R40c).
	 *
	 * A marker that cannot be read is treated as absent — the retry is cheap and the alternative,
	 * skipping an order because a query failed, is a hold that stops being looked at.
	 *
	 * @param int $order_id Order id.
	 */
	private function voidRetryBackoffActive( int $order_id ): bool {
		$booking_id = $this->orders->bookingIdFor( $order_id );
		if ( $booking_id <= 0 ) {
			return false;
		}

		$stamp = $this->meta->getKey( $booking_id, OrderRepository::VOID_UNRESOLVED_META_KEY );
		if ( null === $stamp || '' === $stamp ) {
			return false;
		}

		return $stamp > $this->clock->now()
			->sub( new \DateInterval( 'PT' . self::VOID_RETRY_BACKOFF_HOURS . 'H' ) )
			->format( 'Y-m-d H:i:s' );
	}

	/**
	 * Tell the owner that a hold cannot be resolved and needs a human (D-R40c).
	 *
	 * Reuses the module-message seam and the inline-copy shape {@see self::announceLatePayment()}
	 * already uses, deliberately: this is an operational exception, not a lifecycle email, and giving
	 * it a seeded template would put a message in the notifications editor that a site should
	 * ideally never see. The dispatch key is unique per `(trigger, booking)`, so even if the marker
	 * were lost the mail could not be sent twice.
	 *
	 * @param int $booking_id Booking id.
	 */
	private function announceUnresolvedVoid( int $booking_id ): void {
		$booking = $booking_id > 0 ? $this->bookings->find( $booking_id ) : null;
		if ( ! $booking instanceof Booking ) {
			return;
		}

		$this->notifications->queueModuleMessage(
			'payment_review',
			(string) $booking_id,
			array(
				'key'            => 'payment_review_admin',
				'recipient_kind' => 'admin',
				'subject'        => __( 'A booking payment needs review', 'aponto' ),
				'body'           => __(
					"This booking's payment hold has expired, but the payment gateway will not confirm what happened to the payment, so the appointment has NOT been released.\n\nService: {service_name}\nWhen: {booking_date} {booking_time}\nCustomer: {customer_name} ({customer_email})\nReference: {order_code}\n\nCheck this order in your payment gateway's dashboard. If the customer was charged, refund them or keep the appointment; if they were not, cancel the booking here and the appointment will be released.",
					'aponto'
				),
			),
			$booking,
			array()
		);
		$this->notifications->flushBooking( $booking_id );
	}

	/**
	 * Hand a `capturing` claim back without letting a storage failure escape (D-R40c).
	 *
	 * @param int    $txn_id Transaction id.
	 * @param string $lease  The `updated_at` of the claim this caller took.
	 * @param string $status State to hand the row back to — `pending` (the outcome decides from
	 *                       there) or, on the no-outcome path, the state the claim was taken from.
	 */
	private function safeReleaseCaptureClaim( int $txn_id, string $lease, string $status = TransactionRepository::STATUS_PENDING ): void {
		try {
			$this->transactions->releaseCaptureClaim( $txn_id, $lease, $status );
		} catch ( StorageException $failure ) {
			unset( $failure ); // The lease expires on its own; a later void reclaims it.
		}
	}

	/**
	 * Put a RENDERABLE reason on an already-retired charge row (D-R40b).
	 *
	 * Best effort and deliberately narrow: it moves only the operational column, only when the
	 * latest charge is `failed`, and only when the driver's code is in the closed response
	 * vocabulary while the stored one is not. That last condition is what makes it an upgrade rather
	 * than a rewrite — `hold_released` replaces an `expired` the customer would have been shown as
	 * `other`, and nothing replaces a code the vocabulary already knows.
	 *
	 * `hold_released` ITSELF is the one exception, and it is not a decline (D-R40c(7)). Every other
	 * code in the vocabulary answers "why was the payment refused"; this one answers "there is no
	 * longer an appointment to pay for", which is a LATER and different fact, and the only one whose
	 * cure is another TIME rather than another card. A customer who was declined, waited past the
	 * deadline and then approved a second time would otherwise be shown their old decline and a
	 * restart button for a slot that is back on sale — a loop with no exit, which is exactly what
	 * putting the code in the closed vocabulary was meant to prevent.
	 *
	 * @param int    $order_id Order id.
	 * @param string $code     Failure code the driver reported.
	 * @param Lock   $lock     The per-order lock this write runs under.
	 */
	private function refreshRetiredFailure( int $order_id, string $code, Lock $lock ): void {
		if ( '' === $code || ! in_array( $code, PaymentOutcome::FAILURE_CODES, true ) ) {
			return;
		}

		$latest = $this->transactions->latestCharge( $order_id );
		if ( ! is_array( $latest ) || TransactionRepository::STATUS_FAILED !== (string) $latest['status'] ) {
			return;
		}

		$stored = (string) $latest['failure_code'];
		if ( 'hold_released' !== $code && in_array( $stored, PaymentOutcome::FAILURE_CODES, true ) ) {
			return; // Already something the customer can be told; do not overwrite it.
		}
		if ( $stored === $code ) {
			return;
		}

		$this->assertLockIntact( $lock );

		try {
			$this->transactions->refreshFailureCode( (int) $latest['id'], $code );
		} catch ( StorageException $failure ) {
			unset( $failure ); // Best effort: an unwritable note must not fail the confirm leg.
		}
	}

	/**
	 * Whether the reservation behind an order is still alive — {@see CaptureRequest::$hold_open}.
	 *
	 * DURABLE STATE, not the wall clock (D-R40b). The question a driver needs answered is "does the
	 * slot still exist", and the answer lives in two rows: the order is still `pending` (the expiry
	 * cron's `releaseHold()` compare-and-swaps it to `none` and NULLs the deadline), and the booking
	 * has not been cancelled. Reading `hold_expires_at` against `now()` instead would answer "no" for
	 * every payment that lands inside `EXPIRY_GRACE_MINUTES` — the grace window exists precisely so a
	 * customer who finished at the gateway a moment after the deadline is still charged and still
	 * gets their appointment, and this must not quietly undo it.
	 *
	 * A booking that a `pending_auto_cancel_hours` sweep cancelled without touching the order is the
	 * other half: the order can read `pending` with no appointment behind it, and capturing there
	 * would take money for nothing (the same pair of facts `applyOutcome()` calls the late-payment
	 * case).
	 *
	 * THE BOOKING TEST IS THE BLOCKING PREDICATE, not a list (D-R40c). It used to exclude `cancelled`
	 * alone, while `applyOutcome()` a few hundred lines away excluded `cancelled`, `completed` and
	 * `no_show` — two hand-written copies of one idea, and the shorter one guarded the charge. An
	 * admin who force-completes a future pending-payment booking gives its slot back to the calendar
	 * exactly as a cancel does ({@see BlockingPolicy}), and a money-moving capture would still have
	 * gone through for it.
	 * Asking the policy also means a site that ADDS a blocking status through
	 * `aponto_blocking_statuses` gets the right answer here for free.
	 *
	 * @param int                  $order_id Order id.
	 * @param array<string, mixed> $order    Order row, as just read by the caller.
	 */
	private function holdIsOpen( int $order_id, array $order ): bool {
		if ( 'pending' !== (string) ( $order['payment_status'] ?? '' ) ) {
			return false;
		}

		$booking_id = $this->orders->bookingIdFor( $order_id );
		if ( $booking_id <= 0 ) {
			return false;
		}

		return $this->bookingHoldsSlot( $this->bookings->find( $booking_id ) );
	}

	/**
	 * Whether a booking still OCCUPIES its slot — the one predicate, asked in one place (D-R40c).
	 *
	 * {@see BlockingPolicy} is the single source of truth for which statuses hold a slot, and it is
	 * what availability and reservation already ask. Every payment decision that turns on "is this
	 * appointment still a thing" asks it here rather than writing the status list out again: whether
	 * a capture may charge, whether a settled payment confirms a live hold or is a late payment, and
	 * whether a crashed worker's `created` mail is still worth sending.
	 *
	 * @param Booking|null $booking Booking, or null when there is none.
	 */
	/**
	 * Whether a hold is open AND still inside its deadline (D-R39c, Codex A.1).
	 *
	 * {@see self::holdIsOpen()} answers "does this appointment still exist and is it unpaid" — which
	 * a hold whose clock ran out five minutes ago also answers yes to, because the expiry cron has
	 * not reached it yet. Creating an intent there is how a customer pays for a slot the very next
	 * tick gives away: the money arrives, the booking is already cancelled, and the payment lands as
	 * a `late_payment` anomaly somebody has to refund by hand.
	 *
	 * The cron remains the ONLY thing that releases a hold. This predicate only refuses to start
	 * new work on one that is finished.
	 *
	 * @param int                  $order_id Order id.
	 * @param array<string, mixed> $order    Order row, as just read by the caller.
	 */
	private function holdIsLive( int $order_id, array $order ): bool {
		if ( ! $this->holdIsOpen( $order_id, $order ) ) {
			return false;
		}

		$expiry = $this->holdExpiry( $order );

		return null !== $expiry && $expiry->getTimestamp() > $this->clock->now()->getTimestamp();
	}

	/**
	 * Whether a booking still OCCUPIES its slot — the one predicate, asked in one place (D-R40c).
	 *
	 * {@see BlockingPolicy} is the single source of truth for which statuses hold a slot, and it is
	 * what availability and reservation already ask.
	 *
	 * @param Booking|null $booking Booking, or null when there is none.
	 */
	private function bookingHoldsSlot( ?Booking $booking ): bool {
		return $booking instanceof Booking
			&& in_array( $booking->status, ( new BlockingPolicy() )->statuses(), true );
	}

	/**
	 * The order's hold deadline as an instant, or null.
	 *
	 * Read with `??` so version-9 code runs against a version-8 database (the column arrives with
	 * Migration 0009) instead of fataling on a missing key.
	 *
	 * @param array<string, mixed> $order Order row.
	 */
	private function holdExpiry( array $order ): ?\DateTimeImmutable {
		$raw = (string) ( $order['hold_expires_at'] ?? '' );
		if ( '' === $raw ) {
			return null;
		}

		try {
			return new \DateTimeImmutable( $raw . ' UTC' );
		} catch ( \Exception $failure ) {
			unset( $failure );

			return null;
		}
	}

	/**
	 * RFC3339 rendering of an optional instant.
	 *
	 * @param \DateTimeImmutable|null $instant Instant.
	 */
	private function iso( ?\DateTimeImmutable $instant ): ?string {
		return null === $instant ? null : $instant->format( 'Y-m-d\TH:i:s\Z' );
	}

	/**
	 * The public order code, or ''.
	 *
	 * @param int $order_id Order id.
	 */
	private function orderCode( int $order_id ): string {
		$order = $this->orders->find( $order_id );

		return null === $order ? '' : (string) $order['code'];
	}

	/**
	 * The order id behind a booking, or 0.
	 *
	 * @param int $booking_id Booking id.
	 */
	private function orderIdFor( int $booking_id ): int {
		$order = $this->orders->findForBooking( $booking_id );

		return null === $order ? 0 : (int) $order['id'];
	}

	/**
	 * The customer's email, for gateway PREFILL only — never stored by core.
	 *
	 * @param int $customer_id Customer id.
	 */
	private function customerEmail( int $customer_id ): string {
		$table = $this->wpdb->prefix . 'aponto_customers';
		$sql   = "SELECT email FROM {$table} WHERE id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; id bound via prepare().
		return (string) $this->wpdb->get_var( $this->wpdb->prepare( $sql, $customer_id ) );
	}

	/**
	 * The service name shown on the gateway's own page.
	 *
	 * @param int $service_id Service id.
	 */
	private function serviceName( int $service_id ): string {
		$table = $this->wpdb->prefix . 'aponto_services';
		$sql   = "SELECT name FROM {$table} WHERE id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; id bound via prepare().
		return (string) $this->wpdb->get_var( $this->wpdb->prepare( $sql, $service_id ) );
	}

	/**
	 * The exception CLASS as a safe machine token — never its message (§5 invariant 8).
	 *
	 * @param \Throwable $failure The failure.
	 */
	private static function classToken( \Throwable $failure ): string {
		$parts = explode( '\\', get_class( $failure ) );

		return (string) preg_replace( '/[^a-z0-9_]/', '', strtolower( (string) end( $parts ) ) );
	}

	/**
	 * Record one payment anomaly under the allow-listed context (extension-surface §5b.4).
	 *
	 * @param string $gateway  Module code.
	 * @param int    $order_id Order id.
	 * @param string $code     Short machine reason.
	 */
	private function anomaly( string $gateway, int $order_id, string $code ): void {
		if ( ! $this->logger instanceof Logger ) {
			return;
		}
		$this->logger->log(
			'aponto_payment_anomaly',
			'error',
			'Payment anomaly detected.',
			array(
				'gateway'  => $gateway,
				'order_id' => $order_id,
				'code'     => $code,
				'kind'     => 'charge',
			)
		);
	}
}

<?php
/**
 * Booking status transitions (§5.6, P1-19, P2-10).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Booking;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Availability\Engine;
use Aponto\Booking\Event\BookingStatusChanged;
use Aponto\Booking\Exception\InvalidTransition;
use Aponto\Booking\Exception\SlotUnavailable;
use Aponto\Booking\Repository\ActivityRepository;
use Aponto\Booking\Repository\BookingRepository;
use Aponto\Database\Lock;
use Aponto\Database\LockFactory;
use Aponto\Database\TransactionGuard;
use Aponto\Support\Clock;

/**
 * Applies booking status transitions (§5.6).
 *
 * Legal moves: `pending` → confirmed | cancelled | completed; `confirmed` → cancelled | completed |
 * no_show; `cancelled` → pending (restore — re-checks slot availability under the staff lock,
 * P1-19); `no_show` → confirmed (undo — a RELABEL, no recheck; D-R33); `completed` is terminal and
 * `no_show` is terminal apart from that undo.
 *
 * `completed` while `end_utc > now`, and `no_show` while `start_utc > now`, are rejected 422
 * (forceable) unless `force` — which records actor + reason (P1-19; D-R33 reuses the same escape
 * rather than inventing a second one). Every committed transition dispatches
 * `aponto_booking_status_changed` and logs activity; the notification policy (`send`|`suppress`)
 * rides the event even when suppressed (P2-10).
 */
final class BookingStatusService {

	/**
	 * Legal transitions by source status.
	 *
	 * `pending → no_show` is deliberately ABSENT (D-R33): a request nobody confirmed is cancelled
	 * or auto-cancelled, not marked absent, and admitting it would make "no-show" mean two
	 * different things in the same column. Confirm first, then mark.
	 *
	 * @var array<string, list<string>>
	 */
	private const ALLOWED = array(
		'pending'   => array( 'confirmed', 'cancelled', 'completed' ),
		'confirmed' => array( 'cancelled', 'completed', 'no_show' ),
		'cancelled' => array( 'pending' ),
		'completed' => array(),
		'no_show'   => array( 'confirmed' ),
	);

	/**
	 * Fail-closed transaction control + connection identity.
	 *
	 * @var TransactionGuard
	 */
	private TransactionGuard $tx;

	/**
	 * Construct the service.
	 *
	 * @param \wpdb              $wpdb       Database handle.
	 * @param Clock              $clock      Clock.
	 * @param Engine             $engine     Availability engine (restore recheck).
	 * @param BookingRepository  $bookings   Booking repository.
	 * @param ActivityRepository $activities Activity log.
	 * @param EventDispatcher    $events     Domain-event dispatcher.
	 * @param StaffLockFactory   $locks      Per-staff lock factory.
	 */
	public function __construct(
		private \wpdb $wpdb,
		private Clock $clock,
		private Engine $engine,
		private BookingRepository $bookings,
		private ActivityRepository $activities,
		private EventDispatcher $events,
		private StaffLockFactory $locks
	) {
		$this->tx = new TransactionGuard( $wpdb );
	}

	/**
	 * Transition a booking to a new status.
	 *
	 * ONE move is special-cased out of the plain path: `cancelled → pending` is a RESTORE, which
	 * re-claims time the cancellation gave back and therefore runs under the staff lock with a
	 * fresh availability check (P1-19).
	 *
	 * The no-show UNDO (`no_show → confirmed`, D-R33) BRANCHES on where the appointment sits in
	 * time, and the branch is load-bearing rather than an optimisation:
	 *
	 * 1. **Start already passed — pure relabel.** No lock, no recheck. Re-checking here would INVENT
	 *    failures: {@see Engine::is_slot_free()} regenerates slots from the CURRENT schedule rows, so
	 *    a past slot fails the moment the owner has since edited their working hours, archived the
	 *    service or dropped the staff↔service connection — none of which says anything about whether
	 *    last Tuesday's appointment was mislabelled. Config drift must not block a correction.
	 * 2. **Start still in the future — full restore semantics.** Reachable only through `force`,
	 *    and it MUST recheck: `no_show` is not a blocking status, so force-marking a future booking
	 *    RELEASES its slot, another customer can reserve it, and an unchecked undo would leave two
	 *    `confirmed` bookings on one slot. This path therefore takes the per-staff lock and runs the
	 *    same in-lock `is_slot_free()` + staff-still-bookable checks as `cancelled → pending`,
	 *    answering `aponto_slot_taken` on conflict and leaving the booking at `no_show`.
	 *
	 * An earlier revision skipped the recheck unconditionally, arguing from the guard's normal path
	 * and forgetting that `force` exists precisely to leave it (adversarial review 2026-09-03).
	 *
	 * KNOWN RESIDUAL, accepted (D-R33): the admin REST create/reschedule path validates `start_utc`
	 * but enforces no lead-time or past-instant floor, so an admin can deliberately backfill a
	 * booking that already happened — walk-in bookkeeping every competitor allows. Two records can
	 * therefore overlap on a PAST slot. That is accepted rather than defended against: no future
	 * availability is at stake, and §5 invariant 5 already forbids assuming one booking per slot.
	 *
	 * @param int    $booking_id Booking id.
	 * @param string $to         Target status.
	 * @param string $actor      Actor descriptor for the activity log.
	 * @param string $reason     Optional reason (recorded on force/complete/no-show/cancel).
	 * @param bool   $force      Force a premature `completed` (before `end_utc`) or `no_show`
	 *                           (before `start_utc`) transition.
	 * @param string $policy     Notification policy `send`|`suppress`.
	 * @return Booking The updated booking.
	 * @throws InvalidTransition For an illegal move, or a premature complete/no-show without force.
	 * @throws SlotUnavailable    When a restore (or a future-dated no-show undo) cannot re-acquire
	 *                            the slot.
	 */
	public function transition( int $booking_id, string $to, string $actor, string $reason = '', bool $force = false, string $policy = 'send' ): Booking {
		$current = $this->bookings->find( $booking_id );
		if ( null === $current ) {
			throw new \RuntimeException( esc_html( 'Aponto: booking not found for status transition.' ) );
		}

		if ( 'pending' === $to && 'cancelled' === $current->status ) {
			return $this->restore( $booking_id, $actor, $policy );
		}

		if ( 'confirmed' === $to && 'no_show' === $current->status
			&& $current->start_utc->getTimestamp() > $this->clock->now()->getTimestamp() ) {
			// Future-dated undo (only reachable after a forced mark): the slot was genuinely
			// released while the booking sat absent, so re-claiming it needs the same locked
			// recheck `cancelled → pending` uses. See the class docblock, branch 2.
			return $this->reclaimUnderLock( $booking_id, 'no_show', 'confirmed', 'undo_no_show', $actor, $policy );
		}

		$event = null;
		$this->tx->begin();
		try {
			$event = $this->runTransition( $booking_id, $to, $actor, $reason, $force, $policy );
			$this->tx->commit();
		} catch ( \Throwable $e ) {
			$this->tx->rollback();
			throw $e;
		}

		// Post-commit: dispatched RAW per standard WordPress semantics (verify round V3) — the
		// transition is committed and essential notifications were queued IN the transaction, so
		// nothing here depends on listener behaviour; an extension exception is the extension's bug.
		$this->events->dispatch( $event );

		return $event->booking;
	}

	/**
	 * Restore a cancelled booking to pending, re-checking slot availability under the staff lock
	 * (P1-19). If the slot has since been taken, 409 `aponto_slot_taken`.
	 *
	 * @param int    $booking_id Booking id.
	 * @param string $actor      Actor descriptor.
	 * @param string $policy     Notification policy.
	 * @return Booking The restored booking.
	 * @throws InvalidTransition When the booking is not cancelled.
	 * @throws SlotUnavailable    When the slot is no longer free.
	 */
	public function restore( int $booking_id, string $actor, string $policy = 'send' ): Booking {
		return $this->reclaimUnderLock( $booking_id, 'cancelled', 'pending', 'restore', $actor, $policy );
	}

	/**
	 * The RE-CLAIM path: a transition that gives a released slot back to the booking, and therefore
	 * cannot be a plain status write. Two moves use it — `cancelled → pending` (P1-19) and a
	 * FUTURE-dated `no_show → confirmed` undo (D-R33) — because both re-occupy an interval that was
	 * non-blocking in the meantime and may have been taken by someone else.
	 *
	 * The shape is the whole point and is shared verbatim: acquire the per-staff advisory lock,
	 * verify lock identity, run the checks and the write inside ONE transaction, and compensate a
	 * mid-write connection loss (E1/R4-1). A second copy of this for the no-show undo would have
	 * been a second place for the identity-failure handling to rot.
	 *
	 * @param int    $booking_id Booking id.
	 * @param string $from       Status the booking must currently hold.
	 * @param string $to         Status to write.
	 * @param string $reason     Activity reason marker (`restore` / `undo_no_show`).
	 * @param string $actor      Actor descriptor.
	 * @param string $policy     Notification policy.
	 * @return Booking The updated booking.
	 * @throws InvalidTransition When the booking is no longer in `$from`.
	 * @throws SlotUnavailable    When the slot is no longer free, or the lock is lost.
	 */
	private function reclaimUnderLock( int $booking_id, string $from, string $to, string $reason, string $actor, string $policy ): Booking {
		$pre = $this->bookings->find( $booking_id );
		if ( null === $pre ) {
			throw new \RuntimeException( esc_html( 'Aponto: booking not found for re-claim.' ) );
		}

		$lock = $this->locks->forStaff( $pre->staff_id );
		if ( ! $lock->acquire( 3 ) ) {
			throw SlotUnavailable::lockTimeout();
		}

		$event = null;
		try {
			// E1: verify the lock still belongs to this connection before starting.
			$this->assertLockIntact( $lock );
			$this->tx->begin();
			try {
				$event = $this->runReclaim( $booking_id, $from, $to, $reason, $actor, $policy, $lock );
				$this->tx->commit();
			} catch ( \Throwable $e ) {
				$this->tx->rollback();
				throw $e;
			}
		} finally {
			$lock->release();
		}

		// Post-commit: raw dispatch (verify round V3) — see transition().
		$this->events->dispatch( $event );

		return $event->booking;
	}

	/**
	 * Optional post-persist hook (verify round V3): runs INSIDE the transition transaction after
	 * the status write + activity, receiving the domain event. Rows it writes (the notification
	 * outbox) commit and roll back atomically with the transition. Must be internally fail-safe.
	 * Generic seam — the engine knows nothing about notifications.
	 *
	 * Returns the delivery row ids it claimed, so the compensation below can delete exactly those
	 * (review round 3, P2-1). A hook that returns nothing is still valid — it simply reports no
	 * rows, and the compensation deletes none.
	 *
	 * @var callable|null `function (BookingStatusChanged $event): list<int>`
	 */
	private $on_persist = null;

	/**
	 * Install/remove the post-persist hook.
	 *
	 * @param callable|null $hook `function (BookingStatusChanged $event): list<int>` — the claimed
	 *                            delivery row ids, or nothing.
	 */
	public function setOnPersist( ?callable $hook ): void {
		$this->on_persist = $hook;
	}

	/**
	 * The non-restore transition body running inside the transaction.
	 *
	 * @param int    $booking_id Booking id.
	 * @param string $to         Target status.
	 * @param string $actor      Actor descriptor.
	 * @param string $reason     Reason.
	 * @param bool   $force      Force a premature complete.
	 * @param string $policy     Notification policy.
	 */
	private function runTransition( int $booking_id, string $to, string $actor, string $reason, bool $force, string $policy ): BookingStatusChanged {
		$booking = $this->bookings->findForUpdate( $booking_id );
		if ( null === $booking ) {
			throw new \RuntimeException( esc_html( 'Aponto: booking vanished during status transition.' ) );
		}

		$from = $booking->status;
		if ( ! in_array( $to, self::ALLOWED[ $from ] ?? array(), true ) ) {
			throw new InvalidTransition( esc_html( $from ), esc_html( $to ) );
		}

		if ( 'completed' === $to && $booking->end_utc->getTimestamp() > $this->clock->now()->getTimestamp() && ! $force ) {
			// Cannot complete a booking that has not ended yet (§5.6) unless forced. Premature is
			// the FORCEABLE variant (422, not 409) so the admin UI can offer force-complete (§1.4).
			throw new InvalidTransition( esc_html( $from ), esc_html( $to ), true );
		}

		if ( 'no_show' === $to && $booking->start_utc->getTimestamp() > $this->clock->now()->getTimestamp() && ! $force ) {
			// A customer cannot have failed to turn up for an appointment that has not STARTED yet
			// (D-R33). Deliberately the SAME forceable 422 the premature complete raises, so the
			// admin UI reuses one force+reason dialog for both — the only difference is the anchor:
			// `end_utc` says "it isn't over", `start_utc` says "they aren't late yet".
			throw new InvalidTransition( esc_html( $from ), esc_html( $to ), true );
		}

		$this->bookings->updateStatus( $booking_id, $to, $this->clock->nowSql() );
		$this->activities->log(
			'booking',
			$booking_id,
			'status_changed',
			array(
				'from'   => $from,
				'to'     => $to,
				'reason' => $reason,
				'force'  => $force,
				'policy' => $policy,
			),
			$actor
		);

		$event = new BookingStatusChanged( $this->reload( $booking_id ), $from, $to, $policy, $reason, $actor );

		// V3 outbox seam: notification rows are queued INSIDE this transaction, so they commit and
		// roll back atomically with the status write — no listener is ever load-bearing.
		if ( null !== $this->on_persist ) {
			( $this->on_persist )( $event );
		}

		return $event;
	}

	/**
	 * The re-claim body running inside the transaction (shared by restore and the future-dated
	 * no-show undo — see {@see self::reclaimUnderLock()}).
	 *
	 * @param int    $booking_id Booking id.
	 * @param string $from       Status the booking must still hold.
	 * @param string $to         Status to write.
	 * @param string $reason     Activity reason marker.
	 * @param string $actor      Actor descriptor.
	 * @param string $policy     Notification policy.
	 * @param Lock   $lock       Held staff lock guarding this critical section (E1).
	 */
	private function runReclaim( int $booking_id, string $from, string $to, string $reason, string $actor, string $policy, Lock $lock ): BookingStatusChanged {
		$booking = $this->bookings->findForUpdate( $booking_id );
		if ( null === $booking ) {
			throw new \RuntimeException( esc_html( 'Aponto: booking vanished during re-claim.' ) );
		}

		if ( $from !== $booking->status ) {
			throw new InvalidTransition( esc_html( $booking->status ), esc_html( $to ) );
		}

		$draft = new BookingDraft(
			$booking->service_id,
			$booking->staff_id,
			$booking->location_id,
			$booking->start_utc,
			new CustomerInput( '', '' ),
			$booking->customer_timezone,
			false,
			null,
			'',
			$booking->attendees,
			'admin'
		);

		if ( ! $this->engine->is_slot_free( $draft, $booking_id ) ) {
			throw SlotUnavailable::taken();
		}

		// Delete-vs-re-claim race (R2 #4): re-activating the booking re-claims the provider's time,
		// so the staff member must still EXIST and be ACTIVE at the moment of the write. The
		// per-staff lock is held (the admin delete/archive serialises on the same lock), so this
		// READ COMMITTED read is authoritative; `is_slot_free()` alone cannot catch a vanished staff
		// row whose schedule rows survive.
		if ( ! $this->staffIsBookable( $booking->staff_id ) ) {
			throw SlotUnavailable::taken();
		}

		// E1: nothing beyond this point may run without the lock — verify before the write.
		$this->assertLockIntact( $lock );

		$this->bookings->updateStatus( $booking_id, $to, $this->clock->nowSql() );
		$activity_id = $this->activities->log(
			'booking',
			$booking_id,
			'status_changed',
			array(
				'from'   => $from,
				'to'     => $to,
				'reason' => $reason,
				'policy' => $policy,
			),
			$actor
		);

		$event = new BookingStatusChanged( $this->reload( $booking_id ), $from, $to, $policy, '', $actor );

		// V3 outbox seam: queued rows ride this transaction; on the identity-failure path below the
		// compensation removes the stray rows THIS attempt autocommitted.
		//
		// The seam REPORTS which rows those are (review round 3, P2-1). An earlier cut inferred
		// them by diffing two `status='queued'` snapshots of the booking either side of this call,
		// which is wrong in both directions the moment anything else is running: a row queued by a
		// concurrent request lands inside the diff and gets deleted as if it were ours, while one
		// of ours that a concurrent sender has already leased to `processing` drops OUT of the diff
		// and survives. The claimer is the only actor that knows its own rows, so it is the one
		// that says. A hook returning nothing yields an empty list — deleting nothing is the safe
		// direction.
		$claimed_here = array();
		if ( null !== $this->on_persist ) {
			$reported = ( $this->on_persist )( $event );
			if ( is_array( $reported ) ) {
				$claimed_here = array_values( array_map( 'intval', $reported ) );
			}
		}

		// E1: LAST statement before COMMIT — a reconnect mid-write would have autocommitted the
		// status change without lock protection; compensate (R4-1: reacquire-gated, version-CAS,
		// exact-id activity delete). R4-2 ordering: recovery FIRST, the anomaly action AFTER.
		try {
			$this->assertLockIntact( $lock );
		} catch ( SlotUnavailable $identity_failure ) {
			$this->interleave( 'restore_identity_failure' );
			$this->compensateRestore( $booking, $activity_id, $lock, $claimed_here );
			$this->anomaly( 'restore_identity_failure', array( 'booking_id' => $booking_id ) );
			throw $identity_failure;
		}

		return $event;
	}

	/**
	 * Compensate an identity failure detected after the restore writes: reacquire the staff lock
	 * first (fail -> no compensation, log, leave the consistent-per-se state); then restore the
	 * snapshot's status + updated_at via the version-CAS (R4-1) — the CAS keys EXCLUSIVELY on the
	 * mutation_version THIS attempt's write produced, so ANY other actor's write (transition,
	 * reschedule, future kinds) makes it a no-op; delete the stray activity by its exact id.
	 *
	 * @param Booking   $original     Pre-restore snapshot (from SELECT FOR UPDATE).
	 * @param int       $activity_id  Stray activity row id this attempt received.
	 * @param Lock      $lock         The (dead) staff lock of the critical section.
	 * @param list<int> $delivery_ids Outbox rows THIS attempt claimed (measured across the seam).
	 */
	private function compensateRestore( Booking $original, int $activity_id, Lock $lock, array $delivery_ids = array() ): void {
		$fresh = ( new LockFactory( $this->wpdb ) )->named( $lock->name() );
		if ( ! $fresh->acquire( 0 ) ) {
			$this->anomaly( 'restore_compensation_skipped', array( 'booking_id' => $original->id ) );

			return;
		}

		$affected = $this->bookings->casRestore(
			$original->id,
			$original->mutation_version + 1,
			array(
				'status'     => $original->status,
				'updated_at' => $original->updated_at,
			)
		);
		if ( 0 === $affected ) {
			$this->anomaly( 'restore_compensation_noop', array( 'booking_id' => $original->id ) );
		}

		// V3: remove the outbox rows THIS attempt autocommitted, BY ID — the ids the outbox seam
		// itself reported. Never a blanket delete on (booking_id, status='queued'): a queued row
		// this attempt did not create belongs to some earlier or concurrent request whose write
		// stands, and deleting it silently drops a mail the site still owes (review round 2/3).
		//
		// RESIDUAL, accepted: the `status='queued'` condition means a row of ours that a concurrent
		// sender has already LEASED (`processing`) is not deleted, so a compensated attempt can
		// still leak one email. That is the documented E1 compensation boundary — once another
		// actor owns the send, taking it back is not this path's to do — and the send guard is what
		// catches the stale copy at delivery time.
		$suppressed_outbox = $this->wpdb->suppress_errors( true );
		foreach ( $delivery_ids as $delivery_id ) {
			$this->wpdb->delete(
				$this->wpdb->prefix . 'aponto_notification_deliveries',
				array(
					'id'     => (int) $delivery_id,
					'status' => 'queued',
				),
				array( '%d', '%s' )
			);
		}
		$this->wpdb->suppress_errors( $suppressed_outbox );

		if ( $activity_id > 0 ) {
			$suppressed = $this->wpdb->suppress_errors( true );
			$this->wpdb->delete( $this->wpdb->prefix . 'aponto_activities', array( 'id' => $activity_id ), array( '%d' ) );
			$this->wpdb->suppress_errors( $suppressed );
		}

		$fresh->release();
	}

	/**
	 * Test-only interleaving probe (R4-2): injected by tests to interleave a second actor between
	 * identity-failure detection and compensation. Production never sets it.
	 *
	 * @internal
	 * @var callable|null
	 */
	private $interleave_probe = null;

	/**
	 * Inject the test-only interleaving probe.
	 *
	 * @internal Test seam only.
	 * @param callable|null $probe `function (string $code): void`.
	 */
	public function setTestInterleaveProbe( ?callable $probe ): void {
		$this->interleave_probe = $probe;
	}

	/**
	 * Invoke the test-only probe (no-op in production).
	 *
	 * @param string $code Failure code.
	 */
	private function interleave( string $code ): void {
		if ( null !== $this->interleave_probe ) {
			( $this->interleave_probe )( $code );
		}
	}

	/**
	 * Surface an anomaly for structured logging (diagnostic action; ids only). Wrapped fail-safe
	 * (R4-2): a throwing listener must never alter recovery control flow.
	 *
	 * @param string             $code    Stable anomaly code.
	 * @param array<string, int> $context Numeric context.
	 */
	private function anomaly( string $code, array $context ): void {
		try {
			/**
			 * Fires when the reservation layer detects an anomaly (diagnostic only).
			 *
			 * @param string             $code    Stable anomaly code.
			 * @param array<string, int> $context Numeric context.
			 */
			do_action( 'aponto_reservation_anomaly', $code, $context );
		} catch ( \Throwable $listener_failure ) {
			unset( $listener_failure ); // Swallowed by design — diagnostics never block recovery.
		}
	}

	/**
	 * Whether a staff member currently exists AND is active (R2 #4) — read under the held per-staff
	 * lock, so a concurrent committed delete/archive is visible before the restore write.
	 *
	 * @param int $staff_id Staff id.
	 */
	private function staffIsBookable( int $staff_id ): bool {
		$table = $this->wpdb->prefix . 'aponto_staff';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; id bound via prepare(); in-transaction existence guard.
		$status = $this->wpdb->get_var( $this->wpdb->prepare( "SELECT status FROM {$table} WHERE id = %d", $staff_id ) );

		return 'active' === $status;
	}

	/**
	 * Verify a held lock still belongs to the CURRENT connection (review E1).
	 *
	 * @param Lock $lock Held lock.
	 * @throws SlotUnavailable When identity is lost.
	 */
	private function assertLockIntact( Lock $lock ): void {
		$current = $this->tx->currentConnectionId();
		if ( null === $current || $lock->connectionId() !== $current ) {
			throw SlotUnavailable::lockTimeout();
		}
	}

	/**
	 * Reload a booking snapshot after a write (with order code).
	 *
	 * @param int $booking_id Booking id.
	 */
	private function reload( int $booking_id ): Booking {
		$booking = $this->bookings->find( $booking_id );
		if ( null === $booking ) {
			throw new \RuntimeException( esc_html( 'Aponto: booking vanished after status write.' ) );
		}

		return $booking;
	}
}

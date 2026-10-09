<?php
/**
 * Reschedule write model (§5.6, P1-18).
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

use Aponto\Availability\BusinessTimezone;
use Aponto\Availability\Engine;
use Aponto\Availability\TimezoneConverter;
use Aponto\Booking\Event\BookingRescheduled;
use Aponto\Booking\Exception\InvalidTransition;
use Aponto\Booking\Exception\SlotUnavailable;
use Aponto\Booking\Repository\ActivityRepository;
use Aponto\Booking\Repository\BookingRepository;
use Aponto\Booking\Repository\ServiceRepository;
use Aponto\Database\Lock;
use Aponto\Database\LockFactory;
use Aponto\Database\TransactionGuard;
use Aponto\Support\Clock;

/**
 * Reschedules a booking IN PLACE (§5.6): acquire the old + new staff locks in SORTED order (deadlock
 * safe) → START TRANSACTION → `SELECT ... FOR UPDATE` → validate status → `is_slot_free(newDraft,
 * exclude: id)` → UPDATE the same row (new times + fresh frozen buffers from the current service,
 * `ics_sequence + 1`, keeping token/order/customer) → activity → COMMIT → release → dispatch
 * `booking_rescheduled`. If the new slot is taken the transaction rolls back and the old booking is
 * untouched.
 */
final class RescheduleService {

	/**
	 * The UTC zone.
	 *
	 * @var \DateTimeZone
	 */
	private \DateTimeZone $utc;

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
	 * @param Engine             $engine     Availability engine.
	 * @param ServiceRepository  $services   Service reader.
	 * @param BookingRepository  $bookings   Booking repository.
	 * @param ActivityRepository $activities Activity log.
	 * @param EventDispatcher    $events     Domain-event dispatcher.
	 * @param TimezoneConverter  $converter  Wall-clock converter.
	 * @param BusinessTimezone   $timezones  Business-timezone resolver.
	 * @param StaffLockFactory   $locks      Per-staff lock factory.
	 */
	public function __construct(
		private \wpdb $wpdb,
		private Clock $clock,
		private Engine $engine,
		private ServiceRepository $services,
		private BookingRepository $bookings,
		private ActivityRepository $activities,
		private EventDispatcher $events,
		private TimezoneConverter $converter,
		private BusinessTimezone $timezones,
		private StaffLockFactory $locks
	) {
		$this->utc = new \DateTimeZone( 'UTC' );
		$this->tx  = new TransactionGuard( $wpdb );
	}

	/**
	 * Reschedule a booking to a new start (and optionally a new staff member and/or location).
	 *
	 * A LOCATION MOVE is a reschedule (D-R63, rest-contract §2.9 addendum 2026-09-23): this is the
	 * only write path that re-validates where a booking sits — the slot, the staff member's
	 * eligibility and the wall-clock fields are all evaluated AT the target location, and a concrete
	 * target is serialised against its delete/archive by `apt:loc:{id}`. `null` keeps the booking's
	 * current location — which is locked and re-validated exactly like a new one (D-R63 fix round 1).
	 *
	 * @param int                $booking_id      Booking id.
	 * @param \DateTimeImmutable $new_start_utc   New start instant (UTC).
	 * @param int|null           $new_staff_id    New staff id, or null to keep the current staff.
	 * @param string             $actor           Actor descriptor for the activity log.
	 * @param int|null           $new_location_id New location id (`0` = no location), or null to keep it.
	 * @return Booking The updated booking.
	 * @throws InvalidTransition When the booking is not in a reschedulable status.
	 * @throws SlotUnavailable    When the new slot is taken or a lock times out.
	 */
	public function reschedule( int $booking_id, \DateTimeImmutable $new_start_utc, ?int $new_staff_id, string $actor, ?int $new_location_id = null ): Booking {
		$current = $this->bookings->find( $booking_id );
		if ( null === $current ) {
			throw new \RuntimeException( esc_html( 'Aponto: booking not found for reschedule.' ) );
		}

		// The lock set is computed from this NON-locking pre-read. Between it and the in-transaction
		// SELECT ... FOR UPDATE the booking may have been moved to a different staff by a concurrent
		// reschedule, leaving us holding the WRONG old-staff lock. When the authoritative old staff
		// disagrees, roll back, release, and retry ONCE with the corrected lock set; a second
		// disagreement fails closed (retryable). See P1-18 / Codex engine review.
		$old_staff = $current->staff_id;
		// D-R63 fix round 1: the location the booking is AT, from the same pre-read and verified the
		// same way under the row lock — the target when the request names none, so an unchanged
		// concrete branch is locked and re-validated like a new one.
		$old_location = $current->location_id;

		$event     = null;
		$unchanged = null; // The locked row when the request asks for what the booking already is.
		$attempt   = 0;
		while ( true ) {
			$this->beforeLock( $attempt );

			$new_staff  = $new_staff_id ?? $old_staff;
			$lock_names = array_values( array_unique( array( $this->locks->name( $old_staff ), $this->locks->name( $new_staff ) ) ) );
			sort( $lock_names );

			$acquired = array();
			foreach ( $lock_names as $name ) {
				$lock = ( new LockFactory( $this->wpdb ) )->named( $name );
				if ( ! $lock->acquire( 3 ) ) {
					$this->releaseAll( $acquired );
					throw SlotUnavailable::lockTimeout();
				}
				$acquired[] = $lock;
			}

			// D-R63 (+ fix round 1): the TARGET location's lock — the requested one, or the one the
			// booking is at — then the SERVICE lock, AFTER the staff locks: the reserve path's global
			// order (idem → staff → location → service). The location lock serialises a location
			// archive/delete (which holds only `apt:loc:{id}`); the service lock serialises the
			// eligibility PUT and a service archive/delete (`EligibilityController`,
			// `ServicesController` hold only it), so the bookability recheck below cannot race either.
			// The wildcard `0` is not a row and needs no location lock.
			$target_location = $new_location_id ?? $old_location;
			$extra_locks     = array();
			if ( $target_location > 0 ) {
				$extra_locks[] = $this->locks->forLocation( $target_location );
			}
			$extra_locks[] = $this->locks->forService( $current->service_id );
			foreach ( $extra_locks as $lock ) {
				if ( ! $lock->acquire( 3 ) ) {
					$this->releaseAll( $acquired );
					throw SlotUnavailable::lockTimeout();
				}
				$acquired[] = $lock;
			}

			$retry_with = null; // The authoritative old staff when the lock set turned out wrong.
			try {
				// E1: verify both locks still belong to this connection before starting.
				$this->assertLocksIntact( $acquired );
				$this->tx->begin();
				try {
					$booking = $this->bookings->findForUpdate( $booking_id );
					if ( null === $booking ) {
						throw new \RuntimeException( esc_html( 'Aponto: booking vanished during reschedule.' ) );
					}
					if ( $booking->staff_id !== $old_staff || ( null === $new_location_id && $booking->location_id !== $old_location ) ) {
						// Wrong lock set — the row moved staff (or, for a request that keeps the
						// location, moved branch) since the pre-read. Roll back and retry under the
						// correct lock set (no write happened yet).
						$retry_with   = $booking->staff_id;
						$old_location = $booking->location_id;
						$this->tx->rollback();
					} elseif ( $this->isUnchanged( $booking, $new_start_utc, $new_staff, $target_location ) ) {
						// Same start, staff and location (persona QA 2026-10-05, T-042): nothing to
						// move, so nothing is written — no `ics_sequence` bump, no activity, no event
						// and therefore no "rescheduled" mail about a time that did not change.
						$unchanged = $booking;
						$this->tx->rollback();
					} else {
						$event = $this->runReschedule( $booking, $new_start_utc, $new_staff, $actor, $acquired, $target_location );
						// runReschedule() re-verified identity as its last step; only COMMIT follows.
						$this->tx->commit();
					}
				} catch ( \Throwable $e ) {
					$this->tx->rollback();
					throw $e;
				}
			} finally {
				$this->releaseAll( $acquired );
			}

			if ( null !== $retry_with ) {
				if ( ++$attempt > 1 ) {
					// Churn guard: the row keeps moving under us — fail closed (retryable 409/425).
					throw SlotUnavailable::lockTimeout();
				}
				$old_staff = $retry_with;
				continue;
			}

			break;
		}

		if ( null !== $unchanged ) {
			return $unchanged;
		}

		// Post-commit: dispatched RAW per standard WordPress semantics (verify round V3) — the
		// reschedule is committed and its notification was queued IN the transaction, so nothing
		// here depends on listener behaviour; an extension exception is the extension's bug.
		$this->events->dispatch( $event );

		return $event->booking;
	}

	/**
	 * Whether a reschedule request names exactly what a reschedulable booking already is: the same
	 * start instant, staff member and location (persona QA 2026-10-05, T-042).
	 *
	 * Only a `pending`/`confirmed` booking can be a no-op: every other status still reaches
	 * {@see self::runReschedule()} and is refused there, as before.
	 *
	 * @param Booking            $booking       Locked booking row.
	 * @param \DateTimeImmutable $new_start_utc Requested start instant.
	 * @param int                $new_staff     Requested staff id.
	 * @param int                $new_location  Requested location id.
	 */
	private function isUnchanged( Booking $booking, \DateTimeImmutable $new_start_utc, int $new_staff, int $new_location ): bool {
		return in_array( $booking->status, array( 'pending', 'confirmed' ), true )
			&& $booking->staff_id === $new_staff
			&& $booking->location_id === $new_location
			&& $booking->start_utc->getTimestamp() === $new_start_utc->getTimestamp();
	}

	/**
	 * Test-only pre-lock probe (P1-18): runs at the top of each acquire attempt, BEFORE the locks are
	 * taken, so a test can interleave a concurrent reschedule (moving the booking to another staff)
	 * and exercise the stale-lock retry. Production never sets it.
	 *
	 * @internal
	 * @var callable|null `function (int $attempt): void`
	 */
	private $before_lock_probe = null;

	/**
	 * Inject the test-only pre-lock probe.
	 *
	 * @internal Test seam only.
	 * @param callable|null $probe `function (int $attempt): void`.
	 */
	public function setTestBeforeLockProbe( ?callable $probe ): void {
		$this->before_lock_probe = $probe;
	}

	/**
	 * Invoke the test-only pre-lock probe (no-op in production).
	 *
	 * @param int $attempt Zero-based acquire attempt.
	 */
	private function beforeLock( int $attempt ): void {
		if ( null !== $this->before_lock_probe ) {
			( $this->before_lock_probe )( $attempt );
		}
	}

	/**
	 * Optional post-persist hook (verify round V3): runs INSIDE the reschedule transaction after
	 * the row update + activity, receiving the domain event. Rows it writes (the notification
	 * outbox) commit and roll back atomically with the reschedule. Must be internally fail-safe.
	 * Generic seam — the engine knows nothing about notifications.
	 *
	 * @var callable|null `function (BookingRescheduled $event): void`
	 */
	private $on_persist = null;

	/**
	 * Install/remove the post-persist hook.
	 *
	 * @param callable|null $hook `function (BookingRescheduled $event): void`.
	 */
	public function setOnPersist( ?callable $hook ): void {
		$this->on_persist = $hook;
	}

	/**
	 * The reschedule body running inside the transaction. The booking is the row already read via
	 * `SELECT ... FOR UPDATE` by {@see self::reschedule()} (which also verified the old-staff lock
	 * set matches the row's current staff before calling in).
	 *
	 * @param Booking            $booking       Locked booking row (its `staff_id` is the actual old staff).
	 * @param \DateTimeImmutable $new_start_utc New start instant (UTC).
	 * @param int                $new_staff     New staff id.
	 * @param string             $actor         Actor descriptor.
	 * @param list<Lock>         $held          Locks whose identity guards this critical section.
	 * @param int                $new_location  Target location id (`0` = no location); the booking's own when unchanged.
	 */
	private function runReschedule( Booking $booking, \DateTimeImmutable $new_start_utc, int $new_staff, string $actor, array $held, int $new_location ): BookingRescheduled {
		$booking_id = $booking->id;
		$moves      = $new_location !== $booking->location_id;

		if ( ! in_array( $booking->status, array( 'pending', 'confirmed' ), true ) ) {
			throw new InvalidTransition( esc_html( $booking->status ), esc_html( 'rescheduled' ) );
		}

		$service = $this->services->find( $booking->service_id );
		if ( null === $service ) {
			throw SlotUnavailable::taken();
		}

		// D-R63 (+ fix round 1): a concrete TARGET location — new OR unchanged — must exist and be
		// ACTIVE, read under its lock (taken in reschedule() for exactly this case). An archived
		// branch refuses like an archived staff member (`taken()` → 409), the D-R61 answer the
		// reserve path gives: an archived branch takes no NEW time, including a moved one.
		if ( $new_location > 0 && ! $this->locationIsActive( $new_location ) ) {
			throw SlotUnavailable::taken();
		}

		$draft = new BookingDraft(
			$booking->service_id,
			$new_staff,
			$new_location,
			$new_start_utc,
			new CustomerInput( '', '', '' ),
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

		$tz           = $this->timezones->forLocation( $new_location );
		$wall         = $this->converter->instantToWall( $new_start_utc, $tz );
		$start_minute = $wall['minute'];
		$end_minute   = $start_minute + $service->duration_minutes;
		$end_utc      = $this->converter->endInstant( $wall['date'], $end_minute, $tz );
		if ( null === $end_utc ) {
			// End strictly inside a DST gap — never emitted by the engine (E3); defensive.
			throw SlotUnavailable::taken();
		}
		$now = $this->clock->nowSql();

		// Delete-vs-reschedule race (R2 #4): the target staff must still EXIST, be ACTIVE and be
		// CONNECTED to the booking's service at its location (§5.3 eligibility) at the moment of the
		// mutation. Both staff locks are held (the admin delete/archive/unassign serialises on the
		// same per-staff lock), so this READ COMMITTED read is authoritative: a concurrently
		// deleted/archived/unassigned target surfaces as an unavailable slot, never as a booking
		// moved onto a vanished or ineligible provider. `is_slot_free()` alone cannot catch a late
		// delete — schedule rows can outlive the staff row.
		if ( ! $this->targetIsBookable( $new_staff, $booking->service_id, $new_location ) ) {
			throw SlotUnavailable::taken();
		}

		// E1: nothing beyond this point may run without the locks — verify before the write.
		$this->assertLocksIntact( $held );

		$this->bookings->updateTimes(
			$booking_id,
			array(
				'staff_id'           => $new_staff,
				'start_datetime_utc' => $new_start_utc->setTimezone( $this->utc )->format( 'Y-m-d H:i:s' ),
				'end_datetime_utc'   => $end_utc->format( 'Y-m-d H:i:s' ),
				'local_date'         => $wall['date'],
				'start_minute'       => $start_minute,
				'end_minute'         => $end_minute,
				'buffer_before'      => $service->buffer_before,
				'buffer_after'       => $service->buffer_after,
				'ics_sequence'       => $booking->ics_sequence + 1,
				'updated_at'         => $now,
				'location_id'        => $new_location,
			)
		);

		$meta = array(
			'from_start' => $booking->start_utc->format( 'Y-m-d\TH:i:s\Z' ),
			'to_start'   => $new_start_utc->setTimezone( $this->utc )->format( 'Y-m-d\TH:i:s\Z' ),
			'from_staff' => $booking->staff_id,
			'to_staff'   => $new_staff,
		);
		// D-R63: the activity records a location move only when there was one, so the meta of an
		// ordinary reschedule is equivalent to what it has always been.
		if ( $moves ) {
			$meta['from_location'] = $booking->location_id;
			$meta['to_location']   = $new_location;
		}
		$meta['mutation_version'] = $booking->mutation_version + 1;
		$activity_id              = $this->activities->log( 'booking', $booking_id, 'rescheduled', $meta, $actor );

		$updated = $this->bookings->find( $booking_id );
		if ( null === $updated ) {
			throw new \RuntimeException( esc_html( 'Aponto: booking vanished after reschedule update.' ) );
		}

		$event = new BookingRescheduled( $updated, $booking->start_utc, $new_start_utc->setTimezone( $this->utc ), 'send', $booking );

		// V3 outbox seam: notification rows are queued INSIDE this transaction; on the
		// identity-failure path below the compensation removes any autocommitted stray rows.
		if ( null !== $this->on_persist ) {
			( $this->on_persist )( $event );
		}

		// E1: LAST statement before COMMIT — a reconnect mid-write would have autocommitted the
		// UPDATE without lock protection; compensate (R4-1: gated + version-CAS) rather than
		// commit. R4-2 ordering: recovery FIRST, the public anomaly action only AFTER it.
		try {
			$this->assertLocksIntact( $held );
		} catch ( SlotUnavailable $identity_failure ) {
			$this->interleave( 'reschedule_identity_failure' );
			$this->compensate( $booking, $activity_id, $held );
			$this->anomaly( 'reschedule_identity_failure', array( 'booking_id' => $booking_id ) );
			throw $identity_failure;
		}

		return $event;
	}

	/**
	 * Whether the target staff currently exists, is active (R2 #4) AND is connected to the service at
	 * the location (§5.3 eligibility) — read under the held per-staff locks, so a concurrent committed
	 * delete/archive/unassign is visible before the mutation.
	 *
	 * @param int $staff_id    Target staff id.
	 * @param int $service_id  The booking's service id.
	 * @param int $location_id The booking's location id (0 = no-location scope).
	 */
	private function targetIsBookable( int $staff_id, int $service_id, int $location_id ): bool {
		// D-R63 fix round 1: the SERVICE must still be active — read under the per-service lock
		// reschedule() now holds, the same recheck the reserve path makes (review F item 1).
		$services = $this->wpdb->prefix . 'aponto_services';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; id bound via prepare(); in-transaction existence + status guard.
		if ( 'active' !== $this->wpdb->get_var( $this->wpdb->prepare( "SELECT status FROM {$services} WHERE id = %d", $service_id ) ) ) {
			return false;
		}

		$table = $this->wpdb->prefix . 'aponto_staff';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; id bound via prepare(); in-transaction existence guard.
		$status = $this->wpdb->get_var( $this->wpdb->prepare( "SELECT status FROM {$table} WHERE id = %d", $staff_id ) );
		if ( 'active' !== $status ) {
			return false;
		}

		$connections = $this->wpdb->prefix . 'aponto_staff_services';
		$sql         = $this->wpdb->prepare(
			'SELECT 1 FROM %i WHERE staff_id = %d AND service_id = %d AND ( location_id = %d OR location_id = 0 ) LIMIT 1',
			$connections,
			$staff_id,
			$service_id,
			$location_id
		);
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared -- Identifier and values bound above; in-transaction eligibility guard.
		$connected = $this->wpdb->get_var( $sql );

		return null !== $connected;
	}

	/**
	 * Whether a concrete location exists AND is active (D-R63) — the reserve path's D-R61 check,
	 * read under the held `apt:loc:{id}` lock so a concurrent committed archive/delete is visible.
	 *
	 * @param int $location_id Concrete (non-wildcard) location id.
	 */
	private function locationIsActive( int $location_id ): bool {
		$locations = $this->wpdb->prefix . 'aponto_locations';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; id bound via prepare(); in-transaction existence + status guard.
		return 'active' === $this->wpdb->get_var( $this->wpdb->prepare( "SELECT status FROM {$locations} WHERE id = %d", $location_id ) );
	}

	/**
	 * Verify every held lock still belongs to the CURRENT connection (review E1).
	 *
	 * @param list<Lock> $held Held locks.
	 * @throws SlotUnavailable When identity is lost.
	 */
	private function assertLocksIntact( array $held ): void {
		if ( array() === $held ) {
			return;
		}

		$current = $this->tx->currentConnectionId();
		foreach ( $held as $lock ) {
			if ( null === $current || $lock->connectionId() !== $current ) {
				throw SlotUnavailable::lockTimeout();
			}
		}
	}

	/**
	 * Compensate an identity failure detected after the reschedule writes. NEVER a blind
	 * write-back:
	 *
	 *   (a) Reacquire EVERY lock of this critical section first (fresh locks, timeout 0). Failure
	 *       means another actor is working on this staff pair — do NOT compensate; the booking is
	 *       consistent per-se (either our autocommitted state or a newer one). Log and leave.
	 *   (b) The restore is a COMPARE-AND-SWAP keyed EXCLUSIVELY on `mutation_version` (R4-1): it
	 *       applies only while the row still carries the version THIS attempt's write produced
	 *       (captured + 1). ANY other write — reschedule, status transition, anything future —
	 *       bumps the version and makes the CAS a no-op. 0 affected = log and leave.
	 *   (c) The full captured snapshot is restored, INCLUDING `updated_at`.
	 *   (d) The stray 'rescheduled' activity is deleted by the EXACT id this attempt received.
	 *
	 * @param Booking    $original    Pre-reschedule snapshot (from SELECT FOR UPDATE).
	 * @param int        $activity_id The stray activity row id THIS attempt received.
	 * @param list<Lock> $held        The (dead) locks of the critical section.
	 */
	private function compensate( Booking $original, int $activity_id, array $held ): void {
		// (a) Reacquire ownership before touching anything.
		$reacquired = array();
		foreach ( $held as $lock ) {
			$fresh = ( new LockFactory( $this->wpdb ) )->named( $lock->name() );
			if ( ! $fresh->acquire( 0 ) ) {
				$this->releaseAll( $reacquired );
				$this->anomaly( 'reschedule_compensation_skipped', array( 'booking_id' => $original->id ) );

				return;
			}
			$reacquired[] = $fresh;
		}

		// (b)+(c) Version-CAS restore of the full snapshot (updateTimes bumped captured -> +1).
		$affected = $this->bookings->casRestore(
			$original->id,
			$original->mutation_version + 1,
			array(
				'staff_id'           => $original->staff_id,
				'start_datetime_utc' => $original->start_utc->format( 'Y-m-d H:i:s' ),
				'end_datetime_utc'   => $original->end_utc->format( 'Y-m-d H:i:s' ),
				'local_date'         => $original->local_date,
				'start_minute'       => $original->start_minute,
				'end_minute'         => $original->end_minute,
				'buffer_before'      => $original->buffer_before,
				'buffer_after'       => $original->buffer_after,
				'ics_sequence'       => $original->ics_sequence,
				'updated_at'         => $original->updated_at,
				'location_id'        => $original->location_id,
			)
		);
		if ( 0 === $affected ) {
			// Someone else already touched the row (or nothing was persisted) — leave it.
			$this->anomaly( 'reschedule_compensation_noop', array( 'booking_id' => $original->id ) );
		}

		// (d) Remove OUR stray activity row by its exact id.
		if ( $activity_id > 0 ) {
			$suppressed = $this->wpdb->suppress_errors( true );
			$this->wpdb->delete( $this->wpdb->prefix . 'aponto_activities', array( 'id' => $activity_id ), array( '%d' ) );
			$this->wpdb->suppress_errors( $suppressed );
		}

		// (e) V3: remove any outbox rows this attempt autocommitted (still 'queued' — never sent).
		$suppressed_outbox = $this->wpdb->suppress_errors( true );
		$this->wpdb->delete(
			$this->wpdb->prefix . 'aponto_notification_deliveries',
			array(
				'booking_id' => $original->id,
				'status'     => 'queued',
			),
			array( '%d', '%s' )
		);
		$this->wpdb->suppress_errors( $suppressed_outbox );

		$this->releaseAll( $reacquired );
	}

	/**
	 * Test-only interleaving probe (R4-2): injected by tests to interleave a second actor between
	 * identity-failure detection and compensation. Production never sets it — no public hook runs
	 * before recovery.
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
	 * Surface a reschedule-layer anomaly for structured logging (diagnostic action; ids only).
	 * Wrapped fail-safe (R4-2): a throwing listener must never alter recovery control flow.
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
	 * Release every acquired lock.
	 *
	 * @param list<Lock> $locks Locks.
	 */
	private function releaseAll( array $locks ): void {
		foreach ( $locks as $lock ) {
			$lock->release();
		}
	}
}

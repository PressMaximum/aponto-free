<?php
/**
 * Post-commit domain-event dispatcher (§5.6, §8.1).
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

use Aponto\Booking\Event\BookingCreated;
use Aponto\Booking\Event\BookingRescheduled;
use Aponto\Booking\Event\BookingStatusChanged;

/**
 * Fires the pinned WordPress actions for domain events, POST-COMMIT and OUTSIDE the reservation
 * lock (§5.6). A listener failing here must never affect the committed booking — callers only
 * dispatch after `COMMIT`. Signatures match extension-surface §2 exactly:
 *
 *   - `aponto_booking_created(Booking $b)`
 *   - `aponto_booking_status_changed(Booking $b, string $from, string $to)`
 *   - `aponto_booking_rescheduled(Booking $b, DateTimeImmutable $fromStartUtc, DateTimeImmutable $toStartUtc, ?Booking $previous)`
 *     (`$previous` is an additive trailing argument, 2026-10-06)
 *
 * The actual notification dispatcher (which reads each event's `notification_policy`) is a later
 * milestone; only these actions are fired here.
 */
final class EventDispatcher {
	/** Nesting depth of a caller that will release its business locks before delivery.
	 *
	 * @var int
	 */
	private static int $deferred_depth = 0;
	/** Committed events awaiting the outer lock owner.
	 *
	 * @var list<BookingCreated|BookingStatusChanged|BookingRescheduled>
	 */
	private static array $deferred_events = array();

	/**
	 * Run business work, then publish its committed booking events after its locks release.
	 *
	 * @param callable $work Caller must release its locks in its own finally block.
	 * @return mixed
	 */
	public static function afterLocks( callable $work ) {
		++self::$deferred_depth;
		try {
			return $work();
		} finally {
			if ( 0 === --self::$deferred_depth ) {
				$events                = self::$deferred_events;
				self::$deferred_events = array();
				foreach ( $events as $event ) {
					try {
						( new self() )->dispatch( $event );
					} catch ( \Throwable $listener_failure ) {
						unset( $listener_failure ); // Committed writes survive an observer failure.
					}
				}
			}
		}
	}


	/**
	 * Dispatch a domain event by firing its WordPress action.
	 *
	 * @param BookingCreated|BookingStatusChanged|BookingRescheduled $event Domain event.
	 */
	public function dispatch( BookingCreated|BookingStatusChanged|BookingRescheduled $event ): void {
		if ( self::$deferred_depth > 0 ) {
			self::$deferred_events[] = $event;
			return;
		}
		if ( $event instanceof BookingCreated ) {
			/**
			 * Fires once after a booking is created and committed (§8.1).
			 *
			 * @param Booking $booking Booking snapshot.
			 */
			do_action( 'aponto_booking_created', $event->booking );

			return;
		}

		if ( $event instanceof BookingStatusChanged ) {
			/**
			 * Fires after a booking status transition is committed (§8.1).
			 *
			 * @param Booking $booking Booking snapshot (new state).
			 * @param string  $from    Previous status.
			 * @param string  $to      New status.
			 */
			do_action( 'aponto_booking_status_changed', $event->booking, $event->from, $event->to );

			return;
		}

		/**
		 * Fires after a reschedule is committed (§8.1).
		 *
		 * @param Booking            $booking        Booking snapshot (new state).
		 * @param \DateTimeImmutable $from_start_utc Previous start instant (UTC).
		 * @param \DateTimeImmutable $to_start_utc   New start instant (UTC).
		 * @param Booking|null       $previous       The booking as it was before the move, when the
		 *                                           caller knows it (additive trailing argument,
		 *                                           2026-10-06: a listener registered for three
		 *                                           arguments never sees it). The calendar sync needs
		 *                                           the previous STAFF MEMBER to remove the event from
		 *                                           the calendar it was written to (D-R78).
		 */
		do_action( 'aponto_booking_rescheduled', $event->booking, $event->from_start_utc, $event->to_start_utc, $event->previous );
	}
}

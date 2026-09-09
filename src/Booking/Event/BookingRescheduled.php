<?php
/**
 * Domain event: booking rescheduled (§5.6, §8.1).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Booking\Event;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Booking\Booking;

/**
 * Emitted post-commit after a reschedule. {@see \Aponto\Booking\EventDispatcher} fires the
 * `aponto_booking_rescheduled` action with the pinned signature
 * `action(Booking $b, DateTimeImmutable $fromStartUtc, DateTimeImmutable $toStartUtc)`.
 */
final class BookingRescheduled {

	/**
	 * Construct the event.
	 *
	 * @param Booking            $booking             Booking snapshot (new state).
	 * @param \DateTimeImmutable $from_start_utc      Previous start instant (UTC).
	 * @param \DateTimeImmutable $to_start_utc        New start instant (UTC).
	 * @param string             $notification_policy `send` or `suppress`.
	 */
	public function __construct(
		public readonly Booking $booking,
		public readonly \DateTimeImmutable $from_start_utc,
		public readonly \DateTimeImmutable $to_start_utc,
		public readonly string $notification_policy = 'send'
	) {}
}

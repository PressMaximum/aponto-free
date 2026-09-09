<?php
/**
 * Domain event: booking status changed (§5.6, §8.1).
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
 * Emitted post-commit after a status transition. {@see \Aponto\Booking\EventDispatcher} fires the
 * `aponto_booking_status_changed` action with the pinned signature
 * `action(Booking $b, string $from, string $to)`. The notification policy (`send`|`suppress`,
 * P2-10) is carried for the future dispatcher; a suppressed transition still logs activity.
 */
final class BookingStatusChanged {

	/**
	 * Construct the event.
	 *
	 * @param Booking $booking             Booking snapshot (new state).
	 * @param string  $from                Previous status.
	 * @param string  $to                  New status.
	 * @param string  $notification_policy `send` or `suppress`.
	 * @param string  $reason              Transition reason (e.g. a cancellation note), else ''.
	 * @param string  $initiated_by        Actor descriptor (`customer`, `admin:{id}`, `system`), else ''.
	 */
	public function __construct(
		public readonly Booking $booking,
		public readonly string $from,
		public readonly string $to,
		public readonly string $notification_policy = 'send',
		public readonly string $reason = '',
		public readonly string $initiated_by = ''
	) {}
}

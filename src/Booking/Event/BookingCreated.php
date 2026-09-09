<?php
/**
 * Domain event: booking created (§5.6, §8.1).
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
 * Emitted once, post-commit, after a booking is created. Carries the RAW manage token (in-memory,
 * request-scoped only — NB-4) for the future notification dispatcher, plus the notification policy
 * (`send`|`suppress`, P2-10). No listener ships in this milestone; {@see \Aponto\Booking\EventDispatcher}
 * fires the `aponto_booking_created` action with the pinned signature `action(Booking $b)`.
 */
final class BookingCreated {

	/**
	 * Construct the event.
	 *
	 * @param Booking     $booking             Booking snapshot.
	 * @param string|null $raw_token           Raw manage token (request-scoped), or null.
	 * @param string      $notification_policy `send` or `suppress`.
	 */
	public function __construct(
		public readonly Booking $booking,
		public readonly ?string $raw_token = null,
		public readonly string $notification_policy = 'send'
	) {}
}

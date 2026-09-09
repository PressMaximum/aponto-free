<?php
/**
 * Availability engine contract (§5.1).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Availability;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Booking\BookingDraft;

/**
 * The availability engine (§5.1). `get_slots()` is the DISPLAY path (applies lead/horizon and the
 * `aponto_slots_generated` filter); `is_slot_free()` is the AUTHORITATIVE booking check (schedule,
 * busy and capacity only — never the display filter). Slot identity is `start_utc` (§5.4).
 */
interface Engine {

	/**
	 * Bookable slots for a query, grouped by business-timezone date.
	 *
	 * @param SlotQuery $query Availability query (business-tz inclusive range).
	 * @return array<string, list<Slot>> `Y-m-d` (business tz) => slots.
	 */
	public function get_slots( SlotQuery $query ): array;

	/**
	 * Whether the exact slot in a draft is bookable for the requested attendees: it must be a
	 * generated slot within schedule and have enough remaining capacity (§5.3). Never consults the
	 * display filter (§8.1 invariant 4).
	 *
	 * @param BookingDraft $draft              Draft carrying the slot `start_utc` and concrete staff.
	 * @param int|null     $exclude_booking_id Booking id to ignore in the busy set (reschedule/restore).
	 */
	public function is_slot_free( BookingDraft $draft, ?int $exclude_booking_id = null ): bool;
}

<?php
/**
 * Bookable slot (§5.1).
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

/**
 * A single bookable slot. Its IDENTITY is `start_utc` — never the local minute — so slots merge
 * and compare across staff and timezones purely on the UTC instant (§5.4).
 *
 * `start_minute` is the display minute-of-day in the BUSINESS timezone; `remaining` is the number
 * of attendees still bookable at this start (capacity model, §5.3). For any-staff display
 * `remaining` counts the free staff, not a per-staff list.
 */
final class Slot {

	/**
	 * Construct a slot.
	 *
	 * @param \DateTimeImmutable $start_utc    Slot start instant (UTC) — the slot identity.
	 * @param int                $start_minute Display minute-of-day in the business timezone.
	 * @param int                $remaining    Attendees (or free staff) still bookable.
	 */
	public function __construct(
		public readonly \DateTimeImmutable $start_utc,
		public readonly int $start_minute,
		public readonly int $remaining
	) {}

	/**
	 * Stable UTC key for identity/merge (`Y-m-d\TH:i:s\Z`).
	 */
	public function key(): string {
		return $this->start_utc->format( 'Y-m-d\TH:i:s\Z' );
	}

	/**
	 * Copy of this slot with a different `remaining` count.
	 *
	 * @param int $remaining New remaining count.
	 */
	public function withRemaining( int $remaining ): self {
		return new self( $this->start_utc, $this->start_minute, $remaining );
	}
}

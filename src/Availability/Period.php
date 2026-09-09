<?php
/**
 * Busy period (§5.3, §8.1).
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
 * A half-open busy interval `[start_utc, end_utc)` in UTC. This is the unit passed through the
 * `aponto_blocked_periods_for_range` filter (extension-surface §2.1.2): extensions may only ADD
 * busy periods (subtract-only), never remove or shrink core ones.
 *
 * A period may additionally describe a BOOKING it originated from — its originating service, the
 * booking's CORE (unbuffered) start/end and its attendee count — so the capacity branch of slot
 * generation (§5.3) can aggregate same-service/same-time bookings. Plain blocks and extension
 * contributions carry `is_booking = false` and always reject an overlapping candidate.
 */
final class Period {

	/**
	 * Construct a busy period.
	 *
	 * @param \DateTimeImmutable      $start_utc      Interval start (UTC), buffer-inflated for bookings.
	 * @param \DateTimeImmutable      $end_utc        Interval end (UTC), buffer-inflated for bookings.
	 * @param bool                    $is_booking     Whether this period came from a booking.
	 * @param int                     $service_id     Originating service id (bookings only).
	 * @param \DateTimeImmutable|null $core_start_utc Booking core (unbuffered) start (bookings only).
	 * @param \DateTimeImmutable|null $core_end_utc   Booking core (unbuffered) end (bookings only).
	 * @param int                     $attendees      Booking attendee count (bookings only).
	 * @param int|null                $booking_id     Originating booking id (bookings only).
	 */
	public function __construct(
		public readonly \DateTimeImmutable $start_utc,
		public readonly \DateTimeImmutable $end_utc,
		public readonly bool $is_booking = false,
		public readonly int $service_id = 0,
		public readonly ?\DateTimeImmutable $core_start_utc = null,
		public readonly ?\DateTimeImmutable $core_end_utc = null,
		public readonly int $attendees = 0,
		public readonly ?int $booking_id = null
	) {}

	/**
	 * Whether this period overlaps a half-open `[start, end)` window (touching endpoints do NOT
	 * overlap — a slot may start exactly when a busy period ends).
	 *
	 * @param \DateTimeImmutable $start Window start (UTC).
	 * @param \DateTimeImmutable $end   Window end (UTC).
	 */
	public function overlaps( \DateTimeImmutable $start, \DateTimeImmutable $end ): bool {
		return $this->start_utc < $end && $start < $this->end_utc;
	}

	/**
	 * Whether this period is a booking sharing the exact CORE start/end and service of a candidate
	 * slot — the capacity-aggregation predicate (§5.3).
	 *
	 * @param int                $service_id Candidate service id.
	 * @param \DateTimeImmutable $core_start Candidate core start (UTC).
	 * @param \DateTimeImmutable $core_end   Candidate core end (UTC).
	 */
	public function sharesSlot( int $service_id, \DateTimeImmutable $core_start, \DateTimeImmutable $core_end ): bool {
		return $this->is_booking
			&& $this->service_id === $service_id
			&& null !== $this->core_start_utc
			&& null !== $this->core_end_utc
			&& $this->core_start_utc->getTimestamp() === $core_start->getTimestamp()
			&& $this->core_end_utc->getTimestamp() === $core_end->getTimestamp();
	}
}

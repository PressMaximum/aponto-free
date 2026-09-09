<?php
/**
 * Availability query (§5.1).
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
 * Immutable query for {@see Engine::get_slots()}: a service, an optional staff member
 * (`null` = any staff), an optional location (`0` = none), and an inclusive business-timezone
 * date range.
 *
 * `from_date`/`to_date` are `Y-m-d` calendar dates in the BUSINESS timezone, `to_date` inclusive.
 *
 * `purpose` says WHICH engine path built this query, and it exists because a busy-source listener
 * cannot otherwise tell (D-R34). The same object reaches `aponto_blocked_periods_for_range` from
 * `get_slots()` — plain display, free to do slow work — and from `is_slot_free()`, which runs
 * inside `GET_LOCK` + the reservation transaction (§5 invariant 5) where a network call would hold
 * a database lock across a remote timeout. Inferring the difference from the shape of the query
 * (a one-day range, a concrete staff id) was possible and wrong: display legitimately asks for a
 * single day too, so the flag is explicit and defaults to the safe reading, `display`.
 */
final class SlotQuery {

	/**
	 * The display path: `get_slots()` and everything downstream of it.
	 */
	public const PURPOSE_DISPLAY = 'display';

	/**
	 * The authoritative booking path: `is_slot_free()`, inside the lock and transaction.
	 */
	public const PURPOSE_RESERVE = 'reserve';

	/**
	 * Construct a slot query.
	 *
	 * @param int      $service_id  Service id.
	 * @param int|null $staff_id    Staff id, or null for any-staff.
	 * @param int      $location_id Location id (0 = no location).
	 * @param string   $from_date   Inclusive start date `Y-m-d` (business tz).
	 * @param string   $to_date     Inclusive end date `Y-m-d` (business tz).
	 * @param string   $purpose     {@see self::PURPOSE_DISPLAY} or {@see self::PURPOSE_RESERVE}.
	 */
	public function __construct(
		public readonly int $service_id,
		public readonly ?int $staff_id,
		public readonly int $location_id,
		public readonly string $from_date,
		public readonly string $to_date,
		public readonly string $purpose = self::PURPOSE_DISPLAY
	) {}

	/**
	 * The same query narrowed to ONE concrete staff member.
	 *
	 * The any-staff display path resolves its candidates internally and then evaluates each one
	 * separately; this is what lets it hand a busy-source listener a query naming the staff member
	 * actually being evaluated instead of `null` (D-R34).
	 *
	 * @param int $staff_id Concrete staff id.
	 */
	public function withStaff( int $staff_id ): self {
		return new self( $this->service_id, $staff_id, $this->location_id, $this->from_date, $this->to_date, $this->purpose );
	}
}

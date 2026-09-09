<?php
/**
 * Schedule row (§4.2, §5.2).
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
 * One `aponto_schedules` row. `0` on `staff_id`/`service_id`/`location_id` is a WILDCARD; `weekday`
 * is ISO 1-7 (0 when `date_override` is set); `start_minute == end_minute == 0` marks the day
 * CLOSED (§4.2). Resolution is weight-based, see {@see ScheduleResolver}.
 */
final class ScheduleRow {

	/**
	 * Construct a schedule row.
	 *
	 * @param int         $staff_id      Staff id (0 = wildcard).
	 * @param int         $service_id    Service id (0 = wildcard).
	 * @param int         $location_id   Location id (0 = wildcard).
	 * @param int         $weekday       ISO weekday 1-7 (0 when date_override set).
	 * @param string|null $date_override Specific date `Y-m-d`, or null for a weekly rule.
	 * @param int         $start_minute  Open start minute-of-day.
	 * @param int         $end_minute    Open end minute-of-day.
	 */
	public function __construct(
		public readonly int $staff_id,
		public readonly int $service_id,
		public readonly int $location_id,
		public readonly int $weekday,
		public readonly ?string $date_override,
		public readonly int $start_minute,
		public readonly int $end_minute
	) {}
}

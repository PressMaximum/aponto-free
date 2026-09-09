<?php
/**
 * Resolved service definition (§4.2, §5.3).
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
 * The subset of a service row the engine needs, with every inheritable field already resolved
 * against global settings (`slot_step`, `min_lead`, `max_horizon` are `NULL` on the row = inherit
 * — §4.2). Buffers are the LIVE service buffers; a booking freezes its own copy at save time.
 */
final class ServiceDefinition {

	/**
	 * Construct a resolved service definition.
	 *
	 * @param int      $id               Service id.
	 * @param int      $duration_minutes Appointment duration.
	 * @param int      $buffer_before    Buffer before (minutes).
	 * @param int      $buffer_after     Buffer after (minutes).
	 * @param int      $slot_step        Resolved slot step (minutes, always > 0).
	 * @param int      $capacity         Attendee capacity (V1 always 1).
	 * @param int|null $price_minor      Snapshot price in minor units, or null (unpriced).
	 * @param int      $min_lead_minutes Resolved minimum lead time (minutes).
	 * @param int      $max_horizon_days Resolved maximum booking horizon (days).
	 * @param string   $status           Service status (`active`|`archived`).
	 */
	public function __construct(
		public readonly int $id,
		public readonly int $duration_minutes,
		public readonly int $buffer_before,
		public readonly int $buffer_after,
		public readonly int $slot_step,
		public readonly int $capacity,
		public readonly ?int $price_minor,
		public readonly int $min_lead_minutes,
		public readonly int $max_horizon_days,
		public readonly string $status
	) {}
}

<?php
/**
 * Blocking-status policy (§5.6, §8.1).
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
 * Single source of truth for which booking statuses occupy a slot. Default `['pending','confirmed']`;
 * the `aponto_blocking_statuses` filter is ADD-ONLY (extension-surface §2.1.1): core unions the
 * filter output with the defaults, so an extension can add a status but can never drop a default.
 * Used by both availability (`get_slots`) and reservation (`is_slot_free`/`reserve`).
 *
 * `cancelled`, `completed` and — since D-R33 — `no_show` are all absent by design: a slot is held
 * only while the appointment is still ahead of the business. `no_show` needs no entry here; it
 * belongs to the same "the time is spent or given back" family, which is also why the Dashboard's
 * booked value excludes it exactly as it excludes `cancelled` (SPEC-P1 §1.0.1).
 */
final class BlockingPolicy {

	/**
	 * The default blocking statuses.
	 *
	 * @var list<string>
	 */
	private const DEFAULTS = array( 'pending', 'confirmed' );

	/**
	 * Resolved blocking statuses (defaults ∪ filter additions), sanitized and unique.
	 *
	 * @return list<string>
	 */
	public function statuses(): array {
		/**
		 * Filter the statuses that occupy a slot (add-only — §8.1).
		 *
		 * @param list<string> $statuses Default blocking statuses.
		 */
		$filtered = apply_filters( 'aponto_blocking_statuses', self::DEFAULTS );

		$union = self::DEFAULTS;
		if ( is_array( $filtered ) ) {
			foreach ( $filtered as $status ) {
				if ( is_string( $status ) && '' !== $status ) {
					$union[] = $status;
				}
			}
		}

		return array_values( array_unique( $union ) );
	}
}

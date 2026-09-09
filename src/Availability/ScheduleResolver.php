<?php
/**
 * Weight-based schedule resolution (§5.2).
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
 * Resolves the effective OPEN periods of a single business date from the full set of schedule
 * rows, using the four-dimensional weight rule (§5.2).
 *
 * The weight sums four dimensions — `(date_override match ? 8 : 0) + (staff match ? 4 : 0) +
 * (service match ? 2 : 0) + (location match ? 1 : 0)`. Candidate rows must match staff ∈ {X,0},
 * service ∈ {S,0}, location ∈ {L,0} and either the exact `date_override` or (no override AND the
 * ISO weekday). The rows sharing the HIGHEST weight define the day; a `start == end == 0` row in
 * that set is an explicit CLOSED marker (holiday / day off), yielding no open period. Multiple
 * same-weight rows model split shifts.
 *
 * Pure — no WordPress, no database. Rows are loaded once for the whole range and resolved per day.
 */
final class ScheduleResolver {

	/**
	 * Effective open periods for one business date.
	 *
	 * @param list<ScheduleRow> $rows        All candidate schedule rows for the staff.
	 * @param int               $staff_id    Concrete staff id (X).
	 * @param int               $service_id  Concrete service id (S).
	 * @param int               $location_id Concrete location id (L).
	 * @param string            $date        Business date `Y-m-d`.
	 * @return list<array{0:int,1:int}> Open periods `[start_minute, end_minute]`, ascending; empty = closed.
	 */
	public function resolve( array $rows, int $staff_id, int $service_id, int $location_id, string $date ): array {
		$weekday     = (int) ( new \DateTimeImmutable( $date . ' 00:00:00', new \DateTimeZone( 'UTC' ) ) )->format( 'N' );
		$best_weight = -1;
		$best_rows   = array();

		foreach ( $rows as $row ) {
			if ( ! $this->matchesDimensions( $row, $staff_id, $service_id, $location_id ) ) {
				continue;
			}

			$is_override = null !== $row->date_override;
			if ( $is_override ) {
				if ( $row->date_override !== $date ) {
					continue;
				}
			} elseif ( $row->weekday !== $weekday ) {
				continue;
			}

			$weight = ( $is_override ? 8 : 0 )
				+ ( 0 !== $row->staff_id ? 4 : 0 )
				+ ( 0 !== $row->service_id ? 2 : 0 )
				+ ( 0 !== $row->location_id ? 1 : 0 );

			if ( $weight > $best_weight ) {
				$best_weight = $weight;
				$best_rows   = array( $row );
			} elseif ( $weight === $best_weight ) {
				$best_rows[] = $row;
			}
		}

		$periods = array();
		foreach ( $best_rows as $row ) {
			if ( $row->start_minute >= $row->end_minute ) {
				// A closed marker (`start == end == 0`) sharing the WINNING weight closes the day
				// outright — even when an open row ties at the same weight. Such a mix is a
				// contradictory duplicate (a holiday/day-off row must beat, not blend with, an open
				// row of equal specificity), so it is resolved FAIL-CLOSED. Split shifts are modelled
				// as multiple OPEN rows only (§5.2); they never include a closed marker.
				return array();
			}
			$periods[] = array( $row->start_minute, $row->end_minute );
		}

		usort(
			$periods,
			static fn ( array $a, array $b ): int => $a[0] <=> $b[0]
		);

		return $periods;
	}

	/**
	 * Whether a row's staff/service/location dimensions match the concrete triple (wildcard 0 ok).
	 *
	 * @param ScheduleRow $row         Candidate row.
	 * @param int         $staff_id    Concrete staff id.
	 * @param int         $service_id  Concrete service id.
	 * @param int         $location_id Concrete location id.
	 */
	private function matchesDimensions( ScheduleRow $row, int $staff_id, int $service_id, int $location_id ): bool {
		return ( 0 === $row->staff_id || $row->staff_id === $staff_id )
			&& ( 0 === $row->service_id || $row->service_id === $service_id )
			&& ( 0 === $row->location_id || $row->location_id === $location_id );
	}
}

<?php
/**
 * Slot generation (§5.3).
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
 * Generates the bookable slots of a single business date from resolved open periods and the busy
 * set, using the buffer-in-period rule (§5.3, P1-07).
 *
 * The candidate loop steps `for ($m = $periodStart + $bufBefore; $m + $dur + $bufAfter <=
 * $periodEnd; $m += $step)` and treats `[$m - $bufBefore, $m + $dur + $bufAfter]` as the occupied
 * interval (always ⊆ the period).
 *
 * The buffer is NOT clamped: it must fit inside the period. Consequently every occupied interval
 * lies inside a period ⊆ one local day, so no interval ever straddles midnight — this is what
 * closes the cross-day race (P1-08).
 *
 * Slot identity is the UTC instant of the core start (§5.4). A start that lands in a spring-forward
 * gap is dropped; a fall-back fold maps to a single earlier-UTC occurrence. All overlap arithmetic
 * is in UTC.
 *
 * Capacity (§5.3): with `capacity == 1` any overlap with a busy period rejects the slot. With
 * `capacity > 1` overlaps with bookings sharing the exact service + core start/end aggregate their
 * attendees (`booked += attendees`); any other overlap (different service/time, or a hard block)
 * rejects the slot; the slot is emitted while `capacity - booked >= 1`.
 *
 * Pure — no clock, no database; the only WordPress touchpoint is an optional diagnostic action
 * when a DST guard drops a candidate (guarded by `function_exists`, so unit tests run without
 * WordPress). Lead-time/horizon and display filters are applied by the engine layer, never here.
 */
final class SlotGenerator {

	/**
	 * Construct the generator.
	 *
	 * @param TimezoneConverter $converter Wall-clock converter (§5.4).
	 */
	public function __construct( private TimezoneConverter $converter ) {}

	/**
	 * Generate the bookable slots for one business date.
	 *
	 * @param ServiceDefinition        $service  Resolved service definition.
	 * @param list<array{0:int,1:int}> $periods  Open periods `[start_minute, end_minute]`.
	 * @param list<Period>             $busy     Busy periods (UTC), buffer-inflated for bookings.
	 * @param string                   $date     Business date `Y-m-d`.
	 * @param \DateTimeZone            $tz       Business timezone.
	 * @return list<Slot> Bookable slots (remaining >= 1), ascending by start, deduped by UTC start.
	 */
	public function generate( ServiceDefinition $service, array $periods, array $busy, string $date, \DateTimeZone $tz ): array {
		$dur      = $service->duration_minutes;
		$before   = $service->buffer_before;
		$after    = $service->buffer_after;
		$step     = $service->slot_step;
		$capacity = $service->capacity;

		if ( $dur <= 0 || $step <= 0 ) {
			return array();
		}

		$slots = array();

		foreach ( $periods as $period ) {
			$period_start = $period[0];
			$period_end   = $period[1];

			for ( $m = $period_start + $before; $m + $dur + $after <= $period_end; $m += $step ) {
				// V1 fold trade-off: wallToInstant() deliberately chooses the earlier UTC occurrence
				// for an ambiguous fall-back wall minute. We do not emit the later occurrence, which
				// can conservatively over-block one fold-hour slot but avoids ambiguous duplicate
				// booking identities until fold-aware UI selection exists.
				$core_start = $this->converter->wallToInstant( $date, $m, $tz );
				if ( null === $core_start ) {
					// Spring-forward gap: this wall time does not exist — drop the slot (§5.4).
					continue;
				}

				$core_end = $this->converter->endInstant( $date, $m + $dur, $tz );
				if ( null === $core_end ) {
					// The core end falls strictly inside a spring-forward gap: its real end cannot
					// be represented by wall arithmetic — drop rather than store a wrong end (E3).
					$this->reportDrop( $date, $m, 'end_in_gap' );
					continue;
				}

				$occ_lo = $this->converter->wallToInstantLenient( $date, $m - $before, $tz );
				$occ_hi = $this->converter->wallToInstantLenient( $date, $m + $dur + $after, $tz );

				// Envelope invariant (review E3): the occupied envelope must contain the core
				// interval. A violation means DST arithmetic collapsed the envelope — never emit
				// such a candidate; a wrong envelope could double-book.
				if ( $occ_lo > $core_start || $core_start >= $core_end || $core_end > $occ_hi ) {
					$this->reportDrop( $date, $m, 'envelope_invariant' );
					continue;
				}

				$remaining = $this->remaining( $service, $core_start, $core_end, $busy, $occ_lo, $occ_hi );
				if ( $remaining < 1 ) {
					continue;
				}

				$slot = new Slot( $core_start, $m, $remaining );
				// Dedup by UTC identity (a fold maps distinct wall minutes to distinct instants, so
				// collisions are not expected; the guard keeps identity authoritative regardless).
				$key = $slot->key();
				if ( ! isset( $slots[ $key ] ) ) {
					$slots[ $key ] = $slot;
				}
			}
		}

		$list = array_values( $slots );
		usort(
			$list,
			static fn ( Slot $a, Slot $b ): int => $a->start_utc->getTimestamp() <=> $b->start_utc->getTimestamp()
		);

		return $list;
	}

	/**
	 * Report a dropped candidate for diagnostics (review E3). Guarded so the generator stays
	 * usable in pure unit contexts without WordPress loaded.
	 *
	 * @param string $date   Business date `Y-m-d`.
	 * @param int    $minute Candidate start minute-of-day.
	 * @param string $reason Drop reason (`end_in_gap`|`envelope_invariant`).
	 */
	private function reportDrop( string $date, int $minute, string $reason ): void {
		if ( function_exists( 'do_action' ) ) {
			/**
			 * Fires when a slot candidate is dropped by a DST safety guard (diagnostic only).
			 *
			 * @param string $date   Business date.
			 * @param int    $minute Candidate start minute.
			 * @param string $reason Drop reason.
			 */
			do_action( 'aponto_slot_candidate_dropped', $date, $minute, $reason );
		}
	}

	/**
	 * Remaining capacity for a candidate slot, or 0 when it is rejected (§5.3).
	 *
	 * @param ServiceDefinition  $service    Resolved service.
	 * @param \DateTimeImmutable $core_start Candidate core start (UTC).
	 * @param \DateTimeImmutable $core_end   Candidate core end (UTC).
	 * @param list<Period>       $busy       Busy periods (UTC).
	 * @param \DateTimeImmutable $occ_lo     Candidate occupied interval start (UTC, buffered).
	 * @param \DateTimeImmutable $occ_hi     Candidate occupied interval end (UTC, buffered).
	 */
	private function remaining( ServiceDefinition $service, \DateTimeImmutable $core_start, \DateTimeImmutable $core_end, array $busy, \DateTimeImmutable $occ_lo, \DateTimeImmutable $occ_hi ): int {
		if ( $service->capacity <= 1 ) {
			foreach ( $busy as $period ) {
				if ( $period->overlaps( $occ_lo, $occ_hi ) ) {
					return 0;
				}
			}

			return 1;
		}

		$booked = 0;
		foreach ( $busy as $period ) {
			if ( ! $period->overlaps( $occ_lo, $occ_hi ) ) {
				continue;
			}
			if ( $period->sharesSlot( $service->id, $core_start, $core_end ) ) {
				$booked += $period->attendees;
				continue;
			}

			// Overlap with a different service/time or a hard block → slot is unavailable.
			return 0;
		}

		$remaining = $service->capacity - $booked;

		return $remaining > 0 ? $remaining : 0;
	}
}

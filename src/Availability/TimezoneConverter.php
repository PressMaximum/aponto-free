<?php
/**
 * Wall-clock -> UTC instant conversion (§5.4).
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
 * Converts a business-timezone wall time (local date + minute-of-day) into a UTC instant using
 * the exact algorithm pinned in SPEC-P0 §5.4:
 *
 *   1. Interpret the wall fields in the business timezone.
 *   2. Round-trip the resulting instant back to local time; if the wall fields changed the time
 *      does NOT EXIST (spring-forward gap) — the slot is dropped.
 *   3. If the wall time is ambiguous (fall-back fold) it maps to two instants; keep the EARLIER
 *      UTC one and emit a single occurrence.
 *
 * Slot identity is `start_utc` — never the local minute — so every comparison downstream is in
 * UTC. The implementation is deliberately offset-enumerating (not reliant on any particular PHP
 * disambiguation policy for ambiguous/nonexistent times) so behaviour is stable across PHP and
 * tzdata versions.
 *
 * Gap semantics (review E3): a wall time inside a spring-forward gap maps to THE TRANSITION
 * INSTANT itself — the moment the clocks jump — never PHP's minute-preserving normalisation
 * (which would map Berlin 02:30 to the instant displaying 03:30 and INVERT occupied envelopes).
 * All skipped wall readings collapse onto the jump instant, which keeps envelope boundaries
 * monotone with respect to real time.
 */
final class TimezoneConverter {

	/**
	 * The shared UTC zone.
	 *
	 * @var \DateTimeZone
	 */
	private \DateTimeZone $utc;

	/**
	 * Construct the converter.
	 */
	public function __construct() {
		$this->utc = new \DateTimeZone( 'UTC' );
	}

	/**
	 * Decompose a (date, minute) wall time into shared parts.
	 *
	 * @param string        $local_date Business-local calendar date `Y-m-d`.
	 * @param int           $minute     Minute of day (0..1440+; 1440 = next-day midnight boundary).
	 * @param \DateTimeZone $tz         Business timezone.
	 * @return array{fields: string, wall_as_utc: int, ts0: int}
	 *         `fields` = `Y-m-d H:i`; `wall_as_utc` = the wall fields reinterpreted as UTC seconds;
	 *         `ts0` = an anchor timestamp near the wall time for transition scans.
	 */
	private function wallParts( string $local_date, int $minute, \DateTimeZone $tz ): array {
		$day_shift = intdiv( $minute, 1440 );
		$rem       = $minute - ( $day_shift * 1440 );

		$base_date = ( new \DateTimeImmutable( $local_date . ' 00:00:00', $this->utc ) )
			->modify( '+' . $day_shift . ' day' )
			->format( 'Y-m-d' );

		$fields   = sprintf( '%s %02d:%02d', $base_date, intdiv( $rem, 60 ), $rem % 60 );
		$wall_str = $fields . ':00';

		return array(
			'fields'      => $fields,
			'wall_as_utc' => (int) ( new \DateTimeImmutable( $wall_str, $this->utc ) )->getTimestamp(),
			'ts0'         => ( new \DateTimeImmutable( $wall_str, $tz ) )->getTimestamp(),
		);
	}

	/**
	 * Every UTC instant whose local representation in `$tz` equals the given wall time.
	 *
	 * Returns an empty list for a non-existent (spring-gap) wall time, one instant for a normal
	 * wall time, and two instants (ascending) for an ambiguous (fall-back fold) wall time.
	 *
	 * @param string        $local_date Business-local calendar date `Y-m-d`.
	 * @param int           $minute     Minute of day (0..1440; 1440 = next-day midnight boundary).
	 * @param \DateTimeZone $tz         Business timezone.
	 * @return list<\DateTimeImmutable> UTC instants, ascending.
	 */
	public function wallToInstants( string $local_date, int $minute, \DateTimeZone $tz ): array {
		$parts = $this->wallParts( $local_date, $minute, $tz );

		// Collect every offset in effect within a two-day window around the wall time (covers the
		// std/DST pair straddling any transition), plus the anchor's own offset.
		$offsets = array( $tz->getOffset( new \DateTimeImmutable( '@' . $parts['ts0'] ) ) => true );
		foreach ( $this->transitions( $tz, $parts['ts0'] ) as $transition ) {
			$offsets[ (int) $transition['offset'] ] = true;
		}

		$found = array();
		foreach ( array_keys( $offsets ) as $offset ) {
			// Subtract a candidate offset to get the instant displaying these wall fields.
			$candidate = $parts['wall_as_utc'] - (int) $offset;
			$check     = ( new \DateTimeImmutable( '@' . $candidate ) )->setTimezone( $tz );
			if ( $check->format( 'Y-m-d H:i' ) === $parts['fields'] ) {
				$found[ $candidate ] = true;
			}
		}

		ksort( $found );

		$instants = array();
		foreach ( array_keys( $found ) as $timestamp ) {
			$instants[] = ( new \DateTimeImmutable( '@' . $timestamp ) )->setTimezone( $this->utc );
		}

		return $instants;
	}

	/**
	 * The UTC instant for a wall time, or null when it does not exist (spring-forward gap).
	 *
	 * For an ambiguous fall-back time the earlier UTC instant is returned (§5.4 step 3).
	 *
	 * @param string        $local_date Business-local calendar date `Y-m-d`.
	 * @param int           $minute     Minute of day (0..1440).
	 * @param \DateTimeZone $tz         Business timezone.
	 */
	public function wallToInstant( string $local_date, int $minute, \DateTimeZone $tz ): ?\DateTimeImmutable {
		$instants = $this->wallToInstants( $local_date, $minute, $tz );

		return array() === $instants ? null : $instants[0];
	}

	/**
	 * Like {@see self::wallToInstant()} but never null: a wall time inside a spring-forward gap
	 * maps to THE TRANSITION INSTANT (review E3) — every skipped reading collapses onto the moment
	 * the clocks jump, keeping occupied-envelope boundaries monotone. Used only for envelope
	 * boundaries; slot identity always uses the strict variant.
	 *
	 * @param string        $local_date Business-local calendar date `Y-m-d`.
	 * @param int           $minute     Minute of day (0..1440).
	 * @param \DateTimeZone $tz         Business timezone.
	 */
	public function wallToInstantLenient( string $local_date, int $minute, \DateTimeZone $tz ): \DateTimeImmutable {
		$strict = $this->wallToInstant( $local_date, $minute, $tz );
		if ( null !== $strict ) {
			return $strict;
		}

		$gap = $this->gapTransition( $local_date, $minute, $tz );
		if ( null !== $gap['instant'] ) {
			return $gap['instant'];
		}

		// Unreachable for a genuinely non-existent wall time (the gap scan finds its transition);
		// kept as a total-function fallback so envelope arithmetic can never fatal.
		$parts = $this->wallParts( $local_date, $minute, $tz );

		return ( new \DateTimeImmutable( '@' . $parts['ts0'] ) )->setTimezone( $this->utc );
	}

	/**
	 * The UTC instant for an interval END wall time, or null when the end cannot be represented.
	 *
	 * A normal wall time maps strictly (fold -> earlier occurrence, §5.4). A wall time inside a
	 * spring-forward gap is representable ONLY when it is exactly the first skipped reading (the
	 * gap start): an interval ending there truly ends at the transition instant. An end strictly
	 * inside the gap is ambiguous (elapsed vs wall semantics diverge) — callers must DROP such
	 * candidates rather than store a wrong end (review E3).
	 *
	 * @param string        $local_date Business-local calendar date `Y-m-d`.
	 * @param int           $minute     Minute of day (0..1440+).
	 * @param \DateTimeZone $tz         Business timezone.
	 */
	public function endInstant( string $local_date, int $minute, \DateTimeZone $tz ): ?\DateTimeImmutable {
		$strict = $this->wallToInstant( $local_date, $minute, $tz );
		if ( null !== $strict ) {
			return $strict;
		}

		$gap = $this->gapTransition( $local_date, $minute, $tz );
		if ( null !== $gap['instant'] && $gap['at_gap_start'] ) {
			return $gap['instant'];
		}

		return null;
	}

	/**
	 * Locate the spring-forward transition whose skipped wall range contains the given wall time.
	 *
	 * @param string        $local_date Business-local calendar date `Y-m-d`.
	 * @param int           $minute     Minute of day.
	 * @param \DateTimeZone $tz         Business timezone.
	 * @return array{instant: \DateTimeImmutable|null, at_gap_start: bool}
	 *         `instant` = the jump instant, or null when the wall time is not inside a gap;
	 *         `at_gap_start` = whether the wall time is exactly the first skipped reading.
	 */
	private function gapTransition( string $local_date, int $minute, \DateTimeZone $tz ): array {
		$parts       = $this->wallParts( $local_date, $minute, $tz );
		$transitions = $this->transitions( $tz, $parts['ts0'] );
		$none        = array(
			'instant'      => null,
			'at_gap_start' => false,
		);

		$count = count( $transitions );
		for ( $i = 1; $i < $count; $i++ ) {
			$off_before = (int) $transitions[ $i - 1 ]['offset'];
			$off_after  = (int) $transitions[ $i ]['offset'];
			if ( $off_after <= $off_before ) {
				continue; // Fall-back or no-op transition — no gap.
			}

			$jump      = (int) $transitions[ $i ]['ts'];
			$gap_start = $jump + $off_before; // First skipped wall reading, in wall-as-UTC seconds.
			$gap_end   = $jump + $off_after;  // First existing post-jump reading.
			if ( $parts['wall_as_utc'] >= $gap_start && $parts['wall_as_utc'] < $gap_end ) {
				return array(
					'instant'      => ( new \DateTimeImmutable( '@' . $jump ) )->setTimezone( $this->utc ),
					'at_gap_start' => $parts['wall_as_utc'] === $gap_start,
				);
			}
		}

		return $none;
	}

	/**
	 * Transitions around an anchor, normalized for fixed-offset zones where PHP returns false.
	 *
	 * @param \DateTimeZone $tz  Timezone.
	 * @param int           $ts0 Anchor timestamp.
	 * @return list<array{ts: int, time: string, offset: int, isdst: bool, abbr: string}>
	 */
	private function transitions( \DateTimeZone $tz, int $ts0 ): array {
		$transitions = $tz->getTransitions( $ts0 - 172800, $ts0 + 172800 );

		return is_array( $transitions ) ? $transitions : array();
	}

	/**
	 * Business-local date + minute-of-day for a UTC instant, in the given timezone.
	 *
	 * @param \DateTimeImmutable $instant UTC instant.
	 * @param \DateTimeZone      $tz      Target timezone.
	 * @return array{date: string, minute: int} `Y-m-d` local date and minute of day.
	 */
	public function instantToWall( \DateTimeImmutable $instant, \DateTimeZone $tz ): array {
		$local = $instant->setTimezone( $tz );

		return array(
			'date'   => $local->format( 'Y-m-d' ),
			'minute' => ( (int) $local->format( 'G' ) * 60 ) + (int) $local->format( 'i' ),
		);
	}
}

<?php
/**
 * Human-readable schedule cells.
 *
 * @package Aponto
 */

declare(strict_types=1);
namespace Aponto\Import;

/**
 * Parse only after CSV quoting/delimiters have been decoded.
 */
final class ScheduleCells {
	/**
	 * Import ScheduleCells contract.
	 *
	 * @param string $cell Decoded cell.
	 * @return list<string> Items.
	 * @throws \InvalidArgumentException On invalid input.
	 */
	private static function items( string $cell ): array {
		$items = preg_split( '/[|,]/', trim( $cell ) );
		if ( false === $items || count( $items ) > 100 ) {
			throw new \InvalidArgumentException( 'Use at most 100 intervals per cell.' );
		}
		return array_map( 'trim', $items );
	}
	/**
	 * Import ScheduleCells contract.
	 *
	 * @param string $time Wall clock.
	 * @return int Minute.
	 * @throws \InvalidArgumentException On invalid input.
	 */
	private static function minute( string $time ): int {
		if ( '24:00' === $time ) {
			return 1440;
		}
		if ( ! preg_match( '/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/', $time ) ) {
			throw new \InvalidArgumentException( 'Use HH:MM times.' );
		}
		return (int) substr( $time, 0, 2 ) * 60 + (int) substr( $time, 3 );
	}
	/**
	 * Import ScheduleCells contract.
	 *
	 * @param string $cell Day cell.
	 * @return list<array{start:int,end:int}> Periods.
	 * @throws \InvalidArgumentException On invalid input.
	 */
	public static function day( string $cell ): array {
		if ( 'OFF' === strtoupper( trim( $cell ) ) ) {
			return array();
		}
		$periods = array();
		foreach ( self::items( $cell ) as $item ) {
			if ( ! preg_match( '/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/', $item, $match ) ) {
				throw new \InvalidArgumentException( 'Use HH:MM-HH:MM intervals or OFF.' );
			}
			$start = self::minute( $match[1] );
			$end   = self::minute( $match[2] );
			if ( $start >= $end ) {
				throw new \InvalidArgumentException( 'End must follow start; split overnight shifts at midnight.' );
			}
			$periods[ $start . ':' . $end ] = array(
				'start' => $start,
				'end'   => $end,
			);
		}
		$periods = array_values( $periods );
		usort( $periods, static fn( $a, $b ) => $a['start'] <=> $b['start'] );
		$end = -1;
		foreach ( $periods as $period ) {
			if ( $period['start'] < $end ) {
				throw new \InvalidArgumentException( 'Work intervals must not overlap.' );
			}
			$end = $period['end'];
		}
		return $periods;
	}
	/**
	 * Import ScheduleCells contract.
	 *
	 * @param string $date ISO date.
	 * @return \DateTimeImmutable Date at UTC midnight for calendar arithmetic.
	 * @throws \InvalidArgumentException On invalid input.
	 */
	private static function date( string $date ): \DateTimeImmutable {
		$value = \DateTimeImmutable::createFromFormat( '!Y-m-d', $date, new \DateTimeZone( 'UTC' ) );
		if ( false === $value || $value->format( 'Y-m-d' ) !== $date ) {
			throw new \InvalidArgumentException( 'Use a valid YYYY-MM-DD date.' );
		}
		return $value;
	}
	/**
	 * Reject nonexistent AND ambiguous wall times by enumerating nearby timezone offsets.
	 *
	 * @param string        $wall Wall-clock timestamp.
	 * @param \DateTimeZone $zone Timezone.
	 * @throws \InvalidArgumentException On invalid input.
	 */
	private static function instant( string $wall, \DateTimeZone $zone ): string {
		$naive       = new \DateTimeImmutable( $wall, new \DateTimeZone( 'UTC' ) );
		$stamp       = $naive->getTimestamp();
		$offsets     = array( $zone->getOffset( $naive ) );
		$transitions = $zone->getTransitions( $stamp - 172800, $stamp + 172800 );
		foreach ( is_array( $transitions ) ? $transitions : array() as $transition ) {
			$offsets[] = $transition['offset'];
		}
		$found = array();
		foreach ( array_unique( $offsets ) as $offset ) {
			$candidate = $naive->setTimestamp( $stamp - $offset );
			if ( $candidate->setTimezone( $zone )->format( 'Y-m-d H:i:s' ) === $wall ) {
				$found[] = $candidate->format( 'Y-m-d H:i:s' );
			}
		}
		if ( 1 !== count( $found ) ) {
			throw new \InvalidArgumentException( 'Time off contains an ambiguous or nonexistent local time.' );
		}
		return $found[0];
	}
	/**
	 * Import ScheduleCells contract.
	 *
	 * @param string $cell Absences.
	 * @param string $timezone IANA timezone.
	 * @return list<array{start:string,end:string}> UTC ranges.
	 * @throws \InvalidArgumentException On invalid input.
	 */
	public static function timeOff( string $cell, string $timezone ): array {
		$zone = new \DateTimeZone( $timezone );
		$out  = array();
		foreach ( self::items( $cell ) as $item ) {
			if ( preg_match( '/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\.\.(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)$/', $item, $utc ) ) {
				$start_date = \DateTimeImmutable::createFromFormat( '!Y-m-d\TH:i:s\Z', $utc[1], new \DateTimeZone( 'UTC' ) );
				$end_date   = \DateTimeImmutable::createFromFormat( '!Y-m-d\TH:i:s\Z', $utc[2], new \DateTimeZone( 'UTC' ) );
				if ( ! $start_date || ! $end_date || $start_date->format( 'Y-m-d\TH:i:s\Z' ) !== $utc[1] || $end_date->format( 'Y-m-d\TH:i:s\Z' ) !== $utc[2] || $start_date >= $end_date ) {
					throw new \InvalidArgumentException( 'Use valid UTC time off endpoints with end after start.' );
				}
				$start                      = $start_date->format( 'Y-m-d H:i:s' );
				$end                        = $end_date->format( 'Y-m-d H:i:s' );
				$out[ $start . '/' . $end ] = array(
					'start' => $start,
					'end'   => $end,
				);
				continue;
			}

			if ( ! preg_match( '/^(\d{4}-\d{2}-\d{2})(?:\.\.(\d{4}-\d{2}-\d{2})| (\d{2}:\d{2})-(\d{2}:\d{2}))?$/', $item, $match ) ) {
				throw new \InvalidArgumentException( 'Use a date, date..date, or date HH:MM-HH:MM.' );
			}
			$date  = self::date( $match[1] );
			$start = $date->format( 'Y-m-d' ) . ' 00:00:00';
			$end   = ( empty( $match[2] ) ? $date : self::date( $match[2] ) )->modify( '+1 day' )->format( 'Y-m-d' ) . ' 00:00:00';
			if ( ! empty( $match[3] ) ) {
				$period = self::day( $match[3] . '-' . $match[4] )[0];
				$start  = $date->modify( '+' . $period['start'] . ' minutes' )->format( 'Y-m-d H:i:s' );
				$end    = $date->modify( '+' . $period['end'] . ' minutes' )->format( 'Y-m-d H:i:s' );
			}
			if ( $start >= $end ) {
				throw new \InvalidArgumentException( 'Time off end must follow start.' );
			}
			$start                      = self::instant( $start, $zone );
			$end                        = self::instant( $end, $zone );
			$out[ $start . '/' . $end ] = array(
				'start' => $start,
				'end'   => $end,
			);
		}
		return array_values( $out );
	}
}

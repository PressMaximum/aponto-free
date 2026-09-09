<?php
/**
 * Busy-source reader (§5.3, §8.1).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Booking\Repository;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Availability\BlockingPolicy;
use Aponto\Availability\Period;
use Aponto\Availability\SlotQuery;

/**
 * Loads the busy set for a staff member over a UTC window: blocking-status bookings inflated by
 * their OWN frozen buffers (§5.3), plus applicable blocked periods. Extensions then add busy via
 * the `aponto_blocked_periods_for_range` filter, which is SUBTRACT-ONLY (extension-surface §2.1.2)
 * — core retains every authoritative period and only unions in the additions.
 *
 * Two queries per range (bookings + blocks), shared by display and reserve so both see the same
 * busy set.
 */
final class BusyRepository {

	/**
	 * Construct the repository.
	 *
	 * @param \wpdb          $wpdb   Database handle.
	 * @param BlockingPolicy $policy Blocking-status policy.
	 */
	public function __construct(
		private \wpdb $wpdb,
		private BlockingPolicy $policy
	) {}

	/**
	 * The busy periods for a staff/location over a UTC window.
	 *
	 * @param int                $staff_id     Concrete staff id.
	 * @param int                $location_id  Location id.
	 * @param \DateTimeImmutable $window_start Window start (UTC, inclusive-ish).
	 * @param \DateTimeImmutable $window_end   Window end (UTC).
	 * @param SlotQuery          $query        The originating query (passed to the busy filter).
	 * @param int|null           $exclude_id   Booking id to exclude (reschedule/restore recheck).
	 * @return list<Period>
	 */
	public function forRange( int $staff_id, int $location_id, \DateTimeImmutable $window_start, \DateTimeImmutable $window_end, SlotQuery $query, ?int $exclude_id = null ): array {
		$periods = array_merge(
			$this->bookings( $staff_id, $window_start, $window_end, $exclude_id ),
			$this->blocks( $staff_id, $location_id, $window_start, $window_end )
		);

		/**
		 * Filter busy periods (subtract-only — §8.1). Extensions may only ADD busy periods; core
		 * unions the result with its own authoritative periods below.
		 *
		 * @param list<Period> $periods Core busy periods.
		 * @param SlotQuery    $query   The originating query.
		 */
		$filtered = apply_filters( 'aponto_blocked_periods_for_range', $periods, $query );

		return $this->union( $periods, is_array( $filtered ) ? $filtered : array() );
	}

	/**
	 * Busy periods for MANY staff over a UTC window, bucketed by staff id (any-staff display, §5.3).
	 * Two queries total (bookings + blocks) regardless of candidate count, so the any-staff budget
	 * stays "4 engine + 1 connection" (§5.8). A `staff_id = 0` block and every filter addition apply
	 * to ALL candidates.
	 *
	 * @param list<int>          $staff_ids    Candidate staff ids.
	 * @param int                $location_id  Location id.
	 * @param \DateTimeImmutable $window_start Window start (UTC).
	 * @param \DateTimeImmutable $window_end   Window end (UTC).
	 * @param SlotQuery          $query        The originating query (passed to the busy filter).
	 * @return array<int, list<Period>> Staff id => busy periods.
	 */
	public function forStaffIds( array $staff_ids, int $location_id, \DateTimeImmutable $window_start, \DateTimeImmutable $window_end, SlotQuery $query ): array {
		$buckets = array();
		foreach ( $staff_ids as $id ) {
			$buckets[ $id ] = array();
		}
		if ( array() === $staff_ids ) {
			return $buckets;
		}

		foreach ( $this->bookingsForStaffIds( $staff_ids, $window_start, $window_end ) as $entry ) {
			$buckets[ $entry['staff_id'] ][] = $entry['period'];
		}
		foreach ( $this->blocksForStaffIds( $staff_ids, $location_id, $window_start, $window_end ) as $entry ) {
			if ( 0 === $entry['staff_id'] ) {
				foreach ( $staff_ids as $id ) {
					$buckets[ $id ][] = $entry['period'];
				}
				continue;
			}
			$buckets[ $entry['staff_id'] ][] = $entry['period'];
		}

		// PER-STAFF dispatch (D-R34). This filter used to run ONCE with the any-staff query, and its
		// additions were then copied into EVERY bucket — the only thing a `staff_id = null` query can
		// mean. That silently over-blocks the moment a busy source becomes STAFF-AWARE: one staff
		// member's external calendar would delete another's slots. Core therefore narrows the query to
		// each candidate ({@see SlotQuery::withStaff()}) and buckets that candidate's additions alone.
		// A staff-agnostic listener is unaffected: it returns the same periods for every candidate, so
		// every bucket still receives them, exactly as before. Subtract-only is untouched — each
		// bucket keeps its authoritative core periods and only gains additions (§8.1 invariant 2).
		foreach ( $staff_ids as $id ) {
			$scoped   = $id === $query->staff_id ? $query : $query->withStaff( $id );
			$filtered = apply_filters( 'aponto_blocked_periods_for_range', $buckets[ $id ], $scoped );
			foreach ( $this->additions( $buckets[ $id ], is_array( $filtered ) ? $filtered : array() ) as $period ) {
				$buckets[ $id ][] = $period;
			}
		}

		return $buckets;
	}

	/**
	 * Blocking-status bookings inflated by their frozen buffers.
	 *
	 * @param int                $staff_id     Staff id.
	 * @param \DateTimeImmutable $window_start Window start (UTC).
	 * @param \DateTimeImmutable $window_end   Window end (UTC).
	 * @param int|null           $exclude_id   Booking id to exclude.
	 * @return list<Period>
	 */
	private function bookings( int $staff_id, \DateTimeImmutable $window_start, \DateTimeImmutable $window_end, ?int $exclude_id ): array {
		$statuses = $this->policy->statuses();
		if ( array() === $statuses ) {
			return array();
		}

		$table        = $this->wpdb->prefix . 'aponto_bookings';
		$placeholders = implode( ', ', array_fill( 0, count( $statuses ), '%s' ) );
		$params       = array_merge(
			array( $staff_id ),
			$statuses,
			array( $window_end->format( 'Y-m-d H:i:s' ), $window_start->format( 'Y-m-d H:i:s' ), (int) $exclude_id )
		);

		// Overlap test on core times, widened later by each booking's frozen buffers.
		$sql = "SELECT id, service_id, start_datetime_utc, end_datetime_utc, buffer_before, buffer_after, attendees
			FROM {$table}
			WHERE staff_id = %d AND status IN ( {$placeholders} )
			  AND start_datetime_utc < %s AND end_datetime_utc > %s
			  AND id <> %d";

		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.PreparedSQL.NotPrepared -- SQL identifiers/placeholders are internal and all values are passed to wpdb::prepare.
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $params ), ARRAY_A );

		$out = array();
		foreach ( (array) $rows as $row ) {
			$out[] = $this->bookingPeriod( $row );
		}

		return $out;
	}

	/**
	 * Blocking-status bookings for many staff, tagged with their staff id.
	 *
	 * @param list<int>          $staff_ids    Candidate staff ids.
	 * @param \DateTimeImmutable $window_start Window start (UTC).
	 * @param \DateTimeImmutable $window_end   Window end (UTC).
	 * @return list<array{staff_id: int, period: Period}>
	 */
	private function bookingsForStaffIds( array $staff_ids, \DateTimeImmutable $window_start, \DateTimeImmutable $window_end ): array {
		$statuses = $this->policy->statuses();
		if ( array() === $statuses || array() === $staff_ids ) {
			return array();
		}

		$table         = $this->wpdb->prefix . 'aponto_bookings';
		$staff_holders = implode( ', ', array_fill( 0, count( $staff_ids ), '%d' ) );
		$stat_holders  = implode( ', ', array_fill( 0, count( $statuses ), '%s' ) );
		$params        = array_merge(
			$staff_ids,
			$statuses,
			array( $window_end->format( 'Y-m-d H:i:s' ), $window_start->format( 'Y-m-d H:i:s' ) )
		);

		$sql = "SELECT id, staff_id, service_id, start_datetime_utc, end_datetime_utc, buffer_before, buffer_after, attendees
			FROM {$table}
			WHERE staff_id IN ( {$staff_holders} ) AND status IN ( {$stat_holders} )
			  AND start_datetime_utc < %s AND end_datetime_utc > %s";

		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.PreparedSQL.NotPrepared -- SQL identifiers/placeholders are internal and all values are passed to wpdb::prepare.
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $params ), ARRAY_A );

		$out = array();
		foreach ( (array) $rows as $row ) {
			$out[] = array(
				'staff_id' => (int) $row['staff_id'],
				'period'   => $this->bookingPeriod( $row ),
			);
		}

		return $out;
	}

	/**
	 * Build a buffer-inflated booking {@see Period} from a row.
	 *
	 * @param array<string, mixed> $row Booking row.
	 */
	private function bookingPeriod( array $row ): Period {
		$core_start = new \DateTimeImmutable( (string) $row['start_datetime_utc'], new \DateTimeZone( 'UTC' ) );
		$core_end   = new \DateTimeImmutable( (string) $row['end_datetime_utc'], new \DateTimeZone( 'UTC' ) );
		$before     = (int) $row['buffer_before'];
		$after      = (int) $row['buffer_after'];

		return new Period(
			$before > 0 ? $core_start->modify( '-' . $before . ' minutes' ) : $core_start,
			$after > 0 ? $core_end->modify( '+' . $after . ' minutes' ) : $core_end,
			true,
			(int) $row['service_id'],
			$core_start,
			$core_end,
			max( 1, (int) $row['attendees'] ),
			(int) $row['id']
		);
	}

	/**
	 * Blocked periods applicable to the staff/location.
	 *
	 * @param int                $staff_id     Staff id.
	 * @param int                $location_id  Location id.
	 * @param \DateTimeImmutable $window_start Window start (UTC).
	 * @param \DateTimeImmutable $window_end   Window end (UTC).
	 * @return list<Period>
	 */
	private function blocks( int $staff_id, int $location_id, \DateTimeImmutable $window_start, \DateTimeImmutable $window_end ): array {
		$table = $this->wpdb->prefix . 'aponto_blocked_periods';
		$sql   = "SELECT start_datetime_utc, end_datetime_utc
			FROM {$table}
			WHERE ( staff_id = 0 OR staff_id = %d )
			  AND ( location_id = 0 OR location_id = %d )
			  AND start_datetime_utc < %s AND end_datetime_utc > %s";

		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter -- SQL table name is internal and all values are passed to wpdb::prepare.
		$rows = $this->wpdb->get_results(
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- Values are passed to wpdb::prepare; sniff cannot recognize the injected wpdb property.
			$this->wpdb->prepare( $sql, $staff_id, $location_id, $window_end->format( 'Y-m-d H:i:s' ), $window_start->format( 'Y-m-d H:i:s' ) ),
			ARRAY_A
		);

		$out = array();
		foreach ( (array) $rows as $row ) {
			$out[] = $this->blockPeriod( $row );
		}

		return $out;
	}

	/**
	 * Blocked periods for many staff, tagged with their staff id (`0` = applies to all).
	 *
	 * @param list<int>          $staff_ids    Candidate staff ids.
	 * @param int                $location_id  Location id.
	 * @param \DateTimeImmutable $window_start Window start (UTC).
	 * @param \DateTimeImmutable $window_end   Window end (UTC).
	 * @return list<array{staff_id: int, period: Period}>
	 */
	private function blocksForStaffIds( array $staff_ids, int $location_id, \DateTimeImmutable $window_start, \DateTimeImmutable $window_end ): array {
		if ( array() === $staff_ids ) {
			return array();
		}

		$table         = $this->wpdb->prefix . 'aponto_blocked_periods';
		$staff_holders = implode( ', ', array_fill( 0, count( $staff_ids ), '%d' ) );
		$params        = array_merge(
			$staff_ids,
			array( $location_id, $window_end->format( 'Y-m-d H:i:s' ), $window_start->format( 'Y-m-d H:i:s' ) )
		);

		$sql = "SELECT staff_id, start_datetime_utc, end_datetime_utc
			FROM {$table}
			WHERE ( staff_id = 0 OR staff_id IN ( {$staff_holders} ) )
			  AND ( location_id = 0 OR location_id = %d )
			  AND start_datetime_utc < %s AND end_datetime_utc > %s";

		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.PreparedSQL.NotPrepared -- SQL identifiers/placeholders are internal and all values are passed to wpdb::prepare.
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $params ), ARRAY_A );

		$out = array();
		foreach ( (array) $rows as $row ) {
			$out[] = array(
				'staff_id' => (int) $row['staff_id'],
				'period'   => $this->blockPeriod( $row ),
			);
		}

		return $out;
	}

	/**
	 * Build a hard-block {@see Period} from a row.
	 *
	 * @param array<string, mixed> $row Blocked-period row.
	 */
	private function blockPeriod( array $row ): Period {
		return new Period(
			new \DateTimeImmutable( (string) $row['start_datetime_utc'], new \DateTimeZone( 'UTC' ) ),
			new \DateTimeImmutable( (string) $row['end_datetime_utc'], new \DateTimeZone( 'UTC' ) )
		);
	}

	/**
	 * Subtract-only union: every core period plus any filter additions (§8.1 invariant 2).
	 *
	 * @param list<Period> $core     Authoritative core periods.
	 * @param array<mixed> $filtered Filter output (untrusted shape).
	 * @return list<Period>
	 */
	private function union( array $core, array $filtered ): array {
		return array_merge( $core, $this->additions( $core, $filtered ) );
	}

	/**
	 * The NEW valid {@see Period} additions from a busy filter (subtract-only): real Period
	 * instances not already present by identity. Core periods are never dropped or shrunk (§8.1).
	 *
	 * @param list<Period> $core     Authoritative core periods.
	 * @param array<mixed> $filtered Filter output (untrusted shape).
	 * @return list<Period>
	 */
	private function additions( array $core, array $filtered ): array {
		$seen = array();
		foreach ( $core as $period ) {
			$seen[ $this->identity( $period ) ] = true;
		}

		$out = array();
		foreach ( $filtered as $period ) {
			if ( ! $period instanceof Period ) {
				continue;
			}
			$id = $this->identity( $period );
			if ( isset( $seen[ $id ] ) ) {
				continue;
			}
			$seen[ $id ] = true;
			$out[]       = $period;
		}

		return $out;
	}

	/**
	 * Identity string for de-duplicating periods in the union.
	 *
	 * @param Period $period Period.
	 */
	private function identity( Period $period ): string {
		return $period->start_utc->format( 'U' ) . '|' . $period->end_utc->format( 'U' ) . '|' . ( $period->booking_id ?? 0 );
	}
}

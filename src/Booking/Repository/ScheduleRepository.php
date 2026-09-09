<?php
/**
 * Schedule reader (§4.2, §5.2).
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

use Aponto\Availability\ScheduleRow;

/**
 * Loads all schedule rows relevant to a staff member (concrete id and the `0` wildcard) in a
 * single query, so the resolver can weight them per day in memory (query-budget §5.8).
 */
final class ScheduleRepository {

	/**
	 * Construct the repository.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct( private \wpdb $wpdb ) {}

	/**
	 * All candidate schedule rows for a staff id (its own rows plus wildcard `0` rows).
	 *
	 * @param int $staff_id Concrete staff id.
	 * @return list<ScheduleRow>
	 */
	public function forStaff( int $staff_id ): array {
		return $this->forStaffIds( array( $staff_id ) );
	}

	/**
	 * All candidate schedule rows for a set of staff ids (their own rows plus wildcard `0` rows),
	 * loaded in a single query so any-staff resolution stays within the query budget (§5.8).
	 *
	 * @param list<int> $staff_ids Concrete staff ids.
	 * @return list<ScheduleRow>
	 */
	public function forStaffIds( array $staff_ids ): array {
		$ids = array( 0 );
		foreach ( $staff_ids as $id ) {
			$ids[] = (int) $id;
		}
		$ids = array_values( array_unique( $ids ) );

		$table   = $this->wpdb->prefix . 'aponto_schedules';
		$holders = implode( ', ', array_fill( 0, count( $ids ), '%d' ) );
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare -- table name from $wpdb->prefix and placeholders generated internally; values are passed to wpdb::prepare.
		$sql = $this->wpdb->prepare( "SELECT staff_id, service_id, location_id, weekday, date_override, start_minute, end_minute FROM {$table} WHERE staff_id IN ( {$holders} )", $ids );
		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.PreparedSQL.NotPrepared -- Prepared SQL uses a table name from $wpdb->prefix and internally generated placeholders, not user input.
		$rows = $this->wpdb->get_results( $sql, ARRAY_A );

		$out = array();
		foreach ( (array) $rows as $row ) {
			$out[] = new ScheduleRow(
				(int) $row['staff_id'],
				(int) $row['service_id'],
				(int) $row['location_id'],
				(int) $row['weekday'],
				null !== $row['date_override'] ? (string) $row['date_override'] : null,
				(int) $row['start_minute'],
				(int) $row['end_minute']
			);
		}

		return $out;
	}
}

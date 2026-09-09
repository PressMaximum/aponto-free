<?php
/**
 * Staff schedule gateway (bulk weekly + overrides).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Rest\Data;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * Reads and fully replaces the `aponto_schedules` rows for a `(staff_id, service_id, location_id)`
 * scope backing `PUT /staff/{id}/schedule` (rest-contract §2.6). REST nulls for service/location map
 * to the DB wildcard `0`. A weekly weekday or an override date whose periods are empty is stored as
 * a single closed marker row (`start_minute = end_minute = 0`, §5.2); a weekday/date with no rows
 * inherits from the wildcard.
 */
final class ScheduleGateway {

	/**
	 * Construct the gateway.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct( private \wpdb $wpdb ) {}

	/**
	 * Table name.
	 */
	private function table(): string {
		return $this->wpdb->prefix . 'aponto_schedules';
	}

	/**
	 * Whether a staff row exists.
	 *
	 * @param int $staff_id Staff id.
	 */
	public function staffExists( int $staff_id ): bool {
		$table = $this->wpdb->prefix . 'aponto_staff';
		$sql   = "SELECT COUNT(*) FROM {$table} WHERE id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		return (int) $this->wpdb->get_var( $this->wpdb->prepare( $sql, $staff_id ) ) > 0;
	}

	/**
	 * Read the schedule rows for a scope.
	 *
	 * @param int $staff_id    Staff id.
	 * @param int $service_id  Service id (0 = wildcard).
	 * @param int $location_id Location id (0 = wildcard).
	 * @return list<array<string, mixed>>
	 */
	public function read( int $staff_id, int $service_id, int $location_id ): array {
		$table = $this->table();
		$sql   = "SELECT weekday, date_override, start_minute, end_minute FROM {$table}
			WHERE staff_id = %d AND service_id = %d AND location_id = %d
			ORDER BY date_override IS NULL DESC, weekday ASC, date_override ASC, start_minute ASC";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $staff_id, $service_id, $location_id ), ARRAY_A );

		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * Fully replace the schedule rows for a scope.
	 *
	 * @param int                                                                                   $staff_id    Staff id.
	 * @param int                                                                                   $service_id  Service id (0 = wildcard).
	 * @param int                                                                                   $location_id Location id (0 = wildcard).
	 * @param list<array{weekday:int, date_override:string|null, start_minute:int, end_minute:int}> $rows Row set.
	 */
	public function replace( int $staff_id, int $service_id, int $location_id, array $rows ): void {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Scoped full-replacement delete.
		$this->wpdb->delete(
			$this->table(),
			array(
				'staff_id'    => $staff_id,
				'service_id'  => $service_id,
				'location_id' => $location_id,
			),
			array( '%d', '%d', '%d' )
		);

		foreach ( $rows as $row ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Full-replacement insert.
			$this->wpdb->insert(
				$this->table(),
				array(
					'staff_id'      => $staff_id,
					'service_id'    => $service_id,
					'location_id'   => $location_id,
					'weekday'       => $row['weekday'],
					'date_override' => $row['date_override'],
					'start_minute'  => $row['start_minute'],
					'end_minute'    => $row['end_minute'],
				),
				array( '%d', '%d', '%d', '%d', '%s', '%d', '%d' )
			);
		}
	}
}

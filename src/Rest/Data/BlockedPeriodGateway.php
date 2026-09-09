<?php
/**
 * Blocked-period CRUD gateway (admin REST).
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
 * Direct SQL gateway for the `aponto_blocked_periods` table backing the admin `/blocked-periods`
 * routes. The engine's {@see \Aponto\Booking\Repository\BusyRepository} reads these rows to subtract
 * busy time during slot generation; this gateway owns the admin list/create/delete surface without
 * touching it. Datetimes are stored as MySQL `Y-m-d H:i:s` in UTC.
 */
final class BlockedPeriodGateway {

	/**
	 * Selectable columns in DTO order.
	 */
	private const COLUMNS = 'id, staff_id, location_id, start_datetime_utc, end_datetime_utc, reason, source';

	/**
	 * Construct the gateway.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct(
		private \wpdb $wpdb
	) {}

	/**
	 * Table name.
	 */
	private function table(): string {
		return $this->wpdb->prefix . 'aponto_blocked_periods';
	}

	/**
	 * List a staff member's blocks overlapping the `[from, to)` UTC window, paginated.
	 *
	 * @param int    $staff_id Staff id.
	 * @param string $from_sql Window start (`Y-m-d H:i:s`, UTC).
	 * @param string $to_sql   Window end (`Y-m-d H:i:s`, UTC).
	 * @param int    $page     Page (>=1).
	 * @param int    $per_page Page size (1..100).
	 * @return array{items: list<array<string, mixed>>, total: int}
	 */
	public function list( int $staff_id, string $from_sql, string $to_sql, int $page, int $per_page ): array {
		$table  = $this->table();
		$params = array( $staff_id, $to_sql, $from_sql );

		$count_sql = "SELECT COUNT(*) FROM {$table} WHERE staff_id = %d AND start_datetime_utc < %s AND end_datetime_utc > %s";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; params bound via prepare().
		$total = (int) $this->wpdb->get_var( $this->wpdb->prepare( $count_sql, $params ) );

		$offset      = ( $page - 1 ) * $per_page;
		$list_params = array_merge( $params, array( $per_page, $offset ) );
		$list_sql    = 'SELECT ' . self::COLUMNS . " FROM {$table} WHERE staff_id = %d AND start_datetime_utc < %s AND end_datetime_utc > %s ORDER BY start_datetime_utc ASC, id ASC LIMIT %d OFFSET %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; params bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $list_sql, $list_params ), ARRAY_A );

		return array(
			'items' => is_array( $rows ) ? $rows : array(),
			'total' => $total,
		);
	}

	/**
	 * Find one blocked-period row.
	 *
	 * @param int $id Blocked-period id.
	 * @return array<string, mixed>|null
	 */
	public function find( int $id ): ?array {
		$table = $this->table();
		$sql   = 'SELECT ' . self::COLUMNS . " FROM {$table} WHERE id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; params bound via prepare().
		$row = $this->wpdb->get_row( $this->wpdb->prepare( $sql, $id ), ARRAY_A );

		return is_array( $row ) ? $row : null;
	}

	/**
	 * Insert a blocked period, returning its id.
	 *
	 * @param array<string, mixed> $data Column => value (validated).
	 */
	public function create( array $data ): int {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Admin insert.
		$this->wpdb->insert( $this->table(), $data, $this->formats( $data ) );

		return (int) $this->wpdb->insert_id;
	}

	/**
	 * Delete a blocked-period row.
	 *
	 * @param int $id Blocked-period id.
	 */
	public function delete( int $id ): void {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Admin delete.
		$this->wpdb->delete( $this->table(), array( 'id' => $id ), array( '%d' ) );
	}

	/**
	 * Build the `$wpdb` format list for a column map.
	 *
	 * @param array<string, mixed> $data Column => value.
	 * @return list<string>
	 */
	private function formats( array $data ): array {
		$int_cols = array( 'staff_id', 'location_id' );
		$formats  = array();
		foreach ( array_keys( $data ) as $column ) {
			$formats[] = in_array( $column, $int_cols, true ) ? '%d' : '%s';
		}

		return $formats;
	}
}

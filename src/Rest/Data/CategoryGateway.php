<?php
/**
 * Service-category CRUD gateway (admin REST).
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
 * Direct SQL gateway for the `aponto_service_categories` table backing the admin
 * `/service-categories` routes. The table carries no timestamps (id, name, position only), so this
 * gateway owns list/create/update/delete/reorder plus the service-count subquery and the
 * uncategorize sweep that nulls `aponto_services.category_id` on delete.
 */
final class CategoryGateway {

	/**
	 * Construct the gateway.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct(
		private \wpdb $wpdb
	) {}

	/**
	 * Category table name.
	 */
	private function table(): string {
		return $this->wpdb->prefix . 'aponto_service_categories';
	}

	/**
	 * Services table name.
	 */
	private function servicesTable(): string {
		return $this->wpdb->prefix . 'aponto_services';
	}

	/**
	 * List every category ordered by position, each with its service count.
	 *
	 * @return list<array<string, mixed>>
	 */
	public function list(): array {
		$table    = $this->table();
		$services = $this->servicesTable();
		$sql      = "SELECT c.id, c.name, c.position, ( SELECT COUNT(*) FROM {$services} s WHERE s.category_id = c.id ) AS count FROM {$table} c ORDER BY c.position ASC, c.id ASC";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; no user input.
		$rows = $this->wpdb->get_results( $sql, ARRAY_A );

		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * Find one category row.
	 *
	 * @param int $id Category id.
	 * @return array<string, mixed>|null
	 */
	public function find( int $id ): ?array {
		$table = $this->table();
		$sql   = "SELECT id, name, position FROM {$table} WHERE id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; params bound via prepare().
		$row = $this->wpdb->get_row( $this->wpdb->prepare( $sql, $id ), ARRAY_A );

		return is_array( $row ) ? $row : null;
	}

	/**
	 * Number of services assigned to a category.
	 *
	 * @param int $id Category id.
	 */
	public function countServices( int $id ): int {
		$services = $this->servicesTable();
		$sql      = "SELECT COUNT(*) FROM {$services} WHERE category_id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; params bound via prepare().
		return (int) $this->wpdb->get_var( $this->wpdb->prepare( $sql, $id ) );
	}

	/**
	 * Highest existing position, or `-1` when the table is empty (so append yields position `0`).
	 */
	public function maxPosition(): int {
		$table = $this->table();
		$sql   = "SELECT COALESCE( MAX( position ), -1 ) FROM {$table}";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; no user input.
		return (int) $this->wpdb->get_var( $sql );
	}

	/**
	 * Insert a category, returning its id.
	 *
	 * @param array<string, mixed> $data Column => value (validated).
	 */
	public function create( array $data ): int {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Admin insert.
		$this->wpdb->insert( $this->table(), $data, $this->formats( $data ) );

		return (int) $this->wpdb->insert_id;
	}

	/**
	 * Update a category's provided columns.
	 *
	 * @param int                  $id   Category id.
	 * @param array<string, mixed> $data Column => value (partial).
	 */
	public function update( int $id, array $data ): void {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Admin update.
		$this->wpdb->update( $this->table(), $data, array( 'id' => $id ), $this->formats( $data ), array( '%d' ) );
	}

	/**
	 * Delete a category row.
	 *
	 * @param int $id Category id.
	 */
	public function delete( int $id ): void {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Admin delete.
		$this->wpdb->delete( $this->table(), array( 'id' => $id ), array( '%d' ) );
	}

	/**
	 * Detach every service from a category, returning how many rows were uncategorized.
	 *
	 * @param int $id Category id.
	 */
	public function uncategorize( int $id ): int {
		$services = $this->servicesTable();
		$sql      = "UPDATE {$services} SET category_id = NULL WHERE category_id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; params bound via prepare().
		$affected = $this->wpdb->query( $this->wpdb->prepare( $sql, $id ) );

		return (int) $affected;
	}

	/**
	 * All category ids in the reorder scope (for full-replacement validation).
	 *
	 * @return list<int>
	 */
	public function allIds(): array {
		$table = $this->table();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; no user input.
		$ids = $this->wpdb->get_col( "SELECT id FROM {$table} ORDER BY position ASC, id ASC" );

		return array_map( 'intval', is_array( $ids ) ? $ids : array() );
	}

	/**
	 * Apply a new ordering (position = index).
	 *
	 * @param list<int> $ids Ordered category ids (full set).
	 */
	public function reorder( array $ids ): void {
		foreach ( array_values( $ids ) as $index => $id ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Admin reorder.
			$this->wpdb->update( $this->table(), array( 'position' => $index ), array( 'id' => (int) $id ), array( '%d' ), array( '%d' ) );
		}
	}

	/**
	 * Build the `$wpdb` format list for a column map (`position` is an integer).
	 *
	 * @param array<string, mixed> $data Column => value.
	 * @return list<string>
	 */
	private function formats( array $data ): array {
		$formats = array();
		foreach ( array_keys( $data ) as $column ) {
			$formats[] = 'position' === $column ? '%d' : '%s';
		}

		return $formats;
	}
}

<?php
/**
 * Location CRUD gateway (admin REST).
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

/** Read-only SQL gateway for optional structured business locations (D-R43). */
final class LocationGateway {

	/**
	 * Selectable columns in DTO order.
	 */
	private const COLUMNS = 'id, name, address_line1, address_line2, city, region, postal_code, country, phone, timezone, status';

	/**
	 * Construct the gateway.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct( private \wpdb $wpdb ) {}

	/**
	 * List locations with status, search and pagination.
	 *
	 * @param string $status   `active|archived|all`.
	 * @param string $search   Name search.
	 * @param int    $page     Page number.
	 * @param int    $per_page Page size.
	 * @return array{items: list<array<string, mixed>>, total: int}
	 */
	public function list( string $status, string $search, int $page, int $per_page ): array {
		$table  = $this->table();
		$where  = array();
		$params = array();
		if ( 'all' !== $status ) {
			$where[]  = 'status = %s';
			$params[] = $status;
		}
		if ( '' !== $search ) {
			$where[]  = 'name LIKE %s';
			$params[] = '%' . $this->wpdb->esc_like( $search ) . '%';
		}
		$where_sql = array() === $where ? '' : ' WHERE ' . implode( ' AND ', $where );

		$count_sql = "SELECT COUNT(*) FROM {$table}{$where_sql}";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; params bound via prepare().
		$total = (int) $this->wpdb->get_var( array() === $params ? $count_sql : $this->wpdb->prepare( $count_sql, $params ) );

		$list_params = array_merge( $params, array( $per_page, ( $page - 1 ) * $per_page ) );
		$list_sql    = 'SELECT ' . self::COLUMNS . " FROM {$table}{$where_sql} ORDER BY name ASC, id ASC LIMIT %d OFFSET %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; params bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $list_sql, $list_params ), ARRAY_A );

		return array(
			'items' => is_array( $rows ) ? $rows : array(),
			'total' => $total,
		);
	}

	/**
	 * Find one location.
	 *
	 * @param int $id Location id.
	 * @return array<string, mixed>|null
	 */
	public function find( int $id ): ?array {
		$table = $this->table();
		$sql   = 'SELECT ' . self::COLUMNS . " FROM {$table} WHERE id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; id bound via prepare().
		$row = $this->wpdb->get_row( $this->wpdb->prepare( $sql, $id ), ARRAY_A );

		return is_array( $row ) ? $row : null;
	}

	/**
	 * Location table name.
	 */
	private function table(): string {
		return $this->wpdb->prefix . 'aponto_locations';
	}
}

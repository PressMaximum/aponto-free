<?php
/**
 * Export read gateway (unpaginated CSV feeds).
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
 * Read-side queries backing the admin `/export/*.csv` routes. Each method returns the full matching
 * result set (no pagination) in a deterministic order so the CSV export is stable and complete. The
 * booking query mirrors the joins/filters of {@see BookingReadGateway::listBookings} minus the LIMIT;
 * this gateway never mutates data.
 */
final class ExportGateway {

	/**
	 * Construct the gateway.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct( private \wpdb $wpdb ) {}

	/**
	 * Every booking matching the filters (no pagination), joined to service, staff, customer and
	 * order, ordered by start instant then id.
	 *
	 * @param array{status:string, service_id:?int, staff_id:?int, from:string, to:string, search:string} $filters Filters.
	 * @return list<array<string, mixed>>
	 */
	public function exportBookings( array $filters ): array {
		$p     = $this->wpdb->prefix;
		$where = array();
		$args  = array();

		if ( 'all' !== $filters['status'] ) {
			$where[] = 'b.status = %s';
			$args[]  = $filters['status'];
		}
		if ( null !== $filters['service_id'] ) {
			$where[] = 'b.service_id = %d';
			$args[]  = $filters['service_id'];
		}
		if ( null !== $filters['staff_id'] ) {
			$where[] = 'b.staff_id = %d';
			$args[]  = $filters['staff_id'];
		}
		if ( '' !== $filters['from'] ) {
			$where[] = 'b.start_datetime_utc >= %s';
			$args[]  = $filters['from'];
		}
		if ( '' !== $filters['to'] ) {
			$where[] = 'b.start_datetime_utc < %s';
			$args[]  = $filters['to'];
		}
		if ( '' !== $filters['search'] ) {
			// Contract haystack (rest-contract §2.8, amended 2026-07-18): customer name +
			// customer email + service name + order code — same fields the admin list UI
			// searches, so the export matches the on-screen "current view".
			$like    = '%' . $this->wpdb->esc_like( $filters['search'] ) . '%';
			$where[] = '(c.name LIKE %s OR c.email LIKE %s OR s.name LIKE %s OR o.code LIKE %s)';
			$args[]  = $like;
			$args[]  = $like;
			$args[]  = $like;
			$args[]  = $like;
		}
		$where_sql = array() === $where ? '' : ' WHERE ' . implode( ' AND ', $where );

		$from_sql = "FROM {$p}aponto_bookings b
			LEFT JOIN {$p}aponto_services s ON s.id = b.service_id
			LEFT JOIN {$p}aponto_staff st ON st.id = b.staff_id
			LEFT JOIN {$p}aponto_customers c ON c.id = b.customer_id
			LEFT JOIN {$p}aponto_order_items oi ON oi.booking_id = b.id AND oi.item_type = 'booking'
			LEFT JOIN {$p}aponto_orders o ON o.id = oi.order_id";

		$select_cols = 'b.id, b.status, b.start_datetime_utc, b.end_datetime_utc, b.customer_note, s.name AS service_name, st.name AS staff_name, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone, o.code AS order_code, o.total_minor, o.currency, o.payment_status, o.gateway, o.transaction_ref';
		$sql         = "SELECT {$select_cols} {$from_sql}{$where_sql} ORDER BY b.start_datetime_utc ASC, b.id ASC";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; bound via prepare().
		$rows = $this->wpdb->get_results( array() === $args ? $sql : $this->wpdb->prepare( $sql, $args ), ARRAY_A );

		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * Every customer matching the name/email search (no pagination), ordered by creation then id.
	 *
	 * @param string $search Search (already sanitized) — name + email + phone + note,
	 *                       the same haystack as `GET /customers` (rest-contract §2.10).
	 * @return list<array<string, mixed>>
	 */
	public function exportCustomers( string $search ): array {
		$table = $this->wpdb->prefix . 'aponto_customers';
		$where = '';
		$args  = array();

		if ( '' !== $search ) {
			$like  = '%' . $this->wpdb->esc_like( $search ) . '%';
			$where = ' WHERE ( name LIKE %s OR email LIKE %s OR phone LIKE %s OR note LIKE %s )';
			$args  = array( $like, $like, $like, $like );
		}

		$sql = "SELECT id, name, email, phone, note, created_at FROM {$table}{$where} ORDER BY created_at ASC, id ASC";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		$rows = $this->wpdb->get_results( array() === $args ? $sql : $this->wpdb->prepare( $sql, $args ), ARRAY_A );

		return is_array( $rows ) ? $rows : array();
	}
}

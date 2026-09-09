<?php
/**
 * Booking read gateway (admin list + detail).
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
 * Read-side queries for the admin `/bookings` routes: the paginated list (joined to service, staff,
 * customer and order) and the single-booking detail (booking row + order with items + activity
 * trail). Writes go through the engine services ({@see \Aponto\Booking\ReservationService} etc.);
 * this gateway never mutates bookings.
 */
final class BookingReadGateway {

	/**
	 * Construct the gateway.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct( private \wpdb $wpdb ) {}

	/**
	 * List bookings with filters + pagination.
	 *
	 * @param array{status:string, service_id:?int, staff_id:?int, from:string, to:string, search:string, payment_status?:string} $filters Filters.
	 * @param int                                                                                                                 $page     Page.
	 * @param int                                                                                                                 $per_page Page size.
	 * @return array{items: list<array<string, mixed>>, total: int}
	 */
	public function listBookings( array $filters, int $page, int $per_page ): array {
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
		// D-R38: the payment facet. `none` deliberately matches an order that has no row at all as
		// well as one whose status IS `none` — to an operator scanning for unpaid bookings, "no
		// order" and "unpaid order" are the same thing, and a booking missing from that list because
		// of a join is a booking that never gets chased.
		$payment_status = (string) ( $filters['payment_status'] ?? 'all' );
		if ( '' !== $payment_status && 'all' !== $payment_status ) {
			if ( 'none' === $payment_status ) {
				$where[] = "( o.payment_status IS NULL OR o.payment_status = 'none' )";
			} else {
				$where[] = 'o.payment_status = %s';
				$args[]  = $payment_status;
			}
		}
		if ( '' !== $filters['search'] ) {
			// Contract haystack (rest-contract §2.8, amended 2026-07-18): customer name +
			// customer email + service name + order code.
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

		$count_sql = "SELECT COUNT(*) {$from_sql}{$where_sql}";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; bound via prepare().
		$total = (int) $this->wpdb->get_var( array() === $args ? $count_sql : $this->wpdb->prepare( $count_sql, $args ) );

		$offset      = ( $page - 1 ) * $per_page;
		$list_args   = array_merge( $args, array( $per_page, $offset ) );
		$select_cols = 'b.id, b.status, b.start_datetime_utc, b.end_datetime_utc, b.local_date, b.customer_timezone, b.attendees, b.created_at, b.service_id, b.staff_id, b.customer_id, s.name AS service_name, st.name AS staff_name, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone, o.total_minor, o.currency, o.payment_status, o.gateway';
		$list_sql    = "SELECT {$select_cols} {$from_sql}{$where_sql} ORDER BY b.start_datetime_utc DESC, b.id DESC LIMIT %d OFFSET %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $list_sql, $list_args ), ARRAY_A );

		return array(
			'items' => is_array( $rows ) ? $rows : array(),
			'total' => $total,
		);
	}

	/**
	 * Whether a booking exists.
	 *
	 * @param int $id Booking id.
	 */
	public function exists( int $id ): bool {
		$table = $this->wpdb->prefix . 'aponto_bookings';
		$sql   = "SELECT COUNT(*) FROM {$table} WHERE id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		return (int) $this->wpdb->get_var( $this->wpdb->prepare( $sql, $id ) ) > 0;
	}

	/**
	 * The full booking row.
	 *
	 * @param int $id Booking id.
	 * @return array<string, mixed>|null
	 */
	public function bookingRow( int $id ): ?array {
		$table = $this->wpdb->prefix . 'aponto_bookings';
		$sql   = "SELECT * FROM {$table} WHERE id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		$row = $this->wpdb->get_row( $this->wpdb->prepare( $sql, $id ), ARRAY_A );

		return is_array( $row ) ? $row : null;
	}

	/**
	 * The order row (with items) for a booking, or null.
	 *
	 * @param int $booking_id Booking id.
	 * @return array<string, mixed>|null
	 */
	public function orderForBooking( int $booking_id ): ?array {
		$p   = $this->wpdb->prefix;
		$sql = "SELECT o.* FROM {$p}aponto_orders o
			INNER JOIN {$p}aponto_order_items oi ON oi.order_id = o.id
			WHERE oi.booking_id = %d LIMIT 1";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; bound via prepare().
		$order = $this->wpdb->get_row( $this->wpdb->prepare( $sql, $booking_id ), ARRAY_A );
		if ( ! is_array( $order ) ) {
			return null;
		}

		$items_sql = "SELECT id, item_type, booking_id, amount_minor, meta FROM {$p}aponto_order_items WHERE order_id = %d ORDER BY id ASC";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		$items          = $this->wpdb->get_results( $this->wpdb->prepare( $items_sql, (int) $order['id'] ), ARRAY_A );
		$order['items'] = is_array( $items ) ? $items : array();

		return $order;
	}

	/**
	 * The name of a service (empty string when missing/archived-away).
	 *
	 * @param int $service_id Service id.
	 */
	public function serviceName( int $service_id ): string {
		$table = $this->wpdb->prefix . 'aponto_services';
		$sql   = "SELECT name FROM {$table} WHERE id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		return (string) $this->wpdb->get_var( $this->wpdb->prepare( $sql, $service_id ) );
	}

	/**
	 * The name of a staff member (empty string when missing).
	 *
	 * @param int $staff_id Staff id.
	 */
	public function staffName( int $staff_id ): string {
		$table = $this->wpdb->prefix . 'aponto_staff';
		$sql   = "SELECT name FROM {$table} WHERE id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		return (string) $this->wpdb->get_var( $this->wpdb->prepare( $sql, $staff_id ) );
	}

	/**
	 * The activity trail for a booking.
	 *
	 * @param int $booking_id Booking id.
	 * @return list<array<string, mixed>>
	 */
	public function activitiesForBooking( int $booking_id ): array {
		$table = $this->wpdb->prefix . 'aponto_activities';
		$sql   = "SELECT id, action, meta, initiated_by, created_at FROM {$table} WHERE entity_type = 'booking' AND entity_id = %d ORDER BY id ASC";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $booking_id ), ARRAY_A );

		return is_array( $rows ) ? $rows : array();
	}
}

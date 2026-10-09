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

use Aponto\Support\PersonName;

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
	 * Order (D-R74): `start` — the default every existing consumer keeps (Calendar, Dashboard, the
	 * day sheet, outside REST clients) — is latest start first; `created` is newest booking first,
	 * which the admin Bookings list asks for. Both end on `b.id DESC`: the id is unique, so the
	 * order is total and LIMIT/OFFSET pages cannot repeat or skip a row between same-second rows.
	 *
	 * @param array{id?:?int, status:string, service_id:?int, staff_id:?int, location_id?:?int, from:string, to:string, search:string, payment_status?:string, payment_reason?:string} $filters  Filters.
	 * @param int                                                                                                                                                                      $page     Page.
	 * @param int                                                                                                                                                                      $per_page Page size.
	 * @param string                                                                                                                                                                   $order_by `start` or `created`; anything else is `start`.
	 * @return array{items: list<array<string, mixed>>, total: int}
	 */
	public function listBookings( array $filters, int $page, int $per_page, string $order_by = 'start' ): array {
		$p     = $this->wpdb->prefix;
		$where = array();
		$args  = array();

		// One booking by id (the admin `#bookings/{id}` deep link); null = no filter.
		if ( null !== ( $filters['id'] ?? null ) ) {
			$where[] = 'b.id = %d';
			$args[]  = (int) $filters['id'];
		}
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
		// D-R63: `0` is a real filter value (no location), so only null means "no filter".
		if ( null !== ( $filters['location_id'] ?? null ) ) {
			$where[] = 'b.location_id = %d';
			$args[]  = $filters['location_id'];
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
		// D-R71: distinguish deposits from refunds without changing stored statuses.
		$reason = (string) ( $filters['payment_reason'] ?? 'all' );
		if ( in_array( $reason, array( 'pending', 'none', 'paid', 'refunded' ), true ) ) {
			if ( 'none' === $reason ) {
				$where[] = "( o.payment_status IS NULL OR o.payment_status = 'none' )";
			} else {
				$where[] = 'o.payment_status = %s';
				$args[]  = $reason;
			}
		} elseif ( in_array( $reason, array( 'deposit_paid', 'deposit_partially_refunded', 'partially_refunded' ), true ) ) {
			$where[] = "o.payment_status = 'partial'";
			if ( 'partially_refunded' === $reason ) {
				$where[] = 'o.payable_now_minor IS NULL';
			} else {
				$where[] = 'o.payable_now_minor IS NOT NULL';
				$exists  = 'deposit_paid' === $reason ? 'NOT EXISTS' : 'EXISTS';
				$where[] = "{$exists} (SELECT 1 FROM {$p}aponto_transactions pr WHERE pr.order_id = o.id AND pr.kind IN ('refund', 'onsite_refund') AND pr.status = 'succeeded')";
			}
		}
		if ( '' !== $filters['search'] ) {
			// Contract haystack (rest-contract §2.8, amended 2026-07-18): customer name +
			// customer email + service name + order code. The customer name is the two stored
			// parts plus their concatenation, engine-branched (name split, D-R69 / D-R54).
			$like    = '%' . $this->wpdb->esc_like( $filters['search'] ) . '%';
			$where[] = '(' . PersonNameSearch::clause( $this->wpdb, 'c' ) . ' OR c.email LIKE %s OR s.name LIKE %s OR o.code LIKE %s)';
			$args    = array_merge( $args, PersonNameSearch::args( $like ), array( $like, $like, $like ) );
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
		$select_cols = 'b.id, b.status, b.start_datetime_utc, b.end_datetime_utc, b.local_date, b.customer_timezone, b.attendees, b.created_at, b.service_id, b.staff_id, b.location_id, b.customer_id, s.name AS service_name, st.first_name AS staff_first_name, st.last_name AS staff_last_name, c.first_name AS customer_first_name, c.last_name AS customer_last_name, c.email AS customer_email, c.phone AS customer_phone, o.id AS order_id, o.payable_now_minor, o.subtotal_minor, o.discount_minor, o.total_minor, o.coupon_code, o.currency, o.payment_status, o.gateway';
		// A closed pair of constant strings, never request text.
		$order_sql = 'created' === $order_by ? 'b.created_at DESC, b.id DESC' : 'b.start_datetime_utc DESC, b.id DESC';
		$list_sql  = "SELECT {$select_cols} {$from_sql}{$where_sql} ORDER BY {$order_sql} LIMIT %d OFFSET %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $list_sql, $list_args ), ARRAY_A );

		return array(
			'items' => is_array( $rows ) ? $rows : array(),
			'total' => $total,
		);
	}

	/**
	 * Which of these bookings are checkouts that were never placed (persona QA 2026-10-05): their
	 * unpaid hold was released (`payment_hold_expired`, or `hold_released` when the customer backed
	 * out or the checkout was cancelled) and no `created` notification was ever claimed for them — the same "was it ever announced" test the
	 * cancellation mails use (D-R72). Two statements for the whole set, nothing per row.
	 *
	 * @param list<int> $ids Booking ids (the caller passes cancelled ones).
	 * @return list<int> The abandoned ones.
	 */
	public function abandonedCheckoutIds( array $ids ): array {
		$ids = array_values( array_unique( array_filter( array_map( 'intval', $ids ) ) ) );
		if ( array() === $ids ) {
			return array();
		}
		$p            = $this->wpdb->prefix;
		$placeholders = implode( ',', array_fill( 0, count( $ids ), '%d' ) );

		$expired_sql = "SELECT DISTINCT entity_id FROM {$p}aponto_activities WHERE entity_type = 'booking' AND action IN ( 'payment_hold_expired', 'hold_released' ) AND entity_id IN ({$placeholders})";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; placeholders bound via prepare().
		$expired = array_map( 'intval', (array) $this->wpdb->get_col( $this->wpdb->prepare( $expired_sql, $ids ) ) );
		if ( array() === $expired ) {
			return array();
		}

		$placeholders  = implode( ',', array_fill( 0, count( $expired ), '%d' ) );
		$announced_sql = "SELECT DISTINCT booking_id FROM {$p}aponto_notification_deliveries WHERE booking_id IN ({$placeholders}) AND dispatch_key LIKE %s";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		$announced = array_map( 'intval', (array) $this->wpdb->get_col( $this->wpdb->prepare( $announced_sql, array_merge( $expired, array( $this->wpdb->esc_like( 'created:' ) . '%' ) ) ) ) );

		return array_values( array_diff( $expired, $announced ) );
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
		return $this->staffProfile( $staff_id )['name'];
	}

	/**
	 * The PUBLIC-facing fields of a staff member: display name and job title (D-R51). Missing
	 * staff answer the empty profile rather than throwing — every caller is a post-booking read
	 * whose booking is already committed.
	 *
	 * Deliberately IGNORES `is_public`. A hidden staff member is hidden from the CHOICE, not from
	 * the customer who is about to meet them: after the booking exists, "who am I seeing?" is a
	 * question the customer is entitled to an answer to (D-R51).
	 *
	 * **NARROWED 2026-09-21 (D-R66).** This read used to select `avatar_id`, `email` and
	 * `wp_user_id` as well, purely so {@see \Aponto\Rest\Support\StaffAvatar} could resolve a
	 * Gravatar for the post-booking `staff` object. No surface ever rendered that avatar, and the
	 * Gravatar leg publishes a URL carrying core's hash of the staff EMAIL — so an unauthenticated
	 * payload on every Free site disclosed a staff-email hash for a picture nothing drew. The
	 * columns go with the field: reading an address in order not to publish it is a risk with no
	 * upside, and a narrower `SELECT` is the only form of that guarantee a future edit cannot
	 * quietly undo.
	 *
	 * One query, the same one `staffName()` used to make. `name` is the composed display name
	 * (never stored) beside the two stored parts (name split N2, D-R69).
	 *
	 * @param int $staff_id Staff id.
	 * @return array{id:int, name:string, first_name:string, last_name:string, title:string}
	 */
	public function staffProfile( int $staff_id ): array {
		$table = $this->wpdb->prefix . 'aponto_staff';
		$sql   = "SELECT first_name, last_name, title FROM {$table} WHERE id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		$row = $this->wpdb->get_row( $this->wpdb->prepare( $sql, $staff_id ), ARRAY_A );

		if ( ! is_array( $row ) ) {
			return array(
				'id'         => $staff_id,
				'name'       => '',
				'first_name' => '',
				'last_name'  => '',
				'title'      => '',
			);
		}

		$first = (string) ( $row['first_name'] ?? '' );
		$last  = (string) ( $row['last_name'] ?? '' );

		return array(
			'id'         => $staff_id,
			'name'       => PersonName::display( $first, $last ),
			'first_name' => $first,
			'last_name'  => $last,
			'title'      => (string) ( $row['title'] ?? '' ),
		);
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

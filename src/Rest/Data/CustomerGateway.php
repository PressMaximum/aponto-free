<?php
/**
 * Customer CRUD gateway (admin REST).
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

use Aponto\Availability\BlockingPolicy;
use Aponto\Support\Clock;
use Aponto\Support\DatabaseEngine;

/**
 * Direct SQL gateway for the `aponto_customers` table backing the admin `/customers` routes. The
 * engine's {@see \Aponto\Booking\Repository\CustomerRepository} owns the booking-time find-or-create
 * upsert; this gateway owns admin list/create/find/update without touching it. The internal
 * `email_norm` column (UNIQUE) is written server-side but never selected into the DTO row.
 */
final class CustomerGateway {

	/**
	 * Selectable columns in DTO order (never includes the internal `email_norm`).
	 */
	private const COLUMNS = 'id, name, email, phone, wp_user_id, note, created_at';

	/**
	 * Construct the gateway.
	 *
	 * @param \wpdb $wpdb  Database handle.
	 * @param Clock $clock Clock.
	 */
	public function __construct(
		private \wpdb $wpdb,
		private Clock $clock
	) {}

	/**
	 * Table name.
	 */
	private function table(): string {
		return $this->wpdb->prefix . 'aponto_customers';
	}

	/**
	 * List customers with a search and pagination, newest first.
	 *
	 * Search haystack (rest-contract §2.10, 2026-07-18): name + email + phone +
	 * internal note.
	 *
	 * @param string $search   Search term (already sanitized).
	 * @param int    $page     Page (>=1).
	 * @param int    $per_page Page size (1..100).
	 * @return array{items: list<array<string, mixed>>, total: int}
	 */
	public function list( string $search, int $page, int $per_page ): array {
		$table     = $this->table();
		$params    = array();
		$where_sql = '';

		if ( '' !== $search ) {
			$like      = '%' . $this->wpdb->esc_like( $search ) . '%';
			$where_sql = ' WHERE ( name LIKE %s OR email LIKE %s OR phone LIKE %s OR note LIKE %s )';
			$params[]  = $like;
			$params[]  = $like;
			$params[]  = $like;
			$params[]  = $like;
		}

		$count_sql = "SELECT COUNT(*) FROM {$table}{$where_sql}";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; params bound via prepare().
		$total = (int) $this->wpdb->get_var( array() === $params ? $count_sql : $this->wpdb->prepare( $count_sql, $params ) );

		$offset      = ( $page - 1 ) * $per_page;
		$list_params = array_merge( $params, array( $per_page, $offset ) );
		$list_sql    = 'SELECT ' . self::COLUMNS . " FROM {$table}{$where_sql} ORDER BY created_at DESC, id DESC LIMIT %d OFFSET %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; params bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $list_sql, $list_params ), ARRAY_A );

		return array(
			'items' => is_array( $rows ) ? $rows : array(),
			'total' => $total,
		);
	}

	/**
	 * Find one customer row.
	 *
	 * @param int $id Customer id.
	 * @return array<string, mixed>|null
	 */
	public function find( int $id ): ?array {
		$table = $this->table();
		$sql   = 'SELECT ' . self::COLUMNS . " FROM {$table} WHERE id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; params bound via prepare().
		$row = $this->wpdb->get_row( $this->wpdb->prepare( $sql, $id ), ARRAY_A );

		return is_array( $row ) ? $row : null;
	}

	/**
	 * Booking aggregates for a set of customer ids (rest-contract §2.10, D-27a).
	 *
	 * Computed read-only in one grouped pass over `aponto_bookings` (never stored):
	 * `bookings_count` = all bookings; `upcoming` = blocking-status bookings whose
	 * start is in the future; `last_booking` = the most recent start (or null);
	 * `timezone` = the customer timezone captured on that most recent booking (Q4
	 * — the customer timezone is derived from the latest booking, not a stored
	 * customer column); `no_show_count` = bookings currently sitting at `no_show`
	 * (D-R33). `GROUP_CONCAT(... ORDER BY start DESC)` + `SUBSTRING_INDEX`
	 * picks the latest row's timezone without a window function (MySQL 5.7 floor).
	 *
	 * `no_show_count` rides the SAME grouped statement as a conditional SUM rather
	 * than arriving as its own query: the whole point of this method is that a page
	 * of customers costs one round trip, and a fifth aggregate must not turn that
	 * into an N+1 (rest-contract §2.10). It counts the CURRENT status, so undoing a
	 * no-show decrements it — the number describes the record, not the history.
	 *
	 * SQLite (D-R20, founder 2026-07-21): `GROUP_CONCAT` there takes its separator as a second
	 * ARGUMENT and accepts no `SEPARATOR` keyword, so the MySQL expression is a syntax error. The
	 * SQLite variant selects the same value with a correlated subquery — the timezone of the
	 * customer's latest booking — which is the plain reading of the requirement and needs no
	 * window function either. Only the `timezone` expression differs; the counts, the blocking
	 * status filter and the grouping are identical, and the MySQL statement is untouched.
	 *
	 * @param list<int> $ids Customer ids on the current page.
	 * @param string    $now Current instant as an `Y-m-d H:i:s` UTC string.
	 * @return array<int, array{bookings_count:int, upcoming:int, last_booking:string, timezone:string, no_show_count:int}>
	 */
	public function aggregatesFor( array $ids, string $now ): array {
		$ids = array_values( array_unique( array_filter( array_map( 'intval', $ids ) ) ) );
		if ( array() === $ids ) {
			return array();
		}

		$bookings     = $this->wpdb->prefix . 'aponto_bookings';
		$placeholders = implode( ',', array_fill( 0, count( $ids ), '%d' ) );
		// The single source of blocking statuses (§5.6) — never hardcode the enum.
		$blocking  = ( new BlockingPolicy() )->statuses();
		$status_in = implode( ',', array_fill( 0, count( $blocking ), '%s' ) );
		$sql       = "SELECT customer_id,
				COUNT(*) AS bookings_count,
				SUM(CASE WHEN status IN ({$status_in}) AND start_datetime_utc >= %s THEN 1 ELSE 0 END) AS upcoming,
				SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) AS no_show_count,
				MAX(start_datetime_utc) AS last_booking,
				SUBSTRING_INDEX(GROUP_CONCAT(customer_timezone ORDER BY start_datetime_utc DESC SEPARATOR '\n'), '\n', 1) AS timezone
			FROM {$bookings}
			WHERE customer_id IN ({$placeholders})
			GROUP BY customer_id";

		if ( DatabaseEngine::isSqlite( $this->wpdb ) ) {
			$sql = "SELECT b.customer_id AS customer_id,
					COUNT(*) AS bookings_count,
					SUM(CASE WHEN b.status IN ({$status_in}) AND b.start_datetime_utc >= %s THEN 1 ELSE 0 END) AS upcoming,
					SUM(CASE WHEN b.status = 'no_show' THEN 1 ELSE 0 END) AS no_show_count,
					MAX(b.start_datetime_utc) AS last_booking,
					(
						SELECT b2.customer_timezone
						FROM {$bookings} b2
						WHERE b2.customer_id = b.customer_id
						ORDER BY b2.start_datetime_utc DESC
						LIMIT 1
					) AS timezone
				FROM {$bookings} b
				WHERE b.customer_id IN ({$placeholders})
				GROUP BY b.customer_id";
		}

		$params = array_merge( $blocking, array( $now ), $ids );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; placeholders bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $params ), ARRAY_A );

		$out = array();
		foreach ( is_array( $rows ) ? $rows : array() as $row ) {
			$out[ (int) $row['customer_id'] ] = array(
				'bookings_count' => (int) $row['bookings_count'],
				'upcoming'       => (int) $row['upcoming'],
				'last_booking'   => (string) ( $row['last_booking'] ?? '' ),
				'timezone'       => (string) ( $row['timezone'] ?? '' ),
				'no_show_count'  => (int) ( $row['no_show_count'] ?? 0 ),
			);
		}

		return $out;
	}

	/**
	 * Find one customer by its normalised email (UNIQUE key), for collision detection.
	 *
	 * @param string $email_norm Normalised email (`strtolower(trim(email))`).
	 * @return array<string, mixed>|null
	 */
	public function findByEmailNorm( string $email_norm ): ?array {
		$table = $this->table();
		$sql   = 'SELECT ' . self::COLUMNS . " FROM {$table} WHERE email_norm = %s";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; params bound via prepare().
		$row = $this->wpdb->get_row( $this->wpdb->prepare( $sql, $email_norm ), ARRAY_A );

		return is_array( $row ) ? $row : null;
	}

	/**
	 * Insert a customer, returning its id, or 0 on a duplicate `email_norm` collision.
	 *
	 * Errors are suppressed around the insert because the UNIQUE `email_norm` index makes a
	 * duplicate a caller-handled condition, not a fatal one: `$wpdb->insert()` returns FALSE on the
	 * collision, which this maps to a `0` return so the controller can emit a field-level `422`.
	 *
	 * @param array<string, mixed> $data Column => value (validated; must include `email_norm`).
	 */
	public function create( array $data ): int {
		$data['created_at'] = $this->clock->nowSql();

		$suppressed = $this->wpdb->suppress_errors( true );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Admin insert.
		$result = $this->wpdb->insert( $this->table(), $data, $this->formats( $data ) );
		$this->wpdb->suppress_errors( $suppressed );

		if ( false === $result ) {
			return 0;
		}

		return (int) $this->wpdb->insert_id;
	}

	/**
	 * Update a customer's provided columns.
	 *
	 * @param int                  $id   Customer id.
	 * @param array<string, mixed> $data Column => value (must include `email_norm`).
	 */
	public function update( int $id, array $data ): void {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Admin update.
		$this->wpdb->update( $this->table(), $data, array( 'id' => $id ), $this->formats( $data ), array( '%d' ) );
	}

	/**
	 * Build the `$wpdb` format list for a column map (only `wp_user_id` is an integer column).
	 *
	 * @param array<string, mixed> $data Column => value.
	 * @return list<string>
	 */
	private function formats( array $data ): array {
		$formats = array();
		foreach ( array_keys( $data ) as $column ) {
			$formats[] = 'wp_user_id' === $column ? '%d' : '%s';
		}

		return $formats;
	}
}

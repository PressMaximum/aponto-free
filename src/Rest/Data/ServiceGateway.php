<?php
/**
 * Service CRUD gateway (admin REST).
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

use Aponto\Support\Clock;

/**
 * Direct SQL gateway for the `aponto_services` table backing the admin `/services` routes. The
 * engine's {@see \Aponto\Booking\Repository\ServiceRepository} is read-only for slot generation;
 * this gateway owns admin list/create/update/delete/duplicate/reorder without touching it.
 */
final class ServiceGateway {

	/**
	 * Selectable columns in DTO order.
	 */
	private const COLUMNS = 'id, category_id, name, description, image_id, color, duration_minutes, buffer_before, buffer_after, slot_step_minutes, capacity, price_minor, min_lead_minutes, max_horizon_days, status, position, created_at, updated_at';

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
		return $this->wpdb->prefix . 'aponto_services';
	}

	/**
	 * List services with status filter, name search and pagination.
	 *
	 * @param string $status   `active|draft|archived|all`.
	 * @param string $search   Name search (already sanitized).
	 * @param int    $page     Page (>=1).
	 * @param int    $per_page Page size (1..100).
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
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; params bound via prepare().
		$total = (int) $this->wpdb->get_var( array() === $params ? $count_sql : $this->wpdb->prepare( $count_sql, $params ) );

		$offset      = ( $page - 1 ) * $per_page;
		$list_params = array_merge( $params, array( $per_page, $offset ) );
		$list_sql    = 'SELECT ' . self::COLUMNS . " FROM {$table}{$where_sql} ORDER BY position ASC, id ASC LIMIT %d OFFSET %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; params bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $list_sql, $list_params ), ARRAY_A );

		return array(
			'items' => is_array( $rows ) ? $rows : array(),
			'total' => $total,
		);
	}

	/**
	 * Find one service row.
	 *
	 * @param int $id Service id.
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
	 * Eligible-staff counts for a set of service ids (admin list column, B4b).
	 *
	 * Read-only aggregate over the `aponto_staff_services` eligibility map (the
	 * same table the engine's ConnectionRepository resolves); `DISTINCT staff_id`
	 * collapses the per-location rows. Additive list-column extension: the LIST needs
	 * one number per row, which `GET /services/{id}/eligibility` — the route the
	 * service editor now reads and writes (D-R28) — would cost one request per row
	 * to produce.
	 *
	 * @param list<int> $ids Service ids on the current page.
	 * @return array<int, int> service_id => distinct eligible staff count.
	 */
	public function staffCountsFor( array $ids ): array {
		$ids = array_values( array_unique( array_filter( array_map( 'intval', $ids ) ) ) );
		if ( array() === $ids ) {
			return array();
		}

		$table        = $this->wpdb->prefix . 'aponto_staff_services';
		$placeholders = implode( ',', array_fill( 0, count( $ids ), '%d' ) );
		$sql          = "SELECT service_id, COUNT(DISTINCT staff_id) AS staff_count FROM {$table} WHERE service_id IN ({$placeholders}) GROUP BY service_id";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; placeholders bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $ids ), ARRAY_A );

		$out = array();
		foreach ( is_array( $rows ) ? $rows : array() as $row ) {
			$out[ (int) $row['service_id'] ] = (int) $row['staff_count'];
		}

		return $out;
	}

	/**
	 * ACTIVE eligible-staff counts for a set of service ids (persona QA 2026-10-05, re-test R11).
	 *
	 * {@see self::staffCountsFor()} counts every assigned row, archived members included, while the
	 * public catalogue publishes a service only when an ACTIVE member is assigned
	 * ({@see \Aponto\Booking\Repository\ConnectionRepository::staffedServiceIds()}, T-073). This
	 * is that same test per service, so the admin list can say which active services customers
	 * cannot see. A service with no active member has no entry (read it as 0).
	 *
	 * @param list<int> $ids Service ids on the current page.
	 * @return array<int, int> service_id => distinct ACTIVE eligible staff count.
	 */
	public function activeStaffCountsFor( array $ids ): array {
		$ids = array_values( array_unique( array_filter( array_map( 'intval', $ids ) ) ) );
		if ( array() === $ids ) {
			return array();
		}

		$connections  = $this->wpdb->prefix . 'aponto_staff_services';
		$staff        = $this->wpdb->prefix . 'aponto_staff';
		$placeholders = implode( ',', array_fill( 0, count( $ids ), '%d' ) );
		$sql          = "SELECT ss.service_id, COUNT(DISTINCT ss.staff_id) AS staff_count FROM {$connections} ss
			INNER JOIN {$staff} s ON s.id = ss.staff_id AND s.status = 'active'
			WHERE ss.service_id IN ({$placeholders}) GROUP BY ss.service_id";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; placeholders bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $ids ), ARRAY_A );

		$out = array();
		foreach ( is_array( $rows ) ? $rows : array() as $row ) {
			$out[ (int) $row['service_id'] ] = (int) $row['staff_count'];
		}

		return $out;
	}

	/**
	 * Booking counts for a set of service ids (admin list column, C1 archive-first).
	 *
	 * The Services list shows a permanent "Delete" action ONLY on a service with zero bookings
	 * (Archive is the safe default for everything else — U2 data-loss scare). One grouped COUNT
	 * over the page's ids avoids an N+1 of {@see self::hasBookings()}; services absent from the
	 * result have no bookings. Additive list-column extension, mirroring {@see self::staffCountsFor()}.
	 *
	 * @param list<int> $ids Service ids on the current page.
	 * @return array<int, int> service_id => booking count.
	 */
	public function bookingCountsFor( array $ids ): array {
		$ids = array_values( array_unique( array_filter( array_map( 'intval', $ids ) ) ) );
		if ( array() === $ids ) {
			return array();
		}

		$table        = $this->wpdb->prefix . 'aponto_bookings';
		$placeholders = implode( ',', array_fill( 0, count( $ids ), '%d' ) );
		$sql          = "SELECT service_id, COUNT(*) AS booking_count FROM {$table} WHERE service_id IN ({$placeholders}) GROUP BY service_id";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; placeholders bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $ids ), ARRAY_A );

		$out = array();
		foreach ( is_array( $rows ) ? $rows : array() as $row ) {
			$out[ (int) $row['service_id'] ] = (int) $row['booking_count'];
		}

		return $out;
	}

	/**
	 * Whether a category exists (FK validation for create/update).
	 *
	 * @param int $category_id Category id.
	 */
	public function categoryExists( int $category_id ): bool {
		$table = $this->wpdb->prefix . 'aponto_service_categories';
		$sql   = "SELECT COUNT(*) FROM {$table} WHERE id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; params bound via prepare().
		return (int) $this->wpdb->get_var( $this->wpdb->prepare( $sql, $category_id ) ) > 0;
	}

	/**
	 * Whether any booking references this service (delete dependency check).
	 *
	 * @param int $service_id Service id.
	 */
	public function hasBookings( int $service_id ): bool {
		$table = $this->wpdb->prefix . 'aponto_bookings';
		$sql   = "SELECT COUNT(*) FROM {$table} WHERE service_id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; params bound via prepare().
		return (int) $this->wpdb->get_var( $this->wpdb->prepare( $sql, $service_id ) ) > 0;
	}

	/**
	 * Insert a service, returning its id.
	 *
	 * @param array<string, mixed> $data Column => value (validated).
	 * @param bool                 $emit_event Emit the legacy hook; import defers it until commit.
	 */
	public function create( array $data, bool $emit_event = true ): int {
		$now                = $this->clock->nowSql();
		$data['created_at'] = $now;
		$data['updated_at'] = $now;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Admin insert.
		$result = $this->wpdb->insert( $this->table(), $data, $this->formats( $data ) );
		if ( false === $result ) {
			return 0;
		}

		$id = (int) $this->wpdb->insert_id;

		/**
		 * Fires after a service row is inserted from ANY surface (REST admin editor
		 * or the onboarding wizard). The onboarding funnel listens here to stamp the
		 * `first_service`/`wizard_completed` goal event even when a founder skips the
		 * wizard and creates the first service by hand (SPEC-P1 §4).
		 *
		 * @param int                  $id   New service id.
		 * @param array<string, mixed> $data Inserted column data.
		 */
		if ( $emit_event ) {
			do_action( 'aponto_service_created', $id, $data );
		}

		return $id;
	}

	/**
	 * Update a service's provided columns.
	 *
	 * @param int                  $id   Service id.
	 * @param array<string, mixed> $data Column => value (partial).
	 * @throws \Aponto\Database\StorageException On write failure.
	 */
	public function update( int $id, array $data ): void {
		$data['updated_at'] = $this->clock->nowSql();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Admin update.
		$result = $this->wpdb->update( $this->table(), $data, array( 'id' => $id ), $this->formats( $data ), array( '%d' ) );
		if ( false === $result ) {
			$failure = \Aponto\Database\StorageException::fromWpdb( $this->wpdb, esc_html( 'update entity' ) );
			throw $failure;
		}
	}

	/**
	 * Delete a service row.
	 *
	 * @param int $id Service id.
	 * @throws \Aponto\Database\StorageException On write failure.
	 */
	public function delete( int $id ): void {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Admin delete.
		$result = $this->wpdb->delete( $this->table(), array( 'id' => $id ), array( '%d' ) );
		if ( 1 !== $result ) {
			$failure = \Aponto\Database\StorageException::fromWpdb( $this->wpdb, esc_html( 'delete service' ) );
			throw $failure;
		}
	}

	/**
	 * Re-insert a captured pre-image row (compensation after a reconnect-replayed DELETE lost the
	 * per-service lock — review F item 1, mirroring the location-delete pattern). MySQL coerces the
	 * string-formatted numeric columns back; wpdb maps nulls to SQL NULL.
	 *
	 * @param array<string, mixed> $row Full row as read by {@see self::find()}.
	 */
	public function restore( array $row ): void {
		$formats = array();
		foreach ( array_keys( $row ) as $column ) {
			$formats[] = 'id' === $column ? '%d' : '%s';
		}
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Compensation re-insert of a captured pre-image.
		$this->wpdb->insert( $this->table(), $row, $formats );
	}

	/**
	 * Duplicate a service as a DRAFT, placing the copy immediately after the source.
	 *
	 * Per SPEC-P1 §1.1 the copy is always created with status `draft` — never bookable
	 * until the founder reviews and activates it, whatever the source's status.
	 *
	 * @param int    $id        Source service id.
	 * @param string $copy_name Localized copy name.
	 * @return int New service id.
	 */
	public function duplicate( int $id, string $copy_name ): int {
		$source = $this->find( $id );
		if ( null === $source ) {
			return 0;
		}

		$position = (int) $source['position'];
		$table    = $this->table();
		$shift    = "UPDATE {$table} SET position = position + 1 WHERE position > %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; params bound via prepare().
		$this->wpdb->query( $this->wpdb->prepare( $shift, $position ) );

		$copy = $source;
		unset( $copy['id'], $copy['created_at'], $copy['updated_at'] );
		$copy['name']     = $copy_name;
		$copy['position'] = $position + 1;
		// SPEC-P1 §1.1: a duplicate is always a DRAFT so it never lands in the public
		// catalogue on creation — the public API filters on status = 'active', so the copy
		// stays hidden until activated. The autolink hook (aponto_service_created) is
		// status-agnostic, so staff eligibility is still seeded and the copy is bookable the
		// moment the founder flips it to active.
		$copy['status'] = 'draft';

		return $this->create( $copy );
	}

	/**
	 * All service ids in the reorder scope (for full-replacement validation).
	 *
	 * @return list<int>
	 */
	public function allIds(): array {
		$table = $this->table();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; no user input.
		$ids = $this->wpdb->get_col( "SELECT id FROM {$table} ORDER BY position ASC, id ASC" );

		return array_map( 'intval', is_array( $ids ) ? $ids : array() );
	}

	/**
	 * Apply a new ordering (position = index).
	 *
	 * @param list<int> $ids Ordered service ids (full set).
	 */
	public function reorder( array $ids ): bool {
		foreach ( array_values( $ids ) as $index => $id ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Admin reorder.
			if ( false === $this->wpdb->update( $this->table(), array( 'position' => $index ), array( 'id' => (int) $id ), array( '%d' ), array( '%d' ) ) ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Build the `$wpdb` format list for a column map.
	 *
	 * @param array<string, mixed> $data Column => value.
	 * @return list<string>
	 */
	private function formats( array $data ): array {
		$int_cols = array( 'category_id', 'image_id', 'duration_minutes', 'buffer_before', 'buffer_after', 'slot_step_minutes', 'capacity', 'price_minor', 'min_lead_minutes', 'max_horizon_days', 'position' );
		$formats  = array();
		foreach ( array_keys( $data ) as $column ) {
			$formats[] = in_array( $column, $int_cols, true ) ? '%d' : '%s';
		}

		return $formats;
	}
}

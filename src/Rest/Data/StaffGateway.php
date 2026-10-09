<?php
/**
 * Staff CRUD gateway (admin REST).
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

use Aponto\Database\StorageException;
use Aponto\Support\Clock;
use Aponto\Support\PersonName;

/**
 * Direct SQL gateway for the `aponto_staff` table backing the admin `/staff` routes. Owns admin
 * list/create/update/delete plus the row count, delete-dependency check and append-position helper.
 * The availability engine reads staff through its own repositories; this gateway does not touch
 * them.
 */
final class StaffGateway {

	/**
	 * Selectable columns in DTO order.
	 *
	 * `title`, `bio` and `is_public` are the D-R51 public-profile columns (migration 0011). They
	 * are named explicitly rather than reached with `SELECT *` for the reason the list has always
	 * been explicit: the DTO's key order is the contract's key order, and a `SELECT *` would let a
	 * schema change reorder a public response.
	 */
	private const COLUMNS = 'id, type, first_name, last_name, email, phone, avatar_id, wp_user_id, status, position, title, bio, is_public, created_at, updated_at';

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
		return $this->wpdb->prefix . 'aponto_staff';
	}

	/**
	 * List staff with status filter, name search and pagination.
	 *
	 * @param string $status   `active|archived|all`.
	 * @param string $search   Name search (already sanitized).
	 * @param int    $page     Page (>=1).
	 * @param int    $per_page Page size (1..100).
	 * @param string $order_by `position` for the collection or `id` for the canonical Free profile.
	 * @return array{items: list<array<string, mixed>>, total: int}
	 */
	public function list( string $status, string $search, int $page, int $per_page, string $order_by = 'position' ): array {
		$table  = $this->table();
		$where  = array();
		$params = array();

		if ( 'all' !== $status ) {
			$where[]  = 'status = %s';
			$params[] = $status;
		}
		if ( '' !== $search ) {
			// `first_name`, `last_name` or their concatenation (name split, D-R69 / D-R54).
			$where[] = PersonNameSearch::clause( $this->wpdb );
			$params  = array_merge( $params, PersonNameSearch::args( '%' . $this->wpdb->esc_like( $search ) . '%' ) );
		}
		$where_sql = array() === $where ? '' : ' WHERE ' . implode( ' AND ', $where );

		$count_sql = "SELECT COUNT(*) FROM {$table}{$where_sql}";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; params bound via prepare().
		$total = (int) $this->wpdb->get_var( array() === $params ? $count_sql : $this->wpdb->prepare( $count_sql, $params ) );

		$offset      = ( $page - 1 ) * $per_page;
		$order_sql   = 'id' === $order_by ? 'id ASC' : 'position ASC, id ASC';
		$list_params = array_merge( $params, array( $per_page, $offset ) );
		$list_sql    = 'SELECT ' . self::COLUMNS . " FROM {$table}{$where_sql} ORDER BY {$order_sql} LIMIT %d OFFSET %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; params bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $list_sql, $list_params ), ARRAY_A );

		return array(
			'items' => is_array( $rows ) ? $rows : array(),
			'total' => $total,
		);
	}

	/**
	 * Find one staff row.
	 *
	 * @param int $id Staff id.
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
	 * List-column aggregates for a set of staff ids (admin list columns, B4b).
	 *
	 * `service_count` = distinct eligible services from `aponto_staff_services`;
	 * `has_custom_hours` = whether the member has any own weekly schedule row
	 * (`aponto_schedules` with a null `date_override`) rather than inheriting the
	 * business hours (§1.3). Additive list-column extension — there is no REST
	 * route to read/write eligibility, so the staff editor's Services map stays a
	 * seam; work-hours inherit/customise/revert use `/staff/{id}/schedule`.
	 *
	 * @param list<int> $ids Staff ids on the current page.
	 * @return array<int, array{service_count:int, has_custom_hours:bool}>
	 */
	public function aggregatesFor( array $ids ): array {
		$ids = array_values( array_unique( array_filter( array_map( 'intval', $ids ) ) ) );
		if ( array() === $ids ) {
			return array();
		}

		$placeholders = implode( ',', array_fill( 0, count( $ids ), '%d' ) );
		$out          = array();
		foreach ( $ids as $id ) {
			$out[ $id ] = array(
				'service_count'    => 0,
				'has_custom_hours' => false,
			);
		}

		$connections = $this->wpdb->prefix . 'aponto_staff_services';
		$sql         = "SELECT staff_id, COUNT(DISTINCT service_id) AS service_count FROM {$connections} WHERE staff_id IN ({$placeholders}) GROUP BY staff_id";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; placeholders bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $ids ), ARRAY_A );
		foreach ( is_array( $rows ) ? $rows : array() as $row ) {
			$out[ (int) $row['staff_id'] ]['service_count'] = (int) $row['service_count'];
		}

		$schedules = $this->wpdb->prefix . 'aponto_schedules';
		$sql       = "SELECT DISTINCT staff_id FROM {$schedules} WHERE staff_id IN ({$placeholders}) AND date_override IS NULL";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; placeholders bound via prepare().
		$custom = $this->wpdb->get_col( $this->wpdb->prepare( $sql, $ids ) );
		foreach ( is_array( $custom ) ? $custom : array() as $staff_id ) {
			$out[ (int) $staff_id ]['has_custom_hours'] = true;
		}

		return $out;
	}

	/**
	 * Total staff rows.
	 */
	public function count(): int {
		$table = $this->table();
		$sql   = "SELECT COUNT(*) FROM {$table}";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; no user input.
		return (int) $this->wpdb->get_var( $sql );
	}

	/**
	 * Highest current position (0 when the table is empty), for append-on-create.
	 */
	public function maxPosition(): int {
		$table = $this->table();
		$sql   = "SELECT MAX(position) FROM {$table}";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; no user input.
		$max = $this->wpdb->get_var( $sql );

		return null === $max ? 0 : (int) $max;
	}

	/**
	 * Whether any booking references this staff member (delete dependency check).
	 *
	 * @param int $staff_id Staff id.
	 */
	public function hasBookings( int $staff_id ): bool {
		$table = $this->wpdb->prefix . 'aponto_bookings';
		$sql   = "SELECT COUNT(*) FROM {$table} WHERE staff_id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; params bound via prepare().
		return (int) $this->wpdb->get_var( $this->wpdb->prepare( $sql, $staff_id ) ) > 0;
	}

	/**
	 * Race-safe creation of the initial staff row for onboarding.
	 *
	 * Normal REST staff creation is deliberately uncapped and calls {@see self::create()} directly
	 * (D-R42). This helper is only an idempotent create-or-adopt operation: concurrent wizard
	 * submissions converge on the same lowest-id owner row. It is not a plan limit.
	 *
	 * @param array<string, mixed> $data Column => value (validated).
	 * @return array{status:'created'|'existing'|'locked'|'failed', id:int}
	 */
	public function createFirst( array $data ): array {
		return ( new FirstRecordGuard( $this->wpdb ) )->create(
			'staff',
			fn (): int => $this->lowestId(),
			fn (): int => $this->create( $data ),
			fn ( int $id ) => $this->delete( $id )
		);
	}

	/** The canonical lowest staff id, or 0 when the table is empty. */
	public function lowestId(): int {
		$table = $this->table();
		$sql   = "SELECT id FROM {$table} ORDER BY id ASC LIMIT 1";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; no user input.
		return (int) $this->wpdb->get_var( $sql );
	}

	/**
	 * Insert a staff member, returning its id (0 when the insert statement failed — callers treat
	 * that as a real error, never as a created row).
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
		 * Fires after a staff row is inserted from ANY surface (REST admin editor or the
		 * onboarding wizard). The Free-plan service auto-link listens here so a service created
		 * BEFORE the first staff member exists becomes bookable the moment that staff arrives
		 * ({@see \Aponto\Onboarding\ServiceStaffAutolink}).
		 *
		 * @param int                  $id   New staff id.
		 * @param array<string, mixed> $data Inserted column data, plus the composed display `name`
		 *                                   beside `first_name` / `last_name` (name split N2).
		 */
		if ( $emit_event ) {
			do_action( 'aponto_staff_created', $id, PersonName::withDisplayName( $data ) );
		}

		return $id;
	}

	/**
	 * Re-insert a full pre-image row (including its id) — the delete-recovery compensation: when the
	 * post-DELETE identity check finds the connection was replaced (the delete replayed unserialized),
	 * the captured row is restored so the fail-closed retry semantics hold. Best-effort by design
	 * (callers suppress errors around it). Deliberately does NOT fire `aponto_staff_created` — this
	 * is recovery of an existing row, not a new staff member.
	 *
	 * @param array<string, mixed> $row Full column map as returned by {@see self::find()}.
	 * @return bool Whether the row is back.
	 */
	public function restore( array $row ): bool {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Compensation re-insert of a captured pre-image.
		$inserted = $this->wpdb->insert( $this->table(), $row, $this->formats( $row ) );

		// REPORTS (Codex round 4, P1 #7). A compensation that silently fails leaves the site in the
		// state the caller is about to deny — the staff member deleted while the response says
		// "retry" — and the caller is the only place that can say so out loud.
		return false !== $inserted;
	}

	/**
	 * Update a staff member's provided columns.
	 *
	 * @param int                  $id   Staff id.
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
	 * Delete a staff row.
	 *
	 * THROWS unless exactly one row went (Codex round 4, P1 #7). The previous version ignored the
	 * result entirely, so a failed DELETE inside the hard-delete transaction let the connection
	 * cleanup commit against a staff row that still existed — and the route answered `200`. Both
	 * halves of that transaction have to agree about whether the delete happened, and this is where
	 * that is decided. `0` affected rows is a failure too: existence was checked under the lock a
	 * few statements earlier, so a vanished row means the serialization was not what it appeared.
	 *
	 * @param int $id Staff id.
	 * @throws StorageException When the delete fails or does not remove exactly one row.
	 */
	public function delete( int $id ): void {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Admin delete.
		$affected = $this->wpdb->delete( $this->table(), array( 'id' => $id ), array( '%d' ) );

		if ( 1 !== $affected ) {
			throw StorageException::fromSqlError(
				esc_html( 'staff delete' ),
				esc_html( false === $affected ? (string) $this->wpdb->last_error : 'delete affected ' . (int) $affected . ' rows' )
			);
		}
	}

	/**
	 * Build the `$wpdb` format list for a column map.
	 *
	 * @param array<string, mixed> $data Column => value.
	 * @return list<string>
	 */
	private function formats( array $data ): array {
		$int_cols = array( 'id', 'avatar_id', 'wp_user_id', 'position', 'is_public' );
		$formats  = array();
		foreach ( array_keys( $data ) as $column ) {
			$formats[] = in_array( $column, $int_cols, true ) ? '%d' : '%s';
		}

		return $formats;
	}
}

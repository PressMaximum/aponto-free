<?php
/**
 * Orphan-reference audit + repair for `wp aponto audit [--repair]`.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Cli;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * Finds — and with `--repair`, fixes — rows that reference a staff/service/location that no longer
 * exists. WordPress' `dbDelta()` cannot express real foreign keys, so referential integrity is
 * enforced in the application layer (the REST delete guards + the reservation staff-active check).
 * This command is the SAFETY NET for orphans that predate those guards or arrive by direct DB edits
 * / imports:
 *
 *   - dangling eligibility connections, schedules and blocked periods are DELETED (pure join/derived
 *     rows with no independent value);
 *   - orphan bookings are CANCELLED, never deleted — the customer/order record is preserved, but a
 *     booking whose provider vanished can no longer keep a future slot blocked.
 *
 * Error honesty (R2 #7): EVERY SQL result is checked. A failed count or repair statement reports a
 * `FAIL` item (with the class of failure, never raw SQL) and flips the report's `ok` to false — a
 * partial repair is never presented as success.
 *
 * Atomicity + resumability (R2 #7): each repair group is exactly ONE SQL statement, which the
 * database executes atomically — InnoDB on MySQL/MariaDB, SQLite's implicit per-statement
 * transaction on SQLite (D-R20). A group either fully applies or fully fails; there is no partial
 * state WITHIN a group. Across groups the command is IDEMPOTENT and RESUMABLE by construction: every
 * predicate re-derives the remaining orphans from current data, so re-running after a mid-run
 * failure simply continues with whatever is still broken (already-repaired groups report OK).
 *
 * All queries are parameter-free (table names derive from `$wpdb->prefix`, never user input).
 */
final class Audit {

	/**
	 * Construct the auditor.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct( private \wpdb $wpdb ) {}

	/**
	 * Run every orphan check.
	 *
	 * @param bool $repair Whether to repair (delete/cancel) the orphans found.
	 * @return array{ok:bool, repaired:bool, items:list<array{status:string, item:string, message:string, count:int}>}
	 */
	public function run( bool $repair ): array {
		$items = array(
			$this->connections( $repair ),
			$this->schedules( $repair ),
			$this->blockedPeriods( $repair ),
			$this->bookings( $repair ),
		);

		return array(
			'ok'       => ! in_array( 'FAIL', array_column( $items, 'status' ), true ),
			'repaired' => $repair,
			'items'    => $items,
		);
	}

	/**
	 * Orphan eligibility connections (`aponto_staff_services`) — a missing staff, missing service, or
	 * missing non-wildcard location.
	 *
	 * @param bool $repair Repair flag.
	 * @return array{status:string, item:string, message:string, count:int}
	 */
	private function connections( bool $repair ): array {
		$table = $this->wpdb->prefix . 'aponto_staff_services';
		$where = 'staff_id NOT IN ( SELECT id FROM ' . $this->wpdb->prefix . 'aponto_staff )'
			. ' OR service_id NOT IN ( SELECT id FROM ' . $this->wpdb->prefix . 'aponto_services )'
			. ' OR ( location_id <> 0 AND location_id NOT IN ( SELECT id FROM ' . $this->wpdb->prefix . 'aponto_locations ) )';

		return $this->deletable( 'eligibility_connections', 'orphan connection', $table, $where, $repair );
	}

	/**
	 * Orphan schedule rows (`aponto_schedules`). `staff_id = 0` is the business-hours scope (never an
	 * orphan); `service_id`/`location_id` of `0` are wildcards.
	 *
	 * @param bool $repair Repair flag.
	 * @return array{status:string, item:string, message:string, count:int}
	 */
	private function schedules( bool $repair ): array {
		$table = $this->wpdb->prefix . 'aponto_schedules';
		$where = '( staff_id <> 0 AND staff_id NOT IN ( SELECT id FROM ' . $this->wpdb->prefix . 'aponto_staff ) )'
			. ' OR ( service_id <> 0 AND service_id NOT IN ( SELECT id FROM ' . $this->wpdb->prefix . 'aponto_services ) )'
			. ' OR ( location_id <> 0 AND location_id NOT IN ( SELECT id FROM ' . $this->wpdb->prefix . 'aponto_locations ) )';

		return $this->deletable( 'schedules', 'orphan schedule', $table, $where, $repair );
	}

	/**
	 * Orphan blocked periods (`aponto_blocked_periods`) — a missing staff (`staff_id <> 0`) or missing
	 * non-wildcard location.
	 *
	 * @param bool $repair Repair flag.
	 * @return array{status:string, item:string, message:string, count:int}
	 */
	private function blockedPeriods( bool $repair ): array {
		$table = $this->wpdb->prefix . 'aponto_blocked_periods';
		$where = '( staff_id <> 0 AND staff_id NOT IN ( SELECT id FROM ' . $this->wpdb->prefix . 'aponto_staff ) )'
			. ' OR ( location_id <> 0 AND location_id NOT IN ( SELECT id FROM ' . $this->wpdb->prefix . 'aponto_locations ) )';

		return $this->deletable( 'blocked_periods', 'orphan blocked period', $table, $where, $repair );
	}

	/**
	 * Active orphan bookings (`aponto_bookings`) — a pending/confirmed booking whose staff, service or
	 * non-wildcard location no longer exists. Repair CANCELS them (never deletes — the record is
	 * preserved). Already-cancelled/completed/no-show orphans are inert (none of the three is a
	 * blocking status, so they hold no slot) and are intentionally out of scope, which also keeps
	 * repair idempotent. `no_show` needs no clause of its own: the ACTIVE list below is an
	 * allow-list, so a status that is not on it is already excluded (D-R33).
	 *
	 * @param bool $repair Repair flag.
	 * @return array{status:string, item:string, message:string, count:int}
	 */
	private function bookings( bool $repair ): array {
		$table  = $this->wpdb->prefix . 'aponto_bookings';
		$orphan = 'staff_id NOT IN ( SELECT id FROM ' . $this->wpdb->prefix . 'aponto_staff )'
			. ' OR service_id NOT IN ( SELECT id FROM ' . $this->wpdb->prefix . 'aponto_services )'
			. ' OR ( location_id <> 0 AND location_id NOT IN ( SELECT id FROM ' . $this->wpdb->prefix . 'aponto_locations ) )';
		// Only ACTIVE orphans are actionable; scoping both the count and the cancel identically keeps
		// --repair idempotent (a cancelled orphan is no longer reported).
		$where = "( {$orphan} ) AND status IN ( 'pending', 'confirmed' )";

		$found = $this->count( $table, $where );
		if ( null === $found ) {
			return $this->item( 'FAIL', 'bookings', 'Orphan-booking count query failed; nothing was changed.', 0 );
		}
		if ( 0 === $found ) {
			return $this->item( 'OK', 'bookings', 'No active orphan bookings.', 0 );
		}
		if ( ! $repair ) {
			return $this->item( 'FOUND', 'bookings', sprintf( '%d active orphan booking(s) — run with --repair to cancel.', $found ), $found );
		}

		$now = gmdate( 'Y-m-d H:i:s' );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables from $wpdb->prefix; timestamp bound via prepare(); no user input.
		$cancelled = $this->wpdb->query( $this->wpdb->prepare( "UPDATE {$table} SET status = 'cancelled', updated_at = %s WHERE {$where}", $now ) );
		if ( false === $cancelled ) {
			// R2 #7: a failed repair statement is a FAIL — never reported as fixed. The single UPDATE
			// is atomic, so no partial cancellation exists; re-run to retry.
			return $this->item( 'FAIL', 'bookings', sprintf( 'Cancel of %d active orphan booking(s) failed; nothing was changed. Re-run to retry.', $found ), 0 );
		}

		return $this->item( 'FIXED', 'bookings', sprintf( 'Cancelled %d active orphan booking(s) (records preserved).', (int) $cancelled ), (int) $cancelled );
	}

	/**
	 * Count/delete an orphan set for a pure join/derived table. Every SQL result is checked (R2 #7);
	 * the single DELETE per group is atomic, so a failure leaves the group fully unrepaired and the
	 * next run retries it.
	 *
	 * @param string $key    Report item key.
	 * @param string $noun   Singular noun for the message.
	 * @param string $table  Fully-qualified table name.
	 * @param string $where  Orphan predicate.
	 * @param bool   $repair Repair flag.
	 * @return array{status:string, item:string, message:string, count:int}
	 */
	private function deletable( string $key, string $noun, string $table, string $where, bool $repair ): array {
		$found = $this->count( $table, $where );
		if ( null === $found ) {
			return $this->item( 'FAIL', $key, sprintf( '%s count query failed; nothing was changed.', ucfirst( $noun ) ), 0 );
		}
		if ( 0 === $found ) {
			return $this->item( 'OK', $key, sprintf( 'No %s rows.', $noun ), 0 );
		}
		if ( ! $repair ) {
			return $this->item( 'FOUND', $key, sprintf( '%d %s row(s) — run with --repair to remove.', $found, $noun ), $found );
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables from $wpdb->prefix; no user input.
		$removed = $this->wpdb->query( "DELETE FROM {$table} WHERE {$where}" );
		if ( false === $removed ) {
			return $this->item( 'FAIL', $key, sprintf( 'Removal of %d %s row(s) failed; nothing was changed. Re-run to retry.', $found, $noun ), 0 );
		}

		return $this->item( 'FIXED', $key, sprintf( 'Removed %d %s row(s).', (int) $removed, $noun ), (int) $removed );
	}

	/**
	 * Count rows matching an orphan predicate — null when the query itself failed (R2 #7), which the
	 * caller reports as FAIL rather than mistaking it for "no orphans".
	 *
	 * @param string $table Fully-qualified table name.
	 * @param string $where Predicate.
	 */
	private function count( string $table, string $where ): ?int {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables from $wpdb->prefix; no user input.
		$value = $this->wpdb->get_var( "SELECT COUNT(*) FROM {$table} WHERE {$where}" );
		if ( '' !== (string) $this->wpdb->last_error ) {
			return null;
		}

		return (int) $value;
	}

	/**
	 * Build one report item.
	 *
	 * @param string $status  OK|FOUND|FIXED|FAIL.
	 * @param string $item    Item key.
	 * @param string $message Human-readable result.
	 * @param int    $count   Rows found/repaired.
	 * @return array{status:string, item:string, message:string, count:int}
	 */
	private function item( string $status, string $item, string $message, int $count ): array {
		return array(
			'status'  => $status,
			'item'    => $item,
			'message' => $message,
			'count'   => $count,
		);
	}
}

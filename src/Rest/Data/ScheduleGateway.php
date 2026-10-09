<?php
/**
 * Staff schedule gateway (bulk weekly + overrides).
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

use Aponto\Database\LockFactory;
use Aponto\Database\StorageException;
use Aponto\Database\TransactionGuard;

/**
 * Reads and fully replaces the `aponto_schedules` rows for a `(staff_id, service_id, location_id)`
 * scope backing `PUT /staff/{id}/schedule` (rest-contract §2.6). REST nulls for service/location map
 * to the DB wildcard `0`. A weekly weekday or an override date whose periods are empty is stored as
 * a single closed marker row (`start_minute = end_minute = 0`, §5.2); a weekday/date with no rows
 * inherits from the wildcard.
 */
final class ScheduleGateway {

	/**
	 * {@see self::replace()} outcome: the scope now holds exactly the given rows.
	 */
	public const REPLACED = 'replaced';

	/**
	 * {@see self::replace()} outcome: another replacement of the same scope held the lock past the
	 * timeout (or the lock was lost to a reconnect). Nothing was written; retryable.
	 */
	public const LOCKED = 'locked';

	/**
	 * {@see self::replace()} outcome: a statement failed and the replacement was rolled back.
	 */
	public const FAILED = 'failed';

	/**
	 * Seconds a replacement waits for the scope lock — the same short admin-write wait the
	 * services reorder and the module settings writers use.
	 */
	private const LOCK_TIMEOUT = 3;

	/**
	 * Construct the gateway.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct( private \wpdb $wpdb ) {}

	/**
	 * Table name.
	 */
	private function table(): string {
		return $this->wpdb->prefix . 'aponto_schedules';
	}

	/**
	 * Whether a staff row exists.
	 *
	 * @param int $staff_id Staff id.
	 */
	public function staffExists( int $staff_id ): bool {
		$table = $this->wpdb->prefix . 'aponto_staff';
		$sql   = "SELECT COUNT(*) FROM {$table} WHERE id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		return (int) $this->wpdb->get_var( $this->wpdb->prepare( $sql, $staff_id ) ) > 0;
	}

	/**
	 * Read the schedule rows for a scope.
	 *
	 * @param int $staff_id    Staff id.
	 * @param int $service_id  Service id (0 = wildcard).
	 * @param int $location_id Location id (0 = wildcard).
	 * @return list<array<string, mixed>>
	 */
	public function read( int $staff_id, int $service_id, int $location_id ): array {
		$table = $this->table();
		$sql   = "SELECT weekday, date_override, start_minute, end_minute FROM {$table}
			WHERE staff_id = %d AND service_id = %d AND location_id = %d
			ORDER BY date_override IS NULL DESC, weekday ASC, date_override ASC, start_minute ASC";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $staff_id, $service_id, $location_id ), ARRAY_A );

		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * The lock name serializing every full replacement of one scope on this site.
	 *
	 * Site-scoped through `$wpdb->prefix` and hashed to the 48-char shape every other lock name in
	 * the plugin uses ({@see \Aponto\Booking\StaffLockFactory}): `GET_LOCK` names are global to the
	 * MySQL server while the rows live in each site's own table.
	 *
	 * @param int $staff_id    Staff id (0 = business hours).
	 * @param int $service_id  Service id (0 = wildcard).
	 * @param int $location_id Location id (0 = wildcard).
	 */
	public function lockName( int $staff_id, int $service_id, int $location_id ): string {
		return 'apt:' . substr( hash( 'sha256', $this->wpdb->prefix . '|schedule|' . $staff_id . '|' . $service_id . '|' . $location_id ), 0, 48 );
	}

	/**
	 * Fully replace the schedule rows for a scope — atomically and serialized per scope.
	 *
	 * The replacement used to be a bare DELETE followed by an INSERT loop, with neither a
	 * transaction nor a lock. Two identical saves a few milliseconds apart (a double tap on "Save
	 * business hours" on a phone) interleaved as DELETE₁ · DELETE₂ · INSERT₁… · INSERT₂…, so every
	 * range was stored TWICE and the editor then refused its own data as overlapping (persona QA
	 * 2026-10-05, T-065). Now: the scope's advisory lock ({@see LockFactory} — `GET_LOCK` on MySQL,
	 * `flock` on SQLite) → transaction → DELETE + INSERTs → COMMIT, with the same E1
	 * connection-identity checks as the services reorder. The second writer waits, then replaces
	 * the first writer's complete set with its own, leaving exactly one set of rows on both
	 * engines. A failed INSERT rolls the whole replacement back instead of leaving a partly
	 * emptied grid.
	 *
	 * @param int                                                                                   $staff_id    Staff id.
	 * @param int                                                                                   $service_id  Service id (0 = wildcard).
	 * @param int                                                                                   $location_id Location id (0 = wildcard).
	 * @param list<array{weekday:int, date_override:string|null, start_minute:int, end_minute:int}> $rows Row set.
	 * @return string One of {@see self::REPLACED}, {@see self::LOCKED}, {@see self::FAILED}.
	 */
	public function replace( int $staff_id, int $service_id, int $location_id, array $rows ): string {
		$guard = new TransactionGuard( $this->wpdb );
		$lock  = ( new LockFactory( $this->wpdb ) )->named( $this->lockName( $staff_id, $service_id, $location_id ) );
		if ( ! $lock->acquire( self::LOCK_TIMEOUT ) ) {
			return self::LOCKED;
		}

		$transaction_open = false;
		try {
			// E1 pre-write: a reconnect since acquire() silently dropped the lock.
			if ( null === $lock->connectionId() || $lock->connectionId() !== $guard->currentConnectionId() ) {
				return self::LOCKED;
			}

			$guard->beginReadCommitted();
			$transaction_open = true;

			if ( ! $this->writeRows( $staff_id, $service_id, $location_id, $rows ) ) {
				return self::FAILED;
			}

			// A lost session cannot report a successful replacement.
			if ( null === $lock->connectionId() || $lock->connectionId() !== $guard->currentConnectionId() ) {
				return self::LOCKED;
			}
			$guard->commit();
			$transaction_open = false;
		} catch ( StorageException $failure ) {
			unset( $failure );

			return self::FAILED;
		} finally {
			if ( $transaction_open ) {
				$guard->rollback();
			}
			if ( null !== $lock->connectionId() && $lock->connectionId() === $guard->currentConnectionId() ) {
				$lock->release();
			}
		}

		return self::REPLACED;
	}

	/**
	 * DELETE the scope and INSERT the new set, inside the caller's transaction.
	 *
	 * @param int                                                                                   $staff_id    Staff id.
	 * @param int                                                                                   $service_id  Service id (0 = wildcard).
	 * @param int                                                                                   $location_id Location id (0 = wildcard).
	 * @param list<array{weekday:int, date_override:string|null, start_minute:int, end_minute:int}> $rows Row set.
	 * @return bool False when any statement failed (the caller rolls back).
	 */
	private function writeRows( int $staff_id, int $service_id, int $location_id, array $rows ): bool {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Scoped full-replacement delete.
		$deleted = $this->wpdb->delete(
			$this->table(),
			array(
				'staff_id'    => $staff_id,
				'service_id'  => $service_id,
				'location_id' => $location_id,
			),
			array( '%d', '%d', '%d' )
		);
		if ( false === $deleted ) {
			return false;
		}

		foreach ( $rows as $row ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Full-replacement insert.
			$inserted = $this->wpdb->insert(
				$this->table(),
				array(
					'staff_id'      => $staff_id,
					'service_id'    => $service_id,
					'location_id'   => $location_id,
					'weekday'       => $row['weekday'],
					'date_override' => $row['date_override'],
					'start_minute'  => $row['start_minute'],
					'end_minute'    => $row['end_minute'],
				),
				array( '%d', '%d', '%d', '%d', '%s', '%d', '%d' )
			);
			if ( false === $inserted ) {
				return false;
			}
		}

		return true;
	}
}

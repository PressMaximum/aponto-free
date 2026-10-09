<?php
/**
 * WordPress-user coupon allow-list rows as personal data (D-R67l).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Privacy;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Database\StorageException;
use Aponto\Database\TransactionGuard;

/**
 * `aponto_coupon_users` maps a coupon to the WordPress accounts it is reserved for (D-R67a). A row
 * says "this person was singled out for this discount" — personal data about that account, so the
 * WordPress exporter reports it and the eraser removes it, and a deleted account leaves nothing
 * behind. Core code because the table is core schema in both editions (D-R67); names no module.
 *
 * FAIL-CLOSED removal: taking the last real user off a coupon's allow-list must not turn a coupon
 * reserved for one person into a coupon for everyone (an empty list means "all users"). When a
 * removal empties the list, the coupon gets the `user_id = 0` NOBODY sentinel instead — it then
 * applies to no one until an operator deliberately re-targets or widens it.
 */
final class CouponUserTargets {

	/**
	 * Construct.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct( private \wpdb $wpdb ) {}

	/**
	 * Register the `deleted_user` cleanup (single site and network deletes both fire it).
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public static function register( \wpdb $wpdb ): void {
		add_action(
			'deleted_user',
			static function ( $user_id ) use ( $wpdb ): void {
				try {
					( new self( $wpdb ) )->removeUser( (int) $user_id );
				} catch ( StorageException $failure ) {
					// A failed cleanup must not break the WordPress user deletion around it; the
					// stale row can only ever match an id WordPress will not hand out again.
					unset( $failure );
				}
			}
		);
	}

	/**
	 * The coupons a WordPress user is individually targeted by.
	 *
	 * @param int $user_id WordPress user id.
	 * @return list<array{coupon_id:int, code:string, name:string}>
	 */
	public function forUser( int $user_id ): array {
		if ( $user_id < 1 ) {
			return array();
		}
		$map     = $this->wpdb->prefix . 'aponto_coupon_users';
		$coupons = $this->wpdb->prefix . 'aponto_coupons';
		$sql     = "SELECT m.coupon_id, COALESCE(c.code, '') AS code, COALESCE(c.name, '') AS name FROM {$map} m LEFT JOIN {$coupons} c ON c.id = m.coupon_id WHERE m.user_id = %d ORDER BY m.coupon_id ASC";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; id bound.
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $user_id ), ARRAY_A );

		return array_map(
			static fn ( array $row ): array => array(
				'coupon_id' => (int) $row['coupon_id'],
				'code'      => (string) $row['code'],
				'name'      => (string) $row['name'],
			),
			is_array( $rows ) ? array_values( $rows ) : array()
		);
	}

	/**
	 * Maximum lock-and-remove rounds before the cleanup gives up and reports the rows retained.
	 */
	private const MAX_ROUNDS = 5;

	/**
	 * Remove a user from every coupon allow-list, leaving emptied lists fail-closed.
	 *
	 * ONE TRANSACTION, CONVERGED UNDER LOCKS (D-R67s, review round 3). Each round re-reads the
	 * user's memberships with a LOCKING read — which on InnoDB also locks the `user_id` index range,
	 * so an admin save cannot slip a new membership for this user in behind it — then locks the
	 * affected coupon rows `FOR UPDATE` in id order (the catalog writers' lock), deletes, and
	 * leaves the NOBODY sentinel on any list it emptied. The loop ends only when a locking re-read
	 * finds no membership left; if that does not happen within {@see self::MAX_ROUNDS} rounds, or a
	 * lock cannot be taken (timeout/deadlock with a concurrent save), everything rolls back and the
	 * caller is told, so erasure never reports "complete" over a surviving row. The coupon row's
	 * `users_targeted` flag is never touched here: even an emptied map stays closed.
	 *
	 * @param int $user_id WordPress user id.
	 * @return int Number of allow-list memberships removed.
	 * @throws StorageException When a lock or write fails, or the cleanup did not converge.
	 */
	public function removeUser( int $user_id ): int {
		// Only an invalid id short-circuits. The "anything to do?" question is answered by the
		// CHECKED locking read inside the transaction, never by an unchecked read out here that
		// would turn a query failure into "nothing to erase" (review round 4).
		if ( $user_id < 1 ) {
			return 0;
		}
		$map     = $this->wpdb->prefix . 'aponto_coupon_users';
		$coupons = $this->wpdb->prefix . 'aponto_coupons';
		$deleted = 0;

		$tx = new TransactionGuard( $this->wpdb );
		$tx->begin();
		try {
			for ( $round = 0; ; ++$round ) {
				$suppressed             = $this->wpdb->suppress_errors( true );
				$this->wpdb->last_error = '';
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; id bound; locking (current) read.
				$members = $this->wpdb->get_col( $this->wpdb->prepare( "SELECT coupon_id FROM {$map} WHERE user_id = %d ORDER BY coupon_id ASC FOR UPDATE", $user_id ) );
				$this->wpdb->suppress_errors( $suppressed );
				if ( '' !== $this->lastDbError() ) {
					// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Factory sanitizes database diagnostics.
					throw StorageException::fromWpdb( $this->wpdb, 'coupon user target read' );
				}
				$members = array_values( array_unique( array_map( 'intval', is_array( $members ) ? $members : array() ) ) );
				if ( array() === $members ) {
					break;
				}
				if ( $round >= self::MAX_ROUNDS ) {
					throw StorageException::because( 'coupon user target cleanup did not converge' );
				}

				$in                     = implode( ',', array_fill( 0, count( $members ), '%d' ) );
				$suppressed             = $this->wpdb->suppress_errors( true );
				$this->wpdb->last_error = '';
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare -- Constant table; integer placeholders built above; writer lock order (coupon rows by id).
				$this->wpdb->get_col( $this->wpdb->prepare( "SELECT id FROM {$coupons} WHERE id IN ({$in}) ORDER BY id ASC FOR UPDATE", $members ) );
				$this->wpdb->suppress_errors( $suppressed );
				if ( '' !== $this->lastDbError() ) {
					// No lock, no cleanup: a lock-wait timeout or deadlock never degrades into an
					// unserialized write.
					// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Factory sanitizes database diagnostics.
					throw StorageException::fromWpdb( $this->wpdb, 'coupon user target lock' );
				}

				foreach ( $members as $coupon_id ) {
					$deleted += $this->removeMembership( $map, $coupon_id, $user_id );
				}
			}
			$tx->commit();
		} catch ( StorageException $failure ) {
			$tx->rollback();
			throw $failure;
		}

		return $deleted;
	}

	/**
	 * Delete one membership under the held locks; leave the NOBODY sentinel if the list emptied.
	 *
	 * @param string $map       Map table.
	 * @param int    $coupon_id Coupon id.
	 * @param int    $user_id   WordPress user id.
	 * @return int Rows deleted.
	 * @throws StorageException When a write fails.
	 */
	private function removeMembership( string $map, int $coupon_id, int $user_id ): int {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Transactional allow-list cleanup under the coupon lock.
		$gone = $this->wpdb->delete(
			$map,
			array(
				'coupon_id' => $coupon_id,
				'user_id'   => $user_id,
			),
			array( '%d', '%d' )
		);
		if ( false === $gone ) {
			// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Factory sanitizes database diagnostics.
			throw StorageException::fromWpdb( $this->wpdb, 'coupon user target erase' );
		}
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; id bound; current read under the lock.
		$left = $this->wpdb->get_col( $this->wpdb->prepare( "SELECT user_id FROM {$map} WHERE coupon_id = %d FOR UPDATE", $coupon_id ) );
		if ( ! is_array( $left ) || array() === $left ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Fail-closed sentinel inside the locked region.
			$ok = $this->wpdb->insert(
				$map,
				array(
					'coupon_id' => $coupon_id,
					'user_id'   => 0,
				),
				array( '%d', '%d' )
			);
			if ( false === $ok ) {
				// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Factory sanitizes database diagnostics.
				throw StorageException::fromWpdb( $this->wpdb, 'coupon user target sentinel' );
			}
		}

		return (int) $gone;
	}

	/**
	 * The database error of the statement just run ('' when it succeeded).
	 *
	 * @phpstan-impure
	 */
	private function lastDbError(): string {
		return (string) $this->wpdb->last_error;
	}
}

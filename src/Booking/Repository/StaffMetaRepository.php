<?php
/**
 * Staff metadata reader/writer (extension-surface §4, §6).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Booking\Repository;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Database\StorageException;

/**
 * Reads and writes `aponto_staff_meta` — the table extension-surface §4 pins as the home of an
 * integration's per-staff connection record (`integration.{code}.connection`).
 *
 * GENERIC by design: it takes the key as data and knows nothing about integrations, about which
 * module owns a namespace, or about encryption. Sealing the connection envelope is
 * {@see \Aponto\Integration\ConnectionStore}'s job; this class only moves rows. That split is what
 * lets extension-surface §6 hand third parties a repository ("use `StaffMetaRepository`") without
 * also handing them the site's key derivation.
 *
 * The table carries `UNIQUE KEY owner_key (staff_id, meta_key)` (Migration_0001), so a write is a
 * single upsert and a read is a single point lookup — no read-then-write race.
 *
 * WordPress user meta is deliberately NOT an option here: a staff member need not have a
 * `wp_user_id` at all (extension-surface §8 OQ1), so `wp_usermeta` cannot address every staff row.
 */
final class StaffMetaRepository {

	/**
	 * Construct the repository.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct( private \wpdb $wpdb ) {}

	/**
	 * Read one metadata value, or null when the row does not exist.
	 *
	 * @param int    $staff_id Staff id.
	 * @param string $meta_key Fully-qualified metadata key.
	 */
	public function get( int $staff_id, string $meta_key ): ?string {
		$table = $this->wpdb->prefix . 'aponto_staff_meta';
		$sql   = "SELECT meta_value FROM {$table} WHERE staff_id = %d AND meta_key = %s LIMIT 1";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		$value = $this->wpdb->get_var( $this->wpdb->prepare( $sql, $staff_id, $meta_key ) );

		return null === $value ? null : (string) $value;
	}

	/**
	 * Every `staff_id => meta_value` pair stored under ONE key, across all staff.
	 *
	 * One query regardless of staff count — the shape the connection index rebuild and the
	 * catalog's `connected_count` need, and the reason neither of them loops over staff rows.
	 *
	 * @param string $meta_key Fully-qualified metadata key.
	 * @return array<int, string>
	 * @throws StorageException When the query fails.
	 */
	public function allByKey( string $meta_key ): array {
		$table = $this->wpdb->prefix . 'aponto_staff_meta';
		$sql   = "SELECT staff_id, meta_value FROM {$table} WHERE meta_key = %s ORDER BY staff_id ASC";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; the key is bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $meta_key ), ARRAY_A );

		// A FAILED QUERY IS NOT AN EMPTY RESULT (Codex round 10, P2). Both arrive here as "no rows",
		// and one caller reads that as "this module has no connections left" — so a dropped database
		// connection during {@see \Aponto\Integration\ConnectionStore::reconcileProjection()} would
		// have declared a LIVE module orphaned and deleted its projection slice. Fail-open on a read
		// that authorises a delete is the one direction this must never take.
		if ( '' !== (string) $this->wpdb->last_error ) {
			throw StorageException::fromSqlError( esc_html( 'staff meta lookup by key' ), esc_html( (string) $this->wpdb->last_error ) );
		}

		$out = array();
		foreach ( is_array( $rows ) ? $rows : array() as $row ) {
			$out[ (int) ( $row['staff_id'] ?? 0 ) ] = (string) ( $row['meta_value'] ?? '' );
		}

		return $out;
	}

	/**
	 * Upsert one metadata value.
	 *
	 * @param int    $staff_id   Staff id.
	 * @param string $meta_key   Fully-qualified metadata key.
	 * @param string $meta_value Value to store (already serialized/sealed by the caller).
	 * @throws StorageException When the write fails.
	 */
	public function set( int $staff_id, string $meta_key, string $meta_value ): void {
		$table = $this->wpdb->prefix . 'aponto_staff_meta';
		$sql   = "INSERT INTO {$table} (staff_id, meta_key, meta_value) VALUES (%d, %s, %s)
			ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		$result = $this->wpdb->query( $this->wpdb->prepare( $sql, $staff_id, $meta_key, $meta_value ) );
		if ( false === $result ) {
			// THROWS rather than returning false (Codex P1 #4): the caller of this method is storing
			// an OAuth connection, and a silently dropped write there produces a "connected" screen
			// with no token behind it — the failure mode that is hardest to diagnose later.
			throw StorageException::fromSqlError( esc_html( 'staff meta upsert' ), esc_html( (string) $this->wpdb->last_error ) );
		}
	}

	/**
	 * Delete one metadata row. Idempotent — an absent row deletes zero rows and is not an error.
	 *
	 * @param int    $staff_id Staff id.
	 * @param string $meta_key Fully-qualified metadata key.
	 * @throws StorageException When the delete fails.
	 */
	public function delete( int $staff_id, string $meta_key ): void {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Constant table; deleting an absent row is the expected idempotent case.
		$result = $this->wpdb->delete(
			$this->wpdb->prefix . 'aponto_staff_meta',
			array(
				'staff_id' => $staff_id,
				'meta_key' => $meta_key,
			),
			array( '%d', '%s' )
		);
		if ( false === $result ) {
			// A disconnect that reports success while the token row survives is worse than an error
			// the operator can retry (Codex P1 #4).
			throw StorageException::fromSqlError( esc_html( 'staff meta delete' ), esc_html( (string) $this->wpdb->last_error ) );
		}
	}

	/**
	 * Delete every row whose key starts with a prefix, across all staff (module uninstall —
	 * extension-surface §3.5). Idempotent: a second run removes nothing and reports 0.
	 *
	 * @param string $prefix Key prefix, e.g. `integration.calendar_google.`.
	 * @return int Rows removed.
	 * @throws StorageException When the delete fails.
	 */
	public function deleteByKeyPrefix( string $prefix ): int {
		if ( '' === $prefix ) {
			return 0; // Refuse to wipe the whole table through an empty prefix.
		}

		$table = $this->wpdb->prefix . 'aponto_staff_meta';
		$like  = $this->wpdb->esc_like( $prefix ) . '%';
		$sql   = "DELETE FROM {$table} WHERE meta_key LIKE %s";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; the escaped LIKE pattern is bound via prepare().
		$removed = $this->wpdb->query( $this->wpdb->prepare( $sql, $like ) );

		// `(int) false` is `0`, which reads as "there was nothing to delete" (Codex round 6, P2). On
		// the uninstall path that is the difference between "the tokens are gone" and "the delete
		// failed and nobody noticed" — so the failure is raised, and the caller's catch/log path
		// decides what to do about it.
		if ( false === $removed ) {
			throw StorageException::fromSqlError( esc_html( 'staff meta bulk delete' ), esc_html( (string) $this->wpdb->last_error ) );
		}

		return (int) $removed;
	}
}

<?php
/**
 * Service metadata reader/writer (extension-surface §4, §6).
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
 * Reads and writes `aponto_service_meta` — where extension-surface §4 puts the `used` tier of the
 * integration 4-state: `integration.{code}.enabled = '1'` on the services an integration acts for.
 *
 * Generic in exactly the same way as {@see StaffMetaRepository}: the key is data, and nothing here
 * knows what an integration is.
 */
final class ServiceMetaRepository {

	/**
	 * Construct the repository.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct( private \wpdb $wpdb ) {}

	/**
	 * Read one metadata value, or null when the row does not exist.
	 *
	 * @param int    $service_id Service id.
	 * @param string $meta_key   Fully-qualified metadata key.
	 */
	public function get( int $service_id, string $meta_key ): ?string {
		$table = $this->wpdb->prefix . 'aponto_service_meta';
		$sql   = "SELECT meta_value FROM {$table} WHERE service_id = %d AND meta_key = %s LIMIT 1";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		$value = $this->wpdb->get_var( $this->wpdb->prepare( $sql, $service_id, $meta_key ) );

		return null === $value ? null : (string) $value;
	}

	/**
	 * Service ids whose value under ONE key is truthy (`'1'`). One query regardless of catalog size.
	 *
	 * @param string $meta_key Fully-qualified metadata key.
	 * @return list<int>
	 */
	public function enabledServiceIds( string $meta_key ): array {
		$table = $this->wpdb->prefix . 'aponto_service_meta';
		$sql   = "SELECT service_id FROM {$table} WHERE meta_key = %s AND meta_value = '1' ORDER BY service_id ASC";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; the key is bound via prepare().
		$rows = $this->wpdb->get_col( $this->wpdb->prepare( $sql, $meta_key ) );

		return array_values( array_map( 'intval', is_array( $rows ) ? $rows : array() ) );
	}

	/**
	 * Upsert one metadata value.
	 *
	 * @param int    $service_id Service id.
	 * @param string $meta_key   Fully-qualified metadata key.
	 * @param string $meta_value Value to store.
	 * @throws StorageException When the write fails.
	 */
	public function set( int $service_id, string $meta_key, string $meta_value ): void {
		$table = $this->wpdb->prefix . 'aponto_service_meta';
		$sql   = "INSERT INTO {$table} (service_id, meta_key, meta_value) VALUES (%d, %s, %s)
			ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		$result = $this->wpdb->query( $this->wpdb->prepare( $sql, $service_id, $meta_key, $meta_value ) );
		if ( false === $result ) {
			throw StorageException::fromSqlError( esc_html( 'service meta upsert' ), esc_html( (string) $this->wpdb->last_error ) );
		}
	}

	/**
	 * Delete one metadata row. Idempotent.
	 *
	 * @param int    $service_id Service id.
	 * @param string $meta_key   Fully-qualified metadata key.
	 * @throws StorageException When the delete fails.
	 */
	public function delete( int $service_id, string $meta_key ): void {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Constant table; deleting an absent row is the expected idempotent case.
		$result = $this->wpdb->delete(
			$this->wpdb->prefix . 'aponto_service_meta',
			array(
				'service_id' => $service_id,
				'meta_key'   => $meta_key,
			),
			array( '%d', '%s' )
		);
		if ( false === $result ) {
			throw StorageException::fromSqlError( esc_html( 'service meta delete' ), esc_html( (string) $this->wpdb->last_error ) );
		}
	}

	/**
	 * Delete every row whose key starts with a prefix (module uninstall — extension-surface §3.5).
	 *
	 * @param string $prefix Key prefix.
	 * @return int Rows removed.
	 * @throws StorageException When the delete fails.
	 */
	public function deleteByKeyPrefix( string $prefix ): int {
		if ( '' === $prefix ) {
			return 0;
		}

		$table = $this->wpdb->prefix . 'aponto_service_meta';
		$like  = $this->wpdb->esc_like( $prefix ) . '%';
		$sql   = "DELETE FROM {$table} WHERE meta_key LIKE %s";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; the escaped LIKE pattern is bound via prepare().
		$removed = $this->wpdb->query( $this->wpdb->prepare( $sql, $like ) );

		// `(int) false` is `0`, which reads as "there was nothing to delete" (Codex round 7, P2). On
		// the uninstall path that is the difference between "the rows are gone" and "the delete failed
		// and nobody noticed", and the caller's catch/log path can only fire if there is something to
		// catch. The same rule as {@see \Aponto\Booking\Repository\StaffMetaRepository::deleteByKeyPrefix()}.
		if ( false === $removed ) {
			throw StorageException::fromSqlError( esc_html( 'service meta bulk delete' ), esc_html( (string) $this->wpdb->last_error ) );
		}

		return (int) $removed;
	}
}

<?php
/**
 * Migration 0014 — the order's payable-now snapshot (D-R71, deposits).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Database\Migrations;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * Adds the nullable `aponto_orders.payable_now_minor` column.
 *
 * `NULL` means the order charges its full total — every order written before this migration, and
 * every full-payment order after it. Only a deposit order (`0 < payable_now < total`) stores a
 * value, so legacy rows need no backfill and read byte-for-byte as before. Core schema, identical in
 * Free and Premium (§5 invariant 4): a Free site after a downgrade still reads deposit orders.
 *
 * Same additive shape as 0011: a guarded `ALTER` per missing column, idempotent, verified by its own
 * postcondition, which the migrator's health pass asks for again on every self-repair.
 */
final class Migration_0014_OrderPayableNow implements Migration {

	/**
	 * Columns this migration owns on `aponto_orders`.
	 *
	 * @var array<string, string>
	 */
	private const COLUMNS = array(
		'payable_now_minor' => 'int unsigned NULL',
	);

	/**
	 * Schema version this migration reaches.
	 */
	public function version(): int {
		return 14;
	}

	/**
	 * Add every missing column. Idempotent: a column already present is skipped.
	 *
	 * @param \wpdb $wpdb Database handle.
	 * @throws \RuntimeException When a read or an ALTER fails at the database layer.
	 */
	public function up( \wpdb $wpdb ): void {
		$existing = $this->columns( $wpdb );
		$table    = $wpdb->prefix . 'aponto_orders';

		foreach ( self::COLUMNS as $column => $definition ) {
			if ( in_array( $column, $existing, true ) ) {
				continue;
			}

			$wpdb->flush();
			$ddl = "ALTER TABLE {$table} ADD COLUMN {$column} {$definition}";
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Constant DDL: table from $wpdb->prefix, column name and definition are class constants, no user input; additive and guarded by the existence check above.
			$wpdb->query( $ddl );
			if ( '' !== (string) $wpdb->last_error ) {
				throw new \RuntimeException(
					esc_html( sprintf( 'Aponto migration 0014: ALTER for %1$s failed: %2$s', $column, $wpdb->last_error ) )
				);
			}
		}
	}

	/**
	 * Postcondition: the column is present on `aponto_orders`.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function verify( \wpdb $wpdb ): bool {
		try {
			$existing = $this->columns( $wpdb );
		} catch ( \RuntimeException $failure ) {
			unset( $failure );

			return false;
		}

		foreach ( array_keys( self::COLUMNS ) as $column ) {
			if ( ! in_array( $column, $existing, true ) ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Lower-cased column names currently on `aponto_orders`.
	 *
	 * @param \wpdb $wpdb Database handle.
	 * @return list<string>
	 * @throws \RuntimeException When the column read fails at the database layer.
	 */
	private function columns( \wpdb $wpdb ): array {
		$table = $wpdb->prefix . 'aponto_orders';
		$wpdb->flush();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Constant table from $wpdb->prefix; schema introspection.
		$rows = $wpdb->get_results( "SHOW COLUMNS FROM {$table}", ARRAY_A );
		if ( '' !== (string) $wpdb->last_error ) {
			throw new \RuntimeException(
				esc_html( sprintf( 'Aponto migration 0014: column read failed: %s', $wpdb->last_error ) )
			);
		}

		$names = array();
		foreach ( is_array( $rows ) ? $rows : array() as $row ) {
			$names[] = strtolower( (string) ( $row['Field'] ?? '' ) );
		}

		return $names;
	}
}

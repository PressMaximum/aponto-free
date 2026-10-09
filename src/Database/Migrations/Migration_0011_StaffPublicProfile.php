<?php
/**
 * Migration 0011 — the staff PUBLIC PROFILE columns (D-R51).
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
 * Three additive columns on `aponto_staff` (§5 invariant 4 — additive, idempotent, no
 * down-migration), owned by CORE and identical in both editions (§5 invariant 2):
 *
 * 1. **`title varchar(191) NOT NULL DEFAULT ''`** — the job title the booking form prints under
 *    the name ("Senior Stylist"). `varchar(191)` is this schema's standard label width (`name`,
 *    `email`), so a title can never be the field that breaks a utf8mb4 index-prefix ceiling.
 * 2. **`bio text NULL`** — a short customer-facing description. NULLABLE rather than
 *    `NOT NULL DEFAULT ''`, and that is a MySQL constraint, not a preference: MySQL 5.7 and
 *    MariaDB refuse a `DEFAULT` on a `TEXT` column outright, so `NOT NULL` here would mean every
 *    INSERT that omits `bio` fails under strict mode — and three writers omit it today (the
 *    onboarding wizard, `wp aponto seed`, the delete-recovery re-insert). 0009's
 *    `aponto_transactions.meta text NULL` is the precedent this follows.
 * 3. **`is_public tinyint(1) NOT NULL DEFAULT 1`** — whether the customer may pick this person BY
 *    NAME on the booking form. Defaults to `1` so an upgrade changes nothing: every existing
 *    staff member is exactly as visible as they were before the column existed. It is a DISPLAY
 *    flag only — a hidden member stays assignable by the any-staff path, which is why no engine,
 *    reserve or eligibility query reads it (D-R51).
 *
 * Added by guarded `ALTER`s rather than by extending 0001's `CREATE TABLE`, for the reason 0009
 * records: 0001 verifies and repairs itself from its OWN statements, so a column declared there
 * but added here would make its health check disagree with its DDL. `SHOW COLUMNS` is the guard —
 * `ADD COLUMN IF NOT EXISTS` is MySQL-8.0-only syntax and this plugin supports MariaDB and the
 * SQLite drop-in as first-class engines (D-R20).
 *
 * Code at version 10 keeps running against a version-11 database: it selects an explicit column
 * list that simply never names these three. The reverse direction is closed by the Kernel's
 * fail-closed schema gate (R2-3).
 */
final class Migration_0011_StaffPublicProfile implements Migration {

	/**
	 * Column name => the DDL fragment that creates it, in the order they are added.
	 *
	 * @var array<string, string>
	 */
	private const COLUMNS = array(
		'title'     => "varchar(191) NOT NULL DEFAULT ''",
		'bio'       => 'text NULL',
		'is_public' => 'tinyint(1) NOT NULL DEFAULT 1',
	);

	/**
	 * Schema version this migration reaches.
	 */
	public function version(): int {
		return 11;
	}

	/**
	 * Add every missing column. Idempotent: a column already present is skipped.
	 *
	 * @param \wpdb $wpdb Database handle.
	 * @throws \RuntimeException When a read or an ALTER fails at the database layer.
	 */
	public function up( \wpdb $wpdb ): void {
		$existing = $this->columns( $wpdb );
		$table    = $wpdb->prefix . 'aponto_staff';

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
					esc_html( sprintf( 'Aponto migration 0011: ALTER for %1$s failed: %2$s', $column, $wpdb->last_error ) )
				);
			}
		}
	}

	/**
	 * Postcondition: all three columns are present on `aponto_staff`.
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
	 * Lower-cased column names currently on `aponto_staff`.
	 *
	 * @param \wpdb $wpdb Database handle.
	 * @return list<string>
	 * @throws \RuntimeException When the column read fails at the database layer.
	 */
	private function columns( \wpdb $wpdb ): array {
		$table = $wpdb->prefix . 'aponto_staff';
		$wpdb->flush();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Constant table from $wpdb->prefix; schema introspection.
		$rows = $wpdb->get_results( "SHOW COLUMNS FROM {$table}", ARRAY_A );
		if ( '' !== (string) $wpdb->last_error ) {
			throw new \RuntimeException(
				esc_html( sprintf( 'Aponto migration 0011: column read failed: %s', $wpdb->last_error ) )
			);
		}

		$names = array();
		foreach ( is_array( $rows ) ? $rows : array() as $row ) {
			$names[] = strtolower( (string) ( $row['Field'] ?? '' ) );
		}

		return $names;
	}
}

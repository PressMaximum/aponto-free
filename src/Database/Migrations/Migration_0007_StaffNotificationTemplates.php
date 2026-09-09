<?php
/**
 * Migration 0007 — the two staff notification templates (D-R28).
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

use Aponto\Installation\Seeder;

/**
 * Data migration (no DDL): inserts `booking_created_staff` and `booking_cancelled_staff` on
 * EXISTING installs, so a site that upgrades into `multi_staff` (D-R28) gets the templates without
 * re-activating the plugin. The rows are the same ones {@see Seeder::templates()} carries — read
 * from there rather than restated, so the seeded and migrated copy cannot drift apart.
 *
 * `recipient = 'staff'` fits the existing `varchar(20)` column, so this migration adds no schema:
 * invariant 4 (identical schema in both editions, additive migrations only) is untouched, and code
 * at version 6 keeps running against a version-7 database — it simply never reads these two rows.
 *
 * IDEMPOTENT by unique `template_key`, exactly like the Seeder's own guard: a key that already
 * exists is skipped, so re-running this migration — or running it on a fresh install where the
 * seeder got there first — inserts nothing and changes nothing. The version bump it carries is
 * also what makes {@see \Aponto\Installation\Installer::maybeUpgrade()} notice the upgrade at all.
 */
final class Migration_0007_StaffNotificationTemplates implements Migration {

	/**
	 * Template keys this migration guarantees.
	 */
	private const KEYS = array( 'booking_created_staff', 'booking_cancelled_staff' );

	/**
	 * Schema version this migration reaches.
	 */
	public function version(): int {
		return 7;
	}

	/**
	 * Insert any missing staff template.
	 *
	 * @param \wpdb $wpdb Database handle.
	 * @throws \RuntimeException When a read or write fails at the database layer.
	 */
	public function up( \wpdb $wpdb ): void {
		$table = $wpdb->prefix . 'aponto_notifications';

		foreach ( Seeder::templates() as $template ) {
			$key = (string) $template['template_key'];
			if ( ! in_array( $key, self::KEYS, true ) ) {
				continue;
			}
			if ( $this->exists( $wpdb, $table, $key ) ) {
				continue;
			}

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- One-time seed insert; the existence guard above proved the key is absent.
			$inserted = $wpdb->insert( $table, $template, array( '%s', '%s', '%s', '%s', '%s', '%d' ) );
			if ( false === $inserted ) {
				throw new \RuntimeException( esc_html( sprintf( 'Aponto migration 0007: insert of %1$s failed: %2$s', $key, $wpdb->last_error ) ) );
			}
		}
	}

	/**
	 * Postcondition: both staff templates exist.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function verify( \wpdb $wpdb ): bool {
		$table = $wpdb->prefix . 'aponto_notifications';
		foreach ( self::KEYS as $key ) {
			try {
				if ( ! $this->exists( $wpdb, $table, $key ) ) {
					return false;
				}
			} catch ( \RuntimeException $e ) {
				unset( $e );

				return false;
			}
		}

		return true;
	}

	/**
	 * Whether a template key is already present, distinguishing "absent" from a database error.
	 *
	 * @param \wpdb  $wpdb  Database handle.
	 * @param string $table Fully-qualified table name.
	 * @param string $key   Template key.
	 * @throws \RuntimeException When the read fails at the database layer.
	 */
	private function exists( \wpdb $wpdb, string $table, string $key ): bool {
		$wpdb->flush();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; key bound via prepare(); existence guard for an idempotent insert.
		$count = $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE template_key = %s", $key ) );
		if ( '' !== $wpdb->last_error ) {
			throw new \RuntimeException( esc_html( sprintf( 'Aponto migration 0007: read failed: %s', $wpdb->last_error ) ) );
		}

		return (int) $count > 0;
	}
}

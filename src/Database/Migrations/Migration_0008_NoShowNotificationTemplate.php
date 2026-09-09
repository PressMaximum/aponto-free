<?php
/**
 * Migration 0008 — the no-show notification template (D-R33).
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
 * Data migration (no DDL): inserts `booking_no_show_customer` on EXISTING installs, so a site that
 * upgrades into the `no_show` status (D-R33) gets the template without re-activating the plugin.
 * The row is the same one {@see Seeder::templates()} carries — read from there rather than
 * restated, so the seeded and migrated copy cannot drift apart. Same shape as
 * {@see Migration_0007_StaffNotificationTemplates}, which is the pattern for "an additive template
 * arrives after 0001".
 *
 * `trigger_event = 'no_show'` fits the existing `varchar(64)` column and `recipient = 'customer'`
 * is a value already in use, so this migration adds no schema: invariant 4 (identical schema in
 * both editions, additive migrations only) is untouched, and code at version 7 keeps running
 * against a version-8 database — it simply never reads this row.
 *
 * The row ships `enabled = 0`. That is the migration's whole safety story: an upgrade must not
 * silently start emailing customers who missed an appointment. The owner turns it on in
 * Settings → Notifications after reading the wording.
 *
 * IDEMPOTENT by unique `template_key`, exactly like the Seeder's own guard: a key that already
 * exists is skipped, so re-running this migration — or running it on a fresh install where the
 * seeder got there first — inserts nothing and changes nothing. In particular it never re-enables
 * or overwrites a template the admin has already edited or switched on. The version bump it
 * carries is also what makes {@see \Aponto\Installation\Installer::maybeUpgrade()} notice the
 * upgrade at all.
 */
final class Migration_0008_NoShowNotificationTemplate implements Migration {

	/**
	 * Template key this migration guarantees.
	 */
	private const KEY = 'booking_no_show_customer';

	/**
	 * Schema version this migration reaches.
	 */
	public function version(): int {
		return 8;
	}

	/**
	 * Insert the no-show template when it is missing.
	 *
	 * @param \wpdb $wpdb Database handle.
	 * @throws \RuntimeException When a read or write fails at the database layer.
	 */
	public function up( \wpdb $wpdb ): void {
		$table = $wpdb->prefix . 'aponto_notifications';

		foreach ( Seeder::templates() as $template ) {
			if ( self::KEY !== (string) $template['template_key'] ) {
				continue;
			}
			if ( $this->exists( $wpdb, $table, self::KEY ) ) {
				return;
			}

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- One-time seed insert; the existence guard above proved the key is absent.
			$inserted = $wpdb->insert( $table, $template, array( '%s', '%s', '%s', '%s', '%s', '%d' ) );
			if ( false === $inserted ) {
				throw new \RuntimeException( esc_html( sprintf( 'Aponto migration 0008: insert of %1$s failed: %2$s', self::KEY, $wpdb->last_error ) ) );
			}

			return;
		}
	}

	/**
	 * Postcondition: the no-show template exists.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function verify( \wpdb $wpdb ): bool {
		try {
			return $this->exists( $wpdb, $wpdb->prefix . 'aponto_notifications', self::KEY );
		} catch ( \RuntimeException $e ) {
			unset( $e );

			return false;
		}
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
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; key bound via prepare(); existence guard for an idempotent insert.
		$count = $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE template_key = %s", $key ) );
		if ( '' !== $wpdb->last_error ) {
			throw new \RuntimeException( esc_html( sprintf( 'Aponto migration 0008: read failed: %s', $wpdb->last_error ) ) );
		}

		return (int) $count > 0;
	}
}

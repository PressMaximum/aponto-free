<?php
/**
 * Migration 0006 — durable manage link in the customer cancellation email (D-R26).
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

use Aponto\Support\DatabaseEngine;

/**
 * Data migration (no DDL): adds a "View your booking: {manage_link}" line to
 * `booking_cancelled_customer`, so the cancellation email carries the same durable manage link as
 * every other customer lifecycle email (D-R26, founder-directed 2026-08-02). The link opens the
 * permanently READ-ONLY cancelled view (D-R25 revocation semantics) — hence "View", not "Manage".
 *
 * The line self-strips whenever the link cannot be rebuilt ({@see \Aponto\Notification\Placeholders}
 * treats `manage_link` as an optional-line key), which is what a legacy pre-D-R26 booking, an
 * erased booking, or a site without a derivation secret all fall back to.
 *
 * Upgrade-safe, exactly like {@see Migration_0005_CancelledRebookCopy}: the body is rewritten ONLY
 * when it still BINARY-matches the previous default (PHP `===`), so an admin edit is never
 * clobbered. A fresh install runs this pre-seed (no row) and changes nothing — the Seeder then
 * inserts the current default directly. Idempotent.
 */
final class Migration_0006_CancelledManageLinkCopy implements Migration {

	/**
	 * Template refreshed by this migration.
	 */
	private const KEY = 'booking_cancelled_customer';

	/**
	 * The previous default body (post-0005 — re-book line, no manage link).
	 */
	private const OLD = "Hi {customer_name},\n\nYour booking for {service_name} on {booking_date} at {booking_time} has been cancelled.\n\nReference: {order_code}\n\nBook again: {booking_page_link}\n\n{business_name}";

	/**
	 * The new default body — the durable manage link above the re-book line.
	 */
	private const NEW = "Hi {customer_name},\n\nYour booking for {service_name} on {booking_date} at {booking_time} has been cancelled.\n\nReference: {order_code}\nView your booking: {manage_link}\n\nBook again: {booking_page_link}\n\n{business_name}";

	/**
	 * Schema version this migration reaches.
	 */
	public function version(): int {
		return 6;
	}

	/**
	 * Rewrite the still-default cancellation body — as ONE conditional statement.
	 *
	 * Read-then-update would be a TOCTOU window: an admin saving their own copy between the SELECT
	 * and the UPDATE would have it silently clobbered by the migration. Matching on the body inside
	 * the UPDATE closes that — the row changes only while it still holds the superseded default,
	 * decided by the database at write time.
	 *
	 * The comparison must stay BYTE-EXACT (the same `===` philosophy {@see Migration_0005_CancelledRebookCopy}
	 * applies in PHP), and the two supported engines need different SQL for that (D-R20): the
	 * MySQL column collation is case-INsensitive, so a case-only admin edit would compare EQUAL to
	 * the default and be overwritten — `BINARY` prevents that; SQLite's default TEXT collation is
	 * already binary, and `BINARY` is not SQLite syntax.
	 *
	 * Zero affected rows is the normal, successful outcome for a fresh install (no row yet) and for
	 * a customised template — only a database-level failure throws.
	 *
	 * @param \wpdb $wpdb Database handle.
	 * @throws \RuntimeException When the write fails at the database layer.
	 */
	public function up( \wpdb $wpdb ): void {
		$table = $wpdb->prefix . 'aponto_notifications';
		$match = DatabaseEngine::isSqlite( $wpdb ) ? 'body = %s' : 'BINARY body = %s';
		$sql   = "UPDATE {$table} SET body = %s WHERE template_key = %s AND {$match}";

		$wpdb->flush();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; every value bound via prepare(); the WHERE is the atomic still-default guard.
		$updated = $wpdb->query( $wpdb->prepare( $sql, self::NEW, self::KEY, self::OLD ) );

		if ( false === $updated ) {
			throw new \RuntimeException( esc_html( sprintf( 'Aponto migration 0006: update failed: %s', $wpdb->last_error ) ) );
		}
	}

	/**
	 * Postcondition: the template no longer BINARY-matches the superseded default.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function verify( \wpdb $wpdb ): bool {
		$table = $wpdb->prefix . 'aponto_notifications';
		try {
			$current = $this->fetchBody( $wpdb, $table );
		} catch ( \RuntimeException $e ) {
			unset( $e );

			return false;
		}

		return null === $current || self::OLD !== $current;
	}

	/**
	 * Read the template body, distinguishing "row absent" (null) from a database error (throws).
	 *
	 * @param \wpdb  $wpdb  Database handle.
	 * @param string $table Fully-qualified table name.
	 * @throws \RuntimeException When the read fails at the database layer.
	 */
	private function fetchBody( \wpdb $wpdb, string $table ): ?string {
		$wpdb->flush();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; key bound via prepare(); fetched for a PHP binary comparison.
		$body = $wpdb->get_var( $wpdb->prepare( "SELECT body FROM {$table} WHERE template_key = %s", self::KEY ) );
		if ( '' !== $wpdb->last_error ) {
			throw new \RuntimeException( esc_html( sprintf( 'Aponto migration 0006: read failed: %s', $wpdb->last_error ) ) );
		}

		return null === $body ? null : (string) $body;
	}
}

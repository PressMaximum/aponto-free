<?php
/**
 * Migration 0004 — admin "new booking" contact copy (drop empty-phone artifact).
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
 * Data migration (no DDL): moves the customer phone in `booking_created_admin` onto its own line so
 * it disappears cleanly when the customer left no phone, instead of rendering the stray
 * "(email, )" the inline `({customer_email}, {customer_phone})` produced (fleet-r1 Fix 9a;
 * finding U3 BUG-08). The new "Phone: {customer_phone}" line self-strips because
 * {@see \Aponto\Notification\Placeholders} now treats `customer_phone` as an optional-line key.
 *
 * Upgrade-safe, exactly like {@see Migration_0002_NotificationCopy}: the body is rewritten ONLY
 * when it still BINARY-matches the previous default (PHP `===`), so an admin edit is never
 * clobbered. Fresh install runs pre-seed (no row) and changes nothing. Idempotent.
 */
final class Migration_0004_AdminContactCopy implements Migration {

	/**
	 * Template refreshed by this migration.
	 */
	private const KEY = 'booking_created_admin';

	/**
	 * The previous default body (post-0002).
	 */
	private const OLD = "A new booking was made.\n\nService: {service_name}\nStaff: {staff_name}\nWhen: {booking_date} {booking_time}\nCustomer: {customer_name} ({customer_email}, {customer_phone})\nReference: {order_code}";

	/**
	 * The new default body — phone on its own self-stripping line.
	 */
	private const NEW = "A new booking was made.\n\nService: {service_name}\nStaff: {staff_name}\nWhen: {booking_date} {booking_time}\nCustomer: {customer_name} ({customer_email})\nPhone: {customer_phone}\nReference: {order_code}";

	/**
	 * Schema version this migration reaches.
	 */
	public function version(): int {
		return 4;
	}

	/**
	 * Rewrite the still-default admin body.
	 *
	 * @param \wpdb $wpdb Database handle.
	 * @throws \RuntimeException When a read or write fails at the database layer.
	 */
	public function up( \wpdb $wpdb ): void {
		$table   = $wpdb->prefix . 'aponto_notifications';
		$current = $this->fetchBody( $wpdb, $table );
		if ( null === $current || self::OLD !== $current ) {
			return; // Missing (fresh install, pre-seed) or admin-edited — never touch.
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- One-time copy migration; the strict === guard above proved this row still holds the previous default.
		$updated = $wpdb->update(
			$table,
			array( 'body' => self::NEW ),
			array( 'template_key' => self::KEY ),
			array( '%s' ),
			array( '%s' )
		);
		if ( false === $updated ) {
			throw new \RuntimeException( esc_html( sprintf( 'Aponto migration 0004: update failed: %s', $wpdb->last_error ) ) );
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
			throw new \RuntimeException( esc_html( sprintf( 'Aponto migration 0004: read failed: %s', $wpdb->last_error ) ) );
		}

		return null === $body ? null : (string) $body;
	}
}

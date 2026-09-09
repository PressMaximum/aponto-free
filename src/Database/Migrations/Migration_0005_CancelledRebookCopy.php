<?php
/**
 * Migration 0005 — re-book CTA in the customer cancellation email (A4).
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
 * Data migration (no DDL): adds a "Book again: {booking_page_link}" line to
 * `booking_cancelled_customer` so a cancelled customer can rebook in one click (A4 — U4). The line
 * self-strips when no booking page is configured ({@see \Aponto\Notification\Placeholders} treats
 * `booking_page_link` as an optional-line key).
 *
 * Upgrade-safe, exactly like {@see Migration_0002_NotificationCopy} / {@see Migration_0004_AdminContactCopy}:
 * the body is rewritten ONLY when it still BINARY-matches the previous default (PHP `===`), so an
 * admin edit is never clobbered. A fresh install runs this pre-seed (no row) and changes nothing —
 * the Seeder then inserts the current default directly. Idempotent.
 */
final class Migration_0005_CancelledRebookCopy implements Migration {

	/**
	 * Template refreshed by this migration.
	 */
	private const KEY = 'booking_cancelled_customer';

	/**
	 * The previous default body (post-0002 — no re-book line).
	 */
	private const OLD = "Hi {customer_name},\n\nYour booking for {service_name} on {booking_date} at {booking_time} has been cancelled.\n\nReference: {order_code}\n\n{business_name}";

	/**
	 * The new default body — a self-stripping "Book again" line before the sign-off.
	 */
	private const NEW = "Hi {customer_name},\n\nYour booking for {service_name} on {booking_date} at {booking_time} has been cancelled.\n\nReference: {order_code}\n\nBook again: {booking_page_link}\n\n{business_name}";

	/**
	 * Schema version this migration reaches.
	 */
	public function version(): int {
		return 5;
	}

	/**
	 * Rewrite the still-default cancellation body.
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

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- One-time copy migration; the strict === guard above proved this row still holds the previous default.
		$updated = $wpdb->update(
			$table,
			array( 'body' => self::NEW ),
			array( 'template_key' => self::KEY ),
			array( '%s' ),
			array( '%s' )
		);
		if ( false === $updated ) {
			throw new \RuntimeException( esc_html( sprintf( 'Aponto migration 0005: update failed: %s', $wpdb->last_error ) ) );
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
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; key bound via prepare(); fetched for a PHP binary comparison.
		$body = $wpdb->get_var( $wpdb->prepare( "SELECT body FROM {$table} WHERE template_key = %s", self::KEY ) );
		if ( '' !== $wpdb->last_error ) {
			throw new \RuntimeException( esc_html( sprintf( 'Aponto migration 0005: read failed: %s', $wpdb->last_error ) ) );
		}

		return null === $body ? null : (string) $body;
	}
}

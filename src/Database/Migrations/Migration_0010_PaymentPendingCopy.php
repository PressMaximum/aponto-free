<?php
/**
 * Migration 0010 — a payable link in the payment reminder (PR-A.3).
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
 * Data migration (no DDL): adds a "Pay now: {payment_link}" line to `payment_pending_customer`.
 *
 * The reminder shipped with `{manage_link}` and nothing else, which made it very nearly useless:
 * the manage page could show a hold but offered no way to pay for it, and the widget could only
 * resume a hold out of `sessionStorage` — i.e. only in the tab that created it, which is the one
 * tab a customer who needs reminding has already closed. `{payment_link}` is the booking page plus
 * `#aponto_resume={token}` (the FRAGMENT since D-R39c, Codex A.10), the one URL that reaches a
 * payment form.
 *
 * The line self-strips when the site has no published booking page ({@see \Aponto\Notification\Placeholders}
 * treats `payment_link` as an optional-line key), so a site that has not configured one keeps
 * exactly the email it has today, manage link included.
 *
 * Upgrade-safe by the same rule as {@see Migration_0006_CancelledManageLinkCopy}: the body is
 * rewritten ONLY while it still BINARY-matches the previous default, so an admin edit is never
 * clobbered, and the match happens inside the UPDATE so there is no read-then-write window. A fresh
 * install runs this pre-seed (no row) and changes nothing — the Seeder inserts the current default.
 * Idempotent.
 */
final class Migration_0010_PaymentPendingCopy implements Migration {

	/**
	 * Template refreshed by this migration.
	 */
	private const KEY = 'payment_pending_customer';

	/**
	 * The previous default body (D-R38 seed — manage link only).
	 */
	private const OLD = "Hi {customer_name},\n\nWe are holding your appointment for {service_name} on {booking_date} at {booking_time}, but we have not received your payment yet.\n\nAmount due: {amount_due}\nReference: {order_code}\nPlease complete your payment by {payment_deadline}\nManage your booking: {manage_link}\n\nIf we do not receive it in time the slot is released automatically.\n\n{business_name}";

	/**
	 * The new default body — the payable link above the manage link.
	 */
	private const NEW = "Hi {customer_name},\n\nWe are holding your appointment for {service_name} on {booking_date} at {booking_time}, but we have not received your payment yet.\n\nAmount due: {amount_due}\nReference: {order_code}\nPlease complete your payment by {payment_deadline}\nPay now: {payment_link}\nManage your booking: {manage_link}\n\nIf we do not receive it in time the slot is released automatically.\n\n{business_name}";

	/**
	 * Schema version this migration reaches.
	 */
	public function version(): int {
		return 10;
	}

	/**
	 * Rewrite the still-default reminder body as ONE conditional statement.
	 *
	 * `BINARY` on MySQL because that column's collation is case-insensitive, so a case-only admin
	 * edit would otherwise compare equal to the default and be overwritten; SQLite's TEXT collation
	 * is already binary and has no such keyword (D-R20).
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
			throw new \RuntimeException( esc_html( sprintf( 'Aponto migration 0010: update failed: %s', $wpdb->last_error ) ) );
		}
	}

	/**
	 * Postcondition: the template no longer BINARY-matches the superseded default.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function verify( \wpdb $wpdb ): bool {
		$table = $wpdb->prefix . 'aponto_notifications';
		$wpdb->flush();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; key bound via prepare(); fetched for a PHP binary comparison.
		$body = $wpdb->get_var( $wpdb->prepare( "SELECT body FROM {$table} WHERE template_key = %s", self::KEY ) );
		if ( '' !== $wpdb->last_error ) {
			return false;
		}

		return null === $body || self::OLD !== (string) $body;
	}
}

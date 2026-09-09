<?php
/**
 * Migration 0002 — refresh unmodified notification copy.
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
 * Data migration (no DDL): brings the seeded notification bodies in line with the pre-beta copy
 * revision — the `{booking_time}` placeholder now folds the friendly timezone label in (SPEC-P1
 * §3.3), so the redundant trailing `({booking_timezone})` is removed from the customer/admin
 * templates that carried it, and `booking_cancelled_admin` gains a `Reason: {cancel_reason}` line
 * (the line drops itself when empty via {@see \Aponto\Notification\Placeholders}).
 *
 * Upgrade-safe: a body is rewritten ONLY when it still BINARY-matches the exact previous default —
 * the row is fetched and compared with PHP `===` (Codex review item 2), never through a SQL `WHERE
 * body =` whose collation-insensitive comparison would treat a case/accent-only admin edit as the
 * default and overwrite it. On a fresh install the table is still empty when this runs (migrations
 * precede {@see \Aponto\Installation\Seeder}), so nothing matches and the Seeder inserts the
 * current defaults directly. Idempotent: re-running finds the new body, which no longer matches
 * the old default, and changes nothing.
 *
 * Fail-safe (Codex review item 4): every read and write checks the wpdb result and THROWS on a
 * database error, so the Migrator records the failure and never bumps the schema version — the
 * next request retries.
 */
final class Migration_0002_NotificationCopy implements Migration {

	/**
	 * Schema version this migration reaches.
	 */
	public function version(): int {
		return 2;
	}

	/**
	 * Rewrite each still-default template body to its new default.
	 *
	 * @param \wpdb $wpdb Database handle.
	 * @throws \RuntimeException When a read or write fails at the database layer.
	 */
	public function up( \wpdb $wpdb ): void {
		$table = $wpdb->prefix . 'aponto_notifications';

		foreach ( self::revisions() as $revision ) {
			$current = $this->fetchBody( $wpdb, $table, $revision['key'] );
			if ( null === $current || $revision['old'] !== $current ) {
				continue; // Missing (fresh install, pre-seed) or admin-edited — never touch.
			}

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- One-time copy migration; the strict === guard above already proved this row still holds the previous default.
			$updated = $wpdb->update(
				$table,
				array( 'body' => $revision['new'] ),
				array( 'template_key' => $revision['key'] ),
				array( '%s' ),
				array( '%s' )
			);
			if ( false === $updated ) {
				throw new \RuntimeException( esc_html( sprintf( 'Aponto migration 0002: update failed for %s: %s', $revision['key'], $wpdb->last_error ) ) );
			}
		}
	}

	/**
	 * Postcondition: no template still BINARY-matches a superseded default body (every unmodified
	 * row was refreshed). Rows an admin edited — including case/accent-only edits — never
	 * strict-match an old default, so they are correctly ignored. A read error fails verification,
	 * keeping the version un-bumped for a retry.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function verify( \wpdb $wpdb ): bool {
		$table = $wpdb->prefix . 'aponto_notifications';

		foreach ( self::revisions() as $revision ) {
			try {
				$current = $this->fetchBody( $wpdb, $table, $revision['key'] );
			} catch ( \RuntimeException $e ) {
				unset( $e );

				return false; // Unreadable state never verifies (no version bump; retried later).
			}

			if ( null !== $current && $revision['old'] === $current ) {
				return false; // A row still carries the superseded default — up() did not land.
			}
		}

		return true;
	}

	/**
	 * Read one template body for the strict comparison, distinguishing "row absent" (null) from a
	 * database error (throws).
	 *
	 * @param \wpdb  $wpdb  Database handle.
	 * @param string $table Fully-qualified table name.
	 * @param string $key   Template key.
	 * @throws \RuntimeException When the read fails at the database layer.
	 */
	private function fetchBody( \wpdb $wpdb, string $table, string $key ): ?string {
		$wpdb->flush(); // Clears any stale last_error so the check below sees only THIS read.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; key bound via prepare(); fetched for a PHP binary comparison.
		$body = $wpdb->get_var( $wpdb->prepare( "SELECT body FROM {$table} WHERE template_key = %s", $key ) );
		if ( '' !== $wpdb->last_error ) {
			throw new \RuntimeException( esc_html( sprintf( 'Aponto migration 0002: read failed for %s: %s', $key, $wpdb->last_error ) ) );
		}

		return null === $body ? null : (string) $body;
	}

	/**
	 * The old→new body revisions for this release, keyed by template. Both strings are frozen here
	 * (never read from the Seeder) so the migration stays a stable historical record.
	 *
	 * @return list<array{key:string, old:string, new:string}>
	 */
	private static function revisions(): array {
		return array(
			array(
				'key' => 'booking_received_customer',
				'old' => "Hi {customer_name},\n\nWe received your booking for {service_name} on {booking_date} at {booking_time} ({booking_timezone}).\n\nYour reference is {order_code}.\nManage your booking: {manage_link}\n\n{business_name}",
				'new' => "Hi {customer_name},\n\nWe received your booking for {service_name} on {booking_date} at {booking_time}.\n\nYour reference is {order_code}.\nManage your booking: {manage_link}\n\n{business_name}",
			),
			array(
				'key' => 'booking_confirmed_customer',
				'old' => "Hi {customer_name},\n\nYour booking for {service_name} with {staff_name} on {booking_date} at {booking_time} ({booking_timezone}) is confirmed.\n\nReference: {order_code}\nManage your booking: {manage_link}\n\n{business_name}",
				'new' => "Hi {customer_name},\n\nYour booking for {service_name} with {staff_name} on {booking_date} at {booking_time} is confirmed.\n\nReference: {order_code}\nManage your booking: {manage_link}\n\n{business_name}",
			),
			array(
				'key' => 'booking_rescheduled_customer',
				'old' => "Hi {customer_name},\n\nYour booking for {service_name} has been rescheduled to {booking_date} at {booking_time} ({booking_timezone}).\n\nReference: {order_code}\nManage your booking: {manage_link}\n\n{business_name}",
				'new' => "Hi {customer_name},\n\nYour booking for {service_name} has been rescheduled to {booking_date} at {booking_time}.\n\nReference: {order_code}\nManage your booking: {manage_link}\n\n{business_name}",
			),
			array(
				'key' => 'booking_created_admin',
				'old' => "A new booking was made.\n\nService: {service_name}\nStaff: {staff_name}\nWhen: {booking_date} {booking_time} ({booking_timezone})\nCustomer: {customer_name} ({customer_email}, {customer_phone})\nReference: {order_code}",
				'new' => "A new booking was made.\n\nService: {service_name}\nStaff: {staff_name}\nWhen: {booking_date} {booking_time}\nCustomer: {customer_name} ({customer_email}, {customer_phone})\nReference: {order_code}",
			),
			array(
				'key' => 'booking_cancelled_admin',
				'old' => "A booking was cancelled.\n\nService: {service_name}\nWhen: {booking_date} {booking_time}\nCustomer: {customer_name} ({customer_email})\nReference: {order_code}",
				'new' => "A booking was cancelled.\n\nService: {service_name}\nWhen: {booking_date} {booking_time}\nCustomer: {customer_name} ({customer_email})\nReference: {order_code}\nReason: {cancel_reason}",
			),
		);
	}
}

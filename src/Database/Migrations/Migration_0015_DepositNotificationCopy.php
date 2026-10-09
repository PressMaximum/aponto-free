<?php
/**
 * Migration 0015 — deposit summaries in untouched customer templates.
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

/** Atomic binary matches preserve every customised template, including case-only edits. */
final class Migration_0015_DepositNotificationCopy implements Migration {
	/** Frozen pre-deposit customer defaults. */
	private const OLD = array(
		'booking_received_customer'    => "Hi {customer_first_name},\n\nWe received your booking for {service_name} on {booking_date} at {booking_time}.\n\nYour reference is {order_code}.\nManage your booking: {manage_link}\n\n{business_name}",
		'booking_confirmed_customer'   => "Hi {customer_first_name},\n\nYour booking for {service_name} with {staff_name} on {booking_date} at {booking_time} is confirmed.\n\nReference: {order_code}\nManage your booking: {manage_link}\n\n{business_name}",
		'booking_rescheduled_customer' => "Hi {customer_first_name},\n\nYour booking for {service_name} has been rescheduled to {booking_date} at {booking_time}.\n\nReference: {order_code}\nManage your booking: {manage_link}\n\n{business_name}",
		'booking_cancelled_customer'   => "Hi {customer_first_name},\n\nYour booking for {service_name} on {booking_date} at {booking_time} has been cancelled.\n\nReference: {order_code}\nView your booking: {manage_link}\n\nBook again: {booking_page_link}\n\n{business_name}",
		'booking_completed_customer'   => "Hi {customer_first_name},\n\nThank you for choosing {service_name}. We hope to see you again.\n\n{business_name}",
		'booking_reminder_customer'    => "Hi {customer_first_name},\n\nThis is a reminder for your booking for {service_name} on {booking_date} at {booking_time}.\n\nReference: {order_code}\nManage your booking: {manage_link}\n\n{business_name}",
		'booking_no_show_customer'     => "Hi {customer_first_name},\n\nWe had you down for {service_name} on {booking_date} at {booking_time}, but we did not get to see you.\n\nReference: {order_code}\n\nBook again: {booking_page_link}\n\n{business_name}",
		'payment_pending_customer'     => "Hi {customer_first_name},\n\nWe are holding your appointment for {service_name} on {booking_date} at {booking_time}, but we have not received your payment yet.\n\nAmount due: {amount_due}\nReference: {order_code}\nPlease complete your payment by {payment_deadline}\nPay now: {payment_link}\nManage your booking: {manage_link}\n\nIf we do not receive it in time the slot is released automatically.\n\n{business_name}",
		'payment_refunded_customer'    => "Hi {customer_first_name},\n\nWe have refunded {refund_amount} for your booking of {service_name} on {booking_date}.\n\nReference: {order_code}\nPayment status: {payment_status}\n\nDepending on your bank, it can take a few days for the money to appear.\n\n{business_name}",
	);

	/** Schema version reached. */
	public function version(): int {
		return 15;
	}

	/**
	 * Add the optional paragraph only while the body still matches its shipped default.
	 *
	 * @param \wpdb $wpdb Database handle.
	 * @throws \RuntimeException When a write fails.
	 */
	public function up( \wpdb $wpdb ): void {
		$match = DatabaseEngine::isSqlite( $wpdb ) ? 'body = %s' : 'BINARY body = %s';
		foreach ( self::OLD as $key => $old ) {
			$new = str_replace( "\n\n{business_name}", "\n\n{payment_summary}\n\n{business_name}", $old );
			$wpdb->flush();
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber -- Match is a constant dialect fragment; identifiers and values are prepared.
			$result = $wpdb->query( $wpdb->prepare( "UPDATE %i SET body = %s WHERE template_key = %s AND {$match}", $wpdb->prefix . 'aponto_notifications', $new, $key, $old ) );
			if ( false === $result ) {
				throw new \RuntimeException( 'Aponto migration 0015: notification copy update failed.' );
			}
		}
	}

	/**
	 * No untouched old default remains; custom bodies and missing seed rows are valid.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function verify( \wpdb $wpdb ): bool {
		foreach ( self::OLD as $key => $old ) {
			$wpdb->flush();
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Migration verification.
			$body = $wpdb->get_var( $wpdb->prepare( 'SELECT body FROM %i WHERE template_key = %s', $wpdb->prefix . 'aponto_notifications', $key ) );
			if ( '' !== $wpdb->last_error || $body === $old ) {
				return false;
			}
		}
		return true;
	}
}

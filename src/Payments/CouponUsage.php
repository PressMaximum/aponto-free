<?php
/**
 * Idempotent per-order release of a coupon use (D-R67d).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Payments;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Database\StorageException;
use Aponto\Support\Clock;

/**
 * Hands one coupon use back for an order — ONLY on the two system paths the founder named
 * (D-R67d, 2026-09-23): a pay-online hold that EXPIRED unpaid (`payment_hold_expired`), and an
 * admin HARD DELETE of the booking. A customer or admin cancellation and a refund keep the use:
 * the booking happened and the discount was granted.
 *
 * Core, not module, code: the counter and the order snapshot are core schema in both editions
 * (D-R67), so a site that downgraded to Free still expires holds and deletes bookings correctly.
 * Names no module class.
 *
 * Atomic and idempotent: the caller runs this inside its own write transaction; the order row's
 * `coupon_released_at` stamp is a compare-and-set (`IS NULL` → now), so a second call for the same
 * order changes nothing, and the counter decrement is guarded with `usage_count > 0`, so it can
 * never go below zero.
 */
final class CouponUsage {

	/**
	 * Construct.
	 *
	 * @param \wpdb $wpdb  Database handle.
	 * @param Clock $clock Clock.
	 */
	public function __construct(
		private \wpdb $wpdb,
		private Clock $clock
	) {}

	/**
	 * Release the order's coupon use once.
	 *
	 * @param int $order_id Order id.
	 * @return bool Whether a use was handed back by THIS call.
	 * @throws StorageException When a write fails (the caller rolls back).
	 */
	public function releaseForOrder( int $order_id ): bool {
		if ( $order_id < 1 ) {
			return false;
		}
		$orders = $this->wpdb->prefix . 'aponto_orders';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Constant table; id bound.
		$coupon_id = (int) $this->wpdb->get_var( $this->wpdb->prepare( "SELECT coupon_id FROM {$orders} WHERE id = %d AND coupon_id IS NOT NULL AND coupon_released_at IS NULL", $order_id ) );
		if ( $coupon_id < 1 ) {
			return false;
		}

		$now = $this->clock->nowSql();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Constant table; values bound; compare-and-set stamp.
		$stamped = $this->wpdb->query( $this->wpdb->prepare( "UPDATE {$orders} SET coupon_released_at = %s WHERE id = %d AND coupon_id = %d AND coupon_released_at IS NULL", $now, $order_id, $coupon_id ) );
		if ( false === $stamped ) {
			// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Factory sanitizes database diagnostics for an internal exception.
			throw StorageException::fromWpdb( $this->wpdb, 'coupon release stamp' );
		}
		if ( 1 !== (int) $stamped ) {
			return false;
		}

		$coupons = $this->wpdb->prefix . 'aponto_coupons';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Constant table; values bound; never below zero.
		$released = $this->wpdb->query( $this->wpdb->prepare( "UPDATE {$coupons} SET usage_count = usage_count - 1, updated_at = %s WHERE id = %d AND usage_count > 0", $now, $coupon_id ) );
		if ( false === $released ) {
			// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Factory sanitizes database diagnostics for an internal exception.
			throw StorageException::fromWpdb( $this->wpdb, 'coupon release' );
		}

		// A deleted coupon or a counter already at zero leaves nothing to decrement; the stamp still
		// records that this order's use is settled, so no later path retries it.
		return 1 === (int) $released;
	}

	/**
	 * Release the coupon use of the order behind a booking once.
	 *
	 * @param int $booking_id Booking id.
	 * @return bool Whether a use was handed back.
	 * @throws StorageException When a write fails.
	 */
	public function releaseForBooking( int $booking_id ): bool {
		$items = $this->wpdb->prefix . 'aponto_order_items';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Constant table; id bound.
		$order_id = (int) $this->wpdb->get_var( $this->wpdb->prepare( "SELECT order_id FROM {$items} WHERE booking_id = %d AND item_type = 'booking' ORDER BY order_id ASC LIMIT 1", $booking_id ) );

		return $this->releaseForOrder( $order_id );
	}
}

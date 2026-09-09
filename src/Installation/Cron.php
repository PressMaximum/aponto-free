<?php
/**
 * Cleanup cron wiring.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Installation;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * The hourly `aponto_cleanup` event (§6.4.7): prunes idempotency/deliveries/rate-counter/orphan
 * rows, auto-cancels stale pending bookings, anonymizes per the retention window, and retries failed
 * notifications, then fires `aponto_cleanup_tick` for extensions.
 */
final class Cron {

	/**
	 * Cron hook name.
	 */
	public const HOOK = 'aponto_cleanup';

	/**
	 * Schedule the hourly cleanup event if not already scheduled (idempotent).
	 */
	public static function schedule(): void {
		if ( false === wp_next_scheduled( self::HOOK ) ) {
			wp_schedule_event( time(), 'hourly', self::HOOK );
		}
	}

	/**
	 * Clear the scheduled cleanup event.
	 */
	public static function clear(): void {
		wp_clear_scheduled_hook( self::HOOK );
	}

	/**
	 * Cleanup handler — runs the real housekeeping pass, then fires the extension tick.
	 */
	public static function run(): void {
		( new CleanupRunner( \Aponto\Rest\Bootstrap::services() ) )->run();

		/**
		 * Fires after the hourly core cleanup pass. Extensions may hook additional housekeeping here.
		 */
		do_action( 'aponto_cleanup_tick' );
	}
}

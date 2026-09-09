<?php
/**
 * The connection projection's own janitor (Codex round 9, item 1).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Integration;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * A single-shot cron event that reconciles the autoloaded connection projection against the
 * authoritative `aponto_staff_meta` rows, and re-books itself while it cannot finish.
 *
 * ### Why this is not the integrations tick
 *
 * It used to be. The tick is CONNECTION-DRIVEN: {@see RemoteEventSync::syncSchedule()} schedules it
 * while a connection exists and CLEARS it when none does. That is right for a retry queue and fatal
 * for a cleanup — the moment the last integration is uninstalled, `hasAnyConnection()` answers false
 * (a purge-pending module is filtered out of that read by design) and the next `init` cancels the
 * very event booked to remove the staff member's account email from the option. The cleanup was
 * unscheduled by the condition that created the work.
 *
 * So the janitor gets its own hook, which nothing else may cancel, and the tick's opportunistic
 * sweep becomes an optimisation rather than the mechanism.
 *
 * ### Why it does not trust the marker
 *
 * {@see ConnectionStore::reconcileProjection()} derives the work from the ROWS — a projection slice
 * whose module has no connection rows left is an orphan whatever any marker says — so a marker that
 * was lost to a race or a storage failure cannot leave PII behind. The marker remains as a fast
 * path: it hides the slice from readers the instant an uninstall defers, long before this runs.
 */
final class ProjectionPurge {

	/**
	 * The dedicated hook. Deliberately NOT {@see RemoteEventSync::TICK_HOOK} — see the class docblock.
	 */
	public const HOOK = 'aponto_integrations_purge';

	/**
	 * Seconds before the first attempt, doubled at each contended retry.
	 */
	private const DELAY = 60;

	/**
	 * How many contended attempts are re-booked before the deadline is forfeited.
	 */
	private const MAX_ATTEMPTS = 6;

	/**
	 * Transient counting consecutive attempts that could not finish.
	 */
	private const ATTEMPTS = 'aponto_integration_purge_sweeps';

	/**
	 * Attach the handler.
	 */
	public static function register(): void {
		add_action( self::HOOK, array( self::class, 'run' ) );
	}

	/**
	 * Book a reconcile, unless one is already booked.
	 *
	 * Cheap and idempotent, which is what lets every caller ask for it without coordinating: an
	 * uninstall books it whether or not its marker write succeeded, precisely because the reconcile
	 * does not depend on that marker.
	 *
	 * @param int $delay Seconds from now.
	 */
	public static function schedule( int $delay = self::DELAY ): void {
		if ( false !== wp_next_scheduled( self::HOOK ) ) {
			return;
		}

		wp_schedule_single_event( time() + max( 1, $delay ), self::HOOK );
	}

	/**
	 * Cron entry point: reconcile, and re-book with backoff while the work is not done.
	 *
	 * BOUNDED. A lock this cannot take is a site under sustained contention, not a site that will
	 * never settle, and every ordinary projection write reconciles the same state anyway. Giving up
	 * after the ladder forfeits a deadline, not the cleanup.
	 */
	public static function run(): void {
		if ( ConnectionStore::make()->reconcileProjection() ) {
			delete_transient( self::ATTEMPTS );

			return;
		}

		$attempts = (int) get_transient( self::ATTEMPTS );
		if ( $attempts >= self::MAX_ATTEMPTS ) {
			return;
		}

		set_transient( self::ATTEMPTS, $attempts + 1, DAY_IN_SECONDS );
		self::schedule( self::DELAY * ( 2 ** $attempts ) );
	}

	/**
	 * Drop the booking and its backoff counter (full-plugin uninstall only).
	 *
	 * Deliberately NOT called on a module uninstall or on deactivation: a module uninstall is what
	 * CREATES this work, and a deactivated plugin simply does not fire the hook until it is active
	 * again — at which point the reconcile is still the right thing to run.
	 */
	public static function clearSchedule(): void {
		wp_clear_scheduled_hook( self::HOOK );
		delete_transient( self::ATTEMPTS );
	}
}

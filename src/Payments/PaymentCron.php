<?php
/**
 * The payments tick — hold expiry and the hold reminder (D-R38g/j).
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

/**
 * One core cron event, `aponto_payments_tick`, running every five minutes while — and only while —
 * an unpaid hold exists.
 *
 * ### Why it is NOT scheduled from `init`
 *
 * {@see \Aponto\Integration\RemoteEventSync::syncSchedule()} re-evaluates its condition on `init`,
 * which is free there because "is anyone connected" is one autoloaded option read. The equivalent
 * question here — "does any order hold an unpaid slot" — is a COUNT over `aponto_orders`, and
 * putting that on every front-end request to decide a cron schedule would be a real cost paid by
 * every visitor to save a scheduling call. So the schedule is EVENT-DRIVEN instead:
 * {@see self::arm()} runs when a hold is created, {@see self::syncSchedule()} runs at the end of
 * every tick (which is when a hold can have been the last one), and the hourly core cleanup calls it
 * once more as a backstop.
 *
 * That backstop is the D-R34g lesson taken seriously: a janitor whose only trigger is the condition
 * it exists to clear will be cancelled exactly when it is needed. Here the tick's trigger and its
 * work are the same thing — holds — so the failure mode is a hold created by a request that then
 * died before arming, or one committed in the instant between a tick reading "no work" and clearing
 * the hook. Three things close it, and all three are needed: {@see self::syncSchedule()} unschedules
 * only on a WIDE predicate that counts recent orders and in-flight charges as work,
 * {@see self::arm()} re-checks once after scheduling, and the hourly `aponto_cleanup` runs BOTH
 * `syncSchedule()` and an expiry pass — so even a hold that lost every race is released within the
 * hour. Nothing else may unschedule this hook.
 */
final class PaymentCron {

	/**
	 * The payments cron event.
	 */
	public const TICK_HOOK = 'aponto_payments_tick';

	/**
	 * Five-minute schedule slug (shared name; the interval is identical wherever it is declared).
	 */
	public const SCHEDULE = 'aponto_five_minutes';

	/**
	 * Schedule interval in seconds.
	 */
	private const INTERVAL = 300;

	/**
	 * Maximum holds released per tick.
	 */
	private const EXPIRY_BATCH = 100;

	/**
	 * Maximum reminders queued per tick.
	 */
	private const REMINDER_BATCH = 50;

	/**
	 * How recently an order must have been created to keep the tick armed on its own, in minutes.
	 *
	 * This is the width of the unschedule race (orchestrator finding): a tick that reads "no work"
	 * can be overtaken by a request committing a hold before it clears the hook, and that hold's
	 * order is newer than this cutoff at the moment of the clear.
	 */
	private const RECENT_ORDER_MINUTES = 10;

	/**
	 * Maximum stale refunds reconciled per tick (Codex J).
	 */
	private const REFUND_BATCH = 20;

	/**
	 * The advisory lock that serializes schedule mutation (Codex L).
	 *
	 * `arm()` and `syncSchedule()` both read `wp_next_scheduled()` and then write, which is a
	 * read-modify-write on shared state — and the two run from different processes at exactly the
	 * moment that matters: a request committing a hold while a tick decides there is no work left.
	 * Holding a short named lock across BOTH halves is what makes "is it scheduled?" and "schedule
	 * it" one decision instead of two.
	 */
	public const SCHEDULE_LOCK = 'apt:pay:schedule';

	/**
	 * Seconds to wait for the schedule lock. Short: the work under it is two option reads and a
	 * write, and neither caller may block a request or a cron pass for long.
	 */
	private const SCHEDULE_LOCK_TIMEOUT = 2;

	/**
	 * Wire the schedule declaration and the tick handler.
	 */
	public static function register(): void {
		add_filter( 'cron_schedules', array( self::class, 'addSchedule' ) ); // phpcs:ignore WordPress.WP.CronInterval.ChangeDetected -- A held slot must be released promptly after its deadline; an hourly tick would keep a paid-out customer's slot blocked for up to an hour. The tick no-ops in one COUNT when nothing is held, and is unscheduled entirely while no hold exists.
		add_action( self::TICK_HOOK, array( self::class, 'runTick' ) );
	}

	/**
	 * Declare the five-minute schedule if nothing else already did.
	 *
	 * Add-if-absent rather than assignment, because the premium reminders module declares the same
	 * slug with the same interval; whoever runs first wins and the result is identical.
	 *
	 * @param mixed $schedules Registered cron schedules.
	 * @return mixed
	 */
	public static function addSchedule( $schedules ) {
		if ( ! is_array( $schedules ) ) {
			return $schedules;
		}
		if ( ! isset( $schedules[ self::SCHEDULE ] ) ) {
			$schedules[ self::SCHEDULE ] = array(
				'interval' => self::INTERVAL,
				'display'  => self::scheduleLabel(),
			);
		}

		return $schedules;
	}

	/**
	 * The schedule's display name — translated only once WordPress can load translations.
	 *
	 * `cron_schedules` is filtered whenever anything calls `wp_get_schedules()`, and a plugin
	 * installer may do that BEFORE `init` (WooCommerce's does, on activation). Translating there
	 * makes WordPress 6.7+ load the `aponto` text domain "just in time" and log
	 * `_load_textdomain_just_in_time was called incorrectly` (persona QA 2026-10-05, T-090 — seen
	 * by all three testers). The label is display-only (Tools → Cron screens), so before `init`
	 * the English source string is returned as it is; every later read is translated.
	 */
	private static function scheduleLabel(): string {
		if ( ! did_action( 'init' ) && ! doing_action( 'init' ) ) {
			return 'Every five minutes (Aponto)';
		}

		return __( 'Every five minutes (Aponto)', 'aponto' );
	}

	/**
	 * Ensure the tick is scheduled — called when a hold is created.
	 *
	 * Cheap and idempotent: one `wp_next_scheduled()` read, and nothing at all once the event exists.
	 */
	public static function arm(): void {
		// WordPress refuses an unknown schedule name, and this method also runs from contexts that
		// never called `register()` (WP-CLI, a test, a REST request on a site where another plugin
		// short-circuited the filter). Declaring it here makes scheduling work wherever it is
		// invoked from; WordPress de-duplicates an identical static callback, so a second add is free.
		add_filter( 'cron_schedules', array( self::class, 'addSchedule' ) ); // phpcs:ignore WordPress.WP.CronInterval.ChangeDetected -- Same five-minute schedule declared in register(); see that call site.

		// SERIALIZED (Codex L). Without the lock, arm's read and sync's clear interleave: arm sees the
		// hook still scheduled and returns, sync then clears it, and the hold this request just
		// created has no owner. Retried ONCE on contention — the holder is doing the same two option
		// operations and will be gone in milliseconds — and then logged rather than looped, because a
		// missed arm is recovered by the hourly safety net while a spin is not.
		for ( $attempt = 0; $attempt < 2; $attempt++ ) {
			$lock = self::scheduleLock();
			if ( ! $lock->acquire( self::SCHEDULE_LOCK_TIMEOUT ) ) {
				continue;
			}
			try {
				if ( false === wp_next_scheduled( self::TICK_HOOK ) ) {
					wp_schedule_event( time(), self::SCHEDULE, self::TICK_HOOK );
				}
			} finally {
				$lock->release();
			}

			return;
		}

		self::logScheduleContention( 'arm' );
	}

	/**
	 * The advisory lock guarding schedule mutation.
	 */
	private static function scheduleLock(): \Aponto\Database\Lock {
		global $wpdb;

		return ( new \Aponto\Database\LockFactory( $wpdb ) )->named( self::SCHEDULE_LOCK );
	}

	/**
	 * Record that a schedule operation could not take its lock.
	 *
	 * @param string $operation `arm` or `sync`.
	 */
	private static function logScheduleContention( string $operation ): void {
		$logger = new \Aponto\Support\Logger( new \Aponto\Support\Settings(), new \Aponto\Support\Clock() );
		$logger->log(
			'aponto_payment_anomaly',
			'error',
			'Payment anomaly detected.',
			array(
				'gateway'  => '',
				'order_id' => 0,
				'code'     => 'schedule_lock_' . $operation,
				'kind'     => 'charge',
			)
		);
	}

	/**
	 * Schedule or unschedule the tick from the CURRENT state of the orders table.
	 *
	 * Runs at the end of every tick and once an hour from the core cleanup — never on a page load.
	 *
	 * @param PaymentService|null $service Service (built from the REST graph when omitted).
	 */
	public static function syncSchedule( ?PaymentService $service = null ): void {
		unset( $service );

		global $wpdb;
		$clock  = new \Aponto\Support\Clock();
		$orders = new \Aponto\Booking\Repository\OrderRepository( $wpdb, new \Aponto\Booking\TokenGenerator(), $clock );

		// SERIALIZED, and the predicate is read AFTER the lock is taken (Codex L). Reading it first
		// and then locking would leave the same race the lock exists to close, one step further in:
		// the answer would already be stale by the time the write happened.
		$lock = self::scheduleLock();
		if ( ! $lock->acquire( self::SCHEDULE_LOCK_TIMEOUT ) ) {
			// SKIP the unschedule on contention. Somebody else is mutating the schedule right now, and
			// the only irreversible half of this decision is the clear — declining to make it costs
			// one query every five minutes, while making it wrongly strands a live hold.
			self::logScheduleContention( 'sync' );

			return;
		}

		try {
			$scheduled = false !== wp_next_scheduled( self::TICK_HOOK );

			try {
				// WIDE predicate (orchestrator finding): a live hold, an in-flight charge, OR a recent
				// payment-relevant order. Unscheduling is the only irreversible half of this decision,
				// so it takes the strictest evidence that there is genuinely nothing left to do.
				$now    = $clock->now();
				$wanted = $orders->hasOpenPaymentWork(
					$now->sub( new \DateInterval( 'PT' . self::RECENT_ORDER_MINUTES . 'M' ) )->format( 'Y-m-d H:i:s' ),
					$now->format( 'Y-m-d H:i:s' )
				);
			} catch ( \Throwable $failure ) {
				unset( $failure );

				// Unknown is NOT "no work": leaving the tick scheduled costs one query every five
				// minutes, while unscheduling it on a failed read strands every live hold indefinitely.
				return;
			}

			if ( $wanted && ! $scheduled ) {
				add_filter( 'cron_schedules', array( self::class, 'addSchedule' ) ); // phpcs:ignore WordPress.WP.CronInterval.ChangeDetected -- Same five-minute schedule declared in register(); see that call site.
				wp_schedule_event( time(), self::SCHEDULE, self::TICK_HOOK );

				return;
			}
			if ( ! $wanted && $scheduled ) {
				wp_clear_scheduled_hook( self::TICK_HOOK );
			}
		} finally {
			$lock->release();
		}
	}

	/**
	 * Remove the tick unconditionally (deactivation / uninstall).
	 */
	public static function clearSchedule(): void {
		wp_clear_scheduled_hook( self::TICK_HOOK );
	}

	/**
	 * Cron entry point: release expired holds, then remind the ones still alive.
	 *
	 * Expiry runs FIRST so a reminder is never sent for a hold this same tick is about to release.
	 */
	public static function runTick(): void {
		$service = \Aponto\Rest\Bootstrap::services()->paymentService();

		try {
			$service->expireHolds( self::EXPIRY_BATCH );
		} catch ( \Throwable $failure ) {
			unset( $failure ); // Isolated like every other cron step.
		}

		try {
			$service->sendHoldReminders( self::REMINDER_BATCH );
		} catch ( \Throwable $failure ) {
			unset( $failure );
		}

		try {
			// Refunds that reached the gateway and never came back (Codex J). Isolated like every
			// other step: a stuck refund must not stop the hold expiry that runs beside it.
			$service->reconcileStaleRefunds( self::REFUND_BATCH );
		} catch ( \Throwable $failure ) {
			unset( $failure );
		}

		self::syncSchedule();
	}
}

<?php
/**
 * 24-hour booking reminder scheduler (A5 — Free single reminder).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Notification;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Rest\Services;

/**
 * Sends the one Free reminder (A5 — founder-approved, U2's #1 reason to buy clinic software): a
 * single `booking_reminder_customer` email ~24h before a still-`confirmed` booking, driven off the
 * hourly `aponto_cleanup` cron ({@see \Aponto\Installation\CleanupRunner}).
 *
 * Due rule (documented — "ghi rõ"): on each tick, a booking is due when it is CONFIRMED, its start
 * is in the next-24h window `(now, now + 24h]`, and it was created at least 24h before its start.
 * The last clause SKIPS a booking made less than 24 hours ahead — it is never sent late; there is no
 * "send immediately when < 24h" path. The reminder therefore fires on the FIRST tick the start
 * crosses into the 24h window (i.e. ~24h before). Exactly-once delivery is guaranteed by the unique
 * reminder `dispatch_key` (a booking that matches on several ticks is claimed only once) and, as a
 * cheap pre-filter, a `NOT EXISTS` against an already-recorded reminder delivery. Cancelled,
 * completed and pending bookings are excluded by the `status = 'confirmed'` filter. Premium's
 * `reminders` module layers custom offsets and follow-ups on top (D-R22, D-R29); this reminder is
 * independent of it and keeps working with the module absent, disabled or uninstalled.
 *
 * RESCHEDULE (bug fix, D-R29). A booking rescheduled after its reminder had been queued could never
 * be reminded again. Two things combined: the queued copy is dropped at send time as `reminder_stale`
 * (correct — it states the old time), and that dropped row then satisfied the old
 * "`NOT EXISTS` any reminder delivery" pre-filter FOREVER, while the dispatch key was
 * start-INDEPENDENT so even a re-queue would have collided with the dead row's key. Both halves are
 * fixed: the key now carries the booking's current start
 * ({@see NotificationDispatcher::reminderDiscriminator()}), and the pre-filter below ignores exactly
 * the rows that were dropped as stale. The three invariants that follow:
 *
 *   1. A rescheduled booking becomes remindable again at its new start — its only reminder row is
 *      the stale drop, which no longer blocks, and the new start opens a new key.
 *   2. No booking is reminded twice for the SAME start — a sent/queued/failed-for-any-other-reason
 *      row still blocks the pre-filter, and the start-keyed unique claim is the authoritative backstop
 *      even when the pre-filter lets a candidate through.
 *   3. Upgrading re-sends nothing — a legacy row (start-independent key, `last_error_code = ''`)
 *      blocks the pre-filter exactly as it always did, so a booking already reminded at its current
 *      start stays reminded, with no migration and no rewriting of stored keys.
 *
 * Accepted residue: a booking moved AWAY from a start and back to it is not re-reminded for that
 * start (the stale row no longer blocks, but the original start's key is still claimed). Making that
 * case send would need the mutation counter in the key, which buys one rare edge at the cost of the
 * "one reminder per start" guarantee that invariant 2 rests on.
 */
final class ReminderScheduler {

	/**
	 * The Free reminder template key.
	 */
	private const TEMPLATE_KEY = 'booking_reminder_customer';

	/**
	 * The terminal drop marker a reminder delivery carries when it was discarded at send time because
	 * the booking had changed under it ({@see NotificationDispatcher::sendBlockReason()}). Such a row
	 * records an email that was NEVER sent, so it must not block a later reminder (D-R29).
	 */
	private const STALE_DROP = 'reminder_stale';

	/**
	 * Lead window in hours (also the minimum booking-ahead time).
	 */
	private const WINDOW_HOURS = 24;

	/**
	 * Per-tick batch cap (matches the cleanup auto-cancel/anonymize batches).
	 */
	private const BATCH = 200;

	/**
	 * Construct the scheduler.
	 *
	 * @param Services $services Service locator.
	 */
	public function __construct( private Services $services ) {}

	/**
	 * Send every due reminder this tick. Returns the number of reminder rows sent.
	 */
	public function run(): int {
		$template = ( new TemplateRepository( $this->services->wpdb() ) )->find( self::TEMPLATE_KEY );
		if ( null === $template || 1 !== (int) $template['enabled'] ) {
			return 0; // Reminder disabled or not seeded — nothing to do.
		}

		$dispatcher = $this->services->notificationDispatcher();
		$bookings   = $this->services->bookingRepository();
		$sent       = 0;

		foreach ( $this->dueBookingIds() as $id ) {
			$booking = $bookings->find( $id );
			if ( null === $booking || 'confirmed' !== $booking->status ) {
				continue; // Raced to a terminal state between selection and load.
			}
			$dispatcher->queueReminder( $booking );
			$sent += $dispatcher->flushBooking( $booking->id );
		}

		return $sent;
	}

	/**
	 * Ids of confirmed bookings due for a reminder this tick (see the class doc for the rule).
	 *
	 * The `NOT EXISTS` clause is a CHEAP PRE-FILTER, never the uniqueness guarantee — that is the
	 * start-keyed unique claim. It deliberately ignores rows dropped as `reminder_stale` (D-R29): such
	 * a row records an email that was discarded before sending, so treating it as "already reminded"
	 * is what silently un-reminded every rescheduled booking. Every other reminder row still blocks,
	 * legacy start-independent keys included, so no upgrade re-sends.
	 *
	 * @return list<int>
	 */
	private function dueBookingIds(): array {
		$wpdb       = $this->services->wpdb();
		$bookings   = $wpdb->prefix . 'aponto_bookings';
		$deliveries = $wpdb->prefix . 'aponto_notification_deliveries';

		$now        = $this->services->clock()->now();
		$now_sql    = $now->format( 'Y-m-d H:i:s' );
		$window_sql = $now->add( new \DateInterval( 'PT' . self::WINDOW_HOURS . 'H' ) )->format( 'Y-m-d H:i:s' );

		$sql = "SELECT b.id FROM {$bookings} b
			WHERE b.status = 'confirmed'
			AND b.start_datetime_utc > %s
			AND b.start_datetime_utc <= %s
			AND b.created_at <= ( b.start_datetime_utc - INTERVAL " . self::WINDOW_HOURS . " HOUR )
			AND NOT EXISTS (
				SELECT 1 FROM {$deliveries} d
				WHERE d.booking_id = b.id AND d.template_key = %s AND d.last_error_code <> %s
			)
			ORDER BY b.start_datetime_utc ASC
			LIMIT " . self::BATCH;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; window bounds + template key + drop marker bound via prepare(); the interpolated WINDOW_HOURS/BATCH are integer class constants, never user input.
		$ids = $wpdb->get_col( $wpdb->prepare( $sql, $now_sql, $window_sql, self::TEMPLATE_KEY, self::STALE_DROP ) );

		return array_map( 'intval', is_array( $ids ) ? $ids : array() );
	}
}

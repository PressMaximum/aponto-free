<?php
/**
 * Activation seed data.
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
 * Seeds the thirteen notification templates on activation. Idempotent: a second activation inserts
 * nothing (§5 activation seeds).
 *
 * Retryable (Codex review E item 6): every read and insert result is CHECKED. A partial seed (e.g.
 * the process died or an insert failed halfway through an upgrade that adds a template) records
 * {@see self::INCOMPLETE_OPTION}; {@see Installer::maybeUpgrade()} sees the flag on the next
 * admin request and re-runs the install path, and the per-key existence guard makes the re-run
 * insert exactly the missing rows. The flag clears only when every template verifiably exists.
 */
final class Seeder {

	/**
	 * Option flagging an incomplete template seed (details for debugging; presence = retry needed).
	 */
	public const INCOMPLETE_OPTION = 'aponto_seed_incomplete';

	/**
	 * Construct the seeder.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct( private \wpdb $wpdb ) {}

	/**
	 * Run all seeds.
	 */
	public function seed(): void {
		$this->seedNotifications();
	}

	/**
	 * Insert any missing notification templates (idempotent by unique `template_key`), verifying
	 * every step. Never throws — a failure marks {@see self::INCOMPLETE_OPTION} for the upgrade
	 * retry loop instead of breaking activation.
	 */
	private function seedNotifications(): void {
		$table  = $this->wpdb->prefix . 'aponto_notifications';
		$errors = array();

		foreach ( self::templates() as $template ) {
			$key = (string) $template['template_key'];

			$this->wpdb->flush(); // Clear stale last_error so the check below sees only THIS read.
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, PluginCheck.Security.DirectDB.UnescapedDBParameter -- table name from $wpdb->prefix, not user input; existence guard for idempotent seed.
			$exists = $this->wpdb->get_var(
				// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- table name from $wpdb->prefix, not user input; value is passed to wpdb::prepare.
				$this->wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE template_key = %s", $key )
			);
			if ( '' !== $this->wpdb->last_error ) {
				$errors[ $key ] = 'read: ' . $this->wpdb->last_error;
				continue; // Unreadable state — never insert blind (a duplicate would be swallowed as failure).
			}
			if ( (int) $exists > 0 ) {
				continue;
			}

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Seed insert on activation.
			$inserted = $this->wpdb->insert(
				$table,
				$template,
				array( '%s', '%s', '%s', '%s', '%s', '%d' )
			);
			if ( false === $inserted ) {
				$errors[ $key ] = 'insert: ' . $this->wpdb->last_error;
			}
		}

		if ( array() !== $errors || ! $this->allTemplatesPresent( $table ) ) {
			update_option(
				self::INCOMPLETE_OPTION,
				array(
					'errors' => $errors,
					'at'     => gmdate( 'Y-m-d H:i:s' ),
				),
				false
			);

			return;
		}

		delete_option( self::INCOMPLETE_OPTION );
	}

	/**
	 * The seed templates this site is MISSING (QA run 2 BUG-6).
	 *
	 * Public because the repair path needs the same answer the seed loop computes, before and after
	 * it runs: `wp aponto fixer` reported "Schema drift repaired" on a site whose `wp_aponto_
	 * notifications` table held only the two rows a migration seeds, and a site in that state sends
	 * no confirmation or cancellation mail at all. Reporting what was restored requires knowing what
	 * was absent, and only this class knows the list.
	 *
	 * @return list<string> Missing `template_key` values, in seed order.
	 */
	public function missingTemplateKeys(): array {
		$table   = $this->wpdb->prefix . 'aponto_notifications';
		$missing = array();

		foreach ( self::templates() as $template ) {
			$key = (string) $template['template_key'];

			$this->wpdb->flush(); // Clear stale last_error so the check below sees only THIS read.
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name from $wpdb->prefix, not user input; value bound via prepare().
			$exists = $this->wpdb->get_var( $this->wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE template_key = %s", $key ) );
			if ( '' === $this->wpdb->last_error && (int) $exists > 0 ) {
				continue;
			}

			// An UNREADABLE row counts as missing: the honest answer to "is the copy there" when the
			// table cannot be read is "we do not know", and the repair path must not report success
			// on the strength of a failed query.
			$missing[] = $key;
		}

		return $missing;
	}

	/**
	 * Verify every seed template row exists (the retry loop's completion condition).
	 *
	 * @param string $table Fully-qualified notifications table.
	 */
	private function allTemplatesPresent( string $table ): bool {
		$keys         = array_map( static fn ( array $t ): string => (string) $t['template_key'], self::templates() );
		$placeholders = implode( ',', array_fill( 0, count( $keys ), '%s' ) );

		$this->wpdb->flush();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare -- Constant table; keys bound via prepare(); the interpolated fragment is a %s-only placeholder list the sniff cannot see through.
		$count = $this->wpdb->get_var( $this->wpdb->prepare( "SELECT COUNT(DISTINCT template_key) FROM {$table} WHERE template_key IN ({$placeholders})", $keys ) );

		return '' === $this->wpdb->last_error && count( $keys ) === (int) $count;
	}

	/**
	 * The thirteen seed templates (SPEC-P1 §3.2 + the 2026-07-20 / D-R28 / D-R33 / D-R38 addenda).
	 * English defaults with whitelist placeholders; copy polish is a P1 task.
	 * `booking_completed_customer`, `booking_no_show_customer` and `payment_refunded_customer` ship
	 * disabled.
	 *
	 * @return list<array{template_key:string, recipient:string, trigger_event:string, subject:string, body:string, enabled:int}>
	 */
	public static function templates(): array {
		return array(
			array(
				'template_key'  => 'booking_received_customer',
				'recipient'     => 'customer',
				'trigger_event' => 'created',
				'subject'       => 'We received your booking — {service_name}',
				'body'          => "Hi {customer_first_name},\n\nWe received your booking for {service_name} on {booking_date} at {booking_time}.\n\nYour reference is {order_code}.\nManage your booking: {manage_link}\n\n{payment_summary}\n\n{business_name}",
				'enabled'       => 1,
			),
			array(
				'template_key'  => 'booking_confirmed_customer',
				'recipient'     => 'customer',
				'trigger_event' => 'confirmed',
				'subject'       => 'Your booking is confirmed — {service_name}',
				'body'          => "Hi {customer_first_name},\n\nYour booking for {service_name} with {staff_name} on {booking_date} at {booking_time} is confirmed.\n\nReference: {order_code}\nManage your booking: {manage_link}\n\n{payment_summary}\n\n{business_name}",
				'enabled'       => 1,
			),
			array(
				'template_key'  => 'booking_rescheduled_customer',
				'recipient'     => 'customer',
				'trigger_event' => 'rescheduled',
				'subject'       => 'Your booking was rescheduled — {service_name}',
				'body'          => "Hi {customer_first_name},\n\nYour booking for {service_name} has been rescheduled to {booking_date} at {booking_time}.\n\nReference: {order_code}\nManage your booking: {manage_link}\n\n{payment_summary}\n\n{business_name}",
				'enabled'       => 1,
			),
			array(
				'template_key'  => 'booking_cancelled_customer',
				'recipient'     => 'customer',
				'trigger_event' => 'cancelled',
				'subject'       => 'Your booking was cancelled — {service_name}',
				// Both link lines self-strip when they cannot resolve (A4 / D-R26; `manage_link` and
				// `booking_page_link` are optional-line keys in {@see \Aponto\Notification\Placeholders}).
				// The manage link opens the permanently READ-ONLY cancelled view (D-R25 revocation
				// semantics), so the customer can still see what was cancelled — hence "View", not
				// "Manage".
				'body'          => "Hi {customer_first_name},\n\nYour booking for {service_name} on {booking_date} at {booking_time} has been cancelled.\n\nReference: {order_code}\nView your booking: {manage_link}\n\nBook again: {booking_page_link}\n\n{payment_summary}\n\n{business_name}",
				'enabled'       => 1,
			),
			array(
				'template_key'  => 'booking_completed_customer',
				'recipient'     => 'customer',
				'trigger_event' => 'completed',
				'subject'       => 'Thank you for visiting {business_name}',
				'body'          => "Hi {customer_first_name},\n\nThank you for choosing {service_name}. We hope to see you again.\n\n{payment_summary}\n\n{business_name}",
				'enabled'       => 0,
			),
			array(
				// The single Free reminder (A5 — founder-approved): one email ~24h before the start
				// for a still-confirmed booking, sent by the hourly cron. Premium's `reminders` module
				// layers custom offsets/SMS on top (SPEC-P1 §3.2). Carries {manage_link} so the
				// dispatcher rotates a fresh live token for it (A1).
				'template_key'  => 'booking_reminder_customer',
				'recipient'     => 'customer',
				'trigger_event' => 'reminder',
				'subject'       => 'Reminder: your booking for {service_name} is coming up',
				'body'          => "Hi {customer_first_name},\n\nThis is a reminder for your booking for {service_name} on {booking_date} at {booking_time}.\n\nReference: {order_code}\nManage your booking: {manage_link}\n\n{payment_summary}\n\n{business_name}",
				'enabled'       => 1,
			),
			array(
				// D-R33: the no-show notice, FREE core (no `Plan::FEATURES` key, no `Plan::has()`
				// gate — it is ordinary core copy, exactly like the completed template). Ships
				// DISABLED so upgrading a live site never starts emailing people who missed an
				// appointment before the owner has read the wording. Carries NO {manage_link}: a
				// no-show booking is view-terminal on the public token routes (D-R33), so that line
				// would resolve to a 404. The `Book again:` line is the A4 optional-line rule
				// verbatim — `booking_page_link` is an OPTIONAL_LINE_KEY, so the whole line drops
				// itself when no published booking page exists.
				'template_key'  => 'booking_no_show_customer',
				'recipient'     => 'customer',
				'trigger_event' => 'no_show',
				'subject'       => 'We missed you at {business_name}',
				'body'          => "Hi {customer_first_name},\n\nWe had you down for {service_name} on {booking_date} at {booking_time}, but we did not get to see you.\n\nReference: {order_code}\n\nBook again: {booking_page_link}\n\n{payment_summary}\n\n{business_name}",
				'enabled'       => 0,
			),
			array(
				// D-R38: the "complete your payment" reminder for a live unpaid hold. Sent by
				// `aponto_payments_tick`, once per order, only after the hold is ten minutes old —
				// NOT at reserve time, because with inline payment most customers pay within seconds
				// and a payment reminder landing beside the confirmation is simply wrong.
				//
				// It carries the DURABLE {manage_link} (D-R26) and no payment URL: an intent's client
				// parameters belong to one attempt and would be stale by the time an email is read,
				// and core stores no redirect URL at all. `{payment_deadline}` is an optional-line
				// key, so the line removes itself if the hold has gone.
				//
				// Ships ENABLED — unlike the other two default-off templates — because it can only
				// ever fire on a site that has deliberately switched online payment on, and because
				// it is the only thing standing between an abandoned checkout and a lost booking.
				'template_key'  => 'payment_pending_customer',
				'recipient'     => 'customer',
				'trigger_event' => 'payment_pending',
				'subject'       => 'Complete your payment — {service_name}',
				'body'          => "Hi {customer_first_name},\n\nWe are holding your appointment for {service_name} on {booking_date} at {booking_time}, but we have not received your payment yet.\n\nAmount due: {amount_due}\nReference: {order_code}\nPlease complete your payment by {payment_deadline}\nPay now: {payment_link}\nManage your booking: {manage_link}\n\nIf we do not receive it in time the slot is released automatically.\n\n{payment_summary}\n\n{business_name}",
				'enabled'       => 1,
			),
			array(
				// D-R38: the refund notice. Ships DISABLED, by the same rule that keeps
				// `booking_completed_customer` and `booking_no_show_customer` off — an upgrade must
				// never start emailing people — and because a studio that refunds by phone may
				// prefer to say it in their own words.
				'template_key'  => 'payment_refunded_customer',
				'recipient'     => 'customer',
				'trigger_event' => 'refund',
				'subject'       => 'Your refund is on its way — {service_name}',
				'body'          => "Hi {customer_first_name},\n\nWe have refunded {refund_amount} for your booking of {service_name} on {booking_date}.\n\nReference: {order_code}\nPayment status: {payment_status}\n\nDepending on your bank, it can take a few days for the money to appear.\n\n{payment_summary}\n\n{business_name}",
				'enabled'       => 0,
			),
			array(
				'template_key'  => 'booking_created_admin',
				'recipient'     => 'admin',
				'trigger_event' => 'created',
				'subject'       => 'New booking — {service_name}',
				// Phone rides its own line so it self-strips when the customer left none, instead of
				// the stray "(email, )" the inline form produced (fleet-r1 Fix 9a; Placeholders
				// treats customer_phone as an optional-line key).
				'body'          => "A new booking was made.\n\nService: {service_name}\nStaff: {staff_name}\nWhen: {booking_date} {booking_time}\nCustomer: {customer_name} ({customer_email})\nPhone: {customer_phone}\nReference: {order_code}",
				'enabled'       => 1,
			),
			array(
				'template_key'  => 'booking_cancelled_admin',
				'recipient'     => 'admin',
				'trigger_event' => 'cancelled',
				// The Reason line drops itself when no cancellation reason was given (Placeholders line-strip).
				'subject'       => 'Booking cancelled — {service_name}',
				'body'          => "A booking was cancelled.\n\nService: {service_name}\nWhen: {booking_date} {booking_time}\nCustomer: {customer_name} ({customer_email})\nReference: {order_code}\nReason: {cancel_reason}",
				'enabled'       => 1,
			),
			// The two STAFF templates (business map P2a; shipped with `multi_staff`, D-R28). They
			// mirror the admin pair but are addressed to the assigned member and go to that
			// member's own address, so a team of five stops routing everyone's day through the
			// owner's inbox. Queued only while `multi_staff` is available — on Free the single
			// staff member IS the owner and already receives the admin pair (no double-send).
			// `recipient` is the existing varchar(20) column, so 'staff' needs no schema change.
			array(
				'template_key'  => 'booking_created_staff',
				'recipient'     => 'staff',
				'trigger_event' => 'created',
				'subject'       => 'New booking for you — {service_name}',
				// Phone rides its own line so it self-strips when the customer left none, exactly
				// as in the admin template (Placeholders optional-line contract).
				'body'          => "Hi {staff_first_name},\n\nA new booking was added to your calendar.\n\nService: {service_name}\nWhen: {booking_date} {booking_time}\nCustomer: {customer_name} ({customer_email})\nPhone: {customer_phone}\nReference: {order_code}",
				'enabled'       => 1,
			),
			array(
				'template_key'  => 'booking_cancelled_staff',
				'recipient'     => 'staff',
				'trigger_event' => 'cancelled',
				// The Reason line drops itself when no cancellation reason was given.
				'subject'       => 'Booking cancelled — {service_name}',
				'body'          => "Hi {staff_first_name},\n\nA booking was removed from your calendar.\n\nService: {service_name}\nWhen: {booking_date} {booking_time}\nCustomer: {customer_name}\nReference: {order_code}\nReason: {cancel_reason}",
				'enabled'       => 1,
			),
		);
	}

	/**
	 * Translation extraction anchors for the seeded template copy (fleet-r1 Fix 6; finding U3
	 * BUG-04). The templates are stored in the DB as English source so the msgid is stable across
	 * later locale changes; {@see \Aponto\Notification\NotificationDispatcher::localizeTemplate()}
	 * looks each stored default up in the catalog at send time. This method exists ONLY so
	 * `wp i18n make-pot` registers those subjects/bodies as translatable — every literal here MUST
	 * mirror {@see self::templates()} exactly (a test asserts it). It is never called at runtime.
	 *
	 * @return list<string>
	 */
	public static function translatableDefaults(): array {
		return array(
			__( 'We received your booking — {service_name}', 'aponto' ),
			__( "Hi {customer_first_name},\n\nWe received your booking for {service_name} on {booking_date} at {booking_time}.\n\nYour reference is {order_code}.\nManage your booking: {manage_link}\n\n{payment_summary}\n\n{business_name}", 'aponto' ),
			__( 'Your booking is confirmed — {service_name}', 'aponto' ),
			__( "Hi {customer_first_name},\n\nYour booking for {service_name} with {staff_name} on {booking_date} at {booking_time} is confirmed.\n\nReference: {order_code}\nManage your booking: {manage_link}\n\n{payment_summary}\n\n{business_name}", 'aponto' ),
			__( 'Your booking was rescheduled — {service_name}', 'aponto' ),
			__( "Hi {customer_first_name},\n\nYour booking for {service_name} has been rescheduled to {booking_date} at {booking_time}.\n\nReference: {order_code}\nManage your booking: {manage_link}\n\n{payment_summary}\n\n{business_name}", 'aponto' ),
			__( 'Your booking was cancelled — {service_name}', 'aponto' ),
			__( "Hi {customer_first_name},\n\nYour booking for {service_name} on {booking_date} at {booking_time} has been cancelled.\n\nReference: {order_code}\nView your booking: {manage_link}\n\nBook again: {booking_page_link}\n\n{payment_summary}\n\n{business_name}", 'aponto' ),
			__( 'Thank you for visiting {business_name}', 'aponto' ),
			__( "Hi {customer_first_name},\n\nThank you for choosing {service_name}. We hope to see you again.\n\n{payment_summary}\n\n{business_name}", 'aponto' ),
			__( 'Reminder: your booking for {service_name} is coming up', 'aponto' ),
			__( "Hi {customer_first_name},\n\nThis is a reminder for your booking for {service_name} on {booking_date} at {booking_time}.\n\nReference: {order_code}\nManage your booking: {manage_link}\n\n{payment_summary}\n\n{business_name}", 'aponto' ),
			__( 'We missed you at {business_name}', 'aponto' ),
			__( "Hi {customer_first_name},\n\nWe had you down for {service_name} on {booking_date} at {booking_time}, but we did not get to see you.\n\nReference: {order_code}\n\nBook again: {booking_page_link}\n\n{payment_summary}\n\n{business_name}", 'aponto' ),
			__( 'New booking — {service_name}', 'aponto' ),
			__( "A new booking was made.\n\nService: {service_name}\nStaff: {staff_name}\nWhen: {booking_date} {booking_time}\nCustomer: {customer_name} ({customer_email})\nPhone: {customer_phone}\nReference: {order_code}", 'aponto' ),
			__( 'Booking cancelled — {service_name}', 'aponto' ),
			__( "A booking was cancelled.\n\nService: {service_name}\nWhen: {booking_date} {booking_time}\nCustomer: {customer_name} ({customer_email})\nReference: {order_code}\nReason: {cancel_reason}", 'aponto' ),
			__( 'Complete your payment — {service_name}', 'aponto' ),
			__( "Hi {customer_first_name},\n\nWe are holding your appointment for {service_name} on {booking_date} at {booking_time}, but we have not received your payment yet.\n\nAmount due: {amount_due}\nReference: {order_code}\nPlease complete your payment by {payment_deadline}\nPay now: {payment_link}\nManage your booking: {manage_link}\n\nIf we do not receive it in time the slot is released automatically.\n\n{payment_summary}\n\n{business_name}", 'aponto' ),
			__( 'Your refund is on its way — {service_name}', 'aponto' ),
			__( "Hi {customer_first_name},\n\nWe have refunded {refund_amount} for your booking of {service_name} on {booking_date}.\n\nReference: {order_code}\nPayment status: {payment_status}\n\nDepending on your bank, it can take a few days for the money to appear.\n\n{payment_summary}\n\n{business_name}", 'aponto' ),
			__( 'New booking for you — {service_name}', 'aponto' ),
			__( "Hi {staff_first_name},\n\nA new booking was added to your calendar.\n\nService: {service_name}\nWhen: {booking_date} {booking_time}\nCustomer: {customer_name} ({customer_email})\nPhone: {customer_phone}\nReference: {order_code}", 'aponto' ),
			// NOTE: the staff cancellation subject is byte-identical to the admin one, so it is a
			// single msgid and appears only once in this list. `translatableDefaults()` is a POT
			// anchor, not a per-template mirror — the equality test compares SETS for that reason.
			__( "Hi {staff_first_name},\n\nA booking was removed from your calendar.\n\nService: {service_name}\nWhen: {booking_date} {booking_time}\nCustomer: {customer_name}\nReference: {order_code}\nReason: {cancel_reason}", 'aponto' ),
		);
	}
}

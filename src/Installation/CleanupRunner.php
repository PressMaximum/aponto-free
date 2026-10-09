<?php
/**
 * Cleanup cron handler (SPEC-P0 §6.4.7).
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

use Aponto\Notification\DeliveryRepository;
use Aponto\Notification\ReminderScheduler;
use Aponto\Privacy\Anonymizer;
use Aponto\Rest\Services;
use Aponto\Support\DomainException;

/**
 * The real hourly `aponto_cleanup` work (§6.4.7): prune expired idempotency rows, sent deliveries
 * older than 7 days, stale rate-counter windows and orphan join rows; auto-cancel stale pending
 * bookings; anonymize customers past the retention window; and retry failed notifications once. Each
 * step is isolated so one failure never blocks the rest.
 */
final class CleanupRunner {

	/**
	 * Anonymizer.
	 *
	 * @var Anonymizer
	 */
	private Anonymizer $anonymizer;

	/**
	 * Deliveries ledger.
	 *
	 * @var DeliveryRepository
	 */
	private DeliveryRepository $deliveries;

	/**
	 * Construct the runner.
	 *
	 * @param Services $services Service locator.
	 */
	public function __construct( private Services $services ) {
		$this->anonymizer = new Anonymizer( $services->wpdb() );
		$this->deliveries = new DeliveryRepository( $services->wpdb(), $services->clock() );
	}

	/**
	 * Run all cleanup steps.
	 */
	public function run(): void {
		$this->guard( fn () => $this->pruneIdempotency() );
		$this->guard( fn () => ( new \Aponto\Import\Store( $this->services->wpdb(), $this->services->clock() ) )->prune() );
		$this->guard( fn () => $this->pruneDeliveries() );
		$this->guard( fn () => $this->pruneRateCounters() );
		$this->guard( fn () => $this->prunePaymentEvents() );
		$this->guard( fn () => \Aponto\Extension\RetainedData::prune( $this->services->wpdb(), $this->services->clock() ) );
		// The payments tick's SAFETY NET (orchestrator finding). The five-minute tick owns hold
		// expiry, but it can be unscheduled by a race; running an expiry pass here as well means the
		// worst case for a stranded hold is one hour rather than forever, and re-syncing afterwards
		// re-arms the tick if there turns out to be work.
		$this->guard( fn () => $this->services->paymentService()->expireHolds() );
		$this->guard( fn () => \Aponto\Payments\PaymentCron::syncSchedule() );
		$this->guard( fn () => $this->pruneOrphans() );
		$this->guard( fn () => $this->autoCancelPending() );
		$this->guard( fn () => $this->anonymizeRetention() );
		$this->guard( fn () => $this->sendDueReminders() );
		$this->guard( fn () => $this->services->notificationDispatcher()->retryPending() );
	}

	/**
	 * Send the Free 24h reminders due this tick (A5). Isolated like every other step, so a reminder
	 * failure never blocks the retry pass that follows.
	 */
	private function sendDueReminders(): void {
		( new ReminderScheduler( $this->services ) )->run();
	}

	/**
	 * Prune expired idempotency rows.
	 */
	private function pruneIdempotency(): void {
		$wpdb  = $this->services->wpdb();
		$table = $wpdb->prefix . 'aponto_idempotency';
		$sql   = "DELETE FROM {$table} WHERE expires_at < %s";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		$wpdb->query( $wpdb->prepare( $sql, $this->services->clock()->nowSql() ) );
	}

	/**
	 * Prune sent deliveries older than 7 days.
	 */
	private function pruneDeliveries(): void {
		$cutoff = $this->services->clock()->now()->sub( new \DateInterval( 'P7D' ) )->format( 'Y-m-d H:i:s' );
		$this->deliveries->pruneSentOlderThan( $cutoff );
	}

	/**
	 * Prune rate-counter windows older than the longest window (a day).
	 */
	private function pruneRateCounters(): void {
		$wpdb   = $this->services->wpdb();
		$table  = $wpdb->prefix . 'aponto_rate_counters';
		$cutoff = $this->services->clock()->now()->sub( new \DateInterval( 'PT' . DAY_IN_SECONDS . 'S' ) )->format( 'Y-m-d H:i:s' );
		$sql    = "DELETE FROM {$table} WHERE window_start < %s";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		$wpdb->query( $wpdb->prepare( $sql, $cutoff ) );
	}

	/**
	 * Prune webhook events older than 30 days (D-R38f).
	 *
	 * Thirty rather than the deliveries' seven: the ledger's whole job is to recognise a REPLAY, and
	 * gateways retry a failing endpoint for days before giving up. Pruning on the same schedule as
	 * sent emails would let a retry from the far end of that window be applied a second time.
	 */
	private function prunePaymentEvents(): void {
		$cutoff = $this->services->clock()->now()->sub( new \DateInterval( 'P30D' ) )->format( 'Y-m-d H:i:s' );
		( new \Aponto\Payments\PaymentEventLedger( $this->services->wpdb(), $this->services->clock() ) )->pruneOlderThan( $cutoff );
	}

	/**
	 * Prune join rows that reference a missing staff or service.
	 */
	private function pruneOrphans(): void {
		$wpdb  = $this->services->wpdb();
		$staff = $wpdb->prefix . 'aponto_staff';
		$svc   = $wpdb->prefix . 'aponto_services';

		foreach ( array( 'aponto_schedules', 'aponto_blocked_periods' ) as $slug ) {
			$table = $wpdb->prefix . $slug;
			$sql   = "DELETE FROM {$table} WHERE staff_id <> 0 AND NOT EXISTS ( SELECT 1 FROM {$staff} st WHERE st.id = {$table}.staff_id )";
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; no user input.
			$wpdb->query( $sql );
		}

		$schedules = $wpdb->prefix . 'aponto_schedules';
		$sql       = "DELETE FROM {$schedules} WHERE service_id <> 0 AND NOT EXISTS ( SELECT 1 FROM {$svc} s WHERE s.id = {$schedules}.service_id )";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; no user input.
		$wpdb->query( $sql );

		$joins = $wpdb->prefix . 'aponto_staff_services';
		$sql   = "DELETE FROM {$joins} WHERE NOT EXISTS ( SELECT 1 FROM {$staff} st WHERE st.id = {$joins}.staff_id ) OR NOT EXISTS ( SELECT 1 FROM {$svc} s WHERE s.id = {$joins}.service_id )";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; no user input.
		$wpdb->query( $sql );
	}

	/**
	 * Auto-cancel pending bookings older than `pending_auto_cancel_hours` (0 = off).
	 */
	private function autoCancelPending(): void {
		$hours = (int) $this->services->settings()->get( 'pending_auto_cancel_hours' );
		if ( $hours <= 0 ) {
			return;
		}

		$wpdb   = $this->services->wpdb();
		$table  = $wpdb->prefix . 'aponto_bookings';
		$items  = $wpdb->prefix . 'aponto_order_items';
		$orders = $wpdb->prefix . 'aponto_orders';
		$cutoff = $this->services->clock()->now()->sub( new \DateInterval( 'PT' . $hours . 'H' ) )->format( 'Y-m-d H:i:s' );

		// A LIVE PAYMENT HOLD IS NOT A STALE PENDING BOOKING (D-R38, Codex #11). On a site with
		// `pending_auto_cancel_hours` set below the hold length, this pass would cancel the booking
		// while leaving the order `payment_status = pending` — so the payment path still believed it
		// owned a live hold, the expiry cron skipped an already-cancelled booking, and a customer who
		// paid seconds later got the late-payment treatment for a booking that was never theirs to
		// lose. Holds have their own owner, `aponto_payments_tick`, and it is the only thing that may
		// cancel them.
		$sql = "SELECT b.id FROM {$table} b
			WHERE b.status = 'pending' AND b.created_at < %s
			AND NOT EXISTS (
				SELECT 1 FROM {$items} oi
				INNER JOIN {$orders} o ON o.id = oi.order_id
				WHERE oi.booking_id = b.id AND o.payment_status = 'pending'
			)
			ORDER BY b.id ASC LIMIT 200";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		$ids = $wpdb->get_col( $wpdb->prepare( $sql, $cutoff ) );

		$service = $this->services->bookingStatusService();
		foreach ( array_map( 'intval', is_array( $ids ) ? $ids : array() ) as $booking_id ) {
			try {
				$service->transition( $booking_id, 'cancelled', 'system', 'pending auto-cancel', false, 'send' );
				// Outbox flush (V3): send the cancellation rows queued inside the transaction.
				$this->services->notificationDispatcher()->flushBooking( $booking_id );
			} catch ( DomainException $exception ) {
				unset( $exception ); // Already transitioned by a concurrent actor — skip.
			}
		}
	}

	/**
	 * Anonymize customers whose latest activity is beyond `data_retention_months` (0 = off).
	 * Retention anchor = MAX(end_datetime_utc) of the customer's bookings, falling back to the
	 * customer's `created_at` when they have none (DECISIONS: retention anchor).
	 *
	 * REST-2: the candidate list is only a HINT. Each customer is processed in its OWN transaction:
	 * the customer row is locked (`SELECT ... FOR UPDATE` — `reserve()`'s customer upsert touches
	 * the same row, so the row lock serialises them), the retention condition is re-evaluated under
	 * that lock, and only a still-eligible customer is anonymized. A booking committed between
	 * selection and the re-check makes the customer ineligible and it is skipped.
	 */
	private function anonymizeRetention(): void {
		$months = (int) $this->services->settings()->get( 'data_retention_months' );
		if ( $months <= 0 ) {
			return;
		}

		$wpdb      = $this->services->wpdb();
		$customers = $wpdb->prefix . 'aponto_customers';
		$bookings  = $wpdb->prefix . 'aponto_bookings';
		$threshold = $this->services->clock()->now()->modify( '-' . $months . ' months' )->format( 'Y-m-d H:i:s' );

		$sql = "SELECT c.id FROM {$customers} c
			LEFT JOIN ( SELECT customer_id, MAX(end_datetime_utc) AS max_end FROM {$bookings} GROUP BY customer_id ) b ON b.customer_id = c.id
			WHERE c.email_norm NOT LIKE 'anon-%@invalid'
			AND COALESCE( b.max_end, c.created_at ) < %s
			ORDER BY c.id ASC LIMIT 200";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; bound via prepare().
		$ids = $wpdb->get_col( $wpdb->prepare( $sql, $threshold ) );
		$ids = array_map( 'intval', is_array( $ids ) ? $ids : array() );

		if ( null !== $this->selection_probe ) {
			( $this->selection_probe )( $ids );
		}

		foreach ( $ids as $customer_id ) {
			$this->anonymizeUnderLock( $customer_id, $threshold );
		}
	}

	/**
	 * Anonymize one customer in its own transaction after re-checking eligibility under a row lock
	 * (REST-2). Skips silently when the customer became ineligible or vanished.
	 *
	 * @param int    $customer_id Customer id.
	 * @param string $threshold   Retention threshold `Y-m-d H:i:s`.
	 * @throws \Throwable Re-thrown after rollback when a statement fails (step guard isolates it).
	 */
	private function anonymizeUnderLock( int $customer_id, string $threshold ): void {
		$wpdb      = $this->services->wpdb();
		$customers = $wpdb->prefix . 'aponto_customers';
		$bookings  = $wpdb->prefix . 'aponto_bookings';
		$tx        = new \Aponto\Database\TransactionGuard( $wpdb );

		$changed = \Aponto\Extension\RetainedData::run(
			$wpdb,
			function () use ( $wpdb, $customers, $bookings, $tx, $customer_id, $threshold ): bool {
				$tx->begin();
				try {
					$lock_sql = "SELECT id, email_norm, created_at FROM {$customers} WHERE id = %d FOR UPDATE";
					// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare(); row lock for the re-check.
					$row = $wpdb->get_row( $wpdb->prepare( $lock_sql, $customer_id ), ARRAY_A );

					if ( ! is_array( $row ) || str_ends_with( (string) $row['email_norm'], '@invalid' ) ) {
						$tx->rollback();

						return false;
					}

					$anchor_sql = "SELECT COALESCE( MAX(end_datetime_utc), %s ) FROM {$bookings} WHERE customer_id = %d";
					// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare(); authoritative re-check under the row lock.
					$anchor = (string) $wpdb->get_var( $wpdb->prepare( $anchor_sql, (string) $row['created_at'], $customer_id ) );

					if ( '' === $anchor || $anchor >= $threshold ) {
						// A booking committed after selection moved the anchor — no longer eligible.
						$tx->rollback();

						return false;
					}

					$this->anonymizer->applyInTransaction( $customer_id );
					$tx->commit();
				} catch ( \Throwable $failure ) {
					$tx->rollback();
					throw $failure;
				}
				return true;
			}
		);
		if ( ! $changed ) {
			return;
		}
		try {
			/**
			 * Fires after a customer is anonymized and business locks are released (extension-surface §2).
			 *
			 * @param array<string, mixed> $row Erased subject identity.
			 */
			do_action( 'aponto_customer_anonymized', array( 'id' => $customer_id ) );
		} catch ( \Throwable $listener_failure ) {
			unset( $listener_failure ); // Post-commit extensions cannot invalidate the saved operation.
		}
	}

	/**
	 * Test-only probe invoked with the selected candidate ids BEFORE the per-customer re-check
	 * (mirrors the engine's interleave-probe pattern). Production never sets it.
	 *
	 * @internal
	 * @var callable|null
	 */
	private $selection_probe = null;

	/**
	 * Inject the test-only selection probe.
	 *
	 * @internal Test seam only.
	 * @param callable|null $probe `function (list<int> $candidate_ids): void`.
	 */
	public function setTestSelectionProbe( ?callable $probe ): void {
		$this->selection_probe = $probe;
	}

	/**
	 * Run a step, swallowing failures so one broken step never blocks the rest.
	 *
	 * @param callable(): mixed $step Step.
	 */
	private function guard( callable $step ): void {
		try {
			$step();
		} catch ( \Throwable $failure ) {
			unset( $failure );
		}
	}
}

<?php
/**
 * Order writer with code-collision retry (§4.2, §5.6).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Booking\Repository;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Booking\TokenGenerator;
use Aponto\Database\StorageException;
use Aponto\Payments\OrderPrice;
use Aponto\Support\Clock;

/**
 * Creates the order + single order item for a booking (V1 = 1 order / 1 item). The price is a
 * SNAPSHOT of `service.price_minor` at reserve time; a NULL price stores `0` with meta `unpriced`
 * (P2-01, §4.2). The public `AP-XXXXX` code is non-enumerable; a UNIQUE collision is regenerated
 * up to five times before failing.
 *
 * Fail-closed (review E4): any non-collision insert failure throws {@see StorageException} with
 * the error SNAPSHOT taken before any further query, so the reserve transaction rolls back.
 */
final class OrderRepository {

	/**
	 * Maximum code-generation attempts before giving up.
	 */
	private const MAX_CODE_ATTEMPTS = 5;

	/**
	 * Booking-meta key marking that the hold reminder has been dealt with (Codex #14).
	 */
	public const REMINDED_META_KEY = 'payments.reminded';

	/**
	 * Booking-meta key for an order whose `void` will not resolve (D-R40c).
	 *
	 * ONE key carrying two facts, and it can because both are answered by the same stamp: the row
	 * EXISTING means the escalation has happened (one anomaly, one admin message — never repeated),
	 * and its VALUE is the last failed attempt, which is what the expiry tick compares against to
	 * back that order off to hourly retries. A second key would only be a second thing to keep in
	 * step with the first.
	 */
	public const VOID_UNRESOLVED_META_KEY = 'payments.void_unresolved';

	/**
	 * Construct the repository.
	 *
	 * @param \wpdb          $wpdb   Database handle.
	 * @param TokenGenerator $tokens Token/code generator.
	 * @param Clock          $clock  Clock.
	 */
	public function __construct(
		private \wpdb $wpdb,
		private TokenGenerator $tokens,
		private Clock $clock
	) {}

	/**
	 * Create the order and its single booking item; returns `{id, code}`.
	 *
	 * @param int             $booking_id  Booking id.
	 * @param int|null        $price_minor Snapshot price in minor units, or null (unpriced).
	 * @param string          $currency    ISO-4217 currency (from settings — always valid).
	 * @param OrderPrice|null $snapshot Validated final price, or null for the base price.
	 * @return array{id: int, code: string}
	 * @throws StorageException When an insert fails (non-collision) or the code retries run out.
	 */
	public function createWithItem( int $booking_id, ?int $price_minor, string $currency, ?OrderPrice $snapshot = null ): array {
		$price  = $snapshot ?? OrderPrice::base( $price_minor, $currency );
		$amount = $price->subtotal_minor;
		$meta   = null === $price_minor ? 'unpriced' : '';
		$now    = $this->clock->nowSql();
		$orders = $this->wpdb->prefix . 'aponto_orders';

		$order_id = 0;
		$code     = '';
		for ( $attempt = 0; $attempt < self::MAX_CODE_ATTEMPTS; $attempt++ ) {
			$code = $this->tokens->orderCode();

			$suppressed = $this->wpdb->suppress_errors( true );
			// An expected code collision must not abort the surrounding SQLite reservation transaction.
			$coupon = null === $price->coupon_id ? 'NULL' : '%d';
			$args   = array( $orders, $code, $price->subtotal_minor, $price->discount_minor, $price->total_minor, $price->currency );
			if ( null !== $price->coupon_id ) {
				$args[] = $price->coupon_id;
			}
			array_push( $args, $price->coupon_code, $now, $now );
			$sql = "INSERT IGNORE INTO %i (code, subtotal_minor, discount_minor, total_minor, currency, coupon_id, coupon_code, payment_status, created_at, updated_at) VALUES (%s, %d, %d, %d, %s, {$coupon}, %s, 'none', %s, %s)";
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table bound as an identifier (%i); fixed NULL or placeholder fragment; every value bound via prepare(). Atomic unique claim.
			$ok = $this->wpdb->query( $this->wpdb->prepare( $sql, ...$args ) );
			$this->wpdb->suppress_errors( $suppressed );

			if ( 1 === $ok && $this->wpdb->insert_id > 0 ) {
				$order_id = (int) $this->wpdb->insert_id;
				break;
			}

			$error = (string) $this->wpdb->last_error;
			if ( false === $ok || ! $this->codeExists( $code ) ) {
				// A non-collision failure — snapshot NOW and fail closed (E4).
					throw StorageException::fromSqlError( esc_html( 'order insert' ), esc_html( $error ) );
			}
		}

		if ( 0 === $order_id ) {
			throw StorageException::because( esc_html( 'order code generation exhausted retries' ) );
		}

		$item = $this->wpdb->insert(
			$this->wpdb->prefix . 'aponto_order_items',
			array(
				'order_id'     => $order_id,
				'item_type'    => 'booking',
				'booking_id'   => $booking_id,
				'amount_minor' => $amount,
				'meta'         => $meta,
			),
			array( '%d', '%s', '%d', '%d', '%s' )
		);

		if ( false === $item ) {
				throw StorageException::fromSqlError( esc_html( 'order item insert' ), esc_html( (string) $this->wpdb->last_error ) );
		}
		if ( (int) $this->wpdb->insert_id <= 0 ) {
			throw StorageException::because( esc_html( 'order item insert yielded no id' ) );
		}

		return array(
			'id'   => $order_id,
			'code' => $code,
		);
	}

	/**
	 * Store a deposit order's payable-now snapshot (D-R71). Called inside the reserve transaction
	 * right after {@see self::createWithItem()}; full-payment orders never call it and keep `NULL`.
	 *
	 * @param int $order_id    Order id.
	 * @param int $payable_now Deposit amount, `0 < payable_now < total` (validated by the caller).
	 * @throws StorageException When the update fails or affects no row.
	 */
	public function setPayableNow( int $order_id, int $payable_now ): void {
		$table = $this->wpdb->prefix . 'aponto_orders';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Write inside the reserve transaction.
		$updated = $this->wpdb->update(
			$table,
			array( 'payable_now_minor' => $payable_now ),
			array( 'id' => $order_id ),
			array( '%d' ),
			array( '%d' )
		);
		if ( 1 !== $updated ) {
			throw StorageException::fromSqlError( esc_html( 'order payable-now write' ), esc_html( (string) $this->wpdb->last_error ) );
		}
	}

	/**
	 * Read the single booking item for external quote finalization.
	 *
	 * @param int $order_id Order id.
	 * @return array<string, mixed>|null Null also refuses multi-item orders.
	 */
	public function checkoutItem( int $order_id ): ?array {
		$table = $this->wpdb->prefix . 'aponto_order_items';
		$sql   = "SELECT * FROM {$table} WHERE order_id = %d ORDER BY id ASC LIMIT 2";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; id bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $order_id ), ARRAY_A );

		return is_array( $rows ) && 1 === count( $rows ) && 'booking' === (string) $rows[0]['item_type'] ? $rows[0] : null;
	}

	/**
	 * Replace an unpaid order's exact quote, inside the caller's order lock and transaction.
	 *
	 * @param int                            $order_id Order id.
	 * @param int                            $item_id Booking item id, already verified by the service.
	 * @param \Aponto\Payments\CheckoutQuote $quote Authoritative external financial snapshot.
	 * @throws StorageException When either financial snapshot cannot be written.
	 */
	public function finalizeCheckoutQuote( int $order_id, int $item_id, \Aponto\Payments\CheckoutQuote $quote ): void {
		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Called inside the service's transaction; core financial snapshots.
		$order_result = $this->wpdb->update(
			$this->wpdb->prefix . 'aponto_orders',
			array(
				'subtotal_minor' => $quote->subtotal_minor + $quote->tax_minor + $quote->fee_minor,
				'discount_minor' => $quote->discount_minor,
				'total_minor'    => $quote->total_minor,
				'updated_at'     => $this->clock->nowSql(),
			),
			array(
				'id'             => $order_id,
				'payment_status' => 'pending',
			),
			array( '%d', '%d', '%d', '%s' ),
			array( '%d', '%s' )
		);
		if ( false === $order_result ) {
			throw StorageException::fromSqlError( esc_html( 'checkout order quote' ), esc_html( (string) $this->wpdb->last_error ) );
		}
		$item_result = $this->wpdb->update(
			$this->wpdb->prefix . 'aponto_order_items',
			array( 'amount_minor' => $quote->total_minor ),
			array(
				'id'       => $item_id,
				'order_id' => $order_id,
			),
			array( '%d' ),
			array( '%d', '%d' )
		);
		// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		if ( false === $item_result ) {
			throw StorageException::fromSqlError( esc_html( 'checkout item quote' ), esc_html( (string) $this->wpdb->last_error ) );
		}
	}

	/**
	 * Update the manually controlled payment status.
	 *
	 * Callers compare the current status first, so zero affected rows means the order vanished and
	 * must fail closed.
	 *
	 * @param int    $order_id Order id.
	 * @param string $status   `none|paid`.
	 * @throws StorageException When the update fails or affects no row.
	 */
	public function updatePaymentStatus( int $order_id, string $status ): void {
		$result = $this->wpdb->update(
			$this->wpdb->prefix . 'aponto_orders',
			array(
				'payment_status' => $status,
				'updated_at'     => $this->clock->nowSql(),
			),
			array( 'id' => $order_id ),
			array( '%s', '%s' ),
			array( '%d' )
		);
		if ( false === $result ) {
			throw StorageException::fromSqlError( esc_html( 'order payment status update' ), esc_html( (string) $this->wpdb->last_error ) );
		}
		if ( 0 === $result ) {
			throw StorageException::because( esc_html( 'order payment status update affected no row' ) );
		}
	}

	/**
	 * The order row for a booking, or null (payment paths, D-R38).
	 *
	 * `SELECT *` on purpose: `hold_expires_at` arrives at schema 9 and every reader reaches it with
	 * `?? null`, so the same code runs against a version-8 database rather than referencing a column
	 * that may not exist yet (§5 invariant 4 — code N runs on schema N+1, and the reverse degrades).
	 *
	 * @param int  $booking_id  Booking id.
	 * @param bool $for_update  Take a row lock (only meaningful inside a transaction).
	 * @return array<string, mixed>|null
	 */
	public function findForBooking( int $booking_id, bool $for_update = false ): ?array {
		$p    = $this->wpdb->prefix;
		$lock = $for_update ? ' FOR UPDATE' : '';
		$sql  = "SELECT o.* FROM {$p}aponto_orders o
			INNER JOIN {$p}aponto_order_items oi ON oi.order_id = o.id
			WHERE oi.booking_id = %d LIMIT 1{$lock}";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; id bound via prepare().
		$row = $this->wpdb->get_row( $this->wpdb->prepare( $sql, $booking_id ), ARRAY_A );

		return is_array( $row ) ? $row : null;
	}

	/**
	 * One order row by id (payment paths, D-R38).
	 *
	 * @param int  $order_id   Order id.
	 * @param bool $for_update Take a row lock (only meaningful inside a transaction).
	 * @return array<string, mixed>|null
	 */
	public function find( int $order_id, bool $for_update = false ): ?array {
		$table = $this->wpdb->prefix . 'aponto_orders';
		$lock  = $for_update ? ' FOR UPDATE' : '';
		$sql   = "SELECT * FROM {$table} WHERE id = %d{$lock}";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; id bound via prepare().
		$row = $this->wpdb->get_row( $this->wpdb->prepare( $sql, $order_id ), ARRAY_A );

		return is_array( $row ) ? $row : null;
	}

	/**
	 * Replace the pre-payment coupon snapshot under the caller's order lock (D-R67b).
	 *
	 * The expected coupon identity makes this a compare-and-swap even though the caller also holds
	 * the row lock. That second belt matters on SQLite, where `FOR UPDATE` is translated away and
	 * serialization comes from the transaction/lock driver rather than this SELECT clause.
	 *
	 * @param int        $order_id          Order id.
	 * @param OrderPrice $price             Recomputed server-owned snapshot.
	 * @param int        $expected_coupon_id Previous coupon id, or 0.
	 * @param string     $expected_code      Previous snapshot code, or ''.
	 * @throws StorageException When persistence fails or the expected row changed.
	 */
	public function replaceCouponSnapshot( int $order_id, OrderPrice $price, int $expected_coupon_id, string $expected_code ): void {
		$table             = $this->wpdb->prefix . 'aponto_orders';
		$coupon_assignment = null === $price->coupon_id ? 'coupon_id = NULL' : 'coupon_id = %d';
		$sql               = "UPDATE {$table}
			SET subtotal_minor = %d, discount_minor = %d, total_minor = %d,
				currency = %s, {$coupon_assignment}, coupon_code = %s, updated_at = %s
			WHERE id = %d AND payment_status = 'none'
				AND COALESCE(coupon_id, 0) = %d AND COALESCE(coupon_code, '') = %s";
		$args              = array(
			$price->subtotal_minor,
			$price->discount_minor,
			$price->total_minor,
			$price->currency,
		);
		if ( null !== $price->coupon_id ) {
			$args[] = $price->coupon_id;
		}
		$args[] = $price->coupon_code;
		$args[] = $this->clock->nowSql();
		$args[] = $order_id;
		$args[] = max( 0, $expected_coupon_id );
		$args[] = $expected_code;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Constant table from wpdb prefix; every value is bound via prepare(); compare-and-swap under the order lock.
		$affected = $this->wpdb->query( $this->wpdb->prepare( $sql, $args ) );
		if ( false === $affected ) {
			throw StorageException::fromSqlError( esc_html( 'order coupon snapshot update' ), esc_html( (string) $this->wpdb->last_error ) );
		}
		if ( 1 !== (int) $affected ) {
			throw StorageException::because( esc_html( 'order coupon snapshot update affected no row' ) );
		}
	}

	/**
	 * The booking id an order belongs to, or 0 (V1 = one booking item per order).
	 *
	 * @param int $order_id Order id.
	 */
	public function bookingIdFor( int $order_id ): int {
		$table = $this->wpdb->prefix . 'aponto_order_items';
		$sql   = "SELECT booking_id FROM {$table} WHERE order_id = %d AND item_type = 'booking' ORDER BY id ASC LIMIT 1";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; id bound via prepare().
		return (int) $this->wpdb->get_var( $this->wpdb->prepare( $sql, $order_id ) );
	}

	/**
	 * Mark an order as an unpaid HOLD, inside the reservation transaction (D-R38b).
	 *
	 * Fail-closed like every other in-TX write: an update that touches no row means the order this
	 * attempt just created is not there, and committing a booking whose hold was never recorded
	 * would produce a slot nothing ever releases.
	 *
	 * @param int                $order_id   Order id.
	 * @param string             $gateway    Module code the customer chose.
	 * @param \DateTimeImmutable $expires_at Hold deadline (UTC).
	 * @throws StorageException When the update fails or affects no row.
	 */
	public function markHold( int $order_id, string $gateway, \DateTimeImmutable $expires_at ): void {
		$result = $this->wpdb->update(
			$this->wpdb->prefix . 'aponto_orders',
			array(
				'payment_status'  => 'pending',
				'gateway'         => $gateway,
				'hold_expires_at' => $expires_at->format( 'Y-m-d H:i:s' ),
				'updated_at'      => $this->clock->nowSql(),
			),
			array( 'id' => $order_id ),
			array( '%s', '%s', '%s', '%s' ),
			array( '%d' )
		);
		if ( false === $result ) {
			throw StorageException::fromSqlError( esc_html( 'order hold write' ), esc_html( (string) $this->wpdb->last_error ) );
		}
		if ( 0 === $result ) {
			throw StorageException::because( esc_html( 'order hold write affected no row' ) );
		}
	}

	/**
	 * Move an order to `paid`, clearing the hold — compare-and-swap on the statuses that may become
	 * paid (D-R38e).
	 *
	 * `none` is included deliberately: it is the LATE-PAYMENT case (D-R38h), where the hold already
	 * expired and the order was released before the money arrived. Recording it is right; what must
	 * not happen — and does not, because that decision lives in the caller — is resurrecting the
	 * cancelled booking.
	 *
	 * @param int    $order_id    Order id.
	 * @param string $gateway     Module code.
	 * @param string $payment_ref Gateway payment reference.
	 * @return bool Whether THIS call performed the transition.
	 * @throws StorageException When the update fails.
	 * @param string $status Settled status: paid for full payment, partial for a deposit.
	 */
	public function markPaid( int $order_id, string $gateway, string $payment_ref, string $status = 'paid' ): bool {
		// `partial` = a deposit settled with the balance still due on site (D-R71 #4).
		$status = 'partial' === $status ? 'partial' : 'paid';
		$table  = $this->wpdb->prefix . 'aponto_orders';
		$sql    = "UPDATE {$table} SET payment_status = %s, gateway = %s, transaction_ref = %s, hold_expires_at = NULL, updated_at = %s"
			. " WHERE id = %d AND payment_status IN ( 'none', 'pending' )";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare(); compare-and-swap.
		$affected = $this->wpdb->query( $this->wpdb->prepare( $sql, $status, $gateway, $payment_ref, $this->clock->nowSql(), $order_id ) );
		if ( false === $affected ) {
			throw StorageException::fromSqlError( esc_html( 'order paid write' ), esc_html( (string) $this->wpdb->last_error ) );
		}

		return (int) $affected > 0;
	}

	/**
	 * Release an unpaid hold: `pending → none`, hold cleared — compare-and-swap (D-R38g/k).
	 *
	 * The `payment_status = 'pending'` term is what makes the expiry cron safe to race with a
	 * payment: an order that became `paid` between selection and this statement is not touched, and
	 * the caller learns that from the affected-row count rather than from a read it took earlier.
	 *
	 * @param int $order_id Order id.
	 * @return bool Whether THIS call released the hold.
	 * @throws StorageException When the update fails.
	 */
	public function releaseHold( int $order_id ): bool {
		$table = $this->wpdb->prefix . 'aponto_orders';
		$sql   = "UPDATE {$table} SET payment_status = 'none', hold_expires_at = NULL, updated_at = %s"
			. " WHERE id = %d AND payment_status = 'pending'";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare(); compare-and-swap.
		$affected = $this->wpdb->query( $this->wpdb->prepare( $sql, $this->clock->nowSql(), $order_id ) );
		if ( false === $affected ) {
			throw StorageException::fromSqlError( esc_html( 'order hold release' ), esc_html( (string) $this->wpdb->last_error ) );
		}

		return (int) $affected > 0;
	}

	/**
	 * Apply the manual Q9 payment switch, clearing the hold in the SAME statement (Codex #3).
	 *
	 * Compare-and-swap on the status the caller read under the lock, so an order that moved in
	 * between is not overwritten. A manual `paid` also ends the hold — done here rather than in a
	 * second best-effort write, because a failure there was swallowed and left the expiry cron
	 * looking at a live deadline for an order somebody had already paid for by phone.
	 *
	 * @param int    $order_id Order id.
	 * @param string $status   `none` or `paid`.
	 * @param string $expected The status read under the lock.
	 * @throws StorageException When the update fails or affects no row.
	 */
	public function markManualPaymentStatus( int $order_id, string $status, string $expected ): void {
		$table = $this->wpdb->prefix . 'aponto_orders';
		$sql   = "UPDATE {$table} SET payment_status = %s, hold_expires_at = NULL, updated_at = %s WHERE id = %d AND payment_status = %s";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare(); compare-and-swap.
		$affected = $this->wpdb->query( $this->wpdb->prepare( $sql, $status, $this->clock->nowSql(), $order_id, $expected ) );
		if ( false === $affected ) {
			throw StorageException::fromSqlError( esc_html( 'order manual payment status write' ), esc_html( (string) $this->wpdb->last_error ) );
		}
		if ( 0 === (int) $affected ) {
			throw StorageException::because( esc_html( 'order manual payment status write affected no row' ) );
		}
	}

	/**
	 * Clear a hold without changing the payment status (the manual `paid` PATCH — D-R38i).
	 *
	 * @param int $order_id Order id.
	 * @throws StorageException When the update fails.
	 */
	public function clearHold( int $order_id ): void {
		$table = $this->wpdb->prefix . 'aponto_orders';
		$sql   = "UPDATE {$table} SET hold_expires_at = NULL, updated_at = %s WHERE id = %d AND hold_expires_at IS NOT NULL";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		$affected = $this->wpdb->query( $this->wpdb->prepare( $sql, $this->clock->nowSql(), $order_id ) );
		if ( false === $affected ) {
			throw StorageException::fromSqlError( esc_html( 'order hold clear' ), esc_html( (string) $this->wpdb->last_error ) );
		}
	}

	/**
	 * Move a paid order to `partial` or `refunded` after a refund settles (founder Q6).
	 *
	 * ### ZERO AFFECTED ROWS IS TWO DIFFERENT FACTS (D-R40h, QA run 2 FINDING-2)
	 *
	 * MySQL counts CHANGED rows, not matched ones (no `CLIENT_FOUND_ROWS`), so an UPDATE that finds
	 * its row and writes the values already there reports 0 — indistinguishable, from the return
	 * value alone, from the compare-and-swap guard refusing an order that is no longer `paid`/
	 * `partial`. Treating both as a failure is what turned an ordinary partial refund into a `500`:
	 * Stripe delivers `refund.created`, `charge.refunded` and `charge.refund.updated` for one refund
	 * inside the SAME SECOND, the siblings re-derive the same `partial` status, and `updated_at` —
	 * second-resolution — does not move either, so nothing changes and the whole webhook was answered
	 * "storage write failed". The money was always right; only the answer was wrong, and a sustained
	 * 5xx is how a gateway decides to disable an endpoint.
	 *
	 * So a 0 is RESOLVED rather than assumed: the row is read back, and only a row that already
	 * carries exactly the status this call asked for is accepted. Every other state — a vanished
	 * order, a `pending`/`failed`/`refunded` one the guard genuinely refused — still raises, so the
	 * check keeps the meaning it was written for and loses only the false alarm. The read is safe
	 * because every caller holds the per-order lock, and it costs one SELECT on the rare path.
	 *
	 * @param int    $order_id Order id.
	 * @param string $status   `partial` or `refunded`.
	 * @throws StorageException When the update fails, or affects no row and the row does not already
	 *                          carry the requested status.
	 */
	public function markRefundStatus( int $order_id, string $status ): void {
		$table = $this->wpdb->prefix . 'aponto_orders';
		$sql   = "UPDATE {$table} SET payment_status = %s, updated_at = %s WHERE id = %d AND payment_status IN ( 'paid', 'partial' )";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare(); compare-and-swap.
		$affected = $this->wpdb->query( $this->wpdb->prepare( $sql, $status, $this->clock->nowSql(), $order_id ) );
		if ( false === $affected ) {
			throw StorageException::fromSqlError( esc_html( 'order refund status write' ), esc_html( (string) $this->wpdb->last_error ) );
		}
		if ( 0 !== (int) $affected ) {
			return;
		}

		$row = $this->find( $order_id );
		if ( is_array( $row ) && $status === (string) $row['payment_status'] ) {
			return;
		}

		throw StorageException::because( esc_html( 'order refund status write affected no row' ) );
	}

	/**
	 * Ids of orders whose unpaid hold expired before a cutoff, oldest first (D-R38g).
	 *
	 * The cutoff carries the GRACE (`expires_at + 5 min`) rather than this method applying one, so
	 * the policy lives with the cron that owns it and this stays a plain bounded scan — the
	 * `CleanupRunner::autoCancelPending()` shape.
	 *
	 * ### THE BACKOFF IS FILTERED HERE, NOT IN THE CALLER (verify round 2)
	 *
	 * D-R40c backs an ESCALATED order off to hourly retries, and the caller used to implement that by
	 * skipping rows this method had already returned — which is a starvation bug the moment there are
	 * more escalated orders than the batch is wide: a gateway outage leaves 100 unresolved holds with
	 * the lowest ids, every tick selects exactly those 100, skips all of them, and the 101st hold is
	 * never voided, released or escalated again. A skip AFTER a `LIMIT` is not a skip, it is a batch
	 * that does nothing; the marker therefore participates in the query, as an ANTI-JOIN against the
	 * backoff window, and the limit is spent on orders that are actually eligible. Both joins are
	 * LEFT joins on purpose: an order with no booking item has no marker and must stay in the scan.
	 *
	 * @param string $cutoff       UTC `Y-m-d H:i:s`; holds that expired before this are due.
	 * @param int    $limit        Maximum ids to return.
	 * @param string $retry_before UTC `Y-m-d H:i:s`; an escalated order is eligible again only when
	 *                             its `payments.void_unresolved` marker is at or before this stamp.
	 *                             '' disables the filter (every expired hold is returned).
	 * @param int    $after_id     Return only orders with a greater id (the caller's page cursor;
	 *                             used with `$retry_before` only).
	 * @return list<int>
	 */
	public function expiredHoldIds( string $cutoff, int $limit, string $retry_before = '', int $after_id = 0 ): array {
		$p = $this->wpdb->prefix;

		if ( '' === $retry_before ) {
			$sql = "SELECT DISTINCT o.id FROM {$p}aponto_orders o INNER JOIN {$p}aponto_order_items oi ON oi.order_id = o.id AND oi.item_type = 'booking' INNER JOIN {$p}aponto_bookings b ON b.id = oi.booking_id AND b.status = 'pending' WHERE o.payment_status = 'pending' AND o.hold_expires_at IS NOT NULL AND o.hold_expires_at < %s ORDER BY o.id ASC LIMIT %d";
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
			$ids = $this->wpdb->get_col( $this->wpdb->prepare( $sql, $cutoff, max( 1, $limit ) ) );

			return array_map( 'intval', is_array( $ids ) ? $ids : array() );
		}

		$sql = "SELECT DISTINCT o.id FROM {$p}aponto_orders o
			LEFT JOIN {$p}aponto_order_items oi ON oi.order_id = o.id AND oi.item_type = 'booking'
			INNER JOIN {$p}aponto_bookings b ON b.id = oi.booking_id AND b.status = 'pending'
			LEFT JOIN {$p}aponto_booking_meta bm ON bm.booking_id = oi.booking_id AND bm.meta_key = %s AND bm.meta_value > %s
			WHERE o.payment_status = 'pending' AND o.hold_expires_at IS NOT NULL
			AND o.hold_expires_at < %s AND bm.id IS NULL AND o.id > %d
			ORDER BY o.id ASC LIMIT %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; values bound via prepare().
		$ids = $this->wpdb->get_col( $this->wpdb->prepare( $sql, self::VOID_UNRESOLVED_META_KEY, $retry_before, $cutoff, max( 0, $after_id ), max( 1, $limit ) ) );

		return array_map( 'intval', is_array( $ids ) ? $ids : array() );
	}

	/**
	 * Ids of live unpaid holds that are old enough to deserve a reminder (D-R38j).
	 *
	 * "Old enough" is measured against the order's own `updated_at`, which the hold write sets and
	 * which nothing else moves while the order stays `pending` — so it IS the moment the hold was
	 * created, without a new column and without depending on `payments.hold_minutes`, a setting the
	 * operator can change between the hold and the tick.
	 *
	 * @param string $created_before UTC `Y-m-d H:i:s`; holds created before this are eligible.
	 * @param string $alive_after    UTC `Y-m-d H:i:s`; holds expiring after this are still alive.
	 * @param int    $limit          Maximum ids to return.
	 * @return list<int>
	 */
	public function remindableHoldIds( string $created_before, string $alive_after, int $limit ): array {
		$p = $this->wpdb->prefix;
		// ANTI-JOIN on the reminder marker (Codex #14). Without it an order whose reminder was
		// SUPPRESSED — the template switched off, the flood cap reached — has no ledger row, so it
		// re-entered every batch forever and the 50 slots went to the same orders while newer holds
		// were never looked at. The marker is written on any DEFINITIVE outcome, so only a genuine
		// failure leaves an order eligible again.
		$sql = "SELECT o.id FROM {$p}aponto_orders o
			INNER JOIN {$p}aponto_order_items oi ON oi.order_id = o.id AND oi.item_type = 'booking'
			INNER JOIN {$p}aponto_bookings b ON b.id = oi.booking_id AND b.status = 'pending'
			LEFT JOIN {$p}aponto_booking_meta bm ON bm.booking_id = oi.booking_id AND bm.meta_key = %s
			WHERE o.payment_status = 'pending' AND o.hold_expires_at IS NOT NULL
			AND o.hold_expires_at > %s AND o.updated_at <= %s AND bm.id IS NULL
			ORDER BY o.id ASC LIMIT %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; values bound via prepare().
		$ids = $this->wpdb->get_col( $this->wpdb->prepare( $sql, self::REMINDED_META_KEY, $alive_after, $created_before, max( 1, $limit ) ) );

		return array_map( 'intval', is_array( $ids ) ? $ids : array() );
	}

	/**
	 * Whether any order still holds an unpaid slot — the cron's scheduling predicate (D-R38g).
	 *
	 * @return bool
	 */
	public function hasPendingHold(): bool {
		$table = $this->wpdb->prefix . 'aponto_orders';
		$sql   = "SELECT COUNT(*) FROM {$table} WHERE payment_status = 'pending' AND hold_expires_at IS NOT NULL";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; no user input.
		return (int) $this->wpdb->get_var( $sql ) > 0;
	}

	/**
	 * Whether the payments tick still has ANY reason to exist (orchestrator finding, D-R38g).
	 *
	 * Deliberately WIDER than {@see self::hasPendingHold()}, because this predicate is what decides
	 * to UNSCHEDULE the tick and the cost of the two mistakes is not symmetric: keeping the event a
	 * few minutes too long costs one query every five minutes, while clearing it one moment too early
	 * strands a live hold with nothing to release it. Three reasons to stay armed:
	 *
	 *  1. a live unpaid hold — the obvious one;
	 *  2. a charge attempt still in flight (`pending` or `voiding`) — an intent nobody has resolved;
	 *  3. a payment-relevant order created in the last few minutes — the race the review found. A
	 *     tick that read "no work", was overtaken by a request committing a hold, and then cleared the
	 *     hook would leave that hold with no owner forever. The hold's own order is by definition
	 *     newer than the cutoff at the moment of the clear, so this clause closes the window.
	 *
	 * Scoped to orders that could plausibly be payments (a gateway, a hold, or a `pending` status) so
	 * a high-volume site taking no online payments does not keep the tick alive on booking traffic
	 * alone.
	 *
	 * @param string $recent_cutoff UTC `Y-m-d H:i:s`; orders newer than this keep the tick armed.
	 * @param string $now           UTC `Y-m-d H:i:s`.
	 */
	public function hasOpenPaymentWork( string $recent_cutoff, string $now ): bool {
		$p   = $this->wpdb->prefix;
		$sql = "SELECT COUNT(*) FROM {$p}aponto_orders o WHERE
			( o.payment_status = 'pending' AND o.hold_expires_at IS NOT NULL )
			OR ( o.hold_expires_at IS NOT NULL AND o.hold_expires_at > %s )
			OR ( o.created_at > %s AND ( o.gateway <> '' OR o.payment_status = 'pending' OR o.hold_expires_at IS NOT NULL ) )
			OR EXISTS (
				SELECT 1 FROM {$p}aponto_transactions t
				WHERE t.order_id = o.id AND t.kind = 'charge' AND t.status IN ( 'pending', 'voiding' )
			)";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; values bound via prepare().
		return (int) $this->wpdb->get_var( $this->wpdb->prepare( $sql, $now, $recent_cutoff ) ) > 0;
	}

	/**
	 * Delete every order and order item attached to a booking.
	 *
	 * @param int $booking_id Booking id.
	 * @return list<int> Deleted order IDs; the caller publishes only after commit.
	 * @throws StorageException When any delete fails or a resolved order vanishes.
	 */
	public function deleteForBooking( int $booking_id ): array {
		$items = $this->wpdb->prefix . 'aponto_order_items';
		$sql   = "SELECT DISTINCT order_id FROM {$items} WHERE booking_id = %d FOR UPDATE";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; booking id bound via prepare().
		$order_ids = $this->wpdb->get_col( $this->wpdb->prepare( $sql, $booking_id ) );
		if ( '' !== (string) $this->wpdb->last_error ) {
			throw StorageException::fromSqlError( esc_html( 'booking orders read' ), esc_html( (string) $this->wpdb->last_error ) );
		}

		foreach ( $order_ids as $raw_order_id ) {
			$order_id = (int) $raw_order_id;
			$result   = $this->wpdb->delete( $items, array( 'order_id' => $order_id ), array( '%d' ) );
			if ( false === $result ) {
				throw StorageException::fromSqlError( esc_html( 'order items delete' ), esc_html( (string) $this->wpdb->last_error ) );
			}
			if ( 0 === $result ) {
				throw StorageException::because( esc_html( 'order items delete affected no row' ) );
			}

			$result = $this->wpdb->delete(
				$this->wpdb->prefix . 'aponto_orders',
				array( 'id' => $order_id ),
				array( '%d' )
			);
			if ( false === $result ) {
				throw StorageException::fromSqlError( esc_html( 'order delete' ), esc_html( (string) $this->wpdb->last_error ) );
			}
			if ( 0 === $result ) {
				throw StorageException::because( esc_html( 'order delete affected no row' ) );
			}
		}
		return array_values( array_map( 'intval', $order_ids ) );
	}

	/**
	 * Whether an order code exists after an INSERT failure.
	 *
	 * Reading back the exact unique key is portable and does not reach into
	 * `wpdb`'s private mysqli handle.
	 *
	 * @param string $code Candidate public order code.
	 */
	private function codeExists( string $code ): bool {
		$table = $this->wpdb->prefix . 'aponto_orders';
		$sql   = $this->wpdb->prepare(
			'SELECT 1 FROM %i WHERE code = %s LIMIT 1',
			$table,
			$code
		);
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared -- Identifier and value are bound above; collision read-back on the exact unique key.
		$value = $this->wpdb->get_var( $sql );

		return '1' === (string) $value;
	}
}

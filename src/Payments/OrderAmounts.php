<?php
/**
 * The single reader of an order's derived money facts (D-R71).
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
 * Payable now, net collected, balance due and the payment reason — derived, never stored.
 *
 * Every surface that shows or acts on these values reads them here, so an order can never be
 * "deposit paid" on one screen and "partly refunded" on another (D-R71 #4). Pure functions over the
 * order row and its ledger totals; no I/O.
 *
 * Ledger totals are `{charged, onsite, refunded}`: Σ succeeded `charge`, Σ succeeded `onsite`, Σ
 * succeeded `refund` ({@see TransactionRepository::ledgerTotals()}).
 */
final class OrderAmounts {

	/** Reasons, evaluated in this order (rest-contract §10.3). */
	public const REASONS = array( 'pending', 'none', 'paid', 'refunded', 'deposit_paid', 'deposit_partially_refunded', 'partially_refunded' );

	/**
	 * The order total.
	 *
	 * @param array<string, mixed> $order Order row.
	 */
	public static function total( array $order ): int {
		return max( 0, (int) ( $order['total_minor'] ?? 0 ) );
	}

	/**
	 * What the gateway is asked for: the stored deposit, or the total (`NULL` = full payment).
	 *
	 * A stored value that no longer fits the total (it never should) falls back to the total rather
	 * than charging a wrong amount.
	 *
	 * @param array<string, mixed> $order Order row.
	 */
	public static function payableNow( array $order ): int {
		$total = self::total( $order );
		$raw   = $order['payable_now_minor'] ?? null;
		if ( null === $raw || '' === $raw ) {
			return $total;
		}
		$value = (int) $raw;

		return $value > 0 && $value < $total ? $value : $total;
	}

	/**
	 * Whether the order charges a proper part of its total online.
	 *
	 * @param array<string, mixed> $order Order row.
	 */
	public static function isDeposit( array $order ): bool {
		$payable = self::payableNow( $order );

		return $payable > 0 && $payable < self::total( $order );
	}

	/**
	 * Net money held for the order.
	 *
	 * @param array{charged?: int, onsite?: int, refunded?: int} $ledger Ledger totals.
	 */
	public static function netCollected( array $ledger ): int {
		return max( 0, (int) ( $ledger['charged'] ?? 0 ) + (int) ( $ledger['onsite'] ?? 0 ) - (int) ( $ledger['refunded'] ?? 0 ) );
	}

	/**
	 * Net collected for display, including a legacy manual "paid" mark (Q9) that has no ledger row.
	 *
	 * @param array<string, mixed>                               $order  Order row.
	 * @param array{charged?: int, onsite?: int, refunded?: int} $ledger Ledger totals.
	 */
	public static function effectiveCollected( array $order, array $ledger ): int {
		$net = self::netCollected( $ledger );
		if ( 0 === $net && self::noLedger( $ledger ) && 'paid' === (string) ( $order['payment_status'] ?? '' ) ) {
			return self::total( $order );
		}

		return $net;
	}

	/**
	 * What is still owed.
	 *
	 * @param array<string, mixed>                               $order  Order row.
	 * @param array{charged?: int, onsite?: int, refunded?: int} $ledger Ledger totals.
	 */
	public static function balanceDue( array $order, array $ledger ): int {
		return max( 0, self::total( $order ) - self::effectiveCollected( $order, $ledger ) );
	}

	/**
	 * The derived payment reason (rest-contract §10.3) — first match wins.
	 *
	 * @param array<string, mixed>                               $order  Order row.
	 * @param array{charged?: int, onsite?: int, refunded?: int} $ledger Ledger totals.
	 */
	public static function reason( array $order, array $ledger ): string {
		$status = (string) ( $order['payment_status'] ?? 'none' );
		if ( 'pending' === $status ) {
			return 'pending';
		}
		$charged  = (int) ( $ledger['charged'] ?? 0 );
		$onsite   = (int) ( $ledger['onsite'] ?? 0 );
		$refunded = (int) ( $ledger['refunded'] ?? 0 );
		if ( 0 === $charged && 0 === $onsite ) {
			// A manual Q9 mark (no gateway, no ledger) keeps its stored meaning.
			return in_array( $status, array( 'paid', 'refunded' ), true ) ? $status : 'none';
		}
		$net = self::netCollected( $ledger );
		if ( $net >= self::total( $order ) ) {
			return 'paid';
		}
		if ( 0 === $net ) {
			return 'refunded';
		}
		if ( self::isDeposit( $order ) ) {
			return $refunded > 0 ? 'deposit_partially_refunded' : 'deposit_paid';
		}

		return $refunded > 0 ? 'partially_refunded' : 'paid';
	}

	/**
	 * The stored `payment_status` the ledger implies once money has settled.
	 *
	 * @param array<string, mixed>                               $order  Order row.
	 * @param array{charged?: int, onsite?: int, refunded?: int} $ledger Ledger totals.
	 */
	public static function settledStatus( array $order, array $ledger ): string {
		$net = self::netCollected( $ledger );
		if ( $net >= self::total( $order ) && $net > 0 ) {
			return 'paid';
		}

		return 0 === $net ? 'refunded' : 'partial';
	}

	/**
	 * The additive read model every order DTO carries (rest-contract §10.2).
	 *
	 * @param array<string, mixed>                               $order  Order row.
	 * @param array{charged?: int, onsite?: int, refunded?: int} $ledger Ledger totals.
	 * @return array{payable_now_minor: int, balance_on_site_minor: int, net_collected_minor: int, balance_due_minor: int, payment_state_reason: string}
	 */
	public static function readModel( array $order, array $ledger ): array {
		return array(
			'payable_now_minor'     => self::payableNow( $order ),
			'balance_on_site_minor' => max( 0, self::total( $order ) - self::payableNow( $order ) ),
			'net_collected_minor'   => self::effectiveCollected( $order, $ledger ),
			'balance_due_minor'     => self::balanceDue( $order, $ledger ),
			'payment_state_reason'  => self::reason( $order, $ledger ),
		);
	}

	/**
	 * Whether no money row of any kind has settled.
	 *
	 * @param array{charged?: int, onsite?: int, refunded?: int} $ledger Ledger totals.
	 */
	private static function noLedger( array $ledger ): bool {
		return 0 === (int) ( $ledger['charged'] ?? 0 ) && 0 === (int) ( $ledger['onsite'] ?? 0 ) && 0 === (int) ( $ledger['refunded'] ?? 0 );
	}
}

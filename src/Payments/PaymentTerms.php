<?php
/**
 * How much of an order is charged online now (D-R71).
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
 * Immutable payment terms resolved after the coupon stage.
 *
 * `none` = nothing to charge (total 0), `full` = the whole total online, `deposit` = a proper part of
 * the total online now and the rest later. Deposits never change the total; they only change what
 * the gateway is asked for.
 */
final class PaymentTerms {

	public const NONE    = 'none';
	public const FULL    = 'full';
	public const DEPOSIT = 'deposit';

	/**
	 * Build terms.
	 *
	 * @param string $kind              One of the class constants.
	 * @param int    $payable_now_minor Amount charged online now, minor units.
	 * @param bool   $allow_full_payment Whether the customer may choose the full total.
	 * @param bool   $requires_online_payment Whether selected terms require an online method.
	 * @throws \InvalidArgumentException When the kind is unknown or the amount negative.
	 */
	public function __construct(
		public readonly string $kind,
		public readonly int $payable_now_minor,
		public readonly bool $allow_full_payment = false,
		public readonly bool $requires_online_payment = false
	) {
		if ( ! in_array( $kind, array( self::NONE, self::FULL, self::DEPOSIT ), true ) || $payable_now_minor < 0 ) {
			throw new \InvalidArgumentException( 'Payment terms are invalid.' );
		}
	}

	/**
	 * The default terms for a price: everything online, or nothing when the total is zero.
	 *
	 * @param OrderPrice $price Coupon-adjusted price.
	 */
	public static function fullFor( OrderPrice $price ): self {
		return $price->total_minor > 0 ? new self( self::FULL, $price->total_minor ) : new self( self::NONE, 0 );
	}

	/**
	 * A deposit of `$amount_minor`.
	 *
	 * @param int $amount_minor Deposit amount.
	 */
	public static function deposit( int $amount_minor ): self {
		return new self( self::DEPOSIT, $amount_minor );
	}

	/** Whether these terms charge a proper part of the total. */
	public function isDeposit(): bool {
		return self::DEPOSIT === $this->kind;
	}

	/**
	 * Whether these terms are internally consistent with a total.
	 *
	 * @param int $total_minor Order total.
	 */
	public function fits( int $total_minor ): bool {
		return ( self::NONE === $this->kind && 0 === $total_minor && 0 === $this->payable_now_minor )
			|| ( self::FULL === $this->kind && $total_minor > 0 && $this->payable_now_minor === $total_minor )
			|| ( self::DEPOSIT === $this->kind && $this->payable_now_minor > 0 && $this->payable_now_minor < $total_minor );
	}
	/** Whether policy requires an online method, including an explicit full choice. */
	public function requiresOnlinePayment(): bool {
		return $this->isDeposit() || $this->requires_online_payment;
	}

	/**
	 * Serialize server-owned amounts and the optional full-payment alternative.
	 *
	 * @param OrderPrice $price Final commercial price.
	 * @return array<string,mixed>
	 */
	public function preview( OrderPrice $price ): array {
		$preview = array(
			'kind'              => $this->kind,
			'total_minor'       => $price->total_minor,
			'payable_now_minor' => $this->payable_now_minor,
			'balance_minor'     => $price->total_minor - $this->payable_now_minor,
		);
		if ( $this->isDeposit() && $this->allow_full_payment ) {
			$preview['allow_full_payment'] = true;
			$preview['full_payment_terms'] = self::fullFor( $price )->preview( $price );
		}
		return $preview;
	}
}

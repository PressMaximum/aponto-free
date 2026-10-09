<?php
/**
 * Server-owned order pricing seam (D-R67).
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
 * Resolves the final order snapshot before the payment core sees it. Coupon code is the only
 * customer input; every amount is recomputed from the live service and coupon rows on the server.
 */
final class OrderPricing {

	/**
	 * Canonical coupon code shape: 4–64 of `A-Z 0-9 _ -`, starting alphanumeric (D-R67n). The
	 * four-character floor keeps the code space too large to walk under the wrong-code backoff.
	 */
	public const CODE_PATTERN = '/^[A-Z0-9][A-Z0-9_-]{3,63}$/';

	/**
	 * Normalize a coupon identity without changing its semantic characters.
	 *
	 * @param mixed $raw Customer-supplied code.
	 * @return string Canonical code.
	 */
	public static function normalizeCouponCode( mixed $raw ): string {
		if ( ! is_string( $raw ) ) {
			return '';
		}

		return strtoupper( trim( $raw ) );
	}

	/** Whether an enabled module currently owns the coupon pricing hook. */
	public static function couponsAvailable(): bool {
		return (bool) apply_filters( 'aponto_coupons_available', false );
	}

	/**
	 * Resolve a quote; `$claim` atomically consumes one use inside the caller's write transaction.
	 *
	 * @param int|null                $price_minor Service price in minor units.
	 * @param string                  $currency ISO currency code.
	 * @param string                  $coupon_code Optional coupon code.
	 * @param bool                    $claim Whether to consume a use.
	 * @param int                     $service_id Server-owned service identity.
	 * @param int                     $user_id Server-owned WordPress user identity, or 0 when unknown.
	 * @param \DateTimeImmutable|null $now The CALLER's clock instant, so validity windows are read
	 *                                     through the injected `Support\Clock` (D-R67j). Null = now.
	 * @return OrderPrice Server-owned price snapshot.
	 * @throws CouponUnavailable When a submitted code cannot be applied.
	 */
	public static function quote( ?int $price_minor, string $currency, string $coupon_code = '', bool $claim = false, int $service_id = 0, int $user_id = 0, ?\DateTimeImmutable $now = null ): OrderPrice {
		$base = OrderPrice::base( $price_minor, $currency );
		$code = self::normalizeCouponCode( $coupon_code );
		if ( '' === $code ) {
			return $base;
		}
		if ( 1 !== preg_match( self::CODE_PATTERN, $code ) ) {
			throw new CouponUnavailable();
		}

		/**
		 * Filter the order price through the enabled coupon provider.
		 *
		 * @param OrderPrice $base  Server-owned service price.
		 * @param string     $code  Canonical coupon code.
		 * @param bool       $claim Whether to consume a use in the current transaction.
		 * @param int        $service_id Server-owned service id.
		 * @param int        $user_id Server-owned WordPress user id, or 0.
		 * @param \DateTimeImmutable $now The caller's clock instant (validity windows, D-R67j).
		 */
		$quoted = apply_filters( 'aponto_order_price', $base, $code, $claim, max( 0, $service_id ), max( 0, $user_id ), $now ?? new \DateTimeImmutable( 'now', new \DateTimeZone( 'UTC' ) ) );
		if ( ! $quoted instanceof OrderPrice
			|| $quoted->subtotal_minor !== $base->subtotal_minor
			|| $quoted->currency !== $base->currency
			|| $quoted->total_minor < 0
			|| $quoted->total_minor > $base->subtotal_minor
			|| $quoted->discount_minor !== $base->subtotal_minor - $quoted->total_minor
			|| null === $quoted->coupon_id
			|| $quoted->coupon_id < 1
			|| $quoted->coupon_code !== $code
		) {
			throw new CouponUnavailable();
		}

		return $quoted;
	}

	/**
	 * Resolve how much of a priced order is charged online now (D-R71, D-R71a).
	 *
	 * Runs AFTER {@see self::quote()}, on the coupon-adjusted total. Core decides the cases where no
	 * deposit may apply before any callback runs — admin scope, payments off, no gateway offered, an
	 * external checkout gateway that owns checkout — and
	 * validates whatever the `aponto_order_payment_terms` filter returns: anything that is not a
	 * proper part of the total, not chargeable in the currency, or below the gateways' minimum falls
	 * back to full payment. A deposit therefore never refuses a booking (D-R71 #7).
	 *
	 * @param OrderPrice     $price   Coupon-adjusted price snapshot.
	 * @param PricingContext $context Server-owned facts.
	 * @throws PaymentChoiceUnavailable When the applicable policy disallows full payment.
	 */
	public static function terms( OrderPrice $price, PricingContext $context ): PaymentTerms {
		$default = PaymentTerms::fullFor( $price );
		if ( PaymentTerms::FULL !== $default->kind
			|| PricingContext::SCOPE_ADMIN === $context->scope
			|| 'off' === $context->payments_mode
			|| ! $context->gateway_offered
			|| $context->external_exclusive
		) {
			return $default;
		}

		/**
		 * Filter the payment terms of a priced order (D-R71).
		 *
		 * @param PaymentTerms   $default Full payment of the coupon-adjusted total.
		 * @param OrderPrice     $price   Coupon-adjusted price snapshot.
		 * @param PricingContext $context Server-owned facts.
		 */
		$terms = apply_filters( 'aponto_order_payment_terms', $default, $price, $context );
		if ( ! $terms instanceof PaymentTerms || ! $terms->fits( $price->total_minor ) ) {
			do_action( 'aponto_payment_terms_invalid' );
			return $default;
		}
		if ( $terms->isDeposit()
			&& ( $terms->payable_now_minor < $context->gateway_minimum_minor
				|| ! ChargeableAmount::isChargeable( $terms->payable_now_minor, $price->currency ) )
		) {
			return $default;
		}

		if ( $terms->isDeposit() && 'full' === $context->amount_mode ) {
			if ( ! $terms->allow_full_payment ) {
				throw new PaymentChoiceUnavailable();
			}
			return new PaymentTerms( PaymentTerms::FULL, $price->total_minor, false, true );
		}
		return $terms;
	}
}

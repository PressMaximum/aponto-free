<?php
/**
 * The smallest amount step a gateway can actually charge, per currency (D-R67c).
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

use Aponto\Payments\Stripe\Money;

/**
 * Gateway-neutral granularity of a chargeable total, in Aponto minor units.
 *
 * A discount computed by plain integer arithmetic can leave a total no gateway will accept: KWD
 * 1010 minus 10 % is 909 thousandths, but Stripe settles three-decimal currencies to the hundredth
 * and refuses anything not ending in `0`; HUF, ISK, TWD and UGX must be whole major units; PayPal
 * sends HUF, JPY and TWD without decimals; MGA's ISO unit is finer than Stripe's. A coupon that
 * produces such a total books fine and then fails at the pay step — the worst place to fail.
 *
 * The step is the smallest power of ten (in our minor units) that EVERY supported gateway rule
 * accepts. {@see Money::refusalFor()} already encodes the Stripe rules and is the single source for
 * them; PayPal's whole-number currencies (HUF, TWD, JPY) coincide with Stripe's whole-major list for
 * HUF/TWD and are zero-decimal in ISO for JPY, so no second table is needed. A currency the gateway
 * table cannot express at all answers step 1: it cannot be charged online anyway, and pay-on-site
 * totals need no rounding.
 */
final class ChargeableAmount {

	/**
	 * The chargeable step for a currency (1, 10, 100 or 1000 minor units).
	 *
	 * @param string $currency ISO-4217 code, any case.
	 */
	public static function step( string $currency ): int {
		foreach ( array( 1, 10, 100, 1000 ) as $candidate ) {
			$refusal = Money::refusalFor( $candidate, $currency );
			if ( Money::UNSUPPORTED_CURRENCY === $refusal ) {
				return 1;
			}
			if ( '' === $refusal ) {
				return $candidate;
			}
		}

		return 1;
	}

	/**
	 * Whether an amount is a whole number of steps (zero always is).
	 *
	 * @param int    $amount_minor Amount in minor units.
	 * @param string $currency     ISO-4217 code.
	 */
	public static function isChargeable( int $amount_minor, string $currency ): bool {
		return 0 === $amount_minor % self::step( $currency );
	}

	/**
	 * Round a discounted TOTAL to the chargeable step without ever exceeding the subtotal.
	 *
	 * Rounds UP first (the discount never exceeds what the coupon advertises), and falls back to
	 * rounding down only when rounding up would pass the undiscounted subtotal (a subtotal that is
	 * itself off-step).
	 *
	 * @param int    $total_minor    Raw discounted total.
	 * @param int    $subtotal_minor Undiscounted subtotal (upper bound).
	 * @param string $currency       ISO-4217 code.
	 * @return int Chargeable total in `[0, subtotal]`.
	 */
	public static function roundTotal( int $total_minor, int $subtotal_minor, string $currency ): int {
		$step  = self::step( $currency );
		$total = max( 0, min( $subtotal_minor, $total_minor ) );
		if ( 1 === $step || 0 === $total % $step ) {
			return $total;
		}
		$up = intdiv( $total + $step - 1, $step ) * $step;
		if ( $up <= $subtotal_minor ) {
			return $up;
		}

		return intdiv( $total, $step ) * $step;
	}
}

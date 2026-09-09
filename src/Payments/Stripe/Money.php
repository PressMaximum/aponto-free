<?php
/**
 * Aponto minor units ⇄ Stripe's smallest currency unit (D-R39, D-R39a).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Payments\Stripe;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Support\Settings;

/**
 * The one place an order's integer amount becomes a Stripe `amount`, and back.
 *
 * ### Why this is not `/100`
 *
 * Aponto stores money in ISO-4217 minor units ({@see Settings::currencyExponent()}); Stripe takes
 * "the smallest currency unit" as ITS OWN table defines it, and the two tables do not agree. D-R39
 * assumed they did ("amounts convert through `Settings::currencyExponent()` alone"); they diverge in
 * exactly two currencies, and both diverge in the direction that silently charges the wrong amount:
 *
 * - **ISK** — ISO says zero-decimal, Stripe treats it as TWO-decimal. Passing our minor units
 *   straight through would charge 5 ISK where 500 was due, i.e. one hundredth of the price.
 * - **MGA** — ISO says two-decimal, Stripe treats it as ZERO-decimal. Passing through would charge
 *   700 ariary where 7 was due, i.e. one hundred times the price.
 *
 * So the exponent Stripe uses is read from STRIPE's list, the exponent we store is read from ours,
 * and the conversion is the difference between them. A conversion that cannot be exact is REFUSED
 * rather than rounded ({@see self::refusalFor()}): rounding money is how a booking gets charged a
 * number nobody agreed to, and the customer sees a typed error instead.
 *
 * ### The divisibility rules
 *
 * Stripe additionally refuses amounts it cannot settle, and it does so with a generic
 * `invalid_request_error` that gives an operator nothing to act on. Checking them here turns a
 * confusing gateway rejection into `unsupported_amount` BEFORE any HTTP happens:
 *
 * - three-decimal currencies (BHD, JOD, KWD, OMR, TND) must end in `0`;
 * - HUF, ISK, TWD and UGX must be a whole number of major units (a multiple of 100 in Stripe's
 *   unit) — Stripe's "special cases".
 */
final class Money {

	/**
	 * Stripe's zero-decimal currencies — the amount IS the major unit.
	 *
	 * Differs from {@see Settings::currencyExponent()}'s ISO list by `MGA` (here, not there) and
	 * `ISK` (there, not here). `StripeMoneyTest` asserts that difference is exactly those two, so a
	 * future edit to either list cannot drift unnoticed.
	 *
	 * @var list<string>
	 */
	public const ZERO_DECIMAL = array(
		'BIF',
		'CLP',
		'DJF',
		'GNF',
		'JPY',
		'KMF',
		'KRW',
		'MGA',
		'PYG',
		'RWF',
		'UGX',
		'VND',
		'VUV',
		'XAF',
		'XOF',
		'XPF',
	);

	/**
	 * Stripe's three-decimal currencies. The amount is in thousandths AND its last digit must be
	 * `0`, because the networks settle these to two decimal places.
	 *
	 * @var list<string>
	 */
	public const THREE_DECIMAL = array( 'BHD', 'JOD', 'KWD', 'OMR', 'TND' );

	/**
	 * Stripe's "special cases": currencies whose amount must be a multiple of 100 in Stripe's unit,
	 * i.e. a whole number of major units. ISK is here as well as being a two-decimal exception —
	 * the multiplication makes it satisfy the rule automatically, and listing it keeps the reason
	 * visible rather than accidental.
	 *
	 * @var list<string>
	 */
	public const WHOLE_MAJOR = array( 'HUF', 'ISK', 'TWD', 'UGX' );

	/**
	 * Refusal code: the currency cannot be expressed against Stripe at all.
	 */
	public const UNSUPPORTED_CURRENCY = 'unsupported_currency';

	/**
	 * Refusal code: this amount cannot be expressed in Stripe's unit for this currency.
	 */
	public const UNSUPPORTED_AMOUNT = 'unsupported_amount';

	/**
	 * The exponent STRIPE uses for a currency (0, 2 or 3).
	 *
	 * @param string $currency ISO-4217 code, any case.
	 */
	public static function stripeExponent( string $currency ): int {
		$code = strtoupper( trim( $currency ) );

		if ( in_array( $code, self::ZERO_DECIMAL, true ) ) {
			return 0;
		}
		if ( in_array( $code, self::THREE_DECIMAL, true ) ) {
			return 3;
		}

		return 2;
	}

	/**
	 * Why this amount cannot be sent to Stripe, or `''` when it can.
	 *
	 * Called BEFORE the HTTP request, so a refusal costs nothing and carries a code an operator can
	 * act on. The order of the checks matters only in that the currency verdict comes first: an
	 * amount is meaningless until the currency is known to be expressible.
	 *
	 * @param int    $amount_minor Amount in Aponto's minor units.
	 * @param string $currency     ISO-4217 code, any case.
	 * @return string `''`, {@see self::UNSUPPORTED_CURRENCY} or {@see self::UNSUPPORTED_AMOUNT}.
	 */
	public static function refusalFor( int $amount_minor, string $currency ): string {
		$code = strtoupper( trim( $currency ) );
		if ( 1 !== preg_match( '/^[A-Z]{3}$/', $code ) ) {
			return self::UNSUPPORTED_CURRENCY;
		}

		$ours   = Settings::currencyExponent( $code );
		$theirs = self::stripeExponent( $code );

		// A currency ISO calls three-decimal that Stripe does NOT list as three-decimal (IQD, LYD) is
		// one whose Stripe exponent we would be GUESSING. Guessing wrong here is a factor-of-1000
		// error, so the honest answer is that the gateway cannot take this currency.
		if ( 3 === $ours && ! in_array( $code, self::THREE_DECIMAL, true ) ) {
			return self::UNSUPPORTED_CURRENCY;
		}

		if ( $amount_minor <= 0 ) {
			return self::UNSUPPORTED_AMOUNT;
		}

		// Our unit is FINER than Stripe's (MGA): the amount must divide exactly or the customer would
		// be charged a rounded figure.
		if ( $ours > $theirs && 0 !== $amount_minor % ( 10 ** ( $ours - $theirs ) ) ) {
			return self::UNSUPPORTED_AMOUNT;
		}

		$amount = self::toStripe( $amount_minor, $code );

		if ( 3 === $theirs && 0 !== $amount % 10 ) {
			return self::UNSUPPORTED_AMOUNT;
		}
		if ( in_array( $code, self::WHOLE_MAJOR, true ) && 0 !== $amount % 100 ) {
			return self::UNSUPPORTED_AMOUNT;
		}

		return '';
	}

	/**
	 * Aponto minor units → Stripe's smallest unit.
	 *
	 * Only meaningful for an amount {@see self::refusalFor()} has cleared; an amount that does not
	 * divide exactly truncates here, which is precisely why the refusal check is not optional.
	 *
	 * @param int    $amount_minor Amount in Aponto's minor units.
	 * @param string $currency     ISO-4217 code, any case.
	 */
	public static function toStripe( int $amount_minor, string $currency ): int {
		$code   = strtoupper( trim( $currency ) );
		$ours   = Settings::currencyExponent( $code );
		$theirs = self::stripeExponent( $code );

		if ( $theirs >= $ours ) {
			return $amount_minor * ( 10 ** ( $theirs - $ours ) );
		}

		return intdiv( $amount_minor, 10 ** ( $ours - $theirs ) );
	}

	/**
	 * Stripe's smallest unit → Aponto minor units.
	 *
	 * The direction that decides whether a payment is APPLIED: core compares the returned figure
	 * with the order total and refuses a `paid` outcome that does not match exactly, so a wrong
	 * conversion here fails closed rather than settling the wrong number.
	 *
	 * @param int    $amount   Amount in Stripe's smallest unit.
	 * @param string $currency ISO-4217 code, any case.
	 */
	public static function toMinor( int $amount, string $currency ): int {
		$code   = strtoupper( trim( $currency ) );
		$ours   = Settings::currencyExponent( $code );
		$theirs = self::stripeExponent( $code );

		if ( $ours >= $theirs ) {
			return $amount * ( 10 ** ( $ours - $theirs ) );
		}

		return intdiv( $amount, 10 ** ( $theirs - $ours ) );
	}
}

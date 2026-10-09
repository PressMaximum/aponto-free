<?php
/**
 * Authoritative external-checkout quote in integer minor units.
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

/** Immutable financial snapshot, validated before it can change a reservation. */
final class CheckoutQuote {

	/**
	 * Construct an exact quote. Unsupported negative adjustments fail closed.
	 *
	 * @param int    $subtotal_minor     External tax-exclusive line subtotal.
	 * @param int    $discount_minor Discount deducted from the base price.
	 * @param int    $tax_minor      Total tax.
	 * @param int    $fee_minor      Explicit supported fees.
	 * @param int    $total_minor    Final amount due.
	 * @param string $currency       Three-letter currency code.
	 * @param int    $source_base_minor Original reserved order total after native pricing.
	 * @throws PaymentException When arithmetic or currency is invalid.
	 */
	public function __construct(
		public readonly int $subtotal_minor,
		public readonly int $discount_minor,
		public readonly int $tax_minor,
		public readonly int $fee_minor,
		public readonly int $total_minor,
		public readonly string $currency,
		public readonly int $source_base_minor
	) {
		if ( $source_base_minor < 0 || max( $source_base_minor, $subtotal_minor, $discount_minor, $tax_minor, $fee_minor, $total_minor ) > 2147483647 || $subtotal_minor + $tax_minor + $fee_minor > 2147483647 || $subtotal_minor < 0 || $discount_minor < 0 || $discount_minor > $subtotal_minor
			|| $tax_minor < 0 || $fee_minor < 0 || $total_minor < 0
			|| 1 !== preg_match( '/^[A-Z]{3}$/D', $currency )
			|| $subtotal_minor - $discount_minor + $tax_minor + $fee_minor !== $total_minor ) {
			throw PaymentException::state();
		}
	}

	/**
	 * Financial audit data only; never billing details or bearer credentials.
	 *
	 * @return array<string, int|string>
	 */
	public function toArray(): array {
		return array(
			'source_base_minor' => $this->source_base_minor,
			'subtotal_minor'    => $this->subtotal_minor,
			'discount_minor'    => $this->discount_minor,
			'tax_minor'         => $this->tax_minor,
			'fee_minor'         => $this->fee_minor,
			'total_minor'       => $this->total_minor,
			'currency'          => $this->currency,
		);
	}
}

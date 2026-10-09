<?php
/**
 * Immutable order-price snapshot (D-R67).
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
 * Carries the server-owned price from service lookup to the order insert. A coupon may only reduce
 * the total; it never changes the source subtotal or currency and the browser never supplies an
 * amount. The coupon identity is a snapshot so later edits cannot rewrite an existing order.
 */
final class OrderPrice {

	/**
	 * Construct a validated snapshot.
	 *
	 * @param int      $subtotal_minor Original service price.
	 * @param int      $discount_minor Applied discount.
	 * @param int      $total_minor    Final amount due.
	 * @param string   $currency       ISO currency code.
	 * @param int|null $coupon_id      Applied coupon id.
	 * @param string   $coupon_code    Applied coupon code snapshot.
	 */
	private function __construct(
		public readonly int $subtotal_minor,
		public readonly int $discount_minor,
		public readonly int $total_minor,
		public readonly string $currency,
		public readonly ?int $coupon_id = null,
		public readonly string $coupon_code = ''
	) {}

	/**
	 * Build a base price before optional adjustments.
	 *
	 * @param int|null $price_minor Service price in minor units.
	 * @param string   $currency    ISO currency code.
	 * @return self Base price snapshot.
	 */
	public static function base( ?int $price_minor, string $currency ): self {
		$subtotal = max( 0, (int) ( $price_minor ?? 0 ) );

		return new self( $subtotal, 0, $subtotal, strtoupper( $currency ) );
	}

	/**
	 * Return a coupon-adjusted copy.
	 *
	 * @param int    $coupon_id     Applied coupon id.
	 * @param string $coupon_code   Applied coupon code.
	 * @param int    $discount_minor Discount in minor units.
	 * @return self Discounted snapshot.
	 */
	public function withCoupon( int $coupon_id, string $coupon_code, int $discount_minor ): self {
		$discount = max( 0, min( $this->subtotal_minor, $discount_minor ) );

		return new self(
			$this->subtotal_minor,
			$discount,
			$this->subtotal_minor - $discount,
			$this->currency,
			$coupon_id,
			$coupon_code
		);
	}
}

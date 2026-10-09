<?php
/**
 * Server-owned facts the payment-terms stage may use (D-R71).
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

use Aponto\Support\Settings;

/**
 * Immutable context for `aponto_order_payment_terms`.
 *
 * Built by core from the site, never from the request: a browser cannot make a deposit apply or
 * disappear. `gateway_minimum_minor` is the HIGHEST minimum declared by the offered gateways, so a
 * deposit that one of them could not charge is never computed (D-R71a P2).
 */
final class PricingContext {

	/** A customer booking: terms determine whether an online payment method is required. */
	public const SCOPE_PUBLIC = 'public';

	/** A display-only preview (`/public/services`, coupon quote, editor preview). */
	public const SCOPE_PREVIEW = 'preview';

	/** An operator booking: never a deposit (D-R71). */
	public const SCOPE_ADMIN = 'admin';

	/**
	 * Build a context.
	 *
	 * @param string $scope                 One of the SCOPE_* constants.
	 * @param int    $service_id            Service being priced.
	 * @param int    $staff_id              Staff, 0 when unknown.
	 * @param int    $location_id           Location, 0 for the business location.
	 * @param string $payments_mode         `off|optional|required`.
	 * @param bool   $gateway_offered       Whether any gateway is offered to the public.
	 * @param int    $gateway_minimum_minor Highest declared minimum among offered gateways, 0 = none.
	 * @param bool   $external_exclusive    Whether an external checkout gateway owns checkout.
	 * @param string $payment_method        Chosen payment method, '' when none (public scope only).
	 * @param string $amount_mode Initial payment choice: deposit or full.
	 */
	public function __construct(
		public readonly string $scope,
		public readonly int $service_id,
		public readonly int $staff_id = 0,
		public readonly int $location_id = 0,
		public readonly string $payments_mode = 'optional',
		public readonly bool $gateway_offered = false,
		public readonly int $gateway_minimum_minor = 0,
		public readonly bool $external_exclusive = false,
		public readonly string $payment_method = '',
		public readonly string $amount_mode = 'deposit'
	) {}

	/**
	 * Read the payment facts of the current site.
	 *
	 * @param string   $scope          One of the SCOPE_* constants.
	 * @param int      $service_id     Service being priced.
	 * @param string   $currency       Order currency (for gateway minimums).
	 * @param Settings $settings       Site settings.
	 * @param int      $staff_id       Staff, 0 when unknown.
	 * @param int      $location_id    Location.
	 * @param string   $payment_method Chosen payment method, '' when none.
	 * @param string   $amount_mode Initial payment choice: deposit or full.
	 */
	public static function forSite( string $scope, int $service_id, string $currency, Settings $settings, int $staff_id = 0, int $location_id = 0, string $payment_method = '', string $amount_mode = 'deposit' ): self {
		$offered = PaymentRegistry::offeredCodes();
		$minimum = 0;
		foreach ( $offered as $code ) {
			$minimum = max( $minimum, PaymentDispatcher::minAmount( $code, $currency ) );
		}
		// An external checkout gateway (WooCommerce) owns checkout when it is the exclusive gateway
		// (D-R71c of the WooCommerce series): no deposit applies, the external checkout prices it.
		$exclusive = '' !== PaymentRegistry::exclusiveCode();

		return new self(
			$scope,
			$service_id,
			$staff_id,
			$location_id,
			(string) $settings->get( 'payments.mode' ),
			array() !== $offered,
			$minimum,
			$exclusive,
			$payment_method,
			$amount_mode
		);
	}
}

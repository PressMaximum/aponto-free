<?php
/**
 * Payment core registrar (D-R38).
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
 * The one place core turns the payment surface on, and the mirror of
 * {@see \Aponto\Integration\Integrations}.
 *
 * Everything under `Aponto\Payments` is FREE-SHIPPED and gateway-agnostic: it names no provider,
 * references no premium class, and dispatches only the per-key hooks extension-surface §5b defines.
 * A gateway is a set of filter callbacks and nothing more, which is what made the SECOND gateway
 * (P3) a driver-only change.
 *
 * Registered unconditionally and deliberately so. These seams are inert on a site that takes no
 * online payments — the cron is not scheduled while no hold exists, the REST routes 404 on the
 * registry allow-list, and the notification seam short-circuits on an order whose `payment_status`
 * is `none` — and putting a `Plan::has()` check around the registration would only move the gate
 * away from where it belongs, which is per-code in {@see PaymentRegistry::isActive()}.
 *
 * A DRIVER, by contrast, is registered from here gated on `Plan::has()` — the `multi_staff` shape
 * (D-R28), not a `ServiceProvider`, because `payments_stripe` ships in Free and the Free zip
 * excludes `src/Pro/` (D-R39).
 */
final class Payments {

	/**
	 * Wire the payment cron and any shipped driver.
	 */
	public static function register(): void {
		PaymentCron::register();

		// The one gated line (D-R39). `payments_stripe` is `edition: free`, and the Free zip excludes
		// `src/Pro/`, so its driver cannot be a `ServiceProvider`; it is ordinary core code booted
		// here under `Plan::has()` because Stripe itself ships in Free. Boot IS the gate: nothing
		// inside `Aponto\Payments\Stripe` re-checks entitlement, exactly as nothing inside a provider
		// module does.
		if ( \Aponto\Plan::instance()->has( Stripe\Config::CODE ) ) {
			Stripe\Driver::make()->register();
		}
	}
}

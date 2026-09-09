<?php
/**
 * Capture / confirmation request (extension-surface §5b.3, D-R38d).
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
 * What a driver is given on the confirmation leg: a gateway reference, and the amount + currency
 * core EXPECTS to see against it.
 *
 * The expected values travel with the request so a driver can fail fast, but they are advisory —
 * core re-checks the returned {@see PaymentOutcome} against the order row under the per-order lock
 * regardless. A driver that trusted these and skipped its own read would be trusting a caller's
 * snapshot, which D-R34f rules out.
 *
 * `hold_open` is the one field that is NOT advisory, because only core can answer it: it says
 * whether the SLOT this payment is for still exists (D-R40b). See its parameter docblock for the
 * rule it puts on a driver.
 */
final class CaptureRequest {

	/**
	 * Construct the request.
	 *
	 * @param string $module_code           Payment module code.
	 * @param string $gateway_ref           Gateway-side reference supplied by the widget.
	 * @param int    $expected_amount_minor Amount the order says is due, in minor units.
	 * @param string $expected_currency     Currency the order was snapshotted with.
	 * @param string $order_code            Public order code, for the driver's own cross-check.
	 * @param bool   $hold_open             Whether the reservation behind this payment is still
	 *                                      alive — the order's `payment_status` is `pending` AND the
	 *                                      booking is not cancelled, re-read immediately before the
	 *                                      dispatch. ADDITIVE and last (D-R40b), default `true`, so
	 *                                      every existing call site and every driver that ignores it
	 *                                      behaves exactly as before.
	 *
	 *                                      **The rule it creates is asymmetric, and the asymmetry is
	 *                                      the point.** A driver whose `capture` MOVES MONEY (one
	 *                                      that POSTs a capture call) must refuse
	 *                                      when this is false — `PaymentOutcome::FAILED` with
	 *                                      `hold_released`, and no HTTP at all, because taking money
	 *                                      for a slot that has already been given away is the worst
	 *                                      outcome available. A driver whose `capture` is a RETRIEVE
	 *                                      (Stripe reads the PaymentIntent) must NOT refuse: there
	 *                                      the money may already have moved client-side, and this
	 *                                      leg is the only path that ever records it — refusing
	 *                                      would strand a real charge (extension-surface §5b.3).
	 *
	 *                                      Only the confirm leg computes it. The `already_paid`
	 *                                      branch of `PaymentService::releaseHold()` keeps the
	 *                                      default, because there the gateway has ALREADY reported
	 *                                      settled money and the capture is a confirmation of it.
	 */
	public function __construct(
		public readonly string $module_code,
		public readonly string $gateway_ref,
		public readonly int $expected_amount_minor,
		public readonly string $expected_currency,
		public readonly string $order_code,
		public readonly bool $hold_open = true
	) {}

	/**
	 * Redacted debug view (§5 invariant 8).
	 *
	 * @return array<string, mixed>
	 */
	public function __debugInfo(): array {
		return array(
			'module_code'           => $this->module_code,
			'gateway_ref'           => $this->gateway_ref,
			'expected_amount_minor' => $this->expected_amount_minor,
			'expected_currency'     => $this->expected_currency,
			'order_code'            => $this->order_code,
			'hold_open'             => $this->hold_open,
		);
	}
}

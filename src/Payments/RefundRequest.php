<?php
/**
 * Refund request (extension-surface §5b.3, D-R38j).
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
 * A full or partial refund against one settled charge (founder Q6).
 *
 * `amount_minor` is ALWAYS explicit — core resolves "refund everything" to the remaining amount
 * before dispatching, so a driver never has to guess what "full" means and two drivers can never
 * disagree about it. `reason` is operator-authored text kept for the gateway's own record; it is
 * redacted from debug output because an operator can type anything into it, including a customer's
 * name.
 */
final class RefundRequest {

	/**
	 * Construct the request.
	 *
	 * @param string $module_code     Payment module code.
	 * @param string $payment_ref     Gateway payment reference of the charge being refunded.
	 * @param string $gateway_ref     Gateway-side reference of the original intent.
	 * @param int    $amount_minor    Amount to refund, in minor units (always explicit).
	 * @param string $currency        ISO-4217 currency of the order.
	 * @param string $order_code      Public order code, for the driver's own cross-check.
	 * @param string $reason          Operator-supplied reason, may be ''.
	 * @param string $idempotency_key Stable `ap:{salt16}:{host8}:{order_id}:refund:{n}` (extension-surface §5b.4).
	 * @param string $gateway_mode    The environment the ORIGINAL charge was taken in, as the driver
	 *                                recorded it on the row (`''` when unknown). ADDITIVE and last,
	 *                                so every existing call site keeps working. It exists so a driver
	 *                                can refuse a cross-environment refund BEFORE any HTTP: asking
	 *                                the gateway instead means asking with the very key that cannot
	 *                                see the payment (D-R39c, Codex A.3).
	 */
	public function __construct(
		public readonly string $module_code,
		public readonly string $payment_ref,
		public readonly string $gateway_ref,
		public readonly int $amount_minor,
		public readonly string $currency,
		public readonly string $order_code,
		public readonly string $reason = '',
		public readonly string $idempotency_key = '',
		public readonly string $gateway_mode = ''
	) {}

	/**
	 * Redacted debug view (§5 invariant 8).
	 *
	 * @return array<string, mixed>
	 */
	public function __debugInfo(): array {
		return array(
			'module_code'     => $this->module_code,
			'payment_ref'     => $this->payment_ref,
			'gateway_ref'     => $this->gateway_ref,
			'amount_minor'    => $this->amount_minor,
			'currency'        => $this->currency,
			'order_code'      => $this->order_code,
			'reason'          => '' === $this->reason ? '' : '[redacted]',
			'idempotency_key' => $this->idempotency_key,
			'gateway_mode'    => $this->gateway_mode,
		);
	}
}

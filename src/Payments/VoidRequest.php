<?php
/**
 * Void request (extension-surface §5b.3, D-R38g).
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
 * Ask the gateway to cancel an intent that was never captured, so the customer cannot complete a
 * payment for a slot core is about to release (D-R38g).
 *
 * Best-effort by design: the only thing a failed void costs is an abandoned intent the gateway
 * expires on its own schedule. What must NOT be lost is the one informative failure — the intent has
 * already been paid — which comes back as a typed {@see VoidResult}, not as an error.
 */
final class VoidRequest {

	/**
	 * Construct the request.
	 *
	 * @param string $module_code Payment module code.
	 * @param string $gateway_ref Gateway-side reference to cancel.
	 * @param string $order_code  Public order code, for the driver's own cross-check.
	 * @param string $reason      Short machine reason (`hold_expired`, `hold_released`).
	 */
	public function __construct(
		public readonly string $module_code,
		public readonly string $gateway_ref,
		public readonly string $order_code,
		public readonly string $reason = ''
	) {}

	/**
	 * Redacted debug view (§5 invariant 8).
	 *
	 * @return array<string, mixed>
	 */
	public function __debugInfo(): array {
		return array(
			'module_code' => $this->module_code,
			'gateway_ref' => $this->gateway_ref,
			'order_code'  => $this->order_code,
			'reason'      => $this->reason,
		);
	}
}

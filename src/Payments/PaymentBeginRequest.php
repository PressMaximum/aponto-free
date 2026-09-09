<?php
/**
 * Payment initiation request (extension-surface §5b.3, D-R38c).
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
 * What a driver is given to create a gateway-side intent for ONE order.
 *
 * The amount comes from the ORDER row, never from a request body (D-R38c) — a browser must never be
 * able to decide what it owes, and putting the field here rather than accepting it from the wire is
 * what makes that structural instead of a validation rule somebody can forget.
 *
 * `customer_email` is passed for the gateway's own prefill and receipt only. Core does not put it in
 * gateway metadata, does not store it in `aponto_transactions`, and redacts it from
 * {@see self::__debugInfo()} — the transactions ledger is PII-free by construction
 * (privacy-inventory), and a value that never enters it cannot leak from it.
 */
final class PaymentBeginRequest {

	/**
	 * Construct the request.
	 *
	 * @param string             $module_code    Payment module code.
	 * @param int                $order_id       Order id.
	 * @param string             $order_code     Public order code (`AP-XXXXX`).
	 * @param int                $booking_id     Booking id.
	 * @param int                $amount_minor   Amount in ISO-4217 minor units, taken from the order.
	 * @param string             $currency       ISO-4217 currency, snapshot on the order.
	 * @param string             $customer_email Prefill only — never stored, never in metadata.
	 * @param string             $description    Human line for the gateway (the service name).
	 * @param \DateTimeImmutable $expires_at     Hold deadline (UTC) the intent should not outlive.
	 * @param string             $locale         WordPress locale, for the gateway's own UI.
	 * @param string             $return_url     Optional return URL for gateways that need one.
	 */
	public function __construct(
		public readonly string $module_code,
		public readonly int $order_id,
		public readonly string $order_code,
		public readonly int $booking_id,
		public readonly int $amount_minor,
		public readonly string $currency,
		public readonly string $customer_email,
		public readonly string $description,
		public readonly \DateTimeImmutable $expires_at,
		public readonly string $locale = '',
		public readonly string $return_url = ''
	) {}

	/**
	 * Redacted debug view (§5 invariant 8).
	 *
	 * @return array<string, mixed>
	 */
	public function __debugInfo(): array {
		return array(
			'module_code'    => $this->module_code,
			'order_id'       => $this->order_id,
			'order_code'     => $this->order_code,
			'booking_id'     => $this->booking_id,
			'amount_minor'   => $this->amount_minor,
			'currency'       => $this->currency,
			'customer_email' => '' === $this->customer_email ? '' : '[redacted]',
			'description'    => '[redacted]',
			'expires_at'     => $this->expires_at->format( 'Y-m-d H:i:s' ),
			'locale'         => $this->locale,
			'return_url'     => '' === $this->return_url ? '' : '[redacted]',
		);
	}
}

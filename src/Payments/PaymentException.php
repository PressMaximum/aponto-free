<?php
/**
 * Payment domain exceptions (error-registry addendum payments, 2026-09-04).
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

use Aponto\Support\DomainException;

/**
 * The three payment failures the REST layer can answer, as ONE exception with named constructors
 * rather than three classes.
 *
 * Three classes would have been the house style, and this deliberately is not: the three differ only
 * in a code, a status and a retry hint — no behaviour, no data — and the value of splitting them
 * (catching one and not the others) is a case that does not arise, because every caller either
 * handles all payment failures or none. One class with named constructors keeps the mapping to the
 * error registry visible in a single place, which is where a wrong status would otherwise hide.
 *
 * The messages are the stable English server-log strings from `docs/error-registry.md`; the user
 * sees the localized, enumeration-safe copy that {@see \Aponto\Rest\Errors} attaches to the code.
 */
final class PaymentException extends DomainException {

	/**
	 * Construct the exception (use the named constructors below).
	 *
	 * @param string $error_code Stable `aponto_payment_*` error code.
	 * @param int    $status  HTTP status.
	 * @param string $message Stable English, PII-free log message.
	 * @param bool   $retry   Whether a client may safely retry.
	 * @param string $public_message Localized copy to send instead of the registry's, or ''.
	 */
	private function __construct(
		private string $error_code,
		private int $status,
		string $message,
		private bool $retry,
		private string $public_message = ''
	) {
		// NOT named `$code`: `Exception` already owns a `$code` property, and shadowing it with a
		// string would break every generic handler that reads `getCode()` as an int.
		parent::__construct( $message );
	}

	/**
	 * The gateway is not available for this operation: module disabled, not shipped, not allowed by
	 * the edition, not configured, or unable to handle the order's currency.
	 *
	 * A separate code from {@see self::state()} because the two ask the operator for different
	 * things — "turn the module back on / finish setting it up" versus "this order is not in a state
	 * where that makes sense" — and a single 409 covering both would send them looking in the wrong
	 * screen.
	 */
	public static function unavailable(): self {
		return new self( 'aponto_payment_unavailable', 409, 'Payment gateway is not available for this operation.', false );
	}

	/**
	 * The order's payment state does not allow this operation.
	 *
	 * @param string $public_message Localized copy to send instead of the registry's generic one.
	 */
	public static function state( string $public_message = '' ): self {
		return new self( 'aponto_payment_state', 409, 'Order payment state does not allow this operation.', false, $public_message );
	}

	/**
	 * A localized, operator-facing explanation to send INSTEAD of the registry's generic copy, or
	 * `''` to keep the generic one.
	 *
	 * Added for the one 409 whose cause an operator cannot possibly guess (D-R39b): a refund
	 * refused because the payment was taken in the OTHER Stripe mode. "Order payment state does not
	 * allow this operation" is true and useless there; "switch the module to Test mode to refund
	 * it" is the whole fix. It is deliberately narrow — a caller must pass copy it AUTHORED, never
	 * anything a gateway said, which is the rule `driverFailed()` exists to keep.
	 */
	public function publicMessage(): string {
		return $this->public_message;
	}

	/**
	 * The driver refused or failed. Retryable, and NEVER carrying the provider's own message —
	 * a gateway error string can contain key fragments, internal URLs or the customer's own data,
	 * and it reaches a public response.
	 */
	public static function driverFailed(): self {
		return new self( 'aponto_payment_error', 502, 'Payment driver reported a failure.', true );
	}

	/**
	 * Webhook verification failed — ONE code for every cause (missing header, bad signature, stale
	 * timestamp, unparseable body), because distinguishing them tells an attacker which secret is
	 * close.
	 */
	public static function webhookInvalid(): self {
		return new self( 'aponto_webhook_invalid', 400, 'Payment webhook verification failed.', false );
	}

	/**
	 * Stable REST error code.
	 */
	public function errorCode(): string {
		return $this->error_code;
	}

	/**
	 * HTTP status for the REST envelope.
	 */
	public function httpStatus(): int {
		return $this->status;
	}

	/**
	 * Whether a client may safely retry.
	 */
	public function retryable(): bool {
		return $this->retry;
	}
}

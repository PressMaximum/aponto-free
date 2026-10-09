<?php
/**
 * The current payment policy does not offer the requested amount mode.
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
/** Stable validation refusal for an unavailable full-payment choice. */
final class PaymentChoiceUnavailable extends \Aponto\Support\DomainException {
	/** Existing validation code. */
	public function errorCode(): string {
		return 'aponto_validation';
	}
	/** An invalid amount-mode field. */
	public function httpStatus(): int {
		return 422;
	}
}

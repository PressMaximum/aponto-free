<?php
/**
 * A deposit policy now requires an online payment method.
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
/** Stable validation refusal when authoritative terms require payment. */
final class PaymentMethodRequired extends \Aponto\Support\DomainException {
	/** Existing validation code. */
	public function errorCode(): string {
		return 'aponto_validation'; }
	/** A missing payment field. */
	public function httpStatus(): int {
		return 422; }
}

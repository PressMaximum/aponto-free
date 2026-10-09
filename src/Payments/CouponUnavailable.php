<?php
/**
 * Uniform public coupon refusal (D-R67).
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
 * One response for an unknown, inactive, out-of-window, exhausted or incompatible coupon. Keeping
 * those cases indistinguishable prevents the public quote endpoint from becoming a coupon oracle.
 */
final class CouponUnavailable extends DomainException {

	/** Construct the uniform coupon refusal. */
	public function __construct() {
		parent::__construct( 'Coupon unavailable.' );
	}

	/** Return the stable REST error code. */
	public function errorCode(): string {
		return 'aponto_coupon_invalid';
	}

	/** Return the REST status. */
	public function httpStatus(): int {
		return 422;
	}
}

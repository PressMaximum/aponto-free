<?php
/**
 * Wrong-code backoff for coupon evaluation (D-R67n).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Rest\Support;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use WP_REST_Request;

/**
 * One guard for every public path that evaluates a customer-typed coupon code — the quote and the
 * booking POST — so guessing cannot move from one to the other. Built on the existing
 * {@see RateLimiter} counter table (no new storage): `coupon_fail_ip` per client IP and
 * `coupon_fail_global` for the whole site. Only a FAILED evaluation is charged; a check before the
 * evaluation refuses once a bucket is exhausted. Core and neutral: it counts refusals of a
 * pricing seam and names no module.
 */
final class CouponAttemptGuard {

	/**
	 * Construct.
	 *
	 * @param RateLimiter $limiter Shared counter.
	 * @param string      $ip      Resolved client IP.
	 */
	public function __construct(
		private RateLimiter $limiter,
		private string $ip
	) {}

	/**
	 * `Retry-After` seconds when coupon evaluation is currently backed off, else null.
	 *
	 * @param WP_REST_Request $request Current request.
	 * @throws ServiceUnavailable When the counter storage cannot be read (fail-closed, REST-6).
	 */
	public function blocked( WP_REST_Request $request ): ?int {
		$ip     = $this->limiter->peek( 'coupon_fail_ip', $this->ip, $request );
		$global = $this->limiter->peek( 'coupon_fail_global', 'site', $request );
		if ( null === $ip && null === $global ) {
			return null;
		}

		return max( (int) $ip, (int) $global );
	}

	/**
	 * Charge one failed evaluation to both buckets.
	 *
	 * @param WP_REST_Request $request Current request.
	 * @throws ServiceUnavailable When the counter storage fails (fail-closed, REST-6).
	 */
	public function recordFailure( WP_REST_Request $request ): void {
		$this->limiter->hit( 'coupon_fail_ip', $this->ip, $request );
		$this->limiter->hit( 'coupon_fail_global', 'site', $request );
	}
}

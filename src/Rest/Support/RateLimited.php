<?php
/**
 * Rate limit exceeded (§6.4.1, REST-4).
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

use Aponto\Support\DomainException;

/**
 * A public abuse limit was exceeded (`aponto_rate_limited`, 429, retryable). Carries the
 * `Retry-After` seconds so the REST boundary can emit the mandatory header. Thrown either by the
 * attempt limiter or by the in-transaction booking-email guard running through the engine's
 * pre-insert seam.
 */
final class RateLimited extends DomainException {

	/**
	 * Construct the exception.
	 *
	 * @param int $retry_after Seconds the client must wait.
	 */
	public function __construct( private int $retry_after ) {
		parent::__construct( 'Public request rate limit was exceeded.' );
	}

	/**
	 * Seconds the client must wait before retrying.
	 */
	public function retryAfter(): int {
		return max( 1, $this->retry_after );
	}

	/**
	 * Stable REST error code.
	 */
	public function errorCode(): string {
		return 'aponto_rate_limited';
	}

	/**
	 * HTTP status.
	 */
	public function httpStatus(): int {
		return 429;
	}

	/**
	 * Retryable after the window passes.
	 */
	public function retryable(): bool {
		return true;
	}
}

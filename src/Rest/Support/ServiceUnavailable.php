<?php
/**
 * Abuse-control storage unavailable — fail closed (REST-6).
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
 * The abuse-control storage (rate counters) failed, so the public request cannot be safely
 * admitted (`aponto_service_unavailable`, 503, retryable — error-registry addition, REST review
 * 2026-07-12). Failing OPEN would disable rate limiting exactly when the database is under
 * pressure; the endpoint refuses instead.
 */
final class ServiceUnavailable extends DomainException {

	/**
	 * Construct the exception.
	 */
	public function __construct() {
		parent::__construct( 'Abuse-control storage is unavailable; request refused (fail-closed).' );
	}

	/**
	 * Stable REST error code.
	 */
	public function errorCode(): string {
		return 'aponto_service_unavailable';
	}

	/**
	 * HTTP status.
	 */
	public function httpStatus(): int {
		return 503;
	}

	/**
	 * Retryable once storage recovers.
	 */
	public function retryable(): bool {
		return true;
	}
}

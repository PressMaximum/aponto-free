<?php
/**
 * Idempotent request still in progress (§5.6, §8.2).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Booking\Exception;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Support\DomainException;

/**
 * A claim row exists for the key but has no booking yet — the original request is still being
 * processed (`aponto_idempotency_in_flight`, 425). Retryable with the SAME key after a short wait
 * (§5.6). The canonical §8.2 name is used (see error-registry OPEN QUESTION 1).
 */
final class IdempotencyInFlight extends DomainException {

	/**
	 * Construct the exception.
	 */
	public function __construct() {
		parent::__construct( 'Idempotent booking request is still in progress.' );
	}

	/**
	 * Stable REST error code.
	 */
	public function errorCode(): string {
		return 'aponto_idempotency_in_flight';
	}

	/**
	 * HTTP status.
	 */
	public function httpStatus(): int {
		return 425;
	}

	/**
	 * Retryable with the same key.
	 */
	public function retryable(): bool {
		return true;
	}
}

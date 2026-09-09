<?php
/**
 * Idempotency key reused with a different request (§5.6, §8.2).
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
 * The idempotency key was reused with a different request hash (`aponto_idempotency_conflict`,
 * 409). Not retryable with the current key/draft pair — the client must regenerate the key after
 * confirming the current draft (§5.6).
 */
final class IdempotencyConflict extends DomainException {

	/**
	 * Construct the exception.
	 */
	public function __construct() {
		parent::__construct( 'Idempotency key was reused with a different request.' );
	}

	/**
	 * Stable REST error code.
	 */
	public function errorCode(): string {
		return 'aponto_idempotency_conflict';
	}

	/**
	 * HTTP status.
	 */
	public function httpStatus(): int {
		return 409;
	}
}

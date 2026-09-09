<?php
/**
 * Per-order payment lock timeout (D-R38e).
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
 * The per-order payment lock could not be taken, so the operation fail-closed rather than running
 * unserialized (`aponto_lock_timeout`, 503, retryable — the canonical registry code the booking
 * engine already uses for exactly this condition).
 *
 * Deliberately the SAME code the reservation engine surfaces: to a client, "a lock was busy, try
 * again shortly" is one fact, and inventing a payment-specific variant of it would add a code to the
 * registry that no client would treat differently.
 */
final class PaymentLockTimeout extends DomainException {

	/**
	 * Construct the exception.
	 */
	public function __construct() {
		parent::__construct( 'Payment lock acquisition timed out.' );
	}

	/**
	 * Stable REST error code.
	 */
	public function errorCode(): string {
		return 'aponto_lock_timeout';
	}

	/**
	 * HTTP status.
	 */
	public function httpStatus(): int {
		return 503;
	}

	/**
	 * Retryable once the contending actor finishes.
	 */
	public function retryable(): bool {
		return true;
	}
}

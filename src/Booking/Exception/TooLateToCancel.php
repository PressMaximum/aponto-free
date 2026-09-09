<?php
/**
 * Cancellation deadline passed (§5.6, §8.2).
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
 * The `min_cancel_hours` deadline has passed (`aponto_too_late_to_cancel`, 409). Not retryable.
 * Enumeration-safe: only surfaced after a valid token has been resolved (§5.6, error registry).
 */
final class TooLateToCancel extends DomainException {

	/**
	 * Construct the exception.
	 */
	public function __construct() {
		parent::__construct( 'Booking cancellation deadline has passed.' );
	}

	/**
	 * Stable REST error code.
	 */
	public function errorCode(): string {
		return 'aponto_too_late_to_cancel';
	}

	/**
	 * HTTP status.
	 */
	public function httpStatus(): int {
		return 409;
	}
}

<?php
/**
 * Availability range exceeds the maximum (§5.5, §8.2).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Availability;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Support\DomainException;

/**
 * The requested availability range exceeds the allowed maximum of 62 inclusive days
 * (`aponto_range_too_wide`, 400 — §5.5). Not retryable until the range is narrowed.
 */
final class RangeTooWide extends DomainException {

	/**
	 * The maximum inclusive range in days (§5.5).
	 */
	public const MAX_DAYS = 62;

	/**
	 * Construct the exception.
	 */
	public function __construct() {
		parent::__construct( 'Requested availability range exceeds the allowed maximum.' );
	}

	/**
	 * Stable REST error code.
	 */
	public function errorCode(): string {
		return 'aponto_range_too_wide';
	}

	/**
	 * HTTP status.
	 */
	public function httpStatus(): int {
		return 400;
	}
}

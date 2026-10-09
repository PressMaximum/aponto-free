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
	 * Throw when an inclusive `Y-m-d` range is wider than {@see self::MAX_DAYS} (§5.5).
	 *
	 * The one implementation of the ceiling: the engine asserts it before generating, and
	 * `/public/availability` asserts it before its D-R61 location check, so a too-wide range is a
	 * `400` whether or not the requested branch can produce slots.
	 *
	 * @param string $from Inclusive start `Y-m-d`.
	 * @param string $to   Inclusive end `Y-m-d`.
	 * @throws self When the range is too wide.
	 */
	public static function assertWithin( string $from, string $to ): void {
		$utc  = new \DateTimeZone( 'UTC' );
		$a    = new \DateTimeImmutable( $from . ' 00:00:00', $utc );
		$b    = new \DateTimeImmutable( $to . ' 00:00:00', $utc );
		$days = (int) $a->diff( $b )->format( '%r%a' ) + 1;
		if ( $days > self::MAX_DAYS ) {
			throw new self();
		}
	}

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

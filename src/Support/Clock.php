<?php
/**
 * Injectable clock.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Support;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * Source of the current time.
 *
 * Injected everywhere time is read so tests can pin "now". Always returns UTC — domain code
 * converts to display timezones explicitly (§1, §5.4).
 */
class Clock {

	/**
	 * Current instant in UTC.
	 *
	 * Impure for analysis: a clock returns a different value on every call, and loop guards that
	 * re-read it (a deadline check between paged HTTP requests) depend on exactly that.
	 *
	 * @phpstan-impure
	 */
	public function now(): \DateTimeImmutable {
		return new \DateTimeImmutable( 'now', new \DateTimeZone( 'UTC' ) );
	}

	/**
	 * Current instant as a MySQL `datetime` string in UTC (`Y-m-d H:i:s`).
	 */
	public function nowSql(): string {
		return $this->now()->format( 'Y-m-d H:i:s' );
	}
}

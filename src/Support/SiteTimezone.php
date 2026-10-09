<?php
/**
 * The site's timezone as an IANA name, for clients that only speak IANA.
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
 * Maps `wp_timezone_string()` to a zone identifier the `tz` routes accept (D-R63 fix rounds 1–3,
 * browser QA B1).
 *
 * A site whose WordPress timezone is a MANUAL UTC offset reports `+07:00` (or `+00:00`) from
 * `wp_timezone_string()`. The admin boot published that verbatim as `business.timezone`, and the
 * admin's availability calls sent it as `tz` — refused with 422 while `tz` was IANA-only, so New
 * booking and Edit time showed "No available times". Mapped ONCE here, to TRUE fixed-offset zones
 * only — never to a city the operator did not choose:
 *
 *   - an IANA name passes through unchanged;
 *   - `+00:00` → `UTC`;
 *   - a whole-hour offset → `Etc/GMT∓N` — the POSIX sign is INVERTED (`+07:00` is `Etc/GMT-7`);
 *   - anything else (`+05:30`, `-03:30`, `+12:45`) → the canonical zero-padded `±HH:MM`, which
 *     `Args::checkDisplayTimezone()` accepts and PHP's `DateTimeZone` constructs natively.
 *
 * Fix round 3 dropped the "DST-free city surrogate" for fractional offsets (`+05:30` →
 * `Asia/Colombo`): it labelled bookings with a city nobody picked, and a tzdata change past its scan
 * window could have moved the clock under the site.
 *
 * Pure: no WordPress call, so the mapping is asserted on the host.
 */
final class SiteTimezone {

	/**
	 * The zone identifier for a `wp_timezone_string()` value.
	 *
	 * @param string $wp_timezone `wp_timezone_string()` — an IANA name or a `±H:MM` offset.
	 */
	public static function iana( string $wp_timezone ): string {
		if ( 1 !== preg_match( '/^([+-])(\d{1,2}):(\d{2})$/', $wp_timezone, $m ) ) {
			return $wp_timezone;
		}
		$sign    = '-' === $m[1] ? -1 : 1;
		$minutes = $sign * ( (int) $m[2] * 60 + (int) $m[3] );
		if ( 0 === $minutes ) {
			return 'UTC';
		}
		// `Etc/GMT-14` … `Etc/GMT+12` exist; the POSIX sign convention is the inverse of ISO 8601.
		if ( 0 === $minutes % 60 && $minutes >= -720 && $minutes <= 840 ) {
			$hours = intdiv( $minutes, 60 );

			return 'Etc/GMT' . ( $hours > 0 ? '-' : '+' ) . abs( $hours );
		}

		return sprintf( '%s%02d:%02d', $minutes < 0 ? '-' : '+', intdiv( abs( $minutes ), 60 ), abs( $minutes ) % 60 );
	}
}

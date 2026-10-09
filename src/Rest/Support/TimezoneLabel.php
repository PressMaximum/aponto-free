<?php
/**
 * Friendly timezone label `City (GMT±N)`.
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

/**
 * Renders the friendly `City (GMT±N)` timezone label used by the public token DTO
 * (rest-contract §3.5) and notification emails (SPEC-P1 §3.3). The offset is computed at a specific
 * instant so DST and fractional offsets (e.g. Kathmandu `+5:45`) are correct.
 */
final class TimezoneLabel {

	/**
	 * Build the label for a timezone at an instant.
	 *
	 * A fixed-offset zone — what WordPress reports as the site timezone when the
	 * admin never picked a city (`gmt_offset` only) — has no city to name, so the
	 * label collapses to the bare `GMT±N` instead of the nonsense
	 * `+00:00 (GMT+0)`. The JS twin `tzLabel()` in `assets/src/form/lib/tz.js`
	 * applies the same rule so the six D1 surfaces stay byte-identical.
	 *
	 * @param \DateTimeZone      $tz Timezone.
	 * @param \DateTimeImmutable $at Instant at which to compute the offset.
	 */
	public static function label( \DateTimeZone $tz, \DateTimeImmutable $at ): string {
		$offset = $tz->getOffset( $at );
		$hours  = intdiv( abs( $offset ), 3600 );
		$mins   = intdiv( abs( $offset ) % 3600, 60 );
		$sign   = $offset >= 0 ? '+' : '-';
		$gmt    = 'GMT' . $sign . $hours . ( 0 !== $mins ? ':' . sprintf( '%02d', $mins ) : '' );

		$name = $tz->getName();
		// A fixed offset has no city — nor does an `Etc/GMT∓N` stand-in, which is what an admin-made
		// booking on a manual-offset site carries since D-R63 fix round 1 (`Support\SiteTimezone`):
		// "GMT-7 (GMT+7)" would read backwards, so both collapse to the bare `GMT±N`.
		if ( 1 === preg_match( '/^[+-]\d{1,2}(:\d{2})?$/', $name ) || str_starts_with( $name, 'Etc/' ) ) {
			return $gmt;
		}

		$parts = explode( '/', $name );
		$city  = str_replace( '_', ' ', (string) end( $parts ) );

		return $city . ' (' . $gmt . ')';
	}
}

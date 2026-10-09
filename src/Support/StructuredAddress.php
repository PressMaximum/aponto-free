<?php
/**
 * Structured-address display formatting.
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
 * Composes the location address columns into the single display string used by public and
 * notification surfaces.
 */
final class StructuredAddress {

	/**
	 * Compose non-empty address fields in their display order.
	 *
	 * @param array<string, mixed> $row Location row.
	 */
	public static function display( array $row ): string {
		$parts = array_filter(
			array(
				(string) ( $row['address_line1'] ?? '' ),
				(string) ( $row['address_line2'] ?? '' ),
				(string) ( $row['city'] ?? '' ),
				(string) ( $row['region'] ?? '' ),
				(string) ( $row['postal_code'] ?? '' ),
				self::countryName( (string) ( $row['country'] ?? '' ) ),
			),
			static fn ( string $part ): bool => '' !== trim( $part )
		);

		return implode( ', ', $parts );
	}

	/**
	 * The stored ISO-3166 alpha-2 code as a country NAME in the site language ("VN" →
	 * "Vietnam"): a customer reads an address, not a code (founder review 2026-09-30).
	 * Falls back to the code itself when the intl extension is missing or does not know it.
	 *
	 * @param string $code Stored country code.
	 */
	private static function countryName( string $code ): string {
		$code = strtoupper( trim( $code ) );
		if ( 1 !== preg_match( '/^[A-Z]{2}$/', $code ) || ! class_exists( '\\Locale' ) ) {
			return $code;
		}
		$locale = function_exists( 'determine_locale' ) ? determine_locale() : 'en_US';
		$name   = \Locale::getDisplayRegion( '-' . $code, $locale );

		return ( is_string( $name ) && '' !== $name && $name !== $code ) ? $name : $code;
	}
}

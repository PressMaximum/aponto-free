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
				(string) ( $row['country'] ?? '' ),
			),
			static fn ( string $part ): bool => '' !== trim( $part )
		);

		return implode( ', ', $parts );
	}
}

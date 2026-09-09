<?php
/**
 * Shared REST serialization formatters.
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
 * Low-level value formatters shared by every controller's DTO assembly (RFC3339 UTC datetimes,
 * nullable integer casting, pagination envelope). Kept small and stable so controllers can be
 * developed independently without touching a shared serializer.
 */
final class Format {

	/**
	 * Convert a stored MySQL UTC datetime (`Y-m-d H:i:s`) to an RFC3339 `...Z` string, or null.
	 *
	 * @param string|null $mysql Stored datetime.
	 */
	public static function utcDatetime( ?string $mysql ): ?string {
		if ( null === $mysql || '' === $mysql ) {
			return null;
		}
		$dt = \DateTimeImmutable::createFromFormat( 'Y-m-d H:i:s', $mysql, new \DateTimeZone( 'UTC' ) );

		return false === $dt ? null : $dt->format( 'Y-m-d\TH:i:s\Z' );
	}

	/**
	 * Cast a database value to a positive integer, or null when the column was NULL.
	 *
	 * @param mixed $value Raw value.
	 */
	public static function intOrNull( mixed $value ): ?int {
		return ( null === $value || '' === $value ) ? null : (int) $value;
	}

	/**
	 * Cast a database value to a non-empty string, or null when NULL/empty.
	 *
	 * @param mixed $value Raw value.
	 */
	public static function stringOrNull( mixed $value ): ?string {
		return ( null === $value || '' === $value ) ? null : (string) $value;
	}

	/**
	 * Integer minor units → the same amount written in the currency's MAJOR unit
	 * (`4500` USD → `45.00`, `150000` VND → `150000`, `25000` KWD → `25.000`).
	 *
	 * EXPORT-BOUNDARY ONLY (§5 invariant 7): money stays integer minor units everywhere inside
	 * the plugin — this formats one cell on the way out of it, so a spreadsheet reader is not
	 * left to guess a currency's exponent. Deliberately machine-parseable, NOT locale-formatted:
	 * a plain `.` decimal with no grouping separators and no symbol, so the column sums in Excel
	 * or Sheets whatever locale opens it (the `currency` column carries the code). The exponent
	 * comes from the single PHP source, {@see \Aponto\Support\Settings::currencyExponent()}.
	 *
	 * @param int|null $minor    Amount in minor units; null yields an empty cell.
	 * @param string   $currency ISO currency code (any case; unknown codes get 2 decimals).
	 */
	public static function moneyMajor( ?int $minor, string $currency ): string {
		if ( null === $minor ) {
			return '';
		}
		$decimals = \Aponto\Support\Settings::currencyExponent( $currency );

		return number_format( $minor / ( 10 ** $decimals ), $decimals, '.', '' );
	}

	/**
	 * Build the standard list envelope (rest-contract §1).
	 *
	 * @param list<array<string, mixed>> $items    Serialized items.
	 * @param int                        $page     Current page.
	 * @param int                        $per_page Page size.
	 * @param int                        $total    Total row count.
	 * @return array<string, mixed>
	 */
	public static function envelope( array $items, int $page, int $per_page, int $total ): array {
		return array(
			'items'       => $items,
			'page'        => $page,
			'per_page'    => $per_page,
			'total'       => $total,
			'total_pages' => $per_page > 0 ? (int) ceil( $total / $per_page ) : 0,
		);
	}
}

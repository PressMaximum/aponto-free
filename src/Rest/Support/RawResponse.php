<?php
/**
 * Raw (non-JSON) REST response helper for CSV / ICS streaming (rest-contract §2.14, §3.7).
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

use WP_REST_Response;

/**
 * Builds responses whose body is emitted verbatim (CSV export, ICS calendar) instead of being
 * JSON-encoded. The response carries the marker header {@see self::MARKER}; {@see \Aponto\Rest\Router}
 * short-circuits `rest_pre_serve_request` for marked responses and streams the raw body with the
 * correct `Content-Type`. In tests the response object is inspected directly (its data IS the raw
 * string), so serving is never required to assert the payload.
 *
 * CSV cells are defended against spreadsheet formula injection: any cell whose first character is
 * `=`, `+`, `-`, `@`, TAB or CR is prefixed with a single quote before CSV quoting
 * (rest-contract §2.14). TAB and CR are in the set because Excel strips a leading TAB/CR and then
 * evaluates whatever follows, so `"\t=cmd|'/c calc'!A0"` would execute without them (OWASP CSV
 * injection guidance).
 */
final class RawResponse {

	/**
	 * Marker header identifying a raw-body response.
	 */
	public const MARKER = 'X-Aponto-Raw';

	/**
	 * Build a raw-body response.
	 *
	 * @param string                $body          Raw body (already assembled).
	 * @param string                $content_type  Full `Content-Type` header value.
	 * @param array<string, string> $extra_headers Additional headers (e.g. Content-Disposition).
	 */
	public static function make( string $body, string $content_type, array $extra_headers = array() ): WP_REST_Response {
		$response = new WP_REST_Response( $body, 200 );
		$response->header( 'Content-Type', $content_type );
		$response->header( self::MARKER, '1' );
		foreach ( $extra_headers as $name => $value ) {
			$response->header( $name, $value );
		}

		return $response;
	}

	/**
	 * Escape a single CSV cell: formula-injection prefix, then RFC4180 quoting.
	 *
	 * @param string $value Cell value.
	 */
	public static function csvCell( string $value ): string {
		if ( '' !== $value && in_array( $value[0], array( '=', '+', '-', '@', "\t", "\r" ), true ) ) {
			$value = "'" . $value;
		}
		if ( 1 === preg_match( '/[",\r\n]/', $value ) ) {
			$value = '"' . str_replace( '"', '""', $value ) . '"';
		}

		return $value;
	}

	/**
	 * Assemble a CSV row from raw cell values (each escaped) terminated with CRLF.
	 *
	 * @param list<string|int|null> $cells Cell values.
	 */
	public static function csvRow( array $cells ): string {
		$escaped = array();
		foreach ( $cells as $cell ) {
			$escaped[] = self::csvCell( (string) $cell );
		}

		return implode( ',', $escaped ) . "\r\n";
	}
}

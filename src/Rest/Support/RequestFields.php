<?php
/**
 * The field names a client actually submitted (plain-permalink safe).
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

use WP_REST_Request;

/**
 * Strict "unknown field" checks must look at what the CLIENT sent, not at routing plumbing.
 *
 * Under plain permalinks every REST call is `index.php?rest_route=/aponto/v1/...`, so
 * `get_params()` carries a `rest_route` query parameter the client never chose, and a strict body
 * allow-list answered `422 {"rest_route":"Unknown field."}` to every public booking and coupon quote
 * on such a site (D-R67o). The submitted names are the JSON body, the form body and the query
 * string — minus `rest_route` — and never the route's own URL parameters or registered defaults.
 */
final class RequestFields {

	/**
	 * Routing plumbing that is never a client-chosen field — the ONE list shared by the strict
	 * unknown-field checks here and the exact-request hash
	 * ({@see RequestFingerprint::exact()}), so the two can never disagree (D-R67u, round 7).
	 *
	 * Only `rest_route` (plain permalinks). `_locale` is deliberately NOT here: it is added by
	 * `@wordpress/api-fetch`, and the public booking widget and coupon quote call `fetch()`
	 * directly, so on these routes it is a client-sent field like any other (unknown → 422).
	 *
	 * @var list<string>
	 */
	public const TRANSPORT_KEYS = array( 'rest_route' );

	/**
	 * Submitted field names.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return list<string>
	 */
	public static function submittedKeys( WP_REST_Request $request ): array {
		$keys = array_merge(
			array_keys( (array) $request->get_json_params() ),
			array_keys( (array) $request->get_body_params() ),
			array_keys( (array) $request->get_query_params() )
		);
		$keys = array_values( array_unique( array_map( 'strval', $keys ) ) );

		return array_values( array_filter( $keys, static fn ( string $key ): bool => ! in_array( $key, self::TRANSPORT_KEYS, true ) ) );
	}

	/**
	 * Whether the client submitted a top-level field named `$key` (body or query string, never
	 * `rest_route`, a URL parameter or a registered default).
	 *
	 * @param WP_REST_Request $request Request.
	 * @param string          $key     Field name.
	 */
	public static function submitted( WP_REST_Request $request, string $key ): bool {
		return in_array( $key, self::submittedKeys( $request ), true );
	}
}

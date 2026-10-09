<?php
/**
 * Cache policy for the ANONYMOUS public reads (fix round 1, D-R52).
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
 * `Cache-Control: no-store` for the two public reads that carry NO token.
 *
 * **WordPress does not do this for us.** `WP_REST_Server::serve_request()` sends the no-cache
 * headers only when `rest_send_nocache_headers` is true, and that filter defaults to
 * `is_user_logged_in()` — so an ANONYMOUS `GET /public/services` or `GET /public/availability`
 * goes out with no cache policy at all. A CDN, a page cache or a reverse proxy in front of the
 * site is then free to keep serving it, and two things break that the site owner believes they
 * control:
 *
 *  - **Privacy.** Since D-R52 the catalogue payload is gated per field: turning "Show staff
 *    photos" off removes the Gravatar URL (which carries core's hash of a staff email) and
 *    turning "Let customers view staff profiles" off removes `bio`. A cached copy keeps serving
 *    both after the operator has switched them off, which defeats the gate at exactly the moment
 *    it is being used.
 *  - **Correctness.** A cached availability response offers slots that are already gone —
 *    "never cached: stale slot = double-book" is a standing rule of this engine (AGENTS §4).
 *
 * `no-store` rather than `private, no-store`: these two responses are the same for every
 * visitor, so they are not private — they are simply never reusable. The TOKEN routes keep
 * their own `private, no-store` ({@see \Aponto\Rest\Controller\PublicBookingsController}),
 * because those really do belong to one person.
 */
final class PublicCache {

	/**
	 * The header value. `max-age=0` rides along for the intermediaries that predate `no-store`.
	 */
	private const VALUE = 'no-store, max-age=0';

	/**
	 * Mark a response as never storable.
	 *
	 * @param WP_REST_Response $response Response.
	 * @return WP_REST_Response The same response, for chaining.
	 */
	public static function noStore( WP_REST_Response $response ): WP_REST_Response {
		$response->header( 'Cache-Control', self::VALUE );

		return $response;
	}
}

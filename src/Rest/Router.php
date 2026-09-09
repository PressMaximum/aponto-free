<?php
/**
 * REST router — route registration + cross-cutting response filters (`aponto/v1`).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Rest;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Rest\Support\RawResponse;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Registers every controller under `aponto/v1` and installs three cross-cutting filters, all scoped
 * to the namespace:
 *
 *   - `rest_request_after_callbacks`: rewrites WP's `rest_invalid_param` / `rest_missing_callback_param`
 *     into the contract `aponto_validation` 422 envelope with a `data.fields` map.
 *   - `rest_post_dispatch`: converts an error carrying `retry_after` into a response with the
 *     `Retry-After` header (rate limit + guard 429), stripping the internal field from the body.
 *   - `rest_pre_serve_request`: streams raw CSV/ICS bodies verbatim for {@see RawResponse}-marked
 *     responses instead of JSON-encoding them.
 */
final class Router {

	/**
	 * REST namespace.
	 */
	public const NAMESPACE = 'aponto/v1';

	/**
	 * Route prefix used to scope the cross-cutting filters.
	 */
	private const ROUTE_PREFIX = '/aponto/v1';

	/**
	 * Construct the router.
	 *
	 * @param list<Controller> $controllers Controllers to register.
	 */
	public function __construct( private array $controllers ) {}

	/**
	 * Register all routes and install the cross-cutting filters.
	 */
	public function register(): void {
		foreach ( $this->controllers as $controller ) {
			$controller->register( self::NAMESPACE );
		}

		add_filter( 'rest_request_after_callbacks', array( $this, 'normalizeErrors' ), 10, 3 );
		add_filter( 'rest_post_dispatch', array( $this, 'finalizeHeaders' ), 10, 3 );
		add_filter( 'rest_pre_serve_request', array( $this, 'serveRaw' ), 10, 4 );
	}

	/**
	 * Rewrite WP's parameter-validation errors into the `aponto_validation` envelope.
	 *
	 * @param WP_REST_Response|WP_Error $response Response or error from the handler/validation.
	 * @param array<string, mixed>      $handler  Matched route handler.
	 * @param WP_REST_Request           $request  Current request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function normalizeErrors( $response, $handler, $request ) {
		unset( $handler );
		if ( ! $this->isOurRoute( $request ) || ! is_wp_error( $response ) ) {
			return $response;
		}

		$code = $response->get_error_code();
		if ( 'rest_invalid_param' !== $code && 'rest_missing_callback_param' !== $code ) {
			return $response;
		}

		$data   = $response->get_error_data();
		$params = ( is_array( $data ) && isset( $data['params'] ) && is_array( $data['params'] ) ) ? $data['params'] : array();
		$fields = array();

		if ( 'rest_missing_callback_param' === $code ) {
			foreach ( $params as $name ) {
				$fields[ (string) $name ] = __( 'This field is required.', 'aponto' );
			}
		} else {
			foreach ( $params as $name => $message ) {
				$fields[ (string) $name ] = (string) $message;
			}
		}

		if ( array() === $fields ) {
			$fields['_'] = Errors::message( 'aponto_validation' );
		}

		return Errors::validation( $fields );
	}

	/**
	 * Attach the `Retry-After` header to a rate-limit / guard 429 result and strip the internal
	 * `retry_after` field from the body. Handles both a still-unconverted {@see WP_Error} and an
	 * already-converted error {@see WP_REST_Response}, so it works whether or not the dispatcher
	 * converted the error before `rest_post_dispatch`.
	 *
	 * @param WP_REST_Response|WP_Error $result  Dispatch result.
	 * @param mixed                     $server  REST server (unused).
	 * @param WP_REST_Request           $request Current request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function finalizeHeaders( $result, $server, $request ) {
		unset( $server );
		if ( ! $this->isOurRoute( $request ) ) {
			return $result;
		}

		$retry_after = null;

		if ( is_wp_error( $result ) ) {
			$data = $result->get_error_data();
			if ( is_array( $data ) && isset( $data[ Errors::RETRY_AFTER_KEY ] ) ) {
				$retry_after = (int) $data[ Errors::RETRY_AFTER_KEY ];
				unset( $data[ Errors::RETRY_AFTER_KEY ] );
				$clean  = new WP_Error( $result->get_error_code(), $result->get_error_message(), $data );
				$result = rest_convert_error_to_response( $clean );
			}
		} elseif ( $result instanceof WP_REST_Response ) {
			$data = $result->get_data();
			if ( is_array( $data ) && isset( $data['data'][ Errors::RETRY_AFTER_KEY ] ) ) {
				$retry_after = (int) $data['data'][ Errors::RETRY_AFTER_KEY ];
				unset( $data['data'][ Errors::RETRY_AFTER_KEY ] );
				$result->set_data( $data );
			}
		}

		if ( null !== $retry_after && $result instanceof WP_REST_Response ) {
			$result->header( 'Retry-After', (string) max( 1, $retry_after ) );
		}

		return $result;
	}

	/**
	 * Stream a {@see RawResponse}-marked body verbatim (CSV/ICS) instead of JSON.
	 *
	 * @param bool             $served  Whether the request has already been served.
	 * @param WP_REST_Response $result  Response.
	 * @param WP_REST_Request  $request Current request.
	 * @param mixed            $server  REST server (unused).
	 * @return bool
	 */
	public function serveRaw( $served, $result, $request, $server ) {
		unset( $server );
		if ( $served || ! $result instanceof WP_REST_Response || ! $this->isOurRoute( $request ) ) {
			return $served;
		}

		$headers   = $result->get_headers();
		$is_marked = false;
		foreach ( $headers as $name => $value ) {
			if ( 0 === strcasecmp( $name, RawResponse::MARKER ) ) {
				$is_marked = true;
			}
		}
		if ( ! $is_marked ) {
			return $served;
		}

		status_header( $result->get_status() );
		foreach ( $headers as $name => $value ) {
			if ( 0 === strcasecmp( $name, RawResponse::MARKER ) ) {
				continue;
			}
			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Header name/value are controller-fixed.
			header( $name . ': ' . $value );
		}

		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Raw CSV/ICS body streamed verbatim (non-HTML).
		echo $result->get_data();

		return true;
	}

	/**
	 * Whether the request targets an `aponto/v1` route.
	 *
	 * @param WP_REST_Request $request Current request.
	 */
	private function isOurRoute( WP_REST_Request $request ): bool {
		return str_starts_with( (string) $request->get_route(), self::ROUTE_PREFIX );
	}
}

<?php
/**
 * Thin Stripe REST transport over `wp_remote_*` (D-R39).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Payments\Stripe;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use WP_Error;

/**
 * Every HTTP call this module makes, and nothing else.
 *
 * **No SDK on purpose**, for the same reason `GoogleClient` has none: the runtime is not allowed to
 * depend on Composer at all (§5 invariant 1 / NB-2), and the surface actually needed is four
 * endpoints. Hand-written `wp_remote_*` also means the site's own HTTP filters, proxy configuration
 * and CA bundle apply, which an SDK's bundled cURL handling would bypass.
 *
 * Four properties of this class are load-bearing:
 *
 * 1. **The API version is PINNED** ({@see self::API_VERSION}). An unpinned integration changes
 *    behaviour on Stripe's release schedule rather than on ours, and the change arrives as a
 *    payment that stops working on a site nobody is watching.
 * 2. **Every POST carries an `Idempotency-Key`.** Core's own claim stops a duplicate DISPATCH; what
 *    duplicates a CHARGE is a request that succeeded and whose response was lost. The key is
 *    derived from {@see \Aponto\Payments\PaymentContext::$idempotency_key}, which is stable across
 *    retries of the same work by construction.
 * 3. **A 2xx that is not a JSON object is a FAILURE.** A truncated body, a proxy's HTML error page
 *    or a captive portal must never be read as an empty Stripe object — on the confirm leg that
 *    would mean "no payment", and on `begin` it would mean "no intent" for an intent that exists.
 * 4. **Stripe's own message never leaves this class.** It can carry key fragments, internal ids and
 *    the customer's own data, and the caller's `WP_Error` reaches a public REST response. Only a
 *    machine `reason` (Stripe's `error.code` enum) and a `decline_code` travel out.
 */
final class StripeClient {

	/**
	 * API base.
	 */
	public const API_BASE = 'https://api.stripe.com';

	/**
	 * The pinned Stripe API version. Changing it is a deliberate, tested upgrade.
	 */
	public const API_VERSION = '2024-06-20';

	/**
	 * Lowest timeout worth attempting. A budget shorter than this cannot complete a TLS handshake
	 * plus a Stripe round trip, so spending it produces a guaranteed failure and a wasted attempt.
	 */
	public const MIN_TIMEOUT = 3;

	/**
	 * Highest timeout, whatever the caller's budget says. Stripe's own p99 is far below this; a
	 * longer wait only holds a visitor's request open.
	 */
	public const MAX_TIMEOUT = 20;

	/**
	 * Classification: the credentials are wrong. Permanent, and an operator has to act.
	 */
	public const INVALID_KEY = 'invalid_key';

	/**
	 * Classification: the CUSTOMER's payment was declined. Permanent for this attempt, and not a
	 * fault of the site's — the customer may try another card while the hold lives.
	 */
	public const PAYMENT_FAILED = 'payment_failed';

	/**
	 * Classification: the request was wrong and repeating it will not help.
	 */
	public const PERMANENT = 'permanent';

	/**
	 * Classification: nothing is known about the outcome and a retry is safe (the idempotency key
	 * makes it so).
	 */
	public const RETRYABLE = 'retryable';

	/**
	 * Construct the client.
	 *
	 * @param string $secret_key Stripe secret or restricted key.
	 * @param int    $timeout    Request timeout in seconds (clamped by {@see self::clampTimeout()}).
	 */
	public function __construct(
		private string $secret_key,
		private int $timeout = 10
	) {
		$this->timeout = self::clampTimeout( $timeout );
	}

	/**
	 * Fit a caller's remaining budget into the range a Stripe call can actually use.
	 *
	 * @param int $seconds Seconds the caller has left.
	 */
	public static function clampTimeout( int $seconds ): int {
		return max( self::MIN_TIMEOUT, min( self::MAX_TIMEOUT, $seconds ) );
	}

	/**
	 * POST a form-encoded body.
	 *
	 * @param string               $path            Path under {@see self::API_BASE}.
	 * @param array<string, mixed> $body            Parameters (nested arrays are bracket-encoded).
	 * @param string               $idempotency_key Idempotency key; MUST be non-empty for a write.
	 * @return array<string, mixed>|WP_Error
	 */
	public function post( string $path, array $body, string $idempotency_key ) {
		$headers = array();
		if ( '' !== $idempotency_key ) {
			$headers['Idempotency-Key'] = $idempotency_key;
		}

		return $this->send( 'POST', $path, $headers, self::encodeBody( $body ) );
	}

	/**
	 * GET one object.
	 *
	 * @param string $path Path under {@see self::API_BASE}.
	 * @return array<string, mixed>|WP_Error
	 */
	public function get( string $path ) {
		return $this->send( 'GET', $path, array(), null );
	}

	/**
	 * DELETE one object.
	 *
	 * No idempotency key: Stripe does not accept one on a DELETE, and the operation is already
	 * idempotent — a second delete of the same object answers `resource_missing`, which is the state
	 * the caller wanted.
	 *
	 * @param string $path Path under {@see self::API_BASE}.
	 * @return array<string, mixed>|WP_Error
	 */
	public function delete( string $path ) {
		return $this->send( 'DELETE', $path, array(), null );
	}

	/**
	 * Stripe's form encoding: nested arrays become `a[b][c]=v`, lists become `a[0]=v`, booleans
	 * become `true`/`false` (Stripe reads `0`/`1` as strings for some parameters, and `false` is
	 * exactly the value that must not be misread).
	 *
	 * Pure and public so it is assertable without WordPress, which matters: a wrong bracket here
	 * silently drops `automatic_payment_methods[allow_redirects]` and Stripe then defaults to
	 * ALLOWING redirect methods, i.e. the V1 restriction disappears without any error.
	 *
	 * @param array<string, mixed> $body   Parameters.
	 * @param string               $prefix Internal: the parent key path.
	 */
	public static function encodeBody( array $body, string $prefix = '' ): string {
		$pairs = array();
		foreach ( $body as $key => $value ) {
			$name = '' === $prefix ? (string) $key : $prefix . '[' . (string) $key . ']';

			if ( null === $value ) {
				continue; // An absent parameter and an explicitly null one mean the same to Stripe.
			}
			if ( is_array( $value ) ) {
				$nested = self::encodeBody( $value, $name );
				if ( '' !== $nested ) {
					$pairs[] = $nested;
				}
				continue;
			}
			if ( is_bool( $value ) ) {
				$pairs[] = rawurlencode( $name ) . '=' . ( $value ? 'true' : 'false' );
				continue;
			}

			$pairs[] = rawurlencode( $name ) . '=' . rawurlencode( (string) $value );
		}

		return implode( '&', $pairs );
	}

	/**
	 * Classify a Stripe failure into the four outcomes this driver acts on.
	 *
	 * @param int                  $status HTTP status (0 for a transport failure).
	 * @param array<string, mixed> $body   Decoded error body (may be empty).
	 */
	public static function classify( int $status, array $body ): string {
		$error = isset( $body['error'] ) && is_array( $body['error'] ) ? $body['error'] : array();
		$type  = isset( $error['type'] ) && is_string( $error['type'] ) ? $error['type'] : '';

		if ( 401 === $status || 403 === $status ) {
			return self::INVALID_KEY;
		}
		if ( 402 === $status && 'card_error' === $type ) {
			return self::PAYMENT_FAILED;
		}
		if ( 400 === $status && 'invalid_request_error' === $type ) {
			return self::PERMANENT;
		}
		// 409 is Stripe answering "a request with this idempotency key is still in flight"; 429 is
		// rate limiting; 5xx and transport failures say nothing about the outcome. All three are
		// safe to repeat precisely BECAUSE the key is stable.
		if ( 0 === $status || 409 === $status || 429 === $status || $status >= 500 ) {
			return self::RETRYABLE;
		}

		return self::PERMANENT;
	}

	/**
	 * Stripe's machine error code (`card_declined`, `payment_intent_unexpected_state`, …) — never
	 * its message.
	 *
	 * @param array<string, mixed> $body Decoded error body.
	 */
	public static function reasonOf( array $body ): string {
		$error = isset( $body['error'] ) && is_array( $body['error'] ) ? $body['error'] : array();
		$code  = isset( $error['code'] ) && is_string( $error['code'] ) ? $error['code'] : '';
		if ( '' === $code && isset( $error['type'] ) && is_string( $error['type'] ) ) {
			$code = $error['type'];
		}

		return (string) preg_replace( '/[^a-z0-9_]/', '', strtolower( $code ) );
	}

	/**
	 * The PARAMETER Stripe blamed, when it named one (`url`, `amount`, …) — never its message.
	 *
	 * A machine token, on the same footing as `reason` and `decline_code`: it is what lets a caller
	 * tell "Stripe refused this URL" from every other `invalid_request_error` without reading the
	 * prose, which §5b.4 forbids passing through (D-R40d, QA run 2 BUG-4).
	 *
	 * @param array<string, mixed> $body Decoded error body.
	 */
	public static function paramOf( array $body ): string {
		$error = isset( $body['error'] ) && is_array( $body['error'] ) ? $body['error'] : array();
		$param = isset( $error['param'] ) && is_string( $error['param'] ) ? $error['param'] : '';

		return (string) preg_replace( '/[^a-z0-9_\[\]]/', '', strtolower( $param ) );
	}

	/**
	 * The decline code Stripe attaches to a card error, when it sent one.
	 *
	 * @param array<string, mixed> $body Decoded error body.
	 */
	public static function declineCodeOf( array $body ): string {
		$error = isset( $body['error'] ) && is_array( $body['error'] ) ? $body['error'] : array();
		$code  = isset( $error['decline_code'] ) && is_string( $error['decline_code'] ) ? $error['decline_code'] : '';

		return (string) preg_replace( '/[^a-z0-9_]/', '', strtolower( $code ) );
	}

	/**
	 * Perform one call and normalize the answer.
	 *
	 * @param string                $method  HTTP method.
	 * @param string                $path    Path under {@see self::API_BASE}.
	 * @param array<string, string> $headers Extra headers.
	 * @param string|null           $body    Form-encoded body, or null.
	 * @return array<string, mixed>|WP_Error
	 */
	private function send( string $method, string $path, array $headers, ?string $body ) {
		$args = array(
			'method'  => $method,
			'timeout' => $this->timeout,
			'headers' => array_merge(
				array(
					'Authorization'  => 'Bearer ' . $this->secret_key,
					'Stripe-Version' => self::API_VERSION,
					'Accept'         => 'application/json',
					'User-Agent'     => 'Aponto/' . ( defined( 'APONTO_VERSION' ) ? (string) APONTO_VERSION : '0' ),
				),
				$headers
			),
		);
		if ( null !== $body ) {
			$args['headers']['Content-Type'] = 'application/x-www-form-urlencoded';
			$args['body']                    = $body;
		}

		$response = wp_remote_request( self::API_BASE . $path, $args );

		if ( is_wp_error( $response ) ) {
			return self::failure( self::RETRYABLE, 0, '', '' );
		}

		$status = (int) wp_remote_retrieve_response_code( $response );
		$raw    = (string) wp_remote_retrieve_body( $response );
		// Assoc decoding erases the difference between `{}` and `[]`, and Stripe answers every one
		// of these endpoints with an OBJECT. A list where an object was promised is the signature of
		// a rewritten payload, not an empty result — so the shape is checked before the contents.
		$shape   = json_decode( $raw );
		$decoded = json_decode( $raw, true );
		$body_ok = $shape instanceof \stdClass && is_array( $decoded );

		if ( $status >= 200 && $status < 300 ) {
			if ( ! $body_ok ) {
				return self::failure( self::RETRYABLE, $status, 'malformed_response', '' );
			}

			return $decoded;
		}

		$error = $body_ok ? $decoded : array();

		return self::failure(
			self::classify( $status, $error ),
			$status,
			self::reasonOf( $error ),
			self::declineCodeOf( $error ),
			self::paramOf( $error )
		);
	}

	/**
	 * Build the driver-facing failure. Carries a classification, a machine reason and — for a card
	 * error — the decline code, and never Stripe's own prose.
	 *
	 * @param string $classification One of the four class constants.
	 * @param int    $status         HTTP status (0 for transport).
	 * @param string $reason         Stripe's machine error code, or ''.
	 * @param string $decline_code   Stripe's decline code, or ''.
	 * @param string $param          Parameter Stripe blamed, or ''.
	 */
	private static function failure( string $classification, int $status, string $reason, string $decline_code, string $param = '' ): WP_Error {
		return new WP_Error(
			'aponto_stripe_' . $classification,
			'Stripe API call failed.',
			array(
				'status'         => $status,
				'classification' => $classification,
				'reason'         => $reason,
				'decline_code'   => $decline_code,
				'param'          => $param,
			)
		);
	}
}

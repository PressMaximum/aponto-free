<?php
/**
 * REST error factory (`aponto/v1`).
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

use Aponto\Support\DomainException;
use WP_Error;

/**
 * Builds the canonical REST error envelope (rest-contract §1, error-registry). Every error is a
 * {@see WP_Error} whose `data` carries `status` (HTTP) and `fields` (always present; a non-empty
 * map only for validation). User-facing messages are localized and enumeration-safe; the stable
 * English strings live on the domain exceptions / server log only.
 */
final class Errors {

	/**
	 * Data key holding the seconds a rate-limited/guard `429` client must wait; the router copies
	 * it into the `Retry-After` header.
	 */
	public const RETRY_AFTER_KEY = 'retry_after';

	/**
	 * Localized, enumeration-safe user message for a stable error code (error-registry "User
	 * message guidance"). Public codes never reveal which resource/bucket triggered them.
	 *
	 * @param string $code Stable `aponto_*` error code.
	 * @return string Localized message.
	 */
	public static function message( string $code ): string {
		switch ( $code ) {
			case 'aponto_slot_taken':
				return __( 'That time slot is no longer available. Please pick another time.', 'aponto' );
			case 'aponto_lock_timeout':
				return __( 'The system is busy right now. Please try again in a moment.', 'aponto' );
			case 'aponto_idempotency_conflict':
				return __( 'This booking request does not match. Please resubmit your current booking.', 'aponto' );
			case 'aponto_idempotency_in_flight':
				return __( 'Your previous request is still being processed. Please wait a moment.', 'aponto' );
			case 'aponto_rate_limited':
				return __( 'Too many requests. Please try again later.', 'aponto' );
			case 'aponto_plan_limit':
				return __( 'Your current plan does not allow this operation.', 'aponto' );
			case 'aponto_has_dependents':
				return __( 'This item cannot be deleted because related records exist. Archive it instead.', 'aponto' );
			case 'aponto_invalid_transition':
				return __( 'This action is not available for the current status.', 'aponto' );
			case 'aponto_too_late_to_cancel':
				return __( 'The cancellation deadline for this booking has passed.', 'aponto' );
			case 'aponto_not_found':
				return __( 'The requested resource was not found or is not available.', 'aponto' );
			case 'aponto_validation':
				return __( 'The submitted data is invalid.', 'aponto' );
			case 'aponto_forbidden':
				return __( 'You are not allowed to perform this operation.', 'aponto' );
			case 'aponto_unauthenticated':
				return __( 'You must be signed in to perform this operation.', 'aponto' );
			case 'aponto_range_too_wide':
				return __( 'The requested date range exceeds the allowed maximum.', 'aponto' );
			case 'aponto_service_unavailable':
				return __( 'The service is temporarily unavailable. Please try again shortly.', 'aponto' );
			case 'aponto_settings_conflict':
				return __( 'Settings changed elsewhere — reload to get the latest values.', 'aponto' );
			case 'aponto_internal':
				return __( 'The request could not be completed.', 'aponto' );
			case 'aponto_driver_missing':
				return __( 'This integration is not available on this site.', 'aponto' );
			case 'aponto_oauth_state_invalid':
				return __( 'This authorization link has expired or was already used. Start the connection again.', 'aponto' );
			case 'aponto_integration_error':
				return __( 'The calendar provider could not complete this request. Please try again.', 'aponto' );
			case 'aponto_webhook_invalid':
				// ONE message for every verification failure (D-R38f): naming the cause would tell an
				// attacker which secret is close.
				return __( 'This request could not be verified.', 'aponto' );
			case 'aponto_payment_unavailable':
				return __( 'Online payment is not available for this booking right now.', 'aponto' );
			case 'aponto_payment_state':
				return __( 'The current payment status does not allow this action.', 'aponto' );
			case 'aponto_payment_error':
				// NEVER the provider's own text: it can carry key fragments, internal URLs or the
				// customer's own data, and this string reaches a public response.
				return __( 'The payment provider could not complete this request. Please try again.', 'aponto' );
			case 'aponto_coupon_invalid':
				return __( 'This coupon is not available.', 'aponto' );
			default:
				return __( 'The request could not be completed.', 'aponto' );
		}
	}

	/**
	 * Generic error by code + HTTP status (no field map).
	 *
	 * @param string               $code    Stable error code.
	 * @param int                  $status  HTTP status.
	 * @param array<string, mixed> $extra   Extra data merged into `data` (e.g. retry_after).
	 * @param string|null          $message Optional explicit message; defaults to the code's message.
	 */
	public static function make( string $code, int $status, array $extra = array(), ?string $message = null ): WP_Error {
		$data = array_merge(
			array(
				'status' => $status,
				'fields' => (object) array(),
			),
			$extra
		);

		return new WP_Error( $code, $message ?? self::message( $code ), $data );
	}

	/**
	 * A `401 aponto_unauthenticated` error.
	 */
	public static function unauthenticated(): WP_Error {
		return self::make( 'aponto_unauthenticated', 401 );
	}

	/**
	 * A `403 aponto_forbidden` error.
	 */
	public static function forbidden(): WP_Error {
		return self::make( 'aponto_forbidden', 403 );
	}

	/**
	 * A `403 aponto_plan_limit` error (Free plan limit).
	 */
	public static function planLimit(): WP_Error {
		return self::make( 'aponto_plan_limit', 403 );
	}

	/**
	 * A `404 aponto_not_found` error (uniform for public token lookups).
	 */
	public static function notFound(): WP_Error {
		return self::make( 'aponto_not_found', 404 );
	}

	/**
	 * A `409 aponto_has_dependents` error.
	 */
	public static function hasDependents(): WP_Error {
		return self::make( 'aponto_has_dependents', 409 );
	}

	/**
	 * A `409 aponto_settings_conflict` error — the client's settings snapshot is stale
	 * (rest-contract §2.11 addendum 2026-07-19 C1; error-registry addendum same date).
	 */
	public static function settingsConflict(): WP_Error {
		return self::make( 'aponto_settings_conflict', 409 );
	}

	/**
	 * A `500 aponto_internal` error (error-registry 2026-07-19 B4/#12): a storage write failed
	 * mid-operation and the server ROLLED BACK — no partial state exists. The user message is the
	 * generic localized string; the SQL error stays server-side only.
	 */
	public static function internal(): WP_Error {
		return self::make( 'aponto_internal', 500 );
	}

	/**
	 * A `503 aponto_lock_timeout` error (error-registry canonical, retryable) — an admin write could
	 * not acquire (or lost) its serialization lock, so it fail-closed rather than run unserialized.
	 * Same code the booking engine surfaces for its `GET_LOCK` timeouts; the client retries shortly.
	 */
	public static function lockTimeout(): WP_Error {
		return self::make( 'aponto_lock_timeout', 503 );
	}

	/**
	 * A `429 aponto_rate_limited` error carrying the retry-after seconds.
	 *
	 * @param int $retry_after Seconds remaining in the window.
	 */
	public static function rateLimited( int $retry_after ): WP_Error {
		return self::make( 'aponto_rate_limited', 429, array( self::RETRY_AFTER_KEY => max( 1, $retry_after ) ) );
	}

	/**
	 * A `422 aponto_validation` error with a per-field message map.
	 *
	 * @param array<string, string> $fields Field => localized message.
	 */
	public static function validation( array $fields ): WP_Error {
		return new WP_Error(
			'aponto_validation',
			self::message( 'aponto_validation' ),
			array(
				'status' => 422,
				'fields' => $fields,
			)
		);
	}

	/**
	 * Map a domain exception to its REST error using its own stable code + HTTP status
	 * (every {@see DomainException} declares both). The user message is the localized,
	 * enumeration-safe variant, not the exception's English log message. A rate-limit exception
	 * additionally carries its `Retry-After` seconds into the response-header pipeline.
	 *
	 * @param DomainException $exception Domain exception.
	 */
	public static function fromDomain( DomainException $exception ): WP_Error {
		if ( $exception instanceof \Aponto\Rest\Support\RateLimited ) {
			return self::rateLimited( $exception->retryAfter() );
		}

		if ( $exception instanceof \Aponto\Booking\Exception\InvalidTransition && $exception->premature ) {
			// Forceable premature transition (422, SPEC-P1 §1.4): a specific message so the admin UI
			// can explain the force dialog instead of a generic conflict (fleet-r1 U2 F3). The
			// guidance names the instant that is actually in the way — `end_utc` for a complete,
			// `start_utc` for a no-show (D-R33) — because guidance pointing at the wrong one is
			// worse than none.
			$message = 'no_show' === $exception->to
				? __( 'This appointment has not started yet. Force it with a reason to mark it as a no-show.', 'aponto' )
				: __( 'This appointment has not ended yet. Force-complete it to close it early.', 'aponto' );

			return self::make( $exception->errorCode(), $exception->httpStatus(), array( 'premature' => true ), $message );
		}

		if ( $exception instanceof \Aponto\Payments\PaymentException && '' !== $exception->publicMessage() ) {
			// A payment 409 that carries its OWN copy (D-R39b). The registry message stays the
			// default; this is for the case where the generic sentence names no cause the operator
			// could act on. The copy is authored in core, never echoed from a gateway.
			return self::make( $exception->errorCode(), $exception->httpStatus(), array(), $exception->publicMessage() );
		}

		return self::make( $exception->errorCode(), $exception->httpStatus() );
	}

	/**
	 * Re-wrap a guard {@see WP_Error} as `aponto_guard_rejected`, preserving its HTTP status and
	 * message (error-registry). A `429` guard result keeps its `Retry-After` when supplied in the
	 * original error data.
	 *
	 * @param WP_Error $guard_error Error returned by `aponto_public_booking_guard`.
	 */
	public static function fromGuard( WP_Error $guard_error ): WP_Error {
		$original = $guard_error->get_error_data();
		$status   = 403;
		if ( is_array( $original ) && isset( $original['status'] ) ) {
			$status = (int) $original['status'];
		}

		$data = array(
			'status' => $status,
			'fields' => (object) array(),
		);
		if ( is_array( $original ) && isset( $original[ self::RETRY_AFTER_KEY ] ) ) {
			$data[ self::RETRY_AFTER_KEY ] = max( 1, (int) $original[ self::RETRY_AFTER_KEY ] );
		}

		$message = $guard_error->get_error_message();
		if ( '' === $message ) {
			$message = self::message( 'aponto_guard_rejected' );
		}

		return new WP_Error( 'aponto_guard_rejected', $message, $data );
	}
}

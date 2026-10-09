<?php
/**
 * Idempotency request fingerprint (SPEC-P0 §5.6, §4.2).
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
 * Computes the canonical `request_hash` stored alongside an idempotency key. Two requests carrying
 * the SAME `X-Aponto-Idempotency` key must produce the SAME fingerprint to replay, and a DIFFERENT
 * fingerprint to conflict (409). The client regenerates its key whenever the booking draft changes,
 * so the fingerprint only needs to be deterministic over the meaningful booking fields.
 *
 * LOCKSTEP (D-R30). The widget mirrors this field list in `assets/src/form/lib/idempotency.js`
 * (`draftFingerprint()`) to decide when to rotate its key. The two encodings are deliberately
 * different — the client cannot compute a SHA-256 without shipping a hash implementation into a
 * 60 KB budget — but the field SET must match exactly: a field the server hashes and the client does
 * not is a field the customer can edit without rotating the key, and the retry then returns
 * `409 aponto_idempotency_conflict` on a booking the customer legitimately changed. That is why
 * `custom_fields` is on BOTH sides, and why `tests/fixtures/idempotency-lockstep.json` drives one
 * Jest test and one PHPUnit test over the same drafts.
 */
final class RequestFingerprint {

	/**
	 * Canonical fingerprint of a public booking request.
	 *
	 * `custom_fields` is included ONLY when the request carries answers, so a site that configures
	 * no extra fields — every Free site, and every Premium site before the module is set up —
	 * produces byte-identical hashes to the pre-D-R30 build and an upgrade cannot turn an in-flight
	 * retry into a 409.
	 *
	 * @param int                        $service_id    Service id.
	 * @param int|null                   $staff_id      Staff id (null = any-staff).
	 * @param int                        $location_id   Location id.
	 * @param string                     $start_utc     RFC3339 UTC start.
	 * @param string                     $timezone      Customer IANA timezone.
	 * @param string                     $email_norm    Normalized email.
	 * @param string                     $first_name    Customer first name (name split, D-R69).
	 * @param string                     $last_name     Customer last name.
	 * @param string                     $phone         Customer phone.
	 * @param string                     $note          Customer note.
	 * @param bool                       $consent       Consent flag.
	 * @param array<string, string|bool> $custom_fields Validated custom-field answers (D-R30).
	 * @param string                     $payment_method Chosen payment module code, '' for none (D-R38).
	 * @param string                     $coupon_code Canonical coupon code, '' for none (D-R67).
	 * @param string                     $amount_mode Initial payment choice; only full changes legacy hashes.
	 */
	public static function forBooking(
		int $service_id,
		?int $staff_id,
		int $location_id,
		string $start_utc,
		string $timezone,
		string $email_norm,
		string $first_name,
		string $last_name,
		string $phone,
		string $note,
		bool $consent,
		array $custom_fields = array(),
		string $payment_method = '',
		string $coupon_code = '',
		string $amount_mode = 'deposit'
	): string {
		$canonical = array(
			'service_id'  => $service_id,
			'staff_id'    => $staff_id,
			'location_id' => $location_id,
			'start_utc'   => $start_utc,
			'timezone'    => $timezone,
			'email_norm'  => $email_norm,
			// The two parts replace the pre-split `name` (founder 2026-10-01, D-R69): moving a word
			// from one part to the other ("Mary Jane|Smith" vs "Mary|Jane Smith") is a different
			// booking request, so it must hash differently on both sides of the lockstep.
			'first_name'  => $first_name,
			'last_name'   => $last_name,
			'phone'       => $phone,
			'note'        => $note,
			'consent'     => $consent,
		);
		if ( array() !== $custom_fields ) {
			ksort( $custom_fields );
			$canonical['custom_fields'] = $custom_fields;
		}
		// Included only when a method was chosen, on the same reasoning as `custom_fields`: a site
		// that takes no online payment hashes byte-identically to the pre-D-R38 build, so upgrading
		// mid-flight cannot turn an in-flight retry into a 409. Changing the METHOD is a different
		// booking request — the customer switched from paying now to paying on site — and must
		// rotate the key rather than replay the first attempt.
		if ( '' !== $payment_method ) {
			$canonical['payment_method'] = $payment_method;
		}
		if ( '' !== $coupon_code ) {
			$canonical['coupon_code'] = $coupon_code;
		}
		if ( 'full' === $amount_mode ) {
			$canonical['payment_amount_mode'] = 'full';
		}
		ksort( $canonical );

		return hash( 'sha256', (string) wp_json_encode( $canonical ) );
	}

	/**
	 * The SHA-256 of the EXACT submitted request body (D-R67u): the identity a same-key replay may be
	 * resolved on before any validation or guard.
	 *
	 * Deliberately NOT the lockstep fingerprint above, which normalizes (trims, casts, drops empty
	 * optional parts) and therefore lets payloads with different ordinary-path outcomes share a
	 * hash. This one keeps every submitted key, every value and its JSON type, and presence
	 * (`null`, `""`, `{}` and absent all differ). Objects are key-sorted recursively; lists keep
	 * their order. Only routing plumbing is excluded — exactly {@see RequestFields::TRANSPORT_KEYS},
	 * the list the unknown-field checks ignore.
	 *
	 * @param \WP_REST_Request $request Request.
	 */
	public static function exact( \WP_REST_Request $request ): string {
		$body = array_merge(
			(array) $request->get_query_params(),
			(array) $request->get_body_params(),
			(array) $request->get_json_params()
		);
		foreach ( RequestFields::TRANSPORT_KEYS as $transport ) {
			unset( $body[ $transport ] );
		}

		return hash( 'sha256', (string) wp_json_encode( self::canonical( $body ), JSON_PRESERVE_ZERO_FRACTION ) );
	}

	/**
	 * Recursively key-sort associative arrays; keep lists (and every scalar type) as they are.
	 *
	 * @param mixed $value Submitted value.
	 * @return mixed Canonical value.
	 */
	private static function canonical( mixed $value ): mixed {
		if ( ! is_array( $value ) ) {
			return $value;
		}
		if ( array() !== $value && array_is_list( $value ) ) {
			return array_map( array( self::class, 'canonical' ), $value );
		}
		ksort( $value, SORT_STRING );
		foreach ( $value as $key => $item ) {
			$value[ $key ] = self::canonical( $item );
		}

		// An empty array is emitted as `{}` (an empty OBJECT is what a JSON client sends and what a
		// form-encoded body can produce); it still differs from `null`, `""` and absence.
		return array() === $value ? new \stdClass() : $value;
	}
}

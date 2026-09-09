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
	 * @param string                     $name          Customer name.
	 * @param string                     $phone         Customer phone.
	 * @param string                     $note          Customer note.
	 * @param bool                       $consent       Consent flag.
	 * @param array<string, string|bool> $custom_fields Validated custom-field answers (D-R30).
	 * @param string                     $payment_method Chosen payment module code, '' for none (D-R38).
	 */
	public static function forBooking(
		int $service_id,
		?int $staff_id,
		int $location_id,
		string $start_utc,
		string $timezone,
		string $email_norm,
		string $name,
		string $phone,
		string $note,
		bool $consent,
		array $custom_fields = array(),
		string $payment_method = ''
	): string {
		$canonical = array(
			'service_id'  => $service_id,
			'staff_id'    => $staff_id,
			'location_id' => $location_id,
			'start_utc'   => $start_utc,
			'timezone'    => $timezone,
			'email_norm'  => $email_norm,
			'name'        => $name,
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
		ksort( $canonical );

		return hash( 'sha256', (string) wp_json_encode( $canonical ) );
	}
}

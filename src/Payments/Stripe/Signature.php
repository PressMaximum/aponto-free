<?php
/**
 * Stripe webhook signature verification (D-R39).
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

/**
 * The `Stripe-Signature` check, and the only thing standing between a public URL and the payment
 * state machine.
 *
 * Pure, static and WordPress-free so the whole of it is assertable from self-built vectors on the
 * host: a known secret plus a known payload plus a known timestamp has exactly one correct `v1`,
 * and every rejection path can be proved rather than assumed.
 *
 * Four properties matter, and each of them is a real attack if dropped:
 *
 * - **The signature covers the RAW bytes.** `"{t}.{body}"` where `body` is exactly what arrived.
 *   Core hands over an untouched string for this reason ({@see \Aponto\Payments\WebhookRequest}).
 * - **Comparison is constant-time.** `hash_equals`, never `===`: a byte-by-byte comparison leaks,
 *   through timing, how much of a forged signature was right.
 * - **Timestamps are bounded in BOTH directions.** A stale `t` is a replay; a far-future `t` is a
 *   forgery attempt against a clock, and a one-sided check accepts it forever.
 * - **Every `v1` is tried.** Stripe sends more than one during a signing-secret rotation, and
 *   checking only the first turns a rotation into an outage.
 */
final class Signature {

	/**
	 * Seconds a signed timestamp may differ from now, in either direction.
	 */
	public const TOLERANCE = 300;

	/**
	 * Whether `$header` authenticates `$payload` under `$secret`.
	 *
	 * @param string $payload   RAW request body, byte for byte.
	 * @param string $header    The `Stripe-Signature` header value.
	 * @param string $secret    The endpoint's signing secret (`whsec_…`).
	 * @param int    $now       Current unix timestamp, from the injected clock — never `time()`.
	 * @param int    $tolerance Allowed clock difference in seconds.
	 */
	public static function verify( string $payload, string $header, string $secret, int $now, int $tolerance = self::TOLERANCE ): bool {
		if ( '' === $secret || '' === $header ) {
			return false;
		}

		$parsed = self::parse( $header );
		if ( null === $parsed['timestamp'] || array() === $parsed['signatures'] ) {
			return false;
		}
		if ( abs( $now - $parsed['timestamp'] ) > $tolerance ) {
			return false;
		}

		$expected = hash_hmac( 'sha256', $parsed['timestamp'] . '.' . $payload, $secret );

		$ok = false;
		foreach ( $parsed['signatures'] as $candidate ) {
			// NOT short-circuited on the first match: `hash_equals` is constant-time per comparison,
			// and bailing out early would make the NUMBER of comparisons depend on which signature
			// matched.
			$ok = hash_equals( $expected, $candidate ) || $ok;
		}

		return $ok;
	}

	/**
	 * Split the header into its timestamp and its `v1` signatures.
	 *
	 * Everything unexpected — a missing `t`, a non-numeric `t`, a scheme other than `v1`, a stray
	 * element — is dropped rather than repaired. A header this parser cannot read is a header this
	 * site did not send, and there is nothing to recover.
	 *
	 * @param string $header Raw header value.
	 * @return array{timestamp: int|null, signatures: list<string>}
	 */
	private static function parse( string $header ): array {
		$timestamp  = null;
		$signatures = array();

		foreach ( explode( ',', $header ) as $element ) {
			$pair = explode( '=', trim( $element ), 2 );
			if ( 2 !== count( $pair ) ) {
				continue;
			}
			$scheme = trim( $pair[0] );
			$value  = trim( $pair[1] );

			if ( 't' === $scheme && 1 === preg_match( '/^\d{1,12}$/', $value ) ) {
				$timestamp = (int) $value;
				continue;
			}
			if ( 'v1' === $scheme && 1 === preg_match( '/^[a-f0-9]{64}$/', $value ) ) {
				$signatures[] = $value;
			}
		}

		return array(
			'timestamp'  => $timestamp,
			'signatures' => $signatures,
		);
	}
}

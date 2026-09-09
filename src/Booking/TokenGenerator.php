<?php
/**
 * Manage-token and order-code generation (§6.4, §4.2).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Booking;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * Generates the public manage token and the public order code.
 *
 * Manage token (§6.4): 43 chars over `[A-Za-z0-9_-]`. The raw token is NEVER stored;
 * `hash('sha256', $raw)` (hex, 64) is persisted as `token_hash` (NB-4).
 *
 * Two producers, one shape. {@see self::rawToken()} mints `base64url(random_bytes(32))` — used for
 * the provisional hash a booking is inserted with, and as the fallback when no derivation secret is
 * available. {@see self::derive()} computes the DURABLE token of D-R26 from a booking's identity
 * under a site secret, so every lifecycle email can rebuild the same link without the raw token
 * ever being at rest.
 *
 * Order code (§4.2): `AP-` + 5 chars over `23456789ABCDEFGHJKMNPQRSTVWXYZ` (0/1/I/L/O/U removed to
 * avoid misreads over the phone). Non-enumerable; UNIQUE collisions are retried by the repository.
 */
final class TokenGenerator {

	/**
	 * Order-code alphabet — unambiguous when read aloud (§4.2).
	 */
	private const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

	/**
	 * A fresh raw manage token: 43 URL-safe base64 chars (§6.4).
	 */
	public function rawToken(): string {
		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- URL-safe token encoding of CSPRNG bytes, not obfuscation.
		return rtrim( strtr( base64_encode( random_bytes( 32 ) ), '+/', '-_' ), '=' );
	}

	/**
	 * The DERIVED manage token for a booking (D-R26): `HMAC-SHA256(secret, "{id}|{created_at}")`
	 * rendered in exactly the shape {@see self::rawToken()} produces — 32 bytes of MAC output →
	 * 43 URL-safe base64 chars over `[A-Za-z0-9_-]`. Identical alphabet and length, so the route
	 * regex, the hash lookup and the uniform-404 semantics are untouched (§6.4, §5 invariant 8).
	 *
	 * Deterministic BY DESIGN: the same booking always yields the same token, which is what lets
	 * every lifecycle email carry the SAME live manage link without ever storing anything
	 * recoverable — only `sha256(raw)` reaches the database, exactly as before. Unforgeable without
	 * the secret: the inputs (`id`, `created_at`) are guessable, so all the entropy lives in the
	 * 256-bit CSPRNG secret, which {@see \Aponto\Booking\ManageToken} keeps encrypted at rest.
	 *
	 * Pure — the secret is passed in, so this stays unit-testable without WordPress.
	 *
	 * @param string $secret     Raw 32-byte derivation secret.
	 * @param int    $booking_id Booking id.
	 * @param string $created_at Booking `created_at` exactly as stored (`Y-m-d H:i:s`).
	 */
	public function derive( string $secret, int $booking_id, string $created_at ): string {
		$mac = hash_hmac( 'sha256', $booking_id . '|' . $created_at, $secret, true );

		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- URL-safe token encoding of MAC output, not obfuscation.
		return rtrim( strtr( base64_encode( $mac ), '+/', '-_' ), '=' );
	}

	/**
	 * SHA-256 hex (64 chars) of a raw token — the stored `token_hash`.
	 *
	 * @param string $raw Raw token.
	 */
	public function hash( string $raw ): string {
		return hash( 'sha256', $raw );
	}

	/**
	 * A fresh public order code `AP-XXXXX` (§4.2).
	 */
	public function orderCode(): string {
		$max  = strlen( self::CODE_ALPHABET ) - 1;
		$code = '';
		for ( $i = 0; $i < 5; $i++ ) {
			$code .= self::CODE_ALPHABET[ random_int( 0, $max ) ];
		}

		return 'AP-' . $code;
	}
}

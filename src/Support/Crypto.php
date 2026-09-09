<?php
/**
 * Encrypt-at-rest primitive.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Support;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * Authenticated encryption for data at rest (§7, extension-surface §5.3.5).
 *
 * Primary: `sodium_crypto_secretbox` (XSalsa20-Poly1305), 24-byte random nonce.
 * Fallback: OpenSSL AES-256-GCM, 12-byte IV + 16-byte tag, when libsodium is unavailable.
 *
 * The key is ALWAYS a binary 32-byte value derived as
 * `hash('sha256', SECURE_AUTH_KEY . $domain, true)` — a 64-char hex digest is NOT a valid key
 * and is rejected (§7). The `$domain` string (e.g. `aponto-mail`, `aponto-module-secret`) gives
 * cryptographic domain separation; an optional `$context` string additionally binds a cipher to
 * a specific field (see {@see self::deriveKey()}). A blob sealed under one domain/context can
 * never be opened under another because the derived keys differ and both primitives authenticate.
 *
 * Wire format (before base64): `ALGO_BYTE . payload`
 *   - sodium : `\x01 . nonce(24) . cipher`
 *   - openssl: `\x02 . iv(12) . tag(16) . cipher`
 * The leading algo byte lets {@see self::decrypt()} pick the right primitive deterministically
 * and leaves room for future key-version tagging (privacy-inventory OQ8).
 */
final class Crypto {

	private const KEY_BYTES      = 32;
	private const ALGO_SODIUM    = "\x01";
	private const ALGO_OPENSSL   = "\x02";
	private const SODIUM_NONCE   = 24;
	private const OPENSSL_IV     = 12;
	private const OPENSSL_TAG    = 16;
	private const OPENSSL_CIPHER = 'aes-256-gcm';

	/**
	 * Construct the cipher.
	 *
	 * @param string $auth_key      Site secret (normally SECURE_AUTH_KEY).
	 * @param bool   $prefer_sodium When false, force the OpenSSL path (test seam / degraded hosts).
	 */
	public function __construct(
		private string $auth_key,
		private bool $prefer_sodium = true
	) {}

	/**
	 * Derive the binary 32-byte key for a domain and optional context. Rejects a hex digest.
	 *
	 * With an empty context the derivation is exactly the §7 formula
	 * `hash('sha256', SECURE_AUTH_KEY . $domain, true)` — pure-domain callers stay byte-identical.
	 * A non-empty context appends `'|' . $context` to the key material, cryptographically binding
	 * the cipher to one field (e.g. `{module_code}|{scope}|{dotted_path}` for module secrets), so
	 * a blob sealed for one field can never decrypt at another (swap rejection).
	 *
	 * @param string $auth_key Site secret.
	 * @param string $domain   Domain-separation string.
	 * @param string $context  Optional context binding (empty = pure domain).
	 * @return string 32 raw bytes.
	 * @throws \InvalidArgumentException When the key material is unusable or not 32 raw bytes.
	 */
	public static function deriveKey( string $auth_key, string $domain, string $context = '' ): string {
		if ( ! self::isUsableKeyMaterial( $auth_key ) ) {
			// REST review 2026-07-12 (REST-7): never derive from empty/placeholder key material —
			// a source-code-known key gives only the illusion of encryption at rest.
			throw new \InvalidArgumentException(
				esc_html( 'Aponto\\Support\\Crypto: SECURE_AUTH_KEY is missing or a placeholder; refusing to derive an encryption key.' )
			);
		}

		$material = '' === $context ? $auth_key . $domain : $auth_key . $domain . '|' . $context;

		return self::requireRawKey( hash( 'sha256', $material, true ) );
	}

	/**
	 * Whether key material is usable for encryption: non-empty and not the WordPress
	 * `wp-config-sample.php` placeholder (REST-7).
	 *
	 * @param string $auth_key Candidate key material.
	 */
	public static function isUsableKeyMaterial( string $auth_key ): bool {
		return '' !== $auth_key && 'put your unique phrase here' !== $auth_key;
	}

	/**
	 * Assert a key is a raw 32-byte value, not a hex digest.
	 *
	 * @param string $key Candidate key.
	 * @return string The validated key.
	 * @throws \InvalidArgumentException When the key is not exactly 32 raw bytes.
	 */
	public static function requireRawKey( string $key ): string {
		if ( self::KEY_BYTES !== strlen( $key ) ) {
			throw new \InvalidArgumentException(
				esc_html( 'Aponto\\Support\\Crypto: key must be 32 raw bytes; a 64-char hex digest is not a valid key.' )
			);
		}

		return $key;
	}

	/**
	 * Encrypt a plaintext for a domain (and optional field context), returning a base64 blob.
	 *
	 * @param string $plaintext Data to protect.
	 * @param string $domain    Domain-separation string.
	 * @param string $context   Optional context binding (see {@see self::deriveKey()}).
	 * @throws \RuntimeException When OpenSSL encryption fails on the fallback path.
	 */
	public function encrypt( string $plaintext, string $domain, string $context = '' ): string {
		$key = self::deriveKey( $this->auth_key, $domain, $context );

		if ( $this->prefer_sodium && function_exists( 'sodium_crypto_secretbox' ) ) {
			$nonce  = random_bytes( self::SODIUM_NONCE );
			$cipher = sodium_crypto_secretbox( $plaintext, $nonce, $key );

			// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- Binary-safe transport of ciphertext, not obfuscation.
			return base64_encode( self::ALGO_SODIUM . $nonce . $cipher );
		}

		$iv     = random_bytes( self::OPENSSL_IV );
		$tag    = '';
		$cipher = openssl_encrypt( $plaintext, self::OPENSSL_CIPHER, $key, OPENSSL_RAW_DATA, $iv, $tag, '', self::OPENSSL_TAG );

		if ( false === $cipher ) {
			throw new \RuntimeException( esc_html( 'Aponto\\Support\\Crypto: OpenSSL encryption failed.' ) );
		}

		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- Binary-safe transport of ciphertext, not obfuscation.
		return base64_encode( self::ALGO_OPENSSL . $iv . $tag . $cipher );
	}

	/**
	 * Decrypt a blob for a domain (and optional field context). Returns null on any
	 * authentication/format failure — including a context mismatch.
	 *
	 * @param string $blob    Base64 blob from {@see self::encrypt()}.
	 * @param string $domain  Domain-separation string.
	 * @param string $context Optional context binding (see {@see self::deriveKey()}).
	 */
	public function decrypt( string $blob, string $domain, string $context = '' ): ?string {
		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode -- Decoding our own ciphertext transport, not obfuscation.
		$raw = base64_decode( $blob, true );
		if ( false === $raw || '' === $raw ) {
			return null;
		}

		$key  = self::deriveKey( $this->auth_key, $domain, $context );
		$algo = $raw[0];
		$body = substr( $raw, 1 );

		if ( self::ALGO_SODIUM === $algo ) {
			return $this->openSodium( $body, $key );
		}

		if ( self::ALGO_OPENSSL === $algo ) {
			return $this->openOpenssl( $body, $key );
		}

		return null;
	}

	/**
	 * Open a sodium secretbox body (`nonce . cipher`).
	 *
	 * @param string $body Nonce + ciphertext.
	 * @param string $key  32-byte key.
	 */
	private function openSodium( string $body, string $key ): ?string {
		if ( ! function_exists( 'sodium_crypto_secretbox_open' ) || strlen( $body ) <= self::SODIUM_NONCE ) {
			return null;
		}

		$nonce  = substr( $body, 0, self::SODIUM_NONCE );
		$cipher = substr( $body, self::SODIUM_NONCE );
		$plain  = sodium_crypto_secretbox_open( $cipher, $nonce, $key );

		return false === $plain ? null : $plain;
	}

	/**
	 * Open an AES-256-GCM body (`iv . tag . cipher`).
	 *
	 * @param string $body IV + tag + ciphertext.
	 * @param string $key  32-byte key.
	 */
	private function openOpenssl( string $body, string $key ): ?string {
		$min = self::OPENSSL_IV + self::OPENSSL_TAG;
		if ( strlen( $body ) < $min ) {
			return null;
		}

		$iv     = substr( $body, 0, self::OPENSSL_IV );
		$tag    = substr( $body, self::OPENSSL_IV, self::OPENSSL_TAG );
		$cipher = substr( $body, $min );
		$plain  = openssl_decrypt( $cipher, self::OPENSSL_CIPHER, $key, OPENSSL_RAW_DATA, $iv, $tag );

		return false === $plain ? null : $plain;
	}
}

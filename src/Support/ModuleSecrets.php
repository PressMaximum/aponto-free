<?php
/**
 * Module secret encryption helper.
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
 * Encrypts a module's declared secret fields before they are stored, and decrypts/masks them on
 * read (§4.3, extension-surface §5.3). A module declares its secret dotted paths through the
 * `aponto_module_secret_keys` filter; those values are sealed with {@see Crypto} under the
 * `aponto-module-secret` domain before `update_option`, and never returned in plaintext to REST.
 *
 * The path helpers accept dotted keys such as `client_secret` or `token.access_token`. The REST
 * wire semantics ({"keep":true} / null / new value) live in the generic settings controller and
 * are out of scope here; this helper only performs the storage transform.
 */
final class ModuleSecrets {

	/**
	 * Encryption domain for module secrets (§7 / extension-surface §5.3.5).
	 */
	public const DOMAIN = 'aponto-module-secret';

	/**
	 * Construct with a cipher.
	 *
	 * @param Crypto $crypto Encrypt-at-rest primitive.
	 */
	public function __construct( private Crypto $crypto ) {}

	/**
	 * The site's raw key material — possibly empty, NEVER substituted.
	 *
	 * The ONE reader of `SECURE_AUTH_KEY` for module secrets. It exists because the substitution it
	 * replaces was made independently in three places (`ModulesController`, `Rest\Services`, the
	 * module `Config`), each falling back to the literal `'fallback'` when the constant was absent —
	 * and {@see Crypto::isUsableKeyMaterial()} ACCEPTS that string, so those sites would have sealed
	 * an OAuth client secret under a key printed in the plugin source. One reader makes the
	 * substitution unrepresentable rather than merely absent (Codex round 3, P1 #1).
	 */
	public static function siteKeyMaterial(): string {
		return defined( 'SECURE_AUTH_KEY' ) ? (string) SECURE_AUTH_KEY : '';
	}

	/** Whether this site can seal or open a module secret at all. */
	public static function isAvailable(): bool {
		return Crypto::isUsableKeyMaterial( self::siteKeyMaterial() );
	}

	/**
	 * A vault bound to the site's real key material.
	 *
	 * Always constructible — {@see Crypto} only rejects unusable material when a key is actually
	 * DERIVED — so a controller can build one at construction time and still fail closed at the
	 * write. Callers that are about to store or replace a secret must check {@see self::isAvailable()}
	 * first and refuse; callers that only MASK need no key at all.
	 */
	public static function forSite(): self {
		return new self( new Crypto( self::siteKeyMaterial() ) );
	}

	/**
	 * Whether a stored secret at a dotted path AUTHENTICATES under this module/scope/path context.
	 *
	 * The one primitive behind every "is this really configured?" question (Codex round 3, P2). A
	 * non-empty string is NOT evidence: a cipher sealed under key material the site no longer has —
	 * restored from another install, or written before `SECURE_AUTH_KEY` was rotated — looks
	 * configured and behaves like a blank field the moment a driver tries to use it.
	 *
	 * {@see self::decrypt()} leaves a value it cannot authenticate SEALED, so "came back unchanged"
	 * is precisely the failure signal. The plaintext is discarded here and never returned.
	 *
	 * @param array<string, mixed> $payload Stored payload.
	 * @param string               $path    Secret dotted path.
	 * @param string               $code    Module code.
	 * @param string               $scope   `settings` or `staff_connection`.
	 */
	public function opensAt( array $payload, string $path, string $code, string $scope ): bool {
		$sealed = $this->getPath( $payload, $path );
		if ( ! is_string( $sealed ) || '' === $sealed ) {
			return false;
		}

		try {
			$plain = $this->getPath( $this->decrypt( $payload, array( $path ), $code, $scope ), $path );
		} catch ( \Throwable $e ) {
			// Unusable key material makes {@see Crypto::deriveKey()} throw. That is a definite "no",
			// not an error to propagate: the caller is asking whether the secret is usable, and on
			// such a site it is not.
			return false;
		}

		return is_string( $plain ) && '' !== $plain && $plain !== $sealed;
	}

	/**
	 * The secret dotted paths a module declares for a scope.
	 *
	 * @param string $code  Module code.
	 * @param string $scope Either `settings` or `staff_connection`.
	 * @return list<string>
	 */
	public function secretKeysFor( string $code, string $scope ): array {
		/**
		 * Filter the secret dotted paths for a module scope (extension-surface §2).
		 *
		 * @param list<string> $keys  Secret dotted paths.
		 * @param string       $code  Module code.
		 * @param string       $scope `settings` or `staff_connection`.
		 */
		$keys = apply_filters( 'aponto_module_secret_keys', array(), $code, $scope );

		if ( ! is_array( $keys ) ) {
			return array();
		}

		return array_values( array_filter( $keys, 'is_string' ) );
	}

	/**
	 * Return the payload with every declared secret path sealed. Use before `update_option`.
	 *
	 * Each field is sealed under the context `{module_code}|{scope}|{dotted_path}` so a cipher
	 * blob copied to another field, scope or module can never be decrypted there (extension-surface
	 * §5.3.5 context binding; review item 6).
	 *
	 * @param array<string, mixed> $payload     Module config payload.
	 * @param list<string>         $secret_keys Secret dotted paths.
	 * @param string               $module_code Owning module code.
	 * @param string               $scope       `settings` or `staff_connection`.
	 * @return array<string, mixed>
	 */
	public function encrypt( array $payload, array $secret_keys, string $module_code, string $scope ): array {
		foreach ( $secret_keys as $path ) {
			$value = $this->getPath( $payload, $path );
			if ( is_string( $value ) && '' !== $value ) {
				$sealed  = $this->crypto->encrypt( $value, self::DOMAIN, $this->context( $module_code, $scope, $path ) );
				$payload = $this->setPath( $payload, $path, $sealed );
			}
		}

		return $payload;
	}

	/**
	 * Return the payload with every declared secret path decrypted. Use for internal reads only.
	 *
	 * A value that does not authenticate under this module/scope/path context is left sealed.
	 *
	 * @param array<string, mixed> $payload     Stored payload.
	 * @param list<string>         $secret_keys Secret dotted paths.
	 * @param string               $module_code Owning module code.
	 * @param string               $scope       `settings` or `staff_connection`.
	 * @return array<string, mixed>
	 */
	public function decrypt( array $payload, array $secret_keys, string $module_code, string $scope ): array {
		foreach ( $secret_keys as $path ) {
			$value = $this->getPath( $payload, $path );
			if ( is_string( $value ) && '' !== $value ) {
				$plain = $this->crypto->decrypt( $value, self::DOMAIN, $this->context( $module_code, $scope, $path ) );
				if ( null !== $plain ) {
					$payload = $this->setPath( $payload, $path, $plain );
				}
			}
		}

		return $payload;
	}

	/**
	 * Context string binding a cipher to one module/scope/field.
	 *
	 * @param string $module_code Owning module code.
	 * @param string $scope       `settings` or `staff_connection`.
	 * @param string $path        Secret dotted path.
	 */
	private function context( string $module_code, string $scope, string $path ): string {
		return $module_code . '|' . $scope . '|' . $path;
	}

	/**
	 * Replace each declared secret path with `{is_set: bool}`. Use for REST GET (never decrypt out).
	 *
	 * @param array<string, mixed> $payload     Stored payload.
	 * @param list<string>         $secret_keys Secret dotted paths.
	 * @return array<string, mixed>
	 */
	public function mask( array $payload, array $secret_keys ): array {
		foreach ( $secret_keys as $path ) {
			$value = $this->getPath( $payload, $path );
			if ( null !== $value ) {
				$payload = $this->setPath( $payload, $path, array( 'is_set' => is_string( $value ) && '' !== $value ) );
			}
		}

		return $payload;
	}

	/**
	 * Read a dotted path from a nested array.
	 *
	 * @param array<string, mixed> $payload Payload.
	 * @param string               $path    Dotted path.
	 * @return mixed Null when absent.
	 */
	private function getPath( array $payload, string $path ): mixed {
		$node = $payload;
		foreach ( explode( '.', $path ) as $segment ) {
			if ( ! is_array( $node ) || ! array_key_exists( $segment, $node ) ) {
				return null;
			}
			$node = $node[ $segment ];
		}

		return $node;
	}

	/**
	 * Return a copy of the payload with a dotted path set.
	 *
	 * @param array<string, mixed> $payload Payload.
	 * @param string               $path    Dotted path.
	 * @param mixed                $value   New value.
	 * @return array<string, mixed>
	 */
	private function setPath( array $payload, string $path, mixed $value ): array {
		$segments = explode( '.', $path );
		$key      = array_shift( $segments );

		if ( array() === $segments ) {
			$payload[ $key ] = $value;

			return $payload;
		}

		$child = $payload[ $key ] ?? array();
		if ( ! is_array( $child ) ) {
			$child = array();
		}
		$payload[ $key ] = $this->setPath( $child, implode( '.', $segments ), $value );

		return $payload;
	}
}

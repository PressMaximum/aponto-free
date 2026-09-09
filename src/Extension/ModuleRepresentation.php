<?php
/**
 * The ONE way a module's stored settings become the shape everything else reads (D-R39c/A.6).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Extension;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Support\ModuleSecrets;

/**
 * Mask the stored option, ask the module what it actually RESOLVES, then normalize the answer.
 *
 * `aponto_module_settings_representation` exists because the stored option is not always the whole
 * truth (D-R39c/A.6): a module whose schema has moved can still be RUNNING off values at older
 * paths — it adopts them on read — and anything built from storage alone then reports an empty
 * form on a site that is demonstrably working. The seam lets the module answer with what it
 * resolves, WITHOUT writing, because a read-path migration that also wrote would race a concurrent
 * `PUT` and lose one of the two updates.
 *
 * It lives here, in the generic module layer beside {@see ModuleSettingsLock} and
 * {@see ModuleStatus}, because it has TWO consumers and they must not answer differently. The REST
 * settings resource was the first. The catalog's `configured` tier is the second, and it was the
 * bug: {@see \Aponto\Integration\CatalogState} read the schema's `required` paths straight out of
 * `wp_options`, so a legacy single-set install — every pre-D-R39b Stripe site and every pre-D-R40f
 * PayPal site, the founder's own among them — reported `configured: false` and its Modules card
 * said "Setup needed" while the gateway was taking real payments. Two screens, one option, two
 * different verdicts. There is now one function, so that is not expressible.
 *
 * NOTHING HERE NAMES A MODULE. The seam is dispatched per code and every rule below is about the
 * schema, which is the only thing core knows.
 */
final class ModuleRepresentation {

	/**
	 * The masked, module-corrected, schema-shaped settings for one module.
	 *
	 * Order matters and each step earns its place:
	 *
	 *   1. MASK the stored option, so a callback is handed `{is_set: bool}` for a secret and never
	 *      the ciphertext — the seam's whole contract is that it works on masked data.
	 *   2. DISPATCH the filter, so a module can publish what it resolves from older paths.
	 *   3. NORMALIZE the answer — see {@see self::maskedToSchema()}. "Runs after masking and must
	 *      stay masked" is otherwise a rule with no enforcement.
	 *
	 * @param string               $code    Module code (already registry-checked by the caller).
	 * @param array<string, mixed> $stored  Stored module option.
	 * @param array<string, mixed> $schema  Module settings schema.
	 * @param list<string>         $secrets Declared secret dotted paths.
	 * @param ModuleSecrets        $vault   Secret helper (masking only — no key material is used).
	 * @return array<string, mixed>
	 */
	public static function publish( string $code, array $stored, array $schema, array $secrets, ModuleSecrets $vault ): array {
		$settings = $vault->mask( $stored, $secrets );

		/**
		 * Filter the MASKED settings a module publishes for itself (extension-surface §5.3).
		 *
		 * The stored option is not always the whole truth. A module whose schema has moved can still
		 * be RUNNING off values at older paths — it resolves them on read — and a representation
		 * built from storage alone would then show an empty form on a site that is demonstrably
		 * working, which is a worse lie than either half. This lets the module answer with what it
		 * actually resolves, WITHOUT writing to the option: a read-path migration that also wrote
		 * would race a concurrent `PUT` and lose one of the two updates (D-R39c, Codex A.6).
		 *
		 * Runs AFTER masking and must stay masked: a contributor returns `{is_set: true}` for a
		 * secret, never a value. Anything that is not an array is ignored.
		 *
		 * @param array<string, mixed> $settings Masked settings, as stored.
		 * @param string               $code     Module code.
		 */
		$published = apply_filters( 'aponto_module_settings_representation', $settings, $code );

		return self::maskedToSchema( is_array( $published ) ? $published : $settings, $schema, $secrets );
	}

	/**
	 * Whether one required path is answered — by the option, or by what the module resolves.
	 *
	 * The generic half of the catalog's `configured` tier (extension-surface §4), and the reason it
	 * is not simply "is there a non-empty string at this path": after the representation runs, a
	 * SECRET reads as the `{is_set: bool}` marker whether it came from the option or from a path
	 * the module resolved, and that marker is the module's own answer to exactly this question.
	 *
	 * A stored cipher must still OPEN, not merely be present (Codex P2 #14): one sealed under key
	 * material this site has lost is a string that looks configured and behaves like a blank field
	 * the moment a driver uses it. That check applies where the value IS at the canonical path; a
	 * module answering `{is_set: true}` for a path its option does not hold has already made the
	 * same determination on the path it does hold ("a secret that no longer opens counts as absent",
	 * D-R34a), and core cannot repeat it without knowing where the value went.
	 *
	 * @param array<string, mixed> $published Output of {@see self::publish()}.
	 * @param array<string, mixed> $stored    Stored module option.
	 * @param string               $path      Required dotted path.
	 * @param bool                 $is_secret Whether the path is a declared secret.
	 * @param string               $code      Module code.
	 * @param string               $scope     Wire scope (`settings`).
	 * @param ModuleSecrets        $vault     Secret helper.
	 */
	public static function satisfies( array $published, array $stored, string $path, bool $is_secret, string $code, string $scope, ModuleSecrets $vault ): bool {
		$value = self::getPath( $published, $path );

		if ( is_array( $value ) && array_key_exists( 'is_set', $value ) ) {
			if ( true !== $value['is_set'] ) {
				return false;
			}

			return ! $is_secret
				|| null === self::getPath( $stored, $path )
				|| $vault->opensAt( $stored, $path, $code, $scope );
		}

		if ( ! is_string( $value ) || '' === $value ) {
			return false;
		}

		return ! $is_secret || $vault->opensAt( $stored, $path, $code, $scope );
	}

	/**
	 * Reduce a published representation to the schema's own keys, with every secret re-masked.
	 *
	 * Two guarantees, in this order: the ALLOW-LIST (only dotted paths the schema declares survive,
	 * so a callback cannot add a field — including one holding the option's own legacy ciphertext,
	 * which is stored but not declared), then the MASK (every declared secret path is rewritten to
	 * `{is_set: bool}`, so a callback cannot publish a value where the contract promises a marker).
	 *
	 * @param array<string, mixed> $published Filter output.
	 * @param array<string, mixed> $schema    Module settings schema.
	 * @param list<string>         $secrets   Declared secret dotted paths.
	 * @return array<string, mixed>
	 */
	private static function maskedToSchema( array $published, array $schema, array $secrets ): array {
		$out = array();
		foreach ( array_keys( $schema ) as $path ) {
			if ( ! is_string( $path ) || ! self::hasPath( $published, $path ) ) {
				continue;
			}
			$out = self::setPath( $out, $path, self::getPath( $published, $path ) );
		}

		foreach ( $secrets as $path ) {
			if ( ! self::hasPath( $out, $path ) ) {
				continue;
			}

			// NOT {@see ModuleSecrets::mask()}, which is not idempotent: it answers `{is_set: false}`
			// for anything that is not a non-empty STRING, so re-masking an already-masked
			// `{is_set: true}` would report every secret on the site as missing. Both shapes a
			// callback can hand back are accepted here — the marker it should have returned, and the
			// raw value it must not have — and anything else reads as "not set", the conservative
			// direction: the panel then offers to paste a credential rather than claiming one is
			// already there.
			$value  = self::getPath( $out, $path );
			$is_set = is_array( $value ) && array_key_exists( 'is_set', $value )
				? true === $value['is_set']
				: ( is_string( $value ) && '' !== $value );

			$out = self::setPath( $out, $path, array( 'is_set' => $is_set ) );
		}

		return $out;
	}

	/**
	 * Whether a dotted path exists in a payload.
	 *
	 * @param array<string, mixed> $payload Payload.
	 * @param string               $path    Dotted path.
	 */
	private static function hasPath( array $payload, string $path ): bool {
		$node = $payload;
		foreach ( explode( '.', $path ) as $segment ) {
			if ( ! is_array( $node ) || ! array_key_exists( $segment, $node ) ) {
				return false;
			}
			$node = $node[ $segment ];
		}

		return true;
	}

	/**
	 * Read a dotted path from a payload.
	 *
	 * @param array<string, mixed> $payload Payload.
	 * @param string               $path    Dotted path.
	 * @return mixed Null when absent.
	 */
	private static function getPath( array $payload, string $path ) {
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
	 * Return a copy of a payload with a dotted path set.
	 *
	 * @param array<string, mixed> $payload Payload.
	 * @param string               $path    Dotted path.
	 * @param mixed                $value   New value.
	 * @return array<string, mixed>
	 */
	private static function setPath( array $payload, string $path, $value ): array {
		$segments = explode( '.', $path );
		$key      = array_shift( $segments );

		if ( array() === $segments ) {
			$payload[ $key ] = $value;

			return $payload;
		}

		$child           = isset( $payload[ $key ] ) && is_array( $payload[ $key ] ) ? $payload[ $key ] : array();
		$payload[ $key ] = self::setPath( $child, implode( '.', $segments ), $value );

		return $payload;
	}
}

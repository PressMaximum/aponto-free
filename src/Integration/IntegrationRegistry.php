<?php
/**
 * Integration allow-list and key vocabulary (extension-surface §1, §4, §5.2).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Integration;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Plan;

/**
 * The single place that answers "is this string an integration module code, and may this site use
 * it" — and the single place that builds the `integration.{code}.*` metadata keys.
 *
 * Both halves exist to make one class of bug unrepresentable. Extension-surface §1 forbids
 * dispatching a `{key}` hook before the key has been allow-listed through the registry; a REST
 * route that took `{code}` from the URL and interpolated it straight into `aponto_connect_{code}`
 * would be a hook-injection surface. Every dispatcher in `Aponto\Integration` therefore asks
 * {@see self::isActive()} first, and every metadata key is built here rather than concatenated at
 * the call site, so a module's namespace cannot drift between the writer and the uninstaller.
 *
 * The gate order matches extension-surface §5.3: registry (`kind === 'integration'`) FIRST, then
 * {@see Plan::has()}. Registry-first is what keeps a code that is not an integration off the
 * entitlement path entirely.
 */
final class IntegrationRegistry {

	/**
	 * Metadata key prefix owned by an integration module.
	 */
	private const PREFIX = 'integration.';

	/**
	 * The `admin-post.php` action that receives EVERY integration's OAuth return leg.
	 */
	public const CALLBACK_ACTION = 'aponto_oauth_callback';

	/**
	 * Whether a code names an `integration` entry in the registry. Pure metadata — no entitlement.
	 *
	 * @param string $code Candidate module code.
	 */
	public static function isIntegration( string $code ): bool {
		if ( 1 !== preg_match( '/^[a-z0-9_]+$/', $code ) ) {
			return false;
		}
		$meta = Plan::FEATURES[ $code ] ?? null;

		return is_array( $meta ) && 'integration' === $meta['kind'];
	}

	/**
	 * Whether a code is an integration this site may actually use right now: registry allow-list
	 * THEN {@see Plan::has()} (edition × shipped-ness × the module toggle).
	 *
	 * @param string $code Candidate module code.
	 */
	public static function isActive( string $code ): bool {
		return self::isIntegration( $code ) && Plan::instance()->has( $code );
	}

	/**
	 * Every integration code this site may use, in registry order.
	 *
	 * @return list<string>
	 */
	public static function activeCodes(): array {
		$out = array();
		foreach ( array_keys( Plan::FEATURES ) as $code ) {
			$code = (string) $code;
			if ( self::isActive( $code ) ) {
				$out[] = $code;
			}
		}

		return $out;
	}

	/**
	 * EVERY integration code in the registry, regardless of edition, shipped-ness or toggle.
	 *
	 * Distinct from {@see self::activeCodes()} and used only for CLEANUP (Codex round 3, P1 #6).
	 * Entitlement decides what may RUN; it must never decide what gets deleted, because the rows
	 * that most need removing belong to a module that has since been switched off, un-shipped, or
	 * lost to a Premium→Free downgrade — and `Plan::has()` answers false for all three. Purging by
	 * the active list left an encrypted OAuth token behind in exactly those cases.
	 *
	 * @return list<string>
	 */
	public static function allCodes(): array {
		$out = array();
		foreach ( Plan::FEATURES as $code => $meta ) {
			if ( 'integration' === $meta['kind'] ) {
				$out[] = (string) $code;
			}
		}

		return $out;
	}

	/**
	 * The metadata namespace a module owns, e.g. `integration.calendar_google.`.
	 *
	 * @param string $code Module code.
	 */
	public static function namespacePrefix( string $code ): string {
		return self::PREFIX . $code . '.';
	}

	/**
	 * Staff-meta key holding the sealed connection envelope (extension-surface §4).
	 *
	 * @param string $code Module code.
	 */
	public static function connectionKey( string $code ): string {
		return self::namespacePrefix( $code ) . 'connection';
	}

	/**
	 * Service-meta key holding the `used` flag (extension-surface §4).
	 *
	 * @param string $code Module code.
	 */
	public static function usageKey( string $code ): string {
		return self::namespacePrefix( $code ) . 'enabled';
	}

	/**
	 * Booking-meta key holding the remote event reference (extension-surface §5.2).
	 *
	 * @param string $code Module code.
	 */
	public static function remoteEventKey( string $code ): string {
		return self::namespacePrefix( $code ) . 'remote_event';
	}

	/**
	 * Booking-meta key holding an in-flight retry intent (D-R34).
	 *
	 * @param string $code Module code.
	 */
	public static function syncKey( string $code ): string {
		return self::namespacePrefix( $code ) . 'sync';
	}

	/**
	 * The ONE OAuth redirect URI every integration returns to.
	 *
	 * Shared on purpose (extension-surface §4.1): the site owner registers exactly one redirect URI
	 * with their provider, and core resolves which module the return belongs to from the bound
	 * single-use `state`, never from anything in the URL. A per-module URI would multiply the
	 * copy-paste the owner has to get right for no security gain — the state is what authenticates
	 * the callback.
	 */
	public static function redirectUri(): string {
		return admin_url( 'admin-post.php?action=' . self::CALLBACK_ACTION );
	}
}

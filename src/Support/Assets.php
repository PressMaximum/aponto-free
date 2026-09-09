<?php
/**
 * Built-asset path resolver.
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

use Aponto\Plan;

/**
 * Resolves paths/URLs to the built front-end assets under `assets/dist/{edition}/`.
 *
 * The Free zip ships only `assets/dist/free/**` and the Premium zip only
 * `assets/dist/premium/**` (distribution.json), so exactly ONE edition directory
 * exists at runtime; a dev checkout may have both. The core bundles (form,
 * form-editor, wizard) are identical across editions, so a shipped build always
 * resolves to the single directory it carries. Only a dev tree with BOTH dirs has
 * a choice to make, and it makes it by the RUNNING edition (D-R27).
 */
final class Assets {

	/**
	 * Whether WordPress should load the readable asset build.
	 *
	 * `SCRIPT_DEBUG` is WordPress' conventional asset switch; `WP_DEBUG` is included explicitly so
	 * a site enabling the main debug mode gets readable Aponto bundles without a second constant.
	 */
	public static function isDebug(): bool {
		return ( defined( 'WP_DEBUG' ) && true === WP_DEBUG )
			|| ( defined( 'SCRIPT_DEBUG' ) && true === SCRIPT_DEBUG );
	}

	/**
	 * Resolve a logical JavaScript/CSS name to its debug or minified build filename.
	 *
	 * Every distribution build asserts both variants exist. Keeping this operation lexical — no
	 * filesystem fallback — means an incomplete package fails visibly instead of silently serving
	 * a different build mode than the operator requested.
	 *
	 * @param string    $relative Logical path relative to the edition dist directory.
	 * @param bool|null $debug    Explicit mode for deterministic callers/tests; null reads WordPress.
	 */
	public static function filename( string $relative, ?bool $debug = null ): string {
		$debug = null === $debug ? self::isDebug() : $debug;
		if ( $debug || 1 !== preg_match( '/\.(?:js|css)$/', $relative ) ) {
			return $relative;
		}

		return (string) preg_replace( '/\.(js|css)$/', '.min.$1', $relative );
	}

	/**
	 * The present edition dist directory name.
	 *
	 * THE single resolver for every built asset in the plugin — the admin SPA
	 * ({@see \Aponto\Admin\AdminPage::resolveDistRel()}) resolves through here too. A second
	 * resolver with a different preference order split dev trees that had both dirs built: the
	 * admin SPA served `premium` while the wizard/form served `free`, so a partially rebuilt
	 * checkout ran stale JS against current PHP without any visible sign (beta report 2026-07-25).
	 * If this order ever changes, it changes for every surface at once.
	 *
	 * PREFERENCE ORDER follows the running edition (D-R27, 2026-08-27) and is owned by
	 * {@see Plan::assetDirPreference()}, because Plan owns edition semantics. The old fixed
	 * `free`-then-`premium` order made the premium bundles unreachable from a dev tree that has
	 * both dirs built: `assets/dist/premium/pro/{code}.js` — the ONLY place a premium module's
	 * admin panel lives — could never be served, so premium module work could not be run against
	 * the working tree at all (docs/operations/premium-dev-mode.md). NOTHING changes for a shipped
	 * zip: one directory exists, and both orders find it. This is not a GATE (§5 invariant 3):
	 * entitlement stays `Plan::has()` in REST; this only decides which BUILD ARTIFACT of an
	 * otherwise identical bundle set a dev tree serves. The chain still ends at `free`, so a
	 * premium edition with no premium build keeps working instead of 404-ing every asset.
	 */
	public static function editionDir(): string {
		$base = plugin_dir_path( APONTO_FILE ) . 'assets/dist/';

		foreach ( Plan::instance()->assetDirPreference() as $dir ) {
			if ( is_dir( $base . $dir ) ) {
				return $dir;
			}
		}

		return 'free';
	}

	/**
	 * Absolute filesystem path to a built asset.
	 *
	 * @param string $relative Path relative to the edition dist dir (e.g. `form.js`).
	 */
	public static function path( string $relative ): string {
		return plugin_dir_path( APONTO_FILE ) . 'assets/dist/' . self::editionDir() . '/' . $relative;
	}

	/**
	 * Public URL to a built asset.
	 *
	 * @param string $relative Path relative to the edition dist dir (e.g. `form.js`).
	 */
	public static function url( string $relative ): string {
		return plugins_url( 'assets/dist/' . self::editionDir() . '/' . $relative, APONTO_FILE );
	}
}

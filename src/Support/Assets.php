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
	 * Minified names already reported as missing, so one incomplete build logs once per request.
	 *
	 * @var array<string, true>
	 */
	private static array $reported_missing = array();

	/**
	 * Dist directory override for unit tests, which have no WordPress plugin root.
	 *
	 * @var string|null
	 */
	private static ?string $dist_root_for_testing = null;

	/**
	 * Point the `.min` existence check at a fixture directory (unit tests only).
	 *
	 * @param string|null $dir Absolute directory standing in for the edition dist dir; null restores WordPress.
	 */
	public static function setDistRootForTesting( ?string $dir ): void {
		self::$dist_root_for_testing = null === $dir ? null : rtrim( $dir, '/\\' ) . '/';
		self::$reported_missing      = array();
	}

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
	 * Every distribution build asserts both variants exist (`scripts/build-assets.mjs`), so the
	 * minified name is what a complete package always answers. It is NOT what an INCOMPLETE one
	 * carries, and the purely lexical answer this used to give turned that into a silent 404: the
	 * admin SPA's stylesheet vanished and its panels rendered with browser defaults — oversized type
	 * and no spacing — with nothing in the page to say why (beta report 2026-09-17). So the minified
	 * name is used only when the file is actually there; otherwise the readable sibling is served and
	 * the surface keeps working, degraded in bytes rather than in behaviour.
	 *
	 * The check is skipped — and the lexical answer kept — when the dist directory cannot be
	 * resolved at all (no `APONTO_FILE`, i.e. a WordPress-less unit test), so this stays a
	 * filesystem REPAIR, never a new failure mode of its own.
	 *
	 * @param string    $relative Logical path relative to the edition dist directory.
	 * @param bool|null $debug    Explicit mode for deterministic callers/tests; null reads WordPress.
	 */
	public static function filename( string $relative, ?bool $debug = null ): string {
		$debug = null === $debug ? self::isDebug() : $debug;
		if ( $debug || 1 !== preg_match( '/\.(?:js|css)$/', $relative ) ) {
			return $relative;
		}

		$minified  = (string) preg_replace( '/\.(js|css)$/', '.min.$1', $relative );
		$dist_root = self::distRoot();
		if ( null === $dist_root || is_file( $dist_root . $minified ) ) {
			return $minified;
		}

		self::reportMissingMinified( $minified, $relative );

		return $relative;
	}

	/**
	 * Whether a resolved build filename is the minified variant.
	 *
	 * THE one place that answers "is this handle serving `.min`", so the `suffix` style data that
	 * WordPress needs in order to rewrite `x.min.css` to `x-rtl.min.css` is derived from the file
	 * that was actually enqueued rather than re-derived per call site. Two admin handles carried
	 * that decision inline while the wizard and every other registered style did not, which is how
	 * an RTL locale could get an LTR sheet on one surface and not the next.
	 *
	 * @param string $filename Resolved build filename from {@see self::filename()}.
	 */
	public static function isMinified( string $filename ): bool {
		return 1 === preg_match( '/\.min\.(?:js|css)$/', $filename );
	}

	/**
	 * Register the RTL/minified variant metadata for one enqueued stylesheet handle.
	 *
	 * `rtl => replace` swaps in the rtlcss-generated sibling on RTL locales; `suffix` tells
	 * WordPress the `.min` part of the name so the swap lands on `x-rtl.min.css` instead of a
	 * non-existent `x.min-rtl.css`. Both are properties of the RESOLVED file, so both are set here
	 * from that file — including the fallback case, where the readable sheet is being served and the
	 * suffix must therefore NOT be added.
	 *
	 * @param string $handle   Registered/enqueued style handle.
	 * @param string $filename Resolved build filename from {@see self::filename()}.
	 */
	public static function addStyleVariantData( string $handle, string $filename ): void {
		wp_style_add_data( $handle, 'rtl', 'replace' );
		if ( self::isMinified( $filename ) ) {
			wp_style_add_data( $handle, 'suffix', '.min' );
		}
	}

	/**
	 * Absolute edition dist directory (with trailing slash), or null when it cannot be resolved.
	 */
	private static function distRoot(): ?string {
		if ( null !== self::$dist_root_for_testing ) {
			return self::$dist_root_for_testing;
		}
		if ( ! defined( 'APONTO_FILE' ) || ! function_exists( 'plugin_dir_path' ) ) {
			return null;
		}

		return plugin_dir_path( APONTO_FILE ) . 'assets/dist/' . self::editionDir() . '/';
	}

	/**
	 * Note an incomplete build ONCE per missing name. Quiet by default: the fallback has already
	 * kept the surface working, and a `error_log` line per asset per request on a partially deployed
	 * site is noise, not a diagnosis.
	 *
	 * The guard is `WP_DEBUG` OR `WP_DEBUG_LOG`, not `WP_DEBUG` alone, because `WP_DEBUG` alone can
	 * never observe this: {@see self::isDebug()} treats it as "serve the readable build", so a site
	 * with it on returns before the minified name is ever resolved. `WP_DEBUG_LOG` is the constant an
	 * operator turns on to diagnose a LIVE site, which is precisely the site this can happen to.
	 *
	 * @param string $minified Minified filename that is absent.
	 * @param string $readable Readable filename being served instead.
	 */
	private static function reportMissingMinified( string $minified, string $readable ): void {
		if ( isset( self::$reported_missing[ $minified ] ) ) {
			return;
		}
		self::$reported_missing[ $minified ] = true;

		$debugging = ( defined( 'WP_DEBUG' ) && true === WP_DEBUG )
			|| ( defined( 'WP_DEBUG_LOG' ) && false !== WP_DEBUG_LOG && null !== WP_DEBUG_LOG );
		if ( ! $debugging ) {
			return;
		}

		// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- WP_DEBUG-only notice about an incomplete build.
		error_log(
			sprintf(
				'Aponto: built asset %1$s is missing from this install; serving %2$s instead. Re-run the asset build or reinstall the plugin.',
				$minified,
				$readable
			)
		);
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

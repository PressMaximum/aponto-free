<?php
/**
 * Edition-neutral translation registration.
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
 * Owns the plugin's PHP and JavaScript catalog loading for EVERY edition.
 *
 * Both editions bundle `languages/`: Free because translate.wordpress.org has no `aponto` pack yet
 * (a non-English site would otherwise be English-only for as long as that takes), Premium because
 * it is not hosted on wp.org at all and will never receive a pack. Nothing here is edition-aware.
 *
 * Precedence is WordPress' own: `WP_Textdomain_Registry` searches `WP_LANG_DIR/plugins` before any
 * directory a plugin registered for itself, so a wp.org language pack — once one exists — always
 * wins over the catalog in the ZIP, and a site that has none still gets the bundled translation.
 * The directory is registered on that registry directly; `load_plugin_textdomain()` is a
 * Plugin Check discouraged function and, since WP 6.5, does nothing this class does not do.
 *
 * The `aponto_load_translation_catalog` action stays the extension seam for a distribution that
 * keeps its catalogs somewhere else; `aponto_translation_catalog_path` does the same for the
 * script-translation directory.
 */
final class Translations {

	/**
	 * Register translations for a script handle.
	 *
	 * The bundled directory is passed explicitly: `wp_set_script_translations()` resolves the
	 * handle-named JSON there first, which is the only reliable mapping for a webpack build (the
	 * source-path md5 filenames WordPress derives for a language pack never match a built bundle).
	 *
	 * @param string $handle Registered script handle.
	 */
	public static function setScriptTranslations( string $handle ): bool {
		return wp_set_script_translations( $handle, 'aponto', self::catalogPath() );
	}

	/**
	 * Absolute directory holding the bundled catalogs.
	 */
	public static function catalogPath(): string {
		$default = plugin_dir_path( APONTO_FILE ) . 'languages';

		/**
		 * Filter the catalog directory used for script translations.
		 *
		 * @param string $path Absolute catalog path.
		 */
		$path = apply_filters( 'aponto_translation_catalog_path', $default );

		return is_string( $path ) && '' !== $path ? $path : $default;
	}

	/**
	 * Register the bundled catalog directory so just-in-time loading can find it.
	 *
	 * NOT redundant with WordPress' just-in-time loading (p0-independent-review #11): JIT only
	 * searches `WP_LANG_DIR/plugins`, `WP_LANG_DIR/themes` and paths a plugin registered ITSELF —
	 * see `WP_Textdomain_Registry::get_paths_for_domain()`, which never derives a path from the
	 * `Domain Path` header. Without this registration the bundled `languages/aponto-*.mo` is
	 * orphaned, which is exactly what a non-English Free site lost.
	 *
	 * Registration is done DIRECTLY on `WP_Textdomain_Registry` rather than through
	 * `load_plugin_textdomain()`. Since WP 6.5 that function does nothing else — it calls
	 * `set_custom_path()` and returns true, the `.mo` being read by the first `__()` that needs it
	 * — while Plugin Check flags it as a discouraged function (wp.org loads language packs on its
	 * own). Calling the registry says precisely what we mean and keeps the artifact-smoke gate at
	 * zero warnings. The plugin floor is WP 6.6, so the registry is always present; the guard is
	 * there for a mocked or partially booted `$GLOBALS` only.
	 *
	 * Precedence is untouched: the registry still searches `WP_LANG_DIR/plugins` before any custom
	 * path, so a wp.org language pack wins as soon as one exists.
	 *
	 * @return bool Whether the directory is now registered.
	 */
	public static function registerBundledCatalog(): bool {
		$registry = $GLOBALS['wp_textdomain_registry'] ?? null;
		if ( ! $registry instanceof \WP_Textdomain_Registry ) {
			return false;
		}

		$registry->set_custom_path( 'aponto', self::catalogPath() );

		// Mirror the one other thing `load_plugin_textdomain()` does: a just-in-time attempt that
		// ran BEFORE the path was known cached a `NOOP_Translations` under this domain, and that
		// placeholder would otherwise answer every later `__()` with the untranslated string.
		if ( isset( $GLOBALS['l10n']['aponto'] ) && $GLOBALS['l10n']['aponto'] instanceof \NOOP_Translations ) {
			unset( $GLOBALS['l10n']['aponto'] );
		}

		return true;
	}

	/**
	 * Load every catalog for the locale in effect right now — the bundled one, then whatever an
	 * edition or a third party contributes through the seam.
	 *
	 * Called on `init` and again whenever the mail-render locale switch replaces the process-wide
	 * `aponto` catalog ({@see \Aponto\Notification\NotificationDispatcher}) — which is why that
	 * dispatcher must unload the domain as RELOADABLE: a non-reloadable unload marks the domain in
	 * `$l10n_unloaded`, and on WP 6.5+ nothing here can undo that, because re-registering a path is
	 * not a load.
	 */
	public static function loadCurrentLocale(): void {
		self::registerBundledCatalog();

		/**
		 * Fires when Aponto (re)loads its PHP catalog for the current locale.
		 *
		 * A distribution whose catalogs do not live in this plugin's `languages/` directory loads
		 * them here.
		 */
		do_action( 'aponto_load_translation_catalog' );
	}
}

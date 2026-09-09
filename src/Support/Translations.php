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
 * Registers JavaScript translations without assuming where catalogs live.
 *
 * The wp.org build omits local catalogs and lets WordPress resolve GlotPress
 * language packs. The Premium edition contributes its bundled catalog path
 * through the filter from its edition-level provider.
 */
final class Translations {

	/**
	 * Register translations for a script handle.
	 *
	 * @param string $handle Registered script handle.
	 */
	public static function setScriptTranslations( string $handle ): bool {
		/**
		 * Filter the private catalog directory used by non-wp.org editions.
		 *
		 * @param string $path Absolute catalog path, or an empty string for the
		 *                     WordPress language-pack directory.
		 */
		$path = apply_filters( 'aponto_translation_catalog_path', '' );
		if ( is_string( $path ) && '' !== $path ) {
			return wp_set_script_translations( $handle, 'aponto', $path );
		}

		return wp_set_script_translations( $handle, 'aponto' );
	}

	/**
	 * Ask an edition-owned provider to load its current PHP catalog.
	 *
	 * Free deliberately has no listener: WordPress loads wp.org language packs
	 * just in time for the current locale.
	 */
	public static function loadCurrentLocale(): void {
		do_action( 'aponto_load_translation_catalog' );
	}
}

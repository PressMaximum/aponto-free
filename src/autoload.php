<?php
/**
 * Hand-written PSR-4 autoloader for the `Aponto\` namespace.
 *
 * Ships inside `src/**`, so it is present in BOTH the Free and Premium zips.
 * Runtime never depends on Composer (NB-2 / §1.2 / §2.5); Composer autoload is
 * dev/tests only. `is_file()` stays silent so the Free zip (which omits
 * `src/Pro/**`) never fatals on a missing Pro class.
 *
 * @package Aponto
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

spl_autoload_register(
	// phpcs:ignore Universal.NamingConventions.NoReservedKeywordParameterNames.classFound -- Verbatim autoloader from SPEC-P0 §1.2.
	static function ( string $class ): void {
		if ( str_starts_with( $class, 'Aponto\\' ) ) {
			$path = __DIR__ . '/' . str_replace( '\\', '/', substr( $class, 7 ) ) . '.php';
			if ( is_file( $path ) ) {
				require $path;
			}
		}
	}
);

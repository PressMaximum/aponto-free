<?php
/**
 * Local metadata reader for built JavaScript assets.
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
 * Reads and validates webpack's generated `*.asset.php` dependency metadata.
 *
 * Callers provide a logical entry such as `admin`, `form-editor` or `pro/reminders`; they never
 * provide an edition, extension or absolute path. The compile-time root constant is deliberately
 * the FIRST operand of the include expression, making the operation's local origin statically
 * obvious (wp.org review T2). Every dynamic segment is separately allow-listed below.
 */
final class AssetManifest {

	/**
	 * Compile-time local root for every generated asset manifest.
	 */
	private const DIST_ROOT = __DIR__ . '/../../assets/dist/';

	/**
	 * Read validated dependency metadata for a logical webpack entry.
	 *
	 * @param string $entry Entry relative to the edition directory, without extension.
	 * @return array{dependencies: list<string>, version: string}|null Valid metadata or null.
	 */
	public static function read( string $entry ): ?array {
		if ( ! self::isReadableManifest( $entry ) ) {
			return null;
		}

		$edition = Assets::editionDir();
		$suffix  = Assets::isDebug() ? '.asset.php' : '.min.asset.php';

		// Keep the compile-time local root as the first operand. `$edition`, `$entry` and `$suffix`
		// have all been allow-listed by this class; none can originate in request data.
		$loaded = include self::DIST_ROOT . $edition . '/' . $entry . $suffix;
		if ( ! is_array( $loaded ) ) {
			return null;
		}

		$dependencies = $loaded['dependencies'] ?? null;
		$version      = $loaded['version'] ?? null;
		if ( ! is_array( $dependencies ) || ! array_is_list( $dependencies ) || ! is_string( $version ) ) {
			return null;
		}
		if ( '' === $version || strlen( $version ) > 128 || 1 !== preg_match( '/^[A-Za-z0-9._+-]+$/D', $version ) ) {
			return null;
		}

		$validated = array();
		foreach ( $dependencies as $dependency ) {
			if (
				! is_string( $dependency )
				|| '' === $dependency
				|| strlen( $dependency ) > 191
				|| 1 !== preg_match( '/^[A-Za-z0-9._-]+$/D', $dependency )
			) {
				return null;
			}
			$validated[] = $dependency;
		}

		return array(
			'dependencies' => array_values( array_unique( $validated ) ),
			'version'      => $version,
		);
	}

	/**
	 * Whether a valid logical entry has a readable manifest for the active build variant.
	 *
	 * @param string $entry Entry relative to the edition directory, without extension.
	 */
	public static function exists( string $entry ): bool {
		return self::isReadableManifest( $entry );
	}

	/**
	 * Validate an entry and confirm its active manifest is a local readable file.
	 *
	 * At most one slash is allowed: core entries are top-level (`admin`) and module panels use
	 * their edition-owned directory (`modules/payments_stripe`, `pro/reminders`). No dots, URL
	 * schemes, absolute paths or traversal tokens can pass this grammar.
	 *
	 * @param string $entry Entry relative to the edition directory, without extension.
	 */
	private static function isReadableManifest( string $entry ): bool {
		if ( strlen( $entry ) > 191 || 1 !== preg_match( '/^[a-z0-9][a-z0-9_-]*(?:\/[a-z0-9][a-z0-9_-]*)?$/D', $entry ) ) {
			return false;
		}

		$edition = Assets::editionDir();
		if ( ! in_array( $edition, array( 'free', 'premium' ), true ) ) {
			return false;
		}

		$suffix   = Assets::isDebug() ? '.asset.php' : '.min.asset.php';
		$manifest = self::DIST_ROOT . $edition . '/' . $entry . $suffix;
		if ( ! is_file( $manifest ) || ! is_readable( $manifest ) ) {
			return false;
		}

		$dist_root = realpath( self::DIST_ROOT );
		$real_file = realpath( $manifest );
		if ( false === $dist_root || false === $real_file ) {
			return false;
		}
		if ( ! str_starts_with( $real_file, rtrim( $dist_root, DIRECTORY_SEPARATOR ) . DIRECTORY_SEPARATOR ) ) {
			return false;
		}

		return true;
	}
}

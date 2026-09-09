<?php
/**
 * Database engine detection (single source of truth).
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
 * Answers ONE question for the whole plugin: is `$wpdb` talking to the MySQL family
 * (MySQL/MariaDB) or to SQLite through the official WordPress SQLite database integration?
 *
 * Founder decision 2026-07-21 (D-R20, NB-3 amendment): SQLite is a FULLY SUPPORTED tier —
 * WordPress Playground and WordPress Studio must install, book and administer — while
 * MySQL 5.7+/MariaDB 10.4+ with InnoDB stays the recommended production engine. Every
 * engine-conditional branch in the plugin (advisory locks, transaction control, schema
 * verification, diagnostics) asks THIS class; no other file may sniff the
 * engine on its own.
 *
 * Detection is deliberately layered so it survives both generations of the drop-in:
 *
 *   1. `DB_ENGINE === 'sqlite'` — the constant the drop-in defines (it is slated to move into
 *      `wp-config.php` when SQLite lands in core).
 *   2. The `$wpdb` subclass name (`WP_SQLite_DB` in every published version).
 *   3. The connection handle class (`WP_SQLite_Driver` in the 3.x driver, `WP_SQLite_Translator`
 *      in the 2.x translator) — the last resort when a host wires the drop-in unusually.
 *
 * Classes are matched by NAME, never by `instanceof`, because none of them exist in a plain
 * MySQL install (or in static analysis / unit tests). {@see self::detect()} is the pure decision
 * and is unit-testable without a `wpdb` instance at all.
 */
final class DatabaseEngine {

	/**
	 * MySQL family (MySQL / MariaDB) — the recommended production engine.
	 */
	public const MYSQL = 'mysql';

	/**
	 * SQLite via the official WordPress SQLite database integration drop-in.
	 */
	public const SQLITE = 'sqlite';

	/**
	 * Per-handle memo. Detection uses reflection, and locks/transaction control ask on every
	 * critical section — resolving once per `wpdb` instance keeps that free. A WeakMap holds no
	 * strong reference, so a discarded test double is collected normally.
	 *
	 * @var \WeakMap<\wpdb, string>|null
	 */
	private static ?\WeakMap $memo = null;

	/**
	 * The engine backing a database handle: {@see self::MYSQL} or {@see self::SQLITE}.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public static function of( \wpdb $wpdb ): string {
		if ( null === self::$memo ) {
			/**
			 * A fresh memo map for this request.
			 *
			 * @var \WeakMap<\wpdb, string> $memo
			 */
			$memo       = new \WeakMap();
			self::$memo = $memo;
		}

		if ( isset( self::$memo[ $wpdb ] ) ) {
			return (string) self::$memo[ $wpdb ];
		}

		$engine = self::detect(
			self::classNames( $wpdb ),
			defined( 'DB_ENGINE' ) ? (string) constant( 'DB_ENGINE' ) : null
		);

		self::$memo[ $wpdb ] = $engine;

		return $engine;
	}

	/**
	 * Whether the handle is backed by SQLite.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public static function isSqlite( \wpdb $wpdb ): bool {
		return self::SQLITE === self::of( $wpdb );
	}

	/**
	 * The pure decision, isolated from WordPress so it can be unit-tested with plain strings.
	 *
	 * @param list<string> $class_names Class names in play: the `wpdb` subclass, its parents and
	 *                                  the connection-handle class.
	 * @param string|null  $db_engine   Value of the `DB_ENGINE` constant, or null when undefined.
	 */
	public static function detect( array $class_names, ?string $db_engine ): string {
		if ( null !== $db_engine && self::SQLITE === strtolower( trim( $db_engine ) ) ) {
			return self::SQLITE;
		}

		foreach ( $class_names as $name ) {
			// Every class the drop-in has ever shipped carries "sqlite" in its name, across both
			// generations. No MySQL-family handle in the wild does — not wpdb, not mysqli, and not
			// the well-known replacements (HyperDB, LudicrousDB).
			if ( str_contains( strtolower( $name ), self::SQLITE ) ) {
				return self::SQLITE;
			}
		}

		return self::MYSQL;
	}

	/**
	 * Forget every memoized answer (test seam — production resolves one handle per request).
	 *
	 * @internal
	 */
	public static function flush(): void {
		self::$memo = null;
	}

	/**
	 * The class names that identify the handle: the `wpdb` subclass, its ancestry and the
	 * connection object `wpdb::$dbh` (protected — read reflectively, exactly like
	 * the repository's exact-key collision read-back).
	 *
	 * @param \wpdb $wpdb Database handle.
	 * @return list<string>
	 */
	private static function classNames( \wpdb $wpdb ): array {
		$names = array_merge( array( get_class( $wpdb ) ), array_values( class_parents( $wpdb ) ) );

		try {
			$property = new \ReflectionProperty( \wpdb::class, 'dbh' );
			$dbh      = $property->getValue( $wpdb );
			if ( is_object( $dbh ) ) {
				$names[] = get_class( $dbh );
			}
		} catch ( \ReflectionException $e ) {
			unset( $e ); // No `dbh` property (exotic drop-in): the class names above still decide.
		}

		return array_values( array_map( 'strval', $names ) );
	}
}

<?php
/**
 * Lock driver selection.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Database;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Support\DatabaseEngine;

/**
 * The ONE place that picks a {@see Lock} driver for the current database (D-R20, founder
 * 2026-07-21). Every caller — the migrator, the activation seeder, the reservation/reschedule/
 * status services, the plan-cap guard, the wizard, the notification token rotation — builds its
 * locks here, so the MySQL↔SQLite decision is never duplicated or drifted.
 *
 * MySQL/MariaDB keeps {@see AdvisoryLock} verbatim (`GET_LOCK` + pinned `CONNECTION_ID()`);
 * SQLite gets {@see SqliteLock}, an exclusive `flock()` on a per-name lock file. Both provide real
 * mutual exclusion, which the lock-only critical sections (service/staff/location delete, reorder,
 * plan cap, wizard page) depend on — they never open a transaction, so the lock is their only
 * serialization (Codex review round 2, BLOCKER 1).
 */
final class LockFactory {

	/**
	 * Resolved lock-file directory for this request, or null before first use.
	 *
	 * @var string|null
	 */
	private static ?string $directory = null;

	/**
	 * Construct the factory.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct( private \wpdb $wpdb ) {}

	/**
	 * A lock instance for a name, on whichever driver this database needs.
	 *
	 * @param string $name Lock name (e.g. `apt:wp_:migrate`).
	 */
	public function named( string $name ): Lock {
		if ( DatabaseEngine::isSqlite( $this->wpdb ) ) {
			return new SqliteLock( $name, self::directory() );
		}

		return new AdvisoryLock( $this->wpdb, $name );
	}

	/**
	 * Override the lock-file directory (test seam; production resolves it from the uploads dir).
	 *
	 * @internal
	 * @param string|null $directory Directory, or null to re-resolve.
	 */
	public static function useDirectory( ?string $directory ): void {
		self::$directory = $directory;
	}

	/**
	 * The directory holding SQLite lock files.
	 *
	 * Prefers the WordPress uploads directory, which is per-site on multisite and already the
	 * plugin's writable home ({@see \Aponto\Support\Logger} uses it too); falls back to the system
	 * temp directory when uploads is unavailable. The files are empty lock tokens with hashed
	 * names — no PII — and site separation additionally rides the lock names themselves.
	 */
	private static function directory(): string {
		if ( null !== self::$directory ) {
			return self::$directory;
		}

		$base = null;
		if ( function_exists( 'wp_upload_dir' ) ) {
			$uploads = wp_upload_dir( null, false );
			if ( is_array( $uploads ) && isset( $uploads['basedir'] ) && '' !== $uploads['basedir'] ) {
				$base = (string) $uploads['basedir'];
			}
		}

		if ( null === $base ) {
			$base = function_exists( 'get_temp_dir' ) ? get_temp_dir() : sys_get_temp_dir();
		}

		self::$directory = rtrim( $base, '/\\' ) . '/aponto-locks';

		return self::$directory;
	}
}

<?php
/**
 * SQLite lock driver.
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

/**
 * The {@see Lock} driver for SQLite (D-R20, founder 2026-07-21 — SQLite is a supported tier).
 *
 * SQLite has no `GET_LOCK`, so this driver provides the SAME guarantee with an exclusive `flock()`
 * on a per-name lock file. That is a deliberate correction of the first implementation, which
 * relied purely on SQLite's single-writer serialization (Codex review round 2, BLOCKER 1):
 *
 *   - The reserve path (§5.6) really is safe on transaction serialization alone, because the
 *     drop-in opens every explicit transaction with `BEGIN IMMEDIATE` — the database-wide write
 *     lock, taken up front.
 *   - But SEVERAL critical sections hold ONLY the named lock and never open a transaction:
 *     service delete/archive ({@see \Aponto\Rest\Controller\ServicesController}), staff and
 *     location delete, the full-set reorders, the wizard's booking-page creation, and its
 *     create-or-adopt insert ({@see \Aponto\Rest\Data\FirstRecordGuard}). Their read-check-write
 *     runs in AUTOCOMMIT, so with a lock that always succeeds they lose all mutual exclusion:
 *     two onboarding requests could both create the initial owner, and a service delete could not
 *     see a concurrent reservation's
 *     still-uncommitted booking. Those sections need a real lock, and this is it.
 *
 * `flock()` mirrors `GET_LOCK` closely enough to keep every call site unchanged: it is advisory,
 * it is exclusive per name, it supports a wait-with-timeout, and — like a MySQL advisory lock dying
 * with its connection — the operating system releases it when the owning process exits, so a fatal
 * can never strand a lock. Verified working under both target runtimes: native PHP (WordPress
 * Studio) and PHP-WASM (WordPress Playground, where a second exclusive attempt on an already-locked
 * file correctly fails).
 *
 * RECURSION (GET_LOCK parity): MySQL 5.7+ lets one session re-acquire a lock it already holds and
 * STACKS it — N acquisitions need N releases before the lock is free — which
 * {@see \Aponto\Booking\ReservationService} depends on when it reacquires the idempotency lock
 * (R3-2) while the original is still held. Raw `flock()` does NOT do this: a second handle on the
 * same file blocks even inside the same process. The static registry below restores the MySQL
 * semantics by holding ONE handle per lock name per process and refcounting every acquisition,
 * whether it came from this instance or a sibling one.
 *
 * Connection identity (review E1) is a constant: the drop-in talks to a local file through PDO, so
 * there is no server connection wpdb can silently re-establish and no server-side lock to lose.
 * {@see TransactionGuard::currentConnectionId()} reports the same {@see self::SESSION_ID}, so the
 * identity checks pass instead of raising a phantom lock loss.
 */
final class SqliteLock implements Lock {

	/**
	 * The stable session identity reported while the lock is held. SQLite has no `CONNECTION_ID()`;
	 * this constant is what both this driver and {@see TransactionGuard} compare (review E1).
	 */
	public const SESSION_ID = 'sqlite';

	/**
	 * Microseconds between non-blocking retries while waiting for a contended lock.
	 */
	private const RETRY_INTERVAL_US = 20000;

	/**
	 * Open lock handles for THIS process, keyed by lock name.
	 *
	 * @var array<string, array{handle: resource, count: int}>
	 */
	private static array $held = array();

	/**
	 * Whether the shutdown release has been registered (once per process).
	 *
	 * @var bool
	 */
	private static bool $shutdown_registered = false;

	/**
	 * How many acquisitions THIS instance currently owns.
	 *
	 * A counter, not a flag: MySQL 5.7+ lets one session take the same named lock repeatedly and
	 * refcounts it, so N calls to `GET_LOCK` need N calls to `RELEASE_LOCK` before the lock is
	 * actually free. This driver mirrors that per instance as well as per process (Codex review
	 * round 3), so `acquire(); acquire(); release();` still holds the lock.
	 *
	 * @var int
	 */
	private int $holds = 0;

	/**
	 * Drop every lock this process holds (test seam — production releases through {@see self::release()}
	 * and, as a backstop, the shutdown handler).
	 *
	 * @internal
	 */
	public static function releaseAllForTests(): void {
		foreach ( self::$held as $name => $entry ) {
			flock( $entry['handle'], LOCK_UN );
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fclose -- Releasing a lock token handle.
			fclose( $entry['handle'] );
			unset( self::$held[ $name ] );
		}
	}

	/**
	 * Construct a named lock.
	 *
	 * @param string $name      Lock name (e.g. `apt:wp_:migrate`), already site-scoped by the caller
	 *                          through `$wpdb->prefix` — see {@see \Aponto\Booking\StaffLockFactory}.
	 * @param string $directory Writable directory holding the lock files.
	 */
	public function __construct(
		private string $name,
		private string $directory
	) {}

	/**
	 * Acquire the lock, waiting up to the timeout.
	 *
	 * `$timeout = 0` makes exactly ONE non-blocking attempt, preserving the E5 contract that a
	 * contended idempotency key fails immediately into a 425 instead of queueing.
	 *
	 * FAIL-CLOSED: when the lock directory or file cannot be created (read-only filesystem,
	 * open_basedir), this returns false rather than pretending to hold a lock. Every call site
	 * already treats a failed acquire as a retryable lock error, so the plugin degrades to "busy"
	 * instead of to "silently unserialized".
	 *
	 * @param int $timeout Seconds to wait (0 = fail immediately when contended).
	 */
	public function acquire( int $timeout ): bool {
		// GET_LOCK parity: when this PROCESS already owns the name — whether through this instance
		// or another one — stack another level instead of self-deadlocking on the file. Both the
		// process-wide count and this instance's share rise, so every acquire needs its own
		// release before the underlying flock is dropped (Codex review round 3).
		if ( isset( self::$held[ $this->name ] ) ) {
			++self::$held[ $this->name ]['count'];
			++$this->holds;

			return true;
		}

		// No registry entry: any depth this instance still believes in is stale (the shutdown
		// handler or a test reset dropped the handle). Start from zero rather than double-count.
		$this->holds = 0;

		$handle = $this->openLockFile();
		if ( null === $handle ) {
			return false;
		}

		$deadline = microtime( true ) + max( 0, $timeout );
		while ( true ) {
			if ( flock( $handle, LOCK_EX | LOCK_NB ) ) {
				self::$held[ $this->name ] = array(
					'handle' => $handle,
					'count'  => 1,
				);
				$this->holds               = 1;
				self::registerShutdownRelease();

				return true;
			}

			if ( microtime( true ) >= $deadline ) {
				break;
			}

			usleep( self::RETRY_INTERVAL_US );
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fclose -- Releasing a lock token handle; WP_Filesystem has no equivalent.
		fclose( $handle );

		return false;
	}

	/**
	 * The session identity pinned at acquire time, or null while this instance is not holding.
	 *
	 * @phpstan-impure
	 */
	public function connectionId(): ?string {
		return $this->holds > 0 ? self::SESSION_ID : null;
	}

	/**
	 * The lock name.
	 */
	public function name(): string {
		return $this->name;
	}

	/**
	 * Release ONE of this instance's acquisitions; the underlying file lock drops only when the
	 * last outstanding acquisition anywhere in the process is released — the mirror of
	 * `RELEASE_LOCK` against a stacked `GET_LOCK`.
	 *
	 * Releasing more often than acquiring is a no-op: the guard below stops an over-release from
	 * decrementing the shared count and freeing a lock another holder still legitimately owns.
	 */
	public function release(): void {
		if ( $this->holds <= 0 ) {
			return;
		}

		--$this->holds;

		if ( ! isset( self::$held[ $this->name ] ) ) {
			return;
		}

		--self::$held[ $this->name ]['count'];
		if ( self::$held[ $this->name ]['count'] > 0 ) {
			return;
		}

		$handle = self::$held[ $this->name ]['handle'];
		unset( self::$held[ $this->name ] );
		flock( $handle, LOCK_UN );
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fclose -- Releasing a lock token handle; WP_Filesystem has no equivalent.
		fclose( $handle );
	}

	/**
	 * Open (creating if needed) the lock file for this name.
	 *
	 * The file name is a hash of the lock name PLUS `ABSPATH`, so it carries no PII, cannot escape
	 * the directory, and stays unique per site even if two installs ever share a temp directory.
	 * Site separation WITHIN one install already rides the lock name itself, which embeds
	 * `$wpdb->prefix` exactly like the MySQL lock names. The files are always empty — they are pure
	 * lock tokens, never storage.
	 *
	 * @return resource|null
	 */
	private function openLockFile() {
		if ( ! is_dir( $this->directory ) && ! $this->makeDirectory() ) {
			return null;
		}

		$salt = defined( 'ABSPATH' ) ? (string) constant( 'ABSPATH' ) : __DIR__;
		$path = rtrim( $this->directory, '/\\' ) . '/' . hash( 'sha256', $salt . '|' . $this->name ) . '.lock';

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fopen, WordPress.PHP.NoSilencedErrors.Discouraged -- A lock token needs a real file handle (WP_Filesystem cannot flock); a failed open is HANDLED below by failing the acquire closed, so the warning would only add noise to the log.
		$handle = @fopen( $path, 'c' );

		return false === $handle ? null : $handle;
	}

	/**
	 * Create the lock directory with a non-executable directory-listing guard.
	 */
	private function makeDirectory(): bool {
		if ( function_exists( 'wp_mkdir_p' ) ) {
			if ( ! wp_mkdir_p( $this->directory ) ) {
				return false;
			}
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_mkdir, WordPress.PHP.NoSilencedErrors.Discouraged -- WP_Filesystem is not loaded this early and cannot flock; the return value IS checked, so silencing only suppresses a duplicate warning.
		} elseif ( ! @mkdir( $this->directory, 0777, true ) && ! is_dir( $this->directory ) ) {
			return false;
		}

		$index = rtrim( $this->directory, '/\\' ) . '/index.html';
		if ( ! file_exists( $index ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents, WordPress.PHP.NoSilencedErrors.Discouraged -- Best-effort directory-listing guard written once at creation; a failure is harmless and must not surface as a warning.
			@file_put_contents( $index, '' );
		}

		return true;
	}

	/**
	 * Release every lock this process still holds when the request ends (registered once).
	 *
	 * The operating system already does this on process exit; the explicit release matters for
	 * long-lived CLI processes (`wp aponto …`), where the process outlives one unit of work.
	 */
	private static function registerShutdownRelease(): void {
		if ( self::$shutdown_registered ) {
			return;
		}
		self::$shutdown_registered = true;

		register_shutdown_function(
			static function (): void {
				foreach ( self::$held as $name => $entry ) {
					flock( $entry['handle'], LOCK_UN );
					// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fclose -- Releasing a lock token handle at shutdown.
					fclose( $entry['handle'] );
					unset( self::$held[ $name ] );
				}
			}
		);
	}
}

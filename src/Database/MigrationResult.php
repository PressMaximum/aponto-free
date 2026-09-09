<?php
/**
 * Migration run outcome.
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
 * Immutable outcome of {@see Migrator::run()}.
 *
 * Three states: ok (all pending migrations applied), failure (a migration failed — version stays
 * at the last-good value, §4.1) and busy (the advisory lock could not be acquired: another
 * request is migrating, R2-2 — NOT a success; callers must not treat the schema as ready).
 */
final class MigrationResult {

	/**
	 * Build a result. Use {@see self::ok()} / {@see self::failure()} / {@see self::busy()}.
	 *
	 * @param bool        $ok               Whether all pending migrations applied cleanly.
	 * @param bool        $busy             Whether the migration lock was held by another request.
	 * @param int         $version          Schema version after the run.
	 * @param string|null $failed_migration Identifier of the migration that failed, if any.
	 * @param string|null $error            Failure message, if any.
	 * @param bool        $health_verified  Whether this run finished on a VERIFIED-healthy schema.
	 */
	private function __construct(
		public readonly bool $ok,
		public readonly bool $busy,
		public readonly int $version,
		public readonly ?string $failed_migration,
		public readonly ?string $error,
		public readonly bool $health_verified = false
	) {}

	/**
	 * Successful (or no-op) run at the given schema version.
	 *
	 * `$health_verified` is what stops the SAME structural pass running twice per upgrade (D-R40e,
	 * Codex #9). {@see Migrator::verifyCoreSchemaHealth()} asks existence, engine, columns and every
	 * declared index across every core table, then migration 0009's own postcondition — a bounded set
	 * of catalogue reads, but far from the "one query" D-R40d claimed — and `Installer::installSite()`
	 * ran the whole thing again the instant `run()` returned. The repair step already knows the
	 * answer, so it reports it and the completion gate reuses it. It stays FALSE for every path that
	 * did not actually verify (busy, failure, or a version-0 run that never reached the repair), so
	 * the gate is fail-closed by default rather than by inspection.
	 *
	 * @param int  $version         Schema version reached.
	 * @param bool $health_verified Whether the core schema was verified healthy during this run.
	 */
	public static function ok( int $version, bool $health_verified = false ): self {
		return new self( true, false, $version, null, null, $health_verified );
	}

	/**
	 * The migration lock is held elsewhere (or the lock query errored): nothing was applied,
	 * nothing failed — the caller retries later and must not run post-migration side effects.
	 *
	 * @param int $version Schema version observed (may be behind target).
	 */
	public static function busy( int $version ): self {
		return new self( false, true, $version, null, null );
	}

	/**
	 * Failed run; version held at the last-good value.
	 *
	 * @param int    $version          Last-good schema version.
	 * @param string $failed_migration Identifier of the failing migration.
	 * @param string $error            Failure message.
	 */
	public static function failure( int $version, string $failed_migration, string $error ): self {
		return new self( false, false, $version, $failed_migration, $error );
	}
}

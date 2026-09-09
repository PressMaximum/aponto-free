<?php
/**
 * Schema migrator.
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

use Aponto\Database\Migrations\Migration;
use Aponto\Database\Migrations\Migration_0001_InitialSchema;
use Aponto\Database\Migrations\Migration_0002_NotificationCopy;
use Aponto\Database\Migrations\Migration_0003_ServiceStaffBackfill;
use Aponto\Database\Migrations\Migration_0004_AdminContactCopy;
use Aponto\Database\Migrations\Migration_0005_CancelledRebookCopy;
use Aponto\Database\Migrations\Migration_0006_CancelledManageLinkCopy;
use Aponto\Database\Migrations\Migration_0007_StaffNotificationTemplates;
use Aponto\Database\Migrations\Migration_0008_NoShowNotificationTemplate;
use Aponto\Database\Migrations\Migration_0009_Payments;
use Aponto\Database\Migrations\Migration_0010_PaymentPendingCopy;
use Aponto\Support\DatabaseEngine;

/**
 * Runs core migrations then module migrations under a named advisory lock (§4.1) — `GET_LOCK` on
 * MySQL, the engine's own write serialization on SQLite ({@see LockFactory}, D-R20).
 *
 * Each migration applies, its postcondition is verified, and only then is the persisted schema
 * version bumped. On failure the version is left untouched, `aponto_migration_error` is recorded
 * for an admin notice, and the next request retries. Idempotent throughout.
 */
final class Migrator {

	/**
	 * Target core schema version. Bumped whenever a core migration is added.
	 */
	public const SCHEMA_VERSION = 10;

	/**
	 * Option holding the applied core schema version (autoloaded — read every request).
	 */
	public const VERSION_OPTION = 'aponto_schema_version';

	/**
	 * Option holding the last migration failure {migration, error}.
	 */
	public const ERROR_OPTION = 'aponto_migration_error';

	/**
	 * Seconds to wait for the advisory lock before giving up this request.
	 */
	public const LOCK_TIMEOUT = 30;

	/**
	 * Construct the migrator.
	 *
	 * @param \wpdb $wpdb         Database handle.
	 * @param int   $lock_timeout Seconds to wait for the migration lock.
	 */
	public function __construct(
		private \wpdb $wpdb,
		private int $lock_timeout = self::LOCK_TIMEOUT
	) {}

	/**
	 * Apply all pending migrations, guarded by an advisory lock.
	 *
	 * A held lock (or a lock query error) is a distinct BUSY outcome (R2-2) — never reported as
	 * success, so callers cannot mistake a contended migration for a completed one.
	 */
	public function run(): MigrationResult {
		$lock = ( new LockFactory( $this->wpdb ) )->named( 'apt:' . $this->wpdb->prefix . ':migrate' );

		if ( ! $lock->acquire( $this->lock_timeout ) ) {
			return MigrationResult::busy( $this->currentVersion() );
		}

		try {
			return $this->migrate();
		} finally {
			$lock->release();
		}
	}

	/**
	 * Applied core schema version (0 when never migrated).
	 */
	public function currentVersion(): int {
		return (int) get_option( self::VERSION_OPTION, 0 );
	}

	/**
	 * Fully-qualified Aponto tables that exist but are NOT InnoDB (NB-3).
	 *
	 * Always empty on SQLite (D-R20): storage engines are a MySQL-family concept, so there is no
	 * such thing as a wrong one to report. See {@see SchemaVerifier} for the NB-3 amendment.
	 *
	 * @return list<string>
	 */
	public function nonInnoDbTables(): array {
		if ( DatabaseEngine::isSqlite( $this->wpdb ) ) {
			return array();
		}

		$bad = array();

		foreach ( self::coreTableSlugs() as $slug ) {
			$table = $this->wpdb->prefix . $slug;
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Engine check against information_schema during activation; caching is not applicable.
			$engine = $this->wpdb->get_var(
				// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- Table name is a value passed to wpdb::prepare; sniff cannot recognize the injected wpdb property.
				$this->wpdb->prepare(
					'SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s',
					// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- Table name is passed as a value to wpdb::prepare.
					$table
				)
			);

			if ( null === $engine ) {
				continue;
			}

			if ( 'INNODB' !== strtoupper( (string) $engine ) ) {
				$bad[] = $table;
			}
		}

		return $bad;
	}

	/**
	 * Structural health of the core schema, derived from Migration_0001's own DDL: existence,
	 * InnoDB engine on MySQL (unknown engine = failure; not applicable on SQLite — D-R20),
	 * columns, primary key and every declared index. Used by the activation fail-closed check
	 * (Codex review item 1).
	 *
	 * @return string|null Failure description, or null when healthy.
	 */
	public function verifyCoreSchemaHealth(): ?string {
		$verifier = new SchemaVerifier( $this->wpdb );

		$health = $verifier->verifyStatements( ( new Migration_0001_InitialSchema() )->statements( $this->wpdb ) );
		if ( null !== $health ) {
			return $health;
		}

		// 0009's tables are core tables too, so drift in them must be detected and repaired by the
		// same pass. They are verified separately rather than folded into 0001's statement list
		// because each migration owns — and repairs from — its own DDL; merging the lists would let
		// one migration's health check demand a shape another migration is responsible for.
		$health = $verifier->verifyStatements( ( new Migration_0009_Payments() )->statements( $this->wpdb ) );
		if ( null !== $health ) {
			return $health;
		}

		// The TABLES are not the whole of migration 0009 (Codex #16): it also adds an additive COLUMN
		// to `aponto_orders` and seeds two templates, and `SchemaVerifier` only knows about CREATE
		// statements. A site that lost either would pass a table-only health check while the payment
		// path fails at runtime, so the migration's own postcondition is asked directly.
		$version = $this->currentVersion();
		if ( $version >= 9 && ! ( new Migration_0009_Payments() )->verify( $this->wpdb ) ) {
			return 'migration 0009 postcondition failed (hold column or payment templates missing)';
		}

		// 0010 IS CHECKED TOO (D-R39c, Codex A.11). The health pass listed 0009 by hand and stopped
		// there, so the copy migration that followed it was outside self-repair: a site that lost the
		// pending-payment template — a restore from an older dump, a plugin that rewrote the
		// notifications table — passed the health check and then sent nothing at the one moment the
		// customer is waiting to hear the slot is held. Each additive migration that owns a
		// postcondition has to be named here, which is the maintenance rule this comment records.
		if ( $version >= 10 && ! ( new Migration_0010_PaymentPendingCopy() )->verify( $this->wpdb ) ) {
			return 'migration 0010 postcondition failed (pending-payment template missing)';
		}

		return null;
	}

	/**
	 * Whether any collected module manifest declares a version above the applied one — e.g. a
	 * module was re-enabled with pending migrations (Codex review item 3).
	 */
	public function hasPendingModuleMigrations(): bool {
		foreach ( $this->collectManifests() as $manifest ) {
			$applied = (int) get_option( sprintf( 'aponto_module_%s_db_version', $manifest->moduleCode ), 0 );
			if ( $manifest->version > $applied ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Core migrations in ascending version order.
	 *
	 * @return list<Migration>
	 */
	private function coreMigrations(): array {
		return array(
			new Migration_0001_InitialSchema(),
			new Migration_0002_NotificationCopy(),
			new Migration_0003_ServiceStaffBackfill(),
			new Migration_0004_AdminContactCopy(),
			new Migration_0005_CancelledRebookCopy(),
			new Migration_0006_CancelledManageLinkCopy(),
			new Migration_0007_StaffNotificationTemplates(),
			new Migration_0008_NoShowNotificationTemplate(),
			new Migration_0009_Payments(),
			new Migration_0010_PaymentPendingCopy(),
		);
	}

	/**
	 * EVERY core table slug, across every migration that creates one (D-R38).
	 *
	 * Migration 0001 owns 19 of them and verifies itself from its OWN statements; 0009 adds two more
	 * and does the same. Callers that mean "every core table" — the InnoDB audit, the uninstaller,
	 * the test reset — union them HERE rather than each keeping a list that has to be remembered
	 * when the next migration adds a table.
	 *
	 * @return list<string>
	 */
	public static function coreTableSlugs(): array {
		return array_values(
			array_unique(
				array_merge(
					Migration_0001_InitialSchema::tableSlugs(),
					Migration_0009_Payments::tableSlugs()
				)
			)
		);
	}

	/**
	 * Apply pending core then module migrations, then self-repair schema drift — all while the
	 * advisory lock is held.
	 */
	private function migrate(): MigrationResult {
		$current = $this->currentVersion();

		foreach ( $this->coreMigrations() as $migration ) {
			$version = $migration->version();
			if ( $version <= $current ) {
				continue;
			}

			try {
				$migration->up( $this->wpdb );
				$verified = $migration->verify( $this->wpdb );
			} catch ( \Throwable $e ) {
				return $this->recordFailure( $current, (string) $version, $e->getMessage() );
			}

			if ( ! $verified ) {
				return $this->recordFailure(
					$current,
					(string) $version,
					sprintf( 'postcondition failed for core migration %d', $version )
				);
			}

			$current = $version;
			update_option( self::VERSION_OPTION, $current, true );
		}

		// Self-repair (R2-4): drift at current version (dropped table/index) is repaired by
		// re-running the idempotent Migration_0001 DDL inside this same lock, then re-verifying.
		//
		// ALWAYS, not only when nothing was applied (2026-09-05, latent flaw found alongside the QA
		// run 2 fixes). The old guard read "a migration just verified, so the shape is proved" —
		// but a migration verifies its OWN postcondition, not the whole schema, and PRE-EXISTING
		// drift is exactly what an upgrade pass walks straight past. The consequence was visible:
		// `Installer::installSite()` runs the migration, then asks `verifyCoreSchemaHealth()` and
		// ABORTS activation on the drift nothing had repaired; a second activation then succeeded,
		// because by then there was no pending migration and the repair finally ran.
		//
		// The repair opens with a health check and returns immediately when the schema is clean —
		// and that check is NOT "one query" (corrected 2026-09-05, D-R40e/Codex #9): it asks
		// existence, engine, columns and every declared index for every core table, then migration
		// 0009's own postcondition. That is affordable ONCE. It was being paid TWICE, because the
		// Installer's completion gate asked the same question again the moment this method returned,
		// and network activation multiplies that by the number of sites. The verdict now travels out
		// on the result instead.
		$verified       = false;
		$repair_failure = $this->repairCoreSchema( $current, $verified );
		if ( null !== $repair_failure ) {
			return $repair_failure;
		}

		$module_failure = $this->runModuleMigrations();
		if ( null !== $module_failure ) {
			return $module_failure;
		}

		delete_option( self::ERROR_OPTION );

		return MigrationResult::ok( $current, $verified );
	}

	/**
	 * Repair core schema drift at the current version (R2-4).
	 *
	 * Health verify fail → re-run the full idempotent Migration_0001 DDL (dbDelta recreates
	 * missing tables/indexes) → verify again. Pass clears the path for the error option to be
	 * cleared by the caller; an unrepairable failure (e.g. a non-InnoDB engine dbDelta cannot
	 * change) is recorded under the `innodb` identifier and keeps the fail-closed behaviour.
	 *
	 * @param int  $current  Current (already-reached) schema version.
	 * @param bool $verified Set to true when this call leaves the core schema VERIFIED healthy — the
	 *                       answer the Installer's completion gate would otherwise spend a second
	 *                       full structural pass recomputing (D-R40e).
	 * @return MigrationResult|null Failure result, or null when healthy/repaired.
	 */
	private function repairCoreSchema( int $current, bool &$verified = false ): ?MigrationResult {
		$verified = false;

		if ( $current < 1 ) {
			// Nothing has been created yet, so nothing was verified. Said honestly rather than as a
			// vacuous pass: the completion gate must still ask for itself on this path.
			return null;
		}

		$health = $this->verifyCoreSchemaHealth();
		if ( null === $health ) {
			$verified = true;

			return null;
		}

		try {
			( new Migration_0001_InitialSchema() )->up( $this->wpdb );
			if ( $current >= 9 ) {
				// Re-run 0009 in FULL on a site that has REACHED version 9 — its own idempotent
				// `up()`, not just its CREATE statements (Codex #16), because the column and the two
				// seeded templates are part of what version 9 means and a repair that restored only
				// the tables would report healthy while the payment path still failed. Running it
				// earlier would create tables ahead of the version that owns them, which is the one
				// way a self-repair could make the schema disagree with the recorded version.
				( new Migration_0009_Payments() )->up( $this->wpdb );
			}
			if ( $current >= 10 ) {
				// Same rule one version on: the repair restores every additive migration the site has
				// REACHED, in order, so a health check that now asks about 0010 has something that
				// can answer it.
				( new Migration_0010_PaymentPendingCopy() )->up( $this->wpdb );
			}
			$health_after = $this->verifyCoreSchemaHealth();
		} catch ( \Throwable $e ) {
			return $this->recordFailure( $current, 'innodb', $e->getMessage() );
		}

		if ( null !== $health_after ) {
			return $this->recordFailure( $current, 'innodb', $health_after );
		}

		$verified = true;

		return null;
	}

	/**
	 * Run module migrations that ride the core pass (extension-surface §3.4).
	 *
	 * @return MigrationResult|null Failure result, or null on success/no-op.
	 */
	private function runModuleMigrations(): ?MigrationResult {
		foreach ( $this->collectManifests() as $manifest ) {
			$option  = sprintf( 'aponto_module_%s_db_version', $manifest->moduleCode );
			$applied = (int) get_option( $option, 0 );

			if ( $manifest->version <= $applied ) {
				continue;
			}

			$identifier = sprintf( 'module:%s:%d', $manifest->moduleCode, $manifest->version );

			require_once ABSPATH . 'wp-admin/includes/upgrade.php';

			try {
				foreach ( $manifest->schema as $sql ) {
					dbDelta( $sql );
				}
			} catch ( \Throwable $e ) {
				return $this->recordFailure( $this->currentVersion(), $identifier, $e->getMessage() );
			}

			// Structural check derived from the manifest's own CREATE statements: existence +
			// InnoDB + columns/keys. Module tables get the same NB-3 guarantee as core tables.
			$schema_error = ( new SchemaVerifier( $this->wpdb ) )->verifyStatements( $manifest->schema );
			if ( null !== $schema_error ) {
				return $this->recordFailure( $this->currentVersion(), $identifier, $schema_error );
			}

			// A throwing postcondition is a controlled failure, never a fatal (review item 4).
			try {
				$ok = is_callable( $manifest->postcondition ) && (bool) ( $manifest->postcondition )( $this->wpdb );
			} catch ( \Throwable $e ) {
				return $this->recordFailure(
					$this->currentVersion(),
					$identifier,
					sprintf( 'postcondition threw: %s', $e->getMessage() )
				);
			}

			if ( ! $ok ) {
				return $this->recordFailure(
					$this->currentVersion(),
					$identifier,
					sprintf( 'postcondition failed for %s', $identifier )
				);
			}

			update_option( $option, $manifest->version, false );
		}

		return null;
	}

	/**
	 * Collect and stably order module migration manifests.
	 *
	 * @return list<ModuleMigrationManifest>
	 */
	private function collectManifests(): array {
		/**
		 * Filter the module migration manifests riding the core migration pass.
		 *
		 * The Kernel injects enabled providers' manifests through this same filter.
		 *
		 * @param list<ModuleMigrationManifest> $manifests Manifests to apply.
		 */
		$manifests = apply_filters( 'aponto_module_migrations', array() );

		if ( ! is_array( $manifests ) ) {
			return array();
		}

		$valid = array();
		foreach ( $manifests as $manifest ) {
			if ( $manifest instanceof ModuleMigrationManifest ) {
				$valid[] = $manifest;
			}
		}

		usort(
			$valid,
			static function ( ModuleMigrationManifest $a, ModuleMigrationManifest $b ): int {
				return array( $a->moduleCode, $a->version ) <=> array( $b->moduleCode, $b->version );
			}
		);

		return $valid;
	}

	/**
	 * Persist a migration failure and return the failed result (version not bumped).
	 *
	 * @param int    $version    Last-good schema version.
	 * @param string $identifier Failing migration identifier.
	 * @param string $error      Failure message.
	 */
	private function recordFailure( int $version, string $identifier, string $error ): MigrationResult {
		update_option(
			self::ERROR_OPTION,
			array(
				'migration' => $identifier,
				'error'     => $error,
			),
			false
		);

		/**
		 * Fires after a controlled migration failure is persisted. The logger listener receives only
		 * the stable identifier/version; the raw database error is deliberately not forwarded.
		 *
		 * @param string $identifier Migration identifier.
		 * @param int    $version    Last-good version.
		 */
		try {
			do_action( 'aponto_migration_failure', $identifier, $version );
		} catch ( \Throwable $listener_failure ) {
			unset( $listener_failure ); // Diagnostics must never replace the controlled failure result.
		}

		return MigrationResult::failure( $version, $identifier, $error );
	}
}

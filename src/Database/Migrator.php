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
use Aponto\Database\Migrations\Migration_0011_StaffPublicProfile;
use Aponto\Database\Migrations\Migration_0012_Coupons;
use Aponto\Database\Migrations\Migration_0013_CsvImport;
use Aponto\Database\Migrations\Migration_0014_OrderPayableNow;
use Aponto\Database\Migrations\Migration_0015_DepositNotificationCopy;
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
	public const SCHEMA_VERSION = 15;

	/**
	 * Option holding the applied core schema version (autoloaded — read every request).
	 */
	public const VERSION_OPTION = 'aponto_schema_version';

	/**
	 * Revision of the SHAPE the code expects at {@see self::SCHEMA_VERSION} (D-R67q).
	 *
	 * The version number alone cannot tell two databases apart that claim the same number with
	 * different shapes: the pre-merge coupon branch shipped to development sites as schema 11 (a
	 * `aponto_coupon_customers` map, no `coupon_released_at`) and schema 12 (plus the user map),
	 * both folded into today's single coupon migration — numbered 0012 since `main` (which owns
	 * 0011, the staff public profile) was merged in on 2026-09-29. A coupon development site reads
	 * "11" (visited by 0012, and repaired to 0011's staff columns by the health pass) or "12" —
	 * never behind — so without this stamp the release path would hit a missing column.
	 * The runtime is therefore ready only when this revision matches too; a mismatch is handled
	 * exactly like "behind": maintenance mode until the admin-side upgrade pass runs the migrator,
	 * whose always-on self-repair restores the shape and then records this value.
	 */
	public const SCHEMA_SHAPE = '15.1';

	/**
	 * Option holding the verified {@see self::SCHEMA_SHAPE} (autoloaded — read every request).
	 */
	public const SHAPE_OPTION = 'aponto_schema_shape';

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
	 * Prove the coupon shape and only then stamp it (D-R67q, review round 3).
	 *
	 * Runs migration 0012's idempotent `up()` UNCONDITIONALLY — the DDL, the closure of pre-merge
	 * customer-targeted coupons and the `users_targeted` backfill — and stamps only when its
	 * `verify()` (structure AND those data postconditions) passes. A structure that looks healthy
	 * is therefore never enough on its own: a pass that failed half-way through the data repair
	 * leaves no stamp, and the next pass repeats the whole repair.
	 *
	 * Forward-only: a stored version ABOVE the target belongs to newer code and is left untouched
	 * (and unstamped by this code). The pre-merge coupon branch's development schema `12` (legacy
	 * `aponto_coupon_customers` table present) used to be lowered to the old target 11; since the
	 * renumbering (coupons = 0012, 2026-09-29) it IS the target and is simply proved here.
	 *
	 * @param int $current Current schema version.
	 * @return MigrationResult|null Failure, or null when proved (or not ours to prove).
	 */
	private function proveShape( int $current ): ?MigrationResult {
		if ( $current > self::SCHEMA_VERSION ) {
			return null;
		}

		$migration = new Migration_0012_Coupons();
		try {
			$migration->up( $this->wpdb );
			$proved = $migration->verify( $this->wpdb );
		} catch ( \Throwable $e ) {
			return $this->recordFailure( $current, '12', $e->getMessage() );
		}
		if ( ! $proved ) {
			return $this->recordFailure( $current, '12', 'coupon shape postcondition failed (legacy targets not closed or users_targeted not backfilled)' );
		}

		update_option( self::SHAPE_OPTION, self::SCHEMA_SHAPE, true );

		return null;
	}

	/**
	 * Applied core schema version (0 when never migrated).
	 */
	public function currentVersion(): int {
		return (int) get_option( self::VERSION_OPTION, 0 );
	}

	/**
	 * Whether the recorded schema shape is the one this code expects (D-R67q). A database whose
	 * version is at the target but whose shape was never verified by this code (a coupon
	 * development site, or an unstamped database above the target) needs an upgrade pass just like
	 * one that is behind.
	 */
	public static function shapeCurrent(): bool {
		$stamp = (string) get_option( self::SHAPE_OPTION, '' );
		if ( self::SCHEMA_SHAPE === $stamp ) {
			return true;
		}

		// Code N on schema N+1 (§5 invariant 4): a NEWER schema stamped by newer code is fine. Only
		// an unstamped database above the target is held back.
		return '' !== $stamp && (int) get_option( self::VERSION_OPTION, 0 ) > self::SCHEMA_VERSION;
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
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Engine check against information_schema during activation; caching is not applicable.
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
		// 0011 follows the same maintenance rule (D-R51). Its three columns live on `aponto_staff`,
		// which 0001 owns and therefore verifies WITHOUT them — extra columns are allowed by
		// design (forward-compat §4.1), so nothing else in the health pass can notice that a
		// restore from an older dump dropped them. The staff read then fails on every admin and
		// public request that names them.
		if ( $version >= 11 && ! ( new Migration_0011_StaffPublicProfile() )->verify( $this->wpdb ) ) {
			return 'migration 0011 postcondition failed (staff public-profile columns missing)';
		}
		if ( $version >= 13 && ! ( new Migration_0013_CsvImport() )->verify( $this->wpdb ) ) {
			return 'migration 0013 postcondition failed (import schema missing)';
		}
		if ( $version >= 12 && ! ( new Migration_0012_Coupons() )->verify( $this->wpdb ) ) {
			return 'migration 0012 postcondition failed (coupon schema missing)';
		}
		// 0014 (D-R71): the payable-now column lives on `aponto_orders`, which 0001 verifies without it.
		if ( $version >= 14 && ! ( new Migration_0014_OrderPayableNow() )->verify( $this->wpdb ) ) {
			return 'migration 0014 postcondition failed (order payable-now column missing)';
		}
		// 0015 is a copy migration like 0010 and follows the same maintenance rule: a restore from
		// an older dump that brings back an untouched pre-deposit default body would otherwise pass
		// the health check and send deposit customers mail without their payment summary.
		if ( $version >= 15 && ! ( new Migration_0015_DepositNotificationCopy() )->verify( $this->wpdb ) ) {
			return 'migration 0015 postcondition failed (pre-deposit customer template still in place)';
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
			if ( $manifest->version > $applied || ( $manifest->repair && ! $this->repairVerified( $manifest ) ) ) {
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
			new Migration_0011_StaffPublicProfile(),
			new Migration_0012_Coupons(),
			new Migration_0013_CsvImport(),
			new Migration_0014_OrderPayableNow(),
			new Migration_0015_DepositNotificationCopy(),
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
					Migration_0009_Payments::tableSlugs(),
					Migration_0012_Coupons::tableSlugs(),
					Migration_0013_CsvImport::tableSlugs()
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

		if ( $current >= self::SCHEMA_VERSION && ! self::shapeCurrent() ) {
			$shape_failure = $this->proveShape( $current );
			if ( null !== $shape_failure ) {
				return $shape_failure;
			}
		}

		// The core version only ever records the last CORE migration applied above. Module schemas
		// keep their own `aponto_module_{code}_db_version`; a ratchet to SCHEMA_VERSION here would
		// mark a later core migration as applied before it ran (webhooks review B2).
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
			if ( $current >= 11 ) {
				( new Migration_0011_StaffPublicProfile() )->up( $this->wpdb );
			}
			if ( $current >= 12 ) {
				( new Migration_0012_Coupons() )->up( $this->wpdb );
			}
			if ( $current >= 13 ) {
				( new Migration_0013_CsvImport() )->up( $this->wpdb );
			}
			if ( $current >= 14 ) {
				( new Migration_0014_OrderPayableNow() )->up( $this->wpdb );
			}
			if ( $current >= 15 ) {
				( new Migration_0015_DepositNotificationCopy() )->up( $this->wpdb );
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

			if ( $manifest->version <= $applied && ( ! $manifest->repair || $this->repairVerified( $manifest ) ) ) {
				continue;
			}

			$identifier = sprintf( 'module:%s:%d', $manifest->moduleCode, $manifest->version );

			require_once ABSPATH . 'wp-admin/includes/upgrade.php';

			try {
				foreach ( $manifest->schema as $sql ) {
					dbDelta( $sql );
				}
				if ( is_callable( $manifest->upgrade ) ) {
					( $manifest->upgrade )( $this->wpdb );
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

			update_option( $option, max( $applied, $manifest->version ), false );
			if ( $manifest->repair ) {
				$this->recordVerified( $manifest );
			}
		}

		return null;
	}

	/**
	 * Whether a repairable manifest's shape is known good, verifying it only when it must be.
	 *
	 * A `repair` manifest used to be re-verified on EVERY `admin_init` (≈25 SHOW/information_schema
	 * statements per admin request for the Webhooks manifests; review H3). The verdict is now
	 * cached per manifest in `aponto_module_{code}_schema_verified`, keyed by a hash of the
	 * manifest's module, version and DDL, so a real verification runs only when the manifest
	 * changes (a version bump or new DDL), when nothing has been recorded yet, or while a
	 * migration failure is recorded (`aponto_migration_error`). A healthy first check records the
	 * verdict; an unhealthy one does not, so the upgrade pass repairs and then records it.
	 *
	 * @param ModuleMigrationManifest $manifest Module-owned schema contract.
	 */
	private function repairVerified( ModuleMigrationManifest $manifest ): bool {
		$verdicts = get_option( self::verdictOption( $manifest ), array() );
		if ( false === get_option( self::ERROR_OPTION, false ) && is_array( $verdicts ) && ( $verdicts[ $manifest->version ] ?? null ) === self::manifestHash( $manifest ) ) {
			return true;
		}
		if ( ! $this->manifestHealthy( $manifest ) ) {
			return false;
		}
		$this->recordVerified( $manifest );

		return true;
	}

	/**
	 * Record that this exact manifest was verified healthy.
	 *
	 * @param ModuleMigrationManifest $manifest Module-owned schema contract.
	 */
	private function recordVerified( ModuleMigrationManifest $manifest ): void {
		$option   = self::verdictOption( $manifest );
		$verdicts = get_option( $option, array() );
		$verdicts = is_array( $verdicts ) ? $verdicts : array();
		$hash     = self::manifestHash( $manifest );
		if ( ( $verdicts[ $manifest->version ] ?? null ) !== $hash ) {
			$verdicts[ $manifest->version ] = $hash;
			update_option( $option, $verdicts, true );
		}
	}

	/**
	 * Option holding a module's cached repair verdicts (version => manifest hash).
	 *
	 * @param ModuleMigrationManifest $manifest Module-owned schema contract.
	 */
	private static function verdictOption( ModuleMigrationManifest $manifest ): string {
		return sprintf( 'aponto_module_%s_schema_verified', $manifest->moduleCode );
	}

	/**
	 * Identity of a manifest's schema contract: module, version and exact DDL.
	 *
	 * @param ModuleMigrationManifest $manifest Module-owned schema contract.
	 */
	private static function manifestHash( ModuleMigrationManifest $manifest ): string {
		return hash( 'sha256', (string) wp_json_encode( array( $manifest->moduleCode, $manifest->version, $manifest->schema ) ) );
	}

	/**
	 * Check an opt-in repairable module manifest without changing any data.
	 *
	 * @param ModuleMigrationManifest $manifest Module-owned schema contract.
	 */
	private function manifestHealthy( ModuleMigrationManifest $manifest ): bool {
		try {
			return null === ( new SchemaVerifier( $this->wpdb ) )->verifyStatements( $manifest->schema )
				&& is_callable( $manifest->postcondition )
				&& (bool) ( $manifest->postcondition )( $this->wpdb );
		} catch ( \Throwable $failure ) {
			return false;
		}
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

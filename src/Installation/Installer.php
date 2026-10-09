<?php
/**
 * Activation / install orchestration.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Installation;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Database\LockFactory;
use Aponto\Database\Migrator;
use Aponto\Frontend\BookingManagePage;
use Aponto\Onboarding\ActivationRedirect;
use Aponto\Onboarding\Funnel;

/**
 * Per-site install: run migrations, verify the schema is complete (and InnoDB on the MySQL
 * family), then seed data, grant caps and schedule cron — seeding runs under its own advisory
 * lock (review item 7).
 *
 * Activation is FAIL-CLOSED (NB-3, review item 1): a migration failure, an incomplete version,
 * a missing table, an undeterminable engine or a non-InnoDB engine all deactivate the plugin and
 * abort with an actionable error screen. Non-activation requests record the error for an admin
 * notice and retry later instead of fataling. The engine checks are MySQL-family only (D-R20,
 * founder 2026-07-21): SQLite is a supported tier, and everything else about the fail-closed
 * gate — schema completeness, columns, keys — is verified identically on both engines.
 *
 * Multisite: activation installs each site; network activation iterates blogs; new sites install
 * via `wp_initialize_site` (§4.1). Pending core/module migrations are retried opportunistically
 * on `admin_init` (§4.1 retry; review item 3).
 */
final class Installer {

	/**
	 * Construct, optionally with an injected Migrator (test seam for lock-contention paths).
	 *
	 * @param Migrator|null $migrator Migrator override; null builds one from the global $wpdb.
	 */
	public function __construct( private ?Migrator $migrator = null ) {}

	/**
	 * `register_activation_hook` callback.
	 *
	 * @param bool $network_wide Whether activation is network-wide.
	 */
	public static function activate( bool $network_wide ): void {
		if ( is_multisite() && $network_wide ) {
			foreach ( self::siteIds() as $blog_id ) {
				switch_to_blog( $blog_id );
				( new self() )->installSite( true );
				restore_current_blog();
			}

			return;
		}

		( new self() )->installSite( true );

		// WordPress owns the activation response and immediately redirects back to plugins.php, so
		// the activation hook cannot send the founder to onboarding itself. Queue a one-shot marker
		// for the next foreground admin request instead. A completed funnel is a reactivation, not a
		// first run; network-wide activation has no single site's wizard to choose (SPEC-P1 §4).
		if ( ! $network_wide && ! ( new Funnel() )->isComplete() ) {
			ActivationRedirect::queue();
		}
	}

	/**
	 * `register_deactivation_hook` callback — clear scheduled cron per site.
	 *
	 * @param bool $network_wide Whether deactivation is network-wide.
	 */
	public static function deactivate( bool $network_wide ): void {
		if ( is_multisite() && $network_wide ) {
			foreach ( self::siteIds() as $blog_id ) {
				switch_to_blog( $blog_id );
				Cron::clear();
				\Aponto\Integration\RemoteEventSync::clearSchedule();
				flush_rewrite_rules( false );
				restore_current_blog();
			}

			return;
		}

		Cron::clear();
		// The integrations tick is scheduled on demand (D-R34); deactivation must take it with the
		// core pass, or the site keeps firing an event for code that is no longer loaded.
		\Aponto\Integration\RemoteEventSync::clearSchedule();
		// Drop the manage-page rewrite rule from the cached ruleset (SPEC-P1 §3.4).
		flush_rewrite_rules( false );
	}

	/**
	 * `wp_initialize_site` callback — install a freshly created multisite blog.
	 *
	 * @param \WP_Site $site New site.
	 */
	public static function newSite( \WP_Site $site ): void {
		if ( ! function_exists( 'is_plugin_active_for_network' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		if ( ! is_plugin_active_for_network( plugin_basename( APONTO_FILE ) ) ) {
			return;
		}

		switch_to_blog( (int) $site->blog_id );
		// Not an activation request: never wp_die during site creation; a shared-DB new site
		// inherits the network engine, so InnoDB is already satisfied.
		( new self() )->installSite( false );
		restore_current_blog();
	}

	/**
	 * `admin_init` callback — retry pending/failed core AND module migrations without fataling
	 * (review item 3: a re-enabled module with a higher manifest version runs here).
	 */
	public static function maybeUpgrade(): void {
		global $wpdb;

		$migrator = new Migrator( $wpdb );
		// "Behind" includes a database at the target number whose SHAPE this code never verified
		// (D-R67q) — the pre-merge coupon branch's schema 11/12.
		$behind         = $migrator->currentVersion() < Migrator::SCHEMA_VERSION || ! Migrator::shapeCurrent();
		$has_error      = false !== get_option( Migrator::ERROR_OPTION, false );
		$module_pending = $migrator->hasPendingModuleMigrations();
		// A partial template seed (process died / insert failed mid-upgrade) re-triggers the install
		// path until every seed row verifiably exists (Codex review E item 6) — the Seeder's per-key
		// guard makes the retry insert exactly the missing rows.
		$seed_pending = false !== get_option( Seeder::INCOMPLETE_OPTION, false );

		if ( ! $behind && ! $has_error && ! $module_pending && ! $seed_pending ) {
			return;
		}

		( new self() )->installSite( false );
	}

	/**
	 * Install (or repair) the current site.
	 *
	 * @param bool $is_activation Whether this runs inside an activation request (enables the
	 *                            fail-closed hard abort).
	 */
	public function installSite( bool $is_activation ): void {
		global $wpdb;

		$migrator = $this->migrator ?? new Migrator( $wpdb );
		$result   = $migrator->run();

		if ( $result->busy ) {
			// Another request holds the migration lock (R2-2): no side effects, retry later.
			if ( $is_activation ) {
				$this->abortActivation( 'Another request is currently running the Aponto database migration. Please wait a moment and try activating again.' );
			}

			return;
		}

		if ( ! $result->ok ) {
			// Failure details were already recorded by the Migrator for the admin notice.
			if ( $is_activation ) {
				$this->abortActivation(
					sprintf(
						'Database migration "%s" failed: %s',
						(string) $result->failed_migration,
						(string) $result->error
					)
				);
			}

			return;
		}

		// Completion gate (R2-2): core version at target AND no pending module migrations AND a
		// healthy schema. Anything less never seeds and never completes an activation.
		if ( $migrator->currentVersion() < Migrator::SCHEMA_VERSION || $migrator->hasPendingModuleMigrations() ) {
			if ( $is_activation ) {
				$this->abortActivation( 'Database migration did not complete. Please try activating again.' );
			}

			return;
		}

		// Fail-closed schema health check (review item 1): missing table, undeterminable engine
		// and non-InnoDB engine are all hard activation failures, not warnings. Normally
		// unreachable — Migrator::run() self-repairs drift (R2-4) — kept as the final gate.
		//
		// ASKED ONCE PER UPGRADE PASS (D-R40e, Codex #9). `Migrator::run()` ends by verifying this
		// exact thing — existence, engine, columns and every declared index across every core table,
		// plus migration 0009's postcondition — and this gate then asked for all of it again, one
		// statement later, on a schema nothing had touched in between. Network activation pays that
		// twice per site. The verdict now rides on the result, and the gate only re-verifies when the
		// run did NOT verify (a version-0 install, or any path that skipped the repair step) — so the
		// default is still "ask", and nothing is assumed healthy because nobody looked.
		$health = $result->health_verified ? null : $migrator->verifyCoreSchemaHealth();
		if ( null !== $health ) {
			if ( $is_activation ) {
				$this->abortActivation( $health );

				return;
			}

			update_option(
				Migrator::ERROR_OPTION,
				array(
					'migration' => 'innodb',
					'error'     => $health,
				),
				false
			);

			return;
		}

		// Seeding runs under its own advisory lock so two racing requests cannot both pass the
		// empty-table guard and double-insert seeds (review item 7).
		$lock = ( new LockFactory( $wpdb ) )->named( 'apt:' . $wpdb->prefix . ':seed' );
		if ( ! $lock->acquire( Migrator::LOCK_TIMEOUT ) ) {
			return;
		}

		try {
			( new Seeder( $wpdb ) )->seed();
			Capabilities::grant();
			Cron::schedule();
		} finally {
			$lock->release();
		}

		// Register the manage-page rewrite rule and refresh the cached ruleset so the pretty
		// permalink `/aponto/booking/{token}` resolves on the first request (SPEC-P1 §3.4). The
		// Kernel booted in maintenance mode on a fresh install, so the `init` registration did not
		// run this request — flush explicitly (this also stamps the rewrite version).
		BookingManagePage::flushRewrites();
	}

	/**
	 * Abort activation fail-closed: deactivate the plugin and die with an actionable screen
	 * (NB-3 — a broken or non-InnoDB schema must never leave the plugin active).
	 *
	 * The screen names the ACTUAL database requirement (D-R20) so the operator knows what to fix:
	 * MySQL 5.7+/MariaDB 10.4+ with InnoDB (recommended for production) or SQLite through the
	 * official WordPress SQLite database integration. English msgids, localized at this boundary;
	 * the technical reason is host-facing and PII-free.
	 *
	 * @param string $reason Technical failure description (English, dev/host-facing).
	 */
	private function abortActivation( string $reason ): void {
		if ( ! function_exists( 'deactivate_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		deactivate_plugins( plugin_basename( APONTO_FILE ) );

		$message  = '<h1>' . esc_html__( 'Aponto could not be activated', 'aponto' ) . '</h1>';
		$message .= '<p>' . esc_html__(
			'Aponto could not create or verify its database tables. The plugin was deactivated so it never runs on an incomplete schema.',
			'aponto'
		) . '</p>';
		$message .= '<p><code>' . esc_html( $reason ) . '</code></p>';
		$message .= '<p>' . esc_html__(
			'Aponto needs a database that can create its tables and write bookings inside a transaction: MySQL 5.7 or newer, or MariaDB 10.4 or newer, with the InnoDB storage engine — the recommended setup for a live site. SQLite is also fully supported through the official WordPress SQLite database integration, for local and preview sites.',
			'aponto'
		) . '</p>';
		$message .= '<p>' . esc_html__(
			'If the message above mentions a storage engine, please ask your host to enable InnoDB. If it mentions a missing table or column, please make sure the database user is allowed to create tables. Then activate Aponto again.',
			'aponto'
		) . '</p>';

		wp_die(
			wp_kses_post( $message ),
			esc_html__( 'Aponto activation failed', 'aponto' ),
			array( 'back_link' => true )
		);
	}

	/**
	 * All blog ids on a multisite network.
	 *
	 * @return list<int>
	 */
	private static function siteIds(): array {
		$ids = get_sites(
			array(
				'fields' => 'ids',
				'number' => 0,
			)
		);

		return array_map( 'intval', $ids );
	}
}

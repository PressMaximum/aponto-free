<?php
/**
 * WP-CLI commands: `wp aponto seed|diagnose|fixer`.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Cli;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Database\Migrator;
use Aponto\Kernel;
use Aponto\Plan;
use Aponto\Support\Clock;
use Aponto\Support\RuntimeDiagnostics;
use Aponto\Support\Settings;

/**
 * Registers seed fixtures, PII-redacted diagnostics and the operational fixer. Registered from
 * the Kernel only under WP-CLI.
 */
final class Commands {

	/**
	 * Register the commands.
	 */
	public static function register(): void {
		\WP_CLI::add_command( 'aponto seed', array( self::class, 'seed' ) );
		\WP_CLI::add_command( 'aponto diagnose', array( self::class, 'diagnose' ) );
		\WP_CLI::add_command( 'aponto fixer', array( self::class, 'fixer' ) );
		\WP_CLI::add_command( 'aponto audit', array( self::class, 'audit' ) );
	}

	/**
	 * `wp aponto seed` — insert a coherent demo dataset.
	 *
	 * ## OPTIONS
	 *
	 * [--staff=<n>]
	 * : How many staff members to seed, 1..5 (default 1). Above 1, the extra members get their own
	 * weekday windows and only part of the catalog, which is what makes any-staff availability,
	 * the calendar's staff selector and per-service eligibility worth QA-ing (D-R28). Out-of-range
	 * values are clamped rather than rejected — this is a dev convenience, not an API.
	 *
	 * @param list<string>          $args       Positional args (unused).
	 * @param array<string, string> $assoc_args Flags.
	 */
	public static function seed( array $args, array $assoc_args ): void {
		unset( $args );
		if ( ! Kernel::schemaReady() ) {
			\WP_CLI::error( 'Aponto schema is not ready. Activate the plugin first.' );
		}

		$staff_count = isset( $assoc_args['staff'] ) ? (int) $assoc_args['staff'] : 1;

		global $wpdb;
		try {
			$summary = ( new Fixtures( $wpdb, new Clock() ) )->seed( $staff_count );
		} catch ( \Throwable $e ) {
			// The seeder is all-or-nothing per booking and reports only what it created, so a
			// failure is reported as one instead of being summarised away.
			\WP_CLI::error( $e->getMessage() );
		}

		\WP_CLI::success(
			sprintf(
				'Seeded %d categories, %d services, %d staff and %d bookings.',
				$summary['categories'],
				$summary['services'],
				$summary['staff'],
				$summary['bookings']
			)
		);
	}

	/**
	 * `wp aponto diagnose` — print PII-redacted diagnostics as JSON.
	 *
	 * @param list<string>          $args       Positional args (unused).
	 * @param array<string, string> $assoc_args Flags (unused).
	 */
	public static function diagnose( array $args, array $assoc_args ): void {
		unset( $args, $assoc_args );
		\WP_CLI::log( (string) wp_json_encode( self::report(), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) );
	}

	/**
	 * `wp aponto fixer` — repair schema drift, seed notification templates, capabilities and the
	 * cleanup cron.
	 *
	 * @param list<string>          $args       Positional args (unused).
	 * @param array<string, string> $assoc_args Flags (unused).
	 */
	public static function fixer( array $args, array $assoc_args ): void {
		unset( $args, $assoc_args );
		global $wpdb;
		$report = ( new Fixer( $wpdb ) )->run();
		foreach ( $report['items'] as $item ) {
			\WP_CLI::log( sprintf( '[%s] %s: %s', $item['status'], $item['item'], $item['message'] ) );
		}
		if ( ! $report['ok'] ) {
			\WP_CLI::error( 'Aponto fixer completed with failures.' );
		}
		\WP_CLI::success( 'Aponto fixer completed.' );
	}

	/**
	 * `wp aponto audit [--repair]` — report (and optionally repair) orphan rows that reference a
	 * staff/service/location that no longer exists. Without `--repair` it only lists what it finds.
	 *
	 * ## OPTIONS
	 *
	 * [--repair]
	 * : Delete orphan connections/schedules/blocked periods and CANCEL active orphan bookings
	 *   (records preserved). Omit to report only.
	 *
	 * @param list<string>          $args       Positional args (unused).
	 * @param array<string, string> $assoc_args Flags: `repair`.
	 */
	public static function audit( array $args, array $assoc_args ): void {
		unset( $args );
		if ( ! Kernel::schemaReady() ) {
			\WP_CLI::error( 'Aponto schema is not ready. Activate the plugin first.' );
		}

		global $wpdb;
		$repair = ! empty( $assoc_args['repair'] );
		$report = ( new Audit( $wpdb ) )->run( $repair );
		foreach ( $report['items'] as $item ) {
			\WP_CLI::log( sprintf( '[%s] %s: %s', $item['status'], $item['item'], $item['message'] ) );
		}

		// R2 #7: a failed statement anywhere makes the run a FAILURE (exit non-zero) — a partial
		// repair is never presented as success. Groups are single atomic statements; re-running
		// resumes with whatever is still broken.
		if ( ! $report['ok'] ) {
			\WP_CLI::error( 'Aponto audit completed with failures. Re-run to retry the failed groups.' );
		}

		$outstanding = ! $report['repaired']
			&& array_sum( array_column( $report['items'], 'count' ) ) > 0;
		if ( $outstanding ) {
			\WP_CLI::warning( 'Orphan rows found. Re-run with --repair to fix them.' );

			return;
		}

		\WP_CLI::success( $report['repaired'] ? 'Aponto audit completed; orphans repaired.' : 'Aponto audit completed; no orphans found.' );
	}

	/**
	 * Build the PII-redacted diagnostics report (mirrors `/system/diagnostics`).
	 *
	 * The `runtime` block comes from the SHARED {@see RuntimeDiagnostics} the REST endpoint uses, so
	 * this command reports the engine actually running (D-R20). It previously hardcoded
	 * `"database": "mysql"`, which told every SQLite operator the wrong engine — on the one command
	 * that is reachable when the admin UI is not.
	 *
	 * @return array<string, mixed>
	 */
	private static function report(): array {
		global $wpdb;
		$settings = new Settings();

		$timezone = (string) wp_timezone_string();

		return array(
			'plugin'    => array(
				'version' => defined( 'APONTO_VERSION' ) ? APONTO_VERSION : '',
				'edition' => Plan::instance()->metadata()['edition'],
			),
			'wordpress' => array(
				'version'   => get_bloginfo( 'version' ),
				'multisite' => is_multisite(),
			),
			'runtime'   => ( new RuntimeDiagnostics( $wpdb ) )->section(),
			'schema'    => array(
				'version'   => (string) (int) get_option( Migrator::VERSION_OPTION, 0 ),
				'tables_ok' => Kernel::schemaReady(),
			),
			'counts'    => array(
				'services' => self::count( $wpdb, 'aponto_services' ),
				'staff'    => self::count( $wpdb, 'aponto_staff' ),
				'bookings' => self::count( $wpdb, 'aponto_bookings' ),
			),
			'settings'  => array(
				'timezone'  => $timezone,
				'debug_log' => (bool) $settings->get( 'debug_log' ),
			),
			'checks'    => array(
				array(
					'code'   => 'cron',
					'status' => false !== wp_next_scheduled( 'aponto_cleanup' ) ? 'ok' : 'missing',
				),
			),
		);
	}

	/**
	 * Count rows in an Aponto table.
	 *
	 * @param \wpdb  $wpdb Database handle.
	 * @param string $slug Table slug.
	 */
	private static function count( \wpdb $wpdb, string $slug ): int {
		$table = $wpdb->prefix . $slug;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; no user input.
		return (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table}" );
	}
}

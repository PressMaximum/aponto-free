<?php
/**
 * Admin `/system/diagnostics` controller (rest-contract §2.15).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Rest\Controller;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Database\Migrator;
use Aponto\Kernel;
use Aponto\Plan;
use Aponto\Rest\Controller;
use Aponto\Rest\Policy;
use Aponto\Rest\Services;
use Aponto\Rest\Support\RawResponse;
use Aponto\Support\Logger;
use Aponto\Support\RuntimeDiagnostics;
use Aponto\Support\Settings;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Read-only environment + health snapshot for support triage (rest-contract §2.15). The payload is
 * PII-redacted by construction: it exposes only the allow-listed environment, schema, count and
 * health fields assembled in {@see self::show()} — never an email, phone number, token, message
 * body, template payload or filesystem secret, and never the business name/address/phone. Only the
 * timezone and the `debug_log` flag are surfaced from settings. Requires
 * {@see Policy::MANAGE_SETTINGS}.
 */
final class DiagnosticsController implements Controller {

	/**
	 * Database handle.
	 *
	 * @var \wpdb
	 */
	private \wpdb $wpdb;

	/**
	 * Core settings.
	 *
	 * @var Settings
	 */
	private Settings $settings;

	/**
	 * Structured debug logger.
	 *
	 * @var Logger
	 */
	private Logger $logger;

	/**
	 * Construct the controller.
	 *
	 * @param Services $services Service locator.
	 */
	public function __construct( Services $services ) {
		$this->wpdb     = $services->wpdb();
		$this->settings = $services->settings();
		$this->logger   = $services->logger();
	}

	/**
	 * Register routes.
	 *
	 * @param string $rest_namespace REST namespace.
	 */
	public function register( string $rest_namespace ): void {
		register_rest_route(
			$rest_namespace,
			'/system/diagnostics',
			array(
				'methods'             => 'GET',
				'permission_callback' => array( Policy::class, 'manageSettings' ),
				'callback'            => array( $this, 'show' ),
			)
		);
		register_rest_route(
			$rest_namespace,
			'/system/debug-log',
			array(
				'methods'             => 'GET',
				'permission_callback' => array( Policy::class, 'manageSettings' ),
				'callback'            => array( $this, 'downloadLog' ),
			)
		);
	}

	/** Capability-gated download; the response never exposes the random filesystem path. */
	public function downloadLog(): WP_REST_Response|\WP_Error {
		$contents = $this->logger->contents();
		if ( null === $contents ) {
			return \Aponto\Rest\Errors::notFound();
		}

		return RawResponse::make(
			$contents,
			'application/x-ndjson; charset=UTF-8',
			array( 'Content-Disposition' => 'attachment; filename="aponto-debug.log"' )
		);
	}

	/**
	 * GET /system/diagnostics.
	 *
	 * @param WP_REST_Request $request Request.
	 */
	public function show( WP_REST_Request $request ): WP_REST_Response {
		unset( $request );

		$payload = array(
			'plugin'    => array(
				'version' => APONTO_VERSION,
				'edition' => Plan::instance()->metadata()['edition'],
			),
			'wordpress' => array(
				'version'   => get_bloginfo( 'version' ),
				'multisite' => is_multisite(),
			),
			// Shared with `wp aponto diagnose` so the two diagnostics surfaces cannot drift (D-R20).
			'runtime'   => ( new RuntimeDiagnostics( $this->wpdb ) )->section(),
			'schema'    => array(
				'version'   => $this->schemaVersion(),
				'tables_ok' => Kernel::schemaReady(),
			),
			'counts'    => array(
				'services' => $this->countRows( 'aponto_services' ),
				'staff'    => $this->countRows( 'aponto_staff' ),
				'bookings' => $this->countRows( 'aponto_bookings' ),
			),
			'settings'  => array(
				'timezone'  => $this->businessTimezone(),
				'debug_log' => (bool) $this->settings->get( 'debug_log' ),
			),
			// Additive per-module health (D-R35). A module contributes COUNTS and a failure SCOPE
			// only; this payload is PII-redacted by construction and a module must not be the field
			// that breaks that, so no account, token, calendar id or provider message may appear.
			'modules'   => self::moduleDiagnostics(),
			'checks'    => array(
				array(
					'code'   => 'cron',
					'status' => false !== wp_next_scheduled( 'aponto_cleanup' ) ? 'ok' : 'missing',
				),
				array(
					// The integrations retry tick is scheduled ON DEMAND (D-R34): absent is the
					// CORRECT state for a site with no connection, so this reports presence, not health.
					'code'   => 'integrations_cron',
					'status' => false !== wp_next_scheduled( \Aponto\Integration\RemoteEventSync::TICK_HOOK ) ? 'ok' : 'idle',
				),
				array(
					// REST-7 key material; surfaced here and in Site Health, never as an admin notice.
					'code'   => 'crypto',
					'status' => \Aponto\Support\Crypto::isUsableKeyMaterial( defined( 'SECURE_AUTH_KEY' ) ? (string) SECURE_AUTH_KEY : '' ) ? 'ok' : 'degraded',
				),
			),
		);

		return new WP_REST_Response( $payload, 200 );
	}

	/**
	 * Per-module diagnostics contributed by enabled modules.
	 *
	 * The filter fires only for modules that actually booted, so a disabled or unowned module
	 * contributes nothing and the key simply does not appear — the same "no surface for a capability
	 * you do not own" rule the rest of the module system follows.
	 *
	 * @return array<string, mixed>
	 */
	private static function moduleDiagnostics(): array {
		/**
		 * Filter the per-module diagnostics block (rest-contract §2.15, D-R35).
		 *
		 * Contributions must be COUNTS, booleans and stable scope strings. No PII, no secret, no
		 * provider message — the diagnostics payload is support-shareable by construction.
		 *
		 * @param array<string, mixed> $modules Module diagnostics so far.
		 */
		$modules = apply_filters( 'aponto_diagnostics_modules', array() );

		return is_array( $modules ) ? $modules : array();
	}

	/**
	 * Applied core schema version as a string, falling back to the target version when unrecorded.
	 */
	private function schemaVersion(): string {
		$applied = (int) get_option( Migrator::VERSION_OPTION, 0 );

		return (string) ( $applied > 0 ? $applied : Migrator::SCHEMA_VERSION );
	}

	/**
	 * Row count for an Aponto table (constant slug; no user input).
	 *
	 * @param string $slug Table slug without the `$wpdb->prefix`.
	 */
	private function countRows( string $slug ): int {
		$table = $this->wpdb->prefix . $slug;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table slug; no user input.
		return (int) $this->wpdb->get_var( "SELECT COUNT(*) FROM {$table}" );
	}

	/**
	 * Business timezone from the WordPress site setting (never empty).
	 */
	private function businessTimezone(): string {
		return function_exists( 'wp_timezone_string' ) ? wp_timezone_string() : 'UTC';
	}
}

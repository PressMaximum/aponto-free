<?php
/**
 * The shared `runtime` section of the diagnostics snapshot (rest-contract §2.15).
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
 * Assembles the environment block reported by BOTH diagnostics surfaces — the admin REST endpoint
 * `/system/diagnostics` and `wp aponto diagnose` — in one place so the two can never drift apart.
 *
 * Drift is exactly why this class exists: the REST controller had already learned about SQLite
 * (D-R20) while the CLI report still hardcoded `"database": "mysql"`, so `wp aponto diagnose` told
 * every SQLite operator their site was running MySQL — the one field support triage keys off. Every
 * engine-conditional answer here comes from {@see DatabaseEngine}, the single source of truth for
 * engine detection (§4); no caller may sniff the engine on its own.
 *
 * PII-free by construction: versions, an engine name and a boolean — never a host, path, user or
 * connection secret.
 */
final class RuntimeDiagnostics {

	/**
	 * Construct the reporter.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct( private \wpdb $wpdb ) {}

	/**
	 * The `runtime` section, identical on both surfaces.
	 *
	 * @return array{php: string, database: string, engine: string, innodb: bool}
	 */
	public function section(): array {
		return array(
			'php'      => $this->phpVersion(),
			'database' => $this->databaseServer(),
			'engine'   => DatabaseEngine::of( $this->wpdb ),
			'innodb'   => $this->innodbEnabled(),
		);
	}

	/**
	 * PHP `major.minor` version — the patch level is withheld (no value, and one less fingerprint).
	 */
	private function phpVersion(): string {
		return implode( '.', array_slice( explode( '.', PHP_VERSION ), 0, 2 ) );
	}

	/**
	 * Raw database server version string (e.g. `8.0.36`); never a connection secret.
	 *
	 * On SQLite the drop-in reports the SQLite library version, which alone would read as an
	 * absurdly old MySQL — it is prefixed with the engine so the value is unambiguous (D-R20).
	 * The MySQL-family value is unchanged.
	 */
	private function databaseServer(): string {
		$info = $this->wpdb->db_server_info();

		if ( DatabaseEngine::isSqlite( $this->wpdb ) ) {
			return '' !== $info ? DatabaseEngine::SQLITE . ' ' . $info : DatabaseEngine::SQLITE;
		}

		return '' !== $info ? $info : 'mysql';
	}

	/**
	 * Whether the bookings table is InnoDB; an unknown/absent engine is reported as InnoDB (NB-3).
	 *
	 * Always false on SQLite (D-R20): storage engines are a MySQL-family concept, so reporting
	 * `true` there would be a lie and querying `information_schema` answers nothing (the 3.x
	 * drop-in synthesises a hardcoded `InnoDB`, the 2.x one has no such table). The companion
	 * `engine` field is what a diagnostics reader should key off; this flag keeps its literal
	 * meaning on both engines.
	 */
	private function innodbEnabled(): bool {
		if ( DatabaseEngine::isSqlite( $this->wpdb ) ) {
			return false;
		}

		$table = $this->wpdb->prefix . 'aponto_bookings';
		$sql   = 'SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared -- Engine check against information_schema; caching is not applicable.
		$engine = $this->wpdb->get_var( $this->wpdb->prepare( $sql, $table ) );

		if ( null === $engine ) {
			return true;
		}

		return 'INNODB' === strtoupper( (string) $engine );
	}
}

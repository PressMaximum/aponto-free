<?php
/**
 * Durable CSV import identities and private jobs (D-R72).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Database\Migrations;

use Aponto\Database\SchemaVerifier;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/** Additive schema shared by both editions. */
final class Migration_0013_CsvImport implements Migration {
	/** Migration version. */
	public function version(): int {
		return 13;
	}

	/**
	 * Read the declared result.
	 *
	 * @return list<string> Tables included in uninstall and schema verification. */
	public static function tableSlugs(): array {
		return array( 'aponto_import_sources', 'aponto_import_ids', 'aponto_import_jobs', 'aponto_import_parts', 'aponto_import_state' );
	}

	/**
	 * Portable dbDelta statements.
	 *
	 * @param \wpdb $wpdb Database.
	 * @return list<string> Statements.
	 */
	public function statements( \wpdb $wpdb ): array {
		$prefix  = $wpdb->prefix;
		$collate = $wpdb->get_charset_collate();
		return array(
			"CREATE TABLE {$prefix}aponto_import_state (
				id bigint unsigned NOT NULL,
				privacy_epoch char(36) NOT NULL,
				PRIMARY KEY  (id)
			) ENGINE=InnoDB {$collate};",
			"CREATE TABLE {$prefix}aponto_import_sources (
				id char(36) NOT NULL,
				label varchar(120) NOT NULL,
				created_at datetime NOT NULL,
				PRIMARY KEY  (id)
			) ENGINE=InnoDB {$collate};",
			"CREATE TABLE {$prefix}aponto_import_ids (
				source_id char(36) NOT NULL,
				entity varchar(32) NOT NULL,
				external_hash char(64) NOT NULL,
				target_id bigint unsigned NOT NULL,
				created_at datetime NOT NULL,
				PRIMARY KEY  (source_id,entity,external_hash),
				KEY target (entity,target_id)
			) ENGINE=InnoDB {$collate};",
			"CREATE TABLE {$prefix}aponto_import_parts (
				job_id char(36) NOT NULL,
				part_key varchar(80) NOT NULL,
				payload longtext NOT NULL,
				expires_at datetime NOT NULL,
				PRIMARY KEY  (job_id,part_key),
				KEY expiry (expires_at)
			) ENGINE=InnoDB {$collate};",
			"CREATE TABLE {$prefix}aponto_import_jobs (
				id char(36) NOT NULL,
				owner_id bigint unsigned NOT NULL,
				payload longtext NOT NULL,
				expires_at datetime NOT NULL,
				PRIMARY KEY  (id),
				KEY expiry (expires_at),
				KEY owner (owner_id)
			) ENGINE=InnoDB {$collate};",
		);
	}

	/**
	 * Apply idempotently.
	 *
	 * @param \wpdb $wpdb Database.
	 */
	public function up( \wpdb $wpdb ): void {
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		foreach ( $this->statements( $wpdb ) as $sql ) {
			dbDelta( $sql );
		}
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Bound seed; same row survives idempotent schema repair.
		$wpdb->query( $wpdb->prepare( 'INSERT IGNORE INTO %i (id,privacy_epoch) VALUES (%d,%s)', $wpdb->prefix . 'aponto_import_state', 1, '00000000-0000-0000-0000-000000000000' ) );
	}

	/**
	 * Verify all declared columns and keys.
	 *
	 * @param \wpdb $wpdb Database.
	 */
	public function verify( \wpdb $wpdb ): bool {
		if ( null !== ( new SchemaVerifier( $wpdb ) )->verifyStatements( $this->statements( $wpdb ) ) ) {
			return false;
		}
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Bound seed verification.
		return null !== $wpdb->get_var( $wpdb->prepare( 'SELECT privacy_epoch FROM %i WHERE id = %d', $wpdb->prefix . 'aponto_import_state', 1 ) );
	}
}

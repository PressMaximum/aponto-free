<?php
/**
 * Migration 0009 — payment ledger, webhook event guard, order hold column, payment templates
 * (D-R38).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Database\Migrations;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Database\SchemaVerifier;
use Aponto\Installation\Seeder;

/**
 * The first migration since 0001 that adds SCHEMA rather than copy, and it does three additive
 * things (§5 invariant 4 — additive and idempotent, no down-migration):
 *
 * 1. **`aponto_transactions`** — one row per charge or refund attempt. This is the durable INTENT
 *    written BEFORE the gateway is called, which is what makes a lost response recoverable: without
 *    a row, a request that dies between "create the intent" and "store the reference" leaves money
 *    moving at the gateway and nothing on this side that knows about it.
 * 2. **`aponto_payment_events`** — the webhook replay guard, `UNIQUE (gateway, event_id)`, claimed by
 *    conditional INSERT. Gateways retry aggressively and deliver out of order; the uniqueness is
 *    what makes "apply this event" safe to call twice. The claim is a LEASE, not a permanent mark
 *    (`status = processing` + `claimed_at`): a worker that dies mid-apply would otherwise leave a row
 *    that says "handled" for a payment nothing ever applied, and the gateway's retry would be
 *    answered `200 duplicate` — losing the payment for good.
 * 3. **`aponto_orders.hold_expires_at`** — an additive NULLable column added by a guarded `ALTER`
 *    rather than by re-running the 0001 `CREATE TABLE` through dbDelta, so this migration owns one
 *    statement instead of a duplicate copy of another migration's DDL that could drift from it.
 *
 * Plus the two payment templates, inserted only when missing — the 0007/0008 pattern, read from
 * {@see Seeder::templates()} rather than restated so the seeded and migrated copy cannot diverge.
 * `payment_pending_customer` ships ENABLED (it is the only thing that saves an expiring hold, and it
 * can only ever fire on a site that has switched payments on); `payment_refunded_customer` ships
 * DISABLED, because an upgrade must never start emailing people.
 *
 * Code at version 8 keeps running against a version-9 database: it simply never reads the new
 * tables or the new column. The reverse direction — version-9 code on a version-8 database — is
 * closed by the Kernel's fail-closed schema gate (R2-3), and the payment reads still use
 * `?? null` defaults so a partially migrated site degrades rather than fatals.
 */
final class Migration_0009_Payments implements Migration {

	/**
	 * Table slugs (prefix-less) created by this migration.
	 *
	 * Kept beside 0001's list rather than merged into it: 0001 verifies and repairs itself from its
	 * OWN statements, and adding a slug there that its DDL does not create would make its health
	 * check permanently unrepairable. {@see \Aponto\Database\Migrator::coreTableSlugs()} is the one
	 * place that unions the two for callers who mean "every core table".
	 *
	 * @return list<string>
	 */
	public static function tableSlugs(): array {
		return array(
			'aponto_transactions',
			'aponto_payment_events',
		);
	}

	/**
	 * The two template keys this migration guarantees.
	 *
	 * @var list<string>
	 */
	private const KEYS = array( 'payment_pending_customer', 'payment_refunded_customer' );

	/**
	 * The additive column this migration adds to `aponto_orders`.
	 */
	private const HOLD_COLUMN = 'hold_expires_at';

	/**
	 * Schema version this migration reaches.
	 */
	public function version(): int {
		return 9;
	}

	/**
	 * Create the two tables, add the hold column, seed the two templates. Idempotent throughout.
	 *
	 * @param \wpdb $wpdb Database handle.
	 * @throws \RuntimeException When a read or write fails at the database layer.
	 */
	public function up( \wpdb $wpdb ): void {
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		foreach ( $this->statements( $wpdb ) as $sql ) {
			dbDelta( $sql );
		}

		$this->addHoldColumn( $wpdb );
		$this->seedTemplates( $wpdb );
	}

	/**
	 * The dbDelta-compliant CREATE statements for this migration's tables.
	 *
	 * Public for the same reason 0001's are: `verify()`, the Migrator's health check and its
	 * self-repair path all derive their expectations from ONE source instead of a hand-maintained
	 * second list.
	 *
	 * The composite `UNIQUE KEY gateway_event` is sized deliberately: `varchar(32)` + `varchar(150)`
	 * is 728 bytes under utf8mb4, which stays inside the 767-byte index-prefix limit that older
	 * InnoDB row formats still enforce — the same ceiling the existing `dispatch_key varchar(191)`
	 * unique index sits just under. A wider `event_id` would create a table that installs on the
	 * maintainer's MySQL and fails on a customer's.
	 *
	 * @param \wpdb $wpdb Database handle (for prefix + charset/collate).
	 * @return list<string>
	 */
	public function statements( \wpdb $wpdb ): array {
		$p  = $wpdb->prefix;
		$cc = $wpdb->get_charset_collate();

		$statements = array();

		$statements[] = "CREATE TABLE {$p}aponto_transactions (
	id bigint unsigned NOT NULL AUTO_INCREMENT,
	order_id bigint unsigned NOT NULL,
	booking_id bigint unsigned NULL,
	gateway varchar(32) NOT NULL DEFAULT '',
	kind varchar(20) NOT NULL DEFAULT 'charge',
	status varchar(20) NOT NULL DEFAULT 'pending',
	amount_minor int unsigned NOT NULL DEFAULT 0,
	currency char(3) NOT NULL,
	gateway_ref varchar(191) NOT NULL DEFAULT '',
	payment_ref varchar(191) NOT NULL DEFAULT '',
	parent_id bigint unsigned NULL,
	idempotency_key varchar(191) NOT NULL DEFAULT '',
	failure_code varchar(64) NOT NULL DEFAULT '',
	expires_at datetime NULL,
	meta text NULL,
	created_at datetime NOT NULL,
	updated_at datetime NOT NULL,
	PRIMARY KEY  (id),
	KEY order_id (order_id),
	KEY booking_id (booking_id),
	KEY gateway_ref (gateway, gateway_ref)
) ENGINE=InnoDB {$cc};";

		$statements[] = "CREATE TABLE {$p}aponto_payment_events (
	id bigint unsigned NOT NULL AUTO_INCREMENT,
	gateway varchar(32) NOT NULL DEFAULT '',
	event_id varchar(150) NOT NULL,
	type varchar(64) NOT NULL DEFAULT '',
	order_id bigint unsigned NULL,
	status varchar(20) NOT NULL DEFAULT 'processing',
	claimed_at datetime NULL,
	received_at datetime NOT NULL,
	PRIMARY KEY  (id),
	UNIQUE KEY gateway_event (gateway, event_id),
	KEY received_at (received_at)
) ENGINE=InnoDB {$cc};";

		return $statements;
	}

	/**
	 * Postcondition: both tables exist in the declared shape, the hold column is present, and both
	 * templates exist.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function verify( \wpdb $wpdb ): bool {
		if ( null !== ( new SchemaVerifier( $wpdb ) )->verifyStatements( $this->statements( $wpdb ) ) ) {
			return false;
		}

		try {
			if ( ! $this->hasHoldColumn( $wpdb ) ) {
				return false;
			}
			foreach ( self::KEYS as $key ) {
				if ( ! $this->templateExists( $wpdb, $wpdb->prefix . 'aponto_notifications', $key ) ) {
					return false;
				}
			}
		} catch ( \RuntimeException $failure ) {
			unset( $failure );

			return false;
		}

		return true;
	}

	/**
	 * Add `aponto_orders.hold_expires_at` when it is missing.
	 *
	 * Guarded by a `SHOW COLUMNS` read rather than by `ADD COLUMN IF NOT EXISTS`: the latter is
	 * MySQL-8.0-only syntax and this plugin supports MariaDB and the SQLite drop-in as first-class
	 * engines (D-R20). `SHOW COLUMNS` is what {@see SchemaVerifier} already relies on for both.
	 *
	 * @param \wpdb $wpdb Database handle.
	 * @throws \RuntimeException When the read or the ALTER fails.
	 */
	private function addHoldColumn( \wpdb $wpdb ): void {
		if ( $this->hasHoldColumn( $wpdb ) ) {
			return;
		}

		$table = $wpdb->prefix . 'aponto_orders';
		$wpdb->flush();
		$ddl = "ALTER TABLE {$table} ADD COLUMN " . self::HOLD_COLUMN . ' datetime NULL';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Constant DDL: table from $wpdb->prefix, column name a class constant, no user input; additive and guarded by the existence check above.
		$wpdb->query( $ddl );
		if ( '' !== (string) $wpdb->last_error ) {
			throw new \RuntimeException( esc_html( sprintf( 'Aponto migration 0009: hold column ALTER failed: %s', $wpdb->last_error ) ) );
		}
	}

	/**
	 * Whether `aponto_orders` already carries the hold column.
	 *
	 * @param \wpdb $wpdb Database handle.
	 * @throws \RuntimeException When the column read fails at the database layer.
	 */
	private function hasHoldColumn( \wpdb $wpdb ): bool {
		$table = $wpdb->prefix . 'aponto_orders';
		$wpdb->flush();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Constant table from $wpdb->prefix; schema introspection.
		$rows = $wpdb->get_results( "SHOW COLUMNS FROM {$table}", ARRAY_A );
		if ( '' !== (string) $wpdb->last_error ) {
			throw new \RuntimeException( esc_html( sprintf( 'Aponto migration 0009: column read failed: %s', $wpdb->last_error ) ) );
		}

		foreach ( is_array( $rows ) ? $rows : array() as $row ) {
			if ( self::HOLD_COLUMN === strtolower( (string) ( $row['Field'] ?? '' ) ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Insert the two payment templates when they are missing (0007/0008 pattern).
	 *
	 * @param \wpdb $wpdb Database handle.
	 * @throws \RuntimeException When a read or insert fails at the database layer.
	 */
	private function seedTemplates( \wpdb $wpdb ): void {
		$table = $wpdb->prefix . 'aponto_notifications';

		foreach ( Seeder::templates() as $template ) {
			$key = (string) $template['template_key'];
			if ( ! in_array( $key, self::KEYS, true ) ) {
				continue;
			}
			if ( $this->templateExists( $wpdb, $table, $key ) ) {
				continue;
			}

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- One-time seed insert; the existence guard above proved the key is absent.
			$inserted = $wpdb->insert( $table, $template, array( '%s', '%s', '%s', '%s', '%s', '%d' ) );
			if ( false === $inserted ) {
				throw new \RuntimeException( esc_html( sprintf( 'Aponto migration 0009: insert of %1$s failed: %2$s', $key, $wpdb->last_error ) ) );
			}
		}
	}

	/**
	 * Whether a template key is already present, distinguishing "absent" from a database error.
	 *
	 * @param \wpdb  $wpdb  Database handle.
	 * @param string $table Fully-qualified table name.
	 * @param string $key   Template key.
	 * @throws \RuntimeException When the read fails at the database layer.
	 */
	private function templateExists( \wpdb $wpdb, string $table, string $key ): bool {
		$wpdb->flush();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; key bound via prepare(); existence guard for an idempotent insert.
		$count = $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE template_key = %s", $key ) );
		if ( '' !== (string) $wpdb->last_error ) {
			throw new \RuntimeException( esc_html( sprintf( 'Aponto migration 0009: read failed: %s', $wpdb->last_error ) ) );
		}

		return (int) $count > 0;
	}
}

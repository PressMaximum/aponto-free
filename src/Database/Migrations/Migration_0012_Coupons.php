<?php
/**
 * Migration 0012 — coupon catalog, target maps and immutable order discount snapshots (D-R67).
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

/**
 * Coupons are Premium behaviour but CORE schema: Free and Premium remain drop-in compatible. The
 * catalog row is mutable; each order stores subtotal, discount and coupon identity snapshots so an
 * edit or delete never changes historical money.
 *
 * One migration, not two (D-R67h): no release ever shipped schema 11 or 12, so the pre-merge
 * `aponto_coupon_customers` map and its 0012 email conversion were folded away. Renumbered from
 * 0011 to 0012 when `main` was merged in (2026-09-29): `main` owns 0011
 * ({@see Migration_0011_StaffPublicProfile}), and a coupon DEVELOPMENT site that recorded "11" for
 * this migration reaches the staff-profile columns through the migrator's health repair. The WordPress-user
 * allow-list (`aponto_coupon_users`, D-R67a) is created here directly. In that map `user_id = 0`
 * is the NOBODY sentinel: it never equals a logged-in user id, and a coupon that carries it (and no
 * real user) applies to no one — the fail-closed state a targeted coupon is left in when privacy
 * erasure or user deletion empties its allow-list (D-R67l).
 */
final class Migration_0012_Coupons implements Migration {

	/**
	 * Additive order columns and their portable definitions.
	 *
	 * @var array<string, string>
	 */
	private const ORDER_COLUMNS = array(
		'subtotal_minor'     => 'int unsigned NOT NULL DEFAULT 0',
		'discount_minor'     => 'int unsigned NOT NULL DEFAULT 0',
		'coupon_id'          => 'bigint unsigned NULL',
		'coupon_code'        => "varchar(64) NOT NULL DEFAULT ''",
		// When this order's coupon use was handed back (D-R67d): an expired pay-online hold or an
		// admin hard delete. The stamp is what makes the release idempotent per order.
		'coupon_released_at' => 'datetime NULL',
	);

	/**
	 * Additive idempotency column (D-R67u): sha256 of the EXACT submitted public booking body, the
	 * only key a same-key replay may be resolved on before validation. NULL on rows written before it
	 * existed — those are never replayed early.
	 *
	 * @var array<string, string>
	 */
	private const IDEMPOTENCY_COLUMNS = array(
		'exact_hash' => 'char(64) NULL',
	);

	/**
	 * Return table slugs created here.
	 *
	 * @return list<string> Table slugs.
	 */
	public static function tableSlugs(): array {
		return array( 'aponto_coupons', 'aponto_coupon_services', 'aponto_coupon_users' );
	}

	/** Return the schema version. */
	public function version(): int {
		return 12;
	}

	/**
	 * Apply the additive, idempotent migration.
	 *
	 * @param \wpdb $wpdb WordPress database adapter.
	 * @throws \RuntimeException When schema creation or backfill fails.
	 */
	public function up( \wpdb $wpdb ): void {
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		foreach ( $this->statements( $wpdb ) as $sql ) {
			dbDelta( $sql );
		}

		$this->addColumns( $wpdb, 'aponto_orders', self::ORDER_COLUMNS );
		$this->addColumns( $wpdb, 'aponto_idempotency', self::IDEMPOTENCY_COLUMNS );
		$this->closeLegacyCustomerTargets( $wpdb );
		$this->backfillUsersTargeted( $wpdb );
		$table = $wpdb->prefix . 'aponto_orders';
		$sql   = "UPDATE {$table} SET subtotal_minor = total_minor WHERE subtotal_minor = 0 AND total_minor > 0 AND discount_minor = 0";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Constant table from wpdb prefix; one-time idempotent snapshot backfill; no user input.
		$updated = $wpdb->query( $sql );
		if ( false === $updated ) {
			throw new \RuntimeException( esc_html( sprintf( 'Aponto migration 0012: order backfill failed: %s', $wpdb->last_error ) ) );
		}
	}

	/**
	 * Return coupon table DDL, shared by migrate, verify and self-repair.
	 *
	 * @param \wpdb $wpdb WordPress database adapter.
	 * @return list<string> Schema statements.
	 */
	public function statements( \wpdb $wpdb ): array {
		$p  = $wpdb->prefix;
		$cc = $wpdb->get_charset_collate();

		return array(
			"CREATE TABLE {$p}aponto_coupons (
	id bigint unsigned NOT NULL AUTO_INCREMENT,
	code varchar(64) NOT NULL,
	name varchar(191) NOT NULL DEFAULT '',
	discount_type varchar(16) NOT NULL DEFAULT 'percent',
	percentage_bps int unsigned NOT NULL DEFAULT 0,
	fixed_minor int unsigned NOT NULL DEFAULT 0,
	currency char(3) NOT NULL DEFAULT '',
	usage_limit int unsigned NULL,
	usage_count int unsigned NOT NULL DEFAULT 0,
	starts_on date NULL,
	expires_on date NULL,
	status varchar(16) NOT NULL DEFAULT 'active',
	users_targeted tinyint unsigned NOT NULL DEFAULT 0,
	created_at datetime NOT NULL,
	updated_at datetime NOT NULL,
	PRIMARY KEY  (id),
	UNIQUE KEY code (code),
	KEY status_window (status,starts_on,expires_on)
) ENGINE=InnoDB {$cc};",
			"CREATE TABLE {$p}aponto_coupon_services (
	coupon_id bigint unsigned NOT NULL,
	service_id bigint unsigned NOT NULL,
	PRIMARY KEY  (coupon_id,service_id),
	KEY service_id (service_id)
) ENGINE=InnoDB {$cc};",
			"CREATE TABLE {$p}aponto_coupon_users (
	coupon_id bigint unsigned NOT NULL,
	user_id bigint unsigned NOT NULL,
	PRIMARY KEY  (coupon_id,user_id),
	KEY user_id (user_id)
) ENGINE=InnoDB {$cc};",
		);
	}

	/**
	 * Verify the table and all additive order columns.
	 *
	 * @param \wpdb $wpdb WordPress database adapter.
	 * @return bool Whether the schema is current.
	 */
	public function verify( \wpdb $wpdb ): bool {
		if ( null !== ( new SchemaVerifier( $wpdb ) )->verifyStatements( $this->statements( $wpdb ) ) ) {
			return false;
		}

		try {
			$columns     = $this->columns( $wpdb, 'aponto_orders' );
			$idempotency = $this->columns( $wpdb, 'aponto_idempotency' );
		} catch ( \RuntimeException $failure ) {
			unset( $failure );

			return false;
		}

		if ( array() !== array_diff( array_keys( self::ORDER_COLUMNS ), $columns )
			|| array() !== array_diff( array_keys( self::IDEMPOTENCY_COLUMNS ), $idempotency ) ) {
			return false;
		}

		return $this->dataPostconditionsHold( $wpdb );
	}

	/**
	 * Whether the pre-merge customer map exists (identifies that development shape, D-R67q).
	 *
	 * @param \wpdb $wpdb WordPress database adapter.
	 */
	public static function legacyTablePresent( \wpdb $wpdb ): bool {
		$legacy = $wpdb->prefix . 'aponto_coupon_customers';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Schema introspection.
		return $legacy === $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $legacy ) ) );
	}

	/**
	 * The DATA half of this migration's postcondition (D-R67q/D-R67s): every coupon with a user-map
	 * row is flagged `users_targeted`, and every coupon listed in the pre-merge customer map has a
	 * user-map row (at least the NOBODY sentinel). Unreadable counts fail the check.
	 *
	 * @param \wpdb $wpdb WordPress database adapter.
	 */
	private function dataPostconditionsHold( \wpdb $wpdb ): bool {
		$coupons = $wpdb->prefix . 'aponto_coupons';
		$users   = $wpdb->prefix . 'aponto_coupon_users';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Constant tables.
		$unflagged = $wpdb->get_var( "SELECT COUNT(*) FROM {$coupons} c WHERE c.users_targeted = 0 AND EXISTS (SELECT 1 FROM {$users} u WHERE u.coupon_id = c.id)" );
		if ( null === $unflagged || (int) $unflagged > 0 ) {
			return false;
		}
		if ( ! self::legacyTablePresent( $wpdb ) ) {
			return true;
		}
		$legacy = $wpdb->prefix . 'aponto_coupon_customers';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Constant tables.
		$open = $wpdb->get_var( "SELECT COUNT(*) FROM {$legacy} l WHERE NOT EXISTS (SELECT 1 FROM {$users} u WHERE u.coupon_id = l.coupon_id)" );

		return null !== $open && 0 === (int) $open;
	}

	/**
	 * Derive `users_targeted` for rows written before the flag existed (D-R67l): any coupon with a
	 * user-map row is person-targeted. Idempotent (only flips 0 → 1).
	 *
	 * @param \wpdb $wpdb WordPress database adapter.
	 * @throws \RuntimeException When the backfill fails.
	 */
	private function backfillUsersTargeted( \wpdb $wpdb ): void {
		$coupons = $wpdb->prefix . 'aponto_coupons';
		$users   = $wpdb->prefix . 'aponto_coupon_users';
		$sql     = "UPDATE {$coupons} SET users_targeted = 1 WHERE users_targeted = 0 AND EXISTS (SELECT 1 FROM {$users} u WHERE u.coupon_id = {$coupons}.id)";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Constant tables; no input.
		if ( false === $wpdb->query( $sql ) ) {
			throw new \RuntimeException( esc_html( sprintf( 'Aponto migration 0012: users_targeted backfill failed: %s', $wpdb->last_error ) ) );
		}
	}

	/**
	 * Keep a pre-merge customer-targeted coupon CLOSED (D-R67q).
	 *
	 * The pre-merge branch's first schema 11 stored person targets in `aponto_coupon_customers`,
	 * which this code no longer reads. A coupon listed there with no row in `aponto_coupon_users`
	 * would read as "every user" — a restricted development coupon silently opened to everyone. It
	 * gets the `user_id = 0` NOBODY sentinel instead (D-R67l); an operator re-targets it deliberately.
	 * The legacy table itself is left in place (harmless, never read; its data is not ours to drop).
	 * Idempotent: a coupon that already has any user row is skipped.
	 *
	 * @param \wpdb $wpdb WordPress database adapter.
	 * @throws \RuntimeException When the sentinel write fails.
	 */
	private function closeLegacyCustomerTargets( \wpdb $wpdb ): void {
		if ( ! self::legacyTablePresent( $wpdb ) ) {
			return;
		}
		$legacy = $wpdb->prefix . 'aponto_coupon_customers';
		$users  = $wpdb->prefix . 'aponto_coupon_users';
		$sql    = "INSERT INTO {$users} (coupon_id, user_id)
			SELECT DISTINCT l.coupon_id, 0 FROM {$legacy} l
			WHERE NOT EXISTS (SELECT 1 FROM {$users} u WHERE u.coupon_id = l.coupon_id)";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Constant tables; no input.
		if ( false === $wpdb->query( $sql ) ) {
			throw new \RuntimeException( esc_html( sprintf( 'Aponto migration 0012: legacy coupon target closure failed: %s', $wpdb->last_error ) ) );
		}
	}

	/**
	 * Add each missing column with a MySQL-5.7/SQLite-compatible ALTER.
	 *
	 * @param \wpdb                 $wpdb    WordPress database adapter.
	 * @param string                $slug    Table slug.
	 * @param array<string, string> $columns Column => definition.
	 * @throws \RuntimeException When an ALTER fails.
	 */
	private function addColumns( \wpdb $wpdb, string $slug, array $columns ): void {
		$existing = $this->columns( $wpdb, $slug );
		$table    = $wpdb->prefix . $slug;
		foreach ( $columns as $column => $definition ) {
			if ( in_array( $column, $existing, true ) ) {
				continue;
			}
			$ddl = "ALTER TABLE {$table} ADD COLUMN {$column} {$definition}";
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Constants + wpdb prefix only; guarded additive DDL.
			$wpdb->query( $ddl );
			if ( '' !== (string) $wpdb->last_error ) {
				throw new \RuntimeException( esc_html( sprintf( 'Aponto migration 0012: %1$s ALTER failed: %2$s', $column, $wpdb->last_error ) ) );
			}
		}
	}

	/**
	 * Return current column names of a core table.
	 *
	 * @param \wpdb  $wpdb WordPress database adapter.
	 * @param string $slug Table slug.
	 * @return list<string> Current column names.
	 * @throws \RuntimeException When schema introspection fails.
	 */
	private function columns( \wpdb $wpdb, string $slug ): array {
		$table = $wpdb->prefix . $slug;
		$wpdb->flush();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Constant table from wpdb prefix; schema introspection.
		$rows = $wpdb->get_results( "SHOW COLUMNS FROM {$table}", ARRAY_A );
		if ( '' !== (string) $wpdb->last_error ) {
			throw new \RuntimeException( esc_html( sprintf( 'Aponto migration 0012: column read failed: %s', $wpdb->last_error ) ) );
		}

		return array_values( array_map( static fn ( array $row ): string => strtolower( (string) ( $row['Field'] ?? '' ) ), is_array( $rows ) ? $rows : array() ) );
	}
}

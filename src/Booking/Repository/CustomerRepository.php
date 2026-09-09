<?php
/**
 * Customer find-or-create with race handling (§4.5).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Booking\Repository;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Booking\CustomerInput;
use Aponto\Database\StorageException;
use Aponto\Support\Clock;
use Aponto\Support\DatabaseEngine;

/**
 * Find-or-create by normalised email, INSIDE the reservation transaction (§4.5), race-safe against
 * concurrent reservations for the same new email (acceptance #19).
 *
 * Uses a single atomic upsert keyed on the `email_norm` UNIQUE index:
 *
 *   INSERT ... ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), name = VALUES(name), ...
 *
 * `LAST_INSERT_ID(id)` makes `$wpdb->insert_id` return the id of the row that was inserted OR the
 * pre-existing row, and the update branch refreshes name/email/phone to the latest booking (§4.5).
 *
 * Fail-closed ordering (review E2):
 *   1. `query()` returning FALSE throws immediately with a SNAPSHOT of `$wpdb->last_error` — the
 *      fallback SELECT must never run first, because it would clear the error and break the
 *      deadlock classification in the reserve() retry loop.
 *   2. The read-back SELECT runs ONLY after a SUCCESSFUL upsert whose UPDATE branch was a no-op
 *      (identical values leave `insert_id` at 0). The upsert already took an X-lock on the row,
 *      and the reserve transaction runs READ COMMITTED, so the read sees the committed row.
 *
 * SQLite (D-R20, founder 2026-07-21): `ON DUPLICATE KEY UPDATE … VALUES(col)` is translated by the
 * drop-in, but `LAST_INSERT_ID(id)` is not a SQLite function and the statement fails outright. The
 * SQLite variant therefore omits that assignment and ALWAYS resolves the id through the read-back
 * by unique key, instead of trusting `insert_id` — SQLite's `last_insert_rowid()` is only defined
 * after a real INSERT, so on the UPDATE branch it would return a stale value from an earlier
 * statement in the same request. The read-back is exact on both branches, and the reserve
 * transaction holds the single SQLite write lock, so nothing can change the row underneath it.
 */
final class CustomerRepository {

	/**
	 * Construct the repository.
	 *
	 * @param \wpdb $wpdb  Database handle.
	 * @param Clock $clock Clock.
	 */
	public function __construct(
		private \wpdb $wpdb,
		private Clock $clock
	) {}

	/**
	 * A customer's stored name, or '' when the row is gone or already anonymized.
	 *
	 * Deliberately the ONLY customer field this reader exposes: a caller that needs to LABEL a
	 * booking (a remote calendar event, a staff-facing artifact) needs a name and must not be handed
	 * an email or a phone number it might then leak into a third-party system.
	 *
	 * @param int $customer_id Customer id.
	 */
	public function nameOf( int $customer_id ): string {
		$table = $this->wpdb->prefix . 'aponto_customers';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; the id is bound via prepare().
		$name = $this->wpdb->get_var( $this->wpdb->prepare( "SELECT name FROM {$table} WHERE id = %d", $customer_id ) );

		return null === $name ? '' : (string) $name;
	}

	/**
	 * Find (refreshing name/email/phone) or create a customer by normalised email; returns its id.
	 *
	 * @param CustomerInput $customer Customer input.
	 * @throws StorageException When the upsert fails (snapshot classified by the retry loop) or
	 *                          the read-back after a no-op upsert finds no row.
	 */
	public function findOrCreateByEmail( CustomerInput $customer ): int {
		$table     = $this->wpdb->prefix . 'aponto_customers';
		$is_sqlite = DatabaseEngine::isSqlite( $this->wpdb );

		$sql = "INSERT INTO {$table} ( name, email, email_norm, phone, note, created_at )
			VALUES ( %s, %s, %s, %s, '', %s )
			ON DUPLICATE KEY UPDATE
				id = LAST_INSERT_ID( id ),
				name = VALUES( name ),
				email = VALUES( email ),
				phone = VALUES( phone )";

		if ( $is_sqlite ) {
			$sql = "INSERT INTO {$table} ( name, email, email_norm, phone, note, created_at )
				VALUES ( %s, %s, %s, %s, '', %s )
				ON DUPLICATE KEY UPDATE
					name = VALUES( name ),
					email = VALUES( email ),
					phone = VALUES( phone )";
		}

		// Suppress the error DISPLAY only (a concurrent same-key upsert may deadlock — an expected
		// restart-transaction condition); `last_error` is still populated for the snapshot.
		$suppressed = $this->wpdb->suppress_errors( true );
		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter -- SQL table name is from $wpdb->prefix and every value is passed to wpdb::prepare.
		$result = $this->wpdb->query(
			// phpcs:disable WordPress.DB.PreparedSQL.NotPrepared -- Values are passed to wpdb::prepare; sniff cannot recognize the injected wpdb property.
			$this->wpdb->prepare(
				$sql,
				$customer->name,
				$customer->email,
				$customer->emailNorm(),
				$customer->phone,
				$this->clock->nowSql()
			)
			// phpcs:enable WordPress.DB.PreparedSQL.NotPrepared
		);
		$this->wpdb->suppress_errors( $suppressed );

		if ( false === $result ) {
			// E2: snapshot NOW — no other query may run before this throw.
				throw StorageException::fromSqlError( esc_html( 'customer upsert' ), esc_html( (string) $this->wpdb->last_error ) );
		}

		if ( ! $is_sqlite ) {
			$id = (int) $this->wpdb->insert_id;
			if ( $id > 0 ) {
				return $id;
			}
		}

		// Successful upsert with a no-op UPDATE branch: read our own row back by its unique key.
		// On SQLite this is the ONLY id resolution (see the class docblock).
		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter -- table name from $wpdb->prefix, not user input.
		$id = (int) $this->wpdb->get_var(
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- table name from $wpdb->prefix, not user input; value is passed to wpdb::prepare.
			$this->wpdb->prepare( "SELECT id FROM {$table} WHERE email_norm = %s", $customer->emailNorm() )
		);
		if ( $id > 0 ) {
			return $id;
		}

		throw StorageException::because( esc_html( 'customer upsert read-back found no row' ) );
	}
}

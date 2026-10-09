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
use Aponto\Booking\Exception\CustomerErased;
use Aponto\Database\StorageException;
use Aponto\Privacy\Anonymizer;
use Aponto\Support\Clock;
use Aponto\Support\DatabaseEngine;
use Aponto\Support\PersonName;

/**
 * Find-or-create by normalised email, INSIDE the reservation transaction (§4.5), race-safe against
 * concurrent reservations for the same new email (acceptance #19).
 *
 * Uses a single atomic upsert keyed on the `email_norm` UNIQUE index:
 *
 *   INSERT ... ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), first_name = CASE WHEN ..., ...
 *
 * `LAST_INSERT_ID(id)` makes `$wpdb->insert_id` return the id of the row that was inserted OR the
 * pre-existing row. The name is stored split (name split N1, D-R69).
 *
 * THE STORED NAME WINS (D-R73, founder 2026-10-02 — supersedes §4.5 "latest booking wins"). The
 * email is the identity; the name typed into a booking form is not. Refreshing the name from every
 * booking let anyone who knows a customer's email rename that customer everywhere — every earlier
 * booking, every later mail — by booking once under another name, and an input with an empty
 * `last_name` blanked the stored one. So the update branch:
 *
 *   - never changes a stored non-empty `first_name` / `last_name`;
 *   - FILLS a part that is empty in storage when the input provides it (a customer created with
 *     only a first name gains the family name);
 *   - never blanks `phone` (an empty input keeps the stored number). A non-empty input still
 *     replaces a different stored number — unchanged from §4.5, and a product question of its own;
 *   - still refreshes the display `email` (same `email_norm`, so only its letter case can differ).
 *
 * The rule is written as bound-value `CASE WHEN` on the row's own columns, not `IF()` and not
 * `VALUES(col)` inside an expression, so both engines run the SAME assignments (D-R54).
 * {@see self::storedParts()} is the PHP mirror the transaction-local mutation row is built from.
 * An operator renames a customer through the admin customer editor, which does not come here.
 *
 * Fail-closed ordering (review E2):
 *   1. `query()` returning FALSE throws immediately with a SNAPSHOT of `$wpdb->last_error` — the
 *      fallback SELECT must never run first, because it would clear the error and break the
 *      deadlock classification in the reserve() retry loop.
 *   2. The read-back SELECT runs ONLY after a SUCCESSFUL upsert whose UPDATE branch was a no-op
 *      (identical values leave `insert_id` at 0). The upsert already took an X-lock on the row,
 *      and the reserve transaction runs READ COMMITTED, so the read sees the committed row.
 *
 * SQLite (D-R20, founder 2026-07-21): `ON DUPLICATE KEY UPDATE` is translated by the drop-in, but `LAST_INSERT_ID(id)` is not a SQLite function and the statement fails outright. The
 * SQLite variant therefore omits that assignment and ALWAYS resolves the id through the read-back
 * by unique key, instead of trusting `insert_id` — SQLite's `last_insert_rowid()` is only defined
 * after a real INSERT, so on the UPDATE branch it would return a stale value from an earlier
 * statement in the same request. The read-back is exact on both branches, and the reserve
 * transaction holds the single SQLite write lock, so nothing can change the row underneath it.
 */
final class CustomerRepository {

	/**
	 * Latest transaction-local mutation, never dispatched here.
	 *
	 * @var array<string, mixed>|null
	 */
	private ?array $source_mutation = null;

	/**
	 * Read only after the enclosing reservation committed successfully.
	 *
	 * @return array<string, mixed>|null
	 */
	public function sourceMutation(): ?array {
		return $this->source_mutation;
	}

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
	 * The WordPress account an operator explicitly LINKED to the customer with this email, or 0.
	 *
	 * The admin booking paths evaluate WordPress-user coupon targeting against this link, because the
	 * logged-in identity there is the operator's (D-R67b/D-R67e). It is never a WordPress account
	 * looked up by email: `wp_user_id` is set only through the admin customer editor.
	 *
	 * @param string $email Customer email (normalized here).
	 */
	public function linkedWpUserIdForEmail( string $email ): int {
		$email_norm = strtolower( trim( $email ) );
		if ( '' === $email_norm ) {
			return 0;
		}
		$table = $this->wpdb->prefix . 'aponto_customers';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; email bound.
		return (int) $this->wpdb->get_var( $this->wpdb->prepare( "SELECT COALESCE(wp_user_id, 0) FROM {$table} WHERE email_norm = %s", $email_norm ) );
	}

	/**
	 * Link an authenticated checkout's WordPress account to a customer that has no link (D-R71d).
	 *
	 * The second, narrow way `wp_user_id` is set besides the admin editor: an external checkout
	 * placed by a logged-in account whose OWN email is this customer's email. A billing email typed
	 * at checkout is not enough on its own, and an existing link (operator-made or earlier) is never
	 * replaced, so WordPress-user coupon targeting keeps following a proven identity.
	 *
	 * @param int $customer_id Customer id.
	 * @param int $user_id     WordPress user who placed the external order.
	 * @return bool Whether the link was written.
	 * @throws StorageException When the write fails.
	 */
	public function linkWpUserByOwnEmail( int $customer_id, int $user_id ): bool {
		$user = $customer_id > 0 && $user_id > 0 ? get_userdata( $user_id ) : false;
		if ( ! $user instanceof \WP_User ) {
			return false;
		}
		$email_norm = strtolower( trim( (string) $user->user_email ) );
		if ( '' === $email_norm ) {
			return false;
		}
		$table = $this->wpdb->prefix . 'aponto_customers';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		$result = $this->wpdb->query( $this->wpdb->prepare( "UPDATE {$table} SET wp_user_id = %d WHERE id = %d AND wp_user_id IS NULL AND email_norm = %s", $user_id, $customer_id, $email_norm ) );
		if ( false === $result ) {
			// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Stable PII-free message; the raw SQL error travels in a property, never in the message (phpcs.xml.dist rationale; Plugin Check runs its own ruleset).
			throw StorageException::fromWpdb( $this->wpdb, 'customer wp user link' );
		}
		return 1 === (int) $result;
	}

	/**
	 * The WordPress account an operator linked to a customer id, or 0 (see above).
	 *
	 * @param int $customer_id Customer id.
	 */
	public function linkedWpUserId( int $customer_id ): int {
		$table = $this->wpdb->prefix . 'aponto_customers';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; id bound.
		return (int) $this->wpdb->get_var( $this->wpdb->prepare( "SELECT COALESCE(wp_user_id, 0) FROM {$table} WHERE id = %d", $customer_id ) );
	}

	/**
	 * A customer's stored name PARTS, both '' when the row is gone.
	 *
	 * Deliberately the ONLY customer fields this reader exposes: a caller that needs to LABEL a
	 * booking (a remote calendar event, a staff-facing artifact) needs a name and must not be handed
	 * an email or a phone number it might then leak into a third-party system. The calendar drivers
	 * put the real `first_name` in an event title (name split, D-R69) — no more guessing the first
	 * token of a full name.
	 *
	 * @param int $customer_id Customer id.
	 * @return array{first_name: string, last_name: string}
	 */
	public function namePartsOf( int $customer_id ): array {
		$table = $this->wpdb->prefix . 'aponto_customers';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; the id is bound via prepare().
		$row = $this->wpdb->get_row( $this->wpdb->prepare( "SELECT first_name, last_name FROM {$table} WHERE id = %d", $customer_id ), ARRAY_A );

		return array(
			'first_name' => is_array( $row ) ? (string) $row['first_name'] : '',
			'last_name'  => is_array( $row ) ? (string) $row['last_name'] : '',
		);
	}

	/**
	 * `email_norm` prefix of a customer stored WITHOUT an email (D-R77).
	 *
	 * `email_norm` is `NOT NULL` + UNIQUE, so "no email" cannot be `''` twice. Such a row keeps
	 * `email = ''` (what every reader and DTO shows) and takes a random, per-row `email_norm` under
	 * this prefix. It contains no `@`, so it can never equal a real normalised email — the privacy
	 * exporter, the duplicate check and the booking upsert, which all look a customer up by a real
	 * address, cannot land on it — and it deliberately does NOT look like the anonymizer's
	 * `anon-{id}@invalid`, so the retention sweep still anonymizes these rows like any other.
	 */
	public const NO_EMAIL_PREFIX = 'noemail:';

	/**
	 * The customer row a booking is written against (D-R77), inside the reservation transaction.
	 *
	 * - `id > 0` (the operator picked an existing customer): that row, AS STORED — locked, never
	 *   upserted, so picking a customer cannot rename them or change their phone. An ANONYMIZED row
	 *   is refused ({@see CustomerErased}, Codex review 2026-10-06): the check runs under the row
	 *   lock the anonymizer also takes, so an erasure cannot slip in between;
	 * - no email (an admin walk-in): always a NEW row, because without an email there is no
	 *   identity to deduplicate on — a name is not one;
	 * - otherwise the email upsert, unchanged ({@see self::findOrCreateByEmail()}).
	 *
	 * @param CustomerInput $customer Customer input.
	 * @throws StorageException When a write fails or the picked row no longer exists.
	 * @throws CustomerErased   When the picked row is an anonymized record.
	 */
	public function resolve( CustomerInput $customer ): int {
		if ( $customer->id > 0 ) {
			$this->source_mutation = null;
			$table                 = $this->wpdb->prefix . 'aponto_customers';
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Bound identity (%i) and id; transaction-local lock of the picked row.
			$email_norm = $this->wpdb->get_var( $this->wpdb->prepare( 'SELECT email_norm FROM %i WHERE id = %d FOR UPDATE', $table, $customer->id ) );
			if ( null === $email_norm ) {
				throw StorageException::because( esc_html( 'picked customer row not found' ) );
			}
			if ( Anonymizer::isAnonymized( $customer->id, (string) $email_norm ) ) {
				throw new CustomerErased();
			}

			return $customer->id;
		}

		return '' === $customer->emailNorm() ? $this->createWithoutEmail( $customer ) : $this->findOrCreateByEmail( $customer );
	}

	/**
	 * Insert a customer that has no email (D-R77): `email = ''`, a unique {@see self::NO_EMAIL_PREFIX}
	 * key in `email_norm`. A plain INSERT on both engines — nothing to collide with, nothing to read back.
	 *
	 * @param CustomerInput $customer Customer input (its email is empty).
	 * @throws StorageException When the insert fails.
	 */
	private function createWithoutEmail( CustomerInput $customer ): int {
		$this->source_mutation = null;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Reservation-transaction insert; every value is bound by wpdb::insert.
		$result = $this->wpdb->insert(
			$this->wpdb->prefix . 'aponto_customers',
			array(
				'first_name' => $customer->first_name,
				'last_name'  => $customer->last_name,
				'email'      => '',
				'email_norm' => self::NO_EMAIL_PREFIX . bin2hex( random_bytes( 16 ) ),
				'phone'      => $customer->phone,
				'note'       => '',
				'created_at' => $this->clock->nowSql(),
			),
			array( '%s', '%s', '%s', '%s', '%s', '%s', '%s' )
		);
		$id     = (int) $this->wpdb->insert_id;
		if ( false === $result || $id < 1 ) {
			// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Stable PII-free message; the raw SQL error travels in a property, never in the message (phpcs.xml.dist rationale; Plugin Check runs its own ruleset).
			throw StorageException::fromWpdb( $this->wpdb, esc_html( 'customer insert' ) );
		}
		$this->recordSourceMutation( $id, $customer, null, true );

		return $id;
	}

	/**
	 * Find or create a customer by normalised email; returns its id. An EXISTING customer keeps its
	 * stored name and phone — only empty parts are filled (D-R73, see the class docblock).
	 *
	 * @param CustomerInput $customer Customer input.
	 * @throws StorageException When the upsert fails (snapshot classified by the retry loop) or
	 *                          the read-back after a no-op upsert finds no row.
	 */
	public function findOrCreateByEmail( CustomerInput $customer ): int {
		$table                 = $this->wpdb->prefix . 'aponto_customers';
		$is_sqlite             = DatabaseEngine::isSqlite( $this->wpdb );
		$this->source_mutation = null;
		// SQLite BEGIN IMMEDIATE already serializes writers; MySQL locks an existing identity.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Bound identity (%i) and transaction-local pre-image; Plugin Check's ruleset does not see `$this->wpdb->prepare()` as prepared (repo convention).
		$before = $this->wpdb->get_row( $this->wpdb->prepare( 'SELECT id, first_name, last_name, email, phone, created_at FROM %i WHERE email_norm = %s FOR UPDATE', $table, $customer->emailNorm() ), ARRAY_A );
		if ( '' !== $this->wpdb->last_error ) {
			// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Stable PII-free message; the raw SQL error travels in a property, never in the message (phpcs.xml.dist rationale; Plugin Check runs its own ruleset).
			throw StorageException::fromWpdb( $this->wpdb, 'customer pre-image' );
		}

		// D-R73: bound-value `CASE WHEN` on the row's OWN columns. Each assignment reads only the
		// column it writes, so MySQL's left-to-right multi-assignment order is irrelevant here, and
		// SQLite needs no `VALUES()`/`excluded.` translation inside an expression (D-R54).
		$assignments = "first_name = CASE WHEN first_name = '' THEN %s ELSE first_name END,
				last_name = CASE WHEN last_name = '' THEN %s ELSE last_name END,
				email = %s,
				phone = CASE WHEN %s = '' THEN phone ELSE %s END";

		// SQLite has no `LAST_INSERT_ID( expr )`; its id is resolved by the read-back below.
		$id_assignment = $is_sqlite ? '' : 'id = LAST_INSERT_ID( id ),';

		$sql = "INSERT INTO {$table} ( first_name, last_name, email, email_norm, phone, note, created_at )
			VALUES ( %s, %s, %s, %s, %s, '', %s )
			ON DUPLICATE KEY UPDATE
				{$id_assignment}
				{$assignments}";

		// Suppress the error DISPLAY only (a concurrent same-key upsert may deadlock — an expected
		// restart-transaction condition); `last_error` is still populated for the snapshot.
		$suppressed = $this->wpdb->suppress_errors( true );
		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter -- SQL table name is from $wpdb->prefix and every value is passed to wpdb::prepare.
		$result = $this->wpdb->query(
			// phpcs:disable WordPress.DB.PreparedSQL.NotPrepared -- Values are passed to wpdb::prepare; sniff cannot recognize the injected wpdb property.
			$this->wpdb->prepare(
				$sql,
				$customer->first_name,
				$customer->last_name,
				$customer->email,
				$customer->emailNorm(),
				$customer->phone,
				$this->clock->nowSql(),
				$customer->first_name,
				$customer->last_name,
				$customer->email,
				$customer->phone,
				$customer->phone
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
				$created = 1 === $result && ! is_array( $before );
				$this->recordSourceMutation( $id, $customer, $created ? null : $this->preImage( $id, $before ), $created );
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
			$created = $is_sqlite && ! is_array( $before );
			$this->recordSourceMutation( $id, $customer, $created ? null : $this->preImage( $id, $before ), $created );
			return $id;
		}

		throw StorageException::because( esc_html( 'customer upsert read-back found no row' ) );
	}

	/**
	 * The row the UPDATE branch started from.
	 *
	 * Normally the locked pre-image read at the top of the upsert. It is null on the UPDATE branch
	 * only when a concurrent reservation inserted the same new email between that read and the
	 * upsert (acceptance #19); the upsert then waited for that insert and kept ITS name (D-R73), so
	 * the committed row — which this statement's own row lock now covers — is the honest answer.
	 *
	 * @param int                       $id     Customer id.
	 * @param array<string, mixed>|null $before Locked pre-image, or null.
	 * @return array<string, mixed>|null
	 */
	private function preImage( int $id, ?array $before ): ?array {
		if ( is_array( $before ) ) {
			return $before;
		}

		$table = $this->wpdb->prefix . 'aponto_customers';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Bound identity (%i) and id; transaction-local read of the row this upsert just locked.
		$row = $this->wpdb->get_row( $this->wpdb->prepare( 'SELECT id, first_name, last_name, email, phone, created_at FROM %i WHERE id = %d', $table, $id ), ARRAY_A );

		return is_array( $row ) ? $row : null;
	}

	/**
	 * What the upsert leaves in storage for an EXISTING customer — the PHP mirror of the `CASE WHEN`
	 * assignments in {@see self::findOrCreateByEmail()} (D-R73). Keep the two in step.
	 *
	 * @param CustomerInput             $customer Input.
	 * @param array<string, mixed>|null $before   Stored row before the upsert; null on a real insert.
	 * @return array{first_name: string, last_name: string, email: string, phone: string}
	 */
	public static function storedParts( CustomerInput $customer, ?array $before ): array {
		if ( null === $before ) {
			return array(
				'first_name' => $customer->first_name,
				'last_name'  => $customer->last_name,
				'email'      => $customer->email,
				'phone'      => $customer->phone,
			);
		}

		$first = (string) ( $before['first_name'] ?? '' );
		$last  = (string) ( $before['last_name'] ?? '' );

		return array(
			'first_name' => '' === $first ? $customer->first_name : $first,
			'last_name'  => '' === $last ? $customer->last_name : $last,
			'email'      => $customer->email,
			'phone'      => '' === $customer->phone ? (string) ( $before['phone'] ?? '' ) : $customer->phone,
		);
	}

	/**
	 * Capture transaction-local data; never execute external callbacks under the lock.
	 *
	 * @param int                       $id Customer id.
	 * @param CustomerInput             $customer Input.
	 * @param array<string, mixed>|null $before Previous row.
	 * @param bool                      $created Insert branch evidence.
	 */
	private function recordSourceMutation( int $id, CustomerInput $customer, ?array $before, bool $created ): void {
		// Hook rows carry the STORED parts — what the upsert left in the row, which for an existing
		// customer is not what the form sent (D-R73) — AND the composed display `name` (name split N2).
		$row      = PersonName::withDisplayName( array( 'id' => $id ) + self::storedParts( $customer, $created ? null : $before ) );
		$previous = null === $before ? array() : PersonName::withDisplayName( $before );
		// Compared in the row's OWN key order: `===` on arrays is order-sensitive.
		$old = array();
		foreach ( array_keys( $row ) as $key ) {
			if ( array_key_exists( $key, $previous ) ) {
				$old[ $key ] = $previous[ $key ];
			}
		}
		if ( ! $created && array_map( 'strval', $old ) === array_map( 'strval', $row ) ) {
			return;
		}
		$this->source_mutation = array(
			'type'   => $created ? 'created' : 'updated',
			'row'    => $row,
			'before' => $previous,
		);
	}
}

<?php
/**
 * Booking metadata reader/writer.
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

use Aponto\Booking\CustomFieldDefinition;
use Aponto\Booking\CustomFieldSchema;
use Aponto\Database\StorageException;

/**
 * Reads and writes `aponto_booking_meta`. Three kinds of access live here:
 *
 * - the typed core use — the staff-only per-booking internal note;
 * - the customer's answers to the site's extra booking-form fields (`custom_fields.{slug}`, D-R30),
 *   which share the internal note's delete-on-empty rule: a blank answer stores no row rather than
 *   an empty one, so "unanswered" has exactly one representation. The business map's "per-booking
 *   meta — schema unchanged" holds: custom fields add rows, never columns;
 * - GENERIC key helpers ({@see self::claimKey()}, {@see self::deleteByKeyPrefix()}) for namespaced
 *   metadata owned by a module (extension-surface §3.5 puts namespaced meta cleanup on repositories,
 *   not on raw module SQL). They take the key as data and know nothing about any module.
 */
final class BookingMetaRepository {

	/**
	 * Internal note metadata key.
	 */
	private const INTERNAL_NOTE = 'internal_note';

	/**
	 * Construct the repository.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct( private \wpdb $wpdb ) {}

	/**
	 * Read the internal note (empty when unset).
	 *
	 * @param int $booking_id Booking id.
	 */
	public function internalNote( int $booking_id ): string {
		$table = $this->wpdb->prefix . 'aponto_booking_meta';
		$sql   = "SELECT meta_value FROM {$table} WHERE booking_id = %d AND meta_key = %s LIMIT 1";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		$value = $this->wpdb->get_var( $this->wpdb->prepare( $sql, $booking_id, self::INTERNAL_NOTE ) );

		return null === $value ? '' : (string) $value;
	}

	/**
	 * Upsert the internal note, deleting its row when the sanitized value is empty.
	 *
	 * @param int    $booking_id Booking id.
	 * @param string $note       Sanitized internal note.
	 * @throws StorageException When the write fails.
	 */
	public function setInternalNote( int $booking_id, string $note ): void {
		$table = $this->wpdb->prefix . 'aponto_booking_meta';
		if ( '' === $note ) {
			$result = $this->wpdb->delete(
				$table,
				array(
					'booking_id' => $booking_id,
					'meta_key'   => self::INTERNAL_NOTE,
				),
				array( '%d', '%s' )
			);
			if ( false === $result ) {
				throw StorageException::fromSqlError( esc_html( 'booking internal note delete' ), esc_html( (string) $this->wpdb->last_error ) );
			}

			return;
		}

		$sql = "INSERT INTO {$table} (booking_id, meta_key, meta_value) VALUES (%d, %s, %s)
			ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		$result = $this->wpdb->query( $this->wpdb->prepare( $sql, $booking_id, self::INTERNAL_NOTE, $note ) );
		if ( false === $result ) {
			throw StorageException::fromSqlError( esc_html( 'booking internal note upsert' ), esc_html( (string) $this->wpdb->last_error ) );
		}
	}

	/**
	 * CLAIM a metadata key for a booking AT a particular value, atomically.
	 *
	 * Returns true only for the caller that establishes `(booking_id, meta_key) => value` — either by
	 * inserting the row, or by moving an existing row from a DIFFERENT value to this one. Every other
	 * caller, concurrent or later, gets false while the stored value already equals `$value`.
	 *
	 * Two single statements, each atomic on both supported engines (D-R20), with no lock and no
	 * read-then-write race:
	 *
	 *   1. INSERT — the table's `UNIQUE KEY (booking_id, meta_key)` means exactly one caller can win
	 *      it. This is the same "claim by unique insert" primitive the deliveries ledger uses
	 *      ({@see \Aponto\Notification\DeliveryRepository::claim()}).
	 *   2. on duplicate, a CONDITIONAL UPDATE whose `WHERE` excludes the value being claimed. The
	 *      database reports one affected row to exactly one caller; a racer arriving after it finds
	 *      the value already equal and matches nothing.
	 *
	 * The re-claimable half is what makes a value-anchored claim useful: a caller can store the fact
	 * a thing was handled FOR a particular state (an appointment's start, say) and be allowed to act
	 * again — exactly once — when that state changes, without ever being allowed to act twice for the
	 * same one. A key-only claim cannot express that, and a read-compare-write would race.
	 *
	 * Returns false rather than throwing: "someone already handled this" is a normal answer here, not
	 * a storage failure, and the caller's correct response to both is the same — skip silently.
	 *
	 * @param int    $booking_id Booking id.
	 * @param string $meta_key   Fully-qualified metadata key (module-namespaced).
	 * @param string $value      The value being claimed.
	 * @return bool Whether THIS caller won the claim.
	 * @throws StorageException When the write fails for a reason other than the unique constraint.
	 */
	public function claimKey( int $booking_id, string $meta_key, string $value = '' ): bool {
		$table = $this->wpdb->prefix . 'aponto_booking_meta';

		$suppressed = $this->wpdb->suppress_errors( true );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Atomic unique claim; a duplicate-key failure is the expected "already claimed" answer, handled below.
		$inserted = $this->wpdb->insert(
			$table,
			array(
				'booking_id' => $booking_id,
				'meta_key'   => $meta_key,
				'meta_value' => $value,
			),
			array( '%d', '%s', '%s' )
		);
		$error    = (string) $this->wpdb->last_error;
		$this->wpdb->suppress_errors( $suppressed );

		if ( false !== $inserted ) {
			return true;
		}

		// A FAILED INSERT IS NOT AUTOMATICALLY "ALREADY CLAIMED" (Codex round 3, P1 #9). Only a
		// duplicate-key error means that; a dead connection, a missing table or a full disk also
		// return false, and reading those as "someone else has it" makes the caller skip work that
		// nobody is doing. The conditional UPDATE below is the real discriminator: on a genuine
		// duplicate it runs and reports; on a broken connection it fails too, and that failure is
		// raised rather than silently converted into a skip.
		unset( $error );

		$sql = "UPDATE {$table} SET meta_value = %s WHERE booking_id = %d AND meta_key = %s AND meta_value <> %s";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; every value bound via prepare(); atomic conditional re-claim.
		$affected = $this->wpdb->query( $this->wpdb->prepare( $sql, $value, $booking_id, $meta_key, $value ) );
		if ( false === $affected ) {
			throw StorageException::fromSqlError( esc_html( 'booking meta claim' ), esc_html( (string) $this->wpdb->last_error ) );
		}

		return 1 === (int) $affected;
	}

	/**
	 * Take an expiring LEASE on a metadata key: claim it when no row exists, or when the row holds a
	 * value strictly OLDER than the given expiry threshold.
	 *
	 * This is {@see self::claimKey()}'s sibling for work that is not finished at the moment it is
	 * claimed. A plain claim is permanent the instant it is written, which is wrong whenever the
	 * claimer can still die before the work becomes durable — the claim would then mark the work as
	 * handled forever, and nothing would ever retry it. A lease says "I am doing this, ask again
	 * after `$expired_before` if I never came back", and the caller converts it into a permanent
	 * record only once the work is provably durable.
	 *
	 * Values are compared as STRINGS, so callers must store a lexicographically ordered stamp —
	 * `Y-m-d H:i:s` sorts correctly and is what every Aponto timestamp already looks like.
	 *
	 * Atomic on both supported engines (D-R20): INSERT wins the empty case under the unique key, and
	 * the conditional UPDATE admits exactly one winner among racers because the first write makes the
	 * stored value newer than the threshold every later racer is testing against.
	 *
	 * @param int    $booking_id     Booking id.
	 * @param string $meta_key       Fully-qualified metadata key (module-namespaced).
	 * @param string $stamp          Lease stamp to store (`Y-m-d H:i:s`).
	 * @param string $expired_before Reclaim only a lease whose stored stamp is older than this.
	 * @return bool Whether THIS caller holds the lease.
	 * @throws StorageException When the write fails for a reason other than the unique constraint.
	 */
	public function leaseKey( int $booking_id, string $meta_key, string $stamp, string $expired_before ): bool {
		$table = $this->wpdb->prefix . 'aponto_booking_meta';

		$suppressed = $this->wpdb->suppress_errors( true );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Atomic unique claim; a duplicate-key failure is the expected "already leased" answer, handled below.
		$inserted = $this->wpdb->insert(
			$table,
			array(
				'booking_id' => $booking_id,
				'meta_key'   => $meta_key,
				'meta_value' => $stamp,
			),
			array( '%d', '%s', '%s' )
		);
		$this->wpdb->suppress_errors( $suppressed );

		if ( false !== $inserted ) {
			return true;
		}

		$sql = "UPDATE {$table} SET meta_value = %s WHERE booking_id = %d AND meta_key = %s AND meta_value < %s";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; every value bound via prepare(); atomic conditional lease takeover.
		$affected = $this->wpdb->query( $this->wpdb->prepare( $sql, $stamp, $booking_id, $meta_key, $expired_before ) );
		if ( false === $affected ) {
			// Same reasoning as claimKey(): a storage failure must not read as "another worker holds
			// the lease" (Codex round 3, P1 #9).
			throw StorageException::fromSqlError( esc_html( 'booking meta lease' ), esc_html( (string) $this->wpdb->last_error ) );
		}

		return 1 === (int) $affected;
	}

	/**
	 * Insert a metadata row ONLY if the key is not already present.
	 *
	 * The mirror of {@see self::claimKey()}'s conditional insert, for a caller undoing a delete it
	 * owned (Codex round 9, P2). A plain upsert cannot express this: between the delete and the
	 * restore another writer may legitimately have armed a NEWER row, and overwriting it with the
	 * pre-image would replace a live value with a stale one.
	 *
	 * A duplicate key is therefore a legitimate answer — "someone else's row is there, leave it" —
	 * and is reported as `false`, not raised. Any OTHER failure is raised, because a broken statement
	 * read as "already present" is how a restore silently does not happen.
	 *
	 * @param int    $booking_id Booking id.
	 * @param string $meta_key   Fully-qualified metadata key.
	 * @param string $value      Value to insert.
	 * @return bool Whether THIS call created the row.
	 * @throws StorageException When the insert failed for any reason other than an existing row.
	 */
	public function insertIfAbsent( int $booking_id, string $meta_key, string $value ): bool {
		$table = $this->wpdb->prefix . 'aponto_booking_meta';

		$suppressed = $this->wpdb->suppress_errors( true );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Conditional create; a duplicate-key failure is the expected "already there" answer, discriminated below.
		$inserted = $this->wpdb->insert(
			$table,
			array(
				'booking_id' => $booking_id,
				'meta_key'   => $meta_key,
				'meta_value' => $value,
			),
			array( '%d', '%s', '%s' )
		);
		$error    = (string) $this->wpdb->last_error;
		$this->wpdb->suppress_errors( $suppressed );

		if ( false !== $inserted ) {
			return true;
		}

		// A FAILED INSERT IS NOT AUTOMATICALLY "ALREADY THERE" (the same discrimination
		// {@see self::claimKey()} makes): a dead connection or a missing table also returns false.
		// The row itself answers which happened.
		$sql = "SELECT COUNT(*) FROM {$table} WHERE booking_id = %d AND meta_key = %s";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		$existing = $this->wpdb->get_var( $this->wpdb->prepare( $sql, $booking_id, $meta_key ) );

		if ( null !== $existing && (int) $existing > 0 ) {
			return false;
		}

		throw StorageException::fromSqlError( esc_html( 'booking meta conditional insert' ), esc_html( $error ) );
	}

	/**
	 * ATOMICALLY replace a metadata value, but only while it still equals an expected one.
	 *
	 * The compare-and-swap the retry bookkeeping needs (Codex round 6, #9). Read-then-write cannot
	 * express "undo my own write": two hooks running concurrently derive the SAME attempt number and
	 * verb, so a read-compare-delete could match a row a different hook wrote a microsecond earlier
	 * and erase a durable retry that was not its own. A conditional `UPDATE … WHERE meta_value = %s`
	 * — the same primitive {@see self::claimKey()} uses — makes the check and the write one
	 * statement, and a caller whose expected value no longer matches simply does nothing.
	 *
	 * `$replacement === null` DELETES the row instead, under the same condition.
	 *
	 * ### MATCHED rows, not CHANGED rows
	 *
	 * The answer is "was the expected value the one I found?", which is NOT what `UPDATE` reports:
	 * MySQL counts rows it actually CHANGED, so writing a value identical to the stored one affects
	 * zero rows even though the condition matched perfectly (Codex round 7, P3). A caller restoring a
	 * pre-image that happens to equal what it wrote would have been told it lost a row it still owned.
	 * That case is answered by a matching COUNT instead of an update — the write would have been a
	 * no-op anyway.
	 *
	 * @param int         $booking_id  Booking id.
	 * @param string      $meta_key    Fully-qualified metadata key.
	 * @param string      $expected    The value this caller believes it wrote.
	 * @param string|null $replacement New value, or null to delete the row.
	 * @return bool Whether THIS caller's expected value was the one matched (and, when it differs
	 *              from the replacement, written over).
	 * @throws StorageException When the statement fails.
	 */
	public function replaceIfEquals( int $booking_id, string $meta_key, string $expected, ?string $replacement ): bool {
		$table = $this->wpdb->prefix . 'aponto_booking_meta';

		if ( $expected === $replacement ) {
			$sql = "SELECT COUNT(*) FROM {$table} WHERE booking_id = %d AND meta_key = %s AND meta_value = %s";
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; every value bound via prepare().
			$matched = $this->wpdb->get_var( $this->wpdb->prepare( $sql, $booking_id, $meta_key, $expected ) );

			// `COUNT(*)` always returns a row, so a null here is a failed statement, never "no match".
			if ( null === $matched ) {
				throw StorageException::fromSqlError( esc_html( 'booking meta conditional match' ), esc_html( (string) $this->wpdb->last_error ) );
			}

			return (int) $matched > 0;
		}

		if ( null === $replacement ) {
			$sql = "DELETE FROM {$table} WHERE booking_id = %d AND meta_key = %s AND meta_value = %s";
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; every value bound via prepare().
			$affected = $this->wpdb->query( $this->wpdb->prepare( $sql, $booking_id, $meta_key, $expected ) );
		} else {
			$sql = "UPDATE {$table} SET meta_value = %s WHERE booking_id = %d AND meta_key = %s AND meta_value = %s";
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; every value bound via prepare().
			$affected = $this->wpdb->query( $this->wpdb->prepare( $sql, $replacement, $booking_id, $meta_key, $expected ) );
		}

		if ( false === $affected ) {
			throw StorageException::fromSqlError( esc_html( 'booking meta conditional write' ), esc_html( (string) $this->wpdb->last_error ) );
		}

		return 1 === (int) $affected;
	}

	/**
	 * Delete one metadata key for a booking (releasing a lease). Idempotent.
	 *
	 * @param int    $booking_id Booking id.
	 * @param string $meta_key   Fully-qualified metadata key.
	 * @return bool Whether the delete statement succeeded (an absent row is success).
	 */
	public function deleteKey( int $booking_id, string $meta_key ): bool {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Constant table; an absent row deletes zero rows and is not an error.
		$result = $this->wpdb->delete(
			$this->wpdb->prefix . 'aponto_booking_meta',
			array(
				'booking_id' => $booking_id,
				'meta_key'   => $meta_key,
			),
			array( '%d', '%s' )
		);

		// REPORTS rather than throws (Codex round 3, P2): callers clearing a retry intent are on a
		// success path where an exception would undo work that really happened, but they still need
		// to know whether the row is gone before declaring the booking reconciled.
		return false !== $result;
	}

	/**
	 * Read one namespaced metadata value, or null when the row does not exist.
	 *
	 * The generic sibling of {@see self::internalNote()}: the key is DATA, so a module can keep its
	 * own namespaced state (`integration.{code}.remote_event`, `…​.sync`) without this repository
	 * learning what any of it means (extension-surface §3.5/§6).
	 *
	 * @param int    $booking_id Booking id.
	 * @param string $meta_key   Fully-qualified metadata key.
	 */
	public function getKey( int $booking_id, string $meta_key ): ?string {
		$table = $this->wpdb->prefix . 'aponto_booking_meta';
		$sql   = "SELECT meta_value FROM {$table} WHERE booking_id = %d AND meta_key = %s LIMIT 1";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		$value = $this->wpdb->get_var( $this->wpdb->prepare( $sql, $booking_id, $meta_key ) );

		return null === $value ? null : (string) $value;
	}

	/**
	 * Upsert one namespaced metadata value.
	 *
	 * Unconditional, unlike {@see self::claimKey()}: this is for state a single owner rewrites (a
	 * retry counter, a remote reference), not for a claim several callers race for.
	 *
	 * @param int    $booking_id Booking id.
	 * @param string $meta_key   Fully-qualified metadata key.
	 * @param string $meta_value Value to store.
	 * @return bool Whether the write succeeded.
	 */
	public function setKey( int $booking_id, string $meta_key, string $meta_value ): bool {
		$table = $this->wpdb->prefix . 'aponto_booking_meta';
		$sql   = "INSERT INTO {$table} (booking_id, meta_key, meta_value) VALUES (%d, %s, %s)
			ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		return false !== $this->wpdb->query( $this->wpdb->prepare( $sql, $booking_id, $meta_key, $meta_value ) );
	}

	/**
	 * Booking ids whose value under ONE key is DUE — lexicographically earlier than a stamp.
	 *
	 * The scan behind a retry queue built on metadata rows. Values must be lexicographically ordered
	 * stamps (`Y-m-d H:i:s`, like every Aponto timestamp), which is what lets the database do both
	 * the filtering and the ordering: the oldest overdue work comes first, so a backlog drains in
	 * order instead of starving behind whatever the storage engine happened to return.
	 *
	 * @param string $meta_key Fully-qualified metadata key.
	 * @param string $due_at   Stamp to compare against (`Y-m-d H:i:s`).
	 * @param int    $limit    Maximum rows.
	 * @return list<int> Booking ids, most overdue first.
	 */
	public function dueByKey( string $meta_key, string $due_at, int $limit ): array {
		$table = $this->wpdb->prefix . 'aponto_booking_meta';
		$sql   = "SELECT booking_id FROM {$table}
			WHERE meta_key = %s AND meta_value <= %s
			ORDER BY meta_value ASC LIMIT %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		$rows = $this->wpdb->get_col( $this->wpdb->prepare( $sql, $meta_key, $due_at, max( 1, $limit ) ) );

		return array_values( array_map( 'intval', is_array( $rows ) ? $rows : array() ) );
	}

	/**
	 * Delete every metadata row whose key starts with a prefix, across all bookings (module uninstall
	 * — extension-surface §3.5). Idempotent: a second run deletes nothing and reports 0.
	 *
	 * @param string $prefix Key prefix, e.g. `reminders.sent.`.
	 * @return int Rows removed.
	 * @throws StorageException When the delete fails.
	 */
	public function deleteByKeyPrefix( string $prefix ): int {
		if ( '' === $prefix ) {
			return 0; // Refuse to wipe the whole table through an empty prefix.
		}

		$table = $this->wpdb->prefix . 'aponto_booking_meta';
		$like  = $this->wpdb->esc_like( $prefix ) . '%';
		$sql   = "DELETE FROM {$table} WHERE meta_key LIKE %s";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; the escaped LIKE pattern is bound via prepare().
		$removed = $this->wpdb->query( $this->wpdb->prepare( $sql, $like ) );

		// `(int) false` is `0`, which reads as "there was nothing to delete" (Codex round 7, P2). On
		// the uninstall path that is the difference between "the rows are gone" and "the delete failed
		// and nobody noticed", and the caller's catch/log path can only fire if there is something to
		// catch. The same rule as {@see \Aponto\Booking\Repository\StaffMetaRepository::deleteByKeyPrefix()}.
		if ( false === $removed ) {
			throw StorageException::fromSqlError( esc_html( 'booking meta bulk delete' ), esc_html( (string) $this->wpdb->last_error ) );
		}

		return (int) $removed;
	}

	/**
	 * Write the custom-field answers of ONE booking (D-R30).
	 *
	 * Called from inside the reservation transaction, so the rows commit and roll back with the
	 * booking itself: a customer never ends up with a booking whose answers are missing, and a
	 * rolled-back attempt never leaves orphan answers behind. Values are already validated and
	 * sanitized by the REST boundary ({@see \Aponto\Rest\Support\CustomFieldInput}); `true` stores
	 * `'1'` and an empty string / `false` stores NOTHING — the delete-on-empty rule the internal
	 * note already follows.
	 *
	 * @param int                        $booking_id Booking id.
	 * @param array<string, string|bool> $values     Validated `slug => value` answers.
	 * @throws StorageException When a write fails.
	 */
	public function setCustomFields( int $booking_id, array $values ): void {
		$table = $this->wpdb->prefix . 'aponto_booking_meta';
		foreach ( $values as $slug => $value ) {
			$slug = (string) $slug;
			if ( 1 !== preg_match( CustomFieldDefinition::SLUG_PATTERN, $slug ) ) {
				continue; // Defence in depth: only a validated slug can name a metadata key.
			}
			$stored = is_bool( $value ) ? ( $value ? '1' : '' ) : (string) $value;
			if ( '' === $stored ) {
				$this->deleteCustomField( $booking_id, $slug );
				continue;
			}

			$sql = "INSERT INTO {$table} (booking_id, meta_key, meta_value) VALUES (%d, %s, %s)
				ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)";
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
			$result = $this->wpdb->query( $this->wpdb->prepare( $sql, $booking_id, CustomFieldSchema::metaKey( $slug ), $stored ) );
			if ( false === $result ) {
				throw StorageException::fromSqlError( esc_html( 'booking custom field upsert' ), esc_html( (string) $this->wpdb->last_error ) );
			}
		}
	}

	/**
	 * Read a booking's custom-field answers as `slug => stored value` (empty when none).
	 *
	 * @param int $booking_id Booking id.
	 * @return array<string, string>
	 */
	public function customFields( int $booking_id ): array {
		$table = $this->wpdb->prefix . 'aponto_booking_meta';
		$like  = $this->wpdb->esc_like( CustomFieldSchema::META_PREFIX ) . '%';
		$sql   = "SELECT meta_key, meta_value FROM {$table} WHERE booking_id = %d AND meta_key LIKE %s ORDER BY meta_key ASC";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; the id and the escaped LIKE pattern are bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $booking_id, $like ), ARRAY_A );

		$values = array();
		foreach ( is_array( $rows ) ? $rows : array() as $row ) {
			$slug = CustomFieldSchema::slugFromMetaKey( (string) ( $row['meta_key'] ?? '' ) );
			if ( null === $slug ) {
				continue;
			}
			$values[ $slug ] = (string) ( $row['meta_value'] ?? '' );
		}

		return $values;
	}

	/**
	 * Delete every custom-field answer of a booking (privacy erasure, D-R30 / D-R10).
	 *
	 * @param int $booking_id Booking id.
	 * @return int|false Rows deleted, or false on failure (callers fail closed).
	 */
	public function deleteCustomFields( int $booking_id ) {
		$table = $this->wpdb->prefix . 'aponto_booking_meta';
		$like  = $this->wpdb->esc_like( CustomFieldSchema::META_PREFIX ) . '%';
		$sql   = "DELETE FROM {$table} WHERE booking_id = %d AND meta_key LIKE %s";

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; the id and the escaped LIKE pattern are bound via prepare().
		return $this->wpdb->query( $this->wpdb->prepare( $sql, $booking_id, $like ) );
	}

	/**
	 * Delete ONE custom-field answer.
	 *
	 * @param int    $booking_id Booking id.
	 * @param string $slug       Field slug.
	 * @throws StorageException When the delete fails.
	 */
	private function deleteCustomField( int $booking_id, string $slug ): void {
		$result = $this->wpdb->delete(
			$this->wpdb->prefix . 'aponto_booking_meta',
			array(
				'booking_id' => $booking_id,
				'meta_key'   => CustomFieldSchema::metaKey( $slug ),
			),
			array( '%d', '%s' )
		);
		if ( false === $result ) {
			throw StorageException::fromSqlError( esc_html( 'booking custom field delete' ), esc_html( (string) $this->wpdb->last_error ) );
		}
	}

	/**
	 * Delete all metadata for a booking during hard deletion.
	 *
	 * @param int $booking_id Booking id.
	 * @throws StorageException When the delete fails.
	 */
	public function deleteForBooking( int $booking_id ): void {
		$result = $this->wpdb->delete(
			$this->wpdb->prefix . 'aponto_booking_meta',
			array( 'booking_id' => $booking_id ),
			array( '%d' )
		);
		if ( false === $result ) {
			throw StorageException::fromSqlError( esc_html( 'booking metadata delete' ), esc_html( (string) $this->wpdb->last_error ) );
		}
	}
}

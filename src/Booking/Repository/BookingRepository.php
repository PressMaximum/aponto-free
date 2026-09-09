<?php
/**
 * Booking reader/writer (§4.2, §5.6).
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

use Aponto\Booking\Booking;
use Aponto\Database\StorageException;

/**
 * Reads and writes `aponto_bookings`. Times are stored twice: the authoritative `*_datetime_utc`
 * instants and the business-local `local_date`/`start_minute`/`end_minute` for display and the
 * `staff_day` index. Buffers are FROZEN from the service at save time (§4.2). Hydration joins the
 * order code through `order_items`.
 *
 * Every write is fail-closed (review E4): a `false` result, a non-positive insert id, or a
 * mandatory update affecting zero rows throws {@see StorageException} so the enclosing
 * transaction rolls back instead of committing a partial state.
 */
final class BookingRepository {

	/**
	 * The UTC zone.
	 *
	 * @var \DateTimeZone
	 */
	private \DateTimeZone $utc;

	/**
	 * Construct the repository.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct( private \wpdb $wpdb ) {
		$this->utc = new \DateTimeZone( 'UTC' );
	}

	/**
	 * Insert a booking row and return its id. The row starts at `mutation_version = 1` (R4-1).
	 *
	 * @param array<string, mixed> $data Column => value map (already sanitized/typed by the service).
	 * @throws StorageException When the insert fails or yields no id (E4).
	 */
	public function insert( array $data ): int {
		$table = $this->wpdb->prefix . 'aponto_bookings';

		// R4-1: every write versions the row; a fresh row starts life at version 1.
		$data['mutation_version'] = 1;

		$result = $this->wpdb->insert(
			$table,
			$data,
			array(
				'%d', // service_id.
				'%d', // staff_id.
				'%d', // location_id.
				'%s', // start_datetime_utc.
				'%s', // end_datetime_utc.
				'%s', // local_date.
				'%d', // start_minute.
				'%d', // end_minute.
				'%d', // buffer_before.
				'%d', // buffer_after.
				'%s', // status.
				'%d', // attendees.
				'%d', // customer_id.
				'%s', // customer_timezone.
				'%s', // customer_note.
				'%s', // consent_at (null -> SQL NULL, handled by $wpdb).
				'%s', // token_hash.
				'%d', // ics_sequence.
				'%s', // created_at.
				'%s', // updated_at.
				'%d', // mutation_version.
			)
		);

		if ( false === $result ) {
				throw StorageException::fromSqlError( esc_html( 'booking insert' ), esc_html( (string) $this->wpdb->last_error ) );
		}

		$id = (int) $this->wpdb->insert_id;
		if ( $id <= 0 ) {
			throw StorageException::because( esc_html( 'booking insert yielded no id' ) );
		}

		return $id;
	}

	/**
	 * Find a booking by id (with order code), or null.
	 *
	 * @param int $id Booking id.
	 */
	public function find( int $id ): ?Booking {
		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter -- Query template contains only table names from $wpdb->prefix; value is passed to wpdb::prepare.
		$row = $this->wpdb->get_row(
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- Value is passed to wpdb::prepare; sniff cannot recognize the injected wpdb property.
			$this->wpdb->prepare( $this->selectSql() . ' WHERE b.id = %d LIMIT 1', $id ),
			ARRAY_A
		);

		return is_array( $row ) ? $this->hydrate( $row ) : null;
	}

	/**
	 * Find a booking by token hash (with order code), or null.
	 *
	 * @param string $token_hash SHA-256 hex token hash.
	 */
	public function findByTokenHash( string $token_hash ): ?Booking {
		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter -- Query template contains only table names from $wpdb->prefix; value is passed to wpdb::prepare.
		$row = $this->wpdb->get_row(
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- Value is passed to wpdb::prepare; sniff cannot recognize the injected wpdb property.
			$this->wpdb->prepare( $this->selectSql() . ' WHERE b.token_hash = %s LIMIT 1', $token_hash ),
			ARRAY_A
		);

		return is_array( $row ) ? $this->hydrate( $row ) : null;
	}

	/**
	 * Lock a booking row `FOR UPDATE` and return it as a {@see Booking}, or null. Must run inside a
	 * transaction (reschedule/status services).
	 *
	 * @param int $id Booking id.
	 */
	public function findForUpdate( int $id ): ?Booking {
		$table = $this->wpdb->prefix . 'aponto_bookings';
		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter -- table name from $wpdb->prefix, not user input.
		$row = $this->wpdb->get_row(
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- table name from $wpdb->prefix, not user input; value is passed to wpdb::prepare.
			$this->wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d FOR UPDATE", $id ),
			ARRAY_A
		);
		if ( ! is_array( $row ) ) {
			return null;
		}

		$row['order_id']   = null;
		$row['order_code'] = '';

		return $this->hydrate( $row );
	}

	/**
	 * Update a booking status and `updated_at`.
	 *
	 * Callers only invoke this for a REAL status change (transition validation guarantees
	 * `from !== to`), so zero affected rows means the row vanished — fail closed (E4).
	 *
	 * @param int    $id      Booking id.
	 * @param string $status  New status.
	 * @param string $now_sql `updated_at` value (UTC MySQL datetime).
	 * @throws StorageException When the update fails or affects no row.
	 */
	public function updateStatus( int $id, string $status, string $now_sql ): void {
		$affected = $this->versionedUpdate(
			$id,
			array(
				'status'     => $status,
				'updated_at' => $now_sql,
			),
			'booking status update',
			null
		);

		if ( 0 === $affected ) {
			throw StorageException::because( esc_html( 'booking status update affected no row' ) );
		}
	}

	/**
	 * Hard-delete a booking row.
	 *
	 * The controller verifies existence immediately before the delete, so a zero-row result means
	 * the row vanished during the operation and must fail closed.
	 *
	 * @param int $id Booking id.
	 * @throws StorageException When the delete fails or affects no row.
	 */
	public function delete( int $id ): void {
		$result = $this->wpdb->delete(
			$this->wpdb->prefix . 'aponto_bookings',
			array( 'id' => $id ),
			array( '%d' )
		);
		if ( false === $result ) {
			throw StorageException::fromSqlError( esc_html( 'booking delete' ), esc_html( (string) $this->wpdb->last_error ) );
		}
		if ( 0 === $result ) {
			throw StorageException::because( esc_html( 'booking delete affected no row' ) );
		}
	}

	/**
	 * Column => `$wpdb` format map for booking writes.
	 */
	private const COLUMN_FORMATS = array(
		'staff_id'           => '%d',
		'start_datetime_utc' => '%s',
		'end_datetime_utc'   => '%s',
		'local_date'         => '%s',
		'start_minute'       => '%d',
		'end_minute'         => '%d',
		'buffer_before'      => '%d',
		'buffer_after'       => '%d',
		'ics_sequence'       => '%d',
		'status'             => '%s',
		'updated_at'         => '%s',
	);

	/**
	 * Update a booking's times, frozen buffers, local fields and ICS sequence (reschedule §5.6).
	 *
	 * Reschedule always bumps `ics_sequence`, so zero affected rows means the row vanished —
	 * fail closed (E4).
	 *
	 * @param int                  $id    Booking id.
	 * @param array<string, mixed> $times Column => value map (keys must be in {@see self::COLUMN_FORMATS}).
	 * @throws StorageException When the update fails or affects no row.
	 */
	public function updateTimes( int $id, array $times ): void {
		$affected = $this->versionedUpdate( $id, $times, 'booking times update', null );

		if ( 0 === $affected ) {
			throw StorageException::because( esc_html( 'booking times update affected no row' ) );
		}
	}

	/**
	 * Compensation restore, guarded EXCLUSIVELY by `mutation_version` (R4-1): applies the given
	 * snapshot assignments only while the row still carries the exact version THIS attempt wrote.
	 * Returns the affected-row count (0 = CAS miss — another actor already touched the row; the
	 * caller logs and leaves it). Like every write, a hit bumps the version again.
	 *
	 * @param int                  $id               Booking id.
	 * @param int                  $expected_version The mutation_version THIS attempt's write produced.
	 * @param array<string, mixed> $assignments      Snapshot column => value map to restore.
	 */
	public function casRestore( int $id, int $expected_version, array $assignments ): int {
		$suppressed = $this->wpdb->suppress_errors( true );
		$affected   = 0;
		try {
			$affected = $this->versionedUpdate( $id, $assignments, 'booking compensation restore', $expected_version );
		} catch ( StorageException $e ) {
			// Best-effort context (post-identity-failure): an infra failure equals a CAS miss.
			unset( $e );
			$affected = 0;
		}
		$this->wpdb->suppress_errors( $suppressed );

		return $affected;
	}

	/**
	 * THE single write path for booking UPDATEs (R4-1): every update — status, times, restores,
	 * and any future one — goes through here and atomically bumps `mutation_version` in the same
	 * statement. Never update `aponto_bookings` any other way.
	 *
	 * @param int                  $id               Booking id.
	 * @param array<string, mixed> $assignments      Column => value map (keys in {@see self::COLUMN_FORMATS}).
	 * @param string               $operation        Operation label for failures.
	 * @param int|null             $expected_version When non-null, adds `AND mutation_version = %d` (CAS).
	 * @return int Affected rows.
	 * @throws StorageException When the statement fails.
	 */
	private function versionedUpdate( int $id, array $assignments, string $operation, ?int $expected_version ): int {
		$set    = array();
		$params = array();
		foreach ( $assignments as $column => $value ) {
			$format   = self::COLUMN_FORMATS[ $column ] ?? '%s';
			$set[]    = '`' . $column . '` = ' . $format;
			$params[] = $value;
		}
		$set[] = 'mutation_version = mutation_version + 1';

		$sql      = 'UPDATE ' . $this->wpdb->prefix . 'aponto_bookings SET ' . implode( ', ', $set ) . ' WHERE id = %d';
		$params[] = $id;
		if ( null !== $expected_version ) {
			$sql     .= ' AND mutation_version = %d';
			$params[] = $expected_version;
		}

		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.PreparedSQL.NotPrepared -- SQL identifiers/placeholders are internal and all values are passed to wpdb::prepare.
		$result = $this->wpdb->query( $this->wpdb->prepare( $sql, $params ) );
		if ( false === $result ) {
				throw StorageException::fromSqlError( esc_html( $operation ), esc_html( (string) $this->wpdb->last_error ) );
		}

		return (int) $result;
	}

	/**
	 * The base SELECT joining the order code.
	 */
	private function selectSql(): string {
		$bookings = $this->wpdb->prefix . 'aponto_bookings';
		$items    = $this->wpdb->prefix . 'aponto_order_items';
		$orders   = $this->wpdb->prefix . 'aponto_orders';

		return "SELECT b.*, o.id AS order_id, o.code AS order_code
			FROM {$bookings} b
			LEFT JOIN {$items} oi ON oi.booking_id = b.id
			LEFT JOIN {$orders} o ON o.id = oi.order_id";
	}

	/**
	 * Hydrate a booking row into a {@see Booking}.
	 *
	 * @param array<string, mixed> $row Row.
	 */
	public function hydrate( array $row ): Booking {
		return new Booking(
			(int) $row['id'],
			(int) $row['service_id'],
			(int) $row['staff_id'],
			(int) $row['location_id'],
			new \DateTimeImmutable( (string) $row['start_datetime_utc'], $this->utc ),
			new \DateTimeImmutable( (string) $row['end_datetime_utc'], $this->utc ),
			(string) $row['local_date'],
			(int) $row['start_minute'],
			(int) $row['end_minute'],
			(int) $row['buffer_before'],
			(int) $row['buffer_after'],
			(string) $row['status'],
			(int) $row['attendees'],
			(int) $row['customer_id'],
			(string) $row['customer_timezone'],
			(string) $row['token_hash'],
			(int) $row['ics_sequence'],
			isset( $row['order_id'] ) && null !== $row['order_id'] ? (int) $row['order_id'] : null,
			isset( $row['order_code'] ) ? (string) $row['order_code'] : '',
			isset( $row['updated_at'] ) ? (string) $row['updated_at'] : '',
			isset( $row['mutation_version'] ) ? (int) $row['mutation_version'] : 0,
			isset( $row['created_at'] ) ? (string) $row['created_at'] : ''
		);
	}

	/**
	 * The booking's `created_at` EXACTLY as the database stores it (D-R26).
	 *
	 * Half of the durable token's derivation input, and the reason it is read back rather than
	 * reused from the value the insert was handed: the two supported engines do not agree on how a
	 * `datetime` round-trips. MySQL NORMALIZES what it stores, SQLite (D-R20, a fully supported
	 * tier) keeps TEXT verbatim — so deriving from the in-memory string at anchor time and from the
	 * hydrated column at send time could produce two different HMAC inputs on one engine and not the
	 * other. Reading the stored value back makes both paths byte-identical BY CONSTRUCTION, on every
	 * engine, instead of by assumption.
	 *
	 * FAIL-CLOSED. This runs immediately after our own insert, inside the reservation transaction,
	 * so neither a read error nor a missing row is a state the caller can carry on from: silently
	 * returning '' would make the anchor skip derivation and commit a booking permanently stuck on
	 * the legacy first-email-only path. Both cases throw, and the reservation aborts like any other
	 * write-model storage failure — the customer retries and gets a booking with a working link.
	 *
	 * @param int $id Booking id.
	 * @return string Stored datetime, exactly as the database holds it.
	 * @throws StorageException When the read fails or the row is absent.
	 */
	public function storedCreatedAt( int $id ): string {
		$table = $this->wpdb->prefix . 'aponto_bookings';
		// flush() clears any stale `last_error` from an earlier statement, so the check below can only
		// ever see THIS read's outcome (same technique the copy migrations use).
		$this->wpdb->flush();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; id bound via prepare().
		$created_at = $this->wpdb->get_var( $this->wpdb->prepare( "SELECT created_at FROM {$table} WHERE id = %d", $id ) );

		if ( '' !== (string) $this->wpdb->last_error ) {
			// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Stable PII-free message; the raw SQL error travels in a property, never in the message (phpcs.xml.dist rationale; Plugin Check runs its own ruleset).
			throw StorageException::fromWpdb( $this->wpdb, 'booking created_at read' );
		}
		if ( null === $created_at || '' === (string) $created_at ) {
			throw StorageException::because( esc_html( 'booking created_at is unreadable for id ' . $id ) );
		}

		return (string) $created_at;
	}

	/**
	 * ANCHOR a freshly-inserted booking's `token_hash` to its derived durable token (D-R26).
	 *
	 * Called once, inside the reservation transaction, immediately after the insert — the derivation
	 * input includes the auto-increment id, which does not exist until then, so the row is inserted
	 * with a provisional CSPRNG hash and re-anchored here before it is ever committed or visible.
	 *
	 * This is NOT rotation (D-R25): it happens before the booking exists to anyone, no email has
	 * been rendered from the provisional value, and nothing afterwards ever writes this column
	 * again except privacy erasure. Fail-closed — anything other than exactly one affected row
	 * throws, so the reservation rolls back rather than committing a booking whose token nobody can
	 * rebuild.
	 *
	 * @param int    $id         Booking id.
	 * @param string $token_hash SHA-256 hex of the derived token.
	 * @throws StorageException When the update fails or does not affect exactly one row.
	 */
	public function anchorTokenHash( int $id, string $token_hash ): void {
		$table = $this->wpdb->prefix . 'aponto_bookings';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Constant table from $wpdb->prefix; single-column anchor inside the reservation transaction, id bound by $wpdb->update.
		$affected = $this->wpdb->update(
			$table,
			array( 'token_hash' => $token_hash ),
			array( 'id' => $id ),
			array( '%s' ),
			array( '%d' )
		);

		if ( 1 !== $affected ) {
			throw StorageException::because( esc_html( 'booking token anchor affected ' . ( false === $affected ? 'no' : (string) (int) $affected ) . ' rows' ) );
		}
	}
}

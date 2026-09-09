<?php
/**
 * Idempotency claim/complete (§4.2, §5.6).
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

use Aponto\Database\StorageException;
use Aponto\Support\Clock;

/**
 * Owns the `aponto_idempotency` table (§4.2). `claim()` INSERTs the (key_hash, scope) row; a
 * duplicate is disambiguated by a LOCKING re-read (§5.6):
 *
 *   - expired row            → DELETE + re-INSERT (re-claim), reported as `claimed` (P1-13).
 *   - same hash + booking set → `replay` with the booking id.
 *   - same hash + no booking  → `in_flight`.
 *   - different hash          → `conflict`.
 *
 * Under READ COMMITTED a duplicate INSERT blocks on a concurrent uncommitted claim and resolves
 * only after that transaction ends, so the `FOR UPDATE` re-read always sees the winning row. Keys
 * are pre-hashed by the caller; the raw key never touches storage.
 */
final class IdempotencyRepository {

	/**
	 * Claim time-to-live in seconds (§5.6 leaves the TTL to implementation).
	 */
	public const TTL_SECONDS = 86400;

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
	 * Claim a key within the current transaction.
	 *
	 * @param string $key_hash     SHA-256 hex of the raw idempotency key.
	 * @param string $scope        Scope (`public`).
	 * @param string $request_hash Canonical request hash.
	 * @return array{status: string, booking_id?: int}
	 *         status ∈ {`claimed`, `replay`, `in_flight`, `conflict`}.
	 * @throws \Aponto\Database\StorageException When the claim insert fails for a non-duplicate reason.
	 */
	public function claim( string $key_hash, string $scope, string $request_hash ): array {
		if ( $this->insertClaim( $key_hash, $scope, $request_hash ) ) {
			return array( 'status' => 'claimed' );
		}

		$row = $this->lockRow( $key_hash, $scope );
		if ( null === $row ) {
			// A duplicate-key error guarantees a committed conflicting row exists (our INSERT waited
			// on the blocker's lock and only failed once it committed). If the locking read still
			// finds nothing, the blocker rolled back in the same instant — report in-flight so the
			// client safely retries the same key and re-claims a now-free slot.
			return array( 'status' => 'in_flight' );
		}

		if ( strtotime( (string) $row['expires_at'] . ' UTC' ) < $this->clock->now()->getTimestamp() ) {
			// Expired claim: delete and re-claim within this transaction (P1-13).
			$this->deleteRow( $key_hash, $scope );
			if ( $this->insertClaim( $key_hash, $scope, $request_hash ) ) {
				return array( 'status' => 'claimed' );
			}
			// Lost the re-claim race; re-read the winner.
			$row = $this->lockRow( $key_hash, $scope );
			if ( null === $row ) {
				return array( 'status' => 'in_flight' );
			}
		}

		if ( (string) $row['request_hash'] !== $request_hash ) {
			return array( 'status' => 'conflict' );
		}

		if ( null !== $row['booking_id'] ) {
			return array(
				'status'     => 'replay',
				'booking_id' => (int) $row['booking_id'],
			);
		}

		return array( 'status' => 'in_flight' );
	}

	/**
	 * Record the booking id and response code on a claimed row.
	 *
	 * The claimed row always has `booking_id = NULL` at this point, so the update must affect
	 * exactly one row — anything else is a partial state and fails closed (E4).
	 *
	 * @param string $key_hash      Key hash.
	 * @param string $scope         Scope.
	 * @param int    $booking_id    Booking id.
	 * @param int    $response_code HTTP response code (201).
	 * @throws \Aponto\Database\StorageException When the update fails or affects no row.
	 */
	public function complete( string $key_hash, string $scope, int $booking_id, int $response_code ): void {
		$result = $this->wpdb->update(
			$this->wpdb->prefix . 'aponto_idempotency',
			array(
				'booking_id'    => $booking_id,
				'response_code' => $response_code,
			),
			array(
				'key_hash' => $key_hash,
				'scope'    => $scope,
			),
			array( '%d', '%d' ),
			array( '%s', '%s' )
		);

		if ( false === $result ) {
				throw StorageException::fromSqlError( esc_html( 'idempotency complete' ), esc_html( (string) $this->wpdb->last_error ) );
		}
		if ( 0 === (int) $result ) {
			throw StorageException::because( esc_html( 'idempotency complete affected no row' ) );
		}
	}

	/**
	 * INSERT a fresh in-flight claim row; false ONLY on a duplicate-key collision.
	 *
	 * Any other failure throws immediately with the error snapshot (E2/E4) — the caller must not
	 * run further queries first, because they would clear `$wpdb->last_error`.
	 *
	 * @param string $key_hash     Key hash.
	 * @param string $scope        Scope.
	 * @param string $request_hash Request hash.
	 * @throws \Aponto\Database\StorageException On a non-duplicate failure.
	 */
	private function insertClaim( string $key_hash, string $scope, string $request_hash ): bool {
		$expires = $this->clock->now()->modify( '+' . self::TTL_SECONDS . ' seconds' )->format( 'Y-m-d H:i:s' );

		$suppressed = $this->wpdb->suppress_errors( true );
		$ok         = $this->wpdb->insert(
			$this->wpdb->prefix . 'aponto_idempotency',
			array(
				'key_hash'      => $key_hash,
				'scope'         => $scope,
				'request_hash'  => $request_hash,
				'booking_id'    => null,
				'response_code' => null,
				'expires_at'    => $expires,
			),
			array( '%s', '%s', '%s', '%d', '%d', '%s' )
		);
		$this->wpdb->suppress_errors( $suppressed );

		if ( false !== $ok ) {
			return true;
		}
		$error = (string) $this->wpdb->last_error;
		if ( $this->claimExists( $key_hash, $scope ) ) {
			return false;
		}

		throw StorageException::fromSqlError( esc_html( 'idempotency claim insert' ), esc_html( $error ) );
	}

	/**
	 * Lock and read a claim row (`FOR UPDATE`), or null.
	 *
	 * @param string $key_hash Key hash.
	 * @param string $scope    Scope.
	 * @return array<string, mixed>|null
	 */
	private function lockRow( string $key_hash, string $scope ): ?array {
		$table = $this->wpdb->prefix . 'aponto_idempotency';
		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter -- table name from $wpdb->prefix, not user input.
		$row = $this->wpdb->get_row(
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- table name from $wpdb->prefix, not user input; values are passed to wpdb::prepare.
			$this->wpdb->prepare( "SELECT * FROM {$table} WHERE key_hash = %s AND scope = %s FOR UPDATE", $key_hash, $scope ),
			ARRAY_A
		);

		return is_array( $row ) ? $row : null;
	}

	/**
	 * Delete a claim row.
	 *
	 * @param string $key_hash Key hash.
	 * @param string $scope    Scope.
	 */
	private function deleteRow( string $key_hash, string $scope ): void {
		$this->wpdb->delete(
			$this->wpdb->prefix . 'aponto_idempotency',
			array(
				'key_hash' => $key_hash,
				'scope'    => $scope,
			),
			array( '%s', '%s' )
		);
	}

	/**
	 * Whether the unique claim already exists after an INSERT failure.
	 *
	 * The read is portable across MySQL and the official SQLite integration and
	 * avoids inspecting a private driver handle. A failed INSERT is accepted as
	 * a collision only when the exact unique key can be read back.
	 *
	 * @param string $key_hash Key hash.
	 * @param string $scope    Scope.
	 */
	private function claimExists( string $key_hash, string $scope ): bool {
		$table = $this->wpdb->prefix . 'aponto_idempotency';
		$sql   = $this->wpdb->prepare(
			'SELECT 1 FROM %i WHERE key_hash = %s AND scope = %s LIMIT 1',
			$table,
			$key_hash,
			$scope
		);
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared -- Identifier and values are bound above; collision read-back on the exact unique key.
		$value = $this->wpdb->get_var( $sql );

		return '1' === (string) $value;
	}
}

<?php
/**
 * Customer identity resolution and non-destructive import writes (D-R72).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Import;

use Aponto\Database\StorageException;
use Aponto\Rest\Data\CustomerGateway;
use Aponto\Support\Clock;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/** Customers are the first adapter; no foreign database ID enters a local primary-key lookup. */
final class CustomerAdapter implements ImportAdapter {
	/**
	 * Read gateway, shared with customer CRUD.
	 *
	 * @var CustomerGateway
	 */
	private CustomerGateway $customers;

	/**
	 * Customer writes lock their rows inside the transaction.
	 *
	 * @param string               $source Namespace.
	 * @param array<string,string> $values Values.
	 * @return list<\Aponto\Database\Lock> No extra domain lock; email unique index is authoritative.
	 */
	public function locks( string $source, array $values ): array {
		return array();
	}

	/**
	 * Construct adapter.
	 *
	 * @param \wpdb $wpdb Database.
	 * @param Clock $clock Clock.
	 * @param Store $store Persistent identity map.
	 */
	public function __construct( private \wpdb $wpdb, private Clock $clock, private Store $store ) {
		$this->customers = new CustomerGateway( $wpdb, $clock );
	}

	/**
	 * Resolve without mutations. An established identity cannot silently switch people.
	 *
	 * @param string               $source Source UUID.
	 * @param array<string,string> $values Normalized values.
	 * @return array<string,mixed> Proposed outcome.
	 */
	public function preview( string $source, array $values ): array {
		$external = $values['external_id'] ?? '';
		$email    = strtolower( trim( $values['email'] ) );
		$mapped   = '' === $external ? null : $this->store->resolve( $source, 'customers', $external );
		if ( null !== $mapped ) {
			$row = $this->customers->find( $mapped );
			$this->assertRead();
			if ( null === $row ) {
				return $this->error( 'external_id', __( 'The mapped customer no longer exists. Resolve this source identity before importing.', 'aponto' ) );
			}
			if ( strtolower( trim( (string) $row['email'] ) ) !== $email ) {
				return $this->error( 'external_id', __( 'This source ID is linked to a customer with a different email. It will not be relinked automatically.', 'aponto' ) );
			}
			return array(
				'status'    => 'reuse',
				'target_id' => $mapped,
			);
		}
		$row = $this->customers->findByEmailNorm( $email );
		$this->assertRead();
		return null === $row ? array( 'status' => 'create' ) : array(
			'status'    => 'reuse',
			'target_id' => (int) $row['id'],
		);
	}

	/**
	 * Write inside the caller's guarded transaction, preserving existing profiles.
	 *
	 * @param string               $source Source UUID.
	 * @param array<string,string> $values Normalized values.
	 * @param int|null             $expected_target Local identity approved in preview.
	 * @return array<string,mixed> Outcome and optional post-commit event row.
	 * @throws StorageException On write/read failures.
	 */
	public function write( string $source, array $values, ?int $expected_target = null ): array {
		$result = $this->preview( $source, $values );
		if ( 'error' === $result['status'] ) {
			return $result;
		}
		if ( null !== $expected_target && ( $result['target_id'] ?? null ) !== $expected_target ) {
			return $this->error( 'email', __( 'The customer matched during preview has changed. Create a new preview before importing this row.', 'aponto' ) );
		}
		$created = false;
		if ( 'create' === $result['status'] ) {
			// Expected concurrent email conflicts must not abort an ambient SQLite transaction.
			// Do not use the booking-time upsert: it overwrites existing contact information.
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- All identifiers/values bound. Atomic no-update insert shared with customer schema.
			$inserted = $this->wpdb->query( $this->wpdb->prepare( 'INSERT IGNORE INTO %i (first_name,last_name,email,email_norm,phone,note,created_at) VALUES (%s,%s,%s,%s,%s,%s,%s)', $this->wpdb->prefix . 'aponto_customers', $values['first_name'], $values['last_name'], $values['email'], strtolower( trim( $values['email'] ) ), $values['phone'] ?? '', $values['note'] ?? '', $this->clock->nowSql() ) );
			if ( false === $inserted ) {
				// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Stable exception message; raw SQL errors stay in exception properties.
				throw StorageException::fromWpdb( $this->wpdb, 'import customer' );
			}
			$created = 1 === $inserted;
		}
		// FOR UPDATE pins the customer against erasure/deletion until binding and progress commit.
		// Read-back, not insert_id: an ignored insert can leave a stale connection-local ID.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Prepared authoritative identity read.
		$row = $this->wpdb->get_row( $this->wpdb->prepare( 'SELECT id, first_name, last_name, email, phone, note, created_at FROM %i WHERE email_norm = %s FOR UPDATE', $this->wpdb->prefix . 'aponto_customers', strtolower( trim( $values['email'] ) ) ), ARRAY_A );
		$this->assertRead();
		if ( ! is_array( $row ) || ( isset( $result['target_id'] ) && (int) $row['id'] !== $result['target_id'] ) ) {
			throw StorageException::because( 'Import customer identity changed.' );
		}
		$id = (int) $row['id'];
		if ( '' !== ( $values['external_id'] ?? '' ) ) {
			$this->store->bind( $source, 'customers', $values['external_id'], $id );
		}
		$out = array(
			'status'    => $created ? 'created' : 'reused',
			'target_id' => $id,
		);
		if ( $created ) {
			$out['event'] = $row;
		}
		return $out;
	}

	/**
	 * Build a safe row-level error.
	 *
	 * @param string $field Field key.
	 * @param string $message Authored error.
	 * @return array<string,mixed> Outcome.
	 */
	private function error( string $field, string $message ): array {
		return array(
			'status' => 'error',
			'errors' => array( $field => $message ),
		);
	}

	/**
	 * Fail closed on storage errors.
	 *
	 * @throws StorageException If a lookup failed rather than missed. */
	private function assertRead(): void {
		if ( '' !== $this->wpdb->last_error ) {
			// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Stable exception message; raw SQL errors stay in exception properties.
			throw StorageException::fromWpdb( $this->wpdb, 'import customer lookup' );
		}
	}
}

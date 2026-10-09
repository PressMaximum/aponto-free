<?php
/**
 * Non-destructive catalog identity handling for CSV import.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Import;

use Aponto\Booking\StaffLockFactory;
use Aponto\Database\Lock;
use Aponto\Database\StorageException;
use Aponto\Support\Clock;

/** Shared source identity policy, extended by separately shipped entity writers. */
abstract class IdentityAdapter implements ImportAdapter {
	/**
	 * Construct an entity writer.
	 *
	 * @param \wpdb  $wpdb Database.
	 * @param Clock  $clock Clock.
	 * @param Store  $store Identity map.
	 * @param string $entity Stable entity key.
	 */
	public function __construct( protected \wpdb $wpdb, protected Clock $clock, protected Store $store, protected string $entity ) {}

	/**
	 * Validate and propose a create or explicit reuse without changing stored profiles.
	 *
	 * @param string               $source Source UUID.
	 * @param array<string,string> $values CSV values.
	 * @return array<string,mixed> Outcome.
	 */
	public function preview( string $source, array $values ): array {
		$data = $this->data( $values );
		if ( $data instanceof \WP_Error ) {
			$fields = (array) ( $data->get_error_data()['fields'] ?? array() );
			return array(
				'status' => 'error',
				'errors' => array() === $fields ? array( '_' => $data->get_error_message() ) : $fields,
			);
		}
		$external = $values['external_id'] ?? '';
		if ( 'locations' === $this->entity && '' === $external ) {
			try {
				$row = ( new CatalogMatch( $this->wpdb ) )->location( $values );
				return $row ? array(
					'status'    => 'reuse',
					'target_id' => (int) $row['id'],
				) : array( 'status' => 'create' );
			} catch ( \InvalidArgumentException $error ) {
				return $this->error( 'name', $error->getMessage() );
			}
		}
		if ( '' === $external || mb_strlen( $external ) > 191 || preg_match( '/[\x00-\x1f\x7f]/', $external ) ) {
			return $this->error( 'external_id', __( 'A source ID of at most 191 characters is required.', 'aponto' ) );
		}
		$raw_target = $values['target_id'] ?? '';
		if ( '' !== $raw_target && ( ! ctype_digit( $raw_target ) || (int) $raw_target < 1 || strlen( $raw_target ) > 18 ) ) {
			return $this->error( 'target_id', __( 'Choose a valid local record ID for explicit reuse.', 'aponto' ) );
		}
		$mapped = $this->store->resolve( $source, $this->entity, $external );
		$target = '' === $raw_target ? $mapped : (int) $raw_target;
		if ( null !== $mapped && $mapped !== $target ) {
			return $this->error( 'target_id', __( 'This source ID is already linked to another record.', 'aponto' ) );
		}
		if ( null === $target ) {
			return array( 'status' => 'create' );
		}
		$row = $this->find( $target );
		$this->assertRead();
		if ( null === $row ) {
			return $this->error( 'target_id', __( 'The linked record no longer exists. Resolve the source mapping before importing.', 'aponto' ) );
		}
		return array(
			'status'    => 'reuse',
			'target_id' => $target,
		);
	}

	/**
	 * Acquire these locks before starting the caller transaction.
	 *
	 * @param string               $source Source UUID.
	 * @param array<string,string> $values CSV values.
	 * @return list<Lock> Existing target lock, if any.
	 */
	public function locks( string $source, array $values ): array {
		$target = $this->store->resolve( $source, $this->entity, $values['external_id'] ?? '' );
		$target = $target ?? (int) ( $values['target_id'] ?? 0 );
		if ( 'locations' === $this->entity && ! $target ) {
			$target = (int) ( $this->preview( $source, $values )['target_id'] ?? 0 );
		}
		if ( $target < 1 ) {
			return array();
		}
		$factory = new StaffLockFactory( $this->wpdb );
		return array(
			match ( $this->entity ) {
							'locations' => $factory->forLocation( $target ),
							'staff' => $factory->forStaff( $target ),
							default => $factory->forService( $target ),
			},
		);
	}

	/**
	 * Insert or bind inside the caller transaction. Events are delivered after commit.
	 *
	 * @param string               $source Source UUID.
	 * @param array<string,string> $values CSV values.
	 * @param int|null             $expected_target Preview target.
	 * @return array<string,mixed> Outcome.
	 * @throws StorageException On failed writes or changed identities.
	 */
	public function write( string $source, array $values, ?int $expected_target = null ): array {
		$result = $this->preview( $source, $values );
		if ( 'error' === $result['status'] ) {
			return $result;
		}
		if ( null !== $expected_target && ( $result['target_id'] ?? null ) !== $expected_target ) {
			return $this->error( 'target_id', __( 'The preview target has changed. Create a new preview.', 'aponto' ) );
		}
		$created = 'create' === $result['status'];
		if ( $created ) {
			$data = $this->data( $values );
			if ( $data instanceof \WP_Error ) {
				throw StorageException::because( 'Import validation changed.' );
			}
			$id = $this->create( $data );
			$this->assertRead();
			if ( $id < 1 ) {
				throw StorageException::because( 'Import record insert failed.' );
			}
		} else {
			$id = (int) $result['target_id'];
		}
		$row = $this->find( $id );
		$this->assertRead();
		if ( null === $row ) {
			throw StorageException::because( 'Import record readback failed.' );
		}
		if ( ! empty( $values['external_id'] ) ) {
			$this->store->bind( $source, $this->entity, $values['external_id'], $id );
		}
		return array(
			'status'    => $created ? 'created' : 'reused',
			'target_id' => $id,
			'events'    => $created ? $this->events( $row ) : array(),
		);
	}

	/**
	 * Resolve validated import data.
	 *
	 * @param array<string,string> $values Values.
	 * @return array<string,mixed>|\WP_Error Validated data.
	 */
	abstract public function data( array $values ): array|\WP_Error;
	/**
	 * Resolve validated import data.
	 *
	 * @param int $id Local ID.
	 * @return array<string,mixed>|null Row.
	 */
	abstract protected function find( int $id ): ?array;
	/**
	 * Resolve validated import data.
	 *
	 * @param array<string,mixed> $data Validated data.
	 */
	abstract protected function create( array $data ): int;
	/**
	 * Resolve validated import data.
	 *
	 * @param array<string,mixed> $row Persisted row.
	 * @return list<array{hook:string,args:array<mixed>}> Events.
	 */
	abstract protected function events( array $row ): array;

	/**
	 * Resolve validated import data.
	 *
	 * @param string $field Field.
	 * @param string $message Safe error.
	 * @return array<string,mixed> Outcome.
	 */
	protected function error( string $field, string $message ): array {
		return array(
			'status' => 'error',
			'errors' => array( $field => $message ),
		);
	}

	/**
	 * Fail closed on failed reads or writes.
	 *
	 * @throws StorageException On database failure.
	 */
	protected function assertRead(): void {
		if ( '' !== $this->wpdb->last_error ) {
			// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Stable authored error; raw DB detail stays server-side.
			throw StorageException::fromWpdb( $this->wpdb, 'import catalog' );
		}
	}
}

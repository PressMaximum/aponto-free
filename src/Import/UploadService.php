<?php
/**
 * Bounded private uploads and incremental preview preparation (D-R72).
 *
 * @package Aponto
 */

declare(strict_types=1);
namespace Aponto\Import;

use Aponto\Rest\Errors;
use Aponto\Support\Clock;
use WP_Error;

/** Stores ciphertext parts; never assembles a whole uploaded file in memory. */
final class UploadService {
	public const MAX_BYTES    = 104857600;
	public const CHUNK_BYTES  = 262144;
	public const MAX_ROWS     = 100000;
	public const PREPARE_ROWS = 100;
	/**
	 * Encrypted import storage.
	 *
	 * @var Store
	 */
	private Store $store;
	/**
	 * Shared import orchestration.
	 *
	 * @var ImportService
	 */
	private ImportService $imports;
	/**
	 * Entity adapters and authorization.
	 *
	 * @var EntityRegistry
	 */
	private EntityRegistry $registry;

	/**
	 * Construct upload orchestration.
	 *
	 * @param \wpdb $wpdb Database connection.
	 * @param Clock $clock Current-time provider.
	 */
	public function __construct( \wpdb $wpdb, private Clock $clock ) {
		$this->store    = new Store( $wpdb, $clock );
		$this->imports  = new ImportService( $wpdb, $clock );
		$this->registry = new EntityRegistry( $wpdb, $clock, $this->store );
	}

	/**
	 * Create a private upload job from a validated descriptor.
	 *
	 * @param array<string,mixed> $input Upload descriptor.
	 * @param int                 $owner Authenticated owner ID.
	 * @return array<string,mixed>|WP_Error Job metadata or validation failure.
	 */
	public function create( array $input, int $owner ): array|WP_Error {
		$entity = $input['entity'] ?? '';
		if ( ! is_string( $entity ) ) {
			return Errors::validation( array( 'entity' => __( 'Choose an import type.', 'aponto' ) ) ); }
		$permission = $this->registry->authorize( $entity );
		if ( true !== $permission ) {
			return $permission; }
		$size      = $input['size'] ?? null;
		$delimiter = $input['delimiter'] ?? ',';
		if ( ! is_int( $size ) || $size < 1 || $size > self::MAX_BYTES || ! in_array( $delimiter, array( ',', ';', "\t" ), true ) ) {
			return Errors::validation( array( 'file' => __( 'Choose a CSV file up to 100 MiB and a supported delimiter.', 'aponto' ) ) );
		}
		foreach ( array( 'update_staff', 'update_services' ) as $option ) {
			if ( isset( $input[ $option ] ) && ! is_bool( $input[ $option ] ) ) {
				return Errors::validation( array( $option => __( 'Use a boolean update option.', 'aponto' ) ) );
			}
		}
		$source = $this->imports->selectSource( $input );
		if ( is_wp_error( $source ) ) {
			return $source; }
		return $this->imports->transaction(
			function () use ( $input, $owner, $entity, $size, $delimiter, $source ) {
				if ( $this->store->jobCount( $owner ) >= 10 ) {
					return Errors::validation( array( 'file' => __( 'Remove an earlier report before creating another upload. Ten active imports are allowed.', 'aponto' ) ) ); }
				$job = array(
					'id'              => wp_generate_uuid4(),
					'entity'          => $entity,
					'update_staff'    => ! empty( $input['update_staff'] ),
					'update_services' => ! empty( $input['update_services'] ),
					'version'         => ImportService::VERSION,
					'fingerprint'     => $this->imports->fingerprint( $entity ),
					'paged'           => true,
					'privacy_epoch'   => $this->store->privacyEpoch( true ),
					'source'          => $source,
					'filename'        => sanitize_text_field( is_string( $input['filename'] ?? null ) ? substr( $input['filename'], 0, 200 ) : 'import.csv' ),
					'upload_size'     => $size,
					'upload_received' => 0,
					'chunks'          => 0,
					'delimiter'       => $delimiter,
					'status'          => 'uploading',
					'total'           => 0,
					'processed'       => 0,
					'validated'       => 0,
					'counts'          => array(
						'create'  => 0,
						'reuse'   => 0,
						'created' => 0,
						'reused'  => 0,
						'error'   => 0,
					),
					'expires_at'      => $this->clock->now()->modify( '+24 hours' )->format( 'Y-m-d H:i:s' ),
				);
				$this->store->createJob( $job, $owner );
				return $job;
			}
		);
	}

	/**
	 * Accept one bounded, base64-encoded chunk with replay protection.
	 *
	 * @param string $id Upload job UUID.
	 * @param int    $owner Authenticated owner ID.
	 * @param int    $index Zero-based chunk index.
	 * @param string $encoded CSV bytes encoded for JSON transport.
	 * @return array<string,mixed>|WP_Error Updated metadata or validation failure.
	 */
	public function chunk( string $id, int $owner, int $index, string $encoded ): array|WP_Error {
		if ( strlen( $encoded ) > 4 * (int) ceil( self::CHUNK_BYTES / 3 ) ) {
			return Errors::validation( array( 'file' => __( 'Upload chunk exceeds the size limit.', 'aponto' ) ) ); }
		// Decode raw CSV bytes transported in JSON; this content is never executed.
		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode -- Binary-safe JSON transport for bounded CSV chunks.
		$bytes = base64_decode( $encoded, true );
		if ( false === $bytes || '' === $bytes || strlen( $bytes ) > self::CHUNK_BYTES || $index < 0 ) {
			return Errors::validation( array( 'file' => __( 'Invalid upload chunk.', 'aponto' ) ) ); }
		return $this->mutate(
			$id,
			$owner,
			function ( array $job ) use ( $owner, $index, $bytes ) {
				$key = self::key( 'raw', $index );
				if ( $index < $job['chunks'] ) {
					$part = $this->store->part( $job['id'], $owner, $key );
					return isset( $part['digest'] ) && hash_equals( $part['digest'], hash( 'sha256', $bytes ) ) ? $job : Errors::settingsConflict();
				}
				$expected = min( self::CHUNK_BYTES, $job['upload_size'] - $job['upload_received'] );
				if ( 'uploading' !== $job['status'] || $index !== $job['chunks'] || strlen( $bytes ) !== $expected ) {
					return Errors::settingsConflict(); }
				$this->store->putPart(
					$job['id'],
					$owner,
					$key,
					array(
						// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- Preserve bytes when a chunk splits a UTF-8 character in encrypted JSON storage.
						'data'   => base64_encode( $bytes ),
						'digest' => hash( 'sha256', $bytes ),
					),
					$job['expires_at']
				);
				$job['upload_received'] += strlen( $bytes );
				++$job['chunks'];
				if ( $job['upload_received'] === $job['upload_size'] ) {
					$job['status'] = 'uploaded'; }
				$this->store->saveJob( $job, $owner );
				return $job;
			}
		);
	}

	/**
	 * Read a header and five records within parser record and cell limits.
	 *
	 * @param string $id Upload job UUID.
	 * @param int    $owner Authenticated owner ID.
	 * @return array<string,mixed>|WP_Error Inspection sample or validation failure.
	 */
	public function inspect( string $id, int $owner ): array|WP_Error {
		$job = $this->imports->show( $id, $owner );
		if ( is_wp_error( $job ) ) {
			return $job; }
		if ( empty( $job['paged'] ) || ! in_array( $job['status'], array( 'uploaded', 'validating', 'ready', 'running' ), true ) ) {
			return Errors::settingsConflict(); }
		$state   = array();
		$records = array();
		for ( $index = 0; $index < $job['chunks']; ++$index ) {
			if ( count( $records ) >= 6 ) {
				break; }
			$bytes = $this->raw( $job, $owner, $index );
			$state = ( new StreamingCsvParser() )->feed(
				$bytes,
				$state,
				$index + 1 === $job['chunks'],
				static function ( array $record ) use ( &$records ) {
					$records[] = $record;
				},
				$job['delimiter'],
				6 - count( $records )
			);
		}
		$headers = array_shift( $records )['cells'] ?? array();
		return array(
			'headers' => $headers,
			'mapping' => EntityRegistry::fields( $job['entity'] )->suggest( $headers ),
			'sample'  => $records,
		);
	}

	/**
	 * Validate at most 100 records from one 256 KiB chunk per request.
	 *
	 * @param string                    $id Upload job UUID.
	 * @param int                       $owner Authenticated owner ID.
	 * @param array<string,string>|null $mapping Column mapping on the first request.
	 * @return array<string,mixed>|WP_Error Updated metadata or validation failure.
	 */
	public function prepare( string $id, int $owner, ?array $mapping ): array|WP_Error {
		return $this->mutate(
			$id,
			$owner,
			function ( array $job ) use ( $owner, $mapping ) {
				if ( null !== $mapping && isset( $job['mapping'] ) && $mapping !== $job['mapping'] && in_array( $job['status'], array( 'ready', 'running', 'completed' ), true ) ) {
					if ( 'ready' !== $job['status'] || 0 !== (int) $job['processed'] ) {
						return Errors::settingsConflict();
					}
					$error = EntityRegistry::fields( $job['entity'] )->validateMapping( $job['headers'], $mapping );
					if ( null !== $error ) {
						return $error;
					}
					$this->store->clearPreparedParts( $job['id'], $owner );
					unset( $job['parsed'], $job['header_seen'], $job['scan_index'], $job['failure'] );
					$job['total']     = 0;
					$job['validated'] = 0;
					$job['counts']    = array_fill_keys( array( 'create', 'reuse', 'created', 'reused', 'error' ), 0 );
					$job['status']    = 'uploaded';
				}
				if ( in_array( $job['status'], array( 'ready', 'running', 'completed' ), true ) ) {
					return $job; }
				if ( ! in_array( $job['status'], array( 'uploaded', 'validating' ), true ) ) {
					return Errors::settingsConflict(); }
				if ( ! empty( $job['parsed'] ) ) {
					return $this->finalize( $job, $owner ); }
				$fields = EntityRegistry::fields( $job['entity'] );
				if ( 'uploaded' === $job['status'] ) {
					if ( null === $mapping ) {
						return Errors::validation( array( 'mapping' => __( 'Map each column before preparing the import.', 'aponto' ) ) ); }
					$inspection = $this->inspect( $job['id'], $owner );
					if ( is_wp_error( $inspection ) ) {
						return $inspection; }
					$error = $fields->validateMapping( $inspection['headers'], $mapping );
					if ( null !== $error ) {
						return $error; }
					$job['mapping']      = $mapping;
					$job['headers']      = $inspection['headers'];
					$job['parser']       = array();
					$job['parse_chunk']  = 0;
					$job['parse_offset'] = 0;
					$job['status']       = 'validating';
				} elseif ( null !== $mapping && $mapping !== $job['mapping'] ) {
					return Errors::settingsConflict(); }
				$adapter = $this->registry->adapter( $job['entity'] );
				$chunk   = $this->raw( $job, $owner, $job['parse_chunk'] );
				$bytes   = substr( $chunk, $job['parse_offset'] );
				try {
					$job['parser']        = ( new StreamingCsvParser() )->feed(
						$bytes,
						$job['parser'],
						$job['parse_chunk'] + 1 === $job['chunks'],
						function ( array $record ) use ( &$job, $owner, $fields, $adapter ) {
							if ( ! isset( $job['header_seen'] ) ) {
								$job['header_seen'] = true;
								return; }
							$values = $fields->normalize( $job['headers'], $record['cells'], $job['mapping'] );
							if ( is_array( $values ) ) {
								$values['_update_staff']    = ! empty( $job['update_staff'] ) ? '1' : '0';
								$values['_update_services'] = ! empty( $job['update_services'] ) ? '1' : '0';
							}
							$row  = array(
								'line'   => $record['line'],
								'values' => is_array( $values ) ? $values : array(),
							);
							$row += is_wp_error( $values ) ? array(
								'status' => 'error',
								'errors' => $values->get_error_data()['fields'],
							) : $adapter->preview( $job['source']['id'], $values );
							if ( is_array( $values ) ) {
								foreach ( CatalogGroups::forRow( $job['entity'], $values ) as $key => $group ) {
									$this->store->putPart( $job['id'], $owner, $key, CatalogGroups::merge( $this->store->part( $job['id'], $owner, $key ), $group ), $job['expires_at'] );
								}
							}
							if ( is_array( $values ) && ! in_array( $job['entity'], array( 'services', 'staff', 'locations' ), true ) && '' !== ( $values['external_id'] ?? '' ) ) {
								$this->identity( $job, $owner, $row, $values ); }
							$this->store->putPart( $job['id'], $owner, self::key( 'row', $job['total'] ), $row, $job['expires_at'] );
							++$job['counts'][ $row['status'] ];
							++$job['total'];
							++$job['validated'];
						},
						$job['delimiter'],
						self::PREPARE_ROWS
					);
					$job['parse_offset'] += $job['parser']['consumed'];
					if ( strlen( $chunk ) === $job['parse_offset'] && ! $job['parser']['finished'] && $job['parse_chunk'] + 1 < $job['chunks'] ) {
						++$job['parse_chunk'];
						$job['parse_offset'] = 0; }
					if ( $job['parser']['finished'] ) {
						if ( 0 === $job['total'] ) {
							throw new \InvalidArgumentException( __( 'Add at least one data row.', 'aponto' ) ); }
						$job['parsed']     = true;
						$job['scan_index'] = 0;
						unset( $job['parser'] );
					}
				} catch ( \InvalidArgumentException $invalid ) {
					$job['status']  = 'failed';
					$job['failure'] = $invalid->getMessage();
					unset( $job['parser'] );
				}
				$this->store->saveJob( $job, $owner );
				return $job;
			}
		);
	}

	/**
	 * Mark conflicting identities across all chunks for the final sweep.
	 *
	 * @param array<string,mixed>  $job Job metadata.
	 * @param int                  $owner Authenticated owner ID.
	 * @param array<string,mixed>  $row Current row, updated on a conflict.
	 * @param array<string,string> $values Normalized field values.
	 */
	private function identity( array &$job, int $owner, array &$row, array $values ): void {
		$key      = 'identity:' . hash( 'sha256', $values['external_id'] );
		$identity = $this->store->part( $job['id'], $owner, $key );
		$hash     = hash( 'sha256', 'customers' === $job['entity'] ? strtolower( trim( $values['email'] ) ) : (string) wp_json_encode( $values ) );
		if ( null === $identity ) {
			$this->store->putPart(
				$job['id'],
				$owner,
				$key,
				array(
					'hash'     => $hash,
					'first'    => $job['total'],
					'conflict' => false,
				),
				$job['expires_at']
			);
			return;
		}
		if ( $identity['hash'] === $hash && ! $identity['conflict'] ) {
			return; }
		// All earlier repeated IDs are finalized by a separate bounded sweep before execution.
		$identity['conflict'] = true;
		$this->store->putPart( $job['id'], $owner, $key, $identity, $job['expires_at'] );
		$row['status'] = 'error';
		$row['errors'] = array( 'external_id' => __( 'Repeated records have conflicting values in this file.', 'aponto' ) );
	}

	/** Final bounded pass marks every duplicate conflict before enabling execution.
	 *
	 * @param array<string,mixed> $job Job metadata.
	 * @param int                 $owner Authenticated owner ID.
	 * @return array<string,mixed> Updated metadata.
	 * @throws \RuntimeException When a prepared row is unavailable.
	 */
	private function finalize( array $job, int $owner ): array {
		$end = min( $job['total'], $job['scan_index'] + self::PREPARE_ROWS );
		for ( $i = $job['scan_index']; $i < $end; ++$i ) {
			$row = $this->store->part( $job['id'], $owner, self::key( 'row', $i ) );
			if ( null === $row ) {
				throw new \RuntimeException( 'Import row unavailable.' ); }
			$completed = CatalogGroups::completeStaff( $job['entity'], $row['values'], fn( $key ) => $this->store->part( $job['id'], $owner, $key ) );
			if ( $completed !== $row['values'] ) {
				--$job['counts'][ $row['status'] ];
				unset( $row['errors'], $row['target_id'], $row['references'] );
				$row['values'] = $completed;
				$row           = array_merge( $row, $this->registry->adapter( $job['entity'] )->preview( $job['source']['id'], $completed ) );
				++$job['counts'][ $row['status'] ];
				$this->store->putPart( $job['id'], $owner, self::key( 'row', $i ), $row, $job['expires_at'] );
			}
			$external = $row['values']['external_id'] ?? '';
			$identity = '' === $external ? null : $this->store->part( $job['id'], $owner, 'identity:' . hash( 'sha256', $external ) );
			foreach ( CatalogGroups::forRow( $job['entity'], $row['values'] ) as $key => $group ) {
				$stored = $this->store->part( $job['id'], $owner, $key );
				if ( ! empty( $stored['conflict'] ) ) {
					$identity = array( 'conflict' => true ); }
			}
			if ( ! empty( $identity['conflict'] ) && 'error' !== $row['status'] ) {
				--$job['counts'][ $row['status'] ];
				++$job['counts']['error'];
				$row['status'] = 'error';
				$row['errors'] = array( 'external_id' => __( 'Repeated records have conflicting values in this file.', 'aponto' ) );
				$this->store->putPart( $job['id'], $owner, self::key( 'row', $i ), $row, $job['expires_at'] );
			}
		}
		$job['scan_index'] = $end;
		if ( $end === $job['total'] ) {
			$job['status'] = 'ready'; }
		$this->store->saveJob( $job, $owner );
		return $job;
	}

	/**
	 * Return a bounded page of preview or report rows.
	 *
	 * @param string $id Upload job UUID.
	 * @param int    $owner Authenticated owner ID.
	 * @param int    $offset Zero-based row offset.
	 * @param int    $limit Maximum rows in this page.
	 * @return array<string,mixed>|WP_Error Row page or validation failure.
	 */
	public function rows( string $id, int $owner, int $offset, int $limit ): array|WP_Error {
		$job = $this->imports->show( $id, $owner );
		if ( is_wp_error( $job ) ) {
			return $job; }
		if ( empty( $job['paged'] ) || $offset < 0 || $offset > self::MAX_ROWS || $limit < 1 || $limit > 100 ) {
			return Errors::validation( array( 'page' => __( 'Choose a valid report page.', 'aponto' ) ) ); }
		return array(
			'rows'   => $this->store->rowPage( $id, $owner, $offset, $limit ),
			'total'  => $job['total'],
			'offset' => $offset,
		);
	}

	/**
	 * Apply an operation under the import transaction and current privacy epoch.
	 *
	 * @param string   $id Upload job UUID.
	 * @param int      $owner Authenticated owner ID.
	 * @param callable $operation Operation receiving current job metadata.
	 * @return array<string,mixed>|WP_Error Operation result or access failure.
	 */
	private function mutate( string $id, int $owner, callable $operation ): array|WP_Error {
		return $this->imports->transaction(
			function () use ( $id, $owner, $operation ) {
				$job = $this->imports->show( $id, $owner );
				if ( is_wp_error( $job ) ) {
					return $job; }
				if ( empty( $job['paged'] ) || $job['privacy_epoch'] !== $this->store->privacyEpoch( true ) || $job['fingerprint'] !== $this->imports->fingerprint( $job['entity'] ) ) {
					return Errors::settingsConflict(); }
				return $operation( $job );
			}
		);
	}

	/**
	 * Read and decode one decrypted upload chunk.
	 *
	 * @param array<string,mixed> $job Job metadata.
	 * @param int                 $owner Authenticated owner ID.
	 * @param int                 $index Zero-based chunk index.
	 * @return string Original CSV bytes.
	 * @throws \RuntimeException When the encrypted part is absent or invalid.
	 */
	private function raw( array $job, int $owner, int $index ): string {
		$part  = $this->store->part( $job['id'], $owner, self::key( 'raw', $index ) );
		$bytes = isset( $part['data'] ) ? base64_decode( $part['data'], true ) : false; // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode -- Restore original CSV bytes from encrypted JSON storage.
		if ( false === $bytes ) {
			throw new \RuntimeException( 'Import upload part unavailable.' ); }
		return $bytes;
	}

	/**
	 * Build a stable ordinal part key.
	 *
	 * @param string $kind Part category.
	 * @param int    $index Zero-based ordinal.
	 * @return string Storage part key.
	 */
	public static function key( string $kind, int $index ): string {
		return $kind . ':' . sprintf( '%08d', $index ); }
}

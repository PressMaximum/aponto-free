<?php
/**
 * Bounded, resumable entity imports (D-R72).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Import;

use Aponto\Database\LockFactory;
use Aponto\Database\TransactionGuard;
use Aponto\Rest\Errors;
use Aponto\Support\Clock;
use Aponto\Support\PersonName;
use WP_Error;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/** Rows durably couple business writes and identities; batches checkpoint resumable progress. */
final class ImportService {
	public const VERSION    = 2;
	public const BATCH_SIZE = 25;
	/** Reserved site-scoped namespace for UI imports without explicit source keys. */
	public const DEFAULT_SOURCE_ID = 'd103d0c9-9b0f-5d0f-aade-ae1bd3d1dd12';
	/**
	 * Import dependency.
	 *
	 * @var Store
	 */
	private Store $store;
	/**
	 * Authorized schemas and domain writers.
	 *
	 * @var EntityRegistry
	 */
	private EntityRegistry $registry;

	/**
	 * Construct application services.
	 *
	 * @param \wpdb $wpdb Database.
	 * @param Clock $clock Clock.
	 */
	public function __construct( private \wpdb $wpdb, private Clock $clock ) {
		$this->store    = new Store( $wpdb, $clock );
		$this->registry = new EntityRegistry( $wpdb, $clock, $this->store );
	}

	/**
	 * Read the declared result.
	 *
	 * @param string $entity Selected import type, or empty for the first authorized type.
	 * @return array<string,mixed>|WP_Error The live schema and source namespaces. */
	public function schema( string $entity = '' ): array|WP_Error {
		$entities   = $this->registry->entities();
		$entity     = '' === $entity ? ( $entities[0]['key'] ?? 'customers' ) : $entity;
		$permission = $this->registry->authorize( $entity );
		if ( true !== $permission ) {
			return $permission; }
		return array(
			'entity'   => $entity,
			'entities' => $entities,
			'version'  => self::VERSION,
			'fields'   => EntityRegistry::fields( $entity )->fields(),
			'upload'   => array(
				'bytes'       => UploadService::MAX_BYTES,
				'rows'        => UploadService::MAX_ROWS,
				'chunk_bytes' => UploadService::CHUNK_BYTES,
			),
			'limits'   => array(
				'bytes' => 1048576,
				'rows'  => 1000,
			),
			'sources'  => $this->store->sources(),
			'jobs'     => array_values( array_filter( $this->store->jobs( get_current_user_id() ), fn( array $job ): bool => 'unreadable' === ( $job['status'] ?? '' ) || true === $this->registry->authorize( $job['entity'] ?? 'customers' ) ) ),
		);
	}

	/**
	 * Read the declared result.
	 *
	 * @param string $entity Selected import type.
	 * @return string|WP_Error Registry-generated CSV template. */
	public function template( string $entity = 'customers' ): string|WP_Error {
		$permission = $this->registry->authorize( $entity );
		return true === $permission ? ExampleCsv::build( $entity ) : $permission;
	}

	/**
	 * Parse and suggest without retaining uploaded data.
	 *
	 * @param string $csv UTF-8 CSV.
	 * @param string $delimiter CSV delimiter.
	 * @param string $entity Selected import type.
	 * @return array<string,mixed> Inspection.
	 */
	public function inspect( string $csv, string $delimiter, string $entity = 'customers' ): array|WP_Error {
		$permission = $this->registry->authorize( $entity );
		if ( true !== $permission ) {
			return $permission; }
		$parsed = ( new CsvParser() )->parse( $csv, $delimiter );
		return array(
			'headers' => $parsed['headers'],
			'mapping' => EntityRegistry::fields( $entity )->suggest( $parsed['headers'] ),
			'sample'  => array_slice( $parsed['rows'], 0, 5 ),
			'total'   => count( $parsed['rows'] ),
		);
	}

	/**
	 * Persist a private preview, never customer or identity-map mutations.
	 *
	 * @param array<string,mixed> $input Validated request container.
	 * @param int                 $owner Acting user.
	 * @return array<string,mixed>|WP_Error Job or error.
	 */
	public function preview( array $input, int $owner ): array|WP_Error {
		$entity     = $input['entity'] ?? 'customers';
		$permission = $this->registry->authorize( $entity );
		if ( true !== $permission ) {
			return $permission; }
		$fields  = EntityRegistry::fields( $entity );
		$adapter = $this->registry->adapter( $entity );
		$epoch   = $this->store->privacyEpoch();
		$parsed  = ( new CsvParser() )->parse( $input['csv'], $input['delimiter'] );
		if ( ! $parsed['rows'] ) {
			return Errors::validation( array( 'csv' => __( 'Add at least one data row.', 'aponto' ) ) ); }
		$error = $fields->validateMapping( $parsed['headers'], $input['mapping'] );
		if ( null !== $error ) {
			return $error;
		}
		$source = $this->selectSource( $input );
		if ( is_wp_error( $source ) ) {
			return $source;
		}
		$rows       = array();
		$identities = array();
		foreach ( $parsed['rows'] as $row ) {
			$values = $fields->normalize( $parsed['headers'], $row['cells'], $input['mapping'] );
			if ( is_wp_error( $values ) ) {
				$rows[] = array(
					'line'   => $row['line'],
					'status' => 'error',
					'values' => array(),
					'errors' => $values->get_error_data()['fields'],
				);
				continue;
			}
			$index  = count( $rows );
			$rows[] = array_merge(
				array(
					'line'   => $row['line'],
					'values' => $values,
				),
				$adapter->preview( $source['id'], $values )
			);
			if ( ! in_array( $entity, array( 'services', 'staff', 'locations' ), true ) && '' !== ( $values['external_id'] ?? '' ) ) {
				$key                  = hash( 'sha256', $values['external_id'] );
				$identities[ $key ][] = $index;
			}
		}
		// Reject ALL rows in a contradictory source identity group; never let row order choose.
		foreach ( $identities as $indexes ) {
			$emails = array_unique( array_map( static fn ( int $index ): string => 'customers' === $entity ? strtolower( trim( $rows[ $index ]['values']['email'] ) ) : (string) wp_json_encode( $rows[ $index ]['values'] ), $indexes ) );
			if ( count( $emails ) > 1 ) {
				foreach ( $indexes as $index ) {
					$rows[ $index ]['status'] = 'error';
					$rows[ $index ]['errors'] = array( 'external_id' => __( 'This source ID appears with conflicting data in the file.', 'aponto' ) );
					unset( $rows[ $index ]['target_id'] );
				}
			}
		}
		$catalog_groups = array();
		foreach ( $rows as $row ) {
			foreach ( CatalogGroups::forRow( $entity, $row['values'] ) as $key => $group ) {
				$catalog_groups[ $key ] = CatalogGroups::merge( $catalog_groups[ $key ] ?? null, $group );
			}
		}
		foreach ( $rows as &$row ) {
			$completed = CatalogGroups::completeStaff( $entity, $row['values'], static fn( $key ) => $catalog_groups[ $key ] ?? null );
			if ( $completed !== $row['values'] ) {
				unset( $row['errors'], $row['target_id'], $row['references'] );
				$row['values'] = $completed;
				$row           = array_merge( $row, $adapter->preview( $source['id'], $completed ) );
			}
			foreach ( CatalogGroups::forRow( $entity, $row['values'] ) as $key => $group ) {
				if ( $catalog_groups[ $key ]['conflict'] ) {
					$row['status'] = 'error';
					$row['errors'] = array( '_' => __( 'Repeated records have conflicting values in this file.', 'aponto' ) );
				}
			}
		}
		unset( $row );
		$job = array(
			'id'            => wp_generate_uuid4(),
			'entity'        => $entity,
			'privacy_epoch' => $epoch,
			'version'       => self::VERSION,
			'fingerprint'   => $this->fingerprint( $entity ),
			'status'        => 'ready',
			'source'        => $source,
			'total'         => count( $rows ),
			'processed'     => 0,
			'rows'          => $rows,
			'expires_at'    => $this->clock->now()->modify( '+24 hours' )->format( 'Y-m-d H:i:s' ),
		);
		return $this->transaction(
			function () use ( $job, $owner, $epoch ) {
				if ( $epoch !== $this->store->privacyEpoch( true ) ) {
					return Errors::validation( array( 'csv' => __( 'Personal data changed during preview. Review your source and upload again.', 'aponto' ) ) );
				}
				if ( $this->store->jobCount( $owner ) >= 10 ) {
						return Errors::validation( array( 'csv' => __( 'Remove an earlier import report before creating another. Ten active imports are allowed.', 'aponto' ) ) );
				}
				$this->store->createJob( $job, $owner );
				return $job;
			}
		);
	}

	/**
	 * Get an owned job.
	 *
	 * @param string $id Job UUID.
	 * @param int    $owner Acting user.
	 * @return array<string,mixed>|WP_Error Job.
	 */
	public function show( string $id, int $owner ): array|WP_Error {
		$job = $this->store->job( $id, $owner );
		if ( null === $job ) {
			return Errors::notFound(); }
		$permission = $this->registry->authorize( $job['entity'] ?? 'customers' );
		return true === $permission ? $job : $permission;
	}

	/**
	 * Process a bounded batch; retry resumes committed server progress.
	 *
	 * @param string $id Job UUID.
	 * @param int    $owner Acting user.
	 * @return array<string,mixed>|WP_Error Job.
	 */
	public function run( string $id, int $owner ): array|WP_Error {
		$effects = array();
		$result  = $this->locked(
			function ( $import_lock ) use ( $id, $owner, &$effects ) {
				$job = $this->show( $id, $owner );
				if ( is_wp_error( $job ) ) {
					return $job; }
				$entity = $job['entity'];
				if ( self::VERSION !== $job['version'] || $this->fingerprint( $entity ) !== $job['fingerprint'] ) {
					return new WP_Error( 'aponto_settings_conflict', __( 'Import fields have changed since this preview was prepared. Choose another file and upload the same CSV to prepare it again. This request did not import any records.', 'aponto' ), array( 'status' => 409 ) ); }
				if ( 'completed' === $job['status'] ) {
					return $job; }
				if ( ! in_array( $job['status'], array( 'ready', 'running' ), true ) ) {
					return Errors::settingsConflict(); }
				$adapter = $this->registry->adapter( $entity );
				$end     = min( $job['total'], $job['processed'] + self::BATCH_SIZE );
				for ( $i = $job['processed']; $i < $end; ++$i ) {
					$locks = array();
					try {
						$row = ! empty( $job['paged'] ) ? $this->store->part( $id, $owner, UploadService::key( 'row', $i ) ) : $job['rows'][ $i ];
						if ( null === $row ) {
							throw new \RuntimeException( 'Import row unavailable.' ); }
						foreach ( array( 'staff', 'location' ) as $kind ) {
							if ( isset( $row['references'][ $kind ] ) ) {
								$row['values'][ '_preview_' . $kind ] = (string) $row['references'][ $kind ]; }
						}
						$original_status = $row['status'];
						if ( $adapter instanceof RelatedCatalogAdapter && 'error' !== $row['status'] ) {
							if ( ! empty( $row['values']['staff_avatar_url'] ) || ! empty( $row['values']['service_image_url'] ) ) {
								$end = $i + 1; }
							$media = $adapter->prepareMedia( $job['source']['id'], $row['values'] );
							if ( isset( $media['values'] ) ) {
								$row['values'] = $media['values'];
							} else {
								$row = array_merge( $row, $media ); }
						}
						if ( 'error' !== $row['status'] ) {
							foreach ( $adapter->locks( $job['source']['id'], $row['values'] ) as $lock ) {
								if ( ! $lock->acquire( 5 ) ) {
									return Errors::lockTimeout(); }
								$locks[] = $lock;
							}
						}
						$deferred = null;
						if ( $adapter instanceof BookingAdapter && 'error' !== $row['status'] ) {
							// The reservation owns its transaction. Its source binding is its durable replay key.
							$source_result = $this->inTransaction(
								function () use ( $job ) {
									$this->store->ensureSource( $job['source'] );
									return array();
								},
								array_merge( array( $import_lock ), $locks )
							);
							if ( is_wp_error( $source_result ) ) {
								return $source_result; }
							$deferred = $adapter->write( $job['source']['id'], $row['values'], $row['target_id'] ?? null, $job['privacy_epoch'] ?? null );
							foreach ( $deferred['post_commit'] ?? array() as $effect ) {
								$effects[] = $effect; }
							unset( $deferred['post_commit'] );
						}
						$committed = $this->inTransaction(
							function () use ( $job, $row, $i, $adapter, $deferred, $owner, $entity, $original_status ) {
								if ( ( $job['privacy_epoch'] ?? '' ) !== $this->store->privacyEpoch( true ) ) {
											return Errors::settingsConflict(); }
								$this->store->ensureSource( $job['source'] );
								$outcome = 'error' === $row['status'] ? $row : ( $deferred ?? $adapter->write( $job['source']['id'], $row['values'], $row['target_id'] ?? null ) );
								$events  = $outcome['events'] ?? array();
								if ( isset( $outcome['event'] ) && 'customers' === $entity ) {
										$events[] = array(
											'hook' => 'aponto_customer_created',
											'args' => array( PersonName::withDisplayName( $outcome['event'] ) ),
										);
								}
								unset( $outcome['event'], $outcome['events'], $outcome['post_commit'], $row['target_id'], $row['errors'] );
								if ( ! empty( $job['paged'] ) ) {
									--$job['counts'][ $original_status ];
									++$job['counts'][ $outcome['status'] ];
									$this->store->putPart( $job['id'], $owner, UploadService::key( 'row', $i ), array_merge( $row, $outcome ), $job['expires_at'] );
								} else {
									$job['rows'][ $i ] = array_merge( $row, $outcome ); }
								$job['processed'] = $i + 1;
								$job['status']    = $job['processed'] === $job['total'] ? 'completed' : 'running';
								$this->store->saveJob( $job, $owner );
								return array(
									'job'    => $job,
									'events' => $events,
								);
							},
							array_merge( array( $import_lock ), $locks )
						);
						if ( is_wp_error( $committed ) ) {
							return $committed; }
						$job = $committed['job'];
						foreach ( $committed['events'] as $event ) {
							$effects[] = static fn() => do_action( $event['hook'], ...$event['args'] );
						}
					} finally {
						foreach ( array_reverse( $locks ) as $lock ) {
							$lock->release(); }
					}
				}
				return $job;
			}
		);
		foreach ( $effects as $effect ) {
			try {
				$effect();
			} catch ( \Throwable $failure ) {
				unset( $failure ); }
		}
		return $result;
	}

	/**
	 * Remove only an owned job, serialized against execution.
	 *
	 * @param string $id Job UUID.
	 * @param int    $owner Acting user.
	 * @return array<string,mixed>|WP_Error Result.
	 */
	public function delete( string $id, int $owner ): array|WP_Error {
		return $this->transaction(
			function () use ( $id, $owner ) {
				return $this->store->deleteJob( $id, $owner ) ? array( 'deleted' => true ) : Errors::notFound();
			}
		);
	}

	/**
	 * Select a stable existing namespace or reserve a new UUID, never resolve by label.
	 *
	 * @param array<string,mixed> $input Request.
	 * @return array{id:string,label:string}|WP_Error Source.
	 */
	public function selectSource( array $input ): array|WP_Error {
		if ( ! array_key_exists( 'source_id', $input ) && ! array_key_exists( 'source_label', $input ) ) {
			return array(
				'id'    => self::DEFAULT_SOURCE_ID,
				'label' => 'CSV import',
			);
		}
		$id    = $input['source_id'] ?? '';
		$label = $input['source_label'] ?? '';
		if ( ! is_string( $id ) || ! is_string( $label ) || ( '' !== $id && '' !== $label ) ) {
			return Errors::validation( array( 'source_id' => __( 'Choose an existing source or name a new source, not both.', 'aponto' ) ) );
		}
		if ( '' !== $id ) {
			return $this->store->source( $id ) ?? Errors::notFound();
		}
		$label = sanitize_text_field( $label );
		if ( '' === $label || mb_strlen( $label ) > 120 ) {
			return Errors::validation( array( 'source_label' => __( 'Enter a source name of 1–120 characters.', 'aponto' ) ) );
		}
		return array(
			'id'    => wp_generate_uuid4(),
			'label' => $label,
		);
	}

	/**
	 * Stable schema identity excludes translated presentation labels.
	 *
	 * @param string $entity Selected import type.
	 */
	public function fingerprint( string $entity ): string {
		$fields = array_map( static fn ( array $field ): array => array_intersect_key( $field, array_flip( array( 'key', 'type', 'required', 'aliases' ) ) ), EntityRegistry::fields( $entity )->fields() );
		return hash( 'sha256', (string) wp_json_encode( array( self::VERSION, $entity, $fields ) ) );
	}

	/**
	 * One import lock per site; no user callbacks or HTTP in its critical section.
	 *
	 * @param callable $operation Bounded transactional work.
	 * @return array<string,mixed>|WP_Error Result.
	 */
	public function transaction( callable $operation ): array|WP_Error {
		return $this->locked( fn( $lock ) => $this->inTransaction( $operation, array( $lock ) ) );
	}
	/**
	 * Serialize bounded work behind the site import lock.
	 *
	 * @param callable $operation Work under one site import lock.
	 * @return array<string,mixed>|WP_Error Result.
	 */
	private function locked( callable $operation ): array|WP_Error {
		$lock = ( new LockFactory( $this->wpdb ) )->named( 'apt:import:' . substr( hash( 'sha256', $this->wpdb->prefix ), 0, 40 ) );
		if ( ! $lock->acquire( 5 ) ) {
			return Errors::lockTimeout(); }
		try {
			return $operation( $lock ); } catch ( \Throwable $failure ) {
			return Errors::internal(); } finally {
				$lock->release(); }
	}
	/**
	 * Commit work only while every acquired lock belongs to this connection.
	 *
	 * @param callable                    $operation Transactional work.
	 * @param list<\Aponto\Database\Lock> $locks Already acquired locks.
	 * @return array<string,mixed>|WP_Error Result.
	 */
	private function inTransaction( callable $operation, array $locks ): array|WP_Error {
		$tx      = new TransactionGuard( $this->wpdb );
		$started = false;

		try {
			if ( ! $this->locksCurrent( $tx, $locks ) ) {
				return Errors::lockTimeout(); }
			$tx->beginReadCommitted();
			$started = true;
			$result  = $operation();
			if ( is_wp_error( $result ) || ! $this->locksCurrent( $tx, $locks ) ) {
				$tx->rollback();
				$started = false;
				return is_wp_error( $result ) ? $result : Errors::lockTimeout();
			}
			$tx->commit();
			$started = false;
			return $result;
		} catch ( \Throwable $failure ) {
			if ( $started ) {
				$tx->rollback(); }
			return Errors::internal();
		}
	}
	/**
	 * Re-read volatile database session identities.
	 *
	 * @param TransactionGuard            $tx Transaction guard.
	 * @param list<\Aponto\Database\Lock> $locks Acquired locks.
	 * @return bool Whether every lock still belongs to this session.
	 * @phpstan-impure
	 */
	private function locksCurrent( TransactionGuard $tx, array $locks ): bool {
		$connection = $tx->currentConnectionId();
		foreach ( $locks as $lock ) {
			if ( null === $connection || $connection !== $lock->connectionId() ) {
				return false;
			}
		}
		return true;
	}
}

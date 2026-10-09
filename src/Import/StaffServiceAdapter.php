<?php
/**
 * Additive staff-service assignment CSV import.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Import;

use Aponto\Booking\Repository\ConnectionRepository;
use Aponto\Booking\StaffLockFactory;
use Aponto\Database\Lock;
use Aponto\Database\StorageException;
use Aponto\Plan;
use Aponto\Support\Clock;

/** Resolves every foreign key through source identities; no raw source ID becomes a local ID. */
final class StaffServiceAdapter implements ImportAdapter {
	/**
	 * Construct the adapter.
	 *
	 * @param \wpdb $wpdb Database.
	 * @param Clock $clock Clock.
	 * @param Store $store Identity map.
	 */
	public function __construct( private \wpdb $wpdb, Clock $clock, private Store $store ) {
		unset( $clock ); // Uniform adapter constructor; this relation has no timestamp columns.
	}

	/**
	 * Resolve validated import data.
	 *
	 * @param string               $source Source.
	 * @param array<string,string> $values Values.
	 * @return array<string,mixed> Outcome.
	 */
	public function preview( string $source, array $values ): array {
		$refs = $this->references( $source, $values );
		if ( isset( $refs['errors'] ) ) {
			return array(
				'status' => 'error',
				'errors' => $refs['errors'],
			);
		}
		$connections = new ConnectionRepository( $this->wpdb );
		$pairs       = $connections->eligibilityForService( $refs['service_id'] );
		$this->assertRead();
		$found = false;
		foreach ( $pairs as $pair ) {
			if ( $pair['staff_id'] === $refs['staff_id'] && $pair['location_id'] === $refs['location_id'] ) {
				$found = true;
			}
			if ( $pair['staff_id'] !== $refs['staff_id'] && ! Plan::instance()->has( 'multi_staff' ) ) {
				return array(
					'status' => 'error',
					'errors' => array( 'staff_external_id' => __( 'Enable Multiple staff before assigning another staff member to this service.', 'aponto' ) ),
				);
			}
		}
		return array(
			'status'     => $found ? 'reuse' : 'create',
			'target_id'  => $refs['service_id'],
			'references' => $refs,
		);
	}

	/**
	 * Resolve validated import data.
	 *
	 * @param string               $source Source.
	 * @param array<string,string> $values Values.
	 * @return list<Lock> Locks in global order.
	 */
	public function locks( string $source, array $values ): array {
		$refs = $this->references( $source, $values );
		if ( isset( $refs['errors'] ) ) {
			return array();
		}
		$factory = new StaffLockFactory( $this->wpdb );
		$locks   = array( $factory->forStaff( $refs['staff_id'] ) );
		if ( $refs['location_id'] > 0 ) {
			$locks[] = $factory->forLocation( $refs['location_id'] );
		}
		$locks[] = $factory->forService( $refs['service_id'] );
		return $locks;
	}

	/**
	 * Resolve validated import data.
	 *
	 * @param string               $source Source.
	 * @param array<string,string> $values Values.
	 * @param int|null             $expected_target Preview target.
	 * @return array<string,mixed> Outcome.
	 */
	public function write( string $source, array $values, ?int $expected_target = null ): array {
		$result = $this->preview( $source, $values );
		if ( 'error' === $result['status'] ) {
			return $result;
		}
		if ( null !== $expected_target && $expected_target !== $result['target_id'] ) {
			return array(
				'status' => 'error',
				'errors' => array( 'service_external_id' => __( 'The mapped service changed after preview.', 'aponto' ) ),
			);
		}
		$refs   = $result['references'];
		$repo   = new ConnectionRepository( $this->wpdb );
		$before = $repo->eligibilityForService( $refs['service_id'] );
		$this->assertRead();
		$created = $repo->addForImport( $refs['service_id'], $refs['staff_id'], $refs['location_id'] );
		$after   = $repo->eligibilityForService( $refs['service_id'] );
		$this->assertRead();
		$events = $created ? array(
			array(
				'hook' => 'aponto_service_eligibility_changed',
				'args' => array(
					array(
						'service_id'  => $refs['service_id'],
						'assignments' => $after,
					),
					array(
						'service_id'  => $refs['service_id'],
						'assignments' => $before,
					),
				),
			),
		) : array();
		return array(
			'status'    => $created ? 'created' : 'reused',
			'target_id' => $refs['service_id'],
			'events'    => $events,
		);
	}

	/**
	 * Resolve exact source identities and verify referenced local rows still exist.
	 *
	 * @param string               $source Source.
	 * @param array<string,string> $values Values.
	 * @return array{staff_id:int,service_id:int,location_id:int,errors?:array<string,string>} IDs or errors.
	 */
	private function references( string $source, array $values ): array {
		$out    = array(
			'staff_id'    => 0,
			'service_id'  => 0,
			'location_id' => 0,
		);
		$errors = array();
		foreach ( array(
			'staff'    => 'staff',
			'service'  => 'services',
			'location' => 'locations',
		) as $singular => $entity ) {
			$field    = $singular . '_external_id';
			$external = $values[ $field ] ?? '';
			if ( '' === $external && 'location' === $singular ) {
				continue;
			}
			$id = '' === $external ? null : $this->store->resolve( $source, $entity, $external );
			if ( null === $id ) {
				$errors[ $field ] = __( 'Import or explicitly map this source record first, using the same source.', 'aponto' );
				continue;
			}
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Entity suffix comes from the fixed map; ID is bound.
			$exists = $this->wpdb->get_var( $this->wpdb->prepare( 'SELECT id FROM %i WHERE id = %d', $this->wpdb->prefix . 'aponto_' . $entity, $id ) );
			$this->assertRead();
			if ( null === $exists ) {
				$errors[ $field ] = __( 'The mapped record no longer exists.', 'aponto' );
				continue;
			}
			$out[ $singular . '_id' ] = $id;
		}
		if ( array() !== $errors ) {
			$out['errors'] = $errors;
		}
		return $out;
	}

	/**
	 * Fail closed on lookup errors.
	 *
	 * @throws StorageException On database failure.
	 */
	private function assertRead(): void {
		if ( '' !== $this->wpdb->last_error ) {
			// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Stable authored error; raw DB detail stays server-side.
			throw StorageException::fromWpdb( $this->wpdb, 'import assignments' );
		}
	}
}

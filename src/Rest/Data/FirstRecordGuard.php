<?php
/**
 * Race-safe create-or-adopt guard.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Rest\Data;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Database\Lock;
use Aponto\Database\LockFactory;
use Aponto\Database\TransactionGuard;

/**
 * Serializes a create-or-adopt operation that must converge on one initial row.
 *
 * This is an idempotency primitive, not a plan or product quota. Normal REST creation never uses
 * it. The onboarding wizard uses it only to make concurrent first-run submissions adopt the same
 * initial owner record (D-R42).
 */
final class FirstRecordGuard {

	/**
	 * Construct the guard.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct( private \wpdb $wpdb ) {}

	/**
	 * Create the initial record, or return the existing record selected by the caller.
	 *
	 * @param string             $scope Lock-scope discriminator.
	 * @param callable():int     $find Existing canonical record id, or 0.
	 * @param callable():int     $insert Insert and return the new id, or 0 on failure.
	 * @param callable(int):void $remove Compensating delete after a lost connection identity.
	 * @param int                $timeout Seconds to wait for the lock.
	 * @return array{status:'created'|'existing'|'locked'|'failed', id:int}
	 */
	public function create( string $scope, callable $find, callable $insert, callable $remove, int $timeout = 5 ): array {
		$guard = new TransactionGuard( $this->wpdb );
		$lock  = ( new LockFactory( $this->wpdb ) )->named( 'apt:' . substr( hash( 'sha256', $this->wpdb->prefix . '|create_first|' . $scope ), 0, 48 ) );
		if ( ! $lock->acquire( $timeout ) ) {
			return array(
				'status' => 'locked',
				'id'     => 0,
			);
		}

		try {
			$id = (int) $find();
			if ( $id > 0 ) {
				return array(
					'status' => 'existing',
					'id'     => $id,
				);
			}

			if ( ! $this->identityIntact( $lock, $guard ) ) {
				return array(
					'status' => 'locked',
					'id'     => 0,
				);
			}

			$id = (int) $insert();
			if ( $id <= 0 ) {
				return array(
					'status' => 'failed',
					'id'     => 0,
				);
			}

			if ( ! $this->identityIntact( $lock, $guard ) ) {
				$suppressed = $this->wpdb->suppress_errors( true );
				try {
					$remove( $id );
				} finally {
					$this->wpdb->suppress_errors( $suppressed );
				}

				return array(
					'status' => 'locked',
					'id'     => 0,
				);
			}

			return array(
				'status' => 'created',
				'id'     => $id,
			);
		} finally {
			if ( $this->identityIntact( $lock, $guard ) ) {
				$lock->release();
			}
		}
	}

	/**
	 * Whether the named lock still belongs to the current database session.
	 * The result can change between calls if wpdb reconnects.
	 *
	 * @phpstan-impure
	 *
	 * @param Lock             $lock Held named lock.
	 * @param TransactionGuard $guard Database-session identity reader.
	 */
	private function identityIntact( Lock $lock, TransactionGuard $guard ): bool {
		return null !== $lock->connectionId() && $lock->connectionId() === $guard->currentConnectionId();
	}
}

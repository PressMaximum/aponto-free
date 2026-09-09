<?php
/**
 * Reservation advisory lock factory (§5.6, review E5).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Booking;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Database\Lock;
use Aponto\Database\LockFactory;

/**
 * Builds the reservation advisory locks (§5.6, review E5):
 *
 *   - per-staff:           `apt:sha256(prefix|staff|id)[0:48]`
 *   - per-location:        `apt:loc:sha256(prefix|location|id)[0:48]`
 *   - per-service:         `apt:svc:sha256(prefix|service|id)[0:48]`
 *   - per-idempotency-key: `apt:idem:sha256(prefix|idem|key_hash)[0:48]`
 *
 * Locks are site-scoped via the table prefix and hashed to stay ≤ 64 chars for `GET_LOCK`.
 * GLOBAL LOCK ORDER (deadlock freedom): the idempotency lock is always acquired BEFORE any staff
 * lock; among staff locks, reschedule acquires old + new in sorted-name order; the per-location
 * lock (delete-vs-book serialization, plan-boundary R2 #8) is always acquired AFTER the staff
 * lock and only for a concrete (non-wildcard) location; the per-service lock (service
 * delete/archive-vs-book serialization, review F item 1) is always acquired LAST. The
 * location delete holds ONLY the location lock and the service delete/archive holds ONLY the
 * service lock, so no cycle exists. MySQL 5.7+/MariaDB 10.4+ support multiple named locks per
 * session.
 *
 * The lock NAMES and the acquisition ORDER above are the deadlock-freedom contract and are
 * engine-independent — they are identical on both drivers. Which driver backs them is decided
 * once, in {@see LockFactory} (D-R20): `GET_LOCK` on MySQL, and on SQLite
 * {@see \Aponto\Database\SqliteLock}, where the database serializes writers itself and a lock
 * that never blocks trivially satisfies the ordering contract.
 */
final class StaffLockFactory {

	/**
	 * Driver selection for every lock this factory hands out.
	 *
	 * @var LockFactory
	 */
	private LockFactory $locks;

	/**
	 * Construct the factory.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct( private \wpdb $wpdb ) {
		$this->locks = new LockFactory( $wpdb );
	}

	/**
	 * The lock name for a staff member.
	 *
	 * @param int $staff_id Staff id.
	 */
	public function name( int $staff_id ): string {
		return 'apt:' . substr( hash( 'sha256', $this->wpdb->prefix . '|staff|' . $staff_id ), 0, 48 );
	}

	/**
	 * A lock instance for a staff member.
	 *
	 * @param int $staff_id Staff id.
	 */
	public function forStaff( int $staff_id ): Lock {
		return $this->locks->named( $this->name( $staff_id ) );
	}

	/**
	 * The lock name for a location (delete-vs-book serialization, plan-boundary R2 #8).
	 *
	 * @param int $location_id Location id (concrete, non-wildcard).
	 */
	public function locationName( int $location_id ): string {
		return 'apt:loc:' . substr( hash( 'sha256', $this->wpdb->prefix . '|location|' . $location_id ), 0, 48 );
	}

	/**
	 * A lock instance for a location.
	 *
	 * @param int $location_id Location id (concrete, non-wildcard).
	 */
	public function forLocation( int $location_id ): Lock {
		return $this->locks->named( $this->locationName( $location_id ) );
	}

	/**
	 * The lock name for a service (delete/archive-vs-book serialization, review F item 1).
	 *
	 * @param int $service_id Service id.
	 */
	public function serviceName( int $service_id ): string {
		return 'apt:svc:' . substr( hash( 'sha256', $this->wpdb->prefix . '|service|' . $service_id ), 0, 48 );
	}

	/**
	 * A lock instance for a service.
	 *
	 * @param int $service_id Service id.
	 */
	public function forService( int $service_id ): Lock {
		return $this->locks->named( $this->serviceName( $service_id ) );
	}

	/**
	 * The lock name for an ORDER — the payment critical section (D-R38e).
	 *
	 * Every payment mutation (confirm leg, webhook, expiry cron, refund, manual PATCH) takes this
	 * lock and re-reads the order inside it, so the five actors that can change a payment state
	 * serialize against each other. It is a NEW namespace rather than a reuse of the booking's
	 * per-staff lock, and that is the point: payments contend on the ORDER, and borrowing the staff
	 * lock would make an unrelated reservation for the same staff member queue behind a gateway's
	 * HTTP call.
	 *
	 * LOCK ORDER: the payment lock is a LEAF. Every holder takes it first and takes nothing else
	 * that is not strictly beneath it — the booking transition that follows a payment
	 * (`pending → confirmed`, `pending → cancelled`) takes no staff lock, and nothing that holds a
	 * staff/location/service lock ever asks for this one. No cycle is therefore representable.
	 *
	 * @param int $order_id Order id.
	 */
	public function orderName( int $order_id ): string {
		return 'apt:pay:' . substr( hash( 'sha256', $this->wpdb->prefix . '|order|' . $order_id ), 0, 48 );
	}

	/**
	 * A lock instance for an order (payment critical section).
	 *
	 * @param int $order_id Order id.
	 */
	public function forOrder( int $order_id ): Lock {
		return $this->locks->named( $this->orderName( $order_id ) );
	}

	/**
	 * The lock name for a full-set position reorder (review F item 4): one per-site lock per
	 * reordered collection, so two concurrent full-set replacements serialize instead of
	 * interleaving their per-row position UPDATEs into duplicated positions.
	 *
	 * @param string $scope Collection scope, e.g. `services` or `service-categories`.
	 */
	public function reorderName( string $scope ): string {
		return 'apt:ord:' . substr( hash( 'sha256', $this->wpdb->prefix . '|reorder|' . $scope ), 0, 48 );
	}

	/**
	 * A lock instance for a collection reorder.
	 *
	 * @param string $scope Collection scope, e.g. `services` or `service-categories`.
	 */
	public function forReorder( string $scope ): Lock {
		return $this->locks->named( $this->reorderName( $scope ) );
	}

	/**
	 * The lock name for an idempotency key (E5: real, fast 425 for concurrent duplicates).
	 *
	 * @param string $key_hash SHA-256 hex of the raw idempotency key.
	 */
	public function idempotencyName( string $key_hash ): string {
		return 'apt:idem:' . substr( hash( 'sha256', $this->wpdb->prefix . '|idem|' . $key_hash ), 0, 48 );
	}

	/**
	 * A lock instance for an idempotency key.
	 *
	 * @param string $key_hash SHA-256 hex of the raw idempotency key.
	 */
	public function forIdempotencyKey( string $key_hash ): Lock {
		return $this->locks->named( $this->idempotencyName( $key_hash ) );
	}
}

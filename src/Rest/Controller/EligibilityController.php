<?php
/**
 * Admin `/services/{id}/eligibility` controller (rest-contract §2.18, 2026-07-18 B4/#12,
 * rev 2026-07-19 per-pair).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Rest\Controller;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Booking\Repository\ConnectionRepository;
use Aponto\Booking\StaffLockFactory;
use Aponto\Database\StorageException;
use Aponto\Database\TransactionGuard;
use Aponto\Plan;
use Aponto\Rest\Args;
use Aponto\Rest\Controller;
use Aponto\Rest\Data\ServiceGateway;
use Aponto\Rest\Errors;
use Aponto\Rest\Policy;
use Aponto\Rest\Services;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Reads and full-replaces a service's staff/location eligibility in `aponto_staff_services` via
 * {@see ConnectionRepository} — the same table the availability engine resolves, so a `PUT` is
 * reflected in availability immediately. The wire shape is PER-PAIR `assignments`
 * (`[{staff_id, location_id}]`, `location_id = 0` wildcard) so non-cartesian mappings survive
 * round-trips. The replacement is transactional: a mid-write failure rolls back and surfaces
 * `aponto_internal` 500 — never a partial-success DTO.
 *
 * CONSUMERS (D-R28, 2026-08-27): the service editor's "Staff & locations" section reads and
 * full-replaces through here — it is the ONE writer of this table from the admin. The staff
 * workspace shows the reverse direction READ-ONLY, from `service_ids` on `GET /staff/{id}`
 * ({@see ConnectionRepository::servicesForStaff()}), deliberately without an edit: a
 * full-replacement PUT driven from the staff side would drop the location pairs of every OTHER
 * service that member is not currently looking at.
 *
 * Module gate (§2.18 addendum 2026-07-19; D-R42): `GET` stays open to `manage_services`; `PUT`
 * gates the MULTI-STAFF assignment capability through `Plan::has('multi_staff')`. Staff storage
 * itself remains uncapped in every edition.
 */
final class EligibilityController implements Controller {

	/**
	 * Database handle (referential-integrity checks).
	 *
	 * @var \wpdb
	 */
	private \wpdb $wpdb;

	/**
	 * Service gateway (existence checks).
	 *
	 * @var ServiceGateway
	 */
	private ServiceGateway $services;

	/**
	 * Eligibility reader/writer.
	 *
	 * @var ConnectionRepository
	 */
	private ConnectionRepository $connections;

	/**
	 * Construct the controller.
	 *
	 * @param Services $services Service locator.
	 */
	public function __construct( Services $services ) {
		$this->wpdb        = $services->wpdb();
		$this->services    = new ServiceGateway( $services->wpdb(), $services->clock() );
		$this->connections = $services->connectionRepository();
	}

	/**
	 * Register routes.
	 *
	 * @param string $rest_namespace REST namespace.
	 */
	public function register( string $rest_namespace ): void {
		register_rest_route(
			$rest_namespace,
			'/services/(?P<id>\d+)/eligibility',
			array(
				array(
					'methods'             => 'GET',
					'permission_callback' => array( Policy::class, 'manageServices' ),
					'callback'            => array( $this, 'show' ),
					'args'                => array( 'id' => Args::argId() ),
				),
				array(
					'methods'             => 'PUT',
					'permission_callback' => array( Policy::class, 'manageServices' ),
					'callback'            => array( $this, 'replace' ),
					'args'                => array( 'id' => Args::argId() ),
				),
			)
		);
	}

	/**
	 * GET /services/{id}/eligibility.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function show( WP_REST_Request $request ) {
		$id = (int) $request->get_param( 'id' );
		if ( null === $this->services->find( $id ) ) {
			return Errors::notFound();
		}

		return new WP_REST_Response( $this->dto( $id ), 200 );
	}

	/**
	 * PUT /services/{id}/eligibility (transactional full replacement per service).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function replace( WP_REST_Request $request ) {
		$id = (int) $request->get_param( 'id' );
		if ( null === $this->services->find( $id ) ) {
			return Errors::notFound();
		}

		$fields      = array();
		$assignments = $this->assignments( $request->get_param( 'assignments' ), $fields );
		if ( array() !== $fields ) {
			return Errors::validation( $fields );
		}

		// Module gate (rest-contract §2.18 addendum 2026-07-19; D-R42): with multi_staff disabled a
		// service may map to at most ONE
		// distinct staff member — assigning two or more is 403 `aponto_plan_limit`. An empty set, or
		// the single Free staff member (at any existing location), stays valid; unknown ids still fall
		// through to the 404 referential-integrity check below. This closes the "premium surface
		// reachable from Free" finding without blocking the honest one-staff PUT.
		$distinct_staff = count( array_unique( array_map( static fn ( array $pair ): int => $pair['staff_id'], $assignments ) ) );
		if ( $distinct_staff > 1 && ! Plan::instance()->has( 'multi_staff' ) ) {
			return Errors::planLimit();
		}

		// Referential integrity: an unknown staff or (non-wildcard) location id is a 404 (mirrors
		// the category FK miss on POST /services), never a silent no-op.
		$staff_ids    = array();
		$location_ids = array();
		foreach ( $assignments as $pair ) {
			$staff_ids[] = $pair['staff_id'];
			if ( 0 !== $pair['location_id'] ) {
				$location_ids[] = $pair['location_id'];
			}
		}
		if ( ! $this->allExist( 'aponto_staff', $staff_ids ) || ! $this->allExist( 'aponto_locations', $location_ids ) ) {
			return Errors::notFound();
		}

		$locked = $this->replaceSerialized( $id, $assignments );
		if ( $locked instanceof \WP_Error ) {
			return $locked;
		}

		return new WP_REST_Response( $this->dto( $id ), 200 );
	}

	/**
	 * The eligibility replacement, serialized against in-flight reservations for this service
	 * (Codex review, D-R28).
	 *
	 * THE RACE this closes: {@see \Aponto\Booking\ReservationService} takes the per-staff lock, then
	 * the per-service lock, then opens its transaction and re-verifies eligibility under them —
	 * `isSlotFree()` calls {@see ConnectionRepository::isConnected()} and its comment already
	 * promises that "a connection removed by a concurrent eligibility edit is visible before the
	 * insert". That promise only holds if the eligibility WRITER takes the same lock, and it did
	 * not: this endpoint ran a bare transaction, so an unassign could land between the reservation's
	 * recheck and its COMMIT and a booking would commit for a staff member who was, by then, no
	 * longer eligible for the service.
	 *
	 * The fix reuses the EXISTING key — `StaffLockFactory::forService()`, the same lock
	 * `ServicesController::destroy()` and its status-bearing PATCH already hold — rather than
	 * inventing a scheme. Deadlock freedom is unchanged and needs no new argument: the documented
	 * global order is idempotency → staff → location → service, and this write, exactly like the
	 * service delete it mirrors, holds ONLY the service lock. A holder of one lock that is last in
	 * the order can never close a cycle.
	 *
	 * FAIL-CLOSED: a contended lock is `503 aponto_lock_timeout` (retryable), never an unserialized
	 * write. The E1 identity checks mirror the delete's: if wpdb reconnected — losing the lock
	 * server-side — the captured pre-image is restored and the retryable error is returned, so a
	 * replayed write can never leave assignments a reservation was not serialized against.
	 *
	 * @param int                                        $id          Service id.
	 * @param list<array{staff_id:int, location_id:int}> $assignments Distinct pairs.
	 * @return \WP_Error|null Error, or null on success.
	 */
	private function replaceSerialized( int $id, array $assignments ): ?\WP_Error {
		$guard = new TransactionGuard( $this->wpdb );
		$lock  = ( new StaffLockFactory( $this->wpdb ) )->forService( $id );
		if ( ! $lock->acquire( 3 ) ) {
			return Errors::lockTimeout();
		}

		// Pre-image for the reconnect compensation below, captured under the lock.
		$previous = $this->connections->eligibilityForService( $id );

		try {
			// E1 pre-write: if wpdb reconnected since acquire, the lock is gone server-side — abort
			// rather than write while a reservation could be mid-flight.
			if ( null === $lock->connectionId() || $lock->connectionId() !== $guard->currentConnectionId() ) {
				return Errors::lockTimeout();
			}

			try {
				$this->connections->replaceForService( $id, $assignments );
			} catch ( StorageException $e ) {
				// Rolled back inside the repository — no partial state. The SQL detail stays
				// server-side; the wire carries only the registered generic 500 (error-registry).
				unset( $e );

				return Errors::internal();
			}

			// E1 post-write: a reconnect DURING the replacement replays it on a fresh connection
			// WITHOUT the lock. Restore the captured pre-image (deterministic) and report the
			// retryable loss; the client's retry writes cleanly under a fresh lock.
			if ( null === $lock->connectionId() || $lock->connectionId() !== $guard->currentConnectionId() ) {
				$suppressed = $this->wpdb->suppress_errors( true );
				try {
					$this->connections->replaceForService( $id, $previous );
				} catch ( StorageException $restore_failure ) {
					unset( $restore_failure ); // Best-effort compensation; the error below stands.
				}
				$this->wpdb->suppress_errors( $suppressed );

				return Errors::lockTimeout();
			}

			return null;
		} finally {
			if ( null !== $lock->connectionId() && $lock->connectionId() === $guard->currentConnectionId() ) {
				$lock->release();
			}
		}
	}

	/**
	 * The eligibility DTO for a service.
	 *
	 * @param int $service_id Service id.
	 * @return array<string, mixed>
	 */
	private function dto( int $service_id ): array {
		return array(
			'service_id'  => $service_id,
			'assignments' => $this->connections->eligibilityForService( $service_id ),
		);
	}

	/**
	 * Validate the `assignments` body: a list of `{staff_id, location_id}` objects with STRICT
	 * integral ids (`staff_id >= 1` required; `location_id >= 0` optional default `0` wildcard)
	 * and distinct pairs. `[]` is valid (removes every connection).
	 *
	 * @param mixed                 $raw    Raw value.
	 * @param array<string, string> $fields Field-error accumulator (by reference).
	 * @return list<array{staff_id:int, location_id:int}>
	 */
	private function assignments( mixed $raw, array &$fields ): array {
		if ( ! is_array( $raw ) ) {
			$fields['assignments'] = __( 'A list of staff/location assignments is required.', 'aponto' );

			return array();
		}

		$pairs = array();
		$seen  = array();
		foreach ( $raw as $item ) {
			if ( ! is_array( $item ) || ! array_key_exists( 'staff_id', $item ) ) {
				$fields['assignments'] = __( 'Each assignment needs a staff_id.', 'aponto' );

				return array();
			}

			$staff_id = $this->strictInt( $item['staff_id'], 1 );
			if ( null === $staff_id ) {
				$fields['assignments'] = __( 'Every staff_id must be a positive integer.', 'aponto' );

				return array();
			}

			$location_id = 0;
			if ( array_key_exists( 'location_id', $item ) && null !== $item['location_id'] ) {
				$checked = $this->strictInt( $item['location_id'], 0 );
				if ( null === $checked ) {
					$fields['assignments'] = __( 'Every location_id must be a non-negative integer.', 'aponto' );

					return array();
				}
				$location_id = $checked;
			}

			$key = $staff_id . ':' . $location_id;
			if ( isset( $seen[ $key ] ) ) {
				$fields['assignments'] = __( 'Assignment pairs must be distinct.', 'aponto' );

				return array();
			}
			$seen[ $key ] = true;

			$pairs[] = array(
				'staff_id'    => $staff_id,
				'location_id' => $location_id,
			);
		}

		return $pairs;
	}

	/**
	 * STRICT integral parse (rest-contract §2.18): a native int, or a digits-only string. Rejects
	 * floats (including x.0), scientific notation, signs, spaces and every other `is_numeric`
	 * looseness. Returns null when invalid or below the minimum.
	 *
	 * @param mixed $raw Raw value.
	 * @param int   $min Inclusive minimum.
	 */
	private function strictInt( mixed $raw, int $min ): ?int {
		if ( is_int( $raw ) ) {
			return $raw >= $min ? $raw : null;
		}
		if ( is_string( $raw ) && 1 === preg_match( '/^\d{1,10}$/', $raw ) ) {
			$value = (int) $raw;

			return $value >= $min ? $value : null;
		}

		return null;
	}

	/**
	 * Whether every id exists in the given core table (empty list trivially true).
	 *
	 * @param string    $table_suffix Unprefixed table name.
	 * @param list<int> $ids          Ids to check.
	 */
	private function allExist( string $table_suffix, array $ids ): bool {
		$ids = array_values( array_unique( $ids ) );
		if ( array() === $ids ) {
			return true;
		}

		$table   = $this->wpdb->prefix . $table_suffix;
		$holders = implode( ', ', array_fill( 0, count( $ids ), '%d' ) );
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare -- Constant table; placeholders generated internally, values bound via prepare().
		$sql = $this->wpdb->prepare( "SELECT COUNT(DISTINCT id) FROM {$table} WHERE id IN ( {$holders} )", $ids );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared -- Prepared above; existence check.
		return (int) $this->wpdb->get_var( $sql ) === count( $ids );
	}
}

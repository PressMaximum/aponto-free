<?php
/**
 * Staff-service connection reader (§5.3, §5.6).
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
use Aponto\Database\TransactionGuard;

/**
 * Resolves which ACTIVE staff are connected to a service at a location, ordered by `(position, id)`.
 * Used both by any-staff display (one extra "connection" query — budget §5.8) and by any-staff
 * reservation candidate resolution (§5.6). A `staff_services.location_id` of `0` is a wildcard
 * covering every location.
 */
final class ConnectionRepository {

	/**
	 * Construct the repository.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct( private \wpdb $wpdb ) {}

	/**
	 * Active staff connected to a service+location, ordered `(position, id)`.
	 *
	 * @param int $service_id  Service id.
	 * @param int $location_id Location id.
	 * @return list<int> Staff ids.
	 */
	public function staffForService( int $service_id, int $location_id ): array {
		$staff       = $this->wpdb->prefix . 'aponto_staff';
		$connections = $this->wpdb->prefix . 'aponto_staff_services';

		$sql = "SELECT s.id
			FROM {$staff} s
			INNER JOIN {$connections} ss ON ss.staff_id = s.id
			WHERE s.status = 'active'
			  AND ss.service_id = %d
			  AND ( ss.location_id = %d OR ss.location_id = 0 )
			GROUP BY s.id
			ORDER BY s.position ASC, s.id ASC";

		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.PreparedSQL.NotPrepared -- SQL identifiers are internal and all values are passed to wpdb::prepare.
		$ids = $this->wpdb->get_col( $this->wpdb->prepare( $sql, $service_id, $location_id ) );

		return array_map( 'intval', (array) $ids );
	}

	/**
	 * The REVERSE read of {@see self::staffForService()}: every service one staff member is
	 * eligible for, ascending by service id and distinct (a staff member connected to the same
	 * service at three locations appears once). Added with D-R28 (2026-08-27) to back the staff
	 * workspace's read-only "Services" list — the forward direction alone would have meant one
	 * eligibility request per service to answer "what does THIS person do".
	 *
	 * Deliberately unfiltered by service status: an archived or draft service the member is still
	 * connected to is a real assignment, and hiding it would make the list disagree with what a
	 * `PUT /services/{id}/eligibility` round-trip would show. Callers that only want live services
	 * intersect with their own catalog read.
	 *
	 * @param int $staff_id Staff id.
	 * @return list<int> Service ids.
	 */
	public function servicesForStaff( int $staff_id ): array {
		$table = $this->wpdb->prefix . 'aponto_staff_services';
		$sql   = "SELECT DISTINCT service_id FROM {$table} WHERE staff_id = %d ORDER BY service_id ASC";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		$ids = $this->wpdb->get_col( $this->wpdb->prepare( $sql, $staff_id ) );

		return array_map( 'intval', (array) $ids );
	}

	/**
	 * Whether a CONCRETE staff member is connected to a service at a location (§5.3, §5.6). Mirrors
	 * the `staffForService` scope test: a `staff_services.location_id` of `0` is the wildcard covering
	 * every location, so the row matches when it targets this exact location OR the wildcard. This is
	 * the concrete-staff eligibility guard the availability engine + reservation/reschedule write
	 * models apply so a staff member NOT assigned to a service can never be offered or booked for it
	 * (Codex engine review — the any-staff path already filtered by connection; the concrete path did
	 * not). Staff status is NOT checked here — the callers verify `active` separately.
	 *
	 * @param int $staff_id    Concrete staff id.
	 * @param int $service_id  Service id.
	 * @param int $location_id Location id (0 = no-location scope).
	 */
	public function isConnected( int $staff_id, int $service_id, int $location_id ): bool {
		$table = $this->wpdb->prefix . 'aponto_staff_services';
		$sql   = "SELECT 1 FROM {$table} WHERE staff_id = %d AND service_id = %d AND ( location_id = %d OR location_id = 0 ) LIMIT 1";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare(); in-transaction eligibility guard.
		return null !== $this->wpdb->get_var( $this->wpdb->prepare( $sql, $staff_id, $service_id, $location_id ) );
	}

	/**
	 * The eligibility assignments for a service (rest-contract §2.18, rev 2026-07-19 per-pair):
	 * the EXACT `(staff_id, location_id)` row set, ordered `(staff_id, location_id)` ascending.
	 * A `location_id` of `0` is the wildcard "all locations" — the wizard's default connect scope.
	 *
	 * @param int $service_id Service id.
	 * @return list<array{staff_id:int, location_id:int}>
	 */
	public function eligibilityForService( int $service_id ): array {
		$table = $this->wpdb->prefix . 'aponto_staff_services';
		$sql   = "SELECT staff_id, location_id FROM {$table} WHERE service_id = %d ORDER BY staff_id ASC, location_id ASC";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $service_id ), ARRAY_A );

		$assignments = array();
		foreach ( (array) $rows as $row ) {
			$assignments[] = array(
				'staff_id'    => (int) $row['staff_id'],
				'location_id' => (int) $row['location_id'],
			);
		}

		return $assignments;
	}

	/**
	 * Full-replacement of a service's eligibility (rest-contract §2.18 `PUT`, rev 2026-07-19):
	 * delete every row for the service, then insert EXACTLY the given `(staff_id, location_id)`
	 * pairs — per-pair, never a cross-product, so non-cartesian mappings survive round-trips.
	 *
	 * TRANSACTIONAL (Codex review #12): the delete and every insert run in ONE transaction with
	 * each statement's result checked; any failure rolls the whole replacement back and throws —
	 * the table is never left in a partial state.
	 *
	 * NOT SELF-SERIALIZING against reservations (Codex review, D-R28). Atomicity is not enough
	 * here: the reservation write model re-checks {@see self::isConnected()} inside its own
	 * transaction and then commits, so an unassign that lands in that window produces a booking for
	 * a staff member who is no longer eligible. The serialization lives one layer up, in
	 * {@see \Aponto\Rest\Controller\EligibilityController::replaceSerialized()}, which holds the
	 * per-service lock (`StaffLockFactory::forService()`) the reservation also holds — the same
	 * arrangement the service delete/archive path uses. Any OTHER caller that adds a write path to
	 * this method must take that lock too, or it reopens the race.
	 *
	 * @param int                                        $service_id  Service id.
	 * @param list<array{staff_id:int, location_id:int}> $assignments Distinct pairs ([] removes all).
	 * @throws StorageException When any statement fails (after rollback).
	 */
	public function replaceForService( int $service_id, array $assignments ): void {
		$table = $this->wpdb->prefix . 'aponto_staff_services';
		$guard = new TransactionGuard( $this->wpdb );

		$guard->begin();
		try {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Scoped full-replacement delete inside the transaction.
			$deleted = $this->wpdb->delete( $table, array( 'service_id' => $service_id ), array( '%d' ) );
			if ( false === $deleted ) {
				throw StorageException::fromWpdb( $this->wpdb, 'eligibility delete' );
			}

			foreach ( $assignments as $pair ) {
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Full-replacement insert inside the transaction.
				$inserted = $this->wpdb->insert(
					$table,
					array(
						'staff_id'    => (int) $pair['staff_id'],
						'service_id'  => $service_id,
						'location_id' => (int) $pair['location_id'],
					),
					array( '%d', '%d', '%d' )
				);
				if ( false === $inserted ) {
					throw StorageException::fromWpdb( $this->wpdb, 'eligibility insert' );
				}
			}

			$guard->commit();
		} catch ( StorageException $e ) {
			$guard->rollback();
			throw $e;
		}
	}
}

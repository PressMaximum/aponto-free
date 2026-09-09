<?php
/**
 * Auto-link new services to the single staff member (Free).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Onboarding;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Extension\StaffPolicy;

/**
 * Keeps the Free-plan promise real: "every service is bookable by your single staff member"
 * (fleet-r1 Fix 1; findings U1 BUG-4 / U3 BUG-01). The onboarding wizard already connects its
 * first service to staff, but services created LATER — through the REST admin editor or a
 * duplicate — were never linked, so `aponto_staff_services` stayed empty and the availability
 * engine returned zero slots: the service looked bookable but every calendar day was dead.
 *
 * This listener closes that gap for EVERY create surface by riding the `aponto_service_created`
 * action ({@see \Aponto\Rest\Data\ServiceGateway::create()} fires it for the editor, duplicate and
 * the wizard). On the FREE EDITION it connects the new service to every staff row at the
 * "all locations" wildcard scope (`location_id = 0`), exactly as the wizard does. It also rides
 * `aponto_staff_created` so a service created BEFORE the first staff member exists is linked the
 * moment that staff arrives (service-before-staff ordering, r1 review item 2). On the Premium
 * multi-staff extension it does NOTHING — assignments there are a real per-service decision the
 * admin owns, never guessed. The extension contributes that policy through
 * {@see StaffPolicy::autoAssignNewServices()}, so this wp.org-owned class contains no paid-edition
 * branch. {@see self::backfillOrphans()} repairs services that were already orphaned before this
 * shipped and is driven once by
 * {@see \Aponto\Database\Migrations\Migration_0003_ServiceStaffBackfill}.
 */
final class ServiceStaffAutolink {

	/**
	 * Construct the linker.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct( private \wpdb $wpdb ) {}

	/**
	 * Wire the create-surface listeners (service created from any surface; first staff created
	 * after a service already existed).
	 */
	public function register(): void {
		add_action( 'aponto_service_created', array( $this, 'onServiceCreated' ), 10, 1 );
		add_action( 'aponto_staff_created', array( $this, 'onStaffCreated' ), 10, 0 );
	}

	/**
	 * Whether the single-staff product should create wildcard assignments.
	 */
	private function applies(): bool {
		return StaffPolicy::autoAssignNewServices();
	}

	/**
	 * A service was created from any surface — connect it to the single staff on Free.
	 *
	 * @param int $service_id New service id.
	 */
	public function onServiceCreated( int $service_id ): void {
		if ( $service_id <= 0 || ! $this->applies() ) {
			return;
		}
		foreach ( $this->staffIds() as $staff_id ) {
			$this->connect( $staff_id, $service_id );
		}
	}

	/**
	 * A staff member was created — link any service that predates staff (Free). Idempotent, so
	 * running on every staff create is safe; on the Free plan there is exactly one anyway.
	 */
	public function onStaffCreated(): void {
		$this->backfillOrphans();
	}

	/**
	 * Connect every service with ZERO staff connections to the single staff (Free). Idempotent
	 * (INSERT IGNORE). No-op on the Premium edition or when no staff exists yet.
	 *
	 * @return int Number of services newly linked.
	 */
	public function backfillOrphans(): int {
		if ( ! $this->applies() ) {
			return 0;
		}
		$staff = $this->staffIds();
		if ( array() === $staff ) {
			return 0;
		}

		$linked = 0;
		foreach ( $this->orphanServiceIds() as $service_id ) {
			foreach ( $staff as $staff_id ) {
				$this->connect( $staff_id, $service_id );
			}
			++$linked;
		}

		return $linked;
	}

	/**
	 * Ids of services with no row at all in the eligibility map (unbookable).
	 *
	 * @return list<int>
	 */
	public function orphanServiceIds(): array {
		$services = $this->wpdb->prefix . 'aponto_services';
		$links    = $this->wpdb->prefix . 'aponto_staff_services';
		$sql      = "SELECT s.id FROM {$services} s LEFT JOIN {$links} ss ON ss.service_id = s.id WHERE ss.service_id IS NULL ORDER BY s.id ASC";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; no user input.
		$ids = $this->wpdb->get_col( $sql );

		return array_map( 'intval', is_array( $ids ) ? $ids : array() );
	}

	/**
	 * All staff ids ascending (Free has exactly one; defensive for legacy multi-row data).
	 *
	 * @return list<int>
	 */
	public function staffIds(): array {
		$table = $this->wpdb->prefix . 'aponto_staff';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; no user input.
		$ids = $this->wpdb->get_col( "SELECT id FROM {$table} ORDER BY id ASC" );

		return array_map( 'intval', is_array( $ids ) ? $ids : array() );
	}

	/**
	 * Connect one staff member to a service at the "all locations" wildcard scope (idempotent).
	 *
	 * @param int $staff_id   Staff id.
	 * @param int $service_id Service id.
	 */
	private function connect( int $staff_id, int $service_id ): void {
		$table = $this->wpdb->prefix . 'aponto_staff_services';
		$sql   = "INSERT IGNORE INTO {$table} (staff_id, service_id, location_id) VALUES (%d, %d, 0)";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare(); INSERT IGNORE is idempotent on the PK.
		$this->wpdb->query( $this->wpdb->prepare( $sql, $staff_id, $service_id ) );
	}
}

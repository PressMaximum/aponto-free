<?php
/**
 * Migration 0003 — backfill orphaned service→staff links (Free).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Database\Migrations;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Onboarding\ServiceStaffAutolink;
use Aponto\Extension\StaffPolicy;

/**
 * Data migration (no DDL): connects every EXISTING service that has zero rows in
 * `aponto_staff_services` to the single staff member, so services added through the admin editor
 * before the {@see ServiceStaffAutolink} listener shipped become bookable on upgrade (fleet-r1
 * Fix 1; findings U1 BUG-4 / U3 BUG-01). Free-EDITION-only (build invariant, not a module
 * toggle): on Premium the assignment is a real per-service decision and is never guessed.
 *
 * Fresh install: migrations precede {@see \Aponto\Installation\Seeder} and no staff/services exist
 * yet, so {@see ServiceStaffAutolink::backfillOrphans()} is a no-op and the postcondition holds
 * trivially. Idempotent: the connect is `INSERT IGNORE`, so re-running links nothing new.
 */
final class Migration_0003_ServiceStaffBackfill implements Migration {

	/**
	 * Schema version this migration reaches.
	 */
	public function version(): int {
		return 3;
	}

	/**
	 * Link every orphaned service to the single staff (Free).
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function up( \wpdb $wpdb ): void {
		( new ServiceStaffAutolink( $wpdb ) )->backfillOrphans();
	}

	/**
	 * Postcondition: on the Free edition with at least one staff member, no service is left
	 * orphaned. The Premium edition is out of scope (true); when no staff exists there is nothing
	 * to link to, so an orphan is a valid post-state (true) — the {@see ServiceStaffAutolink}
	 * listener links it when the first staff member is created (`aponto_staff_created`).
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function verify( \wpdb $wpdb ): bool {
		if ( ! StaffPolicy::autoAssignNewServices() ) {
			return true;
		}

		$linker = new ServiceStaffAutolink( $wpdb );
		if ( array() === $linker->staffIds() ) {
			return true;
		}

		return array() === $linker->orphanServiceIds();
	}
}

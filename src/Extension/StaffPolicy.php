<?php
/**
 * Edition-neutral staff-capability extension seam.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Extension;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/** Defines the single-staff service auto-assignment extension seam. */
final class StaffPolicy {

	/** Whether newly created services should be linked to the single staff row. */
	public static function autoAssignNewServices(): bool {
		/**
		 * Filter the single-staff product's automatic service assignment.
		 *
		 * @param bool $auto_assign Whether core should create the wildcard link.
		 */
		return (bool) apply_filters( 'aponto_auto_assign_single_staff', true );
	}
}

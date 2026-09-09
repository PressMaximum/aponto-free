<?php
/**
 * Capability management.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Installation;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * The four Aponto management capabilities (§6.3), granted to administrators on activation and
 * removed on uninstall.
 */
final class Capabilities {

	/**
	 * Managed capabilities.
	 *
	 * @var list<string>
	 */
	public const CAPS = array(
		'aponto_manage_settings',
		'aponto_manage_services',
		'aponto_manage_staff',
		'aponto_manage_bookings',
	);

	/**
	 * Grant all Aponto capabilities to the administrator role (idempotent).
	 */
	public static function grant(): void {
		$role = get_role( 'administrator' );
		if ( null === $role ) {
			return;
		}

		foreach ( self::CAPS as $cap ) {
			if ( ! $role->has_cap( $cap ) ) {
				$role->add_cap( $cap );
			}
		}
	}

	/**
	 * Remove all Aponto capabilities from the administrator role (idempotent).
	 */
	public static function revoke(): void {
		$role = get_role( 'administrator' );
		if ( null === $role ) {
			return;
		}

		foreach ( self::CAPS as $cap ) {
			$role->remove_cap( $cap );
		}
	}
}

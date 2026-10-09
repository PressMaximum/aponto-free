<?php
/**
 * REST permission policy (capability map, SPEC-P0 §6.3).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Rest;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * Named WP REST `permission_callback`s backed by the central capability map. A logged-out request
 * yields `401 aponto_unauthenticated`; an authenticated request lacking the capability yields
 * `403 aponto_forbidden`. Public routes use WordPress's literal `__return_true` callback (D-R46).
 */
final class Policy {

	/**
	 * Capability for managing services + categories.
	 */
	public const MANAGE_SERVICES = 'aponto_manage_services';

	/**
	 * Capability for managing staff, schedules and blocked periods.
	 */
	public const MANAGE_STAFF = 'aponto_manage_staff';

	/**
	 * Capability for managing bookings + customers + exports.
	 */
	public const MANAGE_BOOKINGS = 'aponto_manage_bookings';

	/**
	 * Capability for managing settings, modules, notifications and diagnostics.
	 */
	public const MANAGE_SETTINGS = 'aponto_manage_settings';

	/**
	 * Require permission to manage services and categories.
	 *
	 * @return true|\WP_Error
	 */
	public static function manageServices() {
		return self::check( self::MANAGE_SERVICES );
	}

	/**
	 * Require permission to manage staff, schedules and blocked periods.
	 *
	 * @return true|\WP_Error
	 */
	public static function manageStaff() {
		return self::check( self::MANAGE_STAFF );
	}

	/**
	 * Require permission to manage bookings, customers and exports.
	 *
	 * @return true|\WP_Error
	 */
	public static function manageBookings() {
		return self::check( self::MANAGE_BOOKINGS );
	}

	/**
	 * Require permission to manage settings, modules, notifications and diagnostics.
	 *
	 * @return true|\WP_Error
	 */
	public static function manageSettings() {
		return self::check( self::MANAGE_SETTINGS );
	}

	/**
	 * Customer CSV import uses the customer capability and the feature gate (D-R72).
	 *
	 * @return true|\WP_Error
	 */
	public static function importCustomers() {
		$permission = self::manageBookings();
		if ( true !== $permission ) {
			return $permission;
		}
		return \Aponto\Plan::instance()->has( 'csv_import' ) ? true : Errors::notFound();
	}

	/**
	 * Entity-specific capability is checked again by the import application service.
	 *
	 * @return true|\WP_Error
	 */
	public static function importData() {
		if ( ! is_user_logged_in() ) {
			return Errors::unauthenticated(); }
		if ( ! \Aponto\Plan::instance()->has( 'csv_import' ) ) {
			return Errors::notFound(); }
		foreach ( array( self::MANAGE_BOOKINGS, self::MANAGE_SERVICES, self::MANAGE_STAFF, self::MANAGE_SETTINGS ) as $cap ) {
			if ( current_user_can( $cap ) ) {
				return true; }
		}
		return Errors::forbidden();
	}

	/** Require authentication and a domain capability before export reads. */
	public static function exportData(): bool|\WP_Error {
		if ( ! is_user_logged_in() ) {
			return Errors::unauthenticated();
		}
		foreach ( array( self::MANAGE_BOOKINGS, self::MANAGE_SERVICES, self::MANAGE_STAFF, self::MANAGE_SETTINGS ) as $cap ) {
			if ( current_user_can( $cap ) ) {
				return true;
			}
		}
		return Errors::forbidden();
	}

	/**
	 * Apply the shared 401/403 capability policy behind every named private callback.
	 *
	 * @param string $capability Capability slug.
	 * @return true|\WP_Error
	 */
	private static function check( string $capability ) {
		if ( ! is_user_logged_in() ) {
			return Errors::unauthenticated();
		}
		if ( ! current_user_can( $capability ) ) {
			return Errors::forbidden();
		}

		return true;
	}
}

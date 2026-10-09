<?php
/**
 * Admin `/preferences/bookings-table` controller (D-R74, rest-contract §2.23).
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

use Aponto\Admin\BookingsTablePreferences;
use Aponto\Rest\Controller;
use Aponto\Rest\Errors;
use Aponto\Rest\Policy;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Saves and resets the CURRENT user's Bookings list column layout. There is no read route: the
 * admin page boots with the stored layout ({@see \Aponto\Admin\AdminPage}), so the list paints
 * the operator's columns on first render instead of the defaults followed by a jump.
 *
 * The write only ever touches the caller's own user option, so it carries the same capability as
 * the list it shapes — anyone who can see the Bookings list can arrange their own copy of it.
 */
final class PreferencesController implements Controller {

	/**
	 * Register routes.
	 *
	 * @param string $rest_namespace REST namespace.
	 */
	public function register( string $rest_namespace ): void {
		register_rest_route(
			$rest_namespace,
			'/preferences/bookings-table',
			array(
				array(
					'methods'             => 'PUT',
					'permission_callback' => array( Policy::class, 'manageBookings' ),
					'callback'            => array( $this, 'save' ),
				),
				array(
					'methods'             => 'DELETE',
					'permission_callback' => array( Policy::class, 'manageBookings' ),
					'callback'            => array( $this, 'reset' ),
				),
			)
		);
	}

	/**
	 * PUT /preferences/bookings-table — store the caller's layout.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function save( WP_REST_Request $request ) {
		$fields = array();
		$layout = BookingsTablePreferences::sanitize(
			array(
				'column_visibility' => $request->get_param( 'column_visibility' ),
				'column_order'      => $request->get_param( 'column_order' ),
			),
			$fields
		);
		if ( null === $layout ) {
			return Errors::validation( $fields );
		}
		BookingsTablePreferences::save( get_current_user_id(), $layout );

		return new WP_REST_Response(
			array(
				// An object even when empty, so the JSON is `{}` and never `[]`.
				'column_visibility' => (object) $layout['column_visibility'],
				'column_order'      => $layout['column_order'],
			),
			200
		);
	}

	/**
	 * DELETE /preferences/bookings-table — forget the caller's layout (back to the defaults).
	 *
	 * @return WP_REST_Response
	 */
	public function reset(): WP_REST_Response {
		BookingsTablePreferences::delete( get_current_user_id() );

		return new WP_REST_Response( array( 'deleted' => true ), 200 );
	}
}

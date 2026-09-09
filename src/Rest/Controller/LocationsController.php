<?php
/**
 * Read-only admin `/locations` controller.
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

use Aponto\Rest\Args;
use Aponto\Rest\Controller;
use Aponto\Rest\Data\LocationGateway;
use Aponto\Rest\Errors;
use Aponto\Rest\Policy;
use Aponto\Rest\Services;
use Aponto\Rest\Support\Format;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Read optional location rows needed by core consumers after a module downgrade (D-R43).
 *
 * Named-location mutation routes are contributed only by the separately distributed Premium
 * `multi_location` provider. Keeping reads in core lets existing bookings keep resolving without
 * placing paid management implementation in the Free archive.
 */
final class LocationsController implements Controller {

	/**
	 * Location data gateway.
	 *
	 * @var LocationGateway
	 */
	private LocationGateway $gateway;

	/**
	 * Construct the controller.
	 *
	 * @param Services $services REST service locator.
	 */
	public function __construct( Services $services ) {
		$this->gateway = new LocationGateway( $services->wpdb() );
	}

	/**
	 * Register the core read-only routes.
	 *
	 * @param string $rest_namespace REST namespace.
	 */
	public function register( string $rest_namespace ): void {
		register_rest_route(
			$rest_namespace,
			'/locations',
			array(
				'methods'             => 'GET',
				'permission_callback' => array( Policy::class, 'manageSettings' ),
				'callback'            => array( $this, 'index' ),
				'args'                => array(
					'status'   => Args::argEnum( array( 'active', 'archived', 'all' ), 'active' ),
					'search'   => Args::argSearch(),
					'page'     => Args::argPage(),
					'per_page' => Args::argPerPage(),
				),
			)
		);

		register_rest_route(
			$rest_namespace,
			'/locations/(?P<id>\d+)',
			array(
				'methods'             => 'GET',
				'permission_callback' => array( Policy::class, 'manageSettings' ),
				'callback'            => array( $this, 'show' ),
				'args'                => array( 'id' => Args::argId() ),
			)
		);
	}

	/**
	 * GET /locations.
	 *
	 * @param WP_REST_Request $request Request.
	 */
	public function index( WP_REST_Request $request ): WP_REST_Response {
		$page     = (int) $request->get_param( 'page' );
		$per_page = (int) $request->get_param( 'per_page' );
		$result   = $this->gateway->list(
			(string) $request->get_param( 'status' ),
			(string) $request->get_param( 'search' ),
			$page,
			$per_page
		);

		return new WP_REST_Response(
			Format::envelope( array_map( array( $this, 'toDto' ), $result['items'] ), $page, $per_page, $result['total'] ),
			200
		);
	}

	/**
	 * GET /locations/{id}.
	 *
	 * @param WP_REST_Request $request Request.
	 */
	public function show( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$row = $this->gateway->find( (int) $request->get_param( 'id' ) );
		if ( null === $row ) {
			return Errors::notFound();
		}

		return new WP_REST_Response( $this->toDto( $row ), 200 );
	}

	/**
	 * Serialize a location row.
	 *
	 * @param array<string, mixed> $row Location row.
	 * @return array<string, mixed>
	 */
	private function toDto( array $row ): array {
		return array(
			'id'            => (int) $row['id'],
			'name'          => (string) $row['name'],
			'address_line1' => (string) $row['address_line1'],
			'address_line2' => (string) $row['address_line2'],
			'city'          => (string) $row['city'],
			'region'        => (string) $row['region'],
			'postal_code'   => (string) $row['postal_code'],
			'country'       => (string) $row['country'],
			'phone'         => (string) $row['phone'],
			'timezone'      => Format::stringOrNull( $row['timezone'] ),
			'status'        => (string) $row['status'],
		);
	}
}

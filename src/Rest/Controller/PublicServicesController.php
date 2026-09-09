<?php
/**
 * Public `/public/services` controller (rest-contract §3.1).
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

use Aponto\Rest\Controller;
use Aponto\Rest\Data\PublicGateway;
use Aponto\Rest\Errors;
use Aponto\Rest\Policy;
use Aponto\Rest\Services;
use Aponto\Rest\Support\Format;
use WP_REST_Request;
use WP_REST_Response;

/**
 * The public active-service catalogue with categories. Unknown query params are rejected to keep the
 * allow-list tight (D-21).
 */
final class PublicServicesController implements Controller {

	/**
	 * WP-internal query params tolerated on the public allow-list.
	 *
	 * @var list<string>
	 */
	private const ALLOWED_PARAMS = array( '_locale', '_envelope', '_method', '_wpnonce', '_embed', '_fields', 'context', 'rest_route' );

	/**
	 * Public read gateway.
	 *
	 * @var PublicGateway
	 */
	private PublicGateway $gateway;

	/**
	 * Construct the controller.
	 *
	 * @param Services $services Service locator.
	 */
	public function __construct( private Services $services ) {
		$this->gateway = new PublicGateway( $services->wpdb() );
	}

	/**
	 * Register routes.
	 *
	 * @param string $rest_namespace REST namespace.
	 */
	public function register( string $rest_namespace ): void {
		register_rest_route(
			$rest_namespace,
			'/public/services',
			array(
				'methods'             => 'GET',
				'permission_callback' => '__return_true',
				'callback'            => array( $this, 'index' ),
			)
		);
	}

	/**
	 * GET /public/services.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function index( WP_REST_Request $request ) {
		foreach ( array_keys( $request->get_query_params() ) as $param ) {
			if ( ! in_array( $param, self::ALLOWED_PARAMS, true ) ) {
				return Errors::validation( array( $param => __( 'Unexpected parameter.', 'aponto' ) ) );
			}
		}

		$currency    = (string) $this->services->settings()->get( 'currency' );
		$categories  = $this->gateway->categories();
		$name_by_id  = array();
		$category_dt = array();
		foreach ( $categories as $category ) {
			$name_by_id[ (int) $category['id'] ] = (string) $category['name'];
			$category_dt[]                       = array(
				'id'       => (int) $category['id'],
				'name'     => (string) $category['name'],
				'position' => (int) $category['position'],
				'count'    => (int) $category['count'],
			);
		}

		$items = array();
		foreach ( $this->gateway->activeServices() as $service ) {
			$category_id = Format::intOrNull( $service['category_id'] );
			$items[]     = array(
				'id'               => (int) $service['id'],
				'name'             => (string) $service['name'],
				'description'      => (string) $service['description'],
				'duration_minutes' => (int) $service['duration_minutes'],
				'price_minor'      => Format::intOrNull( $service['price_minor'] ),
				'currency'         => $currency,
				'category'         => ( null !== $category_id && isset( $name_by_id[ $category_id ] ) )
					? array(
						'id'   => $category_id,
						'name' => $name_by_id[ $category_id ],
					)
					: null,
			);
		}

		return new WP_REST_Response(
			array(
				'items'      => $items,
				'categories' => $category_dt,
			),
			200
		);
	}
}

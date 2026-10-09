<?php
/**
 * Private import-compatible export reads.
 *
 * @package Aponto
 */

declare(strict_types=1);
namespace Aponto\Rest\Controller;

use Aponto\Export\CsvExport;
use Aponto\Rest\Controller;
use Aponto\Rest\Errors;
use Aponto\Rest\Policy;
use Aponto\Rest\Services;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/** Authenticated export transport. */
final class ExportsController implements Controller {
	/**
	 * Export service.
	 *
	 * @var CsvExport
	 */
	private CsvExport $export;
	/**
	 * Construct controller.
	 *
	 * @param Services $services Shared services.
	 */
	public function __construct( Services $services ) {
		$this->export = new CsvExport( $services->wpdb(), $services->clock() );
	}
	/**
	 * Register private reads.
	 *
	 * @param string $rest_namespace API namespace.
	 */
	public function register( string $rest_namespace ): void {
		foreach ( array( 'schema', 'rows' ) as $action ) {
			register_rest_route(
				$rest_namespace,
				'/exports/' . $action,
				array(
					'methods'             => 'GET',
					'permission_callback' => array( Policy::class, 'exportData' ),
					'callback'            => array( $this, $action ),
				)
			);
		}
	}
	/**
	 * List authorized choices.
	 */
	public function schema(): WP_REST_Response {
		return $this->response( $this->export->schema() );
	}
	/**
	 * Validate pagination.
	 *
	 * @param WP_REST_Request $request Request.
	 */
	public function rows( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$entity = $request->get_param( 'entity' );
		$offset = $request->get_param( 'offset' ) ?? 0;
		if ( ! is_string( $entity ) || ! is_scalar( $offset ) || ! preg_match( '/^[0-9]{1,9}$/', (string) $offset ) ) {
			return Errors::validation( array( 'export' => __( 'Choose a data type and a valid export offset.', 'aponto' ) ) );
		}
		$result = $this->export->page( $entity, (int) $offset );
		return is_wp_error( $result ) ? $result : $this->response( $result );
	}
	/**
	 * Prevent caching.
	 *
	 * @param array<string,mixed> $data Response data.
	 */
	private function response( array $data ): WP_REST_Response {
		$response = new WP_REST_Response( $data );
		$response->header( 'Cache-Control', 'private, no-store' );
		return $response;
	}
}

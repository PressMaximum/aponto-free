<?php
/**
 * Private CSV import REST surface (D-R72, docs/import-css/CONTRACT.md).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Rest\Controller;

use Aponto\Import\ImportService;
use Aponto\Import\UploadService;
use Aponto\Rest\Controller;
use Aponto\Rest\Errors;
use Aponto\Rest\Policy;
use Aponto\Rest\Services;
use Aponto\Rest\Support\RawResponse;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/** Input and permission boundary; domain work lives in ImportService. */
final class ImportsController implements Controller {
	/**
	 * Import application service.
	 *
	 * @var ImportService
	 */
	private ImportService $imports;
	/**
	 * Bounded upload and preview preparation.
	 *
	 * @var UploadService
	 */
	private UploadService $uploads;

	/**
	 * Construct controller.
	 *
	 * @param Services $services Shared services.
	 */
	public function __construct( Services $services ) {
		$this->imports = new ImportService( $services->wpdb(), $services->clock() );
		$this->uploads = new UploadService( $services->wpdb(), $services->clock() );
	}

	/**
	 * Literal named permission policies on every route.
	 *
	 * @param string $rest_namespace REST namespace.
	 */
	public function register( string $rest_namespace ): void {
		register_rest_route(
			$rest_namespace,
			'/imports/uploads',
			array(
				'methods'             => 'POST',
				'permission_callback' => array( Policy::class, 'importData' ),
				'callback'            => array( $this, 'upload' ),
			)
		);
		register_rest_route(
			$rest_namespace,
			'/imports/(?P<id>[a-f0-9-]{36})/chunks/(?P<index>[0-9]+)',
			array(
				'methods'             => 'PUT',
				'permission_callback' => array( Policy::class, 'importData' ),
				'callback'            => array( $this, 'chunk' ),
			)
		);
		foreach ( array(
			'inspect-upload' => 'inspectUpload',
			'prepare'        => 'prepareUpload',
			'rows'           => 'rows',
		) as $path => $callback ) {
			register_rest_route(
				$rest_namespace,
				'/imports/(?P<id>[a-f0-9-]{36})/' . $path,
				array(
					'methods'             => 'rows' === $path ? 'GET' : 'POST',
					'permission_callback' => array( Policy::class, 'importData' ),
					'callback'            => array( $this, $callback ),
				)
			);
		}
		foreach ( array( 'schema', 'template', 'inspect', 'preview' ) as $action ) {
			register_rest_route(
				$rest_namespace,
				'/imports/' . $action,
				array(
					'methods'             => in_array( $action, array( 'schema', 'template' ), true ) ? 'GET' : 'POST',
					'permission_callback' => array( Policy::class, 'importData' ),
					'callback'            => array( $this, $action ),
				)
			);
		}
		register_rest_route(
			$rest_namespace,
			'/imports/(?P<id>[a-f0-9-]{36})',
			array(
				array(
					'methods'             => 'GET',
					'permission_callback' => array( Policy::class, 'importData' ),
					'callback'            => array( $this, 'show' ),
				),
				array(
					'methods'             => 'DELETE',
					'permission_callback' => array( Policy::class, 'importData' ),
					'callback'            => array( $this, 'delete' ),
				),
			)
		);
		register_rest_route(
			$rest_namespace,
			'/imports/(?P<id>[a-f0-9-]{36})/run',
			array(
				'methods'             => 'POST',
				'permission_callback' => array( Policy::class, 'importData' ),
				'callback'            => array( $this, 'run' ),
			)
		);
	}

	/**
	 * Read the declared result.
	 *
	 * @param WP_REST_Request $request Request with an optional entity key.
	 * @return WP_REST_Response|WP_Error Current schema. */
	public function schema( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$entity = $request->get_param( 'entity' ) ?? '';
		return ! is_string( $entity ) ? Errors::validation( array( 'entity' => __( 'Choose an import type.', 'aponto' ) ) ) : $this->respond( fn () => $this->imports->schema( $entity ) );
	}

	/**
	 * Read the declared result.
	 *
	 * @param WP_REST_Request $request Request with an optional entity key.
	 * @return WP_REST_Response|WP_Error CSV template. */
	public function template( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$entity = $request->get_param( 'entity' ) ?? 'customers';
		if ( ! is_string( $entity ) ) {
			return Errors::validation( array( 'entity' => __( 'Choose an import type.', 'aponto' ) ) ); }
		$content = $this->imports->template( $entity );
		if ( is_wp_error( $content ) ) {
			return $content; }
		return RawResponse::make(
			$content,
			'text/csv; charset=UTF-8',
			array(
				'Content-Disposition' => 'attachment; filename="aponto-' . sanitize_key( $entity ) . '-template.csv"',
				'Cache-Control'       => 'private, no-store',
			)
		);
	}

	/**
	 * Inspect upload in memory only.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error Inspection.
	 */
	public function inspect( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$input = $this->input( $request );
		return is_wp_error( $input ) ? $input : $this->respond( fn () => $this->imports->inspect( $input['csv'], $input['delimiter'], $input['entity'] ) );
	}

	/**
	 * Create private preview.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error Preview.
	 */
	public function preview( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$input = $this->input( $request );
		if ( is_wp_error( $input ) ) {
			return $input;
		}
		$mapping = $request->get_param( 'mapping' );
		if ( ! is_array( $mapping ) ) {
			return Errors::validation( array( 'mapping' => __( 'Map each column or explicitly ignore it.', 'aponto' ) ) );
		}
		$input['mapping'] = $mapping;
		foreach ( array( 'source_id', 'source_label' ) as $source_key ) {
			if ( $request->has_param( $source_key ) ) {
				$input[ $source_key ] = $request->get_param( $source_key );
			}
		}
		return $this->respond( fn () => $this->imports->preview( $input, get_current_user_id() ) );
	}

	/**
	 * Read owned job.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error Job.
	 */
	public function show( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		return $this->respond( fn () => $this->imports->show( (string) $request['id'], get_current_user_id() ) );
	}

	/**
	 * Run a bounded batch.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error Job.
	 */
	public function run( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		return $this->respond( fn () => $this->imports->run( (string) $request['id'], get_current_user_id() ) );
	}

	/**
	 * Delete preview/report only.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error Result.
	 */
	public function delete( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		return $this->respond( fn () => $this->imports->delete( (string) $request['id'], get_current_user_id() ) );
	}

	/**
	 * Create an encrypted, resumable upload.
	 *
	 * @param WP_REST_Request $request Authenticated upload request.
	 * @return WP_REST_Response|WP_Error Operation result.
	 */
	public function upload( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$input = $request->get_json_params();
		return ! is_array( $input ) ? Errors::validation( array( 'file' => __( 'Provide upload details.', 'aponto' ) ) ) : $this->respond( fn () => $this->uploads->create( $input, get_current_user_id() ) );
	}
	/**
	 * Accept one bounded upload part.
	 *
	 * @param WP_REST_Request $request Authenticated upload request.
	 * @return WP_REST_Response|WP_Error Operation result.
	 */
	public function chunk( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$data = $request->get_param( 'data' );
		return ! is_string( $data ) ? Errors::validation( array( 'file' => __( 'Provide an upload chunk.', 'aponto' ) ) ) : $this->respond( fn () => $this->uploads->chunk( (string) $request['id'], get_current_user_id(), (int) $request['index'], $data ) );
	}
	/**
	 * Inspect only a small sample.
	 *
	 * @param WP_REST_Request $request Authenticated upload request.
	 * @return WP_REST_Response|WP_Error Operation result.
	 */
	public function inspectUpload( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		return $this->respond( fn () => $this->uploads->inspect( (string) $request['id'], get_current_user_id() ) );
	}
	/**
	 * Advance bounded validation.
	 *
	 * @param WP_REST_Request $request Authenticated upload request.
	 * @return WP_REST_Response|WP_Error Operation result.
	 */
	public function prepareUpload( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$mapping = $request->get_param( 'mapping' );
		if ( null !== $mapping && ! is_array( $mapping ) ) {
			return Errors::validation( array( 'mapping' => __( 'Provide column mappings.', 'aponto' ) ) ); }
		return $this->respond( fn () => $this->uploads->prepare( (string) $request['id'], get_current_user_id(), $mapping ) );
	}
	/**
	 * Bounded preview/report page.
	 *
	 * @param WP_REST_Request $request Authenticated upload request.
	 * @return WP_REST_Response|WP_Error Operation result.
	 */
	public function rows( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$offset = $request->get_param( 'offset' ) ?? 0;
		$limit  = $request->get_param( 'limit' ) ?? 25;
		if ( ! is_scalar( $offset ) || ! is_scalar( $limit ) || ! ctype_digit( (string) $offset ) || ! ctype_digit( (string) $limit ) ) {
			return Errors::validation( array( 'page' => __( 'Choose a valid report page.', 'aponto' ) ) ); }
		return $this->respond( fn () => $this->uploads->rows( (string) $request['id'], get_current_user_id(), (int) $offset, (int) $limit ) );
	}

	/**
	 * Validate types before domain work or implicit coercion.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return array{csv:string,delimiter:string,entity:string}|WP_Error Input.
	 */
	private function input( WP_REST_Request $request ): array|WP_Error {
		$entity    = $request->get_param( 'entity' ) ?? 'customers';
		$csv       = $request->get_param( 'csv' );
		$delimiter = $request->get_param( 'delimiter' ) ?? ',';
		if ( ! is_string( $csv ) || ! is_string( $delimiter ) || ! is_string( $entity ) ) {
			return Errors::validation( array( 'csv' => __( 'Provide CSV text and a supported delimiter.', 'aponto' ) ) );
		}
		return array(
			'entity'    => $entity,
			'csv'       => $csv,
			'delimiter' => $delimiter,
		);
	}

	/**
	 * Safe exception boundary and no-cache response for contact data.
	 *
	 * @param callable $operation Application operation.
	 * @return WP_REST_Response|WP_Error REST result.
	 */
	private function respond( callable $operation ): WP_REST_Response|WP_Error {
		try {
			$result = $operation();
		} catch ( \InvalidArgumentException $invalid ) {
			return Errors::validation( array( 'csv' => $invalid->getMessage() ) );
		} catch ( \Throwable $failure ) {
			return Errors::internal();
		}
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		if ( is_array( $result ) && ! empty( $result['paged'] ) ) {
			unset( $result['parser'] ); }
		$response = new WP_REST_Response( $result, 200 );
		$response->header( 'Cache-Control', 'private, no-store' );
		return $response;
	}
}

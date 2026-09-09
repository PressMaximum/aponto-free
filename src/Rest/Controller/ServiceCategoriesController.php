<?php
/**
 * Admin `/service-categories` controller (rest-contract §2.4).
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

use Aponto\Booking\StaffLockFactory;
use Aponto\Database\TransactionGuard;
use Aponto\Rest\Args;
use Aponto\Rest\Controller;
use Aponto\Rest\Data\CategoryGateway;
use Aponto\Rest\Errors;
use Aponto\Rest\Policy;
use Aponto\Rest\RequestValidator;
use Aponto\Rest\Services;
use Aponto\Rest\Support\Format;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Service-category CRUD and reorder. The list uses a fixed `per_page=100` envelope and each DTO
 * carries a live `count` of services in the category. Categories are always deletable: delete first
 * nulls `category_id` on every member service (reported as `services_uncategorized`) and then
 * removes the row, so there is no `409 aponto_has_dependents` path (§2.4, D-09).
 */
final class ServiceCategoriesController implements Controller {

	/**
	 * Category data gateway.
	 *
	 * @var CategoryGateway
	 */
	private CategoryGateway $gateway;

	/**
	 * Database handle (reorder serialization lock + connection identity — review F item 4).
	 *
	 * @var \wpdb
	 */
	private \wpdb $wpdb;

	/**
	 * Construct the controller.
	 *
	 * @param Services $services Service locator.
	 */
	public function __construct( Services $services ) {
		$this->wpdb    = $services->wpdb();
		$this->gateway = new CategoryGateway( $services->wpdb() );
	}

	/**
	 * Register routes.
	 *
	 * @param string $rest_namespace REST namespace.
	 */
	public function register( string $rest_namespace ): void {
		register_rest_route(
			$rest_namespace,
			'/service-categories',
			array(
				array(
					'methods'             => 'GET',
					'permission_callback' => array( Policy::class, 'manageServices' ),
					'callback'            => array( $this, 'index' ),
				),
				array(
					'methods'             => 'POST',
					'permission_callback' => array( Policy::class, 'manageServices' ),
					'callback'            => array( $this, 'create' ),
				),
			)
		);

		register_rest_route(
			$rest_namespace,
			'/service-categories/(?P<id>\d+)',
			array(
				array(
					'methods'             => 'PATCH',
					'permission_callback' => array( Policy::class, 'manageServices' ),
					'callback'            => array( $this, 'update' ),
					'args'                => array( 'id' => Args::argId() ),
				),
				array(
					'methods'             => 'DELETE',
					'permission_callback' => array( Policy::class, 'manageServices' ),
					'callback'            => array( $this, 'destroy' ),
					'args'                => array( 'id' => Args::argId() ),
				),
			)
		);

		register_rest_route(
			$rest_namespace,
			'/service-categories/reorder',
			array(
				'methods'             => 'POST',
				'permission_callback' => array( Policy::class, 'manageServices' ),
				'callback'            => array( $this, 'reorder' ),
			)
		);
	}

	/**
	 * GET /service-categories.
	 */
	public function index(): WP_REST_Response {
		$items = array_map( array( $this, 'toDto' ), $this->gateway->list() );

		return new WP_REST_Response( Format::envelope( $items, 1, 100, count( $items ) ), 200 );
	}

	/**
	 * POST /service-categories.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function create( WP_REST_Request $request ) {
		$validator = new RequestValidator();
		$name      = $validator->name( 'name', $request->get_param( 'name' ) );
		$position  = $this->validatePosition( $request, $validator );

		if ( $validator->failed() ) {
			return Errors::validation( $validator->errors() );
		}

		if ( null === $position ) {
			$position = $this->gateway->maxPosition() + 1;
		}

		$id = $this->gateway->create(
			array(
				'name'     => $name,
				'position' => $position,
			)
		);

		return $this->respondWith( $id, 201 );
	}

	/**
	 * PATCH /service-categories/{id}.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function update( WP_REST_Request $request ) {
		$id = (int) $request->get_param( 'id' );
		if ( null === $this->gateway->find( $id ) ) {
			return Errors::notFound();
		}

		$validator = new RequestValidator();
		$name      = $validator->name( 'name', $request->get_param( 'name' ) );
		if ( $validator->failed() ) {
			return Errors::validation( $validator->errors() );
		}

		$this->gateway->update( $id, array( 'name' => $name ) );

		return $this->respondWith( $id, 200 );
	}

	/**
	 * DELETE /service-categories/{id}.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function destroy( WP_REST_Request $request ) {
		$id = (int) $request->get_param( 'id' );
		if ( null === $this->gateway->find( $id ) ) {
			return Errors::notFound();
		}

		$uncategorized = $this->gateway->uncategorize( $id );
		$this->gateway->delete( $id );

		return new WP_REST_Response(
			array(
				'deleted'                => true,
				'id'                     => $id,
				'services_uncategorized' => $uncategorized,
			),
			200
		);
	}

	/**
	 * POST /service-categories/reorder.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function reorder( WP_REST_Request $request ) {
		$raw = $request->get_param( 'ids' );
		if ( ! is_array( $raw ) || array() === $raw ) {
			return Errors::validation( array( 'ids' => __( 'A non-empty list of ids is required.', 'aponto' ) ) );
		}

		$ids = array();
		foreach ( $raw as $value ) {
			if ( ! is_numeric( $value ) || (int) $value < 1 ) {
				return Errors::validation( array( 'ids' => __( 'Every id must be a positive integer.', 'aponto' ) ) );
			}
			$ids[] = (int) $value;
		}
		if ( count( array_unique( $ids ) ) !== count( $ids ) ) {
			return Errors::validation( array( 'ids' => __( 'Ids must be distinct.', 'aponto' ) ) );
		}

		// Reorder serialization (review F item 4): validate-then-write under one per-site lock, so
		// two concurrent full-set replacements cannot interleave their per-row position UPDATEs into
		// duplicated positions — the loser waits and applies a complete permutation over the winner's.
		$guard = new TransactionGuard( $this->wpdb );
		$lock  = ( new StaffLockFactory( $this->wpdb ) )->forReorder( 'service-categories' );
		if ( ! $lock->acquire( 3 ) ) {
			return Errors::lockTimeout();
		}

		try {
			$existing = $this->gateway->allIds();
			sort( $existing );
			$sorted = $ids;
			sort( $sorted );
			if ( $sorted !== $existing ) {
				return Errors::validation( array( 'ids' => __( 'The list must contain exactly every category.', 'aponto' ) ) );
			}

			// E1 pre-write.
			if ( null === $lock->connectionId() || $lock->connectionId() !== $guard->currentConnectionId() ) {
				return Errors::lockTimeout();
			}

			$this->gateway->reorder( $ids );

			// E1 post-write: a reconnect mid-loop replayed UPDATEs without the lock — positions may
			// be mixed but remain repairable by a retry, which rewrites the full permutation under a
			// fresh lock. Report the retryable loss instead of claiming success.
			if ( null === $lock->connectionId() || $lock->connectionId() !== $guard->currentConnectionId() ) {
				return Errors::lockTimeout();
			}
		} finally {
			if ( null !== $lock->connectionId() && $lock->connectionId() === $guard->currentConnectionId() ) {
				$lock->release();
			}
		}

		return new WP_REST_Response( array( 'ids' => $ids ), 200 );
	}

	/**
	 * Validate an optional `position` (integer >= 0), or null to append at the end.
	 *
	 * @param WP_REST_Request  $request   Request.
	 * @param RequestValidator $validator Accumulating validator.
	 */
	private function validatePosition( WP_REST_Request $request, RequestValidator $validator ): ?int {
		if ( ! $request->has_param( 'position' ) ) {
			return null;
		}

		$raw = $request->get_param( 'position' );
		if ( ! is_numeric( $raw ) || (int) $raw < 0 ) {
			$validator->fail( 'position', __( 'Position must be zero or greater.', 'aponto' ) );

			return null;
		}

		return (int) $raw;
	}

	/**
	 * Build the fresh category DTO response for a persisted id.
	 *
	 * @param int $id     Category id.
	 * @param int $status HTTP status.
	 * @return WP_REST_Response|WP_Error
	 */
	private function respondWith( int $id, int $status ) {
		$row = $this->gateway->find( $id );
		if ( null === $row ) {
			return Errors::notFound();
		}
		$row['count'] = $this->gateway->countServices( $id );

		return new WP_REST_Response( $this->toDto( $row ), $status );
	}

	/**
	 * Serialize a category row (with `count`) to its DTO.
	 *
	 * @param array<string, mixed> $row Raw row.
	 * @return array<string, mixed>
	 */
	private function toDto( array $row ): array {
		return array(
			'id'       => (int) $row['id'],
			'name'     => (string) $row['name'],
			'position' => (int) $row['position'],
			'count'    => (int) $row['count'],
		);
	}
}

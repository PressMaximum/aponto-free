<?php
/**
 * Admin `/blocked-periods` controller (rest-contract §2.7).
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
use Aponto\Rest\Data\BlockedPeriodGateway;
use Aponto\Rest\Errors;
use Aponto\Rest\Policy;
use Aponto\Rest\RequestValidator;
use Aponto\Rest\Services;
use Aponto\Rest\Support\Format;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Blocked-period list/create/delete. The list is a `[from, to)` window query returning every block
 * overlapping it; the core create allow-lists `source` to `manual|holiday` so clients cannot forge a
 * `sync:*` or `hold` origin (rest-contract §2.7, D-11).
 */
final class BlockedPeriodsController implements Controller {

	/**
	 * Blocked-period data gateway.
	 *
	 * @var BlockedPeriodGateway
	 */
	private BlockedPeriodGateway $gateway;

	/**
	 * Construct the controller.
	 *
	 * @param Services $services Service locator.
	 */
	public function __construct( Services $services ) {
		$this->gateway = new BlockedPeriodGateway( $services->wpdb() );
	}

	/**
	 * Register routes.
	 *
	 * @param string $rest_namespace REST namespace.
	 */
	public function register( string $rest_namespace ): void {
		register_rest_route(
			$rest_namespace,
			'/blocked-periods',
			array(
				array(
					'methods'             => 'GET',
					'permission_callback' => array( Policy::class, 'manageStaff' ),
					'callback'            => array( $this, 'index' ),
					'args'                => array(
						'staff_id' => Args::argId(),
						'from'     => Args::argUtc(),
						'to'       => Args::argUtc(),
						'page'     => Args::argPage(),
						'per_page' => Args::argPerPage(),
					),
				),
				array(
					'methods'             => 'POST',
					'permission_callback' => array( Policy::class, 'manageStaff' ),
					'callback'            => array( $this, 'create' ),
				),
			)
		);

		register_rest_route(
			$rest_namespace,
			'/blocked-periods/(?P<id>\d+)',
			array(
				'methods'             => 'DELETE',
				'permission_callback' => array( Policy::class, 'manageStaff' ),
				'callback'            => array( $this, 'destroy' ),
				'args'                => array( 'id' => Args::argId() ),
			)
		);
	}

	/**
	 * GET /blocked-periods.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function index( WP_REST_Request $request ) {
		$v    = new RequestValidator();
		$from = Args::parseUtc( (string) $request->get_param( 'from' ) );
		$to   = Args::parseUtc( (string) $request->get_param( 'to' ) );
		if ( null !== $from && null !== $to && $from >= $to ) {
			$v->fail( 'to', __( 'The end of the window must be after its start.', 'aponto' ) );
		}
		if ( $v->failed() || null === $from || null === $to ) {
			return Errors::validation( $v->errors() );
		}

		$page     = (int) $request->get_param( 'page' );
		$per_page = (int) $request->get_param( 'per_page' );
		$result   = $this->gateway->list(
			(int) $request->get_param( 'staff_id' ),
			$from->format( 'Y-m-d H:i:s' ),
			$to->format( 'Y-m-d H:i:s' ),
			$page,
			$per_page
		);

		$items = array_map( array( $this, 'toDto' ), $result['items'] );

		return new WP_REST_Response( Format::envelope( $items, $page, $per_page, $result['total'] ), 200 );
	}

	/**
	 * POST /blocked-periods.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function create( WP_REST_Request $request ) {
		$v = new RequestValidator();

		$staff_id    = $v->id( 'staff_id', $request->get_param( 'staff_id' ) );
		$location_id = absint( $request->get_param( 'location_id' ) ?? 0 );
		$start       = $v->utc( 'start_datetime_utc', $request->get_param( 'start_datetime_utc' ) );
		$end         = $v->utc( 'end_datetime_utc', $request->get_param( 'end_datetime_utc' ) );
		if ( null !== $start && null !== $end && $start >= $end ) {
			$v->fail( 'end_datetime_utc', __( 'The end must be after the start.', 'aponto' ) );
		}
		$reason = mb_substr( sanitize_text_field( (string) ( $request->get_param( 'reason' ) ?? '' ) ), 0, Args::MAX_191 );
		$source = $v->enum( 'source', $request->get_param( 'source' ) ?? 'manual', array( 'manual', 'holiday' ) );

		if ( $v->failed() || null === $start || null === $end ) {
			return Errors::validation( $v->errors() );
		}

		$id  = $this->gateway->create(
			array(
				'staff_id'           => $staff_id,
				'location_id'        => $location_id,
				'start_datetime_utc' => $start->format( 'Y-m-d H:i:s' ),
				'end_datetime_utc'   => $end->format( 'Y-m-d H:i:s' ),
				'reason'             => $reason,
				'source'             => $source,
			)
		);
		$row = $this->gateway->find( $id );
		if ( null === $row ) {
			return Errors::notFound();
		}

		return new WP_REST_Response( $this->toDto( $row ), 201 );
	}

	/**
	 * DELETE /blocked-periods/{id}.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function destroy( WP_REST_Request $request ) {
		$id = (int) $request->get_param( 'id' );
		if ( null === $this->gateway->find( $id ) ) {
			return Errors::notFound();
		}

		$this->gateway->delete( $id );

		return new WP_REST_Response(
			array(
				'deleted' => true,
				'id'      => $id,
			),
			200
		);
	}

	/**
	 * Serialize a blocked-period row to its DTO.
	 *
	 * @param array<string, mixed> $row Raw row.
	 * @return array<string, mixed>
	 */
	private function toDto( array $row ): array {
		return array(
			'id'                 => (int) $row['id'],
			'staff_id'           => (int) $row['staff_id'],
			'location_id'        => (int) $row['location_id'],
			'start_datetime_utc' => Format::utcDatetime( (string) $row['start_datetime_utc'] ),
			'end_datetime_utc'   => Format::utcDatetime( (string) $row['end_datetime_utc'] ),
			'reason'             => (string) $row['reason'],
			'source'             => (string) $row['source'],
		);
	}
}

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

use Aponto\Availability\ScheduleResolver;
use Aponto\Booking\Repository\ConnectionRepository;
use Aponto\Booking\Repository\ScheduleRepository;
use Aponto\Rest\Args;
use Aponto\Rest\Controller;
use Aponto\Rest\Data\LocationGateway;
use Aponto\Rest\Errors;
use Aponto\Rest\Policy;
use Aponto\Rest\Services;
use Aponto\Rest\Support\Format;
use Aponto\Rest\Support\LocationDto;
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

	/** Default page size of `GET /locations/{id}/hours` (§2.17). */
	public const HOURS_PER_PAGE = 20;

	/** Largest page size of `GET /locations/{id}/hours` (§2.17). */
	public const HOURS_PER_PAGE_MAX = 50;

	/**
	 * Location data gateway.
	 *
	 * @var LocationGateway
	 */
	private LocationGateway $gateway;

	/**
	 * Staff/service connection reader behind the additive count fields (D-R56).
	 *
	 * @var ConnectionRepository
	 */
	private ConnectionRepository $connections;

	/**
	 * Bulk schedule-row reader behind the Hours read (D-R63 fix round 1).
	 *
	 * @var ScheduleRepository
	 */
	private ScheduleRepository $schedules;

	/**
	 * The engine's weight resolver (§5.2), reused unchanged for the Hours read.
	 *
	 * @var ScheduleResolver
	 */
	private ScheduleResolver $resolver;

	/**
	 * Construct the controller.
	 *
	 * @param Services $services REST service locator.
	 */
	public function __construct( Services $services ) {
		$this->gateway     = new LocationGateway( $services->wpdb() );
		$this->connections = new ConnectionRepository( $services->wpdb() );
		$this->schedules   = new ScheduleRepository( $services->wpdb() );
		$this->resolver    = new ScheduleResolver();
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

		// D-R63 fix round 1 (rest-contract §2.17): the Location editor's read-only Hours card in ONE
		// read. Core and read-only like the two routes above — edition-neutral, since the hours it
		// reports are authored on the staff member in every edition.
		register_rest_route(
			$rest_namespace,
			'/locations/(?P<id>\d+)/hours',
			array(
				'methods'             => 'GET',
				'permission_callback' => array( Policy::class, 'manageSettings' ),
				'callback'            => array( $this, 'hours' ),
				'args'                => array(
					'id'       => Args::argId(),
					'page'     => Args::argPage(),
					'per_page' => array(
						'required'          => false,
						'default'           => self::HOURS_PER_PAGE,
						'type'              => 'integer',
						'sanitize_callback' => static fn ( $value ): int => absint( $value ),
						'validate_callback' => static fn ( $value ) => is_numeric( $value ) && (int) $value >= 1 && (int) $value <= self::HOURS_PER_PAGE_MAX ? true : new WP_Error( 'aponto_field', __( 'Per page must be between 1 and 50.', 'aponto' ) ),
					),
				),
			)
		);
	}

	/**
	 * GET /locations/{id}/hours — per assigned active staff member, the RESOLVED weekly grid AT this
	 * location, whether they have their own rows here (`custom`), and the active services they take
	 * here (rest-contract §2.17, D-R63 fix round 1).
	 *
	 * THREE statements whatever the page holds: the location lookup, ONE eligibility read for the
	 * whole location ({@see ConnectionRepository::assignmentsAtLocation()}), and ONE bulk schedule
	 * read for the page's staff ({@see ScheduleRepository::forStaffIds()}), resolved in PHP by the
	 * engine's own {@see ScheduleResolver::resolveWeek()} — the same answer `resolved=1&location_id=N`
	 * gives per member (§2.6). Never N+1.
	 *
	 * @param WP_REST_Request $request Request.
	 */
	public function hours( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id = (int) $request->get_param( 'id' );
		if ( null === $this->gateway->find( $id ) ) {
			return Errors::notFound();
		}
		$page     = max( 1, (int) $request->get_param( 'page' ) );
		$per_page = (int) $request->get_param( 'per_page' );

		// Staff in `position, id` order (the statement's order), each with their services here.
		$members = array();
		foreach ( $this->connections->assignmentsAtLocation( $id ) as $pair ) {
			$staff_id = $pair['staff_id'];
			if ( ! isset( $members[ $staff_id ] ) ) {
				$members[ $staff_id ] = array(
					'staff'    => array(
						'id'         => $staff_id,
						'name'       => $pair['staff_name'],
						'first_name' => $pair['staff_first_name'],
						'last_name'  => $pair['staff_last_name'],
					),
					'services' => array(),
				);
			}
			$members[ $staff_id ]['services'][] = array(
				'id'   => $pair['service_id'],
				'name' => $pair['service_name'],
			);
		}

		$total    = count( $members );
		$slice    = array_slice( array_values( $members ), ( $page - 1 ) * $per_page, $per_page );
		$ids      = array_map( static fn ( array $member ): int => $member['staff']['id'], $slice );
		$by_staff = array();
		foreach ( array() === $ids ? array() : $this->schedules->forStaffIds( $ids ) as $row ) {
			$by_staff[ $row->staff_id ][] = $row;
		}

		$items = array();
		foreach ( $slice as $member ) {
			$staff_id = $member['staff']['id'];
			// Candidate rows = this member's own + the business `staff_id = 0` rows; the resolver
			// applies the location/service dimensions itself.
			$rows   = array_merge( $by_staff[0] ?? array(), $by_staff[ $staff_id ] ?? array() );
			$custom = false;
			foreach ( $by_staff[ $staff_id ] ?? array() as $row ) {
				if ( $row->location_id === $id ) {
					$custom = true;
					break;
				}
			}
			$items[] = array(
				'staff'    => $member['staff'],
				'custom'   => $custom,
				'weekly'   => $this->resolver->resolveWeek( $rows, $staff_id, 0, $id ),
				'services' => $member['services'],
			);
		}

		return new WP_REST_Response(
			array(
				'items'    => $items,
				'page'     => $page,
				'per_page' => $per_page,
				'total'    => $total,
			),
			200
		);
	}

	/**
	 * GET /locations.
	 *
	 * Ordered by `name ASC, id ASC` in the gateway — the operator's own alphabet, which is the
	 * order the admin list renders and the one D-R56 fixed the contract on.
	 *
	 * The count fields cost ONE extra statement for the whole page
	 * ({@see ConnectionRepository::countsForLocations()}), never one per row.
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

		$counts = $this->connections->countsForLocations(
			array_map( static fn ( array $row ): int => (int) $row['id'], $result['items'] )
		);
		$items  = array_map(
			static fn ( array $row ): array => LocationDto::fromRow( $row, $counts[ (int) $row['id'] ] ?? array() ),
			$result['items']
		);

		return new WP_REST_Response( Format::envelope( $items, $page, $per_page, $result['total'] ), 200 );
	}

	/**
	 * GET /locations/{id}.
	 *
	 * @param WP_REST_Request $request Request.
	 */
	public function show( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id  = (int) $request->get_param( 'id' );
		$row = $this->gateway->find( $id );
		if ( null === $row ) {
			return Errors::notFound();
		}
		$counts = $this->connections->countsForLocations( array( $id ) );

		return new WP_REST_Response( LocationDto::fromRow( $row, $counts[ $id ] ?? array() ), 200 );
	}
}

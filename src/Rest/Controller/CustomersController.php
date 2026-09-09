<?php
/**
 * Admin `/customers` controller (rest-contract §2.10).
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
use Aponto\Rest\Data\CustomerGateway;
use Aponto\Rest\Errors;
use Aponto\Rest\Policy;
use Aponto\Rest\RequestValidator;
use Aponto\Rest\Services;
use Aponto\Rest\Support\Format;
use Aponto\Support\Clock;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Customers list/create/read/replace. Every route requires {@see Policy::MANAGE_BOOKINGS}. The server
 * always derives the internal `email_norm = strtolower(trim(email))`; that column is UNIQUE, so a
 * duplicate email yields a `422 aponto_validation` on the `email` field, and it is never exposed in
 * the DTO. A non-null `wp_user_id` that does not resolve to a WordPress user yields `404`.
 */
final class CustomersController implements Controller {

	/**
	 * Customer data gateway.
	 *
	 * @var CustomerGateway
	 */
	private CustomerGateway $gateway;

	/**
	 * Clock (UTC "now" for the `upcoming` aggregate).
	 *
	 * @var Clock
	 */
	private Clock $clock;

	/**
	 * Construct the controller.
	 *
	 * @param Services $services Service locator.
	 */
	public function __construct( Services $services ) {
		$this->clock   = $services->clock();
		$this->gateway = new CustomerGateway( $services->wpdb(), $this->clock );
	}

	/**
	 * Register routes.
	 *
	 * @param string $rest_namespace REST namespace.
	 */
	public function register( string $rest_namespace ): void {
		register_rest_route(
			$rest_namespace,
			'/customers',
			array(
				array(
					'methods'             => 'GET',
					'permission_callback' => array( Policy::class, 'manageBookings' ),
					'callback'            => array( $this, 'index' ),
					'args'                => array(
						'search'   => Args::argSearch(),
						'page'     => Args::argPage(),
						'per_page' => Args::argPerPage(),
					),
				),
				array(
					'methods'             => 'POST',
					'permission_callback' => array( Policy::class, 'manageBookings' ),
					'callback'            => array( $this, 'create' ),
				),
			)
		);

		register_rest_route(
			$rest_namespace,
			'/customers/(?P<id>\d+)',
			array(
				array(
					'methods'             => 'GET',
					'permission_callback' => array( Policy::class, 'manageBookings' ),
					'callback'            => array( $this, 'show' ),
					'args'                => array( 'id' => Args::argId() ),
				),
				array(
					'methods'             => 'PUT',
					'permission_callback' => array( Policy::class, 'manageBookings' ),
					'callback'            => array( $this, 'update' ),
					'args'                => array( 'id' => Args::argId() ),
				),
			)
		);
	}

	/**
	 * GET /customers.
	 *
	 * @param WP_REST_Request $request Request.
	 */
	public function index( WP_REST_Request $request ): WP_REST_Response {
		$page     = (int) $request->get_param( 'page' );
		$per_page = (int) $request->get_param( 'per_page' );
		$result   = $this->gateway->list( (string) $request->get_param( 'search' ), $page, $per_page );

		$ids   = array_map( static fn ( array $row ): int => (int) $row['id'], $result['items'] );
		$aggs  = $this->gateway->aggregatesFor( $ids, $this->clock->nowSql() );
		$items = array_map(
			fn ( array $row ): array => $this->toDto( $row, $aggs[ (int) $row['id'] ] ?? null ),
			$result['items']
		);

		return new WP_REST_Response( Format::envelope( $items, $page, $per_page, $result['total'] ), 200 );
	}

	/**
	 * POST /customers.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function create( WP_REST_Request $request ) {
		$data = $this->validateBody( $request );
		if ( is_wp_error( $data ) ) {
			return $data;
		}

		$user_error = $this->assertWpUser( $data['wp_user_id'] );
		if ( null !== $user_error ) {
			return $user_error;
		}

		$id = $this->gateway->create( $data );
		if ( 0 === $id ) {
			return Errors::validation( array( 'email' => __( 'A customer with this email already exists.', 'aponto' ) ) );
		}

		$row = $this->gateway->find( $id );
		if ( null === $row ) {
			return Errors::notFound();
		}

		return new WP_REST_Response( $this->toDto( $row ), 201 );
	}

	/**
	 * GET /customers/{id}.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function show( WP_REST_Request $request ) {
		$row = $this->gateway->find( (int) $request->get_param( 'id' ) );
		if ( null === $row ) {
			return Errors::notFound();
		}

		return new WP_REST_Response( $this->toDto( $row, $this->aggregatesFor( (int) $row['id'] ) ), 200 );
	}

	/**
	 * PUT /customers/{id} (full replacement).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function update( WP_REST_Request $request ) {
		$id = (int) $request->get_param( 'id' );
		if ( null === $this->gateway->find( $id ) ) {
			return Errors::notFound();
		}

		$data = $this->validateBody( $request );
		if ( is_wp_error( $data ) ) {
			return $data;
		}

		$user_error = $this->assertWpUser( $data['wp_user_id'] );
		if ( null !== $user_error ) {
			return $user_error;
		}

		$existing = $this->gateway->findByEmailNorm( (string) $data['email_norm'] );
		if ( null !== $existing && (int) $existing['id'] !== $id ) {
			return Errors::validation( array( 'email' => __( 'A customer with this email already exists.', 'aponto' ) ) );
		}

		$this->gateway->update( $id, $data );
		$row = $this->gateway->find( $id );
		if ( null === $row ) {
			return Errors::notFound();
		}

		return new WP_REST_Response( $this->toDto( $row, $this->aggregatesFor( $id ) ), 200 );
	}

	/**
	 * Validate a create/replace body and derive `email_norm`.
	 *
	 * Both POST and PUT are full bodies: `name` and `email` are required; `phone`, `note` default to
	 * the empty string; `wp_user_id` is a nullable id.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return array<string, mixed>|WP_Error
	 */
	private function validateBody( WP_REST_Request $request ) {
		$v    = new RequestValidator();
		$data = array(
			'name'       => $v->name( 'name', $request->get_param( 'name' ) ),
			'email'      => $v->email( 'email', $request->get_param( 'email' ) ),
			'phone'      => $v->phone( 'phone', $request->get_param( 'phone' ) ?? '' ),
			'wp_user_id' => $v->nullableId( 'wp_user_id', $request->get_param( 'wp_user_id' ) ),
			'note'       => $v->text( $request->get_param( 'note' ) ?? '' ),
		);

		if ( $v->failed() ) {
			return Errors::validation( $v->errors() );
		}

		$data['email_norm'] = strtolower( trim( (string) $data['email'] ) );

		return $data;
	}

	/**
	 * Reject a non-null `wp_user_id` that does not resolve to a WordPress user with `404`.
	 *
	 * @param mixed $wp_user_id Validated nullable id.
	 */
	private function assertWpUser( mixed $wp_user_id ): ?WP_Error {
		if ( null !== $wp_user_id && false === get_userdata( (int) $wp_user_id ) ) {
			return Errors::notFound();
		}

		return null;
	}

	/**
	 * Booking aggregates for a single customer id (detail/replace responses).
	 *
	 * @param int $id Customer id.
	 * @return array{bookings_count:int, upcoming:int, last_booking:string, timezone:string, no_show_count:int}|null
	 */
	private function aggregatesFor( int $id ): ?array {
		$map = $this->gateway->aggregatesFor( array( $id ), $this->clock->nowSql() );

		return $map[ $id ] ?? null;
	}

	/**
	 * Serialize a customer row to its DTO (never exposes `email_norm`).
	 *
	 * The 3 read-only aggregates (rest-contract §2.10, D-27a), a derived
	 * `timezone` (Q4 — the customer timezone captured on the latest booking, not a
	 * stored column; `null` when the customer has no bookings) and `no_show_count`
	 * (D-R33) are folded in from {@see CustomerGateway::aggregatesFor()}; a customer
	 * with no bookings reports zero counts, a null `last_booking` and a null
	 * `timezone`.
	 *
	 * @param array<string, mixed>                                                                                  $row Raw row.
	 * @param array{bookings_count:int, upcoming:int, last_booking:string, timezone:string, no_show_count:int}|null $agg Aggregates.
	 * @return array<string, mixed>
	 */
	private function toDto( array $row, ?array $agg = null ): array {
		$last_booking = (string) ( $agg['last_booking'] ?? '' );
		$timezone     = (string) ( $agg['timezone'] ?? '' );

		return array(
			'id'             => (int) $row['id'],
			'name'           => (string) $row['name'],
			'email'          => (string) $row['email'],
			'phone'          => (string) $row['phone'],
			'wp_user_id'     => Format::intOrNull( $row['wp_user_id'] ),
			'note'           => (string) $row['note'],
			'created_at'     => Format::utcDatetime( (string) $row['created_at'] ),
			'bookings_count' => (int) ( $agg['bookings_count'] ?? 0 ),
			'upcoming'       => (int) ( $agg['upcoming'] ?? 0 ),
			'last_booking'   => '' === $last_booking ? null : Format::utcDatetime( $last_booking ),
			'timezone'       => '' === $timezone ? null : $timezone,
			'no_show_count'  => (int) ( $agg['no_show_count'] ?? 0 ),
		);
	}
}

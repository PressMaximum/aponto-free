<?php
/**
 * Public `/public/availability` controller (rest-contract §3.2).
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

use Aponto\Availability\RangeTooWide;
use Aponto\Rest\Args;
use Aponto\Rest\Controller;
use Aponto\Rest\Data\PublicGateway;
use Aponto\Rest\Errors;
use Aponto\Rest\Policy;
use Aponto\Rest\Services;
use Aponto\Rest\Support\ClientIp;
use Aponto\Rest\Support\RateLimiter;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Public availability: rate-limited by IP (`availability_ip`), 404 for a missing/inactive service,
 * `422` for `from_date > to_date`, `400 aponto_range_too_wide` beyond 62 days. Returns the flat slot
 * list windowed to the customer timezone (§5.5).
 */
final class PublicAvailabilityController implements Controller {

	/**
	 * Public read gateway.
	 *
	 * @var PublicGateway
	 */
	private PublicGateway $gateway;

	/**
	 * Rate limiter.
	 *
	 * @var RateLimiter
	 */
	private RateLimiter $limiter;

	/**
	 * Construct the controller.
	 *
	 * @param Services $services Service locator.
	 */
	public function __construct( private Services $services ) {
		$this->gateway = new PublicGateway( $services->wpdb() );
		$this->limiter = new RateLimiter( $services->wpdb(), $services->clock() );
	}

	/**
	 * Register routes.
	 *
	 * @param string $rest_namespace REST namespace.
	 */
	public function register( string $rest_namespace ): void {
		register_rest_route(
			$rest_namespace,
			'/public/availability',
			array(
				'methods'             => 'GET',
				'permission_callback' => '__return_true',
				'callback'            => array( $this, 'index' ),
				'args'                => array(
					'service_id' => Args::argId(),
					'staff_id'   => Args::argNullableId(),
					'from_date'  => Args::argDate(),
					'to_date'    => Args::argDate(),
					'tz'         => Args::argTimezone(),
				),
			)
		);
	}

	/**
	 * GET /public/availability.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function index( WP_REST_Request $request ) {
		$ip = ClientIp::resolve( (bool) $this->services->settings()->get( 'trusted_proxy' ) );
		try {
			$retry = $this->limiter->hit( 'availability_ip', $ip, $request );
		} catch ( \Aponto\Support\DomainException $exception ) {
			return Errors::fromDomain( $exception );
		}
		if ( null !== $retry ) {
			return Errors::rateLimited( $retry );
		}

		$service_id = (int) $request->get_param( 'service_id' );
		$from_date  = (string) $request->get_param( 'from_date' );
		$to_date    = (string) $request->get_param( 'to_date' );
		// Canonicalize legacy aliases so the windowed slot labels match the client's
		// (which canonicalizes the browser zone before it ever calls this endpoint).
		$tz       = Args::canonicalizeTimezone( (string) $request->get_param( 'tz' ) );
		$staff    = $request->get_param( 'staff_id' );
		$staff_id = ( null === $staff || '' === $staff ) ? null : (int) $staff;

		if ( $from_date > $to_date ) {
			return Errors::validation( array( 'to_date' => __( '"from_date" must not be after "to_date".', 'aponto' ) ) );
		}

		$summary = $this->gateway->serviceSummary( $service_id );
		if ( null === $summary || ! $this->gateway->serviceIsActive( $service_id ) ) {
			return Errors::notFound();
		}

		try {
			$slots = $this->services->engine()->slotsForCustomerRange( $service_id, $staff_id, 0, $from_date, $to_date, $tz );
		} catch ( RangeTooWide $exception ) {
			return Errors::fromDomain( $exception );
		}

		$out = array();
		foreach ( $slots as $slot ) {
			$out[] = array(
				'start_utc' => $slot->start_utc->format( 'Y-m-d\TH:i:s\Z' ),
				'remaining' => $slot->remaining,
			);
		}

		return new WP_REST_Response(
			array(
				'slots'   => $out,
				'service' => array(
					'id'               => $summary['id'],
					'duration_minutes' => $summary['duration_minutes'],
				),
			),
			200
		);
	}
}

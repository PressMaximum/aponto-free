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
use Aponto\Booking\Repository\BookingRepository;
use Aponto\Booking\Repository\ConnectionRepository;
use Aponto\Rest\Args;
use Aponto\Rest\Controller;
use Aponto\Rest\Data\PublicGateway;
use Aponto\Rest\Errors;
use Aponto\Rest\Policy;
use Aponto\Rest\Services;
use Aponto\Rest\Support\ClientIp;
use Aponto\Rest\Support\LocationResolution;
use Aponto\Rest\Support\PublicCache;
use Aponto\Rest\Support\RateLimiter;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Public availability: rate-limited by IP (`availability_ip`), 404 for a missing/inactive service,
 * `422` for `from_date > to_date`, `400 aponto_range_too_wide` beyond 62 days. Returns the flat slot
 * list windowed to the customer timezone (§5.5).
 *
 * D-R61 adds a nullable `location_id` (rest-contract §3.2 addendum 2026-09-23, corrected after
 * adversarial review). The scope is resolved by the SAME {@see LocationResolution::forService()}
 * the booking route uses, so a null request draws its grid where the reservation will book it:
 * `0` on Free / module off / no serving branch / a published roster (the widget sends an id
 * then), the ASSIGNED branch on a single-branch or `first` site. At a branch, eligibility,
 * schedule resolution (a staff+location row is weight 5, D-R60), busy/blocked periods and the
 * business timezone are all keyed by it.
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
					'service_id'         => Args::argId(),
					'staff_id'           => Args::argNullableId(),
					'location_id'        => Args::argNullableId(),
					'from_date'          => Args::argDate(),
					'to_date'            => Args::argDate(),
					'tz'                 => Args::argTimezone(),
					// Admin "Edit time" only (persona QA 2026-10-05, T-043): honoured for a signed-in
					// user who may manage bookings and ignored for everyone else — see index().
					'exclude_booking_id' => Args::argNullableId(),
					// Admin "New booking" only (D-R77): the front-desk window. Same rule — honoured for
					// a signed-in booking manager, ignored for everyone else.
					'front_desk'         => Args::argBool(),
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

		$location         = $request->get_param( 'location_id' );
		$location_request = ( null === $location || '' === $location ) ? null : (int) $location;

		if ( $from_date > $to_date ) {
			return Errors::validation( array( 'to_date' => __( '"from_date" must not be after "to_date".', 'aponto' ) ) );
		}

		$summary = $this->gateway->serviceSummary( $service_id );
		if ( null === $summary || ! $this->gateway->serviceIsActive( $service_id ) ) {
			return Errors::notFound();
		}

		// The 62-day ceiling first (§5.5), so a too-wide range is `400 aponto_range_too_wide`
		// whatever the location — the engine asserts it again, from the same implementation.
		try {
			RangeTooWide::assertWithin( $from_date, $to_date );
		} catch ( RangeTooWide $exception ) {
			return Errors::fromDomain( $exception );
		}

		// WHERE the grid is drawn (D-R61) — resolved exactly as `POST /public/bookings` resolves
		// it, through the one shared entry point, because two scopes for one request is a grid of
		// slots the reservation then refuses (fix round 2: a single-branch site with a pinned zone
		// 409'd every booking). A concrete id must be ACTIVE, SERVE this service and — under
		// `first` — be the assigned branch; the engine cannot check that itself, since every
		// eligibility read matches the wildcard `location_id = 0`. A refused id answers `200` with
		// ZERO slots (subtract-only: an error here makes a refetching widget loop, while an empty
		// grid is the true answer). MISSING — a null while the roster is published — is a read, so
		// it is not refused: it keeps the `0` scope, as before. Free and module-off sites run no
		// query here; the reads are outside `get_slots()`, so its ≤5-query budget is untouched.
		$location_id = LocationResolution::forService(
			$location_request,
			$service_id,
			$this->services->settings(),
			new ConnectionRepository( $this->services->wpdb() )
		);
		if ( LocationResolution::MISSING === $location_id ) {
			$location_id = 0;
		}

		// The booking being moved must not block its own neighbouring starts in the admin's "Edit
		// time" list (persona QA 2026-10-05, T-043). The route stays public, so the parameter is
		// IGNORED — never refused — unless the request is authenticated as someone who may manage
		// bookings: an anonymous caller can neither probe which ids exist nor see a slot that is
		// really taken. It needs a concrete staff member (the any-staff union excludes nothing).
		$exclude    = $request->get_param( 'exclude_booking_id' );
		$exclude_id = ( null === $exclude || '' === $exclude || null === $staff_id || ! current_user_can( Policy::MANAGE_BOOKINGS ) ) ? null : (int) $exclude;
		if ( null !== $exclude_id ) {
			// Only the booking BEING MOVED may step aside: the id must be a booking of this very
			// service and staff member. Any other id is ignored, so a manager's request cannot hide
			// a different booking and its buffers from the grid (review 2026-10-06).
			$moving = ( new BookingRepository( $this->services->wpdb() ) )->find( $exclude_id );
			if ( null === $moving || $moving->staff_id !== $staff_id || $moving->service_id !== $service_id ) {
				$exclude_id = null;
			}
		}

		// The front desk records a walk-in or a phone booking (D-R77): the CUSTOMER lead time and
		// horizon do not bound what staff may enter, and today's earlier starts are offered. Ignored
		// — never refused — for an anonymous caller, exactly like `exclude_booking_id`, so the public
		// form cannot widen its own window with a query parameter.
		$front_desk = true === $request->get_param( 'front_desk' ) && current_user_can( Policy::MANAGE_BOOKINGS );

		$slots = array();
		if ( LocationResolution::INVALID !== $location_id ) {
			try {
				$slots = $this->services->engine()->slotsForCustomerRange( $service_id, $staff_id, $location_id, $from_date, $to_date, $tz, $exclude_id, $front_desk );
			} catch ( RangeTooWide $exception ) {
				return Errors::fromDomain( $exception );
			}
		}

		$out = array();
		foreach ( $slots as $slot ) {
			$out[] = array(
				'start_utc' => $slot->start_utc->format( 'Y-m-d\TH:i:s\Z' ),
				'remaining' => $slot->remaining,
			);
		}

		// NEVER storable (fix round 1): WordPress sends no cache headers on an anonymous REST
		// response, and a cached slot grid offers times that are already gone — "stale slot =
		// double-book" (AGENTS §4). {@see PublicCache}.
		return PublicCache::noStore(
			new WP_REST_Response(
				array(
					'slots'   => $out,
					'service' => array(
						'id'               => $summary['id'],
						'duration_minutes' => $summary['duration_minutes'],
					),
				),
				200
			)
		);
	}
}

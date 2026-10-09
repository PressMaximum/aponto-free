<?php
/**
 * Public `/public/bookings` + token controller (rest-contract §3.3–§3.7).
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

use Aponto\Booking\Booking;
use Aponto\Booking\BookingDraft;
use Aponto\Booking\CustomFieldSchema;
use Aponto\Booking\CustomerInput;
use Aponto\Booking\Exception\IdempotencyConflict;
use Aponto\Booking\Exception\IdempotencyInFlight;
use Aponto\Booking\Repository\ConnectionRepository;
use Aponto\Booking\Repository\IdempotencyRepository;
use Aponto\Frontend\BookingManagePage;
use Aponto\Plan;
use Aponto\Database\StorageException;
use Aponto\Payments\OrderAmounts;
use Aponto\Payments\PaymentException;
use Aponto\Payments\PaymentLockTimeout;
use Aponto\Payments\PaymentRegistry;
use Aponto\Payments\CouponUnavailable;
use Aponto\Payments\OrderPricing;
use Aponto\Rest\Args;
use Aponto\Rest\Controller;
use Aponto\Rest\Data\BookingReadGateway;
use Aponto\Rest\Data\PublicGateway;
use Aponto\Rest\Errors;
use Aponto\Rest\Policy;
use Aponto\Rest\RequestValidator;
use Aponto\Payments\PricingContext;
use Aponto\Rest\Services;
use Aponto\Rest\Support\ClientIp;
use Aponto\Rest\Support\CouponAttemptGuard;
use Aponto\Rest\Support\RequestFields;
use Aponto\Rest\Support\CustomFieldInput;
use Aponto\Rest\Support\LocationResolution;
use Aponto\Rest\Support\RateLimited;
use Aponto\Rest\Support\RateLimiter;
use Aponto\Rest\Support\RawResponse;
use Aponto\Rest\Support\RequestFingerprint;
use Aponto\Support\Settings;
use Aponto\Rest\Support\TimezoneLabel;
use Aponto\Support\DomainException;
use WP_REST_Request;
use WP_REST_Response;

/**
 * The single public booking endpoint plus the three token routes. POST runs the abuse pipeline in
 * order: guard → required idempotency header → body validation → IP + email rate limits →
 * server-side lead/horizon enforcement (D6) → reserve. The original response carries `manage_url` +
 * `ics_url` built from the raw token; a replay carries neither (`links_available=false`). Token
 * lookups are constant-shape hash lookups.
 *
 * Token resolution splits by intent (D-R25, 2026-08-02): the read-only GET resolves a CANCELLED
 * booking too, so a durable manage link explains itself instead of 404ing once the booking ends;
 * the ACTION routes (cancel) and the calendar feed (ics) still refuse every terminal booking. An
 * invalid or unknown token — and a COMPLETED or NO-SHOW one (D-R33) on any route — is the uniform
 * 404. `can_cancel` needs no no-show rule of its own: it already reads `pending|confirmed`.
 */
final class PublicBookingsController implements Controller {

	/**
	 * Terminal statuses that invalidate a manage token for an ACTION (cancel) or the calendar feed.
	 *
	 * @var list<string>
	 */
	private const TERMINAL = array( 'cancelled', 'completed', 'no_show' );

	/**
	 * Terminal statuses that also close the READ-ONLY view (D-R25 keeps `cancelled` viewable, so
	 * this list is narrower than {@see self::TERMINAL}). `no_show` joins `completed` here (D-R33):
	 * both mean the appointment happened and was closed out, and there is nothing left for the
	 * customer to look at or act on — unlike a cancellation, whose email link must keep explaining
	 * itself. The 404 is the same uniform one, so this reveals nothing about which status a token
	 * carries.
	 *
	 * @var list<string>
	 */
	private const VIEW_TERMINAL = array( 'completed', 'no_show' );

	/**
	 * Public read gateway.
	 *
	 * @var PublicGateway
	 */
	private PublicGateway $public;

	/**
	 * Booking read gateway (order + names).
	 *
	 * @var BookingReadGateway
	 */
	private BookingReadGateway $reads;

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
		$this->public  = new PublicGateway( $services->wpdb() );
		$this->reads   = new BookingReadGateway( $services->wpdb() );
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
			'/public/bookings',
			array(
				'methods'             => 'POST',
				'permission_callback' => '__return_true',
				'callback'            => array( $this, 'create' ),
			)
		);

		register_rest_route(
			$rest_namespace,
			'/public/bookings/(?P<token>[A-Za-z0-9_-]+)',
			array(
				'methods'             => 'GET',
				'permission_callback' => '__return_true',
				'callback'            => array( $this, 'show' ),
			)
		);

		register_rest_route(
			$rest_namespace,
			'/public/bookings/(?P<token>[A-Za-z0-9_-]+)/cancel',
			array(
				'methods'             => 'POST',
				'permission_callback' => '__return_true',
				'callback'            => array( $this, 'cancel' ),
			)
		);

		register_rest_route(
			$rest_namespace,
			'/public/bookings/(?P<token>[A-Za-z0-9_-]+)/pay',
			array(
				'methods'             => 'POST',
				'permission_callback' => '__return_true',
				'callback'            => array( $this, 'pay' ),
			)
		);

		register_rest_route(
			$rest_namespace,
			'/public/bookings/(?P<token>[A-Za-z0-9_-]+)/balance',
			array(
				array(
					'methods'             => 'GET',
					'permission_callback' => '__return_true',
					'callback'            => array( $this, 'balanceShow' ),
				),
				array(
					'methods'             => 'POST',
					'permission_callback' => '__return_true',
					'callback'            => array( $this, 'balanceBegin' ),
				),
				array(
					'methods'             => 'DELETE',
					'permission_callback' => '__return_true',
					'callback'            => array( $this, 'balanceCancel' ),
				),
			)
		);

		register_rest_route(
			$rest_namespace,
			'/public/bookings/(?P<token>[A-Za-z0-9_-]+)/balance/check',
			array(
				'methods'             => 'POST',
				'permission_callback' => '__return_true',
				'callback'            => array( $this, 'balanceCheck' ),
			)
		);

		register_rest_route(
			$rest_namespace,
			'/public/bookings/(?P<token>[A-Za-z0-9_-]+)/ics',
			array(
				'methods'             => 'GET',
				'permission_callback' => '__return_true',
				'callback'            => array( $this, 'ics' ),
			)
		);
	}

	/**
	 * POST /public/bookings.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function create( WP_REST_Request $request ) {
		return $this->createRequest( $request );
	}

	/**
	 * Trusted module entry point; request data cannot select deferred identity.
	 *
	 * @param WP_REST_Request $request Selection and explicit booking answers.
	 * @param string          $gateway Server-selected offered gateway.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function createDeferredCheckout( WP_REST_Request $request, string $gateway ) {
		$payment = $request->get_param( 'payment' );
		if ( '' === $gateway || ! PaymentRegistry::isOffered( $gateway ) || ! $this->services->paymentService()->enabled() ) {
			return Errors::make( 'aponto_payment_unavailable', 409 );
		}
		if ( $request->has_param( 'customer' ) || $request->has_param( 'coupon_code' )
			|| ( $request->has_param( 'payment' ) && ( ! is_array( $payment ) || array( 'method' => $gateway ) !== $payment ) ) ) {
			return Errors::validation( array( 'payment' => __( 'Customer details and coupons are collected at checkout.', 'aponto' ) ) );
		}
		$request = clone $request;
		$request->set_param( 'payment', array( 'method' => $gateway ) );
		return $this->createRequest( $request, $gateway );
	}

	/**
	 * Shared validation, slot locking and reservation path.
	 *
	 * @param WP_REST_Request $request Booking request.
	 * @param string          $deferred_gateway Trusted checkout gateway, or empty for ordinary bookings.
	 * @return WP_REST_Response|\WP_Error
	 */
	private function createRequest( WP_REST_Request $request, string $deferred_gateway = '' ) {
		$deferred = '' !== $deferred_gateway;
		$scope    = $deferred ? 'public_checkout' : 'public';
		// EXACT same-key replay is resolved first (D-R67u) — before the mutable booking guard (a
		// one-use CAPTCHA/verification token must not refuse the exact safe retry) and before every
		// piece of live site state (offered fields, gateways, the coupons module, the catalog, the
		// booking window). Eligibility is IDENTITY: the exact submitted body must hash to the value
		// stored on the completed claim. Nothing is normalized, so no payload the ordinary path would
		// judge differently can share it. Any other request under the key — or a claim written
		// before exact hashes existed — takes the ordinary path, whose idempotency claim decides
		// replay or 409 exactly as before.
		$key        = $request->get_header( 'X-Aponto-Idempotency' );
		$key        = null === $key ? '' : sanitize_text_field( $key );
		$exact_hash = RequestFingerprint::exact( $request );
		if ( $deferred ) {
			$exact_hash = hash( 'sha256', $deferred_gateway . ':' . $exact_hash );
		}
		if ( '' !== $key && wp_is_uuid( $key ) ) {
			$replayed_id = ( new IdempotencyRepository( $this->services->wpdb(), $this->services->clock() ) )
				->completedBookingForExact( hash( 'sha256', $key ), $scope, $exact_hash );
			$replayed    = null === $replayed_id ? null : $this->replayResponse( $replayed_id );
			if ( null !== $replayed ) {
				return $replayed;
			}
		}

		/**
		 * Guard the public booking request before validation (§6.4).
		 *
		 * @param bool            $allow   Whether to allow the request.
		 * @param WP_REST_Request $request Request.
		 */
		/**
		 * Guard result — `true` to allow, or a `WP_Error` to reject.
		 *
		 * @var mixed $guard
		 */
		$guard = apply_filters( 'aponto_public_booking_guard', true, $request );
		if ( $guard instanceof \WP_Error ) {
			return Errors::fromGuard( $guard );
		}

		// The site's extra booking-form fields (D-R30). Resolved ONCE per request and reused by the
		// allow-list, the validator and the draft, so those three can never disagree about what the
		// form offers. Empty list = the pre-D-R30 surface, unchanged.
		$custom_definitions = ( new CustomFieldSchema( $this->services->settings(), $this->services->clock() ) )->definitions();

		// Payment gateways this site may offer right now (D-R38, Codex #1). Resolved ONCE, like the
		// custom definitions above, so the allow-list, the validator and the draft cannot disagree
		// about what the form offers. OFFERED, not merely active: a shipped and enabled module whose
		// driver is not configured cannot create an intent, and advertising it produces a booking
		// form that fails at its last step. Empty list — a Free site with no gateway set up, or
		// `payments.mode = off` — leaves the public surface exactly as it was before D-R38.
		$payments          = $this->services->paymentService();
		$payment_codes     = $payments->enabled() ? PaymentRegistry::offeredCodes() : array();
		$payments_offered  = array() !== $payment_codes;
		$coupons_available = OrderPricing::couponsAvailable();

		$unknown = $this->unknownBookingFields( $request, array() !== $custom_definitions, $payments_offered, $coupons_available );
		if ( array() !== $unknown ) {
			return Errors::validation( $unknown );
		}

		if ( '' === $key || ! wp_is_uuid( $key ) ) {
			return Errors::validation( array( 'X-Aponto-Idempotency' => __( 'A valid idempotency key header is required.', 'aponto' ) ) );
		}

		$settings = $this->services->settings();

		// booking_ip attempt limiter runs PRE-validation (REST-4): junk traffic is charged before
		// it costs any parsing/validation work. Fail-closed on counter-storage failure (REST-6).
		$ip = ClientIp::resolve( (bool) $settings->get( 'trusted_proxy' ) );
		try {
			$retry = $this->limiter->hit( 'booking_ip', $ip, $request );
		} catch ( DomainException $exception ) {
			return Errors::fromDomain( $exception );
		}
		if ( null !== $retry ) {
			return Errors::rateLimited( $retry );
		}

		$v       = new RequestValidator();
		$service = $v->id( 'service_id', $request->get_param( 'service_id' ) );
		$staff   = $v->nullableId( 'staff_id', $request->get_param( 'staff_id' ) );
		$start   = $v->utc( 'start_utc', $request->get_param( 'start_utc' ) );
		$tz      = $v->timezone( 'tz', $request->get_param( 'tz' ), true );

		// D-R61: optional, `null` = "not chosen" — resolved below, once the service is known.
		$location_request = $v->nullableId( 'location_id', $request->get_param( 'location_id' ) );

		$customer   = $request->get_param( 'customer' );
		$first_name = '';
		$last_name  = '';
		$email      = '';
		$phone      = '';
		$note       = '';
		if ( ! $deferred && ! is_array( $customer ) ) {
			$v->fail( 'customer', __( 'Customer details are required.', 'aponto' ) );
		} elseif ( ! $deferred ) {
			// Both parts REQUIRED on the public form (founder 2026-10-01, N3, D-R69).
			$first_name = $v->namePart( 'customer.first_name', $customer['first_name'] ?? null, 'first' );
			$last_name  = $v->namePart( 'customer.last_name', $customer['last_name'] ?? null, 'last' );
			$email      = $v->email( 'customer.email', $customer['email'] ?? null );
			$phone      = 'off' === (string) $settings->get( 'customer_fields.phone' )
				? ''
				: $v->phone( 'customer.phone', $customer['phone'] ?? '' );
			$note       = $v->text( $customer['note'] ?? '' );
			// "abc" was stored as a phone number (persona QA 2026-10-05, T-088). Checked on the
			// SANITIZED value, and only when one was given — "optional" still means optional.
			if ( '' !== $phone && ! self::phoneLooksValid( $phone ) ) {
				$v->fail( 'customer.phone', __( 'Enter a valid phone number.', 'aponto' ) );
			}
		}

		// Consent is only meaningful while the site has the checkbox ENABLED. With the
		// setting off the submitted value is type-checked but IGNORED, so a client can
		// never fabricate consent evidence (`consent_at` stays NULL) for a site that
		// never asked the visitor for consent (privacy-inventory §consent semantics).
		$consent_enabled = (bool) $settings->get( 'consent_checkbox.enabled' );
		$consent_input   = $v->bool( $request->get_param( 'consent' ) ?? false );
		$consent         = $consent_enabled && $consent_input;

		if ( ! $deferred && 'required' === (string) $settings->get( 'customer_fields.phone' ) && '' === $phone ) {
			$v->fail( 'customer.phone', __( 'A phone number is required.', 'aponto' ) );
		}
		if ( $consent_enabled && ! $consent ) {
			$v->fail( 'consent', __( 'Consent is required.', 'aponto' ) );
		}

		// Custom-field answers are validated against the SAME definitions the form was rendered
		// from — required, length caps and `select` membership are all re-enforced here, because the
		// widget is a convenience and this is the contract. Errors join the same field map, keyed
		// `custom_fields.{slug}` so the widget can route each one back to its input.
		$custom = CustomFieldInput::validate( $request->get_param( 'custom_fields' ), $custom_definitions );
		foreach ( $custom['fields'] as $field => $message ) {
			$v->fail( (string) $field, (string) $message );
		}

		$payment_method = $this->validatePaymentMethod( $request, $payment_codes, $v );
		$payment_input  = $request->get_param( 'payment' );
		$amount_mode    = 'deposit';
		if ( is_array( $payment_input ) && array_key_exists( 'amount_mode', $payment_input ) ) {
			if ( ! in_array( $payment_input['amount_mode'], array( 'deposit', 'full' ), true ) ) {
				$v->fail( 'payment.amount_mode', __( 'Choose a valid payment amount option.', 'aponto' ) );
			} else {
				$amount_mode = $payment_input['amount_mode'];
			}
		}
		$coupon_raw = $request->get_param( 'coupon_code' );
		if ( $coupons_available && $request->has_param( 'coupon_code' ) && ! is_string( $coupon_raw ) ) {
			$v->fail( 'coupon_code', __( 'Enter a valid coupon code.', 'aponto' ) );
		}
		$coupon_code = $coupons_available ? OrderPricing::normalizeCouponCode( $coupon_raw ) : '';

		if ( $v->failed() ) {
			return Errors::validation( $v->errors() );
		}

		$email_norm = strtolower( trim( $email ) );

		// The location the CLIENT SENT (`?? 0`), never the resolved one (rest-contract §3.3, fix
		// round 2): the fingerprint says "is this the same request?", and a retry of the same
		// request must replay the original booking even if the server would now ASSIGN a different
		// branch (one archived or renamed between the two sends) — a 409 there makes the widget
		// rotate its key and book twice. `location_id` has been in the canonical array since P0
		// with the value `0`, so location-less and single-branch sites (the client sends null) hash
		// byte-identically to the previous build, and the client mirror hashes what it sends.
		// Computed from the VALIDATED body only, so it can run before any topology read.
		$request_hash = RequestFingerprint::forBooking( $service, $staff, $location_request ?? 0, $start->format( 'Y-m-d\TH:i:s\Z' ), $tz, $email_norm, $first_name, $last_name, $phone, $note, $consent, $custom['values'], $payment_method, $coupon_code, $amount_mode );
		if ( $deferred ) {
			$request_hash = hash( 'sha256', $deferred_gateway . ':' . $request_hash );
		}

		// IDEMPOTENCY BEFORE TOPOLOGY (D-R61 review rounds 3–4, rest-contract §3.4 "Idempotency
		// vs topology"). Everything below — the service lookup, the location resolution, the
		// `required` staff gate — reads the site's CURRENT configuration, which may have changed
		// since the original send (a branch archived, a second branch added, the service
		// archived). A key that already has a claim must get the §3.4 answer that claim earned —
		// replay, `409` conflict or `425` in flight — not a `404`/`422` the client answers by
		// rotating its key and booking twice. The guard seam, the header check, the IP limiter and
		// the body validation above still run first, in their contract order (§3.3 "Guard seam
		// chạy trước validate"); only a claim short-cuts, and `none` (no row, or an expired one)
		// falls through to the reserve path, whose locked claim stays authoritative.
		$peek = ( new IdempotencyRepository( $this->services->wpdb(), $this->services->clock() ) )
			->peek( hash( 'sha256', $key ), $scope, $request_hash );
		if ( 'conflict' === $peek['status'] ) {
			return Errors::fromDomain( new IdempotencyConflict() );
		}
		if ( 'in_flight' === $peek['status'] ) {
			return Errors::fromDomain( new IdempotencyInFlight() );
		}
		if ( 'replay' === $peek['status'] ) {
			$existing = $this->services->bookingRepository()->find( (int) ( $peek['booking_id'] ?? 0 ) );
			if ( null === $existing ) {
				// The reserve path's own answer for a claim whose booking is not readable.
				return Errors::fromDomain( new IdempotencyInFlight() );
			}

			return $this->createdResponse( $existing, true, null, $payment_method );
		}

		$definition = $this->services->serviceRepository()->find( $service );
		if ( null === $definition || 'active' !== $definition->status ) {
			return Errors::notFound();
		}

		// WHERE this booking happens (D-R61, rest-contract §3.3 addendum 2026-09-23). Resolved
		// BEFORE the staff gate below, because "does this service have a choice of staff" is a
		// question about one branch, and before the draft, because the resolved id is what the
		// reservation locks, validates and converts time at.
		$location = $this->resolveLocation( $location_request, $service );
		if ( $location instanceof \WP_Error ) {
			return $location;
		}

		// "Customers must choose a staff member" (`booking.staff_choice = required`, D-R52). The
		// refusal is a plain `422 aponto_validation` on the `staff_id` field — the registry's own
		// fit for "the request is missing something this site requires" (docs/error-registry.md);
		// no new code, because nothing new happened: a required argument is absent.
		//
		// Two narrowings keep it honest. It only fires when the service really HAS a choice in it
		// (>=2 PUBLIC eligible staff, the very set the form would have offered) — a service
		// with one visible staff member still books through any-staff, because there is no choice to
		// require. And a block PRESET satisfies it for free: the widget posts that `staff_id`, so
		// `$staff` is not null and this branch is never reached.
		// Counted at the scope the customer CHOSE FROM (review round 3): at the branch ONLY while
		// the location roster is published — then the Staff step listed that branch's
		// `location_staff_ids` — and otherwise at `0`, the scope the catalogue published its staff
		// roster at, whether the branch was assigned or arrived as a block preset. So the server
		// never requires a choice the form could not have offered. The location refusal above
		// fires first, so with both missing the response names `location_id` only (§3.3 "Thứ tự 422").
		$staff_required = $this->staffChoiceRequired( $staff, $service, $location );
		if ( null !== $staff_required ) {
			return $staff_required;
		}

		// A WordPress-user-targeted coupon applies ONLY to the logged-in visitor it names (D-R67e,
		// founder 2026-09-23). The typed email never selects an account: that would let anyone who
		// knows a targeted person's address use their coupon. The REST cookie nonce the widget
		// sends is what makes `get_current_user_id()` resolve here; a guest is user 0, which no
		// allow-list matches.
		$coupon_user_id = '' === $coupon_code ? 0 : get_current_user_id();
		$attempts       = new CouponAttemptGuard( $this->limiter, $ip );
		if ( '' !== $coupon_code ) {
			try {
				$backoff = $attempts->blocked( $request );
			} catch ( DomainException $exception ) {
				return Errors::fromDomain( $exception );
			}
			if ( null !== $backoff ) {
				return Errors::rateLimited( $backoff );
			}
		}
		try {
			$price = OrderPricing::quote(
				$definition->price_minor,
				(string) $settings->get( 'currency' ),
				$coupon_code,
				false,
				$service,
				$coupon_user_id,
				$this->services->clock()->now()
			);
		} catch ( CouponUnavailable $exception ) {
			try {
				$attempts->recordFailure( $request );
			} catch ( DomainException $counter_failure ) {
				return Errors::fromDomain( $counter_failure );
			}

			return Errors::fromDomain( $exception );
		}
		$quoted_total  = $price->total_minor;
		$terms_context = PricingContext::forSite( PricingContext::SCOPE_PREVIEW, $service, $price->currency, $this->services->settings(), 0, 0, $payment_method, $amount_mode );
		try {
			$deposit_terms = OrderPricing::terms( $price, $terms_context );
		} catch ( \Aponto\Payments\PaymentChoiceUnavailable $exception ) {
			return Errors::validation( array( 'payment.amount_mode' => __( 'Full payment is not available for this service.', 'aponto' ) ) );
		}
		$priced = $price->total_minor > 0;

		$now_ts = $this->services->clock()->now()->getTimestamp();
		$within = $start->getTimestamp() >= $now_ts + $definition->min_lead_minutes * 60
			&& $start->getTimestamp() <= $now_ts + $definition->max_horizon_days * DAY_IN_SECONDS;
		if ( ! $within ) {
			return Errors::validation( array( 'start_utc' => __( 'This time is outside the allowed booking window.', 'aponto' ) ) );
		}

		// A FREE or unpriced order never takes a payment method, whatever the request or the mode
		// says: there is nothing to charge, and creating a hold for a zero amount would put a slot
		// behind a payment that can never arrive. "Free" is the order TOTAL after any coupon.
		if ( ! $priced ) {
			if ( '' !== $payment_method ) {
				// REJECTED, not dropped (QA BUG-4). rest-contract §3.3: a free or unpriced service
				// never accepts a method, and sending one is a client bug that deserves a signal —
				// silently accepting it meant a caller could believe it had set up a payment that
				// was never going to happen. A site with `payments.mode = off` never gets here:
				// `payment` is an unknown field there and the generic 422 fires first.
				return Errors::validation( array( 'payment.method' => __( 'This service is free, so it takes no payment method.', 'aponto' ) ) );
			}
			$payment_method = '';
		} elseif ( $payments->refusesPaidBookings() ) {
			// D-R79 (opt-in): online payment is required, nothing can take one, and the owner chose
			// not to take paid bookings unpaid. Enforced HERE so a crafted request cannot get past
			// the form's own message; a free order never reaches this branch.
			return Errors::fromDomain( PaymentException::bookingUnavailable() );
		} elseif ( ( 'required' === $payments->mode() || $deposit_terms->requiresOnlinePayment() ) && $payments_offered && '' === $payment_method ) {
			// `required` only bites when something is actually OFFERED (Codex #1): a site whose
			// only gateway lost its credentials must keep taking bookings, not refuse every one.
			return Errors::validation( array( 'payment.method' => __( 'Please choose a payment method.', 'aponto' ) ) );
		}

		// A pay-online booking is PINNED to `pending` here rather than deferred to
		// `default_booking_status` / `booking.auto_confirm_free` (D-R38a): a hold must never be born
		// `confirmed`, or a site with either of those settings on would hand out a confirmed
		// appointment for money it has not received.
		$initial_status = '' === $payment_method ? null : 'pending';
		$draft          = new BookingDraft( $service, $staff, $location, $start, $deferred ? null : new CustomerInput( $first_name, $last_name, $email, $phone, $note ), $tz, $consent, $key, $request_hash, 1, $scope, $initial_status, $custom['values'], $payment_method, $coupon_code, $coupon_user_id, $quoted_total, $exact_hash, $amount_mode, $deferred );

		// booking_email is the AUTHORITATIVE count of real blocking bookings for the request's
		// email_norm, evaluated INSIDE the reserve transaction right before the insert (REST-4,
		// §6.4.1) — race-safe under the staff lock; cross-staff races may overshoot by one
		// (documented tolerance). Limit/window come from the `aponto_public_rate_limits` filter.
		/**
		 * Filter the public rate-limit buckets (SPEC-P0 §6.4.1).
		 *
		 * @param array<string, array{limit:int, window:int}> $limits  Buckets.
		 * @param WP_REST_Request                             $request Current request.
		 */
		$limits       = apply_filters( 'aponto_public_rate_limits', RateLimiter::defaults(), $request );
		$email_bucket = isset( $limits['booking_email'] ) && is_array( $limits['booking_email'] ) ? $limits['booking_email'] : null;
		$limiter      = $this->limiter;

		$reserve = $this->services->reservationService();
		$reserve->setPreInsertGuard(
			static function ( BookingDraft $guarded ) use ( $email_bucket, $limiter ): void {
				if ( 'public' !== $guarded->scope || null === $guarded->customer || null === $email_bucket ) {
					return;
				}
				$retry = $limiter->emailBookingRetryAfter(
					$guarded->customer->emailNorm(),
					(int) $email_bucket['limit'],
					(int) $email_bucket['window']
				);
				if ( null !== $retry ) {
					// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Stable PII-free message; localized at the REST boundary.
					throw new RateLimited( $retry );
				}
			}
		);

		try {
			$result = null === $staff ? $reserve->reserveAnyStaff( $draft ) : $reserve->reserve( $draft );
		} catch ( \Aponto\Payments\PaymentChoiceUnavailable $exception ) {
			return Errors::validation( array( 'payment.amount_mode' => __( 'Full payment is not available for this service.', 'aponto' ) ) );
		} catch ( \Aponto\Payments\PaymentMethodRequired $exception ) {
			return Errors::validation( array( 'payment.method' => __( 'Please choose a payment method.', 'aponto' ) ) );
		} catch ( CouponUnavailable $exception ) {
			return Errors::fromDomain( $exception );
		} catch ( DomainException $exception ) {
			return Errors::fromDomain( $exception );
		} finally {
			$reserve->setPreInsertGuard( null );
		}

		return $this->createdResponse( $result->booking, $result->replay, $result->raw_token, $payment_method );
	}

	/**
	 * The `201` body for a created OR replayed public booking — one builder for the reserve path
	 * and the early replay (D-R61 review round 3), so a replay short-cut before the topology
	 * checks answers byte-for-byte what the reserve path's own replay answers.
	 *
	 * @param Booking     $booking        The booking.
	 * @param bool        $replay         Whether this is a replay (no links, no token).
	 * @param string|null $raw_token      Raw manage token of a fresh booking, else null.
	 * @param string      $payment_method Chosen payment module code, '' for none.
	 */
	private function createdResponse( Booking $booking, bool $replay, ?string $raw_token, string $payment_method ): WP_REST_Response {
		$payments = $this->services->paymentService();

		// Outbox flush (REST-1): the created rows were queued INSIDE the reservation transaction;
		// send them now. A replay creates no new rows — it only kicks any still-queued leftovers
		// (e.g. the original request died after commit), so the customer never loses the link.
		$this->services->notificationDispatcher()->flushBooking( $booking->id );

		$body = array( 'booking' => $this->bookingPayload( $booking ) );

		// POST-COMMIT, outside every lock (D-R38b). ONE entry point for the original request and its
		// replay (Codex #2): `beginPayment()` reuses the live intent when there is one — pressing
		// "Book" twice must not produce two payments to abandon, and the browser needs the SAME client
		// parameters it was given the first time — and starts a fresh attempt when the previous one
		// died before its reference could be recorded. Two separate methods let a fresh request racing
		// a replay create two intents for one hold.
		if ( '' !== $payment_method ) {
			$body['payment'] = $payments->beginPayment( $booking, $payment_method );
		}

		if ( $replay || null === $raw_token ) {
			$body['links_available'] = false;
			$body['message']         = 0 === $booking->customer_id
				? __( 'Your checkout reservation already exists.', 'aponto' )
				: __( 'The management link has been sent to your email.', 'aponto' );
		} else {
			$body['links_available'] = true;
			$body['manage_url']      = BookingManagePage::manageUrl( $raw_token );
			$body['ics_url']         = rest_url( 'aponto/v1/public/bookings/' . $raw_token . '/ics' );
		}

		return new WP_REST_Response( $body, 201 );
	}

	/**
	 * The 201 an EXACT same-key retry of an already-completed booking gets (D-R67u) — exactly what the
	 * reservation's own replay branch answers: the stored booking, no token or links (they went out
	 * by email), queued-but-unsent notifications flushed, and the payment block rebuilt from the
	 * ORDER's own gateway (reusing the live intent) rather than from anything in the retry.
	 *
	 * @param int $booking_id Booking the completed claim points at.
	 * @return WP_REST_Response|null Null when that booking no longer exists (normal flow decides).
	 */
	private function replayResponse( int $booking_id ): ?WP_REST_Response {
		$booking = $this->services->bookingRepository()->find( $booking_id );
		if ( null === $booking ) {
			return null;
		}
		$this->services->notificationDispatcher()->flushBooking( $booking->id );

		$body  = array( 'booking' => $this->bookingPayload( $booking ) );
		$order = $this->services->orderRepository()->findForBooking( $booking->id );
		$gate  = null === $order ? '' : (string) ( $order['gateway'] ?? '' );
		if ( '' !== $gate ) {
			// READ-ONLY (review round 3): rebuilt from the durable order/charge rows — no readiness
			// check, no claim, no gateway call, no new attempt — except the documented crash
			// recovery (a live hold with no usable attempt), which only beginPayment() can answer.
			$payments        = $this->services->paymentService();
			$body['payment'] = $payments->replayBlock( $booking, $gate ) ?? $payments->beginPayment( $booking, $gate );
		}
		$body['links_available'] = false;
		$body['message']         = __( 'The management link has been sent to your email.', 'aponto' );

		return new WP_REST_Response( $body, 201 );
	}

	/**
	 * Reject unknown root/customer fields so the honeypot is enforced server-side (D-22).
	 *
	 * `custom_fields` joins the allow-list ONLY when the site actually declares extra fields
	 * (D-R30). On a Free build — and on any site that configures none — the key stays unknown and a
	 * request carrying it gets the same 422 it always did: no new public surface appears anywhere
	 * the capability is not owned.
	 *
	 * @param WP_REST_Request $request        Request.
	 * @param bool            $allow_custom   Whether the site declares custom booking-form fields.
	 * @param bool            $allow_payment  Whether the site offers an online payment method.
	 * @param bool            $allow_coupon   Whether the coupon module is available.
	 * @return array<string, string> Validation fields.
	 */
	private function unknownBookingFields( WP_REST_Request $request, bool $allow_custom = false, bool $allow_payment = false, bool $allow_coupon = false ): array {
		$allowed = array( 'service_id', 'staff_id', 'location_id', 'start_utc', 'tz', 'customer', 'consent' );
		if ( $allow_custom ) {
			$allowed[] = 'custom_fields';
		}
		if ( $allow_payment ) {
			$allowed[] = 'payment';
		}
		if ( $allow_coupon ) {
			$allowed[] = 'coupon_code';
		}
		$fields = array();
		foreach ( RequestFields::submittedKeys( $request ) as $key ) {
			if ( ! in_array( $key, $allowed, true ) ) {
				$fields[ (string) $key ] = __( 'Unknown field.', 'aponto' );
			}
		}

		$customer = $request->get_param( 'customer' );
		if ( is_array( $customer ) ) {
			foreach ( array_keys( $customer ) as $key ) {
				// `customer.name` is NOT accepted since the name split (N2): no legacy request shape.
				if ( ! in_array( $key, array( 'first_name', 'last_name', 'email', 'phone', 'note' ), true ) ) {
					$fields[ 'customer.' . (string) $key ] = __( 'Unknown field.', 'aponto' );
				}
			}
		}

		$payment = $request->get_param( 'payment' );
		if ( $allow_payment && is_array( $payment ) ) {
			foreach ( array_keys( $payment ) as $key ) {
				if ( ! in_array( $key, array( 'method', 'amount_mode' ), true ) ) {
					$fields[ 'payment.' . (string) $key ] = __( 'Unknown field.', 'aponto' );
				}
			}
		}

		return $fields;
	}

	/**
	 * Validate the requested payment method against what this site actually offers (D-R38).
	 *
	 * The request never carries an AMOUNT — only which gateway to use. That is the point: the amount
	 * comes from the order's price snapshot, so a browser can never decide what it owes.
	 *
	 * @param WP_REST_Request  $request Request.
	 * @param list<string>     $codes   Payment codes this site may use right now.
	 * @param RequestValidator $v       Validator collecting field errors.
	 * @return string The chosen code, or '' for none / pay on site.
	 */
	private function validatePaymentMethod( WP_REST_Request $request, array $codes, RequestValidator $v ): string {
		$payment = $request->get_param( 'payment' );
		if ( ! is_array( $payment ) ) {
			return '';
		}

		$method = sanitize_key( (string) ( $payment['method'] ?? '' ) );
		if ( '' === $method ) {
			return '';
		}

		// One message for "we do not take online payments" and "that is not a gateway we have": both
		// are the same fact to a caller, and separating them would let a client enumerate which
		// modules a site has installed.
		if ( ! in_array( $method, $codes, true ) ) {
			$v->fail( 'payment.method', __( 'That payment method is not available.', 'aponto' ) );

			return '';
		}

		return $method;
	}

	/**
	 * GET /public/bookings/{token}.
	 *
	 * Resolves a CANCELLED booking too, as a read-only DTO (`status: "cancelled"`,
	 * `can_cancel: false`; every other field unchanged) — D-R25 parity, rest-contract §3.5
	 * addendum 2026-08-02. The manage PAGE already rendered that read-only view through
	 * {@see self::manageDetail()}, and the token is now durable for the booking's lifetime, so a
	 * REST 404 here contradicted both the page and the contract: the customer's link must explain
	 * itself, not look broken. Only a COMPLETED or NO-SHOW booking (D-R33), or an invalid/unknown
	 * token, is the uniform 404.
	 * MUTATIONS are unaffected — {@see self::cancel()} still resolves through
	 * {@see self::lookupActive()} and refuses a terminal booking.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function show( WP_REST_Request $request ) {
		$booking = $this->lookupViewable( (string) $request->get_param( 'token' ) );
		if ( null === $booking ) {
			return $this->tokenNotFound();
		}

		return $this->privacyHeaders( new WP_REST_Response( array( 'booking' => $this->bookingDto( $booking ) ), 200 ) );
	}

	/**
	 * Manage-page detail view (B4 — U4): the same resolution {@see self::show()} performs, exposed
	 * to the server-rendered page. A CANCELLED booking returns a permanently read-only view model
	 * (`can_cancel = false`) instead of a 404, so the link in a cancellation email keeps resolving
	 * to the booking's details. Completed deposit bookings also remain readable for balance
	 * settlement (D-R71c). Other completed/no-show bookings and invalid/unknown tokens
	 * resolve to the uniform 404.
	 *
	 * @param string $token Raw manage token.
	 * @return array<string, mixed>|null
	 */
	public function manageDetail( string $token ): ?array {
		$booking = $this->lookupViewable( $token );

		return null === $booking ? null : $this->bookingDto( $booking );
	}

	/**
	 * Build the public booking DTO shared by {@see self::show()} and {@see self::manageDetail()}.
	 *
	 * @param Booking $booking Booking.
	 * @return array<string, mixed>
	 */
	private function bookingDto( Booking $booking ): array {
		$business = $this->services->businessTimezone()->forLocation( $booking->location_id );
		$display  = '' !== $booking->customer_timezone ? $this->safeZone( $booking->customer_timezone, $business ) : $business;
		$deadline = $booking->start_utc->sub( new \DateInterval( 'PT' . max( 0, (int) $this->services->settings()->get( 'min_cancel_hours' ) ) . 'H' ) );
		$order    = $this->reads->orderForBooking( $booking->id );
		$location = $this->bookingLocation( $booking );

		// A live unpaid hold is cancellable whatever the deadline says (D-R38k), so the read model
		// agrees with what the cancel route will actually do — a `can_cancel: false` that the route
		// then honours is fine, but one the route contradicts turns the manage page into a liar.
		$is_hold = null !== $order
			&& 'pending' === (string) ( $order['payment_status'] ?? 'none' )
			&& '' !== (string) ( $order['hold_expires_at'] ?? '' );
		// The payment is being verified outside this site (a gateway's answer through
		// `aponto_payment_state_{key}`). The cancel route refuses such a hold — it is released only
		// against evidence — so the read model must not promise a cancellation (D-R71).
		$reason    = null !== $order && 'pending' === (string) ( $order['payment_status'] ?? 'none' )
			? \Aponto\Payments\PaymentState::describe( $order, $booking->status )['payment_state_reason']
			: '';
		$verifying = 'verifying_payment' === $reason;
		// PLACED ORDERS THAT ARE NOT A CHECKOUT HOLD (persona QA 2026-10-05, re-test N2 / N7). Two
		// more gateway answers describe an order that is placed and unpaid, and neither is "being
		// verified": `awaiting_offline_payment` (the customer still has to pay — a bank transfer)
		// and `cash_on_delivery` (they pay at the appointment). Neither is a live checkout hold, so
		// neither lifts the cancellation deadline.
		$offline = 'awaiting_offline_payment' === $reason;
		$rule    = \Aponto\Payments\PaymentState::customerCancelRule( $reason );
		if ( 'hold' !== $rule ) {
			$is_hold = false;
		}
		// THE SAME TABLE THE CANCEL ROUTE READS ({@see \Aponto\Payments\PaymentState::customerCancelRule()}).
		// `refused`: money may be on its way (being verified, or a bank transfer the customer still
		// has to make), the gateway will not void, and the read model does not offer a cancellation
		// the route would answer `409 aponto_payment_state`. `policy`: a pay-at-the-appointment
		// order is an appointment like any other — cancellable until `min_cancel_hours`, which is
		// exactly when the gateway's void closes its order and releases the hold.
		$can_cancel = self::customerMayCancel( $rule, $booking->status, $is_hold, $this->services->clock()->now()->getTimestamp() < $deadline->getTimestamp() );

		$balance = array(
			'eligible'    => false,
			'has_attempt' => false,
		);
		if ( OrderAmounts::isDeposit( $order ?? array() ) ) {
			$state   = $this->services->paymentService()->balanceState( $booking->id );
			$balance = array(
				'eligible'    => (bool) $state['eligible'],
				'has_attempt' => null !== ( $state['payment'] ?? null ),
			);
		}

		// ONE `payment_state_reason` vocabulary on this DTO: a PENDING payment carries the derived
		// gateway reason (`PaymentState::REASONS` — checkout_pending, cash_on_delivery, …) that the
		// manage page words its unpaid states from; any other order carries the ledger reason of the
		// deposit read model (paid, deposit_paid, partially_refunded, …, D-R71).
		$read_model = $this->services->paymentService()->orderReadModel( $order ?? array() );
		if ( '' !== $reason ) {
			$read_model['payment_state_reason'] = $reason;
		}

		return array(
			'balance'             => $balance,
			'status'              => $booking->status,
			'start_utc'           => $booking->start_utc->format( 'Y-m-d\TH:i:s\Z' ),
			'end_utc'             => $booking->end_utc->format( 'Y-m-d\TH:i:s\Z' ),
			'display_timezone'    => $display->getName(),
			'timezone_label'      => TimezoneLabel::label( $display, $booking->start_utc ),
			// The studio's own timezone, so the manage page can show a "… at the studio" line
			// when the visitor is booking from a different zone (fleet-r1 Fix 9b).
			'business_timezone'   => $business->getName(),
			'service'             => array( 'name' => $this->reads->serviceName( $booking->service_id ) ),
			'staff'               => $this->staffObject( $booking->staff_id, false ),
			'location'            => $location,
			'order'               => array(
				'code'                     => null !== $order ? (string) $order['code'] : $booking->order_code,
				'subtotal_minor'           => null !== $order ? (int) ( $order['subtotal_minor'] ?? $order['total_minor'] ) : 0,
				'discount_minor'           => null !== $order ? (int) ( $order['discount_minor'] ?? 0 ) : 0,
				'total_minor'              => null !== $order ? (int) $order['total_minor'] : 0,
				'currency'                 => null !== $order ? (string) $order['currency'] : '',
				'coupon_code'              => null !== $order ? (string) ( $order['coupon_code'] ?? '' ) : '',
				// Additive (resume path): the manage page has to know whether this booking is a LIVE
				// unpaid hold, because that is the one state where it can offer a "Pay now" button.
				// Both are facts about the caller's own order and neither is PII.
				'payment_status'           => null !== $order ? (string) $order['payment_status'] : 'none',
				'hold_expires_at'          => null !== $order && '' !== (string) ( $order['hold_expires_at'] ?? '' )
					? gmdate( 'Y-m-d\TH:i:s\Z', strtotime( (string) $order['hold_expires_at'] . ' UTC' ) )
					: null,
				// Additive (2026-10-03): the payment is being verified outside this site (a gateway's
				// answer through `aponto_payment_state_{key}`), so nothing is asked of the customer
				// and the hold deadline is not a promise the page may repeat.
				'payment_verifying'        => $verifying,
				// Additive (2026-10-05): where the customer finds how to pay an order awaiting an
				// offline payment, when its gateway supplies a same-site URL; else null.
				'payment_instructions_url' => $offline && null !== $order && '' !== \Aponto\Payments\PaymentState::instructionsUrl( $order )
					? \Aponto\Payments\PaymentState::instructionsUrl( $order )
					: null,
				// Additive (2026-10-08, rest-contract §10.2): a stored `partial` is a paid deposit OR a
				// partial refund, and the net figure alone cannot say which or how much came back, so
				// the manage page states the amount paid and the refund separately. Only a settled
				// order can carry a refund; every other order answers 0 without a ledger read.
				'refunded_minor'           => null !== $order && in_array( (string) $order['payment_status'], array( 'partial', 'refunded' ), true )
					? (int) $this->services->transactionRepository()->ledgerTotals( (int) $order['id'] )['refunded']
					: 0,
			) + $read_model,
			'can_cancel'          => $can_cancel && ! $balance['has_attempt'],
			'cancel_deadline_utc' => $deadline->format( 'Y-m-d\TH:i:s\Z' ),
		);
	}

	/**
	 * `can_cancel` of the public booking DTO — pure, so the table can be pinned by a unit test.
	 *
	 * @param string $rule            {@see \Aponto\Payments\PaymentState::customerCancelRule()}.
	 * @param string $status          Booking status.
	 * @param bool   $is_hold         Whether the order is a live unpaid checkout hold (D-R38k).
	 * @param bool   $before_deadline Whether `min_cancel_hours` before the start is still ahead.
	 */
	public static function customerMayCancel( string $rule, string $status, bool $is_hold, bool $before_deadline ): bool {
		if ( 'refused' === $rule || ! in_array( $status, array( 'pending', 'confirmed' ), true ) ) {
			return false;
		}

		return $before_deadline || ( 'hold' === $rule && $is_hold );
	}

	/**
	 * Whether the customer's cancellation is mailed (`send`) or silent (`suppress`) — pure.
	 *
	 * A released checkout hold nobody was told about stays silent (QA BUG-6: the widget releases a
	 * hold and rebooks the same person). A released hold of a booking that WAS announced — a placed
	 * pay-at-the-appointment order, whose placement sent "received" and the staff/admin "new
	 * booking" — is an ordinary cancellation: "a cancellation answers an announcement" (D-R72).
	 * Every cancellation that released no hold is mailed, as before.
	 *
	 * @param string $hold      Answer of `PaymentService::releaseHoldForCancel()`.
	 * @param bool   $announced Whether a `created` delivery exists for the booking (the D-R72 test).
	 * @return string `send` or `suppress`.
	 */
	public static function cancelNotificationPolicy( string $hold, bool $announced ): string {
		return 'released' === $hold && ! $announced ? 'suppress' : 'send';
	}

	/**
	 * Record an on-demand hold release that failed for an UNEXPECTED reason (Codex round on PR #42).
	 *
	 * The contended and in-flight cases are handled at the call site and are not anomalies. This is
	 * for the rest: a release that will not succeed on the next tick either, on a request whose answer
	 * tells the customer the slot is being released. The exception CLASS is a safe machine token; its
	 * message is not (§5 invariant 8), so it never leaves the process.
	 *
	 * @param \Throwable $failure The failure.
	 */
	private function logHoldReleaseFailure( \Throwable $failure ): void {
		$parts = explode( '\\', get_class( $failure ) );
		$class = (string) preg_replace( '/[^a-z0-9_]/', '', strtolower( (string) end( $parts ) ) );

		try {
			$this->services->logger()->log(
				'aponto_payment_anomaly',
				'error',
				'A payment anomaly was detected.',
				array(
					'gateway'  => '',
					'order_id' => 0,
					'code'     => 'resume_release_failed' . ( '' === $class ? '' : ':' . $class ),
					'kind'     => 'hold',
				)
			);
		} catch ( \Throwable $ignored ) {
			unset( $ignored ); // A log that cannot be written must not change the customer's answer.
		}
	}

	/**
	 * POST /public/bookings/{token}/pay — resume an unpaid hold (rest-contract §3.10).
	 *
	 * The "complete your payment" reminder used to link a manage page with no way to pay on it: the
	 * widget could only resume a hold out of `sessionStorage`, so the email worked in exactly one
	 * tab on one device — the one the customer had already closed. This route is what makes that
	 * email do something.
	 *
	 * Its authentication is the manage token and nothing else, exactly like `/cancel`: the same hash
	 * lookup, the same uniform 404 for an invalid, unknown or terminal token, the same `booking_ip`
	 * bucket. That is deliberate — the token already grants viewing and cancelling this booking, so
	 * letting it also PAY for the booking grants no capability it did not already imply, and adding
	 * a second secret would mean a second thing to leak.
	 *
	 * It returns what the booking POST returns for a paying booking — the same `payment` block, from
	 * the same {@see PaymentService::beginPayment()} — plus the display fields the widget needs to
	 * draw a summary it never loaded a catalogue for. It creates no booking and moves no money.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function pay( WP_REST_Request $request ) {
		$ip = ClientIp::resolve( (bool) $this->services->settings()->get( 'trusted_proxy' ) );
		try {
			$retry = $this->limiter->hit( 'booking_ip', $ip, $request );
		} catch ( DomainException $exception ) {
			return Errors::fromDomain( $exception );
		}
		if ( null !== $retry ) {
			return Errors::rateLimited( $retry );
		}

		$booking = $this->lookupActive( (string) $request->get_param( 'token' ) );
		if ( null === $booking ) {
			return $this->tokenNotFound();
		}

		$payments = $this->services->paymentService();

		try {
			$state = $payments->resumableHold( $booking->id );
		} catch ( DomainException $exception ) {
			// `aponto_lock_timeout` 503 (rest-contract §3.10), not a 200 saying the gateway is down.
			return Errors::fromDomain( $exception );
		}

		if ( ! $state['ok'] ) {
			// MAKE "BOOK AGAIN" TRUE BEFORE SAYING IT (QA run 2 FINDING-4). A hold past its deadline
			// is refused here, but the SLOT is only released by `aponto_payments_tick` — WP-Cron, so
			// minutes away on a quiet site. In that window the screen sent the customer back to book
			// a time their own abandoned hold was still holding. Releasing this one order first, with
			// the tick's own routine, closes the window: by the time the refusal is rendered the slot
			// really is free.
			//
			// The customer's answer never changes, but the two reasons it might not have worked are not
			// the same fact (Codex round on PR #42). A live capture claim (`PaymentException`) or a
			// contended lock (`PaymentLockTimeout`) is ORDINARY: the tick owns that order and will
			// finish it. Anything else — a storage failure, a bug — means the release will not happen
			// on the next tick either, and a blanket catch made that indistinguishable while the page
			// went on telling the customer the slot was being released. So it is recorded, and the
			// contract's `409` still stands: turning it into a 5xx would replace a true refusal with a
			// page that says nothing at all.
			//
			// `none` is `OrderRepository::releaseHold()`'s own value and the only status a released
			// hold can carry, so it is stated rather than re-read.
			$status = (string) $state['payment_status'];
			if ( 'pending' === $status ) {
				try {
					if ( $payments->expireHoldNow( $booking->id ) ) {
						$status = 'none';
					}
				} catch ( PaymentException | PaymentLockTimeout $expected ) {
					unset( $expected ); // Somebody else owns this order for the moment; the tick finishes it.
				} catch ( \Throwable $failure ) {
					$this->logHoldReleaseFailure( $failure );
				}
			}

			// The page has to be able to say WHICH of the two it is — "you have already paid" and
			// "that hold expired, book again" lead somewhere different — so the real status travels
			// with the refusal. It is not PII and it is about the caller's own booking.
			return Errors::make(
				'aponto_payment_state',
				409,
				array( 'payment_status' => $status )
			);
		}

		try {
			$block = $payments->beginPayment( $booking, (string) $state['gateway'], true );
		} catch ( DomainException $exception ) {
			return Errors::fromDomain( $exception );
		}

		$order = is_array( $state['order'] ) ? $state['order'] : array();
		$zone  = '' !== $booking->customer_timezone
			? $booking->customer_timezone
			: (string) wp_timezone_string();

		return $this->privacyHeaders(
			new WP_REST_Response(
				array(
					'payment'    => $block,
					'order_code' => (string) ( $order['code'] ?? $booking->order_code ),
					'expires_at' => $state['expires_at'],
					'gateway'    => (string) $state['gateway'],
					'booking'    => array(
						'status'           => $booking->status,
						'start_utc'        => $booking->start_utc->format( 'Y-m-d\TH:i:s\Z' ),
						'end_utc'          => $booking->end_utc->format( 'Y-m-d\TH:i:s\Z' ),
						'service'          => array(
							'id'   => $booking->service_id,
							'name' => $this->reads->serviceName( $booking->service_id ),
						),
						'staff'            => $this->staffObject( $booking->staff_id, true ),
						// Additive (D-R61): the same `{name, address}` the create response and
						// the token view carry, so a resumed summary names the same place.
						'location'         => $this->bookingLocation( $booking ),
						'display_timezone' => $zone,
					),
					'order'      => array(
						'total_minor'       => (int) ( $order['total_minor'] ?? 0 ),
						'currency'          => (string) ( $order['currency'] ?? '' ),
						// The widget divides by this to display the total and converts through it to
						// reach a gateway amount; `Intl`'s own table disagrees with ISO (D-R39a), so
						// it can only come from here.
						'currency_exponent' => Settings::currencyExponent( (string) ( $order['currency'] ?? '' ) ),
					) + $this->services->paymentService()->orderReadModel( $order ),
				),
				200
			)
		);
	}

	/**
	 * Read the current balance without creating a payment (D-R71c).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function balanceShow( WP_REST_Request $request ) {
		return $this->balanceRequest( $request, 'read' );
	}

	/**
	 * Observe an existing gateway payment without starting or capturing it.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function balanceCheck( WP_REST_Request $request ) {
		return $this->balanceRequest( $request, 'check' );
	}

	/**
	 * Begin or replay the entire online balance (D-R71c).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function balanceBegin( WP_REST_Request $request ) {
		return $this->balanceRequest( $request, 'begin' );
	}

	/**
	 * Cancel only the balance attempt, never the booking (D-R71c).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function balanceCancel( WP_REST_Request $request ) {
		return $this->balanceRequest( $request, 'cancel' );
	}

	/**
	 * Token authorization, strict fields and rate limits for balance actions.
	 *
	 * @param WP_REST_Request $request Request.
	 * @param string          $operation Read, check, begin or cancel.
	 * @return WP_REST_Response
	 */
	private function balanceRequest( WP_REST_Request $request, string $operation ) {
		try {
			$ip    = ClientIp::resolve( (bool) $this->services->settings()->get( 'trusted_proxy' ) );
			$retry = $this->limiter->hit( 'booking_ip', $ip, $request );
			if ( null !== $retry ) {
				return $this->privacyHeaders( rest_convert_error_to_response( Errors::rateLimited( $retry ) ) );
			}
			$token = (string) $request->get_param( 'token' );
			if ( 1 !== preg_match( '/^[A-Za-z0-9_-]{43}$/', $token ) ) {
				return $this->tokenNotFound();
			}
			$booking = $this->services->bookingRepository()->findByTokenHash( $this->services->tokenGenerator()->hash( $token ) );
			if ( null === $booking ) {
				return $this->tokenNotFound();
			}
			foreach ( RequestFields::submittedKeys( $request ) as $key ) {
				if ( 'begin' !== $operation || 'method' !== $key ) {
					return $this->privacyHeaders( rest_convert_error_to_response( Errors::validation( array( $key => __( 'Unknown field.', 'aponto' ) ) ) ) );
				}
			}
			$payments = $this->services->paymentService();
			if ( 'begin' === $operation ) {
				$method = $request->get_param( 'method' );
				if ( ! is_string( $method ) || '' === $method ) {
					return $this->privacyHeaders( rest_convert_error_to_response( Errors::validation( array( 'method' => __( 'Choose a payment method.', 'aponto' ) ) ) ) );
				}
				$result = $payments->beginBalance( $booking->id, $method );
			} elseif ( 'check' === $operation ) {
				$result = $payments->checkBalance( $booking->id );
			} elseif ( 'cancel' === $operation ) {
				$result = $payments->cancelBalance( $booking->id );
			} else {
				$result = $payments->balanceState( $booking->id );
			}
			return $this->privacyHeaders( new WP_REST_Response( $result, 200 ) );
		} catch ( DomainException $exception ) {
			return $this->privacyHeaders( rest_convert_error_to_response( Errors::fromDomain( $exception ) ) );
		} catch ( StorageException $exception ) {
			unset( $exception );
			return $this->privacyHeaders( rest_convert_error_to_response( Errors::internal() ) );
		}
	}

	/**
	 * POST /public/bookings/{token}/cancel.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function cancel( WP_REST_Request $request ) {
		$ip = ClientIp::resolve( (bool) $this->services->settings()->get( 'trusted_proxy' ) );
		try {
			$retry = $this->limiter->hit( 'cancel_ip', $ip, $request );
		} catch ( DomainException $exception ) {
			return Errors::fromDomain( $exception );
		}
		if ( null !== $retry ) {
			return Errors::rateLimited( $retry );
		}

		$booking = $this->lookupActive( (string) $request->get_param( 'token' ) );
		if ( null === $booking ) {
			return $this->tokenNotFound();
		}

		$reason = mb_substr( sanitize_textarea_field( (string) ( $request->get_param( 'reason' ) ?? '' ) ), 0, 1000 );

		// UNPAID HOLD (D-R38k): the customer never committed anything, so `min_cancel_hours` has
		// nothing to protect and the release happens whatever the deadline says. The decision — and
		// the gateway void that goes with it — lives in the payment use-case; this route only learns
		// which of the three answers came back. `paid` means the money arrived while we were
		// deciding, which puts the request back under the ordinary policy below, deadline included.
		//
		// A PLACED PAY-AT-THE-APPOINTMENT ORDER IS NOT SUCH A HOLD (persona QA 2026-10-05, re-test
		// N2). Its gateway says so through `aponto_payment_state_{key}` (`cash_on_delivery`), and
		// the business's policy governs it like any appointment: inside `min_cancel_hours` the
		// answer is the ordinary "too late", given BEFORE the gateway is asked to void anything —
		// the same table `can_cancel` reads, so the manage page and this route cannot disagree.
		// Read here with no lock held and no transaction open (a provider reads its own records).
		$deadline = $booking->start_utc->sub( new \DateInterval( 'PT' . max( 0, (int) $this->services->settings()->get( 'min_cancel_hours' ) ) . 'H' ) );
		$too_late = $this->services->clock()->now()->getTimestamp() >= $deadline->getTimestamp();
		$order    = $this->reads->orderForBooking( $booking->id );
		$state    = null !== $order && 'pending' === (string) ( $order['payment_status'] ?? 'none' )
			? \Aponto\Payments\PaymentState::describe( $order, $booking->status )['payment_state_reason']
			: '';
		if ( $too_late && 'policy' === \Aponto\Payments\PaymentState::customerCancelRule( $state ) ) {
			return Errors::make( 'aponto_too_late_to_cancel', 409 );
		}

		try {
			$hold = $this->services->paymentService()->releaseHoldForCancel( $booking->id );
		} catch ( DomainException $exception ) {
			return Errors::fromDomain( $exception );
		}

		if ( 'released' !== $hold && $too_late ) {
			return Errors::make( 'aponto_too_late_to_cancel', 409 );
		}

		// A RELEASED HOLD IS NOT A CANCELLATION THE CUSTOMER NEEDS TELLING ABOUT (QA BUG-6). The
		// widget's "Pay on-site instead" — and "change time" — release the hold and immediately
		// rebook the same person, so `send` put "Your booking was cancelled" in their inbox seconds
		// before "Booking received", and gave the owner a cancellation notice for a booking nobody
		// cancelled. The activity log still records the release, and an ORDINARY cancellation (and
		// the expiry cron, which is a real abandonment) still notifies.
		//
		// ...UNLESS THE BOOKING WAS ANNOUNCED (D-R72: "a cancellation answers an announcement"). A
		// placed pay-at-the-appointment order was announced when it was placed — the customer has
		// "we received your booking", the staff member and the owner "new booking" — so releasing
		// its hold is an ordinary cancellation and all of them are told. The deliveries ledger is
		// the test, as for the expiry tick; asked only when a hold was actually released. A booking
		// that was already CONFIRMED was announced by that confirmation, whatever the ledger holds.
		$policy = self::cancelNotificationPolicy(
			$hold,
			// Only for a pay-at-the-appointment order: an in-form gateway's widget still releases and
			// rebooks silently, exactly as before (review 2026-10-06).
			'released' === $hold && 'policy' === \Aponto\Payments\PaymentState::customerCancelRule( $state )
				&& ( 'confirmed' === $booking->status || $this->services->notificationDispatcher()->hasCreatedDeliveries( $booking->id ) )
		);

		try {
			$this->services->bookingStatusService()->transition( $booking->id, 'cancelled', 'customer', $reason, false, $policy );
		} catch ( DomainException $exception ) {
			return Errors::fromDomain( $exception );
		}

		// Outbox flush (V3): send the cancellation rows queued inside the write transaction.
		$this->services->notificationDispatcher()->flushBooking( $booking->id );

		return new WP_REST_Response( array( 'booking' => array( 'status' => 'cancelled' ) ), 200 );
	}

	/**
	 * GET /public/bookings/{token}/ics.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function ics( WP_REST_Request $request ) {
		$booking = $this->lookupActive( (string) $request->get_param( 'token' ) );
		if ( null === $booking ) {
			return $this->tokenNotFound();
		}

		$host          = (string) wp_parse_url( home_url(), PHP_URL_HOST );
		$service_name  = $this->reads->serviceName( $booking->service_id );
		$business_name = (string) $this->services->settings()->get( 'business.name' );
		$location      = $this->bookingLocation( $booking );

		$lines = array(
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//Aponto//Booking//EN',
			'CALSCALE:GREGORIAN',
			'BEGIN:VEVENT',
			'UID:aponto-' . $booking->id . '@' . $host,
			'DTSTAMP:' . gmdate( 'Ymd\THis\Z' ),
			'DTSTART:' . $booking->start_utc->format( 'Ymd\THis\Z' ),
			'DTEND:' . $booking->end_utc->format( 'Ymd\THis\Z' ),
			'SUMMARY:' . $this->icsEscape( $service_name . ' — ' . $business_name ),
		);
		if ( '' !== $location['address'] ) {
			$lines[] = 'LOCATION:' . $this->icsEscape( $location['address'] );
		}
		$lines[] = 'SEQUENCE:' . $booking->ics_sequence;
		$lines[] = 'END:VEVENT';
		$lines[] = 'END:VCALENDAR';
		$body    = implode( "\r\n", array_map( array( $this, 'icsFoldLine' ), $lines ) ) . "\r\n";

		return RawResponse::make(
			$body,
			'text/calendar; charset=UTF-8',
			array(
				'Cache-Control'   => 'private, no-store',
				'Referrer-Policy' => 'no-referrer',
			)
		);
	}

	/**
	 * Resolve the booking location, falling back to the V1 business settings when no concrete
	 * location/address is available.
	 *
	 * `id` (D-R61 review round 3, additive) is the location the booking is AT — `0` for the
	 * business fallback — so a client can tell "a real branch was assigned silently" from "no
	 * branch" without guessing from the name.
	 *
	 * @param Booking $booking Booking.
	 * @return array{id:int, name:string, address:string}
	 */
	private function bookingLocation( Booking $booking ): array {
		$business = array(
			'id'      => 0,
			'name'    => (string) $this->services->settings()->get( 'business.name' ),
			'address' => trim( (string) $this->services->settings()->get( 'business.address' ) ),
		);
		if ( 0 === $booking->location_id ) {
			return $business;
		}

		// A concrete branch keeps its NAME even when its address was left blank — only the
		// address falls back (D-R61 fix round 2, rest-contract §3.3): the customer booked "Uptown",
		// and the confirmation must say so. A row that no longer exists falls back whole.
		$location = $this->public->location( $booking->location_id );
		if ( '' === trim( $location['name'] ) ) {
			return $business;
		}

		return array(
			'id'      => $booking->location_id,
			'name'    => $location['name'],
			'address' => '' !== trim( $location['address'] ) ? $location['address'] : $business['address'],
		);
	}

	/**
	 * Look up a booking by manage token for an ACTION, returning null for an invalid or terminal
	 * token. Used by {@see self::cancel()} (a cancelled, completed or no-show booking takes no
	 * further action — D-R33) and by {@see self::ics()} (a terminal booking has no calendar event
	 * to hand out). The read-only view resolves through {@see self::lookupViewable()} instead.
	 *
	 * @param string $token Raw token.
	 */
	private function lookupActive( string $token ): ?Booking {
		if ( 1 !== preg_match( '/^[A-Za-z0-9_-]{43}$/', $token ) ) {
			return null;
		}
		$booking = $this->services->bookingRepository()->findByTokenHash( $this->services->tokenGenerator()->hash( $token ) );
		if ( null === $booking || in_array( $booking->status, self::TERMINAL, true ) ) {
			return null;
		}

		return $booking;
	}

	/**
	 * Look up a booking for the manage-page VIEW (B4): the same strict token-shape check and
	 * hash lookup as {@see self::lookupActive()}, but a CANCELLED booking is returned (read-only)
	 * rather than nulled. Completed deposit bookings remain viewable for balance settlement
	 * (D-R71c); other terminal bookings and invalid/unknown tokens return uniform 404.
	 * The shared 43-char regex keeps the
	 * constant-shape, enumeration-resistant lookup intact.
	 *
	 * @param string $token Raw token.
	 */
	private function lookupViewable( string $token ): ?Booking {
		if ( 1 !== preg_match( '/^[A-Za-z0-9_-]{43}$/', $token ) ) {
			return null;
		}
		$booking = $this->services->bookingRepository()->findByTokenHash( $this->services->tokenGenerator()->hash( $token ) );
		if ( null === $booking ) {
			return null;
		}
		if ( in_array( $booking->status, self::VIEW_TERMINAL, true ) ) {
			$order = $this->reads->orderForBooking( $booking->id );
			if ( 'completed' !== $booking->status || ! OrderAmounts::isDeposit( $order ?? array() ) ) {
				return null;
			}
		}

		return $booking;
	}

	/**
	 * The compact public booking payload.
	 *
	 * @param Booking $booking Booking.
	 * @return array<string, mixed>
	 */
	private function bookingPayload( Booking $booking ): array {
		$order = $this->reads->orderForBooking( $booking->id );

		return array(
			'id'        => $booking->id,
			'status'    => $booking->status,
			'start_utc' => $booking->start_utc->format( 'Y-m-d\TH:i:s\Z' ),
			'end_utc'   => $booking->end_utc->format( 'Y-m-d\TH:i:s\Z' ),
			'service'   => array(
				'id'   => $booking->service_id,
				'name' => $this->reads->serviceName( $booking->service_id ),
			),
			'staff'     => $this->staffObject( $booking->staff_id, true ),
			// Additive (D-R61, rest-contract §3.3 addendum 2026-09-23): WHERE the server booked
			// it, from the same resolver the token view uses — `business.*` at location `0` — so
			// the confirmation prints the branch the server assigned, not one the client guessed.
			'location'  => $this->bookingLocation( $booking ),
			'order'     => array(
				'code'           => $booking->order_code,
				'subtotal_minor' => null === $order ? 0 : (int) ( $order['subtotal_minor'] ?? $order['total_minor'] ),
				'discount_minor' => null === $order ? 0 : (int) ( $order['discount_minor'] ?? 0 ),
				'total_minor'    => null === $order ? 0 : (int) $order['total_minor'],
				'currency'       => null === $order ? '' : (string) $order['currency'],
				'coupon_code'    => null === $order ? '' : (string) ( $order['coupon_code'] ?? '' ),
			) + $this->services->paymentService()->orderReadModel( $order ?? array() ),
		);
	}

	/**
	 * Add the token privacy headers.
	 *
	 * @param WP_REST_Response $response Response.
	 */
	private function privacyHeaders( WP_REST_Response $response ): WP_REST_Response {
		$response->header( 'Cache-Control', 'private, no-store' );
		$response->header( 'Referrer-Policy', 'no-referrer' );

		return $response;
	}

	/** Build the uniform token-route 404 with the same privacy headers as successful responses. */
	private function tokenNotFound(): WP_REST_Response {
		return $this->privacyHeaders( rest_convert_error_to_response( Errors::notFound() ) );
	}

	/**
	 * Resolve a timezone name, falling back to a default.
	 *
	 * @param string        $name     IANA name.
	 * @param \DateTimeZone $fallback Fallback zone.
	 */
	private function safeZone( string $name, \DateTimeZone $fallback ): \DateTimeZone {
		try {
			return new \DateTimeZone( $name );
		} catch ( \Exception $e ) {
			unset( $e );

			return $fallback;
		}
	}

	/**
	 * Escape an ICS text value (RFC5545).
	 *
	 * @param string $value Value.
	 */
	private function icsEscape( string $value ): string {
		$value = str_replace( array( '\\', ';', ',' ), array( '\\\\', '\\;', '\\,' ), $value );

		return str_replace( array( "\r\n", "\n", "\r" ), '\\n', $value );
	}

	/**
	 * Fold one RFC 5545 content line at 75 octets without splitting UTF-8 code points.
	 * Continuations begin with one space, which counts toward their 75-octet limit.
	 *
	 * @param string $line Unfolded content line.
	 */
	private function icsFoldLine( string $line ): string {
		$chunks = array();
		$offset = 0;
		$first  = true;
		$length = strlen( $line );
		while ( $offset < $length ) {
			$limit    = $first ? 75 : 74;
			$chunk    = mb_strcut( $line, $offset, $limit, 'UTF-8' );
			$chunks[] = $first ? $chunk : ' ' . $chunk;
			$offset  += strlen( $chunk );
			$first    = false;
		}

		return implode( "\r\n", $chunks );
	}

	/**
	 * Whether a customer's phone number can be one (persona QA 2026-10-05, T-088).
	 *
	 * LOOSE on purpose — no country format is assumed, it only stops "abc" being stored and then
	 * printed back in mails and the admin: digits, spaces and `+ ( ) - .` only, and at least five
	 * digits. The booking form applies the same rule before it posts (`isPhoneLike()` in
	 * `assets/src/form/lib/config.js`), so a customer meets it inline rather than as a 422.
	 *
	 * @param string $phone Sanitized phone.
	 */
	public static function phoneLooksValid( string $phone ): bool {
		$phone = trim( $phone );

		return 1 === preg_match( '/^[0-9+().\\- ]+$/', $phone )
			&& strlen( (string) preg_replace( '/\\D+/', '', $phone ) ) >= 5;
	}

	/**
	 * Refuse a null `staff_id` when the site says the customer MUST name a staff member (D-R52).
	 *
	 * Returns the `WP_Error` to answer with, or `null` to carry on. Four terms, cheap first:
	 *
	 *  1. the request left `staff_id` null — a named id is by definition a choice;
	 *  2. `Plan::has( 'multi_staff' )` — the same direct module gate the roster uses (the D-R42
	 *     staff exception), so a Free site never runs the query below;
	 *  3. `booking.staff_choice === 'required'` — the owner's own answer;
	 *  4. the service has >=2 PUBLIC eligible staff, counted with the SAME eligibility
	 *     semantics `/public/services` publishes from (`ConnectionRepository`), so the server
	 *     can only require a choice the form actually offered. `is_public = 0` staff are
	 *     excluded, which is deliberate: a customer cannot be asked to choose somebody they
	 *     were never shown.
	 *
	 * Availability with a null `staff_id` stays allowed: it is a read, it is harmless, and the
	 * any-staff union is what the step's own calendar preview would need anyway.
	 *
	 * @param ?int $staff_id    Requested staff id (null = any).
	 * @param int  $service_id  Requested service id.
	 * @param int  $location_id Resolved location id (D-R61) — counted at only while the location
	 *                          roster is published, else the count runs at `0`.
	 * @return \WP_Error|null
	 */
	private function staffChoiceRequired( ?int $staff_id, int $service_id, int $location_id ): ?\WP_Error {
		if ( null !== $staff_id ) {
			return null;
		}
		if ( ! Plan::instance()->has( 'multi_staff' ) ) {
			return null;
		}
		if ( 'required' !== (string) $this->services->settings()->get( 'booking.staff_choice' ) ) {
			return null;
		}

		// Scoped to THIS service and capped at two rows (fix round 1 P3-2): the question is only
		// "does this service really have a choice in it", and materialising the whole
		// catalogue's roster to answer it made every any-staff booking on a `required` site pay
		// for the entire staff table. Same eligibility semantics, one query, two rows.
		// The scope the form offered its Staff step at (D-R61 review round 3): the branch while the
		// location roster is published (its `location_staff_ids`), else `0` (the D-R50 roster).
		// The roster test runs only here, after the cheap exits, and only for a concrete branch.
		$connections = new ConnectionRepository( $this->services->wpdb() );
		$scope       = 0 !== $location_id && LocationResolution::rosterPublished( $this->services->settings(), $connections ) ? $location_id : 0;
		$eligible    = $connections->countPublicEligible( $service_id, $scope, 2 );
		if ( $eligible < 2 ) {
			return null;
		}

		// Uses the site's own word for a staff member when it has one ("Please choose a stylist
		// …"), because this message lands in the same form that has been saying "Choose your
		// stylist" for four steps (D-R52). No noun is hard-coded: the fallback is the same
		// neutral translated default the widget ships.
		$term = (string) $this->services->settings()->get( 'booking.staff_label' );

		return Errors::validation(
			array(
				'staff_id' => sprintf(
					/* translators: %s: what this business calls its staff, e.g. "stylist" or "staff member". */
					__( 'Please choose a %s for this appointment.', 'aponto' ),
					'' !== $term ? $term : __( 'staff member', 'aponto' )
				),
			)
		);
	}

	/**
	 * Resolve the booking's `location_id` (D-R61, rest-contract §3.3 addendum 2026-09-23).
	 *
	 * The branch table is {@see LocationResolution::resolve()}, bound by
	 * {@see LocationResolution::forService()} exactly as `/public/availability` binds it (one scope
	 * for both routes); this method only maps the two refusals onto the D-R52 shape — a plain
	 * `422 aponto_validation` on the `location_id` field, no new registry code, because nothing
	 * new happened: an argument is invalid, or a required one is absent. A widget that meets the
	 * MISSING refusal treats it as stale configuration (the page predates a second branch) and
	 * walks back to the Location step with a re-read catalogue, exactly as it already does for
	 * `staff_id`.
	 *
	 * Cheap-first by construction: on Free, or with the module off, a null request runs no query;
	 * an explicit id costs one; a null on a module-on site costs the assignment read plus, only
	 * when that finds a branch and the owner chose `visitor`, the capped roster count.
	 *
	 * The assignment is not re-checked under the reservation lock for `status`: the reserve path
	 * re-reads the location's EXISTENCE under `apt:loc:{id}` (`targetsAreBookable()`), which is
	 * the write model's own guard and is unchanged here (no engine change in D-R61).
	 *
	 * @param int|null $requested  Body `location_id` (null = not sent).
	 * @param int      $service_id Active service id.
	 * @return int|\WP_Error The resolved location id (`0` = no-location scope).
	 */
	private function resolveLocation( ?int $requested, int $service_id ) {
		$resolved = LocationResolution::forService(
			$requested,
			$service_id,
			$this->services->settings(),
			new ConnectionRepository( $this->services->wpdb() )
		);

		if ( LocationResolution::INVALID === $resolved ) {
			return Errors::validation( array( 'location_id' => __( 'This location is not available for the selected service.', 'aponto' ) ) );
		}
		if ( LocationResolution::MISSING === $resolved ) {
			return Errors::validation( array( 'location_id' => __( 'Please choose a location for this appointment.', 'aponto' ) ) );
		}

		return $resolved;
	}

	/**
	 * The post-booking `staff` object (D-R51).
	 *
	 * `name` has always been here; `title` is additive and follows the roster's own rule —
	 * OMITTED when empty, so a site with no profiles filled emits the exact keys it emitted
	 * before. The assigned staff member is named even when `is_public = 0`: hiding somebody from the
	 * CHOICE is not hiding them from the customer who has just booked them.
	 *
	 * **NO `avatar` HERE (D-R66, 2026-09-21).** D-R51 added one on the reasoning that the
	 * phase-2 confirmation panel would then need no contract change. Nothing ever rendered it —
	 * the confirmation, the summary recap and the manage page all show name and title — while the
	 * Gravatar leg of the avatar chain put a `gravatar.com` URL containing core's hash of the
	 * STAFF EMAIL into an UNAUTHENTICATED payload, on every site including Free, where
	 * `booking.staff_photos` is not even reachable in the admin. A disclosure with no reader is
	 * not a head start on phase 2, it is a leak waiting for one; the key is removed and phase 2
	 * can add it back deliberately, behind the same switch the pre-booking roster honours. The
	 * removal breaks no shipped contract — `avatar` was introduced on this unreleased branch.
	 *
	 * `booking.staff_titles` is deliberately NOT consulted here. D-R52 scoped that switch to the
	 * PRE-booking roster — it governs what helps a customer choose, not what a customer who has
	 * already booked is told about the person they are about to meet.
	 *
	 * @param int  $staff_id   Assigned staff id.
	 * @param bool $with_id    Whether this placement carries the staff `id` (the create/confirm
	 *                         payloads do; the manage-token view deliberately does not).
	 * @return array<string, mixed>
	 */
	private function staffObject( int $staff_id, bool $with_id ): array {
		$profile = $this->reads->staffProfile( $staff_id );

		$staff = $with_id ? array( 'id' => $staff_id ) : array();

		$staff['name']       = $profile['name'];
		$staff['first_name'] = $profile['first_name'];
		$staff['last_name']  = $profile['last_name'];

		if ( '' !== $profile['title'] ) {
			$staff['title'] = $profile['title'];
		}

		return $staff;
	}
}

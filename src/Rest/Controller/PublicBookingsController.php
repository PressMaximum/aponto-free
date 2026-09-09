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
use Aponto\Frontend\BookingManagePage;
use Aponto\Payments\PaymentException;
use Aponto\Payments\PaymentLockTimeout;
use Aponto\Payments\PaymentRegistry;
use Aponto\Rest\Args;
use Aponto\Rest\Controller;
use Aponto\Rest\Data\BookingReadGateway;
use Aponto\Rest\Data\PublicGateway;
use Aponto\Rest\Errors;
use Aponto\Rest\Policy;
use Aponto\Rest\RequestValidator;
use Aponto\Rest\Services;
use Aponto\Rest\Support\ClientIp;
use Aponto\Rest\Support\CustomFieldInput;
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
		$payments         = $this->services->paymentService();
		$payment_codes    = $payments->enabled() ? PaymentRegistry::offeredCodes() : array();
		$payments_offered = array() !== $payment_codes;

		$unknown = $this->unknownBookingFields( $request, array() !== $custom_definitions, $payments_offered );
		if ( array() !== $unknown ) {
			return Errors::validation( $unknown );
		}

		$key = $request->get_header( 'X-Aponto-Idempotency' );
		$key = null === $key ? '' : sanitize_text_field( $key );
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
		$tz      = $v->timezone( 'tz', $request->get_param( 'tz' ) );

		$customer = $request->get_param( 'customer' );
		$name     = '';
		$email    = '';
		$phone    = '';
		$note     = '';
		if ( ! is_array( $customer ) ) {
			$v->fail( 'customer', __( 'Customer details are required.', 'aponto' ) );
		} else {
			$name  = $v->name( 'customer.name', $customer['name'] ?? null );
			$email = $v->email( 'customer.email', $customer['email'] ?? null );
			$phone = 'off' === (string) $settings->get( 'customer_fields.phone' )
				? ''
				: $v->phone( 'customer.phone', $customer['phone'] ?? '' );
			$note  = $v->text( $customer['note'] ?? '' );
		}

		// Consent is only meaningful while the site has the checkbox ENABLED. With the
		// setting off the submitted value is type-checked but IGNORED, so a client can
		// never fabricate consent evidence (`consent_at` stays NULL) for a site that
		// never asked the visitor for consent (privacy-inventory §consent semantics).
		$consent_enabled = (bool) $settings->get( 'consent_checkbox.enabled' );
		$consent_input   = $v->bool( $request->get_param( 'consent' ) ?? false );
		$consent         = $consent_enabled && $consent_input;

		if ( 'required' === (string) $settings->get( 'customer_fields.phone' ) && '' === $phone ) {
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

		if ( $v->failed() ) {
			return Errors::validation( $v->errors() );
		}

		$email_norm = strtolower( trim( $email ) );

		$definition = $this->services->serviceRepository()->find( $service );
		if ( null === $definition || 'active' !== $definition->status ) {
			return Errors::notFound();
		}

		$now_ts = $this->services->clock()->now()->getTimestamp();
		$within = $start->getTimestamp() >= $now_ts + $definition->min_lead_minutes * 60
			&& $start->getTimestamp() <= $now_ts + $definition->max_horizon_days * DAY_IN_SECONDS;
		if ( ! $within ) {
			return Errors::validation( array( 'start_utc' => __( 'This time is outside the allowed booking window.', 'aponto' ) ) );
		}

		// A FREE or unpriced service never takes a payment method, whatever the request or the mode
		// says: there is nothing to charge, and creating a hold for a zero amount would put a slot
		// behind a payment that can never arrive.
		$priced = null !== $definition->price_minor && $definition->price_minor > 0;
		if ( ! $priced ) {
			if ( '' !== $payment_method ) {
				// REJECTED, not dropped (QA BUG-4). rest-contract §3.3: a free or unpriced service
				// never accepts a method, and sending one is a client bug that deserves a signal —
				// silently accepting it meant a caller could believe it had set up a payment that was
				// never going to happen. A site with `payments.mode = off` never gets here: `payment`
				// is an unknown field there and the generic 422 fires first.
				return Errors::validation( array( 'payment.method' => __( 'This service is free, so it takes no payment method.', 'aponto' ) ) );
			}
			$payment_method = '';
		} elseif ( 'required' === $payments->mode() && $payments_offered && '' === $payment_method ) {
			// `required` only bites when something is actually OFFERED (Codex #1): a site whose only
			// gateway lost its credentials must keep taking bookings, not refuse every one of them.
			return Errors::validation( array( 'payment.method' => __( 'Please choose a payment method.', 'aponto' ) ) );
		}

		$request_hash = RequestFingerprint::forBooking( $service, $staff, 0, $start->format( 'Y-m-d\TH:i:s\Z' ), $tz, $email_norm, $name, $phone, $note, $consent, $custom['values'], $payment_method );
		// A pay-online booking is PINNED to `pending` here rather than deferred to
		// `default_booking_status` / `booking.auto_confirm_free` (D-R38a): a hold must never be born
		// `confirmed`, or a site with either of those settings on would hand out a confirmed
		// appointment for money it has not received.
		$initial_status = '' === $payment_method ? null : 'pending';
		$draft          = new BookingDraft( $service, $staff, 0, $start, new CustomerInput( $name, $email, $phone, $note ), $tz, $consent, $key, $request_hash, 1, 'public', $initial_status, $custom['values'], $payment_method );

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
				if ( 'public' !== $guarded->scope || null === $email_bucket ) {
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
		} catch ( DomainException $exception ) {
			return Errors::fromDomain( $exception );
		} finally {
			$reserve->setPreInsertGuard( null );
		}

		$booking = $result->booking;
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

		if ( $result->replay || null === $result->raw_token ) {
			$body['links_available'] = false;
			$body['message']         = __( 'The management link has been sent to your email.', 'aponto' );
		} else {
			$body['links_available'] = true;
			$body['manage_url']      = BookingManagePage::manageUrl( $result->raw_token );
			$body['ics_url']         = rest_url( 'aponto/v1/public/bookings/' . $result->raw_token . '/ics' );
		}

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
	 * @return array<string, string> Validation fields.
	 */
	private function unknownBookingFields( WP_REST_Request $request, bool $allow_custom = false, bool $allow_payment = false ): array {
		$allowed = array( 'service_id', 'staff_id', 'start_utc', 'tz', 'customer', 'consent' );
		if ( $allow_custom ) {
			$allowed[] = 'custom_fields';
		}
		if ( $allow_payment ) {
			$allowed[] = 'payment';
		}
		$fields = array();
		foreach ( array_keys( $request->get_params() ) as $key ) {
			if ( ! in_array( $key, $allowed, true ) ) {
				$fields[ (string) $key ] = __( 'Unknown field.', 'aponto' );
			}
		}

		$customer = $request->get_param( 'customer' );
		if ( is_array( $customer ) ) {
			foreach ( array_keys( $customer ) as $key ) {
				if ( ! in_array( $key, array( 'name', 'email', 'phone', 'note' ), true ) ) {
					$fields[ 'customer.' . (string) $key ] = __( 'Unknown field.', 'aponto' );
				}
			}
		}

		$payment = $request->get_param( 'payment' );
		if ( $allow_payment && is_array( $payment ) ) {
			foreach ( array_keys( $payment ) as $key ) {
				if ( 'method' !== $key ) {
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
	 * to the booking's details forever. A COMPLETED or NO-SHOW booking (D-R33), or an invalid or
	 * unknown token, resolves to null so the page renders the uniform 404 — enumeration resistance
	 * is unchanged.
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
		$is_hold    = null !== $order
			&& 'pending' === (string) ( $order['payment_status'] ?? 'none' )
			&& '' !== (string) ( $order['hold_expires_at'] ?? '' );
		$can_cancel = in_array( $booking->status, array( 'pending', 'confirmed' ), true )
			&& ( $is_hold || $this->services->clock()->now()->getTimestamp() < $deadline->getTimestamp() );

		return array(
			'status'              => $booking->status,
			'start_utc'           => $booking->start_utc->format( 'Y-m-d\TH:i:s\Z' ),
			'end_utc'             => $booking->end_utc->format( 'Y-m-d\TH:i:s\Z' ),
			'display_timezone'    => $display->getName(),
			'timezone_label'      => TimezoneLabel::label( $display, $booking->start_utc ),
			// The studio's own timezone, so the manage page can show a "… at the studio" line
			// when the visitor is booking from a different zone (fleet-r1 Fix 9b).
			'business_timezone'   => $business->getName(),
			'service'             => array( 'name' => $this->reads->serviceName( $booking->service_id ) ),
			'staff'               => array( 'name' => $this->reads->staffName( $booking->staff_id ) ),
			'location'            => array(
				'name'    => $location['name'],
				'address' => $location['address'],
			),
			'order'               => array(
				'code'            => null !== $order ? (string) $order['code'] : $booking->order_code,
				'total_minor'     => null !== $order ? (int) $order['total_minor'] : 0,
				'currency'        => null !== $order ? (string) $order['currency'] : '',
				// Additive (resume path): the manage page has to know whether this booking is a LIVE
				// unpaid hold, because that is the one state where it can offer a "Pay now" button.
				// Both are facts about the caller's own order and neither is PII.
				'payment_status'  => null !== $order ? (string) $order['payment_status'] : 'none',
				'hold_expires_at' => null !== $order && '' !== (string) ( $order['hold_expires_at'] ?? '' )
					? gmdate( 'Y-m-d\TH:i:s\Z', strtotime( (string) $order['hold_expires_at'] . ' UTC' ) )
					: null,
			),
			'can_cancel'          => $can_cancel,
			'cancel_deadline_utc' => $deadline->format( 'Y-m-d\TH:i:s\Z' ),
		);
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
						'staff'            => array(
							'id'   => $booking->staff_id,
							'name' => $this->reads->staffName( $booking->staff_id ),
						),
						'display_timezone' => $zone,
					),
					'order'      => array(
						'total_minor'       => (int) ( $order['total_minor'] ?? 0 ),
						'currency'          => (string) ( $order['currency'] ?? '' ),
						// The widget divides by this to display the total and converts through it to
						// reach a gateway amount; `Intl`'s own table disagrees with ISO (D-R39a), so
						// it can only come from here.
						'currency_exponent' => Settings::currencyExponent( (string) ( $order['currency'] ?? '' ) ),
					),
				),
				200
			)
		);
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
		try {
			$hold = $this->services->paymentService()->releaseHoldForCancel( $booking->id );
		} catch ( DomainException $exception ) {
			return Errors::fromDomain( $exception );
		}

		if ( 'released' !== $hold ) {
			$deadline = $booking->start_utc->sub( new \DateInterval( 'PT' . max( 0, (int) $this->services->settings()->get( 'min_cancel_hours' ) ) . 'H' ) );
			if ( $this->services->clock()->now()->getTimestamp() >= $deadline->getTimestamp() ) {
				return Errors::make( 'aponto_too_late_to_cancel', 409 );
			}
		}

		// A RELEASED HOLD IS NOT A CANCELLATION THE CUSTOMER NEEDS TELLING ABOUT (QA BUG-6). The
		// widget's "Pay on-site instead" — and "change time" — release the hold and immediately
		// rebook the same person, so `send` put "Your booking was cancelled" in their inbox seconds
		// before "Booking received", and gave the owner a cancellation notice for a booking nobody
		// cancelled. The activity log still records the release, and an ORDINARY cancellation (and
		// the expiry cron, which is a real abandonment) still notifies.
		$policy = 'released' === $hold ? 'suppress' : 'send';

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
	 * @param Booking $booking Booking.
	 * @return array{name:string, address:string}
	 */
	private function bookingLocation( Booking $booking ): array {
		$location = $this->public->location( $booking->location_id );
		if ( 0 !== $booking->location_id && '' !== trim( $location['address'] ) ) {
			return $location;
		}

		return array(
			'name'    => (string) $this->services->settings()->get( 'business.name' ),
			'address' => trim( (string) $this->services->settings()->get( 'business.address' ) ),
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
	 * rather than nulled — only a {@see self::VIEW_TERMINAL} (`completed`/`no_show`, D-R33),
	 * invalid or unknown token is null (uniform 404). The shared 43-char regex keeps the
	 * constant-shape, enumeration-resistant lookup intact.
	 *
	 * @param string $token Raw token.
	 */
	private function lookupViewable( string $token ): ?Booking {
		if ( 1 !== preg_match( '/^[A-Za-z0-9_-]{43}$/', $token ) ) {
			return null;
		}
		$booking = $this->services->bookingRepository()->findByTokenHash( $this->services->tokenGenerator()->hash( $token ) );
		if ( null === $booking || in_array( $booking->status, self::VIEW_TERMINAL, true ) ) {
			return null;
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
		return array(
			'id'        => $booking->id,
			'status'    => $booking->status,
			'start_utc' => $booking->start_utc->format( 'Y-m-d\TH:i:s\Z' ),
			'end_utc'   => $booking->end_utc->format( 'Y-m-d\TH:i:s\Z' ),
			'service'   => array(
				'id'   => $booking->service_id,
				'name' => $this->reads->serviceName( $booking->service_id ),
			),
			'staff'     => array(
				'id'   => $booking->staff_id,
				'name' => $this->reads->staffName( $booking->staff_id ),
			),
			'order'     => array( 'code' => $booking->order_code ),
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
}

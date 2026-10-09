<?php
/**
 * Admin `/bookings` controller (rest-contract §2.8–§2.9).
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

use Aponto\Booking\BookingDraft;
use Aponto\Booking\CustomFieldSchema;
use Aponto\Booking\CustomerInput;
use Aponto\Booking\Exception\CustomerErased;
use Aponto\Booking\Exception\SlotUnavailable;
use Aponto\Booking\Repository\CustomerRepository;
use Aponto\Database\Lock;
use Aponto\Database\StorageException;
use Aponto\Database\TransactionGuard;
use Aponto\Payments\CouponUnavailable;
use Aponto\Payments\CouponUsage;
use Aponto\Payments\OrderPricing;
use Aponto\Payments\OrderAmounts;
use Aponto\Rest\Args;
use Aponto\Rest\Controller;
use Aponto\Rest\Data\BookingReadGateway;
use Aponto\Rest\Data\CustomerGateway;
use Aponto\Payments\PaymentException;
use Aponto\Payments\PaymentRegistry;
use Aponto\Rest\Errors;
use Aponto\Rest\Policy;
use Aponto\Rest\RequestValidator;
use Aponto\Rest\Services;
use Aponto\Rest\Support\Format;
use Aponto\Support\DomainException;
use Aponto\Support\PersonName;
use Aponto\Support\Settings;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Booking list/detail (read gateway) plus manual create, status transition and reschedule, which
 * all run through the engine write services ({@see \Aponto\Booking\ReservationService},
 * {@see \Aponto\Booking\BookingStatusService}, {@see \Aponto\Booking\RescheduleService}). Manual
 * bookings use the `admin` scope (no idempotency/rate limit). The `notify` flag maps to the
 * notification policy via the `aponto_notification_policy` filter honoured by the dispatcher.
 */
final class BookingsController implements Controller {

	/**
	 * Read gateway.
	 *
	 * @var BookingReadGateway
	 */
	private BookingReadGateway $reads;

	/**
	 * Construct the controller.
	 *
	 * @param Services $services Service locator.
	 */
	public function __construct( private Services $services ) {
		$this->reads = new BookingReadGateway( $services->wpdb() );
	}

	/**
	 * Register routes.
	 *
	 * @param string $rest_namespace REST namespace.
	 */
	public function register( string $rest_namespace ): void {
		register_rest_route(
			$rest_namespace,
			'/bookings',
			array(
				array(
					'methods'             => 'GET',
					'permission_callback' => array( Policy::class, 'manageBookings' ),
					'callback'            => array( $this, 'index' ),
					'args'                => array(
						// ONE booking by id (persona QA 2026-10-05): the `#bookings/{id}` deep link opens
						// a booking that may sit outside the list's window. Combines with the other
						// filters; `null` = no filter.
						'id'             => Args::argNullableId(),
						'status'         => Args::argEnum( array( 'pending', 'confirmed', 'cancelled', 'completed', 'no_show', 'all' ), 'all' ),
						'payment_reason' => Args::argEnum( array_merge( OrderAmounts::REASONS, array( 'all' ) ), 'all' ),
						'payment_status' => Args::argEnum( array( 'none', 'pending', 'paid', 'partial', 'refunded', 'all' ), 'all' ),
						'service_id'     => Args::argNullableId(),
						'staff_id'       => Args::argNullableId(),
						// D-R63: `0` = bookings with no location, so not argNullableId().
						'location_id'    => Args::argNullableIdOrZero(),
						'search'         => Args::argSearch(),
						// D-R74: `start` is the order the route has always served; `created` is the
						// admin Bookings list's newest-booking-first.
						'order_by'       => Args::argEnum( array( 'start', 'created' ), 'start' ),
						'page'           => Args::argPage(),
						'per_page'       => Args::argPerPage(),
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
			'/bookings/(?P<id>\d+)',
			array(
				array(
					'methods'             => 'GET',
					'permission_callback' => array( Policy::class, 'manageBookings' ),
					'callback'            => array( $this, 'show' ),
					'args'                => array( 'id' => Args::argId() ),
				),
				array(
					'methods'             => 'PATCH',
					'permission_callback' => array( Policy::class, 'manageBookings' ),
					'callback'            => array( $this, 'patch' ),
					'args'                => array( 'id' => Args::argId() ),
				),
				array(
					'methods'             => 'DELETE',
					'permission_callback' => array( Policy::class, 'manageBookings' ),
					'callback'            => array( $this, 'destroy' ),
					'args'                => array( 'id' => Args::argId() ),
				),
			)
		);

		register_rest_route(
			$rest_namespace,
			'/bookings/(?P<id>\d+)/balance',
			array(
				array(
					'methods'             => 'POST',
					'permission_callback' => array( Policy::class, 'manageBookings' ),
					'callback'            => array( $this, 'recordOnsiteBalance' ),
					'args'                => array( 'id' => Args::argId() ),
				),
				array(
					'methods'             => 'DELETE',
					'permission_callback' => array( Policy::class, 'manageBookings' ),
					'callback'            => array( $this, 'reverseOnsiteBalance' ),
					'args'                => array( 'id' => Args::argId() ),
				),
			)
		);

		register_rest_route(
			$rest_namespace,
			'/bookings/(?P<id>\d+)/balance/refund',
			array(
				'methods'             => 'POST',
				'permission_callback' => array( Policy::class, 'manageBookings' ),
				'callback'            => array( $this, 'refundOnsiteBalance' ),
				'args'                => array( 'id' => Args::argId() ),
			)
		);

		register_rest_route(
			$rest_namespace,
			'/bookings/(?P<id>\d+)/reschedule',
			array(
				'methods'             => 'PUT',
				'permission_callback' => array( Policy::class, 'manageBookings' ),
				'callback'            => array( $this, 'reschedule' ),
				'args'                => array( 'id' => Args::argId() ),
			)
		);
	}

	/**
	 * Record the remaining balance collected on site (D-R71).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function recordOnsiteBalance( WP_REST_Request $request ) {
		return $this->balance( $request, false );
	}

	/**
	 * Reverse an eligible on-site record (D-R71).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function reverseOnsiteBalance( WP_REST_Request $request ) {
		return $this->balance( $request, true );
	}

	/**
	 * Record money already returned on site, without a gateway call (D-R71c).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function refundOnsiteBalance( WP_REST_Request $request ) {
		$id = (int) $request->get_param( 'id' );
		if ( ! $this->reads->exists( $id ) || null === $this->reads->orderForBooking( $id ) ) {
			return Errors::notFound();
		}
		foreach ( \Aponto\Rest\Support\RequestFields::submittedKeys( $request ) as $field ) {
			if ( 'amount_minor' !== $field ) {
				return Errors::validation( array( $field => __( 'Unknown field.', 'aponto' ) ) );
			}
		}
		$amount = $request->get_param( 'amount_minor' );
		if ( ! is_int( $amount ) || $amount < 1 ) {
			return Errors::validation( array( 'amount_minor' => __( 'The refund amount must be a positive whole number of minor units.', 'aponto' ) ) );
		}
		$key = (string) $request->get_header( 'X-Aponto-Idempotency' );
		if ( ! wp_is_uuid( $key ) ) {
			return Errors::validation( array( 'X-Aponto-Idempotency' => __( 'A valid idempotency key is required.', 'aponto' ) ) );
		}
		try {
			$result = $this->services->paymentService()->refundOnsite( $id, $amount, 'admin:' . get_current_user_id(), $key );
		} catch ( DomainException $exception ) {
			return Errors::fromDomain( $exception );
		} catch ( StorageException $exception ) {
			unset( $exception );
			return Errors::internal();
		}
		return new WP_REST_Response(
			array(
				'transaction' => PaymentsController::transactionDto( $result['transaction'] ),
				'order'       => $result['order'],
			),
			200
		);
	}

	/**
	 * Apply a balance action through the serialized payment service.
	 *
	 * @param WP_REST_Request $request Request.
	 * @param bool            $reverse Whether to reverse the record.
	 * @return WP_REST_Response|\WP_Error
	 */
	private function balance( WP_REST_Request $request, bool $reverse ) {
		$id = (int) $request->get_param( 'id' );
		if ( ! $this->reads->exists( $id ) || null === $this->reads->orderForBooking( $id ) ) {
			return Errors::notFound();
		}
		try {
			$payments = $this->services->paymentService();
			$actor    = 'admin:' . get_current_user_id();
			if ( $reverse ) {
				$payments->reverseOnsiteBalance( $id, $actor );
			} else {
				$payments->recordOnsiteBalance( $id, $actor );
			}
		} catch ( DomainException $exception ) {
			return Errors::fromDomain( $exception );
		} catch ( StorageException $exception ) {
			unset( $exception );
			return Errors::internal();
		}
		$row = $this->reads->bookingRow( $id );
		return null === $row ? Errors::notFound() : new WP_REST_Response( array( 'order' => $this->detail( $row )['order'] ), 200 );
	}

	/**
	 * GET /bookings.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function index( WP_REST_Request $request ) {
		$from_raw = (string) ( $request->get_param( 'from' ) ?? '' );
		$to_raw   = (string) ( $request->get_param( 'to' ) ?? '' );
		$fields   = array();
		$from_sql = '';
		$to_sql   = '';

		if ( '' !== $from_raw ) {
			$error = Args::checkUtc( $from_raw );
			if ( '' !== $error ) {
				$fields['from'] = $error;
			} else {
				$dt       = Args::parseUtc( $from_raw );
				$from_sql = null !== $dt ? $dt->format( 'Y-m-d H:i:s' ) : '';
			}
		}
		if ( '' !== $to_raw ) {
			$error = Args::checkUtc( $to_raw );
			if ( '' !== $error ) {
				$fields['to'] = $error;
			} else {
				$dt     = Args::parseUtc( $to_raw );
				$to_sql = null !== $dt ? $dt->format( 'Y-m-d H:i:s' ) : '';
			}
		}
		if ( array() === $fields && '' !== $from_sql && '' !== $to_sql && $from_sql >= $to_sql ) {
			$fields['to'] = __( '"from" must be before "to".', 'aponto' );
		}
		if ( array() !== $fields ) {
			return Errors::validation( $fields );
		}

		$page     = (int) $request->get_param( 'page' );
		$per_page = (int) $request->get_param( 'per_page' );
		$service  = $request->get_param( 'service_id' );
		$staff    = $request->get_param( 'staff_id' );
		$location = $request->get_param( 'location_id' );
		$only_id  = $request->get_param( 'id' );

		$result = $this->reads->listBookings(
			array(
				'id'             => ( null === $only_id || '' === $only_id ) ? null : (int) $only_id,
				'status'         => (string) $request->get_param( 'status' ),
				'payment_status' => (string) $request->get_param( 'payment_status' ),
				'payment_reason' => (string) $request->get_param( 'payment_reason' ),
				'service_id'     => ( null === $service || '' === $service ) ? null : (int) $service,
				'staff_id'       => ( null === $staff || '' === $staff ) ? null : (int) $staff,
				'location_id'    => ( null === $location || '' === $location ) ? null : (int) $location,
				'from'           => $from_sql,
				'to'             => $to_sql,
				'search'         => (string) $request->get_param( 'search' ),
			),
			$page,
			$per_page,
			(string) $request->get_param( 'order_by' )
		);

		$items = array_map( array( $this, 'listItem' ), $result['items'] );
		$items = $this->withPaymentContext( $items );

		return new WP_REST_Response( Format::envelope( $items, $page, $per_page, $result['total'] ), 200 );
	}

	/**
	 * POST /bookings (manual reserve).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function create( WP_REST_Request $request ) {
		$v        = new RequestValidator();
		$service  = $v->id( 'service_id', $request->get_param( 'service_id' ) );
		$staff    = $v->nullableId( 'staff_id', $request->get_param( 'staff_id' ) );
		$location = $v->nullableId( 'location_id', $request->get_param( 'location_id' ) );
		$start    = $v->utc( 'start_utc', $request->get_param( 'start_utc' ) );
		$tz       = $v->timezone( 'tz', $request->get_param( 'tz' ), true );

		$customer   = $request->get_param( 'customer' );
		$first_name = '';
		$last_name  = '';
		$email      = '';
		$phone      = '';
		$note       = '';
		// D-R77 (front desk): `customer_id` names an EXISTING customer the operator picked. The row
		// is used as stored — which is what lets a customer with no email be booked again — so the
		// `customer` object is then optional and only its `note` is read.
		$customer_id = $v->nullableId( 'customer_id', $request->get_param( 'customer_id' ) );
		$picked      = null;
		if ( null !== $customer_id ) {
			$picked = ( new CustomerGateway( $this->services->wpdb(), $this->services->clock() ) )->find( $customer_id );
			if ( null === $picked ) {
				return Errors::notFound();
			}
			// An ANONYMIZED record (privacy erasure / retention sweep) is not a customer any more
			// (Codex review 2026-10-06). Same predicate as the transactional resolve, which repeats
			// the check under the row lock.
			if ( \Aponto\Privacy\Anonymizer::isAnonymized( $customer_id, (string) $picked['email'] ) ) {
				$v->fail( 'customer_id', self::erasedCustomerMessage() );
			}
			$first_name = (string) $picked['first_name'];
			$last_name  = (string) $picked['last_name'];
			$email      = (string) $picked['email'];
			$phone      = (string) $picked['phone'];
			$note       = is_array( $customer ) ? $v->text( $customer['note'] ?? '' ) : '';
		} elseif ( isset( $v->errors()['customer_id'] ) ) {
			// A malformed `customer_id` already failed above; it is not also a missing `customer`.
			$customer = null;
		} elseif ( ! is_array( $customer ) ) {
			$v->fail( 'customer', __( 'Customer details are required.', 'aponto' ) );
		} else {
			// D-R77 (founder 2026-10-06) relaxes D-R69 N3 for THIS route only: the front desk books
			// a walk-in or a phone caller, so a first name is enough — the last name, the email and
			// the phone are optional. No email = no customer mail (the dispatcher drops a job with
			// no recipient) and a NEW customer row every time. The public route still requires all.
			$first_name = $v->namePart( 'customer.first_name', $customer['first_name'] ?? null, 'first' );
			$last_name  = $v->namePart( 'customer.last_name', $customer['last_name'] ?? null, 'last', false );
			$raw_email  = $customer['email'] ?? '';
			$email      = is_string( $raw_email ) && '' === trim( $raw_email ) ? '' : $v->email( 'customer.email', $raw_email );
			$phone      = $v->phone( 'customer.phone', $customer['phone'] ?? '' );
			$note       = $v->text( $customer['note'] ?? '' );
			// The legacy `customer.name` is REFUSED, never silently dropped (N2, D-R69), with the
			// public route's copy. Exactly this one key: the admin route keeps no allow-list.
			if ( array_key_exists( 'name', $customer ) ) {
				$v->unknownField( 'customer.name' );
			}
		}

		$attendees      = $v->intInRange( 'attendees', $request->get_param( 'attendees' ) ?? 1, 1, 65535 );
		$consent        = $v->bool( $request->get_param( 'consent' ) ?? false );
		$default_status = (string) $this->services->settings()->get( 'default_booking_status' );
		$status         = $v->enum( 'status', $request->get_param( 'status' ) ?? $default_status, array( 'pending', 'confirmed' ) );
		$notify         = $v->bool( $request->get_param( 'notify' ) ?? true );
		$coupon_raw     = $request->get_param( 'coupon_code' );
		if ( $request->has_param( 'coupon_code' ) && ! is_string( $coupon_raw ) ) {
			$v->fail( 'coupon_code', __( 'Enter a valid coupon code.', 'aponto' ) );
		}
		$coupon_code = OrderPricing::normalizeCouponCode( $coupon_raw );

		if ( $v->failed() ) {
			return Errors::validation( $v->errors() );
		}
		if ( '' !== $coupon_code && ! OrderPricing::couponsAvailable() ) {
			return Errors::fromDomain( new CouponUnavailable() );
		}

		$location_id = null === $location ? 0 : $location;
		// D-R67b/D-R67e: an operator books on a customer's behalf, so WordPress-user targeting is
		// evaluated against the account an operator LINKED to that customer record — never the
		// operator's own login and never an account looked up by the typed email.
		$coupon_user_id = 0;
		if ( '' !== $coupon_code ) {
			$customers      = new CustomerRepository( $this->services->wpdb(), $this->services->clock() );
			$coupon_user_id = null === $picked ? $customers->linkedWpUserIdForEmail( $email ) : $customers->linkedWpUserId( (int) $picked['id'] );
		}
		if ( '' !== $coupon_code ) {
			$definition = $this->services->serviceRepository()->find( $service );
			if ( null === $definition || 'active' !== $definition->status ) {
				return Errors::notFound();
			}
			try {
				// Preview only. The reservation transaction re-runs this with `$claim=true`, so a
				// concurrent final use is still refused atomically (D-R67b).
				OrderPricing::quote(
					$definition->price_minor,
					(string) $this->services->settings()->get( 'currency' ),
					$coupon_code,
					false,
					$service,
					$coupon_user_id,
					$this->services->clock()->now()
				);
			} catch ( CouponUnavailable $exception ) {
				return Errors::fromDomain( $exception );
			}
		}

		// REST-9: the explicit (validated) status rides the draft — the engine inserts it directly,
		// so no post-create transition dance and the created notification matches the real status.
		$draft = new BookingDraft(
			$service,
			$staff,
			$location_id,
			$start,
			new CustomerInput( $first_name, $last_name, $email, $phone, $note, null === $picked ? 0 : (int) $picked['id'] ),
			$tz,
			$consent,
			null,
			'',
			$attendees,
			'admin',
			$status,
			array(),
			'',
			$coupon_code,
			$coupon_user_id
		);

		try {
			$reserve = $this->services->reservationService();
			$result  = $this->withPolicy(
				$notify,
				static fn () => null === $staff ? $reserve->reserveAnyStaff( $draft ) : $reserve->reserve( $draft )
			);
			$booking = $result->booking;
		} catch ( CustomerErased $exception ) {
			// The picked customer was erased between the pre-read above and the transaction.
			return Errors::validation( array( 'customer_id' => self::erasedCustomerMessage() ) );
		} catch ( DomainException $exception ) {
			return Errors::fromDomain( $exception );
		}

		// Outbox flush (REST-1): send the created rows queued inside the reservation transaction.
		$this->services->notificationDispatcher()->flushBooking( $booking->id );

		$order = null === $booking->order_id ? null : $this->services->orderRepository()->find( (int) $booking->order_id );

		return new WP_REST_Response(
			array(
				'booking' => array(
					'id'        => $booking->id,
					'status'    => $booking->status,
					'start_utc' => $booking->start_utc->format( 'Y-m-d\TH:i:s\Z' ),
					'end_utc'   => $booking->end_utc->format( 'Y-m-d\TH:i:s\Z' ),
					'service'   => array(
						'id'   => $booking->service_id,
						'name' => $this->reads->serviceName( $booking->service_id ),
					),
					'staff'     => $this->staffRef( $booking->staff_id ),
					'order'     => array(
						'code'           => $booking->order_code,
						'subtotal_minor' => null === $order ? 0 : (int) ( $order['subtotal_minor'] ?? $order['total_minor'] ),
						'discount_minor' => null === $order ? 0 : (int) ( $order['discount_minor'] ?? 0 ),
						'total_minor'    => null === $order ? 0 : (int) $order['total_minor'],
						'currency'       => null === $order ? '' : (string) $order['currency'],
						'coupon_code'    => null === $order ? '' : (string) ( $order['coupon_code'] ?? '' ),
					) + $this->services->paymentService()->orderReadModel( $order ?? array() ),
				),
			),
			201
		);
	}

	/**
	 * Field message for a `customer_id` that names an anonymized record.
	 */
	private static function erasedCustomerMessage(): string {
		return __( 'This customer record was deleted. Choose another customer.', 'aponto' );
	}

	/**
	 * GET /bookings/{id}.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function show( WP_REST_Request $request ) {
		$id  = (int) $request->get_param( 'id' );
		$row = $this->reads->bookingRow( $id );
		if ( null === $row ) {
			return Errors::notFound();
		}

		return new WP_REST_Response( $this->detail( $row ), 200 );
	}

	/**
	 * PATCH /bookings/{id} (partial status/payment/internal-note update).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 * @throws \Throwable When a metadata/payment write fails after validation.
	 */
	public function patch( WP_REST_Request $request ) {
		$id  = (int) $request->get_param( 'id' );
		$row = $this->reads->bookingRow( $id );
		if ( null === $row ) {
			return Errors::notFound();
		}

		$has_status  = $request->has_param( 'status' );
		$has_payment = $request->has_param( 'payment_status' );
		$has_note    = $request->has_param( 'internal_note' );
		if ( ! $has_status && ! $has_payment && ! $has_note ) {
			return Errors::make(
				'aponto_validation',
				400,
				array( 'fields' => array( '_' => __( 'At least one booking field must be provided.', 'aponto' ) ) )
			);
		}

		$v              = new RequestValidator();
		$status         = (string) $row['status'];
		$payment_status = '';
		$internal_note  = '';
		if ( $has_status ) {
			$status = $v->enum( 'status', $request->get_param( 'status' ), array( 'pending', 'confirmed', 'cancelled', 'completed', 'no_show' ) );
		}
		if ( $has_payment ) {
			$payment_status = $v->enum( 'payment_status', $request->get_param( 'payment_status' ), array( 'none', 'paid' ) );
		}
		if ( $has_note ) {
			$internal_note = $v->text( $request->get_param( 'internal_note' ) ?? '' );
		}
		if ( $v->failed() ) {
			return Errors::validation( $v->errors() );
		}

		$notify = $v->bool( $request->get_param( 'notify' ) ?? true );
		$force  = $v->bool( $request->get_param( 'force' ) ?? false );
		$reason = $v->text( $request->get_param( 'reason' ) ?? '' );
		$actor  = 'admin:' . get_current_user_id();
		$policy = $notify ? 'send' : 'suppress';

		// D-R38i + Codex #3: the payment REFUSAL is decided BEFORE anything is written — before the
		// status transition, before the internal note. The first cut checked it after the transition,
		// so a refused PATCH had already moved the booking's status by the time it answered 409.
		$order = ( $has_status || $has_payment || $has_note ) ? $this->reads->orderForBooking( $id ) : null;
		if ( $has_payment ) {
			if ( null === $order ) {
				return Errors::notFound();
			}
			try {
				$this->services->paymentService()->assertManualStatusAllowed( (int) $order['id'] );
			} catch ( PaymentException $exception ) {
				return Errors::fromDomain( $exception );
			}
		}

		// The internal note rides whichever transaction runs below, so one request never half-applies.
		$note_writer = $has_note
			? function () use ( $id, $internal_note ): void {
				$this->services->bookingMetaRepository()->setInternalNote( $id, $internal_note );
			}
			: null;

		$serialize_transition = false;
		if ( $has_status ) {
			$guard_booking        = $this->services->bookingRepository()->find( $id );
			$guard                = apply_filters( 'aponto_admin_booking_transition_guard', null, $guard_booking, $status );
			$serialize_transition = true === $guard;
			if ( $guard instanceof \WP_Error ) {
				return $guard;
			}
		}

		$payments     = $this->services->paymentService();
		$notification = '';

		// Native gateways release an unpaid hold before an admin confirmation. An external
		// checkout may explicitly retain that obligation without recording a payment (D-R71k).
		if ( $has_status && 'confirmed' === $status ) {
			try {
				$payments->releaseHoldForAdminConfirm( $id );
			} catch ( DomainException $exception ) {
				return Errors::fromDomain( $exception );
			}
			// A provider reconciliation may already have applied the requested transition.
			if ( 'confirmed' !== (string) $row['status'] && 'confirmed' === (string) ( $this->reads->bookingRow( $id )['status'] ?? '' ) ) {
				$has_status = false;
			}
		}

		// ADMIN CANCEL ON A LIVE HOLD (D-R40c). Since no timer releases a hold whose `void` will not
		// confirm, an admin cancel is the RESOLUTION for one — and it is also the ordinary case where
		// the operator simply cancels an unpaid booking and the intent should not be left alive at
		// the gateway. The void is re-attempted here; if it still cannot be confirmed, the cancel
		// proceeds anyway and the record says an admin overrode it. Before the transition, for the
		// same reason as the confirm branch above: a refused release must not leave a moved booking.
		if ( $has_status && 'cancelled' === $status ) {
			try {
				$payments->releaseHoldForAdminCancel( $id );
			} catch ( DomainException $exception ) {
				return Errors::fromDomain( $exception );
			}
			// D-R71f: an external checkout cancelled by that release already cancelled the booking.
			if ( 'cancelled' !== (string) $row['status'] && 'cancelled' === (string) ( $this->reads->bookingRow( $id )['status'] ?? '' ) ) {
				$has_status = false;
			}
		}

		// ONE SERIALIZATION DOMAIN (Codex C). When a PATCH carries both a status and a payment change
		// the two must be one decision: taking the order lock twice would leave a window between them
		// in which a webhook settles the payment — after the refusal check had already decided the
		// order was not gateway-tracked. The transition owns its own transaction (R3-3 forbids
		// nesting), so it runs inside the lock but not inside our transaction.
		$transition = function () use ( $has_status, $id, $status, $actor, $reason, $force, $policy, $notify ): void {
			if ( ! $has_status ) {
				return;
			}
			$this->withPolicy(
				$notify,
				fn () => $this->services->bookingStatusService()->transition( $id, $status, $actor, $reason, $force, $policy )
			);
		};

		try {
			if ( $has_payment && null !== $order ) {
				$payments->withOrderLock(
					(int) $order['id'],
					function ( Lock $lock ) use ( $payments, $order, $payment_status, $actor, $note_writer, $transition ): void {
						$transition();
						$payments->markManualUnderLock( $lock, (int) $order['id'], $payment_status, $actor, $note_writer );
					}
				);
			} else {
				if ( $serialize_transition && null !== $order ) {
					$payments->withOrderLock( (int) $order['id'], $transition );
				} else {
					$transition();
				}

				if ( null !== $note_writer ) {
					$tx = new TransactionGuard( $this->services->wpdb() );
					$tx->begin();
					try {
						$note_writer();
						$tx->commit();
					} catch ( \Throwable $failure ) {
						$tx->rollback();
						throw $failure;
					}
				}
			}
		} catch ( PaymentException $exception ) {
			return Errors::fromDomain( $exception );
		} catch ( SlotUnavailable $exception ) {
			$resource_messages = array(
				'staff_unavailable'    => __( 'This booking cannot be restored because the assigned staff member is no longer active.', 'aponto' ),
				'service_unavailable'  => __( 'This booking cannot be restored because its service is no longer active.', 'aponto' ),
				'location_unavailable' => __( 'This booking cannot be restored because its location is no longer active.', 'aponto' ),
			);
			if ( isset( $resource_messages[ $exception->reason() ] ) ) {
				return Errors::make(
					$exception->errorCode(),
					$exception->httpStatus(),
					array( 'reason' => $exception->reason() ),
					$resource_messages[ $exception->reason() ]
				);
			}

			return Errors::fromDomain( $exception );
		} catch ( DomainException $exception ) {
			return Errors::fromDomain( $exception );
		}

		if ( $has_status ) {
			$this->services->notificationDispatcher()->flushBooking( $id );
			$notification = $this->services->notificationDispatcher()->statusOutcomeFor( $id );
		}
		do_action( 'aponto_booking_sync_flush', $id );
		$fresh_row   = $this->reads->bookingRow( $id );
		$fresh_order = $this->reads->orderForBooking( $id );
		if ( null === $fresh_row ) {
			return Errors::notFound();
		}

		$body = array(
			'booking' => array(
				'id'             => $id,
				'status'         => (string) $fresh_row['status'],
				'payment_status' => null === $fresh_order ? 'none' : (string) $fresh_order['payment_status'],
				'updated_at'     => Format::utcDatetime( (string) $fresh_row['updated_at'] ),
			),
		);

		$external = null === $fresh_order ? null : $this->externalOrder( $fresh_order );
		if ( null !== $external ) {
			$body['external_order'] = $external;
		}

		// ADDITIVE and status-only (§5 invariant 9): a payment/note-only PATCH sends no customer
		// email, so claiming an outcome for it would be noise. The admin UI keys its toast on this
		// instead of assuming `notify: true` means the customer heard anything — untrue on every
		// fresh install for `completed` and `no_show`, whose templates ship OFF.
		if ( $has_status && '' !== $notification ) {
			$body['notification'] = $notification;
		}

		if ( ! $has_status && ( $has_payment || $has_note ) ) {
			// The booking row has no payment column: carry the order's payment status (and its
			// references, which the Booking-object hooks already publish) on both sides, so a
			// payment PATCH is a visible difference to listeners (webhooks review L9).
			$order_fields = static fn( ?array $o ): array => array(
				'order_id'       => null === $o ? null : (int) $o['id'],
				'order_code'     => null === $o ? null : (string) $o['code'],
				'payment_status' => null === $o ? 'none' : (string) $o['payment_status'],
			);
			try {
				/**
				 * Fires after a booking is updated and business locks are released (extension-surface §2).
				 *
				 * @param array<string, mixed> $row Persisted domain row plus order_id/order_code/payment_status.
				 * @param array<string, mixed> $before Previous domain row plus the same order fields.
				 */
				do_action( 'aponto_booking_updated', $fresh_row + $order_fields( $fresh_order ), $row + $order_fields( $order ) );
			} catch ( \Throwable $listener_failure ) {
				unset( $listener_failure ); // Post-commit extensions cannot invalidate the saved operation.
			}
		}

		return new WP_REST_Response( $body, 200 );
	}

	/**
	 * DELETE /bookings/{id}.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 * @throws \Throwable When the atomic deletion fails.
	 */
	public function destroy( WP_REST_Request $request ) {
		$deleted_order_ids = array();
		$id                = (int) $request->get_param( 'id' );
		$tx                = new TransactionGuard( $this->services->wpdb() );
		$booking           = \Aponto\Extension\RetainedData::run(
			$this->services->wpdb(),
			function () use ( $id, $tx, &$deleted_order_ids ): ?\Aponto\Booking\Booking {
				$tx->begin();
				try {
					$booking = $this->services->bookingRepository()->findForUpdate( $id );
					if ( null === $booking ) {
						$tx->rollback();

						return null;
					}
					$order      = $this->reads->orderForBooking( $id );
					$order_code = null === $order ? '' : (string) $order['code'];

					$this->services->activityRepository()->log(
						'booking',
						$id,
						'deleted',
						array(
							'status'      => $booking->status,
							'start_utc'   => $booking->start_utc->format( 'Y-m-d\TH:i:s\Z' ),
							'customer_id' => $booking->customer_id,
							'order_code'  => $order_code,
						),
						'admin:' . get_current_user_id()
					);

					$this->deleteNotificationDeliveries( $id );
					$this->services->bookingMetaRepository()->deleteForBooking( $id );
					// BEFORE the orders delete (D-R38): transactions reference the order, and removing the
					// order first would leave rows pointing at an id nothing owns — invisible to every reader
					// and to the eraser, which walks bookings.
					$this->services->transactionRepository()->deleteForBooking( $id );
					// A hard delete hands the order's coupon use back (D-R67d) — BEFORE the order row that
					// carries the release stamp goes, inside this transaction, idempotent per order.
					( new CouponUsage( $this->services->wpdb(), $this->services->clock() ) )->releaseForBooking( $id );
					$deleted_order_ids = $this->services->orderRepository()->deleteForBooking( $id );
					\Aponto\Extension\RetainedData::erase( $this->services->wpdb(), 'booking', $id );
					$this->services->bookingRepository()->delete( $id );
					$tx->commit();
				} catch ( \Throwable $failure ) {
					$tx->rollback();
					throw $failure;
				}
				return $booking;
			}
		);
		if ( null === $booking ) {
			return Errors::notFound();
		}

		try {
			/**
			 * Fires after a booking is deleted and business locks are released (extension-surface §2).
			 *
			 * @param array<string, mixed> $row Erased subject identity.
			 */
			do_action( 'aponto_booking_deleted', array( 'id' => $id ) );
		} catch ( \Throwable $listener_failure ) {
			unset( $listener_failure ); // Post-commit extensions cannot invalidate the saved operation.
		}

		foreach ( $deleted_order_ids as $order_id ) {
			try {
				/**
				 * Fires after a committed order deletion and lock release (extension-surface §Order deletion action).
				 *
				 * @param array<string,mixed> $identity Deleted order identity.
				 */
				do_action( 'aponto_order_deleted', array( 'id' => $order_id ) );
			} catch ( \Throwable $listener_failure ) {
				unset( $listener_failure ); // Each committed order is observed independently.
			}
		}

		return new WP_REST_Response(
			array(
				'deleted' => true,
				'id'      => $id,
			),
			200
		);
	}

	/**
	 * PUT /bookings/{id}/reschedule.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function reschedule( WP_REST_Request $request ) {
		$id = (int) $request->get_param( 'id' );
		if ( ! $this->reads->exists( $id ) ) {
			return Errors::notFound();
		}

		$v     = new RequestValidator();
		$start = $v->utc( 'start_utc', $request->get_param( 'start_utc' ) );
		$staff = $v->id( 'staff_id', $request->get_param( 'staff_id' ) );
		// D-R63 (rest-contract §2.9 addendum 2026-09-23): an optional TARGET location — absent or
		// null keeps the booking's own; `0` moves it to "no location", so it is not a nullableId().
		$location = $v->nullableInt( 'location_id', $request->get_param( 'location_id' ), 0 );
		// D-R63 fix round 1 (browser QA B3): the admin's "Notify customer" choice, as `POST` and
		// `PATCH` already take it — default true, so a pre-D-R63 request is unchanged.
		$notify = $v->bool( $request->get_param( 'notify' ) ?? true );
		if ( $v->failed() ) {
			return Errors::validation( $v->errors() );
		}

		$actor = 'admin:' . get_current_user_id();
		try {
			$reschedule = $this->services->rescheduleService();
			$booking    = $this->withPolicy(
				$notify,
				static fn () => $reschedule->reschedule( $id, $start, $staff, $actor, $location )
			);
		} catch ( DomainException $exception ) {
			return Errors::fromDomain( $exception );
		}

		// Outbox flush (V3): send the reschedule row queued inside the write transaction.
		$this->services->notificationDispatcher()->flushBooking( $booking->id );
		do_action( 'aponto_booking_sync_flush', $id );
		$order = $this->reads->orderForBooking( $id );

		return new WP_REST_Response(
			array(
				'external_order' => null === $order ? null : $this->externalOrder( $order ),
				'booking'        => array(
					'id'           => $booking->id,
					'staff_id'     => $booking->staff_id,
					'start_utc'    => $booking->start_utc->format( 'Y-m-d\TH:i:s\Z' ),
					'end_utc'      => $booking->end_utc->format( 'Y-m-d\TH:i:s\Z' ),
					'ics_sequence' => $booking->ics_sequence,
					// ADDITIVE (D-R63): where the booking now is.
					'location_id'  => $booking->location_id,
				),
			),
			200
		);
	}

	/**
	 * Run a write action under a forced `suppress` notification policy when notifications are off.
	 *
	 * @template T
	 * @param bool         $notify Whether to notify.
	 * @param callable():T $action Action.
	 * @return T
	 */
	private function withPolicy( bool $notify, callable $action ) {
		if ( $notify ) {
			return $action();
		}

		$force_suppress = static fn (): string => 'suppress';
		add_filter( 'aponto_notification_policy', $force_suppress );
		try {
			return $action();
		} finally {
			remove_filter( 'aponto_notification_policy', $force_suppress );
		}
	}

	/**
	 * Delete queued/sent notification-delivery rows for a hard-deleted booking.
	 *
	 * @param int $booking_id Booking id.
	 * @throws StorageException When the delete fails.
	 */
	private function deleteNotificationDeliveries( int $booking_id ): void {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Hard-delete cleanup inside the controller transaction.
		$result = $this->services->wpdb()->delete(
			$this->services->wpdb()->prefix . 'aponto_notification_deliveries',
			array( 'booking_id' => $booking_id ),
			array( '%d' )
		);
		if ( false === $result ) {
			throw StorageException::fromSqlError(
				esc_html( 'booking notification deliveries delete' ),
				esc_html( (string) $this->services->wpdb()->last_error )
			);
		}
	}

	/**
	 * The `booking.staff` reference of the create response: id, composed display name and the
	 * two stored parts (name split N2, D-R69).
	 *
	 * @param int $staff_id Staff id.
	 * @return array{id:int, name:string, first_name:string, last_name:string}
	 */
	private function staffRef( int $staff_id ): array {
		$profile = $this->reads->staffProfile( $staff_id );

		return array(
			'id'         => $staff_id,
			'name'       => $profile['name'],
			'first_name' => $profile['first_name'],
			'last_name'  => $profile['last_name'],
		);
	}

	/**
	 * Serialize a booking list row.
	 *
	 * @param array<string, mixed> $row Joined row.
	 * @return array<string, mixed>
	 */
	private function listItem( array $row ): array {
		return array(
			'id'                => (int) $row['id'],
			'status'            => (string) $row['status'],
			'start_utc'         => Format::utcDatetime( (string) $row['start_datetime_utc'] ),
			'end_utc'           => Format::utcDatetime( (string) $row['end_datetime_utc'] ),
			'local_date'        => (string) $row['local_date'],
			'service'           => array(
				'id'   => (int) $row['service_id'],
				'name' => (string) ( $row['service_name'] ?? '' ),
			),
			// `name` is the composed display name, never stored; the parts ride beside it
			// (name split N2, D-R69).
			'staff'             => array(
				'id'         => (int) $row['staff_id'],
				'name'       => PersonName::display( (string) ( $row['staff_first_name'] ?? '' ), (string) ( $row['staff_last_name'] ?? '' ) ),
				'first_name' => (string) ( $row['staff_first_name'] ?? '' ),
				'last_name'  => (string) ( $row['staff_last_name'] ?? '' ),
			),
			'customer'          => array(
				'id'         => (int) $row['customer_id'],
				'name'       => PersonName::display( (string) ( $row['customer_first_name'] ?? '' ), (string) ( $row['customer_last_name'] ?? '' ) ),
				'first_name' => (string) ( $row['customer_first_name'] ?? '' ),
				'last_name'  => (string) ( $row['customer_last_name'] ?? '' ),
				'email'      => (string) ( $row['customer_email'] ?? '' ),
				'phone'      => (string) ( $row['customer_phone'] ?? '' ),
			),
			'order'             => array(
				'subtotal_minor'    => Format::intOrNull( $row['subtotal_minor'] ?? null ) ?? ( Format::intOrNull( $row['total_minor'] ?? null ) ?? 0 ),
				'discount_minor'    => Format::intOrNull( $row['discount_minor'] ?? null ) ?? 0,
				'total_minor'       => Format::intOrNull( $row['total_minor'] ?? null ) ?? 0,
				'coupon_code'       => (string) ( $row['coupon_code'] ?? '' ),
				'currency'          => (string) ( $row['currency'] ?? '' ),
				// ADDITIVE (2026-09-05). The exponent of THIS ORDER's currency, which is not always
				// the store's: an order is priced once and keeps its currency forever, so a store that
				// has since switched has historical orders in the old one. The admin bundle used to
				// divide every figure by the STORE's exponent, which turns 12345 MGA (2 decimals) into
				// $123.45 on a USD store — and the refund dialog is an input, so that error does not
				// just misread, it moves the wrong amount of money.
				'currency_exponent' => Settings::currencyExponent( (string) ( $row['currency'] ?? '' ) ),
				'payment_status'    => (string) ( $row['payment_status'] ?? 'none' ),
			) + $this->services->paymentService()->orderReadModel( array_merge( $row, array( 'id' => (int) ( $row['order_id'] ?? 0 ) ) ) ),
			'customer_timezone' => (string) $row['customer_timezone'],
			'attendees'         => (int) $row['attendees'],
			'created_at'        => Format::utcDatetime( (string) $row['created_at'] ),
			// ADDITIVE (D-R63, rest-contract §2.8 addendum 2026-09-23): the admin location facet
			// and the Calendar location filter key on the id; `0` = no location.
			'location_id'       => (int) ( $row['location_id'] ?? 0 ),
		);
	}

	/**
	 * Add the two facts a list reader needs to tell a checkout from a booking (persona QA
	 * 2026-10-05, re-test of T-038). Both are ADDITIVE and absent from every other row:
	 *
	 * - `order.payment_state_reason` — only on rows whose payment is `pending`: the same derived
	 *   reason the detail DTO carries ({@see \Aponto\Payments\PaymentState::describe()}, gateway
	 *   answer included). `checkout_pending` is a hold whose customer has not finished checkout;
	 *   anything else is an order somebody still has to act on. Derived per row, which is why it
	 *   is limited to pending payments — a handful of rows on any page.
	 * - `checkout_abandoned: true` — only on a `cancelled` row whose unpaid hold was released
	 *   (`payment_hold_expired` / `hold_released` on its activity trail) and that was never
	 *   announced to anybody (no `created` delivery, the D-R72 test): a checkout that was never placed, not an
	 *   appointment that was cancelled. Two batched reads for the page's cancelled rows.
	 *
	 * @param list<array<string, mixed>> $items Serialized list items.
	 * @return list<array<string, mixed>>
	 */
	private function withPaymentContext( array $items ): array {
		$cancelled = array();
		foreach ( $items as $index => $item ) {
			if ( 'cancelled' === $item['status'] ) {
				$cancelled[] = (int) $item['id'];
			}
			if ( 'pending' !== $item['order']['payment_status'] ) {
				continue;
			}
			$order = $this->reads->orderForBooking( (int) $item['id'] );
			if ( null === $order ) {
				continue;
			}
			try {
				$charge = $this->services->transactionRepository()->pendingCharge( (int) $order['id'] );
				$items[ $index ]['order']['payment_state_reason'] = \Aponto\Payments\PaymentState::describe(
					$order,
					(string) $item['status'],
					null !== $charge && in_array( $charge['status'], array( 'capturing', 'voiding' ), true )
				)['payment_state_reason'];
			} catch ( \Throwable $unreadable ) {
				unset( $unreadable ); // A gateway that cannot answer leaves the row as it was.
			}
		}

		$abandoned = $this->reads->abandonedCheckoutIds( $cancelled );
		if ( array() !== $abandoned ) {
			foreach ( $items as $index => $item ) {
				if ( in_array( (int) $item['id'], $abandoned, true ) ) {
					$items[ $index ]['checkout_abandoned'] = true;
				}
			}
		}

		return $items;
	}

	/**
	 * The external checkout's billing address for this booking as one display line, or ''.
	 *
	 * @param int $booking_id Booking id.
	 */
	private function billingAddress( int $booking_id ): string {
		$raw     = $this->services->bookingMetaRepository()->getKey( $booking_id, \Aponto\Booking\Repository\BookingMetaRepository::BILLING_ADDRESS_KEY );
		$address = null === $raw ? null : json_decode( $raw, true );
		if ( ! is_array( $address ) ) {
			return '';
		}
		$parts = array();
		foreach ( array( 'company', 'address_1', 'address_2', 'city', 'state', 'postcode', 'country' ) as $field ) {
			if ( is_string( $address[ $field ] ?? null ) && '' !== trim( $address[ $field ] ) ) {
				$parts[] = sanitize_text_field( $address[ $field ] );
			}
		}
		return implode( ', ', $parts );
	}

	/**
	 * Resolve an optional local admin destination owned by a registered gateway.
	 *
	 * @param array<string, mixed> $order Persisted order.
	 * @return array{url:string,label:string}|null
	 */
	private function refundManagement( array $order ): ?array {
		$gateway = (string) ( $order['gateway'] ?? '' );
		if ( ! PaymentRegistry::isPaymentModule( $gateway ) ) {
			return null;
		}
		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound -- Registry allow-list checked before building the gateway hook.
		$value = apply_filters( 'aponto_payment_refund_management_' . $gateway, null, $order );
		if ( ! is_array( $value ) || ! is_string( $value['url'] ?? null ) || ! is_string( $value['label'] ?? null ) ) {
			return null;
		}
		$url   = $this->adminUrl( $value['url'] );
		$label = sanitize_text_field( $value['label'] );
		if ( null === $url || '' === $label ) {
			return null;
		}
		return array(
			'url'   => $url,
			'label' => $label,
		);
	}

	/**
	 * Resolve an optional display record of the external order a gateway settled through.
	 *
	 * For a checkout platform (e.g. WooCommerce) this names the platform order and the
	 * payment method the customer actually chose there. Display only; never settlement input.
	 *
	 * @param array<string, mixed> $order Persisted order.
	 * @return array{reference:string,status:string,payment_method:string,url:?string,freshness:string,sync:string,notice?:string,action?:array{label:string,confirm:string,path:string}}|null
	 */
	private function externalOrder( array $order ): ?array {
		$gateway = (string) ( $order['gateway'] ?? '' );
		if ( ! PaymentRegistry::isPaymentModule( $gateway ) ) {
			return null;
		}
		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound -- Registry allow-list checked before building the gateway hook.
		$value = apply_filters( 'aponto_payment_external_order_' . $gateway, null, $order );
		if ( ! is_array( $value ) || ! is_string( $value['reference'] ?? null ) ) {
			return null;
		}
		$reference = sanitize_text_field( $value['reference'] );
		if ( '' === $reference ) {
			return null;
		}
		$out = array(
			'reference'      => $reference,
			'status'         => sanitize_text_field( is_string( $value['status'] ?? null ) ? $value['status'] : '' ),
			'payment_method' => sanitize_text_field( is_string( $value['payment_method'] ?? null ) ? $value['payment_method'] : '' ),
			'url'            => is_string( $value['url'] ?? null ) ? $this->adminUrl( $value['url'] ) : null,
			'freshness'      => in_array( $value['freshness'] ?? '', array( 'live', 'last_known' ), true ) ? $value['freshness'] : 'last_known',
			'sync'           => in_array( $value['sync'] ?? '', array( 'pending', 'synced', 'review' ), true ) ? $value['sync'] : 'review',
		);
		// ADDITIVE (2026-10-03): something about the external order needs the operator, said in
		// the gateway's own server-computed words, optionally with ONE action the operator can
		// take. The action is a POST to a route of that same gateway module and nothing else:
		// the path is checked against the order's own gateway code, so a driver cannot point the
		// button at another module's or a core route.
		$notice = is_string( $value['notice'] ?? null ) ? mb_substr( sanitize_text_field( $value['notice'] ), 0, 400 ) : '';
		if ( '' !== $notice ) {
			$out['notice'] = $notice;
		}
		$action = is_array( $value['action'] ?? null ) ? $value['action'] : array();
		$label  = is_string( $action['label'] ?? null ) ? mb_substr( sanitize_text_field( $action['label'] ), 0, 80 ) : '';
		$path   = is_string( $action['path'] ?? null ) ? $action['path'] : '';
		if ( '' !== $label && 1 === preg_match( '#^/modules/' . preg_quote( $gateway, '#' ) . '/[a-z0-9_/-]{1,160}$#D', $path ) && ! str_contains( $path, '//' ) ) {
			$out['action'] = array(
				'label'   => $label,
				'confirm' => is_string( $action['confirm'] ?? null ) ? mb_substr( sanitize_text_field( $action['confirm'] ), 0, 400 ) : '',
				'path'    => $path,
			);
		}
		return $out;
	}

	/**
	 * Accept only a same-origin wp-admin URL without credentials or traversal.
	 *
	 * @param string $raw Candidate URL.
	 */
	private function adminUrl( string $raw ): ?string {
		$url   = esc_url_raw( $raw, array( 'http', 'https' ) );
		$parts = wp_parse_url( $url );
		$admin = wp_parse_url( admin_url() );
		if ( ! is_array( $parts ) || ! is_array( $admin ) || isset( $parts['user'] ) || isset( $parts['pass'] ) ) {
			return null;
		}
		foreach ( array( 'scheme', 'host' ) as $key ) {
			if ( empty( $parts[ $key ] ) || strtolower( $parts[ $key ] ) !== strtolower( $admin[ $key ] ?? '' ) ) {
				return null;
			}
		}
		$default_port = 'https' === strtolower( $parts['scheme'] ) ? 443 : 80;
		$path         = $parts['path'] ?? '';
		$admin_path   = rtrim( $admin['path'] ?? '/wp-admin/', '/' ) . '/';
		if ( (int) ( $parts['port'] ?? $default_port ) !== (int) ( $admin['port'] ?? $default_port )
			|| ! str_starts_with( $path, $admin_path ) || str_contains( $path, '..' )
			|| str_contains( $path, '\\' ) || preg_match( '/%(?:2e|2f|5c)/i', $path ) ) {
			return null;
		}
		return $url;
	}

	/**
	 * Serialize the booking detail (booking + order + activities).
	 *
	 * @param array<string, mixed> $row Booking row.
	 * @return array<string, mixed>
	 */
	private function detail( array $row ): array {
		$id              = (int) $row['id'];
		$order           = $this->reads->orderForBooking( $id );
		$charge          = null === $order ? null : $this->services->transactionRepository()->pendingCharge( (int) $order['id'] );
		$payment_context = null === $order ? array() : \Aponto\Payments\PaymentState::describe( $order, (string) $row['status'], null !== $charge && in_array( $charge['status'], array( 'capturing', 'voiding' ), true ) );
		// ONE `payment_state_reason` vocabulary (D-R71 + persona QA 2026-10-05): a PENDING payment
		// carries the derived gateway reason above; any other order the ledger reason of the deposit
		// read model (`deposit_paid`, `partially_refunded`, …), which `describe()` would otherwise
		// shadow with the raw stored status.
		if ( null !== $order && 'pending' !== (string) $order['payment_status'] ) {
			unset( $payment_context['payment_state_reason'] );
		}

		$activities = array();
		foreach ( $this->reads->activitiesForBooking( $id ) as $activity ) {
			$meta         = json_decode( (string) $activity['meta'], true );
			$activities[] = array(
				'id'           => (int) $activity['id'],
				'action'       => (string) $activity['action'],
				'meta'         => is_array( $meta ) ? $meta : (object) array(),
				'initiated_by' => (string) $activity['initiated_by'],
				'created_at'   => Format::utcDatetime( (string) $activity['created_at'] ),
			);
		}

		return array(
			'booking'    => array(
				'id'                 => $id,
				'service_id'         => (int) $row['service_id'],
				'staff_id'           => (int) $row['staff_id'],
				'location_id'        => (int) $row['location_id'],
				'occurrence_id'      => Format::intOrNull( $row['occurrence_id'] ),
				'start_datetime_utc' => Format::utcDatetime( (string) $row['start_datetime_utc'] ),
				'end_datetime_utc'   => Format::utcDatetime( (string) $row['end_datetime_utc'] ),
				'local_date'         => (string) $row['local_date'],
				'start_minute'       => (int) $row['start_minute'],
				'end_minute'         => (int) $row['end_minute'],
				'buffer_before'      => (int) $row['buffer_before'],
				'buffer_after'       => (int) $row['buffer_after'],
				'status'             => (string) $row['status'],
				'attendees'          => (int) $row['attendees'],
				'customer_id'        => (int) $row['customer_id'],
				'customer_timezone'  => (string) $row['customer_timezone'],
				'customer_note'      => (string) $row['customer_note'],
				'internal_note'      => $this->services->bookingMetaRepository()->internalNote( $id ),
				'custom_fields'      => $this->customFields( $id ),
				'billing_address'    => $this->billingAddress( $id ),
				'consent_at'         => Format::utcDatetime( $row['consent_at'] ),
				'ics_sequence'       => (int) $row['ics_sequence'],
				'created_at'         => Format::utcDatetime( (string) $row['created_at'] ),
				'updated_at'         => Format::utcDatetime( (string) $row['updated_at'] ),
			),
			'order'      => null === $order ? null : $payment_context + array(
				'id'                => (int) $order['id'],
				'code'              => (string) $order['code'],
				'subtotal_minor'    => (int) ( $order['subtotal_minor'] ?? $order['total_minor'] ),
				'discount_minor'    => (int) ( $order['discount_minor'] ?? 0 ),
				'total_minor'       => (int) $order['total_minor'],
				'coupon_code'       => (string) ( $order['coupon_code'] ?? '' ),
				'currency'          => (string) $order['currency'],
				// ADDITIVE (2026-09-05): the exponent of THIS ORDER's currency. See `listItem()`.
				'currency_exponent' => Settings::currencyExponent( (string) $order['currency'] ),
				'payment_status'    => (string) $order['payment_status'],
				'gateway'           => (string) $order['gateway'],
				'transaction_ref'   => (string) $order['transaction_ref'],
				'refund_management' => $this->refundManagement( $order ),
				'external_order'    => $this->externalOrder( $order ),
				// D-R38: additive. `hold_expires_at` is read with `??` so this DTO renders unchanged
				// against a schema that predates the column, and `transactions` is `[]` for every
				// order that never touched a gateway — which is every order on a site that takes no
				// online payments.
				'hold_expires_at'   => Format::utcDatetime( (string) ( $order['hold_expires_at'] ?? '' ) ),
				'transactions'      => array_map(
					array( PaymentsController::class, 'transactionDto' ),
					$this->services->transactionRepository()->forOrder( (int) $order['id'] )
				),
				'items'             => array_map( array( $this, 'orderItem' ), $order['items'] ),
			) + $this->services->paymentService()->orderReadModel( $order ) + $this->services->paymentService()->adminPaymentModel( $order ),
			'activities' => $activities,
		);
	}

	/**
	 * The customer's answers to the site's extra booking-form fields, ready to render (D-R30).
	 *
	 * Read GENERICALLY from `aponto_booking_meta` — the controller knows the storage convention, not
	 * the module. Labels resolve from the CURRENT definitions and fall back to the slug, so a booking
	 * keeps showing what the customer answered after the field is renamed or removed: the answer is
	 * historical evidence, and dropping it because a definition changed would quietly rewrite the
	 * record. Values are stored sanitized; the checkbox convention is "a row exists" = checked.
	 *
	 * Persona QA 2026-10-05, T-046 (additive): the answers come back in the FORM's own order — the
	 * current definitions first, then answers whose field has since been removed — and each carries
	 * its `type`, so the admin can print a ticked checkbox as "Yes" instead of the stored `1`. `type`
	 * is `''` for an answer whose definition is gone. An unticked checkbox still has no row and is
	 * not invented here: "this field did not exist when the customer booked" stores nothing either,
	 * and the two cannot be told apart.
	 *
	 * @param int $booking_id Booking id.
	 * @return list<array{slug: string, label: string, value: string, type: string}>
	 */
	private function customFields( int $booking_id ): array {
		$stored = $this->services->bookingMetaRepository()->customFields( $booking_id );
		if ( array() === $stored ) {
			return array();
		}

		$definitions = ( new CustomFieldSchema( $this->services->settings(), $this->services->clock() ) )->bySlug();

		return self::orderedAnswers( $stored, $definitions );
	}

	/**
	 * Stored answers in definition order, each with its label and type (T-046).
	 *
	 * @param array<string, string>                                $stored      Slug => stored value.
	 * @param array<string, \Aponto\Booking\CustomFieldDefinition> $definitions Current definitions, in form order.
	 * @return list<array{slug: string, label: string, value: string, type: string}>
	 */
	public static function orderedAnswers( array $stored, array $definitions ): array {
		$out = array();
		foreach ( $definitions as $slug => $definition ) {
			if ( ! array_key_exists( $slug, $stored ) ) {
				continue;
			}
			$out[] = array(
				'slug'  => (string) $slug,
				'label' => $definition->label,
				'value' => (string) $stored[ $slug ],
				'type'  => $definition->type,
			);
		}
		foreach ( $stored as $slug => $value ) {
			if ( isset( $definitions[ $slug ] ) ) {
				continue;
			}
			$out[] = array(
				'slug'  => (string) $slug,
				'label' => (string) $slug,
				'value' => (string) $value,
				'type'  => '',
			);
		}

		return $out;
	}

	/**
	 * Serialize an order item.
	 *
	 * @param array<string, mixed> $item Order item row.
	 * @return array<string, mixed>
	 */
	private function orderItem( array $item ): array {
		return array(
			'id'           => (int) $item['id'],
			'item_type'    => (string) $item['item_type'],
			'booking_id'   => Format::intOrNull( $item['booking_id'] ),
			'amount_minor' => (int) $item['amount_minor'],
			'meta'         => (string) $item['meta'],
		);
	}
}

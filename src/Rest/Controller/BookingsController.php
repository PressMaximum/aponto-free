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
use Aponto\Database\Lock;
use Aponto\Database\StorageException;
use Aponto\Database\TransactionGuard;
use Aponto\Rest\Args;
use Aponto\Rest\Controller;
use Aponto\Rest\Data\BookingReadGateway;
use Aponto\Payments\PaymentException;
use Aponto\Rest\Errors;
use Aponto\Rest\Policy;
use Aponto\Rest\RequestValidator;
use Aponto\Rest\Services;
use Aponto\Rest\Support\Format;
use Aponto\Support\DomainException;
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
						'status'         => Args::argEnum( array( 'pending', 'confirmed', 'cancelled', 'completed', 'no_show', 'all' ), 'all' ),
						'payment_status' => Args::argEnum( array( 'none', 'pending', 'paid', 'partial', 'refunded', 'all' ), 'all' ),
						'service_id'     => Args::argNullableId(),
						'staff_id'       => Args::argNullableId(),
						'search'         => Args::argSearch(),
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

		$result = $this->reads->listBookings(
			array(
				'status'         => (string) $request->get_param( 'status' ),
				'payment_status' => (string) $request->get_param( 'payment_status' ),
				'service_id'     => ( null === $service || '' === $service ) ? null : (int) $service,
				'staff_id'       => ( null === $staff || '' === $staff ) ? null : (int) $staff,
				'from'           => $from_sql,
				'to'             => $to_sql,
				'search'         => (string) $request->get_param( 'search' ),
			),
			$page,
			$per_page
		);

		$items = array_map( array( $this, 'listItem' ), $result['items'] );

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
		$tz       = $v->timezone( 'tz', $request->get_param( 'tz' ) );

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
			$phone = $v->phone( 'customer.phone', $customer['phone'] ?? '' );
			$note  = $v->text( $customer['note'] ?? '' );
		}

		$attendees      = $v->intInRange( 'attendees', $request->get_param( 'attendees' ) ?? 1, 1, 65535 );
		$consent        = $v->bool( $request->get_param( 'consent' ) ?? false );
		$default_status = (string) $this->services->settings()->get( 'default_booking_status' );
		$status         = $v->enum( 'status', $request->get_param( 'status' ) ?? $default_status, array( 'pending', 'confirmed' ) );
		$notify         = $v->bool( $request->get_param( 'notify' ) ?? true );

		if ( $v->failed() ) {
			return Errors::validation( $v->errors() );
		}

		$location_id = null === $location ? 0 : $location;

		// REST-9: the explicit (validated) status rides the draft — the engine inserts it directly,
		// so no post-create transition dance and the created notification matches the real status.
		$draft = new BookingDraft(
			$service,
			$staff,
			$location_id,
			$start,
			new CustomerInput( $name, $email, $phone, $note ),
			$tz,
			$consent,
			null,
			'',
			$attendees,
			'admin',
			$status
		);

		try {
			$reserve = $this->services->reservationService();
			$result  = $this->withPolicy(
				$notify,
				static fn () => null === $staff ? $reserve->reserveAnyStaff( $draft ) : $reserve->reserve( $draft )
			);
			$booking = $result->booking;
		} catch ( DomainException $exception ) {
			return Errors::fromDomain( $exception );
		}

		// Outbox flush (REST-1): send the created rows queued inside the reservation transaction.
		$this->services->notificationDispatcher()->flushBooking( $booking->id );

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
					'staff'     => array(
						'id'   => $booking->staff_id,
						'name' => $this->reads->staffName( $booking->staff_id ),
					),
					'order'     => array( 'code' => $booking->order_code ),
				),
			),
			201
		);
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
		$order = ( $has_payment || $has_note ) ? $this->reads->orderForBooking( $id ) : null;
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

		$payments     = $this->services->paymentService();
		$notification = '';

		// ADMIN CONFIRM ON A LIVE HOLD (Codex C). Confirming an unpaid hold by hand produces the one
		// state the design exists to prevent — a confirmed appointment with a live gateway intent
		// behind it, which the customer can still pay and which the expiry cron then walks past. The
		// admin has made the call, so the intent is voided and the hold dropped BEFORE the transition;
		// the booking is then confirmed like any other.
		if ( $has_status && 'confirmed' === $status ) {
			try {
				$payments->releaseHoldForAdminConfirm( $id );
			} catch ( DomainException $exception ) {
				return Errors::fromDomain( $exception );
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
		}

		// ONE SERIALIZATION DOMAIN (Codex C). When a PATCH carries both a status and a payment change
		// the two must be one decision: taking the order lock twice would leave a window between them
		// in which a webhook settles the payment — after the refusal check had already decided the
		// order was not gateway-tracked. The transition owns its own transaction (R3-3 forbids
		// nesting), so it runs inside the lock but not inside our transaction.
		$transition = function () use ( $has_status, $id, $status, $actor, $reason, $force, $policy, $notify, &$notification ): void {
			if ( ! $has_status ) {
				return;
			}
			$booking = $this->withPolicy(
				$notify,
				fn () => $this->services->bookingStatusService()->transition( $id, $status, $actor, $reason, $force, $policy )
			);

			// Outbox flush (V3): send only for an actual status transition.
			$this->services->notificationDispatcher()->flushBooking( $booking->id );

			// What the admin is actually told (rest-contract §2.9 addendum 2026-09-03). Read AFTER the
			// flush: it is synchronous in this same request, so the real result — sent, failed, or
			// still queued for the cron — is known before the response is built.
			$notification = $this->services->notificationDispatcher()->statusOutcomeFor( $booking->id );
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
				$transition();

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
		} catch ( DomainException $exception ) {
			return Errors::fromDomain( $exception );
		}

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

		// ADDITIVE and status-only (§5 invariant 9): a payment/note-only PATCH sends no customer
		// email, so claiming an outcome for it would be noise. The admin UI keys its toast on this
		// instead of assuming `notify: true` means the customer heard anything — untrue on every
		// fresh install for `completed` and `no_show`, whose templates ship OFF.
		if ( $has_status && '' !== $notification ) {
			$body['notification'] = $notification;
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
		$id = (int) $request->get_param( 'id' );
		$tx = new TransactionGuard( $this->services->wpdb() );
		$tx->begin();
		try {
			$booking = $this->services->bookingRepository()->findForUpdate( $id );
			if ( null === $booking ) {
				$tx->rollback();

				return Errors::notFound();
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
			$this->services->orderRepository()->deleteForBooking( $id );
			$this->services->bookingRepository()->delete( $id );
			$tx->commit();
		} catch ( \Throwable $failure ) {
			$tx->rollback();
			throw $failure;
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
		if ( $v->failed() ) {
			return Errors::validation( $v->errors() );
		}

		$actor = 'admin:' . get_current_user_id();
		try {
			$booking = $this->services->rescheduleService()->reschedule( $id, $start, $staff, $actor );
		} catch ( DomainException $exception ) {
			return Errors::fromDomain( $exception );
		}

		// Outbox flush (V3): send the reschedule row queued inside the write transaction.
		$this->services->notificationDispatcher()->flushBooking( $booking->id );

		return new WP_REST_Response(
			array(
				'booking' => array(
					'id'           => $booking->id,
					'staff_id'     => $booking->staff_id,
					'start_utc'    => $booking->start_utc->format( 'Y-m-d\TH:i:s\Z' ),
					'end_utc'      => $booking->end_utc->format( 'Y-m-d\TH:i:s\Z' ),
					'ics_sequence' => $booking->ics_sequence,
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
			'staff'             => array(
				'id'   => (int) $row['staff_id'],
				'name' => (string) ( $row['staff_name'] ?? '' ),
			),
			'customer'          => array(
				'id'    => (int) $row['customer_id'],
				'name'  => (string) ( $row['customer_name'] ?? '' ),
				'email' => (string) ( $row['customer_email'] ?? '' ),
				'phone' => (string) ( $row['customer_phone'] ?? '' ),
			),
			'order'             => array(
				'total_minor'       => Format::intOrNull( $row['total_minor'] ?? null ) ?? 0,
				'currency'          => (string) ( $row['currency'] ?? '' ),
				// ADDITIVE (2026-09-05). The exponent of THIS ORDER's currency, which is not always
				// the store's: an order is priced once and keeps its currency forever, so a store that
				// has since switched has historical orders in the old one. The admin bundle used to
				// divide every figure by the STORE's exponent, which turns 12345 MGA (2 decimals) into
				// $123.45 on a USD store — and the refund dialog is an input, so that error does not
				// just misread, it moves the wrong amount of money.
				'currency_exponent' => Settings::currencyExponent( (string) ( $row['currency'] ?? '' ) ),
				'payment_status'    => (string) ( $row['payment_status'] ?? 'none' ),
			),
			'customer_timezone' => (string) $row['customer_timezone'],
			'attendees'         => (int) $row['attendees'],
			'created_at'        => Format::utcDatetime( (string) $row['created_at'] ),
		);
	}

	/**
	 * Serialize the booking detail (booking + order + activities).
	 *
	 * @param array<string, mixed> $row Booking row.
	 * @return array<string, mixed>
	 */
	private function detail( array $row ): array {
		$id    = (int) $row['id'];
		$order = $this->reads->orderForBooking( $id );

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
				'consent_at'         => Format::utcDatetime( $row['consent_at'] ),
				'ics_sequence'       => (int) $row['ics_sequence'],
				'created_at'         => Format::utcDatetime( (string) $row['created_at'] ),
				'updated_at'         => Format::utcDatetime( (string) $row['updated_at'] ),
			),
			'order'      => null === $order ? null : array(
				'id'                => (int) $order['id'],
				'code'              => (string) $order['code'],
				'total_minor'       => (int) $order['total_minor'],
				'currency'          => (string) $order['currency'],
				// ADDITIVE (2026-09-05): the exponent of THIS ORDER's currency. See `listItem()`.
				'currency_exponent' => Settings::currencyExponent( (string) $order['currency'] ),
				'payment_status'    => (string) $order['payment_status'],
				'gateway'           => (string) $order['gateway'],
				'transaction_ref'   => (string) $order['transaction_ref'],
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
			),
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
	 * @param int $booking_id Booking id.
	 * @return list<array{slug: string, label: string, value: string}>
	 */
	private function customFields( int $booking_id ): array {
		$stored = $this->services->bookingMetaRepository()->customFields( $booking_id );
		if ( array() === $stored ) {
			return array();
		}

		$definitions = ( new CustomFieldSchema( $this->services->settings(), $this->services->clock() ) )->bySlug();

		$out = array();
		foreach ( $stored as $slug => $value ) {
			$definition = $definitions[ $slug ] ?? null;
			$out[]      = array(
				'slug'  => (string) $slug,
				'label' => null !== $definition ? $definition->label : (string) $slug,
				'value' => (string) $value,
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

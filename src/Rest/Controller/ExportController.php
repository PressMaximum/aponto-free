<?php
/**
 * Admin `/export/*.csv` controller (rest-contract §2.14).
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
use Aponto\Rest\Data\ExportGateway;
use Aponto\Rest\Errors;
use Aponto\Rest\Policy;
use Aponto\Rest\Services;
use Aponto\Rest\Support\Format;
use Aponto\Rest\Support\RawResponse;
use Aponto\Support\PersonName;
use WP_REST_Request;
use WP_REST_Response;

/**
 * CSV exports for bookings and customers. Each response starts with one UTF-8 BOM for Excel
 * compatibility. The controller currently assembles rows in memory; "stream" means Router emits
 * the marked raw body verbatim rather than JSON-encoding it, not constant-memory database output.
 * Cells are defended against spreadsheet formula injection by {@see RawResponse::csvCell}.
 */
final class ExportController implements Controller {

	/**
	 * Export read gateway.
	 *
	 * @var ExportGateway
	 */
	private ExportGateway $reads;

	/**
	 * Business timezone — the zone the booking start is shown in on the calendar, confirmations and
	 * the day-sheet (C6: reception needs a local wall-clock column, not only the UTC instant).
	 *
	 * @var \DateTimeZone
	 */
	private \DateTimeZone $business_tz;

	/**
	 * Construct the controller.
	 *
	 * @param Services $services Service locator.
	 */
	public function __construct( Services $services ) {
		$this->reads       = new ExportGateway( $services->wpdb() );
		$this->business_tz = $services->businessTimezone()->forLocation( 0 );
	}

	/**
	 * Register routes.
	 *
	 * @param string $rest_namespace REST namespace.
	 */
	public function register( string $rest_namespace ): void {
		register_rest_route(
			$rest_namespace,
			'/export/bookings.csv',
			array(
				'methods'             => 'GET',
				'permission_callback' => array( Policy::class, 'manageBookings' ),
				'callback'            => array( $this, 'bookings' ),
				'args'                => array(
					'status'      => Args::argEnum( array( 'pending', 'confirmed', 'cancelled', 'completed', 'no_show', 'all' ), 'all' ),
					'service_id'  => Args::argNullableId(),
					'staff_id'    => Args::argNullableId(),
					// D-R63: `0` = bookings with no location, so not argNullableId().
					'location_id' => Args::argNullableIdOrZero(),
					'search'      => Args::argSearch(),
				),
			)
		);

		register_rest_route(
			$rest_namespace,
			'/export/customers.csv',
			array(
				'methods'             => 'GET',
				'permission_callback' => array( Policy::class, 'manageBookings' ),
				'callback'            => array( $this, 'customers' ),
				'args'                => array( 'search' => Args::argSearch() ),
			)
		);
	}

	/**
	 * GET /export/bookings.csv.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function bookings( WP_REST_Request $request ) {
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

		$service  = $request->get_param( 'service_id' );
		$staff    = $request->get_param( 'staff_id' );
		$location = $request->get_param( 'location_id' );

		$rows = $this->reads->exportBookings(
			array(
				'status'      => (string) $request->get_param( 'status' ),
				'service_id'  => ( null === $service || '' === $service ) ? null : (int) $service,
				'staff_id'    => ( null === $staff || '' === $staff ) ? null : (int) $staff,
				'location_id' => ( null === $location || '' === $location ) ? null : (int) $location,
				'from'        => $from_sql,
				'to'          => $to_sql,
				'search'      => (string) $request->get_param( 'search' ),
			)
		);

		// `start_local` + `timezone` are additive trailing columns (C6): the same instant as
		// `start_utc` but rendered in the business timezone, so a receptionist reads the wall-clock
		// time without doing UTC math. Appended (not inserted) so the existing 12-column order that
		// downstream imports may rely on is untouched.
		//
		// `total` + `customer_note` are additive trailing columns for the same reason (beta QA):
		// `total_minor` alone made every reader guess the currency's exponent (4500 = $45.00), and
		// the note the customer typed on the booking form was exported NOWHERE — it is the only
		// place "please ring the side door" survives, and reception needs it on the printout.
		// `payment_status` + `gateway` + `transaction_ref` are additive trailing columns (D-R38,
		// addendum to D-19): reconciling a month of card payments against a booking list is the
		// reason an accountant opens this file at all, and none of the three carries PII — the
		// transaction ledger they come from is PII-free by construction (privacy-inventory).
		// Appended after `customer_note` so the existing 16-column order is untouched.
		//
		// NAME SPLIT (founder 2026-10-01, D-R69) — the one deliberate exception to "append only":
		// the stored parts sit BESIDE the composed name they belong to, `staff_first_name` /
		// `staff_last_name` right after `staff` and `customer_first_name` / `customer_last_name`
		// right after `customer_name`, which keep their meaning (the composed display name). The
		// founder accepted the shift: the plugin has no installed base whose imports depend on
		// positions (name-split plan §3.1).
		$body = "\xEF\xBB\xBF" . RawResponse::csvRow(
			array( 'id', 'status', 'start_utc', 'end_utc', 'service', 'staff', 'staff_first_name', 'staff_last_name', 'customer_name', 'customer_first_name', 'customer_last_name', 'customer_email', 'customer_phone', 'order_code', 'total_minor', 'currency', 'start_local', 'timezone', 'total', 'customer_note', 'payment_status', 'gateway', 'transaction_ref', 'subtotal_minor', 'discount_minor', 'coupon_code', 'payable_now_minor', 'balance_due_minor', 'payment_state_reason' )
		);
		foreach ( $rows as $row ) {
			$currency = (string) ( $row['currency'] ?? '' );
			$body    .= RawResponse::csvRow(
				array(
					(int) $row['id'],
					(string) $row['status'],
					(string) Format::utcDatetime( (string) $row['start_datetime_utc'] ),
					(string) Format::utcDatetime( (string) $row['end_datetime_utc'] ),
					(string) ( $row['service_name'] ?? '' ),
					PersonName::display( (string) ( $row['staff_first_name'] ?? '' ), (string) ( $row['staff_last_name'] ?? '' ) ),
					(string) ( $row['staff_first_name'] ?? '' ),
					(string) ( $row['staff_last_name'] ?? '' ),
					PersonName::display( (string) ( $row['customer_first_name'] ?? '' ), (string) ( $row['customer_last_name'] ?? '' ) ),
					(string) ( $row['customer_first_name'] ?? '' ),
					(string) ( $row['customer_last_name'] ?? '' ),
					(string) ( $row['customer_email'] ?? '' ),
					(string) ( $row['customer_phone'] ?? '' ),
					(string) ( $row['order_code'] ?? '' ),
					Format::intOrNull( $row['total_minor'] ?? null ) ?? 0,
					$currency,
					$this->localStart( (string) $row['start_datetime_utc'] ),
					$this->business_tz->getName(),
					Format::moneyMajor( Format::intOrNull( $row['total_minor'] ?? null ) ?? 0, $currency ),
					// Customer free text: {@see RawResponse::csvCell} prefixes the formula leaders
					// (`=`, `+`, `-`, `@`, TAB, CR) and RFC4180-quotes commas/quotes/newlines, so a
					// note is never evaluated by a spreadsheet and never breaks the row.
					(string) ( $row['customer_note'] ?? '' ),
					// A booking with no order row at all cannot happen in V1, but the fallback keeps
					// the column count constant rather than trusting that.
					(string) ( $row['payment_status'] ?? 'none' ),
					(string) ( $row['gateway'] ?? '' ),
					(string) ( $row['transaction_ref'] ?? '' ),
					Format::intOrNull( $row['subtotal_minor'] ?? null ) ?? ( Format::intOrNull( $row['total_minor'] ?? null ) ?? 0 ),
					Format::intOrNull( $row['discount_minor'] ?? null ) ?? 0,
					(string) ( $row['coupon_code'] ?? '' ),
					(int) $row['payable_now_minor'],
					(int) $row['balance_due_minor'],
					(string) $row['payment_state_reason'],
				)
			);
		}

		return RawResponse::make( $body, 'text/csv; charset=UTF-8', array( 'Content-Disposition' => 'attachment; filename="bookings.csv"' ) );
	}

	/**
	 * Render a stored UTC datetime (`Y-m-d H:i:s`) as the wall-clock time in the business timezone
	 * for the `start_local` column (C6). A malformed/empty instant yields an empty cell rather than
	 * throwing the whole export.
	 *
	 * @param string $utc_datetime Stored UTC datetime, `Y-m-d H:i:s`.
	 */
	private function localStart( string $utc_datetime ): string {
		if ( '' === $utc_datetime ) {
			return '';
		}
		try {
			$instant = new \DateTimeImmutable( $utc_datetime . ' UTC' );
		} catch ( \Exception $e ) {
			return '';
		}

		return $instant->setTimezone( $this->business_tz )->format( 'Y-m-d H:i:s' );
	}

	/**
	 * GET /export/customers.csv.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function customers( WP_REST_Request $request ) {
		$rows = $this->reads->exportCustomers( (string) $request->get_param( 'search' ) );

		// `name` stays (the composed display name) after the two stored parts (D-R69).
		$body = "\xEF\xBB\xBF" . RawResponse::csvRow( array( 'id', 'first_name', 'last_name', 'name', 'email', 'phone', 'note', 'created_at' ) );
		foreach ( $rows as $row ) {
			$body .= RawResponse::csvRow(
				array(
					(int) $row['id'],
					(string) ( $row['first_name'] ?? '' ),
					(string) ( $row['last_name'] ?? '' ),
					PersonName::display( (string) ( $row['first_name'] ?? '' ), (string) ( $row['last_name'] ?? '' ) ),
					(string) ( $row['email'] ?? '' ),
					(string) ( $row['phone'] ?? '' ),
					(string) ( $row['note'] ?? '' ),
					(string) Format::utcDatetime( (string) $row['created_at'] ),
				)
			);
		}

		return RawResponse::make( $body, 'text/csv; charset=UTF-8', array( 'Content-Disposition' => 'attachment; filename="customers.csv"' ) );
	}
}

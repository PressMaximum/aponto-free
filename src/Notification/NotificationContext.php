<?php
/**
 * Notification render context (placeholder values for one booking).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Notification;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Availability\BusinessTimezone;
use Aponto\Booking\Booking;
use Aponto\Frontend\BookingManagePage;
use Aponto\Rest\Support\TimezoneLabel;
use Aponto\Support\PersonName;
use Aponto\Support\Settings;
use Aponto\Support\StructuredAddress;

use Aponto\Payments\OrderAmounts;
use Aponto\Payments\TransactionRepository;
use Aponto\Support\Clock;

/**
 * Resolves every placeholder value for a booking (customer, service, staff, order, business,
 * display-timezone dates/times) once, so all jobs for the same booking share it. Times render in the
 * DISPLAY timezone (customer timezone if the customer chose one, else the business timezone — D1
 * A′), with a compact business-time suffix when the two differ. The raw manage token is supplied
 * per-render (created event only, NB-4); without it the link placeholders are empty.
 */
final class NotificationContext {

	/**
	 * Payment facts for the five payment placeholders (D-R38), resolved once per booking.
	 *
	 * Kept OUT of the constructor signature on purpose: this class is built in exactly one place
	 * ({@see self::forBooking()}), and threading five more positional arguments through a
	 * seventeen-argument constructor to carry an optional concern would make every future addition
	 * worse. `withPayment()` is a copy-on-write setter, so the object stays immutable.
	 *
	 * @var array<string, string>
	 */
	private array $payment = array();

	/**
	 * Per-message placeholder overrides (today only `{refund_amount}`, which belongs to ONE message
	 * rather than to the booking).
	 *
	 * @var array<string, string>
	 */
	private array $extras = array();

	/**
	 * The booking's own location (persona QA 2026-10-05, T-057): the branch name ('' when the
	 * booking has no real branch) and the id the admin deep link is built from.
	 *
	 * @var array{booking_id:int, location_name:string}
	 */
	private array $booking_facts = array(
		'booking_id'    => 0,
		'location_name' => '',
	);

	/**
	 * Raw payment facts the cancellation note is worded from (T-056): the stored `payment_status`
	 * and the formatted amount the customer handed over, plus the ledger reason (D-R71) and — for a
	 * partly refunded deposit — the gross amount paid and the amount refunded.
	 *
	 * @var array{status:string, reason:string, paid:string, charged:string, refunded:string}
	 */
	private array $payment_raw = array(
		'status'   => 'none',
		'reason'   => 'none',
		'paid'     => '',
		'charged'  => '',
		'refunded' => '',
	);

	/**
	 * Machine reason of a SYSTEM cancellation, or '' (T-054). Set by the dispatcher only for the
	 * system's own release, so a customer who types the same word as their reason is quoted, not
	 * translated.
	 *
	 * @var string
	 */
	private string $system_cancel = '';

	/**
	 * The reason the payment core records when it releases an unpaid hold (D-R38g).
	 */
	public const HOLD_EXPIRED_REASON = 'payment_hold_expired';

	/**
	 * Construct the context.
	 *
	 * @param string             $customer_first   Customer first name (name split, D-R69).
	 * @param string             $customer_last    Customer last name.
	 * @param string             $customer_email   Customer email.
	 * @param string             $customer_phone   Customer phone.
	 * @param string             $service_name     Service name.
	 * @param string             $staff_first      Staff first name.
	 * @param string             $staff_last       Staff last name.
	 * @param string             $order_code       Order code.
	 * @param string             $status           Booking status.
	 * @param string             $business_name    Business name.
	 * @param string             $business_address Business address.
	 * @param string             $business_phone   Business phone.
	 * @param string             $site_name        Site name.
	 * @param \DateTimeImmutable $start_utc        Start (UTC).
	 * @param \DateTimeImmutable $end_utc          End (UTC).
	 * @param \DateTimeZone      $display_tz       Display timezone.
	 * @param \DateTimeZone      $business_tz      Business timezone.
	 * @param string             $date_format      PHP date format.
	 * @param string             $time_format      PHP time format.
	 */
	public function __construct(
		private string $customer_first,
		private string $customer_last,
		private string $customer_email,
		private string $customer_phone,
		private string $service_name,
		private string $staff_first,
		private string $staff_last,
		private string $order_code,
		private string $status,
		private string $business_name,
		private string $business_address,
		private string $business_phone,
		private string $site_name,
		private \DateTimeImmutable $start_utc,
		private \DateTimeImmutable $end_utc,
		private \DateTimeZone $display_tz,
		private \DateTimeZone $business_tz,
		private string $date_format,
		private string $time_format
	) {}

	/**
	 * Build the context for a booking.
	 *
	 * @param Booking          $booking   Booking snapshot.
	 * @param \wpdb            $wpdb      Database handle.
	 * @param Settings         $settings  Core settings.
	 * @param BusinessTimezone $timezones Business-timezone resolver.
	 */
	public static function forBooking( Booking $booking, \wpdb $wpdb, Settings $settings, BusinessTimezone $timezones ): self {
		$customer = self::customer( $wpdb, $booking->customer_id );
		$business = $timezones->forLocation( $booking->location_id );
		$display  = '' !== $booking->customer_timezone ? self::zone( $booking->customer_timezone, $business ) : $business;
		$address  = self::locationAddress( $wpdb, $booking->location_id );
		if ( '' === $address ) {
			$address = (string) $settings->get( 'business.address' );
		}

		$staff   = self::staff( $wpdb, $booking->staff_id );
		$context = new self(
			$customer['first_name'],
			$customer['last_name'],
			$customer['email'],
			$customer['phone'],
			self::scalar( $wpdb, $wpdb->prefix . 'aponto_services', $booking->service_id ),
			$staff['first_name'],
			$staff['last_name'],
			$booking->order_code,
			$booking->status,
			(string) $settings->get( 'business.name' ),
			$address,
			(string) $settings->get( 'business.phone' ),
			Settings::blogName(),
			$booking->start_utc,
			$booking->end_utc,
			$display,
			$business,
			(string) $settings->get( 'date_format' ),
			(string) $settings->get( 'time_format' )
		);

		$context->booking_facts = array(
			'booking_id'    => $booking->id,
			'location_name' => self::locationName( $wpdb, $booking->location_id ),
		);

		$order  = self::order( $wpdb, $booking->id );
		$ledger = null === $order ? array() : ( new TransactionRepository( $wpdb, new Clock() ) )->ledgerTotals( (int) $order['id'] );

		return $context->withPayment( $order, $ledger );
	}

	/**
	 * A copy that knows the SYSTEM cancelled this booking, and why (persona QA 2026-10-05, T-054).
	 *
	 * @param string $reason Machine reason recorded on the transition.
	 */
	public function withSystemCancel( string $reason ): self {
		$copy                = clone $this;
		$copy->system_cancel = $reason;

		return $copy;
	}

	/**
	 * A copy carrying this booking's payment facts (D-R38).
	 *
	 * @param array<string, mixed>|null                          $order Order row, or null when the booking has none.
	 * @param array{charged?: int, onsite?: int, refunded?: int} $ledger Succeeded ledger totals.
	 */
	public function withPayment( ?array $order, array $ledger = array() ): self {
		$copy = clone $this;
		if ( null === $order ) {
			$copy->payment     = array();
			$copy->payment_raw = array(
				'status'   => 'none',
				'reason'   => 'none',
				'paid'     => '',
				'charged'  => '',
				'refunded' => '',
			);

			return $copy;
		}

		$status   = (string) ( $order['payment_status'] ?? 'none' );
		$total    = (int) ( $order['total_minor'] ?? 0 );
		$currency = (string) ( $order['currency'] ?? '' );
		$settled  = in_array( $status, array( 'paid', 'partial', 'refunded' ), true );

		$copy->payment = array(
			'payment_status'   => self::paymentStatusLabel( OrderAmounts::reason( $order, $ledger ) ),
			// Net money held for the order (D-R71): a deposit reads as the deposit, a partial refund
			// as what is still held — the same figure every other surface reads from OrderAmounts.
			'amount_paid'      => self::money( OrderAmounts::effectiveCollected( $order, $ledger ), $currency ),
			// NOT AN AMOUNT CORE CANNOT VOUCH FOR (persona QA 2026-10-05, T-024). A gateway whose
			// checkout prices the order itself (tax, fees) answers "not final" until it has, and the
			// reminder then prints no amount at all: `amount_due` is an optional-line key, so the
			// "Amount due:" line removes itself and the payment link shows the real total.
			'amount_due'       => $settled ? self::money( 0, $currency ) : ( \Aponto\Payments\PaymentState::amountIsFinal( $order ) ? self::money( OrderAmounts::payableNow( $order ), $currency ) : '' ),
			'order_total'      => self::money( $total, $currency ),
			'deposit_amount'   => OrderAmounts::isDeposit( $order ) ? self::money( OrderAmounts::payableNow( $order ), $currency ) : '',
			'balance_due'      => self::money( OrderAmounts::balanceDue( $order, $ledger ), $currency ),
			'payment_summary'  => self::paymentSummary( $order, $ledger ),
			'payment_deadline' => $this->deadline( (string) ( $order['hold_expires_at'] ?? '' ) ),
		);

		$handed            = OrderAmounts::isDeposit( $order ) ? OrderAmounts::effectiveCollected( $order, $ledger ) : $total;
		$reason            = OrderAmounts::reason( $order, $ledger );
		$partly_refunded   = 'deposit_partially_refunded' === $reason;
		$copy->payment_raw = array(
			'status'   => $status,
			// A paid deposit is stored as `partial` exactly like a partial refund; only the ledger
			// reason tells the two apart (D-R71), so the cancellation note words itself from it.
			'reason'   => $reason,
			// For the cancellation NOTE, which is a sentence: the symbol form the manage page prints
			// ("£60.00"), not the locale-neutral "60.00 GBP" of the `{amount_*}` placeholders
			// (re-test R7). Without ext-intl it stays the neutral form.
			// A deposit order handed over the deposit, not the total (D-R71): the note reads the same
			// net figure as `{amount_paid}` there; every other order keeps the handed-over total.
			'paid'     => $settled ? self::displayMoney( $handed, $currency ) : '',
			// A partly refunded deposit states what was paid AND what came back, never only the net.
			'charged'  => $partly_refunded ? self::displayMoney( (int) ( $ledger['charged'] ?? 0 ) + (int) ( $ledger['onsite'] ?? 0 ), $currency ) : '',
			'refunded' => $partly_refunded ? self::displayMoney( (int) ( $ledger['refunded'] ?? 0 ), $currency ) : '',
		);

		return $copy;
	}

	/**
	 * The symbol form of an amount for a sentence ("£60.00"), or the neutral form without ext-intl.
	 *
	 * @param int    $minor    Amount in minor units.
	 * @param string $currency ISO 4217 code.
	 */
	private static function displayMoney( int $minor, string $currency ): string {
		return \Aponto\Rest\Support\Format::moneyDisplay( $minor, $currency ) ?? self::money( $minor, $currency );
	}

	/**
	 * Deposit copy uses the ledger, including refunds and on-site balance records.
	 *
	 * @param array<string, mixed>                               $order Order snapshot.
	 * @param array{charged?: int, onsite?: int, refunded?: int} $ledger Succeeded ledger totals.
	 */
	private static function paymentSummary( array $order, array $ledger ): string {
		if ( ! OrderAmounts::isDeposit( $order ) ) {
			return '';
		}
		$currency = (string) ( $order['currency'] ?? '' );
		$pending  = 'pending' === (string) ( $order['payment_status'] ?? 'none' );
		if ( $pending ) {
			/* translators: 1: deposit amount, 2: remaining amount after the deposit. */
			return sprintf( __( 'Deposit due now: %1$s. Balance due at your appointment: %2$s. The deposit is not refunded automatically if you cancel.', 'aponto' ), self::money( OrderAmounts::payableNow( $order ), $currency ), self::money( OrderAmounts::total( $order ) - OrderAmounts::payableNow( $order ), $currency ) );
		}
		/* translators: 1: net collected amount, 2: remaining balance. */
		return sprintf( __( 'Amount paid: %1$s. Balance due at your appointment: %2$s. The deposit is not refunded automatically if you cancel.', 'aponto' ), self::money( OrderAmounts::effectiveCollected( $order, $ledger ), $currency ), self::money( OrderAmounts::balanceDue( $order, $ledger ), $currency ) );
	}

	/**
	 * A copy carrying per-message placeholder values (today `{refund_amount}`).
	 *
	 * @param array<string, string> $extras Placeholder values, keyed by whitelist name.
	 */
	public function withExtras( array $extras ): self {
		$copy         = clone $this;
		$copy->extras = $extras;

		return $copy;
	}

	/**
	 * The booking's order row, or null.
	 *
	 * @param \wpdb $wpdb       Database handle.
	 * @param int   $booking_id Booking id.
	 * @return array<string, mixed>|null
	 */
	private static function order( \wpdb $wpdb, int $booking_id ): ?array {
		$p   = $wpdb->prefix;
		$sql = "SELECT o.* FROM {$p}aponto_orders o
			INNER JOIN {$p}aponto_order_items oi ON oi.order_id = o.id
			WHERE oi.booking_id = %d LIMIT 1";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; id bound via prepare().
		$row = $wpdb->get_row( $wpdb->prepare( $sql, $booking_id ), ARRAY_A );

		return is_array( $row ) ? $row : null;
	}

	/**
	 * A LOCALIZED label for a payment status — never the raw enum.
	 *
	 * A customer reading "partial" in an email is reading a database column. The labels below say
	 * what happened to their money instead.
	 *
	 * @param string $status Derived payment reason (D-R71).
	 */
	private static function paymentStatusLabel( string $status ): string {
		switch ( $status ) {
			case 'pending':
				return __( 'Awaiting payment', 'aponto' );
			case 'paid':
				return __( 'Paid', 'aponto' );
			case 'deposit_paid':
				return __( 'Deposit paid', 'aponto' );
			case 'deposit_partially_refunded':
				return __( 'Deposit partially refunded', 'aponto' );
			case 'partially_refunded':
				return __( 'Partially refunded', 'aponto' );
			case 'refunded':
				return __( 'Refunded', 'aponto' );
			default:
				return __( 'Unpaid', 'aponto' );
		}
	}

	/**
	 * Money as major units plus the ISO code, through the ONE exponent source (§5 invariant 7).
	 *
	 * Locale-neutral by design, exactly like the CSV `total` column: a `.` decimal separator, no
	 * grouping and the currency CODE rather than a symbol, because the same string has to be
	 * unambiguous to a reader in any locale and Aponto ships no per-locale money formatter.
	 *
	 * @param int    $minor    Amount in minor units.
	 * @param string $currency ISO-4217 currency.
	 */
	private static function money( int $minor, string $currency ): string {
		$decimals = Settings::currencyExponent( $currency );
		$amount   = number_format( $minor / ( 10 ** $decimals ), $decimals, '.', '' );

		return '' === $currency ? $amount : $amount . ' ' . strtoupper( $currency );
	}

	/**
	 * A hold deadline rendered in the CUSTOMER's display timezone (D1 = A′), or '' when there is
	 * none — in which case the optional-line contract removes the line that carried it.
	 *
	 * @param string $stored Stored UTC datetime, or ''.
	 */
	private function deadline( string $stored ): string {
		if ( '' === $stored ) {
			return '';
		}

		try {
			$instant = new \DateTimeImmutable( $stored . ' UTC' );
		} catch ( \Exception $failure ) {
			unset( $failure );

			return '';
		}

		$timestamp = $instant->getTimestamp();

		return (string) wp_date( $this->date_format, $timestamp, $this->display_tz )
			. ' ' . (string) wp_date( $this->time_format, $timestamp, $this->display_tz )
			. ' — ' . TimezoneLabel::label( $this->display_tz, $instant );
	}

	/**
	 * Resolve the structured address for a concrete booking location.
	 *
	 * @param \wpdb $wpdb        Database handle.
	 * @param int   $location_id Location id; zero means no location.
	 */
	private static function locationAddress( \wpdb $wpdb, int $location_id ): string {
		if ( 0 === $location_id ) {
			return '';
		}

		$table = $wpdb->prefix . 'aponto_locations';
		$sql   = "SELECT address_line1, address_line2, city, region, postal_code, country FROM {$table} WHERE id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; id bound via prepare().
		$row = $wpdb->get_row( $wpdb->prepare( $sql, $location_id ), ARRAY_A );

		return is_array( $row ) ? StructuredAddress::display( $row ) : '';
	}

	/**
	 * The NAME of a concrete booking location, or '' when the booking has none.
	 *
	 * @param \wpdb $wpdb        Database handle.
	 * @param int   $location_id Location id; zero means no location.
	 */
	private static function locationName( \wpdb $wpdb, int $location_id ): string {
		if ( 0 === $location_id ) {
			return '';
		}

		return trim( self::scalar( $wpdb, $wpdb->prefix . 'aponto_locations', $location_id ) );
	}

	/**
	 * The customer's email (recipient for customer templates).
	 */
	public function customerEmail(): string {
		return $this->customer_email;
	}

	/**
	 * Whether the display and business timezones differ.
	 */
	public function timezonesDiffer(): bool {
		return $this->display_tz->getName() !== $this->business_tz->getName();
	}

	/**
	 * Build the whitelisted placeholder map for an audience.
	 *
	 * Customer templates lead with the visitor's own timezone (D1 A′); admin/staff templates lead
	 * with the STUDIO's date/time and carry the customer time as the secondary note, matching the
	 * admin Bookings list (fleet-r1 Fix 5; finding U3 BUG-03). When the two timezones are equal
	 * both audiences render identically (no secondary note).
	 *
	 * @param string|null $raw_token     Raw manage token (created event only), or null.
	 * @param string      $cancel_reason Cancellation reason (cancelled transition only), else ''.
	 * @param string      $audience      `customer` (visitor-first) or `admin` (studio-first).
	 * @return array<string, string>
	 */
	public function placeholders( ?string $raw_token, string $cancel_reason = '', string $audience = 'customer' ): array {
		// Render every date/time through wp_date() so month names and am/pm follow the site locale
		// (global-i18n, not English-only DateTime::format) while respecting the configured formats.
		$ts_start = $this->start_utc->getTimestamp();
		$ts_end   = $this->end_utc->getTimestamp();

		// The PRIMARY zone leads the placeholders; the SECONDARY zone is the parenthetical note.
		$studio_first = 'admin' === $audience;
		$primary_tz   = $studio_first ? $this->business_tz : $this->display_tz;
		$secondary_tz = $studio_first ? $this->display_tz : $this->business_tz;

		// THE OTHER SIDE'S DATE RIDES WITH ITS TIME WHEN IT IS A DIFFERENT DAY (persona QA
		// 2026-10-05, T-058). "October 5 … (6:30 pm …)" for a visit that is on October 4 at the
		// business reads as the wrong day; the same instant is the same date for both sides far
		// more often than not, and then the note stays the bare time it always was.
		$secondary_time  = $this->timezonesDiffer()
			? self::secondaryMoment(
				(string) wp_date( $this->date_format, $ts_start, $primary_tz ),
				(string) wp_date( $this->date_format, $ts_start, $secondary_tz ),
				(string) wp_date( $this->time_format, $ts_start, $secondary_tz )
			)
			: null;
		$secondary_label = $this->timezonesDiffer()
			? TimezoneLabel::label( $secondary_tz, $this->start_utc )
			: '';
		$time            = self::formatBookingTime(
			(string) wp_date( $this->time_format, $ts_start, $primary_tz ),
			TimezoneLabel::label( $primary_tz, $this->start_utc ),
			$secondary_time,
			$audience,
			$secondary_label
		);

		$has_token = null !== $raw_token && '' !== $raw_token;
		$manage    = $has_token ? BookingManagePage::manageUrl( $raw_token ) : '';
		$ics       = $has_token ? rest_url( 'aponto/v1/public/bookings/' . $raw_token . '/ics' ) : '';

		$values = array(
			// `{customer_name}` / `{staff_name}` = the ONE composed display name (D-R69).
			'customer_name'       => PersonName::display( $this->customer_first, $this->customer_last ),
			'customer_first_name' => PersonName::normalize( $this->customer_first ),
			'customer_last_name'  => PersonName::normalize( $this->customer_last ),
			'customer_email'      => $this->customer_email,
			'customer_phone'      => $this->customer_phone,
			'service_name'        => $this->service_name,
			'staff_name'          => PersonName::display( $this->staff_first, $this->staff_last ),
			'staff_first_name'    => PersonName::normalize( $this->staff_first ),
			'staff_last_name'     => PersonName::normalize( $this->staff_last ),
			'booking_date'        => (string) wp_date( $this->date_format, $ts_start, $primary_tz ),
			'booking_time'        => $time,
			'booking_end_time'    => (string) wp_date( $this->time_format, $ts_end, $primary_tz ),
			'booking_timezone'    => TimezoneLabel::label( $primary_tz, $this->start_utc ),
			'business_name'       => $this->business_name,
			'business_address'    => $this->business_address,
			'business_phone'      => $this->business_phone,
			// The booking's own location (T-057). `business_address` above already resolves the
			// branch address first, so the two address placeholders agree by construction.
			'location_name'       => $this->booking_facts['location_name'],
			'location_address'    => $this->business_address,
			'site_name'           => $this->site_name,
			'booking_status'      => $this->status,
			'order_code'          => $this->order_code,
			'cancel_reason'       => $this->cancelReason( $cancel_reason ),
			'cancel_note'         => $this->cancelNote( $audience ),
			// wp-admin deep link (T-060) — never in a customer email.
			'admin_booking_link'  => 'admin' === $audience && $this->booking_facts['booking_id'] > 0
				? admin_url( 'admin.php?page=aponto#bookings/' . $this->booking_facts['booking_id'] )
				: '',
			'manage_link'         => $manage,
			'cancel_link'         => $manage,
			'ics_link'            => $ics,
			'booking_page_link'   => self::bookingPageUrl(),
			// Payments (D-R38). Defaults keep every template renderable on a site that takes no
			// online payments: the money placeholders resolve to a zero amount and
			// `{payment_deadline}` to '' — which the optional-line contract then strips.
			'payment_status'      => '',
			'order_total'         => '',
			'deposit_amount'      => '',
			'balance_due'         => '',
			'payment_summary'     => '',
			'amount_paid'         => '',
			'amount_due'          => '',
			'refund_amount'       => '',
			'payment_deadline'    => '',
			// The resume link (PR-A.3): the same manage token, pointed at the booking page, which is
			// the only surface that can render a payment form. '' without a token or without a
			// published booking page — the line then self-strips and the manage link remains the
			// fallback.
			'payment_link'        => $has_token ? BookingManagePage::resumeUrl( $raw_token ) : '',
		);

		// Booking-wide payment facts first, then the per-message overrides — a refund notice knows
		// its own amount, and nothing else does.
		return array_merge( $values, $this->payment, $this->extras );
	}

	/**
	 * `{cancel_reason}` for this mail: the reason as given, except that the SYSTEM's own machine
	 * reason becomes a sentence (persona QA 2026-10-05, T-054) — "Reason: payment_hold_expired" is a
	 * database value, not something a staff member should have to decode.
	 *
	 * @param string $cancel_reason Reason carried by the transition.
	 */
	private function cancelReason( string $cancel_reason ): string {
		if ( self::HOLD_EXPIRED_REASON === $this->system_cancel ) {
			return __( 'The payment was not completed in time, so the slot was released.', 'aponto' );
		}

		return $cancel_reason;
	}

	/**
	 * `{cancel_note}` (persona QA 2026-10-05, T-056 / T-054): what a cancellation means for the
	 * money, or — to the customer — why the system released the slot. '' for every mail that is
	 * not about a cancelled booking.
	 *
	 * Gateway-neutral and deliberately modest: core never refunds on a cancellation (D-R71k), so
	 * the customer is told exactly that and that the business will be in touch — never that a
	 * refund is coming. The owner and the staff member are told the booking was paid and asked to
	 * look at it. A `refunded` order says nothing: there is no money left to explain.
	 *
	 * @param string $audience `customer` or `admin` (admin and staff templates).
	 */
	private function cancelNote( string $audience ): string {
		if ( 'cancelled' !== $this->status ) {
			return '';
		}

		$status = $this->payment_raw['status'];
		$reason = $this->payment_raw['reason'];
		$paid   = $this->payment_raw['paid'];
		// A paid deposit is stored as `partial` but nothing was refunded (D-R71): it reads as paid,
		// for the deposit amount.
		if ( 'partial' === $status && 'deposit_paid' === $reason ) {
			$status = 'paid';
		}
		// A deposit that really was partly refunded says how much was paid and how much came back,
		// so neither audience has to infer the refund from a net figure.
		if ( 'partial' === $status && 'deposit_partially_refunded' === $reason && '' !== $this->payment_raw['refunded'] ) {
			if ( 'admin' === $audience ) {
				/* translators: 1: amount the customer paid, e.g. "$90.00"; 2: amount refunded, e.g. "$10.00". */
				return sprintf( __( 'This booking was paid (%1$s) and %2$s has been refunded. Review whether a further refund is due.', 'aponto' ), $this->payment_raw['charged'], $this->payment_raw['refunded'] );
			}

			/* translators: 1: amount refunded, e.g. "$10.00"; 2: amount still held, e.g. "$80.00". */
			return sprintf( __( '%1$s of your payment has been refunded. The remaining %2$s is not refunded automatically. We will contact you about any further refund.', 'aponto' ), $this->payment_raw['refunded'], $paid );
		}
		if ( in_array( $status, array( 'paid', 'partial' ), true ) ) {
			if ( 'admin' === $audience ) {
				return 'partial' === $status
					/* translators: %s: amount the customer paid, e.g. "$70.36". */
					? sprintf( __( 'This booking was paid (%s) and has been partly refunded. Review whether a further refund is due.', 'aponto' ), $paid )
					/* translators: %s: amount the customer paid, e.g. "$70.36". */
					: sprintf( __( 'This booking was paid (%s). Nothing was refunded automatically — review whether a refund is due.', 'aponto' ), $paid );
			}

			return 'partial' === $status
				? __( 'The rest of your payment is not refunded automatically. We will contact you about any further refund.', 'aponto' )
				/* translators: %s: amount the customer paid, e.g. "$70.36". */
				: sprintf( __( 'Your payment of %s is not refunded automatically. We will contact you about any refund.', 'aponto' ), $paid );
		}

		// The customer's cancellation template has no "Reason:" line, so the system's own release
		// is explained here; the admin and staff templates carry it as `{cancel_reason}`.
		if ( 'customer' === $audience && self::HOLD_EXPIRED_REASON === $this->system_cancel ) {
			return __( 'We released the slot because the payment was not completed in time.', 'aponto' );
		}

		return '';
	}

	/**
	 * The secondary-timezone moment for `{booking_time}`: the bare time, or "date, time" when the
	 * two sides are on different calendar days (T-058).
	 *
	 * @param string $primary_date   Appointment date in the audience's leading timezone.
	 * @param string $secondary_date Appointment date in the other timezone.
	 * @param string $secondary_time Appointment time in the other timezone.
	 */
	public static function secondaryMoment( string $primary_date, string $secondary_date, string $secondary_time ): string {
		if ( $primary_date === $secondary_date ) {
			return $secondary_time;
		}

		/* translators: 1: date, 2: time — the appointment in the other party's timezone, e.g. "October 4, 2026, 6:30 pm". */
		return sprintf( __( '%1$s, %2$s', 'aponto' ), $secondary_date, $secondary_time );
	}

	/**
	 * The public booking-page permalink for the "Book again" CTA (`{booking_page_link}`, A4), or ''
	 * unless the configured page exists AND is PUBLISHED (Codex review E item 5): a draft, pending,
	 * private, scheduled or trashed page must never be linked from a customer email — the link would
	 * 404 (or leak a private permalink), so the value stays '' and the template line self-strips via
	 * the optional-line contract ({@see Placeholders}). The option key mirrors
	 * {@see \Aponto\Support\BookingPage::OPTION} — written by the onboarding wizard and by
	 * Settings → Booking → Form presentation (D-R75).
	 */
	public static function bookingPageUrl(): string {
		$page_id = (int) get_option( 'aponto_booking_page_id', 0 );
		if ( $page_id <= 0 ) {
			return '';
		}
		$post = get_post( $page_id );
		if ( ! $post instanceof \WP_Post || 'publish' !== $post->post_status ) {
			return '';
		}

		return (string) get_permalink( $post );
	}

	/**
	 * The ONE `{booking_time}` format path shared by every template and the test-send fixture
	 * (SPEC-P1 §2.2 / §3.3 — anti-LatePoint invariant). The friendly timezone label is folded in
	 * so it renders uniformly whether or not a template also spells out `{booking_timezone}`; a
	 * secondary-timezone note is appended only when the display and business timezones differ
	 * (D1 = A′). The note's WORDING depends on the audience: a customer email frames the business's
	 * time ("… local time at the business" — a neutral noun, D-R52; it used to say "at the studio" to a salon
	 * and a clinic alike, persona QA 2026-10-05, T-059); an admin/staff email frames the visitor's
	 * time ("customer time: … — City (GMT±N)") so the business reads its own clock first (fleet-r1
	 * Fix 5). `$secondary_time` carries the other side's DATE too when it is a different day
	 * ({@see self::secondaryMoment()}, T-058).
	 *
	 * @param string      $primary_time    Appointment time in the audience's leading timezone.
	 * @param string      $primary_label   Friendly `City (GMT±N)` label for the leading timezone.
	 * @param string|null $secondary_time  Same instant in the other timezone (with its date when that differs), or null when equal.
	 * @param string      $audience        `customer` (studio note) or `admin` (customer note).
	 * @param string      $secondary_label Friendly label for the secondary timezone (admin note).
	 */
	public static function formatBookingTime( string $primary_time, string $primary_label, ?string $secondary_time, string $audience = 'customer', string $secondary_label = '' ): string {
		if ( null !== $secondary_time && '' !== $secondary_time ) {
			if ( 'admin' === $audience ) {
				return sprintf(
					/* translators: 1: appointment time at the studio, 2: friendly studio timezone label "City (GMT±N)", 3: the same time in the customer's timezone, 4: friendly customer timezone label "City (GMT±N)". */
					__( '%1$s — %2$s (customer time: %3$s — %4$s)', 'aponto' ),
					$primary_time,
					$primary_label,
					$secondary_time,
					$secondary_label
				);
			}

			return sprintf(
				/* translators: 1: appointment time in the visitor's timezone, 2: friendly timezone label "City (GMT±N)", 3: the same moment in the business timezone — a time, or "date, time" when it falls on another day. */
				__( '%1$s — %2$s (%3$s local time at the business)', 'aponto' ),
				$primary_time,
				$primary_label,
				$secondary_time
			);
		}

		return sprintf(
			/* translators: 1: appointment time, 2: friendly timezone label "City (GMT±N)". */
			__( '%1$s — %2$s', 'aponto' ),
			$primary_time,
			$primary_label
		);
	}

	/**
	 * Load a customer's display fields.
	 *
	 * @param \wpdb $wpdb        Database handle.
	 * @param int   $customer_id Customer id.
	 * @return array{first_name:string, last_name:string, email:string, phone:string}
	 */
	private static function customer( \wpdb $wpdb, int $customer_id ): array {
		$table = $wpdb->prefix . 'aponto_customers';
		$sql   = "SELECT first_name, last_name, email, phone FROM {$table} WHERE id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		$row = $wpdb->get_row( $wpdb->prepare( $sql, $customer_id ), ARRAY_A );

		return array(
			'first_name' => is_array( $row ) ? (string) $row['first_name'] : '',
			'last_name'  => is_array( $row ) ? (string) $row['last_name'] : '',
			'email'      => is_array( $row ) ? (string) $row['email'] : '',
			'phone'      => is_array( $row ) ? (string) $row['phone'] : '',
		);
	}

	/**
	 * Load a staff member's name parts (name split, D-R69). The shared {@see self::scalar()}
	 * reader selects a single `name` column, which `aponto_staff` no longer has.
	 *
	 * @param \wpdb $wpdb     Database handle.
	 * @param int   $staff_id Staff id.
	 * @return array{first_name:string, last_name:string}
	 */
	private static function staff( \wpdb $wpdb, int $staff_id ): array {
		$table = $wpdb->prefix . 'aponto_staff';
		$sql   = "SELECT first_name, last_name FROM {$table} WHERE id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		$row = $wpdb->get_row( $wpdb->prepare( $sql, $staff_id ), ARRAY_A );

		return array(
			'first_name' => is_array( $row ) ? (string) $row['first_name'] : '',
			'last_name'  => is_array( $row ) ? (string) $row['last_name'] : '',
		);
	}

	/**
	 * Load a single `name` column by id (services only since the name split).
	 *
	 * @param \wpdb  $wpdb  Database handle.
	 * @param string $table Fully-qualified table.
	 * @param int    $id    Row id.
	 */
	private static function scalar( \wpdb $wpdb, string $table, int $id ): string {
		$sql = "SELECT name FROM {$table} WHERE id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		return (string) $wpdb->get_var( $wpdb->prepare( $sql, $id ) );
	}

	/**
	 * Resolve an IANA timezone name, falling back to the business zone.
	 *
	 * @param string        $name     IANA name.
	 * @param \DateTimeZone $fallback Fallback zone.
	 */
	private static function zone( string $name, \DateTimeZone $fallback ): \DateTimeZone {
		try {
			return new \DateTimeZone( $name );
		} catch ( \Exception $e ) {
			unset( $e );

			return $fallback;
		}
	}
}

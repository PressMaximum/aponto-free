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
use Aponto\Support\Settings;
use Aponto\Support\StructuredAddress;

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
	 * Construct the context.
	 *
	 * @param string             $customer_name    Customer name.
	 * @param string             $customer_email   Customer email.
	 * @param string             $customer_phone   Customer phone.
	 * @param string             $service_name     Service name.
	 * @param string             $staff_name       Staff name.
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
		private string $customer_name,
		private string $customer_email,
		private string $customer_phone,
		private string $service_name,
		private string $staff_name,
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

		$context = new self(
			(string) $customer['name'],
			(string) $customer['email'],
			(string) $customer['phone'],
			self::scalar( $wpdb, $wpdb->prefix . 'aponto_services', $booking->service_id ),
			self::scalar( $wpdb, $wpdb->prefix . 'aponto_staff', $booking->staff_id ),
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

		return $context->withPayment( self::order( $wpdb, $booking->id ) );
	}

	/**
	 * A copy carrying this booking's payment facts (D-R38).
	 *
	 * @param array<string, mixed>|null $order Order row, or null when the booking has none.
	 */
	public function withPayment( ?array $order ): self {
		$copy = clone $this;
		if ( null === $order ) {
			$copy->payment = array();

			return $copy;
		}

		$status   = (string) ( $order['payment_status'] ?? 'none' );
		$total    = (int) ( $order['total_minor'] ?? 0 );
		$currency = (string) ( $order['currency'] ?? '' );
		$settled  = in_array( $status, array( 'paid', 'partial', 'refunded' ), true );

		$copy->payment = array(
			'payment_status'   => self::paymentStatusLabel( $status ),
			// `amount_paid` is what the customer HANDED OVER, which is the full total for every
			// settled state including `partial` — a partial refund does not retroactively make the
			// original payment smaller, and telling the customer it did would be wrong on the one
			// email where they are checking the numbers.
			'amount_paid'      => $settled ? self::money( $total, $currency ) : self::money( 0, $currency ),
			'amount_due'       => $settled ? self::money( 0, $currency ) : self::money( $total, $currency ),
			'payment_deadline' => $this->deadline( (string) ( $order['hold_expires_at'] ?? '' ) ),
		);

		return $copy;
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
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; id bound via prepare().
		$row = $wpdb->get_row( $wpdb->prepare( $sql, $booking_id ), ARRAY_A );

		return is_array( $row ) ? $row : null;
	}

	/**
	 * A LOCALIZED label for a payment status — never the raw enum.
	 *
	 * A customer reading "partial" in an email is reading a database column. The labels below say
	 * what happened to their money instead.
	 *
	 * @param string $status Stored `payment_status`.
	 */
	private static function paymentStatusLabel( string $status ): string {
		switch ( $status ) {
			case 'pending':
				return __( 'Awaiting payment', 'aponto' );
			case 'paid':
				return __( 'Paid', 'aponto' );
			case 'partial':
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
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; id bound via prepare().
		$row = $wpdb->get_row( $wpdb->prepare( $sql, $location_id ), ARRAY_A );

		return is_array( $row ) ? StructuredAddress::display( $row ) : '';
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

		$secondary_time  = $this->timezonesDiffer()
			? (string) wp_date( $this->time_format, $ts_start, $secondary_tz )
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
			'customer_name'     => $this->customer_name,
			'customer_email'    => $this->customer_email,
			'customer_phone'    => $this->customer_phone,
			'service_name'      => $this->service_name,
			'staff_name'        => $this->staff_name,
			'booking_date'      => (string) wp_date( $this->date_format, $ts_start, $primary_tz ),
			'booking_time'      => $time,
			'booking_end_time'  => (string) wp_date( $this->time_format, $ts_end, $primary_tz ),
			'booking_timezone'  => TimezoneLabel::label( $primary_tz, $this->start_utc ),
			'business_name'     => $this->business_name,
			'business_address'  => $this->business_address,
			'business_phone'    => $this->business_phone,
			'site_name'         => $this->site_name,
			'booking_status'    => $this->status,
			'order_code'        => $this->order_code,
			'cancel_reason'     => $cancel_reason,
			'manage_link'       => $manage,
			'cancel_link'       => $manage,
			'ics_link'          => $ics,
			'booking_page_link' => self::bookingPageUrl(),
			// Payments (D-R38). Defaults keep every template renderable on a site that takes no
			// online payments: the money placeholders resolve to a zero amount and
			// `{payment_deadline}` to '' — which the optional-line contract then strips.
			'payment_status'    => '',
			'amount_paid'       => '',
			'amount_due'        => '',
			'refund_amount'     => '',
			'payment_deadline'  => '',
			// The resume link (PR-A.3): the same manage token, pointed at the booking page, which is
			// the only surface that can render a payment form. '' without a token or without a
			// published booking page — the line then self-strips and the manage link remains the
			// fallback.
			'payment_link'      => $has_token ? BookingManagePage::resumeUrl( $raw_token ) : '',
		);

		// Booking-wide payment facts first, then the per-message overrides — a refund notice knows
		// its own amount, and nothing else does.
		return array_merge( $values, $this->payment, $this->extras );
	}

	/**
	 * The public booking-page permalink for the "Book again" CTA (`{booking_page_link}`, A4), or ''
	 * unless the configured page exists AND is PUBLISHED (Codex review E item 5): a draft, pending,
	 * private, scheduled or trashed page must never be linked from a customer email — the link would
	 * 404 (or leak a private permalink), so the value stays '' and the template line self-strips via
	 * the optional-line contract ({@see Placeholders}). The option key mirrors
	 * {@see \Aponto\Onboarding\WizardService::BOOKING_PAGE_OPTION} (the wizard-created page).
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
	 * (D1 = A′). The note's WORDING depends on the audience: a customer email frames the studio
	 * time ("… at the studio"); an admin/staff email frames the visitor's time
	 * ("customer time: … — City (GMT±N)") so the studio reads its own clock first (fleet-r1 Fix 5).
	 *
	 * @param string      $primary_time    Appointment time in the audience's leading timezone.
	 * @param string      $primary_label   Friendly `City (GMT±N)` label for the leading timezone.
	 * @param string|null $secondary_time  Same instant in the other timezone, or null when equal.
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
				/* translators: 1: appointment time in the visitor's timezone, 2: friendly timezone label "City (GMT±N)", 3: the same time in the business timezone. */
				__( '%1$s — %2$s (%3$s at the studio)', 'aponto' ),
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
	 * @return array{name:string, email:string, phone:string}
	 */
	private static function customer( \wpdb $wpdb, int $customer_id ): array {
		$table = $wpdb->prefix . 'aponto_customers';
		$sql   = "SELECT name, email, phone FROM {$table} WHERE id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		$row = $wpdb->get_row( $wpdb->prepare( $sql, $customer_id ), ARRAY_A );

		return array(
			'name'  => is_array( $row ) ? (string) $row['name'] : '',
			'email' => is_array( $row ) ? (string) $row['email'] : '',
			'phone' => is_array( $row ) ? (string) $row['phone'] : '',
		);
	}

	/**
	 * Load a single `name` column by id.
	 *
	 * @param \wpdb  $wpdb  Database handle.
	 * @param string $table Fully-qualified table.
	 * @param int    $id    Row id.
	 */
	private static function scalar( \wpdb $wpdb, string $table, int $id ): string {
		$sql = "SELECT name FROM {$table} WHERE id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
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

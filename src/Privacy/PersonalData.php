<?php
/**
 * WordPress privacy exporter + eraser (privacy-inventory §6.4.8).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Privacy;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Booking\CustomFieldSchema;
use Aponto\Rest\Support\Format;
use Aponto\Support\Crypto;
use Aponto\Support\PersonName;

/**
 * Registers the WordPress personal-data exporter and eraser. Lookup is by normalized email. The
 * exporter returns the FULL readable graph per privacy-inventory (REST-8): customer → bookings →
 * orders + items → activities → notification content (the person's OWN payload decrypted to a
 * human-readable subject/recipient — never the cipher, hash or raw token) → idempotency links
 * (existence metadata only, no hashes), including the consent timestamp. The eraser runs the same
 * {@see Anonymizer} anonymize flow (contact/note/token cleared, `consent_at` kept, booking audit
 * retained). Callbacks are idempotent and single-page (SMB scale).
 */
final class PersonalData {

	/**
	 * Construct.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct( private \wpdb $wpdb ) {}

	/**
	 * Register the exporter + eraser.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public static function register( \wpdb $wpdb ): void {
		$instance = new self( $wpdb );

		add_filter(
			'wp_privacy_personal_data_exporters',
			static function ( array $exporters ) use ( $instance ): array {
				$exporters['aponto'] = array(
					'exporter_friendly_name' => __( 'Aponto bookings', 'aponto' ),
					'callback'               => array( $instance, 'export' ),
				);

				return $exporters;
			}
		);

		add_filter(
			'wp_privacy_personal_data_erasers',
			static function ( array $erasers ) use ( $instance ): array {
				$erasers['aponto'] = array(
					'eraser_friendly_name' => __( 'Aponto bookings', 'aponto' ),
					'callback'             => array( $instance, 'erase' ),
				);

				return $erasers;
			}
		);
	}

	/**
	 * Export a person's Aponto data.
	 *
	 * @param string $email Email address.
	 * @param int    $page  Page (unused; single-page export).
	 * @return array{data: list<array<string, mixed>>, done: bool}
	 */
	public function export( string $email, int $page = 1 ): array {
		unset( $page );
		// The WordPress account is resolved INDEPENDENTLY of the Aponto customer row (D-R67l): a
		// coupon can be reserved for an account that has never booked, so "no customer row" is not
		// "no Aponto data about this person".
		$coupon_targets = $this->couponTargets()->forUser( $this->wordpressUserId( $email ) );
		$customer       = $this->customer( $email );
		if ( null === $customer ) {
			return array(
				'data' => $this->couponTargetItems( $coupon_targets ),
				'done' => true,
			);
		}

		$id   = (int) $customer['id'];
		$data = array(
			array(
				'group_id'    => 'aponto_customer',
				'group_label' => __( 'Aponto customer', 'aponto' ),
				'item_id'     => 'aponto-customer-' . $id,
				'data'        => array(
					// The stored name parts, one row each (name split, D-R69).
					array(
						'name'  => __( 'First name', 'aponto' ),
						'value' => (string) $customer['first_name'],
					),
					array(
						'name'  => __( 'Last name', 'aponto' ),
						'value' => (string) $customer['last_name'],
					),
					array(
						'name'  => __( 'Email', 'aponto' ),
						'value' => (string) $customer['email'],
					),
					array(
						'name'  => __( 'Phone', 'aponto' ),
						'value' => (string) $customer['phone'],
					),
					array(
						'name'  => __( 'Note', 'aponto' ),
						'value' => (string) $customer['note'],
					),
				),
			),
		);

		$booking_ids = array();
		foreach ( $this->bookings( $id ) as $booking ) {
			$booking_ids[] = (int) $booking['id'];
			$data[]        = array(
				'group_id'    => 'aponto_bookings',
				'group_label' => __( 'Aponto bookings', 'aponto' ),
				'item_id'     => 'aponto-booking-' . (int) $booking['id'],
				'data'        => array(
					array(
						'name'  => __( 'Service', 'aponto' ),
						'value' => (string) $booking['service_name'],
					),
					// WHO and WHERE (persona QA 2026-10-05, T-092): an appointment listed without the
					// person seen or the branch visited answered half of "what do you hold about my
					// visits". The staff member's display name is the one the customer was shown on
					// the booking form and in their confirmation; no staff contact detail is exported.
					array(
						'name'  => __( 'Staff', 'aponto' ),
						'value' => PersonName::display( (string) ( $booking['staff_first_name'] ?? '' ), (string) ( $booking['staff_last_name'] ?? '' ) ),
					),
					array(
						'name'  => __( 'Location', 'aponto' ),
						'value' => (string) ( $booking['location_name'] ?? '' ),
					),
					array(
						'name'  => __( 'Start (UTC)', 'aponto' ),
						'value' => (string) $booking['start_datetime_utc'],
					),
					array(
						'name'  => __( 'End (UTC)', 'aponto' ),
						'value' => (string) $booking['end_datetime_utc'],
					),
					array(
						'name'  => __( 'Status', 'aponto' ),
						'value' => (string) $booking['status'],
					),
					array(
						'name'  => __( 'Timezone', 'aponto' ),
						'value' => (string) $booking['customer_timezone'],
					),
					// The customer's OWN words, typed into the booking form: personal data they
					// supplied, so it belongs in the data they can ask for (REST-8 "full readable
					// graph"). {@see Anonymizer} already clears it on erasure — an exporter that
					// omitted it was the asymmetric half of that pair.
					array(
						'name'  => __( 'Note', 'aponto' ),
						'value' => (string) ( $booking['customer_note'] ?? '' ),
					),
					array(
						'name'  => __( 'Consent at', 'aponto' ),
						'value' => (string) ( $booking['consent_at'] ?? '' ),
					),
					array(
						'name'  => __( 'Order code', 'aponto' ),
						'value' => (string) ( $booking['order_code'] ?? '' ),
					),
				),
			);
		}

		// The customer's answers to the site's extra booking-form fields (D-R30). These are words the
		// PERSON typed into the booking form — often the most sensitive data the plugin holds (an
		// intake question, a home address) — so they belong in the data they can ask for, and the
		// {@see Anonymizer} deletes them on erasure. Exporting one without the other was exactly the
		// asymmetry REST-8 called out for `customer_note`.
		foreach ( $this->customFieldAnswers( $booking_ids ) as $answer ) {
			$data[] = array(
				'group_id'    => 'aponto_booking_fields',
				'group_label' => __( 'Aponto booking form answers', 'aponto' ),
				'item_id'     => 'aponto-booking-field-' . (int) $answer['booking_id'] . '-' . $answer['slug'],
				'data'        => array(
					array(
						'name'  => __( 'Booking', 'aponto' ),
						'value' => '#' . (int) $answer['booking_id'],
					),
					array(
						'name'  => __( 'Question', 'aponto' ),
						'value' => (string) $answer['label'],
					),
					array(
						'name'  => __( 'Answer', 'aponto' ),
						'value' => (string) $answer['value'],
					),
				),
			);
		}

		// Billing address an external checkout recorded per booking (D-R71d); the Anonymizer
		// deletes the same key, keeping export and erasure symmetric.
		$meta = new \Aponto\Booking\Repository\BookingMetaRepository( $this->wpdb );
		foreach ( $booking_ids as $booking_id ) {
			$raw     = $meta->getKey( $booking_id, \Aponto\Booking\Repository\BookingMetaRepository::BILLING_ADDRESS_KEY );
			$address = null === $raw ? null : json_decode( $raw, true );
			if ( ! is_array( $address ) || array() === $address ) {
				continue;
			}
			$data[] = array(
				'group_id'    => 'aponto_booking_billing',
				'group_label' => __( 'Aponto checkout billing addresses', 'aponto' ),
				'item_id'     => 'aponto-booking-billing-' . $booking_id,
				'data'        => array(
					array(
						'name'  => __( 'Booking', 'aponto' ),
						'value' => '#' . $booking_id,
					),
					array(
						'name'  => __( 'Billing address', 'aponto' ),
						'value' => implode( ', ', array_map( 'strval', array_filter( $address, 'is_scalar' ) ) ),
					),
				),
			);
		}

		foreach ( $this->orders( $booking_ids ) as $order ) {
			$data[] = array(
				'group_id'    => 'aponto_orders',
				'group_label' => __( 'Aponto orders', 'aponto' ),
				'item_id'     => 'aponto-order-' . (int) $order['id'],
				'data'        => array(
					array(
						'name'  => __( 'Order code', 'aponto' ),
						'value' => (string) $order['code'],
					),
					// Amounts as a person reads them — "45.00 USD", not the stored integer 4500
					// (T-092). The integer stays the only form INSIDE the plugin (§5 invariant 7);
					// this is the export boundary, formatted by the same `Format::moneyMajor()` the
					// CSV export uses.
					array(
						'name'  => __( 'Total', 'aponto' ),
						'value' => self::amount( (int) $order['total_minor'], (string) $order['currency'] ),
					),
					array(
						'name'  => __( 'Subtotal', 'aponto' ),
						'value' => self::amount( (int) ( $order['subtotal_minor'] ?? $order['total_minor'] ), (string) $order['currency'] ),
					),
					array(
						'name'  => __( 'Discount', 'aponto' ),
						'value' => self::amount( (int) ( $order['discount_minor'] ?? 0 ), (string) $order['currency'] ),
					),
					array(
						'name'  => __( 'Coupon code', 'aponto' ),
						'value' => (string) ( $order['coupon_code'] ?? '' ),
					),
					array(
						'name'  => __( 'Currency', 'aponto' ),
						'value' => (string) $order['currency'],
					),
					array(
						'name'  => __( 'Payment status', 'aponto' ),
						'value' => (string) $order['payment_status'],
					),
					array(
						'name'  => __( 'Items', 'aponto' ),
						'value' => (string) $order['items_summary'],
					),
				),
			);
		}

		foreach ( $this->transactions( $booking_ids ) as $transaction ) {
			$data[] = array(
				'group_id'    => 'aponto_transactions',
				'group_label' => __( 'Aponto payments', 'aponto' ),
				'item_id'     => 'aponto-transaction-' . (int) $transaction['id'],
				'data'        => array(
					array(
						'name'  => __( 'Type', 'aponto' ),
						'value' => (string) $transaction['kind'],
					),
					array(
						'name'  => __( 'Status', 'aponto' ),
						'value' => (string) $transaction['status'],
					),
					array(
						'name'  => __( 'Amount', 'aponto' ),
						'value' => self::amount( (int) $transaction['amount_minor'], (string) $transaction['currency'] ),
					),
					array(
						'name'  => __( 'Currency', 'aponto' ),
						'value' => (string) $transaction['currency'],
					),
					array(
						'name'  => __( 'Payment provider', 'aponto' ),
						'value' => (string) $transaction['gateway'],
					),
					array(
						'name'  => __( 'Provider reference', 'aponto' ),
						'value' => (string) $transaction['payment_ref'],
					),
					array(
						'name'  => __( 'Date', 'aponto' ),
						'value' => (string) $transaction['created_at'],
					),
				),
			);
		}

		foreach ( $this->activities( $booking_ids ) as $activity ) {
			$data[] = array(
				'group_id'    => 'aponto_activities',
				'group_label' => __( 'Aponto booking activity', 'aponto' ),
				'item_id'     => 'aponto-activity-' . (int) $activity['id'],
				'data'        => array(
					array(
						'name'  => __( 'Booking', 'aponto' ),
						'value' => '#' . (int) $activity['entity_id'],
					),
					array(
						'name'  => __( 'Action', 'aponto' ),
						'value' => (string) $activity['action'],
					),
					array(
						'name'  => __( 'Details', 'aponto' ),
						'value' => self::flattenDetails( (string) $activity['meta'] ),
					),
					array(
						'name'  => __( 'Initiated by', 'aponto' ),
						'value' => (string) $activity['initiated_by'],
					),
					array(
						'name'  => __( 'When (UTC)', 'aponto' ),
						'value' => (string) $activity['created_at'],
					),
				),
			);
		}

		foreach ( $this->deliveries( $booking_ids, (string) $customer['email'] ) as $delivery ) {
			$data[] = array(
				'group_id'    => 'aponto_notifications',
				'group_label' => __( 'Aponto notifications', 'aponto' ),
				'item_id'     => 'aponto-delivery-' . (int) $delivery['id'],
				'data'        => array(
					array(
						'name'  => __( 'Booking', 'aponto' ),
						'value' => '#' . (int) $delivery['booking_id'],
					),
					array(
						'name'  => __( 'Template', 'aponto' ),
						'value' => (string) $delivery['template_key'],
					),
					array(
						'name'  => __( 'Status', 'aponto' ),
						'value' => (string) $delivery['status'],
					),
					array(
						'name'  => __( 'Recipient', 'aponto' ),
						'value' => (string) $delivery['recipient'],
					),
					array(
						'name'  => __( 'Subject', 'aponto' ),
						'value' => (string) $delivery['subject'],
					),
				),
			);
		}

		foreach ( $this->idempotencyLinks( $booking_ids ) as $link ) {
			$data[] = array(
				'group_id'    => 'aponto_idempotency',
				'group_label' => __( 'Aponto booking requests', 'aponto' ),
				'item_id'     => 'aponto-idempotency-' . (int) $link['booking_id'],
				'data'        => array(
					array(
						'name'  => __( 'Booking', 'aponto' ),
						'value' => '#' . (int) $link['booking_id'],
					),
					array(
						'name'  => __( 'Record', 'aponto' ),
						'value' => __( 'A booking-request deduplication record exists.', 'aponto' ),
					),
					array(
						'name'  => __( 'Expires (UTC)', 'aponto' ),
						'value' => (string) $link['expires_at'],
					),
				),
			);
		}

		return array(
			'data' => array_merge( $data, $this->couponTargetItems( $coupon_targets ) ),
			'done' => true,
		);
	}

	/**
	 * Export items for the coupons a WordPress account is individually targeted by (D-R67l).
	 *
	 * @param list<array{coupon_id:int, code:string, name:string}> $targets Allow-list memberships.
	 * @return list<array<string, mixed>>
	 */
	private function couponTargetItems( array $targets ): array {
		return array_map(
			static fn ( array $target ): array => array(
				'group_id'    => 'aponto_coupon_targets',
				'group_label' => __( 'Aponto coupons reserved for this account', 'aponto' ),
				'item_id'     => 'aponto-coupon-target-' . $target['coupon_id'],
				'data'        => array(
					array(
						'name'  => __( 'Coupon code', 'aponto' ),
						'value' => $target['code'],
					),
					array(
						'name'  => __( 'Coupon name', 'aponto' ),
						'value' => $target['name'],
					),
				),
			),
			$targets
		);
	}

	/**
	 * The current-site WordPress account for an email, or 0.
	 *
	 * @param string $email Email address.
	 */
	private function wordpressUserId( string $email ): int {
		$user = get_user_by( 'email', strtolower( trim( $email ) ) );
		if ( ! $user instanceof \WP_User ) {
			return 0;
		}

		return (int) $user->ID;
	}

	/** The coupon allow-list privacy helper. */
	private function couponTargets(): CouponUserTargets {
		return new CouponUserTargets( $this->wpdb );
	}

	/**
	 * Erase (anonymize) a person's Aponto data.
	 *
	 * @param string $email Email address.
	 * @param int    $page  Page (unused; single-page erase).
	 * @return array{items_removed: bool, items_retained: bool, messages: list<string>, done: bool}
	 */
	public function erase( string $email, int $page = 1 ): array {
		unset( $page );
		// Coupon allow-list memberships go first and independently of the customer row (D-R67l). A
		// coupon left with no user is fail-closed (applies to nobody), never widened to everyone.
		$targets_retained = false;
		try {
			$targets_removed = $this->couponTargets()->removeUser( $this->wordpressUserId( $email ) ) > 0;
		} catch ( \Aponto\Database\StorageException $busy ) {
			// Serialized with coupon saves (D-R67l): a contended lock leaves the rows in place and
			// says so, instead of failing the whole erasure request.
			unset( $busy );
			$targets_removed  = false;
			$targets_retained = true;
		}
		$messages = $targets_removed
			? array( __( 'Aponto coupon reservations for this account were removed.', 'aponto' ) )
			: array();
		if ( $targets_retained ) {
			$messages[] = __( 'Aponto coupon reservations for this account could not be removed right now. Please run the erasure again.', 'aponto' );
		}

		// D-R72: previews may contain a person who has no customer row yet.
		$import_removed = ( new \Aponto\Import\Store( $this->wpdb, new \Aponto\Support\Clock() ) )->purgePreviews() > 0;
		if ( $import_removed ) {
			$messages[] = __( 'Temporary CSV import previews and reports were removed.', 'aponto' );
		}
		$customer = $this->customer( $email );
		if ( null === $customer ) {
			return array(
				'items_removed'  => $targets_removed || $import_removed,
				'items_retained' => $targets_retained,
				'messages'       => $messages,
				'done'           => true,
			);
		}

		( new Anonymizer( $this->wpdb ) )->anonymizeCustomer( (int) $customer['id'] );
		$messages[] = __( 'Aponto customer contact data was anonymized; booking audit records were retained.', 'aponto' );

		return array(
			'items_removed'  => true,
			'items_retained' => true,
			'messages'       => $messages,
			'done'           => true,
		);
	}

	/**
	 * Find a customer by normalized email.
	 *
	 * @param string $email Email.
	 * @return array<string, mixed>|null
	 */
	private function customer( string $email ): ?array {
		// Only a real address identifies a person here: the private key of a customer stored
		// without an email (D-R77) is not an address and must never resolve a row.
		if ( ! is_email( trim( $email ) ) ) {
			return null;
		}
		$table = $this->wpdb->prefix . 'aponto_customers';
		$sql   = "SELECT id, first_name, last_name, email, phone, note FROM {$table} WHERE email_norm = %s";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		$row = $this->wpdb->get_row( $this->wpdb->prepare( $sql, strtolower( trim( $email ) ) ), ARRAY_A );

		return is_array( $row ) ? $row : null;
	}

	/**
	 * The orders linked to the customer's bookings, each with an item summary (REST-8).
	 *
	 * @param list<int> $booking_ids Booking ids.
	 * @return list<array<string, mixed>>
	 */
	private function orders( array $booking_ids ): array {
		if ( array() === $booking_ids ) {
			return array();
		}
		$p            = $this->wpdb->prefix;
		$placeholders = implode( ', ', array_fill( 0, count( $booking_ids ), '%d' ) );
		$sql          = "SELECT DISTINCT o.id, o.code, o.subtotal_minor, o.discount_minor, o.total_minor, o.coupon_code, o.currency, o.payment_status FROM {$p}aponto_orders o
			INNER JOIN {$p}aponto_order_items oi ON oi.order_id = o.id
			WHERE oi.booking_id IN ( {$placeholders} ) ORDER BY o.id ASC";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; ids bound via prepare().
		$orders = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $booking_ids ), ARRAY_A );
		$orders = is_array( $orders ) ? $orders : array();

		foreach ( $orders as &$order ) {
			$items_sql = "SELECT item_type, amount_minor FROM {$p}aponto_order_items WHERE order_id = %d ORDER BY id ASC";
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
			$items   = $this->wpdb->get_results( $this->wpdb->prepare( $items_sql, (int) $order['id'] ), ARRAY_A );
			$summary = array();
			foreach ( is_array( $items ) ? $items : array() as $item ) {
				$summary[] = $item['item_type'] . ': ' . self::amount( (int) $item['amount_minor'], (string) $order['currency'] );
			}
			$order['items_summary'] = implode( '; ', $summary );
		}
		unset( $order );

		return $orders;
	}

	/**
	 * The payment attempts attached to a person's bookings (D-R38).
	 *
	 * Exported even though the rows carry NO PII, and that is the point: this is the person's own
	 * money — what they paid, when, through whom, and what came back — and a data export that lists
	 * the appointment but not the payment is answering half the question. Nothing here needs
	 * redacting because nothing here identifies anybody except through the booking id, which the
	 * export already covers.
	 *
	 * A missing table is treated as "no rows" rather than an error: a site mid-upgrade must still be
	 * able to complete a GDPR export.
	 *
	 * @param list<int> $booking_ids Booking ids.
	 * @return list<array<string, mixed>>
	 */
	private function transactions( array $booking_ids ): array {
		if ( array() === $booking_ids ) {
			return array();
		}

		$table        = $this->wpdb->prefix . 'aponto_transactions';
		$placeholders = implode( ', ', array_fill( 0, count( $booking_ids ), '%d' ) );
		$sql          = "SELECT id, kind, status, amount_minor, currency, gateway, payment_ref, created_at FROM {$table}
			WHERE booking_id IN ( {$placeholders} ) ORDER BY id ASC";
		$this->wpdb->flush();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare -- Constant table; ids bound via prepare(); the interpolated fragment is a %d-only placeholder list.
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $booking_ids ), ARRAY_A );

		return is_array( $rows ) ? array_values( $rows ) : array();
	}

	/**
	 * The customer's custom booking-form answers across their bookings (D-R30).
	 *
	 * Labels come from the CURRENT definitions with the slug as fallback, so an export stays
	 * readable after the site renames or removes a field — the person still learns what they were
	 * asked and what they answered.
	 *
	 * @param list<int> $booking_ids Booking ids.
	 * @return list<array{booking_id: int, slug: string, label: string, value: string}>
	 */
	private function customFieldAnswers( array $booking_ids ): array {
		if ( array() === $booking_ids ) {
			return array();
		}

		$table        = $this->wpdb->prefix . 'aponto_booking_meta';
		$placeholders = implode( ', ', array_fill( 0, count( $booking_ids ), '%d' ) );
		$sql          = "SELECT booking_id, meta_key, meta_value FROM {$table}
			WHERE booking_id IN ( {$placeholders} ) AND meta_key LIKE %s ORDER BY booking_id ASC, meta_key ASC";
		$args         = array_merge( $booking_ids, array( $this->wpdb->esc_like( CustomFieldSchema::META_PREFIX ) . '%' ) );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $args ), ARRAY_A );

		$definitions = ( new CustomFieldSchema() )->bySlug();
		$out         = array();
		foreach ( is_array( $rows ) ? $rows : array() as $row ) {
			$slug = CustomFieldSchema::slugFromMetaKey( (string) ( $row['meta_key'] ?? '' ) );
			if ( null === $slug ) {
				continue;
			}
			$definition = $definitions[ $slug ] ?? null;
			$out[]      = array(
				'booking_id' => (int) $row['booking_id'],
				'slug'       => $slug,
				'label'      => null !== $definition ? $definition->label : $slug,
				'value'      => (string) ( $row['meta_value'] ?? '' ),
			);
		}

		return $out;
	}

	/**
	 * The activity trail of the customer's bookings (REST-8).
	 *
	 * @param list<int> $booking_ids Booking ids.
	 * @return list<array<string, mixed>>
	 */
	private function activities( array $booking_ids ): array {
		if ( array() === $booking_ids ) {
			return array();
		}
		$table        = $this->wpdb->prefix . 'aponto_activities';
		$placeholders = implode( ', ', array_fill( 0, count( $booking_ids ), '%d' ) );
		$sql          = "SELECT id, entity_id, action, meta, initiated_by, created_at FROM {$table} WHERE entity_type = 'booking' AND entity_id IN ( {$placeholders} ) ORDER BY id ASC";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; ids bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $booking_ids ), ARRAY_A );

		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * The notification deliveries of the customer's bookings, with the person's OWN payload
	 * decrypted to a human-readable subject/recipient (REST-8). No cipher, hash or raw token is
	 * ever exposed; undecryptable content degrades to a placeholder.
	 *
	 * ONLY the mail addressed to the person (persona QA 2026-10-05, T-092). A booking also sends
	 * staff and business alerts, and those rows used to be exported with their `Recipient` — handing
	 * the customer every staff member's and the owner's email address in a file that exists to give
	 * people THEIR data. A delivery whose decrypted recipient is a different address is left out;
	 * one that cannot be decrypted names no address at all, so it stays as an existence record.
	 *
	 * @param list<int> $booking_ids    Booking ids.
	 * @param string    $customer_email The data subject's address.
	 * @return list<array<string, mixed>>
	 */
	private function deliveries( array $booking_ids, string $customer_email ): array {
		if ( array() === $booking_ids ) {
			return array();
		}
		$table        = $this->wpdb->prefix . 'aponto_notification_deliveries';
		$placeholders = implode( ', ', array_fill( 0, count( $booking_ids ), '%d' ) );
		$sql          = "SELECT id, booking_id, template_key, status, payload_cipher FROM {$table} WHERE booking_id IN ( {$placeholders} ) ORDER BY id ASC";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; ids bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $booking_ids ), ARRAY_A );

		$auth_key    = defined( 'SECURE_AUTH_KEY' ) ? (string) SECURE_AUTH_KEY : '';
		$crypto      = Crypto::isUsableKeyMaterial( $auth_key ) ? new Crypto( $auth_key ) : null;
		$unavailable = __( '(encrypted content unavailable)', 'aponto' );

		$out = array();
		foreach ( is_array( $rows ) ? $rows : array() as $row ) {
			$subject   = $unavailable;
			$recipient = $unavailable;
			$cipher    = (string) $row['payload_cipher'];
			if ( '' !== $cipher && null !== $crypto ) {
				$json    = $crypto->decrypt( $cipher, 'aponto-mail' );
				$payload = null !== $json ? json_decode( $json, true ) : null;
				if ( is_array( $payload ) ) {
					$subject   = (string) ( $payload['subject'] ?? $unavailable );
					$recipient = (string) ( $payload['to'] ?? $unavailable );
					if ( $recipient !== $unavailable && ! self::sameAddress( $recipient, $customer_email ) ) {
						continue; // Mail to staff or the business ABOUT this booking is not the customer's.
					}
				}
			}
			$out[] = array(
				'id'           => (int) $row['id'],
				'booking_id'   => (int) $row['booking_id'],
				'template_key' => (string) $row['template_key'],
				'status'       => (string) $row['status'],
				'subject'      => $subject,
				'recipient'    => $recipient,
			);
		}

		return $out;
	}

	/**
	 * Whether two mailbox strings are the same address (case-insensitive; a `Name <addr>` form is
	 * reduced to its address first).
	 *
	 * @param string $a One address.
	 * @param string $b The other.
	 */
	public static function sameAddress( string $a, string $b ): bool {
		$bare = static function ( string $value ): string {
			if ( 1 === preg_match( '/<([^>]+)>/', $value, $match ) ) {
				$value = $match[1];
			}

			return strtolower( trim( $value ) );
		};

		return '' !== $bare( $a ) && $bare( $a ) === $bare( $b );
	}

	/**
	 * A minor-unit amount as an export cell: `45.00 USD`.
	 *
	 * @param int    $minor    Amount in minor units.
	 * @param string $currency ISO currency code.
	 */
	public static function amount( int $minor, string $currency ): string {
		return trim( Format::moneyMajor( $minor, $currency ) . ' ' . strtoupper( $currency ) );
	}

	/**
	 * An activity's stored JSON `meta` as readable `key: value` pairs (T-092).
	 *
	 * The export printed the raw column — `{"from":"pending","to":"confirmed"}` — to a person who
	 * asked what happened to their booking. Nested values are flattened with a dotted key; anything
	 * that is not a JSON object is returned as it is, so nothing is dropped.
	 *
	 * @param string $meta Stored meta column.
	 */
	public static function flattenDetails( string $meta ): string {
		$decoded = '' === trim( $meta ) ? null : json_decode( $meta, true );
		if ( ! is_array( $decoded ) ) {
			return $meta;
		}

		$pairs = array();
		$walk  = static function ( array $node, string $prefix ) use ( &$walk, &$pairs ): void {
			foreach ( $node as $key => $value ) {
				$label = '' === $prefix ? (string) $key : $prefix . '.' . $key;
				if ( is_array( $value ) ) {
					$walk( $value, $label );
					continue;
				}
				if ( is_bool( $value ) ) {
					$value = $value ? 'yes' : 'no';
				}
				$pairs[] = $label . ': ' . ( null === $value ? '' : (string) $value );
			}
		};
		$walk( $decoded, '' );

		return implode( '; ', $pairs );
	}

	/**
	 * Idempotency links for the customer's bookings — EXISTENCE METADATA only, no hashes (REST-8).
	 *
	 * @param list<int> $booking_ids Booking ids.
	 * @return list<array<string, mixed>>
	 */
	private function idempotencyLinks( array $booking_ids ): array {
		if ( array() === $booking_ids ) {
			return array();
		}
		$table        = $this->wpdb->prefix . 'aponto_idempotency';
		$placeholders = implode( ', ', array_fill( 0, count( $booking_ids ), '%d' ) );
		$sql          = "SELECT booking_id, expires_at FROM {$table} WHERE booking_id IN ( {$placeholders} ) ORDER BY booking_id ASC";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; ids bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $booking_ids ), ARRAY_A );

		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * The customer's bookings (with service name + order code).
	 *
	 * @param int $customer_id Customer id.
	 * @return list<array<string, mixed>>
	 */
	private function bookings( int $customer_id ): array {
		$p   = $this->wpdb->prefix;
		$sql = "SELECT b.id, b.start_datetime_utc, b.end_datetime_utc, b.status, b.customer_timezone, b.customer_note, b.consent_at, s.name AS service_name, o.code AS order_code,
				st.first_name AS staff_first_name, st.last_name AS staff_last_name, l.name AS location_name
			FROM {$p}aponto_bookings b
			LEFT JOIN {$p}aponto_services s ON s.id = b.service_id
			LEFT JOIN {$p}aponto_staff st ON st.id = b.staff_id
			LEFT JOIN {$p}aponto_locations l ON l.id = b.location_id
			LEFT JOIN {$p}aponto_order_items oi ON oi.booking_id = b.id AND oi.item_type = 'booking'
			LEFT JOIN {$p}aponto_orders o ON o.id = oi.order_id
			WHERE b.customer_id = %d ORDER BY b.start_datetime_utc ASC";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $customer_id ), ARRAY_A );

		return is_array( $rows ) ? $rows : array();
	}
}

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
use Aponto\Support\Crypto;

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
		$customer = $this->customer( $email );
		if ( null === $customer ) {
			return array(
				'data' => array(),
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
					array(
						'name'  => __( 'Name', 'aponto' ),
						'value' => (string) $customer['name'],
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
					array(
						'name'  => __( 'Total (minor units)', 'aponto' ),
						'value' => (string) $order['total_minor'],
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
						'name'  => __( 'Amount (minor units)', 'aponto' ),
						'value' => (string) $transaction['amount_minor'],
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
						'value' => (string) $activity['meta'],
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

		foreach ( $this->deliveries( $booking_ids ) as $delivery ) {
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
			'data' => $data,
			'done' => true,
		);
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
		$customer = $this->customer( $email );
		if ( null === $customer ) {
			return array(
				'items_removed'  => false,
				'items_retained' => false,
				'messages'       => array(),
				'done'           => true,
			);
		}

		( new Anonymizer( $this->wpdb ) )->anonymizeCustomer( (int) $customer['id'] );

		return array(
			'items_removed'  => true,
			'items_retained' => true,
			'messages'       => array( __( 'Aponto customer contact data was anonymized; booking audit records were retained.', 'aponto' ) ),
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
		$table = $this->wpdb->prefix . 'aponto_customers';
		$sql   = "SELECT id, name, email, phone, note FROM {$table} WHERE email_norm = %s";
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
		$sql          = "SELECT DISTINCT o.id, o.code, o.total_minor, o.currency, o.payment_status FROM {$p}aponto_orders o
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
				$summary[] = $item['item_type'] . ': ' . $item['amount_minor'];
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
	 * @param list<int> $booking_ids Booking ids.
	 * @return list<array<string, mixed>>
	 */
	private function deliveries( array $booking_ids ): array {
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
		$sql = "SELECT b.id, b.start_datetime_utc, b.end_datetime_utc, b.status, b.customer_timezone, b.customer_note, b.consent_at, s.name AS service_name, o.code AS order_code
			FROM {$p}aponto_bookings b
			LEFT JOIN {$p}aponto_services s ON s.id = b.service_id
			LEFT JOIN {$p}aponto_order_items oi ON oi.booking_id = b.id AND oi.item_type = 'booking'
			LEFT JOIN {$p}aponto_orders o ON o.id = oi.order_id
			WHERE b.customer_id = %d ORDER BY b.start_datetime_utc ASC";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $customer_id ), ARRAY_A );

		return is_array( $rows ) ? $rows : array();
	}
}

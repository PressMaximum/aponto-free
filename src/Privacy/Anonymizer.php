<?php
/**
 * Customer/booking anonymization (privacy-inventory §6.4.8, REST-3).
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

use Aponto\Booking\Repository\BookingMetaRepository;
use Aponto\Database\StorageException;
use Aponto\Database\TransactionGuard;

/**
 * Applies the exact anonymize values from privacy-inventory.md to a customer and every linked
 * booking/activity/delivery.
 *
 * ATOMIC + IDENTITY-LAST (REST-3): the whole graph mutates inside ONE transaction, every statement
 * is checked fail-closed ({@see StorageException}), and the ORDER is bookings → activities →
 * deliveries first, the customer's contact identity (email/name/phone) LAST. A mid-way failure
 * rolls everything back, so the eraser can always find the customer again by the OLD email and
 * retry — no half-anonymized orphan is ever committed.
 *
 * Values (§6.4.8): `customers.email`/`email_norm` → `anon-{id}@invalid`; `name` →
 * `Deleted customer`; `phone`/`note` → `''`; `bookings.customer_note` → `''`; `token_hash` → fresh
 * random (kills the manage link); `consent_at` KEPT; `activities.meta` → `{}`;
 * `notification_deliveries.payload_cipher` → `''` with `recipient_hash` KEPT. `wp_user_id`,
 * `customer_timezone` and order/payment references are intentionally untouched (inventory OPEN
 * QUESTIONS — not to be invented).
 */
final class Anonymizer {

	/**
	 * Transaction control.
	 *
	 * @var TransactionGuard
	 */
	private TransactionGuard $tx;

	/**
	 * Construct the anonymizer.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct( private \wpdb $wpdb ) {
		$this->tx = new TransactionGuard( $wpdb );
	}

	/**
	 * Anonymize a customer and all linked records in ONE transaction.
	 *
	 * @param int $customer_id Customer id.
	 * @throws \Throwable Statement failures ({@see StorageException}) and any other error,
	 *                    re-thrown after a full rollback.
	 */
	public function anonymizeCustomer( int $customer_id ): void {
		$this->tx->begin();
		try {
			$this->applyInTransaction( $customer_id );
			$this->tx->commit();
		} catch ( \Throwable $failure ) {
			$this->tx->rollback();
			throw $failure;
		}
	}

	/**
	 * Test-only probe invoked right after the customer row lock, before the booking snapshot
	 * (mirrors the engine's interleave-probe pattern). Production never sets it.
	 *
	 * @internal
	 * @var callable|null
	 */
	private $post_lock_probe = null;

	/**
	 * Inject the test-only post-lock probe.
	 *
	 * @internal Test seam only.
	 * @param callable|null $probe `function (int $customer_id): void`.
	 */
	public function setTestPostLockProbe( ?callable $probe ): void {
		$this->post_lock_probe = $probe;
	}

	/**
	 * The graph mutation, assuming the CALLER controls the transaction (used by the retention
	 * cron, which re-checks eligibility under the same row lock in its own transaction — REST-2).
	 *
	 * V2: the FIRST statement locks the customer row (`SELECT … FOR UPDATE`) BEFORE the booking-id
	 * snapshot. `reserve()` upserts the same customers row inside its transaction, so a concurrent
	 * reservation for this customer either committed before our lock (its booking IS in the
	 * snapshot) or blocks until we finish — the graph can never miss a row, from ANY entry point
	 * (WP eraser or retention cron). Re-locking in the cron path is a same-transaction no-op.
	 *
	 * @param int $customer_id Customer id.
	 * @throws StorageException When any statement fails.
	 */
	public function applyInTransaction( int $customer_id ): void {
		$customers = $this->wpdb->prefix . 'aponto_customers';
		$lock_sql  = "SELECT id FROM {$customers} WHERE id = %d FOR UPDATE";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare(); row lock serialises with reserve()'s customer upsert.
		$locked = $this->wpdb->get_var( $this->wpdb->prepare( $lock_sql, $customer_id ) );
		if ( null === $locked ) {
			return; // Customer vanished — nothing to anonymize (idempotent no-op).
		}

		if ( null !== $this->post_lock_probe ) {
			( $this->post_lock_probe )( $customer_id );
		}

		foreach ( $this->bookingIds( $customer_id ) as $booking_id ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Anonymization write.
			$result = $this->wpdb->update(
				$this->wpdb->prefix . 'aponto_bookings',
				array(
					'customer_note' => '',
					'token_hash'    => bin2hex( random_bytes( 32 ) ),
				),
				array( 'id' => $booking_id ),
				array( '%s', '%s' ),
				array( '%d' )
			);
			$this->assertWrite( $result, 'anonymize booking' );

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Scrub activity PII.
			$result = $this->wpdb->update(
				$this->wpdb->prefix . 'aponto_activities',
				array( 'meta' => '{}' ),
				array(
					'entity_type' => 'booking',
					'entity_id'   => $booking_id,
				),
				array( '%s' ),
				array( '%s', '%d' )
			);
			$this->assertWrite( $result, 'anonymize activities' );

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Clear delivery payload.
			$result = $this->wpdb->update(
				$this->wpdb->prefix . 'aponto_notification_deliveries',
				array( 'payload_cipher' => '' ),
				array( 'booking_id' => $booking_id ),
				array( '%s' ),
				array( '%d' )
			);
			$this->assertWrite( $result, 'anonymize deliveries' );

			// The customer's answers to the site's extra booking-form fields are DELETED, not
			// blanked (D-R30): they are free text the person typed — the most sensitive data the
			// plugin can hold — and unlike `customer_note` there is no column that must keep
			// existing, so erasure removes the rows outright. `internal_note` on the same table is
			// deliberately UNTOUCHED: it is staff-authored operational text about the booking, a
			// different semantic from the customer's own words, and §6.4.8 does not put it in scope.
			$this->assertWrite(
				( new BookingMetaRepository( $this->wpdb ) )->deleteCustomFields( $booking_id ),
				'anonymize booking custom fields'
			);
		}

		// IDENTITY LAST (REST-3): the customer's contact row is the lookup key for the eraser —
		// it only changes once every linked record has been scrubbed successfully.
		$anon = 'anon-' . $customer_id . '@invalid';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Anonymization write.
		$result = $this->wpdb->update(
			$this->wpdb->prefix . 'aponto_customers',
			array(
				'name'       => 'Deleted customer',
				'email'      => $anon,
				'email_norm' => $anon,
				'phone'      => '',
				'note'       => '',
			),
			array( 'id' => $customer_id ),
			array( '%s', '%s', '%s', '%s', '%s' ),
			array( '%d' )
		);
		$this->assertWrite( $result, 'anonymize customer' );
	}

	/**
	 * Fail closed on a statement failure (REST-3): `$wpdb` returns FALSE on error.
	 *
	 * @param int|false $result    Statement result.
	 * @param string    $operation Stable operation label.
	 * @throws StorageException When the statement failed.
	 */
	private function assertWrite( int|false $result, string $operation ): void {
		if ( false === $result ) {
			$failure = StorageException::fromWpdb( $this->wpdb, esc_html( $operation ) );
			throw $failure;
		}
	}

	/**
	 * The booking ids for a customer.
	 *
	 * @param int $customer_id Customer id.
	 * @return list<int>
	 */
	private function bookingIds( int $customer_id ): array {
		$table = $this->wpdb->prefix . 'aponto_bookings';
		$sql   = "SELECT id FROM {$table} WHERE customer_id = %d ORDER BY id ASC";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		$ids = $this->wpdb->get_col( $this->wpdb->prepare( $sql, $customer_id ) );

		return array_map( 'intval', is_array( $ids ) ? $ids : array() );
	}
}

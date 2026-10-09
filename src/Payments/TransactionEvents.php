<?php
/**
 * Post-lock payment lifecycle observations.
 *
 * @package Aponto
 */

declare(strict_types=1);
namespace Aponto\Payments;

use Aponto\Database\Lock;
use Aponto\Database\TransactionGuard;

/** Observes public ledger changes without affecting the payment result. */
final class TransactionEvents {
	/**
	 * Held order groups.
	 *
	 * @var array<string,array{depth:int,order:int,before:?array<string,mixed>}>
	 */
	private array $held = array();
	/**
	 * Deferred native actions.
	 *
	 * @var list<array{0:string,1:array<string,mixed>,2:array<string,mixed>}>
	 */
	private array $pending = array();

	/**
	 * Construct the observer.
	 *
	 * @param \wpdb $wpdb Database connection.
	 */
	public function __construct( private \wpdb $wpdb ) {}

	/**
	 * Record the outermost entry while the caller owns the order lock.
	 *
	 * @param int  $order_id Order identity.
	 * @param Lock $lock Acquired lock.
	 */
	public function acquired( int $order_id, Lock $lock ): void {
		$name = $lock->name();
		if ( isset( $this->held[ $name ] ) ) {
			++$this->held[ $name ]['depth'];
			return;
		}
		$this->held[ $name ] = array(
			'depth'  => 1,
			'order'  => $order_id,
			'before' => null,
		);
		if ( false !== has_action( 'aponto_payment_transaction_changed' ) || false !== has_action( 'aponto_order_updated' ) ) {
			$this->held[ $name ]['before'] = $this->read( $order_id, $lock );
		}
	}

	/**
	 * Read committed state, release, then dispatch outside every observed order lock.
	 *
	 * @param Lock $lock Lock being released.
	 */
	public function release( Lock $lock ): void {
		$name = $lock->name();
		try {
			if ( isset( $this->held[ $name ] ) && 0 === --$this->held[ $name ]['depth'] ) {
				$group = $this->held[ $name ];
				unset( $this->held[ $name ] );
				$after = null !== $group['before'] ? $this->read( $group['order'], $lock ) : null;
				if ( null !== $after ) {
					$this->observe( $group['before'], $after );
				}
			}
		} catch ( \Throwable $failure ) {
			unset( $this->held[ $name ] );
		} finally {
			$lock->release();
		}
		if ( array() !== $this->held ) {
			return;
		}
		$pending       = $this->pending;
		$this->pending = array();
		foreach ( $pending as [$hook, $current, $before] ) {
			try {
				// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound -- Two literal aponto actions below.
				do_action( $hook, $current, $before );
			} catch ( \Throwable $failure ) {
				// A committed payment must not become an HTTP failure because an observer failed.
				continue;
			}
		}
	}

	/**
	 * Checked reads on the session that owns the lock; no cached repository defaults.
	 *
	 * @param int  $order_id Order identity.
	 * @param Lock $lock Owned lock.
	 * @return array{transactions:array<int,array<string,mixed>>,order:array<string,mixed>}|null
	 */
	private function read( int $order_id, Lock $lock ): ?array {
		try {
			$guard      = new TransactionGuard( $this->wpdb );
			$connection = $guard->currentConnectionId();
			if ( null === $connection || $lock->connectionId() !== $connection ) {
				return null;
			}
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- All identifiers and values use prepare placeholders.
			$rows = $this->wpdb->get_results( $this->wpdb->prepare( 'SELECT t.*, b.customer_id FROM %i t LEFT JOIN %i b ON b.id = t.booking_id WHERE t.order_id = %d ORDER BY t.id', $this->wpdb->prefix . 'aponto_transactions', $this->wpdb->prefix . 'aponto_bookings', $order_id ), ARRAY_A );
			if ( '' !== $this->wpdb->last_error || ! is_array( $rows ) ) {
				return null;
			}
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- All identifiers and values use prepare placeholders.
			$order = $this->wpdb->get_row( $this->wpdb->prepare( 'SELECT o.*, (SELECT b.customer_id FROM %i i INNER JOIN %i b ON b.id = i.booking_id WHERE i.order_id = o.id ORDER BY i.id LIMIT 1) AS customer_id FROM %i o WHERE o.id = %d', $this->wpdb->prefix . 'aponto_order_items', $this->wpdb->prefix . 'aponto_bookings', $this->wpdb->prefix . 'aponto_orders', $order_id ), ARRAY_A );
			if ( $this->hasReadError() || ! is_array( $order ) || $connection !== $guard->currentConnectionId() || $connection !== $lock->connectionId() ) {
				return null;
			}
			$indexed = array();
			foreach ( $rows as $row ) {
				$indexed[ (int) $row['id'] ] = $row;
			}
			return array(
				'transactions' => $indexed,
				'order'        => $order,
			);
		} catch ( \Throwable $failure ) {
			return null;
		}
	}

	/** Read a volatile database error after each query. */
	private function hasReadError(): bool {
		return '' !== $this->wpdb->last_error;
	}

	/**
	 * Observe a successful failure CAS performed by an existing unlocked best-effort path.
	 *
	 * @param int  $id Ledger identity.
	 * @param bool $changed Whether the compare-and-swap actually changed a row.
	 */
	public function failed( int $id, bool $changed ): void {
		if ( ! $changed || array() !== $this->held || false === has_action( 'aponto_payment_transaction_changed' ) ) {
			return;
		}
		try {
			$guard      = new TransactionGuard( $this->wpdb );
			$connection = $guard->currentConnectionId();
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- All identifiers and values use prepare placeholders.
			$row = $this->wpdb->get_row( $this->wpdb->prepare( 'SELECT t.*, b.customer_id FROM %i t LEFT JOIN %i b ON b.id = t.booking_id WHERE t.id = %d', $this->wpdb->prefix . 'aponto_transactions', $this->wpdb->prefix . 'aponto_bookings', $id ), ARRAY_A );
			if ( $this->hasReadError() || ! is_array( $row ) || 'failed' !== ( $row['status'] ?? '' ) || null === $connection || $connection !== $guard->currentConnectionId() ) {
				return;
			}
			do_action( 'aponto_payment_transaction_changed', $row, array() );
		} catch ( \Throwable $failure ) {
			return;
		}
	}

	/**
	 * Queue only actual public transitions, never internal claim releases.
	 *
	 * @param array<string,mixed> $before Entry snapshot.
	 * @param array<string,mixed> $after Exit snapshot.
	 */
	private function observe( array $before, array $after ): void {
		foreach ( $after['transactions'] as $id => $row ) {
			$old    = $before['transactions'][ $id ] ?? array();
			$status = $row['status'] ?? '';
			if ( ( $old['status'] ?? '' ) === $status || ! in_array( $status, array( 'pending', 'succeeded', 'failed' ), true ) || ( 'pending' === $status && array() !== $old ) ) {
				continue;
			}
			// Successful zero-due checkout closes its provisional row without moving money.
			if ( 'charge' === ( $row['kind'] ?? '' ) && 'failed' === $status
				&& 'no_charge' === ( $row['failure_code'] ?? '' ) && 0 === (int) $row['amount_minor'] ) {
				continue;
			}
			$this->pending[] = array( 'aponto_payment_transaction_changed', $row, $old );
		}
		if ( ( $before['order']['payment_status'] ?? '' ) !== ( $after['order']['payment_status'] ?? '' ) ) {
			$this->pending[] = array( 'aponto_order_updated', $after['order'], $before['order'] );
		}
	}
}

<?php
/**
 * Full balance collection and recorded on-site refunds (D-R71c).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Payments;

use Aponto\Booking\Booking;
use Aponto\Booking\Exception\IdempotencyConflict;
use Aponto\Database\Lock;
use WP_Error;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/** Separate balance lifecycle sharing PaymentService's order lock and repositories. */
trait BalancePayments {

	/**
	 * Read the current collectible balance and any existing attempt without gateway HTTP.
	 *
	 * @param int $booking_id Booking id.
	 * @return array<string,mixed>
	 * @throws PaymentException When the order does not exist.
	 */
	public function balanceState( int $booking_id ): array {
		$order = $this->orders->findForBooking( $booking_id );
		if ( null === $order ) {
			throw PaymentException::state();
		}
		$booking = $this->bookings->find( $booking_id );
		$ledger  = $this->transactions->ledgerTotals( (int) $order['id'] );
		$attempt = $this->transactions->pendingBalance( (int) $order['id'] );
		$reason  = $this->balanceRefusal( $booking, $order, $ledger, $attempt );
		$methods = array();
		if ( null === $reason ) {
			foreach ( PaymentRegistry::offeredCodes() as $gateway ) {
				if ( OrderAmounts::balanceDue( $order, $ledger ) >= PaymentDispatcher::minAmount( $gateway, (string) $order['currency'] ) ) {
					$methods[] = $gateway;
				}
			}
			if ( array() === $methods ) {
				$reason = 'unavailable';
			}
		}
		$gateways = $this->balanceGateways( null !== $attempt ? array( (string) $attempt['gateway'] ) : $methods, (string) $order['currency'] );
		if ( null !== $attempt && ! $this->balanceConfigurationMatches( $attempt ) ) {
			$gateways = array();
			$reason   = 'unavailable';
		}
		if ( null === $reason && array() === $gateways ) {
			$reason = 'unavailable';
		}
		return array(
			'order'            => $this->orderSummary( (int) $order['id'] ),
			'previous_gateway' => (string) ( $order['gateway'] ?? '' ),
			'default_gateway'  => $this->balanceDefaultGateway( $order, $booking, $gateways ),
			'eligible'         => null === $reason,
			'gateways'         => $gateways,
			'reason'           => $reason,
			'payment'          => null === $attempt ? null : $this->balancePaymentBlock( $attempt ),
		);
	}

	/**
	 * Resolve an optional default against the currently offered balance methods.
	 *
	 * @param array<string,mixed>       $order Original order.
	 * @param Booking|null              $booking Booking.
	 * @param list<array<string,mixed>> $gateways Available gateway representations.
	 */
	private function balanceDefaultGateway( array $order, ?Booking $booking, array $gateways ): string {
		$default = apply_filters( 'aponto_balance_default_gateway', '', $order, $booking );
		return is_string( $default ) && in_array( $default, array_column( $gateways, 'code' ), true ) ? $default : '';
	}

	/**
	 * Refresh a referenced attempt without starting or capturing another payment.
	 *
	 * @param int $booking_id Booking id.
	 * @return array<string,mixed>
	 * @throws PaymentException When the order or existing payment cannot be verified.
	 */
	public function checkBalance( int $booking_id ): array {
		$order = $this->orders->findForBooking( $booking_id );
		if ( null === $order ) {
			throw PaymentException::state();
		}
		$attempt = $this->transactions->pendingBalance( (int) $order['id'] );
		if ( null !== $attempt && '' !== $attempt['gateway_ref'] ) {
			$this->confirmBalance( $attempt, true );
		}
		return $this->balanceState( $booking_id );
	}

	/**
	 * Determine eligibility from fresh server facts; no customer-supplied money enters this path.
	 *
	 * @param Booking|null             $booking Booking.
	 * @param array<string,mixed>      $order Order.
	 * @param array<string,int>        $ledger Money totals.
	 * @param array<string,mixed>|null $attempt Unresolved attempt.
	 */
	private function balanceRefusal( ?Booking $booking, array $order, array $ledger, ?array $attempt ): ?string {
		if ( null !== $attempt ) {
			return 'in_progress';
		}
		if ( ! OrderAmounts::isDeposit( $order ) || ! in_array( (string) $order['payment_status'], array( 'paid', 'partial' ), true ) || OrderAmounts::balanceDue( $order, $ledger ) < 1 ) {
			return 'no_balance';
		}
		if ( null === $booking || ! in_array( $booking->status, array( 'confirmed', 'completed' ), true ) ) {
			return 'booking_state';
		}
		if ( ! ChargeableAmount::isChargeable( OrderAmounts::balanceDue( $order, $ledger ), (string) $order['currency'] ) ) {
			return 'unavailable';
		}
		if ( $ledger['refunded'] > 0 ) {
			return 'refunded';
		}
		if ( $this->transactions->hasPendingRefund( (int) $order['id'] ) ) {
			return 'refund_pending';
		}
		$context = PricingContext::forSite( PricingContext::SCOPE_PUBLIC, $booking->service_id, (string) $order['currency'], $this->settings );
		if ( 'off' === $context->payments_mode || $context->external_exclusive || ! apply_filters( 'aponto_online_balance_allowed', false, $order, $booking ) ) {
			return 'unavailable';
		}
		return null;
	}

	/**
	 * Claim or resume one full balance attempt. Ambiguous failures keep the same durable key.
	 *
	 * @param int    $booking_id Booking id.
	 * @param string $gateway Selected offered method.
	 * @return array<string,mixed>
	 * @throws \Throwable On a payment refusal or rolled-back storage failure.
	 * @throws PaymentException When a state or gateway refuses the attempt.
	 */
	public function beginBalance( int $booking_id, string $gateway ): array {
		// Refuse an ambient transaction before any durable claim or external HTTP.
		$this->tx->beginReadCommitted();
		$this->tx->rollback();
		$order = $this->orders->findForBooking( $booking_id );
		if ( null === $order ) {
			throw PaymentException::state();
		}
		$order_id = (int) $order['id'];
		$lock     = $this->acquire( $order_id );
		try {
			$order   = $this->orders->find( $order_id );
			$booking = $this->bookings->find( $booking_id );
			if ( null === $order || null === $booking ) {
				throw PaymentException::state();
			}
			$attempt = $this->transactions->pendingBalance( $order_id );
			if ( null !== $attempt ) {
				if ( $gateway !== $attempt['gateway'] || ! $this->balanceConfigurationMatches( $attempt ) ) {
					throw PaymentException::state();
				}
				if ( TransactionRepository::STATUS_FAILED === $attempt['status'] && '' !== $attempt['gateway_ref'] ) {
					$this->assertLockIntact( $lock );
					$retry_lease = $this->transactions->claimForCapture( (int) $attempt['id'] );
					if ( '' !== $retry_lease ) {
						$this->transactions->releaseCaptureClaim( (int) $attempt['id'], $retry_lease );
					}
				}
				if ( '' !== $attempt['gateway_ref'] || $this->transactions->isClaimFresh( $attempt, $this->clock->now() ) ) {
					return $this->balanceState( $booking_id );
				}
				if ( ! PaymentRegistry::isOffered( $gateway ) ) {
					throw PaymentException::unavailable();
				}
				// A remote provider may forget an old idempotency key. Keep old unknown attempts
				// reserved for reconciliation rather than accidentally creating a second object.
				if ( (string) $attempt['created_at'] < $this->clock->now()->sub( new \DateInterval( 'PT5H' ) )->format( 'Y-m-d H:i:s' ) ) {
					throw PaymentException::state();
				}
				// Reference-less recovery always replays the original key, never a fresh charge.
				$this->assertLockIntact( $lock );
				$this->transactions->holdForVerification( (int) $attempt['id'], (string) $attempt['updated_at'] );
				if ( ! $this->transactions->reclaimForVerification( (int) $attempt['id'] ) ) {
					throw PaymentException::state();
				}
			} else {
				$state = $this->balanceState( $booking_id );
				if ( ! $state['eligible'] || ! in_array( $gateway, array_column( $state['gateways'], 'code' ), true ) ) {
					throw PaymentException::state();
				}
				$this->assertLockIntact( $lock );
				$sequence = $this->transactions->nextSequence( $order_id, TransactionRepository::KIND_BALANCE );
				$this->tx->beginReadCommitted();
				try {
					$id = $this->transactions->insertPending( $order_id, $booking_id, $gateway, TransactionRepository::KIND_BALANCE, (int) $state['order']['balance_due_minor'], (string) $order['currency'], PaymentRegistry::idempotencyKey( $order_id, TransactionRepository::KIND_BALANCE, $sequence ), null, null, $this->balanceConfigurationHash( $gateway, (string) $order['currency'] ) );
					$this->assertLockIntact( $lock );
					$this->tx->commit();
				} catch ( \Throwable $failure ) {
					$this->tx->rollback();
					throw $failure;
				}
				$attempt = $this->transactions->find( $id );
			}
			$this->assertLockIntact( $lock );
			if ( null === $attempt ) {
				throw PaymentException::state();
			}
		} finally {
			$this->events->release( $lock );
		}
		$result = $this->dispatcher->begin(
			new PaymentBeginRequest( $gateway, $order_id, (string) $order['code'], $booking_id, (int) $attempt['amount_minor'], (string) $attempt['currency'], $this->customerEmail( $booking->customer_id ), $this->serviceName( $booking->service_id ), $this->holdDeadline(), (string) get_locale() ),
			$this->context( (string) $attempt['idempotency_key'], 'begin', true )
		);
		if ( $result instanceof WP_Error ) {
			// Unknown creation stays reserved. Repeating its key recovers a remote object safely.
			throw PaymentException::driverFailed();
		}
		$lock = $this->acquire( $order_id );
		try {
			$this->assertLockIntact( $lock );
			$this->transactions->markBegun( (int) $attempt['id'], $result->gateway_ref, $result->client_params, $result->expires_at );
			return $this->balanceState( $booking_id );
		} finally {
			$this->events->release( $lock );
		}
	}

	/**
	 * Confirm the exact balance attempt, independently of the initial deposit's partial status.
	 *
	 * @param array<string,mixed> $attempt Original attempt.
	 * @param bool                $retrieve_only Observe existing money without initiating capture.
	 * @return array<string,mixed>
	 * @throws PaymentException When payment is unavailable or invalid.
	 */
	private function confirmBalance( array $attempt, bool $retrieve_only = false ): array {
		// Refuse an ambient transaction before any durable claim or external HTTP.
		$this->tx->beginReadCommitted();
		$this->tx->rollback();
		$order_id = (int) $attempt['order_id'];
		$id       = (int) $attempt['id'];
		$lock     = $this->acquire( $order_id );
		try {
			$attempt = $this->transactions->find( $id );
			$order   = $this->orders->find( $order_id );
			if ( null === $attempt || null === $order ) {
				throw PaymentException::state();
			}
			if ( TransactionRepository::STATUS_SUCCEEDED === $attempt['status'] || in_array( $attempt['failure_code'], array( 'balance_voided', 'balance_expired' ), true ) ) {
				return $this->balanceConfirmState( $attempt );
			}
			if ( ! $this->balanceConfigurationMatches( $attempt ) ) {
				throw PaymentException::unavailable();
			}
			$this->assertLockIntact( $lock );
			$lease = $this->transactions->claimForCapture( $id );
			if ( '' === $lease ) {
				return $this->balanceConfirmState( $attempt );
			}
		} finally {
			$this->events->release( $lock );
		}
		$booking         = $this->bookings->find( (int) $attempt['booking_id'] );
		$capture_allowed = ! $retrieve_only && null !== $booking && in_array( $booking->status, array( 'confirmed', 'completed' ), true );
		$outcome         = $this->dispatcher->capture( new CaptureRequest( (string) $attempt['gateway'], (string) $attempt['gateway_ref'], (int) $attempt['amount_minor'], (string) $attempt['currency'], (string) $order['code'], $capture_allowed, ! $capture_allowed ), $this->context( (string) $attempt['idempotency_key'], 'capture', true ), $order_id );
		$lock            = $this->acquire( $order_id );
		try {
			$this->assertLockIntact( $lock );
			$restore = $retrieve_only && ( $outcome instanceof WP_Error || PaymentOutcome::PENDING === $outcome->status )
				? (string) $attempt['status']
				: TransactionRepository::STATUS_PENDING;
			$this->transactions->releaseCaptureClaim( $id, $lease, $restore );
			if ( $outcome instanceof WP_Error ) {
				throw PaymentException::driverFailed();
			}
			// A read can find an ordinary unsubmitted checkout. Preserve its ability to continue.
			if ( ! $retrieve_only || PaymentOutcome::PENDING !== $outcome->status ) {
				$this->applyBalanceOutcome( $attempt, $outcome, $lock );
			}
			return $this->balanceConfirmState( $this->transactions->find( $id ) ?? $attempt );
		} finally {
			$this->events->release( $lock );
		}
	}

	/**
	 * Cancel only a balance attempt. A paid response is reconciled, never discarded.
	 *
	 * @param int $booking_id Booking id.
	 * @return array<string,mixed>
	 * @throws PaymentException When the attempt cannot safely be resolved.
	 */
	public function cancelBalance( int $booking_id ): array {
		// Refuse an ambient transaction before any durable claim or external HTTP.
		$this->tx->beginReadCommitted();
		$this->tx->rollback();
		$order = $this->orders->findForBooking( $booking_id );
		if ( null === $order ) {
			throw PaymentException::state();
		}
		$order_id = (int) $order['id'];
		$lock     = $this->acquire( $order_id );
		try {
			$attempt = $this->transactions->pendingBalance( $order_id );
			if ( null === $attempt ) {
				return $this->balanceState( $booking_id );
			}
			if ( '' === $attempt['gateway_ref'] || ! $this->balanceConfigurationMatches( $attempt ) ) {
				// A begin may already have created a remote object. Recover its reference first.
				throw PaymentException::state();
			}
			$this->assertLockIntact( $lock );
			if ( TransactionRepository::STATUS_FAILED === $attempt['status'] ) {
				$lease = $this->transactions->claimForCapture( (int) $attempt['id'] );
				if ( '' !== $lease ) {
					$this->transactions->releaseCaptureClaim( (int) $attempt['id'], $lease );
				}
			}
			$lease = $this->transactions->claimForVoid( (int) $attempt['id'] );
			if ( '' === $lease ) {
				throw PaymentException::state();
			}
		} finally {
			$this->events->release( $lock );
		}
		$void    = $this->dispatcher->void( new VoidRequest( (string) $attempt['gateway'], (string) $attempt['gateway_ref'], (string) $order['code'], 'balance_cancelled' ), $this->context( (string) $attempt['idempotency_key'], 'void', true ), $order_id );
		$outcome = null;
		if ( $void instanceof VoidResult && $void->isAlreadyPaid() ) {
			$outcome = $this->dispatcher->capture( new CaptureRequest( (string) $attempt['gateway'], (string) $attempt['gateway_ref'], (int) $attempt['amount_minor'], (string) $attempt['currency'], (string) $order['code'], false, true ), $this->context( (string) $attempt['idempotency_key'], 'capture', false ), $order_id );
		}
		$lock = $this->acquire( $order_id );
		try {
			$this->assertLockIntact( $lock );
			if ( $void instanceof WP_Error || ! in_array( $void->status, VoidResult::STATUSES, true ) || ( $void->isAlreadyPaid() && ( ! $outcome instanceof PaymentOutcome || PaymentOutcome::PAID !== $outcome->status ) ) ) {
				$this->transactions->releaseVoidClaim( (int) $attempt['id'], $lease );
				throw PaymentException::driverFailed();
			}
			if ( $outcome instanceof PaymentOutcome ) {
				$this->applyBalanceOutcome( $attempt, $outcome, $lock );
			} else {
				$current = $this->transactions->find( (int) $attempt['id'] );
				if ( null !== $current && TransactionRepository::STATUS_VOIDING === $current['status'] && $lease === $current['updated_at'] ) {
					$this->transactions->markFailed( (int) $attempt['id'], 'balance_voided' );
				}
			}
			return $this->balanceState( $booking_id );
		} finally {
			$this->events->release( $lock );
		}
	}

	/**
	 * Apply a verified exact-attempt result without changing any booking or hold state.
	 *
	 * @param array<string,mixed> $attempt Attempt.
	 * @param PaymentOutcome      $outcome Gateway result.
	 * @param Lock                $lock Held order lock.
	 * @throws \Throwable Re-thrown after rolling back the owned transaction.
	 */
	private function applyBalanceOutcome( array $attempt, PaymentOutcome $outcome, Lock $lock ): string {
		$current = $this->transactions->find( (int) $attempt['id'] );
		if ( null === $current ) {
			return 'skipped';
		}
		if ( TransactionRepository::STATUS_SUCCEEDED === $current['status'] ) {
			return 'duplicate';
		}
		$this->assertLockIntact( $lock );
		if ( PaymentOutcome::PAID !== $outcome->status ) {
			if ( in_array( $outcome->status, array( PaymentOutcome::FAILED, PaymentOutcome::EXPIRED ), true ) && ! in_array( $current['status'], array( TransactionRepository::STATUS_CAPTURING, TransactionRepository::STATUS_VOIDING ), true ) && ! in_array( $current['failure_code'], array( 'balance_voided', 'balance_expired' ), true ) ) {
				$this->transactions->markFailed( (int) $current['id'], PaymentOutcome::EXPIRED === $outcome->status ? 'balance_expired' : $outcome->failure_code, PaymentOutcome::FAILED === $outcome->status );
			}
			if ( PaymentOutcome::PENDING === $outcome->status ) {
				$this->transactions->noteInFlightFailure( (int) $current['id'], 'balance_processing' );
			}
			return 'skipped';
		}
		if ( $outcome->amount_minor !== (int) $current['amount_minor'] || strtoupper( $outcome->currency ) !== strtoupper( (string) $current['currency'] ) ) {
			$this->anomaly( (string) $current['gateway'], (int) $current['order_id'], 'balance_amount_mismatch' );
			return 'mismatch';
		}
		$this->tx->beginReadCommitted();
		try {
			// A late authoritative success must count even after a decline or verified cancellation.
			if ( TransactionRepository::STATUS_FAILED === $current['status'] ) {
				$this->transactions->claimForCapture( (int) $current['id'] );
			}
			if ( ! $this->transactions->markSucceeded( (int) $current['id'], $outcome->payment_ref, $outcome->gateway_ref ) ) {
				$this->tx->rollback();
				return 'duplicate';
			}
			$this->orders->markRefundStatus( (int) $current['order_id'], $this->settledStatusFor( (int) $current['order_id'] ) );
			$this->activities->log(
				'booking',
				(int) $current['booking_id'],
				'balance_paid_online',
				array(
					'transaction_id' => (int) $current['id'],
					'amount'         => (int) $current['amount_minor'],
					'gateway'        => (string) $current['gateway'],
				),
				'gateway:' . $current['gateway']
			);
			$this->assertLockIntact( $lock );
			$this->tx->commit();
		} catch ( \Throwable $failure ) {
			$this->tx->rollback();
			throw $failure;
		}
		return 'applied';
	}

	/**
	 * Public payment attempt block, separate from aggregate order payment status.
	 *
	 * @param array<string,mixed> $row Attempt.
	 * @return array<string,mixed>
	 */
	private function balancePaymentBlock( array $row ): array {
		$status = (string) $row['status'];
		if ( TransactionRepository::STATUS_PENDING === $status && '' !== $row['gateway_ref'] && 'balance_processing' !== $row['failure_code'] ) {
			$status = 'begin';
		} elseif ( in_array( $status, array( TransactionRepository::STATUS_VOIDING, TransactionRepository::STATUS_CAPTURING ), true ) ) {
			$status = 'pending';
		}
		return array(
			'gateway'        => (string) $row['gateway'],
			'status'         => $status,
			'client_params'  => self::paramsBlock( TransactionRepository::clientParams( $row ) ),
			'gateway_ref'    => (string) $row['gateway_ref'],
			'transaction_id' => (int) $row['id'],
			'amount_minor'   => (int) $row['amount_minor'],
			'currency'       => (string) $row['currency'],
			'expires_at'     => $row['expires_at'],
		);
	}

	/**
	 * Confirm response with the attempt's own status.
	 *
	 * @param array<string,mixed> $attempt Attempt.
	 * @return array<string,mixed>
	 */
	private function balanceConfirmState( array $attempt ): array {
		return $this->stateFor( (int) $attempt['order_id'] ) + array( 'payment' => $this->balancePaymentBlock( $attempt ) );
	}

	/**
	 * Record money already returned on site. Its idempotency key is retained with the ledger.
	 *
	 * @param int    $booking_id Booking id.
	 * @param int    $amount Amount actually returned in minor units.
	 * @param string $actor Operator.
	 * @param string $idempotency Original request key.
	 * @return array<string,mixed>
	 * @throws \Throwable On invalid state, a conflicting replay, or a failed write.
	 * @throws PaymentException When no refundable onsite money is available.
	 * @throws IdempotencyConflict When a used key carries a different amount.
	 */
	public function refundOnsite( int $booking_id, int $amount, string $actor, string $idempotency ): array {
		$order = $this->orders->findForBooking( $booking_id );
		if ( null === $order ) {
			throw PaymentException::state();
		}
		$order_id = (int) $order['id'];
		$key      = 'onsite-refund:' . $order_id . ':' . hash( 'sha256', $idempotency );
		$lock     = $this->acquire( $order_id );
		try {
			foreach ( $this->transactions->forOrder( $order_id ) as $row ) {
				if ( $key === $row['idempotency_key'] ) {
					if ( $amount !== (int) $row['amount_minor'] ) {
						throw new IdempotencyConflict();
					}
					return array(
						'transaction' => $this->transactions->find( (int) $row['id'] ),
						'order'       => $this->orderSummary( $order_id ),
					);
				}
			}
			$onsite = $this->transactions->succeededOnsite( $order_id );
			if ( '' === $idempotency || $amount < 1 || null === $onsite || $amount > (int) $onsite['amount_minor'] - $this->transactions->refundedForCharge( $order_id, (int) $onsite['id'] ) || null !== $this->transactions->pendingBalance( $order_id ) || $this->transactions->hasPendingRefund( $order_id ) || ! ChargeableAmount::isChargeable( $amount, (string) $order['currency'] ) ) {
				throw PaymentException::state();
			}
			$this->assertLockIntact( $lock );
			$this->tx->beginReadCommitted();
			try {
				$id = $this->transactions->insertOnsite( $order_id, $booking_id, $amount, (string) $order['currency'], $key, TransactionRepository::KIND_ONSITE_REFUND, (int) $onsite['id'] );
				$this->orders->markRefundStatus( $order_id, $this->settledStatusFor( $order_id ) );
				$this->activities->log(
					'booking',
					$booking_id,
					'balance_refunded_onsite',
					array(
						'transaction_id' => $id,
						'amount'         => $amount,
					),
					$actor
				);
				$this->assertLockIntact( $lock );
				$this->tx->commit();
			} catch ( \Throwable $failure ) {
				$this->tx->rollback();
				throw $failure;
			}
			return array(
				'transaction' => $this->transactions->find( $id ),
				'order'       => $this->orderSummary( $order_id ),
			);
		} finally {
			$this->events->release( $lock );
		}
	}
	/**
	 * Resolve every known reference to one original online collection.
	 *
	 * @param string       $gateway Gateway.
	 * @param WebhookEvent $event Verified event.
	 * @return array<string,mixed>|null
	 */
	private function eventCharge( string $gateway, WebhookEvent $event ): ?array {
		$charges = array();
		foreach ( array( $this->transactions->findByGatewayRef( $gateway, $event->gateway_ref ), $this->transactions->findByPaymentRef( $gateway, $event->payment_ref ), $this->transactions->findRefundByRef( $gateway, $event->payment_ref ) ) as $row ) {
			if ( null !== $row && TransactionRepository::KIND_REFUND === $row['kind'] ) {
				$row = $this->transactions->find( (int) $row['parent_id'] );
			}
			if ( null !== $row && $gateway === $row['gateway'] && in_array( $row['kind'], array( TransactionRepository::KIND_CHARGE, TransactionRepository::KIND_BALANCE ), true ) ) {
				$charges[ (int) $row['id'] ] = $row;
			}
		}
		if ( 1 !== count( $charges ) ) {
			return null;
		}
		return reset( $charges );
	}

	/**
	 * Original online collections that retain refundable money.
	 *
	 * @param int $order_id Order id.
	 * @return list<array<string,mixed>>
	 */
	private function refundableCharges( int $order_id ): array {
		$result = array();
		foreach ( $this->transactions->forOrder( $order_id ) as $row ) {
			if ( in_array( $row['kind'], array( TransactionRepository::KIND_CHARGE, TransactionRepository::KIND_BALANCE ), true ) && TransactionRepository::STATUS_SUCCEEDED === $row['status'] && (int) $row['amount_minor'] > $this->transactions->refundedForCharge( $order_id, (int) $row['id'] ) ) {
				$result[] = $row;
			}
		}
		return $result;
	}

	/**
	 * Administrative action limits, derived from the same facts as mutation guards.
	 *
	 * @param array<string,mixed> $order Order row.
	 * @return array<string,mixed>
	 */
	public function adminPaymentModel( array $order ): array {
		$order_id       = (int) $order['id'];
		$busy           = null !== $this->transactions->pendingBalance( $order_id );
		$refund_pending = $this->transactions->hasPendingRefund( $order_id );
		$charges        = array();
		foreach ( $this->refundableCharges( $order_id ) as $row ) {
			$charges[] = array(
				'transaction_id'   => (int) $row['id'],
				'gateway'          => (string) $row['gateway'],
				'refundable_minor' => (int) $row['amount_minor'] - $this->transactions->refundedForCharge( $order_id, (int) $row['id'] ),
				'currency'         => (string) $row['currency'],
				'available'        => ! $busy && ! $refund_pending && PaymentRegistry::isActive( (string) $row['gateway'] ) && ( TransactionRepository::KIND_BALANCE !== $row['kind'] || $this->balanceConfigurationMatches( $row ) ),
			);
		}
		$onsite           = $this->transactions->succeededOnsite( $order_id );
		$onsite_remaining = null === $onsite ? 0 : max( 0, (int) $onsite['amount_minor'] - $this->transactions->refundedForCharge( $order_id, (int) $onsite['id'] ) );
		return array(
			'refundable_charges'         => $charges,
			'onsite_refundable_minor'    => $onsite_remaining,
			'can_record_onsite_refund'   => $onsite_remaining > 0 && ! $busy && ! $refund_pending,
			'balance_pending'            => $busy,
			'can_record_onsite_balance'  => ! $busy && ! $refund_pending && null === $onsite && OrderAmounts::isDeposit( $order ) && 'partial' === $order['payment_status'] && OrderAmounts::balanceDue( $order, $this->transactions->ledgerTotals( $order_id ) ) > 0,
			'can_reverse_onsite_balance' => ! $busy && null !== $onsite && ! $this->transactions->hasRefundAfter( $order_id, (int) $onsite['id'] ),
		);
	}

	/**
	 * Currency-specific browser configuration; no module secret may enter this shape.
	 *
	 * @param list<string> $methods Gateway codes.
	 * @param string       $currency Stored order currency.
	 * @return list<array<string,mixed>>
	 */
	private function balanceGateways( array $methods, string $currency ): array {
		$gateways = array();
		foreach ( $methods as $code ) {
			$client = PaymentRegistry::clientConfig( $code, $currency );
			if ( array() !== $client ) {
				$gateways[] = array(
					'code'   => $code,
					'label'  => ( 'payments_stripe' === $code ? __( 'Credit / debit card', 'aponto' ) : ( 'payments_paypal' === $code ? __( 'PayPal', 'aponto' ) : __( 'Online payment', 'aponto' ) ) ),
					'client' => $client,
				);
			}
		}
		return $gateways;
	}
	/**
	 * Bind recovery to the original public account/environment configuration, never its secrets.
	 *
	 * @param string $gateway Gateway.
	 * @param string $currency Stored order currency.
	 */
	private function balanceConfigurationHash( string $gateway, string $currency ): string {
		$config = PaymentRegistry::clientConfig( $gateway, $currency );
		ksort( $config );
		return hash( 'sha256', (string) wp_json_encode( $config ) );
	}

	/**
	 * Refuse cross-account recovery and money operations after gateway settings change.
	 *
	 * @param array<string,mixed> $attempt Durable attempt.
	 */
	private function balanceConfigurationMatches( array $attempt ): bool {
		$bound = TransactionRepository::durableMeta( $attempt, 'configuration_hash' );
		return '' !== $bound && hash_equals( $bound, $this->balanceConfigurationHash( (string) $attempt['gateway'], (string) $attempt['currency'] ) );
	}
}

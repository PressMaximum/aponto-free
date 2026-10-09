<?php
/** Payment context separate from appointment attendance.
 *
 * @package Aponto
 */

declare(strict_types=1);
namespace Aponto\Payments;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/** Derived context only; never records or infers a receipt. */
final class PaymentState {

	/**
	 * Every reason a gateway may answer through `aponto_payment_state_{key}` for a pending
	 * payment (extension-surface §5b). Anything else is ignored and core's own answer stands.
	 *
	 * @var list<string>
	 */
	public const REASONS = array( 'checkout_pending', 'verifying_payment', 'awaiting_offline_payment', 'awaiting_payment', 'cash_on_delivery', 'completed_unpaid' );

	/**
	 * A customer-safe "how to pay" URL for an order awaiting an offline payment, or '' (additive,
	 * persona QA 2026-10-05).
	 *
	 * Read from the gateway's display record of its external order — the neutral seam
	 * `aponto_payment_external_order_{key}`, optional key `instructions_url` — and accepted only
	 * when it is an http(s) URL on this site's own host with no credentials: it is printed on the
	 * public manage page, so a driver cannot point a customer anywhere else. Read-only; a callback
	 * that throws answers ''.
	 *
	 * @param array<string,mixed> $order Order row.
	 */
	public static function instructionsUrl( array $order ): string {
		$gateway = (string) ( $order['gateway'] ?? '' );
		if ( ! PaymentRegistry::isPaymentModule( $gateway ) ) {
			return '';
		}
		try {
			// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound -- Registry-validated gateway.
			$record = apply_filters( 'aponto_payment_external_order_' . $gateway, null, $order );
		} catch ( \Throwable $unreadable ) {
			unset( $unreadable );

			return '';
		}
		$raw = is_array( $record ) && is_string( $record['instructions_url'] ?? null ) ? $record['instructions_url'] : '';
		if ( '' === $raw ) {
			return '';
		}
		$url   = esc_url_raw( $raw, array( 'http', 'https' ) );
		$parts = wp_parse_url( $url );
		$home  = wp_parse_url( home_url() );
		if ( ! is_array( $parts ) || ! is_array( $home ) || isset( $parts['user'] ) || isset( $parts['pass'] )
			|| empty( $parts['host'] ) || strtolower( (string) $parts['host'] ) !== strtolower( (string) ( $home['host'] ?? '' ) ) ) {
			return '';
		}

		return $url;
	}

	/**
	 * Whether the checkout deadline still governs the appointment.
	 *
	 * @param array<string,mixed> $order Order row.
	 * @param string              $status Booking status.
	 */
	public static function deadlineApplies( array $order, string $status ): bool {
		return 'pending' === $status && 'pending' === ( $order['payment_status'] ?? '' ) && ! empty( $order['hold_expires_at'] );
	}

	/**
	 * Read payment presentation without changing accounting.
	 *
	 * @param array<string,mixed> $order Order row.
	 * @param string              $status Booking status.
	 * @param bool                $capturing Whether a charge outcome is unresolved.
	 * @return array{payment_state_reason:string,hold_deadline_applies:bool}
	 */
	public static function describe( array $order, string $status, bool $capturing = false ): array {
		$payment = (string) ( $order['payment_status'] ?? 'none' );
		$applies = self::deadlineApplies( $order, $status );
		$reason  = $payment;
		if ( 'pending' === $payment ) {
			$reason = 'completed' === $status ? 'completed_unpaid' : ( $applies ? 'checkout_pending' : 'awaiting_payment' );
			if ( $applies && $capturing ) {
				$reason = 'verifying_payment';
			}
			$gateway = (string) ( $order['gateway'] ?? '' );
			if ( PaymentRegistry::isPaymentModule( $gateway ) ) {
				// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound -- Registry-validated gateway.
				$derived = apply_filters( 'aponto_payment_state_' . $gateway, $reason, $order, $status );
				// `awaiting_offline_payment` (additive, persona QA 2026-10-05): the order is placed
				// and the CUSTOMER still has to pay it outside this site (a bank transfer, a cheque).
				// Like `verifying_payment` it suspends the checkout deadline — the order no longer
				// expires by itself — but it is the opposite message for the customer: money is due.
				if ( in_array( $derived, self::REASONS, true ) ) {
					$reason = $derived;
				}
			}
		}
		return array(
			'payment_state_reason'  => $reason,
			'hold_deadline_applies' => $applies && 'checkout_pending' === $reason,
		);
	}

	/**
	 * Which rule governs the CUSTOMER's own online cancellation of a booking whose payment is
	 * pending (persona QA 2026-10-05, re-test N2 / N7). One table for the public booking DTO
	 * (`can_cancel`) and the cancel route, so the manage page offers "Cancel booking" exactly when
	 * the route — and the gateway's void behind it — will accept it.
	 *
	 * - `refused` — `verifying_payment`, `awaiting_offline_payment`: money may be on its way (a
	 *   capture being verified, a bank transfer in transit). The hold is released only against the
	 *   gateway's evidence, so nothing is offered online.
	 * - `policy`  — `cash_on_delivery`: a placed order paid at the appointment. Nothing can be in
	 *   transit, and it is an appointment like any other: the business's cancellation policy
	 *   (`min_cancel_hours`) decides, not the "an unpaid hold may always cancel" rule (D-R38k).
	 *   A gateway that answers it asserts that no capture can be in flight: the customer's cancel
	 *   then asks its `void` even while a capture claim is live
	 *   ({@see PaymentService::releaseHoldForCancel()}).
	 * - `hold`    — everything else, exactly as before: a live unpaid hold cancels whatever the
	 *   deadline says (D-R38k), anything else follows the policy.
	 *
	 * @param string $reason `payment_state_reason` of {@see self::describe()}, or '' when the
	 *                       order's payment is not pending.
	 * @return string `refused`, `policy` or `hold`.
	 */
	public static function customerCancelRule( string $reason ): string {
		if ( in_array( $reason, array( 'verifying_payment', 'awaiting_offline_payment' ), true ) ) {
			return 'refused';
		}

		return 'cash_on_delivery' === $reason ? 'policy' : 'hold';
	}

	/**
	 * Whether the unpaid order's total is the amount the customer will actually be charged
	 * (persona QA 2026-10-05, T-024).
	 *
	 * True for every gateway that charges core's own total. A gateway whose checkout prices the
	 * order itself (tax, fees) answers false through `aponto_payment_amount_final_{key}` until it
	 * has written its quote back, and the payment reminder then quotes no amount. Read-only:
	 * a callback must not write data or call a remote gateway, and an answer that is not a boolean
	 * (or that throws) is "final" — the behaviour before this question existed.
	 *
	 * @param array<string,mixed> $order Order row.
	 */
	public static function amountIsFinal( array $order ): bool {
		$gateway = (string) ( $order['gateway'] ?? '' );
		if ( 'pending' !== (string) ( $order['payment_status'] ?? 'none' ) || ! PaymentRegistry::isPaymentModule( $gateway ) ) {
			return true;
		}
		try {
			// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound -- Registry-validated gateway.
			$answer = apply_filters( 'aponto_payment_amount_final_' . $gateway, true, $order );
		} catch ( \Throwable $unreadable ) {
			unset( $unreadable );

			return true;
		}

		return false !== $answer;
	}
}

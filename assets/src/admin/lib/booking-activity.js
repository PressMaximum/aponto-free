/**
 * Booking activity trail presentation — the labels, the actor and the reasons the inspector shows
 * for `GET /bookings/{id}` `activities[]` (first-run QA D08).
 *
 * The trail used to print raw enum strings (`status_changed`, `public`), and a customer's
 * cancellation reason — stored in the activity `meta` — was visible nowhere in the admin. Every
 * key the backend writes is pinned to a label by `tests/js/booking-activity.test.js`, which scans
 * `src/` for the keys handed to `ActivityRepository::log()`.
 *
 * Pure: no React, no REST.
 */
import { __ } from '@wordpress/i18n';

import { gatewayLabel } from './payment-status.js';

/**
 * Activity-trail labels. The payment actions (D-R38) are logged by `PaymentService`, mostly with
 * `initiated_by = gateway:{code}` or `system`, so without a label here the trail rendered raw enum
 * strings on exactly the rows an operator reads when money is in question.
 *
 * `payment_received_after_expiry` keeps its own wording on purpose: money that landed after the
 * hold lapsed is RECORDED, never allowed to resurrect the appointment (D-R38h), and the trail is
 * the only place that distinction is visible.
 *
 * `confirmed` … `no_show` are not written as actions today (a status move is `status_changed`
 * with `meta.to`); they stay so an older trail still reads.
 */
export const ACTIVITY_LABELS = {
	created: __( 'Booking created', 'aponto' ),
	status_changed: __( 'Status changed', 'aponto' ),
	confirmed: __( 'Confirmed', 'aponto' ),
	cancelled: __( 'Cancelled', 'aponto' ),
	completed: __( 'Completed', 'aponto' ),
	rescheduled: __( 'Rescheduled', 'aponto' ),
	no_show: __( 'Marked as no-show', 'aponto' ),
	deleted: __( 'Booking deleted', 'aponto' ),
	payment_received: __( 'Payment received', 'aponto' ),
	payment_received_after_expiry: __( 'Payment received after the hold expired', 'aponto' ),
	payment_status_changed: __( 'Payment status changed', 'aponto' ),
	// Deposits and remaining balance (D-R71).
	balance_recorded_onsite: __( 'Balance recorded on site', 'aponto' ),
	balance_refunded_onsite: __( 'On-site refund recorded', 'aponto' ),
	balance_paid_online: __( 'Balance paid online', 'aponto' ),
	balance_record_reversed: __( 'Balance record reversed', 'aponto' ),
	deposit_bypassed: __( 'Deposit bypassed', 'aponto' ),
	coupon_changed: __( 'Coupon changed', 'aponto' ),
	payment_hold_expired: __( 'Payment hold expired', 'aponto' ),
	hold_released: __( 'Payment hold released', 'aponto' ),
	hold_released_admin_confirmed: __( 'Payment hold released — confirmed by an admin', 'aponto' ),
	refund: __( 'Refunded', 'aponto' ),
	// An administrator reviewed an unfinished refund at the external checkout and allowed refunds again.
	refund_review_cleared: __( 'Refund review cleared', 'aponto' ),
	// QA run 2 BUG-3: a gateway that refused this order's amount or currency outright. Readiness
	// cannot warn about it — it is asked without an order — so the booking's own trail is where the
	// operator finds out that, say, PayPal has no minor unit for HUF and the price needs rounding.
	payment_refused: __( 'Gateway refused this amount', 'aponto' ),
	// External checkout (D-R71): the gateway's own checkout collected the customer, settled the
	// final total, or decided nothing was owed. Logged by `PaymentService` as `gateway:{code}`.
	checkout_customer_attached: __( 'Customer details received from checkout', 'aponto' ),
	payment_quote_finalized: __( 'Checkout total confirmed', 'aponto' ),
	payment_not_required: __( 'No payment required', 'aponto' ),
	notification_deferred_payment: __( 'Confirmation email waits for payment', 'aponto' ),
	notification_suppressed: __( 'Email not sent', 'aponto' ),
	notification_suppressed_flood: __( 'Email not sent — too many in a short time', 'aponto' ),
};

/** What a `status_changed` row reads as, keyed by the status it moved TO. */
const STATUS_CHANGE_LABELS = {
	pending: __( 'Set to pending', 'aponto' ),
	confirmed: __( 'Confirmed', 'aponto' ),
	completed: __( 'Completed', 'aponto' ),
	cancelled: __( 'Cancelled', 'aponto' ),
	no_show: __( 'Marked as no-show', 'aponto' ),
};

/**
 * The trail label for one activity.
 *
 * @param {{action: string, meta?: Object}} activity Adapted activity row.
 * @return {string} Label.
 */
export function activityLabel( activity ) {
	const { action, meta = {} } = activity || {};
	if ( 'status_changed' === action ) {
		// A cancelled booking put back is a RESTORE (the editor offers it as "Pending (restore)").
		if ( 'pending' === meta.to && 'cancelled' === meta.from ) {
			return __( 'Restored to pending', 'aponto' );
		}
		return STATUS_CHANGE_LABELS[ meta.to ] || ACTIVITY_LABELS.status_changed;
	}
	if ( ACTIVITY_LABELS[ action ] ) {
		return ACTIVITY_LABELS[ action ];
	}
	// A key this build does not know yet (a newer module): readable, not an enum.
	const words = String( action || '' ).replace( /_/g, ' ' ).trim();

	return words ? words.charAt( 0 ).toUpperCase() + words.slice( 1 ) : '';
}

/**
 * Who did it, from the `initiated_by` descriptor (`public`, `customer`, `system`, `admin`,
 * `admin:{user_id}`, `gateway:{code}`).
 *
 * @param {string} initiatedBy Raw descriptor.
 * @return {string} Display text, '' for none.
 */
export function activityActor( initiatedBy ) {
	const raw = String( initiatedBy || '' );
	if ( '' === raw ) {
		return '';
	}
	const [ kind, detail = '' ] = raw.split( ':' );
	switch ( kind ) {
		case 'public':
			return __( 'Booking form', 'aponto' );
		case 'customer':
			return __( 'Customer', 'aponto' );
		case 'system':
			return __( 'System', 'aponto' );
		case 'admin':
			return __( 'Admin', 'aponto' );
		case 'gateway': {
			const named = gatewayLabel( detail ) !== '—' ? gatewayLabel( detail ) : gatewayLabel( `payments_${ detail }` );

			return '—' !== named ? named : detail;
		}
		default:
			return raw;
	}
}

/**
 * The free-text reason recorded with an activity (a status change's `meta.reason`), trimmed.
 *
 * @param {{meta?: Object}} activity Adapted activity row.
 * @return {string} Reason, or ''.
 */
export function activityReason( activity ) {
	const reason = activity?.meta?.reason;

	return 'string' === typeof reason ? reason.trim() : '';
}

/**
 * The reason given with the LATEST move to `cancelled`, or '' — a restored-then-cancelled booking
 * shows the reason for the cancellation that is in force.
 *
 * @param {Array<Object>} activities Adapted activity rows, oldest first.
 * @return {string} Reason, or ''.
 */
export function cancellationReason( activities ) {
	const rows = Array.isArray( activities ) ? activities : [];
	for ( let i = rows.length - 1; i >= 0; i-- ) {
		const row = rows[ i ];
		if ( 'status_changed' === row?.action && 'cancelled' === row.meta?.to ) {
			return activityReason( row );
		}
	}

	return '';
}

/**
 * Payment presentation for the admin — one source for the badge, the gateway name and the money
 * parsing the refund dialog needs (D-R38 / D-R39).
 *
 * Shared because the SAME five states appear on three surfaces (the bookings table's optional
 * column, its filter facet, and the booking editor's Order section), and a table that called a
 * partially-refunded order "Paid" while the editor called it "Partly refunded" would be two
 * different answers to "did this customer get their money back".
 *
 * Pure: no React, no REST, no `config` import beyond the currency helpers. That is what lets the
 * rules below be tested directly, and the money parsing is worth testing — it is the step between
 * a human typing "12.50" and an integer number of cents being sent to a gateway.
 */
import { __, sprintf } from '@wordpress/i18n';

import { authoritativeDecimals } from './format.js';
import { isCheckoutHold, needsRefundReview } from '../bookings/dashboard-stats.js';

/** The order `payment_status` enum, in the server's own order (`BookingsController::index` args). */
export const PAYMENT_STATUSES = [ 'none', 'pending', 'paid', 'partial', 'refunded' ];

/** Derived reasons distinguish deposit balances from refunded full payments (D-R71). */
export const PAYMENT_REASONS = [ 'none', 'pending', 'paid', 'deposit_paid', 'deposit_partially_refunded', 'partially_refunded', 'refunded' ];

/**
 * Badge copy + tone for an order's payment status.
 *
 * TONES, and why each is what it is:
 *   - `none` is NEUTRAL, not a warning. Most sites take no online payment at all, and painting
 *     every one of their bookings amber would make the normal state look broken.
 *   - `pending` is AMBER. Only an unfinished, eligible checkout carries a deadline;
 *     accepted appointments and uncertain payments retain their own contextual labels.
 *   - `partial` is amber for the same reason a half-finished refund is not a finished one.
 *   - `refunded` is neutral: the money is settled, just in the other direction. Green would
 *     celebrate it and red would read as a failure; it is neither.
 *
 * @param {string}   status    Order payment status.
 * @param {Object}   [options] Presentation options.
 * @param {string}   [options.holdExpiresAt] UTC instant the hold lapses, for the pending deadline.
 * @param {Function} [options.formatTime]    `( utc ) => string` in business time.
 * @param {boolean}  [options.holdDeadlineApplies] Whether the deadline currently governs checkout.
 * @param {string}   [options.paymentStateReason] Server-derived payment context.
 * @return {{tone: string, label: string, title: string}} Badge descriptor.
 */
export function paymentBadge( status, { holdExpiresAt = '', formatTime = null, holdDeadlineApplies = false, paymentStateReason = '' } = {} ) {
	switch ( status ) {
		case 'pending':
			if ( paymentStateReason === 'completed_unpaid' ) {
				return { tone: 'pending', label: __( 'Unpaid · Appointment completed', 'aponto' ), title: __( 'The appointment is completed, but payment has not been recorded.', 'aponto' ) };
			}
			if ( paymentStateReason === 'cash_on_delivery' ) {
				// The title names no booking status (re-test N2): this reason also reaches a PENDING
				// booking, and "The appointment is confirmed" was untrue there.
				return { tone: 'pending', label: __( 'Awaiting payment · Cash on delivery', 'aponto' ), title: __( 'The customer pays at the appointment. Payment has not been recorded.', 'aponto' ) };
			}
			if ( paymentStateReason === 'awaiting_offline_payment' ) {
				// Placed, and the CUSTOMER still has to pay outside the site (a bank transfer, a
				// cheque) — not something being verified (re-test N7).
				return { tone: 'pending', label: __( 'Awaiting offline payment', 'aponto' ), title: __( 'The order is placed and the customer still has to pay it outside this site, for example by bank transfer or cheque. The checkout deadline alone cannot release this slot.', 'aponto' ) };
			}
			if ( paymentStateReason === 'verifying_payment' ) {
				// "Verifying payment" read as if something automatic were running (persona QA
				// 2026-10-05, T-047): for a bank transfer on hold nothing is — somebody has to
				// confirm the money arrived.
				return { tone: 'pending', label: __( 'Awaiting payment confirmation', 'aponto' ), title: __( 'The order is placed and its payment has not been confirmed yet. The checkout deadline alone cannot release this slot.', 'aponto' ) };
			}
			return {
				tone: 'pending',
				label:
					holdDeadlineApplies && holdExpiresAt && formatTime
						? sprintf(
								/* translators: %s: local time the payment hold expires, e.g. "3:48 PM". */
								__( 'Hold until %s', 'aponto' ),
								formatTime( holdExpiresAt )
						  )
						: __( 'Awaiting payment', 'aponto' ),
				title: holdDeadlineApplies
					? __( 'The slot is held while the customer pays. Expiry requires verified nonpayment.', 'aponto' )
					: __( 'Payment has not been recorded. The checkout hold deadline does not apply.', 'aponto' ),
			};
		case 'paid':
			return { tone: 'paid', label: __( 'Paid', 'aponto' ), title: __( 'Paid in full.', 'aponto' ) };
		case 'deposit_paid':
			return { tone: 'partial', label: __( 'Deposit paid', 'aponto' ), title: __( 'The balance is due on site.', 'aponto' ) };
		case 'deposit_partially_refunded':
			return { tone: 'partial', label: __( 'Deposit partly refunded', 'aponto' ), title: __( 'Some or all of the deposit has been refunded; a balance remains.', 'aponto' ) };
		case 'partially_refunded':
		case 'partial':
			return {
				tone: 'partial',
				label: __( 'Partly refunded', 'aponto' ),
				title: __( 'Part of this payment has been refunded.', 'aponto' ),
			};
		case 'refunded':
			return {
				tone: 'refunded',
				label: __( 'Refunded', 'aponto' ),
				title: __( 'The full amount has been refunded.', 'aponto' ),
			};
		default:
			return {
				tone: 'none',
				label: __( 'Not paid', 'aponto' ),
				title: __( 'No online payment was taken for this booking.', 'aponto' ),
			};
	}
}

/** The cue a cancelled-but-still-paid booking carries wherever it is shown (T-056, D-R71k). */
export const REFUND_REVIEW_LABEL = __( 'Paid — review refund', 'aponto' );

/**
 * The payment badge of one BOOKINGS-LIST row (persona QA 2026-10-05, T-048 / T-056).
 *
 * The list item carries only `order.payment_status`, so two different situations used to read the
 * same "Awaiting payment": a checkout the customer has not finished (a slot hold with no customer
 * on it yet) and an order waiting for its payment to be confirmed. And a cancelled booking whose
 * order is still paid read plainly "Paid", with nothing to say a refund is waiting.
 *
 * @param {Object} row Adapted booking row.
 * @return {{tone: string, label: string, title: string}} Badge descriptor.
 */
export function listPaymentBadge( row ) {
	if ( isCheckoutHold( row ) ) {
		return { tone: 'pending', label: __( 'Checkout not finished', 'aponto' ), title: __( 'The slot is held while the customer pays. It is released automatically if they do not.', 'aponto' ) };
	}
	if ( needsRefundReview( row ) ) {
		return { tone: 'pending', label: REFUND_REVIEW_LABEL, title: __( 'This booking was cancelled but its payment was not refunded. Cancelling never refunds automatically.', 'aponto' ) };
	}

	return paymentBadge( row?.paymentReason || row?.paymentStatus );
}

/** Facet/filter option labels — the badge words, so the facet and the badge cannot disagree. */
export const PAYMENT_FILTER_OPTIONS = PAYMENT_REASONS.map( ( value ) => ( {
	value,
	label: paymentBadge( value ).label,
} ) );

/**
 * Human name for a gateway module code.
 *
 * Falls back to an em dash rather than the raw code: `payments_paypal` on screen is a leak of an
 * internal identifier, and an order with no gateway (a manual "mark as paid", or a site that takes
 * no online payment) genuinely has no name to show.
 *
 * @param {string} gateway Registry module code.
 * @return {string} Display name.
 */
export function gatewayLabel( gateway ) {
	// Brand names, deliberately NOT translated: "Stripe" and "PayPal" are the words printed on the
	// dashboards the operator will open next.
	const names = {
		payments_stripe: 'Stripe',
		payments_paypal: 'PayPal',
		payments_woocommerce: 'WooCommerce',
	};

	return names[ gateway ] || '—';
}

/** Transaction row labels — `kind` and `status` are both server enums. */
export const TRANSACTION_KIND_LABELS = {
	balance: __( 'Balance payment', 'aponto' ), onsite_refund: __( 'On-site refund', 'aponto' ),
	onsite: __( 'On-site balance', 'aponto' ), charge: __( 'Payment', 'aponto' ), refund: __( 'Refund', 'aponto' ) };
export const TRANSACTION_STATUS_LABELS = {
	reversed: __( 'Reversed', 'aponto' ),
	pending: __( 'Pending', 'aponto' ),
	succeeded: __( 'Succeeded', 'aponto' ),
	failed: __( 'Failed', 'aponto' ),
	// `voiding` is the durable claim a hold release writes before it calls the gateway
	// (D-R38a(2)); it is short-lived but it CAN be on screen, and an unlabelled status would
	// render as a raw enum.
	voiding: __( 'Cancelling', 'aponto' ),
	// `capturing` is the claim a charge carries while its payment is being taken (D-R40c). For a
	// checkout platform it lasts until the platform's order is paid, so it is routinely on screen.
	// "Awaiting confirmation", not "Processing" (T-047): nothing is being processed while a bank
	// transfer is on hold — the row waits for the payment to be confirmed.
	capturing: __( 'Awaiting confirmation', 'aponto' ),
	cancelled: __( 'Cancelled', 'aponto' ),
};

/**
 * The reference worth showing for one ledger row (QA run 2 BUG-5).
 *
 * A CHARGE is best identified by what the gateway calls the payment; a REFUND by the refund's own
 * id, which since D-R40d lives in `gateway_ref` (rest-contract §2.21). Falling back the other way
 * keeps rows written before that change readable, where the refund id sat in `payment_ref`.
 *
 * A charge that has no payment reference yet falls back to `gateway_ref` — except on an order
 * settled through an external checkout platform. There `gateway_ref` is Aponto's own internal
 * checkout reference (a 64-character hash nobody can look up anywhere), and the order is already
 * identified by the "External order" row above the ledger, so the cell stays empty.
 *
 * The same holds BEFORE that order exists (a held booking whose customer has not placed the
 * external order yet): the only reference is still the internal one. It is recognised by its
 * shape — 64 lowercase hex characters, which no payment provider uses for an id a person looks
 * up — and the cell stays empty rather than printing a truncated hash (F18).
 *
 * @param {Object}  t                Transaction DTO (adapter shape).
 * @param {boolean} hasExternalOrder Whether the order carries an external order record.
 * @return {string} Reference to display.
 */
export function transactionRef( t, hasExternalOrder = false ) {
	if ( t.kind === 'refund' ) {
		return t.gatewayRef || t.paymentRef || '';
	}
	const internal = hasExternalOrder || /^[a-f0-9]{64}$/.test( t.gatewayRef || '' );

	return t.paymentRef || ( internal ? '' : t.gatewayRef || '' );
}

/**
 * A gateway reference, shortened for a table cell.
 *
 * The full reference stays in the `title` (and is what the operator copies into the gateway's own
 * dashboard) — `PaymentsController::transactionDto()` deliberately exposes it whole. This only
 * decides how much of it fits on one line.
 *
 * @param {string} ref Gateway reference.
 * @param {number} [head] Leading characters to keep.
 * @return {string} Shortened reference.
 */
export function shortRef( ref, head = 12 ) {
	const value = String( ref || '' );

	return value.length > head + 4 ? `${ value.slice( 0, head ) }…${ value.slice( -4 ) }` : value;
}

/**
 * Parse a major-unit amount typed by a human into integer minor units.
 *
 * Distinct from `format.js`'s `majorToMinor()`, which is a `Number()` cast for a number input and
 * answers `null` only for blank. This one is the REFUND gate, so it refuses everything it cannot
 * defend: a negative, a zero, a non-number, and — the one that matters — a value with MORE decimal
 * places than the currency has. "12.505" in a 2-decimal currency is not a refund of 12.51; it is a
 * number the operator did not mean, and rounding it silently moves somebody's money.
 *
 * The exponent comes from `authoritativeDecimals()` — the ORDER's own exponent as the server
 * scaled it, or the store's when the currency is the store's. **Never `Intl`** (2026-09-05): this
 * is money-moving input, and `Intl` reports CLDR display conventions that disagree with our storage
 * by 100× on MGA and 1000× on IQD. With nothing authoritative available the answer is `null` — the
 * dialog refuses the entry rather than guessing a scale for a transfer.
 *
 * A zero-decimal currency (JPY, VND) therefore refuses any fractional entry at all, which is the
 * same rule the server applies through `Settings::currencyExponent()`.
 *
 * @param {string|number} typed    Value as typed.
 * @param {string}        currency ISO currency code.
 * @param {number|null}   exponent The order's `currency_exponent`, when the DTO carried one.
 * @return {number|null} Minor units, or null when the value is unusable.
 */
export function parseRefundAmount( typed, currency, exponent = null ) {
	const raw = String( typed === null || typed === undefined ? '' : typed ).trim();
	if ( '' === raw || ! /^\d+(\.\d+)?$/.test( raw ) ) {
		return null;
	}

	const decimals = authoritativeDecimals( currency, exponent );
	if ( null === decimals ) {
		return null;
	}
	const dot = raw.indexOf( '.' );
	if ( dot >= 0 && raw.length - dot - 1 > decimals ) {
		return null;
	}

	// Scale by string, not by `value * 10 ** decimals`: binary floating point turns 12.35 * 100
	// into 1234.9999999999998, and `Math.round` hides that until the day it does not.
	const [ whole, fraction = '' ] = raw.split( '.' );
	const minor = Number( `${ whole }${ fraction.padEnd( decimals, '0' ) }` );

	return Number.isSafeInteger( minor ) && minor > 0 ? minor : null;
}

/**
 * Validate a refund amount against what is still refundable.
 *
 * Returns the reason a value is unusable, or '' when it is fine — the caller renders it inline and
 * keeps the confirm button disabled. The server re-checks all of it under the per-order lock
 * (D-R38a(2)); this only exists so the operator is told before the round trip.
 *
 * @param {string|number} typed      Value as typed.
 * @param {number}        refundable Refundable minor units.
 * @param {string}        currency   ISO currency code.
 * @param {number|null}   exponent   The order's `currency_exponent`, when the DTO carried one.
 * @return {string} Error message, or ''.
 */
export function refundAmountError( typed, refundable, currency, exponent = null ) {
	const known = authoritativeDecimals( currency, exponent );
	if ( null === known ) {
		// No trustworthy scale for this currency, so no refund is offered here at all. Saying so is
		// the honest failure: the alternative is an input that silently moves 100× the intended
		// amount on the two currencies where CLDR and ISO-4217 disagree.
		return __( 'This order’s currency cannot be refunded from here. Refund it in your payment provider’s dashboard.', 'aponto' );
	}

	const minor = parseRefundAmount( typed, currency, exponent );
	if ( null === minor ) {
		const decimals = known;

		return decimals > 0
			? sprintf(
					/* translators: %d: number of decimal places the store currency allows. */
					__( 'Enter an amount greater than zero, with at most %d decimal places.', 'aponto' ),
					decimals
			  )
			: __( 'Enter a whole amount greater than zero.', 'aponto' );
	}
	if ( minor > refundable ) {
		return __( 'That is more than is left to refund.', 'aponto' );
	}

	return '';
}

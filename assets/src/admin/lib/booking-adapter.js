/**
 * Domain adapter — maps the REST booking DTOs (rest-contract §2.8/§2.9) onto the
 * row/editor shapes the reused BookingsTable + in-flow editor consume. Keeping
 * this seam isolated is what makes the later PMDKDataTable swap cheap (Q13): the
 * column defs / renderers / data layer stay product-owned here.
 */
import { config } from './config.js';
import { timeLabel, dateLabel, isoDate, tzLabel } from './format.js';
import { displayNameOf, initialsOf } from '../../shared/person-name.js';

const TZ = config.business.timezone;

/**
 * The D-R71 badge/facet reason of an order: `pending` for every pending payment (its finer
 * gateway reason travels separately as `paymentStateReason`), the ledger reason otherwise.
 *
 * @param {Object} order Order block of a list item or detail DTO.
 * @return {string} One of `PAYMENT_REASONS`, or a stored status.
 */
function paymentReasonOf( order ) {
	if ( order.payment_status === 'pending' ) {
		return 'pending';
	}
	return order.payment_state_reason || order.payment_status || 'none';
}

/** GET /bookings item → BookingsTable row. */
export function bookingRowFromListItem( item ) {
	const start = item.start_utc;
	const end = item.end_utc;
	const customer = item.customer || {};
	const service = item.service || {};
	const staff = item.staff || {};
	const order = item.order || {};
	const customerTz = item.customer_timezone || '';

	return {
		id: item.id,
		order: `AP #${ item.id }`,
		status: item.status,
		startUtc: start,
		endUtc: end,
		date: isoDate( start, TZ ),
		dateLabel: dateLabel( start, TZ ),
		start: timeLabel( start, TZ ),
		end: timeLabel( end, TZ ),
		// `name` is the server-composed display name (name split, 2026-10-01); the parts ride along
		// for the surfaces that edit or search them.
		customer: displayNameOf( customer ),
		customerFirstName: customer.first_name || '',
		customerLastName: customer.last_name || '',
		email: customer.email || '',
		phone: customer.phone || '',
		customerId: customer.id || null,
		service: service.name || '',
		serviceId: service.id || null,
		staff: displayNameOf( staff ),
		staffFirstName: staff.first_name || '',
		staffLastName: staff.last_name || '',
		staffId: staff.id || null,
		location: item.location?.name || '',
		// D-R63: the list item's `location_id` (rest-contract §2.8 addendum); the NAME is resolved by
		// the route from the location catalog, because the payload carries only the id.
		locationId: Number( item.location_id ) || 0,
		status_total_minor: order.total_minor || 0,
		total: order.total_minor || 0,
		currency: order.currency || config.currency,
		// The exponent the SERVER used to scale `total_minor` for THIS order (2026-09-05). An order
		// keeps the currency it was priced in, so a store that has since switched has rows the store
		// exponent would misread by 100×. `null` for a DTO that predates the field.
		currencyExponent: Number.isInteger( order.currency_exponent ) ? order.currency_exponent : null,
		paid: order.payment_status === 'paid',
		paymentStatus: order.payment_status || 'none',
		// One server field, two readings: a PENDING payment carries the derived gateway reason
		// (`checkout_pending`, `cash_on_delivery`, …), any other order the D-R71 ledger reason
		// (`deposit_paid`, …). The badge/facet value keeps `pending` for the former.
		paymentReason: paymentReasonOf( order ),
		payableNowMinor: order.payable_now_minor ?? order.total_minor ?? 0,
		netCollectedMinor: order.net_collected_minor ?? 0,
		balanceDueMinor: order.balance_due_minor ?? 0,
		// Additive list fields (persona QA 2026-10-05, rest-contract §2.8): the derived reason of a
		// PENDING payment (`checkout_pending` = the customer has not finished checkout), and the
		// mark of a cancelled booking that was only ever a checkout nobody placed.
		paymentStateReason: order.payment_status === 'pending' ? order.payment_state_reason || '' : '',
		checkoutAbandoned: item.checkout_abandoned === true,
		attendees: item.attendees || 1,
		customerTimezone: customerTz,
		timezone: tzLabel( customerTz, start ),
		initials: initialsOf( customer ) || '?',
		note: '',
		created: item.created_at || '',
		source: 'Admin',
	};
}

/** GET /bookings/{id} detail → editor view model (edit mode). */
export function bookingDetailToEditor( detail ) {
	const b = detail.booking || {};
	const order = detail.order || {};
	const activities = Array.isArray( detail.activities ) ? detail.activities : [];
	const items = Array.isArray( order.items ) ? order.items : [];

	return {
		id: b.id,
		status: b.status,
		startUtc: b.start_datetime_utc,
		endUtc: b.end_datetime_utc,
		date: isoDate( b.start_datetime_utc, TZ ),
		dateLabel: dateLabel( b.start_datetime_utc, TZ ),
		start: timeLabel( b.start_datetime_utc, TZ ),
		end: timeLabel( b.end_datetime_utc, TZ ),
		serviceId: b.service_id,
		staffId: b.staff_id,
		locationId: b.location_id,
		attendees: b.attendees || 1,
		customerId: b.customer_id,
		customerTimezone: b.customer_timezone || '',
		timezone: tzLabel( b.customer_timezone || '', b.start_datetime_utc ),
		customerNote: b.customer_note || '',
		// internal_note is stored in aponto_booking_meta (Q5). The detail DTO may
		// not expose it yet — see ripple note; fall back to empty until it does.
		internalNote: b.internal_note || detail.internal_note || '',
		// The customer's answers to the site's extra booking-form fields (D-R30).
		// Read-only here: they are what the customer told the business, and the
		// booking editor is not the place to rewrite that.
		customFields: Array.isArray( b.custom_fields ) ? b.custom_fields : [],
		billingAddress: typeof b.billing_address === 'string' ? b.billing_address : '',
		// When the customer ticked the consent box, or '' (persona QA 2026-10-05, T-046).
		consentAt: b.consent_at || '',
		icsSequence: b.ics_sequence || 0,
		order: orderFromDetail( order, items ),
		activities: activities.map( ( a ) => ( {
			id: a.id,
			action: a.action,
			meta: a.meta || {},
			initiatedBy: a.initiated_by || '',
			createdAt: a.created_at || '',
		} ) ),
	};
}

/**
 * The order block of `GET /bookings/{id}`, adapted (D-R38 additions).
 *
 * Everything below `items` is additive and reads through `??`/`||`: the same DTO is served by a
 * site that has never taken an online payment, where `transactions` is `[]`, `gateway` is `''` and
 * `hold_expires_at` may be absent entirely because the column predates the payment schema.
 *
 * @param {Object} order Order block from the detail DTO (may be null).
 * @param {Array}  items Order line items.
 * @return {Object} Editor order view model.
 */
/**
 * The one action a gateway may attach to its external order record, or null.
 *
 * Only a REST path under that same gateway's module is accepted, so the button can never be
 * pointed anywhere else whatever the response carried.
 *
 * @param {*}      action  `external_order.action` from the detail DTO.
 * @param {string} gateway The order's gateway module code.
 * @return {?{label: string, confirm: string, path: string}} Action, or null.
 */
export function externalAction( action, gateway ) {
	if ( ! action || typeof action.label !== 'string' || ! action.label || typeof action.path !== 'string' || ! gateway ) {
		return null;
	}
	const prefix = `/modules/${ gateway }/`;
	if ( ! action.path.startsWith( prefix ) || ! /^[a-z0-9_/-]{1,160}$/.test( action.path.slice( prefix.length ) ) || action.path.includes( '//' ) ) {
		return null;
	}
	return { label: action.label, confirm: typeof action.confirm === 'string' ? action.confirm : '', path: action.path };
}

function orderFromDetail( order, items ) {
	const transactions = ( Array.isArray( order.transactions ) ? order.transactions : [] ).map( ( t ) => ( {
		id: t.id,
		parentId: t.parent_id ?? null,
		kind: t.kind || '',
		status: t.status || '',
		amountMinor: t.amount_minor || 0,
		currency: t.currency || order.currency || config.currency,
		gateway: t.gateway || '',
		gatewayRef: t.gateway_ref || '',
		paymentRef: t.payment_ref || '',
		failureCode: t.failure_code || '',
		createdAt: t.created_at || '',
	} ) );

	return {
		id: order.id,
		code: order.code || '',
		// D-R67b: coupon editing needs all three immutable pricing figures. Nullish checks keep a
		// legitimate zero-total (100% coupon) instead of falling through to a pre-coupon amount.
		subtotalMinor: order.subtotal_minor ?? order.total_minor ?? 0,
		discountMinor: order.discount_minor ?? 0,
		totalMinor: order.total_minor ?? 0,
		couponCode: order.coupon_code || '',
		currency: order.currency || config.currency,
		// See the list row above: the order's OWN exponent, not the store's.
		currencyExponent: Number.isInteger( order.currency_exponent ) ? order.currency_exponent : null,
		paymentStatus: order.payment_status || 'none',
		paymentReason: paymentReasonOf( order ),
		payableNowMinor: order.payable_now_minor ?? order.total_minor ?? 0,
		netCollectedMinor: order.net_collected_minor ?? 0,
		balanceDueMinor: order.balance_due_minor ?? 0,
		gateway: order.gateway || '',
		transactionRef: order.transaction_ref || '',
		refundManagement: order.refund_management && typeof order.refund_management.url === 'string' && typeof order.refund_management.label === 'string'
			? { url: order.refund_management.url, label: order.refund_management.label }
			: null,
		// Display-only record of a checkout platform's own order (e.g. WooCommerce #34) and the
		// payment method the customer chose there. Never settlement input.
		externalOrder: order.external_order && typeof order.external_order.reference === 'string'
			? {
				reference: order.external_order.reference,
				status: typeof order.external_order.status === 'string' ? order.external_order.status : '',
				paymentMethod: typeof order.external_order.payment_method === 'string' ? order.external_order.payment_method : '',
				url: typeof order.external_order.url === 'string' ? order.external_order.url : '',
				...( order.external_order.freshness ? { freshness: order.external_order.freshness } : {} ),
				...( order.external_order.sync ? { sync: order.external_order.sync } : {} ),
				// Something about the external order needs the operator (server-computed words),
				// optionally with one action: a POST to a route of the order's own gateway module.
				...( typeof order.external_order.notice === 'string' && order.external_order.notice ? { notice: order.external_order.notice } : {} ),
				...( externalAction( order.external_order.action, order.gateway ) ? { action: externalAction( order.external_order.action, order.gateway ) } : {} ),
			}
			: null,
		holdExpiresAt: order.hold_expires_at || '',
		holdDeadlineApplies: order.hold_deadline_applies === true,
		paymentStateReason: order.payment_status === 'pending' ? order.payment_state_reason || '' : '',
		transactions,
		refundableMinor: Array.isArray( order.refundable_charges ) ? order.refundable_charges.reduce( ( total, charge ) => total + charge.refundable_minor, 0 ) : refundableMinor( transactions ),
		refundableCharges: order.refundable_charges ?? null,
		onsiteRefundableMinor: order.onsite_refundable_minor ?? 0,
		canRecordOnsiteRefund: order.can_record_onsite_refund === true,
		balancePending: order.balance_pending === true,
		canRecordOnsiteBalance: order.can_record_onsite_balance,
		canReverseOnsiteBalance: order.can_reverse_onsite_balance,
		// A refund the gateway has accepted but not settled RESERVES its amount server-side
		// (`TransactionRepository::refundedMinor`), and a second refund attempt while one is in
		// flight is answered `409 aponto_payment_state`. Surfacing it lets the button say why it is
		// unavailable instead of offering an action that cannot succeed.
		refundPending: transactions.some( ( t ) => 'refund' === t.kind && 'pending' === t.status ),
		items: items.map( ( line ) => ( {
			id: line.id,
			type: line.item_type,
			amountMinor: line.amount_minor || 0,
		} ) ),
	};
}

/**
 * How much of this order can still be refunded, in minor units.
 *
 * DERIVED here rather than read off the DTO: the detail response carries the transaction rows but
 * no refundable figure, and the alternative — asking the server for one — would be a second read of
 * data already on the page. The arithmetic MIRRORS `PaymentService::refund()` exactly, and the two
 * halves of that mirroring are both load-bearing:
 *
 *   - the base is the LATEST SUCCEEDED CHARGE (`ORDER BY id DESC LIMIT 1`), not the order total and
 *     not the sum of charges: an order can carry failed attempts, and a partially-captured amount
 *     is what the gateway will actually give back;
 *   - refunds count while `succeeded` OR `pending`, because an in-flight refund is money already
 *     promised away — counting only settled ones would offer to refund it twice.
 *
 * This is a DISPLAY figure. The server re-derives it under the per-order lock and refuses anything
 * that does not fit (D-R38a(2)), so a stale page can only ever be told no.
 *
 * @param {Array} transactions Adapted transaction rows.
 * @return {number} Refundable minor units (never negative).
 */
export function refundableMinor( transactions ) {
	const rows = Array.isArray( transactions ) ? transactions : [];
	const charges = rows.filter( ( t ) => 'charge' === t.kind && 'succeeded' === t.status );
	if ( ! charges.length ) {
		return 0;
	}
	const paid = charges.reduce( ( best, t ) => ( t.id > best.id ? t : best ), charges[ 0 ] ).amountMinor || 0;
	const refunded = rows
		.filter( ( t ) => 'refund' === t.kind && ( 'succeeded' === t.status || 'pending' === t.status ) )
		.reduce( ( sum, t ) => sum + ( t.amountMinor || 0 ), 0 );

	return Math.max( 0, paid - refunded );
}

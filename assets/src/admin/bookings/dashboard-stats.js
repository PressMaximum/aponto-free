/**
 * Pure Dashboard aggregates (persona QA 2026-10-05, T-037 / T-038 / T-056).
 *
 * Import-free on purpose: the Dashboard computes everything client-side from `GET /bookings`
 * (SPEC-P1 §1.0.1), and the rules below decide what an owner is told needs their attention — so
 * they are unit-tested directly in the framework-free node jest env.
 */

// Booked value counts only bookings that still represent money for today. `no_show` stays OUT,
// exactly like `cancelled` (SPEC-P1 §1.0.1 + D-R33) — the chair was empty either way.
const BLOCKING = new Set( [ 'pending', 'confirmed', 'completed' ] );

/**
 * Whether a row is an unfinished checkout rather than a booking request (T-038).
 *
 * A checkout that hands off to an external platform reserves the slot BEFORE the customer has
 * given their details: the booking is `pending`, its order is `pending` payment, and it has no
 * customer yet (`customer.id` 0 — the list printed it as "?"). That is a slot hold the payment
 * flow releases by itself, not a request the owner has to confirm, a new customer, or booked
 * value. A pending payment that HAS a customer (a bank transfer awaiting the owner's check, say)
 * stays a real request.
 *
 * Re-test 2026-10-05: a checkout that collects the customer's details FIRST has a customer and is
 * still not placed. The list item now says so itself — `paymentStateReason` is `checkout_pending`
 * while the checkout deadline still governs the hold (rest-contract §2.8) — so that reason marks
 * a hold whether or not a customer is on it. A placed order awaiting verification answers another
 * reason and stays a request the owner must act on.
 *
 * @param {Object} row Adapted booking row (`lib/booking-adapter.js`).
 * @return {boolean} Whether the row is a checkout hold.
 */
export function isCheckoutHold( row ) {
	return row?.status === 'pending' && row?.paymentStatus === 'pending'
		&& ( ! row?.customerId || row?.paymentStateReason === 'checkout_pending' );
}

/**
 * Whether a cancelled booking still holds the customer's money (T-056).
 *
 * Cancelling never refunds automatically (D-R71k), so a `cancelled` booking whose order is still
 * `paid` is the one case where the owner has something to decide. `partial` / `refunded` mean the
 * refund was already looked at — EXCEPT a paid deposit (D-R71): it is stored as `partial` too, and
 * only the ledger reason `deposit_paid` tells it apart from a partial refund. Nothing was refunded,
 * so the deposit is money still held, exactly like a `paid` order.
 *
 * @param {Object} row Adapted booking row, or the editor's `{ status, order: { paymentStatus, paymentReason } }`.
 * @return {boolean} Whether a refund is waiting to be reviewed.
 */
export function needsRefundReview( row ) {
	const payment = row?.paymentStatus ?? row?.order?.paymentStatus;
	const reason = row?.paymentReason ?? row?.order?.paymentReason;

	return row?.status === 'cancelled' && ( payment === 'paid' || reason === 'deposit_paid' );
}

const byStart = ( a, b ) => String( a.startUtc ).localeCompare( String( b.startUtc ) );

/**
 * Everything the Dashboard shows, from one window of bookings.
 *
 * @param {Array}    rows   Adapted booking rows.
 * @param {string}   today  Business-local `Y-m-d`.
 * @param {Function} dateOf `( utcInstant ) => 'Y-m-d'` in business time (for `created`).
 * @return {{todays: Array, pending: Array, holds: Array, refunds: Array, bookedValue: number, newCustomers: number}} Aggregates.
 */
export function dashboardStats( rows, today, dateOf ) {
	const list = Array.isArray( rows ) ? rows : [];
	const holds = list.filter( isCheckoutHold ).sort( byStart );
	// A cancelled row that was only ever an unplaced checkout (`checkoutAbandoned`) is no more a
	// booking than the live hold it used to be: its customer record exists because somebody typed
	// their details, not because anybody booked.
	const real = list.filter( ( b ) => ! isCheckoutHold( b ) && ! b.checkoutAbandoned );
	const todays = real.filter( ( b ) => b.date === today && b.status !== 'cancelled' ).sort( byStart );
	const pending = real.filter( ( b ) => b.status === 'pending' ).sort( byStart );
	const bookedValue = todays.filter( ( b ) => BLOCKING.has( b.status ) ).reduce( ( sum, b ) => sum + ( b.total || 0 ), 0 );
	// Keyed on the customer RECORD first: two customers can share a display name, and a hold
	// without one is not a customer at all.
	const newCustomers = new Set(
		real
			.filter( ( b ) => b.created && dateOf( b.created ) === today && ( b.customerId || b.email || b.customer ) )
			.map( ( b ) => ( b.customerId ? `id:${ b.customerId }` : String( b.email || b.customer ).toLowerCase() ) )
	).size;
	const refunds = list.filter( needsRefundReview ).sort( byStart );

	return { todays, pending, holds, refunds, bookedValue, newCustomers };
}

/**
 * Whether customers can book an ACTIVE service (persona QA 2026-10-05, re-test R11).
 *
 * The public catalogue lists a service only when an ACTIVE staff member is assigned to it
 * (T-073), so an active service with none is invisible to customers — while the admin list read
 * "0 staff · Active" and the Dashboard counted it. `active_staff_count` is additive
 * (rest-contract §2.3); a DTO older than the field falls back to `staff_count`.
 *
 * @param {Object} service Service list DTO.
 * @return {boolean} Whether the service is active and nobody can perform it.
 */
export function serviceNotBookable( service ) {
	if ( service?.status !== 'active' ) {
		return false;
	}
	const count = service.active_staff_count ?? service.staff_count;

	return Number.isFinite( Number( count ) ) && Number( count ) < 1;
}

/**
 * Where the Dashboard's "no payment method is ready" action leads (re-test N3).
 *
 * `paymentNotReady()` named the FIRST enabled module that is not ready, so a site with two
 * payment modules switched on was sent to one it had never set up. A module that answered the
 * readiness seam with an explicit `false` has something to say about why; one that did not answer
 * (`null`) has not. With exactly one such module the action opens it; with one enabled module it
 * opens that; otherwise it opens the catalog on the Payments tab rather than guessing.
 *
 * @param {Array}  modules Boot module catalog.
 * @param {string} mode    Stored `payments.mode`.
 * @return {?{path: string, category: string}} Hash path, plus the catalog tab to open ('' for a module page); null when nothing is broken.
 */
export function paymentFixTarget( modules, mode ) {
	if ( ! paymentNotReady( modules, mode ) ) {
		return null;
	}
	const enabled = modules.filter(
		( mod ) => mod && 'payments' === mod.category && true === mod.available && true === mod.enabled && mod.code
	);
	const blocked = enabled.filter( ( mod ) => false === mod.ready );
	const pick = 1 === blocked.length ? blocked[ 0 ] : ( 1 === enabled.length ? enabled[ 0 ] : null );

	return pick ? { path: `modules/${ pick.code }`, category: '' } : { path: 'modules', category: 'payments' };
}

/**
 * The payment module the owner switched on that cannot take a payment right now, or null (T-037).
 *
 * Generic over the module catalog on the boot data — core names no gateway. Online payment is
 * "on but not working" when the stored mode is not `off`, at least one payment module is enabled
 * on this site, and NONE of the enabled ones reports ready through the module status seam
 * (`ready === true`). In that state the booking form drops the payment step and paid services are
 * booked unpaid (D-R38a(1): a booking is never refused because no gateway is ready) — which is
 * correct, and is exactly what the owner must be told. A site with no payment module enabled is
 * not in this state: it never asked for online payment.
 *
 * @param {Array}  modules Boot module catalog (`config.modules`).
 * @param {string} mode    Stored `payments.mode` (`off|optional|required`), or '' when unknown.
 * @return {?string} The first enabled-but-not-ready payment module code, or null.
 */
export function paymentNotReady( modules, mode ) {
	if ( ! mode || 'off' === mode ) {
		return null;
	}
	const enabled = ( Array.isArray( modules ) ? modules : [] ).filter(
		( mod ) => mod && 'payments' === mod.category && true === mod.available && true === mod.enabled
	);
	if ( ! enabled.length || enabled.some( ( mod ) => true === mod.ready ) ) {
		return null;
	}

	return String( enabled[ 0 ].code || '' ) || null;
}

/**
 * Whether the public form is REFUSING paid services right now (D-R79) — the client mirror of
 * `PaymentRegistry::requiredButUnavailable()` + the opt-in `payments.when_unavailable = refuse`,
 * so the Dashboard line says what is actually happening: "cannot be booked" instead of "booked
 * without payment". Display only; the server decides.
 *
 * @param {Array}   modules         Boot module catalog.
 * @param {string}  mode            Stored `payments.mode`.
 * @param {string}  whenUnavailable Stored `payments.when_unavailable` (`accept` | `refuse`).
 * @param {boolean} exclusive       An enabled payment module is the site's exclusive checkout.
 * @return {boolean} Whether paid services are refused.
 */
export function paidBookingsRefused( modules, mode, whenUnavailable, exclusive ) {
	return 'refuse' === whenUnavailable
		&& null !== paymentNotReady( modules, mode )
		&& ( 'required' === mode || true === exclusive );
}

/**
 * Part of the day for an hour of the BUSINESS clock (T-038: the browser's clock greeted a London
 * clinic "Good morning" at 20:19).
 *
 * @param {number} hour 0–23.
 * @return {string} `morning` | `afternoon` | `evening`.
 */
export function dayPart( hour ) {
	if ( hour < 12 ) {
		return 'morning';
	}

	return hour < 18 ? 'afternoon' : 'evening';
}

/**
 * The current hour (0–23) in a timezone; falls back to the browser's hour for an unusable zone.
 *
 * @param {string} tz  IANA timezone.
 * @param {Date}   now Instant.
 * @return {number} Hour.
 */
export function hourIn( tz, now = new Date() ) {
	try {
		const hour = Number( new Intl.DateTimeFormat( 'en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: tz } ).format( now ) );

		return Number.isInteger( hour ) ? hour % 24 : now.getHours();
	} catch ( e ) {
		return now.getHours();
	}
}

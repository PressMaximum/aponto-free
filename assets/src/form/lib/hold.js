/**
 * Payment-hold bookkeeping the widget needs BETWEEN two page states (D-R38).
 *
 * A pay-online booking is created before the money moves: the slot is held, the
 * gateway is handed an intent, and only then does the customer authorise. Three
 * things have to survive that gap, and none of them belongs in component state:
 *
 *  1. **The manage token**, so a hold the customer walks away from can be
 *     released immediately instead of waiting for the expiry cron. It is not a
 *     field of its own — the contract deliberately ships a `manage_url` whose
 *     shape depends on the site's permalinks (rest-contract §3.3) — so it is
 *     read back out of that URL, never reconstructed.
 *  2. **A minimal, whitelisted summary of the booking**, because a redirect-based
 *     method would return to a FRESH page with no widget state at all, and the
 *     confirmation panel has to be rendered from something. It goes to
 *     `sessionStorage`, keyed by order code, and is cleared the moment it is used
 *     or invalidated.
 *
 *     NOT the booking response. An earlier cut stored that verbatim, which put
 *     the intent's client secret, the manage URL and the ICS URL — the bearer
 *     capability to view and cancel the booking — into a store any script on the
 *     page can read and any later visitor to that tab inherits. What goes in is
 *     display facts plus references: things that identify the booking to a server
 *     that will re-check them, and nothing that grants anything on its own. The
 *     whitelist is enforced HERE, in {@link storeHold}, rather than only at the
 *     call site — a rule a caller has to remember is a rule that is one careless
 *     `...response` away from being gone, and this one leaks capabilities.
 *  3. **The return parameters**, which are how such a page learns it is a
 *     continuation rather than a first visit.
 *
 * V1 pins Stripe to `allow_redirects: never`, so (2) and (3) are the path a
 * customer should never take — but the code has to exist for the day a method
 * slips through, and a path that only exists in production is a path that has
 * never been run.
 *
 * Pure module: reads/writes `sessionStorage` and `location` through injected
 * objects, no Preact. Every storage access is wrapped: a private-mode Safari
 * throws on `sessionStorage` access itself, and losing the panel is not a reason
 * to lose the booking.
 */

/** Storage key namespace — one entry per order code. */
const PREFIX = 'aponto:payment:';

/** The manage token's exact shape (`PublicBookingsController::lookupActive`). */
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

/** The query params this widget owns and strips from the address bar. */
const RETURN_PARAM_RE = /^aponto_(pay|order|ref|resume)=/;

/**
 * EXACTLY what may be persisted about a hold. Anything else is dropped.
 *
 * Every entry is either a reference the server re-checks (`order_code`,
 * `gateway_ref`) or a display fact the confirmation panel prints. None of it
 * grants access to anything: no manage token or URL, no ICS URL, no client
 * secret, no customer name, email or phone.
 */
const HOLD_KEYS = [
	'order_code',
	'gateway',
	'gateway_ref',
	'expires_at',
	'booking',
];

/** Inside `booking`, the same rule again. */
const BOOKING_KEYS = [
	'status',
	'start_utc',
	'end_utc',
	'service_name',
	'staff_name',
	'display_tz',
];

/**
 * Copy only the listed keys of a plain object.
 *
 * @param {*}                source Candidate object.
 * @param {Array.<string>}   keys   Allowed keys.
 * @return {Object} A new object holding at most those keys.
 */
function pick( source, keys ) {
	const out = {};
	if ( ! source || typeof source !== 'object' ) {
		return out;
	}
	keys.forEach( ( key ) => {
		if ( Object.prototype.hasOwnProperty.call( source, key ) ) {
			out[ key ] = source[ key ];
		}
	} );
	return out;
}

/**
 * The raw manage token inside a `manage_url`, or `''` when there is none.
 *
 * Both contract shapes are accepted because both are valid and the client is
 * forbidden from assuming which one a site emits: pretty permalinks give
 * `…/aponto/booking/{token}`, plain permalinks give `…?aponto_manage_token={token}`.
 * The 43-character check is what stops a URL that merely ends in a path segment
 * from being mistaken for a token.
 *
 * @param {*} manageUrl The response's `manage_url`.
 * @return {string} Raw token or ''.
 */
export function manageToken( manageUrl ) {
	const url = typeof manageUrl === 'string' ? manageUrl : '';
	if ( ! url ) {
		return '';
	}
	const query = url.match(
		/[?&]aponto_manage_token=([A-Za-z0-9_-]{43})(?:[&#]|$)/
	);
	if ( query ) {
		return query[ 1 ];
	}
	const path = url.split( /[?#]/ )[ 0 ].replace( /\/+$/, '' );
	const last = path.slice( path.lastIndexOf( '/' ) + 1 );
	return TOKEN_RE.test( last ) ? last : '';
}

/**
 * Resolve the session storage to use, or null when the browser refuses one.
 *
 * @param {Storage} [storage] Injected storage (tests).
 * @return {?Storage} Storage or null.
 */
function store( storage ) {
	if ( storage ) {
		return storage;
	}
	try {
		return typeof window !== 'undefined' && window.sessionStorage
			? window.sessionStorage
			: null;
	} catch {
		return null;
	}
}

/**
 * Persist the in-flight hold for one order, whitelisted.
 *
 * The payload is REDUCED to {@link HOLD_KEYS} (and `booking` to
 * {@link BOOKING_KEYS}) before it is written, so a caller that hands over a
 * whole booking response stores a safe subset of it rather than the secrets it
 * contains. Enforcing it here means the guarantee holds for every call site,
 * including ones written later by someone who has not read this file.
 *
 * @param {string}  orderCode Order code (`AP-XXXXX`).
 * @param {Object}  payload   Hold summary; unknown keys are dropped.
 * @param {Storage} [storage] Injected storage (tests).
 */
export function storeHold( orderCode, payload, storage ) {
	const s = store( storage );
	if ( ! s || ! orderCode ) {
		return;
	}
	const safe = pick( payload, HOLD_KEYS );
	if ( 'booking' in safe ) {
		safe.booking = pick( safe.booking, BOOKING_KEYS );
	}
	try {
		s.setItem( PREFIX + orderCode, JSON.stringify( safe ) );
	} catch {
		// Quota or private mode — the confirm leg still works, only the
		// redirect-return panel degrades to its minimal form.
	}
}

/**
 * Read back a persisted hold.
 *
 * @param {string}  orderCode Order code.
 * @param {Storage} [storage] Injected storage (tests).
 * @return {?Object} Payload or null.
 */
export function readHold( orderCode, storage ) {
	const s = store( storage );
	if ( ! s || ! orderCode ) {
		return null;
	}
	try {
		const raw = s.getItem( PREFIX + orderCode );
		if ( ! raw ) {
			return null;
		}
		const parsed = JSON.parse( raw );
		return parsed && typeof parsed === 'object' ? parsed : null;
	} catch {
		return null;
	}
}

/**
 * Drop a persisted hold (used, cancelled or superseded).
 *
 * @param {string}  orderCode Order code.
 * @param {Storage} [storage] Injected storage (tests).
 */
export function clearHold( orderCode, storage ) {
	const s = store( storage );
	if ( ! s || ! orderCode ) {
		return;
	}
	try {
		s.removeItem( PREFIX + orderCode );
	} catch {
		// Nothing to do — the entry expires with the tab either way.
	}
}

/**
 * Parse the gateway return parameters out of a query string.
 *
 * @param {string} search `location.search`.
 * @return {?{status:string, order:string, ref:string}} Params, or null when this
 *   is an ordinary page view.
 */
export function readReturn( search ) {
	const raw = String( search || '' ).replace( /^\?/, '' );
	if ( ! raw ) {
		return null;
	}
	const params = {};
	raw.split( '&' ).forEach( ( pair ) => {
		if ( ! pair ) {
			return;
		}
		const eq = pair.indexOf( '=' );
		const key = eq < 0 ? pair : pair.slice( 0, eq );
		const value = eq < 0 ? '' : pair.slice( eq + 1 );
		try {
			params[ decodeURIComponent( key ) ] = decodeURIComponent(
				value.replace( /\+/g, ' ' )
			);
		} catch {
			// A malformed escape is not a reason to fail the page.
		}
	} );
	const status = params.aponto_pay;
	if ( status !== 'success' && status !== 'cancel' ) {
		return null;
	}
	return {
		status,
		order: params.aponto_order || '',
		ref: params.aponto_ref || '',
	};
}

/**
 * The raw manage token in `#aponto_resume=…` — or, for one release, `?aponto_resume=…`.
 *
 * The token is the SAME one `manage_url` already carries (PR-A.3): it is what the payment reminder
 * links, and it grants nothing the manage link did not. The 43-character shape check is what stops
 * a stray param from being sent to the server as a token.
 *
 * THE FRAGMENT IS THE PRIMARY FORM (D-R39c, Codex A.10). A query string is sent to the server on
 * every request for the page and every subresource on it: it lands in the access log, in whatever
 * the host's analytics reads, and in the `Referer` of same-origin assets — all before the JS that
 * strips it has run. A fragment is never transmitted. Links already in inboxes still carry the query
 * form, so it stays accepted for one release and both are stripped from the address bar.
 *
 * @param {string} search `location.search`.
 * @param {string} [hash] `location.hash`.
 * @return {string} Raw token or ''.
 */
export function readResume( search, hash = '' ) {
	const shape = /(?:^|[&#])aponto_resume=([A-Za-z0-9_-]{43})(?:&|$)/;
	const fragment = String( hash || '' ).match( shape );
	if ( fragment ) {
		return fragment[ 1 ];
	}
	const raw = String( search || '' ).replace( /^\?/, '' );
	const match = raw.match( shape );
	return match ? match[ 1 ] : '';
}

/**
 * The URL a gateway should send the customer back to — this page, plus the three
 * params {@link readReturn} looks for. Any previous set is dropped first so a
 * second attempt cannot inherit the first one's reference.
 *
 * @param {string} href   Current page URL.
 * @param {Object} params `{order, ref}`.
 * @return {string} Return URL.
 */
export function buildReturnUrl( href, params ) {
	const base = String( href || '' ).split( '#' )[ 0 ];
	const cut = base.indexOf( '?' );
	const path = cut < 0 ? base : base.slice( 0, cut );
	const kept = ( cut < 0 ? '' : base.slice( cut + 1 ) )
		.split( '&' )
		.filter( ( pair ) => pair && ! RETURN_PARAM_RE.test( pair ) );
	kept.push(
		'aponto_pay=success',
		'aponto_order=' + encodeURIComponent( ( params || {} ).order || '' ),
		'aponto_ref=' + encodeURIComponent( ( params || {} ).ref || '' )
	);
	return path + '?' + kept.join( '&' );
}

/**
 * Remove the return params from the address bar without a navigation, so a
 * reload does not replay the confirm leg and the customer cannot share a URL
 * carrying their payment reference.
 *
 * @param {Window} [win] Window (injected for tests).
 */
export function stripReturn( win ) {
	const w = win || ( typeof window !== 'undefined' ? window : null );
	if ( ! w || ! w.history || typeof w.history.replaceState !== 'function' ) {
		return;
	}
	const loc = w.location || {};
	const kept = String( loc.search || '' )
		.replace( /^\?/, '' )
		.split( '&' )
		.filter( ( pair ) => pair && ! RETURN_PARAM_RE.test( pair ) );
	// The FRAGMENT is cleaned the same way (D-R39c): it never reached the server, but it is still in
	// the address bar for the visitor to copy and in this tab's history entry.
	const fragment = String( loc.hash || '' )
		.replace( /^#/, '' )
		.split( '&' )
		.filter( ( pair ) => pair && ! RETURN_PARAM_RE.test( pair ) );
	const url =
		( loc.pathname || '' ) +
		( kept.length ? '?' + kept.join( '&' ) : '' ) +
		( fragment.length ? '#' + fragment.join( '&' ) : '' );
	try {
		w.history.replaceState( w.history.state || null, '', url );
	} catch {
		// Cross-origin or file:// — leaving the params visible is cosmetic.
	}
}

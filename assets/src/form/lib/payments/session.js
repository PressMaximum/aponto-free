/**
 * What an external checkout is already holding for THIS visitor (D-R71w).
 *
 * A gateway that takes the visitor to a checkout of its own may publish
 * `session_url` in its public client config. The widget then asks it — on load
 * and when the page comes back from the back/forward cache — what that checkout
 * holds for the current visitor: bookings still waiting to be paid, where to
 * resume, and the contact details already given there. With it the widget can
 * say "you have a booking waiting at checkout" instead of silently starting
 * over, mark the visitor's own held time, and refill the identity fields.
 *
 * The widget knows only the verb. The URL comes from the gateway's server, the
 * answer is bound to the visitor's own session there, and the request carries
 * NOTHING: no ids, no token, an empty body.
 *
 * `session_cookie`, when published, names a script-readable cookie whose
 * absence means that checkout has nothing for this visitor: the question is
 * then not asked at all, so an ordinary page view costs no request.
 *
 * FAIL QUIET: no URL, a foreign origin, a network error, a refusal or an answer
 * in an unknown shape all resolve `null`. Nothing here is needed to book.
 */

const TIMEOUT_MS = 10000;

/** Most holds one answer may carry; the rest are ignored. */
const MAX_ATTEMPTS = 10;

/**
 * A short plain string, or ''.
 *
 * @param {*} value Candidate.
 * @return {string} Trimmed text.
 */
function text( value ) {
	return typeof value === 'string' &&
		value.length <= 200 &&
		! /[<>]/.test( value )
		? value.trim()
		: '';
}

/**
 * An instant as the ISO string the widget compares slots by, or ''.
 *
 * @param {*} value Candidate ISO instant.
 * @return {string} Normalised instant.
 */
function instant( value ) {
	const time = typeof value === 'string' ? Date.parse( value ) : NaN;
	return Number.isFinite( time ) ? new Date( time ).toISOString() : '';
}

/**
 * A same-origin http(s) URL, or ''.
 *
 * @param {*}      value Candidate URL.
 * @param {string} base  Page URL.
 * @return {string} Absolute URL.
 */
function sameOrigin( value, base ) {
	try {
		if ( typeof value !== 'string' || ! value ) {
			return '';
		}
		const url = new URL( value, base );
		return [ 'https:', 'http:' ].includes( url.protocol ) &&
			url.origin === new URL( base ).origin &&
			! url.username &&
			! url.password
			? url.href
			: '';
	} catch {
		return '';
	}
}

/**
 * The offered gateway that can answer for the visitor's checkout, or null.
 *
 * @param {Array.<Object>} gateways Offered gateways `{code, client}`.
 * @return {?Object} Gateway.
 */
export function sessionGateway( gateways ) {
	return (
		( gateways || [] ).find(
			( gateway ) =>
				gateway &&
				gateway.client &&
				typeof gateway.client.session_url === 'string' &&
				gateway.client.session_url
		) || null
	);
}

/**
 * Reduce a server answer to the fields the widget uses, each one re-checked.
 *
 * @param {*}      body Parsed answer.
 * @param {string} base Page URL.
 * @return {?Object} `{attempts, resumeUrl, multiple, contact}` or null.
 */
export function normalizeSession( body, base ) {
	if (
		! body ||
		typeof body !== 'object' ||
		! Array.isArray( body.attempts )
	) {
		return null;
	}
	const contact =
		body.contact && typeof body.contact === 'object' ? body.contact : {};
	const resumeUrl = sameOrigin( body.resume_url, base );
	const now = Date.now();
	return {
		// A hold without a way back to it, or one already past its deadline, is not offered.
		attempts: ( resumeUrl ? body.attempts : [] )
			.slice( 0, MAX_ATTEMPTS )
			.map( ( attempt ) => ( {
				serviceId: Number( attempt && attempt.service_id ) || 0,
				staffId: Number( attempt && attempt.staff_id ) || 0,
				serviceName: text( attempt && attempt.service_name ),
				startUtc: instant( attempt && attempt.start_utc ),
				expiresAt: instant( attempt && attempt.expires_at ),
			} ) )
			.filter(
				( attempt ) =>
					attempt.startUtc &&
					( ! attempt.expiresAt ||
						Date.parse( attempt.expiresAt ) > now )
			),
		resumeUrl,
		multiple: body.multiple === true,
		contact: {
			first_name: text( contact.first_name ),
			last_name: text( contact.last_name ),
			email: text( contact.email ),
			phone: text( contact.phone ),
		},
	};
}

/**
 * Ask the offered gateway what its checkout holds for this visitor.
 *
 * @param {Array.<Object>} gateways     Offered gateways.
 * @param {Object}         [opts]       Options.
 * @param {string}         [opts.nonce] REST nonce, forwarded so a signed-in visitor stays signed in.
 * @param {Window}         [opts.win]   Window (injected for tests).
 * @return {Promise<?Object>} Normalised session, or null when there is nothing to say.
 */
export async function gatewaySession( gateways, opts = {} ) {
	const win = opts.win || ( typeof window !== 'undefined' ? window : null );
	const gateway = sessionGateway( gateways );
	if ( ! win || ! gateway ) {
		return null;
	}
	let timer;
	try {
		const url = sameOrigin( gateway.client.session_url, win.location.href );
		const marker = gateway.client.session_cookie;
		if (
			! url ||
			( marker &&
				! String( ( win.document && win.document.cookie ) || '' )
					.split( ';' )
					.some(
						( pair ) => pair.trim().split( '=' )[ 0 ] === marker
					) )
		) {
			return null;
		}
		const controller = new AbortController();
		timer = setTimeout( () => controller.abort(), TIMEOUT_MS );
		const response = await win.fetch( url, {
			method: 'POST',
			credentials: 'same-origin',
			redirect: 'error',
			cache: 'no-store',
			signal: controller.signal,
			headers: {
				'Content-Type': 'application/json',
				...( opts.nonce ? { 'X-WP-Nonce': opts.nonce } : {} ),
			},
			body: '{}',
		} );
		return response.ok
			? normalizeSession( await response.json(), win.location.href )
			: null;
	} catch {
		return null;
	} finally {
		clearTimeout( timer );
	}
}

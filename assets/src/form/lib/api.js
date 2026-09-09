/**
 * REST client for the public booking allow-list (rest-contract §3).
 *
 * Only the three endpoints the widget needs are exposed: services, availability
 * and the single-booking POST. Failures are normalized to {@link ApiError} so the
 * flow can classify them without touching transport details. Public endpoints are
 * open (no nonce required); a nonce is sent when present so logged-in editor
 * previews reuse the cookie session cleanly.
 */

import { ApiError } from './errors.js';

/**
 * Build a query string (no leading separator) from a params object, skipping null/undefined.
 * @param {Object} params Query params.
 * @return {string} `a=b&c=d`, or '' when nothing to encode.
 */
function qs( params ) {
	const parts = [];
	Object.keys( params || {} ).forEach( ( k ) => {
		const v = params[ k ];
		if ( v !== null && v !== undefined && v !== '' ) {
			parts.push(
				encodeURIComponent( k ) + '=' + encodeURIComponent( v )
			);
		}
	} );
	return parts.join( '&' );
}

/**
 * Append a query string to a URL with the CORRECT separator. Plain-permalink REST
 * bases already carry a `?` (`index.php?rest_route=/aponto/v1`), so a naive `?`
 * join produced a second `?` and a 404 (finding U4-04). Choose `&` when the URL
 * already contains a `?`, `?` otherwise.
 *
 * @param {string} url    Full URL (may already contain a query string).
 * @param {Object} params Query params.
 * @return {string} URL with the params appended.
 */
export function appendQuery( url, params ) {
	const query = qs( params );
	if ( ! query ) {
		return url;
	}
	return url + ( url.indexOf( '?' ) === -1 ? '?' : '&' ) + query;
}

/**
 * Turn a fetch Response into an ApiError, reading the stable error body and the
 * Retry-After header (429).
 *
 * @param {Response} response Fetch response.
 * @return {Promise<ApiError>} The error.
 */
async function toApiError( response ) {
	let body = null;
	try {
		body = await response.json();
	} catch {
		body = null;
	}
	const data = body && body.data ? body.data : {};
	let retryAfter = null;
	const header = response.headers.get( 'Retry-After' );
	if ( header !== null && header !== '' && ! isNaN( Number( header ) ) ) {
		retryAfter = Number( header );
	} else if (
		data &&
		data.retry_after !== null &&
		data.retry_after !== undefined
	) {
		retryAfter = Number( data.retry_after );
	}
	return new ApiError( {
		code: body && body.code ? body.code : '',
		status: response.status,
		message: body && body.message ? body.message : '',
		fields: data && data.fields ? data.fields : null,
		data,
		retryAfter,
	} );
}

/**
 * Create a bound API client.
 *
 * @param {Object} config Widget config with `restUrl` (base to `aponto/v1`) and optional `nonce`.
 * @return {Object} Client with `getServices`, `getAvailability`, `createBooking`.
 */
export function createApi( config ) {
	const base = String( config.restUrl || '' ).replace( /\/+$/, '' );
	const nonce = config.nonce || '';

	function headers( extra ) {
		const h = Object.assign( { Accept: 'application/json' }, extra || {} );
		if ( nonce ) {
			h[ 'X-WP-Nonce' ] = nonce;
		}
		return h;
	}

	async function request( path, options, query ) {
		// Build the query against the FULL url (base may already carry `?` under plain
		// permalinks), so the separator is chosen correctly (U4-04).
		const url = appendQuery( base + path, query );
		let response;
		try {
			response = await fetch( url, options );
		} catch {
			throw new ApiError( {
				code: 'aponto_network',
				status: 0,
				message: 'network',
			} );
		}
		if ( ! response.ok ) {
			throw await toApiError( response );
		}
		try {
			return await response.json();
		} catch {
			throw new ApiError( {
				code: 'aponto_network',
				status: response.status,
				message: 'bad-json',
			} );
		}
	}

	return {
		/**
		 * GET /public/services.
		 *
		 * @return {Promise<{items:Array, categories:Array}>} Catalogue.
		 */
		getServices() {
			return request( '/public/services', {
				method: 'GET',
				headers: headers(),
				credentials: 'same-origin',
			} );
		},

		/**
		 * GET /public/availability.
		 *
		 * @param {Object} params `{service_id, staff_id?, from_date, to_date, tz}`.
		 * @return {Promise<{slots:Array, service:Object}>} Availability.
		 */
		getAvailability( params ) {
			return request(
				'/public/availability',
				{
					method: 'GET',
					headers: headers(),
					credentials: 'same-origin',
				},
				params
			);
		},

		/**
		 * POST /public/bookings.
		 *
		 * @param {Object} body           Booking body.
		 * @param {string} idempotencyKey Canonical UUID for `X-Aponto-Idempotency`.
		 * @return {Promise<Object>} Booking response (original or replay).
		 */
		createBooking( body, idempotencyKey ) {
			return request( '/public/bookings', {
				method: 'POST',
				headers: headers( {
					'Content-Type': 'application/json',
					'X-Aponto-Idempotency': idempotencyKey,
				} ),
				credentials: 'same-origin',
				body: JSON.stringify( body ),
			} );
		},

		/**
		 * POST /public/payments/{gateway}/confirm (rest-contract §3.8).
		 *
		 * The widget reports a REFERENCE, never an outcome: the server asks the
		 * gateway what really happened and answers with state only — no PII, no
		 * links, no amount (D-R38d). Safe to call more than once for the same
		 * reference.
		 *
		 * @param {string} gateway Payment module code.
		 * @param {string} ref     Gateway payment reference.
		 * @return {Promise<{order_code:string, payment_status:string, booking_status:string, expires_at:?string}>} State.
		 */
		confirmPayment( gateway, ref ) {
			return request( '/public/payments/' + gateway + '/confirm', {
				method: 'POST',
				headers: headers( { 'Content-Type': 'application/json' } ),
				credentials: 'same-origin',
				body: JSON.stringify( { ref } ),
			} );
		},

		/**
		 * POST /public/bookings/{token}/pay (rest-contract §3.10).
		 *
		 * Resumes an unpaid hold from a link rather than from this tab's storage: the same
		 * `payment` block the booking POST returns, plus the display fields needed to draw a
		 * summary for a booking this page never had a catalogue for. Creates nothing.
		 *
		 * @param {string} token Raw manage token.
		 * @return {Promise<Object>} Resume payload.
		 */
		resumePayment( token ) {
			return request( '/public/bookings/' + token + '/pay', {
				method: 'POST',
				headers: headers( { 'Content-Type': 'application/json' } ),
				credentials: 'same-origin',
				body: JSON.stringify( {} ),
			} );
		},

		/**
		 * POST /public/bookings/{token}/cancel (rest-contract §3.6).
		 *
		 * Used by the widget to release an unpaid HOLD the moment the visitor
		 * walks away from it (D-R38k): the customer never committed anything, so
		 * the slot goes back immediately instead of waiting for the expiry cron.
		 *
		 * @param {string} token Raw manage token.
		 * @return {Promise<Object>} Cancellation result.
		 */
		cancelBooking( token ) {
			return request( '/public/bookings/' + token + '/cancel', {
				method: 'POST',
				headers: headers( { 'Content-Type': 'application/json' } ),
				credentials: 'same-origin',
				body: JSON.stringify( {} ),
			} );
		},
	};
}

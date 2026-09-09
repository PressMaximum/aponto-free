/**
 * Minimal REST client for `aponto/v1`.
 *
 * Same-origin relative base + WP nonce header (mirrors the form harness) so the
 * 127.0.0.1↔localhost split never becomes a cross-origin request. Every error is
 * normalised to the contract envelope `{ code, message, status, data }` (error
 * registry) so callers surface `message` verbatim (SPEC-P1 §1.0).
 */
import { config } from './config.js';

const BASE = config.restUrl.replace( /\/$/, '' );

export function buildUrl( path, query ) {
	const url = BASE + ( path.startsWith( '/' ) ? path : `/${ path }` );
	if ( ! query ) {
		return url;
	}
	const params = new URLSearchParams();
	Object.entries( query ).forEach( ( [ key, value ] ) => {
		if ( value === undefined || value === null || value === '' ) {
			return;
		}
		params.append( key, String( value ) );
	} );
	const qs = params.toString();
	// Choose the separator by whether the base already carries a query string: a
	// plain-permalink REST base is `index.php?rest_route=/aponto/v1`, so a second `?`
	// would 404 the whole call (finding U4-04).
	return qs ? `${ url }${ url.indexOf( '?' ) === -1 ? '?' : '&' }${ qs }` : url;
}

export class ApiError extends Error {
	constructor( { code, message, status, data } ) {
		super( message || 'Request failed.' );
		this.name = 'ApiError';
		this.code = code || 'aponto_error';
		this.status = status || 0;
		this.data = data || null;
	}
}

async function request( method, path, { query, body } = {} ) {
	const headers = { 'X-WP-Nonce': config.nonce };
	const init = { method, headers, credentials: 'same-origin' };
	if ( body !== undefined ) {
		headers[ 'Content-Type' ] = 'application/json';
		init.body = JSON.stringify( body );
	}

	let response;
	try {
		response = await fetch( buildUrl( path, query ), init );
	} catch ( networkError ) {
		throw new ApiError( { code: 'aponto_network', message: networkError.message || 'Network error.', status: 0 } );
	}

	const isJson = ( response.headers.get( 'content-type' ) || '' ).includes( 'application/json' );
	const payload = isJson ? await response.json().catch( () => null ) : await response.text();

	if ( ! response.ok ) {
		const envelope = payload && typeof payload === 'object' ? payload : {};
		throw new ApiError( {
			code: envelope.code || 'aponto_error',
			message: envelope.message || `Request failed (${ response.status }).`,
			status: response.status,
			data: envelope.data || null,
		} );
	}

	return payload;
}

export const api = {
	get: ( path, query ) => request( 'GET', path, { query } ),
	post: ( path, body ) => request( 'POST', path, { body } ),
	patch: ( path, body ) => request( 'PATCH', path, { body } ),
	put: ( path, body ) => request( 'PUT', path, { body } ),
	del: ( path ) => request( 'DELETE', path ),
};

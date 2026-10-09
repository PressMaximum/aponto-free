/**
 * A gateway's own readiness check, asked BEFORE anything is reserved.
 *
 * A gateway may publish `precheck_url` in its public client config when its
 * checkout can refuse for a reason the widget cannot see (the visitor's cart on
 * an external checkout, say). Asking first means a refusal costs the visitor
 * nothing: no booking, no hold. The widget knows only the verb — the URL and
 * the sentence both come from the gateway's server.
 *
 * FAIL OPEN: a check that cannot be asked (no URL, a foreign origin, a network
 * error, an answer in an unknown shape) resolves `null`, because the gateway's
 * own handoff still enforces the same rule. Only an explicit refusal with a
 * sentence the visitor can act on stops the flow.
 *
 * ONE EXCEPTION — a rate limit BLOCKS. `429 aponto_rate_limited` is thrown as an
 * `ApiError` with its retry-after, so the caller shows the standard "too many
 * attempts" state and reserves nothing: going on would take a hold whose
 * handoff the same visitor may then be refused.
 */
import { ApiError } from '../errors.js';

const TIMEOUT_MS = 10000;

/**
 * The refusal sentence when it is safe to render as text, else ''.
 *
 * @param {*} message Candidate server message.
 * @return {string} Trimmed message or ''.
 */
export function publicRefusal( message ) {
	return typeof message === 'string' &&
		message.trim() &&
		message.length <= 1000 &&
		! /[<>]/.test( message )
		? message.trim()
		: '';
}

/**
 * Ask one gateway whether a checkout can start for this visitor.
 *
 * @param {?Object} gateway      Offered gateway `{code, client}`.
 * @param {Object}  [opts]       Options.
 * @param {string}  [opts.nonce] REST nonce, forwarded so a signed-in visitor stays signed in.
 * @param {Window}  [opts.win]   Window (injected for tests).
 * @return {Promise<?string>} The refusal sentence, or null when nothing refuses.
 * @throws {ApiError} `aponto_rate_limited`, with `retryAfter` seconds.
 */
export async function gatewayPrecheck( gateway, opts = {} ) {
	const win = opts.win || ( typeof window !== 'undefined' ? window : null );
	const raw = gateway && gateway.client && gateway.client.precheck_url;
	if ( ! win || typeof raw !== 'string' || ! raw ) {
		return null;
	}
	let timer;
	let limited = null;
	let refusal = null;
	try {
		const url = new URL( raw, win.location.href );
		if (
			! [ 'https:', 'http:' ].includes( url.protocol ) ||
			url.origin !== new URL( win.location.href ).origin ||
			url.username ||
			url.password
		) {
			return null;
		}
		const controller = new AbortController();
		timer = setTimeout( () => controller.abort(), TIMEOUT_MS );
		const response = await win.fetch( url.href, {
			method: 'POST',
			credentials: 'same-origin',
			redirect: 'error',
			signal: controller.signal,
			headers: {
				'Content-Type': 'application/json',
				...( opts.nonce ? { 'X-WP-Nonce': opts.nonce } : {} ),
			},
			body: '{}',
		} );
		if ( ! response.ok ) {
			const failure = await response.json();
			if ( failure && failure.code === 'aponto_rate_limited' ) {
				limited = new ApiError( {
					code: failure.code,
					status: response.status,
					retryAfter: Number(
						( response.headers &&
							response.headers.get &&
							response.headers.get( 'Retry-After' ) ) ||
							( failure.data && failure.data.retry_after ) ||
							0
					),
				} );
			} else if ( failure && failure.code === 'aponto_payment_state' ) {
				refusal = publicRefusal( failure.message ) || null;
			}
		}
	} catch {
		return null;
	} finally {
		clearTimeout( timer );
	}
	if ( limited ) {
		throw limited;
	}
	return refusal;
}

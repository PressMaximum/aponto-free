/**
 * Onboarding-wizard admin-ajax client (SPEC-P1 §4).
 *
 * The wizard persists every step through ONE nonce-guarded admin-ajax action (`aponto_wizard`) —
 * no REST route (the rest-contract is frozen). This module owns that single request, extracted
 * from the wizard app so its failure contract is unit-testable (tests/js/wizard-api.test.js).
 */
import { __, sprintf } from '@wordpress/i18n';

/**
 * How long one wizard step may take before the client gives up (ms).
 *
 * Every step is one small admin-ajax write, and the server's own critical sections cap out at a
 * 5 s advisory-lock wait, so 30 s is far beyond any legitimate response. The timeout exists
 * because a request that NEVER settles left the Saving button spinning forever with no way out
 * and no diagnosis (beta report 2026-07-25): a hung PHP worker, a stalled loopback request, or a
 * proxy holding the connection open are all indistinguishable from "the button is broken".
 * Failing loudly after a bounded wait turns that dead end into a retryable error notice.
 */
export const REQUEST_TIMEOUT_MS = 30000;

/**
 * POST one wizard step to admin-ajax; resolves the parsed `data` payload.
 *
 * FAIL LOUDLY, NEVER HANG. Every non-success outcome throws an Error whose message the caller
 * surfaces in the wizard's error Notice:
 *
 *   - the request is aborted after {@see REQUEST_TIMEOUT_MS} → "did not respond in time". The
 *     deadline covers the WHOLE exchange, body included: a server or proxy that sends the response
 *     HEADERS and then stalls the body is the same hang in a different place, and clearing the
 *     timer as soon as `fetch()` resolved would have left it wide open (Codex review round 2).
 *     Aborting the signal errors the response body stream too (Fetch standard: "abort" rejects an
 *     in-flight body read), so ONE deadline closes both halves; the timer is cleared only once the
 *     body has settled;
 *   - a transport failure (offline, connection reset) → "could not reach the server";
 *   - an HTTP error status (`res.ok === false`) → a failure REGARDLESS of the body shape, so a
 *     `500` that happens to carry `{"success":true}` can never be read as a saved step;
 *   - a non-JSON body (a PHP fatal, an HTML error page) → same;
 *   - `success` that is not exactly `true` → same. Note that a failed `check_ajax_referer()`
 *     replies with the bare body `-1`, which IS valid JSON: it parses to a truthy number with no
 *     `success` property, so the strict `true !== json.success` test is what rejects it.
 *
 * For all of those, the server's own `data.message` wins when it sent one (`wp_send_json_error()`
 * carries the actionable text, e.g. "You are not allowed to do this."); otherwise the message names
 * the HTTP status, so a beta report can identify the failure instead of "it spins forever".
 *
 * @param {Object} boot     The `window.apontoWizard` bootstrap (`ajaxUrl`, `action`, `nonce`).
 * @param {string} doAction The wizard step to run (`business`, `hours`, `skip`, …).
 * @param {Object} payload  Step fields; JSON-encoded into the `payload` field.
 * @return {Promise<Object>} The response `data` object.
 */
export async function wizardPost( boot, doAction, payload ) {
	const body = new URLSearchParams();
	body.set( 'action', boot.action );
	body.set( 'nonce', boot.nonce );
	body.set( 'do', doAction );
	body.set( 'payload', JSON.stringify( payload || {} ) );

	// AbortController exists in every browser WordPress 6.6 supports; guard anyway so a missing
	// implementation degrades to "no client timeout" instead of throwing before the request runs.
	const controller =
		typeof AbortController === 'function' ? new AbortController() : null;
	const timer = controller
		? setTimeout( () => controller.abort(), REQUEST_TIMEOUT_MS )
		: null;

	// `signal.aborted` (rather than the rejection's name) is what tells our own deadline apart from
	// a genuine transport error: we set it, and it is true for every abort implementation.
	const timedOut = () => null !== controller && controller.signal.aborted;
	const timeoutMessage = __(
		'The server did not respond in time. Please try again.',
		'aponto'
	);

	try {
		let res;
		try {
			res = await fetch( boot.ajaxUrl, {
				method: 'POST',
				credentials: 'same-origin',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: body.toString(),
				signal: controller ? controller.signal : undefined,
			} );
		} catch {
			throw new Error(
				timedOut()
					? timeoutMessage
					: __(
							'Could not reach the server. Please check your connection and try again.',
							'aponto'
					  )
			);
		}

		// Still inside the deadline: reading the body can hang on its own.
		let json;
		try {
			json = await res.json();
		} catch {
			if ( timedOut() ) {
				throw new Error( timeoutMessage );
			}
			// A body that is not JSON at all — a PHP fatal or an HTML error page.
			json = null;
		}

		if ( ! res.ok || ! json || true !== json.success ) {
			const data = json && json.data ? json.data : null;
			const failure = new Error(
				data && data.message
					? data.message
					: sprintf(
							/* translators: %d: HTTP status code of the failed request. */
							__(
								'Something went wrong (HTTP %d). Please try again.',
								'aponto'
							),
							res.status
					  )
			);

			// A REFUSED step (`WizardValidationException` — SPEC-P1 §4) also names the offending
			// fields: `data.fields` is a `{ field: message }` map the caller renders inline under the
			// control, so a server-side rejection reads like the client-side one instead of a bare
			// notice with no pointer to the field. Absent on every other failure.
			if ( data && data.fields && 'object' === typeof data.fields ) {
				failure.fields = data.fields;
			}

			throw failure;
		}

		return json.data || {};
	} finally {
		// Cleared only here — after the body settled, on every path.
		if ( null !== timer ) {
			clearTimeout( timer );
		}
	}
}

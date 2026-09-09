/**
 * Error classification — maps the stable REST error codes (rest-contract §5)
 * to a small set of UI intents. Copy lives in `copy.js`; this module only
 * decides the KIND of recovery, so the flow logic and the presentation stay
 * decoupled and testable.
 *
 * Pure module: no Preact, no DOM.
 */

/**
 * A normalized API error thrown by the REST client.
 */
export class ApiError extends Error {
	/**
	 * @param {Object}  opts              Options.
	 * @param {string}  opts.code         Stable error code.
	 * @param {number}  opts.status       HTTP status.
	 * @param {string}  [opts.message]    Server message (not shown verbatim to visitors).
	 * @param {Object}  [opts.fields]     Per-field validation errors.
	 * @param {?number} [opts.retryAfter] Retry-After seconds.
	 * @param {?Object} [opts.data]       The error body's `data`, for the few codes
	 *                                    that carry a machine-readable detail
	 *                                    (`aponto_payment_state.payment_status`).
	 */
	constructor( { code, status, message, fields, retryAfter, data } ) {
		super( message || code || 'error' );
		this.name = 'ApiError';
		this.code = code || '';
		this.status = status || 0;
		this.fields = fields || null;
		this.data = data || null;
		this.retryAfter =
			retryAfter === null || retryAfter === undefined ? null : retryAfter;
	}
}

/**
 * Classify an error into a UI intent. `kind` values:
 *  - `slot_taken`   409 aponto_slot_taken → back to Date & time, toast, refresh
 *  - `validation`   422 aponto_validation → inline field errors, focus first bad
 *  - `rate_limited` 429 aponto_rate_limited → disabled countdown from Retry-After
 *  - `in_flight`    425 aponto_idempotency_in_flight → keep key, poll/retry
 *  - `lock_timeout` 503 aponto_lock_timeout → auto-retry once, then manual
 *  - `conflict`     409 aponto_idempotency_conflict → rotate key + retry
 *  - `not_found`    404 aponto_not_found → service/slot gone
 *  - `range`        400 aponto_range_too_wide → availability window too wide
 *  - `guard`        aponto_guard_rejected → generic public-safe refusal
 *  - `network`      transport failure / unknown
 *
 * @param {*} error An ApiError or arbitrary throwable.
 * @return {{kind:string, retryAfter:?number, fields:?Object, code:string, status:number}} Intent.
 */
export function classifyError( error ) {
	const code = error && error.code ? error.code : '';
	const status = error && error.status ? error.status : 0;
	const fields = error && error.fields ? error.fields : null;
	const retryAfter =
		error && error.retryAfter !== null && error.retryAfter !== undefined
			? error.retryAfter
			: null;

	let kind = 'network';
	switch ( code ) {
		case 'aponto_slot_taken':
			kind = 'slot_taken';
			break;
		case 'aponto_validation':
			kind = 'validation';
			break;
		case 'aponto_rate_limited':
			kind = 'rate_limited';
			break;
		case 'aponto_idempotency_in_flight':
			kind = 'in_flight';
			break;
		case 'aponto_lock_timeout':
			kind = 'lock_timeout';
			break;
		case 'aponto_idempotency_conflict':
			kind = 'conflict';
			break;
		case 'aponto_not_found':
			kind = 'not_found';
			break;
		case 'aponto_range_too_wide':
			kind = 'range';
			break;
		case 'aponto_guard_rejected':
			kind = 'guard';
			break;
		default:
			// Fall back on HTTP status for un-coded transport-ish failures.
			if ( status === 429 ) {
				kind = 'rate_limited';
			} else if ( status === 503 ) {
				kind = 'lock_timeout';
			} else if ( status === 422 ) {
				kind = 'validation';
			} else {
				kind = 'network';
			}
	}

	return { kind, retryAfter, fields, code, status };
}

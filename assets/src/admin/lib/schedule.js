/**
 * Pure schedule helpers for the admin calendar's non-working stripes (SPEC-P1
 * §1.3 · Codex review #12). Framework-free and import-free so the fallback
 * semantics are unit-testable in isolation.
 */

/**
 * Effective weekly schedule from the server-resolved set.
 *
 * The server (`GET /staff/{id}/schedule?resolved=1`) already resolves §1.3
 * inheritance, so ANY successful response — including an EMPTY weekly, meaning
 * the staff member is closed all week — is authoritative and used as-is. The
 * `fallbackWeekly` boot snapshot applies ONLY when there is no resolved answer
 * at all (`resolvedWeekly` not an array: the fetch failed, or there is no staff
 * to resolve). Within the chosen source an absent weekday means "closed".
 *
 * @param {?Array} resolvedWeekly Server-resolved weekly rows, or null/undefined when unavailable.
 * @param {?Array} fallbackWeekly Business-hours boot snapshot used only without a resolved answer.
 * @return {Object} dow (0=Mon..6=Sun) → open periods [{start_minute,end_minute}]
 */
export function effectiveOpenByDow( resolvedWeekly, fallbackWeekly ) {
	const source = Array.isArray( resolvedWeekly )
		? resolvedWeekly
		: fallbackWeekly || [];
	const map = {};
	( source || [] ).forEach( ( row ) => {
		const dow = ( ( ( Number( row.weekday ) - 1 ) % 7 ) + 7 ) % 7; // schema ISO 1..7 → 0=Mon
		map[ dow ] = Array.isArray( row.periods ) ? row.periods : [];
	} );
	return map;
}

/**
 * Complement of open periods within the visible window → closed intervals
 * (minutes). No open periods (explicit closed row OR absent from the effective
 * weekly set) = the whole visible window is non-working.
 *
 * @param {?Array} periods   Open periods [{start_minute,end_minute}].
 * @param {number} minMinute Visible window start (minutes from midnight).
 * @param {number} maxMinute Visible window end (minutes from midnight).
 * @return {Array} Closed [start,end] minute intervals.
 */
export function closedIntervals( periods, minMinute, maxMinute ) {
	const open = ( periods || [] )
		.map( ( p ) => [
			Math.max( p.start_minute, minMinute ),
			Math.min( p.end_minute, maxMinute ),
		] )
		.filter( ( [ s, e ] ) => e > s )
		.sort( ( a, b ) => a[ 0 ] - b[ 0 ] );
	if ( ! open.length ) {
		return [ [ minMinute, maxMinute ] ];
	}
	const closed = [];
	let cursor = minMinute;
	open.forEach( ( [ s, e ] ) => {
		if ( s > cursor ) {
			closed.push( [ cursor, s ] );
		}
		cursor = Math.max( cursor, e );
	} );
	if ( cursor < maxMinute ) {
		closed.push( [ cursor, maxMinute ] );
	}
	return closed;
}

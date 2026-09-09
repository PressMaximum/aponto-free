/**
 * Print day-sheet data source (C4, review F item 6).
 *
 * The calendar's own load is a ±42-day window capped at 100 rows and filtered by the on-screen
 * status/service selects — none of which may leak into a printed reception sheet. This fetches the
 * COMPLETE booking list for exactly one business day, on demand, right before printing:
 * `status=all`, no service filter, and full pagination (per_page 100, following `total_pages`), so
 * a 100+‑booking day prints whole.
 */

/** Page size for the paginated fetch (the REST maximum). */
const PAGE_SIZE = 100;

/** Safety cap on pages (10 000 bookings in one day) against a server looping `total_pages`. */
const MAX_PAGES = 100;

/**
 * Fetch EVERY booking whose start falls in `[fromIso, toIso)` — all statuses, all services —
 * following pagination to the end, sorted by start.
 *
 * @param {{get: Function}} api     REST client (`api.get(path, params)` → envelope).
 * @param {string}          fromIso UTC RFC3339 range start (inclusive).
 * @param {string}          toIso   UTC RFC3339 range end (exclusive).
 * @return {Promise<Array>} The day's booking DTOs, sorted by `start_utc`.
 */
export async function fetchAllDayBookings( api, fromIso, toIso ) {
	const items = [];
	let page = 1;
	let totalPages = 1;
	do {
		// Deliberately NO status/service filters (the sheet prints "All bookings").
		const res = await api.get( '/bookings', {
			status: 'all',
			from: fromIso,
			to: toIso,
			per_page: PAGE_SIZE,
			page,
		} );
		items.push( ...( res.items || [] ) );
		totalPages = Math.max( 1, Number( res.total_pages ) || 1 );
		page += 1;
	} while ( page <= totalPages && page <= MAX_PAGES );

	return items.sort( ( a, b ) => String( a.start_utc ).localeCompare( String( b.start_utc ) ) );
}

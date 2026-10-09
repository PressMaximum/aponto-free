/**
 * How many UPCOMING bookings a change leaves behind (persona QA 2026-10-05, T-075).
 *
 * Archiving a service, or un-assigning a staff member from one, never touches bookings that
 * already exist — but neither dialog said so, and an operator with a full week ahead had to guess
 * whether those customers had just been cancelled. This reads the count the dialogs quote.
 *
 * Two reads of the existing list route, one row each: `total` is the count, and `pending` +
 * `confirmed` are the only statuses that still hold a slot. BEST-EFFORT by design — a failed read
 * (no bookings capability, a network blip) answers `null` and the caller simply says nothing
 * rather than blocking an archive on a courtesy line.
 */
import { _n, sprintf } from '@wordpress/i18n';
import { api } from './api.js';
import { toUtcInstant } from './format.js';

/**
 * @param {{service_id?: number, staff_id?: number}} scope Filter for `GET /bookings`.
 * @return {Promise<?number>} Upcoming pending + confirmed bookings, or null when unknown.
 */
export async function countUpcomingBookings( scope ) {
	try {
		const from = toUtcInstant( Date.now() );
		const totals = await Promise.all(
			[ 'pending', 'confirmed' ].map( ( status ) =>
				api.get( '/bookings', { ...scope, status, from, per_page: 1 } ).then( ( res ) => Number( res?.total ) || 0 )
			)
		);
		return totals[ 0 ] + totals[ 1 ];
	} catch ( error ) {
		return null;
	}
}

/**
 * The sentence the dialogs append, or '' when there is nothing to say.
 *
 * @param {?number} count Result of {@link countUpcomingBookings}.
 * @return {string} e.g. "3 upcoming bookings keep their slot."
 */
export function upcomingBookingsNote( count ) {
	if ( ! count ) {
		return '';
	}
	return sprintf(
		/* translators: %d: number of upcoming bookings that are not affected by the change. */
		_n( '%d upcoming booking keeps its slot.', '%d upcoming bookings keep their slot.', count, 'aponto' ),
		count
	);
}

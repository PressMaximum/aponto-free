/**
 * Named locations ("branches") for the admin authoring surfaces (D-R63).
 *
 * PRESENCE is the only signal: a surface grows its location control when the site HAS a location
 * row, and is byte-identical to today when it has none. Free has no named-location CRUD, so it has
 * none; Premium with zero locations is the same fresh-install state (§5 invariant 11). Nothing here
 * reads the edition or a module flag (§5 invariant 3) — enforcement stays server-side.
 *
 * `0` is a VALUE, not "none": it is the business / no-location scope every booking, schedule row and
 * eligibility pair has carried since P0 ("All locations" on a schedule or an assignment, "No
 * location" on a booking).
 *
 * No module-level state on purpose: the Location editor's module chunk imports this file too, and a
 * module entry compiles its own copy of every admin lib it touches (handoff 2026-09-21 §2).
 */
import { __, sprintf } from '@wordpress/i18n';
import { api } from './api.js';

/** The wildcard / business scope. */
export const NO_LOCATION = 0;

/** The most catalog pages one read walks (100 locations each) before it stops and says so. */
export const MAX_LOCATION_PAGES = 10;

/**
 * Read the WHOLE location catalog, every status — ONE read per surface (D-R63 fix round 2): active
 * choices AND names of archived branches derive from the same list ({@see activeLocations()}).
 *
 * It walks every page of `GET /locations` — by `total_pages` when the envelope has it, otherwise
 * for as long as a page comes back FULL — up to {@see MAX_LOCATION_PAGES}.
 *
 * The answer says whether it is the WHOLE catalog (fix round 3): `complete: false` when a page
 * failed (the pages read before it are kept) or the ceiling stopped the walk. An incomplete catalog
 * must never pass for an empty one — a surface that WRITES a location (the booking editor's
 * select, the Service editor's branch picker) disables that write and says why; read-only surfaces
 * simply show what they have.
 *
 * @return {Promise<{items: Array<{id: number, name: string, status: string}>, complete: boolean}>}
 */
export async function fetchLocations() {
	const raw = [];
	let complete = true;
	try {
		let page = 1;
		for ( ;; ) {
			const res = await api.get( '/locations', { status: 'all', per_page: 100, page } ); // eslint-disable-line no-await-in-loop
			const items = Array.isArray( res?.items ) ? res.items : [];
			raw.push( ...items );
			const pages = Number( res?.total_pages );
			const more = pages ? page < pages : 100 === items.length;
			if ( ! more ) {
				break;
			}
			if ( page >= MAX_LOCATION_PAGES ) {
				complete = false;
				// eslint-disable-next-line no-console
				console.warn( `Aponto: only the first ${ MAX_LOCATION_PAGES * 100 } locations are listed.` );
				break;
			}
			page += 1;
		}
	} catch {
		complete = false;
	}

	return {
		items: raw
			.map( ( item ) => ( { id: Number( item.id ), name: String( item.name || '' ), status: String( item.status || 'active' ) } ) )
			.filter( ( item ) => item.id > 0 ),
		complete,
	};
}

/**
 * The ACTIVE branches of a catalog — the places that can take a new booking, hours or assignment.
 *
 * @param {Array} locations Catalog items from {@see fetchLocations()}.
 * @return {Array} Active locations, catalog order.
 */
export function activeLocations( locations ) {
	return ( locations || [] ).filter( ( location ) => 'active' === location.status );
}

/**
 * A booking's (or list row's) location id — `0` when it has none or predates the field.
 *
 * @param {Object} item REST list item (`location_id`) or adapted row (`locationId`).
 * @return {number} Location id.
 */
export function bookingLocationId( item ) {
	return Number( item?.location_id ?? item?.locationId ) || NO_LOCATION;
}

/**
 * Whether a booking passes a location filter. `'all'` (or empty) keeps everything; any other value
 * is a location id, `0` included ("No location").
 *
 * @param {Object}        item   Booking.
 * @param {string|number} filter `'all'` or a location id.
 * @return {boolean} Kept.
 */
export function matchesLocationFilter( item, filter ) {
	if ( filter === 'all' || filter === '' || filter === null || filter === undefined ) {
		return true;
	}
	return bookingLocationId( item ) === Number( filter );
}

/**
 * Display name of a location id against a catalog; `0` reads "No location", an id the catalog does
 * not carry reads "Location #N" rather than vanishing.
 *
 * @param {Array}  locations Catalog.
 * @param {number} id        Location id.
 * @return {string} Label.
 */
export function locationLabel( locations, id ) {
	const numeric = Number( id ) || NO_LOCATION;
	if ( NO_LOCATION === numeric ) {
		return __( 'No location', 'aponto' );
	}
	const match = ( locations || [] ).find( ( location ) => location.id === numeric );
	return match?.name || sprintf(
		/* translators: %d: the numeric id of a location that could not be resolved to a name. */
		__( 'Location #%d', 'aponto' ),
		numeric
	);
}

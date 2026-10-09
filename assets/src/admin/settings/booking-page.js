/**
 * Booking-page setting (D-R75) — the pure half of Settings → Booking → Form presentation.
 *
 * `GET /settings` carries the read-mostly object `booking_page` (`id`, `permalink`, `title`,
 * `has_form`, `edit_url`, `unpublished`); SettingsApp flattens it like every other group, so the
 * one writable leaf is the flat key `booking_page.id`. `PUT /settings` treats a body WITHOUT
 * `booking_page` as "leave the page alone" (rest-contract §2.11 addendum D-R75) — which is why
 * {@link flatForSave} sends the object only when the operator actually changed the page: saving an
 * unrelated setting must never rewrite, or clear, the page the onboarding wizard recorded.
 */
import { __ } from '@wordpress/i18n';

/** Flat key of the one writable leaf. */
export const BOOKING_PAGE_KEY = 'booking_page.id';

const GROUP_PREFIX = 'booking_page.';

/**
 * The flat map `PUT /settings` is built from: saved values + edits, minus the read-only
 * `booking_page.*` leaves, plus `booking_page.id` only when it was edited.
 *
 * @param {Object} savedFlat Flattened GET payload.
 * @param {Object} edited    Pending edits by flat key.
 * @return {Object} Flat map to unflatten into the PUT body.
 */
export function flatForSave( savedFlat, edited ) {
	const out = {};
	const merged = { ...( savedFlat || {} ), ...( edited || {} ) };
	Object.keys( merged ).forEach( ( key ) => {
		if ( ! key.startsWith( GROUP_PREFIX ) ) {
			out[ key ] = merged[ key ];
		}
	} );
	if ( edited && Object.prototype.hasOwnProperty.call( edited, BOOKING_PAGE_KEY ) ) {
		out[ BOOKING_PAGE_KEY ] = Number( edited[ BOOKING_PAGE_KEY ] ) || 0;
	}
	return out;
}

/**
 * The saved booking page as an object, read back out of the flattened GET payload.
 *
 * @param {Object} savedFlat Flattened GET payload.
 * @return {{id: number, permalink: string, title: string, hasForm: boolean, editUrl: string, unpublished: boolean}} Saved page.
 */
export function savedBookingPage( savedFlat ) {
	const flat = savedFlat || {};
	return {
		id: Number( flat[ BOOKING_PAGE_KEY ] ) || 0,
		permalink: String( flat[ 'booking_page.permalink' ] || '' ),
		title: String( flat[ 'booking_page.title' ] || '' ),
		hasForm: flat[ 'booking_page.has_form' ] === true,
		editUrl: String( flat[ 'booking_page.edit_url' ] || '' ),
		unpublished: flat[ 'booking_page.unpublished' ] === true,
	};
}

/**
 * URL of core's published-pages collection, derived from Aponto's REST base.
 *
 * With plain permalinks the base is `/index.php?rest_route=/aponto/v1`, which already carries a
 * `?`, so the separator follows the same rule as `lib/api.js` (finding U4-04).
 *
 * @param {string} restUrl Aponto REST base (`…/aponto/v1`).
 * @return {string} URL.
 */
export function pagesUrl( restUrl ) {
	const url = String( restUrl || '' ).replace( /\/?aponto\/v1\/?$/, '' ) + '/wp/v2/pages';
	const query = 'status=publish&per_page=100&orderby=title&order=asc&_fields=id,title';
	return url + ( url.includes( '?' ) ? '&' : '?' ) + query;
}

/** `title.rendered` is HTML — decode its entities into the plain text an `<option>` shows. */
function plainTitle( page ) {
	const html = String( page?.title?.rendered || '' );
	if ( ! html || typeof DOMParser === 'undefined' ) {
		return html;
	}
	return new DOMParser().parseFromString( html, 'text/html' ).documentElement.textContent || '';
}

/**
 * Select options: "None", then the published pages. The saved page is merged in when the list
 * does not carry it (more than 100 pages, or the list failed to load), so the control never
 * silently shows a different choice from the one stored.
 *
 * @param {Array}  pages `wp/v2/pages` items (`{ id, title: { rendered } }`).
 * @param {Object} saved {@link savedBookingPage} result.
 * @return {Array<{value: string, label: string}>} Options.
 */
export function bookingPageOptions( pages, saved ) {
	const list = ( Array.isArray( pages ) ? pages : [] )
		.filter( ( page ) => Number( page?.id ) > 0 )
		.map( ( page ) => ( { value: String( page.id ), label: plainTitle( page ) || `#${ page.id }` } ) );
	if ( saved && saved.id > 0 && ! list.some( ( option ) => option.value === String( saved.id ) ) ) {
		list.unshift( { value: String( saved.id ), label: saved.title || `#${ saved.id }` } );
	}
	return [ { value: '0', label: __( 'None', 'aponto' ) }, ...list ];
}

/**
 * The Dashboard card's boot snapshot (`config.bookingPage`) for a page just saved, so the card
 * is right without a reload. `hasForm` rides along (persona QA 2026-10-05, T-040) so the card can
 * say when the chosen page carries no booking form.
 *
 * @param {Object} saved {@link savedBookingPage} result.
 * @return {Object|null} Boot-shaped page, or null for none.
 */
export function bootBookingPage( saved ) {
	return saved && saved.id > 0
		? { id: saved.id, status: 'publish', url: saved.permalink, editUrl: saved.editUrl, hasForm: saved.hasForm }
		: null;
}

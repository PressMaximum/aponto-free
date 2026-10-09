/**
 * The browser tab title for the admin SPA (first-run QA D26).
 *
 * WordPress prints the title once, server-side, from the menu page — so every Aponto screen read
 * "Dashboard ‹ Site — WordPress" whatever was on it. The SPA now owns the PAGE part and keeps
 * WordPress's own "‹ Site — WordPress" tail exactly as the server rendered it (translated
 * separator included).
 *
 * Two layers, the same house idiom as `nav-guard.js` (a module-level singleton, no context):
 *
 *   - the ROUTE title, set by `App.jsx` on every route change (`setRouteTitle`);
 *   - an optional OVERRIDE pushed by whatever full-page surface is on top — an editor or a module
 *     panel — through `usePageTitle()`. Its parts are PREPENDED to the route title
 *     ("Ana Silva ‹ Staff"), and it is popped when that surface unmounts, so closing an editor
 *     puts the route title back without the route having to know an editor was ever open.
 */
import { useEffect } from 'react';
import { __ } from '@wordpress/i18n';

import { resolveSettingsRoute, settingsSection } from '../settings/ia.js';

/** Titles of the core routes (`CORE_ROUTES`). */
export const ROUTE_TITLES = {
	'import-csv': __( 'CSV import', 'aponto' ),
	dashboard: __( 'Dashboard', 'aponto' ),
	bookings: __( 'Bookings', 'aponto' ),
	calendar: __( 'Calendar', 'aponto' ),
	customers: __( 'Customers', 'aponto' ),
	services: __( 'Services', 'aponto' ),
	events: __( 'Events', 'aponto' ),
	staff: __( 'Staff', 'aponto' ),
	'shared-assets': __( 'Shared assets', 'aponto' ),
	modules: __( 'Modules', 'aponto' ),
	settings: __( 'Settings', 'aponto' ),
};

/**
 * The route layer's parts for a resolved route, most specific first.
 *
 * Settings names its section ("Business ‹ General ‹ Settings"); a module-owned route (D-R56)
 * uses the label it registered; anything else falls back to its core title.
 *
 * @param {string}   route       Resolved route id.
 * @param {string[]} segments    Hash segments.
 * @param {?Object}  moduleRoute The registered route entry owning `route`, if any.
 * @return {string[]} Parts.
 */
export function routeTitleParts( route, segments = [], moduleRoute = null ) {
	if ( moduleRoute && moduleRoute.label ) {
		return [ moduleRoute.label ];
	}
	if ( 'settings' === route ) {
		const { parent, child } = resolveSettingsRoute( segments );
		const section = settingsSection( parent, child );

		return [ section.child?.label, section.parent.label, ROUTE_TITLES.settings ];
	}

	return [ ROUTE_TITLES[ route ] || ROUTE_TITLES.dashboard ];
}

/** WordPress's admin-title separator (`&lsaquo;`). */
const SEPARATOR = ' ‹ ';

let suffix = null;
let routeParts = [];
/** @type {Array<{parts: string[]}>} */
const overrides = [];

/**
 * The "‹ Site — WordPress" tail of a server-rendered admin title.
 *
 * When the separator is not found (a locale that translated the whole pattern), the entire
 * server title is kept as the tail, so the site name is never lost.
 *
 * @param {string} title Server-rendered `document.title`.
 * @return {string} Tail, starting with its separator; '' for an empty title.
 */
export function adminTitleSuffix( title ) {
	const text = String( title || '' ).trim();
	// The bare glyph, not ` ‹ `: a menu page that prints NO page title renders "‹ Site — WordPress"
	// with nothing before the separator.
	const at = text.indexOf( SEPARATOR.trim() );
	if ( at >= 0 ) {
		return ' ' + text.slice( at );
	}

	return text ? SEPARATOR + text : '';
}

/**
 * Compose a full title from page parts, most specific first.
 *
 * @param {string[]} parts Page parts.
 * @param {string}   tail  `adminTitleSuffix()` result.
 * @return {string} Title.
 */
export function composeTitle( parts, tail ) {
	const page = parts.map( ( part ) => String( part || '' ).trim() ).filter( Boolean ).join( SEPARATOR );

	return page ? page + tail : tail.replace( SEPARATOR, '' );
}

function apply() {
	if ( 'undefined' === typeof document ) {
		return;
	}
	if ( null === suffix ) {
		// Captured ONCE, from the title WordPress printed, before the SPA ever wrote one.
		suffix = adminTitleSuffix( document.title );
	}
	const top = overrides.length ? overrides[ overrides.length - 1 ].parts : [];
	document.title = composeTitle( [ ...top, ...routeParts ], suffix );
}

/**
 * Set the route layer.
 *
 * @param {string[]} parts Route title parts, most specific first.
 */
export function setRouteTitle( parts ) {
	routeParts = Array.isArray( parts ) ? parts : [ parts ];
	apply();
}

/**
 * Push a title for the full-page surface this component renders, for as long as it is mounted.
 *
 * @param {string|string[]} parts Parts to prepend to the route title, most specific first.
 */
export function usePageTitle( parts ) {
	const list = ( Array.isArray( parts ) ? parts : [ parts ] ).filter( Boolean );
	const key = list.join( '\u0000' );

	useEffect( () => {
		const entry = { parts: key ? key.split( '\u0000' ) : [] };
		overrides.push( entry );
		apply();

		return () => {
			const at = overrides.indexOf( entry );
			if ( at >= 0 ) {
				overrides.splice( at, 1 );
			}
			apply();
		};
	}, [ key ] );
}

/** Test-only: forget the captured tail and every layer. */
export function resetPageTitleForTests() {
	suffix = null;
	routeParts = [];
	overrides.length = 0;
}

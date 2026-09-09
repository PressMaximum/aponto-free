/**
 * Hash router. WP submenu items deep-link to `admin.php?page=aponto#route`; the
 * app owns the hash and keeps the WP submenu highlight in sync (SPEC-P1 §1.0).
 *
 * Dirty guard (C1 review fix 2): when a form has registered a nav guard, a
 * route-level hash change (nav buttons, WP submenu deep-links, back/forward)
 * is intercepted BEFORE the route state updates — the hash is restored via
 * `replaceState` (fires no hashchange) and the guard decides; on confirm the
 * original target hash is re-applied. Same-route segment changes pass through;
 * the owning route component guards its own sub-navigation.
 */
import { useState, useEffect, useCallback } from 'react';
import { hasNavGuard, requestNav } from './nav-guard.js';

export const ROUTES = [
	'dashboard', 'bookings', 'calendar', 'customers',
	'services', 'events', 'staff', 'shared-assets',
	'modules', 'settings',
];

const LEGACY = { offerings: 'services', resources: 'staff' };

/**
 * Routes whose extra segments open a SEPARATE PAGE, not a tab inside the same screen.
 *
 * The distinction only matters to {@link navTarget}. `#services/categories` is a TAB of the
 * Services screen, so pressing "Services" while it is open is "already here" and must not yank the
 * tab back. `#modules/{code}` is a different page — the module's own settings surface — so pressing
 * "Modules" there is a real navigation BACK to the catalog, and suppressing it makes the nav item
 * look dead (founder report 2026-08-28).
 *
 * @type {string[]}
 */
const DETAIL_PAGE_ROUTES = [ 'modules' ];

export function parseHash( hash = window.location.hash ) {
	const segments = String( hash ).replace( /^#/, '' ).split( '/' ).filter( Boolean );
	// D-R43 removes the standalone Locations surface. Preserve old bookmarks by landing on the
	// separately distributed module's detail page, where Free gets the honest locked state.
	if ( segments[ 0 ] === 'locations' ) {
		return { route: 'modules', segments: [ 'modules', 'multi_location' ] };
	}
	let route = segments[ 0 ] || 'dashboard';
	route = LEGACY[ route ] || route;
	if ( ! ROUTES.includes( route ) ) {
		route = 'dashboard';
	}
	return { route, segments };
}

/**
 * Where a nav intent should move the hash to, or `null` when it is already there.
 *
 * Accepts a bare route (`services`) OR a full deep-link path (`settings/general/business`),
 * so a card action can name the exact surface it opens instead of landing on a route and
 * relying on something downstream to canonicalize it.
 *
 * A BARE route keeps the nav-button contract: re-selecting the route you are already on is
 * "already here" (segment 0 comparison), so "Services" pressed from `#services/categories`
 * never yanks the open tab. A DEEP LINK compares the WHOLE path — the first-segment-only
 * check swallowed every same-route navigation, which is what makes a deep link into an
 * already-open route (`#settings/notifications` → `settings/general/business`) look like a
 * dead button.
 *
 * The segment-0 shortcut has ONE exception, {@link DETAIL_PAGE_ROUTES}: when the open segments
 * are a separate PAGE rather than a tab, pressing the bare route is a real navigation back to the
 * index. Without it, "Modules" pressed from `#modules/{code}` resolved to "already here" and did
 * nothing at all, leaving the panel with no way back to the catalog (founder report 2026-08-28).
 *
 * @param {string} current Current `location.hash` (with or without the leading `#`).
 * @param {string} path    Bare route or deep-link path.
 * @return {string|null} Hash path to assign, or null when the target is already on screen.
 */
export function navTarget( current, path ) {
	const target = String( path ).replace( /^#/, '' );
	const here = String( current ).replace( /^#/, '' );

	if ( target.includes( '/' ) ) {
		return here === target ? null : target;
	}

	const segments = here.split( '/' ).filter( Boolean );
	const sameRoute = segments[ 0 ] === target;
	// Standing on a DETAIL PAGE of the target route, the bare route means "back to the index".
	const onDetailPage = segments.length > 1 && DETAIL_PAGE_ROUTES.includes( target );

	return sameRoute && ! onDetailPage ? null : target;
}

/**
 * The module code of a `#modules/{code}` deep link, or '' for the catalog itself
 * (D-R27). `#modules` stays the read-only catalog; `#modules/{code}` is the module's
 * own settings surface, rendered by `modules/ModuleSettingsRoute.jsx`.
 *
 * The accepted shape is the registry's own `[a-z0-9_]+` — the SAME expression the REST
 * route uses (`Rest\Controller\ModulesController::register()`), so a hash the app treats
 * as a module code is always a code the API would also accept. Anything else answers ''
 * and lands on the catalog rather than on a route that cannot resolve.
 *
 * @param {string[]} segments Hash segments from {@link parseHash}.
 * @return {string} Module code, or '' when the hash is the plain catalog.
 */
export function moduleRouteCode( segments ) {
	if ( ! Array.isArray( segments ) || segments[ 0 ] !== 'modules' ) {
		return '';
	}
	const code = String( segments[ 1 ] || '' );

	return /^[a-z0-9_]+$/.test( code ) ? code : '';
}

export function useRoute() {
	const [ state, setState ] = useState( () => parseHash() );

	useEffect( () => {
		const onHash = ( event ) => {
			const next = parseHash();
			const oldHash = event && event.oldURL && event.oldURL.includes( '#' )
				? '#' + event.oldURL.split( '#' ).slice( 1 ).join( '#' )
				: '';
			if ( hasNavGuard() && parseHash( oldHash ).route !== next.route ) {
				// A dirty form is on screen: restore the previous hash (replaceState
				// fires no hashchange) and let the guard confirm. On confirm the
				// guard has cleared itself, so re-applying the target hash passes.
				const target = window.location.hash;
				window.history.replaceState( null, '', oldHash || '#' );
				requestNav( () => {
					window.location.hash = target.replace( /^#/, '' );
				} );
				return;
			}
			setState( next );
		};
		window.addEventListener( 'hashchange', onHash );
		return () => window.removeEventListener( 'hashchange', onHash );
	}, [] );

	const navigate = useCallback( ( path ) => {
		const target = navTarget( window.location.hash, path );
		if ( null === target ) {
			// Already on screen — still scroll to top for parity with the mockup.
			window.scrollTo( { top: 0, behavior: 'instant' } );
			return;
		}
		window.location.hash = target;
	}, [] );

	return { ...state, navigate };
}

/**
 * Keep the WordPress submenu highlight in sync with the active hash route.
 * Only touches our own `#adminmenu` items (never the rest of the WP chrome).
 */
export function syncWpMenu( route ) {
	const links = document.querySelectorAll( '#adminmenu a[href*="page=aponto"]' );
	links.forEach( ( link ) => {
		const li = link.closest( 'li' );
		if ( ! li ) {
			return;
		}
		const href = link.getAttribute( 'href' ) || '';
		const hash = href.includes( '#' ) ? href.split( '#' )[ 1 ] : 'dashboard';
		const isMatch = hash === route;
		li.classList.toggle( 'current', isMatch );
		if ( isMatch ) {
			link.setAttribute( 'aria-current', 'page' );
		} else {
			link.removeAttribute( 'aria-current' );
		}
	} );
}

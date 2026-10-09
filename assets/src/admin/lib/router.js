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
import { useState, useEffect, useRef, useCallback } from 'react';
import { hasNavGuard, requestNav } from './nav-guard.js';
import { CORE_ROUTES, adminRouteIsOpen, getAdminRoute, subscribeAdminRoutes } from './admin-routes.js';
import { getModules, subscribeModules } from '../modules/module-state.js';

export const ROUTES = CORE_ROUTES;

const LEGACY = { offerings: 'services', resources: 'staff' };

/**
 * Fallbacks for a first segment that names no route at all — the module surface a REMOVED
 * standalone route used to live on, so an old bookmark still lands somewhere truthful.
 *
 * Reached only AFTER the core list and the module-owned registry have both declined, which is
 * what D-R56 inverted: `#locations` resolves to the registered Locations route whenever the
 * Premium bundle contributed one, and falls back to `#modules/multi_location` — the honest
 * locked state — on Free and while the module is switched off (D-R43 was the other way round).
 * The module code here is shared code's ONE unavoidable mention of it: a legacy hash cannot be
 * translated by the registry that no longer holds it.
 *
 * @type {Object<string, string[]>}
 */
const LEGACY_FALLBACK = { locations: [ 'modules', 'multi_location' ] };

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

/**
 * Whether a module-owned route owns this id right now (D-R56).
 *
 * The rules live in ONE place, {@link adminRouteIsOpen}, shared with the header menus so they
 * cannot disagree. Read through the SESSION store rather than the boot snapshot, so a module
 * switched off a moment ago stops resolving without a reload — the same source
 * `modules/ModuleSettingsRoute.jsx` reads.
 *
 * @param {string} id Route id.
 * @return {boolean} Whether a registered, usable route owns this id.
 */
function registeredRouteIsOpen( id ) {
	return adminRouteIsOpen( getAdminRoute( id ), getModules() );
}

export function parseHash( hash = window.location.hash ) {
	const segments = String( hash ).replace( /^#/, '' ).split( '/' ).filter( Boolean );
	let route = segments[ 0 ] || 'dashboard';
	route = LEGACY[ route ] || route;
	// A module-owned route (D-R56) is a route: core ships the registry, the module ships the
	// entry, and this is where the hash router honours it.
	if ( ROUTES.includes( route ) || registeredRouteIsOpen( route ) ) {
		return { route, segments };
	}
	const fallback = LEGACY_FALLBACK[ route ];
	if ( fallback ) {
		return { route: fallback[ 0 ], segments: fallback.slice() };
	}

	return { route: 'dashboard', segments };
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

/**
 * The booking id of a `#bookings/{id}` deep link, or 0 (persona QA 2026-10-05).
 *
 * `{admin_booking_link}` in the staff mails and the "Booking: AP-…" link on an external order both
 * point at `admin.php?page=aponto#bookings/{id}`, which landed on the list with nothing open. Only
 * a bare positive integer in the second segment is a booking: `#bookings/payment/pending` keeps
 * its own meaning (the payment facet, `bookings/BookingsTable.jsx` `deepLinkFilters`), and
 * anything else is the plain list.
 *
 * @param {string[]} segments Hash segments from {@link parseHash}.
 * @return {number} Booking id, or 0 when the hash names none.
 */
export function bookingRouteId( segments ) {
	if ( ! Array.isArray( segments ) || segments[ 0 ] !== 'bookings' || segments.length !== 2 ) {
		return 0;
	}
	const raw = String( segments[ 1 ] );

	return /^[1-9]\d{0,17}$/.test( raw ) ? Number( raw ) : 0;
}

/**
 * "The operator pressed the nav item of the route that is already on screen" (persona QA
 * 2026-10-05, T-076).
 *
 * {@link navTarget} answers `null` for that press, and for a list screen that is right: there is
 * nowhere to go. But Services and Staff open their full-page editors from LOCAL STATE without
 * moving the hash, so with an editor open the hash still reads `#services` — and pressing
 * "Services", in the header or in the WordPress sidebar, did nothing at all. Three testers read
 * that as a dead menu; the only ways out were Cancel and a reload.
 *
 * The router cannot close an editor it does not own, so it ANNOUNCES the press and the owning
 * route decides ({@link useRouteReselect}): it runs its own Cancel path, discard question
 * included. A DOM event rather than a module-level callback list, for the reason
 * `lib/editor-guards.js` gives — a module bundle compiles its own copy of this file.
 */
export const RESELECT_EVENT = 'aponto-admin-route-reselect';

/**
 * @param {string} route Bare route id that was re-selected.
 */
function announceReselect( route ) {
	if ( typeof window === 'undefined' || typeof window.CustomEvent !== 'function' ) {
		return;
	}
	window.dispatchEvent( new window.CustomEvent( RESELECT_EVENT, { detail: { route } } ) );
}

/**
 * The bare route a click on one of OUR WordPress submenu links points at, or '' when the click is
 * not one (another plugin's link, a modified click that opens a new tab, a deep link).
 *
 * @param {Event} event Click event.
 * @return {string} Bare route id, or ''.
 */
export function wpMenuClickRoute( event ) {
	if ( ! event || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ) {
		return '';
	}
	const link = event.target?.closest?.( '#adminmenu a[href*="page=aponto"]' );
	if ( ! link ) {
		return '';
	}
	const href = link.getAttribute( 'href' ) || '';
	const hash = href.includes( '#' ) ? href.split( '#' )[ 1 ] : 'dashboard';
	return hash.includes( '/' ) ? '' : LEGACY[ hash ] || hash;
}

/**
 * Run `handler` when the operator re-selects `route` while it is already on screen.
 *
 * @param {string}   route   Bare route id this component owns.
 * @param {Function} handler Called with no arguments; read through a ref, so its identity may
 *                           change on every render without re-subscribing.
 */
export function useRouteReselect( route, handler ) {
	const handlerRef = useRef( handler );
	handlerRef.current = handler;
	useEffect( () => {
		const onReselect = ( event ) => {
			if ( event?.detail?.route === route ) {
				handlerRef.current?.();
			}
		};
		window.addEventListener( RESELECT_EVENT, onReselect );
		return () => window.removeEventListener( RESELECT_EVENT, onReselect );
	}, [ route ] );
}

export function useRoute() {
	const [ state, setState ] = useState( () => parseHash() );
	// The route on screen, readable from the listeners below without re-subscribing on every
	// navigation. Assigned during render, the same idiom `App.jsx` uses for its menu-open mirrors.
	const routeRef = useRef( state.route );
	routeRef.current = state.route;

	useEffect( () => {
		/**
		 * Whether the FIRST reconcile is behind us. The landing hash is deliberately never
		 * rewritten: a module bundle is a second script tag and may not have registered yet, so
		 * canonicalizing `#locations` to its fallback on mount would destroy the hash the operator
		 * actually asked for microseconds before the bundle got its chance — and direct landing on
		 * `#locations` is precisely what the registry exists to make work. The trade-off is that on
		 * Free the address bar keeps saying `#locations` while the module page renders, which is
		 * exactly the behaviour D-R43 already shipped.
		 */
		let mounted = false;

		/**
		 * THE single route transition, for every reason the resolved route can change (D-R56).
		 *
		 * Three of them now: a hash change, a module bundle REGISTERING its route after the SPA
		 * parsed the landing hash, and a module being switched off under an open screen. They all
		 * come through here because the dirty-form guard and the URL/menu reconciliation below must
		 * apply to all three — a store-driven transition that skipped the guard would unmount a
		 * dirty Settings form without asking, which is the whole reason the guard exists.
		 *
		 * @param {string} [restoreHash] Hash to restore while the guard decides. Present only for a
		 *                               hash change: the store paths moved no hash, so there is
		 *                               nothing to put back.
		 */
		const settle = ( restoreHash ) => {
			const next = parseHash();

			if ( hasNavGuard() && next.route !== routeRef.current ) {
				// A dirty form is on screen. For a hash change, restore the previous hash first
				// (replaceState fires no hashchange) so the URL matches the screen while the guard
				// decides; on confirm the guard has cleared itself, so re-applying the target hash
				// passes. A store-driven change moved no hash, so it just re-resolves on confirm.
				const target = window.location.hash;
				if ( undefined !== restoreHash ) {
					window.history.replaceState( null, '', restoreHash || '#' );
				}
				requestNav( () => {
					if ( undefined === restoreHash ) {
						settle();
						return;
					}
					window.location.hash = target.replace( /^#/, '' );
				} );
				return;
			}

			// The hash no longer names what it resolves to — a legacy fallback (`#locations` with
			// no registered route), or a module switched off while its screen was open. Move the
			// URL so the address bar, `syncWpMenu()`'s highlight and the rendered route agree
			// instead of leaving a hash that points at a screen nobody is on. `replaceState` fires
			// no hashchange and adds no history entry, so Back still leaves for wherever the
			// operator came from rather than bouncing off this hash again. Never on the first
			// reconcile — see `mounted` above.
			const path = next.segments.join( '/' );
			if ( mounted && path !== window.location.hash.replace( /^#/, '' ) ) {
				window.history.replaceState( null, '', '#' + path );
			}

			setState( ( current ) => (
				current.route === next.route && current.segments.join( '/' ) === next.segments.join( '/' )
					? current
					: next
			) );
		};

		const onHash = ( event ) => {
			const oldHash = event && event.oldURL && event.oldURL.includes( '#' )
				? '#' + event.oldURL.split( '#' ).slice( 1 ).join( '#' )
				: '';
			settle( oldHash );
		};

		// A WordPress submenu link for the route ALREADY on screen. Its hash is usually the hash
		// already in the address bar, so the browser fires no `hashchange` and the click was a
		// no-op; announce it like the header nav's own re-select (T-076). Never prevents the
		// default: when the hash does differ (`#services/12` → `#services`) the navigation runs
		// as before.
		const onMenuClick = ( event ) => {
			const target = wpMenuClickRoute( event );
			if ( '' !== target && target === routeRef.current ) {
				announceReselect( target );
			}
		};
		document.addEventListener( 'click', onMenuClick );
		window.addEventListener( 'hashchange', onHash );
		const offRoutes = subscribeAdminRoutes( () => settle() );
		const offModules = subscribeModules( () => settle() );
		// Reconcile once on mount too: a module bundle can register between the initial parse
		// (render) and this subscription (effect), and that window is the race the registry
		// exists for.
		settle();
		mounted = true;

		return () => {
			window.removeEventListener( 'hashchange', onHash );
			document.removeEventListener( 'click', onMenuClick );
			offRoutes();
			offModules();
		};
	}, [] );

	const navigate = useCallback( ( path ) => {
		const target = navTarget( window.location.hash, path );
		if ( null === target ) {
			// Already on screen. Say so, so a route with a full-page editor open over its list can
			// return to the list (T-076)…
			announceReselect( String( path ).replace( /^#/, '' ) );
			// …and still scroll to top for parity with the mockup.
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
export function syncWpMenu( route, segments = [] ) {
	// A booking deep link is still the Bookings screen: keep its submenu item highlighted.
	const path = segments.length && ! bookingRouteId( segments ) ? segments.join( '/' ) : route;
	const links = document.querySelectorAll( '#adminmenu a[href*="page=aponto"]' );
	links.forEach( ( link ) => {
		const li = link.closest( 'li' );
		if ( ! li ) {
			return;
		}
		const href = link.getAttribute( 'href' ) || '';
		const hash = href.includes( '#' ) ? href.split( '#' )[ 1 ] : 'dashboard';
		const isMatch = hash === path;
		li.classList.toggle( 'current', isMatch );
		if ( isMatch ) {
			link.setAttribute( 'aria-current', 'page' );
		} else {
			link.removeAttribute( 'aria-current' );
		}
	} );
}

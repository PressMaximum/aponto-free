/**
 * Admin ROUTE registry — the admin SPA's extension point for a module that owns a whole
 * screen rather than a settings panel (D-R56, extension-surface §3.3).
 *
 * The sibling of `lib/module-panels.js`, and deliberately its twin: a separately enqueued
 * module bundle (`assets/src/{pro,modules}/{code}/index.js`) cannot `import` from the SPA
 * entry, so the two meet on a stable global — core publishes the registration function,
 * the bundle calls it.
 *
 * WHY A REGISTRY RATHER THAN A NAV ARRAY. Hard-coding a premium screen into the three
 * free-shipped nav lists (`App.jsx`, `router.js`, `AdminPage::registerMenu()`) would put an
 * edition-owned control inside the wp.org archive, which D-R41 forbids. Core therefore ships
 * the registry and the separately distributed bundle ships the ENTRY. On Free the registry is
 * empty, so there is no menu item, no route and no fake control — nothing to gate, because
 * nothing is there.
 *
 * This file is FREE-SHIPPED and generic: it names no module, no edition and no entitlement.
 * It is a keyed store of route descriptors. WHICH of them may be shown is decided by
 * `App.jsx` from the boot-data `available` flag the server computed with `Plan::has()`, and
 * enforcement itself lives in REST (§5 invariant 3, UI gating is display-only).
 *
 * CONTRACT for a module bundle:
 *
 *     window.apontoAdmin.registerAdminRoute( {
 *         id: 'locations',            // hash route, `[a-z0-9-]+`, never a core route
 *         group: 'resources',         // which header dropdown lists it
 *         label: 'Locations',
 *         description: '…',           // the dropdown subline
 *         moduleCode: 'multi_location',
 *         after: 'staff',             // item to follow inside the group; '' appends
 *         component: LazyScreen,      // <component segments onNavigate module />
 *     } );
 *
 * `component` must use the SAME React instance as the SPA, which the shared `wp.element`
 * webpack externals guarantee for every entry.
 *
 * LOAD ORDER is tolerated in both directions, exactly as the panel registry tolerates it:
 * `publish()` is idempotent and a descriptor dropped into `window.apontoAdmin.adminRoutes`
 * before the SPA evaluated is adopted rather than lost.
 *
 * SUBSCRIBABLE, which the panel registry is not, and that difference is the point. A module
 * bundle is a SECOND script tag: it evaluates after the SPA has already parsed the landing
 * hash and rendered once. Landing directly on `#locations` therefore has to survive a route
 * that did not exist at first paint — so the registry notifies, `useRoute()` re-parses and the
 * nav menus re-render instead of quietly leaving the operator on the dashboard.
 */
import { useSyncExternalStore } from 'react';

import { findModuleRecord } from '../modules/catalog.js';

/** Stable global namespace, the object `AdminPage::bootConfig()` already injects. */
const GLOBAL_KEY = 'apontoAdmin';

/** Property on that object holding the plain-object route mirror (also the pre-boot drop box). */
const ROUTES_KEY = 'adminRoutes';

/**
 * The CORE routes of the admin shell, in menu order — the one list `router.js` resolves a
 * hash against and the denominator of the collision rule below.
 *
 * It lives HERE rather than in `router.js` so the registry can refuse an id that would
 * shadow a core screen without importing the router (which imports this file). One list, no
 * cycle.
 *
 * @type {string[]}
 */
export const CORE_ROUTES = [
	'dashboard', 'bookings', 'calendar', 'customers',
	'services', 'events', 'staff', 'shared-assets',
	'modules', 'settings', 'import-csv',
];

/** The two header dropdowns a contributed route may join (`App.jsx`). */
const GROUPS = [ 'offerings', 'resources' ];

/**
 * Authoritative store, keyed by route id. A module-scoped Map rather than the global itself,
 * so a later reassignment of `window.apontoAdmin` — which the boot-data inline script does on
 * every page load — cannot silently empty the registry the running SPA reads from.
 *
 * @type {Map<string, Object>}
 */
const routes = new Map();

/** @type {Set<Function>} */
const listeners = new Set();

/**
 * Cached list of the registered descriptors, in registration order.
 *
 * Recomputed ONLY when the store changes, because `useSyncExternalStore` compares snapshots
 * by identity: a fresh array on every read is an infinite render loop, not a re-render.
 *
 * @type {Object[]}
 */
let snapshot = [];

/** The global object to publish onto, or null when there is none (SSR / node tests). */
function host() {
	if ( typeof window !== 'undefined' ) {
		return window;
	}
	return typeof globalThis !== 'undefined' ? globalThis : null;
}

/** A route id is the hash shape the router accepts — hyphens, never underscores. */
function isRouteId( id ) {
	return typeof id === 'string' && /^[a-z0-9-]+$/.test( id );
}

/** A module code is the registry's own shape, the same one `module-panels.js` accepts. */
function isCode( code ) {
	return typeof code === 'string' && /^[a-z0-9_]+$/.test( code );
}

/**
 * Validate one descriptor, or null when it may not be registered.
 *
 * Five refusals, all of them about a claim the registry cannot honour rather than about
 * entitlement: a malformed id would not route, a core id would shadow a shipped screen, an
 * unknown group has no menu to appear in, a non-function cannot be rendered, and a malformed
 * module code can never match a boot-data record so the route could never be shown.
 *
 * `label` and `description` are COERCED instead: presentation copy that is missing or of the
 * wrong type degrades to the id and an empty subline, which is a readable menu — refusing the
 * whole screen over a missing string would not be.
 *
 * @param {Object} entry Raw descriptor from the module bundle.
 * @return {Object|null} Normalized descriptor, or null when refused.
 */
function normalize( entry ) {
	if ( ! entry || typeof entry !== 'object' ) {
		return null;
	}
	const { id, group, moduleCode, component } = entry;
	if ( ! isRouteId( id ) || CORE_ROUTES.includes( id ) ) {
		return null;
	}
	if ( ! GROUPS.includes( group ) || typeof component !== 'function' || ! isCode( moduleCode ) ) {
		return null;
	}

	return {
		id,
		group,
		label: typeof entry.label === 'string' && entry.label ? entry.label : id,
		description: typeof entry.description === 'string' ? entry.description : '',
		moduleCode,
		// Placement inside the group, mirroring `ModuleMenuItem::after` on the PHP side so the
		// header dropdown and the WordPress submenu put the item in the SAME place. Anything that
		// is not an id-shaped string degrades to '' (append), never to a refusal: a screen is worth
		// more than its position.
		after: isRouteId( entry.after ) ? entry.after : '',
		component,
	};
}

/**
 * Place registered routes among a group's static core items (D-R56).
 *
 * Pure and exported so `App.jsx` and the tests share one answer. Without it the registered item
 * simply landed at the end of the dropdown — after the "Shared assets" Premium PLACEHOLDER — while
 * the WordPress submenu correctly put it straight after Staff, so the same product showed the
 * operator two different information architectures (browser QA, 2026-09-21).
 *
 * An entry follows the item its `after` names, which may be a core id OR an already-placed
 * registered one; an unknown or empty anchor appends. Two entries naming the SAME anchor keep
 * registration order rather than reversing it, which is why the insertion point skips past
 * siblings already placed against that anchor.
 *
 * @param {Object[]} core    Static group items (`{ id, label, description, badge }`).
 * @param {Object[]} entries Registered descriptors of this group, in registration order.
 * @return {Object[]} One ordered list.
 */
export function orderAdminRouteItems( core, entries ) {
	const merged = Array.isArray( core ) ? core.slice() : [];
	if ( ! Array.isArray( entries ) ) {
		return merged;
	}

	entries.forEach( ( entry ) => {
		const anchor = merged.findIndex( ( item ) => item.id === entry.after );
		if ( anchor < 0 ) {
			merged.push( entry );
			return;
		}
		let at = anchor + 1;
		while ( at < merged.length && merged[ at ].after === entry.after ) {
			at += 1;
		}
		merged.splice( at, 0, entry );
	} );

	return merged;
}

/** Recompute the stable snapshot and notify every subscriber. */
function refresh() {
	snapshot = Array.from( routes.values() );
	listeners.forEach( ( listener ) => listener( snapshot ) );
}

/**
 * Publish the registration API onto the global, adopting anything a bundle already dropped
 * there. Idempotent: safe to call on every import and after any load order.
 *
 * @return {Object|null} The global namespace object, or null when there is no global.
 */
function publish() {
	const scope = host();
	if ( ! scope ) {
		return null;
	}
	if ( ! scope[ GLOBAL_KEY ] || typeof scope[ GLOBAL_KEY ] !== 'object' ) {
		scope[ GLOBAL_KEY ] = {};
	}
	const namespace = scope[ GLOBAL_KEY ];

	// Adopt a pre-boot drop box: a bundle that ran before this module was evaluated can only
	// have written the plain object, never called the (not yet published) function.
	const mirror = namespace[ ROUTES_KEY ];
	if ( mirror && typeof mirror === 'object' ) {
		let adopted = false;
		Object.keys( mirror ).forEach( ( id ) => {
			if ( routes.has( id ) ) {
				return;
			}
			const descriptor = normalize( mirror[ id ] );
			if ( descriptor && descriptor.id === id ) {
				routes.set( id, descriptor );
				adopted = true;
			}
		} );
		if ( adopted ) {
			refresh();
		}
	} else {
		namespace[ ROUTES_KEY ] = {};
	}

	namespace.registerAdminRoute = registerAdminRoute;
	namespace.getAdminRoute = getAdminRoute;
	namespace.listAdminRoutes = listAdminRoutes;

	return namespace;
}

/**
 * Register a module-owned admin route.
 *
 * A later registration for the same id REPLACES the earlier one: a page carries at most one
 * bundle per module, so a second call means a reload, not a second screen.
 *
 * @param {Object}   entry             Route descriptor.
 * @param {string}   entry.id          Hash route (`[a-z0-9-]+`), not a core route.
 * @param {string}   entry.group       `offerings` or `resources`.
 * @param {string}   [entry.label]     Menu label (defaults to the id).
 * @param {string}   [entry.description] Menu subline.
 * @param {string}   entry.moduleCode  Owning module's registry code.
 * @param {Function} entry.component   Component rendered as `<component segments onNavigate module />`.
 * @return {boolean} Whether the route was accepted.
 */
export function registerAdminRoute( entry ) {
	const descriptor = normalize( entry );
	if ( ! descriptor ) {
		return false;
	}
	routes.set( descriptor.id, descriptor );

	const namespace = publish();
	if ( namespace && namespace[ ROUTES_KEY ] && typeof namespace[ ROUTES_KEY ] === 'object' ) {
		namespace[ ROUTES_KEY ][ descriptor.id ] = descriptor;
	}
	refresh();

	return true;
}

/**
 * The descriptor registered for a route id, or null when none is loaded.
 *
 * `null` is a NORMAL answer: on Free — and on any build whose module bundle is absent — every
 * id answers null, which is exactly what makes the hash fall back instead of rendering a
 * screen that is not there.
 *
 * @param {string} id Route id.
 * @return {Object|null} Route descriptor.
 */
export function getAdminRoute( id ) {
	return ( isRouteId( id ) && routes.get( id ) ) || null;
}

/**
 * Every registered route, optionally narrowed to one group.
 *
 * @param {string} [group] `offerings` or `resources`.
 * @return {Object[]} Route descriptors, in registration order.
 */
export function listAdminRoutes( group ) {
	if ( undefined === group ) {
		return snapshot;
	}

	return snapshot.filter( ( entry ) => entry.group === group );
}

/**
 * Whether a registered route may actually be entered on this site — THE one predicate every
 * surface asks, so the header menus, the hash router and the rendered screen cannot disagree.
 *
 * Two terms, and the second is the JS half of the PHP allow-list (D-R56):
 *
 *   1. `available` — the boot-data flag the server computed with `Plan::has()`. Free, a
 *      downgraded site and a module switched off all answer false.
 *   2. `menu` — the registry slug that module is GRANTED, published in the same boot record.
 *      `AdminPage::mergeMenuItems()` already refuses a contributed WordPress submenu whose slug
 *      is not the registry's; without this term the SPA was laxer than the server, and any
 *      available module could have claimed any route id. Now both halves read one allow-list.
 *
 * Boot data older than this bundle carries no `menu` at all, so the comparison fails and the
 * route stays closed. That is the conservative answer and the same posture `lib/config.js` takes
 * on `available`: a half-rebuilt dev tree shows no screen rather than a broken one.
 *
 * Display only — REST re-checks every read and write (§5 invariant 3).
 *
 * @param {Object} entry   Route descriptor from this registry.
 * @param {Array}  modules Module records (boot data or the session store).
 * @return {boolean} Whether the route may be listed and entered.
 */
export function adminRouteIsOpen( entry, modules ) {
	if ( ! entry ) {
		return false;
	}
	const record = findModuleRecord( { modules }, entry.moduleCode );

	return record?.available === true && record.menu === entry.id;
}

/**
 * Subscribe to registry changes.
 *
 * @param {Function} listener Called with the new descriptor list.
 * @return {Function} Unsubscribe.
 */
export function subscribeAdminRoutes( listener ) {
	if ( typeof listener !== 'function' ) {
		return () => {};
	}
	listeners.add( listener );

	return () => listeners.delete( listener );
}

/**
 * The registered routes, re-rendering the caller when a bundle registers one.
 *
 * `useSyncExternalStore` rather than the `useState` + `useEffect( subscribe )` idiom of
 * `modules/module-state.js`: a module bundle can register in the window BETWEEN this render
 * and the effect that would subscribe, and the effect idiom loses exactly that registration —
 * which is the one case this registry exists for.
 *
 * @return {Object[]} Route descriptors.
 */
export function useAdminRoutes() {
	return useSyncExternalStore( subscribeAdminRoutes, listAdminRoutes, listAdminRoutes );
}

/** Drop every registered route. Test seam only. */
export function resetAdminRoutes() {
	routes.clear();
	listeners.clear();
	snapshot = [];
	const scope = host();
	if ( scope?.[ GLOBAL_KEY ] && typeof scope[ GLOBAL_KEY ] === 'object' ) {
		scope[ GLOBAL_KEY ][ ROUTES_KEY ] = {};
	}
}

publish();

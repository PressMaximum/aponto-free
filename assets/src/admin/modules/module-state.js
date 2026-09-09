/**
 * Live module records for the whole SPA session (D-R31 fix, 2026-08-29).
 *
 * WHY THIS EXISTS. The catalog's toggle first kept its optimistic result in route-local
 * `useState` inside `ModulesApp`, layered over the static `config.modules` boot snapshot. That
 * works exactly as long as the route stays mounted — and the Modules section is precisely where
 * it does not: hash-navigating to a panel unmounts `ModulesApp`, the state dies with it, and
 * every consumer falls back to the boot snapshot until a full document reload. Two real symptom
 * pairs came out of that, both reported from the assembled preview:
 *
 *   - disable a module → open a panel → go back to `#modules`: the card reads Enabled again,
 *     AND the disabled module's panel route still mounts its editor, which then fetches a route
 *     the server has stopped serving and shows a raw `rest_no_route` banner;
 *   - enable a module → open its panel without reloading: the route insists the module "is not
 *     available on this site".
 *
 * The state was never wrong — it was scoped to the wrong lifetime. It belongs to the SESSION,
 * not to a route, so it lives here: a module-level singleton, the same house idiom as
 * `lib/nav-guard.js` and `lib/module-panels.js`. No context, no new dependency.
 *
 * A fresh document load re-seeds from boot data, which the server already computes correctly —
 * this store only has to keep the CURRENT page honest between reloads.
 */
import { useEffect, useState } from '@wordpress/element';

import { config } from '../lib/config.js';
import { moduleToggleAllowed } from './catalog.js';

/**
 * Session records, seeded lazily from boot data.
 *
 * @type {Array|null}
 */
let records = null;

/** @type {Set<Function>} */
const listeners = new Set();

/** The live records, seeding from the boot snapshot on first read. */
export function getModules() {
	if ( records === null ) {
		records = Array.isArray( config.modules ) ? config.modules.slice() : [];
	}

	return records;
}

/**
 * Apply a module's new switch position to the session view.
 *
 * `available` moves WITH `enabled` — but only for a module this build may actually toggle. That
 * flag is `Plan::has()` server-side, and the user switch is one of its terms; the other terms
 * (edition, shipped-ness) cannot change without a reload, so for a toggle-eligible module
 * `available` reduces to `enabled`. Deriving it here is what makes the card, the subnav and the
 * panel route's availability gate agree instantly, since all three key on `available`.
 *
 * A module that is NOT toggle-eligible keeps its boot `available` untouched: nothing in this
 * session can legitimately change it.
 *
 * @param {string}  code    Module code.
 * @param {boolean} enabled New switch position.
 */
export function applyModuleEnabled( code, enabled ) {
	records = getModules().map( ( mod ) => {
		if ( mod?.code !== code ) {
			return mod;
		}
		const eligible = moduleToggleAllowed( mod, config.planEdition );

		return {
			...mod,
			enabled,
			available: eligible ? enabled : mod.available,
		};
	} );

	listeners.forEach( ( listener ) => listener( records ) );
}

/**
 * Subscribe to session changes.
 *
 * @param {Function} listener Called with the new records.
 * @return {Function} Unsubscribe.
 */
export function subscribeModules( listener ) {
	listeners.add( listener );

	return () => listeners.delete( listener );
}

/**
 * The live records, re-rendering the caller when they change.
 *
 * Every module surface reads through this — the catalog cards, the section subnav and the panel
 * route's availability gate — so they cannot disagree about a module's state within a session.
 *
 * @return {Array} Module records.
 */
export function useModules() {
	const [ state, setState ] = useState( getModules );

	useEffect( () => subscribeModules( setState ), [] );

	return state;
}

/** Drop the session view so the next read re-seeds from boot data. Test seam only. */
export function resetModuleState() {
	records = null;
	listeners.clear();
}

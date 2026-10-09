/**
 * The ONE write path behind every module on/off control (D-R57).
 *
 * Two surfaces switch a module: the catalog switch (`ModulesApp.jsx`, D-R31) and the "Enable
 * module" action on a switched-off module's own page (`ModuleSettingsRoute.jsx`). They must be
 * the same write — same route, same optimistic apply, same rollback, same words, same reload — or
 * the two places an owner can turn a module on behave differently. So the write lives here and
 * both import it.
 *
 * WHY NOT `module-state.js`: that file is in the ADMIN ENTRY (the router and four routes read the
 * session store), and `admin.min.js` is budget-capped in CI (§6). This file is only ever imported
 * from `admin-chunk-modules`, so the REST call and its copy ride the lazy chunk with the screens
 * that use them.
 *
 * MODULE-LEVEL STATE IS SAFE HERE, and that is a claim that has to be checked rather than assumed
 * (handoff 2026-09-21 §2: two webpack entries are two module instances, which is what broke
 * `lib/toast.jsx` and `lib/nav-guard.js`). The in-flight latch below is a module-level `let`, and
 * it stays correct because this file is imported ONLY by `ModulesApp.jsx` and
 * `ModuleSettingsRoute.jsx` — both in `admin-chunk-modules`, both in the admin entry's graph. No
 * module bundle (`assets/src/pro/{code}`, `assets/src/modules/{code}`) imports it, and none may:
 * a second copy would be a second latch, i.e. no latch at all. If a module bundle ever needs this
 * write, the latch moves onto `window.apontoAdmin` FIRST, the way the two files above did.
 *
 * ONE WRITE PER MODULE AT A TIME (Codex round 2, HIGH). `PUT /modules/{code}` responses can resolve
 * out of order: ON then quickly OFF meant the older ON answer overwrote the newer OFF in the
 * session store — and scheduled a reload for a module that is now off — while a failing older
 * request rolled the store back to a position captured before the newer success. The optimistic
 * apply cannot be made order-safe by itself, so the second write is simply refused: a code with a
 * request in flight answers `{ ok: false, busy: true }`, changes nothing and says nothing, and both
 * surfaces render that module's control disabled for the duration. DIFFERENT modules are
 * unaffected — the latch is per code, because there is no ordering relationship between them.
 *
 * THE RELOAD IS AUTOMATIC, and it is the SAME reload the catalog has performed since 2026-09-04 —
 * D-R57 only widened WHICH modules get it (`enablingNeedsReload()` in catalog.js carries both
 * reasons). It goes through `requestNav()` (Codex round 2, HIGH): "the toggle surfaces hold no
 * form" is true when the switch is clicked and NOT necessarily 600 ms later, by which time the
 * operator can be typing in the Staff editor. The dirty guard is the app's one answer to that
 * question, so the scheduled reload asks it like any other navigation. Declining is safe: the
 * module is already enabled server-side and the next page load picks it up.
 *
 * TONE (D-R64): every "enabled" toast — with or without the reload — is `success`; "disabled" is
 * the neutral `default`; a refusal is `danger`.
 *
 * ORDERING MATTERS (unchanged from the original): the session state is applied FIRST so a blocked
 * or slow reload still leaves the switch honest, and the toast gets a beat to paint — a message the
 * reload eats is not a message.
 */
import { useEffect, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

import { api } from '../lib/api.js';
import { requestNav } from '../lib/nav-guard.js';
import { MODULE_META, enablingNeedsReload } from './catalog.js';
import { applyModuleEnabled, getModules } from './module-state.js';

/** How long the toast gets to paint before the document goes away. */
const RELOAD_DELAY_MS = 600;

/**
 * Module codes with a write in flight — see the latch note above.
 *
 * An ARRAY rather than a Set so subscribers get a new identity on every change and a React
 * consumer re-renders, the same idiom as `module-state.js`.
 *
 * @type {string[]}
 */
let writing = [];

/** @type {Set<Function>} */
const listeners = new Set();

/** The module's display name, or the raw code when the catalog has no entry for it. */
export function moduleLabel( code ) {
	return MODULE_META[ code ]?.label || code;
}

/** Whether a write for this module is in flight (or its reload is pending). */
export function isModuleBusy( code ) {
	return writing.indexOf( code ) !== -1;
}

/**
 * Take or release the latch, notifying subscribers only on a real change.
 *
 * @param {string}  code Module code.
 * @param {boolean} busy Whether a write is now in flight.
 */
function setModuleBusy( code, busy ) {
	if ( busy === isModuleBusy( code ) ) {
		return;
	}
	writing = busy ? [ ...writing, code ] : writing.filter( ( entry ) => entry !== code );
	listeners.forEach( ( listener ) => listener( writing ) );
}

/**
 * The codes currently being written, re-rendering the caller when they change.
 *
 * @return {string[]} Module codes.
 */
export function useModuleBusy() {
	const [ state, setState ] = useState( () => writing );

	useEffect( () => {
		listeners.add( setState );

		return () => listeners.delete( setState );
	}, [] );

	return state;
}

/** Drop the latch so the next write starts clean. Test seam only. */
export function resetModuleWrites() {
	writing = [];
	listeners.clear();
}

/**
 * Flip a module, optimistically, and say what happened.
 *
 * The switch (or the page) moves immediately and SNAPS BACK with the server's own message if the
 * write is refused — a control that silently lies about server state is worse than a slow one.
 * The success toast is the missing half of that: before D-R57 a toggle that WORKED said nothing
 * at all unless it also reloaded, so the only feedback most toggles ever gave was a failure.
 *
 * Never rejects. A toast is feedback about a write, and a caller resetting its busy flag must not
 * have to guard an unhandled rejection to do it.
 *
 * @param {string}    code       Module code.
 * @param {boolean}   next       Requested switch position.
 * @param {Function} [showToast] `useToast()` writer.
 * @param {Function} [reload]    TEST SEAM ONLY — how to reload the document. Nothing in the app
 *                               passes it; jsdom makes `window.location.reload` non-configurable,
 *                               so the reload is otherwise unassertable.
 * @return {Promise<{ok: boolean, busy: boolean, enabled: boolean, reloading: boolean}>} What
 *         happened. `busy` means the call was refused because this module already had a write in
 *         flight — nothing was sent, changed or said. `reloading` tells a caller not to clear its
 *         own busy state: this document is on its way out.
 */
export function setModuleEnabled( code, next, showToast, reload ) {
	const record = getModules().find( ( mod ) => mod?.code === code ) || null;
	const previous = record?.enabled === true;
	const label = moduleLabel( code );

	// Refused, silently: the operator's own first click is still being answered, and a toast about
	// a request that was never sent would be noise about nothing.
	if ( isModuleBusy( code ) ) {
		return Promise.resolve( { ok: false, busy: true, enabled: previous, reloading: false } );
	}

	setModuleBusy( code, true );
	applyModuleEnabled( code, next );

	return api.put( `/modules/${ code }`, { enabled: next } ).then(
		( res ) => {
			// Trust the server's answer over the optimistic guess.
			const enabled = res?.enabled === true;
			applyModuleEnabled( code, enabled );

			if ( enabled && enablingNeedsReload( record, enabled ) ) {
				showToast?.(
					sprintf(
						/* translators: %s: module name, e.g. "Multiple locations". */
						__( '%s enabled — reloading to load its screens.', 'aponto' ),
						label
					),
					'success'
				);
				// The latch is HELD across the delay: until this document is replaced the module is
				// mid-change, and a second toggle in that window would race the reload.
				window.setTimeout( () => {
					const release = () => setModuleBusy( code, false );
					requestNav(
						() => {
							release();
							( reload || ( () => window.location.reload() ) )();
						},
						release
					);
				}, RELOAD_DELAY_MS );

				return { ok: true, busy: false, enabled, reloading: true };
			}

			setModuleBusy( code, false );
			// D-R64: ON is the `success` tone (green check); OFF stays neutral — switching a module off
			// is not a success state, and a refusal is `danger` below.
			showToast?.(
				enabled
					? sprintf(
						/* translators: %s: module name, e.g. "Multiple staff". */
						__( '%s enabled.', 'aponto' ),
						label
					)
					: sprintf(
						/* translators: %s: module name, e.g. "Multiple staff". */
						__( '%s disabled.', 'aponto' ),
						label
					),
				enabled ? 'success' : 'default'
			);

			return { ok: true, busy: false, enabled, reloading: false };
		},
		( err ) => {
			applyModuleEnabled( code, previous );
			setModuleBusy( code, false );
			showToast?.( err?.message || __( 'The module could not be updated.', 'aponto' ), 'danger' );

			return { ok: false, busy: false, enabled: previous, reloading: false };
		}
	);
}

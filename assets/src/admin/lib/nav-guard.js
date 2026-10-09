/**
 * In-app navigation guard (C1 review fix 2 — SPEC-P1 §1.6 dirty settings).
 *
 * A form that holds unsaved edits registers a guard handler; every in-app
 * navigation (hash-route change in the router, Settings sub-tab switch) asks
 * the guard before proceeding instead of silently unmounting the form. The
 * guard OWNS the confirm UI (a wp-components ConfirmDialog rendered by the
 * registering form): it receives `(proceed, cancel)` and calls exactly one of
 * them after the user decides.
 *
 * TWO WEBPACK ENTRIES MEAN TWO MODULE INSTANCES (D-R56 fix round 1). The slot used to be a
 * module-level `let guard`, which is correct only while every reader and every writer is compiled
 * into the SAME bundle. A module entry (`assets/src/pro/{code}`, `assets/src/modules/{code}`)
 * cannot import from the admin entry, so webpack gives it its OWN copy of this file and its own
 * `guard` variable: the Locations editor called `setNavGuard()` on the module's copy while
 * `router.js` in `admin.js` kept reading its own — `hasNavGuard()` was permanently false, and the
 * header nav left a dirty editor without asking (browser-confirmed three times). It is the exact
 * failure `lib/toast.jsx` hit for the exact same reason.
 *
 * The fix is the same one `toast.jsx`, `lib/module-panels.js` and `lib/admin-routes.js` use: the
 * two bundles meet on the ONE thing they genuinely share, the `window.apontoAdmin` global. Every
 * copy of this module reads and writes THAT slot, so there is only ever one guard in the
 * application no matter how many copies of the code exist. Without a global (node tests, SSR) a
 * module-local slot takes over, which is byte-for-byte the previous behaviour.
 *
 * The public API is unchanged — `setNavGuard`, `clearNavGuard`, `hasNavGuard`, `requestNav`, and
 * the clear-only-if-still-mine rule that stops a stale unmount removing a newer guard.
 *
 * Deliberately a single-slot registry: only one guarded form exists at a time
 * in the admin. Framework-free so the contract is unit-testable
 * (tests/js/nav-guard.test.js).
 *
 * FULL-DOCUMENT NAVIGATION IS COVERED HERE TOO (D-R58 fix round, Codex review). The header used to
 * say browser reload/close was "the kit `useDirtyState` beforeunload's job" — it is not: nothing in
 * `assets/src` installs a `beforeunload` listener at all, on any screen. So a reload, a closed tab,
 * or ANY other WordPress admin menu item (a real link, not a hash) discarded a dirty Settings,
 * Locations, Staff or Service editor in silence, while the identical in-app navigation asked first.
 * A guard registered here now also raises the browser's own leave-page prompt, which covers all
 * four screens at once precisely because they all register through this one module.
 *
 * The listener is installed WITH the guard and removed when the slot clears, never kept
 * permanently: a `beforeunload` listener that is always present disables the back/forward cache in
 * some browsers, so a clean page must carry none. It reads the SHARED slot rather than a
 * module-local variable, and it is installed through a shared flag, so N compiled copies of this
 * file add exactly ONE listener and any copy's guard arms it.
 */

/** Stable global namespace, the object `AdminPage::bootConfig()` already injects. */
const GLOBAL_KEY = 'apontoAdmin';

/**
 * Property the single guard slot lives on.
 *
 * Underscored because it is machinery, not boot data: nothing outside this module may read it, and
 * the name says so to anyone inspecting `window.apontoAdmin` in a console.
 */
const GUARD_KEY = '__navGuard';

/**
 * Property holding the ONE installed `beforeunload` listener, so every compiled copy of this file
 * can see that the listener already exists — and can remove the exact function reference that was
 * added, which is the only thing `removeEventListener` accepts. Same underscored, private-machinery
 * naming as {@link GUARD_KEY}.
 */
const UNLOAD_KEY = '__navGuardUnload';

/** Fallback slot for an environment with no global (node tests, SSR). */
let localGuard = null;

/** Fallback listener slot for an environment with no global. */
let localUnload = null;

/** The global object to publish onto, or null when there is none. */
function host() {
	if ( typeof window !== 'undefined' ) {
		return window;
	}

	return typeof globalThis !== 'undefined' ? globalThis : null;
}

/** The shared namespace object, created on demand, or null when there is no global. */
function namespaceObject() {
	const scope = host();
	if ( ! scope ) {
		return null;
	}
	if ( ! scope[ GLOBAL_KEY ] || typeof scope[ GLOBAL_KEY ] !== 'object' ) {
		scope[ GLOBAL_KEY ] = {};
	}

	return scope[ GLOBAL_KEY ];
}

/** The currently registered handler, from whichever slot this environment has. */
function currentGuard() {
	const namespace = namespaceObject();
	const guard = namespace ? namespace[ GUARD_KEY ] : localGuard;

	return typeof guard === 'function' ? guard : null;
}

/** The installed `beforeunload` listener, from whichever slot this environment has. */
function currentUnload() {
	const namespace = namespaceObject();
	const installed = namespace ? namespace[ UNLOAD_KEY ] : localUnload;

	return typeof installed === 'function' ? installed : null;
}

/**
 * Write the shared listener slot.
 *
 * @param {Function|null} listener Listener or null.
 */
function storeUnload( listener ) {
	const namespace = namespaceObject();
	if ( ! namespace ) {
		localUnload = listener;

		return;
	}
	if ( null === listener ) {
		delete namespace[ UNLOAD_KEY ];

		return;
	}
	namespace[ UNLOAD_KEY ] = listener;
}

/**
 * Ask the browser to confirm a full-document navigation while a form is dirty.
 *
 * Reads the SHARED slot, never a module-local variable: the copy of this file that happened to
 * install the listener is not necessarily the copy a module chunk registers its guard on, and a
 * listener that consulted its own `localGuard` would be permanently blind to the other one — the
 * exact split D-R56 fixed for the in-app half.
 *
 * Both signals, because engines disagree about which one they honour for a listener added with
 * `addEventListener`: Chromium reads `preventDefault()`, Firefox and Safari read a set
 * `returnValue`. The string is never shown — every current browser uses its own wording — so it is
 * deliberately empty rather than a message nobody will read. The listener returns nothing: a
 * returned string only counts for `window.onbeforeunload =`, which this module does not use,
 * because assigning that property would silently replace any other plugin's handler.
 *
 * @param {BeforeUnloadEvent} event The event.
 */
function onBeforeUnload( event ) {
	if ( ! currentGuard() ) {
		return;
	}
	event.preventDefault();
	event.returnValue = '';
}

/** Install the ONE listener, unless some copy of this module already did. */
function installUnloadListener() {
	const scope = host();
	if ( ! scope || typeof scope.addEventListener !== 'function' || currentUnload() ) {
		return;
	}
	scope.addEventListener( 'beforeunload', onBeforeUnload );
	storeUnload( onBeforeUnload );
}

/**
 * Remove the installed listener, whichever copy of this module installed it.
 *
 * The reference comes from the shared slot, so a guard registered by the Locations module chunk and
 * cleared by the admin entry (or the reverse) still takes the listener down with it — and a clean
 * page is left with no `beforeunload` listener at all, which is what keeps the back/forward cache
 * available.
 */
function removeUnloadListener() {
	const installed = currentUnload();
	if ( ! installed ) {
		return;
	}
	const scope = host();
	if ( scope && typeof scope.removeEventListener === 'function' ) {
		scope.removeEventListener( 'beforeunload', installed );
	}
	storeUnload( null );
}

/**
 * Write the shared slot, and keep the `beforeunload` listener's lifetime equal to the guard's.
 *
 * Both halves move together HERE rather than in the two exported functions, so there is no way to
 * add a write path that arms one and not the other.
 *
 * @param {Function|null} handler Handler or null.
 */
function storeGuard( handler ) {
	const namespace = namespaceObject();
	if ( ! namespace ) {
		localGuard = handler;
	} else if ( null === handler ) {
		delete namespace[ GUARD_KEY ];
	} else {
		namespace[ GUARD_KEY ] = handler;
	}

	if ( null === handler ) {
		removeUnloadListener();

		return;
	}
	installUnloadListener();
}

/**
 * Register the active guard handler. Replaces any previous handler.
 *
 * @param {(proceed: () => void, cancel?: () => void) => void} handler Guard.
 */
export function setNavGuard( handler ) {
	storeGuard( typeof handler === 'function' ? handler : null );
}

/**
 * Unregister a handler — only if it is still the active one, so a stale
 * cleanup (unmount racing a re-register) never removes a newer guard.
 *
 * @param {Function} handler The handler passed to setNavGuard.
 */
export function clearNavGuard( handler ) {
	if ( currentGuard() === handler ) {
		storeGuard( null );
	}
}

/** Whether a guard is currently registered (i.e. some form is dirty). */
export function hasNavGuard() {
	return null !== currentGuard();
}

/**
 * Run a navigation intent through the guard. No guard → proceed immediately.
 * With a guard, the handler decides: it calls `proceed()` (after discarding)
 * or `cancel()` (stay put; e.g. restore the previous hash).
 *
 * @param {() => void} proceed Commit the navigation.
 * @param {() => void} [cancel] Roll the navigation back (optional).
 */
export function requestNav( proceed, cancel ) {
	const guard = currentGuard();
	if ( ! guard ) {
		proceed();

		return;
	}
	guard( proceed, cancel );
}

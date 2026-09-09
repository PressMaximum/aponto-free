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
 * Deliberately a single-slot registry: only one guarded form exists at a time
 * in the admin (the Settings schema form). Framework-free so the contract is
 * unit-testable (tests/js/nav-guard.test.js). Browser reload/close is the kit
 * `useDirtyState` beforeunload's job — this module covers IN-APP navigation.
 */

let guard = null;

/**
 * Register the active guard handler. Replaces any previous handler.
 *
 * @param {(proceed: () => void, cancel?: () => void) => void} handler Guard.
 */
export function setNavGuard( handler ) {
	guard = typeof handler === 'function' ? handler : null;
}

/**
 * Unregister a handler — only if it is still the active one, so a stale
 * cleanup (unmount racing a re-register) never removes a newer guard.
 *
 * @param {Function} handler The handler passed to setNavGuard.
 */
export function clearNavGuard( handler ) {
	if ( guard === handler ) {
		guard = null;
	}
}

/** Whether a guard is currently registered (i.e. some form is dirty). */
export function hasNavGuard() {
	return null !== guard;
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
	if ( ! guard ) {
		proceed();
		return;
	}
	guard( proceed, cancel );
}

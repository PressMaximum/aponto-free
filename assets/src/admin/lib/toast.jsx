/**
 * Lightweight toast. The mockup toasts often mark a REST boundary or the result
 * of a write (sent/suppressed notify, deleted, saved). One live toast at a time.
 *
 * TWO WEBPACK ENTRIES MEAN TWO MODULE INSTANCES, so React context alone is not enough here
 * (found reviewing D-R56). A module bundle (`assets/src/pro/{code}`, `assets/src/modules/{code}`)
 * cannot import from the admin entry, so webpack compiles it its OWN copy of this file — with
 * its own `ToastContext` object. A component from that copy rendered inside the SPA's tree reads
 * ITS context, never the one `ToastProvider` populated, so it silently fell back to the default.
 * That is exactly the failure the Locations screen would have shipped: every save, delete and
 * error message from the module's own components disappearing with no console trace.
 *
 * The fix is the same one `lib/module-panels.js` and `lib/admin-routes.js` use for the same
 * reason: the two bundles meet on the ONE thing they genuinely share, the `window.apontoAdmin`
 * global. The mounted provider publishes its `showToast` there, and the context DEFAULT is a
 * stable bridge that forwards to it. So:
 *
 *   - a component under the real provider gets the provider's own function, exactly as before —
 *     no global lookup, no behaviour change;
 *   - a component from a second bundle's copy gets the bridge, which reaches the one mounted
 *     toast region;
 *   - with no provider mounted at all (tests, SSR) the bridge is a no-op, which is what the
 *     previous default was.
 *
 * THREE TONES (D-R64): `default` (neutral), `danger` (the copy turns the danger colour) and
 * `success` — the copy is unchanged and a green check (`aria-hidden`, the message is the whole
 * announcement) is painted before it. `success` marks a state the operator asked for and now has
 * (a module enabled); it is not "a write that worked" in general, so a module DISABLED stays
 * neutral. The bridge forwards the tone verbatim, so a second bundle's copy can raise any of the
 * three.
 */
import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { renderIcon } from './icon.jsx';

/** Stable global namespace, the object `AdminPage::bootConfig()` already injects. */
const GLOBAL_KEY = 'apontoAdmin';

/** Property the mounted provider publishes its writer on. */
const TOAST_KEY = 'showToast';

/** The global object to publish onto, or null when there is none (SSR / node tests). */
function host() {
	if ( typeof window !== 'undefined' ) {
		return window;
	}
	return typeof globalThis !== 'undefined' ? globalThis : null;
}

/**
 * The context default: forward to whichever provider is mounted, through the shared global.
 *
 * A module constant, so it is referentially stable and a consumer never re-renders because the
 * default changed. Silently does nothing when no provider is mounted — a toast is feedback, and
 * failing to show one must never break the write it was reporting on.
 *
 * @param {string} message Toast copy.
 * @param {string} [tone]  `default`, `danger` or `success` (D-R64).
 */
function bridgeToast( message, tone ) {
	const writer = host()?.[ GLOBAL_KEY ]?.[ TOAST_KEY ];
	if ( typeof writer === 'function' ) {
		writer( message, tone );
	}
}

const ToastContext = createContext( bridgeToast );

export function useToast() {
	return useContext( ToastContext );
}

export function ToastProvider( { children } ) {
	const [ toast, setToast ] = useState( null );
	const timer = useRef( null );

	const showToast = useCallback( ( message, tone = 'default' ) => {
		if ( ! message ) {
			return;
		}
		setToast( { message, tone } );
		if ( timer.current ) {
			clearTimeout( timer.current );
		}
		timer.current = setTimeout( () => setToast( null ), 3200 );
	}, [] );

	// Publish the writer for consumers that live in another bundle's copy of this module.
	// Cleared on unmount ONLY when it is still ours, so a remount racing this teardown never
	// removes the newer provider's writer (the same rule `lib/nav-guard.js` applies).
	useEffect( () => {
		const scope = host();
		if ( ! scope ) {
			return undefined;
		}
		if ( ! scope[ GLOBAL_KEY ] || typeof scope[ GLOBAL_KEY ] !== 'object' ) {
			scope[ GLOBAL_KEY ] = {};
		}
		scope[ GLOBAL_KEY ][ TOAST_KEY ] = showToast;

		return () => {
			if ( scope[ GLOBAL_KEY ] && scope[ GLOBAL_KEY ][ TOAST_KEY ] === showToast ) {
				delete scope[ GLOBAL_KEY ][ TOAST_KEY ];
			}
		};
	}, [ showToast ] );

	return (
		<ToastContext.Provider value={ showToast }>
			{ children }
			<div className={ `ap-toast${ toast ? ' is-visible' : '' }` } role="status" aria-live="polite">
				{ toast && toast.tone === 'success' ? renderIcon( 'check' ) : null }
				{ toast ? <span className={ toast.tone === 'danger' ? 'ap-toast-danger' : undefined }>{ toast.message }</span> : null }
			</div>
		</ToastContext.Provider>
	);
}

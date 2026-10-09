/**
 * One request per press (persona QA 2026-10-05, T-065 / T-066 / T-067).
 *
 * Every Save in the admin disabled its button from a `saving` STATE, and state only reaches the
 * DOM on the next render. Two taps that land in the same frame — routine on a phone, where a
 * double tap is ~80 ms — both ran the handler while `saving` still read `false`, so both posted:
 * two identical services, two identical time-off blocks, business hours stored twice.
 *
 * A ref is synchronous. `useInFlight()` returns `run( task )`, which starts `task` only when no
 * earlier one is still pending and releases when it settles — whether it resolved, rejected,
 * threw, or returned early without a promise. A refused call returns `undefined` and does nothing:
 * no request, no toast, no validation pass.
 *
 * The `saving` state stays where it was — it is still what paints "Saving…" and the disabled
 * button — this only closes the window before that paint.
 */
import { useRef, useCallback } from 'react';

/**
 * The guard itself, outside React, so it can be unit-tested under plain node.
 *
 * @param {{current: boolean}} flag Mutable in-flight flag.
 * @param {Function}           task The work; may return a promise.
 * @return {*} What `task` returned (a promise when it was async), or `undefined` when refused.
 */
export function runOnce( flag, task ) {
	if ( flag.current ) {
		return undefined;
	}
	flag.current = true;
	let result;
	try {
		result = task();
	} catch ( error ) {
		flag.current = false;
		throw error;
	}
	if ( result && typeof result.then === 'function' ) {
		const release = () => {
			flag.current = false;
		};
		// Release on either outcome WITHOUT swallowing a rejection the caller may be awaiting.
		result.then( release, release );
		return result;
	}
	flag.current = false;
	return result;
}

/**
 * @return {Function} `run( task )` — see {@link runOnce}.
 */
export function useInFlight() {
	const flag = useRef( false );
	return useCallback( ( task ) => runOnce( flag, task ), [] );
}

/**
 * The TWO dirty-editor guards a full-page record editor needs, as one hook (D-R58).
 *
 * `routes/Staff.jsx` and `routes/Services.jsx` open their editors with NO guard of any kind —
 * no `setNavGuard`, no `beforeunload`, not even a question on Cancel — so the header nav, the
 * WordPress submenu and a hand-edited hash all discarded unsaved edits in silence. That is the
 * follow-up the founder delegated in
 * `docs/handoffs/multi-location-slice-1-2-handoff-2026-09-21.md` §4: "Reproduce first; if real,
 * give Staff (and Service) the same two guards Locations has."
 *
 * "The same two guards" is the point, so this is the LOCATIONS shape (D-R56, fix rounds 1–3),
 * extracted rather than copied:
 *
 *   1. **Cross-route** — `lib/nav-guard.js`. `router.js` runs every ROUTE change through it, so
 *      Bookings / Settings / a WP submenu item for another screen all ask first. The registering
 *      effect is keyed on the DIRTY FLAG and on stable callbacks, never dependency-free: a
 *      no-dependency effect re-registers on the re-render the dialog itself causes, so by the time
 *      the operator answers, the handler being cleared is not the handler that is registered, the
 *      clear-only-if-still-mine rule makes `clearNavGuard()` a no-op, and "Discard" re-asks
 *      forever. That bug was shipped once in `LocationEditor` and is not repeated here.
 *
 *   2. **Same-route** — router.js's own header reserves this to the route ("Same-route segment
 *      changes pass through; the owning route component guards its own sub-navigation"). It is a
 *      RENDER-TIME HOLD plus a MOUNT-LIFETIME listener, and it cannot be anything else: in a real
 *      browser `router.js`'s `hashchange` listener runs first, the browser takes a microtask
 *      checkpoint BETWEEN listeners, React flushes, and any listener owned by a re-running effect
 *      has already been torn down before its turn comes (QA instrumented this for D-R56 round 3;
 *      jsdom hides it, because a script-dispatched event has no checkpoint between listeners).
 *      So the hold is what protects the editor — {@link useEditorGuards} simply does not advance
 *      `shownPath`, and the editor is never unmounted — while the listener exists only to notice
 *      a SECOND attempt, which produces no prop change at all because the router's own state
 *      still holds the target.
 *
 * WHAT COUNTS AS A SAME-ROUTE EXIT IS THE CALLER'S TO SAY (`isExit`), and that is the one real
 * difference from Locations. `#locations/{id}` OWNS the Locations editor, so any other
 * `locations/*` path is an exit. Staff and Services open their editors from LOCAL STATE without
 * touching the hash (`#staff` stays put while the workspace is on screen), so most same-route
 * hashes there change no surface and destroy nothing — asking about them would be a dialog for a
 * navigation that is not happening. Each route names the moves that genuinely replace its open
 * editor and stays silent about the rest.
 *
 * NO MODULE-LEVEL STATE, deliberately (handoff §2): a module bundle is compiled its own copy of
 * every `assets/src/admin/lib/*` file it imports, so anything kept here would silently split in
 * two. Everything this hook owns lives in React state and refs, i.e. per mounted component; the
 * one genuinely shared slot is `nav-guard.js`'s, which already lives on `window.apontoAdmin`.
 * That is what would let `LocationsRoute` / `LocationEditor` adopt this hook later from inside
 * a module entry's own lazy chunk — not done in this change, which touches neither file.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { clearNavGuard, setNavGuard } from './nav-guard.js';

/** Stable empty default, so an omitted `segments` prop does not churn `hashPath`. */
const NO_SEGMENTS = [];

/**
 * The default `isExit`: no same-route hash change replaces this route's editor.
 *
 * @return {boolean} Always false.
 */
function neverExits() {
	return false;
}

/**
 * The record a `{route}/{id}` hash path names, or '' when it names none.
 *
 * Shared by the routes that need it, so "which record does this hash mean" has one answer. The
 * routes narrow it further — Services only accepts digits, because its second segment is also
 * where its tab ids live.
 *
 * @param {string} path Hash path, without the leading `#`.
 * @return {string} The second segment, or ''.
 */
export function hashRecord( path ) {
	const parts = String( path || '' ).split( '/' ).filter( Boolean );

	return parts[ 1 ] ? String( parts[ 1 ] ) : '';
}

/**
 * Guard one full-page record editor against both kinds of in-app navigation.
 *
 * @param {Object}   options               Hook options.
 * @param {string[]} [options.segments]    The router's hash segments for this route.
 * @param {boolean}  [options.dirty]       Whether the OPEN editor holds unsaved edits. False when
 *                                         no editor is open — the route reports it up from the
 *                                         editor's own dirty computation.
 * @param {Function} options.confirm       `confirm( opts )` from `lib/confirm.jsx`. Stable.
 * @param {Function} options.discardPrompt `() => opts` — the question, in the editor's own words,
 *                                         so both guards ask it identically. Must be stable
 *                                         (a module-level function), because it keys the
 *                                         registering effect.
 * @param {Function} [options.isExit]      `( nextPath ) => boolean` — whether this same-route move
 *                                         would replace or unmount the open editor. ONE argument
 *                                         on purpose (fix round 2): the answer must be decided
 *                                         against the RECORD THE ROUTE ACTUALLY HAS OPEN, never
 *                                         against the last path this hook was shown. Browser QA
 *                                         found the difference the hard way — see the note on
 *                                         {@link useEditorGuards}'s hold below. Read through a
 *                                         ref, so its identity may change freely.
 * @param {Function} [options.onDiscard]   Called synchronously when a confirmed discard leaves
 *                                         THIS route on screen (the same-route path). The route
 *                                         must use it to RESET the editor — bumping the key it
 *                                         renders the editor with is the honest way — because a
 *                                         discard that leaves the typed text in the form is not a
 *                                         discard. See the stranding note below.
 * @return {{shownPath: string, release: () => void}} `shownPath` is the hash path the surface on
 *         screen corresponds to — the route resolves its deep link / tab from THIS, not from
 *         `segments`, which is what makes the hold protect anything. `release()` drops the guard
 *         synchronously and marks the editor as leaving, for the paths the route settles itself
 *         (Save, a confirmed Cancel): without it the guard would still be registered when the
 *         close assigns a new hash, and the operator would be asked about a departure they just
 *         approved.
 */
export function useEditorGuards( {
	segments = NO_SEGMENTS,
	dirty = false,
	confirm,
	discardPrompt,
	isExit = neverExits,
	onDiscard,
} ) {
	// The operator has answered (or saved) and this editor is on its way out. It stops counting as
	// dirty from that moment, so the guard cannot RE-REGISTER between the answer and the editor
	// actually going — which would ask the same question a second time on the very navigation that
	// was just approved (the D-R56 round-1 guard-lifecycle bug).
	//
	// THE LATCH MUST NOT OUTLIVE THE TRANSITION IT WAS SET FOR (fix round 2). Browser QA found a
	// dirty editor left permanently UNGUARDED and still visibly dirty: a discard was confirmed for
	// a target that then replaced nothing, the editor never unmounted, so it never reported clean,
	// so the "drops when clean" rule below never fired. Two things close that off — `leavingFor`,
	// which retires the latch the moment the surface on screen IS the target it was set for, and
	// `onDiscard`, which makes the editor genuinely clean again. Either alone would do; together
	// the stranded state is unreachable, and the worst case if one ever failed is a guard that
	// re-arms too eagerly rather than an editor that silently loses work.
	const [ leaving, setLeaving ] = useState( false );
	const guarded = Boolean( dirty ) && ! leaving;
	/** The path the current latch was set for, or null when the caller named none. */
	const leavingFor = useRef( null );

	/**
	 * Release whatever guard is CURRENTLY registered, whoever registered it.
	 *
	 * Reads the ref, never a closure's own handler: a closure that has been waiting on a dialog
	 * holds a handler the next render already replaced, and `clearNavGuard( stale )` is a no-op
	 * under the only-if-still-mine rule — which is precisely how the round-1 Locations editor
	 * intercepted the navigation the operator had just approved, forever.
	 *
	 * EVERY `release()` must be paired with an unmount or a reset. The route's own close paths
	 * unmount the editor; the same-route discard below resets it through `onDiscard`. A `release()`
	 * with neither leaves an editor holding edits that nothing is guarding.
	 *
	 * @param {string|null} [target] Hash path this release is for, when there is one. The latch
	 *                               retires as soon as that path is the surface on screen.
	 */
	const guardRef = useRef( null );
	const release = useCallback( ( target = null ) => {
		if ( guardRef.current ) {
			clearNavGuard( guardRef.current );
			guardRef.current = null;
		}
		leavingFor.current = 'string' === typeof target ? target : null;
		setLeaving( true );
	}, [] );

	// GUARD 1 — CROSS-ROUTE (lib/nav-guard.js, honoured by router.js's `settle()`).
	//
	// Keyed on `[ guarded ]` and three stable callbacks, exactly like `settings/SettingsApp.jsx`:
	// the handler only ASKS A QUESTION, so it never needs a fresh closure over the form, and
	// re-registering it on every render is the bug, not the safety margin.
	useEffect( () => {
		if ( ! guarded ) {
			return undefined;
		}
		const handler = ( proceed, cancel ) => {
			confirm( discardPrompt() ).then( ( ok ) => {
				if ( ! ok ) {
					cancel?.();

					return;
				}
				// Unregister SYNCHRONOUSLY — `leaving` only settles on the next render, and the
				// resumed hash assignment re-enters the router before that.
				release();
				proceed();
			} );
		};
		guardRef.current = handler;
		setNavGuard( handler );

		return () => {
			clearNavGuard( handler );
			if ( guardRef.current === handler ) {
				guardRef.current = null;
			}
		};
	}, [ guarded, confirm, discardPrompt, release ] );

	// GUARD 2, PART 1 — THE RENDER-TIME HOLD.
	//
	// `shownPath` is the surface ON SCREEN, and it is STATE: when the incoming segments name a
	// different same-route path that WOULD replace the open editor, this render simply does not
	// advance it, so the editor is never unmounted and the form state — the thing being protected —
	// survives. A clean editor, or a move that replaces nothing, just follows.
	//
	// The trigger is the PREVIOUS props value, not `shownPath`: after a decline the router keeps
	// holding the target, and reacting to that standing disagreement would re-ask on every
	// unrelated re-render. The JUDGEMENT, though, is `isExit( hashPath )` alone — it is not given
	// `shownPath`, because deciding against the last path is what browser QA found broken (fix
	// round 2): Back from `#staff/3` to `#staff` is a non-exit, so the hold advanced `shownPath` to
	// `staff`, and pressing Forward straight back to `#staff/3` then looked like "another record's
	// deep link" and asked the operator to discard the record they were already editing. The route
	// knows which record is open; only that can answer the question.
	const hashPath = ( Array.isArray( segments ) ? segments : NO_SEGMENTS ).join( '/' );
	const [ shownPath, setShownPath ] = useState( hashPath );
	const [ pendingPath, setPendingPath ] = useState( null );
	const previousHash = useRef( hashPath );
	// Readable from the mount-lifetime listener below without re-subscribing. Assigned during
	// render, the same idiom `router.js` uses for its own route mirror.
	const shownRef = useRef( shownPath );
	shownRef.current = shownPath;
	const guardedRef = useRef( guarded );
	guardedRef.current = guarded;
	const isExitRef = useRef( isExit );
	isExitRef.current = isExit;
	// Read through a ref for the same reason: the route rebuilds this callback whenever the record
	// it has open changes, and the prompt effect must not be re-keyed by that.
	const onDiscardRef = useRef( onDiscard );
	onDiscardRef.current = onDiscard;
	// The target the operator has already refused. Without it, "Keep editing" would be re-asked on
	// the next render, because the router's own state still points at that target.
	const declined = useRef( null );

	if ( hashPath !== previousHash.current ) {
		previousHash.current = hashPath;
		if ( hashPath !== shownPath ) {
			if ( guarded && isExit( hashPath ) ) {
				if ( declined.current !== hashPath ) {
					// Ask (part 2). Deliberately NOT advancing `shownPath`: the editor stays mounted.
					setPendingPath( hashPath );
				}
			} else {
				setShownPath( hashPath );
			}
		}
	}

	// RETIRE THE LATCH (fix round 2). Two independent conditions, because each covers a case the
	// other cannot: the transition the latch was set for has been APPLIED — the surface on screen
	// is now that target, so whatever was going to happen has happened — or some editor is
	// reporting clean again, which is how the paths that name no target (a confirmed Cancel, a
	// cross-route discard, a Save) retire theirs. Waiting only for the clean report is what left a
	// dirty editor permanently unguarded when the discard replaced nothing.
	useEffect( () => {
		if ( ! leaving ) {
			return;
		}
		if ( ! dirty || ( null !== leavingFor.current && shownPath === leavingFor.current ) ) {
			leavingFor.current = null;
			setLeaving( false );
		}
	}, [ leaving, dirty, shownPath ] );

	// GUARD 2, PART 2 — THE PROMPT.
	//
	// `pendingPath` IS the latch: it is set once by the hold (or by the listener in part 3), and
	// while it is non-null neither path can set it again, so two triggers for one move cannot stack
	// two dialogs. The hash is put back with `replaceState`, which fires no event and therefore
	// cannot re-enter anything.
	//
	// On DISCARD the target is applied here rather than left to the router, because the router's
	// state very often already holds it — that is how this route heard about the move at all — and
	// would answer a re-navigation with "already here".
	useEffect( () => {
		if ( ! pendingPath ) {
			return undefined;
		}
		let live = true;
		window.history.replaceState( null, '', '#' + shownRef.current );
		confirm( discardPrompt() ).then( ( ok ) => {
			if ( ! live ) {
				return;
			}
			if ( ! ok ) {
				// Stay. The hash is already back; remember the refusal so the standing prop
				// disagreement does not re-ask on the next render.
				declined.current = pendingPath;
				setPendingPath( null );

				return;
			}
			// The latch is named for THIS target, so it retires the moment the target is on screen
			// — whether or not anything unmounted.
			release( pendingPath );
			// DISCARD MEANS DISCARD (fix round 2). Applying the target usually replaces the editor
			// on its own, but it is not guaranteed to: a hand-edited hash can name a record the
			// list does not hold (the `per_page: 100` window), and then nothing remounts and the
			// operator is left looking at the very text they asked to throw away. The route resets
			// the editor for us, which is also what puts the sub-sections' drafts — work hours,
			// time off, staff assignments — back where they were.
			onDiscardRef.current?.();
			declined.current = null;
			setShownPath( pendingPath );
			setPendingPath( null );
			window.location.hash = pendingPath;
		} );

		return () => {
			live = false;
		};
	}, [ pendingPath, confirm, discardPrompt, release ] );

	// GUARD 2, PART 3 — THE REPEATED ATTEMPT.
	//
	// Once part 2 has restored the hash, the router's state still holds the target while the URL
	// says editor — so a SECOND Back (or a second hand-edit to the same hash) produces no prop
	// change at all and the hold has nothing to react to. This listener is the only thing that can
	// notice it.
	//
	// Registered ONCE for the life of the route (`[]`), never re-registered by a render: that is
	// exactly the mistake round 2 made, where a re-render tore the listener down before the browser
	// reached it. Everything it needs is a ref, so there is nothing for a dependency array to
	// invalidate. It tolerates arriving after the hold has already handled the same event —
	// `pendingPath` is set, and the updater leaves it alone.
	useEffect( () => {
		const onHash = () => {
			const now = window.location.hash.replace( /^#/, '' );
			if ( now === shownRef.current || ! guardedRef.current ) {
				return;
			}
			// A different ROUTE is `router.js`'s guard (which works); asking here too would prompt
			// twice for one navigation.
			if ( now.split( '/' )[ 0 ] !== shownRef.current.split( '/' )[ 0 ] ) {
				return;
			}
			if ( ! isExitRef.current( now ) ) {
				return;
			}
			// A fresh attempt deserves a fresh question, even one the operator refused before.
			declined.current = null;
			setPendingPath( ( current ) => current || now );
		};

		window.addEventListener( 'hashchange', onHash );

		return () => window.removeEventListener( 'hashchange', onHash );
	}, [] );

	return { shownPath, release };
}

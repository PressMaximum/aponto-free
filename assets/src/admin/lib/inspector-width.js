/**
 * Shared in-flow inspector width: the user's stored PREFERENCE, and the width actually
 * rendered for the space that exists right now.
 *
 * The mockup states the contract (docs/mockups/v4/plugin-dashboard/SPEC.md, "Shared quick
 * views"): the inspector is "resizable from 320px to 520px while preserving at least 360px
 * for main content", and "a temporary narrow viewport clamps only the rendered width and must
 * not overwrite that preference."
 *
 * Neither half was implemented. The clamp was a pure pixel range with no idea how much room
 * existed, measured once at mount and never again, and the grid track beside it was
 * `minmax(0, 1fr)` against the inspector's `minmax(344px, …)` floor — so every pixel a
 * narrower window took came out of the LIST, down to nothing. On a 1100px window the Customers
 * list fell to 554px: the toolbar broke into a stack, the table's 1046px of columns collapsed
 * into a 514px scroller showing Name/Email and nothing else, and the pagination and New
 * customer button were pushed out of view (beta report 2026-09-17).
 *
 * So the rendered width answers to three limits at once — the stored preference, the 360px the
 * list is owed, and a 45% share of the workspace — and is recomputed whenever the workspace is
 * resized. The preference itself is only ever written by a deliberate drag or key press.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/** Narrowest inspector a user can choose. */
export const MIN_W = 320;
/** Widest inspector a user can choose. */
export const MAX_W = 520;
/** Opening width for a route with no stored preference. */
export const DEFAULT_W = 380;
/** Main content is owed this much before the inspector may take anything (SPEC). */
export const MIN_MAIN_W = 360;
/** The grid's separator track, which also sits between the two panes. */
export const RESIZER_W = 6;
/**
 * Hard share cap. The 360px rule alone still allows a 520px inspector to take 55% of a 940px
 * workspace; the list is then technically "preserved" and practically unusable. Whichever of the
 * two limits binds first, wins.
 */
export const MAX_SHARE = 0.45;
/**
 * At or below this container width the stylesheet stops splitting the workspace into columns and
 * STACKS the inspector above the list (`@container bookings-page (max-width:840px)`), which is
 * what SPEC.md calls the narrow dashboard breakpoint: "the inspector stacks before the main pane,
 * the separator becomes horizontal and resizing is disabled". The number is duplicated here so the
 * separator can drop its handlers and its tab stop in the same breath the CSS drops the cursor.
 */
export const STACK_MAX_W = 840;

/**
 * Clamp a value to the range a user is allowed to choose. Anything unparseable — absent storage,
 * a hand-edited key, a stale value from an older build — becomes the default rather than 0.
 *
 * @param {*} value Candidate width.
 * @return {number} Width within [MIN_W, MAX_W].
 */
export function clampPreferredWidth( value ) {
	const parsed = Number( value );

	return Math.round(
		Math.min( MAX_W, Math.max( MIN_W, Number.isFinite( parsed ) && parsed > 0 ? parsed : DEFAULT_W ) )
	);
}

/**
 * The width to RENDER: the preference, reduced to what the current workspace can spare.
 *
 * `available` of 0/NaN means "not measured yet" (first paint, or no ResizeObserver): answer the
 * clamped preference, which is what the component did before, rather than guessing a cap from a
 * width nobody has measured.
 *
 * When the workspace is so narrow that even the smallest inspector would break the 360px rule,
 * MIN_W is returned: the stylesheet's narrow breakpoint stacks the two panes there, so the width
 * stops being a split and becomes a stacked block.
 *
 * @param {*} preferred Stored or in-drag preference.
 * @param {number} available Workspace width in CSS pixels.
 * @return {number} Width to render.
 */
export function fitInspectorWidth( preferred, available ) {
	const wanted = clampPreferredWidth( preferred );
	const room = Number( available );
	if ( ! Number.isFinite( room ) || room <= 0 ) {
		return wanted;
	}

	const cap = Math.min( room - RESIZER_W - MIN_MAIN_W, room * MAX_SHARE );
	if ( cap < MIN_W ) {
		return MIN_W;
	}

	return Math.round( Math.min( wanted, cap ) );
}

/**
 * Whether the stylesheet is stacking the two panes rather than splitting them side by side.
 *
 * Unmeasured (0/NaN) answers false: the side-by-side layout is the default the markup renders
 * with, so an unmeasured first paint must not announce a disabled separator it will then enable.
 *
 * @param {number} available Workspace width in CSS pixels.
 * @return {boolean} True when the narrow breakpoint owns the layout.
 */
export function isStacked( available ) {
	const room = Number( available );

	return Number.isFinite( room ) && room > 0 && room <= STACK_MAX_W;
}

/**
 * Read a persisted preference, tolerating a storage that throws (private mode, blocked cookies).
 *
 * @param {string} key Storage key.
 * @return {number} Clamped preference.
 */
export function readPreferredWidth( key ) {
	try {
		return clampPreferredWidth( window.localStorage.getItem( key ) );
	} catch ( e ) {
		return DEFAULT_W;
	}
}

/**
 * Persist a preference. Silent on failure: a width is a convenience, never worth an error.
 *
 * @param {string} key   Storage key.
 * @param {number} value Preference to store.
 */
export function writePreferredWidth( key, value ) {
	try {
		window.localStorage.setItem( key, String( value ) );
	} catch ( e ) { /* ignore */ }
}

/**
 * The in-flow inspector's width, its resizer handlers, and the ref that measures the workspace.
 *
 * Returns the RENDERED width plus the live maximum, so the separator's ARIA values and its px
 * readout describe the pane the user can actually see rather than a preference the viewport is
 * overriding.
 *
 * @param {string} widthKey Namespaced localStorage key for this route's preference.
 */
export function useInspectorWidth( widthKey ) {
	const [ preferred, setPreferred ] = useState( () => readPreferredWidth( widthKey ) );
	const [ available, setAvailable ] = useState( 0 );
	const [ resizing, setResizing ] = useState( false );
	const workspaceRef = useRef( null );
	const preferredRef = useRef( preferred );
	preferredRef.current = preferred;

	// Measure the workspace, and keep measuring it. A width clamped once at mount is a width that
	// is wrong the moment the window changes — which is exactly how the list got crushed.
	useLayoutEffect( () => {
		const node = workspaceRef.current;
		if ( ! node ) {
			return undefined;
		}
		const measure = () => setAvailable( node.getBoundingClientRect().width );
		measure();

		// Both, deliberately: the observer catches the sidebar collapsing or the pane changing
		// without the window doing anything, and the window event catches the viewport change
		// itself, which an observer can deliver a frame late.
		window.addEventListener( 'resize', measure );
		if ( typeof window.ResizeObserver !== 'function' ) {
			return () => window.removeEventListener( 'resize', measure );
		}
		const observer = new window.ResizeObserver( measure );
		observer.observe( node );
		return () => {
			window.removeEventListener( 'resize', measure );
			observer.disconnect();
		};
	}, [] );

	const width = fitInspectorWidth( preferred, available );
	const maxWidth = Math.max( MIN_W, fitInspectorWidth( MAX_W, available ) );
	const stacked = isStacked( available );

	const commit = useCallback(
		( next ) => {
			const value = clampPreferredWidth( next );
			setPreferred( value );
			writePreferredWidth( widthKey, value );
		},
		[ widthKey ]
	);

	const startResize = useCallback(
		( e ) => {
			if ( e.button !== 0 ) {
				return;
			}
			e.preventDefault();
			const startX = e.clientX;
			const startW = fitInspectorWidth( preferredRef.current, workspaceRef.current?.getBoundingClientRect().width );
			setResizing( true );
			const move = ( me ) => setPreferred( clampPreferredWidth( startW + ( startX - me.clientX ) ) );
			const up = () => {
				window.removeEventListener( 'pointermove', move );
				window.removeEventListener( 'pointerup', up );
				setResizing( false );
				// A drag is a deliberate choice, so it IS written — unlike the viewport clamp above.
				writePreferredWidth( widthKey, preferredRef.current );
			};
			window.addEventListener( 'pointermove', move );
			window.addEventListener( 'pointerup', up );
		},
		[ widthKey ]
	);

	const keyResize = useCallback(
		( e ) => {
			let next = width;
			if ( e.key === 'ArrowLeft' ) next = width + 16;
			else if ( e.key === 'ArrowRight' ) next = width - 16;
			else if ( e.key === 'Home' ) next = DEFAULT_W;
			else if ( e.key === 'End' ) next = maxWidth;
			else return;
			e.preventDefault();
			commit( next );
		},
		[ width, maxWidth, commit ]
	);

	useEffect( () => () => setResizing( false ), [] );

	return { width, maxWidth, stacked, resizing, workspaceRef, startResize, keyResize };
}

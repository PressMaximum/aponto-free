/**
 * The sticky section nav of the full-page record editors: which item is lit, and how a click
 * gets you there (founder QA 2026-09-21, corrected after the round-2 browser pass).
 *
 * ROUND 1 replaced an IntersectionObserver whose `rootMargin` band was ~10% of the viewport
 * tall — several cards are SHORTER than that, so a one-paragraph card could never be
 * "intersecting" it and never lit at all.
 *
 * ROUND 2 found the replacement's own bug, and it is worth stating precisely because it is the
 * kind of thing that looks right in every unit test and is wrong on every real page. The
 * crossing line was `adminBarHeight() + 48` = **80px**, but a nav click lands a section at
 * **128px**: `html { scroll-padding-top: 32px }` plus the card's own
 * `scroll-margin-top: 96px`. So a section was never "crossed" at the exact position a click
 * put it — the spy disagreed with the scroller by 48px, every time. Measured consequences:
 * "Staff & locations" never activated on the Service editor, "Work hours" never activated on
 * the Staff editor, and a click on "Public profile" REVERTED to Details the moment the
 * optimistic lock expired.
 *
 * So the line is no longer a guess. It is read from the very properties the browser uses to
 * decide where `scrollIntoView` stops — {@see crossingLine} — which means the spy and the
 * scroller cannot drift apart again, whatever the sticky chrome does next.
 *
 * ROUND 3 replaced the tail of that rule. The crossing line was right, but a section whose
 * `reachY` (the scroll position at which it would cross) exceeds `maxScroll` can NEVER be
 * reached — the page clamps first — and the `atBottom` + viewport-middle heuristic that was
 * covering for it was both incomplete and non-monotonic. Measured: on the Service editor at
 * 1440x900 "Booking policy" never activated at any scroll position, a click on it reverted
 * ~0.7s later, and at 1440x1300 the bottom clamp jumped from "Public content" straight to
 * "Staff & locations", skipping "Duration & price" entirely.
 *
 * The replacement is one deterministic rule with no heuristics in it: the UNREACHABLE TAIL
 * SHARES THE FINAL STRETCH OF SCROLL. See {@see activeSectionId}. It guarantees that every nav
 * item activates, in document order, never backwards, on any viewport height, and it needs no
 * dead padding at the foot of the page to do it.
 *
 * Two more rules earn their place, each from a measured failure:
 *
 *  - **A clicked target holds until the OPERATOR scrolls**, not until a timer expires. Releasing
 *    on `scrollend` alone is what made a click on an unreachable section revert: the smooth
 *    scroll ends at the clamp, the lock lifts, and the rule answers with whatever is actually on
 *    the line. User intent is read from `wheel`, `touchmove` and the scrolling keys, plus a
 *    post-settle guard for anything else (a scrollbar drag).
 *  - **A page that cannot scroll has no spy.** `maxScroll <= 2` at load lit the LAST item.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { motionScrollBehavior } from './ui.jsx';

/**
 * Slack, in pixels, on the crossing test.
 *
 * Sub-pixel layout, zoom and fractional device ratios mean a section that the scroller put
 * exactly on the line can measure a hair below it. Without this the section a click just
 * scrolled to can fail its own crossing test by a quarter of a pixel.
 */
const CROSSING_TOLERANCE = 6;

/** Fallback for browsers without `scrollend`: how long a click owns the highlight. */
const SCROLL_SETTLE_MS = 700;

/**
 * Where a section comes to rest when it is scrolled to, which is the only sensible line for
 * "this section is now the current one".
 *
 * `scroll-padding-top` belongs to the scrolling element and `scroll-margin-top` to the target;
 * the browser adds them, and so do we. Both are read from computed style rather than mirrored
 * as constants, so a stylesheet change moves the nav's idea of "current" with it.
 *
 * @param {Element} section The section element.
 * @return {number} The crossing line in pixels from the top of the viewport.
 */
export function crossingLine( section ) {
	const view = section?.ownerDocument?.defaultView;
	if ( ! view?.getComputedStyle ) {
		return CROSSING_TOLERANCE;
	}
	const padding = parseFloat(
		view.getComputedStyle( section.ownerDocument.documentElement ).scrollPaddingTop
	);
	const margin = parseFloat( view.getComputedStyle( section ).scrollMarginTop );

	return ( padding || 0 ) + ( margin || 0 ) + CROSSING_TOLERANCE;
}

/**
 * Which section is current, as a pure function of the page geometry.
 *
 * THE RULE, in two halves.
 *
 * **Reachable sections behave exactly as before.** A section's `reachY` is the scroll position
 * at which its top lands on its own line: `docTop - line`. While `scrollY` has passed a
 * section's `reachY` and not the next one's, that section is current.
 *
 * **The unreachable tail shares the final stretch.** A section whose `reachY` exceeds
 * `maxScroll` can never come to rest on its line, because the page stops scrolling first — that
 * is not an edge case, it is every last card on a tall viewport. Since `docTop` increases down
 * the page and the line is effectively constant, the unreachable sections are always a SUFFIX.
 * So the remaining scroll from the last reachable section's `reachY` (`y0`) to `maxScroll` is
 * divided into `tail.length + 1` equal slices: slice 0 belongs to that last reachable section,
 * slice k to the k-th unreachable one, and the last slice — anything within 2px of the bottom —
 * always belongs to the final section.
 *
 * That is what makes the guarantee total: EVERY item activates, in order, monotonically, at any
 * viewport height, with no padding added to the document to make room. A degenerate interval
 * (fewer pixels left than there are slices) falls back to "at the bottom, the last section",
 * which is the only honest answer when there is no scroll left to divide.
 *
 * @param {Array<{id: string, docTop: number, line: number}>} sections Sections in DOM order,
 *        each with its position in the DOCUMENT and its own crossing line.
 * @param {Object}  [options]             Rule inputs.
 * @param {number}  [options.scrollY]     Current scroll position.
 * @param {number}  [options.maxScroll]   `scrollHeight - innerHeight`, never negative.
 * @param {?string} [options.clicked]     A target the operator just asked for.
 * @return {?string} The active section id, or `null` when there are no sections.
 */
export function activeSectionId( sections, options = {} ) {
	const { scrollY = 0, maxScroll = 0, clicked = null } = options;

	if ( ! sections || ! sections.length ) {
		return null;
	}

	// An explicit request beats every derived answer, for as long as the hook holds it.
	if ( clicked && sections.some( ( section ) => section.id === clicked ) ) {
		return clicked;
	}

	// Nothing to spy on: every section is on screen at once and no scrolling will change that,
	// so the honest answer is the first one.
	if ( maxScroll <= 2 ) {
		return sections[ 0 ].id;
	}

	const reach = sections.map( ( section ) => section.docTop - section.line );

	// The last section that can actually come to rest on its line. `-1` when none can, which is
	// a real case on a very tall viewport: then the whole list is the tail.
	let lastReachable = -1;
	reach.forEach( ( y, i ) => {
		if ( y <= maxScroll ) {
			lastReachable = i;
		}
	} );

	// Ordinary crossing, for everything before the shared stretch.
	let current = -1;
	for ( let i = 0; i <= lastReachable; i++ ) {
		if ( scrollY >= reach[ i ] ) {
			current = i;
		}
	}

	// Where the shared stretch starts, given the section that anchors it. When that anchor is
	// itself unreachable — a viewport so tall that not even the first card reaches its line —
	// the stretch starts at the very top, because there is no crossing to start it from.
	const startOf = ( i ) => ( reach[ i ] <= maxScroll ? Math.max( reach[ i ], 0 ) : 0 );

	let base = Math.max( lastReachable, 0 );
	let slices = sections.length - base;
	// A section can be reachable by a single pixel — `reachY` exactly equal to `maxScroll` —
	// which leaves the tail no room at all and would silently skip it. Widening the stretch one
	// section at a time until it can actually be divided is what turns the guarantee ("every
	// item activates") from a near-miss into a fact; it costs the anchor section its dedicated
	// crossing point, which is the right trade when the alternative is a dead nav entry.
	while ( base > 0 && maxScroll - startOf( base ) < slices ) {
		base--;
		slices++;
	}

	// No tail to share: every section is reachable and the crossing rule is the whole answer.
	if ( slices <= 1 ) {
		return current < 0 ? sections[ 0 ].id : sections[ current ].id;
	}

	// Still above the shared stretch: the ordinary crossing rule still applies. Guarded on
	// `base > 0`, because when the stretch starts at the very top there is nothing above it —
	// and `current` is legitimately `-1` there, since no section has a crossing to pass.
	if ( base > 0 && current < base ) {
		return current < 0 ? sections[ 0 ].id : sections[ current ].id;
	}

	const y0 = startOf( base );
	const span = maxScroll - y0;
	const atBottom = scrollY >= maxScroll - 2;

	// Fewer pixels left than slices even after widening: there is nothing meaningful to divide,
	// so the only defensible answers are "the anchor" and, at the bottom, "the last one".
	if ( span < slices ) {
		return atBottom ? sections[ sections.length - 1 ].id : sections[ base ].id;
	}

	if ( atBottom ) {
		return sections[ sections.length - 1 ].id;
	}
	if ( scrollY <= y0 ) {
		return sections[ base ].id;
	}

	const step = Math.floor( ( scrollY - y0 ) / ( span / slices ) );

	return sections[ base + Math.min( Math.max( step, 0 ), slices - 1 ) ].id;
}

/**
 * Sticky section nav for one record editor.
 *
 * @param {Object}                     options          Hook options.
 * @param {Array<Array<string>>}       options.anchors  `[ id, label ]` pairs, in DOM order.
 * @param {import('react').RefObject}  options.bodyRef  Ref to the element holding the sections.
 * @param {string}                     options.prefix   Anchor id prefix, e.g. `service-`.
 * @param {boolean}                    [options.ready]  False while the editor is still loading.
 * @return {{active: string, scrollTo: Function}} The lit anchor id and the click handler.
 */
export function useSectionNav( { anchors, bodyRef, prefix, ready = true } ) {
	const [ active, setActive ] = useState( anchors[ 0 ]?.[ 0 ] ?? '' );
	// The target of a click the operator has not yet scrolled away from. A ref, not state: the
	// scroll listener reads it without re-subscribing on every change.
	const clicked = useRef( null );
	// Set once the programmatic scroll has settled. From then on ANY scroll movement of more
	// than a couple of pixels is the operator's, which covers the inputs we cannot observe
	// directly — a scrollbar drag above all.
	const armed = useRef( false );
	const lockedAt = useRef( 0 );
	const release = useRef( () => {} );
	const ids = anchors.map( ( [ id ] ) => id ).join( '|' );

	const measure = useCallback( () => {
		const root = bodyRef.current;
		if ( ! root ) {
			return;
		}
		const scrollY = window.scrollY;
		const sections = ids
			.split( '|' )
			.filter( Boolean )
			.map( ( id ) => {
				const node = root.querySelector( `#${ prefix }${ id }` );
				if ( ! node ) {
					return null;
				}
				// DOCUMENT-relative, because the rule reasons about the scroll position at which
				// a section would reach its line — a quantity that has to be comparable with
				// `maxScroll`, and a viewport-relative top is not.
				return {
					id,
					docTop: node.getBoundingClientRect().top + scrollY,
					line: crossingLine( node ),
				};
			} )
			.filter( Boolean );

		const doc = document.documentElement;
		const next = activeSectionId( sections, {
			scrollY,
			maxScroll: Math.max( doc.scrollHeight - window.innerHeight, 0 ),
			clicked: clicked.current,
		} );
		if ( next ) {
			setActive( next );
		}
	}, [ bodyRef, ids, prefix ] );

	// Drop the click lock and re-derive once. Kept in a ref so every listener registered by
	// `scrollTo` — and the unmount cleanup — reaches the current version.
	release.current = () => {
		clicked.current = null;
		armed.current = false;
		measure();
	};

	useEffect( () => {
		if ( ! ready ) {
			return undefined;
		}
		let frame = 0;
		const onScroll = () => {
			// Post-settle guard: the scroll is moving and the programmatic one is over, so this
			// is the operator. Catches the inputs with no event of their own (scrollbar drag,
			// a trackpad fling still decelerating, programmatic scrolls from elsewhere).
			if ( clicked.current && armed.current && Math.abs( window.scrollY - lockedAt.current ) > 2 ) {
				release.current();
				return;
			}
			if ( frame ) {
				return;
			}
			frame = window.requestAnimationFrame( () => {
				frame = 0;
				measure();
			} );
		};

		measure();
		window.addEventListener( 'scroll', onScroll, { passive: true } );
		window.addEventListener( 'resize', onScroll );

		return () => {
			window.removeEventListener( 'scroll', onScroll );
			window.removeEventListener( 'resize', onScroll );
			if ( frame ) {
				window.cancelAnimationFrame( frame );
			}
		};
	}, [ measure, ready ] );

	useEffect( () => () => {
		clicked.current = null;
		armed.current = false;
	}, [] );

	/**
	 * Go to a section and light its nav item.
	 *
	 * THE ONE PATH. A nav click and the Service editor's post-create hand-off both come through
	 * here, so they cannot land in two different places again. The scroll itself is deferred to
	 * the next frame because the post-create caller scrolls to a section the same state update
	 * has just revealed — measuring before the next paint measures the OLD layout.
	 *
	 * THE LOCK IS RELEASED BY THE OPERATOR, NOT BY A CLOCK (founder QA 2026-09-21, round 3).
	 * Releasing on `scrollend` alone is exactly what made a click on an unreachable section
	 * revert half a second later: the smooth scroll ends at the page's clamp, the lock lifts,
	 * and the derived answer is whatever is genuinely on the line — which for that section is
	 * never itself. So the lock ends on evidence of INTENT: a wheel, a touch drag, a scrolling
	 * key, or (once the programmatic scroll has settled) any real movement at all.
	 *
	 * @param {string} id Anchor id, without the prefix.
	 */
	const scrollTo = useCallback( ( id ) => {
		setActive( id );
		clicked.current = id;
		armed.current = false;

		const keys = [ 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar' ];
		const onKey = ( event ) => {
			if ( keys.includes( event.key ) ) {
				letGo();
			}
		};
		function letGo() {
			window.removeEventListener( 'wheel', letGo );
			window.removeEventListener( 'touchmove', letGo );
			window.removeEventListener( 'keydown', onKey );
			window.removeEventListener( 'scrollend', arm );
			release.current();
		}
		// Arming does NOT release: the smooth scroll has merely finished, and the operator may
		// well be looking at exactly where they asked to be. It only says that from here on,
		// movement means them.
		function arm() {
			armed.current = true;
			lockedAt.current = window.scrollY;
		}

		window.addEventListener( 'wheel', letGo, { once: true, passive: true } );
		window.addEventListener( 'touchmove', letGo, { once: true, passive: true } );
		window.addEventListener( 'keydown', onKey );
		if ( 'onscrollend' in window ) {
			window.addEventListener( 'scrollend', arm, { once: true } );
		}
		// The timer is not a nicety: a browser without `scrollend`, or a scroll that never
		// starts because the target is already in place, would otherwise never arm the guard.
		window.setTimeout( arm, SCROLL_SETTLE_MS );

		window.requestAnimationFrame( () => {
			// Optional call: `scrollIntoView` is absent in jsdom, and an editor is mounted in
			// unit tests that exercise the save paths this handler now runs from.
			bodyRef.current
				?.querySelector( `#${ prefix }${ id }` )
				?.scrollIntoView?.( { behavior: motionScrollBehavior(), block: 'start' } );
		} );
	}, [ bodyRef, prefix ] );

	return { active, scrollTo };
}

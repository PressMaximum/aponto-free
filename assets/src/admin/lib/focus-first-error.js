/**
 * Take the operator to the first field a save rejected (founder QA 2026-09-21).
 *
 * THE BUG THIS ANSWERS. Both full-page record editors set field errors inline and did nothing
 * else: no scroll, no focus move, no announcement. With the carded layout a long editor is
 * several screens tall, so pressing Save on a service whose NAME is empty while the viewport sits
 * on "Booking policy" looked like the button was broken — the error was painted two screens up,
 * focus stayed on Save, and nothing said a word. That is true of a client-side refusal and of a
 * server `422` with `data.fields` alike, and it is the same gap in both editors, so it is one
 * helper rather than two near-copies.
 *
 * WHY IT SCROLLS THE CONTROL TO THE CENTRE. The editors sit under a sticky page chrome whose
 * height is not one number: the WordPress admin bar is 32px on the desktop breakpoint and 46px
 * at ≤782px, and the sticky section nav adds its own gap. `block: 'center'` is correct at every
 * one of those heights without a magic constant to keep in sync with the stylesheet, and a
 * centred field is also simply easier to find than one pinned to the top edge. The cards keep
 * their `scroll-margin-top` for the section NAV, which is a different job.
 *
 * WHY `preventScroll` ON THE FOCUS. `focus()` scrolls the element into view on its own, with no
 * behaviour or block control, so focusing first and scrolling second makes the browser jump twice
 * — once instantly, once smoothly, from two different positions. Focus with `preventScroll: true`
 * and let the explicit scroll be the only movement.
 */
import { useEffect } from 'react';
import { motionScrollBehavior } from './ui.jsx';

/**
 * The control a field error belongs to, in DOM order.
 *
 * Looks for `.has-error` — the class BOTH editors already put on the field wrapper when a key of
 * `fieldError` is set — and takes the first focusable control inside it. Keying on the rendered
 * error rather than on the error OBJECT is deliberate: the object's keys are wire names
 * (`price_minor`, `min_lead_minutes`) that do not always match an input's `name`, while
 * `.has-error` is by construction exactly the set of fields the operator can see is wrong.
 *
 * @param {ParentNode} container Editor root to search.
 * @return {?HTMLElement} The control, or `null` when nothing is marked.
 */
export function firstErrorControl( container ) {
	if ( ! container ) {
		return null;
	}

	// A real form control first; a BUTTON only as a fallback. The featured-image and avatar
	// fields are a preview plus a "Choose photo" button and hold no input at all, so without the
	// fallback a `422` on `avatar_id`/`image_id` would mark a field the operator cannot be sent
	// to. The order matters: a field that has both (the colour picker has an input AND a Clear
	// button) must hand back the input.
	const wrappers = container.querySelectorAll( '.has-error' );
	for ( const wrapper of wrappers ) {
		const control = wrapper.matches?.( 'input, select, textarea' )
			? wrapper
			: wrapper.querySelector( 'input, select, textarea' ) || wrapper.querySelector( 'button' );
		if ( control && ! control.disabled ) {
			return control;
		}
	}

	return null;
}

/**
 * Scroll to and focus the first rejected field, and say so.
 *
 * Safe to call when nothing is marked — it simply answers `false`, so a caller can use the
 * return value to decide whether it still owes the operator a toast of its own.
 *
 * @param {ParentNode} container      Editor root to search.
 * @param {Function}   [announce]     Called with the announcement string when a field was found.
 * @param {string}     [message]      Announcement copy.
 * @return {boolean} Whether a field was found, scrolled to and focused.
 */
export function focusFirstError( container, announce, message = 'Check the highlighted fields.' ) {
	const control = firstErrorControl( container );
	if ( ! control ) {
		return false;
	}

	control.focus?.( { preventScroll: true } );
	control.scrollIntoView?.( { behavior: motionScrollBehavior(), block: 'center' } );
	announce?.( message, 'danger' );

	return true;
}

/**
 * Run the focus step after a save has painted its errors, WITHOUT depending on
 * `requestAnimationFrame` (founder QA 2026-09-21, round 3).
 *
 * THE BUG. Both editors scheduled the focus with `requestAnimationFrame`, and an embedded
 * browser pane — or an ordinary backgrounded tab — THROTTLES rAF, in some states to never. QA
 * caught `document.activeElement` still on `BODY` after a failed save with the pane hidden: the
 * error paint happened, the focus never did. rAF is a rendering hint, not a scheduler, and
 * correctness must not hang on it.
 *
 * A React EFFECT is the right instrument and needs no scheduler at all: it runs after the DOM
 * is committed, which is the only property the caller actually wanted. The `token` is a counter
 * the save path bumps, so two identical refusals in a row still fire — keying on the error
 * object would not, because a re-submitted form can produce an equal one.
 *
 * @param {number}                    token    Bumped once per refusal; `0` means "never yet".
 * @param {import('react').RefObject} rootRef  Editor root.
 * @param {import('react').RefObject} planRef  `{ announce, message }` for this refusal.
 */
export function useFocusFirstError( token, rootRef, planRef ) {
	useEffect( () => {
		if ( ! token ) {
			return;
		}
		const plan = planRef.current || {};
		if ( ! focusFirstError( rootRef.current, plan.announce, plan.message ) ) {
			plan.fallback?.();
		}
	}, [ token ] ); // eslint-disable-line react-hooks/exhaustive-deps
}

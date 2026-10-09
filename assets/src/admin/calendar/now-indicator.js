/**
 * Now-indicator overlay (Q10 criterion b) — ported from the spike. EC's native
 * indicator is a bare line; Fresha shows a line + a time bubble on the axis. We
 * draw our own overlay from live grid geometry (`.ec-body`/`.ec-day`/`.ec-sidebar`
 * — version-bump risks catalogued in the findings doc). `nowMinutes` is business
 * time (the caller binds the real clock via setInterval). setTimeout(0), not rAF,
 * so it runs in a backgrounded tab.
 *
 * The window is a PARAMETER, not a constant: the grid derives it per render (`window.js`), and a
 * line positioned against a stale 07:00–21:00 would drift by exactly the amount the window grew.
 */
import { DEFAULT_SLOT_MIN_MINUTES, DEFAULT_SLOT_MAX_MINUTES } from './window.js';
// The bubble follows the site's 12/24-hour setting, like the axis beside it (T-071).
import { minutesLabel } from '../lib/format.js';


function ensure( parent, cls, make ) {
	let el = parent.querySelector( `:scope > .${ cls }` );
	if ( ! el ) {
		el = make();
		parent.appendChild( el );
	}
	return el;
}

/**
 * Whether "now" is on the grid being shown (persona QA 2026-10-05, T-052): the line was drawn
 * across a FUTURE week, at the current time of day, as if that week were this one.
 *
 * @param {?{currentStart: Date, currentEnd: Date}} view EC view (`getView()`), business-local dates.
 * @param {Date}                                    now  Business-local "now" (`toBusinessLocalDate`).
 * @return {boolean} True when the view's range contains now — or the range is unknown.
 */
export function viewContainsNow( view, now ) {
	const start = view?.currentStart instanceof Date ? view.currentStart.getTime() : NaN;
	const end = view?.currentEnd instanceof Date ? view.currentEnd.getTime() : NaN;
	if ( Number.isNaN( start ) || Number.isNaN( end ) ) {
		return true;
	}
	const at = now.getTime();

	return at >= start && at < end;
}

/**
 * Draw (or hide) the now line + time bubble.
 *
 * @param {?Element} root       Calendar host element.
 * @param {number}   nowMinutes Business-time minutes from midnight.
 * @param {number}   [minMinutes] Visible window start (minutes) — the grid's derived `slotMinTime`.
 * @param {number}   [maxMinutes] Visible window end (minutes) — the grid's derived `slotMaxTime`.
 * @param {boolean}  [onGrid]     Whether today is in the range on screen ({@link viewContainsNow}).
 */
export function renderNowIndicator( root, nowMinutes, minMinutes = DEFAULT_SLOT_MIN_MINUTES, maxMinutes = DEFAULT_SLOT_MAX_MINUTES, onGrid = true ) {
	if ( ! root ) {
		return;
	}
	const body = root.querySelector( '.ec-time-grid .ec-body' );
	if ( ! body ) {
		return;
	}
	const day = body.querySelector( '.ec-day' );
	const sidebar = body.querySelector( '.ec-sidebar' );
	if ( ! day ) {
		return;
	}

	const min = nowMinutes;
	const line = ensure( body, 'ap-now-line', () => {
		const el = document.createElement( 'div' );
		el.className = 'ap-now-line';
		el.innerHTML = '<span class="ap-now-dot"></span>';
		return el;
	} );
	const bubble = ensure( body, 'ap-now-bubble', () => {
		const el = document.createElement( 'div' );
		el.className = 'ap-now-bubble';
		return el;
	} );

	if ( ! onGrid || min < minMinutes || min > maxMinutes ) {
		line.style.display = 'none';
		bubble.style.display = 'none';
		return;
	}

	if ( getComputedStyle( body ).position === 'static' ) {
		body.style.position = 'relative';
	}

	const bodyRect = body.getBoundingClientRect();
	const dayRect = day.getBoundingClientRect();
	const slotTop = dayRect.top - bodyRect.top + body.scrollTop;
	const ratio = ( min - minMinutes ) / ( maxMinutes - minMinutes );
	const y = Math.round( slotTop + ratio * day.offsetHeight );
	const sidebarW = sidebar ? sidebar.offsetWidth : 56;

	line.style.display = 'block';
	line.style.top = `${ y }px`;
	line.style.left = `${ sidebarW }px`;

	bubble.style.display = 'block';
	bubble.style.top = `${ y }px`;
	bubble.style.width = `${ sidebarW }px`;
	bubble.textContent = minutesLabel( min );
}

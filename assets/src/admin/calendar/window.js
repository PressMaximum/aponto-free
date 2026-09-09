/**
 * The calendar's VISIBLE TIME WINDOW — derived, never clipping (SPEC-P1 §1.4 · Q10).
 *
 * Event Calendar draws only the band between `slotMinTime` and `slotMaxTime`. An event lying
 * entirely outside that band is not drawn AT ALL: no scroll-to-reveal, no overflow marker, no
 * error. The grid was pinned to a fixed 07:00–21:00 window, so a salon opening at 06:00 or
 * closing at 22:00 silently lost appointments from the admin calendar — the admin saw an empty
 * slot where a real booking sat, which is the worst possible failure for a booking product.
 *
 * The window is therefore DERIVED from what the day actually contains:
 *
 *   start = min( 07:00, floor-to-hour of the earliest business OPEN time,
 *                       floor-to-hour of the earliest EVENT start )
 *   end   = max( 21:00, ceil-to-hour of the latest business CLOSE time,
 *                       ceil-to-hour of the latest EVENT end )
 *
 * 07:00–21:00 stays the DEFAULT: nothing to push it (no schedule, no events, ordinary 9–5 hours)
 * yields exactly the window the calendar has always shown, so the Fresha-style focus is intact.
 * Hours are floored/ceiled so the axis keeps whole-hour labels; the result is clamped to
 * 00:00–24:00, the only band a day column can express.
 *
 * MIDNIGHT CROSSING. An event that runs past midnight occupies the tail of one day column and the
 * head of the next, and both columns share ONE window — so the only window that shows both halves
 * is the full day, and that is what such an event produces. `slotMaxTime` beyond 24:00 ('26:00:00')
 * is a documented Event Calendar 5.10 feature, but it MOVES THE DAY BOUNDARY (`time-grid/lib.js`
 * `activeRange` pulls the range back by the overflow), which would silently redefine what a
 * "day" means for the day view, the print day-sheet and every slot click. Expanding to
 * 00:00–24:00 instead is what EC's own `flexibleSlotTimeLimits` does (`lib/slots.js` caps any
 * expansion at a 24-hour span), so we stay inside the library's own model.
 *
 * SCOPE: THE VISIBLE RANGE, NOT THE LOADED RANGE (Codex review P2-1). The route loads ±42 days of
 * bookings and blocked periods, and the weekly schedule covers all seven weekdays — deriving from
 * all of that made one outlier reshape every day of every week: a full-day time-off block six weeks
 * out forced 00:00–24:00 everywhere, and day view widened because ANOTHER weekday opens early. The
 * derivation therefore takes the grid's active range and considers only the events that intersect
 * it and only the weekdays it actually shows. With no range (the first render, before Event
 * Calendar reports one) it falls back to everything, which can only ever be too WIDE — never
 * clipping.
 *
 * FULL-DAY BLOCKED PERIODS ARE IGNORED. A day off is background: it says the day is unavailable,
 * not that the grid should show 24 hours. Anything shorter (lunch, a meeting) is a real thing at a
 * real time and still counts.
 *
 * KNOWN LIMITATION (Codex review P1, PRE-EXISTING, not fixed here). Business wall clocks reach this
 * module as browser-local `Date`s (`constants.js#toBusinessLocalDate`), so on the BROWSER's own two
 * DST days an hour can shift or collapse in that frame and the derived window can be an hour off.
 * It cannot hide an event — Event Calendar's `flexibleSlotTimeLimits` still expands for anything
 * that lands outside — and the fix belongs with the browser-local rendering frame as a whole
 * (a business-timezone frame for the grid), which is a larger change than this one. Follow-up
 * ticket material, evidence: browser America/New_York, 2026-03-08, business-tz 02:30 renders 03:30.
 *
 * Pure and import-free, like `schedule.js`, so the rules are unit-testable in isolation rather
 * than trapped in a render closure.
 */

/** Minutes in a day; also the exclusive upper bound of a day column. */
export const DAY_MINUTES = 24 * 60;

/** Default window start — 07:00, the Fresha-style focus the calendar opens on. */
export const DEFAULT_SLOT_MIN_MINUTES = 7 * 60;

/** Default window end — 21:00. */
export const DEFAULT_SLOT_MAX_MINUTES = 21 * 60;

/**
 * Minutes from midnight → Event Calendar's `HH:MM:SS` duration string.
 *
 * 1440 renders as `24:00:00`, which EC treats as the end of the day and NOT as an overflow
 * (`slotMaxTime.seconds > DAY_IN_SECONDS` is false at exactly 24 hours), so the day boundary
 * stays where it is.
 *
 * @param {number} minutes Minutes from midnight (0..1440).
 * @return {string} `HH:MM:SS`.
 */
export function minutesToSlotTime( minutes ) {
	const total = Math.max( 0, Math.min( DAY_MINUTES, Math.round( minutes ) ) );
	const hours = Math.floor( total / 60 );
	const mins = total % 60;

	return `${ String( hours ).padStart( 2, '0' ) }:${ String( mins ).padStart( 2, '0' ) }:00`;
}

/** Floor to the hour below. */
function floorHour( minutes ) {
	return Math.floor( minutes / 60 ) * 60;
}

/** Ceil to the hour above. */
function ceilHour( minutes ) {
	return Math.ceil( minutes / 60 ) * 60;
}

/**
 * A business-local event pair → its minute range within its START day.
 *
 * `end` may exceed 1440: that is precisely how a midnight crossing is reported, and the caller
 * needs to know rather than have it clamped away. The day difference is taken from the CALENDAR
 * COMPONENTS, not from the millisecond delta, so a browser-local DST transition between the two
 * dates cannot shift the answer by an hour (invariant §5.5 — never reason in scalar offsets).
 *
 * @param {Date}  start Business-local start.
 * @param {?Date} end   Business-local end (optional).
 * @return {?{start: number, end: number}} Minute range, or null when unusable.
 */
export function eventMinuteRange( start, end ) {
	if ( ! ( start instanceof Date ) || Number.isNaN( start.getTime() ) ) {
		return null;
	}
	const startMinutes = start.getHours() * 60 + start.getMinutes();
	if ( ! ( end instanceof Date ) || Number.isNaN( end.getTime() ) ) {
		return { start: startMinutes, end: startMinutes };
	}

	const days = Math.round(
		( Date.UTC( end.getFullYear(), end.getMonth(), end.getDate() )
			- Date.UTC( start.getFullYear(), start.getMonth(), start.getDate() ) )
		/ 86400000
	);
	const endMinutes = days * DAY_MINUTES + end.getHours() * 60 + end.getMinutes();

	return { start: startMinutes, end: Math.max( startMinutes, endMinutes ) };
}

/** ISO-ish weekday index of a business-local Date, 0 = Monday (the `openByDow` key space). */
function dowOf( date ) {
	return ( date.getDay() + 6 ) % 7;
}

/**
 * The weekdays a rendered range actually shows.
 *
 * Day view shows exactly one; week view shows seven. Deriving the window from every weekday is what
 * made a single early-opening Monday stretch the Sunday day view too.
 *
 * @param {?{start: Date, end: Date}} range Active range (`end` exclusive), or null when unknown.
 * @return {number[]} Weekday indexes present, 0 = Monday. All seven when the range is unusable.
 */
export function visibleWeekdays( range ) {
	const all = [ 0, 1, 2, 3, 4, 5, 6 ];
	const start = range?.start instanceof Date ? range.start : null;
	const end = range?.end instanceof Date ? range.end : null;
	if ( ! start || ! end || Number.isNaN( start.getTime() ) || Number.isNaN( end.getTime() ) || end <= start ) {
		return all;
	}

	const seen = new Set();
	const cursor = new Date( start.getFullYear(), start.getMonth(), start.getDate() );
	for ( let guard = 0; guard < 7 && cursor < end; guard += 1 ) {
		seen.add( dowOf( cursor ) );
		cursor.setDate( cursor.getDate() + 1 );
	}

	return seen.size ? [ ...seen ].sort( ( a, b ) => a - b ) : all;
}

/**
 * Whether a blocked period covers whole days rather than a slice of one.
 *
 * A day off (or a week off) is background information: shading it is right, reshaping the grid
 * around it is not — and a midnight-to-midnight block would otherwise force 00:00–24:00 on every
 * day of the view. Only blocked periods are judged this way; a booking is real work at a real time
 * whatever its length.
 *
 * @param {Object} event Calendar event (`extendedProps.kind`, business-local `start`/`end`).
 * @return {boolean} Whether the event must not influence the window.
 */
export function isFullDayBlock( event ) {
	if ( event?.extendedProps?.kind !== 'blocked' ) {
		return false;
	}
	const start = event?.start;
	const end = event?.end;
	if ( ! ( start instanceof Date ) || ! ( end instanceof Date ) ) {
		return false;
	}
	if ( end.getTime() - start.getTime() >= DAY_MINUTES * 60000 ) {
		return true;
	}

	const midnightToMidnight = 0 === start.getHours() && 0 === start.getMinutes()
		&& 0 === end.getHours() && 0 === end.getMinutes();

	return midnightToMidnight && end.getTime() > start.getTime();
}

/**
 * Whether an event is on screen in the active range (half-open, like Event Calendar's own test).
 *
 * @param {Object}                    event Calendar event.
 * @param {?{start: Date, end: Date}} range Active range, or null for "no range known".
 * @return {boolean} Whether the event is visible.
 */
export function intersectsRange( event, range ) {
	if ( ! range?.start || ! range?.end ) {
		return true;
	}
	const start = event?.start instanceof Date ? event.start : null;
	if ( ! start ) {
		return false;
	}
	const end = event?.end instanceof Date ? event.end : start;

	return start < range.end && end > range.start;
}

/** Every open period of the visible weekdays, as raw minute pairs. */
function openPeriods( openByDow, weekdays ) {
	const out = [];
	weekdays.forEach( ( dow ) => {
		( ( openByDow || {} )[ dow ] || [] ).forEach( ( period ) => {
			const start = Number( period?.start_minute );
			const end = Number( period?.end_minute );
			if ( Number.isFinite( start ) && Number.isFinite( end ) && end > start ) {
				out.push( [ start, end ] );
			}
		} );
	} );

	return out;
}

/**
 * The minute ranges the window must contain: the events on screen, day offs excluded.
 *
 * @param {Array}                     events Calendar events (business-local Dates).
 * @param {?{start: Date, end: Date}} range  Active range, or null.
 * @return {Array} `{start, end}` minute ranges (`end` may exceed 1440 — a midnight crossing).
 */
export function windowRanges( events, range ) {
	const out = [];
	( Array.isArray( events ) ? events : [] ).forEach( ( event ) => {
		if ( 'background' === event?.display || isFullDayBlock( event ) || ! intersectsRange( event, range ) ) {
			return;
		}
		const minutes = eventMinuteRange( event?.start, event?.end );
		if ( minutes ) {
			out.push( minutes );
		}
	} );

	return out;
}

/**
 * The visible window for the grid.
 *
 * @param {Object}  input           Sources.
 * @param {?Object} input.openByDow Effective weekly schedule (`schedule.js#effectiveOpenByDow`) —
 *                                  the SAME data the non-working stripes are drawn from, so the
 *                                  window and the stripes can never disagree and no extra REST
 *                                  call is needed. Only the VISIBLE weekdays are read.
 * @param {?Array}  input.events    The events that will actually be RENDERED, filters already
 *                                  applied — a booking hidden by the status filter must not widen
 *                                  the grid. Background stripes and full-day blocks are skipped,
 *                                  and only events intersecting `range` count.
 * @param {?Object} input.range     The grid's active range `{start, end}` (business-local Dates,
 *                                  `end` exclusive), or null before Event Calendar reports one.
 * @param {?Array}  input.ranges    Pre-computed minute ranges, for callers that already have them
 *                                  (tests, and anything not holding Date objects). Merged with
 *                                  whatever `events` yields.
 * @return {{minMinutes: number, maxMinutes: number, slotMinTime: string, slotMaxTime: string}}
 *         The window, in minutes and in EC's option format.
 */
export function deriveSlotWindow( { openByDow = {}, events = [], range = null, ranges = [] } = {} ) {
	let min = DEFAULT_SLOT_MIN_MINUTES;
	let max = DEFAULT_SLOT_MAX_MINUTES;
	const weekdays = visibleWeekdays( range );
	const allRanges = [ ...windowRanges( events, range ), ...( Array.isArray( ranges ) ? ranges : [] ) ];

	openPeriods( openByDow, weekdays ).forEach( ( [ start, end ] ) => {
		min = Math.min( min, floorHour( start ) );
		max = Math.max( max, ceilHour( end ) );
	} );

	allRanges.forEach( ( minutes ) => {
		const start = Number( minutes?.start );
		const end = Number( minutes?.end );
		if ( ! Number.isFinite( start ) || ! Number.isFinite( end ) ) {
			return;
		}
		if ( end > DAY_MINUTES ) {
			// Crosses midnight: only the full day shows both halves (see the file header).
			min = 0;
			max = DAY_MINUTES;

			return;
		}
		min = Math.min( min, floorHour( start ) );
		max = Math.max( max, ceilHour( end ) );
	} );

	min = Math.max( 0, Math.min( DAY_MINUTES - 60, min ) );
	max = Math.min( DAY_MINUTES, max );
	if ( max <= min ) {
		// Unreachable with sane inputs; a zero-height grid would draw nothing at all, so fall back
		// to the default window rather than render an empty day.
		min = DEFAULT_SLOT_MIN_MINUTES;
		max = DEFAULT_SLOT_MAX_MINUTES;
	}

	return {
		minMinutes: min,
		maxMinutes: max,
		slotMinTime: minutesToSlotTime( min ),
		slotMaxTime: minutesToSlotTime( max ),
	};
}

/**
 * Where the grid must be scrolled to keep showing the same wall clock after the window moved.
 *
 * The scroll offset is raw pixels over a band whose HEIGHT and ORIGIN both change when the window
 * does, so leaving `scrollTop` alone silently scrolls the user hours away: filter an early booking
 * out, the grid starts at 07:00 instead of 02:00, and the same offset now points at the evening
 * (Codex review P2-2). Anchoring on the minute at the top of the viewport keeps the view still.
 *
 * The geometry is passed in rather than read here because the scroller and the content are two
 * different elements: Event Calendar 5.10 scrolls `.ec-main` (`styles/index.css` gives it
 * `overflow: auto`, and `time-grid/View.svelte` sets `mainEl.scrollTop` itself), while the hours
 * live in `.ec-body` below the sticky day headers. `contentTop` is that offset — anchoring against
 * the scroller's own height instead would be wrong by the header.
 *
 * @param {Object}  input                   Geometry before and after the change.
 * @param {number}  input.scrollTop         Scroller offset before the change.
 * @param {number}  input.contentTop        Distance from the top of the scrolled content to the
 *                                          first hour row, before the change.
 * @param {number}  input.contentHeight     Height of the hour rows before the change (0 = not laid
 *                                          out).
 * @param {number}  input.nextContentTop    The same offset after the change.
 * @param {number}  input.nextContentHeight The same height after the change.
 * @param {?number} input.maxScroll         Largest valid offset after the change, if known.
 * @param {Object}  input.prev              Previous window `{minMinutes, maxMinutes}`.
 * @param {Object}  input.next              New window `{minMinutes, maxMinutes}`.
 * @return {number} The scroll offset to restore, clamped into the new content.
 */
export function scrollTopForWindow( {
	scrollTop = 0,
	contentTop = 0,
	contentHeight = 0,
	nextContentTop = 0,
	nextContentHeight = 0,
	maxScroll = null,
	prev,
	next,
} ) {
	const prevSpan = ( prev?.maxMinutes ?? 0 ) - ( prev?.minMinutes ?? 0 );
	const nextSpan = ( next?.maxMinutes ?? 0 ) - ( next?.minMinutes ?? 0 );
	if ( contentHeight <= 0 || nextContentHeight <= 0 || prevSpan <= 0 || nextSpan <= 0 ) {
		return scrollTop;
	}

	const minuteAtTop = prev.minMinutes + ( ( scrollTop - contentTop ) / contentHeight ) * prevSpan;
	const offset = nextContentTop + ( ( minuteAtTop - next.minMinutes ) / nextSpan ) * nextContentHeight;
	const ceiling = null === maxScroll ? nextContentTop + nextContentHeight : maxScroll;

	return Math.max( 0, Math.min( ceiling, Math.round( offset ) ) );
}

/** The window with nothing pushing it — the calendar's historical 07:00–21:00. */
export const DEFAULT_SLOT_WINDOW = deriveSlotWindow();

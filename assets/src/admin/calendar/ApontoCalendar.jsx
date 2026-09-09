/**
 * React wrapper around the EC adapter (Q10). Owns the custom toolbar (EC's own
 * header is off), the now-indicator overlay and the lifecycle. Ported from the
 * spike's react-wrapper + toolbar; the adapter carries all the re-mount risk.
 */
import { useRef, useLayoutEffect, useEffect, useState, useCallback } from 'react';
import { createAdapter } from './ec-adapter.js';
import { renderNowIndicator } from './now-indicator.js';
import { eventContent } from './event-content.js';
import { TZ, toBusinessLocalDate, businessNowMinutes } from './constants.js';
import { DEFAULT_SLOT_WINDOW, isFullDayBlock, scrollTopForWindow } from './window.js';
import { SLOT_DURATION } from './slot-select.js';
import { config } from '../lib/config.js';
import { renderIcon } from '../lib/icon.jsx';

export function ApontoCalendar( { events, slotWindow = DEFAULT_SLOT_WINDOW, onRangeChange, onEventClick, onSelect, onAdd, onPrint, toolbarExtra, isBlocking = false } ) {
	const hostRef = useRef( null );
	const adapterRef = useRef( null );
	const dateInputRef = useRef( null );
	const [ title, setTitle ] = useState( '' );
	const [ view, setView ] = useState( 'timeGridWeek' );

	// The EC instance is created ONCE (an option change re-creates it — that risk is the whole
	// point of the adapter), so the handlers passed into `createAdapter` freeze the props of the
	// FIRST render. That is how "Block time" became a dead button: arming the mode produced a new
	// `onSelect` closure the calendar never saw, so every slot click still ran the mount-time
	// closure and navigated to the New-booking drawer. EC callbacks read the latest props here —
	// `isBlocking` included, because `eventClick` has to branch on the live mode too.
	const handlers = useRef( { onSelect, onEventClick, onRangeChange, isBlocking } );
	useEffect( () => {
		handlers.current = { onSelect, onEventClick, onRangeChange, isBlocking };
	} );

	// The VISIBLE WINDOW travels by ref for the same reason the handlers do: `redrawNow` is
	// captured once by the mount effect's resize listener and its 30-second interval, so a
	// `useCallback` that closed over the window would keep drawing the now-line against the
	// window the grid had at mount — off by exactly the amount the window later grew.
	const windowRef = useRef( slotWindow );
	useEffect( () => {
		windowRef.current = slotWindow;
	} );

	// The window the LIVE instance is currently drawing, so a change can be measured (the scroll
	// anchor below needs the band it is leaving, not the one React is rendering).
	const appliedWindowRef = useRef( slotWindow );

	const redrawNow = useCallback( () => {
		// setTimeout(0) (not rAF): runs after Svelte's flush AND in a backgrounded tab.
		setTimeout( () => renderNowIndicator(
			hostRef.current,
			businessNowMinutes( TZ ),
			windowRef.current.minMinutes,
			windowRef.current.maxMinutes
		), 0 );
	}, [] );

	const refreshToolbar = useCallback( () => {
		// EC v5 updates getView().title asynchronously (gotcha #1) — defer the read.
		setTimeout( () => {
			const adapter = adapterRef.current;
			if ( ! adapter ) {
				return;
			}
			const v = adapter.getView();
			setTitle( v.title );
			setView( v.type );
			redrawNow();
		}, 0 );
	}, [ redrawNow ] );

	// Mount once.
	useLayoutEffect( () => {
		const adapter = createAdapter( hostRef.current, {
			view: 'timeGridWeek',
			date: toBusinessLocalDate( Date.now(), TZ ),
			headerToolbar: { start: '', center: '', end: '' },
			firstDay: config.settings.weekStartsOn,
			slotMinTime: slotWindow.slotMinTime,
			slotMaxTime: slotWindow.slotMaxTime,
			// LAST-RESORT no-clip guarantee (EC 5.10 `lib/slots.js`): should an event ever fall
			// outside the window the route derived — a booking that arrives after the derivation,
			// a future caller that forgets to feed one in — EC expands the limits for the affected
			// view dates instead of dropping the event off the grid unseen. It caps any expansion
			// at a 24-hour span, and in normal operation the derived window already covers
			// everything, so this never fires.
			//
			// The FILTER has to match the route's own rule or the two layers disagree: passing
			// `true` uses EC's default (background events excluded, everything else counted), and a
			// full-day time-off block — a labelled event spanning midnight to midnight — then blew
			// the grid open to 00:00–24:00 for its whole week even though the derivation had
			// deliberately ignored it (caught in the browser, Codex review P2-1). Naming the filter
			// re-states both exclusions: background stripes AND day offs.
			flexibleSlotTimeLimits: {
				eventFilter: ( event ) => 'background' !== event?.display && ! isFullDayBlock( event ),
			},
			slotDuration: SLOT_DURATION,
			slotHeight: 34,
			allDaySlot: false,
			nowIndicator: false,
			// The grid reports its ACTIVE RANGE up so the route can derive the window from what is on
			// screen rather than from six weeks of loaded data (Codex review P2-1). EC fires this on
			// mount and on every prev/next/view change; it never fires for a slot-limit change, so
			// there is no range → window → range loop (`slotMaxTime` stays ≤ 24:00, the only thing
			// that would move the active range — `time-grid/lib.js`).
			datesSet: ( info ) => { handlers.current.onRangeChange?.( { start: info.start, end: info.end } ); },
			dayHeaderFormat: { weekday: 'short', day: 'numeric' },
			slotLabelFormat: { hour: 'numeric', minute: '2-digit' },
			events: events || [],
			eventContent,
			// Native tooltip over the whole blocked-period event (C3) — the reason, on hover.
			eventDidMount: ( info ) => {
				const { kind, reason } = info.event.extendedProps || {};
				if ( kind === 'blocked' && reason ) {
					info.el.title = reason;
				}
			},
			// Events are READ-ONLY on this grid. EC's Interaction plugin resolves draggability as
			// `event.startEditable ?? eventStartEditable ?? event.editable ?? editable`
			// (node_modules/@event-calendar/core/src/plugins/interaction/lib/events.js) and
			// `eventStartEditable` DEFAULTS TO TRUE — so the `editable: false` default is never
			// reached and every booking/blocked period shipped draggable + resizable. With no
			// `eventDrop`/`eventResize` handler that was a phantom reschedule: the event visibly
			// moved, nothing was written, and a reload put it back. Both axes are turned off
			// explicitly; a real drag-to-reschedule needs a write path first.
			editable: false,
			eventStartEditable: false,
			eventDurationEditable: false,
			selectable: true,
			select: ( info ) => { handlers.current.onSelect?.( info ); adapter.unselect(); },
			// EC v5 fires `select` only on click-DRAG; a bare click on a free slot fires
			// `dateClick` and reports the instant only. Route both through the same handler and
			// let it resolve the range (`slot-select.js`): a zero-length range is fine for a
			// booking prefill but is rejected outright by POST /blocked-periods.
			dateClick: ( info ) => { handlers.current.onSelect?.( { start: info.date, end: null } ); },
			eventClick: ( info ) => {
				// While "Block time" is armed the grid is a SLOT PICKER, and an event must not
				// be a hole in it. EC renders events in a layer ABOVE the day cells and their
				// own pointer handler wins, so every pixel covered by one used to bypass
				// `dateClick`/`select` entirely: clicking a booking navigated to #bookings
				// (the original report, still live for event-covered pixels) and clicking a
				// blocked period did nothing at all. `.is-blocking .ec-event` is
				// pointer-transparent (calendar.css) so EC's own `dateClick` fires on the day
				// cell underneath with the exact clicked instant; this branch is the guard for
				// when that CSS is not in play — a stale cached stylesheet, or the keyboard
				// activation EC wires onto the event's `role="button"`.
				if ( handlers.current.isBlocking ) {
					handlers.current.onSelect?.( { start: info.event.start, end: null } );
					return;
				}
				const id = info.event.extendedProps.bookingId;
				if ( id ) {
					handlers.current.onEventClick?.( id );
				}
			},
		} );
		adapterRef.current = adapter;
		refreshToolbar();
		const onResize = () => redrawNow();
		window.addEventListener( 'resize', onResize );
		const timer = setInterval( redrawNow, 30000 );
		return () => {
			window.removeEventListener( 'resize', onResize );
			clearInterval( timer );
			adapter.destroy();
			adapterRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [] );

	// Reconcile events without re-creating the instance.
	useEffect( () => {
		adapterRef.current?.update( { events: events || [] } );
		redrawNow();
	}, [ events, redrawNow ] );

	// …and the derived window the same way. It moves when the business hours, the staff scope, the
	// visible range or the loaded bookings do; EC parses the `HH:MM:SS` strings on `setOption`
	// (Calendar.svelte forwards with `parsed = false`), and the adapter skips keys whose value did
	// not change.
	//
	// The SCROLL POSITION is anchored across the change (Codex review P2-2): `scrollTop` is raw
	// pixels over a band whose origin and height both move with the window, so leaving it alone
	// scrolls the user hours away from what they were looking at — filter out an early booking and
	// a grid that started at 02:00 now starts at 07:00 under the same offset. The minute at the top
	// of the viewport is measured before the change and restored after EC's flush.
	useEffect( () => {
		const adapter = adapterRef.current;
		if ( ! adapter ) {
			return;
		}
		// `.ec-body` unqualified: the time grid's own class can sit ON the host element, in which
		// case a `.ec-time-grid .ec-body` descendant query from the host matches nothing.
		// WHICH ELEMENT ACTUALLY SCROLLS. Event Calendar scrolls `.ec-main` (it has `overflow: auto`
		// and `time-grid/View.svelte` writes `mainEl.scrollTop` itself), and `.ec-body` is the hour
		// rows inside it, under the sticky day headers. But nothing in the admin constrains the
		// calendar's height, so in this layout `.ec-main` grows to fit and the PAGE is the real
		// scroller — anchoring only the element would be a no-op exactly where a person notices the
		// drift. Whichever of the two can actually scroll is the one that gets anchored.
		const measure = () => {
			const main = hostRef.current?.querySelector( '.ec-main' );
			const body = hostRef.current?.querySelector( '.ec-body' );
			if ( ! main || ! body ) {
				return null;
			}
			const innerMax = Math.max( 0, main.scrollHeight - main.clientHeight );
			const page = document.scrollingElement || document.documentElement;
			const scroller = innerMax > 1 ? main : page;
			const bodyTop = body.getBoundingClientRect().top;
			// Distance from the top of the SCROLLED CONTENT to the first hour row, in both frames.
			const contentTop = scroller === main
				? bodyTop - main.getBoundingClientRect().top + main.scrollTop
				: bodyTop + scroller.scrollTop;

			return {
				scroller,
				scrollTop: scroller.scrollTop,
				contentTop,
				contentHeight: body.offsetHeight,
				maxScroll: Math.max( 0, scroller.scrollHeight - scroller.clientHeight ),
			};
		};
		const before = measure();
		const prev = appliedWindowRef.current;
		const next = { minMinutes: slotWindow.minMinutes, maxMinutes: slotWindow.maxMinutes };
		const moved = prev.minMinutes !== next.minMinutes || prev.maxMinutes !== next.maxMinutes;

		adapter.update( {
			slotMinTime: slotWindow.slotMinTime,
			slotMaxTime: slotWindow.slotMaxTime,
		} );
		appliedWindowRef.current = next;
		redrawNow();

		if ( ! moved || ! before ) {
			return;
		}
		// setTimeout(0), like the now-indicator: Svelte re-renders the slot rows asynchronously, so
		// the new scrollHeight does not exist yet in this tick.
		setTimeout( () => {
			const after = measure();
			if ( ! after ) {
				return;
			}
			after.scroller.scrollTop = scrollTopForWindow( {
				scrollTop: before.scrollTop,
				contentTop: before.contentTop,
				contentHeight: before.contentHeight,
				nextContentTop: after.contentTop,
				nextContentHeight: after.contentHeight,
				maxScroll: after.maxScroll,
				prev,
				next,
			} );
		}, 0 );
	}, [ slotWindow.slotMinTime, slotWindow.slotMaxTime, slotWindow.minMinutes, slotWindow.maxMinutes, redrawNow ] );

	const go = ( fn ) => { fn(); refreshToolbar(); };

	// Print day-sheet (C4, review F item 6): the ROUTE owns the data (a dedicated, unfiltered,
	// fully-paginated fetch of the viewed day) — this component only reports which business-local
	// day is on screen when Print is pressed.
	const printDay = () => {
		const v = adapterRef.current?.getView();
		onPrint?.( v && v.currentStart ? new Date( v.currentStart ) : new Date() );
	};

	return (
		<div className={ `ap-cal${ isBlocking ? ' is-blocking' : '' }` }>
			<div className="ap-cal-toolbar">
				<div className="ap-cal-tb-left">
					<button className="ap-cal-icon-btn" type="button" aria-label="Previous" onClick={ () => go( () => adapterRef.current?.prev() ) }>{ renderIcon( 'chevronLeft' ) }</button>
					<button className="ap-cal-btn ap-cal-btn--ghost" type="button" onClick={ () => go( () => adapterRef.current?.gotoDate( toBusinessLocalDate( Date.now(), TZ ) ) ) }>Today</button>
					<button className="ap-cal-icon-btn" type="button" aria-label="Next" onClick={ () => go( () => adapterRef.current?.next() ) }>{ renderIcon( 'chevron' ) }</button>
					<span className="ap-cal-title">{ title }</span>
					<input
						ref={ dateInputRef }
						type="date"
						aria-label="Jump to date"
						style={ { position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' } }
						onChange={ ( e ) => { if ( e.target.value ) { go( () => adapterRef.current?.gotoDate( new Date( `${ e.target.value }T00:00:00` ) ) ); } } }
					/>
					<button className="ap-cal-icon-btn" type="button" aria-label="Pick date" onClick={ () => { const el = dateInputRef.current; if ( el?.showPicker ) el.showPicker(); else el?.focus(); } }>{ renderIcon( 'calendar' ) }</button>
				</div>
				<div className="ap-cal-tb-right">
					<span className="ap-cal-tz">{ renderIcon( 'clock' ) }Business time</span>
					{ toolbarExtra || null }
					{ view === 'timeGridDay' && onPrint ? (
						<button className="ap-cal-btn ap-cal-btn--ghost ap-cal-print" type="button" onClick={ printDay }>{ renderIcon( 'print' ) }Print</button>
					) : null }
					<div className="ap-cal-seg" role="group" aria-label="View">
						<button className="ap-cal-seg-btn" type="button" aria-pressed={ view === 'timeGridDay' } onClick={ () => go( () => adapterRef.current?.setView( 'timeGridDay' ) ) }>Day</button>
						<button className="ap-cal-seg-btn" type="button" aria-pressed={ view === 'timeGridWeek' } onClick={ () => go( () => adapterRef.current?.setView( 'timeGridWeek' ) ) }>Week</button>
					</div>
					<button className="ap-cal-btn ap-cal-btn--primary" type="button" onClick={ () => onAdd?.() }>{ renderIcon( 'plus' ) }Add</button>
				</div>
			</div>
			<div className="ap-cal-host" ref={ hostRef } />
		</div>
	);
}

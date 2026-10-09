/** @jsxImportSource preact */
/**
 * Step 2 — Date & time (SPEC-P1 §2.2 #2).
 *
 * A lazy month calendar plus start-time-only slot chips grouped by the calendar
 * day IN THE DISPLAY TIMEZONE. The friendly `City (GMT±N)` label is always
 * visible in-flow (D1), beside "Available times", with a `Change` button that
 * opens the zone picker (D-R48 — the raw `<select>` band this step used to carry
 * is gone). When the site is showing its OWN clock to a visitor who is somewhere
 * else, the label is prefixed "Times shown in …"; when the display zone differs
 * from the business zone, the business's own time shows as a labelled secondary line.
 * Every rendered time flows through the one `tz.js` formatter — no hand-rolled
 * time math here.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { StepHeader } from './StepHeader.jsx';
import { Footer } from './Footer.jsx';
import { Calendar } from './Calendar.jsx';
import { CalendarSkeleton, SlotsSkeleton } from './Skeletons.jsx';
import { Banner } from './feedback.jsx';
import { TimezoneControl } from './TimezoneControl.jsx';
import { recapLine } from './Summary.jsx';
import { dayKeyInTz, fmtTime, fmtTimeAt, tzLabel } from '../lib/tz.js';
import { COPY, sprintf } from '../lib/copy.js';

const MON3 = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
];

/**
 * The picked day for the slot-list heading, e.g. "October 9", in the active locale. The
 * key already IS the display-zone day, so it is formatted as a UTC calendar date and never
 * shifts with the runtime zone.
 */
function dayHeading( key, locale ) {
	const parts = key.split( '-' ).map( Number );
	return new Intl.DateTimeFormat( locale || undefined, {
		month: 'long',
		day: 'numeric',
		timeZone: 'UTC',
	} ).format( Date.UTC( parts[ 0 ], parts[ 1 ] - 1, parts[ 2 ] ) );
}

/**
 * "Pick a slot for <October 9>" with the day in the accent (founder review 2026-10-01,
 * after LatePoint). The translated sentence is split around the day so the language
 * decides where it sits.
 */
function SlotsHeading( { day } ) {
	const parts = sprintf( COPY.slots_for_day, '\u0000' ).split( '\u0000' );
	return (
		<span class="ap-item-title">
			{ parts[ 0 ] }
			<span class="ap-slots-day">{ day }</span>
			{ parts[ 1 ] || '' }
		</span>
	);
}

/** Human "Mon D" label from a display-tz `YYYY-MM-DD` day key (tz-independent). */
function dayLabel( key ) {
	if ( ! key ) {
		return '';
	}
	const parts = key.split( '-' );
	return MON3[ Number( parts[ 1 ] ) - 1 ] + ' ' + Number( parts[ 2 ] );
}

/**
 * Whether an availability failure is the server saying "slow down" (D-R54).
 *
 * @param {boolean|{kind?:string}} availError Failure carried by the loader.
 * @return {boolean} True for a 429.
 */
function isRateLimited( availError ) {
	return !! availError && availError.kind === 'rate_limited';
}

/**
 * Banner title for an availability failure.
 *
 * @param {boolean|{kind?:string}} availError Failure carried by the loader.
 * @return {string} Title copy.
 */
function availabilityErrorTitle( availError ) {
	return isRateLimited( availError )
		? COPY.rate_limited_load_title
		: COPY.load_availability_err;
}

/**
 * Banner body for an availability failure.
 *
 * A `429` is NOT a connection problem, and "check your connection and try again" sends the
 * visitor to the one recovery that cannot work — reload, retry, give up. When the server said
 * how long to wait (`Retry-After`), say it; otherwise ask for a moment.
 *
 * @param {boolean|{kind?:string, retryAfter?:?number}} availError Failure carried by the loader.
 * @return {string} Body copy.
 */
function availabilityErrorBody( availError ) {
	if ( ! isRateLimited( availError ) ) {
		return COPY.load_retry_sub;
	}
	const seconds = Math.ceil( Number( availError.retryAfter ) || 0 );

	return seconds > 0
		? sprintf( COPY.rate_limited_body, seconds )
		: COPY.rate_limited_wait;
}

export function DateTimeStep( {
	busy = false,
	blocked = false,
	locked = false,
	banner = null,
	primaryLabel = COPY.continue,
	locale,
	displayTz,
	businessTz,
	showTzNote,
	tzOptions,
	tzSuggested,
	calYear,
	calMonth,
	onMonth,
	monthNotice = '',
	availabilityIndex,
	availLoading,
	availError,
	onRetryAvail,
	todayKey,
	years,
	selectedDayKey,
	onSelectDay,
	selectedSlotUtc,
	onSelectSlot,
	// Start instants this visitor already holds at an external checkout (D-R71w). Presentation
	// only: availability is whatever the server said; these are shown as taken, with the reason.
	heldStarts = [],
	onChangeDisplayTz,
	stepIndex,
	progress,
	stepCount,
	focusOnMount,
	onBack,
	onContinue,
} ) {
	const daySlots = selectedDayKey
		? availabilityIndex[ selectedDayKey ] || []
		: [];

	// QA D22 (2026-10-05): on a narrow form the slots appear far below the day the visitor
	// tapped, with no cue. After a VISITOR's day pick (never an auto-pick) the slot list is
	// scrolled into view below 700px of card — instantly under `prefers-reduced-motion` — and
	// the day and its open count are announced.
	const pickedRef = useRef( false );
	const slotsRef = useRef( null );
	const [ announce, setAnnounce ] = useState( '' );
	function pickDay( key ) {
		pickedRef.current = true;
		onSelectDay( key );
	}
	useEffect( () => {
		if ( ! pickedRef.current || ! selectedDayKey || availLoading ) {
			return;
		}
		pickedRef.current = false;
		setAnnounce(
			sprintf( COPY.slots_for_day, dayHeading( selectedDayKey, locale ) ) +
				'. ' +
				sprintf( COPY.slots_open, daySlots.length )
		);
		const el = slotsRef.current;
		const wrap = el && el.closest ? el.closest( '.ap-wrap' ) : null;
		if ( ! el || ! wrap || typeof el.scrollIntoView !== 'function' ) {
			return;
		}
		if ( wrap.getBoundingClientRect().width >= 700 ) {
			return;
		}
		const reduce =
			typeof window !== 'undefined' &&
			window.matchMedia &&
			window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
		el.scrollIntoView( { block: 'nearest', behavior: reduce ? 'auto' : 'smooth' } );
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ selectedDayKey, availLoading ] );
	// The visitor's own held times: on the picked day they sit in the grid, in order, marked
	// and not selectable; on a day that cannot be picked at all they are named in one line.
	const open = daySlots.map( ( slot ) => slot.start_utc );
	const held = heldStarts.filter( ( start ) => ! open.includes( start ) );
	const heldToday = held.filter(
		( start ) => dayKeyInTz( start, displayTz ) === selectedDayKey
	);
	const heldElsewhere = held.filter(
		( start ) => ! availabilityIndex[ dayKeyInTz( start, displayTz ) ]
	);
	const shownSlots = heldToday.length
		? daySlots
				.concat( heldToday.map( ( start ) => ( { start_utc: start, held: true } ) ) )
				.sort( ( a, b ) => Date.parse( a.start_utc ) - Date.parse( b.start_utc ) )
		: daySlots;
	const heldLines = heldElsewhere.map( ( start ) => (
		<div class="ap-studio-line" key={ start }>
			{ sprintf(
				COPY.slot_in_cart_at,
				recapLine( { service: null, slotUtc: start, displayTz, locale } )
			) }
		</div>
	) );
	const refInstant =
		selectedSlotUtc ||
		( daySlots.length ? daySlots[ 0 ].start_utc : Date.now() );

	// The zone line ALWAYS sits under the grid (founder 2026-10-02, supersedes the 2026-09-30
	// "up when the clocks differ" rule): one fixed place for the label and its Change trigger,
	// so switching zones never moves the control the visitor just used, and the day heading and
	// its times stay together. It is rendered exactly once (D1), and its picker opens upward.
	const tzLine = (
		<div class="ap-slots-tz">
			<TimezoneControl
				displayTz={ displayTz }
				zones={ tzOptions }
				suggested={ tzSuggested }
				refInstant={ refInstant }
				showNote={ showTzNote }
				onChange={ onChangeDisplayTz }
				placement="up"
			/>
		</div>
	);

	function renderSlots() {
		if ( ! selectedDayKey ) {
			// No day picked: the zone line stays (persona QA 2026-10-05, T-096 — it used to vanish
			// with the day, taking the "Change" the visitor had just used with it), and a month
			// with nothing to book says so instead of showing a silent grey grid (T-073).
			return (
				<div>
					{ ! Object.keys( availabilityIndex ).length && (
						<div class="ap-noslot">{ COPY.no_slots_month }</div>
					) }
					{ heldLines }
					{ tzLine }
				</div>
			);
		}
		return (
			<div ref={ slotsRef }>
				{ /* The heading names the picked day ("Thu, Oct 1") with the open
				   count trailing it; the display-zone label is its own caption line
				   under the grid (founder review 2026-09-30 / 2026-10-02) and still
				   doubles as the picker's trigger. */ }
				<div class="ap-slots-head">
					<SlotsHeading day={ dayHeading( selectedDayKey, locale ) } />
					<span class="ap-slots-count">
						{ sprintf( COPY.slots_open, daySlots.length ) }
					</span>
				</div>
				{ shownSlots.length ? (
					<div
						class="ap-slots"
						role="radiogroup"
						aria-label={ COPY.available_times }
					>
						{ shownSlots.map( ( slot ) =>
							slot.held ? (
								<button
									type="button"
									class="ap-slot gone"
									key={ slot.start_utc }
									disabled
									title={ COPY.slot_in_cart }
									aria-label={
										fmtTime( slot.start_utc, displayTz, locale ) +
										' — ' +
										COPY.slot_in_cart
									}
								>
									{ fmtTime( slot.start_utc, displayTz, locale ) }
								</button>
							) : (
							<button
								type="button"
								class="ap-slot"
								key={ slot.start_utc }
								role="radio"
								aria-checked={
									selectedSlotUtc === slot.start_utc
										? 'true'
										: 'false'
								}
								onClick={ () => onSelectSlot( slot.start_utc ) }
							>
								{ fmtTime( slot.start_utc, displayTz, locale ) }
							</button>
							)
						) }
					</div>
				) : (
					<div class="ap-noslot">
						{ sprintf(
							COPY.no_slots_day,
							dayLabel( selectedDayKey )
						) }
					</div>
				) }
				{ heldToday.length > 0 && (
					<div class="ap-studio-line">
						{ sprintf(
							COPY.slot_in_cart_at,
							heldToday
								.map( ( start ) => fmtTime( start, displayTz, locale ) )
								.join( ', ' )
						) }
					</div>
				) }
				{ heldLines }
				{ tzLine }
				{ /* The business's own time is a consequence of the pick, so it sits with the
				   zone it qualifies, right above Continue — and picking a slot no longer
				   pushes the grid down a line. It carries the business DATE whenever
				   that is not the customer's (persona QA 2026-10-05, T-058). */ }
				{ selectedSlotUtc && displayTz !== businessTz && (
					<div class="ap-studio-line">
						{ sprintf(
							COPY.business_time_line,
							fmtTimeAt( selectedSlotUtc, businessTz, displayTz, locale ),
							tzLabel( businessTz, selectedSlotUtc )
						) }
					</div>
				) }
			</div>
		);
	}

	return (
		<div class="ap-step">
			{ banner }
			<StepHeader
				title={ COPY.datetime_title }
				stepIndex={ stepIndex }
				progress={ progress }
				stepCount={ stepCount }
				focusOnMount={ focusOnMount }
			/>

			{ /* D-R64 item 4: when the calendar opened on a LATER month because the current one had
			   no open time, say so. Always mounted (empty until then) — a live region that appears
			   together with its text is not reliably announced. The month select already shows the
			   month to sighted visitors, so this is screen-reader only. */ }
			<p class="ap-visually-hidden" role="status" aria-live="polite">
				{ monthNotice }
			</p>
			<p class="ap-visually-hidden" aria-live="polite">
				{ announce }
			</p>

			<fieldset
				disabled={ locked }
				style={ { border: 0, padding: 0, margin: 0, minWidth: 0 } }
			>
				{ availError ? (
					<div>
						<Banner
							variant="err"
							title={ availabilityErrorTitle( availError ) }
							body={ availabilityErrorBody( availError ) }
						/>
						<Footer
							onBack={ onBack }
							onPrimary={ onRetryAvail }
							primaryLabel={ COPY.try_again }
						/>
					</div>
				) : availLoading &&
				  ! Object.keys( availabilityIndex ).length ? (
					<div>
						<CalendarSkeleton />
						<div style={ { marginTop: '18px' } }>
							<SlotsSkeleton />
						</div>
					</div>
				) : (
					<div>
						<Calendar
							year={ calYear }
							month={ calMonth }
							locale={ locale }
							todayKey={ todayKey }
							availabilityIndex={ availabilityIndex }
							selectedDayKey={ selectedDayKey }
							years={ years }
							onSelectDay={ pickDay }
							onMonth={ onMonth }
						/>
						{ availLoading ? (
							<div style={ { marginTop: '18px' } }>
								<SlotsSkeleton />
							</div>
						) : (
							renderSlots()
						) }
					</div>
				) }
			</fieldset>
			{ ! availError &&
				! (
					availLoading && ! Object.keys( availabilityIndex ).length
				) && (
					<Footer
						onBack={ onBack }
						backDisabled={ locked }
						onPrimary={ onContinue }
						primaryLabel={ primaryLabel }
						primaryDisabled={ ! selectedSlotUtc || blocked }
						busy={ busy }
					/>
				) }
		</div>
	);
}

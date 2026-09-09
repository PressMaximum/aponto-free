/**
 * Weekly opening-hours editor grid (SPEC-P1 §1.3), shared by the business-hours
 * panel (Settings → General) and the per-staff "Customize" work-hours editor
 * (StaffWorkspace). One weekday per row: an Open/Closed toggle plus one or more
 * time periods (`type=time`, 5-minute step). A day with `periods: []` is an
 * explicit CLOSED marker (contract §2.6); the row stays in the payload.
 *
 * State shape: `weekly` is a map `{ [isoWeekday 1..7]: [{ start, end }] }` in
 * MINUTES from midnight. The component is controlled — every edit calls
 * `onChange( nextWeekly )`.
 */
import { renderIcon } from './icon.jsx';

export const WEEKDAYS = [
	[ 1, 'Monday' ],
	[ 2, 'Tuesday' ],
	[ 3, 'Wednesday' ],
	[ 4, 'Thursday' ],
	[ 5, 'Friday' ],
	[ 6, 'Saturday' ],
	[ 7, 'Sunday' ],
];

const pad = ( n ) => String( n ).padStart( 2, '0' );

/** Minutes-from-midnight → `HH:MM` (24h) for a `type=time` input. */
export const minToTime = ( m ) => `${ pad( Math.floor( m / 60 ) ) }:${ pad( m % 60 ) }`;

/** `HH:MM` → minutes from midnight. */
export const timeToMin = ( t ) => {
	const [ h, m ] = String( t ).split( ':' ).map( Number );
	return ( h || 0 ) * 60 + ( m || 0 );
};

/**
 * Minutes → friendly 12h label (`9:00 AM`) for read-only summaries. 1440 (end-of-day) wraps to the
 * NEXT midnight — `12:00 AM`, not `12:00 PM` (review F item 5).
 */
export const minLabel = ( m ) => {
	const h = Math.floor( m / 60 ) % 24;
	const mm = m % 60;
	const ap = h < 12 ? 'AM' : 'PM';
	const h12 = h % 12 || 12;
	return `${ h12 }:${ pad( mm ) } ${ ap }`;
};

/** Whether the site time format is 12-hour — a stray `a`/`A` in the PHP format string (C7). */
export const uses12h = ( timeFormat ) => /a/i.test( String( timeFormat || '' ) );

/** Minutes → a label in the SITE's time format: `9:00 AM` (12h) or `09:00` (24h) — C7. */
export const formatMinutes = ( m, timeFormat ) => ( uses12h( timeFormat ) ? minLabel( m ) : minToTime( m ) );

// 5-minute granularity for the opening-hours dropdowns — the same step the native time inputs
// used and the spec's hours resolution (SPEC-P1 §1.3; review F item 5: a 15′ menu silently loses
// existing :05/:10 openings).
const TIME_STEP = 5;

/** Build the time options for one picker, in the site format, preserving an off-grid current value. */
function timeOptions( currentMin, timeFormat ) {
	const opts = [];
	const seen = new Set();
	for ( let m = 0; m < 1440; m += TIME_STEP ) {
		opts.push( { value: m, label: formatMinutes( m, timeFormat ) } );
		seen.add( m );
	}
	if ( currentMin !== null && currentMin !== undefined && ! seen.has( currentMin ) ) {
		opts.push( { value: currentMin, label: formatMinutes( currentMin, timeFormat ) } );
		opts.sort( ( a, b ) => a.value - b.value );
	}
	return opts;
}

/** A site-format-aware time picker (replaces the browser-locale-only native time input) — C7. */
export function TimeSelect( { value, onChange, ariaLabel, timeFormat, disabled = false } ) {
	return (
		<select
			className="ap-hours-time"
			aria-label={ ariaLabel }
			value={ value }
			disabled={ disabled }
			onChange={ ( e ) => onChange( Number( e.target.value ) ) }
		>
			{ timeOptions( value, timeFormat ).map( ( o ) => (
				<option key={ o.value } value={ o.value }>{ o.label }</option>
			) ) }
		</select>
	);
}

/**
 * Sort every day's periods ascending by start so the REST full-replacement (which
 * requires sorted, non-overlapping periods) never 422s on user entry order.
 *
 * @param {Object} weekly Weekday → periods map.
 * @return {Object} A new sorted map.
 */
export function sortWeekly( weekly ) {
	const out = {};
	Object.keys( weekly || {} ).forEach( ( n ) => {
		out[ n ] = [ ...( weekly[ n ] || [] ) ].sort( ( a, b ) => a.start - b.start );
	} );
	return out;
}

/**
 * Validate a weekly map: every period needs end > start, and periods within a day
 * must not overlap once sorted. Returns the first human-readable error, or null.
 *
 * @param {Object} weekly Weekday → periods map.
 * @return {?string} Error message or null when valid.
 */
export function validateWeekly( weekly ) {
	for ( const [ n, label ] of WEEKDAYS ) {
		const periods = [ ...( ( weekly || {} )[ n ] || [] ) ].sort( ( a, b ) => a.start - b.start );
		let prevEnd = -1;
		for ( const p of periods ) {
			if ( p.end <= p.start ) {
				return `${ label }: each period must end after it starts.`;
			}
			if ( p.start < prevEnd ) {
				return `${ label }: hours overlap — adjust the times.`;
			}
			prevEnd = p.end;
		}
	}
	return null;
}

/**
 * The editable weekly grid.
 *
 * `busy` means INERT, not merely announced: every control is really `disabled` while a save is
 * in flight. Both consumers persist the week as a FULL replacement (`PUT .../schedule`,
 * `PUT /business-hours`), so an edit accepted mid-write either lands in a second, overlapping
 * replacement or is silently discarded by the reload that follows the first one — the grid must
 * not accept input it cannot honour (Codex review item 1).
 *
 * @param {Object}   props
 * @param {Object}   props.weekly       Weekday → periods map (minutes).
 * @param {Function} props.onChange     `( nextWeekly ) => void`.
 * @param {boolean}  [props.busy]       A save is in flight: `aria-busy` AND every control disabled.
 * @param {string}   [props.timeFormat] Site PHP time format; a/A → 12h pickers (C7). Default 24h.
 */
export function WeeklyHoursGrid( { weekly, onChange, busy = false, timeFormat = '' } ) {
	const setDayClosed = ( n ) => onChange( { ...weekly, [ n ]: [] } );
	const setDayOpen = ( n ) => onChange( { ...weekly, [ n ]: [ { start: 540, end: 1020 } ] } );
	const setPeriod = ( n, i, key, min ) =>
		onChange( { ...weekly, [ n ]: weekly[ n ].map( ( p, idx ) => ( idx === i ? { ...p, [ key ]: min } : p ) ) } );
	const addPeriod = ( n ) => onChange( { ...weekly, [ n ]: [ ...( weekly[ n ] || [] ), { start: 540, end: 1020 } ] } );
	const removePeriod = ( n, i ) => onChange( { ...weekly, [ n ]: weekly[ n ].filter( ( _, idx ) => idx !== i ) } );

	// C8: copy the first open day's periods onto every OTHER open day (closed days stay closed).
	const openDays = WEEKDAYS.filter( ( [ n ] ) => ( weekly[ n ] || [] ).length );
	const applyToAllOpen = () => {
		if ( openDays.length < 2 ) {
			return;
		}
		const template = weekly[ openDays[ 0 ][ 0 ] ];
		const next = { ...weekly };
		openDays.forEach( ( [ n ] ) => {
			next[ n ] = template.map( ( p ) => ( { ...p } ) );
		} );
		onChange( next );
	};

	return (
		<div className={ `ap-hours-grid${ busy ? ' is-busy' : '' }` } aria-busy={ busy }>
			{ openDays.length >= 2 ? (
				<div className="ap-hours-toolbar">
					<button type="button" className="pd-button text sm" disabled={ busy } onClick={ applyToAllOpen }>
						{ renderIcon( 'files' ) }Apply { WEEKDAYS.find( ( [ n ] ) => n === openDays[ 0 ][ 0 ] )[ 1 ] }’s hours to all open days
					</button>
				</div>
			) : null }
			{ WEEKDAYS.map( ( [ n, label ] ) => {
				const periods = weekly[ n ] || [];
				return (
					<div className="ap-hours-day" key={ n }>
						<div className="ap-hours-day-head">
							<strong>{ label }</strong>
							{ periods.length ? (
								<button type="button" className="pd-button text sm" disabled={ busy } onClick={ () => setDayClosed( n ) }>Closed</button>
							) : (
								<button type="button" className="pd-button text sm" disabled={ busy } onClick={ () => setDayOpen( n ) }>Open</button>
							) }
						</div>
						{ periods.length ? periods.map( ( p, i ) => (
							<div className="ap-hours-period" key={ i }>
								<TimeSelect value={ p.start } onChange={ ( min ) => setPeriod( n, i, 'start', min ) } ariaLabel={ `${ label } start` } timeFormat={ timeFormat } disabled={ busy } />
								<span>–</span>
								<TimeSelect value={ p.end } onChange={ ( min ) => setPeriod( n, i, 'end', min ) } ariaLabel={ `${ label } end` } timeFormat={ timeFormat } disabled={ busy } />
								<button type="button" className="pd-icon-button sm" aria-label="Remove period" disabled={ busy } onClick={ () => removePeriod( n, i ) }>{ renderIcon( 'close' ) }</button>
							</div>
						) ) : <span className="ap-hours-closed">Closed</span> }
						{ periods.length ? <button type="button" className="pd-button text sm" disabled={ busy } onClick={ () => addPeriod( n ) }>{ renderIcon( 'plus' ) }Add hours</button> : null }
					</div>
				);
			} ) }
		</div>
	);
}

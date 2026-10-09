/**
 * Pure weekly-hours helpers for the per-branch work-hours authoring of D-R63 (SPEC-P1 §1.2).
 *
 * Hours live on the STAFF member (D-R60 rule 1). Each branch is one more schedule SCOPE of the same
 * person — `GET`/`PUT /staff/{id}/schedule?location_id=N`, weight-5 rows (rest-contract §2.6
 * addendum 2026-09-23) — beside the wildcard scope "All locations" (`location_id = 0`) the Work hours
 * card has always edited. A scope with no weekly rows INHERITS: the All-locations rows when the
 * member has them, otherwise the business hours.
 *
 * Two grid shapes meet here, and every helper says which one it takes:
 *   - the EDITOR map `{ [weekday 1..7]: [ { start, end } ] }` in minutes (`WeeklyHoursGrid`);
 *   - the CONTRACT rows `[ { weekday, periods: [ { start_minute, end_minute } ] } ]` (§2.6).
 *
 * Framework-free (Jest imports it under node) and free of module-level state, because the Location
 * editor's module chunk imports it as well (handoff 2026-09-21 §2).
 */
import { _x } from '@wordpress/i18n';
import { formatMinutes } from './WeeklyHoursGrid.jsx';

/** Short weekday names, ISO 1..7 — built per call so the loaded translations apply. */
function dayShort() {
	return [
		'',
		_x( 'Mon', 'weekday abbreviation', 'aponto' ),
		_x( 'Tue', 'weekday abbreviation', 'aponto' ),
		_x( 'Wed', 'weekday abbreviation', 'aponto' ),
		_x( 'Thu', 'weekday abbreviation', 'aponto' ),
		_x( 'Fri', 'weekday abbreviation', 'aponto' ),
		_x( 'Sat', 'weekday abbreviation', 'aponto' ),
		_x( 'Sun', 'weekday abbreviation', 'aponto' ),
	];
}

/**
 * Canonical `weekly` payload rows for contract §2.6: ascending weekday, ascending non-overlapping
 * periods. `JSON.stringify` of the result is also each scope's dirty-check signature, so "what we
 * would send" and "what we compare" can never drift.
 *
 * @param {Object} weekly Editor map.
 * @return {Array} Contract rows.
 */
export function weeklyRows( weekly ) {
	return Object.keys( weekly || {} )
		.map( Number )
		.sort( ( a, b ) => a - b )
		.map( ( weekday ) => ( {
			weekday,
			periods: [ ...( weekly[ weekday ] || [] ) ]
				.sort( ( a, b ) => a.start - b.start )
				.map( ( p ) => ( { start_minute: p.start, end_minute: p.end } ) ),
		} ) );
}

/**
 * Contract rows → editor map.
 *
 * @param {Array} rows Contract rows (a schedule GET's `weekly`).
 * @return {Object} Editor map.
 */
export function weeklyMap( rows ) {
	const map = {};
	( rows || [] ).forEach( ( row ) => {
		map[ row.weekday ] = ( row.periods || [] ).map( ( p ) => ( { start: p.start_minute, end: p.end_minute } ) );
	} );
	return map;
}

/**
 * The editor map a Customize opens on: a DEEP COPY of the source for all seven days (open days carry
 * their periods, every other day is an explicit Closed `[]`), so the grid shows the whole week.
 *
 * `fallback` (default on) is the LEGACY wildcard rule: when the business hours are closed all week
 * (a skipped wizard leaves none) it seeds Mon–Fri 09:00–17:00 so there is something to edit
 * (U4-03b). A BRANCH copy passes `fallback: false` (D-R63 fix round 1): it copies the resolved grid
 * verbatim, and a branch that is closed all week stays closed.
 *
 * @param {Object}  source           Weekday → contract periods `[ { start_minute, end_minute } ]`.
 * @param {Object}  [opts]
 * @param {boolean} [opts.fallback]  Seed Mon–Fri 09:00–17:00 for an all-closed source.
 * @return {Object} Editor map.
 */
export function seedWeekly( source, { fallback = true } = {} ) {
	const map = {};
	for ( let day = 1; day <= 7; day++ ) {
		const periods = ( source || {} )[ day ];
		map[ day ] = periods && periods.length ? periods.map( ( p ) => ( { start: p.start_minute, end: p.end_minute } ) ) : [];
	}
	if ( fallback && ! Object.values( map ).some( ( periods ) => periods.length ) ) {
		for ( let day = 1; day <= 7; day++ ) {
			map[ day ] = day <= 5 ? [ { start: 540, end: 1020 } ] : [];
		}
	}
	return map;
}

/**
 * Contract rows → weekday → contract periods (the shape `seedWeekly` takes).
 *
 * @param {Array} rows Contract rows.
 * @return {Object} Weekday map.
 */
export function periodsByWeekday( rows ) {
	const map = {};
	( rows || [] ).forEach( ( row ) => { map[ row.weekday ] = row.periods || []; } );
	return map;
}

/**
 * Deep copy of an editor map, so a copied branch never shares arrays with its source.
 *
 * @param {Object} weekly Editor map.
 * @return {Object} Copy.
 */
export function cloneWeekly( weekly ) {
	const copy = {};
	Object.keys( weekly || {} ).forEach( ( day ) => {
		copy[ day ] = ( weekly[ day ] || [] ).map( ( p ) => ( { start: p.start, end: p.end } ) );
	} );
	return copy;
}

/**
 * Whether one scope holds an unsaved edit. `baseline` is null until that scope's GET succeeded, so a
 * scope that failed to load can never look dirty — and the page Save can never replace a real
 * schedule it could not read with an empty one.
 *
 * @param {Object} scope `{ weekly, baseline }`.
 * @return {boolean} Dirty.
 */
export function scopeIsDirty( scope ) {
	return Boolean( scope ) && null !== scope.baseline && undefined !== scope.baseline
		&& JSON.stringify( weeklyRows( scope.weekly ) ) !== scope.baseline;
}

/**
 * Every dirty scope, All locations (`0`) first then branches ascending — the order the page Save
 * flushes them in, one at a time, through the section's write queue.
 *
 * @param {Object} scopes Location id → scope.
 * @return {number[]} Dirty scope ids.
 */
export function dirtyScopeIds( scopes ) {
	return Object.keys( scopes || {} )
		.map( Number )
		.filter( ( id ) => scopeIsDirty( scopes[ id ] ) )
		.sort( ( a, b ) => a - b );
}

/**
 * Where an INHERITING branch scope takes its hours from — the words the card shows.
 *
 * @param {Object} allScope The All-locations scope (`0`).
 * @return {'all'|'business'} Source.
 */
export function inheritedSource( allScope ) {
	return allScope?.custom ? 'all' : 'business';
}

/**
 * The scopes a branch can "Copy hours from…": All locations always (its rows, or the business hours
 * it inherits — either way a real week), plus every OTHER branch that has custom rows. The branch
 * being edited is never its own source.
 *
 * @param {Object}   args
 * @param {Object}   args.scopes    Location id → scope.
 * @param {number}   args.activeId  The branch being edited.
 * @param {Array}    args.locations Active branches `[ { id, name } ]`, in display order.
 * @return {number[]} Source ids, `0` first.
 */
export function copySourceIds( { scopes, activeId, locations } ) {
	const ids = [ 0 ];
	( locations || [] ).forEach( ( location ) => {
		if ( location.id !== activeId && scopes?.[ location.id ]?.custom ) {
			ids.push( location.id );
		}
	} );
	return ids;
}

/**
 * One-line weekly summary for read-only surfaces (the Location editor's Hours card):
 * `Mon–Fri 09:00–17:00 · Sat 10:00–14:00`. Consecutive weekdays with IDENTICAL periods collapse
 * into a range; closed days are omitted; an empty week returns ''.
 *
 * @param {Array}  rows       Contract rows (a resolved schedule's `weekly`).
 * @param {string} timeFormat Site PHP time format (12h vs 24h, C7).
 * @return {string} Summary.
 */
export function summarizeWeekly( rows, timeFormat ) {
	const byDay = periodsByWeekday( rows );
	const names = dayShort();
	const label = ( day ) => ( byDay[ day ] || [] )
		.map( ( p ) => `${ formatMinutes( p.start_minute, timeFormat ) }–${ formatMinutes( p.end_minute, timeFormat ) }` )
		.join( ', ' );

	const groups = [];
	for ( let day = 1; day <= 7; day++ ) {
		const text = label( day );
		if ( ! text ) {
			continue;
		}
		const last = groups[ groups.length - 1 ];
		if ( last && last.text === text && last.to === day - 1 ) {
			last.to = day;
		} else {
			groups.push( { from: day, to: day, text } );
		}
	}

	return groups
		.map( ( group ) => `${ group.from === group.to ? names[ group.from ] : `${ names[ group.from ] }–${ names[ group.to ] }` } ${ group.text }` )
		.join( ' · ' );
}

/** @jsxImportSource preact */
/**
 * The display-zone affordance and its picker (D-R48, founder 2026-09-18 — the
 * "quiet timezone" model C3).
 *
 * It replaces the raw 18-option `<select>` that used to sit under the slot grid.
 * In flow the visitor sees one quiet line beside "Available times" —
 * `Ho Chi Minh (GMT+7) · Change` — and the whole IANA zone database only when
 * they ask for it, behind a searchable dialog. The label half is the D1 invariant
 * (SPEC-P1 §2.2: the display zone is ALWAYS named in flow); the `Change` half is
 * the timezone-correctness invariant (AGENTS §1) and is therefore present in both
 * timezone modes, including for a visitor already on the studio's clock — a
 * traveller books from wherever they happen to be standing.
 *
 * Accessibility: the trigger is a real button carrying `aria-expanded` and
 * `aria-haspopup="dialog"`; opening moves focus into the dialog's search field;
 * Escape (or a click outside, or picking a zone) closes it and returns focus to
 * the trigger.
 *
 * The zone list is NOT a constant in this bundle — `tz.js` reads it from the
 * engine at runtime ({@link allTimezones}), so ~430 names cost the gz budget
 * nothing and can never drift from the database the browser formats with.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { tzLabel } from '../lib/tz.js';
import { COPY, sprintf } from '../lib/copy.js';

/**
 * Fold a zone name or label into the form the search matches against: lowercase,
 * underscores as spaces, so `berl` finds `Europe/Berlin` and `ho chi` finds
 * `Asia/Ho_Chi_Minh`.
 *
 * @param {string} text Raw text.
 * @return {string} Foldable text.
 */
function fold( text ) {
	return String( text || '' )
		.toLowerCase()
		.replace( /_/g, ' ' );
}

/**
 * One zone row.
 *
 * Deliberately a plain `<button>` with NO `option` role (Codex review 1): ARIA's
 * `listbox`/`option` pair is a contract to implement the listbox keyboard model —
 * roving tabindex, arrow-key navigation, `aria-activedescendant` — and claiming
 * the role without the behaviour is worse for a screen-reader user than not
 * claiming it, because it promises keys that do nothing. A searchable list of
 * ordinary buttons is the accepted shape for this control: Tab and Enter already
 * work, and the current zone is marked with `aria-current` rather than the
 * listbox-only `aria-selected`.
 *
 * @param {Object} props Props.
 */
function ZoneRow( { zone, label, selected, onSelect } ) {
	return (
		<button
			type="button"
			class={ 'ap-tz-opt' + ( selected ? ' is-current' : '' ) }
			aria-current={ selected ? 'true' : null }
			onClick={ () => onSelect( zone ) }
		>
			{ label }
		</button>
	);
}

/**
 * Concatenate two row lists, keeping the first occurrence of each zone.
 *
 * @param {Array<Object>} lead Rows that must come first.
 * @param {Array<Object>} rest Rows appended after, minus anything already listed.
 * @return {Array<Object>} Merged rows.
 */
function mergeRows( lead, rest ) {
	const seen = {};
	const out = [];
	lead.concat( rest ).forEach( ( row ) => {
		if ( ! seen[ row.zone ] ) {
			seen[ row.zone ] = true;
			out.push( row );
		}
	} );
	return out;
}

/**
 * The picker dialog itself — search-first (founder review 2026-09-30).
 *
 * Opened, it shows only the Suggested zones (the visitor's, the studio's, the one on
 * screen) under the search field: those are the answer for almost everybody, and a
 * wall of ~430 cities was the problem, not the speed. The full list exists only as
 * search results. Its labels are resolved ONCE, on the first keystroke (each one
 * costs an `Intl.DateTimeFormat`); filtering after that is pure string work.
 *
 * @param {Object} props Props.
 */
function TimezoneDialog( {
	zones,
	suggested,
	value,
	refInstant,
	onSelect,
	onClose,
	labelId,
	placement,
} ) {
	const [ query, setQuery ] = useState( '' );
	const searchRef = useRef( null );

	useEffect( () => {
		if ( searchRef.current && searchRef.current.focus ) {
			searchRef.current.focus();
		}
	}, [] );

	const needle = fold( query.trim() );
	const searching = '' !== needle;
	const build = ( list ) =>
		list.map( ( zone ) => {
			const label = tzLabel( zone, refInstant );
			return { zone, label, needle: fold( zone ) + ' ' + fold( label ) };
		} );
	const suggestedRows = useMemo(
		() => build( suggested || [] ),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[ suggested, refInstant ]
	);
	// Built lazily on the first keystroke, then kept for the rest of this open.
	const allRows = useMemo(
		() => ( searching ? build( zones || [] ) : null ),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[ searching, zones, refInstant ]
	);
	const rows = { suggested: suggestedRows, all: allRows || [] };

	const filter = ( list ) =>
		needle ? list.filter( ( row ) => row.needle.indexOf( needle ) !== -1 ) : list;
	// A search is a search of EVERYTHING; the suggested group is a shortcut for the
	// visitor who has not typed, not a second place results can hide in. Matches
	// from it still lead the results — the visitor's own zone and the studio's are
	// the two answers most likely to be wanted — and the rest follow in the
	// alphabetical order `timezoneOptions()` produced.
	const groups = searching
		? [ { key: 'all', heading: '', rows: mergeRows( filter( rows.suggested ), filter( rows.all ) ) } ]
		: [ { key: 'suggested', heading: COPY.tz_suggested, rows: rows.suggested } ];
	// While searching, the count answers "did my search find anything?"; before the
	// first keystroke the line says how to reach every other zone instead.
	const total = groups[ 0 ].rows.length;
	const countLabel = ! searching
		? COPY.tz_search_hint
		: 1 === total
			? COPY.tz_count_one
			: sprintf( COPY.tz_count, total );

	return (
		<div
			class={ 'ap-tz-pop' + ( 'up' === placement ? ' up' : '' ) }
			role="dialog"
			aria-labelledby={ labelId }
			onKeyDown={ ( e ) => {
				if ( 'Escape' === e.key ) {
					e.stopPropagation();
					onClose();
				}
			} }
		>
			<div class="ap-tz-pop-head">
				<span id={ labelId } class="ap-tz-pop-title">
					{ COPY.tz_dialog_title }
				</span>
				<button
					type="button"
					class="ap-tz-pop-close"
					onClick={ onClose }
					aria-label={ COPY.tz_close }
				>
					×
				</button>
			</div>
			<input
				ref={ searchRef }
				type="search"
				class="ap-tz-search"
				value={ query }
				aria-label={ COPY.tz_search_label }
				placeholder={ COPY.tz_search_placeholder }
				onInput={ ( e ) => setQuery( e.target.value ) }
			/>
			<p class="ap-tz-count" aria-live="polite">
				{ total ? countLabel : '' }
			</p>
			{ total ? (
				<div class="ap-tz-list">
					{ groups.map( ( group ) =>
						group.rows.length ? (
							<div class="ap-tz-group" key={ group.key }>
								{ group.heading ? (
									<p class="ap-tz-group-head" role="presentation">
										{ group.heading }
									</p>
								) : null }
								{ group.rows.map( ( row ) => (
									<ZoneRow
										key={ group.key + ':' + row.zone }
										zone={ row.zone }
										label={ row.label }
										selected={ row.zone === value }
										onSelect={ onSelect }
									/>
								) ) }
							</div>
						) : null
					) }
				</div>
			) : (
				<div class="ap-tz-empty">
					{ sprintf( COPY.tz_no_matches, query.trim() ) }
				</div>
			) }
		</div>
	);
}

/**
 * Label + `Change` + the picker.
 *
 * @param {Object}             props            Props.
 * @param {string}             props.displayTz  The zone every visible time is rendered in.
 * @param {Array<string>}      props.zones      Full picker list (IANA, bookable only).
 * @param {Array<string>}      props.suggested  Pinned group shown above the full list.
 * @param {Date|number|string} props.refInstant Instant the `GMT±N` suffixes resolve at.
 * @param {boolean}            props.showNote   Prefix the label with "Times shown in …".
 * @param {Function}           props.onChange   Called with the newly chosen IANA zone.
 * @param {string}             props.dialogId   ShadowRoot-scoped id for the dialog heading.
 */
export function TimezoneControl( {
	displayTz,
	zones,
	suggested,
	refInstant,
	showNote,
	onChange,
	dialogId = 'ap-tz-dialog',
	// 'up' when the control sits at the foot of the step: the card clips its
	// overflow, so a downward dialog there would be cut off.
	placement = 'down',
} ) {
	const [ open, setOpen ] = useState( false );
	const wrapRef = useRef( null );
	const triggerRef = useRef( null );
	// Return focus to the trigger when the dialog closes — but never steal it on
	// first paint, which is why this tracks the TRANSITION rather than the state.
	const wasOpen = useRef( false );

	useEffect( () => {
		if ( wasOpen.current && ! open && triggerRef.current ) {
			triggerRef.current.focus();
		}
		wasOpen.current = open;
	}, [ open ] );

	useEffect( () => {
		if ( ! open ) {
			return undefined;
		}
		const node = wrapRef.current;
		// Inside the widget's open ShadowRoot a document listener never sees the
		// event's real target, so listen on the root the control actually lives in.
		const root =
			node && typeof node.getRootNode === 'function'
				? node.getRootNode()
				: typeof document !== 'undefined'
					? document
					: null;
		if ( ! root || ! root.addEventListener ) {
			return undefined;
		}
		// The wrapper contains the trigger, so a click on the trigger is never
		// "outside" — the trigger's own handler stays the only thing that toggles.
		const onDown = ( e ) => {
			if ( node && ! node.contains( e.target ) ) {
				setOpen( false );
			}
		};
		root.addEventListener( 'mousedown', onDown, true );
		return () => root.removeEventListener( 'mousedown', onDown, true );
	}, [ open ] );

	const label = tzLabel( displayTz, refInstant );

	return (
		<span class="ap-tz" ref={ wrapRef }>
			<span class="ap-tz-name">
				{ showNote ? sprintf( COPY.times_shown_in_tz, label ) : label }
			</span>
			<span class="ap-tz-sep" aria-hidden="true">
				·
			</span>
			<button
				type="button"
				class="ap-tz-change"
				ref={ triggerRef }
				aria-expanded={ open ? 'true' : 'false' }
				aria-haspopup="dialog"
				// The visible word is "Change"; on its own that names nothing. The
				// accessible name says what changes and what it is now, because a
				// screen-reader user reaches this button without the zone label
				// beside it (Codex review 3).
				aria-label={ sprintf( COPY.change_timezone_a11y, label ) }
				onClick={ () => setOpen( ( value ) => ! value ) }
			>
				{ COPY.change_timezone }
			</button>
			{ open && (
				<TimezoneDialog
					placement={ placement }
					labelId={ dialogId }
					zones={ zones }
					suggested={ suggested }
					value={ displayTz }
					refInstant={ refInstant }
					onClose={ () => setOpen( false ) }
					onSelect={ ( zone ) => {
						setOpen( false );
						if ( zone !== displayTz ) {
							onChange( zone );
						}
					} }
				/>
			) }
		</span>
	);
}

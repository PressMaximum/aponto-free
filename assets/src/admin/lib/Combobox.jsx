/**
 * Searchable combobox used by the in-flow booking editor (customer-first + service
 * + staff). Focus raises the compact floating label, turns the value into a query
 * and opens a filtered listbox; selection / Escape / outside-click resolve back to
 * a valid option (SPEC-P1 §6.7). Reuses the mockup `.pd-combobox` chrome.
 *
 * The caller owns the selection as an OPTION OBJECT (`selected`), not as a display
 * string: identity is `option.id` (see `combobox-options.js`) so two records sharing
 * a name stay distinct rows with distinct React keys, and what the editor submits is
 * always the id of the row the user actually clicked. `option.label` is display-only
 * and remains what typeahead matches on; `option.meta` adds the secondary line that
 * makes two same-named rows distinguishable on screen too (see `combobox-options.js`).
 *
 * The listbox also flips above the field when it would otherwise be clipped by the
 * scrolling inspector body — the `.opens-up` half of the ported chrome, which shipped
 * as CSS with nothing switching it on (see `flipDirection` below).
 */
import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { renderIcon } from './icon.jsx';
import { optionKey, isSameOption, filterOptions } from './combobox-options.js';

export function Combobox( {
	name,
	label,
	selected = null,
	options = [],
	onSelect,
	disabled = false,
	entity = false,
	required = true,
	emptyText,
} ) {
	const [ open, setOpen ] = useState( false );
	const [ query, setQuery ] = useState( '' );
	const [ active, setActive ] = useState( 0 );
	const [ opensUp, setOpensUp ] = useState( false );
	const wrapRef = useRef( null );
	const inputRef = useRef( null );
	const popoverRef = useRef( null );
	const listId = `booking-${ name }-options`;

	useEffect( () => {
		if ( ! open ) {
			return undefined;
		}
		const onDoc = ( e ) => {
			if ( wrapRef.current && ! wrapRef.current.contains( e.target ) ) {
				setOpen( false );
			}
		};
		document.addEventListener( 'pointerdown', onDoc );
		return () => document.removeEventListener( 'pointerdown', onDoc );
	}, [ open ] );

	const selectedLabel = selected?.label ?? '';
	// A query still equal to the current selection is not a filter (focus seeds the
	// input with the selected label) — keep the full list so switching stays one click.
	const filtered = useMemo( () => (
		query === selectedLabel ? options : filterOptions( options, query )
	), [ query, selectedLabel, options ] );

	/**
	 * Open upwards when the listbox would be clipped below the field.
	 *
	 * Mirrors the mockup's `positionCombobox()` verbatim, thresholds included
	 * (docs/mockups/v4/plugin-dashboard/assets/js/plugin-dashboard.js:1732-1742): the
	 * reference box is the scrolling inspector/drawer body — NOT the viewport, since
	 * that body is what clips us — falling back to the viewport when the combobox sits
	 * outside one; the listbox needs `min(scrollHeight, 220) + 8` px (its CSS max-height
	 * plus the 5px offset and a hair); and up wins only when below is short AND above is
	 * roomier, so a cramped field with no better option stays down.
	 *
	 * Both inputs are direction-independent (the field's own box + the content height —
	 * the popover is absolutely positioned, so flipping it changes neither), which is
	 * what keeps the decision from oscillating against itself.
	 */
	const flipDirection = useCallback( () => {
		const wrap = wrapRef.current;
		const popover = popoverRef.current;
		if ( ! wrap || ! popover ) {
			return;
		}
		const body = wrap.closest( '.pd-drawer-body,.pd-booking-inspector-body' );
		const bodyRect = body ? body.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
		const fieldRect = wrap.getBoundingClientRect();
		const needed = Math.min( popover.scrollHeight, 220 ) + 8;
		const below = bodyRect.bottom - fieldRect.bottom;
		const above = fieldRect.top - bodyRect.top;
		setOpensUp( below < needed && above > below );
	}, [] );

	// Measure before paint (never a frame in the wrong direction) on open and whenever
	// the row count changes the listbox height — the mockup likewise re-positions after
	// every filter pass (plugin-dashboard.js:2000-2001). Closing drops the class, the
	// same reset `closeCombobox()` does (plugin-dashboard.js:1805).
	useLayoutEffect( () => {
		if ( ! open ) {
			setOpensUp( false );
			return;
		}
		flipDirection();
	}, [ open, filtered.length, flipDirection ] );

	// A resize can turn a roomy field into a cramped one while the listbox is open. The
	// mockup never re-measures here (its resize handler only touches the drawer), so
	// this is ours: the same rule, re-run on the event that invalidates it.
	useEffect( () => {
		if ( ! open ) {
			return undefined;
		}
		window.addEventListener( 'resize', flipDirection );
		return () => window.removeEventListener( 'resize', flipDirection );
	}, [ open, flipDirection ] );

	const choose = ( option ) => {
		onSelect?.( option );
		setOpen( false );
		setQuery( '' );
	};

	const onKeyDown = ( e ) => {
		if ( e.key === 'Escape' ) {
			setOpen( false );
			setQuery( '' );
			inputRef.current?.blur();
			return;
		}
		if ( e.key === 'ArrowDown' ) {
			e.preventDefault();
			setOpen( true );
			setActive( ( i ) => Math.min( i + 1, filtered.length - 1 ) );
		} else if ( e.key === 'ArrowUp' ) {
			e.preventDefault();
			setActive( ( i ) => Math.max( i - 1, 0 ) );
		} else if ( e.key === 'Enter' && open && filtered[ active ] ) {
			e.preventDefault();
			choose( filtered[ active ] );
		}
	};

	const shown = open ? query : selectedLabel;

	return (
		<div className={ `pd-combobox${ entity ? ' is-entity' : '' }${ open ? ' is-open' : '' }${ opensUp ? ' opens-up' : '' }` } data-combobox ref={ wrapRef }>
			<label className="pd-compact-field pd-combobox-field">
				<input
					ref={ inputRef }
					type="text"
					name={ name }
					value={ shown }
					placeholder=" "
					role="combobox"
					aria-autocomplete="list"
					aria-expanded={ open }
					aria-controls={ listId }
					disabled={ disabled }
					required={ required }
					autoComplete="off"
					data-selected-id={ selected?.id ?? undefined }
					onFocus={ () => { setOpen( true ); setQuery( selectedLabel ); setActive( 0 ); } }
					onChange={ ( e ) => { setQuery( e.target.value ); setOpen( true ); setActive( 0 ); } }
					onKeyDown={ onKeyDown }
				/>
				<span className="pd-compact-label">{ label }</span>
				<span className="pd-field-end-icon">
					<span className="pd-combobox-idle-icon">{ renderIcon( 'chevronDown' ) }</span>
					<span className="pd-combobox-active-icon">{ renderIcon( 'search' ) }</span>
				</span>
			</label>
			<div className="pd-combobox-popover" id={ listId } role="listbox" hidden={ ! open } ref={ popoverRef }>
				{ filtered.map( ( option, index ) => (
					<button
						type="button"
						role="option"
						key={ optionKey( option ) }
						data-option-id={ option.id ?? undefined }
						aria-selected={ isSameOption( option, selected ) }
						className={ index === active ? 'is-active' : undefined }
						onMouseEnter={ () => setActive( index ) }
						onClick={ () => choose( option ) }
					>
						{ /* One row shape for every catalog: an option carrying a `meta` line
						     renders the two-line row the entity (customer) picker introduced —
						     services "30 min · $25.00", staff their email — so same-named
						     records are told apart on screen, not just in the DOM. The
						     entity variant keeps its "No contact details" fallback; a
						     meta-less service/staff row simply stays one line. */ }
						{ entity || option.meta ? (
							<span><strong>{ option.label }</strong><small>{ option.meta || 'No contact details' }</small></span>
						) : option.label }
					</button>
				) ) }
				{ ! filtered.length ? <p data-combobox-empty>{ emptyText || `No ${ label.toLowerCase() } found` }</p> : null }
			</div>
		</div>
	);
}

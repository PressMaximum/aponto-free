/**
 * Reusable draft-model facets for PMDKDataTable's `filterBuilder` / `activeFilters`
 * slots (mockup §7.x facet drawer). Product supplies facet definitions; the kit
 * owns the toolbar chrome, open/close and the `.pmdk-filter-*` styling. Two facet
 * kinds:
 *   - `multi`   — multi-select (Apply/Clear draft). Option identity is the RECORD ID
 *                 when the definition names an `idKey` (`lib/facet-options.js`), else
 *                 the raw column value (enums). Two same-named records therefore stay
 *                 two options that filter independently.
 *   - `toggle`  — a single boolean predicate (e.g. "Has upcoming booking"); the
 *                 column value is a boolean and the filter is on/off.
 *
 * Definition fields: `id` (column id), `label`, `type`, optional `idKey` (+ `labelKey`
 * when the display name lives in another field) for record-keyed facets, and optional
 * `options` — an array, or a function receiving the pre-filtered ROW RECORDS.
 *
 * Mirrors the BookingsTable facet UX but on the kit `.pmdk-*` classes so every
 * B4b list reads identically; both surfaces share the option/identity helpers.
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import { facetChipSummary, facetOptions, facetSummary } from './facet-options.js';

export { inArrayFilter, isTrueFilter, recordFacetFilter } from './facet-options.js';

function FacetMultiPopover( { column, definition, records, renderIcon } ) {
	const [ isOpen, setIsOpen ] = useState( false );
	const [ query, setQuery ] = useState( '' );
	const [ draft, setDraft ] = useState( [] );
	const facetRef = useRef( null );
	const searchRef = useRef( null );
	const selected = Array.isArray( column.getFilterValue() ) ? column.getFilterValue() : [];

	const options = useMemo( () => facetOptions( definition, records ), [ records, definition ] );

	const visibleOptions = options.filter( ( option ) => option.label.toLowerCase().includes( query.trim().toLowerCase() ) );
	const showSearch = options.length > 5;
	const summary = facetSummary( options, selected );

	useEffect( () => {
		if ( ! isOpen ) return undefined;
		const close = ( event ) => {
			if ( ! facetRef.current?.contains( event.target ) ) setIsOpen( false );
		};
		document.addEventListener( 'pointerdown', close );
		return () => document.removeEventListener( 'pointerdown', close );
	}, [ isOpen ] );

	useEffect( () => {
		if ( ! isOpen ) return undefined;
		const frame = window.requestAnimationFrame( () => searchRef.current?.focus() );
		return () => window.cancelAnimationFrame( frame );
	}, [ isOpen ] );

	useEffect( () => {
		if ( ! isOpen ) return undefined;
		const closeOnEscape = ( event ) => {
			if ( event.key !== 'Escape' ) return;
			event.preventDefault();
			event.stopPropagation();
			setIsOpen( false );
			facetRef.current?.querySelector( '.pmdk-filter-facet-trigger' )?.focus();
		};
		document.addEventListener( 'keydown', closeOnEscape, true );
		return () => document.removeEventListener( 'keydown', closeOnEscape, true );
	}, [ isOpen ] );

	const toggleDraft = ( value ) => {
		setDraft( ( current ) => current.includes( value ) ? current.filter( ( item ) => item !== value ) : [ ...current, value ] );
	};

	return (
		<div className={ `pmdk-toolbar-popover-wrap pmdk-filter-facet pmdk-filter-facet-${ definition.id }` } ref={ facetRef }>
			<button
				className={ `pmdk-filter-facet-trigger${ selected.length ? ' is-active' : '' }` }
				type="button"
				aria-haspopup="dialog"
				aria-expanded={ isOpen }
				onClick={ () => {
					setDraft( selected );
					setQuery( '' );
					setIsOpen( ( open ) => ! open );
				} }
			>
				<span>{ definition.label }</span>{ summary ? <strong>{ summary }</strong> : null }{ renderIcon( 'chevronDown' ) }
			</button>
			{ isOpen ? (
				<div className="pmdk-toolbar-popover pmdk-filter-popover pmdk-facet-popover" role="dialog" aria-label={ `Filter by ${ definition.label }` }>
					{ showSearch ? <label className="pmdk-filter-option-search">{ renderIcon( 'search' ) }<input ref={ searchRef } type="search" value={ query } placeholder={ `Search ${ definition.label.toLowerCase() }` } aria-label={ `Search ${ definition.label.toLowerCase() }` } onChange={ ( event ) => setQuery( event.target.value ) } /></label> : null }
					<div className="pmdk-filter-option-list">
						{ visibleOptions.map( ( option ) => (
							<label className="pmdk-filter-option" key={ option.value }><input type="checkbox" checked={ draft.includes( option.value ) } onChange={ () => toggleDraft( option.value ) } /><span className="pmdk-filter-checkbox">{ renderIcon( 'check' ) }</span><span>{ option.label }</span></label>
						) ) }
						{ ! visibleOptions.length ? <p className="pmdk-filter-no-results">No matching options</p> : null }
					</div>
					<footer><button className="pmdk-button text sm" type="button" disabled={ ! draft.length } onClick={ () => setDraft( [] ) }>Clear</button><button className="pmdk-button primary sm" type="button" onClick={ () => {
						column.setFilterValue( draft.length ? draft : undefined );
						setIsOpen( false );
					} }>Apply</button></footer>
				</div>
			) : null }
		</div>
	);
}

function FacetToggle( { column, definition, renderIcon } ) {
	const on = Boolean( column.getFilterValue() );
	return (
		<div className={ `pmdk-toolbar-popover-wrap pmdk-filter-facet pmdk-filter-facet-${ definition.id }` }>
			<button
				className={ `pmdk-filter-facet-trigger${ on ? ' is-active' : '' }` }
				type="button"
				aria-pressed={ on }
				onClick={ () => column.setFilterValue( on ? undefined : true ) }
			>
				<span className="pmdk-filter-checkbox" aria-hidden="true">{ on ? renderIcon( 'check' ) : null }</span>
				<span>{ definition.label }</span>
			</button>
		</div>
	);
}

/** filterBuilder content: one facet control per definition. */
export function Facets( { table, defs, renderIcon } ) {
	const records = table.getPreFilteredRowModel().rows.map( ( row ) => row.original );
	const clearAll = () => defs.forEach( ( def ) => table.getColumn( def.id )?.setFilterValue( undefined ) );
	const active = defs.some( ( def ) => hasValue( table.getColumn( def.id )?.getFilterValue() ) );
	return (
		<>
			<div className="pmdk-filter-facets">
				{ defs.map( ( def ) => {
					const column = table.getColumn( def.id );
					if ( ! column ) return null;
					return def.type === 'toggle'
						? <FacetToggle column={ column } definition={ def } key={ def.id } renderIcon={ renderIcon } />
						: <FacetMultiPopover column={ column } definition={ def } records={ records } key={ def.id } renderIcon={ renderIcon } />;
				} ) }
			</div>
			{ active ? <button className="pmdk-clear-filters" type="button" onClick={ clearAll }>Clear all</button> : null }
		</>
	);
}

/** activeFilters chips (shown when the builder is closed). */
export function FacetChips( { table, defs, renderIcon } ) {
	const records = table.getPreFilteredRowModel().rows.map( ( row ) => row.original );
	const activeDefs = defs.filter( ( def ) => hasValue( table.getColumn( def.id )?.getFilterValue() ) );
	if ( ! activeDefs.length ) {
		return null;
	}
	// Chip labels come from the SAME options the popover offered, so a record-keyed
	// value (`id:<id>`) reads as the record's name instead of its identity string.
	const summarize = ( def ) => {
		const value = table.getColumn( def.id )?.getFilterValue();
		if ( def.type === 'toggle' ) {
			return 'On';
		}
		return facetChipSummary( facetOptions( def, records ), Array.isArray( value ) ? value : [] );
	};
	return (
		<>
			{ activeDefs.map( ( def ) => (
				<button className="pmdk-filter-chip" type="button" key={ def.id } aria-label={ `Remove ${ def.label } filter` } onClick={ () => table.getColumn( def.id )?.setFilterValue( undefined ) }>
					<span>{ def.label }</span><strong>{ summarize( def ) }</strong>{ renderIcon( 'close' ) }
				</button>
			) ) }
			<button className="pmdk-clear-filters" type="button" onClick={ () => defs.forEach( ( def ) => table.getColumn( def.id )?.setFilterValue( undefined ) ) }>Clear all</button>
		</>
	);
}

/** Active-facet count for the filter button badge. */
export function facetCount( table, defs ) {
	return defs.filter( ( def ) => hasValue( table.getColumn( def.id )?.getFilterValue() ) ).length;
}

function hasValue( value ) {
	return Array.isArray( value ) ? value.length > 0 : Boolean( value );
}

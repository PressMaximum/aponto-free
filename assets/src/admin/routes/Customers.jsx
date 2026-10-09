/**
 * Customers route (SPEC-P1 §1.5 / mockup §7.7). First real consumer of the kit
 * PMDKDataTable: the kit owns sorting / search / facets / pagination / selection /
 * column manager / five states; this route owns the column defs + cell renderers
 * (avatar tint, truncated notes, business-tz last booking), the REST data layer,
 * the facet definitions and the in-flow inspector.
 *
 * Data: GET /customers window (aggregates `bookings_count`/`upcoming`/`last_booking`/`no_show_count`
 * + derived `timezone` come from the DTO). Facets are DTO-derived (upcoming
 * activity, timezone-differs — Q4), so the table runs client-side over the loaded
 * window with a "first N of M" note (parity with Bookings; no server facet params).
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { PMDKDataTable } from '@pressmaximum/dashboard-kit/table';
import { api } from '../lib/api.js';
import { config } from '../lib/config.js';
import { moduleAvailable } from '../modules/catalog.js';
import { longDate } from '../lib/format.js';
import { displayNameOf, initials } from '../../shared/person-name.js';
import { renderIcon } from '../lib/icon.jsx';
import { PageHeader } from '../lib/ui.jsx';
import { InflowWorkspace } from '../lib/InflowWorkspace.jsx';
import { RowMenu } from '../lib/RowMenu.jsx';
import { Facets, FacetChips, facetCount, isTrueFilter } from '../lib/facets.jsx';
import { CustomerInspector } from './CustomerInspector.jsx';

const TZ = config.business.timezone;
const WIDTH_KEY = 'aponto.admin.customer-inspector-width.v1';
const columnHelper = createColumnHelper();

const FACETS = [
	{ id: 'upcomingBool', label: 'Has upcoming booking', type: 'toggle' },
	{ id: 'tzDiffers', label: 'Timezone differs on last booking', type: 'toggle' },
];

/**
 * GET /customers item → table row.
 *
 * Persona QA 2026-10-05, T-051: the Bookings figure leaves CANCELLED bookings out (they are
 * labelled beside it instead) and "Last booking" is the latest one that was not cancelled, so a
 * customer who only ever cancelled does not read as a regular. A DTO older than
 * `cancelled_count` / `last_active_booking` keeps the previous figures.
 *
 * @param {Object} dto Customer DTO (rest-contract §2.10).
 * @return {Object} Row.
 */
export function toRow( dto ) {
	const cancelled = Number( dto.cancelled_count ) || 0;
	const hasActive = Object.prototype.hasOwnProperty.call( dto, 'last_active_booking' );

	return {
		id: dto.id,
		// ONE Name column: the server-composed display name (name split, 2026-10-01); the parts
		// ride along for the inspector's two inputs, the search haystack and the CSV.
		name: displayNameOf( dto ),
		firstName: dto.first_name || '',
		lastName: dto.last_name || '',
		email: dto.email || '',
		phone: dto.phone || '',
		note: dto.note || '',
		wpUserId: dto.wp_user_id ?? null,
		bookingsCount: Math.max( 0, ( Number( dto.bookings_count ) || 0 ) - cancelled ),
		cancelledCount: cancelled,
		noShowCount: Number( dto.no_show_count ) || 0,
		upcoming: Number( dto.upcoming ) || 0,
		lastBooking: ( hasActive ? dto.last_active_booking : dto.last_booking ) || null,
		timezone: dto.timezone || null,
		upcomingBool: ( Number( dto.upcoming ) || 0 ) > 0,
		tzDiffers: Boolean( dto.timezone && dto.timezone !== TZ ),
	};
}

function customerGlobalFilter( row, _columnId, value ) {
	const query = String( value || '' ).trim().toLowerCase();
	if ( ! query ) {
		return true;
	}
	const c = row.original;
	return [ c.name, c.firstName, c.lastName, c.email, c.phone, c.note ].filter( Boolean ).join( ' ' ).toLowerCase().includes( query );
}

function csvCell( value ) {
	const str = String( value ?? '' );
	// Formula-injection guard: spreadsheet apps execute cells starting with
	// `=`, `+`, `-` or `@` — prefix an apostrophe so they render as text (the
	// server CSV export stays the canonical path; this mirrors its hardening).
	const safe = /^[=+\-@]/.test( str ) ? `'${ str }` : str;
	return `"${ safe.replace( /"/g, '""' ) }"`;
}

function exportSelectedCsv( rows ) {
	const header = [ 'First name', 'Last name', 'Email', 'Phone', 'Bookings', 'Cancelled', 'No-shows', 'Last booking' ];
	const body = rows.map( ( r ) => [ r.firstName, r.lastName, r.email, r.phone, r.bookingsCount, r.cancelledCount, r.noShowCount, r.lastBooking ? longDate( r.lastBooking ) : '' ] );
	const csv = [ header, ...body ].map( ( cols ) => cols.map( csvCell ).join( ',' ) ).join( '\n' );
	const url = URL.createObjectURL( new Blob( [ csv ], { type: 'text/csv;charset=utf-8' } ) );
	const link = document.createElement( 'a' );
	link.href = url;
	link.download = 'customers-selected.csv';
	link.click();
	URL.revokeObjectURL( url );
}

/**
 * Bridges the kit table's internal global-filter state out to the route — the
 * kit exposes no `onGlobalFilterChange`, so this reads the state during the
 * toolbar-slot render and reports changes from an effect (render-safe).
 */
function SearchSync( { table, onChange } ) {
	const value = table.getState().globalFilter ?? '';
	const last = useRef( value );
	useEffect( () => {
		if ( last.current !== value ) {
			last.current = value;
			onChange( value );
		}
	}, [ value, onChange ] );
	return null;
}

export function Customers() {
	const [ state, setState ] = useState( { status: 'loading', rows: [], total: 0, error: null } );
	const [ inspector, setInspector ] = useState( null ); // { mode, row }
	const [ serverSearch, setServerSearch ] = useState( '' );
	const searchTimer = useRef( null );

	// Debounced bridge from the toolbar search to the server `search` param: the
	// PHP haystack (name + email + phone + note, rest-contract §2.10) matches rows
	// beyond the loaded window, while the kit's client filter keeps per-keystroke
	// feedback instant over the rows already loaded.
	const queueServerSearch = useCallback( ( value ) => {
		if ( searchTimer.current ) {
			clearTimeout( searchTimer.current );
		}
		searchTimer.current = setTimeout( () => setServerSearch( value.trim() ), 350 );
	}, [] );
	useEffect( () => () => clearTimeout( searchTimer.current ), [] );

	const load = useCallback( () => {
		setState( ( s ) => ( { ...s, status: s.rows.length ? s.status : 'loading', error: null } ) );
		api.get( '/customers', { per_page: 100, search: serverSearch } )
			.then( ( res ) => {
				const rows = ( res.items || [] ).map( toRow );
				setState( {
					// With a search active, zero rows is "no results" (kit inline
					// panel), never the route-level "no customers yet" empty state.
					status: rows.length || serverSearch ? 'ready' : 'empty',
					rows,
					total: Number( res.total ) || rows.length,
					error: null,
				} );
			} )
			.catch( ( err ) => setState( { status: 'error', rows: [], total: 0, error: err.message } ) );
	}, [ serverSearch ] );

	useEffect( load, [ load ] );

	const openDetail = ( row ) => setInspector( { mode: 'detail', row } );
	const closeInspector = () => setInspector( null );

	const columns = useMemo( () => [
		columnHelper.accessor( 'name', {
			header: 'Name',
			size: 200,
			enableHiding: false,
			meta: { label: 'Name' },
			cell: ( info ) => (
				<span className="ap-cell-identity">
					<span className="pmdk-avatar" aria-hidden="true">{ initials( info.row.original.firstName, info.row.original.lastName ) || initials( info.getValue(), '' ) || '?' }</span>
					<span className="pmdk-cell-value pmdk-cell-strong" title={ info.getValue() }>{ info.getValue() }</span>
				</span>
			),
		} ),
		columnHelper.accessor( 'email', { header: 'Email', size: 190, meta: { label: 'Email' }, cell: ( info ) => <span className="pmdk-cell-value pmdk-cell-muted pd-ltr">{ info.getValue() || '—' }</span> } ),
		columnHelper.accessor( 'phone', { header: 'Phone', size: 130, meta: { label: 'Phone' }, cell: ( info ) => <span className="pmdk-cell-value pmdk-cell-muted pd-ltr">{ info.getValue() || '—' }</span> } ),
		columnHelper.accessor( 'note', { header: 'Notes', size: 200, enableSorting: false, meta: { label: 'Notes' }, cell: ( info ) => <span className="pmdk-cell-value pmdk-cell-muted ap-cell-truncate" title={ info.getValue() || undefined }>{ info.getValue() || '—' }</span> } ),
		// Cancelled bookings are not counted, and are named in the tooltip (T-051).
		columnHelper.accessor( 'bookingsCount', { id: 'bookings', header: 'Bookings', size: 90, meta: { label: 'Bookings', numeric: true }, cell: ( info ) => <span className="pmdk-cell-value pmdk-cell-numeric" title={ info.row.original.cancelledCount ? `${ info.row.original.cancelledCount } cancelled, not counted` : undefined }>{ info.getValue() }</span> } ),
		// The no-show count was in the inspector only (T-051); a dash keeps a clean record quiet.
		columnHelper.accessor( 'noShowCount', { id: 'noShows', header: 'No-shows', size: 90, meta: { label: 'No-shows', numeric: true }, cell: ( info ) => <span className="pmdk-cell-value pmdk-cell-numeric">{ info.getValue() || '—' }</span> } ),
		columnHelper.accessor( 'lastBooking', {
			id: 'lastBooking',
			header: 'Last booking',
			size: 140,
			meta: { label: 'Last booking' },
			sortingFn: ( a, b ) => String( a.original.lastBooking || '' ).localeCompare( String( b.original.lastBooking || '' ) ),
			cell: ( info ) => <span className="pmdk-cell-value pmdk-cell-muted">{ info.getValue() ? longDate( info.getValue() ) : '—' }</span>,
		} ),
		columnHelper.accessor( 'upcomingBool', { id: 'upcomingBool', enableHiding: false, enableSorting: false, meta: { label: 'Upcoming', filterOnly: true }, filterFn: isTrueFilter, cell: () => null } ),
		columnHelper.accessor( 'tzDiffers', { id: 'tzDiffers', enableHiding: false, enableSorting: false, meta: { label: 'Timezone differs', filterOnly: true }, filterFn: isTrueFilter, cell: () => null } ),
		columnHelper.display( {
			id: 'action',
			size: 60,
			enableHiding: false,
			enableSorting: false,
			header: 'Action',
			cell: ( info ) => (
				<RowMenu
					label={ `Actions for ${ info.row.original.name }` }
					renderIcon={ renderIcon }
					items={ [
						{ action: 'view', label: 'View details', icon: 'list' },
						{ action: 'edit', label: 'Edit customer', icon: 'note' },
					] }
					onSelect={ ( action ) => setInspector( { mode: action === 'edit' ? 'edit' : 'detail', row: info.row.original } ) }
				/>
			),
		} ),
	], [] );

	const exportAll = () => {
		// Server CSV export (SPEC-P1 §5): downloads the BOM + formula-escaped body
		// from GET /export/customers.csv (assembled server-side, raw verbatim
		// response — rest-contract §2.14), threading the active server search so
		// the file matches the current view.
		const base = config.restUrl.replace( /\/$/, '' );
		const params = new URLSearchParams();
		if ( serverSearch ) {
			params.set( 'search', serverSearch );
		}
		params.set( '_wpnonce', config.nonce );
		window.open( `${ base }/export/customers.csv?${ params.toString() }`, '_blank', 'noopener' );
	};

	const list = (
		<>
			<PageHeader title="Customers" />
			<section className="pd-data-list pmdk-data-list" aria-label="Customers list">
				<PMDKDataTable
					columns={ columns }
					data={ state.rows }
					getRowId={ ( row ) => String( row.id ) }
					status={ state.status }
					states={ {
						empty: {
							icon: renderIcon( 'people' ),
							title: 'No customers yet',
							description: 'Customers are created automatically when a booking is made, or you can add one manually.',
							action: <button className="pmdk-button primary sm" type="button" onClick={ () => setInspector( { mode: 'create' } ) }>{ renderIcon( 'plus' ) }New customer</button>,
						},
						error: { title: 'Could not load customers', description: state.error || '', action: <button className="pmdk-button sm" type="button" onClick={ load }>{ renderIcon( 'arrows' ) }Retry</button> },
					} }
					enableRowSelection
					getRowSelectionLabel={ ( row ) => `Select ${ row.name }` }
					bulkActions={ ( { selectedRows, clearSelection } ) => (
						<button className="pmdk-button sm" type="button" onClick={ () => { exportSelectedCsv( selectedRows.map( ( r ) => r.original ) ); clearSelection(); } }>{ renderIcon( 'csv' ) }Export selected</button>
					) }
					globalFilterFn={ customerGlobalFilter }
					getColumnCanGlobalFilter={ ( column ) => column.id === 'name' }
					toolbarControls={ ( { table } ) => <SearchSync table={ table } onChange={ queueServerSearch } /> }
					filterBuilder={ ( { table } ) => <Facets table={ table } defs={ FACETS } renderIcon={ renderIcon } /> }
					activeFilters={ ( { table } ) => <FacetChips table={ table } defs={ FACETS } renderIcon={ renderIcon } /> }
					filterCount={ ( { table } ) => facetCount( table, FACETS ) }
					primaryAction={ <button className="pmdk-button primary sm" type="button" onClick={ () => setInspector( { mode: 'create' } ) }>{ renderIcon( 'plus' ) }<span>New customer</span></button> }
					menuItems={ [
						{ id: 'export', label: 'Export customers (CSV)', icon: renderIcon( 'csv' ), onSelect: exportAll },
						...( config.caps.bookings && moduleAvailable( config, 'csv_import' ) ? [ { id: 'import', label: 'Import customers (CSV)', icon: renderIcon( 'import' ), onSelect: () => { window.location.hash = 'modules/csv_import'; } } ] : [] ),
					] }
					defaultColumnVisibility={ { upcomingBool: false, tzDiffers: false } }
					defaultSorting={ [ { id: 'name', desc: false } ] }
					onRowActivate={ openDetail }
					getRowAriaLabel={ ( row ) => `Open ${ row.name }` }
					renderIcon={ renderIcon }
					itemsLabel="customers"
					labels={ { searchPlaceholder: 'Search name, email, phone or notes…', searchAria: 'Search customers' } }
					persistenceKey="aponto.admin.customers.table.v1"
				/>
				{ state.status === 'ready' && state.total > state.rows.length ? (
					<p className="ap-list-note" role="status">
						Showing the first { state.rows.length } of { state.total } { serverSearch ? 'matching customers — refine the search to narrow further.' : 'customers — search to find the rest.' }
					</p>
				) : null }
			</section>
		</>
	);

	return (
		<InflowWorkspace
			widthKey={ WIDTH_KEY }
			open={ Boolean( inspector ) }
			label="Customer inspector"
			inspectorLabelledBy="customerInspectorTitle"
			inspector={ inspector ? (
				<CustomerInspector
					key={ `${ inspector.mode }-${ inspector.row?.id || 'new' }` }
					mode={ inspector.mode }
					row={ inspector.row }
					onClose={ closeInspector }
					onSaved={ load }
				/>
			) : null }
		>
			{ list }
		</InflowWorkspace>
	);
}

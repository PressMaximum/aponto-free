/**
 * Staff route (SPEC-P1 §1.2 / mockup §7.5). Free opens the lowest-id staff record
 * directly; Premium multi-staff keeps the collection table. Add/Edit use the same
 * full-page workspace (StaffWorkspace).
 *
 * Multi-staff shipped with D-R28 (2026-08-27). Adding staff is gated on
 * `moduleAvailable( config, 'multi_staff' )` — never on `config.edition`, which §5
 * invariant 3 reserves for Plan. REST storage remains uncapped (D-R42), but the Free
 * admin presentation is a singleton surface and does not render the collection table.
 *
 * Note (B4b ripple, now partly resolved): a Service filter facet is still omitted.
 * `GET /services/{id}/eligibility` gives the forward read and the staff detail
 * response carries `service_ids`, but the LIST response carries only
 * `service_count`, so filtering the table by service would need a fan-out of
 * per-row requests. Status facet only. See the debt note on server-side pagination.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { PMDKDataTable } from '@pressmaximum/dashboard-kit/table';
import { api } from '../lib/api.js';
import { config } from '../lib/config.js';
import { moduleAvailable } from '../modules/catalog.js';
import { renderIcon } from '../lib/icon.jsx';
import { PageHeader } from '../lib/ui.jsx';
import { useToast } from '../lib/toast.jsx';
import { useConfirmDialog } from '../lib/confirm.jsx';
import { RowMenu } from '../lib/RowMenu.jsx';
import { Facets, FacetChips, facetCount, inArrayFilter } from '../lib/facets.jsx';
import { StaffWorkspace } from './StaffWorkspace.jsx';

const STATUS_OPTIONS = [ { value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' } ];
// Free owns a singleton ADMIN PRESENTATION only. REST/storage stay uncapped (D-R42); keeping this
// count in the UI prevents a product-display rule from becoming a PHP or database quota.
const FREE_STAFF_PROFILE_COUNT = 1;
const columnHelper = createColumnHelper();
// Status is an enum: the value IS the identity (unlike the record-keyed service/staff/
// category facets — lib/facet-options.js). Chip labels resolve from `options`.
const FACETS = [ { id: 'status', label: 'Status', type: 'multi', options: STATUS_OPTIONS } ];

export function Staff( { segments = [] } ) {
	const showToast = useToast();
	const { confirm, dialog } = useConfirmDialog();
	const multiStaff = moduleAvailable( config, 'multi_staff' );
	const [ state, setState ] = useState( { status: 'loading', rows: [], error: null } );
	const [ workspace, setWorkspace ] = useState( null ); // { mode, staff }
	// `#staff/<id>` opens that staff member's workspace, the same way `#services/<tab>`
	// seeds the Services tab (routes/Services.jsx): the hash SEEDS the surface, it does not
	// own it. The list rows keep driving the workspace through local state, so Edit works
	// whatever the hash says — including when it already reads `#staff/<id>`.
	const deepLinkId = segments[ 1 ] ? String( segments[ 1 ] ) : '';
	const openedDeepLink = useRef( '' );

	const load = useCallback( () => {
		setState( ( s ) => ( { ...s, status: s.rows.length ? s.status : 'loading', error: null } ) );
		api.get( '/staff', { status: 'all', per_page: 100 } )
			.then( ( res ) => {
				const rows = ( res.items || [] ).map( ( dto ) => ( {
					...dto,
					serviceCount: Number( dto.service_count ) || 0,
					availability: dto.has_custom_hours ? 'Custom hours' : 'Business hours',
				} ) );
				setState( { status: rows.length ? 'ready' : 'empty', rows, error: null } );
			} )
			.catch( ( err ) => setState( { status: 'error', rows: [], error: err.message } ) );
	}, [] );

	useEffect( load, [ load ] );

	// On multi-staff, apply the deep link ONCE per requested id, and only after the list has loaded (the
	// workspace needs the row DTO). Never closes anything: an id that no longer exists — or a
	// workspace the admin closed by hand — leaves the list on screen instead of fighting it.
	// Free resolves its one visible profile directly below and deliberately ignores record deep links.
	useEffect( () => {
		if ( ! multiStaff || '' === deepLinkId || openedDeepLink.current === deepLinkId || 'loading' === state.status ) {
			return;
		}
		openedDeepLink.current = deepLinkId;
		const row = state.rows.find( ( item ) => String( item.id ) === deepLinkId );
		if ( row ) {
			setWorkspace( { mode: 'edit', staff: row } );
		}
	}, [ multiStaff, deepLinkId, state.status, state.rows ] );

	const staffCount = state.rows.length;
	const singletonWorkspace = useMemo( () => {
		if ( multiStaff ) {
			return null;
		}
		if ( 'empty' === state.status ) {
			return { mode: 'create' };
		}
		if ( 'ready' !== state.status || ! state.rows.length ) {
			return null;
		}

		const visibleProfile = [ ...state.rows ].sort(
			( left, right ) => Number( left.id ) - Number( right.id )
		).slice( 0, FREE_STAFF_PROFILE_COUNT )[ 0 ];

		return { mode: 'edit', staff: visibleProfile };
	}, [ multiStaff, state.status, state.rows ] );

	const onAdd = () => {
		setWorkspace( { mode: 'create' } );
	};

	// Archive is the safe, reversible default (C1 archive-first, as on Services): the staff row
	// survives for history and stops taking new bookings. `PATCH /staff/{id}` owns the status.
	const onArchive = useCallback( async ( row ) => {
		const ok = await confirm( {
			title: `Archive ${ row.name }?`,
			message: 'They stop taking new bookings and are kept for history. You can restore them any time.',
			confirmText: 'Archive',
			destructive: true,
		} );
		if ( ! ok ) {
			return;
		}
		try {
			await api.patch( `/staff/${ row.id }`, { status: 'archived' } );
			showToast( `${ row.name } archived.` );
			load();
		} catch ( err ) {
			showToast( err.message, 'danger' );
		}
	}, [ confirm, showToast, load ] );

	const onRestore = useCallback( async ( row ) => {
		try {
			await api.patch( `/staff/${ row.id }`, { status: 'active' } );
			showToast( `${ row.name } restored.` );
			load();
		} catch ( err ) {
			showToast( err.message, 'danger' );
		}
	}, [ showToast, load ] );

	// Permanent delete. `DELETE /staff/{id}` refuses with 409 `aponto_has_dependents` whenever the
	// member has ANY booking (StaffController::destroy checks it under the per-staff advisory
	// lock), and the list DTO carries no booking count — so unlike Services this action cannot be
	// hidden in advance. The 409 is therefore a normal outcome, not an error: say plainly what
	// happened and point at Archive. Deliberately NOT auto-archiving on the owner's behalf —
	// they asked to delete, and silently changing a different field instead is the kind of
	// surprise the U2 data-loss review flagged.
	const onDelete = useCallback( async ( row ) => {
		const ok = await confirm( {
			title: `Delete ${ row.name } permanently?`,
			message: 'This can’t be undone — their profile, work hours and time off are removed for good. Only possible while they have no bookings; archive them instead to keep the history.',
			confirmText: 'Delete permanently',
			destructive: true,
		} );
		if ( ! ok ) {
			return;
		}
		try {
			await api.del( `/staff/${ row.id }` );
			showToast( `${ row.name } deleted permanently.` );
			load();
		} catch ( err ) {
			if ( err.code === 'aponto_has_dependents' ) {
				showToast( `${ row.name } has bookings, so they can’t be deleted. Archive them instead to keep the history.`, 'danger' );
			} else {
				showToast( err.message, 'danger' );
			}
		}
	}, [ confirm, showToast, load ] );

	const columns = useMemo( () => [
		columnHelper.accessor( 'name', {
			header: 'Staff',
			size: 200,
			enableHiding: false,
			meta: { label: 'Staff' },
			cell: ( info ) => (
				<span className="ap-cell-identity">
					<span className="pmdk-avatar" aria-hidden="true">{ ( info.getValue() || '?' ).trim().charAt( 0 ).toUpperCase() }</span>
					<span className="pmdk-cell-value pmdk-cell-strong">{ info.getValue() }</span>
				</span>
			),
		} ),
		columnHelper.accessor( 'email', { header: 'Email', size: 200, meta: { label: 'Email' }, cell: ( info ) => <span className="pmdk-cell-value pmdk-cell-muted pd-ltr">{ info.getValue() || '—' }</span> } ),
		columnHelper.accessor( 'serviceCount', { id: 'services', header: 'Services', size: 100, enableSorting: false, meta: { label: 'Services' }, cell: ( info ) => <span className="pmdk-cell-value pmdk-cell-muted">{ info.getValue() } service{ info.getValue() === 1 ? '' : 's' }</span> } ),
		columnHelper.accessor( 'availability', { id: 'availability', header: 'Availability', size: 150, enableSorting: false, meta: { label: 'Availability' }, cell: ( info ) => <span className="pmdk-cell-value pmdk-cell-muted">{ info.getValue() }</span> } ),
		columnHelper.accessor( 'status', { id: 'status', header: 'Status', size: 110, meta: { label: 'Status' }, filterFn: inArrayFilter, cell: ( info ) => <span className={ `ap-status-pill is-${ info.getValue() }` }>{ info.getValue() }</span> } ),
		columnHelper.display( {
			id: 'action',
			size: 60,
			enableHiding: false,
			enableSorting: false,
			header: 'Action',
			cell: ( info ) => {
				const row = info.row.original;
				const items = [ { action: 'edit', label: 'Edit staff', icon: 'note' } ];
				// Archive (reversible) for a live member, Restore for an archived one — the same
				// archive-first shape the Services row menu uses. Delete stays offered in both
				// states because the list DTO cannot tell us whether it will be allowed; the 409
				// is handled in `onDelete`.
				if ( row.status === 'archived' ) {
					items.push( { action: 'restore', label: 'Restore staff', icon: 'arrows', separatorBefore: true } );
				} else {
					items.push( { action: 'archive', label: 'Archive staff', icon: 'prohibit', danger: true, separatorBefore: true } );
				}
				items.push( { action: 'delete', label: 'Delete permanently', icon: 'trash', danger: true } );

				return (
					<RowMenu
						label={ `Actions for ${ row.name }` }
						renderIcon={ renderIcon }
						items={ items }
						onSelect={ ( action ) => {
							if ( action === 'edit' ) setWorkspace( { mode: 'edit', staff: row } );
							else if ( action === 'archive' ) onArchive( row );
							else if ( action === 'restore' ) onRestore( row );
							else if ( action === 'delete' ) onDelete( row );
						} }
					/>
				);
			},
		} ),
	], [ onArchive, onRestore, onDelete ] );

	const activeWorkspace = workspace || singletonWorkspace;
	const singletonDirect = ! workspace && Boolean( singletonWorkspace );

	if ( activeWorkspace ) {
		return (
			<StaffWorkspace
				key={ `${ activeWorkspace.mode }-${ activeWorkspace.staff?.id || 'new' }` }
				mode={ activeWorkspace.mode }
				staff={ activeWorkspace.staff }
				onClose={ singletonDirect ? () => { window.location.hash = '#dashboard'; } : () => setWorkspace( null ) }
				onSaved={ load }
				closeAfterSave={ ! singletonDirect }
			/>
		);
	}

	const addButton = multiStaff || staffCount < FREE_STAFF_PROFILE_COUNT ? (
		<button className="pmdk-button primary sm" type="button" onClick={ onAdd }>
			{ renderIcon( 'plus' ) }<span>Add staff</span>
		</button>
	) : null;

	return (
		<div className="pd-page">
			<div className="pd-bookings-main">
				<PageHeader title="Staff" actions={ addButton } />
				<section className="pd-data-list pmdk-data-list" aria-label="Staff list">
					<PMDKDataTable
						columns={ columns }
						data={ state.rows }
						getRowId={ ( row ) => String( row.id ) }
						status={ state.status }
						states={ {
							empty: { icon: renderIcon( 'user' ), title: 'No staff yet', description: 'Your calendar has no availability until you add at least one staff member — usually yourself.', action: <button className="pmdk-button primary sm" type="button" onClick={ onAdd }>{ renderIcon( 'plus' ) }Add staff</button> },
							error: { title: 'Could not load staff', description: state.error || '', action: <button className="pmdk-button sm" type="button" onClick={ load }>{ renderIcon( 'arrows' ) }Retry</button> },
						} }
						enableRowSelection={ false }
						filterBuilder={ ( { table } ) => <Facets table={ table } defs={ FACETS } renderIcon={ renderIcon } /> }
						activeFilters={ ( { table } ) => <FacetChips table={ table } defs={ FACETS } renderIcon={ renderIcon } /> }
						filterCount={ ( { table } ) => facetCount( table, FACETS ) }
						onRowActivate={ ( row ) => setWorkspace( { mode: 'edit', staff: row } ) }
						getRowAriaLabel={ ( row ) => `Edit ${ row.name }` }
						renderIcon={ renderIcon }
						itemsLabel="staff"
						labels={ { searchPlaceholder: 'Search staff…', searchAria: 'Search staff' } }
						persistenceKey="aponto.admin.staff.table.v1"
					/>
				</section>
			</div>
			{ dialog }
		</div>
	);
}

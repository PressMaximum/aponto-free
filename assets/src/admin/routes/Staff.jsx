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
import { displayNameOf, initials } from '../../shared/person-name.js';
import { moduleAvailable } from '../modules/catalog.js';
import { renderIcon } from '../lib/icon.jsx';
import { PageHeader } from '../lib/ui.jsx';
import { useToast } from '../lib/toast.jsx';
import { useConfirmDialog } from '../lib/confirm.jsx';
import { RowMenu } from '../lib/RowMenu.jsx';
import { Facets, FacetChips, facetCount, inArrayFilter } from '../lib/facets.jsx';
import { hashRecord, useEditorGuards } from '../lib/editor-guards.js';
import { useRouteReselect } from '../lib/router.js';
import { useInFlight } from '../lib/in-flight.js';
import { StaffWorkspace, discardPrompt } from './StaffWorkspace.jsx';

const STATUS_OPTIONS = [ { value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' } ];
// Free owns a singleton ADMIN PRESENTATION only. REST/storage stay uncapped (D-R42); keeping this
// count in the UI prevents a product-display rule from becoming a PHP or database quota.
const FREE_STAFF_PROFILE_COUNT = 1;
const columnHelper = createColumnHelper();

/**
 * The initials mark with the resolved photo painted over it, revealed only once it loads
 * (D-R51).
 *
 * The server no longer asks gravatar.com whether a staff member has a picture — the URL simply
 * carries `d=404` — so a 404 is an ORDINARY outcome on this screen too. Rendering initials
 * first and fading the image in means a row never shows a broken-image glyph and never shifts;
 * `onError` removes the image, so the failed URL cannot be requested again.
 *
 * @param {{firstName: string, lastName: string, name: string, photo: string, size: number}} props Mark props.
 */
function StaffMark( { firstName, lastName, name, photo, size } ) {
	const [ failed, setFailed ] = useState( false );
	const [ loaded, setLoaded ] = useState( false );

	return (
		<span className="pmdk-avatar ap-avatar-mark" aria-hidden="true">
			{ initials( firstName, lastName ) || initials( name, '' ) || '?' }
			{ photo && ! failed ? (
				<img
					className={ `ap-avatar-photo${ loaded ? ' is-loaded' : '' }` }
					src={ photo }
					alt=""
					width={ size }
					height={ size }
					loading="lazy"
					decoding="async"
					onLoad={ () => setLoaded( true ) }
					onError={ () => setFailed( true ) }
				/>
			) : null }
		</span>
	);
}
// Status is an enum: the value IS the identity (unlike the record-keyed service/staff/
// category facets — lib/facet-options.js). Chip labels resolve from `options`.
const FACETS = [ { id: 'status', label: 'Status', type: 'multi', options: STATUS_OPTIONS } ];

export function Staff( { segments = [] } ) {
	const showToast = useToast();
	const { confirm, dialog } = useConfirmDialog();
	const multiStaff = moduleAvailable( config, 'multi_staff' );
	const [ state, setState ] = useState( { status: 'loading', rows: [], error: null } );
	const [ workspace, setWorkspace ] = useState( null ); // { mode, staff }
	// Whether the OPEN workspace holds unsaved edits — reported up by `StaffWorkspace` from its own
	// dirty computation (details + a work-hours draft + a started time-off entry), because this is
	// the component that owns both guards (D-R58). Handoff 2026-09-21 §4: the editor had none at
	// all, so pressing "Bookings" with a half-typed profile on screen left silently.
	const [ editorDirty, setEditorDirty ] = useState( false );
	/**
	 * Bumped by a confirmed discard that leaves this route on screen, and part of the editor's
	 * `key`, so the discard actually empties the form (fix round 2). Applying the target usually
	 * replaces the editor by itself; it does not when the target names a record this list does not
	 * hold — a hand-edited hash, or anything past the `per_page: 100` window — and QA found exactly
	 * that state: the typed text still on screen, nothing guarding it. A remount is also what puts
	 * the work-hours and time-off drafts back, because they are state of the unmounted children.
	 */
	const [ editorEpoch, setEditorEpoch ] = useState( 0 );
	const onDiscard = useCallback( () => setEditorEpoch( ( epoch ) => epoch + 1 ), [] );

	// The workspace on screen, resolved BEFORE the guards so they can be told which record is open.
	// Free never renders the collection table: it opens the lowest-id profile directly, and an
	// `empty` account opens the create form (SPEC-P1 §1.2).
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

		return { mode: 'edit', staff: state.rows[ 0 ] };
	}, [ multiStaff, state.status, state.rows ] );
	const activeWorkspace = workspace || singletonWorkspace;
	const singletonDirect = ! workspace && Boolean( singletonWorkspace );
	/** The record the editor is open on right now — `new` for a create, '' for the list. */
	const openRecord = activeWorkspace ? String( activeWorkspace.staff?.id ?? 'new' ) : '';

	/**
	 * Which same-route hash moves would REPLACE the open workspace.
	 *
	 * Only one does: a deep link to a DIFFERENT record, which the effect below opens with a new
	 * `key`. Everything else on `#staff` changes no surface — the workspace is local state and
	 * stays put — so guarding it would put a dialog in front of a navigation that is not happening.
	 * Free resolves its one visible profile directly and ignores record deep links, so nothing
	 * there can replace anything either.
	 *
	 * Decided against `openRecord`, never against the last path the guards were shown (fix round
	 * 2). Browser QA: Back from `#staff/3` to `#staff` is a non-exit, so the hold advanced its
	 * `shownPath` to `staff`; pressing Forward straight back to `#staff/3` then compared `3` with
	 * "no record" and asked the operator to discard the record they were still editing. The hash
	 * never carries the id at all when the workspace was opened from the list, so the last path
	 * could never have been the right thing to compare.
	 */
	const isExit = useCallback(
		( next ) => {
			const target = hashRecord( next );

			return multiStaff && '' !== openRecord && '' !== target && target !== openRecord;
		},
		[ multiStaff, openRecord ]
	);
	const { shownPath, release } = useEditorGuards( {
		segments,
		dirty: editorDirty,
		confirm,
		discardPrompt,
		isExit,
		onDiscard,
	} );

	// `#staff/<id>` opens that staff member's workspace, the same way `#services/<tab>`
	// seeds the Services tab (routes/Services.jsx): the hash SEEDS the surface, it does not
	// own it. The list rows keep driving the workspace through local state, so Edit works
	// whatever the hash says — including when it already reads `#staff/<id>`.
	//
	// Resolved from `shownPath`, NOT from `segments`: that is the whole mechanism of the same-route
	// hold. While a dirty workspace is on screen the hold does not advance `shownPath`, so this
	// effect never sees the incoming id and never remounts the editor out from under the typing.
	const deepLinkId = hashRecord( shownPath );
	const openedDeepLink = useRef( '' );

	const load = useCallback( () => {
		setState( ( s ) => ( { ...s, status: s.rows.length ? s.status : 'loading', error: null } ) );
		const query = multiStaff
			? { status: 'all', per_page: 100 }
			: { status: 'all', order_by: 'id', page: 1, per_page: FREE_STAFF_PROFILE_COUNT };
		api.get( '/staff', query )
			.then( ( res ) => {
				const rows = ( res.items || [] ).map( ( dto ) => ( {
					...dto,
					// ONE Staff column: the server-composed display name; `first_name`/`last_name`
					// ride along in `...dto` for the initials and the workspace's two inputs.
					name: displayNameOf( dto ),
					serviceCount: Number( dto.service_count ) || 0,
					availability: dto.has_custom_hours ? 'Custom hours' : 'Business hours',
				} ) );
				setState( { status: rows.length ? 'ready' : 'empty', rows, error: null } );
			} )
			.catch( ( err ) => setState( { status: 'error', rows: [], error: err.message } ) );
	}, [ multiStaff ] );

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

	const once = useInFlight();
	const onRestore = useCallback( ( row ) => once( async () => {
		try {
			await api.patch( `/staff/${ row.id }`, { status: 'active' } );
			showToast( `${ row.name } restored.`, 'success' );
			load();
		} catch ( err ) {
			showToast( err.message, 'danger' );
		}
	} ), [ once, showToast, load ] );

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
					<StaffMark firstName={ info.row.original?.first_name } lastName={ info.row.original?.last_name } name={ info.getValue() } photo={ info.row.original?.avatar?.url || '' } size={ 28 } />
					<span className="pmdk-cell-value pmdk-cell-strong" title={ info.getValue() }>{ info.getValue() }</span>
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

	// "Staff" pressed — header nav or WordPress sidebar — while a workspace opened FROM THE LIST
	// covers it (persona QA 2026-10-05, T-076): return to the list through the same question the
	// workspace's Cancel asks. The Free single profile IS the route, so there is no list to go to.
	useRouteReselect( 'staff', async () => {
		if ( ! workspace ) {
			return;
		}
		if ( editorDirty && ! ( await confirm( discardPrompt() ) ) ) {
			return;
		}
		release();
		setWorkspace( null );
	} );

	if ( activeWorkspace ) {
		// `release()` first, on BOTH close paths. The editor has already asked its own question by
		// the time it calls back, and the Free single profile closes by assigning `#dashboard` —
		// a ROUTE change, which the still-registered cross-route guard would intercept, asking the
		// operator a second time about the departure they just approved.
		const close = singletonDirect
			? () => { release(); window.location.hash = '#dashboard'; }
			: () => { release(); setWorkspace( null ); };

		return (
			<>
				<StaffWorkspace
					key={ `${ activeWorkspace.mode }-${ openRecord }-${ editorEpoch }` }
					mode={ activeWorkspace.mode }
					staff={ activeWorkspace.staff }
					onClose={ close }
					onSaved={ load }
					onDirtyChange={ setEditorDirty }
					closeAfterSave={ ! singletonDirect }
					// A NEW member stays on screen as an editable record (persona QA 2026-10-05,
					// T-077). "Add staff" used to drop back to the list, although the two things a
					// new member needs next — work hours and the services they take — only exist
					// on the saved record; creating a service already stays open for the same
					// reason (D-R28). The Free single profile gets here by itself: the reload
					// resolves it as the one visible profile.
					onCreated={ singletonDirect ? undefined : ( created ) => {
						release();
						setWorkspace( { mode: 'edit', staff: { ...created, name: displayNameOf( created ) } } );
					} }
				/>
				{ /* The guards' own dialog. The list branch renders the same node inside `.pd-page`;
				     here the editor IS the page, so it is a sibling — a Modal portals out of the
				     tree anyway, and it is null whenever nothing is being asked. */ }
				{ dialog }
			</>
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

/**
 * Services route (SPEC-P1 §1.1 / mockup §7.4). Flat list + internal section tabs
 * (Services · Categories · Bundles[Premium] · Extras[Premium], the last two
 * reserved with no controls). The Services tab is a PMDKDataTable consumer; the full editor is a
 * separate full-page view (ServiceEditor). Drag reorder is available only when a
 * single category is selected (`POST /services/reorder`, full-set replacement).
 * Categories are a peer table edited through the shared in-flow inspector.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { PMDKDataTable } from '@pressmaximum/dashboard-kit/table';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { __ } from '@wordpress/i18n';
import { api } from '../lib/api.js';
import { config } from '../lib/config.js';
import { useInFlight } from '../lib/in-flight.js';
import { countUpcomingBookings, upcomingBookingsNote } from '../lib/upcoming-bookings.js';
import { money } from '../lib/format.js';
import { renderIcon } from '../lib/icon.jsx';
import { PageHeader } from '../lib/ui.jsx';
import { useToast } from '../lib/toast.jsx';
import { useConfirmDialog } from '../lib/confirm.jsx';
import { InflowWorkspace } from '../lib/InflowWorkspace.jsx';
import { RowMenu } from '../lib/RowMenu.jsx';
import { Facets, FacetChips, facetCount, inArrayFilter, recordFacetFilter } from '../lib/facets.jsx';
import { hashRecord, useEditorGuards } from '../lib/editor-guards.js';
import { useRouteReselect } from '../lib/router.js';
import { ServiceEditor, discardPrompt } from './ServiceEditor.jsx';
import { ServiceReorder } from './ServiceReorder.jsx';
import { serviceNotBookable } from '../bookings/dashboard-stats.js';

// One line of why, for the pill's tooltip and the quick view (re-test R11).
const NOT_BOOKABLE_REASON = __( 'No active staff member is assigned, so customers do not see this service. Assign staff in the service editor.', 'aponto' );

const TABS = [
	{ id: 'services', label: 'Services' },
	{ id: 'categories', label: 'Categories' },
	{ id: 'bundles', label: 'Bundles', reserved: true },
	{ id: 'extras', label: 'Extras', reserved: true },
];

/**
 * The badge on a reserved (unbuilt) tab, and the sentence under its empty state.
 *
 * On a Free site these are honest upsell chrome: the feature will be a Premium module. On a
 * PREMIUM site the same "Premium" badge read as a second upsell to someone who had already paid,
 * and "ships with a later Premium module" as a roadmap note in their own product (persona QA
 * 2026-10-05, T-082) — there it says what is true for them: coming soon. `planEdition` is the
 * marketing-chrome switch `lib/config.js` documents, not a capability gate.
 *
 * @param {string} planEdition `free` or `premium`.
 * @return {{badge: string, note: string}} Copy for the reserved tabs.
 */
export function reservedTabCopy( planEdition ) {
	return 'premium' === planEdition
		? {
			badge: __( 'Coming soon', 'aponto' ),
			note: __( 'Coming soon — there is nothing to set up here yet.', 'aponto' ),
		}
		: {
			badge: __( 'Premium', 'aponto' ),
			note: __( 'Ships with a later Premium module — there is nothing to set up here yet.', 'aponto' ),
		};
}
const STATUS_OPTIONS = [ { value: 'active', label: 'Active' }, { value: 'draft', label: 'Draft' }, { value: 'archived', label: 'Archived' } ];
const UNCATEGORIZED = 'Uncategorized';
const WIDTH_KEY = 'aponto.admin.service-inspector-width.v1';
const columnHelper = createColumnHelper();

// The Category facet is keyed by the CATEGORY ID (`categoryId`, 0 = Uncategorized), not
// by the name: two categories may share a name, and a name-keyed facet would filter — and
// reorder — both of them as one. Status is an enum, so its value is its own identity.
const FACETS = [
	{ id: 'categoryName', label: 'Category', type: 'multi', idKey: 'categoryId' },
	{ id: 'status', label: 'Status', type: 'multi', options: STATUS_OPTIONS },
];
const CATEGORY_FACET_FILTER = recordFacetFilter( 'categoryId', 'categoryName' );

/**
 * The record a `services/...` hash path names, or '' for the list and for the tab hashes.
 *
 * Tab ids are never numeric, so the two segment shapes cannot collide — the same test the deep
 * link itself uses.
 *
 * @param {string} path Hash path, without the leading `#`.
 * @return {string} Record id, or ''.
 */
function deepLinkOf( path ) {
	const second = hashRecord( path );

	return /^\d+$/.test( second ) ? second : '';
}

export function Services( { segments = [], onNavigate } ) {
	const showToast = useToast();
	const { confirm, dialog } = useConfirmDialog();
	// Whether the OPEN editor holds unsaved edits — reported up by `ServiceEditor` from its own
	// dirty computation (the form, a pending eligibility edit, a half-typed new category), because
	// this is the component that owns both guards (D-R58). Handoff 2026-09-21 §4: it had none at all.
	const [ editorDirty, setEditorDirty ] = useState( false );
	// The LANDING tab, from the landing hash — mount-only, exactly as before the guards existed.
	// Deliberately not read from `shownPath`: on the first render the two are equal by
	// construction, and reading the held path would tie a mount-time seed to a navigation guard.
	const landingTab = segments[ 1 ];
	const initialTab = TABS.some( ( t ) => t.id === landingTab ) ? landingTab : 'services';
	const [ tab, setTab ] = useState( initialTab );
	const [ state, setState ] = useState( { status: 'loading', services: [], categories: [], error: null } );
	const [ staffCount, setStaffCount ] = useState( null );
	const [ editor, setEditor ] = useState( null ); // { mode, service }
	const [ inspector, setInspector ] = useState( null ); // { type:'quickview'|'category', ... }
	const [ reorder, setReorder ] = useState( false );
	/**
	 * Bumped by a confirmed discard that leaves this route on screen, and part of the editor's
	 * `key`, so the discard actually empties the form (fix round 2). Applying the target usually
	 * replaces the editor by itself; it does not when the target names a record this list does not
	 * hold — a hand-edited hash, or anything past the `per_page: 100` window — and the operator
	 * would be left looking at the very text they asked to throw away, with nothing guarding it. A
	 * remount is also what puts the pending staff assignments back.
	 */
	const [ editorEpoch, setEditorEpoch ] = useState( 0 );
	const onDiscard = useCallback( () => setEditorEpoch( ( epoch ) => epoch + 1 ), [] );

	/** The record the editor is open on right now — `new` for a create, '' for the list. */
	const openRecord = editor ? String( editor.service?.id ?? 'new' ) : '';

	/**
	 * Which same-route hash moves would REPLACE the open editor (`lib/editor-guards.js`).
	 *
	 * Only a deep link to a DIFFERENT record does: the effect below opens it with a new `key`,
	 * which remounts the editor and takes the unsaved form with it. `#services`,
	 * `#services/categories` and the other tab hashes change no surface while the editor is open —
	 * it is local state and takes over the whole route — so a dialog for them would be a dialog
	 * about nothing, and neither does the deep link of the record ALREADY being edited (fix round
	 * 2: Back to `#services` then Forward to `#services/12` asked the operator to discard the
	 * service they were still editing).
	 */
	const isExit = useCallback(
		( next ) => {
			const target = deepLinkOf( next );

			return '' !== openRecord && '' !== target && target !== openRecord;
		},
		[ openRecord ]
	);
	const { shownPath, release } = useEditorGuards( {
		segments,
		dirty: editorDirty,
		confirm,
		discardPrompt,
		isExit,
		onDiscard,
	} );

	// Returns the reload promise so callers can AWAIT the fresh list before closing an editor —
	// the quick-view panel derives from this state and must never show a stale price after a save
	// (r1 review item 9; finding U1 BUG-5).
	const load = useCallback( () => {
		setState( ( s ) => ( { ...s, status: s.services.length || s.categories.length ? s.status : 'loading', error: null } ) );
		// Staff readiness (skip-path guidance): a service with no staff anywhere in the account
		// can't be booked. Fetched separately from the list so a /staff hiccup never blocks the
		// services table; null means "unknown", so the note stays hidden.
		api.get( '/staff', { status: 'all', per_page: 1 } )
			.then( ( res ) => setStaffCount( Number( res.total ) || 0 ) )
			.catch( () => setStaffCount( null ) );
		return Promise.all( [
			api.get( '/services', { status: 'all', per_page: 100 } ),
			api.get( '/service-categories' ),
		] ).then( ( [ svc, cat ] ) => {
			const categories = cat.items || [];
			const catName = Object.fromEntries( categories.map( ( c ) => [ c.id, c.name ] ) );
			const services = ( svc.items || [] ).map( ( dto ) => ( {
				...dto,
				// Facet identity for the Category axis (0 = Uncategorized); the name is display-only.
				categoryId: Number( dto.category_id ) || 0,
				categoryName: dto.category_id ? ( catName[ dto.category_id ] || UNCATEGORIZED ) : UNCATEGORIZED,
				staffCount: Number( dto.staff_count ) || 0,
				// C1: Delete is offered only when this is 0 (otherwise Archive is the safe default).
				bookingCount: Number( dto.booking_count ) || 0,
			} ) );
			setState( { status: 'ready', services, categories, error: null } );
		} ).catch( ( err ) => setState( { status: 'error', services: [], categories: [], error: err.message } ) );
	}, [] );

	useEffect( () => { load(); }, [ load ] );

	// `#services/<id>` opens that service's editor, exactly as `#staff/<id>` opens a staff
	// workspace (routes/Staff.jsx): the hash SEEDS the surface, it does not own it. Tab ids are
	// never numeric, so the two segment shapes cannot collide. Added with D-R28 so the staff
	// workspace's assigned-services list can link somewhere real.
	//
	// Applied ONCE per requested id and only after the list has loaded (the editor needs the row
	// DTO). Never closes anything: an id that no longer exists — or an editor the admin closed by
	// hand — leaves the list on screen instead of fighting it.
	//
	// Resolved from `shownPath`, NOT from `segments`: that is the whole mechanism of the same-route
	// hold (`lib/editor-guards.js`). While a dirty editor is on screen the hold does not advance
	// `shownPath`, so this effect never sees the incoming id and never remounts the editor out from
	// under the typing.
	const deepLinkId = deepLinkOf( shownPath );
	const openedDeepLink = useRef( '' );
	useEffect( () => {
		if ( '' === deepLinkId || openedDeepLink.current === deepLinkId || 'loading' === state.status ) {
			return;
		}
		openedDeepLink.current = deepLinkId;
		const service = state.services.find( ( item ) => String( item.id ) === deepLinkId );
		if ( service ) {
			setEditor( { mode: 'edit', service } );
		}
	}, [ deepLinkId, state.status, state.services ] );

	const createCategory = useCallback( async ( name ) => {
		const created = await api.post( '/service-categories', { name } );
		setState( ( s ) => ( { ...s, categories: [ ...s.categories, created ] } ) );
		return created;
	}, [] );

	const closeInspector = () => setInspector( null );

	// C1 archive-first (spec §1.1 addendum 2026-07-20; U2 data-loss scare): Archive is a safe,
	// reversible status change — NEVER a delete. It keeps the service for history and hides it from
	// new bookings.
	const onArchive = async ( service ) => {
		// Say what happens to the bookings already made (T-075) — nothing, which is exactly what
		// the dialog used to leave the operator to guess.
		const note = upcomingBookingsNote( await countUpcomingBookings( { service_id: service.id } ) );
		const ok = await confirm( {
			title: `Archive “${ service.name }”?`,
			message: `It’s kept for history and hidden from new bookings. You can restore it any time.${ note ? ` ${ note }` : '' }`,
			confirmText: 'Archive',
			destructive: true,
		} );
		if ( ! ok ) {
			return;
		}
		try {
			await api.patch( `/services/${ service.id }`, { status: 'archived' } );
			showToast( `${ service.name } archived.` );
			await load();
		} catch ( err ) {
			showToast( err.message, 'danger' );
		}
	};

	// Restore an archived service back to active (reversible, no confirm needed).
	const onRestore = async ( service ) => {
		try {
			await api.patch( `/services/${ service.id }`, { status: 'active' } );
			showToast( `${ service.name } restored.`, 'success' );
			await load();
		} catch ( err ) {
			showToast( err.message, 'danger' );
		}
	};

	// Permanent delete — the row action is offered ONLY on a service with zero bookings (C1). The
	// 409 fallback covers the rare race where a booking lands between the list render and the
	// delete: archive instead so history is never lost.
	const onDelete = async ( service ) => {
		const ok = await confirm( {
			title: `Delete “${ service.name }” permanently?`,
			message: 'This can’t be undone — the service and its settings are removed for good. (Only possible because it has no bookings.)',
			confirmText: 'Delete permanently',
			destructive: true,
		} );
		if ( ! ok ) {
			return;
		}
		try {
			await api.del( `/services/${ service.id }` );
			showToast( `${ service.name } deleted permanently.` );
			await load();
		} catch ( err ) {
			if ( err.code === 'aponto_has_dependents' ) {
				try {
					await api.patch( `/services/${ service.id }`, { status: 'archived' } );
					showToast( `${ service.name } just picked up a booking — archived instead of deleted.` );
					await load();
				} catch ( e2 ) {
					showToast( e2.message, 'danger' );
				}
			} else {
				showToast( err.message, 'danger' );
			}
		}
	};

	// One request per press (persona QA 2026-10-05, T-066): a doubled "Duplicate as draft" made
	// two copies, exactly as a doubled "Create service" made two services.
	const once = useInFlight();
	const onDuplicate = ( service ) => once( async () => {
		try {
			const copy = await api.post( `/services/${ service.id }/duplicate` );
			showToast( `Duplicated “${ copy.name }” as draft — activate when ready.`, 'success' );
			await load();
		} catch ( err ) {
			showToast( err.message, 'danger' );
		}
	} );

	// "Services" pressed — header nav or WordPress sidebar — while the editor covers the list
	// (persona QA 2026-10-05, T-076). The editor is local state, so the hash never moved and the
	// press used to do nothing. It now does what the editor's own Cancel does: ask about unsaved
	// edits, then return to the list.
	useRouteReselect( 'services', async () => {
		if ( ! editor ) {
			return;
		}
		if ( editorDirty && ! ( await confirm( discardPrompt() ) ) ) {
			return;
		}
		release();
		setEditor( null );
	} );

	// ---- Full-page editor takes over the whole route ----------------------
	if ( editor ) {
		return (
			<>
				<ServiceEditor
					key={ `${ editor.mode }-${ openRecord }-${ editorEpoch }` }
					mode={ editor.mode }
					service={ editor.service }
					categories={ state.categories }
					onCreateCategory={ createCategory }
					// `release()` first: the editor has already asked its own question by the time it
					// calls back, so a guard still registered here would ask again on the next hash
					// the operator touches.
					onClose={ () => { release(); setEditor( null ); } }
					onSaved={ load }
					onDirtyChange={ setEditorDirty }
					confirm={ confirm }
				/>
				{ /* The ONE dialog this surface asks through — both guards and the editor's own
				     Cancel. The list branch renders the same node inside the workspace; here the
				     editor IS the page, so it is a sibling. A Modal portals out of the tree anyway,
				     and it is null whenever nothing is being asked. */ }
				{ dialog }
			</>
		);
	}

	const reserved = reservedTabCopy( config.planEdition );
	const tabStrip = (
		<div className="pmdk-section-tabs" role="tablist" aria-label="Service views">
			{ TABS.map( ( t ) => (
				<button
					key={ t.id }
					type="button"
					role="tab"
					aria-selected={ tab === t.id ? 'true' : 'false' }
					onClick={ () => { setTab( t.id ); setReorder( false ); } }
				>
					{ t.label }{ t.reserved ? <small className="pd-nav-phase is-later">{ reserved.badge }</small> : null }
				</button>
			) ) }
		</div>
	);

	let panel;
	if ( tab === 'categories' ) {
		panel = <CategoriesPanel state={ state } confirm={ confirm } onReload={ load } showToast={ showToast } />;
	} else if ( tab === 'bundles' || tab === 'extras' ) {
		panel = (
			<div className="ap-reserved-tab">
				<span className="ap-state-icon" aria-hidden="true">{ renderIcon( tab === 'bundles' ? 'box' : 'tag' ) }</span>
				<h2>{ tab === 'bundles' ? 'Bundles' : 'Extras' }</h2>
				<p>{ tab === 'bundles' ? 'Sell packages of multiple services together.' : 'Add-ons customers can attach to a booking.' } { reserved.note }</p>
			</div>
		);
	} else {
		panel = <ServicesPanel state={ state } reorder={ reorder } setReorder={ setReorder } onNew={ () => setEditor( { mode: 'create' } ) } onEdit={ ( service ) => setEditor( { mode: 'edit', service } ) } onQuickView={ ( service ) => setInspector( { type: 'quickview', serviceId: service.id, service } ) } onDuplicate={ onDuplicate } onArchive={ onArchive } onRestore={ onRestore } onDelete={ onDelete } onReload={ load } showToast={ showToast } />;
	}

	// Resolve the quick-view service from the LIVE list by id so an edit-then-save reflects the
	// fresh price immediately instead of a stale open-time snapshot (fleet-r1 Fix 9f; finding U1
	// BUG-5). Falls back to the snapshot only if the row is gone (e.g. just deleted).
	const quickViewService = inspector && inspector.type === 'quickview'
		? ( state.services.find( ( s ) => s.id === inspector.serviceId ) || inspector.service )
		: null;

	const inspectorNode = inspector ? (
		inspector.type === 'quickview'
			? <ServiceQuickView service={ quickViewService } categories={ state.categories } onEdit={ () => { setEditor( { mode: 'edit', service: quickViewService } ); closeInspector(); } } onClose={ closeInspector } />
			: <CategoryForm mode={ inspector.mode } category={ inspector.category } onClose={ closeInspector } onSaved={ load } showToast={ showToast } />
	) : null;

	return (
		<InflowWorkspace
			widthKey={ WIDTH_KEY }
			open={ Boolean( inspector ) }
			label="Service inspector"
			inspectorLabelledBy="serviceInspectorTitle"
			inspector={ inspectorNode }
		>
			<PageHeader
				title="Services"
				actions={ tab === 'services' ? <button className="pmdk-button primary sm" type="button" onClick={ () => setEditor( { mode: 'create' } ) }>{ renderIcon( 'plus' ) }<span>New service</span></button>
					: tab === 'categories' ? <button className="pmdk-button primary sm" type="button" onClick={ () => setInspector( { type: 'category', mode: 'create' } ) }>{ renderIcon( 'plus' ) }<span>New category</span></button> : null }
			/>
			{ tabStrip }
			{ tab === 'services' && staffCount === 0 && state.services.length > 0 ? (
				<p className="ap-list-note ap-staff-gap-note" role="status">
					{ renderIcon( 'alert' ) }
					<span className="ap-staff-gap-text">Services can’t be booked until you add a staff member.</span>
					<button className="pd-button text sm" type="button" onClick={ () => onNavigate?.( 'staff' ) }>Add staff</button>
				</p>
			) : null }
			{ panel }
			{ dialog }
		</InflowWorkspace>
	);
}

// --- Services tab -----------------------------------------------------------
function ServicesPanel( { state, reorder, setReorder, onNew, onEdit, onQuickView, onDuplicate, onArchive, onRestore, onDelete, onReload, showToast } ) {
	const [ activeCategory, setActiveCategory ] = useState( null );

	const columns = useMemo( () => [
		columnHelper.accessor( 'name', {
			header: 'Service',
			size: 220,
			enableHiding: false,
			meta: { label: 'Service' },
			cell: ( info ) => (
				<span className="ap-cell-identity">
					<span className="ap-color-dot" style={ { background: info.row.original.color || 'var(--ap-color-border-strong)' } } aria-hidden="true" />
					<span className="pmdk-cell-value pmdk-cell-strong" title={ info.getValue() }>{ info.getValue() }</span>
				</span>
			),
		} ),
		columnHelper.accessor( 'categoryName', { id: 'categoryName', header: 'Category', size: 150, meta: { label: 'Category' }, filterFn: CATEGORY_FACET_FILTER, cell: ( info ) => <span className="pmdk-cell-value pmdk-cell-muted">{ info.getValue() }</span> } ),
		columnHelper.accessor( 'duration_minutes', { id: 'duration', header: 'Duration', size: 110, meta: { label: 'Duration', numeric: true }, cell: ( info ) => <span className="pmdk-cell-value pmdk-cell-numeric">{ info.getValue() } min</span> } ),
		columnHelper.accessor( 'price_minor', { id: 'price', header: 'Price', size: 110, meta: { label: 'Price', numeric: true }, cell: ( info ) => <span className="pmdk-cell-value pmdk-cell-numeric">{ info.getValue() === null || info.getValue() === undefined ? '—' : money( info.getValue() ) }</span> } ),
		columnHelper.accessor( 'staffCount', { id: 'staff', header: 'Staff', size: 90, enableSorting: false, meta: { label: 'Staff' }, cell: ( info ) => <span className="pmdk-cell-value pmdk-cell-muted">{ info.getValue() } staff</span> } ),
		// An ACTIVE service nobody active is assigned to is not bookable (re-test R11): the public
		// catalogue leaves it out (T-073), so the pill says that instead of a plain "active".
		columnHelper.accessor( 'status', { id: 'status', header: 'Status', size: 130, meta: { label: 'Status' }, filterFn: inArrayFilter, cell: ( info ) => ( serviceNotBookable( info.row.original )
			? <span className="ap-status-pill is-draft" title={ NOT_BOOKABLE_REASON }>{ __( 'Not bookable', 'aponto' ) }</span>
			: <span className={ `ap-status-pill is-${ info.getValue() }` }>{ info.getValue() }</span> ) } ),
		columnHelper.display( {
			id: 'action',
			size: 60,
			enableHiding: false,
			enableSorting: false,
			header: 'Action',
			cell: ( info ) => {
				const svc = info.row.original;
				const items = [
					{ action: 'edit', label: 'Edit service', icon: 'note' },
					{ action: 'duplicate', label: 'Duplicate as draft', icon: 'files' },
				];
				// Archive (reversible) is the default for a live service; an archived one offers
				// Restore instead. Delete (permanent) appears ONLY when the service has zero
				// bookings — otherwise history would be lost (C1).
				if ( svc.status === 'archived' ) {
					items.push( { action: 'restore', label: 'Restore service', icon: 'arrows', separatorBefore: true } );
				} else {
					items.push( { action: 'archive', label: 'Archive service', icon: 'prohibit', danger: true, separatorBefore: true } );
				}
				if ( ! svc.bookingCount ) {
					items.push( { action: 'delete', label: 'Delete permanently', icon: 'trash', danger: true } );
				}
				return (
					<RowMenu
						label={ `Actions for ${ svc.name }` }
						renderIcon={ renderIcon }
						items={ items }
						onSelect={ ( action ) => {
							if ( action === 'edit' ) onEdit( svc );
							else if ( action === 'duplicate' ) onDuplicate( svc );
							else if ( action === 'archive' ) onArchive( svc );
							else if ( action === 'restore' ) onRestore( svc );
							else if ( action === 'delete' ) onDelete( svc );
						} }
					/>
				);
			},
		} ),
	], [ onEdit, onDuplicate, onArchive, onRestore, onDelete ] );

	// The reorder affordance is only meaningful for a single selected category. The facet
	// value is the category IDENTITY (`id:<id>`), so reorder is scoped to that one record
	// even when another category shares its name.
	const onFiltersChanged = ( filters ) => {
		const cat = ( filters || [] ).find( ( f ) => f.id === 'categoryName' );
		const values = Array.isArray( cat?.value ) ? cat.value : [];
		const only = values.length === 1 ? values[ 0 ] : null;
		setActiveCategory( only );
		if ( ! only && reorder ) {
			setReorder( false );
		}
	};

	if ( reorder && activeCategory ) {
		return (
			<section className="pd-data-list pmdk-data-list">
				<ServiceReorder
					categoryIdentity={ activeCategory }
					services={ state.services }
					onCancel={ () => setReorder( false ) }
					onSaved={ () => { setReorder( false ); onReload(); } }
					showToast={ showToast }
				/>
			</section>
		);
	}

	return (
		<section className="pd-data-list pmdk-data-list" aria-label="Services list">
			<PMDKDataTable
				columns={ columns }
				data={ state.services }
				getRowId={ ( row ) => String( row.id ) }
				status={ state.status === 'ready' && ! state.services.length ? 'empty' : state.status }
				states={ {
					empty: { icon: renderIcon( 'tag' ), title: 'No services yet', description: 'Create the services customers can book.', action: <button className="pmdk-button primary sm" type="button" onClick={ onNew }>{ renderIcon( 'plus' ) }New service</button> },
					error: { title: 'Could not load services', description: state.error || '', action: <button className="pmdk-button sm" type="button" onClick={ onReload }>{ renderIcon( 'arrows' ) }Retry</button> },
				} }
				enableRowSelection={ false }
				onColumnFiltersChange={ onFiltersChanged }
				filterBuilder={ ( { table } ) => <Facets table={ table } defs={ FACETS } renderIcon={ renderIcon } /> }
				activeFilters={ ( { table } ) => <FacetChips table={ table } defs={ FACETS } renderIcon={ renderIcon } /> }
				filterCount={ ( { table } ) => facetCount( table, FACETS ) }
				toolbarControls={ activeCategory ? (
					<button className="pmdk-toolbar-control" type="button" onClick={ () => setReorder( true ) }>{ renderIcon( 'list' ) }<span>Reorder</span></button>
				) : null }
				onRowActivate={ ( row ) => onQuickView( row ) }
				getRowAriaLabel={ ( row ) => `Quick view ${ row.name }` }
				renderIcon={ renderIcon }
				itemsLabel="services"
				labels={ { searchPlaceholder: 'Search services…', searchAria: 'Search services' } }
				persistenceKey="aponto.admin.services.table.v1"
			/>
		</section>
	);
}

// --- Categories tab (C2: inline rename + drag-reorder) ----------------------
function CategoriesPanel( { state, confirm, onReload, showToast } ) {
	// Local drag order (ids), synced from the server list which is already position-sorted
	// (GET /service-categories → ORDER BY position). Optimistic on drop; reverted if the reorder
	// POST fails. The public booking form reads the same position order, so a drag here changes the
	// order customers see (C2).
	const [ order, setOrder ] = useState( () => state.categories.map( ( c ) => c.id ) );
	const [ savingOrder, setSavingOrder ] = useState( false );
	const [ editingId, setEditingId ] = useState( null );
	const byId = useMemo( () => Object.fromEntries( state.categories.map( ( c ) => [ c.id, c ] ) ), [ state.categories ] );

	useEffect( () => {
		setOrder( state.categories.map( ( c ) => c.id ) );
	}, [ state.categories ] );

	const sensors = useSensors(
		useSensor( PointerSensor, { activationConstraint: { distance: 5 } } ),
		useSensor( KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates } )
	);

	const rename = async ( category, name ) => {
		const next = ( name || '' ).trim();
		setEditingId( null );
		if ( ! next || next === category.name ) {
			return;
		}
		try {
			await api.patch( `/service-categories/${ category.id }`, { name: next } );
			showToast( 'Category renamed.', 'success' );
			onReload();
		} catch ( err ) {
			showToast( err.message, 'danger' );
		}
	};

	const removeCategory = async ( category ) => {
		const ok = await confirm( {
			title: `Delete “${ category.name }”?`,
			message: 'Its services move to Uncategorized. This can’t be undone.',
			confirmText: 'Delete',
			destructive: true,
		} );
		if ( ! ok ) {
			return;
		}
		try {
			const res = await api.del( `/service-categories/${ category.id }` );
			showToast( `Category deleted — ${ res.services_uncategorized || 0 } service${ res.services_uncategorized === 1 ? '' : 's' } moved to Uncategorized.` );
			onReload();
		} catch ( err ) {
			showToast( err.message, 'danger' );
		}
	};

	const onDragEnd = async ( { active, over } ) => {
		if ( ! over || active.id === over.id ) {
			return;
		}
		const next = arrayMove( order, order.indexOf( active.id ), order.indexOf( over.id ) );
		setOrder( next );
		setSavingOrder( true );
		try {
			// Full-set replacement (rest-contract §2.4).
			await api.post( '/service-categories/reorder', { ids: next } );
			showToast( 'Category order saved.', 'success' );
			onReload();
		} catch ( err ) {
			setOrder( state.categories.map( ( c ) => c.id ) );
			showToast( err.message, 'danger' );
		} finally {
			setSavingOrder( false );
		}
	};

	if ( state.status === 'loading' ) {
		return <p className="pd-editor-note" style={ { padding: '16px 4px' } }>Loading categories…</p>;
	}
	if ( ! state.categories.length ) {
		return (
			<div className="ap-reserved-tab">
				<span className="ap-state-icon" aria-hidden="true">{ renderIcon( 'tag' ) }</span>
				<h2>No categories yet</h2>
				<p>Group related services under a category. Services without one show as “Uncategorized”.</p>
			</div>
		);
	}
	return (
		<section className="pd-data-list pmdk-data-list ap-simple-table ap-cat-table" aria-label="Categories">
			<p className="ap-list-note" role="note">{ renderIcon( 'list' ) }<span>Drag to set the order customers see. Click a name to rename it.</span></p>
			<div className="pmdk-table-wrap">
				<DndContext sensors={ sensors } collisionDetection={ closestCenter } onDragEnd={ onDragEnd }>
					<SortableContext items={ order } strategy={ verticalListSortingStrategy }>
						<table className="pmdk-table">
							<thead><tr><th scope="col" className="ap-cat-drag-col"><span className="screen-reader-text">Reorder</span></th><th scope="col">Name</th><th scope="col" className="pmdk-amount">Services</th><th scope="col" className="pmdk-col-action">Action</th></tr></thead>
							<tbody>
								{ order.map( ( id ) => byId[ id ] ? (
									<SortableCategoryRow
										key={ id }
										category={ byId[ id ] }
										editing={ editingId === id }
										busy={ savingOrder }
										onStartRename={ () => setEditingId( id ) }
										onRename={ ( name ) => rename( byId[ id ], name ) }
										onCancelRename={ () => setEditingId( null ) }
										onDelete={ () => removeCategory( byId[ id ] ) }
									/>
								) : null ) }
							</tbody>
						</table>
					</SortableContext>
				</DndContext>
			</div>
		</section>
	);
}

// One draggable, inline-renameable category row (C2).
function SortableCategoryRow( { category, editing, busy, onStartRename, onRename, onCancelRename, onDelete } ) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable( { id: category.id } );
	const [ draft, setDraft ] = useState( category.name );
	useEffect( () => { setDraft( category.name ); }, [ category.name, editing ] );
	const style = { transform: CSS.Transform.toString( transform ), transition, opacity: isDragging ? 0.6 : undefined };
	return (
		<tr ref={ setNodeRef } style={ style } className={ isDragging ? 'is-dragging' : undefined }>
			<td className="ap-cat-drag">
				<button type="button" className="ap-reorder-handle" aria-label={ `Reorder ${ category.name }` } disabled={ busy } { ...attributes } { ...listeners }>{ renderIcon( 'moreVertical' ) }</button>
			</td>
			<td>
				{ editing ? (
					<input
						className="ap-cat-rename-input"
						value={ draft }
						// eslint-disable-next-line jsx-a11y/no-autofocus
						autoFocus
						aria-label={ `Rename ${ category.name }` }
						onChange={ ( e ) => setDraft( e.target.value ) }
						onBlur={ () => onRename( draft ) }
						onKeyDown={ ( e ) => {
							if ( e.key === 'Enter' ) { e.preventDefault(); onRename( draft ); }
							else if ( e.key === 'Escape' ) { e.preventDefault(); onCancelRename(); }
						} }
					/>
				) : (
					<button type="button" className="ap-cat-name" onClick={ onStartRename } title="Click to rename">
						<span className="pmdk-cell-value pmdk-cell-strong">{ category.name }</span>
					</button>
				) }
			</td>
			<td className="pmdk-amount"><span className="pmdk-cell-value pmdk-cell-numeric">{ category.count ?? 0 }</span></td>
			<td className="pmdk-col-action">
				<RowMenu
					label={ `Actions for ${ category.name }` }
					renderIcon={ renderIcon }
					items={ [
						{ action: 'rename', label: 'Rename category', icon: 'note' },
						{ action: 'delete', label: 'Delete category', icon: 'trash', danger: true, separatorBefore: true },
					] }
					onSelect={ ( action ) => { if ( action === 'rename' ) onStartRename(); else if ( action === 'delete' ) onDelete(); } }
				/>
			</td>
		</tr>
	);
}

// --- Quick view (read-only) -------------------------------------------------
function ServiceQuickView( { service, categories, onEdit, onClose } ) {
	const category = service.category_id ? ( categories.find( ( c ) => c.id === service.category_id )?.name || UNCATEGORIZED ) : UNCATEGORIZED;
	return (
		<>
			<header className="pd-booking-inspector-head pd-booking-editor-head">
				<div className="pd-booking-inspector-identity"><h2 id="serviceInspectorTitle">{ service.name }</h2></div>
				<button className="pd-icon-button" type="button" aria-label="Close service quick view" onClick={ onClose }>{ renderIcon( 'close' ) }</button>
			</header>
			<div className="pd-booking-inspector-body">
				<section className="pd-editor-section">
					<div className="pd-editor-section-head"><h3>Overview</h3>{ serviceNotBookable( service )
						? <span className="ap-status-pill is-draft">{ __( 'Not bookable', 'aponto' ) }</span>
						: <span className={ `ap-status-pill is-${ service.status }` }>{ service.status }</span> }</div>
					{ serviceNotBookable( service ) ? <p className="ap-inspector-note">{ NOT_BOOKABLE_REASON }</p> : null }
					<div className="pd-editor-readonly"><span className="pd-editor-readonly-label">Category</span><strong>{ category }</strong></div>
					<div className="pd-editor-readonly"><span className="pd-editor-readonly-label">Duration</span><strong>{ service.duration_minutes } min</strong></div>
					<div className="pd-editor-readonly"><span className="pd-editor-readonly-label">Price</span><strong>{ service.price_minor === null || service.price_minor === undefined ? '—' : money( service.price_minor ) }</strong></div>
					<div className="pd-editor-readonly"><span className="pd-editor-readonly-label">Eligible staff</span><strong>{ service.staffCount } staff</strong></div>
				</section>
				{ service.description ? (
					<section className="pd-editor-section"><div className="pd-editor-section-head"><h3>Description</h3></div><p className="ap-inspector-note">{ service.description }</p></section>
				) : null }
			</div>
			<footer className="pd-drawer-foot pd-booking-inspector-foot">
				<div className="pd-inspector-foot-actions">
					<button className="pd-button primary sm" type="button" onClick={ onEdit }>{ renderIcon( 'note' ) }Edit service</button>
				</div>
			</footer>
		</>
	);
}

// --- Category create/rename (in-flow inspector, form mode) ------------------
function CategoryForm( { mode, category, onClose, onSaved, showToast } ) {
	const [ name, setName ] = useState( category?.name || '' );
	const [ saving, setSaving ] = useState( false );
	const creating = mode === 'create';
	const once = useInFlight();

	const save = () => once( async () => {
		if ( ! name.trim() ) {
			return;
		}
		setSaving( true );
		try {
			if ( creating ) {
				await api.post( '/service-categories', { name: name.trim() } );
				showToast( 'Category created.', 'success' );
			} else {
				await api.patch( `/service-categories/${ category.id }`, { name: name.trim() } );
				showToast( 'Category renamed.', 'success' );
			}
			onSaved?.();
			onClose?.();
		} catch ( err ) {
			showToast( err.message, 'danger' );
			setSaving( false );
		}
	} );

	return (
		<>
			<header className="pd-booking-inspector-head pd-booking-editor-head">
				<div className="pd-booking-inspector-identity"><h2 id="serviceInspectorTitle">{ creating ? 'New category' : 'Rename category' }</h2></div>
				<button className="pd-icon-button" type="button" aria-label="Close category form" onClick={ onClose }>{ renderIcon( 'close' ) }</button>
			</header>
			<form className="pd-booking-inspector-body pd-compact-editor" onSubmit={ ( e ) => { e.preventDefault(); save(); } }>
				<section className="pd-editor-section">
					<div className="pd-editor-section-head"><h3>Category</h3></div>
					<label className="pd-compact-field"><input value={ name } placeholder=" " autoFocus required onChange={ ( e ) => setName( e.target.value ) } /><span className="pd-compact-label">Name</span></label>
				</section>
			</form>
			<footer className="pd-drawer-foot pd-booking-inspector-foot">
				<div className="pd-inspector-foot-actions">
					<button className="pd-button sm" type="button" onClick={ onClose }>Cancel</button>
					<button className="pd-button primary sm" type="button" disabled={ saving } onClick={ save }>{ saving ? 'Saving…' : creating ? 'Create' : 'Save' }</button>
				</div>
			</footer>
		</>
	);
}

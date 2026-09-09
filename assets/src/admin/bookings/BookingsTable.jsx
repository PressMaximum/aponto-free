import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
	closestCenter,
	DndContext,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	arrayMove,
	sortableKeyboardCoordinates,
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from '@tanstack/react-table';
import { __ } from '@wordpress/i18n';
import { customerTimezoneLine } from '../lib/schedule-cell.js';
import { menuRovingKeydown } from '../lib/ui.jsx';
import {
	facetChipSummary,
	facetOptions,
	facetRecordId,
	facetSummary,
	inArrayFilter,
	recordFacetFilter,
} from '../lib/facet-options.js';
import { PAYMENT_FILTER_OPTIONS, paymentBadge } from '../lib/payment-status.js';

const STATUS_LABELS = {
	pending: 'Pending',
	confirmed: 'Confirmed',
	completed: 'Completed',
	cancelled: 'Cancelled',
	no_show: 'No-show',
};
const STATUS_ICONS = {
	pending: 'arrows',
	confirmed: 'check',
	completed: 'calendar-check',
	cancelled: 'prohibit',
	// An hourglass, not another crossed-out circle: "we waited" reads as a different
	// event from "this was cancelled", and reusing `prohibit` would have made the two
	// rows scan identically at badge size (D-R33).
	no_show: 'hourglass',
};
const STATUS_OPTIONS = Object.keys( STATUS_LABELS );
// Single-source status transition matrix (mirrors BookingStatusService::ALLOWED and
// plugin-dashboard.js). The current status is always selectable (no-op); cancelled →
// pending is a restore that rechecks availability; no_show → confirmed is the undo
// (a relabel — no recheck, D-R33). Completed is terminal, and so is no_show apart
// from that undo. `pending → no_show` is absent on purpose: confirm first.
const STATUS_TRANSITIONS = {
	pending: [ 'confirmed', 'cancelled' ],
	confirmed: [ 'completed', 'cancelled', 'no_show' ],
	completed: [],
	cancelled: [ 'pending' ],
	no_show: [ 'confirmed' ],
};
const nextStatuses = ( status ) => STATUS_TRANSITIONS[ status ] || [];

/**
 * Whether a booking may be marked as a no-show YET (D-R33). The server's own guard is
 * `now >= start_utc` and answers a forceable 422 before it, so this is the honest UI
 * mirror of that rule: the option is offered only once the appointment has started.
 * Anything earlier stays available through the editor's force dialog, not through a
 * one-click row action — "they didn't turn up" should never be a slip of the mouse on
 * a booking that is still hours away.
 *
 * @param {Object} booking Row (carries `startUtc`, an RFC3339 UTC instant).
 * @param {number} now     Epoch ms to compare against (injectable for tests).
 * @return {boolean} True once the appointment's start has passed.
 */
export function canMarkNoShow( booking, now = Date.now() ) {
	if ( ! booking || booking.status !== 'confirmed' ) return false;
	const start = Date.parse( booking.startUtc );
	return Number.isFinite( start ) && start <= now;
}

// Roving focus for role="menu" containers comes from the shared helper in lib/ui.jsx
// (SPEC §11) — the local copy this file used to carry CLAMPED at the ends instead of
// cycling, so the booking menus behaved differently from every other menu in the SPA.
// Date ranges are computed relative to the real "today" (no hardcoded fixture
// dates). The bounds are ISO Y-m-d in the browser's local day; rows carry an ISO
// `date` (business-timezone) so the facet filters real data.
function localYmd( date ) {
	return new Intl.DateTimeFormat( 'en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' } ).format( date );
}
function shortLabel( date ) {
	return new Intl.DateTimeFormat( 'en-US', { month: 'short', day: 'numeric' } ).format( date );
}
function computeDateRanges( base = new Date() ) {
	const today = new Date( base );
	const dow = ( today.getDay() + 6 ) % 7; // 0 = Monday
	const weekStart = new Date( today ); weekStart.setDate( today.getDate() - dow );
	const weekEnd = new Date( weekStart ); weekEnd.setDate( weekStart.getDate() + 6 );
	const upEnd = new Date( today ); upEnd.setDate( today.getDate() + 6 );
	return {
		today: { label: shortLabel( today ), fullLabel: shortLabel( today ), title: 'Today', detail: 'Today only', from: localYmd( today ), to: localYmd( today ) },
		week: { label: `${ shortLabel( weekStart ) }–${ shortLabel( weekEnd ) }`, start: shortLabel( weekStart ), end: shortLabel( weekEnd ), title: 'This week', detail: 'Current week', from: localYmd( weekStart ), to: localYmd( weekEnd ) },
		upcoming: { label: `${ shortLabel( today ) }–${ shortLabel( upEnd ) }`, start: shortLabel( today ), end: shortLabel( upEnd ), title: 'Upcoming', detail: 'Next 7 days', from: localYmd( today ), to: localYmd( upEnd ) },
		all: { label: 'All dates', fullLabel: 'All dates', title: 'All dates', detail: 'No date limit' },
	};
}
const DATE_RANGES = computeDateRanges();
// Facet identity per axis (lib/facet-options.js): catalog columns are RECORD-keyed via
// the row's id, so two same-named services/staff stay two options that filter to
// disjoint row sets. `status` is a genuine enum — its value IS the identity. `location`
// stays value-keyed because the `GET /bookings` list item carries no location id
// (rest-contract §2.8 exposes only `service.id`/`staff.id`); it becomes record-keyed the
// day the payload does, by adding `idKey` here.
const FILTER_DEFINITIONS = [
	{ columnId: 'status', label: 'Status', options: STATUS_OPTIONS.map( ( value ) => ( { value, label: STATUS_LABELS[ value ] } ) ) },
	// Payment status is a genuine enum too (D-R38), so its options are the FIVE the server knows —
	// not the values present in the loaded window. A site that has never been paid must still be
	// able to ask for "Not paid", and a window-derived facet would offer nothing to ask with.
	{ columnId: 'payment', label: __( 'Payment', 'aponto' ), options: PAYMENT_FILTER_OPTIONS },
	{ columnId: 'staff', label: 'Staff', idKey: 'staffId' },
	{ columnId: 'service', label: 'Service', idKey: 'serviceId' },
	{ columnId: 'location', label: 'Location' },
];
const SERVICE_FACET_FILTER = recordFacetFilter( 'serviceId', 'service' );
const STAFF_FACET_FILTER = recordFacetFilter( 'staffId', 'staff' );
const DEFAULT_SORTING = [ { id: 'schedule', desc: false } ];
const DEFAULT_COLUMN_ORDER = [
	'select',
	'id',
	'schedule',
	'customer',
	'service',
	'staff',
	'status',
	'total',
	'payment',
	'location',
	'email',
	'date',
	'action',
];

const DEFAULT_COLUMN_VISIBILITY = {
	date: false,
	location: false,
	email: false,
	id: false,
	// OFF by default (D-R38): most sites take no online payment, and a column that reads "Not paid"
	// on every row of every booking is noise rather than information. The facet above is always
	// available, so a site that does take payments can filter without turning the column on.
	payment: false,
};

function normalizeColumnOrder( preferredOrder ) {
	const allowed = new Set( DEFAULT_COLUMN_ORDER );
	const requested = Array.isArray( preferredOrder ) ? preferredOrder : [];
	const ordered = [ ...requested, ...DEFAULT_COLUMN_ORDER ]
		.filter( ( id, index, ids ) => allowed.has( id ) && ids.indexOf( id ) === index );

	return [ 'select', 'id', ...ordered.filter( ( id ) => ! [ 'select', 'id', 'action' ].includes( id ) ), 'action' ];
}

const columnHelper = createColumnHelper();

function timeInMinutes( value ) {
	const match = String( value ).match( /^(\d+):(\d+)\s(AM|PM)$/ );
	if ( ! match ) return 0;
	const hour = ( Number( match[ 1 ] ) % 12 ) + ( match[ 3 ] === 'PM' ? 12 : 0 );
	return hour * 60 + Number( match[ 2 ] );
}

function dateMatchesRange( date, range ) {
	if ( range === 'all' || ! range ) {
		return true;
	}
	const bounds = DATE_RANGES[ range ];
	if ( ! bounds || ! bounds.from ) {
		return true;
	}
	return date >= bounds.from && date <= bounds.to;
}

function bookingGlobalFilter( row, _columnId, value ) {
	const query = String( value || '' ).trim().toLowerCase();
	if ( ! query ) return true;
	const booking = row.original;
	return `${ booking.customer } ${ booking.email } ${ booking.service } ${ booking.order }`.toLowerCase().includes( query );
}

function statusMenuOpensUp( rowIndex, rowCount ) {
	return rowCount > 1 && rowIndex === rowCount - 1 || rowCount > 4 && rowIndex >= rowCount - 2;
}

function IndeterminateCheckbox( { indeterminate, ...props } ) {
	const ref = useRef( null );

	useEffect( () => {
		if ( ref.current ) ref.current.indeterminate = Boolean( indeterminate );
	}, [ indeterminate ] );

	return <input ref={ ref } className="pd-table-checkbox" type="checkbox" { ...props } />;
}

function StatusControl( {
	booking,
	isOpen,
	opensUp,
	onOpenChange,
	onStatusChange,
	renderIcon,
} ) {
	const triggerRef = useRef( null );
	const menuRef = useRef( null );
	const openedByKeyboard = useRef( false );
	// The inline picker is a ONE-CLICK control, so it only offers moves that need no
	// confirmation: `no_show` drops out until the appointment has started (D-R33), where
	// the server would answer a forceable 422 anyway. Forcing it earlier stays possible,
	// deliberately behind the editor's reason dialog.
	const statusOptions = [ booking.status, ...nextStatuses( booking.status ).filter( ( s ) => s !== 'no_show' || canMarkNoShow( booking ) ) ];
	const chooseStatus = ( event, status ) => {
		event.preventDefault();
		event.stopPropagation();
		if ( status !== booking.status ) onStatusChange( booking, status );
		onOpenChange( null );
	};

	useEffect( () => {
		if ( isOpen && openedByKeyboard.current ) {
			window.requestAnimationFrame( () => menuRef.current?.querySelector( '[role="menuitemradio"]' )?.focus() );
		}
		if ( ! isOpen ) openedByKeyboard.current = false;
	}, [ isOpen ] );

	return (
		<div
			className={ `pd-status-picker${ isOpen ? ' is-open' : '' }${ opensUp ? ' opens-up' : '' }` }
			data-tanstack-status-picker
			onKeyDown={ ( event ) => {
				if ( event.key !== 'Escape' || ! isOpen ) return;
				event.preventDefault();
				event.stopPropagation();
				onOpenChange( null );
				window.requestAnimationFrame( () => document.querySelector( `[data-status-trigger="${ booking.id }"]` )?.focus() );
			} }
		>
			<button
				className={ `pd-status pd-status-trigger ${ booking.status }` }
				ref={ triggerRef }
				data-status-trigger={ booking.id }
				type="button"
				aria-haspopup="menu"
				aria-expanded={ isOpen }
				aria-label={ `Change status for ${ booking.customer }` }
				onClick={ ( event ) => {
					openedByKeyboard.current = event.detail === 0;
					event.preventDefault();
					event.stopPropagation();
					onOpenChange( isOpen ? null : booking.id );
				} }
			>
				<span className="pd-status-icon">{ renderIcon( STATUS_ICONS[ booking.status ] ) }</span>
				<span className="pd-status-label">{ STATUS_LABELS[ booking.status ] }</span>
				{ renderIcon( 'chevronDown' ) }
			</button>
			<div className="pd-status-menu" role="menu" aria-label="Set booking status" hidden={ ! isOpen } ref={ menuRef } onKeyDown={ menuRovingKeydown }>
				{ statusOptions.map( ( status ) => {
					const restore = booking.status === 'cancelled' && status === 'pending';
					const undoNoShow = booking.status === 'no_show' && status === 'confirmed';
					return (
						<button
							className={ `pd-status-option ${ status }` }
							type="button"
							role="menuitemradio"
							aria-checked={ booking.status === status }
							key={ status }
							onClick={ ( event ) => chooseStatus( event, status ) }
						>
							<span className="pd-status-option-icon">{ renderIcon( STATUS_ICONS[ status ] ) }</span>
							<span>{ restore ? 'Pending (restore)' : undoNoShow ? 'Confirmed (undo no-show)' : STATUS_LABELS[ status ] }</span>
							<span className="pd-status-option-check">{ booking.status === status ? renderIcon( 'check' ) : null }</span>
						</button>
					);
				} ) }
			</div>
		</div>
	);
}

function BookingRowActions( {
	booking,
	isOpen,
	opensUp,
	onAction,
	onOpenChange,
	renderIcon,
} ) {
	const triggerRef = useRef( null );
	const menuRef = useRef( null );
	const openedByKeyboard = useRef( false );
	const [ menuPosition, setMenuPosition ] = useState( null );
	const canReschedule = [ 'pending', 'confirmed' ].includes( booking.status );
	const canRestore = booking.status === 'cancelled';
	const canCancel = nextStatuses( booking.status ).includes( 'cancelled' );
	// Offered only once the appointment has started (D-R33) — see canMarkNoShow. Before
	// that the item is HIDDEN rather than shown disabled: a confirmed booking three days
	// out is not "temporarily unavailable", it is simply not a no-show question yet, and
	// a greyed row invites clicking to find out why.
	const canNoShow = canMarkNoShow( booking );
	const canUndoNoShow = booking.status === 'no_show';
	const menuItemCount = 2 + ( canReschedule ? 1 : 0 ) + ( [ 'pending', 'confirmed' ].includes( booking.status ) ? 1 : 0 ) + ( canRestore ? 1 : 0 ) + ( canNoShow ? 1 : 0 ) + ( canUndoNoShow ? 1 : 0 );
	const estimatedMenuHeight = menuItemCount * 36 + 23;

	useEffect( () => {
		if ( isOpen && menuPosition && openedByKeyboard.current ) {
			window.requestAnimationFrame( () => menuRef.current?.querySelector( '[role="menuitem"]:not([disabled])' )?.focus() );
		}
		if ( ! isOpen ) openedByKeyboard.current = false;
	}, [ isOpen, menuPosition ] );

	useLayoutEffect( () => {
		if ( ! isOpen ) {
			setMenuPosition( null );
			return undefined;
		}
		const updatePosition = () => {
			const rect = triggerRef.current?.getBoundingClientRect();
			if ( ! rect ) return;
			const viewportInset = 8;
			const menuWidth = 196;
			const openAbove = opensUp || window.innerHeight - rect.bottom < estimatedMenuHeight + viewportInset;
			const top = openAbove
				? Math.max( viewportInset, rect.top - estimatedMenuHeight - 5 )
				: Math.min( window.innerHeight - estimatedMenuHeight - viewportInset, rect.bottom + 5 );
			const isRtl = triggerRef.current?.closest( '[dir="rtl"]' );
			const preferredLeft = isRtl ? rect.left : rect.right - menuWidth;
			const left = Math.max( viewportInset, Math.min( window.innerWidth - menuWidth - viewportInset, preferredLeft ) );
			setMenuPosition( { left, top } );
		};
		updatePosition();
		window.addEventListener( 'resize', updatePosition );
		window.addEventListener( 'scroll', updatePosition, true );
		return () => {
			window.removeEventListener( 'resize', updatePosition );
			window.removeEventListener( 'scroll', updatePosition, true );
		};
	}, [ estimatedMenuHeight, isOpen, opensUp ] );

	const runAction = ( event, action ) => {
		event.preventDefault();
		event.stopPropagation();
		onOpenChange( null );
		onAction( booking, action );
	};
	const portalRoot = typeof document === 'undefined' ? null : document.querySelector( '.ap-admin' );
	const menu = isOpen && menuPosition ? (
		<div className="pd-row-action-menu is-floating" data-booking-row-actions role="menu" aria-label={ `Actions for ${ booking.customer }` } style={ menuPosition } ref={ menuRef } onKeyDown={ menuRovingKeydown }>
			<button type="button" role="menuitem" onClick={ ( event ) => runAction( event, 'view' ) }>{ renderIcon( 'list' ) }<span>View details</span></button>
			{ canReschedule ? <button type="button" role="menuitem" onClick={ ( event ) => runAction( event, 'reschedule' ) }>{ renderIcon( 'calendar' ) }<span>Reschedule</span></button> : null }
			{ booking.status === 'pending' ? <button type="button" role="menuitem" onClick={ ( event ) => runAction( event, 'confirm' ) }>{ renderIcon( 'check' ) }<span>Confirm booking</span></button> : null }
			{ booking.status === 'confirmed' ? <button type="button" role="menuitem" onClick={ ( event ) => runAction( event, 'complete' ) }>{ renderIcon( 'calendar-check' ) }<span>Complete booking</span></button> : null }
			{ canNoShow ? <button type="button" role="menuitem" onClick={ ( event ) => runAction( event, 'no-show' ) }>{ renderIcon( 'hourglass' ) }<span>Mark as no-show</span></button> : null }
			{ canUndoNoShow ? <button type="button" role="menuitem" onClick={ ( event ) => runAction( event, 'undo-no-show' ) }>{ renderIcon( 'check' ) }<span>Undo no-show</span></button> : null }
			{ canRestore ? <button type="button" role="menuitem" onClick={ ( event ) => runAction( event, 'restore' ) }>{ renderIcon( 'arrows' ) }<span>Restore booking</span></button> : null }
			{ canCancel ? <div className="pd-row-action-separator" role="separator" /> : null }
			{ canCancel ? <button className="is-danger" type="button" role="menuitem" onClick={ ( event ) => runAction( event, 'cancel' ) }>{ renderIcon( 'prohibit' ) }<span>Cancel booking</span></button> : null }
		</div>
	) : null;

	return (
		<div
			className={ `pd-booking-row-actions${ isOpen ? ' is-open' : '' }${ opensUp ? ' opens-up' : '' }` }
			data-booking-row-actions
			onKeyDown={ ( event ) => {
				if ( event.key !== 'Escape' || ! isOpen ) return;
				event.preventDefault();
				event.stopPropagation();
				onOpenChange( null );
				window.requestAnimationFrame( () => document.querySelector( `[data-booking-action-trigger="${ booking.id }"]` )?.focus() );
			} }
		>
			<button
				className="pd-row-action pd-row-action-icon"
				ref={ triggerRef }
				type="button"
				data-booking-action-trigger={ booking.id }
				aria-haspopup="menu"
				aria-expanded={ isOpen }
				aria-label={ `Booking actions for ${ booking.customer }` }
				onClick={ ( event ) => {
					openedByKeyboard.current = event.detail === 0;
					event.preventDefault();
					event.stopPropagation();
					onOpenChange( isOpen ? null : booking.id );
				} }
			>
				{ renderIcon( 'moreVertical' ) }
			</button>
			{ portalRoot && menu ? createPortal( menu, portalRoot ) : menu }
		</div>
	);
}

function SortableColumnOption( { column, renderIcon } ) {
	const label = column.columnDef.meta?.label || column.id;
	const canHide = column.getCanHide();
	const {
		attributes,
		isDragging,
		listeners,
		setNodeRef,
		transform,
		transition,
	} = useSortable( { id: column.id } );

	return (
		<div
			className={ `pd-column-option${ isDragging ? ' is-dragging' : '' }${ canHide ? '' : ' is-required' }` }
			ref={ setNodeRef }
			style={ { transform: CSS.Transform.toString( transform ), transition } }
		>
			<button className="pd-column-drag-handle" type="button" aria-label={ `Drag to reorder ${ label } column` } { ...attributes } { ...listeners }>
				{ renderIcon( 'moreVertical' ) }
			</button>
			<label>
				<input type="checkbox" checked={ column.getIsVisible() } disabled={ ! canHide } onChange={ column.getToggleVisibilityHandler() } />
				<span className="pd-filter-checkbox">{ renderIcon( 'check' ) }</span>
				<span className="pd-column-option-label"><span>{ label }</span>{ canHide ? null : <small>Required</small> }</span>
			</label>
		</div>
	);
}

/**
 * UTC instant (RFC3339 `Z`) for midnight of `ymd` (+`addDays`) in `tz`.
 * Two-pass convergence handles any offset including DST edges; no tz library.
 *
 * @param {string} ymd     ISO date `YYYY-MM-DD`.
 * @param {string} tz      IANA business timezone.
 * @param {number} addDays Days to add before converting (for exclusive `to`).
 */
function utcAtTzMidnight( ymd, tz, addDays = 0 ) {
	const [ y, m, d ] = ymd.split( '-' ).map( Number );
	const target = Date.UTC( y, m - 1, d + addDays );
	let ts = target;
	const dtf = new Intl.DateTimeFormat( 'en-CA', {
		timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
		hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
	} );
	for ( let i = 0; i < 2; i++ ) {
		const parts = Object.fromEntries( dtf.formatToParts( new Date( ts ) ).map( ( p ) => [ p.type, p.value ] ) );
		const wall = Date.UTC( Number( parts.year ), Number( parts.month ) - 1, Number( parts.day ), Number( parts.hour ), Number( parts.minute ) );
		ts += target - wall;
	}
	return new Date( ts ).toISOString().replace( /\.\d{3}Z$/, 'Z' );
}

/**
 * Maps the live TanStack filter state to the server CSV export query params
 * (SPEC-P1 §5 — the export matches the current view). Threads everything the
 * `/export/bookings.csv` contract supports: single `status`, `service_id`,
 * `staff_id`, `from`/`to` (UTC bounds of the active date-range preset at
 * business-timezone midnight) and `search` (server haystack = customer name +
 * email + service name + order code, rest-contract §2.8).
 *
 * KNOWN GAPS (route contract, not silently dropped):
 *  - status/service/staff facets are multi-select client-side but the route
 *    takes one value — threaded only when exactly ONE is selected, else the
 *    export stays unfiltered on that axis;
 *  - the route has NO `location` param (Free is single-location); the location
 *    facet is also the one axis with no id in the list payload;
 *  - the client "order" search haystack uses the `AP #<id>` display form while
 *    the server matches real `AP-*` order codes.
 *
 * @param {Object} table            TanStack table.
 * @param {string} businessTimezone IANA business timezone.
 */
function exportFiltersFromTable( table, businessTimezone ) {
	const state = table.getState();
	const filters = { status: 'all', search: ( state.globalFilter || '' ).trim() };
	const facet = ( id ) => {
		const entry = ( state.columnFilters || [] ).find( ( f ) => f.id === id );
		return Array.isArray( entry?.value ) ? entry.value : [];
	};

	const statuses = facet( 'status' );
	if ( statuses.length === 1 ) {
		filters.status = statuses[ 0 ];
	}

	// service / staff facet values ARE record identities (`id:<id>` — lib/facet-options.js),
	// so the export threads the record the user actually picked. No name → id lookup: that
	// lookup is exactly what made two same-named services export the wrong one.
	const services = facet( 'service' );
	if ( services.length === 1 ) {
		const serviceId = facetRecordId( services[ 0 ] );
		if ( serviceId ) {
			filters.service_id = serviceId;
		}
	}
	const staffs = facet( 'staff' );
	if ( staffs.length === 1 ) {
		const staffId = facetRecordId( staffs[ 0 ] );
		if ( staffId ) {
			filters.staff_id = staffId;
		}
	}

	// Date-range preset lives as the `date` column's filter value.
	const rangeId = ( state.columnFilters || [] ).find( ( f ) => f.id === 'date' )?.value;
	const bounds = rangeId && rangeId !== 'all' ? DATE_RANGES[ rangeId ] : null;
	if ( bounds?.from && businessTimezone ) {
		filters.from = utcAtTzMidnight( bounds.from, businessTimezone );
		filters.to = utcAtTzMidnight( bounds.to, businessTimezone, 1 ); // exclusive end
	}

	return filters;
}

function BookingActionsMenu( { table, renderIcon, onExport, businessTimezone } ) {
	const [ panel, setPanel ] = useState( null );
	const managerRef = useRef( null );
	const menuRef = useRef( null );
	const openedByKeyboard = useRef( false );
	const isOpen = panel !== null;

	useEffect( () => {
		if ( panel === 'menu' && openedByKeyboard.current ) {
			window.requestAnimationFrame( () => menuRef.current?.querySelector( '[role="menuitem"]' )?.focus() );
		}
		if ( panel === null ) openedByKeyboard.current = false;
	}, [ panel ] );
	const columns = table.getState().columnOrder
		.filter( ( id ) => ! [ 'select', 'action' ].includes( id ) )
		.map( ( id ) => table.getColumn( id ) )
		.filter( ( column ) => column && ! column.columnDef.meta?.filterOnly );
	const sensors = useSensors(
		useSensor( PointerSensor, { activationConstraint: { distance: 5 } } ),
		useSensor( KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates } )
	);

	useEffect( () => {
		if ( ! isOpen ) return undefined;
		const close = ( event ) => {
			if ( ! managerRef.current?.contains( event.target ) ) setPanel( null );
		};
		document.addEventListener( 'pointerdown', close );
		return () => document.removeEventListener( 'pointerdown', close );
	}, [ isOpen ] );

	useEffect( () => {
		if ( ! isOpen ) return undefined;
		const closeOnEscape = ( event ) => {
			if ( event.key === 'Escape' ) {
				if ( panel === 'columns' ) {
					setPanel( 'menu' );
				} else {
					setPanel( null );
					managerRef.current?.querySelector( '.pd-column-trigger' )?.focus();
				}
			}
		};
		document.addEventListener( 'keydown', closeOnEscape );
		return () => document.removeEventListener( 'keydown', closeOnEscape );
	}, [ isOpen, panel ] );

	const reorderColumns = ( { active, over } ) => {
		if ( ! over || active.id === over.id ) return;
		const ids = columns.map( ( column ) => column.id );
		const oldIndex = ids.indexOf( String( active.id ) );
		const newIndex = ids.indexOf( String( over.id ) );
		if ( oldIndex < 0 || newIndex < 0 ) return;
		const reordered = arrayMove( ids, oldIndex, newIndex );
		let managedIndex = 0;
		table.setColumnOrder( table.getState().columnOrder.map( ( id ) => ids.includes( id ) ? reordered[ managedIndex++ ] : id ) );
	};

	return (
		<div className="pd-column-manager" ref={ managerRef }>
			<button
				className="pd-toolbar-export pd-column-trigger pd-table-options-trigger"
				type="button"
				aria-haspopup="menu"
				aria-expanded={ isOpen }
				aria-label="More booking actions"
				title="More booking actions"
				onClick={ ( event ) => {
					openedByKeyboard.current = event.detail === 0;
					setPanel( ( current ) => current ? null : 'menu' );
				} }
			>
				{ renderIcon( 'moreVertical' ) }
			</button>
			{ panel === 'menu' ? (
				<div className="pd-table-actions-popover" role="menu" aria-label="More booking actions" ref={ menuRef } onKeyDown={ menuRovingKeydown }>
					<button type="button" role="menuitem" onClick={ () => setPanel( 'columns' ) }>
						{ renderIcon( 'list' ) }
						<span><strong>Columns</strong></span>
						{ renderIcon( 'chevron' ) }
					</button>
					<div className="pd-table-actions-separator" role="separator" />
					<button type="button" role="menuitem" onClick={ () => {
						onExport?.( exportFiltersFromTable( table, businessTimezone ) );
						setPanel( null );
					} }>
						{ renderIcon( 'csv' ) }
						<span><strong>Export current view</strong></span>
					</button>
				</div>
			) : null }
			{ panel === 'columns' ? (
				<div className="pd-column-popover" role="dialog" aria-label="Booking columns">
					<header><button className="pd-column-back" type="button" aria-label="Back to booking actions" onClick={ () => setPanel( 'menu' ) }>{ renderIcon( 'chevronLeft' ) }</button><span><strong>Columns</strong></span><button type="button" onClick={ () => {
						table.setColumnVisibility( DEFAULT_COLUMN_VISIBILITY );
						table.setColumnOrder( DEFAULT_COLUMN_ORDER );
					} }>Reset</button></header>
					<DndContext collisionDetection={ closestCenter } sensors={ sensors } onDragEnd={ reorderColumns }>
						<SortableContext items={ columns.map( ( column ) => column.id ) } strategy={ verticalListSortingStrategy }>
							<div className="pd-column-list">
								{ columns.map( ( column ) => <SortableColumnOption column={ column } key={ column.id } renderIcon={ renderIcon } /> ) }
							</div>
						</SortableContext>
					</DndContext>
				</div>
			) : null }
		</div>
	);
}

function FilterFacet( { column, data, definition, renderIcon } ) {
	const [ isOpen, setIsOpen ] = useState( false );
	const [ query, setQuery ] = useState( '' );
	const [ draft, setDraft ] = useState( [] );
	const facetRef = useRef( null );
	const searchRef = useRef( null );
	const selected = Array.isArray( column.getFilterValue() ) ? column.getFilterValue() : [];
	// One option per distinct RECORD (or enum value) — see FILTER_DEFINITIONS. Two
	// same-named services are two options with the same label and different identities.
	const options = useMemo( () => facetOptions( definition, data ), [ data, definition ] );
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
			facetRef.current?.querySelector( '.pd-filter-facet-trigger' )?.focus();
		};
		document.addEventListener( 'keydown', closeOnEscape, true );
		return () => document.removeEventListener( 'keydown', closeOnEscape, true );
	}, [ isOpen ] );

	const toggleDraft = ( value ) => {
		setDraft( ( current ) => current.includes( value ) ? current.filter( ( item ) => item !== value ) : [ ...current, value ] );
	};

	return (
		<div className={ `pd-toolbar-popover-wrap pd-filter-facet pd-filter-facet-${ definition.columnId }` } ref={ facetRef }>
			<button
				className={ `pd-filter-facet-trigger${ selected.length ? ' is-active' : '' }` }
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
				<div className="pd-toolbar-popover pd-filter-popover pd-facet-popover" role="dialog" aria-label={ `Filter bookings by ${ definition.label }` }>
					{ showSearch ? <label className="pd-filter-option-search">{ renderIcon( 'search' ) }<input ref={ searchRef } type="search" value={ query } placeholder={ `Search ${ definition.label.toLowerCase() }` } aria-label={ `Search ${ definition.label.toLowerCase() }` } onChange={ ( event ) => setQuery( event.target.value ) } /></label> : null }
					<div className="pd-filter-option-list">
						{ visibleOptions.map( ( option ) => (
							<label className="pd-filter-option" key={ option.value }><input type="checkbox" checked={ draft.includes( option.value ) } onChange={ () => toggleDraft( option.value ) } /><span className="pd-filter-checkbox">{ renderIcon( 'check' ) }</span><span>{ option.label }</span></label>
						) ) }
						{ ! visibleOptions.length ? <p className="pd-filter-no-results">No matching options</p> : null }
					</div>
					<footer><button className="pd-filter-popover-clear" type="button" disabled={ ! draft.length } onClick={ () => setDraft( [] ) }>Clear</button><button className="pd-button primary sm" type="button" onClick={ () => {
						column.setFilterValue( draft.length ? draft : undefined );
						setIsOpen( false );
					} }>Apply</button></footer>
				</div>
			) : null }
		</div>
	);
}

function BookingsToolbar( { data, globalFilter, onExport, onNewBooking, renderIcon, setGlobalFilter, table, businessTimezone } ) {
	const [ filtersOpen, setFiltersOpen ] = useState( false );
	const [ dateOpen, setDateOpen ] = useState( false );
	const dateRef = useRef( null );
	const filterButtonRef = useRef( null );
	const dateColumn = table.getColumn( 'date' );
	const dateRange = dateColumn.getFilterValue() || 'all';
	const selectedDateRange = DATE_RANGES[ dateRange ] || DATE_RANGES.all;
	const activeFilters = FILTER_DEFINITIONS.filter( ( definition ) => {
		const value = table.getColumn( definition.columnId )?.getFilterValue();
		return Array.isArray( value ) && value.length;
	} );
	// Chips read their labels from the facet options, so a record-keyed value (`id:<id>`)
	// still spells out the record's name.
	const filterSummary = ( definition ) => {
		const values = table.getColumn( definition.columnId )?.getFilterValue() || [];
		return facetChipSummary( facetOptions( definition, data ), values );
	};

	useEffect( () => {
		if ( ! dateOpen ) return undefined;
		const close = ( event ) => {
			if ( ! dateRef.current?.contains( event.target ) ) setDateOpen( false );
		};
		document.addEventListener( 'pointerdown', close );
		return () => document.removeEventListener( 'pointerdown', close );
	}, [ dateOpen ] );

	useEffect( () => {
		if ( ! dateOpen ) return undefined;
		const closeOnEscape = ( event ) => {
			if ( event.key !== 'Escape' ) return;
			event.preventDefault();
			event.stopPropagation();
			setDateOpen( false );
			dateRef.current?.querySelector( '.pd-toolbar-control' )?.focus();
		};
		document.addEventListener( 'keydown', closeOnEscape, true );
		return () => document.removeEventListener( 'keydown', closeOnEscape, true );
	}, [ dateOpen ] );

	useEffect( () => {
		const showPending = () => {
			table.getColumn( 'status' )?.setFilterValue( [ 'pending' ] );
			setFiltersOpen( true );
		};
		window.addEventListener( 'aponto:bookings:show-pending', showPending );
		return () => window.removeEventListener( 'aponto:bookings:show-pending', showPending );
	}, [ table ] );

	useEffect( () => {
		if ( ! filtersOpen ) return undefined;
		const closeOnEscape = ( event ) => {
			if ( event.key !== 'Escape' || document.activeElement?.closest( '.pd-facet-popover' ) ) return;
			event.preventDefault();
			setFiltersOpen( false );
			filterButtonRef.current?.focus();
		};
		document.addEventListener( 'keydown', closeOnEscape );
		return () => document.removeEventListener( 'keydown', closeOnEscape );
	}, [ filtersOpen ] );

	return (
		<div className="pd-toolbar">
			<div className="pd-toolbar-main">
				<div className="pd-toolbar-query">
					<label className="pd-search">{ renderIcon( 'search' ) }<input type="search" value={ globalFilter ?? '' } placeholder="Search customer, email or order…" aria-label="Search bookings" onChange={ ( event ) => setGlobalFilter( event.target.value ) } /></label>
					<div className="pd-toolbar-filter-controls">
						<div className="pd-toolbar-control-group pd-toolbar-date-control">
							<div className="pd-toolbar-popover-wrap" ref={ dateRef }>
								<button className="pd-toolbar-control" type="button" aria-haspopup="menu" aria-expanded={ dateOpen } aria-label={ `Date range: ${ selectedDateRange.start ? `${ selectedDateRange.start } to ${ selectedDateRange.end }` : selectedDateRange.fullLabel }` } onClick={ () => setDateOpen( ( open ) => ! open ) }>
									{ renderIcon( 'calendar' ) }
									<span className="pd-date-range-value">
										<span className="pd-date-range-full">{ selectedDateRange.start ? <><span>{ selectedDateRange.start }</span><span className="pd-date-range-arrow">{ renderIcon( 'arrowRight' ) }</span><span>{ selectedDateRange.end }</span></> : selectedDateRange.fullLabel }</span>
										<span className="pd-date-range-compact">{ selectedDateRange.label }</span>
									</span>
									{ renderIcon( 'chevronDown' ) }
								</button>
								{ dateOpen ? <div className="pd-toolbar-popover pd-date-popover" role="menu" aria-label="Date range">{ Object.entries( DATE_RANGES ).map( ( [ id, range ] ) => <button type="button" role="menuitemradio" aria-checked={ dateRange === id } key={ id } onClick={ () => {
									dateColumn.setFilterValue( id === 'all' ? undefined : id );
									setDateOpen( false );
								} }><span><strong>{ range.title }</strong><small>{ range.detail }</small></span><span className="pd-toolbar-menu-check">{ dateRange === id ? renderIcon( 'check' ) : null }</span></button> ) }<div className="pd-toolbar-popover-separator" /><button type="button" onClick={ () => setDateOpen( false ) }><span><strong>Custom range</strong></span>{ renderIcon( 'calendar' ) }</button></div> : null }
							</div>
						</div>
						<button className="pd-toolbar-export pd-toolbar-filter-button" ref={ filterButtonRef } type="button" aria-label={ filtersOpen ? 'Hide booking filters' : 'Show booking filters' } title="Filters" aria-controls="bookingFilterBuilder" aria-expanded={ filtersOpen } onClick={ () => setFiltersOpen( ( open ) => ! open ) }>{ renderIcon( 'sliders' ) }{ activeFilters.length ? <span className="pd-filter-count">{ activeFilters.length }</span> : null }</button>
					</div>
				</div>
				<div className="pd-toolbar-actions">
					<BookingActionsMenu table={ table } renderIcon={ renderIcon } onExport={ onExport } businessTimezone={ businessTimezone } />
					<button className="pd-button primary sm pd-toolbar-new-booking" type="button" onClick={ () => onNewBooking?.() }>{ renderIcon( 'plus' ) }<span>New booking</span></button>
				</div>
			</div>
			{ activeFilters.length && ! filtersOpen ? <div className="pd-active-filters" aria-label="Active booking filters">{ activeFilters.map( ( definition ) => <button className="pd-filter-chip" type="button" key={ definition.columnId } aria-label={ `Remove ${ definition.label } filter` } onClick={ () => table.getColumn( definition.columnId )?.setFilterValue( undefined ) }><span>{ definition.label }</span><strong>{ filterSummary( definition ) }</strong>{ renderIcon( 'close' ) }</button> ) }<button className="pd-clear-filters" type="button" onClick={ () => FILTER_DEFINITIONS.forEach( ( definition ) => table.getColumn( definition.columnId )?.setFilterValue( undefined ) ) }>Clear all</button></div> : null }
			{ filtersOpen ? <div className="pd-filter-builder" id="bookingFilterBuilder" aria-label="Booking filter options"><div className="pd-filter-facets">{ FILTER_DEFINITIONS.map( ( definition ) => <FilterFacet column={ table.getColumn( definition.columnId ) } data={ data } definition={ definition } key={ definition.columnId } renderIcon={ renderIcon } /> ) }</div>{ activeFilters.length ? <button className="pd-clear-filters" type="button" onClick={ () => FILTER_DEFINITIONS.forEach( ( definition ) => table.getColumn( definition.columnId )?.setFilterValue( undefined ) ) }>Clear all</button> : null }</div> : null }
		</div>
	);
}

export function BookingsTable( {
	data,
	initialPreferences = {},
	onPreferencesChange,
	onOpenBooking,
	onBookingAction,
	onStatusChange,
	onBulkDelete,
	onExport,
	onNewBooking,
	onRequestPage,
	onPageSizeChange,
	renderIcon,
	formatMoney,
	businessTimezone = 'America/Los_Angeles',
	totalCount = data.length,
	pageIndex = 0,
	pageSize = 25,
} ) {
	const [ sorting, setSorting ] = useState( initialPreferences.sorting || DEFAULT_SORTING );
	const [ columnVisibility, setColumnVisibility ] = useState( () => ( {
		...DEFAULT_COLUMN_VISIBILITY,
		...initialPreferences.columnVisibility,
		date: false,
		schedule: true,
		customer: true,
	} ) );
	const [ columnOrder, setColumnOrder ] = useState( () => normalizeColumnOrder( initialPreferences.columnOrder ) );
	const [ globalFilter, setGlobalFilter ] = useState( '' );
	const [ columnFilters, setColumnFilters ] = useState( [] );
	const [ rowSelection, setRowSelection ] = useState( {} );
	const [ bulkConfirm, setBulkConfirm ] = useState( false );
	const [ openStatusId, setOpenStatusId ] = useState( null );
	const [ openActionId, setOpenActionId ] = useState( null );
	const [ revision, setRevision ] = useState( 0 );
	// Client-side pagination over the loaded window (server-side search/facets/
	// pagination is the PMDKDataTable swap seam — see Bookings route ripple note).
	const [ pagination, setPagination ] = useState( { pageIndex, pageSize } );
	const currentPageSize = pagination.pageSize;
	const tableData = useMemo( () => [ ...data ], [ data, revision ] );

	useEffect( () => {
		setPagination( { pageIndex: 0, pageSize } );
	}, [ pageSize ] );

	useEffect( () => {
		// Reset to the first page when the filtered/searched set changes.
		setPagination( ( prev ) => ( { ...prev, pageIndex: 0 } ) );
	}, [ globalFilter, columnFilters ] );

	useEffect( () => {
		onPreferencesChange?.( { sorting, columnVisibility, columnOrder } );
	}, [ sorting, columnVisibility, columnOrder, onPreferencesChange ] );

	useEffect( () => {
		const close = ( event ) => {
			if ( openStatusId && ! event.target.closest( '[data-tanstack-status-picker]' ) ) setOpenStatusId( null );
			if ( openActionId && ! event.target.closest( '[data-booking-row-actions]' ) ) setOpenActionId( null );
		};
		document.addEventListener( 'pointerdown', close );
		return () => document.removeEventListener( 'pointerdown', close );
	}, [ openActionId, openStatusId ] );

	const columns = useMemo( () => [
		columnHelper.display( {
			id: 'select',
			size: 36,
			enableHiding: false,
			enableSorting: false,
			header: ( { table } ) => <IndeterminateCheckbox aria-label="Select all visible bookings" checked={ table.getIsAllPageRowsSelected() } indeterminate={ table.getIsSomePageRowsSelected() } onChange={ table.getToggleAllPageRowsSelectedHandler() } />,
			cell: ( { row } ) => <IndeterminateCheckbox aria-label={ `Select booking ${ row.original.order }` } checked={ row.getIsSelected() } disabled={ ! row.getCanSelect() } indeterminate={ row.getIsSomeSelected() } onClick={ ( event ) => event.stopPropagation() } onChange={ row.getToggleSelectedHandler() } />,
		} ),
		columnHelper.accessor( 'id', { header: 'ID', size: 58, enableSorting: true, meta: { label: 'ID' }, cell: ( info ) => <span className="pd-cell-value pd-booking-id">{ info.getValue() }</span> } ),
		columnHelper.accessor( 'start', {
			id: 'schedule',
			header: 'Schedule',
			size: 148,
			enableHiding: false,
			meta: { label: 'Schedule' },
			sortingFn: ( rowA, rowB ) => rowA.original.date.localeCompare( rowB.original.date ) || timeInMinutes( rowA.original.start ) - timeInMinutes( rowB.original.start ),
			cell: ( info ) => {
				const booking = info.row.original;
				const tzLine = customerTimezoneLine( booking, businessTimezone );
				return <span className="pd-schedule-cell"><span className="pd-cell-value pd-time">{ info.getValue() }</span><small title={ tzLine ? `Customer time · ${ booking.timezone }` : undefined }>{ booking.dateLabel }</small>{ tzLine ? <small className="pd-schedule-tz">{ renderIcon( 'clock' ) }<span>{ tzLine }</span></small> : null }</span>;
			},
		} ),
		columnHelper.accessor( 'date', { id: 'date', header: 'Date', size: 100, enableHiding: false, enableSorting: false, meta: { label: 'Date', filterOnly: true }, filterFn: ( row, id, range ) => dateMatchesRange( row.getValue( id ), range ), cell: ( info ) => <span className="pd-cell-value">{ info.row.original.dateLabel }</span> } ),
		columnHelper.accessor( 'customer', { header: 'Customer', size: 140, enableHiding: false, meta: { label: 'Customer' }, cell: ( info ) => <span className="pd-cell-value">{ info.getValue() }</span> } ),
		// The service/staff cells display the NAME; their facets filter on the row's
		// `serviceId`/`staffId` (record identity), never on that name.
		columnHelper.accessor( 'service', { header: 'Service', size: 150, meta: { label: 'Service' }, filterFn: SERVICE_FACET_FILTER, cell: ( info ) => <span className="pd-cell-value">{ info.getValue() }</span> } ),
		columnHelper.accessor( 'location', { header: 'Location', size: 155, meta: { label: 'Location' }, filterFn: inArrayFilter, cell: ( info ) => <span className="pd-cell-value pd-cell-muted">{ info.getValue() }</span> } ),
		columnHelper.accessor( 'staff', { header: 'Staff', size: 105, meta: { label: 'Staff' }, filterFn: STAFF_FACET_FILTER, cell: ( info ) => <span className="pd-cell-value">{ info.getValue() }</span> } ),
		columnHelper.accessor( 'status', {
			header: 'Status',
			size: 160,
			meta: { label: 'Status' },
			filterFn: inArrayFilter,
			cell: ( info ) => {
				const displayedRows = info.table.getRowModel().rows;
				const displayedIndex = displayedRows.findIndex( ( row ) => row.id === info.row.id );
				return <StatusControl booking={ info.row.original } isOpen={ openStatusId === info.row.original.id } opensUp={ statusMenuOpensUp( displayedIndex, displayedRows.length ) } onOpenChange={ ( id ) => {
					setOpenActionId( null );
					setOpenStatusId( id );
				} } onStatusChange={ ( booking, status ) => {
					onStatusChange?.( booking, status );
					setRevision( ( value ) => value + 1 );
				} } renderIcon={ renderIcon } />;
			},
		} ),
		columnHelper.accessor( 'total', { header: 'Total', size: 75, meta: { label: 'Total' }, cell: ( info ) => <span className="pd-cell-value">{ formatMoney( info.getValue(), info.row.original ) }</span> } ),
		// The SAME badge the booking editor's Order section renders (`lib/payment-status.js`), minus
		// the hold deadline: the list item carries no `hold_expires_at` (rest-contract §2.8), and a
		// badge that invented one would be a promise the row cannot keep.
		columnHelper.accessor( 'paymentStatus', {
			id: 'payment',
			header: __( 'Payment', 'aponto' ),
			size: 118,
			// `meta.label` is what the Columns picker prints, so it needs the same translated
			// string the header does — a picker row reading "Payment" beside a translated column
			// header is the kind of half-localized surface that looks like a bug.
			meta: { label: __( 'Payment', 'aponto' ) },
			filterFn: inArrayFilter,
			cell: ( info ) => {
				const badge = paymentBadge( info.getValue() );

				return <span className={ `pd-status ap-pay-${ badge.tone }` } title={ badge.title }>{ badge.label }</span>;
			},
		} ),
		columnHelper.accessor( 'email', { header: 'Email', size: 155, meta: { label: 'Email' }, cell: ( info ) => <span className="pd-cell-value pd-cell-muted">{ info.getValue() }</span> } ),
		columnHelper.display( {
			id: 'action',
			size: 64,
			enableHiding: false,
			enableSorting: false,
			header: 'Action',
			cell: ( info ) => {
				const displayedRows = info.table.getRowModel().rows;
				const displayedIndex = displayedRows.findIndex( ( row ) => row.id === info.row.id );
				return <BookingRowActions booking={ info.row.original } isOpen={ openActionId === info.row.original.id } opensUp={ statusMenuOpensUp( displayedIndex, displayedRows.length ) } onOpenChange={ ( id ) => {
					setOpenStatusId( null );
					setOpenActionId( id );
				} } onAction={ ( booking, action ) => {
					if ( action === 'view' ) onOpenBooking?.( booking.id );
					else if ( action === 'confirm' || action === 'complete' || action === 'restore' ) {
						onStatusChange?.( booking, action === 'confirm' ? 'confirmed' : action === 'complete' ? 'completed' : 'pending' );
						setRevision( ( value ) => value + 1 );
					} else onBookingAction?.( booking, action );
				} } renderIcon={ renderIcon } />;
			},
		} ),
	], [ businessTimezone, formatMoney, onBookingAction, onOpenBooking, onStatusChange, openActionId, openStatusId, pageIndex, currentPageSize, renderIcon, revision ] );

	const table = useReactTable( {
		data: tableData,
		columns,
		state: { sorting, columnVisibility, columnOrder, globalFilter, columnFilters, rowSelection, pagination },
		onSortingChange: setSorting,
		onColumnVisibilityChange: setColumnVisibility,
		onColumnOrderChange: setColumnOrder,
		onGlobalFilterChange: setGlobalFilter,
		onColumnFiltersChange: setColumnFilters,
		onRowSelectionChange: setRowSelection,
		onPaginationChange: setPagination,
		globalFilterFn: bookingGlobalFilter,
		getColumnCanGlobalFilter: ( column ) => column.id === 'customer',
		getRowId: ( row ) => String( row.id ),
		enableRowSelection: true,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	} );
	const rows = table.getRowModel().rows;
	const selectedRows = table.getFilteredSelectedRowModel().rows;
	const visibleColumns = table.getVisibleLeafColumns();
	const filteredCount = table.getFilteredRowModel().rows.length;
	const firstVisible = pagination.pageIndex * currentPageSize + ( rows.length ? 1 : 0 );
	const lastVisible = pagination.pageIndex * currentPageSize + rows.length;

	const applyBulkDelete = () => {
		const selectedBookings = selectedRows.map( ( row ) => row.original );
		if ( ! selectedBookings.length ) return;
		onBulkDelete?.( selectedBookings );
		setBulkConfirm( false );
		setRowSelection( {} );
		setRevision( ( value ) => value + 1 );
	};
	const toggleBulkSelection = ( event ) => {
		const selectAll = event.target.checked;
		table.toggleAllPageRowsSelected( selectAll );
		if ( ! selectAll ) requestAnimationFrame( () => document.querySelector( '#bookingsTableRoot thead .pd-table-checkbox' )?.focus( { preventScroll: true } ) );
	};

	return (
		<>
			<BookingsToolbar data={ tableData } globalFilter={ globalFilter } onExport={ onExport } onNewBooking={ onNewBooking } renderIcon={ renderIcon } setGlobalFilter={ setGlobalFilter } table={ table } businessTimezone={ businessTimezone } />
			{ rows.length ? (
				<>
					<div className="pd-table-wrap">
						<table className="pd-table" style={ { minWidth: table.getTotalSize() } }>
							<colgroup>{ visibleColumns.map( ( column ) => <col key={ column.id } style={ { width: column.getSize() } } /> ) }</colgroup>
							<thead>
								{ selectedRows.length ? (
									<tr className="pd-bulk-row">
										<th className="pd-col-select" scope="col" data-column="select"><IndeterminateCheckbox aria-label={ table.getIsAllPageRowsSelected() ? 'Unselect all visible bookings' : 'Select all visible bookings' } checked={ table.getIsAllPageRowsSelected() } indeterminate={ table.getIsSomePageRowsSelected() } onChange={ toggleBulkSelection } /></th>
										<th className="pd-bulk-bar-cell" colSpan={ Math.max( 1, visibleColumns.length - 1 ) }><div className="pd-bulk-bar" role="toolbar" aria-label="Bulk booking actions">{ bulkConfirm ? <><strong>Delete { selectedRows.length } booking{ selectedRows.length === 1 ? '' : 's' }?</strong><span>Orders are removed; an activity record is kept.</span><div className="pd-bulk-actions"><button type="button" onClick={ () => setBulkConfirm( false ) }>Keep</button><button className="is-danger" type="button" onClick={ applyBulkDelete }>Delete bookings</button></div></> : <><strong>{ selectedRows.length } selected</strong><div className="pd-bulk-actions"><button className="is-danger" type="button" aria-label="Delete selected bookings" onClick={ () => setBulkConfirm( true ) }>Delete bookings</button></div></> }<button className="pd-bulk-clear" type="button" aria-label="Clear selection" onClick={ () => { setBulkConfirm( false ); setRowSelection( {} ); } }>{ renderIcon( 'close' ) }</button></div></th>
									</tr>
								) : table.getHeaderGroups().map( ( headerGroup ) => (
									<tr key={ headerGroup.id }>
										{ headerGroup.headers.map( ( header ) => {
											const sorted = header.column.getIsSorted();
											return (
												<th className={ header.column.id === 'select' ? 'pd-col-select' : header.column.id === 'action' ? 'pd-col-action' : undefined } scope="col" data-column={ header.column.id } aria-sort={ sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined } key={ header.id }>
													{ header.isPlaceholder ? null : header.column.getCanSort() ? (
														<button className={ `pd-sort-button${ sorted ? ` is-active is-${ sorted }` : '' }` } type="button" onClick={ header.column.getToggleSortingHandler() }>
															<span>{ flexRender( header.column.columnDef.header, header.getContext() ) }</span>{ renderIcon( 'chevronDown' ) }
														</button>
													) : flexRender( header.column.columnDef.header, header.getContext() ) }
												</th>
											);
										} ) }
									</tr>
								) ) }
							</thead>
							<tbody>
								{ rows.map( ( row ) => (
									<tr className={ row.getIsSelected() ? 'is-selected' : undefined } data-booking-id={ row.original.id } tabIndex="0" aria-label={ `Open booking ${ row.original.order } for ${ row.original.customer }` } aria-selected={ row.getIsSelected() } key={ row.id } onClick={ ( event ) => {
										if ( event.target.closest( 'button,input,a,select,textarea,[role="menu"]' ) ) return;
										onOpenBooking?.( row.original.id );
									} } onKeyDown={ ( event ) => {
										if ( event.target === event.currentTarget && ( event.key === 'Enter' || event.key === ' ' ) ) {
											event.preventDefault();
											onOpenBooking?.( row.original.id );
										}
									} }>
										{ row.getVisibleCells().map( ( cell ) => <td className={ cell.column.id === 'select' ? 'pd-col-select' : cell.column.id === 'action' ? 'pd-col-action' : cell.column.id === 'total' ? 'pd-amount' : undefined } data-column={ cell.column.id } key={ cell.id }>{ flexRender( cell.column.columnDef.cell, cell.getContext() ) }</td> ) }
									</tr>
								) ) }
							</tbody>
						</table>
					</div>
					<div className="pd-mobile-list">
						{ rows.map( ( row ) => {
							const booking = row.original;
							return <button className="pd-mobile-booking" type="button" data-booking-id={ booking.id } key={ row.id } onClick={ () => onOpenBooking?.( booking.id ) }><span className="pd-mobile-booking-time"><strong>{ booking.start }</strong><span>{ booking.dateLabel }</span></span><span className="pd-mobile-booking-copy"><span className="pd-primary">{ booking.customer }</span><span className="pd-secondary">{ booking.service }</span><span className={ `pd-status ${ booking.status }` }>{ renderIcon( STATUS_ICONS[ booking.status ] ) }<span>{ STATUS_LABELS[ booking.status ] }</span></span></span>{ renderIcon( 'chevron' ) }</button>;
						} ) }
					</div>
				</>
			) : ( ( globalFilter || '' ).trim() || columnFilters.length ? (
					// Filters/search active and nothing matched (fleet-r1 U2 FB9): say WHY the list
					// is empty and offer one-click recovery instead of a dead "no bookings" state.
					<div className="pd-empty">
						{ renderIcon( 'search' ) }
						<h2>No results match your filters</h2>
						<p>Clear the search and filters to see all bookings.</p>
						<button className="pmdk-button sm" type="button" onClick={ () => { setGlobalFilter( '' ); table.resetColumnFilters(); } }>Clear filters</button>
					</div>
				) : (
					<div className="pd-empty">{ renderIcon( 'search' ) }<h2>No bookings found</h2><p>Try a different customer, service or status.</p></div>
				) ) }
			<footer className="pd-pagination">
				<span>Showing { firstVisible }–{ lastVisible } of { filteredCount } bookings</span>
				<div className="pd-pagination-tools">
					<label className="pd-pagination-size">Rows per page <select value={ currentPageSize } aria-label="Booking rows per page" onChange={ ( event ) => {
						const nextPageSize = Number( event.target.value );
						table.setPageSize( nextPageSize );
						onPageSizeChange?.( nextPageSize );
					} }><option value="25">25</option><option value="50">50</option><option value="100">100</option></select></label>
					<div className="pd-page-controls">
						<button type="button" disabled={ ! table.getCanPreviousPage() } aria-label="Previous page" onClick={ () => { table.previousPage(); onRequestPage?.( table.getState().pagination.pageIndex ); } }>{ renderIcon( 'chevronLeft' ) }</button>
						<button type="button" disabled={ ! table.getCanNextPage() } aria-label="Next page" onClick={ () => { table.nextPage(); onRequestPage?.( table.getState().pagination.pageIndex ); } }>{ renderIcon( 'chevron' ) }</button>
					</div>
				</div>
			</footer>
		</>
	);
}

export const bookingsTableDefaults = {
	columnOrder: DEFAULT_COLUMN_ORDER,
	sorting: DEFAULT_SORTING,
};

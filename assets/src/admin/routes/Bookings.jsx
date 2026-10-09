/**
 * Bookings route (SPEC-P1 §1.4). Flat operational list (reused TanStack
 * BookingsTable) + the in-flow booking editor in a two-column push workspace
 * (no backdrop/body-lock/focus-trap; the list stays interactive). Server data via
 * GET /bookings; status/reschedule/paid/delete/create wired to REST.
 */
import { __ } from '@wordpress/i18n';
import { externalSyncNotice } from '../lib/external-order-sync.js';
import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { api } from '../lib/api.js';
import { config } from '../lib/config.js';
import { money, toUtcInstant } from '../lib/format.js';
import { bookingRowFromListItem } from '../lib/booking-adapter.js';
import { fetchLocations, locationLabel } from '../lib/branches.js';
import { renderIcon } from '../lib/icon.jsx';
import { PageHeader, RouteLoading, RouteError } from '../lib/ui.jsx';
import { useToast } from '../lib/toast.jsx';
import { useConfirmDialog } from '../lib/confirm.jsx';
import { BookingsTable, isDefaultColumnLayout } from '../bookings/BookingsTable.jsx';
import { bookingsTableLayout, flushBookingsTableLayout, saveBookingsTableLayout } from '../lib/table-preferences.js';
import { lazySurface } from '../lib/lazy.jsx';
import { statusToast, statusTone } from '../lib/notification-outcome.js';
import { MIN_W, useInspectorWidth } from '../lib/inspector-width.js';
import { bookingRouteId } from '../lib/router.js';

// The inspector is a SECOND paint, always behind a click on a row (or a cross-route
// "open this booking"), so it is a chunk rather than entry bytes — the list itself is
// the first-paint surface and stays whole. Admin bundle budget, AGENTS §6.
const BookingEditor = lazySurface(
	() => import( /* webpackChunkName: "admin-chunk-booking-editor" */ './BookingEditor.jsx' ),
	{ pick: 'BookingEditor', label: 'Loading booking' }
);

// Copy for the two forceable-422 transitions (SPEC-P1 §1.4 + D-R33). They share ONE dialog
// shape because they share one server rule — a legal move whose time hasn't come — and differ
// only in which instant is early and what the button says.
const PREMATURE = {
	completed: {
		title: ( name ) => `${ name }'s appointment hasn't ended yet.`,
		message: 'Force-complete it now? This is recorded in the activity log.',
		confirmText: 'Force-complete',
		declined: 'Not completed — the appointment hasn\'t ended yet.',
	},
	no_show: {
		title: ( name ) => `${ name }'s appointment hasn't started yet.`,
		message: 'Mark it as a no-show anyway? This is recorded in the activity log.',
		confirmText: 'Mark as no-show',
		declined: 'Not marked — the appointment hasn\'t started yet.',
	},
};

// The booking editor shares the in-flow inspector's width rules with every other route
// (lib/inspector-width.js): one stored preference per route, one viewport-aware clamp. This file
// used to carry its own copy — with a different 344px floor — so a fix to one never reached the other.
const WIDTH_KEY = 'aponto.admin.booking-inspector-width.v1';

/** Re-read the ledger before offering collection from a possibly stale list row. */
export async function confirmCompletionBalance( booking, confirm ) {
	if ( ! ( booking.payableNowMinor > 0 && booking.payableNowMinor < booking.total ) ) return true;
	const { order } = await api.get( `/bookings/${ booking.id }` );
	if ( ! order || order.balance_due_minor <= 0 ) return true;
	const transactions = order.transactions || [];
	const canRecord = order.can_record_onsite_balance ?? ( order.payment_status === 'partial'
		&& order.payable_now_minor > 0 && order.payable_now_minor < order.total_minor
		&& ! transactions.some( ( t ) => ( t.kind === 'onsite' && t.status === 'succeeded' ) || ( t.kind === 'refund' && t.status === 'pending' ) ) );
	const accepted = await confirm( {
		title: __( 'A balance is still due.', 'aponto' ),
		message: canRecord ? __( 'Record the balance if you collected it on site.', 'aponto' ) : __( 'The balance cannot be recorded in the current payment state.', 'aponto' ),
		confirmText: canRecord ? __( 'Record balance paid on site', 'aponto' ) : __( 'Continue without recording', 'aponto' ),
		cancelText: canRecord ? __( 'Continue without recording', 'aponto' ) : __( 'Cancel', 'aponto' ),
	} );
	if ( accepted && canRecord ) await api.post( `/bookings/${ booking.id }/balance`, {} );
	return canRecord || !! accepted;
}

/**
 * How an editor leaves (D-R63 fix rounds 3–4): a New booking opened from a Calendar slot carries
 * `prefill.returnTo`, and EVERY way out of it — Save, Cancel, × — goes back there; any other editor
 * just closes.
 *
 * @param {?Object}  editor      The open editor state (`{ mode, prefill, … }`).
 * @param {Function} closeEditor Close the inspector.
 * @return {Function} The editor's `onClose`.
 */
export function editorExit( editor, closeEditor ) {
	const back = editor?.prefill?.returnTo;
	if ( ! back ) {
		return closeEditor;
	}
	return () => {
		closeEditor();
		window.location.hash = `#${ back }`;
	};
}

export function Bookings( { segments = [] } ) {
	const showToast = useToast();
	const { confirm, dialog } = useConfirmDialog();
	const [ state, setState ] = useState( { loading: true, error: null, rows: [], total: 0 } );
	const [ editor, setEditor ] = useState( null ); // { mode, id, row, action, prefill }
	const { width, maxWidth, stacked, resizing, workspaceRef, startResize, keyResize } = useInspectorWidth( WIDTH_KEY );

	const load = useCallback( () => {
		setState( ( s ) => ( { ...s, loading: s.rows.length === 0, error: null } ) );
		const from = toUtcInstant( Date.now() - 60 * 86400000 );
		const to = toUtcInstant( Date.now() + 120 * 86400000 );
		// D-R74: the list asks for newest-created first, so when the window holds more than the
		// 100 rows fetched, the ones kept are the latest bookings to come in. Only this route sends
		// `order_by`; Calendar and Dashboard keep the route's start-time default.
		api.get( '/bookings', { status: 'all', from, to, per_page: 100, order_by: 'created' } )
			.then( ( res ) => setState( {
				loading: false,
				error: null,
				rows: ( res.items || [] ).map( bookingRowFromListItem ),
				total: Number( res.total ) || ( res.items || [] ).length,
			} ) )
			.catch( ( err ) => setState( { loading: false, error: err.message, rows: [], total: 0 } ) );
	}, [] );

	useEffect( load, [ load ] );

	// STICKY INSPECTOR GEOMETRY (founder QA 2026-10-01). The page scrolls in the WINDOW (`.ap-admin`
	// only clips), so the stylesheet's fixed `top: 0` slid the panel under WordPress's fixed admin
	// bar, and its fixed `calc(100dvh - 144px)` height left the footer floating ~112px above the
	// viewport bottom once the panel stuck. Measure instead: stick just below a FIXED admin bar, and
	// size the panel from where it actually starts to the visible bottom (InflowWorkspace does the
	// same for module pages).
	const inspectorRef = useRef( null );
	const [ inspectorGeometry, setInspectorGeometry ] = useState( null );
	const measureInspector = useCallback( () => {
		const node = inspectorRef.current;
		if ( ! editor || ! node ) {
			return;
		}
		const bar = document.getElementById( 'wpadminbar' );
		const stickyTop = bar && 'fixed' === window.getComputedStyle( bar ).position ? bar.offsetHeight : 0;
		const visual = window.visualViewport;
		const viewportBottom = ( visual?.offsetTop || 0 ) + ( visual?.height || window.innerHeight );
		const top = Math.max( stickyTop, node.getBoundingClientRect().top );
		const height = Math.max( 240, Math.floor( viewportBottom - top ) );
		setInspectorGeometry( ( previous ) => ( previous && previous.top === stickyTop && previous.height === height
			? previous
			: { top: stickyTop, height } ) );
	}, [ editor ] );
	useLayoutEffect( () => {
		if ( ! editor ) {
			return undefined;
		}
		measureInspector();
		window.addEventListener( 'resize', measureInspector );
		window.addEventListener( 'scroll', measureInspector, true );
		window.visualViewport?.addEventListener( 'resize', measureInspector );
		return () => {
			window.removeEventListener( 'resize', measureInspector );
			window.removeEventListener( 'scroll', measureInspector, true );
			window.visualViewport?.removeEventListener( 'resize', measureInspector );
		};
	}, [ editor, measureInspector ] );
	// The Columns menu's choices follow the operator (D-R74, rest-contract §2.23). BookingsTable
	// reports its layout on mount too, so the first report of each mount is only the baseline; after
	// that, a layout that actually changed is saved. Sorting rides the same callback and is not saved.
	const lastLayout = useRef( null );
	const onPreferencesChange = useCallback( ( { columnVisibility, columnOrder } ) => {
		const key = JSON.stringify( [ columnVisibility, columnOrder ] );
		if ( null === lastLayout.current || key === lastLayout.current ) {
			lastLayout.current = key;
			return;
		}
		lastLayout.current = key;
		// A failed save stays silent (DESIGN-SYSTEM §"Persistent workspace preferences"): the
		// columns on screen are already right, only the next visit would miss them.
		saveBookingsTableLayout( { columnVisibility, columnOrder }, isDefaultColumnLayout( { columnVisibility, columnOrder } ) );
	}, [] );
	// Leaving the route inside the debounce window still saves the last change.
	useEffect( () => flushBookingsTableLayout, [] );

	// D-R63: the location catalog names the rows' `locationId` for the Location column + facet. ALL
	// statuses — a booking at an archived branch is still at that branch. With no location at all
	// (Free, or a Premium site that never created one) the rows keep `location: ''`, so the column
	// and facet are exactly what they were before.
	const [ locations, setLocations ] = useState( [] );
	useEffect( () => {
		let live = true;
		fetchLocations().then( ( { items } ) => { if ( live && items.length ) setLocations( items ); } );
		return () => { live = false; };
	}, [] );
	const rows = useMemo(
		() => ( locations.length ? state.rows.map( ( row ) => ( { ...row, location: locationLabel( locations, row.locationId ) } ) ) : state.rows ),
		[ state.rows, locations ]
	);

	// Cross-route "New booking" (Dashboard / Calendar). A calendar free-slot click
	// carries a prefill { date, startUtc } for the create schedule.
	useEffect( () => {
		const pending = window.__apontoPendingCreate;
		if ( pending ) {
			window.__apontoPendingCreate = false;
			setEditor( { mode: 'create', prefill: typeof pending === 'object' ? pending : null } );
		}
	}, [] );

	// Cross-route "open this booking" (from Calendar) once rows are available.
	useEffect( () => {
		const id = window.__apontoPendingOpenId;
		if ( id && state.rows.length ) {
			window.__apontoPendingOpenId = null;
			const row = state.rows.find( ( r ) => r.id === id );
			if ( row ) {
				setEditor( { mode: 'edit', id, row } );
			}
		}
	}, [ state.rows ] );

	// `#bookings/{id}` opens THAT booking (persona QA 2026-10-05) — the link in the staff mails
	// (`{admin_booking_link}`) and on an external order. The list holds a window of 100 rows, so a
	// booking outside it is fetched by id (`GET /bookings?id=`, the same list item the rows are
	// made of — the drawer needs its customer and service names). The hash SEEDS the drawer, like
	// `#services/{id}`: once per id, after the list has loaded, and never over an open editor's
	// own navigation — closing the drawer moves the hash back to the list (below).
	const deepLinkId = bookingRouteId( segments );
	const openedDeepLink = useRef( 0 );
	useEffect( () => {
		if ( ! deepLinkId ) {
			openedDeepLink.current = 0;
			return undefined;
		}
		if ( openedDeepLink.current === deepLinkId || state.loading ) {
			return undefined;
		}
		openedDeepLink.current = deepLinkId;
		const row = state.rows.find( ( r ) => r.id === deepLinkId );
		if ( row ) {
			setEditor( { mode: 'edit', id: deepLinkId, row } );
			return undefined;
		}
		let live = true;
		api.get( '/bookings', { status: 'all', id: deepLinkId, per_page: 1 } )
			.then( ( res ) => {
				if ( ! live ) {
					return;
				}
				const item = ( res.items || [] )[ 0 ];
				if ( item ) {
					setEditor( { mode: 'edit', id: deepLinkId, row: bookingRowFromListItem( item ) } );
				} else {
					showToast( `Booking #${ deepLinkId } was not found.`, 'danger' );
				}
			} )
			.catch( ( err ) => { if ( live ) showToast( err.message || 'Could not open the booking.', 'danger' ); } );
		return () => { live = false; };
	}, [ deepLinkId, state.loading, state.rows, showToast ] );

	const openEdit = ( id ) => {
		const row = state.rows.find( ( r ) => r.id === id ) || null;
		setEditor( { mode: 'edit', id, row } );
	};
	const closeEditor = () => {
		setEditor( null );
		// Leave a `#bookings/{id}` deep link with its drawer, so the same link opens it again.
		if ( bookingRouteId( window.location.hash.replace( /^#/, '' ).split( '/' ).filter( Boolean ) ) ) {
			window.location.hash = 'bookings';
		}
	};

	const onStatusChange = async ( booking, next, extra = {} ) => {
		try {
			if ( next === 'completed' && ! await confirmCompletionBalance( booking, confirm ) ) return;
			const res = await api.patch( `/bookings/${ booking.id }`, { status: next, notify: true, ...extra } );
			const syncNotice = externalSyncNotice( res?.external_order );
			showToast( syncNotice || statusToast( booking.customer, next, res?.notification ), syncNotice ? 'default' : statusTone( next ) );
			load();
			// The drawer holds its own copy of the booking: when the row it shows changed from the
			// table, re-open it on fresh data instead of leaving a stale status in the form.
			setEditor( ( current ) => ( current && current.mode === 'edit' && current.id === booking.id
				? { ...current, action: undefined, rev: ( current.rev || 0 ) + 1 }
				: current ) );
		} catch ( err ) {
			// Premature complete (422 aponto_invalid_transition, SPEC-P1 §1.4) and premature
			// no-show (D-R33, the same escape keyed on start_utc): the appointment has not ended /
			// not started yet — offer the force confirm + reason instead of a dead error,
			// mirroring the BookingEditor's force flow (fleet-r1 U2 F3).
			const premature = PREMATURE[ next ];
			if ( premature && err.code === 'aponto_invalid_transition' && err.status === 422 && ! extra.force ) {
				// In-app modal + optional reason (C13), replacing native confirm/prompt. `confirm`
				// resolves to false on cancel, or the reason string (possibly '') on confirm.
				const reason = await confirm( {
					title: premature.title( booking.customer ),
					message: premature.message,
					confirmText: premature.confirmText,
					prompt: 'reason',
					promptLabel: 'Reason (optional, recorded in the activity log)',
					promptPlaceholder: 'Reason (optional)',
				} );
				if ( reason !== false ) {
					await onStatusChange( booking, next, { force: true, reason: reason || '' } );
					return;
				}
				showToast( premature.declined );
				load();
				return;
			}
			showToast( err.message || 'Could not update the booking status.', 'danger' );
			load();
		}
	};

	const onBookingAction = async ( booking, action ) => {
		if ( action === 'reschedule' ) {
			setEditor( { mode: 'edit', id: booking.id, row: booking, action: 'reschedule' } );
		} else if ( action === 'cancel' ) {
			setEditor( { mode: 'edit', id: booking.id, row: booking, action: 'cancel' } );
		} else if ( action === 'no-show' ) {
			// Confirm before recording an absence (it emails the customer when the template is
			// on, and it is the kind of note a customer will dispute), but do NOT ask for a
			// reason: the row action is only offered once the start has passed, so the server
			// takes it without `force` and there is nothing to justify.
			const ok = await confirm( {
				title: `Mark ${ booking.customer } as a no-show?`,
				message: 'The appointment stays on the calendar and is left out of today\'s booked value. You can undo this.',
				confirmText: 'Mark as no-show',
			} );
			if ( ok !== false ) {
				await onStatusChange( booking, 'no_show' );
			}
		} else if ( action === 'undo-no-show' ) {
			await onStatusChange( booking, 'confirmed' );
		}
	};

	const onBulkDelete = async ( selected ) => {
		let ok = 0;
		for ( const b of selected ) {
			try {
				await api.del( `/bookings/${ b.id }` ); // eslint-disable-line no-await-in-loop
				ok += 1;
			} catch ( e ) { /* continue; report count */ }
		}
		if ( editor && selected.some( ( b ) => b.id === editor.id ) ) {
			closeEditor();
		}
		showToast( `${ ok } booking${ ok === 1 ? '' : 's' } deleted · activity kept.` );
		load();
	};

	const onExport = ( filters = {} ) => {
		// Server CSV export (SPEC-P1 §5): a nonce'd navigation downloads the BOM +
		// formula-escaped body from GET /export/bookings.csv (assembled server-side —
		// raw verbatim response, not constant-memory streaming; rest-contract §2.14).
		// The live view filters — status, service, staff, date range, search — are
		// threaded through so the export matches the current view (no client-side
		// CSV generation). Gap notes live in exportFiltersFromTable (BookingsTable).
		const base = config.restUrl.replace( /\/$/, '' );
		const params = new URLSearchParams( { status: filters.status || 'all' } );
		for ( const key of [ 'service_id', 'staff_id', 'from', 'to', 'search' ] ) {
			if ( filters[ key ] ) {
				params.set( key, String( filters[ key ] ) );
			}
		}
		// `0` is a real location filter ("No location", D-R63), so it cannot ride the truthy loop.
		if ( Number.isInteger( filters.location_id ) ) {
			params.set( 'location_id', String( filters.location_id ) );
		}
		params.set( '_wpnonce', config.nonce );
		window.open( `${ base }/export/bookings.csv?${ params.toString() }`, '_blank', 'noopener' );
	};

	let content;
	if ( state.loading ) {
		content = <RouteLoading label="Loading bookings" />;
	} else if ( state.error ) {
		content = <RouteError message={ state.error } onRetry={ load } />;
	} else {
		content = (
			<BookingsTable
				data={ rows }
				totalCount={ rows.length }
				initialPreferences={ bookingsTableLayout() }
				onPreferencesChange={ onPreferencesChange }
				pageSize={ 25 }
				renderIcon={ renderIcon }
				formatMoney={ ( minor, bookingRow ) => money( minor, bookingRow?.currency || config.currency, bookingRow?.currencyExponent ?? null ) }
				businessTimezone={ config.business.timezone }
				hasLocations={ locations.length > 0 }
				onOpenBooking={ openEdit }
				onBookingAction={ onBookingAction }
				onStatusChange={ onStatusChange }
				onBulkDelete={ onBulkDelete }
				onNewBooking={ () => setEditor( { mode: 'create' } ) }
				onExport={ onExport }
			/>
		);
	}

	return (
		<div className="pd-page pd-bookings-page">
			<div
				ref={ workspaceRef }
				className={ `pd-bookings-workspace${ editor ? ' is-inspecting' : '' }${ resizing ? ' is-resizing' : '' }` }
				style={ {
					'--pd-booking-inspector-width': `${ width }px`,
					...( editor && inspectorGeometry && ! stacked ? {
						'--pd-booking-inspector-sticky-top': `${ inspectorGeometry.top }px`,
						'--pd-booking-inspector-height': `${ inspectorGeometry.height }px`,
					} : {} ),
				} }
			>
				<div className="pd-bookings-main">
					<PageHeader title="Bookings" />
					<section className="pd-bookings-list pd-data-list" aria-label="Bookings list">
						<div className="pd-tanstack-bookings" id="bookingsTableRoot">{ content }</div>
						{ ! state.loading && ! state.error && state.total > state.rows.length ? (
							<p className="ap-list-note" role="status">
								Showing the first { state.rows.length } of { state.total } bookings in this window — narrow the date range or search to find the rest.
							</p>
						) : null }
					</section>
				</div>
				<div
					className="pd-inflow-resizer"
					role="separator"
					aria-orientation={ stacked ? 'horizontal' : 'vertical' }
					aria-label="Resize booking editor"
					aria-valuemin={ stacked ? undefined : MIN_W }
					aria-valuemax={ stacked ? undefined : maxWidth }
					aria-valuenow={ stacked ? undefined : width }
					aria-disabled={ stacked ? true : undefined }
					tabIndex={ editor && ! stacked ? 0 : -1 }
					hidden={ ! editor }
					onPointerDown={ stacked ? undefined : startResize }
					onKeyDown={ stacked ? undefined : keyResize }
				>
					<span aria-hidden="true">{ width }px</span>
				</div>
				<aside ref={ inspectorRef } className="pd-booking-inspector" id="bookingInspector" aria-labelledby="bookingInspectorTitle" hidden={ ! editor }>
					{ editor ? (
						<BookingEditor
							key={ `${ editor.mode }-${ editor.id || 'new' }-${ editor.action || '' }-${ editor.rev || 0 }` }
							mode={ editor.mode }
							bookingId={ editor.id }
							row={ editor.row }
							initialAction={ editor.action }
							prefill={ editor.prefill }
							onClose={ editorExit( editor, closeEditor ) }
							onChanged={ load }
						/>
					) : null }
				</aside>
			</div>
			{ dialog }
		</div>
	);
}

/**
 * Bookings route (SPEC-P1 §1.4). Flat operational list (reused TanStack
 * BookingsTable) + the in-flow booking editor in a two-column push workspace
 * (no backdrop/body-lock/focus-trap; the list stays interactive). Server data via
 * GET /bookings; status/reschedule/paid/delete/create wired to REST.
 */
import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';
import { config } from '../lib/config.js';
import { money, toUtcInstant } from '../lib/format.js';
import { bookingRowFromListItem } from '../lib/booking-adapter.js';
import { renderIcon } from '../lib/icon.jsx';
import { PageHeader, RouteLoading, RouteError } from '../lib/ui.jsx';
import { useToast } from '../lib/toast.jsx';
import { useConfirmDialog } from '../lib/confirm.jsx';
import { BookingsTable } from '../bookings/BookingsTable.jsx';
import { lazySurface } from '../lib/lazy.jsx';
import { statusToast } from '../lib/notification-outcome.js';
import { MIN_W, useInspectorWidth } from '../lib/inspector-width.js';

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

export function Bookings() {
	const showToast = useToast();
	const { confirm, dialog } = useConfirmDialog();
	const [ state, setState ] = useState( { loading: true, error: null, rows: [], total: 0 } );
	const [ editor, setEditor ] = useState( null ); // { mode, id, row, action, prefill }
	const { width, maxWidth, stacked, resizing, workspaceRef, startResize, keyResize } = useInspectorWidth( WIDTH_KEY );

	const load = useCallback( () => {
		setState( ( s ) => ( { ...s, loading: s.rows.length === 0, error: null } ) );
		const from = toUtcInstant( Date.now() - 60 * 86400000 );
		const to = toUtcInstant( Date.now() + 120 * 86400000 );
		api.get( '/bookings', { status: 'all', from, to, per_page: 100 } )
			.then( ( res ) => setState( {
				loading: false,
				error: null,
				rows: ( res.items || [] ).map( bookingRowFromListItem ),
				total: Number( res.total ) || ( res.items || [] ).length,
			} ) )
			.catch( ( err ) => setState( { loading: false, error: err.message, rows: [], total: 0 } ) );
	}, [] );

	useEffect( load, [ load ] );

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

	const openEdit = ( id ) => {
		const row = state.rows.find( ( r ) => r.id === id ) || null;
		setEditor( { mode: 'edit', id, row } );
	};
	const closeEditor = () => setEditor( null );

	const onStatusChange = async ( booking, next, extra = {} ) => {
		try {
			const res = await api.patch( `/bookings/${ booking.id }`, { status: next, notify: true, ...extra } );
			showToast( statusToast( booking.customer, next, res?.notification ) );
			load();
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
				data={ state.rows }
				totalCount={ state.rows.length }
				pageSize={ 25 }
				renderIcon={ renderIcon }
				formatMoney={ ( minor, bookingRow ) => money( minor, bookingRow?.currency || config.currency, bookingRow?.currencyExponent ?? null ) }
				businessTimezone={ config.business.timezone }
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
				style={ { '--pd-booking-inspector-width': `${ width }px` } }
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
				<aside className="pd-booking-inspector" id="bookingInspector" aria-labelledby="bookingInspectorTitle" hidden={ ! editor }>
					{ editor ? (
						<BookingEditor
							key={ `${ editor.mode }-${ editor.id || 'new' }-${ editor.action || '' }` }
							mode={ editor.mode }
							bookingId={ editor.id }
							row={ editor.row }
							initialAction={ editor.action }
							prefill={ editor.prefill }
							onClose={ closeEditor }
							onChanged={ load }
						/>
					) : null }
				</aside>
			</div>
			{ dialog }
		</div>
	);
}

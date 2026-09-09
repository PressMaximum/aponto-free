/**
 * In-flow booking editor (SPEC-P1 §1.4 / mockup §6.7). One shell, one domain
 * order: Customer → Services & items → Schedule → Order → Internal notes (+ Activity
 * in edit). Non-modal: the list stays interactive (no backdrop/body-lock/focus-trap).
 *
 * - Create: customer-first, availability-driven `Available start time` (no past),
 *   derived read-only end, create-as-draft (default_booking_status). POST /bookings.
 * - Edit: Customer/Service/schedule read-only; `Edit time` = reschedule sub-flow
 *   (PUT /bookings/{id}/reschedule); Order snapshot + manual Paid/Unpaid
 *   (PATCH payment_status, none|paid, Q9); Save commits status(+notify)+internal
 *   note (PATCH); Cancel is a destructive confirm in the footer overflow; status
 *   follows the single-source transition matrix; Notify default-on per transition.
 *
 * Footer: the `Notify customer` choice sits on its own row above the commit
 * buttons (founder decision 2026-07-25 — D1), so the button row stays the
 * mockup's 62px footer. See `NotifyRow` below.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { createMenu } from '@pressmaximum/dashboard-kit/primitives';
import { __, sprintf } from '@wordpress/i18n';
import { api } from '../lib/api.js';
import { config, businessTimeLine } from '../lib/config.js';
import { dateTimeLabel, money, timeLabel } from '../lib/format.js';
import { bookingDetailToEditor } from '../lib/booking-adapter.js';
import { staffRowValue, locationRowValue } from '../lib/editor-rows.js';
import { renderIcon } from '../lib/icon.jsx';
import { notifiedSuffix } from '../lib/notification-outcome.js';
import { useToast } from '../lib/toast.jsx';
import { Combobox } from '../lib/Combobox.jsx';
import { serviceOptions, staffOptions, customerOptions, findOptionById } from '../lib/combobox-options.js';
import { moduleAvailable } from '../modules/catalog.js';
import { useModules } from '../modules/module-state.js';
import {
	TRANSACTION_KIND_LABELS,
	TRANSACTION_STATUS_LABELS,
	gatewayLabel,
	paymentBadge,
	shortRef,
} from '../lib/payment-status.js';
import { lazySurface } from '../lib/lazy.jsx';

// The refund dialog is the rarest surface in the app and entirely self-contained, so it
// loads on the click that opens it rather than riding in `admin.js` (AGENTS §6 budget; the
// P3 handoff §4 debt item). `lazySurface` supplies the Spinner and the retry line.
const RefundDialog = lazySurface(
	() => import( /* webpackChunkName: "admin-chunk-refund-dialog" */ './RefundDialog.jsx' ),
	{ pick: 'RefundDialog', label: __( 'Loading refund form…', 'aponto' ) }
);

// R1 — the booking DTOs carry `location_id` only (no name), so resolve names via
// one session-cached catalog fetch shared by every editor open (never per-booking).
let locationNamesPromise = null;
function loadLocationNames() {
	if ( ! locationNamesPromise ) {
		locationNamesPromise = api.get( '/locations', { status: 'all', per_page: 100 } )
			.then( ( res ) => {
				const map = {};
				( res.items || [] ).forEach( ( item ) => { map[ item.id ] = item.name; } );
				return map;
			} )
			.catch( () => { locationNamesPromise = null; return {}; } );
	}
	return locationNamesPromise;
}

const LABELS = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No-show' };
// Mirrors BookingStatusService::ALLOWED. `no_show` is terminal apart from the undo back to
// confirmed (a relabel — the server runs no availability recheck, D-R33), and `pending →
// no_show` is absent on purpose: an unconfirmed request is cancelled, not marked absent.
const TRANSITIONS = { pending: [ 'confirmed', 'cancelled' ], confirmed: [ 'completed', 'cancelled', 'no_show' ], completed: [], cancelled: [ 'pending' ], no_show: [ 'confirmed' ] };
const TZ = config.business.timezone;

function nextStatuses( status ) {
	return TRANSITIONS[ status ] || [];
}


function Readonly( { label, value, hint } ) {
	return (
		<div className="pd-editor-readonly" title={ hint || undefined }>
			<span className="pd-editor-readonly-label">{ label }</span>
			<strong>{ value }</strong>
		</div>
	);
}

/**
 * `Notify customer` on its own row, directly above the commit buttons (founder
 * decision 2026-07-25 — D1 of the spacing audit). The mockup hides its notify
 * toggle until a status transition is pending, so its inspector footer is a
 * single 62px button row; production shows the choice on every commit, and
 * sharing that row left the label zero slack at the 344px panel minimum (it
 * ellipsised). Own row → the button row stays byte-for-byte the mockup's footer
 * and the full label always fits. Rendered as a sibling band above
 * `.pd-booking-inspector-foot`, not inside it, so the button row keeps its 62px
 * height (styling: admin-extra.css `.ap-inspector-notify-row`). The cancel /
 * force-complete confirmations keep the mockup's own stacked
 * `.pd-drawer-confirm-foot`, which already gives the toggle its own line.
 */
function NotifyRow( { checked, onChange, label = 'Notify customer' } ) {
	return (
		<div className="ap-inspector-notify-row">
			<label className="pd-notify-toggle">
				<input className="pd-table-checkbox" type="checkbox" checked={ checked } onChange={ ( e ) => onChange( e.target.checked ) } />
				<span>{ label }</span>
			</label>
		</div>
	);
}

/**
 * R2 — footer overflow `…` menu. A thin binding over the kit's headless
 * `createMenu` (same primitive as RowMenu): the kit owns the full keyboard
 * contract — Arrow roving, Home/End, Escape-close with focus returned to the
 * trigger, outside-pointerdown dismiss, semantic aria wiring — so none of that
 * is re-implemented here.
 */
function InspectorMoreMenu( { cancellable, onCancel } ) {
	const rootRef = useRef( null );
	const handlerRef = useRef( onCancel );
	handlerRef.current = onCancel;

	useEffect( () => {
		if ( ! rootRef.current ) {
			return undefined;
		}
		const controller = createMenu( rootRef.current, {
			onSelect: ( item ) => {
				if ( item.getAttribute( 'data-action' ) === 'cancel' ) {
					handlerRef.current?.();
				}
			},
		} );
		return () => controller.destroy();
	}, [] );

	return (
		<div className="pd-inspector-more-menu" ref={ rootRef }>
			<button className="pd-button sm icon-only" type="button" data-menu-trigger aria-haspopup="menu" aria-expanded="false" aria-label="More appointment actions" title="More appointment actions">{ renderIcon( 'more' ) }</button>
			<div role="menu" aria-label="More appointment actions" hidden>
				<button type="button" role="menuitem" data-action="cancel" disabled={ ! cancellable }>{ renderIcon( 'prohibit' ) }Cancel booking</button>
			</div>
		</div>
	);
}

export function BookingEditor( { mode, bookingId, row = null, initialAction = null, prefill = null, onClose, onChanged } ) {
	const showToast = useToast();
	const creating = mode === 'create';
	const [ loading, setLoading ] = useState( ! creating );
	const [ error, setError ] = useState( null );
	const [ saving, setSaving ] = useState( false );
	const [ detail, setDetail ] = useState( null );

	// Edit-mode form state.
	const [ status, setStatus ] = useState( '' );
	const [ notify, setNotify ] = useState( true );
	const [ internalNote, setInternalNote ] = useState( '' );
	const [ confirm, setConfirm ] = useState( null ); // 'cancel' | 'complete' | 'no-show'
	const [ forceReason, setForceReason ] = useState( '' );
	const [ reschedule, setReschedule ] = useState( initialAction === 'reschedule' );
	const [ locationName, setLocationName ] = useState( '' );
	const [ refundOpen, setRefundOpen ] = useState( false );
	const [ refunding, setRefunding ] = useState( false );
	// SESSION module records, not the boot snapshot: a gateway switched off from the Modules screen
	// moments ago must take its Refund action away NOW. Reading `config.modules` here left the
	// button on screen until a full document reload, one click away from a `409
	// aponto_payment_unavailable` — the same lifetime bug `modules/module-state.js` was written for.
	const modules = useModules();

	// Create-mode form state.
	const [ catalog, setCatalog ] = useState( { services: [], staff: [], customers: [] } );
	const [ addNew, setAddNew ] = useState( false );
	const [ customer, setCustomer ] = useState( null );
	const [ newCustomer, setNewCustomer ] = useState( { name: '', email: '', phone: '' } );
	const [ service, setService ] = useState( null );
	const [ staff, setStaff ] = useState( null );
	const [ createStatus, setCreateStatus ] = useState( config.settings.defaultBookingStatus || 'pending' );

	// Shared schedule state (create + reschedule share the availability picker).
	// A calendar free-slot click prefills the create date + preferred start; the
	// preferred slot is only kept once availability confirms it exists.
	const [ date, setDate ] = useState( ( creating && prefill?.date ) || config.business.today );
	const [ slots, setSlots ] = useState( [] );
	const [ slotsLoading, setSlotsLoading ] = useState( false );
	const [ selectedSlot, setSelectedSlot ] = useState( ( creating && prefill?.startUtc ) || '' );
	const closeRef = useRef( null );

	// Load edit detail. `reloadDetail` is the same fetch WITHOUT the initial-action side effect and
	// without the loading curtain: a refund has to re-read the order (its status, its transactions
	// and what is left to refund all move at once), and re-mounting the whole editor to do that
	// would throw away the status/internal-note edits sitting in the form.
	const reloadDetail = useCallback( () => {
		if ( creating || ! bookingId ) {
			return Promise.resolve();
		}

		return api.get( `/bookings/${ bookingId }` )
			.then( ( res ) => setDetail( bookingDetailToEditor( res ) ) )
			.catch( () => {} );
	}, [ creating, bookingId ] );

	useEffect( () => {
		if ( creating || ! bookingId ) {
			return;
		}
		let live = true;
		setLoading( true );
		api.get( `/bookings/${ bookingId }` )
			.then( ( res ) => {
				if ( ! live ) {
					return;
				}
				const model = bookingDetailToEditor( res );
				setDetail( model );
				setStatus( model.status );
				setInternalNote( model.internalNote );
				setDate( model.date );
				setLoading( false );
				if ( initialAction === 'cancel' ) {
					setConfirm( 'cancel' );
				}
			} )
			.catch( ( err ) => { if ( live ) { setError( err.message ); setLoading( false ); } } );
		return () => { live = false; };
	}, [ creating, bookingId, initialAction ] );

	// R1 — resolve the real location name for the read-only row (edit mode only;
	// one cached catalog fetch per session, nothing per-booking).
	useEffect( () => {
		if ( creating || ! detail?.locationId ) {
			return undefined;
		}
		let live = true;
		loadLocationNames().then( ( map ) => { if ( live ) setLocationName( map[ detail.locationId ] || '' ); } );
		return () => { live = false; };
	}, [ creating, detail ] );

	// Load create catalogs.
	useEffect( () => {
		if ( ! creating ) {
			return;
		}
		Promise.all( [
			api.get( '/services', { status: 'active', per_page: 100 } ).catch( () => ( { items: [] } ) ),
			api.get( '/staff', { status: 'active', per_page: 100 } ).catch( () => ( { items: [] } ) ),
			api.get( '/customers', { per_page: 100 } ).catch( () => ( { items: [] } ) ),
		] ).then( ( [ svc, stf, cust ] ) => {
			// Option identity is the record id, never the name (`combobox-options.js`):
			// same-named services/staff/customers must stay distinct rows so the
			// service_id/staff_id submitted below is the record the user clicked.
			const staffCatalog = staffOptions( stf.items );
			setCatalog( {
				services: serviceOptions( svc.items ),
				staff: staffCatalog,
				customers: customerOptions( cust.items ),
			} );

			// Calendar hand-off (D-R28, Codex review): a free slot clicked on ONE staff member's
			// calendar was clicked against THEIR hours, so preselect them instead of letting the
			// create fall through to any-staff availability and land the booking on somebody else.
			// A prefilled id the catalog does not carry (e.g. an archived member) selects nothing —
			// better an empty field than a record the admin cannot actually pick.
			const preselected = findOptionById( staffCatalog, prefill?.staffId );
			if ( preselected ) {
				setStaff( preselected );
			}
		} );
		// `prefill` is fixed for the life of a create editor (it is read once from the pending-create
		// hand-off when the drawer opens), so it is deliberately not a dependency: re-running this
		// would re-fetch all three catalogs and stamp the staff field back over an admin's own change.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ creating ] );

	useEffect( () => { closeRef.current?.focus( { preventScroll: true } ); }, [] );

	// Availability for create + reschedule. Uses the real engine (public availability).
	const activeServiceId = creating ? service?.id : detail?.serviceId;
	const activeStaffId = creating ? staff?.id : detail?.staffId;
	const durationMinutes = creating
		? ( service?.duration || config.settings.slotStep )
		: ( detail ? Math.round( ( new Date( detail.endUtc ) - new Date( detail.startUtc ) ) / 60000 ) : config.settings.slotStep );

	const loadSlots = useCallback( () => {
		if ( ! activeServiceId || ! date ) {
			setSlots( [] );
			return;
		}
		setSlotsLoading( true );
		api.get( '/public/availability', {
			service_id: activeServiceId,
			staff_id: activeStaffId || undefined,
			from_date: date,
			to_date: date,
			tz: TZ,
		} )
			.then( ( res ) => {
				const list = ( res.slots || [] ).map( ( s ) => ( { startUtc: s.start_utc, label: timeLabel( s.start_utc, TZ ) } ) );
				// Reschedule: keep the current start selectable even though it is "occupied".
				if ( ! creating && detail && ! list.some( ( s ) => s.startUtc === detail.startUtc ) ) {
					list.unshift( { startUtc: detail.startUtc, label: `${ timeLabel( detail.startUtc, TZ ) } (current)` } );
				}
				setSlots( list );
				setSelectedSlot( ( prev ) => ( list.some( ( s ) => s.startUtc === prev ) ? prev : ( list[ 0 ]?.startUtc || '' ) ) );
				setSlotsLoading( false );
			} )
			.catch( () => { setSlots( [] ); setSlotsLoading( false ); } );
	}, [ activeServiceId, activeStaffId, date, creating, detail ] );

	const wantSlots = creating || reschedule;
	useEffect( () => { if ( wantSlots ) { loadSlots(); } }, [ wantSlots, loadSlots ] );

	const derivedEnd = ( () => {
		if ( ! selectedSlot ) {
			return '';
		}
		const end = new Date( new Date( selectedSlot ).getTime() + durationMinutes * 60000 ).toISOString();
		return `${ timeLabel( selectedSlot, TZ ) } – ${ timeLabel( end, TZ ) }`;
	} )();

	// ---- Actions -----------------------------------------------------------
	const submitCreate = async () => {
		const chosen = addNew ? newCustomer : ( customer ? { name: customer.name, email: customer.email, phone: customer.phone } : null );
		if ( ! chosen || ! chosen.name || ! chosen.email ) {
			showToast( 'A customer name and email are required.', 'danger' );
			return;
		}
		if ( ! service?.id ) {
			showToast( 'Choose a service.', 'danger' );
			return;
		}
		if ( ! selectedSlot ) {
			showToast( 'Choose an available start time.', 'danger' );
			return;
		}
		setSaving( true );
		try {
			const body = {
				service_id: service.id,
				start_utc: selectedSlot,
				customer: { name: chosen.name, email: chosen.email, phone: chosen.phone || '' },
				tz: TZ,
				status: createStatus,
				notify,
			};
			if ( staff?.id ) {
				body.staff_id = staff.id;
			}
			const res = await api.post( '/bookings', body );
			showToast( `Booking created for ${ chosen.name } · ${ res.booking?.order?.code || '' }`.trim() );
			onChanged?.();
			onClose?.();
		} catch ( err ) {
			showToast( err.message, 'danger' );
			setSaving( false );
		}
	};

	const saveEdit = async () => {
		if ( ! detail ) {
			return;
		}
		const statusChanged = status !== detail.status;
		const noteChanged = internalNote !== detail.internalNote;
		// Complete-before-end requires a forced confirmation + reason (into Activity).
		if ( statusChanged && status === 'completed' && Date.now() < new Date( detail.endUtc ).getTime() && confirm !== 'complete' ) {
			setConfirm( 'complete' );
			return;
		}
		// No-show-before-start is the same forceable server rule keyed on start_utc (D-R33), so it
		// gets the same reason dialog. This is the ONLY route to an early no-show: the list's row
		// action and inline picker both hide the option until the appointment has started.
		if ( statusChanged && status === 'no_show' && Date.now() < new Date( detail.startUtc ).getTime() && confirm !== 'no-show' ) {
			setConfirm( 'no-show' );
			return;
		}
		if ( ! statusChanged && ! noteChanged ) {
			showToast( 'No changes to save.' );
			return;
		}
		setSaving( true );
		try {
			const body = {};
			if ( statusChanged ) {
				body.status = status;
				body.notify = notify;
				if ( ( status === 'completed' && confirm === 'complete' ) || ( status === 'no_show' && confirm === 'no-show' ) ) {
					body.force = true;
					body.reason = forceReason;
				}
			}
			if ( noteChanged ) {
				body.internal_note = internalNote;
			}
			const res = await api.patch( `/bookings/${ detail.id }`, body );
			showToast( statusChanged
				? `Marked ${ ( LABELS[ status ] || status ).toLowerCase() }.${ notifiedSuffix( res?.notification ) }`
				: 'Internal note saved.' );
			onChanged?.();
			onClose?.();
		} catch ( err ) {
			showToast( err.message, 'danger' );
			setSaving( false );
			setConfirm( null );
		}
	};

	const doCancel = async () => {
		setSaving( true );
		try {
			const res = await api.patch( `/bookings/${ detail.id }`, { status: 'cancelled', notify } );
			showToast( `Booking cancelled.${ notifiedSuffix( res?.notification ) }` );
			onChanged?.();
			onClose?.();
		} catch ( err ) {
			showToast( err.message, 'danger' );
			setSaving( false );
		}
	};

	const doReschedule = async () => {
		if ( ! selectedSlot ) {
			return;
		}
		setSaving( true );
		try {
			await api.put( `/bookings/${ detail.id }/reschedule`, { start_utc: selectedSlot, staff_id: detail.staffId } );
			showToast( 'Booking rescheduled. Customer notified.' );
			onChanged?.();
			onClose?.();
		} catch ( err ) {
			showToast( err.message, 'danger' );
			setSaving( false );
		}
	};

	const togglePaid = async () => {
		const nextPaid = detail.order.paymentStatus !== 'paid';
		try {
			await api.patch( `/bookings/${ detail.id }`, { payment_status: nextPaid ? 'paid' : 'none' } );
			// Re-read rather than patching the local copy: a manual `paid` also RELEASES a live hold
			// server-side (D-R38i), so the order that comes back can differ from the one this branch
			// would have written by hand.
			await reloadDetail();
			showToast( nextPaid ? __( 'Marked as paid.', 'aponto' ) : __( 'Marked unpaid.', 'aponto' ) );
			onChanged?.();
		} catch ( err ) {
			showToast( err.message, 'danger' );
		}
	};

	const doRefund = async ( { amountMinor, reason } ) => {
		setRefunding( true );
		try {
			const res = await api.post( `/bookings/${ detail.id }/refund`, { amount_minor: amountMinor, reason } );
			const txn = res?.transaction || {};
			// A `pending` refund has moved NO money yet (D-R38a(6)) — it only reserves the amount — so
			// the toast must not say the customer has been refunded.
			showToast(
				'pending' === txn.status
					? __( 'Refund requested — the gateway is still processing it.', 'aponto' )
					: sprintf(
							/* translators: %s: refunded amount, already formatted as money. */
							__( 'Refunded %s.', 'aponto' ),
							money( txn.amount_minor || amountMinor, txn.currency || detail.order.currency, detail.order.currencyExponent )
					  )
			);
			setRefundOpen( false );
			await reloadDetail();
			onChanged?.();
		} catch ( err ) {
			showToast( refundErrorMessage( err, detail.order.gateway ), 'danger' );
		} finally {
			setRefunding( false );
		}
	};

	// ---- Render ------------------------------------------------------------
	const header = ( title ) => (
		<header className="pd-booking-inspector-head pd-booking-editor-head">
			<div className="pd-booking-inspector-identity"><h2 id="bookingInspectorTitle">{ title }</h2></div>
			<button className="pd-icon-button" type="button" ref={ closeRef } aria-label="Close booking editor" onClick={ onClose }>{ renderIcon( 'close' ) }</button>
		</header>
	);

	if ( loading ) {
		return <>{ header( 'Booking' ) }<div className="pd-booking-inspector-body"><p className="pd-editor-note">Loading…</p></div></>;
	}
	if ( error ) {
		return <>{ header( 'Booking' ) }<div className="pd-booking-inspector-body"><p className="pd-editor-note">{ error }</p></div><footer className="pd-drawer-foot pd-booking-inspector-foot"><button className="pd-button sm" type="button" onClick={ onClose }>Close</button></footer></>;
	}

	// Reschedule sub-flow (edit).
	if ( ! creating && reschedule ) {
		return (
			<>
				{ header( 'Edit time' ) }
				<form className="pd-booking-inspector-body pd-compact-editor" autoComplete="off" onSubmit={ ( e ) => e.preventDefault() }>
					<section className="pd-editor-section">
						<div className="pd-editor-section-head"><h3>Reschedule</h3></div>
						<Readonly label="Service" value={ row?.service || `Service #${ detail.serviceId }` } hint="Cancel & rebook to change the service" />
						<label className="pd-compact-field is-filled">
							<input type="date" name="date" value={ date } min={ config.business.today } onChange={ ( e ) => setDate( e.target.value ) } required />
							<span className="pd-compact-label">Date</span>
						</label>
						<SlotSelect slots={ slots } loading={ slotsLoading } value={ selectedSlot } onChange={ setSelectedSlot } />
						<Readonly label="Ends" value={ <span className="pd-ltr">{ derivedEnd || '—' }</span> } />
						<p className="pd-editor-note">{ businessTimeLine }</p>
					</section>
				</form>
				<footer className="pd-drawer-foot pd-booking-inspector-foot">
					<button className="pd-button sm" type="button" onClick={ () => setReschedule( false ) }>Cancel</button>
					<button className="pd-button primary sm" type="button" disabled={ ! selectedSlot || saving } onClick={ doReschedule }>{ saving ? 'Saving…' : 'Confirm new time' }</button>
				</footer>
			</>
		);
	}

	if ( creating ) {
		return (
			<>
				{ header( 'New booking' ) }
				<form className="pd-booking-inspector-body pd-compact-editor" autoComplete="off" onSubmit={ ( e ) => e.preventDefault() }>
					<section className="pd-editor-section">
						<div className="pd-editor-section-head">
							<h3>Customer</h3>
							<button type="button" className="pd-section-action" onClick={ () => setAddNew( ( v ) => ! v ) }>{ addNew ? 'Use existing' : 'Add new' }</button>
						</div>
						{ addNew ? (
							<div className="pd-editor-alternate-fields">
								<label className="pd-compact-field"><input name="customer" value={ newCustomer.name } placeholder=" " required onChange={ ( e ) => setNewCustomer( ( c ) => ( { ...c, name: e.target.value } ) ) } /><span className="pd-compact-label">Full name</span></label>
								<div className="pd-field-grid">
									<label className="pd-compact-field"><input type="email" name="email" value={ newCustomer.email } placeholder=" " onChange={ ( e ) => setNewCustomer( ( c ) => ( { ...c, email: e.target.value } ) ) } /><span className="pd-compact-label">Email</span></label>
									<label className="pd-compact-field"><input className="pd-ltr" name="phone" value={ newCustomer.phone } placeholder=" " onChange={ ( e ) => setNewCustomer( ( c ) => ( { ...c, phone: e.target.value } ) ) } /><span className="pd-compact-label">Phone</span></label>
								</div>
							</div>
						) : (
							<Combobox name="customer" label="Search customer" selected={ customer } entity options={ catalog.customers } onSelect={ setCustomer } />
						) }
					</section>
					<section className="pd-editor-section">
						<div className="pd-editor-section-head"><h3>Services &amp; items</h3></div>
						<p className="pd-editor-note">{ __( 'Products & extras arrive with the Premium extras module.', 'aponto' ) }</p>
						<Combobox name="service" label="Service" selected={ service } options={ catalog.services } onSelect={ setService } />
					</section>
					<section className="pd-editor-section">
						<div className="pd-editor-section-head"><h3>Schedule</h3></div>
						<div className="pd-field-grid">
							<label className="pd-compact-field is-filled"><input type="date" name="date" value={ date } min={ config.business.today } onChange={ ( e ) => setDate( e.target.value ) } required /><span className="pd-compact-label">Date</span></label>
							<label className="pd-compact-field pd-compact-select is-filled">
								<select name="status" value={ createStatus } onChange={ ( e ) => setCreateStatus( e.target.value ) }>
									<option value="pending">Pending</option>
									<option value="confirmed">Confirmed</option>
								</select>
								<span className="pd-compact-label">Status</span>
								<span className="pd-field-end-icon" aria-hidden="true">{ renderIcon( 'chevronDown' ) }</span>
							</label>
						</div>
						<SlotSelect slots={ slots } loading={ slotsLoading } value={ selectedSlot } onChange={ setSelectedSlot } disabled={ ! service } emptyLabel={ service ? __( 'No available times', 'aponto' ) : __( 'Pick a service to see times', 'aponto' ) } />
						<Readonly label="Ends" value={ <span className="pd-ltr">{ derivedEnd || 'Select a start time' }</span> } />
						<p className="pd-editor-note">{ businessTimeLine }</p>
						{ catalog.staff.length > 1 ? (
							<Combobox name="staff" label="Staff" selected={ staff } options={ catalog.staff } onSelect={ setStaff } required={ false } />
						) : null }
					</section>
					<section className="pd-editor-section">
						<div className="pd-editor-section-head"><h3>Internal notes</h3></div>
						<label className="pd-compact-field pd-compact-notes"><textarea name="note" rows="3" placeholder=" " value={ internalNote } onChange={ ( e ) => setInternalNote( e.target.value ) } /><span className="pd-compact-label">Visible to staff only</span></label>
					</section>
				</form>
				<NotifyRow checked={ notify } onChange={ setNotify } />
				<footer className="pd-drawer-foot pd-booking-inspector-foot">
					<button className="pd-button sm" type="button" onClick={ onClose }>Cancel</button>
					<button className="pd-button primary sm" type="button" disabled={ saving } onClick={ submitCreate }>{ saving ? 'Saving…' : 'Create booking' }</button>
				</footer>
			</>
		);
	}

	// ---- Edit mode ---------------------------------------------------------
	const d = detail;
	const total = d.order.totalMinor;
	const tzDiffers = d.customerTimezone && d.customerTimezone !== TZ;
	const statusOptions = [ ...new Set( [ d.status, ...nextStatuses( d.status ).filter( ( s ) => s !== 'cancelled' ) ] ) ];
	// R1 — read-only Staff + Location rows (V1). Staff name comes from the booking
	// row DTO; the location NAME resolves from the cached locations catalog when a
	// real location is set, and `location_id = 0` reads "No location · <business
	// address>" (the wildcard: the booking runs at the business address).
	const staffValue = staffRowValue( row );
	const locationValue = locationRowValue( {
		locationId: d.locationId,
		locationName,
		rowLocation: row?.location,
		businessAddress: config.business.address,
	} );

	// ---- Order / payment presentation (D-R38) ------------------------------
	const transactions = d.order.transactions || [];
	const payment = paymentBadge( d.order.paymentStatus, {
		holdExpiresAt: d.order.holdExpiresAt,
		// Business time, like every other instant in this editor (§5 invariant 6): a hold deadline
		// rendered in the viewer's own zone reads differently for the owner and their agency.
		formatTime: ( utc ) => timeLabel( utc, TZ ),
	} );
	// The manual switch survives only where the server still accepts it: an order NO gateway has
	// touched. `transactions.length === 0` is the client mirror of `hasAnyCharge()` — a refund row
	// cannot exist without the charge it refunds.
	const manualAllowed =
		( 'none' === d.order.paymentStatus || 'paid' === d.order.paymentStatus ) && 0 === transactions.length;
	// Refunding needs the gateway module to be ACTIVE, not merely to have been used: disabling a
	// module retains its data and takes its actions away (D-R31 / `409 aponto_payment_unavailable`).
	const gatewayLive = !! d.order.gateway && moduleAvailable( { modules }, d.order.gateway );
	const refundable = ( 'paid' === d.order.paymentStatus || 'partial' === d.order.paymentStatus ) && gatewayLive;
	const gatewayMissing =
		!! d.order.gateway && ! gatewayLive && ( 'paid' === d.order.paymentStatus || 'partial' === d.order.paymentStatus );
	const refundBlocked = d.order.refundableMinor < 1 || d.order.refundPending;

	return (
		<>
			{ header( 'Edit booking' ) }
			<form className="pd-booking-inspector-body pd-compact-editor" autoComplete="off" onSubmit={ ( e ) => e.preventDefault() }>
				<section className="pd-editor-section">
					<div className="pd-editor-section-head"><h3>Customer</h3></div>
					<Readonly label="Customer" value={ row?.customer || `Customer #${ d.customerId }` } hint="Cancel & rebook to change the customer" />
					<Readonly label="Contact" value={ <span className="pd-ltr">{ `${ row?.email || 'No email' } · ${ row?.phone || 'No phone' }` }</span> } />
				</section>
				<section className="pd-editor-section">
					<div className="pd-editor-section-head"><h3>Services &amp; items</h3></div>
					<Readonly label="Service" value={ `${ row?.service || 'Service' } · ${ money( total, d.order.currency, d.order.currencyExponent ) }` } hint="Cancel & rebook to change the service" />
				</section>
				<section className="pd-editor-section">
					<div className="pd-editor-section-head"><h3>Schedule</h3><button type="button" className="pd-section-action" onClick={ () => { setReschedule( true ); setSelectedSlot( d.startUtc ); } }>{ renderIcon( 'calendar' ) }Edit time</button></div>
					<Readonly label="Date & time" value={ <span className="pd-ltr">{ d.dateLabel } · { d.start }–{ d.end }</span> } />
					<p className="pd-editor-note">{ businessTimeLine }{ tzDiffers ? ` · Customer time ${ d.timezone }` : '' }</p>
					<Readonly label="Staff" value={ staffValue } />
					<Readonly label="Location" value={ locationValue } />
					<label className="pd-compact-field pd-compact-select is-filled">
						<select name="status" value={ status } onChange={ ( e ) => setStatus( e.target.value ) }>
							{ statusOptions.map( ( s ) => <option key={ s } value={ s }>{ d.status === 'cancelled' && s === 'pending' ? 'Pending (restore)' : d.status === 'no_show' && s === 'confirmed' ? 'Confirmed (undo no-show)' : LABELS[ s ] }</option> ) }
						</select>
						<span className="pd-compact-label">Status</span>
						<span className="pd-field-end-icon" aria-hidden="true">{ renderIcon( 'chevronDown' ) }</span>
					</label>
				</section>
				<section className="pd-editor-section">
					<div className="pd-editor-section-head">
						<h3>{ __( 'Order', 'aponto' ) }</h3>
						<span className={ `pd-status ap-pay-${ payment.tone }` } title={ payment.title }>{ payment.label }</span>
					</div>
					<Readonly label="Order" value={ <span className="pd-ltr">{ d.order.code || '—' }</span> } />
					<dl className="pd-value-summary">
						<div><dt>{ row?.service || 'Service' }</dt><dd>{ money( total, d.order.currency, d.order.currencyExponent ) }</dd></div>
						<div><dt>Products &amp; extras</dt><dd>{ money( 0, d.order.currency, d.order.currencyExponent ) }</dd></div>
						<div className="is-total"><dt>Total</dt><dd>{ money( total, d.order.currency, d.order.currencyExponent ) }</dd></div>
					</dl>
					{ /* The gateway row appears only once an order HAS one: on a site that takes no
					     online payment, a permanent "Payment method —" is a column of nothing. */ }
					{ d.order.gateway ? <Readonly label={ __( 'Payment method', 'aponto' ) } value={ gatewayLabel( d.order.gateway ) } /> : null }
					{ transactions.length ? <TransactionList transactions={ transactions } currencyExponent={ d.order.currencyExponent } /> : null }
					<div className="ap-order-actions">
						{ /* MANUAL Q9 SWITCH, narrowed (D-R38i). It survives only for an order no gateway
						     has ever touched; on a gateway order the server answers `409
						     aponto_payment_state`, because flipping it back to "not paid" is a lie about
						     money that was taken. Hidden rather than disabled: a control that can never
						     work is not an affordance, it is a question the operator has to answer. */ }
						{ manualAllowed ? (
							<button className="pd-button sm" type="button" onClick={ togglePaid }>{ d.order.paymentStatus === 'paid' ? __( 'Mark unpaid', 'aponto' ) : __( 'Mark as paid', 'aponto' ) }</button>
						) : null }
						{ refundable ? (
							<button className="pd-button sm" type="button" disabled={ refundBlocked } onClick={ () => setRefundOpen( true ) }>{ __( 'Refund', 'aponto' ) }</button>
						) : null }
					</div>
					{ ! manualAllowed ? (
						<p className="pd-editor-note">
							{ sprintf(
								/* translators: %s: payment gateway name, e.g. "Stripe". */
								__( 'Managed by %s.', 'aponto' ),
								'—' === gatewayLabel( d.order.gateway ) ? __( 'the payment gateway', 'aponto' ) : gatewayLabel( d.order.gateway )
							) }
						</p>
					) : null }
					{ refundable && d.order.refundPending ? (
						<p className="pd-editor-note">{ __( 'A refund is already in progress at the gateway.', 'aponto' ) }</p>
					) : null }
					{ gatewayMissing ? (
						<p className="pd-editor-note">
							{ sprintf(
								/* translators: %s: payment gateway name, e.g. "Stripe". */
								__( 'Enable the %s module to refund this payment.', 'aponto' ),
								gatewayLabel( d.order.gateway )
							) }
						</p>
					) : null }
				</section>
				{ ( d.customFields || [] ).length ? (
					<section className="pd-editor-section">
						<div className="pd-editor-section-head"><h3>{ __( 'Booking form answers', 'aponto' ) }</h3></div>
						{ /* Read-only: what the customer answered on the form (D-R30). A field
						     removed from the builder keeps showing under its key, because the
						     answer is a record of what was said, not a copy of the settings. */ }
						{ ( d.customFields || [] ).map( ( f ) => <Readonly key={ f.slug } label={ f.label } value={ f.value } /> ) }
					</section>
				) : null }
				<section className="pd-editor-section">
					<div className="pd-editor-section-head"><h3>Internal notes</h3></div>
					{ d.customerNote ? <Readonly label="Customer note" value={ d.customerNote } /> : null }
					<label className="pd-compact-field pd-compact-notes"><textarea name="note" rows="3" placeholder=" " value={ internalNote } onChange={ ( e ) => setInternalNote( e.target.value ) } /><span className="pd-compact-label">Visible to staff only</span></label>
				</section>
				<details className="pd-booking-inspector-disclosure pd-editor-activity">
					<summary><span>{ renderIcon( 'clock' ) }<strong>Activity</strong></span>{ renderIcon( 'chevronDown' ) }</summary>
					<div className="pd-booking-inspector-disclosure-body"><div className="pd-inspector-activity">
						{ /* Timestamps in business time, like the Schedule section above: the activity
						     trail used to render in the VIEWER's browser zone, so the same booking read
						     differently for the owner and their agency (§5 invariant 6). */ }
						{ d.activities.length ? d.activities.map( ( a ) => (
							<div key={ a.id }><span /><p><strong>{ actionLabel( a.action ) }</strong><small>{ a.initiatedBy } · { a.createdAt ? dateTimeLabel( a.createdAt ) : '' }</small></p></div>
						) ) : <p className="pd-editor-note">No activity recorded.</p> }
					</div></div>
				</details>
			</form>
			{ refundOpen ? (
				<RefundDialog
					order={ d.order }
					busy={ refunding }
					onCancel={ () => setRefundOpen( false ) }
					onConfirm={ doRefund }
				/>
			) : null }
			{ confirm === 'cancel' ? (
				<footer className="pd-drawer-foot pd-drawer-confirm-foot">
					<div className="pd-drawer-confirm-copy"><p><strong>Cancel booking?</strong><span>The slot will be released.</span></p><label className="pd-notify-toggle"><input className="pd-table-checkbox" type="checkbox" checked={ notify } onChange={ ( e ) => setNotify( e.target.checked ) } /><span>Notify customer of cancellation</span></label></div>
					<div className="pd-drawer-confirm-actions"><button className="pd-button sm" type="button" onClick={ () => setConfirm( null ) }>Keep</button><button className="pd-button sm danger" type="button" disabled={ saving } onClick={ doCancel }>Cancel booking</button></div>
				</footer>
			) : confirm === 'complete' ? (
				<footer className="pd-drawer-foot pd-drawer-confirm-foot">
					<div className="pd-drawer-confirm-copy"><p><strong>Complete before the end time?</strong><span>This appointment has not finished yet.</span></p><label className="pd-compact-field is-filled pd-force-reason"><input value={ forceReason } placeholder=" " required onChange={ ( e ) => setForceReason( e.target.value ) } /><span className="pd-compact-label">Reason (recorded in activity)</span></label></div>
					<div className="pd-drawer-confirm-actions"><button className="pd-button sm" type="button" onClick={ () => { setConfirm( null ); setStatus( d.status ); } }>Keep confirmed</button><button className="pd-button sm primary" type="button" disabled={ saving || ! forceReason } onClick={ saveEdit }>Complete anyway</button></div>
				</footer>
			) : confirm === 'no-show' ? (
				<footer className="pd-drawer-foot pd-drawer-confirm-foot">
					<div className="pd-drawer-confirm-copy"><p><strong>Mark as no-show before the start time?</strong><span>This appointment has not started yet.</span></p><label className="pd-compact-field is-filled pd-force-reason"><input value={ forceReason } placeholder=" " required onChange={ ( e ) => setForceReason( e.target.value ) } /><span className="pd-compact-label">Reason (recorded in activity)</span></label></div>
					<div className="pd-drawer-confirm-actions"><button className="pd-button sm" type="button" onClick={ () => { setConfirm( null ); setStatus( d.status ); } }>Keep confirmed</button><button className="pd-button sm primary" type="button" disabled={ saving || ! forceReason } onClick={ saveEdit }>Mark anyway</button></div>
				</footer>
			) : (
				<>
					<NotifyRow checked={ notify } onChange={ setNotify } />
					<footer className="pd-drawer-foot pd-booking-inspector-foot">
						<div className="pd-inspector-foot-actions">
							<InspectorMoreMenu cancellable={ nextStatuses( d.status ).includes( 'cancelled' ) } onCancel={ () => setConfirm( 'cancel' ) } />
							<button className="pd-button primary sm" type="button" disabled={ saving } onClick={ saveEdit }>{ saving ? 'Saving…' : 'Save changes' }</button>
						</div>
					</footer>
				</>
			) }
		</>
	);
}

/**
 * The start-time picker. `emptyLabel` exists because "No available times" is a FINDING — the
 * engine looked and there is nothing free — and the create panel showed it before a service was
 * even picked, when the engine had not been asked anything (beta QA 2026-08-01). A state that
 * has not been evaluated yet must say what it is waiting for instead.
 */
function SlotSelect( { slots, loading, value, onChange, disabled = false, emptyLabel = 'No available times' } ) {
	return (
		<label className="pd-compact-field pd-compact-select is-filled">
			<select value={ value } disabled={ disabled || loading || ! slots.length } onChange={ ( e ) => onChange( e.target.value ) }>
				{ loading ? <option value="">Loading…</option>
					: slots.length ? slots.map( ( s ) => <option key={ s.startUtc } value={ s.startUtc }>{ s.label }</option> )
						: <option value="">{ emptyLabel }</option> }
			</select>
			<span className="pd-compact-label">Available start time</span>
			<span className="pd-field-end-icon" aria-hidden="true">{ renderIcon( 'chevronDown' ) }</span>
		</label>
	);
}

/**
 * Activity-trail labels. The payment actions (D-R38) are logged by `PaymentService`, mostly with
 * `initiated_by = gateway:{code}` or `system`, so without a label here the trail rendered raw enum
 * strings on exactly the rows an operator reads when money is in question.
 *
 * `payment_received_after_expiry` keeps its own wording on purpose: money that landed after the
 * hold lapsed is RECORDED, never allowed to resurrect the appointment (D-R38h), and the trail is
 * the only place that distinction is visible.
 */
const ACTIVITY_LABELS = {
	created: __( 'Booking created', 'aponto' ),
	confirmed: __( 'Confirmed', 'aponto' ),
	cancelled: __( 'Cancelled', 'aponto' ),
	completed: __( 'Completed', 'aponto' ),
	rescheduled: __( 'Rescheduled', 'aponto' ),
	no_show: __( 'Marked as no-show', 'aponto' ),
	payment_received: __( 'Payment received', 'aponto' ),
	payment_received_after_expiry: __( 'Payment received after the hold expired', 'aponto' ),
	payment_status_changed: __( 'Payment status changed', 'aponto' ),
	payment_hold_expired: __( 'Payment hold expired', 'aponto' ),
	hold_released: __( 'Payment hold released', 'aponto' ),
	refund: __( 'Refunded', 'aponto' ),
	// QA run 2 BUG-3: a gateway that refused this order's amount or currency outright. Readiness
	// cannot warn about it — it is asked without an order — so the booking's own trail is where the
	// operator finds out that, say, PayPal has no minor unit for HUF and the price needs rounding.
	payment_refused: __( 'Gateway refused this amount', 'aponto' ),
};

function actionLabel( action ) {
	return ACTIVITY_LABELS[ action ] || action;
}

/**
 * The reference worth showing for one ledger row (QA run 2 BUG-5).
 *
 * A CHARGE is best identified by what the gateway calls the payment; a REFUND by the refund's own
 * id, which since D-R40d lives in `gateway_ref` (rest-contract §2.21). Falling back the other way
 * keeps rows written before that change readable, where the refund id sat in `payment_ref`.
 *
 * @param {Object} t Transaction DTO.
 * @return {string} Reference to display.
 */
function displayRef( t ) {
	return t.kind === 'refund'
		? t.gatewayRef || t.paymentRef || ''
		: t.paymentRef || t.gatewayRef || '';
}

/**
 * The order's gateway transactions, newest last — the ledger `aponto_transactions` keeps
 * (D-R38). Read-only by construction: every row here is something a gateway did, and the only
 * write this screen offers against it is a refund.
 *
 * The reference is SHORTENED on screen and whole in the `title`, because its job is to be pasted
 * into the gateway's own dashboard while the row's job is to stay one line.
 */
function TransactionList( { transactions, currencyExponent = null } ) {
	return (
		<div className="ap-txn-list">
			{ transactions.map( ( t ) => (
				<div className="ap-txn-row" key={ t.id }>
					<span className="ap-txn-kind">{ TRANSACTION_KIND_LABELS[ t.kind ] || t.kind }</span>
					<span className="ap-txn-amount">{ money( t.amountMinor, t.currency, currencyExponent ) }</span>
					<span className={ `ap-txn-status is-${ t.status }` }>{ TRANSACTION_STATUS_LABELS[ t.status ] || t.status }</span>
					<span className="ap-txn-ref pd-ltr" title={ displayRef( t ) }>{ shortRef( displayRef( t ) ) }</span>
					<span className="ap-txn-when">{ t.createdAt ? dateTimeLabel( t.createdAt ) : '' }</span>
				</div>
			) ) }
		</div>
	);
}

/**
 * Refund failures, in the operator's terms.
 *
 * The three the server can answer are genuinely different situations and only one of them is worth
 * retrying, so they must not collapse into "something went wrong":
 *   - `aponto_payment_unavailable` (409) — the module is switched off. The data is still here; the
 *     ACTION needs the module back (D-R31 retention).
 *   - `aponto_payment_state` (409) — the order moved: it was already refunded, another refund is in
 *     flight, or the amount no longer fits. The server's own message says which.
 *   - `aponto_payment_error` (502) — the gateway refused. Nothing local is wrong.
 *
 * @param {Object} err     Failed request.
 * @param {string} gateway Order gateway code.
 * @return {string} Message for the toast.
 */
function refundErrorMessage( err, gateway ) {
	const code = err?.code || '';
	if ( 'aponto_payment_unavailable' === code ) {
		return sprintf(
			/* translators: %s: payment gateway name, e.g. "Stripe". */
			__( 'Enable the %s module to refund this payment.', 'aponto' ),
			gatewayLabel( gateway )
		);
	}
	if ( 'aponto_payment_error' === code ) {
		return __( 'The gateway refused the refund — try again later.', 'aponto' );
	}

	return err?.message || __( 'The refund could not be completed.', 'aponto' );
}

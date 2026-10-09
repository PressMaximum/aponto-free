/**
 * In-flow booking editor (SPEC-P1 §1.4 / mockup §6.7). One shell, one domain
 * order: Customer → Services & items → Schedule → Order → Internal notes (+ Activity
 * in edit). Non-modal: the list stays interactive (no backdrop/body-lock/focus-trap).
 *
 * - Create: customer-first, availability-driven `Available start time` — the FRONT-DESK
 *   window (D-R77): no customer lead time, today's starts from the start of the business
 *   day; a new customer needs only a first name (no email = no customer mail) — derived
 *   read-only end, create-as-draft (default_booking_status). POST /bookings.
 * - Edit: Customer/Service/schedule read-only; `Edit time` = reschedule sub-flow
 *   (PUT /bookings/{id}/reschedule), which on a multi-staff site may also move the booking
 *   to another eligible staff member (D-R78); Order snapshot + manual Paid/Unpaid
 *   (PATCH payment_status, none|paid, Q9); Save commits status(+notify)+internal
 *   note (PATCH); Cancel is a destructive confirm in the footer overflow; status
 *   follows the single-source transition matrix; Notify default-on per transition.
 *
 * Footer: the `Notify customer` choice sits on its own row above the commit
 * buttons (founder decision 2026-07-25 — D1), so the button row stays the
 * mockup's 62px footer. See `NotifyRow` below.
 */
import { externalSyncNotice } from '../lib/external-order-sync.js';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createMenu } from '@pressmaximum/dashboard-kit/primitives';
import { __, sprintf } from '@wordpress/i18n';
import { api } from '../lib/api.js';
import { config } from '../lib/config.js';
import { businessTimeLineAt, dateTimeLabel, money, timeLabel } from '../lib/format.js';
import { bookingDetailToEditor } from '../lib/booking-adapter.js';
import { activityActor, activityLabel, activityReason, cancellationReason } from '../lib/booking-activity.js';
import { usePageTitle } from '../lib/page-title.js';
import { staffRowValue, locationRowValue, locationSelectOptions, locationToSend, rescheduleStaffOptions } from '../lib/editor-rows.js';
import { activeLocations, fetchLocations } from '../lib/branches.js';
import { renderIcon } from '../lib/icon.jsx';
import { fieldClass, fieldAria, FieldErrors } from '../lib/field-error.jsx';
import { displayName, normalizePart } from '../../shared/person-name.js';
import { notifiedSuffix, statusTone } from '../lib/notification-outcome.js';
import { useToast } from '../lib/toast.jsx';
import { useConfirmDialog } from '../lib/confirm.jsx';
import { Combobox } from '../lib/Combobox.jsx';
import { serviceOptions, staffOptions, customerOptions, findOptionById } from '../lib/combobox-options.js';
import { moduleAvailable } from '../modules/catalog.js';
import { useModules } from '../modules/module-state.js';
import {
	TRANSACTION_KIND_LABELS,
	TRANSACTION_STATUS_LABELS,
	gatewayLabel,
	REFUND_REVIEW_LABEL,
	paymentBadge,
	shortRef,
	transactionRef,
} from '../lib/payment-status.js';
import { needsRefundReview } from '../bookings/dashboard-stats.js';
import { customFieldValue } from '../bookings/form-answers.js';
import { lazySurface } from '../lib/lazy.jsx';
// Edition-resolved (webpack alias, D-R41 ownership): Premium's coupon controls, or
// Free's inert stub. The read-only discount snapshot below is neutral core display.
import { useBookingCoupon } from '@aponto/admin-booking-coupon';

// The refund dialog is the rarest surface in the app and entirely self-contained, so it
// loads on the click that opens it rather than riding in `admin.js` (AGENTS §6 budget; the
// P3 handoff §4 debt item). `lazySurface` supplies the Spinner and the retry line.
const RefundDialog = lazySurface(
	() => import( /* webpackChunkName: "admin-chunk-refund-dialog" */ './RefundDialog.jsx' ),
	{ pick: 'RefundDialog', label: __( 'Loading refund form…', 'aponto' ) }
);


/**
 * The notification half of a reschedule toast (D-R63 fix round 2), through the SAME helper the
 * status and cancel toasts use. The reschedule response carries no delivery outcome, so this reports
 * the INTENT — "queued" when the box was ticked, "not notified" when it was not — never "notified".
 *
 * @param {boolean} notify The Notify checkbox.
 * @return {string} Suffix beginning with a space.
 */
function rescheduleSuffix( notify ) {
	return notifiedSuffix( notify ? 'queued' : 'suppressed' );
}

/** A loaded booking's own location id (`0` for none or before the detail lands). */
function d0LocationId( detail ) {
	return Number( detail?.locationId ) || 0;
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


/**
 * The Location picker (D-R63) — shown in place of the read-only row whenever the site has ≥1
 * ACTIVE location. A labelled native `<select>` in the compact-field chrome the Status select uses,
 * so it needs no new CSS and reads correctly RTL.
 */
function LocationSelect( { value, options, onChange, disabled = false } ) {
	return (
		<label className="pd-compact-field pd-compact-select is-filled">
			<select name="location" value={ value } disabled={ disabled } onChange={ ( e ) => onChange( Number( e.target.value ) || 0 ) }>
				{ options.map( ( option ) => <option key={ option.id } value={ option.id }>{ option.label }</option> ) }
			</select>
			<span className="pd-compact-label">{ __( 'Location', 'aponto' ) }</span>
			<span className="pd-field-end-icon" aria-hidden="true">{ renderIcon( 'chevronDown' ) }</span>
		</label>
	);
}

/**
 * The "Edit time" Staff picker (D-R78) — the Location select's chrome, so it needs no new CSS.
 * Rendered only on a multi-staff site with somebody else to move the booking to.
 */
function StaffSelect( { value, options, onChange } ) {
	return (
		<label className="pd-compact-field pd-compact-select is-filled">
			<select name="staff" value={ value } onChange={ ( e ) => onChange( Number( e.target.value ) || 0 ) }>
				{ options.map( ( option ) => <option key={ option.id } value={ option.id }>{ option.label }</option> ) }
			</select>
			<span className="pd-compact-label">{ __( 'Staff', 'aponto' ) }</span>
			<span className="pd-field-end-icon" aria-hidden="true">{ renderIcon( 'chevronDown' ) }</span>
		</label>
	);
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
 * The new-customer field errors inside a `POST /bookings` 422 (`data.fields`), with the
 * `customer.` prefix dropped so they key the inputs directly (name split, 2026-10-01).
 *
 * @param {?Object} fields Server field errors.
 * @return {Object} Errors by `first_name` / `last_name` / `email` / `phone`.
 */
export function customerFieldErrors( fields ) {
	const out = {};
	for ( const key of [ 'first_name', 'last_name', 'email', 'phone' ] ) {
		const message = fields?.[ `customer.${ key }` ];
		if ( message ) {
			out[ key ] = message;
		}
	}
	return out;
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
 * Neutral read-only label for an order's discount snapshot (shown in both editions).
 *
 * @param {string} code Snapshot code, possibly empty.
 * @return {string} Label.
 */
function discountLabel( code ) {
	/* translators: %s: discount code recorded on the order. */
	return code ? sprintf( __( 'Discount (%s)', 'aponto' ), code ) : __( 'Discount', 'aponto' );
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
				<button type="button" role="menuitem" className="is-danger" data-action="cancel" disabled={ ! cancellable }>{ renderIcon( 'prohibit' ) }Cancel booking</button>
			</div>
		</div>
	);
}

export function BookingEditor( { mode, bookingId, row = null, initialAction = null, prefill = null, onClose, onCancel, onChanged } ) {
	// A create the operator ABANDONS (Cancel / ×) may return them where they came from — the
	// Calendar's slot click, D-R63 fix round 2; a SAVE still just closes.
	const abandon = ( mode === 'create' && onCancel ) || onClose;
	const showToast = useToast();
	const creating = mode === 'create';
	const [ loading, setLoading ] = useState( ! creating );
	const [ error, setError ] = useState( null );
	const [ saving, setSaving ] = useState( false );
	const [ detail, setDetail ] = useState( null );
	usePageTitle( creating
		? __( 'New booking', 'aponto' )
		: ( detail?.order?.code ? sprintf( /* translators: %s: order reference, e.g. AP-7Q2F4. */ __( 'Booking %s', 'aponto' ), detail.order.code ) : __( 'Booking', 'aponto' ) ) );

	// Edit-mode form state.
	const [ status, setStatus ] = useState( '' );
	const [ notify, setNotify ] = useState( true );
	const [ internalNote, setInternalNote ] = useState( '' );
	const [ confirm, setConfirm ] = useState( null ); // 'cancel' | 'complete' | 'no-show'
	// The one action a gateway may attach to its external order record (server-computed copy).
	const { confirm: askConfirm, dialog: confirmDialog } = useConfirmDialog();
	const [ externalBusy, setExternalBusy ] = useState( false );
	const [ forceReason, setForceReason ] = useState( '' );
	// "Complete anyway" / "Mark anyway" pressed with the required reason empty (persona QA
	// 2026-10-05, S2-87): the button used to be disabled, so the press did nothing and said nothing.
	const [ reasonMissing, setReasonMissing ] = useState( false );
	// A refused action stays ON the drawer, not only in a toast that is gone in a few seconds
	// (S2-70: a cancel the server refused with a perfectly good reason looked like nothing happened).
	const [ actionError, setActionError ] = useState( '' );
	//
	// Inline ONLY (re-test N8): the same sentence used to go out as a toast too, and on a phone the
	// toast sat on top of the inline message and of the buttons under it until it faded. Every
	// view of this drawer renders `actionError` (`role="alert"`), so nothing is lost.
	const fail = ( message ) => {
		setActionError( message || __( 'That could not be done. Try again.', 'aponto' ) );
	};
	// ONE action at a time, guarded SYNCHRONOUSLY (S2-84): `saving` is React state, so a second tap
	// landing before the re-render still saw an enabled button — two reschedules, two mails. Every
	// commit in this drawer goes through `once()`.
	const busyRef = useRef( false );
	const once = ( action ) => async ( ...args ) => {
		if ( busyRef.current ) {
			return undefined;
		}
		busyRef.current = true;
		setActionError( '' );
		try {
			return await action( ...args );
		} finally {
			busyRef.current = false;
		}
	};
	const [ reschedule, setReschedule ] = useState( initialAction === 'reschedule' );
	const [ refundOpen, setRefundOpen ] = useState( false );
	const [ refunding, setRefunding ] = useState( false );
	const [ balanceBusy, setBalanceBusy ] = useState( false );
	const balancePrompted = useRef( false );
	// SESSION module records, not the boot snapshot: a gateway switched off from the Modules screen
	// moments ago must take its Refund action away NOW. Reading `config.modules` here left the
	// button on screen until a full document reload, one click away from a `409
	// aponto_payment_unavailable` — the same lifetime bug `modules/module-state.js` was written for.
	const modules = useModules();

	// Create-mode form state.
	const [ catalog, setCatalog ] = useState( { services: [], staff: [], customers: [] } );
	const [ addNew, setAddNew ] = useState( false );
	const [ customer, setCustomer ] = useState( null );
	const [ newCustomer, setNewCustomer ] = useState( { first_name: '', last_name: '', email: '', phone: '' } );
	// Inline errors for the new-customer fields, keyed by the `POST /bookings` 422 keys with the
	// `customer.` prefix dropped (`first_name`, `last_name`, `email`, `phone`).
	const [ customerError, setCustomerError ] = useState( {} );
	const [ service, setService ] = useState( null );
	const [ staff, setStaff ] = useState( null );
	const [ createStatus, setCreateStatus ] = useState( config.settings.defaultBookingStatus || 'pending' );

	// D-R78 — "Edit time" may move the booking to another staff member. `moveStaff` is the picked id
	// (0 = the booking's own, until its detail lands); the roster is read once, when the panel
	// opens on a multi-staff site: the active members and, where the operator may read it, the
	// service's eligibility pairs (`null` = not readable → every active member is offered and the
	// server refuses an ineligible one).
	const [ moveStaff, setMoveStaff ] = useState( 0 );
	const [ roster, setRoster ] = useState( null ); // null | { staff: [], assignments: ?[] }

	// D-R63 — where the booking happens. `allLocations` is the WHOLE catalog, every status, read ONCE
	// per editor (fix round 2: it replaced a second, session-cached all-status read that named the
	// read-only row): the ACTIVE branches are the choices, and every name — the read-only row's, an
	// archived current branch's — comes from the same list. No active branch = the read-only row.
	// `place` is the picked id for BOTH modes: the create target, or the edit move target (seeded
	// from the booking once its detail lands).
	const [ allLocations, setLocations ] = useState( [] );
	const locations = activeLocations( allLocations );
	// A calendar slot clicked in a BRANCH view arrives with that branch (D-R63 fix round 1).
	const [ place, setPlace ] = useState( () => ( creating && Number( prefill?.locationId ) ) || 0 );
	// Fix round 3: an INCOMPLETE catalog (a failed page, the page ceiling) is not an empty one — a
	// create could otherwise land at "no location" on a site with branches, and a move could offer a
	// partial list. Location writes wait for a complete read, with Retry.
	const [ catalogStatus, setCatalogStatus ] = useState( 'loading' ); // loading | complete | incomplete
	const catalogIncomplete = 'incomplete' === catalogStatus;
	const loadCatalog = useCallback( () => {
		let live = true;
		setCatalogStatus( 'loading' );
		fetchLocations().then( ( { items, complete } ) => {
			if ( ! live ) {
				return;
			}
			if ( items.length ) {
				setLocations( items );
			}
			setCatalogStatus( complete ? 'complete' : 'incomplete' );
		} );
		return () => { live = false; };
	}, [] );
	useEffect( loadCatalog, [ loadCatalog ] );

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
				setPlace( Number( model.locationId ) || 0 );
				setMoveStaff( Number( model.staffId ) || 0 );
				setDate( model.date );
				setLoading( false );
				if ( initialAction === 'cancel' ) {
					setConfirm( 'cancel' );
				}
			} )
			.catch( ( err ) => { if ( live ) { setError( err.message ); setLoading( false ); } } );
		return () => { live = false; };
	}, [ creating, bookingId, initialAction ] );

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
	const ownStaffId = Number( detail?.staffId ) || 0;
	const activeStaffId = creating ? staff?.id : ( moveStaff || ownStaffId || undefined );
	// Another member's grid is theirs alone (D-R78): the booking is not on it, so there is nothing
	// of its own to step aside and its current start is offered only if that member is free then.
	const onOwnStaff = creating || ! ownStaffId || activeStaffId === ownStaffId;
	const durationMinutes = creating
		? ( service?.duration || config.settings.slotStep )
		: ( detail ? Math.round( ( new Date( detail.endUtc ) - new Date( detail.startUtc ) ) / 60000 ) : config.settings.slotStep );
	const createCustomerEmail = addNew ? newCustomer.email : ( customer?.email || '' );
	// Order adjustments (Premium coupons, D-R67b). The server re-quotes inside reserve, so a
	// create quote is display-only; the booking POST carries the CODE, never an amount.
	const adjust = useBookingCoupon( {
		creating,
		available: moduleAvailable( { modules }, 'coupons' ),
		serviceId: service?.id || null,
		customerEmail: createCustomerEmail,
		detail,
		reloadDetail,
		onChanged,
		showToast,
	} );

	const loadSlots = useCallback( () => {
		if ( ! activeServiceId || ! date ) {
			setSlots( [] );
			return;
		}
		setSlotsLoading( true );
		api.get( '/public/availability', {
			service_id: activeServiceId,
			staff_id: activeStaffId || undefined,
			// D-R63: the times are the picked BRANCH's (its weight-5 hours, its clock). Omitted at
			// `0`, so a site with no branch picked asks exactly what it asked before.
			location_id: place > 0 ? place : undefined,
			from_date: date,
			to_date: date,
			tz: TZ,
			// Edit time (persona QA 2026-10-05, T-043): the booking being moved must not block its
			// own neighbouring starts. Honoured server-side only for a signed-in booking manager.
			exclude_booking_id: ! creating && detail?.id && onOwnStaff ? detail.id : undefined,
			// New booking (D-R77): the front desk records a walk-in or a phone call, so the customer
			// lead time and horizon do not apply and today's earlier starts are offered. Honoured
			// server-side only for a signed-in booking manager; working hours and busy time still apply.
			front_desk: creating ? 1 : undefined,
		} )
			.then( ( res ) => {
				const current = ! creating && detail ? detail.startUtc : '';
				const list = ( res.slots || [] ).map( ( s ) => ( {
					startUtc: s.start_utc,
					label: s.start_utc === current ? `${ timeLabel( s.start_utc, TZ ) } (current)` : timeLabel( s.start_utc, TZ ),
				} ) );
				// Reschedule: keep the current start selectable even when the grid does not offer it
				// (it is in the past, or the hours changed since it was booked).
				if ( current && onOwnStaff && ! list.some( ( s ) => s.startUtc === current ) ) {
					list.unshift( { startUtc: current, label: `${ timeLabel( current, TZ ) } (current)` } );
				}
				setSlots( list );
				setSelectedSlot( ( prev ) => ( list.some( ( s ) => s.startUtc === prev ) ? prev : ( list[ 0 ]?.startUtc || '' ) ) );
				setSlotsLoading( false );
			} )
			.catch( () => { setSlots( [] ); setSlotsLoading( false ); } );
	}, [ activeServiceId, activeStaffId, onOwnStaff, place, date, creating, detail ] );

	const wantSlots = creating || reschedule;
	useEffect( () => { if ( wantSlots ) { loadSlots(); } }, [ wantSlots, loadSlots ] );

	// D-R78: the staff roster for "Edit time" — multi-staff sites only, so the Free single profile
	// makes no request and renders nothing new.
	const multiStaff = moduleAvailable( { modules }, 'multi_staff' );
	const rosterServiceId = ! creating && reschedule && multiStaff ? detail?.serviceId : null;
	useEffect( () => {
		if ( ! rosterServiceId ) {
			return undefined;
		}
		let live = true;
		Promise.all( [
			api.get( '/staff', { status: 'active', per_page: 100 } ).catch( () => ( { items: [] } ) ),
			api.get( `/services/${ rosterServiceId }/eligibility` ).catch( () => null ),
		] ).then( ( [ stf, eligibility ] ) => {
			if ( live ) {
				setRoster( { staff: staffOptions( stf.items ), assignments: Array.isArray( eligibility?.assignments ) ? eligibility.assignments : null } );
			}
		} );
		return () => { live = false; };
	}, [ rosterServiceId ] );
	const staffChoices = roster
		? rescheduleStaffOptions( { staff: roster.staff, assignments: roster.assignments, locationId: place, currentId: ownStaffId, currentName: row?.staff || '' } )
		: [];
	// A picked member who is not assigned at the branch now selected falls back to the booking's own.
	const moveStaffValid = ! roster || moveStaff === ownStaffId || staffChoices.some( ( option ) => option.id === moveStaff );
	useEffect( () => {
		if ( ! moveStaffValid ) {
			setMoveStaff( ownStaffId );
		}
	}, [ moveStaffValid, ownStaffId ] );

	const derivedEnd = ( () => {
		if ( ! selectedSlot ) {
			return '';
		}
		const end = new Date( new Date( selectedSlot ).getTime() + durationMinutes * 60000 ).toISOString();
		return `${ timeLabel( selectedSlot, TZ ) } – ${ timeLabel( end, TZ ) }`;
	} )();
	const createSubtotal = Number( service?.price || 0 );
	const createQuote = adjust.createQuote;
	const createDiscount = Number( createQuote?.discount_minor || 0 );
	const createTotal = createQuote ? Number( createQuote.total_minor || 0 ) : createSubtotal;

	// D-R63: the picker's options, or null when the site has no active location — then every mode
	// renders exactly what it rendered before (the read-only row / nothing on create).
	// R1 — the booking DTOs carry `location_id` only; its NAME comes from the catalog. A current
	// branch archived since stays in the select, marked "(archived)" like the Services picker marks
	// one, so the booking can be viewed and moved AWAY; no other archived branch is offered.
	const currentLocation = creating ? null : allLocations.find( ( location ) => location.id === d0LocationId( detail ) );
	const locationName = currentLocation?.name || '';
	const locationOptions = locations.length
		? locationSelectOptions( {
			locations,
			currentId: creating ? 0 : d0LocationId( detail ),
			currentName: currentLocation && 'active' !== currentLocation.status
				? sprintf(
					/* translators: %s: location name. */
					__( '%s (archived)', 'aponto' ),
					locationName
				)
				: locationName,
			businessName: config.business.name,
			noLocation: __( 'No location', 'aponto' ),
		} )
		: null;
	const reschedulable = ! creating && ( 'pending' === detail?.status || 'confirmed' === detail?.status );
	const catalogNotice = catalogIncomplete ? (
		<p className="ap-field-error" role="status">
			{ creating
				? __( 'The locations could not be loaded, so this booking cannot be placed yet.', 'aponto' )
				: __( 'The locations could not be loaded, so the location cannot be changed right now.', 'aponto' ) }
			{ ' ' }
			<button type="button" className="pd-button text sm" onClick={ loadCatalog }>{ __( 'Retry', 'aponto' ) }</button>
		</p>
	) : null;

	// ---- Actions -----------------------------------------------------------
	const submitCreateAction = async () => {
		// D-R77 (front desk): a NEW customer needs a first name only — the last name, the email and the
		// phone are optional, and no email means no customer mail. A PICKED record is sent by its id
		// (`customer_id`) and used as stored, which is what lets a customer with no email be rebooked.
		const chosen = addNew
			? {
				first_name: normalizePart( newCustomer.first_name ),
				last_name: normalizePart( newCustomer.last_name ),
				email: newCustomer.email.trim(),
				phone: newCustomer.phone,
			}
			: ( customer ? { id: customer.id, first_name: customer.first_name || '', last_name: customer.last_name || '', email: customer.email || '', phone: customer.phone } : null );
		if ( addNew ) {
			const missing = {};
			if ( ! chosen.first_name ) {
				missing.first_name = __( 'Enter the first name.', 'aponto' );
			}
			setCustomerError( missing );
			if ( Object.keys( missing ).length ) {
				showToast( __( 'A customer first name is required.', 'aponto' ), 'danger' );
				return;
			}
		}
		if ( ! chosen ) {
			showToast( __( 'Choose a customer or add a new one.', 'aponto' ), 'danger' );
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
		const adjustBlocker = adjust.createBlocker();
		if ( adjustBlocker ) {
			showToast( adjustBlocker, 'danger' );
			return;
		}
		setSaving( true );
		try {
			const body = {
				service_id: service.id,
				start_utc: selectedSlot,
				tz: TZ,
				status: createStatus,
				notify,
			};
			if ( chosen.id ) {
				body.customer_id = chosen.id;
			} else {
				body.customer = { first_name: chosen.first_name, last_name: chosen.last_name, email: chosen.email, phone: chosen.phone || '' };
			}
			if ( adjust.createCode ) {
				body.coupon_code = adjust.createCode;
			}
			if ( staff?.id ) {
				body.staff_id = staff.id;
			}
			// D-R63: `POST /bookings` has always taken `location_id`; sent only for a picked branch.
			const locationId = locationToSend( place );
			if ( undefined !== locationId ) {
				body.location_id = locationId;
			}
			const res = await api.post( '/bookings', body );
			showToast( `Booking created for ${ displayName( chosen.first_name, chosen.last_name ) } · ${ res.booking?.order?.code || '' }`.trim(), 'success' );
			onChanged?.();
			onClose?.();
		} catch ( err ) {
			adjust.handleCreateError( err );
			setCustomerError( customerFieldErrors( err.data?.fields ) );
			fail( err.message );
			setSaving( false );
		}
	};

	// D-R71e: cancelling a booking paid through an external checkout (WooCommerce) asks the admin
	// how much to refund, instead of closing — the refund itself runs through the gateway.
	const refundAfterCancel = () => !! detail?.order?.externalOrder
		&& ( 'paid' === detail.order.paymentStatus || 'partial' === detail.order.paymentStatus )
		&& detail.order.refundableMinor > 0;
	const promptRefund = async () => {
		setSaving( false );
		await reloadDetail();
		setRefundOpen( true );
	};

	const saveEditAction = async () => {
		if ( ! detail ) {
			return;
		}
		const statusChanged = status !== detail.status;
		if ( statusChanged && status === 'completed' && detail.order.balanceDueMinor > 0 && detail.order.payableNowMinor < detail.order.totalMinor && ! balancePrompted.current ) {
			setConfirm( 'balance' );
			return;
		}

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
		// The forced move needs its reason (S2-87): say so instead of doing nothing.
		if ( statusChanged && ( ( status === 'completed' && confirm === 'complete' ) || ( status === 'no_show' && confirm === 'no-show' ) ) && ! forceReason.trim() ) {
			setReasonMissing( true );
			return;
		}
		// D-R63: a location MOVE is a reschedule to the same start and staff at the new branch
		// (rest-contract §2.9 addendum) — the server re-checks the slot, the staff member's
		// assignment and the hours THERE, which a PATCH field would not.
		const moveTo = locationToSend( place, d0LocationId( detail ) );
		if ( ! statusChanged && ! noteChanged && undefined === moveTo ) {
			showToast( 'No changes to save.' );
			return;
		}
		setSaving( true );
		const moved = undefined !== moveTo;
		if ( moved ) {
			let res;
			try {
				// `notify` from the Notify checkbox (browser QA B3): the reschedule route honours it
				// like POST/PATCH (rest-contract §2.9 addendum), so an unticked box emails no one.
				res = await api.put( `/bookings/${ detail.id }/reschedule`, { start_utc: detail.startUtc, staff_id: detail.staffId, location_id: moveTo, notify } );
			} catch ( err ) {
				fail( err.message );
				setSaving( false );
				return;
			}
			// The move LANDED — adopt it from the reschedule's own response, synchronously in this
			// handler, never from a background re-read (D-R63 fix round 1): if the PATCH below fails,
			// the next Save must see the booking already at its new branch and send NO second
			// reschedule (a resend bumps the ICS sequence and emails the customer again).
			const landed = res?.booking;
			setDetail( ( current ) => ( {
				...current,
				locationId: Number( landed?.location_id ?? moveTo ) || 0,
				icsSequence: landed?.ics_sequence ?? current.icsSequence,
			} ) );
			if ( ! statusChanged && ! noteChanged ) {
				const syncNotice = externalSyncNotice( res?.external_order );
				showToast( syncNotice || `${ __( 'Booking moved.', 'aponto' ) }${ rescheduleSuffix( notify ) }`, syncNotice ? 'default' : 'success' );
				onChanged?.();
				onClose?.();
				return;
			}
		}
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
			const syncNotice = externalSyncNotice( res?.external_order );
			showToast( syncNotice || ( statusChanged
				? `Marked ${ ( LABELS[ status ] || status ).toLowerCase() }.${ notifiedSuffix( res?.notification ) }`
				: 'Internal note saved.' ), syncNotice ? 'default' : ( statusChanged ? statusTone( status ) : 'success' ) );
			onChanged?.();
			if ( statusChanged && 'cancelled' === status && refundAfterCancel() ) {
				await promptRefund();
				return;
			}
			onClose?.();
		} catch ( err ) {
			// A move that landed before this failure is real: say so, and let the list show it.
			fail( moved ? sprintf(
				/* translators: %s: the reason the other changes could not be saved. */
				__( 'The booking was moved, but the other changes were not saved: %s', 'aponto' ),
				err.message
			) : err.message );
			if ( moved ) {
				onChanged?.();
			}
			setSaving( false );
			setConfirm( null );
		}
	};

	const doCancelAction = async () => {
		setSaving( true );
		try {
			const res = await api.patch( `/bookings/${ detail.id }`, { status: 'cancelled', notify } );
			const syncNotice = externalSyncNotice( res?.external_order );
			// A cancellation only stops something: never the `success` tone (D-R64).
			showToast( syncNotice || `Booking cancelled.${ notifiedSuffix( res?.notification ) }` );
			onChanged?.();
			if ( refundAfterCancel() ) {
				await promptRefund();
				return;
			}
			onClose?.();
		} catch ( err ) {
			fail( err.message );
			setSaving( false );
		}
	};

	// "Confirm new time" with the slot (and the branch) still the booking's own is not a reschedule
	// (persona QA 2026-10-05, T-042): it used to bump the calendar sequence and mail the customer
	// that the booking "was rescheduled" to the same time. No change → no request; the server
	// answers such a request as a no-op too.
	// D-R78: another staff member at the same time IS a change (the server's no-op guard compares
	// staff too).
	const staffMoved = !! detail && !! activeStaffId && activeStaffId !== ownStaffId;
	const rescheduleUnchanged = !! detail && selectedSlot === detail.startUtc && place === d0LocationId( detail ) && ! staffMoved;

	const doRescheduleAction = async () => {
		if ( ! selectedSlot || rescheduleUnchanged ) {
			return;
		}
		setSaving( true );
		try {
			// `notify` from the checkbox on EVERY reschedule (fix round 2): the route defaults to true,
			// so leaving it out used to email the customer whatever the box said.
			const body = { start_utc: selectedSlot, staff_id: activeStaffId || detail.staffId, notify };
			// D-R63: the new time may come with a new branch; the slots above were drawn there.
			const moveTo = locationToSend( place, d0LocationId( detail ) );
			if ( undefined !== moveTo ) {
				body.location_id = moveTo;
			}
			const res = await api.put( `/bookings/${ detail.id }/reschedule`, body );
			const syncNotice = externalSyncNotice( res?.external_order );
			// A staff-only change claims nothing about the customer: whether they are mailed is the
			// server's rule (D-R78), and the reschedule response carries no delivery outcome.
			const staffOnly = staffMoved && selectedSlot === detail.startUtc && undefined === moveTo;
			showToast( syncNotice || ( staffOnly
				? __( 'Booking moved to another staff member.', 'aponto' )
				: `Booking rescheduled.${ rescheduleSuffix( notify ) }` ), syncNotice ? 'default' : 'success' );
			onChanged?.();
			onClose?.();
		} catch ( err ) {
			fail( err.message );
			setSaving( false );
		}
	};

	// Generic: core names no gateway and knows no route. The label, the confirmation text and the
	// path all come from the order's own gateway module; the adapter only admits a path under it.
	const runExternalActionAction = async () => {
		const action = detail?.order?.externalOrder?.action;
		if ( ! action || externalBusy ) {
			return;
		}
		if ( ! ( await askConfirm( { title: action.label, message: action.confirm, confirmText: action.label } ) ) ) {
			return;
		}
		setExternalBusy( true );
		try {
			const res = await api.post( action.path, {} );
			await reloadDetail();
			showToast( ( res && typeof res.message === 'string' && res.message ) || __( 'Done.', 'aponto' ), 'success' );
			onChanged?.();
		} catch ( err ) {
			fail( err.message );
		} finally {
			setExternalBusy( false );
		}
	};

	const togglePaidAction = async () => {
		const nextPaid = detail.order.paymentStatus !== 'paid';
		try {
			await api.patch( `/bookings/${ detail.id }`, { payment_status: nextPaid ? 'paid' : 'none' } );
			// Re-read rather than patching the local copy: a manual `paid` also RELEASES a live hold
			// server-side (D-R38i), so the order that comes back can differ from the one this branch
			// would have written by hand.
			await reloadDetail();
			showToast( nextPaid ? __( 'Marked as paid.', 'aponto' ) : __( 'Marked unpaid.', 'aponto' ), nextPaid ? 'success' : 'default' );
			onChanged?.();
		} catch ( err ) {
			fail( err.message );
		}
	};

	const recordBalance = async ( reverse = false ) => {
		setBalanceBusy( true );
		try {
			if ( reverse ) await api.del( `/bookings/${ detail.id }/balance` );
			else await api.post( `/bookings/${ detail.id }/balance`, {} );
			await reloadDetail();
			onChanged?.();
			showToast( reverse ? __( 'Balance record reversed.', 'aponto' ) : __( 'Balance recorded as paid on site.', 'aponto' ), 'success' );
			return true;
		} catch ( err ) {
			showToast( err.message, 'danger' );
			return false;
		} finally { setBalanceBusy( false ); }
	};

	const doRefundAction = async ( { amountMinor, reason, transactionId, idempotency, onsite } ) => {
		setRefunding( true );
		try {
			const res = onsite
				? await api.post( `/bookings/${ detail.id }/balance/refund`, { amount_minor: amountMinor }, { 'X-Aponto-Idempotency': idempotency } )
				: await api.post( `/bookings/${ detail.id }/refund`, { amount_minor: amountMinor, reason, ...( transactionId ? { transaction_id: transactionId } : {} ) } );
			const txn = res?.transaction || {};
			// A `pending` refund has moved NO money yet (D-R38a(6)) — it only reserves the amount — so
			// the toast must not say the customer has been refunded.
			showToast(
				'pending' === txn.status
					? __( 'Refund requested — the gateway is still processing it.', 'aponto' )
					: sprintf(
							/* translators: %s: refunded amount, already formatted as money. */
							onsite ? __( 'On-site refund of %s recorded.', 'aponto' ) : __( 'Refunded %s.', 'aponto' ),
							money( txn.amount_minor || amountMinor, txn.currency || detail.order.currency, detail.order.currencyExponent )
					  ),
				// D-R64: a refund that LANDED is the thing the operator asked for; a pending one is not
				// done yet, so it stays neutral.
				'pending' === txn.status ? 'default' : 'success'
			);
			setRefundOpen( false );
			await reloadDetail();
			onChanged?.();
		} catch ( err ) {
			fail( refundErrorMessage( err, detail.order.gateway ) );
		} finally {
			setRefunding( false );
		}
	};

	const submitCreate = once( submitCreateAction );
	const saveEdit = once( saveEditAction );
	const doCancel = once( doCancelAction );
	const doReschedule = once( doRescheduleAction );
	const runExternalAction = once( runExternalActionAction );
	const togglePaid = once( togglePaidAction );
	const doRefund = once( doRefundAction );

	// ---- Render ------------------------------------------------------------
	const errorText = actionError ? <p className="ap-field-error" role="alert">{ actionError }</p> : null;
	// The same padded band the Notify choice sits in, directly above the commit buttons.
	const errorBand = errorText ? <div className="ap-inspector-notify-row">{ errorText }</div> : null;
	const reasonError = reasonMissing ? <p className="ap-field-error" role="alert">{ __( 'Enter a reason — it is recorded in the activity log.', 'aponto' ) }</p> : null;
	const header = ( title ) => (
		<header className="pd-booking-inspector-head pd-booking-editor-head">
			<div className="pd-booking-inspector-identity"><h2 id="bookingInspectorTitle">{ title }</h2></div>
			<button className="pd-icon-button" type="button" ref={ closeRef } aria-label="Close booking editor" onClick={ abandon }>{ renderIcon( 'close' ) }</button>
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
						{ locationOptions ? <LocationSelect value={ place } options={ locationOptions } onChange={ setPlace } disabled={ catalogIncomplete } /> : null }
						{ locationOptions ? catalogNotice : null }
						{ staffChoices.length > 1 ? <StaffSelect value={ activeStaffId || ownStaffId } options={ staffChoices } onChange={ setMoveStaff } /> : null }
						<label className="pd-compact-field is-filled">
							<input type="date" name="date" value={ date } min={ config.business.today } onChange={ ( e ) => setDate( e.target.value ) } required />
							<span className="pd-compact-label">Date</span>
						</label>
						<SlotSelect slots={ slots } loading={ slotsLoading } value={ selectedSlot } onChange={ setSelectedSlot } />
						<Readonly label="Ends" value={ <span className="pd-ltr">{ derivedEnd || '—' }</span> } />
						<p className="pd-editor-note">{ businessTimeLineAt( selectedSlot || ( date ? `${ date }T12:00:00Z` : '' ) ) }</p>
					</section>
				</form>
				{ errorBand }
				<NotifyRow checked={ notify } onChange={ setNotify } />
				<footer className="pd-drawer-foot pd-booking-inspector-foot">
					<button className="pd-button sm" type="button" onClick={ () => setReschedule( false ) }>Cancel</button>
					<button className="pd-button primary sm" type="button" disabled={ ! selectedSlot || saving || rescheduleUnchanged } onClick={ doReschedule }>{ saving ? 'Saving…' : 'Confirm new time' }</button>
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
								<div className="pd-field-grid">
									<label className={ fieldClass( 'pd-compact-field', customerError, 'first_name' ) }><input name="customer_first_name" autoComplete="off" value={ newCustomer.first_name } placeholder=" " required { ...fieldAria( 'booking-customer', customerError, 'first_name' ) } onChange={ ( e ) => setNewCustomer( ( c ) => ( { ...c, first_name: e.target.value } ) ) } /><span className="pd-compact-label">First name</span></label>
									<label className={ fieldClass( 'pd-compact-field', customerError, 'last_name' ) }><input name="customer_last_name" autoComplete="off" value={ newCustomer.last_name } placeholder=" " { ...fieldAria( 'booking-customer', customerError, 'last_name' ) } onChange={ ( e ) => setNewCustomer( ( c ) => ( { ...c, last_name: e.target.value } ) ) } /><span className="pd-compact-label">{ __( 'Last name (optional)', 'aponto' ) }</span></label>
								</div>
								<FieldErrors prefix="booking-customer" fieldError={ customerError } keys={ [ 'first_name', 'last_name' ] } />
								<div className="pd-field-grid">
									<label className={ fieldClass( 'pd-compact-field', customerError, 'email' ) }><input type="email" name="email" value={ newCustomer.email } placeholder=" " { ...fieldAria( 'booking-customer', customerError, 'email' ) } onChange={ ( e ) => setNewCustomer( ( c ) => ( { ...c, email: e.target.value } ) ) } /><span className="pd-compact-label">{ __( 'Email (optional)', 'aponto' ) }</span></label>
									<label className={ fieldClass( 'pd-compact-field', customerError, 'phone' ) }><input className="pd-ltr" name="phone" value={ newCustomer.phone } placeholder=" " { ...fieldAria( 'booking-customer', customerError, 'phone' ) } onChange={ ( e ) => setNewCustomer( ( c ) => ( { ...c, phone: e.target.value } ) ) } /><span className="pd-compact-label">Phone</span></label>
								</div>
								<FieldErrors prefix="booking-customer" fieldError={ customerError } keys={ [ 'email', 'phone' ] } />
							</div>
						) : (
							<Combobox name="customer" label="Search customer" selected={ customer } entity options={ catalog.customers } onSelect={ setCustomer } />
						) }
						{ /* D-R77: said BEFORE the booking is created, while there is still time to ask. */ }
						{ ( addNew ? ! newCustomer.email.trim() : ( customer && ! customer.email ) )
							? <p className="pd-editor-note">{ __( 'No email: the customer gets no confirmation or reminders.', 'aponto' ) }</p>
							: null }
					</section>
					<section className="pd-editor-section">
						<div className="pd-editor-section-head"><h3>Services &amp; items</h3></div>
						{ /* A Premium site has already bought Premium (persona QA 2026-10-05, T-082): the
						     upsell sentence there is a roadmap note, so it says "coming soon" instead. */ }
						<p className="pd-editor-note">{ config.planEdition === 'premium'
							? __( 'Products & extras are coming soon.', 'aponto' )
							: __( 'Products & extras arrive with the Premium extras module.', 'aponto' ) }</p>
						<Combobox name="service" label="Service" selected={ service } options={ catalog.services } onSelect={ setService } />
					</section>
					{ locationOptions || catalogIncomplete ? (
						<section className="pd-editor-section">
							<div className="pd-editor-section-head"><h3>{ __( 'Location', 'aponto' ) }</h3></div>
							{ locationOptions ? <LocationSelect value={ place } options={ locationOptions } onChange={ setPlace } disabled={ catalogIncomplete } /> : null }
							{ catalogNotice }
						</section>
					) : null }
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
						<p className="pd-editor-note">{ businessTimeLineAt( selectedSlot || ( date ? `${ date }T12:00:00Z` : '' ) ) }</p>
						{ catalog.staff.length > 1 ? (
							<Combobox name="staff" label="Staff" selected={ staff } options={ catalog.staff } onSelect={ setStaff } required={ false } />
						) : null }
					</section>
					<section className="pd-editor-section">
						<div className="pd-editor-section-head"><h3>{ __( 'Order', 'aponto' ) }</h3></div>
						<dl className="pd-value-summary">
							<div><dt>{ service?.label || __( 'Service', 'aponto' ) }</dt><dd>{ money( createSubtotal ) }</dd></div>
							{ createDiscount > 0 ? <div className="is-discount"><dt>{ discountLabel( createQuote.code ) }</dt><dd>−{ money( createDiscount ) }</dd></div> : null }
							<div className="is-total"><dt>{ __( 'Total', 'aponto' ) }</dt><dd>{ money( createTotal ) }</dd></div>
						</dl>
						{ adjust.createControl }
					</section>
					<section className="pd-editor-section">
						<div className="pd-editor-section-head"><h3>Internal notes</h3></div>
						<label className="pd-compact-field pd-compact-notes"><textarea name="note" rows="3" placeholder=" " value={ internalNote } onChange={ ( e ) => setInternalNote( e.target.value ) } /><span className="pd-compact-label">Visible to staff only</span></label>
					</section>
				</form>
				{ errorBand }
				<NotifyRow checked={ notify } onChange={ setNotify } />
				<footer className="pd-drawer-foot pd-booking-inspector-foot">
					<button className="pd-button sm" type="button" onClick={ abandon }>Cancel</button>
					<button className="pd-button primary sm" type="button" disabled={ saving || 'complete' !== catalogStatus } onClick={ submitCreate }>{ saving ? 'Saving…' : 'Create booking' }</button>
				</footer>
			</>
		);
	}

	// ---- Edit mode ---------------------------------------------------------
	const d = detail;
	const total = d.order.totalMinor;
	const subtotal = d.order.subtotalMinor;
	const discount = d.order.discountMinor;
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
	const payment = paymentBadge( d.order.paymentReason, {
		holdExpiresAt: d.order.holdExpiresAt,
		holdDeadlineApplies: d.order.holdDeadlineApplies,
		paymentStateReason: d.order.paymentStateReason,
		// Business time, like every other instant in this editor (§5 invariant 6): a hold deadline
		// rendered in the viewer's own zone reads differently for the owner and their agency.
		formatTime: ( utc ) => timeLabel( utc, TZ ),
	} );
	// The manual switch survives only where the server still accepts it: an order NO gateway has
	// touched. `transactions.length === 0` is the client mirror of `hasAnyCharge()` — a refund row
	// cannot exist without the charge it refunds.
	const manualAllowed =
		( 'none' === d.order.paymentStatus || 'paid' === d.order.paymentStatus ) && 0 === transactions.length;
	const couponEditable = ( 'pending' === d.status || 'confirmed' === d.status )
		&& 'none' === d.order.paymentStatus
		&& ! d.order.gateway
		&& 0 === transactions.length;
	// Refunding needs the gateway module to be ACTIVE, not merely to have been used: disabling a
	// module retains its data and takes its actions away (D-R31 / `409 aponto_payment_unavailable`).
	const gatewayLive = !! d.order.gateway && moduleAvailable( { modules }, d.order.gateway );
	const externalRefund = d.order.refundManagement;
	const refundable = ! externalRefund && ( d.order.refundableCharges ? d.order.refundableCharges.some( ( charge ) => charge.available && charge.refundable_minor > 0 && moduleAvailable( { modules }, charge.gateway ) ) : ( 'paid' === d.order.paymentStatus || 'partial' === d.order.paymentStatus ) && gatewayLive );
	const gatewayMissing =
		! externalRefund && !! d.order.gateway && ! gatewayLive && ( 'paid' === d.order.paymentStatus || 'partial' === d.order.paymentStatus );
	const onsite = transactions.find( ( t ) => t.kind === 'onsite' && t.status === 'succeeded' );
	const deposit = d.order.payableNowMinor > 0 && d.order.payableNowMinor < total;
	const canRecord = d.order.canRecordOnsiteBalance ?? ( deposit && d.order.paymentStatus === 'partial' && d.order.balanceDueMinor > 0 && ! onsite && ! d.order.refundPending );
	const canReverse = d.order.canReverseOnsiteBalance ?? ( onsite && ! transactions.some( ( t ) => [ 'refund', 'onsite_refund' ].includes( t.kind ) && t.id > onsite.id ) );
	const refundBlocked = d.order.refundableMinor < 1 || d.order.refundPending || d.order.balancePending;

	return (
		<>
			{ /* The id isolated LTR, so "#123" keeps its shape inside an RTL heading. */ }
			{ header( <>Edit booking <span className="pd-ltr">#{ d.id }</span></> ) }
			{ confirmDialog }
			<form className="pd-booking-inspector-body pd-compact-editor" autoComplete="off" onSubmit={ ( e ) => e.preventDefault() }>
				<section className="pd-editor-section">
					<div className="pd-editor-section-head"><h3>Customer</h3></div>
					<Readonly label="Customer" value={ row?.customer || `Customer #${ d.customerId }` } hint="Cancel & rebook to change the customer" />
					<Readonly label="Contact" value={ <span className="pd-ltr">{ `${ row?.email || 'No email' } · ${ row?.phone || 'No phone' }` }</span> } />
					{ d.billingAddress ? <Readonly label={ __( 'Billing address', 'aponto' ) } value={ d.billingAddress } /> : null }
				</section>
				<section className="pd-editor-section">
					<div className="pd-editor-section-head"><h3>Services &amp; items</h3></div>
					<Readonly label="Service" value={ `${ row?.service || 'Service' } · ${ money( subtotal, d.order.currency, d.order.currencyExponent ) }` } hint="Cancel & rebook to change the service" />
				</section>
				<section className="pd-editor-section">
					<div className="pd-editor-section-head"><h3>Schedule</h3><button type="button" className="pd-section-action" onClick={ () => { setReschedule( true ); setSelectedSlot( d.startUtc ); } }>{ renderIcon( 'calendar' ) }Edit time</button></div>
					<Readonly label="Date & time" value={ <span className="pd-ltr">{ d.dateLabel } · { d.start }–{ d.end }</span> } />
					{ /* The offset AT THE BOOKING, not today's (re-test R9): a 29 October visit read "London (GMT+1)". */ }
					<p className="pd-editor-note">{ businessTimeLineAt( d.startUtc ) }{ tzDiffers ? ` · Customer time ${ d.timezone }` : '' }</p>
					<Readonly label="Staff" value={ staffValue } />
					{ locationOptions ? (
						<>
							{ /* A move re-validates at the branch through the reschedule write, which
							     only a pending/confirmed booking can take — so the picker is inert on
							     any other status rather than failing on Save. */ }
							<LocationSelect value={ place } options={ locationOptions } onChange={ setPlace } disabled={ ! reschedulable || catalogIncomplete } />
							{ catalogNotice }
							{ place !== d0LocationId( d ) ? <p className="pd-editor-note">{ notify
								? __( 'Saving moves this booking to the new location at the same time and notifies the customer, like a reschedule.', 'aponto' )
								: __( 'Saving moves this booking to the new location at the same time. The customer is not notified.', 'aponto' ) }</p> : null }
						</>
					) : <Readonly label="Location" value={ locationValue } /> }
					<label className="pd-compact-field pd-compact-select is-filled">
						<select name="status" value={ status } onChange={ ( e ) => setStatus( e.target.value ) }>
							{ statusOptions.map( ( s ) => <option key={ s } value={ s }>{ d.status === 'cancelled' && s === 'pending' ? 'Pending (restore)' : d.status === 'no_show' && s === 'confirmed' ? 'Confirmed (undo no-show)' : LABELS[ s ] }</option> ) }
						</select>
						<span className="pd-compact-label">Status</span>
						<span className="pd-field-end-icon" aria-hidden="true">{ renderIcon( 'chevronDown' ) }</span>
					</label>
					{ /* First-run QA D08: the reason a customer (or an admin) gave when cancelling was
					     stored in the activity meta and shown nowhere but the owner email. It sits
					     under Status because it explains the status. */ }
					{ 'cancelled' === d.status && cancellationReason( d.activities ) ? <Readonly label={ __( 'Cancellation reason', 'aponto' ) } value={ cancellationReason( d.activities ) } /> : null }
				</section>
				<section className="pd-editor-section">
					<div className="pd-editor-section-head">
						<h3>{ __( 'Order', 'aponto' ) }</h3>
						<span className={ `pd-status ap-pay-${ payment.tone }` } title={ payment.title }>{ payment.label }</span>
					</div>
					{ /* T-056: cancelling never refunds by itself (D-R71k), so a cancelled booking
					     that is still paid has to say a refund is waiting to be looked at. */ }
					{ needsRefundReview( d ) ? (
						<p className="pd-editor-note"><strong>{ REFUND_REVIEW_LABEL }</strong>{ ` — ${ __( 'this booking is cancelled, but its payment was not refunded. Cancelling does not refund automatically.', 'aponto' ) }` }</p>
					) : null }
					<Readonly label="Order" value={ <span className="pd-ltr">{ d.order.code || '—' }</span> } />
					<dl className="pd-value-summary">
						<div><dt>{ row?.service || 'Service' }</dt><dd>{ money( subtotal, d.order.currency, d.order.currencyExponent ) }</dd></div>
						<div><dt>Products &amp; extras</dt><dd>{ money( 0, d.order.currency, d.order.currencyExponent ) }</dd></div>
						{ discount > 0 ? <div className="is-discount"><dt>{ discountLabel( d.order.couponCode ) }</dt><dd>−{ money( discount, d.order.currency, d.order.currencyExponent ) }</dd></div> : null }
						<div className="is-total"><dt>Total</dt><dd>{ money( total, d.order.currency, d.order.currencyExponent ) }</dd></div>
					</dl>
					{ deposit ? <dl className="pd-value-summary">
						<div><dt>{ __( 'Deposit', 'aponto' ) }</dt><dd>{ money( d.order.payableNowMinor, d.order.currency, d.order.currencyExponent ) }</dd></div>
						<div><dt>{ __( 'Collected', 'aponto' ) }</dt><dd>{ money( d.order.netCollectedMinor, d.order.currency, d.order.currencyExponent ) }</dd></div>
						<div className="is-total"><dt>{ __( 'Balance due', 'aponto' ) }</dt><dd>{ money( d.order.balanceDueMinor, d.order.currency, d.order.currencyExponent ) }</dd></div>
					</dl> : null }
					{ adjust.renderEditControl( d, couponEditable ) }
					{ /* The gateway row appears only once an order HAS one: on a site that takes no
					     online payment, a permanent "Payment method —" is a column of nothing. */ }
					{ d.order.gateway ? <Readonly label={ __( 'Payment method', 'aponto' ) } value={ d.order.externalOrder?.paymentMethod ? `${ gatewayLabel( d.order.gateway ) } · ${ d.order.externalOrder.paymentMethod }` : gatewayLabel( d.order.gateway ) } /> : null }
					{ d.order.externalOrder ? (
						<Readonly
							label={ __( 'External order', 'aponto' ) }
							value={ (
								<span className="pd-ltr">
									{ d.order.externalOrder.url
										? <a href={ d.order.externalOrder.url }>{ d.order.externalOrder.reference }</a>
										: d.order.externalOrder.reference }
									{ d.order.externalOrder.status ? ` · ${ d.order.externalOrder.status }` : '' }
									{ d.order.externalOrder.freshness === 'last_known' ? ` · ${ __( 'Last known status', 'aponto' ) }` : '' }
								</span>
							) }
						/>
					) : null }
					{ d.order.externalOrder?.sync ? <Readonly label={ __( 'Sync status', 'aponto' ) } value={ d.order.externalOrder.sync === 'synced' ? __( 'Synced', 'aponto' ) : d.order.externalOrder.sync === 'pending' ? __( 'Sync pending', 'aponto' ) : __( 'Needs review in WooCommerce', 'aponto' ) } /> : null }
					{ d.order.externalOrder?.notice ? <p className="pd-editor-note">{ d.order.externalOrder.notice }</p> : null }
					{ transactions.length ? <TransactionList transactions={ transactions } currencyExponent={ d.order.currencyExponent } hasExternalOrder={ !! d.order.externalOrder } /> : null }
					<div className="ap-order-actions">
						{ canRecord ? <button className="pd-button sm" type="button" disabled={ balanceBusy } onClick={ () => recordBalance() }>{ __( 'Record balance paid on site', 'aponto' ) }</button> : null }
						{ d.order.canRecordOnsiteRefund ? <button className="pd-button sm" type="button" disabled={ refunding || balanceBusy } onClick={ () => setRefundOpen( 'onsite' ) }>{ __( 'Record on-site refund', 'aponto' ) }</button> : null }
						{ canReverse ? <button className="pd-button sm" type="button" disabled={ balanceBusy } onClick={ () => recordBalance( true ) }>{ __( 'Reverse balance record', 'aponto' ) }</button> : null }
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
						{ externalRefund ? <a className="pd-button sm" href={ externalRefund.url } rel="noreferrer">{ externalRefund.label }</a> : null }
						{ d.order.externalOrder?.action ? (
							<button className="pd-button sm" type="button" disabled={ externalBusy } onClick={ runExternalAction }>{ d.order.externalOrder.action.label }</button>
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
					{ d.order.balancePending ? <p className="pd-editor-note">{ __( 'An online balance payment is in progress. Resolve it before recording another payment or refund.', 'aponto' ) }</p> : null }
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
				{ ( d.customFields || [] ).length || d.consentAt ? (
					<section className="pd-editor-section">
						<div className="pd-editor-section-head"><h3>{ __( 'Booking form answers', 'aponto' ) }</h3></div>
						{ /* Read-only: what the customer answered on the form (D-R30). A field
						     removed from the builder keeps showing under its key, because the
						     answer is a record of what was said, not a copy of the settings. */ }
						{ ( d.customFields || [] ).map( ( f ) => <Readonly key={ f.slug } label={ f.label } value={ customFieldValue( f ) } /> ) }
						{ /* When the customer ticked the consent box (T-046) — business time, like
						     every other instant in this editor. */ }
						{ d.consentAt ? <Readonly label={ __( 'Consent given', 'aponto' ) } value={ dateTimeLabel( d.consentAt ) } /> : null }
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
							<div key={ a.id }><span /><p><strong>{ activityLabel( a ) }</strong>{ activityReason( a ) ? <small>{ activityReason( a ) }</small> : null }<small>{ [ activityActor( a.initiatedBy ), a.createdAt ? dateTimeLabel( a.createdAt ) : '' ].filter( Boolean ).join( ' · ' ) }</small></p></div>
						) ) : <p className="pd-editor-note">No activity recorded.</p> }
					</div></div>
				</details>
			</form>
			{ refundOpen ? (
				<RefundDialog
					order={ { ...d.order, refundableCharges: d.order.refundableCharges?.filter( ( charge ) => moduleAvailable( { modules }, charge.gateway ) ) } }
					onsite={ refundOpen === 'onsite' }
					busy={ refunding }
					onCancel={ () => setRefundOpen( false ) }
					onConfirm={ doRefund }
				/>
			) : null }
			{ confirm === 'balance' ? (
				<footer className="pd-drawer-foot pd-drawer-confirm-foot">
					<div className="pd-drawer-confirm-copy"><p><strong>{ __( 'A balance is still due.', 'aponto' ) }</strong><span>{ __( 'If you collected it on site, record it before completing this appointment.', 'aponto' ) }</span></p></div>
					<div className="pd-drawer-confirm-actions">
						<button className="pd-button sm" type="button" disabled={ balanceBusy } onClick={ () => { balancePrompted.current = true; setConfirm( null ); saveEdit(); } }>{ __( 'Continue without recording', 'aponto' ) }</button>
						{ canRecord ? <button className="pd-button sm primary" type="button" disabled={ balanceBusy } onClick={ async () => { if ( await recordBalance() ) { balancePrompted.current = true; setConfirm( null ); saveEdit(); } } }>{ __( 'Record balance paid on site', 'aponto' ) }</button> : null }
					</div>
				</footer>
			) : confirm === 'cancel' ? (
				<footer className="pd-drawer-foot pd-drawer-confirm-foot">
					<div className="pd-drawer-confirm-copy"><p><strong>Cancel booking?</strong><span>The slot will be released.</span></p><label className="pd-notify-toggle"><input className="pd-table-checkbox" type="checkbox" checked={ notify } onChange={ ( e ) => setNotify( e.target.checked ) } /><span>Notify customer of cancellation</span></label>{ errorText }</div>
					<div className="pd-drawer-confirm-actions"><button className="pd-button sm" type="button" onClick={ () => setConfirm( null ) }>Keep</button><button className="pd-button sm danger" type="button" disabled={ saving } onClick={ doCancel }>Cancel booking</button></div>
				</footer>
			) : confirm === 'complete' ? (
				<footer className="pd-drawer-foot pd-drawer-confirm-foot">
					<div className="pd-drawer-confirm-copy"><p><strong>Complete before the end time?</strong><span>This appointment has not finished yet.</span></p><label className="pd-compact-field is-filled pd-force-reason"><input value={ forceReason } placeholder=" " required aria-invalid={ reasonMissing || undefined } onChange={ ( e ) => { setForceReason( e.target.value ); setReasonMissing( false ); } } /><span className="pd-compact-label">Reason (recorded in activity)</span></label>{ reasonError }{ errorText }</div>
					<div className="pd-drawer-confirm-actions"><button className="pd-button sm" type="button" onClick={ () => { setConfirm( null ); setStatus( d.status ); setReasonMissing( false ); } }>Keep confirmed</button><button className="pd-button sm primary" type="button" disabled={ saving } onClick={ saveEdit }>Complete anyway</button></div>
				</footer>
			) : confirm === 'no-show' ? (
				<footer className="pd-drawer-foot pd-drawer-confirm-foot">
					<div className="pd-drawer-confirm-copy"><p><strong>Mark as no-show before the start time?</strong><span>This appointment has not started yet.</span></p><label className="pd-compact-field is-filled pd-force-reason"><input value={ forceReason } placeholder=" " required aria-invalid={ reasonMissing || undefined } onChange={ ( e ) => { setForceReason( e.target.value ); setReasonMissing( false ); } } /><span className="pd-compact-label">Reason (recorded in activity)</span></label>{ reasonError }{ errorText }</div>
					<div className="pd-drawer-confirm-actions"><button className="pd-button sm" type="button" onClick={ () => { setConfirm( null ); setStatus( d.status ); setReasonMissing( false ); } }>Keep confirmed</button><button className="pd-button sm primary" type="button" disabled={ saving } onClick={ saveEdit }>Mark anyway</button></div>
				</footer>
			) : (
				<>
					{ errorBand }
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
function TransactionList( { transactions, currencyExponent = null, hasExternalOrder = false } ) {
	return (
		<div className="ap-txn-list">
			{ transactions.map( ( t ) => (
				<div className="ap-txn-row" key={ t.id }>
					<span className="ap-txn-kind">{ TRANSACTION_KIND_LABELS[ t.kind ] || t.kind }</span>
					<span className="ap-txn-amount">{ money( t.amountMinor, t.currency, currencyExponent ) }</span>
					<span className={ `ap-txn-status is-${ t.status }` }>{ TRANSACTION_STATUS_LABELS[ t.status ] || t.status }</span>
					<span className="ap-txn-ref pd-ltr" title={ transactionRef( t, hasExternalOrder ) }>{ shortRef( transactionRef( t, hasExternalOrder ) ) }</span>
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

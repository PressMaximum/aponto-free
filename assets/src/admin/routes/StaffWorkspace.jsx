/**
 * Staff workspace (SPEC-P1 §1.2/§1.3 / mockup §7.5) — full-page, one continuous
 * form with a sticky section nav scrolling to four anchors:
 *   1. Details    — avatar / name* / email* / phone / status (POST|PATCH /staff).
 *   2. Services   — READ-ONLY list of the services this member is eligible for, from the
 *                   additive `service_ids` on `GET /staff/{id}` (D-R28, the reverse of
 *                   `GET /services/{id}/eligibility`). Assignment is EDITED on the service,
 *                   not here: eligibility is a full-replacement PUT per service
 *                   (rest-contract §2.18), so two editors writing the same table from
 *                   opposite ends would let a staff-side save silently drop another
 *                   service's location pairs. One writer, one direction.
 *   3. Work hours — inherited business-hours summary + Customize (deep-copy the
 *                   business rows into staff rows) + Revert (drop staff weekly rows,
 *                   keep date overrides), via GET/PUT /staff/{id}/schedule (§1.3).
 *                   The section saves on its own AND is flushed by the page Save —
 *                   one continuous form must never drop a pending edit silently.
 *   4. Time off   — blocked periods (CRUD) that also render on the Calendar.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { __, sprintf } from '@wordpress/i18n';
import { api } from '../lib/api.js';
import { config } from '../lib/config.js';
import { longDate, timeLabel, toUtcInstant } from '../lib/format.js';
import { businessLocalDateToUtcIso } from '../calendar/constants.js';
import { renderIcon } from '../lib/icon.jsx';
import { useToast } from '../lib/toast.jsx';
import { useConfirmDialog } from '../lib/confirm.jsx';
import { motionScrollBehavior } from '../lib/ui.jsx';
import { WEEKDAYS, WeeklyHoursGrid, formatMinutes, validateWeekly } from '../lib/WeeklyHoursGrid.jsx';
import { MODULE_META } from '../modules/catalog.js';

const TZ = config.business.timezone;
const STATUS_OPTIONS = [ { value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' } ];

function businessWeeklyMap() {
	const map = {};
	( config.businessHours || [] ).forEach( ( row ) => { map[ row.weekday ] = row.periods || []; } );
	return map;
}

export function StaffWorkspace( { mode, staff, onClose, onSaved, closeAfterSave = true } ) {
	const showToast = useToast();
	const creating = mode === 'create';
	const [ details, setDetails ] = useState( {
		name: staff?.name || '',
		email: staff?.email || '',
		phone: staff?.phone || '',
		status: staff?.status || 'active',
	} );
	const [ saving, setSaving ] = useState( false );
	const [ fieldError, setFieldError ] = useState( {} );
	const [ active, setActive ] = useState( 'details' );
	const bodyRef = useRef( null );
	// Pending Work-hours edits, published by WorkHoursSection as `{ dirty, save }`
	// so the page-level Save can flush them (see saveDetails).
	const workHoursRef = useRef( null );

	const anchors = creating
		? [ [ 'details', 'Details' ] ]
		: [ [ 'details', 'Details' ], [ 'services', 'Services' ], [ 'hours', 'Work hours' ], [ 'timeoff', 'Time off' ] ];

	// Track the active section for the sticky nav.
	useEffect( () => {
		if ( creating || ! bodyRef.current ) {
			return undefined;
		}
		const sections = anchors.map( ( [ id ] ) => bodyRef.current.querySelector( `#staff-${ id }` ) ).filter( Boolean );
		const observer = new IntersectionObserver(
			( entries ) => { entries.forEach( ( e ) => { if ( e.isIntersecting ) setActive( e.target.id.replace( 'staff-', '' ) ); } ); },
			// Page-level scroll now (record-editor layout), so the viewport is the root.
			{ root: null, rootMargin: '-20% 0px -70% 0px', threshold: 0 }
		);
		sections.forEach( ( s ) => observer.observe( s ) );
		return () => observer.disconnect();
	}, [ creating ] ); // eslint-disable-line react-hooks/exhaustive-deps

	const set = ( key ) => ( e ) => setDetails( ( d ) => ( { ...d, [ key ]: e.target.value } ) );
	const scrollTo = ( id ) => bodyRef.current?.querySelector( `#staff-${ id }` )?.scrollIntoView( { behavior: motionScrollBehavior(), block: 'start' } );

	const saveDetails = async () => {
		const errors = {};
		if ( ! details.name.trim() ) errors.name = 'A name is required.';
		if ( ! /.+@.+\..+/.test( details.email.trim() ) ) errors.email = 'A valid email is required.';
		if ( Object.keys( errors ).length ) { setFieldError( errors ); return; }
		setSaving( true );
		setFieldError( {} );
		const body = { name: details.name.trim(), email: details.email.trim(), phone: details.phone.trim(), status: details.status };
		try {
			if ( creating ) {
				await api.post( '/staff', { ...body, type: 'human' } );
				showToast( `${ body.name } added.` );
			} else {
				await api.patch( `/staff/${ staff.id }`, body );
				// This page is ONE continuous form, so the page Save must also persist a
				// pending Work-hours edit (PUT /staff/{id}/schedule, contract §2.6). It used
				// to save details only and unmount, dropping a Customize edit with no request
				// and no warning — silent data loss reported on the 1.0.0 free zip.
				const hours = workHoursRef.current;
				if ( hours?.dirty ) {
					try {
						await hours.save();
					} catch ( hoursError ) {
						// Half-save: the details landed, the schedule did not. Say so and keep
						// the editor open so the user can fix the hours and retry.
						showToast(
							sprintf(
								/* translators: %s: the reason the work hours could not be saved. */
								__( 'Staff details saved, but the work hours were not: %s', 'aponto' ),
								hoursError.message
							),
							'danger'
						);
						onSaved?.();
						setSaving( false );
						return;
					}
				}
				showToast( 'Staff updated.' );
			}
			onSaved?.();
			if ( closeAfterSave ) {
				onClose?.();
			}
		} catch ( err ) {
			if ( err.data?.fields ) {
				setFieldError( err.data.fields );
			} else {
				showToast( err.message, 'danger' );
			}
			setSaving( false );
		}
	};

	return (
		<div className="pd-page pd-record-editor-page pd-staff-editor-page">
			<header className="pd-record-editor-head">
				<h1>Staff</h1>
				<div className="pd-record-editor-actions">
					<button className="pd-button" type="button" onClick={ onClose }>Cancel</button>
					<button className="pd-button primary" type="button" disabled={ saving } onClick={ saveDetails }>{ saving ? 'Saving…' : creating ? 'Add staff' : 'Save details' }</button>
				</div>
			</header>
			<div className="pd-record-editor-layout">
				<aside className="pd-editor-nav" aria-label="Staff editor sections">
					{ anchors.map( ( [ id, label ] ) => (
						<button key={ id } type="button" className={ active === id ? 'is-active' : undefined } aria-current={ active === id ? 'true' : undefined } onClick={ () => scrollTo( id ) }>{ label }</button>
					) ) }
				</aside>
				<div className="pd-record-editor-form" ref={ bodyRef }>
					<section id="staff-details">
						<header><h2>Details</h2></header>
						<div className="pd-editor-section-body">
							<div className="ap-inspector-identity"><span className="pmdk-avatar is-large" aria-hidden="true">{ ( details.name || '?' ).trim().charAt( 0 ).toUpperCase() }</span><div><strong>{ details.name || 'New staff member' }</strong><span className="pd-ltr">{ details.email || 'No email' }</span></div></div>
							<label className={ `pd-compact-field${ fieldError.name ? ' has-error' : '' }` }><input value={ details.name } placeholder=" " required onChange={ set( 'name' ) } /><span className="pd-compact-label">Full name</span></label>
							{ fieldError.name ? <p className="ap-field-error">{ fieldError.name }</p> : null }
							<div className="pd-form-grid">
								<label className={ `pd-compact-field${ fieldError.email ? ' has-error' : '' }` }><input className="pd-ltr" type="email" value={ details.email } placeholder=" " required onChange={ set( 'email' ) } /><span className="pd-compact-label">Email</span></label>
								<label className="pd-compact-field"><input className="pd-ltr" value={ details.phone } placeholder=" " onChange={ set( 'phone' ) } /><span className="pd-compact-label">Phone</span></label>
							</div>
							<label className="pd-compact-field pd-compact-select is-filled">
								<select value={ details.status } onChange={ set( 'status' ) }>{ STATUS_OPTIONS.map( ( s ) => <option key={ s.value } value={ s.value }>{ s.label }</option> ) }</select>
								<span className="pd-compact-label">Status</span>
								<span className="pd-field-end-icon" aria-hidden="true">{ renderIcon( 'chevronDown' ) }</span>
							</label>
							{ creating ? <p className="pd-editor-note">Work hours and time off can be set once the staff member is created.</p> : null }
							{ ! creating ? <CalendarConnections staffId={ staff.id } /> : null }
						</div>
					</section>

					{ ! creating ? (
						<>
							<ServicesSection staffId={ staff.id } staffName={ details.name } />
							<WorkHoursSection staffId={ staff.id } showToast={ showToast } saveRef={ workHoursRef } />
							<TimeOffSection staffId={ staff.id } showToast={ showToast } />
						</>
					) : null }
					<footer className="pd-editor-footer">
						<button className="pd-button" type="button" onClick={ onClose }>Cancel</button>
						<button className="pd-button primary" type="button" disabled={ saving } onClick={ saveDetails }>{ saving ? 'Saving…' : creating ? 'Add staff' : 'Save details' }</button>
					</footer>
				</div>
			</div>
		</div>
	);
}

// --- Calendar connections (read-only) ----------------------------------------
/**
 * One read-only line per AVAILABLE calendar integration, saying whether this staff member is
 * connected and linking to the module panel where that is changed.
 *
 * Read-only on purpose, and the reason is the same one the Services section states: the connect
 * flow leaves the site for a third-party consent screen and comes back to a specific panel. Putting
 * a second entry point here would mean two places that can start the same handshake and two places
 * to keep truthful — while the thing an editor actually needs is the ANSWER ("is this person's
 * calendar linked?"), which is exactly one line.
 *
 * Generic over the registry rather than hardcoded to Google: any `kind: integration` module the
 * build can use appears here, so the Outlook module gets this surface for free (D-R35).
 *
 * Reads the boot-data projection, which carries no token — only status, account label and the
 * timestamp (D-R34).
 *
 * @param {{staffId: number}} props Section props.
 */
function CalendarConnections( { staffId } ) {
	const integrations = ( config.modules || [] ).filter(
		( mod ) => 'integration' === mod.kind && mod.available && mod.has_settings
	);

	if ( ! integrations.length ) {
		return null;
	}

	return (
		<ul className="ap-staff-integrations">
			{ integrations.map( ( mod ) => {
				const rows = config.integration.connections[ mod.code ] || [];
				const row = rows.find( ( entry ) => Number( entry.staff_id ) === Number( staffId ) );
				const label = MODULE_META[ mod.code ]?.label || mod.code;
				let state = __( 'Not connected', 'aponto' );
				if ( row && 'needs_reconnect' === row.status ) {
					state = __( 'Needs reconnect', 'aponto' );
				} else if ( row ) {
					state = row.account
						? sprintf(
								/* translators: %s: the connected account address. */
								__( 'Connected as %s', 'aponto' ),
								row.account
						  )
						: __( 'Connected', 'aponto' );
				}

				return (
					<li key={ mod.code }>
						<span>{ `${ label }: ${ state }` }</span>
						<a href={ `#modules/${ mod.code }` }>{ __( 'Manage', 'aponto' ) }</a>
					</li>
				);
			} ) }
		</ul>
	);
}

// --- Services (read-only eligibility) ----------------------------------------
/**
 * The services this staff member is eligible for. Two reads: `GET /staff/{id}` for the additive
 * `service_ids` (D-R28) and the services catalog for their names — the ids alone would render a
 * list of numbers. Both are best-effort: a failed catalog read degrades to "Service #12" rather
 * than blanking a section the rest of the page does not depend on.
 *
 * Read-only by design (see the file header): the edit lives in the service editor, which owns the
 * full-replacement PUT. The link therefore goes there, via `#services/<id>` (routes/Services.jsx).
 *
 * @param {{staffId: number, staffName: string}} props Section props.
 */
function ServicesSection( { staffId, staffName } ) {
	const [ state, setState ] = useState( { loading: true, services: [] } );

	useEffect( () => {
		let live = true;
		Promise.all( [
			api.get( `/staff/${ staffId }` ),
			api.get( '/services', { status: 'all', per_page: 100 } ).catch( () => ( { items: [] } ) ),
		] )
			.then( ( [ staffDto, catalog ] ) => {
				if ( ! live ) {
					return;
				}
				const byId = Object.fromEntries( ( catalog.items || [] ).map( ( svc ) => [ String( svc.id ), svc ] ) );
				// A staff member may be connected to a service the catalog page did not return
				// (archived, or past the 100-row window). Keep the row — dropping it would
				// under-report a real assignment — and label it from the id.
				const services = ( staffDto.service_ids || [] ).map( ( id ) => ( {
					id,
					name: byId[ String( id ) ]?.name || sprintf(
						/* translators: %d: the numeric id of a service that could not be resolved to a name. */
						__( 'Service #%d', 'aponto' ),
						id
					),
					status: byId[ String( id ) ]?.status || '',
				} ) );
				setState( { loading: false, services } );
			} )
			.catch( () => {
				if ( live ) {
					setState( { loading: false, services: [] } );
				}
			} );
		return () => { live = false; };
	}, [ staffId ] );

	return (
		<section id="staff-services">
			<header><h2>Services</h2></header>
			<div className="pd-editor-section-body">
				{ state.loading ? <p className="pd-editor-note">Loading…</p> : state.services.length ? (
					<>
						<p className="pd-editor-note">{ __( 'Assignments are edited on the service, under “Staff & locations”.', 'aponto' ) }</p>
						<ul className="ap-staff-services-list">
							{ state.services.map( ( svc ) => (
								<li key={ svc.id }>
									<a href={ `#services/${ svc.id }` }>{ svc.name }</a>
									{ svc.status && svc.status !== 'active' ? <span className={ `ap-status-pill is-${ svc.status }` }>{ svc.status }</span> : null }
								</li>
							) ) }
						</ul>
					</>
				) : (
					// The unbookable state, stated plainly. On premium a new service starts with NO
					// eligible staff (the Free policy auto-assigns; the extension does not), so
					// an empty list here is a real, reachable configuration — not an edge case.
					<p className="pd-editor-note">
						{ sprintf(
							/* translators: %s: the staff member's name. */
							__( '%s is not assigned to any service yet, so they cannot be booked. Open a service and add them under “Staff & locations”.', 'aponto' ),
							staffName || __( 'This staff member', 'aponto' )
						) }
					</p>
				) }
			</div>
		</section>
	);
}

/**
 * Canonical `weekly` payload rows for contract §2.6: ascending weekday, ascending
 * non-overlapping periods. `JSON.stringify` of the result is also the section's
 * dirty-check signature, so "what we would send" and "what we compare" can never drift.
 *
 * @param {Object} weekly Weekday (1..7) → periods `[{start,end}]` in minutes.
 * @return {Array} Contract rows `[{weekday,periods:[{start_minute,end_minute}]}]`.
 */
function weeklyRows( weekly ) {
	return Object.keys( weekly || {} )
		.map( Number )
		.sort( ( a, b ) => a - b )
		.map( ( weekday ) => ( {
			weekday,
			periods: [ ...( weekly[ weekday ] || [] ) ]
				.sort( ( a, b ) => a.start - b.start )
				.map( ( p ) => ( { start_minute: p.start, end_minute: p.end } ) ),
		} ) );
}

// --- Work hours -------------------------------------------------------------
function WorkHoursSection( { staffId, showToast, saveRef } ) {
	const { confirm, dialog } = useConfirmDialog();
	const [ loading, setLoading ] = useState( true );
	const [ custom, setCustom ] = useState( false ); // has own weekly rows
	const [ weekly, setWeekly ] = useState( {} ); // weekday -> [{start,end}]
	const [ overrides, setOverrides ] = useState( [] );
	const [ saving, setSaving ] = useState( false );
	// Signature of the schedule the server currently holds — anything else is a pending
	// edit. `null` until a GET succeeds, so a failed load can never look "dirty" and
	// have the page Save replace a real schedule with an empty one.
	const [ baseline, setBaseline ] = useState( null );
	const business = businessWeeklyMap();

	const load = useCallback( () => {
		setLoading( true );
		api.get( `/staff/${ staffId }/schedule` )
			.then( ( res ) => {
				const map = {};
				( res.weekly || [] ).forEach( ( row ) => { map[ row.weekday ] = ( row.periods || [] ).map( ( p ) => ( { start: p.start_minute, end: p.end_minute } ) ); } );
				setWeekly( map );
				setOverrides( res.overrides || [] );
				setCustom( ( res.weekly || [] ).length > 0 );
				setBaseline( JSON.stringify( weeklyRows( map ) ) );
				setLoading( false );
			} )
			.catch( () => setLoading( false ) );
	}, [ staffId ] );
	useEffect( load, [ load ] );

	// The section's write queue. `PUT /staff/{id}/schedule` is a FULL replacement and
	// ScheduleGateway::replace() is order-dependent and NOT transactional, so two overlapping
	// writes can leave a half-applied week on the server (Codex review item 1). Both write
	// paths — this section's own Save and the page-level Save — go through `persist`, which
	// chains onto whatever is already in flight instead of racing it.
	const writeQueue = useRef( Promise.resolve() );
	const queued = useRef( 0 );

	// The one write path (PUT /staff/{id}/schedule, contract §2.6). It REJECTS on
	// failure so every caller decides how to surface it — the page-level Save must be
	// able to tell the user the details saved but the hours did not.
	const persist = ( nextWeekly ) => {
		const payload = {
			weekly: weeklyRows( nextWeekly ),
			overrides: overrides.map( ( o ) => ( { date: o.date, periods: o.periods } ) ),
		};
		// Busy from the moment a write is QUEUED until the last one settles — a write waiting
		// its turn must keep the grid inert exactly like the one on the wire.
		queued.current += 1;
		setSaving( true );
		const run = async () => {
			try {
				await api.put( `/staff/${ staffId }/schedule`, payload );
				load();
			} finally {
				// Always drop the saving flag — leaving it set after a SUCCESSFUL save
				// kept the button stuck at a disabled "Saving…" (found in B4b verify).
				queued.current -= 1;
				if ( 0 === queued.current ) {
					setSaving( false );
				}
			}
		};
		// `then( run, run )` so a FAILED write still lets the next one run (a poisoned queue
		// would wedge the section until remount); the queue itself swallows rejections while
		// the caller keeps the real one.
		const chained = writeQueue.current.then( run, run );
		writeQueue.current = chained.catch( () => {} );

		return chained;
	};

	// The section's own buttons own their toasts; the page-level Save writes its own
	// message instead (it has to mention the details that DID save).
	const withToast = async ( write ) => {
		try {
			await write();
			showToast( 'Work hours saved.' );
		} catch ( err ) {
			showToast( err.message, 'danger' );
		}
	};

	const customize = () => {
		// Deep-copy the business rows into staff rows for EVERY weekday: open days carry their
		// periods; every other day starts Closed (`[]`), so the editor opens with all seven days
		// visible (§1.3; contract §2.6 `periods=[]` closes the day).
		const map = {};
		WEEKDAYS.forEach( ( [ n ] ) => {
			const biz = business[ n ];
			map[ n ] = biz && biz.length ? biz.map( ( p ) => ( { start: p.start_minute, end: p.end_minute } ) ) : [];
		} );
		// ROOT CAUSE of "Customize does nothing" (U4-03b): when the business hours are all closed —
		// e.g. the wizard was skipped, so config.businessHours is empty — the old copy was an EMPTY
		// map that was PUT immediately, and the reload flipped `custom` straight back to false, so the
		// grid flashed and vanished (leaving the static summary <ul>). Two fixes: (1) seed a sensible
		// default when nothing is open so there IS something to edit; (2) open the editor LOCALLY and
		// persist only on "Save work hours" — no empty write-then-revert round-trip.
		if ( ! Object.values( map ).some( ( periods ) => periods.length ) ) {
			WEEKDAYS.forEach( ( [ n ] ) => {
				map[ n ] = n <= 5 ? [ { start: 540, end: 1020 } ] : [];
			} );
		}
		setCustom( true );
		setWeekly( map );
	};

	// Validate + write the pending grid. Rejects (never toasts) so the caller owns the message.
	const flush = async () => {
		const invalid = validateWeekly( weekly );
		if ( invalid ) {
			throw new Error( invalid );
		}
		await persist( weekly );
	};

	const saveWeekly = () => withToast( flush );

	// Publish the pending edit to StaffWorkspace so its Save can flush this sub-resource
	// (the page is one continuous form). Without this the grid state died on unmount:
	// no PUT, no error — the 1.0.0 free-zip beta bug. Re-registered every render so the
	// closure over `weekly` is never stale.
	useEffect( () => {
		if ( ! saveRef ) {
			return undefined;
		}
		const handle = { dirty: null !== baseline && JSON.stringify( weeklyRows( weekly ) ) !== baseline, save: flush };
		saveRef.current = handle;
		return () => {
			if ( saveRef.current === handle ) {
				saveRef.current = null;
			}
		};
	} );

	const revert = async () => {
		// In-app dialog (C13 / review F item 3): destructive styling, Cancel takes default focus.
		const ok = await confirm( {
			title: 'Revert to business hours?',
			message: 'Custom weekly hours will be removed (date overrides are kept).',
			confirmText: 'Revert',
			destructive: true,
		} );
		if ( ! ok ) {
			return;
		}
		setCustom( false );
		setWeekly( {} );
		withToast( () => persist( {} ) );
	};

	if ( loading ) {
		return <section id="staff-hours"><header><h2>Work hours</h2></header><div className="pd-editor-section-body"><p className="pd-editor-note">Loading…</p></div></section>;
	}

	return (
		<section id="staff-hours">
			<header>
				<h2>Work hours</h2>
				{ /* Both header actions rewrite the whole week, so they are inert while a write is
				     in flight — the same rule the grid itself follows (Codex review item 1). */ }
				{ custom ? <button type="button" className="pd-section-action" disabled={ saving } onClick={ revert }>{ renderIcon( 'arrows' ) }Revert to business hours</button>
					: <button type="button" className="pd-section-action" disabled={ saving } onClick={ customize }>{ renderIcon( 'note' ) }Customize</button> }
			</header>
			<div className="pd-editor-section-body">
			{ ! custom ? (
				<div className="ap-hours-summary">
					<p className="pd-editor-note">Using your business hours (inherited). Customize to give this staff member their own weekly hours.</p>
					<ul className="ap-hours-list">
						{ WEEKDAYS.map( ( [ n, label ] ) => (
							<li key={ n }><span>{ label }</span><strong>{ ( business[ n ] && business[ n ].length ) ? business[ n ].map( ( p ) => `${ formatMinutes( p.start_minute, config.settings.timeFormat ) } – ${ formatMinutes( p.end_minute, config.settings.timeFormat ) }` ).join( ', ' ) : 'Closed' }</strong></li>
						) ) }
					</ul>
				</div>
			) : (
				<div className="ap-hours-grid-wrap">
						<WeeklyHoursGrid weekly={ weekly } onChange={ setWeekly } busy={ saving } timeFormat={ config.settings.timeFormat } />
						<div className="ap-hours-save"><button type="button" className="pd-button primary sm" disabled={ saving } onClick={ saveWeekly }>{ saving ? 'Saving…' : 'Save work hours' }</button></div>
					</div>
			) }
			</div>
			{ dialog }
		</section>
	);
}

// --- Time off (blocked periods) ---------------------------------------------
function TimeOffSection( { staffId, showToast } ) {
	const [ items, setItems ] = useState( [] );
	const [ loading, setLoading ] = useState( true );
	const [ adding, setAdding ] = useState( false );
	const [ form, setForm ] = useState( { start: '', end: '', reason: '' } );

	const load = useCallback( () => {
		setLoading( true );
		const from = toUtcInstant( Date.now() - 30 * 86400000 );
		const to = toUtcInstant( Date.now() + 365 * 86400000 );
		api.get( '/blocked-periods', { staff_id: staffId, from, to, per_page: 100 } )
			.then( ( res ) => { setItems( res.items || [] ); setLoading( false ); } )
			.catch( () => setLoading( false ) );
	}, [ staffId ] );
	useEffect( load, [ load ] );

	const add = async () => {
		if ( ! form.start || ! form.end ) {
			showToast( 'Choose a start and end.', 'danger' );
			return;
		}
		try {
			await api.post( '/blocked-periods', {
				staff_id: staffId,
				start_datetime_utc: businessLocalDateToUtcIso( new Date( form.start ) ),
				end_datetime_utc: businessLocalDateToUtcIso( new Date( form.end ) ),
				reason: form.reason,
			} );
			showToast( 'Time off added.' );
			setAdding( false );
			setForm( { start: '', end: '', reason: '' } );
			load();
		} catch ( err ) {
			showToast( err.message, 'danger' );
		}
	};

	const remove = async ( id ) => {
		try {
			await api.del( `/blocked-periods/${ id }` );
			showToast( 'Time off removed.' );
			load();
		} catch ( err ) {
			showToast( err.message, 'danger' );
		}
	};

	return (
		<section id="staff-timeoff">
			<header><h2>Time off</h2>{ ! adding ? <button type="button" className="pd-section-action" onClick={ () => setAdding( true ) }>{ renderIcon( 'plus' ) }Add time off</button> : null }</header>
			<div className="pd-editor-section-body">
			<p className="pd-editor-note">Blocked periods and special hours appear on the Calendar and block new bookings.</p>
			{ adding ? (
				<div className="ap-timeoff-form">
					<div className="pd-field-grid">
						<label className="pd-compact-field is-filled"><input type="datetime-local" value={ form.start } onChange={ ( e ) => setForm( ( f ) => ( { ...f, start: e.target.value } ) ) } /><span className="pd-compact-label">From (business time)</span></label>
						<label className="pd-compact-field is-filled"><input type="datetime-local" value={ form.end } onChange={ ( e ) => setForm( ( f ) => ( { ...f, end: e.target.value } ) ) } /><span className="pd-compact-label">To (business time)</span></label>
					</div>
					<label className="pd-compact-field"><input value={ form.reason } placeholder=" " onChange={ ( e ) => setForm( ( f ) => ( { ...f, reason: e.target.value } ) ) } /><span className="pd-compact-label">Reason (optional)</span></label>
					<div className="ap-inline-actions"><button type="button" className="pd-button sm" onClick={ () => setAdding( false ) }>Cancel</button><button type="button" className="pd-button primary sm" onClick={ add }>Add time off</button></div>
				</div>
			) : null }
			{ loading ? <p className="pd-editor-note">Loading…</p> : items.length ? (
				<ul className="ap-timeoff-list">
					{ items.map( ( item ) => (
						<li key={ item.id }>
							<div><strong>{ longDate( item.start_datetime_utc ) } · { timeLabel( item.start_datetime_utc ) } – { timeLabel( item.end_datetime_utc ) }</strong>{ item.reason ? <span>{ item.reason }</span> : null }</div>
							<button type="button" className="pd-icon-button sm" aria-label="Remove time off" onClick={ () => remove( item.id ) }>{ renderIcon( 'close' ) }</button>
						</li>
					) ) }
				</ul>
			) : <p className="pd-editor-note">No time off scheduled.</p> }
			</div>
		</section>
	);
}

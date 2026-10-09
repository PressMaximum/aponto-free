/**
 * Dashboard — default landing (SPEC-P1 §1.0.1). Answers "what needs attention
 * today?" and stays quieter than the dense data routes. All aggregates are
 * CLIENT-SIDE from GET /bookings (no stats endpoint at V1).
 */
import { useState, useEffect, useCallback } from 'react';
import { __, _n, sprintf } from '@wordpress/i18n';
import { api } from '../lib/api.js';
import { config, businessTimeLine } from '../lib/config.js';
import { money, isoDate, toUtcInstant } from '../lib/format.js';
import { bookingRowFromListItem } from '../lib/booking-adapter.js';
import { renderIcon } from '../lib/icon.jsx';
import { PageHeader, RouteLoading, RouteError } from '../lib/ui.jsx';
import { settingsPath } from '../settings/ia.js';
import { dashboardStats, dayPart, hourIn, paidBookingsRefused, paymentFixTarget, paymentNotReady, serviceNotBookable } from '../bookings/dashboard-stats.js';

// The greeting follows the BUSINESS clock, like every other time on this screen (persona QA
// 2026-10-05, T-038) — not the browser's.
function greeting() {
	const part = dayPart( hourIn( config.business.timezone ) );
	return part === 'morning' ? 'Good morning' : part === 'afternoon' ? 'Good afternoon' : 'Good evening';
}

function Summary( { icon, label, value, detail } ) {
	return (
		<div className="pd-summary-item">
			<span className="pd-summary-label">{ renderIcon( icon ) }{ label }</span>
			<strong className="pd-summary-value">{ value }</strong>
			<span className="pd-summary-detail">{ detail }</span>
		</div>
	);
}

function statusPill( status, label ) {
	const icons = { pending: 'arrows', confirmed: 'check', completed: 'calendar-check', cancelled: 'prohibit', no_show: 'hourglass' };
	const labels = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No-show' };
	return <span className={ `pd-status ${ status }` }>{ renderIcon( icons[ status ] || 'info' ) }<span>{ label || labels[ status ] }</span></span>;
}

/**
 * Booking-page readiness (real state — Q fix 4): the booking page id (set by the wizard or
 * in Settings → Booking → Form presentation, D-R75) lives in `aponto_booking_page_id` (boot
 * data), services count comes from /services.
 */
function BookingPageLine( { servicesCount, onNavigate } ) {
	const page = config.bookingPage;

	if ( servicesCount === 0 ) {
		return (
			<div className="pd-booking-page-line">
				<span>{ renderIcon( 'alert' ) }<span><strong>Add your first service</strong><small>Customers need something to book</small></span></span>
				<button className="pd-button text sm" type="button" onClick={ () => onNavigate( 'services' ) }>Add service</button>
			</div>
		);
	}
	if ( ! page ) {
		return (
			<div className="pd-booking-page-line">
				<span>{ renderIcon( 'alert' ) }<span><strong>Create your booking page</strong><small>Publish the page customers book on</small></span></span>
				{ /* Settings → Booking → Form presentation holds the page picker AND the wizard's
				     "Create a booking page" action (D-R75), so one link serves both paths. */ }
				<button className="pd-button text sm" type="button" onClick={ () => onNavigate( settingsPath( 'booking', 'form' ) ) }>Set up page</button>
			</div>
		);
	}
	if ( page.status !== 'publish' ) {
		return (
			<div className="pd-booking-page-line">
				<span>{ renderIcon( 'clock' ) }<span><strong>Booking page is a draft</strong><small>Review and publish it to go live</small></span></span>
				{ page.editUrl ? <a className="pd-button text sm" href={ page.editUrl }>Edit page</a> : null }
			</div>
		);
	}
	// A published page WITHOUT the booking form is not "live" (persona QA 2026-10-05, T-040) — the
	// same hint Settings → Booking gives. Only an explicit `false` warns: boot data older than this
	// bundle carries no `hasForm`, and a form reached through a pattern reads false too, so the
	// line says what to check rather than claiming the page is broken.
	if ( page.hasForm === false ) {
		return (
			<div className="pd-booking-page-line">
				<span>{ renderIcon( 'alert' ) }<span><strong>{ __( 'No booking form on your booking page', 'aponto' ) }</strong><small>{ __( 'Add the Aponto booking form block so customers can book there', 'aponto' ) }</small></span></span>
				{ page.editUrl ? <a className="pd-button text sm" href={ page.editUrl }>Edit page</a> : null }
			</div>
		);
	}
	return (
		<div className="pd-booking-page-line">
			<span>{ renderIcon( 'check' ) }<span><strong>Online booking is live</strong><small>{ page.url ? new URL( page.url, window.location.origin ).pathname : '' }</small></span></span>
			{ page.url ? <a className="pd-button text sm" href={ page.url } target="_blank" rel="noreferrer noopener">View page</a> : null }
		</div>
	);
}

export function Dashboard( { onNavigate } ) {
	const [ state, setState ] = useState( { loading: true, error: null, rows: [] } );
	const [ servicesCount, setServicesCount ] = useState( null );
	// Active services no active staff member is assigned to: customers cannot see them (R11).
	const [ unbookableCount, setUnbookableCount ] = useState( 0 );
	const [ staffCount, setStaffCount ] = useState( null );
	// The stored `payments.mode`, read only when it can matter (see `load`). '' = unknown.
	const [ paymentMode, setPaymentMode ] = useState( '' );
	// D-R79: the owner's choice for "required but no method ready" (`accept` | `refuse`).
	const [ whenUnavailable, setWhenUnavailable ] = useState( '' );

	const load = useCallback( () => {
		setState( ( s ) => ( { ...s, loading: true, error: null } ) );
		const from = toUtcInstant( Date.now() - 31 * 86400000 );
		const to = toUtcInstant( Date.now() + 92 * 86400000 );
		api.get( '/bookings', { status: 'all', from, to, per_page: 100 } )
			.then( ( res ) => setState( { loading: false, error: null, rows: ( res.items || [] ).map( bookingRowFromListItem ) } ) )
			.catch( ( err ) => setState( { loading: false, error: err.message, rows: [] } ) );
		// The whole first page rather than a count of one (re-test R11): "8 active services"
		// included one nobody is assigned to, which customers cannot see. Past 100 services the
		// rows beyond the page are counted as bookable — the line then understates the warning,
		// never overstates it.
		api.get( '/services', { status: 'active', per_page: 100 } )
			.then( ( res ) => {
				const unbookable = ( res.items || [] ).filter( serviceNotBookable ).length;
				setUnbookableCount( unbookable );
				setServicesCount( Math.max( 0, ( Number( res.total ) || 0 ) - unbookable ) );
			} )
			.catch( () => { setServicesCount( null ); setUnbookableCount( 0 ); } );
		// Staff readiness (skip-path guidance): a booking needs at least one staff member for
		// any availability, so a fresh 0-staff install is nudged before anything else. Count all
		// statuses — existence, matching how the Staff route itself counts (Staff.jsx).
		api.get( '/staff', { status: 'all', per_page: 1 } )
			.then( ( res ) => setStaffCount( Number( res.total ) || 0 ) )
			.catch( () => setStaffCount( null ) );
		// Payment readiness (persona QA 2026-10-05, T-037). The module catalog on the boot data
		// already says whether an enabled payment module is ready; the one missing fact is whether
		// online payment is switched on at all, which only someone who can manage settings may
		// read — and they are the one who can act on it. No request on a site whose enabled
		// payment modules are ready (or that has none).
		if ( config.caps.settings && paymentNotReady( config.modules, 'required' ) ) {
			api.get( '/settings' )
				.then( ( res ) => {
					setPaymentMode( String( res?.payments?.mode || '' ) );
					setWhenUnavailable( String( res?.payments?.when_unavailable || '' ) );
				} )
				.catch( () => setPaymentMode( '' ) );
		}
	}, [] );

	useEffect( load, [ load ] );

	const openCreate = () => { window.__apontoPendingCreate = true; onNavigate( 'bookings' ); };
	// Open THE booking, not just the list (T-038) — the Calendar's cross-route seam.
	const openBooking = ( id ) => { window.__apontoPendingOpenId = id; onNavigate( 'bookings' ); };

	if ( state.loading ) {
		return <div className="pd-page"><PageHeader title={ `${ greeting() }` } /><RouteLoading label="Loading dashboard" /></div>;
	}
	if ( state.error ) {
		return <div className="pd-page"><PageHeader title={ greeting() } /><RouteError message={ state.error } onRetry={ load } /></div>;
	}

	const today = config.business.today;
	// Unfinished checkouts (a slot held while a customer pays, no customer on it yet) are NOT
	// appointments, requests, new customers or booked value (persona QA 2026-10-05, T-038): they are
	// counted apart, as "awaiting checkout". `bookings/dashboard-stats.js` holds the rules.
	const { todays, pending, holds, refunds, bookedValue, newCustomers } = dashboardStats( state.rows, today, ( utc ) => isoDate( utc ) );
	// T-037: online payment is on, a payment module is enabled, and none of them is ready.
	const brokenPayment = paymentFixTarget( config.modules, paymentMode );
	const fixPayment = () => {
		// Several candidates: open the catalog on its Payments tab instead of guessing (N3).
		if ( brokenPayment.category ) {
			window.__apontoModulesCategory = brokenPayment.category;
		}
		onNavigate( brokenPayment.path );
	};

	// Pending rail zero-state honours the default_booking_status setting: when new
	// bookings are auto-confirmed, nothing lands in "needs attention".
	const autoConfirm = config.settings.defaultBookingStatus === 'confirmed';

	// Skip-path readiness: with zero staff the calendar has no availability and nothing is
	// bookable, so the readiness card leads with "add a staff member" before any other step.
	// Null (still loading / errored) is treated as "don't nag".
	const mentionsStaff = staffCount === 0;

	return (
		<div className="pd-page">
			<PageHeader
				title={ greeting() }
				description="Here’s what needs your attention today."
				actions={ (
					<>
						<button className="pd-button" type="button" onClick={ () => onNavigate( 'calendar' ) }>{ renderIcon( 'calendar' ) }View calendar</button>
						<button className="pd-button primary" type="button" onClick={ openCreate }>{ renderIcon( 'plus' ) }New booking</button>
					</>
				) }
			/>
			<section className="pd-summary" aria-label="Business overview">
				<Summary icon="calendar" label="Today" value={ todays.length } detail="appointments" />
				<Summary icon="alert" label="Needs attention" value={ pending.length } detail="pending confirmation" />
				<Summary icon="user" label="New customers" value={ newCustomers } detail="added today" />
				<Summary icon="briefcase" label="Booked value" value={ money( bookedValue ) } detail={ __( 'today, all bookings', 'aponto' ) } />
			</section>
			<div className="pd-dashboard-grid">
				<section className="pd-card pd-dashboard-schedule">
					<div className="pd-card-header">
						<div><h2>Today’s schedule</h2><p>{ businessTimeLine }</p></div>
						<button className="pd-button text sm" type="button" onClick={ () => onNavigate( 'bookings' ) }>View all</button>
					</div>
					<div className="pd-dashboard-agenda">
						{ todays.length ? todays.map( ( b ) => (
							<button className="pd-dashboard-agenda-row" type="button" key={ b.id } onClick={ () => openBooking( b.id ) }>
								<span className="pd-dashboard-time"><strong>{ b.start }</strong><small>{ b.end }</small></span>
								<span className="pd-dashboard-marker" />
								<span className="pd-dashboard-booking-copy"><strong>{ b.customer }</strong><small>{ b.service } · { b.staff }</small></span>
								{ statusPill( b.status ) }
							</button>
						) ) : (
							<div className="pd-card-body pd-dashboard-attention-empty">
								<span className="pd-state-icon">{ renderIcon( 'check' ) }</span>
								<div><strong>No appointments today</strong><small>Enjoy the quiet, or create a booking.</small></div>
							</div>
						) }
					</div>
				</section>
				<aside className="pd-dashboard-rail">
					<section className="pd-card">
						<div className="pd-card-header">
							<div><h2>Needs attention</h2><p>{ pending.length ? `${ pending.length } request${ pending.length === 1 ? '' : 's' } waiting` : 'No requests waiting' }</p></div>
							{ pending.length ? statusPill( 'pending', `${ pending.length } pending` ) : null }
						</div>
						{ pending.length ? (
							<div className="pd-dashboard-attention-list">
								{ pending.slice( 0, 6 ).map( ( b ) => (
									<button type="button" key={ b.id } onClick={ () => openBooking( b.id ) }>
										<span className="pd-avatar">{ b.initials }</span>
										{ /* The DATE too (T-038): a request for tomorrow read as one for today. */ }
										<span><strong>{ b.customer }</strong><small>{ b.dateLabel } · { b.start } · { b.service }</small></span>
										{ renderIcon( 'chevron' ) }
									</button>
								) ) }
							</div>
						) : (
							<div className="pd-card-body pd-dashboard-attention-empty">
								<span className="pd-state-icon">{ renderIcon( 'check' ) }</span>
								<div><strong>Nothing waiting</strong><small>{ autoConfirm ? 'New bookings are confirmed automatically.' : 'New requests appear here when they need review.' }</small></div>
							</div>
						) }
						{ brokenPayment || refunds.length || holds.length ? (
							<div className="pd-card-body">
								{ /* T-037: with no ready payment method the form takes paid bookings
								     unpaid (D-R38a(1)) — or, when the owner opted to (D-R79), refuses
								     them. Either way the owner has to know. Generic: the module's own
								     page says what is wrong. */ }
								{ brokenPayment ? (
									<div className="pd-booking-page-line">
										<span>{ renderIcon( 'alert' ) }<span><strong>{ __( 'Online payment is on, but no payment method is ready', 'aponto' ) }</strong><small>{ paidBookingsRefused( config.modules, paymentMode, whenUnavailable, config.paymentExclusive )
											? __( 'Paid services cannot be booked online right now', 'aponto' )
											: __( 'Paid services are being booked without payment', 'aponto' ) }</small></span></span>
										<button className="pd-button text sm" type="button" onClick={ fixPayment }>{ __( 'Fix', 'aponto' ) }</button>
									</div>
								) : null }
								{ /* T-056: cancelling never refunds by itself (D-R71k). */ }
								{ refunds.length ? (
									<div className="pd-booking-page-line">
										<span>{ renderIcon( 'alert' ) }<span><strong>{ sprintf(
											/* translators: %d: number of cancelled bookings that are still paid. */
											_n( '%d cancelled booking is still paid', '%d cancelled bookings are still paid', refunds.length, 'aponto' ),
											refunds.length
										) }</strong><small>{ __( 'Cancelling does not refund automatically — review the refund', 'aponto' ) }</small></span></span>
										<button className="pd-button text sm" type="button" onClick={ () => openBooking( refunds[ 0 ].id ) }>{ __( 'Review', 'aponto' ) }</button>
									</div>
								) : null }
								{ /* T-038: slot holds of unfinished checkouts, kept apart from requests. */ }
								{ holds.length ? (
									<div className="pd-booking-page-line">
										<span>{ renderIcon( 'clock' ) }<span><strong>{ sprintf(
											/* translators: %d: number of unfinished checkouts holding a slot. */
											_n( '%d awaiting checkout', '%d awaiting checkout', holds.length, 'aponto' ),
											holds.length
										) }</strong><small>{ __( 'Slots held while customers finish checkout — released automatically if they do not', 'aponto' ) }</small></span></span>
										<button className="pd-button text sm" type="button" onClick={ () => onNavigate( 'bookings/payment/pending' ) }>{ __( 'View', 'aponto' ) }</button>
									</div>
								) : null }
							</div>
						) : null }
					</section>
					<section className="pd-card pd-booking-page-card">
						<div className="pd-card-header">
							<div><h2>Booking page</h2><p>Customer-facing entry point</p></div>
							{ config.bookingPage?.status === 'publish' && config.bookingPage?.hasForm !== false ? statusPill( 'confirmed', 'Published' ) : null }
						</div>
						<div className="pd-card-body">
							{ mentionsStaff ? (
								<div className="pd-booking-page-line">
									<span>{ renderIcon( 'alert' ) }<span><strong>Add a staff member</strong><small>Bookings need at least one staff member — add yourself</small></span></span>
									<button className="pd-button text sm" type="button" onClick={ () => onNavigate( 'staff' ) }>Add staff</button>
								</div>
							) : null }
							<BookingPageLine servicesCount={ servicesCount } onNavigate={ onNavigate } />
							<div className="pd-booking-page-line">
								<span>{ renderIcon( 'briefcase' ) }<span><strong>Services</strong><small>{ servicesCount === null ? 'Set up what customers can book' : `${ servicesCount } active service${ servicesCount === 1 ? '' : 's' }` }</small></span></span>
								<button className="pd-button text sm" type="button" onClick={ () => onNavigate( 'services' ) }>Open</button>
							</div>
							{ unbookableCount > 0 ? (
								<div className="pd-booking-page-line">
									<span>{ renderIcon( 'alert' ) }<span><strong>{ sprintf(
										/* translators: %d: number of active services with no active staff member assigned. */
										_n( '%d service is not bookable', '%d services are not bookable', unbookableCount, 'aponto' ),
										unbookableCount
									) }</strong><small>{ __( 'No active staff member is assigned, so customers do not see it', 'aponto' ) }</small></span></span>
									<button className="pd-button text sm" type="button" onClick={ () => onNavigate( 'services' ) }>{ __( 'Review', 'aponto' ) }</button>
								</div>
							) : null }
							<div className="pd-booking-page-line">
								<span>{ renderIcon( 'clock' ) }<span><strong>Business time</strong><small>{ config.business.timezoneCity } ({ config.business.utcOffset })</small></span></span>
								{ /* Deep-link into the Business hours panel on Settings → General (U4-03c).
								     The FULL path, not a bare `settings`: the bare route only worked because
								     SettingsRoute silently canonicalizes it, and it read as a no-op from any
								     screen already on a settings hash (lib/router.js `navigate`). The flag
								     stays — it is what scrolls the panel into view (BusinessHoursPanel). */ }
								<button className="pd-button text sm" type="button" onClick={ () => { window.__apontoScrollToHours = true; onNavigate( settingsPath( 'general', 'business' ) ); } }>Manage</button>
							</div>
						</div>
					</section>
				</aside>
			</div>
		</div>
	);
}

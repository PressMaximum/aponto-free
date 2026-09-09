/**
 * Dashboard — default landing (SPEC-P1 §1.0.1). Answers "what needs attention
 * today?" and stays quieter than the dense data routes. All aggregates are
 * CLIENT-SIDE from GET /bookings (no stats endpoint at V1).
 */
import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';
import { config, businessTimeLine } from '../lib/config.js';
import { money, isoDate, toUtcInstant } from '../lib/format.js';
import { bookingRowFromListItem } from '../lib/booking-adapter.js';
import { renderIcon } from '../lib/icon.jsx';
import { PageHeader, RouteLoading, RouteError } from '../lib/ui.jsx';
import { settingsPath } from '../settings/ia.js';

// Booked value counts only bookings that still represent money for today. `no_show` stays OUT,
// exactly like `cancelled` (SPEC-P1 §1.0.1 + D-R33) — the chair was empty either way.
const BLOCKING = new Set( [ 'pending', 'confirmed', 'completed' ] );

function greeting() {
	const hour = new Date().getHours();
	return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
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
 * Booking-page readiness (real state — Q fix 4): the wizard-created page id lives
 * in `aponto_booking_page_id` (boot data), services count comes from /services.
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
				{ config.wizardUrl ? <a className="pd-button text sm" href={ config.wizardUrl }>Create page</a> : null }
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
	const [ staffCount, setStaffCount ] = useState( null );

	const load = useCallback( () => {
		setState( ( s ) => ( { ...s, loading: true, error: null } ) );
		const from = toUtcInstant( Date.now() - 31 * 86400000 );
		const to = toUtcInstant( Date.now() + 92 * 86400000 );
		api.get( '/bookings', { status: 'all', from, to, per_page: 100 } )
			.then( ( res ) => setState( { loading: false, error: null, rows: ( res.items || [] ).map( bookingRowFromListItem ) } ) )
			.catch( ( err ) => setState( { loading: false, error: err.message, rows: [] } ) );
		api.get( '/services', { status: 'active', per_page: 1 } )
			.then( ( res ) => setServicesCount( Number( res.total ) || 0 ) )
			.catch( () => setServicesCount( null ) );
		// Staff readiness (skip-path guidance): a booking needs at least one staff member for
		// any availability, so a fresh 0-staff install is nudged before anything else. Count all
		// statuses — existence, matching how the Staff route itself counts (Staff.jsx).
		api.get( '/staff', { status: 'all', per_page: 1 } )
			.then( ( res ) => setStaffCount( Number( res.total ) || 0 ) )
			.catch( () => setStaffCount( null ) );
	}, [] );

	useEffect( load, [ load ] );

	const openCreate = () => { window.__apontoPendingCreate = true; onNavigate( 'bookings' ); };

	if ( state.loading ) {
		return <div className="pd-page"><PageHeader title={ `${ greeting() }` } /><RouteLoading label="Loading dashboard" /></div>;
	}
	if ( state.error ) {
		return <div className="pd-page"><PageHeader title={ greeting() } /><RouteError message={ state.error } onRetry={ load } /></div>;
	}

	const today = config.business.today;
	const rows = state.rows;
	const todays = rows.filter( ( b ) => b.date === today && b.status !== 'cancelled' )
		.sort( ( a, b ) => a.startUtc.localeCompare( b.startUtc ) );
	const pending = rows.filter( ( b ) => b.status === 'pending' )
		.sort( ( a, b ) => a.startUtc.localeCompare( b.startUtc ) );
	const bookedValue = todays.filter( ( b ) => BLOCKING.has( b.status ) ).reduce( ( sum, b ) => sum + ( b.total || 0 ), 0 );
	const newCustomers = new Set(
		rows.filter( ( b ) => b.created && isoDate( b.created ) === today ).map( ( b ) => ( b.email || b.customer ).toLowerCase() )
	).size;

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
				<Summary icon="briefcase" label="Booked value" value={ money( bookedValue ) } detail="today · payment tracking later" />
			</section>
			<div className="pd-dashboard-grid">
				<section className="pd-card pd-dashboard-schedule">
					<div className="pd-card-header">
						<div><h2>Today’s schedule</h2><p>{ businessTimeLine }</p></div>
						<button className="pd-button text sm" type="button" onClick={ () => onNavigate( 'bookings' ) }>View all</button>
					</div>
					<div className="pd-dashboard-agenda">
						{ todays.length ? todays.map( ( b ) => (
							<button className="pd-dashboard-agenda-row" type="button" key={ b.id } onClick={ () => onNavigate( 'bookings' ) }>
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
									<button type="button" key={ b.id } onClick={ () => onNavigate( 'bookings' ) }>
										<span className="pd-avatar">{ b.initials }</span>
										<span><strong>{ b.customer }</strong><small>{ b.start } · { b.service }</small></span>
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
					</section>
					<section className="pd-card pd-booking-page-card">
						<div className="pd-card-header">
							<div><h2>Booking page</h2><p>Customer-facing entry point</p></div>
							{ config.bookingPage?.status === 'publish' ? statusPill( 'confirmed', 'Published' ) : null }
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

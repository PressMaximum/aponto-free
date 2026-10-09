/**
 * Calendar route (SPEC-P1 §1.4 · Q10). Event Calendar day/week grid with the
 * Fresha-style look: business-time events coloured by status, diagonal-stripe
 * non-working hours from the REAL schedule + blocked-periods (not the spike mock),
 * accent now-indicator, custom toolbar, status + service (+ location, D-R63) filters, click-booking →
 * detail, click free slot → New booking, Block time → POST /blocked-periods.
 *
 * ONE staff member at a time (D-R28, R2). Every per-staff layer — the non-working
 * stripes, the blocked periods, the staff a Block-time write is attributed to — is
 * resolved for the SELECTED member, and the bookings shown are filtered to the same
 * person so the grid describes one coherent day. Before multi-staff shipped the view
 * pinned all of that to `items[0]` while showing EVERYONE's bookings, which with two
 * staff meant reading someone else's appointments against the first member's hours.
 * With a single staff member the selector is not rendered and the view is unchanged.
 *
 * "All staff" (D-R64) is an explicit choice in that selector, never the default: every
 * member's bookings on one grid, each event naming its member, the shading switched to the
 * BUSINESS hours (and saying so), no blocked periods painted and Block time refused —
 * each per-staff layer changes meaning rather than quietly staying on one person
 * (`calendar/staff-scope.js`).
 *
 * DEBT: a resource-column view (a column per member, Fresha-style) is still the natural
 * next step and is deliberately out of scope here — P2 polish.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { __, sprintf } from '@wordpress/i18n';
import { api } from '../lib/api.js';
import { config, businessTimeLine } from '../lib/config.js';
import { toUtcInstant, timeLabel, businessTimeLineAt } from '../lib/format.js';
import { displayNameOf } from '../../shared/person-name.js';
import { renderIcon } from '../lib/icon.jsx';
import { closedIntervals, effectiveOpenByDow } from '../lib/schedule.js';
import { PageHeader, RouteLoading, RouteError } from '../lib/ui.jsx';
import { useToast } from '../lib/toast.jsx';
import { useConfirmDialog } from '../lib/confirm.jsx';
import { fetchLocations, matchesLocationFilter, NO_LOCATION } from '../lib/branches.js';
import { fetchAllDayBookings } from '../lib/day-sheet.js';
import { ApontoCalendar } from '../calendar/ApontoCalendar.jsx';
import { planSlotSelection } from '../calendar/slot-select.js';
import { ALL_STAFF, isAllStaff, bookingQueryForStaff, bookingBelongsToStaff, scopesToOneStaff, resolveSelectedStaff, staffSelectorOptions, slotBookingPrefill } from '../calendar/staff-scope.js';
import { TZ, toBusinessLocalDate, businessLocalDateToUtcIso } from '../calendar/constants.js';
import { deriveSlotWindow } from '../calendar/window.js';

// Event colours + the status filter. `no_show` (D-R33) carries a neutral tone rather than a
// second red: the appointment happened, it just went unattended.
const STATUS_OPTIONS = [ 'pending', 'confirmed', 'completed', 'cancelled', 'no_show' ];
const STATUS_FILTER_LABELS = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No-show' };
const WINDOW_DAYS = 42;

function dayAtMinutes( midnight, minutes ) {
	const d = new Date( midnight );
	d.setMinutes( minutes );
	return d;
}

/**
 * The Calendar's filters survive a round-trip to #bookings (D-R63 fix round 4): the route unmounts
 * there, and a branch view that reset to "All locations" on the way back would also stop pre-filling
 * the branch on the next slot click. Per-viewer, per-tab `sessionStorage`, namespaced by the site's
 * REST base (two sites on one origin keep their own); every access is guarded — a blocked store
 * simply means the filters start at their defaults, as they always did.
 */
const FILTERS_KEY = `aponto.admin.calendar-filters.v1:${ config.restUrl }`;

export function readCalendarFilters() {
	try {
		const saved = JSON.parse( window.sessionStorage.getItem( FILTERS_KEY ) || '{}' );
		return saved && 'object' === typeof saved ? saved : {};
	} catch {
		return {};
	}
}

function writeCalendarFilters( filters ) {
	try {
		window.sessionStorage.setItem( FILTERS_KEY, JSON.stringify( filters ) );
	} catch {
		// A blocked store is a lost convenience, never an error.
	}
}

/**
 * The New-booking prefill for the toolbar's "+ Add" (T-052).
 *
 * @param {?Date}  viewedDay Business-local first day on screen, or null when today is on screen.
 * @param {string} today     Business-local `Y-m-d`.
 * @return {{returnTo: string, date?: string}} Prefill for the create drawer.
 */
export function addBookingPrefill( viewedDay, today ) {
	const prefill = { returnTo: 'calendar' };
	if ( viewedDay instanceof Date && ! Number.isNaN( viewedDay.getTime() ) ) {
		const pad = ( n ) => String( n ).padStart( 2, '0' );
		const date = `${ viewedDay.getFullYear() }-${ pad( viewedDay.getMonth() + 1 ) }-${ pad( viewedDay.getDate() ) }`;
		if ( date > today ) {
			prefill.date = date;
		}
	}
	return prefill;
}

export function Calendar( { onNavigate } ) {
	const saved = useMemo( readCalendarFilters, [] );
	const showToast = useToast();
	const { confirm, dialog } = useConfirmDialog();
	const [ state, setState ] = useState( { loading: true, error: null } );
	const [ data, setData ] = useState( { bookings: [], total: 0, blocks: [], openByDow: {}, staffId: null } );
	const [ statusFilter, setStatusFilter ] = useState( () => saved.status || 'all' );
	const [ serviceFilter, setServiceFilter ] = useState( () => saved.service || 'all' );
	// D-R63 (+ fix round 1, rest-contract §2.8 addendum): a location filter beside status/service,
	// rendered only when the site HAS locations (all statuses: an archived branch keeps its
	// bookings). A BRANCH scopes the reads themselves — `location_id` on the bookings window, and
	// the member's hours resolved AT that branch for the shading — because a client-side filter over
	// a 100-row window can drop that branch's bookings. "All locations" keeps the wildcard hours.
	const [ locationFilter, setLocationFilter ] = useState( 'all' );
	const [ locations, setLocations ] = useState( [] );
	useEffect( () => {
		let live = true;
		fetchLocations().then( ( { items } ) => {
			if ( ! live || ! items.length ) {
				return;
			}
			setLocations( items );
			// A restored branch applies only once the catalog confirms it still exists ("No
			// location" = `0` always does); a site with no locations never scopes by one.
			const restored = String( saved.location ?? 'all' );
			if ( '0' === restored || items.some( ( location ) => String( location.id ) === restored ) ) {
				setLocationFilter( restored );
			}
		} );
		return () => { live = false; };
	}, [] ); // eslint-disable-line react-hooks/exhaustive-deps -- `saved` is read once per mount.
	const [ blockMode, setBlockMode ] = useState( false );
	const [ daySheet, setDaySheet ] = useState( { date: null, items: [] } );
	// The FULL staff roster (active AND archived) and the member the grid is describing. A view
	// preference, not a setting: it lives in this tab's session only (fix round 4 — see
	// `readCalendarFilters()`), with no option, nothing to migrate and nothing shared between admins.
	//
	// `status: 'all'` is load-bearing, not defensive (Codex review): an archived member keeps the
	// bookings they already had, so scoping off the ACTIVE count let those bookings bleed onto the
	// remaining active member's calendar the moment the active count fell back to 1. See
	// `calendar/staff-scope.js`.
	const [ roster, setRoster ] = useState( { loaded: false, items: [] } );
	// Seeded from the session (fix round 4); the roster effect still validates it through
	// `resolveSelectedStaff()`, so an archived/deleted member falls back to the first one — and a
	// remembered "All staff" (D-R64) holds only while the roster still offers it.
	const [ staffId, setStaffId ] = useState( () => ( isAllStaff( saved.staffId ) ? ALL_STAFF : Number( saved.staffId ) || null ) );
	useEffect( () => {
		writeCalendarFilters( { status: statusFilter, service: serviceFilter, location: locationFilter, staffId } );
	}, [ statusFilter, serviceFilter, locationFilter, staffId ] );
	// The grid's ACTIVE RANGE, reported by Event Calendar (`datesSet`). The window and the stripes
	// are derived for what is ON SCREEN, so a day off six weeks out cannot reshape this week and
	// the day view is not stretched by another weekday's hours (Codex review P2-1). Null until the
	// calendar mounts and reports one — the derivation then falls back to everything, which is only
	// ever too wide, never clipping.
	const [ range, setRange ] = useState( null );

	// Identity-stable: EC re-reports the same range on option changes, and a new object every time
	// would re-derive the window (and every stripe) for nothing.
	const onRangeChange = useCallback( ( next ) => {
		setRange( ( prev ) => {
			const same = prev && next
				&& prev.start?.getTime() === next.start?.getTime()
				&& prev.end?.getTime() === next.end?.getTime();

			return same ? prev : next;
		} );
	}, [] );

	// The roster loads ONCE. Split from `load` on purpose: re-fetching it whenever the selection
	// changes would let a mid-session staff edit silently move the selector under the user.
	useEffect( () => {
		let live = true;
		api.get( '/staff', { status: 'all', per_page: 100 } )
			.then( ( res ) => {
				if ( ! live ) {
					return;
				}
				const items = res.items || [];
				setRoster( { loaded: true, items } );
				setStaffId( ( current ) => resolveSelectedStaff( items, current ) );
			} )
			.catch( ( err ) => {
				if ( live ) {
					setState( { loading: false, error: err.message } );
				}
			} );
		return () => { live = false; };
	}, [] );

	const staffCount = roster.items.length;
	// D-R63 fix round 2: a monotonic token per load, so an OLDER branch/staff response that lands
	// after a newer selection's can never overwrite its bookings and shading (the LocationsRoute
	// pattern). `loadedOnce` keeps the grid — and the filters — on screen during a RE-load, which is
	// what makes two quick selections possible at all.
	const loadToken = useRef( 0 );
	const loadedOnce = useRef( false );

	const load = useCallback( () => {
		if ( ! roster.loaded ) {
			return;
		}
		const token = ++loadToken.current;
		setState( { loading: true, error: null } );
		const from = toUtcInstant( Date.now() - WINDOW_DAYS * 86400000 );
		const to = toUtcInstant( Date.now() + WINDOW_DAYS * 86400000 );
		const bookingQuery = bookingQueryForStaff( { status: 'all', from, to, per_page: 100 }, staffId, staffCount );
		const branch = 'all' === locationFilter ? null : Number( locationFilter );
		if ( null !== branch ) {
			bookingQuery.location_id = branch;
		}
		// D-R64: in the All-staff scope there is no one member whose blocks or hours apply — the
		// shading is the BUSINESS hours (the wildcard `(0,0,0)` rows, read fresh so an edit made in
		// Settings this session shows; the boot snapshot is the fallback) and no blocks are painted.
		const member = staffId && ! isAllStaff( staffId ) ? staffId : null;
		let hours = Promise.resolve( { weekly: null } );
		if ( member ) {
			// resolved=1: server merges own + business hours (§1.3) so the client no
			// longer resolves inheritance from two sources. `weekly: null` marks "no
			// resolved answer" (fetch failed / no staff) → boot-snapshot fallback; a
			// SUCCESSFUL empty weekly is authoritative (closed all week → full stripes).
			hours = api.get( `/staff/${ member }/schedule`, { resolved: 1, location_id: branch || undefined } ).catch( () => ( { weekly: null } ) );
		} else if ( staffId ) {
			hours = api.get( '/business-hours' ).catch( () => ( { weekly: null } ) );
		}
		Promise.all( [
			api.get( '/bookings', bookingQuery ).catch( () => ( { items: [] } ) ),
			member ? api.get( '/blocked-periods', { staff_id: member, from, to, per_page: 100 } ).catch( () => ( { items: [] } ) ) : Promise.resolve( { items: [] } ),
			hours,
		] )
			.then( ( [ bookings, blocks, schedule ] ) => {
				if ( token !== loadToken.current ) {
					return;
				}
				loadedOnce.current = true;
				const openByDow = effectiveOpenByDow( schedule.weekly, config.businessHours );
				const items = bookings.items || [];
				// `total` is the server's count for the window; more than the 100 rows read means the
				// grid is incomplete, and the route says so (likeliest in the All-staff scope).
				setData( { bookings: items, total: Number( bookings.total ) || items.length, blocks: blocks.items || [], openByDow, staffId } );
				setState( { loading: false, error: null } );
			} )
			.catch( ( err ) => { if ( token === loadToken.current ) setState( { loading: false, error: err.message } ); } );
	}, [ roster.loaded, staffCount, staffId, locationFilter ] );

	useEffect( load, [ load ] );

	const serviceOptions = useMemo( () => {
		const names = new Set( data.bookings.map( ( b ) => b.service?.name ).filter( Boolean ) );
		return [ ...names ].sort();
	}, [ data.bookings ] );

	// The TIMED events — the ones a person books and reads. Kept apart from the background
	// stripes because the visible window is derived from them: an event that is rendered must
	// never fall outside the window (that is the bug), and an event that is NOT rendered — hidden
	// by the status or service filter — must not widen the grid either.
	const timed = useMemo( () => {
		const items = [];
		// D-R64: with every member on one grid, each event has to say whose it is.
		const allView = isAllStaff( data.staffId );

		// Blocked periods render as LABELLED events (not plain stripes) so a "meeting"/"lunch" is
		// distinguishable from closed business hours (C3, finding U2). The reason rides the event for
		// the on-event label + hover tooltip (event-content.js / ApontoCalendar eventDidMount).
		data.blocks.forEach( ( block ) => items.push( {
			id: `blk-${ block.id }`,
			start: toBusinessLocalDate( block.start_datetime_utc, TZ ),
			end: toBusinessLocalDate( block.end_datetime_utc, TZ ),
			classNames: [ 'ap-blocked' ],
			extendedProps: { kind: 'blocked', reason: block.reason || '' },
		} ) );

		// Booking events, coloured by status, filtered by staff + status + service. The staff
		// filter is applied here as well as in the query so the grid can never show an
		// appointment belonging to someone other than the member whose hours are shaded — a
		// stale response arriving after a selector change would otherwise do exactly that.
		data.bookings.forEach( ( b ) => {
			if ( ! bookingBelongsToStaff( b, data.staffId, staffCount ) ) {
				return;
			}
			if ( statusFilter !== 'all' && b.status !== statusFilter ) {
				return;
			}
			if ( serviceFilter !== 'all' && b.service?.name !== serviceFilter ) {
				return;
			}
			if ( ! matchesLocationFilter( b, locationFilter ) ) {
				return;
			}
			// A cancelled checkout nobody ever placed is not an appointment (persona QA 2026-10-05,
			// #82): it stays in the Bookings list under Cancelled and off the grid.
			if ( b.checkout_abandoned === true ) {
				return;
			}
			items.push( {
				id: `bk-${ b.id }`,
				start: toBusinessLocalDate( b.start_utc, TZ ),
				end: toBusinessLocalDate( b.end_utc, TZ ),
				classNames: [ 'ap-ev', `ap-ev--${ b.status }` ],
				extendedProps: { kind: 'booking', status: b.status, customer: displayNameOf( b.customer ), service: b.service?.name || '', bookingId: b.id, ...( allView ? { staff: displayNameOf( b.staff ) } : {} ) },
			} );
		} );

		return { items };
	}, [ data, staffCount, statusFilter, serviceFilter, locationFilter ] );

	// THE VISIBLE WINDOW (beta bug): the grid used to be pinned to 07:00–21:00, and Event Calendar
	// simply does not draw an event lying outside its slot range — a salon opening at 06:00 or
	// closing at 22:00 lost appointments off the admin calendar with no scrollbar, marker or error
	// to say so. It is derived instead, from the SAME resolved schedule the stripes are drawn from
	// (no extra REST call) plus the events above, and stays 07:00–21:00 when nothing pushes it.
	// Scoped to the ACTIVE RANGE the grid reports, so one late booking (or one day off) cannot
	// reshape a week it is not even on — `calendar/window.js` holds the rules.
	const slotWindow = useMemo(
		() => deriveSlotWindow( { openByDow: data.openByDow, events: timed.items, range } ),
		[ data.openByDow, timed, range ]
	);

	const events = useMemo( () => {
		const out = [];

		// Non-working stripes from the EFFECTIVE weekly schedule (§1.3). Every weekday is
		// evaluated: a day without an open period in the effective set — explicit closed row or
		// absent — is striped across the whole visible window (Sat/Sun closed, fully-closed days,
		// or a zero-config install where nothing is working yet). They span the DERIVED window, so
		// an hour the grid gained (early open, late booking) is shaded exactly like the rest.
		const base = toBusinessLocalDate( Date.now(), TZ );
		base.setHours( 0, 0, 0, 0 );
		for ( let offset = -WINDOW_DAYS; offset <= WINDOW_DAYS; offset += 1 ) {
			const day = new Date( base );
			day.setDate( base.getDate() + offset );
			const dow = ( day.getDay() + 6 ) % 7; // 0 = Monday
			closedIntervals( data.openByDow[ dow ] || [], slotWindow.minMinutes, slotWindow.maxMinutes ).forEach( ( [ s, e ], i ) => out.push( {
				id: `nw-${ offset }-${ i }`,
				start: dayAtMinutes( day, s ),
				end: dayAtMinutes( day, e ),
				display: 'background',
				classNames: [ 'ap-nonwork' ],
				extendedProps: { kind: 'nonwork' },
			} ) );
		}

		return out.concat( timed.items );
	}, [ data.openByDow, slotWindow, timed ] );

	// Print day-sheet (C4, review F item 6): fetch the viewed day COMPLETELY before printing — its
	// own paginated request, all statuses, no service filter — so the sheet never inherits the
	// calendar's 100-row window cap or its on-screen filters.
	const printDaySheet = async ( viewDayLocal ) => {
		const dayStart = new Date( viewDayLocal );
		dayStart.setHours( 0, 0, 0, 0 );
		const dayEnd = new Date( dayStart );
		dayEnd.setDate( dayStart.getDate() + 1 );
		try {
			const items = await fetchAllDayBookings(
				api,
				businessLocalDateToUtcIso( dayStart, TZ ),
				businessLocalDateToUtcIso( dayEnd, TZ )
			);
			setDaySheet( { date: dayStart, items } );
			// Let React paint the sheet before the print dialog freezes rendering.
			setTimeout( () => window.print(), 80 );
		} catch ( err ) {
			showToast( 'Could not load the day’s bookings for printing.', 'danger' );
		}
	};

	// Fix round 3: while a RE-load is unsettled the grid still shows the PREVIOUS selection's
	// bookings and hours, so acting on it would mix the old staff/hours with the new filter — a slot
	// click, block time and event clicks are inert (and the card says busy) until the token settles.
	const reloading = state.loading && loadedOnce.current;

	const openBooking = ( id ) => {
		if ( reloading ) {
			return;
		}
		window.__apontoPendingOpenId = id;
		onNavigate( 'bookings' );
	};
	const newBooking = ( prefill = true ) => {
		window.__apontoPendingCreate = prefill;
		onNavigate( 'bookings' );
	};
	// The toolbar's "+ Add" (persona QA 2026-10-05, T-052). The create drawer lives on the Bookings
	// route, so the click still goes there — but it now opens on the day being VIEWED rather than
	// today (never a past day: the drawer's date input starts at today), and every way out of it
	// comes back to the calendar, exactly like a free-slot click.
	const addBooking = ( viewedDay ) => {
		newBooking( addBookingPrefill( viewedDay, config.business.today ) );
	};

	// A block belongs to ONE person (D-R64), so the All-staff scope disarms an armed Block time.
	const allStaffSelected = isAllStaff( staffId );
	useEffect( () => {
		if ( allStaffSelected ) {
			setBlockMode( false );
		}
	}, [ allStaffSelected ] );

	// Escape leaves an armed block mode cleanly: the mode changes what every click on the grid
	// does, so it must be dismissable without hunting for the toolbar button again.
	useEffect( () => {
		if ( ! blockMode ) {
			return undefined;
		}
		const onKey = ( e ) => {
			if ( e.key === 'Escape' ) {
				setBlockMode( false );
			}
		};
		document.addEventListener( 'keydown', onKey );
		return () => document.removeEventListener( 'keydown', onKey );
	}, [ blockMode ] );

	const onSelect = async ( info ) => {
		if ( reloading ) {
			return;
		}
		const { action, start, end } = planSlotSelection( info, { blockMode: blockMode && ! isAllStaff( data.staffId ), staffId: data.staffId } );
		if ( action === 'booking' ) {
			// Click a free slot → prefill New booking with the clicked business-local
			// start (date + slot preselect once availability confirms it).
			// Carries the SELECTED staff member: the slot was clicked against their hours, so the
			// booking must be created for them rather than falling back to any-staff availability
			// (which could hand it to somebody else entirely). In the All-staff scope nobody is
			// preselected (D-R64): the grid showed no one's hours in particular.
			// `returnTo`: Cancel on that New booking brings the operator back here (fix round 2).
			newBooking( { ...slotBookingPrefill( start, businessLocalDateToUtcIso( start, TZ ), data.staffId, 'all' === locationFilter ? null : locationFilter ), returnTo: 'calendar' } );
			return;
		}
		if ( action === 'block-needs-staff' ) {
			// Disarm too: with no staff row the mode can never succeed, so staying armed would
			// swallow every further click.
			showToast( 'Add a staff member before blocking time.', 'danger' );
			setBlockMode( false );
			return;
		}
		// Capture an optional note (C3) so the block is labelled on the calendar — via the in-app
		// dialog (C13), not a native prompt. `confirm` resolves false on cancel, else the note string.
		const reason = await confirm( {
			title: 'Block this time?',
			message: 'It becomes unavailable for new bookings. Add a note so you can tell it apart from closed hours.',
			confirmText: 'Block time',
			prompt: 'reason',
			promptLabel: 'Note (optional) — e.g. Lunch, Staff meeting',
			promptPlaceholder: 'e.g. Lunch, Staff meeting',
		} );
		if ( reason === false ) {
			setBlockMode( false );
			return;
		}
		try {
			await api.post( '/blocked-periods', {
				staff_id: data.staffId,
				start_datetime_utc: businessLocalDateToUtcIso( start, TZ ),
				end_datetime_utc: businessLocalDateToUtcIso( end, TZ ),
				reason: reason || '',
			} );
			showToast( 'Time blocked.', 'success' );
			setBlockMode( false );
			load();
		} catch ( err ) {
			showToast( err.message, 'danger' );
		}
	};

	if ( state.loading && ! loadedOnce.current ) {
		return <div className="pd-page"><PageHeader title="Calendar" /><RouteLoading label="Loading calendar" /></div>;
	}
	if ( state.error ) {
		return <div className="pd-page"><PageHeader title="Calendar" /><RouteError message={ state.error } onRetry={ load } /></div>;
	}

	const blockButton = (
		<button
			className={ `ap-cal-btn ap-cal-btn--ghost${ blockMode ? ' is-active' : '' }` }
			type="button"
			aria-pressed={ blockMode }
			disabled={ reloading || allStaffSelected }
			title={ allStaffSelected ? __( 'Choose a staff member to block time', 'aponto' ) : undefined }
			onClick={ () => setBlockMode( ( v ) => ! v ) }
		>
			{ renderIcon( 'prohibit' ) }{ blockMode ? 'Blocking… pick a slot' : 'Block time' }
		</button>
	);

	return (
		<div className="pd-page">
			<PageHeader title="Calendar" description={ range?.start ? businessTimeLineAt( businessLocalDateToUtcIso( range.start, TZ ) ) : businessTimeLine } />
			<div className="ap-cal-card" aria-busy={ reloading || undefined }>
				<div className="ap-cal-filters">
					<span className="ap-cal-filters-label">Filters</span>
					{ /* One staff ROW ever = nothing to choose, so the control is not rendered at all
					     and the bar is exactly what it always was (D-R28). Archived members are
					     listed, suffixed, because their existing bookings are still on the calendar
					     and must stay reachable. Option identity is the record ID: two staff may
					     share a name. */ }
					{ scopesToOneStaff( staffCount ) ? (
						<select
							className="pd-select"
							aria-label="Show calendar for staff member"
							value={ staffId ?? '' }
							onChange={ ( e ) => setStaffId( isAllStaff( e.target.value ) ? ALL_STAFF : Number( e.target.value ) || null ) }
						>
							{ staffSelectorOptions( roster.items, __( 'All staff', 'aponto' ) ).map( ( option ) => (
								<option key={ option.id } value={ option.id }>{ option.label }</option>
							) ) }
						</select>
					) : null }
					<select className="pd-select" aria-label="Filter by status" value={ statusFilter } onChange={ ( e ) => setStatusFilter( e.target.value ) }>
						<option value="all">All statuses</option>
						{ STATUS_OPTIONS.map( ( s ) => <option key={ s } value={ s }>{ STATUS_FILTER_LABELS[ s ] }</option> ) }
					</select>
					<select className="pd-select" aria-label="Filter by service" value={ serviceFilter } onChange={ ( e ) => setServiceFilter( e.target.value ) }>
						<option value="all">All services</option>
						{ serviceOptions.map( ( s ) => <option key={ s } value={ s }>{ s }</option> ) }
					</select>
					{ locations.length ? (
						<select className="pd-select" aria-label={ __( 'Filter by location', 'aponto' ) } value={ locationFilter } onChange={ ( e ) => setLocationFilter( e.target.value ) }>
							<option value="all">{ __( 'All locations', 'aponto' ) }</option>
							{ locations.map( ( l ) => <option key={ l.id } value={ l.id }>{ l.name }</option> ) }
							<option value={ NO_LOCATION }>{ __( 'No location', 'aponto' ) }</option>
						</select>
					) : null }
				</div>
				{ /* The shading note follows what is ON the grid (`data`), not the selector mid-load. */ }
				{ /* Founder 2026-09-28: the "hours across all locations" note for one member + All locations
				     is removed — that shading is the member's own default week, which needs no caption. */ }
				{ isAllStaff( data.staffId ) ? (
					<p className="ap-list-note">{ __( 'Shading shows business hours. Choose a staff member to see their hours.', 'aponto' ) }</p>
				) : null }
				{ data.total > data.bookings.length ? (
					<p className="ap-list-note" role="status">
						{ sprintf(
							/* translators: 1: bookings shown, 2: bookings in the window. */
							__( 'Showing the first %1$d of %2$d bookings in this window — filter by staff member or location to see the rest.', 'aponto' ),
							data.bookings.length,
							data.total
						) }
					</p>
				) : null }
				<ApontoCalendar
					events={ events }
					slotWindow={ slotWindow }
					onRangeChange={ onRangeChange }
					onEventClick={ openBooking }
					onSelect={ onSelect }
					onAdd={ addBooking }
					onPrint={ printDaySheet }
					toolbarExtra={ blockButton }
					isBlocking={ blockMode }
				/>
			</div>
			<div className="ap-daysheet" role="region" aria-label="Day sheet for printing">
				<div className="ap-daysheet-head">
					<h1>{ config.business.name || 'Bookings' }</h1>
					<p>{ daySheet.date ? daySheet.date.toLocaleDateString( undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' } ) : '' } · Day sheet</p>
					<p className="ap-daysheet-scope">All bookings for this day — the calendar’s on-screen status and service filters are not applied.</p>
				</div>
				{ daySheet.items.length ? (
					<table className="ap-daysheet-table">
						<thead><tr><th>Time</th><th>Customer</th><th>Service</th><th>Status</th></tr></thead>
						<tbody>
							{ daySheet.items.map( ( b ) => (
								<tr key={ b.id }>
									<td>{ timeLabel( b.start_utc, TZ ) }</td>
									<td>{ displayNameOf( b.customer ) || '—' }</td>
									<td>{ b.service?.name || '—' }</td>
									<td>{ b.status || '' }</td>
								</tr>
							) ) }
						</tbody>
					</table>
				) : <p className="ap-daysheet-empty">No bookings for this day.</p> }
			</div>
			{ dialog }
		</div>
	);
}

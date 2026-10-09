/**
 * eventContent render hook (Q10 criterion c) — ported from the spike. Background
 * (non-working) events return nothing so EC keeps its plain rect (stripe from CSS).
 * Bookings render a compact 3-line card: time · customer · service. Colour is
 * carried by `ap-ev--{status}` already on the event.
 *
 * In the All-staff scope (D-R64) the booking carries `staff` and the TIME line LEADS with
 * "<member> · ": the time line is the one a 30-minute event never hides (the service line
 * drops out below 34px), so the name survives on the shortest card. It leads rather than
 * trails (persona QA 2026-10-05, T-052): in a week column the line is cut after
 * "9:00 – 10:0…", so a trailing name was never on screen — and the event's position on the
 * grid already says when it is. The whole card also carries the full text as its tooltip.
 */
export function eventContent( info ) {
	const { event, timeText } = info;

	// Blocked periods (C3): a labelled block so a "meeting"/"lunch" reads differently from plain
	// closed hours. Non-working stripes (kind 'nonwork') still return nothing → EC keeps the plain
	// background rect.
	if ( event.extendedProps.kind === 'blocked' ) {
		const root = document.createElement( 'div' );
		root.className = 'ap-blocked-label';
		const reason = event.extendedProps.reason || '';
		root.textContent = reason || 'Blocked';
		if ( reason ) {
			root.title = reason; // native tooltip on the label
		}
		return { domNodes: [ root ] };
	}

	if ( event.extendedProps.kind !== 'booking' ) {
		return undefined;
	}

	const root = document.createElement( 'div' );
	root.className = 'ap-ev-card';

	const time = document.createElement( 'span' );
	time.className = 'ap-ev-time';
	if ( event.extendedProps.staff ) {
		const staff = document.createElement( 'span' );
		staff.className = 'ap-ev-staff';
		staff.textContent = `${ event.extendedProps.staff } · `;
		time.append( staff, timeText );
	} else {
		time.textContent = timeText;
	}

	const name = document.createElement( 'span' );
	name.className = 'ap-ev-name';
	name.textContent = event.extendedProps.customer || '';

	const svc = document.createElement( 'span' );
	svc.className = 'ap-ev-svc';
	svc.textContent = event.extendedProps.service || '';

	root.title = [ timeText, event.extendedProps.staff, event.extendedProps.customer, event.extendedProps.service ].filter( Boolean ).join( ' · ' );
	root.append( time, name, svc );
	return { domNodes: [ root ] };
}

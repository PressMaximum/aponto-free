/**
 * eventContent render hook (Q10 criterion c) — ported from the spike. Background
 * (non-working) events return nothing so EC keeps its plain rect (stripe from CSS).
 * Bookings render a compact 3-line card: time · customer · service. Colour is
 * carried by `ap-ev--{status}` already on the event.
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
	time.textContent = timeText;

	const name = document.createElement( 'span' );
	name.className = 'ap-ev-name';
	name.textContent = event.extendedProps.customer || '';

	const svc = document.createElement( 'span' );
	svc.className = 'ap-ev-svc';
	svc.textContent = event.extendedProps.service || '';

	root.append( time, name, svc );
	return { domNodes: [ root ] };
}

/**
 * Calendar constants + business-timezone helpers.
 *
 * Event Calendar v5 renders events in the BROWSER's local wall-clock. To show
 * BUSINESS time regardless of the admin's browser timezone, every UTC instant is
 * converted to a "business-local Date": a browser-local Date whose components
 * equal the business-timezone components of the instant (DST-correct per instant).
 * The now-indicator and non-working stripes use the same business-minute frame.
 */
import { config } from '../lib/config.js';

export const TZ = config.business.timezone;

// The visible working window of the time grid is NOT a constant: it is derived per render from
// the business hours and the events on screen so nothing is ever clipped out of sight. It lives
// in `window.js`; 07:00–21:00 survives there as the DEFAULT (`DEFAULT_SLOT_WINDOW`).

const WEEKDAY_INDEX = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

/** Business-timezone calendar components of a UTC instant. */
export function businessParts( utc, tz = TZ ) {
	const parts = new Intl.DateTimeFormat( 'en-US', {
		timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
		hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short',
	} ).formatToParts( new Date( utc ) );
	const map = {};
	parts.forEach( ( p ) => { map[ p.type ] = p.value; } );
	let hour = Number( map.hour );
	if ( hour === 24 ) {
		hour = 0;
	}
	return {
		year: Number( map.year ),
		month: Number( map.month ),
		day: Number( map.day ),
		hour,
		minute: Number( map.minute ),
		dow: WEEKDAY_INDEX[ map.weekday ] ?? 0, // 0 = Monday
	};
}

/** A browser-local Date whose components equal the business-tz components of `utc`. */
export function toBusinessLocalDate( utc, tz = TZ ) {
	const p = businessParts( utc, tz );
	return new Date( p.year, p.month - 1, p.day, p.hour, p.minute, 0, 0 );
}

/** Current time in the business timezone, as minutes from midnight. */
export function businessNowMinutes( tz = TZ ) {
	const p = businessParts( Date.now(), tz );
	return p.hour * 60 + p.minute;
}

/** Offset (minutes) of a timezone at a given INSTANT: businessLocal − UTC. */
function tzOffsetMinutes( tz, instantMs ) {
	const p = businessParts( instantMs, tz );
	const asUtc = Date.UTC( p.year, p.month - 1, p.day, p.hour, p.minute );
	return Math.round( ( asUtc - instantMs ) / 60000 );
}

const DAY_MS = 86400000;

/** Whether `instantMs` really renders as the requested wall clock in `tz`. */
function rendersAs( instantMs, tz, wall ) {
	const p = businessParts( instantMs, tz );
	return p.year === wall.year && p.month === wall.month && p.day === wall.day
		&& p.hour === wall.hour && p.minute === wall.minute;
}

/**
 * Business WALL CLOCK → the true UTC instant (ms), DST-correct for any IANA zone.
 *
 * A zone's offset is a property of an INSTANT, not of a date, so a wall clock cannot be
 * converted by subtracting one guessed offset (invariant §5.5 — never shift by a scalar UTC
 * offset). The single-guess version was wrong by an hour on every transition day: reading
 * 2026-03-08 07:00 America/Los_Angeles as UTC lands BEFORE the 10:00Z switch, so it picked
 * PST (−08:00) and produced 15:00Z instead of the true 14:00Z (QA, Codex review item 3).
 *
 * The fix is the standard iterative Intl technique: guess with the offset at the wall clock
 * read as UTC, re-derive the offset AT the guessed instant, and use that — two passes converge
 * for every ordinary wall clock. A day either side is probed as well so that BOTH sides of a
 * nearby transition are candidates, and the candidates are then verified by formatting them
 * back:
 *
 *   - normal wall clock → exactly one candidate renders back; it is returned;
 *   - AMBIGUOUS (the repeated hour of a fall-back, e.g. 2026-11-01 01:30 Los Angeles) → two
 *     candidates render back and the LATER one (post-transition, 09:30Z = 01:30 PST) wins;
 *   - NONEXISTENT (the skipped hour of a spring-forward, e.g. 2026-03-08 02:30) → none render
 *     back, and the latest candidate is returned, which is the first instant AFTER the gap
 *     (10:30Z = 03:30 PDT).
 *
 * Both edge choices are deterministic and documented rather than left to the zone data order.
 *
 * @param {{year:number, month:number, day:number, hour:number, minute:number}} wall Business
 *        wall-clock components (`month` is 1-based).
 * @param {string} [tz] IANA business timezone.
 * @return {number} UTC instant in milliseconds.
 */
export function wallClockToUtcMs( wall, tz = TZ ) {
	const asUtc = Date.UTC( wall.year, wall.month - 1, wall.day, wall.hour, wall.minute );
	const first = tzOffsetMinutes( tz, asUtc );
	const second = tzOffsetMinutes( tz, asUtc - first * 60000 );
	const offsets = [
		first,
		second,
		tzOffsetMinutes( tz, asUtc - DAY_MS ),
		tzOffsetMinutes( tz, asUtc + DAY_MS ),
	];
	const candidates = [ ...new Set( offsets ) ]
		.map( ( offset ) => asUtc - offset * 60000 )
		.sort( ( a, b ) => a - b );
	const exact = candidates.filter( ( ms ) => rendersAs( ms, tz, wall ) );
	const pick = exact.length ? exact : candidates;

	return pick[ pick.length - 1 ];
}

/**
 * Inverse of toBusinessLocalDate: an EC-select Date (whose browser-local
 * components equal a business wall-clock) → the true UTC ISO instant.
 */
export function businessLocalDateToUtcIso( localDate, tz = TZ ) {
	const ms = wallClockToUtcMs(
		{
			year: localDate.getFullYear(),
			month: localDate.getMonth() + 1,
			day: localDate.getDate(),
			hour: localDate.getHours(),
			minute: localDate.getMinutes(),
		},
		tz
	);
	// Milliseconds-free RFC3339: the REST `utc` rule rejects `.SSSZ` and the
	// availability slot strings compare exactly.
	return new Date( ms ).toISOString().replace( /\.\d{3}Z$/, 'Z' );
}

/**
 * Timezone model — SPEC-P1 §2.2 "BẤT BIẾN TIMEZONE" (D1 = A′).
 *
 * Every visible time in the widget goes through ONE formatter that takes a
 * `(utc_instant, display_tz)` pair. There is no hand-rolled time math anywhere
 * else — that is the whole point of this module. Slots carry UTC instants, zones
 * are IANA names, and the friendly `City (GMT±N)` label is resolved at the slot's
 * own instant so DST and fractional offsets stay correct.
 *
 * The `City (GMT±N)` label is byte-for-byte identical to the PHP server helper
 * `Aponto\Rest\Support\TimezoneLabel` (rest-contract §3.5) — ASCII minus, hours
 * with no leading zero, minutes only when non-zero. Matching the server keeps the
 * six D1 surfaces (slot picker · summary · confirm · success · manage page ·
 * email) visually identical; the first four are this widget, the last two are
 * server-rendered.
 *
 * Pure module: no Preact, no DOM. Unit-testable under node/jest.
 */

/**
 * Legacy → canonical IANA aliases. Browsers may report deprecated zone names
 * (this machine reports `Asia/Saigon` for Vietnam) that a strict server
 * `DateTimeZone::listIdentifiers()` check rejects. Canonicalizing on the client
 * keeps the widget working AND makes the deterministic init rule treat an alias
 * and its canonical business zone as the same zone. Covers the common aliases;
 * the fuller fix is server-side (see report ripple).
 */
const ZONE_ALIASES = {
	'Asia/Saigon': 'Asia/Ho_Chi_Minh',
	'Asia/Calcutta': 'Asia/Kolkata',
	'Asia/Katmandu': 'Asia/Kathmandu',
	'Asia/Rangoon': 'Asia/Yangon',
	'Asia/Ulan_Bator': 'Asia/Ulaanbaatar',
	'Asia/Thimbu': 'Asia/Thimphu',
	'Asia/Dacca': 'Asia/Dhaka',
	'Asia/Istanbul': 'Europe/Istanbul',
	'Europe/Kiev': 'Europe/Kyiv',
	'Europe/Uzhgorod': 'Europe/Kyiv',
	'Europe/Nicosia': 'Asia/Nicosia',
	'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
	'America/Godthab': 'America/Nuuk',
	'Pacific/Ponape': 'Pacific/Pohnpei',
	'Pacific/Truk': 'Pacific/Chuuk',
	GMT: 'UTC',
	'Etc/GMT': 'UTC',
	'Etc/UTC': 'UTC',
};

/**
 * Map a possibly-legacy IANA zone name to its canonical form.
 *
 * @param {string} iana IANA name.
 * @return {string} Canonical IANA name.
 */
export function canonicalizeZone( iana ) {
	return ZONE_ALIASES[ iana ] || iana;
}

/**
 * Accept an ISO string, epoch ms number, or Date and return a Date.
 * @param {Date|number|string} instant Instant.
 */
function toDate( instant ) {
	if ( instant instanceof Date ) {
		return instant;
	}
	if ( typeof instant === 'number' ) {
		return new Date( instant );
	}
	return new Date( String( instant ) );
}

/**
 * Two-digit zero pad.
 *
 * @param {number} n Number.
 * @return {string} Padded string.
 */
function pad2( n ) {
	return n < 10 ? '0' + n : '' + n;
}

/**
 * Offset (in minutes) of an IANA zone at a given instant — Intl-derived, so DST
 * and fractional offsets (e.g. `Asia/Kathmandu` +5:45) are always correct. The
 * "format the instant as wall-clock in the zone, diff against the UTC instant"
 * trick is the standard way to get an offset for an arbitrary IANA zone in JS.
 *
 * @param {string}             iana    IANA timezone name.
 * @param {Date|number|string} instant UTC instant.
 * @return {number} Signed offset in minutes.
 */
export function tzOffsetMinutes( iana, instant ) {
	const date = toDate( instant );
	const dtf = new Intl.DateTimeFormat( 'en-US', {
		timeZone: iana,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	} );
	const p = {};
	dtf.formatToParts( date ).forEach( ( x ) => {
		if ( x.type !== 'literal' ) {
			p[ x.type ] = x.value;
		}
	} );
	const asUtc = Date.UTC(
		+p.year,
		+p.month - 1,
		+p.day,
		+p.hour,
		+p.minute,
		+p.second
	);
	return Math.round( ( asUtc - date.getTime() ) / 60000 );
}

/**
 * THE single formatter: `(utc_instant, display_tz) -> string`. Every rendered
 * time in the widget must flow through here (directly or via {@link fmtTime}).
 *
 * @param {Date|number|string}         instant  UTC instant.
 * @param {string}                     iana     Display timezone (IANA).
 * @param {Intl.DateTimeFormatOptions} options  Intl options.
 * @param {string}                     [locale] BCP-47 locale, defaults to `en-US`.
 * @return {string} Formatted string.
 */
export function formatInTz( instant, iana, options, locale ) {
	return new Intl.DateTimeFormat(
		locale || 'en-US',
		Object.assign( { timeZone: iana }, options )
	).format( toDate( instant ) );
}

/**
 * Clock time in the display zone, e.g. `9:00 AM`.
 *
 * @param {Date|number|string} instant  UTC instant.
 * @param {string}             iana     Display timezone.
 * @param {string}             [locale] Locale.
 * @return {string} Time string.
 */
export function fmtTime( instant, iana, locale ) {
	return formatInTz(
		instant,
		iana,
		{ hour: 'numeric', minute: '2-digit' },
		locale
	);
}

/**
 * Calendar day `YYYY-MM-DD` of an instant in a zone — the basis for grouping
 * flat availability slots into per-day buckets in the display timezone
 * (SPEC-P1 §2.2 / SPEC-P0 §5.5). Uses the `en-CA` locale purely because it
 * formats as `YYYY-MM-DD`.
 *
 * @param {Date|number|string} instant UTC instant.
 * @param {string}             iana    Display timezone.
 * @return {string} `YYYY-MM-DD`.
 */
export function dayKeyInTz( instant, iana ) {
	const p = {};
	new Intl.DateTimeFormat( 'en-CA', {
		timeZone: iana,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	} )
		.formatToParts( toDate( instant ) )
		.forEach( ( x ) => {
			if ( x.type !== 'literal' ) {
				p[ x.type ] = x.value;
			}
		} );
	return p.year + '-' + p.month + '-' + p.day;
}

/**
 * `GMT±N` suffix for a zone at an instant. Matches PHP `TimezoneLabel`: ASCII
 * `-` for negative, hours with no leading zero, minutes only when non-zero.
 *
 * @param {string}             iana       IANA name.
 * @param {Date|number|string} refInstant Instant to resolve the offset at.
 * @return {string} e.g. `GMT+7`, `GMT-8`, `GMT+5:45`.
 */
export function gmtSuffix( iana, refInstant ) {
	const off = tzOffsetMinutes( iana, refInstant );
	const abs = Math.abs( off );
	const h = Math.floor( abs / 60 );
	const m = abs % 60;
	return 'GMT' + ( off < 0 ? '-' : '+' ) + h + ( m ? ':' + pad2( m ) : '' );
}

/**
 * A fixed-offset zone name — what WordPress hands us as the site timezone when
 * the admin never picked a city (`gmt_offset` only): `+00:00`, `-05:30`, `+7`.
 * These have no city to name, so the friendly label degrades to the offset alone.
 *
 * @param {string} iana Zone name.
 * @return {boolean} True for an offset-form zone.
 */
function isOffsetZone( iana ) {
	return /^[+-]\d{1,2}(:\d{2})?$/.test( String( iana ) );
}

/**
 * Friendly `City (GMT±N)` label — identical to the PHP server helper so all six
 * D1 surfaces read the same. The city is the last IANA path segment with
 * underscores turned to spaces (`America/Argentina/Buenos_Aires` -> `Buenos Aires`).
 *
 * A fixed-offset zone has no city: `+00:00` would otherwise render the nonsense
 * `+00:00 (GMT+0)`, so it collapses to the bare `GMT+0`. `TimezoneLabel::label()`
 * applies the same rule, keeping the six D1 surfaces byte-identical.
 *
 * @param {string}             iana       IANA name.
 * @param {Date|number|string} refInstant Instant to resolve the offset at.
 * @return {string} e.g. `Berlin (GMT+2)`, or `GMT+0` for a fixed-offset zone.
 */
export function tzLabel( iana, refInstant ) {
	const suffix = gmtSuffix( iana, refInstant );
	if ( isOffsetZone( iana ) ) {
		return suffix;
	}
	const parts = String( iana ).split( '/' );
	const city = parts[ parts.length - 1 ].replace( /_/g, ' ' );
	return city + ' (' + suffix + ')';
}

/**
 * The browser's resolved IANA timezone, with a safe fallback.
 *
 * @return {string} IANA name.
 */
export function browserTimezone() {
	try {
		const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if ( tz ) {
			return canonicalizeZone( tz );
		}
	} catch {
		// fall through
	}
	return 'UTC';
}

/**
 * Deterministic init rule (SPEC-P1 §2.2): when the browser zone equals the
 * business zone, display = business and NO selector is shown; otherwise display
 * defaults to the browser zone and the selector is shown (with the business-time
 * secondary line). `customer_timezone` is later persisted as whatever display_tz
 * is active at submit — even if the visitor never opened the selector.
 *
 * @param {Object} args            Args.
 * @param {string} args.browserTz  Browser IANA zone.
 * @param {string} args.businessTz Business IANA zone.
 * @return {{displayTz:string, businessTz:string, browserTz:string, showSelector:boolean}} Init state.
 */
export function resolveDisplayTz( { browserTz, businessTz } ) {
	const differs = !! browserTz && !! businessTz && browserTz !== businessTz;
	return {
		browserTz,
		businessTz,
		displayTz: differs ? browserTz : businessTz,
		showSelector: differs,
	};
}

/**
 * Group a flat list of availability slots by calendar day in the display zone.
 * Each slot must expose a `start_utc` (ISO) property. Buckets are keyed by
 * `YYYY-MM-DD` and each bucket is sorted ascending by instant.
 *
 * @param {Array<{start_utc:string}>} slots     Flat slots (as returned by the availability API).
 * @param {string}                    displayTz Display timezone.
 * @return {Object<string, Array>} Map of dayKey -> slots.
 */
export function groupSlotsByDay( slots, displayTz ) {
	const idx = {};
	( slots || [] ).forEach( ( slot ) => {
		const key = dayKeyInTz( slot.start_utc, displayTz );
		( idx[ key ] || ( idx[ key ] = [] ) ).push( slot );
	} );
	Object.keys( idx ).forEach( ( k ) => {
		idx[ k ].sort(
			( a, b ) =>
				new Date( a.start_utc ).getTime() -
				new Date( b.start_utc ).getTime()
		);
	} );
	return idx;
}

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
	return formatInTz( instant, iana, clockOptions(), locale );
}

/**
 * The site's clock convention, as `Intl` options (persona QA 2026-10-05, T-071).
 *
 * The locale alone decided 12 h vs 24 h, so a site whose owner set the time format to `H:i`
 * printed "10:00 PM" in the form and "22:00" in its mails, cart and manage page. The form is one
 * site's form — every instance on a page shares the one setting — so it is module state, set once
 * from the boot config by {@link setTimeFormat} rather than threaded through every call.
 */
let clock = {};

/**
 * @return {Intl.DateTimeFormatOptions} Hour + minute options for the site's clock.
 */
function clockOptions() {
	return Object.assign( { hour: 'numeric', minute: '2-digit' }, clock );
}

/**
 * Adopt the site's WordPress time format (`time_format`, a PHP `date()` pattern): `H` / `G` is
 * a 24-hour clock, `g` / `h` a 12-hour one, and anything else leaves the locale to decide as
 * before. Escaped characters (`\H`) are literals, not hours.
 *
 * @param {string} format PHP time format, or '' for the locale's own convention.
 */
export function setTimeFormat( format ) {
	const f = String( format || '' ).replace( /\\./g, '' );
	if ( /[HG]/.test( f ) ) {
		clock = {
			hourCycle: 'h23',
			hour: f.includes( 'H' ) ? '2-digit' : 'numeric',
		};
	} else if ( /[gh]/.test( f ) ) {
		clock = { hour12: true };
	} else {
		clock = {};
	}
}

/**
 * A clock time in zone `iana`, WITH its date whenever that date is not the one the same instant
 * has in `otherTz` (persona QA 2026-10-05, T-058): "5:30 PM" on the same day, "Fri, Oct 30,
 * 5:30 PM" across midnight. The business-time line used to print the bare time, so a customer
 * booking Saturday 12:30 AM their time read "5:30 PM" as Saturday — the visit is on Friday.
 *
 * @param {Date|number|string} instant  UTC instant.
 * @param {string}             iana     Zone the time is told in.
 * @param {string}             otherTz  Zone whose date the reader already has on screen.
 * @param {string}             [locale] Locale.
 * @return {string} Time, date-qualified when the days differ.
 */
export function fmtTimeAt( instant, iana, otherTz, locale ) {
	if ( dayKeyInTz( instant, iana ) === dayKeyInTz( instant, otherTz ) ) {
		return fmtTime( instant, iana, locale );
	}
	return formatInTz(
		instant,
		iana,
		Object.assign(
			{ weekday: 'short', month: 'short', day: 'numeric' },
			clockOptions()
		),
		locale
	);
}

/**
 * Whether a booking ends on a later calendar day than it starts, in the zone it is shown in —
 * "11:00 PM → 1:00 AM" needs a day marker on its end (persona QA 2026-10-05, T-058).
 *
 * @param {Date|number|string} startUtc Start instant.
 * @param {Date|number|string} endUtc   End instant.
 * @param {string}             iana     Display timezone.
 * @return {boolean} True when the end is on another day.
 */
export function endsNextDay( startUtc, endUtc, iana ) {
	return (
		!! startUtc &&
		!! endUtc &&
		dayKeyInTz( startUtc, iana ) !== dayKeyInTz( endUtc, iana )
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
export function isOffsetZone( iana ) {
	return /^[+-]\d{1,2}(:\d{2})?$/.test( String( iana ) );
}

/**
 * Instants the zone-equivalence check samples: now, then roughly every three
 * months for a year. Two zones only count as the same when their offset agrees
 * at EVERY sample, so a fixed `+01:00` never collapses into `Europe/Berlin`
 * (they agree in January and disagree in July). A year of samples covers the
 * whole horizon the widget can show, and the check runs once at init.
 *
 * @param {Date|number|string} [refInstant] Reference instant (defaults to now).
 * @return {Array<number>} Epoch-ms samples.
 */
function offsetSamples( refInstant ) {
	const base =
		refInstant === undefined || refInstant === null
			? Date.now()
			: toDate( refInstant ).getTime();
	const quarter = 91 * 24 * 60 * 60 * 1000;
	return [ 0, 1, 2, 3, 4 ].map( ( i ) => base + i * quarter );
}

/**
 * Do two zone names denote the same wall clock for every time the widget can show?
 *
 * Names are compared first, after canonicalizing aliases — two DIFFERENT named
 * places stay different even when today's offsets agree, because the business
 * zone is a real city and the visitor is entitled to see both labels. The offset
 * comparison exists for exactly one case: WordPress reports the site timezone as
 * a bare UTC OFFSET (`+07:00`) whenever the admin never picked a city, and an
 * offset can never string-equal the IANA name a browser reports. Without this,
 * such a site shows the selector to EVERY visitor — including the ones already
 * on its own clock (founder report 2026-09-18).
 *
 * @param {string}             a            First zone name.
 * @param {string}             b            Second zone name.
 * @param {Date|number|string} [refInstant] Instant the sample window starts at.
 * @return {boolean} True when the two zones are interchangeable for display.
 */
export function sameDisplayZone( a, b, refInstant ) {
	const left = canonicalizeZone( String( a || '' ) );
	const right = canonicalizeZone( String( b || '' ) );
	if ( ! left || ! right ) {
		return false;
	}
	if ( left === right ) {
		return true;
	}
	// Two named places are two places, whatever today's offset says.
	if ( ! isOffsetZone( left ) && ! isOffsetZone( right ) ) {
		return false;
	}
	try {
		return offsetSamples( refInstant ).every(
			( instant ) =>
				tzOffsetMinutes( left, instant ) ===
				tzOffsetMinutes( right, instant )
		);
	} catch {
		// An engine that rejects offset-form zone ids cannot prove equivalence.
		return false;
	}
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
 * The 17 zones the widget has always offered, kept as the SUGGESTED group at the
 * top of the timezone picker and as the fallback list on an engine that has no
 * `Intl.supportedValuesOf` (Safari < 15.4). It is a short, hand-picked spread of
 * the world's busiest offsets — not an attempt at completeness, which is what
 * {@link allTimezones} is for.
 *
 * @type {Array<string>}
 */
export const COMMON_ZONES = [
	'UTC',
	'America/New_York',
	'America/Chicago',
	'America/Los_Angeles',
	'America/Sao_Paulo',
	'Europe/London',
	'Europe/Berlin',
	'Europe/Paris',
	'Africa/Cairo',
	'Asia/Dubai',
	'Asia/Kolkata',
	'Asia/Bangkok',
	'Asia/Ho_Chi_Minh',
	'Asia/Singapore',
	'Asia/Tokyo',
	'Australia/Sydney',
	'Pacific/Auckland',
];

/**
 * Every IANA zone the ENGINE knows, read at runtime — so the ~430-name list costs
 * the bundle nothing and can never drift from the zone database the browser will
 * actually format with. Falls back to {@link COMMON_ZONES} where
 * `Intl.supportedValuesOf` is missing.
 *
 * @param {Array<string>} [fallback] List to use when the API is unavailable.
 * @return {Array<string>} IANA zone names.
 */
export function allTimezones( fallback ) {
	try {
		if (
			typeof Intl !== 'undefined' &&
			typeof Intl.supportedValuesOf === 'function'
		) {
			const list = Intl.supportedValuesOf( 'timeZone' );
			if ( Array.isArray( list ) && list.length ) {
				return list;
			}
		}
	} catch {
		// fall through to the bundled list
	}
	return ( fallback || COMMON_ZONES ).slice();
}

/**
 * Canonicalize, de-duplicate and sort a zone list, dropping anything that cannot
 * legally become `display_tz`.
 *
 * A bare UTC offset — what WordPress reports as the site zone when the owner never
 * picked a city — is deliberately dropped: `display_tz` is posted back at submit
 * and the REST layer only accepts IANA identifiers, so offering one would build a
 * form that fails at the last step. The studio's own time still shows in the
 * business-time line, which formats an offset perfectly well.
 *
 * @param {Array<string>} zones Raw zone names.
 * @return {Array<string>} Sorted, unique, bookable IANA names.
 */
function bookableZones( zones ) {
	const out = [];
	( zones || [] ).forEach( ( raw ) => {
		const zone = canonicalizeZone( String( raw || '' ) );
		if ( zone && ! isOffsetZone( zone ) && ! out.includes( zone ) ) {
			out.push( zone );
		}
	} );
	return out.sort();
}

/**
 * The full picker list: every zone the engine knows, UNIONED with
 * {@link COMMON_ZONES}, plus any zone the page is already using.
 *
 * The union is not belt-and-braces. `Intl.supportedValuesOf( 'timeZone' )` returns
 * the zone database's own identifiers, and `UTC` is NOT among them on Node or
 * Chromium — so without this, a visitor searching "utc" in the picker found
 * nothing while `UTC` sat pinned in the Suggested group above (Codex review 4).
 * The same applies to any zone the shortlist names that a given runtime spells
 * differently. `extra` covers the reverse case: a browser or business zone ahead
 * of the runtime's tables.
 *
 * @param {Array<string>} [extra] Zones the widget must be able to offer.
 * @return {Array<string>} Sorted, unique, bookable IANA names.
 */
export function timezoneOptions( extra ) {
	return bookableZones(
		allTimezones( COMMON_ZONES )
			.concat( COMMON_ZONES )
			.concat( extra || [] )
	);
}

/**
 * The SUGGESTED group — all the picker shows until the visitor types (search-first,
 * founder review 2026-09-30): where the visitor is, where the business is, and the
 * zone on screen. Ordered by relevance, not alphabetically. The common spread is no
 * longer pinned here; it is one search away like every other city.
 *
 * @param {Array<string>} [extra] Zones to pin (browser, business, current).
 * @return {Array<string>} IANA names, most relevant first.
 */
export function suggestedTimezones( extra ) {
	const out = [];
	( extra || [] ).forEach( ( raw ) => {
		const zone = canonicalizeZone( String( raw || '' ) );
		if ( zone && ! isOffsetZone( zone ) && ! out.includes( zone ) ) {
			out.push( zone );
		}
	} );
	return out;
}

/** Display in the visitor's own browser zone (the default, and what every site did before D-R48). */
export const TZ_MODE_VISITOR = 'visitor';

/** Display in the business zone, and say so — but only to a visitor who is somewhere else. */
export const TZ_MODE_BUSINESS = 'business';

/**
 * Coerce the stored `booking.timezone_mode` to a mode this module understands.
 * Anything unknown (an older bundle, a hand-edited option) reads as `visitor`, so
 * a site can never lose its times to a typo.
 *
 * @param {*} mode Raw mode.
 * @return {'visitor'|'business'} Normalized mode.
 */
export function normalizeTzMode( mode ) {
	return TZ_MODE_BUSINESS === mode ? TZ_MODE_BUSINESS : TZ_MODE_VISITOR;
}

/**
 * Deterministic init rule (SPEC-P1 §2.2, amended by D-R48 — the "quiet timezone"
 * model).
 *
 * `visitor` (default, and what every site did before D-R48): the browser zone
 * wins whenever it is a different clock from the business zone, exactly as
 * before. `business`: the business zone wins regardless of where the visitor is,
 * and {@link showNote} asks the UI to say so — but ONLY when the visitor is
 * somewhere else, because telling a local customer their own clock is their own
 * clock is noise (SSA style).
 *
 * Neither mode gates CORRECTNESS (AGENTS §1): the picker exists in both, so a
 * remote customer can always move the whole flow onto their own zone, and
 * `customer_timezone` is still persisted as whatever `display_tz` is active at
 * submit — even if the visitor never opened the picker.
 *
 * "Equals" is {@link sameDisplayZone}, not string identity: a site whose owner
 * never picked a city reports its zone as a bare UTC offset, and an offset never
 * string-equals a browser's IANA name even when the two are the same clock. Such
 * a zone can also never BE the display zone (the REST layer takes IANA names
 * only), so `business` mode on a city-less site degrades to the visitor's clock
 * rather than posting a value the server would reject.
 *
 * @param {Object}             args            Args.
 * @param {string}             args.browserTz  Browser IANA zone.
 * @param {string}             args.businessTz Business IANA zone.
 * @param {string}             [args.mode]     `visitor` (default) or `business`.
 * @param {Date|number|string} [args.now]      Instant the zone comparison starts at (tests).
 * @return {{displayTz:string, businessTz:string, browserTz:string, mode:string, differs:boolean, showNote:boolean, showSelector:boolean}} Init state.
 */
export function resolveDisplayTz( { browserTz, businessTz, mode, now } ) {
	const tzMode = normalizeTzMode( mode );
	const differs =
		!! browserTz &&
		!! businessTz &&
		! sameDisplayZone( browserTz, businessTz, now );

	// Same clock, two spellings: display in the NAMED one. `display_tz` is posted
	// back at submit and the REST layer only accepts IANA identifiers, so a bare
	// offset must never become the display zone — and `Ho Chi Minh (GMT+7)` reads
	// better than `GMT+7` anyway.
	let displayTz =
		TZ_MODE_BUSINESS === tzMode && !! businessTz
			? businessTz
			: differs
				? browserTz
				: businessTz;
	if ( isOffsetZone( displayTz ) && !! browserTz && ! isOffsetZone( browserTz ) ) {
		displayTz = browserTz;
	}

	return {
		browserTz,
		businessTz,
		displayTz,
		mode: tzMode,
		differs,
		// The SSA-style "Times shown in …" note: business mode, remote visitor only.
		showNote: TZ_MODE_BUSINESS === tzMode && differs,
		// Kept for callers that only ask "is this visitor on the studio's clock?".
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

/** Where the visitor's own zone pick is kept between visits (persona QA 2026-10-05, T-096). */
const TZ_STORE_KEY = 'aponto_display_tz';

/**
 * This browser's persistent store, or `null` where there is none (private mode, a sandboxed
 * frame, node) — reading the property itself can throw.
 *
 * @return {?Storage} Storage or null.
 */
function tzStore() {
	try {
		return globalThis.localStorage || null;
	} catch {
		return null;
	}
}

/**
 * The display zone this visitor picked on an earlier visit, or '' (T-096).
 *
 * Stored WITH the browser zone it was picked from and honoured only while that still matches:
 * someone who chose "Chicago" from Hanoi and then travels is on a different clock, and a zone
 * remembered from the old one would be a guess. Only a zone the engine can format — and that
 * may legally be posted as `display_tz` (never a bare offset) — is ever returned.
 *
 * @param {string}   browserTz Browser IANA zone.
 * @param {?Storage} [storage] Store (injected by tests).
 * @return {string} IANA zone or ''.
 */
export function rememberedTz( browserTz, storage = tzStore() ) {
	try {
		const parts = String( storage.getItem( TZ_STORE_KEY ) || '' ).split(
			'|'
		);
		const zone = canonicalizeZone( parts[ 1 ] || '' );
		if ( parts[ 0 ] !== browserTz || ! zone || isOffsetZone( zone ) ) {
			return '';
		}
		// Throws a RangeError for a name this engine does not know.
		tzOffsetMinutes( zone, Date.now() );
		return zone;
	} catch {
		return '';
	}
}

/**
 * Remember (or, with '', forget) the visitor's display-zone pick (T-096). A timezone name and
 * nothing else: no identifier, no PII. Best-effort — a browser with no storage just forgets.
 *
 * @param {string}   browserTz Browser IANA zone.
 * @param {string}   zone      Picked zone, or '' to forget.
 * @param {?Storage} [storage] Store (injected by tests).
 */
export function rememberTz( browserTz, zone, storage = tzStore() ) {
	try {
		if ( zone ) {
			storage.setItem( TZ_STORE_KEY, browserTz + '|' + zone );
		} else {
			storage.removeItem( TZ_STORE_KEY );
		}
	} catch {
		// No store: nothing to remember.
	}
}

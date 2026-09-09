/**
 * Formatting helpers. All wall-clock rendering goes through ONE tz-aware path
 * (SPEC-P1 §2.2 spirit): a UTC instant + a display timezone → a formatted string.
 * The admin renders in business time; the customer-timezone secondary line is a
 * derived label only.
 */
import { config } from './config.js';

const currencyDecimalsCache = new Map();

/**
 * The store currency, upper-cased once — the code `config.currencyExponent` describes.
 */
const STORE_CURRENCY = String( config.currency || '' ).toUpperCase();

/**
 * Minor-unit exponent for a currency, and WHERE THE NUMBER COMES FROM (Codex A1, 2026-09-04).
 *
 * For the STORE currency the answer is `config.currencyExponent`, shipped by PHP from
 * `Settings::currencyExponent()` — the same function that decides how the integer in the database
 * was scaled. It is not derived here, and it must not be: `Intl` reports CLDR's DISPLAY convention,
 * which disagrees with ISO-4217 (and therefore with our storage) on six of the currencies in the
 * store's own menu — COP, HUF, IDR, PKR and MGA come back 0 where we store 2, and IQD comes back 0
 * where we store 3. Every one of those is a 100× or 1000× error in a figure that goes on to a
 * payment gateway.
 *
 * A caller that HAS the server's answer for this particular row passes it as `exponent` and it
 * wins outright (2026-09-05). The booking DTO now ships `order.currency_exponent`, so a historical
 * order in a currency the store no longer uses is scaled by the same function that scaled the
 * integer in the database — instead of by the store's exponent, which turned 12345 MGA into
 * $123.45 on a USD store.
 *
 * For any OTHER currency with no shipped exponent, `Intl` remains the only table available in the
 * browser and is used as a best effort for DISPLAY. It never decides what leaves for a gateway:
 * {@see authoritativeDecimals} is what the refund input uses, and it refuses to guess.
 *
 * @param {string}      currency ISO currency code.
 * @param {number|null} exponent Server-supplied exponent for this row, when there is one.
 * @return {number} Minor-unit exponent.
 */
function currencyDecimals( currency, exponent = null ) {
	if ( Number.isInteger( exponent ) && exponent >= 0 && exponent <= 4 ) {
		return exponent;
	}
	const code = String( currency || '' ).toUpperCase();
	if ( code === STORE_CURRENCY ) {
		return config.currencyExponent;
	}
	if ( currencyDecimalsCache.has( code ) ) {
		return currencyDecimalsCache.get( code );
	}
	let decimals = 2;
	try {
		decimals = new Intl.NumberFormat( config.locale, { style: 'currency', currency: code } )
			.resolvedOptions().maximumFractionDigits;
	} catch ( e ) {
		decimals = 2;
	}
	currencyDecimalsCache.set( code, decimals );
	return decimals;
}

/** Number of minor-unit decimals for a currency (2 for USD, 0 for VND/JPY, 3 for KWD). */
export function moneyDecimals( currency = config.currency, exponent = null ) {
	return currencyDecimals( currency, exponent );
}

/**
 * The exponent for a currency when one is KNOWN, or `null` — the money-moving variant.
 *
 * `moneyDecimals()` always answers, falling back to `Intl` so a historical row still renders. That
 * is right for display and wrong for an INPUT: `Intl` reports CLDR's display convention, which
 * disagrees with ISO-4217 (our storage) by 100× on MGA and 1000× on IQD, and a refund field is
 * where the operator types a number that becomes a transfer. So this one refuses to guess: the
 * server's exponent for the row, or the store's when the currency IS the store's, or nothing.
 *
 * @param {string}      currency ISO currency code.
 * @param {number|null} exponent Server-supplied exponent for this row, when there is one.
 * @return {number|null} Minor-unit exponent, or null when nothing authoritative is available.
 */
export function authoritativeDecimals( currency, exponent = null ) {
	if ( Number.isInteger( exponent ) && exponent >= 0 && exponent <= 4 ) {
		return exponent;
	}

	return String( currency || '' ).toUpperCase() === STORE_CURRENCY ? config.currencyExponent : null;
}

/**
 * Column ceilings mirrored from `Args::MAX_INT_UNSIGNED` / `Args::MAX_SMALLINT_UNSIGNED`
 * (Migration_0001 §services). REST rejects anything above them with `aponto_validation` instead
 * of letting the column clamp the value; the editors mirror the bounds so the admin is told
 * before the round-trip.
 */
export const MAX_INT_UNSIGNED = 4294967295;
export const MAX_SMALLINT_UNSIGNED = 65535;

/** Largest storable price in integer MINOR units (`aponto_services.price_minor int unsigned`). */
export const MAX_PRICE_MINOR = MAX_INT_UNSIGNED;

/** `min_lead_minutes` is `int unsigned`; `max_horizon_days` is `smallint unsigned` (65535 days). */
export const MAX_LEAD_MINUTES = MAX_INT_UNSIGNED;
export const MAX_HORIZON_DAYS = MAX_SMALLINT_UNSIGNED;

/** The same ceiling in the store currency's MAJOR unit (42949672.95 for USD, 4294967295 for VND). */
export function maxPriceMajor( currency = config.currency ) {
	return MAX_PRICE_MINOR / 10 ** currencyDecimals( currency );
}

/** Minor units → a major-unit number for editing (150000 VND → 150000; 1500 USD → 15). */
export function minorToMajor( minor, currency = config.currency, exponent = null ) {
	if ( minor === null || minor === undefined || minor === '' ) {
		return '';
	}
	return Number( minor ) / 10 ** currencyDecimals( currency, exponent );
}

/** Major-unit input → integer minor units for storage (null on empty/invalid). */
export function majorToMinor( major, currency = config.currency ) {
	if ( major === null || major === undefined || String( major ).trim() === '' ) {
		return null;
	}
	const value = Number( major );
	if ( ! Number.isFinite( value ) ) {
		return null;
	}
	return Math.round( value * 10 ** currencyDecimals( currency ) );
}

/**
 * Format minor-unit money in a currency (SPEC-P0 stores minor units).
 *
 * `Intl` supplies the GROUPING and the SYMBOL only; the digit count is pinned to our own exponent
 * on both ends (Codex A1). Without `minimumFractionDigits` an MGA amount of 123400 rendered as
 * "MGA 1,234" — the same figure a 0-decimal currency would show for 1234 minor units — so two
 * different amounts of money printed identically.
 */
export function money( minor, currency = config.currency, exponent = null ) {
	const decimals = currencyDecimals( currency, exponent );
	const major = Number( minor || 0 ) / 10 ** decimals;
	try {
		return new Intl.NumberFormat( config.locale, {
			style: 'currency',
			currency,
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
		} ).format( major );
	} catch ( e ) {
		return `${ major }`;
	}
}

const TZ = config.business.timezone;

/** "9:00 AM" style time label for a UTC instant in the given timezone. */
export function timeLabel( utc, tz = TZ ) {
	return new Intl.DateTimeFormat( 'en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz } ).format( new Date( utc ) );
}

/** "Mon, Aug 1" style date label for a UTC instant in the given timezone. */
export function dateLabel( utc, tz = TZ ) {
	return new Intl.DateTimeFormat( 'en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: tz } ).format( new Date( utc ) );
}

/** "August 1, 2026" style long date. */
export function longDate( utc, tz = TZ ) {
	return new Intl.DateTimeFormat( 'en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: tz } ).format( new Date( utc ) );
}

/**
 * "Aug 1, 2026 · 3:04 PM" — one audit-trail timestamp in the given timezone.
 *
 * For log/audit surfaces (send log, booking activity) where the row is a moment in time
 * rather than an appointment: same `(utc_instant, display_tz)` path as every other label
 * (§2.2 spirit), and the YEAR is kept because a log can reach back past January.
 */
export function dateTimeLabel( utc, tz = TZ ) {
	const instant = new Date( utc );
	const day = new Intl.DateTimeFormat( 'en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: tz } ).format( instant );

	return `${ day } · ${ timeLabel( utc, tz ) }`;
}

/** ISO Y-m-d for a UTC instant in the given timezone (for sorting / date facets). */
export function isoDate( utc, tz = TZ ) {
	return new Intl.DateTimeFormat( 'en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: tz } ).format( new Date( utc ) );
}

/** RFC3339 UTC instant WITHOUT milliseconds (the REST `utc` rule rejects `.SSSZ`). */
export function toUtcInstant( date ) {
	return new Date( date ).toISOString().replace( /\.\d{3}Z$/, 'Z' );
}

/** Two uppercase initials from a display name. */
export function initials( name ) {
	const parts = String( name || '' ).trim().split( /\s+/ ).filter( Boolean );
	if ( ! parts.length ) {
		return '?';
	}
	return ( parts[ 0 ][ 0 ] + ( parts.length > 1 ? parts[ parts.length - 1 ][ 0 ] : '' ) ).toUpperCase();
}

/** Friendly "City (GMT±N)" label for an IANA timezone at a given instant. */
export function tzLabel( tz, instant = Date.now() ) {
	if ( ! tz ) {
		return '';
	}
	const city = tz.includes( '/' ) ? tz.split( '/' ).pop().replace( /_/g, ' ' ) : tz;
	let offset = 'GMT';
	try {
		const parts = new Intl.DateTimeFormat( 'en-US', { timeZone: tz, timeZoneName: 'shortOffset' } ).formatToParts( new Date( instant ) );
		const name = parts.find( ( p ) => p.type === 'timeZoneName' );
		if ( name ) {
			offset = name.value.replace( 'UTC', 'GMT' );
		}
	} catch ( e ) {
		offset = 'GMT';
	}
	return `${ city } (${ offset })`;
}

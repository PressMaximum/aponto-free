/**
 * Money and duration formatting for the booking widget.
 *
 * Prices arrive as integer minor units plus an ISO-4217 currency (rest-contract
 * §3.1). We divide by the currency's own fraction digits (so VND stays whole and
 * USD gets cents) and format with `Intl.NumberFormat`.
 *
 * Pure module: no Preact, no DOM. Unit-testable.
 */

/**
 * Fraction digits for a currency: the SERVER's ISO exponent when it sent one,
 * otherwise `Intl`'s own table with a safe default of 2.
 *
 * The server value wins because the two tables disagree. `Intl` treats MGA as
 * zero-decimal where ISO-4217 (and therefore the stored `price_minor`) treats it
 * as two-decimal, so formatting from `Intl` alone divides by 1 instead of 100 and
 * prints `700` for a price of `7.00`. The exponent that decided how the amount was
 * STORED is the only one that can decide how it is shown.
 *
 * @param {string}  currency   ISO-4217 code.
 * @param {string}  locale     Locale.
 * @param {?number} [exponent] Server exponent (`payments.currency_exponent`).
 * @return {number} Fraction digits.
 */
function fractionDigits( currency, locale, exponent ) {
	if ( Number.isInteger( exponent ) && exponent >= 0 && exponent <= 4 ) {
		return exponent;
	}
	try {
		return new Intl.NumberFormat( locale || 'en-US', {
			style: 'currency',
			currency,
		} ).resolvedOptions().maximumFractionDigits;
	} catch {
		return 2;
	}
}

/**
 * Format an amount in minor units as localized currency, e.g. `$55.00`,
 * `150.000 ₫`. Returns an empty string when the price is null/undefined (a
 * service with no configured price).
 *
 * @param {?number} minor      Minor units, or null.
 * @param {string}  currency   ISO-4217 code.
 * @param {string}  [locale]   Locale.
 * @param {?number} [exponent] Server exponent; overrides `Intl`'s digit table.
 * @return {string} Formatted money or ''.
 */
export function formatMoney( minor, currency, locale, exponent ) {
	if ( minor === null || minor === undefined || minor === '' ) {
		return '';
	}
	const digits = fractionDigits( currency, locale, exponent );
	const major = Number( minor ) / Math.pow( 10, digits );
	try {
		return new Intl.NumberFormat( locale || 'en-US', {
			style: 'currency',
			currency,
			// Pinned to the SAME exponent the division used. Without this pair
			// `Intl` re-applies its own table on the way out and a currency it
			// disagrees with is wrong twice over.
			minimumFractionDigits: digits,
			maximumFractionDigits: digits,
		} ).format( major );
	} catch {
		return String( major ) + ( currency ? ' ' + currency : '' );
	}
}

/**
 * Human duration from minutes, localized via `Intl` units — e.g. `45 min`, `1 hr`,
 * `1 hr 30 min` in English; `45 phút`, `1 giờ` on a Vietnamese site (fleet-r1 Fix 9d;
 * finding U3 BUG-08). Falls back to the English abbreviations on engines without
 * `Intl` unit support.
 *
 * @param {number} minutes  Minutes.
 * @param {string} [locale] Locale.
 * @return {string} Duration label.
 */
export function formatDuration( minutes, locale ) {
	const m = Math.max( 0, parseInt( minutes, 10 ) || 0 );
	const h = Math.floor( m / 60 );
	const rem = m % 60;
	const loc = locale || 'en-US';
	try {
		const unit = ( value, name ) =>
			new Intl.NumberFormat( loc, {
				style: 'unit',
				unit: name,
				unitDisplay: 'short',
			} ).format( value );
		if ( h === 0 ) {
			return unit( rem, 'minute' );
		}
		if ( rem === 0 ) {
			return unit( h, 'hour' );
		}
		return unit( h, 'hour' ) + ' ' + unit( rem, 'minute' );
	} catch {
		if ( h === 0 ) {
			return rem + ' min';
		}
		if ( rem === 0 ) {
			return h + ' hr';
		}
		return h + ' hr ' + rem + ' min';
	}
}

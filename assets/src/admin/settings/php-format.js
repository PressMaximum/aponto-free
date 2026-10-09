/**
 * Render a PHP `date()` format string for a JS Date — enough of it to SHOW an example
 * (persona QA 2026-10-05, T-080).
 *
 * Settings → Localization asked the owner for raw PHP format strings ("F j, Y", "g:i a"). The
 * stored value stays a PHP format — it is what `wp_date()` formats every mail and the manage page
 * with — but the control now offers presets labelled with what they PRODUCE, which needs this
 * small renderer. It covers the day, month, year and clock tokens the presets and any sane custom
 * format use; an unknown letter is passed through unchanged, exactly as PHP does, so the example
 * is never invented.
 */

const pad = ( n ) => String( n ).padStart( 2, '0' );

function part( date, locale, options ) {
	try {
		return new Intl.DateTimeFormat( locale, options ).format( date );
	} catch {
		return new Intl.DateTimeFormat( 'en-US', options ).format( date );
	}
}

function ordinal( day ) {
	if ( day >= 11 && day <= 13 ) {
		return 'th';
	}
	return { 1: 'st', 2: 'nd', 3: 'rd' }[ day % 10 ] || 'th';
}

/**
 * @param {string} format PHP date format.
 * @param {Date}   date   The instant to render, read in the browser's local zone.
 * @param {string} locale BCP-47 locale for month and weekday names.
 * @return {string} The formatted example.
 */
export function phpDateExample( format, date = new Date(), locale = 'en-US' ) {
	const hours = date.getHours();
	const tokens = {
		d: () => pad( date.getDate() ),
		j: () => String( date.getDate() ),
		D: () => part( date, locale, { weekday: 'short' } ),
		l: () => part( date, locale, { weekday: 'long' } ),
		S: () => ordinal( date.getDate() ),
		F: () => part( date, locale, { month: 'long' } ),
		M: () => part( date, locale, { month: 'short' } ),
		m: () => pad( date.getMonth() + 1 ),
		n: () => String( date.getMonth() + 1 ),
		Y: () => String( date.getFullYear() ),
		y: () => String( date.getFullYear() ).slice( -2 ),
		a: () => ( hours < 12 ? 'am' : 'pm' ),
		A: () => ( hours < 12 ? 'AM' : 'PM' ),
		g: () => String( hours % 12 || 12 ),
		G: () => String( hours ),
		h: () => pad( hours % 12 || 12 ),
		H: () => pad( hours ),
		i: () => pad( date.getMinutes() ),
		s: () => pad( date.getSeconds() ),
	};
	let out = '';
	const text = String( format || '' );
	for ( let index = 0; index < text.length; index++ ) {
		const char = text[ index ];
		if ( '\\' === char ) {
			index += 1;
			out += text[ index ] || '';
		} else {
			out += tokens[ char ] ? tokens[ char ]() : char;
		}
	}
	return out;
}

/** The presets WordPress's own General settings screen offers, in its order. */
export const DATE_FORMAT_PRESETS = [ 'F j, Y', 'Y-m-d', 'm/d/Y', 'd/m/Y', 'j F Y', 'D, M j, Y' ];
export const TIME_FORMAT_PRESETS = [ 'g:i a', 'g:i A', 'H:i' ];

/** The fixed instant every example is rendered for: an afternoon, so am/pm and 24h visibly differ. */
export function exampleInstant() {
	const now = new Date();
	return new Date( now.getFullYear(), now.getMonth(), now.getDate(), 14, 30, 0 );
}

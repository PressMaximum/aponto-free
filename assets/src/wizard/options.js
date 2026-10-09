/**
 * Pure option/validation helpers for the wizard steps (persona QA 2026-10-05).
 *
 * Kept out of `index.js` so they are unit-testable under plain node: that file mounts the app on
 * import.
 */

/**
 * Timezone choices grouped by region, for `<optgroup>`s (T-089).
 *
 * The step used to be one flat native select of ~420 IANA identifiers; finding "Australia/Sydney"
 * meant scrolling past every African and American city. Grouping by the identifier's own first
 * segment costs no data and no translation table. Identifiers with no region (`UTC`) and a
 * prefilled raw offset (`+07:00`, see `WizardService::prefillTimezone()`) stay ungrouped at the
 * top, where the owner can see what their site currently has.
 *
 * @param {string[]} zones    IANA identifiers from the server.
 * @param {string}   selected The prefilled value; kept selectable even when it is not in `zones`.
 * @return {{loose: Array<{value: string, label: string}>, groups: Array<{label: string, options: Array<{value: string, label: string}>}>}} Grouped options.
 */
export function groupTimezones( zones, selected = '' ) {
	const list = Array.isArray( zones ) ? zones.slice() : [];
	if ( selected && ! list.includes( selected ) ) {
		list.unshift( selected );
	}
	const loose = [];
	const byRegion = new Map();
	list.forEach( ( zone ) => {
		const id = String( zone );
		const slash = id.indexOf( '/' );
		if ( slash < 1 ) {
			loose.push( { value: id, label: /^[+-]/.test( id ) ? `UTC${ id }` : id } );
			return;
		}
		const region = id.slice( 0, slash );
		if ( ! byRegion.has( region ) ) {
			byRegion.set( region, [] );
		}
		byRegion.get( region ).push( {
			value: id,
			label: id.slice( slash + 1 ).replace( /_/g, ' ' ).replace( /\//g, ' / ' ),
		} );
	} );

	return {
		loose,
		groups: [ ...byRegion.entries() ].map( ( [ label, options ] ) => ( { label, options } ) ),
	};
}

/**
 * "USD — US Dollar" for a currency code (T-089), or the bare code when the browser cannot name it.
 *
 * `Intl.DisplayNames` already carries every ISO-4217 name in the reader's language, so the menu
 * needs no shipped name table. An unknown code echoes itself, which reads as "no name" here.
 *
 * @param {string} code   ISO-4217 code.
 * @param {string} locale BCP-47 locale for the name.
 * @return {string} Option label.
 */
export function currencyLabel( code, locale = 'en' ) {
	const iso = String( code || '' );
	try {
		if ( typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function' ) {
			const name = new Intl.DisplayNames( [ locale, 'en' ], { type: 'currency' } ).of( iso );
			if ( name && name !== iso ) {
				return `${ iso } — ${ name }`;
			}
		}
	} catch ( e ) {
		// An invalid locale or code: fall through to the bare code.
	}
	return iso;
}

/**
 * Whether a phone value is blank or loosely a phone number (T-088) — the client mirror of
 * `WizardService::phoneAccepted()`: digits and `+ ( ) - .` / spaces only, at least five digits.
 *
 * @param {string} value Typed value.
 * @return {boolean} Whether the step may post it.
 */
export function phoneLooksValid( value ) {
	const phone = String( value ?? '' ).trim();
	if ( '' === phone ) {
		return true;
	}
	return /^[0-9+().\-\s]+$/.test( phone ) && ( phone.match( /[0-9]/g ) || [] ).length >= 5;
}

/**
 * Whether a typed first-service price is unusable (T-086) — the client mirror of
 * `WizardService::servicePriceRefusal()`. Blank is "no price" and fine.
 *
 * @param {string} value Typed value, in the currency's major unit.
 * @return {''|'nan'|'negative'} The problem, or '' when there is none.
 */
export function priceProblem( value ) {
	const raw = String( value ?? '' ).trim();
	if ( '' === raw ) {
		return '';
	}
	const number = Number( raw );
	if ( ! Number.isFinite( number ) ) {
		return 'nan';
	}
	return number < 0 ? 'negative' : '';
}

/**
 * The block markup the Done step offers for a hand-built page (T-085) — the same string the
 * server writes into the page it creates (`WizardService::BLOCK_MARKUP`).
 */
export const BOOKING_FORM_BLOCK = '<!-- wp:aponto/booking-form {"align":"wide"} /-->';

/**
 * The hours step's week, seeded from what the site has stored (persona QA 2026-10-05, re-test N2).
 *
 * A re-opened wizard showed the factory 9–5 week and Continue REPLACED the owner's saved hours
 * with it. `saved` is `WizardService::hoursPrefill()`: null on a first run (the factory week is
 * then the right starting point), otherwise the stored week — with `split` true when a day holds
 * more than one range, which this one-range-per-day step can neither show nor save back.
 *
 * @param {?{split: boolean, days: Array<{weekday: number, open: boolean, start: number, end: number}>}} saved Stored week.
 * @return {{map: Object<number, {open: boolean, start: number, end: number}>, stored: boolean, split: boolean}} Step state.
 */
export function hoursSeed( saved ) {
	const map = {};
	for ( let iso = 1; iso <= 7; iso++ ) {
		map[ iso ] = { open: iso <= 5, start: 540, end: 1020 };
	}
	const days = saved && Array.isArray( saved.days ) ? saved.days : null;
	if ( ! days ) {
		return { map, stored: false, split: false };
	}
	for ( let iso = 1; iso <= 7; iso++ ) {
		map[ iso ] = { open: false, start: 540, end: 1020 };
	}
	days.forEach( ( day ) => {
		const iso = Number( day && day.weekday );
		if ( iso >= 1 && iso <= 7 ) {
			map[ iso ] = {
				open: Boolean( day.open ),
				start: Number.isFinite( Number( day.start ) ) ? Number( day.start ) : 540,
				end: Number.isFinite( Number( day.end ) ) ? Number( day.end ) : 1020,
			};
		}
	} );
	return { map, stored: true, split: Boolean( saved.split ) };
}

/**
 * Whether a step must be POSTED when the owner presses Continue (re-test N2): always on a first
 * run, and on a re-run only when what is on screen differs from what the step was seeded with. A
 * re-opened wizard that is clicked through therefore writes nothing.
 *
 * @param {boolean} stored  Whether the step was seeded from values the site already has.
 * @param {*}       seed    The values the step opened with.
 * @param {*}       current The values on screen now.
 * @return {boolean} Whether to post the step.
 */
export function stepNeedsSave( stored, seed, current ) {
	return ! stored || JSON.stringify( seed ) !== JSON.stringify( current );
}

/**
 * Option helpers for the admin `Combobox` (SPEC-P1 §6.7). Framework-free and
 * side-effect-free; the only ambient input is the store currency the shared money
 * formatter reads from the boot config.
 *
 * Option identity is the RECORD ID, never the display name. Two services (or staff,
 * or customers) may legitimately share a name — `wp aponto seed` plus the wizard's
 * default service both create "Haircut" — and using the name as identity broke twice
 * over: duplicate React keys in the listbox ("Encountered two children with the same
 * key") let rows be dropped/reused, and, worse, a selection could not say WHICH
 * record it meant, so the `service_id` written by POST /bookings was ambiguous.
 *
 * Contract for every option object: `id` decides identity (React key, aria-selected,
 * what gets submitted), `label` is display-only, `meta` is the row's secondary line,
 * `keywords` is extra typeahead text. Filtering always matches the label so typing a
 * name keeps working.
 *
 * Identity alone is invisible, though: two same-named rows still LOOK identical, so
 * the founder approved (2026-07-25) a disambiguation meta line for the two catalogs
 * that lacked one — services show `duration · price`, staff show their email — which
 * is the secondary line the customer picker already renders.
 */
import { money } from './format.js';
import { displayNameOf } from '../../shared/person-name.js';

/**
 * Stable listbox key + selection identity for one option.
 *
 * Prefixed so a record id and a fallback label can never collide, and so a
 * name-keyed regression is obvious in the DOM.
 *
 * @param {Object} option Combobox option.
 * @return {string} Identity string ('' for a missing option).
 */
export function optionKey( option ) {
	if ( ! option ) {
		return '';
	}
	if ( option.id !== undefined && option.id !== null && option.id !== '' ) {
		return `id:${ option.id }`;
	}
	// Defensive only: catalogs always carry an id. Ambiguous by construction.
	return `label:${ option.label ?? '' }`;
}

/**
 * The option for a record id, or null when the catalog does not carry it.
 *
 * Used to turn a prefilled id — e.g. the staff member whose calendar a free slot was clicked on
 * (D-R28) — into the option object the `Combobox` expects, WITHOUT inventing one: an id the
 * catalog does not contain (archived, or past the catalog's window) must leave the field empty
 * rather than select a record that is not really selectable.
 *
 * @param {Array}         options Combobox options.
 * @param {number|string} id      Record id.
 * @return {?Object} The matching option, or null.
 */
export function findOptionById( options, id ) {
	if ( id === undefined || id === null || id === '' ) {
		return null;
	}

	return ( options || [] ).find( ( option ) => String( option?.id ) === String( id ) ) || null;
}

/**
 * True when both arguments are the same record (by id, not by name).
 *
 * @param {Object} a First option.
 * @param {Object} b Second option.
 * @return {boolean} Whether both options identify the same record.
 */
export function isSameOption( a, b ) {
	const keyA = optionKey( a );
	return !! keyA && keyA === optionKey( b );
}

/**
 * Typeahead text for one option: the label plus any extra keywords (email/phone).
 *
 * @param {Object} option Combobox option.
 * @return {string} Lowercased haystack.
 */
export function optionHaystack( option ) {
	return [ option?.label, option?.keywords ]
		.filter( Boolean )
		.join( ' ' )
		.toLowerCase();
}

/**
 * Filter options by a raw query. An empty query keeps the full list.
 *
 * @param {Array}  options Option list.
 * @param {string} query   Raw user query.
 * @return {Array} Matching options (same order).
 */
export function filterOptions( options = [], query = '' ) {
	const q = `${ query || '' }`.trim().toLowerCase();
	if ( ! q ) {
		return options;
	}
	return options.filter( ( option ) => optionHaystack( option ).includes( q ) );
}

/** True for a value that is present enough to render (0 counts, '' / null do not). */
function present( value ) {
	return value !== null && value !== undefined && value !== '';
}

/**
 * "30 min · $25.00" secondary line for one service.
 *
 * Both halves reuse what the admin already renders elsewhere, so the dropdown cannot
 * drift from the Services table: duration as `<minutes> min` (`routes/Services.jsx`
 * duration column + service editor readout), price through `format.js` `money()`,
 * which divides the integer minor units by the store currency's own ISO-4217 exponent
 * (invariant 7 — money is never hand-divided here). A service with no configured
 * price contributes no price segment, the same guard the Services table uses instead
 * of printing a fake "$0.00".
 *
 * @param {Object} item REST `/services` item.
 * @return {string} Meta line ('' when the record carries neither value).
 */
function serviceMeta( item ) {
	const parts = [];
	if ( present( item.duration_minutes ) ) {
		parts.push( `${ item.duration_minutes } min` );
	}
	if ( present( item.price_minor ) ) {
		parts.push( money( item.price_minor ) );
	}
	return parts.join( ' · ' );
}

/**
 * Service options. `duration`/`price` ride along so the schedule derivation follows
 * the PICKED record even when another service shares its name; `meta` puts the same
 * two values on screen so the user can SEE which "Haircut" is which before picking.
 *
 * @param {Array} items REST `/services` items.
 * @return {Array} Combobox options.
 */
export function serviceOptions( items = [] ) {
	return ( items || [] ).map( ( item ) => ( {
		id: item.id,
		label: item.name,
		duration: item.duration_minutes,
		price: item.price_minor,
		meta: serviceMeta( item ),
	} ) );
}

/**
 * The name parts of a person record as typeahead keywords (name split, 2026-10-01). The label is
 * already the display name, which holds both parts; listing them keeps a search by either part
 * working even when a record's composed `name` is missing or differs.
 *
 * @param {Object} item REST customer / staff item.
 * @return {Array} Non-empty parts.
 */
function nameKeywords( item ) {
	return [ item.first_name, item.last_name ].filter( Boolean );
}

/**
 * Staff options. `meta` is the email — the one field that tells two same-named staff
 * apart — and it joins `keywords` exactly like the customer picker's contact details,
 * so what the row shows is also what the typeahead can match. The label is the display name;
 * the parts ride along.
 *
 * @param {Array} items REST `/staff` items.
 * @return {Array} Combobox options.
 */
export function staffOptions( items = [] ) {
	return ( items || [] ).map( ( item ) => ( {
		id: item.id,
		label: displayNameOf( item ),
		meta: item.email || '',
		keywords: [ ...nameKeywords( item ), item.email ].filter( Boolean ).join( ' ' ),
		first_name: item.first_name || '',
		last_name: item.last_name || '',
	} ) );
}

/**
 * Customer options. `meta` is the secondary line in the entity row; `keywords` adds the name
 * parts + email + phone to the typeahead (the label is the display name). The parts ride along
 * for `POST /bookings`, which takes `customer.first_name` / `customer.last_name`.
 *
 * An `anonymized` record (erased by a privacy request or the retention sweep) is not offered:
 * the route refuses it as `customer_id`, and "Deleted customer" is nobody to book for.
 *
 * @param {Array} items REST `/customers` items.
 * @return {Array} Combobox options.
 */
export function customerOptions( items = [] ) {
	return ( items || [] ).filter( ( item ) => ! item.anonymized ).map( ( item ) => ( {
		id: item.id,
		label: displayNameOf( item ),
		meta: item.email || item.phone || '',
		keywords: [ ...nameKeywords( item ), item.email, item.phone ].filter( Boolean ).join( ' ' ),
		name: displayNameOf( item ),
		first_name: item.first_name || '',
		last_name: item.last_name || '',
		email: item.email,
		phone: item.phone,
	} ) );
}

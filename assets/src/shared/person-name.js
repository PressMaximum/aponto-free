/**
 * The ONE person-name rule on the JS side (name split, 2026-10-01).
 *
 * Customers and staff are stored as `first_name` + `last_name`; every REST DTO also carries a
 * server-composed `name`. This module is the JS twin of `Aponto\Support\PersonName` (PHP) and is
 * pinned to it by `tests/fixtures/person-name-lockstep.json` — a Jest test and a PHP unit test
 * both run the same `display` and `initials` cases, so the two sides cannot drift.
 *
 * Framework-free and dependency-free on purpose: the admin SPA (React), the wizard and the
 * booking widget (Preact) all import it by relative path and webpack inlines a copy into each
 * bundle, so nothing here may pull in a runtime.
 *
 * Display order "First Last" lives ONLY in `displayName()`.
 */

/**
 * The whitespace class, matching PHP's `/[\s\p{Z}]+/u`: PCRE `\s` under `/u` is the ASCII set
 * (space, tab, LF, VT, FF, CR) and `\p{Z}` adds every Unicode separator (NBSP, U+3000, …).
 * Spelled out rather than JS `\s`, which also treats U+FEFF as whitespace and PHP does not, and
 * with the `\p{Z}` members listed (Zs + U+2028 Zl + U+2029 Zp) so no transpiler expands a
 * property escape into a large character table inside every bundle.
 */
const WHITESPACE_RUN = /[\t\n\v\f\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/g;

/**
 * One name part, normalized: Unicode whitespace trimmed and every internal run collapsed to a
 * single ASCII space. `null`/`undefined` read as ''.
 *
 * @param {*} part Raw first or last name.
 * @return {string} Normalized part ('' when blank).
 */
export function normalizePart( part ) {
	return String( part ?? '' )
		.replace( WHITESPACE_RUN, ' ' )
		.replace( /^ | $/g, '' );
}

/**
 * The display name: "First Last", or whichever part is non-empty.
 *
 * @param {*} first First name.
 * @param {*} last  Last name.
 * @return {string} Display name ('' when both parts are blank).
 */
export function displayName( first, last ) {
	return [ normalizePart( first ), normalizePart( last ) ].filter( Boolean ).join( ' ' );
}

/**
 * Up to two upper-cased initials: the first code point of the FIRST word and of the LAST word of
 * the display name — so "Ana Maria" + "Silva" is AS, a one-word name yields one letter, and a
 * blank name yields ''. Spread-based, so an astral first character stays whole.
 *
 * @param {*} first First name.
 * @param {*} last  Last name.
 * @return {string} 0–2 characters (more only when upper-casing expands, e.g. ß → SS).
 */
export function initials( first, last ) {
	const words = displayName( first, last ).split( ' ' ).filter( Boolean );
	if ( ! words.length ) {
		return '';
	}
	const head = [ ...words[ 0 ] ][ 0 ] || '';
	const tail = words.length > 1 ? [ ...words[ words.length - 1 ] ][ 0 ] || '' : '';
	return ( head + tail ).toUpperCase();
}

/**
 * The display name of a person DTO (customer, staff, a booking's `customer`/`staff` block).
 *
 * The server composes `name` with the same rule, so it wins when present; the parts are the
 * fallback for a payload that carries only them.
 *
 * @param {?Object} person DTO with `name` and/or `first_name`/`last_name`.
 * @return {string} Display name ('' for a missing or nameless record).
 */
export function displayNameOf( person ) {
	if ( ! person || 'object' !== typeof person ) {
		return '';
	}
	const composed = normalizePart( person.name );
	return composed || displayName( person.first_name, person.last_name );
}

/**
 * The initials of a person DTO — from its parts when it has them, else from its composed name
 * (whose words are the parts' words, so the answer is the same).
 *
 * @param {?Object} person DTO with `first_name`/`last_name` and/or `name`.
 * @return {string} 0–2 characters.
 */
export function initialsOf( person ) {
	if ( ! person || 'object' !== typeof person ) {
		return '';
	}
	const fromParts = initials( person.first_name, person.last_name );
	return fromParts || initials( person.name, '' );
}

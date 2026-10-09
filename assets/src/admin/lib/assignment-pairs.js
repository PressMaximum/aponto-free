/**
 * Per-member branch math for the Service editor's "Staff & locations" section (D-R63, SPEC-P1
 * §1.1.4), over the per-pair wire of `PUT /services/{id}/eligibility` (rest-contract §2.18).
 *
 * The rule, in one line: an assigned member is EITHER "Every location" — exactly one wildcard pair
 * `{ staff_id, location_id: 0 }` — OR a set of branches, one pair per branch. Choosing branches
 * REPLACES that member's pairs; clearing every branch falls back to the wildcard, so an assigned
 * member never ends with an empty set (that would silently UN-assign them). Other members' pairs
 * are never touched, which is what keeps a non-cartesian mapping ("A everywhere, B only at
 * Uptown") intact through a round-trip.
 *
 * Pure and dependency-free: `tests/js` imports it under plain node.
 */

/**
 * The branches a member is assigned at, or `[]` for "Every location".
 *
 * A member holding a wildcard pair is assigned everywhere, whatever narrower rows sit beside it
 * (legacy data can hold both), so the wildcard wins and the answer is `[]`.
 *
 * @param {Array}  assignments Pairs `{ staff_id, location_id }`.
 * @param {number} staffId     Member.
 * @return {number[]} Location ids, ascending; `[]` = every location (or not assigned).
 */
export function memberLocationIds( assignments, staffId ) {
	const id = Number( staffId );
	const mine = ( assignments || [] ).filter( ( pair ) => Number( pair?.staff_id ) === id );
	if ( mine.some( ( pair ) => 0 === ( Number( pair.location_id ) || 0 ) ) ) {
		return [];
	}
	return [ ...new Set( mine.map( ( pair ) => Number( pair.location_id ) ) ) ].sort( ( a, b ) => a - b );
}

/**
 * Replace one member's pairs with the given branches — or with the wildcard when none are given.
 *
 * @param {Array}    assignments Current pairs.
 * @param {number}   staffId     Member to rewrite (must already be assigned; the checkbox owns
 *                               assign/unassign).
 * @param {number[]} locationIds Picked branches; `[]` = every location.
 * @return {Array} Next pairs.
 */
export function setMemberLocations( assignments, staffId, locationIds ) {
	const id = Number( staffId );
	const others = ( assignments || [] ).filter( ( pair ) => Number( pair?.staff_id ) !== id );
	const picked = [ ...new Set( ( locationIds || [] ).map( Number ).filter( ( value ) => value > 0 ) ) ].sort( ( a, b ) => a - b );
	if ( ! picked.length ) {
		return [ ...others, { staff_id: id, location_id: 0 } ];
	}
	return [ ...others, ...picked.map( ( locationId ) => ( { staff_id: id, location_id: locationId } ) ) ];
}

/**
 * One-line reading of a member's scope for read-only summaries: "Every location", or the branch
 * names joined with ", " (an id the catalog does not name reads `#N` rather than vanishing).
 *
 * @param {number[]} locationIds  From {@see memberLocationIds}.
 * @param {Array}    locations    Catalog `[ { id, name } ]`.
 * @param {string}   everyLabel   Translated "Every location".
 * @return {string} Summary.
 */
export function locationScopeLabel( locationIds, locations, everyLabel ) {
	if ( ! locationIds || ! locationIds.length ) {
		return everyLabel;
	}
	const byId = new Map( ( locations || [] ).map( ( location ) => [ Number( location.id ), location.name ] ) );
	return locationIds.map( ( locationId ) => byId.get( Number( locationId ) ) || `#${ locationId }` ).join( ', ' );
}

/**
 * Pure value logic for the read-only Staff and Location rows in the booking editor
 * (BookingEditor.jsx §Edit mode). Extracted so the "these rows always resolve to a non-empty
 * value, so they always render" contract — the regression guard for the pre-beta demo #2 finding
 * (rows reported missing) — is unit-testable in the framework-free Jest environment, without a DOM.
 */

/** The Staff row value: the booking row's staff name, or "Unassigned" when none is set. */
export function staffRowValue( row ) {
	return ( row && row.staff ) || 'Unassigned';
}

/**
 * The Location row value. A real location (`locationId != 0`) resolves to its catalog name, falling
 * back to the row's location label and finally `Location #id`; `locationId = 0` is the wildcard "no
 * location record", which means the booking runs at the business address (§5 invariant 11: a fresh
 * install has zero location rows, and that is a valid, complete state).
 *
 * When the business address is known, that address IS the answer to "where?" — the old
 * "No location · 123 Main Street" contradicted itself in one line (beta QA 2026-08-01), telling the
 * owner there is no location while printing the location. Only a business with no address on file
 * falls back to the honest "No location". Never returns an empty string.
 *
 * @param {Object} args
 * @param {number} args.locationId      Booking location id (0 = no location record).
 * @param {string} [args.locationName]  Resolved catalog name for the location.
 * @param {string} [args.rowLocation]   Location label carried on the list row.
 * @param {string} [args.businessAddress] Business address (the answer for the no-location case).
 */
export function locationRowValue( { locationId, locationName, rowLocation, businessAddress } ) {
	if ( locationId ) {
		return locationName || rowLocation || `Location #${ locationId }`;
	}
	return businessAddress || 'No location';
}

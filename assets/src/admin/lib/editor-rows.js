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

/**
 * Options for the booking editor's Location `<select>` (D-R63): "No location" (`0`, labelled with
 * the business name — the place a no-location booking actually happens) first, then the ACTIVE
 * branches in catalog order. A booking already sitting at a branch the active catalog does not list
 * (archived since) keeps its own entry, so the control never claims the booking is somewhere else.
 *
 * Only ever called with ≥1 active location: with none, the editor renders the read-only row it
 * always has, which is what keeps Free byte-identical.
 *
 * @param {Object} args
 * @param {Array}  args.locations      Active catalog `[ { id, name } ]`.
 * @param {number} [args.currentId]    The booking's own location id (edit), `0`/absent on create.
 * @param {string} [args.currentName]  Its resolved name, for the archived case.
 * @param {string} [args.businessName] Site business name.
 * @param {string} args.noLocation     Translated "No location".
 * @return {Array} `[ { id, label } ]`.
 */
export function locationSelectOptions( { locations, currentId = 0, currentName = '', businessName = '', noLocation } ) {
	const options = [ { id: 0, label: businessName ? `${ noLocation } · ${ businessName }` : noLocation } ];
	( locations || [] ).forEach( ( location ) => options.push( { id: location.id, label: location.name } ) );
	const current = Number( currentId ) || 0;
	if ( current && ! options.some( ( option ) => option.id === current ) ) {
		options.push( { id: current, label: currentName || `#${ current }` } );
	}
	return options;
}

/**
 * The `location_id` a booking write should carry for a picked location (D-R63): `undefined` for
 * `0` on CREATE, so a site with no branch picked sends the exact pre-D-R63 body; on a MOVE the
 * target is returned whenever it differs from where the booking already is (`0` included — moving
 * a booking back to "no location" is a real move), else `undefined` (nothing to move).
 *
 * @param {number}  picked   Picked location id.
 * @param {?number} [current] The booking's current location (edit); omit on create.
 * @return {number|undefined} Value to send, or undefined to omit the key.
 */
export function locationToSend( picked, current ) {
	const next = Number( picked ) || 0;
	if ( current === undefined || current === null ) {
		return next > 0 ? next : undefined;
	}
	return next !== ( Number( current ) || 0 ) ? next : undefined;
}

/**
 * Options for the "Edit time" Staff `<select>` (D-R78): the ACTIVE staff members assigned to the
 * booking's service at the picked location — a pair at that location or the wildcard `0`, the same
 * terms the engine's eligibility read applies — in catalog order. The booking's own staff member
 * always keeps an entry (archived or unassigned since), so the control never claims the booking
 * belongs to somebody else.
 *
 * `assignments === null` means the eligibility read was not available (it needs the services
 * capability): every active member is offered, and the server refuses an ineligible pick.
 *
 * @param {Object}     args
 * @param {Array}      args.staff         Active staff options `[ { id, label } ]`.
 * @param {?Array}     args.assignments   Pairs `{ staff_id, location_id }` of the service, or null.
 * @param {number}     [args.locationId]  Picked location (`0` = none).
 * @param {number}     [args.currentId]   The booking's own staff id.
 * @param {string}     [args.currentName] Its name, for a member the list no longer carries.
 * @return {Array} `[ { id, label } ]`.
 */
export function rescheduleStaffOptions( { staff, assignments, locationId = 0, currentId = 0, currentName = '' } ) {
	const place = Number( locationId ) || 0;
	const eligible = null === assignments || undefined === assignments
		? null
		: new Set( assignments
			.filter( ( pair ) => {
				const at = Number( pair?.location_id ) || 0;
				return 0 === at || at === place;
			} )
			.map( ( pair ) => Number( pair.staff_id ) ) );
	const options = ( staff || [] )
		.filter( ( member ) => null === eligible || eligible.has( Number( member.id ) ) )
		.map( ( member ) => ( { id: Number( member.id ), label: member.label } ) );
	const current = Number( currentId ) || 0;
	if ( current && ! options.some( ( option ) => option.id === current ) ) {
		options.unshift( { id: current, label: currentName || `#${ current }` } );
	}
	return options;
}

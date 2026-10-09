/**
 * The operator's saved Bookings list column layout (D-R74, rest-contract §2.23).
 *
 * Stored per USER in WordPress (a user option), not in `localStorage`: the founder wants the
 * Columns choices to follow the person to another browser or machine. The page boots with the
 * stored layout (`config.preferences.bookingsTable`), so the first paint already has it; this module
 * keeps the in-session copy current, because that boot snapshot is read once per page load while
 * the Bookings route remounts on every visit.
 *
 * Writes are debounced — a few checkbox clicks in a row are one save — and a layout that shows the
 * defaults is a DELETE, not a PUT: "no saved layout" is what makes a later change to the defaults
 * reach this operator too. Writes also go out ONE AT A TIME, in the order they were made: a slow
 * PUT that landed after the DELETE that followed it would bring back the layout just reset.
 */
import { api } from './api.js';
import { config } from './config.js';

const SAVE_DELAY_MS = 400;

let current = config.preferences.bookingsTable;
let timer = null;
let pendingWrite = null;
// The tail of the write queue; it never rejects (each write swallows its own failure).
let lastWrite = Promise.resolve();

/**
 * The layout to start the Bookings list with, in `BookingsTable`'s `initialPreferences` shape.
 *
 * @return {Object} `{ columnVisibility, columnOrder }`, or `{}` for the defaults.
 */
export function bookingsTableLayout() {
	if ( ! current ) {
		return {};
	}

	return {
		columnVisibility: current.columnVisibility && typeof current.columnVisibility === 'object' ? current.columnVisibility : {},
		columnOrder: Array.isArray( current.columnOrder ) ? current.columnOrder : [],
	};
}

/**
 * Send the queued write now, if there is one.
 *
 * @return {Promise} Settles (never rejects) once every write made so far has been answered.
 */
export function flushBookingsTableLayout() {
	if ( timer ) {
		clearTimeout( timer );
		timer = null;
	}
	const write = pendingWrite;
	pendingWrite = null;
	if ( write ) {
		lastWrite = lastWrite.then( write );
	}

	return lastWrite;
}

/**
 * Remember a layout for this operator.
 *
 * @param {Object}   layout                  `{ columnVisibility, columnOrder }`.
 * @param {boolean}  isDefault               True when it shows exactly the defaults (forget it).
 * @param {Function} [onError]               Called with the error when the save fails.
 */
export function saveBookingsTableLayout( layout, isDefault, onError ) {
	const columnVisibility = { ...( layout.columnVisibility || {} ) };
	const columnOrder = [ ...( layout.columnOrder || [] ) ];
	// The in-session copy moves NOW, so a remount inside the debounce window starts from what the
	// operator just picked rather than the boot snapshot.
	current = isDefault ? null : { columnVisibility, columnOrder };
	pendingWrite = () => ( isDefault
		? api.del( '/preferences/bookings-table' )
		: api.put( '/preferences/bookings-table', { column_visibility: columnVisibility, column_order: columnOrder } )
	).then( () => undefined, ( err ) => {
		onError?.( err );
	} );

	if ( timer ) {
		clearTimeout( timer );
	}
	timer = setTimeout( flushBookingsTableLayout, SAVE_DELAY_MS );
}

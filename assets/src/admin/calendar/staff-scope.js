/**
 * Which staff member the calendar is describing (SPEC-P1 §1.4 · D-R28 · R2).
 *
 * The admin calendar shows ONE staff member at a time. Every per-staff layer — the non-working
 * stripes, the blocked periods, the staff a Block-time write is attributed to — was already
 * resolved for a single member, but it was hard-pinned to `items[0]` while the grid painted
 * EVERYONE's bookings. With two staff that means reading one person's appointments against
 * another person's hours, which is worse than showing too little.
 *
 * THE ROSTER IS EVERY STAFF ROW, NOT THE ACTIVE ONES (Codex review). Keying the scope off the
 * ACTIVE count reopened the same bleed by the back door: archive a staff member who has bookings,
 * leave one active, and the active count falls to 1 — scoping switches off and the archived
 * member's appointments paint onto the remaining member's calendar, against their hours. Archiving
 * stops someone taking NEW bookings; it does not delete the ones they already have. So the count
 * that matters is "how many staff rows does this site have at all", and archived members stay in
 * the selector (labelled) so their existing bookings remain reachable rather than merely hidden.
 *
 * A site with exactly one staff row — active, never archived anyone — still has no selector and no
 * filter, i.e. byte-identical behaviour to before any of this existed.
 *
 * The rules live in this pure module rather than inside the route's render closure for the same
 * reason `slot-select.js` does: they are the part worth pinning with a test, and a closure is
 * exactly where a stale copy of them hides.
 */

/**
 * Whether the view scopes itself to ONE staff member.
 *
 * With a single staff row there is nothing to scope: the answer would be the same either way, and
 * asking the server to filter by a staff id the account cannot vary is noise. This is also what
 * decides whether the selector renders at all, so "no selector" and "no filter" can never disagree.
 *
 * @param {number} staffCount Staff rows the site has, ACTIVE AND ARCHIVED (see the file header).
 * @return {boolean} Whether to scope to the selected member.
 */
export function scopesToOneStaff( staffCount ) {
	return Number( staffCount ) > 1;
}

/**
 * The selector's options, in roster order, with archived members marked.
 *
 * Archived members are listed because their bookings are still real and still on the calendar —
 * hiding them from the picker would make those appointments unreachable, which is the other half
 * of the bleed fix. The suffix is what stops the list reading as "these people take bookings".
 *
 * @param {Array} roster `GET /staff?status=all` items.
 * @return {Array} `[{ id, label, archived }]` in roster order.
 */
export function staffSelectorOptions( roster ) {
	return ( Array.isArray( roster ) ? roster : [] ).map( ( item ) => {
		const archived = item?.status === 'archived';
		return {
			id: item?.id,
			label: archived ? `${ item?.name } (archived)` : `${ item?.name }`,
			archived,
		};
	} );
}

/**
 * The booking-editor prefill for a free-slot click.
 *
 * Carries the clicked staff member (Codex review): the slot was clicked on ONE member's calendar,
 * against THEIR hours, so the booking has to be created for them. Without `staffId` the editor
 * fell back to any-staff availability and could hand the appointment to a different member — the
 * grid said one thing and the write did another. The editor still renders the staff combobox, so
 * the admin can override it; this only sets the honest default.
 *
 * `staffId` is omitted entirely when there is no selection, so a single-staff site sends exactly
 * the prefill it always sent.
 *
 * @param {Date}    start    Business-local slot start.
 * @param {string}  startUtc The same instant as a UTC ISO string.
 * @param {?number} staffId  Selected staff id, or null.
 * @return {Object} Prefill for `BookingEditor`.
 */
export function slotBookingPrefill( start, startUtc, staffId ) {
	const pad = ( n ) => String( n ).padStart( 2, '0' );
	const prefill = {
		date: `${ start.getFullYear() }-${ pad( start.getMonth() + 1 ) }-${ pad( start.getDate() ) }`,
		startUtc,
	};
	if ( staffId ) {
		prefill.staffId = Number( staffId );
	}

	return prefill;
}

/**
 * The `GET /bookings` query for the current scope.
 *
 * The filter is applied SERVER-side once there is more than one staff member because the window
 * caps at 100 rows: spending that budget on other people's appointments is how the selected
 * member's later bookings would silently fall off the grid. With one staff member the query is
 * byte-identical to what it always was.
 *
 * @param {Object}  base       Base query (status/from/to/per_page).
 * @param {?number} staffId    Selected staff id.
 * @param {number}  staffCount Active staff members.
 * @return {Object} Query to send.
 */
export function bookingQueryForStaff( base, staffId, staffCount ) {
	if ( ! scopesToOneStaff( staffCount ) || ! staffId ) {
		return { ...base };
	}
	return { ...base, staff_id: staffId };
}

/**
 * Whether one booking belongs on the grid for the selected member.
 *
 * Applied in addition to the query filter, so a response that arrives AFTER the selector moved can
 * never paint an appointment belonging to someone other than the member whose hours are shaded.
 * A booking with no resolvable staff is KEPT: dropping it would hide real work over a missing
 * field, and the DTO always carries `staff.id` today.
 *
 * @param {Object}  booking    Booking DTO.
 * @param {?number} staffId    Selected staff id.
 * @param {number}  staffCount Active staff members.
 * @return {boolean} Whether to render it.
 */
export function bookingBelongsToStaff( booking, staffId, staffCount ) {
	if ( ! scopesToOneStaff( staffCount ) || ! staffId ) {
		return true;
	}
	const owner = booking?.staff?.id;
	if ( ! owner ) {
		return true;
	}
	return Number( owner ) === Number( staffId );
}

/**
 * The staff id the view should use, given the roster and what is currently selected.
 *
 * Keeps the current selection when the roster still contains it, so a background reload never
 * moves the calendar under the user; otherwise falls back to the first ACTIVE member. The default
 * has to skip archived rows even though they are selectable: the calendar opens on whoever is
 * taking bookings today, not on whoever happens to sort first. Falls back to the first row when
 * every member is archived, and to `null` for an empty roster — the "add a staff member first"
 * state the Block-time mode already handles.
 *
 * @param {Array}   roster   Staff items, active AND archived.
 * @param {?number} selected Currently selected id.
 * @return {?number} Id to use.
 */
export function resolveSelectedStaff( roster, selected ) {
	const items = Array.isArray( roster ) ? roster : [];
	if ( selected && items.some( ( item ) => Number( item?.id ) === Number( selected ) ) ) {
		return Number( selected );
	}

	const active = items.find( ( item ) => item?.status !== 'archived' );

	return ( active ?? items[ 0 ] )?.id ?? null;
}

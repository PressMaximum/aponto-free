/**
 * What a click on a free calendar slot means (SPEC-P1 §1.4 · Q10).
 *
 * The calendar has ONE slot entry point and two modes: Event Calendar fires `select` on a
 * click-drag and `dateClick` on a bare click, and both land here. The branch lives in a pure
 * module rather than inside the route's render closure because that closure is exactly what
 * broke: the EC instance is created once, so it captured the mount-time handler and the armed
 * "Block time" mode never reached the branch at all — clicking a slot kept opening the
 * New-booking drawer and no POST /blocked-periods was ever issued.
 *
 * A bare `dateClick` carries no end — EC reports only the clicked instant — and
 * `POST /blocked-periods` rejects `end === start` ("The end must be after the start"), so a
 * click resolves to exactly one grid slot.
 */

/** Grid slot size in minutes. MUST match the `slotDuration` handed to Event Calendar. */
export const SLOT_DURATION_MIN = 30;

/** The same value in EC's `HH:MM:SS` option format. */
export const SLOT_DURATION = '00:30:00';

/**
 * Normalise an EC selection into a real, non-empty business-local range.
 *
 * @param {{start: Date, end?: Date|null}} info        EC `select`/`dateClick` payload.
 * @param {number}                         slotMinutes Grid slot size in minutes.
 * @return {{start: Date, end: Date}} Range with `end > start`.
 */
export function resolveSlotRange( info, slotMinutes = SLOT_DURATION_MIN ) {
	const start = new Date( info.start );
	const end = info.end ? new Date( info.end ) : null;
	if ( end && end.getTime() > start.getTime() ) {
		return { start, end };
	}
	return { start, end: new Date( start.getTime() + slotMinutes * 60000 ) };
}

/**
 * Resolve a slot selection into the action the route must take.
 *
 * `block-needs-staff` is its own outcome (not a silent no-op) because blocking writes against a
 * staff row: on an install with no staff yet the mode can never succeed, so the route reports it
 * and disarms instead of leaving the admin in a mode that swallows every click.
 *
 * @param {{start: Date, end?: Date|null}}      info        EC `select`/`dateClick` payload.
 * @param {{blockMode: boolean, staffId: ?number}} state    Current calendar mode.
 * @param {number}                              slotMinutes Grid slot size in minutes.
 * @return {{action: string, start: Date, end: Date}} Action plus the resolved range.
 */
export function planSlotSelection( info, { blockMode, staffId }, slotMinutes = SLOT_DURATION_MIN ) {
	const range = resolveSlotRange( info, slotMinutes );
	if ( ! blockMode ) {
		return { action: 'booking', ...range };
	}
	if ( ! staffId ) {
		return { action: 'block-needs-staff', ...range };
	}
	return { action: 'block', ...range };
}

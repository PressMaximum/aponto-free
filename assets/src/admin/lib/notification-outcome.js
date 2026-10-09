/**
 * Turning `PATCH /bookings/{id}`'s `notification` outcome into copy an admin can trust
 * (rest-contract §2.9 addendum 2026-09-03; D-R33 review item P2-5).
 *
 * The SPA used to derive this from the local `notify` checkbox, which knows whether the admin
 * ASKED for an email but not whether one exists. Two of the seeded customer templates
 * (`booking_completed_customer`, `booking_no_show_customer`) ship DISABLED, so a fresh install
 * cheerfully reported "Customer notified" for a message that had never been rendered. The server
 * now says what the outbox decided, and the three answers deserve three different sentences:
 *
 * - `sent`       — the mailer accepted it during this request. The ONLY value allowed to claim
 *                  the customer was told.
 * - `queued`     — a real row exists but this request did not attempt it; the cron will. Say so
 *                  plainly rather than promising delivery that has not happened.
 * - `failed`     — the attempt was made and refused. A Send-log row exists, so the copy points
 *                  there; that is the one place the admin can actually see why.
 * - `not_queued` — the outbox could not accept the job at all. Deliberately NOT `failed`: there
 *                  is no log row, so sending someone to read one would waste their time.
 * - `suppressed` — the system declined to send a message it HAS (notify off, flood cap, no
 *                  usable address). Worth saying out loud, because it was a choice.
 * - `disabled`   — the site never switched that email on. Not a failure, so the copy simply
 *                  stops talking about the customer; a toast is the wrong place to lecture about
 *                  Settings.
 * - `none` / absent — no customer email belongs to this transition, or the build predates the
 *                  field. Same silent treatment as `disabled`.
 *
 * This lives in its own leaf module so both the list route and the in-flow editor share ONE rule
 * (they were drifting apart) and so it is unit-testable without dragging `@wordpress/components`
 * into the test runtime.
 */

/**
 * Human wording for a status the API spells in snake_case — a customer is "marked no-show",
 * never "marked no_show".
 */
export const STATUS_WORD = {
	pending: 'pending',
	confirmed: 'confirmed',
	completed: 'completed',
	cancelled: 'cancelled',
	no_show: 'no-show',
};

/**
 * The "…and here is what the customer heard" half of a status toast.
 *
 * @param {string} notification `queued` | `suppressed` | `disabled` | `none` (absent on old builds).
 * @return {string} Suffix beginning with a space, or '' when nothing may be claimed.
 */
export function notifiedSuffix( notification ) {
	if ( notification === 'sent' ) return ' Customer notified.';
	if ( notification === 'queued' ) return ' Notification queued.';
	if ( notification === 'failed' ) return ' Notification failed — check the Notifications log.';
	if ( notification === 'not_queued' ) return ' Notification could not be queued.';
	if ( notification === 'suppressed' ) return ' Customer not notified.';
	return '';
}

/**
 * The toast tone of a status change (D-R64): `success` when the booking moved to a state the
 * operator asked to REACH — confirmed, completed, or back to pending (Restore) — and the neutral
 * `default` when it was stopped or did not happen (cancelled, no-show).
 *
 * @param {string} next Target status (wire value).
 * @return {string} `success` or `default`.
 */
export function statusTone( next ) {
	return 'confirmed' === next || 'completed' === next || 'pending' === next ? 'success' : 'default';
}

/**
 * The whole toast for a status change made from the list.
 *
 * @param {string} customer     Customer name.
 * @param {string} next         Target status (wire value).
 * @param {string} notification The response's `notification` outcome.
 * @return {string} Toast copy.
 */
export function statusToast( customer, next, notification ) {
	return `${ customer } marked ${ STATUS_WORD[ next ] || next }.${ notifiedSuffix( notification ) }`;
}

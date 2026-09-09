/**
 * Pure Schedule-cell helpers for the Bookings list (SPEC-P1 §7.2). Import-free so the
 * customer-timezone labelling is unit-testable in the framework-free node jest env.
 *
 * The primary time shown in the Schedule cell is ALWAYS business/studio time. The secondary
 * line names the CUSTOMER's timezone only when it differs, and is prefixed with
 * "Customer time ·" so it can never be misread as the displayed time being in the customer's
 * zone — matching the booking editor's "Business time · … · Customer time …" note.
 */

/**
 * Display label for the customer's timezone, or '' when it matches business time or is unknown.
 *
 * @param {Object} booking          Adapted booking row ({customerTimezone, timezone}).
 * @param {string} businessTimezone IANA business timezone.
 * @return {string} Timezone display label (e.g. `Los Angeles (GMT-8)`), or '' when the zones match.
 */
export function customerTimezoneLabel( booking, businessTimezone ) {
	if ( ! booking.customerTimezone || booking.customerTimezone === businessTimezone ) {
		return '';
	}
	return booking.timezone || booking.customerTimezone;
}

/**
 * Secondary Schedule-cell line naming the customer timezone, prefixed so it never reads as the
 * displayed (business) time. '' when the customer zone matches business time or is unknown.
 *
 * @param {Object} booking          Adapted booking row.
 * @param {string} businessTimezone IANA business timezone.
 * @return {string} `Customer time · {label}`, or '' when the zones match.
 */
export function customerTimezoneLine( booking, businessTimezone ) {
	const label = customerTimezoneLabel( booking, businessTimezone );
	return label ? `Customer time · ${ label }` : '';
}

/**
 * Pure Schedule-cell helpers for the Bookings list (SPEC-P1 §7.2). Import-free so the
 * customer-timezone labelling is unit-testable in the framework-free node jest env.
 *
 * The primary time shown in the Schedule cell is ALWAYS business/studio time. The secondary
 * line names the CUSTOMER's timezone only when it differs — with the customer's own clock when the
 * caller can format one (T-049) — and is prefixed so it can never be misread as the displayed time
 * being in the customer's zone, matching the booking editor's "Business time · … · Customer time …"
 * note.
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
 * With a `formatTime` the line prints the customer's OWN clock — "Customer: 4:00 PM · Ho Chi Minh
 * (GMT+7)" (persona QA 2026-10-05, T-049): a bare "Customer time · {zone}" under the business time
 * still read as if that time were the customer's. Without one (or when the zone cannot be
 * formatted) it stays the plain zone caption.
 *
 * @param {Object}   booking          Adapted booking row.
 * @param {string}   businessTimezone IANA business timezone.
 * @param {Function} [formatTime]     `( utcInstant, timezone ) => string`, e.g. `timeLabel`.
 * @return {string} The caption, or '' when the zones match.
 */
export function customerTimezoneLine( booking, businessTimezone, formatTime = null ) {
	const label = customerTimezoneLabel( booking, businessTimezone );
	if ( ! label ) {
		return '';
	}
	if ( formatTime && booking.startUtc ) {
		try {
			const time = formatTime( booking.startUtc, booking.customerTimezone );
			if ( time ) {
				return `Customer: ${ time } · ${ label }`;
			}
		} catch ( e ) {
			// A zone this browser cannot format: fall through to the caption.
		}
	}
	return `Customer time · ${ label }`;
}

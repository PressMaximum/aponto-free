/**
 * UI copy for the booking widget.
 *
 * Each string is wrapped with `@wordpress/i18n` `__()` (P1b i18n, SPEC-P1 §5) so
 * it is extracted by `wp i18n make-pot` and swapped for the active locale when
 * the bundle's script translations load. English / USD mirror the v4 mockup's
 * `states.html` copy exactly where it enumerates a state. No PII and no server
 * internals ever reach these strings — visitor-safe only.
 */
import { __ } from '@wordpress/i18n';

export const COPY = {
	// Step headings + subs.
	service_title: __( 'Choose a service', 'aponto' ),
	// Three subs because the step's controls are data-driven: the sub must never
	// promise a category browser or a search field that this catalogue does not
	// render (mockup `index.html` category catalogue vs. its no-category fallback).
	service_sub: __( 'Browse a category or search by name.', 'aponto' ),
	service_sub_search: __( 'Search or browse all available services.', 'aponto' ),
	service_sub_plain: __( 'Pick the service you’d like to book.', 'aponto' ),
	datetime_title: __( 'Pick a date & time', 'aponto' ),
	datetime_sub: __( 'Choose an available appointment.', 'aponto' ),
	details_title: __( 'Your details', 'aponto' ),
	details_sub: '',
	payment_title: __( 'Payment method', 'aponto' ),
	payment_sub: __( 'Choose how you would like to pay.', 'aponto' ),

	// Progress.
	/* translators: 1: current step, 2: total steps. */
	step_of: __( 'Step %1$d of %2$d', 'aponto' ),

	// Service step.
	search_placeholder: __( 'Search all services…', 'aponto' ),
	all_services: __( 'All services', 'aponto' ),
	all_categories: __( 'All categories', 'aponto' ),
	/* translators: %s: formatted starting price, e.g. "$40". */
	from_price: __( 'from %s', 'aponto' ),
	/* translators: %d: number of services in a category. */
	services_count: __( '%d services', 'aponto' ),
	service_count_one: __( '1 service', 'aponto' ),
	no_services: __( 'No services are available for online booking right now.', 'aponto' ),
	no_services_sub: __( 'Please check back soon or contact us.', 'aponto' ),
	/* translators: %s: the text the visitor typed into the service search. */
	no_matches: __( 'No services match “%s”.', 'aponto' ),
	change_service: __( 'Change service', 'aponto' ),

	// Date & time.
	prev_month: __( 'Previous month', 'aponto' ),
	next_month: __( 'Next month', 'aponto' ),
	available_times: __( 'Available times', 'aponto' ),
	/* translators: 1: day label e.g. "Aug 3", 2: number of open start times. */
	slots_day_count: __( '%1$s · %2$d open', 'aponto' ),
	/* translators: %s: the selected day, e.g. "Monday, 3 August". */
	no_slots_day: __( 'No open times on %s — try another day.', 'aponto' ),
	times_shown_in: __( 'Times shown in', 'aponto' ),
	visitor_tz_label: __( 'Your timezone', 'aponto' ),
	// %2$s is already a "City (GMT±N)" label, so it carries its own parentheses —
	// join with a middot like the Summary's studio line instead of wrapping it in
	// a second set of parens ("…studio (Berlin (GMT+2))").
	/* translators: 1: time at the business, 2: the business time-zone label. */
	business_time_line: __( 'That’s %1$s at the studio · %2$s', 'aponto' ),
	refreshed: __( '(refreshed)', 'aponto' ),

	// Details.
	name_label: __( 'Full name', 'aponto' ),
	name_placeholder: __( 'Jordan Reyes', 'aponto' ),
	email_label: __( 'Email', 'aponto' ),
	email_placeholder: __( 'you@example.com', 'aponto' ),
	phone_label: __( 'Phone', 'aponto' ),
	phone_optional: __( '(optional)', 'aponto' ),
	phone_placeholder: __( '(555) 123-4567', 'aponto' ),
	note_label: __( 'Notes for the business', 'aponto' ),
	note_optional: __( '(optional)', 'aponto' ),
	note_placeholder: __( 'Anything we should know?', 'aponto' ),
	consent_default: __( 'I agree to the booking terms and privacy policy.', 'aponto' ),
	select_placeholder: __( 'Choose…', 'aponto' ),

	// Buttons.
	back: __( 'Back', 'aponto' ),
	continue: __( 'Continue', 'aponto' ),
	book: __( 'Book appointment', 'aponto' ),
	saving: __( 'Saving…', 'aponto' ),
	try_again: __( 'Try again', 'aponto' ),

	// Validation.
	err_name_required: __( 'Please enter your name.', 'aponto' ),
	err_email_required: __( 'Please enter your email.', 'aponto' ),
	err_email_invalid: __( 'That email doesn’t look right.', 'aponto' ),
	err_phone_required: __( 'Please enter a phone number.', 'aponto' ),
	err_consent_required: __( 'Please accept the booking terms to continue.', 'aponto' ),
	err_field_required: __( 'This field is required.', 'aponto' ),
	/* translators: %d: maximum number of characters allowed in the answer. */
	err_field_too_long: __( 'Please keep this under %d characters.', 'aponto' ),
	err_pick_time: __( 'Please pick a time.', 'aponto' ),
	validation_general_title: __( 'We couldn’t submit your booking.', 'aponto' ),
	// Shown when the server rejects a field this page never rendered — the booking
	// form was open while the business changed which details it collects.
	stale_form_hint: __(
		'This form is out of date — please refresh the page and book again.',
		'aponto'
	),
	validation_general_body: __(
		'Something in the form needs attention. Please review your details and try again.',
		'aponto'
	),

	// Payment step (D-R38). Every amount below is the ORDER total the server will
	// charge; the widget only formats what it already shows in the summary.
	pay_onsite_title: __( 'Pay on-site', 'aponto' ),
	pay_onsite_sub: __( 'Settle at your appointment', 'aponto' ),
	// The panel heading NAMES the gateway ("Card details" / "PayPal"), so it
	// lives with the rest of that gateway's copy in `lib/payments.js`; only the
	// half that is true of every gateway is here.
	pay_secure: __( 'Secure', 'aponto' ),
	pay_loading: __( 'Loading secure payment…', 'aponto' ),
	/* translators: %s: formatted order total, e.g. "$55.00". */
	pay_note_now: __( 'You will be charged %s now.', 'aponto' ),
	/* translators: %s: formatted order total, e.g. "$55.00". */
	pay_note_onsite: __(
		'No payment needed now — the full %s is due at your appointment.',
		'aponto'
	),
	/* translators: %s: formatted order total, e.g. "$55.00". */
	pay_cta: __( 'Pay %s & book', 'aponto' ),
	// The footer has no button for a gateway that owns the CTA (PayPal), so the
	// step says where the button actually is.
	pay_cta_gateway: __(
		'Use the payment buttons above to finish your booking.',
		'aponto'
	),
	// Said in the SAME place, while that gateway has an attempt in flight: Back
	// and the method cards are disabled for as long as it lasts (D-R40), and a
	// control that greys out without a reason reads as a broken page.
	pay_cta_gateway_busy: __(
		'Finish or close the payment window to continue.',
		'aponto'
	),
	pay_busy: __( 'Processing…', 'aponto' ),
	/* translators: %s: formatted order total, e.g. "$55.00". */
	pay_cta_resume: __( 'Pay %s & finish booking', 'aponto' ),
	/* translators: %s: local time the held slot is released, e.g. "3:45 PM". */
	pay_held_until: __( 'Your slot is held until %s.', 'aponto' ),
	// Resume link that no longer leads anywhere payable.
	resume_paid_title: __( 'This booking is already paid', 'aponto' ),
	resume_paid_lead: __(
		'Nothing more to do — check your email for the link to manage this booking.',
		'aponto'
	),
	// SAYS WHAT IS CERTAIN, NOT WHAT IS LIKELY (QA run 2 FINDING-4). "The slot
	// was released" was a claim about a slot this screen does not own: the
	// release belongs to the resume route and, for holds it cannot take, to
	// `aponto_payments_tick` — which on a quiet site is minutes away. The
	// payment WINDOW is the part that has certainly closed, and the release is
	// stated as under way, which is true in both cases.
	resume_gone_title: __( 'Your payment window has closed', 'aponto' ),
	resume_gone_lead: __(
		'The payment did not arrive in time, so the slot is being released. You can book again below.',
		'aponto'
	),
	resume_book_again: __( 'Book again', 'aponto' ),
	// …and the resume refusal that is NOT terminal: the order is locked by
	// another writer for the moment, so the slot is still held and the only
	// correct advice is to try the same link again (D-R39c round 2).
	resume_busy_title: __( 'Payment is busy right now', 'aponto' ),
	resume_busy_lead: __(
		'Your slot is still held. Something else is finishing on this booking — try again in a moment.',
		'aponto'
	),
	pay_onsite_instead: __( 'Pay on-site instead', 'aponto' ),
	// Under the "temporarily unavailable" title (which NAMES the gateway, so it
	// lives in `lib/payments.js`): the one fact the customer needs before they
	// decide whether to retry.
	pay_ui_unavailable_body: __(
		'Nothing has been booked or charged yet.',
		'aponto'
	),
	pay_generic_error: __(
		'We couldn’t complete the payment. Please check your details and try again.',
		'aponto'
	),
	pay_begin_failed_title: __( 'We couldn’t start the payment.', 'aponto' ),
	// `retryable: false` on an `unavailable` block (rest-contract §3.3): the gateway REFUSED this
	// order's amount or currency, so it will refuse it again. Repeating "your slot is held until
	// 3:45 PM" there reads as "try again", which is the one thing that cannot work.
	pay_begin_refused_body: __(
		'This payment method can’t take this amount. Please contact us to complete your booking.',
		'aponto'
	),
	/* translators: %s: local time the held slot is released, e.g. "3:45 PM". */
	pay_hold_until: __( 'Your slot is held until %s.', 'aponto' ),
	pay_hold_generic: __( 'Your slot is still held for a short while.', 'aponto' ),
	pay_hold_kept_title: __( 'Your slot is still held', 'aponto' ),
	/* translators: %s: local time the held slot is released, e.g. "3:45 PM". */
	pay_hold_kept: __(
		'We couldn’t release it — it stays held until %s, then frees up automatically.',
		'aponto'
	),
	pay_hold_kept_generic: __(
		'We couldn’t release it right away. It frees up automatically.',
		'aponto'
	),
	// The counterpart of `pay_hold_until` for a hold that is already GONE. The
	// "payment not completed" panel would otherwise promise a deadline on a slot
	// somebody else can now book.
	pay_hold_released: __(
		'That time is back on sale. Nothing has been charged.',
		'aponto'
	),
	pay_incomplete_title: __( 'Payment not completed', 'aponto' ),
	pay_incomplete_lead: __(
		'Nothing has been charged. You can try again while your slot is held.',
		'aponto'
	),
	// The paid line NAMES the method the customer used ("by card", "with
	// PayPal"), so it lives with the rest of that gateway's copy in
	// `lib/payments.js`. This one is the fallback for a booking whose method the
	// panel does not know — a return leg, or a gateway some future driver adds.
	/* translators: 1: formatted amount paid, 2: order code, e.g. "AP-7Q2F4". */
	pay_paid_line: __( 'Paid %1$s · reference %2$s', 'aponto' ),
	// The return leg has no amount to quote: `sessionStorage` carries display
	// facts and references only (F5), and the confirm route answers with state
	// alone. Saying "paid" without inventing a figure is the honest version.
	/* translators: %s: order code, e.g. "AP-7Q2F4". */
	pay_paid_line_plain: __( 'Payment received · reference %s', 'aponto' ),
	pay_pending_line: __(
		'Payment processing — we’ll email you as soon as it clears.',
		'aponto'
	),
	pay_minimal_lead: __(
		'Check your email — we’ve sent a link to manage this booking.',
		'aponto'
	),

	// Decline reasons (rest-contract §3.8, closed vocabulary). One sentence each,
	// written for the person holding the card: what happened, and the one thing
	// they can do about it. The gateway's own text never reaches here — it is
	// written for a merchant reading a dashboard and can quote the cardholder's
	// own data back at them.
	pay_fail_card_declined: __(
		'Your card was declined. Try another card, or check with your bank.',
		'aponto'
	),
	pay_fail_insufficient_funds: __(
		'That card doesn’t have enough available funds. Try another card.',
		'aponto'
	),
	pay_fail_expired_card: __( 'That card has expired. Try another card.', 'aponto' ),
	pay_fail_incorrect_cvc: __(
		'That security code didn’t match. Check the code and try again.',
		'aponto'
	),
	pay_fail_processing_error: __(
		'The payment couldn’t be processed just now. Please try again.',
		'aponto'
	),
	pay_fail_authentication_failed: __(
		'Your bank couldn’t verify that payment. Try again, or use another card.',
		'aponto'
	),
	// The buyer's chosen funding source was refused while the order itself stays
	// payable. A gateway that can reopen its own funding picker does that instead
	// of showing this (PayPal's `actions.restart()`); this is what a customer sees
	// when it cannot.
	pay_fail_instrument_declined: __(
		'That payment method was declined. Choose another one and try again.',
		'aponto'
	),
	// Deliberately does NOT invite a retry: the amount is what is in doubt, so
	// paying again is the one thing the customer should not do unprompted.
	pay_fail_unverified_amount: __(
		'We couldn’t confirm the amount for this payment. Please contact us before trying again.',
		'aponto'
	),
	// The hold was already gone when the server went to take the money, so it
	// refused to (rest-contract §3.8). Retrying THIS order is the one thing that
	// cannot work — the slot it was for is back on sale — so the copy sends the
	// customer to a new time rather than to a button that will fail again.
	pay_fail_hold_released: __(
		'Your slot was released before the payment went through, so we didn’t take it. Nothing has been charged — please pick a new time.',
		'aponto'
	),

	// Summary (sidebar heading + the running total shared with the recap accordion).
	summary_title: __( 'Your booking', 'aponto' ),
	summary_total: __( 'Total', 'aponto' ),
	/* translators: label before the same appointment time in the business's own timezone. */
	summary_studio: __( 'Studio', 'aponto' ),

	// Errors / banners / toasts.
	toast_slot_taken_title: __( 'Time no longer available', 'aponto' ),
	toast_slot_taken_body: __( 'Availability refreshed. Pick another time.', 'aponto' ),
	rate_limited_title: __( 'Too many attempts.', 'aponto' ),
	/* translators: %d: number of seconds to wait before retrying. */
	rate_limited_body: __( 'Please wait %ds and try again.', 'aponto' ),
	/* translators: %d: number of seconds to wait before retrying. */
	rate_limited_cta: __( 'Try again in %ds', 'aponto' ),
	in_flight_title: __( 'Your booking is still processing.', 'aponto' ),
	in_flight_body: __( 'Keep this page open. We’ll check again automatically.', 'aponto' ),
	in_flight_cta: __( 'Checking…', 'aponto' ),
	lock_timeout_title: __( 'We couldn’t confirm just now.', 'aponto' ),
	lock_timeout_body: __(
		'The server was busy. Your booking was not created — retry safely.',
		'aponto'
	),
	guard_title: __( 'We couldn’t process this request.', 'aponto' ),
	guard_body: __( 'Please refresh and try again, or contact us if it persists.', 'aponto' ),
	load_services_err: __( 'We couldn’t load services.', 'aponto' ),
	load_availability_err: __( 'We couldn’t load available times.', 'aponto' ),
	load_retry_sub: __( 'Check your connection and try again.', 'aponto' ),

	// Confirmation.
	confirm_pending_title: __( 'Booking received', 'aponto' ),
	confirm_pending_lead: __( 'We’ll email you the moment it’s confirmed.', 'aponto' ),
	confirm_confirmed_title: __( 'Appointment confirmed', 'aponto' ),
	confirm_confirmed_lead: __( 'Your appointment is confirmed.', 'aponto' ),
	confirm_manage_hint: __(
		'Check your email — we’ve sent a link to manage this booking.',
		'aponto'
	),
	order_label: __( 'ORDER', 'aponto' ),
	add_to_calendar: __( 'Add to calendar', 'aponto' ),
	cal_google: __( 'Google', 'aponto' ),
	cal_ics: __( '.ics', 'aponto' ),
	print: __( 'Print', 'aponto' ),
	book_another: __( 'Book another appointment', 'aponto' ),
	replay_title: __( 'Booking received', 'aponto' ),
	replay_lead: __( 'This appointment is already on file.', 'aponto' ),
	replay_body: __(
		'Your manage link and calendar file were already emailed to you. Check your inbox to add it to your calendar.',
		'aponto'
	),
};

/**
 * The customer-facing sentence for a decline code.
 *
 * The vocabulary is CLOSED at the server boundary (rest-contract §3.8), so an
 * unknown value here means either `other` or a gateway the server folded — both
 * of which get the generic copy rather than a guess.
 *
 * @param {string} code Failure code from `/confirm`.
 * @return {string} A customer-safe sentence.
 */
export function paymentFailureCopy( code ) {
	const key = 'pay_fail_' + String( code || '' ).toLowerCase();
	return COPY[ key ] || COPY.pay_generic_error;
}

/**
 * printf-style substitution supporting `%s`, `%d` and positional `%1$s`.
 *
 * @param {string} template Template.
 * @param {...*}   args     Args.
 * @return {string} Filled string.
 */
export function sprintf( template, ...args ) {
	let i = 0;
	return String( template ).replace( /%(?:(\d+)\$)?[sd]/g, ( match, pos ) => {
		const idx = pos ? parseInt( pos, 10 ) - 1 : i++;
		const v = args[ idx ];
		return v === undefined || v === null ? '' : String( v );
	} );
}

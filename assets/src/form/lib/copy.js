/**
 * UI copy for the booking widget.
 *
 * Each string is wrapped with `@wordpress/i18n` `__()` (P1b i18n, SPEC-P1 §5) so
 * it is extracted by `wp i18n make-pot` and swapped for the active locale when
 * the bundle's script translations load. English / USD mirror the v4 mockup's
 * `states.html` copy exactly where it enumerates a state. No PII and no server
 * internals ever reach these strings — visitor-safe only.
 */
import { __, _x } from '@wordpress/i18n';

export const COPY = {
	amount_paid: __( 'Amount paid', 'aponto' ),
	deposit_due: __( 'Deposit due now', 'aponto' ),
	deposit_paid: __( 'Deposit paid', 'aponto' ),
	balance_onsite: __( 'Balance on site', 'aponto' ),
	balance_due: __( 'Balance due', 'aponto' ),
	deposit_cancel_note: __( 'The deposit is not refunded automatically if you cancel.', 'aponto' ),
	terms_changed: __( 'Your payment terms have changed. Review the amounts before paying.', 'aponto' ),
	// Step headings + subs.
	service_title: __( 'Choose a service', 'aponto' ),
	// Three subs because the step's controls are data-driven: the sub must never
	// promise a category browser or a search field that this catalogue does not
	// render (mockup `index.html` category catalogue vs. its no-category fallback).
	service_sub: __( 'Browse a category or search by name.', 'aponto' ),
	service_sub_search: __( 'Search or browse all available services.', 'aponto' ),
	service_sub_plain: __( 'Pick the service you’d like to book.', 'aponto' ),
	// Staff step (D-R50; re-worded by D-R52). Only ever rendered when the chosen service has more
	// than one eligible staff member, so the copy can assume there is a real choice to make.
	//
	// **No noun is hard-coded.** Aponto serves salons, clinics, gyms and tutors, so the product
	// ships a NEUTRAL default term and the operator may replace it with their own word
	// (`booking.staff_label` — "stylist", "doctor", "trainer"…). Every template below is written
	// WITHOUT an article so it reads correctly for any noun and translates cleanly.
	staff_term: __( 'staff member', 'aponto' ),
	/* translators: %s: what this business calls its staff, e.g. "stylist" or "staff member". */
	staff_title: __( 'Choose your %s', 'aponto' ),
	staff_sub: __(
		'Pick who you’d like to see, or let us find the first available.',
		'aponto'
	),
	// `booking.staff_choice = required` (D-R52): there is no "Any available" row, so the sub must
	// not offer an escape hatch the step does not have.
	staff_sub_required: __( 'Pick who you’d like to see.', 'aponto' ),
	staff_any: __( 'Any available', 'aponto' ),
	/* translators: %s: what this business calls its staff, e.g. "stylist" or "staff member". */
	staff_any_sub: __(
		'We’ll book you with the first available %s.',
		'aponto'
	),
	// The card layout has ~190px for this line and truncates it to one line, so the banner sub
	// is the short form of the same sentence rather than an ellipsised long one.
	/* translators: %s: what this business calls its staff, e.g. "stylist" or "staff member". */
	staff_any_sub_short: __( 'First available %s', 'aponto' ),
	// Profile disclosure (D-R52). The trigger's accessible name always carries the person's
	// name, because at 12 people a list of identical "Learn more" buttons is unnavigable; the
	// visible label is the short one and is hidden on narrow rows and in cards.
	staff_learn_more: __( 'Learn more', 'aponto' ),
	/* translators: %s: staff member name. */
	staff_about: __( 'About %s', 'aponto' ),
	staff_profile_close: __( 'Close profile', 'aponto' ),
	// Stale-form recovery (fix round 1): the site switched to "Customers must choose" while this
	// visitor had the form open, so the server refused their "Any available" booking. Says what
	// to do, not what went wrong — the change is the business's, not the customer's mistake.
	/* translators: %s: what this business calls its staff, e.g. "stylist" or "staff member". */
	toast_staff_required_title: __( 'Choose your %s', 'aponto' ),
	toast_staff_required_body: __(
		'This booking form was updated while you were filling it in. Please pick who you’d like to see.',
		'aponto'
	),
	/* translators: %s: staff member first name. */
	staff_book_with: __( 'Book with %s', 'aponto' ),
	// Location step (D-R62, v4 mockup `locationHTML()`). Only rendered when the chosen service is
	// offered at two or more places, and there is deliberately no "Any location" row (D-R60):
	// assigning a place to a customer is a surprise, not a convenience.
	location_title: __( 'Choose a location', 'aponto' ),
	// Neutral on purpose: no "be seen", no "visit" — a gym, a tutor and a clinic all read it.
	location_sub: __( 'Pick the location for your appointment.', 'aponto' ),
	// Stale-form recovery (D-R62, the D-R52 `staff_id` shape): the site started asking for a
	// location — or the one chosen stopped serving this service — while the form was open. The
	// toast's title is `location_title`.
	// …and the same recovery when there is NO question left to ask (one branch remains, assigned
	// without asking): the customer is sent back to confirm a time, so this says only that.
	toast_form_updated_title: __( 'This booking form was updated', 'aponto' ),
	toast_form_updated_body: __(
		'Something changed while you were filling it in. Please choose your time again.',
		'aponto'
	),
	toast_location_body: __(
		'This booking form was updated while you were filling it in. Please pick the location for your appointment.',
		'aponto'
	),
	datetime_title: __( 'Pick a date & time', 'aponto' ),
	details_title: __( 'Your details', 'aponto' ),
	details_sub: '',
	payment_title: __( 'Payment method', 'aponto' ),
	payment_sub: __( 'Choose how you would like to pay.', 'aponto' ),

	// Macro progress (D-R53, horizontal step display). SHORT labels: six of them share one row,
	// and below a 440px content column only the numbered circles are drawn — the words stay in
	// the DOM, visually hidden, so a screen reader still gets them.
	progress_label: __( 'Booking progress', 'aponto' ),
	step_service: __( 'Service', 'aponto' ),
	/* translators: short label of the booking step where the customer picks a place (D-R62). */
	step_location: __( 'Location', 'aponto' ),
	// The neutral FALLBACK only: a site that set its own word for a staff member gets that word,
	// capitalised, because the step heading two lines below already uses it (D-R52).
	step_staff: __( 'Staff', 'aponto' ),
	step_datetime: __( 'Time', 'aponto' ),
	step_details: __( 'Details', 'aponto' ),
	step_payment: __( 'Payment', 'aponto' ),
	step_confirmation: __( 'Confirm', 'aponto' ),

	// Progress.
	/* translators: 1: current step, 2: total steps. */
	step_of: __( 'Step %1$d of %2$d', 'aponto' ),

	// Service step.
	search_placeholder: __( 'Search all services…', 'aponto' ),
	all_services: __( 'All services', 'aponto' ),
	all_categories: __( 'All categories', 'aponto' ),
	/* translators: %s: formatted starting price, e.g. "$40". */
	from_price: __( 'from %s', 'aponto' ),
	// A service priced exactly 0 (D-R81), wherever the form prints its price. Its own context:
	// the admin's bare "Free" names the EDITION, and the two translate differently.
	price_free: _x( 'Free', 'price of a service that costs nothing', 'aponto' ),
	/* translators: %d: number of services in a category. */
	services_count: __( '%d services', 'aponto' ),
	service_count_one: __( '1 service', 'aponto' ),
	no_services: __( 'No services are available for online booking right now.', 'aponto' ),
	no_services_sub: __( 'Please check back soon or contact us.', 'aponto' ),
	/* translators: %s: the text the visitor typed into the service search. */
	no_matches: __( 'No services match “%s”.', 'aponto' ),
	change_service: __( 'Change service', 'aponto' ),
	// D-R79: a paid service while online payment is required and no payment method is ready.
	paid_unavailable_title: __(
		'Online booking for this service is temporarily unavailable.',
		'aponto'
	),
	paid_unavailable_body: __( 'Please contact us.', 'aponto' ),

	// Date & time.
	prev_month: __( 'Previous month', 'aponto' ),
	next_month: __( 'Next month', 'aponto' ),
	available_times: __( 'Available times', 'aponto' ),
	/* translators: %s: the picked day, e.g. "October 9" (shown in the accent colour). */
	slots_for_day: __( 'Pick a slot for %s', 'aponto' ),
	/* translators: %d: number of open start times on the picked day. */
	slots_open: __( '%d open', 'aponto' ),
	// A time this visitor already holds at an external checkout (D-R71w): shown, not bookable.
	slot_in_cart: __( 'In your cart', 'aponto' ),
	/* translators: %s: date and time of an appointment the visitor already holds, e.g. "Oct 8, 3:00 PM". */
	slot_in_cart_at: __( 'In your cart: %s', 'aponto' ),
	// "Checkout in progress" notice above the form (D-R71w).
	/* translators: %s: what is waiting, e.g. "Full colour · Oct 8, 3:00 PM". */
	checkout_waiting: __( 'You have a booking waiting at checkout: %s', 'aponto' ),
	/* translators: %d: number of bookings waiting at checkout (2 or more). */
	checkout_waiting_many: __( 'You have %d bookings waiting at checkout.', 'aponto' ),
	checkout_resume: __( 'Resume checkout', 'aponto' ),
	checkout_change: __( 'Change it', 'aponto' ),
	checkout_change_hint: __(
		'Booking a new time replaces it and frees that time.',
		'aponto'
	),
	checkout_add_another: __( 'Add another appointment', 'aponto' ),
	// D-R64 item 4: said (screen readers) when the calendar moved on its own past empty months.
	/* translators: %s: a month and year, e.g. "October 2026". */
	month_advanced: __( 'Showing %s — the first month with available times.', 'aponto' ),
	/* translators: %s: the selected day, e.g. "Monday, 3 August". */
	no_slots_day: __( 'No open times on %s — try another day.', 'aponto' ),
	// A whole month with nothing to book — and, for a service nobody can perform yet, every
	// month (persona QA 2026-10-05, T-073): a fully greyed calendar with no words is a dead end.
	no_slots_month: __(
		'No times are available this month. Try another month, or contact us.',
		'aponto'
	),
	// The end of a booking that runs past midnight in the zone on screen (T-058).
	/* translators: %s: an end time that falls on the day after the start, e.g. "1:00 AM". */
	time_next_day: __( '%s (+1 day)', 'aponto' ),
	times_shown_in: __( 'Times shown in', 'aponto' ),
	// The SSA-style note: shown ONLY when the site is displaying a clock that is
	// not the visitor's own (D-R48). %s is already a "City (GMT±N)" label.
	/* translators: %s: a timezone label, e.g. "Ho Chi Minh (GMT+7)". */
	times_shown_in_tz: __( 'Times shown in %s', 'aponto' ),
	visitor_tz_label: __( 'Your timezone', 'aponto' ),
	// The picker affordance that replaced the raw zone <select> (D-R48): a text
	// button beside the display-zone label, opening a searchable dialog.
	change_timezone: __( 'Change', 'aponto' ),
	// The visible text stays the bare "Change"; the accessible name has to say
	// WHAT changes and what it is now, because a screen-reader user meets this
	// button out of its visual context beside the zone label (Codex review 3).
	/* translators: %s: the current timezone label, e.g. "Ho Chi Minh (GMT+7)". */
	change_timezone_a11y: __( 'Change timezone, currently %s', 'aponto' ),
	tz_dialog_title: __( 'Choose a timezone', 'aponto' ),
	tz_search_label: __( 'Search timezones', 'aponto' ),
	tz_search_placeholder: __( 'Search a city…', 'aponto' ),
	tz_suggested: __( 'Suggested', 'aponto' ),
	tz_search_hint: __( 'Type a city to see every timezone.', 'aponto' ),
	/* translators: %s: the text the visitor typed into the timezone search. */
	tz_no_matches: __( 'No timezone matches “%s”.', 'aponto' ),
	/* translators: %d: how many timezones the list is currently showing. */
	tz_count: __( '%d timezones', 'aponto' ),
	tz_count_one: __( '1 timezone', 'aponto' ),
	tz_close: __( 'Close', 'aponto' ),
	// %2$s is already a "City (GMT±N)" label, so it carries its own parentheses —
	// join with a middot like the Summary's business-time line instead of wrapping it in
	// a second set of parens ("…business (Berlin (GMT+2))").
	//
	// **No business noun** (D-R52 rule; persona QA 2026-10-05, T-059): this said "at the
	// studio" to the customers of a salon and of a clinic. "The business" is the neutral term
	// the form already uses ("Notes for the business"), needs no setting, and is the SAME
	// wording as the summary label below, the mails and the manage page.
	/* translators: 1: time at the business — with its date when that differs from the customer's, e.g. "5:30 PM" or "Fri, Oct 30, 5:30 PM"; 2: the business time-zone label. */
	business_time_line: __(
		'That’s %1$s local time at the business · %2$s',
		'aponto'
	),
	refreshed: __( '(refreshed)', 'aponto' ),

	// Details.
	// Name split (2026-10-01): two inputs, autocomplete given-name / family-name. The
	// placeholders are sample names, not instructions — translate them to names that read as
	// ordinary in your locale.
	first_name_label: __( 'First name', 'aponto' ),
	last_name_label: __( 'Last name', 'aponto' ),
	/* translators: Placeholder for the first-name input — a sample given name. */
	first_name_placeholder: __( 'Jordan', 'aponto' ),
	/* translators: Placeholder for the last-name input — a sample family name. */
	last_name_placeholder: __( 'Reyes', 'aponto' ),
	email_label: __( 'Email', 'aponto' ),
	email_placeholder: __( 'you@example.com', 'aponto' ),
	phone_label: __( 'Phone', 'aponto' ),
	phone_optional: __( '(optional)', 'aponto' ),
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
	err_first_name_required: __( 'Please enter your first name.', 'aponto' ),
	err_last_name_required: __( 'Please enter your last name.', 'aponto' ),
	err_email_required: __( 'Please enter your email.', 'aponto' ),
	err_email_invalid: __( 'Please enter a valid email address.', 'aponto' ),
	err_phone_required: __( 'Please enter a phone number.', 'aponto' ),
	err_phone_invalid: __( 'That phone number doesn’t look right.', 'aponto' ),
	// The consent text is the operator's own (privacy, terms, both…), so the error names the
	// ACTION, not a document it may not mention (QA D17 / persona QA T-103, 2026-10-05).
	err_consent_required: __( 'Please tick the box to continue.', 'aponto' ),
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
	/* translators: label before the same appointment time in the business's own timezone. No business noun (salon, clinic, studio…) — see business_time_line. */
	summary_business_time: __( 'Local time at the business', 'aponto' ),
	// The sidebar before anything is picked (D-R49; v4 compact screen copy).
	summary_empty_title: __( 'Start with a service', 'aponto' ),
	// Foot of the summary (founder review 2026-09-30).
	contact_title: __( 'Questions?', 'aponto' ),
	/* translators: %s: the business phone number, rendered as a tap-to-call link. */
	contact_call: __( 'Call %s for help', 'aponto' ),
	summary_empty_text: __( 'Your appointment details and total will appear here.', 'aponto' ),
	/* translators: label before the name of the chosen staff member, e.g. "With: Ana". */
	summary_with: __( 'With', 'aponto' ),
	/* translators: label before the name of the booked location, e.g. "Where: Downtown". */
	summary_where: __( 'Where', 'aponto' ),
	/* translators: a labelled summary line. 1: the label, e.g. "With" or "Where"; 2: the value, e.g. a staff member's or a location's name. */
	summary_line: __( '%1$s: %2$s', 'aponto' ),
	// One-page intro panel (D-R80): spoken labels of its icon rows, and the narrow-form toggle
	// that reveals the service description.
	/* translators: label before the service duration, e.g. "Duration: 30 min". */
	summary_duration: __( 'Duration', 'aponto' ),
	/* translators: label before the service price, e.g. "Price: $40.00". */
	summary_price: __( 'Price', 'aponto' ),
	/* translators: spoken label before the chosen appointment time, e.g. "Your time: Mon, Oct 5". */
	summary_time: __( 'Your time', 'aponto' ),
	// Intro panel link back to the calendar from Details / Payment (D-R80).
	change_time: __( 'Change time', 'aponto' ),
	intro_more: __( 'Show details', 'aponto' ),
	// The one-page intro's team line (D-R85). %s is a localized "A, B or C" list.
	/* translators: %s: a list of first names joined with "or", e.g. "Maya, Daniel or Priya". */
	host_meet: __( 'You’ll meet %s', 'aponto' ),
	// The last item of that list when the team is larger than the names shown.
	host_another: __( 'another team member', 'aponto' ),
	/* translators: %d: how many more team members are not pictured. */
	host_more: __( '+%d', 'aponto' ),
	// The intro's meeting-method line (D-R82): spoken label, then the default line per type.
	/* translators: spoken label before how the appointment takes place, e.g. "Meeting method: Phone call". */
	meeting_label: __( 'Meeting method', 'aponto' ),
	meeting_in_person: __( 'In person', 'aponto' ),
	meeting_phone: __( 'Phone call', 'aponto' ),
	meeting_online: __( 'Online meeting', 'aponto' ),
	intro_less: __( 'Hide details', 'aponto' ),

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
	// D-R54: a 429 on a LOAD, not on a submit attempt — "Too many attempts" would be describing
	// something the visitor did not do. The body reuses `rate_limited_body` when the server sent
	// a `Retry-After`, and falls back to this when it did not.
	rate_limited_load_title: __( 'Too many requests.', 'aponto' ),
	rate_limited_wait: __( 'Please wait a moment and try again.', 'aponto' ),

	// Confirmation.
	confirm_pending_title: __( 'Booking received', 'aponto' ),
	confirm_pending_lead: __( 'We’ll email you the moment it’s confirmed.', 'aponto' ),
	confirm_confirmed_title: __( 'Appointment confirmed', 'aponto' ),
	confirm_manage_hint: __(
		'Check your email — we’ve sent a link to manage this booking.',
		'aponto'
	),
	order_label: __( 'ORDER', 'aponto' ),
	// The same badge on a booking with nothing to pay (persona QA 2026-10-05, T-100): a free
	// consultation is not an "order".
	booking_label: __( 'BOOKING', 'aponto' ),
	add_to_calendar: __( 'Add to calendar', 'aponto' ),
	cal_google: __( 'Google', 'aponto' ),
	cal_ics: __( '.ics', 'aponto' ),
	print: __( 'Print', 'aponto' ),
	book_another: __( 'Book another appointment', 'aponto' ),
	// A one-page block whose pinned service the catalogue no longer lists (QA D01, 2026-10-05):
	// never another service in its place.
	unavailable_title: __( 'This service is no longer available', 'aponto' ),
	unavailable_lead: __( 'It may have been paused or replaced.', 'aponto' ),
	/* translators: %s: the business phone number, rendered as a tap-to-call link. */
	unavailable_call: __( 'Call %s and we’ll help you book the right thing.', 'aponto' ),
	// Inline, persistent notice on Date & time after a slot was taken (QA D14).
	slot_taken_inline: __(
		'The time you chose was just taken. Pick another one below.',
		'aponto'
	),
	replay_title: __( 'Booking received', 'aponto' ),
	replay_lead: __( 'This appointment is already on file.', 'aponto' ),
	replay_body: __(
		'Your manage link was already emailed to you. Check your inbox to view or change this booking.',
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

/**
 * Presentation catalog for the schema-driven Settings tabs (SPEC-P1 §1.6).
 *
 * The PHP schema (SPEC-P0 §4.3) owns persistence, validation and the tab/panel
 * GROUPING (shipped to the app as `config.settingsSchema`). This file owns only
 * the PRESENTATION: which control renders a key, its human label/help, and the
 * enum option copy — the display strings that belong in JS with `@wordpress/i18n`,
 * not in the REST/persistence schema.
 *
 * The parent → child navigation tree and every routing decision derived from it
 * live in ./ia.js (mockup SPEC §7.9); a section names the schema PANELS it
 * renders, and this file supplies their presentation. Notifications is a
 * component section (the B3 template editor, wired in SettingsRoute), not
 * schema-driven. Appearance has NO section (Q11 2026-07-18 — form appearance
 * moved to the block inspector); its keys stay in the payload and round-trip
 * untouched.
 */
import { __ } from '@wordpress/i18n';
import { moduleAvailable } from '../modules/catalog.js';
import { config } from '../lib/config.js';
import { DATE_FORMAT_PRESETS, TIME_FORMAT_PRESETS } from './php-format.js';

/** Panel headings/descriptions keyed by the PHP schema `panel` slug. */
export const PANEL_META = {
	business: {
		label: __( 'Business', 'aponto' ),
		description: __( 'Shown on confirmations, emails and the calendar file.', 'aponto' ),
	},
	localization: {
		label: __( 'Localization', 'aponto' ),
		description: __( 'How dates, times and money are formatted.', 'aponto' ),
	},
	policy: {
		label: __( 'Booking policy', 'aponto' ),
		description: __( 'Availability rules applied to every service unless a service overrides them.', 'aponto' ),
	},
	// D-R52. Its own panel rather than five more rows under Booking policy: these answer
	// "how do we present our people, and how much of them do we publish", which is a different
	// question from lead times and cancellation windows. Every key in it is gated on
	// `multi_staff`, and `panelsForSection` drops a panel whose keys are all gated — so on Free
	// the heading does not exist at all.
	staff: {
		label: __( 'Staff', 'aponto' ),
		description: __( 'How your team appears on the booking form, and what customers can see about them.', 'aponto' ),
	},
	// D-R61. The same arrangement as `staff`: its own card under Booking → Policy, every key in
	// it gated on `multi_location`, so on Free (or with the module off) the heading never renders.
	// Singular, like the `Staff` heading beside it: the panel is about the location QUESTION,
	// not a list of places (D-R62 fix round 3, founder QA).
	location: {
		label: __( 'Location', 'aponto' ),
		description: __( 'Whether customers choose where their appointment takes place.', 'aponto' ),
	},
	payments: {
		label: __( 'Payments', 'aponto' ),
		// Says WHOSE rules these are, because the panel sits one click away from a gateway's own
		// settings and the two are easy to confuse: the gateway owns keys and receipts, this panel
		// owns what the site requires of a customer before a slot is theirs.
		description: __( 'When customers pay online, and what happens while they do. Applies to every payment method.', 'aponto' ),
	},
	collection: {
		label: __( 'Booking form', 'aponto' ),
		description: __( 'What you ask customers for when they book.', 'aponto' ),
	},
	consent: {
		label: __( 'Consent', 'aponto' ),
		description: __( 'Add a consent checkbox to the booking form.', 'aponto' ),
	},
	retention: {
		label: __( 'Data retention', 'aponto' ),
		description: __( 'Automatically anonymize personal data after a while.', 'aponto' ),
	},
	diagnostics: {
		label: __( 'Diagnostics', 'aponto' ),
		description: __( 'Troubleshooting switches for support.', 'aponto' ),
	},
	data: {
		label: __( 'Data & uninstall', 'aponto' ),
		description: __( 'What happens to your data when the plugin is removed.', 'aponto' ),
	},
};

/**
 * Schema keys that only MEAN something with a given module available (D-R50).
 *
 * Display-only gating, like every other UI gate here (§5 invariant 3): the value still
 * round-trips through the full-replacement PUT, so hiding the row loses nothing and a
 * downgrade/upgrade shows the same configuration back. Enforcement is server-side — the
 * `/public/services` roster gates re-check `Plan::has()` regardless of what is stored.
 *
 * Lives here (pure data) rather than in SettingsApp.jsx so the gating table is testable
 * without mounting the settings screen (D-R61).
 */
export const KEY_REQUIRES_MODULE = {
	'booking.staff_choice': 'multi_staff',
	// D-R52. All five join `staff_choice` in the `staff` panel, and because
	// `panelsForSection` filters gated keys BEFORE grouping, a build without the module
	// produces no panel at all rather than an empty card.
	'booking.staff_layout': 'multi_staff',
	'booking.staff_photos': 'multi_staff',
	'booking.staff_titles': 'multi_staff',
	'booking.staff_profiles': 'multi_staff',
	'booking.staff_label': 'multi_staff',
	// D-R61. The `location` panel's only key, so the same filter drops the whole card.
	'booking.location_choice': 'multi_location',
};

/**
 * The schema entries a settings section renders: those in the section's panels, minus any key
 * whose module is not available on this build (KEY_REQUIRES_MODULE — display-only). SettingsApp's
 * `panelsForSection` groups exactly this list, so a panel left with no key never becomes a card.
 *
 * @param {Array}  schema     UI schema rows (`{key, panel, …}`).
 * @param {Array}  panels     Panel ids the section asked for.
 * @param {Object} bootConfig Admin boot config (for `moduleAvailable`).
 * @return {Array} Visible entries, in schema order.
 */
export function visibleSchemaEntries( schema, panels, bootConfig ) {
	const allowed = Array.isArray( panels ) ? panels : [];
	return ( Array.isArray( schema ) ? schema : [] )
		.filter( ( entry ) => allowed.includes( entry.panel ) )
		.filter( ( entry ) => {
			const required = KEY_REQUIRES_MODULE[ entry.key ];
			return ! required || moduleAvailable( bootConfig, required );
		} );
}

const weekdayOptions = () => [
	{ value: '0', label: __( 'Sunday', 'aponto' ) },
	{ value: '1', label: __( 'Monday', 'aponto' ) },
	{ value: '2', label: __( 'Tuesday', 'aponto' ) },
	{ value: '3', label: __( 'Wednesday', 'aponto' ) },
	{ value: '4', label: __( 'Thursday', 'aponto' ) },
	{ value: '5', label: __( 'Friday', 'aponto' ) },
	{ value: '6', label: __( 'Saturday', 'aponto' ) },
];

// Unit switchers for the `duration` control (C5): the UI shows a value + unit, converts to the
// canonical stored unit and back. Lead time is stored in MINUTES; the booking window in DAYS —
// each `factor` is "canonical units per menu unit". The largest unit that divides the stored value
// evenly is shown by default, so 60 → "1 hour", 1440 → "1 day", 365 → "365 days". `inputStep`
// drives the number input's step: fractional (0.5) for the larger units so "1.5 hours" is a valid
// entry (review F item 7); the canonical value is always rounded to an integer.
const LEAD_UNITS = () => [
	{ value: 'minutes', label: __( 'minutes', 'aponto' ), factor: 1, inputStep: 1 },
	{ value: 'hours', label: __( 'hours', 'aponto' ), factor: 60, inputStep: 0.5 },
	{ value: 'days', label: __( 'days', 'aponto' ), factor: 1440, inputStep: 0.5 },
];
const HORIZON_UNITS = () => [
	{ value: 'days', label: __( 'days', 'aponto' ), factor: 1, inputStep: 1 },
	{ value: 'weeks', label: __( 'weeks', 'aponto' ), factor: 7, inputStep: 1 },
	{ value: 'months', label: __( 'months (30 days)', 'aponto' ), factor: 30, inputStep: 1 },
];

/**
 * Per-field presentation, keyed by settings dotted key.
 *   - `control` overrides the control derived from the PHP `type`
 *     (bool→boolean, int→number, string→text).
 *   - `options` supply select/radio choices (values are strings — the kit
 *     controls stringify, and the save step coerces back to the schema type).
 *   - `help` is the inline hint; `maxLength` caps text input.
 */
export const FIELD_META = {
	'business.name': {
		label: __( 'Business name', 'aponto' ),
		help: __( 'Shown on confirmations, emails and the calendar (.ics) file.', 'aponto' ),
	},
	'business.address': {
		label: __( 'Business address', 'aponto' ),
		control: 'textarea',
		help: __( 'Used as the location on confirmations, emails and the calendar file.', 'aponto' ),
	},
	'business.phone': {
		label: __( 'Business phone', 'aponto' ),
	},
	'business.email': {
		label: __( 'Booking alerts email', 'aponto' ),
		help: __( 'Where new-booking and cancellation alerts are sent. Leave blank to use the WordPress admin email.', 'aponto' ),
	},
	currency: {
		label: __( 'Currency', 'aponto' ),
		help: __( 'Used for service prices and order totals.', 'aponto' ),
		// Same neutral global menu as the wizard (fleet-r1 U2 FB6) — a select, not a free-typed
		// ISO code. A stored code outside the menu is merged in at render (SettingsApp).
		control: 'select',
		options: config.currencies.map( ( code ) => ( { value: code, label: code } ) ),
	},
	// Presets labelled with what they PRODUCE, plus "Custom…" for a hand-written PHP format
	// (persona QA 2026-10-05, T-080) — the `format` control in SettingsApp. The stored value is
	// still the PHP format string.
	date_format: {
		label: __( 'Date format', 'aponto' ),
		help: __( 'How dates are written in emails and on the booking pages.', 'aponto' ),
		control: 'format',
		presets: DATE_FORMAT_PRESETS,
	},
	time_format: {
		label: __( 'Time format', 'aponto' ),
		help: __( 'How times are written in emails and on the booking pages.', 'aponto' ),
		control: 'format',
		presets: TIME_FORMAT_PRESETS,
	},
	week_starts_on: {
		label: __( 'Week starts on', 'aponto' ),
		control: 'select',
		options: weekdayOptions(),
	},
	default_booking_status: {
		label: __( 'New bookings are', 'aponto' ),
		control: 'radio',
		options: [
			{ value: 'pending', label: __( 'Pending — you approve each one', 'aponto' ) },
			{ value: 'confirmed', label: __( 'Confirmed automatically', 'aponto' ) },
		],
	},
	min_lead_minutes: {
		label: __( 'Minimum lead time', 'aponto' ),
		help: __( 'How soon before an appointment a customer may book. 0 = no minimum.', 'aponto' ),
		control: 'duration',
		units: LEAD_UNITS(),
		// Canonical-unit bounds (review F item 7): 0 … 30 days of minutes.
		min: 0,
		max: 43200,
	},
	max_horizon_days: {
		label: __( 'Booking window', 'aponto' ),
		help: __( 'How far ahead customers can book.', 'aponto' ),
		control: 'duration',
		units: HORIZON_UNITS(),
		// Canonical-unit bounds (review F item 7): the server requires ≥ 1 day; cap at 2 years.
		min: 1,
		max: 730,
	},
	slot_step_default: {
		label: __( 'Time-slot interval (minutes)', 'aponto' ),
		help: __( 'Default gap between the start times you offer.', 'aponto' ),
		// A menu of the intervals a booking grid is actually built on (persona QA 2026-10-05,
		// S2-81): the bare number box took 7, and the form then offered 70 start times a day
		// (2:00, 2:07, 2:14…). Presentation only — the schema still accepts any positive whole
		// number, and a stored value outside the menu stays selectable (SettingsApp merges it in).
		control: 'select',
		options: [ 5, 10, 15, 20, 30, 45, 60, 90, 120 ].map( ( minutes ) => ( { value: String( minutes ), label: String( minutes ) } ) ),
	},
	min_cancel_hours: {
		label: __( 'Cancellation notice (hours)', 'aponto' ),
		help: __( 'How long before the appointment a customer may still cancel. 0 = any time up to the start.', 'aponto' ),
	},
	pending_auto_cancel_hours: {
		label: __( 'Auto-cancel unconfirmed after (hours)', 'aponto' ),
		help: __( 'Cancel still-pending bookings automatically. 0 = never.', 'aponto' ),
	},
	'booking.timezone_mode': {
		label: __( 'Booking times shown in', 'aponto' ),
		control: 'radio',
		options: [
			{
				value: 'visitor',
				label: __( 'The customer’s own timezone', 'aponto' ),
			},
			{
				value: 'business',
				label: __( 'Your business timezone', 'aponto' ),
			},
		],
		// Says what the visitor actually sees, and makes clear this is presentation only —
		// a customer somewhere else can always switch the form to their own timezone, and the
		// booking is stored in whichever one they chose (D-R48).
		help: __( 'Which clock the booking form shows by default. A customer in another timezone is told which one the times are in, and can always switch the form to their own — their booking is confirmed in the timezone they chose.', 'aponto' ),
	},
	// D-R50/D-R52. Only meaningful with the `multi_staff` module, so SettingsApp hides these
	// rows without it (display-only gating — the payload gates are server-side). Whichever way
	// the choice is set, a service with one eligible staff member never shows the step: there is
	// no choice to make, and asking anyway is the friction the single-service skip already
	// rejected.
	'booking.staff_choice': {
		label: __( 'Staff selection', 'aponto' ),
		control: 'radio',
		options: [
			{
				value: 'visitor',
				label: __( 'Customers choose a staff member (or any available)', 'aponto' ),
			},
			{
				value: 'required',
				label: __( 'Customers must choose a staff member', 'aponto' ),
			},
			{
				value: 'any',
				label: __( 'Always assign automatically', 'aponto' ),
			},
		],
		// States the assignment rule, because it is the half an owner cannot see from the form:
		// "Any available" is not random. Verified against `StaffGateway::list()`, whose default
		// order is `position ASC, id ASC` — the Staff screen's own order — and against
		// `ReservationService::reserveAnyStaff()`, which walks the same order.
		help: __(
			'Shown on the booking form only when a service has more than one staff member. When a customer picks “Any available”, or when you always assign automatically, the first free staff member in your Staff list order gets the booking.',
			'aponto'
		),
	},
	// D-R61. Only meaningful with `multi_location`, gated in KEY_REQUIRES_MODULE above. The help
	// states the rules an owner cannot see from the form: a lone branch is never asked about, and
	// "first" is the first in alphabetical order AND the only branch taking online bookings (fix
	// round 2, option A — an explicit other branch is refused on both public routes).
	'booking.location_choice': {
		label: __( 'Location selection', 'aponto' ),
		control: 'radio',
		options: [
			{
				value: 'visitor',
				label: __( 'Customers choose a location', 'aponto' ),
			},
			{
				value: 'first',
				label: __( 'Only take online bookings at the first location', 'aponto' ),
			},
		],
		help: __(
			'Customers are only asked when two or more active locations offer the service. “First” is the first active location, in alphabetical order, that offers the service; your other locations take no online bookings.',
			'aponto'
		),
	},
	'booking.staff_layout': {
		label: __( 'Staff layout', 'aponto' ),
		control: 'radio',
		options: [
			{ value: 'list', label: __( 'List', 'aponto' ) },
			{ value: 'cards', label: __( 'Cards', 'aponto' ) },
		],
		help: __( 'Cards fall back to the list automatically on narrow forms.', 'aponto' ),
	},
	'booking.staff_photos': {
		label: __( 'Show staff photos', 'aponto' ),
		// Says the privacy half out loud, because it is the reason this switch exists at all:
		// with photos on, a staff member without an uploaded picture falls back to Gravatar,
		// whose URL carries a hash of their email address (D-R51).
		help: __( 'Off removes photos from the booking form completely, including the Gravatar fallback.', 'aponto' ),
	},
	'booking.staff_titles': {
		label: __( 'Show job titles', 'aponto' ),
		help: __( 'Show each person’s job title under their name while the customer is choosing.', 'aponto' ),
	},
	'booking.staff_profiles': {
		label: __( 'Let customers view staff profiles', 'aponto' ),
		help: __( 'Adds a “Learn more” button that opens the staff member’s photo, title and bio.', 'aponto' ),
	},
	'booking.staff_label': {
		label: __( 'What customers call your staff', 'aponto' ),
		help: __( 'Singular, lower case — e.g. stylist, doctor, trainer, instructor. Used on the booking form: “Choose your stylist”.', 'aponto' ),
		// Left blank = the form's own neutral default, "staff member". The kit's text field
		// has no placeholder slot, so the example lives in the help line above.
		maxLength: 40,
	},
	'payments.mode': {
		label: __( 'Online payment', 'aponto' ),
		control: 'select',
		options: [
			{ value: 'off', label: __( 'Off — pay on-site only', 'aponto' ) },
			{ value: 'optional', label: __( 'Optional — customers choose', 'aponto' ) },
			{ value: 'required', label: __( 'Required — online payment needed to book', 'aponto' ) },
		],
		// The honest caveat, and it is the server's own rule (D-R38a(1)): `required` with no gateway
		// ready behaves like `off`, because refusing every booking when nobody has configured a
		// gateway takes the site's bookings down.
		help: __( 'Until a payment method is set up and switched on, this behaves as if payment were off. What happens to paid services while a required payment method is not ready is the next setting.', 'aponto' ),
	},
	// D-R79 (opt-in, default `accept` = the D-R38a(1) rule): the owner's answer for the one state
	// the mode cannot express — payment is required and nothing can take it.
	'payments.when_unavailable': {
		label: __( 'If online payment is required but no payment method is available', 'aponto' ),
		control: 'radio',
		options: [
			{ value: 'accept', label: __( 'Take the booking without payment', 'aponto' ) },
			{ value: 'refuse', label: __( 'Do not take bookings for paid services', 'aponto' ) },
		],
		help: __( 'Applies to the public booking form only. Free services stay bookable, and bookings you create yourself are never refused.', 'aponto' ),
	},
	'payments.hold_minutes': {
		label: __( 'Hold the slot for', 'aponto' ),
		help: __( 'How long a slot stays reserved while the customer pays. The slot is released automatically if the payment is not completed. 10 to 1440 minutes.', 'aponto' ),
		min: 10,
		max: 1440,
	},
	'payments.auto_confirm': {
		label: __( 'Confirm automatically when paid', 'aponto' ),
		help: __( 'Confirm the booking as soon as the payment succeeds, instead of leaving it pending for you to approve.', 'aponto' ),
	},
	'booking.auto_confirm_free': {
		label: __( 'Auto-confirm free bookings', 'aponto' ),
		help: __( 'When a service is free (price 0), confirm it immediately instead of leaving it pending. Priced services still follow “New bookings are” above.', 'aponto' ),
	},
	'customer_fields.phone': {
		label: __( 'Phone number field', 'aponto' ),
		control: 'radio',
		options: [
			{ value: 'off', label: __( 'Don’t ask for a phone number', 'aponto' ) },
			{ value: 'optional', label: __( 'Optional', 'aponto' ) },
			{ value: 'required', label: __( 'Required', 'aponto' ) },
		],
	},
	'consent_checkbox.enabled': {
		label: __( 'Show a consent checkbox', 'aponto' ),
		help: __( 'Ask customers to agree before they can book.', 'aponto' ),
	},
	'consent_checkbox.text': {
		label: __( 'Consent text', 'aponto' ),
		control: 'textarea',
		help: __( 'The wording shown next to the checkbox.', 'aponto' ),
	},
	data_retention_months: {
		label: __( 'Anonymize personal data after (months)', 'aponto' ),
		help: __( '0 = keep indefinitely. Runs on a daily schedule.', 'aponto' ),
	},
	debug_log: {
		label: __( 'Enable debug logging', 'aponto' ),
		help: __( 'Records diagnostic events for support. Turns itself off after 72 hours.', 'aponto' ),
	},
	trusted_proxy: {
		label: __( 'Behind a trusted proxy', 'aponto' ),
		help: __( 'Read the visitor IP from X-Forwarded-For. Only enable if a reverse proxy sets it.', 'aponto' ),
	},
	delete_data_on_uninstall: {
		label: __( 'Delete all data on uninstall', 'aponto' ),
		help: __( 'When the plugin is deleted, permanently remove every Aponto table, option and setting. Off by default.', 'aponto' ),
	},
};

/** Map a PHP schema value `type` to the default kit control key. */
export function controlForType( type ) {
	switch ( type ) {
		case 'bool':
			return 'boolean';
		case 'int':
			return 'number';
		default:
			return 'text';
	}
}

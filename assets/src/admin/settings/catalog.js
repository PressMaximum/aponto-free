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
import { config } from '../lib/config.js';

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
	date_format: {
		label: __( 'Date format', 'aponto' ),
		help: __( 'PHP date format, e.g. F j, Y.', 'aponto' ),
	},
	time_format: {
		label: __( 'Time format', 'aponto' ),
		help: __( 'PHP time format, e.g. g:i a.', 'aponto' ),
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
	},
	min_cancel_hours: {
		label: __( 'Cancellation notice (hours)', 'aponto' ),
		help: __( 'How long before the appointment a customer may still cancel. 0 = any time up to the start.', 'aponto' ),
	},
	pending_auto_cancel_hours: {
		label: __( 'Auto-cancel unconfirmed after (hours)', 'aponto' ),
		help: __( 'Cancel still-pending bookings automatically. 0 = never.', 'aponto' ),
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
		help: __( 'Until a payment method is set up and switched on, this behaves as if payment were off — bookings are never refused because no gateway is ready.', 'aponto' ),
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

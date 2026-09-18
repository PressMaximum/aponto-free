/**
 * Presentation catalog + upsell data for the Modules surface (SPEC-P1 §6).
 *
 * The registry (SPEC-P0 §3.2, shipped as `config.modules`) owns the entitlement
 * metadata — category, kind, edition, phase — plus the additive presentation flags
 * `status` (D-R22), `available` (D-R27) and `enabled`/`toggleable` (D-R31). This file
 * owns the display copy (label, one-line description, icon), the card-state mapping and
 * the free-vs-premium comparison matrix.
 *
 * Cards + comparison + per-placement UTM links on the Premium cards only; no license
 * field and no fake controls (§6 + Guideline 5/11). The surface stopped being read-only
 * with D-R31: a shipped, toggleable module carries a REAL enable/disable switch, which is
 * the ONE control here and is backed by `PUT /modules/{code}`. Roadmap `phase` stays
 * code/registry-side only — never rendered on production cards
 * (plugin-dashboard-divergence.md §2.7), except the premium-build roadmap label below.
 *
 * COPY STATUS (C1 review fix 3): every user-facing string in this file — module
 * labels/descriptions, comparison rows, upsell wording — is DRAFT copy pending
 * founder approval before GA, and must stay honest: modules ship across the
 * premium roadmap, so no "unlock now" phrasing for not-yet-shipped modules.
 * The UTM base URL below also needs founder confirmation.
 */
import { __, _n, sprintf } from '@wordpress/i18n';

import { INDUSTRY_ALL } from './filters.js';

/** Category tabs, in order (SPEC-P1 §6). `all` is the default landing view. */
export const CATEGORY_TABS = [
	{ id: 'all', label: __( 'All', 'aponto' ) },
	{ id: 'booking', label: __( 'Booking', 'aponto' ) },
	{ id: 'payments', label: __( 'Payments', 'aponto' ) },
	{ id: 'connections', label: __( 'Connections', 'aponto' ) },
	{ id: 'site_tools', label: __( 'Site & Tools', 'aponto' ) },
];

/**
 * Industry filter options, in display order (D-R21, founder-approved 2026-07-25).
 * The ids are the registry `industries` vocabulary; `all` is the sentinel that
 * both the select's default option and a universal module carry.
 */
export const INDUSTRY_OPTIONS = [
	{ id: INDUSTRY_ALL, label: __( 'All businesses', 'aponto' ) },
	{ id: 'beauty', label: __( 'Beauty & wellness', 'aponto' ) },
	{ id: 'coaching', label: __( 'Coaching & consulting', 'aponto' ) },
	{ id: 'fitness', label: __( 'Fitness & classes', 'aponto' ) },
	{ id: 'healthcare', label: __( 'Healthcare', 'aponto' ) },
	{ id: 'events', label: __( 'Events & experiences', 'aponto' ) },
	{ id: 'venues', label: __( 'Venues & rentals', 'aponto' ) },
	{ id: 'agencies', label: __( 'Agencies & web', 'aponto' ) },
	{ id: 'field_services', label: __( 'Field services', 'aponto' ) },
];

/** Industry id → display label, for the select and the search haystack. */
export const INDUSTRY_LABELS = Object.fromEntries(
	INDUSTRY_OPTIONS.map( ( option ) => [ option.id, option.label ] )
);

/** Category display label + fallback icon, keyed by the registry `category`. */
export const CATEGORY_META = {
	booking: { label: __( 'Booking', 'aponto' ), icon: 'calendar' },
	payments: { label: __( 'Payments', 'aponto' ), icon: 'card' },
	connections: { label: __( 'Connections', 'aponto' ), icon: 'plug' },
	site_tools: { label: __( 'Site & Tools', 'aponto' ), icon: 'wrench' },
};

/** Per-module display copy + icon, keyed by registry code. */
export const MODULE_META = {
	multi_staff: { label: __( 'Multiple staff', 'aponto' ), description: __( 'Let several team members take bookings on their own schedules.', 'aponto' ), icon: 'users' },
	calendar_google: { label: __( 'Google Calendar', 'aponto' ), description: __( 'Two-way sync so bookings land on staff Google calendars.', 'aponto' ), icon: 'calendar' },
	// A5 / D-R22: Free already ships one fixed 24h email reminder (SPEC-P1 §3.2 addendum
	// 2026-07-20), so this Premium module means *advanced* reminders — custom offsets,
	// multi-step sequences, follow-ups. SMS delivery is the separate `sms` module; this copy
	// must claim neither the basic reminder nor SMS.
	reminders: { label: __( 'Reminders', 'aponto' ), description: __( 'Custom reminder schedules and follow-ups, on top of the built-in 24-hour email.', 'aponto' ), icon: 'bell' },
	calendar_outlook: { label: __( 'Outlook Calendar', 'aponto' ), description: __( 'Two-way sync with Outlook and Microsoft 365 calendars.', 'aponto' ), icon: 'calendar' },
	video_links: { label: __( 'Video meeting links', 'aponto' ), description: __( 'Auto-create Zoom or Google Meet links for online bookings.', 'aponto' ), icon: 'video' },
	custom_fields: { label: __( 'Custom fields', 'aponto' ), description: __( 'Collect extra details on the booking form.', 'aponto' ), icon: 'sliders' },
	csv_import: { label: __( 'CSV import', 'aponto' ), description: __( 'Bulk-import customers and bookings from a spreadsheet.', 'aponto' ), icon: 'import' },
	// `deposits` is a separate Premium module (D-R22) — Stripe copy must not promise it. The
	// sentence names the two facts that decide whether an owner clicks: the customer never leaves
	// the booking form (D-R38c, inline — not a hosted redirect), and the money lands in the owner's
	// OWN Stripe account. "Free" is stated because this is the one payment card in the catalog that
	// is not an upsell.
	payments_stripe: { label: __( 'Stripe payments', 'aponto' ), description: __( 'Take card payments inside the booking form with your own Stripe account. Free.', 'aponto' ), icon: 'card' },
	// Same rule as Stripe above: `deposits` is a separate Premium module, so this copy must not
	// promise it. Cards are Stripe's — PayPal's card funding is switched off in the widget when
	// Stripe is present — so the promise here is the PayPal account itself (D-R40).
	payments_paypal: { label: __( 'PayPal payments', 'aponto' ), description: __( 'Let customers pay with their PayPal account at checkout.', 'aponto' ), icon: 'card' },
	deposits: { label: __( 'Deposits', 'aponto' ), description: __( 'Require a partial payment to confirm a booking.', 'aponto' ), icon: 'coins' },
	coupons: { label: __( 'Coupons', 'aponto' ), description: __( 'Offer discount codes at checkout.', 'aponto' ), icon: 'tag' },
	group_capacity: { label: __( 'Group bookings', 'aponto' ), description: __( 'Allow several attendees in a single time slot.', 'aponto' ), icon: 'people' },
	resources: { label: __( 'Shared assets', 'aponto' ), description: __( 'Book rooms and equipment alongside services.', 'aponto' ), icon: 'cube' },
	recurring: { label: __( 'Recurring bookings', 'aponto' ), description: __( 'Let customers book repeating appointments.', 'aponto' ), icon: 'arrows' },
	multi_location: { label: __( 'Multiple locations', 'aponto' ), description: __( 'Run bookings across several business locations.', 'aponto' ), icon: 'pin' },
	waitlist: { label: __( 'Waitlist', 'aponto' ), description: __( 'Let customers join a waitlist when slots are full.', 'aponto' ), icon: 'hourglass' },
	sms: { label: __( 'SMS notifications', 'aponto' ), description: __( 'Send confirmations and reminders by text message.', 'aponto' ), icon: 'chat' },
	webhooks: { label: __( 'Webhooks', 'aponto' ), description: __( 'Send booking events to external services in real time.', 'aponto' ), icon: 'plug' },
	woo_gateway: { label: __( 'WooCommerce', 'aponto' ), description: __( 'Use WooCommerce as the checkout and payment gateway.', 'aponto' ), icon: 'box' },
	service_catalog: { label: __( 'Service catalog', 'aponto' ), description: __( 'Public service pages with descriptions and galleries.', 'aponto' ), icon: 'browser' },
	roles: { label: __( 'Team roles', 'aponto' ), description: __( 'Fine-grained permissions for staff and managers.', 'aponto' ), icon: 'shield' },
	white_label: { label: __( 'White label', 'aponto' ), description: __( 'Replace Aponto branding with your own.', 'aponto' ), icon: 'palette' },

	// Free core capability cards (D-R22, 2026-07-27) — P1 capabilities that already ship as
	// core code. Display entries only; they carry no gate (see the Plan registry docblock).
	booking_form: { label: __( 'Booking form', 'aponto' ), description: __( 'Gutenberg block and shortcode with styling controls — identical in Free and Premium.', 'aponto' ), icon: 'browser' },
	availability_engine: { label: __( 'Availability engine', 'aponto' ), description: __( 'Weekly hours, date overrides, buffers, lead time and timezone-correct slots.', 'aponto' ), icon: 'clock' },
	// The due rule is SPEC-P1 §3.2: confirmed bookings only, and only those still at least
	// 24h away when the reminder is scheduled — the copy must not promise "every booking".
	booking_reminder: { label: __( '24-hour reminder', 'aponto' ), description: __( 'One automatic email reminder about 24 hours before confirmed bookings.', 'aponto' ), icon: 'bell' },
	email_notifications: { label: __( 'Email notifications', 'aponto' ), description: __( 'Event-triggered emails with editable templates and placeholders.', 'aponto' ), icon: 'mail' },
	ics_export: { label: __( 'Calendar links', 'aponto' ), description: __( 'ICS downloads and add-to-Google links on every confirmation.', 'aponto' ), icon: 'calendar' },
	csv_export: { label: __( 'CSV export', 'aponto' ), description: __( 'Export bookings for spreadsheets and reporting.', 'aponto' ), icon: 'csv' },
};

/**
 * Searchable display strings for one module — the `resolveText` seam of
 * `filters.js` (D-R21). Mirrors the mockup haystack: title, description,
 * category label and every industry label.
 *
 * @param {{code?: string, category?: string, industries?: string[]}} mod Module record.
 * @return {string[]} Searchable strings.
 */
export function moduleSearchText( mod ) {
	const meta = MODULE_META[ mod?.code ] || {};
	const category = CATEGORY_META[ mod?.category ] || {};
	const industries = Array.isArray( mod?.industries ) ? mod.industries : [];

	return [
		meta.label,
		meta.description,
		category.label,
		...industries.map( ( id ) => INDUSTRY_LABELS[ id ] ),
	].filter( Boolean );
}

/** Human label for the module `kind`: integrations vs first-party modules. */
export function kindLabel( kind ) {
	return kind === 'integration' ? __( 'Integration', 'aponto' ) : __( 'Module', 'aponto' );
}

/**
 * The integration 4-state, condensed into the card's meta line (extension-surface §4, D-R35).
 *
 * The catalog has to answer "what is the NEXT thing to do", and for an integration that is a
 * sequence: paste credentials → connect a staff member → it is serving services. A card that showed
 * only "Integration" made every step of that look identical, so an operator who had saved
 * credentials but connected nobody had no way to tell that from working.
 *
 * `configured` and `connected` stay SEPARATE phrases here for the same reason the server keeps them
 * separate fields (extension-surface §4): "add your credentials" and "now connect someone" are two
 * different instructions, and collapsing them produces one unexplained failure instead of two
 * actionable states.
 *
 * Returns '' for anything that is not an available integration — a locked or unshipped card has
 * nothing true to say about connections, and the boot fields are zeroed for it anyway.
 *
 * NOT FOR PAYMENT MODULES. A gateway is registered `kind: 'integration'` too, but it holds no
 * per-staff connections, so every phrase below would be a lie about it — see `paymentStateLabel()`,
 * and call `moduleStateLabel()` rather than either of them directly.
 *
 * @param {Object} mod Module boot record.
 * @return {string} A meta suffix, or '' when there is nothing to add.
 */
export function integrationStateLabel( mod ) {
	if ( 'integration' !== mod?.kind || true !== mod?.available ) {
		return '';
	}
	if ( ! mod.configured ) {
		return __( 'Setup needed', 'aponto' );
	}

	const connected = Number( mod.connected_count ) || 0;
	if ( connected < 1 ) {
		return __( 'Configured · no staff connected', 'aponto' );
	}

	const used = Number( mod.used_count ) || 0;
	const staff = sprintf(
		/* translators: %d: number of staff members connected to an integration. */
		_n( '%d staff connected', '%d staff connected', connected, 'aponto' ),
		connected
	);

	if ( used < 1 ) {
		return staff;
	}

	return (
		staff +
		' · ' +
		sprintf(
			/* translators: %d: number of services an integration acts for. */
			_n( '%d service', '%d services', used, 'aponto' ),
			used
		)
	);
}

/**
 * The card meta suffix for a PAYMENT module (D-R39).
 *
 * A gateway is registered as `kind: 'integration'` — it is somebody else's service reached over
 * HTTP — but it has NO per-staff connections, so the connection phrases above are nonsense for it:
 * "0 staff connected" on a working Stripe account describes a state that cannot exist. The two
 * facts that actually matter are whether the credentials are in place (`configured`) and which
 * Stripe account they point at, and the second one is the reason this exists at all: a site owner
 * who leaves test keys in place sees bookings arrive and no money, and the catalog is the first
 * place that can tell them.
 *
 * `payment_mode` is DERIVED server-side from the key prefix and never stored (D-R39), and it is an
 * ADDITIVE boot field: boot data older than this bundle simply has no such key, which reads as ''
 * and degrades to a bare "Ready" rather than claiming a mode nobody confirmed.
 *
 * `ready` is the second additive field, and it OVERRIDES `configured` (Codex r1 #14). Credentials
 * being present is not the same fact as the gateway being offered: a site whose currency PayPal
 * does not accept, or whose saved webhook id belongs to the other environment, has every field
 * filled in and takes no payments at all. The server computes the whole predicate — the card only
 * reports it — and `null`/absent means "the server did not say", which falls back to the older
 * ladder rather than to a guess in either direction.
 *
 * @param {Object} mod Module boot record.
 * @return {string} A meta suffix, or '' when there is nothing to add.
 */
export function paymentStateLabel( mod ) {
	if ( true !== mod?.available ) {
		return '';
	}
	if ( ! mod.configured || false === mod.ready ) {
		return __( 'Setup needed', 'aponto' );
	}

	const mode = typeof mod.payment_mode === 'string' ? mod.payment_mode : '';
	if ( 'test' === mode ) {
		return __( 'Ready · Test mode', 'aponto' );
	}
	if ( 'live' === mode ) {
		return __( 'Ready · Live', 'aponto' );
	}

	return __( 'Ready', 'aponto' );
}

/**
 * The card's next-step phrase, whichever kind of module it is.
 *
 * ONE entry point for the meta line so the cards cannot disagree about what a state means, and so
 * the payments branch cannot be reached by accident: it keys on the registry `category`, which is
 * the field that says what a module is FOR, rather than on `kind`, which every remote service
 * shares.
 *
 * @param {Object} mod Module boot record.
 * @return {string} A meta suffix, or '' when there is nothing to add.
 */
export function moduleStateLabel( mod ) {
	return 'payments' === mod?.category ? paymentStateLabel( mod ) : integrationStateLabel( mod );
}

/**
 * The boot-data record for a module code, or null when the catalog has no such entry.
 * ONE lookup for every surface that resolves a code arriving from outside the catalog
 * grid — a hash segment, a card action — so they cannot disagree about what a code means.
 *
 * @param {{modules?: Array}} bootConfig Admin boot config (`lib/config.js`).
 * @param {string}            code       Registry module code.
 * @return {Object|null} Module record.
 */
export function findModuleRecord( bootConfig, code ) {
	const modules = Array.isArray( bootConfig?.modules ) ? bootConfig.modules : [];

	return modules.find( ( mod ) => mod?.code === code ) || null;
}

/**
 * Whether a module code is usable on THIS site, read off the boot-data `available`
 * flag the server computed with `Plan::has()` (D-R27). Exported so any route can gate
 * display on the same single truth instead of re-deriving one from `edition`/`status`.
 *
 * Unknown codes and boot data older than this bundle both answer `false` — never
 * claim a capability that cannot be confirmed.
 *
 * @param {{modules?: Array}} bootConfig Admin boot config (`lib/config.js`).
 * @param {string}            code       Registry module code.
 * @return {boolean} Whether the module is available.
 */
export function moduleAvailable( bootConfig, code ) {
	return findModuleRecord( bootConfig, code )?.available === true;
}

/**
 * Whether this build may switch a module on or off (D-R31).
 *
 * The CLIENT MIRROR of the REST predicate in `ModulesController::isToggleable()`, and it is
 * mirrored for the same reason every UI gate is: to decide what to draw. It decides nothing —
 * the route re-checks all of it, so a card that renders a switch it should not have still cannot
 * write (§5 invariant 3).
 *
 * Deliberately NOT `available`: a module the owner just switched OFF is unavailable, and gating
 * the switch on availability would make disabling a one-way door in the UI exactly as it would in
 * the API. The terms are the ones that survive being turned off — the registry's own
 * `toggleable`, whether the code shipped in this build (`status`), and whether the edition allows
 * it at all.
 *
 * @param {{edition?: string, toggleable?: boolean, status?: string}} mod         Module record from boot data.
 * @param {string}                                                    planEdition Site plan edition.
 * @return {boolean} Whether to render a switch.
 */
export function moduleToggleAllowed( mod, planEdition = 'free' ) {
	if ( mod?.toggleable !== true || mod?.status !== 'included' ) {
		return false;
	}

	return mod?.edition !== 'premium' || planEdition === 'premium';
}

/**
 * Whether switching a module ON has to be followed by a page reload (Codex A2, 2026-09-04).
 *
 * TRUE for an `integration` module being ENABLED, and for nothing else.
 *
 * The reason is server-side and deliberate (rest-contract §2.12b): the boot projection computes
 * `configured`, `connected_count`, `used_count` — and, for a gateway, `payment_mode` — only for
 * `IntegrationRegistry::activeCodes()`, i.e. the modules that were switched ON when the page was
 * built. A module enabled mid-session therefore has no such fields anywhere in this document, and
 * `PUT /modules/{code}` answers `{code, enabled}` rather than a fresh projection. The session store
 * can flip `enabled`/`available` honestly, but it cannot invent state nobody computed — so the card
 * would sit at "Setup needed" and a payments card would report no mode, both of which are lies
 * about a module that may be fully configured.
 *
 * DISABLING never needs one: `applyModuleEnabled()` already makes every surface treat the module as
 * gone, and the stale projection it leaves behind is hidden rather than shown.
 *
 * A capability or engine_flag module keeps today's behaviour — it has no projection to be missing,
 * so reloading would cost the operator their scroll position and their filters for nothing.
 *
 * @param {{kind?: string}} mod  Module boot record.
 * @param {boolean}         next Requested switch position.
 * @return {boolean} Whether to reload after the server confirms.
 */
export function enablingNeedsReload( mod, next ) {
	return true === next && 'integration' === mod?.kind;
}

/**
 * Card presentation for one module — the honest states of the catalog
 * (D-R22, founder-approved 2026-07-27; keyed on `available` since D-R27;
 * premium-build treatment founder-approved 2026-08-28).
 *
 *   available          → kit `enabled` chrome, the module's own tier badge, a static
 *                        "Included" label and — since D-R31 — a real ON switch where the
 *                        registry says the module is toggleable. NO upgrade link: the site
 *                        already owns this.
 *   available: false,  → kit `disabled` chrome: the Included shape, muted, switch OFF. NO
 *   but toggleable       "Coming soon" and NO upsell — the owner turned this off and can turn
 *                        it back on. Distinguishing it from "planned" is the whole point of
 *                        the state (D-R31): both are `available: false`, but telling someone
 *                        their own choice is a roadmap item is nonsense.
 *   free + planned     → kit `planned` chrome, green Free badge, "Coming soon".
 *                        NO upgrade link: the module WILL be free, so pointing at
 *                        the pricing page would be dishonest.
 *   premium, unshipped → depends on WHO IS LOOKING:
 *                        · FREE build    — unchanged locked card: `planned` chrome, amber
 *                          Premium badge, no status label, per-placement UTM compare link.
 *                        · PREMIUM build — neutral roadmap card: `planned` chrome, a
 *                          NEUTRAL (unamber) Premium label, "Coming soon · {phase}", and
 *                          NO upgrade link at all.
 *
 * WHY THE BUILD MATTERS HERE (founder, 2026-08-28): a paying customer must never be shown
 * plan-marketing chrome. Selling Premium to someone who already bought it is not an upsell,
 * it is noise — and the honest answer to "when do I get this" is the roadmap, not a pricing
 * page. Note this is CHROME SELECTION, not gating: `planEdition` decides how an unavailable
 * module is PRESENTED, while whether it is available at all stays `available`
 * (`Plan::has()`), and REST enforces the real thing. Do not "fix" this into a gate.
 *
 * WHY `available` AND NOT `status` (D-R27): `status` is `Plan::isShipped()`, and that
 * constant is EDITION-BLIND. The moment a premium module ships, a Free build would also
 * report `status: 'included'` for it — and keying the card on that would drop the lock
 * and the upsell for a capability the Free site does not own. `available` is
 * `Plan::has()` for the running build: edition × shipped-ness × the module toggle.
 *
 * A module older than this bundle (boot data with no `available`) reads as unavailable,
 * which is the conservative answer — it never claims a capability is present. An unknown
 * `planEdition` reads as `free`, which keeps the upsell rather than hiding it.
 *
 * @param {{edition?: string, available?: boolean, phase?: string}} mod         Module record from boot data.
 * @param {string}                                                 planEdition Site plan edition (`free`|`premium`).
 * @return {{state: string, tier: ?Object, toggle: boolean, statusLabel: ?string, plannedLabel: ?string, upgrade: boolean}} Card descriptor.
 */
export function moduleCardState( mod, planEdition = 'free' ) {
	const premium = mod?.edition === 'premium';
	const onPremiumBuild = planEdition === 'premium';
	const tier = premium
		? { label: __( 'Premium', 'aponto' ), isPremium: true }
		: { label: __( 'Free', 'aponto' ), variant: 'free' };
	const toggle = moduleToggleAllowed( mod, planEdition );

	if ( mod?.available === true ) {
		return {
			state: 'enabled',
			tier,
			toggle,
			statusLabel: __( 'Included', 'aponto' ),
			plannedLabel: null,
			upgrade: false,
		};
	}

	// SWITCHED OFF — not "not built yet". Both are `available: false`, and without this branch a
	// disabled module falls into the planned/upsell copy below and tells the owner their own
	// choice is a roadmap item (D-R31). The card keeps the Included shape so flipping the switch
	// back is obviously the way out; the kit mutes it via the `disabled` state.
	if ( toggle ) {
		return {
			state: 'disabled',
			tier,
			toggle: true,
			statusLabel: null,
			plannedLabel: null,
			upgrade: false,
		};
	}

	if ( premium && onPremiumBuild ) {
		return {
			state: 'planned',
			// Deliberately NOT `isPremium`: that flag is what paints the amber "locked/paid"
			// chrome (kit `tierVariantClass`). The label still names the plan the module
			// belongs to — a catalog fact — but on neutral chrome, because nothing here is
			// locked to this viewer.
			tier: { label: __( 'Premium', 'aponto' ) },
			toggle: false,
			statusLabel: null,
			plannedLabel: comingSoonLabel( mod?.phase ),
			upgrade: false,
		};
	}

	return {
		state: 'planned',
		tier,
		toggle: false,
		statusLabel: null,
		// A locked Premium card carries the compare link instead of a "Coming soon"
		// label — its answer to "when" is the pricing page, not a status word.
		plannedLabel: premium ? null : __( 'Coming soon', 'aponto' ),
		upgrade: premium,
	};
}

/**
 * "Coming soon", with the registry's roadmap phase appended when there is one.
 *
 * PHASE ON A CARD IS A DELIBERATE REVERSAL, scoped to premium builds (founder,
 * 2026-08-28). Production cards previously carried NO phase label at all
 * (plugin-dashboard-divergence.md §2.7 — the registry kept `phase` for docs and upsell
 * planning only), and that still holds for the Free build: a prospect is shown what a
 * plan includes, never a delivery schedule. A paying customer is in a different position
 * — they have already bought the roadmap, so "P2b" is the most honest answer available to
 * "when". It is a bare phase CODE on purpose: it commits to an ordering, not to a date.
 *
 * @param {string} phase Registry roadmap phase (e.g. `P2b`), or empty.
 * @return {string} Card label.
 */
function comingSoonLabel( phase ) {
	const code = typeof phase === 'string' ? phase.trim() : '';
	if ( '' === code ) {
		return __( 'Coming soon', 'aponto' );
	}

	return sprintf(
		/* translators: %s: roadmap phase code, e.g. "P2b". */
		__( 'Coming soon · %s', 'aponto' ),
		code
	);
}

// Roadmap phase (P2a/P3/…) is NOT surfaced on FREE-build cards — production copy shown to a
// prospect carries no phase labels (divergence audit §2.7); the registry keeps it for docs and
// upsell planning. The single exception, founder-approved 2026-08-28, is an unshipped premium
// module on a PREMIUM build, where the phase replaces the upsell link as the honest answer to
// "when" (see `comingSoonLabel()` above).

/**
 * Free/Included card → the admin surface that ALREADY manages that capability
 * (D-R22 addendum, founder-approved 2026-07-27). An entry renders an internal
 * "Open" link on the card; it is navigation, never an upsell, so it carries no
 * UTM and never leaves the app.
 *
 * THE RULE: a code appears here ONLY when a real, shipped surface exists today.
 * A capability with no destination gets NO link — never a placeholder, never a
 * "coming soon" target, never a link to a page that does not manage it. Half a
 * destination is worse than none: a link that lands the owner somewhere
 * unrelated is exactly the fake affordance §6 / Guideline 5 forbids.
 *
 * Values are canonical hashes as the router spells them (lib/router.js +
 * settings/ia.js). Settings deep links use the full `settings/<parent>/<child>`
 * form, not a legacy alias — `#settings` and `#settings/booking` both resolve,
 * but SettingsRoute silently rewrites them, so linking the alias would make the
 * address bar change under the user.
 *
 *   booking_reminder      → Notifications. The reminder's real on/off switch is
 *   email_notifications      the `booking_reminder_customer` template's enabled
 *                            flag, and every other event email lives on the same
 *                            leaf (settings/ia.js: Notifications is ONE surface).
 *   csv_export            → Bookings, which owns the export action + its filters
 *                            (routes/Bookings.jsx `onExport`).
 *   availability_engine   → Settings → Booking → Policy, the panel described as
 *                            "Availability rules applied to every service"
 *                            (settings/catalog.js PANEL_META.policy): lead time,
 *                            booking window and buffers.
 *   multi_staff           → Staff, which owns staff records, their work hours and
 *                            their time off (D-R28, 2026-08-27). Per-service
 *                            eligibility is edited in the service editor, but Staff
 *                            is where the capability itself is managed. It is also
 *                            the first PREMIUM entry here — the map is keyed on
 *                            "a real surface already manages this", not on edition.
 *
 * DELIBERATELY ABSENT — both would need a placeholder to be listed:
 *   booking_form  — its configuration is the block Inspector (Q11 2026-07-18
 *                   moved form appearance there), which is a post-editor
 *                   surface, not an admin route this hash router can reach.
 *   ics_export    — ICS download / add-to-calendar links are emitted on
 *                   confirmations and emails; there is no admin screen for them.
 */
export const INCLUDED_CARD_ROUTES = {
	booking_reminder: '#settings/notifications',
	email_notifications: '#settings/notifications',
	csv_export: '#bookings',
	availability_engine: '#settings/booking/policy',
	multi_staff: '#staff',
};

/**
 * The in-app destination for an Included card, or '' when it has none.
 *
 * Only an AVAILABLE module gets one (D-R27): a planned capability has nothing to open,
 * and a module the site does not own must keep the compare link as its single action
 * (§6). `available` — not `status` — is the test, for the same reason `moduleCardState`
 * uses it: `status` is edition-blind and would hand a Free build an "Open" link into a
 * premium module's settings.
 *
 * Two destinations, in priority order:
 *   1. `INCLUDED_CARD_ROUTES[code]` — the hand-mapped surface that ALREADY manages the
 *      capability (the D-R22 addendum map above). A capability whose management lives on
 *      an existing screen must land there, not on a generic panel page.
 *   2. `#modules/{code}` — the module's own settings route, for any available module that
 *      declares `has_settings`. That is where its registered panel renders.
 * Anything else gets NO link, which is still the rule: half a destination is worse
 * than none.
 *
 * @param {{code?: string, has_settings?: boolean, available?: boolean}} mod Module record from boot data.
 * @return {string} Canonical hash (e.g. `#bookings`), or '' for no link.
 */
export function moduleOpenHref( mod ) {
	if ( mod?.available !== true ) {
		return '';
	}
	const mapped = INCLUDED_CARD_ROUTES[ mod.code ];
	if ( mapped ) {
		return mapped;
	}

	return mod?.has_settings === true ? `#modules/${ mod.code }` : '';
}

const UPGRADE_BASE = 'https://pressmaximum.com/aponto/pricing/';

/**
 * Per-placement upgrade link with UTM tracking (§6). `placement` is the
 * `utm_content`: `modules-{code}` for a card, `menu` for the page-level CTA.
 */
export function upgradeUrl( placement ) {
	const params = new URLSearchParams( {
		utm_source: 'aponto',
		utm_medium: 'plugin',
		utm_campaign: 'upsell',
		utm_content: placement,
	} );
	return `${ UPGRADE_BASE }?${ params.toString() }`;
}

/** Free-vs-premium comparison matrix for the CompareTable at the page foot (§6). */
export const COMPARE_SECTIONS = [
	{
		id: 'bookings',
		label: __( 'Bookings', 'aponto' ),
		rows: [
			{ id: 'unlimited', label: __( 'Unlimited bookings', 'aponto' ), free: true, pro: true },
			{ id: 'staff', label: __( 'Staff members', 'aponto' ), free: __( '1', 'aponto' ), pro: __( 'Unlimited', 'aponto' ) },
			{ id: 'services', label: __( 'Services & categories', 'aponto' ), free: true, pro: true },
			// D-R43: Free books one business address (General -> Business, `location_id = 0`); named
			// locations are the Premium `multi_location` module, whose registry `category` is `booking`.
			{ id: 'locations', label: __( 'Multiple locations', 'aponto' ), free: false, pro: true },
			{ id: 'group', label: __( 'Group bookings', 'aponto' ), free: false, pro: true },
			{ id: 'recurring', label: __( 'Recurring appointments', 'aponto' ), free: false, pro: true },
			{ id: 'waitlist', label: __( 'Waitlist', 'aponto' ), free: false, pro: true },
		],
	},
	{
		id: 'payments',
		label: __( 'Payments', 'aponto' ),
		rows: [
			{ id: 'manual', label: __( 'Mark bookings paid / unpaid', 'aponto' ), free: true, pro: true },
			// D-R22: Stripe is a Free module; PayPal stays Premium — the old single "Online
			// payments (Stripe, PayPal)" row can no longer state one answer. Stripe SHIPPED in P3
			// (D-R39), so the Free column is a tick: the shipped-truth rule says this table may
			// never say "Coming" for a capability whose own card on the same screen reads
			// "Ready" (QA BUG-8).
			{ id: 'stripe', label: __( 'Stripe payments', 'aponto' ), free: true, pro: true },
			{ id: 'paypal', label: __( 'PayPal payments', 'aponto' ), free: false, pro: true },
			{ id: 'deposits', label: __( 'Deposits', 'aponto' ), free: false, pro: true },
			{ id: 'coupons', label: __( 'Coupons', 'aponto' ), free: false, pro: true },
		],
	},
	{
		id: 'connections',
		label: __( 'Connections', 'aponto' ),
		rows: [
			{ id: 'email', label: __( 'Email notifications', 'aponto' ), free: true, pro: true },
			// A5 / D-R22: the fixed 24h email reminder is core Free; only custom schedules
			// (multi-step, follow-ups) are the Premium `reminders` module.
			{ id: 'reminder', label: __( '24-hour email reminder', 'aponto' ), free: true, pro: true },
			{ id: 'reminders_advanced', label: __( 'Custom reminder schedules', 'aponto' ), free: false, pro: true },
			{ id: 'calendar', label: __( 'Calendar sync (Google, Outlook)', 'aponto' ), free: false, pro: true },
			{ id: 'sms', label: __( 'SMS reminders', 'aponto' ), free: false, pro: true },
			{ id: 'video', label: __( 'Video meeting links', 'aponto' ), free: false, pro: true },
			{ id: 'webhooks', label: __( 'Webhooks', 'aponto' ), free: false, pro: true },
		],
	},
	{
		id: 'site_tools',
		label: __( 'Site & tools', 'aponto' ),
		rows: [
			{ id: 'csv_export', label: __( 'CSV export', 'aponto' ), free: true, pro: true },
			{ id: 'csv_import', label: __( 'CSV import', 'aponto' ), free: __( 'Coming', 'aponto' ), pro: true },
			{ id: 'service_catalog', label: __( 'Service catalog pages', 'aponto' ), free: __( 'Coming', 'aponto' ), pro: true },
			{ id: 'roles', label: __( 'Team roles', 'aponto' ), free: false, pro: true },
			{ id: 'white_label', label: __( 'White label', 'aponto' ), free: false, pro: true },
		],
	},
];

"use strict";
(globalThis["webpackChunkaponto"] = globalThis["webpackChunkaponto"] || []).push([["admin-chunk-services"],{

/***/ "./assets/src/admin/lib/combobox-options.js"
/*!**************************************************!*\
  !*** ./assets/src/admin/lib/combobox-options.js ***!
  \**************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   customerOptions: () => (/* binding */ customerOptions),
/* harmony export */   filterOptions: () => (/* binding */ filterOptions),
/* harmony export */   findOptionById: () => (/* binding */ findOptionById),
/* harmony export */   isSameOption: () => (/* binding */ isSameOption),
/* harmony export */   optionHaystack: () => (/* binding */ optionHaystack),
/* harmony export */   optionKey: () => (/* binding */ optionKey),
/* harmony export */   serviceOptions: () => (/* binding */ serviceOptions),
/* harmony export */   staffOptions: () => (/* binding */ staffOptions)
/* harmony export */ });
/* harmony import */ var _format_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./format.js */ "./assets/src/admin/lib/format.js");
/**
 * Option helpers for the admin `Combobox` (SPEC-P1 §6.7). Framework-free and
 * side-effect-free; the only ambient input is the store currency the shared money
 * formatter reads from the boot config.
 *
 * Option identity is the RECORD ID, never the display name. Two services (or staff,
 * or customers) may legitimately share a name — `wp aponto seed` plus the wizard's
 * default service both create "Haircut" — and using the name as identity broke twice
 * over: duplicate React keys in the listbox ("Encountered two children with the same
 * key") let rows be dropped/reused, and, worse, a selection could not say WHICH
 * record it meant, so the `service_id` written by POST /bookings was ambiguous.
 *
 * Contract for every option object: `id` decides identity (React key, aria-selected,
 * what gets submitted), `label` is display-only, `meta` is the row's secondary line,
 * `keywords` is extra typeahead text. Filtering always matches the label so typing a
 * name keeps working.
 *
 * Identity alone is invisible, though: two same-named rows still LOOK identical, so
 * the founder approved (2026-07-25) a disambiguation meta line for the two catalogs
 * that lacked one — services show `duration · price`, staff show their email — which
 * is the secondary line the customer picker already renders.
 */


/**
 * Stable listbox key + selection identity for one option.
 *
 * Prefixed so a record id and a fallback label can never collide, and so a
 * name-keyed regression is obvious in the DOM.
 *
 * @param {Object} option Combobox option.
 * @return {string} Identity string ('' for a missing option).
 */
function optionKey(option) {
  if (!option) {
    return '';
  }
  if (option.id !== undefined && option.id !== null && option.id !== '') {
    return `id:${option.id}`;
  }
  // Defensive only: catalogs always carry an id. Ambiguous by construction.
  return `label:${option.label ?? ''}`;
}

/**
 * The option for a record id, or null when the catalog does not carry it.
 *
 * Used to turn a prefilled id — e.g. the staff member whose calendar a free slot was clicked on
 * (D-R28) — into the option object the `Combobox` expects, WITHOUT inventing one: an id the
 * catalog does not contain (archived, or past the catalog's window) must leave the field empty
 * rather than select a record that is not really selectable.
 *
 * @param {Array}         options Combobox options.
 * @param {number|string} id      Record id.
 * @return {?Object} The matching option, or null.
 */
function findOptionById(options, id) {
  if (id === undefined || id === null || id === '') {
    return null;
  }
  return (options || []).find(option => String(option?.id) === String(id)) || null;
}

/**
 * True when both arguments are the same record (by id, not by name).
 *
 * @param {Object} a First option.
 * @param {Object} b Second option.
 * @return {boolean} Whether both options identify the same record.
 */
function isSameOption(a, b) {
  const keyA = optionKey(a);
  return !!keyA && keyA === optionKey(b);
}

/**
 * Typeahead text for one option: the label plus any extra keywords (email/phone).
 *
 * @param {Object} option Combobox option.
 * @return {string} Lowercased haystack.
 */
function optionHaystack(option) {
  return [option?.label, option?.keywords].filter(Boolean).join(' ').toLowerCase();
}

/**
 * Filter options by a raw query. An empty query keeps the full list.
 *
 * @param {Array}  options Option list.
 * @param {string} query   Raw user query.
 * @return {Array} Matching options (same order).
 */
function filterOptions(options = [], query = '') {
  const q = `${query || ''}`.trim().toLowerCase();
  if (!q) {
    return options;
  }
  return options.filter(option => optionHaystack(option).includes(q));
}

/** True for a value that is present enough to render (0 counts, '' / null do not). */
function present(value) {
  return value !== null && value !== undefined && value !== '';
}

/**
 * "30 min · $25.00" secondary line for one service.
 *
 * Both halves reuse what the admin already renders elsewhere, so the dropdown cannot
 * drift from the Services table: duration as `<minutes> min` (`routes/Services.jsx`
 * duration column + service editor readout), price through `format.js` `money()`,
 * which divides the integer minor units by the store currency's own ISO-4217 exponent
 * (invariant 7 — money is never hand-divided here). A service with no configured
 * price contributes no price segment, the same guard the Services table uses instead
 * of printing a fake "$0.00".
 *
 * @param {Object} item REST `/services` item.
 * @return {string} Meta line ('' when the record carries neither value).
 */
function serviceMeta(item) {
  const parts = [];
  if (present(item.duration_minutes)) {
    parts.push(`${item.duration_minutes} min`);
  }
  if (present(item.price_minor)) {
    parts.push((0,_format_js__WEBPACK_IMPORTED_MODULE_0__.money)(item.price_minor));
  }
  return parts.join(' · ');
}

/**
 * Service options. `duration`/`price` ride along so the schedule derivation follows
 * the PICKED record even when another service shares its name; `meta` puts the same
 * two values on screen so the user can SEE which "Haircut" is which before picking.
 *
 * @param {Array} items REST `/services` items.
 * @return {Array} Combobox options.
 */
function serviceOptions(items = []) {
  return (items || []).map(item => ({
    id: item.id,
    label: item.name,
    duration: item.duration_minutes,
    price: item.price_minor,
    meta: serviceMeta(item)
  }));
}

/**
 * Staff options. `meta` is the email — the one field that tells two same-named staff
 * apart — and it joins `keywords` exactly like the customer picker's contact details,
 * so what the row shows is also what the typeahead can match.
 *
 * @param {Array} items REST `/staff` items.
 * @return {Array} Combobox options.
 */
function staffOptions(items = []) {
  return (items || []).map(item => ({
    id: item.id,
    label: item.name,
    meta: item.email || '',
    keywords: item.email || ''
  }));
}

/**
 * Customer options. `meta` is the secondary line in the entity row; `keywords` adds
 * email + phone to the typeahead (the label alone is the name).
 *
 * @param {Array} items REST `/customers` items.
 * @return {Array} Combobox options.
 */
function customerOptions(items = []) {
  return (items || []).map(item => ({
    id: item.id,
    label: item.name,
    meta: item.email || item.phone || '',
    keywords: [item.email, item.phone].filter(Boolean).join(' '),
    name: item.name,
    email: item.email,
    phone: item.phone
  }));
}

/***/ },

/***/ "./assets/src/admin/modules/catalog.js"
/*!*********************************************!*\
  !*** ./assets/src/admin/modules/catalog.js ***!
  \*********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CATEGORY_META: () => (/* binding */ CATEGORY_META),
/* harmony export */   CATEGORY_TABS: () => (/* binding */ CATEGORY_TABS),
/* harmony export */   COMPARE_SECTIONS: () => (/* binding */ COMPARE_SECTIONS),
/* harmony export */   INCLUDED_CARD_ROUTES: () => (/* binding */ INCLUDED_CARD_ROUTES),
/* harmony export */   INDUSTRY_LABELS: () => (/* binding */ INDUSTRY_LABELS),
/* harmony export */   INDUSTRY_OPTIONS: () => (/* binding */ INDUSTRY_OPTIONS),
/* harmony export */   MODULE_META: () => (/* binding */ MODULE_META),
/* harmony export */   enablingNeedsReload: () => (/* binding */ enablingNeedsReload),
/* harmony export */   findModuleRecord: () => (/* binding */ findModuleRecord),
/* harmony export */   integrationStateLabel: () => (/* binding */ integrationStateLabel),
/* harmony export */   kindLabel: () => (/* binding */ kindLabel),
/* harmony export */   moduleAvailable: () => (/* binding */ moduleAvailable),
/* harmony export */   moduleCardState: () => (/* binding */ moduleCardState),
/* harmony export */   moduleOpenHref: () => (/* binding */ moduleOpenHref),
/* harmony export */   moduleSearchText: () => (/* binding */ moduleSearchText),
/* harmony export */   moduleStateLabel: () => (/* binding */ moduleStateLabel),
/* harmony export */   moduleToggleAllowed: () => (/* binding */ moduleToggleAllowed),
/* harmony export */   paymentStateLabel: () => (/* binding */ paymentStateLabel),
/* harmony export */   upgradeUrl: () => (/* binding */ upgradeUrl)
/* harmony export */ });
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _filters_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./filters.js */ "./assets/src/admin/modules/filters.js");
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



/** Category tabs, in order (SPEC-P1 §6). `all` is the default landing view. */
const CATEGORY_TABS = [{
  id: 'all',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('All', 'aponto')
}, {
  id: 'booking',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Booking', 'aponto')
}, {
  id: 'payments',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Payments', 'aponto')
}, {
  id: 'connections',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Connections', 'aponto')
}, {
  id: 'site_tools',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Site & Tools', 'aponto')
}];

/**
 * Industry filter options, in display order (D-R21, founder-approved 2026-07-25).
 * The ids are the registry `industries` vocabulary; `all` is the sentinel that
 * both the select's default option and a universal module carry.
 */
const INDUSTRY_OPTIONS = [{
  id: _filters_js__WEBPACK_IMPORTED_MODULE_1__.INDUSTRY_ALL,
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('All businesses', 'aponto')
}, {
  id: 'beauty',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Beauty & wellness', 'aponto')
}, {
  id: 'coaching',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Coaching & consulting', 'aponto')
}, {
  id: 'fitness',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Fitness & classes', 'aponto')
}, {
  id: 'healthcare',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Healthcare', 'aponto')
}, {
  id: 'events',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Events & experiences', 'aponto')
}, {
  id: 'venues',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Venues & rentals', 'aponto')
}, {
  id: 'agencies',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Agencies & web', 'aponto')
}, {
  id: 'field_services',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Field services', 'aponto')
}];

/** Industry id → display label, for the select and the search haystack. */
const INDUSTRY_LABELS = Object.fromEntries(INDUSTRY_OPTIONS.map(option => [option.id, option.label]));

/** Category display label + fallback icon, keyed by the registry `category`. */
const CATEGORY_META = {
  booking: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Booking', 'aponto'),
    icon: 'calendar'
  },
  payments: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Payments', 'aponto'),
    icon: 'card'
  },
  connections: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Connections', 'aponto'),
    icon: 'plug'
  },
  site_tools: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Site & Tools', 'aponto'),
    icon: 'wrench'
  }
};

/** Per-module display copy + icon, keyed by registry code. */
const MODULE_META = {
  multi_staff: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Multiple staff', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Let several team members take bookings on their own schedules.', 'aponto'),
    icon: 'users'
  },
  calendar_google: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Google Calendar', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Two-way sync so bookings land on staff Google calendars.', 'aponto'),
    icon: 'calendar'
  },
  // A5 / D-R22: Free already ships one fixed 24h email reminder (SPEC-P1 §3.2 addendum
  // 2026-07-20), so this Premium module means *advanced* reminders — custom offsets,
  // multi-step sequences, follow-ups. SMS delivery is the separate `sms` module; this copy
  // must claim neither the basic reminder nor SMS.
  reminders: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Reminders', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Custom reminder schedules and follow-ups, on top of the built-in 24-hour email.', 'aponto'),
    icon: 'bell'
  },
  calendar_outlook: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Outlook Calendar', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Two-way sync with Outlook and Microsoft 365 calendars.', 'aponto'),
    icon: 'calendar'
  },
  video_links: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Video meeting links', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Auto-create Zoom or Google Meet links for online bookings.', 'aponto'),
    icon: 'video'
  },
  custom_fields: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Custom fields', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Collect extra details on the booking form.', 'aponto'),
    icon: 'sliders'
  },
  csv_import: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('CSV import', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Bulk-import customers and bookings from a spreadsheet.', 'aponto'),
    icon: 'import'
  },
  // `deposits` is a separate Premium module (D-R22) — Stripe copy must not promise it. The
  // sentence names the two facts that decide whether an owner clicks: the customer never leaves
  // the booking form (D-R38c, inline — not a hosted redirect), and the money lands in the owner's
  // OWN Stripe account. "Free" is stated because this is the one payment card in the catalog that
  // is not an upsell.
  payments_stripe: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Stripe payments', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Take card payments inside the booking form with your own Stripe account. Free.', 'aponto'),
    icon: 'card'
  },
  // Same rule as Stripe above: `deposits` is a separate Premium module, so this copy must not
  // promise it. Cards are Stripe's — PayPal's card funding is switched off in the widget when
  // Stripe is present — so the promise here is the PayPal account itself (D-R40).
  payments_paypal: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('PayPal payments', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Let customers pay with their PayPal account at checkout.', 'aponto'),
    icon: 'card'
  },
  deposits: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Deposits', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Require a partial payment to confirm a booking.', 'aponto'),
    icon: 'coins'
  },
  coupons: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Coupons', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Offer discount codes at checkout.', 'aponto'),
    icon: 'tag'
  },
  group_capacity: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Group bookings', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Allow several attendees in a single time slot.', 'aponto'),
    icon: 'people'
  },
  resources: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Shared assets', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Book rooms and equipment alongside services.', 'aponto'),
    icon: 'cube'
  },
  recurring: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Recurring bookings', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Let customers book repeating appointments.', 'aponto'),
    icon: 'arrows'
  },
  multi_location: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Multiple locations', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Run bookings across several business locations.', 'aponto'),
    icon: 'pin'
  },
  waitlist: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Waitlist', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Let customers join a waitlist when slots are full.', 'aponto'),
    icon: 'hourglass'
  },
  sms: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('SMS notifications', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Send confirmations and reminders by text message.', 'aponto'),
    icon: 'chat'
  },
  webhooks: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Webhooks', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Send booking events to external services in real time.', 'aponto'),
    icon: 'plug'
  },
  woo_gateway: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('WooCommerce', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Use WooCommerce as the checkout and payment gateway.', 'aponto'),
    icon: 'box'
  },
  service_catalog: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Service catalog', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Public service pages with descriptions and galleries.', 'aponto'),
    icon: 'browser'
  },
  roles: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Team roles', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Fine-grained permissions for staff and managers.', 'aponto'),
    icon: 'shield'
  },
  white_label: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('White label', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Replace Aponto branding with your own.', 'aponto'),
    icon: 'palette'
  },
  // Free core capability cards (D-R22, 2026-07-27) — P1 capabilities that already ship as
  // core code. Display entries only; they carry no gate (see the Plan registry docblock).
  booking_form: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Booking form', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Gutenberg block and shortcode with styling controls — identical in Free and Premium.', 'aponto'),
    icon: 'browser'
  },
  availability_engine: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Availability engine', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Weekly hours, date overrides, buffers, lead time and timezone-correct slots.', 'aponto'),
    icon: 'clock'
  },
  // The due rule is SPEC-P1 §3.2: confirmed bookings only, and only those still at least
  // 24h away when the reminder is scheduled — the copy must not promise "every booking".
  booking_reminder: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('24-hour reminder', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('One automatic email reminder about 24 hours before confirmed bookings.', 'aponto'),
    icon: 'bell'
  },
  email_notifications: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Email notifications', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Event-triggered emails with editable templates and placeholders.', 'aponto'),
    icon: 'mail'
  },
  ics_export: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Calendar links', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('ICS downloads and add-to-Google links on every confirmation.', 'aponto'),
    icon: 'calendar'
  },
  csv_export: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('CSV export', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Export bookings for spreadsheets and reporting.', 'aponto'),
    icon: 'csv'
  }
};

/**
 * Searchable display strings for one module — the `resolveText` seam of
 * `filters.js` (D-R21). Mirrors the mockup haystack: title, description,
 * category label and every industry label.
 *
 * @param {{code?: string, category?: string, industries?: string[]}} mod Module record.
 * @return {string[]} Searchable strings.
 */
function moduleSearchText(mod) {
  const meta = MODULE_META[mod?.code] || {};
  const category = CATEGORY_META[mod?.category] || {};
  const industries = Array.isArray(mod?.industries) ? mod.industries : [];
  return [meta.label, meta.description, category.label, ...industries.map(id => INDUSTRY_LABELS[id])].filter(Boolean);
}

/** Human label for the module `kind`: integrations vs first-party modules. */
function kindLabel(kind) {
  return kind === 'integration' ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Integration', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Module', 'aponto');
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
function integrationStateLabel(mod) {
  if ('integration' !== mod?.kind || true !== mod?.available) {
    return '';
  }
  if (!mod.configured) {
    return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Setup needed', 'aponto');
  }
  const connected = Number(mod.connected_count) || 0;
  if (connected < 1) {
    return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Configured · no staff connected', 'aponto');
  }
  const used = Number(mod.used_count) || 0;
  const staff = (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.sprintf)(/* translators: %d: number of staff members connected to an integration. */
  (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__._n)('%d staff connected', '%d staff connected', connected, 'aponto'), connected);
  if (used < 1) {
    return staff;
  }
  return staff + ' · ' + (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.sprintf)(/* translators: %d: number of services an integration acts for. */
  (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__._n)('%d service', '%d services', used, 'aponto'), used);
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
function paymentStateLabel(mod) {
  if (true !== mod?.available) {
    return '';
  }
  if (!mod.configured || false === mod.ready) {
    return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Setup needed', 'aponto');
  }
  const mode = typeof mod.payment_mode === 'string' ? mod.payment_mode : '';
  if ('test' === mode) {
    return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Ready · Test mode', 'aponto');
  }
  if ('live' === mode) {
    return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Ready · Live', 'aponto');
  }
  return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Ready', 'aponto');
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
function moduleStateLabel(mod) {
  return 'payments' === mod?.category ? paymentStateLabel(mod) : integrationStateLabel(mod);
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
function findModuleRecord(bootConfig, code) {
  const modules = Array.isArray(bootConfig?.modules) ? bootConfig.modules : [];
  return modules.find(mod => mod?.code === code) || null;
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
function moduleAvailable(bootConfig, code) {
  return findModuleRecord(bootConfig, code)?.available === true;
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
function moduleToggleAllowed(mod, planEdition = 'free') {
  if (mod?.toggleable !== true || mod?.status !== 'included') {
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
function enablingNeedsReload(mod, next) {
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
function moduleCardState(mod, planEdition = 'free') {
  const premium = mod?.edition === 'premium';
  const onPremiumBuild = planEdition === 'premium';
  const tier = premium ? {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Premium', 'aponto'),
    isPremium: true
  } : {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Free', 'aponto'),
    variant: 'free'
  };
  const toggle = moduleToggleAllowed(mod, planEdition);
  if (mod?.available === true) {
    return {
      state: 'enabled',
      tier,
      toggle,
      statusLabel: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Included', 'aponto'),
      plannedLabel: null,
      upgrade: false
    };
  }

  // SWITCHED OFF — not "not built yet". Both are `available: false`, and without this branch a
  // disabled module falls into the planned/upsell copy below and tells the owner their own
  // choice is a roadmap item (D-R31). The card keeps the Included shape so flipping the switch
  // back is obviously the way out; the kit mutes it via the `disabled` state.
  if (toggle) {
    return {
      state: 'disabled',
      tier,
      toggle: true,
      statusLabel: null,
      plannedLabel: null,
      upgrade: false
    };
  }
  if (premium && onPremiumBuild) {
    return {
      state: 'planned',
      // Deliberately NOT `isPremium`: that flag is what paints the amber "locked/paid"
      // chrome (kit `tierVariantClass`). The label still names the plan the module
      // belongs to — a catalog fact — but on neutral chrome, because nothing here is
      // locked to this viewer.
      tier: {
        label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Premium', 'aponto')
      },
      toggle: false,
      statusLabel: null,
      plannedLabel: comingSoonLabel(mod?.phase),
      upgrade: false
    };
  }
  return {
    state: 'planned',
    tier,
    toggle: false,
    statusLabel: null,
    // A locked Premium card carries the compare link instead of a "Coming soon"
    // label — its answer to "when" is the pricing page, not a status word.
    plannedLabel: premium ? null : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Coming soon', 'aponto'),
    upgrade: premium
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
function comingSoonLabel(phase) {
  const code = typeof phase === 'string' ? phase.trim() : '';
  if ('' === code) {
    return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Coming soon', 'aponto');
  }
  return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.sprintf)(/* translators: %s: roadmap phase code, e.g. "P2b". */
  (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Coming soon · %s', 'aponto'), code);
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
const INCLUDED_CARD_ROUTES = {
  booking_reminder: '#settings/notifications',
  email_notifications: '#settings/notifications',
  csv_export: '#bookings',
  availability_engine: '#settings/booking/policy',
  multi_staff: '#staff'
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
function moduleOpenHref(mod) {
  if (mod?.available !== true) {
    return '';
  }
  const mapped = INCLUDED_CARD_ROUTES[mod.code];
  if (mapped) {
    return mapped;
  }
  return mod?.has_settings === true ? `#modules/${mod.code}` : '';
}
const UPGRADE_BASE = 'https://pressmaximum.com/aponto/pricing/';

/**
 * Per-placement upgrade link with UTM tracking (§6). `placement` is the
 * `utm_content`: `modules-{code}` for a card, `menu` for the page-level CTA.
 */
function upgradeUrl(placement) {
  const params = new URLSearchParams({
    utm_source: 'aponto',
    utm_medium: 'plugin',
    utm_campaign: 'upsell',
    utm_content: placement
  });
  return `${UPGRADE_BASE}?${params.toString()}`;
}

/** Free-vs-premium comparison matrix for the CompareTable at the page foot (§6). */
const COMPARE_SECTIONS = [{
  id: 'bookings',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Bookings', 'aponto'),
  rows: [{
    id: 'unlimited',
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Unlimited bookings', 'aponto'),
    free: true,
    pro: true
  }, {
    id: 'staff',
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Staff members', 'aponto'),
    free: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('1', 'aponto'),
    pro: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Unlimited', 'aponto')
  }, {
    id: 'services',
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Services & categories', 'aponto'),
    free: true,
    pro: true
  },
  // D-R43: Free books one business address (General -> Business, `location_id = 0`); named
  // locations are the Premium `multi_location` module, whose registry `category` is `booking`.
  {
    id: 'locations',
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Multiple locations', 'aponto'),
    free: false,
    pro: true
  }, {
    id: 'group',
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Group bookings', 'aponto'),
    free: false,
    pro: true
  }, {
    id: 'recurring',
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Recurring appointments', 'aponto'),
    free: false,
    pro: true
  }, {
    id: 'waitlist',
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Waitlist', 'aponto'),
    free: false,
    pro: true
  }]
}, {
  id: 'payments',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Payments', 'aponto'),
  rows: [{
    id: 'manual',
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Mark bookings paid / unpaid', 'aponto'),
    free: true,
    pro: true
  },
  // D-R22: Stripe is a Free module; PayPal stays Premium — the old single "Online
  // payments (Stripe, PayPal)" row can no longer state one answer. Stripe SHIPPED in P3
  // (D-R39), so the Free column is a tick: the shipped-truth rule says this table may
  // never say "Coming" for a capability whose own card on the same screen reads
  // "Ready" (QA BUG-8).
  {
    id: 'stripe',
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Stripe payments', 'aponto'),
    free: true,
    pro: true
  }, {
    id: 'paypal',
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('PayPal payments', 'aponto'),
    free: false,
    pro: true
  }, {
    id: 'deposits',
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Deposits', 'aponto'),
    free: false,
    pro: true
  }, {
    id: 'coupons',
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Coupons', 'aponto'),
    free: false,
    pro: true
  }]
}, {
  id: 'connections',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Connections', 'aponto'),
  rows: [{
    id: 'email',
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Email notifications', 'aponto'),
    free: true,
    pro: true
  },
  // A5 / D-R22: the fixed 24h email reminder is core Free; only custom schedules
  // (multi-step, follow-ups) are the Premium `reminders` module.
  {
    id: 'reminder',
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('24-hour email reminder', 'aponto'),
    free: true,
    pro: true
  }, {
    id: 'reminders_advanced',
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Custom reminder schedules', 'aponto'),
    free: false,
    pro: true
  }, {
    id: 'calendar',
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Calendar sync (Google, Outlook)', 'aponto'),
    free: false,
    pro: true
  }, {
    id: 'sms',
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('SMS reminders', 'aponto'),
    free: false,
    pro: true
  }, {
    id: 'video',
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Video meeting links', 'aponto'),
    free: false,
    pro: true
  }, {
    id: 'webhooks',
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Webhooks', 'aponto'),
    free: false,
    pro: true
  }]
}, {
  id: 'site_tools',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Site & tools', 'aponto'),
  rows: [{
    id: 'csv_export',
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('CSV export', 'aponto'),
    free: true,
    pro: true
  }, {
    id: 'csv_import',
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('CSV import', 'aponto'),
    free: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Coming', 'aponto'),
    pro: true
  }, {
    id: 'service_catalog',
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Service catalog pages', 'aponto'),
    free: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Coming', 'aponto'),
    pro: true
  }, {
    id: 'roles',
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Team roles', 'aponto'),
    free: false,
    pro: true
  }, {
    id: 'white_label',
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('White label', 'aponto'),
    free: false,
    pro: true
  }]
}];

/***/ },

/***/ "./assets/src/admin/modules/filters.js"
/*!*********************************************!*\
  !*** ./assets/src/admin/modules/filters.js ***!
  \*********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CATEGORY_ALL: () => (/* binding */ CATEGORY_ALL),
/* harmony export */   INDUSTRY_ALL: () => (/* binding */ INDUSTRY_ALL),
/* harmony export */   INDUSTRY_IDS: () => (/* binding */ INDUSTRY_IDS),
/* harmony export */   filterModules: () => (/* binding */ filterModules),
/* harmony export */   hasBrowseFilters: () => (/* binding */ hasBrowseFilters),
/* harmony export */   matchesCategory: () => (/* binding */ matchesCategory),
/* harmony export */   matchesIndustry: () => (/* binding */ matchesIndustry),
/* harmony export */   matchesQuery: () => (/* binding */ matchesQuery),
/* harmony export */   moduleIndustries: () => (/* binding */ moduleIndustries)
/* harmony export */ });
/**
 * Pure browse-filter logic for the Modules catalog (D-R21, 2026-07-25).
 *
 * The Modules screen combines three independent filters with AND: the category
 * tabs, the Industry select and the free-text search box — the same combination
 * the mockup's `filteredModules()` applies (docs/mockups/v4/plugin-dashboard/
 * assets/js/plugin-dashboard.js). Kept framework- and i18n-free so it is unit
 * testable in the node Jest environment; every display string is injected by the
 * caller through `resolveText`.
 *
 * The mockup's Status and License selects are deliberately NOT part of this
 * module: D-R21 approved the Industry filter only, and D-R22 (mixed editions and
 * card states in the catalog) did not re-open that scope.
 */

/** Sentinel industry id: matches every industry, on a module and as a filter value. */
const INDUSTRY_ALL = 'all';

/** Sentinel category id used by the "All" tab. */
const CATEGORY_ALL = 'all';

/**
 * The controlled industry vocabulary (D-R21), in display order. Mirrors the
 * registry's `industries` field; `all` is the sentinel and is not listed here.
 */
const INDUSTRY_IDS = ['beauty', 'coaching', 'fitness', 'healthcare', 'events', 'venues', 'agencies', 'field_services'];

/**
 * A module's industry tags, defensively normalized. A registry entry that ships
 * without the field (older boot data) reads as untagged.
 *
 * @param {{industries?: string[]}} mod Module record.
 * @return {string[]} Industry ids.
 */
function moduleIndustries(mod) {
  return Array.isArray(mod?.industries) ? mod.industries.filter(id => typeof id === 'string') : [];
}

/**
 * Industry predicate. `all` on either side matches; an untagged module stays
 * visible rather than disappearing from every industry view (forward-compat with
 * a bundle newer than its boot data).
 *
 * @param {{industries?: string[]}} mod      Module record.
 * @param {string}                  industry Selected industry id.
 * @return {boolean} Whether the module belongs to the industry.
 */
function matchesIndustry(mod, industry) {
  if (!industry || industry === INDUSTRY_ALL) {
    return true;
  }
  const tags = moduleIndustries(mod);
  if (tags.length === 0) {
    return true;
  }
  return tags.includes(INDUSTRY_ALL) || tags.includes(industry);
}

/**
 * Category predicate (the tab strip).
 *
 * @param {{category?: string}} mod      Module record.
 * @param {string}              category Selected category id.
 * @return {boolean} Whether the module belongs to the category.
 */
function matchesCategory(mod, category) {
  return !category || category === CATEGORY_ALL || mod?.category === category;
}

/**
 * Free-text predicate over the caller-supplied display strings (title,
 * description, category label, industry labels). Matching is case-insensitive
 * substring, like the mockup's haystack.
 *
 * @param {Object}   mod         Module record.
 * @param {string}   query       Raw query string.
 * @param {Function} resolveText `( mod ) => string[]` searchable strings.
 * @return {boolean} Whether the module matches the query.
 */
function matchesQuery(mod, query, resolveText) {
  const needle = String(query || '').trim().toLowerCase();
  if ('' === needle) {
    return true;
  }
  const parts = typeof resolveText === 'function' ? resolveText(mod) : [];
  const haystack = [mod?.code, ...(Array.isArray(parts) ? parts : [])].filter(part => typeof part === 'string' && '' !== part).join(' ').toLowerCase();
  return haystack.includes(needle);
}

/**
 * Apply every active filter with AND, preserving registry order.
 *
 * @param {Object[]} modules             Module records.
 * @param {Object}   filters             Active filters.
 * @param {string}   [filters.category]  Category id (`all` = no filter).
 * @param {string}   [filters.industry]  Industry id (`all` = no filter).
 * @param {string}   [filters.query]     Free-text query.
 * @param {Function} [resolveText]       `( mod ) => string[]` searchable strings.
 * @return {Object[]} Matching modules.
 */
function filterModules(modules, filters = {}, resolveText) {
  const {
    category = CATEGORY_ALL,
    industry = INDUSTRY_ALL,
    query = ''
  } = filters;
  const list = Array.isArray(modules) ? modules : [];
  return list.filter(mod => matchesCategory(mod, category) && matchesIndustry(mod, industry) && matchesQuery(mod, query, resolveText));
}

/**
 * Whether any filter other than the category tab is narrowing the view — used to
 * decide between "this category is empty" and "clear a filter" copy.
 *
 * @param {Object} filters            Active filters.
 * @param {string} [filters.industry] Industry id.
 * @param {string} [filters.query]    Free-text query.
 * @return {boolean} Whether a browse filter is active.
 */
function hasBrowseFilters(filters = {}) {
  const {
    industry = INDUSTRY_ALL,
    query = ''
  } = filters;
  return industry !== INDUSTRY_ALL || '' !== String(query || '').trim();
}

/***/ },

/***/ "./assets/src/admin/routes/ServiceEditor.jsx"
/*!***************************************************!*\
  !*** ./assets/src/admin/routes/ServiceEditor.jsx ***!
  \***************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ServiceEditor: () => (/* binding */ ServiceEditor),
/* harmony export */   eligibilityRows: () => (/* binding */ eligibilityRows),
/* harmony export */   locationScopedStaffIds: () => (/* binding */ locationScopedStaffIds),
/* harmony export */   toggleStaffAssignment: () => (/* binding */ toggleStaffAssignment)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _lib_api_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../lib/api.js */ "./assets/src/admin/lib/api.js");
/* harmony import */ var _lib_config_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../lib/config.js */ "./assets/src/admin/lib/config.js");
/* harmony import */ var _modules_catalog_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../modules/catalog.js */ "./assets/src/admin/modules/catalog.js");
/* harmony import */ var _lib_format_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../lib/format.js */ "./assets/src/admin/lib/format.js");
/* harmony import */ var _lib_combobox_options_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../lib/combobox-options.js */ "./assets/src/admin/lib/combobox-options.js");
/* harmony import */ var _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../lib/icon.jsx */ "./assets/src/admin/lib/icon.jsx");
/* harmony import */ var _lib_toast_jsx__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../lib/toast.jsx */ "./assets/src/admin/lib/toast.jsx");
/* harmony import */ var _lib_ui_jsx__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../lib/ui.jsx */ "./assets/src/admin/lib/ui.jsx");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__);
/**
 * Service editor (SPEC-P1 §1.1) — full-page, five sections:
 *   1. Details            — name*, category (+ quick-create), description, status
 *                           enum (active|draft|archived, Q3), featured image (Q7).
 *   2. Public content     — honest seam for `service_catalog` (free but unbuilt since
 *                           D-R22; registry phase P5). Card state copy mirrors the
 *                           Modules screen's free+planned state: no phase string, no
 *                           upgrade link, no placeholder controls. This is now the ONLY
 *                           seam left on this page.
 *   3. Duration & price   — duration*, price (minor units), buffers, slot step, color (Q7).
 *   4. Staff & locations   — the eligible-staff editor (SPEC-P1 §1.1.4): a searchable
 *                           multi-select over `GET|PUT /services/{id}/eligibility`
 *                           (rest-contract §2.18). Editable when `multi_staff` is
 *                           available (D-R28); read-only otherwise, since Free
 *                           auto-links its single staff member and there is nothing
 *                           to choose between.
 *   5. Booking policy     — min lead / max horizon (nullable overrides, SPEC-P0 §4.2).
 *
 * Create = POST /services; Edit = PATCH /services/{id}. Capacity is hidden (Q6).
 *
 * WHY the create flow does not simply close (D-R28): the Free staff policy auto-assigns
 * by design (r1 review item 1), so on premium a brand-new service has ZERO rows in
 * `aponto_staff_services` — any-staff availability returns [] and the service is unbookable until
 * someone is assigned. Creating therefore hands the owner straight to this section instead of
 * dropping them back on the list with a service that silently cannot be booked.
 */











const STATUS_OPTIONS = [{
  value: 'active',
  label: 'Active'
}, {
  value: 'draft',
  label: 'Draft'
}, {
  value: 'archived',
  label: 'Archived'
}];
// R3 — full-page record-editor section nav (mockup .pd-record-editor-page).
const SECTIONS = [['details', 'Details'], ['public', 'Public content'], ['pricing', 'Duration & price'], ['assignments', 'Staff & locations'], ['policy', 'Booking policy']];
function blank() {
  return {
    name: '',
    category_id: '',
    description: '',
    status: 'active',
    image_id: null,
    duration_minutes: 30,
    price: '',
    buffer_before: 0,
    buffer_after: 0,
    slot_step_minutes: '',
    color: '',
    min_lead_minutes: '',
    max_horizon_days: ''
  };
}
function fromDto(dto) {
  return {
    name: dto.name || '',
    category_id: dto.category_id ? String(dto.category_id) : '',
    description: dto.description || '',
    status: dto.status || 'active',
    image_id: dto.image_id ?? null,
    duration_minutes: dto.duration_minutes ?? 30,
    price: dto.price_minor === null || dto.price_minor === undefined ? '' : String((0,_lib_format_js__WEBPACK_IMPORTED_MODULE_5__.minorToMajor)(dto.price_minor)),
    buffer_before: dto.buffer_before ?? 0,
    buffer_after: dto.buffer_after ?? 0,
    slot_step_minutes: dto.slot_step_minutes ?? '',
    color: dto.color || '',
    min_lead_minutes: dto.min_lead_minutes ?? '',
    max_horizon_days: dto.max_horizon_days ?? ''
  };
}
function numOrNull(value) {
  return String(value).trim() === '' ? null : Number(value);
}
function ServiceEditor({
  mode,
  service,
  categories,
  onCreateCategory,
  onClose,
  onSaved
}) {
  const showToast = (0,_lib_toast_jsx__WEBPACK_IMPORTED_MODULE_8__.useToast)();
  const multiStaff = (0,_modules_catalog_js__WEBPACK_IMPORTED_MODULE_4__.moduleAvailable)(_lib_config_js__WEBPACK_IMPORTED_MODULE_3__.config, 'multi_staff');
  // A service created in THIS editor session (premium create-then-edit, see the file header).
  // Once set, the editor is editing that record: `creating` flips false, so Save becomes a
  // PATCH and the eligibility section — which needs a service id — comes alive.
  const [createdId, setCreatedId] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const creating = mode === 'create' && null === createdId;
  const serviceId = service?.id ?? createdId;
  const [loading, setLoading] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(!creating);
  const [saving, setSaving] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  // Pending eligibility edits, published by EligibilitySection as `{ dirty, save }` so the
  // page-level Save can flush them — the same one-continuous-form rule StaffWorkspace follows
  // for work hours (a section that silently drops a pending edit on unmount is a data-loss bug).
  const eligibilityRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  const [form, setForm] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(creating ? blank : () => service ? fromDto(service) : blank());
  const [fieldError, setFieldError] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)({});
  const [imageUrl, setImageUrl] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)('');
  const [addingCategory, setAddingCategory] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [newCategory, setNewCategory] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)('');
  const [active, setActive] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)('details');
  const formRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);

  // Sticky section-nav scroll spy (mirrors StaffWorkspace). Page-level scroll,
  // so the observer roots on the viewport.
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (loading || !formRef.current) {
      return undefined;
    }
    const sections = SECTIONS.map(([id]) => formRef.current.querySelector(`#service-${id}`)).filter(Boolean);
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) setActive(e.target.id.replace('service-', ''));
      });
    }, {
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0
    });
    sections.forEach(s => observer.observe(s));
    return () => observer.disconnect();
  }, [loading]);
  const scrollTo = id => formRef.current?.querySelector(`#service-${id}`)?.scrollIntoView({
    behavior: (0,_lib_ui_jsx__WEBPACK_IMPORTED_MODULE_9__.motionScrollBehavior)(),
    block: 'start'
  });

  // Edit: load a fresh copy so the editor never drifts from the list window.
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (creating || !service?.id) {
      return;
    }
    let live = true;
    _lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.get(`/services/${service.id}`).then(dto => {
      if (live) {
        setForm(fromDto(dto));
        setLoading(false);
      }
    }).catch(() => {
      if (live) {
        setLoading(false);
      }
    });
    return () => {
      live = false;
    };
  }, [creating, service]);

  // Resolve the featured-image thumbnail for display (wp.media attachment).
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!form.image_id || !window.wp?.media) {
      setImageUrl('');
      return;
    }
    const attachment = window.wp.media.attachment(form.image_id);
    attachment.fetch().then(() => setImageUrl(attachment.get('sizes')?.thumbnail?.url || attachment.get('url') || ''));
  }, [form.image_id]);
  const set = key => e => setForm(f => ({
    ...f,
    [key]: e.target.value
  }));
  const pickImage = () => {
    if (!window.wp?.media) {
      showToast('The media library is unavailable on this screen.', 'danger');
      return;
    }
    const frame = window.wp.media({
      title: 'Select featured image',
      button: {
        text: 'Use image'
      },
      multiple: false,
      library: {
        type: 'image'
      }
    });
    frame.on('select', () => {
      const attachment = frame.state().get('selection').first().toJSON();
      setForm(f => ({
        ...f,
        image_id: attachment.id
      }));
      setImageUrl(attachment.sizes?.thumbnail?.url || attachment.url || '');
    });
    frame.open();
  };
  const confirmNewCategory = async () => {
    const name = newCategory.trim();
    if (!name) {
      return;
    }
    try {
      const created = await onCreateCategory(name);
      setForm(f => ({
        ...f,
        category_id: String(created.id)
      }));
      setAddingCategory(false);
      setNewCategory('');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };
  const save = async () => {
    const errors = {};
    if (!form.name.trim()) {
      errors.name = 'A service name is required.';
    }
    const duration = Number(form.duration_minutes);
    if (!duration || duration < 5 || duration > 480 || duration % 5 !== 0) {
      errors.duration_minutes = 'Duration must be 5–480 minutes in steps of 5.';
    }
    // Price ceiling mirrors the server bound (`Args::MAX_PRICE_MINOR`, the `price_minor int
    // unsigned` column). Fail here with the number in the admin's own currency; the server
    // still rejects out-of-range prices on its own and its field error lands on this field.
    const priceMinor = (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_5__.majorToMinor)(form.price);
    if (priceMinor !== null && (priceMinor < 0 || priceMinor > _lib_format_js__WEBPACK_IMPORTED_MODULE_5__.MAX_PRICE_MINOR)) {
      errors.price_minor = (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: 1: lowest allowed price, 2: highest allowed price, both formatted money. */
      (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Price must be between %1$s and %2$s.', 'aponto'), (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_5__.money)(0), (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_5__.money)(_lib_format_js__WEBPACK_IMPORTED_MODULE_5__.MAX_PRICE_MINOR));
    }
    // The booking-policy overrides mirror their own columns the same way (`min_lead_minutes`
    // int unsigned, `max_horizon_days` smallint unsigned) — told here rather than after a
    // round-trip, and the server's field error lands on the same field when it gets there.
    const lead = numOrNull(form.min_lead_minutes);
    if (lead !== null && (!Number.isInteger(lead) || lead < 0 || lead > _lib_format_js__WEBPACK_IMPORTED_MODULE_5__.MAX_LEAD_MINUTES)) {
      errors.min_lead_minutes = (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: %d: the highest allowed lead time in minutes. */
      (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Lead time must be a whole number of minutes between 0 and %d.', 'aponto'), _lib_format_js__WEBPACK_IMPORTED_MODULE_5__.MAX_LEAD_MINUTES);
    }
    const horizon = numOrNull(form.max_horizon_days);
    if (horizon !== null && (!Number.isInteger(horizon) || horizon < 1 || horizon > _lib_format_js__WEBPACK_IMPORTED_MODULE_5__.MAX_HORIZON_DAYS)) {
      errors.max_horizon_days = (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: %d: the highest allowed booking horizon in days. */
      (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Horizon must be a whole number of days between 1 and %d.', 'aponto'), _lib_format_js__WEBPACK_IMPORTED_MODULE_5__.MAX_HORIZON_DAYS);
    }
    if (Object.keys(errors).length) {
      setFieldError(errors);
      return;
    }
    setSaving(true);
    setFieldError({});
    const body = {
      name: form.name.trim(),
      category_id: form.category_id ? Number(form.category_id) : null,
      description: form.description,
      status: form.status,
      image_id: form.image_id ?? null,
      duration_minutes: duration,
      price_minor: priceMinor,
      buffer_before: Number(form.buffer_before) || 0,
      buffer_after: Number(form.buffer_after) || 0,
      slot_step_minutes: numOrNull(form.slot_step_minutes),
      color: form.color ? form.color : null,
      min_lead_minutes: numOrNull(form.min_lead_minutes),
      max_horizon_days: numOrNull(form.max_horizon_days)
    };
    try {
      if (creating) {
        const created = await _lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.post('/services', body);
        // AWAIT the parent reload before closing so the list/quick-view behind the editor
        // is already fresh when it reappears — no stale-price window (r1 item 9; U1 BUG-5).
        await onSaved?.();
        if (multiStaff && created?.id) {
          // Premium: the service exists but has NO eligible staff yet, so closing here
          // would hand back a service that cannot be booked and say nothing. Stay open on
          // the new record and point at the section that fixes it.
          setCreatedId(created.id);
          setSaving(false);
          showToast(`${body.name} created — now choose who can be booked for it.`);
          scrollTo('assignments');
          return;
        }
        showToast(`${body.name} created.`);
        onClose?.();
        return;
      }
      await _lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.patch(`/services/${serviceId}`, body);
      // This page is ONE continuous form: a pending eligibility edit must be written by the
      // page Save too, or it dies on unmount with no request and no error.
      const eligibility = eligibilityRef.current;
      if (eligibility?.dirty) {
        try {
          await eligibility.save();
        } catch (eligibilityError) {
          // Half-save: the service fields landed, the assignments did not. Say so and keep
          // the editor open so the staff selection can be retried.
          showToast((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: %s: the reason the staff assignments could not be saved. */
          (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Service saved, but the staff assignments were not: %s', 'aponto'), eligibilityError.message), 'danger');
          await onSaved?.();
          setSaving(false);
          return;
        }
      }
      showToast('Service saved.');
      await onSaved?.();
      onClose?.();
    } catch (err) {
      const fields = err.data?.fields;
      if (fields) {
        setFieldError(fields);
      }
      showToast(err.message, 'danger');
      setSaving(false);
    }
  };
  const editorHead = strong => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("header", {
    className: "pd-record-editor-head",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("h1", {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("button", {
        type: "button",
        onClick: onClose,
        children: "Services"
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("span", {
        "aria-hidden": "true",
        children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_7__.renderIcon)('chevron')
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("strong", {
        children: strong
      })]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("div", {
      className: "pd-record-editor-actions",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("button", {
        className: "pd-button",
        type: "button",
        onClick: onClose,
        children: "Cancel"
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("button", {
        className: "pd-button primary",
        type: "button",
        disabled: saving || loading,
        onClick: save,
        children: saving ? 'Saving…' : creating ? 'Create service' : 'Save changes'
      })]
    })]
  });
  if (loading) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("div", {
      className: "pd-page pd-record-editor-page pd-service-editor-page",
      children: [editorHead('Loading…'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("p", {
        className: "pd-editor-note",
        children: "Loading service\u2026"
      })]
    });
  }
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("div", {
    className: "pd-page pd-record-editor-page pd-service-editor-page",
    children: [editorHead(creating ? 'New service' : form.name || 'Edit service'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("div", {
      className: "pd-record-editor-layout",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("aside", {
        className: "pd-editor-nav",
        "aria-label": "Service editor sections",
        children: SECTIONS.map(([id, label]) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("button", {
          type: "button",
          className: active === id ? 'is-active' : undefined,
          "aria-current": active === id ? 'true' : undefined,
          onClick: () => scrollTo(id),
          children: label
        }, id))
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("form", {
        className: "pd-record-editor-form",
        ref: formRef,
        autoComplete: "off",
        onSubmit: e => e.preventDefault(),
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("section", {
          id: "service-details",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("header", {
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("h2", {
              children: "Details"
            })
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("div", {
            className: "pd-editor-section-body",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("label", {
              className: `pd-compact-field${fieldError.name ? ' has-error' : ''}`,
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("input", {
                name: "name",
                value: form.name,
                placeholder: " ",
                required: true,
                onChange: set('name')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("span", {
                className: "pd-compact-label",
                children: "Service name"
              })]
            }), fieldError.name ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("p", {
              className: "ap-field-error",
              children: fieldError.name
            }) : null, addingCategory ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("div", {
              className: "ap-inline-create",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("label", {
                className: "pd-compact-field",
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("input", {
                  value: newCategory,
                  placeholder: " ",
                  autoFocus: true,
                  onChange: e => setNewCategory(e.target.value),
                  onKeyDown: e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      confirmNewCategory();
                    }
                  }
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("span", {
                  className: "pd-compact-label",
                  children: "New category name"
                })]
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("button", {
                className: "pd-button primary sm",
                type: "button",
                onClick: confirmNewCategory,
                children: "Add"
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("button", {
                className: "pd-button sm",
                type: "button",
                onClick: () => {
                  setAddingCategory(false);
                  setNewCategory('');
                },
                children: "Cancel"
              })]
            }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("label", {
              className: "pd-compact-field pd-compact-select is-filled",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("select", {
                value: form.category_id,
                onChange: e => {
                  if (e.target.value === '__new') {
                    setAddingCategory(true);
                  } else {
                    setForm(f => ({
                      ...f,
                      category_id: e.target.value
                    }));
                  }
                },
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("option", {
                  value: "",
                  children: "Uncategorized"
                }), categories.map(c => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("option", {
                  value: c.id,
                  children: c.name
                }, c.id)), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("option", {
                  value: "__new",
                  children: "+ New category\u2026"
                })]
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("span", {
                className: "pd-compact-label",
                children: "Category"
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("span", {
                className: "pd-field-end-icon",
                "aria-hidden": "true",
                children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_7__.renderIcon)('chevronDown')
              })]
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("label", {
              className: "pd-compact-field pd-compact-notes",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("textarea", {
                name: "description",
                rows: "3",
                placeholder: " ",
                value: form.description,
                onChange: set('description')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("span", {
                className: "pd-compact-label",
                children: "Description"
              })]
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("div", {
              className: "pd-form-grid",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("label", {
                className: "pd-compact-field pd-compact-select is-filled",
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("select", {
                  value: form.status,
                  onChange: set('status'),
                  children: STATUS_OPTIONS.map(s => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("option", {
                    value: s.value,
                    children: s.label
                  }, s.value))
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("span", {
                  className: "pd-compact-label",
                  children: "Status"
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("span", {
                  className: "pd-field-end-icon",
                  "aria-hidden": "true",
                  children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_7__.renderIcon)('chevronDown')
                })]
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("div", {
                className: "ap-image-field",
                children: [imageUrl ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("img", {
                  src: imageUrl,
                  alt: "",
                  className: "ap-image-thumb"
                }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("span", {
                  className: "ap-image-placeholder",
                  "aria-hidden": "true",
                  children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_7__.renderIcon)('image')
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("div", {
                  className: "ap-image-actions",
                  children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("button", {
                    className: "pd-button sm",
                    type: "button",
                    onClick: pickImage,
                    children: form.image_id ? 'Change image' : 'Set featured image'
                  }), form.image_id ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("button", {
                    className: "pd-button text sm",
                    type: "button",
                    onClick: () => {
                      setForm(f => ({
                        ...f,
                        image_id: null
                      }));
                      setImageUrl('');
                    },
                    children: "Remove"
                  }) : null]
                })]
              })]
            })]
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("section", {
          id: "service-public",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("header", {
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("h2", {
              children: "Public content & media"
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("span", {
              className: "pd-neutral-badge",
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Free — coming soon', 'aponto')
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("div", {
            className: "pd-editor-section-body",
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("p", {
              className: "pd-editor-note",
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Public title, booking visibility, card summary and gallery are part of the Service catalog module — free, and not built yet. They will appear here once it ships; no placeholder controls until then.', 'aponto')
            })
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("section", {
          id: "service-pricing",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("header", {
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("h2", {
              children: "Duration & price"
            })
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("div", {
            className: "pd-editor-section-body pd-form-grid",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("label", {
              className: `pd-compact-field${fieldError.duration_minutes ? ' has-error' : ''}`,
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("input", {
                type: "number",
                min: "5",
                max: "480",
                step: "5",
                value: form.duration_minutes,
                placeholder: " ",
                onChange: set('duration_minutes')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("span", {
                className: "pd-compact-label",
                children: "Duration (minutes)"
              })]
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("label", {
              className: `pd-compact-field${fieldError.price_minor ? ' has-error' : ''}`,
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("input", {
                type: "number",
                min: "0",
                max: (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_5__.maxPriceMajor)(),
                step: "any",
                value: form.price,
                placeholder: " ",
                onChange: set('price')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("span", {
                className: "pd-compact-label",
                children: ["Price (", _lib_config_js__WEBPACK_IMPORTED_MODULE_3__.config.currency, ")"]
              })]
            }), fieldError.duration_minutes ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("p", {
              className: "ap-field-error",
              style: {
                gridColumn: '1 / -1'
              },
              children: fieldError.duration_minutes
            }) : null, fieldError.price_minor ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("p", {
              className: "ap-field-error",
              style: {
                gridColumn: '1 / -1'
              },
              children: fieldError.price_minor
            }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("label", {
              className: "pd-compact-field",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("input", {
                type: "number",
                min: "0",
                max: "120",
                value: form.buffer_before,
                placeholder: " ",
                onChange: set('buffer_before')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("span", {
                className: "pd-compact-label",
                children: "Buffer before (min)"
              })]
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("label", {
              className: "pd-compact-field",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("input", {
                type: "number",
                min: "0",
                max: "120",
                value: form.buffer_after,
                placeholder: " ",
                onChange: set('buffer_after')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("span", {
                className: "pd-compact-label",
                children: "Buffer after (min)"
              })]
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("label", {
              className: "pd-compact-field",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("input", {
                type: "number",
                min: "5",
                max: "480",
                step: "5",
                value: form.slot_step_minutes,
                placeholder: " ",
                onChange: set('slot_step_minutes')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("span", {
                className: "pd-compact-label",
                children: "Slot step (blank = global)"
              })]
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("label", {
              className: "ap-color-field",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("span", {
                className: "ap-color-label",
                children: "Colour"
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("span", {
                className: "ap-color-input",
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("input", {
                  type: "color",
                  value: form.color || '#3858e9',
                  onChange: set('color')
                }), form.color ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("button", {
                  type: "button",
                  className: "pd-button text sm",
                  onClick: () => setForm(f => ({
                    ...f,
                    color: ''
                  })),
                  children: "Clear"
                }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("span", {
                  className: "pd-editor-note",
                  children: "Default"
                })]
              })]
            })]
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)(EligibilitySection, {
          serviceId: serviceId,
          editable: multiStaff,
          saveRef: eligibilityRef,
          showToast: showToast
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("section", {
          id: "service-policy",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("header", {
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("h2", {
              children: "Booking policy"
            })
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("div", {
            className: "pd-editor-section-body pd-form-grid",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("label", {
              className: `pd-compact-field${fieldError.min_lead_minutes ? ' has-error' : ''}`,
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("input", {
                type: "number",
                min: "0",
                max: _lib_format_js__WEBPACK_IMPORTED_MODULE_5__.MAX_LEAD_MINUTES,
                step: "1",
                value: form.min_lead_minutes,
                placeholder: " ",
                onChange: set('min_lead_minutes')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("span", {
                className: "pd-compact-label",
                children: "Min lead time (min \xB7 blank = global)"
              })]
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("label", {
              className: `pd-compact-field${fieldError.max_horizon_days ? ' has-error' : ''}`,
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("input", {
                type: "number",
                min: "1",
                max: _lib_format_js__WEBPACK_IMPORTED_MODULE_5__.MAX_HORIZON_DAYS,
                step: "1",
                value: form.max_horizon_days,
                placeholder: " ",
                onChange: set('max_horizon_days')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("span", {
                className: "pd-compact-label",
                children: "Max horizon (days \xB7 blank = global)"
              })]
            }), fieldError.min_lead_minutes ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("p", {
              className: "ap-field-error",
              style: {
                gridColumn: '1 / -1'
              },
              children: fieldError.min_lead_minutes
            }) : null, fieldError.max_horizon_days ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("p", {
              className: "ap-field-error",
              style: {
                gridColumn: '1 / -1'
              },
              children: fieldError.max_horizon_days
            }) : null]
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("footer", {
          className: "pd-editor-footer",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("button", {
            className: "pd-button",
            type: "button",
            onClick: onClose,
            children: "Cancel"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("button", {
            className: "pd-button primary",
            type: "button",
            disabled: saving,
            onClick: save,
            children: saving ? 'Saving…' : creating ? 'Create service' : 'Save changes'
          })]
        })]
      })]
    })]
  });
}

// --- Staff & locations (eligibility) ----------------------------------------
/**
 * Canonical assignment rows for `PUT /services/{id}/eligibility` (rest-contract §2.18, rev
 * 2026-07-19 per-pair): ascending `(staff_id, location_id)`. `JSON.stringify` of the result is
 * also the section's dirty-check signature, so "what we would send" and "what we compare" can
 * never drift — the same discipline `weeklyRows()` enforces for the schedule PUT.
 *
 * @param {Array} assignments Pairs `{staff_id, location_id}` in any order.
 * @return {Array} Sorted contract rows.
 */
function eligibilityRows(assignments) {
  return [...(assignments || [])].map(pair => ({
    staff_id: Number(pair.staff_id),
    location_id: Number(pair.location_id) || 0
  })).sort((a, b) => a.staff_id - b.staff_id || a.location_id - b.location_id);
}

/**
 * Toggle one staff member's eligibility for the service, preserving per-location detail.
 *
 * Selecting adds the WILDCARD pair `location_id: 0` — "bookable at every location", the value
 * invariant 11 defines as "no location" and the scope `ConnectionRepository::staffForService()`
 * always matches. Deselecting drops EVERY pair for that member, wildcard and per-location alike.
 *
 * Re-selecting a member who already has narrower rows leaves those rows untouched: the wire shape
 * is per-pair precisely so a non-cartesian mapping survives a round-trip, and a UI that cannot
 * express locations must not flatten one it did not create.
 *
 * @param {Array}  assignments Current pairs.
 * @param {number} staffId     Staff id to toggle.
 * @return {Array} Next pairs.
 */
function toggleStaffAssignment(assignments, staffId) {
  const id = Number(staffId);
  const current = assignments || [];
  if (current.some(pair => Number(pair.staff_id) === id)) {
    return current.filter(pair => Number(pair.staff_id) !== id);
  }
  return [...current, {
    staff_id: id,
    location_id: 0
  }];
}

/**
 * Staff ids whose assignment is LOCATION-SCOPED — they have pairs for this service, but none of
 * them is the `location_id: 0` wildcard, so they are eligible only at specific locations.
 *
 * This UI can preserve such rows but cannot author or edit them (`toggleStaffAssignment` only ever
 * writes wildcards), so without surfacing them the checkbox would silently mean two different
 * things for two different rows. Codex review: the section used to claim outright that "everyone
 * selected is available at every location", which is false exactly for these members.
 *
 * @param {Array} assignments Current pairs.
 * @return {Set<number>} Staff ids with no wildcard row.
 */
function locationScopedStaffIds(assignments) {
  const byStaff = new Map();
  (assignments || []).forEach(pair => {
    const id = Number(pair?.staff_id);
    const wildcard = 0 === (Number(pair?.location_id) || 0);
    byStaff.set(id, (byStaff.get(id) ?? false) || wildcard);
  });
  const scoped = new Set();
  byStaff.forEach((hasWildcard, id) => {
    if (!hasWildcard) {
      scoped.add(id);
    }
  });
  return scoped;
}

/**
 * The Staff & locations section.
 *
 * Editable only when `multi_staff` is available (D-R28). Without it the Free plan auto-links its
 * single staff member on create, so there is nothing to choose
 * between — the section shows that linked member read-only rather than a control whose every
 * second option the server would refuse with 403 `aponto_plan_limit`.
 *
 * @param {{serviceId: ?number, editable: boolean, saveRef: Object, showToast: Function}} props Section props.
 */
function EligibilitySection({
  serviceId,
  editable,
  saveRef,
  showToast
}) {
  const [loading, setLoading] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(Boolean(serviceId));
  const [staff, setStaff] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)([]);
  const [assignments, setAssignments] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)([]);
  // Signature of the assignment set the server currently holds — anything else is a pending
  // edit. `null` until a GET succeeds, so a failed load can never look "dirty" and have the page
  // Save replace a real assignment set with an empty one (the WorkHoursSection lesson).
  const [baseline, setBaseline] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [query, setQuery] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)('');
  const [saving, setSaving] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!serviceId) {
      setLoading(false);
      return undefined;
    }
    let live = true;
    setLoading(true);
    Promise.all([_lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.get('/staff', {
      status: 'active',
      per_page: 100
    }).catch(() => ({
      items: []
    })), _lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.get(`/services/${serviceId}/eligibility`)]).then(([staffRes, eligibility]) => {
      if (!live) {
        return;
      }
      const pairs = eligibility.assignments || [];
      setStaff(staffRes.items || []);
      setAssignments(pairs);
      setBaseline(JSON.stringify(eligibilityRows(pairs)));
      setLoading(false);
    }).catch(() => {
      if (live) {
        setLoading(false);
      }
    });
    return () => {
      live = false;
    };
  }, [serviceId]);

  // The one write path. REJECTS on failure so every caller decides how to surface it — the page
  // Save has to be able to say the service saved but the assignments did not.
  const persist = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(async next => {
    const rows = eligibilityRows(next);
    setSaving(true);
    try {
      const res = await _lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.put(`/services/${serviceId}/eligibility`, {
        assignments: rows
      });
      const saved = res.assignments || rows;
      setAssignments(saved);
      setBaseline(JSON.stringify(eligibilityRows(saved)));
    } finally {
      setSaving(false);
    }
  }, [serviceId]);

  // Publish the pending edit to ServiceEditor so the page Save can flush it. Re-registered every
  // render so the closure over `assignments` is never stale.
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!saveRef) {
      return undefined;
    }
    const handle = {
      dirty: null !== baseline && JSON.stringify(eligibilityRows(assignments)) !== baseline,
      save: () => persist(assignments)
    };
    saveRef.current = handle;
    return () => {
      if (saveRef.current === handle) {
        saveRef.current = null;
      }
    };
  });
  const selected = new Set(assignments.map(pair => Number(pair.staff_id)));
  const locationScoped = locationScopedStaffIds(assignments);
  const options = (0,_lib_combobox_options_js__WEBPACK_IMPORTED_MODULE_6__.staffOptions)(staff);
  const visible = (0,_lib_combobox_options_js__WEBPACK_IMPORTED_MODULE_6__.filterOptions)(options, query);
  const dirty = null !== baseline && JSON.stringify(eligibilityRows(assignments)) !== baseline;
  const saveNow = async () => {
    try {
      await persist(assignments);
      showToast('Staff assignments saved.');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // The unbookable warning. Any-staff availability resolves through `aponto_staff_services`, so
  // a service with no eligible staff returns NO slots — it goes invisible on the booking form
  // rather than visibly broken, which is exactly why this has to be stated here. Shown in both
  // modes: an empty set is equally unbookable on Free.
  const empty = !loading && null !== baseline && 0 === assignments.length;
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("section", {
    id: "service-assignments",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("header", {
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("h2", {
        children: "Staff & locations"
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("div", {
      className: "pd-editor-section-body",
      children: !serviceId ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("p", {
        className: "pd-editor-note",
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Create the service first — then choose who can be booked for it.', 'aponto')
      }) : loading ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("p", {
        className: "pd-editor-note",
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Loading…', 'aponto')
      }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.Fragment, {
        children: [empty ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("p", {
          className: "ap-field-error",
          role: "status",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('No staff assigned — this service is not bookable until someone can take it.', 'aponto')
        }) : null, editable ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.Fragment, {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("p", {
            className: "pd-editor-note",
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Choose who can be booked for this service. Anyone you tick here is assigned at every location; staff already limited to specific locations keep that narrower scope, and are marked below.', 'aponto')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("label", {
            className: "pd-compact-field",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("input", {
              type: "search",
              value: query,
              placeholder: " ",
              onChange: e => setQuery(e.target.value)
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("span", {
              className: "pd-compact-label",
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Search staff', 'aponto')
            })]
          }), visible.length ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("ul", {
            className: "ap-eligibility-list",
            children: visible.map(option => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("li", {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("label", {
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("input", {
                  type: "checkbox",
                  checked: selected.has(Number(option.id)),
                  disabled: saving,
                  onChange: () => setAssignments(current => toggleStaffAssignment(current, option.id))
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("span", {
                  className: "ap-eligibility-name",
                  children: option.label
                }), locationScoped.has(Number(option.id)) ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("span", {
                  className: "ap-eligibility-scope",
                  children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Specific locations', 'aponto')
                }) : null, option.meta ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("span", {
                  className: "ap-eligibility-meta pd-ltr",
                  children: option.meta
                }) : null]
              })
            }, option.id))
          }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("p", {
            className: "pd-editor-note",
            children: options.length ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('No staff match that search.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('No active staff yet. Add someone on the Staff screen first.', 'aponto')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("div", {
            className: "ap-hours-save",
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("button", {
              type: "button",
              className: "pd-button primary sm",
              disabled: saving || !dirty,
              onClick: saveNow,
              children: saving ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Saving…', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Save assignments', 'aponto')
            })
          })]
        }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.Fragment, {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("p", {
            className: "pd-editor-note",
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Your staff member takes every service automatically.', 'aponto')
          }), assignments.length ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("ul", {
            className: "ap-eligibility-list is-readonly",
            children: [...selected].map(id => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("li", {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("span", {
                className: "ap-eligibility-name",
                children: options.find(option => Number(option.id) === id)?.label || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: %d: the numeric id of a staff member that could not be resolved to a name. */
                (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Staff #%d', 'aponto'), id)
              })
            }, id))
          }) : null]
        })]
      })
    })]
  });
}

/***/ },

/***/ "./assets/src/admin/routes/ServiceReorder.jsx"
/*!****************************************************!*\
  !*** ./assets/src/admin/routes/ServiceReorder.jsx ***!
  \****************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ServiceReorder: () => (/* binding */ ServiceReorder)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _dnd_kit_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @dnd-kit/core */ "./node_modules/@dnd-kit/core/dist/core.esm.js");
/* harmony import */ var _dnd_kit_sortable__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @dnd-kit/sortable */ "./node_modules/@dnd-kit/sortable/dist/sortable.esm.js");
/* harmony import */ var _dnd_kit_utilities__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @dnd-kit/utilities */ "./node_modules/@dnd-kit/utilities/dist/utilities.esm.js");
/* harmony import */ var _lib_api_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/api.js */ "./assets/src/admin/lib/api.js");
/* harmony import */ var _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../lib/icon.jsx */ "./assets/src/admin/lib/icon.jsx");
/* harmony import */ var _lib_facet_options_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../lib/facet-options.js */ "./assets/src/admin/lib/facet-options.js");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__);
/**
 * Drag-reorder services within one selected category (SPEC-P1 §1.1). Only reachable
 * when exactly one category is filtered; `/services/reorder` is a full-set
 * replacement (rest-contract §2.3), so on save the new intra-category order is
 * spliced back into the global position order and the complete id list is posted.
 * dnd-kit sortable list (accessible: pointer + keyboard).
 *
 * The category arrives as the facet IDENTITY (`id:<id>` — lib/facet-options.js), never as
 * its display name: membership decided by name would splice two same-named categories
 * into one order and post a wrong full-set list.
 */








function SortableRow({
  service
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = (0,_dnd_kit_sortable__WEBPACK_IMPORTED_MODULE_2__.useSortable)({
    id: service.id
  });
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("li", {
    ref: setNodeRef,
    className: `ap-reorder-row${isDragging ? ' is-dragging' : ''}`,
    style: {
      transform: _dnd_kit_utilities__WEBPACK_IMPORTED_MODULE_3__.CSS.Transform.toString(transform),
      transition
    },
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("button", {
      className: "ap-reorder-handle",
      type: "button",
      "aria-label": `Drag ${service.name}`,
      ...attributes,
      ...listeners,
      children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_5__.renderIcon)('moreVertical')
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("span", {
      className: "ap-reorder-name",
      children: service.name
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("span", {
      className: "ap-status-pill is-small",
      children: [service.duration_minutes, " min"]
    })]
  });
}
function ServiceReorder({
  categoryIdentity,
  services,
  onCancel,
  onSaved,
  showToast
}) {
  const byPosition = (a, b) => a.position - b.position || a.id - b.id;
  const inCategory = service => (0,_lib_facet_options_js__WEBPACK_IMPORTED_MODULE_6__.facetIdentity)(service, 'categoryId', 'categoryName') === categoryIdentity;
  const categoryLabel = services.find(inCategory)?.categoryName || '';
  const [order, setOrder] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(() => services.filter(inCategory).sort(byPosition).map(s => s.id));
  const [saving, setSaving] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const sensors = (0,_dnd_kit_core__WEBPACK_IMPORTED_MODULE_1__.useSensors)((0,_dnd_kit_core__WEBPACK_IMPORTED_MODULE_1__.useSensor)(_dnd_kit_core__WEBPACK_IMPORTED_MODULE_1__.PointerSensor, {
    activationConstraint: {
      distance: 5
    }
  }), (0,_dnd_kit_core__WEBPACK_IMPORTED_MODULE_1__.useSensor)(_dnd_kit_core__WEBPACK_IMPORTED_MODULE_1__.KeyboardSensor, {
    coordinateGetter: _dnd_kit_sortable__WEBPACK_IMPORTED_MODULE_2__.sortableKeyboardCoordinates
  }));
  const nameById = Object.fromEntries(services.map(s => [s.id, s]));
  const onDragEnd = ({
    active,
    over
  }) => {
    if (!over || active.id === over.id) {
      return;
    }
    setOrder(ids => (0,_dnd_kit_sortable__WEBPACK_IMPORTED_MODULE_2__.arrayMove)(ids, ids.indexOf(active.id), ids.indexOf(over.id)));
  };
  const save = async () => {
    setSaving(true);
    // Splice the new intra-category order back into the global position order.
    const global = [...services].sort(byPosition);
    let cursor = 0;
    const fullIds = global.map(s => inCategory(s) ? order[cursor++] : s.id);
    try {
      await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.post('/services/reorder', {
        ids: fullIds
      });
      showToast('Service order saved.');
      onSaved?.();
    } catch (err) {
      showToast(err.message, 'danger');
      setSaving(false);
    }
  };
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
    className: "ap-reorder",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
      className: "ap-reorder-head",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("strong", {
          children: ["Reorder \u201C", categoryLabel, "\u201D"]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("span", {
          children: "Drag to set the order customers see."
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
        className: "ap-reorder-actions",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("button", {
          className: "pd-button sm",
          type: "button",
          onClick: onCancel,
          children: "Cancel"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("button", {
          className: "pd-button primary sm",
          type: "button",
          disabled: saving,
          onClick: save,
          children: saving ? 'Saving…' : 'Save order'
        })]
      })]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_dnd_kit_core__WEBPACK_IMPORTED_MODULE_1__.DndContext, {
      sensors: sensors,
      collisionDetection: _dnd_kit_core__WEBPACK_IMPORTED_MODULE_1__.closestCenter,
      onDragEnd: onDragEnd,
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_dnd_kit_sortable__WEBPACK_IMPORTED_MODULE_2__.SortableContext, {
        items: order,
        strategy: _dnd_kit_sortable__WEBPACK_IMPORTED_MODULE_2__.verticalListSortingStrategy,
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("ul", {
          className: "ap-reorder-list",
          children: order.map(id => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(SortableRow, {
            service: nameById[id]
          }, id))
        })
      })
    })]
  });
}

/***/ },

/***/ "./assets/src/admin/routes/Services.jsx"
/*!**********************************************!*\
  !*** ./assets/src/admin/routes/Services.jsx ***!
  \**********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Services: () => (/* binding */ Services)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _tanstack_react_table__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @tanstack/react-table */ "./node_modules/@tanstack/table-core/build/lib/index.mjs");
/* harmony import */ var _pressmaximum_dashboard_kit_table__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @pressmaximum/dashboard-kit/table */ "./node_modules/@pressmaximum/dashboard-kit/build/table/index.mjs");
/* harmony import */ var _dnd_kit_core__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @dnd-kit/core */ "./node_modules/@dnd-kit/core/dist/core.esm.js");
/* harmony import */ var _dnd_kit_sortable__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @dnd-kit/sortable */ "./node_modules/@dnd-kit/sortable/dist/sortable.esm.js");
/* harmony import */ var _dnd_kit_utilities__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @dnd-kit/utilities */ "./node_modules/@dnd-kit/utilities/dist/utilities.esm.js");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_6__);
/* harmony import */ var _lib_api_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../lib/api.js */ "./assets/src/admin/lib/api.js");
/* harmony import */ var _lib_format_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../lib/format.js */ "./assets/src/admin/lib/format.js");
/* harmony import */ var _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../lib/icon.jsx */ "./assets/src/admin/lib/icon.jsx");
/* harmony import */ var _lib_ui_jsx__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../lib/ui.jsx */ "./assets/src/admin/lib/ui.jsx");
/* harmony import */ var _lib_toast_jsx__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../lib/toast.jsx */ "./assets/src/admin/lib/toast.jsx");
/* harmony import */ var _lib_confirm_jsx__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../lib/confirm.jsx */ "./assets/src/admin/lib/confirm.jsx");
/* harmony import */ var _lib_InflowWorkspace_jsx__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../lib/InflowWorkspace.jsx */ "./assets/src/admin/lib/InflowWorkspace.jsx");
/* harmony import */ var _lib_RowMenu_jsx__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ../lib/RowMenu.jsx */ "./assets/src/admin/lib/RowMenu.jsx");
/* harmony import */ var _lib_facets_jsx__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ../lib/facets.jsx */ "./assets/src/admin/lib/facets.jsx");
/* harmony import */ var _ServiceEditor_jsx__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ./ServiceEditor.jsx */ "./assets/src/admin/routes/ServiceEditor.jsx");
/* harmony import */ var _ServiceReorder_jsx__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ./ServiceReorder.jsx */ "./assets/src/admin/routes/ServiceReorder.jsx");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__);
/**
 * Services route (SPEC-P1 §1.1 / mockup §7.4). Flat list + internal section tabs
 * (Services · Categories · Bundles[Premium] · Extras[Premium], the last two
 * reserved with no controls). The Services tab is a PMDKDataTable consumer; the full editor is a
 * separate full-page view (ServiceEditor). Drag reorder is available only when a
 * single category is selected (`POST /services/reorder`, full-set replacement).
 * Categories are a peer table edited through the shared in-flow inspector.
 */



















const TABS = [{
  id: 'services',
  label: 'Services'
}, {
  id: 'categories',
  label: 'Categories'
}, {
  id: 'bundles',
  label: 'Bundles',
  badge: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_6__.__)('Premium', 'aponto')
}, {
  id: 'extras',
  label: 'Extras',
  badge: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_6__.__)('Premium', 'aponto')
}];
const STATUS_OPTIONS = [{
  value: 'active',
  label: 'Active'
}, {
  value: 'draft',
  label: 'Draft'
}, {
  value: 'archived',
  label: 'Archived'
}];
const UNCATEGORIZED = 'Uncategorized';
const WIDTH_KEY = 'aponto.admin.service-inspector-width.v1';
const columnHelper = (0,_tanstack_react_table__WEBPACK_IMPORTED_MODULE_1__.createColumnHelper)();

// The Category facet is keyed by the CATEGORY ID (`categoryId`, 0 = Uncategorized), not
// by the name: two categories may share a name, and a name-keyed facet would filter — and
// reorder — both of them as one. Status is an enum, so its value is its own identity.
const FACETS = [{
  id: 'categoryName',
  label: 'Category',
  type: 'multi',
  idKey: 'categoryId'
}, {
  id: 'status',
  label: 'Status',
  type: 'multi',
  options: STATUS_OPTIONS
}];
const CATEGORY_FACET_FILTER = (0,_lib_facets_jsx__WEBPACK_IMPORTED_MODULE_15__.recordFacetFilter)('categoryId', 'categoryName');
function Services({
  segments = [],
  onNavigate
}) {
  const showToast = (0,_lib_toast_jsx__WEBPACK_IMPORTED_MODULE_11__.useToast)();
  const {
    confirm,
    dialog
  } = (0,_lib_confirm_jsx__WEBPACK_IMPORTED_MODULE_12__.useConfirmDialog)();
  const initialTab = TABS.some(t => t.id === segments[1]) ? segments[1] : 'services';
  const [tab, setTab] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(initialTab);
  const [state, setState] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)({
    status: 'loading',
    services: [],
    categories: [],
    error: null
  });
  const [staffCount, setStaffCount] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [editor, setEditor] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null); // { mode, service }
  const [inspector, setInspector] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null); // { type:'quickview'|'category', ... }
  const [reorder, setReorder] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);

  // Returns the reload promise so callers can AWAIT the fresh list before closing an editor —
  // the quick-view panel derives from this state and must never show a stale price after a save
  // (r1 review item 9; finding U1 BUG-5).
  const load = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
    setState(s => ({
      ...s,
      status: s.services.length || s.categories.length ? s.status : 'loading',
      error: null
    }));
    // Staff readiness (skip-path guidance): a service with no staff anywhere in the account
    // can't be booked. Fetched separately from the list so a /staff hiccup never blocks the
    // services table; null means "unknown", so the note stays hidden.
    _lib_api_js__WEBPACK_IMPORTED_MODULE_7__.api.get('/staff', {
      status: 'all',
      per_page: 1
    }).then(res => setStaffCount(Number(res.total) || 0)).catch(() => setStaffCount(null));
    return Promise.all([_lib_api_js__WEBPACK_IMPORTED_MODULE_7__.api.get('/services', {
      status: 'all',
      per_page: 100
    }), _lib_api_js__WEBPACK_IMPORTED_MODULE_7__.api.get('/service-categories')]).then(([svc, cat]) => {
      const categories = cat.items || [];
      const catName = Object.fromEntries(categories.map(c => [c.id, c.name]));
      const services = (svc.items || []).map(dto => ({
        ...dto,
        // Facet identity for the Category axis (0 = Uncategorized); the name is display-only.
        categoryId: Number(dto.category_id) || 0,
        categoryName: dto.category_id ? catName[dto.category_id] || UNCATEGORIZED : UNCATEGORIZED,
        staffCount: Number(dto.staff_count) || 0,
        // C1: Delete is offered only when this is 0 (otherwise Archive is the safe default).
        bookingCount: Number(dto.booking_count) || 0
      }));
      setState({
        status: 'ready',
        services,
        categories,
        error: null
      });
    }).catch(err => setState({
      status: 'error',
      services: [],
      categories: [],
      error: err.message
    }));
  }, []);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    load();
  }, [load]);

  // `#services/<id>` opens that service's editor, exactly as `#staff/<id>` opens a staff
  // workspace (routes/Staff.jsx): the hash SEEDS the surface, it does not own it. Tab ids are
  // never numeric, so the two segment shapes cannot collide. Added with D-R28 so the staff
  // workspace's assigned-services list can link somewhere real.
  //
  // Applied ONCE per requested id and only after the list has loaded (the editor needs the row
  // DTO). Never closes anything: an id that no longer exists — or an editor the admin closed by
  // hand — leaves the list on screen instead of fighting it.
  const deepLinkId = /^\d+$/.test(String(segments[1] || '')) ? String(segments[1]) : '';
  const openedDeepLink = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)('');
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if ('' === deepLinkId || openedDeepLink.current === deepLinkId || 'loading' === state.status) {
      return;
    }
    openedDeepLink.current = deepLinkId;
    const service = state.services.find(item => String(item.id) === deepLinkId);
    if (service) {
      setEditor({
        mode: 'edit',
        service
      });
    }
  }, [deepLinkId, state.status, state.services]);
  const createCategory = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(async name => {
    const created = await _lib_api_js__WEBPACK_IMPORTED_MODULE_7__.api.post('/service-categories', {
      name
    });
    setState(s => ({
      ...s,
      categories: [...s.categories, created]
    }));
    return created;
  }, []);
  const closeInspector = () => setInspector(null);

  // C1 archive-first (spec §1.1 addendum 2026-07-20; U2 data-loss scare): Archive is a safe,
  // reversible status change — NEVER a delete. It keeps the service for history and hides it from
  // new bookings.
  const onArchive = async service => {
    const ok = await confirm({
      title: `Archive “${service.name}”?`,
      message: 'It’s kept for history and hidden from new bookings. You can restore it any time.',
      confirmText: 'Archive',
      destructive: true
    });
    if (!ok) {
      return;
    }
    try {
      await _lib_api_js__WEBPACK_IMPORTED_MODULE_7__.api.patch(`/services/${service.id}`, {
        status: 'archived'
      });
      showToast(`${service.name} archived.`);
      await load();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // Restore an archived service back to active (reversible, no confirm needed).
  const onRestore = async service => {
    try {
      await _lib_api_js__WEBPACK_IMPORTED_MODULE_7__.api.patch(`/services/${service.id}`, {
        status: 'active'
      });
      showToast(`${service.name} restored.`);
      await load();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // Permanent delete — the row action is offered ONLY on a service with zero bookings (C1). The
  // 409 fallback covers the rare race where a booking lands between the list render and the
  // delete: archive instead so history is never lost.
  const onDelete = async service => {
    const ok = await confirm({
      title: `Delete “${service.name}” permanently?`,
      message: 'This can’t be undone — the service and its settings are removed for good. (Only possible because it has no bookings.)',
      confirmText: 'Delete permanently',
      destructive: true
    });
    if (!ok) {
      return;
    }
    try {
      await _lib_api_js__WEBPACK_IMPORTED_MODULE_7__.api.del(`/services/${service.id}`);
      showToast(`${service.name} deleted permanently.`);
      await load();
    } catch (err) {
      if (err.code === 'aponto_has_dependents') {
        try {
          await _lib_api_js__WEBPACK_IMPORTED_MODULE_7__.api.patch(`/services/${service.id}`, {
            status: 'archived'
          });
          showToast(`${service.name} just picked up a booking — archived instead of deleted.`);
          await load();
        } catch (e2) {
          showToast(e2.message, 'danger');
        }
      } else {
        showToast(err.message, 'danger');
      }
    }
  };
  const onDuplicate = async service => {
    try {
      const copy = await _lib_api_js__WEBPACK_IMPORTED_MODULE_7__.api.post(`/services/${service.id}/duplicate`);
      showToast(`Duplicated “${copy.name}” as draft — activate when ready.`);
      await load();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // ---- Full-page editor takes over the whole route ----------------------
  if (editor) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)(_ServiceEditor_jsx__WEBPACK_IMPORTED_MODULE_16__.ServiceEditor, {
      mode: editor.mode,
      service: editor.service,
      categories: state.categories,
      onCreateCategory: createCategory,
      onClose: () => setEditor(null),
      onSaved: load
    }, `${editor.mode}-${editor.service?.id || 'new'}`);
  }
  const tabStrip = /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("div", {
    className: "pmdk-section-tabs",
    role: "tablist",
    "aria-label": "Service views",
    children: TABS.map(t => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("button", {
      type: "button",
      role: "tab",
      "aria-selected": tab === t.id ? 'true' : 'false',
      onClick: () => {
        setTab(t.id);
        setReorder(false);
      },
      children: [t.label, t.badge ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("small", {
        className: "pd-nav-phase is-later",
        children: t.badge
      }) : null]
    }, t.id))
  });
  let panel;
  if (tab === 'categories') {
    panel = /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)(CategoriesPanel, {
      state: state,
      confirm: confirm,
      onReload: load,
      showToast: showToast
    });
  } else if (tab === 'bundles' || tab === 'extras') {
    panel = /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("div", {
      className: "ap-reserved-tab",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("span", {
        className: "ap-state-icon",
        "aria-hidden": "true",
        children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_9__.renderIcon)(tab === 'bundles' ? 'box' : 'tag')
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("h2", {
        children: tab === 'bundles' ? 'Bundles' : 'Extras'
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("p", {
        children: [tab === 'bundles' ? 'Sell packages of multiple services together.' : 'Add-ons customers can attach to a booking.', " ", (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_6__.__)('Ships with a later Premium module — there is nothing to set up here yet.', 'aponto')]
      })]
    });
  } else {
    panel = /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)(ServicesPanel, {
      state: state,
      reorder: reorder,
      setReorder: setReorder,
      onNew: () => setEditor({
        mode: 'create'
      }),
      onEdit: service => setEditor({
        mode: 'edit',
        service
      }),
      onQuickView: service => setInspector({
        type: 'quickview',
        serviceId: service.id,
        service
      }),
      onDuplicate: onDuplicate,
      onArchive: onArchive,
      onRestore: onRestore,
      onDelete: onDelete,
      onReload: load,
      showToast: showToast
    });
  }

  // Resolve the quick-view service from the LIVE list by id so an edit-then-save reflects the
  // fresh price immediately instead of a stale open-time snapshot (fleet-r1 Fix 9f; finding U1
  // BUG-5). Falls back to the snapshot only if the row is gone (e.g. just deleted).
  const quickViewService = inspector && inspector.type === 'quickview' ? state.services.find(s => s.id === inspector.serviceId) || inspector.service : null;
  const inspectorNode = inspector ? inspector.type === 'quickview' ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)(ServiceQuickView, {
    service: quickViewService,
    categories: state.categories,
    onEdit: () => {
      setEditor({
        mode: 'edit',
        service: quickViewService
      });
      closeInspector();
    },
    onClose: closeInspector
  }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)(CategoryForm, {
    mode: inspector.mode,
    category: inspector.category,
    onClose: closeInspector,
    onSaved: load,
    showToast: showToast
  }) : null;
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)(_lib_InflowWorkspace_jsx__WEBPACK_IMPORTED_MODULE_13__.InflowWorkspace, {
    widthKey: WIDTH_KEY,
    open: Boolean(inspector),
    label: "Service inspector",
    inspectorLabelledBy: "serviceInspectorTitle",
    inspector: inspectorNode,
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)(_lib_ui_jsx__WEBPACK_IMPORTED_MODULE_10__.PageHeader, {
      title: "Services",
      actions: tab === 'services' ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("button", {
        className: "pmdk-button primary sm",
        type: "button",
        onClick: () => setEditor({
          mode: 'create'
        }),
        children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_9__.renderIcon)('plus'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("span", {
          children: "New service"
        })]
      }) : tab === 'categories' ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("button", {
        className: "pmdk-button primary sm",
        type: "button",
        onClick: () => setInspector({
          type: 'category',
          mode: 'create'
        }),
        children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_9__.renderIcon)('plus'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("span", {
          children: "New category"
        })]
      }) : null
    }), tabStrip, tab === 'services' && staffCount === 0 && state.services.length > 0 ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("p", {
      className: "ap-list-note ap-staff-gap-note",
      role: "status",
      children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_9__.renderIcon)('alert'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("span", {
        className: "ap-staff-gap-text",
        children: "Services can\u2019t be booked until you add a staff member."
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("button", {
        className: "pd-button text sm",
        type: "button",
        onClick: () => onNavigate?.('staff'),
        children: "Add staff"
      })]
    }) : null, panel, dialog]
  });
}

// --- Services tab -----------------------------------------------------------
function ServicesPanel({
  state,
  reorder,
  setReorder,
  onNew,
  onEdit,
  onQuickView,
  onDuplicate,
  onArchive,
  onRestore,
  onDelete,
  onReload,
  showToast
}) {
  const [activeCategory, setActiveCategory] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const columns = (0,react__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => [columnHelper.accessor('name', {
    header: 'Service',
    size: 220,
    enableHiding: false,
    meta: {
      label: 'Service'
    },
    cell: info => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("span", {
      className: "ap-cell-identity",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("span", {
        className: "ap-color-dot",
        style: {
          background: info.row.original.color || 'var(--ap-color-border-strong)'
        },
        "aria-hidden": "true"
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("span", {
        className: "pmdk-cell-value pmdk-cell-strong",
        children: info.getValue()
      })]
    })
  }), columnHelper.accessor('categoryName', {
    id: 'categoryName',
    header: 'Category',
    size: 150,
    meta: {
      label: 'Category'
    },
    filterFn: CATEGORY_FACET_FILTER,
    cell: info => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("span", {
      className: "pmdk-cell-value pmdk-cell-muted",
      children: info.getValue()
    })
  }), columnHelper.accessor('duration_minutes', {
    id: 'duration',
    header: 'Duration',
    size: 110,
    meta: {
      label: 'Duration',
      numeric: true
    },
    cell: info => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("span", {
      className: "pmdk-cell-value pmdk-cell-numeric",
      children: [info.getValue(), " min"]
    })
  }), columnHelper.accessor('price_minor', {
    id: 'price',
    header: 'Price',
    size: 110,
    meta: {
      label: 'Price',
      numeric: true
    },
    cell: info => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("span", {
      className: "pmdk-cell-value pmdk-cell-numeric",
      children: info.getValue() === null || info.getValue() === undefined ? '—' : (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_8__.money)(info.getValue())
    })
  }), columnHelper.accessor('staffCount', {
    id: 'staff',
    header: 'Staff',
    size: 90,
    enableSorting: false,
    meta: {
      label: 'Staff'
    },
    cell: info => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("span", {
      className: "pmdk-cell-value pmdk-cell-muted",
      children: [info.getValue(), " staff"]
    })
  }), columnHelper.accessor('status', {
    id: 'status',
    header: 'Status',
    size: 110,
    meta: {
      label: 'Status'
    },
    filterFn: _lib_facets_jsx__WEBPACK_IMPORTED_MODULE_15__.inArrayFilter,
    cell: info => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("span", {
      className: `ap-status-pill is-${info.getValue()}`,
      children: info.getValue()
    })
  }), columnHelper.display({
    id: 'action',
    size: 60,
    enableHiding: false,
    enableSorting: false,
    header: 'Action',
    cell: info => {
      const svc = info.row.original;
      const items = [{
        action: 'edit',
        label: 'Edit service',
        icon: 'note'
      }, {
        action: 'duplicate',
        label: 'Duplicate as draft',
        icon: 'files'
      }];
      // Archive (reversible) is the default for a live service; an archived one offers
      // Restore instead. Delete (permanent) appears ONLY when the service has zero
      // bookings — otherwise history would be lost (C1).
      if (svc.status === 'archived') {
        items.push({
          action: 'restore',
          label: 'Restore service',
          icon: 'arrows',
          separatorBefore: true
        });
      } else {
        items.push({
          action: 'archive',
          label: 'Archive service',
          icon: 'prohibit',
          danger: true,
          separatorBefore: true
        });
      }
      if (!svc.bookingCount) {
        items.push({
          action: 'delete',
          label: 'Delete permanently',
          icon: 'trash',
          danger: true
        });
      }
      return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)(_lib_RowMenu_jsx__WEBPACK_IMPORTED_MODULE_14__.RowMenu, {
        label: `Actions for ${svc.name}`,
        renderIcon: _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_9__.renderIcon,
        items: items,
        onSelect: action => {
          if (action === 'edit') onEdit(svc);else if (action === 'duplicate') onDuplicate(svc);else if (action === 'archive') onArchive(svc);else if (action === 'restore') onRestore(svc);else if (action === 'delete') onDelete(svc);
        }
      });
    }
  })], [onEdit, onDuplicate, onArchive, onRestore, onDelete]);

  // The reorder affordance is only meaningful for a single selected category. The facet
  // value is the category IDENTITY (`id:<id>`), so reorder is scoped to that one record
  // even when another category shares its name.
  const onFiltersChanged = filters => {
    const cat = (filters || []).find(f => f.id === 'categoryName');
    const values = Array.isArray(cat?.value) ? cat.value : [];
    const only = values.length === 1 ? values[0] : null;
    setActiveCategory(only);
    if (!only && reorder) {
      setReorder(false);
    }
  };
  if (reorder && activeCategory) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("section", {
      className: "pd-data-list pmdk-data-list",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)(_ServiceReorder_jsx__WEBPACK_IMPORTED_MODULE_17__.ServiceReorder, {
        categoryIdentity: activeCategory,
        services: state.services,
        onCancel: () => setReorder(false),
        onSaved: () => {
          setReorder(false);
          onReload();
        },
        showToast: showToast
      })
    });
  }
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("section", {
    className: "pd-data-list pmdk-data-list",
    "aria-label": "Services list",
    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)(_pressmaximum_dashboard_kit_table__WEBPACK_IMPORTED_MODULE_2__.PMDKDataTable, {
      columns: columns,
      data: state.services,
      getRowId: row => String(row.id),
      status: state.status === 'ready' && !state.services.length ? 'empty' : state.status,
      states: {
        empty: {
          icon: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_9__.renderIcon)('tag'),
          title: 'No services yet',
          description: 'Create the services customers can book.',
          action: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("button", {
            className: "pmdk-button primary sm",
            type: "button",
            onClick: onNew,
            children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_9__.renderIcon)('plus'), "New service"]
          })
        },
        error: {
          title: 'Could not load services',
          description: state.error || '',
          action: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("button", {
            className: "pmdk-button sm",
            type: "button",
            onClick: onReload,
            children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_9__.renderIcon)('arrows'), "Retry"]
          })
        }
      },
      enableRowSelection: false,
      onColumnFiltersChange: onFiltersChanged,
      filterBuilder: ({
        table
      }) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)(_lib_facets_jsx__WEBPACK_IMPORTED_MODULE_15__.Facets, {
        table: table,
        defs: FACETS,
        renderIcon: _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_9__.renderIcon
      }),
      activeFilters: ({
        table
      }) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)(_lib_facets_jsx__WEBPACK_IMPORTED_MODULE_15__.FacetChips, {
        table: table,
        defs: FACETS,
        renderIcon: _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_9__.renderIcon
      }),
      filterCount: ({
        table
      }) => (0,_lib_facets_jsx__WEBPACK_IMPORTED_MODULE_15__.facetCount)(table, FACETS),
      toolbarControls: activeCategory ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("button", {
        className: "pmdk-toolbar-control",
        type: "button",
        onClick: () => setReorder(true),
        children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_9__.renderIcon)('list'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("span", {
          children: "Reorder"
        })]
      }) : null,
      onRowActivate: row => onQuickView(row),
      getRowAriaLabel: row => `Quick view ${row.name}`,
      renderIcon: _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_9__.renderIcon,
      itemsLabel: "services",
      labels: {
        searchPlaceholder: 'Search services…',
        searchAria: 'Search services'
      },
      persistenceKey: "aponto.admin.services.table.v1"
    })
  });
}

// --- Categories tab (C2: inline rename + drag-reorder) ----------------------
function CategoriesPanel({
  state,
  confirm,
  onReload,
  showToast
}) {
  // Local drag order (ids), synced from the server list which is already position-sorted
  // (GET /service-categories → ORDER BY position). Optimistic on drop; reverted if the reorder
  // POST fails. The public booking form reads the same position order, so a drag here changes the
  // order customers see (C2).
  const [order, setOrder] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(() => state.categories.map(c => c.id));
  const [savingOrder, setSavingOrder] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [editingId, setEditingId] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const byId = (0,react__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => Object.fromEntries(state.categories.map(c => [c.id, c])), [state.categories]);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    setOrder(state.categories.map(c => c.id));
  }, [state.categories]);
  const sensors = (0,_dnd_kit_core__WEBPACK_IMPORTED_MODULE_3__.useSensors)((0,_dnd_kit_core__WEBPACK_IMPORTED_MODULE_3__.useSensor)(_dnd_kit_core__WEBPACK_IMPORTED_MODULE_3__.PointerSensor, {
    activationConstraint: {
      distance: 5
    }
  }), (0,_dnd_kit_core__WEBPACK_IMPORTED_MODULE_3__.useSensor)(_dnd_kit_core__WEBPACK_IMPORTED_MODULE_3__.KeyboardSensor, {
    coordinateGetter: _dnd_kit_sortable__WEBPACK_IMPORTED_MODULE_4__.sortableKeyboardCoordinates
  }));
  const rename = async (category, name) => {
    const next = (name || '').trim();
    setEditingId(null);
    if (!next || next === category.name) {
      return;
    }
    try {
      await _lib_api_js__WEBPACK_IMPORTED_MODULE_7__.api.patch(`/service-categories/${category.id}`, {
        name: next
      });
      showToast('Category renamed.');
      onReload();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };
  const removeCategory = async category => {
    const ok = await confirm({
      title: `Delete “${category.name}”?`,
      message: 'Its services move to Uncategorized. This can’t be undone.',
      confirmText: 'Delete',
      destructive: true
    });
    if (!ok) {
      return;
    }
    try {
      const res = await _lib_api_js__WEBPACK_IMPORTED_MODULE_7__.api.del(`/service-categories/${category.id}`);
      showToast(`Category deleted — ${res.services_uncategorized || 0} service${res.services_uncategorized === 1 ? '' : 's'} moved to Uncategorized.`);
      onReload();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };
  const onDragEnd = async ({
    active,
    over
  }) => {
    if (!over || active.id === over.id) {
      return;
    }
    const next = (0,_dnd_kit_sortable__WEBPACK_IMPORTED_MODULE_4__.arrayMove)(order, order.indexOf(active.id), order.indexOf(over.id));
    setOrder(next);
    setSavingOrder(true);
    try {
      // Full-set replacement (rest-contract §2.4).
      await _lib_api_js__WEBPACK_IMPORTED_MODULE_7__.api.post('/service-categories/reorder', {
        ids: next
      });
      showToast('Category order saved.');
      onReload();
    } catch (err) {
      setOrder(state.categories.map(c => c.id));
      showToast(err.message, 'danger');
    } finally {
      setSavingOrder(false);
    }
  };
  if (state.status === 'loading') {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("p", {
      className: "pd-editor-note",
      style: {
        padding: '16px 4px'
      },
      children: "Loading categories\u2026"
    });
  }
  if (!state.categories.length) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("div", {
      className: "ap-reserved-tab",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("span", {
        className: "ap-state-icon",
        "aria-hidden": "true",
        children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_9__.renderIcon)('tag')
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("h2", {
        children: "No categories yet"
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("p", {
        children: "Group related services under a category. Services without one show as \u201CUncategorized\u201D."
      })]
    });
  }
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("section", {
    className: "pd-data-list pmdk-data-list ap-simple-table ap-cat-table",
    "aria-label": "Categories",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("p", {
      className: "ap-list-note",
      role: "note",
      children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_9__.renderIcon)('list'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("span", {
        children: "Drag to set the order customers see. Click a name to rename it."
      })]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("div", {
      className: "pmdk-table-wrap",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)(_dnd_kit_core__WEBPACK_IMPORTED_MODULE_3__.DndContext, {
        sensors: sensors,
        collisionDetection: _dnd_kit_core__WEBPACK_IMPORTED_MODULE_3__.closestCenter,
        onDragEnd: onDragEnd,
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)(_dnd_kit_sortable__WEBPACK_IMPORTED_MODULE_4__.SortableContext, {
          items: order,
          strategy: _dnd_kit_sortable__WEBPACK_IMPORTED_MODULE_4__.verticalListSortingStrategy,
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("table", {
            className: "pmdk-table",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("thead", {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("tr", {
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("th", {
                  scope: "col",
                  className: "ap-cat-drag-col",
                  children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("span", {
                    className: "screen-reader-text",
                    children: "Reorder"
                  })
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("th", {
                  scope: "col",
                  children: "Name"
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("th", {
                  scope: "col",
                  className: "pmdk-amount",
                  children: "Services"
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("th", {
                  scope: "col",
                  className: "pmdk-col-action",
                  children: "Action"
                })]
              })
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("tbody", {
              children: order.map(id => byId[id] ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)(SortableCategoryRow, {
                category: byId[id],
                editing: editingId === id,
                busy: savingOrder,
                onStartRename: () => setEditingId(id),
                onRename: name => rename(byId[id], name),
                onCancelRename: () => setEditingId(null),
                onDelete: () => removeCategory(byId[id])
              }, id) : null)
            })]
          })
        })
      })
    })]
  });
}

// One draggable, inline-renameable category row (C2).
function SortableCategoryRow({
  category,
  editing,
  busy,
  onStartRename,
  onRename,
  onCancelRename,
  onDelete
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = (0,_dnd_kit_sortable__WEBPACK_IMPORTED_MODULE_4__.useSortable)({
    id: category.id
  });
  const [draft, setDraft] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(category.name);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    setDraft(category.name);
  }, [category.name, editing]);
  const style = {
    transform: _dnd_kit_utilities__WEBPACK_IMPORTED_MODULE_5__.CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined
  };
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("tr", {
    ref: setNodeRef,
    style: style,
    className: isDragging ? 'is-dragging' : undefined,
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("td", {
      className: "ap-cat-drag",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("button", {
        type: "button",
        className: "ap-reorder-handle",
        "aria-label": `Reorder ${category.name}`,
        disabled: busy,
        ...attributes,
        ...listeners,
        children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_9__.renderIcon)('moreVertical')
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("td", {
      children: editing ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("input", {
        className: "ap-cat-rename-input",
        value: draft
        // eslint-disable-next-line jsx-a11y/no-autofocus
        ,
        autoFocus: true,
        "aria-label": `Rename ${category.name}`,
        onChange: e => setDraft(e.target.value),
        onBlur: () => onRename(draft),
        onKeyDown: e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onRename(draft);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancelRename();
          }
        }
      }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("button", {
        type: "button",
        className: "ap-cat-name",
        onClick: onStartRename,
        title: "Click to rename",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("span", {
          className: "pmdk-cell-value pmdk-cell-strong",
          children: category.name
        })
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("td", {
      className: "pmdk-amount",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("span", {
        className: "pmdk-cell-value pmdk-cell-numeric",
        children: category.count ?? 0
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("td", {
      className: "pmdk-col-action",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)(_lib_RowMenu_jsx__WEBPACK_IMPORTED_MODULE_14__.RowMenu, {
        label: `Actions for ${category.name}`,
        renderIcon: _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_9__.renderIcon,
        items: [{
          action: 'rename',
          label: 'Rename category',
          icon: 'note'
        }, {
          action: 'delete',
          label: 'Delete category',
          icon: 'trash',
          danger: true,
          separatorBefore: true
        }],
        onSelect: action => {
          if (action === 'rename') onStartRename();else if (action === 'delete') onDelete();
        }
      })
    })]
  });
}

// --- Quick view (read-only) -------------------------------------------------
function ServiceQuickView({
  service,
  categories,
  onEdit,
  onClose
}) {
  const category = service.category_id ? categories.find(c => c.id === service.category_id)?.name || UNCATEGORIZED : UNCATEGORIZED;
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.Fragment, {
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("header", {
      className: "pd-booking-inspector-head pd-booking-editor-head",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("div", {
        className: "pd-booking-inspector-identity",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("h2", {
          id: "serviceInspectorTitle",
          children: service.name
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("button", {
        className: "pd-icon-button",
        type: "button",
        "aria-label": "Close service quick view",
        onClick: onClose,
        children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_9__.renderIcon)('close')
      })]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("div", {
      className: "pd-booking-inspector-body",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("section", {
        className: "pd-editor-section",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("div", {
          className: "pd-editor-section-head",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("h3", {
            children: "Overview"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("span", {
            className: `ap-status-pill is-${service.status}`,
            children: service.status
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("div", {
          className: "pd-editor-readonly",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("span", {
            className: "pd-editor-readonly-label",
            children: "Category"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("strong", {
            children: category
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("div", {
          className: "pd-editor-readonly",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("span", {
            className: "pd-editor-readonly-label",
            children: "Duration"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("strong", {
            children: [service.duration_minutes, " min"]
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("div", {
          className: "pd-editor-readonly",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("span", {
            className: "pd-editor-readonly-label",
            children: "Price"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("strong", {
            children: service.price_minor === null || service.price_minor === undefined ? '—' : (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_8__.money)(service.price_minor)
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("div", {
          className: "pd-editor-readonly",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("span", {
            className: "pd-editor-readonly-label",
            children: "Eligible staff"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("strong", {
            children: [service.staffCount, " staff"]
          })]
        })]
      }), service.description ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("section", {
        className: "pd-editor-section",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("div", {
          className: "pd-editor-section-head",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("h3", {
            children: "Description"
          })
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("p", {
          className: "ap-inspector-note",
          children: service.description
        })]
      }) : null]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("footer", {
      className: "pd-drawer-foot pd-booking-inspector-foot",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("div", {
        className: "pd-inspector-foot-actions",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("button", {
          className: "pd-button primary sm",
          type: "button",
          onClick: onEdit,
          children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_9__.renderIcon)('note'), "Edit service"]
        })
      })
    })]
  });
}

// --- Category create/rename (in-flow inspector, form mode) ------------------
function CategoryForm({
  mode,
  category,
  onClose,
  onSaved,
  showToast
}) {
  const [name, setName] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(category?.name || '');
  const [saving, setSaving] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const creating = mode === 'create';
  const save = async () => {
    if (!name.trim()) {
      return;
    }
    setSaving(true);
    try {
      if (creating) {
        await _lib_api_js__WEBPACK_IMPORTED_MODULE_7__.api.post('/service-categories', {
          name: name.trim()
        });
        showToast('Category created.');
      } else {
        await _lib_api_js__WEBPACK_IMPORTED_MODULE_7__.api.patch(`/service-categories/${category.id}`, {
          name: name.trim()
        });
        showToast('Category renamed.');
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      showToast(err.message, 'danger');
      setSaving(false);
    }
  };
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.Fragment, {
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("header", {
      className: "pd-booking-inspector-head pd-booking-editor-head",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("div", {
        className: "pd-booking-inspector-identity",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("h2", {
          id: "serviceInspectorTitle",
          children: creating ? 'New category' : 'Rename category'
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("button", {
        className: "pd-icon-button",
        type: "button",
        "aria-label": "Close category form",
        onClick: onClose,
        children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_9__.renderIcon)('close')
      })]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("form", {
      className: "pd-booking-inspector-body pd-compact-editor",
      onSubmit: e => {
        e.preventDefault();
        save();
      },
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("section", {
        className: "pd-editor-section",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("div", {
          className: "pd-editor-section-head",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("h3", {
            children: "Category"
          })
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("label", {
          className: "pd-compact-field",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("input", {
            value: name,
            placeholder: " ",
            autoFocus: true,
            required: true,
            onChange: e => setName(e.target.value)
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("span", {
            className: "pd-compact-label",
            children: "Name"
          })]
        })]
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("footer", {
      className: "pd-drawer-foot pd-booking-inspector-foot",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsxs)("div", {
        className: "pd-inspector-foot-actions",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("button", {
          className: "pd-button sm",
          type: "button",
          onClick: onClose,
          children: "Cancel"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_18__.jsx)("button", {
          className: "pd-button primary sm",
          type: "button",
          disabled: saving,
          onClick: save,
          children: saving ? 'Saving…' : creating ? 'Create' : 'Save'
        })]
      })
    })]
  });
}

/***/ }

}]);
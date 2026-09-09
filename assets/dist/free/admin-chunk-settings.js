"use strict";
(globalThis["webpackChunkaponto"] = globalThis["webpackChunkaponto"] || []).push([["admin-chunk-settings"],{

/***/ "./assets/src/admin/lib/WeeklyHoursGrid.jsx"
/*!**************************************************!*\
  !*** ./assets/src/admin/lib/WeeklyHoursGrid.jsx ***!
  \**************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   TimeSelect: () => (/* binding */ TimeSelect),
/* harmony export */   WEEKDAYS: () => (/* binding */ WEEKDAYS),
/* harmony export */   WeeklyHoursGrid: () => (/* binding */ WeeklyHoursGrid),
/* harmony export */   formatMinutes: () => (/* binding */ formatMinutes),
/* harmony export */   minLabel: () => (/* binding */ minLabel),
/* harmony export */   minToTime: () => (/* binding */ minToTime),
/* harmony export */   sortWeekly: () => (/* binding */ sortWeekly),
/* harmony export */   timeToMin: () => (/* binding */ timeToMin),
/* harmony export */   uses12h: () => (/* binding */ uses12h),
/* harmony export */   validateWeekly: () => (/* binding */ validateWeekly)
/* harmony export */ });
/* harmony import */ var _icon_jsx__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./icon.jsx */ "./assets/src/admin/lib/icon.jsx");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__);
/**
 * Weekly opening-hours editor grid (SPEC-P1 §1.3), shared by the business-hours
 * panel (Settings → General) and the per-staff "Customize" work-hours editor
 * (StaffWorkspace). One weekday per row: an Open/Closed toggle plus one or more
 * time periods (`type=time`, 5-minute step). A day with `periods: []` is an
 * explicit CLOSED marker (contract §2.6); the row stays in the payload.
 *
 * State shape: `weekly` is a map `{ [isoWeekday 1..7]: [{ start, end }] }` in
 * MINUTES from midnight. The component is controlled — every edit calls
 * `onChange( nextWeekly )`.
 */


const WEEKDAYS = [[1, 'Monday'], [2, 'Tuesday'], [3, 'Wednesday'], [4, 'Thursday'], [5, 'Friday'], [6, 'Saturday'], [7, 'Sunday']];
const pad = n => String(n).padStart(2, '0');

/** Minutes-from-midnight → `HH:MM` (24h) for a `type=time` input. */
const minToTime = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

/** `HH:MM` → minutes from midnight. */
const timeToMin = t => {
  const [h, m] = String(t).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/**
 * Minutes → friendly 12h label (`9:00 AM`) for read-only summaries. 1440 (end-of-day) wraps to the
 * NEXT midnight — `12:00 AM`, not `12:00 PM` (review F item 5).
 */
const minLabel = m => {
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  const ap = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 || 12;
  return `${h12}:${pad(mm)} ${ap}`;
};

/** Whether the site time format is 12-hour — a stray `a`/`A` in the PHP format string (C7). */
const uses12h = timeFormat => /a/i.test(String(timeFormat || ''));

/** Minutes → a label in the SITE's time format: `9:00 AM` (12h) or `09:00` (24h) — C7. */
const formatMinutes = (m, timeFormat) => uses12h(timeFormat) ? minLabel(m) : minToTime(m);

// 5-minute granularity for the opening-hours dropdowns — the same step the native time inputs
// used and the spec's hours resolution (SPEC-P1 §1.3; review F item 5: a 15′ menu silently loses
// existing :05/:10 openings).
const TIME_STEP = 5;

/** Build the time options for one picker, in the site format, preserving an off-grid current value. */
function timeOptions(currentMin, timeFormat) {
  const opts = [];
  const seen = new Set();
  for (let m = 0; m < 1440; m += TIME_STEP) {
    opts.push({
      value: m,
      label: formatMinutes(m, timeFormat)
    });
    seen.add(m);
  }
  if (currentMin !== null && currentMin !== undefined && !seen.has(currentMin)) {
    opts.push({
      value: currentMin,
      label: formatMinutes(currentMin, timeFormat)
    });
    opts.sort((a, b) => a.value - b.value);
  }
  return opts;
}

/** A site-format-aware time picker (replaces the browser-locale-only native time input) — C7. */
function TimeSelect({
  value,
  onChange,
  ariaLabel,
  timeFormat,
  disabled = false
}) {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("select", {
    className: "ap-hours-time",
    "aria-label": ariaLabel,
    value: value,
    disabled: disabled,
    onChange: e => onChange(Number(e.target.value)),
    children: timeOptions(value, timeFormat).map(o => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("option", {
      value: o.value,
      children: o.label
    }, o.value))
  });
}

/**
 * Sort every day's periods ascending by start so the REST full-replacement (which
 * requires sorted, non-overlapping periods) never 422s on user entry order.
 *
 * @param {Object} weekly Weekday → periods map.
 * @return {Object} A new sorted map.
 */
function sortWeekly(weekly) {
  const out = {};
  Object.keys(weekly || {}).forEach(n => {
    out[n] = [...(weekly[n] || [])].sort((a, b) => a.start - b.start);
  });
  return out;
}

/**
 * Validate a weekly map: every period needs end > start, and periods within a day
 * must not overlap once sorted. Returns the first human-readable error, or null.
 *
 * @param {Object} weekly Weekday → periods map.
 * @return {?string} Error message or null when valid.
 */
function validateWeekly(weekly) {
  for (const [n, label] of WEEKDAYS) {
    const periods = [...((weekly || {})[n] || [])].sort((a, b) => a.start - b.start);
    let prevEnd = -1;
    for (const p of periods) {
      if (p.end <= p.start) {
        return `${label}: each period must end after it starts.`;
      }
      if (p.start < prevEnd) {
        return `${label}: hours overlap — adjust the times.`;
      }
      prevEnd = p.end;
    }
  }
  return null;
}

/**
 * The editable weekly grid.
 *
 * `busy` means INERT, not merely announced: every control is really `disabled` while a save is
 * in flight. Both consumers persist the week as a FULL replacement (`PUT .../schedule`,
 * `PUT /business-hours`), so an edit accepted mid-write either lands in a second, overlapping
 * replacement or is silently discarded by the reload that follows the first one — the grid must
 * not accept input it cannot honour (Codex review item 1).
 *
 * @param {Object}   props
 * @param {Object}   props.weekly       Weekday → periods map (minutes).
 * @param {Function} props.onChange     `( nextWeekly ) => void`.
 * @param {boolean}  [props.busy]       A save is in flight: `aria-busy` AND every control disabled.
 * @param {string}   [props.timeFormat] Site PHP time format; a/A → 12h pickers (C7). Default 24h.
 */
function WeeklyHoursGrid({
  weekly,
  onChange,
  busy = false,
  timeFormat = ''
}) {
  const setDayClosed = n => onChange({
    ...weekly,
    [n]: []
  });
  const setDayOpen = n => onChange({
    ...weekly,
    [n]: [{
      start: 540,
      end: 1020
    }]
  });
  const setPeriod = (n, i, key, min) => onChange({
    ...weekly,
    [n]: weekly[n].map((p, idx) => idx === i ? {
      ...p,
      [key]: min
    } : p)
  });
  const addPeriod = n => onChange({
    ...weekly,
    [n]: [...(weekly[n] || []), {
      start: 540,
      end: 1020
    }]
  });
  const removePeriod = (n, i) => onChange({
    ...weekly,
    [n]: weekly[n].filter((_, idx) => idx !== i)
  });

  // C8: copy the first open day's periods onto every OTHER open day (closed days stay closed).
  const openDays = WEEKDAYS.filter(([n]) => (weekly[n] || []).length);
  const applyToAllOpen = () => {
    if (openDays.length < 2) {
      return;
    }
    const template = weekly[openDays[0][0]];
    const next = {
      ...weekly
    };
    openDays.forEach(([n]) => {
      next[n] = template.map(p => ({
        ...p
      }));
    });
    onChange(next);
  };
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
    className: `ap-hours-grid${busy ? ' is-busy' : ''}`,
    "aria-busy": busy,
    children: [openDays.length >= 2 ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("div", {
      className: "ap-hours-toolbar",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("button", {
        type: "button",
        className: "pd-button text sm",
        disabled: busy,
        onClick: applyToAllOpen,
        children: [(0,_icon_jsx__WEBPACK_IMPORTED_MODULE_0__.renderIcon)('files'), "Apply ", WEEKDAYS.find(([n]) => n === openDays[0][0])[1], "\u2019s hours to all open days"]
      })
    }) : null, WEEKDAYS.map(([n, label]) => {
      const periods = weekly[n] || [];
      return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        className: "ap-hours-day",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
          className: "ap-hours-day-head",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("strong", {
            children: label
          }), periods.length ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("button", {
            type: "button",
            className: "pd-button text sm",
            disabled: busy,
            onClick: () => setDayClosed(n),
            children: "Closed"
          }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("button", {
            type: "button",
            className: "pd-button text sm",
            disabled: busy,
            onClick: () => setDayOpen(n),
            children: "Open"
          })]
        }), periods.length ? periods.map((p, i) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
          className: "ap-hours-period",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(TimeSelect, {
            value: p.start,
            onChange: min => setPeriod(n, i, 'start', min),
            ariaLabel: `${label} start`,
            timeFormat: timeFormat,
            disabled: busy
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("span", {
            children: "\u2013"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(TimeSelect, {
            value: p.end,
            onChange: min => setPeriod(n, i, 'end', min),
            ariaLabel: `${label} end`,
            timeFormat: timeFormat,
            disabled: busy
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("button", {
            type: "button",
            className: "pd-icon-button sm",
            "aria-label": "Remove period",
            disabled: busy,
            onClick: () => removePeriod(n, i),
            children: (0,_icon_jsx__WEBPACK_IMPORTED_MODULE_0__.renderIcon)('close')
          })]
        }, i)) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("span", {
          className: "ap-hours-closed",
          children: "Closed"
        }), periods.length ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("button", {
          type: "button",
          className: "pd-button text sm",
          disabled: busy,
          onClick: () => addPeriod(n),
          children: [(0,_icon_jsx__WEBPACK_IMPORTED_MODULE_0__.renderIcon)('plus'), "Add hours"]
        }) : null]
      }, n);
    })]
  });
}

/***/ },

/***/ "./assets/src/admin/lib/currency-guard.js"
/*!************************************************!*\
  !*** ./assets/src/admin/lib/currency-guard.js ***!
  \************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   currencyChangeRequiresConfirm: () => (/* binding */ currencyChangeRequiresConfirm)
/* harmony export */ });
/**
 * Currency-change guard for the Settings save flow (Codex review item 1, Settings leg).
 *
 * Stored prices are integer minor units whose meaning depends on the store currency's ISO-4217
 * exponent — saving a different currency re-interprets every existing price at the new scale
 * (a 2500-minor $25.00 service reads as ₫2,500 after a USD→VND switch). The wizard leg re-scales
 * its own prices; the Settings surface instead warns and asks for explicit confirmation before
 * the save proceeds (minimal P1 — FX conversion for established catalogs is out of scope).
 */

/**
 * Whether a pending Settings save changes the store currency and therefore needs the confirm
 * prompt. `edited` only ever holds keys that differ from the saved snapshot, but the comparison
 * is kept as belt-and-braces; an unknown previous value (missing from the snapshot) still counts
 * as a change.
 *
 * @param {Object} savedFlat Flat saved-settings snapshot (dotted keys).
 * @param {Object} edited    Flat dirty-diff map (dotted keys).
 * @return {boolean} True when the save would change `currency`.
 */
function currencyChangeRequiresConfirm(savedFlat, edited) {
  if (!edited || !Object.prototype.hasOwnProperty.call(edited, 'currency')) {
    return false;
  }
  return edited.currency !== (savedFlat || {}).currency;
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

/***/ "./assets/src/admin/notifications/NotificationsApp.jsx"
/*!*************************************************************!*\
  !*** ./assets/src/admin/notifications/NotificationsApp.jsx ***!
  \*************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ NotificationsApp)
/* harmony export */ });
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/api-fetch */ "@wordpress/api-fetch");
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _lib_config_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/config.js */ "./assets/src/admin/lib/config.js");
/* harmony import */ var _modules_catalog_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../modules/catalog.js */ "./assets/src/admin/modules/catalog.js");
/* harmony import */ var _lib_format_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../lib/format.js */ "./assets/src/admin/lib/format.js");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__);
/**
 * Notifications settings app: list the seeded templates, edit subject/body with the placeholder
 * whitelist, toggle each on/off, and run the fixture test-send.
 *
 * Backed by the existing REST surface (SPEC-P0 §7): GET/PUT `/notifications` and POST
 * `/notifications/test-send`. The PUT replaces ALL templates at once (rest-contract §2.13) and
 * rejects a partial set, so the whole set is held in state and saved together.
 *
 * The two `staff` templates (D-R28) are the one place where "held" and "shown" differ: they are
 * hidden from the list while `multi_staff` is unavailable — nothing would send them, so offering
 * an editor for them would be a control with no effect — but they stay in `templates`, and
 * therefore in the PUT payload, untouched. Filtering them out of state instead would make every
 * save fail the all-keys check.
 *
 * THEME SEAM (A3 kit): this ships as plain @wordpress/components restyled lightly with `--ap-*`
 * tokens. When the A3 design kit lands, the wrapper + tokens below are the hook points — do not
 * introduce `.pd-*` production classes here.
 */









const boot = window.apontoAdmin || {};

/** Whether this site may use per-staff notifications (D-R28). */
const MULTI_STAFF = (0,_modules_catalog_js__WEBPACK_IMPORTED_MODULE_5__.moduleAvailable)(_lib_config_js__WEBPACK_IMPORTED_MODULE_4__.config, 'multi_staff');
_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_0___default().use(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_0___default().createNonceMiddleware(boot.nonce || ''));
const restUrl = path => (boot.restBase || '') + path;

/**
 * Friendly labels for the seed template keys (SPEC-P1 §3.2 + 2026-07-20 addendum; the two `staff`
 * keys D-R28 added). Several labels repeat across recipients on purpose — the row's second line
 * carries "To: …", which is what actually distinguishes them.
 */
const TEMPLATE_LABELS = {
  booking_received_customer: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Booking received', 'aponto'),
  booking_confirmed_customer: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Booking confirmed', 'aponto'),
  booking_rescheduled_customer: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Booking rescheduled', 'aponto'),
  booking_cancelled_customer: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Booking cancelled', 'aponto'),
  booking_completed_customer: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Booking completed', 'aponto'),
  booking_no_show_customer: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Customer did not show up', 'aponto'),
  booking_reminder_customer: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Reminder (24h before)', 'aponto'),
  booking_created_admin: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('New booking', 'aponto'),
  booking_cancelled_admin: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Booking cancelled', 'aponto'),
  booking_created_staff: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('New booking', 'aponto'),
  booking_cancelled_staff: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Booking cancelled', 'aponto'),
  payment_pending_customer: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Payment still needed', 'aponto'),
  payment_refunded_customer: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Refund issued', 'aponto')
};

/**
 * Which group a template belongs to, in display order. Grouping by RECIPIENT is what makes the
 * list readable once three audiences share the same event names.
 */
const TEMPLATE_GROUPS = [{
  recipient: 'customer',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('To the customer', 'aponto')
}, {
  recipient: 'admin',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('To you', 'aponto')
}, {
  recipient: 'staff',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('To the assigned staff member', 'aponto')
}];

/**
 * The templates the list may SHOW. Never used for the PUT payload — see the file header: the
 * request must carry every key the server knows, hidden ones included.
 *
 * @param {Array} items All templates from `GET /notifications`.
 * @return {Array} The subset to render.
 */
function visibleTemplates(items) {
  return (items || []).filter(t => MULTI_STAFF || 'staff' !== t.recipient);
}

/** Friendly status labels for the Send log (A3). */
const LOG_STATUS_LABELS = {
  sent: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Sent', 'aponto'),
  failed: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Failed', 'aponto'),
  queued: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Queued', 'aponto'),
  processing: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Sending', 'aponto')
};
const recipientLabel = recipient => {
  if ('admin' === recipient) {
    return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('To: site admin', 'aponto');
  }
  if ('staff' === recipient) {
    return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('To: assigned staff', 'aponto');
  }
  return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('To: customer', 'aponto');
};

/**
 * The whole Notifications settings screen.
 */
function NotificationsApp() {
  const [templates, setTemplates] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)([]);
  const [selected, setSelected] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)('');
  const [sender, setSender] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)({
    from_name: '',
    from_email: '',
    reply_to: ''
  });
  const [loading, setLoading] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)(true);
  const [saving, setSaving] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)(false);
  const [dirty, setDirty] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)(false);
  const [error, setError] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)('');
  const [notice, setNotice] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)('');
  const [testEmail, setTestEmail] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)('');
  const [testing, setTesting] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)(false);
  const caret = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useRef)({
    start: null,
    end: null
  });
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useEffect)(() => {
    let alive = true;
    _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_0___default()({
      url: restUrl('/notifications')
    }).then(res => {
      if (!alive) {
        return;
      }
      const items = Array.isArray(res.items) ? res.items : [];
      setTemplates(items);
      // Select from what is VISIBLE: landing on a hidden staff template would leave the
      // editor pane showing a row the list does not contain.
      const shown = visibleTemplates(items);
      setSelected(shown.length ? shown[0].template_key : '');
      if (res.sender && typeof res.sender === 'object') {
        setSender({
          from_name: res.sender.from_name || '',
          from_email: res.sender.from_email || '',
          reply_to: res.sender.reply_to || ''
        });
      }
      setLoading(false);
    }).catch(err => {
      if (!alive) {
        return;
      }
      setError(err.message || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Could not load templates.', 'aponto'));
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);
  const patchSender = (field, value) => {
    setSender(prev => ({
      ...prev,
      [field]: value
    }));
    setDirty(true);
    setNotice('');
  };
  const current = templates.find(t => t.template_key === selected) || null;
  const patch = (key, changes) => {
    setTemplates(prev => prev.map(t => t.template_key === key ? {
      ...t,
      ...changes
    } : t));
    setDirty(true);
    setNotice('');
  };
  const insertPlaceholder = token => {
    if (!current) {
      return;
    }
    const text = `{${token}}`;
    const body = current.body || '';
    const {
      start,
      end
    } = caret.current;
    let next;
    if (start === null) {
      next = body + (body === '' || body.endsWith('\n') || body.endsWith(' ') ? '' : ' ') + text;
    } else {
      next = body.slice(0, start) + text + body.slice(end);
      caret.current = {
        start: start + text.length,
        end: start + text.length
      };
    }
    patch(current.template_key, {
      body: next
    });
  };
  const save = () => {
    setSaving(true);
    setError('');
    setNotice('');
    _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_0___default()({
      url: restUrl('/notifications'),
      method: 'PUT',
      data: {
        items: templates.map(t => ({
          template_key: t.template_key,
          subject: t.subject,
          body: t.body,
          enabled: !!t.enabled
        })),
        sender: {
          from_name: sender.from_name || '',
          from_email: sender.from_email || '',
          reply_to: sender.reply_to || ''
        }
      }
    }).then(res => {
      const items = Array.isArray(res.items) ? res.items : templates;
      setTemplates(items);
      if (res.sender && typeof res.sender === 'object') {
        setSender({
          from_name: res.sender.from_name || '',
          from_email: res.sender.from_email || '',
          reply_to: res.sender.reply_to || ''
        });
      }
      setDirty(false);
      setSaving(false);
      setNotice((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Changes saved.', 'aponto'));
    }).catch(err => {
      setError(err.message || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Could not save templates.', 'aponto'));
      setSaving(false);
    });
  };
  const sendTest = () => {
    if (!current) {
      return;
    }
    setTesting(true);
    setError('');
    setNotice('');
    _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_0___default()({
      url: restUrl('/notifications/test-send'),
      method: 'POST',
      data: {
        template_key: current.template_key,
        recipient_email: testEmail
      }
    }).then(res => {
      setTesting(false);
      setNotice(res && res.sent ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)(/* translators: %s: recipient email. */
      (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Test email sent to %s.', 'aponto'), testEmail) : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('The test email could not be sent. Check your site email settings.', 'aponto'));
    }).catch(err => {
      setTesting(false);
      setError(err.message || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Could not send the test email.', 'aponto'));
    });
  };
  if (loading) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
      className: "aponto-notifications",
      style: {
        padding: '24px 0'
      },
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Spinner, {})
    });
  }
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
    className: "aponto-notifications",
    style: {
      maxWidth: 1040
    },
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("h1", {
      style: {
        fontSize: 23,
        fontWeight: 600,
        margin: '4px 0 4px'
      },
      children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Notifications', 'aponto')
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("p", {
      style: {
        color: 'var(--ap-color-text-muted, #646970)',
        marginTop: 0
      },
      children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Emails sent to customers and to you when bookings change. Times use each booking’s timezone.', 'aponto')
    }), error ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Notice, {
      status: "error",
      isDismissible: true,
      onRemove: () => setError(''),
      children: error
    }) : null, notice ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Notice, {
      status: "success",
      isDismissible: true,
      onRemove: () => setNotice(''),
      children: notice
    }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Flex, {
      align: "flex-start",
      gap: 4,
      wrap: true,
      style: {
        marginTop: 12
      },
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.FlexItem, {
        style: {
          flexBasis: 320,
          flexGrow: 0
        },
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Card, {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.CardHeader, {
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("strong", {
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Templates', 'aponto')
            })
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.CardBody, {
            style: {
              padding: 0
            },
            children: TEMPLATE_GROUPS.map(group => {
              const rows = visibleTemplates(templates).filter(t => t.recipient === group.recipient);
              if (!rows.length) {
                return null;
              }
              return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
                  style: {
                    padding: '8px 16px 4px',
                    color: 'var( --ap-color-text-soft, #757575 )',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  },
                  children: group.label
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("ul", {
                  style: {
                    margin: 0
                  },
                  children: rows.map(t => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(TemplateRow, {
                    template: t,
                    active: t.template_key === selected,
                    onSelect: () => setSelected(t.template_key),
                    onToggle: enabled => patch(t.template_key, {
                      enabled
                    })
                  }, t.template_key))
                })]
              }, group.recipient);
            })
          })]
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.FlexBlock, {
        style: {
          minWidth: 360
        },
        children: current ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(Editor, {
          template: current,
          placeholders: boot.placeholders || [],
          urlKeys: boot.urlKeys || [],
          onField: (field, value) => patch(current.template_key, {
            [field]: value
          }),
          onInsert: insertPlaceholder,
          onCaret: c => {
            caret.current = c;
          },
          testEmail: testEmail,
          onTestEmail: setTestEmail,
          onTest: sendTest,
          testing: testing
        }) : null
      })]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(SenderPanel, {
      sender: sender,
      onField: patchSender
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
      style: {
        marginTop: 16,
        display: 'flex',
        gap: 12,
        alignItems: 'center'
      },
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Button, {
        variant: "primary",
        onClick: save,
        isBusy: saving,
        disabled: saving || !dirty,
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Save changes', 'aponto')
      }), dirty ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("span", {
        style: {
          color: 'var(--ap-color-text-muted, #646970)'
        },
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('You have unsaved changes.', 'aponto')
      }) : null]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(SendLog, {})]
  });
}

/**
 * Sender identity panel (A2): From name/email + optional Reply-To. Empty = the site default. Saved
 * together with the templates by the Save button above (the values ride the same PUT /notifications).
 */
function SenderPanel({
  sender,
  onField
}) {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Card, {
    style: {
      marginTop: 24
    },
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.CardHeader, {
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("strong", {
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Sender', 'aponto')
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.CardBody, {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("p", {
        style: {
          marginTop: 0,
          color: 'var(--ap-color-text-muted, #646970)'
        },
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Who booking emails come from. Leave blank to use your site’s default. Applies only to Aponto’s emails.', 'aponto')
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Flex, {
        align: "flex-start",
        gap: 4,
        wrap: true,
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.FlexBlock, {
          style: {
            minWidth: 220
          },
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.TextControl, {
            __nextHasNoMarginBottom: true,
            __next40pxDefaultSize: true,
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('From name', 'aponto'),
            value: sender.from_name || '',
            onChange: value => onField('from_name', value),
            placeholder: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Your business name', 'aponto')
          })
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.FlexBlock, {
          style: {
            minWidth: 220
          },
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.TextControl, {
            __nextHasNoMarginBottom: true,
            __next40pxDefaultSize: true,
            type: "email",
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('From email', 'aponto'),
            value: sender.from_email || '',
            onChange: value => onField('from_email', value),
            placeholder: "bookings@example.com"
          })
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.FlexBlock, {
          style: {
            minWidth: 220
          },
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.TextControl, {
            __nextHasNoMarginBottom: true,
            __next40pxDefaultSize: true,
            type: "email",
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Reply-To (optional)', 'aponto'),
            value: sender.reply_to || '',
            onChange: value => onField('reply_to', value),
            placeholder: "you@example.com"
          })
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("p", {
        style: {
          fontSize: 12,
          color: 'var(--ap-color-text-muted, #646970)',
          marginBottom: 0
        },
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Some hosts require the From address to be on your own domain to avoid spam filtering.', 'aponto')
      })]
    })]
  });
}

/**
 * Read-only Send log (A3 — U4): a page of the deliveries ledger (time, template, masked recipient,
 * status, error) for debugging "the customer didn't get the email". View-only — no resend in V1.
 */
function SendLog() {
  const [rows, setRows] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)([]);
  const [page, setPage] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)(1);
  const [total, setTotal] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)(0);
  const [perPage, setPerPage] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)(20);
  const [loading, setLoading] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)(true);
  const [error, setError] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)('');
  const load = (toPage = page) => {
    setLoading(true);
    setError('');
    _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_0___default()({
      url: restUrl(`/notifications/log?page=${toPage}&per_page=20`)
    }).then(res => {
      setRows(Array.isArray(res.items) ? res.items : []);
      setTotal(Number(res.total || 0));
      setPerPage(Number(res.per_page || 20));
      setPage(Number(res.page || toPage));
      setLoading(false);
    }).catch(err => {
      setError(err.message || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Could not load the send log.', 'aponto'));
      setLoading(false);
    });
  };
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useEffect)(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only.
  }, []);
  const lastPage = Math.max(1, Math.ceil(total / (perPage || 20)));
  const cell = {
    padding: '8px 10px',
    borderBottom: '1px solid var(--ap-color-border, #e0e0e0)',
    fontSize: 13,
    textAlign: 'left',
    verticalAlign: 'top'
  };
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Card, {
    style: {
      marginTop: 24
    },
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.CardHeader, {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      },
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("span", {
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("strong", {
          style: {
            display: 'block'
          },
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Send log', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("span", {
          style: {
            fontSize: 12,
            color: 'var(--ap-color-text-muted, #646970)'
          },
          children: _lib_config_js__WEBPACK_IMPORTED_MODULE_4__.businessTimeLine
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Button, {
        variant: "secondary",
        onClick: () => load(page),
        isBusy: loading,
        size: "small",
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Refresh', 'aponto')
      })]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.CardBody, {
      style: {
        padding: 0
      },
      children: [error ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
        style: {
          padding: 16
        },
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Notice, {
          status: "error",
          isDismissible: false,
          children: error
        })
      }) : null, loading && rows.length === 0 ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
        style: {
          padding: 24
        },
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Spinner, {})
      }) : null, !loading && rows.length === 0 && !error ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("p", {
        style: {
          padding: 16,
          color: 'var(--ap-color-text-muted, #646970)',
          margin: 0
        },
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('No emails have been sent yet.', 'aponto')
      }) : null, rows.length > 0 ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
        style: {
          overflowX: 'auto'
        },
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("table", {
          style: {
            width: '100%',
            borderCollapse: 'collapse'
          },
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("thead", {
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("tr", {
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("th", {
                style: {
                  ...cell,
                  fontWeight: 600
                },
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Time', 'aponto')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("th", {
                style: {
                  ...cell,
                  fontWeight: 600
                },
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Email', 'aponto')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("th", {
                style: {
                  ...cell,
                  fontWeight: 600
                },
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('To', 'aponto')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("th", {
                style: {
                  ...cell,
                  fontWeight: 600
                },
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Status', 'aponto')
              })]
            })
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("tbody", {
            children: rows.map(row => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("tr", {
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("td", {
                style: cell,
                children: formatLogTime(row.updated_at || row.created_at)
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("td", {
                style: cell,
                children: TEMPLATE_LABELS[row.template_key] || row.template_key
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("td", {
                style: {
                  ...cell,
                  fontFamily: 'monospace'
                },
                children: row.recipient_masked || '—'
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("td", {
                style: cell,
                children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(LogStatus, {
                  status: row.status,
                  error: row.error
                })
              })]
            }, row.id))
          })]
        })
      }) : null]
    }), total > perPage ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
      style: {
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        padding: '10px 14px',
        borderTop: '1px solid var(--ap-color-border, #e0e0e0)'
      },
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Button, {
        variant: "tertiary",
        size: "small",
        disabled: page <= 1 || loading,
        onClick: () => load(page - 1),
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Previous', 'aponto')
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("span", {
        style: {
          fontSize: 12,
          color: 'var(--ap-color-text-muted, #646970)'
        },
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)(/* translators: 1: current page, 2: total pages. */
        (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Page %1$d of %2$d', 'aponto'), page, lastPage)
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Button, {
        variant: "tertiary",
        size: "small",
        disabled: page >= lastPage || loading,
        onClick: () => load(page + 1),
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Next', 'aponto')
      })]
    }) : null]
  });
}

/** A status pill for the Send log, with the failure reason as a tooltip. */
function LogStatus({
  status,
  error
}) {
  const label = LOG_STATUS_LABELS[status] || status;
  const failed = status === 'failed';
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("span", {
    title: error || '',
    style: {
      fontSize: 12,
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: 999,
      color: failed ? 'var(--ap-color-danger, #b32d2e)' : 'var(--ap-color-text-muted, #646970)',
      border: '1px solid var(--ap-color-border-strong, #c3c4c7)'
    },
    children: [label, failed && error ? ` · ${error}` : '']
  });
}

/**
 * Format an SQL UTC timestamp for the log in BUSINESS time, falling back to the raw value.
 *
 * `toLocaleString()` rendered every row in whatever zone the viewing browser happens to sit in,
 * unlabelled — so the same log read differently for the owner and the agency looking after the
 * site, and neither reading matched the bookings list. Every admin surface shows one display
 * timezone (§5 invariant 6): the business one, announced by the card's `businessTimeLine`.
 */
function formatLogTime(sql) {
  if (!sql) {
    return '';
  }
  const iso = sql.includes('T') ? sql : sql.replace(' ', 'T') + 'Z';
  if (Number.isNaN(new Date(iso).getTime())) {
    return sql;
  }
  return (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.dateTimeLabel)(iso);
}

/**
 * A single row in the template list: name, recipient/trigger, on/off toggle.
 */
function TemplateRow({
  template,
  active,
  onSelect,
  onToggle
}) {
  const label = TEMPLATE_LABELS[template.template_key] || template.template_key;
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("li", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '10px 14px',
      borderBottom: '1px solid var(--ap-color-border, #e0e0e0)',
      background: active ? 'var(--ap-color-accent-subtle, #f0f0f1)' : 'transparent'
    },
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("button", {
      type: "button",
      onClick: onSelect,
      style: {
        flex: 1,
        textAlign: 'left',
        background: 'none',
        border: 0,
        cursor: 'pointer',
        padding: 0
      },
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("span", {
        style: {
          display: 'block',
          fontWeight: 600
        },
        children: label
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("span", {
        style: {
          display: 'block',
          fontSize: 12,
          color: 'var(--ap-color-text-muted, #646970)'
        },
        children: [recipientLabel(template.recipient), " \xB7 ", template.trigger_event]
      })]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.ToggleControl, {
      __nextHasNoMarginBottom: true,
      className: "ap-toggle-label-sr",
      checked: !!template.enabled,
      onChange: onToggle,
      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)(/* translators: %s: template name. */
      (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Enable %s email', 'aponto'), TEMPLATE_LABELS[template.template_key] || template.template_key)
    })]
  });
}

/**
 * The per-template editor: subject, placeholder chips, body, and the fixture test-send.
 */
function Editor({
  template,
  placeholders,
  urlKeys,
  onField,
  onInsert,
  onCaret,
  testEmail,
  onTestEmail,
  onTest,
  testing
}) {
  const captureCaret = e => onCaret({
    start: e.target.selectionStart,
    end: e.target.selectionEnd
  });
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Card, {
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.CardHeader, {
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("strong", {
        children: TEMPLATE_LABELS[template.template_key] || template.template_key
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.CardBody, {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.TextControl, {
        __nextHasNoMarginBottom: true,
        __next40pxDefaultSize: true,
        label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Subject', 'aponto'),
        value: template.subject || '',
        onChange: value => onField('subject', value)
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
        style: {
          margin: '16px 0 6px',
          fontSize: 12,
          fontWeight: 600
        },
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Placeholders', 'aponto')
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          marginBottom: 12
        },
        children: placeholders.map(token => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("button", {
          type: "button",
          onClick: () => onInsert(token),
          title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Insert into body', 'aponto'),
          style: {
            fontSize: 12,
            fontFamily: 'monospace',
            padding: '3px 8px',
            borderRadius: 999,
            border: '1px solid var(--ap-color-border-strong, #c3c4c7)',
            background: urlKeys.includes(token) ? 'var(--ap-color-accent-subtle, #f0f0f1)' : 'var(--ap-color-surface-muted, #f6f7f7)',
            cursor: 'pointer'
          },
          children: `{${token}}`
        }, token))
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.TextareaControl, {
        __nextHasNoMarginBottom: true,
        label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Body', 'aponto'),
        help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Plain text. Line breaks become paragraphs in the email.', 'aponto'),
        rows: 10,
        value: template.body || '',
        onChange: value => onField('body', value),
        onSelect: captureCaret,
        onKeyUp: captureCaret,
        onClick: captureCaret
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
        style: {
          marginTop: 18,
          paddingTop: 16,
          borderTop: '1px solid var(--ap-color-border, #e0e0e0)'
        },
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
          style: {
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 6
          },
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Send a test', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Flex, {
          align: "flex-end",
          gap: 3,
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.FlexBlock, {
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.TextControl, {
              __nextHasNoMarginBottom: true,
              __next40pxDefaultSize: true,
              type: "email",
              label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Recipient email', 'aponto'),
              value: testEmail,
              onChange: onTestEmail,
              placeholder: "you@example.com"
            })
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.FlexItem, {
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Button, {
              variant: "secondary",
              onClick: onTest,
              isBusy: testing,
              disabled: testing || !testEmail,
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Send test', 'aponto')
            })
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("p", {
          style: {
            fontSize: 12,
            color: 'var(--ap-color-text-muted, #646970)',
            marginBottom: 0
          },
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Uses a sample booking. Save your changes first to test the latest text.', 'aponto')
        })]
      })]
    })]
  });
}

/***/ },

/***/ "./assets/src/admin/routes/SettingsRoute.jsx"
/*!***************************************************!*\
  !*** ./assets/src/admin/routes/SettingsRoute.jsx ***!
  \***************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SettingsRoute: () => (/* binding */ SettingsRoute)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _lib_config_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../lib/config.js */ "./assets/src/admin/lib/config.js");
/* harmony import */ var _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../lib/icon.jsx */ "./assets/src/admin/lib/icon.jsx");
/* harmony import */ var _lib_nav_guard_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/nav-guard.js */ "./assets/src/admin/lib/nav-guard.js");
/* harmony import */ var _lib_ui_jsx__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../lib/ui.jsx */ "./assets/src/admin/lib/ui.jsx");
/* harmony import */ var _settings_ia_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../settings/ia.js */ "./assets/src/admin/settings/ia.js");
/* harmony import */ var _settings_SettingsApp_jsx__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../settings/SettingsApp.jsx */ "./assets/src/admin/settings/SettingsApp.jsx");
/* harmony import */ var _notifications_NotificationsApp__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../notifications/NotificationsApp */ "./assets/src/admin/notifications/NotificationsApp.jsx");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__);
/**
 * Settings route (SPEC-P1 §1.6 + mockup SPEC §7.9 — "Settings retains a parent →
 * child hierarchy and hash-deep-link contract").
 *
 * The rail is the mockup's icon-decorated tree, not a flat tab strip: parents
 * disclose their children (`aria-expanded` + `role="group"`), leaves activate
 * directly, and the active node carries `aria-current="page"`
 * (docs/mockups/v4/plugin-dashboard/assets/js/plugin-dashboard.js:396-412). Hash
 * deep links reach the leaf — `#settings/<parent>/<child>` — and every legacy
 * flat URL aliases onto a real section (see ../settings/ia.js for the map).
 *
 * The four schema sections render through SettingsApp; Notifications folds in the
 * B3 template editor unchanged (same bundle, same `window.apontoAdmin` boot
 * contract). Setup-wizard re-entry lives in the header (the wizard menu item
 * disappears after completion; the page stays URL-reachable).
 *
 * Section switches navigate through the hash router — the rail sets
 * `location.hash` exactly like every other nav in the app, so `hashchange` fires,
 * `App.useRoute()` stays current (Settings ▾ marks the right parent) and Back
 * traverses sections. `replaceState` is reserved for silently canonicalizing an
 * incoming legacy/unknown URL, which must not leave a history entry.
 *
 * Section switches run through the nav guard (C1 review fix 2): while the schema
 * form is dirty, switching asks for confirmation instead of silently unmounting
 * the form. Because every switch now arrives as a route change, the guard lives
 * in ONE place (the segments effect) and covers clicks and Back/Forward alike.
 * Route-level changes are guarded centrally in the router.
 *
 * Keyboard: the rail is navigation, not a tablist, so Arrow/Home/End move FOCUS
 * across the visible nodes without activating them (SPEC §11 roving focus). That
 * also keeps arrow keys from firing the dirty-form confirm on every keypress.
 */










/**
 * Rewrite the hash IN PLACE — no history entry, and (deliberately) no
 * `hashchange`.
 *
 * Reserved for SILENT CANONICALIZATION of an incoming URL: every legacy or
 * unknown shape in the ../settings/ia.js alias table (`#settings`,
 * `#settings/booking`, `#settings/appearance`, a stale bookmark…) resolves to a
 * real section and the address bar is corrected without polluting history —
 * Back from an aliased entry must leave Settings, not bounce between two
 * spellings of the same section.
 *
 * User-initiated navigation must NOT use this (see `selectSection`).
 */

function canonicalizeHash(parent, child) {
  const target = (0,_settings_ia_js__WEBPACK_IMPORTED_MODULE_6__.settingsPath)(parent, child);
  if (window.location.hash.slice(1) !== target) {
    window.history.replaceState(null, '', `#${target}`);
  }
}
function SettingsRoute({
  segments
}) {
  // The hash is the single source of truth for the visible section; this state
  // only LAGS it while the dirty-form guard is deciding, because the point of the
  // guard is not to unmount a dirty form before the user has answered.
  const [section, setSection] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(() => (0,_settings_ia_js__WEBPACK_IMPORTED_MODULE_6__.resolveSettingsRoute)(segments));
  const navRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);

  // One reconciliation point for every way the section can change: a rail click,
  // the Settings ▾ menu, a deep link, browser Back/Forward. They all land here as
  // new `segments`, so the guard prompt is written once and behaves identically.
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    const next = (0,_settings_ia_js__WEBPACK_IMPORTED_MODULE_6__.resolveSettingsRoute)(segments);
    // Legacy/unknown URLs get corrected first, in place — no history entry.
    canonicalizeHash(next.parent, next.child);
    if (next.parent === section.parent && next.child === section.child) {
      // Nothing to do — also where a cancelled switch lands once its hash has
      // bounced back here, which is what keeps the guard from firing twice.
      return;
    }
    (0,_lib_nav_guard_js__WEBPACK_IMPORTED_MODULE_4__.requestNav)(() => setSection(next),
    // User kept the unsaved edits: bounce the hash back through the router
    // rather than `replaceState`, so `App.useRoute()` segments (Settings ▾
    // current parent, WP submenu sync) match what is actually on screen. The
    // round-trip re-enters this effect and exits at the equality check above.
    // This costs one history entry per cancelled switch, which is the cheaper
    // bug: `replaceState` would leave the shell's segments pointing at the
    // section the user just refused — the stale-parent regression itself.
    () => {
      window.location.hash = (0,_settings_ia_js__WEBPACK_IMPORTED_MODULE_6__.settingsPath)(section.parent, section.child);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- follow external segment changes only.
  }, [segments]);

  // Rail activation is real navigation, so it goes through the hash router like
  // every other nav in the app (lib/router.js `navigate`): assigning
  // `location.hash` fires `hashchange`, which is what keeps `App.useRoute()` from
  // going stale — `replaceState` fires nothing and left the Settings ▾ dropdown
  // marking a stale parent (Codex review 2026-07-25). It also PUSHES a history
  // entry on purpose: a user section change is a place the user can go Back from.
  // The dirty-form guard is intentionally not consulted here — the effect above
  // owns it, so clicks and Back/Forward share exactly one prompt.
  const selectSection = (parent, child) => {
    if (parent === section.parent && child === section.child) {
      return;
    }
    window.location.hash = (0,_settings_ia_js__WEBPACK_IMPORTED_MODULE_6__.settingsPath)(parent, child);
  };

  // Arrow/Home/End move focus over whatever the rail currently shows (parents
  // plus the open parent's children); activation stays on Enter/Space/click.
  const onRailKeyDown = event => {
    const keys = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'];
    if (!keys.includes(event.key)) {
      return;
    }
    const nodes = [...(navRef.current?.querySelectorAll('button') || [])];
    if (!nodes.length) {
      return;
    }
    event.preventDefault();
    const index = nodes.indexOf(document.activeElement);
    const last = nodes.length - 1;
    let next = index;
    if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = last;
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      next = index >= last ? 0 : index + 1;
    } else {
      next = index <= 0 ? last : index - 1;
    }
    nodes[next]?.focus();
  };
  const wizardAction = _lib_config_js__WEBPACK_IMPORTED_MODULE_2__.config.wizardUrl ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsxs)("a", {
    className: "pd-button is-ghost",
    href: _lib_config_js__WEBPACK_IMPORTED_MODULE_2__.config.wizardUrl,
    children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_3__.renderIcon)('arrows'), (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Open setup wizard', 'aponto')]
  }) : null;
  const active = (0,_settings_ia_js__WEBPACK_IMPORTED_MODULE_6__.settingsSection)(section.parent, section.child);

  // No `.pd-page` wrapper here: the mockup's settings screen is full-bleed inside
  // `.pd-main.is-settings`, while `.pd-page` re-centers content at max-width 1320px.
  // The page header therefore rides inside the padded right-hand column.
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsxs)("div", {
    className: "ap-settings-layout",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)("nav", {
      className: "ap-settings-nav",
      ref: navRef,
      "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Settings sections', 'aponto'),
      onKeyDown: onRailKeyDown,
      children: _settings_ia_js__WEBPACK_IMPORTED_MODULE_6__.SETTINGS_TREE.map(node => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(SettingsNode, {
        node: node,
        section: section,
        onSelect: selectSection
      }, node.id))
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsxs)("div", {
      className: "ap-settings-panel",
      id: "ap-settings-panel",
      role: "region",
      "aria-label": active.label,
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_lib_ui_jsx__WEBPACK_IMPORTED_MODULE_5__.PageHeader, {
        title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Settings', 'aponto'),
        actions: wizardAction
      }), active.component === 'notifications' ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_notifications_NotificationsApp__WEBPACK_IMPORTED_MODULE_8__["default"], {}) :
      /*#__PURE__*/
      // Deliberately NOT keyed per section: the form holds the full
      // `GET /settings` payload plus its concurrency revision (§2.11
      // addendum), so remounting on every section switch would refetch
      // and drop that context for no gain.
      (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_settings_SettingsApp_jsx__WEBPACK_IMPORTED_MODULE_7__["default"], {
        panels: active.panels,
        extras: active.extras
      })]
    })]
  });
}

/**
 * One rail node: a leaf button, or a parent disclosure plus its child group.
 * The mockup keeps exactly one parent open — the active one — so the tree never
 * grows a second interaction (expand vs. select) for the same click.
 */
function SettingsNode({
  node,
  section,
  onSelect
}) {
  const children = (0,_settings_ia_js__WEBPACK_IMPORTED_MODULE_6__.settingsChildren)(node.id);
  const open = section.parent === node.id;
  if (!children.length) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsxs)("button", {
      className: "ap-settings-node is-leaf",
      type: "button",
      "aria-current": open ? 'page' : undefined,
      onClick: () => onSelect(node.id, ''),
      children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_3__.renderIcon)(node.icon, 'ap-settings-node-icon'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)("span", {
        children: node.label
      })]
    });
  }

  // `aria-controls` only points at the group while it exists: a collapsed branch
  // renders no children, and a dangling reference is worse than none.
  const groupId = `ap-settings-group-${node.id}`;
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsxs)("div", {
    className: `ap-settings-branch${open ? ' is-open' : ''}`,
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsxs)("button", {
      className: "ap-settings-node",
      type: "button",
      "aria-expanded": open,
      "aria-controls": open ? groupId : undefined,
      onClick: () => onSelect(node.id, children[0].id),
      children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_3__.renderIcon)(node.icon, 'ap-settings-node-icon'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)("span", {
        children: node.label
      }), (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_3__.renderIcon)('chevron', 'ap-settings-node-caret')]
    }), open ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)("div", {
      className: "ap-settings-children",
      id: groupId,
      role: "group",
      "aria-label": node.label,
      children: children.map(child => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)("button", {
        className: "ap-settings-child",
        type: "button",
        "aria-current": section.child === child.id ? 'page' : undefined,
        onClick: () => onSelect(node.id, child.id),
        children: child.label
      }, child.id))
    }) : null]
  });
}

/***/ },

/***/ "./assets/src/admin/settings/BusinessHoursPanel.jsx"
/*!**********************************************************!*\
  !*** ./assets/src/admin/settings/BusinessHoursPanel.jsx ***!
  \**********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ BusinessHoursPanel)
/* harmony export */ });
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _lib_api_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../lib/api.js */ "./assets/src/admin/lib/api.js");
/* harmony import */ var _lib_config_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/config.js */ "./assets/src/admin/lib/config.js");
/* harmony import */ var _lib_WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../lib/WeeklyHoursGrid.jsx */ "./assets/src/admin/lib/WeeklyHoursGrid.jsx");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__);
/**
 * Business hours panel (SPEC-P1 §1.3), folded into Settings → General so a founder
 * who SKIPPED the setup wizard still has a place to set weekly opening hours
 * (finding U4-03a — without this the manual path leaves every day Closed and no
 * availability ever appears).
 *
 * Reads/writes the `staff_id = 0` wildcard weekly grid through GET/PUT
 * `/business-hours`; staff inherit these rows. Reuses the shared {@link WeeklyHoursGrid}
 * (same editor the per-staff "Customize" flow uses) and the same period validation
 * the REST layer enforces, so an invalid grid is caught before the round-trip.
 */







/** Response weekly (`[{weekday, periods:[{start_minute,end_minute}]}]`) → grid map with all 7 days present. */

function toMap(weekly) {
  const map = {};
  _lib_WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_5__.WEEKDAYS.forEach(([n]) => {
    map[n] = [];
  });
  (weekly || []).forEach(row => {
    map[row.weekday] = (row.periods || []).map(p => ({
      start: p.start_minute,
      end: p.end_minute
    }));
  });
  return map;
}
function BusinessHoursPanel() {
  const [loading, setLoading] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(true);
  const [error, setError] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('');
  const [notice, setNotice] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('');
  const [weekly, setWeekly] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)({});
  const [saved, setSaved] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)({});
  const [saving, setSaving] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const load = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useCallback)(() => {
    setLoading(true);
    setError('');
    _lib_api_js__WEBPACK_IMPORTED_MODULE_3__.api.get('/business-hours').then(res => {
      const map = toMap(res.weekly);
      setWeekly(map);
      setSaved(map);
      setLoading(false);
    }).catch(err => {
      setError(err.message || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Could not load business hours.', 'aponto'));
      setLoading(false);
    });
  }, []);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(load, [load]);

  // Deep-link scroll from the Dashboard "Business time → Manage" action (U4-03c).
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (typeof window !== 'undefined' && window.__apontoScrollToHours) {
      window.__apontoScrollToHours = false;
      // Wait for the first paint (and the settings load) before scrolling.
      const id = window.setTimeout(() => {
        document.getElementById('ap-business-hours')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 150);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [loading]);
  const dirty = JSON.stringify(weekly) !== JSON.stringify(saved);
  const save = () => {
    const invalid = (0,_lib_WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_5__.validateWeekly)(weekly);
    if (invalid) {
      setError(invalid);
      setNotice('');
      return;
    }
    const sorted = (0,_lib_WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_5__.sortWeekly)(weekly);
    setSaving(true);
    setError('');
    setNotice('');
    const payload = {
      weekly: _lib_WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_5__.WEEKDAYS.map(([n]) => ({
        weekday: n,
        periods: (sorted[n] || []).map(p => ({
          start_minute: p.start,
          end_minute: p.end
        }))
      }))
    };
    _lib_api_js__WEBPACK_IMPORTED_MODULE_3__.api.put('/business-hours', payload).then(res => {
      const map = toMap(res.weekly);
      setWeekly(map);
      setSaved(map);
      setSaving(false);
      setNotice((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Business hours saved.', 'aponto'));
    }).catch(err => {
      setSaving(false);
      if (err.data && err.data.fields && err.data.fields.weekly) {
        setError(err.data.fields.weekly);
      } else {
        setError(err.message || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Could not save business hours.', 'aponto'));
      }
    });
  };
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Card, {
    className: "ap-settings-card",
    id: "ap-business-hours",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardHeader, {
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("h2", {
          className: "ap-settings-card-title",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Business hours', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
          className: "ap-settings-card-desc",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('The weekly opening hours every staff member inherits. Set a day Closed to block it.', 'aponto')
        })]
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardBody, {
      children: [error ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Notice, {
        status: "error",
        isDismissible: true,
        onRemove: () => setError(''),
        children: error
      }) : null, notice ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Notice, {
        status: "success",
        isDismissible: true,
        onRemove: () => setNotice(''),
        children: notice
      }) : null, loading ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Spinner, {}) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.Fragment, {
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_lib_WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_5__.WeeklyHoursGrid, {
          weekly: weekly,
          onChange: setWeekly,
          busy: saving,
          timeFormat: _lib_config_js__WEBPACK_IMPORTED_MODULE_4__.config.settings.timeFormat
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("div", {
          className: "ap-hours-save",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Button, {
            variant: "primary",
            className: "pd-button primary sm",
            isBusy: saving,
            disabled: saving || !dirty,
            onClick: save,
            children: saving ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Saving…', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Save business hours', 'aponto')
          })
        })]
      })]
    })]
  });
}

/***/ },

/***/ "./assets/src/admin/settings/SettingsApp.jsx"
/*!***************************************************!*\
  !*** ./assets/src/admin/settings/SettingsApp.jsx ***!
  \***************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ SettingsApp)
/* harmony export */ });
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _pressmaximum_dashboard_kit__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @pressmaximum/dashboard-kit */ "./node_modules/@pressmaximum/dashboard-kit/build/index.mjs");
/* harmony import */ var _lib_api_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/api.js */ "./assets/src/admin/lib/api.js");
/* harmony import */ var _lib_config_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../lib/config.js */ "./assets/src/admin/lib/config.js");
/* harmony import */ var _lib_currency_guard_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../lib/currency-guard.js */ "./assets/src/admin/lib/currency-guard.js");
/* harmony import */ var _lib_confirm_jsx__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../lib/confirm.jsx */ "./assets/src/admin/lib/confirm.jsx");
/* harmony import */ var _lib_nav_guard_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../lib/nav-guard.js */ "./assets/src/admin/lib/nav-guard.js");
/* harmony import */ var _lib_ui_jsx__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../lib/ui.jsx */ "./assets/src/admin/lib/ui.jsx");
/* harmony import */ var _catalog_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./catalog.js */ "./assets/src/admin/settings/catalog.js");
/* harmony import */ var _BusinessHoursPanel_jsx__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./BusinessHoursPanel.jsx */ "./assets/src/admin/settings/BusinessHoursPanel.jsx");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__);
/**
 * Settings sections (SPEC-P1 §1.6) rendered schema-driven from
 * `config.settingsSchema` (tab/panel metadata straight from the PHP schema,
 * SPEC-P0 §4.3) through the dashboard-kit SchemaForm + SaveBar.
 *
 * The caller (routes/SettingsRoute.jsx) resolves the mockup's parent → child tree
 * (settings/ia.js) into the two props this component takes: `panels`, the schema
 * PANEL slugs to render in schema order, and `extras`, the non-schema surfaces
 * appended below them. Notifications is a component section handled by the caller
 * (the B3 template editor, unchanged).
 *
 * Save contract (rest-contract §2.11 / D-16): `PUT /settings` is a FULL replacement
 * — any schema key absent from the body resets to its default. So the client holds
 * the complete GET payload and round-trips it on every save; only the edited keys
 * change, and nothing hidden (appearance, flood caps, …) is lost. Strict validation
 * failures come back as a 422 field map and render inline under the offending field.
 *
 * Concurrency (§2.11 addendum 2026-07-19 C1): the GET payload carries a `revision`
 * token that rides the round-trip untouched; a save against a stale revision comes
 * back `409 aponto_settings_conflict` and renders a conflict banner with an explicit
 * Reload action — never an automatic overwrite.
 *
 * Dirty guard (C1 review fix 2): while edits are pending this form registers a nav
 * guard; sub-tab switches and route changes ask through a ConfirmDialog instead of
 * silently unmounting. Browser unload stays covered by the kit useDirtyState.
 *
 * THEME SEAM: plain @wordpress/components + kit primitives styled by `--ap-*`/`--pmdk-*`
 * tokens. No `.pd-*` production classes are authored here.
 */













/** Textarea control — extends the kit's base field types (address, consent text). */

function TextareaField({
  field,
  value,
  onChange
}) {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.TextareaControl, {
    __nextHasNoMarginBottom: true,
    label: field.label,
    help: field.description,
    rows: field.rows || 3,
    value: value === null || value === undefined ? '' : String(value),
    onChange: onChange
  });
}

/** Best-fit menu unit for a stored value: the largest that divides it evenly (else the base). */
function bestDurationUnit(value, units) {
  if (value === null || value === undefined || value === '' || Number(value) === 0) {
    return units[0].value;
  }
  const num = Number(value);
  for (let i = units.length - 1; i >= 0; i--) {
    if (num % units[i].factor === 0) {
      return units[i].value;
    }
  }
  return units[0].value;
}

/**
 * Value + unit control (C5). Stores the canonical unit (minutes for lead time, days for the booking
 * window); switching the menu re-expresses that number in minutes/hours/days without changing what
 * is stored, so the schema value and the availability engine stay in the same units they always were.
 *
 * Bounds + fractional entry (review F item 7): `field.min`/`field.max` are CANONICAL-unit bounds —
 * the emitted value clamps into them (the booking window can never emit 0, which the server
 * rejects), and the number input's min/max/step re-express them in the selected unit, with a 0.5
 * step for the larger units ("1.5 hours" → 90 minutes).
 */
function DurationField({
  field,
  value,
  onChange
}) {
  const units = field.units && field.units.length ? field.units : [{
    value: 'value',
    label: '',
    factor: 1
  }];
  const [unit, setUnit] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(() => bestDurationUnit(value, units));
  const active = units.find(u => u.value === unit) || units[0];
  const minCanonical = Number.isFinite(field.min) ? field.min : 0;
  const maxCanonical = Number.isFinite(field.max) ? field.max : Infinity;
  const num = value === null || value === undefined || value === '' ? null : Number(value);
  const amount = num === null ? '' : num / active.factor;
  const [inputId] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(() => `ap-duration-${Math.random().toString(36).slice(2, 9)}`);
  const emit = raw => {
    if (raw === '' || raw === null || Number.isNaN(Number(raw))) {
      onChange('');
      return;
    }
    const canonical = Math.round(Number(raw) * active.factor);
    onChange(Math.min(maxCanonical, Math.max(minCanonical, canonical)));
  };
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.BaseControl, {
    __nextHasNoMarginBottom: true,
    label: field.label,
    help: field.description,
    id: inputId,
    className: "ap-duration-field",
    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
      className: "ap-duration-controls",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("input", {
        id: inputId,
        type: "number",
        min: minCanonical / active.factor,
        max: Number.isFinite(maxCanonical) ? maxCanonical / active.factor : undefined,
        step: active.inputStep || 1,
        className: "components-text-control__input ap-duration-number",
        value: amount,
        onChange: e => emit(e.target.value)
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("select", {
        className: "components-select-control__input ap-duration-unit",
        "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Unit', 'aponto'),
        value: unit,
        onChange: e => setUnit(e.target.value),
        children: units.map(u => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("option", {
          value: u.value,
          children: u.label
        }, u.value))
      })]
    })
  });
}
const FIELD_TYPES = {
  ..._pressmaximum_dashboard_kit__WEBPACK_IMPORTED_MODULE_3__.BASE_FIELD_TYPES,
  textarea: TextareaField,
  duration: DurationField
};

/** Flatten the nested `GET /settings` DTO into the flat, dotted schema keys. */
function flatten(dto) {
  const flat = {};
  Object.keys(dto || {}).forEach(key => {
    const value = dto[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.keys(value).forEach(leaf => {
        flat[`${key}.${leaf}`] = value[leaf];
      });
    } else {
      flat[key] = value;
    }
  });
  return flat;
}

/** Rebuild the nested PUT payload from a flat, dotted map. */
function unflatten(flat) {
  const dto = {};
  Object.keys(flat).forEach(key => {
    const dot = key.indexOf('.');
    if (dot === -1) {
      dto[key] = flat[key];
      return;
    }
    const group = key.slice(0, dot);
    const leaf = key.slice(dot + 1);
    if (!dto[group] || typeof dto[group] !== 'object') {
      dto[group] = {};
    }
    dto[group][leaf] = flat[key];
  });
  return dto;
}

/** Coerce a control's raw value back to the schema type so dirty-diffing + save are exact. */
function coerce(type, raw) {
  if (type === 'int') {
    return raw === '' || raw === null || raw === undefined ? null : Number(raw);
  }
  if (type === 'bool') {
    return Boolean(raw);
  }
  return raw === null || raw === undefined ? '' : String(raw);
}
function SettingsApp({
  panels = [],
  extras = []
}) {
  const {
    confirm,
    dialog
  } = (0,_lib_confirm_jsx__WEBPACK_IMPORTED_MODULE_7__.useConfirmDialog)();
  const [savedFlat, setSavedFlat] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
  const [edited, setEdited] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)({});
  const [fieldErrors, setFieldErrors] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)({});
  const [loading, setLoading] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(true);
  const [loadError, setLoadError] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('');
  const [saving, setSaving] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [error, setError] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('');
  const [notice, setNotice] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('');
  const [conflict, setConflict] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [pendingNav, setPendingNav] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
  const schema = _lib_config_js__WEBPACK_IMPORTED_MODULE_5__.config.settingsSchema;
  const typeByKey = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useMemo)(() => {
    const map = {};
    schema.forEach(entry => {
      map[entry.key] = entry.type;
    });
    return map;
  }, [schema]);
  const isDirty = Object.keys(edited).length > 0;
  const {
    setDirty
  } = (0,_pressmaximum_dashboard_kit__WEBPACK_IMPORTED_MODULE_3__.useDirtyState)('aponto-settings', {
    onDiscard: () => {
      setEdited({});
      setFieldErrors({});
    },
    discardMessage: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('You have unsaved settings. Discard them?', 'aponto')
  });
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => setDirty(isDirty), [isDirty, setDirty]);

  // Nav guard (C1 review fix 2): while dirty, in-app navigation asks first.
  // The handler stashes the navigation intent; the ConfirmDialog below decides.
  const guardHandlerRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (!isDirty) {
      return undefined;
    }
    const handler = (proceed, cancel) => setPendingNav({
      proceed,
      cancel
    });
    guardHandlerRef.current = handler;
    (0,_lib_nav_guard_js__WEBPACK_IMPORTED_MODULE_8__.setNavGuard)(handler);
    return () => {
      (0,_lib_nav_guard_js__WEBPACK_IMPORTED_MODULE_8__.clearNavGuard)(handler);
      if (guardHandlerRef.current === handler) {
        guardHandlerRef.current = null;
      }
    };
  }, [isDirty]);
  const confirmPendingNav = () => {
    const nav = pendingNav;
    setPendingNav(null);
    setEdited({});
    setFieldErrors({});
    // Clear the guard synchronously — the state flip above only unregisters it
    // on the NEXT render, which would re-intercept the navigation we resume.
    if (guardHandlerRef.current) {
      (0,_lib_nav_guard_js__WEBPACK_IMPORTED_MODULE_8__.clearNavGuard)(guardHandlerRef.current);
      guardHandlerRef.current = null;
    }
    nav?.proceed();
  };
  const cancelPendingNav = () => {
    const nav = pendingNav;
    setPendingNav(null);
    nav?.cancel?.();
  };
  const load = () => {
    setLoading(true);
    setLoadError('');
    setConflict(false);
    _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.get('/settings').then(dto => {
      setSavedFlat(flatten(dto));
      setLoading(false);
    }).catch(err => {
      setLoadError(err.message || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Could not load settings.', 'aponto'));
      setLoading(false);
    });
  };
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(load, []);

  // Conflict reload (§2.11 addendum): explicit, never automatic — discards the
  // local edits and re-fetches the server truth (fresh values + revision).
  const reloadAfterConflict = () => {
    setEdited({});
    setFieldErrors({});
    setError('');
    load();
  };
  const currentValue = key => Object.prototype.hasOwnProperty.call(edited, key) ? edited[key] : (savedFlat || {})[key];
  const onFieldChange = (_panelId, key, next) => {
    const value = coerce(typeByKey[key], next);
    setEdited(prev => {
      const out = {
        ...prev
      };
      if (Object.is(value, (savedFlat || {})[key])) {
        delete out[key];
      } else {
        out[key] = value;
      }
      return out;
    });
    setFieldErrors(prev => {
      if (!prev[key]) {
        return prev;
      }
      const out = {
        ...prev
      };
      delete out[key];
      return out;
    });
    setNotice('');
  };
  const save = async () => {
    // Currency changes re-interpret every stored price at the new ISO exponent — explicit
    // in-app confirm before proceeding (Codex review item 1; C13 / review F item 3 replaced
    // the browser-native confirm with the shared Modal dialog).
    if ((0,_lib_currency_guard_js__WEBPACK_IMPORTED_MODULE_6__.currencyChangeRequiresConfirm)(savedFlat, edited)) {
      const ok = await confirm({
        title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Change the store currency?', 'aponto'),
        message: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Existing prices keep their numbers but will be read in the new currency — review your service prices after saving.', 'aponto'),
        confirmText: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Change currency', 'aponto')
      });
      if (!ok) {
        return;
      }
    }
    setSaving(true);
    setError('');
    setNotice('');
    setFieldErrors({});
    const payload = unflatten({
      ...savedFlat,
      ...edited
    });
    _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.put('/settings', payload).then(dto => {
      setSavedFlat(flatten(dto));
      setEdited({});
      setSaving(false);
      setConflict(false);
      setNotice((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Settings saved.', 'aponto'));
    }).catch(err => {
      setSaving(false);
      if (err.status === 409 && err.code === 'aponto_settings_conflict') {
        // Stale revision — someone else saved since this form loaded.
        // Banner + explicit Reload; never overwrite automatically.
        setConflict(true);
      } else if (err.status === 422 && err.data && err.data.fields) {
        setFieldErrors(err.data.fields);
        setError((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Some settings need attention — see the highlighted fields.', 'aponto'));
      } else {
        setError(err.message || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Could not save settings.', 'aponto'));
      }
    });
  };
  const discard = async () => {
    // In-app dialog (C13 / review F item 3): destructive styling — the edits are lost for good.
    if (!isDirty || (await confirm({
      title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Discard your unsaved changes?', 'aponto'),
      message: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Everything you edited since the last save will be lost.', 'aponto'),
      confirmText: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Discard changes', 'aponto'),
      cancelText: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Keep editing', 'aponto'),
      destructive: true
    }))) {
      setEdited({});
      setFieldErrors({});
      setError('');
    }
  };
  if (loading) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(_lib_ui_jsx__WEBPACK_IMPORTED_MODULE_9__.RouteLoading, {
      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Loading settings…', 'aponto')
    });
  }
  if (loadError) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(_lib_ui_jsx__WEBPACK_IMPORTED_MODULE_9__.RouteError, {
      message: loadError,
      onRetry: load
    });
  }
  const sectionPanels = panelsForSection(schema, panels, currentValue, fieldErrors);
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
    className: "ap-settings-app",
    children: [conflict ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Notice, {
      status: "error",
      isDismissible: false,
      className: "ap-settings-conflict",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
        className: "ap-settings-conflict-body",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("span", {
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Settings changed elsewhere — reload to get the latest values. Reloading discards your unsaved edits.', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Button, {
          variant: "secondary",
          onClick: reloadAfterConflict,
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Reload settings', 'aponto')
        })]
      })
    }) : null, error ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Notice, {
      status: "error",
      isDismissible: true,
      onRemove: () => setError(''),
      children: error
    }) : null, notice ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Notice, {
      status: "success",
      isDismissible: true,
      onRemove: () => setNotice(''),
      children: notice
    }) : null, sectionPanels.map(({
      panel,
      values
    }) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Card, {
      className: "ap-settings-card",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardHeader, {
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("h2", {
            id: (0,_pressmaximum_dashboard_kit__WEBPACK_IMPORTED_MODULE_3__.panelHeadingId)(panel.id),
            className: "ap-settings-card-title",
            children: panel.label
          }), panel.description ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("p", {
            className: "ap-settings-card-desc",
            children: panel.description
          }) : null]
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardBody, {
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(_pressmaximum_dashboard_kit__WEBPACK_IMPORTED_MODULE_3__.SchemaForm, {
          panel: panel,
          values: values,
          onFieldChange: onFieldChange,
          fieldTypes: FIELD_TYPES
        })
      })]
    }, panel.id)), extras.includes('business-hours') ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(_BusinessHoursPanel_jsx__WEBPACK_IMPORTED_MODULE_11__["default"], {}) : null, extras.includes('appearance-hint') ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(AppearanceHint, {}) : null, extras.includes('privacy-launcher') ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(PrivacyLauncher, {}) : null, extras.includes('system-status') ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(SystemStatus, {}) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(_pressmaximum_dashboard_kit__WEBPACK_IMPORTED_MODULE_3__.SaveBar, {
      isDirty: isDirty,
      isSaving: saving,
      onSave: save,
      onReset: discard,
      resetDisabledWhenNotDirty: true,
      labels: {
        regionLabel: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Settings actions', 'aponto'),
        saveLabel: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Save changes', 'aponto'),
        savingLabel: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Saving…', 'aponto'),
        resetLabel: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Discard changes', 'aponto'),
        statusSaved: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('No unsaved changes', 'aponto'),
        statusDirty: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Unsaved changes', 'aponto'),
        statusSaving: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Saving…', 'aponto')
      }
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.__experimentalConfirmDialog, {
      isOpen: !!pendingNav,
      onConfirm: confirmPendingNav,
      onCancel: cancelPendingNav,
      confirmButtonText: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Discard changes', 'aponto'),
      cancelButtonText: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Keep editing', 'aponto'),
      children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('You have unsaved settings. Leaving now will discard them.', 'aponto')
    }), dialog]
  });
}

/**
 * Build the SchemaForm panels for a section: keep the schema keys (in schema
 * order) whose `panel` the section asked for, group them by panel, attach
 * presentation, and project the current values into the kit's
 * `values[panelId][fieldId]` shape.
 *
 * Panels the tree never names (`theme`, `notifications.*`) simply do not render —
 * their values still round-trip through the full-replacement PUT.
 */
function panelsForSection(schema, panels, currentValue, fieldErrors) {
  const allowed = Array.isArray(panels) ? panels : [];
  const order = [];
  const byPanel = {};
  schema.filter(entry => allowed.includes(entry.panel)).forEach(entry => {
    if (!byPanel[entry.panel]) {
      byPanel[entry.panel] = [];
      order.push(entry.panel);
    }
    byPanel[entry.panel].push(entry);
  });
  return order.map(panelId => {
    const meta = _catalog_js__WEBPACK_IMPORTED_MODULE_10__.PANEL_META[panelId] || {
      label: panelId
    };
    const fields = byPanel[panelId].map(entry => buildField(entry, fieldErrors, currentValue(entry.key)));
    const values = {
      [panelId]: Object.fromEntries(byPanel[panelId].map(entry => [entry.key, currentValue(entry.key)]))
    };
    return {
      panel: {
        id: panelId,
        label: meta.label,
        description: meta.description,
        fields
      },
      values
    };
  });
}

/** Assemble a kit SchemaField descriptor from a schema entry + presentation catalog. */
function buildField(entry, fieldErrors, value) {
  const meta = _catalog_js__WEBPACK_IMPORTED_MODULE_10__.FIELD_META[entry.key] || {};
  const control = meta.control || (0,_catalog_js__WEBPACK_IMPORTED_MODULE_10__.controlForType)(entry.type);
  const err = fieldErrors[entry.key];
  let description = meta.help || null;
  if (err) {
    description = /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.Fragment, {
      children: [meta.help ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("span", {
        children: [meta.help, " "]
      }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("span", {
        className: "ap-field-error",
        children: err
      })]
    });
  }
  // A stored value outside a select's menu (e.g. an exotic ISO currency set via REST) stays
  // selectable: merge it in front so the select never silently shows the wrong choice (U2 FB6).
  let options = meta.options;
  if (control === 'select' && Array.isArray(options) && value !== undefined && value !== null && value !== '') {
    const current = String(value);
    if (!options.some(option => String(option.value) === current)) {
      options = [{
        value: current,
        label: current
      }, ...options];
    }
  }
  return {
    id: entry.key,
    type: control,
    label: meta.label || entry.key,
    description,
    options,
    units: meta.units,
    min: meta.min,
    max: meta.max,
    maxLength: meta.maxLength
  };
}

/**
 * General-tab discovery card (C9 — finding U1 Maria): the booking form's accent color and corner
 * radius moved to the block Inspector (Q11), which the salon owner couldn't find. Point at it, and
 * deep-link to the booking page's editor when one exists (`config.bookingPage.editUrl`).
 */
function AppearanceHint() {
  const page = _lib_config_js__WEBPACK_IMPORTED_MODULE_5__.config.bookingPage;
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Card, {
    className: "ap-settings-card",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardHeader, {
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("h2", {
          className: "ap-settings-card-title",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Booking form appearance', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("p", {
          className: "ap-settings-card-desc",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('The accent color and corner radius are part of the booking form block.', 'aponto')
        })]
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardBody, {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("p", {
        className: "ap-hint-steps",
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('To change them: open the page that holds your booking form, select the Aponto booking form block, then adjust the color and rounding in the block settings (Inspector) on the right.', 'aponto')
      }), page && page.editUrl ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("div", {
        className: "ap-settings-actions-row",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Button, {
          variant: "secondary",
          href: page.editUrl,
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Edit booking page', 'aponto')
        })
      }) : null]
    })]
  });
}

/** Privacy tab launcher: deep-links to WordPress's built-in export/erase tools (§5). */
function PrivacyLauncher() {
  const tools = _lib_config_js__WEBPACK_IMPORTED_MODULE_5__.config.privacyTools || {};
  if (!tools.export && !tools.erase) {
    return null;
  }
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Card, {
    className: "ap-settings-card",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardHeader, {
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("h2", {
          className: "ap-settings-card-title",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Data access requests', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("p", {
          className: "ap-settings-card-desc",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Handle GDPR export and erasure requests with WordPress’s built-in privacy tools — Aponto data is included automatically.', 'aponto')
        })]
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardBody, {
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
        className: "ap-settings-actions-row",
        children: [tools.export ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Button, {
          variant: "secondary",
          href: tools.export,
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Export personal data', 'aponto')
        }) : null, tools.erase ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Button, {
          variant: "secondary",
          href: tools.erase,
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Erase personal data', 'aponto')
        }) : null]
      })
    })]
  });
}

/** Advanced tab read-only system diagnostics (rest-contract §2.15). */
function SystemStatus() {
  const [data, setData] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
  const [err, setErr] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('');
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    let alive = true;
    _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.get('/system/diagnostics').then(res => alive && setData(res)).catch(e => alive && setErr(e.message || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Could not load diagnostics.', 'aponto')));
    return () => {
      alive = false;
    };
  }, []);
  const rows = [];
  if (data) {
    const push = (label, value) => value !== undefined && value !== null && rows.push([label, String(value)]);
    push((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Plugin version', 'aponto'), data.plugin?.version);
    push((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Edition', 'aponto'), data.plugin?.edition);
    push((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('WordPress', 'aponto'), data.wordpress?.version);
    push((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('PHP', 'aponto'), data.runtime?.php);
    push((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Database', 'aponto'), data.runtime?.database);
    push((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Schema version', 'aponto'), data.schema?.version);
    push((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Tables OK', 'aponto'), data.schema?.tables_ok ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Yes', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('No', 'aponto'));
    push((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Timezone', 'aponto'), data.settings?.timezone);
    if (data.counts) {
      push((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Services', 'aponto'), data.counts.services);
      push((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Staff', 'aponto'), data.counts.staff);
      push((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Bookings', 'aponto'), data.counts.bookings);
    }
  }
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Card, {
    className: "ap-settings-card",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardHeader, {
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("h2", {
          className: "ap-settings-card-title",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('System status', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("p", {
          className: "ap-settings-card-desc",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('A read-only snapshot for support. No personal data is included.', 'aponto')
        })]
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardBody, {
      children: err ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Notice, {
        status: "warning",
        isDismissible: false,
        children: err
      }) : !data ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Spinner, {}) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.Fragment, {
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("dl", {
          className: "ap-diagnostics",
          children: rows.map(([label, value]) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("dt", {
              children: label
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("dd", {
              children: value
            })]
          }, label))
        }), Array.isArray(data.checks) && data.checks.length ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("ul", {
          className: "ap-diagnostics-checks",
          children: data.checks.map(check => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("li", {
            "data-status": check.status,
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("strong", {
              children: check.code
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("span", {
              children: check.status
            })]
          }, check.code))
        }) : null]
      })
    })]
  });
}

/***/ },

/***/ "./assets/src/admin/settings/catalog.js"
/*!**********************************************!*\
  !*** ./assets/src/admin/settings/catalog.js ***!
  \**********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   FIELD_META: () => (/* binding */ FIELD_META),
/* harmony export */   PANEL_META: () => (/* binding */ PANEL_META),
/* harmony export */   controlForType: () => (/* binding */ controlForType)
/* harmony export */ });
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _lib_config_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../lib/config.js */ "./assets/src/admin/lib/config.js");
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



/** Panel headings/descriptions keyed by the PHP schema `panel` slug. */
const PANEL_META = {
  business: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Business', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Shown on confirmations, emails and the calendar file.', 'aponto')
  },
  localization: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Localization', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('How dates, times and money are formatted.', 'aponto')
  },
  policy: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Booking policy', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Availability rules applied to every service unless a service overrides them.', 'aponto')
  },
  payments: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Payments', 'aponto'),
    // Says WHOSE rules these are, because the panel sits one click away from a gateway's own
    // settings and the two are easy to confuse: the gateway owns keys and receipts, this panel
    // owns what the site requires of a customer before a slot is theirs.
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('When customers pay online, and what happens while they do. Applies to every payment method.', 'aponto')
  },
  collection: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Booking form', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('What you ask customers for when they book.', 'aponto')
  },
  consent: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Consent', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Add a consent checkbox to the booking form.', 'aponto')
  },
  retention: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Data retention', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Automatically anonymize personal data after a while.', 'aponto')
  },
  diagnostics: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Diagnostics', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Troubleshooting switches for support.', 'aponto')
  },
  data: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Data & uninstall', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('What happens to your data when the plugin is removed.', 'aponto')
  }
};
const weekdayOptions = () => [{
  value: '0',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Sunday', 'aponto')
}, {
  value: '1',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Monday', 'aponto')
}, {
  value: '2',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Tuesday', 'aponto')
}, {
  value: '3',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Wednesday', 'aponto')
}, {
  value: '4',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Thursday', 'aponto')
}, {
  value: '5',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Friday', 'aponto')
}, {
  value: '6',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Saturday', 'aponto')
}];

// Unit switchers for the `duration` control (C5): the UI shows a value + unit, converts to the
// canonical stored unit and back. Lead time is stored in MINUTES; the booking window in DAYS —
// each `factor` is "canonical units per menu unit". The largest unit that divides the stored value
// evenly is shown by default, so 60 → "1 hour", 1440 → "1 day", 365 → "365 days". `inputStep`
// drives the number input's step: fractional (0.5) for the larger units so "1.5 hours" is a valid
// entry (review F item 7); the canonical value is always rounded to an integer.
const LEAD_UNITS = () => [{
  value: 'minutes',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('minutes', 'aponto'),
  factor: 1,
  inputStep: 1
}, {
  value: 'hours',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('hours', 'aponto'),
  factor: 60,
  inputStep: 0.5
}, {
  value: 'days',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('days', 'aponto'),
  factor: 1440,
  inputStep: 0.5
}];
const HORIZON_UNITS = () => [{
  value: 'days',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('days', 'aponto'),
  factor: 1,
  inputStep: 1
}, {
  value: 'weeks',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('weeks', 'aponto'),
  factor: 7,
  inputStep: 1
}, {
  value: 'months',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('months (30 days)', 'aponto'),
  factor: 30,
  inputStep: 1
}];

/**
 * Per-field presentation, keyed by settings dotted key.
 *   - `control` overrides the control derived from the PHP `type`
 *     (bool→boolean, int→number, string→text).
 *   - `options` supply select/radio choices (values are strings — the kit
 *     controls stringify, and the save step coerces back to the schema type).
 *   - `help` is the inline hint; `maxLength` caps text input.
 */
const FIELD_META = {
  'business.name': {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Business name', 'aponto'),
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Shown on confirmations, emails and the calendar (.ics) file.', 'aponto')
  },
  'business.address': {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Business address', 'aponto'),
    control: 'textarea',
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Used as the location on confirmations, emails and the calendar file.', 'aponto')
  },
  'business.phone': {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Business phone', 'aponto')
  },
  'business.email': {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Booking alerts email', 'aponto'),
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Where new-booking and cancellation alerts are sent. Leave blank to use the WordPress admin email.', 'aponto')
  },
  currency: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Currency', 'aponto'),
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Used for service prices and order totals.', 'aponto'),
    // Same neutral global menu as the wizard (fleet-r1 U2 FB6) — a select, not a free-typed
    // ISO code. A stored code outside the menu is merged in at render (SettingsApp).
    control: 'select',
    options: _lib_config_js__WEBPACK_IMPORTED_MODULE_1__.config.currencies.map(code => ({
      value: code,
      label: code
    }))
  },
  date_format: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Date format', 'aponto'),
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('PHP date format, e.g. F j, Y.', 'aponto')
  },
  time_format: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Time format', 'aponto'),
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('PHP time format, e.g. g:i a.', 'aponto')
  },
  week_starts_on: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Week starts on', 'aponto'),
    control: 'select',
    options: weekdayOptions()
  },
  default_booking_status: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('New bookings are', 'aponto'),
    control: 'radio',
    options: [{
      value: 'pending',
      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Pending — you approve each one', 'aponto')
    }, {
      value: 'confirmed',
      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Confirmed automatically', 'aponto')
    }]
  },
  min_lead_minutes: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Minimum lead time', 'aponto'),
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('How soon before an appointment a customer may book. 0 = no minimum.', 'aponto'),
    control: 'duration',
    units: LEAD_UNITS(),
    // Canonical-unit bounds (review F item 7): 0 … 30 days of minutes.
    min: 0,
    max: 43200
  },
  max_horizon_days: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Booking window', 'aponto'),
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('How far ahead customers can book.', 'aponto'),
    control: 'duration',
    units: HORIZON_UNITS(),
    // Canonical-unit bounds (review F item 7): the server requires ≥ 1 day; cap at 2 years.
    min: 1,
    max: 730
  },
  slot_step_default: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Time-slot interval (minutes)', 'aponto'),
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Default gap between the start times you offer.', 'aponto')
  },
  min_cancel_hours: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Cancellation notice (hours)', 'aponto'),
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('How long before the appointment a customer may still cancel. 0 = any time up to the start.', 'aponto')
  },
  pending_auto_cancel_hours: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Auto-cancel unconfirmed after (hours)', 'aponto'),
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Cancel still-pending bookings automatically. 0 = never.', 'aponto')
  },
  'payments.mode': {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Online payment', 'aponto'),
    control: 'select',
    options: [{
      value: 'off',
      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Off — pay on-site only', 'aponto')
    }, {
      value: 'optional',
      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Optional — customers choose', 'aponto')
    }, {
      value: 'required',
      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Required — online payment needed to book', 'aponto')
    }],
    // The honest caveat, and it is the server's own rule (D-R38a(1)): `required` with no gateway
    // ready behaves like `off`, because refusing every booking when nobody has configured a
    // gateway takes the site's bookings down.
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Until a payment method is set up and switched on, this behaves as if payment were off — bookings are never refused because no gateway is ready.', 'aponto')
  },
  'payments.hold_minutes': {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Hold the slot for', 'aponto'),
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('How long a slot stays reserved while the customer pays. The slot is released automatically if the payment is not completed. 10 to 1440 minutes.', 'aponto'),
    min: 10,
    max: 1440
  },
  'payments.auto_confirm': {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Confirm automatically when paid', 'aponto'),
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Confirm the booking as soon as the payment succeeds, instead of leaving it pending for you to approve.', 'aponto')
  },
  'booking.auto_confirm_free': {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Auto-confirm free bookings', 'aponto'),
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('When a service is free (price 0), confirm it immediately instead of leaving it pending. Priced services still follow “New bookings are” above.', 'aponto')
  },
  'customer_fields.phone': {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Phone number field', 'aponto'),
    control: 'radio',
    options: [{
      value: 'off',
      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Don’t ask for a phone number', 'aponto')
    }, {
      value: 'optional',
      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Optional', 'aponto')
    }, {
      value: 'required',
      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Required', 'aponto')
    }]
  },
  'consent_checkbox.enabled': {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Show a consent checkbox', 'aponto'),
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Ask customers to agree before they can book.', 'aponto')
  },
  'consent_checkbox.text': {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Consent text', 'aponto'),
    control: 'textarea',
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('The wording shown next to the checkbox.', 'aponto')
  },
  data_retention_months: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Anonymize personal data after (months)', 'aponto'),
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('0 = keep indefinitely. Runs on a daily schedule.', 'aponto')
  },
  debug_log: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Enable debug logging', 'aponto'),
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Records diagnostic events for support. Turns itself off after 72 hours.', 'aponto')
  },
  trusted_proxy: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Behind a trusted proxy', 'aponto'),
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Read the visitor IP from X-Forwarded-For. Only enable if a reverse proxy sets it.', 'aponto')
  },
  delete_data_on_uninstall: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Delete all data on uninstall', 'aponto'),
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('When the plugin is deleted, permanently remove every Aponto table, option and setting. Off by default.', 'aponto')
  }
};

/** Map a PHP schema value `type` to the default kit control key. */
function controlForType(type) {
  switch (type) {
    case 'bool':
      return 'boolean';
    case 'int':
      return 'number';
    default:
      return 'text';
  }
}

/***/ }

}]);
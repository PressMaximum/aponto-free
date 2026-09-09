"use strict";
(globalThis["webpackChunkaponto"] = globalThis["webpackChunkaponto"] || []).push([["admin-chunk-staff"],{

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

/***/ "./assets/src/admin/routes/Staff.jsx"
/*!*******************************************!*\
  !*** ./assets/src/admin/routes/Staff.jsx ***!
  \*******************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Staff: () => (/* binding */ Staff)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _tanstack_react_table__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @tanstack/react-table */ "./node_modules/@tanstack/table-core/build/lib/index.mjs");
/* harmony import */ var _pressmaximum_dashboard_kit_table__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @pressmaximum/dashboard-kit/table */ "./node_modules/@pressmaximum/dashboard-kit/build/table/index.mjs");
/* harmony import */ var _lib_api_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../lib/api.js */ "./assets/src/admin/lib/api.js");
/* harmony import */ var _lib_config_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/config.js */ "./assets/src/admin/lib/config.js");
/* harmony import */ var _modules_catalog_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../modules/catalog.js */ "./assets/src/admin/modules/catalog.js");
/* harmony import */ var _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../lib/icon.jsx */ "./assets/src/admin/lib/icon.jsx");
/* harmony import */ var _lib_ui_jsx__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../lib/ui.jsx */ "./assets/src/admin/lib/ui.jsx");
/* harmony import */ var _lib_toast_jsx__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../lib/toast.jsx */ "./assets/src/admin/lib/toast.jsx");
/* harmony import */ var _lib_confirm_jsx__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../lib/confirm.jsx */ "./assets/src/admin/lib/confirm.jsx");
/* harmony import */ var _lib_RowMenu_jsx__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../lib/RowMenu.jsx */ "./assets/src/admin/lib/RowMenu.jsx");
/* harmony import */ var _lib_facets_jsx__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../lib/facets.jsx */ "./assets/src/admin/lib/facets.jsx");
/* harmony import */ var _StaffWorkspace_jsx__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./StaffWorkspace.jsx */ "./assets/src/admin/routes/StaffWorkspace.jsx");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_13___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_13__);
/**
 * Staff route (SPEC-P1 §1.2 / mockup §7.5). Free opens the lowest-id staff record
 * directly; Premium multi-staff keeps the collection table. Add/Edit use the same
 * full-page workspace (StaffWorkspace).
 *
 * Multi-staff shipped with D-R28 (2026-08-27). Adding staff is gated on
 * `moduleAvailable( config, 'multi_staff' )` — never on `config.edition`, which §5
 * invariant 3 reserves for Plan. REST storage remains uncapped (D-R42), but the Free
 * admin presentation is a singleton surface and does not render the collection table.
 *
 * Note (B4b ripple, now partly resolved): a Service filter facet is still omitted.
 * `GET /services/{id}/eligibility` gives the forward read and the staff detail
 * response carries `service_ids`, but the LIST response carries only
 * `service_count`, so filtering the table by service would need a fan-out of
 * per-row requests. Status facet only. See the debt note on server-side pagination.
 */














const STATUS_OPTIONS = [{
  value: 'active',
  label: 'Active'
}, {
  value: 'archived',
  label: 'Archived'
}];
// Free owns a singleton ADMIN PRESENTATION only. REST/storage stay uncapped (D-R42); keeping this
// count in the UI prevents a product-display rule from becoming a PHP or database quota.
const FREE_STAFF_PROFILE_COUNT = 1;
const columnHelper = (0,_tanstack_react_table__WEBPACK_IMPORTED_MODULE_1__.createColumnHelper)();
// Status is an enum: the value IS the identity (unlike the record-keyed service/staff/
// category facets — lib/facet-options.js). Chip labels resolve from `options`.
const FACETS = [{
  id: 'status',
  label: 'Status',
  type: 'multi',
  options: STATUS_OPTIONS
}];
function Staff({
  segments = []
}) {
  const showToast = (0,_lib_toast_jsx__WEBPACK_IMPORTED_MODULE_8__.useToast)();
  const {
    confirm,
    dialog
  } = (0,_lib_confirm_jsx__WEBPACK_IMPORTED_MODULE_9__.useConfirmDialog)();
  const multiStaff = (0,_modules_catalog_js__WEBPACK_IMPORTED_MODULE_5__.moduleAvailable)(_lib_config_js__WEBPACK_IMPORTED_MODULE_4__.config, 'multi_staff');
  const [state, setState] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)({
    status: 'loading',
    rows: [],
    error: null
  });
  const [workspace, setWorkspace] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null); // { mode, staff }
  // `#staff/<id>` opens that staff member's workspace, the same way `#services/<tab>`
  // seeds the Services tab (routes/Services.jsx): the hash SEEDS the surface, it does not
  // own it. The list rows keep driving the workspace through local state, so Edit works
  // whatever the hash says — including when it already reads `#staff/<id>`.
  const deepLinkId = segments[1] ? String(segments[1]) : '';
  const openedDeepLink = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)('');
  const load = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
    setState(s => ({
      ...s,
      status: s.rows.length ? s.status : 'loading',
      error: null
    }));
    const query = multiStaff ? {
      status: 'all',
      per_page: 100
    } : {
      status: 'all',
      order_by: 'id',
      page: 1,
      per_page: FREE_STAFF_PROFILE_COUNT
    };
    _lib_api_js__WEBPACK_IMPORTED_MODULE_3__.api.get('/staff', query).then(res => {
      const rows = (res.items || []).map(dto => ({
        ...dto,
        serviceCount: Number(dto.service_count) || 0,
        availability: dto.has_custom_hours ? 'Custom hours' : 'Business hours'
      }));
      setState({
        status: rows.length ? 'ready' : 'empty',
        rows,
        error: null
      });
    }).catch(err => setState({
      status: 'error',
      rows: [],
      error: err.message
    }));
  }, [multiStaff]);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(load, [load]);

  // On multi-staff, apply the deep link ONCE per requested id, and only after the list has loaded (the
  // workspace needs the row DTO). Never closes anything: an id that no longer exists — or a
  // workspace the admin closed by hand — leaves the list on screen instead of fighting it.
  // Free resolves its one visible profile directly below and deliberately ignores record deep links.
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!multiStaff || '' === deepLinkId || openedDeepLink.current === deepLinkId || 'loading' === state.status) {
      return;
    }
    openedDeepLink.current = deepLinkId;
    const row = state.rows.find(item => String(item.id) === deepLinkId);
    if (row) {
      setWorkspace({
        mode: 'edit',
        staff: row
      });
    }
  }, [multiStaff, deepLinkId, state.status, state.rows]);
  const staffCount = state.rows.length;
  const singletonWorkspace = (0,react__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => {
    if (multiStaff) {
      return null;
    }
    if ('empty' === state.status) {
      return {
        mode: 'create'
      };
    }
    if ('ready' !== state.status || !state.rows.length) {
      return null;
    }
    return {
      mode: 'edit',
      staff: state.rows[0]
    };
  }, [multiStaff, state.status, state.rows]);
  const onAdd = () => {
    setWorkspace({
      mode: 'create'
    });
  };

  // Archive is the safe, reversible default (C1 archive-first, as on Services): the staff row
  // survives for history and stops taking new bookings. `PATCH /staff/{id}` owns the status.
  const onArchive = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(async row => {
    const ok = await confirm({
      title: `Archive ${row.name}?`,
      message: 'They stop taking new bookings and are kept for history. You can restore them any time.',
      confirmText: 'Archive',
      destructive: true
    });
    if (!ok) {
      return;
    }
    try {
      await _lib_api_js__WEBPACK_IMPORTED_MODULE_3__.api.patch(`/staff/${row.id}`, {
        status: 'archived'
      });
      showToast(`${row.name} archived.`);
      load();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }, [confirm, showToast, load]);
  const onRestore = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(async row => {
    try {
      await _lib_api_js__WEBPACK_IMPORTED_MODULE_3__.api.patch(`/staff/${row.id}`, {
        status: 'active'
      });
      showToast(`${row.name} restored.`);
      load();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }, [showToast, load]);

  // Permanent delete. `DELETE /staff/{id}` refuses with 409 `aponto_has_dependents` whenever the
  // member has ANY booking (StaffController::destroy checks it under the per-staff advisory
  // lock), and the list DTO carries no booking count — so unlike Services this action cannot be
  // hidden in advance. The 409 is therefore a normal outcome, not an error: say plainly what
  // happened and point at Archive. Deliberately NOT auto-archiving on the owner's behalf —
  // they asked to delete, and silently changing a different field instead is the kind of
  // surprise the U2 data-loss review flagged.
  const onDelete = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(async row => {
    const ok = await confirm({
      title: `Delete ${row.name} permanently?`,
      message: 'This can’t be undone — their profile, work hours and time off are removed for good. Only possible while they have no bookings; archive them instead to keep the history.',
      confirmText: 'Delete permanently',
      destructive: true
    });
    if (!ok) {
      return;
    }
    try {
      await _lib_api_js__WEBPACK_IMPORTED_MODULE_3__.api.del(`/staff/${row.id}`);
      showToast(`${row.name} deleted permanently.`);
      load();
    } catch (err) {
      if (err.code === 'aponto_has_dependents') {
        showToast(`${row.name} has bookings, so they can’t be deleted. Archive them instead to keep the history.`, 'danger');
      } else {
        showToast(err.message, 'danger');
      }
    }
  }, [confirm, showToast, load]);
  const columns = (0,react__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => [columnHelper.accessor('name', {
    header: 'Staff',
    size: 200,
    enableHiding: false,
    meta: {
      label: 'Staff'
    },
    cell: info => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_13__.jsxs)("span", {
      className: "ap-cell-identity",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_13__.jsx)("span", {
        className: "pmdk-avatar",
        "aria-hidden": "true",
        children: (info.getValue() || '?').trim().charAt(0).toUpperCase()
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_13__.jsx)("span", {
        className: "pmdk-cell-value pmdk-cell-strong",
        children: info.getValue()
      })]
    })
  }), columnHelper.accessor('email', {
    header: 'Email',
    size: 200,
    meta: {
      label: 'Email'
    },
    cell: info => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_13__.jsx)("span", {
      className: "pmdk-cell-value pmdk-cell-muted pd-ltr",
      children: info.getValue() || '—'
    })
  }), columnHelper.accessor('serviceCount', {
    id: 'services',
    header: 'Services',
    size: 100,
    enableSorting: false,
    meta: {
      label: 'Services'
    },
    cell: info => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_13__.jsxs)("span", {
      className: "pmdk-cell-value pmdk-cell-muted",
      children: [info.getValue(), " service", info.getValue() === 1 ? '' : 's']
    })
  }), columnHelper.accessor('availability', {
    id: 'availability',
    header: 'Availability',
    size: 150,
    enableSorting: false,
    meta: {
      label: 'Availability'
    },
    cell: info => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_13__.jsx)("span", {
      className: "pmdk-cell-value pmdk-cell-muted",
      children: info.getValue()
    })
  }), columnHelper.accessor('status', {
    id: 'status',
    header: 'Status',
    size: 110,
    meta: {
      label: 'Status'
    },
    filterFn: _lib_facets_jsx__WEBPACK_IMPORTED_MODULE_11__.inArrayFilter,
    cell: info => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_13__.jsx)("span", {
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
      const row = info.row.original;
      const items = [{
        action: 'edit',
        label: 'Edit staff',
        icon: 'note'
      }];
      // Archive (reversible) for a live member, Restore for an archived one — the same
      // archive-first shape the Services row menu uses. Delete stays offered in both
      // states because the list DTO cannot tell us whether it will be allowed; the 409
      // is handled in `onDelete`.
      if (row.status === 'archived') {
        items.push({
          action: 'restore',
          label: 'Restore staff',
          icon: 'arrows',
          separatorBefore: true
        });
      } else {
        items.push({
          action: 'archive',
          label: 'Archive staff',
          icon: 'prohibit',
          danger: true,
          separatorBefore: true
        });
      }
      items.push({
        action: 'delete',
        label: 'Delete permanently',
        icon: 'trash',
        danger: true
      });
      return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_13__.jsx)(_lib_RowMenu_jsx__WEBPACK_IMPORTED_MODULE_10__.RowMenu, {
        label: `Actions for ${row.name}`,
        renderIcon: _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_6__.renderIcon,
        items: items,
        onSelect: action => {
          if (action === 'edit') setWorkspace({
            mode: 'edit',
            staff: row
          });else if (action === 'archive') onArchive(row);else if (action === 'restore') onRestore(row);else if (action === 'delete') onDelete(row);
        }
      });
    }
  })], [onArchive, onRestore, onDelete]);
  const activeWorkspace = workspace || singletonWorkspace;
  const singletonDirect = !workspace && Boolean(singletonWorkspace);
  if (activeWorkspace) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_13__.jsx)(_StaffWorkspace_jsx__WEBPACK_IMPORTED_MODULE_12__.StaffWorkspace, {
      mode: activeWorkspace.mode,
      staff: activeWorkspace.staff,
      onClose: singletonDirect ? () => {
        window.location.hash = '#dashboard';
      } : () => setWorkspace(null),
      onSaved: load,
      closeAfterSave: !singletonDirect
    }, `${activeWorkspace.mode}-${activeWorkspace.staff?.id || 'new'}`);
  }
  const addButton = multiStaff || staffCount < FREE_STAFF_PROFILE_COUNT ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_13__.jsxs)("button", {
    className: "pmdk-button primary sm",
    type: "button",
    onClick: onAdd,
    children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_6__.renderIcon)('plus'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_13__.jsx)("span", {
      children: "Add staff"
    })]
  }) : null;
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_13__.jsxs)("div", {
    className: "pd-page",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_13__.jsxs)("div", {
      className: "pd-bookings-main",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_13__.jsx)(_lib_ui_jsx__WEBPACK_IMPORTED_MODULE_7__.PageHeader, {
        title: "Staff",
        actions: addButton
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_13__.jsx)("section", {
        className: "pd-data-list pmdk-data-list",
        "aria-label": "Staff list",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_13__.jsx)(_pressmaximum_dashboard_kit_table__WEBPACK_IMPORTED_MODULE_2__.PMDKDataTable, {
          columns: columns,
          data: state.rows,
          getRowId: row => String(row.id),
          status: state.status,
          states: {
            empty: {
              icon: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_6__.renderIcon)('user'),
              title: 'No staff yet',
              description: 'Your calendar has no availability until you add at least one staff member — usually yourself.',
              action: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_13__.jsxs)("button", {
                className: "pmdk-button primary sm",
                type: "button",
                onClick: onAdd,
                children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_6__.renderIcon)('plus'), "Add staff"]
              })
            },
            error: {
              title: 'Could not load staff',
              description: state.error || '',
              action: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_13__.jsxs)("button", {
                className: "pmdk-button sm",
                type: "button",
                onClick: load,
                children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_6__.renderIcon)('arrows'), "Retry"]
              })
            }
          },
          enableRowSelection: false,
          filterBuilder: ({
            table
          }) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_13__.jsx)(_lib_facets_jsx__WEBPACK_IMPORTED_MODULE_11__.Facets, {
            table: table,
            defs: FACETS,
            renderIcon: _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_6__.renderIcon
          }),
          activeFilters: ({
            table
          }) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_13__.jsx)(_lib_facets_jsx__WEBPACK_IMPORTED_MODULE_11__.FacetChips, {
            table: table,
            defs: FACETS,
            renderIcon: _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_6__.renderIcon
          }),
          filterCount: ({
            table
          }) => (0,_lib_facets_jsx__WEBPACK_IMPORTED_MODULE_11__.facetCount)(table, FACETS),
          onRowActivate: row => setWorkspace({
            mode: 'edit',
            staff: row
          }),
          getRowAriaLabel: row => `Edit ${row.name}`,
          renderIcon: _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_6__.renderIcon,
          itemsLabel: "staff",
          labels: {
            searchPlaceholder: 'Search staff…',
            searchAria: 'Search staff'
          },
          persistenceKey: "aponto.admin.staff.table.v1"
        })
      })]
    }), dialog]
  });
}

/***/ },

/***/ "./assets/src/admin/routes/StaffWorkspace.jsx"
/*!****************************************************!*\
  !*** ./assets/src/admin/routes/StaffWorkspace.jsx ***!
  \****************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   StaffWorkspace: () => (/* binding */ StaffWorkspace)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _lib_api_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../lib/api.js */ "./assets/src/admin/lib/api.js");
/* harmony import */ var _lib_config_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../lib/config.js */ "./assets/src/admin/lib/config.js");
/* harmony import */ var _lib_format_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/format.js */ "./assets/src/admin/lib/format.js");
/* harmony import */ var _calendar_constants_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../calendar/constants.js */ "./assets/src/admin/calendar/constants.js");
/* harmony import */ var _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../lib/icon.jsx */ "./assets/src/admin/lib/icon.jsx");
/* harmony import */ var _lib_toast_jsx__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../lib/toast.jsx */ "./assets/src/admin/lib/toast.jsx");
/* harmony import */ var _lib_confirm_jsx__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../lib/confirm.jsx */ "./assets/src/admin/lib/confirm.jsx");
/* harmony import */ var _lib_ui_jsx__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../lib/ui.jsx */ "./assets/src/admin/lib/ui.jsx");
/* harmony import */ var _lib_WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../lib/WeeklyHoursGrid.jsx */ "./assets/src/admin/lib/WeeklyHoursGrid.jsx");
/* harmony import */ var _modules_catalog_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../modules/catalog.js */ "./assets/src/admin/modules/catalog.js");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__);
/**
 * Staff workspace (SPEC-P1 §1.2/§1.3 / mockup §7.5) — full-page, one continuous
 * form with a sticky section nav scrolling to four anchors:
 *   1. Details    — avatar / name* / email* / phone / status (POST|PATCH /staff).
 *   2. Services   — READ-ONLY list of the services this member is eligible for, from the
 *                   additive `service_ids` on `GET /staff/{id}` (D-R28, the reverse of
 *                   `GET /services/{id}/eligibility`). Assignment is EDITED on the service,
 *                   not here: eligibility is a full-replacement PUT per service
 *                   (rest-contract §2.18), so two editors writing the same table from
 *                   opposite ends would let a staff-side save silently drop another
 *                   service's location pairs. One writer, one direction.
 *   3. Work hours — inherited business-hours summary + Customize (deep-copy the
 *                   business rows into staff rows) + Revert (drop staff weekly rows,
 *                   keep date overrides), via GET/PUT /staff/{id}/schedule (§1.3).
 *                   The section saves on its own AND is flushed by the page Save —
 *                   one continuous form must never drop a pending edit silently.
 *   4. Time off   — blocked periods (CRUD) that also render on the Calendar.
 */













const TZ = _lib_config_js__WEBPACK_IMPORTED_MODULE_3__.config.business.timezone;
const STATUS_OPTIONS = [{
  value: 'active',
  label: 'Active'
}, {
  value: 'archived',
  label: 'Archived'
}];
function businessWeeklyMap() {
  const map = {};
  (_lib_config_js__WEBPACK_IMPORTED_MODULE_3__.config.businessHours || []).forEach(row => {
    map[row.weekday] = row.periods || [];
  });
  return map;
}
function StaffWorkspace({
  mode,
  staff,
  onClose,
  onSaved,
  closeAfterSave = true
}) {
  const showToast = (0,_lib_toast_jsx__WEBPACK_IMPORTED_MODULE_7__.useToast)();
  const creating = mode === 'create';
  const [details, setDetails] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)({
    name: staff?.name || '',
    email: staff?.email || '',
    phone: staff?.phone || '',
    status: staff?.status || 'active'
  });
  const [saving, setSaving] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [fieldError, setFieldError] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)({});
  const [active, setActive] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)('details');
  const bodyRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  // Pending Work-hours edits, published by WorkHoursSection as `{ dirty, save }`
  // so the page-level Save can flush them (see saveDetails).
  const workHoursRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  const anchors = creating ? [['details', 'Details']] : [['details', 'Details'], ['services', 'Services'], ['hours', 'Work hours'], ['timeoff', 'Time off']];

  // Track the active section for the sticky nav.
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (creating || !bodyRef.current) {
      return undefined;
    }
    const sections = anchors.map(([id]) => bodyRef.current.querySelector(`#staff-${id}`)).filter(Boolean);
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) setActive(e.target.id.replace('staff-', ''));
      });
    },
    // Page-level scroll now (record-editor layout), so the viewport is the root.
    {
      root: null,
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0
    });
    sections.forEach(s => observer.observe(s));
    return () => observer.disconnect();
  }, [creating]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = key => e => setDetails(d => ({
    ...d,
    [key]: e.target.value
  }));
  const scrollTo = id => bodyRef.current?.querySelector(`#staff-${id}`)?.scrollIntoView({
    behavior: (0,_lib_ui_jsx__WEBPACK_IMPORTED_MODULE_9__.motionScrollBehavior)(),
    block: 'start'
  });
  const saveDetails = async () => {
    const errors = {};
    if (!details.name.trim()) errors.name = 'A name is required.';
    if (!/.+@.+\..+/.test(details.email.trim())) errors.email = 'A valid email is required.';
    if (Object.keys(errors).length) {
      setFieldError(errors);
      return;
    }
    setSaving(true);
    setFieldError({});
    const body = {
      name: details.name.trim(),
      email: details.email.trim(),
      phone: details.phone.trim(),
      status: details.status
    };
    try {
      if (creating) {
        await _lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.post('/staff', {
          ...body,
          type: 'human'
        });
        showToast(`${body.name} added.`);
      } else {
        await _lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.patch(`/staff/${staff.id}`, body);
        // This page is ONE continuous form, so the page Save must also persist a
        // pending Work-hours edit (PUT /staff/{id}/schedule, contract §2.6). It used
        // to save details only and unmount, dropping a Customize edit with no request
        // and no warning — silent data loss reported on the 1.0.0 free zip.
        const hours = workHoursRef.current;
        if (hours?.dirty) {
          try {
            await hours.save();
          } catch (hoursError) {
            // Half-save: the details landed, the schedule did not. Say so and keep
            // the editor open so the user can fix the hours and retry.
            showToast((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: %s: the reason the work hours could not be saved. */
            (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Staff details saved, but the work hours were not: %s', 'aponto'), hoursError.message), 'danger');
            onSaved?.();
            setSaving(false);
            return;
          }
        }
        showToast('Staff updated.');
      }
      onSaved?.();
      if (closeAfterSave) {
        onClose?.();
      }
    } catch (err) {
      if (err.data?.fields) {
        setFieldError(err.data.fields);
      } else {
        showToast(err.message, 'danger');
      }
      setSaving(false);
    }
  };
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
    className: "pd-page pd-record-editor-page pd-staff-editor-page",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("header", {
      className: "pd-record-editor-head",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("h1", {
        children: "Staff"
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
        className: "pd-record-editor-actions",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("button", {
          className: "pd-button",
          type: "button",
          onClick: onClose,
          children: "Cancel"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("button", {
          className: "pd-button primary",
          type: "button",
          disabled: saving,
          onClick: saveDetails,
          children: saving ? 'Saving…' : creating ? 'Add staff' : 'Save details'
        })]
      })]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
      className: "pd-record-editor-layout",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("aside", {
        className: "pd-editor-nav",
        "aria-label": "Staff editor sections",
        children: anchors.map(([id, label]) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("button", {
          type: "button",
          className: active === id ? 'is-active' : undefined,
          "aria-current": active === id ? 'true' : undefined,
          onClick: () => scrollTo(id),
          children: label
        }, id))
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
        className: "pd-record-editor-form",
        ref: bodyRef,
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("section", {
          id: "staff-details",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("header", {
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("h2", {
              children: "Details"
            })
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
            className: "pd-editor-section-body",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
              className: "ap-inspector-identity",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("span", {
                className: "pmdk-avatar is-large",
                "aria-hidden": "true",
                children: (details.name || '?').trim().charAt(0).toUpperCase()
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("strong", {
                  children: details.name || 'New staff member'
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("span", {
                  className: "pd-ltr",
                  children: details.email || 'No email'
                })]
              })]
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("label", {
              className: `pd-compact-field${fieldError.name ? ' has-error' : ''}`,
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("input", {
                value: details.name,
                placeholder: " ",
                required: true,
                onChange: set('name')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("span", {
                className: "pd-compact-label",
                children: "Full name"
              })]
            }), fieldError.name ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("p", {
              className: "ap-field-error",
              children: fieldError.name
            }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
              className: "pd-form-grid",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("label", {
                className: `pd-compact-field${fieldError.email ? ' has-error' : ''}`,
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("input", {
                  className: "pd-ltr",
                  type: "email",
                  value: details.email,
                  placeholder: " ",
                  required: true,
                  onChange: set('email')
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("span", {
                  className: "pd-compact-label",
                  children: "Email"
                })]
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("label", {
                className: "pd-compact-field",
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("input", {
                  className: "pd-ltr",
                  value: details.phone,
                  placeholder: " ",
                  onChange: set('phone')
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("span", {
                  className: "pd-compact-label",
                  children: "Phone"
                })]
              })]
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("label", {
              className: "pd-compact-field pd-compact-select is-filled",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("select", {
                value: details.status,
                onChange: set('status'),
                children: STATUS_OPTIONS.map(s => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("option", {
                  value: s.value,
                  children: s.label
                }, s.value))
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("span", {
                className: "pd-compact-label",
                children: "Status"
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("span", {
                className: "pd-field-end-icon",
                "aria-hidden": "true",
                children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_6__.renderIcon)('chevronDown')
              })]
            }), creating ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("p", {
              className: "pd-editor-note",
              children: "Work hours and time off can be set once the staff member is created."
            }) : null, !creating ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(CalendarConnections, {
              staffId: staff.id
            }) : null]
          })]
        }), !creating ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.Fragment, {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(ServicesSection, {
            staffId: staff.id,
            staffName: details.name
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(WorkHoursSection, {
            staffId: staff.id,
            showToast: showToast,
            saveRef: workHoursRef
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(TimeOffSection, {
            staffId: staff.id,
            showToast: showToast
          })]
        }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("footer", {
          className: "pd-editor-footer",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("button", {
            className: "pd-button",
            type: "button",
            onClick: onClose,
            children: "Cancel"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("button", {
            className: "pd-button primary",
            type: "button",
            disabled: saving,
            onClick: saveDetails,
            children: saving ? 'Saving…' : creating ? 'Add staff' : 'Save details'
          })]
        })]
      })]
    })]
  });
}

// --- Calendar connections (read-only) ----------------------------------------
/**
 * One read-only line per AVAILABLE calendar integration, saying whether this staff member is
 * connected and linking to the module panel where that is changed.
 *
 * Read-only on purpose, and the reason is the same one the Services section states: the connect
 * flow leaves the site for a third-party consent screen and comes back to a specific panel. Putting
 * a second entry point here would mean two places that can start the same handshake and two places
 * to keep truthful — while the thing an editor actually needs is the ANSWER ("is this person's
 * calendar linked?"), which is exactly one line.
 *
 * Generic over the registry rather than hardcoded to Google: any `kind: integration` module the
 * build can use appears here, so the Outlook module gets this surface for free (D-R35).
 *
 * Reads the boot-data projection, which carries no token — only status, account label and the
 * timestamp (D-R34).
 *
 * @param {{staffId: number}} props Section props.
 */
function CalendarConnections({
  staffId
}) {
  const integrations = (_lib_config_js__WEBPACK_IMPORTED_MODULE_3__.config.modules || []).filter(mod => 'integration' === mod.kind && mod.available && mod.has_settings);
  if (!integrations.length) {
    return null;
  }
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("ul", {
    className: "ap-staff-integrations",
    children: integrations.map(mod => {
      const rows = _lib_config_js__WEBPACK_IMPORTED_MODULE_3__.config.integration.connections[mod.code] || [];
      const row = rows.find(entry => Number(entry.staff_id) === Number(staffId));
      const label = _modules_catalog_js__WEBPACK_IMPORTED_MODULE_11__.MODULE_META[mod.code]?.label || mod.code;
      let state = (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Not connected', 'aponto');
      if (row && 'needs_reconnect' === row.status) {
        state = (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Needs reconnect', 'aponto');
      } else if (row) {
        state = row.account ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: %s: the connected account address. */
        (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Connected as %s', 'aponto'), row.account) : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Connected', 'aponto');
      }
      return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("li", {
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("span", {
          children: `${label}: ${state}`
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("a", {
          href: `#modules/${mod.code}`,
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Manage', 'aponto')
        })]
      }, mod.code);
    })
  });
}

// --- Services (read-only eligibility) ----------------------------------------
/**
 * The services this staff member is eligible for. Two reads: `GET /staff/{id}` for the additive
 * `service_ids` (D-R28) and the services catalog for their names — the ids alone would render a
 * list of numbers. Both are best-effort: a failed catalog read degrades to "Service #12" rather
 * than blanking a section the rest of the page does not depend on.
 *
 * Read-only by design (see the file header): the edit lives in the service editor, which owns the
 * full-replacement PUT. The link therefore goes there, via `#services/<id>` (routes/Services.jsx).
 *
 * @param {{staffId: number, staffName: string}} props Section props.
 */
function ServicesSection({
  staffId,
  staffName
}) {
  const [state, setState] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)({
    loading: true,
    services: []
  });
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    let live = true;
    Promise.all([_lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.get(`/staff/${staffId}`), _lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.get('/services', {
      status: 'all',
      per_page: 100
    }).catch(() => ({
      items: []
    }))]).then(([staffDto, catalog]) => {
      if (!live) {
        return;
      }
      const byId = Object.fromEntries((catalog.items || []).map(svc => [String(svc.id), svc]));
      // A staff member may be connected to a service the catalog page did not return
      // (archived, or past the 100-row window). Keep the row — dropping it would
      // under-report a real assignment — and label it from the id.
      const services = (staffDto.service_ids || []).map(id => ({
        id,
        name: byId[String(id)]?.name || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: %d: the numeric id of a service that could not be resolved to a name. */
        (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Service #%d', 'aponto'), id),
        status: byId[String(id)]?.status || ''
      }));
      setState({
        loading: false,
        services
      });
    }).catch(() => {
      if (live) {
        setState({
          loading: false,
          services: []
        });
      }
    });
    return () => {
      live = false;
    };
  }, [staffId]);
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("section", {
    id: "staff-services",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("header", {
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("h2", {
        children: "Services"
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("div", {
      className: "pd-editor-section-body",
      children: state.loading ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("p", {
        className: "pd-editor-note",
        children: "Loading\u2026"
      }) : state.services.length ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.Fragment, {
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("p", {
          className: "pd-editor-note",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Assignments are edited on the service, under “Staff & locations”.', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("ul", {
          className: "ap-staff-services-list",
          children: state.services.map(svc => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("li", {
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("a", {
              href: `#services/${svc.id}`,
              children: svc.name
            }), svc.status && svc.status !== 'active' ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("span", {
              className: `ap-status-pill is-${svc.status}`,
              children: svc.status
            }) : null]
          }, svc.id))
        })]
      }) :
      /*#__PURE__*/
      // The unbookable state, stated plainly. On premium a new service starts with NO
      // eligible staff (the Free policy auto-assigns; the extension does not), so
      // an empty list here is a real, reachable configuration — not an edge case.
      (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("p", {
        className: "pd-editor-note",
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: %s: the staff member's name. */
        (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('%s is not assigned to any service yet, so they cannot be booked. Open a service and add them under “Staff & locations”.', 'aponto'), staffName || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('This staff member', 'aponto'))
      })
    })]
  });
}

/**
 * Canonical `weekly` payload rows for contract §2.6: ascending weekday, ascending
 * non-overlapping periods. `JSON.stringify` of the result is also the section's
 * dirty-check signature, so "what we would send" and "what we compare" can never drift.
 *
 * @param {Object} weekly Weekday (1..7) → periods `[{start,end}]` in minutes.
 * @return {Array} Contract rows `[{weekday,periods:[{start_minute,end_minute}]}]`.
 */
function weeklyRows(weekly) {
  return Object.keys(weekly || {}).map(Number).sort((a, b) => a - b).map(weekday => ({
    weekday,
    periods: [...(weekly[weekday] || [])].sort((a, b) => a.start - b.start).map(p => ({
      start_minute: p.start,
      end_minute: p.end
    }))
  }));
}

// --- Work hours -------------------------------------------------------------
function WorkHoursSection({
  staffId,
  showToast,
  saveRef
}) {
  const {
    confirm,
    dialog
  } = (0,_lib_confirm_jsx__WEBPACK_IMPORTED_MODULE_8__.useConfirmDialog)();
  const [loading, setLoading] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(true);
  const [custom, setCustom] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false); // has own weekly rows
  const [weekly, setWeekly] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)({}); // weekday -> [{start,end}]
  const [overrides, setOverrides] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)([]);
  const [saving, setSaving] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  // Signature of the schedule the server currently holds — anything else is a pending
  // edit. `null` until a GET succeeds, so a failed load can never look "dirty" and
  // have the page Save replace a real schedule with an empty one.
  const [baseline, setBaseline] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const business = businessWeeklyMap();
  const load = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
    setLoading(true);
    _lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.get(`/staff/${staffId}/schedule`).then(res => {
      const map = {};
      (res.weekly || []).forEach(row => {
        map[row.weekday] = (row.periods || []).map(p => ({
          start: p.start_minute,
          end: p.end_minute
        }));
      });
      setWeekly(map);
      setOverrides(res.overrides || []);
      setCustom((res.weekly || []).length > 0);
      setBaseline(JSON.stringify(weeklyRows(map)));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [staffId]);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(load, [load]);

  // The section's write queue. `PUT /staff/{id}/schedule` is a FULL replacement and
  // ScheduleGateway::replace() is order-dependent and NOT transactional, so two overlapping
  // writes can leave a half-applied week on the server (Codex review item 1). Both write
  // paths — this section's own Save and the page-level Save — go through `persist`, which
  // chains onto whatever is already in flight instead of racing it.
  const writeQueue = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(Promise.resolve());
  const queued = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(0);

  // The one write path (PUT /staff/{id}/schedule, contract §2.6). It REJECTS on
  // failure so every caller decides how to surface it — the page-level Save must be
  // able to tell the user the details saved but the hours did not.
  const persist = nextWeekly => {
    const payload = {
      weekly: weeklyRows(nextWeekly),
      overrides: overrides.map(o => ({
        date: o.date,
        periods: o.periods
      }))
    };
    // Busy from the moment a write is QUEUED until the last one settles — a write waiting
    // its turn must keep the grid inert exactly like the one on the wire.
    queued.current += 1;
    setSaving(true);
    const run = async () => {
      try {
        await _lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.put(`/staff/${staffId}/schedule`, payload);
        load();
      } finally {
        // Always drop the saving flag — leaving it set after a SUCCESSFUL save
        // kept the button stuck at a disabled "Saving…" (found in B4b verify).
        queued.current -= 1;
        if (0 === queued.current) {
          setSaving(false);
        }
      }
    };
    // `then( run, run )` so a FAILED write still lets the next one run (a poisoned queue
    // would wedge the section until remount); the queue itself swallows rejections while
    // the caller keeps the real one.
    const chained = writeQueue.current.then(run, run);
    writeQueue.current = chained.catch(() => {});
    return chained;
  };

  // The section's own buttons own their toasts; the page-level Save writes its own
  // message instead (it has to mention the details that DID save).
  const withToast = async write => {
    try {
      await write();
      showToast('Work hours saved.');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };
  const customize = () => {
    // Deep-copy the business rows into staff rows for EVERY weekday: open days carry their
    // periods; every other day starts Closed (`[]`), so the editor opens with all seven days
    // visible (§1.3; contract §2.6 `periods=[]` closes the day).
    const map = {};
    _lib_WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_10__.WEEKDAYS.forEach(([n]) => {
      const biz = business[n];
      map[n] = biz && biz.length ? biz.map(p => ({
        start: p.start_minute,
        end: p.end_minute
      })) : [];
    });
    // ROOT CAUSE of "Customize does nothing" (U4-03b): when the business hours are all closed —
    // e.g. the wizard was skipped, so config.businessHours is empty — the old copy was an EMPTY
    // map that was PUT immediately, and the reload flipped `custom` straight back to false, so the
    // grid flashed and vanished (leaving the static summary <ul>). Two fixes: (1) seed a sensible
    // default when nothing is open so there IS something to edit; (2) open the editor LOCALLY and
    // persist only on "Save work hours" — no empty write-then-revert round-trip.
    if (!Object.values(map).some(periods => periods.length)) {
      _lib_WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_10__.WEEKDAYS.forEach(([n]) => {
        map[n] = n <= 5 ? [{
          start: 540,
          end: 1020
        }] : [];
      });
    }
    setCustom(true);
    setWeekly(map);
  };

  // Validate + write the pending grid. Rejects (never toasts) so the caller owns the message.
  const flush = async () => {
    const invalid = (0,_lib_WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_10__.validateWeekly)(weekly);
    if (invalid) {
      throw new Error(invalid);
    }
    await persist(weekly);
  };
  const saveWeekly = () => withToast(flush);

  // Publish the pending edit to StaffWorkspace so its Save can flush this sub-resource
  // (the page is one continuous form). Without this the grid state died on unmount:
  // no PUT, no error — the 1.0.0 free-zip beta bug. Re-registered every render so the
  // closure over `weekly` is never stale.
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!saveRef) {
      return undefined;
    }
    const handle = {
      dirty: null !== baseline && JSON.stringify(weeklyRows(weekly)) !== baseline,
      save: flush
    };
    saveRef.current = handle;
    return () => {
      if (saveRef.current === handle) {
        saveRef.current = null;
      }
    };
  });
  const revert = async () => {
    // In-app dialog (C13 / review F item 3): destructive styling, Cancel takes default focus.
    const ok = await confirm({
      title: 'Revert to business hours?',
      message: 'Custom weekly hours will be removed (date overrides are kept).',
      confirmText: 'Revert',
      destructive: true
    });
    if (!ok) {
      return;
    }
    setCustom(false);
    setWeekly({});
    withToast(() => persist({}));
  };
  if (loading) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("section", {
      id: "staff-hours",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("header", {
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("h2", {
          children: "Work hours"
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("div", {
        className: "pd-editor-section-body",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("p", {
          className: "pd-editor-note",
          children: "Loading\u2026"
        })
      })]
    });
  }
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("section", {
    id: "staff-hours",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("header", {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("h2", {
        children: "Work hours"
      }), custom ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("button", {
        type: "button",
        className: "pd-section-action",
        disabled: saving,
        onClick: revert,
        children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_6__.renderIcon)('arrows'), "Revert to business hours"]
      }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("button", {
        type: "button",
        className: "pd-section-action",
        disabled: saving,
        onClick: customize,
        children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_6__.renderIcon)('note'), "Customize"]
      })]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("div", {
      className: "pd-editor-section-body",
      children: !custom ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
        className: "ap-hours-summary",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("p", {
          className: "pd-editor-note",
          children: "Using your business hours (inherited). Customize to give this staff member their own weekly hours."
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("ul", {
          className: "ap-hours-list",
          children: _lib_WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_10__.WEEKDAYS.map(([n, label]) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("li", {
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("span", {
              children: label
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("strong", {
              children: business[n] && business[n].length ? business[n].map(p => `${(0,_lib_WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_10__.formatMinutes)(p.start_minute, _lib_config_js__WEBPACK_IMPORTED_MODULE_3__.config.settings.timeFormat)} – ${(0,_lib_WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_10__.formatMinutes)(p.end_minute, _lib_config_js__WEBPACK_IMPORTED_MODULE_3__.config.settings.timeFormat)}`).join(', ') : 'Closed'
            })]
          }, n))
        })]
      }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
        className: "ap-hours-grid-wrap",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(_lib_WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_10__.WeeklyHoursGrid, {
          weekly: weekly,
          onChange: setWeekly,
          busy: saving,
          timeFormat: _lib_config_js__WEBPACK_IMPORTED_MODULE_3__.config.settings.timeFormat
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("div", {
          className: "ap-hours-save",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("button", {
            type: "button",
            className: "pd-button primary sm",
            disabled: saving,
            onClick: saveWeekly,
            children: saving ? 'Saving…' : 'Save work hours'
          })
        })]
      })
    }), dialog]
  });
}

// --- Time off (blocked periods) ---------------------------------------------
function TimeOffSection({
  staffId,
  showToast
}) {
  const [items, setItems] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)([]);
  const [loading, setLoading] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(true);
  const [adding, setAdding] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [form, setForm] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)({
    start: '',
    end: '',
    reason: ''
  });
  const load = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
    setLoading(true);
    const from = (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_4__.toUtcInstant)(Date.now() - 30 * 86400000);
    const to = (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_4__.toUtcInstant)(Date.now() + 365 * 86400000);
    _lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.get('/blocked-periods', {
      staff_id: staffId,
      from,
      to,
      per_page: 100
    }).then(res => {
      setItems(res.items || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [staffId]);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(load, [load]);
  const add = async () => {
    if (!form.start || !form.end) {
      showToast('Choose a start and end.', 'danger');
      return;
    }
    try {
      await _lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.post('/blocked-periods', {
        staff_id: staffId,
        start_datetime_utc: (0,_calendar_constants_js__WEBPACK_IMPORTED_MODULE_5__.businessLocalDateToUtcIso)(new Date(form.start)),
        end_datetime_utc: (0,_calendar_constants_js__WEBPACK_IMPORTED_MODULE_5__.businessLocalDateToUtcIso)(new Date(form.end)),
        reason: form.reason
      });
      showToast('Time off added.');
      setAdding(false);
      setForm({
        start: '',
        end: '',
        reason: ''
      });
      load();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };
  const remove = async id => {
    try {
      await _lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.del(`/blocked-periods/${id}`);
      showToast('Time off removed.');
      load();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("section", {
    id: "staff-timeoff",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("header", {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("h2", {
        children: "Time off"
      }), !adding ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("button", {
        type: "button",
        className: "pd-section-action",
        onClick: () => setAdding(true),
        children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_6__.renderIcon)('plus'), "Add time off"]
      }) : null]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
      className: "pd-editor-section-body",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("p", {
        className: "pd-editor-note",
        children: "Blocked periods and special hours appear on the Calendar and block new bookings."
      }), adding ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
        className: "ap-timeoff-form",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
          className: "pd-field-grid",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("label", {
            className: "pd-compact-field is-filled",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("input", {
              type: "datetime-local",
              value: form.start,
              onChange: e => setForm(f => ({
                ...f,
                start: e.target.value
              }))
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("span", {
              className: "pd-compact-label",
              children: "From (business time)"
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("label", {
            className: "pd-compact-field is-filled",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("input", {
              type: "datetime-local",
              value: form.end,
              onChange: e => setForm(f => ({
                ...f,
                end: e.target.value
              }))
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("span", {
              className: "pd-compact-label",
              children: "To (business time)"
            })]
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("label", {
          className: "pd-compact-field",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("input", {
            value: form.reason,
            placeholder: " ",
            onChange: e => setForm(f => ({
              ...f,
              reason: e.target.value
            }))
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("span", {
            className: "pd-compact-label",
            children: "Reason (optional)"
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
          className: "ap-inline-actions",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("button", {
            type: "button",
            className: "pd-button sm",
            onClick: () => setAdding(false),
            children: "Cancel"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("button", {
            type: "button",
            className: "pd-button primary sm",
            onClick: add,
            children: "Add time off"
          })]
        })]
      }) : null, loading ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("p", {
        className: "pd-editor-note",
        children: "Loading\u2026"
      }) : items.length ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("ul", {
        className: "ap-timeoff-list",
        children: items.map(item => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("li", {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("strong", {
              children: [(0,_lib_format_js__WEBPACK_IMPORTED_MODULE_4__.longDate)(item.start_datetime_utc), " \xB7 ", (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_4__.timeLabel)(item.start_datetime_utc), " \u2013 ", (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_4__.timeLabel)(item.end_datetime_utc)]
            }), item.reason ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("span", {
              children: item.reason
            }) : null]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("button", {
            type: "button",
            className: "pd-icon-button sm",
            "aria-label": "Remove time off",
            onClick: () => remove(item.id),
            children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_6__.renderIcon)('close')
          })]
        }, item.id))
      }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("p", {
        className: "pd-editor-note",
        children: "No time off scheduled."
      })]
    })]
  });
}

/***/ }

}]);
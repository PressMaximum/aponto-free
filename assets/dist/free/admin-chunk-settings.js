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
/* harmony export */   nextPeriod: () => (/* binding */ nextPeriod),
/* harmony export */   sortWeekly: () => (/* binding */ sortWeekly),
/* harmony export */   timeToMin: () => (/* binding */ timeToMin),
/* harmony export */   uses12h: () => (/* binding */ uses12h),
/* harmony export */   validateWeekly: () => (/* binding */ validateWeekly)
/* harmony export */ });
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _icon_jsx__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./icon.jsx */ "./assets/src/admin/lib/icon.jsx");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__);
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
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("select", {
    className: "ap-hours-time",
    "aria-label": ariaLabel,
    value: value,
    disabled: disabled,
    onChange: e => onChange(Number(e.target.value)),
    children: timeOptions(value, timeFormat).map(o => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("option", {
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
    // Sorted for the overlap test, but carrying each period's ORIGINAL index, because that
    // is the one the grid rendered and therefore the only one a caller can address
    // (founder QA 2026-09-21, round 3). Sorting away the index is what previously left
    // `message` as the only thing this function could say.
    const periods = ((weekly || {})[n] || []).map((period, index) => ({
      ...period,
      index
    })).sort((a, b) => a.start - b.start);
    let prevEnd = -1;
    for (const p of periods) {
      if (p.end <= p.start) {
        return {
          message: `${label}: each period must end after it starts.`,
          weekday: n,
          index: p.index
        };
      }
      if (p.start < prevEnd) {
        return {
          message: `${label}: hours overlap — adjust the times.`,
          weekday: n,
          index: p.index
        };
      }
      prevEnd = p.end;
    }
  }
  return null;
}

/**
 * The period "Add hours" appends to a day (persona QA 2026-10-05, T-070).
 *
 * It was always 9:00–17:00, which OVERLAPS the range nearly every open day already has: pressing
 * "Add hours" produced a grid that could not be saved until the operator worked out why. The new
 * period now starts one hour after the day's LAST end (the usual break) and runs four hours,
 * capped at midnight. A day with no room left after its last range gets the last possible
 * five-minute slot rather than an overlapping one, and an empty day keeps the 9:00–17:00 default.
 *
 * @param {Array} periods The day's current periods (`{ start, end }` in minutes).
 * @return {{start: number, end: number}} The period to append.
 */
function nextPeriod(periods) {
  const list = periods || [];
  if (!list.length) {
    return {
      start: 540,
      end: 1020
    };
  }
  const lastEnd = Math.max(...list.map(p => Number(p.end) || 0));
  // Keep the same 5-minute grid the pickers offer; leave at least one slot before midnight.
  const start = Math.min(lastEnd + 60, 1440 - TIME_STEP);
  return {
    start,
    end: Math.min(start + 240, 1440)
  };
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
    [n]: [...(weekly[n] || []), nextPeriod(weekly[n])]
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
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
    className: `ap-hours-grid${busy ? ' is-busy' : ''}`,
    "aria-busy": busy,
    children: [openDays.length >= 2 ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("div", {
      className: "ap-hours-toolbar",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("button", {
        type: "button",
        className: "pd-button text sm",
        disabled: busy,
        onClick: applyToAllOpen,
        children: [(0,_icon_jsx__WEBPACK_IMPORTED_MODULE_1__.renderIcon)('files'), "Apply ", WEEKDAYS.find(([n]) => n === openDays[0][0])[1], "\u2019s hours to all open days"]
      })
    }) : null, WEEKDAYS.map(([n, label]) => {
      const periods = weekly[n] || [];
      return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        className: "ap-hours-day",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
          className: "ap-hours-day-head",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("strong", {
            children: label
          }), periods.length ?
          /*#__PURE__*/
          // The label names the ACTION (T-070). It read "Closed" on an open
          // day and "Open" on a closed one — the state the press would produce,
          // which four testers read as the day's current state.
          (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("button", {
            type: "button",
            className: "pd-button text sm",
            disabled: busy,
            onClick: () => setDayClosed(n),
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Mark closed', 'aponto')
          }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("button", {
            type: "button",
            className: "pd-button text sm",
            disabled: busy,
            onClick: () => setDayOpen(n),
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Open this day', 'aponto')
          })]
        }), periods.length ? periods.map((p, i) =>
        /*#__PURE__*/
        // Addressable by (weekday, period) so a failed save can focus the
        // control that is actually wrong — see `validateWeekly()`. Data
        // attributes only: no behaviour, no styling hook.
        (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
          className: "ap-hours-period",
          "data-weekday": n,
          "data-period": i,
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(TimeSelect, {
            value: p.start,
            onChange: min => setPeriod(n, i, 'start', min),
            ariaLabel: `${label} start`,
            timeFormat: timeFormat,
            disabled: busy
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
            children: "\u2013"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(TimeSelect, {
            value: p.end,
            onChange: min => setPeriod(n, i, 'end', min),
            ariaLabel: `${label} end`,
            timeFormat: timeFormat,
            disabled: busy
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("button", {
            type: "button",
            className: "pd-icon-button sm",
            "aria-label": "Remove period",
            disabled: busy,
            onClick: () => removePeriod(n, i),
            children: (0,_icon_jsx__WEBPACK_IMPORTED_MODULE_1__.renderIcon)('close')
          })]
        }, i)) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
          className: "ap-hours-closed",
          children: "Closed"
        }), periods.length ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("button", {
          type: "button",
          className: "pd-button text sm",
          disabled: busy,
          onClick: () => addPeriod(n),
          children: [(0,_icon_jsx__WEBPACK_IMPORTED_MODULE_1__.renderIcon)('plus'), "Add hours"]
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

/***/ "./assets/src/admin/lib/in-flight.js"
/*!*******************************************!*\
  !*** ./assets/src/admin/lib/in-flight.js ***!
  \*******************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   runOnce: () => (/* binding */ runOnce),
/* harmony export */   useInFlight: () => (/* binding */ useInFlight)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/**
 * One request per press (persona QA 2026-10-05, T-065 / T-066 / T-067).
 *
 * Every Save in the admin disabled its button from a `saving` STATE, and state only reaches the
 * DOM on the next render. Two taps that land in the same frame — routine on a phone, where a
 * double tap is ~80 ms — both ran the handler while `saving` still read `false`, so both posted:
 * two identical services, two identical time-off blocks, business hours stored twice.
 *
 * A ref is synchronous. `useInFlight()` returns `run( task )`, which starts `task` only when no
 * earlier one is still pending and releases when it settles — whether it resolved, rejected,
 * threw, or returned early without a promise. A refused call returns `undefined` and does nothing:
 * no request, no toast, no validation pass.
 *
 * The `saving` state stays where it was — it is still what paints "Saving…" and the disabled
 * button — this only closes the window before that paint.
 */


/**
 * The guard itself, outside React, so it can be unit-tested under plain node.
 *
 * @param {{current: boolean}} flag Mutable in-flight flag.
 * @param {Function}           task The work; may return a promise.
 * @return {*} What `task` returned (a promise when it was async), or `undefined` when refused.
 */
function runOnce(flag, task) {
  if (flag.current) {
    return undefined;
  }
  flag.current = true;
  let result;
  try {
    result = task();
  } catch (error) {
    flag.current = false;
    throw error;
  }
  if (result && typeof result.then === 'function') {
    const release = () => {
      flag.current = false;
    };
    // Release on either outcome WITHOUT swallowing a rejection the caller may be awaiting.
    result.then(release, release);
    return result;
  }
  flag.current = false;
  return result;
}

/**
 * @return {Function} `run( task )` — see {@link runOnce}.
 */
function useInFlight() {
  const flag = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(false);
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(task => runOnce(flag, task), []);
}

/***/ },

/***/ "./assets/src/admin/notifications/NotificationsApp.jsx"
/*!*************************************************************!*\
  !*** ./assets/src/admin/notifications/NotificationsApp.jsx ***!
  \*************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ NotificationsApp),
/* harmony export */   placeholderHelp: () => (/* binding */ placeholderHelp),
/* harmony export */   triggerLabel: () => (/* binding */ triggerLabel)
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
 * What sends each template, in words (persona QA 2026-10-05, T-061). The row used to print the raw
 * `trigger_event` key ("To: customer · no_show", "payment_pending"); a key added later than this
 * map falls back to itself with the underscores opened up, never to a blank.
 */
const TRIGGER_LABELS = {
  created: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('when a booking is made', 'aponto'),
  confirmed: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('when a booking is confirmed', 'aponto'),
  rescheduled: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('when a booking is moved', 'aponto'),
  cancelled: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('when a booking is cancelled', 'aponto'),
  completed: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('when a booking is completed', 'aponto'),
  no_show: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('when a booking is marked as a no-show', 'aponto'),
  reminder: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('before the appointment', 'aponto'),
  payment_pending: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('when a payment is still due', 'aponto'),
  refund: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('when a refund is issued', 'aponto')
};
const triggerLabel = trigger => TRIGGER_LABELS[trigger] || String(trigger || '').replace(/_/g, ' ');

/**
 * One line per placeholder: what it prints (T-061). Shown as the chip's tooltip and, for the chip
 * last used, under the chips. `{booking_time}` is the one that bites: it already carries the
 * timezone — and the other clock when the customer's and the business's differ — so a template
 * that adds `({booking_timezone})` after it prints the zone twice.
 */
const PLACEHOLDER_HELP = {
  customer_name: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('The customer’s full name.', 'aponto'),
  customer_first_name: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('The customer’s first name.', 'aponto'),
  customer_last_name: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('The customer’s last name.', 'aponto'),
  customer_email: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('The customer’s email address.', 'aponto'),
  customer_phone: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('The customer’s phone number.', 'aponto'),
  service_name: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('The booked service.', 'aponto'),
  staff_name: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('The staff member’s full name.', 'aponto'),
  staff_first_name: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('The staff member’s first name.', 'aponto'),
  staff_last_name: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('The staff member’s last name.', 'aponto'),
  booking_date: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('The appointment date, in your date format.', 'aponto'),
  booking_time: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('The start time. Already includes the timezone — and the other clock when the customer’s timezone differs from yours — so do not add {booking_timezone} after it.', 'aponto'),
  booking_end_time: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('The end time (time only).', 'aponto'),
  booking_timezone: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('The timezone name on its own, e.g. “London (GMT+1)”. {booking_time} already includes it.', 'aponto'),
  business_name: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Your business name.', 'aponto'),
  business_address: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('The address of the booking’s location, or your business address.', 'aponto'),
  business_phone: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Your business phone number.', 'aponto'),
  site_name: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Your site title.', 'aponto'),
  booking_status: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('The booking’s status.', 'aponto'),
  order_code: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('The booking reference, e.g. AP-7Q2F4.', 'aponto'),
  cancel_reason: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Why the booking was cancelled. Empty for other emails.', 'aponto'),
  manage_link: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Link to the customer’s page for this booking.', 'aponto'),
  cancel_link: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Link the customer can cancel with.', 'aponto'),
  ics_link: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Link to the calendar file (.ics).', 'aponto'),
  booking_page_link: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Link to your booking page. The line is left out when no page is set.', 'aponto'),
  payment_status: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Whether the booking is paid, in words.', 'aponto'),
  amount_paid: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('What the customer has paid, with the currency.', 'aponto'),
  amount_due: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('What is still to pay, with the currency.', 'aponto'),
  refund_amount: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('The amount refunded (refund email only).', 'aponto'),
  payment_deadline: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('When an unpaid slot is released, in the customer’s time.', 'aponto'),
  payment_link: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Link the customer can pay with. The line is left out when it cannot be built.', 'aponto'),
  // Re-test 2026-10-05: the four newest placeholders were offered as chips with no explanation.
  location_name: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('The name of the booking’s location. The line is left out when the booking has none.', 'aponto'),
  location_address: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('The address of the booking’s location, or your business address.', 'aponto'),
  admin_booking_link: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Link that opens the booking in wp-admin. Admin and staff emails only — empty in customer emails.', 'aponto'),
  cancel_note: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('On a cancellation: what happens to a payment, or why the slot was released. Added before your sign-off when you leave it out.', 'aponto')
};
const placeholderHelp = token => PLACEHOLDER_HELP[token] || '';

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
        children: [recipientLabel(template.recipient), " \xB7 ", triggerLabel(template.trigger_event)]
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
  // The placeholder whose one-line description shows under the chips (T-061): the one last
  // pointed at or focused. `booking_time` first, because it is the one people get wrong.
  const [helpFor, setHelpFor] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)('booking_time');
  const helpToken = placeholders.includes(helpFor) ? helpFor : '';
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
          title: placeholderHelp(token) || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Insert into body', 'aponto'),
          onMouseEnter: () => setHelpFor(token),
          onFocus: () => setHelpFor(token),
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
      }), helpToken && placeholderHelp(helpToken) ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("p", {
        className: "description",
        "aria-live": "polite",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("code", {
          children: `{${helpToken}}`
        }), " \u2014 ", placeholderHelp(helpToken)]
      }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.TextareaControl, {
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

/***/ "./assets/src/admin/settings/BookingPagePanel.jsx"
/*!********************************************************!*\
  !*** ./assets/src/admin/settings/BookingPagePanel.jsx ***!
  \********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ BookingPagePanel)
/* harmony export */ });
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _pressmaximum_dashboard_kit__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @pressmaximum/dashboard-kit */ "./node_modules/@pressmaximum/dashboard-kit/build/index.mjs");
/* harmony import */ var _lib_config_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/config.js */ "./assets/src/admin/lib/config.js");
/* harmony import */ var _booking_page_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./booking-page.js */ "./assets/src/admin/settings/booking-page.js");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__);
/**
 * Settings → Booking → Form presentation → "Booking page" (D-R75).
 *
 * Which WordPress page hosts the booking form. The onboarding wizard records it once; this card
 * is where it stays editable. One kit select through the same SchemaForm every schema panel uses,
 * sharing SettingsApp's dirty state and SaveBar — there is no second Save button on the screen.
 *
 * Everything said ABOUT a page is server-computed and shown only for the SAVED page: the
 * "no booking form on this page" warning comes from `booking_page.has_form`, and the "no longer
 * published" notice from `booking_page.unpublished` (rest-contract §2.11 addendum D-R75). A page
 * merely selected in the menu is described after it has been saved.
 */







const PANEL_ID = 'booking_page';
function BookingPagePanel({
  value,
  saved,
  error,
  onFieldChange
}) {
  const [pages, setPages] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)([]);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    let alive = true;
    fetch((0,_booking_page_js__WEBPACK_IMPORTED_MODULE_5__.pagesUrl)(_lib_config_js__WEBPACK_IMPORTED_MODULE_4__.config.restUrl), {
      headers: {
        'X-WP-Nonce': _lib_config_js__WEBPACK_IMPORTED_MODULE_4__.config.nonce
      },
      credentials: 'same-origin'
    }).then(response => response.ok ? response.json() : []).then(list => alive && Array.isArray(list) && setPages(list))
    // The saved page is still offered (bookingPageOptions), so a failed list degrades
    // to "keep or clear", never to a broken control.
    .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const selected = Number(value) || 0;
  const isSaved = selected === saved.id;
  const help = (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Email links, the “Pay now” link and checkout back-links open this page.', 'aponto');
  const panel = {
    id: PANEL_ID,
    fields: [{
      id: _booking_page_js__WEBPACK_IMPORTED_MODULE_5__.BOOKING_PAGE_KEY,
      type: 'select',
      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Page', 'aponto'),
      description: error ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.Fragment, {
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("span", {
          children: [help, " "]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
          className: "ap-field-error",
          children: error
        })]
      }) : help,
      options: (0,_booking_page_js__WEBPACK_IMPORTED_MODULE_5__.bookingPageOptions)(pages, saved)
    }]
  };
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Card, {
    className: "ap-settings-card",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardHeader, {
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("h2", {
          id: (0,_pressmaximum_dashboard_kit__WEBPACK_IMPORTED_MODULE_3__.panelHeadingId)(PANEL_ID),
          className: "ap-settings-card-title",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Booking page', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
          className: "ap-settings-card-desc",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('The page on your site that customers book on.', 'aponto')
        })]
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardBody, {
      children: [saved.unpublished && selected === 0 ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Notice, {
        status: "warning",
        isDismissible: false,
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('The page that was set as your booking page is no longer published, so nothing links to it. Choose a published page.', 'aponto')
      }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_pressmaximum_dashboard_kit__WEBPACK_IMPORTED_MODULE_3__.SchemaForm, {
        panel: panel,
        values: {
          [PANEL_ID]: {
            [_booking_page_js__WEBPACK_IMPORTED_MODULE_5__.BOOKING_PAGE_KEY]: String(selected)
          }
        },
        onFieldChange: onFieldChange,
        fieldTypes: _pressmaximum_dashboard_kit__WEBPACK_IMPORTED_MODULE_3__.BASE_FIELD_TYPES
      }), isSaved && selected > 0 && !saved.hasForm ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Notice, {
        status: "warning",
        isDismissible: false,
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('This page does not contain the Aponto booking form block. Add the block to the page so customers can book there.', 'aponto')
      }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
        className: "ap-settings-actions-row",
        children: [isSaved && selected > 0 && saved.permalink ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Button, {
          variant: "secondary",
          href: saved.permalink,
          target: "_blank",
          rel: "noreferrer noopener",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('View page', 'aponto')
        }) : null, isSaved && selected > 0 && saved.editUrl ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Button, {
          variant: "secondary",
          href: saved.editUrl,
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Edit page', 'aponto')
        }) : null, saved.id === 0 && selected === 0 && _lib_config_js__WEBPACK_IMPORTED_MODULE_4__.config.wizardUrl ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Button, {
          variant: "secondary",
          href: _lib_config_js__WEBPACK_IMPORTED_MODULE_4__.config.wizardUrl,
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Create a booking page', 'aponto')
        }) : null]
      })]
    })]
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
/* harmony import */ var _lib_in_flight_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../lib/in-flight.js */ "./assets/src/admin/lib/in-flight.js");
/* harmony import */ var _lib_WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../lib/WeeklyHoursGrid.jsx */ "./assets/src/admin/lib/WeeklyHoursGrid.jsx");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__);
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
  _lib_WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_6__.WEEKDAYS.forEach(([n]) => {
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

  // An edit answers the notice it was made for (persona QA 2026-10-05, T-070): "Monday: hours
  // overlap" stayed on screen after the times had been fixed, and "Business hours saved." after
  // the grid had been changed again — both then described a week that was no longer on screen.
  const edit = next => {
    setWeekly(next);
    setError('');
    setNotice('');
  };

  // One PUT per press (T-065). The button is disabled from `saving`, but state only reaches the
  // DOM on the next render: two taps in one frame both sent the full replacement, and before the
  // server serialized it they interleaved and stored every range twice.
  const once = (0,_lib_in_flight_js__WEBPACK_IMPORTED_MODULE_5__.useInFlight)();
  const save = () => once(() => {
    const invalid = (0,_lib_WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_6__.validateWeekly)(weekly);
    if (invalid) {
      // `validateWeekly()` answers `{ message, weekday, index }` since 2026-09-21; this
      // panel has no scroll target to use the locator for, so it takes the sentence.
      setError(invalid.message);
      setNotice('');
      return undefined;
    }
    const sorted = (0,_lib_WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_6__.sortWeekly)(weekly);
    setSaving(true);
    setError('');
    setNotice('');
    const payload = {
      weekly: _lib_WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_6__.WEEKDAYS.map(([n]) => ({
        weekday: n,
        periods: (sorted[n] || []).map(p => ({
          start_minute: p.start,
          end_minute: p.end
        }))
      }))
    };
    return _lib_api_js__WEBPACK_IMPORTED_MODULE_3__.api.put('/business-hours', payload).then(res => {
      const map = toMap(res.weekly);
      setWeekly(map);
      setSaved(map);
      // The boot snapshot other screens resolve inherited hours against (the staff
      // editor's "inherits business hours" list, the Calendar's shading) is a page-load
      // copy: without this it kept showing the OLD week until a reload (re-test N10).
      if (Array.isArray(res.weekly)) {
        _lib_config_js__WEBPACK_IMPORTED_MODULE_4__.config.businessHours = res.weekly;
      }
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
  });
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Card, {
    className: "ap-settings-card",
    id: "ap-business-hours",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardHeader, {
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("h2", {
          className: "ap-settings-card-title",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Business hours', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("p", {
          className: "ap-settings-card-desc",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('The weekly opening hours every staff member inherits. Set a day Closed to block it.', 'aponto')
        })]
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardBody, {
      children: [error ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Notice, {
        status: "error",
        isDismissible: true,
        onRemove: () => setError(''),
        children: error
      }) : null, notice ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Notice, {
        status: "success",
        isDismissible: true,
        onRemove: () => setNotice(''),
        children: notice
      }) : null, loading ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Spinner, {}) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.Fragment, {
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_lib_WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_6__.WeeklyHoursGrid, {
          weekly: weekly,
          onChange: edit,
          busy: saving,
          timeFormat: _lib_config_js__WEBPACK_IMPORTED_MODULE_4__.config.settings.timeFormat
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
          className: "ap-hours-save",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Button, {
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
/* harmony export */   adjustedKeys: () => (/* binding */ adjustedKeys),
/* harmony export */   "default": () => (/* binding */ SettingsApp),
/* harmony export */   editsAfterSave: () => (/* binding */ editsAfterSave),
/* harmony export */   refreshBootSettings: () => (/* binding */ refreshBootSettings)
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
/* harmony import */ var _lib_in_flight_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../lib/in-flight.js */ "./assets/src/admin/lib/in-flight.js");
/* harmony import */ var _catalog_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./catalog.js */ "./assets/src/admin/settings/catalog.js");
/* harmony import */ var _BusinessHoursPanel_jsx__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./BusinessHoursPanel.jsx */ "./assets/src/admin/settings/BusinessHoursPanel.jsx");
/* harmony import */ var _BookingPagePanel_jsx__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ./BookingPagePanel.jsx */ "./assets/src/admin/settings/BookingPagePanel.jsx");
/* harmony import */ var _booking_page_js__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ./booking-page.js */ "./assets/src/admin/settings/booking-page.js");
/* harmony import */ var _php_format_js__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ./php-format.js */ "./assets/src/admin/settings/php-format.js");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__);
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
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.TextareaControl, {
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
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.BaseControl, {
    __nextHasNoMarginBottom: true,
    label: field.label,
    help: field.description,
    id: inputId,
    className: "ap-duration-field",
    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsxs)("div", {
      className: "ap-duration-controls",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)("input", {
        id: inputId,
        type: "number",
        min: minCanonical / active.factor,
        max: Number.isFinite(maxCanonical) ? maxCanonical / active.factor : undefined,
        step: active.inputStep || 1,
        className: "components-text-control__input ap-duration-number",
        value: amount,
        onChange: e => emit(e.target.value)
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)("select", {
        className: "components-select-control__input ap-duration-unit",
        "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Unit', 'aponto'),
        value: unit,
        onChange: e => setUnit(e.target.value),
        children: units.map(u => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)("option", {
          value: u.value,
          children: u.label
        }, u.value))
      })]
    })
  });
}

/**
 * A PHP date/time format, chosen by EXAMPLE (persona QA 2026-10-05, T-080).
 *
 * The stored value is still the PHP format string `wp_date()` needs; the owner picks it by what it
 * produces ("October 5, 2026", "14:30") instead of typing "F j, Y". "Custom…" keeps a hand-written
 * format possible — and is where a stored format outside the presets shows up — with a live
 * example under the box, so a typo is visible before it is saved.
 */
function FormatField({
  field,
  value,
  onChange
}) {
  const presets = Array.isArray(field.presets) ? field.presets : [];
  const current = value === null || value === undefined ? '' : String(value);
  const [custom, setCustom] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(() => !presets.includes(current));
  const [inputId] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(() => `ap-format-${Math.random().toString(36).slice(2, 9)}`);
  const instant = (0,_php_format_js__WEBPACK_IMPORTED_MODULE_15__.exampleInstant)();
  const example = format => (0,_php_format_js__WEBPACK_IMPORTED_MODULE_15__.phpDateExample)(format, instant, _lib_config_js__WEBPACK_IMPORTED_MODULE_5__.config.locale);
  const isCustom = custom || !presets.includes(current);
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.BaseControl, {
    __nextHasNoMarginBottom: true,
    label: field.label,
    help: field.description,
    id: inputId,
    className: "ap-duration-field",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsxs)("div", {
      className: "ap-duration-controls",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsxs)("select", {
        id: inputId,
        className: "components-select-control__input",
        value: isCustom ? '__custom' : current,
        onChange: e => {
          if ('__custom' === e.target.value) {
            setCustom(true);
            return;
          }
          setCustom(false);
          onChange(e.target.value);
        },
        children: [presets.map(format => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)("option", {
          value: format,
          children: example(format)
        }, format)), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)("option", {
          value: "__custom",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Custom…', 'aponto')
        })]
      }), isCustom ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)("input", {
        type: "text",
        className: "components-text-control__input",
        "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Custom format (PHP date format)', 'aponto'),
        value: current,
        onChange: e => onChange(e.target.value)
      }) : null]
    }), isCustom && current ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)("p", {
      className: "ap-settings-card-desc",
      children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Looks like: %s', 'aponto'), example(current))
    }) : null]
  });
}
const FIELD_TYPES = {
  ..._pressmaximum_dashboard_kit__WEBPACK_IMPORTED_MODULE_3__.BASE_FIELD_TYPES,
  textarea: TextareaField,
  duration: DurationField,
  format: FormatField
};

/**
 * The edits still PENDING after a save answered (persona QA 2026-10-05, S2-80).
 *
 * A successful save used to clear every pending edit. A field changed while the request was on the
 * wire was therefore dropped from the dirty set — the bar ended on "No unsaved changes", the
 * screen kept showing the new value, and nothing had stored it (reproduced twice by the tester).
 * What the response settles is exactly what was SENT: an edit is cleared only when its value is
 * still the one that went out, or already equals what the server now holds.
 *
 * @param {Object} current Edits on screen when the response arrived, by flat key.
 * @param {Object} sent    Edits as they were when the request was built.
 * @param {Object} stored  The flattened response — what the server holds now.
 * @return {Object} Edits that are still unsaved.
 */
function editsAfterSave(current, sent, stored) {
  const out = {};
  Object.keys(current || {}).forEach(key => {
    const value = current[key];
    const wasSent = Object.prototype.hasOwnProperty.call(sent || {}, key) && Object.is(sent[key], value);
    if (!wasSent && !Object.is(value, (stored || {})[key])) {
      out[key] = value;
    }
  });
  return out;
}

/**
 * Keys whose STORED value is not the value that was sent (S2-81) — the server pulled it into the
 * range it owns (a 5-minute payment hold is stored as 10). The field shows the stored value from
 * here on; this is what lets the screen say so instead of changing a number in silence.
 *
 * @param {Object} sent   Edits that were sent, by flat key.
 * @param {Object} stored The flattened response.
 * @return {string[]} Adjusted keys.
 */
function adjustedKeys(sent, stored) {
  return Object.keys(sent || {}).filter(key => {
    if (key.startsWith('booking_page.') || !Object.prototype.hasOwnProperty.call(stored || {}, key)) {
      return false;
    }
    return String(sent[key] ?? '') !== String(stored[key] ?? '');
  });
}

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

/**
 * Bring `config.settings` — the boot snapshot `AdminPage::bootConfig()` printed — in step with a
 * settings payload that was just saved (persona QA 2026-10-05, T-071).
 *
 * Only keys the payload actually carries are touched, and each keeps the coercion `lib/config.js`
 * applies at boot, so a partial or older payload can never blank a value another screen reads.
 *
 * @param {Object} target The live boot config.
 * @param {Object} flat   Flattened `GET|PUT /settings` payload.
 */
function refreshBootSettings(target, flat) {
  if (!target?.settings || !flat) {
    return;
  }
  const text = {
    date_format: 'dateFormat',
    time_format: 'timeFormat',
    default_booking_status: 'defaultBookingStatus',
    'customer_fields.phone': 'phoneField'
  };
  const numeric = {
    slot_step_default: 'slotStep',
    min_lead_minutes: 'minLeadMinutes',
    max_horizon_days: 'maxHorizonDays',
    week_starts_on: 'weekStartsOn'
  };
  Object.keys(text).forEach(key => {
    if (typeof flat[key] === 'string' && flat[key]) {
      target.settings[text[key]] = flat[key];
    }
  });
  Object.keys(numeric).forEach(key => {
    if (flat[key] !== null && flat[key] !== undefined && Number.isFinite(Number(flat[key]))) {
      target.settings[numeric[key]] = Number(flat[key]);
    }
  });
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
    // Not a schema key (D-R75): the booking page id rides the same edit/dirty path as one.
    map[_booking_page_js__WEBPACK_IMPORTED_MODULE_14__.BOOKING_PAGE_KEY] = 'int';
    return map;
  }, [schema]);
  const isDirty = Object.keys(edited).length > 0;
  // The edits as they are NOW, readable from a save's response handler — which closed over the
  // edits as they were when the request was sent (S2-80).
  const editedRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)(edited);
  editedRef.current = edited;
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

  // One PUT per press (persona QA 2026-10-05, T-065 family): `saving` reaches the SaveBar on the
  // next render, so a double tap sent the full-replacement PUT twice — and the second one, built
  // from the same revision, came back as a settings conflict against the operator's own save.
  const once = (0,_lib_in_flight_js__WEBPACK_IMPORTED_MODULE_10__.useInFlight)();
  const saveNow = async () => {
    // Currency changes re-interpret every stored price at the new ISO exponent — explicit
    // in-app confirm before proceeding (Codex review item 1; C13 / review F item 3 replaced
    // the browser-native confirm with the shared Modal dialog).
    if ((0,_lib_currency_guard_js__WEBPACK_IMPORTED_MODULE_6__.currencyChangeRequiresConfirm)(savedFlat, edited)) {
      const ok = await confirm({
        title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Change the store currency?', 'aponto'),
        // Truthful about decimals (persona QA 2026-10-05, S2-71). This promised that prices
        // "keep their numbers", which holds only between currencies with the same number of
        // decimals: nothing is converted OR re-scaled here, so A$90.00 (stored 9000) reads as
        // ¥9,000 in a zero-decimal currency.
        message: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Prices are not converted. Between currencies with the same number of decimals they keep their numbers; otherwise the stored amounts are read differently (for example 90.00 becomes 9,000 in a currency without decimals). Review your service prices after saving.', 'aponto'),
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
    // `booking_page` is sent only when the page itself was edited — absent means "unchanged"
    // to the server (D-R75), so an unrelated save can never rewrite or clear it.
    // What THIS request carries. Edits made after this line are not in it, and must still be
    // pending when it answers (S2-80).
    const sent = edited;
    const payload = unflatten((0,_booking_page_js__WEBPACK_IMPORTED_MODULE_14__.flatForSave)(savedFlat, edited));
    const pageEdited = Object.prototype.hasOwnProperty.call(edited, _booking_page_js__WEBPACK_IMPORTED_MODULE_14__.BOOKING_PAGE_KEY);
    return _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.put('/settings', payload).then(dto => {
      const flat = flatten(dto);
      if (pageEdited) {
        // Keep the Dashboard card's boot snapshot in step without a reload.
        _lib_config_js__WEBPACK_IMPORTED_MODULE_5__.config.bookingPage = (0,_booking_page_js__WEBPACK_IMPORTED_MODULE_14__.bootBookingPage)((0,_booking_page_js__WEBPACK_IMPORTED_MODULE_14__.savedBookingPage)(flat));
      }
      // …and the rest of the boot snapshot other screens format with (T-071): the hour
      // pickers kept showing AM/PM after the time format was changed to 24-hour, until
      // a full page reload.
      refreshBootSettings(_lib_config_js__WEBPACK_IMPORTED_MODULE_5__.config, flat);
      if (typeof flat.currency === 'string' && flat.currency && flat.currency !== _lib_config_js__WEBPACK_IMPORTED_MODULE_5__.config.currency && !Object.keys(editsAfterSave(editedRef.current, sent, flat)).length) {
        // The whole app formats money from the boot snapshot — the currency AND its
        // minor-unit exponent, which only PHP knows (S2-71). Until a reload the Services
        // list and the Dashboard kept printing the old currency, so reload once the
        // change is stored; nothing is pending, so nothing is lost.
        try {
          window.location.reload();
        } catch (reloadError) {
          // A host that cannot reload keeps the saved state; the next visit is right.
        }
      }
      // The new `revision` rides `flat`, so the next save — including the one for the
      // edits kept below — is built on the state this response describes.
      setSavedFlat(flat);
      const remaining = editsAfterSave(editedRef.current, sent, flat);
      setEdited(remaining);
      setSaving(false);
      setConflict(false);
      const adjusted = adjustedKeys(sent, flat).filter(key => !Object.prototype.hasOwnProperty.call(remaining, key));
      if (adjusted.length) {
        // Said, not silent (S2-81): the field now shows the stored value, and this
        // names which one moved and to what.
        setNotice((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.sprintf)(/* translators: %s: a list of settings and the value each was stored as, e.g. "Hold the slot for: 10". */
        (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Settings saved. Adjusted to the allowed range — %s.', 'aponto'), adjusted.map(key => `${_catalog_js__WEBPACK_IMPORTED_MODULE_11__.FIELD_META[key]?.label || key}: ${flat[key]}`).join('; ')));
      } else if (Object.keys(remaining).length) {
        setNotice((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Settings saved. The changes you made while saving are not saved yet — save again.', 'aponto'));
      } else {
        setNotice((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Settings saved.', 'aponto'));
      }
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
  const save = () => once(saveNow);
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
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)(_lib_ui_jsx__WEBPACK_IMPORTED_MODULE_9__.RouteLoading, {
      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Loading settings…', 'aponto')
    });
  }
  if (loadError) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)(_lib_ui_jsx__WEBPACK_IMPORTED_MODULE_9__.RouteError, {
      message: loadError,
      onRetry: load
    });
  }
  const sectionPanels = panelsForSection(schema, panels, currentValue, fieldErrors);
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsxs)("div", {
    className: "ap-settings-app",
    children: [conflict ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Notice, {
      status: "error",
      isDismissible: false,
      className: "ap-settings-conflict",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsxs)("div", {
        className: "ap-settings-conflict-body",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)("span", {
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Settings changed elsewhere — reload to get the latest values. Reloading discards your unsaved edits.', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Button, {
          variant: "secondary",
          onClick: reloadAfterConflict,
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Reload settings', 'aponto')
        })]
      })
    }) : null, error ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Notice, {
      status: "error",
      isDismissible: true,
      onRemove: () => setError(''),
      children: error
    }) : null, notice ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Notice, {
      status: "success",
      isDismissible: true,
      onRemove: () => setNotice(''),
      children: notice
    }) : null, sectionPanels.map(({
      panel,
      values
    }) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Card, {
      className: "ap-settings-card",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardHeader, {
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsxs)("div", {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)("h2", {
            id: (0,_pressmaximum_dashboard_kit__WEBPACK_IMPORTED_MODULE_3__.panelHeadingId)(panel.id),
            className: "ap-settings-card-title",
            children: panel.label
          }), panel.description ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)("p", {
            className: "ap-settings-card-desc",
            children: panel.description
          }) : null]
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardBody, {
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)(_pressmaximum_dashboard_kit__WEBPACK_IMPORTED_MODULE_3__.SchemaForm, {
          panel: panel,
          values: values,
          onFieldChange: onFieldChange,
          fieldTypes: FIELD_TYPES
        })
      })]
    }, panel.id)), extras.includes('business-hours') ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)(_BusinessHoursPanel_jsx__WEBPACK_IMPORTED_MODULE_12__["default"], {}) : null, extras.includes('booking-page') ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)(_BookingPagePanel_jsx__WEBPACK_IMPORTED_MODULE_13__["default"], {
      value: currentValue(_booking_page_js__WEBPACK_IMPORTED_MODULE_14__.BOOKING_PAGE_KEY),
      saved: (0,_booking_page_js__WEBPACK_IMPORTED_MODULE_14__.savedBookingPage)(savedFlat),
      error: fieldErrors[_booking_page_js__WEBPACK_IMPORTED_MODULE_14__.BOOKING_PAGE_KEY],
      onFieldChange: onFieldChange
    }) : null, extras.includes('appearance-hint') ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)(AppearanceHint, {}) : null, extras.includes('privacy-launcher') ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)(PrivacyLauncher, {}) : null, extras.includes('system-status') ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)(SystemStatus, {}) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)(_pressmaximum_dashboard_kit__WEBPACK_IMPORTED_MODULE_3__.SaveBar, {
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
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.__experimentalConfirmDialog, {
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
  const order = [];
  const byPanel = {};
  (0,_catalog_js__WEBPACK_IMPORTED_MODULE_11__.visibleSchemaEntries)(schema, panels, _lib_config_js__WEBPACK_IMPORTED_MODULE_5__.config).forEach(entry => {
    if (!byPanel[entry.panel]) {
      byPanel[entry.panel] = [];
      order.push(entry.panel);
    }
    byPanel[entry.panel].push(entry);
  });
  return order.map(panelId => {
    const meta = _catalog_js__WEBPACK_IMPORTED_MODULE_11__.PANEL_META[panelId] || {
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
  const meta = _catalog_js__WEBPACK_IMPORTED_MODULE_11__.FIELD_META[entry.key] || {};
  const control = meta.control || (0,_catalog_js__WEBPACK_IMPORTED_MODULE_11__.controlForType)(entry.type);
  const err = fieldErrors[entry.key];
  let description = meta.help || null;
  if (err) {
    description = /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.Fragment, {
      children: [meta.help ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsxs)("span", {
        children: [meta.help, " "]
      }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)("span", {
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
    presets: meta.presets,
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
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Card, {
    className: "ap-settings-card",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardHeader, {
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsxs)("div", {
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)("h2", {
          className: "ap-settings-card-title",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Booking form appearance', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)("p", {
          className: "ap-settings-card-desc",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('The accent color and corner radius are part of the booking form block.', 'aponto')
        })]
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardBody, {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)("p", {
        className: "ap-hint-steps",
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('To change them: open the page that holds your booking form, select the Aponto booking form block, then adjust the color and rounding in the block settings (Inspector) on the right.', 'aponto')
      }), page && page.editUrl ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)("div", {
        className: "ap-settings-actions-row",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Button, {
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
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Card, {
    className: "ap-settings-card",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardHeader, {
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsxs)("div", {
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)("h2", {
          className: "ap-settings-card-title",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Data access requests', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)("p", {
          className: "ap-settings-card-desc",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Handle GDPR export and erasure requests with WordPress’s built-in privacy tools — Aponto data is included automatically.', 'aponto')
        })]
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardBody, {
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsxs)("div", {
        className: "ap-settings-actions-row",
        children: [tools.export ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Button, {
          variant: "secondary",
          href: tools.export,
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Export personal data', 'aponto')
        }) : null, tools.erase ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Button, {
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
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Card, {
    className: "ap-settings-card",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardHeader, {
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsxs)("div", {
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)("h2", {
          className: "ap-settings-card-title",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('System status', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)("p", {
          className: "ap-settings-card-desc",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('A read-only snapshot for support. No personal data is included.', 'aponto')
        })]
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardBody, {
      children: err ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Notice, {
        status: "warning",
        isDismissible: false,
        children: err
      }) : !data ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Spinner, {}) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.Fragment, {
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)("dl", {
          className: "ap-diagnostics",
          children: rows.map(([label, value]) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsxs)("div", {
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)("dt", {
              children: label
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)("dd", {
              children: value
            })]
          }, label))
        }), Array.isArray(data.checks) && data.checks.length ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)("ul", {
          className: "ap-diagnostics-checks",
          children: data.checks.map(check => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsxs)("li", {
            "data-status": check.status,
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)("strong", {
              children: check.code
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_16__.jsx)("span", {
              children: check.status
            })]
          }, check.code))
        }) : null]
      })
    })]
  });
}

/***/ },

/***/ "./assets/src/admin/settings/booking-page.js"
/*!***************************************************!*\
  !*** ./assets/src/admin/settings/booking-page.js ***!
  \***************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   BOOKING_PAGE_KEY: () => (/* binding */ BOOKING_PAGE_KEY),
/* harmony export */   bookingPageOptions: () => (/* binding */ bookingPageOptions),
/* harmony export */   bootBookingPage: () => (/* binding */ bootBookingPage),
/* harmony export */   flatForSave: () => (/* binding */ flatForSave),
/* harmony export */   pagesUrl: () => (/* binding */ pagesUrl),
/* harmony export */   savedBookingPage: () => (/* binding */ savedBookingPage)
/* harmony export */ });
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__);
/**
 * Booking-page setting (D-R75) — the pure half of Settings → Booking → Form presentation.
 *
 * `GET /settings` carries the read-mostly object `booking_page` (`id`, `permalink`, `title`,
 * `has_form`, `edit_url`, `unpublished`); SettingsApp flattens it like every other group, so the
 * one writable leaf is the flat key `booking_page.id`. `PUT /settings` treats a body WITHOUT
 * `booking_page` as "leave the page alone" (rest-contract §2.11 addendum D-R75) — which is why
 * {@link flatForSave} sends the object only when the operator actually changed the page: saving an
 * unrelated setting must never rewrite, or clear, the page the onboarding wizard recorded.
 */


/** Flat key of the one writable leaf. */
const BOOKING_PAGE_KEY = 'booking_page.id';
const GROUP_PREFIX = 'booking_page.';

/**
 * The flat map `PUT /settings` is built from: saved values + edits, minus the read-only
 * `booking_page.*` leaves, plus `booking_page.id` only when it was edited.
 *
 * @param {Object} savedFlat Flattened GET payload.
 * @param {Object} edited    Pending edits by flat key.
 * @return {Object} Flat map to unflatten into the PUT body.
 */
function flatForSave(savedFlat, edited) {
  const out = {};
  const merged = {
    ...(savedFlat || {}),
    ...(edited || {})
  };
  Object.keys(merged).forEach(key => {
    if (!key.startsWith(GROUP_PREFIX)) {
      out[key] = merged[key];
    }
  });
  if (edited && Object.prototype.hasOwnProperty.call(edited, BOOKING_PAGE_KEY)) {
    out[BOOKING_PAGE_KEY] = Number(edited[BOOKING_PAGE_KEY]) || 0;
  }
  return out;
}

/**
 * The saved booking page as an object, read back out of the flattened GET payload.
 *
 * @param {Object} savedFlat Flattened GET payload.
 * @return {{id: number, permalink: string, title: string, hasForm: boolean, editUrl: string, unpublished: boolean}} Saved page.
 */
function savedBookingPage(savedFlat) {
  const flat = savedFlat || {};
  return {
    id: Number(flat[BOOKING_PAGE_KEY]) || 0,
    permalink: String(flat['booking_page.permalink'] || ''),
    title: String(flat['booking_page.title'] || ''),
    hasForm: flat['booking_page.has_form'] === true,
    editUrl: String(flat['booking_page.edit_url'] || ''),
    unpublished: flat['booking_page.unpublished'] === true
  };
}

/**
 * URL of core's published-pages collection, derived from Aponto's REST base.
 *
 * With plain permalinks the base is `/index.php?rest_route=/aponto/v1`, which already carries a
 * `?`, so the separator follows the same rule as `lib/api.js` (finding U4-04).
 *
 * @param {string} restUrl Aponto REST base (`…/aponto/v1`).
 * @return {string} URL.
 */
function pagesUrl(restUrl) {
  const url = String(restUrl || '').replace(/\/?aponto\/v1\/?$/, '') + '/wp/v2/pages';
  const query = 'status=publish&per_page=100&orderby=title&order=asc&_fields=id,title';
  return url + (url.includes('?') ? '&' : '?') + query;
}

/** `title.rendered` is HTML — decode its entities into the plain text an `<option>` shows. */
function plainTitle(page) {
  const html = String(page?.title?.rendered || '');
  if (!html || typeof DOMParser === 'undefined') {
    return html;
  }
  return new DOMParser().parseFromString(html, 'text/html').documentElement.textContent || '';
}

/**
 * Select options: "None", then the published pages. The saved page is merged in when the list
 * does not carry it (more than 100 pages, or the list failed to load), so the control never
 * silently shows a different choice from the one stored.
 *
 * @param {Array}  pages `wp/v2/pages` items (`{ id, title: { rendered } }`).
 * @param {Object} saved {@link savedBookingPage} result.
 * @return {Array<{value: string, label: string}>} Options.
 */
function bookingPageOptions(pages, saved) {
  const list = (Array.isArray(pages) ? pages : []).filter(page => Number(page?.id) > 0).map(page => ({
    value: String(page.id),
    label: plainTitle(page) || `#${page.id}`
  }));
  if (saved && saved.id > 0 && !list.some(option => option.value === String(saved.id))) {
    list.unshift({
      value: String(saved.id),
      label: saved.title || `#${saved.id}`
    });
  }
  return [{
    value: '0',
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('None', 'aponto')
  }, ...list];
}

/**
 * The Dashboard card's boot snapshot (`config.bookingPage`) for a page just saved, so the card
 * is right without a reload. `hasForm` rides along (persona QA 2026-10-05, T-040) so the card can
 * say when the chosen page carries no booking form.
 *
 * @param {Object} saved {@link savedBookingPage} result.
 * @return {Object|null} Boot-shaped page, or null for none.
 */
function bootBookingPage(saved) {
  return saved && saved.id > 0 ? {
    id: saved.id,
    status: 'publish',
    url: saved.permalink,
    editUrl: saved.editUrl,
    hasForm: saved.hasForm
  } : null;
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
/* harmony export */   KEY_REQUIRES_MODULE: () => (/* binding */ KEY_REQUIRES_MODULE),
/* harmony export */   PANEL_META: () => (/* binding */ PANEL_META),
/* harmony export */   controlForType: () => (/* binding */ controlForType),
/* harmony export */   visibleSchemaEntries: () => (/* binding */ visibleSchemaEntries)
/* harmony export */ });
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _modules_catalog_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../modules/catalog.js */ "./assets/src/admin/modules/catalog.js");
/* harmony import */ var _lib_config_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../lib/config.js */ "./assets/src/admin/lib/config.js");
/* harmony import */ var _php_format_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./php-format.js */ "./assets/src/admin/settings/php-format.js");
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
  // D-R52. Its own panel rather than five more rows under Booking policy: these answer
  // "how do we present our people, and how much of them do we publish", which is a different
  // question from lead times and cancellation windows. Every key in it is gated on
  // `multi_staff`, and `panelsForSection` drops a panel whose keys are all gated — so on Free
  // the heading does not exist at all.
  staff: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Staff', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('How your team appears on the booking form, and what customers can see about them.', 'aponto')
  },
  // D-R61. The same arrangement as `staff`: its own card under Booking → Policy, every key in
  // it gated on `multi_location`, so on Free (or with the module off) the heading never renders.
  // Singular, like the `Staff` heading beside it: the panel is about the location QUESTION,
  // not a list of places (D-R62 fix round 3, founder QA).
  location: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Location', 'aponto'),
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Whether customers choose where their appointment takes place.', 'aponto')
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
const KEY_REQUIRES_MODULE = {
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
  'booking.location_choice': 'multi_location'
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
function visibleSchemaEntries(schema, panels, bootConfig) {
  const allowed = Array.isArray(panels) ? panels : [];
  return (Array.isArray(schema) ? schema : []).filter(entry => allowed.includes(entry.panel)).filter(entry => {
    const required = KEY_REQUIRES_MODULE[entry.key];
    return !required || (0,_modules_catalog_js__WEBPACK_IMPORTED_MODULE_1__.moduleAvailable)(bootConfig, required);
  });
}
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
    options: _lib_config_js__WEBPACK_IMPORTED_MODULE_2__.config.currencies.map(code => ({
      value: code,
      label: code
    }))
  },
  // Presets labelled with what they PRODUCE, plus "Custom…" for a hand-written PHP format
  // (persona QA 2026-10-05, T-080) — the `format` control in SettingsApp. The stored value is
  // still the PHP format string.
  date_format: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Date format', 'aponto'),
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('How dates are written in emails and on the booking pages.', 'aponto'),
    control: 'format',
    presets: _php_format_js__WEBPACK_IMPORTED_MODULE_3__.DATE_FORMAT_PRESETS
  },
  time_format: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Time format', 'aponto'),
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('How times are written in emails and on the booking pages.', 'aponto'),
    control: 'format',
    presets: _php_format_js__WEBPACK_IMPORTED_MODULE_3__.TIME_FORMAT_PRESETS
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
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Default gap between the start times you offer.', 'aponto'),
    // A menu of the intervals a booking grid is actually built on (persona QA 2026-10-05,
    // S2-81): the bare number box took 7, and the form then offered 70 start times a day
    // (2:00, 2:07, 2:14…). Presentation only — the schema still accepts any positive whole
    // number, and a stored value outside the menu stays selectable (SettingsApp merges it in).
    control: 'select',
    options: [5, 10, 15, 20, 30, 45, 60, 90, 120].map(minutes => ({
      value: String(minutes),
      label: String(minutes)
    }))
  },
  min_cancel_hours: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Cancellation notice (hours)', 'aponto'),
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('How long before the appointment a customer may still cancel. 0 = any time up to the start.', 'aponto')
  },
  pending_auto_cancel_hours: {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Auto-cancel unconfirmed after (hours)', 'aponto'),
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Cancel still-pending bookings automatically. 0 = never.', 'aponto')
  },
  'booking.timezone_mode': {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Booking times shown in', 'aponto'),
    control: 'radio',
    options: [{
      value: 'visitor',
      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('The customer’s own timezone', 'aponto')
    }, {
      value: 'business',
      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Your business timezone', 'aponto')
    }],
    // Says what the visitor actually sees, and makes clear this is presentation only —
    // a customer somewhere else can always switch the form to their own timezone, and the
    // booking is stored in whichever one they chose (D-R48).
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Which clock the booking form shows by default. A customer in another timezone is told which one the times are in, and can always switch the form to their own — their booking is confirmed in the timezone they chose.', 'aponto')
  },
  // D-R50/D-R52. Only meaningful with the `multi_staff` module, so SettingsApp hides these
  // rows without it (display-only gating — the payload gates are server-side). Whichever way
  // the choice is set, a service with one eligible staff member never shows the step: there is
  // no choice to make, and asking anyway is the friction the single-service skip already
  // rejected.
  'booking.staff_choice': {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Staff selection', 'aponto'),
    control: 'radio',
    options: [{
      value: 'visitor',
      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Customers choose a staff member (or any available)', 'aponto')
    }, {
      value: 'required',
      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Customers must choose a staff member', 'aponto')
    }, {
      value: 'any',
      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Always assign automatically', 'aponto')
    }],
    // States the assignment rule, because it is the half an owner cannot see from the form:
    // "Any available" is not random. Verified against `StaffGateway::list()`, whose default
    // order is `position ASC, id ASC` — the Staff screen's own order — and against
    // `ReservationService::reserveAnyStaff()`, which walks the same order.
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Shown on the booking form only when a service has more than one staff member. When a customer picks “Any available”, or when you always assign automatically, the first free staff member in your Staff list order gets the booking.', 'aponto')
  },
  // D-R61. Only meaningful with `multi_location`, gated in KEY_REQUIRES_MODULE above. The help
  // states the rules an owner cannot see from the form: a lone branch is never asked about, and
  // "first" is the first in alphabetical order AND the only branch taking online bookings (fix
  // round 2, option A — an explicit other branch is refused on both public routes).
  'booking.location_choice': {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Location selection', 'aponto'),
    control: 'radio',
    options: [{
      value: 'visitor',
      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Customers choose a location', 'aponto')
    }, {
      value: 'first',
      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Only take online bookings at the first location', 'aponto')
    }],
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Customers are only asked when two or more active locations offer the service. “First” is the first active location, in alphabetical order, that offers the service; your other locations take no online bookings.', 'aponto')
  },
  'booking.staff_layout': {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Staff layout', 'aponto'),
    control: 'radio',
    options: [{
      value: 'list',
      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('List', 'aponto')
    }, {
      value: 'cards',
      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Cards', 'aponto')
    }],
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Cards fall back to the list automatically on narrow forms.', 'aponto')
  },
  'booking.staff_photos': {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Show staff photos', 'aponto'),
    // Says the privacy half out loud, because it is the reason this switch exists at all:
    // with photos on, a staff member without an uploaded picture falls back to Gravatar,
    // whose URL carries a hash of their email address (D-R51).
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Off removes photos from the booking form completely, including the Gravatar fallback.', 'aponto')
  },
  'booking.staff_titles': {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Show job titles', 'aponto'),
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Show each person’s job title under their name while the customer is choosing.', 'aponto')
  },
  'booking.staff_profiles': {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Let customers view staff profiles', 'aponto'),
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Adds a “Learn more” button that opens the staff member’s photo, title and bio.', 'aponto')
  },
  'booking.staff_label': {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('What customers call your staff', 'aponto'),
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Singular, lower case — e.g. stylist, doctor, trainer, instructor. Used on the booking form: “Choose your stylist”.', 'aponto'),
    // Left blank = the form's own neutral default, "staff member". The kit's text field
    // has no placeholder slot, so the example lives in the help line above.
    maxLength: 40
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
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Until a payment method is set up and switched on, this behaves as if payment were off. What happens to paid services while a required payment method is not ready is the next setting.', 'aponto')
  },
  // D-R79 (opt-in, default `accept` = the D-R38a(1) rule): the owner's answer for the one state
  // the mode cannot express — payment is required and nothing can take it.
  'payments.when_unavailable': {
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('If online payment is required but no payment method is available', 'aponto'),
    control: 'radio',
    options: [{
      value: 'accept',
      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Take the booking without payment', 'aponto')
    }, {
      value: 'refuse',
      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Do not take bookings for paid services', 'aponto')
    }],
    help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Applies to the public booking form only. Free services stay bookable, and bookings you create yourself are never refused.', 'aponto')
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

/***/ },

/***/ "./assets/src/admin/settings/php-format.js"
/*!*************************************************!*\
  !*** ./assets/src/admin/settings/php-format.js ***!
  \*************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DATE_FORMAT_PRESETS: () => (/* binding */ DATE_FORMAT_PRESETS),
/* harmony export */   TIME_FORMAT_PRESETS: () => (/* binding */ TIME_FORMAT_PRESETS),
/* harmony export */   exampleInstant: () => (/* binding */ exampleInstant),
/* harmony export */   phpDateExample: () => (/* binding */ phpDateExample)
/* harmony export */ });
/**
 * Render a PHP `date()` format string for a JS Date — enough of it to SHOW an example
 * (persona QA 2026-10-05, T-080).
 *
 * Settings → Localization asked the owner for raw PHP format strings ("F j, Y", "g:i a"). The
 * stored value stays a PHP format — it is what `wp_date()` formats every mail and the manage page
 * with — but the control now offers presets labelled with what they PRODUCE, which needs this
 * small renderer. It covers the day, month, year and clock tokens the presets and any sane custom
 * format use; an unknown letter is passed through unchanged, exactly as PHP does, so the example
 * is never invented.
 */

const pad = n => String(n).padStart(2, '0');
function part(date, locale, options) {
  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-US', options).format(date);
  }
}
function ordinal(day) {
  if (day >= 11 && day <= 13) {
    return 'th';
  }
  return {
    1: 'st',
    2: 'nd',
    3: 'rd'
  }[day % 10] || 'th';
}

/**
 * @param {string} format PHP date format.
 * @param {Date}   date   The instant to render, read in the browser's local zone.
 * @param {string} locale BCP-47 locale for month and weekday names.
 * @return {string} The formatted example.
 */
function phpDateExample(format, date = new Date(), locale = 'en-US') {
  const hours = date.getHours();
  const tokens = {
    d: () => pad(date.getDate()),
    j: () => String(date.getDate()),
    D: () => part(date, locale, {
      weekday: 'short'
    }),
    l: () => part(date, locale, {
      weekday: 'long'
    }),
    S: () => ordinal(date.getDate()),
    F: () => part(date, locale, {
      month: 'long'
    }),
    M: () => part(date, locale, {
      month: 'short'
    }),
    m: () => pad(date.getMonth() + 1),
    n: () => String(date.getMonth() + 1),
    Y: () => String(date.getFullYear()),
    y: () => String(date.getFullYear()).slice(-2),
    a: () => hours < 12 ? 'am' : 'pm',
    A: () => hours < 12 ? 'AM' : 'PM',
    g: () => String(hours % 12 || 12),
    G: () => String(hours),
    h: () => pad(hours % 12 || 12),
    H: () => pad(hours),
    i: () => pad(date.getMinutes()),
    s: () => pad(date.getSeconds())
  };
  let out = '';
  const text = String(format || '');
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if ('\\' === char) {
      index += 1;
      out += text[index] || '';
    } else {
      out += tokens[char] ? tokens[char]() : char;
    }
  }
  return out;
}

/** The presets WordPress's own General settings screen offers, in its order. */
const DATE_FORMAT_PRESETS = ['F j, Y', 'Y-m-d', 'm/d/Y', 'd/m/Y', 'j F Y', 'D, M j, Y'];
const TIME_FORMAT_PRESETS = ['g:i a', 'g:i A', 'H:i'];

/** The fixed instant every example is rendered for: an afternoon, so am/pm and 24h visibly differ. */
function exampleInstant() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 30, 0);
}

/***/ }

}]);
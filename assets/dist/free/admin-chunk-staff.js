"use strict";
(globalThis["webpackChunkaponto"] = globalThis["webpackChunkaponto"] || []).push([["admin-chunk-staff"],{

/***/ "./assets/src/admin/lib/EditorCard.jsx"
/*!*********************************************!*\
  !*** ./assets/src/admin/lib/EditorCard.jsx ***!
  \*********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   EditorCard: () => (/* binding */ EditorCard)
/* harmony export */ });
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__);
/**
 * One CARD section of a full-page record editor (D-R55).
 *
 * The founder's reference is the Settings panel (`settings/SettingsApp.jsx`): a white surface
 * with a 1px border and a radius, a header holding the panel title and a one-line muted
 * description, a hairline under the header, then the fields in a padded body. Rather than
 * reproduce that look a second time, this component renders the SAME thing: the
 * `@wordpress/components` `Card`/`CardHeader`/`CardBody` trio carrying `.ap-settings-card`,
 * `.ap-settings-card-title` and `.ap-settings-card-desc`. One card anatomy, one stylesheet,
 * so a change to the Settings panels lands here too.
 *
 * `@wordpress/components` is an EXTERNAL in this build (`wp-components`, already a dependency
 * of the admin entry because the Settings chunk uses it), so the import costs the lazy chunk
 * no bytes.
 *
 * What this adds on top of a plain Settings card is the editor contract: the card is a real
 * `<section>` with the anchor id the sticky section nav scrolls to and the IntersectionObserver
 * watches, and it is labelled by its own heading (`aria-labelledby`) so the landmark is named.
 * The header can carry a trailing action (Customize, Add time off) at the inline end.
 *
 * REUSABLE ON PURPOSE, and reused: the Service editor took the same two steps on 2026-09-21 —
 * wrap its sections in `EditorCard`, add `ap-editor-cards` to the form element — which closes
 * the one-release gap D-R55 recorded between the two full-page record editors. Nothing here is
 * staff-specific. The remaining holdout on this shell is the Premium `multi_location` Location
 * form, which is owned elsewhere and is single-section.
 *
 * @param {Object}          props             Card props.
 * @param {string}          props.id          Anchor id, e.g. `staff-details`.
 * @param {string}          props.title       Card title (renders as the section's `h2`).
 * @param {string}          [props.description] One-line muted description under the title.
 * @param {import('react').ReactNode} [props.action]   Trailing header control.
 * @param {string}          [props.className] Extra class on the `<section>`.
 * @param {string}          [props.bodyClassName] Extra class on the body wrapper — the Service
 *                                            editor's grid sections need `pd-form-grid` here.
 * @param {import('react').ReactNode} props.children   Card body.
 * @return {JSX.Element} The card section.
 */


function EditorCard({
  id,
  title,
  description,
  action,
  className,
  bodyClassName,
  children
}) {
  const headingId = `${id}-heading`;
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("section", {
    id: id,
    className: className ? `ap-editor-card ${className}` : 'ap-editor-card',
    "aria-labelledby": headingId,
    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Card, {
      className: "ap-settings-card",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardHeader, {
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
          className: "ap-editor-card-head",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
            className: "ap-editor-card-head-copy",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("h2", {
              id: headingId,
              className: "ap-settings-card-title",
              children: title
            }), description ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("p", {
              className: "ap-settings-card-desc",
              children: description
            }) : null]
          }), action || null]
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardBody, {
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("div", {
          className: bodyClassName ? `pd-editor-section-body ${bodyClassName}` : 'pd-editor-section-body',
          children: children
        })
      })]
    })
  });
}

/***/ },

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

/***/ "./assets/src/admin/lib/assignment-pairs.js"
/*!**************************************************!*\
  !*** ./assets/src/admin/lib/assignment-pairs.js ***!
  \**************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   locationScopeLabel: () => (/* binding */ locationScopeLabel),
/* harmony export */   memberLocationIds: () => (/* binding */ memberLocationIds),
/* harmony export */   setMemberLocations: () => (/* binding */ setMemberLocations)
/* harmony export */ });
/**
 * Per-member branch math for the Service editor's "Staff & locations" section (D-R63, SPEC-P1
 * §1.1.4), over the per-pair wire of `PUT /services/{id}/eligibility` (rest-contract §2.18).
 *
 * The rule, in one line: an assigned member is EITHER "Every location" — exactly one wildcard pair
 * `{ staff_id, location_id: 0 }` — OR a set of branches, one pair per branch. Choosing branches
 * REPLACES that member's pairs; clearing every branch falls back to the wildcard, so an assigned
 * member never ends with an empty set (that would silently UN-assign them). Other members' pairs
 * are never touched, which is what keeps a non-cartesian mapping ("A everywhere, B only at
 * Uptown") intact through a round-trip.
 *
 * Pure and dependency-free: `tests/js` imports it under plain node.
 */

/**
 * The branches a member is assigned at, or `[]` for "Every location".
 *
 * A member holding a wildcard pair is assigned everywhere, whatever narrower rows sit beside it
 * (legacy data can hold both), so the wildcard wins and the answer is `[]`.
 *
 * @param {Array}  assignments Pairs `{ staff_id, location_id }`.
 * @param {number} staffId     Member.
 * @return {number[]} Location ids, ascending; `[]` = every location (or not assigned).
 */
function memberLocationIds(assignments, staffId) {
  const id = Number(staffId);
  const mine = (assignments || []).filter(pair => Number(pair?.staff_id) === id);
  if (mine.some(pair => 0 === (Number(pair.location_id) || 0))) {
    return [];
  }
  return [...new Set(mine.map(pair => Number(pair.location_id)))].sort((a, b) => a - b);
}

/**
 * Replace one member's pairs with the given branches — or with the wildcard when none are given.
 *
 * @param {Array}    assignments Current pairs.
 * @param {number}   staffId     Member to rewrite (must already be assigned; the checkbox owns
 *                               assign/unassign).
 * @param {number[]} locationIds Picked branches; `[]` = every location.
 * @return {Array} Next pairs.
 */
function setMemberLocations(assignments, staffId, locationIds) {
  const id = Number(staffId);
  const others = (assignments || []).filter(pair => Number(pair?.staff_id) !== id);
  const picked = [...new Set((locationIds || []).map(Number).filter(value => value > 0))].sort((a, b) => a - b);
  if (!picked.length) {
    return [...others, {
      staff_id: id,
      location_id: 0
    }];
  }
  return [...others, ...picked.map(locationId => ({
    staff_id: id,
    location_id: locationId
  }))];
}

/**
 * One-line reading of a member's scope for read-only summaries: "Every location", or the branch
 * names joined with ", " (an id the catalog does not name reads `#N` rather than vanishing).
 *
 * @param {number[]} locationIds  From {@see memberLocationIds}.
 * @param {Array}    locations    Catalog `[ { id, name } ]`.
 * @param {string}   everyLabel   Translated "Every location".
 * @return {string} Summary.
 */
function locationScopeLabel(locationIds, locations, everyLabel) {
  if (!locationIds || !locationIds.length) {
    return everyLabel;
  }
  const byId = new Map((locations || []).map(location => [Number(location.id), location.name]));
  return locationIds.map(locationId => byId.get(Number(locationId)) || `#${locationId}`).join(', ');
}

/***/ },

/***/ "./assets/src/admin/lib/branch-hours.js"
/*!**********************************************!*\
  !*** ./assets/src/admin/lib/branch-hours.js ***!
  \**********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   cloneWeekly: () => (/* binding */ cloneWeekly),
/* harmony export */   copySourceIds: () => (/* binding */ copySourceIds),
/* harmony export */   dirtyScopeIds: () => (/* binding */ dirtyScopeIds),
/* harmony export */   inheritedSource: () => (/* binding */ inheritedSource),
/* harmony export */   periodsByWeekday: () => (/* binding */ periodsByWeekday),
/* harmony export */   scopeIsDirty: () => (/* binding */ scopeIsDirty),
/* harmony export */   seedWeekly: () => (/* binding */ seedWeekly),
/* harmony export */   summarizeWeekly: () => (/* binding */ summarizeWeekly),
/* harmony export */   weeklyMap: () => (/* binding */ weeklyMap),
/* harmony export */   weeklyRows: () => (/* binding */ weeklyRows)
/* harmony export */ });
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./WeeklyHoursGrid.jsx */ "./assets/src/admin/lib/WeeklyHoursGrid.jsx");
/**
 * Pure weekly-hours helpers for the per-branch work-hours authoring of D-R63 (SPEC-P1 §1.2).
 *
 * Hours live on the STAFF member (D-R60 rule 1). Each branch is one more schedule SCOPE of the same
 * person — `GET`/`PUT /staff/{id}/schedule?location_id=N`, weight-5 rows (rest-contract §2.6
 * addendum 2026-09-23) — beside the wildcard scope "All locations" (`location_id = 0`) the Work hours
 * card has always edited. A scope with no weekly rows INHERITS: the All-locations rows when the
 * member has them, otherwise the business hours.
 *
 * Two grid shapes meet here, and every helper says which one it takes:
 *   - the EDITOR map `{ [weekday 1..7]: [ { start, end } ] }` in minutes (`WeeklyHoursGrid`);
 *   - the CONTRACT rows `[ { weekday, periods: [ { start_minute, end_minute } ] } ]` (§2.6).
 *
 * Framework-free (Jest imports it under node) and free of module-level state, because the Location
 * editor's module chunk imports it as well (handoff 2026-09-21 §2).
 */



/** Short weekday names, ISO 1..7 — built per call so the loaded translations apply. */
function dayShort() {
  return ['', (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__._x)('Mon', 'weekday abbreviation', 'aponto'), (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__._x)('Tue', 'weekday abbreviation', 'aponto'), (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__._x)('Wed', 'weekday abbreviation', 'aponto'), (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__._x)('Thu', 'weekday abbreviation', 'aponto'), (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__._x)('Fri', 'weekday abbreviation', 'aponto'), (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__._x)('Sat', 'weekday abbreviation', 'aponto'), (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__._x)('Sun', 'weekday abbreviation', 'aponto')];
}

/**
 * Canonical `weekly` payload rows for contract §2.6: ascending weekday, ascending non-overlapping
 * periods. `JSON.stringify` of the result is also each scope's dirty-check signature, so "what we
 * would send" and "what we compare" can never drift.
 *
 * @param {Object} weekly Editor map.
 * @return {Array} Contract rows.
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

/**
 * Contract rows → editor map.
 *
 * @param {Array} rows Contract rows (a schedule GET's `weekly`).
 * @return {Object} Editor map.
 */
function weeklyMap(rows) {
  const map = {};
  (rows || []).forEach(row => {
    map[row.weekday] = (row.periods || []).map(p => ({
      start: p.start_minute,
      end: p.end_minute
    }));
  });
  return map;
}

/**
 * The editor map a Customize opens on: a DEEP COPY of the source for all seven days (open days carry
 * their periods, every other day is an explicit Closed `[]`), so the grid shows the whole week.
 *
 * `fallback` (default on) is the LEGACY wildcard rule: when the business hours are closed all week
 * (a skipped wizard leaves none) it seeds Mon–Fri 09:00–17:00 so there is something to edit
 * (U4-03b). A BRANCH copy passes `fallback: false` (D-R63 fix round 1): it copies the resolved grid
 * verbatim, and a branch that is closed all week stays closed.
 *
 * @param {Object}  source           Weekday → contract periods `[ { start_minute, end_minute } ]`.
 * @param {Object}  [opts]
 * @param {boolean} [opts.fallback]  Seed Mon–Fri 09:00–17:00 for an all-closed source.
 * @return {Object} Editor map.
 */
function seedWeekly(source, {
  fallback = true
} = {}) {
  const map = {};
  for (let day = 1; day <= 7; day++) {
    const periods = (source || {})[day];
    map[day] = periods && periods.length ? periods.map(p => ({
      start: p.start_minute,
      end: p.end_minute
    })) : [];
  }
  if (fallback && !Object.values(map).some(periods => periods.length)) {
    for (let day = 1; day <= 7; day++) {
      map[day] = day <= 5 ? [{
        start: 540,
        end: 1020
      }] : [];
    }
  }
  return map;
}

/**
 * Contract rows → weekday → contract periods (the shape `seedWeekly` takes).
 *
 * @param {Array} rows Contract rows.
 * @return {Object} Weekday map.
 */
function periodsByWeekday(rows) {
  const map = {};
  (rows || []).forEach(row => {
    map[row.weekday] = row.periods || [];
  });
  return map;
}

/**
 * Deep copy of an editor map, so a copied branch never shares arrays with its source.
 *
 * @param {Object} weekly Editor map.
 * @return {Object} Copy.
 */
function cloneWeekly(weekly) {
  const copy = {};
  Object.keys(weekly || {}).forEach(day => {
    copy[day] = (weekly[day] || []).map(p => ({
      start: p.start,
      end: p.end
    }));
  });
  return copy;
}

/**
 * Whether one scope holds an unsaved edit. `baseline` is null until that scope's GET succeeded, so a
 * scope that failed to load can never look dirty — and the page Save can never replace a real
 * schedule it could not read with an empty one.
 *
 * @param {Object} scope `{ weekly, baseline }`.
 * @return {boolean} Dirty.
 */
function scopeIsDirty(scope) {
  return Boolean(scope) && null !== scope.baseline && undefined !== scope.baseline && JSON.stringify(weeklyRows(scope.weekly)) !== scope.baseline;
}

/**
 * Every dirty scope, All locations (`0`) first then branches ascending — the order the page Save
 * flushes them in, one at a time, through the section's write queue.
 *
 * @param {Object} scopes Location id → scope.
 * @return {number[]} Dirty scope ids.
 */
function dirtyScopeIds(scopes) {
  return Object.keys(scopes || {}).map(Number).filter(id => scopeIsDirty(scopes[id])).sort((a, b) => a - b);
}

/**
 * Where an INHERITING branch scope takes its hours from — the words the card shows.
 *
 * @param {Object} allScope The All-locations scope (`0`).
 * @return {'all'|'business'} Source.
 */
function inheritedSource(allScope) {
  return allScope?.custom ? 'all' : 'business';
}

/**
 * The scopes a branch can "Copy hours from…": All locations always (its rows, or the business hours
 * it inherits — either way a real week), plus every OTHER branch that has custom rows. The branch
 * being edited is never its own source.
 *
 * @param {Object}   args
 * @param {Object}   args.scopes    Location id → scope.
 * @param {number}   args.activeId  The branch being edited.
 * @param {Array}    args.locations Active branches `[ { id, name } ]`, in display order.
 * @return {number[]} Source ids, `0` first.
 */
function copySourceIds({
  scopes,
  activeId,
  locations
}) {
  const ids = [0];
  (locations || []).forEach(location => {
    if (location.id !== activeId && scopes?.[location.id]?.custom) {
      ids.push(location.id);
    }
  });
  return ids;
}

/**
 * One-line weekly summary for read-only surfaces (the Location editor's Hours card):
 * `Mon–Fri 09:00–17:00 · Sat 10:00–14:00`. Consecutive weekdays with IDENTICAL periods collapse
 * into a range; closed days are omitted; an empty week returns ''.
 *
 * @param {Array}  rows       Contract rows (a resolved schedule's `weekly`).
 * @param {string} timeFormat Site PHP time format (12h vs 24h, C7).
 * @return {string} Summary.
 */
function summarizeWeekly(rows, timeFormat) {
  const byDay = periodsByWeekday(rows);
  const names = dayShort();
  const label = day => (byDay[day] || []).map(p => `${(0,_WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_1__.formatMinutes)(p.start_minute, timeFormat)}–${(0,_WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_1__.formatMinutes)(p.end_minute, timeFormat)}`).join(', ');
  const groups = [];
  for (let day = 1; day <= 7; day++) {
    const text = label(day);
    if (!text) {
      continue;
    }
    const last = groups[groups.length - 1];
    if (last && last.text === text && last.to === day - 1) {
      last.to = day;
    } else {
      groups.push({
        from: day,
        to: day,
        text
      });
    }
  }
  return groups.map(group => `${group.from === group.to ? names[group.from] : `${names[group.from]}–${names[group.to]}`} ${group.text}`).join(' · ');
}

/***/ },

/***/ "./assets/src/admin/lib/editor-guards.js"
/*!***********************************************!*\
  !*** ./assets/src/admin/lib/editor-guards.js ***!
  \***********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hashRecord: () => (/* binding */ hashRecord),
/* harmony export */   useEditorGuards: () => (/* binding */ useEditorGuards)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _nav_guard_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./nav-guard.js */ "./assets/src/admin/lib/nav-guard.js");
/**
 * The TWO dirty-editor guards a full-page record editor needs, as one hook (D-R58).
 *
 * `routes/Staff.jsx` and `routes/Services.jsx` open their editors with NO guard of any kind —
 * no `setNavGuard`, no `beforeunload`, not even a question on Cancel — so the header nav, the
 * WordPress submenu and a hand-edited hash all discarded unsaved edits in silence. That is the
 * follow-up the founder delegated in
 * `docs/handoffs/multi-location-slice-1-2-handoff-2026-09-21.md` §4: "Reproduce first; if real,
 * give Staff (and Service) the same two guards Locations has."
 *
 * "The same two guards" is the point, so this is the LOCATIONS shape (D-R56, fix rounds 1–3),
 * extracted rather than copied:
 *
 *   1. **Cross-route** — `lib/nav-guard.js`. `router.js` runs every ROUTE change through it, so
 *      Bookings / Settings / a WP submenu item for another screen all ask first. The registering
 *      effect is keyed on the DIRTY FLAG and on stable callbacks, never dependency-free: a
 *      no-dependency effect re-registers on the re-render the dialog itself causes, so by the time
 *      the operator answers, the handler being cleared is not the handler that is registered, the
 *      clear-only-if-still-mine rule makes `clearNavGuard()` a no-op, and "Discard" re-asks
 *      forever. That bug was shipped once in `LocationEditor` and is not repeated here.
 *
 *   2. **Same-route** — router.js's own header reserves this to the route ("Same-route segment
 *      changes pass through; the owning route component guards its own sub-navigation"). It is a
 *      RENDER-TIME HOLD plus a MOUNT-LIFETIME listener, and it cannot be anything else: in a real
 *      browser `router.js`'s `hashchange` listener runs first, the browser takes a microtask
 *      checkpoint BETWEEN listeners, React flushes, and any listener owned by a re-running effect
 *      has already been torn down before its turn comes (QA instrumented this for D-R56 round 3;
 *      jsdom hides it, because a script-dispatched event has no checkpoint between listeners).
 *      So the hold is what protects the editor — {@link useEditorGuards} simply does not advance
 *      `shownPath`, and the editor is never unmounted — while the listener exists only to notice
 *      a SECOND attempt, which produces no prop change at all because the router's own state
 *      still holds the target.
 *
 * WHAT COUNTS AS A SAME-ROUTE EXIT IS THE CALLER'S TO SAY (`isExit`), and that is the one real
 * difference from Locations. `#locations/{id}` OWNS the Locations editor, so any other
 * `locations/*` path is an exit. Staff and Services open their editors from LOCAL STATE without
 * touching the hash (`#staff` stays put while the workspace is on screen), so most same-route
 * hashes there change no surface and destroy nothing — asking about them would be a dialog for a
 * navigation that is not happening. Each route names the moves that genuinely replace its open
 * editor and stays silent about the rest.
 *
 * NO MODULE-LEVEL STATE, deliberately (handoff §2): a module bundle is compiled its own copy of
 * every `assets/src/admin/lib/*` file it imports, so anything kept here would silently split in
 * two. Everything this hook owns lives in React state and refs, i.e. per mounted component; the
 * one genuinely shared slot is `nav-guard.js`'s, which already lives on `window.apontoAdmin`.
 * That is what would let `LocationsRoute` / `LocationEditor` adopt this hook later from inside
 * a module entry's own lazy chunk — not done in this change, which touches neither file.
 */



/** Stable empty default, so an omitted `segments` prop does not churn `hashPath`. */
const NO_SEGMENTS = [];

/**
 * The default `isExit`: no same-route hash change replaces this route's editor.
 *
 * @return {boolean} Always false.
 */
function neverExits() {
  return false;
}

/**
 * The record a `{route}/{id}` hash path names, or '' when it names none.
 *
 * Shared by the routes that need it, so "which record does this hash mean" has one answer. The
 * routes narrow it further — Services only accepts digits, because its second segment is also
 * where its tab ids live.
 *
 * @param {string} path Hash path, without the leading `#`.
 * @return {string} The second segment, or ''.
 */
function hashRecord(path) {
  const parts = String(path || '').split('/').filter(Boolean);
  return parts[1] ? String(parts[1]) : '';
}

/**
 * Guard one full-page record editor against both kinds of in-app navigation.
 *
 * @param {Object}   options               Hook options.
 * @param {string[]} [options.segments]    The router's hash segments for this route.
 * @param {boolean}  [options.dirty]       Whether the OPEN editor holds unsaved edits. False when
 *                                         no editor is open — the route reports it up from the
 *                                         editor's own dirty computation.
 * @param {Function} options.confirm       `confirm( opts )` from `lib/confirm.jsx`. Stable.
 * @param {Function} options.discardPrompt `() => opts` — the question, in the editor's own words,
 *                                         so both guards ask it identically. Must be stable
 *                                         (a module-level function), because it keys the
 *                                         registering effect.
 * @param {Function} [options.isExit]      `( nextPath ) => boolean` — whether this same-route move
 *                                         would replace or unmount the open editor. ONE argument
 *                                         on purpose (fix round 2): the answer must be decided
 *                                         against the RECORD THE ROUTE ACTUALLY HAS OPEN, never
 *                                         against the last path this hook was shown. Browser QA
 *                                         found the difference the hard way — see the note on
 *                                         {@link useEditorGuards}'s hold below. Read through a
 *                                         ref, so its identity may change freely.
 * @param {Function} [options.onDiscard]   Called synchronously when a confirmed discard leaves
 *                                         THIS route on screen (the same-route path). The route
 *                                         must use it to RESET the editor — bumping the key it
 *                                         renders the editor with is the honest way — because a
 *                                         discard that leaves the typed text in the form is not a
 *                                         discard. See the stranding note below.
 * @return {{shownPath: string, release: () => void}} `shownPath` is the hash path the surface on
 *         screen corresponds to — the route resolves its deep link / tab from THIS, not from
 *         `segments`, which is what makes the hold protect anything. `release()` drops the guard
 *         synchronously and marks the editor as leaving, for the paths the route settles itself
 *         (Save, a confirmed Cancel): without it the guard would still be registered when the
 *         close assigns a new hash, and the operator would be asked about a departure they just
 *         approved.
 */
function useEditorGuards({
  segments = NO_SEGMENTS,
  dirty = false,
  confirm,
  discardPrompt,
  isExit = neverExits,
  onDiscard
}) {
  // The operator has answered (or saved) and this editor is on its way out. It stops counting as
  // dirty from that moment, so the guard cannot RE-REGISTER between the answer and the editor
  // actually going — which would ask the same question a second time on the very navigation that
  // was just approved (the D-R56 round-1 guard-lifecycle bug).
  //
  // THE LATCH MUST NOT OUTLIVE THE TRANSITION IT WAS SET FOR (fix round 2). Browser QA found a
  // dirty editor left permanently UNGUARDED and still visibly dirty: a discard was confirmed for
  // a target that then replaced nothing, the editor never unmounted, so it never reported clean,
  // so the "drops when clean" rule below never fired. Two things close that off — `leavingFor`,
  // which retires the latch the moment the surface on screen IS the target it was set for, and
  // `onDiscard`, which makes the editor genuinely clean again. Either alone would do; together
  // the stranded state is unreachable, and the worst case if one ever failed is a guard that
  // re-arms too eagerly rather than an editor that silently loses work.
  const [leaving, setLeaving] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const guarded = Boolean(dirty) && !leaving;
  /** The path the current latch was set for, or null when the caller named none. */
  const leavingFor = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);

  /**
   * Release whatever guard is CURRENTLY registered, whoever registered it.
   *
   * Reads the ref, never a closure's own handler: a closure that has been waiting on a dialog
   * holds a handler the next render already replaced, and `clearNavGuard( stale )` is a no-op
   * under the only-if-still-mine rule — which is precisely how the round-1 Locations editor
   * intercepted the navigation the operator had just approved, forever.
   *
   * EVERY `release()` must be paired with an unmount or a reset. The route's own close paths
   * unmount the editor; the same-route discard below resets it through `onDiscard`. A `release()`
   * with neither leaves an editor holding edits that nothing is guarding.
   *
   * @param {string|null} [target] Hash path this release is for, when there is one. The latch
   *                               retires as soon as that path is the surface on screen.
   */
  const guardRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  const release = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)((target = null) => {
    if (guardRef.current) {
      (0,_nav_guard_js__WEBPACK_IMPORTED_MODULE_1__.clearNavGuard)(guardRef.current);
      guardRef.current = null;
    }
    leavingFor.current = 'string' === typeof target ? target : null;
    setLeaving(true);
  }, []);

  // GUARD 1 — CROSS-ROUTE (lib/nav-guard.js, honoured by router.js's `settle()`).
  //
  // Keyed on `[ guarded ]` and three stable callbacks, exactly like `settings/SettingsApp.jsx`:
  // the handler only ASKS A QUESTION, so it never needs a fresh closure over the form, and
  // re-registering it on every render is the bug, not the safety margin.
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!guarded) {
      return undefined;
    }
    const handler = (proceed, cancel) => {
      confirm(discardPrompt()).then(ok => {
        if (!ok) {
          cancel?.();
          return;
        }
        // Unregister SYNCHRONOUSLY — `leaving` only settles on the next render, and the
        // resumed hash assignment re-enters the router before that.
        release();
        proceed();
      });
    };
    guardRef.current = handler;
    (0,_nav_guard_js__WEBPACK_IMPORTED_MODULE_1__.setNavGuard)(handler);
    return () => {
      (0,_nav_guard_js__WEBPACK_IMPORTED_MODULE_1__.clearNavGuard)(handler);
      if (guardRef.current === handler) {
        guardRef.current = null;
      }
    };
  }, [guarded, confirm, discardPrompt, release]);

  // GUARD 2, PART 1 — THE RENDER-TIME HOLD.
  //
  // `shownPath` is the surface ON SCREEN, and it is STATE: when the incoming segments name a
  // different same-route path that WOULD replace the open editor, this render simply does not
  // advance it, so the editor is never unmounted and the form state — the thing being protected —
  // survives. A clean editor, or a move that replaces nothing, just follows.
  //
  // The trigger is the PREVIOUS props value, not `shownPath`: after a decline the router keeps
  // holding the target, and reacting to that standing disagreement would re-ask on every
  // unrelated re-render. The JUDGEMENT, though, is `isExit( hashPath )` alone — it is not given
  // `shownPath`, because deciding against the last path is what browser QA found broken (fix
  // round 2): Back from `#staff/3` to `#staff` is a non-exit, so the hold advanced `shownPath` to
  // `staff`, and pressing Forward straight back to `#staff/3` then looked like "another record's
  // deep link" and asked the operator to discard the record they were already editing. The route
  // knows which record is open; only that can answer the question.
  const hashPath = (Array.isArray(segments) ? segments : NO_SEGMENTS).join('/');
  const [shownPath, setShownPath] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(hashPath);
  const [pendingPath, setPendingPath] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const previousHash = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(hashPath);
  // Readable from the mount-lifetime listener below without re-subscribing. Assigned during
  // render, the same idiom `router.js` uses for its own route mirror.
  const shownRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(shownPath);
  shownRef.current = shownPath;
  const guardedRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(guarded);
  guardedRef.current = guarded;
  const isExitRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(isExit);
  isExitRef.current = isExit;
  // Read through a ref for the same reason: the route rebuilds this callback whenever the record
  // it has open changes, and the prompt effect must not be re-keyed by that.
  const onDiscardRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(onDiscard);
  onDiscardRef.current = onDiscard;
  // The target the operator has already refused. Without it, "Keep editing" would be re-asked on
  // the next render, because the router's own state still points at that target.
  const declined = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  if (hashPath !== previousHash.current) {
    previousHash.current = hashPath;
    if (hashPath !== shownPath) {
      if (guarded && isExit(hashPath)) {
        if (declined.current !== hashPath) {
          // Ask (part 2). Deliberately NOT advancing `shownPath`: the editor stays mounted.
          setPendingPath(hashPath);
        }
      } else {
        setShownPath(hashPath);
      }
    }
  }

  // RETIRE THE LATCH (fix round 2). Two independent conditions, because each covers a case the
  // other cannot: the transition the latch was set for has been APPLIED — the surface on screen
  // is now that target, so whatever was going to happen has happened — or some editor is
  // reporting clean again, which is how the paths that name no target (a confirmed Cancel, a
  // cross-route discard, a Save) retire theirs. Waiting only for the clean report is what left a
  // dirty editor permanently unguarded when the discard replaced nothing.
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!leaving) {
      return;
    }
    if (!dirty || null !== leavingFor.current && shownPath === leavingFor.current) {
      leavingFor.current = null;
      setLeaving(false);
    }
  }, [leaving, dirty, shownPath]);

  // GUARD 2, PART 2 — THE PROMPT.
  //
  // `pendingPath` IS the latch: it is set once by the hold (or by the listener in part 3), and
  // while it is non-null neither path can set it again, so two triggers for one move cannot stack
  // two dialogs. The hash is put back with `replaceState`, which fires no event and therefore
  // cannot re-enter anything.
  //
  // On DISCARD the target is applied here rather than left to the router, because the router's
  // state very often already holds it — that is how this route heard about the move at all — and
  // would answer a re-navigation with "already here".
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!pendingPath) {
      return undefined;
    }
    let live = true;
    window.history.replaceState(null, '', '#' + shownRef.current);
    confirm(discardPrompt()).then(ok => {
      if (!live) {
        return;
      }
      if (!ok) {
        // Stay. The hash is already back; remember the refusal so the standing prop
        // disagreement does not re-ask on the next render.
        declined.current = pendingPath;
        setPendingPath(null);
        return;
      }
      // The latch is named for THIS target, so it retires the moment the target is on screen
      // — whether or not anything unmounted.
      release(pendingPath);
      // DISCARD MEANS DISCARD (fix round 2). Applying the target usually replaces the editor
      // on its own, but it is not guaranteed to: a hand-edited hash can name a record the
      // list does not hold (the `per_page: 100` window), and then nothing remounts and the
      // operator is left looking at the very text they asked to throw away. The route resets
      // the editor for us, which is also what puts the sub-sections' drafts — work hours,
      // time off, staff assignments — back where they were.
      onDiscardRef.current?.();
      declined.current = null;
      setShownPath(pendingPath);
      setPendingPath(null);
      window.location.hash = pendingPath;
    });
    return () => {
      live = false;
    };
  }, [pendingPath, confirm, discardPrompt, release]);

  // GUARD 2, PART 3 — THE REPEATED ATTEMPT.
  //
  // Once part 2 has restored the hash, the router's state still holds the target while the URL
  // says editor — so a SECOND Back (or a second hand-edit to the same hash) produces no prop
  // change at all and the hold has nothing to react to. This listener is the only thing that can
  // notice it.
  //
  // Registered ONCE for the life of the route (`[]`), never re-registered by a render: that is
  // exactly the mistake round 2 made, where a re-render tore the listener down before the browser
  // reached it. Everything it needs is a ref, so there is nothing for a dependency array to
  // invalidate. It tolerates arriving after the hold has already handled the same event —
  // `pendingPath` is set, and the updater leaves it alone.
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    const onHash = () => {
      const now = window.location.hash.replace(/^#/, '');
      if (now === shownRef.current || !guardedRef.current) {
        return;
      }
      // A different ROUTE is `router.js`'s guard (which works); asking here too would prompt
      // twice for one navigation.
      if (now.split('/')[0] !== shownRef.current.split('/')[0]) {
        return;
      }
      if (!isExitRef.current(now)) {
        return;
      }
      // A fresh attempt deserves a fresh question, even one the operator refused before.
      declined.current = null;
      setPendingPath(current => current || now);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return {
    shownPath,
    release
  };
}

/***/ },

/***/ "./assets/src/admin/lib/focus-first-error.js"
/*!***************************************************!*\
  !*** ./assets/src/admin/lib/focus-first-error.js ***!
  \***************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   firstErrorControl: () => (/* binding */ firstErrorControl),
/* harmony export */   focusFirstError: () => (/* binding */ focusFirstError),
/* harmony export */   useFocusFirstError: () => (/* binding */ useFocusFirstError)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _ui_jsx__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./ui.jsx */ "./assets/src/admin/lib/ui.jsx");
/**
 * Take the operator to the first field a save rejected (founder QA 2026-09-21).
 *
 * THE BUG THIS ANSWERS. Both full-page record editors set field errors inline and did nothing
 * else: no scroll, no focus move, no announcement. With the carded layout a long editor is
 * several screens tall, so pressing Save on a service whose NAME is empty while the viewport sits
 * on "Booking policy" looked like the button was broken — the error was painted two screens up,
 * focus stayed on Save, and nothing said a word. That is true of a client-side refusal and of a
 * server `422` with `data.fields` alike, and it is the same gap in both editors, so it is one
 * helper rather than two near-copies.
 *
 * WHY IT SCROLLS THE CONTROL TO THE CENTRE. The editors sit under a sticky page chrome whose
 * height is not one number: the WordPress admin bar is 32px on the desktop breakpoint and 46px
 * at ≤782px, and the sticky section nav adds its own gap. `block: 'center'` is correct at every
 * one of those heights without a magic constant to keep in sync with the stylesheet, and a
 * centred field is also simply easier to find than one pinned to the top edge. The cards keep
 * their `scroll-margin-top` for the section NAV, which is a different job.
 *
 * WHY `preventScroll` ON THE FOCUS. `focus()` scrolls the element into view on its own, with no
 * behaviour or block control, so focusing first and scrolling second makes the browser jump twice
 * — once instantly, once smoothly, from two different positions. Focus with `preventScroll: true`
 * and let the explicit scroll be the only movement.
 */



/**
 * The control a field error belongs to, in DOM order.
 *
 * Looks for `.has-error` — the class BOTH editors already put on the field wrapper when a key of
 * `fieldError` is set — and takes the first focusable control inside it. Keying on the rendered
 * error rather than on the error OBJECT is deliberate: the object's keys are wire names
 * (`price_minor`, `min_lead_minutes`) that do not always match an input's `name`, while
 * `.has-error` is by construction exactly the set of fields the operator can see is wrong.
 *
 * @param {ParentNode} container Editor root to search.
 * @return {?HTMLElement} The control, or `null` when nothing is marked.
 */
function firstErrorControl(container) {
  if (!container) {
    return null;
  }

  // A real form control first; a BUTTON only as a fallback. The featured-image and avatar
  // fields are a preview plus a "Choose photo" button and hold no input at all, so without the
  // fallback a `422` on `avatar_id`/`image_id` would mark a field the operator cannot be sent
  // to. The order matters: a field that has both (the colour picker has an input AND a Clear
  // button) must hand back the input.
  const wrappers = container.querySelectorAll('.has-error');
  for (const wrapper of wrappers) {
    const control = wrapper.matches?.('input, select, textarea') ? wrapper : wrapper.querySelector('input, select, textarea') || wrapper.querySelector('button');
    if (control && !control.disabled) {
      return control;
    }
  }
  return null;
}

/**
 * Scroll to and focus the first rejected field, and say so.
 *
 * Safe to call when nothing is marked — it simply answers `false`, so a caller can use the
 * return value to decide whether it still owes the operator a toast of its own.
 *
 * @param {ParentNode} container      Editor root to search.
 * @param {Function}   [announce]     Called with the announcement string when a field was found.
 * @param {string}     [message]      Announcement copy.
 * @return {boolean} Whether a field was found, scrolled to and focused.
 */
function focusFirstError(container, announce, message = 'Check the highlighted fields.') {
  const control = firstErrorControl(container);
  if (!control) {
    return false;
  }
  control.focus?.({
    preventScroll: true
  });
  control.scrollIntoView?.({
    behavior: (0,_ui_jsx__WEBPACK_IMPORTED_MODULE_1__.motionScrollBehavior)(),
    block: 'center'
  });
  announce?.(message, 'danger');
  return true;
}

/**
 * Run the focus step after a save has painted its errors, WITHOUT depending on
 * `requestAnimationFrame` (founder QA 2026-09-21, round 3).
 *
 * THE BUG. Both editors scheduled the focus with `requestAnimationFrame`, and an embedded
 * browser pane — or an ordinary backgrounded tab — THROTTLES rAF, in some states to never. QA
 * caught `document.activeElement` still on `BODY` after a failed save with the pane hidden: the
 * error paint happened, the focus never did. rAF is a rendering hint, not a scheduler, and
 * correctness must not hang on it.
 *
 * A React EFFECT is the right instrument and needs no scheduler at all: it runs after the DOM
 * is committed, which is the only property the caller actually wanted. The `token` is a counter
 * the save path bumps, so two identical refusals in a row still fire — keying on the error
 * object would not, because a re-submitted form can produce an equal one.
 *
 * @param {number}                    token    Bumped once per refusal; `0` means "never yet".
 * @param {import('react').RefObject} rootRef  Editor root.
 * @param {import('react').RefObject} planRef  `{ announce, message }` for this refusal.
 */
function useFocusFirstError(token, rootRef, planRef) {
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!token) {
      return;
    }
    const plan = planRef.current || {};
    if (!focusFirstError(rootRef.current, plan.announce, plan.message)) {
      plan.fallback?.();
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
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

/***/ "./assets/src/admin/lib/section-nav.js"
/*!*********************************************!*\
  !*** ./assets/src/admin/lib/section-nav.js ***!
  \*********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   activeSectionId: () => (/* binding */ activeSectionId),
/* harmony export */   crossingLine: () => (/* binding */ crossingLine),
/* harmony export */   useSectionNav: () => (/* binding */ useSectionNav)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _ui_jsx__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./ui.jsx */ "./assets/src/admin/lib/ui.jsx");
/**
 * The sticky section nav of the full-page record editors: which item is lit, and how a click
 * gets you there (founder QA 2026-09-21, corrected after the round-2 browser pass).
 *
 * ROUND 1 replaced an IntersectionObserver whose `rootMargin` band was ~10% of the viewport
 * tall — several cards are SHORTER than that, so a one-paragraph card could never be
 * "intersecting" it and never lit at all.
 *
 * ROUND 2 found the replacement's own bug, and it is worth stating precisely because it is the
 * kind of thing that looks right in every unit test and is wrong on every real page. The
 * crossing line was `adminBarHeight() + 48` = **80px**, but a nav click lands a section at
 * **128px**: `html { scroll-padding-top: 32px }` plus the card's own
 * `scroll-margin-top: 96px`. So a section was never "crossed" at the exact position a click
 * put it — the spy disagreed with the scroller by 48px, every time. Measured consequences:
 * "Staff & locations" never activated on the Service editor, "Work hours" never activated on
 * the Staff editor, and a click on "Public profile" REVERTED to Details the moment the
 * optimistic lock expired.
 *
 * So the line is no longer a guess. It is read from the very properties the browser uses to
 * decide where `scrollIntoView` stops — {@see crossingLine} — which means the spy and the
 * scroller cannot drift apart again, whatever the sticky chrome does next.
 *
 * ROUND 3 replaced the tail of that rule. The crossing line was right, but a section whose
 * `reachY` (the scroll position at which it would cross) exceeds `maxScroll` can NEVER be
 * reached — the page clamps first — and the `atBottom` + viewport-middle heuristic that was
 * covering for it was both incomplete and non-monotonic. Measured: on the Service editor at
 * 1440x900 "Booking policy" never activated at any scroll position, a click on it reverted
 * ~0.7s later, and at 1440x1300 the bottom clamp jumped from "Public content" straight to
 * "Staff & locations", skipping "Duration & price" entirely.
 *
 * The replacement is one deterministic rule with no heuristics in it: the UNREACHABLE TAIL
 * SHARES THE FINAL STRETCH OF SCROLL. See {@see activeSectionId}. It guarantees that every nav
 * item activates, in document order, never backwards, on any viewport height, and it needs no
 * dead padding at the foot of the page to do it.
 *
 * Two more rules earn their place, each from a measured failure:
 *
 *  - **A clicked target holds until the OPERATOR scrolls**, not until a timer expires. Releasing
 *    on `scrollend` alone is what made a click on an unreachable section revert: the smooth
 *    scroll ends at the clamp, the lock lifts, and the rule answers with whatever is actually on
 *    the line. User intent is read from `wheel`, `touchmove` and the scrolling keys, plus a
 *    post-settle guard for anything else (a scrollbar drag).
 *  - **A page that cannot scroll has no spy.** `maxScroll <= 2` at load lit the LAST item.
 */



/**
 * Slack, in pixels, on the crossing test.
 *
 * Sub-pixel layout, zoom and fractional device ratios mean a section that the scroller put
 * exactly on the line can measure a hair below it. Without this the section a click just
 * scrolled to can fail its own crossing test by a quarter of a pixel.
 */
const CROSSING_TOLERANCE = 6;

/** Fallback for browsers without `scrollend`: how long a click owns the highlight. */
const SCROLL_SETTLE_MS = 700;

/**
 * Where a section comes to rest when it is scrolled to, which is the only sensible line for
 * "this section is now the current one".
 *
 * `scroll-padding-top` belongs to the scrolling element and `scroll-margin-top` to the target;
 * the browser adds them, and so do we. Both are read from computed style rather than mirrored
 * as constants, so a stylesheet change moves the nav's idea of "current" with it.
 *
 * @param {Element} section The section element.
 * @return {number} The crossing line in pixels from the top of the viewport.
 */
function crossingLine(section) {
  const view = section?.ownerDocument?.defaultView;
  if (!view?.getComputedStyle) {
    return CROSSING_TOLERANCE;
  }
  const padding = parseFloat(view.getComputedStyle(section.ownerDocument.documentElement).scrollPaddingTop);
  const margin = parseFloat(view.getComputedStyle(section).scrollMarginTop);
  return (padding || 0) + (margin || 0) + CROSSING_TOLERANCE;
}

/**
 * Which section is current, as a pure function of the page geometry.
 *
 * THE RULE, in two halves.
 *
 * **Reachable sections behave exactly as before.** A section's `reachY` is the scroll position
 * at which its top lands on its own line: `docTop - line`. While `scrollY` has passed a
 * section's `reachY` and not the next one's, that section is current.
 *
 * **The unreachable tail shares the final stretch.** A section whose `reachY` exceeds
 * `maxScroll` can never come to rest on its line, because the page stops scrolling first — that
 * is not an edge case, it is every last card on a tall viewport. Since `docTop` increases down
 * the page and the line is effectively constant, the unreachable sections are always a SUFFIX.
 * So the remaining scroll from the last reachable section's `reachY` (`y0`) to `maxScroll` is
 * divided into `tail.length + 1` equal slices: slice 0 belongs to that last reachable section,
 * slice k to the k-th unreachable one, and the last slice — anything within 2px of the bottom —
 * always belongs to the final section.
 *
 * That is what makes the guarantee total: EVERY item activates, in order, monotonically, at any
 * viewport height, with no padding added to the document to make room. A degenerate interval
 * (fewer pixels left than there are slices) falls back to "at the bottom, the last section",
 * which is the only honest answer when there is no scroll left to divide.
 *
 * @param {Array<{id: string, docTop: number, line: number}>} sections Sections in DOM order,
 *        each with its position in the DOCUMENT and its own crossing line.
 * @param {Object}  [options]             Rule inputs.
 * @param {number}  [options.scrollY]     Current scroll position.
 * @param {number}  [options.maxScroll]   `scrollHeight - innerHeight`, never negative.
 * @param {?string} [options.clicked]     A target the operator just asked for.
 * @return {?string} The active section id, or `null` when there are no sections.
 */
function activeSectionId(sections, options = {}) {
  const {
    scrollY = 0,
    maxScroll = 0,
    clicked = null
  } = options;
  if (!sections || !sections.length) {
    return null;
  }

  // An explicit request beats every derived answer, for as long as the hook holds it.
  if (clicked && sections.some(section => section.id === clicked)) {
    return clicked;
  }

  // Nothing to spy on: every section is on screen at once and no scrolling will change that,
  // so the honest answer is the first one.
  if (maxScroll <= 2) {
    return sections[0].id;
  }
  const reach = sections.map(section => section.docTop - section.line);

  // The last section that can actually come to rest on its line. `-1` when none can, which is
  // a real case on a very tall viewport: then the whole list is the tail.
  let lastReachable = -1;
  reach.forEach((y, i) => {
    if (y <= maxScroll) {
      lastReachable = i;
    }
  });

  // Ordinary crossing, for everything before the shared stretch.
  let current = -1;
  for (let i = 0; i <= lastReachable; i++) {
    if (scrollY >= reach[i]) {
      current = i;
    }
  }

  // Where the shared stretch starts, given the section that anchors it. When that anchor is
  // itself unreachable — a viewport so tall that not even the first card reaches its line —
  // the stretch starts at the very top, because there is no crossing to start it from.
  const startOf = i => reach[i] <= maxScroll ? Math.max(reach[i], 0) : 0;
  let base = Math.max(lastReachable, 0);
  let slices = sections.length - base;
  // A section can be reachable by a single pixel — `reachY` exactly equal to `maxScroll` —
  // which leaves the tail no room at all and would silently skip it. Widening the stretch one
  // section at a time until it can actually be divided is what turns the guarantee ("every
  // item activates") from a near-miss into a fact; it costs the anchor section its dedicated
  // crossing point, which is the right trade when the alternative is a dead nav entry.
  while (base > 0 && maxScroll - startOf(base) < slices) {
    base--;
    slices++;
  }

  // No tail to share: every section is reachable and the crossing rule is the whole answer.
  if (slices <= 1) {
    return current < 0 ? sections[0].id : sections[current].id;
  }

  // Still above the shared stretch: the ordinary crossing rule still applies. Guarded on
  // `base > 0`, because when the stretch starts at the very top there is nothing above it —
  // and `current` is legitimately `-1` there, since no section has a crossing to pass.
  if (base > 0 && current < base) {
    return current < 0 ? sections[0].id : sections[current].id;
  }
  const y0 = startOf(base);
  const span = maxScroll - y0;
  const atBottom = scrollY >= maxScroll - 2;

  // Fewer pixels left than slices even after widening: there is nothing meaningful to divide,
  // so the only defensible answers are "the anchor" and, at the bottom, "the last one".
  if (span < slices) {
    return atBottom ? sections[sections.length - 1].id : sections[base].id;
  }
  if (atBottom) {
    return sections[sections.length - 1].id;
  }
  if (scrollY <= y0) {
    return sections[base].id;
  }
  const step = Math.floor((scrollY - y0) / (span / slices));
  return sections[base + Math.min(Math.max(step, 0), slices - 1)].id;
}

/**
 * Sticky section nav for one record editor.
 *
 * @param {Object}                     options          Hook options.
 * @param {Array<Array<string>>}       options.anchors  `[ id, label ]` pairs, in DOM order.
 * @param {import('react').RefObject}  options.bodyRef  Ref to the element holding the sections.
 * @param {string}                     options.prefix   Anchor id prefix, e.g. `service-`.
 * @param {boolean}                    [options.ready]  False while the editor is still loading.
 * @return {{active: string, scrollTo: Function}} The lit anchor id and the click handler.
 */
function useSectionNav({
  anchors,
  bodyRef,
  prefix,
  ready = true
}) {
  const [active, setActive] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(anchors[0]?.[0] ?? '');
  // The target of a click the operator has not yet scrolled away from. A ref, not state: the
  // scroll listener reads it without re-subscribing on every change.
  const clicked = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  // Set once the programmatic scroll has settled. From then on ANY scroll movement of more
  // than a couple of pixels is the operator's, which covers the inputs we cannot observe
  // directly — a scrollbar drag above all.
  const armed = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(false);
  const lockedAt = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(0);
  const release = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(() => {});
  const ids = anchors.map(([id]) => id).join('|');
  const measure = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
    const root = bodyRef.current;
    if (!root) {
      return;
    }
    const scrollY = window.scrollY;
    const sections = ids.split('|').filter(Boolean).map(id => {
      const node = root.querySelector(`#${prefix}${id}`);
      if (!node) {
        return null;
      }
      // DOCUMENT-relative, because the rule reasons about the scroll position at which
      // a section would reach its line — a quantity that has to be comparable with
      // `maxScroll`, and a viewport-relative top is not.
      return {
        id,
        docTop: node.getBoundingClientRect().top + scrollY,
        line: crossingLine(node)
      };
    }).filter(Boolean);
    const doc = document.documentElement;
    const next = activeSectionId(sections, {
      scrollY,
      maxScroll: Math.max(doc.scrollHeight - window.innerHeight, 0),
      clicked: clicked.current
    });
    if (next) {
      setActive(next);
    }
  }, [bodyRef, ids, prefix]);

  // Drop the click lock and re-derive once. Kept in a ref so every listener registered by
  // `scrollTo` — and the unmount cleanup — reaches the current version.
  release.current = () => {
    clicked.current = null;
    armed.current = false;
    measure();
  };
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!ready) {
      return undefined;
    }
    let frame = 0;
    const onScroll = () => {
      // Post-settle guard: the scroll is moving and the programmatic one is over, so this
      // is the operator. Catches the inputs with no event of their own (scrollbar drag,
      // a trackpad fling still decelerating, programmatic scrolls from elsewhere).
      if (clicked.current && armed.current && Math.abs(window.scrollY - lockedAt.current) > 2) {
        release.current();
        return;
      }
      if (frame) {
        return;
      }
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };
    measure();
    window.addEventListener('scroll', onScroll, {
      passive: true
    });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [measure, ready]);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => () => {
    clicked.current = null;
    armed.current = false;
  }, []);

  /**
   * Go to a section and light its nav item.
   *
   * THE ONE PATH. A nav click and the Service editor's post-create hand-off both come through
   * here, so they cannot land in two different places again. The scroll itself is deferred to
   * the next frame because the post-create caller scrolls to a section the same state update
   * has just revealed — measuring before the next paint measures the OLD layout.
   *
   * THE LOCK IS RELEASED BY THE OPERATOR, NOT BY A CLOCK (founder QA 2026-09-21, round 3).
   * Releasing on `scrollend` alone is exactly what made a click on an unreachable section
   * revert half a second later: the smooth scroll ends at the page's clamp, the lock lifts,
   * and the derived answer is whatever is genuinely on the line — which for that section is
   * never itself. So the lock ends on evidence of INTENT: a wheel, a touch drag, a scrolling
   * key, or (once the programmatic scroll has settled) any real movement at all.
   *
   * @param {string} id Anchor id, without the prefix.
   */
  const scrollTo = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(id => {
    setActive(id);
    clicked.current = id;
    armed.current = false;
    const keys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar'];
    const onKey = event => {
      if (keys.includes(event.key)) {
        letGo();
      }
    };
    function letGo() {
      window.removeEventListener('wheel', letGo);
      window.removeEventListener('touchmove', letGo);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scrollend', arm);
      release.current();
    }
    // Arming does NOT release: the smooth scroll has merely finished, and the operator may
    // well be looking at exactly where they asked to be. It only says that from here on,
    // movement means them.
    function arm() {
      armed.current = true;
      lockedAt.current = window.scrollY;
    }
    window.addEventListener('wheel', letGo, {
      once: true,
      passive: true
    });
    window.addEventListener('touchmove', letGo, {
      once: true,
      passive: true
    });
    window.addEventListener('keydown', onKey);
    if ('onscrollend' in window) {
      window.addEventListener('scrollend', arm, {
        once: true
      });
    }
    // The timer is not a nicety: a browser without `scrollend`, or a scroll that never
    // starts because the target is already in place, would otherwise never arm the guard.
    window.setTimeout(arm, SCROLL_SETTLE_MS);
    window.requestAnimationFrame(() => {
      // Optional call: `scrollIntoView` is absent in jsdom, and an editor is mounted in
      // unit tests that exercise the save paths this handler now runs from.
      bodyRef.current?.querySelector(`#${prefix}${id}`)?.scrollIntoView?.({
        behavior: (0,_ui_jsx__WEBPACK_IMPORTED_MODULE_1__.motionScrollBehavior)(),
        block: 'start'
      });
    });
  }, [bodyRef, prefix]);
  return {
    active,
    scrollTo
  };
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
/* harmony import */ var _shared_person_name_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../shared/person-name.js */ "./assets/src/shared/person-name.js");
/* harmony import */ var _modules_catalog_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../modules/catalog.js */ "./assets/src/admin/modules/catalog.js");
/* harmony import */ var _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../lib/icon.jsx */ "./assets/src/admin/lib/icon.jsx");
/* harmony import */ var _lib_ui_jsx__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../lib/ui.jsx */ "./assets/src/admin/lib/ui.jsx");
/* harmony import */ var _lib_toast_jsx__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../lib/toast.jsx */ "./assets/src/admin/lib/toast.jsx");
/* harmony import */ var _lib_confirm_jsx__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../lib/confirm.jsx */ "./assets/src/admin/lib/confirm.jsx");
/* harmony import */ var _lib_RowMenu_jsx__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../lib/RowMenu.jsx */ "./assets/src/admin/lib/RowMenu.jsx");
/* harmony import */ var _lib_facets_jsx__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../lib/facets.jsx */ "./assets/src/admin/lib/facets.jsx");
/* harmony import */ var _lib_editor_guards_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../lib/editor-guards.js */ "./assets/src/admin/lib/editor-guards.js");
/* harmony import */ var _lib_router_js__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ../lib/router.js */ "./assets/src/admin/lib/router.js");
/* harmony import */ var _lib_in_flight_js__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ../lib/in-flight.js */ "./assets/src/admin/lib/in-flight.js");
/* harmony import */ var _StaffWorkspace_jsx__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ./StaffWorkspace.jsx */ "./assets/src/admin/routes/StaffWorkspace.jsx");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__);
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

/**
 * The initials mark with the resolved photo painted over it, revealed only once it loads
 * (D-R51).
 *
 * The server no longer asks gravatar.com whether a staff member has a picture — the URL simply
 * carries `d=404` — so a 404 is an ORDINARY outcome on this screen too. Rendering initials
 * first and fading the image in means a row never shows a broken-image glyph and never shifts;
 * `onError` removes the image, so the failed URL cannot be requested again.
 *
 * @param {{firstName: string, lastName: string, name: string, photo: string, size: number}} props Mark props.
 */
function StaffMark({
  firstName,
  lastName,
  name,
  photo,
  size
}) {
  const [failed, setFailed] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [loaded, setLoaded] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("span", {
    className: "pmdk-avatar ap-avatar-mark",
    "aria-hidden": "true",
    children: [(0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_5__.initials)(firstName, lastName) || (0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_5__.initials)(name, '') || '?', photo && !failed ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("img", {
      className: `ap-avatar-photo${loaded ? ' is-loaded' : ''}`,
      src: photo,
      alt: "",
      width: size,
      height: size,
      loading: "lazy",
      decoding: "async",
      onLoad: () => setLoaded(true),
      onError: () => setFailed(true)
    }) : null]
  });
}
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
  const showToast = (0,_lib_toast_jsx__WEBPACK_IMPORTED_MODULE_9__.useToast)();
  const {
    confirm,
    dialog
  } = (0,_lib_confirm_jsx__WEBPACK_IMPORTED_MODULE_10__.useConfirmDialog)();
  const multiStaff = (0,_modules_catalog_js__WEBPACK_IMPORTED_MODULE_6__.moduleAvailable)(_lib_config_js__WEBPACK_IMPORTED_MODULE_4__.config, 'multi_staff');
  const [state, setState] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)({
    status: 'loading',
    rows: [],
    error: null
  });
  const [workspace, setWorkspace] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null); // { mode, staff }
  // Whether the OPEN workspace holds unsaved edits — reported up by `StaffWorkspace` from its own
  // dirty computation (details + a work-hours draft + a started time-off entry), because this is
  // the component that owns both guards (D-R58). Handoff 2026-09-21 §4: the editor had none at
  // all, so pressing "Bookings" with a half-typed profile on screen left silently.
  const [editorDirty, setEditorDirty] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  /**
   * Bumped by a confirmed discard that leaves this route on screen, and part of the editor's
   * `key`, so the discard actually empties the form (fix round 2). Applying the target usually
   * replaces the editor by itself; it does not when the target names a record this list does not
   * hold — a hand-edited hash, or anything past the `per_page: 100` window — and QA found exactly
   * that state: the typed text still on screen, nothing guarding it. A remount is also what puts
   * the work-hours and time-off drafts back, because they are state of the unmounted children.
   */
  const [editorEpoch, setEditorEpoch] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(0);
  const onDiscard = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => setEditorEpoch(epoch => epoch + 1), []);

  // The workspace on screen, resolved BEFORE the guards so they can be told which record is open.
  // Free never renders the collection table: it opens the lowest-id profile directly, and an
  // `empty` account opens the create form (SPEC-P1 §1.2).
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
  const activeWorkspace = workspace || singletonWorkspace;
  const singletonDirect = !workspace && Boolean(singletonWorkspace);
  /** The record the editor is open on right now — `new` for a create, '' for the list. */
  const openRecord = activeWorkspace ? String(activeWorkspace.staff?.id ?? 'new') : '';

  /**
   * Which same-route hash moves would REPLACE the open workspace.
   *
   * Only one does: a deep link to a DIFFERENT record, which the effect below opens with a new
   * `key`. Everything else on `#staff` changes no surface — the workspace is local state and
   * stays put — so guarding it would put a dialog in front of a navigation that is not happening.
   * Free resolves its one visible profile directly and ignores record deep links, so nothing
   * there can replace anything either.
   *
   * Decided against `openRecord`, never against the last path the guards were shown (fix round
   * 2). Browser QA: Back from `#staff/3` to `#staff` is a non-exit, so the hold advanced its
   * `shownPath` to `staff`; pressing Forward straight back to `#staff/3` then compared `3` with
   * "no record" and asked the operator to discard the record they were still editing. The hash
   * never carries the id at all when the workspace was opened from the list, so the last path
   * could never have been the right thing to compare.
   */
  const isExit = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(next => {
    const target = (0,_lib_editor_guards_js__WEBPACK_IMPORTED_MODULE_13__.hashRecord)(next);
    return multiStaff && '' !== openRecord && '' !== target && target !== openRecord;
  }, [multiStaff, openRecord]);
  const {
    shownPath,
    release
  } = (0,_lib_editor_guards_js__WEBPACK_IMPORTED_MODULE_13__.useEditorGuards)({
    segments,
    dirty: editorDirty,
    confirm,
    discardPrompt: _StaffWorkspace_jsx__WEBPACK_IMPORTED_MODULE_16__.discardPrompt,
    isExit,
    onDiscard
  });

  // `#staff/<id>` opens that staff member's workspace, the same way `#services/<tab>`
  // seeds the Services tab (routes/Services.jsx): the hash SEEDS the surface, it does not
  // own it. The list rows keep driving the workspace through local state, so Edit works
  // whatever the hash says — including when it already reads `#staff/<id>`.
  //
  // Resolved from `shownPath`, NOT from `segments`: that is the whole mechanism of the same-route
  // hold. While a dirty workspace is on screen the hold does not advance `shownPath`, so this
  // effect never sees the incoming id and never remounts the editor out from under the typing.
  const deepLinkId = (0,_lib_editor_guards_js__WEBPACK_IMPORTED_MODULE_13__.hashRecord)(shownPath);
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
        // ONE Staff column: the server-composed display name; `first_name`/`last_name`
        // ride along in `...dto` for the initials and the workspace's two inputs.
        name: (0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_5__.displayNameOf)(dto),
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
  const once = (0,_lib_in_flight_js__WEBPACK_IMPORTED_MODULE_15__.useInFlight)();
  const onRestore = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(row => once(async () => {
    try {
      await _lib_api_js__WEBPACK_IMPORTED_MODULE_3__.api.patch(`/staff/${row.id}`, {
        status: 'active'
      });
      showToast(`${row.name} restored.`, 'success');
      load();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }), [once, showToast, load]);

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
    cell: info => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("span", {
      className: "ap-cell-identity",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(StaffMark, {
        firstName: info.row.original?.first_name,
        lastName: info.row.original?.last_name,
        name: info.getValue(),
        photo: info.row.original?.avatar?.url || '',
        size: 28
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
        className: "pmdk-cell-value pmdk-cell-strong",
        title: info.getValue(),
        children: info.getValue()
      })]
    })
  }), columnHelper.accessor('email', {
    header: 'Email',
    size: 200,
    meta: {
      label: 'Email'
    },
    cell: info => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
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
    cell: info => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("span", {
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
    cell: info => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
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
    filterFn: _lib_facets_jsx__WEBPACK_IMPORTED_MODULE_12__.inArrayFilter,
    cell: info => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
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
      return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_lib_RowMenu_jsx__WEBPACK_IMPORTED_MODULE_11__.RowMenu, {
        label: `Actions for ${row.name}`,
        renderIcon: _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_7__.renderIcon,
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

  // "Staff" pressed — header nav or WordPress sidebar — while a workspace opened FROM THE LIST
  // covers it (persona QA 2026-10-05, T-076): return to the list through the same question the
  // workspace's Cancel asks. The Free single profile IS the route, so there is no list to go to.
  (0,_lib_router_js__WEBPACK_IMPORTED_MODULE_14__.useRouteReselect)('staff', async () => {
    if (!workspace) {
      return;
    }
    if (editorDirty && !(await confirm((0,_StaffWorkspace_jsx__WEBPACK_IMPORTED_MODULE_16__.discardPrompt)()))) {
      return;
    }
    release();
    setWorkspace(null);
  });
  if (activeWorkspace) {
    // `release()` first, on BOTH close paths. The editor has already asked its own question by
    // the time it calls back, and the Free single profile closes by assigning `#dashboard` —
    // a ROUTE change, which the still-registered cross-route guard would intercept, asking the
    // operator a second time about the departure they just approved.
    const close = singletonDirect ? () => {
      release();
      window.location.hash = '#dashboard';
    } : () => {
      release();
      setWorkspace(null);
    };
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.Fragment, {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_StaffWorkspace_jsx__WEBPACK_IMPORTED_MODULE_16__.StaffWorkspace, {
        mode: activeWorkspace.mode,
        staff: activeWorkspace.staff,
        onClose: close,
        onSaved: load,
        onDirtyChange: setEditorDirty,
        closeAfterSave: !singletonDirect
        // A NEW member stays on screen as an editable record (persona QA 2026-10-05,
        // T-077). "Add staff" used to drop back to the list, although the two things a
        // new member needs next — work hours and the services they take — only exist
        // on the saved record; creating a service already stays open for the same
        // reason (D-R28). The Free single profile gets here by itself: the reload
        // resolves it as the one visible profile.
        ,
        onCreated: singletonDirect ? undefined : created => {
          release();
          setWorkspace({
            mode: 'edit',
            staff: {
              ...created,
              name: (0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_5__.displayNameOf)(created)
            }
          });
        }
      }, `${activeWorkspace.mode}-${openRecord}-${editorEpoch}`), dialog]
    });
  }
  const addButton = multiStaff || staffCount < FREE_STAFF_PROFILE_COUNT ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("button", {
    className: "pmdk-button primary sm",
    type: "button",
    onClick: onAdd,
    children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_7__.renderIcon)('plus'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
      children: "Add staff"
    })]
  }) : null;
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
    className: "pd-page",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
      className: "pd-bookings-main",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_lib_ui_jsx__WEBPACK_IMPORTED_MODULE_8__.PageHeader, {
        title: "Staff",
        actions: addButton
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("section", {
        className: "pd-data-list pmdk-data-list",
        "aria-label": "Staff list",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_pressmaximum_dashboard_kit_table__WEBPACK_IMPORTED_MODULE_2__.PMDKDataTable, {
          columns: columns,
          data: state.rows,
          getRowId: row => String(row.id),
          status: state.status,
          states: {
            empty: {
              icon: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_7__.renderIcon)('user'),
              title: 'No staff yet',
              description: 'Your calendar has no availability until you add at least one staff member — usually yourself.',
              action: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("button", {
                className: "pmdk-button primary sm",
                type: "button",
                onClick: onAdd,
                children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_7__.renderIcon)('plus'), "Add staff"]
              })
            },
            error: {
              title: 'Could not load staff',
              description: state.error || '',
              action: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("button", {
                className: "pmdk-button sm",
                type: "button",
                onClick: load,
                children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_7__.renderIcon)('arrows'), "Retry"]
              })
            }
          },
          enableRowSelection: false,
          filterBuilder: ({
            table
          }) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_lib_facets_jsx__WEBPACK_IMPORTED_MODULE_12__.Facets, {
            table: table,
            defs: FACETS,
            renderIcon: _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_7__.renderIcon
          }),
          activeFilters: ({
            table
          }) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_lib_facets_jsx__WEBPACK_IMPORTED_MODULE_12__.FacetChips, {
            table: table,
            defs: FACETS,
            renderIcon: _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_7__.renderIcon
          }),
          filterCount: ({
            table
          }) => (0,_lib_facets_jsx__WEBPACK_IMPORTED_MODULE_12__.facetCount)(table, FACETS),
          onRowActivate: row => setWorkspace({
            mode: 'edit',
            staff: row
          }),
          getRowAriaLabel: row => `Edit ${row.name}`,
          renderIcon: _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_7__.renderIcon,
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
/* harmony export */   StaffWorkspace: () => (/* binding */ StaffWorkspace),
/* harmony export */   discardPrompt: () => (/* binding */ discardPrompt),
/* harmony export */   timeOffErrors: () => (/* binding */ timeOffErrors),
/* harmony export */   timeOffRangeLabel: () => (/* binding */ timeOffRangeLabel)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _lib_api_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../lib/api.js */ "./assets/src/admin/lib/api.js");
/* harmony import */ var _lib_config_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../lib/config.js */ "./assets/src/admin/lib/config.js");
/* harmony import */ var _lib_format_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/format.js */ "./assets/src/admin/lib/format.js");
/* harmony import */ var _lib_in_flight_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../lib/in-flight.js */ "./assets/src/admin/lib/in-flight.js");
/* harmony import */ var _shared_person_name_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../../shared/person-name.js */ "./assets/src/shared/person-name.js");
/* harmony import */ var _calendar_constants_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../calendar/constants.js */ "./assets/src/admin/calendar/constants.js");
/* harmony import */ var _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../lib/icon.jsx */ "./assets/src/admin/lib/icon.jsx");
/* harmony import */ var _lib_toast_jsx__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../lib/toast.jsx */ "./assets/src/admin/lib/toast.jsx");
/* harmony import */ var _lib_confirm_jsx__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../lib/confirm.jsx */ "./assets/src/admin/lib/confirm.jsx");
/* harmony import */ var _lib_WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../lib/WeeklyHoursGrid.jsx */ "./assets/src/admin/lib/WeeklyHoursGrid.jsx");
/* harmony import */ var _lib_EditorCard_jsx__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../lib/EditorCard.jsx */ "./assets/src/admin/lib/EditorCard.jsx");
/* harmony import */ var _lib_focus_first_error_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../lib/focus-first-error.js */ "./assets/src/admin/lib/focus-first-error.js");
/* harmony import */ var _lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ../lib/field-error.jsx */ "./assets/src/admin/lib/field-error.jsx");
/* harmony import */ var _lib_section_nav_js__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ../lib/section-nav.js */ "./assets/src/admin/lib/section-nav.js");
/* harmony import */ var _lib_page_title_js__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ../lib/page-title.js */ "./assets/src/admin/lib/page-title.js");
/* harmony import */ var _modules_catalog_js__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ../modules/catalog.js */ "./assets/src/admin/modules/catalog.js");
/* harmony import */ var _lib_branches_js__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ../lib/branches.js */ "./assets/src/admin/lib/branches.js");
/* harmony import */ var _lib_assignment_pairs_js__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! ../lib/assignment-pairs.js */ "./assets/src/admin/lib/assignment-pairs.js");
/* harmony import */ var _lib_branch_hours_js__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! ../lib/branch-hours.js */ "./assets/src/admin/lib/branch-hours.js");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__);
/**
 * Staff workspace (SPEC-P1 §1.2/§1.3 / mockup §7.5) — full-page, one continuous
 * form whose sections are CARDS (D-R55, founder 2026-09-21: the flat rules made the
 * groups hard to tell apart) reusing the Settings panel anatomy through
 * `lib/EditorCard.jsx`. The sticky section nav scrolls to six anchors — one per card, with
 * "Calendar connections" present exactly when its card is (founder QA 2026-09-21):
 *   1. Details    — avatar / name* / email* / phone / status (POST|PATCH /staff).
 *   1b. Public profile (D-R51) — photo, job title, short bio and the "Show on booking form"
 *                   switch. Its OWN card since D-R55: those four fields are the only ones on
 *                   this page a CUSTOMER ever sees, and an operator filling in a phone number
 *                   has to be able to tell the difference. Present in BOTH editions — Free's
 *                   single profile included.
 *   1c. Calendar connections — a card only when a per-staff integration is available, and a nav
 *                   anchor on exactly the same condition. Both ask `perStaffIntegrations()`,
 *                   which reads the boot catalog: a page-load constant, so the nav is stable for
 *                   the life of the editor and on any given site.
 *   2. Services   — READ-ONLY list of the services this member is eligible for (with the
 *                   branches of each assignment once the site has locations, D-R63), from the
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
 *                   With ≥1 active location it gains per-BRANCH tabs (D-R63): each branch
 *                   is its own scope (`?location_id=N`), inheriting until customized.
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

/** `title` ceiling — the `varchar(191)` column, mirrored from `StaffController::TITLE_MAX`. */
const TITLE_MAX = 191;

/** `bio` ceiling — the product limit, mirrored from `StaffController::BIO_MAX` (D-R51). */
const BIO_MAX = 600;

/** Card-header line for Work hours — shared by the loading and loaded renders (D-R55). */
const HOURS_DESCRIPTION = 'The weekly hours this person can be booked.';
function businessWeeklyMap() {
  const map = {};
  (_lib_config_js__WEBPACK_IMPORTED_MODULE_3__.config.businessHours || []).forEach(row => {
    map[row.weekday] = row.periods || [];
  });
  return map;
}

/**
 * The discard question, in ONE place.
 *
 * THREE guards ask it now (D-R58; handoff 2026-09-21 §4): this editor's own Cancel,
 * `routes/Staff.jsx`'s cross-route `nav-guard` handler, and the same-route hold in
 * `lib/editor-guards.js`. Asking it in three sets of words would read as three different features,
 * which is why `LocationEditor.jsx` exports its own the same way. Module-level, so its identity is
 * stable enough to key the registering effect.
 *
 * @return {Object} `useConfirmDialog` options.
 */
function discardPrompt() {
  return {
    title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Discard your changes?', 'aponto'),
    message: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('This staff member has edits that have not been saved. Leaving now discards them.', 'aponto'),
    confirmText: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Discard changes', 'aponto'),
    cancelText: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Keep editing', 'aponto'),
    destructive: true
  };
}

/**
 * The Details card's form state for a staff DTO (or a blank one for a create).
 *
 * Extracted so the initial state and the dirty BASELINE are the same shape by construction — a
 * baseline computed a second way is a baseline that drifts.
 *
 * @param {Object} [staff] Staff DTO, or nothing for a new member.
 * @return {Object} Details form state.
 */
function detailsFrom(staff) {
  return {
    // Name split (2026-10-01): `first_name` is required, `last_name` optional — a staff row
    // may be a room or a chair (`type: 'resource'`), which has no family name.
    first_name: staff?.first_name || '',
    last_name: staff?.last_name || '',
    email: staff?.email || '',
    phone: staff?.phone || '',
    status: staff?.status || 'active',
    // Public profile (D-R51). `is_public` defaults to TRUE for a NEW member too: the
    // column defaults to 1, so a create that never touched the switch must send the same
    // answer the database would have given.
    title: staff?.title || '',
    bio: staff?.bio || '',
    is_public: staff?.is_public !== false,
    avatar_id: staff?.avatar?.id ?? staff?.avatar_id ?? null
  };
}
function StaffWorkspace({
  mode,
  staff,
  onClose,
  onSaved,
  onCreated,
  onDirtyChange,
  closeAfterSave = true
}) {
  const showToast = (0,_lib_toast_jsx__WEBPACK_IMPORTED_MODULE_9__.useToast)();
  const {
    confirm,
    dialog
  } = (0,_lib_confirm_jsx__WEBPACK_IMPORTED_MODULE_10__.useConfirmDialog)();
  const creating = mode === 'create';
  // The tab title names the record being edited — its SAVED name, not the one being typed.
  (0,_lib_page_title_js__WEBPACK_IMPORTED_MODULE_16__.usePageTitle)(creating ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('New staff member', 'aponto') : (0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_6__.displayName)(staff?.first_name, staff?.last_name) || staff?.name);
  const [details, setDetails] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(() => detailsFrom(staff));
  // Signature of the details the SERVER currently holds — anything else is a pending edit. It is
  // state, not the `staff` prop, because a save that keeps this editor open (the Free single
  // profile, `closeAfterSave = false`) has to be able to move it.
  const [baseline, setBaseline] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(() => JSON.stringify(detailsFrom(staff)));
  // Pending edits the SUB-SECTIONS hold. This page is one continuous form — the page Save already
  // flushes the work-hours grid — so "unsaved" has to mean the same thing to the guard that it
  // means to Save, rather than a second, narrower idea of dirty invented alongside it.
  const [hoursDirty, setHoursDirty] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [timeOffDirty, setTimeOffDirty] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  // The RESOLVED avatar the server computed through the D-R51 chain (upload → verified
  // Gravatar → nothing), plus which step answered. `source` is display only: the write side
  // still sends `avatar_id`, and a Gravatar is not something this editor can set.
  const [avatarUrl, setAvatarUrl] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(staff?.avatar?.url || '');
  const [avatarSource, setAvatarSource] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(staff?.avatar?.source || '');
  // Whether the resolved image has ACTUALLY loaded. The server does not know whether a
  // Gravatar exists any more (the URL carries `d=404`), so only the browser can say — and the
  // source caption must not claim "From Gravatar" for a picture that 404'd.
  //
  // Both are keyed by URL rather than kept as booleans (first-run QA D09): a save that resolves
  // the SAME URL re-uses the `<img>`, so no second `load` ever fires, and a flag reset on save
  // left the picture at opacity 0 until a reload. A URL that has loaded stays loaded; a new
  // URL starts unloaded by construction, with nothing to reset.
  const [loadedUrl, setLoadedUrl] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)('');
  const [failedUrl, setFailedUrl] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)('');
  const avatarLoaded = Boolean(avatarUrl) && loadedUrl === avatarUrl;
  const avatarFailed = Boolean(avatarUrl) && failedUrl === avatarUrl;
  // An image the browser already holds can be `complete` before any listener could see its
  // `load`, so the mount checks once instead of waiting for an event that may have passed.
  const revealIfComplete = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(img => {
    if (img && img.complete && img.naturalWidth > 0) {
      setLoadedUrl(img.getAttribute('src') || '');
    }
  }, []);
  const [saving, setSaving] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [fieldError, setFieldError] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)({});
  const bodyRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  // A refusal counter plus what to say about it — see the Service editor for the reasoning.
  // An effect, not `requestAnimationFrame`: an embedded or backgrounded browser pane throttles
  // rAF to never, and round-3 QA caught the focus simply not happening (round-3 QA).
  const [errorToken, setErrorToken] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(0);
  const errorPlan = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)({});
  (0,_lib_focus_first_error_js__WEBPACK_IMPORTED_MODULE_13__.useFocusFirstError)(errorToken, bodyRef, errorPlan);
  // The work-hours half-save is the other thing that has to move the operator, and it targets
  // a control the field-error helper knows nothing about, so it gets its own effect.
  const [hoursErrorToken, setHoursErrorToken] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(0);
  const hoursErrorAt = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  // Pending Work-hours edits, published by WorkHoursSection as `{ dirty, save }`
  // so the page-level Save can flush them (see saveDetails).
  const workHoursRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  // D-R63 fix round 1: ONE location read per editor, shared by the Services and Work hours cards
  // (ALL statuses — the Services card names archived branches too; Work hours tabs only the
  // active ones). Per editor rather than per session, so a branch created a minute ago is here.
  const [locations, setLocations] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)([]);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (creating) {
      return undefined;
    }
    let live = true;
    (0,_lib_branches_js__WEBPACK_IMPORTED_MODULE_18__.fetchLocations)().then(({
      items
    }) => {
      if (live && items.length) setLocations(items);
    });
    return () => {
      live = false;
    };
  }, [creating]);
  const activeBranches = (0,react__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => (0,_lib_branches_js__WEBPACK_IMPORTED_MODULE_18__.activeLocations)(locations), [locations]);

  /**
   * Whether this editor holds unsaved edits — the details form OR either sub-section that keeps
   * a draft of its own.
   *
   * Reported UP rather than guarded here: `routes/Staff.jsx` owns both guards, because it is the
   * component that decides which surface is on screen (the workspace opens from LOCAL STATE
   * without touching the hash) and it is the one that survives a same-route move. The unmount
   * report is what makes closing the editor, or discarding onto another record, clear the guard.
   */
  const dirty = JSON.stringify(details) !== baseline || hoursDirty || timeOffDirty;
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => () => onDirtyChange?.(false), [onDirtyChange]);

  // Cancel asks the same question the nav guards ask. It used to close outright: one click, and a
  // half-filled profile was gone with no request, no toast and no way back (handoff §4).
  const leave = async () => {
    if (dirty && !(await confirm(discardPrompt()))) {
      return;
    }
    onClose?.();
  };

  // D-R55: "Public profile" is a first-class card now, so it earns a nav anchor —
  // SPEC §7.5's four anchors become five.
  //
  // "Calendar connections" is the sixth, and it is CONDITIONAL (founder QA 2026-09-21,
  // superseding D-R55's "stays un-anchored"). The original worry was a nav entry that comes
  // and goes; in practice `perStaffIntegrations()` reads the boot catalog, which is fixed for
  // the life of the page and changes only when an operator installs or enables a module — so
  // on any given site the nav is stable, and a card with no nav entry is the more confusing of
  // the two. Six cards, six anchors.
  const anchors = creating ? [['details', 'Details'], ['profile', 'Public profile']] : [['details', 'Details'], ['profile', 'Public profile'], ...(perStaffIntegrations().length ? [['connections', 'Calendar connections']] : []), ['services', 'Services'], ['hours', 'Work hours'], ['timeoff', 'Time off']];

  // Sticky section nav + scroll spy, shared with the Service editor (`lib/section-nav.js`).
  // The IntersectionObserver band this replaces could not select a card shorter than itself,
  // and could never reach the last one (founder QA 2026-09-21).
  const {
    active,
    scrollTo
  } = (0,_lib_section_nav_js__WEBPACK_IMPORTED_MODULE_15__.useSectionNav)({
    anchors,
    bodyRef,
    prefix: 'staff-'
  });

  /**
   * Focus the work-hours control a failed page Save named.
   *
   * An effect rather than a scheduler, for the same reason the field-error one is: the DOM is
   * committed by the time it runs, and it cannot be throttled away. The locator comes from
   * `validateWeekly()` via the rejected `flushScope()`; without one — a SERVER refusal, which names
   * no period — it falls back to the first control in the card, which is still the right place
   * to be looking.
   */
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!hoursErrorToken) {
      return;
    }
    const at = hoursErrorAt.current || {};
    const card = bodyRef.current?.querySelector('#staff-hours');
    const period = null !== at.weekday && null !== at.period ? card?.querySelector(`.ap-hours-period[data-weekday="${at.weekday}"][data-period="${at.period}"]`) : null;
    const target = (period || card)?.querySelector('select, input');
    target?.focus?.({
      preventScroll: true
    });
  }, [hoursErrorToken]);
  const set = key => e => setDetails(d => ({
    ...d,
    [key]: e.target.value
  }));

  /**
   * Open the WordPress media modal for the profile photo (D-R51).
   *
   * `wp.media` is already on this screen — `AdminPage` calls `wp_enqueue_media()` for the
   * Aponto page and nothing else, originally for the service editor's featured image — so
   * this adds no dependency and no bytes to the lazy Staff chunk. The library is filtered to
   * images because the server answers `422` for anything that is not one.
   *
   * Degrades with a toast rather than a dead button when `wp.media` is missing: a plugin that
   * dequeues media scripts is not a reason to render a control that silently does nothing.
   */
  const pickAvatar = () => {
    if (!window.wp?.media) {
      showToast((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('The media library is unavailable on this screen.', 'aponto'), 'danger');
      return;
    }
    const frame = window.wp.media({
      title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Select a profile photo', 'aponto'),
      button: {
        text: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Use photo', 'aponto')
      },
      multiple: false,
      library: {
        type: 'image'
      }
    });
    frame.on('select', () => {
      const attachment = frame.state().get('selection').first().toJSON();
      setDetails(d => ({
        ...d,
        avatar_id: attachment.id
      }));
      setAvatarUrl(attachment.sizes?.thumbnail?.url || attachment.url || '');
      setAvatarSource('upload');
      setFailedUrl('');
    });
    frame.open();
  };

  /**
   * Remove the UPLOAD, revealing whatever the chain answers underneath.
   *
   * The editor cannot know the Gravatar URL before the server resolves it, so it shows the
   * letter avatar and says so rather than guessing: the next save re-reads the DTO and the
   * real answer — Gravatar or initials — arrives with it.
   */
  const clearAvatar = () => {
    setDetails(d => ({
      ...d,
      avatar_id: null
    }));
    setAvatarUrl('');
    setAvatarSource('');
    setFailedUrl('');
  };

  /**
   * Adopt the avatar the SERVER resolved on a write.
   *
   * The editor only ever sends `avatar_id`; which of the chain's three answers that produces
   * — upload, verified Gravatar, or nothing — is decided server-side and comes back on the
   * DTO. Adopting it is what makes "Remove the photo and see the Gravatar underneath" work
   * without a reload, and it is also how a stale caption corrects itself.
   *
   * @param {Object} dto The staff DTO from the create/update response.
   */
  const applyResolvedAvatar = dto => {
    if (!dto || typeof dto !== 'object') {
      return;
    }
    setAvatarUrl(dto.avatar?.url || '');
    setAvatarSource(dto.avatar?.source || '');
    setDetails(d => ({
      ...d,
      avatar_id: dto.avatar_id ?? null
    }));
  };

  // ONLY after the image has loaded: a caption under an empty circle would be telling the
  // operator their staff member has a Gravatar when gravatar.com just answered 404.
  const avatarCaption = (() => {
    if (!avatarLoaded) {
      return '';
    }
    if (avatarSource === 'upload') {
      return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Uploaded photo', 'aponto');
    }
    if (avatarSource === 'gravatar') {
      return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('From Gravatar', 'aponto');
    }
    return '';
  })();
  const bioLength = details.bio.length;
  const canUseMedia = Boolean(_lib_config_js__WEBPACK_IMPORTED_MODULE_3__.config.caps?.media);
  // A URL that already failed is not re-rendered, so it cannot be requested twice.
  const showPhoto = Boolean(avatarUrl) && !avatarFailed;
  // One request per press (persona QA 2026-10-05, T-066): `saving` only reaches the button on the
  // next render, so two taps in one frame both posted and "Add staff" created two people.
  const once = (0,_lib_in_flight_js__WEBPACK_IMPORTED_MODULE_5__.useInFlight)();
  const saveDetailsNow = async () => {
    const errors = {};
    if (!(0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_6__.normalizePart)(details.first_name)) errors.first_name = 'A first name is required.';
    if (!/.+@.+\..+/.test(details.email.trim())) errors.email = 'A valid email is required.';
    if (Object.keys(errors).length) {
      setFieldError(errors);
      // Take the operator to the refusal (founder QA 2026-09-21). Same gap the Service
      // editor had, same shared helper: the inline error is invisible when the field is a
      // card or two off-screen, and focus used to stay on Save with nothing announced.
      errorPlan.current = {
        announce: showToast,
        fallback: () => showToast((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Check the highlighted fields.', 'aponto'), 'danger')
      };
      setErrorToken(token => token + 1);
      return;
    }
    setSaving(true);
    setFieldError({});
    const body = {
      first_name: (0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_6__.normalizePart)(details.first_name),
      last_name: (0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_6__.normalizePart)(details.last_name),
      email: details.email.trim(),
      phone: details.phone.trim(),
      status: details.status,
      title: details.title.trim(),
      bio: details.bio.trim(),
      is_public: details.is_public,
      avatar_id: details.avatar_id
    };
    try {
      if (creating) {
        const created = await _lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.post('/staff', {
          ...body,
          type: 'human'
        });
        applyResolvedAvatar(created);
        // The details on screen are now the details the server holds, so the editor stops
        // counting as dirty and the nav guard unregisters itself. It matters most on the
        // path that does NOT unmount (the Free single profile, `closeAfterSave = false`),
        // where a stale baseline would keep asking about edits that are already saved.
        setBaseline(JSON.stringify({
          ...details,
          avatar_id: created?.avatar_id ?? null
        }));
        showToast(`${(0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_6__.displayName)(body.first_name, body.last_name)} added.`, 'success');
        if (onCreated && created?.id) {
          // The route keeps the new member open as an editable record (T-077) instead of
          // closing: work hours, time off and their services all need the saved row.
          onSaved?.();
          onCreated(created);
          return;
        }
      } else {
        // CONSUME the response (Codex P3-2). The server resolves the avatar through the
        // D-R51 chain on every write — an email change can reveal a Gravatar, removing
        // an upload can uncover one — and the Free singleton editor does not unmount on
        // save (`closeAfterSave = false`), so a discarded response left the preview
        // showing initials until the operator reloaded the page.
        const saved = await _lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.patch(`/staff/${staff.id}`, body);
        applyResolvedAvatar(saved);
        setBaseline(JSON.stringify({
          ...details,
          avatar_id: saved?.avatar_id ?? null
        }));
        // This page is ONE continuous form, so the page Save must also persist a
        // pending Work-hours edit (PUT /staff/{id}/schedule, contract §2.6). It used
        // to save details only and unmount, dropping a Customize edit with no request
        // and no warning — silent data loss reported on the 1.0.0 free zip.
        const hours = workHoursRef.current;
        if (hours?.dirty) {
          try {
            await hours.save();
          } catch (hoursError) {
            // HALF-SAVE, and it has to be said as one: the details are committed, the
            // schedule is not, and the editor stays open on a record that is now
            // half-written. One toast naming both halves — never two, and never the
            // bare reason, which would read as if nothing had been saved at all.
            showToast((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: %s: the reason the work hours could not be saved. */
            (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Staff details saved, but the work hours were not: %s', 'aponto'), hoursError.message), 'danger');
            // …and take the operator to the half that failed (founder QA 2026-09-21,
            // round 2). D-R55 says this page is one continuous form; a page Save that
            // reports a work-hours refusal from the header while leaving the viewport
            // wherever it was is the same "looks like a no-op" defect the field errors
            // had. Through the section-nav path, so the card lands where a nav click
            // would put it and the nav lights it; then into the grid itself — at the
            // EXACT period that failed, since `validateWeekly()` now answers a
            // locator as well as a sentence (round 3).
            scrollTo('hours');
            hoursErrorAt.current = {
              weekday: hoursError.weekday ?? null,
              period: hoursError.period ?? null
            };
            setHoursErrorToken(token => token + 1);
            onSaved?.();
            return;
          }
        }
        showToast('Staff updated.', 'success');
      }
      onSaved?.();
      if (closeAfterSave) {
        onClose?.();
      }
    } catch (err) {
      if (err.data?.fields) {
        setFieldError(err.data.fields);
        // This branch used to be SILENT: a 422 painted a red border and said nothing at
        // all, anywhere, and left focus on Save. One toast carrying the server's own
        // wording (more specific than ours), plus the trip to the field.
        showToast(err.message, 'danger');
        errorPlan.current = {
          announce: null
        };
        setErrorToken(token => token + 1);
      } else {
        showToast(err.message, 'danger');
      }
    } finally {
      // EVERY exit path clears the flag. It used to be cleared only on failure, because success
      // always ended in `onClose()` and the unmount took the state with it. The Free singleton
      // workspace does not close on save (`closeAfterSave={ false }`), so a SUCCESSFUL save left
      // the button disabled at "Saving…" forever — the 1.0.2 beta report. A `finally` is the only
      // form of this that cannot rot again when a new exit path is added.
      setSaving(false);
    }
  };
  const saveDetails = () => once(saveDetailsNow);
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("div", {
    className: "pd-page pd-record-editor-page pd-staff-editor-page",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("header", {
      className: "pd-record-editor-head",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("h1", {
        children: "Staff"
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("div", {
        className: "pd-record-editor-actions",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("button", {
          className: "pd-button",
          type: "button",
          onClick: leave,
          children: "Cancel"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("button", {
          className: "pd-button primary",
          type: "button",
          disabled: saving,
          onClick: saveDetails,
          children: saving ? 'Saving…' : creating ? 'Add staff' : 'Save details'
        })]
      })]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("div", {
      className: "pd-record-editor-layout",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("aside", {
        className: "pd-editor-nav",
        "aria-label": "Staff editor sections",
        children: anchors.map(([id, label]) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("button", {
          type: "button",
          className: active === id ? 'is-active' : undefined,
          "aria-current": active === id ? 'true' : undefined,
          onClick: () => scrollTo(id),
          children: label
        }, id))
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("div", {
        className: "pd-record-editor-form ap-editor-cards",
        ref: bodyRef,
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)(_lib_EditorCard_jsx__WEBPACK_IMPORTED_MODULE_12__.EditorCard, {
          id: "staff-details",
          title: "Details",
          description: "Who this person is in your team, and how you reach them.",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("div", {
            className: "ap-inspector-identity",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("span", {
              className: "pmdk-avatar is-large ap-avatar-mark",
              "aria-hidden": "true",
              children: [(0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_6__.initials)(details.first_name, details.last_name) || '?', showPhoto ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("img", {
                ref: revealIfComplete,
                className: `ap-avatar-photo${avatarLoaded ? ' is-loaded' : ''}`,
                src: avatarUrl,
                alt: "",
                width: "48",
                height: "48",
                onLoad: () => setLoadedUrl(avatarUrl),
                onError: () => setFailedUrl(avatarUrl)
              }) : null]
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("div", {
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("strong", {
                children: (0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_6__.displayName)(details.first_name, details.last_name) || 'New staff member'
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("span", {
                className: "pd-ltr",
                children: details.email || 'No email'
              })]
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("div", {
            className: "pd-form-grid",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("label", {
              className: (0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldClass)('pd-compact-field', fieldError, 'first_name'),
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("input", {
                name: "first_name",
                value: details.first_name,
                placeholder: " ",
                required: true,
                onChange: set('first_name'),
                ...(0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldAria)('staff', fieldError, 'first_name')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("span", {
                className: "pd-compact-label",
                children: "First name"
              })]
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("label", {
              className: (0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldClass)('pd-compact-field', fieldError, 'last_name'),
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("input", {
                name: "last_name",
                value: details.last_name,
                placeholder: " ",
                onChange: set('last_name'),
                ...(0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldAria)('staff', fieldError, 'last_name')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("span", {
                className: "pd-compact-label",
                children: "Last name"
              })]
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)(_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.FieldErrors, {
            prefix: "staff",
            fieldError: fieldError,
            keys: ['first_name', 'last_name']
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("div", {
            className: "pd-form-grid",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("label", {
              className: (0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldClass)('pd-compact-field', fieldError, 'email'),
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("input", {
                className: "pd-ltr",
                type: "email",
                value: details.email,
                placeholder: " ",
                required: true,
                onChange: set('email'),
                ...(0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldAria)('staff', fieldError, 'email')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("span", {
                className: "pd-compact-label",
                children: "Email"
              })]
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("label", {
              className: (0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldClass)('pd-compact-field', fieldError, 'phone'),
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("input", {
                className: "pd-ltr",
                value: details.phone,
                placeholder: " ",
                onChange: set('phone'),
                ...(0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldAria)('staff', fieldError, 'phone')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("span", {
                className: "pd-compact-label",
                children: "Phone"
              })]
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)(_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.FieldErrors, {
            prefix: "staff",
            fieldError: fieldError,
            keys: ['email', 'phone']
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("label", {
            className: (0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldClass)('pd-compact-field pd-compact-select is-filled', fieldError, 'status'),
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("select", {
              value: details.status,
              onChange: set('status'),
              ...(0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldAria)('staff', fieldError, 'status'),
              children: STATUS_OPTIONS.map(s => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("option", {
                value: s.value,
                children: s.label
              }, s.value))
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("span", {
              className: "pd-compact-label",
              children: "Status"
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("span", {
              className: "pd-field-end-icon",
              "aria-hidden": "true",
              children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_8__.renderIcon)('chevronDown')
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)(_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.FieldErrors, {
            prefix: "staff",
            fieldError: fieldError,
            keys: ['status']
          }), creating ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("p", {
            className: "pd-editor-note",
            children: "Work hours and time off can be set once the staff member is created."
          }) : null]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)(_lib_EditorCard_jsx__WEBPACK_IMPORTED_MODULE_12__.EditorCard, {
          id: "staff-profile",
          title: "Public profile",
          description: "What customers see when they choose a staff member on the booking form.",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("div", {
            className: (0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldClass)('ap-image-field', fieldError, 'avatar_id'),
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("span", {
              className: "ap-avatar-thumb is-empty ap-avatar-mark",
              "aria-hidden": "true",
              children: [(0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_6__.initials)(details.first_name, details.last_name) || '?', showPhoto ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("img", {
                ref: revealIfComplete,
                className: `ap-avatar-photo${avatarLoaded ? ' is-loaded' : ''}`,
                src: avatarUrl,
                alt: "",
                width: "52",
                height: "52",
                onLoad: () => setLoadedUrl(avatarUrl),
                onError: () => setFailedUrl(avatarUrl)
              }) : null]
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("div", {
              className: "ap-image-actions",
              children: [canUseMedia ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("button", {
                className: "pd-button sm",
                type: "button",
                onClick: pickAvatar,
                ...(0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldAria)('staff', fieldError, 'avatar_id'),
                children: details.avatar_id ? 'Replace photo' : 'Choose photo'
              }) : null, details.avatar_id ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("button", {
                className: "pd-button text sm",
                type: "button",
                onClick: clearAvatar,
                children: "Remove"
              }) : null, avatarCaption ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("span", {
                className: "ap-image-source",
                children: avatarCaption
              }) : null, !canUseMedia && !details.avatar_id ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("span", {
                className: "ap-image-source",
                children: "Your account cannot upload media."
              }) : null]
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)(_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.FieldErrors, {
            prefix: "staff",
            fieldError: fieldError,
            keys: ['avatar_id']
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("p", {
            className: "pd-editor-note",
            children: "Without a photo we use this person\u2019s Gravatar if they have one, otherwise their initials."
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("label", {
            className: (0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldClass)('pd-compact-field', fieldError, 'title'),
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("input", {
              value: details.title,
              placeholder: " ",
              maxLength: TITLE_MAX,
              onChange: set('title'),
              ...(0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldAria)('staff', fieldError, 'title')
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("span", {
              className: "pd-compact-label",
              children: "Job title"
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)(_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.FieldErrors, {
            prefix: "staff",
            fieldError: fieldError,
            keys: ['title']
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("p", {
            className: "pd-editor-note",
            children: "Shown under the name on the booking form, e.g. Senior Stylist."
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("label", {
            className: (0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldClass)('pd-compact-field pd-compact-notes', fieldError, 'bio'),
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("textarea", {
              value: details.bio,
              placeholder: " ",
              rows: 3,
              maxLength: BIO_MAX,
              onChange: set('bio'),
              ...(0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldAria)('staff', fieldError, 'bio')
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("span", {
              className: "pd-compact-label",
              children: "Short bio"
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)(_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.FieldErrors, {
            prefix: "staff",
            fieldError: fieldError,
            keys: ['bio']
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("p", {
            className: "pd-editor-note",
            children: ["Optional. A sentence or two customers will see.", ' ', /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("span", {
              className: bioLength > BIO_MAX ? 'ap-field-error' : undefined,
              children: `${bioLength} / ${BIO_MAX}`
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("label", {
            className: (0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldClass)('pd-notify-toggle', fieldError, 'is_public'),
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("input", {
              className: "pd-table-checkbox",
              type: "checkbox",
              checked: details.is_public,
              onChange: e => setDetails(d => ({
                ...d,
                is_public: e.target.checked
              })),
              ...(0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldAria)('staff', fieldError, 'is_public')
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("span", {
              children: "Show on booking form"
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)(_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.FieldErrors, {
            prefix: "staff",
            fieldError: fieldError,
            keys: ['is_public']
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("p", {
            className: "pd-editor-note",
            children: "When off, customers can\u2019t pick this staff member by name, but they can still be assigned automatically."
          })]
        }), !creating ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)(CalendarConnections, {
          staffId: staff.id
        }) : null, !creating ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.Fragment, {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)(ServicesSection, {
            staffId: staff.id,
            staffName: (0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_6__.displayName)(details.first_name, details.last_name),
            locations: locations
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)(WorkHoursSection, {
            staffId: staff.id,
            showToast: showToast,
            saveRef: workHoursRef,
            onDirtyChange: setHoursDirty,
            locations: activeBranches
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)(TimeOffSection, {
            staffId: staff.id,
            showToast: showToast,
            onDirtyChange: setTimeOffDirty
          })]
        }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("footer", {
          className: "pd-editor-footer",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("button", {
            className: "pd-button",
            type: "button",
            onClick: leave,
            children: "Cancel"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("button", {
            className: "pd-button primary",
            type: "button",
            disabled: saving,
            onClick: saveDetails,
            children: saving ? 'Saving…' : creating ? 'Add staff' : 'Save details'
          })]
        })]
      })]
    }), dialog]
  });
}

/**
 * Tone per service status, in the `.ap-txn-status` vocabulary this admin already uses.
 *
 * A service that is not `active` is not a failure — a draft is a normal working state — so the
 * only `warning` is `archived`, which is the one that means "this assignment can no longer be
 * booked".
 */
const SERVICE_STATUS_TONE = {
  active: 'positive',
  draft: 'neutral',
  archived: 'warning'
};

/**
 * The operator-facing label for a service status, or `''` when it is unknown.
 *
 * Empty for a status the catalog fetch could not resolve (an archived service past the 100-row
 * window, say): the row still names the service, and inventing a label for a value we do not
 * have would be worse than saying nothing.
 *
 * @param {string} status Raw status.
 * @return {string} Label, or an empty string.
 */
function serviceStatusLabel(status) {
  switch (status) {
    case 'active':
      return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Active', 'aponto');
    case 'draft':
      return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Draft', 'aponto');
    case 'archived':
      return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Archived', 'aponto');
    default:
      return '';
  }
}

/**
 * The integration modules this build configures PER STAFF MEMBER.
 *
 * `scope`, not `category` (D-R65, founder-approved 2026-09-21). The first fix for this filter
 * replaced bare `kind: integration` — which listed "Stripe payments: Not connected · Manage" on a
 * STAFF editor — with the `connections` CATEGORY, and that was only accidentally right. The
 * connections tab is a browsing tab, and it also holds `sms` and `webhooks`: both are one
 * site-wide configuration, and both would have appeared once per staff member the day they ship.
 * `scope === 'per_staff'` is the registry asking the question this card actually has ("is this
 * module configured per PERSON?"), so the list stays generic — a new calendar or video provider
 * appears here for free, and no site-level module ever can.
 *
 * Lifted out of {@see CalendarConnections} so the editor's NAV can ask the same question the
 * CARD does (founder QA 2026-09-21): the anchor must be present exactly when the card is, and
 * two copies of this predicate would be two chances to disagree. Reads the boot catalog, which
 * is a page-load constant — no request, and stable for the life of the editor.
 *
 * @return {Array<Object>} Module rows, possibly empty.
 */
function perStaffIntegrations() {
  return (_lib_config_js__WEBPACK_IMPORTED_MODULE_3__.config.modules || []).filter(mod => 'integration' === mod.kind && 'per_staff' === mod.scope && mod.available && mod.has_settings);
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
 * Generic over the registry rather than hardcoded to Google: any per-staff `kind: integration`
 * module the build can use appears here, so the Outlook module gets this surface for free (D-R35)
 * and `video_links` will too (D-R65).
 *
 * Reads the boot-data projection, which carries no token — only status, account label and the
 * timestamp (D-R34).
 *
 * @param {{staffId: number}} props Section props.
 */
function CalendarConnections({
  staffId
}) {
  const integrations = perStaffIntegrations();
  if (!integrations.length) {
    return null;
  }
  return (
    /*#__PURE__*/
    // Its own CARD since D-R55 (it was a sub-heading at the end of Details). Card and list
    // are rendered TOGETHER, so a site with no calendar module shows neither — which is
    // also why this section owns no nav anchor.
    (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)(_lib_EditorCard_jsx__WEBPACK_IMPORTED_MODULE_12__.EditorCard, {
      id: "staff-connections",
      title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Calendar connections', 'aponto'),
      description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Whether this person’s own calendar is linked. Connecting and disconnecting happen on the module’s page.', 'aponto'),
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("ul", {
        className: "ap-staff-integrations",
        children: integrations.map(mod => {
          const rows = _lib_config_js__WEBPACK_IMPORTED_MODULE_3__.config.integration.connections[mod.code] || [];
          const row = rows.find(entry => Number(entry.staff_id) === Number(staffId));
          const label = _modules_catalog_js__WEBPACK_IMPORTED_MODULE_17__.MODULE_META[mod.code]?.label || mod.code;
          // Three answers, three tones — the same text-tone vocabulary the payments
          // transaction list uses (`.ap-txn-status`), not a fourth badge component.
          let state = (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Not connected', 'aponto');
          let tone = 'neutral';
          if (row && 'needs_reconnect' === row.status) {
            state = (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Needs reconnect', 'aponto');
            tone = 'warning';
          } else if (row) {
            tone = 'positive';
            state = row.account ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: %s: the connected account address. */
            (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Connected as %s', 'aponto'), row.account) : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Connected', 'aponto');
          }
          return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("li", {
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("span", {
              className: "ap-staff-integration-name",
              children: label
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("span", {
              className: `ap-staff-integration-state is-${tone}`,
              children: state
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("a", {
              href: `#modules/${mod.code}`,
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Manage', 'aponto')
            })]
          }, mod.code);
        })
      })
    })
  );
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
  staffName,
  locations = []
}) {
  const [state, setState] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)({
    loading: true,
    services: []
  });
  // D-R63: with ≥1 location, each line also says WHERE ("· Downtown, Uptown" / "· Every
  // location"), read from that service's own eligibility pairs — best-effort, one read per listed
  // service, and none at all on a site without locations.
  const [scopes, setScopes] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)({});
  const hasLocations = locations.length > 0;
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!hasLocations || state.loading) {
      return undefined;
    }
    let live = true;
    state.services.forEach(svc => {
      _lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.get(`/services/${svc.id}/eligibility`).then(res => {
        if (live) setScopes(all => ({
          ...all,
          [svc.id]: (0,_lib_assignment_pairs_js__WEBPACK_IMPORTED_MODULE_19__.memberLocationIds)(res.assignments, staffId)
        }));
      }).catch(() => {});
    });
    return () => {
      live = false;
    };
  }, [hasLocations, state, staffId]);
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
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)(_lib_EditorCard_jsx__WEBPACK_IMPORTED_MODULE_12__.EditorCard, {
    id: "staff-services",
    title: "Services"
    // The card header is where the one-line "why is this read-only" note lives now
    // (D-R55); it used to sit above the list and therefore vanish with it.
    ,
    description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Assignments are edited on the service, under “Staff & locations”.', 'aponto'),
    children: state.loading ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("p", {
      className: "pd-editor-note",
      children: "Loading\u2026"
    }) : state.services.length ?
    /*#__PURE__*/
    // The admin's standard list rows, the same anatomy the Calendar connections
    // card uses: hairline-separated, name first, the escape hatch at the inline
    // end. It used to be one 44px bordered box per service whose only text was
    // body-coloured and underline-free — which reads as a DISABLED INPUT, not as a
    // link to that service (founder QA 2026-09-21). The link is the row's action
    // now, carries the admin's accent, and names what it does.
    (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("ul", {
      className: "ap-staff-services-list",
      children: state.services.map(svc => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("li", {
        children: [locations.length ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("span", {
          className: "ap-staff-service-name",
          children: [svc.name, scopes[svc.id] ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("span", {
            className: "ap-image-source",
            children: ` · ${(0,_lib_assignment_pairs_js__WEBPACK_IMPORTED_MODULE_19__.locationScopeLabel)(scopes[svc.id], locations, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Every location', 'aponto'))}`
          }) : null]
        }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("span", {
          className: "ap-staff-service-name",
          children: svc.name
        }), serviceStatusLabel(svc.status) ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("span", {
          className: `ap-staff-service-state is-${SERVICE_STATUS_TONE[svc.status]}`,
          children: serviceStatusLabel(svc.status)
        }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("a", {
          href: `#services/${svc.id}`,
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: %s: the service name. */
          (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Edit %s', 'aponto'), svc.name)
        })]
      }, svc.id))
    }) :
    /*#__PURE__*/
    // The unbookable state, stated plainly. On premium a new service starts with NO
    // eligible staff (the Free policy auto-assigns; the extension does not), so
    // an empty list here is a real, reachable configuration — not an edge case.
    (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("p", {
      className: "pd-editor-note",
      children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: %s: the staff member's name. */
      (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('%s is not assigned to any service yet, so they cannot be booked. Open a service and add them under “Staff & locations”.', 'aponto'), staffName || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('This staff member', 'aponto'))
    })
  });
}

// --- Work hours -------------------------------------------------------------
/** A scope before its GET: nothing known, so nothing dirty (`baseline: null`). */
const EMPTY_SCOPE = {
  loading: true,
  loaded: false,
  custom: false,
  weekly: {},
  overrides: [],
  baseline: null
};

/**
 * Work hours — one card, one or more SCOPES (D-R63).
 *
 * With no active location the card is exactly what it has always been: the wildcard scope
 * ("All locations", `location_id = 0`), an inherited business-hours summary, Customize and Revert.
 * With ≥1 active location a tab row appears — "All locations" plus one tab per branch — and each
 * branch is an independent scope over `GET`/`PUT /staff/{id}/schedule?location_id=N` (weight-5
 * rows, rest-contract §2.6 addendum 2026-09-23). A branch with no rows INHERITS and shows the
 * RESOLVED grid at that branch (`resolved=1&location_id=N`) — what the public grid will use —
 * with Customize (deep-copies that resolved grid) and "Copy hours from…"; a branch with rows is
 * the editable grid plus "Revert to inherited", which PUTs `weekly: []` for that scope only.
 *
 * Every scope keeps its own draft and dirty state; the page Save flushes EVERY dirty scope, one
 * after the other, through the one write queue (`saveRef` keeps its `{ dirty, save }` shape), and
 * the D-R58 guards see the union through `onDirtyChange`.
 */
function WorkHoursSection({
  staffId,
  showToast,
  saveRef,
  onDirtyChange,
  locations = []
}) {
  const {
    confirm,
    dialog
  } = (0,_lib_confirm_jsx__WEBPACK_IMPORTED_MODULE_10__.useConfirmDialog)();
  const business = businessWeeklyMap();
  // `locations` = the ACTIVE branches, read once by the editor. Empty = no tab row and no branch
  // request: the card is the pre-D-R63 card.
  const [scopeId, setScopeId] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(0);
  // Location id → `{ loading, loaded, custom, weekly, overrides, baseline }`.
  const [scopes, setScopes] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)({
    0: EMPTY_SCOPE
  });
  // Branch id → the RESOLVED weekly (contract rows) at that branch, or `null` when the read
  // failed. Cleared after every successful write: any write can change what a branch inherits.
  const [inherited, setInherited] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)({});
  const [saving, setSaving] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const branchesRequested = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(false);
  const loadScope = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(id => {
    setScopes(all => ({
      ...all,
      [id]: {
        ...(all[id] || EMPTY_SCOPE),
        loading: true
      }
    }));
    // No query for the wildcard scope, so a site with no locations sends today's exact request.
    return _lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.get(`/staff/${staffId}/schedule`, id ? {
      location_id: id
    } : undefined).then(res => {
      const map = (0,_lib_branch_hours_js__WEBPACK_IMPORTED_MODULE_20__.weeklyMap)(res.weekly);
      setScopes(all => ({
        ...all,
        [id]: {
          loading: false,
          loaded: true,
          custom: (res.weekly || []).length > 0,
          weekly: map,
          overrides: res.overrides || [],
          baseline: JSON.stringify((0,_lib_branch_hours_js__WEBPACK_IMPORTED_MODULE_20__.weeklyRows)(map))
        }
      }));
    }).catch(() => setScopes(all => ({
      ...all,
      [id]: {
        ...(all[id] || EMPTY_SCOPE),
        loading: false
      }
    })));
  }, [staffId]);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    loadScope(0);
  }, [loadScope]);

  // The first time a BRANCH tab opens, read every branch scope once — the copy-from list needs to
  // know which branches have their own rows. Never before: a member nobody looks at per branch
  // costs exactly the one wildcard read it always did.
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!scopeId || branchesRequested.current) {
      return;
    }
    branchesRequested.current = true;
    locations.forEach(location => loadScope(location.id));
  }, [scopeId, locations, loadScope]);

  // The inherited grid of the open branch tab, read on demand and again after any write.
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!scopeId || Object.prototype.hasOwnProperty.call(inherited, scopeId)) {
      return undefined;
    }
    let live = true;
    _lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.get(`/staff/${staffId}/schedule`, {
      resolved: 1,
      location_id: scopeId
    }).then(res => {
      if (live) setInherited(all => ({
        ...all,
        [scopeId]: res.weekly || []
      }));
    }).catch(() => {
      if (live) setInherited(all => ({
        ...all,
        [scopeId]: null
      }));
    });
    return () => {
      live = false;
    };
  }, [scopeId, inherited, staffId]);

  // The section's write queue. `PUT /staff/{id}/schedule` is a FULL replacement of one scope and
  // the last writer wins. (The server serializes and commits each replacement atomically since
  // persona QA 2026-10-05, T-065 — the queue is what keeps the ORDER the operator chose and the
  // reload after each write honest; Codex review item 1.) Every write path — a
  // scope's own Save, Revert, and the page-level Save for each dirty scope — goes through
  // `persist`, which chains onto whatever is already in flight instead of racing it.
  const writeQueue = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(Promise.resolve());
  const queued = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(0);

  // The one write path (PUT /staff/{id}/schedule, contract §2.6). It REJECTS on failure so every
  // caller decides how to surface it — the page-level Save must be able to tell the user the
  // details saved but the hours did not. `location_id` rides the body only for a branch scope, so
  // the wildcard payload is byte-identical to the pre-D-R63 one.
  const persist = (id, nextWeekly, overrides) => {
    const payload = {
      weekly: (0,_lib_branch_hours_js__WEBPACK_IMPORTED_MODULE_20__.weeklyRows)(nextWeekly),
      overrides: (overrides || []).map(o => ({
        date: o.date,
        periods: o.periods
      }))
    };
    if (id) {
      payload.location_id = id;
    }
    // Busy from the moment a write is QUEUED until the last one settles — a write waiting
    // its turn must keep the grid inert exactly like the one on the wire.
    queued.current += 1;
    setSaving(true);
    const run = async () => {
      try {
        await _lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.put(`/staff/${staffId}/schedule`, payload);
        setInherited({});
        await loadScope(id);
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
      showToast('Work hours saved.', 'success');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };
  const scope = scopes[scopeId] || EMPTY_SCOPE;
  const allScope = scopes[0] || EMPTY_SCOPE;
  const branch = locations.find(location => location.id === scopeId) || null;
  const branchName = id => locations.find(location => location.id === id)?.name || '';
  const setScopeWeekly = (id, weekly, extra = {}) => setScopes(all => ({
    ...all,
    [id]: {
      ...(all[id] || EMPTY_SCOPE),
      weekly,
      ...extra
    }
  }));

  // Customize opens the editor LOCALLY and persists only on "Save work hours" — no empty
  // write-then-revert round-trip (U4-03b). All locations deep-copies the business hours (and keeps
  // the legacy Mon–Fri 09:00–17:00 seed for a site with none configured). A branch copies the
  // RESOLVED grid at that branch VERBATIM — a week closed there stays closed (D-R63 fix round 1) —
  // and is only offered once that grid was actually read (see the header action below).
  const customize = () => {
    if (scopeId) {
      const resolved = inherited[scopeId];
      if (!Array.isArray(resolved)) {
        return;
      }
      setScopeWeekly(scopeId, (0,_lib_branch_hours_js__WEBPACK_IMPORTED_MODULE_20__.seedWeekly)((0,_lib_branch_hours_js__WEBPACK_IMPORTED_MODULE_20__.periodsByWeekday)(resolved), {
        fallback: false
      }), {
        custom: true
      });
      return;
    }
    setScopeWeekly(0, (0,_lib_branch_hours_js__WEBPACK_IMPORTED_MODULE_20__.seedWeekly)(business), {
      custom: true
    });
  };

  // "Copy hours from…" (branch tabs): a verbatim deep copy of the source scope's week — All
  // locations' own rows, or the business hours it inherits — opened as this branch's unsaved draft.
  const copyFrom = sourceId => {
    const source = scopes[sourceId] || EMPTY_SCOPE;
    const weekly = source.custom ? (0,_lib_branch_hours_js__WEBPACK_IMPORTED_MODULE_20__.cloneWeekly)(source.weekly) : (0,_lib_branch_hours_js__WEBPACK_IMPORTED_MODULE_20__.seedWeekly)(business, {
      fallback: false
    });
    setScopeWeekly(scopeId, weekly, {
      custom: true
    });
  };

  // Validate + write ONE scope's pending grid. Rejects (never toasts) so the caller owns the
  // message; a branch's error names the branch, because the page Save may be flushing several.
  //
  // The rejection carries the LOCATOR as well as the sentence (founder QA 2026-09-21, round 3):
  // `validateWeekly()` answers `{ message, weekday, index }`, and the page Save uses those two
  // numbers to focus the control that is actually wrong instead of the first one in the card.
  // Attached to the Error rather than thrown as a bare object so every existing `catch` that
  // reads `.message` keeps working untouched. A locator is only meaningful in the grid on
  // screen, so a branch scope that fails validation opens its own tab first (D-R63 tabs).
  const flushScope = async id => {
    const target = scopes[id];
    const invalid = (0,_lib_WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_11__.validateWeekly)(target.weekly);
    if (invalid) {
      if (id !== scopeId) {
        setScopeId(id);
      }
      const error = new Error(id ? `${branchName(id)}: ${invalid.message}` : invalid.message);
      error.weekday = invalid.weekday;
      error.period = invalid.index;
      throw error;
    }
    try {
      await persist(id, target.weekly, target.overrides);
    } catch (err) {
      throw new Error(id ? `${branchName(id)}: ${err.message}` : err.message);
    }
  };

  // ONE pending-edit signature per scope, read by the page Save (through `saveRef`) and by the
  // dirty guards (through `onDirtyChange`) as their UNION. A scope whose GET failed has a null
  // baseline and can neither look dirty nor be flushed over a schedule nobody read.
  const dirtyIds = (0,_lib_branch_hours_js__WEBPACK_IMPORTED_MODULE_20__.dirtyScopeIds)(scopes);
  const dirty = dirtyIds.length > 0;

  // The page Save flushes every dirty scope in order, All locations first. Sequential on purpose:
  // the queue would serialise them anyway, and stopping at the first failure means the toast
  // names the one scope that did not save instead of a pile of them.
  const flushAll = async () => {
    for (const id of dirtyIds) {
      await flushScope(id); // eslint-disable-line no-await-in-loop
    }
  };

  // Publish the pending edit to StaffWorkspace so its Save can flush this sub-resource
  // (the page is one continuous form). Without this the grid state died on unmount:
  // no PUT, no error — the 1.0.0 free-zip beta bug. Re-registered every render so the
  // closure over the scopes is never stale.
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!saveRef) {
      return undefined;
    }
    const handle = {
      dirty,
      save: flushAll
    };
    saveRef.current = handle;
    return () => {
      if (saveRef.current === handle) {
        saveRef.current = null;
      }
    };
  });

  // …and report the SAME fact up as state, because a ref cannot re-render the guard that has to
  // act on it. Keyed, so it does not fire on every render of this section.
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => () => onDirtyChange?.(false), [onDirtyChange]);
  const saveWeekly = () => withToast(() => flushScope(scopeId));
  const revert = async () => {
    // In-app dialog (C13 / review F item 3): destructive styling, Cancel takes default focus.
    const ok = await confirm(scopeId ? {
      title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: %s: location name. */
      (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Revert %s to inherited hours?', 'aponto'), branchName(scopeId)),
      message: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('The custom hours for this location will be removed, and it will use the inherited hours again.', 'aponto'),
      confirmText: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Revert', 'aponto'),
      destructive: true
    } : {
      title: 'Revert to business hours?',
      message: 'Custom weekly hours will be removed (date overrides are kept).',
      confirmText: 'Revert',
      destructive: true
    });
    if (!ok) {
      return;
    }
    const id = scopeId;
    const overrides = scope.overrides;
    setScopeWeekly(id, {}, {
      custom: false
    });
    // `weekly: []` — an EMPTY list, not seven closed days — deletes the scope's weekly rows
    // (rest-contract §2.6 addendum point 4); its date overrides ride back untouched.
    withToast(() => persist(id, {}, overrides));
  };
  const hasBranches = locations.length > 0;
  // WAI-ARIA tabs: one tab in the tab order (roving tabindex), arrows move between them — mirrored
  // under `dir="rtl"`, where the NEXT tab is to the left — and Home/End jump to the ends.
  const tabIds = [0, ...locations.map(location => location.id)];
  const onTabKey = e => {
    const rtl = 'rtl' === e.currentTarget.closest('[dir]')?.getAttribute('dir');
    const index = tabIds.indexOf(scopeId);
    const moves = {
      ArrowRight: rtl ? -1 : 1,
      ArrowLeft: rtl ? 1 : -1,
      Home: -index,
      End: tabIds.length - 1 - index
    };
    if (!(e.key in moves)) {
      return;
    }
    e.preventDefault();
    const next = tabIds[(index + moves[e.key] + tabIds.length) % tabIds.length];
    setScopeId(next);
    e.currentTarget.querySelector(`#staff-hours-tab-${next}`)?.focus();
  };
  const tabs = hasBranches ?
  /*#__PURE__*/
  // eslint-disable-next-line jsx-a11y/interactive-supports-focus -- the TABS are focusable (roving tabindex); the list only routes their arrow keys.
  (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("div", {
    className: "pd-section-tabs",
    role: "tablist",
    "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Work hours location', 'aponto'),
    onKeyDown: onTabKey,
    children: [{
      id: 0,
      name: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('All locations', 'aponto')
    }, ...locations].map(tab => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("button", {
      type: "button",
      role: "tab",
      id: `staff-hours-tab-${tab.id}`,
      "aria-selected": scopeId === tab.id,
      "aria-controls": "staff-hours-panel",
      tabIndex: scopeId === tab.id ? 0 : -1,
      onClick: () => setScopeId(tab.id),
      children: tab.name
    }, tab.id))
  }) : null;
  if (allScope.loading && !allScope.loaded) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)(_lib_EditorCard_jsx__WEBPACK_IMPORTED_MODULE_12__.EditorCard, {
      id: "staff-hours",
      title: "Work hours",
      description: HOURS_DESCRIPTION,
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("p", {
        className: "pd-editor-note",
        children: "Loading\u2026"
      })
    });
  }

  // Header action. Both rewrite the whole week of the open scope, so they are inert while a write
  // is in flight — the same rule the grid itself follows (Codex review item 1).
  // A failed WILDCARD read keeps its pre-D-R63 face (the inherited summary + Customize; its null
  // baseline still keeps the page Save from writing over rows nobody read); a failed BRANCH read
  // says so instead of pretending the branch inherits.
  const usable = scope.loaded || !scopeId && !scope.loading;
  let action = null;
  if (usable) {
    if (scope.custom) {
      action = /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("button", {
        type: "button",
        className: "pd-section-action",
        disabled: saving,
        onClick: revert,
        children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_8__.renderIcon)('arrows'), scopeId ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Revert to inherited', 'aponto') : 'Revert to business hours']
      });
    } else {
      action = /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("button", {
        type: "button",
        className: "pd-section-action",
        disabled: saving || scopeId > 0 && !Array.isArray(inherited[scopeId]),
        onClick: customize,
        children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_8__.renderIcon)('note'), "Customize"]
      });
    }
  }
  const hoursList = byDay => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("ul", {
    className: "ap-hours-list",
    children: _lib_WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_11__.WEEKDAYS.map(([n, label]) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("li", {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("span", {
        children: label
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("strong", {
        children: byDay[n] && byDay[n].length ? byDay[n].map(p => `${(0,_lib_WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_11__.formatMinutes)(p.start_minute, _lib_config_js__WEBPACK_IMPORTED_MODULE_3__.config.settings.timeFormat)} – ${(0,_lib_WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_11__.formatMinutes)(p.end_minute, _lib_config_js__WEBPACK_IMPORTED_MODULE_3__.config.settings.timeFormat)}`).join(', ') : 'Closed'
      })]
    }, n))
  });
  let body;
  if (!usable) {
    body = /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("p", {
      className: "pd-editor-note",
      children: scope.loading ? 'Loading…' : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('These hours could not be loaded.', 'aponto')
    });
  } else if (scope.custom) {
    body = /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("div", {
      className: "ap-hours-grid-wrap",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)(_lib_WeeklyHoursGrid_jsx__WEBPACK_IMPORTED_MODULE_11__.WeeklyHoursGrid, {
        weekly: scope.weekly,
        onChange: next => setScopeWeekly(scopeId, next),
        busy: saving,
        timeFormat: _lib_config_js__WEBPACK_IMPORTED_MODULE_3__.config.settings.timeFormat
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("div", {
        className: "ap-hours-save",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("button", {
          type: "button",
          className: "pd-button primary sm",
          disabled: saving,
          onClick: saveWeekly,
          children: saving ? 'Saving…' : 'Save work hours'
        })
      })]
    });
  } else if (!scopeId) {
    body = /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("div", {
      className: "ap-hours-summary",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("p", {
        className: "pd-editor-note",
        children: "Using your business hours (inherited). Customize to give this staff member their own weekly hours."
      }), hoursList(business)]
    });
  } else {
    const resolved = inherited[scopeId];
    const sources = (0,_lib_branch_hours_js__WEBPACK_IMPORTED_MODULE_20__.copySourceIds)({
      scopes,
      activeId: scopeId,
      locations
    });
    body = /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("div", {
      className: "ap-hours-summary",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("p", {
        className: "pd-editor-note",
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: %s: location name. */
        'all' === (0,_lib_branch_hours_js__WEBPACK_IMPORTED_MODULE_20__.inheritedSource)(allScope) ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Using the All locations hours at %s (inherited). Customize to give this staff member their own hours here.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Using your business hours at %s (inherited). Customize to give this staff member their own hours here.', 'aponto'), branch?.name || '')
      }), undefined === resolved ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("p", {
        className: "pd-editor-note",
        children: "Loading\u2026"
      }) : null, null === resolved ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("p", {
        className: "pd-editor-note",
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('The inherited hours could not be loaded.', 'aponto')
      }) : null, Array.isArray(resolved) ? hoursList((0,_lib_branch_hours_js__WEBPACK_IMPORTED_MODULE_20__.periodsByWeekday)(resolved)) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("label", {
        className: "pd-compact-field pd-compact-select is-filled",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("select", {
          value: "",
          disabled: saving,
          onChange: e => {
            if ('' !== e.target.value) copyFrom(Number(e.target.value));
          },
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("option", {
            value: "",
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Choose a source…', 'aponto')
          }), sources.map(id => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("option", {
            value: id,
            children: id ? branchName(id) : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('All locations', 'aponto')
          }, id))]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("span", {
          className: "pd-compact-label",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Copy hours from', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("span", {
          className: "pd-field-end-icon",
          "aria-hidden": "true",
          children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_8__.renderIcon)('chevronDown')
        })]
      })]
    });
  }
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)(_lib_EditorCard_jsx__WEBPACK_IMPORTED_MODULE_12__.EditorCard, {
    id: "staff-hours",
    title: "Work hours",
    description: HOURS_DESCRIPTION,
    action: action,
    children: [tabs, hasBranches ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("div", {
      id: "staff-hours-panel",
      role: "tabpanel",
      "aria-labelledby": `staff-hours-tab-${scopeId}`,
      children: [body, scopeId ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("p", {
        className: "pd-editor-note",
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Time off applies at every location.', 'aponto')
      }) : null]
    }) : body, dialog]
  });
}

// --- Time off (blocked periods) ---------------------------------------------
/**
 * What is wrong with a time-off entry, keyed by the field that has to change (persona QA
 * 2026-10-05, T-069). Empty when the range can be posted.
 *
 * `datetime-local` values (`YYYY-MM-DDTHH:mm`) of one zone order correctly as plain strings, so
 * the comparison needs no date parsing — and so cannot disagree with it across a DST change.
 *
 * @param {{start: string, end: string}} form The two picker values.
 * @return {Object} `{ start?, end? }` messages.
 */
function timeOffErrors(form) {
  const errors = {};
  if (!form?.start) {
    errors.start = (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Choose when the time off starts.', 'aponto');
  }
  if (!form?.end) {
    errors.end = (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Choose when the time off ends.', 'aponto');
  } else if (form.start && form.end <= form.start) {
    errors.end = (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('The end must be after the start.', 'aponto');
  }
  return errors;
}

/**
 * One time-off row's range, in business time (persona QA 2026-10-05, T-068).
 *
 * A block inside one day reads "date · start – end". A block that crosses midnight names BOTH
 * dates: it used to print the start date with the two clock times, so a week off read as
 * "Mon 3 Aug · 9:00 AM – 5:00 PM" — one working day.
 *
 * @param {{start_datetime_utc: string, end_datetime_utc: string}} item Blocked-period DTO.
 * @return {string} Display range.
 */
function timeOffRangeLabel(item) {
  const from = `${(0,_lib_format_js__WEBPACK_IMPORTED_MODULE_4__.longDate)(item.start_datetime_utc)} · ${(0,_lib_format_js__WEBPACK_IMPORTED_MODULE_4__.timeLabel)(item.start_datetime_utc)}`;
  if ((0,_lib_format_js__WEBPACK_IMPORTED_MODULE_4__.isoDate)(item.start_datetime_utc) === (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_4__.isoDate)(item.end_datetime_utc)) {
    return `${from} – ${(0,_lib_format_js__WEBPACK_IMPORTED_MODULE_4__.timeLabel)(item.end_datetime_utc)}`;
  }
  return `${from} – ${(0,_lib_format_js__WEBPACK_IMPORTED_MODULE_4__.longDate)(item.end_datetime_utc)} · ${(0,_lib_format_js__WEBPACK_IMPORTED_MODULE_4__.timeLabel)(item.end_datetime_utc)}`;
}
function TimeOffSection({
  staffId,
  showToast,
  onDirtyChange
}) {
  const [items, setItems] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)([]);
  const [loading, setLoading] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(true);
  const [adding, setAdding] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [form, setForm] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)({
    start: '',
    end: '',
    reason: ''
  });

  // A STARTED time-off entry is an unsaved edit too — it is written by its own POST, which the
  // page Save does not make, so leaving the editor drops it. An opened-but-untouched form is
  // not: asking about a form the operator has typed nothing into would be a dialog about
  // nothing.
  const dirty = adding && Boolean(form.start || form.end || form.reason);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => () => onDirtyChange?.(false), [onDirtyChange]);
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

  // One POST per press, and a busy button while it is on the wire (persona QA 2026-10-05, T-067):
  // this form had no guard at all, so "Add time off" pressed twice stored two identical blocks.
  const once = (0,_lib_in_flight_js__WEBPACK_IMPORTED_MODULE_5__.useInFlight)();
  const [busy, setBusy] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [fieldError, setFieldError] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)({});
  const setField = key => e => {
    const value = e.target.value;
    setForm(f => ({
      ...f,
      [key]: value
    }));
    // The message belongs to the value that earned it; a corrected field stops accusing.
    setFieldError(errors => errors.start || errors.end ? {} : errors);
  };
  const add = () => once(async () => {
    // Said ON the field (T-069): the toast this replaced vanished after a few seconds and
    // named no control, so an inverted range read as a button that did nothing.
    const errors = timeOffErrors(form);
    if (Object.keys(errors).length) {
      setFieldError(errors);
      return;
    }
    setFieldError({});
    setBusy(true);
    try {
      await _lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.post('/blocked-periods', {
        staff_id: staffId,
        start_datetime_utc: (0,_calendar_constants_js__WEBPACK_IMPORTED_MODULE_7__.businessLocalDateToUtcIso)(new Date(form.start)),
        end_datetime_utc: (0,_calendar_constants_js__WEBPACK_IMPORTED_MODULE_7__.businessLocalDateToUtcIso)(new Date(form.end)),
        reason: form.reason
      });
      showToast('Time off added.', 'success');
      setAdding(false);
      setForm({
        start: '',
        end: '',
        reason: ''
      });
      load();
    } catch (err) {
      const fields = err.data?.fields;
      if (fields?.start_datetime_utc || fields?.end_datetime_utc) {
        setFieldError({
          start: fields.start_datetime_utc,
          end: fields.end_datetime_utc
        });
      }
      showToast(err.message, 'danger');
    } finally {
      setBusy(false);
    }
  });
  const remove = id => once(async () => {
    try {
      await _lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.del(`/blocked-periods/${id}`);
      showToast('Time off removed.');
      load();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)(_lib_EditorCard_jsx__WEBPACK_IMPORTED_MODULE_12__.EditorCard, {
    id: "staff-timeoff",
    title: "Time off",
    description: "Blocked periods and special hours appear on the Calendar and block new bookings.",
    action: !adding ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("button", {
      type: "button",
      className: "pd-section-action",
      onClick: () => setAdding(true),
      children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_8__.renderIcon)('plus'), "Add time off"]
    }) : null,
    children: [adding ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("div", {
      className: "ap-timeoff-form",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("div", {
        className: "pd-field-grid",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("label", {
          className: (0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldClass)('pd-compact-field is-filled', fieldError, 'start'),
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("input", {
            type: "datetime-local",
            value: form.start,
            onChange: setField('start'),
            ...(0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldAria)('timeoff', fieldError, 'start')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("span", {
            className: "pd-compact-label",
            children: "From (business time)"
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("label", {
          className: (0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldClass)('pd-compact-field is-filled', fieldError, 'end'),
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("input", {
            type: "datetime-local",
            value: form.end,
            onChange: setField('end'),
            ...(0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldAria)('timeoff', fieldError, 'end')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("span", {
            className: "pd-compact-label",
            children: "To (business time)"
          })]
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)(_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.FieldErrors, {
        prefix: "timeoff",
        fieldError: fieldError,
        keys: ['start', 'end']
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("label", {
        className: "pd-compact-field",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("input", {
          value: form.reason,
          placeholder: " ",
          onChange: e => setForm(f => ({
            ...f,
            reason: e.target.value
          }))
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("span", {
          className: "pd-compact-label",
          children: "Reason (optional)"
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("div", {
        className: "ap-inline-actions",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("button", {
          type: "button",
          className: "pd-button sm",
          disabled: busy,
          onClick: () => {
            setAdding(false);
            setFieldError({});
          },
          children: "Cancel"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("button", {
          type: "button",
          className: "pd-button primary sm",
          disabled: busy,
          onClick: add,
          children: busy ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Adding…', 'aponto') : 'Add time off'
        })]
      })]
    }) : null, loading ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("p", {
      className: "pd-editor-note",
      children: "Loading\u2026"
    }) : items.length ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("ul", {
      className: "ap-timeoff-list",
      children: items.map(item => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("li", {
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsxs)("div", {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("strong", {
            children: timeOffRangeLabel(item)
          }), item.reason ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("span", {
            children: item.reason
          }) : null]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("button", {
          type: "button",
          className: "pd-icon-button sm",
          "aria-label": "Remove time off",
          onClick: () => remove(item.id),
          children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_8__.renderIcon)('close')
        })]
      }, item.id))
    }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_21__.jsx)("p", {
      className: "pd-editor-note",
      children: "No time off scheduled."
    })]
  });
}

/***/ }

}]);
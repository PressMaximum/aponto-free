"use strict";
(globalThis["webpackChunkaponto"] = globalThis["webpackChunkaponto"] || []).push([["admin-chunk-booking-editor"],{

/***/ "./assets/src/admin/lib/Combobox.jsx"
/*!*******************************************!*\
  !*** ./assets/src/admin/lib/Combobox.jsx ***!
  \*******************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Combobox: () => (/* binding */ Combobox)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _icon_jsx__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./icon.jsx */ "./assets/src/admin/lib/icon.jsx");
/* harmony import */ var _combobox_options_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./combobox-options.js */ "./assets/src/admin/lib/combobox-options.js");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__);
/**
 * Searchable combobox used by the in-flow booking editor (customer-first + service
 * + staff). Focus raises the compact floating label, turns the value into a query
 * and opens a filtered listbox; selection / Escape / outside-click resolve back to
 * a valid option (SPEC-P1 §6.7). Reuses the mockup `.pd-combobox` chrome.
 *
 * The caller owns the selection as an OPTION OBJECT (`selected`), not as a display
 * string: identity is `option.id` (see `combobox-options.js`) so two records sharing
 * a name stay distinct rows with distinct React keys, and what the editor submits is
 * always the id of the row the user actually clicked. `option.label` is display-only
 * and remains what typeahead matches on; `option.meta` adds the secondary line that
 * makes two same-named rows distinguishable on screen too (see `combobox-options.js`).
 *
 * The listbox also flips above the field when it would otherwise be clipped by the
 * scrolling inspector body — the `.opens-up` half of the ported chrome, which shipped
 * as CSS with nothing switching it on (see `flipDirection` below).
 */




function Combobox({
  name,
  label,
  selected = null,
  options = [],
  onSelect,
  disabled = false,
  entity = false,
  required = true,
  emptyText
}) {
  const [open, setOpen] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [query, setQuery] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)('');
  const [active, setActive] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(0);
  const [opensUp, setOpensUp] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const wrapRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  const inputRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  const popoverRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  const listId = `booking-${name}-options`;
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!open) {
      return undefined;
    }
    const onDoc = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open]);
  const selectedLabel = selected?.label ?? '';
  // A query still equal to the current selection is not a filter (focus seeds the
  // input with the selected label) — keep the full list so switching stays one click.
  const filtered = (0,react__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => query === selectedLabel ? options : (0,_combobox_options_js__WEBPACK_IMPORTED_MODULE_2__.filterOptions)(options, query), [query, selectedLabel, options]);

  /**
   * Open upwards when the listbox would be clipped below the field.
   *
   * Mirrors the mockup's `positionCombobox()` verbatim, thresholds included
   * (docs/mockups/v4/plugin-dashboard/assets/js/plugin-dashboard.js:1732-1742): the
   * reference box is the scrolling inspector/drawer body — NOT the viewport, since
   * that body is what clips us — falling back to the viewport when the combobox sits
   * outside one; the listbox needs `min(scrollHeight, 220) + 8` px (its CSS max-height
   * plus the 5px offset and a hair); and up wins only when below is short AND above is
   * roomier, so a cramped field with no better option stays down.
   *
   * Both inputs are direction-independent (the field's own box + the content height —
   * the popover is absolutely positioned, so flipping it changes neither), which is
   * what keeps the decision from oscillating against itself.
   */
  const flipDirection = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
    const wrap = wrapRef.current;
    const popover = popoverRef.current;
    if (!wrap || !popover) {
      return;
    }
    const body = wrap.closest('.pd-drawer-body,.pd-booking-inspector-body');
    const bodyRect = body ? body.getBoundingClientRect() : {
      top: 0,
      bottom: window.innerHeight
    };
    const fieldRect = wrap.getBoundingClientRect();
    const needed = Math.min(popover.scrollHeight, 220) + 8;
    const below = bodyRect.bottom - fieldRect.bottom;
    const above = fieldRect.top - bodyRect.top;
    setOpensUp(below < needed && above > below);
  }, []);

  // Measure before paint (never a frame in the wrong direction) on open and whenever
  // the row count changes the listbox height — the mockup likewise re-positions after
  // every filter pass (plugin-dashboard.js:2000-2001). Closing drops the class, the
  // same reset `closeCombobox()` does (plugin-dashboard.js:1805).
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useLayoutEffect)(() => {
    if (!open) {
      setOpensUp(false);
      return;
    }
    flipDirection();
  }, [open, filtered.length, flipDirection]);

  // A resize can turn a roomy field into a cramped one while the listbox is open. The
  // mockup never re-measures here (its resize handler only touches the drawer), so
  // this is ours: the same rule, re-run on the event that invalidates it.
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!open) {
      return undefined;
    }
    window.addEventListener('resize', flipDirection);
    return () => window.removeEventListener('resize', flipDirection);
  }, [open, flipDirection]);
  const choose = option => {
    onSelect?.(option);
    setOpen(false);
    setQuery('');
  };
  const onKeyDown = e => {
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
      inputRef.current?.blur();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && open && filtered[active]) {
      e.preventDefault();
      choose(filtered[active]);
    }
  };
  const shown = open ? query : selectedLabel;
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)("div", {
    className: `pd-combobox${entity ? ' is-entity' : ''}${open ? ' is-open' : ''}${opensUp ? ' opens-up' : ''}`,
    "data-combobox": true,
    ref: wrapRef,
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)("label", {
      className: "pd-compact-field pd-combobox-field",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("input", {
        ref: inputRef,
        type: "text",
        name: name,
        value: shown,
        placeholder: " ",
        role: "combobox",
        "aria-autocomplete": "list",
        "aria-expanded": open,
        "aria-controls": listId,
        disabled: disabled,
        required: required,
        autoComplete: "off",
        "data-selected-id": selected?.id ?? undefined,
        onFocus: () => {
          setOpen(true);
          setQuery(selectedLabel);
          setActive(0);
        },
        onChange: e => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        },
        onKeyDown: onKeyDown
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("span", {
        className: "pd-compact-label",
        children: label
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)("span", {
        className: "pd-field-end-icon",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("span", {
          className: "pd-combobox-idle-icon",
          children: (0,_icon_jsx__WEBPACK_IMPORTED_MODULE_1__.renderIcon)('chevronDown')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("span", {
          className: "pd-combobox-active-icon",
          children: (0,_icon_jsx__WEBPACK_IMPORTED_MODULE_1__.renderIcon)('search')
        })]
      })]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)("div", {
      className: "pd-combobox-popover",
      id: listId,
      role: "listbox",
      hidden: !open,
      ref: popoverRef,
      children: [filtered.map((option, index) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("button", {
        type: "button",
        role: "option",
        "data-option-id": option.id ?? undefined,
        "aria-selected": (0,_combobox_options_js__WEBPACK_IMPORTED_MODULE_2__.isSameOption)(option, selected),
        className: index === active ? 'is-active' : undefined,
        onMouseEnter: () => setActive(index),
        onClick: () => choose(option),
        children: entity || option.meta ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)("span", {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("strong", {
            children: option.label
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("small", {
            children: option.meta || 'No contact details'
          })]
        }) : option.label
      }, (0,_combobox_options_js__WEBPACK_IMPORTED_MODULE_2__.optionKey)(option))), !filtered.length ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("p", {
        "data-combobox-empty": true,
        children: emptyText || `No ${label.toLowerCase()} found`
      }) : null]
    })]
  });
}

/***/ },

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

/***/ "./assets/src/admin/lib/editor-rows.js"
/*!*********************************************!*\
  !*** ./assets/src/admin/lib/editor-rows.js ***!
  \*********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   locationRowValue: () => (/* binding */ locationRowValue),
/* harmony export */   staffRowValue: () => (/* binding */ staffRowValue)
/* harmony export */ });
/**
 * Pure value logic for the read-only Staff and Location rows in the booking editor
 * (BookingEditor.jsx §Edit mode). Extracted so the "these rows always resolve to a non-empty
 * value, so they always render" contract — the regression guard for the pre-beta demo #2 finding
 * (rows reported missing) — is unit-testable in the framework-free Jest environment, without a DOM.
 */

/** The Staff row value: the booking row's staff name, or "Unassigned" when none is set. */
function staffRowValue(row) {
  return row && row.staff || 'Unassigned';
}

/**
 * The Location row value. A real location (`locationId != 0`) resolves to its catalog name, falling
 * back to the row's location label and finally `Location #id`; `locationId = 0` is the wildcard "no
 * location record", which means the booking runs at the business address (§5 invariant 11: a fresh
 * install has zero location rows, and that is a valid, complete state).
 *
 * When the business address is known, that address IS the answer to "where?" — the old
 * "No location · 123 Main Street" contradicted itself in one line (beta QA 2026-08-01), telling the
 * owner there is no location while printing the location. Only a business with no address on file
 * falls back to the honest "No location". Never returns an empty string.
 *
 * @param {Object} args
 * @param {number} args.locationId      Booking location id (0 = no location record).
 * @param {string} [args.locationName]  Resolved catalog name for the location.
 * @param {string} [args.rowLocation]   Location label carried on the list row.
 * @param {string} [args.businessAddress] Business address (the answer for the no-location case).
 */
function locationRowValue({
  locationId,
  locationName,
  rowLocation,
  businessAddress
}) {
  if (locationId) {
    return locationName || rowLocation || `Location #${locationId}`;
  }
  return businessAddress || 'No location';
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

/***/ "./assets/src/admin/modules/module-state.js"
/*!**************************************************!*\
  !*** ./assets/src/admin/modules/module-state.js ***!
  \**************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   applyModuleEnabled: () => (/* binding */ applyModuleEnabled),
/* harmony export */   getModules: () => (/* binding */ getModules),
/* harmony export */   resetModuleState: () => (/* binding */ resetModuleState),
/* harmony export */   subscribeModules: () => (/* binding */ subscribeModules),
/* harmony export */   useModules: () => (/* binding */ useModules)
/* harmony export */ });
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _lib_config_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../lib/config.js */ "./assets/src/admin/lib/config.js");
/* harmony import */ var _catalog_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./catalog.js */ "./assets/src/admin/modules/catalog.js");
/**
 * Live module records for the whole SPA session (D-R31 fix, 2026-08-29).
 *
 * WHY THIS EXISTS. The catalog's toggle first kept its optimistic result in route-local
 * `useState` inside `ModulesApp`, layered over the static `config.modules` boot snapshot. That
 * works exactly as long as the route stays mounted — and the Modules section is precisely where
 * it does not: hash-navigating to a panel unmounts `ModulesApp`, the state dies with it, and
 * every consumer falls back to the boot snapshot until a full document reload. Two real symptom
 * pairs came out of that, both reported from the assembled preview:
 *
 *   - disable a module → open a panel → go back to `#modules`: the card reads Enabled again,
 *     AND the disabled module's panel route still mounts its editor, which then fetches a route
 *     the server has stopped serving and shows a raw `rest_no_route` banner;
 *   - enable a module → open its panel without reloading: the route insists the module "is not
 *     available on this site".
 *
 * The state was never wrong — it was scoped to the wrong lifetime. It belongs to the SESSION,
 * not to a route, so it lives here: a module-level singleton, the same house idiom as
 * `lib/nav-guard.js` and `lib/module-panels.js`. No context, no new dependency.
 *
 * A fresh document load re-seeds from boot data, which the server already computes correctly —
 * this store only has to keep the CURRENT page honest between reloads.
 */




/**
 * Session records, seeded lazily from boot data.
 *
 * @type {Array|null}
 */
let records = null;

/** @type {Set<Function>} */
const listeners = new Set();

/** The live records, seeding from the boot snapshot on first read. */
function getModules() {
  if (records === null) {
    records = Array.isArray(_lib_config_js__WEBPACK_IMPORTED_MODULE_1__.config.modules) ? _lib_config_js__WEBPACK_IMPORTED_MODULE_1__.config.modules.slice() : [];
  }
  return records;
}

/**
 * Apply a module's new switch position to the session view.
 *
 * `available` moves WITH `enabled` — but only for a module this build may actually toggle. That
 * flag is `Plan::has()` server-side, and the user switch is one of its terms; the other terms
 * (edition, shipped-ness) cannot change without a reload, so for a toggle-eligible module
 * `available` reduces to `enabled`. Deriving it here is what makes the card, the subnav and the
 * panel route's availability gate agree instantly, since all three key on `available`.
 *
 * A module that is NOT toggle-eligible keeps its boot `available` untouched: nothing in this
 * session can legitimately change it.
 *
 * @param {string}  code    Module code.
 * @param {boolean} enabled New switch position.
 */
function applyModuleEnabled(code, enabled) {
  records = getModules().map(mod => {
    if (mod?.code !== code) {
      return mod;
    }
    const eligible = (0,_catalog_js__WEBPACK_IMPORTED_MODULE_2__.moduleToggleAllowed)(mod, _lib_config_js__WEBPACK_IMPORTED_MODULE_1__.config.planEdition);
    return {
      ...mod,
      enabled,
      available: eligible ? enabled : mod.available
    };
  });
  listeners.forEach(listener => listener(records));
}

/**
 * Subscribe to session changes.
 *
 * @param {Function} listener Called with the new records.
 * @return {Function} Unsubscribe.
 */
function subscribeModules(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The live records, re-rendering the caller when they change.
 *
 * Every module surface reads through this — the catalog cards, the section subnav and the panel
 * route's availability gate — so they cannot disagree about a module's state within a session.
 *
 * @return {Array} Module records.
 */
function useModules() {
  const [state, setState] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(getModules);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => subscribeModules(setState), []);
  return state;
}

/** Drop the session view so the next read re-seeds from boot data. Test seam only. */
function resetModuleState() {
  records = null;
  listeners.clear();
}

/***/ },

/***/ "./assets/src/admin/routes/BookingEditor.jsx"
/*!***************************************************!*\
  !*** ./assets/src/admin/routes/BookingEditor.jsx ***!
  \***************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   BookingEditor: () => (/* binding */ BookingEditor)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _pressmaximum_dashboard_kit_primitives__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @pressmaximum/dashboard-kit/primitives */ "./node_modules/@pressmaximum/dashboard-kit/build/primitives/index.mjs");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _lib_api_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../lib/api.js */ "./assets/src/admin/lib/api.js");
/* harmony import */ var _lib_config_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/config.js */ "./assets/src/admin/lib/config.js");
/* harmony import */ var _lib_format_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../lib/format.js */ "./assets/src/admin/lib/format.js");
/* harmony import */ var _lib_booking_adapter_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../lib/booking-adapter.js */ "./assets/src/admin/lib/booking-adapter.js");
/* harmony import */ var _lib_editor_rows_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../lib/editor-rows.js */ "./assets/src/admin/lib/editor-rows.js");
/* harmony import */ var _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../lib/icon.jsx */ "./assets/src/admin/lib/icon.jsx");
/* harmony import */ var _lib_notification_outcome_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../lib/notification-outcome.js */ "./assets/src/admin/lib/notification-outcome.js");
/* harmony import */ var _lib_toast_jsx__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../lib/toast.jsx */ "./assets/src/admin/lib/toast.jsx");
/* harmony import */ var _lib_Combobox_jsx__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../lib/Combobox.jsx */ "./assets/src/admin/lib/Combobox.jsx");
/* harmony import */ var _lib_combobox_options_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../lib/combobox-options.js */ "./assets/src/admin/lib/combobox-options.js");
/* harmony import */ var _modules_catalog_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../modules/catalog.js */ "./assets/src/admin/modules/catalog.js");
/* harmony import */ var _modules_module_state_js__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ../modules/module-state.js */ "./assets/src/admin/modules/module-state.js");
/* harmony import */ var _lib_payment_status_js__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ../lib/payment-status.js */ "./assets/src/admin/lib/payment-status.js");
/* harmony import */ var _lib_lazy_jsx__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ../lib/lazy.jsx */ "./assets/src/admin/lib/lazy.jsx");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__);
/**
 * In-flow booking editor (SPEC-P1 §1.4 / mockup §6.7). One shell, one domain
 * order: Customer → Services & items → Schedule → Order → Internal notes (+ Activity
 * in edit). Non-modal: the list stays interactive (no backdrop/body-lock/focus-trap).
 *
 * - Create: customer-first, availability-driven `Available start time` (no past),
 *   derived read-only end, create-as-draft (default_booking_status). POST /bookings.
 * - Edit: Customer/Service/schedule read-only; `Edit time` = reschedule sub-flow
 *   (PUT /bookings/{id}/reschedule); Order snapshot + manual Paid/Unpaid
 *   (PATCH payment_status, none|paid, Q9); Save commits status(+notify)+internal
 *   note (PATCH); Cancel is a destructive confirm in the footer overflow; status
 *   follows the single-source transition matrix; Notify default-on per transition.
 *
 * Footer: the `Notify customer` choice sits on its own row above the commit
 * buttons (founder decision 2026-07-25 — D1), so the button row stays the
 * mockup's 62px footer. See `NotifyRow` below.
 */


















// The refund dialog is the rarest surface in the app and entirely self-contained, so it
// loads on the click that opens it rather than riding in `admin.js` (AGENTS §6 budget; the
// P3 handoff §4 debt item). `lazySurface` supplies the Spinner and the retry line.

const RefundDialog = (0,_lib_lazy_jsx__WEBPACK_IMPORTED_MODULE_16__.lazySurface)(() => __webpack_require__.e(/*! import() | admin-chunk-refund-dialog */ "admin-chunk-refund-dialog").then(__webpack_require__.bind(__webpack_require__, /*! ./RefundDialog.jsx */ "./assets/src/admin/routes/RefundDialog.jsx")), {
  pick: 'RefundDialog',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Loading refund form…', 'aponto')
});

// R1 — the booking DTOs carry `location_id` only (no name), so resolve names via
// one session-cached catalog fetch shared by every editor open (never per-booking).
let locationNamesPromise = null;
function loadLocationNames() {
  if (!locationNamesPromise) {
    locationNamesPromise = _lib_api_js__WEBPACK_IMPORTED_MODULE_3__.api.get('/locations', {
      status: 'all',
      per_page: 100
    }).then(res => {
      const map = {};
      (res.items || []).forEach(item => {
        map[item.id] = item.name;
      });
      return map;
    }).catch(() => {
      locationNamesPromise = null;
      return {};
    });
  }
  return locationNamesPromise;
}
const LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show'
};
// Mirrors BookingStatusService::ALLOWED. `no_show` is terminal apart from the undo back to
// confirmed (a relabel — the server runs no availability recheck, D-R33), and `pending →
// no_show` is absent on purpose: an unconfirmed request is cancelled, not marked absent.
const TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: ['pending'],
  no_show: ['confirmed']
};
const TZ = _lib_config_js__WEBPACK_IMPORTED_MODULE_4__.config.business.timezone;
function nextStatuses(status) {
  return TRANSITIONS[status] || [];
}
function Readonly({
  label,
  value,
  hint
}) {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
    className: "pd-editor-readonly",
    title: hint || undefined,
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
      className: "pd-editor-readonly-label",
      children: label
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("strong", {
      children: value
    })]
  });
}

/**
 * `Notify customer` on its own row, directly above the commit buttons (founder
 * decision 2026-07-25 — D1 of the spacing audit). The mockup hides its notify
 * toggle until a status transition is pending, so its inspector footer is a
 * single 62px button row; production shows the choice on every commit, and
 * sharing that row left the label zero slack at the 344px panel minimum (it
 * ellipsised). Own row → the button row stays byte-for-byte the mockup's footer
 * and the full label always fits. Rendered as a sibling band above
 * `.pd-booking-inspector-foot`, not inside it, so the button row keeps its 62px
 * height (styling: admin-extra.css `.ap-inspector-notify-row`). The cancel /
 * force-complete confirmations keep the mockup's own stacked
 * `.pd-drawer-confirm-foot`, which already gives the toggle its own line.
 */
function NotifyRow({
  checked,
  onChange,
  label = 'Notify customer'
}) {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("div", {
    className: "ap-inspector-notify-row",
    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("label", {
      className: "pd-notify-toggle",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("input", {
        className: "pd-table-checkbox",
        type: "checkbox",
        checked: checked,
        onChange: e => onChange(e.target.checked)
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
        children: label
      })]
    })
  });
}

/**
 * R2 — footer overflow `…` menu. A thin binding over the kit's headless
 * `createMenu` (same primitive as RowMenu): the kit owns the full keyboard
 * contract — Arrow roving, Home/End, Escape-close with focus returned to the
 * trigger, outside-pointerdown dismiss, semantic aria wiring — so none of that
 * is re-implemented here.
 */
function InspectorMoreMenu({
  cancellable,
  onCancel
}) {
  const rootRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  const handlerRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(onCancel);
  handlerRef.current = onCancel;
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!rootRef.current) {
      return undefined;
    }
    const controller = (0,_pressmaximum_dashboard_kit_primitives__WEBPACK_IMPORTED_MODULE_1__.createMenu)(rootRef.current, {
      onSelect: item => {
        if (item.getAttribute('data-action') === 'cancel') {
          handlerRef.current?.();
        }
      }
    });
    return () => controller.destroy();
  }, []);
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
    className: "pd-inspector-more-menu",
    ref: rootRef,
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("button", {
      className: "pd-button sm icon-only",
      type: "button",
      "data-menu-trigger": true,
      "aria-haspopup": "menu",
      "aria-expanded": "false",
      "aria-label": "More appointment actions",
      title: "More appointment actions",
      children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_8__.renderIcon)('more')
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("div", {
      role: "menu",
      "aria-label": "More appointment actions",
      hidden: true,
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("button", {
        type: "button",
        role: "menuitem",
        "data-action": "cancel",
        disabled: !cancellable,
        children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_8__.renderIcon)('prohibit'), "Cancel booking"]
      })
    })]
  });
}
function BookingEditor({
  mode,
  bookingId,
  row = null,
  initialAction = null,
  prefill = null,
  onClose,
  onChanged
}) {
  const showToast = (0,_lib_toast_jsx__WEBPACK_IMPORTED_MODULE_10__.useToast)();
  const creating = mode === 'create';
  const [loading, setLoading] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(!creating);
  const [error, setError] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [saving, setSaving] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [detail, setDetail] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null);

  // Edit-mode form state.
  const [status, setStatus] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)('');
  const [notify, setNotify] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(true);
  const [internalNote, setInternalNote] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)('');
  const [confirm, setConfirm] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null); // 'cancel' | 'complete' | 'no-show'
  const [forceReason, setForceReason] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)('');
  const [reschedule, setReschedule] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(initialAction === 'reschedule');
  const [locationName, setLocationName] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)('');
  const [refundOpen, setRefundOpen] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [refunding, setRefunding] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  // SESSION module records, not the boot snapshot: a gateway switched off from the Modules screen
  // moments ago must take its Refund action away NOW. Reading `config.modules` here left the
  // button on screen until a full document reload, one click away from a `409
  // aponto_payment_unavailable` — the same lifetime bug `modules/module-state.js` was written for.
  const modules = (0,_modules_module_state_js__WEBPACK_IMPORTED_MODULE_14__.useModules)();

  // Create-mode form state.
  const [catalog, setCatalog] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)({
    services: [],
    staff: [],
    customers: []
  });
  const [addNew, setAddNew] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [customer, setCustomer] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [newCustomer, setNewCustomer] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)({
    name: '',
    email: '',
    phone: ''
  });
  const [service, setService] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [staff, setStaff] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [createStatus, setCreateStatus] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(_lib_config_js__WEBPACK_IMPORTED_MODULE_4__.config.settings.defaultBookingStatus || 'pending');

  // Shared schedule state (create + reschedule share the availability picker).
  // A calendar free-slot click prefills the create date + preferred start; the
  // preferred slot is only kept once availability confirms it exists.
  const [date, setDate] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(creating && prefill?.date || _lib_config_js__WEBPACK_IMPORTED_MODULE_4__.config.business.today);
  const [slots, setSlots] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)([]);
  const [slotsLoading, setSlotsLoading] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [selectedSlot, setSelectedSlot] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(creating && prefill?.startUtc || '');
  const closeRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);

  // Load edit detail. `reloadDetail` is the same fetch WITHOUT the initial-action side effect and
  // without the loading curtain: a refund has to re-read the order (its status, its transactions
  // and what is left to refund all move at once), and re-mounting the whole editor to do that
  // would throw away the status/internal-note edits sitting in the form.
  const reloadDetail = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
    if (creating || !bookingId) {
      return Promise.resolve();
    }
    return _lib_api_js__WEBPACK_IMPORTED_MODULE_3__.api.get(`/bookings/${bookingId}`).then(res => setDetail((0,_lib_booking_adapter_js__WEBPACK_IMPORTED_MODULE_6__.bookingDetailToEditor)(res))).catch(() => {});
  }, [creating, bookingId]);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (creating || !bookingId) {
      return;
    }
    let live = true;
    setLoading(true);
    _lib_api_js__WEBPACK_IMPORTED_MODULE_3__.api.get(`/bookings/${bookingId}`).then(res => {
      if (!live) {
        return;
      }
      const model = (0,_lib_booking_adapter_js__WEBPACK_IMPORTED_MODULE_6__.bookingDetailToEditor)(res);
      setDetail(model);
      setStatus(model.status);
      setInternalNote(model.internalNote);
      setDate(model.date);
      setLoading(false);
      if (initialAction === 'cancel') {
        setConfirm('cancel');
      }
    }).catch(err => {
      if (live) {
        setError(err.message);
        setLoading(false);
      }
    });
    return () => {
      live = false;
    };
  }, [creating, bookingId, initialAction]);

  // R1 — resolve the real location name for the read-only row (edit mode only;
  // one cached catalog fetch per session, nothing per-booking).
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (creating || !detail?.locationId) {
      return undefined;
    }
    let live = true;
    loadLocationNames().then(map => {
      if (live) setLocationName(map[detail.locationId] || '');
    });
    return () => {
      live = false;
    };
  }, [creating, detail]);

  // Load create catalogs.
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!creating) {
      return;
    }
    Promise.all([_lib_api_js__WEBPACK_IMPORTED_MODULE_3__.api.get('/services', {
      status: 'active',
      per_page: 100
    }).catch(() => ({
      items: []
    })), _lib_api_js__WEBPACK_IMPORTED_MODULE_3__.api.get('/staff', {
      status: 'active',
      per_page: 100
    }).catch(() => ({
      items: []
    })), _lib_api_js__WEBPACK_IMPORTED_MODULE_3__.api.get('/customers', {
      per_page: 100
    }).catch(() => ({
      items: []
    }))]).then(([svc, stf, cust]) => {
      // Option identity is the record id, never the name (`combobox-options.js`):
      // same-named services/staff/customers must stay distinct rows so the
      // service_id/staff_id submitted below is the record the user clicked.
      const staffCatalog = (0,_lib_combobox_options_js__WEBPACK_IMPORTED_MODULE_12__.staffOptions)(stf.items);
      setCatalog({
        services: (0,_lib_combobox_options_js__WEBPACK_IMPORTED_MODULE_12__.serviceOptions)(svc.items),
        staff: staffCatalog,
        customers: (0,_lib_combobox_options_js__WEBPACK_IMPORTED_MODULE_12__.customerOptions)(cust.items)
      });

      // Calendar hand-off (D-R28, Codex review): a free slot clicked on ONE staff member's
      // calendar was clicked against THEIR hours, so preselect them instead of letting the
      // create fall through to any-staff availability and land the booking on somebody else.
      // A prefilled id the catalog does not carry (e.g. an archived member) selects nothing —
      // better an empty field than a record the admin cannot actually pick.
      const preselected = (0,_lib_combobox_options_js__WEBPACK_IMPORTED_MODULE_12__.findOptionById)(staffCatalog, prefill?.staffId);
      if (preselected) {
        setStaff(preselected);
      }
    });
    // `prefill` is fixed for the life of a create editor (it is read once from the pending-create
    // hand-off when the drawer opens), so it is deliberately not a dependency: re-running this
    // would re-fetch all three catalogs and stamp the staff field back over an admin's own change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creating]);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    closeRef.current?.focus({
      preventScroll: true
    });
  }, []);

  // Availability for create + reschedule. Uses the real engine (public availability).
  const activeServiceId = creating ? service?.id : detail?.serviceId;
  const activeStaffId = creating ? staff?.id : detail?.staffId;
  const durationMinutes = creating ? service?.duration || _lib_config_js__WEBPACK_IMPORTED_MODULE_4__.config.settings.slotStep : detail ? Math.round((new Date(detail.endUtc) - new Date(detail.startUtc)) / 60000) : _lib_config_js__WEBPACK_IMPORTED_MODULE_4__.config.settings.slotStep;
  const loadSlots = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
    if (!activeServiceId || !date) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    _lib_api_js__WEBPACK_IMPORTED_MODULE_3__.api.get('/public/availability', {
      service_id: activeServiceId,
      staff_id: activeStaffId || undefined,
      from_date: date,
      to_date: date,
      tz: TZ
    }).then(res => {
      const list = (res.slots || []).map(s => ({
        startUtc: s.start_utc,
        label: (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_5__.timeLabel)(s.start_utc, TZ)
      }));
      // Reschedule: keep the current start selectable even though it is "occupied".
      if (!creating && detail && !list.some(s => s.startUtc === detail.startUtc)) {
        list.unshift({
          startUtc: detail.startUtc,
          label: `${(0,_lib_format_js__WEBPACK_IMPORTED_MODULE_5__.timeLabel)(detail.startUtc, TZ)} (current)`
        });
      }
      setSlots(list);
      setSelectedSlot(prev => list.some(s => s.startUtc === prev) ? prev : list[0]?.startUtc || '');
      setSlotsLoading(false);
    }).catch(() => {
      setSlots([]);
      setSlotsLoading(false);
    });
  }, [activeServiceId, activeStaffId, date, creating, detail]);
  const wantSlots = creating || reschedule;
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (wantSlots) {
      loadSlots();
    }
  }, [wantSlots, loadSlots]);
  const derivedEnd = (() => {
    if (!selectedSlot) {
      return '';
    }
    const end = new Date(new Date(selectedSlot).getTime() + durationMinutes * 60000).toISOString();
    return `${(0,_lib_format_js__WEBPACK_IMPORTED_MODULE_5__.timeLabel)(selectedSlot, TZ)} – ${(0,_lib_format_js__WEBPACK_IMPORTED_MODULE_5__.timeLabel)(end, TZ)}`;
  })();

  // ---- Actions -----------------------------------------------------------
  const submitCreate = async () => {
    const chosen = addNew ? newCustomer : customer ? {
      name: customer.name,
      email: customer.email,
      phone: customer.phone
    } : null;
    if (!chosen || !chosen.name || !chosen.email) {
      showToast('A customer name and email are required.', 'danger');
      return;
    }
    if (!service?.id) {
      showToast('Choose a service.', 'danger');
      return;
    }
    if (!selectedSlot) {
      showToast('Choose an available start time.', 'danger');
      return;
    }
    setSaving(true);
    try {
      const body = {
        service_id: service.id,
        start_utc: selectedSlot,
        customer: {
          name: chosen.name,
          email: chosen.email,
          phone: chosen.phone || ''
        },
        tz: TZ,
        status: createStatus,
        notify
      };
      if (staff?.id) {
        body.staff_id = staff.id;
      }
      const res = await _lib_api_js__WEBPACK_IMPORTED_MODULE_3__.api.post('/bookings', body);
      showToast(`Booking created for ${chosen.name} · ${res.booking?.order?.code || ''}`.trim());
      onChanged?.();
      onClose?.();
    } catch (err) {
      showToast(err.message, 'danger');
      setSaving(false);
    }
  };
  const saveEdit = async () => {
    if (!detail) {
      return;
    }
    const statusChanged = status !== detail.status;
    const noteChanged = internalNote !== detail.internalNote;
    // Complete-before-end requires a forced confirmation + reason (into Activity).
    if (statusChanged && status === 'completed' && Date.now() < new Date(detail.endUtc).getTime() && confirm !== 'complete') {
      setConfirm('complete');
      return;
    }
    // No-show-before-start is the same forceable server rule keyed on start_utc (D-R33), so it
    // gets the same reason dialog. This is the ONLY route to an early no-show: the list's row
    // action and inline picker both hide the option until the appointment has started.
    if (statusChanged && status === 'no_show' && Date.now() < new Date(detail.startUtc).getTime() && confirm !== 'no-show') {
      setConfirm('no-show');
      return;
    }
    if (!statusChanged && !noteChanged) {
      showToast('No changes to save.');
      return;
    }
    setSaving(true);
    try {
      const body = {};
      if (statusChanged) {
        body.status = status;
        body.notify = notify;
        if (status === 'completed' && confirm === 'complete' || status === 'no_show' && confirm === 'no-show') {
          body.force = true;
          body.reason = forceReason;
        }
      }
      if (noteChanged) {
        body.internal_note = internalNote;
      }
      const res = await _lib_api_js__WEBPACK_IMPORTED_MODULE_3__.api.patch(`/bookings/${detail.id}`, body);
      showToast(statusChanged ? `Marked ${(LABELS[status] || status).toLowerCase()}.${(0,_lib_notification_outcome_js__WEBPACK_IMPORTED_MODULE_9__.notifiedSuffix)(res?.notification)}` : 'Internal note saved.');
      onChanged?.();
      onClose?.();
    } catch (err) {
      showToast(err.message, 'danger');
      setSaving(false);
      setConfirm(null);
    }
  };
  const doCancel = async () => {
    setSaving(true);
    try {
      const res = await _lib_api_js__WEBPACK_IMPORTED_MODULE_3__.api.patch(`/bookings/${detail.id}`, {
        status: 'cancelled',
        notify
      });
      showToast(`Booking cancelled.${(0,_lib_notification_outcome_js__WEBPACK_IMPORTED_MODULE_9__.notifiedSuffix)(res?.notification)}`);
      onChanged?.();
      onClose?.();
    } catch (err) {
      showToast(err.message, 'danger');
      setSaving(false);
    }
  };
  const doReschedule = async () => {
    if (!selectedSlot) {
      return;
    }
    setSaving(true);
    try {
      await _lib_api_js__WEBPACK_IMPORTED_MODULE_3__.api.put(`/bookings/${detail.id}/reschedule`, {
        start_utc: selectedSlot,
        staff_id: detail.staffId
      });
      showToast('Booking rescheduled. Customer notified.');
      onChanged?.();
      onClose?.();
    } catch (err) {
      showToast(err.message, 'danger');
      setSaving(false);
    }
  };
  const togglePaid = async () => {
    const nextPaid = detail.order.paymentStatus !== 'paid';
    try {
      await _lib_api_js__WEBPACK_IMPORTED_MODULE_3__.api.patch(`/bookings/${detail.id}`, {
        payment_status: nextPaid ? 'paid' : 'none'
      });
      // Re-read rather than patching the local copy: a manual `paid` also RELEASES a live hold
      // server-side (D-R38i), so the order that comes back can differ from the one this branch
      // would have written by hand.
      await reloadDetail();
      showToast(nextPaid ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Marked as paid.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Marked unpaid.', 'aponto'));
      onChanged?.();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };
  const doRefund = async ({
    amountMinor,
    reason
  }) => {
    setRefunding(true);
    try {
      const res = await _lib_api_js__WEBPACK_IMPORTED_MODULE_3__.api.post(`/bookings/${detail.id}/refund`, {
        amount_minor: amountMinor,
        reason
      });
      const txn = res?.transaction || {};
      // A `pending` refund has moved NO money yet (D-R38a(6)) — it only reserves the amount — so
      // the toast must not say the customer has been refunded.
      showToast('pending' === txn.status ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Refund requested — the gateway is still processing it.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.sprintf)(/* translators: %s: refunded amount, already formatted as money. */
      (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Refunded %s.', 'aponto'), (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_5__.money)(txn.amount_minor || amountMinor, txn.currency || detail.order.currency, detail.order.currencyExponent)));
      setRefundOpen(false);
      await reloadDetail();
      onChanged?.();
    } catch (err) {
      showToast(refundErrorMessage(err, detail.order.gateway), 'danger');
    } finally {
      setRefunding(false);
    }
  };

  // ---- Render ------------------------------------------------------------
  const header = title => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("header", {
    className: "pd-booking-inspector-head pd-booking-editor-head",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("div", {
      className: "pd-booking-inspector-identity",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("h2", {
        id: "bookingInspectorTitle",
        children: title
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("button", {
      className: "pd-icon-button",
      type: "button",
      ref: closeRef,
      "aria-label": "Close booking editor",
      onClick: onClose,
      children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_8__.renderIcon)('close')
    })]
  });
  if (loading) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.Fragment, {
      children: [header('Booking'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("div", {
        className: "pd-booking-inspector-body",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("p", {
          className: "pd-editor-note",
          children: "Loading\u2026"
        })
      })]
    });
  }
  if (error) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.Fragment, {
      children: [header('Booking'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("div", {
        className: "pd-booking-inspector-body",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("p", {
          className: "pd-editor-note",
          children: error
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("footer", {
        className: "pd-drawer-foot pd-booking-inspector-foot",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("button", {
          className: "pd-button sm",
          type: "button",
          onClick: onClose,
          children: "Close"
        })
      })]
    });
  }

  // Reschedule sub-flow (edit).
  if (!creating && reschedule) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.Fragment, {
      children: [header('Edit time'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("form", {
        className: "pd-booking-inspector-body pd-compact-editor",
        autoComplete: "off",
        onSubmit: e => e.preventDefault(),
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("section", {
          className: "pd-editor-section",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("div", {
            className: "pd-editor-section-head",
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("h3", {
              children: "Reschedule"
            })
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(Readonly, {
            label: "Service",
            value: row?.service || `Service #${detail.serviceId}`,
            hint: "Cancel & rebook to change the service"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("label", {
            className: "pd-compact-field is-filled",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("input", {
              type: "date",
              name: "date",
              value: date,
              min: _lib_config_js__WEBPACK_IMPORTED_MODULE_4__.config.business.today,
              onChange: e => setDate(e.target.value),
              required: true
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
              className: "pd-compact-label",
              children: "Date"
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(SlotSelect, {
            slots: slots,
            loading: slotsLoading,
            value: selectedSlot,
            onChange: setSelectedSlot
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(Readonly, {
            label: "Ends",
            value: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
              className: "pd-ltr",
              children: derivedEnd || '—'
            })
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("p", {
            className: "pd-editor-note",
            children: _lib_config_js__WEBPACK_IMPORTED_MODULE_4__.businessTimeLine
          })]
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("footer", {
        className: "pd-drawer-foot pd-booking-inspector-foot",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("button", {
          className: "pd-button sm",
          type: "button",
          onClick: () => setReschedule(false),
          children: "Cancel"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("button", {
          className: "pd-button primary sm",
          type: "button",
          disabled: !selectedSlot || saving,
          onClick: doReschedule,
          children: saving ? 'Saving…' : 'Confirm new time'
        })]
      })]
    });
  }
  if (creating) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.Fragment, {
      children: [header('New booking'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("form", {
        className: "pd-booking-inspector-body pd-compact-editor",
        autoComplete: "off",
        onSubmit: e => e.preventDefault(),
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("section", {
          className: "pd-editor-section",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
            className: "pd-editor-section-head",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("h3", {
              children: "Customer"
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("button", {
              type: "button",
              className: "pd-section-action",
              onClick: () => setAddNew(v => !v),
              children: addNew ? 'Use existing' : 'Add new'
            })]
          }), addNew ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
            className: "pd-editor-alternate-fields",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("label", {
              className: "pd-compact-field",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("input", {
                name: "customer",
                value: newCustomer.name,
                placeholder: " ",
                required: true,
                onChange: e => setNewCustomer(c => ({
                  ...c,
                  name: e.target.value
                }))
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
                className: "pd-compact-label",
                children: "Full name"
              })]
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
              className: "pd-field-grid",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("label", {
                className: "pd-compact-field",
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("input", {
                  type: "email",
                  name: "email",
                  value: newCustomer.email,
                  placeholder: " ",
                  onChange: e => setNewCustomer(c => ({
                    ...c,
                    email: e.target.value
                  }))
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
                  className: "pd-compact-label",
                  children: "Email"
                })]
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("label", {
                className: "pd-compact-field",
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("input", {
                  className: "pd-ltr",
                  name: "phone",
                  value: newCustomer.phone,
                  placeholder: " ",
                  onChange: e => setNewCustomer(c => ({
                    ...c,
                    phone: e.target.value
                  }))
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
                  className: "pd-compact-label",
                  children: "Phone"
                })]
              })]
            })]
          }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_lib_Combobox_jsx__WEBPACK_IMPORTED_MODULE_11__.Combobox, {
            name: "customer",
            label: "Search customer",
            selected: customer,
            entity: true,
            options: catalog.customers,
            onSelect: setCustomer
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("section", {
          className: "pd-editor-section",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("div", {
            className: "pd-editor-section-head",
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("h3", {
              children: "Services & items"
            })
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("p", {
            className: "pd-editor-note",
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Products & extras arrive with the Premium extras module.', 'aponto')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_lib_Combobox_jsx__WEBPACK_IMPORTED_MODULE_11__.Combobox, {
            name: "service",
            label: "Service",
            selected: service,
            options: catalog.services,
            onSelect: setService
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("section", {
          className: "pd-editor-section",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("div", {
            className: "pd-editor-section-head",
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("h3", {
              children: "Schedule"
            })
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
            className: "pd-field-grid",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("label", {
              className: "pd-compact-field is-filled",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("input", {
                type: "date",
                name: "date",
                value: date,
                min: _lib_config_js__WEBPACK_IMPORTED_MODULE_4__.config.business.today,
                onChange: e => setDate(e.target.value),
                required: true
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
                className: "pd-compact-label",
                children: "Date"
              })]
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("label", {
              className: "pd-compact-field pd-compact-select is-filled",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("select", {
                name: "status",
                value: createStatus,
                onChange: e => setCreateStatus(e.target.value),
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("option", {
                  value: "pending",
                  children: "Pending"
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("option", {
                  value: "confirmed",
                  children: "Confirmed"
                })]
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
                className: "pd-compact-label",
                children: "Status"
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
                className: "pd-field-end-icon",
                "aria-hidden": "true",
                children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_8__.renderIcon)('chevronDown')
              })]
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(SlotSelect, {
            slots: slots,
            loading: slotsLoading,
            value: selectedSlot,
            onChange: setSelectedSlot,
            disabled: !service,
            emptyLabel: service ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('No available times', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Pick a service to see times', 'aponto')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(Readonly, {
            label: "Ends",
            value: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
              className: "pd-ltr",
              children: derivedEnd || 'Select a start time'
            })
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("p", {
            className: "pd-editor-note",
            children: _lib_config_js__WEBPACK_IMPORTED_MODULE_4__.businessTimeLine
          }), catalog.staff.length > 1 ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_lib_Combobox_jsx__WEBPACK_IMPORTED_MODULE_11__.Combobox, {
            name: "staff",
            label: "Staff",
            selected: staff,
            options: catalog.staff,
            onSelect: setStaff,
            required: false
          }) : null]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("section", {
          className: "pd-editor-section",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("div", {
            className: "pd-editor-section-head",
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("h3", {
              children: "Internal notes"
            })
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("label", {
            className: "pd-compact-field pd-compact-notes",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("textarea", {
              name: "note",
              rows: "3",
              placeholder: " ",
              value: internalNote,
              onChange: e => setInternalNote(e.target.value)
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
              className: "pd-compact-label",
              children: "Visible to staff only"
            })]
          })]
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(NotifyRow, {
        checked: notify,
        onChange: setNotify
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("footer", {
        className: "pd-drawer-foot pd-booking-inspector-foot",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("button", {
          className: "pd-button sm",
          type: "button",
          onClick: onClose,
          children: "Cancel"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("button", {
          className: "pd-button primary sm",
          type: "button",
          disabled: saving,
          onClick: submitCreate,
          children: saving ? 'Saving…' : 'Create booking'
        })]
      })]
    });
  }

  // ---- Edit mode ---------------------------------------------------------
  const d = detail;
  const total = d.order.totalMinor;
  const tzDiffers = d.customerTimezone && d.customerTimezone !== TZ;
  const statusOptions = [...new Set([d.status, ...nextStatuses(d.status).filter(s => s !== 'cancelled')])];
  // R1 — read-only Staff + Location rows (V1). Staff name comes from the booking
  // row DTO; the location NAME resolves from the cached locations catalog when a
  // real location is set, and `location_id = 0` reads "No location · <business
  // address>" (the wildcard: the booking runs at the business address).
  const staffValue = (0,_lib_editor_rows_js__WEBPACK_IMPORTED_MODULE_7__.staffRowValue)(row);
  const locationValue = (0,_lib_editor_rows_js__WEBPACK_IMPORTED_MODULE_7__.locationRowValue)({
    locationId: d.locationId,
    locationName,
    rowLocation: row?.location,
    businessAddress: _lib_config_js__WEBPACK_IMPORTED_MODULE_4__.config.business.address
  });

  // ---- Order / payment presentation (D-R38) ------------------------------
  const transactions = d.order.transactions || [];
  const payment = (0,_lib_payment_status_js__WEBPACK_IMPORTED_MODULE_15__.paymentBadge)(d.order.paymentStatus, {
    holdExpiresAt: d.order.holdExpiresAt,
    // Business time, like every other instant in this editor (§5 invariant 6): a hold deadline
    // rendered in the viewer's own zone reads differently for the owner and their agency.
    formatTime: utc => (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_5__.timeLabel)(utc, TZ)
  });
  // The manual switch survives only where the server still accepts it: an order NO gateway has
  // touched. `transactions.length === 0` is the client mirror of `hasAnyCharge()` — a refund row
  // cannot exist without the charge it refunds.
  const manualAllowed = ('none' === d.order.paymentStatus || 'paid' === d.order.paymentStatus) && 0 === transactions.length;
  // Refunding needs the gateway module to be ACTIVE, not merely to have been used: disabling a
  // module retains its data and takes its actions away (D-R31 / `409 aponto_payment_unavailable`).
  const gatewayLive = !!d.order.gateway && (0,_modules_catalog_js__WEBPACK_IMPORTED_MODULE_13__.moduleAvailable)({
    modules
  }, d.order.gateway);
  const refundable = ('paid' === d.order.paymentStatus || 'partial' === d.order.paymentStatus) && gatewayLive;
  const gatewayMissing = !!d.order.gateway && !gatewayLive && ('paid' === d.order.paymentStatus || 'partial' === d.order.paymentStatus);
  const refundBlocked = d.order.refundableMinor < 1 || d.order.refundPending;
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.Fragment, {
    children: [header('Edit booking'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("form", {
      className: "pd-booking-inspector-body pd-compact-editor",
      autoComplete: "off",
      onSubmit: e => e.preventDefault(),
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("section", {
        className: "pd-editor-section",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("div", {
          className: "pd-editor-section-head",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("h3", {
            children: "Customer"
          })
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(Readonly, {
          label: "Customer",
          value: row?.customer || `Customer #${d.customerId}`,
          hint: "Cancel & rebook to change the customer"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(Readonly, {
          label: "Contact",
          value: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
            className: "pd-ltr",
            children: `${row?.email || 'No email'} · ${row?.phone || 'No phone'}`
          })
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("section", {
        className: "pd-editor-section",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("div", {
          className: "pd-editor-section-head",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("h3", {
            children: "Services & items"
          })
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(Readonly, {
          label: "Service",
          value: `${row?.service || 'Service'} · ${(0,_lib_format_js__WEBPACK_IMPORTED_MODULE_5__.money)(total, d.order.currency, d.order.currencyExponent)}`,
          hint: "Cancel & rebook to change the service"
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("section", {
        className: "pd-editor-section",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
          className: "pd-editor-section-head",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("h3", {
            children: "Schedule"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("button", {
            type: "button",
            className: "pd-section-action",
            onClick: () => {
              setReschedule(true);
              setSelectedSlot(d.startUtc);
            },
            children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_8__.renderIcon)('calendar'), "Edit time"]
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(Readonly, {
          label: "Date & time",
          value: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("span", {
            className: "pd-ltr",
            children: [d.dateLabel, " \xB7 ", d.start, "\u2013", d.end]
          })
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("p", {
          className: "pd-editor-note",
          children: [_lib_config_js__WEBPACK_IMPORTED_MODULE_4__.businessTimeLine, tzDiffers ? ` · Customer time ${d.timezone}` : '']
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(Readonly, {
          label: "Staff",
          value: staffValue
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(Readonly, {
          label: "Location",
          value: locationValue
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("label", {
          className: "pd-compact-field pd-compact-select is-filled",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("select", {
            name: "status",
            value: status,
            onChange: e => setStatus(e.target.value),
            children: statusOptions.map(s => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("option", {
              value: s,
              children: d.status === 'cancelled' && s === 'pending' ? 'Pending (restore)' : d.status === 'no_show' && s === 'confirmed' ? 'Confirmed (undo no-show)' : LABELS[s]
            }, s))
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
            className: "pd-compact-label",
            children: "Status"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
            className: "pd-field-end-icon",
            "aria-hidden": "true",
            children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_8__.renderIcon)('chevronDown')
          })]
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("section", {
        className: "pd-editor-section",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
          className: "pd-editor-section-head",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("h3", {
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Order', 'aponto')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
            className: `pd-status ap-pay-${payment.tone}`,
            title: payment.title,
            children: payment.label
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(Readonly, {
          label: "Order",
          value: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
            className: "pd-ltr",
            children: d.order.code || '—'
          })
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("dl", {
          className: "pd-value-summary",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("dt", {
              children: row?.service || 'Service'
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("dd", {
              children: (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_5__.money)(total, d.order.currency, d.order.currencyExponent)
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("dt", {
              children: "Products & extras"
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("dd", {
              children: (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_5__.money)(0, d.order.currency, d.order.currencyExponent)
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
            className: "is-total",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("dt", {
              children: "Total"
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("dd", {
              children: (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_5__.money)(total, d.order.currency, d.order.currencyExponent)
            })]
          })]
        }), d.order.gateway ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(Readonly, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Payment method', 'aponto'),
          value: (0,_lib_payment_status_js__WEBPACK_IMPORTED_MODULE_15__.gatewayLabel)(d.order.gateway)
        }) : null, transactions.length ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(TransactionList, {
          transactions: transactions,
          currencyExponent: d.order.currencyExponent
        }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
          className: "ap-order-actions",
          children: [manualAllowed ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("button", {
            className: "pd-button sm",
            type: "button",
            onClick: togglePaid,
            children: d.order.paymentStatus === 'paid' ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Mark unpaid', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Mark as paid', 'aponto')
          }) : null, refundable ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("button", {
            className: "pd-button sm",
            type: "button",
            disabled: refundBlocked,
            onClick: () => setRefundOpen(true),
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Refund', 'aponto')
          }) : null]
        }), !manualAllowed ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("p", {
          className: "pd-editor-note",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.sprintf)(/* translators: %s: payment gateway name, e.g. "Stripe". */
          (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Managed by %s.', 'aponto'), '—' === (0,_lib_payment_status_js__WEBPACK_IMPORTED_MODULE_15__.gatewayLabel)(d.order.gateway) ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('the payment gateway', 'aponto') : (0,_lib_payment_status_js__WEBPACK_IMPORTED_MODULE_15__.gatewayLabel)(d.order.gateway))
        }) : null, refundable && d.order.refundPending ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("p", {
          className: "pd-editor-note",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('A refund is already in progress at the gateway.', 'aponto')
        }) : null, gatewayMissing ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("p", {
          className: "pd-editor-note",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.sprintf)(/* translators: %s: payment gateway name, e.g. "Stripe". */
          (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Enable the %s module to refund this payment.', 'aponto'), (0,_lib_payment_status_js__WEBPACK_IMPORTED_MODULE_15__.gatewayLabel)(d.order.gateway))
        }) : null]
      }), (d.customFields || []).length ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("section", {
        className: "pd-editor-section",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("div", {
          className: "pd-editor-section-head",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("h3", {
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Booking form answers', 'aponto')
          })
        }), (d.customFields || []).map(f => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(Readonly, {
          label: f.label,
          value: f.value
        }, f.slug))]
      }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("section", {
        className: "pd-editor-section",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("div", {
          className: "pd-editor-section-head",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("h3", {
            children: "Internal notes"
          })
        }), d.customerNote ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(Readonly, {
          label: "Customer note",
          value: d.customerNote
        }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("label", {
          className: "pd-compact-field pd-compact-notes",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("textarea", {
            name: "note",
            rows: "3",
            placeholder: " ",
            value: internalNote,
            onChange: e => setInternalNote(e.target.value)
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
            className: "pd-compact-label",
            children: "Visible to staff only"
          })]
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("details", {
        className: "pd-booking-inspector-disclosure pd-editor-activity",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("summary", {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("span", {
            children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_8__.renderIcon)('clock'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("strong", {
              children: "Activity"
            })]
          }), (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_8__.renderIcon)('chevronDown')]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("div", {
          className: "pd-booking-inspector-disclosure-body",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("div", {
            className: "pd-inspector-activity",
            children: d.activities.length ? d.activities.map(a => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {}), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("p", {
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("strong", {
                  children: actionLabel(a.action)
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("small", {
                  children: [a.initiatedBy, " \xB7 ", a.createdAt ? (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_5__.dateTimeLabel)(a.createdAt) : '']
                })]
              })]
            }, a.id)) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("p", {
              className: "pd-editor-note",
              children: "No activity recorded."
            })
          })
        })]
      })]
    }), refundOpen ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(RefundDialog, {
      order: d.order,
      busy: refunding,
      onCancel: () => setRefundOpen(false),
      onConfirm: doRefund
    }) : null, confirm === 'cancel' ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("footer", {
      className: "pd-drawer-foot pd-drawer-confirm-foot",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
        className: "pd-drawer-confirm-copy",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("p", {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("strong", {
            children: "Cancel booking?"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
            children: "The slot will be released."
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("label", {
          className: "pd-notify-toggle",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("input", {
            className: "pd-table-checkbox",
            type: "checkbox",
            checked: notify,
            onChange: e => setNotify(e.target.checked)
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
            children: "Notify customer of cancellation"
          })]
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
        className: "pd-drawer-confirm-actions",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("button", {
          className: "pd-button sm",
          type: "button",
          onClick: () => setConfirm(null),
          children: "Keep"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("button", {
          className: "pd-button sm danger",
          type: "button",
          disabled: saving,
          onClick: doCancel,
          children: "Cancel booking"
        })]
      })]
    }) : confirm === 'complete' ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("footer", {
      className: "pd-drawer-foot pd-drawer-confirm-foot",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
        className: "pd-drawer-confirm-copy",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("p", {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("strong", {
            children: "Complete before the end time?"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
            children: "This appointment has not finished yet."
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("label", {
          className: "pd-compact-field is-filled pd-force-reason",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("input", {
            value: forceReason,
            placeholder: " ",
            required: true,
            onChange: e => setForceReason(e.target.value)
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
            className: "pd-compact-label",
            children: "Reason (recorded in activity)"
          })]
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
        className: "pd-drawer-confirm-actions",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("button", {
          className: "pd-button sm",
          type: "button",
          onClick: () => {
            setConfirm(null);
            setStatus(d.status);
          },
          children: "Keep confirmed"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("button", {
          className: "pd-button sm primary",
          type: "button",
          disabled: saving || !forceReason,
          onClick: saveEdit,
          children: "Complete anyway"
        })]
      })]
    }) : confirm === 'no-show' ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("footer", {
      className: "pd-drawer-foot pd-drawer-confirm-foot",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
        className: "pd-drawer-confirm-copy",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("p", {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("strong", {
            children: "Mark as no-show before the start time?"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
            children: "This appointment has not started yet."
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("label", {
          className: "pd-compact-field is-filled pd-force-reason",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("input", {
            value: forceReason,
            placeholder: " ",
            required: true,
            onChange: e => setForceReason(e.target.value)
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
            className: "pd-compact-label",
            children: "Reason (recorded in activity)"
          })]
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
        className: "pd-drawer-confirm-actions",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("button", {
          className: "pd-button sm",
          type: "button",
          onClick: () => {
            setConfirm(null);
            setStatus(d.status);
          },
          children: "Keep confirmed"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("button", {
          className: "pd-button sm primary",
          type: "button",
          disabled: saving || !forceReason,
          onClick: saveEdit,
          children: "Mark anyway"
        })]
      })]
    }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.Fragment, {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(NotifyRow, {
        checked: notify,
        onChange: setNotify
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("footer", {
        className: "pd-drawer-foot pd-booking-inspector-foot",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
          className: "pd-inspector-foot-actions",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(InspectorMoreMenu, {
            cancellable: nextStatuses(d.status).includes('cancelled'),
            onCancel: () => setConfirm('cancel')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("button", {
            className: "pd-button primary sm",
            type: "button",
            disabled: saving,
            onClick: saveEdit,
            children: saving ? 'Saving…' : 'Save changes'
          })]
        })
      })]
    })]
  });
}

/**
 * The start-time picker. `emptyLabel` exists because "No available times" is a FINDING — the
 * engine looked and there is nothing free — and the create panel showed it before a service was
 * even picked, when the engine had not been asked anything (beta QA 2026-08-01). A state that
 * has not been evaluated yet must say what it is waiting for instead.
 */
function SlotSelect({
  slots,
  loading,
  value,
  onChange,
  disabled = false,
  emptyLabel = 'No available times'
}) {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("label", {
    className: "pd-compact-field pd-compact-select is-filled",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("select", {
      value: value,
      disabled: disabled || loading || !slots.length,
      onChange: e => onChange(e.target.value),
      children: loading ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("option", {
        value: "",
        children: "Loading\u2026"
      }) : slots.length ? slots.map(s => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("option", {
        value: s.startUtc,
        children: s.label
      }, s.startUtc)) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("option", {
        value: "",
        children: emptyLabel
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
      className: "pd-compact-label",
      children: "Available start time"
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
      className: "pd-field-end-icon",
      "aria-hidden": "true",
      children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_8__.renderIcon)('chevronDown')
    })]
  });
}

/**
 * Activity-trail labels. The payment actions (D-R38) are logged by `PaymentService`, mostly with
 * `initiated_by = gateway:{code}` or `system`, so without a label here the trail rendered raw enum
 * strings on exactly the rows an operator reads when money is in question.
 *
 * `payment_received_after_expiry` keeps its own wording on purpose: money that landed after the
 * hold lapsed is RECORDED, never allowed to resurrect the appointment (D-R38h), and the trail is
 * the only place that distinction is visible.
 */
const ACTIVITY_LABELS = {
  created: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Booking created', 'aponto'),
  confirmed: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Confirmed', 'aponto'),
  cancelled: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Cancelled', 'aponto'),
  completed: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Completed', 'aponto'),
  rescheduled: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Rescheduled', 'aponto'),
  no_show: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Marked as no-show', 'aponto'),
  payment_received: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Payment received', 'aponto'),
  payment_received_after_expiry: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Payment received after the hold expired', 'aponto'),
  payment_status_changed: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Payment status changed', 'aponto'),
  payment_hold_expired: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Payment hold expired', 'aponto'),
  hold_released: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Payment hold released', 'aponto'),
  refund: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Refunded', 'aponto'),
  // QA run 2 BUG-3: a gateway that refused this order's amount or currency outright. Readiness
  // cannot warn about it — it is asked without an order — so the booking's own trail is where the
  // operator finds out that, say, PayPal has no minor unit for HUF and the price needs rounding.
  payment_refused: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Gateway refused this amount', 'aponto')
};
function actionLabel(action) {
  return ACTIVITY_LABELS[action] || action;
}

/**
 * The reference worth showing for one ledger row (QA run 2 BUG-5).
 *
 * A CHARGE is best identified by what the gateway calls the payment; a REFUND by the refund's own
 * id, which since D-R40d lives in `gateway_ref` (rest-contract §2.21). Falling back the other way
 * keeps rows written before that change readable, where the refund id sat in `payment_ref`.
 *
 * @param {Object} t Transaction DTO.
 * @return {string} Reference to display.
 */
function displayRef(t) {
  return t.kind === 'refund' ? t.gatewayRef || t.paymentRef || '' : t.paymentRef || t.gatewayRef || '';
}

/**
 * The order's gateway transactions, newest last — the ledger `aponto_transactions` keeps
 * (D-R38). Read-only by construction: every row here is something a gateway did, and the only
 * write this screen offers against it is a refund.
 *
 * The reference is SHORTENED on screen and whole in the `title`, because its job is to be pasted
 * into the gateway's own dashboard while the row's job is to stay one line.
 */
function TransactionList({
  transactions,
  currencyExponent = null
}) {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("div", {
    className: "ap-txn-list",
    children: transactions.map(t => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
      className: "ap-txn-row",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
        className: "ap-txn-kind",
        children: _lib_payment_status_js__WEBPACK_IMPORTED_MODULE_15__.TRANSACTION_KIND_LABELS[t.kind] || t.kind
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
        className: "ap-txn-amount",
        children: (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_5__.money)(t.amountMinor, t.currency, currencyExponent)
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
        className: `ap-txn-status is-${t.status}`,
        children: _lib_payment_status_js__WEBPACK_IMPORTED_MODULE_15__.TRANSACTION_STATUS_LABELS[t.status] || t.status
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
        className: "ap-txn-ref pd-ltr",
        title: displayRef(t),
        children: (0,_lib_payment_status_js__WEBPACK_IMPORTED_MODULE_15__.shortRef)(displayRef(t))
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
        className: "ap-txn-when",
        children: t.createdAt ? (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_5__.dateTimeLabel)(t.createdAt) : ''
      })]
    }, t.id))
  });
}

/**
 * Refund failures, in the operator's terms.
 *
 * The three the server can answer are genuinely different situations and only one of them is worth
 * retrying, so they must not collapse into "something went wrong":
 *   - `aponto_payment_unavailable` (409) — the module is switched off. The data is still here; the
 *     ACTION needs the module back (D-R31 retention).
 *   - `aponto_payment_state` (409) — the order moved: it was already refunded, another refund is in
 *     flight, or the amount no longer fits. The server's own message says which.
 *   - `aponto_payment_error` (502) — the gateway refused. Nothing local is wrong.
 *
 * @param {Object} err     Failed request.
 * @param {string} gateway Order gateway code.
 * @return {string} Message for the toast.
 */
function refundErrorMessage(err, gateway) {
  const code = err?.code || '';
  if ('aponto_payment_unavailable' === code) {
    return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.sprintf)(/* translators: %s: payment gateway name, e.g. "Stripe". */
    (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Enable the %s module to refund this payment.', 'aponto'), (0,_lib_payment_status_js__WEBPACK_IMPORTED_MODULE_15__.gatewayLabel)(gateway));
  }
  if ('aponto_payment_error' === code) {
    return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('The gateway refused the refund — try again later.', 'aponto');
  }
  return err?.message || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('The refund could not be completed.', 'aponto');
}

/***/ }

}]);
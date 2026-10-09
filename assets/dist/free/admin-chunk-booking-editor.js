"use strict";
(globalThis["webpackChunkaponto"] = globalThis["webpackChunkaponto"] || []).push([["admin-chunk-booking-editor"],{

/***/ "./assets/src/admin/bookings/form-answers.js"
/*!***************************************************!*\
  !*** ./assets/src/admin/bookings/form-answers.js ***!
  \***************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   customFieldValue: () => (/* binding */ customFieldValue)
/* harmony export */ });
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__);
/**
 * Booking-form answers as the booking drawer prints them. Kept apart from the editor so the rule
 * is unit-testable without mounting it.
 */


/**
 * A booking-form answer as the drawer prints it (persona QA 2026-10-05, T-046): a ticked checkbox
 * is stored as `1`, which is not an answer a person reads — it is "Yes".
 *
 * @param {{type?: string, value: string}} field Answer from the detail DTO.
 * @return {string} Display value.
 */
function customFieldValue(field) {
  if ('checkbox' === field?.type) {
    return '1' === String(field.value) ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Yes', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('No', 'aponto');
  }
  return field?.value ?? '';
}

/***/ },

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

/***/ "./assets/src/admin/lib/booking-activity.js"
/*!**************************************************!*\
  !*** ./assets/src/admin/lib/booking-activity.js ***!
  \**************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ACTIVITY_LABELS: () => (/* binding */ ACTIVITY_LABELS),
/* harmony export */   activityActor: () => (/* binding */ activityActor),
/* harmony export */   activityLabel: () => (/* binding */ activityLabel),
/* harmony export */   activityReason: () => (/* binding */ activityReason),
/* harmony export */   cancellationReason: () => (/* binding */ cancellationReason)
/* harmony export */ });
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _payment_status_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./payment-status.js */ "./assets/src/admin/lib/payment-status.js");
/**
 * Booking activity trail presentation — the labels, the actor and the reasons the inspector shows
 * for `GET /bookings/{id}` `activities[]` (first-run QA D08).
 *
 * The trail used to print raw enum strings (`status_changed`, `public`), and a customer's
 * cancellation reason — stored in the activity `meta` — was visible nowhere in the admin. Every
 * key the backend writes is pinned to a label by `tests/js/booking-activity.test.js`, which scans
 * `src/` for the keys handed to `ActivityRepository::log()`.
 *
 * Pure: no React, no REST.
 */



/**
 * Activity-trail labels. The payment actions (D-R38) are logged by `PaymentService`, mostly with
 * `initiated_by = gateway:{code}` or `system`, so without a label here the trail rendered raw enum
 * strings on exactly the rows an operator reads when money is in question.
 *
 * `payment_received_after_expiry` keeps its own wording on purpose: money that landed after the
 * hold lapsed is RECORDED, never allowed to resurrect the appointment (D-R38h), and the trail is
 * the only place that distinction is visible.
 *
 * `confirmed` … `no_show` are not written as actions today (a status move is `status_changed`
 * with `meta.to`); they stay so an older trail still reads.
 */
const ACTIVITY_LABELS = {
  created: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Booking created', 'aponto'),
  status_changed: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Status changed', 'aponto'),
  confirmed: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Confirmed', 'aponto'),
  cancelled: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Cancelled', 'aponto'),
  completed: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Completed', 'aponto'),
  rescheduled: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Rescheduled', 'aponto'),
  no_show: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Marked as no-show', 'aponto'),
  deleted: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Booking deleted', 'aponto'),
  payment_received: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Payment received', 'aponto'),
  payment_received_after_expiry: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Payment received after the hold expired', 'aponto'),
  payment_status_changed: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Payment status changed', 'aponto'),
  // Deposits and remaining balance (D-R71).
  balance_recorded_onsite: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Balance recorded on site', 'aponto'),
  balance_refunded_onsite: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('On-site refund recorded', 'aponto'),
  balance_paid_online: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Balance paid online', 'aponto'),
  balance_record_reversed: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Balance record reversed', 'aponto'),
  deposit_bypassed: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Deposit bypassed', 'aponto'),
  coupon_changed: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Coupon changed', 'aponto'),
  payment_hold_expired: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Payment hold expired', 'aponto'),
  hold_released: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Payment hold released', 'aponto'),
  hold_released_admin_confirmed: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Payment hold released — confirmed by an admin', 'aponto'),
  refund: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Refunded', 'aponto'),
  // An administrator reviewed an unfinished refund at the external checkout and allowed refunds again.
  refund_review_cleared: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Refund review cleared', 'aponto'),
  // QA run 2 BUG-3: a gateway that refused this order's amount or currency outright. Readiness
  // cannot warn about it — it is asked without an order — so the booking's own trail is where the
  // operator finds out that, say, PayPal has no minor unit for HUF and the price needs rounding.
  payment_refused: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Gateway refused this amount', 'aponto'),
  // External checkout (D-R71): the gateway's own checkout collected the customer, settled the
  // final total, or decided nothing was owed. Logged by `PaymentService` as `gateway:{code}`.
  checkout_customer_attached: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Customer details received from checkout', 'aponto'),
  payment_quote_finalized: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Checkout total confirmed', 'aponto'),
  payment_not_required: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('No payment required', 'aponto'),
  notification_deferred_payment: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Confirmation email waits for payment', 'aponto'),
  notification_suppressed: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Email not sent', 'aponto'),
  notification_suppressed_flood: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Email not sent — too many in a short time', 'aponto')
};

/** What a `status_changed` row reads as, keyed by the status it moved TO. */
const STATUS_CHANGE_LABELS = {
  pending: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Set to pending', 'aponto'),
  confirmed: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Confirmed', 'aponto'),
  completed: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Completed', 'aponto'),
  cancelled: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Cancelled', 'aponto'),
  no_show: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Marked as no-show', 'aponto')
};

/**
 * The trail label for one activity.
 *
 * @param {{action: string, meta?: Object}} activity Adapted activity row.
 * @return {string} Label.
 */
function activityLabel(activity) {
  const {
    action,
    meta = {}
  } = activity || {};
  if ('status_changed' === action) {
    // A cancelled booking put back is a RESTORE (the editor offers it as "Pending (restore)").
    if ('pending' === meta.to && 'cancelled' === meta.from) {
      return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Restored to pending', 'aponto');
    }
    return STATUS_CHANGE_LABELS[meta.to] || ACTIVITY_LABELS.status_changed;
  }
  if (ACTIVITY_LABELS[action]) {
    return ACTIVITY_LABELS[action];
  }
  // A key this build does not know yet (a newer module): readable, not an enum.
  const words = String(action || '').replace(/_/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : '';
}

/**
 * Who did it, from the `initiated_by` descriptor (`public`, `customer`, `system`, `admin`,
 * `admin:{user_id}`, `gateway:{code}`).
 *
 * @param {string} initiatedBy Raw descriptor.
 * @return {string} Display text, '' for none.
 */
function activityActor(initiatedBy) {
  const raw = String(initiatedBy || '');
  if ('' === raw) {
    return '';
  }
  const [kind, detail = ''] = raw.split(':');
  switch (kind) {
    case 'public':
      return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Booking form', 'aponto');
    case 'customer':
      return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Customer', 'aponto');
    case 'system':
      return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('System', 'aponto');
    case 'admin':
      return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Admin', 'aponto');
    case 'gateway':
      {
        const named = (0,_payment_status_js__WEBPACK_IMPORTED_MODULE_1__.gatewayLabel)(detail) !== '—' ? (0,_payment_status_js__WEBPACK_IMPORTED_MODULE_1__.gatewayLabel)(detail) : (0,_payment_status_js__WEBPACK_IMPORTED_MODULE_1__.gatewayLabel)(`payments_${detail}`);
        return '—' !== named ? named : detail;
      }
    default:
      return raw;
  }
}

/**
 * The free-text reason recorded with an activity (a status change's `meta.reason`), trimmed.
 *
 * @param {{meta?: Object}} activity Adapted activity row.
 * @return {string} Reason, or ''.
 */
function activityReason(activity) {
  const reason = activity?.meta?.reason;
  return 'string' === typeof reason ? reason.trim() : '';
}

/**
 * The reason given with the LATEST move to `cancelled`, or '' — a restored-then-cancelled booking
 * shows the reason for the cancellation that is in force.
 *
 * @param {Array<Object>} activities Adapted activity rows, oldest first.
 * @return {string} Reason, or ''.
 */
function cancellationReason(activities) {
  const rows = Array.isArray(activities) ? activities : [];
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    if ('status_changed' === row?.action && 'cancelled' === row.meta?.to) {
      return activityReason(row);
    }
  }
  return '';
}

/***/ },

/***/ "./assets/src/admin/lib/booking-coupon.free.js"
/*!*****************************************************!*\
  !*** ./assets/src/admin/lib/booking-coupon.free.js ***!
  \*****************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   useBookingCoupon: () => (/* binding */ useBookingCoupon)
/* harmony export */ });
/**
 * Booking-editor order-adjustment controls owned by the Free edition: none.
 *
 * Selected at build time through the `@aponto/admin-booking-coupon` alias
 * (webpack.config.js); Premium resolves its module under `assets/src/pro/`.
 * This file ships in the wp.org ZIP, so it stays inert (D-R41): an existing
 * order's discount snapshot is still displayed read-only by BookingEditor.jsx
 * itself, but nothing here can quote, apply or edit one.
 */

const NONE = Object.freeze({
  createQuote: null,
  createCode: '',
  createBlocker: () => '',
  handleCreateError: () => false,
  createControl: null,
  renderEditControl: () => null
});

/**
 * @return {Object} Inert adjustment state (no hooks are called).
 */
function useBookingCoupon() {
  return NONE;
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
/* harmony import */ var _shared_person_name_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../shared/person-name.js */ "./assets/src/shared/person-name.js");
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
 * The name parts of a person record as typeahead keywords (name split, 2026-10-01). The label is
 * already the display name, which holds both parts; listing them keeps a search by either part
 * working even when a record's composed `name` is missing or differs.
 *
 * @param {Object} item REST customer / staff item.
 * @return {Array} Non-empty parts.
 */
function nameKeywords(item) {
  return [item.first_name, item.last_name].filter(Boolean);
}

/**
 * Staff options. `meta` is the email — the one field that tells two same-named staff
 * apart — and it joins `keywords` exactly like the customer picker's contact details,
 * so what the row shows is also what the typeahead can match. The label is the display name;
 * the parts ride along.
 *
 * @param {Array} items REST `/staff` items.
 * @return {Array} Combobox options.
 */
function staffOptions(items = []) {
  return (items || []).map(item => ({
    id: item.id,
    label: (0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_1__.displayNameOf)(item),
    meta: item.email || '',
    keywords: [...nameKeywords(item), item.email].filter(Boolean).join(' '),
    first_name: item.first_name || '',
    last_name: item.last_name || ''
  }));
}

/**
 * Customer options. `meta` is the secondary line in the entity row; `keywords` adds the name
 * parts + email + phone to the typeahead (the label is the display name). The parts ride along
 * for `POST /bookings`, which takes `customer.first_name` / `customer.last_name`.
 *
 * An `anonymized` record (erased by a privacy request or the retention sweep) is not offered:
 * the route refuses it as `customer_id`, and "Deleted customer" is nobody to book for.
 *
 * @param {Array} items REST `/customers` items.
 * @return {Array} Combobox options.
 */
function customerOptions(items = []) {
  return (items || []).filter(item => !item.anonymized).map(item => ({
    id: item.id,
    label: (0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_1__.displayNameOf)(item),
    meta: item.email || item.phone || '',
    keywords: [...nameKeywords(item), item.email, item.phone].filter(Boolean).join(' '),
    name: (0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_1__.displayNameOf)(item),
    first_name: item.first_name || '',
    last_name: item.last_name || '',
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
/* harmony export */   locationSelectOptions: () => (/* binding */ locationSelectOptions),
/* harmony export */   locationToSend: () => (/* binding */ locationToSend),
/* harmony export */   rescheduleStaffOptions: () => (/* binding */ rescheduleStaffOptions),
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

/**
 * Options for the booking editor's Location `<select>` (D-R63): "No location" (`0`, labelled with
 * the business name — the place a no-location booking actually happens) first, then the ACTIVE
 * branches in catalog order. A booking already sitting at a branch the active catalog does not list
 * (archived since) keeps its own entry, so the control never claims the booking is somewhere else.
 *
 * Only ever called with ≥1 active location: with none, the editor renders the read-only row it
 * always has, which is what keeps Free byte-identical.
 *
 * @param {Object} args
 * @param {Array}  args.locations      Active catalog `[ { id, name } ]`.
 * @param {number} [args.currentId]    The booking's own location id (edit), `0`/absent on create.
 * @param {string} [args.currentName]  Its resolved name, for the archived case.
 * @param {string} [args.businessName] Site business name.
 * @param {string} args.noLocation     Translated "No location".
 * @return {Array} `[ { id, label } ]`.
 */
function locationSelectOptions({
  locations,
  currentId = 0,
  currentName = '',
  businessName = '',
  noLocation
}) {
  const options = [{
    id: 0,
    label: businessName ? `${noLocation} · ${businessName}` : noLocation
  }];
  (locations || []).forEach(location => options.push({
    id: location.id,
    label: location.name
  }));
  const current = Number(currentId) || 0;
  if (current && !options.some(option => option.id === current)) {
    options.push({
      id: current,
      label: currentName || `#${current}`
    });
  }
  return options;
}

/**
 * The `location_id` a booking write should carry for a picked location (D-R63): `undefined` for
 * `0` on CREATE, so a site with no branch picked sends the exact pre-D-R63 body; on a MOVE the
 * target is returned whenever it differs from where the booking already is (`0` included — moving
 * a booking back to "no location" is a real move), else `undefined` (nothing to move).
 *
 * @param {number}  picked   Picked location id.
 * @param {?number} [current] The booking's current location (edit); omit on create.
 * @return {number|undefined} Value to send, or undefined to omit the key.
 */
function locationToSend(picked, current) {
  const next = Number(picked) || 0;
  if (current === undefined || current === null) {
    return next > 0 ? next : undefined;
  }
  return next !== (Number(current) || 0) ? next : undefined;
}

/**
 * Options for the "Edit time" Staff `<select>` (D-R78): the ACTIVE staff members assigned to the
 * booking's service at the picked location — a pair at that location or the wildcard `0`, the same
 * terms the engine's eligibility read applies — in catalog order. The booking's own staff member
 * always keeps an entry (archived or unassigned since), so the control never claims the booking
 * belongs to somebody else.
 *
 * `assignments === null` means the eligibility read was not available (it needs the services
 * capability): every active member is offered, and the server refuses an ineligible pick.
 *
 * @param {Object}     args
 * @param {Array}      args.staff         Active staff options `[ { id, label } ]`.
 * @param {?Array}     args.assignments   Pairs `{ staff_id, location_id }` of the service, or null.
 * @param {number}     [args.locationId]  Picked location (`0` = none).
 * @param {number}     [args.currentId]   The booking's own staff id.
 * @param {string}     [args.currentName] Its name, for a member the list no longer carries.
 * @return {Array} `[ { id, label } ]`.
 */
function rescheduleStaffOptions({
  staff,
  assignments,
  locationId = 0,
  currentId = 0,
  currentName = ''
}) {
  const place = Number(locationId) || 0;
  const eligible = null === assignments || undefined === assignments ? null : new Set(assignments.filter(pair => {
    const at = Number(pair?.location_id) || 0;
    return 0 === at || at === place;
  }).map(pair => Number(pair.staff_id)));
  const options = (staff || []).filter(member => null === eligible || eligible.has(Number(member.id))).map(member => ({
    id: Number(member.id),
    label: member.label
  }));
  const current = Number(currentId) || 0;
  if (current && !options.some(option => option.id === current)) {
    options.unshift({
      id: current,
      label: currentName || `#${current}`
    });
  }
  return options;
}

/***/ },

/***/ "./assets/src/admin/routes/BookingEditor.jsx"
/*!***************************************************!*\
  !*** ./assets/src/admin/routes/BookingEditor.jsx ***!
  \***************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   BookingEditor: () => (/* binding */ BookingEditor),
/* harmony export */   customerFieldErrors: () => (/* binding */ customerFieldErrors)
/* harmony export */ });
/* harmony import */ var _lib_external_order_sync_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../lib/external-order-sync.js */ "./assets/src/admin/lib/external-order-sync.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _pressmaximum_dashboard_kit_primitives__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @pressmaximum/dashboard-kit/primitives */ "./node_modules/@pressmaximum/dashboard-kit/build/primitives/index.mjs");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _lib_api_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/api.js */ "./assets/src/admin/lib/api.js");
/* harmony import */ var _lib_config_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../lib/config.js */ "./assets/src/admin/lib/config.js");
/* harmony import */ var _lib_format_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../lib/format.js */ "./assets/src/admin/lib/format.js");
/* harmony import */ var _lib_booking_adapter_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../lib/booking-adapter.js */ "./assets/src/admin/lib/booking-adapter.js");
/* harmony import */ var _lib_booking_activity_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../lib/booking-activity.js */ "./assets/src/admin/lib/booking-activity.js");
/* harmony import */ var _lib_page_title_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../lib/page-title.js */ "./assets/src/admin/lib/page-title.js");
/* harmony import */ var _lib_editor_rows_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../lib/editor-rows.js */ "./assets/src/admin/lib/editor-rows.js");
/* harmony import */ var _lib_branches_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../lib/branches.js */ "./assets/src/admin/lib/branches.js");
/* harmony import */ var _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../lib/icon.jsx */ "./assets/src/admin/lib/icon.jsx");
/* harmony import */ var _lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../lib/field-error.jsx */ "./assets/src/admin/lib/field-error.jsx");
/* harmony import */ var _shared_person_name_js__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ../../shared/person-name.js */ "./assets/src/shared/person-name.js");
/* harmony import */ var _lib_notification_outcome_js__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ../lib/notification-outcome.js */ "./assets/src/admin/lib/notification-outcome.js");
/* harmony import */ var _lib_toast_jsx__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ../lib/toast.jsx */ "./assets/src/admin/lib/toast.jsx");
/* harmony import */ var _lib_confirm_jsx__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ../lib/confirm.jsx */ "./assets/src/admin/lib/confirm.jsx");
/* harmony import */ var _lib_Combobox_jsx__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ../lib/Combobox.jsx */ "./assets/src/admin/lib/Combobox.jsx");
/* harmony import */ var _lib_combobox_options_js__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! ../lib/combobox-options.js */ "./assets/src/admin/lib/combobox-options.js");
/* harmony import */ var _modules_catalog_js__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! ../modules/catalog.js */ "./assets/src/admin/modules/catalog.js");
/* harmony import */ var _modules_module_state_js__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(/*! ../modules/module-state.js */ "./assets/src/admin/modules/module-state.js");
/* harmony import */ var _lib_payment_status_js__WEBPACK_IMPORTED_MODULE_22__ = __webpack_require__(/*! ../lib/payment-status.js */ "./assets/src/admin/lib/payment-status.js");
/* harmony import */ var _bookings_dashboard_stats_js__WEBPACK_IMPORTED_MODULE_23__ = __webpack_require__(/*! ../bookings/dashboard-stats.js */ "./assets/src/admin/bookings/dashboard-stats.js");
/* harmony import */ var _bookings_form_answers_js__WEBPACK_IMPORTED_MODULE_24__ = __webpack_require__(/*! ../bookings/form-answers.js */ "./assets/src/admin/bookings/form-answers.js");
/* harmony import */ var _lib_lazy_jsx__WEBPACK_IMPORTED_MODULE_25__ = __webpack_require__(/*! ../lib/lazy.jsx */ "./assets/src/admin/lib/lazy.jsx");
/* harmony import */ var _aponto_admin_booking_coupon__WEBPACK_IMPORTED_MODULE_26__ = __webpack_require__(/*! @aponto/admin-booking-coupon */ "./assets/src/admin/lib/booking-coupon.free.js");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__);
/**
 * In-flow booking editor (SPEC-P1 §1.4 / mockup §6.7). One shell, one domain
 * order: Customer → Services & items → Schedule → Order → Internal notes (+ Activity
 * in edit). Non-modal: the list stays interactive (no backdrop/body-lock/focus-trap).
 *
 * - Create: customer-first, availability-driven `Available start time` — the FRONT-DESK
 *   window (D-R77): no customer lead time, today's starts from the start of the business
 *   day; a new customer needs only a first name (no email = no customer mail) — derived
 *   read-only end, create-as-draft (default_booking_status). POST /bookings.
 * - Edit: Customer/Service/schedule read-only; `Edit time` = reschedule sub-flow
 *   (PUT /bookings/{id}/reschedule), which on a multi-staff site may also move the booking
 *   to another eligible staff member (D-R78); Order snapshot + manual Paid/Unpaid
 *   (PATCH payment_status, none|paid, Q9); Save commits status(+notify)+internal
 *   note (PATCH); Cancel is a destructive confirm in the footer overflow; status
 *   follows the single-source transition matrix; Notify default-on per transition.
 *
 * Footer: the `Notify customer` choice sits on its own row above the commit
 * buttons (founder decision 2026-07-25 — D1), so the button row stays the
 * mockup's 62px footer. See `NotifyRow` below.
 */


























// Edition-resolved (webpack alias, D-R41 ownership): Premium's coupon controls, or
// Free's inert stub. The read-only discount snapshot below is neutral core display.


// The refund dialog is the rarest surface in the app and entirely self-contained, so it
// loads on the click that opens it rather than riding in `admin.js` (AGENTS §6 budget; the
// P3 handoff §4 debt item). `lazySurface` supplies the Spinner and the retry line.

const RefundDialog = (0,_lib_lazy_jsx__WEBPACK_IMPORTED_MODULE_25__.lazySurface)(() => __webpack_require__.e(/*! import() | admin-chunk-refund-dialog */ "admin-chunk-refund-dialog").then(__webpack_require__.bind(__webpack_require__, /*! ./RefundDialog.jsx */ "./assets/src/admin/routes/RefundDialog.jsx")), {
  pick: 'RefundDialog',
  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Loading refund form…', 'aponto')
});

/**
 * The notification half of a reschedule toast (D-R63 fix round 2), through the SAME helper the
 * status and cancel toasts use. The reschedule response carries no delivery outcome, so this reports
 * the INTENT — "queued" when the box was ticked, "not notified" when it was not — never "notified".
 *
 * @param {boolean} notify The Notify checkbox.
 * @return {string} Suffix beginning with a space.
 */
function rescheduleSuffix(notify) {
  return (0,_lib_notification_outcome_js__WEBPACK_IMPORTED_MODULE_15__.notifiedSuffix)(notify ? 'queued' : 'suppressed');
}

/** A loaded booking's own location id (`0` for none or before the detail lands). */
function d0LocationId(detail) {
  return Number(detail?.locationId) || 0;
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
const TZ = _lib_config_js__WEBPACK_IMPORTED_MODULE_5__.config.business.timezone;
function nextStatuses(status) {
  return TRANSITIONS[status] || [];
}

/**
 * The Location picker (D-R63) — shown in place of the read-only row whenever the site has ≥1
 * ACTIVE location. A labelled native `<select>` in the compact-field chrome the Status select uses,
 * so it needs no new CSS and reads correctly RTL.
 */
function LocationSelect({
  value,
  options,
  onChange,
  disabled = false
}) {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("label", {
    className: "pd-compact-field pd-compact-select is-filled",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("select", {
      name: "location",
      value: value,
      disabled: disabled,
      onChange: e => onChange(Number(e.target.value) || 0),
      children: options.map(option => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("option", {
        value: option.id,
        children: option.label
      }, option.id))
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
      className: "pd-compact-label",
      children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Location', 'aponto')
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
      className: "pd-field-end-icon",
      "aria-hidden": "true",
      children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon)('chevronDown')
    })]
  });
}

/**
 * The "Edit time" Staff picker (D-R78) — the Location select's chrome, so it needs no new CSS.
 * Rendered only on a multi-staff site with somebody else to move the booking to.
 */
function StaffSelect({
  value,
  options,
  onChange
}) {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("label", {
    className: "pd-compact-field pd-compact-select is-filled",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("select", {
      name: "staff",
      value: value,
      onChange: e => onChange(Number(e.target.value) || 0),
      children: options.map(option => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("option", {
        value: option.id,
        children: option.label
      }, option.id))
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
      className: "pd-compact-label",
      children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Staff', 'aponto')
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
      className: "pd-field-end-icon",
      "aria-hidden": "true",
      children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon)('chevronDown')
    })]
  });
}
function Readonly({
  label,
  value,
  hint
}) {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
    className: "pd-editor-readonly",
    title: hint || undefined,
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
      className: "pd-editor-readonly-label",
      children: label
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("strong", {
      children: value
    })]
  });
}

/**
 * The new-customer field errors inside a `POST /bookings` 422 (`data.fields`), with the
 * `customer.` prefix dropped so they key the inputs directly (name split, 2026-10-01).
 *
 * @param {?Object} fields Server field errors.
 * @return {Object} Errors by `first_name` / `last_name` / `email` / `phone`.
 */
function customerFieldErrors(fields) {
  const out = {};
  for (const key of ['first_name', 'last_name', 'email', 'phone']) {
    const message = fields?.[`customer.${key}`];
    if (message) {
      out[key] = message;
    }
  }
  return out;
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
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("div", {
    className: "ap-inspector-notify-row",
    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("label", {
      className: "pd-notify-toggle",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("input", {
        className: "pd-table-checkbox",
        type: "checkbox",
        checked: checked,
        onChange: e => onChange(e.target.checked)
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
        children: label
      })]
    })
  });
}

/**
 * Neutral read-only label for an order's discount snapshot (shown in both editions).
 *
 * @param {string} code Snapshot code, possibly empty.
 * @return {string} Label.
 */
function discountLabel(code) {
  /* translators: %s: discount code recorded on the order. */
  return code ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Discount (%s)', 'aponto'), code) : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Discount', 'aponto');
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
  const rootRef = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
  const handlerRef = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(onCancel);
  handlerRef.current = onCancel;
  (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (!rootRef.current) {
      return undefined;
    }
    const controller = (0,_pressmaximum_dashboard_kit_primitives__WEBPACK_IMPORTED_MODULE_2__.createMenu)(rootRef.current, {
      onSelect: item => {
        if (item.getAttribute('data-action') === 'cancel') {
          handlerRef.current?.();
        }
      }
    });
    return () => controller.destroy();
  }, []);
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
    className: "pd-inspector-more-menu",
    ref: rootRef,
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("button", {
      className: "pd-button sm icon-only",
      type: "button",
      "data-menu-trigger": true,
      "aria-haspopup": "menu",
      "aria-expanded": "false",
      "aria-label": "More appointment actions",
      title: "More appointment actions",
      children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon)('more')
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("div", {
      role: "menu",
      "aria-label": "More appointment actions",
      hidden: true,
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("button", {
        type: "button",
        role: "menuitem",
        className: "is-danger",
        "data-action": "cancel",
        disabled: !cancellable,
        children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon)('prohibit'), "Cancel booking"]
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
  onCancel,
  onChanged
}) {
  // A create the operator ABANDONS (Cancel / ×) may return them where they came from — the
  // Calendar's slot click, D-R63 fix round 2; a SAVE still just closes.
  const abandon = mode === 'create' && onCancel || onClose;
  const showToast = (0,_lib_toast_jsx__WEBPACK_IMPORTED_MODULE_16__.useToast)();
  const creating = mode === 'create';
  const [loading, setLoading] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(!creating);
  const [error, setError] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
  const [saving, setSaving] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [detail, setDetail] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
  (0,_lib_page_title_js__WEBPACK_IMPORTED_MODULE_9__.usePageTitle)(creating ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('New booking', 'aponto') : detail?.order?.code ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)(/* translators: %s: order reference, e.g. AP-7Q2F4. */(0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Booking %s', 'aponto'), detail.order.code) : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Booking', 'aponto'));

  // Edit-mode form state.
  const [status, setStatus] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)('');
  const [notify, setNotify] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(true);
  const [internalNote, setInternalNote] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)('');
  const [confirm, setConfirm] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(null); // 'cancel' | 'complete' | 'no-show'
  // The one action a gateway may attach to its external order record (server-computed copy).
  const {
    confirm: askConfirm,
    dialog: confirmDialog
  } = (0,_lib_confirm_jsx__WEBPACK_IMPORTED_MODULE_17__.useConfirmDialog)();
  const [externalBusy, setExternalBusy] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [forceReason, setForceReason] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)('');
  // "Complete anyway" / "Mark anyway" pressed with the required reason empty (persona QA
  // 2026-10-05, S2-87): the button used to be disabled, so the press did nothing and said nothing.
  const [reasonMissing, setReasonMissing] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  // A refused action stays ON the drawer, not only in a toast that is gone in a few seconds
  // (S2-70: a cancel the server refused with a perfectly good reason looked like nothing happened).
  const [actionError, setActionError] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)('');
  //
  // Inline ONLY (re-test N8): the same sentence used to go out as a toast too, and on a phone the
  // toast sat on top of the inline message and of the buttons under it until it faded. Every
  // view of this drawer renders `actionError` (`role="alert"`), so nothing is lost.
  const fail = message => {
    setActionError(message || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('That could not be done. Try again.', 'aponto'));
  };
  // ONE action at a time, guarded SYNCHRONOUSLY (S2-84): `saving` is React state, so a second tap
  // landing before the re-render still saw an enabled button — two reschedules, two mails. Every
  // commit in this drawer goes through `once()`.
  const busyRef = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(false);
  const once = action => async (...args) => {
    if (busyRef.current) {
      return undefined;
    }
    busyRef.current = true;
    setActionError('');
    try {
      return await action(...args);
    } finally {
      busyRef.current = false;
    }
  };
  const [reschedule, setReschedule] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(initialAction === 'reschedule');
  const [refundOpen, setRefundOpen] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [refunding, setRefunding] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [balanceBusy, setBalanceBusy] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const balancePrompted = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(false);
  // SESSION module records, not the boot snapshot: a gateway switched off from the Modules screen
  // moments ago must take its Refund action away NOW. Reading `config.modules` here left the
  // button on screen until a full document reload, one click away from a `409
  // aponto_payment_unavailable` — the same lifetime bug `modules/module-state.js` was written for.
  const modules = (0,_modules_module_state_js__WEBPACK_IMPORTED_MODULE_21__.useModules)();

  // Create-mode form state.
  const [catalog, setCatalog] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)({
    services: [],
    staff: [],
    customers: []
  });
  const [addNew, setAddNew] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [customer, setCustomer] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
  const [newCustomer, setNewCustomer] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  });
  // Inline errors for the new-customer fields, keyed by the `POST /bookings` 422 keys with the
  // `customer.` prefix dropped (`first_name`, `last_name`, `email`, `phone`).
  const [customerError, setCustomerError] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)({});
  const [service, setService] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
  const [staff, setStaff] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
  const [createStatus, setCreateStatus] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(_lib_config_js__WEBPACK_IMPORTED_MODULE_5__.config.settings.defaultBookingStatus || 'pending');

  // D-R78 — "Edit time" may move the booking to another staff member. `moveStaff` is the picked id
  // (0 = the booking's own, until its detail lands); the roster is read once, when the panel
  // opens on a multi-staff site: the active members and, where the operator may read it, the
  // service's eligibility pairs (`null` = not readable → every active member is offered and the
  // server refuses an ineligible one).
  const [moveStaff, setMoveStaff] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(0);
  const [roster, setRoster] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(null); // null | { staff: [], assignments: ?[] }

  // D-R63 — where the booking happens. `allLocations` is the WHOLE catalog, every status, read ONCE
  // per editor (fix round 2: it replaced a second, session-cached all-status read that named the
  // read-only row): the ACTIVE branches are the choices, and every name — the read-only row's, an
  // archived current branch's — comes from the same list. No active branch = the read-only row.
  // `place` is the picked id for BOTH modes: the create target, or the edit move target (seeded
  // from the booking once its detail lands).
  const [allLocations, setLocations] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)([]);
  const locations = (0,_lib_branches_js__WEBPACK_IMPORTED_MODULE_11__.activeLocations)(allLocations);
  // A calendar slot clicked in a BRANCH view arrives with that branch (D-R63 fix round 1).
  const [place, setPlace] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(() => creating && Number(prefill?.locationId) || 0);
  // Fix round 3: an INCOMPLETE catalog (a failed page, the page ceiling) is not an empty one — a
  // create could otherwise land at "no location" on a site with branches, and a move could offer a
  // partial list. Location writes wait for a complete read, with Retry.
  const [catalogStatus, setCatalogStatus] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)('loading'); // loading | complete | incomplete
  const catalogIncomplete = 'incomplete' === catalogStatus;
  const loadCatalog = (0,react__WEBPACK_IMPORTED_MODULE_1__.useCallback)(() => {
    let live = true;
    setCatalogStatus('loading');
    (0,_lib_branches_js__WEBPACK_IMPORTED_MODULE_11__.fetchLocations)().then(({
      items,
      complete
    }) => {
      if (!live) {
        return;
      }
      if (items.length) {
        setLocations(items);
      }
      setCatalogStatus(complete ? 'complete' : 'incomplete');
    });
    return () => {
      live = false;
    };
  }, []);
  (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(loadCatalog, [loadCatalog]);

  // Shared schedule state (create + reschedule share the availability picker).
  // A calendar free-slot click prefills the create date + preferred start; the
  // preferred slot is only kept once availability confirms it exists.
  const [date, setDate] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(creating && prefill?.date || _lib_config_js__WEBPACK_IMPORTED_MODULE_5__.config.business.today);
  const [slots, setSlots] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)([]);
  const [slotsLoading, setSlotsLoading] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [selectedSlot, setSelectedSlot] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(creating && prefill?.startUtc || '');
  const closeRef = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);

  // Load edit detail. `reloadDetail` is the same fetch WITHOUT the initial-action side effect and
  // without the loading curtain: a refund has to re-read the order (its status, its transactions
  // and what is left to refund all move at once), and re-mounting the whole editor to do that
  // would throw away the status/internal-note edits sitting in the form.
  const reloadDetail = (0,react__WEBPACK_IMPORTED_MODULE_1__.useCallback)(() => {
    if (creating || !bookingId) {
      return Promise.resolve();
    }
    return _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.get(`/bookings/${bookingId}`).then(res => setDetail((0,_lib_booking_adapter_js__WEBPACK_IMPORTED_MODULE_7__.bookingDetailToEditor)(res))).catch(() => {});
  }, [creating, bookingId]);
  (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (creating || !bookingId) {
      return;
    }
    let live = true;
    setLoading(true);
    _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.get(`/bookings/${bookingId}`).then(res => {
      if (!live) {
        return;
      }
      const model = (0,_lib_booking_adapter_js__WEBPACK_IMPORTED_MODULE_7__.bookingDetailToEditor)(res);
      setDetail(model);
      setStatus(model.status);
      setInternalNote(model.internalNote);
      setPlace(Number(model.locationId) || 0);
      setMoveStaff(Number(model.staffId) || 0);
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

  // Load create catalogs.
  (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (!creating) {
      return;
    }
    Promise.all([_lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.get('/services', {
      status: 'active',
      per_page: 100
    }).catch(() => ({
      items: []
    })), _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.get('/staff', {
      status: 'active',
      per_page: 100
    }).catch(() => ({
      items: []
    })), _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.get('/customers', {
      per_page: 100
    }).catch(() => ({
      items: []
    }))]).then(([svc, stf, cust]) => {
      // Option identity is the record id, never the name (`combobox-options.js`):
      // same-named services/staff/customers must stay distinct rows so the
      // service_id/staff_id submitted below is the record the user clicked.
      const staffCatalog = (0,_lib_combobox_options_js__WEBPACK_IMPORTED_MODULE_19__.staffOptions)(stf.items);
      setCatalog({
        services: (0,_lib_combobox_options_js__WEBPACK_IMPORTED_MODULE_19__.serviceOptions)(svc.items),
        staff: staffCatalog,
        customers: (0,_lib_combobox_options_js__WEBPACK_IMPORTED_MODULE_19__.customerOptions)(cust.items)
      });

      // Calendar hand-off (D-R28, Codex review): a free slot clicked on ONE staff member's
      // calendar was clicked against THEIR hours, so preselect them instead of letting the
      // create fall through to any-staff availability and land the booking on somebody else.
      // A prefilled id the catalog does not carry (e.g. an archived member) selects nothing —
      // better an empty field than a record the admin cannot actually pick.
      const preselected = (0,_lib_combobox_options_js__WEBPACK_IMPORTED_MODULE_19__.findOptionById)(staffCatalog, prefill?.staffId);
      if (preselected) {
        setStaff(preselected);
      }
    });
    // `prefill` is fixed for the life of a create editor (it is read once from the pending-create
    // hand-off when the drawer opens), so it is deliberately not a dependency: re-running this
    // would re-fetch all three catalogs and stamp the staff field back over an admin's own change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creating]);
  (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    closeRef.current?.focus({
      preventScroll: true
    });
  }, []);

  // Availability for create + reschedule. Uses the real engine (public availability).
  const activeServiceId = creating ? service?.id : detail?.serviceId;
  const ownStaffId = Number(detail?.staffId) || 0;
  const activeStaffId = creating ? staff?.id : moveStaff || ownStaffId || undefined;
  // Another member's grid is theirs alone (D-R78): the booking is not on it, so there is nothing
  // of its own to step aside and its current start is offered only if that member is free then.
  const onOwnStaff = creating || !ownStaffId || activeStaffId === ownStaffId;
  const durationMinutes = creating ? service?.duration || _lib_config_js__WEBPACK_IMPORTED_MODULE_5__.config.settings.slotStep : detail ? Math.round((new Date(detail.endUtc) - new Date(detail.startUtc)) / 60000) : _lib_config_js__WEBPACK_IMPORTED_MODULE_5__.config.settings.slotStep;
  const createCustomerEmail = addNew ? newCustomer.email : customer?.email || '';
  // Order adjustments (Premium coupons, D-R67b). The server re-quotes inside reserve, so a
  // create quote is display-only; the booking POST carries the CODE, never an amount.
  const adjust = (0,_aponto_admin_booking_coupon__WEBPACK_IMPORTED_MODULE_26__.useBookingCoupon)({
    creating,
    available: (0,_modules_catalog_js__WEBPACK_IMPORTED_MODULE_20__.moduleAvailable)({
      modules
    }, 'coupons'),
    serviceId: service?.id || null,
    customerEmail: createCustomerEmail,
    detail,
    reloadDetail,
    onChanged,
    showToast
  });
  const loadSlots = (0,react__WEBPACK_IMPORTED_MODULE_1__.useCallback)(() => {
    if (!activeServiceId || !date) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.get('/public/availability', {
      service_id: activeServiceId,
      staff_id: activeStaffId || undefined,
      // D-R63: the times are the picked BRANCH's (its weight-5 hours, its clock). Omitted at
      // `0`, so a site with no branch picked asks exactly what it asked before.
      location_id: place > 0 ? place : undefined,
      from_date: date,
      to_date: date,
      tz: TZ,
      // Edit time (persona QA 2026-10-05, T-043): the booking being moved must not block its
      // own neighbouring starts. Honoured server-side only for a signed-in booking manager.
      exclude_booking_id: !creating && detail?.id && onOwnStaff ? detail.id : undefined,
      // New booking (D-R77): the front desk records a walk-in or a phone call, so the customer
      // lead time and horizon do not apply and today's earlier starts are offered. Honoured
      // server-side only for a signed-in booking manager; working hours and busy time still apply.
      front_desk: creating ? 1 : undefined
    }).then(res => {
      const current = !creating && detail ? detail.startUtc : '';
      const list = (res.slots || []).map(s => ({
        startUtc: s.start_utc,
        label: s.start_utc === current ? `${(0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.timeLabel)(s.start_utc, TZ)} (current)` : (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.timeLabel)(s.start_utc, TZ)
      }));
      // Reschedule: keep the current start selectable even when the grid does not offer it
      // (it is in the past, or the hours changed since it was booked).
      if (current && onOwnStaff && !list.some(s => s.startUtc === current)) {
        list.unshift({
          startUtc: current,
          label: `${(0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.timeLabel)(current, TZ)} (current)`
        });
      }
      setSlots(list);
      setSelectedSlot(prev => list.some(s => s.startUtc === prev) ? prev : list[0]?.startUtc || '');
      setSlotsLoading(false);
    }).catch(() => {
      setSlots([]);
      setSlotsLoading(false);
    });
  }, [activeServiceId, activeStaffId, onOwnStaff, place, date, creating, detail]);
  const wantSlots = creating || reschedule;
  (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (wantSlots) {
      loadSlots();
    }
  }, [wantSlots, loadSlots]);

  // D-R78: the staff roster for "Edit time" — multi-staff sites only, so the Free single profile
  // makes no request and renders nothing new.
  const multiStaff = (0,_modules_catalog_js__WEBPACK_IMPORTED_MODULE_20__.moduleAvailable)({
    modules
  }, 'multi_staff');
  const rosterServiceId = !creating && reschedule && multiStaff ? detail?.serviceId : null;
  (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (!rosterServiceId) {
      return undefined;
    }
    let live = true;
    Promise.all([_lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.get('/staff', {
      status: 'active',
      per_page: 100
    }).catch(() => ({
      items: []
    })), _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.get(`/services/${rosterServiceId}/eligibility`).catch(() => null)]).then(([stf, eligibility]) => {
      if (live) {
        setRoster({
          staff: (0,_lib_combobox_options_js__WEBPACK_IMPORTED_MODULE_19__.staffOptions)(stf.items),
          assignments: Array.isArray(eligibility?.assignments) ? eligibility.assignments : null
        });
      }
    });
    return () => {
      live = false;
    };
  }, [rosterServiceId]);
  const staffChoices = roster ? (0,_lib_editor_rows_js__WEBPACK_IMPORTED_MODULE_10__.rescheduleStaffOptions)({
    staff: roster.staff,
    assignments: roster.assignments,
    locationId: place,
    currentId: ownStaffId,
    currentName: row?.staff || ''
  }) : [];
  // A picked member who is not assigned at the branch now selected falls back to the booking's own.
  const moveStaffValid = !roster || moveStaff === ownStaffId || staffChoices.some(option => option.id === moveStaff);
  (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (!moveStaffValid) {
      setMoveStaff(ownStaffId);
    }
  }, [moveStaffValid, ownStaffId]);
  const derivedEnd = (() => {
    if (!selectedSlot) {
      return '';
    }
    const end = new Date(new Date(selectedSlot).getTime() + durationMinutes * 60000).toISOString();
    return `${(0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.timeLabel)(selectedSlot, TZ)} – ${(0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.timeLabel)(end, TZ)}`;
  })();
  const createSubtotal = Number(service?.price || 0);
  const createQuote = adjust.createQuote;
  const createDiscount = Number(createQuote?.discount_minor || 0);
  const createTotal = createQuote ? Number(createQuote.total_minor || 0) : createSubtotal;

  // D-R63: the picker's options, or null when the site has no active location — then every mode
  // renders exactly what it rendered before (the read-only row / nothing on create).
  // R1 — the booking DTOs carry `location_id` only; its NAME comes from the catalog. A current
  // branch archived since stays in the select, marked "(archived)" like the Services picker marks
  // one, so the booking can be viewed and moved AWAY; no other archived branch is offered.
  const currentLocation = creating ? null : allLocations.find(location => location.id === d0LocationId(detail));
  const locationName = currentLocation?.name || '';
  const locationOptions = locations.length ? (0,_lib_editor_rows_js__WEBPACK_IMPORTED_MODULE_10__.locationSelectOptions)({
    locations,
    currentId: creating ? 0 : d0LocationId(detail),
    currentName: currentLocation && 'active' !== currentLocation.status ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)(/* translators: %s: location name. */
    (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('%s (archived)', 'aponto'), locationName) : locationName,
    businessName: _lib_config_js__WEBPACK_IMPORTED_MODULE_5__.config.business.name,
    noLocation: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('No location', 'aponto')
  }) : null;
  const reschedulable = !creating && ('pending' === detail?.status || 'confirmed' === detail?.status);
  const catalogNotice = catalogIncomplete ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("p", {
    className: "ap-field-error",
    role: "status",
    children: [creating ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('The locations could not be loaded, so this booking cannot be placed yet.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('The locations could not be loaded, so the location cannot be changed right now.', 'aponto'), ' ', /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("button", {
      type: "button",
      className: "pd-button text sm",
      onClick: loadCatalog,
      children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Retry', 'aponto')
    })]
  }) : null;

  // ---- Actions -----------------------------------------------------------
  const submitCreateAction = async () => {
    // D-R77 (front desk): a NEW customer needs a first name only — the last name, the email and the
    // phone are optional, and no email means no customer mail. A PICKED record is sent by its id
    // (`customer_id`) and used as stored, which is what lets a customer with no email be rebooked.
    const chosen = addNew ? {
      first_name: (0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_14__.normalizePart)(newCustomer.first_name),
      last_name: (0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_14__.normalizePart)(newCustomer.last_name),
      email: newCustomer.email.trim(),
      phone: newCustomer.phone
    } : customer ? {
      id: customer.id,
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
      email: customer.email || '',
      phone: customer.phone
    } : null;
    if (addNew) {
      const missing = {};
      if (!chosen.first_name) {
        missing.first_name = (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Enter the first name.', 'aponto');
      }
      setCustomerError(missing);
      if (Object.keys(missing).length) {
        showToast((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('A customer first name is required.', 'aponto'), 'danger');
        return;
      }
    }
    if (!chosen) {
      showToast((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Choose a customer or add a new one.', 'aponto'), 'danger');
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
    const adjustBlocker = adjust.createBlocker();
    if (adjustBlocker) {
      showToast(adjustBlocker, 'danger');
      return;
    }
    setSaving(true);
    try {
      const body = {
        service_id: service.id,
        start_utc: selectedSlot,
        tz: TZ,
        status: createStatus,
        notify
      };
      if (chosen.id) {
        body.customer_id = chosen.id;
      } else {
        body.customer = {
          first_name: chosen.first_name,
          last_name: chosen.last_name,
          email: chosen.email,
          phone: chosen.phone || ''
        };
      }
      if (adjust.createCode) {
        body.coupon_code = adjust.createCode;
      }
      if (staff?.id) {
        body.staff_id = staff.id;
      }
      // D-R63: `POST /bookings` has always taken `location_id`; sent only for a picked branch.
      const locationId = (0,_lib_editor_rows_js__WEBPACK_IMPORTED_MODULE_10__.locationToSend)(place);
      if (undefined !== locationId) {
        body.location_id = locationId;
      }
      const res = await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.post('/bookings', body);
      showToast(`Booking created for ${(0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_14__.displayName)(chosen.first_name, chosen.last_name)} · ${res.booking?.order?.code || ''}`.trim(), 'success');
      onChanged?.();
      onClose?.();
    } catch (err) {
      adjust.handleCreateError(err);
      setCustomerError(customerFieldErrors(err.data?.fields));
      fail(err.message);
      setSaving(false);
    }
  };

  // D-R71e: cancelling a booking paid through an external checkout (WooCommerce) asks the admin
  // how much to refund, instead of closing — the refund itself runs through the gateway.
  const refundAfterCancel = () => !!detail?.order?.externalOrder && ('paid' === detail.order.paymentStatus || 'partial' === detail.order.paymentStatus) && detail.order.refundableMinor > 0;
  const promptRefund = async () => {
    setSaving(false);
    await reloadDetail();
    setRefundOpen(true);
  };
  const saveEditAction = async () => {
    if (!detail) {
      return;
    }
    const statusChanged = status !== detail.status;
    if (statusChanged && status === 'completed' && detail.order.balanceDueMinor > 0 && detail.order.payableNowMinor < detail.order.totalMinor && !balancePrompted.current) {
      setConfirm('balance');
      return;
    }
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
    // The forced move needs its reason (S2-87): say so instead of doing nothing.
    if (statusChanged && (status === 'completed' && confirm === 'complete' || status === 'no_show' && confirm === 'no-show') && !forceReason.trim()) {
      setReasonMissing(true);
      return;
    }
    // D-R63: a location MOVE is a reschedule to the same start and staff at the new branch
    // (rest-contract §2.9 addendum) — the server re-checks the slot, the staff member's
    // assignment and the hours THERE, which a PATCH field would not.
    const moveTo = (0,_lib_editor_rows_js__WEBPACK_IMPORTED_MODULE_10__.locationToSend)(place, d0LocationId(detail));
    if (!statusChanged && !noteChanged && undefined === moveTo) {
      showToast('No changes to save.');
      return;
    }
    setSaving(true);
    const moved = undefined !== moveTo;
    if (moved) {
      let res;
      try {
        // `notify` from the Notify checkbox (browser QA B3): the reschedule route honours it
        // like POST/PATCH (rest-contract §2.9 addendum), so an unticked box emails no one.
        res = await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.put(`/bookings/${detail.id}/reschedule`, {
          start_utc: detail.startUtc,
          staff_id: detail.staffId,
          location_id: moveTo,
          notify
        });
      } catch (err) {
        fail(err.message);
        setSaving(false);
        return;
      }
      // The move LANDED — adopt it from the reschedule's own response, synchronously in this
      // handler, never from a background re-read (D-R63 fix round 1): if the PATCH below fails,
      // the next Save must see the booking already at its new branch and send NO second
      // reschedule (a resend bumps the ICS sequence and emails the customer again).
      const landed = res?.booking;
      setDetail(current => ({
        ...current,
        locationId: Number(landed?.location_id ?? moveTo) || 0,
        icsSequence: landed?.ics_sequence ?? current.icsSequence
      }));
      if (!statusChanged && !noteChanged) {
        const syncNotice = (0,_lib_external_order_sync_js__WEBPACK_IMPORTED_MODULE_0__.externalSyncNotice)(res?.external_order);
        showToast(syncNotice || `${(0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Booking moved.', 'aponto')}${rescheduleSuffix(notify)}`, syncNotice ? 'default' : 'success');
        onChanged?.();
        onClose?.();
        return;
      }
    }
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
      const res = await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.patch(`/bookings/${detail.id}`, body);
      const syncNotice = (0,_lib_external_order_sync_js__WEBPACK_IMPORTED_MODULE_0__.externalSyncNotice)(res?.external_order);
      showToast(syncNotice || (statusChanged ? `Marked ${(LABELS[status] || status).toLowerCase()}.${(0,_lib_notification_outcome_js__WEBPACK_IMPORTED_MODULE_15__.notifiedSuffix)(res?.notification)}` : 'Internal note saved.'), syncNotice ? 'default' : statusChanged ? (0,_lib_notification_outcome_js__WEBPACK_IMPORTED_MODULE_15__.statusTone)(status) : 'success');
      onChanged?.();
      if (statusChanged && 'cancelled' === status && refundAfterCancel()) {
        await promptRefund();
        return;
      }
      onClose?.();
    } catch (err) {
      // A move that landed before this failure is real: say so, and let the list show it.
      fail(moved ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)(/* translators: %s: the reason the other changes could not be saved. */
      (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('The booking was moved, but the other changes were not saved: %s', 'aponto'), err.message) : err.message);
      if (moved) {
        onChanged?.();
      }
      setSaving(false);
      setConfirm(null);
    }
  };
  const doCancelAction = async () => {
    setSaving(true);
    try {
      const res = await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.patch(`/bookings/${detail.id}`, {
        status: 'cancelled',
        notify
      });
      const syncNotice = (0,_lib_external_order_sync_js__WEBPACK_IMPORTED_MODULE_0__.externalSyncNotice)(res?.external_order);
      // A cancellation only stops something: never the `success` tone (D-R64).
      showToast(syncNotice || `Booking cancelled.${(0,_lib_notification_outcome_js__WEBPACK_IMPORTED_MODULE_15__.notifiedSuffix)(res?.notification)}`);
      onChanged?.();
      if (refundAfterCancel()) {
        await promptRefund();
        return;
      }
      onClose?.();
    } catch (err) {
      fail(err.message);
      setSaving(false);
    }
  };

  // "Confirm new time" with the slot (and the branch) still the booking's own is not a reschedule
  // (persona QA 2026-10-05, T-042): it used to bump the calendar sequence and mail the customer
  // that the booking "was rescheduled" to the same time. No change → no request; the server
  // answers such a request as a no-op too.
  // D-R78: another staff member at the same time IS a change (the server's no-op guard compares
  // staff too).
  const staffMoved = !!detail && !!activeStaffId && activeStaffId !== ownStaffId;
  const rescheduleUnchanged = !!detail && selectedSlot === detail.startUtc && place === d0LocationId(detail) && !staffMoved;
  const doRescheduleAction = async () => {
    if (!selectedSlot || rescheduleUnchanged) {
      return;
    }
    setSaving(true);
    try {
      // `notify` from the checkbox on EVERY reschedule (fix round 2): the route defaults to true,
      // so leaving it out used to email the customer whatever the box said.
      const body = {
        start_utc: selectedSlot,
        staff_id: activeStaffId || detail.staffId,
        notify
      };
      // D-R63: the new time may come with a new branch; the slots above were drawn there.
      const moveTo = (0,_lib_editor_rows_js__WEBPACK_IMPORTED_MODULE_10__.locationToSend)(place, d0LocationId(detail));
      if (undefined !== moveTo) {
        body.location_id = moveTo;
      }
      const res = await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.put(`/bookings/${detail.id}/reschedule`, body);
      const syncNotice = (0,_lib_external_order_sync_js__WEBPACK_IMPORTED_MODULE_0__.externalSyncNotice)(res?.external_order);
      // A staff-only change claims nothing about the customer: whether they are mailed is the
      // server's rule (D-R78), and the reschedule response carries no delivery outcome.
      const staffOnly = staffMoved && selectedSlot === detail.startUtc && undefined === moveTo;
      showToast(syncNotice || (staffOnly ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Booking moved to another staff member.', 'aponto') : `Booking rescheduled.${rescheduleSuffix(notify)}`), syncNotice ? 'default' : 'success');
      onChanged?.();
      onClose?.();
    } catch (err) {
      fail(err.message);
      setSaving(false);
    }
  };

  // Generic: core names no gateway and knows no route. The label, the confirmation text and the
  // path all come from the order's own gateway module; the adapter only admits a path under it.
  const runExternalActionAction = async () => {
    const action = detail?.order?.externalOrder?.action;
    if (!action || externalBusy) {
      return;
    }
    if (!(await askConfirm({
      title: action.label,
      message: action.confirm,
      confirmText: action.label
    }))) {
      return;
    }
    setExternalBusy(true);
    try {
      const res = await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.post(action.path, {});
      await reloadDetail();
      showToast(res && typeof res.message === 'string' && res.message || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Done.', 'aponto'), 'success');
      onChanged?.();
    } catch (err) {
      fail(err.message);
    } finally {
      setExternalBusy(false);
    }
  };
  const togglePaidAction = async () => {
    const nextPaid = detail.order.paymentStatus !== 'paid';
    try {
      await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.patch(`/bookings/${detail.id}`, {
        payment_status: nextPaid ? 'paid' : 'none'
      });
      // Re-read rather than patching the local copy: a manual `paid` also RELEASES a live hold
      // server-side (D-R38i), so the order that comes back can differ from the one this branch
      // would have written by hand.
      await reloadDetail();
      showToast(nextPaid ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Marked as paid.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Marked unpaid.', 'aponto'), nextPaid ? 'success' : 'default');
      onChanged?.();
    } catch (err) {
      fail(err.message);
    }
  };
  const recordBalance = async (reverse = false) => {
    setBalanceBusy(true);
    try {
      if (reverse) await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.del(`/bookings/${detail.id}/balance`);else await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.post(`/bookings/${detail.id}/balance`, {});
      await reloadDetail();
      onChanged?.();
      showToast(reverse ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Balance record reversed.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Balance recorded as paid on site.', 'aponto'), 'success');
      return true;
    } catch (err) {
      showToast(err.message, 'danger');
      return false;
    } finally {
      setBalanceBusy(false);
    }
  };
  const doRefundAction = async ({
    amountMinor,
    reason,
    transactionId,
    idempotency,
    onsite
  }) => {
    setRefunding(true);
    try {
      const res = onsite ? await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.post(`/bookings/${detail.id}/balance/refund`, {
        amount_minor: amountMinor
      }, {
        'X-Aponto-Idempotency': idempotency
      }) : await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.post(`/bookings/${detail.id}/refund`, {
        amount_minor: amountMinor,
        reason,
        ...(transactionId ? {
          transaction_id: transactionId
        } : {})
      });
      const txn = res?.transaction || {};
      // A `pending` refund has moved NO money yet (D-R38a(6)) — it only reserves the amount — so
      // the toast must not say the customer has been refunded.
      showToast('pending' === txn.status ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Refund requested — the gateway is still processing it.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)(/* translators: %s: refunded amount, already formatted as money. */
      onsite ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('On-site refund of %s recorded.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Refunded %s.', 'aponto'), (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.money)(txn.amount_minor || amountMinor, txn.currency || detail.order.currency, detail.order.currencyExponent)),
      // D-R64: a refund that LANDED is the thing the operator asked for; a pending one is not
      // done yet, so it stays neutral.
      'pending' === txn.status ? 'default' : 'success');
      setRefundOpen(false);
      await reloadDetail();
      onChanged?.();
    } catch (err) {
      fail(refundErrorMessage(err, detail.order.gateway));
    } finally {
      setRefunding(false);
    }
  };
  const submitCreate = once(submitCreateAction);
  const saveEdit = once(saveEditAction);
  const doCancel = once(doCancelAction);
  const doReschedule = once(doRescheduleAction);
  const runExternalAction = once(runExternalActionAction);
  const togglePaid = once(togglePaidAction);
  const doRefund = once(doRefundAction);

  // ---- Render ------------------------------------------------------------
  const errorText = actionError ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("p", {
    className: "ap-field-error",
    role: "alert",
    children: actionError
  }) : null;
  // The same padded band the Notify choice sits in, directly above the commit buttons.
  const errorBand = errorText ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("div", {
    className: "ap-inspector-notify-row",
    children: errorText
  }) : null;
  const reasonError = reasonMissing ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("p", {
    className: "ap-field-error",
    role: "alert",
    children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Enter a reason — it is recorded in the activity log.', 'aponto')
  }) : null;
  const header = title => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("header", {
    className: "pd-booking-inspector-head pd-booking-editor-head",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("div", {
      className: "pd-booking-inspector-identity",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("h2", {
        id: "bookingInspectorTitle",
        children: title
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("button", {
      className: "pd-icon-button",
      type: "button",
      ref: closeRef,
      "aria-label": "Close booking editor",
      onClick: abandon,
      children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon)('close')
    })]
  });
  if (loading) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.Fragment, {
      children: [header('Booking'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("div", {
        className: "pd-booking-inspector-body",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("p", {
          className: "pd-editor-note",
          children: "Loading\u2026"
        })
      })]
    });
  }
  if (error) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.Fragment, {
      children: [header('Booking'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("div", {
        className: "pd-booking-inspector-body",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("p", {
          className: "pd-editor-note",
          children: error
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("footer", {
        className: "pd-drawer-foot pd-booking-inspector-foot",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("button", {
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
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.Fragment, {
      children: [header('Edit time'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("form", {
        className: "pd-booking-inspector-body pd-compact-editor",
        autoComplete: "off",
        onSubmit: e => e.preventDefault(),
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("section", {
          className: "pd-editor-section",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("div", {
            className: "pd-editor-section-head",
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("h3", {
              children: "Reschedule"
            })
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(Readonly, {
            label: "Service",
            value: row?.service || `Service #${detail.serviceId}`,
            hint: "Cancel & rebook to change the service"
          }), locationOptions ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(LocationSelect, {
            value: place,
            options: locationOptions,
            onChange: setPlace,
            disabled: catalogIncomplete
          }) : null, locationOptions ? catalogNotice : null, staffChoices.length > 1 ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(StaffSelect, {
            value: activeStaffId || ownStaffId,
            options: staffChoices,
            onChange: setMoveStaff
          }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("label", {
            className: "pd-compact-field is-filled",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("input", {
              type: "date",
              name: "date",
              value: date,
              min: _lib_config_js__WEBPACK_IMPORTED_MODULE_5__.config.business.today,
              onChange: e => setDate(e.target.value),
              required: true
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
              className: "pd-compact-label",
              children: "Date"
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(SlotSelect, {
            slots: slots,
            loading: slotsLoading,
            value: selectedSlot,
            onChange: setSelectedSlot
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(Readonly, {
            label: "Ends",
            value: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
              className: "pd-ltr",
              children: derivedEnd || '—'
            })
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("p", {
            className: "pd-editor-note",
            children: (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.businessTimeLineAt)(selectedSlot || (date ? `${date}T12:00:00Z` : ''))
          })]
        })
      }), errorBand, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(NotifyRow, {
        checked: notify,
        onChange: setNotify
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("footer", {
        className: "pd-drawer-foot pd-booking-inspector-foot",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("button", {
          className: "pd-button sm",
          type: "button",
          onClick: () => setReschedule(false),
          children: "Cancel"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("button", {
          className: "pd-button primary sm",
          type: "button",
          disabled: !selectedSlot || saving || rescheduleUnchanged,
          onClick: doReschedule,
          children: saving ? 'Saving…' : 'Confirm new time'
        })]
      })]
    });
  }
  if (creating) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.Fragment, {
      children: [header('New booking'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("form", {
        className: "pd-booking-inspector-body pd-compact-editor",
        autoComplete: "off",
        onSubmit: e => e.preventDefault(),
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("section", {
          className: "pd-editor-section",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
            className: "pd-editor-section-head",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("h3", {
              children: "Customer"
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("button", {
              type: "button",
              className: "pd-section-action",
              onClick: () => setAddNew(v => !v),
              children: addNew ? 'Use existing' : 'Add new'
            })]
          }), addNew ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
            className: "pd-editor-alternate-fields",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
              className: "pd-field-grid",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("label", {
                className: (0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_13__.fieldClass)('pd-compact-field', customerError, 'first_name'),
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("input", {
                  name: "customer_first_name",
                  autoComplete: "off",
                  value: newCustomer.first_name,
                  placeholder: " ",
                  required: true,
                  ...(0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_13__.fieldAria)('booking-customer', customerError, 'first_name'),
                  onChange: e => setNewCustomer(c => ({
                    ...c,
                    first_name: e.target.value
                  }))
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
                  className: "pd-compact-label",
                  children: "First name"
                })]
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("label", {
                className: (0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_13__.fieldClass)('pd-compact-field', customerError, 'last_name'),
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("input", {
                  name: "customer_last_name",
                  autoComplete: "off",
                  value: newCustomer.last_name,
                  placeholder: " ",
                  ...(0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_13__.fieldAria)('booking-customer', customerError, 'last_name'),
                  onChange: e => setNewCustomer(c => ({
                    ...c,
                    last_name: e.target.value
                  }))
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
                  className: "pd-compact-label",
                  children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Last name (optional)', 'aponto')
                })]
              })]
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_13__.FieldErrors, {
              prefix: "booking-customer",
              fieldError: customerError,
              keys: ['first_name', 'last_name']
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
              className: "pd-field-grid",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("label", {
                className: (0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_13__.fieldClass)('pd-compact-field', customerError, 'email'),
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("input", {
                  type: "email",
                  name: "email",
                  value: newCustomer.email,
                  placeholder: " ",
                  ...(0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_13__.fieldAria)('booking-customer', customerError, 'email'),
                  onChange: e => setNewCustomer(c => ({
                    ...c,
                    email: e.target.value
                  }))
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
                  className: "pd-compact-label",
                  children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Email (optional)', 'aponto')
                })]
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("label", {
                className: (0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_13__.fieldClass)('pd-compact-field', customerError, 'phone'),
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("input", {
                  className: "pd-ltr",
                  name: "phone",
                  value: newCustomer.phone,
                  placeholder: " ",
                  ...(0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_13__.fieldAria)('booking-customer', customerError, 'phone'),
                  onChange: e => setNewCustomer(c => ({
                    ...c,
                    phone: e.target.value
                  }))
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
                  className: "pd-compact-label",
                  children: "Phone"
                })]
              })]
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_13__.FieldErrors, {
              prefix: "booking-customer",
              fieldError: customerError,
              keys: ['email', 'phone']
            })]
          }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(_lib_Combobox_jsx__WEBPACK_IMPORTED_MODULE_18__.Combobox, {
            name: "customer",
            label: "Search customer",
            selected: customer,
            entity: true,
            options: catalog.customers,
            onSelect: setCustomer
          }), (addNew ? !newCustomer.email.trim() : customer && !customer.email) ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("p", {
            className: "pd-editor-note",
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('No email: the customer gets no confirmation or reminders.', 'aponto')
          }) : null]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("section", {
          className: "pd-editor-section",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("div", {
            className: "pd-editor-section-head",
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("h3", {
              children: "Services & items"
            })
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("p", {
            className: "pd-editor-note",
            children: _lib_config_js__WEBPACK_IMPORTED_MODULE_5__.config.planEdition === 'premium' ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Products & extras are coming soon.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Products & extras arrive with the Premium extras module.', 'aponto')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(_lib_Combobox_jsx__WEBPACK_IMPORTED_MODULE_18__.Combobox, {
            name: "service",
            label: "Service",
            selected: service,
            options: catalog.services,
            onSelect: setService
          })]
        }), locationOptions || catalogIncomplete ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("section", {
          className: "pd-editor-section",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("div", {
            className: "pd-editor-section-head",
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("h3", {
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Location', 'aponto')
            })
          }), locationOptions ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(LocationSelect, {
            value: place,
            options: locationOptions,
            onChange: setPlace,
            disabled: catalogIncomplete
          }) : null, catalogNotice]
        }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("section", {
          className: "pd-editor-section",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("div", {
            className: "pd-editor-section-head",
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("h3", {
              children: "Schedule"
            })
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
            className: "pd-field-grid",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("label", {
              className: "pd-compact-field is-filled",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("input", {
                type: "date",
                name: "date",
                value: date,
                min: _lib_config_js__WEBPACK_IMPORTED_MODULE_5__.config.business.today,
                onChange: e => setDate(e.target.value),
                required: true
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
                className: "pd-compact-label",
                children: "Date"
              })]
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("label", {
              className: "pd-compact-field pd-compact-select is-filled",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("select", {
                name: "status",
                value: createStatus,
                onChange: e => setCreateStatus(e.target.value),
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("option", {
                  value: "pending",
                  children: "Pending"
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("option", {
                  value: "confirmed",
                  children: "Confirmed"
                })]
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
                className: "pd-compact-label",
                children: "Status"
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
                className: "pd-field-end-icon",
                "aria-hidden": "true",
                children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon)('chevronDown')
              })]
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(SlotSelect, {
            slots: slots,
            loading: slotsLoading,
            value: selectedSlot,
            onChange: setSelectedSlot,
            disabled: !service,
            emptyLabel: service ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('No available times', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Pick a service to see times', 'aponto')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(Readonly, {
            label: "Ends",
            value: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
              className: "pd-ltr",
              children: derivedEnd || 'Select a start time'
            })
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("p", {
            className: "pd-editor-note",
            children: (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.businessTimeLineAt)(selectedSlot || (date ? `${date}T12:00:00Z` : ''))
          }), catalog.staff.length > 1 ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(_lib_Combobox_jsx__WEBPACK_IMPORTED_MODULE_18__.Combobox, {
            name: "staff",
            label: "Staff",
            selected: staff,
            options: catalog.staff,
            onSelect: setStaff,
            required: false
          }) : null]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("section", {
          className: "pd-editor-section",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("div", {
            className: "pd-editor-section-head",
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("h3", {
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Order', 'aponto')
            })
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("dl", {
            className: "pd-value-summary",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("dt", {
                children: service?.label || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Service', 'aponto')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("dd", {
                children: (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.money)(createSubtotal)
              })]
            }), createDiscount > 0 ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
              className: "is-discount",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("dt", {
                children: discountLabel(createQuote.code)
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("dd", {
                children: ["\u2212", (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.money)(createDiscount)]
              })]
            }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
              className: "is-total",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("dt", {
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Total', 'aponto')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("dd", {
                children: (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.money)(createTotal)
              })]
            })]
          }), adjust.createControl]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("section", {
          className: "pd-editor-section",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("div", {
            className: "pd-editor-section-head",
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("h3", {
              children: "Internal notes"
            })
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("label", {
            className: "pd-compact-field pd-compact-notes",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("textarea", {
              name: "note",
              rows: "3",
              placeholder: " ",
              value: internalNote,
              onChange: e => setInternalNote(e.target.value)
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
              className: "pd-compact-label",
              children: "Visible to staff only"
            })]
          })]
        })]
      }), errorBand, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(NotifyRow, {
        checked: notify,
        onChange: setNotify
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("footer", {
        className: "pd-drawer-foot pd-booking-inspector-foot",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("button", {
          className: "pd-button sm",
          type: "button",
          onClick: abandon,
          children: "Cancel"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("button", {
          className: "pd-button primary sm",
          type: "button",
          disabled: saving || 'complete' !== catalogStatus,
          onClick: submitCreate,
          children: saving ? 'Saving…' : 'Create booking'
        })]
      })]
    });
  }

  // ---- Edit mode ---------------------------------------------------------
  const d = detail;
  const total = d.order.totalMinor;
  const subtotal = d.order.subtotalMinor;
  const discount = d.order.discountMinor;
  const tzDiffers = d.customerTimezone && d.customerTimezone !== TZ;
  const statusOptions = [...new Set([d.status, ...nextStatuses(d.status).filter(s => s !== 'cancelled')])];
  // R1 — read-only Staff + Location rows (V1). Staff name comes from the booking
  // row DTO; the location NAME resolves from the cached locations catalog when a
  // real location is set, and `location_id = 0` reads "No location · <business
  // address>" (the wildcard: the booking runs at the business address).
  const staffValue = (0,_lib_editor_rows_js__WEBPACK_IMPORTED_MODULE_10__.staffRowValue)(row);
  const locationValue = (0,_lib_editor_rows_js__WEBPACK_IMPORTED_MODULE_10__.locationRowValue)({
    locationId: d.locationId,
    locationName,
    rowLocation: row?.location,
    businessAddress: _lib_config_js__WEBPACK_IMPORTED_MODULE_5__.config.business.address
  });

  // ---- Order / payment presentation (D-R38) ------------------------------
  const transactions = d.order.transactions || [];
  const payment = (0,_lib_payment_status_js__WEBPACK_IMPORTED_MODULE_22__.paymentBadge)(d.order.paymentReason, {
    holdExpiresAt: d.order.holdExpiresAt,
    holdDeadlineApplies: d.order.holdDeadlineApplies,
    paymentStateReason: d.order.paymentStateReason,
    // Business time, like every other instant in this editor (§5 invariant 6): a hold deadline
    // rendered in the viewer's own zone reads differently for the owner and their agency.
    formatTime: utc => (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.timeLabel)(utc, TZ)
  });
  // The manual switch survives only where the server still accepts it: an order NO gateway has
  // touched. `transactions.length === 0` is the client mirror of `hasAnyCharge()` — a refund row
  // cannot exist without the charge it refunds.
  const manualAllowed = ('none' === d.order.paymentStatus || 'paid' === d.order.paymentStatus) && 0 === transactions.length;
  const couponEditable = ('pending' === d.status || 'confirmed' === d.status) && 'none' === d.order.paymentStatus && !d.order.gateway && 0 === transactions.length;
  // Refunding needs the gateway module to be ACTIVE, not merely to have been used: disabling a
  // module retains its data and takes its actions away (D-R31 / `409 aponto_payment_unavailable`).
  const gatewayLive = !!d.order.gateway && (0,_modules_catalog_js__WEBPACK_IMPORTED_MODULE_20__.moduleAvailable)({
    modules
  }, d.order.gateway);
  const externalRefund = d.order.refundManagement;
  const refundable = !externalRefund && (d.order.refundableCharges ? d.order.refundableCharges.some(charge => charge.available && charge.refundable_minor > 0 && (0,_modules_catalog_js__WEBPACK_IMPORTED_MODULE_20__.moduleAvailable)({
    modules
  }, charge.gateway)) : ('paid' === d.order.paymentStatus || 'partial' === d.order.paymentStatus) && gatewayLive);
  const gatewayMissing = !externalRefund && !!d.order.gateway && !gatewayLive && ('paid' === d.order.paymentStatus || 'partial' === d.order.paymentStatus);
  const onsite = transactions.find(t => t.kind === 'onsite' && t.status === 'succeeded');
  const deposit = d.order.payableNowMinor > 0 && d.order.payableNowMinor < total;
  const canRecord = d.order.canRecordOnsiteBalance ?? (deposit && d.order.paymentStatus === 'partial' && d.order.balanceDueMinor > 0 && !onsite && !d.order.refundPending);
  const canReverse = d.order.canReverseOnsiteBalance ?? (onsite && !transactions.some(t => ['refund', 'onsite_refund'].includes(t.kind) && t.id > onsite.id));
  const refundBlocked = d.order.refundableMinor < 1 || d.order.refundPending || d.order.balancePending;
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.Fragment, {
    children: [header(/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.Fragment, {
      children: ["Edit booking ", /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("span", {
        className: "pd-ltr",
        children: ["#", d.id]
      })]
    })), confirmDialog, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("form", {
      className: "pd-booking-inspector-body pd-compact-editor",
      autoComplete: "off",
      onSubmit: e => e.preventDefault(),
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("section", {
        className: "pd-editor-section",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("div", {
          className: "pd-editor-section-head",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("h3", {
            children: "Customer"
          })
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(Readonly, {
          label: "Customer",
          value: row?.customer || `Customer #${d.customerId}`,
          hint: "Cancel & rebook to change the customer"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(Readonly, {
          label: "Contact",
          value: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
            className: "pd-ltr",
            children: `${row?.email || 'No email'} · ${row?.phone || 'No phone'}`
          })
        }), d.billingAddress ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(Readonly, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Billing address', 'aponto'),
          value: d.billingAddress
        }) : null]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("section", {
        className: "pd-editor-section",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("div", {
          className: "pd-editor-section-head",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("h3", {
            children: "Services & items"
          })
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(Readonly, {
          label: "Service",
          value: `${row?.service || 'Service'} · ${(0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.money)(subtotal, d.order.currency, d.order.currencyExponent)}`,
          hint: "Cancel & rebook to change the service"
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("section", {
        className: "pd-editor-section",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
          className: "pd-editor-section-head",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("h3", {
            children: "Schedule"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("button", {
            type: "button",
            className: "pd-section-action",
            onClick: () => {
              setReschedule(true);
              setSelectedSlot(d.startUtc);
            },
            children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon)('calendar'), "Edit time"]
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(Readonly, {
          label: "Date & time",
          value: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("span", {
            className: "pd-ltr",
            children: [d.dateLabel, " \xB7 ", d.start, "\u2013", d.end]
          })
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("p", {
          className: "pd-editor-note",
          children: [(0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.businessTimeLineAt)(d.startUtc), tzDiffers ? ` · Customer time ${d.timezone}` : '']
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(Readonly, {
          label: "Staff",
          value: staffValue
        }), locationOptions ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.Fragment, {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(LocationSelect, {
            value: place,
            options: locationOptions,
            onChange: setPlace,
            disabled: !reschedulable || catalogIncomplete
          }), catalogNotice, place !== d0LocationId(d) ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("p", {
            className: "pd-editor-note",
            children: notify ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Saving moves this booking to the new location at the same time and notifies the customer, like a reschedule.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Saving moves this booking to the new location at the same time. The customer is not notified.', 'aponto')
          }) : null]
        }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(Readonly, {
          label: "Location",
          value: locationValue
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("label", {
          className: "pd-compact-field pd-compact-select is-filled",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("select", {
            name: "status",
            value: status,
            onChange: e => setStatus(e.target.value),
            children: statusOptions.map(s => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("option", {
              value: s,
              children: d.status === 'cancelled' && s === 'pending' ? 'Pending (restore)' : d.status === 'no_show' && s === 'confirmed' ? 'Confirmed (undo no-show)' : LABELS[s]
            }, s))
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
            className: "pd-compact-label",
            children: "Status"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
            className: "pd-field-end-icon",
            "aria-hidden": "true",
            children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon)('chevronDown')
          })]
        }), 'cancelled' === d.status && (0,_lib_booking_activity_js__WEBPACK_IMPORTED_MODULE_8__.cancellationReason)(d.activities) ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(Readonly, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Cancellation reason', 'aponto'),
          value: (0,_lib_booking_activity_js__WEBPACK_IMPORTED_MODULE_8__.cancellationReason)(d.activities)
        }) : null]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("section", {
        className: "pd-editor-section",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
          className: "pd-editor-section-head",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("h3", {
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Order', 'aponto')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
            className: `pd-status ap-pay-${payment.tone}`,
            title: payment.title,
            children: payment.label
          })]
        }), (0,_bookings_dashboard_stats_js__WEBPACK_IMPORTED_MODULE_23__.needsRefundReview)(d) ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("p", {
          className: "pd-editor-note",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("strong", {
            children: _lib_payment_status_js__WEBPACK_IMPORTED_MODULE_22__.REFUND_REVIEW_LABEL
          }), ` — ${(0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('this booking is cancelled, but its payment was not refunded. Cancelling does not refund automatically.', 'aponto')}`]
        }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(Readonly, {
          label: "Order",
          value: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
            className: "pd-ltr",
            children: d.order.code || '—'
          })
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("dl", {
          className: "pd-value-summary",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("dt", {
              children: row?.service || 'Service'
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("dd", {
              children: (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.money)(subtotal, d.order.currency, d.order.currencyExponent)
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("dt", {
              children: "Products & extras"
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("dd", {
              children: (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.money)(0, d.order.currency, d.order.currencyExponent)
            })]
          }), discount > 0 ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
            className: "is-discount",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("dt", {
              children: discountLabel(d.order.couponCode)
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("dd", {
              children: ["\u2212", (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.money)(discount, d.order.currency, d.order.currencyExponent)]
            })]
          }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
            className: "is-total",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("dt", {
              children: "Total"
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("dd", {
              children: (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.money)(total, d.order.currency, d.order.currencyExponent)
            })]
          })]
        }), deposit ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("dl", {
          className: "pd-value-summary",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("dt", {
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Deposit', 'aponto')
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("dd", {
              children: (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.money)(d.order.payableNowMinor, d.order.currency, d.order.currencyExponent)
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("dt", {
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Collected', 'aponto')
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("dd", {
              children: (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.money)(d.order.netCollectedMinor, d.order.currency, d.order.currencyExponent)
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
            className: "is-total",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("dt", {
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Balance due', 'aponto')
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("dd", {
              children: (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.money)(d.order.balanceDueMinor, d.order.currency, d.order.currencyExponent)
            })]
          })]
        }) : null, adjust.renderEditControl(d, couponEditable), d.order.gateway ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(Readonly, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Payment method', 'aponto'),
          value: d.order.externalOrder?.paymentMethod ? `${(0,_lib_payment_status_js__WEBPACK_IMPORTED_MODULE_22__.gatewayLabel)(d.order.gateway)} · ${d.order.externalOrder.paymentMethod}` : (0,_lib_payment_status_js__WEBPACK_IMPORTED_MODULE_22__.gatewayLabel)(d.order.gateway)
        }) : null, d.order.externalOrder ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(Readonly, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('External order', 'aponto'),
          value: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("span", {
            className: "pd-ltr",
            children: [d.order.externalOrder.url ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("a", {
              href: d.order.externalOrder.url,
              children: d.order.externalOrder.reference
            }) : d.order.externalOrder.reference, d.order.externalOrder.status ? ` · ${d.order.externalOrder.status}` : '', d.order.externalOrder.freshness === 'last_known' ? ` · ${(0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Last known status', 'aponto')}` : '']
          })
        }) : null, d.order.externalOrder?.sync ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(Readonly, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Sync status', 'aponto'),
          value: d.order.externalOrder.sync === 'synced' ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Synced', 'aponto') : d.order.externalOrder.sync === 'pending' ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Sync pending', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Needs review in WooCommerce', 'aponto')
        }) : null, d.order.externalOrder?.notice ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("p", {
          className: "pd-editor-note",
          children: d.order.externalOrder.notice
        }) : null, transactions.length ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(TransactionList, {
          transactions: transactions,
          currencyExponent: d.order.currencyExponent,
          hasExternalOrder: !!d.order.externalOrder
        }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
          className: "ap-order-actions",
          children: [canRecord ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("button", {
            className: "pd-button sm",
            type: "button",
            disabled: balanceBusy,
            onClick: () => recordBalance(),
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Record balance paid on site', 'aponto')
          }) : null, d.order.canRecordOnsiteRefund ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("button", {
            className: "pd-button sm",
            type: "button",
            disabled: refunding || balanceBusy,
            onClick: () => setRefundOpen('onsite'),
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Record on-site refund', 'aponto')
          }) : null, canReverse ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("button", {
            className: "pd-button sm",
            type: "button",
            disabled: balanceBusy,
            onClick: () => recordBalance(true),
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Reverse balance record', 'aponto')
          }) : null, manualAllowed ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("button", {
            className: "pd-button sm",
            type: "button",
            onClick: togglePaid,
            children: d.order.paymentStatus === 'paid' ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Mark unpaid', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Mark as paid', 'aponto')
          }) : null, refundable ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("button", {
            className: "pd-button sm",
            type: "button",
            disabled: refundBlocked,
            onClick: () => setRefundOpen(true),
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Refund', 'aponto')
          }) : null, externalRefund ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("a", {
            className: "pd-button sm",
            href: externalRefund.url,
            rel: "noreferrer",
            children: externalRefund.label
          }) : null, d.order.externalOrder?.action ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("button", {
            className: "pd-button sm",
            type: "button",
            disabled: externalBusy,
            onClick: runExternalAction,
            children: d.order.externalOrder.action.label
          }) : null]
        }), !manualAllowed ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("p", {
          className: "pd-editor-note",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)(/* translators: %s: payment gateway name, e.g. "Stripe". */
          (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Managed by %s.', 'aponto'), '—' === (0,_lib_payment_status_js__WEBPACK_IMPORTED_MODULE_22__.gatewayLabel)(d.order.gateway) ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('the payment gateway', 'aponto') : (0,_lib_payment_status_js__WEBPACK_IMPORTED_MODULE_22__.gatewayLabel)(d.order.gateway))
        }) : null, d.order.balancePending ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("p", {
          className: "pd-editor-note",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('An online balance payment is in progress. Resolve it before recording another payment or refund.', 'aponto')
        }) : null, refundable && d.order.refundPending ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("p", {
          className: "pd-editor-note",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('A refund is already in progress at the gateway.', 'aponto')
        }) : null, gatewayMissing ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("p", {
          className: "pd-editor-note",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)(/* translators: %s: payment gateway name, e.g. "Stripe". */
          (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Enable the %s module to refund this payment.', 'aponto'), (0,_lib_payment_status_js__WEBPACK_IMPORTED_MODULE_22__.gatewayLabel)(d.order.gateway))
        }) : null]
      }), (d.customFields || []).length || d.consentAt ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("section", {
        className: "pd-editor-section",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("div", {
          className: "pd-editor-section-head",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("h3", {
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Booking form answers', 'aponto')
          })
        }), (d.customFields || []).map(f => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(Readonly, {
          label: f.label,
          value: (0,_bookings_form_answers_js__WEBPACK_IMPORTED_MODULE_24__.customFieldValue)(f)
        }, f.slug)), d.consentAt ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(Readonly, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Consent given', 'aponto'),
          value: (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.dateTimeLabel)(d.consentAt)
        }) : null]
      }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("section", {
        className: "pd-editor-section",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("div", {
          className: "pd-editor-section-head",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("h3", {
            children: "Internal notes"
          })
        }), d.customerNote ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(Readonly, {
          label: "Customer note",
          value: d.customerNote
        }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("label", {
          className: "pd-compact-field pd-compact-notes",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("textarea", {
            name: "note",
            rows: "3",
            placeholder: " ",
            value: internalNote,
            onChange: e => setInternalNote(e.target.value)
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
            className: "pd-compact-label",
            children: "Visible to staff only"
          })]
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("details", {
        className: "pd-booking-inspector-disclosure pd-editor-activity",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("summary", {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("span", {
            children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon)('clock'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("strong", {
              children: "Activity"
            })]
          }), (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon)('chevronDown')]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("div", {
          className: "pd-booking-inspector-disclosure-body",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("div", {
            className: "pd-inspector-activity",
            children: d.activities.length ? d.activities.map(a => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {}), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("p", {
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("strong", {
                  children: (0,_lib_booking_activity_js__WEBPACK_IMPORTED_MODULE_8__.activityLabel)(a)
                }), (0,_lib_booking_activity_js__WEBPACK_IMPORTED_MODULE_8__.activityReason)(a) ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("small", {
                  children: (0,_lib_booking_activity_js__WEBPACK_IMPORTED_MODULE_8__.activityReason)(a)
                }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("small", {
                  children: [(0,_lib_booking_activity_js__WEBPACK_IMPORTED_MODULE_8__.activityActor)(a.initiatedBy), a.createdAt ? (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.dateTimeLabel)(a.createdAt) : ''].filter(Boolean).join(' · ')
                })]
              })]
            }, a.id)) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("p", {
              className: "pd-editor-note",
              children: "No activity recorded."
            })
          })
        })]
      })]
    }), refundOpen ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(RefundDialog, {
      order: {
        ...d.order,
        refundableCharges: d.order.refundableCharges?.filter(charge => (0,_modules_catalog_js__WEBPACK_IMPORTED_MODULE_20__.moduleAvailable)({
          modules
        }, charge.gateway))
      },
      onsite: refundOpen === 'onsite',
      busy: refunding,
      onCancel: () => setRefundOpen(false),
      onConfirm: doRefund
    }) : null, confirm === 'balance' ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("footer", {
      className: "pd-drawer-foot pd-drawer-confirm-foot",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("div", {
        className: "pd-drawer-confirm-copy",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("p", {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("strong", {
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('A balance is still due.', 'aponto')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('If you collected it on site, record it before completing this appointment.', 'aponto')
          })]
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
        className: "pd-drawer-confirm-actions",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("button", {
          className: "pd-button sm",
          type: "button",
          disabled: balanceBusy,
          onClick: () => {
            balancePrompted.current = true;
            setConfirm(null);
            saveEdit();
          },
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Continue without recording', 'aponto')
        }), canRecord ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("button", {
          className: "pd-button sm primary",
          type: "button",
          disabled: balanceBusy,
          onClick: async () => {
            if (await recordBalance()) {
              balancePrompted.current = true;
              setConfirm(null);
              saveEdit();
            }
          },
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Record balance paid on site', 'aponto')
        }) : null]
      })]
    }) : confirm === 'cancel' ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("footer", {
      className: "pd-drawer-foot pd-drawer-confirm-foot",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
        className: "pd-drawer-confirm-copy",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("p", {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("strong", {
            children: "Cancel booking?"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
            children: "The slot will be released."
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("label", {
          className: "pd-notify-toggle",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("input", {
            className: "pd-table-checkbox",
            type: "checkbox",
            checked: notify,
            onChange: e => setNotify(e.target.checked)
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
            children: "Notify customer of cancellation"
          })]
        }), errorText]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
        className: "pd-drawer-confirm-actions",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("button", {
          className: "pd-button sm",
          type: "button",
          onClick: () => setConfirm(null),
          children: "Keep"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("button", {
          className: "pd-button sm danger",
          type: "button",
          disabled: saving,
          onClick: doCancel,
          children: "Cancel booking"
        })]
      })]
    }) : confirm === 'complete' ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("footer", {
      className: "pd-drawer-foot pd-drawer-confirm-foot",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
        className: "pd-drawer-confirm-copy",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("p", {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("strong", {
            children: "Complete before the end time?"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
            children: "This appointment has not finished yet."
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("label", {
          className: "pd-compact-field is-filled pd-force-reason",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("input", {
            value: forceReason,
            placeholder: " ",
            required: true,
            "aria-invalid": reasonMissing || undefined,
            onChange: e => {
              setForceReason(e.target.value);
              setReasonMissing(false);
            }
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
            className: "pd-compact-label",
            children: "Reason (recorded in activity)"
          })]
        }), reasonError, errorText]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
        className: "pd-drawer-confirm-actions",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("button", {
          className: "pd-button sm",
          type: "button",
          onClick: () => {
            setConfirm(null);
            setStatus(d.status);
            setReasonMissing(false);
          },
          children: "Keep confirmed"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("button", {
          className: "pd-button sm primary",
          type: "button",
          disabled: saving,
          onClick: saveEdit,
          children: "Complete anyway"
        })]
      })]
    }) : confirm === 'no-show' ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("footer", {
      className: "pd-drawer-foot pd-drawer-confirm-foot",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
        className: "pd-drawer-confirm-copy",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("p", {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("strong", {
            children: "Mark as no-show before the start time?"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
            children: "This appointment has not started yet."
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("label", {
          className: "pd-compact-field is-filled pd-force-reason",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("input", {
            value: forceReason,
            placeholder: " ",
            required: true,
            "aria-invalid": reasonMissing || undefined,
            onChange: e => {
              setForceReason(e.target.value);
              setReasonMissing(false);
            }
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
            className: "pd-compact-label",
            children: "Reason (recorded in activity)"
          })]
        }), reasonError, errorText]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
        className: "pd-drawer-confirm-actions",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("button", {
          className: "pd-button sm",
          type: "button",
          onClick: () => {
            setConfirm(null);
            setStatus(d.status);
            setReasonMissing(false);
          },
          children: "Keep confirmed"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("button", {
          className: "pd-button sm primary",
          type: "button",
          disabled: saving,
          onClick: saveEdit,
          children: "Mark anyway"
        })]
      })]
    }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.Fragment, {
      children: [errorBand, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(NotifyRow, {
        checked: notify,
        onChange: setNotify
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("footer", {
        className: "pd-drawer-foot pd-booking-inspector-foot",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
          className: "pd-inspector-foot-actions",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)(InspectorMoreMenu, {
            cancellable: nextStatuses(d.status).includes('cancelled'),
            onCancel: () => setConfirm('cancel')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("button", {
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
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("label", {
    className: "pd-compact-field pd-compact-select is-filled",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("select", {
      value: value,
      disabled: disabled || loading || !slots.length,
      onChange: e => onChange(e.target.value),
      children: loading ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("option", {
        value: "",
        children: "Loading\u2026"
      }) : slots.length ? slots.map(s => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("option", {
        value: s.startUtc,
        children: s.label
      }, s.startUtc)) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("option", {
        value: "",
        children: emptyLabel
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
      className: "pd-compact-label",
      children: "Available start time"
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
      className: "pd-field-end-icon",
      "aria-hidden": "true",
      children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon)('chevronDown')
    })]
  });
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
  currencyExponent = null,
  hasExternalOrder = false
}) {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("div", {
    className: "ap-txn-list",
    children: transactions.map(t => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsxs)("div", {
      className: "ap-txn-row",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
        className: "ap-txn-kind",
        children: _lib_payment_status_js__WEBPACK_IMPORTED_MODULE_22__.TRANSACTION_KIND_LABELS[t.kind] || t.kind
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
        className: "ap-txn-amount",
        children: (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.money)(t.amountMinor, t.currency, currencyExponent)
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
        className: `ap-txn-status is-${t.status}`,
        children: _lib_payment_status_js__WEBPACK_IMPORTED_MODULE_22__.TRANSACTION_STATUS_LABELS[t.status] || t.status
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
        className: "ap-txn-ref pd-ltr",
        title: (0,_lib_payment_status_js__WEBPACK_IMPORTED_MODULE_22__.transactionRef)(t, hasExternalOrder),
        children: (0,_lib_payment_status_js__WEBPACK_IMPORTED_MODULE_22__.shortRef)((0,_lib_payment_status_js__WEBPACK_IMPORTED_MODULE_22__.transactionRef)(t, hasExternalOrder))
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_27__.jsx)("span", {
        className: "ap-txn-when",
        children: t.createdAt ? (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.dateTimeLabel)(t.createdAt) : ''
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
    return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)(/* translators: %s: payment gateway name, e.g. "Stripe". */
    (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Enable the %s module to refund this payment.', 'aponto'), (0,_lib_payment_status_js__WEBPACK_IMPORTED_MODULE_22__.gatewayLabel)(gateway));
  }
  if ('aponto_payment_error' === code) {
    return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('The gateway refused the refund — try again later.', 'aponto');
  }
  return err?.message || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('The refund could not be completed.', 'aponto');
}

/***/ }

}]);
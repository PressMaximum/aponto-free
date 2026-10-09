"use strict";
(globalThis["webpackChunkaponto"] = globalThis["webpackChunkaponto"] || []).push([["admin-chunk-refund-dialog"],{

/***/ "./assets/src/admin/lib/refund-notice.js"
/*!***********************************************!*\
  !*** ./assets/src/admin/lib/refund-notice.js ***!
  \***********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   refundNotice: () => (/* binding */ refundNotice)
/* harmony export */ });
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _format_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./format.js */ "./assets/src/admin/lib/format.js");
/* harmony import */ var _payment_status_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./payment-status.js */ "./assets/src/admin/lib/payment-status.js");
/**
 * Refund dialog copy, kept free of component imports so it is unit-testable and stays inside the
 * dialog's own chunk (only `RefundDialog.jsx` imports it).
 */




/**
 * What the dialog promises about a refund, before the operator confirms it.
 *
 * A gateway Aponto drives directly returns the money itself and leaves the booking alone. An order
 * settled through an external checkout platform (it carries an `externalOrder` record) is refunded
 * by that platform: some of its payment methods cannot refund automatically, in which case only the
 * refund is recorded there, and the platform's own status rules may cancel a fully refunded
 * upcoming booking. The copy must not promise otherwise.
 *
 * @param {Object} order Order block (adapter shape).
 * @return {string} Notice text.
 */
function refundNotice(order) {
  const amount = (0,_format_js__WEBPACK_IMPORTED_MODULE_1__.money)(order.refundableMinor || 0, order.currency, order.currencyExponent ?? null);
  if (order.externalOrder) {
    return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.sprintf)(/* translators: 1: refundable amount, formatted as money. 2: checkout platform name, e.g. "WooCommerce". */
    (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('%1$s of this payment can still be refunded through %2$s. If the payment method used there refunds automatically, the money goes back to the customer. Otherwise only the refund is recorded and you return the money to the customer yourself. A full refund can cancel an upcoming booking, depending on your status rules.', 'aponto'), amount, (0,_payment_status_js__WEBPACK_IMPORTED_MODULE_2__.gatewayLabel)(order.gateway));
  }
  return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.sprintf)(/* translators: 1: refundable amount, formatted as money. 2: gateway name, e.g. "Stripe". */
  (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('%1$s of this payment can still be refunded through %2$s. The money goes back to the card the customer paid with; the booking is not cancelled.', 'aponto'), amount, (0,_payment_status_js__WEBPACK_IMPORTED_MODULE_2__.gatewayLabel)(order.gateway));
}

/***/ },

/***/ "./assets/src/admin/routes/RefundDialog.jsx"
/*!**************************************************!*\
  !*** ./assets/src/admin/routes/RefundDialog.jsx ***!
  \**************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   RefundDialog: () => (/* binding */ RefundDialog)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _form_lib_idempotency_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../form/lib/idempotency.js */ "./assets/src/form/lib/idempotency.js");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _lib_format_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/format.js */ "./assets/src/admin/lib/format.js");
/* harmony import */ var _lib_payment_status_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../lib/payment-status.js */ "./assets/src/admin/lib/payment-status.js");
/* harmony import */ var _lib_refund_notice_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../lib/refund-notice.js */ "./assets/src/admin/lib/refund-notice.js");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__);
/**
 * Refund confirmation dialog — its OWN chunk (`admin-chunk-refund-dialog`).
 *
 * The most rarely opened surface in the admin: a refund needs a paid order, an enabled
 * gateway module and a deliberate click on a destructive action. It is also perfectly
 * self-contained — an amount, a reason and one call — which is why it was the first thing
 * to take out of `admin.js` when the payment surfaces pushed it past its ~150 KB gz cap
 * (AGENTS §6; the P3 handoff §4 debt item names this dialog). Its `Modal`/`Button` imports
 * ride the `wp-components` external, so what leaves the entry bundle is the dialog itself
 * plus the refund-amount helpers nothing else on the eager path uses.
 *
 * Kept as a component in its own file rather than inlined in `BookingEditor`: the
 * amount/reason state is BORN when the dialog opens and dies when it closes — a refund
 * amount left in the editor's state after a cancel is a number nobody chose, sitting one
 * click away from being sent.
 *
 * The amount defaults to everything still refundable, which is the common case (a full refund)
 * and is also the safe direction to be wrong in: it is visible and editable, and the server
 * refuses anything above it anyway (D-R38a(2)).
 */








function RefundDialog({
  order,
  busy,
  onCancel,
  onConfirm,
  onsite = false
}) {
  const charges = (order.refundableCharges || []).filter(charge => charge.refundable_minor > 0 && charge.available !== false);
  const [transactionId, setTransactionId] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(charges[0]?.transaction_id ?? charges[0]?.id ?? null);
  const charge = charges.find(item => (item.transaction_id ?? item.id) === transactionId);
  const refundable = onsite ? order.onsiteRefundableMinor : charge?.refundable_minor ?? (Array.isArray(order.refundableCharges) ? 0 : order.refundableMinor ?? 0);
  const gateway = charge?.gateway || order.gateway;
  const [idempotency] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(_form_lib_idempotency_js__WEBPACK_IMPORTED_MODULE_1__.generateUuid);
  const [attempted, setAttempted] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const exponent = order.currencyExponent ?? null;
  const [amount, setAmount] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(() => String((0,_lib_format_js__WEBPACK_IMPORTED_MODULE_4__.minorToMajor)(refundable, order.currency, exponent)));
  const [reason, setReason] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)('');
  const error = (0,_lib_payment_status_js__WEBPACK_IMPORTED_MODULE_5__.refundAmountError)(amount, refundable, order.currency, exponent);
  const minor = (0,_lib_payment_status_js__WEBPACK_IMPORTED_MODULE_5__.parseRefundAmount)(amount, order.currency, exponent);
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Modal, {
    title: onsite ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Record an on-site refund', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Refund this payment', 'aponto'),
    onRequestClose: busy ? () => {} : onCancel,
    className: "ap-confirm-modal",
    size: "small",
    focusOnMount: "firstContentElement",
    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
      className: "ap-confirm",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("p", {
        className: "ap-confirm-message",
        children: onsite ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Only record this after you have returned the money to the customer outside Aponto. This action does not transfer money or cancel the booking.', 'aponto')
        // The selected charge's refundable amount and gateway (D-R71: a deposit order can
        // hold a deposit charge and a balance charge on different gateways).
        : (0,_lib_refund_notice_js__WEBPACK_IMPORTED_MODULE_6__.refundNotice)({
          ...order,
          refundableMinor: refundable,
          gateway
        })
      }), !onsite && charges.length > 1 ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("label", {
        className: "ap-refund-field",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("span", {
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Payment to refund', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("select", {
          className: "ap-confirm-input",
          value: transactionId,
          disabled: busy,
          onChange: event => {
            const id = Number(event.target.value);
            setTransactionId(id);
            const selected = charges.find(item => (item.transaction_id ?? item.id) === id);
            setAmount(String((0,_lib_format_js__WEBPACK_IMPORTED_MODULE_4__.minorToMajor)(selected.refundable_minor, order.currency, exponent)));
          },
          children: charges.map(item => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("option", {
            value: item.transaction_id ?? item.id,
            children: (0,_lib_payment_status_js__WEBPACK_IMPORTED_MODULE_5__.gatewayLabel)(item.gateway) + ' · #' + (item.transaction_id ?? item.id) + ' · ' + (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_4__.money)(item.refundable_minor, order.currency, exponent)
          }, item.transaction_id ?? item.id))
        })]
      }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("label", {
        className: "ap-refund-field",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("span", {
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)(/* translators: %s: ISO currency code, e.g. "USD". */
          (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Amount (%s)', 'aponto'), order.currency)
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("input", {
          className: "ap-confirm-input",
          type: "text",
          inputMode: "decimal",
          disabled: busy || onsite && attempted,
          value: amount,
          onChange: e => setAmount(e.target.value)
        })]
      }), error ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("p", {
        className: "ap-refund-error",
        children: error
      }) : null, !onsite ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("label", {
        className: "ap-refund-field",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("span", {
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Reason (optional, recorded in the activity log)', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("textarea", {
          className: "ap-confirm-input",
          rows: 2,
          value: reason,
          onChange: e => setReason(e.target.value)
        })]
      }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
        className: "ap-confirm-actions",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
          variant: "tertiary",
          disabled: busy,
          onClick: onCancel,
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Cancel', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
          variant: "primary",
          isDestructive: true,
          isBusy: busy,
          disabled: busy || !!error,
          onClick: () => {
            setAttempted(true);
            onConfirm({
              amountMinor: minor,
              reason,
              transactionId,
              idempotency,
              onsite
            });
          },
          children: busy ? onsite ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Recording…', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Refunding…', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)(/* translators: %s: amount to refund, formatted as money. */
          onsite ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Record refund %s', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Refund %s', 'aponto'), (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_4__.money)(minor || 0, order.currency, exponent))
        })]
      })]
    })
  });
}

/***/ },

/***/ "./assets/src/form/lib/idempotency.js"
/*!********************************************!*\
  !*** ./assets/src/form/lib/idempotency.js ***!
  \********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createIdempotencyManager: () => (/* binding */ createIdempotencyManager),
/* harmony export */   draftFingerprint: () => (/* binding */ draftFingerprint),
/* harmony export */   generateUuid: () => (/* binding */ generateUuid)
/* harmony export */ });
/**
 * Idempotency key lifecycle — SPEC-P0 §5.6 / rest-contract §3.4 / SPEC-P1 §2.2.
 *
 * Rules the client must honour:
 *  1. A canonical v4 UUID is created when the visitor enters the step that owns
 *     the final Book CTA (Details in V1).
 *  2. The SAME key is reused across every safe retry (409 slot-taken, 425, 429,
 *     503, network) so the server can replay the already-committed booking.
 *  3. The key is regenerated the instant the booking draft changes — going back
 *     to pick a different slot, or editing any field the server fingerprints —
 *     so a fresh request never collides as `aponto_idempotency_conflict`.
 *
 * We tie the key to a fingerprint of the exact fields the server hashes
 * (`RequestFingerprint::forBooking`): change any of them and the key rotates;
 * keep them identical and the key is stable across retries. The header must
 * satisfy `wp_is_uuid()` (RFC-4122 v4), which both `crypto.randomUUID()` and the
 * fallback below produce.
 *
 * Pure module: no Preact, no DOM. Unit-testable.
 */

/**
 * Generate a canonical RFC-4122 v4 UUID that `wp_is_uuid()` accepts.
 *
 * @return {string} UUID.
 */
function generateUuid() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // fall through to manual construction
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  // Version 4 + RFC-4122 variant bits (bitwise is required by the UUID spec).
  /* eslint-disable no-bitwise */
  bytes[6] = bytes[6] & 0x0f | 0x40;
  bytes[8] = bytes[8] & 0x3f | 0x80;
  /* eslint-enable no-bitwise */
  const hex = [];
  for (let i = 0; i < 256; i++) {
    hex.push((i + 0x100).toString(16).slice(1));
  }
  return hex[bytes[0]] + hex[bytes[1]] + hex[bytes[2]] + hex[bytes[3]] + '-' + hex[bytes[4]] + hex[bytes[5]] + '-' + hex[bytes[6]] + hex[bytes[7]] + '-' + hex[bytes[8]] + hex[bytes[9]] + '-' + hex[bytes[10]] + hex[bytes[11]] + hex[bytes[12]] + hex[bytes[13]] + hex[bytes[14]] + hex[bytes[15]];
}

/**
 * A stable fingerprint of the fields the server hashes for idempotency. Any
 * change rotates the key; identical drafts share a key across retries. Email is
 * normalised (lowercase + trim) to mirror the server's `email_norm`.
 *
 * LOCKSTEP with `RequestFingerprint::forBooking()` (D-R30). The two encodings
 * differ on purpose — hashing here would mean shipping SHA-256 into a 60 KB
 * budget — but the FIELD SET must match: a field the server hashes and this
 * function ignores is a field the visitor can edit without rotating the key,
 * and the next retry comes back `409 aponto_idempotency_conflict` on a booking
 * they legitimately changed. `tests/fixtures/idempotency-lockstep.json` drives
 * one Jest test and one PHPUnit test over the same drafts so the two field sets
 * cannot silently drift apart.
 *
 * The customer name is fingerprinted as its two parts, `first_name` and
 * `last_name` (name split, D-R69), exactly as the server hashes them.
 *
 * `custom_fields` is included only when the draft carries answers, matching the
 * server, so a site collecting none fingerprints exactly as it did before.
 * `payment_method` follows the same rule (D-R38): a site that takes no online
 * payment fingerprints byte-identically to the pre-payment build, and switching
 * between "pay now" and "pay on site" rotates the key — which it must, because
 * that is a different booking request, not a retry of the same one.
 *
 * `location_id` (D-R62) is the value the widget SENDS, and it joins only when non-null. The
 * server hashes the CLIENT-SENT `location_id ?? 0` — never the id it resolved (rest-contract §3.3
 * addendum 2026-09-23) — so the two sides agree exactly: a null here is `0` there, which is the
 * hash every site produced before D-R61, and changing branch changes both. Without this field a
 * branch change would keep the key and the retry would come back `409
 * aponto_idempotency_conflict`. Hashing the sent value rather than the resolved one is also what
 * lets a retry REPLAY after the server's own assignment moved (a branch archived between the two
 * attempts) instead of colliding.
 *
 * @param {Object} draft Booking draft.
 * @return {string} Fingerprint.
 */
function draftFingerprint(draft) {
  const d = draft || {};
  const c = d.customer || {};
  const canonical = {
    service_id: d.service_id ?? null,
    staff_id: d.staff_id ?? null,
    start_utc: d.start_utc ?? null,
    tz: d.tz ?? null,
    // The two stored parts replace the pre-split `name` (founder 2026-10-01,
    // D-R69): moving a word between them is a different booking request.
    first_name: (c.first_name || '').trim(),
    last_name: (c.last_name || '').trim(),
    email: (c.email || '').trim().toLowerCase(),
    phone: (c.phone || '').trim(),
    note: c.note || '',
    consent: !!d.consent
  };
  if (d.location_id) {
    canonical.location_id = d.location_id;
  }
  if (d.payment_method) {
    canonical.payment_method = d.payment_method;
  }
  if (d.payment_amount_mode === 'full') {
    canonical.payment_amount_mode = 'full';
  }
  if (d.coupon_code) {
    canonical.coupon_code = d.coupon_code;
  }
  const custom = d.custom_fields || {};
  const slugs = Object.keys(custom).sort();
  if (slugs.length) {
    const sorted = {};
    slugs.forEach(slug => {
      sorted[slug] = custom[slug];
    });
    canonical.custom_fields = sorted;
  }
  return JSON.stringify(canonical);
}

/**
 * Create an idempotency-key manager.
 *
 * @return {{keyFor:(draft:Object)=>string, current:()=>?string, reset:()=>void}} Manager.
 */
function createIdempotencyManager() {
  let key = null;
  let fingerprint = null;
  return {
    /**
     * Return the key for a draft, rotating it when the draft changed.
     *
     * @param {Object} draft Booking draft.
     * @return {string} Idempotency key.
     */
    keyFor(draft) {
      const fp = draftFingerprint(draft);
      if (!key || fp !== fingerprint) {
        key = generateUuid();
        fingerprint = fp;
      }
      return key;
    },
    /** @return {?string} The current key without rotating. */
    current() {
      return key;
    },
    /** Clear the key (after a committed booking / "book another"). */
    reset() {
      key = null;
      fingerprint = null;
    }
  };
}

/***/ }

}]);
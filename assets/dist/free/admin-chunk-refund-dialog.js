"use strict";
(globalThis["webpackChunkaponto"] = globalThis["webpackChunkaponto"] || []).push([["admin-chunk-refund-dialog"],{

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
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _lib_format_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../lib/format.js */ "./assets/src/admin/lib/format.js");
/* harmony import */ var _lib_payment_status_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/payment-status.js */ "./assets/src/admin/lib/payment-status.js");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__);
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
  onConfirm
}) {
  const refundable = order.refundableMinor || 0;
  const exponent = order.currencyExponent ?? null;
  const [amount, setAmount] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(() => String((0,_lib_format_js__WEBPACK_IMPORTED_MODULE_3__.minorToMajor)(refundable, order.currency, exponent)));
  const [reason, setReason] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)('');
  const error = (0,_lib_payment_status_js__WEBPACK_IMPORTED_MODULE_4__.refundAmountError)(amount, refundable, order.currency, exponent);
  const minor = (0,_lib_payment_status_js__WEBPACK_IMPORTED_MODULE_4__.parseRefundAmount)(amount, order.currency, exponent);
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Modal, {
    title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Refund this payment', 'aponto'),
    onRequestClose: busy ? () => {} : onCancel,
    className: "ap-confirm-modal",
    size: "small",
    focusOnMount: "firstContentElement",
    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
      className: "ap-confirm",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("p", {
        className: "ap-confirm-message",
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.sprintf)(/* translators: 1: refundable amount, formatted as money. 2: gateway name, e.g. "Stripe". */
        (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('%1$s of this payment can still be refunded through %2$s. The money goes back to the card the customer paid with; the booking is not cancelled.', 'aponto'), (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_3__.money)(refundable, order.currency, exponent), (0,_lib_payment_status_js__WEBPACK_IMPORTED_MODULE_4__.gatewayLabel)(order.gateway))
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("label", {
        className: "ap-refund-field",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.sprintf)(/* translators: %s: ISO currency code, e.g. "USD". */
          (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Amount (%s)', 'aponto'), order.currency)
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("input", {
          className: "ap-confirm-input",
          type: "text",
          inputMode: "decimal",
          value: amount,
          onChange: e => setAmount(e.target.value)
        })]
      }), error ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("p", {
        className: "ap-refund-error",
        children: error
      }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("label", {
        className: "ap-refund-field",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Reason (optional, recorded in the activity log)', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("textarea", {
          className: "ap-confirm-input",
          rows: 2,
          value: reason,
          onChange: e => setReason(e.target.value)
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
        className: "ap-confirm-actions",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Button, {
          variant: "tertiary",
          disabled: busy,
          onClick: onCancel,
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Cancel', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Button, {
          variant: "primary",
          isDestructive: true,
          isBusy: busy,
          disabled: busy || !!error,
          onClick: () => onConfirm({
            amountMinor: minor,
            reason
          }),
          children: busy ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Refunding…', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.sprintf)(/* translators: %s: amount to refund, formatted as money. */
          (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Refund %s', 'aponto'), (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_3__.money)(minor || 0, order.currency, exponent))
        })]
      })]
    })
  });
}

/***/ }

}]);
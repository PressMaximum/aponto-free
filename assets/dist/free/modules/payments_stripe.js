/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./assets/src/modules/payments_stripe/PaymentsStripePanel.jsx"
/*!********************************************************************!*\
  !*** ./assets/src/modules/payments_stripe/PaymentsStripePanel.jsx ***!
  \********************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ PaymentsStripePanel),
/* harmony export */   modeBanner: () => (/* binding */ modeBanner)
/* harmony export */ });
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/api-fetch */ "@wordpress/api-fetch");
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _styles_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./styles.js */ "./assets/src/modules/payments_stripe/styles.js");
/* harmony import */ var _rest_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./rest.js */ "./assets/src/modules/payments_stripe/rest.js");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__);
/**
 * Stripe settings panel — the `#modules/payments_stripe` surface (D-R39, D-R39b).
 *
 * Six sections, in the order the setup actually happens, because it IS a sequence and a panel that
 * hides that makes step three look broken:
 *
 *   1. **What this does** — one short paragraph. The card's own sentence is rendered by the host
 *      above this panel, so nothing here repeats it.
 *   2. **Mode** — a two-option switch, Test or Live, and a one-line status saying whether the
 *      chosen mode is actually set up. The mode is a SETTING (D-R39b), not something derived from
 *      the key prefix: deriving it meant the site could hold one key set, so going live destroyed
 *      the test setup and there was no way back without re-pasting credentials.
 *   3. **Test keys** and 4. **Live keys** — one card each, both stored, the inactive one collapsed.
 *      Each holds a publishable key (plain), a secret key and a signing secret (saved / Replace /
 *      Clear), plus the endpoint note and the one-click "Register webhook with Stripe" button.
 *      Stripe issues a DIFFERENT signing secret per mode, which the copy says out loud because it
 *      is the single most common way a live launch silently stops recording payments.
 *   5. **Test connection** — one probe against the ACTIVE mode's saved keys, answered as a line
 *      with a status dot. A driver that is not loaded answers `501 aponto_driver_missing` from core
 *      itself, and that is reported honestly instead of read as a failure of the owner's keys.
 *   6. **Options** — the two settings that are Stripe's rather than Aponto's: whether Stripe emails
 *      its own receipt, and the suffix on the customer's bank statement.
 *
 * WHAT IS DELIBERATELY NOT HERE: whether payment is off/optional/required, how long a slot is held,
 * and whether a paid booking auto-confirms. Those are BOOKING policy — they apply to every gateway,
 * PayPal included — so they live in Settings → Booking → Payments, and the footer note says so
 * rather than duplicating them here where a second gateway would immediately contradict them.
 *
 * SETTINGS ARE HARD-WIRED, NOT SCHEMA-DRIVEN. `GET /modules/{code}/settings` answers `{code,
 * settings}` and does NOT return the schema (`ModulesController::representation()`), so there is
 * nothing generic to render from; the keys below mirror the driver's schema by name. Field-level
 * VALIDATION stays generic: whatever the server names in its 422 `data.fields` map is rendered
 * under that field, so prefix rules and length caps are stated in exactly one place — the driver.
 */








const boot = typeof window !== 'undefined' ? window.apontoAdmin || {} : {};
_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_0___default().use(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_0___default().createNonceMiddleware(boot.nonce || ''));
const REST = boot.restUrl || boot.restBase || '/wp-json/aponto/v1';
/** The site currency, for the readiness reason whose sentence names it. */
const CURRENCY = boot.currency || '';
const SETTINGS_URL = `${REST}/modules/${_rest_js__WEBPACK_IMPORTED_MODULE_5__.MODULE_CODE}/settings`;
const TEST_URL = `${REST}/modules/${_rest_js__WEBPACK_IMPORTED_MODULE_5__.MODULE_CODE}/test`;
const WEBHOOK_ENDPOINT_URL = `${REST}/stripe/webhook-endpoint`;

/** Statement descriptor suffixes are capped by Stripe at 22 characters. */
const DESCRIPTOR_MAX = 22;

/**
 * Copy text to the clipboard, falling back to a selection when the async API is unavailable
 * (an admin page served over plain HTTP has no `navigator.clipboard`).
 *
 * @param {string} text Text to copy.
 * @return {Promise<boolean>} Whether the copy succeeded.
 */
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    // Fall through to the legacy path.
  }
  try {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(field);
    return ok;
  } catch (e) {
    return false;
  }
}

/**
 * The banner's copy + tone for the CHOSEN mode.
 *
 * Exported for the unit tests: this is the one line on the panel that is allowed to reassure
 * somebody that no real money is moving, so it says what the switch says and nothing else. It is
 * the switch rather than the key prefix now (D-R39b), and the two cannot disagree because each key
 * is validated against its own set on the way in.
 *
 * @param {string} mode Active mode.
 * @return {{tone: string, title: string, detail: string}} Banner.
 */
function modeBanner(mode) {
  if ('live' === mode) {
    return {
      tone: 'is-live',
      title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Live mode', 'aponto'),
      detail: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Real cards will be charged.', 'aponto')
    };
  }
  return {
    tone: 'is-test',
    title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Test mode', 'aponto'),
    detail: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('No real charges. Use Stripe’s test cards to try a booking end to end.', 'aponto')
  };
}

/**
 * A secret field with the saved / Replace / Clear treatment (D-17).
 *
 * The same three states as the Google panel's client secret, extracted here because this panel has
 * TWO of them and a second inline copy would be two chances to get the wire markers wrong.
 *
 * @param {Object} props Field props.
 */
function SecretField({
  label,
  help,
  savedLabel,
  clearLabel,
  keepLabel,
  isSet,
  mode,
  value,
  error,
  onPatch
}) {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
    className: "ap-module-panel__field",
    children: [isSet && _rest_js__WEBPACK_IMPORTED_MODULE_5__.SECRET_KEEP === mode ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
      className: "ap-module-panel__actions",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
        className: "apst-pill is-ok",
        children: savedLabel
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Button, {
        variant: "secondary",
        onClick: () => onPatch(_rest_js__WEBPACK_IMPORTED_MODULE_5__.SECRET_REPLACE, ''),
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Replace', 'aponto')
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Button, {
        variant: "tertiary",
        isDestructive: true,
        onClick: () => onPatch(_rest_js__WEBPACK_IMPORTED_MODULE_5__.SECRET_CLEAR, ''),
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Clear', 'aponto')
      })]
    }) : null, _rest_js__WEBPACK_IMPORTED_MODULE_5__.SECRET_CLEAR === mode ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
      className: "ap-module-panel__actions",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
        className: "apst-pill is-warn",
        children: clearLabel
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Button, {
        variant: "tertiary",
        onClick: () => onPatch(_rest_js__WEBPACK_IMPORTED_MODULE_5__.SECRET_KEEP, ''),
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Keep it', 'aponto')
      })]
    }) : null, !isSet || _rest_js__WEBPACK_IMPORTED_MODULE_5__.SECRET_REPLACE === mode ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.Fragment, {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.TextControl, {
        label: label,
        type: "password",
        value: value,
        autoComplete: "off",
        onChange: next => onPatch(_rest_js__WEBPACK_IMPORTED_MODULE_5__.SECRET_REPLACE, next),
        help: help,
        __nextHasNoMarginBottom: true
      }), isSet ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("div", {
        className: "ap-module-panel__actions",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Button, {
          variant: "tertiary",
          onClick: () => onPatch(_rest_js__WEBPACK_IMPORTED_MODULE_5__.SECRET_KEEP, ''),
          children: keepLabel
        })
      }) : null]
    }) : null, error ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
      className: "ap-module-panel__error",
      children: error
    }) : null]
  });
}

/**
 * The `#modules/payments_stripe` panel.
 */
function PaymentsStripePanel() {
  const [form, setForm] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)(null);
  // The server's own readiness report, when it sends one (Codex r1 #14/#18) — the terms this
  // panel cannot see (a site currency Stripe will not take, a module switched off) plus the
  // canonical webhook URL and the event list the driver actually acts on.
  const [status, setStatus] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)(null);
  const [loading, setLoading] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)(true);
  const [saving, setSaving] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)(false);
  const [testing, setTesting] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)(false);
  const [testResult, setTestResult] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)(null);
  const [error, setError] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)('');
  const [fields, setFields] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)({});
  const [notice, setNotice] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)('');
  const [copied, setCopied] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)(false);
  const [registering, setRegistering] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)('');
  const [openSet, setOpenSet] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)('');
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useEffect)(() => {
    (0,_styles_js__WEBPACK_IMPORTED_MODULE_4__.ensurePanelStyles)();
  }, []);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useEffect)(() => {
    let alive = true;
    _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_0___default()({
      url: SETTINGS_URL
    }).then(settings => {
      if (!alive) {
        return;
      }
      setForm((0,_rest_js__WEBPACK_IMPORTED_MODULE_5__.formFromSettings)(settings));
      setStatus((0,_rest_js__WEBPACK_IMPORTED_MODULE_5__.statusFromSettings)(settings));
      setLoading(false);
    }).catch(err => {
      if (!alive) {
        return;
      }
      setError((0,_rest_js__WEBPACK_IMPORTED_MODULE_5__.friendlyError)(err, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Could not load the Stripe settings.', 'aponto')));
      setStatus(null);
      // Render the form anyway, from defaults: a site whose driver has not booted still
      // gets a readable screen that explains itself, rather than a bare error card that
      // hides the webhook URL and the local-development note.
      setForm((0,_rest_js__WEBPACK_IMPORTED_MODULE_5__.formFromSettings)({}));
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);
  const patch = changes => {
    setForm(prev => ({
      ...prev,
      ...changes
    }));
    setNotice('');
  };
  const patchSet = (mode, changes) => {
    setForm(prev => ({
      ...prev,
      sets: {
        ...prev.sets,
        [mode]: {
          ...prev.sets[mode],
          ...changes
        }
      }
    }));
    setNotice('');
  };
  const registerWebhook = mode => {
    setRegistering(mode);
    setError('');
    setNotice('');
    _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_0___default()({
      url: WEBHOOK_ENDPOINT_URL,
      method: 'POST',
      data: {
        mode
      }
    }).then(res => {
      // The signing secret is NOT in this response by design — the server sealed it. So the
      // panel records that the field is now set rather than trying to show a value.
      patchSet(mode, {
        webhookIsSet: true,
        webhookMode: _rest_js__WEBPACK_IMPORTED_MODULE_5__.SECRET_KEEP,
        webhookValue: '',
        endpointId: res && res.endpoint_id || ''
      });
      setNotice(res && res.refreshed ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Webhook endpoint updated in Stripe.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Webhook endpoint created in Stripe and the signing secret saved.', 'aponto'));
    }).catch(err => {
      const map = (0,_rest_js__WEBPACK_IMPORTED_MODULE_5__.fieldErrors)(err);
      setFields(map);
      setError(Object.keys(map).length ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Stripe could not register the endpoint — see the fields below.', 'aponto') : (0,_rest_js__WEBPACK_IMPORTED_MODULE_5__.friendlyError)(err, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Could not register the webhook endpoint with Stripe.', 'aponto')));
    }).finally(() => setRegistering(''));
  };
  const clearFieldError = key => setFields(prev => {
    if (!prev[key]) {
      return prev;
    }
    const next = {
      ...prev
    };
    delete next[key];
    return next;
  });
  const save = () => {
    setSaving(true);
    setError('');
    setNotice('');
    setFields({});
    _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_0___default()({
      url: SETTINGS_URL,
      method: 'PUT',
      data: (0,_rest_js__WEBPACK_IMPORTED_MODULE_5__.settingsBody)(form)
    }).then(res => {
      setForm((0,_rest_js__WEBPACK_IMPORTED_MODULE_5__.formFromSettings)(res));
      setStatus((0,_rest_js__WEBPACK_IMPORTED_MODULE_5__.statusFromSettings)(res));
      setNotice((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Stripe settings saved.', 'aponto'));
      // A saved key can invalidate the last probe, so the old result must not linger and
      // claim the NEW keys were tested.
      setTestResult(null);
    }).catch(err => {
      const map = (0,_rest_js__WEBPACK_IMPORTED_MODULE_5__.fieldErrors)(err);
      setFields(map);
      setError(Object.keys(map).length ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Some values were not accepted — see the fields below.', 'aponto') : (0,_rest_js__WEBPACK_IMPORTED_MODULE_5__.friendlyError)(err, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Could not save the Stripe settings.', 'aponto')));
    }).finally(() => setSaving(false));
  };
  const test = () => {
    setTesting(true);
    setError('');
    setNotice('');
    setTestResult(null);
    _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_0___default()({
      url: TEST_URL,
      method: 'POST',
      data: {}
    }).then(res => setTestResult((0,_rest_js__WEBPACK_IMPORTED_MODULE_5__.testResultLine)(res)))
    // A failed probe is a RESULT, not a page error: an unreachable gateway or a missing
    // driver is exactly what this button exists to discover, so it is reported on the line
    // beside the button instead of as a banner about the panel.
    .catch(err => setTestResult((0,_rest_js__WEBPACK_IMPORTED_MODULE_5__.testResultLine)({
      ok: false,
      code: err && err.code ? err.code : '',
      message: (0,_rest_js__WEBPACK_IMPORTED_MODULE_5__.friendlyError)(err, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('The connection test did not succeed.', 'aponto'))
    }))).finally(() => setTesting(false));
  };
  if (loading) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("div", {
      className: "ap-module-panel apst",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Spinner, {})
    });
  }

  // A server that says "not ready" REPLACES the mode banner: "Test mode" over a gateway checkout
  // will not offer describes a state the site is not in. When the server says nothing, or says
  // ready, the SWITCH's own sentence is the more useful one (D-R39b — the mode is the setting,
  // not the key prefix).
  const banner = (0,_rest_js__WEBPACK_IMPORTED_MODULE_5__.readinessLine)(status, CURRENCY) || modeBanner(form.mode);
  // The completeness of the ACTIVE key set, which is a different question from readiness: this
  // one the panel CAN answer on its own, from the form the owner is still editing, and it stays
  // truthful between a staged clear and the save that commits it.
  const modeLine = (0,_rest_js__WEBPACK_IMPORTED_MODULE_5__.modeStatus)(form.mode, form.sets);
  // Both come from the SERVER's status block or not at all (D-R40b, Codex r2 B5). Under an
  // asset/PHP version skew there is nothing to show, and this panel says so rather than
  // reconstructing either: an endpoint derived from the browser's origin, or an event list kept
  // on this side, is one an operator would register with Stripe and trust. The one-click button
  // registers the server's own URL for the same reason — it never sends one from here.
  const endpoint = (0,_rest_js__WEBPACK_IMPORTED_MODULE_5__.webhookEndpoint)(status);
  const events = (0,_rest_js__WEBPACK_IMPORTED_MODULE_5__.webhookEvents)(status);
  const listen = endpoint ? `stripe listen --forward-to ${endpoint}` : '';
  const local = (0,_rest_js__WEBPACK_IMPORTED_MODULE_5__.isLocalHost)(typeof window !== 'undefined' ? window.location.hostname : '');
  const webhookUnavailable = (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Reload the page to load the webhook details.', 'aponto');
  // DISABLED WHILE A REGISTRATION IS IN FLIGHT (Codex round 2, NEW-1). Both buttons write the same
  // option, and the server now serializes them — but the loser of that race gets a `503`, and the
  // one press that can produce it is a Save landing in the two seconds the button beside it is
  // talking to Stripe. Taking the press away is the honest version of the same answer: the panel
  // knows the write is busy, so it says so instead of sending a request it expects to be refused.
  const saveButton = /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("div", {
    className: "ap-module-panel__actions",
    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Button, {
      variant: "primary",
      isBusy: saving,
      disabled: saving || !!registering,
      onClick: save,
      children: saving ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Saving…', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Save changes', 'aponto')
    })
  });
  return (
    /*#__PURE__*/
    // `ap-module-panel` is the SHARED panel geometry every module settings screen uses
    // (admin-extra.css, owned by the free-shipped panel host); `apst` carries only what is
    // specific to this gateway.
    (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
      className: "ap-module-panel apst",
      children: [error ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Notice, {
        status: "error",
        onRemove: () => setError(''),
        children: error
      }) : null, notice ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Notice, {
        status: "success",
        onRemove: () => setNotice(''),
        children: notice
      }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Card, {
        className: "ap-module-panel__section",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.CardHeader, {
          className: "ap-module-panel__section-head",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("h2", {
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('How Stripe payments work here', 'aponto')
          })
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.CardBody, {
          className: "ap-module-panel__body",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
            className: "ap-module-panel__intro",
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('You connect your own Stripe account, so the money goes straight to you. Customers pay inside the booking form — card, and Apple Pay, Google Pay or Link wherever Stripe enables them for your account — without leaving your site. The slot is held while they pay.', 'aponto')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
            className: "ap-module-panel__help",
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Payment methods that redirect the customer to another site or settle later (bank debits, vouchers, buy-now-pay-later) are not offered in this version.', 'aponto')
          })]
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Card, {
        className: "ap-module-panel__section",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.CardHeader, {
          className: "ap-module-panel__section-head",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("h2", {
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('1. Mode', 'aponto')
          })
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.CardBody, {
          className: "ap-module-panel__body",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
            className: "ap-module-panel__intro",
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Both key sets are kept, so you can switch back and forth without pasting anything again. Set up in Test, try a real booking, then switch to Live when you are happy.', 'aponto')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("div", {
            className: "apst-modes",
            role: "radiogroup",
            "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Stripe mode', 'aponto'),
            children: _rest_js__WEBPACK_IMPORTED_MODULE_5__.MODES.map(mode => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("button", {
              type: "button",
              role: "radio",
              "aria-checked": form.mode === mode,
              className: `apst-mode-option${form.mode === mode ? ' is-selected' : ''} is-${mode}`,
              onClick: () => {
                patch({
                  mode
                });
                setOpenSet(mode);
              },
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
                className: "apst-mode-option__title",
                children: 'live' === mode ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Live mode', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Test mode', 'aponto')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
                className: "apst-mode-option__detail",
                children: 'live' === mode ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Real charges', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('No real charges', 'aponto')
              })]
            }, mode))
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("p", {
            className: `apst-mode ${banner.tone}`,
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("strong", {
              children: banner.title
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
              children: banner.detail
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("p", {
            className: "apst-status",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
              className: `apst-pill ${modeLine.tone}`,
              "aria-hidden": "true"
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
              children: modeLine.text
            })]
          }), fields.mode ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
            className: "ap-module-panel__error",
            children: fields.mode
          }) : null, saveButton]
        })]
      }), _rest_js__WEBPACK_IMPORTED_MODULE_5__.MODES.map((mode, index) => {
        const set = form.sets[mode];
        const isActive = form.mode === mode;
        const expanded = isActive || openSet === mode;
        const prefix = `${mode}_`;
        const pasted = (0,_rest_js__WEBPACK_IMPORTED_MODULE_5__.modeOfKey)(set.publishableKey);
        return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Card, {
          className: "ap-module-panel__section",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.CardHeader, {
            className: "ap-module-panel__section-head",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("h2", {
              children: 'live' === mode ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)(/* translators: %d: section number. */
              (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('%d. Live keys', 'aponto'), index + 2) : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)(/* translators: %d: section number. */
              (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('%d. Test keys', 'aponto'), index + 2)
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
              className: `apst-pill ${(0,_rest_js__WEBPACK_IMPORTED_MODULE_5__.setIsComplete)(set) ? 'is-ok' : 'is-warn'}`,
              children: (0,_rest_js__WEBPACK_IMPORTED_MODULE_5__.setIsComplete)(set) ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Complete', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Setup needed', 'aponto')
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.CardBody, {
            className: "ap-module-panel__body",
            children: !expanded ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
              className: "ap-module-panel__actions",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
                className: "ap-module-panel__help",
                children: 'live' === mode ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Kept for when you go live. Not in use right now.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Kept for testing. Not in use right now.', 'aponto')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Button, {
                variant: "secondary",
                onClick: () => setOpenSet(mode),
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Show keys', 'aponto')
              })]
            }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.Fragment, {
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
                className: "ap-module-panel__intro",
                children: 'live' === mode ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Copy these from the Stripe Dashboard with the test-mode toggle OFF, under Developers → API keys.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Copy these from the Stripe Dashboard with the test-mode toggle ON, under Developers → API keys.', 'aponto')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
                className: "ap-module-panel__field",
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.TextControl, {
                  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Publishable key', 'aponto'),
                  value: set.publishableKey,
                  autoComplete: "off",
                  onChange: value => {
                    clearFieldError(`${prefix}publishable_key`);
                    patchSet(mode, {
                      publishableKey: value
                    });
                  },
                  help: 'live' === mode ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Starts with pk_live_. This one is sent to the browser by design.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Starts with pk_test_. This one is sent to the browser by design.', 'aponto'),
                  __nextHasNoMarginBottom: true
                }), pasted && pasted !== mode ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
                  className: "ap-module-panel__error",
                  children: 'live' === mode ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('That is a TEST key. Paste it into the Test keys section instead.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('That is a LIVE key. Paste it into the Live keys section instead.', 'aponto')
                }) : null, fields[`${prefix}publishable_key`] ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
                  className: "ap-module-panel__error",
                  children: fields[`${prefix}publishable_key`]
                }) : null]
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(SecretField, {
                label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Secret key', 'aponto'),
                help: 'live' === mode ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Starts with sk_live_ or rk_live_. Stored encrypted and never shown again.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Starts with sk_test_ or rk_test_. Stored encrypted and never shown again.', 'aponto'),
                savedLabel: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Secret key saved', 'aponto'),
                clearLabel: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Secret key will be cleared on save', 'aponto'),
                keepLabel: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Keep the saved secret key', 'aponto'),
                isSet: set.secretIsSet,
                mode: set.secretMode,
                value: set.secretValue,
                error: fields[`${prefix}secret_key`],
                onPatch: (next, value) => {
                  clearFieldError(`${prefix}secret_key`);
                  patchSet(mode, {
                    secretMode: next,
                    secretValue: value
                  });
                }
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(SecretField, {
                label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Webhook signing secret', 'aponto'),
                help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Starts with whsec_. Stripe issues a DIFFERENT one for test and live — the two are not interchangeable.', 'aponto'),
                savedLabel: set.endpointId ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Signing secret saved (registered automatically)', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Signing secret saved', 'aponto'),
                clearLabel: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Signing secret will be cleared on save', 'aponto'),
                keepLabel: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Keep the saved signing secret', 'aponto'),
                isSet: set.webhookIsSet,
                mode: set.webhookMode,
                value: set.webhookValue,
                error: fields[`${prefix}webhook_secret`],
                onPatch: (next, value) => {
                  clearFieldError(`${prefix}webhook_secret`);
                  patchSet(mode, {
                    webhookMode: next,
                    webhookValue: value
                  });
                }
              }), set.endpointId ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
                className: "ap-module-panel__help",
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)(/* translators: %s: Stripe webhook endpoint id. */
                (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Registered endpoint: %s', 'aponto'), set.endpointId)
              }) : null, local ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
                className: "ap-module-panel__help",
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('This site is not reachable from the internet, so Stripe cannot deliver to it. Use the Stripe CLI below while you develop, and register the endpoint from the live site.', 'aponto')
              }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
                className: "ap-module-panel__actions",
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Button, {
                  variant: "secondary",
                  isBusy: registering === mode,
                  disabled: !!registering || !set.secretIsSet,
                  onClick: () => registerWebhook(mode),
                  children: registering === mode ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Registering…', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Register webhook with Stripe', 'aponto')
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
                  className: "ap-module-panel__help",
                  children: set.secretIsSet ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Creates the endpoint in your Stripe account and saves the signing secret for you. You can also add it by hand below.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Save this mode’s secret key first.', 'aponto')
                })]
              }), saveButton]
            })
          })]
        }, mode);
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Card, {
        className: "ap-module-panel__section",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.CardHeader, {
          className: "ap-module-panel__section-head",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("h2", {
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('4. Webhook endpoint', 'aponto')
          })
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.CardBody, {
          className: "ap-module-panel__body",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
            className: "ap-module-panel__intro",
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Add this endpoint in the Stripe Dashboard under Developers → Webhooks. Payments still complete without it, but the webhook is how a booking is finished for a customer who closes the tab mid-payment, and how refunds made in Stripe come back here.', 'aponto')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
            className: "ap-module-panel__field",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
              className: "ap-module-panel__label",
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Endpoint URL', 'aponto')
            }), endpoint ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
              className: "apst-uri",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("code", {
                children: endpoint
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Button, {
                variant: "secondary",
                onClick: () => {
                  copyText(endpoint).then(ok => {
                    setCopied(ok);
                    if (ok) {
                      window.setTimeout(() => setCopied(false), 2000);
                    }
                  });
                },
                children: copied ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Copied', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Copy', 'aponto')
              })]
            }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
              className: "ap-module-panel__help apst-unknown",
              children: webhookUnavailable
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
            className: "ap-module-panel__field",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
              className: "ap-module-panel__label",
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Events to send', 'aponto')
            }), events.length ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.Fragment, {
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("ul", {
                className: "apst-events",
                children: events.map(event => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("li", {
                  children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("code", {
                    children: event
                  })
                }, event))
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
                className: "ap-module-panel__help",
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('The URL is the same in both modes, but Stripe issues a separate signing secret for each — paste it into that mode’s section above, or use the Register button there.', 'aponto')
              })]
            }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
              className: "ap-module-panel__help apst-unknown",
              children: webhookUnavailable
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("details", {
            className: "apst-details",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("summary", {
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Testing on a local site', 'aponto')
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
              className: "ap-module-panel__field",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
                className: "ap-module-panel__help",
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Stripe cannot reach a site that is not on the public internet. Forward the events with the Stripe CLI instead — it prints its own signing secret, which is the one to paste above while you test.', 'aponto')
              }), listen ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("pre", {
                className: "apst-pre",
                children: listen
              }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
                className: "ap-module-panel__help apst-unknown",
                children: webhookUnavailable
              })]
            })]
          })]
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Card, {
        className: "ap-module-panel__section",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.CardHeader, {
          className: "ap-module-panel__section-head",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("h2", {
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('5. Test the connection', 'aponto')
          })
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.CardBody, {
          className: "ap-module-panel__body",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
            className: "ap-module-panel__intro",
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Asks Stripe for your account details with the ACTIVE mode’s saved secret key. Nothing is charged.', 'aponto')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("div", {
            className: "ap-module-panel__actions",
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Button, {
              variant: "secondary",
              isBusy: testing,
              disabled: testing,
              onClick: test,
              children: testing ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Testing…', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Test connection', 'aponto')
            })
          }), testResult ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("p", {
            className: "apst-result",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
              className: `apst-pill ${testResult.tone}`,
              "aria-hidden": "true"
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
              children: testResult.message
            })]
          }) : null]
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.Card, {
        className: "ap-module-panel__section",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.CardHeader, {
          className: "ap-module-panel__section-head",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("h2", {
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('6. Options', 'aponto')
          })
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.CardBody, {
          className: "ap-module-panel__body",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.CheckboxControl, {
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Send Stripe’s email receipt', 'aponto'),
            help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Stripe emails its own payment receipt to the customer, in addition to your Aponto booking confirmation.', 'aponto'),
            checked: form.sendReceipt,
            onChange: value => patch({
              sendReceipt: value
            }),
            __nextHasNoMarginBottom: true
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
            className: "ap-module-panel__field",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_1__.TextControl, {
              label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Statement descriptor suffix', 'aponto'),
              value: form.descriptorSuffix,
              maxLength: DESCRIPTOR_MAX,
              autoComplete: "off",
              onChange: value => {
                clearFieldError('statement_descriptor_suffix');
                patch({
                  descriptorSuffix: value
                });
              },
              help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)(/* translators: %d: maximum number of characters. */
              (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Appears after your Stripe account name on the customer’s card statement, so they recognise the charge. Up to %d characters; letters, numbers and spaces.', 'aponto'), DESCRIPTOR_MAX),
              __nextHasNoMarginBottom: true
            }), fields.statement_descriptor_suffix ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
              className: "ap-module-panel__error",
              children: fields.statement_descriptor_suffix
            }) : null]
          }), saveButton]
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("p", {
        className: "ap-module-panel__help",
        children: [(0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Payment requirement, hold duration and auto-confirm live in Settings → Booking → Payments — they apply to every payment method, not just Stripe.', 'aponto'), ' ', /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("a", {
          href: "#settings/booking/payments",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Open payment settings', 'aponto')
        })]
      })]
    })
  );
}

/***/ },

/***/ "./assets/src/modules/payments_stripe/rest.js"
/*!****************************************************!*\
  !*** ./assets/src/modules/payments_stripe/rest.js ***!
  \****************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MODES: () => (/* binding */ MODES),
/* harmony export */   MODULE_CODE: () => (/* binding */ MODULE_CODE),
/* harmony export */   REASON_MODULE_INACTIVE: () => (/* binding */ REASON_MODULE_INACTIVE),
/* harmony export */   REASON_NOT_CONFIGURED: () => (/* binding */ REASON_NOT_CONFIGURED),
/* harmony export */   REASON_UNSUPPORTED_CURRENCY: () => (/* binding */ REASON_UNSUPPORTED_CURRENCY),
/* harmony export */   SECRET_CLEAR: () => (/* binding */ SECRET_CLEAR),
/* harmony export */   SECRET_KEEP: () => (/* binding */ SECRET_KEEP),
/* harmony export */   SECRET_REPLACE: () => (/* binding */ SECRET_REPLACE),
/* harmony export */   fieldErrors: () => (/* binding */ fieldErrors),
/* harmony export */   formFromSettings: () => (/* binding */ formFromSettings),
/* harmony export */   friendlyError: () => (/* binding */ friendlyError),
/* harmony export */   isLocalHost: () => (/* binding */ isLocalHost),
/* harmony export */   modeOfKey: () => (/* binding */ modeOfKey),
/* harmony export */   modeStatus: () => (/* binding */ modeStatus),
/* harmony export */   readinessLine: () => (/* binding */ readinessLine),
/* harmony export */   reasonDetail: () => (/* binding */ reasonDetail),
/* harmony export */   secretWireValue: () => (/* binding */ secretWireValue),
/* harmony export */   setIsComplete: () => (/* binding */ setIsComplete),
/* harmony export */   settingsBody: () => (/* binding */ settingsBody),
/* harmony export */   statusFromSettings: () => (/* binding */ statusFromSettings),
/* harmony export */   testResultLine: () => (/* binding */ testResultLine),
/* harmony export */   webhookEndpoint: () => (/* binding */ webhookEndpoint),
/* harmony export */   webhookEvents: () => (/* binding */ webhookEvents)
/* harmony export */ });
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__);
/**
 * The Stripe panel's wire helpers — the secret markers, the settings body, the mode derivation
 * and the error copy (D-17 / extension-surface §5.3.4, D-R39).
 *
 * Kept out of the component because these are the parts most worth testing directly: a mistake in
 * the SECRET markers does not look like a bug, it looks like the site owner's live secret key
 * quietly becoming an empty string, and a mistake in the MODE derivation tells somebody they are
 * in test mode while real cards are being charged.
 *
 * DELIBERATELY A SECOND COPY of the secret helpers `assets/src/pro/calendar_google/rest.js` also
 * carries. `assets/src/pro/**` is physically excluded from the Free zip (distribution.json) and
 * `payments_stripe` is a FREE module (D-R22/D-R39), so importing them would put a Free panel's
 * behaviour in a file that Free sites do not receive. The shared home for them is the panel host,
 * which owns no wire code at all today; extracting one is a change to the host contract, not to
 * this module, so it is written down here rather than done in passing.
 */



/** The three states a secret field can be in when the form is submitted. */
const SECRET_KEEP = 'keep';
const SECRET_REPLACE = 'replace';
const SECRET_CLEAR = 'clear';

/** The module's registry code — the URL segment of every route this panel talks to. */
const MODULE_CODE = 'payments_stripe';

/**
 * The two key sets a site holds, in the order the panel renders them (D-R39b).
 *
 * A site keeps BOTH: `mode` names the one in force, and the other stays stored so switching back
 * costs no retyping. Every place that walks the sets — the settings body, the completeness pills,
 * the two key cards — walks this list, so adding a third would never be a rename hunt.
 */
const MODES = ['test', 'live'];

/**
 * The wire value for a secret field.
 *
 * `{keep: true}` retains the stored cipher untouched (it is never re-encrypted), a non-empty string
 * REPLACES it, and `null` CLEARS it. Deliberately NOT "empty string means keep" — that is the
 * footgun extension-surface §5.3.4 rules out by name, because it makes "I cleared this field" and
 * "I did not touch this field" indistinguishable.
 *
 * @param {string} mode  One of the SECRET_* constants.
 * @param {string} value Typed value, when replacing.
 * @return {Object|string|null} The wire value.
 */
function secretWireValue(mode, value) {
  if (SECRET_REPLACE === mode) {
    const typed = String(value || '').trim();

    // A "replace" with nothing typed is a clear, not an empty replacement: storing '' would be
    // the same end state, but saying so explicitly keeps the server's branch unambiguous.
    return '' === typed ? null : typed;
  }
  return SECRET_CLEAR === mode ? null : {
    keep: true
  };
}

/**
 * The full-replacement settings body.
 *
 * PUT is a FULL replacement (rest-contract §2.12 / `ModulesController::update()`), so every schema
 * key travels every time — a key left out is a key reset to its default, which for a receipt toggle
 * the owner turned off would silently turn it back on. That now includes the OTHER mode's set and
 * both endpoint ids: flipping the switch must not cost the owner the credentials they are switching
 * away from, which is the whole point of D-R39b.
 *
 * @param {Object} form Panel form state.
 * @return {Object} Request body.
 */
function settingsBody(form) {
  const settings = {
    mode: 'live' === form.mode ? 'live' : 'test',
    send_receipt: !!form.sendReceipt,
    statement_descriptor_suffix: String(form.descriptorSuffix || '').trim()
  };
  MODES.forEach(mode => {
    const set = form.sets && form.sets[mode] || {};
    settings[`${mode}_publishable_key`] = String(set.publishableKey || '').trim();
    settings[`${mode}_secret_key`] = secretWireValue(set.secretMode, set.secretValue);
    settings[`${mode}_webhook_secret`] = secretWireValue(set.webhookMode, set.webhookValue);
    settings[`webhook_endpoint_id_${mode}`] = String(set.endpointId || '');
  });
  return {
    settings
  };
}

/**
 * One mode set, read out of a settings response.
 *
 * A secret comes back as `{is_set: bool}` and never as a value, so both secret fields start in
 * `keep` mode — there is nothing to prefill, and prefilling a fake value would invite the owner to
 * "correct" it into a real clear.
 *
 * @param {Object} settings Settings object.
 * @param {string} mode     `test` or `live`.
 * @return {Object} Set state.
 */
function setFromSettings(settings, mode) {
  const publishable = settings[`${mode}_publishable_key`];
  const secret = settings[`${mode}_secret_key`];
  const webhook = settings[`${mode}_webhook_secret`];
  const endpoint = settings[`webhook_endpoint_id_${mode}`];
  return {
    publishableKey: typeof publishable === 'string' ? publishable : '',
    secretIsSet: !!(secret && secret.is_set),
    secretMode: SECRET_KEEP,
    secretValue: '',
    webhookIsSet: !!(webhook && webhook.is_set),
    webhookMode: SECRET_KEEP,
    webhookValue: '',
    endpointId: typeof endpoint === 'string' ? endpoint : ''
  };
}

/**
 * Read a settings response into panel form state.
 *
 * `send_receipt` reads as FALSE when absent. Unlike the Google panel's two sync switches, letting
 * Stripe email the customer is an action taken on the site's behalf towards its customers, so the
 * conservative reading of an unknown state is "we are not doing that". `mode` reads as TEST when
 * absent for the same reason, one size larger: a panel that guessed "live" would tell an owner
 * mid-setup that real cards are being charged.
 *
 * @param {Object} response GET/PUT response.
 * @return {Object} Form state.
 */
function formFromSettings(response) {
  const settings = response && response.settings || {};
  return {
    mode: 'live' === settings.mode ? 'live' : 'test',
    sets: {
      test: setFromSettings(settings, 'test'),
      live: setFromSettings(settings, 'live')
    },
    sendReceipt: true === settings.send_receipt,
    descriptorSuffix: typeof settings.statement_descriptor_suffix === 'string' ? settings.statement_descriptor_suffix : ''
  };
}

/**
 * Whether one mode set holds all three credentials — the question the status line answers.
 *
 * A secret counts when it is SAVED (`is_set`) or about to be, and stops counting the moment the
 * owner stages a clear: "Live keys saved" must not stay on screen above a form that is one Save
 * away from emptying them.
 *
 * @param {Object} set One set's form state.
 * @return {boolean} Whether the set is complete.
 */
function setIsComplete(set) {
  if (!set) {
    return false;
  }
  const has = (isSet, mode, value) => {
    if (SECRET_CLEAR === mode) {
      return false;
    }
    if (SECRET_REPLACE === mode) {
      return '' !== String(value || '').trim();
    }
    return !!isSet;
  };
  return '' !== String(set.publishableKey || '').trim() && has(set.secretIsSet, set.secretMode, set.secretValue) && has(set.webhookIsSet, set.webhookMode, set.webhookValue);
}

/**
 * The one-line status under the mode switch.
 *
 * Named for the ACTIVE mode, because that is the one that decides whether the booking form can take
 * a card. "Setup needed" is not a warning about the panel — it is the reason the customer sees no
 * card field, and saying so here is what stops an owner hunting through the booking settings.
 *
 * @param {string} mode Active mode.
 * @param {Object} sets Both sets.
 * @return {{tone: string, text: string}} Status line.
 */
function modeStatus(mode, sets) {
  const active = 'live' === mode ? 'live' : 'test';
  const complete = setIsComplete(sets && sets[active]);
  if (complete) {
    return {
      tone: 'is-ok',
      text: 'live' === active ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Live keys saved · signing secret saved', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Test keys saved · signing secret saved', 'aponto')
    };
  }
  return {
    tone: 'is-warn',
    text: 'live' === active ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Live set incomplete — add the 3 keys below. No card payment is offered until you do.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Test set incomplete — add the 3 keys below. No card payment is offered until you do.', 'aponto')
  };
}

/**
 * The mode a pasted key belongs to, or `''`.
 *
 * No longer decides the panel's mode — that is the switch now (D-R39b) — but it still tells the
 * owner IMMEDIATELY that they have pasted a live key into the Test box, before the server's 422
 * says the same thing on save.
 *
 * @param {string} key Publishable or secret key as typed.
 * @return {'test'|'live'|''} The key's own mode.
 */
function modeOfKey(key) {
  const value = String(key || '').trim();
  if (/^(pk|sk|rk)_test_/.test(value)) {
    return 'test';
  }
  return /^(pk|sk|rk)_live_/.test(value) ? 'live' : '';
}

/**
 * Whether this admin screen is being served from a host Stripe could never reach.
 *
 * A local site cannot receive a delivery, so offering "Register webhook with Stripe" there would
 * create an endpoint at an unreachable URL and hand back a secret for events that never arrive.
 * The CLI note is the honest alternative, and it is what the developer actually needs.
 *
 * @param {string} host Hostname.
 * @return {boolean} Whether the host is local-only.
 */
function isLocalHost(host) {
  const value = String(host || '').toLowerCase();
  return 'localhost' === value || '127.0.0.1' === value || '::1' === value || value.endsWith('.local') || value.endsWith('.test') || value.endsWith('.localhost');
}

/**
 * The readiness tokens the server may send in `status.reason` (shared vocabulary with the PayPal
 * panel, so the two gateways cannot describe the same state differently).
 *
 * `REASON_WEBHOOK_ENVIRONMENT_MISMATCH` was a fourth constant here and is gone with the token itself
 * (D-R40f): it belonged to PayPal's single-credential-set shape, which no longer exists, so
 * `ModuleStatus::REASONS` cannot emit it and a constant nothing can equal is dead vocabulary.
 */
const REASON_NOT_CONFIGURED = 'not_configured';
const REASON_MODULE_INACTIVE = 'module_inactive';
const REASON_UNSUPPORTED_CURRENCY = 'unsupported_currency';

/**
 * The server's readiness report from a settings GET/PUT, or null.
 *
 * ADDITIVE (rest-contract §2.12): a server older than this bundle sends no `status` key, which reads
 * as null and leaves every caller on the derivation it used before.
 *
 * @param {Object} response GET/PUT response.
 * @return {?{ready: ?boolean, reason: string, message: string, webhookUrl: string, webhookEvents: ?Array<string>}} Status.
 */
function statusFromSettings(response) {
  const status = response && response.status;
  if (!status || 'object' !== typeof status || Array.isArray(status)) {
    return null;
  }
  const events = Array.isArray(status.webhook_events) ? status.webhook_events.filter(event => 'string' === typeof event && '' !== event) : null;
  return {
    ready: 'boolean' === typeof status.ready ? status.ready : null,
    reason: 'string' === typeof status.reason ? status.reason : '',
    message: 'string' === typeof status.message ? status.message : '',
    webhookUrl: 'string' === typeof status.webhook_url ? status.webhook_url : '',
    webhookEvents: events && events.length ? events : null
  };
}

/**
 * The sentence for one server readiness token, or '' when this file has no copy for it.
 *
 * A token with no entry answers '' and the caller falls through to the server's own message — the
 * same mechanism {@link testResultLine} uses. The panel never invents a reason the server did not
 * give.
 *
 * @param {string} reason    Token from `status.reason`.
 * @param {Object} [context] `{currency}` — the site currency, from admin boot data.
 * @return {string} Sentence, or ''.
 */
function reasonDetail(reason, context = {}) {
  if (REASON_NOT_CONFIGURED === reason) {
    return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Stripe is not offered at checkout until the publishable key and secret key below are saved.', 'aponto');
  }
  if (REASON_MODULE_INACTIVE === reason) {
    return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('The Stripe module is switched off for this site, so the gateway is not offered at checkout.', 'aponto');
  }
  if (REASON_UNSUPPORTED_CURRENCY === reason) {
    return context.currency ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.sprintf)(/* translators: %s: the site's ISO-4217 currency code, e.g. "VND". */
    (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Stripe does not accept payments in %s, so it is not offered at checkout. Change the site currency, or take payments with another method.', 'aponto'), String(context.currency).toUpperCase()) : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Stripe does not accept payments in this site’s currency, so it is not offered at checkout.', 'aponto');
  }
  return '';
}

/**
 * The "Setup needed" banner when the SERVER says the gateway is not ready, or null.
 *
 * Null is the normal answer and means "nothing to add": either the server said nothing (a build
 * older than the `status` key) or it said ready, and in both cases the panel shows its derived
 * test/live banner instead ({@see modeBanner}). Readiness is not derivable here — a site currency
 * Stripe does not take is a fact only the server holds (Codex r1 #14) — so this is a REPORT, never
 * a derivation.
 *
 * @param {?Object} status     Server readiness ({@see statusFromSettings}).
 * @param {string}  [currency] Site currency, for the token whose copy names it.
 * @return {?{tone: string, title: string, detail: string}} Banner, or null.
 */
function readinessLine(status, currency = '') {
  if (!status || false !== status.ready) {
    return null;
  }
  return {
    tone: 'is-setup',
    title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Setup needed', 'aponto'),
    detail: reasonDetail(status.reason, {
      currency
    }) || status.message || reasonDetail(REASON_NOT_CONFIGURED)
  };
}

/**
 * The endpoint to paste into Stripe — the SERVER's `rest_url()`, and NOTHING else (Codex r1 #18,
 * r2 B5; D-R40b).
 *
 * The browser origin is not always the address Stripe can reach: an admin working through an
 * internal hostname, a reverse proxy, or one of several domains mapped to the same site would be
 * shown a URL that resolves for them and for nobody else. WordPress knows the canonical one; the
 * panel's job is to DISPLAY it, not to derive it.
 *
 * There is therefore no fallback. A server too old to publish `status.webhook_url` answers '' here
 * and the panel prints a reload line instead: a URL this side constructed is one an operator
 * REGISTERS WITH STRIPE, where being wrong is silent until the day a customer closes the tab
 * mid-payment or a refund is made from the dashboard.
 *
 * @param {?Object} status Server readiness ({@see statusFromSettings}).
 * @return {string} Absolute webhook URL, or '' when the server published none.
 */
function webhookEndpoint(status) {
  return status && status.webhookUrl || '';
}

/**
 * The events to subscribe — the SERVER's list, and NOTHING else (Codex r1 #3, r2 B5; D-R40b).
 *
 * The driver decides which events mean anything to this site, so the driver is what is read off. A
 * second copy on THIS side of the wire is the one nothing can check against the driver, and it
 * drifts — a subscription narrower than the driver loses money that arrived after the tab was
 * closed, which is how `refund.created`/`refund.updated` came to matter (QA BUG-1). An empty list
 * means "the server did not say".
 *
 * @param {?Object} status Server readiness ({@see statusFromSettings}).
 * @return {Array<string>} Event names, empty when the server published none.
 */
function webhookEvents(status) {
  return status && status.webhookEvents || [];
}

/**
 * Turn a failed settings request into copy a site owner can act on.
 *
 * `rest_no_route` is the one that matters: it means the module stopped booting since this page
 * loaded (someone switched it off, or a deploy changed the edition). WordPress's own string — "No
 * route was found matching the URL and request method" — reads as a broken plugin, so the panel
 * contract (`admin/modules/ModuleSettingsRoute.jsx`) requires mapping it.
 *
 * @param {Object} error    Failed apiFetch error.
 * @param {string} fallback Message when nothing better is known.
 * @return {string} Message.
 */
function friendlyError(error, fallback) {
  const code = error && error.code ? String(error.code) : '';
  if ('rest_no_route' === code || 'aponto_not_found' === code) {
    return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Stripe payments are not active on this site. Reload the page to continue.', 'aponto');
  }
  if ('aponto_driver_missing' === code) {
    return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('The Stripe driver is not loaded on this site.', 'aponto');
  }
  if ('aponto_internal' === code && error && error.message) {
    // The one 500 with copy worth showing verbatim: `ModulesController::update()` refuses to
    // store a secret on a site with no unique SECURE_AUTH_KEY and says exactly how to fix it.
    return error.message;
  }
  return error && error.message || fallback;
}

/**
 * The server's 422 field map, or `{}`.
 *
 * Rendered GENERICALLY under whichever field the server named (`data.fields`, keyed by the schema's
 * dotted path) rather than re-implemented here: prefix rules, length caps and currency support are
 * the driver's to state, and a client that guessed at them would eventually contradict the server.
 *
 * @param {Object} error Failed apiFetch error.
 * @return {Object<string, string>} Field errors.
 */
function fieldErrors(error) {
  const fields = error && error.data && error.data.fields;
  return fields && typeof fields === 'object' && !Array.isArray(fields) ? fields : {};
}

/**
 * The result line for `POST /modules/payments_stripe/test`.
 *
 * The route answers `{ok, code, message}` (`IntegrationsController::test()`), and a driver that is
 * not loaded answers `501 aponto_driver_missing` from core itself — which is the state a Free site
 * is in between "the module shipped" and "the driver merged". Both are rendered as an honest line
 * with a status dot, never as a silent no-op.
 *
 * @param {Object} result Response body, or a normalized error.
 * @return {{tone: string, message: string}} Presentation.
 */
function testResultLine(result) {
  const code = result && result.code ? String(result.code) : '';
  const ok = !!(result && result.ok);
  if (ok) {
    return {
      tone: 'is-ok',
      // The driver's own message names the connected account, which is the useful half; the
      // fallback only has to say the keys work.
      message: result && result.message || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Stripe answered. Your keys work.', 'aponto')
    };
  }
  const known = {
    aponto_driver_missing: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('The Stripe driver is not loaded on this site.', 'aponto'),
    not_configured: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Add your publishable key and secret key first.', 'aponto'),
    invalid_key: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Stripe rejected the secret key. Check that you copied the whole key.', 'aponto'),
    unreachable: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Aponto could not reach Stripe. Check the site’s outbound connection and try again.', 'aponto')
  };
  return {
    tone: 'aponto_driver_missing' === code || 'not_configured' === code ? 'is-warn' : 'is-error',
    message: known[code] || result && result.message || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('The connection test did not succeed.', 'aponto')
  };
}

/***/ },

/***/ "./assets/src/modules/payments_stripe/styles.js"
/*!******************************************************!*\
  !*** ./assets/src/modules/payments_stripe/styles.js ***!
  \******************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   PANEL_CSS: () => (/* binding */ PANEL_CSS),
/* harmony export */   ensurePanelStyles: () => (/* binding */ ensurePanelStyles)
/* harmony export */ });
/**
 * The Stripe panel's stylesheet, shipped inside the bundle.
 *
 * WHY A STRING AND NOT A `.css` FILE: `AdminPage::enqueueModuleBundles()` enqueues
 * `modules/{code}.js` and nothing else — there is no `wp_enqueue_style()` for a module bundle, so
 * `import './x.css'` would emit a stylesheet no page ever loads. One `<style>` element, appended
 * once, is the honest remaining option — the same call `assets/src/pro/calendar_google/styles.js`
 * makes.
 *
 * Everything is scoped under `.ap-admin .apst` and painted from the `--ap-*` semantic tokens
 * (`assets/src/admin/styles/aponto-tokens.css`), never from colour literals, so the panel follows
 * the Appearance accent AND the dark scheme exactly like every free screen.
 *
 * SPACING IS NOT HERE (founder, 2026-09-04). The panel shell, its sections, intros, field groups,
 * help lines and action rows come from the shared `.ap-module-panel*` classes the free-shipped
 * panel host owns (`admin-extra.css`), so all five module panels measure the same. What is left
 * below is genuinely module-specific: the derived mode banner, the endpoint field, the event list
 * and the test-result pill.
 *
 * NOTE FOR ANYONE EDITING THE CSS BELOW: it is a template literal, so it must contain no backtick
 * and no `${`. A class name written in backticks inside a CSS comment silently ENDS the string and
 * the rest is parsed as JavaScript.
 */

/** The element id, so a re-mount reuses the sheet instead of stacking copies. */
const STYLE_ID = 'aponto-payments-stripe-panel-css';
const PANEL_CSS = `
.ap-admin .apst .components-button { gap: 6px; }
/* wp-components resolves its destructive tone from its OWN theme variables, which the dark scheme
   does not set — so "Clear" silently lost its red and read like any other action. */
.ap-admin .apst .components-button.is-destructive,
.ap-admin .apst .components-button.is-destructive:hover:not( :disabled ) { color: var( --ap-color-danger ); }

/* ---- The mode switch ----------------------------------------------------- */
/* Two large targets rather than a select: this is the control that decides whether real cards are
   charged, and a one-line dropdown makes the most consequential setting on the screen look like the
   least. They are a radiogroup with aria-checked because they ARE radios; they are buttons only so
   the whole tile is the hit area. */
.ap-admin .apst-modes {
	display: grid; grid-template-columns: repeat( auto-fit, minmax( 12rem, 1fr ) );
	gap: var( --ap-space-2 );
}
.ap-admin .apst-mode-option {
	display: flex; flex-direction: column; gap: 2px; text-align: start; cursor: pointer;
	padding: var( --ap-space-2 ) var( --ap-space-3 );
	border: 1px solid var( --ap-color-border-strong ); border-radius: var( --ap-radius-control );
	background: var( --ap-color-surface ); color: var( --ap-color-text );
	font: inherit;
}
.ap-admin .apst-mode-option:hover { border-color: var( --ap-color-accent ); }
.ap-admin .apst-mode-option:focus-visible {
	outline: 2px solid var( --ap-color-accent ); outline-offset: 2px;
}
/* The selected tile carries a ring AND a filled dot — colour is never the only carrier. */
.ap-admin .apst-mode-option.is-selected {
	border-color: var( --ap-color-accent );
	box-shadow: inset 0 0 0 1px var( --ap-color-accent );
	background: var( --ap-color-surface-muted );
}
.ap-admin .apst-mode-option__title {
	display: flex; align-items: center; gap: 6px;
	font-weight: var( --ap-font-weight-semibold );
}
.ap-admin .apst-mode-option__title::before {
	content: ""; flex: none; width: 10px; height: 10px; border-radius: 50%;
	border: 1px solid var( --ap-color-border-strong ); background: transparent;
}
.ap-admin .apst-mode-option.is-selected .apst-mode-option__title::before {
	border-color: var( --ap-color-accent ); background: var( --ap-color-accent );
}
.ap-admin .apst-mode-option__detail { color: var( --ap-color-text-muted ); font-size: var( --ap-font-size-meta ); }

/* The set-completeness line under the switch. Same shape as the test-connection result, because it
   answers the same kind of question — "is this working?" — one step earlier. */
.ap-admin .apst-status {
	display: flex; align-items: flex-start; gap: 6px; margin: 0;
	color: var( --ap-color-text ); font-size: var( --ap-font-size-meta ); line-height: var( --ap-line-height-body );
}

/* ---- Derived mode banner ------------------------------------------------ */
/* Test mode is the state worth interrupting for: money is NOT moving, and somebody who thinks it
   is will wait forever for a payout. Live mode is neutral chrome — it is the expected end state,
   and painting it green would celebrate a setting rather than report it. */
.ap-admin .apst-mode {
	display: flex; align-items: center; gap: var( --ap-space-2 ); flex-wrap: wrap;
	padding: var( --ap-space-2 ) var( --ap-space-3 );
	border: 1px solid var( --ap-color-border-strong ); border-radius: var( --ap-radius-control );
	background: var( --ap-color-surface-muted ); color: var( --ap-color-text );
	font-size: var( --ap-font-size-meta ); line-height: var( --ap-line-height-body );
}
.ap-admin .apst-mode strong { font-weight: var( --ap-font-weight-semibold ); }
/* The is-setup tone is the SERVER saying the gateway is not offered at checkout — the one state on
   this line that is a problem to fix rather than a mode to be aware of. */
.ap-admin .apst-mode.is-setup,
.ap-admin .apst-mode.is-test { border-color: var( --ap-color-warning ); }
/* The dot is a second, non-colour-dependent carrier beside the words. */
.ap-admin .apst-mode::before {
	content: ""; flex: none; width: 8px; height: 8px; border-radius: 50%;
	background: var( --ap-color-text-soft );
}
.ap-admin .apst-mode.is-setup::before,
.ap-admin .apst-mode.is-test::before { background: var( --ap-color-warning ); }

/* ---- The endpoint the owner has to copy --------------------------------- */
.ap-admin .apst-uri { display: flex; align-items: stretch; gap: var( --ap-space-2 ); flex-wrap: wrap; }
.ap-admin .apst-uri code {
	flex: 1 1 22rem; min-width: 0; overflow-x: auto; white-space: nowrap;
	padding: 8px 10px; border-radius: var( --ap-radius-control );
	border: 1px solid var( --ap-color-border-strong ); background: var( --ap-color-surface-muted );
	color: var( --ap-color-text ); font-size: 12px; line-height: 20px; direction: ltr;
}

/* ---- Event list --------------------------------------------------------- */
/* A list, not a sentence: these get copied into Stripe one at a time. */
.ap-admin .apst-events { display: flex; flex-wrap: wrap; gap: var( --ap-space-2 ); margin: 0; padding: 0; list-style: none; }
.ap-admin .apst-events li { margin: 0; }
.ap-admin .apst-events code {
	display: inline-block; padding: 3px 8px; border-radius: var( --ap-radius-control );
	border: 1px solid var( --ap-color-border ); background: var( --ap-color-surface-muted );
	color: var( --ap-color-text ); font-size: 12px; line-height: 18px; direction: ltr;
}

/* ---- Local-development disclosure --------------------------------------- */
.ap-admin .apst-details summary {
	cursor: pointer; color: var( --ap-color-text-muted );
	font-size: var( --ap-font-size-meta ); line-height: var( --ap-line-height-body );
}
.ap-admin .apst-details summary:focus-visible {
	outline: 2px solid var( --ap-color-accent ); outline-offset: 2px; border-radius: var( --ap-radius-control );
}
.ap-admin .apst-details[ open ] summary { margin-block-end: var( --ap-space-2 ); }
.ap-admin .apst-pre {
	margin: 0; overflow-x: auto; padding: 8px 10px;
	border: 1px solid var( --ap-color-border-strong ); border-radius: var( --ap-radius-control );
	background: var( --ap-color-surface-muted ); color: var( --ap-color-text );
	font-size: 12px; line-height: 20px; direction: ltr; white-space: pre;
}

/* ---- Status pill (saved secrets, test result) --------------------------- */
/* Status is a word plus a dot, not a colour alone — colour is never the only carrier of meaning. */
.ap-admin .apst-pill {
	display: inline-flex; align-items: center; gap: 6px;
	font-size: 12px; font-weight: 600; color: var( --ap-color-text-muted );
}
.ap-admin .apst-pill::before { content: ""; flex: none; width: 8px; height: 8px; border-radius: 50%; background: var( --ap-color-text-soft ); }
.ap-admin .apst-pill.is-ok::before { background: var( --ap-color-success ); }
.ap-admin .apst-pill.is-warn::before { background: var( --ap-color-warning ); }
.ap-admin .apst-pill.is-error::before { background: var( --ap-color-danger ); }
.ap-admin .apst-pill.is-ok { color: var( --ap-color-text ); }
.ap-admin .apst-result { display: flex; align-items: flex-start; gap: 6px; margin: 0; color: var( --ap-color-text ); font-size: var( --ap-font-size-meta ); line-height: var( --ap-line-height-body ); }
`;

/** Append the sheet once per document. */
function ensurePanelStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = PANEL_CSS;
  document.head.appendChild(style);
}

/***/ },

/***/ "react/jsx-runtime"
/*!**********************************!*\
  !*** external "ReactJSXRuntime" ***!
  \**********************************/
(module) {

module.exports = window["ReactJSXRuntime"];

/***/ },

/***/ "@wordpress/api-fetch"
/*!**********************************!*\
  !*** external ["wp","apiFetch"] ***!
  \**********************************/
(module) {

module.exports = window["wp"]["apiFetch"];

/***/ },

/***/ "@wordpress/components"
/*!************************************!*\
  !*** external ["wp","components"] ***!
  \************************************/
(module) {

module.exports = window["wp"]["components"];

/***/ },

/***/ "@wordpress/element"
/*!*********************************!*\
  !*** external ["wp","element"] ***!
  \*********************************/
(module) {

module.exports = window["wp"]["element"];

/***/ },

/***/ "@wordpress/i18n"
/*!******************************!*\
  !*** external ["wp","i18n"] ***!
  \******************************/
(module) {

module.exports = window["wp"]["i18n"];

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	const __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		const cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		const module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			const e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			const getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter/value functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			if(Array.isArray(definition)) {
/******/ 				var i = 0;
/******/ 				while(i < definition.length) {
/******/ 					var key = definition[i++];
/******/ 					var binding = definition[i++];
/******/ 					if(!__webpack_require__.o(exports, key)) {
/******/ 						if(binding === 0) {
/******/ 							Object.defineProperty(exports, key, { enumerable: true, value: definition[i++] });
/******/ 						} else {
/******/ 							Object.defineProperty(exports, key, { enumerable: true, get: binding });
/******/ 						}
/******/ 					} else if(binding === 0) { i++; }
/******/ 				}
/******/ 			} else {
/******/ 				for(var key in definition) {
/******/ 					if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 						Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 					}
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.hasOwn(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
let __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!*****************************************************!*\
  !*** ./assets/src/modules/payments_stripe/index.js ***!
  \*****************************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _PaymentsStripePanel_jsx__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./PaymentsStripePanel.jsx */ "./assets/src/modules/payments_stripe/PaymentsStripePanel.jsx");
/**
 * Stripe payments — the module's admin panel entry (D-R37 pipeline, D-R39 module).
 *
 * The whole contract between the module and the SPA: hand ONE component to the free-shipped panel
 * registry under the module's registry code, and let the panel host
 * (`admin/modules/ModuleSettingsRoute.jsx`) decide whether to render it. Registration is not
 * entitlement — the host only reaches this panel for a module the server reported `available`
 * (`Plan::has()`), and REST re-checks on every read and write.
 *
 * Registration goes through the GLOBAL, not an import of `lib/module-panels.js`: two webpack
 * entries cannot share a module instance, so importing it would bundle a second registry and leave
 * the two talking past each other. Load order is tolerated in both directions.
 *
 * THE `modules/` SHAPE, NOT `pro/` (D-R37). `payments_stripe` is `edition: free` (D-R22), and the
 * Free zip physically excludes `assets/src/pro/**` — a panel there could not exist in the only
 * build a Free site runs. This entry is therefore built in BOTH plans and enqueued by
 * `AdminPage::enqueueModuleBundles()`, which resolves the directory from the registry.
 */


const MODULE_CODE = 'payments_stripe';
const namespace = window.apontoAdmin = window.apontoAdmin || {};
if (typeof namespace.registerModuleSettingsPanel === 'function') {
  namespace.registerModuleSettingsPanel(MODULE_CODE, _PaymentsStripePanel_jsx__WEBPACK_IMPORTED_MODULE_0__["default"]);
} else {
  // Pre-boot drop box: the registry adopts anything already sitting here when it publishes.
  namespace.moduleSettingsPanels = namespace.moduleSettingsPanels || {};
  namespace.moduleSettingsPanels[MODULE_CODE] = _PaymentsStripePanel_jsx__WEBPACK_IMPORTED_MODULE_0__["default"];
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_PaymentsStripePanel_jsx__WEBPACK_IMPORTED_MODULE_0__["default"]);
})();

/******/ })()
;
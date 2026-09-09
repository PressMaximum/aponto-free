/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./assets/src/form/app.jsx"
/*!*********************************!*\
  !*** ./assets/src/form/app.jsx ***!
  \*********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   App: () => (/* binding */ App)
/* harmony export */ });
/* harmony import */ var preact_hooks__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! preact/hooks */ "./node_modules/preact/hooks/dist/hooks.module.js");
/* harmony import */ var _lib_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./lib/api.js */ "./assets/src/form/lib/api.js");
/* harmony import */ var _lib_idempotency_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./lib/idempotency.js */ "./assets/src/form/lib/idempotency.js");
/* harmony import */ var _lib_tz_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./lib/tz.js */ "./assets/src/form/lib/tz.js");
/* harmony import */ var _lib_errors_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./lib/errors.js */ "./assets/src/form/lib/errors.js");
/* harmony import */ var _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./lib/copy.js */ "./assets/src/form/lib/copy.js");
/* harmony import */ var _components_ServiceStep_jsx__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./components/ServiceStep.jsx */ "./assets/src/form/components/ServiceStep.jsx");
/* harmony import */ var _components_DateTimeStep_jsx__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./components/DateTimeStep.jsx */ "./assets/src/form/components/DateTimeStep.jsx");
/* harmony import */ var _components_DetailsStep_jsx__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./components/DetailsStep.jsx */ "./assets/src/form/components/DetailsStep.jsx");
/* harmony import */ var _components_PaymentStep_jsx__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./components/PaymentStep.jsx */ "./assets/src/form/components/PaymentStep.jsx");
/* harmony import */ var _components_Confirmation_jsx__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./components/Confirmation.jsx */ "./assets/src/form/components/Confirmation.jsx");
/* harmony import */ var _components_Summary_jsx__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./components/Summary.jsx */ "./assets/src/form/components/Summary.jsx");
/* harmony import */ var _components_feedback_jsx__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./components/feedback.jsx */ "./assets/src/form/components/feedback.jsx");
/* harmony import */ var _components_Skeletons_jsx__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ./components/Skeletons.jsx */ "./assets/src/form/components/Skeletons.jsx");
/* harmony import */ var _lib_payments_js__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ./lib/payments.js */ "./assets/src/form/lib/payments.js");
/* harmony import */ var _lib_format_js__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ./lib/format.js */ "./assets/src/form/lib/format.js");
/* harmony import */ var _lib_hold_js__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ./lib/hold.js */ "./assets/src/form/lib/hold.js");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
/** @jsxImportSource preact */
/**
 * Booking widget root — the client-side state machine for the V1 four-step flow
 * (Service · Date & time · Details · Confirmation). The server stays stateless;
 * all draft state lives here.
 *
 * Responsibilities wired here (SPEC-P1 §2):
 *  - Deterministic timezone init (D1): resolve display_tz once, render the
 *    selector only when the browser zone differs, keep every surface on one
 *    display_tz, and persist `customer_timezone` = display_tz at submit.
 *  - Idempotency lifecycle: key created on entering Details, reused across
 *    retries, rotated when the draft changes (SPEC-P0 §5.6).
 *  - Full error recovery: 409 slot-taken → back to Date & time + toast + refresh;
 *    422 → inline field errors; 429 → Retry-After countdown; 425 → poll same key;
 *    503 → auto-retry once then manual; idempotency replay → "check email" panel.
 *  - Container-adaptive layout: sidebar summary ≥700px, in-flow recap accordion
 *    below, driven purely by container queries (no viewport media).
 *  - Inline payment (D-R38): a fifth step appears — and the fraction renumbers —
 *    only when the site takes money AND the chosen service costs something. The
 *    gateway's own UI is NOT part of this tree: adapters own a light-DOM holder
 *    projected back through `<slot>`, because Stripe refuses to mount inside a
 *    ShadowRoot and its Payment Element fails silently when you try (spike).
 *    This component owns the ORDER of the payment sequence (validate → hold →
 *    charge → confirm) and the release of a hold nobody is going to pay for.
 */


















const COMMON_ZONES = ['UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'America/Sao_Paulo', 'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Africa/Cairo', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Ho_Chi_Minh', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Disclosure target for the narrow-container recap bar (ShadowRoot-scoped id). */
const RECAP_PANEL_ID = 'ap-recap-panel';

/**
 * Thrown out of the payment sequence when the booking leg already failed AND
 * already told the visitor about it. It carries no message on purpose: the
 * recovery UI for a 409/425/429/503 is the one the widget has always had, and
 * the payment layer must not paint a second, vaguer error on top of it.
 */
const HANDLED = {
  handled: true
};

/**
 * The `payment.status: "pending"` wait budget (rest-contract §3.3).
 *
 * The server suggests `retry_after_ms`; these bound it. The floor stops a
 * misbehaving server from turning the wait into a busy loop, the ceiling and the
 * two totals stop a customer from staring at a spinner while a dead request's
 * lease runs down — 20 s is comfortably inside the 60 s lease, so giving up here
 * always leaves time for the manual retry the customer is then offered.
 */
const PAY_WAIT_MIN_MS = 250;
const PAY_WAIT_MAX_MS = 5000;
const PAY_WAIT_ATTEMPTS = 6;
const PAY_WAIT_TOTAL_MS = 20000;

/**
 * How many times a RESUME is re-sent after a `503 aponto_lock_timeout`.
 *
 * A different failure from the `pending` wait above, and it needs its own budget
 * because it is a different sentence: `pending` means "your claim exists and the
 * reference is coming", while `503` means "somebody else holds this order's lock
 * right now" — the webhook that just settled a sibling event, the expiry cron, a
 * second tab. Both clear in well under a second, and neither says the hold is
 * gone. Three tries at 250/500 ms, then a retryable banner (D-R39c round 2,
 * Codex NEW-4).
 */
const RESUME_BUSY_ATTEMPTS = 3;

/**
 * Milliseconds to wait before re-sending a resume the server called busy.
 *
 * Honours `retry_after_ms` when the refusal carries one, and otherwise backs off
 * exponentially from the same floor the `pending` protocol uses; bounded by the
 * same ceiling, so a hostile or confused value cannot park the customer.
 *
 * @param {Object} error   The rejected ApiError.
 * @param {number} attempt Zero-based retry number.
 * @return {number} Delay in milliseconds.
 */
function busyRetryDelay(error, attempt) {
  const hinted = Number(error && error.data && error.data.retry_after_ms || 0);
  const delay = hinted > 0 ? hinted : PAY_WAIT_MIN_MS * Math.pow(2, attempt);
  return Math.min(Math.max(delay, PAY_WAIT_MIN_MS), PAY_WAIT_MAX_MS);
}

/**
 * The widget host element (`[data-aponto-form]`) a gateway must mount beside.
 *
 * Reached through the ShadowRoot in production and through the DOM in a jsdom
 * test, because the host is the one node the gateway holder may be a child of —
 * the shield's `>` combinator and the `<slot>` projection both depend on it.
 *
 * @param {?HTMLElement} el Any element inside the widget (`.ap-wrap`).
 * @return {?HTMLElement} The host, or null.
 */
function widgetHost(el) {
  if (!el) {
    return null;
  }
  const root = typeof el.getRootNode === 'function' ? el.getRootNode() : null;
  if (root && root.host) {
    return root.host;
  }
  return typeof el.closest === 'function' ? el.closest('[data-aponto-form]') : null;
}
function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

/** Build the availability fetch date-range for a display-tz calendar month. */
function monthRange(year, month) {
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return {
    from_date: year + '-' + pad2(month + 1) + '-01',
    to_date: year + '-' + pad2(month + 1) + '-' + pad2(last)
  };
}
function App({
  config
}) {
  const api = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => (0,_lib_api_js__WEBPACK_IMPORTED_MODULE_1__.createApi)(config), [config]);
  const idem = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => (0,_lib_idempotency_js__WEBPACK_IMPORTED_MODULE_2__.createIdempotencyManager)(), []);

  // Focus the step heading only AFTER the visitor has driven a step change —
  // never on the widget's first paint (that would steal focus / scroll the page
  // the moment the block appears). Preselect auto-advance also leaves this false
  // so a preselected form doesn't grab focus on load. A ref (not state) keeps the
  // value readable during the same render that triggers the new step's mount.
  const navigatedRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(false);
  const markNav = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
    navigatedRef.current = true;
  }, []);
  const preselectedId = config.serviceId || null;

  // --- Timezone (init once, deterministic). ---------------------------------
  const tzInit = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => {
    const businessTz = (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.canonicalizeZone)(config.business.timezone || 'UTC');
    const browserTz = (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.browserTimezone)();
    return (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.resolveDisplayTz)({
      browserTz,
      businessTz
    });
  }, [config]);
  const [displayTz, setDisplayTz] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(tzInit.displayTz);
  const businessTz = tzInit.businessTz;
  const showSelector = tzInit.showSelector;
  const tzOptions = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => {
    const set = [];
    [tzInit.browserTz, businessTz, ...COMMON_ZONES].forEach(z => {
      if (z && !set.includes(z)) {
        set.push(z);
      }
    });
    return set;
  }, [tzInit, businessTz]);

  // --- Catalogue. -----------------------------------------------------------
  const [catalogue, setCatalogue] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)({
    loading: true,
    error: false,
    services: [],
    categories: []
  });
  const [service, setService] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(null);

  // A gateway RETURN leg (`?aponto_pay=…`) is a continuation, not a first
  // visit: the page must not flash the catalogue on its way to a confirmation
  // panel. Read once, from the URL the page loaded with.
  const returnLeg = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => (0,_lib_hold_js__WEBPACK_IMPORTED_MODULE_16__.readReturn)(typeof window !== 'undefined' && window.location ? window.location.search : ''), []);
  /**
   * A RESUME leg (`?aponto_resume=<manage token>`) — the link in the "complete
   * your payment" reminder (PR-A.3).
   *
   * Read once, from the URL the page loaded with, for the same reason the
   * return leg is: this visitor is finishing something, not starting it, and
   * the catalogue must not flash past on the way to the Payment step.
   */
  const resumeToken = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => (0,_lib_hold_js__WEBPACK_IMPORTED_MODULE_16__.readResume)(typeof window !== 'undefined' && window.location ? window.location.search : '', typeof window !== 'undefined' && window.location ? window.location.hash : ''), []);
  const [step, setStep] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(resumeToken ? 'payment' : returnLeg ? 'confirmation' : 'service');

  // The Service step is skipped when there is nothing to choose: a block-preselected service, OR
  // exactly one active service in the catalogue (B1 — finding U3 Jonas: making a lone service a
  // mandatory click is friction). The service still shows in the summary; the step fraction
  // renumbers honestly (3 steps, not 4) because `stepList` keys off this flag below.
  const singleService = !preselectedId && !catalogue.loading && catalogue.services.length === 1;
  const serviceLocked = !!preselectedId || singleService;

  // True once the first available day has been auto-picked for the current service, so a manual
  // pick or deliberate month browsing afterwards is never overridden (B1). Reset whenever the
  // visitor (re-)enters Date & time for a service.
  const autoPickedRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(false);
  const loadCatalogue = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
    setCatalogue(c => Object.assign({}, c, {
      loading: true,
      error: false
    }));
    api.getServices().then(res => {
      const services = res.items || [];
      setCatalogue({
        loading: false,
        error: false,
        services,
        categories: res.categories || []
      });
      // A gateway return leg is already showing an outcome panel; the
      // catalogue must not shove the visitor back into the flow behind
      // it just because there is one service to preselect.
      if (returnLeg || resumeToken) {
        return;
      }
      if (preselectedId) {
        const found = services.find(s => s.id === preselectedId);
        if (found) {
          autoPickedRef.current = false;
          setService(found);
          setStep('datetime');
        }
      } else if (services.length === 1) {
        // One active service → skip the Service step (B1). No markNav() so the
        // auto-advance doesn't steal focus on first paint, same as preselect.
        autoPickedRef.current = false;
        setService(services[0]);
        setStep('datetime');
      }
    }, () => setCatalogue(c => Object.assign({}, c, {
      loading: false,
      error: true
    })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, preselectedId]);
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    loadCatalogue();
  }, [loadCatalogue]);

  // --- Calendar + availability. --------------------------------------------
  const nowKey = (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.dayKeyInTz)(Date.now(), displayTz);
  const initialYear = Number(nowKey.slice(0, 4));
  const initialMonth = Number(nowKey.slice(5, 7)) - 1;
  const [cal, setCal] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)({
    year: initialYear,
    month: initialMonth
  });
  const [avail, setAvail] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)({
    loading: false,
    error: false,
    index: {},
    maxSlots: 1
  });
  const [selectedDayKey, setSelectedDayKey] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [selectedSlotUtc, setSelectedSlotUtc] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const fetchToken = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(0);
  const fetchAvailability = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useCallback)((year, month, tz) => {
    if (!service) {
      return;
    }
    const token = ++fetchToken.current;
    setAvail(a => Object.assign({}, a, {
      loading: true,
      error: false
    }));
    const range = monthRange(year, month);
    api.getAvailability(Object.assign({
      service_id: service.id,
      staff_id: config.staffId || null,
      tz
    }, range)).then(res => {
      if (token !== fetchToken.current) {
        return;
      }
      const index = (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.groupSlotsByDay)(res.slots || [], tz);
      let maxSlots = 1;
      Object.keys(index).forEach(k => {
        maxSlots = Math.max(maxSlots, index[k].length);
      });
      setAvail({
        loading: false,
        error: false,
        index,
        maxSlots
      });
    }, () => {
      if (token !== fetchToken.current) {
        return;
      }
      setAvail(a => Object.assign({}, a, {
        loading: false,
        error: true
      }));
    });
  }, [api, service, config.staffId]);

  // Refetch whenever the visible month, the display timezone, or the service change.
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (step === 'datetime' && service) {
      fetchAvailability(cal.year, cal.month, displayTz);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, service, cal.year, cal.month, displayTz]);

  // Auto-select the first day that has availability so times render immediately, Calendly-style
  // (B1 — finding U3 Jonas). Only the FIRST time per service-entry (autoPickedRef) and only while
  // nothing is chosen, so a manual pick or deliberate month browsing is respected. When the
  // visible month has no slots the pick defers to the first month the visitor navigates to that
  // does — the earliest bookable day, wherever it first appears.
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (step !== 'datetime' || avail.loading || selectedDayKey || autoPickedRef.current) {
      return;
    }
    const keys = Object.keys(avail.index).sort();
    if (keys.length > 0) {
      autoPickedRef.current = true;
      setSelectedDayKey(keys[0]);
    }
  }, [step, avail.index, avail.loading, selectedDayKey]);

  // --- Details + submit. ----------------------------------------------------
  const [details, setDetails] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)({
    name: '',
    email: '',
    phone: '',
    note: ''
  });
  const [consent, setConsent] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  // Answers to the site's extra booking-form fields, keyed by slug (D-R30).
  // Absent = unanswered; the submitted body carries only answered ones.
  const [customValues, setCustomValues] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)({});
  const [honeypot, setHoneypot] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)('');
  const [fieldErrors, setFieldErrors] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [submitting, setSubmitting] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [submitError, setSubmitError] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [rateSeconds, setRateSeconds] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(0);
  const [toast, setToast] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [response, setResponse] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(null);

  // --- Payment (D-R38). -----------------------------------------------------
  // Memoised so its identity is stable even on a config that predates D-R38 and
  // carries no `payments` key: `gateways` derives from it, and the gateway
  // lifecycle effect keys on `gateways` — a fresh object literal every render
  // would re-run that effect on every render.
  const payments = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => config.payments || {
    mode: 'off',
    holdMinutes: 30,
    gateways: []
  }, [config]);
  // The server decides what is OFFERED; this bundle decides what it can DRAW.
  // A gateway the site enables but this build has no adapter for is dropped
  // rather than rendered as a dead card.
  const gateways = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => (payments.gateways || []).filter(_lib_payments_js__WEBPACK_IMPORTED_MODULE_14__.isRenderable), [payments]);
  const [payMethod, setPayMethod] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [payError, setPayError] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)('');
  const [payNotice, setPayNotice] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [gatewayReady, setGatewayReady] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [gatewayLoading, setGatewayLoading] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  // The STEP LOCK for a gateway that owns the CTA (D-R40, Codex r1 #5). While
  // PayPal has an attempt in flight the buyer may already have approved an order
  // the server can still capture, so nothing that would abandon the booking may
  // run: Back, a method change, "Pay on-site instead", a hold release. Kept as a
  // ref AS WELL as state because the guards run inside callbacks that must not
  // depend on a render having happened first.
  const [gatewayBusy, setGatewayBusy] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const gatewayBusyRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(false);
  // What the confirmation panel says about the money, if anything.
  const [payResult, setPayResult] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [payIncomplete, setPayIncomplete] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [minimalConfirm, setMinimalConfirm] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  // The LIVE hold: what the widget needs to hand the slot back without waiting
  // for the expiry cron. A ref, not state — releasing it must never depend on a
  // render having happened.
  const holdRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  // One adapter per gateway the visitor has actually selected, kept alive for
  // the life of the step so switching methods does not reload an iframe (and
  // lose whatever was typed into it). Destroyed together on leaving the step.
  const adaptersRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)({});
  // Which gateways are still COMING UP, by code (verify round 2). An adapter is
  // registered in `adaptersRef` synchronously and becomes usable hundreds of
  // milliseconds later, so "is it mounted" and "is it ready" are two different
  // questions — and the loading line answers the second one, about the SELECTED
  // method only. A single global flag could not: selecting PayPal set it, and
  // coming back to an already-registered card adapter took the early-return
  // branch that only refreshed `gatewayReady`, so the line stayed on the card
  // panel for ever with nothing left to turn it off (PayPal's own settle sees
  // itself superseded and correctly says nothing about a method it is not).
  const mountingRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)({});
  const wrapRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  // Bumped by "Try again" on a gateway that never came up, so the mount effect
  // runs once more without anything else about the step having changed.
  const [mountNonce, setMountNonce] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(0);
  // The method selected RIGHT NOW (Codex r1 #17). A gateway mount is
  // asynchronous on three axes — the SDK fetch, the element's own render, the
  // mount promise — and the visitor can change their mind inside all three, so
  // every settle asks this ref rather than trusting what its closure captured:
  // a PayPal render that lands after the buyer chose Stripe cannot show its
  // buttons, and cannot leave a live button behind that would check out against
  // a method nobody is looking at.
  //
  // Moved SYNCHRONOUSLY with the click by {@link selectMethod}, not one render
  // later: a settle landing between the commit and the effect flush would
  // otherwise read the previous selection and unhide a gateway the visitor has
  // just left.
  const selectedMethodRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  // The widget's half of the payment sequence, for a gateway that starts it
  // from its OWN control (PayPal). Refreshed after every render so the buttons
  // always call the CURRENT closures rather than the ones captured when they
  // were rendered — a mount that is deliberately never repeated.
  const gatewayFlowRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)({});
  // RESUME: what the server handed back for an existing hold. `resumeRef` is
  // what `begin()` resolves on this path — the intent already exists, so the
  // sequence skips straight to `confirmPayment` and creates no second booking.
  const [resume, setResume] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [resumeError, setResumeError] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const resumeRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);

  /**
   * Whether this booking has a Payment step at all — re-derived on EVERY
   * render, never remembered, so the fraction can never promise a step the
   * current selection does not have.
   *
   * All three conditions are the server's own (rest-contract §3.3): a site with
   * `mode: off` or nothing offered takes no method, and a free or unpriced
   * service never takes one whatever the mode says. Deriving the step from the
   * same predicate the route validates is what stops the widget from building a
   * request the route will reject.
   *
   * On the Service step there is no selection yet, so the price question is
   * asked of the CATALOGUE instead: a site whose services cost money shows the
   * five-step fraction from the first screen rather than growing a step under
   * the visitor's feet. It still renumbers for the visitor who then picks a
   * free service — that is a real change to their flow, not a lie about it.
   */
  const paymentStepExists = !!resume || payments.mode !== 'off' && gateways.length > 0 && (service ? Number(service.price_minor) > 0 : catalogue.services.some(s => Number(s.price_minor) > 0));

  /**
   * The site currency's ISO exponent, from the server (D-R39a).
   *
   * Every money string the widget prints goes through it, because `Intl`'s own
   * digit table disagrees with ISO for at least one live currency and the
   * stored `price_minor` was written against ISO.
   */
  // On a resume the ORDER's own exponent wins: that order was priced against it,
  // and the widget never loaded the catalogue this page's boot data describes.
  const currencyExponent = resume && resume.order && resume.order.currency_exponent !== null ? resume.order.currency_exponent : payments.currencyExponent;

  /** The order total, formatted exactly as the summary already shows it. */
  const totalLabel = service ? (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_15__.formatMoney)(service.price_minor, service.currency, config.locale, currencyExponent) : '';

  /**
   * A local clock-time label for a hold deadline.
   *
   * @param {?string} iso RFC3339 instant, or null to project from `hold_minutes`.
   * @return {?string} Label, or null when neither is available.
   */
  function deadlineLabel(iso) {
    if (iso) {
      return (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.fmtTime)(iso, displayTz, config.locale);
    }
    if (!payments.holdMinutes) {
      return null;
    }
    return (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.fmtTime)(new Date(Date.now() + payments.holdMinutes * 60000).toISOString(), displayTz, config.locale);
  }

  // Rate-limit countdown.
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (rateSeconds <= 0) {
      return undefined;
    }
    const t = setTimeout(() => {
      const next = rateSeconds - 1;
      setRateSeconds(next);
      if (next <= 0) {
        setSubmitError(e => e && e.kind === 'rate_limited' ? null : e);
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [rateSeconds]);

  // Auto-dismiss the slot-taken toast.
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!toast) {
      return undefined;
    }
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);
  const phoneMode = config.fields.phone;
  const consentEnabled = config.fields.consent.enabled;
  const customFields = config.fields.custom || [];

  /**
   * The answered custom fields, trimmed and pruned exactly the way the server
   * validates them (D-R30): a blank answer and an unchecked box are "not
   * answered", so they must be absent on BOTH sides — the fingerprint and the
   * body are built from this one map, so they can never disagree.
   *
   * @return {Object} `slug -> string|true`, only for answered fields.
   */
  function collectCustom() {
    const out = {};
    customFields.forEach(f => {
      const raw = customValues[f.slug];
      if (f.type === 'checkbox') {
        if (raw === true) {
          out[f.slug] = true;
        }
        return;
      }
      const value = (raw === undefined || raw === null ? '' : String(raw)).trim();
      if (value) {
        out[f.slug] = value;
      }
    });
    return out;
  }

  /**
   * The payment module code this draft would be submitted with, or `''`.
   *
   * `''` for on-site, for a step that does not exist, and for a free service —
   * and `''` is what keeps the fingerprint byte-identical to the pre-payment
   * build on a site that takes no money (D-R38 / `idempotency.js`).
   *
   * @param {string} [override] Method being switched TO, before state updates.
   * @return {string} Module code or ''.
   */
  function paymentMethodOf(override) {
    if (!paymentStepExists) {
      return '';
    }
    const method = override === undefined ? payMethod : override;
    return method && method !== _components_PaymentStep_jsx__WEBPACK_IMPORTED_MODULE_9__.ONSITE ? method : '';
  }
  function buildDraft(methodOverride) {
    // Trim every customer field symmetrically. Because the idempotency key
    // rotates on the draft fingerprint (which trims) while the request body is
    // built from the same draft, an untrimmed field here would let a trailing
    // space change the body WITHOUT rotating the key → a spurious
    // `aponto_idempotency_conflict`. Trimming once, at the source, keeps the
    // fingerprint and the body in lockstep.
    return {
      service_id: service ? service.id : null,
      staff_id: config.staffId || null,
      start_utc: selectedSlotUtc,
      tz: displayTz,
      consent: consentEnabled ? consent : false,
      customer: {
        name: details.name.trim(),
        email: details.email.trim(),
        phone: phoneMode === 'off' ? '' : details.phone.trim(),
        note: details.note.trim()
      },
      custom_fields: collectCustom(),
      payment_method: paymentMethodOf(methodOverride)
    };
  }
  function buildBody(draft) {
    // The draft is already trimmed (see buildDraft) so the body passes the
    // values through unchanged — same bytes the fingerprint hashed.
    const body = {
      service_id: draft.service_id,
      start_utc: draft.start_utc,
      tz: draft.tz,
      consent: draft.consent,
      customer: {
        name: draft.customer.name,
        email: draft.customer.email,
        phone: draft.customer.phone,
        note: draft.customer.note
      }
    };
    if (draft.staff_id) {
      body.staff_id = draft.staff_id;
    }
    // Only ever sent when the site declares fields AND the visitor answered
    // one: on a build that collects none the key never appears, so the
    // server's allow-list stays exactly as strict as before (D-R30).
    if (Object.keys(draft.custom_fields || {}).length) {
      body.custom_fields = draft.custom_fields;
    }
    // Same conditional-key rule as `custom_fields`: absent unless the visitor
    // actually chose to pay online, so the public surface of a site that does
    // not sell is byte-identical to the build before D-R38. The body carries
    // NO amount — the server charges what the order says (D-R38c).
    if (draft.payment_method) {
      body.payment = {
        method: draft.payment_method
      };
    }
    return body;
  }
  function validateDetails() {
    const e = {};
    if (!details.name.trim()) {
      e.name = _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.err_name_required;
    }
    if (!details.email.trim()) {
      e.email = _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.err_email_required;
    } else if (!EMAIL_RE.test(details.email.trim())) {
      e.email = _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.err_email_invalid;
    }
    if (phoneMode === 'required' && !details.phone.trim()) {
      e.phone = _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.err_phone_required;
    }
    if (consentEnabled && !consent) {
      e.consent = _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.err_consent_required;
    }
    // Custom fields: required + length, mirroring the server rules the
    // visitor would otherwise only meet as a 422 after a round trip.
    customFields.forEach(f => {
      const key = (0,_components_DetailsStep_jsx__WEBPACK_IMPORTED_MODULE_8__.customKey)(f.slug);
      const raw = customValues[f.slug];
      if (f.type === 'checkbox') {
        if (f.required && raw !== true) {
          e[key] = _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.err_field_required;
        }
        return;
      }
      const value = (raw === undefined || raw === null ? '' : String(raw)).trim();
      if (!value) {
        if (f.required) {
          e[key] = _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.err_field_required;
        }
        return;
      }
      if (f.maxLength && value.length > f.maxLength) {
        e[key] = (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.err_field_too_long, f.maxLength);
      }
    });
    return Object.keys(e).length ? e : null;
  }
  const backToDateTimeRefresh = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useCallback)(toastPayload => {
    setStep('datetime');
    setSelectedSlotUtc(null);
    setSubmitting(false);
    if (toastPayload) {
      setToast(toastPayload);
    }
    fetchAvailability(cal.year, cal.month, displayTz);
  }, [cal.year, cal.month, displayTz, fetchAvailability]);

  /**
   * POST the booking, absorbing every retryable failure the contract defines.
   *
   * Returns `{ok:true, response}` or `{ok:false}` — it no longer decides what a
   * successful booking LEADS to, because that now has two answers: a free
   * booking goes straight to the confirmation, a paid one goes on to the
   * gateway. Every `{ok:false}` path has already put its own recovery UI on
   * screen; the caller must not add a second message.
   */
  const attemptBooking = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useCallback)(async function attempt(body, key, ctx) {
    try {
      const res = await api.createBooking(body, key);
      setSubmitError(null);
      return {
        ok: true,
        response: res
      };
    } catch (raw) {
      const info = (0,_lib_errors_js__WEBPACK_IMPORTED_MODULE_4__.classifyError)(raw);
      switch (info.kind) {
        case 'slot_taken':
        case 'not_found':
          backToDateTimeRefresh({
            title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.toast_slot_taken_title,
            body: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.toast_slot_taken_body
          });
          break;
        case 'validation':
          {
            const mapped = mapFieldErrors(info.fields);
            const fieldKeys = Object.keys(mapped).filter(k => k !== '__slot' && k !== '__stale');
            if (mapped.__slot) {
              backToDateTimeRefresh({
                title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.toast_slot_taken_title,
                body: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.err_pick_time
              });
            } else if (mapped.__stale) {
              // The form is older than the site's field list. Show
              // the server's own public-safe message plus the one
              // action that can fix it, and still mark up any error
              // that DOES have a field so nothing is hidden.
              setSubmitError({
                kind: 'validation_stale',
                message: String(mapped.__stale)
              });
              setFieldErrors(fieldKeys.length ? mapped : null);
              setSubmitting(false);
            } else if (fieldKeys.length) {
              setFieldErrors(mapped);
              setSubmitting(false);
            } else {
              // A 422 we could not attribute to any known field
              // (e.g. a server-side rule the client does not model).
              // Surface a general banner rather than failing silently,
              // preferring the server's public-safe message when present.
              setSubmitError({
                kind: 'validation_general',
                message: raw && raw.message ? String(raw.message) : ''
              });
              setSubmitting(false);
            }
            break;
          }
        case 'rate_limited':
          setSubmitError({
            kind: 'rate_limited'
          });
          setRateSeconds(info.retryAfter && info.retryAfter > 0 ? Math.ceil(info.retryAfter) : 30);
          setSubmitting(false);
          break;
        case 'lock_timeout':
          if (!ctx.lockRetried) {
            await new Promise(r => setTimeout(r, 600));
            return attempt(body, key, {
              ...ctx,
              lockRetried: true
            });
          }
          setSubmitError({
            kind: 'lock_timeout'
          });
          setSubmitting(false);
          break;
        case 'in_flight':
          if (ctx.inflightTries < 4) {
            setSubmitError({
              kind: 'in_flight'
            });
            await new Promise(r => setTimeout(r, 2000));
            return attempt(body, key, {
              ...ctx,
              inflightTries: ctx.inflightTries + 1
            });
          }
          setSubmitError({
            kind: 'in_flight_manual'
          });
          setSubmitting(false);
          break;
        case 'conflict':
          if (!ctx.conflictRetried) {
            idem.reset();
            // The draft travels in `ctx` rather than being rebuilt
            // here: this callback is memoised, so a rebuilt draft
            // would be the one from the render that created it —
            // and a fingerprint taken from stale state is exactly
            // the bug this branch exists to recover from.
            return attempt(body, idem.keyFor(ctx.draft), {
              ...ctx,
              conflictRetried: true
            });
          }
          setSubmitError({
            kind: 'guard'
          });
          setSubmitting(false);
          break;
        case 'guard':
          setSubmitError({
            kind: 'guard'
          });
          setSubmitting(false);
          break;
        default:
          setSubmitError({
            kind: 'network'
          });
          setSubmitting(false);
      }
      return {
        ok: false
      };
    }
  }, [api, idem, backToDateTimeRefresh] // eslint-disable-line react-hooks/exhaustive-deps
  );
  function mapFieldErrors(fields) {
    const out = {};
    if (!fields) {
      return out;
    }
    // The error keys this page actually has an input for.
    const renderedCustomSlugs = new Set(customFields.map(f => (0,_components_DetailsStep_jsx__WEBPACK_IMPORTED_MODULE_8__.customKey)(f.slug)));
    Object.keys(fields).forEach(k => {
      const msg = fields[k];
      if (k === 'customer.name' || k === 'name') {
        out.name = msg;
      } else if (k === 'customer.email' || k === 'email') {
        out.email = msg;
      } else if (k === 'customer.phone' || k === 'phone') {
        out.phone = msg;
      } else if (k === 'consent') {
        out.consent = msg;
      } else if (k.indexOf('custom_fields.') === 0) {
        // The server keys these exactly as the renderer does, so a
        // server-only rule lands under its own input instead of in the
        // generic banner (D-R30).
        //
        // UNLESS this page has no such input: an admin can add a
        // required field while a visitor sits on the details step, and
        // that visitor's 422 then names a slug their form never
        // rendered. Attaching it to nothing would leave them
        // permanently and silently blocked — the Book button keeps
        // failing with no message anywhere. Those route to the banner
        // with a refresh hint instead (Codex review).
        if (renderedCustomSlugs.has(k)) {
          out[k] = msg;
        } else {
          out.__stale = msg;
        }
      } else if (k === 'start_utc' || k === 'service_id' || k === 'X-Aponto-Idempotency') {
        out.__slot = msg;
      }
    });
    return out;
  }

  /** Land on the confirmation panel with an optional payment line. */
  function finishBooking(res, paymentLine) {
    holdRef.current = null;
    setSubmitError(null);
    setSubmitting(false);
    setResponse(res);
    setPayResult(paymentLine || null);
    setPayIncomplete(null);
    setStep('confirmation');
  }

  /**
   * Remember the live hold so it can be handed back without waiting for the
   * expiry cron, and persist the ORIGINAL response for a return leg.
   *
   * A REPLAY (`links_available:false`) deliberately carries no `manage_url`, so
   * the token already captured is kept: a retry after an `unavailable` begin
   * must not lose the only handle the widget has on its own hold.
   *
   * @param {Object}  res     Booking response.
   * @param {?Object} payment The response's `payment` block.
   */
  function rememberHold(res, payment) {
    const booking = res.booking || {};
    const order = booking.order || {};
    const code = order.code || '';
    const previous = holdRef.current;
    // IN MEMORY: everything needed to hand the slot back, including the raw
    // manage token. It dies with the tab and is never written anywhere.
    holdRef.current = {
      orderCode: code,
      token: (0,_lib_hold_js__WEBPACK_IMPORTED_MODULE_16__.manageToken)(res.manage_url) || (previous ? previous.token : ''),
      expiresAt: payment ? payment.expires_at : null
    };
    // IN sessionStorage: a WHITELIST, and only a whitelist.
    //
    // The first cut stored the booking response verbatim, which meant the
    // intent's client secret, the manage URL and the ICS URL — i.e. the
    // bearer capability to view and cancel the booking — sat in a store any
    // script on the page can read and any later visitor to that tab inherits.
    // None of that is needed: the return leg only has to render a minimal
    // confirmation and name the reference it is asking the SERVER about. So
    // what goes in is display facts plus references, nothing that grants
    // anything, and it is cleared the moment the payment settles.
    (0,_lib_hold_js__WEBPACK_IMPORTED_MODULE_16__.storeHold)(code, {
      order_code: code,
      gateway: payment ? payment.gateway || '' : '',
      gateway_ref: payment ? payment.gateway_ref || '' : '',
      expires_at: payment ? payment.expires_at || null : null,
      booking: {
        status: booking.status || '',
        start_utc: booking.start_utc || '',
        end_utc: booking.end_utc || '',
        service_name: booking.service ? booking.service.name || '' : '',
        staff_name: booking.staff ? booking.staff.name || '' : '',
        display_tz: displayTz
      }
    });
  }

  /**
   * Move the gateway step lock, in the ref and in state together.
   *
   * @param {boolean} flag Whether an attempt is in flight.
   */
  function markGatewayBusy(flag) {
    gatewayBusyRef.current = !!flag;
    setGatewayBusy(!!flag);
  }

  /**
   * Give a held slot back immediately.
   *
   * D-R38k: an unpaid hold is not subject to `min_cancel_hours` — the customer
   * never committed anything — so the moment they walk away from it (Back, or
   * "pay on-site instead") the slot goes back on sale. The idempotency key is
   * reset with it: the next POST is a NEW booking, not a retry of the cancelled
   * one.
   *
   * REFUSED while a gateway has an attempt in flight (Codex r1 #5). "Unpaid" is
   * a claim about this instant, and inside a live PayPal approval it is one the
   * widget cannot make: the buyer may have approved seconds ago and the server
   * may be capturing right now. Releasing there hands the slot to somebody else
   * and charges this customer for it. The last line of defence rather than the
   * first — every control that reaches here is disabled for the same span.
   *
   * @return {Promise<boolean>} Whether the slot was actually released.
   */
  async function releaseHold() {
    if (gatewayBusyRef.current) {
      return false;
    }
    const hold = holdRef.current;
    if (!hold) {
      return true;
    }
    holdRef.current = null;
    (0,_lib_hold_js__WEBPACK_IMPORTED_MODULE_16__.clearHold)(hold.orderCode);
    idem.reset();
    if (!hold.token) {
      return false;
    }
    try {
      await api.cancelBooking(hold.token);
      return true;
    } catch {
      // The hold outlives us either way — say so rather than pretending.
      setToast({
        title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.pay_hold_kept_title,
        body: hold.expiresAt ? (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.pay_hold_kept, deadlineLabel(hold.expiresAt)) : _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.pay_hold_kept_generic
      });
      return false;
    }
  }

  /**
   * Drop one gateway's adapter: out of the registry FIRST, then torn down.
   *
   * That order matters. `destroy()` releases the adapter's step lock, which
   * calls back into the widget, and a callback that found the adapter still
   * registered would be answering for an instance that no longer exists.
   *
   * @param {string} code Payment module code.
   */
  function dropAdapter(code) {
    const adapter = adaptersRef.current[code];
    if (!adapter) {
      return;
    }
    delete adaptersRef.current[code];
    delete mountingRef.current[code];
    adapter.destroy();
  }

  /**
   * Turn the gateway's answer into what the visitor sees.
   *
   * The widget NEVER decides that a payment succeeded: `succeeded` here means
   * the gateway's own JS said so, and the only thing that follows from it is a
   * call to `/confirm`, where the SERVER asks the gateway and applies the
   * result (D-R38d). A confirm leg that fails to answer is therefore not a
   * failure of the payment — the webhook is the second, independent leg — so it
   * degrades to "processing", never to "not paid".
   *
   * @param {Object} out    Adapter result.
   * @param {string} method The payment module code that produced it.
   */
  async function applyPaymentOutcome(out, method) {
    if (out.status === 'validation') {
      setSubmitting(false);
      setPayError(out.message || _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.pay_generic_error);
      return;
    }
    if (out.status === 'unmounted') {
      // The gateway's own UI stopped being something the customer can pay
      // with — the SAME fact as a mount that never came up, so it gets the
      // same recovery rather than a dead sentence under dead buttons
      // (Codex r1 #16). The adapter is torn down and dropped from the
      // registry, which is what makes "Try again" MOUNT it again (a fresh
      // `mountNonce`) instead of re-running a booking POST nobody could
      // then pay for.
      setSubmitting(false);
      dropAdapter(method);
      setGatewayReady(false);
      setGatewayLoading(false);
      setPayError('');
      // Honest either way: before `createOrder` nothing exists, but a zoid
      // failure AFTER it leaves a real booking on a live hold, and telling
      // that customer "nothing has been booked" is simply false.
      const held = holdRef.current;
      setPayNotice({
        title: (0,_lib_payments_js__WEBPACK_IMPORTED_MODULE_14__.gatewayUnavailableCopy)(method),
        body: held ? holdBody({
          expires_at: held.expiresAt
        }) : _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.pay_ui_unavailable_body
      });
      return;
    }
    if (out.status === 'cancelled') {
      // The customer closed the gateway's own window. NOTHING is lost —
      // the booking, its hold and the gateway's UI are all exactly as they
      // were — so this is a sentence, not a recovery flow.
      setSubmitting(false);
      setPayError((0,_lib_payments_js__WEBPACK_IMPORTED_MODULE_14__.gatewayCancelledCopy)(method));
      return;
    }
    if (out.status === 'unavailable') {
      // The booking EXISTS and the hold is alive — only the intent failed.
      // Retrying reuses the same idempotency key, so the replay produces a
      // fresh begin attempt against the same hold (rest-contract §3.3).
      //
      // UNLESS the server said not to. `retryable: false` means the gateway
      // REFUSED this order's amount or currency (an amount with more
      // precision than the gateway's currency has, say), which is the same
      // answer every time — so the hold deadline, whose whole message is
      // "try again before this", is replaced by the honest sentence. The
      // field is additive and absent means retryable (QA run 2 BUG-3).
      const refused = !!out.payment && out.payment.retryable === false;
      setSubmitting(false);
      setPayNotice({
        title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.pay_begin_failed_title,
        body: refused ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.pay_begin_refused_body : holdBody(out.payment),
        retry: !refused
      });
      return;
    }
    if (out.status === 'failed') {
      // Declines keep the hold AND the client secret: the customer retries
      // on the same intent rather than starting the whole booking again.
      setSubmitting(false);
      setPayError(out.message || _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.pay_generic_error);
      return;
    }

    // A gateway whose approval callback has to KNOW the outcome — PayPal
    // cannot decide about `actions.restart()` without it — has already run
    // the confirm leg and hands the answer over. `undefined` means it did
    // not; `null` means it did and the server did not answer, which is a
    // different fact and must not be re-asked.
    let state = out.state;
    if (state === undefined) {
      try {
        state = await api.confirmPayment(method, out.ref);
      } catch {
        state = null;
      }
    }
    const status = state ? state.payment_status : 'pending';
    // `failure_code` is what separates "still moving" from "it did not work"
    // (rest-contract §3.8). An unsettled order that carries a reason has
    // FAILED, and reading it as "processing" is how a customer gets sent to a
    // confirmation panel for money that never arrived — with the hold thrown
    // away, so they cannot even retry.
    const failure = state ? String(state.failure_code || '') : '';
    const orderCode = (((out.response || {}).booking || {}).order || {}).code || '';
    // `unverified_amount` is the one code that is NOT a decline (§3.8): the
    // driver could not assert a figure it did not read back, and the payment
    // may perfectly well have gone through. It therefore takes the PENDING
    // path — booking made, nothing offered to retry — because inviting a
    // second payment is the worst possible answer to "we are not sure what
    // you were charged". The panel says so in its own words.
    const unverified = 'unverified_amount' === failure;
    if (status === 'paid' || status === 'pending' && (!failure || unverified)) {
      (0,_lib_hold_js__WEBPACK_IMPORTED_MODULE_16__.clearHold)(orderCode);
      idem.reset();
      finishBooking(mergeBookingStatus(out.response, state), {
        status: unverified ? 'unverified' : status,
        amountLabel: totalLabel,
        orderCode,
        // So the panel can say HOW they paid. A return leg has no method
        // to name (the whitelist carries none) and gets the neutral line.
        method
      });
      return;
    }
    if ('hold_released' === failure) {
      // The server refused to capture because the hold was already gone
      // (rest-contract §3.8): the slot is back on sale, so retrying THIS
      // order is the one recovery that cannot work. Everything local to it
      // is dropped — the hold reference, the stored whitelist entry, the
      // idempotency key — and the panel offers a fresh booking instead of a
      // button that would fail the same way.
      setSubmitting(false);
      holdRef.current = null;
      (0,_lib_hold_js__WEBPACK_IMPORTED_MODULE_16__.clearHold)(orderCode);
      idem.reset();
      setPayIncomplete({
        orderCode,
        deadlineLabel: null,
        failureCopy: (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.paymentFailureCopy)(failure),
        released: true,
        retryable: false
      });
      setStep('confirmation');
      return;
    }
    if (failure) {
      // Keep EVERYTHING: the hold, its manage token, the mounted element
      // and its client secret. The customer retries the same intent on the
      // same booking — a fresh booking would strand the slot they hold.
      setSubmitting(false);
      setPayError((0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.paymentFailureCopy)(failure));
      return;
    }
    setSubmitting(false);
    setPayIncomplete({
      orderCode,
      deadlineLabel: deadlineLabel(state ? state.expires_at : null),
      retryable: true
    });
    setStep('confirmation');
  }

  /** The hold-deadline sentence under a "couldn't start the payment" notice. */
  function holdBody(payment) {
    const label = deadlineLabel(payment ? payment.expires_at : null);
    return label ? (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.pay_hold_until, label) : _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.pay_hold_generic;
  }

  /**
   * Fold the confirm leg's authoritative booking status back into the original
   * response, so the panel says "confirmed" when auto-confirm fired.
   *
   * @param {Object}  res   Original booking response.
   * @param {?Object} state Confirm response.
   * @return {Object} Response to render.
   */
  function mergeBookingStatus(res, state) {
    if (!state || !state.booking_status) {
      return res;
    }
    return Object.assign({}, res, {
      booking: Object.assign({}, res.booking, {
        status: state.booking_status
      })
    });
  }

  /**
   * Run the paid path: the gateway validates, the server creates the booking
   * AND the hold AND the intent, the gateway charges, the server confirms.
   *
   * The adapter owns the interleaving because only it knows what its gateway
   * requires; the widget owns what happens either side of it.
   *
   * @param {Object} body  Request body.
   * @param {string} key   Idempotency key.
   * @param {Object} ctx   Retry context.
   * @param {Object} draft The draft behind `body`.
   */
  /**
   * Create the booking + hold + intent, honouring the WAIT protocol.
   *
   * `payment.status: "pending"` (rest-contract §3.3) does not mean "no intent";
   * it means "another request for this order is inside the gateway call right
   * now, and its claim is still fresh — wait, do not start a second attempt".
   * Treating it as a failure is how one hold ends up with TWO live intents on
   * the gateway: a customer with two tabs open can then pay the one nobody is
   * tracking. So we re-POST with the SAME idempotency key — a replay, not a new
   * booking — until the other request has written its `gateway_ref`.
   *
   * The budget is bounded on all three axes (per-wait clamp, attempts, total
   * elapsed) because the other request can also simply die: when the budget is
   * spent we hand back the last `pending` block, the adapter reads it as "no
   * usable intent", and the customer gets the manual retry / on-site notice
   * instead of a spinner that never ends.
   *
   * @param {Object} body Request body.
   * @param {string} key  Idempotency key — the SAME one for every attempt.
   * @param {Object} ctx  Retry context.
   * @return {Promise<{response: Object, payment: ?Object}>} The begin result.
   */
  async function beginWithRetry(body, key, ctx) {
    let waited = 0;
    for (let attempt = 0;; attempt++) {
      const res = await attemptBooking(body, key, ctx);
      if (!res.ok) {
        throw HANDLED;
      }
      const payment = res.response.payment || null;
      rememberHold(res.response, payment);
      if (!payment || payment.status !== 'pending') {
        return {
          response: res.response,
          payment
        };
      }
      const delay = Math.min(Math.max(Number(payment.retry_after_ms) || PAY_WAIT_MIN_MS, PAY_WAIT_MIN_MS), PAY_WAIT_MAX_MS);
      if (attempt + 1 >= PAY_WAIT_ATTEMPTS || waited + delay > PAY_WAIT_TOTAL_MS) {
        return {
          response: res.response,
          payment
        };
      }
      waited += delay;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  async function runPayment(body, key, ctx, draft) {
    const adapter = adaptersRef.current[draft.payment_method];
    if (!adapter) {
      setSubmitting(false);
      setPayError((0,_lib_payments_js__WEBPACK_IMPORTED_MODULE_14__.gatewayUnavailableCopy)(draft.payment_method));
      return;
    }
    let out;
    try {
      out = await adapter.submit({
        begin: () => beginWithRetry(body, key, ctx),
        returnUrl: params => (0,_lib_hold_js__WEBPACK_IMPORTED_MODULE_16__.buildReturnUrl)(typeof window !== 'undefined' && window.location ? window.location.href : '', params)
      });
    } catch (error) {
      setSubmitting(false);
      if (error !== HANDLED) {
        // A throw from the gateway's own JS. Its text is written for an
        // integrator, so the visitor gets our copy instead.
        setPayError(_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.pay_generic_error);
      }
      return;
    }
    await applyPaymentOutcome(out, draft.payment_method);
  }

  // --- The sequence for a gateway that owns the step's CTA. -----------------
  //
  // PayPal's popup opens from a click on PayPal's own iframe, so the sequence
  // starts inside the adapter rather than at `submit()`. These three callbacks
  // are the widget's half of it, and they are deliberately the SAME code paths
  // the Pay button drives: one booking POST, one confirm leg, one funnel for
  // every outcome. Nothing here is gateway-specific.

  /**
   * Validate, mint the key and create the booking + hold + intent, because the
   * gateway's own control was activated.
   *
   * Resolves `null` when the widget refused — invalid details, or a booking
   * error whose recovery UI is already on screen. The adapter reads that as
   * "do not open a checkout", and must not add a message of its own.
   *
   * @return {Promise<?{response: Object, payment: ?Object}>} The begin result.
   */
  async function gatewayCheckout() {
    if (submitting) {
      return null;
    }
    // RESUME: the booking, its order and its intent all exist already, so
    // this leg has nothing to create — it hands back what the resume route
    // returned, which is the same `{response, payment}` a fresh begin
    // resolves. Two reasons it cannot fall through to the code below: there
    // are no details on this page to validate (they were taken when the
    // booking was made, and `validateDetails()` would bounce the visitor to a
    // step this flow never had), and a second POST would mint a second hold
    // nobody can pay for. The SERVER still claims the attempt exactly as it
    // does for a first one — the resume route goes through
    // `PaymentService::beginPayment()`, so the reuse rule, the attempt budget
    // and the per-order lock all apply unchanged.
    if (resumeRef.current) {
      setPayError('');
      setPayNotice(null);
      setSubmitting(true);
      return resumeRef.current;
    }
    const errors = validateDetails();
    if (errors) {
      // The fields are not on this step, so showing the errors means going
      // back to the step that owns them.
      setFieldErrors(errors);
      markNav();
      setStep('details');
      return null;
    }
    if (honeypot) {
      setSubmitError({
        kind: 'guard'
      });
      return null;
    }
    setFieldErrors(null);
    setSubmitError(null);
    setPayError('');
    setPayNotice(null);
    setSubmitting(true);
    const draft = buildDraft();
    const key = idem.keyFor(draft);
    const ctx = {
      lockRetried: false,
      inflightTries: 0,
      conflictRetried: false,
      draft
    };
    try {
      return await beginWithRetry(buildBody(draft), key, ctx);
    } catch (error) {
      setSubmitting(false);
      if (error !== HANDLED) {
        setPayError(_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.pay_generic_error);
      }
      return null;
    }
  }

  /**
   * Ask the SERVER what one gateway reference actually did (rest-contract §3.8).
   *
   * Never throws: a confirm leg that cannot answer is not evidence that the
   * money failed — the webhook is the second, independent leg — so `null` means
   * "unknown", and {@link applyPaymentOutcome} degrades it to "processing".
   *
   * @param {string} method Payment module code.
   * @param {string} ref    Gateway payment reference.
   * @return {Promise<?Object>} Confirm state, or null.
   */
  async function gatewayConfirm(method, ref) {
    try {
      return await api.confirmPayment(method, ref);
    } catch {
      return null;
    }
  }

  /** The "Try again" on a payment notice, which means three different things. */
  function retryPayment() {
    if (gatewayBusyRef.current) {
      // A gateway with an attempt in flight has nothing to retry, and the
      // mount path below would tear its buttons out from under a buyer who
      // has the popup open.
      return;
    }
    setPayError('');
    setPayNotice(null);
    const adapter = payMethod && payMethod !== _components_PaymentStep_jsx__WEBPACK_IMPORTED_MODULE_9__.ONSITE ? adaptersRef.current[payMethod] : null;
    if (!adapter) {
      // The gateway never came up. Retrying means MOUNTING it again — there
      // is no payment UI to submit through, so re-running the booking POST
      // would only produce a second hold nobody can pay for.
      setMountNonce(n => n + 1);
      return;
    }
    if (adapter.ownsCta) {
      // PayPal: its buttons are still on the step and are the only thing
      // that can start the sequence. Clearing the banner is the whole of
      // "try again" here — pressing anything of ours would do nothing.
      return;
    }
    submit();
  }

  /**
   * Pay an EXISTING hold: the same adapter sequence, with `begin()` resolving
   * what the server already handed us instead of creating anything.
   *
   * That is the whole difference. Everything after it — the decline copy, the
   * confirm leg, the failure-code rule — is the code the in-tab flow runs, so
   * a resumed payment cannot drift from a fresh one.
   */
  async function runResumePayment() {
    const adapter = adaptersRef.current[payMethod];
    const stored = resumeRef.current;
    if (!adapter || !stored) {
      setSubmitting(false);
      setPayError(_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.pay_ui_unavailable);
      return;
    }
    let out;
    try {
      out = await adapter.submit({
        begin: async () => stored,
        returnUrl: params => (0,_lib_hold_js__WEBPACK_IMPORTED_MODULE_16__.buildReturnUrl)(typeof window !== 'undefined' && window.location ? window.location.href : '', params)
      });
    } catch {
      setSubmitting(false);
      setPayError(_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.pay_generic_error);
      return;
    }
    await applyPaymentOutcome(out, payMethod);
  }
  function submit() {
    if (submitting) {
      return;
    }
    markNav();
    // RESUME: the booking already exists and so does its intent. There is no
    // draft to validate (the details were taken when it was made) and no POST
    // to send — the sequence starts at `confirmPayment`.
    if (resumeRef.current) {
      setPayError('');
      setPayNotice(null);
      setSubmitting(true);
      runResumePayment();
      return;
    }
    // Re-validated even on the Payment step, where these fields passed on the
    // way in: nothing stops a visitor going Back and clearing one.
    const errors = validateDetails();
    if (errors) {
      setFieldErrors(errors);
      if (step === 'payment') {
        setStep('details');
      }
      return;
    }
    if (honeypot) {
      // Bot filled the offscreen field — refuse quietly with the guard message.
      setSubmitError({
        kind: 'guard'
      });
      return;
    }
    setFieldErrors(null);
    setSubmitError(null);
    setPayError('');
    setPayNotice(null);
    setSubmitting(true);
    const draft = buildDraft();
    const key = idem.keyFor(draft);
    const ctx = {
      lockRetried: false,
      inflightTries: 0,
      conflictRetried: false,
      draft
    };
    const body = buildBody(draft);
    if (draft.payment_method) {
      runPayment(body, key, ctx, draft);
      return;
    }
    attemptBooking(body, key, ctx).then(out => {
      if (out.ok) {
        finishBooking(out.response, null);
      }
    });
  }

  // --- Gateway lifecycle. ---------------------------------------------------

  /**
   * Own the gateway UI for as long as the Payment step is on screen.
   *
   * The mount node is NOT in this tree (see the file header), so the lifecycle
   * has to be explicit. Three rules, all measured in the spike:
   *
   *  - One adapter per gateway the visitor has actually selected, kept alive
   *    while the step is. Switching card → on-site → card must not reload the
   *    iframe, because a reloaded Payment Element loses what was typed into it.
   *  - Visibility is toggled on the adapter's own holder. Hiding the shadow
   *    panel does not hide slotted content.
   *  - Leaving the step destroys every adapter — element first, then holder.
   *
   * A mount that fails (no Stripe.js, or the element never becomes ready) drops
   * the adapter again so the next selection retries instead of sitting on a
   * corpse.
   */

  // Refreshed after EVERY render, before any click can reach a gateway button:
  // the adapter is mounted once and must not be re-created to pick up new state,
  // so what it holds is a stable indirection rather than a closure.
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    gatewayFlowRef.current = {
      checkout: gatewayCheckout,
      confirm: gatewayConfirm,
      settle: applyPaymentOutcome
    };
    // The BACKSTOP for {@link selectMethod}: a selection that changed by some
    // other route still lands here, one render later.
    selectedMethodRef.current = payMethod;
  });

  /**
   * Which gateway's UI is on screen — a LAYOUT effect, so it lands with the commit.
   *
   * The holder is not in this tree (see the file header), so nothing about the render puts it in
   * front of the visitor; only this call does. As a passive effect it ran a frame LATER than the
   * commit that moved the selection, which left a gap in which the method's panel, its radio and
   * its note all said "card" while the card field itself was still `display: none`. Focus does
   * not enter a hidden field: a keyboard visitor who moved back onto the method and started
   * typing inside that gap typed into the radio group instead, and the Pay button never armed
   * because the element never saw a keystroke. Measured at 2–7 ms here, and preact falls back to
   * a 100 ms timer whenever the frame callback does not run (a background tab).
   *
   * Only VISIBILITY belongs here. Mounting is asynchronous and stays in the passive effect below,
   * which shows a newly mounted gateway itself once it is ready.
   */
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useLayoutEffect)(() => {
    const mounted = adaptersRef.current;
    Object.keys(mounted).forEach(code => mounted[code].setVisible(step === 'payment' && code === payMethod));
  }, [step, payMethod]);
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    const mounted = adaptersRef.current;
    if (step !== 'payment') {
      Object.keys(mounted).forEach(code => {
        mounted[code].destroy();
        delete mounted[code];
      });
      mountingRef.current = {};
      markGatewayBusy(false);
      setGatewayLoading(false);
      return undefined;
    }

    // EVERY branch states the loading flag for the method that is selected
    // NOW, rather than leaving whatever the last mount set. On-site takes no
    // gateway UI at all, and an adapter that is registered and settled is
    // finished coming up.
    if (!payMethod || payMethod === _components_PaymentStep_jsx__WEBPACK_IMPORTED_MODULE_9__.ONSITE || !service) {
      setGatewayLoading(false);
      return undefined;
    }
    if (mounted[payMethod]) {
      setGatewayLoading(!!mountingRef.current[payMethod]);
      setGatewayReady(mounted[payMethod].isComplete());
      return undefined;
    }
    const gateway = gateways.find(g => g.code === payMethod);
    const host = widgetHost(wrapRef.current);
    if (!gateway || !host) {
      return undefined;
    }
    const adapter = (0,_lib_payments_js__WEBPACK_IMPORTED_MODULE_14__.createGatewayAdapter)(gateway, gateways);
    mounted[gateway.code] = adapter;
    mountingRef.current[gateway.code] = true;
    setGatewayReady(false);
    setGatewayLoading(true);

    // The ONE question every settle asks — the one-shot mount settle below and
    // the adapter's long-lived callbacks alike — and it is asked of the
    // PRESENT: is this still the registry's adapter for its gateway, and is
    // that gateway still the selected method. Both halves are needed and both
    // are sufficient. Registry identity alone let a PayPal render that
    // resolved after the buyer chose Stripe call `setVisible(true)` on itself
    // (Codex r1 #17); `selectedMethodRef` is what refuses it, and it moves
    // with the click, so no settle can read it stale.
    //
    // NOT a per-mount generation token, which is what r1 #17 first used. That
    // token counted SELECTIONS, so card → on-site → card retired a mount that
    // was still the current one: a Payment Element becoming ready after that
    // toggle dropped ITSELF, and nothing re-mounted it (the mount effect's
    // deps had not changed), leaving an empty card panel under a permanently
    // disabled Pay button. The real Element needs hundreds of milliseconds to
    // become ready, so a visitor comparing the two methods is well inside the
    // window. Adapter identity already says everything a generation could: a
    // superseded mount is one whose adapter is no longer the registered one.
    const live = () => adaptersRef.current[gateway.code] === adapter && selectedMethodRef.current === gateway.code;
    /** Unregister this adapter (if it is still the registered one) and tear it down. */
    const drop = () => {
      if (adaptersRef.current[gateway.code] === adapter) {
        delete adaptersRef.current[gateway.code];
      }
      adapter.destroy();
    };
    adapter.mount({
      host,
      scope: wrapRef.current,
      // The widget's half of the sequence, for a gateway that starts it
      // from its own control. Read through the ref on every call so a
      // button rendered once still reaches the current state.
      flow: {
        checkout: () => gatewayFlowRef.current.checkout(),
        confirm: ref => gatewayFlowRef.current.confirm(gateway.code, ref),
        settle: out => gatewayFlowRef.current.settle(out, gateway.code)
      },
      // MINOR units plus the ISO exponent: only the adapter knows its own
      // gateway's exponent, so only the adapter can do the conversion
      // (D-R39a). It refuses to mount rather than quote a rounded figure.
      amountMinor: Number(service.price_minor) || 0,
      currency: service.currency,
      currencyExponent,
      onChange: complete => {
        if (live()) {
          setGatewayReady(complete);
        }
      },
      // The step lock. NOT guarded by `live()`: an adapter releasing the
      // lock on its way out has to be heard whatever else has changed,
      // or the step stays frozen with nothing left to unfreeze it.
      onBusy: flag => {
        if (flag && !live()) {
          return;
        }
        markGatewayBusy(flag);
      }
    }).then(() => {
      // This code has finished coming up whoever is selected now —
      // the flag is per gateway precisely so a superseded settle can
      // record that without touching a line that is about somebody
      // else's panel.
      delete mountingRef.current[gateway.code];
      if (!live()) {
        // The visitor moved on while this gateway was still coming
        // up. Showing it now would put a second gateway's UI under
        // the selected one — and leave a live button that would
        // check out against a method nobody is looking at. Dropping
        // it is also what makes coming BACK to this method mount it
        // again, since the registry no longer holds it.
        drop();
        return;
      }
      setGatewayLoading(false);
      adapter.setVisible(true);
    }, () => {
      delete mountingRef.current[gateway.code];
      const stale = !live();
      drop();
      if (stale) {
        return;
      }
      setGatewayLoading(false);
      // A BANNER, not a bare sentence: a gateway that never came up
      // left the customer with a dead step and no way back onto it
      // — the notice carries the "Try again" that re-mounts it, and
      // the on-site escape hatch where the site allows one.
      setPayNotice({
        title: (0,_lib_payments_js__WEBPACK_IMPORTED_MODULE_14__.gatewayUnavailableCopy)(gateway.code),
        body: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.pay_ui_unavailable_body
      });
    });
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, payMethod, service, gateways, mountNonce]);

  /**
   * Push a changed total or a changed skin into a MOUNTED gateway rather than
   * remounting it: the amount is display-only (the server charges the order),
   * and the appearance is resolved from the widget's own tokens, which a block
   * attribute can change live in the editor.
   */
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    const adapter = payMethod ? adaptersRef.current[payMethod] : null;
    if (!adapter || !service) {
      return;
    }
    adapter.update({
      amountMinor: Number(service.price_minor) || 0,
      currencyExponent,
      scope: wrapRef.current
    });
  }, [payMethod, service, config.appearance, currencyExponent]);

  /**
   * The gateway RETURN leg.
   *
   * V1 pins Stripe to `allow_redirects: never`, so this path should never run
   * — but "should never" is not "cannot", and a payment that comes back to a
   * page with no handler is a customer who has paid and been shown a booking
   * form. It runs once, strips the params so a reload cannot replay it, and
   * asks the server (never the URL) what the payment actually did.
   */
  /**
   * The RESUME leg: turn a token in the URL into a mounted Payment step.
   *
   * One request answers everything this page needs and it is the SERVER that
   * decides, not the link: whether this hold is still payable, which gateway
   * owns it, and what the appointment says. A dead link therefore explains
   * itself ("already paid", "expired") instead of rendering a payment form for
   * a slot somebody else now has.
   *
   * The manage token is kept in `holdRef` exactly as the in-tab flow keeps it,
   * so Back and "pay on-site instead" release the hold here too — the token is
   * known, which was the whole problem with resuming from `sessionStorage`.
   */
  const resumeHandled = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(false);
  // The last resume runner, so the busy banner's Retry can re-send the request
  // without re-running an effect whose only trigger — the token in the URL —
  // was deliberately erased on the first pass.
  const resumeRetryRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!resumeToken || resumeHandled.current) {
      return;
    }
    resumeHandled.current = true;
    // Strip it immediately: a manage token in the address bar outlives the
    // tab in history and in whatever the visitor pastes to somebody else.
    (0,_lib_hold_js__WEBPACK_IMPORTED_MODULE_16__.stripReturn)(typeof window !== 'undefined' ? window : null);

    /**
     * Ask the resume route, waiting out a CONCURRENT begin the same way the booking route does
     * (D-R39c, Codex A.7).
     *
     * `pending` is not a failure: it means another tab — or this one, a moment ago — is inside
     * the gateway call, and the reference will be on the row a few hundred milliseconds later.
     * Treating it as terminal showed "that payment link has expired" to somebody whose hold was
     * alive and whose intent was being created as they read it.
     *
     * @return {Promise<Object>} The resume payload.
     */
    async function resumeWithRetry() {
      let waited = 0;
      let attempt = 0;
      let busy = 0;
      for (;;) {
        let data;
        try {
          // eslint-disable-next-line no-await-in-loop
          data = await api.resumePayment(resumeToken);
        } catch (raw) {
          // A BUSY ORDER IS NOT A DEAD LINK (D-R39c round 2, Codex
          // NEW-4). `503` here means another writer holds this order's
          // per-order lock for the moment — a webhook settling a
          // sibling event, the expiry cron, the customer's other tab.
          // It used to fall through to the rejection handler and put
          // "this payment link has expired" in front of somebody whose
          // slot was still held, which is both false and unrecoverable:
          // the token was already stripped from the URL, so "book
          // again" was the only door left. Retried a bounded number of
          // times, and then reported as the retryable thing it is.
          if ((0,_lib_errors_js__WEBPACK_IMPORTED_MODULE_4__.classifyError)(raw).kind !== 'lock_timeout' || busy + 1 >= RESUME_BUSY_ATTEMPTS) {
            throw raw;
          }
          const wait = busyRetryDelay(raw, busy);
          busy += 1;
          // eslint-disable-next-line no-await-in-loop
          await new Promise(resolve => setTimeout(resolve, wait));
          continue;
        }
        const block = data.payment || null;
        if (!block || block.status !== 'pending') {
          return data;
        }
        const delay = Math.min(Math.max(Number(block.retry_after_ms) || PAY_WAIT_MIN_MS, PAY_WAIT_MIN_MS), PAY_WAIT_MAX_MS);
        attempt += 1;
        if (attempt >= PAY_WAIT_ATTEMPTS || waited + delay > PAY_WAIT_TOTAL_MS) {
          return data;
        }
        waited += delay;
        // eslint-disable-next-line no-await-in-loop
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    /**
     * One whole resume attempt: the request ladder above, then the two
     * outcomes. Kept in a ref so the busy banner's Retry button can run it
     * again — the effect itself is one-shot on purpose (the token is stripped
     * from the URL on the first pass), so a second run has to be asked for.
     */
    function runResume() {
      resumeWithRetry().then(data => {
        const booking = data.booking || {};
        const order = data.order || {};
        const payment = data.payment || null;
        if (!payment || payment.status !== 'begin') {
          // `hold_expired` is the one refusal with its own words: the slot's clock ran out,
          // so there is nothing to retry and inviting one would be a lie.
          setResumeError({
            reason: payment && payment.failure_code === 'hold_expired' ? 'expired' : 'unavailable'
          });
          return;
        }
        const minutes = Math.max(0, Math.round((new Date(booking.end_utc).getTime() - new Date(booking.start_utc).getTime()) / 60000));
        // A service DTO shaped like the catalogue's, so the summary, the
        // total and the adapter all work unchanged — the page simply
        // never loaded a catalogue to find it in.
        setService({
          id: (booking.service || {}).id || 0,
          name: (booking.service || {}).name || '',
          description: '',
          duration_minutes: minutes,
          price_minor: Number(order.total_minor) || 0,
          currency: order.currency || '',
          category: null
        });
        if (booking.display_timezone) {
          setDisplayTz((0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.canonicalizeZone)(booking.display_timezone));
        }
        setSelectedSlotUtc(booking.start_utc || null);
        setPayMethod(data.gateway);
        holdRef.current = {
          orderCode: data.order_code,
          token: resumeToken,
          expiresAt: data.expires_at
        };
        resumeRef.current = {
          payment,
          response: {
            booking: {
              id: 0,
              status: booking.status || 'pending',
              start_utc: booking.start_utc,
              end_utc: booking.end_utc,
              service: booking.service || {},
              staff: booking.staff || {},
              order: {
                code: data.order_code
              }
            },
            // The manage link and the calendar file were emailed when
            // the booking was made; this response carries neither, and
            // the confirmation says so rather than inventing them.
            links_available: false
          }
        };
        setResume(data);
        setStep('payment');
      }, raw => {
        const info = (0,_lib_errors_js__WEBPACK_IMPORTED_MODULE_4__.classifyError)(raw);
        setResumeError({
          reason: info.code === 'aponto_payment_state' ? 'state' : info.kind,
          paymentStatus: raw && raw.data ? raw.data.payment_status : ''
        });
      });
    }
    resumeRetryRef.current = runResume;
    runResume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeToken]);
  const returnHandled = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(false);
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!returnLeg || returnHandled.current) {
      return;
    }
    returnHandled.current = true;
    (0,_lib_hold_js__WEBPACK_IMPORTED_MODULE_16__.stripReturn)(typeof window !== 'undefined' ? window : null);

    // The whitelist from `rememberHold` — display facts and references, no
    // capability of any kind (F5). It is therefore NOT enough to rebuild the
    // full confirmation panel, and deliberately so: this leg renders the
    // minimal one and points the customer at the manage link in their email.
    const stored = (0,_lib_hold_js__WEBPACK_IMPORTED_MODULE_16__.readHold)(returnLeg.order);
    (0,_lib_hold_js__WEBPACK_IMPORTED_MODULE_16__.clearHold)(returnLeg.order);
    const details = stored && stored.booking ? stored.booking : null;
    if (returnLeg.status === 'cancel') {
      setPayIncomplete({
        orderCode: returnLeg.order,
        deadlineLabel: deadlineLabel(stored ? stored.expires_at : null),
        retryable: false
      });
      return;
    }
    const code = stored && stored.gateway || (gateways.length ? gateways[0].code : '');
    if (!code || !returnLeg.ref) {
      setMinimalConfirm({
        confirmed: false,
        details
      });
      return;
    }
    api.confirmPayment(code, returnLeg.ref).then(state => {
      const status = state.payment_status;
      // Same rule as the in-widget leg (F3): a reason means it failed.
      const failure = String(state.failure_code || '');
      if (status !== 'paid' && (status !== 'pending' || failure)) {
        setPayIncomplete({
          orderCode: returnLeg.order,
          deadlineLabel: deadlineLabel(state.expires_at),
          failureCopy: failure ? (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.paymentFailureCopy)(failure) : '',
          // Same rule as the in-widget leg: a hold that is already
          // gone must not be described as still running.
          released: 'hold_released' === failure,
          retryable: false
        });
        return;
      }
      setPayResult({
        status,
        // No amount survives the whitelist, and the confirm route
        // never carried one — so the line says what is known.
        amountLabel: '',
        orderCode: state.order_code || returnLeg.order
      });
      setMinimalConfirm({
        confirmed: state.booking_status === 'confirmed',
        details
      });
    }, () => {
      // The money may well have arrived; the webhook leg settles it
      // either way. Never tell the customer it did not.
      setPayResult({
        status: 'pending',
        amountLabel: '',
        orderCode: returnLeg.order
      });
      setMinimalConfirm({
        confirmed: false,
        details
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnLeg]);

  // --- Navigation. ----------------------------------------------------------
  function selectService(s) {
    markNav();
    autoPickedRef.current = false;
    setService(s);
    setSelectedDayKey(null);
    setSelectedSlotUtc(null);
    setAvail({
      loading: true,
      error: false,
      index: {},
      maxSlots: 1
    });
    setStep('datetime');
  }
  function goToDetails() {
    markNav();
    // Create the idempotency key on entering the step that owns the FINAL CTA
    // — Details when there is no Payment step, Payment when there is. Minting
    // it a step early would only rotate it again the moment a method is
    // chosen, since the method is part of the draft the key is bound to.
    if (!paymentStepExists) {
      idem.keyFor(buildDraft());
    }
    setStep('details');
  }

  /** The method a freshly entered Payment step starts on. */
  function defaultMethod() {
    if (payMethod && methodIsValid(payMethod)) {
      return payMethod;
    }
    return gateways.length ? gateways[0].code : _components_PaymentStep_jsx__WEBPACK_IMPORTED_MODULE_9__.ONSITE;
  }

  /**
   * Whether a method is still selectable in the current configuration —
   * on-site only when the site allows it, a gateway only when it is offered.
   *
   * @param {string} method Method key.
   * @return {boolean} Validity.
   */
  function methodIsValid(method) {
    if (method === _components_PaymentStep_jsx__WEBPACK_IMPORTED_MODULE_9__.ONSITE) {
      return payments.mode === 'optional';
    }
    return gateways.some(g => g.code === method);
  }

  /** Details → Payment: validate first, then mint the key for the real CTA. */
  function goToPayment() {
    markNav();
    const errors = validateDetails();
    if (errors) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors(null);
    setSubmitError(null);
    setPayError('');
    setPayNotice(null);
    const method = defaultMethod();
    selectMethod(method);
    idem.keyFor(buildDraft(method));
    setStep('payment');
  }

  /**
   * Move the payment selection, in the ref and in state together.
   *
   * The ref half is what every gateway settle reads (see
   * {@link selectedMethodRef}) and it has to move with the click rather than
   * one render later: a mount resolving inside that gap would unhide a gateway
   * the visitor has just left.
   *
   * @param {?string} method Method key, or null for "nothing selected".
   */
  function selectMethod(method) {
    selectedMethodRef.current = method;
    setPayMethod(method);
  }

  /**
   * Switch payment method.
   *
   * Two things have to happen together, and neither is optional: a hold created
   * for the previous method is released (nothing should hold a slot for a
   * payment that is no longer going to be made), and the idempotency key is
   * re-derived — the method is part of the draft the server fingerprints, so
   * keeping the old key would answer `409 aponto_idempotency_conflict`.
   *
   * @param {string} method Method key.
   */
  function choosePayMethod(method) {
    if (method === payMethod) {
      return;
    }
    if (gatewayBusyRef.current) {
      // The radios and "Pay on-site instead" are already disabled for this
      // span (D-R40, Codex r1 #5); this is the guard for anything that
      // reaches the handler anyway, because the release below would hand
      // away a slot the gateway may be capturing against right now.
      return;
    }
    setPayError('');
    setPayNotice(null);
    selectMethod(method);
    // Fire-and-forget: the release resets the key, and the new key is minted
    // after it so the ordering cannot invert.
    releaseHold().then(() => {
      idem.keyFor(buildDraft(method));
    });
  }

  // User-driven Back / Change-service transitions. Each marks navigation so the
  // destination step's heading takes focus (never on the initial paint).
  function backToService() {
    markNav();
    releaseHold();
    setStep('service');
  }
  function backToDateTime() {
    markNav();
    releaseHold();
    setStep('datetime');
  }

  /** Payment → Details. The draft survives; the hold does not. */
  function backToDetails() {
    if (gatewayBusyRef.current) {
      // Back is disabled while a gateway owns an attempt; this is the guard
      // for a keyboard or programmatic activation that gets past that.
      return;
    }
    markNav();
    releaseHold();
    setPayError('');
    setPayNotice(null);
    setStep('details');
  }
  function changeService() {
    markNav();
    releaseHold();
    autoPickedRef.current = false;
    setService(null);
    setStep('service');
  }
  function bookAnother() {
    markNav();
    idem.reset();
    holdRef.current = null;
    selectMethod(null);
    setPayError('');
    setPayNotice(null);
    setPayResult(null);
    setPayIncomplete(null);
    setMinimalConfirm(null);
    setGatewayReady(false);
    markGatewayBusy(false);
    setResponse(null);
    setDetails({
      name: '',
      email: '',
      phone: '',
      note: ''
    });
    setConsent(false);
    setCustomValues({});
    setHoneypot('');
    setFieldErrors(null);
    setSubmitError(null);
    setSelectedDayKey(null);
    setSelectedSlotUtc(null);
    autoPickedRef.current = false;
    // Preselected or single-service: there is no Service step to return to, so
    // the service has to be re-resolved rather than cleared. It is normally
    // still in state — but not after a gateway RETURN leg, where the catalogue
    // deliberately did not auto-advance, and clearing it there would strand the
    // visitor on a step the fraction does not even count.
    const only = serviceLocked ? service || (preselectedId ? catalogue.services.find(s => s.id === preselectedId) : null) || (catalogue.services.length === 1 ? catalogue.services[0] : null) : null;
    if (only) {
      // The auto-pick effect re-selects the first available day.
      setService(only);
      setStep('datetime');
    } else {
      setService(null);
      setStep('service');
    }
  }

  // --- Derived layout data. -------------------------------------------------
  // Honest numbering: the Payment step is IN the list only when this booking
  // actually has one, so a free service on a paying site reads `01 / 04` and a
  // paid one `01 / 05` — and a preselected service drops one from either.
  const stepList = [];
  if (!serviceLocked) {
    stepList.push('service');
  }
  stepList.push('datetime', 'details');
  if (paymentStepExists) {
    stepList.push('payment');
  }
  stepList.push('confirmation');
  const stepCount = stepList.length;
  const stepIndex = stepList.indexOf(step) + 1;
  const hasSummary = (step === 'datetime' || step === 'details' || step === 'payment') && !!service;
  const years = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => {
    const y = initialYear;
    return [y, y + 1];
  }, [initialYear]);
  const alternativesExist = catalogue.services.length > 1;
  const submitBanner = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => {
    if (!submitError) {
      return null;
    }
    switch (submitError.kind) {
      case 'rate_limited':
        return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_components_feedback_jsx__WEBPACK_IMPORTED_MODULE_12__.Banner, {
          variant: "warn",
          title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.rate_limited_title,
          body: (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.rate_limited_body, rateSeconds)
        });
      case 'lock_timeout':
        return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_components_feedback_jsx__WEBPACK_IMPORTED_MODULE_12__.Banner, {
          variant: "err",
          title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.lock_timeout_title,
          body: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.lock_timeout_body
        });
      case 'in_flight':
      case 'in_flight_manual':
        return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_components_feedback_jsx__WEBPACK_IMPORTED_MODULE_12__.Banner, {
          variant: "clock",
          title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.in_flight_title,
          body: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.in_flight_body
        });
      case 'guard':
        return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_components_feedback_jsx__WEBPACK_IMPORTED_MODULE_12__.Banner, {
          variant: "err",
          title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.guard_title,
          body: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.guard_body
        });
      case 'validation_general':
        return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_components_feedback_jsx__WEBPACK_IMPORTED_MODULE_12__.Banner, {
          variant: "err",
          title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.validation_general_title,
          body: submitError.message || _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.validation_general_body
        });
      case 'validation_stale':
        return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_components_feedback_jsx__WEBPACK_IMPORTED_MODULE_12__.Banner, {
          variant: "err",
          title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.validation_general_title,
          body: submitError.message ? submitError.message + ' ' + _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.stale_form_hint : _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.stale_form_hint
        });
      default:
        return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_components_feedback_jsx__WEBPACK_IMPORTED_MODULE_12__.Banner, {
          variant: "err",
          title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.load_availability_err,
          body: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.load_retry_sub
        });
    }
  }, [submitError, rateSeconds]);
  const submitBlocked = submitting || submitError && submitError.kind === 'rate_limited' && rateSeconds > 0;

  // --- Render. --------------------------------------------------------------
  function renderStep() {
    if (step === 'service') {
      if (catalogue.loading) {
        return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_components_Skeletons_jsx__WEBPACK_IMPORTED_MODULE_13__.ServiceSkeleton, {});
      }
      if (catalogue.error) {
        return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_components_feedback_jsx__WEBPACK_IMPORTED_MODULE_12__.Banner, {
            variant: "err",
            title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.load_services_err,
            body: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.load_retry_sub
          }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
            class: "ap-foot",
            children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {}), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("button", {
              type: "button",
              class: "ap-primary",
              onClick: loadCatalogue,
              children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.try_again
            })]
          })]
        });
      }
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_components_ServiceStep_jsx__WEBPACK_IMPORTED_MODULE_6__.ServiceStep, {
        services: catalogue.services,
        categories: catalogue.categories,
        locale: config.locale,
        currencyExponent: currencyExponent,
        selectedId: service ? service.id : null,
        stepIndex: stepIndex,
        stepCount: stepCount,
        focusOnMount: navigatedRef.current,
        onSelect: selectService
      });
    }
    if (step === 'datetime' && service) {
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_components_DateTimeStep_jsx__WEBPACK_IMPORTED_MODULE_7__.DateTimeStep, {
        service: service,
        locale: config.locale,
        currencyExponent: currencyExponent,
        displayTz: displayTz,
        businessTz: businessTz,
        showSelector: showSelector,
        tzOptions: tzOptions,
        calYear: cal.year,
        calMonth: cal.month,
        onMonth: (year, month) => {
          setSelectedDayKey(null);
          setSelectedSlotUtc(null);
          setCal({
            year,
            month
          });
        },
        availabilityIndex: avail.index,
        maxSlots: avail.maxSlots,
        availLoading: avail.loading,
        availError: avail.error,
        onRetryAvail: () => fetchAvailability(cal.year, cal.month, displayTz),
        todayKey: (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.dayKeyInTz)(Date.now(), displayTz),
        years: years,
        selectedDayKey: selectedDayKey,
        onSelectDay: key => {
          setSelectedDayKey(key);
          setSelectedSlotUtc(null);
        },
        selectedSlotUtc: selectedSlotUtc,
        onSelectSlot: setSelectedSlotUtc,
        onChangeDisplayTz: tz => {
          // Changing the display zone regroups slots by a new calendar
          // day, so the previously selected day key may no longer be
          // valid — reset it (and the slot) so the visitor re-picks a
          // day in the new zone.
          setSelectedDayKey(null);
          setSelectedSlotUtc(null);
          setDisplayTz(tz);
        },
        stepIndex: stepIndex,
        stepCount: stepCount,
        focusOnMount: navigatedRef.current,
        onBack: serviceLocked ? null : backToService,
        onContinue: goToDetails,
        onChangeService: serviceLocked && alternativesExist ? changeService : null
      });
    }
    if (step === 'details') {
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_components_DetailsStep_jsx__WEBPACK_IMPORTED_MODULE_8__.DetailsStep, {
        details: details,
        onChange: (field, value) => setDetails(d => Object.assign({}, d, {
          [field]: value
        })),
        phoneMode: phoneMode,
        consentEnabled: consentEnabled,
        consentText: config.fields.consent.text,
        consent: consent,
        onConsentChange: setConsent,
        customFields: customFields,
        customValues: customValues,
        onCustomChange: (slug, value) => setCustomValues(v => Object.assign({}, v, {
          [slug]: value
        })),
        honeypot: honeypot,
        onHoneypot: setHoneypot,
        fieldErrors: fieldErrors,
        banner: submitBanner,
        stepIndex: stepIndex,
        stepCount: stepCount,
        focusOnMount: navigatedRef.current,
        onBack: backToDateTime,
        onSubmit: paymentStepExists ? goToPayment : submit,
        primaryLabel: paymentStepExists ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.continue : _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.book,
        submitting: submitBlocked
      });
    }

    // A resume that cannot proceed replaces the whole flow: there is no draft
    // behind it and no step to fall back to.
    if (resumeError) {
      const paid = ['paid', 'partial', 'refunded'].includes(resumeError.paymentStatus);
      // `lock_timeout` survived the bounded retry above, so it is the one
      // resume refusal that is TEMPORARY: the hold is alive and the answer
      // is "try that again", not "book again" (Codex NEW-4).
      const busy = resumeError.reason === 'lock_timeout';
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_components_Confirmation_jsx__WEBPACK_IMPORTED_MODULE_10__.ResumeUnavailable, {
        paid: paid,
        busy: busy,
        onRetry: () => {
          setResumeError(null);
          if (resumeRetryRef.current) {
            resumeRetryRef.current();
          }
        },
        bookAgainUrl: typeof window !== 'undefined' && window.location ? window.location.pathname : '',
        focusOnMount: true
      });
    }
    if (step === 'payment' && service) {
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_components_PaymentStep_jsx__WEBPACK_IMPORTED_MODULE_9__.PaymentStep, {
        gateways: gateways,
        mode: payments.mode,
        method: payMethod,
        onMethod: choosePayMethod,
        totalLabel: totalLabel,
        gatewayLoading: gatewayLoading,
        gatewayReady: gatewayReady,
        locked: gatewayBusy,
        error: payError,
        notice: payNotice,
        deadlineLabel: resume ? deadlineLabel(resume.expires_at) : '',
        resuming: !!resume,
        onRetry: retryPayment,
        onPayOnsite: () => choosePayMethod(_components_PaymentStep_jsx__WEBPACK_IMPORTED_MODULE_9__.ONSITE),
        stepIndex: stepIndex,
        stepCount: stepCount,
        focusOnMount: navigatedRef.current,
        onBack: backToDetails,
        onSubmit: submit,
        submitting: submitBlocked
      });
    }
    if (step === 'confirmation' && payIncomplete) {
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_components_Confirmation_jsx__WEBPACK_IMPORTED_MODULE_10__.PaymentIncomplete, {
        orderCode: payIncomplete.orderCode,
        deadlineLabel: payIncomplete.deadlineLabel,
        failureCopy: payIncomplete.failureCopy,
        released: !!payIncomplete.released,
        onRetry: payIncomplete.retryable ? () => {
          setPayIncomplete(null);
          setStep('payment');
        } : null,
        onBookAnother: bookAnother,
        focusOnMount: navigatedRef.current
      });
    }
    if (step === 'confirmation' && response) {
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_components_Confirmation_jsx__WEBPACK_IMPORTED_MODULE_10__.Confirmation, {
        response: response,
        displayTz: displayTz,
        locale: config.locale,
        businessName: config.business.name,
        payment: payResult,
        focusOnMount: navigatedRef.current,
        onBookAnother: bookAnother
      });
    }
    if (step === 'confirmation' && minimalConfirm) {
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_components_Confirmation_jsx__WEBPACK_IMPORTED_MODULE_10__.MinimalConfirmation, {
        confirmed: minimalConfirm.confirmed,
        details: minimalConfirm.details,
        locale: config.locale,
        payment: payResult,
        focusOnMount: navigatedRef.current,
        onBookAnother: bookAnother
      });
    }

    // A return or resume leg resolves over the network; show the same skeleton
    // the catalogue uses rather than a blank widget.
    if (returnLeg || resumeToken) {
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_components_Skeletons_jsx__WEBPACK_IMPORTED_MODULE_13__.ServiceSkeleton, {});
    }
    return null;
  }

  // Content-column width follows the reference's `mainCls` exactly: while the
  // summary is on, the column takes whatever the sidebar leaves (NO 660px cap —
  // capping it here left a dead gutter beside the sidebar at ≥900px containers);
  // Service is the 820px catalogue; the sidebar-less steps (Confirmation, and any
  // future Review) keep the narrow 660px cap.
  const mainClass = 'ap-main' + (hasSummary ? '' : step === 'service' ? ' service' : ' narrow');
  const [recapOpen, setRecapOpen] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
    class: "ap-wrap",
    ref: wrapRef,
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
      class: "ap",
      children: [hasSummary && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
        class: "ap-recap",
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("button", {
          type: "button",
          class: "ap-recap-bar",
          "aria-expanded": recapOpen ? 'true' : 'false',
          "aria-controls": RECAP_PANEL_ID,
          onClick: () => setRecapOpen(o => !o),
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
            class: "ap-recap-line",
            children: (0,_components_Summary_jsx__WEBPACK_IMPORTED_MODULE_11__.recapLine)({
              service,
              slotUtc: selectedSlotUtc,
              displayTz,
              locale: config.locale
            })
          }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("span", {
            class: 'ap-recap-chev' + (recapOpen ? ' up' : ''),
            children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("svg", {
              viewBox: "0 0 24 24",
              "aria-hidden": "true",
              fill: "none",
              stroke: "currentColor",
              "stroke-width": "1.7",
              children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("path", {
                d: "M9 6l6 6-6 6"
              })
            })
          })]
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("div", {
          class: 'ap-recap-panel' + (recapOpen ? ' open' : ''),
          id: RECAP_PANEL_ID
          // The collapsed panel is only visually clipped
          // (max-height:0 keeps the height transition), so it
          // stays in the a11y tree unless we say otherwise.
          // Safe to hide outright: the summary is text only —
          // nothing focusable is buried in here.
          ,
          "aria-hidden": recapOpen ? 'false' : 'true',
          children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("div", {
            class: "ap-recap-panel-in",
            children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_components_Summary_jsx__WEBPACK_IMPORTED_MODULE_11__.Summary, {
              service: service,
              locale: config.locale,
              currencyExponent: currencyExponent,
              displayTz: displayTz,
              businessTz: businessTz,
              slotUtc: selectedSlotUtc
            })
          })
        })]
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("div", {
        class: 'ap-body' + (hasSummary ? ' has-summary' : ''),
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("div", {
          class: mainClass,
          children: renderStep()
        }), hasSummary &&
        // Complementary landmark, named by its own heading, so a
        // screen-reader user can jump to the running booking
        // summary instead of hunting for it between the step's
        // controls. Ids are safe to hard-code: every widget lives
        // in its own ShadowRoot.
        (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsxs)("aside", {
          class: "ap-aside",
          "aria-labelledby": _components_Summary_jsx__WEBPACK_IMPORTED_MODULE_11__.SUMMARY_HEADING_ID,
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)("h2", {
            class: "ap-sum-title",
            id: _components_Summary_jsx__WEBPACK_IMPORTED_MODULE_11__.SUMMARY_HEADING_ID,
            children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.summary_title
          }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_components_Summary_jsx__WEBPACK_IMPORTED_MODULE_11__.Summary, {
            service: service,
            locale: config.locale,
            currencyExponent: currencyExponent,
            displayTz: displayTz,
            businessTz: businessTz,
            slotUtc: selectedSlotUtc
          })]
        })]
      })]
    }), toast && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_17__.jsx)(_components_feedback_jsx__WEBPACK_IMPORTED_MODULE_12__.Toast, {
      title: toast.title,
      body: toast.body
    })]
  });
}

/***/ },

/***/ "./assets/src/form/components/Calendar.jsx"
/*!*************************************************!*\
  !*** ./assets/src/form/components/Calendar.jsx ***!
  \*************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Calendar: () => (/* binding */ Calendar)
/* harmony export */ });
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _icons_jsx__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./icons.jsx */ "./assets/src/form/components/icons.jsx");
/* harmony import */ var _lib_copy_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../lib/copy.js */ "./assets/src/form/lib/copy.js");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
/** @jsxImportSource preact */
/**
 * Month calendar — bare numbers with 1-letter weekdays, per-day availability bars
 * (accent fill ∝ open slots), a today dot and a solid selected day (design §3).
 * Month and year are native selects the same height as Prev/Next so distant dates
 * don't need repeated arrow clicks. No auto-select.
 *
 * Days are addressed by their `YYYY-MM-DD` key IN THE DISPLAY TIMEZONE — the
 * availability index is grouped the same way (SPEC-P1 §2.2), so at a month
 * boundary a far-ahead visitor sees the studio's slots on the correct local day.
 * Weekday/among-month math is done in UTC so it never drifts with the runtime zone.
 */




// Month names + weekday initials are derived from `Intl` in the active locale
// (i18n, SPEC-P1 §5) rather than hardcoded English, so they follow the site
// locale without a per-name translation string. Time zone is pinned to UTC so
// the label math never drifts with the runtime zone.

function monthNames(locale) {
  const fmt = new Intl.DateTimeFormat(locale || undefined, {
    month: 'long',
    timeZone: 'UTC'
  });
  return Array.from({
    length: 12
  }, (_, m) => fmt.format(Date.UTC(2021, m, 15)));
}
function weekdayInitials(locale) {
  // 2021-03-01 is a Monday; the grid is Monday-first.
  const fmt = new Intl.DateTimeFormat(locale || undefined, {
    weekday: 'narrow',
    timeZone: 'UTC'
  });
  return Array.from({
    length: 7
  }, (_, i) => fmt.format(Date.UTC(2021, 2, 1 + i)));
}
function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}
function dayKey(year, month, day) {
  return year + '-' + pad2(month + 1) + '-' + pad2(day);
}
function Calendar({
  year,
  month,
  locale,
  todayKey,
  availabilityIndex,
  selectedDayKey,
  maxSlots,
  years,
  onSelectDay,
  onMonth
}) {
  const months = monthNames(locale);
  const dow = weekdayInitials(locale);
  const firstDow = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const density = Math.max(1, maxSlots || 1);
  const cells = [];
  for (let i = 0; i < firstDow; i++) {
    cells.push((0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("span", {}, 'e' + i));
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const key = dayKey(year, month, d);
    const count = (availabilityIndex[key] || []).length;
    const past = key < todayKey;
    const disabled = past || count === 0;
    const selected = key === selectedDayKey;
    const barWidth = Math.min(100, Math.round(count / density * 100));
    const classes = 'ap-day' + (selected ? ' sel' : '') + (key === todayKey ? ' today' : '');
    cells.push((0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)("button", {
      type: "button",
      class: classes,
      disabled: disabled,
      "aria-pressed": selected ? 'true' : 'false',
      "aria-label": months[month] + ' ' + d,
      onClick: () => onSelectDay(key),
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("span", {
        class: "n",
        children: d
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("span", {
        class: "bar",
        children: count > 0 && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("i", {
          style: {
            width: Math.max(12, barWidth) + '%'
          }
        })
      })]
    }, key));
  }
  const firstAllowed = year + '-' + pad2(month + 1);
  const prevDisabled = firstAllowed <= todayKey.slice(0, 7);
  // Cap Next at December of the last selectable year so the arrow can never page
  // into a month outside the year <select>'s range (which mirrors the booking
  // horizon). Beyond that there is nothing to book anyway.
  const lastYear = years[years.length - 1];
  const nextDisabled = year > lastYear || year === lastYear && month === 11;
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)("div", {
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)("div", {
      class: "ap-cal-head",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)("div", {
        class: "ap-cal-period",
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("select", {
          class: "ap-cal-select month",
          value: month,
          "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Month', 'aponto'),
          onChange: e => onMonth(year, Number(e.target.value)),
          children: months.map((m, i) => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("option", {
            value: i,
            children: m
          }, i))
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("select", {
          class: "ap-cal-select year",
          value: year,
          "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Year', 'aponto'),
          onChange: e => onMonth(Number(e.target.value), month),
          children: years.map(y => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("option", {
            value: y,
            children: y
          }, y))
        })]
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)("div", {
        class: "ap-cal-nav",
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("button", {
          type: "button",
          "aria-label": _lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.prev_month,
          disabled: prevDisabled,
          onClick: () => onMonth(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1),
          children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_1__.IconChevronLeft, {})
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("button", {
          type: "button",
          "aria-label": _lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.next_month,
          disabled: nextDisabled,
          onClick: () => onMonth(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1),
          children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_1__.IconChevronRight, {})
        })]
      })]
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("div", {
      class: "ap-dow",
      "aria-hidden": "true",
      children: dow.map((d, i) => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("span", {
        children: d
      }, i))
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("div", {
      class: "ap-cal",
      children: cells
    })]
  });
}

/***/ },

/***/ "./assets/src/form/components/Confirmation.jsx"
/*!*****************************************************!*\
  !*** ./assets/src/form/components/Confirmation.jsx ***!
  \*****************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Confirmation: () => (/* binding */ Confirmation),
/* harmony export */   MinimalConfirmation: () => (/* binding */ MinimalConfirmation),
/* harmony export */   PaymentIncomplete: () => (/* binding */ PaymentIncomplete),
/* harmony export */   PaymentLine: () => (/* binding */ PaymentLine),
/* harmony export */   ResumeUnavailable: () => (/* binding */ ResumeUnavailable)
/* harmony export */ });
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var preact_hooks__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! preact/hooks */ "./node_modules/preact/hooks/dist/hooks.module.js");
/* harmony import */ var _lib_tz_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../lib/tz.js */ "./assets/src/form/lib/tz.js");
/* harmony import */ var _icons_jsx__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./icons.jsx */ "./assets/src/form/components/icons.jsx");
/* harmony import */ var _feedback_jsx__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./feedback.jsx */ "./assets/src/form/components/feedback.jsx");
/* harmony import */ var _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../lib/copy.js */ "./assets/src/form/lib/copy.js");
/* harmony import */ var _lib_payments_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../lib/payments.js */ "./assets/src/form/lib/payments.js");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
/** @jsxImportSource preact */
/**
 * Step 4 — Confirmation (SPEC-P1 §2.2 #4).
 *
 * This is a success STATE, not an interactive step: the submit happened from the
 * Details CTA. The panel renders entirely from the original `POST /public/bookings`
 * response — status (pending/confirmed) copy, the `ORDER #AP-XXXXX` chip, and the
 * Add-to-Calendar targets bound from that response (the `.ics` URL verbatim, the
 * Google URL built from the response's UTC times). The friendly `City (GMT±N)`
 * label is shown (D1). Pending copy points the visitor to their email.
 *
 * Idempotent replay (`links_available:false`): the calendar buttons drop and the
 * panel says the manage link + calendar file were already emailed (SPEC-P0 §5.6).
 */








/** ISO instant -> `YYYYMMDDTHHMMSSZ` for calendar URLs. */

function icsStamp(iso) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/** Build a Google Calendar "add event" URL from the original response data. */
function googleUrl(booking, businessName) {
  const title = booking.service && booking.service.name ? booking.service.name : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Appointment', 'aponto');
  const text = businessName ? title + ' — ' + businessName : title;
  const dates = icsStamp(booking.start_utc) + '/' + icsStamp(booking.end_utc);
  const params = ['action=TEMPLATE', 'text=' + encodeURIComponent(text), 'dates=' + dates];
  if (businessName) {
    params.push('location=' + encodeURIComponent(businessName));
  }
  return 'https://calendar.google.com/calendar/render?' + params.join('&');
}

/**
 * The one line the payment adds to an otherwise unchanged panel (D-R38).
 *
 * The AMOUNT is the client's own formatted total, not something the server sent:
 * the confirm route answers with state only — no PII, no links, no amount — so
 * the figure shown here is the same one the summary has been showing all along.
 *
 * @param {Object} props         Props.
 * @param {Object} props.payment `{status, amountLabel, orderCode, method}` or null.
 * @return {?Object} The line, or null when the booking took no online payment.
 */
function PaymentLine({
  payment
}) {
  if (!payment) {
    return null;
  }
  if (payment.status === 'paid') {
    return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("p", {
      class: "ap-paid-line",
      children: payment.amountLabel ? (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.sprintf)((0,_lib_payments_js__WEBPACK_IMPORTED_MODULE_6__.gatewayPaidLineCopy)(payment.method), payment.amountLabel, payment.orderCode) :
      // A return leg has no amount to quote: `sessionStorage`
      // carries no money figure (F5) and `/confirm` never sends
      // one. Naming the reference is better than inventing a sum.
      (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.pay_paid_line_plain, payment.orderCode)
    });
  }
  if (payment.status === 'pending') {
    return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("p", {
      class: "ap-paid-line",
      children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.pay_pending_line
    });
  }
  if (payment.status === 'unverified') {
    // The money went through; the AMOUNT is what could not be confirmed
    // (rest-contract §3.8). No retry is offered anywhere on this panel, and
    // the sentence says who to talk to instead.
    return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("p", {
      class: "ap-paid-line",
      children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.pay_fail_unverified_amount
    });
  }
  return null;
}
function Confirmation({
  response,
  displayTz,
  locale,
  businessName,
  payment = null,
  focusOnMount = true,
  onBookAnother
}) {
  const booking = response.booking;
  const confirmed = booking.status === 'confirmed';
  const linksAvailable = response.links_available !== false;
  const headingRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (focusOnMount && headingRef.current) {
      headingRef.current.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
    class: "ap-step",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
      class: "ap-done",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
        class: "ap-check",
        children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_3__.IconCheck, {})
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("h2", {
        ref: headingRef,
        tabIndex: -1,
        children: confirmed ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.confirm_confirmed_title : _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.confirm_pending_title
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("p", {
        class: "lead",
        children: confirmed ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.confirm_confirmed_lead : _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.confirm_pending_lead
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("p", {
        class: "tz",
        children: (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_2__.tzLabel)(displayTz, booking.start_utc)
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("span", {
        class: "ap-order",
        children: [_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.order_label, ' ', (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("span", {
          class: "ap-order-code",
          children: ["#", booking.order && booking.order.code]
        })]
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(PaymentLine, {
        payment: payment
      })]
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
      class: "ap-conf-card",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
        class: "ap-tile",
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
          class: "d",
          children: (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_2__.formatInTz)(booking.start_utc, displayTz, {
            day: 'numeric'
          }, locale)
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
          class: "m",
          children: (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_2__.formatInTz)(booking.start_utc, displayTz, {
            month: 'short'
          }, locale)
        })]
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
        class: "info",
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("span", {
          class: "ap-item-title",
          children: booking.service && booking.service.name
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("small", {
          children: [(0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_2__.formatInTz)(booking.start_utc, displayTz, {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          }, locale), ' ', "\xB7 ", (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_2__.fmtTime)(booking.start_utc, displayTz, locale), " \u2192", ' ', (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_2__.fmtTime)(booking.end_utc, displayTz, locale)]
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("small", {
          class: "tz",
          children: (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_2__.tzLabel)(displayTz, booking.start_utc)
        })]
      })]
    }), linksAvailable ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
        class: "ap-cal-tiles",
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("a", {
          class: "ap-cal-tile",
          href: googleUrl(booking, businessName),
          target: "_blank",
          rel: "noopener noreferrer",
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_3__.IconCalendar, {}), _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.cal_google]
        }), response.ics_url && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("a", {
          class: "ap-cal-tile",
          href: response.ics_url,
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_3__.IconDownload, {}), _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.cal_ics]
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("button", {
          type: "button",
          class: "ap-cal-tile",
          onClick: () => window.print(),
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_3__.IconPrinter, {}), _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.print]
        })]
      }), !confirmed && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_feedback_jsx__WEBPACK_IMPORTED_MODULE_4__.Banner, {
        variant: "info",
        body: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.confirm_manage_hint
      })]
    }) : (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
      class: "ap-links-emailed",
      children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_feedback_jsx__WEBPACK_IMPORTED_MODULE_4__.Banner, {
        variant: "info",
        body: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.replay_body
      })
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
      class: "ap-conf-actions",
      children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("button", {
        type: "button",
        onClick: onBookAnother,
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.book_another
      })
    })]
  });
}

/**
 * The panel a gateway RETURN leg lands on when the widget has no stored copy of
 * the original booking response.
 *
 * Reachable only through a redirect-based method (V1 pins `allow_redirects:
 * never`, so it should not happen) combined with a browser that lost its session
 * storage — a private window, a different tab, a cleared store. There is nothing
 * honest to render but the state the confirm leg reported and the fact that the
 * manage link is already in the customer's inbox, which is exactly what this
 * says.
 *
 * @param {Object}   props              Props.
 * @param {boolean}  props.confirmed    Whether the booking came back confirmed.
 * @param {?Object}  props.payment      Payment line data.
 * @param {boolean}  props.focusOnMount Focus the heading.
 * @param {Function} props.onBookAnother Restart the flow.
 */
function MinimalConfirmation({
  confirmed,
  // The WHITELISTED display facts (F5): service, staff, start/end and the
  // display timezone. Enough to recognise the appointment, and not one field
  // that grants access to it.
  details = null,
  locale,
  payment = null,
  focusOnMount = true,
  onBookAnother
}) {
  const headingRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (focusOnMount && headingRef.current) {
      headingRef.current.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
    class: "ap-step",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
      class: "ap-done",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
        class: "ap-check",
        children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_3__.IconCheck, {})
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("h2", {
        ref: headingRef,
        tabIndex: -1,
        children: confirmed ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.confirm_confirmed_title : _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.confirm_pending_title
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("p", {
        class: "lead",
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.pay_minimal_lead
      }), details && details.start_utc ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("p", {
        class: "tz",
        children: [details.service_name ? details.service_name + ' · ' : '', (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_2__.formatInTz)(details.start_utc, details.display_tz, {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        }, locale), ' ', "\xB7 ", (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_2__.fmtTime)(details.start_utc, details.display_tz, locale), details.end_utc ? ' → ' + (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_2__.fmtTime)(details.end_utc, details.display_tz, locale) : '']
      }) : null, payment && payment.orderCode ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("span", {
        class: "ap-order",
        children: [_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.order_label, ' ', (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("span", {
          class: "ap-order-code",
          children: ["#", payment.orderCode]
        })]
      }) : null, (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(PaymentLine, {
        payment: payment
      })]
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
      class: "ap-conf-actions",
      children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("button", {
        type: "button",
        onClick: onBookAnother,
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.book_another
      })
    })]
  });
}

/**
 * The "payment not completed" panel.
 *
 * Shown when a payment ends in any state that is neither paid nor processing —
 * an abandoned redirect, or a confirm leg that came back `failed`/`expired`. The
 * slot is still held, so the deadline is the most useful thing on the panel and
 * "try again" is the primary action; nothing has been charged, and the copy says
 * so rather than leaving the customer to guess.
 *
 * @param {Object}    props               Props.
 * @param {?string}   props.deadlineLabel Local time the hold ends, if known.
 * @param {?string}   props.orderCode     Order code, if known.
 * @param {boolean}   props.released      Whether the hold is already gone.
 * @param {?Function} props.onRetry       Return to the Payment step (in-widget only).
 * @param {Function}  props.onBookAnother Restart the flow.
 * @param {boolean}   props.focusOnMount  Focus the heading.
 */
function PaymentIncomplete({
  deadlineLabel,
  orderCode,
  // The customer-safe sentence for a decline reason, when the server gave one
  // (rest-contract §3.8). "It did not work" is not an answer a customer can act
  // on; "your card was declined" is.
  failureCopy = '',
  // The hold is GONE — the server refused to capture against a slot it had
  // already given back (`hold_released`). The banner must not then quote a
  // deadline for it: there is nothing left to be held until.
  released = false,
  onRetry,
  onBookAnother,
  focusOnMount = true
}) {
  const headingRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (focusOnMount && headingRef.current) {
      headingRef.current.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  let holdLine = _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.pay_hold_generic;
  if (released) {
    holdLine = _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.pay_hold_released;
  } else if (deadlineLabel) {
    holdLine = (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.pay_hold_until, deadlineLabel);
  }
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
    class: "ap-step",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
      class: "ap-done",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("h2", {
        ref: headingRef,
        tabIndex: -1,
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.pay_incomplete_title
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("p", {
        class: "lead",
        children: failureCopy || _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.pay_incomplete_lead
      }), orderCode ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("span", {
        class: "ap-order",
        children: [_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.order_label, ' ', (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("span", {
          class: "ap-order-code",
          children: ["#", orderCode]
        })]
      }) : null]
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_feedback_jsx__WEBPACK_IMPORTED_MODULE_4__.Banner, {
      variant: "clock",
      body: holdLine
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
      class: "ap-conf-actions",
      children: [onRetry ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("button", {
        type: "button",
        class: "ap-primary",
        onClick: onRetry,
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.try_again
      }) : null, (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("button", {
        type: "button",
        onClick: onBookAnother,
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.book_another
      })]
    })]
  });
}

/**
 * A resume link that no longer leads anywhere payable.
 *
 * The cases lead somewhere DIFFERENT, which is the whole reason the refusal
 * carries the order's real payment status: "you have already paid" ends the
 * story, "that hold expired" needs a way back to the form. Anything else — a
 * dead token, a gateway switched off since — falls in with the expired case,
 * because "book again" is the only honest advice left.
 *
 * `busy` is the one that is NOT terminal (D-R39c round 2, Codex NEW-4): the
 * server answered `503` for longer than the widget's bounded retry, meaning
 * another writer holds this order for the moment. The hold is alive, so the only
 * correct action is the one this state offers — try the same link again. Showing
 * the expired copy here told a customer with a live slot that they had lost it,
 * and the token was already stripped from the URL, so the lie was also the end
 * of the road.
 *
 * @param {Object}   props              Props.
 * @param {boolean}  props.paid         Whether the order is already settled.
 * @param {boolean}  props.busy         Whether the refusal was a temporary lock timeout.
 * @param {Function} props.onRetry      Re-send the resume request.
 * @param {string}   props.bookAgainUrl Clean booking-page URL, or ''.
 * @param {boolean}  props.focusOnMount Focus the heading.
 */
function ResumeUnavailable({
  paid,
  busy = false,
  onRetry = null,
  bookAgainUrl,
  focusOnMount = true
}) {
  const headingRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (focusOnMount && headingRef.current) {
      headingRef.current.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  let title = _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.resume_gone_title;
  let lead = _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.resume_gone_lead;
  if (busy) {
    title = _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.resume_busy_title;
    lead = _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.resume_busy_lead;
  } else if (paid) {
    title = _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.resume_paid_title;
    lead = _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.resume_paid_lead;
  }
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
    class: "ap-step",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
      class: "ap-done",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("h2", {
        ref: headingRef,
        tabIndex: -1,
        children: title
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("p", {
        class: "lead",
        children: lead
      })]
    }), busy && onRetry ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
      class: "ap-conf-actions",
      children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("button", {
        type: "button",
        class: "ap-primary",
        onClick: onRetry,
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.try_again
      })
    }) : null, !busy && !paid && bookAgainUrl ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
      class: "ap-conf-actions",
      children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("a", {
        class: "ap-btn",
        href: bookAgainUrl,
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.resume_book_again
      })
    }) : null]
  });
}

/***/ },

/***/ "./assets/src/form/components/DateTimeStep.jsx"
/*!*****************************************************!*\
  !*** ./assets/src/form/components/DateTimeStep.jsx ***!
  \*****************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DateTimeStep: () => (/* binding */ DateTimeStep)
/* harmony export */ });
/* harmony import */ var _StepHeader_jsx__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./StepHeader.jsx */ "./assets/src/form/components/StepHeader.jsx");
/* harmony import */ var _Footer_jsx__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Footer.jsx */ "./assets/src/form/components/Footer.jsx");
/* harmony import */ var _Calendar_jsx__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./Calendar.jsx */ "./assets/src/form/components/Calendar.jsx");
/* harmony import */ var _Skeletons_jsx__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./Skeletons.jsx */ "./assets/src/form/components/Skeletons.jsx");
/* harmony import */ var _feedback_jsx__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./feedback.jsx */ "./assets/src/form/components/feedback.jsx");
/* harmony import */ var _lib_tz_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../lib/tz.js */ "./assets/src/form/lib/tz.js");
/* harmony import */ var _lib_format_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../lib/format.js */ "./assets/src/form/lib/format.js");
/* harmony import */ var _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../lib/copy.js */ "./assets/src/form/lib/copy.js");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
/** @jsxImportSource preact */
/**
 * Step 2 — Date & time (SPEC-P1 §2.2 #2).
 *
 * A lazy month calendar plus start-time-only slot chips grouped by the calendar
 * day IN THE DISPLAY TIMEZONE. The friendly `City (GMT±N)` label is always
 * visible in-flow (D1). When the browser zone differs from the business zone the
 * timezone selector appears (defaulting to the browser zone) and the studio time
 * shows as a labelled secondary line. Every rendered time flows through the one
 * `tz.js` formatter — no hand-rolled time math here.
 */









const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Human "Mon D" label from a display-tz `YYYY-MM-DD` day key (tz-independent). */
function dayLabel(key) {
  if (!key) {
    return '';
  }
  const parts = key.split('-');
  return MON3[Number(parts[1]) - 1] + ' ' + Number(parts[2]);
}
function DateTimeStep({
  service,
  locale,
  // Server-supplied ISO exponent for the site currency (D-R39a).
  currencyExponent = null,
  displayTz,
  businessTz,
  showSelector,
  tzOptions,
  calYear,
  calMonth,
  onMonth,
  availabilityIndex,
  maxSlots,
  availLoading,
  availError,
  onRetryAvail,
  todayKey,
  years,
  selectedDayKey,
  onSelectDay,
  selectedSlotUtc,
  onSelectSlot,
  onChangeDisplayTz,
  stepIndex,
  stepCount,
  focusOnMount,
  onBack,
  onContinue,
  onChangeService
}) {
  const daySlots = selectedDayKey ? availabilityIndex[selectedDayKey] || [] : [];
  const refInstant = selectedSlotUtc || (daySlots.length ? daySlots[0].start_utc : Date.now());
  function renderSlots() {
    if (!selectedDayKey) {
      return null;
    }
    return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("div", {
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("div", {
        class: "ap-slots-head",
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("span", {
          class: "ap-slots-title",
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("span", {
            class: "ap-item-title",
            children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.available_times
          }), !showSelector && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("small", {
            children: (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_5__.tzLabel)(displayTz, refInstant)
          })]
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("span", {
          class: "ap-slots-count",
          children: (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.slots_day_count, dayLabel(selectedDayKey), daySlots.length)
        })]
      }), daySlots.length ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("div", {
        class: "ap-slots",
        role: "radiogroup",
        "aria-label": _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.available_times,
        children: daySlots.map(slot => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("button", {
          type: "button",
          class: "ap-slot",
          role: "radio",
          "aria-checked": selectedSlotUtc === slot.start_utc ? 'true' : 'false',
          onClick: () => onSelectSlot(slot.start_utc),
          children: (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_5__.fmtTime)(slot.start_utc, displayTz, locale)
        }, slot.start_utc))
      }) : (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("div", {
        class: "ap-noslot",
        children: (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.no_slots_day, dayLabel(selectedDayKey))
      }), showSelector && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("div", {
        class: "ap-visitor-tz",
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("label", {
          for: "ap-tz-select",
          children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.visitor_tz_label
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("select", {
          id: "ap-tz-select",
          value: displayTz,
          onChange: e => onChangeDisplayTz(e.target.value),
          children: tzOptions.map(iana => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("option", {
            value: iana,
            children: (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_5__.tzLabel)(iana, refInstant)
          }, iana))
        }), selectedSlotUtc && displayTz !== businessTz && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("small", {
          children: (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.business_time_line, (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_5__.fmtTime)(selectedSlotUtc, businessTz, locale), (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_5__.tzLabel)(businessTz, selectedSlotUtc))
        })]
      })]
    });
  }
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("div", {
    class: "ap-step",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_StepHeader_jsx__WEBPACK_IMPORTED_MODULE_0__.StepHeader, {
      title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.datetime_title,
      sub: _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.datetime_sub,
      stepIndex: stepIndex,
      stepCount: stepCount,
      focusOnMount: focusOnMount
    }), onChangeService && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("div", {
      class: "ap-change-row",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("span", {
        class: "info",
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("b", {
          children: service.name
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("small", {
          children: [(0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.formatDuration)(service.duration_minutes, locale), (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.formatMoney)(service.price_minor, service.currency, locale, currencyExponent) ? ' · ' + (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_6__.formatMoney)(service.price_minor, service.currency, locale, currencyExponent) : '']
        })]
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("button", {
        type: "button",
        onClick: onChangeService,
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.change_service
      })]
    }), availError ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("div", {
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_feedback_jsx__WEBPACK_IMPORTED_MODULE_4__.Banner, {
        variant: "err",
        title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.load_availability_err,
        body: _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.load_retry_sub
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("div", {
        class: "ap-foot",
        children: [onBack ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("button", {
          type: "button",
          class: "ap-back",
          onClick: onBack,
          children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.back
        }) : (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("span", {}), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("button", {
          type: "button",
          class: "ap-primary",
          onClick: onRetryAvail,
          children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.try_again
        })]
      })]
    }) : availLoading && !Object.keys(availabilityIndex).length ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("div", {
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_Skeletons_jsx__WEBPACK_IMPORTED_MODULE_3__.CalendarSkeleton, {}), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("div", {
        style: {
          marginTop: '18px'
        },
        children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_Skeletons_jsx__WEBPACK_IMPORTED_MODULE_3__.SlotsSkeleton, {})
      })]
    }) : (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("div", {
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_Calendar_jsx__WEBPACK_IMPORTED_MODULE_2__.Calendar, {
        year: calYear,
        month: calMonth,
        locale: locale,
        todayKey: todayKey,
        availabilityIndex: availabilityIndex,
        selectedDayKey: selectedDayKey,
        maxSlots: maxSlots,
        years: years,
        onSelectDay: onSelectDay,
        onMonth: onMonth
      }), availLoading ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("div", {
        style: {
          marginTop: '18px'
        },
        children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_Skeletons_jsx__WEBPACK_IMPORTED_MODULE_3__.SlotsSkeleton, {})
      }) : renderSlots(), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_Footer_jsx__WEBPACK_IMPORTED_MODULE_1__.Footer, {
        onBack: onBack,
        onPrimary: onContinue,
        primaryLabel: _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.continue,
        primaryDisabled: !selectedSlotUtc
      })]
    })]
  });
}

/***/ },

/***/ "./assets/src/form/components/DetailsStep.jsx"
/*!****************************************************!*\
  !*** ./assets/src/form/components/DetailsStep.jsx ***!
  \****************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DetailsStep: () => (/* binding */ DetailsStep),
/* harmony export */   customKey: () => (/* binding */ customKey)
/* harmony export */ });
/* harmony import */ var preact_hooks__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! preact/hooks */ "./node_modules/preact/hooks/dist/hooks.module.js");
/* harmony import */ var _StepHeader_jsx__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./StepHeader.jsx */ "./assets/src/form/components/StepHeader.jsx");
/* harmony import */ var _Footer_jsx__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./Footer.jsx */ "./assets/src/form/components/Footer.jsx");
/* harmony import */ var _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../lib/copy.js */ "./assets/src/form/lib/copy.js");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
/** @jsxImportSource preact */
/**
 * Step 3 — Your details (SPEC-P1 §2.2 #3).
 *
 * Name + email are always required; phone follows the admin setting
 * (off / optional / required); an optional note is included. The consent
 * checkbox is a structural seam wired to the `consent_enabled` setting — present
 * and enforceable, kept off by default until P1b turns it on. A honeypot field
 * (offscreen, tabindex -1, aria-hidden) backs the server guard seam; it is never
 * part of the request body. Server 422 field errors map under each input with
 * `aria-invalid` + focus to the first bad field.
 *
 * The final Book CTA lives here — submitting POSTs the booking (there is no
 * separate Review step in V1).
 */





const BUILT_IN_ORDER = ['name', 'email', 'phone', 'consent'];

/** The error-map key for one custom field — the server's own 422 field key. */
const customKey = slug => 'custom_fields.' + slug;
function DetailsStep({
  details,
  onChange,
  phoneMode,
  consentEnabled,
  consentText,
  consent,
  onConsentChange,
  customFields,
  customValues,
  onCustomChange,
  honeypot,
  onHoneypot,
  fieldErrors,
  banner,
  stepIndex,
  stepCount,
  focusOnMount,
  onBack,
  onSubmit,
  // The Details CTA is only FINAL when nothing follows it. On a site that takes
  // payment for this service it is a plain "Continue" and the Book CTA moves to
  // the Payment step, which is also where the idempotency key is minted.
  primaryLabel = _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.book,
  submitting
}) {
  const refs = {
    name: (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(null),
    email: (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(null),
    phone: (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(null),
    consent: (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(null)
  };
  // One ref per custom field would break the rules of hooks (the list is
  // config-driven), so the controls register themselves in a single map.
  const customRefs = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)({});
  const custom = customFields || [];
  const values = customValues || {};
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!fieldErrors) {
      return;
    }
    // Custom fields render after the built-ins, so focus-first-error follows
    // the same visual order the visitor reads in.
    const order = BUILT_IN_ORDER.concat(custom.map(f => customKey(f.slug)));
    const first = order.find(f => fieldErrors[f]);
    if (!first) {
      return;
    }
    const target = refs[first] ? refs[first].current : customRefs.current[first];
    if (target) {
      target.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldErrors]);
  const err = fieldErrors || {};
  function customControl(f) {
    const key = customKey(f.slug);
    const bad = !!err[key];
    const id = 'ap-cf-' + f.slug;
    const errId = id + '-err';
    const value = values[f.slug];
    const marker = f.required ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span", {
      class: "req",
      children: "*"
    }) : (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span", {
      class: "opt",
      children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.phone_optional
    });
    const shared = {
      id,
      ref: el => {
        customRefs.current[key] = el;
      },
      'aria-invalid': bad ? 'true' : 'false',
      'aria-describedby': bad ? errId : undefined,
      // The `*` marker is visual only; assistive tech needs the attribute.
      'aria-required': f.required ? 'true' : undefined
    };
    const onInput = e => onCustomChange(f.slug, e.target.value);
    let control;
    if (f.type === 'checkbox') {
      control = (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("label", {
        class: "ap-consent",
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("input", {
          id: id,
          ref: el => {
            customRefs.current[key] = el;
          },
          type: "checkbox",
          checked: !!value,
          "aria-required": f.required ? 'true' : undefined,
          "aria-invalid": bad ? 'true' : 'false',
          "aria-describedby": bad ? errId : undefined,
          onChange: e => onCustomChange(f.slug, e.target.checked)
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("span", {
          children: [f.label, " ", f.required && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span", {
            class: "req",
            children: "*"
          })]
        })]
      });
    } else if (f.type === 'textarea') {
      control = (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("textarea", {
        ...shared,
        class: "ap-textarea",
        value: value || '',
        maxlength: f.maxLength || undefined,
        onInput: onInput
      });
    } else if (f.type === 'select') {
      control = (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("select", {
        ...shared,
        class: "ap-select",
        value: value || '',
        onChange: e => onCustomChange(f.slug, e.target.value),
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("option", {
          value: "",
          children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.select_placeholder
        }), f.options.map(o => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("option", {
          value: o.value,
          children: o.label
        }, o.value))]
      });
    } else {
      control = (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("input", {
        ...shared,
        type: "text",
        class: "ap-input",
        value: value || '',
        maxlength: f.maxLength || undefined,
        onInput: onInput
      });
    }
    return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
      class: 'ap-field' + (bad ? ' bad' : ''),
      children: [f.type !== 'checkbox' && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("label", {
        class: "ap-label",
        for: id,
        children: [f.label, " ", marker]
      }), control, bad && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("p", {
        class: "ap-err",
        id: errId,
        children: err[key]
      })]
    }, f.slug);
  }
  function field(name, labelNode, inputProps) {
    const bad = !!err[name];
    return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
      class: 'ap-field' + (bad ? ' bad' : ''),
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("label", {
        class: "ap-label",
        for: 'ap-' + name,
        children: labelNode
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("input", {
        id: 'ap-' + name,
        ref: refs[name],
        class: "ap-input",
        value: details[name] || '',
        "aria-invalid": bad ? 'true' : 'false',
        "aria-describedby": bad ? 'ap-' + name + '-err' : undefined,
        onInput: e => onChange(name, e.target.value),
        ...inputProps
      }), bad && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("p", {
        class: "ap-err",
        id: 'ap-' + name + '-err',
        children: err[name]
      })]
    });
  }
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
    class: "ap-step",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(_StepHeader_jsx__WEBPACK_IMPORTED_MODULE_1__.StepHeader, {
      title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.details_title,
      sub: _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.details_sub,
      stepIndex: stepIndex,
      stepCount: stepCount,
      focusOnMount: focusOnMount
    }), banner, field('name', (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("span", {
      children: [_lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.name_label, " ", (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span", {
        class: "req",
        children: "*"
      })]
    }), {
      type: 'text',
      autocomplete: 'name',
      placeholder: _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.name_placeholder
    }), field('email', (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("span", {
      children: [_lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.email_label, " ", (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span", {
        class: "req",
        children: "*"
      })]
    }), {
      type: 'email',
      autocomplete: 'email',
      placeholder: _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.email_placeholder,
      inputmode: 'email'
    }), phoneMode !== 'off' && field('phone', (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("span", {
      children: [_lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.phone_label, ' ', phoneMode === 'required' ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span", {
        class: "req",
        children: "*"
      }) : (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span", {
        class: "opt",
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.phone_optional
      })]
    }), {
      type: 'tel',
      autocomplete: 'tel',
      placeholder: _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.phone_placeholder,
      inputmode: 'tel'
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
      class: "ap-field",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("label", {
        class: "ap-label",
        for: "ap-note",
        children: [_lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.note_label, ' ', (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span", {
          class: "opt",
          children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.note_optional
        })]
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("textarea", {
        id: "ap-note",
        class: "ap-textarea",
        value: details.note || '',
        placeholder: _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.note_placeholder,
        onInput: e => onChange('note', e.target.value)
      })]
    }), custom.map(customControl), consentEnabled && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
      class: 'ap-field' + (err.consent ? ' bad' : ''),
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("label", {
        class: "ap-consent",
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("input", {
          ref: refs.consent,
          type: "checkbox",
          checked: !!consent,
          "aria-required": "true",
          "aria-invalid": err.consent ? 'true' : 'false',
          onChange: e => onConsentChange(e.target.checked)
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("span", {
          children: [consentText || _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.consent_default, ' ', (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span", {
            class: "req",
            children: "*"
          })]
        })]
      }), err.consent && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("p", {
        class: "ap-err",
        style: {
          display: 'block'
        },
        children: err.consent
      })]
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("div", {
      class: "ap-honeypot",
      "aria-hidden": "true",
      children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("label", {
        children: ["Leave this field empty", (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("input", {
          type: "text",
          tabIndex: -1,
          autocomplete: "off",
          value: honeypot,
          onInput: e => onHoneypot(e.target.value)
        })]
      })
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(_Footer_jsx__WEBPACK_IMPORTED_MODULE_2__.Footer, {
      onBack: onBack,
      onPrimary: onSubmit,
      primaryLabel: primaryLabel,
      busy: submitting,
      busyLabel: _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.saving
    })]
  });
}

/***/ },

/***/ "./assets/src/form/components/Footer.jsx"
/*!***********************************************!*\
  !*** ./assets/src/form/components/Footer.jsx ***!
  \***********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Footer: () => (/* binding */ Footer)
/* harmony export */ });
/* harmony import */ var _icons_jsx__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./icons.jsx */ "./assets/src/form/components/icons.jsx");
/* harmony import */ var _lib_copy_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../lib/copy.js */ "./assets/src/form/lib/copy.js");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
/** @jsxImportSource preact */
/**
 * In-flow footer: a text Back link and one primary CTA per step (design decision
 * §5 "One primary per step; Back is a text link"). No separating border; actions
 * align to the content grid edges.
 *
 * `onPrimary` is optional for exactly one case: a payment gateway whose own
 * control is the CTA (PayPal's buttons open their popup from a click on PayPal's
 * iframe, which no button of ours can produce). The slot keeps its grid column
 * so Back stays where it was.
 *
 * `backDisabled` is for the other half of that case: while such a gateway has an
 * attempt in flight, leaving the step would release a hold the gateway may be
 * about to capture against, so Back is DISABLED rather than removed — a control
 * that vanishes and comes back reads as a broken page, and the visitor needs to
 * see that the way out is still there once the popup closes.
 */



function Footer({
  onBack,
  onPrimary,
  primaryLabel,
  primaryDisabled = false,
  backDisabled = false,
  busy = false,
  busyLabel,
  backLabel = _lib_copy_js__WEBPACK_IMPORTED_MODULE_1__.COPY.back
}) {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
    class: "ap-foot",
    children: [onBack ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("button", {
      type: "button",
      class: "ap-back",
      onClick: onBack,
      disabled: backDisabled,
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_0__.IconChevronLeft, {}), backLabel]
    }) : (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {}), onPrimary ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("button", {
      type: "button",
      class: 'ap-primary' + (busy ? ' busy' : ''),
      onClick: onPrimary,
      disabled: primaryDisabled || busy,
      "aria-busy": busy ? 'true' : 'false',
      children: [busy && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
        class: "ap-spin",
        "aria-hidden": "true"
      }), busy ? busyLabel || _lib_copy_js__WEBPACK_IMPORTED_MODULE_1__.COPY.saving : primaryLabel]
    }) : (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {})]
  });
}

/***/ },

/***/ "./assets/src/form/components/PaymentStep.jsx"
/*!****************************************************!*\
  !*** ./assets/src/form/components/PaymentStep.jsx ***!
  \****************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ONSITE: () => (/* binding */ ONSITE),
/* harmony export */   PaymentStep: () => (/* binding */ PaymentStep),
/* harmony export */   paymentMethods: () => (/* binding */ paymentMethods)
/* harmony export */ });
/* harmony import */ var _StepHeader_jsx__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./StepHeader.jsx */ "./assets/src/form/components/StepHeader.jsx");
/* harmony import */ var _Footer_jsx__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Footer.jsx */ "./assets/src/form/components/Footer.jsx");
/* harmony import */ var _feedback_jsx__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./feedback.jsx */ "./assets/src/form/components/feedback.jsx");
/* harmony import */ var _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../lib/copy.js */ "./assets/src/form/lib/copy.js");
/* harmony import */ var _lib_payments_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/payments.js */ "./assets/src/form/lib/payments.js");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
/** @jsxImportSource preact */
/**
 * Step 4 — Payment method (SPEC-P1 §2.2, D-R38).
 *
 * Renders the method cards and the PANELS the gateways project into — and
 * nothing else. It owns no gateway state: the adapter lifecycle lives in
 * `app.jsx` because it has to outlive this component's renders, and the only
 * gateway-shaped thing here is `<slot name="ap-…">`, the projection target for a
 * holder that lives in the LIGHT DOM (spike: Stripe refuses to mount inside a
 * ShadowRoot, and its Payment Element fails silently when you try).
 *
 * Two details that look like mistakes and are not:
 *
 *  - The panel is hidden with `hidden` but the SLOTTED content is not, because
 *    hiding a shadow node does not hide what is projected into it. The adapter
 *    hides its own holder; both are needed.
 *  - The methods are real `<input type="radio">` in one named group, not the
 *    mockup's `role="button" aria-pressed` divs. Same picture, but arrow-key
 *    navigation, grouping and the "one of N" announcement come from the platform
 *    rather than from code that has to be maintained.
 */






/** The pseudo-method for "not online" — never sent to the server as a method. */

const ONSITE = 'onsite';

/**
 * The method list for one configuration: every gateway this build can draw, plus
 * the on-site option when — and only when — the site allows it (`optional`).
 *
 * @param {Array}  gateways Renderable gateways.
 * @param {string} mode     `optional` | `required`.
 * @return {Array<{key:string, title:string, sub:string, gateway:?Object}>} Methods.
 */
function paymentMethods(gateways, mode) {
  const methods = (gateways || []).map(gateway => {
    const copy = (0,_lib_payments_js__WEBPACK_IMPORTED_MODULE_4__.gatewayCopy)(gateway);
    return {
      key: gateway.code,
      title: copy.title,
      sub: copy.sub,
      gateway
    };
  });
  if (mode === 'optional') {
    methods.push({
      key: ONSITE,
      title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.pay_onsite_title,
      sub: _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.pay_onsite_sub,
      gateway: null
    });
  }
  return methods;
}
function PaymentStep({
  gateways,
  mode,
  method,
  onMethod,
  totalLabel,
  gatewayLoading,
  gatewayReady,
  // True while a gateway that owns the CTA has an attempt in flight (D-R40,
  // Codex r1 #5). Everything that would ABANDON the booking is refused for as
  // long as it lasts — Back, the method radios, "Pay on-site instead" — because
  // each of them releases the held slot, and the gateway may be moments away
  // from capturing against the order that hold belongs to. The buyer's own way
  // out is closing the gateway's window, which ends the attempt.
  locked,
  error,
  notice,
  // A live hold's deadline (resume path): the single most useful fact on this
  // screen for somebody who left and came back.
  deadlineLabel = '',
  resuming = false,
  onRetry,
  onPayOnsite,
  stepIndex,
  stepCount,
  focusOnMount,
  onBack,
  onSubmit,
  submitting
}) {
  const methods = paymentMethods(gateways, mode);
  const online = method !== ONSITE;
  // PayPal's buttons open their popup from a click on PayPal's own iframe, so
  // a primary button beside them could not start the payment even if it looked
  // like it should. The step drops its CTA rather than showing a dead one.
  const ctaOwned = online && (0,_lib_payments_js__WEBPACK_IMPORTED_MODULE_4__.gatewayOwnsCta)(method);
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
    class: "ap-step",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(_StepHeader_jsx__WEBPACK_IMPORTED_MODULE_0__.StepHeader, {
      title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.payment_title,
      sub: _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.payment_sub,
      stepIndex: stepIndex,
      stepCount: stepCount,
      focusOnMount: focusOnMount
    }), notice && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(_feedback_jsx__WEBPACK_IMPORTED_MODULE_2__.Banner, {
      variant: "warn",
      title: notice.title,
      body: notice.body,
      children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
        class: "ap-note-actions",
        children: [notice.retry !== false && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("button", {
          type: "button",
          class: "ap-link",
          onClick: onRetry,
          disabled: locked,
          children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.try_again
        }), mode === 'optional' && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("button", {
          type: "button",
          class: "ap-link",
          onClick: onPayOnsite,
          disabled: locked,
          children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.pay_onsite_instead
        })]
      })
    }), deadlineLabel ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("p", {
      class: "ap-pay-deadline",
      children: (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.pay_held_until, deadlineLabel)
    }) : null, (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("div", {
      class: "ap-pay-list",
      children: methods.map(m => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("label", {
        class: 'ap-pay' + (method === m.key ? ' sel' : '') + (locked ? ' locked' : ''),
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("input", {
          type: "radio",
          name: "ap-pay-method",
          value: m.key,
          checked: method === m.key,
          disabled: locked,
          onChange: () => onMethod(m.key)
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
          class: "radio",
          "aria-hidden": "true"
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("span", {
          class: "txt",
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
            class: "ap-item-title",
            children: m.title
          }), m.sub ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("small", {
            children: m.sub
          }) : null]
        })]
      }, m.key))
    }), (gateways || []).map(g => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
      class: "ap-card-shell",
      "data-gateway": g.code,
      hidden: method !== g.code,
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("p", {
        class: "cap",
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
          children: (0,_lib_payments_js__WEBPACK_IMPORTED_MODULE_4__.gatewayCopy)(g).panel
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
          children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.pay_secure
        })]
      }), gatewayLoading && method === g.code && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("p", {
        class: "ap-pay-loading",
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.pay_loading
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("slot", {
        name: (0,_lib_payments_js__WEBPACK_IMPORTED_MODULE_4__.slotName)(g.code)
      })]
    }, g.code)), ctaOwned && !gatewayLoading && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("p", {
      class: "ap-pay-hint",
      children: locked ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.pay_cta_gateway_busy : _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.pay_cta_gateway
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("p", {
      class: "ap-pay-error",
      role: "alert",
      "aria-live": "assertive",
      children: error || ''
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("div", {
      class: "ap-note",
      children: online ? (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.pay_note_now, totalLabel) : (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.pay_note_onsite, totalLabel)
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(_Footer_jsx__WEBPACK_IMPORTED_MODULE_1__.Footer, {
      onBack: onBack,
      backDisabled: !!locked,
      onPrimary: ctaOwned ? null : onSubmit,
      primaryLabel: online ? (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.sprintf)(resuming ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.pay_cta_resume : _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.pay_cta, totalLabel) : _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.book,
      primaryDisabled: online && !gatewayReady,
      busy: submitting,
      busyLabel: _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.pay_busy
    })]
  });
}

/***/ },

/***/ "./assets/src/form/components/ServiceStep.jsx"
/*!****************************************************!*\
  !*** ./assets/src/form/components/ServiceStep.jsx ***!
  \****************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ServiceStep: () => (/* binding */ ServiceStep)
/* harmony export */ });
/* harmony import */ var preact_hooks__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! preact/hooks */ "./node_modules/preact/hooks/dist/hooks.module.js");
/* harmony import */ var _icons_jsx__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./icons.jsx */ "./assets/src/form/components/icons.jsx");
/* harmony import */ var _StepHeader_jsx__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./StepHeader.jsx */ "./assets/src/form/components/StepHeader.jsx");
/* harmony import */ var _lib_format_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../lib/format.js */ "./assets/src/form/lib/format.js");
/* harmony import */ var _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/copy.js */ "./assets/src/form/lib/copy.js");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
/** @jsxImportSource preact */
/**
 * Step 1 — Service (SPEC-P1 §2.2 #1).
 *
 * Hybrid pattern: a type-to-filter search that returns a flat "Category / Service"
 * list, plus a category drill-down when idle. When there is ≤1 category or only a
 * few services the widget drops straight to a flat list — no pointless category
 * hop. Rows show name + one-line description on the left, price + duration on the
 * right, and a selection tick last. Selecting a service hands it into the rest of
 * the flow.
 *
 * The layout is the design reference's 820px `.ap-main.service` catalogue
 * (`docs/mockups/v4/booking-form/`, "Category & service display · option 2").
 * Unlike the mockup's 33-service fixture, a real fresh site has no categories, no
 * descriptions and often no prices, so both the row anatomy and the step's sub
 * degrade explicitly rather than leaving holes in the design.
 */






/**
 * Above this many services a flat catalogue earns a search field. The reference
 * catalogue always carries one because its dataset is 33 services; a 3-row list
 * does not, so the threshold is tied to the thing that actually makes scanning
 * hard — `.ap-list.scroll` caps at 352px, which is where a ~6-row list starts to
 * clip. Below it the list IS the search, and the step's sub says so.
 */

const FLAT_THRESHOLD = 5;

/**
 * One catalogue row — the reference's `.ap-svc` anatomy: name over a one-line
 * description on the left, price over duration on the right, selection tick last.
 *
 * Two degradations the reference dataset never exercises (every mockup service
 * has a description and a price), decided here:
 *   - no description AND no category path -> the row is a single line, so it
 *     centers (`is-single`) instead of top-aligning a 2-line meta against a
 *     1-line title;
 *   - no price -> the duration is the only meta, so it steps up from the `xs`
 *     secondary size to `sm` rather than sitting alone as micro-type.
 */
function ServiceRow({
  service,
  selected,
  showPath,
  onClick
}) {
  const price = (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_3__.formatMoney)(service.price_minor, service.currency, service.__locale, service.__exponent);
  // Search results carry BOTH the category path and the description, the path
  // as a soft prefix — losing the description in search results made the same
  // row read differently depending on how the visitor got to it.
  const path = showPath ? service.category ? service.category.name : _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.all_services : '';
  const desc = service.description || '';
  const hasSub = !!(path || desc);
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("button", {
    type: "button",
    class: 'ap-svc' + (hasSub ? '' : ' is-single') + (price ? '' : ' no-price'),
    "aria-pressed": selected ? 'true' : 'false',
    onClick: onClick,
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("span", {
      class: "txt",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
        class: "ap-item-title",
        children: service.name
      }), hasSub ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("small", {
        children: [path ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("span", {
          class: "path",
          children: [path, desc ? ' · ' : '']
        }) : null, desc]
      }) : null]
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("span", {
      class: "meta",
      children: [price ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
        class: "price",
        children: price
      }) : null, (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
        class: "dur",
        children: (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_3__.formatDuration)(service.duration_minutes, service.__locale)
      })]
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
      class: "tick",
      "aria-hidden": "true",
      children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_1__.IconCheck, {})
    })]
  });
}
function ServiceStep({
  services,
  categories,
  locale,
  // Server-supplied ISO exponent for the site currency (D-R39a); rides the same
  // per-row injection as the locale so `ServiceRow` needs no new prop.
  currencyExponent = null,
  selectedId,
  stepIndex,
  stepCount,
  focusOnMount,
  onSelect
}) {
  const [query, setQuery] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)('');
  const [openCat, setOpenCat] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const withLocale = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => services.map(s => Object.assign({
    __locale: locale,
    __exponent: currencyExponent
  }, s)), [services, locale, currencyExponent]);

  // Categories that actually hold at least one active service — an empty category never
  // renders a dead drill-in row and never forces the browse layout.
  const usableCategories = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => categories.filter(c => services.some(s => s.category && s.category.id === c.id)), [categories, services]);

  // SPEC-P1 §2.2: MORE THAN ONE category → category browse + search, whatever the service
  // count. A small multi-category catalogue previously fell through to the flat list (the
  // service-count short-circuit), hiding the categories entirely (fleet-r1 U2 F4).
  const flat = usableCategories.length <= 1;
  const showSearch = !!services.length && (!flat || services.length > FLAT_THRESHOLD);
  const q = query.trim().toLowerCase();

  // The sub describes the controls that are actually on screen. Promising "browse
  // a category or search by name" above a bare 4-row list with neither control is
  // what made the fresh-site step read as broken.
  const sub = !services.length ? '' : !flat ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.service_sub : showSearch ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.service_sub_search : _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.service_sub_plain;
  const searchResults = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => {
    if (!q) {
      return null;
    }
    return withLocale.filter(s => {
      const hay = (s.name + ' ' + (s.description || '') + ' ' + (s.category ? s.category.name : '')).toLowerCase();
      return hay.includes(q);
    });
  }, [q, withLocale]);
  function minPrice(catId) {
    const prices = withLocale.filter(s => s.category && s.category.id === catId).map(s => s.price_minor).filter(p => p !== null && p !== undefined);
    if (!prices.length) {
      return '';
    }
    return (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_3__.formatMoney)(Math.min(...prices), services[0].currency, locale, currencyExponent);
  }
  function catServices(catId) {
    return withLocale.filter(s => s.category && s.category.id === catId);
  }
  function renderBody() {
    if (!services.length) {
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
        class: "ap-empty",
        children: [_lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.no_services, (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("br", {}), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
          class: "ap-sum-sub",
          children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.no_services_sub
        })]
      });
    }

    // Active search — flat results across everything.
    if (searchResults) {
      if (!searchResults.length) {
        return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("div", {
          class: "ap-empty",
          children: (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.no_matches, query.trim())
        });
      }
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("div", {
        class: "ap-list scroll",
        children: searchResults.map(s => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(ServiceRow, {
          service: s,
          selected: s.id === selectedId,
          showPath: true,
          onClick: () => onSelect(s)
        }, s.id))
      });
    }

    // Flat catalogue for small businesses.
    if (flat) {
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("div", {
        class: "ap-list scroll",
        children: withLocale.map(s => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(ServiceRow, {
          service: s,
          selected: s.id === selectedId,
          onClick: () => onSelect(s)
        }, s.id))
      });
    }

    // Drilled into a category.
    if (openCat) {
      const cat = categories.find(c => c.id === openCat);
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
          class: "ap-crumbs",
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("button", {
            type: "button",
            onClick: () => setOpenCat(null),
            children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.all_categories
          }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_1__.IconChevronRight, {}), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
            children: cat ? cat.name : ''
          })]
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("div", {
          class: "ap-list scroll",
          children: catServices(openCat).map(s => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(ServiceRow, {
            service: s,
            selected: s.id === selectedId,
            onClick: () => onSelect(s)
          }, s.id))
        })]
      });
    }

    // Category landing.
    const uncategorized = withLocale.filter(s => !s.category);
    return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
      class: "ap-list",
      children: [usableCategories.map(c => {
        const count = catServices(c.id).length;
        const from = minPrice(c.id);
        return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("button", {
          type: "button",
          class: "ap-cat",
          onClick: () => setOpenCat(c.id),
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("span", {
            class: "txt",
            children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
              class: "ap-item-title",
              children: c.name
            }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("small", {
              children: [count === 1 ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.service_count_one : (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.services_count, count), from ? ' · ' + (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.from_price, from) : '']
            })]
          }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
            class: "chev",
            "aria-hidden": "true",
            children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_1__.IconChevronRight, {})
          })]
        }, c.id);
      }), uncategorized.map(s => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(ServiceRow, {
        service: s,
        selected: s.id === selectedId,
        onClick: () => onSelect(s)
      }, s.id))]
    });
  }
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
    class: "ap-step",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(_StepHeader_jsx__WEBPACK_IMPORTED_MODULE_2__.StepHeader, {
      title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.service_title,
      sub: sub,
      stepIndex: stepIndex,
      stepCount: stepCount,
      focusOnMount: focusOnMount
    }), showSearch && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("label", {
      class: "ap-search",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_1__.IconSearch, {}), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("input", {
        class: "ap-input",
        type: "search",
        value: query,
        placeholder: _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.search_placeholder,
        "aria-label": _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.search_placeholder,
        onInput: e => setQuery(e.target.value)
      })]
    }), renderBody()]
  });
}

/***/ },

/***/ "./assets/src/form/components/Skeletons.jsx"
/*!**************************************************!*\
  !*** ./assets/src/form/components/Skeletons.jsx ***!
  \**************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CalendarSkeleton: () => (/* binding */ CalendarSkeleton),
/* harmony export */   ServiceSkeleton: () => (/* binding */ ServiceSkeleton),
/* harmony export */   SlotsSkeleton: () => (/* binding */ SlotsSkeleton)
/* harmony export */ });
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");

/** @jsxImportSource preact */
/**
 * Loading skeletons — "shaped like the thing that's coming", never a spinner
 * (design §4). One for the service catalogue, one for the calendar + slots.
 */

function Bar({
  w,
  h,
  mb
}) {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("div", {
    class: "ap-sk",
    style: {
      width: w || '100%',
      height: (h || 12) + 'px',
      marginBottom: (mb || 0) + 'px'
    }
  });
}
function ServiceSkeleton() {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
    "aria-hidden": "true",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Bar, {
      h: 40,
      mb: 12
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("div", {
      style: {
        border: '1px solid var(--ap-color-border)',
        borderRadius: 'var(--ap-radius-control)',
        padding: '0 14px'
      },
      children: [32, 40, 28].map((pct, i) => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
        class: "ap-sk-row",
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
          style: {
            flex: 1
          },
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Bar, {
            w: pct + '%',
            h: 12,
            mb: 6
          }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Bar, {
            w: '60%',
            h: 9
          })]
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Bar, {
          w: '82px',
          h: 9
        })]
      }, i))
    })]
  });
}
function CalendarSkeleton() {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
    "aria-hidden": "true",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '10px'
      },
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Bar, {
        w: '100px',
        h: 20
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Bar, {
        w: '64px',
        h: 28
      })]
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Bar, {
      h: 26,
      mb: 6
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '3px'
      },
      children: Array.from({
        length: 21
      }).map((_, i) => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Bar, {
        h: 34
      }, i))
    })]
  });
}
function SlotsSkeleton() {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("div", {
    class: "ap-slots",
    "aria-hidden": "true",
    children: Array.from({
      length: 8
    }).map((_, i) => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Bar, {
      h: 34
    }, i))
  });
}

/***/ },

/***/ "./assets/src/form/components/StepHeader.jsx"
/*!***************************************************!*\
  !*** ./assets/src/form/components/StepHeader.jsx ***!
  \***************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   StepHeader: () => (/* binding */ StepHeader)
/* harmony export */ });
/* harmony import */ var preact_hooks__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! preact/hooks */ "./node_modules/preact/hooks/dist/hooks.module.js");
/* harmony import */ var _lib_copy_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../lib/copy.js */ "./assets/src/form/lib/copy.js");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
/** @jsxImportSource preact */
/**
 * Step heading with the compact fraction progress (SPEC-P1 §2.1). Progress is a
 * fraction next to the heading — never a bar — and carries an accessible
 * "Step X of N" label that renumbers honestly as dynamic steps appear/disappear.
 * The heading is focused on mount ONLY after a user-driven step change
 * (`focusOnMount`), so keyboard/AT users land on the new step after navigation
 * without the widget stealing focus / scrolling the page on its first paint
 * (REVIEW §2 #17).
 */



function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}
function StepHeader({
  title,
  sub,
  stepIndex,
  stepCount,
  focusOnMount = true
}) {
  const headingRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (focusOnMount && headingRef.current) {
      headingRef.current.focus();
    }
    // Mount-only: reads focusOnMount at mount time (correct for the fresh
    // heading of the step just navigated to).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const showFraction = Number.isInteger(stepIndex) && Number.isInteger(stepCount);
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
    class: "ap-h",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("h2", {
      ref: headingRef,
      tabIndex: -1,
      children: title
    }), showFraction && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("span", {
      class: "ap-step-fraction",
      "aria-label": (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_1__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_1__.COPY.step_of, stepIndex, stepCount),
      children: [pad2(stepIndex), " / ", pad2(stepCount)]
    }), sub ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("p", {
      class: "sub",
      children: sub
    }) : null]
  });
}

/***/ },

/***/ "./assets/src/form/components/Summary.jsx"
/*!************************************************!*\
  !*** ./assets/src/form/components/Summary.jsx ***!
  \************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SUMMARY_HEADING_ID: () => (/* binding */ SUMMARY_HEADING_ID),
/* harmony export */   Summary: () => (/* binding */ Summary),
/* harmony export */   recapLine: () => (/* binding */ recapLine)
/* harmony export */ });
/* harmony import */ var _lib_tz_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../lib/tz.js */ "./assets/src/form/lib/tz.js");
/* harmony import */ var _lib_format_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../lib/format.js */ "./assets/src/form/lib/format.js");
/* harmony import */ var _lib_copy_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../lib/copy.js */ "./assets/src/form/lib/copy.js");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
/** @jsxImportSource preact */
/**
 * Booking summary — ONE renderer, TWO placements. The ≥700px container gets it as
 * the `.ap-aside` sidebar column; below 700px the same element is the body of the
 * in-flow recap accordion (SPEC-P1 §2.1, `docs/mockups/v4/booking-form/`
 * `summaryBodyHTML()`). Because both placements mount this same component, a
 * selection can never appear on one surface but not the other.
 *
 * Structure mirrors the reference so the sidebar can scroll its item area while
 * the cost/total block stays pinned to the bottom of the column:
 *
 *   .ap-summary-body
 *     .ap-sum-scroll   ← the item area; `overflow-y:auto` inside `.ap-aside`
 *     .ap-sum-sec      ← total/price; `margin-top:auto` inside `.ap-aside`
 *
 * The heading ("Your booking") is NOT rendered here: the sidebar supplies it as
 * the landmark's accessible name, and the accordion is already labelled by its
 * own disclosure button. Rendering it inside the body would duplicate it in the
 * accordion.
 *
 * V1 gating (REVIEW.md §2 item 5): no cart, so no item count, no "Add service",
 * no specialist/location lines and no payments/credits line — just the single
 * current booking.
 *
 * Every time flows through the one `tz.js` formatter in the active display_tz, so
 * the summary is byte-consistent with the slot picker and confirmation (D1). The
 * studio time appears as a labelled secondary line whenever the zones differ.
 */




/** end instant = start + service duration. */

function endInstant(slotUtc, durationMinutes) {
  return new Date(new Date(slotUtc).getTime() + (durationMinutes || 0) * 60000).toISOString();
}

/** One-line recap for the collapsed mobile bar. */
function recapLine({
  service,
  slotUtc,
  displayTz,
  locale
}) {
  if (!slotUtc) {
    return service ? service.name : '';
  }
  const when = (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_0__.formatInTz)(slotUtc, displayTz, {
    month: 'short',
    day: 'numeric'
  }, locale);
  return (service ? service.name + ' · ' : '') + when + ', ' + (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_0__.fmtTime)(slotUtc, displayTz, locale);
}

/** The heading both placements agree on (sidebar label / accordion fallback). */
const SUMMARY_HEADING_ID = 'ap-summary-heading';
function Summary({
  service,
  locale,
  // The site currency's ISO exponent, from the server: `Intl`'s digit table
  // disagrees with ISO for at least one live currency, and the price was
  // stored against ISO (D-R39a).
  currencyExponent = null,
  displayTz,
  businessTz,
  slotUtc
}) {
  const price = (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_1__.formatMoney)(service.price_minor, service.currency, locale, currencyExponent);
  const endUtc = slotUtc ? endInstant(slotUtc, service.duration_minutes) : null;
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)("div", {
    class: "ap-summary-body",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)("div", {
      class: "ap-sum-scroll",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("p", {
        class: "ap-sum-svc",
        children: service.name
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)("p", {
        class: "ap-sum-sub",
        children: [(0,_lib_format_js__WEBPACK_IMPORTED_MODULE_1__.formatDuration)(service.duration_minutes, locale), price ? ' · ' + price : '']
      }), slotUtc ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)("div", {
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)("div", {
          class: "ap-line",
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("span", {
            class: "l",
            children: (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_0__.formatInTz)(slotUtc, displayTz, {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            }, locale)
          }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("span", {
            class: "d"
          }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)("span", {
            class: "v",
            children: [(0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_0__.fmtTime)(slotUtc, displayTz, locale), " \u2192", ' ', (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_0__.fmtTime)(endUtc, displayTz, locale)]
          })]
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("p", {
          class: "ap-sum-biz",
          children: (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_0__.tzLabel)(displayTz, slotUtc)
        }), displayTz !== businessTz && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)("p", {
          class: "ap-sum-biz",
          children: [_lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.summary_studio, ": ", (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_0__.fmtTime)(slotUtc, businessTz, locale), " \xB7", ' ', (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_0__.tzLabel)(businessTz, slotUtc)]
        })]
      }) : (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("p", {
        class: "ap-sum-empty",
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.datetime_sub
      })]
    }), price && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("div", {
      class: "ap-sum-sec",
      children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)("div", {
        class: "ap-sum-total",
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("span", {
          children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.summary_total
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("span", {
          class: "v",
          children: price
        })]
      })
    })]
  });
}

/***/ },

/***/ "./assets/src/form/components/feedback.jsx"
/*!*************************************************!*\
  !*** ./assets/src/form/components/feedback.jsx ***!
  \*************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Banner: () => (/* binding */ Banner),
/* harmony export */   Toast: () => (/* binding */ Toast)
/* harmony export */ });
/* harmony import */ var _icons_jsx__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./icons.jsx */ "./assets/src/form/components/icons.jsx");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
/** @jsxImportSource preact */
/**
 * Feedback surfaces: the inverse toast (409 slot-taken) and the warn/err/info
 * banners (429/425/503/network/guard). Both expose a stable error CODE to the
 * client via the caller, but only public-safe copy to the visitor (SPEC-P0 §8.2).
 * Toast and banners carry `role="status"` + `aria-live` so AT announces them
 * (REVIEW §2 #17).
 */


function Toast({
  title,
  body
}) {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
    class: "ap-toast",
    role: "status",
    "aria-live": "polite",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_0__.IconAlert, {}), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("span", {
      class: "toast-copy",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("b", {
        children: title
      }), body ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("span", {
        children: body
      }) : null]
    })]
  });
}
const BANNER_ICON = {
  warn: _icons_jsx__WEBPACK_IMPORTED_MODULE_0__.IconAlert,
  err: _icons_jsx__WEBPACK_IMPORTED_MODULE_0__.IconAlert,
  info: _icons_jsx__WEBPACK_IMPORTED_MODULE_0__.IconInfo,
  clock: _icons_jsx__WEBPACK_IMPORTED_MODULE_0__.IconClock,
  success: _icons_jsx__WEBPACK_IMPORTED_MODULE_0__.IconCheck
};
function Banner({
  variant = 'info',
  title,
  body,
  children
}) {
  const Icon = BANNER_ICON[variant] || _icons_jsx__WEBPACK_IMPORTED_MODULE_0__.IconInfo;
  const cssVariant = variant === 'clock' || variant === 'success' ? 'info' : variant;
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
    class: 'ap-banner ' + cssVariant,
    role: "status",
    "aria-live": "polite",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(Icon, {}), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
      children: [title ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("b", {
        children: title
      }) : null, title && (body || children) ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("br", {}) : null, body ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("span", {
        class: "mut",
        children: body
      }) : null, children]
    })]
  });
}

/***/ },

/***/ "./assets/src/form/components/icons.jsx"
/*!**********************************************!*\
  !*** ./assets/src/form/components/icons.jsx ***!
  \**********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   IconAlert: () => (/* binding */ IconAlert),
/* harmony export */   IconCalendar: () => (/* binding */ IconCalendar),
/* harmony export */   IconCheck: () => (/* binding */ IconCheck),
/* harmony export */   IconChevronLeft: () => (/* binding */ IconChevronLeft),
/* harmony export */   IconChevronRight: () => (/* binding */ IconChevronRight),
/* harmony export */   IconClock: () => (/* binding */ IconClock),
/* harmony export */   IconDownload: () => (/* binding */ IconDownload),
/* harmony export */   IconInfo: () => (/* binding */ IconInfo),
/* harmony export */   IconPrinter: () => (/* binding */ IconPrinter),
/* harmony export */   IconSearch: () => (/* binding */ IconSearch)
/* harmony export */ });
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");

/** @jsxImportSource preact */
/**
 * Inline SVG icon set. Kept tiny and stroke-based so icons inherit `currentColor`
 * and stay crisp at the widget's small control sizes. No external icon font.
 */

function Svg({
  children,
  viewBox = '0 0 24 24',
  ...rest
}) {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("svg", {
    viewBox: viewBox,
    "aria-hidden": "true",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "1.7",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    ...rest,
    children: children
  });
}
function IconSearch(props) {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(Svg, {
    ...props,
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("circle", {
      cx: "11",
      cy: "11",
      r: "7"
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("path", {
      d: "M20 20l-4-4"
    })]
  });
}
function IconChevronRight(props) {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Svg, {
    ...props,
    children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("path", {
      d: "M9 6l6 6-6 6"
    })
  });
}
function IconChevronLeft(props) {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Svg, {
    ...props,
    children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("path", {
      d: "M15 18l-6-6 6-6"
    })
  });
}
function IconCheck(props) {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Svg, {
    ...props,
    children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("path", {
      d: "M5 12l5 5L20 6"
    })
  });
}
function IconAlert(props) {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(Svg, {
    ...props,
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("path", {
      d: "M12 3l9 16H3z"
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("path", {
      d: "M12 10v4M12 17h.01"
    })]
  });
}
function IconInfo(props) {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(Svg, {
    ...props,
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("circle", {
      cx: "12",
      cy: "12",
      r: "9"
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("path", {
      d: "M12 8h.01M11 12h1v4h1"
    })]
  });
}
function IconClock(props) {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(Svg, {
    ...props,
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("circle", {
      cx: "12",
      cy: "12",
      r: "9"
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("path", {
      d: "M12 7v5l3 2"
    })]
  });
}
function IconCalendar(props) {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(Svg, {
    ...props,
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("rect", {
      x: "3",
      y: "4",
      width: "18",
      height: "17",
      rx: "2"
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("path", {
      d: "M3 9h18M8 3v4M16 3v4"
    })]
  });
}
function IconDownload(props) {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(Svg, {
    ...props,
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("path", {
      d: "M12 3v12M7 10l5 5 5-5"
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("path", {
      d: "M4 21h16"
    })]
  });
}
function IconPrinter(props) {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(Svg, {
    ...props,
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("path", {
      d: "M6 9V3h12v6"
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("path", {
      d: "M6 18H4v-6h16v6h-2"
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("rect", {
      x: "8",
      y: "15",
      width: "8",
      height: "6"
    })]
  });
}

/***/ },

/***/ "./assets/src/form/lib/api.js"
/*!************************************!*\
  !*** ./assets/src/form/lib/api.js ***!
  \************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   appendQuery: () => (/* binding */ appendQuery),
/* harmony export */   createApi: () => (/* binding */ createApi)
/* harmony export */ });
/* harmony import */ var _errors_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./errors.js */ "./assets/src/form/lib/errors.js");
/**
 * REST client for the public booking allow-list (rest-contract §3).
 *
 * Only the three endpoints the widget needs are exposed: services, availability
 * and the single-booking POST. Failures are normalized to {@link ApiError} so the
 * flow can classify them without touching transport details. Public endpoints are
 * open (no nonce required); a nonce is sent when present so logged-in editor
 * previews reuse the cookie session cleanly.
 */



/**
 * Build a query string (no leading separator) from a params object, skipping null/undefined.
 * @param {Object} params Query params.
 * @return {string} `a=b&c=d`, or '' when nothing to encode.
 */
function qs(params) {
  const parts = [];
  Object.keys(params || {}).forEach(k => {
    const v = params[k];
    if (v !== null && v !== undefined && v !== '') {
      parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    }
  });
  return parts.join('&');
}

/**
 * Append a query string to a URL with the CORRECT separator. Plain-permalink REST
 * bases already carry a `?` (`index.php?rest_route=/aponto/v1`), so a naive `?`
 * join produced a second `?` and a 404 (finding U4-04). Choose `&` when the URL
 * already contains a `?`, `?` otherwise.
 *
 * @param {string} url    Full URL (may already contain a query string).
 * @param {Object} params Query params.
 * @return {string} URL with the params appended.
 */
function appendQuery(url, params) {
  const query = qs(params);
  if (!query) {
    return url;
  }
  return url + (url.indexOf('?') === -1 ? '?' : '&') + query;
}

/**
 * Turn a fetch Response into an ApiError, reading the stable error body and the
 * Retry-After header (429).
 *
 * @param {Response} response Fetch response.
 * @return {Promise<ApiError>} The error.
 */
async function toApiError(response) {
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  const data = body && body.data ? body.data : {};
  let retryAfter = null;
  const header = response.headers.get('Retry-After');
  if (header !== null && header !== '' && !isNaN(Number(header))) {
    retryAfter = Number(header);
  } else if (data && data.retry_after !== null && data.retry_after !== undefined) {
    retryAfter = Number(data.retry_after);
  }
  return new _errors_js__WEBPACK_IMPORTED_MODULE_0__.ApiError({
    code: body && body.code ? body.code : '',
    status: response.status,
    message: body && body.message ? body.message : '',
    fields: data && data.fields ? data.fields : null,
    data,
    retryAfter
  });
}

/**
 * Create a bound API client.
 *
 * @param {Object} config Widget config with `restUrl` (base to `aponto/v1`) and optional `nonce`.
 * @return {Object} Client with `getServices`, `getAvailability`, `createBooking`.
 */
function createApi(config) {
  const base = String(config.restUrl || '').replace(/\/+$/, '');
  const nonce = config.nonce || '';
  function headers(extra) {
    const h = Object.assign({
      Accept: 'application/json'
    }, extra || {});
    if (nonce) {
      h['X-WP-Nonce'] = nonce;
    }
    return h;
  }
  async function request(path, options, query) {
    // Build the query against the FULL url (base may already carry `?` under plain
    // permalinks), so the separator is chosen correctly (U4-04).
    const url = appendQuery(base + path, query);
    let response;
    try {
      response = await fetch(url, options);
    } catch {
      throw new _errors_js__WEBPACK_IMPORTED_MODULE_0__.ApiError({
        code: 'aponto_network',
        status: 0,
        message: 'network'
      });
    }
    if (!response.ok) {
      throw await toApiError(response);
    }
    try {
      return await response.json();
    } catch {
      throw new _errors_js__WEBPACK_IMPORTED_MODULE_0__.ApiError({
        code: 'aponto_network',
        status: response.status,
        message: 'bad-json'
      });
    }
  }
  return {
    /**
     * GET /public/services.
     *
     * @return {Promise<{items:Array, categories:Array}>} Catalogue.
     */
    getServices() {
      return request('/public/services', {
        method: 'GET',
        headers: headers(),
        credentials: 'same-origin'
      });
    },
    /**
     * GET /public/availability.
     *
     * @param {Object} params `{service_id, staff_id?, from_date, to_date, tz}`.
     * @return {Promise<{slots:Array, service:Object}>} Availability.
     */
    getAvailability(params) {
      return request('/public/availability', {
        method: 'GET',
        headers: headers(),
        credentials: 'same-origin'
      }, params);
    },
    /**
     * POST /public/bookings.
     *
     * @param {Object} body           Booking body.
     * @param {string} idempotencyKey Canonical UUID for `X-Aponto-Idempotency`.
     * @return {Promise<Object>} Booking response (original or replay).
     */
    createBooking(body, idempotencyKey) {
      return request('/public/bookings', {
        method: 'POST',
        headers: headers({
          'Content-Type': 'application/json',
          'X-Aponto-Idempotency': idempotencyKey
        }),
        credentials: 'same-origin',
        body: JSON.stringify(body)
      });
    },
    /**
     * POST /public/payments/{gateway}/confirm (rest-contract §3.8).
     *
     * The widget reports a REFERENCE, never an outcome: the server asks the
     * gateway what really happened and answers with state only — no PII, no
     * links, no amount (D-R38d). Safe to call more than once for the same
     * reference.
     *
     * @param {string} gateway Payment module code.
     * @param {string} ref     Gateway payment reference.
     * @return {Promise<{order_code:string, payment_status:string, booking_status:string, expires_at:?string}>} State.
     */
    confirmPayment(gateway, ref) {
      return request('/public/payments/' + gateway + '/confirm', {
        method: 'POST',
        headers: headers({
          'Content-Type': 'application/json'
        }),
        credentials: 'same-origin',
        body: JSON.stringify({
          ref
        })
      });
    },
    /**
     * POST /public/bookings/{token}/pay (rest-contract §3.10).
     *
     * Resumes an unpaid hold from a link rather than from this tab's storage: the same
     * `payment` block the booking POST returns, plus the display fields needed to draw a
     * summary for a booking this page never had a catalogue for. Creates nothing.
     *
     * @param {string} token Raw manage token.
     * @return {Promise<Object>} Resume payload.
     */
    resumePayment(token) {
      return request('/public/bookings/' + token + '/pay', {
        method: 'POST',
        headers: headers({
          'Content-Type': 'application/json'
        }),
        credentials: 'same-origin',
        body: JSON.stringify({})
      });
    },
    /**
     * POST /public/bookings/{token}/cancel (rest-contract §3.6).
     *
     * Used by the widget to release an unpaid HOLD the moment the visitor
     * walks away from it (D-R38k): the customer never committed anything, so
     * the slot goes back immediately instead of waiting for the expiry cron.
     *
     * @param {string} token Raw manage token.
     * @return {Promise<Object>} Cancellation result.
     */
    cancelBooking(token) {
      return request('/public/bookings/' + token + '/cancel', {
        method: 'POST',
        headers: headers({
          'Content-Type': 'application/json'
        }),
        credentials: 'same-origin',
        body: JSON.stringify({})
      });
    }
  };
}

/***/ },

/***/ "./assets/src/form/lib/appearance.js"
/*!*******************************************!*\
  !*** ./assets/src/form/lib/appearance.js ***!
  \*******************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   COLOR_SCHEMES: () => (/* binding */ COLOR_SCHEMES),
/* harmony export */   contrastRatio: () => (/* binding */ contrastRatio),
/* harmony export */   deriveOnAccent: () => (/* binding */ deriveOnAccent),
/* harmony export */   hexToRgb: () => (/* binding */ hexToRgb),
/* harmony export */   relativeLuminance: () => (/* binding */ relativeLuminance),
/* harmony export */   resolveAppearanceVars: () => (/* binding */ resolveAppearanceVars),
/* harmony export */   resolveColorScheme: () => (/* binding */ resolveColorScheme),
/* harmony export */   sanitizeColorScheme: () => (/* binding */ sanitizeColorScheme),
/* harmony export */   sanitizeRadius: () => (/* binding */ sanitizeRadius)
/* harmony export */ });
/**
 * Appearance resolution — SPEC-P1 Q11 (2026-07-18).
 *
 * Block attributes (`accent`, `radius`) arrive through `data-props` and are
 * mapped to the three public shadow-root CSS variables: `--ap-color-accent`,
 * `--ap-color-on-accent` (auto-derived for AA contrast), and
 * `--ap-radius-control`. Every other token derives from these inside the shadow
 * stylesheet, so the widget stays self-contained and never depends on the
 * dashboard-kit token sheet.
 *
 * `colorScheme` is the fourth (additive) appearance attribute. It is NOT a CSS
 * variable — it becomes the `data-ap-color-scheme` attribute on the host element,
 * which selects the shadow stylesheet's opt-in dark token preset. The public
 * `--ap-*` custom-property API is unchanged.
 *
 * Pure module: no Preact, no DOM. Unit-testable.
 */

/**
 * Parse a `#rgb`/`#rrggbb` hex string to `[r,g,b]` (0-255), or null if invalid.
 *
 * @param {string} hex Hex color.
 * @return {?number[]} RGB triplet or null.
 */
function hexToRgb(hex) {
  if (typeof hex !== 'string') {
    return null;
  }
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    return null;
  }
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/**
 * sRGB channel → linear.
 * @param {number} c Channel value 0-255.
 */
function linearize(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/**
 * WCAG relative luminance of an `[r,g,b]` color.
 *
 * @param {number[]} rgb RGB triplet.
 * @return {number} Luminance 0..1.
 */
function relativeLuminance(rgb) {
  return 0.2126 * linearize(rgb[0]) + 0.7152 * linearize(rgb[1]) + 0.0722 * linearize(rgb[2]);
}

/**
 * WCAG contrast ratio between two `[r,g,b]` colors (1..21).
 *
 * @param {number[]} a First color.
 * @param {number[]} b Second color.
 * @return {number} Contrast ratio.
 */
function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}
const ON_LIGHT = '#ffffff';
const ON_DARK = '#1a1e25';

/**
 * The consent checkbox's checked glyph, stroked in `color`.
 *
 * The shadow stylesheet ships this same path as `--ap-checkbox-check-image` with
 * `stroke='white'`, which is right for the near-black-to-mid accents but goes
 * invisible on a light one (`#ffe600` and friends). A data URI is its own
 * document: it cannot read `currentColor` or `var(--ap-color-on-accent)`, so the
 * only way to follow the derived foreground is to re-emit the whole URL with the
 * colour baked in — the same restatement the dark preset already does for the
 * select chevron.
 *
 * @param {string} color Stroke colour (a validated hex — `#` is percent-encoded).
 * @return {string} A CSS `url()` value.
 */
function checkboxCheckImage(color) {
  const stroke = color.replace('#', '%23');
  return "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='m3.5 8.1 2.7 2.7 6.3-6.3' fill='none' stroke='" + stroke + "' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";
}

/**
 * Choose a readable foreground for text/icons placed on the accent color,
 * picking whichever of white / near-black has the higher contrast. This keeps
 * the primary button legible at any accent, including fully custom colors
 * (SPEC-P1 §2.2 auto-contrast).
 *
 * @param {string} accentHex Accent hex.
 * @return {string} `#ffffff` or a near-black hex.
 */
function deriveOnAccent(accentHex) {
  const rgb = hexToRgb(accentHex);
  if (!rgb) {
    return ON_LIGHT;
  }
  const white = hexToRgb(ON_LIGHT);
  const dark = hexToRgb(ON_DARK);
  return contrastRatio(rgb, white) >= contrastRatio(rgb, dark) ? ON_LIGHT : ON_DARK;
}

/**
 * Sanitize a radius value to a safe CSS length, defaulting to `4px`. Accepts a
 * bare number (interpreted as px) or a `<number><unit>` with an allow-listed
 * unit — never arbitrary CSS, so nothing hostile can be injected through the
 * block attribute.
 *
 * @param {string|number} value Raw radius.
 * @return {string} CSS length.
 */
function sanitizeRadius(value) {
  if (typeof value === 'number' && isFinite(value)) {
    return Math.max(0, value) + 'px';
  }
  if (typeof value !== 'string') {
    return '4px';
  }
  const v = value.trim();
  if (/^\d+(\.\d+)?$/.test(v)) {
    return v + 'px';
  }
  if (/^\d+(\.\d+)?(px|rem|em|%)$/.test(v)) {
    return v;
  }
  return '4px';
}

/**
 * Supported color schemes. There is deliberately NO `auto`/`system` value: the
 * block is the single source of truth for the public form's skin (founder ruling
 * 2026-08-01), so nothing here can resolve to "follow the OS".
 */
const COLOR_SCHEMES = ['light', 'dark'];

/**
 * Sanitize the `colorScheme` appearance attribute to the supported allow-list.
 *
 * Light-first by design: the v4 reference pins `html{color-scheme:light}` and
 * scopes its dark tokens to an explicit stage. An unset or unknown value —
 * including legacy `auto`/`system` strings — resolves to `light`.
 *
 * @param {*} value Raw attribute value.
 * @return {string} `light` | `dark`.
 */
function sanitizeColorScheme(value) {
  if (typeof value !== 'string') {
    return 'light';
  }
  const v = value.trim().toLowerCase();
  return COLOR_SCHEMES.includes(v) ? v : 'light';
}

/**
 * Resolve the `data-ap-color-scheme` host attribute from the appearance object.
 *
 * @param {Object} appearance `{colorScheme?}` from data-props.
 * @return {string} `light` | `dark`.
 */
function resolveColorScheme(appearance) {
  return sanitizeColorScheme((appearance || {}).colorScheme);
}

/**
 * Resolve the appearance block attributes into the three overridable public
 * tokens. Returns only the properties that were explicitly supplied (plus the
 * derived on-accent when an accent is given, and the matching checkbox glyph when
 * that foreground is not the sheet's white default), so unset attributes fall back
 * to the shadow stylesheet defaults. `colorScheme` is deliberately NOT part of this
 * map — it is an attribute, not a custom property (see {@link resolveColorScheme}).
 *
 * @param {Object} appearance `{accent?, onAccent?, radius?}` from data-props.
 * @return {Object<string,string>} CSS custom properties to set on the host.
 */
function resolveAppearanceVars(appearance) {
  const out = {};
  const a = appearance || {};
  const accent = hexToRgb(a.accent) ? a.accent.trim() : null;
  if (accent) {
    const onAccent = hexToRgb(a.onAccent) ? a.onAccent.trim() : deriveOnAccent(accent);
    out['--ap-color-accent'] = accent;
    out['--ap-color-on-accent'] = onAccent;

    // Everything painted ON the accent has to follow that foreground, and the
    // consent checkbox's tick is a background image, not text — so it cannot
    // inherit it. Restate the glyph whenever the foreground is anything but
    // the sheet's white default (a light accent derives the near-black), and
    // leave the white-stroke default in place otherwise.
    if (onAccent.toLowerCase() !== ON_LIGHT) {
      out['--ap-checkbox-check-image'] = checkboxCheckImage(onAccent);
    }
  }
  if (a.radius !== undefined && a.radius !== null && a.radius !== '') {
    out['--ap-radius-control'] = sanitizeRadius(a.radius);
  }
  return out;
}

/***/ },

/***/ "./assets/src/form/lib/config.js"
/*!***************************************!*\
  !*** ./assets/src/form/lib/config.js ***!
  \***************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   normalizeCustomFields: () => (/* binding */ normalizeCustomFields),
/* harmony export */   normalizePayments: () => (/* binding */ normalizePayments),
/* harmony export */   parseProps: () => (/* binding */ parseProps),
/* harmony export */   readGlobalConfig: () => (/* binding */ readGlobalConfig),
/* harmony export */   resolveConfig: () => (/* binding */ resolveConfig)
/* harmony export */ });
/**
 * Runtime configuration resolution.
 *
 * The widget needs two kinds of config:
 *  - GLOBAL, shared by every instance on the page: the REST base URL, an optional
 *    nonce, the business timezone (drives the D1 init rule) and the business name.
 *    This is injected once as `window.apontoForm` (by the dev harness in B1, and
 *    by the block's PHP enqueue in B2).
 *  - PER-INSTANCE, from the host element's `data-props`: `serviceId`, `staffId`,
 *    `layout` and the `appearance` block attributes (accent/radius — Q11).
 *
 * Pure-ish module: reads `window` but no DOM mutation. The global read is
 * injected for testability.
 */

const PHONE_MODES = ['off', 'optional', 'required'];

/** Field types the widget can draw with the stylesheet it already ships. */
const CUSTOM_TYPES = ['text', 'textarea', 'select', 'checkbox'];

/** Hard cap on custom fields, mirroring `CustomFieldSchema::MAX_FIELDS`. */
const MAX_CUSTOM = 8;
const SLUG_RE = /^[a-z0-9_]{1,32}$/;

/**
 * Normalize one contributed custom-field definition, or null when unusable.
 *
 * The server validates the same shape before printing it, so this is the second
 * of two gates rather than the only one — but the page-global is page data, and
 * the renderer must never be handed a type it has no control for.
 *
 * @param {*} raw Raw definition.
 * @return {?Object} Definition or null.
 */
function normalizeCustomField(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const slug = typeof raw.slug === 'string' ? raw.slug : '';
  const label = typeof raw.label === 'string' ? raw.label : '';
  const type = typeof raw.type === 'string' ? raw.type : '';
  if (!SLUG_RE.test(slug) || !label || !CUSTOM_TYPES.includes(type)) {
    return null;
  }
  let options = [];
  if (type === 'select') {
    options = (Array.isArray(raw.options) ? raw.options : []).filter(o => o && typeof o === 'object' && typeof o.value === 'string' && o.value !== '' && typeof o.label === 'string' && o.label !== '').map(o => ({
      value: o.value,
      label: o.label
    }));
    if (!options.length) {
      return null;
    }
  }
  const max = parseInt(raw.max_length, 10);
  return {
    slug,
    label,
    type,
    required: !!raw.required,
    options,
    maxLength: Number.isInteger(max) && max > 0 ? max : 0
  };
}

/**
 * Normalize the site's custom booking-form fields (D-R30).
 *
 * @param {*} raw Raw `fields.custom` value.
 * @return {Array<Object>} Usable definitions (possibly empty).
 */
function normalizeCustomFields(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out = [];
  const seen = new Set();
  for (const entry of raw) {
    if (out.length >= MAX_CUSTOM) {
      break;
    }
    const field = normalizeCustomField(entry);
    if (field && !seen.has(field.slug)) {
      seen.add(field.slug);
      out.push(field);
    }
  }
  return out;
}

/** Payment modes the widget knows how to render (rest-contract §3.3). */
const PAYMENT_MODES = ['off', 'optional', 'required'];

/** Hard cap on offered gateways — the server offers a handful, never a list. */
const MAX_GATEWAYS = 6;

/**
 * Normalize the page-global `payments` block (D-R38).
 *
 * The shape mirrors what `BlockRegistrar::payments()` prints: the mode, the hold
 * length the widget quotes back to the visitor, and the OFFERED gateways with
 * only the public client config their own driver published. Everything is
 * re-validated here for the same reason `fields.custom` is: the page-global is
 * page data, and the renderer must never be handed a gateway it cannot draw.
 *
 * `client` is deliberately passed through as opaque strings — core knows nothing
 * about what a publishable key is, and neither does this normalizer.
 *
 * @param {*} raw Raw `payments` value.
 * @return {{mode:string, holdMinutes:number, gateways:Array<Object>}} Normalized block.
 */
function normalizePayments(raw) {
  const p = raw && typeof raw === 'object' ? raw : {};
  const hold = parseInt(p.hold_minutes, 10);
  const gateways = [];
  const seen = new Set();
  (Array.isArray(p.gateways) ? p.gateways : []).forEach(entry => {
    if (gateways.length >= MAX_GATEWAYS || !entry || typeof entry !== 'object') {
      return;
    }
    const code = typeof entry.code === 'string' ? entry.code : '';
    if (!/^[a-z0-9_]{1,64}$/.test(code) || seen.has(code)) {
      return;
    }
    const client = {};
    const rawClient = entry.client && typeof entry.client === 'object' ? entry.client : {};
    Object.keys(rawClient).forEach(key => {
      const value = rawClient[key];
      if (typeof value === 'string' || typeof value === 'number') {
        client[key] = String(value);
      }
    });
    seen.add(code);
    gateways.push({
      code,
      label: typeof entry.label === 'string' ? entry.label : '',
      client
    });
  });

  // A mode with nothing to pay with is `off` — the same collapse the server
  // applies (D-R38a(1)), restated here so a malformed payload cannot produce a
  // Payment step with no methods on it.
  const mode = PAYMENT_MODES.includes(p.mode) ? p.mode : 'off';

  // The site currency's ISO exponent, as the SERVER computed it. `null` when the
  // payload predates it, which every consumer treats as "fall back to Intl".
  const exponent = parseInt(p.currency_exponent, 10);
  return {
    mode: gateways.length ? mode : 'off',
    holdMinutes: Number.isInteger(hold) && hold > 0 ? hold : 30,
    currencyExponent: Number.isInteger(exponent) && exponent >= 0 && exponent <= 4 ? exponent : null,
    gateways
  };
}

/**
 * Read the page-global config object defensively.
 * @param {Window} [win] Window (injected for testability).
 */
function readGlobalConfig(win) {
  const w = win || (typeof window !== 'undefined' ? window : {});
  const g = w.apontoForm && typeof w.apontoForm === 'object' ? w.apontoForm : {};
  const business = g.business && typeof g.business === 'object' ? g.business : {};
  const fields = g.fields && typeof g.fields === 'object' ? g.fields : {};
  const consent = fields.consent && typeof fields.consent === 'object' ? fields.consent : {};
  return {
    restUrl: String(g.restUrl || ''),
    nonce: g.nonce ? String(g.nonce) : '',
    locale: g.locale ? String(g.locale) : 'en-US',
    business: {
      timezone: business.timezone ? String(business.timezone) : 'UTC',
      name: business.name ? String(business.name) : ''
    },
    fields: {
      phone: PHONE_MODES.includes(fields.phone) ? fields.phone : 'optional',
      consent: {
        enabled: !!consent.enabled,
        text: consent.text ? String(consent.text) : ''
      },
      // Unknown keys are dropped by this normalizer by design, so a new
      // payload key must be whitelisted here to exist at all (D-R30).
      custom: normalizeCustomFields(fields.custom)
    },
    // Always present, always safe to read: a site that takes no online payment
    // resolves to `{mode:'off', gateways:[]}` and every payment branch below is
    // dead code at runtime (D-R38).
    payments: normalizePayments(g.payments)
  };
}

/**
 * Parse a host element's `data-props` JSON safely.
 *
 * @param {string} raw The raw attribute value.
 * @return {Object} Parsed props (empty object on failure).
 */
function parseProps(raw) {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Normalize a value to a positive integer id or null.
 *
 * @param {*} value Value.
 * @return {?number} Positive int or null.
 */
function toId(value) {
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Merge global config with per-instance props into a single resolved config.
 *
 * @param {Object} global Global config from {@link readGlobalConfig}.
 * @param {Object} props  Parsed data-props.
 * @return {Object} Resolved config.
 */
function resolveConfig(global, props) {
  const p = props || {};
  return Object.assign({}, global, {
    serviceId: toId(p.serviceId),
    staffId: toId(p.staffId),
    layout: p.layout ? String(p.layout) : 'default',
    appearance: p.appearance && typeof p.appearance === 'object' ? p.appearance : {}
  });
}

/***/ },

/***/ "./assets/src/form/lib/copy.js"
/*!*************************************!*\
  !*** ./assets/src/form/lib/copy.js ***!
  \*************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   COPY: () => (/* binding */ COPY),
/* harmony export */   paymentFailureCopy: () => (/* binding */ paymentFailureCopy),
/* harmony export */   sprintf: () => (/* binding */ sprintf)
/* harmony export */ });
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__);
/**
 * UI copy for the booking widget.
 *
 * Each string is wrapped with `@wordpress/i18n` `__()` (P1b i18n, SPEC-P1 §5) so
 * it is extracted by `wp i18n make-pot` and swapped for the active locale when
 * the bundle's script translations load. English / USD mirror the v4 mockup's
 * `states.html` copy exactly where it enumerates a state. No PII and no server
 * internals ever reach these strings — visitor-safe only.
 */

const COPY = {
  // Step headings + subs.
  service_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Choose a service', 'aponto'),
  // Three subs because the step's controls are data-driven: the sub must never
  // promise a category browser or a search field that this catalogue does not
  // render (mockup `index.html` category catalogue vs. its no-category fallback).
  service_sub: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Browse a category or search by name.', 'aponto'),
  service_sub_search: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Search or browse all available services.', 'aponto'),
  service_sub_plain: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Pick the service you’d like to book.', 'aponto'),
  datetime_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Pick a date & time', 'aponto'),
  datetime_sub: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Choose an available appointment.', 'aponto'),
  details_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Your details', 'aponto'),
  details_sub: '',
  payment_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Payment method', 'aponto'),
  payment_sub: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Choose how you would like to pay.', 'aponto'),
  // Progress.
  /* translators: 1: current step, 2: total steps. */
  step_of: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Step %1$d of %2$d', 'aponto'),
  // Service step.
  search_placeholder: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Search all services…', 'aponto'),
  all_services: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('All services', 'aponto'),
  all_categories: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('All categories', 'aponto'),
  /* translators: %s: formatted starting price, e.g. "$40". */
  from_price: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('from %s', 'aponto'),
  /* translators: %d: number of services in a category. */
  services_count: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('%d services', 'aponto'),
  service_count_one: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('1 service', 'aponto'),
  no_services: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('No services are available for online booking right now.', 'aponto'),
  no_services_sub: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Please check back soon or contact us.', 'aponto'),
  /* translators: %s: the text the visitor typed into the service search. */
  no_matches: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('No services match “%s”.', 'aponto'),
  change_service: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Change service', 'aponto'),
  // Date & time.
  prev_month: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Previous month', 'aponto'),
  next_month: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Next month', 'aponto'),
  available_times: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Available times', 'aponto'),
  /* translators: 1: day label e.g. "Aug 3", 2: number of open start times. */
  slots_day_count: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('%1$s · %2$d open', 'aponto'),
  /* translators: %s: the selected day, e.g. "Monday, 3 August". */
  no_slots_day: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('No open times on %s — try another day.', 'aponto'),
  times_shown_in: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Times shown in', 'aponto'),
  visitor_tz_label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Your timezone', 'aponto'),
  // %2$s is already a "City (GMT±N)" label, so it carries its own parentheses —
  // join with a middot like the Summary's studio line instead of wrapping it in
  // a second set of parens ("…studio (Berlin (GMT+2))").
  /* translators: 1: time at the business, 2: the business time-zone label. */
  business_time_line: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('That’s %1$s at the studio · %2$s', 'aponto'),
  refreshed: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('(refreshed)', 'aponto'),
  // Details.
  name_label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Full name', 'aponto'),
  name_placeholder: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Jordan Reyes', 'aponto'),
  email_label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Email', 'aponto'),
  email_placeholder: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('you@example.com', 'aponto'),
  phone_label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Phone', 'aponto'),
  phone_optional: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('(optional)', 'aponto'),
  phone_placeholder: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('(555) 123-4567', 'aponto'),
  note_label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Notes for the business', 'aponto'),
  note_optional: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('(optional)', 'aponto'),
  note_placeholder: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Anything we should know?', 'aponto'),
  consent_default: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('I agree to the booking terms and privacy policy.', 'aponto'),
  select_placeholder: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Choose…', 'aponto'),
  // Buttons.
  back: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Back', 'aponto'),
  continue: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Continue', 'aponto'),
  book: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Book appointment', 'aponto'),
  saving: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Saving…', 'aponto'),
  try_again: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Try again', 'aponto'),
  // Validation.
  err_name_required: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Please enter your name.', 'aponto'),
  err_email_required: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Please enter your email.', 'aponto'),
  err_email_invalid: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('That email doesn’t look right.', 'aponto'),
  err_phone_required: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Please enter a phone number.', 'aponto'),
  err_consent_required: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Please accept the booking terms to continue.', 'aponto'),
  err_field_required: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('This field is required.', 'aponto'),
  /* translators: %d: maximum number of characters allowed in the answer. */
  err_field_too_long: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Please keep this under %d characters.', 'aponto'),
  err_pick_time: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Please pick a time.', 'aponto'),
  validation_general_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('We couldn’t submit your booking.', 'aponto'),
  // Shown when the server rejects a field this page never rendered — the booking
  // form was open while the business changed which details it collects.
  stale_form_hint: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('This form is out of date — please refresh the page and book again.', 'aponto'),
  validation_general_body: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Something in the form needs attention. Please review your details and try again.', 'aponto'),
  // Payment step (D-R38). Every amount below is the ORDER total the server will
  // charge; the widget only formats what it already shows in the summary.
  pay_onsite_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Pay on-site', 'aponto'),
  pay_onsite_sub: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Settle at your appointment', 'aponto'),
  // The panel heading NAMES the gateway ("Card details" / "PayPal"), so it
  // lives with the rest of that gateway's copy in `lib/payments.js`; only the
  // half that is true of every gateway is here.
  pay_secure: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Secure', 'aponto'),
  pay_loading: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Loading secure payment…', 'aponto'),
  /* translators: %s: formatted order total, e.g. "$55.00". */
  pay_note_now: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('You will be charged %s now.', 'aponto'),
  /* translators: %s: formatted order total, e.g. "$55.00". */
  pay_note_onsite: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('No payment needed now — the full %s is due at your appointment.', 'aponto'),
  /* translators: %s: formatted order total, e.g. "$55.00". */
  pay_cta: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Pay %s & book', 'aponto'),
  // The footer has no button for a gateway that owns the CTA (PayPal), so the
  // step says where the button actually is.
  pay_cta_gateway: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Use the payment buttons above to finish your booking.', 'aponto'),
  // Said in the SAME place, while that gateway has an attempt in flight: Back
  // and the method cards are disabled for as long as it lasts (D-R40), and a
  // control that greys out without a reason reads as a broken page.
  pay_cta_gateway_busy: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Finish or close the payment window to continue.', 'aponto'),
  pay_busy: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Processing…', 'aponto'),
  /* translators: %s: formatted order total, e.g. "$55.00". */
  pay_cta_resume: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Pay %s & finish booking', 'aponto'),
  /* translators: %s: local time the held slot is released, e.g. "3:45 PM". */
  pay_held_until: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Your slot is held until %s.', 'aponto'),
  // Resume link that no longer leads anywhere payable.
  resume_paid_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('This booking is already paid', 'aponto'),
  resume_paid_lead: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Nothing more to do — check your email for the link to manage this booking.', 'aponto'),
  // SAYS WHAT IS CERTAIN, NOT WHAT IS LIKELY (QA run 2 FINDING-4). "The slot
  // was released" was a claim about a slot this screen does not own: the
  // release belongs to the resume route and, for holds it cannot take, to
  // `aponto_payments_tick` — which on a quiet site is minutes away. The
  // payment WINDOW is the part that has certainly closed, and the release is
  // stated as under way, which is true in both cases.
  resume_gone_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Your payment window has closed', 'aponto'),
  resume_gone_lead: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('The payment did not arrive in time, so the slot is being released. You can book again below.', 'aponto'),
  resume_book_again: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Book again', 'aponto'),
  // …and the resume refusal that is NOT terminal: the order is locked by
  // another writer for the moment, so the slot is still held and the only
  // correct advice is to try the same link again (D-R39c round 2).
  resume_busy_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Payment is busy right now', 'aponto'),
  resume_busy_lead: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Your slot is still held. Something else is finishing on this booking — try again in a moment.', 'aponto'),
  pay_onsite_instead: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Pay on-site instead', 'aponto'),
  // Under the "temporarily unavailable" title (which NAMES the gateway, so it
  // lives in `lib/payments.js`): the one fact the customer needs before they
  // decide whether to retry.
  pay_ui_unavailable_body: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Nothing has been booked or charged yet.', 'aponto'),
  pay_generic_error: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('We couldn’t complete the payment. Please check your details and try again.', 'aponto'),
  pay_begin_failed_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('We couldn’t start the payment.', 'aponto'),
  // `retryable: false` on an `unavailable` block (rest-contract §3.3): the gateway REFUSED this
  // order's amount or currency, so it will refuse it again. Repeating "your slot is held until
  // 3:45 PM" there reads as "try again", which is the one thing that cannot work.
  pay_begin_refused_body: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('This payment method can’t take this amount. Please contact us to complete your booking.', 'aponto'),
  /* translators: %s: local time the held slot is released, e.g. "3:45 PM". */
  pay_hold_until: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Your slot is held until %s.', 'aponto'),
  pay_hold_generic: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Your slot is still held for a short while.', 'aponto'),
  pay_hold_kept_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Your slot is still held', 'aponto'),
  /* translators: %s: local time the held slot is released, e.g. "3:45 PM". */
  pay_hold_kept: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('We couldn’t release it — it stays held until %s, then frees up automatically.', 'aponto'),
  pay_hold_kept_generic: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('We couldn’t release it right away. It frees up automatically.', 'aponto'),
  // The counterpart of `pay_hold_until` for a hold that is already GONE. The
  // "payment not completed" panel would otherwise promise a deadline on a slot
  // somebody else can now book.
  pay_hold_released: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('That time is back on sale. Nothing has been charged.', 'aponto'),
  pay_incomplete_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Payment not completed', 'aponto'),
  pay_incomplete_lead: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Nothing has been charged. You can try again while your slot is held.', 'aponto'),
  // The paid line NAMES the method the customer used ("by card", "with
  // PayPal"), so it lives with the rest of that gateway's copy in
  // `lib/payments.js`. This one is the fallback for a booking whose method the
  // panel does not know — a return leg, or a gateway some future driver adds.
  /* translators: 1: formatted amount paid, 2: order code, e.g. "AP-7Q2F4". */
  pay_paid_line: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Paid %1$s · reference %2$s', 'aponto'),
  // The return leg has no amount to quote: `sessionStorage` carries display
  // facts and references only (F5), and the confirm route answers with state
  // alone. Saying "paid" without inventing a figure is the honest version.
  /* translators: %s: order code, e.g. "AP-7Q2F4". */
  pay_paid_line_plain: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Payment received · reference %s', 'aponto'),
  pay_pending_line: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Payment processing — we’ll email you as soon as it clears.', 'aponto'),
  pay_minimal_lead: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Check your email — we’ve sent a link to manage this booking.', 'aponto'),
  // Decline reasons (rest-contract §3.8, closed vocabulary). One sentence each,
  // written for the person holding the card: what happened, and the one thing
  // they can do about it. The gateway's own text never reaches here — it is
  // written for a merchant reading a dashboard and can quote the cardholder's
  // own data back at them.
  pay_fail_card_declined: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Your card was declined. Try another card, or check with your bank.', 'aponto'),
  pay_fail_insufficient_funds: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('That card doesn’t have enough available funds. Try another card.', 'aponto'),
  pay_fail_expired_card: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('That card has expired. Try another card.', 'aponto'),
  pay_fail_incorrect_cvc: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('That security code didn’t match. Check the code and try again.', 'aponto'),
  pay_fail_processing_error: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('The payment couldn’t be processed just now. Please try again.', 'aponto'),
  pay_fail_authentication_failed: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Your bank couldn’t verify that payment. Try again, or use another card.', 'aponto'),
  // The buyer's chosen funding source was refused while the order itself stays
  // payable. A gateway that can reopen its own funding picker does that instead
  // of showing this (PayPal's `actions.restart()`); this is what a customer sees
  // when it cannot.
  pay_fail_instrument_declined: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('That payment method was declined. Choose another one and try again.', 'aponto'),
  // Deliberately does NOT invite a retry: the amount is what is in doubt, so
  // paying again is the one thing the customer should not do unprompted.
  pay_fail_unverified_amount: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('We couldn’t confirm the amount for this payment. Please contact us before trying again.', 'aponto'),
  // The hold was already gone when the server went to take the money, so it
  // refused to (rest-contract §3.8). Retrying THIS order is the one thing that
  // cannot work — the slot it was for is back on sale — so the copy sends the
  // customer to a new time rather than to a button that will fail again.
  pay_fail_hold_released: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Your slot was released before the payment went through, so we didn’t take it. Nothing has been charged — please pick a new time.', 'aponto'),
  // Summary (sidebar heading + the running total shared with the recap accordion).
  summary_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Your booking', 'aponto'),
  summary_total: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Total', 'aponto'),
  /* translators: label before the same appointment time in the business's own timezone. */
  summary_studio: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Studio', 'aponto'),
  // Errors / banners / toasts.
  toast_slot_taken_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Time no longer available', 'aponto'),
  toast_slot_taken_body: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Availability refreshed. Pick another time.', 'aponto'),
  rate_limited_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Too many attempts.', 'aponto'),
  /* translators: %d: number of seconds to wait before retrying. */
  rate_limited_body: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Please wait %ds and try again.', 'aponto'),
  /* translators: %d: number of seconds to wait before retrying. */
  rate_limited_cta: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Try again in %ds', 'aponto'),
  in_flight_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Your booking is still processing.', 'aponto'),
  in_flight_body: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Keep this page open. We’ll check again automatically.', 'aponto'),
  in_flight_cta: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Checking…', 'aponto'),
  lock_timeout_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('We couldn’t confirm just now.', 'aponto'),
  lock_timeout_body: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('The server was busy. Your booking was not created — retry safely.', 'aponto'),
  guard_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('We couldn’t process this request.', 'aponto'),
  guard_body: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Please refresh and try again, or contact us if it persists.', 'aponto'),
  load_services_err: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('We couldn’t load services.', 'aponto'),
  load_availability_err: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('We couldn’t load available times.', 'aponto'),
  load_retry_sub: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Check your connection and try again.', 'aponto'),
  // Confirmation.
  confirm_pending_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Booking received', 'aponto'),
  confirm_pending_lead: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('We’ll email you the moment it’s confirmed.', 'aponto'),
  confirm_confirmed_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Appointment confirmed', 'aponto'),
  confirm_confirmed_lead: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Your appointment is confirmed.', 'aponto'),
  confirm_manage_hint: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Check your email — we’ve sent a link to manage this booking.', 'aponto'),
  order_label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('ORDER', 'aponto'),
  add_to_calendar: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Add to calendar', 'aponto'),
  cal_google: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Google', 'aponto'),
  cal_ics: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('.ics', 'aponto'),
  print: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Print', 'aponto'),
  book_another: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Book another appointment', 'aponto'),
  replay_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Booking received', 'aponto'),
  replay_lead: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('This appointment is already on file.', 'aponto'),
  replay_body: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Your manage link and calendar file were already emailed to you. Check your inbox to add it to your calendar.', 'aponto')
};

/**
 * The customer-facing sentence for a decline code.
 *
 * The vocabulary is CLOSED at the server boundary (rest-contract §3.8), so an
 * unknown value here means either `other` or a gateway the server folded — both
 * of which get the generic copy rather than a guess.
 *
 * @param {string} code Failure code from `/confirm`.
 * @return {string} A customer-safe sentence.
 */
function paymentFailureCopy(code) {
  const key = 'pay_fail_' + String(code || '').toLowerCase();
  return COPY[key] || COPY.pay_generic_error;
}

/**
 * printf-style substitution supporting `%s`, `%d` and positional `%1$s`.
 *
 * @param {string} template Template.
 * @param {...*}   args     Args.
 * @return {string} Filled string.
 */
function sprintf(template, ...args) {
  let i = 0;
  return String(template).replace(/%(?:(\d+)\$)?[sd]/g, (match, pos) => {
    const idx = pos ? parseInt(pos, 10) - 1 : i++;
    const v = args[idx];
    return v === undefined || v === null ? '' : String(v);
  });
}

/***/ },

/***/ "./assets/src/form/lib/errors.js"
/*!***************************************!*\
  !*** ./assets/src/form/lib/errors.js ***!
  \***************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ApiError: () => (/* binding */ ApiError),
/* harmony export */   classifyError: () => (/* binding */ classifyError)
/* harmony export */ });
/**
 * Error classification — maps the stable REST error codes (rest-contract §5)
 * to a small set of UI intents. Copy lives in `copy.js`; this module only
 * decides the KIND of recovery, so the flow logic and the presentation stay
 * decoupled and testable.
 *
 * Pure module: no Preact, no DOM.
 */

/**
 * A normalized API error thrown by the REST client.
 */
class ApiError extends Error {
  /**
   * @param {Object}  opts              Options.
   * @param {string}  opts.code         Stable error code.
   * @param {number}  opts.status       HTTP status.
   * @param {string}  [opts.message]    Server message (not shown verbatim to visitors).
   * @param {Object}  [opts.fields]     Per-field validation errors.
   * @param {?number} [opts.retryAfter] Retry-After seconds.
   * @param {?Object} [opts.data]       The error body's `data`, for the few codes
   *                                    that carry a machine-readable detail
   *                                    (`aponto_payment_state.payment_status`).
   */
  constructor({
    code,
    status,
    message,
    fields,
    retryAfter,
    data
  }) {
    super(message || code || 'error');
    this.name = 'ApiError';
    this.code = code || '';
    this.status = status || 0;
    this.fields = fields || null;
    this.data = data || null;
    this.retryAfter = retryAfter === null || retryAfter === undefined ? null : retryAfter;
  }
}

/**
 * Classify an error into a UI intent. `kind` values:
 *  - `slot_taken`   409 aponto_slot_taken → back to Date & time, toast, refresh
 *  - `validation`   422 aponto_validation → inline field errors, focus first bad
 *  - `rate_limited` 429 aponto_rate_limited → disabled countdown from Retry-After
 *  - `in_flight`    425 aponto_idempotency_in_flight → keep key, poll/retry
 *  - `lock_timeout` 503 aponto_lock_timeout → auto-retry once, then manual
 *  - `conflict`     409 aponto_idempotency_conflict → rotate key + retry
 *  - `not_found`    404 aponto_not_found → service/slot gone
 *  - `range`        400 aponto_range_too_wide → availability window too wide
 *  - `guard`        aponto_guard_rejected → generic public-safe refusal
 *  - `network`      transport failure / unknown
 *
 * @param {*} error An ApiError or arbitrary throwable.
 * @return {{kind:string, retryAfter:?number, fields:?Object, code:string, status:number}} Intent.
 */
function classifyError(error) {
  const code = error && error.code ? error.code : '';
  const status = error && error.status ? error.status : 0;
  const fields = error && error.fields ? error.fields : null;
  const retryAfter = error && error.retryAfter !== null && error.retryAfter !== undefined ? error.retryAfter : null;
  let kind = 'network';
  switch (code) {
    case 'aponto_slot_taken':
      kind = 'slot_taken';
      break;
    case 'aponto_validation':
      kind = 'validation';
      break;
    case 'aponto_rate_limited':
      kind = 'rate_limited';
      break;
    case 'aponto_idempotency_in_flight':
      kind = 'in_flight';
      break;
    case 'aponto_lock_timeout':
      kind = 'lock_timeout';
      break;
    case 'aponto_idempotency_conflict':
      kind = 'conflict';
      break;
    case 'aponto_not_found':
      kind = 'not_found';
      break;
    case 'aponto_range_too_wide':
      kind = 'range';
      break;
    case 'aponto_guard_rejected':
      kind = 'guard';
      break;
    default:
      // Fall back on HTTP status for un-coded transport-ish failures.
      if (status === 429) {
        kind = 'rate_limited';
      } else if (status === 503) {
        kind = 'lock_timeout';
      } else if (status === 422) {
        kind = 'validation';
      } else {
        kind = 'network';
      }
  }
  return {
    kind,
    retryAfter,
    fields,
    code,
    status
  };
}

/***/ },

/***/ "./assets/src/form/lib/format.js"
/*!***************************************!*\
  !*** ./assets/src/form/lib/format.js ***!
  \***************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   formatDuration: () => (/* binding */ formatDuration),
/* harmony export */   formatMoney: () => (/* binding */ formatMoney)
/* harmony export */ });
/**
 * Money and duration formatting for the booking widget.
 *
 * Prices arrive as integer minor units plus an ISO-4217 currency (rest-contract
 * §3.1). We divide by the currency's own fraction digits (so VND stays whole and
 * USD gets cents) and format with `Intl.NumberFormat`.
 *
 * Pure module: no Preact, no DOM. Unit-testable.
 */

/**
 * Fraction digits for a currency: the SERVER's ISO exponent when it sent one,
 * otherwise `Intl`'s own table with a safe default of 2.
 *
 * The server value wins because the two tables disagree. `Intl` treats MGA as
 * zero-decimal where ISO-4217 (and therefore the stored `price_minor`) treats it
 * as two-decimal, so formatting from `Intl` alone divides by 1 instead of 100 and
 * prints `700` for a price of `7.00`. The exponent that decided how the amount was
 * STORED is the only one that can decide how it is shown.
 *
 * @param {string}  currency   ISO-4217 code.
 * @param {string}  locale     Locale.
 * @param {?number} [exponent] Server exponent (`payments.currency_exponent`).
 * @return {number} Fraction digits.
 */
function fractionDigits(currency, locale, exponent) {
  if (Number.isInteger(exponent) && exponent >= 0 && exponent <= 4) {
    return exponent;
  }
  try {
    return new Intl.NumberFormat(locale || 'en-US', {
      style: 'currency',
      currency
    }).resolvedOptions().maximumFractionDigits;
  } catch {
    return 2;
  }
}

/**
 * Format an amount in minor units as localized currency, e.g. `$55.00`,
 * `150.000 ₫`. Returns an empty string when the price is null/undefined (a
 * service with no configured price).
 *
 * @param {?number} minor      Minor units, or null.
 * @param {string}  currency   ISO-4217 code.
 * @param {string}  [locale]   Locale.
 * @param {?number} [exponent] Server exponent; overrides `Intl`'s digit table.
 * @return {string} Formatted money or ''.
 */
function formatMoney(minor, currency, locale, exponent) {
  if (minor === null || minor === undefined || minor === '') {
    return '';
  }
  const digits = fractionDigits(currency, locale, exponent);
  const major = Number(minor) / Math.pow(10, digits);
  try {
    return new Intl.NumberFormat(locale || 'en-US', {
      style: 'currency',
      currency,
      // Pinned to the SAME exponent the division used. Without this pair
      // `Intl` re-applies its own table on the way out and a currency it
      // disagrees with is wrong twice over.
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(major);
  } catch {
    return String(major) + (currency ? ' ' + currency : '');
  }
}

/**
 * Human duration from minutes, localized via `Intl` units — e.g. `45 min`, `1 hr`,
 * `1 hr 30 min` in English; `45 phút`, `1 giờ` on a Vietnamese site (fleet-r1 Fix 9d;
 * finding U3 BUG-08). Falls back to the English abbreviations on engines without
 * `Intl` unit support.
 *
 * @param {number} minutes  Minutes.
 * @param {string} [locale] Locale.
 * @return {string} Duration label.
 */
function formatDuration(minutes, locale) {
  const m = Math.max(0, parseInt(minutes, 10) || 0);
  const h = Math.floor(m / 60);
  const rem = m % 60;
  const loc = locale || 'en-US';
  try {
    const unit = (value, name) => new Intl.NumberFormat(loc, {
      style: 'unit',
      unit: name,
      unitDisplay: 'short'
    }).format(value);
    if (h === 0) {
      return unit(rem, 'minute');
    }
    if (rem === 0) {
      return unit(h, 'hour');
    }
    return unit(h, 'hour') + ' ' + unit(rem, 'minute');
  } catch {
    if (h === 0) {
      return rem + ' min';
    }
    if (rem === 0) {
      return h + ' hr';
    }
    return h + ' hr ' + rem + ' min';
  }
}

/***/ },

/***/ "./assets/src/form/lib/hold.js"
/*!*************************************!*\
  !*** ./assets/src/form/lib/hold.js ***!
  \*************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   buildReturnUrl: () => (/* binding */ buildReturnUrl),
/* harmony export */   clearHold: () => (/* binding */ clearHold),
/* harmony export */   manageToken: () => (/* binding */ manageToken),
/* harmony export */   readHold: () => (/* binding */ readHold),
/* harmony export */   readResume: () => (/* binding */ readResume),
/* harmony export */   readReturn: () => (/* binding */ readReturn),
/* harmony export */   storeHold: () => (/* binding */ storeHold),
/* harmony export */   stripReturn: () => (/* binding */ stripReturn)
/* harmony export */ });
/**
 * Payment-hold bookkeeping the widget needs BETWEEN two page states (D-R38).
 *
 * A pay-online booking is created before the money moves: the slot is held, the
 * gateway is handed an intent, and only then does the customer authorise. Three
 * things have to survive that gap, and none of them belongs in component state:
 *
 *  1. **The manage token**, so a hold the customer walks away from can be
 *     released immediately instead of waiting for the expiry cron. It is not a
 *     field of its own — the contract deliberately ships a `manage_url` whose
 *     shape depends on the site's permalinks (rest-contract §3.3) — so it is
 *     read back out of that URL, never reconstructed.
 *  2. **A minimal, whitelisted summary of the booking**, because a redirect-based
 *     method would return to a FRESH page with no widget state at all, and the
 *     confirmation panel has to be rendered from something. It goes to
 *     `sessionStorage`, keyed by order code, and is cleared the moment it is used
 *     or invalidated.
 *
 *     NOT the booking response. An earlier cut stored that verbatim, which put
 *     the intent's client secret, the manage URL and the ICS URL — the bearer
 *     capability to view and cancel the booking — into a store any script on the
 *     page can read and any later visitor to that tab inherits. What goes in is
 *     display facts plus references: things that identify the booking to a server
 *     that will re-check them, and nothing that grants anything on its own. The
 *     whitelist is enforced HERE, in {@link storeHold}, rather than only at the
 *     call site — a rule a caller has to remember is a rule that is one careless
 *     `...response` away from being gone, and this one leaks capabilities.
 *  3. **The return parameters**, which are how such a page learns it is a
 *     continuation rather than a first visit.
 *
 * V1 pins Stripe to `allow_redirects: never`, so (2) and (3) are the path a
 * customer should never take — but the code has to exist for the day a method
 * slips through, and a path that only exists in production is a path that has
 * never been run.
 *
 * Pure module: reads/writes `sessionStorage` and `location` through injected
 * objects, no Preact. Every storage access is wrapped: a private-mode Safari
 * throws on `sessionStorage` access itself, and losing the panel is not a reason
 * to lose the booking.
 */

/** Storage key namespace — one entry per order code. */
const PREFIX = 'aponto:payment:';

/** The manage token's exact shape (`PublicBookingsController::lookupActive`). */
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

/** The query params this widget owns and strips from the address bar. */
const RETURN_PARAM_RE = /^aponto_(pay|order|ref|resume)=/;

/**
 * EXACTLY what may be persisted about a hold. Anything else is dropped.
 *
 * Every entry is either a reference the server re-checks (`order_code`,
 * `gateway_ref`) or a display fact the confirmation panel prints. None of it
 * grants access to anything: no manage token or URL, no ICS URL, no client
 * secret, no customer name, email or phone.
 */
const HOLD_KEYS = ['order_code', 'gateway', 'gateway_ref', 'expires_at', 'booking'];

/** Inside `booking`, the same rule again. */
const BOOKING_KEYS = ['status', 'start_utc', 'end_utc', 'service_name', 'staff_name', 'display_tz'];

/**
 * Copy only the listed keys of a plain object.
 *
 * @param {*}                source Candidate object.
 * @param {Array.<string>}   keys   Allowed keys.
 * @return {Object} A new object holding at most those keys.
 */
function pick(source, keys) {
  const out = {};
  if (!source || typeof source !== 'object') {
    return out;
  }
  keys.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      out[key] = source[key];
    }
  });
  return out;
}

/**
 * The raw manage token inside a `manage_url`, or `''` when there is none.
 *
 * Both contract shapes are accepted because both are valid and the client is
 * forbidden from assuming which one a site emits: pretty permalinks give
 * `…/aponto/booking/{token}`, plain permalinks give `…?aponto_manage_token={token}`.
 * The 43-character check is what stops a URL that merely ends in a path segment
 * from being mistaken for a token.
 *
 * @param {*} manageUrl The response's `manage_url`.
 * @return {string} Raw token or ''.
 */
function manageToken(manageUrl) {
  const url = typeof manageUrl === 'string' ? manageUrl : '';
  if (!url) {
    return '';
  }
  const query = url.match(/[?&]aponto_manage_token=([A-Za-z0-9_-]{43})(?:[&#]|$)/);
  if (query) {
    return query[1];
  }
  const path = url.split(/[?#]/)[0].replace(/\/+$/, '');
  const last = path.slice(path.lastIndexOf('/') + 1);
  return TOKEN_RE.test(last) ? last : '';
}

/**
 * Resolve the session storage to use, or null when the browser refuses one.
 *
 * @param {Storage} [storage] Injected storage (tests).
 * @return {?Storage} Storage or null.
 */
function store(storage) {
  if (storage) {
    return storage;
  }
  try {
    return typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

/**
 * Persist the in-flight hold for one order, whitelisted.
 *
 * The payload is REDUCED to {@link HOLD_KEYS} (and `booking` to
 * {@link BOOKING_KEYS}) before it is written, so a caller that hands over a
 * whole booking response stores a safe subset of it rather than the secrets it
 * contains. Enforcing it here means the guarantee holds for every call site,
 * including ones written later by someone who has not read this file.
 *
 * @param {string}  orderCode Order code (`AP-XXXXX`).
 * @param {Object}  payload   Hold summary; unknown keys are dropped.
 * @param {Storage} [storage] Injected storage (tests).
 */
function storeHold(orderCode, payload, storage) {
  const s = store(storage);
  if (!s || !orderCode) {
    return;
  }
  const safe = pick(payload, HOLD_KEYS);
  if ('booking' in safe) {
    safe.booking = pick(safe.booking, BOOKING_KEYS);
  }
  try {
    s.setItem(PREFIX + orderCode, JSON.stringify(safe));
  } catch {
    // Quota or private mode — the confirm leg still works, only the
    // redirect-return panel degrades to its minimal form.
  }
}

/**
 * Read back a persisted hold.
 *
 * @param {string}  orderCode Order code.
 * @param {Storage} [storage] Injected storage (tests).
 * @return {?Object} Payload or null.
 */
function readHold(orderCode, storage) {
  const s = store(storage);
  if (!s || !orderCode) {
    return null;
  }
  try {
    const raw = s.getItem(PREFIX + orderCode);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Drop a persisted hold (used, cancelled or superseded).
 *
 * @param {string}  orderCode Order code.
 * @param {Storage} [storage] Injected storage (tests).
 */
function clearHold(orderCode, storage) {
  const s = store(storage);
  if (!s || !orderCode) {
    return;
  }
  try {
    s.removeItem(PREFIX + orderCode);
  } catch {
    // Nothing to do — the entry expires with the tab either way.
  }
}

/**
 * Parse the gateway return parameters out of a query string.
 *
 * @param {string} search `location.search`.
 * @return {?{status:string, order:string, ref:string}} Params, or null when this
 *   is an ordinary page view.
 */
function readReturn(search) {
  const raw = String(search || '').replace(/^\?/, '');
  if (!raw) {
    return null;
  }
  const params = {};
  raw.split('&').forEach(pair => {
    if (!pair) {
      return;
    }
    const eq = pair.indexOf('=');
    const key = eq < 0 ? pair : pair.slice(0, eq);
    const value = eq < 0 ? '' : pair.slice(eq + 1);
    try {
      params[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '));
    } catch {
      // A malformed escape is not a reason to fail the page.
    }
  });
  const status = params.aponto_pay;
  if (status !== 'success' && status !== 'cancel') {
    return null;
  }
  return {
    status,
    order: params.aponto_order || '',
    ref: params.aponto_ref || ''
  };
}

/**
 * The raw manage token in `#aponto_resume=…` — or, for one release, `?aponto_resume=…`.
 *
 * The token is the SAME one `manage_url` already carries (PR-A.3): it is what the payment reminder
 * links, and it grants nothing the manage link did not. The 43-character shape check is what stops
 * a stray param from being sent to the server as a token.
 *
 * THE FRAGMENT IS THE PRIMARY FORM (D-R39c, Codex A.10). A query string is sent to the server on
 * every request for the page and every subresource on it: it lands in the access log, in whatever
 * the host's analytics reads, and in the `Referer` of same-origin assets — all before the JS that
 * strips it has run. A fragment is never transmitted. Links already in inboxes still carry the query
 * form, so it stays accepted for one release and both are stripped from the address bar.
 *
 * @param {string} search `location.search`.
 * @param {string} [hash] `location.hash`.
 * @return {string} Raw token or ''.
 */
function readResume(search, hash = '') {
  const shape = /(?:^|[&#])aponto_resume=([A-Za-z0-9_-]{43})(?:&|$)/;
  const fragment = String(hash || '').match(shape);
  if (fragment) {
    return fragment[1];
  }
  const raw = String(search || '').replace(/^\?/, '');
  const match = raw.match(shape);
  return match ? match[1] : '';
}

/**
 * The URL a gateway should send the customer back to — this page, plus the three
 * params {@link readReturn} looks for. Any previous set is dropped first so a
 * second attempt cannot inherit the first one's reference.
 *
 * @param {string} href   Current page URL.
 * @param {Object} params `{order, ref}`.
 * @return {string} Return URL.
 */
function buildReturnUrl(href, params) {
  const base = String(href || '').split('#')[0];
  const cut = base.indexOf('?');
  const path = cut < 0 ? base : base.slice(0, cut);
  const kept = (cut < 0 ? '' : base.slice(cut + 1)).split('&').filter(pair => pair && !RETURN_PARAM_RE.test(pair));
  kept.push('aponto_pay=success', 'aponto_order=' + encodeURIComponent((params || {}).order || ''), 'aponto_ref=' + encodeURIComponent((params || {}).ref || ''));
  return path + '?' + kept.join('&');
}

/**
 * Remove the return params from the address bar without a navigation, so a
 * reload does not replay the confirm leg and the customer cannot share a URL
 * carrying their payment reference.
 *
 * @param {Window} [win] Window (injected for tests).
 */
function stripReturn(win) {
  const w = win || (typeof window !== 'undefined' ? window : null);
  if (!w || !w.history || typeof w.history.replaceState !== 'function') {
    return;
  }
  const loc = w.location || {};
  const kept = String(loc.search || '').replace(/^\?/, '').split('&').filter(pair => pair && !RETURN_PARAM_RE.test(pair));
  // The FRAGMENT is cleaned the same way (D-R39c): it never reached the server, but it is still in
  // the address bar for the visitor to copy and in this tab's history entry.
  const fragment = String(loc.hash || '').replace(/^#/, '').split('&').filter(pair => pair && !RETURN_PARAM_RE.test(pair));
  const url = (loc.pathname || '') + (kept.length ? '?' + kept.join('&') : '') + (fragment.length ? '#' + fragment.join('&') : '');
  try {
    w.history.replaceState(w.history.state || null, '', url);
  } catch {
    // Cross-origin or file:// — leaving the params visible is cosmetic.
  }
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
 * `custom_fields` is included only when the draft carries answers, matching the
 * server, so a site collecting none fingerprints exactly as it did before.
 * `payment_method` follows the same rule (D-R38): a site that takes no online
 * payment fingerprints byte-identically to the pre-payment build, and switching
 * between "pay now" and "pay on site" rotates the key — which it must, because
 * that is a different booking request, not a retry of the same one.
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
    name: (c.name || '').trim(),
    email: (c.email || '').trim().toLowerCase(),
    phone: (c.phone || '').trim(),
    note: c.note || '',
    consent: !!d.consent
  };
  if (d.payment_method) {
    canonical.payment_method = d.payment_method;
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

/***/ },

/***/ "./assets/src/form/lib/payment-gateways.free.js"
/*!******************************************************!*\
  !*** ./assets/src/form/lib/payment-gateways.free.js ***!
  \******************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ctaOwners: () => (/* binding */ ctaOwners),
/* harmony export */   factories: () => (/* binding */ factories),
/* harmony export */   gatewaySpecificCopy: () => (/* binding */ gatewaySpecificCopy)
/* harmony export */ });
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _payments_stripe_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./payments/stripe.js */ "./assets/src/form/lib/payments/stripe.js");
/**
 * Booking-form payment gateways owned by the Free edition.
 *
 * This registry is selected at build time. Premium gateways must never be
 * imported here because `assets/src/form/**` is distributed in the wp.org ZIP.
 */



const factories = {
  payments_stripe: _payments_stripe_js__WEBPACK_IMPORTED_MODULE_1__.createStripeAdapter
};
const ctaOwners = [];

/**
 * Visitor-facing copy owned by a Free gateway.
 *
 * @param {Object|string} gateway Gateway entry, or its code.
 * @return {?Object} Gateway copy, or null when this registry does not own it.
 */
function gatewaySpecificCopy(gateway) {
  const code = typeof gateway === 'string' ? gateway : (gateway || {}).code;
  if (code !== 'payments_stripe') {
    return null;
  }
  return {
    title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Credit / debit card', 'aponto'),
    sub: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Secured checkout · Visa, Mastercard, Amex', 'aponto'),
    panel: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Card details', 'aponto'),
    unavailable: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Card payments are temporarily unavailable.', 'aponto'),
    cancelled: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('The payment was cancelled — you can try again.', 'aponto'),
    /* translators: 1: formatted amount paid, 2: order code, e.g. "AP-7Q2F4". */
    paidLine: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Paid %1$s by card · reference %2$s', 'aponto')
  };
}

/***/ },

/***/ "./assets/src/form/lib/payments.js"
/*!*****************************************!*\
  !*** ./assets/src/form/lib/payments.js ***!
  \*****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SHIELD_ID: () => (/* reexport safe */ _payments_host_js__WEBPACK_IMPORTED_MODULE_3__.SHIELD_ID),
/* harmony export */   createGatewayAdapter: () => (/* binding */ createGatewayAdapter),
/* harmony export */   gatewayCancelledCopy: () => (/* binding */ gatewayCancelledCopy),
/* harmony export */   gatewayCopy: () => (/* binding */ gatewayCopy),
/* harmony export */   gatewayOwnsCta: () => (/* binding */ gatewayOwnsCta),
/* harmony export */   gatewayPaidLineCopy: () => (/* binding */ gatewayPaidLineCopy),
/* harmony export */   gatewayUnavailableCopy: () => (/* binding */ gatewayUnavailableCopy),
/* harmony export */   injectShield: () => (/* reexport safe */ _payments_host_js__WEBPACK_IMPORTED_MODULE_3__.injectShield),
/* harmony export */   isRenderable: () => (/* binding */ isRenderable),
/* harmony export */   slotName: () => (/* reexport safe */ _payments_host_js__WEBPACK_IMPORTED_MODULE_3__.slotName)
/* harmony export */ });
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _copy_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./copy.js */ "./assets/src/form/lib/copy.js");
/* harmony import */ var _aponto_payment_gateways__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @aponto/payment-gateways */ "./assets/src/form/lib/payment-gateways.free.js");
/* harmony import */ var _payments_host_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./payments/host.js */ "./assets/src/form/lib/payments/host.js");
/**
 * Gateway seam for the Payment step (D-R38 / D-R39).
 *
 * The widget knows FOUR verbs and nothing about any gateway: `mount()` puts the
 * gateway's own UI on the page, `setVisible()` shows or hides it as the method
 * changes, `submit()` runs whatever sequence that gateway needs to end up with a
 * reference core can confirm, and `destroy()` takes it all down again. Adding a
 * gateway is adding an entry to {@link FACTORIES} and a file under `payments/`;
 * nothing in `app.jsx` learns its name.
 *
 * ### Who presses the button
 *
 * `submit()` assumes the STEP owns the call to action. An adapter may instead
 * declare `ownsCta`, in which case the step hides its primary button and the
 * sequence starts inside the adapter. The widget's half of it arrives as
 * `mount({flow})`: `checkout()` (validate, then the booking POST that mints the
 * hold and the order), `confirm(ref)` (ask the server what really happened) and
 * `settle(out)` (apply one outcome, in the same shape `submit()` resolves with).
 * Same code paths, same funnel, different trigger — and still nothing in
 * `app.jsx` that names a gateway.
 *
 * ### Why the mount node is not part of the Preact tree
 *
 * The spike (`docs/research/spike-payments-inline-results.md`) is normative here:
 * **Stripe refuses to mount inside a ShadowRoot**, and the Payment Element fails
 * SILENTLY when you try — no throw, no `loaderror`, just an element that never
 * becomes ready. The only working shape is the one PayPal's zoid already applies
 * to itself: a holder in the LIGHT DOM, a child of the widget host, projected
 * back into the shadow tree through a `<slot>`. So each adapter creates and owns
 * its holder imperatively, Preact only renders `<slot name="ap-…" />`, and the
 * holder is never re-parented after mount (moving an iframe reloads it).
 *
 * Two consequences the spike measured and this seam encodes: hiding the shadow
 * panel does NOT hide slotted content (visibility is toggled on the holder), and
 * the holder is reachable by the site's theme (see the shield in `payments/host.js`).
 */






/**
 * Adapter factories by payment module code. A gateway the server offers but this
 * bundle has no factory for is simply not rendered — the customer sees the
 * methods that can actually take their money.
 */
/**
 * Build the adapter for one offered gateway, or null when this build cannot
 * render it.
 *
 * `offered` is passed on because at least one gateway's UI depends on what ELSE
 * the checkout takes: PayPal drops its card funding source when Stripe is also
 * offered, so the buyer is not shown two card forms on one step.
 *
 * @param {Object} gateway   `{code, label, client}` from the boot config.
 * @param {Array}  [offered] Every renderable gateway this checkout offers.
 * @return {?Object} Adapter.
 */
function createGatewayAdapter(gateway, offered) {
  const factory = _aponto_payment_gateways__WEBPACK_IMPORTED_MODULE_2__.factories[gateway && gateway.code];
  return factory ? factory(gateway, offered || []) : null;
}

/**
 * Whether this gateway's own control replaces the step's primary button.
 *
 * @param {string} code Payment module code.
 * @return {boolean} True when the gateway owns the CTA.
 */
function gatewayOwnsCta(code) {
  return _aponto_payment_gateways__WEBPACK_IMPORTED_MODULE_2__.ctaOwners.includes(String(code || ''));
}

/**
 * Whether this build can render a gateway at all (drives the method list).
 *
 * @param {Object} gateway Gateway entry.
 * @return {boolean} True when a factory exists.
 */
function isRenderable(gateway) {
  return !!_aponto_payment_gateways__WEBPACK_IMPORTED_MODULE_2__.factories[gateway && gateway.code];
}

/**
 * Visitor-facing copy for one method card and its panel.
 *
 * The widget owns the copy for the gateways it can draw, so a card method reads
 * like a card method rather than like a module code; the server-supplied `label`
 * is the fallback for a gateway some future driver adds.
 *
 * `panel`, `unavailable` and `cancelled` are here rather than in `copy.js` for
 * the same reason the titles are: they NAME the method, and a step that says
 * "Card details" over PayPal's buttons — or tells a PayPal customer that "card
 * payments are temporarily unavailable" — is describing a gateway it is not
 * showing.
 *
 * @param {Object|string} gateway Gateway entry, or its code.
 * @return {{title:string, sub:string, panel:string, unavailable:string, cancelled:string, paidLine:string}} Copy.
 */
function gatewayCopy(gateway) {
  const code = typeof gateway === 'string' ? gateway : (gateway || {}).code;
  const ownedCopy = (0,_aponto_payment_gateways__WEBPACK_IMPORTED_MODULE_2__.gatewaySpecificCopy)(gateway);
  if (ownedCopy) {
    return ownedCopy;
  }
  const label = typeof gateway === 'string' ? '' : (gateway || {}).label;
  return {
    title: label || '',
    sub: '',
    panel: label || '',
    unavailable: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('This payment method is temporarily unavailable.', 'aponto'),
    cancelled: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('The payment was cancelled — you can try again.', 'aponto'),
    paidLine: _copy_js__WEBPACK_IMPORTED_MODULE_1__.COPY.pay_paid_line
  };
}

/**
 * The sentence for a gateway whose UI never became usable.
 *
 * @param {string} code Payment module code.
 * @return {string} Customer-facing sentence.
 */
function gatewayUnavailableCopy(code) {
  return gatewayCopy(code).unavailable;
}

/**
 * The sentence for a gateway the customer closed without paying.
 *
 * @param {string} code Payment module code.
 * @return {string} Customer-facing sentence.
 */
function gatewayCancelledCopy(code) {
  return gatewayCopy(code).cancelled;
}

/**
 * The confirmation line for a booking paid through one gateway.
 *
 * @param {string} code Payment module code.
 * @return {string} A `sprintf` template taking the amount and the order code.
 */
function gatewayPaidLineCopy(code) {
  return gatewayCopy(code).paidLine;
}

/***/ },

/***/ "./assets/src/form/lib/payments/host.js"
/*!**********************************************!*\
  !*** ./assets/src/form/lib/payments/host.js ***!
  \**********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SHIELD_ID: () => (/* binding */ SHIELD_ID),
/* harmony export */   computedFontFamily: () => (/* binding */ computedFontFamily),
/* harmony export */   createHolder: () => (/* binding */ createHolder),
/* harmony export */   injectShield: () => (/* binding */ injectShield),
/* harmony export */   resolveToken: () => (/* binding */ resolveToken),
/* harmony export */   slotName: () => (/* binding */ slotName)
/* harmony export */ });
/**
 * Light-DOM plumbing every gateway adapter shares (spike §"Implementation notes").
 *
 * Separate from `lib/payments.js` so an adapter can reach these helpers without
 * importing the registry that imports the adapter.
 */

/**
 * The `<slot>` name one gateway projects through.
 *
 * The `ap-` prefix is load-bearing: {@link SHIELD_CSS} targets `[slot^="ap-"]`,
 * and zoid-style gateways that rename the slot themselves land under the
 * `shadow-slot-` prefix the same rule covers.
 *
 * @param {string} code Payment module code.
 * @return {string} Slot name.
 */
function slotName(code) {
  return 'ap-' + String(code || '').replace(/^payments_/, '');
}

/** Id of the single light-DOM shield element. */
const SHIELD_ID = 'aponto-payment-shield';

/**
 * The light-DOM shield (spike §"Implementation notes" #4).
 *
 * The gateway's box lives in the LIGHT DOM — that is the whole point of the slot
 * projection — so the site's theme CAN style it, and a hostile
 * `iframe{border:5px solid lime;font-size:30px}` measurably pushed the gateway
 * 10px past the widget's own edge. Scoped as tightly as it can be (only inside a
 * widget host, only on a slotted gateway container) so it neutralises that reach
 * without touching anything else on the page.
 */
const SHIELD_CSS = '[data-aponto-form] > [slot^="ap-"] iframe,' + '[data-aponto-form] > [slot^="shadow-slot-"] iframe' + '{border:0!important;font-size:medium!important;max-width:100%!important}' + '[data-aponto-form] > [slot^="ap-"],' + '[data-aponto-form] > [slot^="shadow-slot-"]' + '{box-sizing:border-box!important;margin:0!important;padding:0!important;width:100%}';

/**
 * Inject the shield once per document, immediately before the first gateway
 * mounts. Idempotent: a second widget, or a second method, reuses the element.
 *
 * @param {Document} doc Document owning the widget host.
 */
function injectShield(doc) {
  const d = doc || (typeof document !== 'undefined' ? document : null);
  if (!d || !d.head || d.getElementById(SHIELD_ID)) {
    return;
  }
  const style = d.createElement('style');
  style.id = SHIELD_ID;
  style.textContent = SHIELD_CSS;
  d.head.appendChild(style);
}

/**
 * Create the light-DOM holder one gateway mounts into, as a direct child of the
 * widget host so the shield's child combinator matches it.
 *
 * @param {HTMLElement} host Widget host (`[data-aponto-form]`).
 * @param {string}      slot Slot name.
 * @return {HTMLElement} The holder.
 */
function createHolder(host, slot) {
  const doc = host.ownerDocument || document;
  injectShield(doc);
  const holder = doc.createElement('div');
  holder.setAttribute('slot', slot);
  host.appendChild(holder);
  return holder;
}

/**
 * Resolve a `--ap-*` token to the value the browser actually computed.
 *
 * `getComputedStyle(el).getPropertyValue('--ap-color-border')` returns the token's
 * DECLARATION, not its value — for this stylesheet that is a literal
 * `color-mix(in srgb, …)` string. Gateways silently ignore a value they cannot
 * parse (measured: Stripe accepts the raw string, stays ready, and applies
 * nothing), so an unresolved token is a theming bug with no error attached to it.
 * Assigning the var to a REAL property on a throwaway probe inside the widget's
 * own scope, then reading that property back, is what forces the computation.
 *
 * @param {HTMLElement} scope Element whose custom-property scope to read (`.ap-wrap`).
 * @param {string}      name  Custom property name, e.g. `--ap-color-accent`.
 * @param {string}      prop  A real property to resolve it through, e.g. `color`.
 * @return {string} Computed value, or '' when it cannot be resolved.
 */
function resolveToken(scope, name, prop) {
  const doc = scope && scope.ownerDocument ? scope.ownerDocument : null;
  const win = doc ? doc.defaultView : null;
  if (!win || typeof win.getComputedStyle !== 'function') {
    return '';
  }
  const probe = doc.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:absolute;left:-9999px;top:0;' + prop + ':var(' + name + ')';
  scope.appendChild(probe);
  let out = '';
  try {
    out = String(win.getComputedStyle(probe).getPropertyValue(prop) || '').trim();
  } catch {
    out = '';
  }
  probe.remove();
  return out;
}

/**
 * The font family the widget itself resolved to.
 *
 * `.ap-wrap` sets `font-family: inherit` on purpose so the widget blends with the
 * theme — which means the gateway has to be TOLD the resulting family, and that a
 * theme changing its font after mount needs an `update({appearance})` rather than
 * fixing itself.
 *
 * @param {HTMLElement} scope `.ap-wrap`.
 * @return {string} Computed font-family, or ''.
 */
function computedFontFamily(scope) {
  const doc = scope && scope.ownerDocument ? scope.ownerDocument : null;
  const win = doc ? doc.defaultView : null;
  if (!win || typeof win.getComputedStyle !== 'function') {
    return '';
  }
  try {
    return String(win.getComputedStyle(scope).getPropertyValue('font-family') || '').trim();
  } catch {
    return '';
  }
}

/***/ },

/***/ "./assets/src/form/lib/payments/stripe.js"
/*!************************************************!*\
  !*** ./assets/src/form/lib/payments/stripe.js ***!
  \************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createStripeAdapter: () => (/* binding */ createStripeAdapter),
/* harmony export */   customerSafeMessage: () => (/* binding */ customerSafeMessage),
/* harmony export */   loadStripeSdk: () => (/* binding */ loadStripeSdk),
/* harmony export */   resolveAppearance: () => (/* binding */ resolveAppearance),
/* harmony export */   toGatewayAmount: () => (/* binding */ toGatewayAmount)
/* harmony export */ });
/* harmony import */ var _host_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./host.js */ "./assets/src/form/lib/payments/host.js");
/**
 * Stripe adapter — Payment Element, DEFERRED intent, slot-projected mount.
 *
 * Every rule below is something the spike measured rather than something the
 * integration guide says (`docs/research/spike-payments-inline-results.md`):
 *
 *  1. **Mount in the light DOM.** `element.mount(nodeInsideShadowRoot)` does not
 *     throw for the Payment Element — it just never becomes ready, forever, with
 *     no `loaderror` and nothing in the console. The holder is therefore a child
 *     of the widget HOST, projected back in through `<slot name="ap-stripe">`.
 *  2. **Time the `ready` event out.** Because that failure is silent, "no error"
 *     is not evidence of success. Twenty seconds, then tear down, tell the
 *     customer, and warn once (no PII) so a site owner has something to grep for.
 *  3. **Resolve the tokens.** Handing Stripe a raw `color-mix(...)` string is
 *     accepted and silently ignored — the element renders un-themed with nothing
 *     to debug. Every value goes through a probe inside `.ap-wrap` first.
 *  4. **Never re-parent the holder.** Moving an iframe in the DOM reloads it, and
 *     a reloaded Payment Element loses whatever the customer had typed. Panels
 *     are hidden by toggling `holder.hidden`, never by moving the node.
 *
 * The amount handed to `elements()` is for DISPLAY and client-side validation
 * only. What the customer is actually charged comes from the order row on the
 * server (D-R38c); this number can be wrong without being dangerous, and the
 * server rejects any disagreement.
 */



/** Stripe.js, from Stripe's CDN. Never bundled, never self-hosted (their terms). */
const SDK_URL = 'https://js.stripe.com/v3/';

/** How long to wait for the Payment Element's `ready` before giving up. */
const READY_TIMEOUT_MS = 20000;

/** Telemetry marker for the silent-hang case. Carries no PII by construction. */
const TIMEOUT_MARKER = 'aponto:payment_ui_timeout';

/** Telemetry marker for an amount this gateway cannot be handed. */
const AMOUNT_MARKER = 'aponto:payment_amount_unsupported';

/**
 * An integer, or null for anything that is not unambiguously one.
 *
 * `Number()` alone is not usable here: it maps `null` and `''` to `0`, which
 * would turn a MISSING exponent into a claim that the currency is zero-decimal —
 * i.e. into a hundredfold error, silently. Absence has to stay absent.
 *
 * @param {*} value Raw value (the boot payload sends exponents as strings).
 * @return {?number} Integer or null.
 */
function intOrNull(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value : null;
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    return parseInt(value.trim(), 10);
  }
  return null;
}

/**
 * An order total in Aponto's minor units → Stripe's own smallest unit.
 *
 * NOT `/100`, and not a formatting detail. Aponto stores ISO-4217 minor units;
 * Stripe takes "the smallest currency unit" as ITS table defines it, and the two
 * tables disagree in both directions — ISK is zero-decimal to ISO and TWO-decimal
 * to Stripe (×100), MGA is two-decimal to ISO and ZERO-decimal to Stripe (÷100).
 * Passing our number through would show the customer one hundredth or one hundred
 * times the price on the Element, i.e. a figure nobody agreed to.
 *
 * The server owns both halves — `payments.currency_exponent` is ours,
 * `client.gateway_exponent` is Stripe's — and this is only their difference. It
 * mirrors `Aponto\Payments\Stripe\Money::toStripe()` exactly, including its
 * refusal to round: an amount that does not divide is REFUSED, never truncated,
 * because a rounded charge is worse than a payment method that will not open.
 *
 * @param {number} minor            Order total in Aponto minor units.
 * @param {*}      gatewayExponent  Stripe's exponent for this currency.
 * @param {*}      currencyExponent The site currency's ISO exponent.
 * @return {?number} The gateway amount, or null when it cannot be expressed.
 */
function toGatewayAmount(minor, gatewayExponent, currencyExponent) {
  const amount = intOrNull(minor);
  const theirs = intOrNull(gatewayExponent);
  const ours = intOrNull(currencyExponent);
  if (amount === null || amount <= 0 || theirs === null || ours === null) {
    return null;
  }
  if (theirs >= ours) {
    return amount * Math.pow(10, theirs - ours);
  }
  const divisor = Math.pow(10, ours - theirs);
  // Our unit is FINER than the gateway's (MGA): exact division or nothing.
  return amount % divisor === 0 ? amount / divisor : null;
}

/**
 * Load Stripe.js once per page and resolve with the `Stripe` constructor.
 *
 * An already-present `window.Stripe` is reused verbatim: another plugin may have
 * loaded it, and the e2e harness substitutes a stub the same way. The in-flight
 * promise is cached on the window rather than in a module variable so two widgets
 * on one page share a single script tag.
 *
 * @param {Document} doc Document to load into.
 * @return {Promise<Function>} The `Stripe` constructor.
 */
function loadStripeSdk(doc) {
  const d = doc || document;
  const win = d.defaultView || window;
  if (typeof win.Stripe === 'function') {
    return Promise.resolve(win.Stripe);
  }
  if (win.__apontoStripeLoader) {
    return win.__apontoStripeLoader;
  }
  win.__apontoStripeLoader = new Promise((resolve, reject) => {
    let script = d.querySelector('script[src="' + SDK_URL + '"]');
    const fail = () => {
      // Let a later attempt retry rather than caching the failure forever:
      // the customer may simply have lost the network for a moment. The TAG
      // has to go with the cached promise — a script element that already
      // errored never fires `load` again, so leaving it behind would make
      // every retry hang on a corpse instead of re-fetching.
      win.__apontoStripeLoader = null;
      if (script && script.parentNode) {
        script.remove();
      }
      script = null;
      reject(new Error('stripe-sdk-unavailable'));
    };
    const done = () => {
      if (typeof win.Stripe === 'function') {
        resolve(win.Stripe);
      } else {
        fail();
      }
    };
    if (!script) {
      script = d.createElement('script');
      script.src = SDK_URL;
      script.async = true;
      (d.head || d.body || d.documentElement).appendChild(script);
    }
    script.addEventListener('load', done);
    script.addEventListener('error', fail);
  });
  return win.__apontoStripeLoader;
}

/**
 * The `appearance` object, built from the widget's own resolved tokens so the
 * card fields look like the rest of the form on any theme.
 *
 * Only non-empty values are included: an empty string is not a colour, and
 * passing one asks Stripe to fail on something the site owner never set.
 *
 * @param {HTMLElement} scope `.ap-wrap`.
 * @return {Object} Stripe appearance object.
 */
function resolveAppearance(scope) {
  const accent = (0,_host_js__WEBPACK_IMPORTED_MODULE_0__.resolveToken)(scope, '--ap-color-accent', 'color');
  const text = (0,_host_js__WEBPACK_IMPORTED_MODULE_0__.resolveToken)(scope, '--ap-color-text', 'color');
  const muted = (0,_host_js__WEBPACK_IMPORTED_MODULE_0__.resolveToken)(scope, '--ap-color-text-muted', 'color');
  const danger = (0,_host_js__WEBPACK_IMPORTED_MODULE_0__.resolveToken)(scope, '--ap-color-danger', 'color');
  const surface = (0,_host_js__WEBPACK_IMPORTED_MODULE_0__.resolveToken)(scope, '--ap-color-surface', 'color');
  const border = (0,_host_js__WEBPACK_IMPORTED_MODULE_0__.resolveToken)(scope, '--ap-color-border', 'color');
  const radius = (0,_host_js__WEBPACK_IMPORTED_MODULE_0__.resolveToken)(scope, '--ap-radius-control', 'border-top-left-radius');
  const fontSize = (0,_host_js__WEBPACK_IMPORTED_MODULE_0__.resolveToken)(scope, '--ap-font-size-body', 'font-size');
  const fontFamily = (0,_host_js__WEBPACK_IMPORTED_MODULE_0__.computedFontFamily)(scope);
  const variables = {};
  const put = (key, value) => {
    if (value) {
      variables[key] = value;
    }
  };
  put('colorPrimary', accent);
  put('colorText', text);
  put('colorTextSecondary', muted);
  put('colorDanger', danger);
  put('colorBackground', surface);
  put('borderRadius', radius);
  put('fontSizeBase', fontSize);
  put('fontFamily', fontFamily);
  const rules = {};
  if (border) {
    rules['.Input'] = {
      border: '1px solid ' + border,
      boxShadow: 'none'
    };
    rules['.Tab'] = {
      border: '1px solid ' + border,
      boxShadow: 'none'
    };
  }
  if (accent) {
    rules['.Input:focus'] = {
      borderColor: accent,
      boxShadow: 'none'
    };
    rules['.Tab--selected'] = {
      borderColor: accent,
      boxShadow: 'none'
    };
  }
  if (danger) {
    rules['.Input--invalid'] = {
      borderColor: danger
    };
  }
  if (muted) {
    rules['.Label'] = {
      color: muted
    };
  }
  return {
    variables,
    rules
  };
}

/**
 * Whether a Stripe error's own text may be shown to the customer.
 *
 * Stripe writes `card_error` and `validation_error` messages FOR the cardholder
 * ("Your card was declined."). Everything else — `api_error`,
 * `invalid_request_error` — is written for the integrator and can name internal
 * details, so those get our generic copy instead.
 *
 * @param {Object} error Stripe error object.
 * @return {string} A customer-safe message, or '' to use the widget's own copy.
 */
function customerSafeMessage(error) {
  const type = error && error.type ? String(error.type) : '';
  if ((type === 'card_error' || type === 'validation_error') && error.message) {
    return String(error.message);
  }
  return '';
}

/**
 * Create the Stripe adapter for one offered gateway.
 *
 * @param {Object} gateway `{code, label, client:{publishable_key, mode}}`.
 * @return {Object} Adapter.
 */
function createStripeAdapter(gateway) {
  const client = gateway && gateway.client || {};
  const slot = (0,_host_js__WEBPACK_IMPORTED_MODULE_0__.slotName)((gateway || {}).code);
  let sdk = null;
  let elements = null;
  let element = null;
  let holder = null;
  let complete = false;
  let torn = false;

  /** Tear the gateway UI down, in the order the spike requires. */
  function teardown() {
    if (element) {
      try {
        element.destroy();
      } catch {
        // Already gone — the holder still has to go.
      }
    }
    element = null;
    elements = null;
    sdk = null;
    complete = false;
    if (holder) {
      holder.remove();
      holder = null;
    }
  }
  return {
    code: (gateway || {}).code,
    slot,
    /** @return {boolean} Whether the element reports a complete input. */
    isComplete() {
      return complete;
    },
    /**
     * Create the light-DOM holder, mount the Payment Element into it and
     * resolve once the element reports itself ready.
     *
     * @param {Object}      opts                Mount options.
     * @param {HTMLElement} opts.host           Widget host (`[data-aponto-form]`).
     * @param {HTMLElement} opts.scope          Token scope (`.ap-wrap`).
     * @param {number}      opts.amount         Order total in minor units.
     * @param {string}      opts.currency       ISO-4217 code.
     * @param {Function}    [opts.onChange]     Called with the completeness flag.
     * @param {number}      [opts.readyTimeout] Override the 20s ready budget.
     * @return {Promise<void>} Resolves when the element is ready.
     */
    async mount(opts) {
      const {
        host,
        scope,
        amountMinor,
        currency,
        currencyExponent,
        onChange,
        readyTimeout = READY_TIMEOUT_MS
      } = opts;
      torn = false;

      // Refuse BEFORE anything is created: a currency this gateway cannot
      // express, or an amount that would have to be rounded, must not reach
      // an Element that would then quote the wrong figure.
      const amount = toGatewayAmount(amountMinor, client.gateway_exponent, currencyExponent);
      if (amount === null) {
        /* eslint-disable-next-line no-console */
        console.warn(AMOUNT_MARKER);
        throw new Error('payment-amount-unsupported');
      }
      const Stripe = await loadStripeSdk(host.ownerDocument);
      if (torn) {
        return;
      }
      sdk = Stripe(client.publishable_key);
      holder = (0,_host_js__WEBPACK_IMPORTED_MODULE_0__.createHolder)(host, slot);
      elements = sdk.elements({
        mode: 'payment',
        amount,
        currency: String(currency || '').toLowerCase(),
        appearance: resolveAppearance(scope),
        locale: 'auto'
      });
      element = elements.create('payment', {
        layout: 'tabs'
      });
      const ready = new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          // The silent hang (spike T1a). Warn once — no PII, just the
          // marker — then fail loudly enough for the customer to act.
          /* eslint-disable-next-line no-console */
          console.warn(TIMEOUT_MARKER);
          reject(new Error('payment-ui-timeout'));
        }, readyTimeout);
        element.on('ready', () => {
          clearTimeout(timer);
          resolve();
        });
        element.on('loaderror', () => {
          clearTimeout(timer);
          reject(new Error('payment-ui-loaderror'));
        });
      });
      element.on('change', event => {
        complete = !!(event && event.complete);
        if (onChange) {
          onChange(complete);
        }
      });
      element.mount(holder);
      try {
        await ready;
      } catch (error) {
        teardown();
        throw error;
      }
    },
    /**
     * Show or hide the gateway UI. The shadow panel's `hidden` does not reach
     * slotted content (measured), so the holder carries it itself.
     *
     * @param {boolean} visible Whether the method is the selected one.
     */
    setVisible(visible) {
      if (holder) {
        holder.hidden = !visible;
      }
    },
    /**
     * Push a new total or a re-resolved appearance into a mounted element —
     * no remount, so nothing the customer typed is lost.
     *
     * @param {Object} patch `{amount?, scope?}`.
     */
    update(patch) {
      if (!elements || !patch) {
        return;
      }
      const next = {};
      if (patch.amountMinor) {
        const amount = toGatewayAmount(patch.amountMinor, client.gateway_exponent, patch.currencyExponent);
        // A total the gateway cannot express leaves the previous, working
        // amount in place; the mount path is where that is refused loudly.
        if (amount !== null) {
          next.amount = amount;
        }
      }
      if (patch.scope) {
        next.appearance = resolveAppearance(patch.scope);
      }
      if (!Object.keys(next).length) {
        return;
      }
      try {
        elements.update(next);
      } catch {
        // A rejected update leaves the previous, working configuration.
      }
    },
    /**
     * Run the payment.
     *
     * The ORDER is the contract, and it is chosen so that nothing is created
     * server-side until the card details are known to be well-formed, and
     * nothing is charged until the slot is held:
     *
     *   validate in the element → `begin()` (booking + hold + intent) →
     *   confirm with the gateway → hand the reference back for `/confirm`
     *
     * `begin()` rejections are NOT caught: they are ordinary booking errors
     * (409, 429, 503…) and the widget already knows how to recover from them.
     *
     * @param {Object}   ctx           Context.
     * @param {Function} ctx.begin     Async; resolves `{response, payment}`.
     * @param {Function} ctx.returnUrl Builds the return URL from `{order, ref}`.
     * @return {Promise<Object>} `{status, ...}` — see the switch in `app.jsx`.
     */
    async submit(ctx) {
      if (!elements || !sdk) {
        return {
          status: 'unmounted'
        };
      }
      const validation = await elements.submit();
      if (validation && validation.error) {
        return {
          status: 'validation',
          message: customerSafeMessage(validation.error)
        };
      }
      const begun = await ctx.begin();
      const payment = begun.payment || null;
      const secret = payment ? (payment.client_params || {}).client_secret : '';
      if (!payment || payment.status !== 'begin' || !secret) {
        return {
          status: 'unavailable',
          response: begun.response,
          payment
        };
      }
      const result = await sdk.confirmPayment({
        elements,
        clientSecret: secret,
        confirmParams: {
          return_url: ctx.returnUrl({
            order: (begun.response.booking.order || {}).code,
            ref: payment.gateway_ref
          })
        },
        // V1 offers synchronous methods only, so a redirect is a bug on
        // the account, not a flow — but the return leg exists anyway.
        redirect: 'if_required'
      });
      if (result && result.error) {
        return {
          status: 'failed',
          message: customerSafeMessage(result.error),
          response: begun.response,
          payment
        };
      }
      const intent = result && result.paymentIntent || null;
      const state = intent && intent.status ? intent.status : '';
      if (state === 'succeeded' || state === 'processing') {
        return {
          status: state === 'succeeded' ? 'succeeded' : 'processing',
          ref: intent.id,
          response: begun.response,
          payment
        };
      }
      return {
        status: 'failed',
        message: '',
        response: begun.response,
        payment
      };
    },
    /** Destroy the element, THEN remove its holder (spike T7). */
    destroy() {
      torn = true;
      teardown();
    }
  };
}

/***/ },

/***/ "./assets/src/form/lib/tz.js"
/*!***********************************!*\
  !*** ./assets/src/form/lib/tz.js ***!
  \***********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   browserTimezone: () => (/* binding */ browserTimezone),
/* harmony export */   canonicalizeZone: () => (/* binding */ canonicalizeZone),
/* harmony export */   dayKeyInTz: () => (/* binding */ dayKeyInTz),
/* harmony export */   fmtTime: () => (/* binding */ fmtTime),
/* harmony export */   formatInTz: () => (/* binding */ formatInTz),
/* harmony export */   gmtSuffix: () => (/* binding */ gmtSuffix),
/* harmony export */   groupSlotsByDay: () => (/* binding */ groupSlotsByDay),
/* harmony export */   resolveDisplayTz: () => (/* binding */ resolveDisplayTz),
/* harmony export */   tzLabel: () => (/* binding */ tzLabel),
/* harmony export */   tzOffsetMinutes: () => (/* binding */ tzOffsetMinutes)
/* harmony export */ });
/**
 * Timezone model — SPEC-P1 §2.2 "BẤT BIẾN TIMEZONE" (D1 = A′).
 *
 * Every visible time in the widget goes through ONE formatter that takes a
 * `(utc_instant, display_tz)` pair. There is no hand-rolled time math anywhere
 * else — that is the whole point of this module. Slots carry UTC instants, zones
 * are IANA names, and the friendly `City (GMT±N)` label is resolved at the slot's
 * own instant so DST and fractional offsets stay correct.
 *
 * The `City (GMT±N)` label is byte-for-byte identical to the PHP server helper
 * `Aponto\Rest\Support\TimezoneLabel` (rest-contract §3.5) — ASCII minus, hours
 * with no leading zero, minutes only when non-zero. Matching the server keeps the
 * six D1 surfaces (slot picker · summary · confirm · success · manage page ·
 * email) visually identical; the first four are this widget, the last two are
 * server-rendered.
 *
 * Pure module: no Preact, no DOM. Unit-testable under node/jest.
 */

/**
 * Legacy → canonical IANA aliases. Browsers may report deprecated zone names
 * (this machine reports `Asia/Saigon` for Vietnam) that a strict server
 * `DateTimeZone::listIdentifiers()` check rejects. Canonicalizing on the client
 * keeps the widget working AND makes the deterministic init rule treat an alias
 * and its canonical business zone as the same zone. Covers the common aliases;
 * the fuller fix is server-side (see report ripple).
 */
const ZONE_ALIASES = {
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Katmandu': 'Asia/Kathmandu',
  'Asia/Rangoon': 'Asia/Yangon',
  'Asia/Ulan_Bator': 'Asia/Ulaanbaatar',
  'Asia/Thimbu': 'Asia/Thimphu',
  'Asia/Dacca': 'Asia/Dhaka',
  'Asia/Istanbul': 'Europe/Istanbul',
  'Europe/Kiev': 'Europe/Kyiv',
  'Europe/Uzhgorod': 'Europe/Kyiv',
  'Europe/Nicosia': 'Asia/Nicosia',
  'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
  'America/Godthab': 'America/Nuuk',
  'Pacific/Ponape': 'Pacific/Pohnpei',
  'Pacific/Truk': 'Pacific/Chuuk',
  GMT: 'UTC',
  'Etc/GMT': 'UTC',
  'Etc/UTC': 'UTC'
};

/**
 * Map a possibly-legacy IANA zone name to its canonical form.
 *
 * @param {string} iana IANA name.
 * @return {string} Canonical IANA name.
 */
function canonicalizeZone(iana) {
  return ZONE_ALIASES[iana] || iana;
}

/**
 * Accept an ISO string, epoch ms number, or Date and return a Date.
 * @param {Date|number|string} instant Instant.
 */
function toDate(instant) {
  if (instant instanceof Date) {
    return instant;
  }
  if (typeof instant === 'number') {
    return new Date(instant);
  }
  return new Date(String(instant));
}

/**
 * Two-digit zero pad.
 *
 * @param {number} n Number.
 * @return {string} Padded string.
 */
function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

/**
 * Offset (in minutes) of an IANA zone at a given instant — Intl-derived, so DST
 * and fractional offsets (e.g. `Asia/Kathmandu` +5:45) are always correct. The
 * "format the instant as wall-clock in the zone, diff against the UTC instant"
 * trick is the standard way to get an offset for an arbitrary IANA zone in JS.
 *
 * @param {string}             iana    IANA timezone name.
 * @param {Date|number|string} instant UTC instant.
 * @return {number} Signed offset in minutes.
 */
function tzOffsetMinutes(iana, instant) {
  const date = toDate(instant);
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: iana,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const p = {};
  dtf.formatToParts(date).forEach(x => {
    if (x.type !== 'literal') {
      p[x.type] = x.value;
    }
  });
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - date.getTime()) / 60000);
}

/**
 * THE single formatter: `(utc_instant, display_tz) -> string`. Every rendered
 * time in the widget must flow through here (directly or via {@link fmtTime}).
 *
 * @param {Date|number|string}         instant  UTC instant.
 * @param {string}                     iana     Display timezone (IANA).
 * @param {Intl.DateTimeFormatOptions} options  Intl options.
 * @param {string}                     [locale] BCP-47 locale, defaults to `en-US`.
 * @return {string} Formatted string.
 */
function formatInTz(instant, iana, options, locale) {
  return new Intl.DateTimeFormat(locale || 'en-US', Object.assign({
    timeZone: iana
  }, options)).format(toDate(instant));
}

/**
 * Clock time in the display zone, e.g. `9:00 AM`.
 *
 * @param {Date|number|string} instant  UTC instant.
 * @param {string}             iana     Display timezone.
 * @param {string}             [locale] Locale.
 * @return {string} Time string.
 */
function fmtTime(instant, iana, locale) {
  return formatInTz(instant, iana, {
    hour: 'numeric',
    minute: '2-digit'
  }, locale);
}

/**
 * Calendar day `YYYY-MM-DD` of an instant in a zone — the basis for grouping
 * flat availability slots into per-day buckets in the display timezone
 * (SPEC-P1 §2.2 / SPEC-P0 §5.5). Uses the `en-CA` locale purely because it
 * formats as `YYYY-MM-DD`.
 *
 * @param {Date|number|string} instant UTC instant.
 * @param {string}             iana    Display timezone.
 * @return {string} `YYYY-MM-DD`.
 */
function dayKeyInTz(instant, iana) {
  const p = {};
  new Intl.DateTimeFormat('en-CA', {
    timeZone: iana,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(toDate(instant)).forEach(x => {
    if (x.type !== 'literal') {
      p[x.type] = x.value;
    }
  });
  return p.year + '-' + p.month + '-' + p.day;
}

/**
 * `GMT±N` suffix for a zone at an instant. Matches PHP `TimezoneLabel`: ASCII
 * `-` for negative, hours with no leading zero, minutes only when non-zero.
 *
 * @param {string}             iana       IANA name.
 * @param {Date|number|string} refInstant Instant to resolve the offset at.
 * @return {string} e.g. `GMT+7`, `GMT-8`, `GMT+5:45`.
 */
function gmtSuffix(iana, refInstant) {
  const off = tzOffsetMinutes(iana, refInstant);
  const abs = Math.abs(off);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return 'GMT' + (off < 0 ? '-' : '+') + h + (m ? ':' + pad2(m) : '');
}

/**
 * A fixed-offset zone name — what WordPress hands us as the site timezone when
 * the admin never picked a city (`gmt_offset` only): `+00:00`, `-05:30`, `+7`.
 * These have no city to name, so the friendly label degrades to the offset alone.
 *
 * @param {string} iana Zone name.
 * @return {boolean} True for an offset-form zone.
 */
function isOffsetZone(iana) {
  return /^[+-]\d{1,2}(:\d{2})?$/.test(String(iana));
}

/**
 * Friendly `City (GMT±N)` label — identical to the PHP server helper so all six
 * D1 surfaces read the same. The city is the last IANA path segment with
 * underscores turned to spaces (`America/Argentina/Buenos_Aires` -> `Buenos Aires`).
 *
 * A fixed-offset zone has no city: `+00:00` would otherwise render the nonsense
 * `+00:00 (GMT+0)`, so it collapses to the bare `GMT+0`. `TimezoneLabel::label()`
 * applies the same rule, keeping the six D1 surfaces byte-identical.
 *
 * @param {string}             iana       IANA name.
 * @param {Date|number|string} refInstant Instant to resolve the offset at.
 * @return {string} e.g. `Berlin (GMT+2)`, or `GMT+0` for a fixed-offset zone.
 */
function tzLabel(iana, refInstant) {
  const suffix = gmtSuffix(iana, refInstant);
  if (isOffsetZone(iana)) {
    return suffix;
  }
  const parts = String(iana).split('/');
  const city = parts[parts.length - 1].replace(/_/g, ' ');
  return city + ' (' + suffix + ')';
}

/**
 * The browser's resolved IANA timezone, with a safe fallback.
 *
 * @return {string} IANA name.
 */
function browserTimezone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      return canonicalizeZone(tz);
    }
  } catch {
    // fall through
  }
  return 'UTC';
}

/**
 * Deterministic init rule (SPEC-P1 §2.2): when the browser zone equals the
 * business zone, display = business and NO selector is shown; otherwise display
 * defaults to the browser zone and the selector is shown (with the business-time
 * secondary line). `customer_timezone` is later persisted as whatever display_tz
 * is active at submit — even if the visitor never opened the selector.
 *
 * @param {Object} args            Args.
 * @param {string} args.browserTz  Browser IANA zone.
 * @param {string} args.businessTz Business IANA zone.
 * @return {{displayTz:string, businessTz:string, browserTz:string, showSelector:boolean}} Init state.
 */
function resolveDisplayTz({
  browserTz,
  businessTz
}) {
  const differs = !!browserTz && !!businessTz && browserTz !== businessTz;
  return {
    browserTz,
    businessTz,
    displayTz: differs ? browserTz : businessTz,
    showSelector: differs
  };
}

/**
 * Group a flat list of availability slots by calendar day in the display zone.
 * Each slot must expose a `start_utc` (ISO) property. Buckets are keyed by
 * `YYYY-MM-DD` and each bucket is sorted ascending by instant.
 *
 * @param {Array<{start_utc:string}>} slots     Flat slots (as returned by the availability API).
 * @param {string}                    displayTz Display timezone.
 * @return {Object<string, Array>} Map of dayKey -> slots.
 */
function groupSlotsByDay(slots, displayTz) {
  const idx = {};
  (slots || []).forEach(slot => {
    const key = dayKeyInTz(slot.start_utc, displayTz);
    (idx[key] || (idx[key] = [])).push(slot);
  });
  Object.keys(idx).forEach(k => {
    idx[k].sort((a, b) => new Date(a.start_utc).getTime() - new Date(b.start_utc).getTime());
  });
  return idx;
}

/***/ },

/***/ "./assets/src/form/mount.jsx"
/*!***********************************!*\
  !*** ./assets/src/form/mount.jsx ***!
  \***********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   mountWidget: () => (/* binding */ mountWidget)
/* harmony export */ });
/* harmony import */ var preact__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! preact */ "./node_modules/preact/dist/preact.module.js");
/* harmony import */ var _app_jsx__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./app.jsx */ "./assets/src/form/app.jsx");
/* harmony import */ var _styles_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./styles.js */ "./assets/src/form/styles.js");
/* harmony import */ var _lib_config_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./lib/config.js */ "./assets/src/form/lib/config.js");
/* harmony import */ var _lib_appearance_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./lib/appearance.js */ "./assets/src/form/lib/appearance.js");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
/** @jsxImportSource preact */
/**
 * Mount the Preact booking widget into an OPEN ShadowRoot on a host element,
 * following the validated spike pattern (SPEC-P1 §2.1 / spikes/shadow-dom).
 *
 * All CSS is injected into the shadow so no host-theme rule reaches in and
 * nothing leaks out — except the one stylesheet that CANNOT be (`lib/payments/
 * host.js`'s light-DOM shield), because the node it protects is a payment
 * gateway's mount holder, which lives in the light DOM by necessity and is
 * injected lazily when a gateway first mounts. Appearance block attributes (accent/radius — Q11) are set as
 * inline custom properties on the HOST element; because inline styles beat the
 * shadow's `:host` defaults, a per-block accent wins and every derived token
 * recomputes from it — no remount needed for a live token change.
 */






/**
 * Mount the widget onto a single host element (idempotent per host).
 *
 * @param {HTMLElement} hostEl Element carrying `data-aponto-form`.
 */

function mountWidget(hostEl) {
  if (!hostEl || hostEl.__apMounted) {
    return;
  }
  hostEl.__apMounted = true;
  const props = (0,_lib_config_js__WEBPACK_IMPORTED_MODULE_3__.parseProps)(hostEl.getAttribute('data-props'));
  const config = (0,_lib_config_js__WEBPACK_IMPORTED_MODULE_3__.resolveConfig)((0,_lib_config_js__WEBPACK_IMPORTED_MODULE_3__.readGlobalConfig)(window), props);

  // Appearance → inline custom properties on the host (override :host defaults).
  const vars = (0,_lib_appearance_js__WEBPACK_IMPORTED_MODULE_4__.resolveAppearanceVars)(config.appearance);
  Object.keys(vars).forEach(name => {
    hostEl.style.setProperty(name, vars[name]);
  });

  // Color scheme → host attribute, which selects the shadow stylesheet's opt-in
  // dark preset. Always written (even for the `light` default) so the resolved
  // scheme is visible in the DOM and never inferred from the OS by accident.
  hostEl.setAttribute('data-ap-color-scheme', (0,_lib_appearance_js__WEBPACK_IMPORTED_MODULE_4__.resolveColorScheme)(config.appearance));
  const shadow = hostEl.attachShadow({
    mode: 'open'
  });
  injectCss(shadow, _styles_js__WEBPACK_IMPORTED_MODULE_2__.SHADOW_CSS);
  const mountPoint = (shadow.ownerDocument || document).createElement('div');
  shadow.appendChild(mountPoint);
  (0,preact__WEBPACK_IMPORTED_MODULE_0__.render)((0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(_app_jsx__WEBPACK_IMPORTED_MODULE_1__.App, {
    config: config
  }), mountPoint);
}

/**
 * Inject CSS into a shadow root, preferring a constructable stylesheet built in
 * the shadow's own document (works inside the block-editor iframe too) and
 * falling back to a `<style>` element.
 *
 * @param {ShadowRoot} shadow Shadow root.
 * @param {string} cssText CSS.
 */
function injectCss(shadow, cssText) {
  const doc = shadow.ownerDocument || document;
  const win = doc.defaultView || window;
  try {
    if (win.CSSStyleSheet && 'adoptedStyleSheets' in doc) {
      const sheet = new win.CSSStyleSheet();
      sheet.replaceSync(cssText);
      shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, sheet];
      return;
    }
  } catch (e) {
    // Fall through to a <style> element.
  }
  const style = doc.createElement('style');
  style.textContent = cssText;
  shadow.appendChild(style);
}

/***/ },

/***/ "./assets/src/form/styles.js"
/*!***********************************!*\
  !*** ./assets/src/form/styles.js ***!
  \***********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SHADOW_CSS: () => (/* binding */ SHADOW_CSS)
/* harmony export */ });
/**
 * Shadow-root stylesheet for the booking widget.
 *
 * Design source of truth: `docs/mockups/v4/booking-form/` + the canonical token
 * sheet `docs/mockups/v4/assets/css/aponto-tokens.css`. Everything the widget
 * renders is styled here and injected into the OPEN ShadowRoot, so no host-theme
 * rule can reach in and nothing leaks out.
 *
 * ONE exception, and it is deliberate: a payment gateway's own UI cannot live in
 * the shadow root at all (Stripe refuses to mount there), so it is mounted into a
 * light-DOM holder projected back in through `<slot>`. That holder IS reachable by
 * the site's theme, and the counter-rule for it — the "light-DOM shield" — lives in
 * `lib/payments/host.js` rather than here, because it is injected into the page's
 * own document instead of into the shadow root. Everything in THIS file still
 * applies only inside the shadow.
 *
 * Token strategy (SPEC-P1 §2.1 / Q11):
 *  - ALL tokens — the public seeds AND every derived shade — are declared on
 *    `:host`. The three public seeds (`--ap-color-accent`, `--ap-color-on-accent`,
 *    `--ap-radius-control`) are OVERRIDDEN as inline custom properties on the host
 *    element by `mount.jsx` from the block's appearance attributes. Inline styles
 *    beat the `:host` rule, so a per-block accent wins and every derived token
 *    (declared on the same host element) recomputes from it.
 *  - The widget is fully self-contained: it never consumes a dashboard-kit token,
 *    only its own `--ap-*` with built-in fallbacks.
 *  - Color scheme is LIGHT by default and the BLOCK is its only source of truth
 *    (founder ruling 2026-08-01). This sheet contains NO `prefers-color-scheme`
 *    rule and reads no admin/dashboard scheme: the public form must never flip
 *    because a visitor's OS or the site owner's admin workspace is dark. The
 *    block's `colorScheme` attribute drives `data-ap-color-scheme` on the host —
 *    `light` (default) or `dark` — and `color-scheme: light` on `:host` also pins
 *    UA-rendered controls so nothing inside the shadow root can darken on its own.
 *    This matches the design reference, which ships `html{color-scheme:light}`
 *    (`docs/mockups/v4/assets/css/aponto-tokens.css:15`) and scopes its dark token
 *    preset to an explicit stage (line 152), never to a media query.
 */

const TOKENS = `
:host {
  --ap-color-accent: #5b5bd6;
  --ap-color-on-accent: #ffffff;
  /* The tick sits ON the accent, so it has to follow --ap-color-on-accent — which
   * a data URI cannot read. White is the default for the dark-to-mid accents;
   * resolveAppearanceVars() in lib/appearance.js re-emits this URL with the
   * derived near-black baked in whenever a light accent flips the foreground. */
  --ap-checkbox-check-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='m3.5 8.1 2.7 2.7 6.3-6.3' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  /* appearance:none takes the UA arrow with the UA border, so the affordance
   * comes back as a background. A data URI is its own document and cannot read
   * currentColor, hence the literal stroke restated by the dark preset. */
  --ap-select-chevron-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='m4 6.5 4 4 4-4' fill='none' stroke='%236f7479' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  --ap-color-surface: #fdfdfb;
  --ap-color-canvas: #ffffff;
  --ap-color-text: #30353a;
  --ap-color-danger: #c22a2a;
  --ap-color-success: #2f8a5b;
  --ap-color-warning: #b5860f;
  --ap-color-info: #5056c9;
  --ap-color-inverse-surface: #12151b;
  --ap-color-on-inverse: #ffffff;
  --ap-color-on-inverse-danger: #ffb4a8;

  /* text-muted/soft darkened to WCAG AA (4.5:1 on surface): muted 68→72%
   * (4.55→5.13), soft 52→70% (2.96→4.82). Fixes axe serious color-contrast on
   * .ap-step-fraction + .opt (both consume text-soft). Q-founder token decision. */
  --ap-tone-text-muted: 72%;
  --ap-tone-text-soft: 70%;
  --ap-tone-surface-subtle: 5%;
  --ap-tone-surface-muted: 7%;
  --ap-tone-avatar-surface: 5%;
  --ap-tone-border: 12%;
  --ap-tone-border-strong: 21%;
  --ap-tone-accent-subtle: 8%;
  --ap-tone-accent-soft: 14%;
  --ap-tone-accent-border: 40%;

  --ap-color-heading: var(--ap-color-text);
  --ap-color-text-muted: color-mix(in srgb, var(--ap-color-text) var(--ap-tone-text-muted), var(--ap-color-surface));
  --ap-color-text-soft: color-mix(in srgb, var(--ap-color-text) var(--ap-tone-text-soft), var(--ap-color-surface));
  --ap-color-surface-subtle: color-mix(in srgb, var(--ap-color-text) var(--ap-tone-surface-subtle), var(--ap-color-surface));
  --ap-color-surface-muted: color-mix(in srgb, var(--ap-color-text) var(--ap-tone-surface-muted), var(--ap-color-surface));
  --ap-color-avatar-surface: color-mix(in srgb, var(--ap-color-text) var(--ap-tone-avatar-surface), var(--ap-color-surface));
  --ap-color-border: color-mix(in srgb, var(--ap-color-text) var(--ap-tone-border), var(--ap-color-surface));
  --ap-color-border-strong: color-mix(in srgb, var(--ap-color-text) var(--ap-tone-border-strong), var(--ap-color-surface));
  --ap-color-row-hover: color-mix(in srgb, var(--ap-color-surface-subtle) 50%, var(--ap-color-surface));

  --ap-color-accent-subtle: color-mix(in srgb, var(--ap-color-accent) var(--ap-tone-accent-subtle), var(--ap-color-surface));
  --ap-color-accent-soft: color-mix(in srgb, var(--ap-color-accent) var(--ap-tone-accent-soft), var(--ap-color-surface));
  --ap-color-accent-border: color-mix(in srgb, var(--ap-color-accent) var(--ap-tone-accent-border), var(--ap-color-border));
  --ap-color-danger-subtle: color-mix(in srgb, var(--ap-color-danger) 8%, var(--ap-color-surface));
  --ap-color-danger-border: color-mix(in srgb, var(--ap-color-danger) 24%, var(--ap-color-border));
  --ap-color-on-danger: color-mix(in srgb, var(--ap-color-danger) 82%, var(--ap-color-text));
  --ap-color-warning-subtle: color-mix(in srgb, var(--ap-color-warning) 9%, var(--ap-color-surface));
  --ap-color-warning-border: color-mix(in srgb, var(--ap-color-warning) 24%, var(--ap-color-border));
  --ap-color-on-warning: color-mix(in srgb, var(--ap-color-warning) 78%, var(--ap-color-text));
  --ap-color-info-subtle: color-mix(in srgb, var(--ap-color-info) 9%, var(--ap-color-surface));
  --ap-color-info-border: color-mix(in srgb, var(--ap-color-info) 24%, var(--ap-color-border));
  --ap-color-on-info: color-mix(in srgb, var(--ap-color-info) 78%, var(--ap-color-text));
  --ap-color-success-subtle: color-mix(in srgb, var(--ap-color-success) 9%, var(--ap-color-surface));
  --ap-color-on-success: color-mix(in srgb, var(--ap-color-success) 82%, var(--ap-color-text));

  --ap-font-size-badge: 11px;
  --ap-font-size-micro: 12px;
  --ap-font-size-caption: 13px;
  --ap-font-size-meta: 15px;
  --ap-font-size-body: 16px;
  --ap-font-size-item: 17px;
  --ap-font-size-control: 16px;
  --ap-font-size-subheading: 20px;
  --ap-font-size-heading: 24px;
  --ap-font-size-xs: var(--ap-font-size-caption);
  --ap-font-size-sm: var(--ap-font-size-meta);
  --ap-font-weight-regular: 400;
  --ap-font-weight-medium: 500;
  --ap-font-weight-semibold: 600;
  --ap-line-height-body: 1.45;
  --ap-line-height-title: 1.25;
  --ap-letter-spacing-title: -.01em;

  --ap-space-1: 4px;
  --ap-space-2: 8px;
  --ap-space-3: 12px;
  --ap-space-4: 16px;

  --ap-radius-control: 4px;
  --ap-radius-small: var(--ap-radius-control);
  --ap-radius-pill: 999px;
  --ap-size-control: 40px;
  --ap-size-control-compact: 34px;
  --ap-size-calendar-nav: 34px;
  --ap-size-stepper: 30px;
  --ap-size-selection: 18px;

  /* Caps the CARD; the two below cap the content column inside it. 1140px is the
   * widest container the v4 playground ever composed (360/700/900/1140 —
   * booking-form/README.md §7), so past it the design is undefined and an
   * alignwide/alignfull host just stretched the card to the viewport. */
  --ap-layout-max: 1140px;
  --ap-layout-content: 660px;
  --ap-layout-catalogue: 820px;
  --ap-layout-sidebar: 240px;
  --ap-layout-sidebar-wide: 288px;

  --ap-motion-standard: 170ms cubic-bezier(.2, .7, .3, 1);
  --ap-motion-step-duration: 340ms;
  --ap-motion-step-back-duration: 280ms;
  --ap-motion-step-easing: cubic-bezier(.22, 1, .36, 1);
  --ap-motion-step-distance: 12px;
  --ap-motion-step-back-distance: 9px;
  --ap-motion-stagger: 28ms;

  /* Light-first: also pins UA-rendered controls (search input, calendar selects)
   * to the light scheme on a dark-OS browser. */
  color-scheme: light;
  display: block;
}

/* The ONLY dark surface in the widget: the block's own colorScheme="dark". No
 * device/OS media query exists in this sheet by design — see the module header. */
:host([data-ap-color-scheme="dark"]) {
  color-scheme: dark;
  --ap-color-surface: #1a1e25;
  --ap-color-canvas: #1a1e25;
  --ap-color-text: #e7eaef;
  /* Dark soft 46→54% (3.98→~4.9 on #1a1e25) — clears AA in dark too. */
  --ap-tone-text-soft: 54%;
  --ap-tone-surface-subtle: 4%;
  --ap-tone-surface-muted: 6%;
  --ap-tone-avatar-surface: 7%;
  --ap-tone-border-strong: 20%;
  --ap-tone-accent-subtle: 22%;
  --ap-tone-accent-soft: 30%;
  --ap-select-chevron-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='m4 6.5 4 4 4-4' fill='none' stroke='%23a3abb6' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}
`;
const COMPONENTS = `
.ap-wrap {
  position: relative;
  width: 100%;
  /* Cap on the container-query element itself, so the query keeps measuring the
   * card (capped) and not the host (uncapped). See --ap-layout-max. */
  max-width: var(--ap-layout-max);
  margin-inline: auto;
  container-type: inline-size;
  container-name: apw;
  font-family: inherit;
  letter-spacing: normal;
  word-spacing: normal;
  text-transform: none;
  text-align: start;
  white-space: normal;
}
/* Focus DELEGATION marks the shadow HOST :focus whenever anything inside the
 * root has focus, and the page then paints a ~2px black ring around the whole
 * widget — including on the confirmation screen, where the app focuses the
 * heading with no user interaction. The ring is not only the UA default:
 * Twenty Twenty-Five ships a DOCUMENT-tree rule for any focused element under
 * .wp-site-blocks, and for NORMAL declarations the document tree beats a
 * shadow-tree :host rule regardless of specificity (CSS Scoping §3.3 —
 * tree-of-origin ordering). !important inverts that order in the shadow
 * tree's favour; it is the only way this rule can win from in here, verified
 * live against TT25. The real affordance lives on the inner controls
 * (:focus-visible rules below); the host ring is pure noise. */
:host(:focus), :host(:focus-visible), :host(:focus-within) { outline: none !important; }
.ap { width: 100%; background: var(--ap-color-surface); color: var(--ap-color-text);
  border: 1px solid var(--ap-color-border); border-radius: var(--ap-radius-control);
  font-family: inherit; font-size: var(--ap-font-size-body); font-weight: var(--ap-font-weight-regular);
  line-height: var(--ap-line-height-body); overflow: clip;
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
/* .ap itself is in the border-box list: content-box made the card 1140+2px wide
 * and pushed it 2px off the .ap-wrap centre under the --ap-layout-max cap. */
.ap, .ap *, .ap *::before, .ap *::after { box-sizing: border-box; }
.ap button, .ap input, .ap select, .ap textarea { font-family: inherit; }
.ap strong { font-weight: var(--ap-font-weight-semibold); }
.ap-item-title { font-size: var(--ap-font-size-item); font-weight: var(--ap-font-weight-semibold); line-height: 1.35; }
.ap svg { width: 16px; height: 16px; flex: 0 0 auto; display: block; }
.ap-visually-hidden { position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

.ap-body { display: grid; grid-template-columns: minmax(0, 1fr); }
/* Symmetric top/bottom inset. The mockup could get away with a 4px bottom because
 * every one of its steps ends in an .ap-foot that carried the remaining 14px;
 * here Service (immediate select), the skeletons and Confirmation have no footer,
 * so the list ended 5px from the card edge under a 19px top. The footer now
 * contributes spacing above itself only and .ap-main owns the bottom inset, so
 * the rhythm is identical on every step. */
.ap-main { padding: 20px 22px; min-width: 0; }
.ap-main.narrow { width: 100%; max-width: var(--ap-layout-content); margin-inline: auto; }
.ap-main.service { width: 100%; max-width: var(--ap-layout-catalogue); margin-inline: auto; }
/* Summary column: hidden until the ≥700px query below reveals it. */
.ap-aside { display: none; flex-direction: column; min-height: 0; overflow: hidden;
  border-inline-start: 1px solid var(--ap-color-border); background: var(--ap-color-surface-subtle); padding: 18px 18px 20px; }

.ap-recap { border-bottom: 1px solid var(--ap-color-border); }
.ap-recap-bar { display: flex; align-items: center; gap: 12px; width: 100%; background: var(--ap-color-surface-subtle);
  border: 0; padding: 11px 18px; font: inherit; color: var(--ap-color-text); cursor: pointer; text-align: start; }
.ap-recap-line { flex: 1; min-width: 0; font-size: var(--ap-font-size-sm); font-weight: var(--ap-font-weight-medium);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ap-recap-chev { flex: 0 0 auto; color: var(--ap-color-text-soft); display: grid; place-items: center; }
.ap-recap-chev svg { width: 16px; height: 16px; transform: rotate(90deg); transition: transform var(--ap-motion-standard); }
.ap-recap-chev.up svg { transform: rotate(-90deg); }
.ap-recap-panel { overflow: hidden; max-height: 0; transition: max-height var(--ap-motion-standard); background: var(--ap-color-surface-subtle); }
.ap-recap-panel.open { max-height: min(68vh, 560px); overflow-y: auto; }
.ap-recap-panel-in { padding: 2px 18px 16px; border-top: 1px solid var(--ap-color-border); }

/* Adaptivity (SPEC-P1 §2.1, mockup index.html:101-110). Container queries, not
 * viewport media: one build serves a wide embed and a narrow one, and the summary
 * moves between sidebar and recap accordion with no re-render. has-summary is set
 * from step 2 only, so Service and Confirmation get no empty column. */
@container apw (min-width: 700px) {
  .ap-body.has-summary { grid-template-columns: minmax(0, 1fr) var(--ap-layout-sidebar); }
  .ap-body.has-summary .ap-aside { display: flex; }
  .ap-recap { display: none; }
}
@container apw (min-width: 900px) {
  .ap-body.has-summary { grid-template-columns: minmax(0, 1fr) var(--ap-layout-sidebar-wide); }
}
@container apw (max-width: 619.98px) {
  .ap-main { padding: 18px 20px; }
  .ap-recap-bar, .ap-recap-panel-in { padding-left: 20px; padding-right: 20px; }
  .ap-primary { min-width: 120px; }
}

.ap-h { display: flex; align-items: center; column-gap: 9px; flex-wrap: wrap; margin: 0 0 20px; }
.ap-h h2 { margin: 0; color: var(--ap-color-heading); font-size: var(--ap-font-size-heading);
  font-weight: var(--ap-font-weight-semibold); letter-spacing: var(--ap-letter-spacing-title); line-height: var(--ap-line-height-title); }
.ap-h h2:focus, .ap-done h2:focus { outline: none; }
.ap-h .sub { width: 100%; margin: 5px 0 0; font-size: var(--ap-font-size-sm); line-height: 1.45; color: var(--ap-color-text-muted); }
.ap-step-fraction { margin-left: auto; font-size: var(--ap-font-size-xs); font-weight: var(--ap-font-weight-medium);
  letter-spacing: .04em; font-variant-numeric: tabular-nums; color: var(--ap-color-text-soft); white-space: nowrap; }

.ap-label { display: block; font-size: var(--ap-font-size-sm); font-weight: var(--ap-font-weight-medium);
  color: var(--ap-color-text-muted); margin: 0 0 5px; }
.ap-label .req { color: var(--ap-color-danger); margin-left: 2px; }
.ap-label .opt { color: var(--ap-color-text-soft); font-weight: var(--ap-font-weight-regular); margin-left: 4px; }
.ap-input, .ap-select, .ap-textarea { width: 100%; height: var(--ap-size-control); padding: 0 11px; font: inherit;
  font-size: var(--ap-font-size-control); color: var(--ap-color-text); background: var(--ap-color-canvas);
  border: 1px solid var(--ap-color-border); border-radius: var(--ap-radius-control); outline: none;
  transition: border-color var(--ap-motion-standard), box-shadow var(--ap-motion-standard); }
.ap-textarea { height: auto; padding: 9px 11px; line-height: 1.5; resize: vertical; min-height: 74px; }
.ap-input::placeholder, .ap-textarea::placeholder { color: var(--ap-color-text-soft); }
.ap-input:hover, .ap-select:hover, .ap-textarea:hover { border-color: var(--ap-color-border-strong); box-shadow: inset 0 0 0 1px var(--ap-color-border-strong); }
.ap-input:focus, .ap-select:focus, .ap-textarea:focus { border-color: var(--ap-color-accent); box-shadow: inset 0 0 0 1px var(--ap-color-accent); }

/* Native control chrome is opt-OUT, and the opt-out was missing: a select (or an
 * input[type=checkbox]) keeps appearance:auto, so Chrome/WebKit paint the
 * platform widget — its own ~#767676 ring included — INSTEAD of the hairline
 * declared below. The declaration still applies, so getComputedStyle reports the
 * hairline while the screen shows a near-black ring; that is why the reported
 * "black border" survived two rounds of token auditing. Both select rules already
 * reserve right padding for an arrow, so the chevron just moves from the UA into
 * this sheet (physical, matching the physical padding those rules ship). */
.ap-select, .ap-cal-select, .ap-visitor-tz select {
  appearance: none; -webkit-appearance: none;
  background-image: var(--ap-select-chevron-image);
  background-repeat: no-repeat; background-position: right 7px center; background-size: 14px 14px;
}
.ap-consent input {
  appearance: none; -webkit-appearance: none;
  border: 1px solid var(--ap-color-border-strong); border-radius: var(--ap-radius-small);
  background: var(--ap-color-canvas) no-repeat center / 12px 12px;
  cursor: pointer; transition: background-color var(--ap-motion-standard), border-color var(--ap-motion-standard);
}
.ap-consent input:hover { border-color: var(--ap-color-accent); }
.ap-consent input:checked { border-color: var(--ap-color-accent); background-color: var(--ap-color-accent); background-image: var(--ap-checkbox-check-image); }

.ap-field { margin: 0 0 14px; }
.ap-field.bad .ap-input, .ap-field.bad .ap-textarea, .ap-field.bad .ap-select { border-color: var(--ap-color-danger); }
.ap-err { display: none; margin: 5px 0 0; font-size: var(--ap-font-size-sm); color: var(--ap-color-danger); }
.ap-field.bad .ap-err { display: block; }

.ap :focus-visible { outline: 1px solid var(--ap-color-accent-border); outline-offset: 1px; border-radius: var(--ap-radius-small); }
.ap .ap-input:focus-visible, .ap .ap-select:focus-visible, .ap .ap-textarea:focus-visible { outline: none; border-color: var(--ap-color-accent); box-shadow: inset 0 0 0 1px var(--ap-color-accent); }

.ap-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 18px; }
.ap-back { display: inline-flex; align-items: center; gap: 6px; background: none; border: 0; padding: 6px 2px; font: inherit;
  font-size: var(--ap-font-size-body); font-weight: 400; color: var(--ap-color-text-muted); cursor: pointer; border-radius: var(--ap-radius-small); }
.ap-back:hover { color: var(--ap-color-text); text-decoration: underline; }
.ap-back svg { width: 15px; height: 15px; }
.ap-back[hidden] { visibility: hidden; }
.ap-back:disabled { opacity: .5; cursor: default; text-decoration: none; }
.ap-back:disabled:hover { color: var(--ap-color-text-muted); text-decoration: none; }
.ap-primary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-width: 132px;
  height: var(--ap-size-control); padding: 0 18px; font: inherit; font-size: var(--ap-font-size-body);
  font-weight: var(--ap-font-weight-semibold); color: var(--ap-color-on-accent); background: var(--ap-color-accent);
  border: 1px solid var(--ap-color-accent); border-radius: var(--ap-radius-control); cursor: pointer; transition: filter var(--ap-motion-standard); }
.ap-primary:hover { filter: brightness(.94); }
.ap-primary:disabled { opacity: .5; cursor: not-allowed; filter: none; }
.ap-primary.busy { pointer-events: none; }
.ap-spin { width: 15px; height: 15px; border: 2px solid color-mix(in srgb, var(--ap-color-on-accent) 45%, transparent);
  border-top-color: var(--ap-color-on-accent); border-radius: 50%; animation: apSpin .7s linear infinite; }
@keyframes apSpin { to { transform: rotate(360deg); } }

/* Logical insets so the magnifier and the text indent both flip under dir=rtl. */
.ap-search { position: relative; display: block; margin: 0 0 12px; }
.ap-search input { padding-inline-start: 36px; }
.ap-search svg { position: absolute; inset-inline-start: 11px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: var(--ap-color-text-soft); }
.ap-crumbs { display: flex; align-items: center; gap: 7px; font-size: var(--ap-font-size-sm); color: var(--ap-color-text-muted); margin: 0 0 10px; }
.ap-crumbs button { background: none; border: 0; padding: 0; font: inherit; font-size: var(--ap-font-size-sm); color: var(--ap-color-accent); cursor: pointer; }
.ap-crumbs button:hover { text-decoration: underline; }
.ap-crumbs svg { width: 14px; height: 14px; color: var(--ap-color-text-soft); }
.ap-list { border: 1px solid var(--ap-color-border); border-radius: var(--ap-radius-control); overflow: hidden; }
.ap-list.scroll { max-height: 352px; overflow-y: auto; }
.ap-cat, .ap-svc { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; background: var(--ap-color-surface);
  border: 0; border-top: 1px solid var(--ap-color-border); padding: 12px 14px; font: inherit; color: var(--ap-color-text);
  cursor: pointer; transition: background var(--ap-motion-standard); }
.ap-cat:first-child, .ap-svc:first-child { border-top: 0; }
.ap-cat:hover, .ap-svc:hover { background: var(--ap-color-row-hover); }
.ap-cat .txt { flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 14px; }
.ap-cat .txt .ap-item-title { display: block; }
.ap-cat .txt small { margin-left: auto; font-size: var(--ap-font-size-sm); color: var(--ap-color-text-soft); white-space: nowrap; }
.ap-cat .chev { color: var(--ap-color-text-soft); }
.ap-svc { align-items: flex-start; }
.ap-svc .txt { flex: 1; min-width: 0; }
.ap-svc .txt .ap-item-title { display: block; }
.ap-svc .txt small { display: block; font-size: var(--ap-font-size-sm); color: var(--ap-color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ap-svc .txt .path { color: var(--ap-color-text-soft); }
.ap-svc .meta { flex: 0 0 auto; text-align: end; line-height: 1.3; }
.ap-svc .meta .price { display: block; font-size: var(--ap-font-size-body); font-weight: var(--ap-font-weight-semibold); font-variant-numeric: tabular-nums; }
.ap-svc .meta .dur { display: block; font-size: var(--ap-font-size-xs); color: var(--ap-color-text-muted); }
/* Degradations the reference dataset never shows (it has a description and a price
   on every service): a description-less row is one line, so it centers instead of
   top-aligning; a price-less row promotes its lone duration out of micro-type. */
.ap-svc.is-single { align-items: center; }
.ap-svc.no-price .meta .dur { font-size: var(--ap-font-size-sm); color: var(--ap-color-text-muted); }
.ap-svc[aria-pressed="true"] { background: var(--ap-color-accent-subtle); }
.ap-svc .tick { flex: 0 0 auto; width: var(--ap-size-selection); height: var(--ap-size-selection); border-radius: 50%;
  border: 1.5px solid var(--ap-color-border-strong); display: grid; place-items: center; margin-inline-start: 2px; }
.ap-svc[aria-pressed="true"] .tick { border-color: var(--ap-color-accent); background: var(--ap-color-accent); color: var(--ap-color-on-accent); }
.ap-svc .tick svg { width: 11px; height: 11px; opacity: 0; }
.ap-svc[aria-pressed="true"] .tick svg { opacity: 1; }
.ap-empty { padding: 26px 14px; text-align: center; color: var(--ap-color-text-muted); font-size: var(--ap-font-size-body); }
.ap-change-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin: 0 0 16px; }
.ap-change-row .info b { display: block; }
.ap-change-row .info small { color: var(--ap-color-text-muted); font-size: var(--ap-font-size-sm); }
.ap-change-row button { background: none; border: 0; color: var(--ap-color-accent); font: inherit; font-size: var(--ap-font-size-sm); cursor: pointer; white-space: nowrap; }
.ap-change-row button:hover { text-decoration: underline; }
.ap-fixed { display: flex; align-items: center; gap: 12px; border: 1px solid var(--ap-color-border);
  border-radius: var(--ap-radius-control); padding: 12px; margin: 0 0 16px; }
.ap-fixed .mark { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center;
  background: var(--ap-color-accent-soft); color: var(--ap-color-accent); font-weight: var(--ap-font-weight-semibold); font-size: var(--ap-font-size-sm); }
.ap-fixed b { display: block; font-size: var(--ap-font-size-sm); }
.ap-fixed small { display: block; color: var(--ap-color-text-muted); font-size: var(--ap-font-size-xs); }

.ap-cal-head { display: flex; align-items: center; justify-content: space-between; margin: 0 0 8px; }
.ap-cal-period { display: flex; align-items: center; gap: var(--ap-space-1); }
/* background-color, not the background shorthand: the shorthand would reset the
 * chevron background-image set by the appearance opt-out above. */
.ap-cal-select { height: var(--ap-size-calendar-nav); padding: 0 26px 0 9px; border: 1px solid var(--ap-color-border);
  border-radius: var(--ap-radius-small); background-color: var(--ap-color-surface); color: var(--ap-color-text); font: inherit;
  font-size: var(--ap-font-size-sm); font-weight: var(--ap-font-weight-medium); cursor: pointer; outline: none; }
.ap-cal-select.month { min-width: 112px; }
.ap-cal-select.year { min-width: 76px; }
.ap-cal-select:hover { border-color: var(--ap-color-border-strong); }
.ap-cal-select:focus { border-color: var(--ap-color-accent); }
.ap-cal-nav { display: flex; gap: 4px; }
.ap-cal-nav button { width: var(--ap-size-calendar-nav); height: var(--ap-size-calendar-nav); border: 1px solid var(--ap-color-border);
  background: var(--ap-color-surface); border-radius: var(--ap-radius-small); color: var(--ap-color-text); cursor: pointer; display: grid; place-items: center; }
.ap-cal-nav button:hover:not(:disabled) { background: var(--ap-color-surface-subtle); }
.ap-cal-nav button:disabled { color: var(--ap-color-text-soft); cursor: not-allowed; opacity: .55; }
.ap-dow { display: grid; grid-template-columns: repeat(7, 1fr); background: var(--ap-color-surface-muted); border-radius: var(--ap-radius-small); }
.ap-dow span { text-align: center; padding: 5px 0; font-size: var(--ap-font-size-xs); font-weight: var(--ap-font-weight-medium); color: var(--ap-color-text-soft); }
.ap-cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-top: 4px; }
.ap-day { position: relative; height: var(--ap-size-control); display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 3px; border: 0; background: none; font: inherit; font-size: var(--ap-font-size-body);
  color: var(--ap-color-text); cursor: pointer; border-radius: var(--ap-radius-small); }
.ap-day .n { font-variant-numeric: tabular-nums; line-height: 1; }
.ap-day .bar { width: 20px; height: 3px; border-radius: 2px; background: var(--ap-color-border); }
.ap-day .bar i { display: block; height: 100%; border-radius: 2px; background: var(--ap-color-accent); }
.ap-day:hover:not(:disabled):not(.sel) { background: var(--ap-color-surface-subtle); }
.ap-day.today { font-weight: var(--ap-font-weight-semibold); }
.ap-day.today .n { position: relative; }
.ap-day.today .n::after { content: ""; position: absolute; left: 50%; bottom: -2px; transform: translateX(-50%); width: 3px; height: 3px; border-radius: 50%; background: var(--ap-color-accent); }
.ap-day:disabled { color: var(--ap-color-text-soft); cursor: not-allowed; }
.ap-day:disabled .bar { visibility: hidden; }
.ap-day.sel { background: var(--ap-color-accent-subtle); box-shadow: inset 0 0 0 1px var(--ap-color-accent); color: var(--ap-color-accent); font-weight: var(--ap-font-weight-semibold); }
.ap-day.sel .bar { background: var(--ap-color-accent-border); }
.ap-day.sel .bar i { background: var(--ap-color-accent); }
.ap-slots-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin: 18px 0 9px; padding-top: 16px; border-top: 1px solid var(--ap-color-border); }
.ap-slots-title { display: flex; align-items: baseline; gap: 7px; flex-wrap: wrap; }
.ap-slots-title .ap-item-title { font-size: var(--ap-font-size-body); }
.ap-slots-title small { font-size: var(--ap-font-size-xs); font-weight: var(--ap-font-weight-regular); color: var(--ap-color-text-soft); }
.ap-slots-count { flex: 0 0 auto; font-size: var(--ap-font-size-xs); color: var(--ap-color-text-soft); font-variant-numeric: tabular-nums; white-space: nowrap; }
/* Sits BELOW the slot grid (reference order), so the 10px is the gap to the chips. */
.ap-visitor-tz { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 10px 0 0; padding: 9px 10px;
  border: 1px solid var(--ap-color-border); border-radius: var(--ap-radius-control); background: var(--ap-color-surface-subtle);
  font-size: var(--ap-font-size-xs); color: var(--ap-color-text-muted); }
.ap-visitor-tz label { font-weight: var(--ap-font-weight-medium); color: var(--ap-color-text); }
.ap-visitor-tz select { height: var(--ap-size-calendar-nav); padding: 0 24px 0 8px; border: 1px solid var(--ap-color-border);
  border-radius: var(--ap-radius-control); background-color: var(--ap-color-surface); color: var(--ap-color-text); font: inherit; font-size: var(--ap-font-size-xs); }
.ap-visitor-tz small { width: 100%; color: var(--ap-color-text-muted); }
.ap-slots { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }
.ap-slot { height: var(--ap-size-control-compact); display: grid; place-items: center; border: 1px solid var(--ap-color-border);
  border-radius: var(--ap-radius-small); background: var(--ap-color-surface); font: inherit; font-size: var(--ap-font-size-sm);
  color: var(--ap-color-text); cursor: pointer; font-variant-numeric: tabular-nums; transition: border-color var(--ap-motion-standard), background var(--ap-motion-standard); }
.ap-slot:hover { border-color: var(--ap-color-accent); background: var(--ap-color-accent-subtle); }
.ap-slot[aria-checked="true"] { border-color: var(--ap-color-accent); background: var(--ap-color-accent-subtle); color: var(--ap-color-accent); font-weight: var(--ap-font-weight-semibold); }
.ap-slot.gone { opacity: .4; text-decoration: line-through; cursor: not-allowed; }
.ap-noslot { padding: 22px 12px; text-align: center; color: var(--ap-color-text-muted); font-size: var(--ap-font-size-body); border: 1px dashed var(--ap-color-border); border-radius: var(--ap-radius-control); }
@container apw (max-width: 619.98px) {
  .ap-slots { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .ap-slot { padding: 0 4px; white-space: nowrap; }
}

.ap-consent { display: flex; align-items: flex-start; gap: 9px; margin: 4px 0 12px; font-size: var(--ap-font-size-sm); color: var(--ap-color-text-muted); cursor: pointer; }
.ap-consent input { width: var(--ap-size-selection); height: var(--ap-size-selection); margin: 1px 0 0; flex: 0 0 auto; }
.ap-consent .req { color: var(--ap-color-danger); }
.ap-honeypot { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }

/* Payment (mockup paymentHTML). Method cards are labels wrapping a REAL radio —
 * platform grouping/arrow keys — so the dot is a sibling span and the 1px input
 * hands its focus ring to it. */
.ap-pay { display: flex; align-items: flex-start; gap: 11px; border: 1px solid var(--ap-color-border);
  border-radius: var(--ap-radius-control); padding: 12px 13px; margin: 0 0 9px; cursor: pointer; position: relative; }
.ap-pay.sel { border-color: var(--ap-color-accent); background: var(--ap-color-accent-subtle); }
.ap-pay input { position: absolute; inset-inline-start: 0; top: 0; width: 1px; height: 1px; margin: 0; opacity: 0; }
.ap-pay input:focus-visible { outline: none; }
.ap-pay input:focus-visible + .radio { outline: 2px solid var(--ap-color-accent-border); outline-offset: 2px; }
.ap-pay .radio { flex: 0 0 auto; width: 17px; height: 17px; margin-top: 1px; border-radius: 50%;
  border: 1.5px solid var(--ap-color-border-strong); display: grid; place-items: center; }
.ap-pay.sel .radio { border-color: var(--ap-color-accent); }
.ap-pay.sel .radio::after { content: ""; width: 9px; height: 9px; border-radius: 50%; background: var(--ap-color-accent); }
.ap-pay .txt .ap-item-title { display: block; }
.ap-pay .txt small { font-size: var(--ap-font-size-sm); color: var(--ap-color-text-muted); }
/* A gateway that owns the CTA has an attempt in flight: switching method there
 * releases a hold the gateway may be about to capture against (D-R40), so the
 * cards LOOK unavailable rather than only behaving that way. */
.ap-pay.locked { cursor: default; opacity: .55; }
.ap-card-shell { margin: 12px 0; border: 1px solid var(--ap-color-border); border-radius: var(--ap-radius-control);
  padding: 11px 12px; background: var(--ap-color-surface-subtle); }
.ap-card-shell[hidden] { display: none; }
.ap-card-shell .cap { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 0 0 7px;
  font-size: var(--ap-font-size-xs); font-weight: var(--ap-font-weight-semibold); letter-spacing: .04em;
  text-transform: uppercase; color: var(--ap-color-text-soft); }
.ap-pay-deadline { margin: 0 0 10px; font-size: var(--ap-font-size-sm); color: var(--ap-color-text-muted); }
.ap-pay-loading { margin: 0; font-size: var(--ap-font-size-sm); color: var(--ap-color-text-muted); }
.ap-pay-hint { margin: 0 0 4px; font-size: var(--ap-font-size-sm); color: var(--ap-color-text-muted); }
.ap-pay-error { margin: 0; font-size: var(--ap-font-size-sm); color: var(--ap-color-danger); }
.ap-pay-error:empty { display: none; }
.ap-note { border: 1px solid var(--ap-color-border); background: var(--ap-color-surface-subtle);
  border-radius: var(--ap-radius-control); padding: 11px 13px; margin: 12px 0 0;
  font-size: var(--ap-font-size-sm); color: var(--ap-color-text-muted); }
.ap-note-actions { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 6px; }
.ap-link { background: none; border: 0; padding: 0; font: inherit; color: var(--ap-color-accent);
  text-decoration: underline; cursor: pointer; }
.ap-paid-line { margin: 8px 0 0; font-size: var(--ap-font-size-sm); color: var(--ap-color-text-muted); }

/* Summary. One .ap-summary-body serves both placements; only the .ap-aside-scoped
 * rules differ, and they change layout, never content. .ap-sum-title is an <h2> in
 * the sidebar (landmark name), so it must reset the UA heading metrics. */
.ap-sum-title { font-size: var(--ap-font-size-xs); font-weight: var(--ap-font-weight-semibold); letter-spacing: .04em;
  text-transform: uppercase; color: var(--ap-color-text-soft); line-height: var(--ap-line-height-body); margin: 0 0 12px; }
.ap-sum-svc { font-size: var(--ap-font-size-control); font-weight: var(--ap-font-weight-medium); margin: 0 0 2px; }
.ap-sum-sub { font-size: var(--ap-font-size-sm); color: var(--ap-color-text-muted); margin: 0 0 14px; }
.ap-line { display: flex; align-items: baseline; gap: 5px; margin: 5px 0; font-size: var(--ap-font-size-sm); }
.ap-line .l { color: var(--ap-color-text-muted); white-space: nowrap; }
.ap-line .d { flex: 1; border-bottom: 1px dotted var(--ap-color-border-strong); transform: translateY(-3px); }
.ap-line .v { color: var(--ap-color-text); font-variant-numeric: tabular-nums; white-space: nowrap; text-align: end; }
.ap-sum-biz { margin: 8px 0 0; font-size: var(--ap-font-size-xs); color: var(--ap-color-text-soft); }
.ap-sum-total { display: flex; justify-content: space-between; gap: 10px; margin-top: 12px; padding-top: 11px;
  border-top: 1px solid var(--ap-color-border-strong); font-weight: var(--ap-font-weight-semibold); font-size: var(--ap-font-size-sm); }
.ap-sum-total .v { font-variant-numeric: tabular-nums; }
.ap-sum-empty { font-size: var(--ap-font-size-sm); color: var(--ap-color-text-soft); line-height: 1.5; }
.ap-summary-body { min-height: 0; }
/* Structural only: the reference's caption + price lines are P3/P4, so in V1 the
 * section exists purely to be pinned and the total keeps the single divider. */
.ap-sum-sec { margin: 15px 0 0; }
.ap-sum-sec > .ap-sum-total:first-child { margin-top: 0; }
/* Sidebar only: item area scrolls, total pins to the column bottom (mockup §5).
 * In the accordion the same markup stays plain flow — the panel scrolls instead. */
.ap-aside .ap-summary-body { display: flex; flex: 1; flex-direction: column; min-height: 0; }
.ap-aside .ap-sum-scroll { min-height: 0; overflow-y: auto; overflow-wrap: anywhere; margin-inline-end: -5px; padding-inline-end: 5px; }
.ap-aside .ap-sum-sec { flex: 0 0 auto; margin-top: auto; }
/* At the 240px rail the date label + time range do not fit on one line, and
 * overflow-y:auto computes overflow-x to auto — so without this the column grows a
 * horizontal scrollbar. Wrapping drops the range to its own end-aligned line. */
.ap-aside .ap-line { flex-wrap: wrap; }
.ap-aside .ap-line .v { margin-inline-start: auto; }

.ap-done { text-align: center; padding: 6px 0 2px; }
.ap-check { width: 52px; height: 52px; margin: 0 auto 12px; border-radius: 50%; display: grid; place-items: center; color: var(--ap-color-on-inverse); background: var(--ap-color-success); }
.ap-check svg { width: 26px; height: 26px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.ap-done h2 { margin: 0 0 3px; color: var(--ap-color-heading); font-size: var(--ap-font-size-heading); font-weight: var(--ap-font-weight-semibold); letter-spacing: var(--ap-letter-spacing-title); }
.ap-done .lead { margin: 0; color: var(--ap-color-text-muted); font-size: var(--ap-font-size-body); }
.ap-done .tz { margin: 4px 0 0; font-size: var(--ap-font-size-sm); color: var(--ap-color-text-soft); }
.ap-order { display: inline-block; margin: 12px 0 0; font-size: var(--ap-font-size-xs); font-weight: var(--ap-font-weight-semibold);
  letter-spacing: .04em; color: var(--ap-color-text-muted); background: var(--ap-color-surface-muted); border-radius: var(--ap-radius-pill); padding: 4px 11px; }
.ap-order-code { color: var(--ap-color-text); font-weight: var(--ap-font-weight-semibold); }
.ap-conf-card { display: flex; align-items: center; gap: 14px; text-align: left; border: 1px solid var(--ap-color-border); border-radius: var(--ap-radius-control); padding: 13px 14px; margin: 18px 0 0; }
.ap-tile { flex: 0 0 auto; width: 50px; text-align: center; border: 1px solid var(--ap-color-border); border-radius: var(--ap-radius-small); overflow: hidden; }
.ap-tile .d { font-size: 18px; font-weight: var(--ap-font-weight-semibold); padding: 5px 0 3px; line-height: 1; font-variant-numeric: tabular-nums; }
.ap-tile .m { font-size: var(--ap-font-size-xs); font-weight: var(--ap-font-weight-medium); letter-spacing: .04em; text-transform: uppercase; color: var(--ap-color-text-muted); background: var(--ap-color-surface-muted); padding: 3px 0; }
.ap-conf-card .info .ap-item-title { display: block; }
.ap-conf-card .info small { display: block; font-size: var(--ap-font-size-sm); color: var(--ap-color-text-muted); }
.ap-conf-card .info small.tz { font-size: var(--ap-font-size-xs); color: var(--ap-color-text-soft); }
.ap-cal-tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 16px 0 14px; }
.ap-cal-tile { display: flex; flex-direction: column; align-items: center; gap: 5px; border: 1px solid var(--ap-color-border);
  border-radius: var(--ap-radius-control); padding: 11px 4px; background: var(--ap-color-surface); color: var(--ap-color-text); font: inherit;
  font-size: var(--ap-font-size-xs); font-weight: var(--ap-font-weight-medium); text-decoration: none; cursor: pointer;
  transition: border-color var(--ap-motion-standard), background var(--ap-motion-standard); }
.ap-cal-tile:hover { border-color: var(--ap-color-border-strong); background: var(--ap-color-surface-subtle); }
.ap-cal-tile svg { width: 19px; height: 19px; }
.ap-conf-actions { display: flex; justify-content: center; gap: 18px; margin: 18px 0 6px; font-size: var(--ap-font-size-sm); }
.ap-conf-actions button { background: none; border: 0; color: var(--ap-color-accent); font: inherit; font-size: var(--ap-font-size-sm); cursor: pointer; }
.ap-conf-actions button:hover { text-decoration: underline; }

.ap-sk { background: var(--ap-color-surface-muted); border-radius: var(--ap-radius-small); position: relative; overflow: hidden; }
.ap-sk::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ap-color-surface) 60%, transparent), transparent); transform: translateX(-100%); animation: apSk 1.15s infinite; }
@keyframes apSk { to { transform: translateX(100%); } }
.ap-sk-row { display: flex; align-items: center; gap: 11px; padding: 12px 0; border-top: 1px solid var(--ap-color-border); }
.ap-sk-row:first-child { border-top: 0; }

.ap-banner { display: flex; gap: 10px; align-items: flex-start; border: 1px solid var(--ap-color-border); border-radius: var(--ap-radius-control); padding: 12px 13px; font-size: var(--ap-font-size-sm); margin: 0 0 14px; }
.ap-banner svg { margin-top: 1px; width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.ap-banner b { font-weight: var(--ap-font-weight-semibold); }
.ap-banner .mut { color: var(--ap-color-text-muted); }
.ap-banner.warn { background: var(--ap-color-warning-subtle); border-color: var(--ap-color-warning-border); color: var(--ap-color-on-warning); }
.ap-banner.warn svg { color: var(--ap-color-warning); }
.ap-banner.err { background: var(--ap-color-danger-subtle); border-color: var(--ap-color-danger-border); color: var(--ap-color-on-danger); }
.ap-banner.err svg { color: var(--ap-color-danger); }
.ap-banner.info { background: var(--ap-color-info-subtle); border-color: var(--ap-color-info-border); color: var(--ap-color-on-info); }
.ap-banner.info svg { color: var(--ap-color-info); }

.ap-toast { position: absolute; left: 50%; top: 12px; transform: translateX(-50%); z-index: 20; display: flex; align-items: center; gap: 9px;
  max-width: calc(100% - 32px); background: var(--ap-color-inverse-surface); color: var(--ap-color-on-inverse); font-size: var(--ap-font-size-sm);
  padding: 9px 13px; border-radius: var(--ap-radius-control); }
.ap-toast svg { width: 16px; height: 16px; flex: 0 0 auto; color: var(--ap-color-on-inverse-danger); stroke: currentColor; fill: none; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.ap-toast b { font-weight: var(--ap-font-weight-semibold); }
.ap-toast .toast-copy { display: flex; flex-direction: column; }

/* Scoped to .ap-main: "Summary surfaces stay still" (mockup README §5). */
@keyframes apStepUp { from { opacity: 0; transform: translate3d(0, var(--ap-motion-step-distance), 0); } to { opacity: 1; transform: translate3d(0, 0, 0); } }
.ap-main.ap-motion-forward .ap-step > * { animation: apStepUp var(--ap-motion-step-duration) var(--ap-motion-step-easing) both; }
.ap-main.ap-motion-forward .ap-step > *:nth-child(2) { animation-delay: var(--ap-motion-stagger); }
.ap-main.ap-motion-forward .ap-step > *:nth-child(3) { animation-delay: calc(var(--ap-motion-stagger) * 2); }
.ap-main.ap-motion-forward .ap-step > *:nth-child(n+4) { animation-delay: calc(var(--ap-motion-stagger) * 3); }

@container apw (max-width: 619.98px) {
  .ap-cal-tiles { grid-template-columns: repeat(2, 1fr); }
  .ap-conf-actions { flex-direction: column; align-items: center; gap: 8px; }
}

@media (prefers-reduced-motion: reduce) {
  .ap-recap-panel, .ap-recap-chev svg { transition: none; }
  .ap-main.ap-motion-forward .ap-step > *, .ap-sk::after, .ap-spin { animation: none; opacity: 1; transform: none; }
}

/* Forced colors (Windows High Contrast). The appearance:none opt-outs above trade
 * platform chrome for painted tokens — a background-color for the checked box, a
 * background-image for the tick and the chevron. Forced-colors mode overrides
 * author colors and drops background images, so those controls lose exactly the
 * paint that carried their state: a checked consent box reads as an empty square.
 * Hand them back to the platform, which paints an always-visible HC checkmark and
 * arrow, and drop the author decoration that would otherwise sit on top. */
@media (forced-colors: active) {
  .ap-consent input, .ap-select, .ap-cal-select, .ap-visitor-tz select {
    appearance: auto; -webkit-appearance: auto;
    background-image: none;
  }
  .ap-consent input, .ap-consent input:hover, .ap-consent input:checked {
    border: 0; background: none;
  }
}
`;
const SHADOW_CSS = TOKENS + COMPONENTS;

/***/ },

/***/ "./node_modules/preact/dist/preact.module.js"
/*!***************************************************!*\
  !*** ./node_modules/preact/dist/preact.module.js ***!
  \***************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Component: () => (/* binding */ C),
/* harmony export */   Fragment: () => (/* binding */ S),
/* harmony export */   cloneElement: () => (/* binding */ W),
/* harmony export */   createContext: () => (/* binding */ X),
/* harmony export */   createElement: () => (/* binding */ k),
/* harmony export */   createRef: () => (/* binding */ M),
/* harmony export */   h: () => (/* binding */ k),
/* harmony export */   hydrate: () => (/* binding */ U),
/* harmony export */   isValidElement: () => (/* binding */ t),
/* harmony export */   options: () => (/* binding */ l),
/* harmony export */   render: () => (/* binding */ R),
/* harmony export */   toChildArray: () => (/* binding */ F)
/* harmony export */ });
var n,l,u,t,i,r,o,e,f,c,a,s,h,p,v,y,d={},w=[],_=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,g=Array.isArray;function m(n,l){for(var u in l)n[u]=l[u];return n}function b(n){n&&n.parentNode&&n.parentNode.removeChild(n)}function k(l,u,t){var i,r,o,e={};for(o in u)"key"==o?i=u[o]:"ref"==o?r=u[o]:e[o]=u[o];if(arguments.length>2&&(e.children=arguments.length>3?n.call(arguments,2):t),"function"==typeof l&&null!=l.defaultProps)for(o in l.defaultProps)void 0===e[o]&&(e[o]=l.defaultProps[o]);return x(l,e,i,r,null)}function x(n,t,i,r,o){var e={type:n,props:t,key:i,ref:r,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:null==o?++u:o,__i:-1,__u:0};return null==o&&null!=l.vnode&&l.vnode(e),e}function M(){return{current:null}}function S(n){return n.children}function C(n,l){this.props=n,this.context=l}function $(n,l){if(null==l)return n.__?$(n.__,n.__i+1):null;for(var u;l<n.__k.length;l++)if(null!=(u=n.__k[l])&&null!=u.__e)return u.__e;return"function"==typeof n.type?$(n):null}function I(n){if(n.__P&&n.__d){var u=n.__v,t=u.__e,i=[],r=[],o=m({},u);o.__v=u.__v+1,l.vnode&&l.vnode(o),q(n.__P,o,u,n.__n,n.__P.namespaceURI,32&u.__u?[t]:null,i,null==t?$(u):t,!!(32&u.__u),r),o.__v=u.__v,o.__.__k[o.__i]=o,D(i,o,r),u.__e=u.__=null,o.__e!=t&&P(o)}}function P(n){if(null!=(n=n.__)&&null!=n.__c)return n.__e=n.__c.base=null,n.__k.some(function(l){if(null!=l&&null!=l.__e)return n.__e=n.__c.base=l.__e}),P(n)}function A(n){(!n.__d&&(n.__d=!0)&&i.push(n)&&!H.__r++||r!=l.debounceRendering)&&((r=l.debounceRendering)||o)(H)}function H(){try{for(var n,l=1;i.length;)i.length>l&&i.sort(e),n=i.shift(),l=i.length,I(n)}finally{i.length=H.__r=0}}function L(n,l,u,t,i,r,o,e,f,c,a){var s,h,p,v,y,_,g,m=t&&t.__k||w,b=l.length;for(f=T(u,l,m,f,b),s=0;s<b;s++)null!=(p=u.__k[s])&&(h=-1!=p.__i&&m[p.__i]||d,p.__i=s,_=q(n,p,h,i,r,o,e,f,c,a),v=p.__e,p.ref&&h.ref!=p.ref&&(h.ref&&J(h.ref,null,p),a.push(p.ref,p.__c||v,p)),null==y&&null!=v&&(y=v),(g=!!(4&p.__u))||h.__k===p.__k?(f=j(p,f,n,g),g&&h.__e&&(h.__e=null)):"function"==typeof p.type&&void 0!==_?f=_:v&&(f=v.nextSibling),p.__u&=-7);return u.__e=y,f}function T(n,l,u,t,i){var r,o,e,f,c,a=u.length,s=a,h=0;for(n.__k=new Array(i),r=0;r<i;r++)null!=(o=l[r])&&"boolean"!=typeof o&&"function"!=typeof o?("string"==typeof o||"number"==typeof o||"bigint"==typeof o||o.constructor==String?o=n.__k[r]=x(null,o,null,null,null):g(o)?o=n.__k[r]=x(S,{children:o},null,null,null):void 0===o.constructor&&o.__b>0?o=n.__k[r]=x(o.type,o.props,o.key,o.ref?o.ref:null,o.__v):n.__k[r]=o,f=r+h,o.__=n,o.__b=n.__b+1,e=null,-1!=(c=o.__i=O(o,u,f,s))&&(s--,(e=u[c])&&(e.__u|=2)),null==e||null==e.__v?(-1==c&&(i>a?h--:i<a&&h++),"function"!=typeof o.type&&(o.__u|=4)):c!=f&&(c==f-1?h--:c==f+1?h++:(c>f?h--:h++,o.__u|=4))):n.__k[r]=null;if(s)for(r=0;r<a;r++)null!=(e=u[r])&&0==(2&e.__u)&&(e.__e==t&&(t=$(e)),K(e,e));return t}function j(n,l,u,t){var i,r;if("function"==typeof n.type){for(i=n.__k,r=0;i&&r<i.length;r++)i[r]&&(i[r].__=n,l=j(i[r],l,u,t));return l}n.__e!=l&&(t&&(l&&n.type&&!l.parentNode&&(l=$(n)),u.insertBefore(n.__e,l||null)),l=n.__e);do{l=l&&l.nextSibling}while(null!=l&&8==l.nodeType);return l}function F(n,l){return l=l||[],null==n||"boolean"==typeof n||(g(n)?n.some(function(n){F(n,l)}):l.push(n)),l}function O(n,l,u,t){var i,r,o,e=n.key,f=n.type,c=l[u],a=null!=c&&0==(2&c.__u);if(null===c&&null==e||a&&e==c.key&&f==c.type)return u;if(t>(a?1:0))for(i=u-1,r=u+1;i>=0||r<l.length;)if(null!=(c=l[o=i>=0?i--:r++])&&0==(2&c.__u)&&e==c.key&&f==c.type)return o;return-1}function z(n,l,u){"-"==l[0]?n.setProperty(l,null==u?"":u):n[l]=null==u?"":"number"!=typeof u||_.test(l)?u:u+"px"}function N(n,l,u,t,i){var r,o;n:if("style"==l)if("string"==typeof u)n.style.cssText=u;else{if("string"==typeof t&&(n.style.cssText=t=""),t)for(l in t)u&&l in u||z(n.style,l,"");if(u)for(l in u)t&&u[l]==t[l]||z(n.style,l,u[l])}else if("o"==l[0]&&"n"==l[1])r=l!=(l=l.replace(s,"$1")),o=l.toLowerCase(),l=o in n||"onFocusOut"==l||"onFocusIn"==l?o.slice(2):l.slice(2),n.l||(n.l={}),n.l[l+r]=u,u?t?u[a]=t[a]:(u[a]=h,n.addEventListener(l,r?v:p,r)):n.removeEventListener(l,r?v:p,r);else{if("http://www.w3.org/2000/svg"==i)l=l.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if("width"!=l&&"height"!=l&&"href"!=l&&"list"!=l&&"form"!=l&&"tabIndex"!=l&&"download"!=l&&"rowSpan"!=l&&"colSpan"!=l&&"role"!=l&&"popover"!=l&&l in n)try{n[l]=null==u?"":u;break n}catch(n){}"function"==typeof u||(null==u||!1===u&&"-"!=l[4]?n.removeAttribute(l):n.setAttribute(l,"popover"==l&&1==u?"":u))}}function V(n){return function(u){if(this.l){var t=this.l[u.type+n];if(null==u[c])u[c]=h++;else if(u[c]<t[a])return;return t(l.event?l.event(u):u)}}}function q(n,u,t,i,r,o,e,f,c,a){var s,h,p,v,y,d,_,k,x,M,$,I,P,A,H,T,j=u.type;if(void 0!==u.constructor)return null;128&t.__u&&(c=!!(32&t.__u),o=[f=u.__e=t.__e]),(s=l.__b)&&s(u);n:if("function"==typeof j){h=e.length;try{if(x=u.props,M=j.prototype&&j.prototype.render,$=(s=j.contextType)&&i[s.__c],I=s?$?$.props.value:s.__:i,t.__c?k=(p=u.__c=t.__c).__=p.__E:(M?u.__c=p=new j(x,I):(u.__c=p=new C(x,I),p.constructor=j,p.render=Q),$&&$.sub(p),p.state||(p.state={}),p.__n=i,v=p.__d=!0,p.__h=[],p._sb=[]),M&&null==p.__s&&(p.__s=p.state),M&&null!=j.getDerivedStateFromProps&&(p.__s==p.state&&(p.__s=m({},p.__s)),m(p.__s,j.getDerivedStateFromProps(x,p.__s))),y=p.props,d=p.state,p.__v=u,v)M&&null==j.getDerivedStateFromProps&&null!=p.componentWillMount&&p.componentWillMount(),M&&null!=p.componentDidMount&&p.__h.push(p.componentDidMount);else{if(M&&null==j.getDerivedStateFromProps&&x!==y&&null!=p.componentWillReceiveProps&&p.componentWillReceiveProps(x,I),u.__v==t.__v||!p.__e&&null!=p.shouldComponentUpdate&&!1===p.shouldComponentUpdate(x,p.__s,I)){u.__v!=t.__v&&(p.props=x,p.state=p.__s,p.__d=!1),u.__e=t.__e,u.__k=t.__k,u.__k.some(function(n){n&&(n.__=u)}),w.push.apply(p.__h,p._sb),p._sb=[],p.__h.length&&e.push(p);break n}null!=p.componentWillUpdate&&p.componentWillUpdate(x,p.__s,I),M&&null!=p.componentDidUpdate&&p.__h.push(function(){p.componentDidUpdate(y,d,_)})}if(p.context=I,p.props=x,p.__P=n,p.__e=!1,P=l.__r,A=0,M)p.state=p.__s,p.__d=!1,P&&P(u),s=p.render(p.props,p.state,p.context),w.push.apply(p.__h,p._sb),p._sb=[];else do{p.__d=!1,P&&P(u),s=p.render(p.props,p.state,p.context),p.state=p.__s}while(p.__d&&++A<25);p.state=p.__s,null!=p.getChildContext&&(i=m(m({},i),p.getChildContext())),M&&!v&&null!=p.getSnapshotBeforeUpdate&&(_=p.getSnapshotBeforeUpdate(y,d)),H=null!=s&&s.type===S&&null==s.key?E(s.props.children):s,f=L(n,g(H)?H:[H],u,t,i,r,o,e,f,c,a),p.base=u.__e,u.__u&=-161,p.__h.length&&e.push(p),k&&(p.__E=p.__=null)}catch(n){if(e.length=h,u.__v=null,c||null!=o){if(n.then){for(u.__u|=c?160:128;f&&8==f.nodeType&&f.nextSibling;)f=f.nextSibling;null!=o&&(o[o.indexOf(f)]=null),u.__e=f}else if(null!=o)for(T=o.length;T--;)b(o[T])}else u.__e=t.__e;null==u.__k&&(u.__k=t.__k||[]),n.then||B(u),l.__e(n,u,t)}}else null==o&&u.__v==t.__v?(u.__k=t.__k,u.__e=t.__e):f=u.__e=G(t.__e,u,t,i,r,o,e,c,a);return(s=l.diffed)&&s(u),128&u.__u?void 0:f}function B(n){n&&(n.__c&&(n.__c.__e=!0),n.__k&&n.__k.some(B))}function D(n,u,t){for(var i=0;i<t.length;i++)J(t[i],t[++i],t[++i]);l.__c&&l.__c(u,n),n.some(function(u){try{n=u.__h,u.__h=[],n.some(function(n){n.call(u)})}catch(n){l.__e(n,u.__v)}})}function E(n){return"object"!=typeof n||null==n||n.__b>0?n:g(n)?n.map(E):void 0!==n.constructor?null:m({},n)}function G(u,t,i,r,o,e,f,c,a){var s,h,p,v,y,w,_,m=i.props||d,k=t.props,x=t.type;if("svg"==x?o="http://www.w3.org/2000/svg":"math"==x?o="http://www.w3.org/1998/Math/MathML":o||(o="http://www.w3.org/1999/xhtml"),null!=e)for(s=0;s<e.length;s++)if((y=e[s])&&"setAttribute"in y==!!x&&(x?y.localName==x:3==y.nodeType)){u=y,e[s]=null;break}if(null==u){if(null==x)return document.createTextNode(k);u=document.createElementNS(o,x,k.is&&k),c&&(l.__m&&l.__m(t,e),c=!1),e=null}if(null==x)m===k||c&&u.data==k||(u.data=k);else{if(e="textarea"==x&&null!=k.defaultValue?null:e&&n.call(u.childNodes),!c&&null!=e)for(m={},s=0;s<u.attributes.length;s++)m[(y=u.attributes[s]).name]=y.value;for(s in m)y=m[s],"dangerouslySetInnerHTML"==s?p=y:"children"==s||s in k||"value"==s&&"defaultValue"in k||"checked"==s&&"defaultChecked"in k||N(u,s,null,y,o);for(s in k)y=k[s],"children"==s?v=y:"dangerouslySetInnerHTML"==s?h=y:"value"==s?w=y:"checked"==s?_=y:c&&"function"!=typeof y||m[s]===y||N(u,s,y,m[s],o);if(h)c||p&&(h.__html==p.__html||h.__html==u.innerHTML)||(u.innerHTML=h.__html),t.__k=[];else if(p&&(u.innerHTML=""),L("template"==t.type?u.content:u,g(v)?v:[v],t,i,r,"foreignObject"==x?"http://www.w3.org/1999/xhtml":o,e,f,e?e[0]:i.__k&&$(i,0),c,a),null!=e)for(s=e.length;s--;)b(e[s]);c&&"textarea"!=x||(s="value","progress"==x&&null==w?u.removeAttribute("value"):null!=w&&(w!==u[s]||"progress"==x&&!w||"option"==x&&w!=m[s])&&N(u,s,w,m[s],o),s="checked",null!=_&&_!=u[s]&&N(u,s,_,m[s],o))}return u}function J(n,u,t){try{if("function"==typeof n){var i="function"==typeof n.__u;i&&n.__u(),i&&null==u||(n.__u=n(u))}else n.current=u}catch(n){l.__e(n,t)}}function K(n,u,t){var i,r;if(l.unmount&&l.unmount(n),(i=n.ref)&&(i.current&&i.current!=n.__e||J(i,null,u)),null!=(i=n.__c)){if(i.componentWillUnmount)try{i.componentWillUnmount()}catch(n){l.__e(n,u)}i.base=i.__P=i.__n=null}if(i=n.__k)for(r=0;r<i.length;r++)i[r]&&K(i[r],u,t||"function"!=typeof n.type);t||b(n.__e),n.__c=n.__=n.__e=void 0}function Q(n,l,u){return this.constructor(n,u)}function R(u,t,i){var r,o,e,f;t==document&&(t=document.documentElement),l.__&&l.__(u,t),o=(r="function"==typeof i)?null:i&&i.__k||t.__k,e=[],f=[],q(t,u=(!r&&i||t).__k=k(S,null,[u]),o||d,d,t.namespaceURI,!r&&i?[i]:o?null:t.firstChild?n.call(t.childNodes):null,e,!r&&i?i:o?o.__e:t.firstChild,r,f),D(e,u,f),u.props.children=null}function U(n,l){R(n,l,U)}function W(l,u,t){var i,r,o,e,f=m({},l.props);for(o in l.type&&l.type.defaultProps&&(e=l.type.defaultProps),u)"key"==o?i=u[o]:"ref"==o?r=u[o]:f[o]=void 0===u[o]&&null!=e?e[o]:u[o];return arguments.length>2&&(f.children=arguments.length>3?n.call(arguments,2):t),x(l.type,f,i||l.key,r||l.ref,null)}function X(n){function l(n){var u,t;return this.getChildContext||(u=new Set,(t={})[l.__c]=this,this.getChildContext=function(){return t},this.componentWillUnmount=function(){u=null},this.shouldComponentUpdate=function(n){this.props.value!=n.value&&u.forEach(function(n){n.__e=!0,A(n)})},this.sub=function(n){u.add(n);var l=n.componentWillUnmount;n.componentWillUnmount=function(){u&&u.delete(n),l&&l.call(n)}}),n.children}return l.__c="__cC"+y++,l.__=n,l.Provider=l.__l=(l.Consumer=function(n,l){return n.children(l)}).contextType=l,l}n=w.slice,l={__e:function(n,l,u,t){for(var i,r,o;l=l.__;)if((i=l.__c)&&!i.__)try{if((r=i.constructor)&&null!=r.getDerivedStateFromError&&(i.setState(r.getDerivedStateFromError(n)),o=i.__d),null!=i.componentDidCatch&&(i.componentDidCatch(n,t||{}),o=i.__d),o)return i.__E=i}catch(l){n=l}throw n}},u=0,t=function(n){return null!=n&&void 0===n.constructor},C.prototype.setState=function(n,l){var u;u=null!=this.__s&&this.__s!=this.state?this.__s:this.__s=m({},this.state),"function"==typeof n&&(n=n(m({},u),this.props)),n&&m(u,n),null!=n&&this.__v&&(l&&this._sb.push(l),A(this))},C.prototype.forceUpdate=function(n){this.__v&&(this.__e=!0,n&&this.__h.push(n),A(this))},C.prototype.render=S,i=[],o="function"==typeof Promise?Promise.prototype.then.bind(Promise.resolve()):setTimeout,e=function(n,l){return n.__v.__b-l.__v.__b},H.__r=0,f=Math.random().toString(8),c="__d"+f,a="__a"+f,s=/(PointerCapture)$|Capture$/i,h=0,p=V(!1),v=V(!0),y=0;
//# sourceMappingURL=preact.module.js.map


/***/ },

/***/ "./node_modules/preact/hooks/dist/hooks.module.js"
/*!********************************************************!*\
  !*** ./node_modules/preact/hooks/dist/hooks.module.js ***!
  \********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   useCallback: () => (/* binding */ q),
/* harmony export */   useContext: () => (/* binding */ x),
/* harmony export */   useDebugValue: () => (/* binding */ P),
/* harmony export */   useEffect: () => (/* binding */ h),
/* harmony export */   useErrorBoundary: () => (/* binding */ b),
/* harmony export */   useId: () => (/* binding */ g),
/* harmony export */   useImperativeHandle: () => (/* binding */ F),
/* harmony export */   useLayoutEffect: () => (/* binding */ _),
/* harmony export */   useMemo: () => (/* binding */ T),
/* harmony export */   useReducer: () => (/* binding */ y),
/* harmony export */   useRef: () => (/* binding */ A),
/* harmony export */   useState: () => (/* binding */ d)
/* harmony export */ });
/* harmony import */ var preact__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! preact */ "./node_modules/preact/dist/preact.module.js");
var t,r,u,i,o=0,f=[],c=preact__WEBPACK_IMPORTED_MODULE_0__.options,e=c.__b,a=c.__r,v=c.diffed,l=c.__c,m=c.unmount,p=c.__;function s(n,t){c.__h&&c.__h(r,n,o||t),o=0;var u=r.__H||(r.__H={__:[],__h:[]});return n>=u.__.length&&u.__.push({}),u.__[n]}function d(n){return o=1,y(D,n)}function y(n,u,i){var o=s(t++,2);if(o.t=n,!o.__c&&(o.__=[i?i(u):D(void 0,u),function(n){var t=o.__N?o.__N[0]:o.__[0],r=o.t(t,n);t!==r&&(o.__N=[r,o.__[1]],o.__c.setState({}))}],o.__c=r,!r.__f)){var f=function(n,t,r){if(!o.__c.__H)return!0;var u=!1,i=o.__c.props!==n;if(o.__c.__H.__.some(function(n){if(n.__N){u=!0;var t=n.__[0];n.__=n.__N,n.__N=void 0,t!==n.__[0]&&(i=!0)}}),c){var f=c.call(this,n,t,r);return u?f||i:f}return!u||i};r.__f=!0;var c=r.shouldComponentUpdate,e=r.componentWillUpdate;r.componentWillUpdate=function(n,t,r){if(this.__e){var u=c;c=void 0,f(n,t,r),c=u}e&&e.call(this,n,t,r)},r.shouldComponentUpdate=f}return o.__N||o.__}function h(n,u){var i=s(t++,3);!c.__s&&C(i.__H,u)&&(i.__=n,i.u=u,r.__H.__h.push(i))}function _(n,u){var i=s(t++,4);!c.__s&&C(i.__H,u)&&(i.__=n,i.u=u,r.__h.push(i))}function A(n){return o=5,T(function(){return{current:n}},[])}function F(n,t,r){o=6,_(function(){if("function"==typeof n){var r=n(t());return function(){n(null),r&&"function"==typeof r&&r()}}if(n)return n.current=t(),function(){return n.current=null}},null==r?r:r.concat(n))}function T(n,r){var u=s(t++,7);return C(u.__H,r)&&(u.__=n(),u.__H=r,u.__h=n),u.__}function q(n,t){return o=8,T(function(){return n},t)}function x(n){var u=r.context[n.__c],i=s(t++,9);return i.c=n,u?(null==i.__&&(i.__=!0,u.sub(r)),u.props.value):n.__}function P(n,t){c.useDebugValue&&c.useDebugValue(t?t(n):n)}function b(n){var u=s(t++,10),i=d();return u.__=n,r.componentDidCatch||(r.componentDidCatch=function(n,t){u.__&&u.__(n,t),i[1](n)}),[i[0],function(){i[1](void 0)}]}function g(){var n=s(t++,11);if(!n.__){for(var u=r.__v;null!==u&&!u.__m&&null!==u.__;)u=u.__;var i=u.__m||(u.__m=[0,0]);n.__="P"+i[0]+"-"+i[1]++}return n.__}function j(){for(var n;n=f.shift();){var t=n.__H;if(n.__P&&t)try{t.__h.some(z),t.__h.some(B),t.__h=[]}catch(r){t.__h=[],c.__e(r,n.__v)}}}c.__b=function(n){r=null,e&&e(n)},c.__=function(n,t){n&&t.__k&&t.__k.__m&&(n.__m=t.__k.__m),p&&p(n,t)},c.__r=function(n){a&&a(n),t=0;var i=(r=n.__c).__H;i&&(u===r?(i.__h=[],r.__h=[],i.__.some(function(n){n.__N&&(n.__=n.__N),n.u=n.__N=void 0})):(i.__h.some(z),i.__h.some(B),i.__h=[],t=0)),u=r},c.diffed=function(n){v&&v(n);var t=n.__c;t&&t.__H&&(t.__H.__h.length&&(1!==f.push(t)&&i===c.requestAnimationFrame||((i=c.requestAnimationFrame)||w)(j)),t.__H.__.some(function(n){n.u&&(n.__H=n.u,n.u=void 0)})),u=r=null},c.__c=function(n,t){t.some(function(n){try{n.__h.some(z),n.__h=n.__h.filter(function(n){return!n.__||B(n)})}catch(r){t.some(function(n){n.__h&&(n.__h=[])}),t=[],c.__e(r,n.__v)}}),l&&l(n,t)},c.unmount=function(n){m&&m(n);var t,r=n.__c;r&&r.__H&&(r.__H.__.some(function(n){try{z(n)}catch(n){t=n}}),r.__H=void 0,t&&c.__e(t,r.__v))};var k="function"==typeof requestAnimationFrame;function w(n){var t,r=function(){clearTimeout(u),k&&cancelAnimationFrame(t),setTimeout(n)},u=setTimeout(r,35);k&&(t=requestAnimationFrame(r))}function z(n){var t=r,u=n.__c;"function"==typeof u&&(n.__c=void 0,u()),r=t}function B(n){var t=r;n.__c=n.__(),r=t}function C(n,t){return!n||n.length!==t.length||t.some(function(t,r){return t!==n[r]})}function D(n,t){return"function"==typeof t?t(n):t}
//# sourceMappingURL=hooks.module.js.map


/***/ },

/***/ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js"
/*!*******************************************************************!*\
  !*** ./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js ***!
  \*******************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Fragment: () => (/* reexport safe */ preact__WEBPACK_IMPORTED_MODULE_0__.Fragment),
/* harmony export */   jsx: () => (/* binding */ u),
/* harmony export */   jsxAttr: () => (/* binding */ l),
/* harmony export */   jsxDEV: () => (/* binding */ u),
/* harmony export */   jsxEscape: () => (/* binding */ s),
/* harmony export */   jsxTemplate: () => (/* binding */ a),
/* harmony export */   jsxs: () => (/* binding */ u)
/* harmony export */ });
/* harmony import */ var preact__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! preact */ "./node_modules/preact/dist/preact.module.js");
var t=/["&<]/;function n(r){if(0===r.length||!1===t.test(r))return r;for(var e=0,n=0,o="",f="";n<r.length;n++){switch(r.charCodeAt(n)){case 34:f="&quot;";break;case 38:f="&amp;";break;case 60:f="&lt;";break;default:continue}n!==e&&(o+=r.slice(e,n)),o+=f,e=n+1}return n!==e&&(o+=r.slice(e,n)),o}var o=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,f=0,i=Array.isArray;function u(e,t,n,o,i,u){t||(t={});var a,c,p=t;if("ref"in p)for(c in p={},t)"ref"==c?a=t[c]:p[c]=t[c];var l={type:e,props:p,key:n,ref:a,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:--f,__i:-1,__u:0,__source:i,__self:u};if("function"==typeof e&&(a=e.defaultProps))for(c in a)void 0===p[c]&&(p[c]=a[c]);return preact__WEBPACK_IMPORTED_MODULE_0__.options.vnode&&preact__WEBPACK_IMPORTED_MODULE_0__.options.vnode(l),l}function a(r){var t=u(preact__WEBPACK_IMPORTED_MODULE_0__.Fragment,{tpl:r,exprs:[].slice.call(arguments,1)});return t.key=t.__v,t}var c={},p=/[A-Z]/g;function l(e,t){if(preact__WEBPACK_IMPORTED_MODULE_0__.options.attr){var f=preact__WEBPACK_IMPORTED_MODULE_0__.options.attr(e,t);if("string"==typeof f)return f}if(t=function(r){return null!==r&&"object"==typeof r&&"function"==typeof r.valueOf?r.valueOf():r}(t),"ref"===e||"key"===e)return"";if("style"===e&&"object"==typeof t){var i="";for(var u in t){var a=t[u];if(null!=a&&""!==a){var l="-"==u[0]?u:c[u]||(c[u]=u.replace(p,"-$&").toLowerCase()),s=";";"number"!=typeof a||l.startsWith("--")||o.test(l)||(s="px;"),i=i+l+":"+a+s}}return e+'="'+n(i)+'"'}return null==t||!1===t||"function"==typeof t||"object"==typeof t?"":!0===t?e:e+'="'+n(""+t)+'"'}function s(r){if(null==r||"boolean"==typeof r||"function"==typeof r)return null;if("object"==typeof r){if(void 0===r.constructor)return r;if(i(r)){for(var e=0;e<r.length;e++)r[e]=s(r[e]);return r}}return n(""+r)}
//# sourceMappingURL=jsxRuntime.module.js.map


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
/*!**********************************!*\
  !*** ./assets/src/form/index.js ***!
  \**********************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _mount_jsx__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./mount.jsx */ "./assets/src/form/mount.jsx");
/**
 * Frontend (view) entry for the Aponto booking form widget.
 *
 * Webpack builds this as the `form` bundle with Preact BUNDLED (the per-file
 * `@jsxImportSource preact` pragma in the JSX modules; DependencyExtraction does
 * not externalize `preact`), so no React runtime ships to the public widget. It
 * scans the page for `[data-aponto-form]` host containers (emitted by the block
 * render_callback in B2, or the dev harness in B1) and mounts the widget into an
 * open ShadowRoot on each.
 */

function boot() {
  document.querySelectorAll('[data-aponto-form]').forEach(el => (0,_mount_jsx__WEBPACK_IMPORTED_MODULE_0__.mountWidget)(el));
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
})();

/******/ })()
;
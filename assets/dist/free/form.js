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
/* harmony export */   App: () => (/* binding */ App),
/* harmony export */   eligibleStaffFor: () => (/* binding */ eligibleStaffFor),
/* harmony export */   locationIdsFor: () => (/* binding */ locationIdsFor),
/* harmony export */   locationStepApplies: () => (/* binding */ locationStepApplies),
/* harmony export */   locationStepInList: () => (/* binding */ locationStepInList),
/* harmony export */   normalizeCatalogue: () => (/* binding */ normalizeCatalogue),
/* harmony export */   staffStepApplies: () => (/* binding */ staffStepApplies),
/* harmony export */   staffStepInList: () => (/* binding */ staffStepInList),
/* harmony export */   startingService: () => (/* binding */ startingService)
/* harmony export */ });
/* harmony import */ var preact_hooks__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! preact/hooks */ "./node_modules/preact/hooks/dist/hooks.module.js");
/* harmony import */ var _lib_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./lib/api.js */ "./assets/src/form/lib/api.js");
/* harmony import */ var _lib_idempotency_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./lib/idempotency.js */ "./assets/src/form/lib/idempotency.js");
/* harmony import */ var _lib_tz_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./lib/tz.js */ "./assets/src/form/lib/tz.js");
/* harmony import */ var _lib_errors_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./lib/errors.js */ "./assets/src/form/lib/errors.js");
/* harmony import */ var _lib_config_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./lib/config.js */ "./assets/src/form/lib/config.js");
/* harmony import */ var _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./lib/copy.js */ "./assets/src/form/lib/copy.js");
/* harmony import */ var _components_ServiceStep_jsx__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./components/ServiceStep.jsx */ "./assets/src/form/components/ServiceStep.jsx");
/* harmony import */ var _components_StaffStep_jsx__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./components/StaffStep.jsx */ "./assets/src/form/components/StaffStep.jsx");
/* harmony import */ var _components_LocationStep_jsx__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./components/LocationStep.jsx */ "./assets/src/form/components/LocationStep.jsx");
/* harmony import */ var _components_StaffProfileDialog_jsx__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./components/StaffProfileDialog.jsx */ "./assets/src/form/components/StaffProfileDialog.jsx");
/* harmony import */ var _components_DateTimeStep_jsx__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./components/DateTimeStep.jsx */ "./assets/src/form/components/DateTimeStep.jsx");
/* harmony import */ var _components_DetailsStep_jsx__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./components/DetailsStep.jsx */ "./assets/src/form/components/DetailsStep.jsx");
/* harmony import */ var _components_DepositLines_jsx__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ./components/DepositLines.jsx */ "./assets/src/form/components/DepositLines.jsx");
/* harmony import */ var _aponto_form_payment_choice__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! @aponto/form-payment-choice */ "./assets/src/form/lib/payment-choice.free.js");
/* harmony import */ var _components_PaymentStep_jsx__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ./components/PaymentStep.jsx */ "./assets/src/form/components/PaymentStep.jsx");
/* harmony import */ var _components_Confirmation_jsx__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ./components/Confirmation.jsx */ "./assets/src/form/components/Confirmation.jsx");
/* harmony import */ var _components_Summary_jsx__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ./components/Summary.jsx */ "./assets/src/form/components/Summary.jsx");
/* harmony import */ var _components_feedback_jsx__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ./components/feedback.jsx */ "./assets/src/form/components/feedback.jsx");
/* harmony import */ var _components_CheckoutNotice_jsx__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! ./components/CheckoutNotice.jsx */ "./assets/src/form/components/CheckoutNotice.jsx");
/* harmony import */ var _components_Skeletons_jsx__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! ./components/Skeletons.jsx */ "./assets/src/form/components/Skeletons.jsx");
/* harmony import */ var _components_IntroPanel_jsx__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(/*! ./components/IntroPanel.jsx */ "./assets/src/form/components/IntroPanel.jsx");
/* harmony import */ var _lib_payments_js__WEBPACK_IMPORTED_MODULE_22__ = __webpack_require__(/*! ./lib/payments.js */ "./assets/src/form/lib/payments.js");
/* harmony import */ var _aponto_payment_gateways__WEBPACK_IMPORTED_MODULE_23__ = __webpack_require__(/*! @aponto/payment-gateways */ "./assets/src/form/lib/payment-gateways.free.js");
/* harmony import */ var _lib_format_js__WEBPACK_IMPORTED_MODULE_24__ = __webpack_require__(/*! ./lib/format.js */ "./assets/src/form/lib/format.js");
/* harmony import */ var _shared_person_name_js__WEBPACK_IMPORTED_MODULE_25__ = __webpack_require__(/*! ../shared/person-name.js */ "./assets/src/shared/person-name.js");
/* harmony import */ var _aponto_form_coupons__WEBPACK_IMPORTED_MODULE_26__ = __webpack_require__(/*! @aponto/form-coupons */ "./assets/src/form/lib/coupons.free.js");
/* harmony import */ var _lib_payments_precheck_js__WEBPACK_IMPORTED_MODULE_27__ = __webpack_require__(/*! ./lib/payments/precheck.js */ "./assets/src/form/lib/payments/precheck.js");
/* harmony import */ var _lib_hold_js__WEBPACK_IMPORTED_MODULE_28__ = __webpack_require__(/*! ./lib/hold.js */ "./assets/src/form/lib/hold.js");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
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
 *  - Location step (D-R62): derived from the published location roster, between Service and
 *    Staff; the chosen, silently assigned or preset `location_id` rides both requests, and
 *    staff eligibility is asked at it.
 *  - One-page frame (D-R80): block `layout: 'one-page'` + a locked service swaps the wizard
 *    chrome for an intro panel beside the active screen; the step machine is the same one.
 */


























// Edition-resolved (webpack alias, D-R41 ownership): Premium's coupon seam, or
// Free's inert stub that renders nothing and never calls a paid route.




const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Disclosure target for the narrow-container recap bar (ShadowRoot-scoped id). */
const RECAP_PANEL_ID = 'ap-recap-panel';

/**
 * Normalize a `/public/services` response into the catalogue shape the widget holds (D-R50).
 *
 * The roster is normalized BEFORE the items, because a service's `staff_ids` is only meaningful
 * against a roster that can name every id in it. Shared by the initial load and by the re-read
 * the `409 aponto_slot_taken` recovery does, so the two can never disagree about the shape.
 *
 * The LOCATION roster (D-R62) follows the same rule for the same reason: `locations[]` first,
 * then each item's `location_ids` against it, then its per-location staff map against both.
 * All three are empty whenever the server omits them, which is every Free and single-location
 * site.
 *
 * @param {Object} res `/public/services` payload.
 * @return {{services: Array<Object>, staff: Array<Object>, locations: Array<{id:number,name:string,address:string}>}} Catalogue.
 */
function normalizeCatalogue(res) {
  const staff = (0,_lib_config_js__WEBPACK_IMPORTED_MODULE_5__.normalizeStaffRoster)(res && res.staff);
  const locations = (0,_lib_config_js__WEBPACK_IMPORTED_MODULE_5__.normalizeLocationRoster)(res && res.locations);
  const services = (res && res.items || []).map(item => {
    const locationIds = (0,_lib_config_js__WEBPACK_IMPORTED_MODULE_5__.normalizeServiceLocationIds)(item, locations);
    return Object.assign({}, item, {
      staff_ids: (0,_lib_config_js__WEBPACK_IMPORTED_MODULE_5__.normalizeStaffIds)(item && item.staff_ids, staff),
      location_ids: locationIds,
      location_staff_ids: (0,_lib_config_js__WEBPACK_IMPORTED_MODULE_5__.normalizeLocationStaffIds)(item, locationIds, staff),
      // The same map, NOT filtered by the staff roster — for the block-preset narrowing
      // only, which must work on a site that publishes no `staff[]` (fix round 2).
      location_staff_ids_raw: (0,_lib_config_js__WEBPACK_IMPORTED_MODULE_5__.normalizeLocationStaffIds)(item, locationIds, null)
    });
  });
  return {
    services,
    staff,
    locations
  };
}

/**
 * Whether a service carries the per-location staff map (D-R62) — i.e. the server published the
 * location roster AND answered, for this service, who works where.
 *
 * @param {?Object} service Service (with normalized `location_staff_ids`).
 * @return {boolean} Whether narrowing information exists.
 */
function hasLocationStaff(service) {
  return !!service && !!service.location_staff_ids && Object.keys(service.location_staff_ids).length > 0;
}

/**
 * The staff ids eligible for ONE service at ONE location (D-R62, D-R60 rule 8).
 *
 * `eligible(service, location) = item.location_staff_ids[location] ?? []` (rest-contract §3.1
 * addendum 2026-09-23, "sửa lần 2"). Narrowing is per (service, location) PAIR, never per staff
 * member: while the location roster is published `staff_ids` is the UNION over every branch, and
 * a person who does Cuts at one branch and Color at another must not be offered for a Cut at the
 * second. No location yet, or no per-location map at all (no location roster — Free, single
 * location, a preset on such a site) ⇒ `staff_ids`, unchanged.
 *
 * @param {?Object} service    Service (with normalized `staff_ids`, `location_staff_ids`).
 * @param {?number} locationId The effective location, or null.
 * @return {number[]} Eligible staff ids.
 */
function eligibleStaffFor(service, locationId) {
  const ids = service && service.staff_ids || [];
  if (!locationId || !hasLocationStaff(service)) {
    return ids;
  }
  return service.location_staff_ids[locationId] || [];
}

/**
 * The location ids ONE service can be booked at from this block (D-R62).
 *
 * The service's own `location_ids`, narrowed to the branches where a block-PRESET staff member
 * does THIS service: a block pinned to somebody who only works Uptown must not offer Downtown,
 * where their calendar is empty by construction. Read from the RAW per-location map (fix round
 * 2), which the server publishes with the location roster even when there is no staff roster to
 * name anybody against.
 *
 * NEVER empty when the service has locations: the map lists PUBLIC staff only (rest-contract
 * §3.1 — `isEligible()` "staff active, is_public"), so a hidden (`is_public = 0`) preset person
 * appears nowhere in it, and a preset who serves none of these branches is equally absent. In
 * both cases every branch is offered and the server's own eligibility answers the wrong ones
 * with an empty calendar — an empty Location step would be a dead end with no way out.
 *
 * @param {?Object} service     Service (with normalized `location_ids`, `location_staff_ids_raw`).
 * @param {?Object} presetStaff The block-preset staff member `{ id }`, or null.
 * @return {number[]} Location ids, in roster order.
 */
function locationIdsFor(service, presetStaff = null) {
  const ids = service && service.location_ids || [];
  const raw = service && service.location_staff_ids_raw || {};
  if (!presetStaff || !Object.keys(raw).length) {
    return ids;
  }
  const served = ids.filter(id => (raw[id] || []).includes(presetStaff.id));
  return served.length ? served : ids;
}

/**
 * Whether the Location step applies to ONE service (D-R62) — the D-R50 Staff-step rule, term
 * for term:
 *  - a published location roster, which only exists when Premium `multi_location` is on, the
 *    owner left `booking.location_choice` on `visitor`, and ≥2 active locations serve a service —
 *    the server decides all of that (rest-contract §3.1 addendum 2026-09-23);
 *  - no block preset `locationId`, because a block that pins a place has already answered;
 *  - ≥2 locations FOR THIS SERVICE. One location is a fact, not a choice: it is assigned
 *    silently (D-R60 rule 3) and the step never shows.
 *
 * @param {?Object}                       service          Selected service.
 * @param {Array<{id:number,name:string}>} locations       Published location roster.
 * @param {?number}                       presetLocationId Block preset location id.
 * @param {?Object}                       [presetStaff]    Block-preset staff `{ id }`.
 * @return {boolean} Whether to show the step for this service.
 */
function locationStepApplies(service, locations, presetLocationId, presetStaff = null) {
  if (presetLocationId || !locations || !locations.length || !service) {
    return false;
  }
  return locationIdsFor(service, presetStaff).length >= 2;
}

/**
 * Whether the Location step belongs in the step LIST right now (D-R62) — the D-R50 DENOMINATOR
 * RULE verbatim: on the Service step, with nothing picked, the step counts if ANY service in the
 * catalogue is offered at ≥2 locations, and it is re-derived from the selected service the
 * moment there is one.
 *
 * @param {?Object} service          Selected service, or null.
 * @param {Object}  catalogue        Catalogue state (`services`, `locations`).
 * @param {?number} presetLocationId Block preset location id.
 * @param {?Object} [presetStaff]    Block-preset staff `{ id }`.
 * @return {boolean} Whether the step is in the list.
 */
function locationStepInList(service, catalogue, presetLocationId, presetStaff = null) {
  const locations = catalogue.locations || [];
  if (presetLocationId || !locations.length) {
    return false;
  }
  if (service) {
    return locationStepApplies(service, locations, presetLocationId, presetStaff);
  }
  return (catalogue.services || []).some(s => locationStepApplies(s, locations, presetLocationId, presetStaff));
}

/**
 * Whether the Staff step applies to ONE service (D-R50).
 *
 * Three terms, and each one removes a step that would ask a question with no answer:
 *  - a published roster (`staff[]`), which only exists when Premium `multi_staff` is on,
 *    the owner left `booking.staff_choice` on `visitor`, and the site has ≥2 eligible
 *    active staff — the server decides all of that (rest-contract §3.1);
 *  - no block preset `staffId`, because a block that pins a staff member has already made
 *    the choice and the editor control says exactly that;
 *  - ≥2 eligible staff FOR THIS SERVICE, since one staff member is a fact, not a
 *    choice — the same reasoning that skips the Service step for a lone service (B1).
 *
 * Since D-R62 the third term is asked AT THE EFFECTIVE LOCATION (D-R60 rule 8): after Service →
 * Location leaves one eligible staff member, the step is skipped exactly as it is for a
 * one-person service. With no location (no roster, or not picked yet) it is the union.
 *
 * @param {?Object}                       service       Selected service (with `staff_ids`).
 * @param {Array<{id:number,name:string}>} roster       Published roster.
 * @param {?number}                       presetStaffId Block preset staff id.
 * @param {?number}                       [locationId]  Effective location (D-R62), or null.
 * @return {boolean} Whether to show the step for this service.
 */
function staffStepApplies(service, roster, presetStaffId, locationId = null) {
  if (presetStaffId || !roster || !roster.length || !service) {
    return false;
  }
  return eligibleStaffFor(service, locationId).length >= 2;
}

/**
 * Whether the Staff step belongs in the step LIST right now (D-R50).
 *
 * The honest-numbering rule (SPEC-P1 §2.2 addendum B1 / the D-R38 payment step) is that the
 * fraction counts the steps this booking will really have — but on the Service step nothing
 * is picked yet, so "will it" has no single answer. THE DENOMINATOR RULE, chosen to match
 * what the Payment step already does with price: while no service is selected, ask the
 * question of the WHOLE CATALOGUE — the step counts if ANY service has ≥2 staff — and
 * re-derive it from the selected service the moment there is one. So a mixed catalogue reads
 * `01 / 05` on the first screen and drops to `01 / 04` when a single-staff service is
 * picked. That is a real change in the flow, not a lie about it, and it is the same shape of
 * renumbering the payment step already produces.
 *
 * @param {?Object}                        service       Selected service, or null.
 * @param {Object}                         catalogue     Catalogue state (`services`, `staff`).
 * @param {?number}                        presetStaffId Block preset staff id.
 * `locationOf` (D-R62) may be a number (the effective location of the picked service) or a
 * function `( service ) => ?number`: on the Service step each catalogue entry is then asked at
 * the location it WOULD be booked at — a preset or a single-branch service is known before the
 * pick — so the count does not jump the moment the customer picks (fix round 1).
 *
 * @param {?Object}                        service       Selected service, or null.
 * @param {Object}                         catalogue     Catalogue state (`services`, `staff`).
 * @param {?number}                        presetStaffId Block preset staff id.
 * @param {?number|Function}               [locationOf]  Effective location (D-R62), or a resolver.
 * @return {boolean} Whether the step is in the list.
 */
function staffStepInList(service, catalogue, presetStaffId, locationOf = null) {
  const roster = catalogue.staff || [];
  if (presetStaffId || !roster.length) {
    return false;
  }
  const at = s => typeof locationOf === 'function' ? locationOf(s) : locationOf;
  if (service) {
    return staffStepApplies(service, roster, presetStaffId, at(service));
  }
  return (catalogue.services || []).some(s => staffStepApplies(s, roster, presetStaffId, at(s)));
}

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

/** The calendar month after `{year, month}` (0-based month). */
function nextMonthOf(year, month) {
  return 11 === month ? {
    year: year + 1,
    month: 0
  } : {
    year,
    month: month + 1
  };
}

/**
 * How many months the Date & time step may move FORWARD on its own, looking for the first one with
 * an open time (D-R64 item 4). Two: three single-month reads span ≤ 93 days, but the step only ever
 * looks two months past the one it opened on — the "within the next ~62 days" a visitor expects —
 * and it never loops.
 */
const MAX_AUTO_HOPS = 2;

/** Build the availability fetch date-range for a display-tz calendar month. */
function monthRange(year, month) {
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return {
    from_date: year + '-' + pad2(month + 1) + '-01',
    to_date: year + '-' + pad2(month + 1) + '-' + pad2(last)
  };
}

/**
 * The service the form opens on (D-R71t), or null to open on the Service step.
 *
 * A block `serviceId` preset wins and is the only source that LOCKS the service. Without one,
 * `?service_id=<id>` on the page URL only chooses the STARTING service: the Service step
 * stays in the flow and Back returns to it. The id is looked up in the public catalogue, so an
 * unknown, inactive or non-public id is ignored. A lone service is the start of a block with no
 * preset (B1). A preset the catalogue does not list (deleted or deactivated after the block was
 * saved) never falls back to the lone service (QA D01, 2026-10-05, newer than D-R75: a draft
 * "Strategy call" beside one paid "Website audit" silently turned the page into the paid
 * service); only an explicit `?service_id=` may still choose the starting service.
 *
 * @param {Array<Object>} services Public catalogue services.
 * @param {?number}       presetId Block preset service id.
 * @param {string}        search   `location.search`.
 * @return {?Object} The starting service.
 */
function startingService(services, presetId, search) {
  const preset = presetId ? services.find(s => s.id === presetId) : null;
  if (preset) {
    return preset;
  }
  const m = /[?&]service_id=(\d{1,10})(&|$)/.exec(search || '');
  return m && services.find(s => s.id === Number(m[1])) || (!presetId && services.length === 1 ? services[0] : null);
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
    // The site's 12 h / 24 h convention, before anything formats a time (persona QA
    // 2026-10-05, T-071): mails, the cart and the manage page already follow it.
    (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.setTimeFormat)(config.timeFormat);
    const businessTz = (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.canonicalizeZone)(config.business.timezone || 'UTC');
    const browserTz = (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.browserTimezone)();
    // `booking.timezone_mode` (D-R48): a PRESENTATION default only. Whatever it
    // says, the picker exists and `customer_timezone` still persists the zone
    // the visitor actually booked in.
    return (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.resolveDisplayTz)({
      browserTz,
      businessTz,
      mode: config.business.timezone_mode
    });
  }, [config]);
  // A zone the visitor picked on an earlier visit wins over the init rule (T-096) — it is
  // their own answer to the same question, and it is only honoured from the same browser zone.
  const [displayTz, setDisplayTz] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(() => (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.rememberedTz)(tzInit.browserTz) || tzInit.displayTz);
  const businessTz = tzInit.businessTz;
  // The SSA-style "Times shown in …" prefix: only a `business`-mode site, and
  // only while the clock on screen is not the visitor's own. Recomputed from the
  // LIVE display zone, so the note disappears the moment a remote visitor moves
  // the flow onto their own zone.
  const showTzNote = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => _lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.TZ_MODE_BUSINESS === tzInit.mode && !(0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.sameDisplayZone)(displayTz, tzInit.browserTz), [tzInit, displayTz]);
  // Every zone the ENGINE knows, resolved at runtime so the list costs the
  // bundle nothing — plus the two zones this page is already using, in case the
  // runtime's tables omit one. Offset-form zones never enter either list:
  // `display_tz` is posted at submit and the REST layer takes IANA names only.
  const tzOptions = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.timezoneOptions)([tzInit.browserTz, businessTz]), [tzInit, businessTz]);
  const tzSuggested = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.suggestedTimezones)([tzInit.browserTz, businessTz, displayTz]), [tzInit, businessTz, displayTz]);

  // --- Catalogue. -----------------------------------------------------------
  const [catalogue, setCatalogue] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)({
    loading: true,
    error: false,
    services: [],
    categories: [],
    // The published staff roster (D-R50). `[]` on Free, on single-staff Premium and
    // on any site whose owner turned the choice off — the server omits both keys there, so
    // "no roster" is the normal, silent case and every branch below is dead code.
    staff: [],
    // The published LOCATION roster (D-R62). `[]` on Free, on single-location Premium and on
    // a site whose owner set `booking.location_choice = first` — omitted by the server there,
    // so the Location step and every `location_id` below are dead code on those sites.
    locations: []
  });
  const [service, setService] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  /**
   * The staff member the customer picked (D-R50). THREE states, and the third one is the point:
   *
   *   `undefined` — not chosen yet. No row is pressed when the step first opens.
   *   `null`      — "Any available", chosen deliberately.
   *   `<id>`      — a named staff member.
   *
   * `null` alone was the initial value in the first cut, which pre-pressed the "Any available"
   * row — and since the rows auto-advance on click (like the Service step), the customer had to
   * click the row that already looked chosen in order to move on (browser verification). Both
   * `undefined` and `null` resolve to the same `staff_id: null` on the wire; the difference is
   * purely what the step shows before the first pick, and what Back shows after one.
   */
  const [staffChoice, setStaffChoice] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(undefined);
  /**
   * The open staff profile dialog: `{ member, trigger }`, or null (D-R52).
   *
   * It lives HERE rather than in `StaffStep` for a structural reason, not a stylistic one:
   * `.ap-main` is a CSS container (`container-type: inline-size`, which the Cards grid needs),
   * and containment makes it the containing block for absolutely positioned descendants. A
   * dialog rendered inside the step would therefore be clipped to the content column instead
   * of covering the card and its summary sidebar. So the card owns it.
   */
  const [staffProfile, setStaffProfile] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  /** The "Learn more" button to hand focus back to once the dialog closes. */
  const profileReturnRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  /**
   * Set once the SERVER has refused an unnamed booking because the site now requires a named
   * choice (fix round 1, P2-1).
   *
   * The page-global `staff.choice` is a snapshot of the setting as it stood when this page was
   * rendered. If the owner switches to "Customers must choose" while somebody is filling the
   * form in, that tab keeps offering "Any available" and keeps getting refused — a loop with
   * no exit, because nothing in the tab ever learns the setting changed. The 422 IS that
   * lesson, so it is remembered for the rest of the session and the step behaves as `required`
   * from then on.
   */
  const [staffRequiredBySrv, setStaffRequiredBySrv] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  /**
   * The `staff_id` this booking sends to `/public/availability` and `POST /public/bookings`.
   *
   * Precedence, and it is the same on both requests so the slots the visitor saw are the
   * slots they book: a block PRESET wins (the editor's "Preselected staff" pins the booking
   * and removes the step), then the customer's own choice, then `null` — which is the
   * contract's any-staff union on read and `reserveAnyStaff()` on write (SPEC-P0 §5.6).
   */
  const effectiveStaffId = config.staffId || staffChoice || null;

  /** Whether the customer has NAMED a staff member (as opposed to Any, or not having picked). */
  const namedStaffId = typeof staffChoice === 'number' ? staffChoice : null;

  /**
   * The location the customer picked on the Location step (D-R62). `undefined` until the first
   * pick — no row is pressed when the step first opens — then `<id>`. There is NO third "any"
   * state, unlike `staffChoice`: D-R60 rule 3 rules out "Any location".
   */
  const [locationChoice, setLocationChoice] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(undefined);

  /**
   * The block-PRESET staff member, as `{ id }`, or null (D-R62). Where they do a service narrows
   * the places this block may offer — see {@link locationIdsFor}. It does NOT need the staff
   * roster: the per-location map is published with the LOCATION roster even when `staff[]` is
   * not (`staff_choice = any`, or <2 public staff — rest-contract §3.1 review round 3), and the
   * raw numeric copy of it is what the preset is looked up in (fix round 2).
   */
  const presetStaff = config.staffId ? {
    id: config.staffId
  } : null;

  /**
   * The `location_id` a booking for service `s` sends, given a candidate choice (D-R62).
   *
   * Precedence mirrors {@link effectiveStaffId}, and it is the same on the availability read
   * and the booking write so the slots the visitor saw are the slots they book:
   *  1. a block PRESET — the owner pinned the place and the step is gone;
   *  2. the customer's own pick, while this service is still offered there;
   *  3. the ONE location the service is offered at, assigned silently (D-R60 rule 3) and SENT —
   *     with a published roster the server refuses a null `location_id` site-wide, not per
   *     service (rest-contract §3.3 addendum 2026-09-23);
   *  4. `null` — every site without a location roster, which keeps their availability query
   *     and booking body byte-identical to the build before D-R62.
   *
   * @param {?Object} s      Service.
   * @param {Object}  cat    Catalogue state.
   * @param {*}       choice Candidate `locationChoice`.
   * @return {?number} Location id, or null.
   */
  function locationForIn(s, cat, choice) {
    if (config.locationId) {
      return config.locationId;
    }
    const ids = locationIdsFor(s, presetStaff);
    if (typeof choice === 'number' && ids.includes(choice)) {
      return choice;
    }
    return ids.length === 1 ? ids[0] : null;
  }

  /**
   * `normalizeCatalogue()` plus the one rule that needs this block's props (D-R62 fix round 1):
   * with a location roster published and a block PRESET `locationId`, a service the pinned
   * branch does not offer is not listed at all — otherwise it would open on a calendar that is
   * empty by construction (including a non-first branch on a `location_choice = first` site,
   * where the tab has no roster and so nothing to filter by; the server's 422 covers that one).
   * A preset `staffId` is NOT filtered the same way: that dead end predates D-R62 and the
   * staff roster may legitimately omit the preset person (non-public), so filtering by it
   * could empty the catalogue.
   *
   * @param {Object} res `/public/services` payload.
   * @return {Object} Catalogue.
   */
  function shapeCatalogue(res) {
    const next = normalizeCatalogue(res);
    if (config.locationId && next.locations.length) {
      next.services = next.services.filter(s => s.location_ids.includes(config.locationId));
    }
    return next;
  }

  /** The `location_id` this booking sends right now (D-R62). */
  const effectiveLocationId = locationForIn(service, catalogue, locationChoice);

  /**
   * Where the flow goes once a location is settled: Staff when a choice remains AT that
   * location (D-R60 rule 8), otherwise Date & time.
   *
   * @param {Object}  s   Service.
   * @param {Object}  cat Catalogue state.
   * @param {?number} loc Effective location.
   * @return {string} Step key.
   */
  function stepAfterLocation(s, cat, loc) {
    return staffStepApplies(s, cat.staff, config.staffId, loc) ? 'staff' : 'datetime';
  }

  /**
   * Where the flow goes once a service is settled: Location when the service is offered at ≥2
   * places (D-R62), otherwise wherever {@link stepAfterLocation} says for the one location it
   * has (or none).
   *
   * @param {Object} s      Service.
   * @param {Object} cat    Catalogue state.
   * @param {*}      choice Candidate `locationChoice`.
   * @return {string} Step key.
   */
  function stepAfterService(s, cat, choice) {
    if (locationStepApplies(s, cat.locations, config.locationId, presetStaff)) {
      return 'location';
    }
    return stepAfterLocation(s, cat, locationForIn(s, cat, choice));
  }

  // A gateway RETURN leg (`?aponto_pay=…`) is a continuation, not a first
  // visit: the page must not flash the catalogue on its way to a confirmation
  // panel. Read once, from the URL the page loaded with.
  const returnLeg = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => (0,_lib_hold_js__WEBPACK_IMPORTED_MODULE_28__.readReturn)(typeof window !== 'undefined' && window.location ? window.location.search : ''), []);
  /**
   * A RESUME leg (`?aponto_resume=<manage token>`) — the link in the "complete
   * your payment" reminder (PR-A.3).
   *
   * Read once, from the URL the page loaded with, for the same reason the
   * return leg is: this visitor is finishing something, not starting it, and
   * the catalogue must not flash past on the way to the Payment step.
   */
  const resumeToken = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => (0,_lib_hold_js__WEBPACK_IMPORTED_MODULE_28__.readResume)(typeof window !== 'undefined' && window.location ? window.location.search : '', typeof window !== 'undefined' && window.location ? window.location.hash : ''), []);
  const [step, setStep] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(resumeToken ? 'payment' : returnLeg ? 'confirmation' : 'service');

  // The Service step is skipped when there is nothing to choose: a block-preselected service, OR
  // exactly one active service in the catalogue (B1 — finding U3 Jonas: making a lone service a
  // mandatory click is friction). The service still shows in the summary; the step fraction
  // renumbers honestly (3 steps, not 4) because `stepList` keys off this flag below.
  // A preset the loaded catalogue does not list (the service was deleted or deactivated after
  // the block was saved) is no preset at all: the block behaves exactly like one without it,
  // rather than dropping a Service step the visitor is still standing on (`00 / 03`).
  const presetMissing = !!preselectedId && !catalogue.loading && !catalogue.error && !catalogue.services.some(s => s.id === preselectedId);
  // QA D01 (2026-10-05): a block that NAMES a service the catalogue no longer lists never falls
  // back to the lone-service rule. It used to: a draft "Strategy call" beside one paid "Website
  // audit" turned the page into the paid service, silently. Step by step now shows the Service
  // step even for a lone service (the visitor sees what they book); one page shows "This
  // service is no longer available" (`onePageUnavailable` below).
  const singleService = !preselectedId && !catalogue.loading && catalogue.services.length === 1;
  const serviceLocked = !!preselectedId && !presetMissing || singleService;

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
      const {
        services,
        staff,
        locations
      } = shapeCatalogue(res);
      setCatalogue({
        loading: false,
        error: false,
        services,
        categories: res.categories || [],
        staff,
        locations
      });
      // A gateway return leg is already showing an outcome panel; the
      // catalogue must not shove the visitor back into the flow behind
      // it just because there is one service to preselect.
      if (returnLeg || resumeToken) {
        return;
      }
      // With the Service step skipped, the FIRST step is whichever of Location / Staff /
      // Date & time actually applies to the locked service (D-R50, D-R62).
      const firstStepFor = picked => stepAfterService(picked, {
        services,
        staff,
        locations
      }, undefined);
      // The block preset, else `?service_id=` (D-R71t), else the one active
      // service of a block with no preset (B1 — the Service step is skipped). A
      // missing preset never becomes the lone service (QA D01). No markNav() so the
      // auto-advance doesn't steal focus on first paint.
      const start = startingService(services, preselectedId, typeof window !== 'undefined' && window.location ? window.location.search : '');
      if (start) {
        autoPickedRef.current = false;
        setService(start);
        setStep(firstStepFor(start));
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
    index: {}
  });
  const [selectedDayKey, setSelectedDayKey] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [selectedSlotUtc, setSelectedSlotUtc] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const fetchToken = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(0);
  // D-R64 item 4 — AUTO-ADVANCE past an empty month, on the step's first read only. `armed` is
  // set when the calendar is (re)started — entering the step, or a new service / staff member /
  // location / display zone — and cleared the moment the visitor pages by hand or a read commits,
  // so a month the VISITOR chose is never skipped. `skip` is the month a hop just committed with
  // its answer already in hand: the refetch effect reads it and does not ask for it twice.
  const autoAdvance = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)({
    armed: false,
    scope: '',
    skip: ''
  });
  // "Showing October 2026 — the first month with available times." — announced (hidden live
  // region in DateTimeStep) when a hop lands; cleared by any other calendar move.
  const [monthNotice, setMonthNotice] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)('');

  /**
   * Throw away everything derived from the CURRENT availability request, synchronously.
   *
   * The token is bumped HERE — at the click — rather than being left to the next
   * `fetchAvailability()` the refetch effect happens to run (fix round 1). Between a state
   * change and the effect that reacts to it there is a real window in which the in-flight
   * response for the OLD service or the OLD staff member can resolve; with the token still
   * matching, it was accepted, and the visitor got somebody else's calendar (and could pick a
   * slot out of it). Bumping first makes that response unconditionally stale.
   *
   * The day, the slot and the auto-pick flag go with it, for the same reason: they describe a
   * calendar that is no longer the one being shown.
   */
  function invalidateAvailability() {
    fetchToken.current += 1;
    autoPickedRef.current = false;
    carriedRef.current = false;
    setSelectedDayKey(null);
    setSelectedSlotUtc(null);
    setAvail({
      loading: true,
      error: false,
      index: {}
    });
  }
  const fetchAvailability = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useCallback)((year, month, tz, advance = false) => {
    if (!service) {
      return;
    }
    const token = ++fetchToken.current;
    setAvail(a => Object.assign({}, a, {
      loading: true,
      error: false
    }));
    const read = (y, m) => api.getAvailability(Object.assign({
      service_id: service.id,
      staff_id: effectiveStaffId,
      // `null` is dropped by the query builder, so a site with no location
      // roster sends exactly the query it sent before D-R62.
      location_id: effectiveLocationId,
      tz
    }, monthRange(y, m)));
    const commit = (y, m, index) => {
      autoAdvance.current.armed = false;
      if (y !== year || m !== month) {
        // A hop landed: show that month with the answer already read, and say so.
        autoAdvance.current.skip = y + '-' + m;
        setCal({
          year: y,
          month: m
        });
        setMonthNotice((0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.month_advanced, new Intl.DateTimeFormat(config.locale || undefined, {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC'
        }).format(Date.UTC(y, m, 15))));
      }
      setAvail({
        loading: false,
        error: false,
        index
      });
    };
    // D-R64 item 4: an EMPTY first month moves on — at most MAX_AUTO_HOPS months, never past
    // the last year the calendar offers — and when every one of them is empty the ORIGINAL
    // month is shown with its (empty) answer, rather than stranding the visitor months
    // ahead. Every hop re-checks the token, so a newer selection (D-R50 (iii): the token is
    // bumped synchronously at the click) cancels the chain wherever it is.
    const attempt = (y, m, hops, origin) => read(y, m).then(res => {
      if (token !== fetchToken.current) {
        return;
      }
      const index = (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.groupSlotsByDay)(res.slots || [], tz);
      const first = origin || index;
      if (!advance || Object.keys(index).length) {
        commit(y, m, index);
        return;
      }
      const next = nextMonthOf(y, m);
      if (hops >= MAX_AUTO_HOPS || next.year > initialYear + 1) {
        commit(year, month, first);
        return;
      }
      return attempt(next.year, next.month, hops + 1, first);
    });
    attempt(year, month, 0, null).catch(raw => {
      if (token !== fetchToken.current) {
        return;
      }
      // The KIND travels with the failure (D-R54). `429` here is not a broken
      // connection, and telling a visitor to "check your connection" when the
      // server asked them to wait sends them to reload, retry and eventually
      // give up — the one recovery that cannot work.
      const info = (0,_lib_errors_js__WEBPACK_IMPORTED_MODULE_4__.classifyError)(raw);
      setAvail(a => Object.assign({}, a, {
        loading: false,
        error: {
          kind: info.kind,
          retryAfter: info.retryAfter
        }
      }));
    });
  }, [api, service, effectiveStaffId, effectiveLocationId, config.locale, initialYear]);

  // Refetch whenever the visible month, the display timezone, the service — or, since
  // D-R50, the chosen staff member, and since D-R62 the location — change. A different staff
  // member or a different branch is a different calendar.
  //
  // D-R64 item 4: a change of anything BUT the month (entering the step, service, staff, location,
  // zone) re-arms the auto-advance; a month change alone does not — it is either the visitor
  // paging (which disarmed it) or a hop that already holds its answer (`skip`).
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    const state = autoAdvance.current;
    const scope = [step, service && service.id, effectiveStaffId, effectiveLocationId, displayTz].join('|');
    if (scope !== state.scope) {
      state.scope = scope;
      state.armed = true;
      state.skip = '';
      setMonthNotice('');
    }
    if (state.skip === cal.year + '-' + cal.month) {
      state.skip = '';
      return;
    }
    if (step === 'datetime' && service) {
      // A slot the visitor is HOLDING pins the calendar to its month (founder 2026-10-04,
      // option B): never hop away from it, even when that month now reads empty. A slot with
      // no day (a resumed payment) pins nothing — the calendar was never moved to it.
      fetchAvailability(cal.year, cal.month, displayTz, state.armed && !(selectedSlotUtc && selectedDayKey));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, service, effectiveStaffId, effectiveLocationId, cal.year, cal.month, displayTz]);

  // Auto-select the first day that has availability so times render immediately, Calendly-style
  // (B1 — finding U3 Jonas). Only the FIRST time per service-entry (autoPickedRef) and only while
  // nothing is chosen, so a manual pick or deliberate month browsing is respected. An EMPTY first
  // month no longer leaves this waiting (D-R64 item 4): `fetchAvailability()` has already moved the
  // calendar up to two months on, so this picks that month's first day. A month the visitor pages
  // to by hand still just waits for their pick.
  //
  // D-R84: the block may turn the SELECTION off (`preselectDate`, off by default for one-page):
  // the calendar then opens on its own and the slots appear when the visitor picks a day. Only the
  // selection is gated — the availability read and the D-R64 month hop (with its announcement)
  // run exactly as before, and a day the visitor chose survives Back / "Change time".
  const preselectDate = (0,_lib_config_js__WEBPACK_IMPORTED_MODULE_5__.preselectDateFor)(config.preselectDate, config.layout);
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!preselectDate || step !== 'datetime' || avail.loading || selectedDayKey || autoPickedRef.current) {
      return;
    }
    const keys = Object.keys(avail.index).sort();
    if (keys.length > 0) {
      autoPickedRef.current = true;
      setSelectedDayKey(keys[0]);
    }
  }, [preselectDate, step, avail.index, avail.loading, selectedDayKey]);

  // What a display-zone change carried over (founder 2026-10-04, option B) must still be OFFERED
  // by the re-read that follows. A slot someone else took in the meantime is dropped — the day
  // stays, showing what is left — so Continue is never enabled for a time the grid does not
  // show. A day with no slot chosen keeps its calendar date, and when that date has no times in
  // the new zone the selection moves to the next day that has (else the last one). Only that
  // re-read is checked (`carriedRef`): coming Back from Details or Payment re-reads too, and
  // there the visitor's own hold may still be covering the slot while its release is in flight.
  const carriedRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(false);
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!carriedRef.current || step !== 'datetime' || avail.loading || avail.error) {
      return;
    }
    carriedRef.current = false;
    const offered = avail.index[selectedDayKey] || [];
    if (selectedSlotUtc) {
      if (!offered.some(slot => slot.start_utc === selectedSlotUtc)) {
        setSelectedSlotUtc(null);
      }
    } else if (selectedDayKey && offered.length === 0) {
      const keys = Object.keys(avail.index).sort();
      setSelectedDayKey(keys.find(key => key > selectedDayKey) || keys[keys.length - 1] || null);
    }
  }, [step, avail, selectedDayKey, selectedSlotUtc]);

  // --- Details + submit. ----------------------------------------------------
  const [details, setDetails] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    note: ''
  });
  const [consent, setConsent] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  // Checkout continuity (D-R71w): inert unless an offered gateway publishes `session_url`.
  const checkout = (0,_components_CheckoutNotice_jsx__WEBPACK_IMPORTED_MODULE_19__.useCheckoutSession)({
    gateways: config.payments && config.payments.gateways,
    nonce: config.nonce,
    details,
    setDetails
  });
  // Answers to the site's extra booking-form fields, keyed by slug (D-R30).
  // Absent = unanswered; the submitted body carries only answered ones.
  const [customValues, setCustomValues] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)({});
  const [honeypot, setHoneypot] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)('');
  const [fieldErrors, setFieldErrors] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [submitting, setSubmittingState] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  // "The time you chose was just taken" on Date & time, until another slot is picked (QA D14).
  const [slotTakenNotice, setSlotTakenNotice] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  // The SYNCHRONOUS twin of `submitting` (QA D03 / persona QA T-102, 2026-10-05): a double tap
  // lands twice inside one frame, and the second handler still closes over `submitting ===
  // false`, so it posted again with the same idempotency key and the server's replay swapped the
  // full confirmation for the reduced "already emailed" one. The ref flips before the handler
  // returns and the guards read it, so the second tap of a pair is simply not a submit; the
  // state still drives the disabled button.
  const submittingRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(false);
  const setSubmitting = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useCallback)(value => {
    submittingRef.current = !!value;
    setSubmittingState(!!value);
  }, []);
  const [submitError, setSubmitError] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [rateSeconds, setRateSeconds] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(0);
  const [toast, setToast] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [response, setResponse] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  /** Drop one field's error, keeping the rest (null when none remain). */
  const clearFieldError = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useCallback)(key => {
    setFieldErrors(current => {
      if (!current || !current[key]) {
        return current;
      }
      const next = {
        ...current
      };
      delete next[key];
      return Object.keys(next).length ? next : null;
    });
  }, []);
  // Order adjustments (Premium coupons, D-R67). The quote is bound to the
  // selected service; amounts stay server-owned.
  // An offered gateway whose own checkout owns discounts publishes `coupons: 0`
  // in its client config; the widget then shows no coupon field of its own, for
  // every method on the step, so no order can carry two discounts.
  const couponsDeclined = (config.payments && config.payments.gateways || []).some(gateway => gateway?.client?.coupons === '0');
  const coupon = (0,_aponto_form_coupons__WEBPACK_IMPORTED_MODULE_26__.useFormCoupon)({
    enabled: !!(config.coupons && config.coupons.enabled) && !couponsDeclined,
    service,
    api,
    onFieldClear: clearFieldError
  });
  // `attemptBooking` is memoised, so it reads the CURRENT seam through a ref.
  const couponRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(coupon);
  couponRef.current = coupon;

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
  const gateways = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => (payments.gateways || []).filter(_lib_payments_js__WEBPACK_IMPORTED_MODULE_22__.isRenderable), [payments]);
  // The site's ONE payment method, when it is required and checks out on the gateway's own
  // page — asked of the site alone, so it has an answer before a service is picked (T-095).
  const externalOnly = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => payments.mode === 'required' && (payments.gateways || []).length === 1 && gateways.length === 1 ? (0,_aponto_payment_gateways__WEBPACK_IMPORTED_MODULE_23__.directCheckout)(gateways[0]) : null, [payments, gateways]);
  const externalCheckout = Number(service?.price_minor) > 0 ? externalOnly : null;
  const externalAttempt = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  const externalMounted = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(true);
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => () => {
    externalMounted.current = false;
  }, []);
  const [externalReserved, setExternalReserved] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [payMethod, setPayMethod] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  // What the paying gateway adds to the summary total at its own checkout (T-025 re-test).
  // The gateway's own copy decides; '' for a free service and for every other gateway.
  const totalNote = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => {
    const paying = Number(service?.price_minor) > 0 ? (0,_components_Summary_jsx__WEBPACK_IMPORTED_MODULE_17__.totalNoteGateway)({
      mode: payments.mode,
      offered: (payments.gateways || []).length,
      gateways,
      payMethod
    }) : null;
    return paying && (0,_lib_payments_js__WEBPACK_IMPORTED_MODULE_22__.gatewayCopy)(paying).totalNote || '';
  }, [service, payments, gateways, payMethod]);
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
  const [reservedOrder, setReservedOrder] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const reservedOrderRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  const previewTerms = coupon.quote ? coupon.quote.payment_terms : service?.payment_terms;
  const paymentChoice = (0,_aponto_form_payment_choice__WEBPACK_IMPORTED_MODULE_14__.usePaymentChoice)({
    previewTerms,
    serviceId: service?.id,
    reservedOrder: reservedOrder || resume?.order,
    locked: gatewayBusy || submitting,
    canChange: () => !gatewayBusyRef.current && !holdRef.current && !reservedOrderRef.current && !resumeRef.current,
    onChange: () => {
      setPayError('');
      setPayNotice(null);
    }
  });
  const paymentTerms = reservedOrder || resume?.order || paymentChoice.terms || previewTerms || null;
  const paymentMode = (0,_components_DepositLines_jsx__WEBPACK_IMPORTED_MODULE_13__.isDepositOrder)(paymentTerms) || (0,_components_DepositLines_jsx__WEBPACK_IMPORTED_MODULE_13__.isDepositOrder)(previewTerms) ? 'required' : payments.mode;
  const effectiveTotalMinor = coupon.totalMinor !== null ? coupon.totalMinor : service ? Number(service.price_minor) || 0 : 0;

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
  // …unless the only way to pay is a gateway that takes the customer to its OWN checkout
  // (persona QA 2026-10-05, T-095). That flow has no Payment step for a paid service either, so
  // the catalogue's answer is "never": the rail used to promise "Payment" on the first screen of
  // such a site and silently drop it the moment a service was picked.
  const paymentStepExists = !!resume || !externalCheckout && payments.mode !== 'off' && gateways.length > 0 && (service ? effectiveTotalMinor > 0 : !externalOnly && catalogue.services.some(s => Number(s.price_minor) > 0));

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
  const payableMinor = paymentTerms?.payable_now_minor ?? effectiveTotalMinor;
  /** The order total, formatted exactly as the summary already shows it. */
  const totalLabel = service ? (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_24__.formatMoney)(payableMinor, service.currency, config.locale, currencyExponent) : '';

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
    if (externalCheckout) {
      return externalCheckout.code;
    }
    if (!paymentStepExists) {
      return '';
    }
    const method = override === undefined ? payMethod : override;
    return method && method !== _components_PaymentStep_jsx__WEBPACK_IMPORTED_MODULE_15__.ONSITE ? method : '';
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
      staff_id: effectiveStaffId,
      location_id: effectiveLocationId,
      start_utc: selectedSlotUtc,
      tz: displayTz,
      consent: consentEnabled ? consent : false,
      // The two name parts go through the shared normalizer — Unicode trim plus
      // internal whitespace collapsed — the same rule the server stores them by.
      customer: {
        first_name: (0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_25__.normalizePart)(details.first_name),
        last_name: (0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_25__.normalizePart)(details.last_name),
        email: details.email.trim(),
        phone: phoneMode === 'off' ? '' : details.phone.trim(),
        note: details.note.trim()
      },
      custom_fields: collectCustom(),
      payment_method: paymentMethodOf(methodOverride),
      payment_amount_mode: paymentChoice.amountMode,
      coupon_code: externalCheckout ? '' : coupon.draftCode
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
        first_name: draft.customer.first_name,
        last_name: draft.customer.last_name,
        email: draft.customer.email,
        phone: draft.customer.phone,
        note: draft.customer.note
      }
    };
    if (draft.staff_id) {
      body.staff_id = draft.staff_id;
    }
    // Same conditional-key rule as `staff_id` (D-R62): absent unless a location is in play,
    // so a site with no location roster posts the pre-D-R62 body byte for byte.
    if (draft.location_id) {
      body.location_id = draft.location_id;
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
      if (draft.payment_amount_mode === 'full') {
        body.payment.amount_mode = 'full';
      }
    }
    if (draft.coupon_code) {
      body.coupon_code = draft.coupon_code;
    }
    if (externalCheckout?.deferIdentity) {
      delete body.customer;
      delete body.payment;
      delete body.coupon_code;
    }
    return body;
  }
  function validateDetails() {
    const e = {};
    if (!externalCheckout?.deferIdentity && !(0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_25__.normalizePart)(details.first_name)) {
      e.first_name = _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.err_first_name_required;
    }
    if (!externalCheckout?.deferIdentity && !(0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_25__.normalizePart)(details.last_name)) {
      e.last_name = _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.err_last_name_required;
    }
    if (!externalCheckout?.deferIdentity && !details.email.trim()) {
      e.email = _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.err_email_required;
    } else if (!externalCheckout?.deferIdentity && !EMAIL_RE.test(details.email.trim())) {
      e.email = _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.err_email_invalid;
    }
    if (!externalCheckout?.deferIdentity && phoneMode === 'required' && !details.phone.trim()) {
      e.phone = _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.err_phone_required;
    } else if (
    // The server's own rule (persona QA 2026-10-05, T-088): "abc" used to be stored.
    !externalCheckout?.deferIdentity && phoneMode !== 'off' && details.phone.trim() && !(0,_lib_config_js__WEBPACK_IMPORTED_MODULE_5__.isPhoneLike)(details.phone)) {
      e.phone = _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.err_phone_invalid;
    }
    if (consentEnabled && !consent) {
      e.consent = _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.err_consent_required;
    }
    // Custom fields: required + length, mirroring the server rules the
    // visitor would otherwise only meet as a 422 after a round trip.
    customFields.forEach(f => {
      const key = (0,_components_DetailsStep_jsx__WEBPACK_IMPORTED_MODULE_12__.customKey)(f.slug);
      const raw = customValues[f.slug];
      if (f.type === 'checkbox') {
        if (f.required && raw !== true) {
          e[key] = _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.err_field_required;
        }
        return;
      }
      const value = (raw === undefined || raw === null ? '' : String(raw)).trim();
      if (!value) {
        if (f.required) {
          e[key] = _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.err_field_required;
        }
        return;
      }
      if (f.maxLength && value.length > f.maxLength) {
        e[key] = (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.err_field_too_long, f.maxLength);
      }
    });
    // A typed-but-unapplied (or invalidated) code must never be dropped
    // silently into a full-price booking: Continue/Book waits for Apply or
    // a cleared field.
    const adjustmentError = externalCheckout ? null : coupon.validate();
    if (adjustmentError && coupon.fieldKey) {
      e[coupon.fieldKey] = adjustmentError;
    }
    return Object.keys(e).length ? e : null;
  }

  /**
   * Clear a field's error the moment THAT field becomes valid (QA D16, 2026-10-05) — not on the
   * next submit. Only errors are removed, never added (a new one still waits for submit), and
   * only for a field whose own value changed, so a server refusal on one field is not wiped by
   * typing in another.
   */
  const lastValuesRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    const values = Object.assign({
      consent
    }, details, Object.fromEntries(customFields.map(f => [(0,_components_DetailsStep_jsx__WEBPACK_IMPORTED_MODULE_12__.customKey)(f.slug), customValues[f.slug]])));
    const before = lastValuesRef.current;
    lastValuesRef.current = values;
    if (!before || !fieldErrors) {
      return;
    }
    const changed = Object.keys(values).filter(k => values[k] !== before[k] && fieldErrors[k]);
    if (!changed.length) {
      return;
    }
    // A field that is still invalid keeps an error, but the message follows the value (QA N2):
    // "Please enter your email." becomes "Please enter a valid email address." once something
    // malformed is typed.
    const now = validateDetails() || {};
    const moved = changed.filter(k => now[k] !== fieldErrors[k]);
    if (!moved.length) {
      return;
    }
    setFieldErrors(fe => {
      if (!fe) {
        return fe;
      }
      const next = Object.assign({}, fe);
      moved.forEach(k => {
        if (now[k]) {
          next[k] = now[k];
        } else {
          delete next[k];
        }
      });
      return Object.keys(next).length ? next : null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details, consent, customValues]);
  const backToDateTimeRefresh = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useCallback)(toastPayload => {
    setStep('datetime');
    setSelectedSlotUtc(null);
    setSubmitting(false);
    if (toastPayload) {
      setToast(toastPayload);
      // QA D14: the toast fades in seconds; this stays on Date & time until the visitor
      // picks another time, so nobody who looked away is left wondering why.
      setSlotTakenNotice(true);
    }
    fetchAvailability(cal.year, cal.month, displayTz);
  }, [cal.year, cal.month, displayTz, fetchAvailability]);

  /**
   * `409 aponto_slot_taken` while a NAMED staff member is selected (D-R50 fix round 1).
   *
   * The ordinary recovery — back to Date & time, toast, refetch — is right when the slot was
   * simply taken by somebody else. It is a LOOP when the reason is the staff member: archived, or
   * unassigned from the service, mid-flow. The server refuses under the lock, the widget
   * refetches the same `staff_id`, and (before the engine fix in this round, and still for the
   * unassigned case the instant it happens) gets slots back and offers the same dead end.
   *
   * So on a 409 with a named choice the catalogue is RE-READ, which is the only authority on
   * who is still eligible. If the staff member has gone from the selected service's `staff_ids`,
   * the choice is cleared and the customer is put back where the question is asked — the
   * Staff step if it still applies, otherwise Date & time on the any-staff calendar. The
   * toast is the existing one: from the customer's side this IS "that time is no longer
   * available", and naming staff churn at them would be the business's laundry.
   *
   * A block PRESET `staffId` is deliberately NOT touched: the site owner pinned it, the widget
   * has no mandate to un-pin it, and the engine fix above already makes that calendar empty.
   *
   * D-R62 extends the same reasoning to the LOCATION: a branch archived, or no longer offering
   * the service, mid-flow refuses the reserve the same way. So the catalogue is also re-read
   * whenever a non-preset location is in play; a CHOSEN location that has left the service's
   * `location_ids` is cleared and the customer goes back to the Location step (or on, when the
   * step no longer applies). The location is checked FIRST, because it comes first in the flow
   * and staff eligibility is asked at it. A preset `locationId` is never un-pinned.
   */
  /**
   * Re-read `/public/services` and hand the result to a recovery (D-R62 dedupe of the three
   * identical re-reads the `409`, `staff_id` and `location_id` recoveries each carried).
   *
   * The catalogue state is replaced with the fresh one, the SELECTED service is swapped for its
   * fresh copy when it still exists, and `onFresh( fresh, next )` decides where the customer
   * goes — `fresh` is null when the service itself left the catalogue.
   *
   * @param {Function} onFresh  `( fresh: ?Object, next: Object ) => void`.
   * @param {Function} [onFail] Called when the re-read fails.
   */
  function rereadCatalogue(onFresh, onFail) {
    const picked = service;
    api.getServices().then(res => {
      const next = shapeCatalogue(res);
      setCatalogue(c => Object.assign({}, c, {
        loading: false,
        error: false,
        services: next.services,
        categories: res.categories || [],
        staff: next.staff,
        locations: next.locations
      }));
      const fresh = picked ? next.services.find(s => s.id === picked.id) || null : null;
      if (fresh) {
        setService(fresh);
      }
      onFresh(fresh, next);
    }, onFail || (() => {}));
  }

  /**
   * Whether the location this booking was going to has been LOST in a refreshed catalogue
   * (D-R62 fix round 1): a CHOSEN branch that no longer offers the service, or a silently
   * ASSIGNED one that became ambiguous because the service is now offered at ≥2 places — in
   * both cases the next request would carry no usable `location_id`, and the only honest move
   * is to ask again. A block preset is never lost.
   *
   * @param {Object} fresh The service, re-read.
   * @param {Object} next  The re-read catalogue.
   * @return {boolean} Whether the location has to be asked for again.
   */
  function locationLost(fresh, next) {
    if (config.locationId) {
      return false;
    }
    if (typeof locationChoice === 'number' && !locationIdsFor(fresh, presetStaff).includes(locationChoice)) {
      return true;
    }
    return locationStepApplies(fresh, next.locations, config.locationId, presetStaff) && null === locationForIn(fresh, next, locationChoice);
  }

  /**
   * Whether the customer's STAFF answer survives a move to location `loc` (D-R62): "Any" always
   * does, a named person only while they still do this service there, and "not asked yet"
   * never counts as an answer.
   *
   * @param {Object}  fresh Service, re-read.
   * @param {?number} loc   The location the booking now goes to.
   * @return {boolean} Whether the staff answer is kept.
   */
  function keepStaffAt(fresh, loc) {
    if (undefined === staffChoice) {
      return false;
    }
    const kept = null === namedStaffId || eligibleStaffFor(fresh, loc).includes(namedStaffId);
    if (!kept) {
      setStaffChoice(undefined);
    }
    return kept;
  }

  /**
   * The first step that still needs an answer after the LOCATION was lost (D-R62 fix round 3):
   * Location when the refreshed service is offered at ≥2 places; else Staff, only when the
   * staff answer did not survive and there is a choice at the (silently assigned) branch; else
   * Date & time — a slot has to be confirmed again at the new branch in every case.
   *
   * @param {Object}  fresh     Service, re-read.
   * @param {Object}  next      Catalogue, re-read.
   * @param {boolean} staffKept Whether the staff answer survived.
   * @return {string} Step key.
   */
  function resumeStepFor(fresh, next, staffKept) {
    if (locationStepApplies(fresh, next.locations, config.locationId, presetStaff)) {
      return 'location';
    }
    if (staffKept) {
      return 'datetime';
    }
    return stepAfterLocation(fresh, next, locationForIn(fresh, next, undefined));
  }
  function recoverFromSlotTaken(toastPayload) {
    backToDateTimeRefresh(toastPayload);
    const locationInPlay = !!effectiveLocationId && !config.locationId;
    if (null === namedStaffId && !locationInPlay || !service) {
      return;
    }
    rereadCatalogue((fresh, next) => {
      const locationGone = !!fresh && locationLost(fresh, next);
      const loc = fresh ? locationForIn(fresh, next, locationGone ? undefined : locationChoice) : null;
      const staffGone = null !== namedStaffId && !(fresh && eligibleStaffFor(fresh, loc).includes(namedStaffId));
      // "Any" and a named person who survived are both still answers (fix round 3).
      const staffKept = undefined !== staffChoice && !staffGone;
      if (!locationGone && !staffGone) {
        // A silently assigned branch may still have MOVED (one place → another); the
        // derived id follows the new catalogue and the refetch effect repaints.
        return;
      }
      // The place or the person is gone. Drop the choice, invalidate the calendar it
      // produced, and ask again where asking belongs.
      invalidateAvailability();
      if (locationGone) {
        setLocationChoice(undefined);
      }
      if (staffGone) {
        setStaffChoice(undefined);
      }
      markNav();
      if (!fresh) {
        setStep('datetime');
      } else if (locationGone) {
        setStep(resumeStepFor(fresh, next, staffKept));
      } else {
        setStep(stepAfterLocation(fresh, next, loc));
      }
    });
    // A failed re-read leaves the ordinary recovery in place rather than guessing: the
    // customer is on Date & time with a refreshed calendar either way.
  }

  /**
   * `422 aponto_validation` with `fields.staff_id` — the site now says the customer MUST name
   * a staff member (D-R52 `booking.staff_choice = required`; fix round 1, P2-1).
   *
   * Without this the visitor sat on Details with a generic validation banner and no control
   * that could fix it: the choice they needed to change is two steps back, and the step they
   * would return to still rendered the "Any available" row the server had just rejected. Three
   * things have to happen together, and none of them is optional:
   *
   *  1. **Remember the refusal** (`staffRequiredBySrv`), because the page-global setting in
   *     this tab is stale and would otherwise re-render the same dead end.
   *  2. **Re-read the catalogue**, which is the only authority on who is eligible now — the
   *     same re-read the `409` recovery does, for the same reason.
   *  3. **Clear the choice and go back to the question**, so the customer answers it rather
   *     than being told they got something wrong.
   *
   * If the refreshed catalogue publishes no roster for this service — the owner changed more
   * than one thing, or the staff set shrank below two — there is nothing to ask, so the
   * visitor lands on Date & time and the next submit goes through on any-staff.
   */
  function recoverFromStaffRequired() {
    setStaffRequiredBySrv(true);
    setSubmitting(false);
    setSubmitError(null);
    setFieldErrors(null);
    setStaffChoice(undefined);
    invalidateAvailability();
    markNav();
    setToast({
      title: (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.toast_staff_required_title, staffTermRef.current),
      body: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.toast_staff_required_body
    });
    const fallback = () => setStep(service ? 'staff' : 'service');
    if (!service) {
      fallback();
      return;
    }
    rereadCatalogue((fresh, next) => {
      if (!fresh) {
        setStep('datetime');
      } else if (locationLost(fresh, next)) {
        // The location has to be asked again first (D-R62 fix round 1): staff are
        // asked AT it, and a null `location_id` would only earn the next 422.
        setLocationChoice(undefined);
        setStep(stepAfterService(fresh, next, undefined));
      } else {
        setStep(stepAfterLocation(fresh, next, locationForIn(fresh, next, locationChoice)));
      }
    },
    // The re-read failed. Send them to the step the refusal is about anyway: a stale
    // roster still names the people this service had a moment ago, and the alternative
    // is leaving them on Details with nothing to press.
    fallback);
  }

  /**
   * The `service:location` pair a `422 fields.location_id` was last recovered for — the loop
   * guard below (D-R62 fix round 1: keyed on the PAIR, because a silently assigned location is
   * not null and a guard keyed on "no location sent" never fired for it).
   */
  const locationRefusedRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);

  /**
   * `422 aponto_validation` with `fields.location_id` — STALE CONFIGURATION (D-R62), the
   * D-R52 `staff_id` shape.
   *
   * Two ways to get here: the page was loaded before the site started asking for a location
   * (so this tab had no roster and sent `null`, which the server refuses while a roster is
   * published — rest-contract §3.3 addendum 2026-09-23), or the location this booking was
   * going to stopped serving the service mid-flow. The catalogue is re-read (the only
   * authority on where the service is offered) and then exactly one of two things happens:
   *
   *  - **the refreshed catalogue has a question to ask** (the service is offered at ≥2 places)
   *    ⇒ clear the choice, invalidate the calendar and go to the Location step with the "pick
   *    a location" toast;
   *  - **it has none** (one branch left — assigned silently — or no roster at all) ⇒ still
   *    LEAVE Details (fix round 3, browser QA L12): the slot belonged to the refused branch and
   *    may not exist at the new one, so the customer goes back to the first step that needs an
   *    answer — Staff only if their staff choice did not survive, else Date & time with a
   *    calendar re-read for the new branch — under a neutral "form was updated" toast, and
   *    confirms a time again. Staying on Details let a second click book a different branch
   *    with nobody having looked at it. (With no roster the pre-reserve summary cannot name the
   *    new branch — the server publishes nothing for a single location — so the confirmation's
   *    `booking.location` is the first place it is named.)
   *
   * The "refresh the page" banner is kept for the SECOND refusal of the same `service:location`
   * pair (and for a failed re-read), because until then the form has refreshed itself — and
   * that same guard is why a server and a catalogue that disagree cannot produce a lap: every
   * further POST is the customer's own press. A block PRESET `locationId` is never
   * un-pinned — including a non-first branch on a `location_choice = first` site — so the
   * server's message goes to the ordinary banner. A service that left the catalogue returns to
   * the Service step, or to Date & time when there is no Service step to return to.
   *
   * @param {string} message The server's public-safe field message.
   */
  function recoverFromLocationStale(message) {
    setSubmitting(false);
    setFieldErrors(null);
    const text = message ? String(message) : '';
    const staleBanner = () => setSubmitError({
      kind: 'validation_stale',
      message: text
    });
    if (config.locationId || !service) {
      setSubmitError({
        kind: 'validation_general',
        message: text
      });
      return;
    }
    const pair = service.id + ':' + (effectiveLocationId || 0);
    if (locationRefusedRef.current === pair) {
      staleBanner();
      return;
    }
    locationRefusedRef.current = pair;
    setSubmitError(null);
    rereadCatalogue((fresh, next) => {
      // Everything derived from the refused location goes, whatever comes next: the
      // calendar and the slot belong to a branch this booking is no longer going to.
      invalidateAvailability();
      setLocationChoice(undefined);
      markNav();
      if (!fresh) {
        // The service itself is gone: choosing one again is the only honest place
        // to resume — or Date & time when this form has no Service step.
        setStaffChoice(undefined);
        if (serviceLocked) {
          setStep('datetime');
        } else {
          setService(null);
          setStep('service');
        }
        return;
      }
      const staffKept = keepStaffAt(fresh, locationForIn(fresh, next, undefined));
      const target = resumeStepFor(fresh, next, staffKept);
      setToast('location' === target ? {
        title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.location_title,
        body: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.toast_location_body
      } : {
        title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.toast_form_updated_title,
        body: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.toast_form_updated_body
      });
      setStep(target);
    }, () => {
      // The re-read failed. Ask the question if this tab can; otherwise the form did
      // NOT refresh itself, and the stale-form banner's "refresh" is the honest advice.
      if (locationStepApplies(service, catalogue.locations, config.locationId, presetStaff)) {
        invalidateAvailability();
        setLocationChoice(undefined);
        markNav();
        setToast({
          title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.location_title,
          body: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.toast_location_body
        });
        setStep('location');
        return;
      }
      staleBanner();
    });
  }

  // `attemptBooking` is a `useCallback` with a pinned dep list, so the recoveries are reached
  // through refs — a captured function would be one render stale exactly when it matters.
  const slotTakenRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  slotTakenRef.current = recoverFromSlotTaken;
  const staffRequiredRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  staffRequiredRef.current = recoverFromStaffRequired;
  const locationStaleRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  locationStaleRef.current = recoverFromLocationStale;
  // The customer-facing term, read from a ref for the same reason.
  const staffTermRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)('');

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
      const res = await (ctx.reserve ? ctx.reserve(body, key) : api.createBooking(body, key));
      setSubmitError(null);
      return {
        ok: true,
        response: res
      };
    } catch (raw) {
      // The applied coupon stopped being available between quote and
      // submit: the seam drops the quote (full price again) and the
      // message lands ON the coupon field, on the step that owns it.
      const couponMsg = couponRef.current.handleBookingError(raw);
      if (couponMsg) {
        setFieldErrors({
          [couponRef.current.fieldKey]: couponMsg
        });
        setSubmitError(null);
        setSubmitting(false);
        setStep('details');
        return {
          ok: false
        };
      }
      const info = (0,_lib_errors_js__WEBPACK_IMPORTED_MODULE_4__.classifyError)(raw);
      if (info.kind === 'validation' && info.fields?.['payment.amount_mode']) {
        setPayError(String(info.fields['payment.amount_mode']));
        setSubmitting(false);
        return {
          ok: false
        };
      }
      switch (info.kind) {
        case 'slot_taken':
        case 'not_found':
          slotTakenRef.current({
            title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.toast_slot_taken_title,
            body: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.toast_slot_taken_body
          });
          break;
        case 'validation':
          {
            const mapped = mapFieldErrors(info.fields);
            const fieldKeys = Object.keys(mapped).filter(k => k !== '__slot' && k !== '__stale' && k !== '__staff' && k !== '__location');
            if (mapped.__location) {
              // FIRST of all: the location comes first in the flow, and staff
              // eligibility is asked AT it, so answering it may settle the rest.
              locationStaleRef.current(mapped.__location);
            } else if (mapped.__staff) {
              // FIRST: this one is not about the time or the fields, it is about
              // a question the form stopped asking. Everything else in the same
              // 422 is re-validated on the way back through.
              staffRequiredRef.current();
            } else if (mapped.__slot) {
              backToDateTimeRefresh({
                title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.toast_slot_taken_title,
                body: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.err_pick_time
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
    const renderedCustomSlugs = new Set(customFields.map(f => (0,_components_DetailsStep_jsx__WEBPACK_IMPORTED_MODULE_12__.customKey)(f.slug)));
    Object.keys(fields).forEach(k => {
      const msg = fields[k];
      if (k === 'customer.first_name' || k === 'first_name') {
        out.first_name = msg;
      } else if (k === 'customer.last_name' || k === 'last_name') {
        out.last_name = msg;
      } else if (k === 'customer.email' || k === 'email') {
        out.email = msg;
      } else if (k === 'customer.phone' || k === 'phone') {
        out.phone = msg;
      } else if (k === 'consent') {
        out.consent = msg;
      } else if (coupon.fieldKey && k === coupon.fieldKey) {
        out[k] = msg;
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
      } else if (k === 'location_id') {
        // Stale configuration, not a customer mistake (D-R62): the site's location
        // roster changed under this tab. Its own recovery, like `staff_id` below.
        out.__location = msg;
      } else if (k === 'staff_id') {
        // Not a field on THIS step and not a mistake the customer made: the site's
        // staff-selection policy changed under them (D-R52 `required`). It gets its own
        // recovery rather than a banner (fix round 1, P2-1).
        out.__staff = msg;
      } else if (k === 'start_utc' || k === 'service_id' || k === 'X-Aponto-Idempotency') {
        out.__slot = msg;
      }
    });
    return out;
  }

  /** Land on the confirmation panel with an optional payment line. */
  function finishBooking(res, paymentLine) {
    holdRef.current = null;
    reservedOrderRef.current = null;
    setReservedOrder(null);
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
      token: (0,_lib_hold_js__WEBPACK_IMPORTED_MODULE_28__.manageToken)(res.manage_url) || (previous ? previous.token : ''),
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
    (0,_lib_hold_js__WEBPACK_IMPORTED_MODULE_28__.storeHold)(code, {
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
    reservedOrderRef.current = null;
    setReservedOrder(null);
    (0,_lib_hold_js__WEBPACK_IMPORTED_MODULE_28__.clearHold)(hold.orderCode);
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
        title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.pay_hold_kept_title,
        body: hold.expiresAt ? (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.pay_hold_kept, deadlineLabel(hold.expiresAt)) : _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.pay_hold_kept_generic
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
      setPayError(out.message || _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.pay_generic_error);
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
        title: (0,_lib_payments_js__WEBPACK_IMPORTED_MODULE_22__.gatewayUnavailableCopy)(method),
        body: held ? holdBody({
          expires_at: held.expiresAt
        }) : _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.pay_ui_unavailable_body
      });
      return;
    }
    if (out.status === 'cancelled') {
      // The customer closed the gateway's own window. NOTHING is lost —
      // the booking, its hold and the gateway's UI are all exactly as they
      // were — so this is a sentence, not a recovery flow.
      setSubmitting(false);
      setPayError((0,_lib_payments_js__WEBPACK_IMPORTED_MODULE_22__.gatewayCancelledCopy)(method));
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
        title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.pay_begin_failed_title,
        body: refused ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.pay_begin_refused_body : holdBody(out.payment),
        retry: !refused
      });
      return;
    }
    if (out.status === 'failed') {
      // Declines keep the hold AND the client secret: the customer retries
      // on the same intent rather than starting the whole booking again.
      setSubmitting(false);
      setPayError(out.message || _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.pay_generic_error);
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
    if (status === 'paid' || status === 'partial' || status === 'pending' && (!failure || unverified)) {
      (0,_lib_hold_js__WEBPACK_IMPORTED_MODULE_28__.clearHold)(orderCode);
      idem.reset();
      finishBooking(mergeBookingStatus(out.response, state), {
        status: unverified ? 'unverified' : status === 'partial' ? 'paid' : status,
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
      reservedOrderRef.current = null;
      setReservedOrder(null);
      (0,_lib_hold_js__WEBPACK_IMPORTED_MODULE_28__.clearHold)(orderCode);
      idem.reset();
      setPayIncomplete({
        orderCode,
        deadlineLabel: null,
        failureCopy: (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.paymentFailureCopy)(failure),
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
      setPayError((0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.paymentFailureCopy)(failure));
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
    return label ? (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.pay_hold_until, label) : _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.pay_hold_generic;
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
        status: state.booking_status,
        order: {
          ...res.booking?.order,
          ...state.order
        }
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
      const order = res.response.booking?.order;
      if (order) {
        const previous = reservedOrderRef.current || paymentTerms;
        reservedOrderRef.current = order;
        setReservedOrder(order);
        // Pause before the gateway confirmation when the reserved snapshot changed.
        if (Number.isInteger(order.payable_now_minor) && ((previous?.payable_now_minor ?? effectiveTotalMinor) !== order.payable_now_minor || (previous?.total_minor ?? effectiveTotalMinor) !== order.total_minor)) {
          setSubmitting(false);
          setPayNotice({
            title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.terms_changed,
            retry: true
          });
          throw HANDLED;
        }
      }
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
      setPayError((0,_lib_payments_js__WEBPACK_IMPORTED_MODULE_22__.gatewayUnavailableCopy)(draft.payment_method));
      return;
    }
    let out;
    try {
      out = await adapter.submit({
        begin: () => beginWithRetry(body, key, ctx),
        returnUrl: params => (0,_lib_hold_js__WEBPACK_IMPORTED_MODULE_28__.buildReturnUrl)(typeof window !== 'undefined' && window.location ? window.location.href : '', params)
      });
    } catch (error) {
      setSubmitting(false);
      if (error !== HANDLED) {
        // A throw from the gateway's own JS. Its text is written for an
        // integrator, so the visitor gets our copy instead.
        setPayError(_lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.pay_generic_error);
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
    if (submitting || submittingRef.current) {
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
    // The gateway's own readiness check, before anything is reserved: a
    // refusal here costs the visitor no booking and no hold.
    let refusal;
    try {
      refusal = await (0,_lib_payments_precheck_js__WEBPACK_IMPORTED_MODULE_27__.gatewayPrecheck)(gateways.find(g => g.code === draft.payment_method), {
        nonce: config.nonce
      });
    } catch (limited) {
      // The pre-check was rate limited: nothing is reserved, and the visitor
      // gets the same "too many attempts" state as a limited booking POST.
      setSubmitting(false);
      setSubmitError({
        kind: 'rate_limited'
      });
      setRateSeconds(Math.max(1, Math.ceil(Number(limited?.retryAfter) || 30)));
      return null;
    }
    if (refusal) {
      setSubmitting(false);
      setPayError(refusal);
      return null;
    }
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
        setPayError(_lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.pay_generic_error);
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
    const adapter = payMethod && payMethod !== _components_PaymentStep_jsx__WEBPACK_IMPORTED_MODULE_15__.ONSITE ? adaptersRef.current[payMethod] : null;
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
      setPayError(_lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.pay_ui_unavailable);
      return;
    }
    let out;
    try {
      out = await adapter.submit({
        begin: async () => stored,
        returnUrl: params => (0,_lib_hold_js__WEBPACK_IMPORTED_MODULE_28__.buildReturnUrl)(typeof window !== 'undefined' && window.location ? window.location.href : '', params)
      });
    } catch {
      setSubmitting(false);
      setPayError(_lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.pay_generic_error);
      return;
    }
    await applyPaymentOutcome(out, payMethod);
  }
  function submit() {
    // Some checkout adapters expose their existing flow through the shared footer.
    const footerAdapter = step === 'payment' ? adaptersRef.current[payMethod] : null;
    if (footerAdapter?.activate) {
      if (!submitting && !submittingRef.current && !gatewayBusyRef.current) {
        footerAdapter.activate();
      }
      return;
    }
    if (submitting || submittingRef.current) {
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
    if (!payMethod || payMethod === _components_PaymentStep_jsx__WEBPACK_IMPORTED_MODULE_15__.ONSITE || !service) {
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
    const adapter = (0,_lib_payments_js__WEBPACK_IMPORTED_MODULE_22__.createGatewayAdapter)(gateway, gateways);
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
      nonce: config.nonce,
      // The widget's half of the sequence, for a gateway that starts it
      // from its own control. Read through the ref on every call so a
      // button rendered once still reaches the current state.
      flow: {
        authorization: () => holdRef.current?.token,
        checkout: () => gatewayFlowRef.current.checkout(),
        confirm: ref => gatewayFlowRef.current.confirm(gateway.code, ref),
        settle: out => gatewayFlowRef.current.settle(out, gateway.code)
      },
      // MINOR units plus the ISO exponent: only the adapter knows its own
      // gateway's exponent, so only the adapter can do the conversion
      // (D-R39a). It refuses to mount rather than quote a rounded figure.
      amountMinor: payableMinor,
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
        title: (0,_lib_payments_js__WEBPACK_IMPORTED_MODULE_22__.gatewayUnavailableCopy)(gateway.code),
        body: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.pay_ui_unavailable_body
      });
    });
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, payMethod, service, gateways, mountNonce, payableMinor]);

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
      amountMinor: payableMinor,
      currencyExponent,
      scope: wrapRef.current
    });
  }, [payMethod, service, config.appearance, currencyExponent, payableMinor]);

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
    (0,_lib_hold_js__WEBPACK_IMPORTED_MODULE_28__.stripReturn)(typeof window !== 'undefined' ? window : null);

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
              },
              // The place the server booked (D-R62 fix round 1). Without it the
              // resumed confirmation had no "Where" and its Google Calendar
              // link fell back to the business NAME — the D-R61 bug again.
              ...(booking.location ? {
                location: booking.location
              } : {})
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
    (0,_lib_hold_js__WEBPACK_IMPORTED_MODULE_28__.stripReturn)(typeof window !== 'undefined' ? window : null);

    // The whitelist from `rememberHold` — display facts and references, no
    // capability of any kind (F5). It is therefore NOT enough to rebuild the
    // full confirmation panel, and deliberately so: this leg renders the
    // minimal one and points the customer at the manage link in their email.
    const stored = (0,_lib_hold_js__WEBPACK_IMPORTED_MODULE_28__.readHold)(returnLeg.order);
    (0,_lib_hold_js__WEBPACK_IMPORTED_MODULE_28__.clearHold)(returnLeg.order);
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
      if (status !== 'paid' && status !== 'partial' && (status !== 'pending' || failure)) {
        setPayIncomplete({
          orderCode: returnLeg.order,
          deadlineLabel: deadlineLabel(state.expires_at),
          failureCopy: failure ? (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.paymentFailureCopy)(failure) : '',
          // Same rule as the in-widget leg: a hold that is already
          // gone must not be described as still running.
          released: 'hold_released' === failure,
          retryable: false
        });
        return;
      }
      setPayResult({
        status: status === 'partial' ? 'paid' : status,
        // No amount survives the whitelist, and the confirm route
        // never carried one — so the line says what is known.
        amountLabel: '',
        orderCode: state.order_code || returnLeg.order
      });
      setMinimalConfirm({
        confirmed: state.booking_status === 'confirmed',
        order: state.order,
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
    paymentChoice.reset();
    markNav();
    invalidateAvailability();
    setService(s);
    // A coupon was quoted for the PREVIOUS service's price and allow-list (D-R67): drop it.
    coupon.reset();
    // A staff member NAMED for the PREVIOUS service survives only if the new service is one
    // they actually do — otherwise it would post a `staff_id` the server rejects as
    // ineligible, and the customer would never have been shown the row (D-R50). Anything
    // else goes back to `undefined`: a fresh service is a fresh question.
    //
    // The LOCATION follows the same rule (D-R62): a place chosen for the previous service
    // survives only where the new service is offered, and the staff check is then asked at
    // whatever location the new service will actually be booked at.
    const keepLocation = typeof locationChoice === 'number' && locationIdsFor(s, presetStaff).includes(locationChoice);
    if (!keepLocation) {
      setLocationChoice(undefined);
    }
    const nextChoice = keepLocation ? locationChoice : undefined;
    const stillEligible = null !== namedStaffId && eligibleStaffFor(s, locationForIn(s, catalogue, nextChoice)).includes(namedStaffId);
    if (!stillEligible) {
      setStaffChoice(undefined);
    }
    setStep(stepAfterService(s, catalogue, nextChoice));
  }

  /**
   * Location → Staff or Date & time (D-R62). Auto-advances on pick, like a Service or Staff row.
   *
   * A different branch is a different calendar, so the day, the slot and the auto-pick flag
   * go — and the fetch token is bumped HERE, synchronously, so an in-flight response for the
   * previous branch cannot paint (the D-R50 fix (iii) rule). A NAMED staff member who does not
   * work at the new branch is dropped, the same shape as a service change dropping one the new
   * service does not have; and when only one staff member remains there, the Staff step is
   * skipped (D-R60 rule 8).
   *
   * @param {number} id Location id.
   */
  function selectLocation(id) {
    markNav();
    if (id !== locationChoice) {
      invalidateAvailability();
    }
    setLocationChoice(id);
    if (null !== namedStaffId && !eligibleStaffFor(service, id).includes(namedStaffId)) {
      setStaffChoice(undefined);
    }
    setStep(stepAfterLocation(service, catalogue, id));
  }

  /**
   * Staff → Date & time (D-R50). Auto-advances on pick, exactly like a service row.
   *
   * Everything derived from the previous staff member's calendar is dropped: a day and a slot
   * that were free for Ana are not necessarily free for Bo, and the auto-pick flag has to
   * re-arm or the first available day would stay on the old person's calendar.
   *
   * A first pick of "Any available" (`undefined` → `null`) changes no request, but it DOES
   * change the step's own state, so it is still recorded — Back must show the row the customer
   * chose.
   *
   * @param {?number} id Staff id, or null for "Any available".
   */
  function selectStaff(id) {
    markNav();
    setStaffProfile(null);
    if ((id || null) !== (staffChoice || null)) {
      invalidateAvailability();
    }
    setStaffChoice(id);
    setStep('datetime');
  }

  /** Reserve once, then retry handoff against the same in-memory authorization. */
  async function continueExternalCheckout() {
    if (!externalCheckout || gatewayBusyRef.current || submitBlocked) {
      return;
    }
    const errors = validateDetails();
    if (errors) {
      setFieldErrors(errors);
      return;
    }
    if (honeypot) {
      setSubmitError({
        kind: 'guard'
      });
      return;
    }
    setFieldErrors(null);
    setSubmitError(null);
    setSubmitting(true);
    markGatewayBusy(true);
    try {
      // Asked before the reserve AND before every retry of the handoff, so a
      // refusal never costs a hold the visitor did not get to use.
      const refusal = await (0,_lib_payments_precheck_js__WEBPACK_IMPORTED_MODULE_27__.gatewayPrecheck)(gateways[0], {
        nonce: config.nonce
      });
      if (!externalMounted.current) {
        return;
      }
      if (refusal) {
        setSubmitError({
          kind: 'external_checkout',
          title: externalCheckout.errorTitle,
          body: refusal
        });
        return;
      }
      if (!externalAttempt.current) {
        const draft = buildDraft();
        const begun = await beginWithRetry(buildBody(draft), idem.keyFor(draft), {
          draft,
          lockRetried: false,
          inflightTries: 0,
          conflictRetried: false,
          reserve: externalCheckout.deferIdentity ? (body, key) => externalCheckout.reserve(body, key, config) : undefined
        });
        if (!externalMounted.current) {
          return;
        }
        if (begun.payment?.status !== 'begin' || !begun.payment.gateway_ref) {
          setSubmitError({
            kind: 'network'
          });
          return;
        }
        externalAttempt.current = begun;
        setExternalReserved(true);
      }
      await externalCheckout.handoff({
        nonce: config.nonce,
        payment: externalAttempt.current.payment,
        token: holdRef.current?.token,
        isCurrent: () => externalMounted.current
      });
    } catch (error) {
      if (externalMounted.current && error !== HANDLED) {
        if (error?.code === 'aponto_rate_limited') {
          setSubmitError({
            kind: 'rate_limited'
          });
          setRateSeconds(Math.max(1, Math.ceil(Number(error.retryAfter) || 30)));
        } else {
          setSubmitError(externalAttempt.current ? {
            kind: 'external_checkout',
            title: externalCheckout.errorTitle,
            // The gateway's own sentence when it sent one the
            // visitor can act on; our copy otherwise.
            body: error?.code === 'aponto_payment_state' && error.message !== error.code && (0,_lib_payments_precheck_js__WEBPACK_IMPORTED_MODULE_27__.publicRefusal)(error.message) || (holdRef.current?.token ? externalCheckout.errorBody : externalCheckout.recoveryBody)
          } : {
            kind: 'network'
          });
        }
      }
    } finally {
      if (externalMounted.current) {
        setSubmitting(false);
        markGatewayBusy(false);
      }
    }
  }
  function goToDetails() {
    if (externalCheckout?.deferIdentity && !customFields.length && !consentEnabled) {
      continueExternalCheckout();
      return;
    }
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
    return gateways.length ? gateways[0].code : _components_PaymentStep_jsx__WEBPACK_IMPORTED_MODULE_15__.ONSITE;
  }

  /**
   * Whether a method is still selectable in the current configuration —
   * on-site only when the site allows it, a gateway only when it is offered.
   *
   * @param {string} method Method key.
   * @return {boolean} Validity.
   */
  function methodIsValid(method) {
    if (method === _components_PaymentStep_jsx__WEBPACK_IMPORTED_MODULE_15__.ONSITE) {
      return paymentMode === 'optional';
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

  /** Staff → back one step: Location when it exists, otherwise Service (D-R62). */
  function backFromStaff() {
    markNav();
    releaseHold();
    setStep(locationStepExists ? 'location' : 'service');
  }

  /**
   * Date & time → back one step: Staff when it exists, then Location (D-R62), otherwise
   * Service (D-R50).
   */
  function backFromDateTime() {
    markNav();
    releaseHold();
    if (staffStepExists) {
      setStep('staff');
    } else {
      setStep(locationStepExists ? 'location' : 'service');
    }
  }
  function backToDateTime() {
    markNav();
    releaseHold();
    setStep('datetime');
  }

  /**
   * The one-page intro's "Change time" (D-R80): Details or Payment → Date & time, every typed
   * detail kept. From Payment it is Back-to-Details plus one more step, under the same guard:
   * never while a gateway owns an attempt, and the hold goes with it.
   */
  function changeTime() {
    if (gatewayBusyRef.current) {
      return;
    }
    setPayError('');
    setPayNotice(null);
    backToDateTime();
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

  /**
   * Rail navigation (founder review 2026-09-30): a DONE step on the progress rail jumps back
   * to it, exactly like the Back buttons do — mark navigation, release any hold, keep every
   * choice. Never forward, and never from Payment (a live hold a gateway may be capturing
   * against) or Confirmation (the booking exists).
   *
   * @param {number} index 0-based rail index.
   */
  function jumpToStep(index) {
    const key = stepList[index];
    if (!key || index + 1 >= stepIndex || gatewayBusyRef.current) {
      return;
    }
    markNav();
    releaseHold();
    setStep(key);
  }

  /** Back to the Service step with a clean slate (D-R79's paid-unavailable stop only). */
  function changeService() {
    markNav();
    releaseHold();
    invalidateAvailability();
    setService(null);
    coupon.reset();
    setStaffChoice(undefined);
    setLocationChoice(undefined);
    setStep('service');
  }
  function bookAnother() {
    paymentChoice.reset();
    markNav();
    idem.reset();
    holdRef.current = null;
    reservedOrderRef.current = null;
    setReservedOrder(null);
    // A resume leg is over once its booking is: the next booking is an ordinary one, with
    // no inherited Payment step and no stale `/pay` response to confirm (fix round 2).
    resumeRef.current = null;
    setResume(null);
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
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      note: ''
    });
    setConsent(false);
    setCustomValues({});
    coupon.reset();
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
    setStaffChoice(undefined);
    setLocationChoice(undefined);
    locationRefusedRef.current = null;
    if (only) {
      // The auto-pick effect re-selects the first available day.
      setService(only);
      setStep(stepAfterService(only, catalogue, undefined));
    } else {
      setService(null);
      setStep('service');
    }
  }

  // --- Derived layout data. -------------------------------------------------
  // Honest numbering: the Payment step is IN the list only when this booking
  // actually has one, so a free service on a paying site reads `01 / 04` and a
  // paid one `01 / 05` — and a preselected service drops one from either.
  // --- Staff step presentation (D-R52). --------------------------------------
  // Page-global settings, already normalized and already merged with the block's own
  // `staffLayout` override by `resolveConfig()`, so there is exactly one place to read.
  // `|| STAFF_DEFAULTS` is not defensive clutter: `App` is also mounted by hosts that build a
  // config object by hand (the dev harness, the jsdom tests), and the shipped defaults are the
  // only honest answer to "the page said nothing".
  const staffDisplay = config.staff || _lib_config_js__WEBPACK_IMPORTED_MODULE_5__.STAFF_DEFAULTS;
  // The site's own word for a staff member, or the neutral translated default. Operator text,
  // rendered through `sprintf` into a TEXT node — never markup.
  const staffTerm = staffDisplay.label || _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.staff_term;
  staffTermRef.current = staffTerm;
  /**
   * What the Staff step actually renders with: the site's own settings, unless the SERVER has
   * already refused an unnamed booking in this session, in which case `required` wins whatever
   * the (now stale) page-global says (fix round 1, P2-1). One object, so no consumer can read
   * the stale value by accident.
   */
  const staffView = staffRequiredBySrv ? Object.assign({}, staffDisplay, {
    choice: 'required'
  }) : staffDisplay;

  /**
   * Return focus to the "Learn more" that opened the dialog, once it has closed.
   *
   * In an EFFECT rather than in the close handler because the card behind carries `inert`
   * until the closing render commits, and focusing a still-inert element is a no-op. When the
   * dialog closed because the visitor pressed "Book with …" the step has already changed, so
   * the trigger is detached and `isConnected` declines the focus — which is right: the new
   * step's heading owns focus there.
   */
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (staffProfile) {
      profileReturnRef.current = staffProfile.trigger;
      return;
    }
    const back = profileReturnRef.current;
    profileReturnRef.current = null;
    if (back && back.isConnected) {
      back.focus();
    }
  }, [staffProfile]);

  // The Location step (D-R62) sits between Service and Staff (D-R60 order), and the Staff
  // step (D-R50) between it and Date & time. Each `*InList` owns the denominator rule for the
  // Service step, where no service is picked yet; the Staff step's is asked AT the effective
  // location, so picking a branch where one person works drops it from the count.
  const locationStepExists = locationStepInList(service, catalogue, config.locationId, presetStaff);
  const staffStepExists = staffStepInList(service, catalogue, config.staffId, service ? effectiveLocationId : s => locationForIn(s, catalogue, undefined));
  const stepList = [];
  if (!serviceLocked) {
    stepList.push('service');
  }
  if (locationStepExists) {
    stepList.push('location');
  }
  if (staffStepExists) {
    stepList.push('staff');
  }
  stepList.push('datetime');
  if (!externalCheckout?.deferIdentity || customFields.length || consentEnabled) {
    stepList.push('details');
  }
  if (paymentStepExists) {
    stepList.push('payment');
  }
  stepList.push('confirmation');
  const stepCount = stepList.length;
  const stepIndex = stepList.indexOf(step) + 1;

  /**
   * The macro progress rail's labels (D-R53), or `null` while the block asks for the
   * fraction — which is the default and therefore almost every block.
   *
   * Built from the SAME `stepList` the fraction's denominator comes from, so the rail cannot
   * drift from the number: the Staff and Payment steps appear only when this booking really
   * has them, and a preselected service drops Service from both. The Staff label follows the
   * site's own word for a staff member (D-R52), capitalised — a salon that says "stylist"
   * everywhere else should not meet the word "Staff" here.
   */
  const progress = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => {
    if ('horizontal' !== config.stepDisplay) {
      return null;
    }
    const term = staffDisplay.label;
    const staffLabel = term ? [...term][0].toUpperCase() + [...term].slice(1).join('') : _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.step_staff;
    const labels = {
      service: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.step_service,
      location: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.step_location,
      staff: staffLabel,
      datetime: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.step_datetime,
      details: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.step_details,
      payment: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.step_payment,
      confirmation: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.step_confirmation
    };
    return {
      display: 'horizontal',
      steps: stepList.map(key => labels[key] || key)
    };
    // `stepList` is rebuilt every render by design (it is derived state, not stored), so
    // the memo keys on its JOINED form rather than on the array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.stepDisplay, staffDisplay.label, stepList.join(',')]);
  // The rail with its navigation attached — only where jumping back is safe (see jumpToStep).
  const railNav = progress && step !== 'payment' && step !== 'confirmation' ? {
    ...progress,
    onJump: jumpToStep
  } : progress;
  // Two summary surfaces, two rules (D-R49). `inFlow` is the pre-D-R49 condition:
  // a step past Service with a service in hand.
  //  - showAside: the sidebar COLUMN exists in the grid (CSS reveals it at ≥700px
  //    containers). `always` adds the Service step — with nothing picked the
  //    Summary renders its empty state — so the content column is the same width
  //    on every step. Not over a failed or empty catalogue: "Start with a
  //    service" beside "No services available" would be a lie.
  //  - showRecap: the in-flow recap bar. Never on a Service step with nothing
  //    selected — there is nothing to recap. With `off` it is the only summary
  //    surface, so CSS keeps it at every width (`.ap-recap.solo`).
  const summaryMode = _lib_config_js__WEBPACK_IMPORTED_MODULE_5__.SUMMARY_MODES.includes(config.summaryMode) ? config.summaryMode : 'always';
  // The Staff step is past Service with a service in hand, so it is IN the flow for
  // both summary surfaces — the sidebar stays on and the recap keeps recapping (D-R49).
  const inFlow = (step === 'location' || step === 'staff' || step === 'datetime' || step === 'details' || step === 'payment') && !!service;
  const asideOnService = summaryMode === 'always' && step === 'service' && !catalogue.error && (catalogue.loading || catalogue.services.length > 0);
  const showAside = summaryMode !== 'off' && (inFlow || asideOnService);
  const showRecap = inFlow || asideOnService && !!service;
  const years = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => {
    const y = initialYear;
    return [y, y + 1];
  }, [initialYear]);

  /**
   * The one-page frame (D-R80, block `layout: 'one-page'`): the SAME step machine in a second
   * presentation — an intro panel in the first column, the active screen beside it, no rail,
   * no fraction. It needs a LOCKED service (a resolvable preset, or the
   * lone active service); anything else — no preset on a multi-service site, a preset the
   * catalogue no longer lists beside ≥2 services, a failed catalogue — is the default wizard,
   * exactly as today. While the catalogue loads, a block with a PRESET shows the frame's own
   * skeleton, so it never flashes the catalogue or the summary's empty state; a block without
   * one keeps the default loading frame until the catalogue says whether a lone service locks
   * it (fix round 1: painting the one-page skeleton there and then flipping to the wizard on a
   * multi-service site was the flash this rule exists to avoid). `summaryMode` and
   * `stepDisplay` have no meaning here and are ignored.
   */
  const lockedService = serviceLocked ? service || (preselectedId ? catalogue.services.find(s => s.id === preselectedId) : null) || (singleService ? catalogue.services[0] : null) : null;
  const onePage = 'one-page' === config.layout && (catalogue.loading && !!preselectedId || !!lockedService);
  // Numbering is wizard chrome: the one-page frame passes none, which is how StepHeader,
  // StepRail and the confirmation panels already render a plain heading.
  const shownIndex = onePage ? null : stepIndex;
  const shownCount = onePage ? null : stepCount;
  const shownProgress = onePage ? null : railNav;

  // The NAME behind `staffChoice`, or '' for "Any available" and for every site with no
  // roster. A block preset deliberately does NOT produce a name: it is the site owner's
  // pin, not the customer's choice, and it never showed in the summary before (D-R50).
  const namedStaffMember = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => {
    if (null === namedStaffId) {
      return null;
    }
    return (catalogue.staff || []).find(m => m.id === namedStaffId) || null;
  }, [namedStaffId, catalogue.staff]);
  const staffName = namedStaffMember ? namedStaffMember.name : '';
  // The visitor answered the Staff step with "Any available" (`null`, as opposed to
  // `undefined` = not answered). The summary names that choice instead of going silent
  // right after the visitor made it (founder review 2026-09-30). Only reachable where the
  // step exists, so a Free or single-staff summary is unchanged (D-R50).
  const staffAny = null === staffChoice && stepList.includes('staff');

  /**
   * The roster entry behind `effectiveLocationId` — chosen, silently assigned or preset — for
   * the pre-reserve summary (D-R62). `null` on every site with no location roster, which keeps
   * their summary byte-identical; a preset the roster does not name has nothing to print yet
   * and is answered by the server on the confirmation instead.
   */
  const summaryLocation = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => {
    if (!effectiveLocationId) {
      return null;
    }
    return (catalogue.locations || []).find(l => l.id === effectiveLocationId) || null;
  }, [effectiveLocationId, catalogue.locations]);

  /**
   * What the CONFIRMATION prints under "Where" (D-R62).
   *
   * The SERVER's `booking.location` wins — it is the place the reserve actually booked, while
   * the roster in this tab may be stale. Its `id` (fix round 2, rest-contract §3.3) says whether
   * that is a real branch (`> 0`) or the business fallback (`0`, also what an older server with
   * no `id` means), so:
   *  - a real branch is ALWAYS printed — including one the server assigned silently on a
   *    single-location site that sent no `location_id`, and a resume leg, which never loaded
   *    a catalogue. (The pre-reserve summary stays silent there: without a roster the widget
   *    has nothing to name before the reserve.)
   *  - the business fallback is printed only when this booking had a location in play and the
   *    response is older than that `id` — otherwise the roster entry is the fallback; a Free
   *    booking (`id` 0, nothing in play) prints nothing, exactly as before.
   */
  // The summary's "Questions? Call …" number (founder review 2026-09-30): the chosen branch's
  // own phone when it has one, else the business phone; '' prints nothing.
  const contactPhone = config.contactHelp ? summaryLocation && summaryLocation.phone || config.business.phone || '' : '';
  const confirmLocation = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => {
    const booked = response && response.booking ? response.booking.location : null;
    const named = booked && typeof booked.name === 'string' && '' !== booked.name ? {
      name: booked.name,
      address: typeof booked.address === 'string' ? booked.address : ''
    } : null;
    if (named && parseInt(booked.id, 10) > 0) {
      return named;
    }
    if (resume || !effectiveLocationId) {
      return null;
    }
    return named || summaryLocation;
  }, [effectiveLocationId, response, summaryLocation, resume]);

  // The job title beside that name (D-R51). Empty for Any, for a block preset and for every
  // site that has not filled one in — the summary line then reads exactly as it did under
  // D-R50.
  const staffTitle = namedStaffMember ? namedStaffMember.title || '' : '';

  /**
   * The name the CONFIRMATION prints (D-R50 fix round 1, Amelia/LatePoint comparison).
   *
   * Once a site publishes a roster, "Any available" has a concrete answer the moment the
   * booking commits, and the customer is entitled to it: the panel names whoever the server
   * actually assigned, read from the booking response rather than from the widget's own choice.
   * The PRE-reserve summary still shows nothing for Any, because before the reserve there is no
   * honest answer to give. A site with no roster (Free, single-staff Premium) prints nothing at
   * all, exactly as it did before this feature existed.
   */
  const confirmStaff = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => {
    if (staffName) {
      return {
        name: staffName,
        title: staffTitle
      };
    }
    if (!(catalogue.staff || []).length) {
      return {
        name: '',
        title: ''
      };
    }
    const assigned = response && response.booking && response.booking.staff;
    if (!assigned || typeof assigned.name !== 'string') {
      return {
        name: '',
        title: ''
      };
    }
    return {
      name: assigned.name,
      // `title` is OMITTED from the post-booking staff object when the site left it
      // empty (D-R51), so the `typeof` guard is what an absent key looks like here.
      title: typeof assigned.title === 'string' ? assigned.title : ''
    };
  }, [staffName, staffTitle, catalogue.staff, response]);
  const confirmStaffName = confirmStaff.name;
  const confirmStaffTitle = confirmStaff.title;
  const submitBanner = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => {
    if (!submitError) {
      return null;
    }
    switch (submitError.kind) {
      case 'external_checkout':
        return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_feedback_jsx__WEBPACK_IMPORTED_MODULE_18__.Banner, {
          variant: "err",
          title: submitError.title,
          body: submitError.body
        });
      case 'rate_limited':
        return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_feedback_jsx__WEBPACK_IMPORTED_MODULE_18__.Banner, {
          variant: "warn",
          title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.rate_limited_title,
          body: (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.rate_limited_body, rateSeconds)
        });
      case 'lock_timeout':
        return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_feedback_jsx__WEBPACK_IMPORTED_MODULE_18__.Banner, {
          variant: "err",
          title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.lock_timeout_title,
          body: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.lock_timeout_body
        });
      case 'in_flight':
      case 'in_flight_manual':
        return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_feedback_jsx__WEBPACK_IMPORTED_MODULE_18__.Banner, {
          variant: "clock",
          title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.in_flight_title,
          body: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.in_flight_body
        });
      case 'guard':
        return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_feedback_jsx__WEBPACK_IMPORTED_MODULE_18__.Banner, {
          variant: "err",
          title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.guard_title,
          body: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.guard_body
        });
      case 'validation_general':
        return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_feedback_jsx__WEBPACK_IMPORTED_MODULE_18__.Banner, {
          variant: "err",
          title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.validation_general_title,
          body: submitError.message || _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.validation_general_body
        });
      case 'validation_stale':
        return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_feedback_jsx__WEBPACK_IMPORTED_MODULE_18__.Banner, {
          variant: "err",
          title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.validation_general_title,
          body: submitError.message ? submitError.message + ' ' + _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.stale_form_hint : _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.stale_form_hint
        });
      default:
        return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_feedback_jsx__WEBPACK_IMPORTED_MODULE_18__.Banner, {
          variant: "err",
          title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.load_availability_err,
          body: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.load_retry_sub
        });
    }
  }, [submitError, rateSeconds]);
  const submitBlocked = submitting || submitError && submitError.kind === 'rate_limited' && rateSeconds > 0;

  // --- Render. --------------------------------------------------------------
  function renderStep() {
    // D-R79 (opt-in site setting): online payment is required, no payment method is ready and
    // the owner chose not to take paid bookings unpaid. The catalogue still lists the service;
    // choosing a PAID one stops here, with the business's number when the form shows it. Free
    // services go on as usual, and `POST /public/bookings` enforces the same rule.
    if (payments.paidUnavailable && !resume && !response && step !== 'service' && step !== 'confirmation' && service && Number(service.price_minor) > 0) {
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsxs)("div", {
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_feedback_jsx__WEBPACK_IMPORTED_MODULE_18__.Banner, {
          variant: "err",
          title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.paid_unavailable_title,
          body: [_lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.paid_unavailable_body, contactPhone].filter(Boolean).join(' ')
        }), catalogue.services.length > 1 && !serviceLocked ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsxs)("div", {
          class: "ap-foot",
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)("span", {}), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)("button", {
            type: "button",
            class: "ap-primary",
            onClick: changeService,
            children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.change_service
          })]
        }) : null]
      });
    }
    if (step === 'service') {
      if (catalogue.loading) {
        return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_Skeletons_jsx__WEBPACK_IMPORTED_MODULE_20__.ServiceSkeleton, {});
      }
      if (catalogue.error) {
        return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsxs)("div", {
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_feedback_jsx__WEBPACK_IMPORTED_MODULE_18__.Banner, {
            variant: "err",
            title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.load_services_err,
            body: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.load_retry_sub
          }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsxs)("div", {
            class: "ap-foot",
            children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)("span", {}), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)("button", {
              type: "button",
              class: "ap-primary",
              onClick: loadCatalogue,
              children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.try_again
            })]
          })]
        });
      }
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_ServiceStep_jsx__WEBPACK_IMPORTED_MODULE_7__.ServiceStep, {
        services: catalogue.services,
        categories: catalogue.categories,
        locale: config.locale,
        currencyExponent: currencyExponent,
        selectedId: service ? service.id : null,
        stepIndex: shownIndex,
        progress: shownProgress,
        stepCount: shownCount,
        focusOnMount: navigatedRef.current,
        onSelect: selectService
      });
    }
    if (step === 'location' && service) {
      const offered = locationIdsFor(service, presetStaff).map(id => (catalogue.locations || []).find(l => l.id === id)).filter(Boolean);
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_LocationStep_jsx__WEBPACK_IMPORTED_MODULE_9__.LocationStep, {
        locations: offered,
        selectedId: locationChoice,
        stepIndex: shownIndex,
        progress: shownProgress,
        stepCount: shownCount,
        focusOnMount: navigatedRef.current,
        onSelect: selectLocation,
        onBack: serviceLocked ? null : backToService
      });
    }
    if (step === 'staff' && service) {
      // Asked AT the effective location (D-R62): a branch shows only the people who work
      // there.
      const eligible = eligibleStaffFor(service, effectiveLocationId).map(id => (catalogue.staff || []).find(m => m.id === id)).filter(Boolean);
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_StaffStep_jsx__WEBPACK_IMPORTED_MODULE_8__.StaffStep, {
        staff: eligible,
        selectedId: staffChoice,
        display: staffView,
        term: staffTerm,
        stepIndex: shownIndex,
        progress: shownProgress,
        stepCount: shownCount,
        focusOnMount: navigatedRef.current,
        onSelect: selectStaff,
        onOpenProfile: (member, trigger) => setStaffProfile({
          member,
          trigger
        }),
        onBack: serviceLocked && !locationStepExists ? null : backFromStaff
      });
    }
    if (step === 'datetime' && service) {
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_DateTimeStep_jsx__WEBPACK_IMPORTED_MODULE_11__.DateTimeStep, {
        locale: config.locale,
        displayTz: displayTz,
        businessTz: businessTz,
        showTzNote: showTzNote,
        tzOptions: tzOptions,
        tzSuggested: tzSuggested,
        calYear: cal.year,
        calMonth: cal.month,
        onMonth: (year, month) => {
          // The VISITOR is paging: never skip the month they chose, even an empty one
          // (D-R64 item 4), and the "first month with times" notice no longer applies.
          autoAdvance.current.armed = false;
          carriedRef.current = false;
          setMonthNotice('');
          setSelectedDayKey(null);
          setSelectedSlotUtc(null);
          setCal({
            year,
            month
          });
        },
        monthNotice: monthNotice,
        availabilityIndex: avail.index,
        availLoading: avail.loading,
        availError: avail.error,
        onRetryAvail: () => fetchAvailability(cal.year, cal.month, displayTz, autoAdvance.current.armed && !(selectedSlotUtc && selectedDayKey)),
        todayKey: (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.dayKeyInTz)(Date.now(), displayTz),
        years: years,
        selectedDayKey: selectedDayKey,
        onSelectDay: key => {
          // A pick made while a zone change is still re-reading is the visitor's
          // own: the carried-selection check must not move it.
          carriedRef.current = false;
          setSelectedDayKey(key);
          setSelectedSlotUtc(null);
        },
        selectedSlotUtc: selectedSlotUtc,
        onSelectSlot: utc => {
          setSlotTakenNotice(false);
          setSelectedSlotUtc(utc);
        },
        heldStarts: (0,_components_CheckoutNotice_jsx__WEBPACK_IMPORTED_MODULE_19__.heldStarts)(checkout.session, service, effectiveStaffId),
        onChangeDisplayTz: tz => {
          if (tz === displayTz) {
            return;
          }
          // A zone change KEEPS the chosen slot (founder 2026-10-04, option B;
          // persona QA 2026-10-05, T-096): it is a UTC instant, so only the calendar
          // day it falls on moves — and the calendar follows it when that day is in
          // another month (23:30 on the
          // 31st in New York is the 1st in Hanoi). With only a day chosen, the same
          // calendar date stays selected and its times are re-read in the new zone.
          const key = selectedSlotUtc ? (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.dayKeyInTz)(selectedSlotUtc, tz) : selectedDayKey;
          // Same reason as `invalidateAvailability()`: the old zone's read is stale
          // from this click on, and its grouping must not render under the new day.
          fetchToken.current += 1;
          setAvail(a => Object.assign({}, a, {
            loading: true,
            error: false
          }));
          setSelectedDayKey(key);
          carriedRef.current = !!key;
          if (key) {
            const year = Number(key.slice(0, 4));
            const month = Number(key.slice(5, 7)) - 1;
            if (year !== cal.year || month !== cal.month) {
              setCal({
                year,
                month
              });
            }
          }
          // Remembered for the next visit; picking the default again forgets it.
          (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.rememberTz)(tzInit.browserTz, tz === tzInit.displayTz ? '' : tz);
          setDisplayTz(tz);
        },
        stepIndex: shownIndex,
        progress: shownProgress,
        stepCount: shownCount,
        focusOnMount: navigatedRef.current,
        onBack: serviceLocked && !staffStepExists && !locationStepExists ? null : backFromDateTime,
        onContinue: goToDetails,
        busy: submitting,
        blocked: submitBlocked,
        locked: !!externalCheckout && (externalReserved || submitting),
        banner: slotTakenNotice || externalCheckout ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsxs)(preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.Fragment, {
          children: [slotTakenNotice ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_feedback_jsx__WEBPACK_IMPORTED_MODULE_18__.Banner, {
            variant: "warn",
            title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.toast_slot_taken_title,
            body: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.slot_taken_inline
          }) : null, externalCheckout ? submitBanner : null]
        }) : null,
        primaryLabel: externalCheckout?.deferIdentity && !customFields.length && !consentEnabled ? externalCheckout.label : _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.continue
      });
    }
    if (step === 'details') {
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_DetailsStep_jsx__WEBPACK_IMPORTED_MODULE_12__.DetailsStep, {
        identityEnabled: !externalCheckout?.deferIdentity,
        locked: !!externalCheckout && (externalReserved || submitting),
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
        extraField: !externalCheckout && coupon.fieldKey ? {
          key: coupon.fieldKey,
          render: coupon.renderField
        } : null,
        honeypot: honeypot,
        onHoneypot: setHoneypot,
        fieldErrors: fieldErrors,
        banner: submitBanner,
        stepIndex: shownIndex,
        progress: shownProgress,
        stepCount: shownCount,
        focusOnMount: navigatedRef.current,
        onBack: externalReserved ? null : backToDateTime,
        onSubmit: externalCheckout ? continueExternalCheckout : paymentStepExists ? goToPayment : submit,
        primaryLabel: externalCheckout ? externalCheckout.label : paymentStepExists ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.continue : _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.book,
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
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_Confirmation_jsx__WEBPACK_IMPORTED_MODULE_16__.ResumeUnavailable, {
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
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_PaymentStep_jsx__WEBPACK_IMPORTED_MODULE_15__.PaymentStep, {
        gateways: gateways,
        mode: paymentMode,
        method: payMethod,
        onMethod: choosePayMethod,
        totalLabel: totalLabel,
        paymentTerms: paymentTerms,
        paymentChoice: paymentChoice.render({
          currency: service.currency,
          locale: config.locale,
          currencyExponent
        }),
        currency: service.currency,
        locale: config.locale,
        currencyExponent: currencyExponent,
        gatewayLoading: gatewayLoading,
        gatewayReady: gatewayReady,
        locked: gatewayBusy,
        error: payError,
        notice: payNotice,
        deadlineLabel: resume ? deadlineLabel(resume.expires_at) : '',
        resuming: !!resume,
        onRetry: retryPayment,
        onPayOnsite: () => choosePayMethod(_components_PaymentStep_jsx__WEBPACK_IMPORTED_MODULE_15__.ONSITE),
        stepIndex: shownIndex,
        progress: shownProgress,
        stepCount: shownCount,
        focusOnMount: navigatedRef.current,
        onBack: backToDetails,
        onSubmit: submit,
        submitting: submitBlocked
      });
    }
    if (step === 'confirmation' && payIncomplete) {
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_Confirmation_jsx__WEBPACK_IMPORTED_MODULE_16__.PaymentIncomplete, {
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
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_Confirmation_jsx__WEBPACK_IMPORTED_MODULE_16__.Confirmation, {
        response: response,
        staffName: confirmStaffName,
        staffTitle: confirmStaffTitle,
        locationName: confirmLocation ? confirmLocation.name : '',
        locationAddress: confirmLocation ? confirmLocation.address : '',
        displayTz: displayTz,
        locale: config.locale,
        businessName: config.business.name,
        currencyExponent: currencyExponent,
        payment: payResult,
        progress: shownProgress,
        stepIndex: shownIndex,
        stepCount: shownCount,
        focusOnMount: navigatedRef.current,
        onBookAnother: bookAnother
        // The one-page intro already says what and when (D-R80); the card would
        // say it twice. Only where the intro really carries the time.
        ,
        hideCard: onePage && !!selectedSlotUtc
      });
    }
    if (step === 'confirmation' && minimalConfirm) {
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_Confirmation_jsx__WEBPACK_IMPORTED_MODULE_16__.MinimalConfirmation, {
        confirmed: minimalConfirm.confirmed,
        details: minimalConfirm.details,
        order: minimalConfirm.order,
        locale: config.locale,
        payment: payResult,
        progress: shownProgress,
        stepIndex: shownIndex,
        stepCount: shownCount,
        focusOnMount: navigatedRef.current,
        onBookAnother: bookAnother
      });
    }

    // A return or resume leg resolves over the network; show the same skeleton
    // the catalogue uses rather than a blank widget.
    if (returnLeg || resumeToken) {
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_Skeletons_jsx__WEBPACK_IMPORTED_MODULE_20__.ServiceSkeleton, {});
    }
    return null;
  }

  // Content-column width follows the reference's `mainCls` exactly: while the
  // sidebar column is on, the content takes whatever it leaves (NO 660px cap —
  // capping it here left a dead gutter beside the sidebar at ≥900px containers);
  // a sidebar-less Service step (summaryMode `step2`/`off`) is the 820px
  // catalogue; every other sidebar-less step (Confirmation, and all of `off`)
  // keeps the narrow 660px cap.
  const mainClass = 'ap-main' + (showAside ? '' : step === 'service' ? ' service' : ' narrow');
  const [recapOpen, setRecapOpen] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(false);

  /**
   * Who the one-page intro says the visitor will meet (D-R85), ONE source per case:
   *
   *  - the visitor named somebody on the Staff step → that roster entry (the `/public/services`
   *    roster, under its own D-R52 gates — the same person the step just showed them);
   *  - on the confirmation of an "Any available" booking → the person the SERVER assigned
   *    (`booking.staff`, already printed by the confirmation today), pictured with the face
   *    the block or the roster published for that name, if any;
   *  - otherwise → the block's server-resolved `host` (a preset or sole person, or the team);
   *  - the block's switch off, or nothing publishable → no line.
   *
   * @param {boolean} done On the confirmation, with a booking response.
   * @return {?Object} Host view for `IntroPanel`.
   */
  function introHost(done) {
    if (!config.showHost) {
      return null;
    }
    const server = confirmedHost(config.host || null);
    if (namedStaffMember) {
      return {
        kind: 'person',
        member: namedStaffMember
      };
    }
    if (done && confirmStaffName) {
      // Matched by ID against the public roster, never by display name (review fix round
      // 1, P3): a staff member the roster does not carry — hidden (`is_public = 0`) but
      // assigned by any-staff — gets initials, and only the name, its parts and the title
      // `booking.staff` already discloses on this confirmation today (`staffObject()`).
      const assigned = response.booking && response.booking.staff || {};
      const id = parseInt(assigned.id, 10);
      const known = id > 0 ? (catalogue.staff || []).find(m => m.id === id) || null : null;
      return {
        kind: 'person',
        member: {
          name: confirmStaffName,
          first_name: known ? known.first_name : (0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_25__.normalizePart)(assigned.first_name),
          last_name: known ? known.last_name : (0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_25__.normalizePart)(assigned.last_name),
          title: confirmStaffTitle,
          avatar: known ? known.avatar : null
        }
      };
    }
    if (!server) {
      return null;
    }
    return 1 === server.total && !server.others ? {
      kind: 'person',
      member: server.members[0]
    } : {
      kind: 'team',
      members: server.members,
      total: server.total,
      others: server.others
    };
  }

  /**
   * The block's server-rendered host, as far as the data in hand still CONFIRMS it (D-R85 review
   * fix rounds 1–2, P2):
   *
   *  - with a public roster in hand (Premium `multi_staff` + a Staff choice) the line is ALWAYS
   *    rebuilt from it by ID, at the CURRENT effective location — the same per-(service, location)
   *    map the Staff step reads — so picking a branch narrows it to the people who work there,
   *    switching branches follows, no branch yet is the union (exactly what the page rendered),
   *    and after a re-read a member who left drops out; a preset staff member the roster no
   *    longer lists, or nobody eligible, is no line. The page's `others` flag (hidden colleagues
   *    any-staff may assign) is carried over — the roster cannot know about them;
   *  - with no roster to compare (Free, single staff, `staff_choice = any`), the page's answer is
   *    kept: nothing in hand can contradict it.
   *
   * @param {?Object} server `config.host`.
   * @return {?Object} `{members, total}` or null.
   */
  function confirmedHost(server) {
    const roster = catalogue.staff || [];
    if (!server || !roster.length) {
      return server;
    }
    if (config.staffId) {
      const pinned = roster.find(m => m.id === config.staffId);
      return pinned ? {
        members: [pinned],
        total: 1
      } : null;
    }
    const svc = service || lockedService;
    const members = svc ? eligibleStaffFor(svc, effectiveLocationId).map(id => roster.find(m => m.id === id)).filter(Boolean) : [];
    if (!members.length) {
      return null;
    }
    return {
      members: members.slice(0, 3),
      total: members.length,
      others: server.others
    };
  }

  // QA D01: a one-page block whose pinned service is gone books nothing else instead.
  if ('one-page' === config.layout && presetMissing) {
    return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)("div", {
      class: "ap-wrap",
      ref: wrapRef,
      children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)("div", {
        class: "ap",
        children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)("div", {
          class: "ap-body",
          children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)("div", {
            class: "ap-main narrow",
            children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_Confirmation_jsx__WEBPACK_IMPORTED_MODULE_16__.ServiceUnavailable, {
              phone: contactPhone
            })
          })
        })
      })
    });
  }
  if (onePage) {
    const introService = service || lockedService;
    // On the confirmation the SERVER's answer names the staff member and the place (an "Any
    // available" booking is assigned somebody), exactly as the confirmation card would have.
    const done = step === 'confirmation' && !!response;
    const introStaff = done ? confirmStaffName : staffName;
    const introLocation = done ? confirmLocation : summaryLocation;
    const host = introHost(done);
    return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsxs)("div", {
      class: "ap-wrap",
      ref: wrapRef,
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsxs)("div", {
        class: "ap",
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsxs)("div", {
          class: "ap-body ap-op",
          inert: staffProfile ? true : undefined,
          children: [introService ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_IntroPanel_jsx__WEBPACK_IMPORTED_MODULE_21__.IntroPanel, {
            service: introService,
            booked: !!selectedSlotUtc && (step === 'details' || step === 'payment' || step === 'confirmation'),
            staffName: introStaff,
            staffTitle: done ? confirmStaffTitle : staffTitle,
            staffAny: staffAny && !introStaff,
            staffTerm: staffTerm,
            contactPhone: contactPhone,
            contactText: config.contactText,
            locationName: introLocation ? introLocation.name : '',
            locationAddress: introLocation ? introLocation.address : '',
            locale: config.locale,
            currencyExponent: currencyExponent,
            displayTz: displayTz,
            businessTz: businessTz,
            slotUtc: selectedSlotUtc,
            priceRows: coupon.renderSummaryRows,
            totalMinor: coupon.totalMinor,
            totalNote: totalNote,
            paymentTerms: step === 'confirmation' ? null : paymentTerms,
            host: host,
            meetingType: config.meetingType,
            meetingText: config.meetingText,
            onChangeTime: step === 'details' || step === 'payment' && !resume && !gatewayBusy ? changeTime : null
          }) : (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_Skeletons_jsx__WEBPACK_IMPORTED_MODULE_20__.IntroSkeleton, {}), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)("div", {
            class: "ap-main",
            children: step === 'service' && catalogue.loading ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_Skeletons_jsx__WEBPACK_IMPORTED_MODULE_20__.DateTimeSkeleton, {}) : renderStep()
          })]
        }), staffProfile && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_StaffProfileDialog_jsx__WEBPACK_IMPORTED_MODULE_10__.StaffProfileDialog, {
          member: staffProfile.member,
          photos: staffDisplay.photos,
          titles: staffDisplay.titles,
          onClose: () => setStaffProfile(null),
          onBook: id => selectStaff(id)
        })]
      }), toast && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_feedback_jsx__WEBPACK_IMPORTED_MODULE_18__.Toast, {
        title: toast.title,
        body: toast.body
      })]
    });
  }
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsxs)("div", {
    class: "ap-wrap",
    ref: wrapRef,
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsxs)("div", {
      class: "ap",
      children: [showRecap && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsxs)("div", {
        class: 'ap-recap' + (showAside ? '' : ' solo')
        // `inert` is the modern half of "the background is not
        // operable while the dialog is open" (D-R52): it removes
        // the subtree from the tab order AND from the a11y tree
        // in every engine that has it. The dialog's own focus
        // trap is the fallback for the ones that do not.
        ,
        inert: staffProfile ? true : undefined,
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsxs)("button", {
          type: "button",
          class: "ap-recap-bar",
          "aria-expanded": recapOpen ? 'true' : 'false',
          "aria-controls": RECAP_PANEL_ID,
          onClick: () => setRecapOpen(o => !o),
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_Summary_jsx__WEBPACK_IMPORTED_MODULE_17__.RecapLine, {
            service: service,
            slotUtc: selectedSlotUtc,
            displayTz: displayTz,
            locale: config.locale
          }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)("span", {
            class: 'ap-recap-chev' + (recapOpen ? ' up' : ''),
            children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)("svg", {
              viewBox: "0 0 24 24",
              "aria-hidden": "true",
              fill: "none",
              stroke: "currentColor",
              "stroke-width": "1.7",
              children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)("path", {
                d: "M9 6l6 6-6 6"
              })
            })
          })]
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)("div", {
          class: 'ap-recap-panel' + (recapOpen ? ' open' : ''),
          id: RECAP_PANEL_ID
          // The collapsed panel is only visually clipped
          // (max-height:0 keeps the height transition), so it
          // stays in the a11y tree unless we say otherwise.
          // Safe to hide outright: the summary is text only —
          // nothing focusable is buried in here.
          ,
          "aria-hidden": recapOpen ? 'false' : 'true',
          children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)("div", {
            class: "ap-recap-panel-in",
            children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_Summary_jsx__WEBPACK_IMPORTED_MODULE_17__.Summary, {
              service: service,
              staffName: staffName,
              staffTitle: staffTitle,
              staffAny: staffAny,
              staffTerm: staffTerm,
              contactPhone: contactPhone,
              contactText: config.contactText,
              locationName: summaryLocation ? summaryLocation.name : '',
              locationAddress: summaryLocation ? summaryLocation.address : '',
              locale: config.locale,
              currencyExponent: currencyExponent,
              displayTz: displayTz,
              businessTz: businessTz,
              slotUtc: selectedSlotUtc,
              priceRows: coupon.renderSummaryRows,
              totalMinor: reservedOrder?.total_minor ?? coupon.totalMinor,
              totalNote: totalNote,
              paymentTerms: paymentTerms
            })
          })
        })]
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsxs)("div", {
        class: 'ap-body' + (showAside ? ' has-summary' : ''),
        inert: staffProfile ? true : undefined,
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsxs)("div", {
          class: mainClass,
          children: [checkout.open && step !== 'confirmation' && !resumeError && !returnLeg && !resumeToken && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_CheckoutNotice_jsx__WEBPACK_IMPORTED_MODULE_19__.CheckoutNotice, {
            session: checkout.session,
            displayTz: displayTz,
            locale: config.locale,
            onContinue: checkout.dismiss
          }), renderStep()]
        }), showAside &&
        // Complementary landmark, named by its own heading, so a
        // screen-reader user can jump to the running booking
        // summary instead of hunting for it between the step's
        // controls. Ids are safe to hard-code: every widget lives
        // in its own ShadowRoot.
        (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsxs)("aside", {
          class: "ap-aside",
          "aria-labelledby": _components_Summary_jsx__WEBPACK_IMPORTED_MODULE_17__.SUMMARY_HEADING_ID,
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)("h2", {
            class: "ap-sum-title",
            id: _components_Summary_jsx__WEBPACK_IMPORTED_MODULE_17__.SUMMARY_HEADING_ID,
            children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_6__.COPY.summary_title
          }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_Summary_jsx__WEBPACK_IMPORTED_MODULE_17__.Summary, {
            service: service,
            staffName: staffName,
            staffTitle: staffTitle,
            staffAny: staffAny,
            staffTerm: staffTerm,
            contactPhone: contactPhone,
            contactText: config.contactText,
            locationName: summaryLocation ? summaryLocation.name : '',
            locationAddress: summaryLocation ? summaryLocation.address : '',
            locale: config.locale,
            currencyExponent: currencyExponent,
            displayTz: displayTz,
            businessTz: businessTz,
            slotUtc: selectedSlotUtc,
            priceRows: coupon.renderSummaryRows,
            totalMinor: reservedOrder?.total_minor ?? coupon.totalMinor,
            totalNote: totalNote,
            paymentTerms: paymentTerms
          })]
        })]
      }), staffProfile && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_StaffProfileDialog_jsx__WEBPACK_IMPORTED_MODULE_10__.StaffProfileDialog, {
        member: staffProfile.member,
        photos: staffDisplay.photos,
        titles: staffDisplay.titles,
        onClose: () => setStaffProfile(null),
        onBook: id => selectStaff(id)
      })]
    }), toast && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_29__.jsx)(_components_feedback_jsx__WEBPACK_IMPORTED_MODULE_18__.Toast, {
      title: toast.title,
      body: toast.body
    })]
  });
}

/***/ },

/***/ "./assets/src/form/components/BookingSummaryDetails.jsx"
/*!**************************************************************!*\
  !*** ./assets/src/form/components/BookingSummaryDetails.jsx ***!
  \**************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   BookingSummaryDetails: () => (/* binding */ BookingSummaryDetails),
/* harmony export */   SumLocation: () => (/* binding */ SumLocation),
/* harmony export */   SumStaff: () => (/* binding */ SumStaff),
/* harmony export */   SumWhen: () => (/* binding */ SumWhen),
/* harmony export */   spokenLabel: () => (/* binding */ spokenLabel)
/* harmony export */ });
/* harmony import */ var _lib_tz_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../lib/tz.js */ "./assets/src/form/lib/tz.js");
/* harmony import */ var _lib_format_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../lib/format.js */ "./assets/src/form/lib/format.js");
/* harmony import */ var _lib_copy_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../lib/copy.js */ "./assets/src/form/lib/copy.js");
/* harmony import */ var _icons_jsx__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./icons.jsx */ "./assets/src/form/components/icons.jsx");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
/** @jsxImportSource preact */
/**
 * The booking facts of the form's summary: service, duration and price, where, with whom, when.
 *
 * Each row is its own component so the one-page intro panel (D-R80) prints the SAME rows from
 * the same code rather than a second copy of the formatting: a location, a staff member and an
 * appointment time can then never read differently in the sidebar, the intro or a checkout
 * notice. Each renders nothing when it has nothing to say.
 */





/**
 * The spoken "Where: " / "With: " prefix of a summary row. The row itself shows an icon
 * instead (founder review 2026-09-30: inline "Where:" labels read as a form dump), so the
 * words ride a visually-hidden span and the row still reads "Where: Downtown" aloud.
 *
 * @param {string} label The row label, e.g. COPY.summary_where.
 * @return {Object} Hidden prefix.
 */

function spokenLabel(label) {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span", {
    class: "ap-visually-hidden",
    children: (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.summary_line, label, '')
  });
}

/** end instant = start + service duration. */
function endInstant(slotUtc, durationMinutes) {
  return new Date(new Date(slotUtc).getTime() + (durationMinutes || 0) * 60000).toISOString();
}

/**
 * "Where: <location>" with its address beneath (D-R62).
 *
 * @param {Object} props         Props.
 * @param {string} props.name    Location name, '' for none.
 * @param {string} props.address One-line address, '' for none.
 * @return {?Object} Row.
 */
function SumLocation({
  name,
  address
}) {
  if (!name) {
    return null;
  }
  // Icon rows: the name in full text colour, its detail (address, job title, time range)
  // underneath in the muted tone.
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
    class: "ap-sum-item",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_3__.IconPin, {}), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("p", {
      class: "ap-sum-sub",
      children: [spokenLabel(_lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.summary_where), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span", {
        class: "k",
        children: name
      }), address ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("br", {}) : null, address || null]
    })]
  });
}

/**
 * "With: <staff member>" (D-R50/D-R51), or "With: Any available" when that was the answer.
 *
 * @param {Object}  props       Props.
 * @param {string}  props.name  Named staff member, '' for none.
 * @param {string}  props.title Their job title, '' for none.
 * @param {boolean} props.any   The visitor answered "Any available".
 * @param {string}  props.term  The business's word for its staff.
 * @return {?Object} Row.
 */
function SumStaff({
  name,
  title,
  any,
  term
}) {
  if (name) {
    return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
      class: "ap-sum-item",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_3__.IconUser, {}), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("p", {
        class: "ap-sum-sub",
        children: [spokenLabel(_lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.summary_with), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span", {
          class: "k",
          children: name
        }), title ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("br", {}) : null, title || null]
      })]
    });
  }
  if (!any) {
    return null;
  }
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
    class: "ap-sum-item",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_3__.IconUser, {}), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("p", {
      class: "ap-sum-sub",
      children: [spokenLabel(_lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.summary_with), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span", {
        class: "k",
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.staff_any
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("br", {}), (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.staff_any_sub_short, term)]
    })]
  });
}

/**
 * The chosen appointment: day, start → end (with "+1 day" when it ends tomorrow, T-058), the
 * display zone, and the business's own time — with the business DATE when it is not the
 * customer's (T-058, T-059) — when the zones differ (D1). Every time goes through `tz.js`.
 *
 * @param {Object}  props                 Props.
 * @param {?string} props.slotUtc         Chosen slot, null for none.
 * @param {number}  props.durationMinutes Service duration.
 * @param {string}  props.displayTz       Display zone.
 * @param {string}  props.businessTz      Business zone.
 * @param {string}  props.locale          Locale.
 * @param {?string} props.spoken          Spoken label before the time ("Your time"), or none.
 * @param {*}       props.children        Extra content under the zone lines (the intro's
 *                                        "Change time", D-R80), or none.
 * @return {?Object} Row.
 */
function SumWhen({
  slotUtc,
  durationMinutes,
  displayTz,
  businessTz,
  locale,
  spoken = '',
  children = null
}) {
  if (!slotUtc) {
    return null;
  }
  const endUtc = endInstant(slotUtc, durationMinutes);
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
    class: "ap-sum-item",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_3__.IconCalendar, {}), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
      class: "ap-sum-when",
      children: [spoken ? spokenLabel(spoken) : null, (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
        class: "ap-line when",
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span", {
          class: "l",
          children: (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_0__.formatInTz)(slotUtc, displayTz, {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          }, locale)
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span", {
          class: "d"
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("span", {
          class: "v",
          children: [(0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_0__.fmtTime)(slotUtc, displayTz, locale), " \u2192", ' ', (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_0__.endsNextDay)(slotUtc, endUtc, displayTz) ? (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.time_next_day, (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_0__.fmtTime)(endUtc, displayTz, locale)) : (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_0__.fmtTime)(endUtc, displayTz, locale)]
        })]
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("p", {
        class: "ap-sum-biz",
        children: (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_0__.tzLabel)(displayTz, slotUtc)
      }), displayTz !== businessTz && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("p", {
        class: "ap-sum-biz",
        children: [_lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.summary_business_time, ":", ' ', (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_0__.fmtTimeAt)(slotUtc, businessTz, displayTz, locale), " \xB7", ' ', (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_0__.tzLabel)(businessTz, slotUtc)]
      }), children]
    })]
  });
}
function BookingSummaryDetails({
  service,
  staffName = '',
  staffTitle = '',
  // "Any available" was the visitor's answer on the Staff step (founder review 2026-09-30),
  // and the term the business uses for its staff, for the detail line under it.
  staffAny = false,
  staffTerm = '',
  locationName = '',
  locationAddress = '',
  locale,
  currencyExponent = null,
  displayTz,
  businessTz,
  slotUtc
}) {
  // "Free" for a price of exactly 0 (D-R81), the money otherwise, nothing when unpriced.
  const price = (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_1__.formatPrice)(service.price_minor, service.currency, locale, currencyExponent);
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
    class: "ap-sum-scroll",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("p", {
      class: "ap-sum-svc",
      children: service.name
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("p", {
      class: "ap-sum-sub",
      children: [(0,_lib_format_js__WEBPACK_IMPORTED_MODULE_1__.formatDuration)(service.duration_minutes, locale), price ? ' · ' + price : '']
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(SumLocation, {
      name: locationName,
      address: locationAddress
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(SumStaff, {
      name: staffName,
      title: staffTitle,
      any: staffAny,
      term: staffTerm
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(SumWhen, {
      slotUtc: slotUtc,
      durationMinutes: service.duration_minutes,
      displayTz: displayTz,
      businessTz: businessTz,
      locale: locale
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
/* harmony import */ var _icons_jsx__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./icons.jsx */ "./assets/src/form/components/icons.jsx");
/* harmony import */ var _lib_copy_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../lib/copy.js */ "./assets/src/form/lib/copy.js");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
/** @jsxImportSource preact */
/**
 * Month calendar — bare numbers (open days in full text colour, closed days soft),
 * a today dot and a solid selected day (design §3). No per-day availability marker
 * (D-R86: the "few left" bar stacked an unexplained second mark under a low-availability
 * today); a day is open or it is not, which the button's disabled state already says.
 * The period is a plain "October 2026" label between Prev/Next — the booking
 * horizon is weeks, not years, so month/year selects were chrome. No auto-select.
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
function weekdayNames(locale, weekday) {
  // 2021-03-01 is a Monday; the grid is Monday-first.
  const fmt = new Intl.DateTimeFormat(locale || undefined, {
    weekday,
    timeZone: 'UTC'
  });
  return Array.from({
    length: 7
  }, (_, i) => fmt.format(Date.UTC(2021, 2, 1 + i)));
}
function periodLabel(locale, year, month) {
  return new Intl.DateTimeFormat(locale || undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(Date.UTC(year, month, 15));
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
  years,
  onSelectDay,
  onMonth
}) {
  const months = monthNames(locale);
  // Both forms are rendered; the container query shows "Mon" on a wide card and
  // "M" on a narrow one, where "T T" / "S S" is the only thing that fits.
  const dowShort = weekdayNames(locale, 'short');
  const dowNarrow = weekdayNames(locale, 'narrow');
  const firstDow = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) {
    cells.push((0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {}, 'e' + i));
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const key = dayKey(year, month, d);
    const count = (availabilityIndex[key] || []).length;
    const past = key < todayKey;
    const disabled = past || count === 0;
    const selected = key === selectedDayKey;
    const classes = 'ap-day' + (selected ? ' sel' : '') + (key === todayKey ? ' today' : '');
    cells.push((0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("button", {
      type: "button",
      class: classes,
      disabled: disabled,
      "aria-pressed": selected ? 'true' : 'false',
      "aria-label": months[month] + ' ' + d,
      onClick: () => onSelectDay(key),
      children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
        class: "n",
        children: d
      })
    }, key));
  }
  const firstAllowed = year + '-' + pad2(month + 1);
  const prevDisabled = firstAllowed <= todayKey.slice(0, 7);
  // Cap Next at December of the last selectable year so the arrow can never page
  // into a month outside the year <select>'s range (which mirrors the booking
  // horizon). Beyond that there is nothing to book anyway.
  const lastYear = years[years.length - 1];
  const nextDisabled = year > lastYear || year === lastYear && month === 11;
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
      class: "ap-cal-head",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("p", {
        class: "ap-cal-period",
        "aria-live": "polite",
        "data-month": firstAllowed,
        children: periodLabel(locale, year, month)
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
        class: "ap-cal-nav",
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("button", {
          type: "button",
          "aria-label": _lib_copy_js__WEBPACK_IMPORTED_MODULE_1__.COPY.prev_month,
          disabled: prevDisabled,
          onClick: () => onMonth(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1),
          children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_0__.IconChevronLeft, {})
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("button", {
          type: "button",
          "aria-label": _lib_copy_js__WEBPACK_IMPORTED_MODULE_1__.COPY.next_month,
          disabled: nextDisabled,
          onClick: () => onMonth(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1),
          children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_0__.IconChevronRight, {})
        })]
      })]
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("div", {
      class: "ap-dow",
      "aria-hidden": "true",
      children: dowShort.map((d, i) => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("span", {
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
          class: "w",
          children: d
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
          class: "i",
          children: dowNarrow[i]
        })]
      }, i))
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("div", {
      class: "ap-cal",
      children: cells
    })]
  });
}

/***/ },

/***/ "./assets/src/form/components/CheckoutNotice.jsx"
/*!*******************************************************!*\
  !*** ./assets/src/form/components/CheckoutNotice.jsx ***!
  \*******************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CheckoutNotice: () => (/* binding */ CheckoutNotice),
/* harmony export */   fillContact: () => (/* binding */ fillContact),
/* harmony export */   heldStarts: () => (/* binding */ heldStarts),
/* harmony export */   useCheckoutSession: () => (/* binding */ useCheckoutSession)
/* harmony export */ });
/* harmony import */ var preact_hooks__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! preact/hooks */ "./node_modules/preact/hooks/dist/hooks.module.js");
/* harmony import */ var _feedback_jsx__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./feedback.jsx */ "./assets/src/form/components/feedback.jsx");
/* harmony import */ var _Summary_jsx__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./Summary.jsx */ "./assets/src/form/components/Summary.jsx");
/* harmony import */ var _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../lib/copy.js */ "./assets/src/form/lib/copy.js");
/* harmony import */ var _lib_payments_session_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/payments/session.js */ "./assets/src/form/lib/payments/session.js");
/* harmony import */ var _lib_hold_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../lib/hold.js */ "./assets/src/form/lib/hold.js");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
/** @jsxImportSource preact */
/**
 * Checkout continuity for a gateway that pays on a checkout of its own (D-R71w).
 *
 * Everything here is inert unless an offered gateway publishes `session_url`
 * (`lib/payments/session.js`): no request, no storage, nothing rendered — a site
 * without such a gateway gets the widget exactly as it was.
 *
 * With one, three things survive the visitor leaving for that checkout and
 * coming back (browser Back, or a second booking into the same cart):
 *
 *  1. a notice that a booking is waiting there, with the way back to it;
 *  2. the identity fields they typed — from this tab's `sessionStorage`
 *     (`lib/hold.js`), else from what the checkout's own session already holds;
 *  3. their own held time, which the slot grid marks instead of dropping.
 *
 * Consent is never restored, and neither is the note or any custom-field answer.
 */







const CONTACT_FIELDS = ['first_name', 'last_name', 'email', 'phone'];

/**
 * Fill the EMPTY identity fields of the details from a contact; a field the
 * visitor already typed in is never replaced.
 *
 * @param {Object} details Current Details-step values.
 * @param {Object} contact `{first_name, last_name, email, phone}`.
 * @return {Object} The same object when nothing changed, else a copy.
 */
function fillContact(details, contact) {
  let next = details;
  CONTACT_FIELDS.forEach(field => {
    if (!details[field] && contact && contact[field]) {
      next = next === details ? {
        ...details
      } : next;
      next[field] = contact[field];
    }
  });
  return next;
}

/**
 * Start instants this visitor already holds for what the Date & time step is showing.
 *
 * Matched by service and — when one person is chosen — by staff, so the mark only
 * appears where that hold is the reason the time is missing.
 *
 * @param {?Object} session Normalised checkout session.
 * @param {?Object} service Selected service.
 * @param {?number} staffId Chosen staff id, or null for "any".
 * @return {Array.<string>} ISO instants.
 */
function heldStarts(session, service, staffId) {
  return (session && session.attempts || []).filter(attempt => service && attempt.serviceId === service.id && (!staffId || attempt.staffId === staffId)).map(attempt => attempt.startUtc);
}

/**
 * Ask the checkout what it holds, and keep the identity fields across the trip.
 *
 * @param {Object}         args            Arguments.
 * @param {Array.<Object>} args.gateways   Offered gateways.
 * @param {string}         [args.nonce]    REST nonce.
 * @param {Object}         args.details    Details-step values.
 * @param {Function}       args.setDetails State setter of those values.
 * @return {{session: ?Object, open: boolean, dismiss: Function}} Session and notice state.
 */
function useCheckoutSession({
  gateways,
  nonce,
  details,
  setDetails
}) {
  const capable = !!(0,_lib_payments_session_js__WEBPACK_IMPORTED_MODULE_4__.sessionGateway)(gateways);
  const [session, setSession] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [dismissed, setDismissed] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const stored = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(false);
  const had = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(false);

  // This tab's own copy first: it is what the visitor typed last.
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!capable) {
      return;
    }
    const contact = (0,_lib_hold_js__WEBPACK_IMPORTED_MODULE_5__.readContact)();
    stored.current = !!contact;
    if (contact) {
      setDetails(current => fillContact(current, contact));
    }
  }, [capable, setDetails]);

  // On load, and again when Back restores the page from the back/forward cache.
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!capable) {
      return undefined;
    }
    let live = true;
    const ask = () => (0,_lib_payments_session_js__WEBPACK_IMPORTED_MODULE_4__.gatewaySession)(gateways, {
      nonce
    }).then(answer => {
      if (!live) {
        return;
      }
      setSession(answer);
      setDismissed(false);
      if (answer && !stored.current) {
        setDetails(current => fillContact(current, answer.contact));
      }
    });
    const restored = event => {
      if (event && event.persisted) {
        ask();
      }
    };
    ask();
    window.addEventListener('pageshow', restored);
    return () => {
      live = false;
      window.removeEventListener('pageshow', restored);
    };
  }, [capable, gateways, nonce, setDetails]);

  // Remember what is typed; clearing the fields (a finished booking) forgets it.
  const {
    first_name: first,
    last_name: last,
    email,
    phone
  } = details;
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    const has = !!(first || last || email || phone);
    if (capable && (has || had.current)) {
      (0,_lib_hold_js__WEBPACK_IMPORTED_MODULE_5__.storeContact)({
        first_name: first,
        last_name: last,
        email,
        phone
      });
      had.current = has;
    }
  }, [capable, first, last, email, phone]);
  return {
    session,
    open: !!session && session.attempts.length > 0 && !dismissed,
    dismiss: () => setDismissed(true)
  };
}

/**
 * "You have a booking waiting at checkout" — resume it, or keep booking.
 *
 * @param {Object}   props           Props.
 * @param {Object}   props.session   Normalised checkout session with at least one attempt.
 * @param {string}   props.displayTz Display timezone.
 * @param {string}   [props.locale]  Locale.
 * @param {Function} props.onContinue Keep booking in this form.
 */
function CheckoutNotice({
  session,
  displayTz,
  locale,
  onContinue
}) {
  const first = session.attempts[0];
  const title = session.attempts.length > 1 ? (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.checkout_waiting_many, session.attempts.length) : (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.checkout_waiting, (0,_Summary_jsx__WEBPACK_IMPORTED_MODULE_2__.recapLine)({
    service: first.serviceName ? {
      name: first.serviceName
    } : null,
    slotUtc: first.startUtc,
    displayTz,
    locale
  }));
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_feedback_jsx__WEBPACK_IMPORTED_MODULE_1__.Banner, {
    variant: "info",
    title: title,
    body: session.multiple ? '' : _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.checkout_change_hint,
    children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
      class: "ap-note-actions",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("a", {
        class: "ap-link",
        href: session.resumeUrl,
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.checkout_resume
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("button", {
        type: "button",
        class: "ap-link",
        onClick: onContinue,
        children: session.multiple ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.checkout_add_another : _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.checkout_change
      })]
    })
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
/* harmony export */   ResumeUnavailable: () => (/* binding */ ResumeUnavailable),
/* harmony export */   ServiceUnavailable: () => (/* binding */ ServiceUnavailable),
/* harmony export */   calendarLocation: () => (/* binding */ calendarLocation),
/* harmony export */   googleUrl: () => (/* binding */ googleUrl)
/* harmony export */ });
/* harmony import */ var _DepositLines_jsx__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./DepositLines.jsx */ "./assets/src/form/components/DepositLines.jsx");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var preact_hooks__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! preact/hooks */ "./node_modules/preact/hooks/dist/hooks.module.js");
/* harmony import */ var _lib_tz_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../lib/tz.js */ "./assets/src/form/lib/tz.js");
/* harmony import */ var _lib_format_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/format.js */ "./assets/src/form/lib/format.js");
/* harmony import */ var _icons_jsx__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./icons.jsx */ "./assets/src/form/components/icons.jsx");
/* harmony import */ var _feedback_jsx__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./feedback.jsx */ "./assets/src/form/components/feedback.jsx");
/* harmony import */ var _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../lib/copy.js */ "./assets/src/form/lib/copy.js");
/* harmony import */ var _lib_config_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../lib/config.js */ "./assets/src/form/lib/config.js");
/* harmony import */ var _StepHeader_jsx__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./StepHeader.jsx */ "./assets/src/form/components/StepHeader.jsx");
/* harmony import */ var _lib_payments_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../lib/payments.js */ "./assets/src/form/lib/payments.js");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
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
 * panel says the manage link was already emailed (SPEC-P0 §5.6; QA D02 — no default template
 * attaches a calendar file, so the copy no longer claims one).
 */












/** ISO instant -> `YYYYMMDDTHHMMSSZ` for calendar URLs. */

function icsStamp(iso) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/**
 * The Google Calendar event's `location` (D-R62, the D-R61 contract fix).
 *
 * The ADDRESS the server booked (`booking.location.address` — the branch, or `business.*` at
 * location `0`), because that is what a calendar app can route to; its NAME when the address is
 * empty; and the business name only when the response carries neither — which is also what an
 * older server that does not send `booking.location` produces, so that case is unchanged. This
 * used to send the business NAME unconditionally, so a two-branch business put every customer's
 * event at the same non-address.
 *
 * @param {Object} booking      The response's `booking`.
 * @param {string} businessName Business name.
 * @return {string} Location text, possibly ''.
 */
function calendarLocation(booking, businessName) {
  const place = booking && booking.location ? booking.location : {};
  const address = typeof place.address === 'string' ? place.address.trim() : '';
  const name = typeof place.name === 'string' ? place.name.trim() : '';
  return address || name || businessName || '';
}

/**
 * Build a Google Calendar "add event" URL from the original response data.
 *
 * @param {Object} booking      The response's `booking`.
 * @param {string} businessName Business name.
 * @return {string} URL.
 */
function googleUrl(booking, businessName) {
  const title = booking.service && booking.service.name ? booking.service.name : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Appointment', 'aponto');
  const text = businessName ? title + ' — ' + businessName : title;
  const dates = icsStamp(booking.start_utc) + '/' + icsStamp(booking.end_utc);
  const params = ['action=TEMPLATE', 'text=' + encodeURIComponent(text), 'dates=' + dates];
  const where = calendarLocation(booking, businessName);
  if (where) {
    params.push('location=' + encodeURIComponent(where));
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
    return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("p", {
      class: "ap-paid-line",
      children: payment.amountLabel ? (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.sprintf)((0,_lib_payments_js__WEBPACK_IMPORTED_MODULE_10__.gatewayPaidLineCopy)(payment.method), payment.amountLabel, payment.orderCode) :
      // A return leg has no amount to quote: `sessionStorage`
      // carries no money figure (F5) and `/confirm` never sends
      // one. Naming the reference is better than inventing a sum.
      (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.pay_paid_line_plain, payment.orderCode)
    });
  }
  if (payment.status === 'pending') {
    return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("p", {
      class: "ap-paid-line",
      children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.pay_pending_line
    });
  }
  if (payment.status === 'unverified') {
    // The money went through; the AMOUNT is what could not be confirmed
    // (rest-contract §3.8). No retry is offered anywhere on this panel, and
    // the sentence says who to talk to instead.
    return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("p", {
      class: "ap-paid-line",
      children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.pay_fail_unverified_amount
    });
  }
  return null;
}
function Confirmation({
  response,
  // The staff member the customer NAMED on the Staff step, or '' (D-R50). Read from the
  // widget's own choice rather than from `booking.staff`, which the response carries for
  // every booking: on a Free or single-staff site the engine still assigns somebody, and
  // printing that name here would change a panel this feature is not supposed to touch.
  staffName = '',
  // The assigned staff member's job title (D-R51), on the same line after the name. Empty
  // whenever the site has not filled one in.
  staffTitle = '',
  // Where the booking is (D-R62): the server's `booking.location` when a location was in play,
  // else ''. The widget resolves it, so this panel prints nothing on a site with no roster.
  locationName = '',
  locationAddress = '',
  displayTz,
  locale,
  businessName,
  // Server-supplied ISO exponent for the site currency (D-R39a), for the total line.
  currencyExponent = null,
  payment = null,
  // The macro progress rail (D-R53) — the confirmation IS the last item in the step list, so
  // without these it vanished on the final screen and its last item never became current
  // (fix round 1, P2-2). Null in fraction mode, which is the default and renders nothing.
  progress = null,
  stepIndex,
  stepCount,
  focusOnMount = true,
  onBookAnother,
  // The one-page frame (D-R80): its intro panel already shows the service, the time and the
  // total beside this panel, so the date card and total line are left out. False everywhere
  // else, which keeps the step-by-step confirmation byte-identical.
  hideCard = false
}) {
  const booking = response.booking;
  const confirmed = booking.status === 'confirmed';
  const linksAvailable = response.links_available !== false;
  const order = booking.order || {};
  // Deposit paid now / balance later (D-R71); nothing for an order without a deposit.
  const deposit = (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_DepositLines_jsx__WEBPACK_IMPORTED_MODULE_0__.DepositLines, {
    order: order,
    currency: order.currency,
    locale: locale,
    currencyExponent: currencyExponent,
    settled: ['partial', 'paid', 'refunded'].includes(order.payment_status)
  });
  const total = order.total_minor > 0 && order.currency ? (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_4__.formatMoney)(order.total_minor, order.currency, locale, currencyExponent) : '';
  const headingRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_2__.useRef)(null);
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_2__.useEffect)(() => {
    if (focusOnMount && headingRef.current) {
      headingRef.current.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
    class: "ap-step",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_StepHeader_jsx__WEBPACK_IMPORTED_MODULE_9__.StepRail, {
      progress: progress,
      stepIndex: stepIndex,
      stepCount: stepCount
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
      class: "ap-done",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("div", {
        class: "ap-check",
        children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_5__.IconCheck, {})
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("h2", {
        ref: headingRef,
        tabIndex: -1,
        children: confirmed ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.confirm_confirmed_title : _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.confirm_pending_title
      }), !confirmed && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("p", {
        class: "lead",
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.confirm_pending_lead
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("span", {
        class: "ap-order",
        children: [total ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.order_label : _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.booking_label, ' ', (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("span", {
          class: "ap-order-code",
          children: ["#", booking.order && booking.order.code]
        })]
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(PaymentLine, {
        payment: payment
      })]
    }), hideCard ? null : (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)(preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.Fragment, {
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
        class: "ap-conf-card",
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
          class: "ap-tile",
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("div", {
            class: "d",
            children: (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.formatInTz)(booking.start_utc, displayTz, {
              day: 'numeric'
            }, locale)
          }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("div", {
            class: "m",
            children: (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.formatInTz)(booking.start_utc, displayTz, {
              month: 'short'
            }, locale)
          })]
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
          class: "info",
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("span", {
            class: "ap-item-title",
            children: booking.service && booking.service.name
          }), locationName ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("small", {
            children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("span", {
              class: "ap-visually-hidden",
              children: (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.summary_line, _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.summary_where, '')
            }), locationName, locationAddress ? ' · ' + locationAddress : '']
          }) : null, staffName ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("small", {
            children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("span", {
              class: "ap-visually-hidden",
              children: (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.summary_line, _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.summary_with, '')
            }), staffName, staffTitle ? ' · ' + staffTitle : '']
          }) : null, (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("small", {
            children: [(0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.formatInTz)(booking.start_utc, displayTz, {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            }, locale), ' ', "\xB7 ", (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.fmtTime)(booking.start_utc, displayTz, locale), " \u2192", ' ', (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.endsNextDay)(booking.start_utc, booking.end_utc, displayTz) ? (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.time_next_day, (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.fmtTime)(booking.end_utc, displayTz, locale)) : (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.fmtTime)(booking.end_utc, displayTz, locale)]
          }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("small", {
            class: "tz",
            children: (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.tzLabel)(displayTz, booking.start_utc)
          })]
        })]
      }), deposit, total ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
        class: "ap-conf-total",
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("span", {
          children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.summary_total
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("span", {
          class: "v",
          children: total
        })]
      }) : null]
    }), hideCard ? deposit : null, linksAvailable ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
        class: "ap-cal-tiles",
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("a", {
          class: "ap-cal-tile",
          href: googleUrl(booking, businessName),
          target: "_blank",
          rel: "noopener noreferrer",
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_5__.IconCalendar, {}), _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.cal_google]
        }), response.ics_url && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("a", {
          class: "ap-cal-tile",
          href: response.ics_url,
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_5__.IconDownload, {}), _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.cal_ics]
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("button", {
          type: "button",
          class: "ap-cal-tile",
          onClick: () => window.print(),
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_5__.IconPrinter, {}), _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.print]
        })]
      }), !confirmed && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_feedback_jsx__WEBPACK_IMPORTED_MODULE_6__.Banner, {
        variant: "info",
        body: _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.confirm_manage_hint
      })]
    }) : (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("div", {
      class: "ap-links-emailed",
      children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_feedback_jsx__WEBPACK_IMPORTED_MODULE_6__.Banner, {
        variant: "info",
        body: _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.replay_body
      })
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("div", {
      class: "ap-conf-actions",
      children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("button", {
        type: "button",
        onClick: onBookAnother,
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.book_another
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
  order = null,
  // The WHITELISTED display facts (F5): service, staff, start/end and the
  // display timezone. Enough to recognise the appointment, and not one field
  // that grants access to it.
  details = null,
  locale,
  payment = null,
  progress = null,
  stepIndex,
  stepCount,
  focusOnMount = true,
  onBookAnother
}) {
  const headingRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_2__.useRef)(null);
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_2__.useEffect)(() => {
    if (focusOnMount && headingRef.current) {
      headingRef.current.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
    class: "ap-step",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_StepHeader_jsx__WEBPACK_IMPORTED_MODULE_9__.StepRail, {
      progress: progress,
      stepIndex: stepIndex,
      stepCount: stepCount
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
      class: "ap-done",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("div", {
        class: "ap-check",
        children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_5__.IconCheck, {})
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("h2", {
        ref: headingRef,
        tabIndex: -1,
        children: confirmed ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.confirm_confirmed_title : _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.confirm_pending_title
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("p", {
        class: "lead",
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.pay_minimal_lead
      }), details && details.start_utc ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("p", {
        class: "tz",
        children: [details.service_name ? details.service_name + ' · ' : '', (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.formatInTz)(details.start_utc, details.display_tz, {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        }, locale), ' ', "\xB7 ", (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.fmtTime)(details.start_utc, details.display_tz, locale), details.end_utc ? ' → ' + (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_3__.fmtTime)(details.end_utc, details.display_tz, locale) : '']
      }) : null, payment && payment.orderCode ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("span", {
        class: "ap-order",
        children: [_lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.order_label, ' ', (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("span", {
          class: "ap-order-code",
          children: ["#", payment.orderCode]
        })]
      }) : null, (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_DepositLines_jsx__WEBPACK_IMPORTED_MODULE_0__.DepositLines, {
        order: order,
        currency: order?.currency,
        locale: locale,
        currencyExponent: order?.currency_exponent,
        settled: ['partial', 'paid', 'refunded'].includes(order?.payment_status)
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(PaymentLine, {
        payment: payment
      })]
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("div", {
      class: "ap-conf-actions",
      children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("button", {
        type: "button",
        onClick: onBookAnother,
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.book_another
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
  const headingRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_2__.useRef)(null);
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_2__.useEffect)(() => {
    if (focusOnMount && headingRef.current) {
      headingRef.current.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  let holdLine = _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.pay_hold_generic;
  if (released) {
    holdLine = _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.pay_hold_released;
  } else if (deadlineLabel) {
    holdLine = (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.pay_hold_until, deadlineLabel);
  }
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
    class: "ap-step",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
      class: "ap-done",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("h2", {
        ref: headingRef,
        tabIndex: -1,
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.pay_incomplete_title
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("p", {
        class: "lead",
        children: failureCopy || _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.pay_incomplete_lead
      }), orderCode ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("span", {
        class: "ap-order",
        children: [_lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.order_label, ' ', (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("span", {
          class: "ap-order-code",
          children: ["#", orderCode]
        })]
      }) : null]
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_feedback_jsx__WEBPACK_IMPORTED_MODULE_6__.Banner, {
      variant: "clock",
      body: holdLine
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
      class: "ap-conf-actions",
      children: [onRetry ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("button", {
        type: "button",
        class: "ap-primary",
        onClick: onRetry,
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.try_again
      }) : null, (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("button", {
        type: "button",
        onClick: onBookAnother,
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.book_another
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
  const headingRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_2__.useRef)(null);
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_2__.useEffect)(() => {
    if (focusOnMount && headingRef.current) {
      headingRef.current.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  let title = _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.resume_gone_title;
  let lead = _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.resume_gone_lead;
  if (busy) {
    title = _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.resume_busy_title;
    lead = _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.resume_busy_lead;
  } else if (paid) {
    title = _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.resume_paid_title;
    lead = _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.resume_paid_lead;
  }
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
    class: "ap-step",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
      class: "ap-done",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("h2", {
        ref: headingRef,
        tabIndex: -1,
        children: title
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("p", {
        class: "lead",
        children: lead
      })]
    }), busy && onRetry ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("div", {
      class: "ap-conf-actions",
      children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("button", {
        type: "button",
        class: "ap-primary",
        onClick: onRetry,
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.try_again
      })
    }) : null, !busy && !paid && bookAgainUrl ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("div", {
      class: "ap-conf-actions",
      children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("a", {
        class: "ap-btn",
        href: bookAgainUrl,
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.resume_book_again
      })
    }) : null]
  });
}

/**
 * The one-page block's service is gone (QA D01, 2026-10-05): the block pins a service the
 * catalogue no longer lists (deleted, inactive, draft). The frame shows THIS instead of booking
 * any other service in its place — no calendar, no intro column — with the business's own
 * contact line when it has one (mockup `single-screen-layout.html`, "Unavailable").
 *
 * @param {Object} props       Props.
 * @param {string} props.phone Display phone, '' for none.
 * @return {Object} Panel.
 */
function ServiceUnavailable({
  phone = ''
}) {
  const parts = (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.unavailable_call, '\u0000').split('\u0000');
  const href = (0,_lib_config_js__WEBPACK_IMPORTED_MODULE_8__.telHref)(phone);
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("div", {
    class: "ap-step",
    children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
      class: "ap-done is-unavailable",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("div", {
        class: "ap-check is-neutral",
        children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_5__.IconCalendar, {})
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("h2", {
        tabIndex: -1,
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.unavailable_title
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("p", {
        class: "lead",
        children: [_lib_copy_js__WEBPACK_IMPORTED_MODULE_7__.COPY.unavailable_lead, phone ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)(preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.Fragment, {
          children: [' ' + parts[0], href ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("a", {
            class: "ap-link",
            href: href,
            children: phone
          }) : phone, parts[1] || '']
        }) : null]
      })]
    })
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
/* harmony import */ var preact_hooks__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! preact/hooks */ "./node_modules/preact/hooks/dist/hooks.module.js");
/* harmony import */ var _StepHeader_jsx__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./StepHeader.jsx */ "./assets/src/form/components/StepHeader.jsx");
/* harmony import */ var _Footer_jsx__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./Footer.jsx */ "./assets/src/form/components/Footer.jsx");
/* harmony import */ var _Calendar_jsx__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./Calendar.jsx */ "./assets/src/form/components/Calendar.jsx");
/* harmony import */ var _Skeletons_jsx__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./Skeletons.jsx */ "./assets/src/form/components/Skeletons.jsx");
/* harmony import */ var _feedback_jsx__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./feedback.jsx */ "./assets/src/form/components/feedback.jsx");
/* harmony import */ var _TimezoneControl_jsx__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./TimezoneControl.jsx */ "./assets/src/form/components/TimezoneControl.jsx");
/* harmony import */ var _Summary_jsx__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./Summary.jsx */ "./assets/src/form/components/Summary.jsx");
/* harmony import */ var _lib_tz_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../lib/tz.js */ "./assets/src/form/lib/tz.js");
/* harmony import */ var _lib_copy_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../lib/copy.js */ "./assets/src/form/lib/copy.js");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
/** @jsxImportSource preact */
/**
 * Step 2 — Date & time (SPEC-P1 §2.2 #2).
 *
 * A lazy month calendar plus start-time-only slot chips grouped by the calendar
 * day IN THE DISPLAY TIMEZONE. The friendly `City (GMT±N)` label is always
 * visible in-flow (D1), beside "Available times", with a `Change` button that
 * opens the zone picker (D-R48 — the raw `<select>` band this step used to carry
 * is gone). When the site is showing its OWN clock to a visitor who is somewhere
 * else, the label is prefixed "Times shown in …"; when the display zone differs
 * from the business zone, the business's own time shows as a labelled secondary line.
 * Every rendered time flows through the one `tz.js` formatter — no hand-rolled
 * time math here.
 */











const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * The picked day for the slot-list heading, e.g. "October 9", in the active locale. The
 * key already IS the display-zone day, so it is formatted as a UTC calendar date and never
 * shifts with the runtime zone.
 */
function dayHeading(key, locale) {
  const parts = key.split('-').map(Number);
  return new Intl.DateTimeFormat(locale || undefined, {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  }).format(Date.UTC(parts[0], parts[1] - 1, parts[2]));
}

/**
 * "Pick a slot for <October 9>" with the day in the accent (founder review 2026-10-01,
 * after LatePoint). The translated sentence is split around the day so the language
 * decides where it sits.
 */
function SlotsHeading({
  day
}) {
  const parts = (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.COPY.slots_for_day, '\u0000').split('\u0000');
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("span", {
    class: "ap-item-title",
    children: [parts[0], (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("span", {
      class: "ap-slots-day",
      children: day
    }), parts[1] || '']
  });
}

/** Human "Mon D" label from a display-tz `YYYY-MM-DD` day key (tz-independent). */
function dayLabel(key) {
  if (!key) {
    return '';
  }
  const parts = key.split('-');
  return MON3[Number(parts[1]) - 1] + ' ' + Number(parts[2]);
}

/**
 * Whether an availability failure is the server saying "slow down" (D-R54).
 *
 * @param {boolean|{kind?:string}} availError Failure carried by the loader.
 * @return {boolean} True for a 429.
 */
function isRateLimited(availError) {
  return !!availError && availError.kind === 'rate_limited';
}

/**
 * Banner title for an availability failure.
 *
 * @param {boolean|{kind?:string}} availError Failure carried by the loader.
 * @return {string} Title copy.
 */
function availabilityErrorTitle(availError) {
  return isRateLimited(availError) ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.COPY.rate_limited_load_title : _lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.COPY.load_availability_err;
}

/**
 * Banner body for an availability failure.
 *
 * A `429` is NOT a connection problem, and "check your connection and try again" sends the
 * visitor to the one recovery that cannot work — reload, retry, give up. When the server said
 * how long to wait (`Retry-After`), say it; otherwise ask for a moment.
 *
 * @param {boolean|{kind?:string, retryAfter?:?number}} availError Failure carried by the loader.
 * @return {string} Body copy.
 */
function availabilityErrorBody(availError) {
  if (!isRateLimited(availError)) {
    return _lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.COPY.load_retry_sub;
  }
  const seconds = Math.ceil(Number(availError.retryAfter) || 0);
  return seconds > 0 ? (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.COPY.rate_limited_body, seconds) : _lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.COPY.rate_limited_wait;
}
function DateTimeStep({
  busy = false,
  blocked = false,
  locked = false,
  banner = null,
  primaryLabel = _lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.COPY.continue,
  locale,
  displayTz,
  businessTz,
  showTzNote,
  tzOptions,
  tzSuggested,
  calYear,
  calMonth,
  onMonth,
  monthNotice = '',
  availabilityIndex,
  availLoading,
  availError,
  onRetryAvail,
  todayKey,
  years,
  selectedDayKey,
  onSelectDay,
  selectedSlotUtc,
  onSelectSlot,
  // Start instants this visitor already holds at an external checkout (D-R71w). Presentation
  // only: availability is whatever the server said; these are shown as taken, with the reason.
  heldStarts = [],
  onChangeDisplayTz,
  stepIndex,
  progress,
  stepCount,
  focusOnMount,
  onBack,
  onContinue
}) {
  const daySlots = selectedDayKey ? availabilityIndex[selectedDayKey] || [] : [];

  // QA D22 (2026-10-05): on a narrow form the slots appear far below the day the visitor
  // tapped, with no cue. After a VISITOR's day pick (never an auto-pick) the slot list is
  // scrolled into view below 700px of card — instantly under `prefers-reduced-motion` — and
  // the day and its open count are announced.
  const pickedRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(false);
  const slotsRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  const [announce, setAnnounce] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)('');
  function pickDay(key) {
    pickedRef.current = true;
    onSelectDay(key);
  }
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!pickedRef.current || !selectedDayKey || availLoading) {
      return;
    }
    pickedRef.current = false;
    setAnnounce((0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.COPY.slots_for_day, dayHeading(selectedDayKey, locale)) + '. ' + (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.COPY.slots_open, daySlots.length));
    const el = slotsRef.current;
    const wrap = el && el.closest ? el.closest('.ap-wrap') : null;
    if (!el || !wrap || typeof el.scrollIntoView !== 'function') {
      return;
    }
    if (wrap.getBoundingClientRect().width >= 700) {
      return;
    }
    const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({
      block: 'nearest',
      behavior: reduce ? 'auto' : 'smooth'
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDayKey, availLoading]);
  // The visitor's own held times: on the picked day they sit in the grid, in order, marked
  // and not selectable; on a day that cannot be picked at all they are named in one line.
  const open = daySlots.map(slot => slot.start_utc);
  const held = heldStarts.filter(start => !open.includes(start));
  const heldToday = held.filter(start => (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_8__.dayKeyInTz)(start, displayTz) === selectedDayKey);
  const heldElsewhere = held.filter(start => !availabilityIndex[(0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_8__.dayKeyInTz)(start, displayTz)]);
  const shownSlots = heldToday.length ? daySlots.concat(heldToday.map(start => ({
    start_utc: start,
    held: true
  }))).sort((a, b) => Date.parse(a.start_utc) - Date.parse(b.start_utc)) : daySlots;
  const heldLines = heldElsewhere.map(start => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("div", {
    class: "ap-studio-line",
    children: (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.COPY.slot_in_cart_at, (0,_Summary_jsx__WEBPACK_IMPORTED_MODULE_7__.recapLine)({
      service: null,
      slotUtc: start,
      displayTz,
      locale
    }))
  }, start));
  const refInstant = selectedSlotUtc || (daySlots.length ? daySlots[0].start_utc : Date.now());

  // The zone line ALWAYS sits under the grid (founder 2026-10-02, supersedes the 2026-09-30
  // "up when the clocks differ" rule): one fixed place for the label and its Change trigger,
  // so switching zones never moves the control the visitor just used, and the day heading and
  // its times stay together. It is rendered exactly once (D1), and its picker opens upward.
  const tzLine = (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("div", {
    class: "ap-slots-tz",
    children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)(_TimezoneControl_jsx__WEBPACK_IMPORTED_MODULE_6__.TimezoneControl, {
      displayTz: displayTz,
      zones: tzOptions,
      suggested: tzSuggested,
      refInstant: refInstant,
      showNote: showTzNote,
      onChange: onChangeDisplayTz,
      placement: "up"
    })
  });
  function renderSlots() {
    if (!selectedDayKey) {
      // No day picked: the zone line stays (persona QA 2026-10-05, T-096 — it used to vanish
      // with the day, taking the "Change" the visitor had just used with it), and a month
      // with nothing to book says so instead of showing a silent grey grid (T-073).
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("div", {
        children: [!Object.keys(availabilityIndex).length && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("div", {
          class: "ap-noslot",
          children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.COPY.no_slots_month
        }), heldLines, tzLine]
      });
    }
    return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("div", {
      ref: slotsRef,
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("div", {
        class: "ap-slots-head",
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)(SlotsHeading, {
          day: dayHeading(selectedDayKey, locale)
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("span", {
          class: "ap-slots-count",
          children: (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.COPY.slots_open, daySlots.length)
        })]
      }), shownSlots.length ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("div", {
        class: "ap-slots",
        role: "radiogroup",
        "aria-label": _lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.COPY.available_times,
        children: shownSlots.map(slot => slot.held ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("button", {
          type: "button",
          class: "ap-slot gone",
          disabled: true,
          title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.COPY.slot_in_cart,
          "aria-label": (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_8__.fmtTime)(slot.start_utc, displayTz, locale) + ' — ' + _lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.COPY.slot_in_cart,
          children: (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_8__.fmtTime)(slot.start_utc, displayTz, locale)
        }, slot.start_utc) : (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("button", {
          type: "button",
          class: "ap-slot",
          role: "radio",
          "aria-checked": selectedSlotUtc === slot.start_utc ? 'true' : 'false',
          onClick: () => onSelectSlot(slot.start_utc),
          children: (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_8__.fmtTime)(slot.start_utc, displayTz, locale)
        }, slot.start_utc))
      }) : (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("div", {
        class: "ap-noslot",
        children: (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.COPY.no_slots_day, dayLabel(selectedDayKey))
      }), heldToday.length > 0 && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("div", {
        class: "ap-studio-line",
        children: (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.COPY.slot_in_cart_at, heldToday.map(start => (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_8__.fmtTime)(start, displayTz, locale)).join(', '))
      }), heldLines, tzLine, selectedSlotUtc && displayTz !== businessTz && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("div", {
        class: "ap-studio-line",
        children: (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.COPY.business_time_line, (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_8__.fmtTimeAt)(selectedSlotUtc, businessTz, displayTz, locale), (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_8__.tzLabel)(businessTz, selectedSlotUtc))
      })]
    });
  }
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("div", {
    class: "ap-step",
    children: [banner, (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)(_StepHeader_jsx__WEBPACK_IMPORTED_MODULE_1__.StepHeader, {
      title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.COPY.datetime_title,
      stepIndex: stepIndex,
      progress: progress,
      stepCount: stepCount,
      focusOnMount: focusOnMount
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("p", {
      class: "ap-visually-hidden",
      role: "status",
      "aria-live": "polite",
      children: monthNotice
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("p", {
      class: "ap-visually-hidden",
      "aria-live": "polite",
      children: announce
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("fieldset", {
      disabled: locked,
      style: {
        border: 0,
        padding: 0,
        margin: 0,
        minWidth: 0
      },
      children: availError ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("div", {
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)(_feedback_jsx__WEBPACK_IMPORTED_MODULE_5__.Banner, {
          variant: "err",
          title: availabilityErrorTitle(availError),
          body: availabilityErrorBody(availError)
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)(_Footer_jsx__WEBPACK_IMPORTED_MODULE_2__.Footer, {
          onBack: onBack,
          onPrimary: onRetryAvail,
          primaryLabel: _lib_copy_js__WEBPACK_IMPORTED_MODULE_9__.COPY.try_again
        })]
      }) : availLoading && !Object.keys(availabilityIndex).length ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("div", {
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)(_Skeletons_jsx__WEBPACK_IMPORTED_MODULE_4__.CalendarSkeleton, {}), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("div", {
          style: {
            marginTop: '18px'
          },
          children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)(_Skeletons_jsx__WEBPACK_IMPORTED_MODULE_4__.SlotsSkeleton, {})
        })]
      }) : (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsxs)("div", {
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)(_Calendar_jsx__WEBPACK_IMPORTED_MODULE_3__.Calendar, {
          year: calYear,
          month: calMonth,
          locale: locale,
          todayKey: todayKey,
          availabilityIndex: availabilityIndex,
          selectedDayKey: selectedDayKey,
          years: years,
          onSelectDay: pickDay,
          onMonth: onMonth
        }), availLoading ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)("div", {
          style: {
            marginTop: '18px'
          },
          children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)(_Skeletons_jsx__WEBPACK_IMPORTED_MODULE_4__.SlotsSkeleton, {})
        }) : renderSlots()]
      })
    }), !availError && !(availLoading && !Object.keys(availabilityIndex).length) && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_10__.jsx)(_Footer_jsx__WEBPACK_IMPORTED_MODULE_2__.Footer, {
      onBack: onBack,
      backDisabled: locked,
      onPrimary: onContinue,
      primaryLabel: primaryLabel,
      primaryDisabled: !selectedSlotUtc || blocked,
      busy: busy
    })]
  });
}

/***/ },

/***/ "./assets/src/form/components/DepositLines.jsx"
/*!*****************************************************!*\
  !*** ./assets/src/form/components/DepositLines.jsx ***!
  \*****************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DepositLines: () => (/* binding */ DepositLines),
/* harmony export */   isDepositOrder: () => (/* binding */ isDepositOrder)
/* harmony export */ });
/* harmony import */ var _lib_copy_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../lib/copy.js */ "./assets/src/form/lib/copy.js");
/* harmony import */ var _lib_format_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../lib/format.js */ "./assets/src/form/lib/format.js");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
/** @jsxImportSource preact */
/** Server-owned deposit amounts for previews and settled orders (D-R71). */



function isDepositOrder(order) {
  return !!order && Number.isInteger(order.payable_now_minor) && order.payable_now_minor > 0 && order.payable_now_minor < order.total_minor;
}
function DepositLines({
  order,
  currency,
  locale,
  currencyExponent,
  settled = false
}) {
  if (!isDepositOrder(order)) return null;
  const money = value => (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_1__.formatMoney)(value, currency, locale, currencyExponent);
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)(preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.Fragment, {
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
      class: "ap-sum-total",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
        children: settled ? order.payment_state_reason === 'deposit_paid' ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_0__.COPY.deposit_paid : _lib_copy_js__WEBPACK_IMPORTED_MODULE_0__.COPY.amount_paid : _lib_copy_js__WEBPACK_IMPORTED_MODULE_0__.COPY.deposit_due
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
        class: "v",
        children: money(settled ? order.net_collected_minor : order.payable_now_minor)
      })]
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
      class: "ap-sum-total",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
        children: settled ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_0__.COPY.balance_due : _lib_copy_js__WEBPACK_IMPORTED_MODULE_0__.COPY.balance_onsite
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
        class: "v",
        children: money(settled ? order.balance_due_minor : order.balance_minor ?? order.balance_on_site_minor)
      })]
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("p", {
      class: "ap-sum-sub",
      children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_0__.COPY.deposit_cancel_note
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
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var preact_hooks__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! preact/hooks */ "./node_modules/preact/hooks/dist/hooks.module.js");
/* harmony import */ var _StepHeader_jsx__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./StepHeader.jsx */ "./assets/src/form/components/StepHeader.jsx");
/* harmony import */ var _Footer_jsx__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./Footer.jsx */ "./assets/src/form/components/Footer.jsx");
/* harmony import */ var _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/copy.js */ "./assets/src/form/lib/copy.js");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
/** @jsxImportSource preact */
/**
 * Step 3 — Your details (SPEC-P1 §2.2 #3).
 *
 * First name, last name and email are always required (the two name parts are
 * separate inputs since the name split, 2026-10-01 — side by side on a wide
 * content column, stacked on a narrow one); phone follows the admin setting
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






const BUILT_IN_ORDER = ['first_name', 'last_name', 'email', 'phone', 'consent'];

/** The error-map key for one custom field — the server's own 422 field key. */
const customKey = slug => 'custom_fields.' + slug;
function DetailsStep({
  identityEnabled = true,
  locked = false,
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
  // An edition-owned extra control (`{key, render}` or null), rendered after
  // the custom fields: its `key` is the server's 422 field key, so errors and
  // focus-first-error treat it like any other field. Null in Free.
  extraField = null,
  honeypot,
  onHoneypot,
  fieldErrors,
  banner,
  stepIndex,
  progress,
  stepCount,
  focusOnMount,
  onBack,
  onSubmit,
  // The Details CTA is only FINAL when nothing follows it. On a site that takes
  // payment for this service it is a plain "Continue" and the Book CTA moves to
  // the Payment step, which is also where the idempotency key is minted.
  primaryLabel = _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.book,
  submitting
}) {
  const refs = {
    first_name: (0,preact_hooks__WEBPACK_IMPORTED_MODULE_1__.useRef)(null),
    last_name: (0,preact_hooks__WEBPACK_IMPORTED_MODULE_1__.useRef)(null),
    email: (0,preact_hooks__WEBPACK_IMPORTED_MODULE_1__.useRef)(null),
    phone: (0,preact_hooks__WEBPACK_IMPORTED_MODULE_1__.useRef)(null),
    consent: (0,preact_hooks__WEBPACK_IMPORTED_MODULE_1__.useRef)(null)
  };
  // One ref per custom field would break the rules of hooks (the list is
  // config-driven), so the controls register themselves in a single map.
  const customRefs = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_1__.useRef)({});
  const custom = customFields || [];
  const values = customValues || {};
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (!fieldErrors) {
      return;
    }
    // Custom fields render after the built-ins, so focus-first-error follows
    // the same visual order the visitor reads in.
    const order = BUILT_IN_ORDER.concat(custom.map(f => customKey(f.slug)));
    if (extraField && extraField.key) {
      order.push(extraField.key);
    }
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
    const marker = f.required ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
      class: "req",
      children: "*"
    }) : (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
      class: "opt",
      children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.phone_optional
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
      control = (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("label", {
        class: "ap-consent",
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("input", {
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
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("span", {
          children: [f.label, " ", f.required && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
            class: "req",
            children: "*"
          })]
        })]
      });
    } else if (f.type === 'textarea') {
      control = (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("textarea", {
        ...shared,
        class: "ap-textarea",
        value: value || '',
        maxlength: f.maxLength || undefined,
        onInput: onInput
      });
    } else if (f.type === 'select') {
      control = (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("select", {
        ...shared,
        class: "ap-select",
        value: value || '',
        onChange: e => onCustomChange(f.slug, e.target.value),
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("option", {
          value: "",
          children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.select_placeholder
        }), f.options.map(o => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("option", {
          value: o.value,
          children: o.label
        }, o.value))]
      });
    } else {
      control = (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("input", {
        ...shared,
        type: "text",
        class: "ap-input",
        value: value || '',
        maxlength: f.maxLength || undefined,
        onInput: onInput
      });
    }
    return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
      class: 'ap-field' + (bad ? ' bad' : ''),
      children: [f.type !== 'checkbox' && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("label", {
        class: "ap-label",
        for: id,
        children: [f.label, " ", marker]
      }), control, bad && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("p", {
        class: "ap-err",
        id: errId,
        children: err[key]
      })]
    }, f.slug);
  }
  function field(name, labelNode, inputProps) {
    const bad = !!err[name];
    return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
      class: 'ap-field' + (bad ? ' bad' : ''),
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("label", {
        class: "ap-label",
        for: 'ap-' + name,
        children: labelNode
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("input", {
        id: 'ap-' + name,
        ref: refs[name],
        class: "ap-input",
        value: details[name] || '',
        "aria-invalid": bad ? 'true' : 'false',
        "aria-describedby": bad ? 'ap-' + name + '-err' : undefined,
        onInput: e => onChange(name, e.target.value),
        ...inputProps
      }), bad && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("p", {
        class: "ap-err",
        id: 'ap-' + name + '-err',
        children: err[name]
      })]
    });
  }
  const emailField = field('email', (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("span", {
    children: [_lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.email_label, " ", (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
      class: "req",
      children: "*"
    })]
  }), {
    type: 'email',
    autocomplete: 'email',
    placeholder: _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.email_placeholder,
    inputmode: 'email'
  });
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
    class: "ap-step",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(_StepHeader_jsx__WEBPACK_IMPORTED_MODULE_2__.StepHeader, {
      title: identityEnabled ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.details_title : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Booking details', 'aponto'),
      sub: identityEnabled ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.details_sub : null,
      stepIndex: stepIndex,
      progress: progress,
      stepCount: stepCount,
      focusOnMount: focusOnMount
    }), banner, (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("fieldset", {
      disabled: locked,
      style: {
        border: 0,
        padding: 0,
        margin: 0,
        minWidth: 0
      },
      children: [identityEnabled && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
        class: "ap-split-row",
        children: [field('first_name', (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("span", {
          children: [_lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.first_name_label, ' ', (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
            class: "req",
            children: "*"
          })]
        }), {
          type: 'text',
          autocomplete: 'given-name',
          placeholder: _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.first_name_placeholder
        }), field('last_name', (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("span", {
          children: [_lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.last_name_label, ' ', (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
            class: "req",
            children: "*"
          })]
        }), {
          type: 'text',
          autocomplete: 'family-name',
          placeholder: _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.last_name_placeholder
        })]
      }), identityEnabled && (phoneMode !== 'off' ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
        class: "ap-split-row",
        children: [emailField, field('phone', (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("span", {
          children: [_lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.phone_label, ' ', phoneMode === 'required' ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
            class: "req",
            children: "*"
          }) : (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
            class: "opt",
            children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.phone_optional
          })]
        }), {
          type: 'tel',
          autocomplete: 'tel',
          inputmode: 'tel'
        })]
      }) : emailField), identityEnabled && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
        class: "ap-field",
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("label", {
          class: "ap-label",
          for: "ap-note",
          children: [_lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.note_label, ' ', (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
            class: "opt",
            children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.note_optional
          })]
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("textarea", {
          id: "ap-note",
          class: "ap-textarea",
          value: details.note || '',
          placeholder: _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.note_placeholder,
          onInput: e => onChange('note', e.target.value)
        })]
      }), custom.map(customControl), extraField && extraField.key && extraField.render({
        error: err[extraField.key] || '',
        inputRef: el => {
          customRefs.current[extraField.key] = el;
        }
      }), consentEnabled && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
        class: 'ap-field' + (err.consent ? ' bad' : ''),
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("label", {
          class: "ap-consent",
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("input", {
            ref: refs.consent,
            type: "checkbox",
            checked: !!consent,
            "aria-required": "true",
            "aria-invalid": err.consent ? 'true' : 'false',
            onChange: e => onConsentChange(e.target.checked)
          }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("span", {
            children: [consentText || _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.consent_default, ' ', (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("span", {
              class: "req",
              children: "*"
            })]
          })]
        }), err.consent && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("p", {
          class: "ap-err",
          style: {
            display: 'block'
          },
          children: err.consent
        })]
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("div", {
        class: "ap-honeypot",
        "aria-hidden": "true",
        children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("label", {
          children: ["Leave this field empty", (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("input", {
            type: "text",
            tabIndex: -1,
            autocomplete: "off",
            value: honeypot,
            onInput: e => onHoneypot(e.target.value)
          })]
        })
      })]
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(_Footer_jsx__WEBPACK_IMPORTED_MODULE_3__.Footer, {
      onBack: onBack,
      backDisabled: locked,
      onPrimary: onSubmit,
      primaryLabel: primaryLabel,
      busy: submitting,
      busyLabel: _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.saving
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

/***/ "./assets/src/form/components/IntroPanel.jsx"
/*!***************************************************!*\
  !*** ./assets/src/form/components/IntroPanel.jsx ***!
  \***************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   INTRO_TITLE_ID: () => (/* binding */ INTRO_TITLE_ID),
/* harmony export */   IntroPanel: () => (/* binding */ IntroPanel)
/* harmony export */ });
/* harmony import */ var preact_hooks__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! preact/hooks */ "./node_modules/preact/hooks/dist/hooks.module.js");
/* harmony import */ var _lib_format_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../lib/format.js */ "./assets/src/form/lib/format.js");
/* harmony import */ var _lib_copy_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../lib/copy.js */ "./assets/src/form/lib/copy.js");
/* harmony import */ var _Summary_jsx__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./Summary.jsx */ "./assets/src/form/components/Summary.jsx");
/* harmony import */ var _StaffStep_jsx__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./StaffStep.jsx */ "./assets/src/form/components/StaffStep.jsx");
/* harmony import */ var _icons_jsx__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./icons.jsx */ "./assets/src/form/components/icons.jsx");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
/** @jsxImportSource preact */
/**
 * The one-page intro panel (D-R80) — the FIRST grid column of the `layout: 'one-page'` frame,
 * which replaces the summary sidebar for a block pinned to one service
 * (`docs/mockups/v4/booking-form/single-screen-layout.html`, `introHTML()`).
 *
 * It answers "what am I booking?" before the visitor has touched anything, then becomes the
 * running summary once a time is chosen:
 *
 *   - always: the service name in the SAME heading style as the screen heading (`.ap-h h2`, so
 *     the two titles share a baseline), duration, price when there is one, and the location /
 *     staff rows exactly when the summary sidebar would print them;
 *   - before the pick (`booked` false): the service description, which sells the appointment;
 *   - after the pick (`booked`): the date, start → end, the display zone (+ the studio line
 *     when the zones differ), the edition's coupon rows and the total — the description steps
 *     aside so the card stays as short as the form beside it;
 *   - at the foot: the contact-help line, honouring the block's `contactHelp` / `contactText`.
 *
 * Every row comes from the summary's own row components (`Summary.jsx`), so a time, a total or
 * a staff line can never read differently in the two frames, and every time goes through the one
 * `tz.js` formatter (AGENTS §5 invariant 6).
 *
 * Narrow containers (<700px, CSS only): the panel stacks above the screen. Before the pick it is
 * compact — the description and contact line hide behind "Show details"; after it, the panel
 * collapses to the existing recap-bar pattern (`.ap-recap-bar`), one line that expands.
 *
 * The meeting-method line (D-R82) comes from the BLOCK (`meetingType` / `meetingText`), sits
 * under the duration row and stays on every screen. The host / team line (D-R85) sits under the
 * title: the person or team the SERVER resolved for the block, or the visitor's own pick.
 */







/** ShadowRoot-scoped ids: every widget lives in its own root. */

const INTRO_TITLE_ID = 'ap-intro-title';
const INTRO_BODY_ID = 'ap-intro-body';
const INTRO_DESC_ID = 'ap-intro-desc';
const INTRO_HELP_ID = 'ap-intro-help';

/**
 * The meeting-method line's icon and default first line per type (D-R82). `custom` has no
 * default: the operator's text IS its line.
 */
const MEETING = {
  in_person: [_icons_jsx__WEBPACK_IMPORTED_MODULE_5__.IconPin, 'meeting_in_person'],
  phone: [_icons_jsx__WEBPACK_IMPORTED_MODULE_5__.IconPhone, 'meeting_phone'],
  online: [_icons_jsx__WEBPACK_IMPORTED_MODULE_5__.IconVideo, 'meeting_online'],
  custom: [_icons_jsx__WEBPACK_IMPORTED_MODULE_5__.IconInfo, '']
};

/**
 * One icon row with a spoken label: "Duration: 30 min".
 *
 * @param {Object}  props        Props.
 * @param {Object}  props.icon   Icon element.
 * @param {string}  props.label  Spoken label.
 * @param {string}  props.value  Visible value.
 * @param {boolean} props.amount A money amount, which never wraps.
 * @param {string}  props.sub    Muted second line, '' for none.
 * @return {Object} Row.
 */
function MetaRow({
  icon,
  label,
  value,
  amount = false,
  sub = ''
}) {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
    class: "ap-sum-item",
    children: [icon, (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("p", {
      class: "ap-sum-sub",
      children: [(0,_Summary_jsx__WEBPACK_IMPORTED_MODULE_3__.spokenLabel)(label), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
        class: amount ? 'k ap-amt' : 'k',
        children: value
      }), sub ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("br", {}) : null, sub || null]
    })]
  });
}

/**
 * "Meeting method: Online meeting / Link sent after booking" (D-R82). The operator's text is a
 * TEXT NODE — never markup and never auto-linked, even when it is a URL: it is public on the
 * page and may be anything. Nothing for no type, or a custom type with no text.
 *
 * @param {Object} props      Props.
 * @param {string} props.type `in_person` | `phone` | `online` | `custom` | ''.
 * @param {string} props.text Operator text, '' for none.
 * @return {?Object} Row.
 */
function MeetingRow({
  type,
  text
}) {
  const entry = MEETING[type];
  const label = entry && (entry[1] ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY[entry[1]] : text);
  if (!label) {
    return null;
  }
  const Icon = entry[0];
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(MetaRow, {
    icon: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(Icon, {}),
    label: _lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.meeting_label,
    value: label,
    sub: entry[1] ? text : ''
  });
}

/**
 * "A, B or C" in the visitor's language — `Intl.ListFormat` (disjunction) where the engine has
 * it, a plain comma list where it does not.
 *
 * @param {string[]} items  Items.
 * @param {string}   locale Locale.
 * @return {string} List.
 */
function orList(items, locale) {
  try {
    return new Intl.ListFormat(locale || undefined, {
      type: 'disjunction'
    }).format(items);
  } catch {
    return items.join(', ');
  }
}

/**
 * The host / team line (D-R85), under the service title: avatar(s) on the SAME line as the name,
 * the job title on its own full-width line below; a team is its stacked avatars alone on the first
 * line and "You'll meet A, B or C" below. Every value is
 * a text node; the avatars are decorative (the shared `StaffAvatar`: initials first, the photo
 * revealed only once it loads, `alt=""`), and the name carries the spoken "With:" the other rows
 * use. A team pictures at most three faces plus a "+N" chip; the names list at most three first
 * names, then "or another team member".
 *
 * @param {Object}  props        Props.
 * @param {Object}  props.host   `{kind: 'person', member}` or `{kind: 'team', members, total, others}`.
 * @param {string}  props.locale Locale.
 * @return {Object} Line.
 */
function HostRow({
  host,
  locale
}) {
  const face = (m, i) => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_StaffStep_jsx__WEBPACK_IMPORTED_MODULE_4__.StaffAvatar, {
    name: m.name,
    first: m.first_name,
    last: m.last_name,
    photo: m.avatar
  }, i);
  if ('person' === host.kind) {
    const m = host.member;
    return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
      class: "ap-intro-host",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
        class: "ap-intro-host-row",
        children: [face(m, 0), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("span", {
          class: "ap-intro-host-name",
          children: [(0,_Summary_jsx__WEBPACK_IMPORTED_MODULE_3__.spokenLabel)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.summary_with), m.name]
        })]
      }), m.title ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
        class: "ap-intro-host-sub",
        children: m.title
      }) : null]
    });
  }
  const names = host.members.map(m => (0,_StaffStep_jsx__WEBPACK_IMPORTED_MODULE_4__.firstNameOf)(m));
  // "+N" counts PUBLIC people beyond the faces; hidden colleagues the any-staff path may assign
  // only add the generic "or another team member" — never a number (D-R85 fix round 2).
  if (host.total > host.members.length || host.others) {
    names.push(_lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.host_another);
  }
  const sentence = (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.host_meet, orList(names, locale));
  const extra = host.total - host.members.length;
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
    class: "ap-intro-host",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("div", {
      class: "ap-intro-host-row",
      children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("span", {
        class: "ap-av-stack",
        "aria-hidden": "true",
        children: [host.members.map(face), extra > 0 ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
          class: "ap-av",
          children: (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.host_more, extra)
        }) : null]
      })
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("p", {
      class: "ap-intro-host-sub",
      children: [(0,_Summary_jsx__WEBPACK_IMPORTED_MODULE_3__.spokenLabel)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.summary_with), sentence]
    })]
  });
}
function IntroPanel({
  service,
  // A time is chosen AND the visitor has moved past Date & time (Details, Payment,
  // Confirmation). Drives the description → pick swap and the narrow recap bar.
  booked = false,
  staffName = '',
  staffTitle = '',
  staffAny = false,
  staffTerm = '',
  locationName = '',
  locationAddress = '',
  contactPhone = '',
  contactText = '',
  locale,
  currencyExponent = null,
  displayTz,
  businessTz,
  slotUtc = null,
  priceRows = null,
  totalMinor = null,
  // The paying gateway's own line under the total (T-025), as in the sidebar; '' for none.
  totalNote = '',
  // Server payment terms: a deposit order shows "due now / balance later" under the total
  // (D-R71). The caller withholds them on Confirmation, which prints the SETTLED lines.
  paymentTerms = null,
  // "Change time" under the chosen time (Details and Payment): back to Date & time with the
  // typed details kept — the same handler as Back. Null hides it (Confirmation, a resume leg,
  // a gateway mid-attempt).
  onChangeTime = null,
  // How the appointment takes place (D-R82, block attributes, already allow-listed and
  // stripped to plain text by `resolveConfig()`): '' = no line.
  meetingType = '',
  meetingText = '',
  // Who the visitor will meet (D-R85): `{kind: 'person', member}` | `{kind: 'team', …}`, or
  // null for no line. When it is drawn it REPLACES the summary's "With:" row, which would say
  // the same thing twice.
  host = null
}) {
  // Narrow-form disclosures; inert at ≥700px, where CSS shows everything.
  const [more, setMore] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [open, setOpen] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const price = (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_1__.formatPrice)(service.price_minor, service.currency, locale, currencyExponent);
  const desc = booked ? '' : String(service.description || '').trim();
  const recap = booked && !!slotUtc;
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("aside", {
    class: 'ap-intro' + (recap ? ' is-recap' : '') + (recap && open ? ' is-open' : '') + (more ? ' is-expanded' : ''),
    "aria-labelledby": INTRO_TITLE_ID,
    children: [recap && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("button", {
      type: "button",
      class: "ap-recap-bar",
      "aria-expanded": open ? 'true' : 'false',
      "aria-controls": INTRO_BODY_ID,
      onClick: () => setOpen(o => !o),
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_Summary_jsx__WEBPACK_IMPORTED_MODULE_3__.RecapLine, {
        service: service,
        slotUtc: slotUtc,
        displayTz: displayTz,
        locale: locale
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
        class: 'ap-recap-chev' + (open ? ' up' : ''),
        children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("svg", {
          viewBox: "0 0 24 24",
          "aria-hidden": "true",
          fill: "none",
          stroke: "currentColor",
          "stroke-width": "1.7",
          children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("path", {
            d: "M9 6l6 6-6 6"
          })
        })
      })]
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
      class: "ap-intro-body",
      id: INTRO_BODY_ID,
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
        class: "ap-intro-main",
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("div", {
          class: "ap-h",
          children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("h2", {
            id: INTRO_TITLE_ID,
            children: service.name
          })
        }), host ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(HostRow, {
          host: host,
          locale: locale
        }) : null, (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(MetaRow, {
          icon: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_5__.IconClock, {}),
          label: _lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.summary_duration,
          value: (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_1__.formatDuration)(service.duration_minutes, locale)
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(MeetingRow, {
          type: meetingType,
          text: meetingText
        }), price ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(MetaRow, {
          icon: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_5__.IconTag, {}),
          label: _lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.summary_price,
          value: price,
          amount: true
        }) : null, (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_Summary_jsx__WEBPACK_IMPORTED_MODULE_3__.SumLocation, {
          name: locationName,
          address: locationAddress
        }), host ? null : (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_Summary_jsx__WEBPACK_IMPORTED_MODULE_3__.SumStaff, {
          name: staffName,
          title: staffTitle,
          any: staffAny,
          term: staffTerm
        }), recap ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
          class: "ap-intro-pick",
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_Summary_jsx__WEBPACK_IMPORTED_MODULE_3__.SumWhen, {
            slotUtc: slotUtc,
            durationMinutes: service.duration_minutes,
            displayTz: displayTz,
            businessTz: businessTz,
            locale: locale,
            spoken: _lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.summary_time,
            children: onChangeTime ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("button", {
              type: "button",
              class: "ap-link ap-intro-change",
              onClick: onChangeTime,
              children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.change_time
            }) : null
          }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_Summary_jsx__WEBPACK_IMPORTED_MODULE_3__.SumTotal, {
            service: service,
            locale: locale,
            currencyExponent: currencyExponent,
            priceRows: priceRows,
            totalMinor: totalMinor,
            totalNote: totalNote,
            paymentTerms: paymentTerms
          })]
        }) : null, desc ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
          class: "ap-intro-desc",
          id: INTRO_DESC_ID,
          children: desc
        }) : null, !recap && (desc || contactPhone) ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("button", {
          type: "button",
          class: "ap-link ap-intro-more",
          "aria-expanded": more ? 'true' : 'false',
          "aria-controls": [desc ? INTRO_DESC_ID : '', contactPhone ? INTRO_HELP_ID : ''].filter(Boolean).join(' '),
          onClick: () => setMore(m => !m),
          children: more ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.intro_less : _lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.intro_more
        }) : null]
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_Summary_jsx__WEBPACK_IMPORTED_MODULE_3__.ContactHelp, {
        phone: contactPhone,
        title: contactText,
        id: INTRO_HELP_ID
      })]
    })]
  });
}

/***/ },

/***/ "./assets/src/form/components/LocationStep.jsx"
/*!*****************************************************!*\
  !*** ./assets/src/form/components/LocationStep.jsx ***!
  \*****************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   LocationStep: () => (/* binding */ LocationStep)
/* harmony export */ });
/* harmony import */ var _icons_jsx__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./icons.jsx */ "./assets/src/form/components/icons.jsx");
/* harmony import */ var _StepHeader_jsx__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./StepHeader.jsx */ "./assets/src/form/components/StepHeader.jsx");
/* harmony import */ var _Footer_jsx__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./Footer.jsx */ "./assets/src/form/components/Footer.jsx");
/* harmony import */ var _StaffStep_jsx__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./StaffStep.jsx */ "./assets/src/form/components/StaffStep.jsx");
/* harmony import */ var _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/copy.js */ "./assets/src/form/lib/copy.js");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
/** @jsxImportSource preact */
/**
 * Location step (D-R62, under the D-R60 product rules) — a DEDICATED step between Service and
 * Staff, present only when the site publishes a location roster (`/public/services`
 * `locations[]`, rest-contract §3.1 addendum 2026-09-23), the block does not preset a location,
 * and the chosen service is offered at two or more of them.
 *
 * Ported from the v4 mockup's step-by-step presentation (`docs/mockups/v4/booking-form/`
 * `index.html`, `locationHTML()`): heading "Choose a location", rows of pin + name + address +
 * tick. Three things it deliberately does NOT have:
 *
 *  - **No "Any location" row** (D-R60 rule 3). Assigning a place to a customer is a surprise,
 *    not a convenience, so the step is a required answer — which is also why there is no
 *    Continue: a row SELECTS-AND-ADVANCES exactly like a Service or Staff row.
 *  - **No new component.** The rows are the Staff step's own `StaffRow` with the pin in the
 *    rounded-square mark slot the "Any available" sparkle uses, so this step adds no CSS and no
 *    second set of keyboard/a11y semantics: native buttons, `aria-pressed`, Enter/Space.
 *  - **No cards variant, no profile dialog, no map, no hours** — none of them are in the
 *    mockup, and each would be new design.
 */






/**
 * @param {Object}    props              Props.
 * @param {Array<{id:number,name:string,address:string}>} props.locations Eligible locations,
 *                                       in roster order (`name ASC, id ASC`).
 * @param {?number}   props.selectedId   Chosen location id, or undefined before the first pick.
 * @param {number}    props.stepIndex    1-based position in the honest step list.
 * @param {?Object}   props.progress     Macro rail (D-R53), or null in fraction mode.
 * @param {number}    props.stepCount    Total steps in this booking.
 * @param {boolean}   props.focusOnMount Whether to move focus to the heading.
 * @param {Function}  props.onSelect     Called with the chosen location id.
 * @param {?Function} props.onBack       Back to Service, or null when this is the first step.
 * @return {Object} Step.
 */

function LocationStep({
  locations,
  selectedId,
  stepIndex,
  progress,
  stepCount,
  focusOnMount,
  onSelect,
  onBack
}) {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
    class: "ap-step",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(_StepHeader_jsx__WEBPACK_IMPORTED_MODULE_1__.StepHeader, {
      title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.location_title,
      sub: _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.location_sub,
      stepIndex: stepIndex,
      progress: progress,
      stepCount: stepCount,
      focusOnMount: focusOnMount
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("div", {
      class: "ap-staff-list scroll",
      role: "group",
      "aria-label": _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.location_title,
      children: locations.map(location => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(_StaffStep_jsx__WEBPACK_IMPORTED_MODULE_3__.StaffRow, {
        name: location.name
        // An empty address is a single-line row, never an empty second line.
        ,
        sub: location.address,
        mark: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_0__.IconPin, {}),
        selected: location.id === selectedId,
        onClick: () => onSelect(location.id)
      }, location.id))
    }), (onBack || undefined !== selectedId) && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)(_Footer_jsx__WEBPACK_IMPORTED_MODULE_2__.Footer, {
      onBack: onBack,
      onPrimary: undefined !== selectedId ? () => onSelect(selectedId) : null,
      primaryLabel: _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.continue
    })]
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
/* harmony import */ var _DepositLines_jsx__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./DepositLines.jsx */ "./assets/src/form/components/DepositLines.jsx");
/* harmony import */ var _StepHeader_jsx__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./StepHeader.jsx */ "./assets/src/form/components/StepHeader.jsx");
/* harmony import */ var _Footer_jsx__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./Footer.jsx */ "./assets/src/form/components/Footer.jsx");
/* harmony import */ var _feedback_jsx__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./feedback.jsx */ "./assets/src/form/components/feedback.jsx");
/* harmony import */ var _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/copy.js */ "./assets/src/form/lib/copy.js");
/* harmony import */ var _lib_payments_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../lib/payments.js */ "./assets/src/form/lib/payments.js");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
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
    const copy = (0,_lib_payments_js__WEBPACK_IMPORTED_MODULE_5__.gatewayCopy)(gateway);
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
      title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.pay_onsite_title,
      sub: _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.pay_onsite_sub,
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
  paymentTerms = null,
  paymentChoice = null,
  currency,
  locale,
  currencyExponent,
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
  progress,
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
  const methodCopy = online ? (0,_lib_payments_js__WEBPACK_IMPORTED_MODULE_5__.gatewayCopy)(gateways.find(gateway => gateway.code === method) || method) : null;
  const ctaOwned = online && (0,_lib_payments_js__WEBPACK_IMPORTED_MODULE_5__.gatewayOwnsCta)(method) && !methodCopy?.footerLabel;
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
    class: "ap-step",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_StepHeader_jsx__WEBPACK_IMPORTED_MODULE_1__.StepHeader, {
      title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.payment_title,
      sub: _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.payment_sub,
      stepIndex: stepIndex,
      progress: progress,
      stepCount: stepCount,
      focusOnMount: focusOnMount
    }), notice && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_feedback_jsx__WEBPACK_IMPORTED_MODULE_3__.Banner, {
      variant: "warn",
      title: notice.title,
      body: notice.body,
      children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
        class: "ap-note-actions",
        children: [notice.retry !== false && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("button", {
          type: "button",
          class: "ap-link",
          onClick: onRetry,
          disabled: locked,
          children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.try_again
        }), mode === 'optional' && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("button", {
          type: "button",
          class: "ap-link",
          onClick: onPayOnsite,
          disabled: locked,
          children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.pay_onsite_instead
        })]
      })
    }), deadlineLabel ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
      class: "ap-pay-deadline",
      children: (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.pay_held_until, deadlineLabel)
    }) : null, paymentChoice, (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_DepositLines_jsx__WEBPACK_IMPORTED_MODULE_0__.DepositLines, {
      order: paymentTerms,
      currency: currency,
      locale: locale,
      currencyExponent: currencyExponent
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("div", {
      class: "ap-pay-list",
      children: methods.map(m => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("label", {
        class: 'ap-pay' + (method === m.key ? ' sel' : '') + (locked ? ' locked' : ''),
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("input", {
          type: "radio",
          name: "ap-pay-method",
          value: m.key,
          checked: method === m.key,
          disabled: locked,
          onChange: () => onMethod(m.key)
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
          class: "radio",
          "aria-hidden": "true"
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("span", {
          class: "txt",
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
            class: "ap-item-title",
            children: m.title
          }), m.sub ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("small", {
            children: m.sub
          }) : null]
        })]
      }, m.key))
    }), (gateways || []).map(g => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
      class: "ap-card-shell",
      "data-gateway": g.code,
      hidden: method !== g.code,
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("p", {
        class: "cap",
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
          children: (0,_lib_payments_js__WEBPACK_IMPORTED_MODULE_5__.gatewayCopy)(g).panel
        }), typeof window !== 'undefined' && window.location?.protocol === 'https:' ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
          children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.pay_secure
        }) : null]
      }), gatewayLoading && method === g.code && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
        class: "ap-pay-loading",
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.pay_loading
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("slot", {
        name: (0,_lib_payments_js__WEBPACK_IMPORTED_MODULE_5__.slotName)(g.code)
      })]
    }, g.code)), ctaOwned && !gatewayLoading && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
      class: "ap-pay-hint",
      children: locked ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.pay_cta_gateway_busy : methodCopy?.ctaHint || _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.pay_cta_gateway
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
      class: "ap-pay-error",
      role: "alert",
      "aria-live": "assertive",
      children: error || ''
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("div", {
      class: "ap-note",
      children: online ? methodCopy?.checkoutNote || (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.pay_note_now, totalLabel) : (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.pay_note_onsite, totalLabel)
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_Footer_jsx__WEBPACK_IMPORTED_MODULE_2__.Footer, {
      onBack: onBack,
      backDisabled: !!locked,
      onPrimary: ctaOwned ? null : onSubmit,
      primaryLabel: online ? methodCopy?.footerLabel || (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.sprintf)(resuming ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.pay_cta_resume : _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.pay_cta, totalLabel) : _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.book,
      primaryDisabled: online && !gatewayReady,
      busy: submitting,
      busyLabel: methodCopy?.busyLabel || _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.pay_busy
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
/* harmony import */ var _Footer_jsx__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./Footer.jsx */ "./assets/src/form/components/Footer.jsx");
/* harmony import */ var _lib_format_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/format.js */ "./assets/src/form/lib/format.js");
/* harmony import */ var _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../lib/copy.js */ "./assets/src/form/lib/copy.js");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
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
  const price = (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_4__.formatPrice)(service.price_minor, service.currency, service.__locale, service.__exponent);
  // Search results carry BOTH the category path and the description, the path
  // as a soft prefix — losing the description in search results made the same
  // row read differently depending on how the visitor got to it.
  const path = showPath ? service.category ? service.category.name : _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.all_services : '';
  const desc = service.description || '';
  const hasSub = !!(path || desc);
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("button", {
    type: "button",
    class: 'ap-svc' + (hasSub ? '' : ' is-single') + (price ? '' : ' no-price'),
    "aria-pressed": selected ? 'true' : 'false',
    onClick: onClick,
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("span", {
      class: "txt",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
        class: "ap-item-title",
        children: service.name
      }), hasSub ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("small", {
        children: [path ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("span", {
          class: "path",
          children: [path, desc ? ' · ' : '']
        }) : null, desc]
      }) : null]
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("span", {
      class: "meta",
      children: [price ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
        class: "price",
        children: price
      }) : null, (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
        class: "dur",
        children: (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_4__.formatDuration)(service.duration_minutes, service.__locale)
      })]
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
      class: "tick",
      "aria-hidden": "true",
      children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_1__.IconCheck, {})
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
  progress,
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
  const sub = !services.length ? '' : !flat ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.service_sub : showSearch ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.service_sub_search : _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.service_sub_plain;
  const searchResults = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => {
    if (!q) {
      return null;
    }
    return withLocale.filter(s => {
      const hay = (s.name + ' ' + (s.description || '') + ' ' + (s.category ? s.category.name : '')).toLowerCase();
      return hay.includes(q);
    });
  }, [q, withLocale]);

  /**
   * The category row's price note: "from $20.00", "Free" when every priced service in it is
   * free (D-R81), or nothing — also when free and paid services are MIXED, because "from
   * Free" reads as nonsense and "from $20.00" would hide the free one.
   *
   * @param {number} catId Category id.
   * @return {string} Note or ''.
   */
  function minPrice(catId) {
    const prices = withLocale.filter(s => s.category && s.category.id === catId).map(s => s.price_minor).filter(p => p !== null && p !== undefined);
    if (!prices.length) {
      return '';
    }
    const min = Math.min(...prices);
    if (min === 0) {
      return Math.max(...prices) === 0 ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.price_free : '';
    }
    return (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.from_price, (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_4__.formatMoney)(min, services[0].currency, locale, currencyExponent));
  }
  function catServices(catId) {
    return withLocale.filter(s => s.category && s.category.id === catId);
  }
  function renderBody() {
    if (!services.length) {
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
        class: "ap-empty",
        children: [_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.no_services, (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("br", {}), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
          class: "ap-sum-sub",
          children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.no_services_sub
        })]
      });
    }

    // Active search — flat results across everything.
    if (searchResults) {
      if (!searchResults.length) {
        return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("div", {
          class: "ap-empty",
          children: (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.no_matches, query.trim())
        });
      }
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("div", {
        class: "ap-list scroll",
        children: searchResults.map(s => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(ServiceRow, {
          service: s,
          selected: s.id === selectedId,
          showPath: true,
          onClick: () => onSelect(s)
        }, s.id))
      });
    }

    // Flat catalogue for small businesses.
    if (flat) {
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("div", {
        class: "ap-list scroll",
        children: withLocale.map(s => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(ServiceRow, {
          service: s,
          selected: s.id === selectedId,
          onClick: () => onSelect(s)
        }, s.id))
      });
    }

    // Drilled into a category.
    if (openCat) {
      const cat = categories.find(c => c.id === openCat);
      return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
          class: "ap-crumbs",
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("button", {
            type: "button",
            onClick: () => setOpenCat(null),
            children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.all_categories
          }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_1__.IconChevronRight, {}), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
            children: cat ? cat.name : ''
          })]
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("div", {
          class: "ap-list scroll",
          children: catServices(openCat).map(s => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(ServiceRow, {
            service: s,
            selected: s.id === selectedId,
            onClick: () => onSelect(s)
          }, s.id))
        })]
      });
    }

    // Category landing.
    const uncategorized = withLocale.filter(s => !s.category);
    return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
      class: "ap-list",
      children: [usableCategories.map(c => {
        const count = catServices(c.id).length;
        const from = minPrice(c.id);
        return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("button", {
          type: "button",
          class: "ap-cat",
          onClick: () => setOpenCat(c.id),
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("span", {
            class: "txt",
            children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
              class: "ap-item-title",
              children: c.name
            }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("small", {
              children: [count === 1 ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.service_count_one : (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.services_count, count), from ? ' · ' + from : '']
            })]
          }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
            class: "chev",
            "aria-hidden": "true",
            children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_1__.IconChevronRight, {})
          })]
        }, c.id);
      }), uncategorized.map(s => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(ServiceRow, {
        service: s,
        selected: s.id === selectedId,
        onClick: () => onSelect(s)
      }, s.id))]
    });
  }

  // A remembered choice (the visitor came back) gets an explicit Continue — rows
  // advance on click, so otherwise re-clicking was the only way forward.
  const chosen = null !== selectedId && undefined !== selectedId ? (services || []).find(svc => svc.id === selectedId) || null : null;
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
    class: "ap-step",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_StepHeader_jsx__WEBPACK_IMPORTED_MODULE_2__.StepHeader, {
      title: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.service_title,
      sub: sub,
      stepIndex: stepIndex,
      progress: progress,
      stepCount: stepCount,
      focusOnMount: focusOnMount
    }), showSearch && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("label", {
      class: "ap-search",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_1__.IconSearch, {}), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("input", {
        class: "ap-input",
        type: "search",
        value: query,
        placeholder: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.search_placeholder,
        "aria-label": _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.search_placeholder,
        onInput: e => setQuery(e.target.value)
      })]
    }), renderBody(), chosen && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_Footer_jsx__WEBPACK_IMPORTED_MODULE_3__.Footer, {
      onPrimary: () => onSelect(chosen),
      primaryLabel: _lib_copy_js__WEBPACK_IMPORTED_MODULE_5__.COPY.continue
    })]
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
/* harmony export */   DateTimeSkeleton: () => (/* binding */ DateTimeSkeleton),
/* harmony export */   IntroSkeleton: () => (/* binding */ IntroSkeleton),
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

/**
 * The one-page frame while the catalogue loads (D-R80): the intro column shaped like the panel
 * that is coming (title, two meta rows, a description), so a pinned block never flashes the
 * wizard's catalogue or the summary's "Start with a service" state on its way in.
 */
function IntroSkeleton() {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("aside", {
    class: "ap-intro",
    "aria-hidden": "true",
    children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
      class: "ap-intro-body",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Bar, {
        w: "72%",
        h: 28,
        mb: 24
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Bar, {
        w: "46%",
        h: 13,
        mb: 12
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Bar, {
        w: "38%",
        h: 13,
        mb: 16
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Bar, {
        h: 12,
        mb: 7
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Bar, {
        w: "94%",
        h: 12,
        mb: 7
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Bar, {
        w: "60%",
        h: 12
      })]
    })
  });
}

/** …and the screen beside it: heading, calendar and slot chips (D-R80). */
function DateTimeSkeleton() {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
    "aria-hidden": "true",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Bar, {
      w: "190px",
      h: 22,
      mb: 24
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(CalendarSkeleton, {}), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("div", {
      style: {
        marginTop: '18px'
      },
      children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(SlotsSkeleton, {})
    })]
  });
}

/***/ },

/***/ "./assets/src/form/components/StaffProfileDialog.jsx"
/*!***********************************************************!*\
  !*** ./assets/src/form/components/StaffProfileDialog.jsx ***!
  \***********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   StaffProfileDialog: () => (/* binding */ StaffProfileDialog)
/* harmony export */ });
/* harmony import */ var preact_hooks__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! preact/hooks */ "./node_modules/preact/hooks/dist/hooks.module.js");
/* harmony import */ var _icons_jsx__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./icons.jsx */ "./assets/src/form/components/icons.jsx");
/* harmony import */ var _StaffStep_jsx__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./StaffStep.jsx */ "./assets/src/form/components/StaffStep.jsx");
/* harmony import */ var _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../lib/copy.js */ "./assets/src/form/lib/copy.js");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
/** @jsxImportSource preact */
/**
 * Staff profile dialog (D-R52; mockup `docs/mockups/v4/booking-form/specialist-step.html`).
 *
 * Opened from the "Learn more" trigger beside a staff row/card, and only ever when the site-wide
 * opt-in "Let customers view staff profiles" is on AND that person filled a bio — the server
 * does not publish `bio` otherwise, so there is nothing to open.
 *
 * **Scoped to the booking CARD, not the page.** The dialog is rendered as a child of `.ap` and
 * positions against it, inside the widget's shadow root. A page-level overlay would have to
 * out-z-index the host's sticky headers, cookie bars and the theme's own modals, would inherit
 * the host `body` scroll-lock bugs, and would throw a full-viewport scrim over somebody else's
 * page — the opposite of "the form dissolves into the host theme". `.ap` already has
 * `overflow: clip`, so the panel is clipped to the card for free.
 *
 * **It covers the whole card, sidebar included.** `aria-modal` already hides the rest of the
 * widget from assistive tech, so leaving the summary operable behind it would be a lie to
 * sighted users only. The summary stays READABLE through the scrim, which is the point: you can
 * still see what you are booking.
 *
 * **The bio is rendered as a TEXT NODE.** The column is plain text by construction (D-R51:
 * `sanitize_textarea_field`, precisely so it can be rendered this way), and the paragraph breaks
 * an operator typed survive through CSS `white-space: pre-line` rather than through any markup.
 * Nothing in this file touches `innerHTML` / `dangerouslySetInnerHTML`.
 */





/** ShadowRoot-scoped id: every widget instance lives in its own root, so this cannot collide. */

const NAME_ID = 'ap-staff-profile-name';

/**
 * Focusable descendants of the panel, in document order.
 *
 * `offsetParent` is the cheap "is it actually rendered" test the mockup used; it is null for a
 * `display: none` element and for anything inside one. jsdom reports it as null for everything,
 * which is why the trap is also correct — and untestable — through the panel's own boundaries.
 *
 * @param {HTMLElement} root Panel.
 * @return {Array<HTMLElement>} Focusable elements.
 */
function focusables(root) {
  return Array.prototype.filter.call(root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'), el => !el.disabled);
}

/**
 * @param {Object}   props           Props.
 * @param {Object}   props.member    Roster entry `{id, name, title, bio, avatar}`.
 * @param {boolean}  props.photos    Whether the site shows photos at all (`booking.staff_photos`).
 * @param {boolean}  props.titles    Whether the site shows job titles (`booking.staff_titles`).
 * @param {Function} props.onClose   Close without choosing.
 * @param {Function} props.onBook    Choose this person and advance, exactly like the card click.
 * @return {Object} Dialog.
 */
function StaffProfileDialog({
  member,
  photos,
  titles,
  onClose,
  onBook
}) {
  const panelRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);

  // Focus moves to the PANEL, not to its first control: the first thing in the dialog is the
  // person's name and picture, and dropping focus on "Close" would read the dismissal before
  // the content. `tabindex="-1"` makes that legal.
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (panelRef.current) {
      panelRef.current.focus();
    }
  }, []);

  /**
   * Esc closes; Tab cycles inside the panel.
   *
   * The trap is the FALLBACK, not the mechanism: the card behind is marked `inert` while this
   * is open, which removes it from the tab order and from the a11y tree in every engine that
   * supports the attribute. `inert` has been in all three since 2023 but the widget also runs
   * on whatever browser a customer actually has, and a focus trap costs eight lines.
   *
   * @param {KeyboardEvent} event Key event.
   */
  function onKeyDown(event) {
    if ('Escape' === event.key) {
      event.preventDefault();
      onClose();
      return;
    }
    if ('Tab' !== event.key) {
      return;
    }
    const panel = panelRef.current;
    if (!panel) {
      return;
    }
    const list = focusables(panel);
    if (!list.length) {
      return;
    }
    const first = list[0];
    const last = list[list.length - 1];
    const active = panel.getRootNode().activeElement;
    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
  const title = titles ? member.title || '' : '';
  // The stored first name (name split, 2026-10-01): "Book with Ana", while the heading keeps
  // the full display name.
  const firstName = (0,_StaffStep_jsx__WEBPACK_IMPORTED_MODULE_2__.firstNameOf)(member);
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
    class: "ap-modal",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("div", {
      class: "ap-modal-scrim",
      onClick: onClose
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
      class: "ap-modal-panel",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": NAME_ID,
      tabIndex: -1,
      ref: panelRef,
      onKeyDown: onKeyDown,
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
        class: "ap-modal-head",
        children: [photos && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(_StaffStep_jsx__WEBPACK_IMPORTED_MODULE_2__.StaffAvatar, {
          name: member.name,
          first: member.first_name,
          last: member.last_name,
          photo: member.avatar || null,
          place: "dialog"
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
          class: "ap-modal-id",
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("h3", {
            class: "ap-modal-name",
            id: NAME_ID,
            children: member.name
          }), title ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("p", {
            class: "ap-modal-role",
            children: title
          }) : null]
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("button", {
          type: "button",
          class: "ap-modal-x",
          "aria-label": _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.staff_profile_close,
          onClick: onClose,
          children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_1__.IconClose, {})
        })]
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("div", {
        class: "ap-modal-body",
        children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("p", {
          class: "ap-modal-bio",
          children: member.bio
        })
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
        class: "ap-modal-foot",
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("button", {
          type: "button",
          class: "ap-back",
          onClick: onClose,
          children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.tz_close
        }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("button", {
          type: "button",
          class: "ap-primary",
          onClick: () => onBook(member.id),
          children: (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.staff_book_with, firstName)
        })]
      })]
    })]
  });
}

/***/ },

/***/ "./assets/src/form/components/StaffStep.jsx"
/*!**************************************************!*\
  !*** ./assets/src/form/components/StaffStep.jsx ***!
  \**************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   StaffAvatar: () => (/* binding */ StaffAvatar),
/* harmony export */   StaffRow: () => (/* binding */ StaffRow),
/* harmony export */   StaffStep: () => (/* binding */ StaffStep),
/* harmony export */   firstNameOf: () => (/* binding */ firstNameOf)
/* harmony export */ });
/* harmony import */ var _icons_jsx__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./icons.jsx */ "./assets/src/form/components/icons.jsx");
/* harmony import */ var _StepHeader_jsx__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./StepHeader.jsx */ "./assets/src/form/components/StepHeader.jsx");
/* harmony import */ var _Footer_jsx__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./Footer.jsx */ "./assets/src/form/components/Footer.jsx");
/* harmony import */ var preact_hooks__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! preact/hooks */ "./node_modules/preact/hooks/dist/hooks.module.js");
/* harmony import */ var _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/copy.js */ "./assets/src/form/lib/copy.js");
/* harmony import */ var _shared_person_name_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../shared/person-name.js */ "./assets/src/shared/person-name.js");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
/** @jsxImportSource preact */
/**
 * Staff step (D-R50, founder 2026-09-20) — a DEDICATED step between Service and Date & time,
 * present only when the chosen service has more than one eligible active staff member and the
 * site publishes a roster (`/public/services` `staff[]`, rest-contract §3.1).
 *
 * Deliberately modelled on the Service step rather than invented: same SELECT-THEN-AUTO-ADVANCE
 * behaviour, same selected affordance. The two steps sit next to each other in the flow, so a
 * radio-plus-Continue step here would make the first two screens of the same form behave
 * differently for no reason the customer could name.
 *
 * **D-R51 — the PUBLIC PROFILE, phase 1.** Rows carry an avatar and, under the name, the
 * operator-authored job title.
 *
 * **D-R52 — phase 2** (mockup `docs/mockups/v4/booking-form/specialist-step.html`, approved
 * 2026-09-20). Five things this file now holds up:
 *
 *  - **ONE component, TWO modes.** The base is the LIST row; `.ap-staff-list.cards` is a
 *    container-query override on the CONTENT column (3 columns ≥600px, 2 ≥400px, rows below).
 *    "Cards degrades to List" is the same DOM losing one query — no second markup tree, no JS
 *    re-render, and no second set of a11y semantics to get wrong.
 *  - **Every row has a media slot, or none of them does.** A list where some rows have a circle
 *    and some do not loses its rhythm and reads as broken. With photos ON a member with no
 *    photo gets initials; with `photos` OFF the slot is gone everywhere, including from the
 *    "Any available" row — a lone icon beside text-only rows is the same raggedness.
 *  - **The initials are ALWAYS underneath and the photo is revealed only once it loads.** A
 *    Gravatar URL carries `d=404`, so "this person has no Gravatar" arrives as an ordinary 404;
 *    painting the mark first means it costs no broken-image glyph, no empty circle and no reflow.
 *  - **The profile trigger is a SIBLING, never nested.** The selectable control and the "Learn
 *    more" button are siblings inside a plain container, so there is no nested interactive
 *    content and reaching for the trigger can never commit the step by accident.
 *  - **No noun is hard-coded.** Aponto serves salons, clinics, gyms and tutors; the heading and
 *    the "Any available" sub are `sprintf` templates over the site's own term
 *    (`booking.staff_label`, default "staff member"), rendered as text nodes.
 */







/**
 * The circle's rendered size per placement, used for the `<img>`'s `width`/`height` (fix
 * round 1, B2 — a card avatar was declaring 44 while rendering at 72).
 *
 * These attributes reserve an ASPECT RATIO before the image lands; the CSS variable
 * `--ap-staff-av` owns the used size, and the ratio is 1:1 at every one of these. So the one
 * case they cannot describe — a `cards` list that has degraded to rows under the 400px
 * container query, where the paint is 44 and the attribute says 72 — costs nothing: the box
 * the browser reserves is still square and the CSS still wins.
 *
 * The `srcset` needs no matching `sizes`: its candidates carry `x` descriptors, which the
 * browser resolves against DEVICE PIXEL RATIO alone. A 2x screen therefore takes the 2x URL
 * (300px for an upload, 192px for a Gravatar) for every placement here, and the largest of
 * them — a 72px card at 2x — needs 144.
 */

const AVATAR_PX = {
  row: 44,
  card: 72,
  dialog: 64
};

/**
 * The name a staff member is ADDRESSED by — "Book with Ana", "About Ana" (name split,
 * 2026-10-01). The stored `first_name` when the roster carries it; otherwise the first word of
 * the composed display name, the only guess left for a payload without the parts.
 *
 * @param {?Object} member Roster entry (`first_name` and/or `name`).
 * @return {string} First name ('' for a nameless entry).
 */
function firstNameOf(member) {
  const m = member || {};
  return (0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_5__.normalizePart)(m.first_name) || (0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_5__.normalizePart)(m.name).split(' ')[0];
}

/**
 * The portrait circle: a photo painted over the initials, or the initials alone.
 *
 * **The initials are always in the DOM, and the photo is painted ON TOP of them once it has
 * actually loaded.** Swapping `<img>` for initials only in `onError` would mean a broken-image
 * glyph or an empty circle for as long as the request takes to fail, and then a reflow. Here the
 * circle is correct from the first paint, the image fades in over it if it arrives, and
 * `onError` simply drops it — no flash, no layout shift and no retry loop, because the failed
 * URL is removed from the tree rather than re-rendered.
 *
 * `alt=""` is deliberate and not an oversight — the name is right beside the image in the same
 * control, so a screen reader that announced it twice would read the row's label twice.
 *
 * Exported because the profile dialog draws the same circle at 64px from the same props, and
 * two implementations of "reveal on load" would eventually disagree.
 *
 * The initials come from the shared rule (`initialsOf`, D-R51: first + last word, so "Ana
 * Maria Silva" is AS) — the admin draws the same person with the same mark.
 *
 * @param {Object}  props         Props.
 * @param {string}  props.name    Display name (initials fallback when the parts are absent).
 * @param {string}  [props.first] First name, when the roster carries it.
 * @param {string}  [props.last]  Last name, when the roster carries it.
 * @param {?Object} [props.photo] `{url, url2x}` or null.
 * @param {string}  [props.place] Which circle this is: `row` (44), `card` (72) or `dialog` (64).
 * @return {Object} Avatar.
 */
function StaffAvatar({
  name,
  first = '',
  last = '',
  photo = null,
  place = 'row'
}) {
  const [failed, setFailed] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_3__.useState)(false);
  const [loaded, setLoaded] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_3__.useState)(false);
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("span", {
    class: "ap-av",
    "aria-hidden": "true",
    children: [(0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_5__.initialsOf)({
      name,
      first_name: first,
      last_name: last
    }), photo && !failed ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("img", {
      class: 'ap-av-img' + (loaded ? ' is-loaded' : ''),
      src: photo.url,
      srcset: `${photo.url} 1x, ${photo.url2x} 2x`,
      width: AVATAR_PX[place] || AVATAR_PX.row,
      height: AVATAR_PX[place] || AVATAR_PX.row,
      loading: "lazy",
      decoding: "async",
      alt: "",
      onLoad: () => setLoaded(true),
      onError: () => setFailed(true)
    }) : null]
  });
}

/**
 * One roster entry — the same DOM in both layouts.
 *
 * The wrapper is a plain `<div>`, NOT a button: the choice control and the profile trigger are
 * siblings inside it. That is what keeps focus order "choice → its own trigger → next choice"
 * and keeps the markup valid.
 *
 * @param {Object}    props           Props.
 * @param {string}    props.name      Row title (the display name).
 * @param {string}    [props.first]   First name — the avatar initials.
 * @param {string}    [props.last]    Last name — the avatar initials.
 * @param {string}    [props.sub]     Optional sub line (the job title, or the "any" explanation).
 * @param {?Object}   [props.photo]   Avatar `{url, url2x}` or null.
 * @param {boolean}   [props.any]     Whether this is the "Any available" row.
 * @param {boolean}   [props.media]   Whether the media slot is drawn at all (`photos` setting).
 * @param {boolean}   props.selected  Whether this row is the current choice.
 * @param {Function}  props.onClick   Click handler.
 * @param {?Function} [props.onInfo]  Profile-dialog opener, or null for no trigger. Receives the
 *                                    trigger element so focus can return to this exact button.
 * @param {boolean}   [props.ghost]   Whether to reserve an empty trailing cell because some
 *                                    OTHER row in this list has a trigger (fix round 1, B4).
 * @param {string}    [props.place]   Avatar placement (`row` or `card`).
 * @param {?Object}   [props.mark]    An icon for the rounded-square mark slot instead of an
 *                                    avatar — the Location step's pin (D-R62), which reuses this
 *                                    row verbatim so it adds no CSS and no second a11y model.
 * @return {Object} Row.
 */
function StaffRow({
  name,
  first = '',
  last = '',
  sub = '',
  photo = null,
  any = false,
  mark = null,
  media = true,
  selected,
  onClick,
  onInfo = null,
  ghost = false,
  place = 'row'
}) {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
    class: 'ap-staff-item' + (any ? ' any' : '') + (selected ? ' is-sel' : ''),
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("button", {
      type: "button",
      class: "ap-staff-btn",
      "aria-pressed": selected ? 'true' : 'false',
      onClick: onClick,
      children: [media && (any || mark ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
        class: "ap-staff-mark",
        "aria-hidden": "true",
        children: mark || (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_0__.IconSparkle, {})
      }) : (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(StaffAvatar, {
        name: name,
        first: first,
        last: last,
        photo: photo,
        place: place
      })), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("span", {
        class: "ap-staff-txt",
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
          class: "ap-staff-name",
          children: name
        }), sub ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
          class: "ap-staff-role",
          children: sub
        }) : null]
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
        class: "ap-staff-tick",
        "aria-hidden": "true",
        children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_0__.IconCheck, {})
      }), !onInfo && ghost &&
      // The SAME box as a real trigger, hidden — so the ticks stay in one column
      // whatever the container width does to the "Learn more" label (fix round 1,
      // B4). It sits INSIDE the button so the row's hover and click cover the
      // whole width; outside it the cell read as a cut-off corner (founder
      // review 2026-09-30). A `<span>`, so nothing here is focusable.
      (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("span", {
        class: "ap-staff-info ap-staff-info-ghost",
        "aria-hidden": "true",
        children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_0__.IconInfo, {}), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
          class: "ap-staff-info-t",
          children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.staff_learn_more
        })]
      })]
    }), onInfo && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("button", {
      type: "button",
      class: "ap-staff-info",
      "aria-haspopup": "dialog",
      "aria-label": (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.staff_about, name),
      onClick: event => onInfo(event.currentTarget),
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_icons_jsx__WEBPACK_IMPORTED_MODULE_0__.IconInfo, {}), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
        class: "ap-staff-info-t",
        "aria-hidden": "true",
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.staff_learn_more
      })]
    })]
  });
}

/**
 * @param {Object}    props               Props.
 * @param {Array}     props.staff         Eligible staff, in roster order.
 * @param {?number}   props.selectedId    Chosen staff id, or null for "Any available".
 * @param {Object}    props.display       Resolved `config.staff` block (layout/photos/titles/
 *                                        profiles/choice/label — D-R52).
 * @param {string}    props.term          The site's word for a staff member, already resolved.
 * @param {number}    props.stepIndex     1-based position in the honest step list.
 * @param {number}    props.stepCount     Total steps in this booking.
 * @param {boolean}   props.focusOnMount  Whether to move focus to the heading.
 * @param {Function}  props.onSelect      Called with the id, or null for any.
 * @param {Function}  props.onOpenProfile Called with `(member, triggerEl)` to open the dialog.
 * @param {?Function} props.onBack        Back to Service, or null when this is the first step.
 * @return {Object} Step.
 */
function StaffStep({
  staff,
  selectedId,
  display,
  term,
  stepIndex,
  progress,
  stepCount,
  focusOnMount,
  onSelect,
  onOpenProfile,
  onBack
}) {
  const cards = 'cards' === display.layout;
  /**
   * Whether ANY row in this list opens a profile. Two things key off it: the ghost cell that
   * keeps the ticks in one column on the rows that do not (fix round 1, B4), and the column
   * count below.
   */
  const anyProfile = display.profiles && staff.some(member => !!member.bio);
  /**
   * COLUMNS = min(people, 3) at the widest breakpoint (fix round 1, B5). Two staff in a
   * 3-column grid left a dead third column under the full-width "Any available" banner, which
   * reads as a card that failed to render. The count travels as a class so the layout itself
   * stays CSS — the grid still equalises card heights per row.
   */
  const cols = staff.length < 3 ? ' cols-' + Math.max(1, staff.length) : '';
  // "Customers must choose" removes the escape hatch, so the row is not rendered and the sub
  // must not promise it either (D-R52). Everything else about the step is identical.
  const required = 'required' === display.choice;
  const title = (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.staff_title, term);
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
    class: "ap-step",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_StepHeader_jsx__WEBPACK_IMPORTED_MODULE_1__.StepHeader, {
      title: title,
      sub: required ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.staff_sub_required : _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.staff_sub,
      stepIndex: stepIndex,
      progress: progress,
      stepCount: stepCount,
      focusOnMount: focusOnMount
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
      class: 'ap-staff-list' + (cards ? ' cards' + cols : ' scroll') + (display.photos ? '' : ' no-photos'),
      role: "group",
      "aria-label": title,
      children: [!required && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(StaffRow, {
        name: _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.staff_any,
        sub: (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.sprintf)(cards ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.staff_any_sub_short : _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.staff_any_sub, term),
        any: true,
        media: display.photos,
        selected: selectedId === null,
        onClick: () => onSelect(null),
        ghost: anyProfile
      }), staff.map(member => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(StaffRow, {
        name: member.name,
        first: member.first_name,
        last: member.last_name,
        sub: display.titles ? member.title || '' : '',
        photo: display.photos ? member.avatar || null : null,
        media: display.photos,
        selected: member.id === selectedId,
        onClick: () => onSelect(member.id)
        // The trigger exists ONLY where there is something to open: the
        // site-wide opt-in is on AND this person actually filled a bio. That
        // is what stops switching the setting on from putting an empty "Learn
        // more" under a colleague who left the field blank (D-R52). The server
        // enforces the same rule by not publishing `bio` at all.
        ,
        place: cards ? 'card' : 'row',
        onInfo: display.profiles && member.bio ? trigger => onOpenProfile(member, trigger) : null,
        ghost: anyProfile
      }, member.id))]
    }), (onBack || undefined !== selectedId) && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_Footer_jsx__WEBPACK_IMPORTED_MODULE_2__.Footer, {
      onBack: onBack,
      onPrimary: undefined !== selectedId ? () => onSelect(selectedId) : null,
      primaryLabel: _lib_copy_js__WEBPACK_IMPORTED_MODULE_4__.COPY.continue
    })]
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
/* harmony export */   StepHeader: () => (/* binding */ StepHeader),
/* harmony export */   StepRail: () => (/* binding */ StepRail)
/* harmony export */ });
/* harmony import */ var preact_hooks__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! preact/hooks */ "./node_modules/preact/hooks/dist/hooks.module.js");
/* harmony import */ var _lib_copy_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../lib/copy.js */ "./assets/src/form/lib/copy.js");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
/** @jsxImportSource preact */
/**
 * Step heading plus progress (SPEC-P1 §2.1; two displays since D-R53).
 *
 * **Fraction** — the compact `01 / 05` beside the heading, never a bar. Shipped since P1 and
 * still the DEFAULT, so every already-published block renders exactly as it did.
 *
 * **Horizontal** — the v4 mockup's macro progress (`docs/mockups/v4/booking-form/index.html`,
 * `compactProgressHTML`): a numbered rail above the heading, one item per step, with
 * done / current / upcoming states. Chosen per block in the inspector's Appearance panel.
 *
 * Both are driven by the SAME derived step list the fraction's denominator comes from, so the
 * rail is as honest as the number: the Staff step and the Payment step appear only when this
 * booking really has them, and a preselected service drops the Service step from both.
 *
 * Done steps are deliberately NOT clickable, unlike the mockup's: jumping back in the shipped
 * flow releases a payment hold and can cross a live payment state, so "safe back-navigation"
 * is a decision with its own rules — the Back button already owns them. The rail reports
 * progress; it does not navigate.
 *
 * The heading is focused on mount ONLY after a user-driven step change (`focusOnMount`), so
 * keyboard/AT users land on the new step after navigation without the widget stealing focus or
 * scrolling the page on its first paint (REVIEW §2 #17).
 */



function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}
function StepHeader({
  title,
  sub,
  stepIndex,
  stepCount,
  progress = null,
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
  const numbered = Number.isInteger(stepIndex) && Number.isInteger(stepCount);
  const horizontal = numbered && railApplies(progress);
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)(preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.Fragment, {
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(StepRail, {
      progress: progress,
      stepIndex: stepIndex,
      stepCount: stepCount
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
      class: "ap-h",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("h2", {
        ref: headingRef,
        tabIndex: -1,
        children: title
      }), numbered && !horizontal && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("span", {
        class: "ap-step-fraction",
        "aria-label": (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_1__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_1__.COPY.step_of, stepIndex, stepCount),
        children: [pad2(stepIndex), " / ", pad2(stepCount)]
      }), sub ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("p", {
        class: "sub",
        children: sub
      }) : null]
    })]
  });
}

/** Whether this block asked for the rail AND there is more than one step to draw. */
function railApplies(progress) {
  return !!(progress && 'horizontal' === progress.display && (progress.steps || []).length > 1);
}

/**
 * The macro progress rail, plus the hidden "Step N of M" that replaces the visible fraction in
 * this mode — one announcement, not two.
 *
 * Exported because the CONFIRMATION screen has no `StepHeader` (it is an outcome panel with its
 * own heading block) and yet IS the last item in the step list: without this the rail simply
 * vanished on the final screen and its last item never became current (fix round 1, P2-2).
 *
 * Renders nothing at all in fraction mode, so the confirmation panel is byte-identical to what
 * it has always been for every block that did not opt in.
 *
 * @param {Object}   props           Props.
 * @param {?Object}  props.progress  `{display, steps}` from the resolved config, or null.
 * @param {number}   props.stepIndex 1-based position of the CURRENT step.
 * @param {number}   props.stepCount Total steps in this booking.
 * @return {?Object} Rail.
 */
function StepRail({
  progress,
  stepIndex,
  stepCount
}) {
  if (!railApplies(progress) || !Number.isInteger(stepIndex) || !Number.isInteger(stepCount)) {
    return null;
  }
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)(preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.Fragment, {
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("ol", {
      class: "ap-steps",
      "aria-label": _lib_copy_js__WEBPACK_IMPORTED_MODULE_1__.COPY.progress_label,
      children: progress.steps.map((label, i) => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("li", {
        class: i + 1 < stepIndex ? 'is-done' + (progress.onJump ? ' is-link' : '') : ''
        // The ONLY per-item state assistive tech needs: "you are
        // here". Done/upcoming are conveyed by the label order and
        // by the hidden count below, so a second announcement per
        // item would be noise.
        ,
        "aria-current": i + 1 === stepIndex ? 'step' : undefined
        // The full label stays in the accessible name even where
        // CSS ellipsises the visible text (fix round 1, P2-4).
        ,
        title: label,
        children: i + 1 < stepIndex && progress.onJump ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("button", {
          type: "button",
          class: "ap-step-btn",
          onClick: () => progress.onJump(i),
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
            class: "ap-step-num",
            "aria-hidden": "true",
            children: i + 1
          }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
            class: "ap-step-label",
            children: label
          })]
        }) : (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)(preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.Fragment, {
          children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
            class: "ap-step-num",
            "aria-hidden": "true",
            children: i + 1
          }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
            class: "ap-step-label",
            children: label
          })]
        })
      }, label + ':' + i))
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
      class: "ap-visually-hidden",
      children: (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_1__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_1__.COPY.step_of, stepIndex, stepCount)
    })]
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
/* harmony export */   ContactHelp: () => (/* binding */ ContactHelp),
/* harmony export */   RecapLine: () => (/* binding */ RecapLine),
/* harmony export */   SUMMARY_HEADING_ID: () => (/* binding */ SUMMARY_HEADING_ID),
/* harmony export */   SumLocation: () => (/* reexport safe */ _BookingSummaryDetails_jsx__WEBPACK_IMPORTED_MODULE_5__.SumLocation),
/* harmony export */   SumStaff: () => (/* reexport safe */ _BookingSummaryDetails_jsx__WEBPACK_IMPORTED_MODULE_5__.SumStaff),
/* harmony export */   SumTotal: () => (/* binding */ SumTotal),
/* harmony export */   SumWhen: () => (/* reexport safe */ _BookingSummaryDetails_jsx__WEBPACK_IMPORTED_MODULE_5__.SumWhen),
/* harmony export */   Summary: () => (/* binding */ Summary),
/* harmony export */   recapLine: () => (/* binding */ recapLine),
/* harmony export */   spokenLabel: () => (/* reexport safe */ _BookingSummaryDetails_jsx__WEBPACK_IMPORTED_MODULE_5__.spokenLabel),
/* harmony export */   totalNoteGateway: () => (/* binding */ totalNoteGateway)
/* harmony export */ });
/* harmony import */ var _DepositLines_jsx__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./DepositLines.jsx */ "./assets/src/form/components/DepositLines.jsx");
/* harmony import */ var _lib_tz_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../lib/tz.js */ "./assets/src/form/lib/tz.js");
/* harmony import */ var _lib_format_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../lib/format.js */ "./assets/src/form/lib/format.js");
/* harmony import */ var _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../lib/copy.js */ "./assets/src/form/lib/copy.js");
/* harmony import */ var _lib_config_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/config.js */ "./assets/src/form/lib/config.js");
/* harmony import */ var _BookingSummaryDetails_jsx__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./BookingSummaryDetails.jsx */ "./assets/src/form/components/BookingSummaryDetails.jsx");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
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
 * Since D-R49 the sidebar is on from the Service step by default, where nothing
 * is picked yet: `service` may be null, and the body is then the v4 compact
 * screen's empty state. It is plain static text — not a live region, nothing
 * focusable — so mounting it announces nothing and moves no focus; the step
 * heading keeps both. Picking a service swaps in the regular body.
 *
 * V1 gating (REVIEW.md §2 item 5): no cart, so no item count, no "Add service",
 * no location line and no payments/credits line — just the single current booking.
 * AMENDED by D-R50: a SPECIALIST line appears under the service name, and only when the
 * customer picked a named staff member on the new Staff step. Both placements get it
 * from this one renderer, so the sidebar and the recap accordion can never disagree.
 * AMENDED by D-R62: a "Where: <location>" line (address beneath it) appears whenever a location
 * is in play — chosen on the Location step, assigned silently because the service is offered at
 * one place, or preset by the block — from the same one renderer. The v4 "no location line"
 * gating above was about the cart-era summary; a booking that is going to a specific branch owes
 * the customer the branch.
 *
 * Every time flows through the one `tz.js` formatter in the active display_tz, so
 * the summary is byte-consistent with the slot picker and confirmation (D1). The
 * studio time appears as a labelled secondary line whenever the zones differ.
 */







// The row components live with the summary details; re-exported for the intro panel (D-R80).



/**
 * "Questions? Call +84 …" at the foot of the summary (founder review 2026-09-30). The number
 * is the business's own public phone (or the chosen branch's); nothing renders without one.
 *
 * @param {Object}  props       Props.
 * @param {string}  props.phone Display phone.
 * @param {string}  props.title Heading override from the block, '' for the default.
 * @param {?string} props.id    Element id, for a disclosure that controls it (D-R80).
 * @return {?Object} Block.
 */
function ContactHelp({
  phone,
  title,
  id
}) {
  const href = (0,_lib_config_js__WEBPACK_IMPORTED_MODULE_4__.telHref)(phone);
  // A value with no number in it prints NOTHING (persona QA 2026-10-05, T-088): "Call abc not
  // a phone for help" is worse than no line.
  if (!phone || !href) {
    return null;
  }
  // Split the translated sentence around the number so it can be a link wherever the
  // language puts it.
  const parts = (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.contact_call, '\u0000').split('\u0000');
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
    class: "ap-sum-help",
    id: id,
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
      class: "t",
      children: title || _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.contact_title
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("p", {
      class: "c",
      children: [parts[0], (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("a", {
        href: href,
        children: phone
      }), parts[1] || '']
    })]
  });
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
  const when = (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_1__.formatInTz)(slotUtc, displayTz, {
    month: 'short',
    day: 'numeric'
  }, locale);
  return (service ? service.name + ' · ' : '') + when + ', ' + (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_1__.fmtTime)(slotUtc, displayTz, locale);
}

/**
 * The recap bar's line as TWO parts (QA D05, 2026-10-05): the service name, which may ellipsize,
 * and the chosen time, which never does — a long service name used to truncate the one thing the
 * bar exists to show. The time part starts with a non-breaking space so the separator survives
 * the flex layout.
 *
 * @param {Object} props Same as {@link recapLine}.
 * @return {Object} Line.
 */
function RecapLine({
  service,
  slotUtc,
  displayTz,
  locale
}) {
  const name = service ? service.name : '';
  if (!slotUtc) {
    return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
      class: "ap-recap-line",
      children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
        class: "ap-recap-name",
        children: name
      })
    });
  }
  const when = (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_1__.formatInTz)(slotUtc, displayTz, {
    month: 'short',
    day: 'numeric'
  }, locale) + ', ' + (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_1__.fmtTime)(slotUtc, displayTz, locale);
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("span", {
    class: "ap-recap-line",
    children: [name ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
      class: "ap-recap-name",
      children: name
    }) : null, (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
      class: "ap-recap-when",
      children: (name ? '\u00a0· ' : '') + when
    })]
  });
}

/**
 * The price section: edition adjustment rows (`@aponto/form-coupons`) above the total. Nothing
 * for an unpriced service or a free one (D-R81).
 *
 * @param {Object}    props                  Props.
 * @param {Object}    props.service          Service DTO.
 * @param {string}    props.locale           Locale.
 * @param {?number}   props.currencyExponent Server ISO exponent (D-R39a).
 * @param {?Function} props.priceRows        Edition adjustment renderer, or null.
 * @param {?number}   props.totalMinor       Server-quoted total, or null for the list price.
 * @param {string}    props.totalNote        The paying gateway's own line under the total
 *                                           (T-025), '' for none.
 * @param {?Object}   props.paymentTerms     Server payment terms; a deposit order adds the
 *                                           "due now / balance later" lines (D-R71).
 * @return {?Object} Section.
 */
function SumTotal({
  service,
  locale,
  currencyExponent,
  priceRows,
  totalMinor,
  totalNote = '',
  paymentTerms = null
}) {
  const price = (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_2__.formatMoney)(service.price_minor, service.currency, locale, currencyExponent);
  // A free service (D-R81) has no sum to show: the meta line already says "Free". A coupon
  // that brings a POSITIVE price to 0 still lands here with its rows and a 0 total, so the
  // discount stays explained.
  if (!price || (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_2__.isFreePrice)(service.price_minor)) {
    return null;
  }
  const total = totalMinor === null ? price : (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_2__.formatMoney)(totalMinor, service.currency, locale, currencyExponent);
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
    class: "ap-sum-sec",
    children: [priceRows ? priceRows({
      service,
      locale,
      currencyExponent
    }) : null, (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
      class: "ap-sum-total",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.summary_total
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
        class: "v",
        children: total
      })]
    }), totalNote ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
      class: "ap-sum-biz",
      children: totalNote
    }) : null, (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_DepositLines_jsx__WEBPACK_IMPORTED_MODULE_0__.DepositLines, {
      order: paymentTerms,
      currency: service.currency,
      locale: locale,
      currencyExponent: currencyExponent
    })]
  });
}

/**
 * The gateway whose own pricing governs the total the summary shows, or null (persona QA
 * 2026-10-05, T-025 re-test).
 *
 * That is the gateway this booking WILL be paid through: the site's only way to pay (online
 * payment required and exactly one method offered), or the method the visitor picked on the
 * Payment step. With several methods and none picked yet nothing is known, so nothing is said.
 * The caller reads that gateway's own copy (`totalNote`); this file names no gateway.
 *
 * @param {Object}  args           Arguments.
 * @param {string}  args.mode      Site payment mode (`off` / `optional` / `required`).
 * @param {number}  args.offered   How many methods the site offers, drawable or not.
 * @param {Array}   args.gateways  The methods this bundle can draw.
 * @param {?string} args.payMethod The method picked on the Payment step, if any.
 * @return {?Object} Gateway entry.
 */
function totalNoteGateway({
  mode,
  offered,
  gateways,
  payMethod
}) {
  const list = gateways || [];
  if (mode === 'required' && offered === 1 && list.length === 1) {
    return list[0];
  }
  return list.find(gateway => gateway.code === payMethod) || null;
}

/** The heading both placements agree on (sidebar label / accordion fallback). */
const SUMMARY_HEADING_ID = 'ap-summary-heading';
function Summary({
  service,
  // The chosen staff member's NAME, or '' for "Any available" and for every site that does
  // not offer the choice (D-R50). A name is shown only when the customer actually named
  // somebody: "With: Any available" would be noise, and on a single-staff or Free site the
  // summary must read exactly as it did before this feature existed.
  staffName = '',
  // The named staff member's job title (D-R51), appended after the name on the same line as
  // "With: Bella Nguyen · Color Specialist". Empty on every site that has not filled it in,
  // which keeps the Free and single-staff output byte-identical to D-R50's.
  staffTitle = '',
  // "Any available" was the visitor's answer on the Staff step (founder review 2026-09-30),
  // and the term the business uses for its staff, for the detail line under it.
  staffAny = false,
  staffTerm = '',
  // The contact-help line: phone ('' = none) and the block's heading override.
  contactPhone = '',
  contactText = '',
  // The location this booking is going to, or '' on every site with no location roster
  // (D-R62) — whose summary therefore reads exactly as it did before.
  locationName = '',
  // Its one-line address; '' leaves the line out rather than printing an empty one.
  locationAddress = '',
  locale,
  // The site currency's ISO exponent, from the server: `Intl`'s digit table
  // disagrees with ISO for at least one live currency, and the price was
  // stored against ISO (D-R39a).
  currencyExponent = null,
  displayTz,
  businessTz,
  slotUtc,
  // Edition-owned order adjustments (`@aponto/form-coupons`): an optional
  // renderer for the lines between the item and the total, and the total the
  // server quoted. Both absent in Free, where the total is the service price.
  priceRows = null,
  totalMinor = null,
  paymentTerms = null,
  // One short line under the total when the paying gateway adds something to it at its own
  // checkout (taxes); '' — every Free site, and every gateway that charges this total — prints
  // nothing, so the summary is unchanged there.
  totalNote = ''
}) {
  if (!service) {
    return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
      class: "ap-summary-body",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
        class: "ap-sum-start",
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.summary_empty_title
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("p", {
        class: "ap-sum-empty",
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_3__.COPY.summary_empty_text
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(ContactHelp, {
        phone: contactPhone,
        title: contactText
      })]
    });
  }
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
    class: "ap-summary-body",
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_BookingSummaryDetails_jsx__WEBPACK_IMPORTED_MODULE_5__.BookingSummaryDetails, {
      service,
      staffName,
      staffTitle,
      staffAny,
      staffTerm,
      locationName,
      locationAddress,
      locale,
      currencyExponent,
      displayTz,
      businessTz,
      slotUtc
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(SumTotal, {
      service: service,
      locale: locale,
      currencyExponent: currencyExponent,
      priceRows: priceRows,
      totalMinor: totalMinor,
      totalNote: totalNote,
      paymentTerms: paymentTerms
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(ContactHelp, {
      phone: contactPhone,
      title: contactText
    })]
  });
}

/***/ },

/***/ "./assets/src/form/components/TimezoneControl.jsx"
/*!********************************************************!*\
  !*** ./assets/src/form/components/TimezoneControl.jsx ***!
  \********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   TimezoneControl: () => (/* binding */ TimezoneControl)
/* harmony export */ });
/* harmony import */ var preact_hooks__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! preact/hooks */ "./node_modules/preact/hooks/dist/hooks.module.js");
/* harmony import */ var _lib_tz_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../lib/tz.js */ "./assets/src/form/lib/tz.js");
/* harmony import */ var _lib_copy_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../lib/copy.js */ "./assets/src/form/lib/copy.js");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
/** @jsxImportSource preact */
/**
 * The display-zone affordance and its picker (D-R48, founder 2026-09-18 — the
 * "quiet timezone" model C3).
 *
 * It replaces the raw 18-option `<select>` that used to sit under the slot grid.
 * In flow the visitor sees one quiet line beside "Available times" —
 * `Ho Chi Minh (GMT+7) · Change` — and the whole IANA zone database only when
 * they ask for it, behind a searchable dialog. The label half is the D1 invariant
 * (SPEC-P1 §2.2: the display zone is ALWAYS named in flow); the `Change` half is
 * the timezone-correctness invariant (AGENTS §1) and is therefore present in both
 * timezone modes, including for a visitor already on the studio's clock — a
 * traveller books from wherever they happen to be standing.
 *
 * Accessibility: the trigger is a real button carrying `aria-expanded` and
 * `aria-haspopup="dialog"`; opening moves focus into the dialog's search field;
 * Escape (or a click outside, or picking a zone) closes it and returns focus to
 * the trigger.
 *
 * The zone list is NOT a constant in this bundle — `tz.js` reads it from the
 * engine at runtime ({@link allTimezones}), so ~430 names cost the gz budget
 * nothing and can never drift from the database the browser formats with.
 */




/**
 * Fold a zone name or label into the form the search matches against: lowercase,
 * underscores as spaces, so `berl` finds `Europe/Berlin` and `ho chi` finds
 * `Asia/Ho_Chi_Minh`.
 *
 * @param {string} text Raw text.
 * @return {string} Foldable text.
 */

function fold(text) {
  return String(text || '').toLowerCase().replace(/_/g, ' ');
}

/**
 * One zone row.
 *
 * Deliberately a plain `<button>` with NO `option` role (Codex review 1): ARIA's
 * `listbox`/`option` pair is a contract to implement the listbox keyboard model —
 * roving tabindex, arrow-key navigation, `aria-activedescendant` — and claiming
 * the role without the behaviour is worse for a screen-reader user than not
 * claiming it, because it promises keys that do nothing. A searchable list of
 * ordinary buttons is the accepted shape for this control: Tab and Enter already
 * work, and the current zone is marked with `aria-current` rather than the
 * listbox-only `aria-selected`.
 *
 * @param {Object} props Props.
 */
function ZoneRow({
  zone,
  label,
  selected,
  onSelect
}) {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("button", {
    type: "button",
    class: 'ap-tz-opt' + (selected ? ' is-current' : ''),
    "aria-current": selected ? 'true' : null,
    onClick: () => onSelect(zone),
    children: label
  });
}

/**
 * Concatenate two row lists, keeping the first occurrence of each zone.
 *
 * @param {Array<Object>} lead Rows that must come first.
 * @param {Array<Object>} rest Rows appended after, minus anything already listed.
 * @return {Array<Object>} Merged rows.
 */
function mergeRows(lead, rest) {
  const seen = {};
  const out = [];
  lead.concat(rest).forEach(row => {
    if (!seen[row.zone]) {
      seen[row.zone] = true;
      out.push(row);
    }
  });
  return out;
}

/**
 * The picker dialog itself — search-first (founder review 2026-09-30).
 *
 * Opened, it shows only the Suggested zones (the visitor's, the studio's, the one on
 * screen) under the search field: those are the answer for almost everybody, and a
 * wall of ~430 cities was the problem, not the speed. The full list exists only as
 * search results. Its labels are resolved ONCE, on the first keystroke (each one
 * costs an `Intl.DateTimeFormat`); filtering after that is pure string work.
 *
 * @param {Object} props Props.
 */
function TimezoneDialog({
  zones,
  suggested,
  value,
  refInstant,
  onSelect,
  onClose,
  labelId,
  placement
}) {
  const [query, setQuery] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)('');
  const searchRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (searchRef.current && searchRef.current.focus) {
      searchRef.current.focus();
    }
  }, []);
  const needle = fold(query.trim());
  const searching = '' !== needle;
  const build = list => list.map(zone => {
    const label = (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_1__.tzLabel)(zone, refInstant);
    return {
      zone,
      label,
      needle: fold(zone) + ' ' + fold(label)
    };
  });
  const suggestedRows = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => build(suggested || []),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [suggested, refInstant]);
  // Built lazily on the first keystroke, then kept for the rest of this open.
  const allRows = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => searching ? build(zones || []) : null,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [searching, zones, refInstant]);
  const rows = {
    suggested: suggestedRows,
    all: allRows || []
  };
  const filter = list => needle ? list.filter(row => row.needle.indexOf(needle) !== -1) : list;
  // A search is a search of EVERYTHING; the suggested group is a shortcut for the
  // visitor who has not typed, not a second place results can hide in. Matches
  // from it still lead the results — the visitor's own zone and the studio's are
  // the two answers most likely to be wanted — and the rest follow in the
  // alphabetical order `timezoneOptions()` produced.
  const groups = searching ? [{
    key: 'all',
    heading: '',
    rows: mergeRows(filter(rows.suggested), filter(rows.all))
  }] : [{
    key: 'suggested',
    heading: _lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.tz_suggested,
    rows: rows.suggested
  }];
  // While searching, the count answers "did my search find anything?"; before the
  // first keystroke the line says how to reach every other zone instead.
  const total = groups[0].rows.length;
  const countLabel = !searching ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.tz_search_hint : 1 === total ? _lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.tz_count_one : (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.tz_count, total);
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)("div", {
    class: 'ap-tz-pop' + ('up' === placement ? ' up' : ''),
    role: "dialog",
    "aria-labelledby": labelId,
    onKeyDown: e => {
      if ('Escape' === e.key) {
        e.stopPropagation();
        onClose();
      }
    },
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)("div", {
      class: "ap-tz-pop-head",
      children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("span", {
        id: labelId,
        class: "ap-tz-pop-title",
        children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.tz_dialog_title
      }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("button", {
        type: "button",
        class: "ap-tz-pop-close",
        onClick: onClose,
        "aria-label": _lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.tz_close,
        children: "\xD7"
      })]
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("input", {
      ref: searchRef,
      type: "search",
      class: "ap-tz-search",
      value: query,
      "aria-label": _lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.tz_search_label,
      placeholder: _lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.tz_search_placeholder,
      onInput: e => setQuery(e.target.value)
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("p", {
      class: "ap-tz-count",
      "aria-live": "polite",
      children: total ? countLabel : ''
    }), total ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("div", {
      class: "ap-tz-list",
      children: groups.map(group => group.rows.length ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)("div", {
        class: "ap-tz-group",
        children: [group.heading ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("p", {
          class: "ap-tz-group-head",
          role: "presentation",
          children: group.heading
        }) : null, group.rows.map(row => (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)(ZoneRow, {
          zone: row.zone,
          label: row.label,
          selected: row.zone === value,
          onSelect: onSelect
        }, group.key + ':' + row.zone))]
      }, group.key) : null)
    }) : (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("div", {
      class: "ap-tz-empty",
      children: (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.tz_no_matches, query.trim())
    })]
  });
}

/**
 * Label + `Change` + the picker.
 *
 * @param {Object}             props            Props.
 * @param {string}             props.displayTz  The zone every visible time is rendered in.
 * @param {Array<string>}      props.zones      Full picker list (IANA, bookable only).
 * @param {Array<string>}      props.suggested  Pinned group shown above the full list.
 * @param {Date|number|string} props.refInstant Instant the `GMT±N` suffixes resolve at.
 * @param {boolean}            props.showNote   Prefix the label with "Times shown in …".
 * @param {Function}           props.onChange   Called with the newly chosen IANA zone.
 * @param {string}             props.dialogId   ShadowRoot-scoped id for the dialog heading.
 */
function TimezoneControl({
  displayTz,
  zones,
  suggested,
  refInstant,
  showNote,
  onChange,
  dialogId = 'ap-tz-dialog',
  // 'up' when the control sits at the foot of the step: the card clips its
  // overflow, so a downward dialog there would be cut off.
  placement = 'down'
}) {
  const [open, setOpen] = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const wrapRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  const triggerRef = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  // Return focus to the trigger when the dialog closes — but never steal it on
  // first paint, which is why this tracks the TRANSITION rather than the state.
  const wasOpen = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useRef)(false);
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (wasOpen.current && !open && triggerRef.current) {
      triggerRef.current.focus();
    }
    wasOpen.current = open;
  }, [open]);
  (0,preact_hooks__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!open) {
      return undefined;
    }
    const node = wrapRef.current;
    // Inside the widget's open ShadowRoot a document listener never sees the
    // event's real target, so listen on the root the control actually lives in.
    const root = node && typeof node.getRootNode === 'function' ? node.getRootNode() : typeof document !== 'undefined' ? document : null;
    if (!root || !root.addEventListener) {
      return undefined;
    }
    // The wrapper contains the trigger, so a click on the trigger is never
    // "outside" — the trigger's own handler stays the only thing that toggles.
    const onDown = e => {
      if (node && !node.contains(e.target)) {
        setOpen(false);
      }
    };
    root.addEventListener('mousedown', onDown, true);
    return () => root.removeEventListener('mousedown', onDown, true);
  }, [open]);
  const label = (0,_lib_tz_js__WEBPACK_IMPORTED_MODULE_1__.tzLabel)(displayTz, refInstant);
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)("span", {
    class: "ap-tz",
    ref: wrapRef,
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("span", {
      class: "ap-tz-name",
      children: showNote ? (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.times_shown_in_tz, label) : label
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("span", {
      class: "ap-tz-sep",
      "aria-hidden": "true",
      children: "\xB7"
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("button", {
      type: "button",
      class: "ap-tz-change",
      ref: triggerRef,
      "aria-expanded": open ? 'true' : 'false',
      "aria-haspopup": "dialog"
      // The visible word is "Change"; on its own that names nothing. The
      // accessible name says what changes and what it is now, because a
      // screen-reader user reaches this button without the zone label
      // beside it (Codex review 3).
      ,
      "aria-label": (0,_lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.sprintf)(_lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.change_timezone_a11y, label),
      onClick: () => setOpen(value => !value),
      children: _lib_copy_js__WEBPACK_IMPORTED_MODULE_2__.COPY.change_timezone
    }), open && (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)(TimezoneDialog, {
      placement: placement,
      labelId: dialogId,
      zones: zones,
      suggested: suggested,
      value: displayTz,
      refInstant: refInstant,
      onClose: () => setOpen(false),
      onSelect: zone => {
        setOpen(false);
        if (zone !== displayTz) {
          onChange(zone);
        }
      }
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
/* harmony export */   IconClose: () => (/* binding */ IconClose),
/* harmony export */   IconDownload: () => (/* binding */ IconDownload),
/* harmony export */   IconInfo: () => (/* binding */ IconInfo),
/* harmony export */   IconPhone: () => (/* binding */ IconPhone),
/* harmony export */   IconPin: () => (/* binding */ IconPin),
/* harmony export */   IconPrinter: () => (/* binding */ IconPrinter),
/* harmony export */   IconSearch: () => (/* binding */ IconSearch),
/* harmony export */   IconSparkle: () => (/* binding */ IconSparkle),
/* harmony export */   IconTag: () => (/* binding */ IconTag),
/* harmony export */   IconUser: () => (/* binding */ IconUser),
/* harmony export */   IconVideo: () => (/* binding */ IconVideo)
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

/**
 * The "Any available" avatar mark (D-R51).
 *
 * A four-point sparkle, deliberately NOT a person silhouette and NOT initials: the row does
 * not stand for anybody, so a face would imply one staff member and initials would imply a name.
 * The v4 mockup uses `★` for the same slot (`docs/mockups/v4/booking-form/index.html`, AGENTS
 * data); this is the stroke-based equivalent so it inherits `currentColor` like every other
 * icon here.
 *
 * @param {Object} props SVG props.
 * @return {Object} Icon.
 */
/**
 * The "Any available" mark (D-R51, redrawn to the phase-2 mockup in D-R52).
 *
 * A 4-POINT sparkle with a small companion, not a radial burst: a burst reads as a loading
 * spinner, and this mark has to read as "we'll match you" — never as a person and never as a
 * wait. Carries its own slightly heavier stroke because it renders larger than the rest of the
 * set (20px inside the 44px mark) and the shared 1.7 looked washed out there.
 */
function IconSparkle(props) {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(Svg, {
    "stroke-width": "1.8",
    ...props,
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("path", {
      d: "M11 4.2l1.8 4.5 4.5 1.8-4.5 1.8L11 16.8l-1.8-4.5L4.7 10.5l4.5-1.8Z"
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("path", {
      d: "M17.8 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z"
    })]
  });
}

/**
 * The Location step's row mark (D-R62) — the v4 mockup's pin (`svg('pin')`), drawn in the same
 * 44px rounded-square slot as the "Any available" sparkle, so a place never reads as a person.
 *
 * @param {Object} props SVG props.
 * @return {Object} Icon.
 */
function IconPin(props) {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(Svg, {
    ...props,
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("path", {
      d: "M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11Z"
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("circle", {
      cx: "12",
      cy: "10",
      r: "2.5"
    })]
  });
}

/** Dialog dismiss (D-R52). */
function IconClose(props) {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Svg, {
    ...props,
    children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("path", {
      d: "M6 6l12 12M18 6L6 18"
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

/** A price tag — the price line of the one-page intro panel (D-R80). */
function IconTag(props) {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(Svg, {
    ...props,
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("path", {
      d: "M3 12.2V4a1 1 0 0 1 1-1h8.2a1 1 0 0 1 .7.3l8 8a1 1 0 0 1 0 1.4l-8.2 8.2a1 1 0 0 1-1.4 0l-8-8a1 1 0 0 1-.3-.7Z"
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("circle", {
      cx: "8",
      cy: "8",
      r: "1.4"
    })]
  });
}

/** A handset — the "Phone call" meeting method of the one-page intro (D-R82). */
function IconPhone(props) {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Svg, {
    ...props,
    children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("path", {
      d: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"
    })
  });
}

/** A camera — the "Online meeting" method of the one-page intro (D-R82). */
function IconVideo(props) {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(Svg, {
    ...props,
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("rect", {
      x: "3",
      y: "6",
      width: "13",
      height: "12",
      rx: "2"
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("path", {
      d: "M16 10.5l5-3v9l-5-3"
    })]
  });
}

/** A person — the specialist line of the booking summary. */
function IconUser(props) {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(Svg, {
    ...props,
    children: [(0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("circle", {
      cx: "12",
      cy: "8",
      r: "3.5"
    }), (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("path", {
      d: "M5 20a7 7 0 0 1 14 0"
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
     * Generic JSON POST against the public namespace, with the same headers
     * (including `X-WP-Nonce` when the page has one) and error normalisation
     * as every other call. Edition-owned seams (e.g. Premium order
     * adjustments) use it so this Free-shipped client names no paid route.
     *
     * @param {string} path Path under the REST base, e.g. `/public/x`.
     * @param {Object} body JSON body.
     * @return {Promise<Object>} Decoded response.
     */
    requestJson(path, method = 'GET', body) {
      return request(path, {
        method,
        headers: headers({
          'Content-Type': 'application/json'
        }),
        credentials: 'same-origin',
        ...(method === 'GET' ? {} : {
          body: JSON.stringify(body || {})
        })
      });
    },
    postJson(path, body) {
      return request(path, {
        method: 'POST',
        headers: headers({
          'Content-Type': 'application/json'
        }),
        credentials: 'same-origin',
        body: JSON.stringify(body || {})
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
/* harmony export */   MAX_WIDTH_DEFAULT: () => (/* binding */ MAX_WIDTH_DEFAULT),
/* harmony export */   MAX_WIDTH_MAX: () => (/* binding */ MAX_WIDTH_MAX),
/* harmony export */   MAX_WIDTH_MIN: () => (/* binding */ MAX_WIDTH_MIN),
/* harmony export */   SHADOWS: () => (/* binding */ SHADOWS),
/* harmony export */   contrastRatio: () => (/* binding */ contrastRatio),
/* harmony export */   deriveOnAccent: () => (/* binding */ deriveOnAccent),
/* harmony export */   hexToRgb: () => (/* binding */ hexToRgb),
/* harmony export */   relativeLuminance: () => (/* binding */ relativeLuminance),
/* harmony export */   resolveAppearanceVars: () => (/* binding */ resolveAppearanceVars),
/* harmony export */   resolveColorScheme: () => (/* binding */ resolveColorScheme),
/* harmony export */   resolveShadow: () => (/* binding */ resolveShadow),
/* harmony export */   sanitizeColorScheme: () => (/* binding */ sanitizeColorScheme),
/* harmony export */   sanitizeMaxWidth: () => (/* binding */ sanitizeMaxWidth),
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
 * `maxWidth` (D-R49) is the same kind of override for the layout token
 * `--ap-layout-max`: set on the host, inherited by `.ap-wrap` — the element that
 * carries both the cap and the container query, so the query keeps measuring the
 * capped card.
 *
 * Two public `--ap-*` inputs are NOT block attributes and are set by the HOST
 * page when it needs them: `--ap-layout-max` above, and `--ap-sticky-offset`
 * (default `0px`, D-R52) — how much vertical room the host theme's own sticky
 * header takes, so the staff profile dialog opens clear of it. Nothing in this
 * module writes the second one; it is documented here because this is where the
 * public custom-property API is described.
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

/** Bounds of the per-block card width cap, in px (D-R49). */
const MAX_WIDTH_MIN = 480;
const MAX_WIDTH_MAX = 1140;
/** The stylesheet's own `--ap-layout-max` (D-R49). */
const MAX_WIDTH_DEFAULT = 960;

/**
 * Sanitize the `maxWidth` appearance attribute to an integer px value clamped to
 * `480..1140`, or null when it is not a number at all (the stylesheet default
 * then applies). Numbers only — never a CSS string — so nothing can be injected
 * through the block attribute.
 *
 * @param {*} value Raw attribute value.
 * @return {?number} Clamped integer px, or null.
 */
function sanitizeMaxWidth(value) {
  const n = typeof value === 'string' && /^\d+(\.\d+)?$/.test(value.trim()) ? parseFloat(value) : value;
  if (typeof n !== 'number' || !isFinite(n)) {
    return null;
  }
  return Math.max(MAX_WIDTH_MIN, Math.min(MAX_WIDTH_MAX, Math.floor(n)));
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
 * Card elevation steps (founder review 2026-09-30): `flat` is the hairline frame with no
 * shadow; `sm`/`md`/`lg` are borderless shadow steps. `sm` is the default.
 */
const SHADOWS = ['flat', 'sm', 'md', 'lg'];

/**
 * Resolve the `data-ap-shadow` host attribute from the appearance object. Like the colour
 * scheme it is an attribute, not a custom property: the shadow stylesheet maps each step to
 * its token with `:host([data-ap-shadow="…"])`.
 *
 * @param {Object} appearance `{shadow?}` from data-props.
 * @return {string} One of {@link SHADOWS}.
 */
function resolveShadow(appearance) {
  const v = (appearance || {}).shadow;
  const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
  return SHADOWS.includes(s) ? s : 'sm';
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
 * @param {Object} appearance `{accent?, onAccent?, radius?, maxWidth?}` from data-props.
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
  const maxWidth = sanitizeMaxWidth(a.maxWidth);
  if (maxWidth !== null) {
    out['--ap-layout-max'] = maxWidth + 'px';
  }
  return out;
}

/***/ },

/***/ "./assets/src/form/lib/balance.free.js"
/*!*********************************************!*\
  !*** ./assets/src/form/lib/balance.free.js ***!
  \*********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   BalanceEntry: () => (/* binding */ BalanceEntry),
/* harmony export */   balanceToken: () => (/* binding */ balanceToken)
/* harmony export */ });
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
/** @jsxImportSource preact */


/** A saved balance link must never turn into an unrelated new booking. */

function balanceToken(hash) {
  return new URLSearchParams(String(hash || '').replace(/^#/, '')).get('aponto_balance') || '';
}
function BalanceEntry() {
  return (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("div", {
    className: "ap-wrap",
    children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("div", {
      className: "ap",
      children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("div", {
        className: "ap-main narrow",
        children: (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("p", {
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Online payment is not available for this balance. Contact the business for help.', 'aponto')
        })
      })
    })
  });
}

/***/ },

/***/ "./assets/src/form/lib/config.js"
/*!***************************************!*\
  !*** ./assets/src/form/lib/config.js ***!
  \***************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   LAYOUTS: () => (/* binding */ LAYOUTS),
/* harmony export */   MEETING_TYPES: () => (/* binding */ MEETING_TYPES),
/* harmony export */   STAFF_DEFAULTS: () => (/* binding */ STAFF_DEFAULTS),
/* harmony export */   STAFF_LAYOUTS: () => (/* binding */ STAFF_LAYOUTS),
/* harmony export */   STEP_DISPLAYS: () => (/* binding */ STEP_DISPLAYS),
/* harmony export */   SUMMARY_MODES: () => (/* binding */ SUMMARY_MODES),
/* harmony export */   isPhoneLike: () => (/* binding */ isPhoneLike),
/* harmony export */   normalizeCustomFields: () => (/* binding */ normalizeCustomFields),
/* harmony export */   normalizeHost: () => (/* binding */ normalizeHost),
/* harmony export */   normalizeLocationRoster: () => (/* binding */ normalizeLocationRoster),
/* harmony export */   normalizeLocationStaffIds: () => (/* binding */ normalizeLocationStaffIds),
/* harmony export */   normalizePayments: () => (/* binding */ normalizePayments),
/* harmony export */   normalizeServiceLocationIds: () => (/* binding */ normalizeServiceLocationIds),
/* harmony export */   normalizeStaffConfig: () => (/* binding */ normalizeStaffConfig),
/* harmony export */   normalizeStaffIds: () => (/* binding */ normalizeStaffIds),
/* harmony export */   normalizeStaffRoster: () => (/* binding */ normalizeStaffRoster),
/* harmony export */   parseProps: () => (/* binding */ parseProps),
/* harmony export */   preselectDateFor: () => (/* binding */ preselectDateFor),
/* harmony export */   readGlobalConfig: () => (/* binding */ readGlobalConfig),
/* harmony export */   resolveConfig: () => (/* binding */ resolveConfig),
/* harmony export */   showHostFor: () => (/* binding */ showHostFor),
/* harmony export */   telHref: () => (/* binding */ telHref)
/* harmony export */ });
/* harmony import */ var _shared_person_name_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../shared/person-name.js */ "./assets/src/shared/person-name.js");
/**
 * Runtime configuration resolution.
 *
 * The widget needs two kinds of config:
 *  - GLOBAL, shared by every instance on the page: the REST base URL, an optional
 *    nonce, the business timezone (drives the D1 init rule) and the business name.
 *    This is injected once as `window.apontoForm` (by the dev harness in B1, and
 *    by the block's PHP enqueue in B2).
 *  - PER-INSTANCE, from the host element's `data-props`: `serviceId`, `staffId`,
 *    `locationId` (D-R62), `layout`, `summaryMode` (D-R49), `staffLayout` (D-R52), `stepDisplay`
 *    (D-R53) and the `appearance` block attributes (accent/radius — Q11,
 *    maxWidth — D-R49).
 *
 * The page-global also carries the Staff-step display block since D-R52
 * (`staff`), which is the one place a per-block prop OVERRIDES a site
 * setting — see {@link resolveConfig}.
 *
 * Pure-ish module: reads `window` but no DOM mutation. The global read is
 * injected for testability.
 */

const PHONE_MODES = ['off', 'optional', 'required'];

/** Which clock the booking form opens on (`booking.timezone_mode`, D-R48). */
const TIMEZONE_MODES = ['visitor', 'business'];

/**
 * Where the booking summary lives (block attribute `summaryMode`, D-R49):
 * `always` — sidebar from the first step (default); `step2` — sidebar from the
 * second step (the pre-D-R49 behaviour); `off` — no sidebar, recap bar only.
 */
const SUMMARY_MODES = ['always', 'step2', 'off'];

/**
 * How the form shows progress (block attribute `stepDisplay`, D-R53): `fraction` — the compact
 * `01 / 05` beside the heading — or `horizontal`, the v4 mockup's macro progress bar above it,
 * which is the DEFAULT since the founder review of 2026-09-30.
 */
const STEP_DISPLAYS = ['fraction', 'horizontal'];

/**
 * How the form is presented (block attribute `layout`, D-R80): `default` — the step-by-step
 * wizard — or `one-page`, the intro panel beside the active screen for a block pinned to one
 * service. The value only ASKS for the frame; `App` grants it when the service is locked.
 */
const LAYOUTS = ['default', 'one-page'];

/**
 * How the appointment takes place — the one-page intro's meeting-method line (block attribute
 * `meetingType`, D-R82). `''` means no line.
 */
const MEETING_TYPES = ['in_person', 'phone', 'online', 'custom'];

/** Longest meeting-method detail line (block `meetingText`, D-R82) — the server's own cap. */
const MAX_MEETING_TEXT = 140;

/**
 * Whether Date & time opens with the first available day already selected (block attribute
 * `preselectDate`, D-R84). An explicit boolean wins; unset follows the flow — ON for the
 * step-by-step form (the B1 behaviour it has always had), OFF for `one-page`, which opens on the
 * calendar alone. ONE rule for the widget, its hand-built configs and the inspector.
 *
 * @param {*}      value  The block attribute (boolean, or anything else for unset).
 * @param {string} layout The block layout.
 * @return {boolean} Preselect.
 */
function preselectDateFor(value, layout) {
  return 'boolean' === typeof value ? value : 'one-page' !== layout;
}

/**
 * Whether the one-page intro shows WHO the visitor will meet (block attribute `showHost`,
 * D-R85). An explicit boolean wins; unset is ON for `one-page`. The step-by-step flow has no
 * intro panel, so the answer there is always false. ONE rule for the widget and the inspector.
 *
 * @param {*}      value  The block attribute (boolean, or anything else for unset).
 * @param {string} layout The block layout.
 * @return {boolean} Show the host line.
 */
function showHostFor(value, layout) {
  if ('one-page' !== layout) {
    return false;
  }
  return 'boolean' === typeof value ? value : true;
}

/** Staff-step layouts (`booking.staff_layout`, block `staffLayout` — D-R52). */
const STAFF_LAYOUTS = ['list', 'cards'];

/** Staff-selection modes (`booking.staff_choice`; `required` added by D-R52). */
const STAFF_CHOICE_MODES = ['visitor', 'required', 'any'];

/** `booking.staff_label` ceiling — the server's own cap, restated as the second gate. */
const MAX_STAFF_LABEL = 40;

/**
 * What the widget assumes about the Staff step when the page says nothing (D-R52).
 *
 * `BlockRegistrar::config()` omits the `staff` block entirely without Premium `multi_staff` —
 * the step cannot exist there — so ABSENT is the normal case on most of the installed base and
 * must resolve to the shipped product default without any caller branching on undefined. These
 * six values ARE that default, and they are the same six the PHP schema defaults to, so a site
 * that never opens the panel behaves identically whichever side answers.
 *
 * `label: ''` means "use the translated default term" (`COPY.staff_term`) rather than an empty
 * word: Aponto serves salons, clinics, gyms and tutors, so no noun is hard-coded in the product
 * and the operator's own noun wins when they supply one (founder 2026-09-20).
 */
const STAFF_DEFAULTS = Object.freeze({
  layout: 'list',
  photos: true,
  titles: true,
  profiles: false,
  choice: 'visitor',
  label: ''
});

/**
 * Normalize the page-global `staff` block (D-R52).
 *
 * Presentation state, deliberately NOT part of the REST payload: the widget needs it before it
 * has a roster, and putting display settings into `/public/services` would make a cacheable
 * catalogue response carry them. Re-validated here for the same reason `fields.custom` and
 * `payments` are — the page-global is page data, and an unknown layout must never reach a
 * class name.
 *
 * The three DISCLOSURE flags (`photos`, `titles`, `profiles`) are layout hints only. The server
 * does not publish the field a switch turned off, so a tampered page-global can reveal nothing:
 * with `photos: true` forced on a site that turned photos off, every entry simply has no
 * `avatar` to draw.
 *
 * `label` is operator-authored text. It is capped, trimmed and then rendered as a TEXT NODE
 * through `sprintf` — never as markup — so a label containing `<b>` shows the angle brackets.
 *
 * @param {*} raw Raw `staff` value.
 * @return {{layout:string, photos:boolean, titles:boolean, profiles:boolean, choice:string, label:string}} Block.
 */
function normalizeStaffConfig(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const bool = (value, fallback) => typeof value === 'boolean' ? value : fallback;
  return {
    layout: STAFF_LAYOUTS.includes(s.layout) ? s.layout : STAFF_DEFAULTS.layout,
    photos: bool(s.photos, STAFF_DEFAULTS.photos),
    titles: bool(s.titles, STAFF_DEFAULTS.titles),
    profiles: bool(s.profiles, STAFF_DEFAULTS.profiles),
    choice: STAFF_CHOICE_MODES.includes(s.choice) ? s.choice : STAFF_DEFAULTS.choice,
    label: cappedText(s.label, MAX_STAFF_LABEL)
  };
}

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

/**
 * Normalize the `/public/services` staff roster (D-R50).
 *
 * Both keys are OMITTED by the server unless the feature is live (Premium `multi_staff` ∧
 * `booking.staff_choice` ∈ {`visitor`, `required`} ∧ ≥2 eligible active staff), so ABSENT is the
 * normal case
 * and must resolve to "no roster" without the callers branching on undefined. Everything here
 * is the second of two gates, same as `fields.custom`: the server validated it, and the
 * renderer must still never be handed an id it cannot name.
 *
 * D-R51 adds the optional PUBLIC PROFILE keys — `title` and `avatar` — which the server OMITS
 * when the operator left them empty. They are normalized defensively and independently: a
 * malformed one is dropped, never allowed to disqualify the row, because the id and the name
 * are the only things the step actually needs to work.
 *
 * `bio` is parsed the same way, and since D-R52 the server does send it — but ONLY behind the
 * site-wide "Let customers view staff profiles" opt-in, which defaults OFF, and only for a
 * staff member who actually filled one. A roster entry with no `bio` therefore gets no profile
 * trigger, which is exactly how switching the opt-in on avoids putting an empty "Learn more"
 * under a colleague who left the field blank.
 *
 * Name split (2026-10-01): an entry also carries `first_name` / `last_name` (under the same
 * D-R52 gates as `name`, so either may be absent). `name` stays the server-composed display
 * name; when a payload has only the parts, it is composed here with the shared rule.
 *
 * @param {*} raw Raw top-level `staff` value.
 * @return {Array<{id:number, name:string, first_name:string, last_name:string, title:string, bio:string, avatar:?{url:string, url2x:string}}>} Roster (possibly empty).
 */
function normalizeStaffRoster(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out = [];
  const seen = new Set();
  // NO length cap, deliberately (fix round 1): the server already decided who is eligible, and
  // silently dropping the tail would hide staff the contract says are bookable — on the
  // exact site that needs this feature most. Shape and type validation only.
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const id = toId(entry.id);
    const firstName = typeof entry.first_name === 'string' ? (0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_0__.normalizePart)(entry.first_name) : '';
    const lastName = typeof entry.last_name === 'string' ? (0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_0__.normalizePart)(entry.last_name) : '';
    const name = typeof entry.name === 'string' && entry.name !== '' ? entry.name : (0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_0__.displayName)(firstName, lastName);
    // A nameless staff member is not pickable: the whole surface is "name only", so a row
    // with nothing to read would be an anonymous button that changes the booking.
    if (id === null || name === '' || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push({
      id,
      name,
      first_name: firstName,
      last_name: lastName,
      title: cappedText(entry.title, MAX_STAFF_TITLE),
      bio: cappedText(entry.bio, MAX_STAFF_BIO),
      avatar: normalizeStaffAvatar(entry.avatar)
    });
  }
  return out;
}

/**
 * Normalize the server-resolved host / team payload of a one-page block (D-R85,
 * `BlockRegistrar` → `Frontend\HostLine`): `{members, total, others}`, or null.
 *
 * The SECOND gate, like every roster normalizer here: the server already decided who is public
 * and eligible, and this only refuses a malformed shape. Members carry no id — none is needed and
 * a Free site publishes none. A nameless member is dropped (an anonymous face says nothing),
 * `title` and `avatar` are the roster's own normalizers (the avatar URL test included), at most
 * three members are kept, and `total` can never be below the members actually present.
 *
 * @param {*} raw The `host` prop.
 * @return {?{members:Array<{name:string, first_name:string, last_name:string, title:string, avatar:?{url:string, url2x:string}}>, total:number, others:boolean}} Host.
 */
function normalizeHost(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.members)) {
    return null;
  }
  const members = [];
  for (const entry of raw.members) {
    if (!entry || typeof entry !== 'object' || members.length >= 3) {
      continue;
    }
    const firstName = typeof entry.first_name === 'string' ? (0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_0__.normalizePart)(entry.first_name) : '';
    const lastName = typeof entry.last_name === 'string' ? (0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_0__.normalizePart)(entry.last_name) : '';
    const name = typeof entry.name === 'string' && entry.name.trim() !== '' ? entry.name.trim() : (0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_0__.displayName)(firstName, lastName);
    if (name === '') {
      continue;
    }
    members.push({
      name,
      first_name: firstName,
      last_name: lastName,
      title: cappedText(entry.title, MAX_STAFF_TITLE),
      avatar: normalizeStaffAvatar(entry.avatar)
    });
  }
  if (!members.length) {
    return null;
  }
  const total = parseInt(raw.total, 10);
  return {
    members,
    total: Number.isInteger(total) && total > members.length ? total : members.length,
    // Hidden colleagues the any-staff path may assign (D-R85 fix round 2): a flag, never a
    // count — the sentence ends "or another team member" and no number moves for them.
    others: true === raw.others
  };
}

/**
 * Normalize the `/public/services` LOCATION roster (D-R62, contract §3.1 addendum 2026-09-23).
 *
 * Mirrors {@link normalizeStaffRoster} rule for rule, because it is the same kind of payload
 * behind the same kind of gate (Premium `multi_location` ∧ `booking.location_choice = visitor` ∧
 * ≥2 active locations serving ≥1 service): ABSENT is the normal Free and single-location answer
 * and resolves to `[]` without any caller branching on undefined; NO length cap (the server
 * decided what is bookable); a nameless entry is dropped, because a row with nothing to read
 * would be an anonymous button that changes the booking. `address` is the server's one-line
 * display string and may legitimately be `''` — the row then has one line, not an empty second.
 *
 * Text only: `name` and `address` are rendered as text nodes; `phone` (when present) reaches a
 * `tel:` href only through {@link telHref}.
 *
 * @param {*} raw Raw top-level `locations` value.
 * @return {Array<{id:number, name:string, address:string}>} Roster (possibly empty).
 */
function normalizeLocationRoster(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out = [];
  const seen = new Set();
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const id = toId(entry.id);
    const name = typeof entry.name === 'string' ? entry.name.trim() : '';
    if (id === null || name === '' || seen.has(id)) {
      continue;
    }
    seen.add(id);
    const row = {
      id,
      name,
      address: typeof entry.address === 'string' ? entry.address.trim() : ''
    };
    // The branch's public phone for the contact-help line — only when set, so a roster
    // from a server that sends none reads exactly as before. It reaches a `tel:` href only
    // through {@link telHref}, which keeps nothing but digits and a leading `+`.
    const phone = typeof entry.phone === 'string' ? entry.phone.trim() : '';
    if (phone) {
      row.phone = phone;
    }
    out.push(row);
  }
  return out;
}

/**
 * A `tel:` URL for a displayed phone number: digits only, plus one leading `+`. `''` when
 * fewer than 3 digits survive — the contact line then prints nothing (T-088).
 *
 * @param {string} phone Display phone.
 * @return {string} `tel:` URL or ''.
 */
function telHref(phone) {
  const raw = String(phone || '').trim();
  const digits = raw.replace(/\D+/g, '');
  if (digits.length < 3) {
    return '';
  }
  return 'tel:' + (raw.startsWith('+') ? '+' : '') + digits;
}

/**
 * Whether a typed phone number can be one (persona QA 2026-10-05, T-088) — the LOOSE rule the
 * server applies to `customer.phone` (`PublicBookingsController::phoneLooksValid()`): digits,
 * spaces and `+ ( ) - .` only, and at least five digits. Loose on purpose: no country format is
 * assumed, it only stops "abc" being stored as somebody's phone.
 *
 * @param {string} phone Typed phone.
 * @return {boolean} True when it reads as a phone number.
 */
function isPhoneLike(phone) {
  const raw = String(phone || '').trim();
  return /^[0-9+().\- ]+$/.test(raw) && raw.replace(/\D+/g, '').length >= 5;
}

/**
 * One service's eligible location ids, against the location roster (D-R62).
 *
 * Same rule as {@link normalizeStaffIds}: an id the roster does not name is DROPPED, since the
 * step can only render a name, and with no roster the answer is `[]` whatever the item says.
 *
 * @param {*}                              item   Raw service item (reads `location_ids`).
 * @param {Array<{id:number,name:string}>} roster Normalized location roster.
 * @return {number[]} Eligible location ids, in payload order.
 */
function normalizeServiceLocationIds(item, roster) {
  const raw = item && typeof item === 'object' ? item.location_ids : null;
  return normalizeStaffIds(raw, roster);
}

/**
 * One service's staff, PER LOCATION (D-R62): `{ <location id>: [staff ids] }`.
 *
 * Narrowing is per (service, location) pair, never per staff member — a stylist who does Cuts
 * Downtown and Color Uptown must not be offered for a Cut Uptown (rest-contract §3.1 addendum
 * 2026-09-23, "sửa lần 2"). The server sends `location_staff_ids` only while the location roster
 * is published, with a key for every location in the item's `location_ids`.
 *
 * Tolerant like every other roster key: absent or not an object ⇒ `{}` ("no per-location
 * answer", which callers read as "no narrowing" — see `eligibleStaffFor()`); a key that is not a
 * location the item is offered at is dropped; a list is cleaned exactly like `staff_ids`, so an
 * id the staff roster does not name never reaches a row.
 *
 * `staffRoster = null` returns the RAW numeric map instead (fix round 2): positive, de-duplicated
 * ids with no roster check, because the server publishes this map with the LOCATION roster even
 * when there is no `staff[]` to check against, and a block-preset staff id is looked up in it.
 *
 * @param {*}                               item        Raw service item.
 * @param {number[]}                        locationIds The item's normalized `location_ids`.
 * @param {?Array<{id:number,name:string}>} staffRoster Normalized staff roster, or null for raw.
 * @return {Object<string, number[]>} Staff ids per location id (possibly empty).
 */
function normalizeLocationStaffIds(item, locationIds, staffRoster) {
  const raw = item && typeof item === 'object' ? item.location_staff_ids : null;
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return out;
  }
  (locationIds || []).forEach(id => {
    const list = raw[String(id)];
    if (!Array.isArray(list)) {
      return;
    }
    out[id] = null === staffRoster ? list.map(toId).filter((v, i, all) => v !== null && all.indexOf(v) === i) : normalizeStaffIds(list, staffRoster);
  });
  return out;
}

/** `title` ceiling — the server's `varchar(191)` column width (D-R51). */
const MAX_STAFF_TITLE = 191;

/** `bio` ceiling — the server's product limit, restated here as the second gate (D-R51). */
const MAX_STAFF_BIO = 600;

/**
 * A trimmed, length-capped string, or `''` for anything that is not usable text.
 *
 * TRUNCATES rather than drops, unlike the server, and the asymmetry is deliberate: the server
 * refuses an over-long value so the operator can fix it, while the widget is the last stop
 * before a paint and has nobody to tell. A capped string still renders; a dropped one loses
 * information the operator meant to publish.
 *
 * @param {*}      value Raw value.
 * @param {number} max   Maximum length.
 * @return {string} Usable text.
 */
function cappedText(value, max) {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  // COUNT CODE POINTS, not UTF-16 code units (fix round 1, P3-1). The server counts characters
  // (`mb_strlen`/`mb_substr`), so `slice()` disagreed with it on any astral character — a
  // 40-emoji term became 20 — and, worse, could cut a surrogate pair in half and emit a lone
  // surrogate. The spread form is the cheap, correct one; the fast path keeps it free for the
  // BMP-only strings that are almost every value.
  if (trimmed.length <= max) {
    return trimmed;
  }
  return [...trimmed].slice(0, max).join('');
}

/**
 * Normalize one roster entry's `avatar` (D-R51).
 *
 * The URL test is the point of this function. A booking form renders it into `src`/`srcset`
 * of an `<img>`, so the accepted set is narrow ON PURPOSE: absolute `http(s)`, or a relative
 * path that resolves against the page's own origin. Everything else — `javascript:`, `data:`,
 * protocol-relative `//evil.example`, anything that fails to parse — is dropped and the row
 * falls back to initials. The payload is same-origin REST, so this can only ever fire on a
 * compromised or misconfigured server; it costs nothing and closes the one place a string from
 * the wire reaches a URL-bearing attribute.
 *
 * `url_2x` is optional on the wire only in the sense that it always equals `url` when the
 * library never generated the larger size; a missing or rejected one degrades to `url`, which
 * keeps `srcset` honest rather than pointing at nothing. Each URL is canonicalised
 * INDEPENDENTLY — never derived from the other — so one bad value can only ever be replaced by
 * a good one, not blended with it.
 *
 * @param {*} raw Raw `avatar` value.
 * @return {?{url:string, url2x:string}} Usable avatar, or null.
 */
function normalizeStaffAvatar(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const url = safeImageUrl(raw.url);
  if (!url) {
    return null;
  }
  return {
    url,
    url2x: safeImageUrl(raw.url_2x) || url
  };
}

/**
 * A URL safe to put in an `<img src>` **and in a `srcset` candidate list**: `http(s)`, or
 * same-origin after resolution, carrying no ASCII whitespace and no comma.
 *
 * **The whitespace/comma rejection is the srcset rule, and it is why this returns the CANONICAL
 * `parsed.href` rather than the caller's string.** `srcset` is a comma-separated list whose
 * candidates are `<url> <descriptor>`, so a single value containing `", "` is not one candidate
 * that happens to look odd — it is TWO candidates, and the browser may pick the second. A
 * roster URL reading `https://safe.example/a.jpg, https://tracker.example/x.jpg` would silently
 * add a third-party image request to every booking form. Returning the parsed `href` also means
 * what we validated is exactly what we emit: no leading `\t`, no stray space, no second reading
 * of the same string.
 *
 * @param {*} value Raw URL.
 * @return {string} The canonical URL, or '' when it is not usable.
 */
function safeImageUrl(value) {
  if (typeof value !== 'string' || value === '') {
    return '';
  }
  const raw = value.trim();
  // A protocol-relative URL resolves to the page's scheme but somebody ELSE's host, so it is
  // neither an absolute http(s) URL we verified nor a same-origin relative path.
  if (raw === '' || raw.startsWith('//')) {
    return '';
  }
  // ASCII whitespace (the HTML spec's set) or a comma anywhere: reject rather than escape.
  // A legitimate media URL has neither — WordPress percent-encodes both — so there is nothing
  // to lose, and "reject" cannot be got wrong the way "escape" can.
  if (/[\t\n\f\r ,]/.test(raw)) {
    return '';
  }
  const base = typeof window !== 'undefined' && window.location ? window.location.href : undefined;
  let parsed;
  try {
    parsed = new URL(raw, base);
  } catch (e) {
    return '';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return '';
  }
  // Re-check the CANONICAL form: `new URL()` percent-encodes some inputs but not all, and the
  // string that reaches the attribute is this one.
  if (/[\t\n\f\r ,]/.test(parsed.href)) {
    return '';
  }
  return parsed.href;
}

/**
 * Normalize one service's eligible-staff ids against the roster (D-R50).
 *
 * An id the roster does not name is DROPPED rather than kept as a bare number: the step can
 * only render a name, so an unnameable id would either be invisible (and silently narrow the
 * customer's choice) or render blank. Dropping it degrades to "fewer staff offered",
 * which the any-staff assignment still covers.
 *
 * @param {*}                              raw    Raw `staff_ids` value.
 * @param {Array<{id:number,name:string}>} roster Normalized roster.
 * @return {number[]} Eligible ids, in payload order.
 */
function normalizeStaffIds(raw, roster) {
  if (!Array.isArray(raw) || !roster.length) {
    return [];
  }
  const known = new Set(roster.map(s => s.id));
  const out = [];
  const seen = new Set();
  for (const value of raw) {
    const id = toId(value);
    if (id === null || seen.has(id) || !known.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(id);
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
    gateways,
    // D-R79: a PAID service cannot be booked online right now (server-decided, opt-in).
    paidUnavailable: true === p.paid_unavailable
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
    // The site's WordPress time format (a PHP `date()` pattern), read by `tz.js` for the
    // 12 h / 24 h choice only (T-071). '' — an older page — leaves the locale to decide.
    timeFormat: typeof business.time_format === 'string' ? business.time_format : '',
    business: {
      timezone: business.timezone ? String(business.timezone) : 'UTC',
      // `booking.timezone_mode` (D-R48). Narrowed here, not in `tz.js`, for the
      // same reason every other key on this object is: whatever the page hands
      // the widget is untrusted input. An unknown value reads as `visitor`,
      // which is the pre-D-R48 behaviour.
      timezone_mode: TIMEZONE_MODES.includes(business.timezone_mode) ? business.timezone_mode : 'visitor',
      name: business.name ? String(business.name) : '',
      // Public business phone for the summary's contact-help line; '' = print nothing.
      phone: business.phone ? String(business.phone).trim() : ''
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
    payments: normalizePayments(g.payments),
    coupons: {
      enabled: !!(g.coupons && typeof g.coupons === 'object' && g.coupons.enabled)
    },
    // Always present, always safe to read: a page with no `staff` block — Free, and every
    // page of a Premium site before this release — resolves to the shipped defaults (D-R52).
    staff: normalizeStaffConfig(g.staff)
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
  // The ONE per-block staff override (D-R52): layout. A valid `staffLayout` prop beats the
  // site setting; anything else — absent, empty, unknown — inherits, which is what every block
  // saved before this attribute existed means. Merged into the resolved `staff` object rather
  // than kept beside it, so every consumer reads one place and cannot forget the precedence.
  const staff = global.staff || normalizeStaffConfig(null);
  const blockLayout = STAFF_LAYOUTS.includes(p.staffLayout) ? p.staffLayout : '';
  const layout = LAYOUTS.includes(p.layout) ? p.layout : 'default';
  return Object.assign({}, global, {
    staff: blockLayout ? Object.assign({}, staff, {
      layout: blockLayout
    }) : staff,
    serviceId: toId(p.serviceId),
    staffId: toId(p.staffId),
    // Block preset location (D-R62): pins the booking to one place and removes the step.
    locationId: toId(p.locationId),
    // Allow-listed like every other prop (D-R80): anything unknown is the wizard.
    layout,
    preselectDate: preselectDateFor(p.preselectDate, layout),
    // The one-page host / team line (D-R85): the block's switch, and the people the SERVER
    // resolved for it (absent whenever the switch is off or nobody is publishable).
    showHost: showHostFor(p.showHost, layout),
    host: showHostFor(p.showHost, layout) ? normalizeHost(p.host) : null,
    // Untrusted like every other prop: anything unknown reads as the default.
    summaryMode: SUMMARY_MODES.includes(p.summaryMode) ? p.summaryMode : 'always',
    stepDisplay: STEP_DISPLAYS.includes(p.stepDisplay) ? p.stepDisplay : 'horizontal',
    // The "Questions? Call …" line (founder review 2026-09-30): on unless the block says
    // `false`; an optional heading override, trimmed and capped like the server does.
    contactHelp: false !== p.contactHelp,
    contactText: typeof p.contactText === 'string' ? p.contactText.trim().slice(0, 80) : '',
    // The meeting-method line (D-R82). Allow-listed type; PLAIN text — tags stripped,
    // trimmed and capped like the server does — rendered as a text node, never as markup.
    meetingType: MEETING_TYPES.includes(p.meetingType) ? p.meetingType : '',
    meetingText: typeof p.meetingText === 'string' ? p.meetingText.replace(/<[^>]*>/g, '').trim().slice(0, MAX_MEETING_TEXT) : '',
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
  amount_paid: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Amount paid', 'aponto'),
  deposit_due: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Deposit due now', 'aponto'),
  deposit_paid: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Deposit paid', 'aponto'),
  balance_onsite: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Balance on site', 'aponto'),
  balance_due: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Balance due', 'aponto'),
  deposit_cancel_note: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('The deposit is not refunded automatically if you cancel.', 'aponto'),
  terms_changed: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Your payment terms have changed. Review the amounts before paying.', 'aponto'),
  // Step headings + subs.
  service_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Choose a service', 'aponto'),
  // Three subs because the step's controls are data-driven: the sub must never
  // promise a category browser or a search field that this catalogue does not
  // render (mockup `index.html` category catalogue vs. its no-category fallback).
  service_sub: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Browse a category or search by name.', 'aponto'),
  service_sub_search: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Search or browse all available services.', 'aponto'),
  service_sub_plain: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Pick the service you’d like to book.', 'aponto'),
  // Staff step (D-R50; re-worded by D-R52). Only ever rendered when the chosen service has more
  // than one eligible staff member, so the copy can assume there is a real choice to make.
  //
  // **No noun is hard-coded.** Aponto serves salons, clinics, gyms and tutors, so the product
  // ships a NEUTRAL default term and the operator may replace it with their own word
  // (`booking.staff_label` — "stylist", "doctor", "trainer"…). Every template below is written
  // WITHOUT an article so it reads correctly for any noun and translates cleanly.
  staff_term: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('staff member', 'aponto'),
  /* translators: %s: what this business calls its staff, e.g. "stylist" or "staff member". */
  staff_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Choose your %s', 'aponto'),
  staff_sub: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Pick who you’d like to see, or let us find the first available.', 'aponto'),
  // `booking.staff_choice = required` (D-R52): there is no "Any available" row, so the sub must
  // not offer an escape hatch the step does not have.
  staff_sub_required: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Pick who you’d like to see.', 'aponto'),
  staff_any: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Any available', 'aponto'),
  /* translators: %s: what this business calls its staff, e.g. "stylist" or "staff member". */
  staff_any_sub: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('We’ll book you with the first available %s.', 'aponto'),
  // The card layout has ~190px for this line and truncates it to one line, so the banner sub
  // is the short form of the same sentence rather than an ellipsised long one.
  /* translators: %s: what this business calls its staff, e.g. "stylist" or "staff member". */
  staff_any_sub_short: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('First available %s', 'aponto'),
  // Profile disclosure (D-R52). The trigger's accessible name always carries the person's
  // name, because at 12 people a list of identical "Learn more" buttons is unnavigable; the
  // visible label is the short one and is hidden on narrow rows and in cards.
  staff_learn_more: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Learn more', 'aponto'),
  /* translators: %s: staff member name. */
  staff_about: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('About %s', 'aponto'),
  staff_profile_close: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Close profile', 'aponto'),
  // Stale-form recovery (fix round 1): the site switched to "Customers must choose" while this
  // visitor had the form open, so the server refused their "Any available" booking. Says what
  // to do, not what went wrong — the change is the business's, not the customer's mistake.
  /* translators: %s: what this business calls its staff, e.g. "stylist" or "staff member". */
  toast_staff_required_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Choose your %s', 'aponto'),
  toast_staff_required_body: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('This booking form was updated while you were filling it in. Please pick who you’d like to see.', 'aponto'),
  /* translators: %s: staff member first name. */
  staff_book_with: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Book with %s', 'aponto'),
  // Location step (D-R62, v4 mockup `locationHTML()`). Only rendered when the chosen service is
  // offered at two or more places, and there is deliberately no "Any location" row (D-R60):
  // assigning a place to a customer is a surprise, not a convenience.
  location_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Choose a location', 'aponto'),
  // Neutral on purpose: no "be seen", no "visit" — a gym, a tutor and a clinic all read it.
  location_sub: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Pick the location for your appointment.', 'aponto'),
  // Stale-form recovery (D-R62, the D-R52 `staff_id` shape): the site started asking for a
  // location — or the one chosen stopped serving this service — while the form was open. The
  // toast's title is `location_title`.
  // …and the same recovery when there is NO question left to ask (one branch remains, assigned
  // without asking): the customer is sent back to confirm a time, so this says only that.
  toast_form_updated_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('This booking form was updated', 'aponto'),
  toast_form_updated_body: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Something changed while you were filling it in. Please choose your time again.', 'aponto'),
  toast_location_body: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('This booking form was updated while you were filling it in. Please pick the location for your appointment.', 'aponto'),
  datetime_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Pick a date & time', 'aponto'),
  details_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Your details', 'aponto'),
  details_sub: '',
  payment_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Payment method', 'aponto'),
  payment_sub: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Choose how you would like to pay.', 'aponto'),
  // Macro progress (D-R53, horizontal step display). SHORT labels: six of them share one row,
  // and below a 440px content column only the numbered circles are drawn — the words stay in
  // the DOM, visually hidden, so a screen reader still gets them.
  progress_label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Booking progress', 'aponto'),
  step_service: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Service', 'aponto'),
  /* translators: short label of the booking step where the customer picks a place (D-R62). */
  step_location: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Location', 'aponto'),
  // The neutral FALLBACK only: a site that set its own word for a staff member gets that word,
  // capitalised, because the step heading two lines below already uses it (D-R52).
  step_staff: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Staff', 'aponto'),
  step_datetime: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Time', 'aponto'),
  step_details: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Details', 'aponto'),
  step_payment: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Payment', 'aponto'),
  step_confirmation: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Confirm', 'aponto'),
  // Progress.
  /* translators: 1: current step, 2: total steps. */
  step_of: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Step %1$d of %2$d', 'aponto'),
  // Service step.
  search_placeholder: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Search all services…', 'aponto'),
  all_services: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('All services', 'aponto'),
  all_categories: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('All categories', 'aponto'),
  /* translators: %s: formatted starting price, e.g. "$40". */
  from_price: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('from %s', 'aponto'),
  // A service priced exactly 0 (D-R81), wherever the form prints its price. Its own context:
  // the admin's bare "Free" names the EDITION, and the two translate differently.
  price_free: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__._x)('Free', 'price of a service that costs nothing', 'aponto'),
  /* translators: %d: number of services in a category. */
  services_count: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('%d services', 'aponto'),
  service_count_one: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('1 service', 'aponto'),
  no_services: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('No services are available for online booking right now.', 'aponto'),
  no_services_sub: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Please check back soon or contact us.', 'aponto'),
  /* translators: %s: the text the visitor typed into the service search. */
  no_matches: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('No services match “%s”.', 'aponto'),
  change_service: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Change service', 'aponto'),
  // D-R79: a paid service while online payment is required and no payment method is ready.
  paid_unavailable_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Online booking for this service is temporarily unavailable.', 'aponto'),
  paid_unavailable_body: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Please contact us.', 'aponto'),
  // Date & time.
  prev_month: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Previous month', 'aponto'),
  next_month: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Next month', 'aponto'),
  available_times: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Available times', 'aponto'),
  /* translators: %s: the picked day, e.g. "October 9" (shown in the accent colour). */
  slots_for_day: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Pick a slot for %s', 'aponto'),
  /* translators: %d: number of open start times on the picked day. */
  slots_open: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('%d open', 'aponto'),
  // A time this visitor already holds at an external checkout (D-R71w): shown, not bookable.
  slot_in_cart: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('In your cart', 'aponto'),
  /* translators: %s: date and time of an appointment the visitor already holds, e.g. "Oct 8, 3:00 PM". */
  slot_in_cart_at: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('In your cart: %s', 'aponto'),
  // "Checkout in progress" notice above the form (D-R71w).
  /* translators: %s: what is waiting, e.g. "Full colour · Oct 8, 3:00 PM". */
  checkout_waiting: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('You have a booking waiting at checkout: %s', 'aponto'),
  /* translators: %d: number of bookings waiting at checkout (2 or more). */
  checkout_waiting_many: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('You have %d bookings waiting at checkout.', 'aponto'),
  checkout_resume: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Resume checkout', 'aponto'),
  checkout_change: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Change it', 'aponto'),
  checkout_change_hint: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Booking a new time replaces it and frees that time.', 'aponto'),
  checkout_add_another: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Add another appointment', 'aponto'),
  // D-R64 item 4: said (screen readers) when the calendar moved on its own past empty months.
  /* translators: %s: a month and year, e.g. "October 2026". */
  month_advanced: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Showing %s — the first month with available times.', 'aponto'),
  /* translators: %s: the selected day, e.g. "Monday, 3 August". */
  no_slots_day: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('No open times on %s — try another day.', 'aponto'),
  // A whole month with nothing to book — and, for a service nobody can perform yet, every
  // month (persona QA 2026-10-05, T-073): a fully greyed calendar with no words is a dead end.
  no_slots_month: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('No times are available this month. Try another month, or contact us.', 'aponto'),
  // The end of a booking that runs past midnight in the zone on screen (T-058).
  /* translators: %s: an end time that falls on the day after the start, e.g. "1:00 AM". */
  time_next_day: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('%s (+1 day)', 'aponto'),
  times_shown_in: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Times shown in', 'aponto'),
  // The SSA-style note: shown ONLY when the site is displaying a clock that is
  // not the visitor's own (D-R48). %s is already a "City (GMT±N)" label.
  /* translators: %s: a timezone label, e.g. "Ho Chi Minh (GMT+7)". */
  times_shown_in_tz: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Times shown in %s', 'aponto'),
  visitor_tz_label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Your timezone', 'aponto'),
  // The picker affordance that replaced the raw zone <select> (D-R48): a text
  // button beside the display-zone label, opening a searchable dialog.
  change_timezone: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Change', 'aponto'),
  // The visible text stays the bare "Change"; the accessible name has to say
  // WHAT changes and what it is now, because a screen-reader user meets this
  // button out of its visual context beside the zone label (Codex review 3).
  /* translators: %s: the current timezone label, e.g. "Ho Chi Minh (GMT+7)". */
  change_timezone_a11y: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Change timezone, currently %s', 'aponto'),
  tz_dialog_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Choose a timezone', 'aponto'),
  tz_search_label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Search timezones', 'aponto'),
  tz_search_placeholder: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Search a city…', 'aponto'),
  tz_suggested: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Suggested', 'aponto'),
  tz_search_hint: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Type a city to see every timezone.', 'aponto'),
  /* translators: %s: the text the visitor typed into the timezone search. */
  tz_no_matches: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('No timezone matches “%s”.', 'aponto'),
  /* translators: %d: how many timezones the list is currently showing. */
  tz_count: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('%d timezones', 'aponto'),
  tz_count_one: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('1 timezone', 'aponto'),
  tz_close: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Close', 'aponto'),
  // %2$s is already a "City (GMT±N)" label, so it carries its own parentheses —
  // join with a middot like the Summary's business-time line instead of wrapping it in
  // a second set of parens ("…business (Berlin (GMT+2))").
  //
  // **No business noun** (D-R52 rule; persona QA 2026-10-05, T-059): this said "at the
  // studio" to the customers of a salon and of a clinic. "The business" is the neutral term
  // the form already uses ("Notes for the business"), needs no setting, and is the SAME
  // wording as the summary label below, the mails and the manage page.
  /* translators: 1: time at the business — with its date when that differs from the customer's, e.g. "5:30 PM" or "Fri, Oct 30, 5:30 PM"; 2: the business time-zone label. */
  business_time_line: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('That’s %1$s local time at the business · %2$s', 'aponto'),
  refreshed: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('(refreshed)', 'aponto'),
  // Details.
  // Name split (2026-10-01): two inputs, autocomplete given-name / family-name. The
  // placeholders are sample names, not instructions — translate them to names that read as
  // ordinary in your locale.
  first_name_label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('First name', 'aponto'),
  last_name_label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Last name', 'aponto'),
  /* translators: Placeholder for the first-name input — a sample given name. */
  first_name_placeholder: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Jordan', 'aponto'),
  /* translators: Placeholder for the last-name input — a sample family name. */
  last_name_placeholder: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Reyes', 'aponto'),
  email_label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Email', 'aponto'),
  email_placeholder: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('you@example.com', 'aponto'),
  phone_label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Phone', 'aponto'),
  phone_optional: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('(optional)', 'aponto'),
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
  err_first_name_required: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Please enter your first name.', 'aponto'),
  err_last_name_required: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Please enter your last name.', 'aponto'),
  err_email_required: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Please enter your email.', 'aponto'),
  err_email_invalid: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Please enter a valid email address.', 'aponto'),
  err_phone_required: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Please enter a phone number.', 'aponto'),
  err_phone_invalid: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('That phone number doesn’t look right.', 'aponto'),
  // The consent text is the operator's own (privacy, terms, both…), so the error names the
  // ACTION, not a document it may not mention (QA D17 / persona QA T-103, 2026-10-05).
  err_consent_required: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Please tick the box to continue.', 'aponto'),
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
  /* translators: label before the same appointment time in the business's own timezone. No business noun (salon, clinic, studio…) — see business_time_line. */
  summary_business_time: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Local time at the business', 'aponto'),
  // The sidebar before anything is picked (D-R49; v4 compact screen copy).
  summary_empty_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Start with a service', 'aponto'),
  // Foot of the summary (founder review 2026-09-30).
  contact_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Questions?', 'aponto'),
  /* translators: %s: the business phone number, rendered as a tap-to-call link. */
  contact_call: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Call %s for help', 'aponto'),
  summary_empty_text: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Your appointment details and total will appear here.', 'aponto'),
  /* translators: label before the name of the chosen staff member, e.g. "With: Ana". */
  summary_with: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('With', 'aponto'),
  /* translators: label before the name of the booked location, e.g. "Where: Downtown". */
  summary_where: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Where', 'aponto'),
  /* translators: a labelled summary line. 1: the label, e.g. "With" or "Where"; 2: the value, e.g. a staff member's or a location's name. */
  summary_line: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('%1$s: %2$s', 'aponto'),
  // One-page intro panel (D-R80): spoken labels of its icon rows, and the narrow-form toggle
  // that reveals the service description.
  /* translators: label before the service duration, e.g. "Duration: 30 min". */
  summary_duration: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Duration', 'aponto'),
  /* translators: label before the service price, e.g. "Price: $40.00". */
  summary_price: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Price', 'aponto'),
  /* translators: spoken label before the chosen appointment time, e.g. "Your time: Mon, Oct 5". */
  summary_time: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Your time', 'aponto'),
  // Intro panel link back to the calendar from Details / Payment (D-R80).
  change_time: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Change time', 'aponto'),
  intro_more: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Show details', 'aponto'),
  // The one-page intro's team line (D-R85). %s is a localized "A, B or C" list.
  /* translators: %s: a list of first names joined with "or", e.g. "Maya, Daniel or Priya". */
  host_meet: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('You’ll meet %s', 'aponto'),
  // The last item of that list when the team is larger than the names shown.
  host_another: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('another team member', 'aponto'),
  /* translators: %d: how many more team members are not pictured. */
  host_more: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('+%d', 'aponto'),
  // The intro's meeting-method line (D-R82): spoken label, then the default line per type.
  /* translators: spoken label before how the appointment takes place, e.g. "Meeting method: Phone call". */
  meeting_label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Meeting method', 'aponto'),
  meeting_in_person: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('In person', 'aponto'),
  meeting_phone: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Phone call', 'aponto'),
  meeting_online: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Online meeting', 'aponto'),
  intro_less: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Hide details', 'aponto'),
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
  // D-R54: a 429 on a LOAD, not on a submit attempt — "Too many attempts" would be describing
  // something the visitor did not do. The body reuses `rate_limited_body` when the server sent
  // a `Retry-After`, and falls back to this when it did not.
  rate_limited_load_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Too many requests.', 'aponto'),
  rate_limited_wait: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Please wait a moment and try again.', 'aponto'),
  // Confirmation.
  confirm_pending_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Booking received', 'aponto'),
  confirm_pending_lead: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('We’ll email you the moment it’s confirmed.', 'aponto'),
  confirm_confirmed_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Appointment confirmed', 'aponto'),
  confirm_manage_hint: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Check your email — we’ve sent a link to manage this booking.', 'aponto'),
  order_label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('ORDER', 'aponto'),
  // The same badge on a booking with nothing to pay (persona QA 2026-10-05, T-100): a free
  // consultation is not an "order".
  booking_label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('BOOKING', 'aponto'),
  add_to_calendar: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Add to calendar', 'aponto'),
  cal_google: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Google', 'aponto'),
  cal_ics: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('.ics', 'aponto'),
  print: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Print', 'aponto'),
  book_another: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Book another appointment', 'aponto'),
  // A one-page block whose pinned service the catalogue no longer lists (QA D01, 2026-10-05):
  // never another service in its place.
  unavailable_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('This service is no longer available', 'aponto'),
  unavailable_lead: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('It may have been paused or replaced.', 'aponto'),
  /* translators: %s: the business phone number, rendered as a tap-to-call link. */
  unavailable_call: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Call %s and we’ll help you book the right thing.', 'aponto'),
  // Inline, persistent notice on Date & time after a slot was taken (QA D14).
  slot_taken_inline: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('The time you chose was just taken. Pick another one below.', 'aponto'),
  replay_title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Booking received', 'aponto'),
  replay_lead: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('This appointment is already on file.', 'aponto'),
  replay_body: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Your manage link was already emailed to you. Check your inbox to view or change this booking.', 'aponto')
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

/***/ "./assets/src/form/lib/coupons.free.js"
/*!*********************************************!*\
  !*** ./assets/src/form/lib/coupons.free.js ***!
  \*********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   formCouponCss: () => (/* binding */ formCouponCss),
/* harmony export */   useFormCoupon: () => (/* binding */ useFormCoupon)
/* harmony export */ });
/**
 * Booking-form order adjustments owned by the Free edition: none.
 *
 * Selected at build time through the `@aponto/form-coupons` alias
 * (webpack.config.js). The Premium module under `assets/src/pro/` supplies the
 * real implementation; `assets/src/form/**` ships in the wp.org ZIP, so this
 * file must stay a neutral no-op (D-R41: the Free zip carries no paid
 * implementation).
 */

/** Extra shadow-root CSS the Free build needs: nothing. */
const formCouponCss = '';
const NONE = Object.freeze({
  active: false,
  quote: null,
  draftCode: '',
  totalMinor: null,
  fieldKey: '',
  validate: () => '',
  reset: () => {},
  handleBookingError: () => '',
  renderField: () => null,
  renderSummaryRows: () => null
});

/**
 * The widget's order-adjustment state. Free has none, so every call answers the
 * same inert object (no hooks are called, so the rules of hooks hold trivially).
 *
 * @return {Object} Inert adjustment state.
 */
function useFormCoupon() {
  return NONE;
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
/* harmony export */   formatMoney: () => (/* binding */ formatMoney),
/* harmony export */   formatPrice: () => (/* binding */ formatPrice),
/* harmony export */   isFreePrice: () => (/* binding */ isFreePrice)
/* harmony export */ });
/* harmony import */ var _copy_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./copy.js */ "./assets/src/form/lib/copy.js");
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
 * Whether a SERVICE price is exactly zero — a free service, as opposed to an unpriced one
 * (`null`, which prints nothing).
 *
 * @param {?number} minor Minor units, or null.
 * @return {boolean} Free.
 */
function isFreePrice(minor) {
  return minor !== null && minor !== undefined && minor !== '' && Number(minor) === 0;
}

/**
 * The customer-facing label of a SERVICE price (D-R81, founder 2026-10-03): the translated
 * "Free" for exactly 0, nothing for an unpriced service, the formatted amount otherwise. The ONE
 * place every service-price surface of the form goes through — Service step rows and category
 * "from" lines, the summary / intro meta line — so a free booking
 * never reads "$0.00" on one of them and "Free" on another. Order TOTALS keep
 * {@link formatMoney}: a coupon that brings a positive price to 0 is arithmetic and shows its
 * sum.
 *
 * @param {?number} minor      Minor units, or null.
 * @param {string}  currency   ISO-4217 code.
 * @param {string}  [locale]   Locale.
 * @param {?number} [exponent] Server exponent.
 * @return {string} Label or ''.
 */
function formatPrice(minor, currency, locale, exponent) {
  return isFreePrice(minor) ? _copy_js__WEBPACK_IMPORTED_MODULE_0__.COPY.price_free : formatMoney(minor, currency, locale, exponent);
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
/* harmony export */   readContact: () => (/* binding */ readContact),
/* harmony export */   readHold: () => (/* binding */ readHold),
/* harmony export */   readResume: () => (/* binding */ readResume),
/* harmony export */   readReturn: () => (/* binding */ readReturn),
/* harmony export */   storeContact: () => (/* binding */ storeContact),
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
 * A FOURTH, separate entry exists only while a gateway hands the visitor to a
 * checkout of its own (D-R71w): the four identity fields they typed, under
 * {@link CONTACT_KEY}, so a browser Back from that checkout — or a second booking
 * into the same cart — does not make them type their name again. It is the
 * visitor's own input in the visitor's own tab; it is never part of a hold entry
 * (those still carry no name, email or phone), and it holds no token, no note
 * and no answer to a custom field, which may be health or intake data.
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

/** Storage key of the visitor's own identity fields (D-R71w). One entry per tab. */
const CONTACT_KEY = 'aponto:contact';

/**
 * EXACTLY what may be remembered of the Details step, and nothing else: not the
 * note, not a custom-field answer, not consent — and never a token.
 */
const CONTACT_KEYS = ['first_name', 'last_name', 'email', 'phone'];

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
 * The whitelisted identity fields of a details object, as short trimmed strings.
 *
 * @param {*} source Candidate details.
 * @return {Object} `{first_name, last_name, email, phone}`, each possibly ''.
 */
function contactOf(source) {
  const out = {};
  CONTACT_KEYS.forEach(key => {
    const value = source && typeof source === 'object' ? source[key] : '';
    out[key] = typeof value === 'string' ? value.trim().slice(0, 200) : '';
  });
  return out;
}

/**
 * Remember the visitor's identity fields for this tab (D-R71w), whitelisted.
 *
 * Reduced to {@link CONTACT_KEYS} HERE, so a caller that hands over the whole
 * details object still stores no note. All four empty removes the entry.
 *
 * @param {Object}  details   Details-step values; unknown keys are dropped.
 * @param {Storage} [storage] Injected storage (tests).
 */
function storeContact(details, storage) {
  const s = store(storage);
  if (!s) {
    return;
  }
  const safe = contactOf(details);
  try {
    if (CONTACT_KEYS.some(key => safe[key])) {
      s.setItem(CONTACT_KEY, JSON.stringify(safe));
    } else {
      s.removeItem(CONTACT_KEY);
    }
  } catch {
    // Quota or private mode — the visitor types their name again, as before.
  }
}

/**
 * The identity fields remembered for this tab, or null when there are none.
 *
 * @param {Storage} [storage] Injected storage (tests).
 * @return {?Object} `{first_name, last_name, email, phone}` or null.
 */
function readContact(storage) {
  const s = store(storage);
  if (!s) {
    return null;
  }
  try {
    const safe = contactOf(JSON.parse(s.getItem(CONTACT_KEY) || 'null'));
    return CONTACT_KEYS.some(key => safe[key]) ? safe : null;
  } catch {
    return null;
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

/***/ },

/***/ "./assets/src/form/lib/payment-choice.free.js"
/*!****************************************************!*\
  !*** ./assets/src/form/lib/payment-choice.free.js ***!
  \****************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   usePaymentChoice: () => (/* binding */ usePaymentChoice)
/* harmony export */ });
/** Edition-neutral seam: Free offers no customer payment-amount choice. */
function usePaymentChoice() {
  return {
    reset: () => {},
    terms: null,
    amountMode: '',
    render: () => null
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
/* harmony export */   directCheckout: () => (/* binding */ directCheckout),
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

/** Free has no checkout that collects booking identity externally. */
function directCheckout() {
  return null;
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

/***/ "./assets/src/form/lib/payments/precheck.js"
/*!**************************************************!*\
  !*** ./assets/src/form/lib/payments/precheck.js ***!
  \**************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   gatewayPrecheck: () => (/* binding */ gatewayPrecheck),
/* harmony export */   publicRefusal: () => (/* binding */ publicRefusal)
/* harmony export */ });
/* harmony import */ var _errors_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../errors.js */ "./assets/src/form/lib/errors.js");
/**
 * A gateway's own readiness check, asked BEFORE anything is reserved.
 *
 * A gateway may publish `precheck_url` in its public client config when its
 * checkout can refuse for a reason the widget cannot see (the visitor's cart on
 * an external checkout, say). Asking first means a refusal costs the visitor
 * nothing: no booking, no hold. The widget knows only the verb — the URL and
 * the sentence both come from the gateway's server.
 *
 * FAIL OPEN: a check that cannot be asked (no URL, a foreign origin, a network
 * error, an answer in an unknown shape) resolves `null`, because the gateway's
 * own handoff still enforces the same rule. Only an explicit refusal with a
 * sentence the visitor can act on stops the flow.
 *
 * ONE EXCEPTION — a rate limit BLOCKS. `429 aponto_rate_limited` is thrown as an
 * `ApiError` with its retry-after, so the caller shows the standard "too many
 * attempts" state and reserves nothing: going on would take a hold whose
 * handoff the same visitor may then be refused.
 */

const TIMEOUT_MS = 10000;

/**
 * The refusal sentence when it is safe to render as text, else ''.
 *
 * @param {*} message Candidate server message.
 * @return {string} Trimmed message or ''.
 */
function publicRefusal(message) {
  return typeof message === 'string' && message.trim() && message.length <= 1000 && !/[<>]/.test(message) ? message.trim() : '';
}

/**
 * Ask one gateway whether a checkout can start for this visitor.
 *
 * @param {?Object} gateway      Offered gateway `{code, client}`.
 * @param {Object}  [opts]       Options.
 * @param {string}  [opts.nonce] REST nonce, forwarded so a signed-in visitor stays signed in.
 * @param {Window}  [opts.win]   Window (injected for tests).
 * @return {Promise<?string>} The refusal sentence, or null when nothing refuses.
 * @throws {ApiError} `aponto_rate_limited`, with `retryAfter` seconds.
 */
async function gatewayPrecheck(gateway, opts = {}) {
  const win = opts.win || (typeof window !== 'undefined' ? window : null);
  const raw = gateway && gateway.client && gateway.client.precheck_url;
  if (!win || typeof raw !== 'string' || !raw) {
    return null;
  }
  let timer;
  let limited = null;
  let refusal = null;
  try {
    const url = new URL(raw, win.location.href);
    if (!['https:', 'http:'].includes(url.protocol) || url.origin !== new URL(win.location.href).origin || url.username || url.password) {
      return null;
    }
    const controller = new AbortController();
    timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const response = await win.fetch(url.href, {
      method: 'POST',
      credentials: 'same-origin',
      redirect: 'error',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(opts.nonce ? {
          'X-WP-Nonce': opts.nonce
        } : {})
      },
      body: '{}'
    });
    if (!response.ok) {
      const failure = await response.json();
      if (failure && failure.code === 'aponto_rate_limited') {
        limited = new _errors_js__WEBPACK_IMPORTED_MODULE_0__.ApiError({
          code: failure.code,
          status: response.status,
          retryAfter: Number(response.headers && response.headers.get && response.headers.get('Retry-After') || failure.data && failure.data.retry_after || 0)
        });
      } else if (failure && failure.code === 'aponto_payment_state') {
        refusal = publicRefusal(failure.message) || null;
      }
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
  if (limited) {
    throw limited;
  }
  return refusal;
}

/***/ },

/***/ "./assets/src/form/lib/payments/session.js"
/*!*************************************************!*\
  !*** ./assets/src/form/lib/payments/session.js ***!
  \*************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   gatewaySession: () => (/* binding */ gatewaySession),
/* harmony export */   normalizeSession: () => (/* binding */ normalizeSession),
/* harmony export */   sessionGateway: () => (/* binding */ sessionGateway)
/* harmony export */ });
/**
 * What an external checkout is already holding for THIS visitor (D-R71w).
 *
 * A gateway that takes the visitor to a checkout of its own may publish
 * `session_url` in its public client config. The widget then asks it — on load
 * and when the page comes back from the back/forward cache — what that checkout
 * holds for the current visitor: bookings still waiting to be paid, where to
 * resume, and the contact details already given there. With it the widget can
 * say "you have a booking waiting at checkout" instead of silently starting
 * over, mark the visitor's own held time, and refill the identity fields.
 *
 * The widget knows only the verb. The URL comes from the gateway's server, the
 * answer is bound to the visitor's own session there, and the request carries
 * NOTHING: no ids, no token, an empty body.
 *
 * `session_cookie`, when published, names a script-readable cookie whose
 * absence means that checkout has nothing for this visitor: the question is
 * then not asked at all, so an ordinary page view costs no request.
 *
 * FAIL QUIET: no URL, a foreign origin, a network error, a refusal or an answer
 * in an unknown shape all resolve `null`. Nothing here is needed to book.
 */

const TIMEOUT_MS = 10000;

/** Most holds one answer may carry; the rest are ignored. */
const MAX_ATTEMPTS = 10;

/**
 * A short plain string, or ''.
 *
 * @param {*} value Candidate.
 * @return {string} Trimmed text.
 */
function text(value) {
  return typeof value === 'string' && value.length <= 200 && !/[<>]/.test(value) ? value.trim() : '';
}

/**
 * An instant as the ISO string the widget compares slots by, or ''.
 *
 * @param {*} value Candidate ISO instant.
 * @return {string} Normalised instant.
 */
function instant(value) {
  const time = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? new Date(time).toISOString() : '';
}

/**
 * A same-origin http(s) URL, or ''.
 *
 * @param {*}      value Candidate URL.
 * @param {string} base  Page URL.
 * @return {string} Absolute URL.
 */
function sameOrigin(value, base) {
  try {
    if (typeof value !== 'string' || !value) {
      return '';
    }
    const url = new URL(value, base);
    return ['https:', 'http:'].includes(url.protocol) && url.origin === new URL(base).origin && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}

/**
 * The offered gateway that can answer for the visitor's checkout, or null.
 *
 * @param {Array.<Object>} gateways Offered gateways `{code, client}`.
 * @return {?Object} Gateway.
 */
function sessionGateway(gateways) {
  return (gateways || []).find(gateway => gateway && gateway.client && typeof gateway.client.session_url === 'string' && gateway.client.session_url) || null;
}

/**
 * Reduce a server answer to the fields the widget uses, each one re-checked.
 *
 * @param {*}      body Parsed answer.
 * @param {string} base Page URL.
 * @return {?Object} `{attempts, resumeUrl, multiple, contact}` or null.
 */
function normalizeSession(body, base) {
  if (!body || typeof body !== 'object' || !Array.isArray(body.attempts)) {
    return null;
  }
  const contact = body.contact && typeof body.contact === 'object' ? body.contact : {};
  const resumeUrl = sameOrigin(body.resume_url, base);
  const now = Date.now();
  return {
    // A hold without a way back to it, or one already past its deadline, is not offered.
    attempts: (resumeUrl ? body.attempts : []).slice(0, MAX_ATTEMPTS).map(attempt => ({
      serviceId: Number(attempt && attempt.service_id) || 0,
      staffId: Number(attempt && attempt.staff_id) || 0,
      serviceName: text(attempt && attempt.service_name),
      startUtc: instant(attempt && attempt.start_utc),
      expiresAt: instant(attempt && attempt.expires_at)
    })).filter(attempt => attempt.startUtc && (!attempt.expiresAt || Date.parse(attempt.expiresAt) > now)),
    resumeUrl,
    multiple: body.multiple === true,
    contact: {
      first_name: text(contact.first_name),
      last_name: text(contact.last_name),
      email: text(contact.email),
      phone: text(contact.phone)
    }
  };
}

/**
 * Ask the offered gateway what its checkout holds for this visitor.
 *
 * @param {Array.<Object>} gateways     Offered gateways.
 * @param {Object}         [opts]       Options.
 * @param {string}         [opts.nonce] REST nonce, forwarded so a signed-in visitor stays signed in.
 * @param {Window}         [opts.win]   Window (injected for tests).
 * @return {Promise<?Object>} Normalised session, or null when there is nothing to say.
 */
async function gatewaySession(gateways, opts = {}) {
  const win = opts.win || (typeof window !== 'undefined' ? window : null);
  const gateway = sessionGateway(gateways);
  if (!win || !gateway) {
    return null;
  }
  let timer;
  try {
    const url = sameOrigin(gateway.client.session_url, win.location.href);
    const marker = gateway.client.session_cookie;
    if (!url || marker && !String(win.document && win.document.cookie || '').split(';').some(pair => pair.trim().split('=')[0] === marker)) {
      return null;
    }
    const controller = new AbortController();
    timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const response = await win.fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      redirect: 'error',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(opts.nonce ? {
          'X-WP-Nonce': opts.nonce
        } : {})
      },
      body: '{}'
    });
    return response.ok ? normalizeSession(await response.json(), win.location.href) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
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
  let pendingPatch = null;

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
    pendingPatch = null;
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
      // Selection can change while Stripe.js is loading. Apply its latest amount
      // before mounting the payment UI, so ready never exposes the old choice.
      if (pendingPatch) {
        const patch = pendingPatch;
        pendingPatch = null;
        this.update(patch);
      }
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
      if (!patch || torn) {
        return;
      }
      if (!elements) {
        pendingPatch = {
          ...pendingPatch,
          ...patch
        };
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
/* harmony export */   COMMON_ZONES: () => (/* binding */ COMMON_ZONES),
/* harmony export */   TZ_MODE_BUSINESS: () => (/* binding */ TZ_MODE_BUSINESS),
/* harmony export */   TZ_MODE_VISITOR: () => (/* binding */ TZ_MODE_VISITOR),
/* harmony export */   allTimezones: () => (/* binding */ allTimezones),
/* harmony export */   browserTimezone: () => (/* binding */ browserTimezone),
/* harmony export */   canonicalizeZone: () => (/* binding */ canonicalizeZone),
/* harmony export */   dayKeyInTz: () => (/* binding */ dayKeyInTz),
/* harmony export */   endsNextDay: () => (/* binding */ endsNextDay),
/* harmony export */   fmtTime: () => (/* binding */ fmtTime),
/* harmony export */   fmtTimeAt: () => (/* binding */ fmtTimeAt),
/* harmony export */   formatInTz: () => (/* binding */ formatInTz),
/* harmony export */   gmtSuffix: () => (/* binding */ gmtSuffix),
/* harmony export */   groupSlotsByDay: () => (/* binding */ groupSlotsByDay),
/* harmony export */   isOffsetZone: () => (/* binding */ isOffsetZone),
/* harmony export */   normalizeTzMode: () => (/* binding */ normalizeTzMode),
/* harmony export */   rememberTz: () => (/* binding */ rememberTz),
/* harmony export */   rememberedTz: () => (/* binding */ rememberedTz),
/* harmony export */   resolveDisplayTz: () => (/* binding */ resolveDisplayTz),
/* harmony export */   sameDisplayZone: () => (/* binding */ sameDisplayZone),
/* harmony export */   setTimeFormat: () => (/* binding */ setTimeFormat),
/* harmony export */   suggestedTimezones: () => (/* binding */ suggestedTimezones),
/* harmony export */   timezoneOptions: () => (/* binding */ timezoneOptions),
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
  return formatInTz(instant, iana, clockOptions(), locale);
}

/**
 * The site's clock convention, as `Intl` options (persona QA 2026-10-05, T-071).
 *
 * The locale alone decided 12 h vs 24 h, so a site whose owner set the time format to `H:i`
 * printed "10:00 PM" in the form and "22:00" in its mails, cart and manage page. The form is one
 * site's form — every instance on a page shares the one setting — so it is module state, set once
 * from the boot config by {@link setTimeFormat} rather than threaded through every call.
 */
let clock = {};

/**
 * @return {Intl.DateTimeFormatOptions} Hour + minute options for the site's clock.
 */
function clockOptions() {
  return Object.assign({
    hour: 'numeric',
    minute: '2-digit'
  }, clock);
}

/**
 * Adopt the site's WordPress time format (`time_format`, a PHP `date()` pattern): `H` / `G` is
 * a 24-hour clock, `g` / `h` a 12-hour one, and anything else leaves the locale to decide as
 * before. Escaped characters (`\H`) are literals, not hours.
 *
 * @param {string} format PHP time format, or '' for the locale's own convention.
 */
function setTimeFormat(format) {
  const f = String(format || '').replace(/\\./g, '');
  if (/[HG]/.test(f)) {
    clock = {
      hourCycle: 'h23',
      hour: f.includes('H') ? '2-digit' : 'numeric'
    };
  } else if (/[gh]/.test(f)) {
    clock = {
      hour12: true
    };
  } else {
    clock = {};
  }
}

/**
 * A clock time in zone `iana`, WITH its date whenever that date is not the one the same instant
 * has in `otherTz` (persona QA 2026-10-05, T-058): "5:30 PM" on the same day, "Fri, Oct 30,
 * 5:30 PM" across midnight. The business-time line used to print the bare time, so a customer
 * booking Saturday 12:30 AM their time read "5:30 PM" as Saturday — the visit is on Friday.
 *
 * @param {Date|number|string} instant  UTC instant.
 * @param {string}             iana     Zone the time is told in.
 * @param {string}             otherTz  Zone whose date the reader already has on screen.
 * @param {string}             [locale] Locale.
 * @return {string} Time, date-qualified when the days differ.
 */
function fmtTimeAt(instant, iana, otherTz, locale) {
  if (dayKeyInTz(instant, iana) === dayKeyInTz(instant, otherTz)) {
    return fmtTime(instant, iana, locale);
  }
  return formatInTz(instant, iana, Object.assign({
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }, clockOptions()), locale);
}

/**
 * Whether a booking ends on a later calendar day than it starts, in the zone it is shown in —
 * "11:00 PM → 1:00 AM" needs a day marker on its end (persona QA 2026-10-05, T-058).
 *
 * @param {Date|number|string} startUtc Start instant.
 * @param {Date|number|string} endUtc   End instant.
 * @param {string}             iana     Display timezone.
 * @return {boolean} True when the end is on another day.
 */
function endsNextDay(startUtc, endUtc, iana) {
  return !!startUtc && !!endUtc && dayKeyInTz(startUtc, iana) !== dayKeyInTz(endUtc, iana);
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
 * Instants the zone-equivalence check samples: now, then roughly every three
 * months for a year. Two zones only count as the same when their offset agrees
 * at EVERY sample, so a fixed `+01:00` never collapses into `Europe/Berlin`
 * (they agree in January and disagree in July). A year of samples covers the
 * whole horizon the widget can show, and the check runs once at init.
 *
 * @param {Date|number|string} [refInstant] Reference instant (defaults to now).
 * @return {Array<number>} Epoch-ms samples.
 */
function offsetSamples(refInstant) {
  const base = refInstant === undefined || refInstant === null ? Date.now() : toDate(refInstant).getTime();
  const quarter = 91 * 24 * 60 * 60 * 1000;
  return [0, 1, 2, 3, 4].map(i => base + i * quarter);
}

/**
 * Do two zone names denote the same wall clock for every time the widget can show?
 *
 * Names are compared first, after canonicalizing aliases — two DIFFERENT named
 * places stay different even when today's offsets agree, because the business
 * zone is a real city and the visitor is entitled to see both labels. The offset
 * comparison exists for exactly one case: WordPress reports the site timezone as
 * a bare UTC OFFSET (`+07:00`) whenever the admin never picked a city, and an
 * offset can never string-equal the IANA name a browser reports. Without this,
 * such a site shows the selector to EVERY visitor — including the ones already
 * on its own clock (founder report 2026-09-18).
 *
 * @param {string}             a            First zone name.
 * @param {string}             b            Second zone name.
 * @param {Date|number|string} [refInstant] Instant the sample window starts at.
 * @return {boolean} True when the two zones are interchangeable for display.
 */
function sameDisplayZone(a, b, refInstant) {
  const left = canonicalizeZone(String(a || ''));
  const right = canonicalizeZone(String(b || ''));
  if (!left || !right) {
    return false;
  }
  if (left === right) {
    return true;
  }
  // Two named places are two places, whatever today's offset says.
  if (!isOffsetZone(left) && !isOffsetZone(right)) {
    return false;
  }
  try {
    return offsetSamples(refInstant).every(instant => tzOffsetMinutes(left, instant) === tzOffsetMinutes(right, instant));
  } catch {
    // An engine that rejects offset-form zone ids cannot prove equivalence.
    return false;
  }
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
 * The 17 zones the widget has always offered, kept as the SUGGESTED group at the
 * top of the timezone picker and as the fallback list on an engine that has no
 * `Intl.supportedValuesOf` (Safari < 15.4). It is a short, hand-picked spread of
 * the world's busiest offsets — not an attempt at completeness, which is what
 * {@link allTimezones} is for.
 *
 * @type {Array<string>}
 */
const COMMON_ZONES = ['UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'America/Sao_Paulo', 'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Africa/Cairo', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Ho_Chi_Minh', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland'];

/**
 * Every IANA zone the ENGINE knows, read at runtime — so the ~430-name list costs
 * the bundle nothing and can never drift from the zone database the browser will
 * actually format with. Falls back to {@link COMMON_ZONES} where
 * `Intl.supportedValuesOf` is missing.
 *
 * @param {Array<string>} [fallback] List to use when the API is unavailable.
 * @return {Array<string>} IANA zone names.
 */
function allTimezones(fallback) {
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
      const list = Intl.supportedValuesOf('timeZone');
      if (Array.isArray(list) && list.length) {
        return list;
      }
    }
  } catch {
    // fall through to the bundled list
  }
  return (fallback || COMMON_ZONES).slice();
}

/**
 * Canonicalize, de-duplicate and sort a zone list, dropping anything that cannot
 * legally become `display_tz`.
 *
 * A bare UTC offset — what WordPress reports as the site zone when the owner never
 * picked a city — is deliberately dropped: `display_tz` is posted back at submit
 * and the REST layer only accepts IANA identifiers, so offering one would build a
 * form that fails at the last step. The studio's own time still shows in the
 * business-time line, which formats an offset perfectly well.
 *
 * @param {Array<string>} zones Raw zone names.
 * @return {Array<string>} Sorted, unique, bookable IANA names.
 */
function bookableZones(zones) {
  const out = [];
  (zones || []).forEach(raw => {
    const zone = canonicalizeZone(String(raw || ''));
    if (zone && !isOffsetZone(zone) && !out.includes(zone)) {
      out.push(zone);
    }
  });
  return out.sort();
}

/**
 * The full picker list: every zone the engine knows, UNIONED with
 * {@link COMMON_ZONES}, plus any zone the page is already using.
 *
 * The union is not belt-and-braces. `Intl.supportedValuesOf( 'timeZone' )` returns
 * the zone database's own identifiers, and `UTC` is NOT among them on Node or
 * Chromium — so without this, a visitor searching "utc" in the picker found
 * nothing while `UTC` sat pinned in the Suggested group above (Codex review 4).
 * The same applies to any zone the shortlist names that a given runtime spells
 * differently. `extra` covers the reverse case: a browser or business zone ahead
 * of the runtime's tables.
 *
 * @param {Array<string>} [extra] Zones the widget must be able to offer.
 * @return {Array<string>} Sorted, unique, bookable IANA names.
 */
function timezoneOptions(extra) {
  return bookableZones(allTimezones(COMMON_ZONES).concat(COMMON_ZONES).concat(extra || []));
}

/**
 * The SUGGESTED group — all the picker shows until the visitor types (search-first,
 * founder review 2026-09-30): where the visitor is, where the business is, and the
 * zone on screen. Ordered by relevance, not alphabetically. The common spread is no
 * longer pinned here; it is one search away like every other city.
 *
 * @param {Array<string>} [extra] Zones to pin (browser, business, current).
 * @return {Array<string>} IANA names, most relevant first.
 */
function suggestedTimezones(extra) {
  const out = [];
  (extra || []).forEach(raw => {
    const zone = canonicalizeZone(String(raw || ''));
    if (zone && !isOffsetZone(zone) && !out.includes(zone)) {
      out.push(zone);
    }
  });
  return out;
}

/** Display in the visitor's own browser zone (the default, and what every site did before D-R48). */
const TZ_MODE_VISITOR = 'visitor';

/** Display in the business zone, and say so — but only to a visitor who is somewhere else. */
const TZ_MODE_BUSINESS = 'business';

/**
 * Coerce the stored `booking.timezone_mode` to a mode this module understands.
 * Anything unknown (an older bundle, a hand-edited option) reads as `visitor`, so
 * a site can never lose its times to a typo.
 *
 * @param {*} mode Raw mode.
 * @return {'visitor'|'business'} Normalized mode.
 */
function normalizeTzMode(mode) {
  return TZ_MODE_BUSINESS === mode ? TZ_MODE_BUSINESS : TZ_MODE_VISITOR;
}

/**
 * Deterministic init rule (SPEC-P1 §2.2, amended by D-R48 — the "quiet timezone"
 * model).
 *
 * `visitor` (default, and what every site did before D-R48): the browser zone
 * wins whenever it is a different clock from the business zone, exactly as
 * before. `business`: the business zone wins regardless of where the visitor is,
 * and {@link showNote} asks the UI to say so — but ONLY when the visitor is
 * somewhere else, because telling a local customer their own clock is their own
 * clock is noise (SSA style).
 *
 * Neither mode gates CORRECTNESS (AGENTS §1): the picker exists in both, so a
 * remote customer can always move the whole flow onto their own zone, and
 * `customer_timezone` is still persisted as whatever `display_tz` is active at
 * submit — even if the visitor never opened the picker.
 *
 * "Equals" is {@link sameDisplayZone}, not string identity: a site whose owner
 * never picked a city reports its zone as a bare UTC offset, and an offset never
 * string-equals a browser's IANA name even when the two are the same clock. Such
 * a zone can also never BE the display zone (the REST layer takes IANA names
 * only), so `business` mode on a city-less site degrades to the visitor's clock
 * rather than posting a value the server would reject.
 *
 * @param {Object}             args            Args.
 * @param {string}             args.browserTz  Browser IANA zone.
 * @param {string}             args.businessTz Business IANA zone.
 * @param {string}             [args.mode]     `visitor` (default) or `business`.
 * @param {Date|number|string} [args.now]      Instant the zone comparison starts at (tests).
 * @return {{displayTz:string, businessTz:string, browserTz:string, mode:string, differs:boolean, showNote:boolean, showSelector:boolean}} Init state.
 */
function resolveDisplayTz({
  browserTz,
  businessTz,
  mode,
  now
}) {
  const tzMode = normalizeTzMode(mode);
  const differs = !!browserTz && !!businessTz && !sameDisplayZone(browserTz, businessTz, now);

  // Same clock, two spellings: display in the NAMED one. `display_tz` is posted
  // back at submit and the REST layer only accepts IANA identifiers, so a bare
  // offset must never become the display zone — and `Ho Chi Minh (GMT+7)` reads
  // better than `GMT+7` anyway.
  let displayTz = TZ_MODE_BUSINESS === tzMode && !!businessTz ? businessTz : differs ? browserTz : businessTz;
  if (isOffsetZone(displayTz) && !!browserTz && !isOffsetZone(browserTz)) {
    displayTz = browserTz;
  }
  return {
    browserTz,
    businessTz,
    displayTz,
    mode: tzMode,
    differs,
    // The SSA-style "Times shown in …" note: business mode, remote visitor only.
    showNote: TZ_MODE_BUSINESS === tzMode && differs,
    // Kept for callers that only ask "is this visitor on the studio's clock?".
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

/** Where the visitor's own zone pick is kept between visits (persona QA 2026-10-05, T-096). */
const TZ_STORE_KEY = 'aponto_display_tz';

/**
 * This browser's persistent store, or `null` where there is none (private mode, a sandboxed
 * frame, node) — reading the property itself can throw.
 *
 * @return {?Storage} Storage or null.
 */
function tzStore() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

/**
 * The display zone this visitor picked on an earlier visit, or '' (T-096).
 *
 * Stored WITH the browser zone it was picked from and honoured only while that still matches:
 * someone who chose "Chicago" from Hanoi and then travels is on a different clock, and a zone
 * remembered from the old one would be a guess. Only a zone the engine can format — and that
 * may legally be posted as `display_tz` (never a bare offset) — is ever returned.
 *
 * @param {string}   browserTz Browser IANA zone.
 * @param {?Storage} [storage] Store (injected by tests).
 * @return {string} IANA zone or ''.
 */
function rememberedTz(browserTz, storage = tzStore()) {
  try {
    const parts = String(storage.getItem(TZ_STORE_KEY) || '').split('|');
    const zone = canonicalizeZone(parts[1] || '');
    if (parts[0] !== browserTz || !zone || isOffsetZone(zone)) {
      return '';
    }
    // Throws a RangeError for a name this engine does not know.
    tzOffsetMinutes(zone, Date.now());
    return zone;
  } catch {
    return '';
  }
}

/**
 * Remember (or, with '', forget) the visitor's display-zone pick (T-096). A timezone name and
 * nothing else: no identifier, no PII. Best-effort — a browser with no storage just forgets.
 *
 * @param {string}   browserTz Browser IANA zone.
 * @param {string}   zone      Picked zone, or '' to forget.
 * @param {?Storage} [storage] Store (injected by tests).
 */
function rememberTz(browserTz, zone, storage = tzStore()) {
  try {
    if (zone) {
      storage.setItem(TZ_STORE_KEY, browserTz + '|' + zone);
    } else {
      storage.removeItem(TZ_STORE_KEY);
    }
  } catch {
    // No store: nothing to remember.
  }
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
/* harmony import */ var _aponto_form_balance__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @aponto/form-balance */ "./assets/src/form/lib/balance.free.js");
/* harmony import */ var _styles_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./styles.js */ "./assets/src/form/styles.js");
/* harmony import */ var _aponto_form_coupons__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @aponto/form-coupons */ "./assets/src/form/lib/coupons.free.js");
/* harmony import */ var _lib_config_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./lib/config.js */ "./assets/src/form/lib/config.js");
/* harmony import */ var _lib_appearance_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./lib/appearance.js */ "./assets/src/form/lib/appearance.js");
/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! preact/jsx-runtime */ "./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js");
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




// Edition-resolved (webpack alias): Premium adds its coupon rules, Free adds ''.




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
  const props = (0,_lib_config_js__WEBPACK_IMPORTED_MODULE_5__.parseProps)(hostEl.getAttribute("data-props"));
  const config = (0,_lib_config_js__WEBPACK_IMPORTED_MODULE_5__.resolveConfig)((0,_lib_config_js__WEBPACK_IMPORTED_MODULE_5__.readGlobalConfig)(window), props);

  // Appearance → inline custom properties on the host (override :host defaults).
  const vars = (0,_lib_appearance_js__WEBPACK_IMPORTED_MODULE_6__.resolveAppearanceVars)(config.appearance);
  Object.keys(vars).forEach(name => {
    hostEl.style.setProperty(name, vars[name]);
  });

  // Color scheme → host attribute, which selects the shadow stylesheet's opt-in
  // dark preset. Always written (even for the `light` default) so the resolved
  // scheme is visible in the DOM and never inferred from the OS by accident.
  hostEl.setAttribute("data-ap-color-scheme", (0,_lib_appearance_js__WEBPACK_IMPORTED_MODULE_6__.resolveColorScheme)(config.appearance));
  // Card elevation → host attribute, same reasoning as the scheme.
  hostEl.setAttribute("data-ap-shadow", (0,_lib_appearance_js__WEBPACK_IMPORTED_MODULE_6__.resolveShadow)(config.appearance));
  const shadow = hostEl.attachShadow({
    mode: "open"
  });
  injectCss(shadow, _styles_js__WEBPACK_IMPORTED_MODULE_3__.SHADOW_CSS + _aponto_form_coupons__WEBPACK_IMPORTED_MODULE_4__.formCouponCss);
  const mountPoint = (shadow.ownerDocument || document).createElement("div");
  shadow.appendChild(mountPoint);

  // A standalone payment page binds its token server-side. A fragment cannot
  // replace that booking, and this host must never open the new-booking flow.
  const standalone = hostEl.hasAttribute("data-aponto-balance-token");
  const token = standalone ? hostEl.getAttribute("data-aponto-balance-token") : (0,_aponto_form_balance__WEBPACK_IMPORTED_MODULE_2__.balanceToken)(window.location.hash);
  (0,preact__WEBPACK_IMPORTED_MODULE_0__.render)(standalone || token ? (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_aponto_form_balance__WEBPACK_IMPORTED_MODULE_2__.BalanceEntry, {
    config: config,
    token: token,
    standalone: standalone
  }) : (0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_app_jsx__WEBPACK_IMPORTED_MODULE_1__.App, {
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
    if (win.CSSStyleSheet && "adoptedStyleSheets" in doc) {
      const sheet = new win.CSSStyleSheet();
      sheet.replaceSync(cssText);
      shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, sheet];
      return;
    }
  } catch (e) {
    // Fall through to a <style> element.
  }
  const style = doc.createElement("style");
  style.textContent = cssText;
  shadow.appendChild(style);
}

/***/ },

/***/ "./assets/src/shared/person-name.js"
/*!******************************************!*\
  !*** ./assets/src/shared/person-name.js ***!
  \******************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   displayName: () => (/* binding */ displayName),
/* harmony export */   displayNameOf: () => (/* binding */ displayNameOf),
/* harmony export */   initials: () => (/* binding */ initials),
/* harmony export */   initialsOf: () => (/* binding */ initialsOf),
/* harmony export */   normalizePart: () => (/* binding */ normalizePart)
/* harmony export */ });
/**
 * The ONE person-name rule on the JS side (name split, 2026-10-01).
 *
 * Customers and staff are stored as `first_name` + `last_name`; every REST DTO also carries a
 * server-composed `name`. This module is the JS twin of `Aponto\Support\PersonName` (PHP) and is
 * pinned to it by `tests/fixtures/person-name-lockstep.json` — a Jest test and a PHP unit test
 * both run the same `display` and `initials` cases, so the two sides cannot drift.
 *
 * Framework-free and dependency-free on purpose: the admin SPA (React), the wizard and the
 * booking widget (Preact) all import it by relative path and webpack inlines a copy into each
 * bundle, so nothing here may pull in a runtime.
 *
 * Display order "First Last" lives ONLY in `displayName()`.
 */

/**
 * The whitespace class, matching PHP's `/[\s\p{Z}]+/u`: PCRE `\s` under `/u` is the ASCII set
 * (space, tab, LF, VT, FF, CR) and `\p{Z}` adds every Unicode separator (NBSP, U+3000, …).
 * Spelled out rather than JS `\s`, which also treats U+FEFF as whitespace and PHP does not, and
 * with the `\p{Z}` members listed (Zs + U+2028 Zl + U+2029 Zp) so no transpiler expands a
 * property escape into a large character table inside every bundle.
 */
const WHITESPACE_RUN = /[\t\n\v\f\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/g;

/**
 * One name part, normalized: Unicode whitespace trimmed and every internal run collapsed to a
 * single ASCII space. `null`/`undefined` read as ''.
 *
 * @param {*} part Raw first or last name.
 * @return {string} Normalized part ('' when blank).
 */
function normalizePart(part) {
  return String(part ?? '').replace(WHITESPACE_RUN, ' ').replace(/^ | $/g, '');
}

/**
 * The display name: "First Last", or whichever part is non-empty.
 *
 * @param {*} first First name.
 * @param {*} last  Last name.
 * @return {string} Display name ('' when both parts are blank).
 */
function displayName(first, last) {
  return [normalizePart(first), normalizePart(last)].filter(Boolean).join(' ');
}

/**
 * Up to two upper-cased initials: the first code point of the FIRST word and of the LAST word of
 * the display name — so "Ana Maria" + "Silva" is AS, a one-word name yields one letter, and a
 * blank name yields ''. Spread-based, so an astral first character stays whole.
 *
 * @param {*} first First name.
 * @param {*} last  Last name.
 * @return {string} 0–2 characters (more only when upper-casing expands, e.g. ß → SS).
 */
function initials(first, last) {
  const words = displayName(first, last).split(' ').filter(Boolean);
  if (!words.length) {
    return '';
  }
  const head = [...words[0]][0] || '';
  const tail = words.length > 1 ? [...words[words.length - 1]][0] || '' : '';
  return (head + tail).toUpperCase();
}

/**
 * The display name of a person DTO (customer, staff, a booking's `customer`/`staff` block).
 *
 * The server composes `name` with the same rule, so it wins when present; the parts are the
 * fallback for a payload that carries only them.
 *
 * @param {?Object} person DTO with `name` and/or `first_name`/`last_name`.
 * @return {string} Display name ('' for a missing or nameless record).
 */
function displayNameOf(person) {
  if (!person || 'object' !== typeof person) {
    return '';
  }
  const composed = normalizePart(person.name);
  return composed || displayName(person.first_name, person.last_name);
}

/**
 * The initials of a person DTO — from its parts when it has them, else from its composed name
 * (whose words are the parts' words, so the answer is the same).
 *
 * @param {?Object} person DTO with `first_name`/`last_name` and/or `name`.
 * @return {string} 0–2 characters.
 */
function initialsOf(person) {
  if (!person || 'object' !== typeof person) {
    return '';
  }
  const fromParts = initials(person.first_name, person.last_name);
  return fromParts || initials(person.name, '');
}

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
 *  - Two more `--ap-*` are PUBLIC INPUTS a host page may set on the widget host,
 *    beside the three seeds: `--ap-layout-max` (the card width cap, which the
 *    block's `maxWidth` writes — D-R49) and `--ap-sticky-offset` (default `0px`,
 *    D-R52) — the vertical room a host's own sticky header occupies, so the staff
 *    profile dialog, which is pinned with `position: sticky` INSIDE the card and
 *    never `fixed`, opens clear of it instead of underneath.
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
  --ap-checkbox-check-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='m3.5 8.1 2.7 2.7 6.3-6.3' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  --ap-select-chevron-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='m4 6.5 4 4 4-4' fill='none' stroke='%236f7479' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  --ap-color-surface: #ffffff;
  --ap-color-canvas: #ffffff;
  --ap-color-text: #30353a;
  --ap-color-danger: #c22a2a;
  --ap-color-success: #2f8a5b;
  --ap-color-warning: #b5860f;
  --ap-color-info: #5056c9;
  --ap-color-inverse-surface: #12151b;
  --ap-color-on-inverse: #ffffff;
  --ap-color-on-inverse-danger: #ffb4a8;
  --ap-tone-text-muted: 72%;
  --ap-tone-text-soft: 70%;
  --ap-tone-surface-subtle: 5%;
  --ap-tone-surface-muted: 7%;
  --ap-tone-avatar-surface: 5%;
  --ap-tone-border: 9%;
  --ap-tone-border-control: 14%;
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
  --ap-color-border-control: color-mix(in srgb, var(--ap-color-text) var(--ap-tone-border-control), var(--ap-color-surface));
  --ap-color-row-hover: color-mix(in srgb, var(--ap-color-surface-subtle) 50%, var(--ap-color-surface));
  --ap-color-accent-subtle: color-mix(in srgb, var(--ap-color-accent) var(--ap-tone-accent-subtle), var(--ap-color-surface));
  --ap-color-accent-soft: color-mix(in srgb, var(--ap-color-accent) var(--ap-tone-accent-soft), var(--ap-color-surface));
  --ap-color-accent-border: color-mix(in srgb, var(--ap-color-accent) var(--ap-tone-accent-border), var(--ap-color-border));
  --ap-color-accent-text: var(--ap-color-accent);
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
  --ap-layout-max: 960px;
  --ap-layout-content: 660px;
  --ap-layout-catalogue: 820px;
  --ap-layout-sidebar: 240px;
  --ap-layout-sidebar-wide: 288px;
  --ap-sticky-offset: 0px;
  --ap-edge-gap: 16px;
  --ap-shadow-ink: #12151b;
  --ap-shadow-sm: 0 0 4px color-mix(in srgb, var(--ap-shadow-ink) 4%, transparent),
    0 1px 2px color-mix(in srgb, var(--ap-shadow-ink) 5%, transparent),
    0 6px 20px -4px color-mix(in srgb, var(--ap-shadow-ink) 14%, transparent);
  --ap-shadow-md: 0 0 6px color-mix(in srgb, var(--ap-shadow-ink) 4%, transparent),
    0 2px 4px color-mix(in srgb, var(--ap-shadow-ink) 5%, transparent),
    0 12px 32px -6px color-mix(in srgb, var(--ap-shadow-ink) 18%, transparent);
  --ap-shadow-lg: 0 0 8px color-mix(in srgb, var(--ap-shadow-ink) 5%, transparent),
    0 3px 6px color-mix(in srgb, var(--ap-shadow-ink) 5%, transparent),
    0 22px 48px -10px color-mix(in srgb, var(--ap-shadow-ink) 24%, transparent);
  --ap-shadow-card: var(--ap-shadow-sm);
  --ap-card-border: 0;
  --ap-motion-standard: 170ms cubic-bezier(.2, .7, .3, 1);
  --ap-motion-step-duration: 340ms;
  --ap-motion-step-back-duration: 280ms;
  --ap-motion-step-easing: cubic-bezier(.22, 1, .36, 1);
  --ap-motion-step-distance: 12px;
  --ap-motion-step-back-distance: 9px;
  --ap-motion-stagger: 28ms;
  color-scheme: light;
  display: block;
}
:host([data-ap-color-scheme="dark"]) {
  color-scheme: dark;
  --ap-color-surface: #1a1e25;
  --ap-color-canvas: #1a1e25;
  --ap-color-text: #e7eaef;
  --ap-tone-text-soft: 54%;
  --ap-tone-surface-subtle: 4%;
  --ap-tone-surface-muted: 6%;
  --ap-tone-avatar-surface: 7%;
  --ap-tone-border: 12%;
  --ap-tone-border-control: 12%;
  --ap-shadow-ink: #000000;
  --ap-card-border: 1px solid var(--ap-color-border);
  --ap-tone-border-strong: 20%;
  --ap-tone-accent-subtle: 22%;
  --ap-tone-accent-soft: 30%;
  --ap-color-accent-text: color-mix(in srgb, var(--ap-color-accent) 45%, var(--ap-color-text));
  --ap-select-chevron-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='m4 6.5 4 4 4-4' fill='none' stroke='%23a3abb6' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}
:host([data-ap-shadow="flat"]) { --ap-shadow-card: none; --ap-card-border: 1px solid var(--ap-color-border); }
:host([data-ap-shadow="md"]) { --ap-shadow-card: var(--ap-shadow-md); }
:host([data-ap-shadow="lg"]) { --ap-shadow-card: var(--ap-shadow-lg); }
`;
const COMPONENTS = `
.ap-wrap {
  position: relative;
  width: 100%;
  max-width: calc(var(--ap-layout-max) + 2 * var(--ap-edge-gap));
  padding-inline: var(--ap-edge-gap);
  box-sizing: border-box;
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
:host(:focus), :host(:focus-visible), :host(:focus-within) { outline: none !important; }
.ap { position: relative; width: 100%; background: var(--ap-color-surface); color: var(--ap-color-text);
  border: var(--ap-card-border); border-radius: calc(var(--ap-radius-control) * 2);
  box-shadow: var(--ap-shadow-card); font-family: inherit; font-size: var(--ap-font-size-body); font-weight: var(--ap-font-weight-regular);
  line-height: var(--ap-line-height-body); overflow: clip;
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
.ap, .ap *, .ap *::before, .ap *::after { box-sizing: border-box; }
.ap button, .ap input, .ap select, .ap textarea { font-family: inherit; }
.ap strong { font-weight: var(--ap-font-weight-semibold); }
.ap-item-title { font-size: var(--ap-font-size-item); font-weight: var(--ap-font-weight-semibold); line-height: 1.35; }
.ap svg { width: 16px; height: 16px; flex: 0 0 auto; display: block; }
.ap-visually-hidden { position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.ap-body { display: grid; grid-template-columns: minmax(0, 1fr); }
.ap-main { padding: 24px; min-width: 0; container-type: inline-size; container-name: apmain; }
.ap-main.narrow { width: 100%; max-width: var(--ap-layout-content); margin-inline: auto; }
.ap-main.service { width: 100%; max-width: var(--ap-layout-catalogue); margin-inline: auto; }
.ap-aside { display: none; flex-direction: column; min-height: 0; overflow: hidden;
  border-inline-start: 1px solid var(--ap-color-border); background: var(--ap-color-surface); padding: 24px; }
.ap-recap { border-bottom: 1px solid var(--ap-color-border); }
.ap-recap-bar { display: flex; align-items: center; gap: 12px; width: 100%; background: var(--ap-color-surface);
  border: 0; padding: 12px 24px; font: inherit; color: var(--ap-color-text); cursor: pointer; text-align: start; }
.ap-recap-line { display: flex; flex: 1; min-width: 0; font-size: var(--ap-font-size-sm); font-weight: var(--ap-font-weight-medium);
  white-space: nowrap; overflow: hidden; }
.ap-recap-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.ap-recap-when { flex: none; }
.ap-recap-chev { flex: 0 0 auto; color: var(--ap-color-text-soft); display: grid; place-items: center; }
.ap-recap-chev svg { width: 16px; height: 16px; transform: rotate(90deg); transition: transform var(--ap-motion-standard); }
.ap-recap-chev.up svg { transform: rotate(-90deg); }
.ap-recap-panel { overflow: hidden; max-height: 0; transition: max-height var(--ap-motion-standard); background: var(--ap-color-surface); }
.ap-recap-panel.open { max-height: min(68vh, 560px); overflow-y: auto; }
.ap-recap-panel-in { padding: 16px 24px; border-top: 1px solid var(--ap-color-border); }
@container apw (min-width: 700px) {
  .ap-body.has-summary { grid-template-columns: minmax(0, 1fr) var(--ap-layout-sidebar); }
  .ap-body.has-summary .ap-aside { display: flex; }
  .ap-recap { display: none; }
  .ap-recap.solo { display: block; }
}
@container apw (min-width: 900px) {
  .ap-body.has-summary { grid-template-columns: minmax(0, 1fr) var(--ap-layout-sidebar-wide); }
}
@container apw (max-width: 619.98px) {
  .ap-main { padding: 20px; }
  .ap-recap-bar, .ap-recap-panel-in { padding-left: 20px; padding-right: 20px; }
  .ap-primary { min-width: 120px; }
}
.ap-intro { display: flex; flex-direction: column; min-width: 0; border-bottom: 1px solid var(--ap-color-border);
  overflow-wrap: anywhere; }
.ap-intro .ap-recap-bar, .ap-intro-more { display: none; }
.ap-intro-body { display: flex; flex: 1; flex-direction: column; padding: 24px; }
.ap-intro-main { flex: 1 0 auto; }
.ap-intro-pick { margin: 4px 0 12px; padding-top: 16px; border-top: 1px solid var(--ap-color-border); }
.ap-intro-desc { margin: 4px 0 0; font-size: var(--ap-font-size-sm); color: var(--ap-color-text-muted); }
.ap-intro-more { font-size: var(--ap-font-size-sm); }
.ap-intro .ap-sum-help { margin-top: 24px; }
.ap-intro-host { --ap-staff-av: 32px; margin: 0 0 16px; }
.ap-intro-host-row { display: flex; align-items: center; gap: 12px; min-width: 0; }
.ap-intro-host .ap-av { font-size: var(--ap-font-size-xs); }
.ap-intro-host-name { min-width: 0; font-weight: var(--ap-font-weight-medium); overflow-wrap: anywhere; }
.ap-intro-host-sub { margin: 8px 0 0; font-size: var(--ap-font-size-sm); color: var(--ap-color-text-muted); }
.ap-av-stack { display: flex; flex: 0 0 auto; }
.ap-av-stack .ap-av { box-shadow: 0 0 0 2px var(--ap-color-surface); }
.ap-av-stack .ap-av + .ap-av { margin-inline-start: -4px; }
.ap-intro-change { display: block; margin-top: 6px; font-size: var(--ap-font-size-xs); }
.ap-intro :is(.ap-amt, .ap-sum-total .v) { white-space: nowrap; }
.ap-op .ap-cal-tiles { grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); }
@container apw (min-width: 700px) {
  .ap-op { grid-template-columns: var(--ap-layout-sidebar) minmax(0, 1fr); }
  .ap-intro { border-bottom: 0; border-inline-end: 1px solid var(--ap-color-border); }
}
@container apw (min-width: 900px) { .ap-op { grid-template-columns: var(--ap-layout-sidebar-wide) minmax(0, 1fr); } }
@container apw (max-width: 619.98px) { .ap-intro-body { padding: 20px; } }
@container apw (max-width: 699.98px) {
  .ap-intro-more { display: inline-block; }
  .ap-intro:not(.is-expanded):not(.is-recap) :is(.ap-intro-desc, .ap-sum-help) { display: none; }
  .ap-intro.is-recap .ap-recap-bar { display: flex; }
  .ap-intro.is-recap:not(.is-open) .ap-intro-body { display: none; }
  .ap-intro.is-recap .ap-intro-body { border-top: 1px solid var(--ap-color-border); }
}
.ap-steps { position: relative; display: flex; align-items: center; justify-content: space-between;
  width: 100%; margin: 0 0 20px; padding: 0; list-style: none; color: var(--ap-color-text-soft); }
.ap-steps::before { content: ""; position: absolute; z-index: 0; top: 10px; inset-inline: 10px;
  height: 1px; background: var(--ap-color-border); }
.ap-steps li { position: relative; z-index: 1; display: flex; align-items: center; gap: 7px;
  flex: 0 1 auto; padding: 0 7px; min-width: 0; white-space: nowrap;
  font-size: var(--ap-font-size-xs); background: var(--ap-color-surface); }
.ap-steps li:first-child { padding-inline-start: 0; }
.ap-steps li:last-child { padding-inline-end: 0; }
.ap-step-num { flex: 0 0 auto; width: 21px; height: 21px; display: grid; place-items: center;
  border: 1px solid var(--ap-color-border); border-radius: 50%; font-size: var(--ap-font-size-badge);
  line-height: 1; font-variant-numeric: tabular-nums; }
.ap-step-label { min-width: 0; max-width: 14ch; overflow: hidden; text-overflow: ellipsis; }
.ap-steps li[aria-current="step"] { color: var(--ap-color-text); font-weight: var(--ap-font-weight-semibold); }
.ap-steps li[aria-current="step"] .ap-step-num { border-color: var(--ap-color-accent); color: var(--ap-color-accent); }
.ap-steps li.is-done { color: var(--ap-color-text-muted); }
.ap-step-btn { display: inline-flex; align-items: center; gap: inherit; min-width: 0; margin: 0; padding: 0;
  border: 0; background: none; font: inherit; color: inherit; cursor: pointer; border-radius: var(--ap-radius-small); }
.ap-step-btn:hover .ap-step-label { color: var(--ap-color-accent-text); }
.ap-step-btn:hover .ap-step-num { filter: brightness(.94); }
.ap-steps li.is-done .ap-step-num { border-color: var(--ap-color-accent); background: var(--ap-color-accent); color: var(--ap-color-on-accent); }
@container apmain (max-width: 439.98px) {
  .ap-steps li { gap: 0; padding-inline: 0; }
  .ap-step-label { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
}
.ap-h { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: baseline;
  column-gap: 8px; margin: 0 0 24px; }
.ap-h h2 { grid-column: 1; min-width: 0; margin: 0; color: var(--ap-color-heading); font-size: var(--ap-font-size-heading);
  font-weight: var(--ap-font-weight-semibold); letter-spacing: var(--ap-letter-spacing-title);
  line-height: var(--ap-line-height-title); overflow-wrap: anywhere; }
.ap-h h2:focus, .ap-done h2:focus { outline: none; }
.ap-h .sub { grid-column: 1 / -1; margin: 4px 0 0; font-size: var(--ap-font-size-sm); line-height: 1.45; color: var(--ap-color-text-muted); }
.ap-step-fraction { grid-column: 2; grid-row: 1; justify-self: end; font-size: var(--ap-font-size-xs);
  font-weight: var(--ap-font-weight-medium);
  letter-spacing: .04em; font-variant-numeric: tabular-nums; color: var(--ap-color-text-soft); white-space: nowrap; }
.ap-label { display: block; font-size: var(--ap-font-size-sm); font-weight: var(--ap-font-weight-medium);
  color: var(--ap-color-text-muted); margin: 0 0 5px; }
.ap-label .req { color: var(--ap-color-danger); margin-left: 2px; }
.ap-label .opt { color: var(--ap-color-text-soft); font-weight: var(--ap-font-weight-regular); margin-left: 4px; }
.ap-input, .ap-select, .ap-textarea { width: 100%; height: var(--ap-size-control); padding: 0 11px; font: inherit;
  font-size: var(--ap-font-size-control); color: var(--ap-color-text); background: var(--ap-color-canvas);
  border: 1px solid var(--ap-color-border-control); border-radius: var(--ap-radius-control); outline: none;
  transition: border-color var(--ap-motion-standard), box-shadow var(--ap-motion-standard); }
.ap-textarea { height: auto; padding: 9px 11px; line-height: 1.5; resize: vertical; min-height: 74px; }
.ap-input::placeholder, .ap-textarea::placeholder { color: var(--ap-color-text-soft); }
.ap-input:hover, .ap-select:hover, .ap-textarea:hover { border-color: var(--ap-color-border-strong); box-shadow: inset 0 0 0 1px var(--ap-color-border-strong); }
.ap-input:focus, .ap-select:focus, .ap-textarea:focus { border-color: var(--ap-color-accent); box-shadow: inset 0 0 0 1px var(--ap-color-accent); }
.ap-select {
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
@container apmain (min-width: 400px) {
  .ap-split-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 12px; }
}
.ap :focus-visible { outline: 1px solid var(--ap-color-accent-border); outline-offset: 1px; border-radius: var(--ap-radius-small); }
.ap .ap-input:focus-visible, .ap .ap-select:focus-visible, .ap .ap-textarea:focus-visible { outline: none; border-color: var(--ap-color-accent); box-shadow: inset 0 0 0 1px var(--ap-color-accent); }
.ap-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 24px; }
.ap-back { display: inline-flex; align-items: center; gap: 6px; background: none; border: 0; padding: 6px 2px; font: inherit;
  font-size: var(--ap-font-size-body); font-weight: 400; color: var(--ap-color-text-muted); cursor: pointer; border-radius: var(--ap-radius-small); }
.ap-back:hover { color: var(--ap-color-text); text-decoration: underline; }
.ap-back svg { width: 15px; height: 15px; }
.ap-back[hidden] { visibility: hidden; }
.ap-back:disabled { opacity: .5; cursor: default; text-decoration: none; }
.ap-back:disabled:hover { color: var(--ap-color-text-muted); text-decoration: none; }
.ap-primary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-width: 132px;
  min-height: var(--ap-size-control); padding: 6px 18px; text-align: center; line-height: 1.25; font: inherit; font-size: var(--ap-font-size-body);
  font-weight: var(--ap-font-weight-semibold); color: var(--ap-color-on-accent); background: var(--ap-color-accent);
  border: 1px solid var(--ap-color-accent); border-radius: var(--ap-radius-control); cursor: pointer; transition: filter var(--ap-motion-standard); }
.ap-primary:hover { filter: brightness(.94); }
.ap-primary:disabled { background: var(--ap-color-surface-muted); border-color: var(--ap-color-surface-muted);
  color: var(--ap-color-text-soft); cursor: not-allowed; filter: none; }
.ap-primary.busy { pointer-events: none; }
.ap-spin { width: 15px; height: 15px; border: 2px solid color-mix(in srgb, var(--ap-color-on-accent) 45%, transparent);
  border-top-color: var(--ap-color-on-accent); border-radius: 50%; animation: apSpin .7s linear infinite; }
@keyframes apSpin { to { transform: rotate(360deg); } }
.ap-search { position: relative; display: block; margin: 0 0 12px; }
.ap-search input { padding-inline-start: 36px; }
.ap-search svg { position: absolute; inset-inline-start: 11px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: var(--ap-color-text-soft); }
.ap-crumbs { display: flex; align-items: center; gap: 7px; font-size: var(--ap-font-size-sm); color: var(--ap-color-text-muted); margin: 0 0 10px; }
.ap-crumbs button { background: none; border: 0; padding: 0; font: inherit; font-size: var(--ap-font-size-sm); color: var(--ap-color-accent); cursor: pointer; }
.ap-crumbs button:hover { text-decoration: underline; }
.ap-crumbs svg { width: 14px; height: 14px; color: var(--ap-color-text-soft); }
.ap-list { border: 1px solid var(--ap-color-border-control); border-radius: var(--ap-radius-control); overflow: hidden; }
.ap-list.scroll { max-height: 352px; overflow-y: auto; }
.ap-cat, .ap-svc { display: flex; align-items: center; gap: 12px; width: 100%; text-align: start; background: var(--ap-color-surface);
  border: 0; border-top: 1px solid var(--ap-color-border); padding: 12px 14px; font: inherit; color: var(--ap-color-text);
  cursor: pointer; transition: background var(--ap-motion-standard); }
.ap-cat:first-child, .ap-svc:first-child { border-top: 0; }
.ap-cat:hover, .ap-svc:hover { background: var(--ap-color-row-hover); }
.ap-cat .txt { flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 14px; }
.ap-cat .txt .ap-item-title { display: block; }
.ap-cat .txt small { margin-left: auto; font-size: var(--ap-font-size-sm); color: var(--ap-color-text-soft); white-space: nowrap; }
.ap-cat .chev { color: var(--ap-color-text-soft); }
.ap-cat .chev svg:dir(rtl) { transform: scaleX(-1); }
.ap-svc { align-items: flex-start; }
.ap-svc .txt { flex: 1; min-width: 0; }
.ap-svc .txt .ap-item-title { display: block; }
.ap-svc .txt small { display: block; font-size: var(--ap-font-size-sm); color: var(--ap-color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ap-svc .txt .path { color: var(--ap-color-text-soft); }
.ap-svc .meta { flex: 0 0 auto; text-align: end; line-height: 1.3; }
.ap-svc .meta .price { display: block; font-size: var(--ap-font-size-body); font-weight: var(--ap-font-weight-semibold); font-variant-numeric: tabular-nums; }
.ap-svc .meta .dur { display: block; font-size: var(--ap-font-size-xs); color: var(--ap-color-text-muted); }
.ap-svc.is-single { align-items: center; }
.ap-svc.no-price .meta .dur { font-size: var(--ap-font-size-sm); color: var(--ap-color-text-muted); }
.ap-svc[aria-pressed="true"] { background: var(--ap-color-accent-subtle); }
.ap-svc .tick { flex: 0 0 auto; width: var(--ap-size-selection); height: var(--ap-size-selection); border-radius: 50%;
  border: 1.5px solid var(--ap-color-border-strong); display: grid; place-items: center; margin-inline-start: 2px; }
.ap-svc[aria-pressed="true"] .tick { border-color: var(--ap-color-accent); background: var(--ap-color-accent); color: var(--ap-color-on-accent); }
.ap-svc .tick svg { width: 11px; height: 11px; opacity: 0; }
.ap-svc[aria-pressed="true"] .tick svg { opacity: 1; }
.ap-av { position: relative; flex: 0 0 auto; width: var(--ap-staff-av, 40px); height: var(--ap-staff-av, 40px);
  border-radius: 50%; display: grid; place-items: center; overflow: hidden; font-size: var(--ap-font-size-sm);
  font-weight: var(--ap-font-weight-semibold); line-height: 1;
  background: var(--ap-color-avatar-surface); color: var(--ap-color-text-muted); }
.ap-av-img { position: absolute; inset: 0; width: 100%; height: 100%; display: block;
  object-fit: cover; border-radius: 50%; opacity: 0; }
.ap-av-img.is-loaded { opacity: 1; }
.ap-staff-list { border: 1px solid var(--ap-color-border-control); border-radius: var(--ap-radius-control); overflow: hidden;
  --ap-staff-av: 44px; --ap-staff-pad: 14px; --ap-staff-gap: 12px; }
.ap-staff-list.scroll { max-height: 352px; overflow-y: auto; }
.ap-staff-item { display: flex; align-items: stretch; background: var(--ap-color-surface);
  border-top: 1px solid var(--ap-color-border); min-width: 0; }
.ap-staff-item:first-child { border-top: 0; }
.ap-staff-item.is-sel { background: var(--ap-color-accent-subtle); }
.ap-staff-btn { flex: 1; display: flex; align-items: center; gap: var(--ap-staff-gap); width: 100%; text-align: start;
  background: none; border: 0; padding: 11px var(--ap-staff-pad); font: inherit; color: var(--ap-color-text);
  cursor: pointer; transition: background var(--ap-motion-standard); min-width: 0; }
.ap-staff-btn:hover { background: var(--ap-color-row-hover); }
.ap-staff-item.is-sel .ap-staff-btn:hover { background: transparent; }
.ap-staff-txt { flex: 1; min-width: 0; }
.ap-staff-name { display: block; font-size: var(--ap-font-size-item); font-weight: var(--ap-font-weight-semibold);
  line-height: 1.35; overflow-wrap: anywhere; }
.ap-staff-role { display: block; font-size: var(--ap-font-size-sm); color: var(--ap-color-text-muted);
  line-height: 1.4; overflow-wrap: anywhere; }
.ap-staff-mark { flex: 0 0 auto; width: var(--ap-staff-av); height: var(--ap-staff-av); border-radius: var(--ap-radius-control);
  display: grid; place-items: center; background: var(--ap-color-surface-muted); color: var(--ap-color-text-soft); }
.ap .ap-staff-mark svg { width: 20px; height: 20px; }
.ap-staff-item.any .ap-staff-name { font-weight: var(--ap-font-weight-medium); }
.ap-staff-item.is-sel .ap-staff-mark { background: var(--ap-color-accent-soft); color: var(--ap-color-accent); }
.ap-staff-tick { flex: 0 0 auto; width: var(--ap-size-selection); height: var(--ap-size-selection); border-radius: 50%;
  border: 1.5px solid var(--ap-color-border-strong); display: grid; place-items: center; margin-inline-start: 2px; }
.ap-staff-item.is-sel .ap-staff-tick { border-color: var(--ap-color-accent); background: var(--ap-color-accent); color: var(--ap-color-on-accent); }
.ap .ap-staff-tick svg { width: 11px; height: 11px; opacity: 0; }
.ap-staff-item.is-sel .ap-staff-tick svg { opacity: 1; }
.ap-staff-info { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  min-width: 44px; padding: 0 12px; background: none; border: 0; border-inline-start: 1px solid var(--ap-color-border);
  font: inherit; font-size: var(--ap-font-size-xs); color: var(--ap-color-accent-text); cursor: pointer;
  transition: background var(--ap-motion-standard); }
.ap-staff-info:hover { background: var(--ap-color-row-hover); }
.ap .ap-staff-info svg { width: 16px; height: 16px; }
.ap-staff-info-t { display: none; white-space: nowrap; }
.ap-staff-info-ghost { visibility: hidden; pointer-events: none; border-inline-start-color: transparent; }
.ap-staff-btn > .ap-staff-info-ghost { align-self: stretch; margin-inline-start: calc(var(--ap-staff-pad) - var(--ap-staff-gap));
  margin-inline-end: calc(-1 * var(--ap-staff-pad)); }
@container apmain (min-width: 380px) { .ap-staff-info-t { display: inline; } }
@container apmain (min-width: 400px) {
  .ap-staff-list.cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;
    border: 0; border-radius: 0; overflow: visible; max-height: none; --ap-staff-av: 72px; --ap-staff-pad: 12px; }
  .ap-staff-list.cards .ap-staff-item { position: relative; border: 1px solid var(--ap-color-border-control);
    border-radius: var(--ap-radius-control); overflow: hidden; display: flex; flex-direction: column; }
  .ap-staff-list.cards .ap-staff-item.is-sel { border-color: var(--ap-color-accent-border); }
  .ap-staff-list.cards .ap-staff-info { position: absolute; top: 6px; inset-inline-start: 6px; z-index: 1;
    border: 0; border-radius: 50%; width: 24px; height: 24px; min-width: 0; padding: 0; }
  .ap-staff-list.cards .ap-staff-info:hover { background: var(--ap-color-surface-muted); }
  .ap-staff-list.cards .ap-staff-info-t { display: none; }
  .ap .ap-staff-list.cards .ap-staff-info svg { width: 18px; height: 18px; }
  .ap-staff-list.cards .ap-staff-info::after { content: ""; position: absolute; inset: -5px; }
  .ap-staff-list.cards .ap-staff-info-ghost { display: none; }
  .ap-staff-list.cards .ap-staff-btn { flex-direction: column; align-items: center; text-align: center; gap: 9px;
    padding: 16px 12px 13px; flex: 1; }
  .ap-staff-list.cards .ap-staff-txt { width: 100%; min-width: 0; flex: 0 1 auto; }
  .ap-staff-list.cards .ap-staff-name { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden; overflow-wrap: anywhere; word-break: break-word; }
  .ap-staff-list.cards .ap-staff-role { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
  .ap-staff-list.cards .ap-staff-tick { position: absolute; top: 9px; inset-inline-end: 9px; margin: 0;
    background: var(--ap-color-surface); }
  .ap-staff-list.cards .ap-staff-item.is-sel .ap-staff-tick { background: var(--ap-color-accent); }
  .ap-staff-list.cards .ap-staff-item.any { grid-column: 1 / -1; --ap-staff-av: 44px; }
  .ap-staff-list.cards .ap-staff-item.any .ap-staff-btn { flex-direction: row; text-align: start; align-items: center;
    gap: 12px; padding: 11px 14px; }
  .ap-staff-list.cards .ap-staff-item.any .ap-staff-tick { position: static; margin-inline-start: 2px; background: none; }
  .ap-staff-list.cards .ap-staff-item.any.is-sel .ap-staff-tick { background: var(--ap-color-accent); }
  .ap-staff-list.cards .ap-staff-item.any .ap-staff-name { -webkit-line-clamp: 1; }
  .ap-staff-list.cards.no-photos .ap-staff-btn { justify-content: center; min-height: 92px; gap: 4px; padding: 18px 14px; }
  .ap-staff-list.cards.no-photos .ap-staff-item.any .ap-staff-btn { min-height: 0; justify-content: flex-start; }
}
@container apmain (min-width: 600px) {
  .ap-staff-list.cards { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@container apmain (min-width: 400px) {
  .ap-staff-list.cards.cols-1 { grid-template-columns: minmax(0, 1fr); }
}
@container apmain (min-width: 600px) {
  .ap-staff-list.cards.cols-1 { grid-template-columns: minmax(0, 1fr); }
  .ap-staff-list.cards.cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@container apmain (max-width: 399.98px) {
  .ap-staff-list.cards { max-height: 352px; overflow-y: auto; }
  .ap-staff-list { --ap-staff-av: 36px; --ap-staff-pad: 10px; --ap-staff-gap: 10px; }
  .ap-svc .txt small { white-space: normal; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
}
.ap-modal { position: absolute; inset: 0; z-index: 40; display: flex; align-items: flex-start; justify-content: center; padding: 20px; }
.ap-modal-scrim { position: absolute; inset: 0; background: color-mix(in srgb, var(--ap-color-inverse-surface) 46%, transparent); }
.ap-modal-panel { position: sticky; top: calc(20px + var(--ap-sticky-offset, 0px)); display: flex; flex-direction: column;
  width: min(460px, 100%); max-height: calc(100vh - 40px - var(--ap-sticky-offset, 0px)); min-height: 0;
  background: var(--ap-color-surface); border: 1px solid var(--ap-color-border-strong);
  border-radius: var(--ap-radius-control); overflow: hidden;
  animation: apModalIn var(--ap-motion-standard) both; }
@keyframes apModalIn { from { opacity: 0; transform: translateY(6px); } }
.ap-modal-head { display: flex; align-items: flex-start; gap: 14px; padding: 16px 16px 14px;
  border-bottom: 1px solid var(--ap-color-border); }
.ap-modal-head .ap-av { --ap-staff-av: 64px; font-size: var(--ap-font-size-body); }
.ap-modal-id { flex: 1; min-width: 0; }
.ap-modal-name { margin: 2px 0 0; font-size: var(--ap-font-size-subheading); font-weight: var(--ap-font-weight-semibold);
  line-height: var(--ap-line-height-title); letter-spacing: var(--ap-letter-spacing-title); overflow-wrap: anywhere; }
.ap-modal-role { margin: 3px 0 0; font-size: var(--ap-font-size-sm); color: var(--ap-color-text-muted); }
.ap-modal-x { flex: 0 0 auto; width: var(--ap-size-control-compact); height: var(--ap-size-control-compact);
  display: grid; place-items: center; background: none; border: 1px solid var(--ap-color-border-control);
  border-radius: var(--ap-radius-control); color: var(--ap-color-text-muted); cursor: pointer; }
.ap-modal-x:hover { background: var(--ap-color-surface-subtle); color: var(--ap-color-text); }
.ap .ap-modal-x svg { width: 14px; height: 14px; }
.ap-modal-body { flex: 1; min-height: 0; overflow-y: auto; padding: 14px 16px 16px; }
.ap-modal-bio { margin: 0; font-size: var(--ap-font-size-sm); line-height: 1.55; color: var(--ap-color-text-muted);
  white-space: pre-line; overflow-wrap: anywhere; }
.ap-modal-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 16px; border-top: 1px solid var(--ap-color-border); }
@container apw (max-width: 519.98px) {
  .ap-modal { padding: 0; align-items: flex-end; }
  .ap-modal-panel { width: 100%; top: auto; bottom: 0;
    max-height: min(92%, calc(100vh - 20px - var(--ap-sticky-offset, 0px)));
    border-inline-width: 0; border-bottom-width: 0;
    border-radius: var(--ap-radius-control) var(--ap-radius-control) 0 0; }
  .ap-modal-foot .ap-primary { flex: 1; }
}
.ap-empty { padding: 26px 14px; text-align: center; color: var(--ap-color-text-muted); font-size: var(--ap-font-size-body); }
.ap-fixed { display: flex; align-items: center; gap: 12px; border: 1px solid var(--ap-color-border-control);
  border-radius: var(--ap-radius-control); padding: 12px; margin: 0 0 16px; }
.ap-fixed .mark { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center;
  background: var(--ap-color-accent-soft); color: var(--ap-color-accent); font-weight: var(--ap-font-weight-semibold); font-size: var(--ap-font-size-sm); }
.ap-fixed b { display: block; font-size: var(--ap-font-size-sm); }
.ap-fixed small { display: block; color: var(--ap-color-text-muted); font-size: var(--ap-font-size-xs); }
.ap-cal-head { display: flex; align-items: center; justify-content: space-between; margin: 0 0 12px; }
.ap-cal-period { margin: 0; font-size: var(--ap-font-size-item); font-weight: var(--ap-font-weight-semibold);
  line-height: var(--ap-line-height-title); color: var(--ap-color-heading); }
.ap-cal-nav { display: flex; gap: 4px; }
.ap-cal-nav button { width: var(--ap-size-calendar-nav); height: var(--ap-size-calendar-nav); border: 1px solid var(--ap-color-border-control);
  background: var(--ap-color-surface); border-radius: var(--ap-radius-small); color: var(--ap-color-text); cursor: pointer; display: grid; place-items: center; }
.ap-cal-nav button:hover:not(:disabled) { background: var(--ap-color-surface-subtle); }
.ap-cal-nav button:disabled { color: var(--ap-color-text-soft); cursor: not-allowed; opacity: .55; }
.ap-dow { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); border-bottom: 1px solid var(--ap-color-border); }
.ap-dow > span { text-align: center; padding: 6px 0 8px; font-size: var(--ap-font-size-xs); font-weight: var(--ap-font-weight-medium); color: var(--ap-color-text-soft); }
.ap-dow .i { display: none; }
@container apw (max-width: 519.98px) {
  .ap-dow .w { display: none; }
  .ap-dow .i { display: inline; }
}
.ap-cal { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 2px; margin-top: 8px; }
.ap-day { position: relative; height: var(--ap-size-control); display: flex; flex-direction: column; align-items: center;
  justify-content: center; border: 0; background: none; font: inherit; font-size: var(--ap-font-size-body);
  font-weight: var(--ap-font-weight-medium); color: var(--ap-color-text); cursor: pointer; border-radius: var(--ap-radius-small);
  transition: background var(--ap-motion-standard), color var(--ap-motion-standard); }
.ap-day .n { font-variant-numeric: tabular-nums; line-height: 1; white-space: nowrap; }
.ap-day:hover:not(:disabled):not(.sel) { background: var(--ap-color-surface-subtle); }
.ap-day.today .n { position: relative; }
.ap-day.today .n::after { content: ""; position: absolute; left: 50%; bottom: -5px; transform: translateX(-50%); width: 4px; height: 4px; border-radius: 50%; background: var(--ap-color-accent); }
.ap-day:disabled { color: color-mix(in srgb, var(--ap-color-text-soft) 50%, var(--ap-color-surface)); font-weight: var(--ap-font-weight-regular); cursor: not-allowed; }
.ap-day.sel { background: var(--ap-color-accent); color: var(--ap-color-on-accent); font-weight: var(--ap-font-weight-semibold); }
.ap-day.sel.today .n::after { background: var(--ap-color-on-accent); }
.ap-slots-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin: 20px 0 12px; padding-top: 20px; border-top: 1px solid var(--ap-color-border); }
.ap-slots-head .ap-item-title { font-size: var(--ap-font-size-body); }
.ap-slots-day { color: var(--ap-color-accent-text); }
.ap-slots-tz { margin: 12px 0 0; }
.ap-slots-count { flex: 0 0 auto; font-size: var(--ap-font-size-xs); color: var(--ap-color-text-soft); font-variant-numeric: tabular-nums; white-space: nowrap; }
.ap-tz { position: relative; display: inline-flex; align-items: baseline; gap: 5px;
  font-size: var(--ap-font-size-xs); color: var(--ap-color-text-soft); }
.ap-tz-change, .ap-tz-pop-close { padding: 0; border: 0; background: none; font: inherit; cursor: pointer; }
.ap-tz-change { color: var(--ap-color-accent); text-decoration: underline; text-underline-offset: 2px; }
.ap-tz-pop-close { font-size: var(--ap-font-size-body); line-height: 1; color: var(--ap-color-text-soft); }
.ap-tz-change:hover, .ap-tz-pop-close:hover { color: var(--ap-color-text); }
.ap-studio-line { margin: 4px 0 0; font-size: var(--ap-font-size-xs); color: var(--ap-color-text-muted); }
.ap-tz-pop { position: absolute; z-index: 30; top: calc(100% + 6px); inset-inline-start: 0; width: 264px; max-width: 78vw;
  display: flex; flex-direction: column; gap: 10px; padding: 16px; text-align: start;
  border-radius: var(--ap-radius-control); background: var(--ap-color-canvas);
  box-shadow: var(--ap-shadow-md); }
.ap-tz-pop.up { top: auto; bottom: calc(100% + 6px); }
.ap-tz-pop-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ap-tz-pop-title { color: var(--ap-color-text); }
.ap-tz-search { width: 100%; height: var(--ap-size-control-compact); padding: 0 9px; font: inherit; font-size: var(--ap-font-size-xs);
  border: 1px solid var(--ap-color-border-control); border-radius: var(--ap-radius-control); outline: none;
  background: var(--ap-color-surface); color: var(--ap-color-text); }
.ap .ap-tz-search:focus, .ap .ap-tz-search:focus-visible { outline: none; box-shadow: none; border-color: var(--ap-color-accent); }
.ap-tz-list { max-height: 240px; overflow-y: auto; overscroll-behavior: contain; }
.ap-tz-group + .ap-tz-group { margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--ap-color-border); }
.ap-tz-pop-title, .ap-tz-group-head { font-weight: var(--ap-font-weight-semibold); }
.ap-tz-group-head { padding: 3px 6px; font-size: var(--ap-font-size-badge); }
.ap-tz-opt, .ap-tz-empty, .ap-tz-count { display: block; width: 100%; margin: 0; padding: 6px; border: 0; background: none;
  font: inherit; font-size: var(--ap-font-size-xs); color: var(--ap-color-text); text-align: start; }
.ap-tz-opt { border-radius: var(--ap-radius-small); cursor: pointer; }
.ap-tz-opt:hover { background: var(--ap-color-row-hover); }
.ap-tz-opt.is-current { background: var(--ap-color-accent-subtle); color: var(--ap-color-accent); font-weight: var(--ap-font-weight-semibold); }
.ap-tz-empty, .ap-tz-count { color: var(--ap-color-text-muted); }
.ap-slots { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.ap-slot { height: var(--ap-size-control-compact); display: grid; place-items: center; border: 1px solid var(--ap-color-border-control);
  border-radius: var(--ap-radius-small); background: var(--ap-color-surface); font: inherit; font-size: var(--ap-font-size-sm);
  color: var(--ap-color-text); cursor: pointer; font-variant-numeric: tabular-nums; transition: border-color var(--ap-motion-standard), background var(--ap-motion-standard); }
.ap-slot:hover { border-color: var(--ap-color-accent); background: var(--ap-color-accent-subtle); }
.ap-slot[aria-checked="true"] { border-color: var(--ap-color-accent); background: var(--ap-color-accent); color: var(--ap-color-on-accent); font-weight: var(--ap-font-weight-semibold); }
.ap-noslot { padding: 22px 12px; text-align: center; color: var(--ap-color-text-muted); font-size: var(--ap-font-size-body); border: 1px dashed var(--ap-color-border); border-radius: var(--ap-radius-control); }
@container apw (max-width: 619.98px) {
  .ap-slots { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .ap-slot { padding: 0 4px; white-space: nowrap; }
}
@container apw (max-width: 339.98px) {
  .ap-main, .ap-intro-body { padding: 12px; }
  .ap-day { font-size: var(--ap-font-size-sm); }
  .ap-foot { flex-wrap: wrap; }
  .ap-primary { min-width: 0; flex: 1 1 auto; }
  .ap-slots { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
.ap-consent { display: flex; align-items: flex-start; gap: 9px; margin: 4px 0 12px; font-size: var(--ap-font-size-sm); color: var(--ap-color-text-muted); cursor: pointer; }
.ap-consent input { width: var(--ap-size-selection); height: var(--ap-size-selection); margin: 1px 0 0; flex: 0 0 auto; }
.ap-consent .req { color: var(--ap-color-danger); }
.ap-honeypot { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
.ap-pay { display: flex; align-items: flex-start; gap: 11px; border: 1px solid var(--ap-color-border-control);
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
.ap-pay.locked { cursor: default; opacity: .55; }
.ap-card-shell { margin: 12px 0; border: 1px solid var(--ap-color-border-control); border-radius: var(--ap-radius-control);
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
.ap-sum-title { font-size: var(--ap-font-size-item); font-weight: var(--ap-font-weight-semibold);
  letter-spacing: var(--ap-letter-spacing-title); color: var(--ap-color-heading); line-height: var(--ap-line-height-title); margin: 0 0 16px; }
.ap-sum-svc, .ap-sum-start { font-size: var(--ap-font-size-control); font-weight: var(--ap-font-weight-medium); margin: 0 0 2px; }
.ap-sum-sub { font-size: var(--ap-font-size-sm); color: var(--ap-color-text-muted); margin: 0 0 16px; }
.ap-line { display: flex; align-items: baseline; gap: 5px; margin: 5px 0; font-size: var(--ap-font-size-sm); }
.ap-line .l { color: var(--ap-color-text-muted); white-space: nowrap; }
.ap-line .d { flex: 1; border-bottom: 1px dotted var(--ap-color-border-strong); transform: translateY(-3px); }
.ap-line .v { color: var(--ap-color-text); font-variant-numeric: tabular-nums; white-space: nowrap; text-align: end; }
.ap-sum-item { display: flex; align-items: flex-start; gap: 10px; margin: 0 0 12px; }
.ap .ap-sum-item > svg { width: 16px; height: 16px; margin-top: calc((var(--ap-font-size-sm) * 1.45 - 16px) / 2 + 1px); color: var(--ap-color-text-soft); }
.ap-sum-item .ap-sum-sub { margin: 0; min-width: 0; line-height: var(--ap-line-height-body); }
.ap-sum-item .k { color: var(--ap-color-text); font-weight: var(--ap-font-weight-medium); }
.ap-sum-when { flex: 1; min-width: 0; }
.ap-sum-when .ap-line { margin: 0; }
.ap-sum-help { margin: 16px 0 0; padding-top: 16px; border-top: 1px solid var(--ap-color-border); font-size: var(--ap-font-size-sm); }
.ap-aside .ap-sum-help { margin-top: auto; }
.ap-aside .ap-summary-body > :has(+ .ap-sum-help) { margin-bottom: 24px; }
.ap-sum-help .t { margin: 0 0 2px; font-weight: var(--ap-font-weight-semibold); color: var(--ap-color-text); }
.ap-sum-help .c { margin: 0; color: var(--ap-color-text-muted); }
.ap-sum-help a { color: var(--ap-color-text); text-decoration: none; font-weight: var(--ap-font-weight-medium); white-space: nowrap;
  transition: color var(--ap-motion-standard); }
.ap-sum-help a:hover { color: var(--ap-color-accent-text); }
.ap-sum-biz { margin: 8px 0 0; font-size: var(--ap-font-size-xs); color: var(--ap-color-text-soft); }
.ap-sum-total { display: flex; justify-content: space-between; gap: 10px; margin-top: 12px; padding-top: 12px;
  border-top: 1px solid var(--ap-color-border); font-weight: var(--ap-font-weight-semibold); font-size: var(--ap-font-size-sm); }
.ap-sum-total .v { font-variant-numeric: tabular-nums; }
.ap-sum-empty { font-size: var(--ap-font-size-sm); color: var(--ap-color-text-soft); line-height: 1.5; }
.ap-sum-start + .ap-sum-empty { max-width: 22ch; margin: 2px 0 0; }
.ap-summary-body { min-height: 0; }
.ap-sum-sec { margin: 16px 0 0; }
.ap-sum-sec > .ap-sum-total:first-child { margin-top: 0; }
.ap-aside .ap-summary-body { display: flex; flex: 1; flex-direction: column; min-height: 0; }
.ap-aside .ap-sum-scroll { min-height: 0; overflow-y: auto; overflow-wrap: anywhere; margin-inline-end: -5px; padding-inline-end: 5px; }
.ap-aside .ap-sum-sec { flex: 0 0 auto; }
.ap-aside .ap-line { flex-wrap: wrap; }
.ap-aside .ap-line .v { margin-inline-start: auto; }
.ap-line.when { display: block; margin: 0; }
.ap-line.when .l { display: block; color: var(--ap-color-text); font-weight: var(--ap-font-weight-medium); }
.ap-line.when .d { display: none; }
.ap-line.when .v { display: block; text-align: start; white-space: normal; }
.ap-line.when + .ap-sum-biz { margin-top: 2px; }
.ap-done { text-align: center; padding: 6px 0 2px; }
.ap-check { width: 52px; height: 52px; margin: 0 auto 12px; border-radius: 50%; display: grid; place-items: center; color: var(--ap-color-on-inverse); background: var(--ap-color-success); }
.ap-check.is-neutral { color: var(--ap-color-text-muted); background: var(--ap-color-avatar-surface); }
.ap-check svg { width: 26px; height: 26px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.ap-done h2 { margin: 0 0 3px; color: var(--ap-color-heading); font-size: var(--ap-font-size-heading); font-weight: var(--ap-font-weight-semibold); letter-spacing: var(--ap-letter-spacing-title); }
.ap-done .lead { margin: 0; color: var(--ap-color-text-muted); font-size: var(--ap-font-size-body); }
.ap-done .tz { margin: 4px 0 0; font-size: var(--ap-font-size-sm); color: var(--ap-color-text-soft); }
.ap-order { display: inline-block; margin: 12px 0 0; font-size: var(--ap-font-size-xs); font-weight: var(--ap-font-weight-semibold);
  letter-spacing: .04em; color: var(--ap-color-text-muted); background: var(--ap-color-surface-muted); border-radius: var(--ap-radius-pill); padding: 4px 11px; }
.ap-order-code { color: var(--ap-color-text); font-weight: var(--ap-font-weight-semibold); }
.ap-conf-card { display: flex; align-items: center; gap: 14px; text-align: start; border: 1px solid var(--ap-color-border-control); border-radius: var(--ap-radius-control); padding: 13px 14px; margin: 18px 0 0; }
.ap-conf-total { display: flex; justify-content: space-between; gap: 10px; margin: 0; padding: 12px 14px;
  border: 1px solid var(--ap-color-border-control); border-top: 0; border-radius: 0 0 var(--ap-radius-control) var(--ap-radius-control);
  font-size: var(--ap-font-size-sm); font-weight: var(--ap-font-weight-semibold); font-variant-numeric: tabular-nums; }
.ap-conf-card:has(+ .ap-conf-total) { border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
.ap-tile { flex: 0 0 auto; width: 50px; text-align: center; border: 1px solid var(--ap-color-border-control); border-radius: var(--ap-radius-small); overflow: hidden; }
.ap-tile .d { font-size: 18px; font-weight: var(--ap-font-weight-semibold); padding: 5px 0 3px; line-height: 1; font-variant-numeric: tabular-nums; }
.ap-tile .m { font-size: var(--ap-font-size-xs); font-weight: var(--ap-font-weight-medium); letter-spacing: .04em; text-transform: uppercase; color: var(--ap-color-text-muted); background: var(--ap-color-surface-muted); padding: 3px 0; }
.ap-conf-card .info .ap-item-title { display: block; }
.ap-conf-card .info small { display: block; font-size: var(--ap-font-size-sm); color: var(--ap-color-text-muted); }
.ap-conf-card .info small.tz { font-size: var(--ap-font-size-xs); color: var(--ap-color-text-soft); }
.ap-cal-tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 16px 0 14px; }
.ap-cal-tile { display: flex; flex-direction: column; align-items: center; gap: 5px; border: 1px solid var(--ap-color-border-control);
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
@container apw (max-width: 619.98px) {
  .ap-cal-tiles { grid-template-columns: repeat(2, 1fr); }
  .ap-conf-actions { flex-direction: column; align-items: center; gap: 8px; }
}
@media (prefers-reduced-motion: reduce) {
  .ap-recap-panel, .ap-recap-chev svg { transition: none; }
  .ap-sk::after, .ap-spin { animation: none; opacity: 1; transform: none; }
  .ap-modal-panel { animation: none; }
}
@media (forced-colors: active) {
  .ap-consent input, .ap-select {
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
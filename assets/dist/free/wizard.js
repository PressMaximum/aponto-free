/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./assets/src/wizard/Chrome.jsx"
/*!**************************************!*\
  !*** ./assets/src/wizard/Chrome.jsx ***!
  \**************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   BrandLogo: () => (/* binding */ BrandLogo),
/* harmony export */   STEPS: () => (/* binding */ STEPS),
/* harmony export */   StepProgress: () => (/* binding */ StepProgress),
/* harmony export */   WizardHeader: () => (/* binding */ WizardHeader),
/* harmony export */   stepLabels: () => (/* binding */ stepLabels),
/* harmony export */   stepStates: () => (/* binding */ stepStates)
/* harmony export */ });
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__);
/**
 * Full-screen wizard page chrome (SPEC-P1 §4).
 *
 * The wizard used to render as a narrow column inside the ordinary `.wrap`, wedged next to the
 * admin menu. It now takes the whole screen (the admin menu, admin bar, footer and every other
 * plugin's notices are suppressed on this screen only — see `WizardPage.php`), and this module owns
 * the chrome that replaces them: a full-width header carrying the brand, the six-step progress
 * indicator and the leave action.
 *
 * NOTHING here changes the flow. The header's "Exit setup" is wired to the SAME skip handler the
 * Welcome step's "I'll do it myself" already used — which is the server-side `skip` action that
 * auto-creates the owner-staff before redirecting (C12). It is a second door onto one existing
 * exit, not a new one.
 *
 * Progress is an ordered list so assistive technology gets the real "step 2 of 6" structure; the
 * current item carries `aria-current="step"` and completed items carry a screen-reader "Completed"
 * so the check glyph (decorative) is never the only signal. Three widths, one DOM:
 *
 *   - ≥961px — marker + label for all six steps;
 *   - 601–960px — markers, and only the CURRENT step keeps a visible label (translated labels can
 *     be much longer than the English ones, so the row must not depend on six of them fitting);
 *   - ≤600px — the list is screen-reader-only and the header shows the "Step 2 of 6" counter plus
 *     a progress track instead.
 */



/**
 * The six wizard steps, in order (SPEC-P1 §4). Same keys the app switches on.
 *
 * @type {string[]}
 */

const STEPS = ['welcome', 'business', 'hours', 'staff', 'service', 'done'];

/**
 * Short progress labels for the six steps.
 *
 * Deliberately shorter than each step's own heading ("Confirm your business info") — the indicator
 * is a location cue, not a second title. Built on call rather than at module scope so the strings
 * resolve after `wp_set_script_translations()` has installed the locale data.
 *
 * @return {string[]} Labels in step order.
 */
function stepLabels() {
  return [(0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Welcome', 'aponto'), (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Business', 'aponto'), (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Hours', 'aponto'), (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Staff', 'aponto'), (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Service', 'aponto'), (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Done', 'aponto')];
}

/**
 * Resolve every step's display state against the step being shown.
 *
 * Pure so the "which dot is filled" decision is unit-testable without a DOM: earlier steps read as
 * complete, the current one as current, later ones as upcoming. An out-of-range index is clamped
 * rather than producing a list with no current step.
 *
 * @param {number} index Zero-based index of the step on screen.
 * @return {Array<{key: string, label: string, state: string, position: number}>} Step descriptors.
 */
function stepStates(index) {
  const labels = stepLabels();
  const current = Math.min(Math.max(Number.isFinite(index) ? index : 0, 0), STEPS.length - 1);
  return STEPS.map((key, i) => ({
    key,
    label: labels[i],
    position: i + 1,
    state: i < current ? 'complete' : i === current ? 'current' : 'upcoming'
  }));
}

/**
 * The Aponto brand mark (icon + wordmark).
 *
 * The same artwork the admin shell renders (`assets/src/admin/App.jsx`; source
 * `docs/mockups/v4/assets/img/aponto-logo.svg`), inlined here rather than imported from the SPA so
 * the wizard bundle never pulls the admin app in behind it. Decorative: the header's own heading
 * names the product.
 *
 * @return {any} The logo element.
 */
function BrandLogo() {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("svg", {
    className: "aponto-wizard-logo",
    viewBox: "0 0 918 208",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": "true",
    focusable: "false",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("path", {
      d: "M386.272 165H348.64C347.8 160.8 345.28 151.56 342.088 139.968C332.68 139.8 323.272 139.8 316.048 139.8C309.328 139.8 299.584 139.8 290.344 139.968C286.984 150.888 284.464 160.128 283.288 165H248.512C260.608 133.584 285.64 57.144 291.52 39H342.256C348.304 57.312 373.168 132.912 386.272 165ZM297.4 116.28C304.12 116.28 310.84 116.28 316.048 116.28C321.256 116.28 328.312 116.28 335.2 116.112C331.504 103.344 327.472 89.904 323.944 78.984C320.248 68.736 318.064 60.672 316.384 54.96C314.536 60.672 312.016 68.568 308.488 79.32C305.296 90.408 301.264 103.512 297.4 116.28ZM419.612 188.352H387.692C388.196 171.384 388.196 137.952 388.196 111.744C388.196 92.592 388.196 77.472 387.86 63.192H419.444C419.444 66.216 419.276 68.736 419.276 71.256C419.276 73.608 419.108 75.96 418.94 78.312L420.284 78.816C426.164 68.232 437.42 61.512 454.388 61.512C480.428 61.512 492.86 79.992 492.86 113.76C492.86 147.696 477.74 166.68 453.884 166.68C436.412 166.68 425.492 159.96 419.78 151.56L419.108 151.728C419.276 156.096 419.276 160.128 419.276 165C419.276 165.168 419.276 165.336 419.276 165.672C419.276 173.232 419.444 180.456 419.612 188.352ZM462.62 113.928C462.62 93.096 455.732 85.704 442.796 85.704C429.188 85.704 418.772 92.592 418.772 110.232V136.608C424.316 140.136 431.54 141.984 441.116 141.984C455.9 141.984 462.62 134.592 462.62 113.928ZM605.288 112.416C605.288 146.016 585.128 167.184 551.36 167.184C517.76 167.184 498.104 146.016 498.104 112.416C498.104 78.648 519.272 60.84 551.36 60.84C583.448 60.84 605.288 78.648 605.288 112.416ZM575.048 113.424C575.048 94.944 565.976 87.384 551.36 87.384C536.912 87.384 527.672 94.44 527.672 113.424C527.672 132.24 536.744 140.808 551.36 140.808C566.312 140.808 575.048 131.904 575.048 113.424ZM717.821 165H686.069C686.405 150.72 686.573 130.56 686.573 106.536C686.573 92.592 682.037 87.216 669.269 87.216C656.501 87.216 646.757 93.936 646.757 111.24C646.757 143.664 646.925 154.92 647.093 165H615.509C616.013 150.72 616.013 138.288 616.013 114.936C616.013 92.928 615.845 77.136 615.509 63.192H647.261C647.093 69.408 646.925 73.776 646.589 79.488L647.597 79.656C653.813 67.056 665.573 61.68 682.373 61.68C705.053 61.68 717.653 72.264 717.653 99.648C717.653 114.096 717.317 121.32 717.317 130.392C717.317 143.16 717.317 153.912 717.821 165ZM766.725 63.696C776.805 63.528 788.229 63.528 798.477 63.192C798.141 71.088 797.805 82.008 797.973 90.072C790.581 89.904 778.653 89.568 766.389 89.4C766.221 100.824 766.221 113.088 766.221 126.528C766.221 135.768 770.085 138.96 779.997 138.96C786.381 138.96 792.429 137.616 797.301 135.6C797.805 144.504 799.653 155.424 800.661 162.816C791.589 164.832 786.045 166.344 775.125 166.344C745.725 166.344 735.813 151.392 735.813 130.392C735.813 119.304 736.149 102.672 736.317 89.064C732.621 88.896 729.261 88.896 726.573 88.896C726.573 88.392 726.573 87.888 726.573 87.384C726.573 81.336 726.573 72.768 726.405 67.392C737.157 64.368 755.301 52.776 766.389 41.52H767.397C767.061 48.576 766.893 55.968 766.725 63.696ZM911.166 112.416C911.166 146.016 891.006 167.184 857.238 167.184C823.638 167.184 803.982 146.016 803.982 112.416C803.982 78.648 825.15 60.84 857.238 60.84C889.326 60.84 911.166 78.648 911.166 112.416ZM880.926 113.424C880.926 94.944 871.854 87.384 857.238 87.384C842.79 87.384 833.55 94.44 833.55 113.424C833.55 132.24 842.622 140.808 857.238 140.808C872.19 140.808 880.926 131.904 880.926 113.424Z",
      fill: "#282828"
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("circle", {
      cx: "104",
      cy: "104",
      r: "104",
      fill: "#1C1C1C"
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("path", {
      d: "M85.8135 55.2393C93.8964 41.2393 114.104 41.2393 122.187 55.2393L161.685 123.652C169.768 137.652 159.664 155.152 143.498 155.152H64.5018C48.336 155.152 38.2323 137.652 46.3152 123.652L85.8135 55.2393Z",
      fill: "white"
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("circle", {
      cx: "144.413",
      cy: "87.8912",
      r: "29.2609",
      fill: "white",
      stroke: "#1C1C1C",
      strokeWidth: "11"
    })]
  });
}

/**
 * The completed-step check glyph. Decorative — the list item carries a screen-reader label.
 *
 * @return {any} The icon element.
 */
function CheckGlyph() {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("svg", {
    className: "aponto-wizard-step-check",
    viewBox: "0 0 16 16",
    "aria-hidden": "true",
    focusable: "false",
    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("path", {
      d: "m3.5 8.3 3 3 6-6.6",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    })
  });
}

/**
 * The six-step progress indicator.
 *
 * @param {Object} props       Component props.
 * @param {number} props.index Zero-based index of the step on screen.
 * @return {any} The progress element.
 */
function StepProgress({
  index
}) {
  const steps = stepStates(index);
  const current = steps.find(step => 'current' === step.state);
  const position = current ? current.position : 1;
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("nav", {
    className: "aponto-wizard-progress",
    "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Setup progress', 'aponto'),
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("ol", {
      className: "aponto-wizard-steps",
      children: steps.map(step => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("li", {
        className: 'aponto-wizard-step is-' + step.state,
        "data-step": step.key,
        "aria-current": 'current' === step.state ? 'step' : undefined,
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
          className: "aponto-wizard-step-marker",
          children: 'complete' === step.state ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(CheckGlyph, {}) : step.position
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
          className: "aponto-wizard-step-label",
          children: step.label
        }), 'complete' === step.state && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
          className: "aponto-wizard-sr",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Completed', 'aponto')
        })]
      }, step.key))
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("p", {
      className: "aponto-wizard-progress-compact",
      "aria-hidden": "true",
      children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: 1: current step, 2: total steps. */
      (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Step %1$d of %2$d', 'aponto'), position, steps.length)
    })]
  });
}

/**
 * The narrow-width progress track drawn along the header's bottom edge. Decorative.
 *
 * @param {Object} props          Component props.
 * @param {number} props.position 1-based position of the step on screen.
 * @param {number} props.total    Total number of steps.
 * @return {any} The track element.
 */
function ProgressTrack({
  position,
  total
}) {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
    className: "aponto-wizard-progress-track",
    "aria-hidden": "true",
    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
      className: "aponto-wizard-progress-fill",
      style: {
        width: Math.round(position / total * 100) + '%'
      }
    })
  });
}

/**
 * The full-width wizard header: brand · progress · exit.
 *
 * @param {Object}        props           Component props.
 * @param {number}        props.index     Zero-based index of the step on screen.
 * @param {Function|null} props.onExit    The existing skip/leave handler, or null to hide the action.
 * @param {boolean}       props.exitBusy  Whether a request is in flight (disables the exit action).
 * @return {any} The header element.
 */
function WizardHeader({
  index,
  onExit,
  exitBusy
}) {
  const states = stepStates(index);
  const current = states.find(step => 'current' === step.state);
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("header", {
    className: "aponto-wizard-header",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
      className: "aponto-wizard-brand",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(BrandLogo, {}), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
        className: "aponto-wizard-sr",
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Aponto', 'aponto')
      })]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(StepProgress, {
      index: index
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("div", {
      className: "aponto-wizard-header-end",
      children: onExit && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Button, {
        className: "aponto-wizard-exit",
        variant: "tertiary",
        disabled: exitBusy,
        onClick: onExit,
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Exit setup', 'aponto')
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(ProgressTrack, {
      position: current ? current.position : 1,
      total: states.length
    })]
  });
}

/***/ },

/***/ "./assets/src/wizard/DoneStep.jsx"
/*!****************************************!*\
  !*** ./assets/src/wizard/DoneStep.jsx ***!
  \****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DoneStep: () => (/* binding */ DoneStep),
/* harmony export */   bookingPageLinks: () => (/* binding */ bookingPageLinks),
/* harmony export */   dashboardUrl: () => (/* binding */ dashboardUrl)
/* harmony export */ });
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _ui_jsx__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./ui.jsx */ "./assets/src/wizard/ui.jsx");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__);
/**
 * Wizard step 6 — "Publish your booking page" + the completion action (SPEC-P1 §4 step 6).
 *
 * Three beta bugs lived in the old inline version of this step (report 2026-07-26):
 *
 *   1. the primary button only ever RE-POSTED the `page` action. Its label flipped to "Open booking
 *      page" once a page existed, but it carried no `href` and never navigated: clicking it looked
 *      like a dead button. The spec has always said "click again → open the existing page";
 *   2. every link came from an ABSOLUTE `get_permalink()`, i.e. bound to `home_url()`. An admin
 *      browsing on a different host than `siteurl` got a link their browser could not reach. The
 *      URLs are now same-origin relative (see `WizardService::pageInfo()`), computed server-side on
 *      every render — never a stale value carried in client state;
 *   3. there was no completion affordance at all. The funnel's `wizard_completed` stamp was only
 *      reachable as a side effect of creating a service, so a founder who skipped step 5 finished
 *      the flow into a collapsed menu with no way into the app. "Finish setup" now stamps it and
 *      routes to the dashboard.
 *
 * "Back" stays: the wizard's back-navigation semantics are per-step and harmless here, and no
 * wizard mockup exists to drop it (docs/mockups/v4 defers Settings/Onboarding — SPEC.md §7.9).
 *
 * Failure-mode guard: when a page exists but carries no usable address, NOTHING silently no-ops —
 * the open action is disabled and an explanatory warning is shown instead.
 */




/**
 * Normalize the page DTO into the links the step can actually render.
 *
 * Extracted so the "is this link safe to render" decision is one testable pure function: a page
 * whose `viewUrl` is missing/blank must never become an anchor with an empty `href` (which reloads
 * the current admin screen and reads as "the button does nothing").
 *
 * @param {Object|null} page Page DTO from the wizard state / `page` action.
 * @return {{hasPage: boolean, viewUrl: string, editUrl: string, openable: boolean}} Link state.
 */

function bookingPageLinks(page) {
  const read = key => page && 'string' === typeof page[key] ? page[key].trim() : '';
  const viewUrl = read('viewUrl');
  return {
    hasPage: Boolean(page),
    viewUrl,
    editUrl: read('editUrl'),
    openable: Boolean(page) && '' !== viewUrl
  };
}

/**
 * Where "Finish setup" lands: the Aponto app's dashboard route.
 *
 * The admin SPA is a hash router whose default route is already `dashboard`, but the hash is stated
 * explicitly so the destination does not depend on that default. An empty `adminUrl` (the bootstrap
 * could not build one) returns '' and the caller falls back to the in-place confirmation screen
 * rather than navigating nowhere.
 *
 * @param {string} adminUrl Relative Aponto app URL from the bootstrap.
 * @return {string} Dashboard URL, or '' when there is none.
 */
function dashboardUrl(adminUrl) {
  const base = 'string' === typeof adminUrl ? adminUrl.trim() : '';
  if ('' === base) {
    return '';
  }
  return base.includes('#') ? base : base + '#dashboard';
}

/**
 * Render step 6.
 *
 * @param {Object}      props              Component props.
 * @param {Object|null} props.page         Current booking-page DTO (null when none exists yet).
 * @param {boolean}     props.saving       Whether a request is in flight.
 * @param {Function}    props.busyLabel    Wraps a label into the shared "Saving…" spinner state.
 * @param {Function}    props.onBack       Go to the previous step.
 * @param {Function}    props.onCreatePage Create/publish the booking page.
 * @param {Function}    props.onFinish     Complete the wizard and go to the dashboard.
 * @param {Object}      props.headingRef   Ref the app focuses after a step change (SPEC-P1 §4).
 * @return {any} The step element.
 */
function DoneStep({
  page,
  saving,
  busyLabel,
  onBack,
  onCreatePage,
  onFinish,
  headingRef
}) {
  const links = bookingPageLinks(page);
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)(_ui_jsx__WEBPACK_IMPORTED_MODULE_2__.StepShell, {
    headingRef: headingRef,
    title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Publish your booking page', 'aponto'),
    subtitle: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Add the Aponto Booking Form block to any page — we can make one for you.', 'aponto'),
    footer: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Flex, {
      className: "aponto-wizard-actions",
      justify: "space-between",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.FlexItem, {
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Button, {
          variant: "tertiary",
          onClick: onBack,
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Back', 'aponto')
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Flex, {
        className: "aponto-wizard-actions-end",
        justify: "flex-end",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.FlexItem, {
          children: links.hasPage ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Button, {
            variant: "secondary",
            href: links.openable ? links.viewUrl : undefined,
            target: "_blank",
            rel: "noreferrer",
            disabled: !links.openable,
            "aria-disabled": !links.openable,
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Open booking page', 'aponto')
          }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Button, {
            variant: "secondary",
            disabled: saving,
            onClick: onCreatePage,
            children: busyLabel((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Create booking page', 'aponto'))
          })
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.FlexItem, {
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Button, {
            variant: "primary",
            disabled: saving,
            onClick: onFinish,
            children: busyLabel((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Finish setup', 'aponto'))
          })
        })]
      })]
    }),
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)("p", {
      className: "aponto-wizard-block-markup",
      children: ["<!-- wp:aponto/booking-form ", '{"align":"wide"}', " /-->"]
    }), links.hasPage && links.openable && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Notice, {
      status: "success",
      isDismissible: false,
      children: [(0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Your booking page is published and live.', 'aponto'), ' ', /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.ExternalLink, {
        href: links.viewUrl,
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('View page', 'aponto')
      }), '' !== links.editUrl && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.Fragment, {
        children: [' · ', /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.ExternalLink, {
          href: links.editUrl,
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Edit page', 'aponto')
        })]
      })]
    }), links.hasPage && !links.openable && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Notice, {
      status: "warning",
      isDismissible: false,
      children: [(0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Your booking page exists, but WordPress did not return a web address for it — check your permalink settings, then open the page from the Pages screen.', 'aponto'), ' ', '' !== links.editUrl && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.ExternalLink, {
        href: links.editUrl,
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Edit page', 'aponto')
      })]
    })]
  });
}

/***/ },

/***/ "./assets/src/wizard/api.js"
/*!**********************************!*\
  !*** ./assets/src/wizard/api.js ***!
  \**********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   REQUEST_TIMEOUT_MS: () => (/* binding */ REQUEST_TIMEOUT_MS),
/* harmony export */   wizardPost: () => (/* binding */ wizardPost)
/* harmony export */ });
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__);
/**
 * Onboarding-wizard admin-ajax client (SPEC-P1 §4).
 *
 * The wizard persists every step through ONE nonce-guarded admin-ajax action (`aponto_wizard`) —
 * no REST route (the rest-contract is frozen). This module owns that single request, extracted
 * from the wizard app so its failure contract is unit-testable (tests/js/wizard-api.test.js).
 */


/**
 * How long one wizard step may take before the client gives up (ms).
 *
 * Every step is one small admin-ajax write, and the server's own critical sections cap out at a
 * 5 s advisory-lock wait, so 30 s is far beyond any legitimate response. The timeout exists
 * because a request that NEVER settles left the Saving button spinning forever with no way out
 * and no diagnosis (beta report 2026-07-25): a hung PHP worker, a stalled loopback request, or a
 * proxy holding the connection open are all indistinguishable from "the button is broken".
 * Failing loudly after a bounded wait turns that dead end into a retryable error notice.
 */
const REQUEST_TIMEOUT_MS = 30000;

/**
 * POST one wizard step to admin-ajax; resolves the parsed `data` payload.
 *
 * FAIL LOUDLY, NEVER HANG. Every non-success outcome throws an Error whose message the caller
 * surfaces in the wizard's error Notice:
 *
 *   - the request is aborted after {@see REQUEST_TIMEOUT_MS} → "did not respond in time". The
 *     deadline covers the WHOLE exchange, body included: a server or proxy that sends the response
 *     HEADERS and then stalls the body is the same hang in a different place, and clearing the
 *     timer as soon as `fetch()` resolved would have left it wide open (Codex review round 2).
 *     Aborting the signal errors the response body stream too (Fetch standard: "abort" rejects an
 *     in-flight body read), so ONE deadline closes both halves; the timer is cleared only once the
 *     body has settled;
 *   - a transport failure (offline, connection reset) → "could not reach the server";
 *   - an HTTP error status (`res.ok === false`) → a failure REGARDLESS of the body shape, so a
 *     `500` that happens to carry `{"success":true}` can never be read as a saved step;
 *   - a non-JSON body (a PHP fatal, an HTML error page) → same;
 *   - `success` that is not exactly `true` → same. Note that a failed `check_ajax_referer()`
 *     replies with the bare body `-1`, which IS valid JSON: it parses to a truthy number with no
 *     `success` property, so the strict `true !== json.success` test is what rejects it.
 *
 * For all of those, the server's own `data.message` wins when it sent one (`wp_send_json_error()`
 * carries the actionable text, e.g. "You are not allowed to do this."); otherwise the message names
 * the HTTP status, so a beta report can identify the failure instead of "it spins forever".
 *
 * @param {Object} boot     The `window.apontoWizard` bootstrap (`ajaxUrl`, `action`, `nonce`).
 * @param {string} doAction The wizard step to run (`business`, `hours`, `skip`, …).
 * @param {Object} payload  Step fields; JSON-encoded into the `payload` field.
 * @return {Promise<Object>} The response `data` object.
 */
async function wizardPost(boot, doAction, payload) {
  const body = new URLSearchParams();
  body.set('action', boot.action);
  body.set('nonce', boot.nonce);
  body.set('do', doAction);
  body.set('payload', JSON.stringify(payload || {}));

  // AbortController exists in every browser WordPress 6.6 supports; guard anyway so a missing
  // implementation degrades to "no client timeout" instead of throwing before the request runs.
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;

  // `signal.aborted` (rather than the rejection's name) is what tells our own deadline apart from
  // a genuine transport error: we set it, and it is true for every abort implementation.
  const timedOut = () => null !== controller && controller.signal.aborted;
  const timeoutMessage = (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('The server did not respond in time. Please try again.', 'aponto');
  try {
    let res;
    try {
      res = await fetch(boot.ajaxUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString(),
        signal: controller ? controller.signal : undefined
      });
    } catch {
      throw new Error(timedOut() ? timeoutMessage : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Could not reach the server. Please check your connection and try again.', 'aponto'));
    }

    // Still inside the deadline: reading the body can hang on its own.
    let json;
    try {
      json = await res.json();
    } catch {
      if (timedOut()) {
        throw new Error(timeoutMessage);
      }
      // A body that is not JSON at all — a PHP fatal or an HTML error page.
      json = null;
    }
    if (!res.ok || !json || true !== json.success) {
      const data = json && json.data ? json.data : null;
      const failure = new Error(data && data.message ? data.message : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.sprintf)(/* translators: %d: HTTP status code of the failed request. */
      (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Something went wrong (HTTP %d). Please try again.', 'aponto'), res.status));

      // A REFUSED step (`WizardValidationException` — SPEC-P1 §4) also names the offending
      // fields: `data.fields` is a `{ field: message }` map the caller renders inline under the
      // control, so a server-side rejection reads like the client-side one instead of a bare
      // notice with no pointer to the field. Absent on every other failure.
      if (data && data.fields && 'object' === typeof data.fields) {
        failure.fields = data.fields;
      }
      throw failure;
    }
    return json.data || {};
  } finally {
    // Cleared only here — after the body settled, on every path.
    if (null !== timer) {
      clearTimeout(timer);
    }
  }
}

/***/ },

/***/ "./assets/src/wizard/ui.jsx"
/*!**********************************!*\
  !*** ./assets/src/wizard/ui.jsx ***!
  \**********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   FieldStack: () => (/* binding */ FieldStack),
/* harmony export */   StepShell: () => (/* binding */ StepShell)
/* harmony export */ });
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__);
/**
 * Shared wizard chrome (SPEC-P1 §4).
 *
 * `FieldStack` and `StepShell` used to live inside `index.js`; they moved here so individual steps
 * can be split into their own modules (and unit-tested in isolation) without importing the whole
 * app back into themselves.
 */


/**
 * Vertical rhythm for a step body. Every control passes
 * `__nextHasNoMarginBottom` (the wp-components default from 6.7 on), so
 * `BaseControl` contributes NO bottom margin and a plain `CardBody` stacked the
 * field blocks flush: each label sat glued to the previous field's input. One
 * column stack owns the spacing instead — `gap` is a multiplier of the 4px grid.
 * The default is 12px, not the 16px wp-components uses in core screens: with a
 * 4px label-to-control gap inside each field the groups still read apart, and
 * the 20px it saves across the Business step is what brings that step's commit
 * action back above the fold at 1280x800 (QA V8b).
 *
 * @param {Object}      props          Component props.
 * @param {any}         props.children Stacked field blocks.
 * @param {number}      props.gap      Grid multiplier for the gap (default 3 = 12px).
 * @return {any} The stack element.
 */

function FieldStack({
  children,
  gap = 3
}) {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Flex, {
    direction: "column",
    gap: gap,
    align: "stretch",
    justify: "flex-start",
    children: children
  });
}

/**
 * One wizard step: titled card, stacked body, footer with the step's actions.
 *
 * The title is the page's ONE `<h1>`: the full-screen chrome (SPEC-P1 §4) puts only the brand mark
 * in the header, and exactly one step is mounted at a time, so the step title is the page title.
 * It also carries `tabIndex={-1}` and accepts the app's `headingRef` so focus can be moved here on
 * every step change — otherwise a keyboard or screen-reader user who pressed "Continue" is left
 * with focus on a button that no longer exists and no announcement of where they landed.
 *
 * @param {Object} props            Component props.
 * @param {string} props.title      Step title.
 * @param {string} props.subtitle   Optional supporting line.
 * @param {any}    props.children   Step body.
 * @param {any}    props.footer     Step actions.
 * @param {Object} props.headingRef Ref the app focuses after a step change.
 * @param {string} props.variant    Optional card modifier class (`is-plain` drops the internal rules).
 * @param {number} props.gap        Grid multiplier for the body's field gap (default 3 = 12px).
 * @return {any} The card element.
 */
function StepShell({
  title,
  subtitle,
  children,
  footer,
  headingRef,
  variant = '',
  gap = 3
}) {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Card, {
    className: 'aponto-wizard-card' + (variant ? ' ' + variant : ''),
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardHeader, {
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("h1", {
          className: "aponto-wizard-title",
          ref: headingRef,
          tabIndex: -1,
          children: title
        }), subtitle && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("p", {
          className: "aponto-wizard-subtitle",
          children: subtitle
        })]
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardBody, {
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(FieldStack, {
        gap: gap,
        children: children
      })
    }), footer && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardFooter, {
      children: footer
    })]
  });
}

/***/ },

/***/ "./assets/src/admin/styles/aponto-tokens.css"
/*!***************************************************!*\
  !*** ./assets/src/admin/styles/aponto-tokens.css ***!
  \***************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
// extracted by mini-css-extract-plugin


/***/ },

/***/ "./assets/src/wizard/wizard.css"
/*!**************************************!*\
  !*** ./assets/src/wizard/wizard.css ***!
  \**************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
// extracted by mini-css-extract-plugin


/***/ },

/***/ "react/jsx-runtime"
/*!**********************************!*\
  !*** external "ReactJSXRuntime" ***!
  \**********************************/
(module) {

module.exports = window["ReactJSXRuntime"];

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
/*!************************************!*\
  !*** ./assets/src/wizard/index.js ***!
  \************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Wizard: () => (/* binding */ Wizard)
/* harmony export */ });
/* harmony import */ var _admin_styles_aponto_tokens_css__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../admin/styles/aponto-tokens.css */ "./assets/src/admin/styles/aponto-tokens.css");
/* harmony import */ var _wizard_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./wizard.css */ "./assets/src/wizard/wizard.css");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _api_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./api.js */ "./assets/src/wizard/api.js");
/* harmony import */ var _ui_jsx__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./ui.jsx */ "./assets/src/wizard/ui.jsx");
/* harmony import */ var _DoneStep_jsx__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./DoneStep.jsx */ "./assets/src/wizard/DoneStep.jsx");
/* harmony import */ var _Chrome_jsx__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./Chrome.jsx */ "./assets/src/wizard/Chrome.jsx");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__);
/**
 * Aponto onboarding wizard (SPEC-P1 §4) — React + @wordpress/components.
 *
 * A self-contained detect-and-confirm wizard: Welcome → Confirm business info →
 * Business hours → Staff → First service → Done. Every step can be skipped; the
 * flow can be re-entered later. Each step persists through ONE nonce-guarded
 * admin-ajax action (`aponto_wizard`) that delegates to the PHP WizardService — no
 * new REST route. The bootstrap payload (`window.apontoWizard`) carries the ajax
 * URL + nonce, the current funnel/prefill state, the timezone list and localized
 * weekday labels.
 *
 * The screen is a FULL-SCREEN takeover (the surrounding wp-admin menu, admin bar, footer and
 * notices are suppressed on this screen only — `WizardPage.php`): `Chrome.jsx` renders the
 * full-width header (brand · six-step progress · exit) and the step card is centered on both axes
 * in what is left. That chrome is built on the `aponto-wizard` class hooks this app already
 * carried for it, and it is styling only — every step, request and transition below is unchanged.
 *
 * The style stack loads with this entry (wizard.css + the shared `--ap-*` tokens) and only on this
 * screen, so the wizard reads as the same product as the admin SPA.
 */
// Design tokens first, then the wizard's own chrome. The token sheet is the product's single
// source for color/space/type roles (`--ap-*`); it is imported from the admin style folder rather
// than copied so the wizard can never drift from the SPA's palette.










const BOOT = typeof window !== 'undefined' && window.apontoWizard || {
  ajaxUrl: '',
  action: 'aponto_wizard',
  nonce: '',
  adminUrl: '',
  state: {},
  timezones: [],
  currencies: [],
  weekdays: {},
  weekStart: 1,
  multiStaff: false
};

/**
 * Whether this site already has unlimited staff (D-R28). Copy-only: it chooses between "you can
 * add the rest of your team" and the upsell line on the Staff step. Defaults to false, so a boot
 * payload older than this bundle keeps today's wording rather than promising a capability.
 */
const MULTI_STAFF = true === BOOT.multiStaff;

/**
 * POST one wizard step to admin-ajax; resolves the parsed `data` payload and THROWS on every
 * failure — including a response that never arrives, which used to spin the Saving button forever
 * (beta report 2026-07-25). The request contract lives in `./api.js` so it can be unit-tested.
 */
function apiPost(doAction, payload) {
  return (0,_api_js__WEBPACK_IMPORTED_MODULE_5__.wizardPost)(BOOT, doAction, payload);
}

/**
 * Client-side email shape — the SAME rule the booking form applies to the customer's address
 * (`assets/src/form/app.jsx`). It is a typo guard, not an authority: the server re-checks with
 * WordPress's `is_email()` and refuses the step on its own (SPEC-P1 §4 step 4, QA B).
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The `varchar(191)` width every name/email column in the schema uses, mirrored from
 * `Aponto\Rest\Args::MAX_191` (and `WizardService::MAX_NAME`) so the client refuses what the
 * server refuses instead of letting the database truncate.
 */
const MAX_FIELD = 191;

/** minutes → a clock label in the site's time format: `9:00 AM` (12h) or `09:00` (24h) — C7. */
function toClock(minutes, timeFormat) {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const pad = n => n < 10 ? '0' + n : '' + n;
  if (/a/i.test(String(timeFormat || ''))) {
    // h24===24 is the 1440 end-of-day option → 12:00 AM (next midnight).
    const ap = h24 < 12 || h24 === 24 ? 'AM' : 'PM';
    const h12 = h24 % 12 || 12;
    return h12 + ':' + pad(m) + ' ' + ap;
  }
  return pad(h24) + ':' + pad(m);
}

/** Build the 30-minute step-time menu, labelled in the site's format (C7). */
function buildTimeOptions(timeFormat) {
  const out = [];
  for (let m = 0; m <= 1440; m += 30) {
    out.push({
      label: toClock(m, timeFormat),
      value: String(m)
    });
  }
  return out;
}

/** ISO weekdays 1..7 ordered from the site's week-start setting (0=Sun..6=Sat). */
function orderedWeekdays(weekStart) {
  // Map the 0=Sun..6=Sat start into ISO 1..7 (Mon..Sun) order.
  const isoOrder = [1, 2, 3, 4, 5, 6, 7];
  const startIso = weekStart === 0 ? 7 : weekStart; // Sunday(0) → ISO 7.
  const idx = isoOrder.indexOf(startIso);
  return isoOrder.slice(idx).concat(isoOrder.slice(0, idx));
}
function Wizard() {
  const prefill = BOOT.state && BOOT.state.prefill || {};
  // Resume where the founder left off (C10 — finding U4: reopening dropped you back at Welcome even
  // though the data was kept). Clamped into the STEP RANGE, 0..last: 0 (never saved / after "Start
  // over") lands on Welcome, and the LAST step is a legitimate destination — after a completed run
  // the stored cursor is `STEPS.length - 1` (`done`), the step that owns "Create booking page",
  // which is exactly what the dashboard's "Create your booking page" card links to with `reopen=1`.
  // The old bound (`STEPS.length - 2`) clamped that cursor down to `service` and dropped the
  // founder into an empty "Add your first service" form, three Skips away from the action they
  // asked for (beta report 2026-08-01, QA C).
  const [index, setIndex] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)(() => {
    const resume = Number(BOOT.state && BOOT.state.resumeStep);
    if (!Number.isFinite(resume)) {
      return 0;
    }
    return Math.min(Math.max(resume, 0), _Chrome_jsx__WEBPACK_IMPORTED_MODULE_8__.STEPS.length - 1);
  });
  const [saving, setSaving] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)(false);
  const [error, setError] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)('');
  // Per-field messages the SERVER refused the step with (`data.fields` — SPEC-P1 §4). The client
  // blocks the same mistakes before posting, so this only fills in when a request slipped past it
  // (a stale bundle, a non-UI caller); it is rendered by the same inline element either way.
  const [fieldErrors, setFieldErrors] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)({});
  // '' while the wizard is running; 'skipped' / 'finished' name HOW it ended. Only reachable when
  // the bootstrap carries no `adminUrl` to redirect into — the in-place confirmation screen.
  const [done, setDone] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)('');
  const [page, setPage] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)(BOOT.state && BOOT.state.bookingPage || null);

  // Step form state (prefilled).
  const [business, setBusiness] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)({
    name: prefill.business && prefill.business.name || prefill.siteTitle || '',
    address: prefill.business && prefill.business.address || '',
    phone: prefill.business && prefill.business.phone || '',
    timezone: prefill.timezone || 'UTC',
    currency: prefill.currency || 'USD'
  });
  const [hours, setHours] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)(() => {
    const map = {};
    for (let iso = 1; iso <= 7; iso++) {
      map[iso] = {
        open: iso <= 5,
        start: 540,
        end: 1020
      };
    }
    return map;
  });
  const [staff, setStaff] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)({
    name: prefill.currentUser && prefill.currentUser.name || '',
    email: prefill.currentUser && prefill.currentUser.email || ''
  });
  const [service, setService] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useState)({
    name: '',
    duration: 60,
    price: ''
  });

  // Timezone menu from the IANA list; keep the prefilled value selectable even when it is not in
  // it — the same rule the currency menu below uses. A site that never picked a city prefills a
  // raw UTC OFFSET (`+07:00`), which is not an IANA identifier, and a `<select>` whose value
  // matches no option silently displays its FIRST one (Africa/Abidjan) — the wizard would then
  // name a country the business is not in. Offset 0 is normalized to `UTC` server-side
  // (WizardService::prefillTimezone); any other offset stays visible AS the offset, so the owner
  // sees what their site actually has and picks a city on purpose.
  const tzOptions = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useMemo)(() => {
    const zones = BOOT.timezones || [];
    const selected = prefill.timezone || '';
    const list = selected && !zones.includes(selected) ? [selected, ...zones] : zones;
    return list.map(z => ({
      label: /^[+-]/.test(z) ? `UTC${z}` : z,
      value: z
    }));
  }, []);

  // Currency menu from the neutral global list; keep the prefilled code selectable even if it is
  // not in the curated list (the store accepts any valid 3-letter code).
  const currencyOptions = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useMemo)(() => {
    const codes = BOOT.currencies || [];
    const selected = prefill.currency || '';
    const list = selected && !codes.includes(selected) ? [selected, ...codes] : codes;
    return list.map(c => ({
      label: c,
      value: c
    }));
  }, []);
  const dayOrder = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useMemo)(() => orderedWeekdays(Number(BOOT.weekStart) || 1), []);

  /** Localized weekday name for an ISO day, falling back to the number. */
  function weekdayName(iso) {
    return BOOT.weekdays && BOOT.weekdays[iso] || String(iso);
  }

  // C8 — "Apply <day>'s hours to all open days", the affordance the admin SPA's WeeklyHoursGrid
  // already carries (assets/src/admin/lib/WeeklyHoursGrid.jsx). Identical semantics: the FIRST open
  // day in the displayed order is the template, and only OPEN days are rewritten — a closed day
  // stays closed. Hidden below two open days, where the action would be a no-op.
  const openDays = dayOrder.filter(iso => hours[iso] && hours[iso].open);

  /**
   * Write the weekly grid and drop the server's per-day messages: they described the values that
   * were just replaced, and a stale error under a day the founder has already fixed is noise.
   *
   * @param {Object} next The full weekday → `{open, start, end}` map to store.
   */
  function updateHours(next) {
    setHours(next);
    setFieldErrors({});
  }
  const applyToAllOpen = () => {
    if (openDays.length < 2) {
      return;
    }
    const template = hours[openDays[0]];
    const next = {
      ...hours
    };
    openDays.forEach(iso => {
      next[iso] = {
        ...next[iso],
        start: template.start,
        end: template.end
      };
    });
    updateHours(next);
  };

  // QA A (beta report 2026-08-01) — an OPEN day whose end is not after its start (Monday
  // 17:00–09:00, the am/pm slip) was posted as-is and then dropped server-side, so the day came
  // back "Closed" with nothing on screen to explain it. The range is checked here, the offending
  // day carries an inline error, and the step's commit is held disabled while any day is invalid —
  // the same "a commit action looks disabled when it is" rule the staff and service steps follow.
  const hourErrors = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useMemo)(() => {
    const errors = {};
    Object.keys(hours).forEach(iso => {
      const day = hours[iso];
      if (day && day.open && Number(day.end) <= Number(day.start)) {
        errors[iso] = (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('The end time must be after the start time.', 'aponto');
      }
    });
    return errors;
  }, [hours]);
  const hasHourErrors = Object.keys(hourErrors).length > 0;

  // A staff row with no name is never legitimate — the calendar, the booking form and every
  // notification call the provider by it — so the step cannot commit without one. The DISABLED
  // Continue button used to be the ONLY sign of that, with nothing on the field to say why
  // (beta report 2026-08-02); the server refuses the same value with the same message now, and
  // skipping the step still posts nothing at all rather than posting a blank.
  const staffNameError = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useMemo)(() => {
    const name = (staff.name || '').trim();
    if ('' === name) {
      return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('A name is required.', 'aponto');
    }
    if (name.length > MAX_FIELD) {
      return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('This name is too long.', 'aponto');
    }
    return '';
  }, [staff.name]);

  // QA B — a staff email is where every booking notification for this staff member lands, so a
  // typo is lost mail. Blank stays allowed (the field is optional and the whole step is skippable);
  // anything else must look like an address before the step can commit. The server re-checks with
  // `is_email()` and refuses the step on its own.
  const staffEmailError = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useMemo)(() => {
    const email = (staff.email || '').trim();
    if ('' === email || EMAIL_RE.test(email)) {
      return '';
    }
    return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Enter a valid email address, or leave it blank.', 'aponto');
  }, [staff.email]);

  // Hours menu labelled in the site time format — 12h am/pm for a US site (C7, finding U1).
  const timeOptions = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useMemo)(() => buildTimeOptions(prefill.timeFormat), [prefill.timeFormat]);

  // Move focus to the new step's heading whenever the step changes. Each step replaces the whole
  // card, so the button that was focused ("Continue") is gone from the DOM: without this, focus
  // falls back to <body> and a keyboard or screen-reader user is silently dropped at the top of
  // the document with no announcement of where they landed. The FIRST render is deliberately
  // skipped — stealing focus on page load announces the heading over the user's own navigation
  // and scrolls the viewport for no reason.
  const headingRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useRef)(null);
  const stepMounted = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useRef)(false);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useEffect)(() => {
    if (!stepMounted.current) {
      stepMounted.current = true;
      return;
    }
    if (headingRef.current) {
      headingRef.current.focus();
    }
  }, [index, done]);

  // Persist the resume cursor (C10). Best-effort — a failed cursor write must never block or slow
  // navigation, so it is fire-and-forget.
  function persistStep(next) {
    apiPost('step', {
      step: next
    }).catch(() => {});
  }
  function go(next) {
    setError('');
    setFieldErrors({});
    setIndex(next);
    persistStep(next);
  }
  function startOver() {
    setError('');
    setFieldErrors({});
    setIndex(0);
    persistStep(0);
  }
  async function save(doAction, payload, next) {
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      await apiPost(doAction, payload);
      if (typeof next === 'number') {
        setIndex(next);
        persistStep(next);
      }
    } catch (e) {
      setError(e.message);
      // A refused step names its fields (SPEC-P1 §4); every other failure carries none, and
      // the notice alone is the right report for those.
      setFieldErrors(e && e.fields ? e.fields : {});
    } finally {
      setSaving(false);
    }
  }
  async function skipWizard() {
    setSaving(true);
    setError('');
    try {
      // C12: the SERVER's skip action auto-creates the owner-staff when (and only when) no
      // staff exists and the current user has a usable email — never overwriting an existing
      // row (review F item 2). The client just skips.
      await apiPost('skip', {});
      // Skip stamps the funnel `skipped` flag server-side, which releases the full
      // Aponto menu. Redirect straight into the app so "I'll do it myself" lands on
      // the dashboard in the SAME session instead of a dead-end screen (U4-01).
      if (BOOT.adminUrl) {
        window.location.assign(BOOT.adminUrl);
        return;
      }
      // Fallback (no adminUrl injected): show the done screen with its CTA.
      setDone('skipped');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  /**
   * Step 6 — create (or publish) the booking page. Fails LOUDLY when the server answered without a
   * page DTO: leaving `page` null would silently redraw the same "Create booking page" button, the
   * exact dead-button symptom this step was reported for.
   */
  async function createPage() {
    setSaving(true);
    setError('');
    try {
      const data = await apiPost('page', {});
      if (!data || !data.page) {
        throw new Error((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('The booking page could not be created. Please try again.', 'aponto'));
      }
      setPage(data.page);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  /**
   * Step 6 — "Finish setup": stamp `wizard_completed` server-side (which releases the full Aponto
   * menu even when no service was created) and land in the app's dashboard IN THE SAME session,
   * the same "never end on a dead-end screen" rule the skip path follows (U4-01). The resume
   * cursor is deliberately left alone so a later re-entry from Settings still resumes (C10).
   */
  async function finishSetup() {
    setSaving(true);
    setError('');
    try {
      await apiPost('finish', {});
      const target = (0,_DoneStep_jsx__WEBPACK_IMPORTED_MODULE_7__.dashboardUrl)(BOOT.adminUrl);
      if ('' !== target) {
        window.location.assign(target);
        return;
      }
      setDone('finished');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  function busyLabel(label) {
    return saving ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.Fragment, {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Spinner, {}), " ", (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Saving…', 'aponto')]
    }) : label;
  }

  // The page shell is the same in every branch — full-width header, then the step card centered
  // in what is left — so the chrome never shifts between steps (DESIGN-SYSTEM.md: "the app
  // header must not change when the route content changes"). It is written out per branch rather
  // than wrapped in a locally-defined component, which React would treat as a NEW component type
  // on every render and remount the whole step (losing focus and every field's state).
  if (done) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.Fragment, {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_Chrome_jsx__WEBPACK_IMPORTED_MODULE_8__.WizardHeader, {
        index: _Chrome_jsx__WEBPACK_IMPORTED_MODULE_8__.STEPS.length - 1,
        onExit: null,
        exitBusy: saving
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)("main", {
        className: "aponto-wizard-main",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)("div", {
          className: "aponto-wizard-content",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_ui_jsx__WEBPACK_IMPORTED_MODULE_6__.StepShell, {
            headingRef: headingRef,
            title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('You’re all set', 'aponto'),
            subtitle: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('You can reopen this setup anytime from Settings → Open setup wizard.', 'aponto'),
            footer: BOOT.adminUrl ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Flex, {
              className: "aponto-wizard-actions-end",
              justify: "flex-end",
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.FlexItem, {
                children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Button, {
                  variant: "primary",
                  href: BOOT.adminUrl,
                  children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Go to dashboard', 'aponto')
                })
              })
            }) : null,
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)("p", {
              children: 'finished' === done ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Setup is complete. Aponto is ready in the main menu.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Setup was skipped. Add a service and a booking page whenever you’re ready.', 'aponto')
            })
          })
        })
      })]
    });
  }
  const step = _Chrome_jsx__WEBPACK_IMPORTED_MODULE_8__.STEPS[index];
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.Fragment, {
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_Chrome_jsx__WEBPACK_IMPORTED_MODULE_8__.WizardHeader, {
      index: index,
      onExit: skipWizard,
      exitBusy: saving
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)("main", {
      className: "aponto-wizard-main",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsxs)("div", {
        className: "aponto-wizard-content",
        children: [index > 0 && step !== 'done' ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)("div", {
          className: "aponto-wizard-toolbar",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Button, {
            variant: "tertiary",
            disabled: saving,
            onClick: startOver,
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Start over', 'aponto')
          })
        }) : null, error && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Notice, {
          status: "error",
          isDismissible: true,
          onRemove: () => setError(''),
          children: error
        }), step === 'welcome' && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_ui_jsx__WEBPACK_IMPORTED_MODULE_6__.StepShell, {
          headingRef: headingRef
          // A title, a subtitle and one sentence do not need three ruled
          // sections. `is-plain` drops the card's internal rules so Welcome
          // reads as ONE panel (QA V10) — same copy, same components.
          ,
          variant: "is-plain",
          title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Welcome to Aponto', 'aponto'),
          subtitle: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Want a hand getting set up? It takes about three minutes.', 'aponto'),
          footer: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Flex, {
            className: "aponto-wizard-actions",
            justify: "flex-end",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.FlexItem, {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Button, {
                variant: "tertiary",
                disabled: saving,
                onClick: skipWizard,
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('I’ll do it myself', 'aponto')
              })
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.FlexItem, {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Button, {
                variant: "primary",
                onClick: () => go(1),
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Yes, guide me', 'aponto')
              })
            })]
          }),
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)("p", {
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('We’ll confirm your business details, set your hours, add you as staff, and create your first service and booking page.', 'aponto')
          })
        }), step === 'business' && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsxs)(_ui_jsx__WEBPACK_IMPORTED_MODULE_6__.StepShell, {
          headingRef: headingRef,
          title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Confirm your business info', 'aponto'),
          subtitle: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('We prefilled this from WordPress — fix anything that’s off.', 'aponto'),
          footer: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Flex, {
            className: "aponto-wizard-actions",
            justify: "space-between",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.FlexItem, {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Button, {
                variant: "tertiary",
                onClick: () => go(0),
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Back', 'aponto')
              })
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Flex, {
              className: "aponto-wizard-actions-end",
              justify: "flex-end",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.FlexItem, {
                children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Button, {
                  variant: "tertiary",
                  onClick: () => go(2),
                  children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Skip', 'aponto')
                })
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.FlexItem, {
                children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Button, {
                  variant: "primary",
                  disabled: saving,
                  onClick: () => save('business', {
                    name: business.name,
                    address: business.address,
                    phone: business.phone,
                    timezone: business.timezone,
                    currency: business.currency,
                    dateFormat: prefill.dateFormat,
                    timeFormat: prefill.timeFormat,
                    weekStart: prefill.weekStart
                  }, 2),
                  children: busyLabel((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Continue', 'aponto'))
                })
              })]
            })]
          }),
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.TextControl, {
            __next40pxDefaultSize: true,
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Business name', 'aponto'),
            value: business.name,
            onChange: v => setBusiness({
              ...business,
              name: v
            }),
            __nextHasNoMarginBottom: true
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.TextareaControl, {
            rows: 3,
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Address', 'aponto'),
            help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Used in confirmation emails and the calendar file. Leave blank if you’re online-only.', 'aponto'),
            value: business.address,
            onChange: v => setBusiness({
              ...business,
              address: v
            }),
            __nextHasNoMarginBottom: true
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.TextControl, {
            __next40pxDefaultSize: true,
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Phone', 'aponto'),
            value: business.phone,
            onChange: v => setBusiness({
              ...business,
              phone: v
            }),
            __nextHasNoMarginBottom: true
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.SelectControl, {
            __next40pxDefaultSize: true,
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Timezone', 'aponto'),
            help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Bookings are shown to each visitor in their own timezone; this is your studio’s.', 'aponto'),
            value: business.timezone,
            options: tzOptions,
            onChange: v => setBusiness({
              ...business,
              timezone: v
            }),
            __nextHasNoMarginBottom: true
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.SelectControl, {
            __next40pxDefaultSize: true,
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Currency', 'aponto'),
            help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Used for service prices and order totals. You can change it later in Settings.', 'aponto'),
            value: business.currency,
            options: currencyOptions,
            onChange: v => setBusiness({
              ...business,
              currency: v
            }),
            __nextHasNoMarginBottom: true
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)("p", {
            className: "aponto-wizard-muted aponto-wizard-formats",
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.sprintf)(/* translators: 1: date format, 2: time format. */
            (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Date and time formats (%1$s, %2$s) and week start are confirmed from WordPress.', 'aponto'), prefill.dateFormat || '', prefill.timeFormat || '')
          })]
        }), step === 'hours' && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsxs)(_ui_jsx__WEBPACK_IMPORTED_MODULE_6__.StepShell, {
          headingRef: headingRef,
          title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Set your business hours', 'aponto'),
          subtitle: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Staff inherit these hours. You can fine-tune later.', 'aponto'),
          footer: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Flex, {
            className: "aponto-wizard-actions",
            justify: "space-between",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.FlexItem, {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Button, {
                variant: "tertiary",
                onClick: () => go(1),
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Back', 'aponto')
              })
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Flex, {
              className: "aponto-wizard-actions-end",
              justify: "flex-end",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.FlexItem, {
                children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Button, {
                  variant: "tertiary",
                  onClick: () => go(3),
                  children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Skip', 'aponto')
                })
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.FlexItem, {
                children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Button, {
                  variant: "primary",
                  disabled: saving || hasHourErrors,
                  onClick: () => save('hours', {
                    days: Object.keys(hours).map(iso => ({
                      weekday: Number(iso),
                      open: hours[iso].open,
                      start: hours[iso].start,
                      end: hours[iso].end
                    }))
                  }, 3),
                  children: busyLabel((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Continue', 'aponto'))
                })
              })]
            })]
          })
          // One repeated compact row per weekday: the tighter 8px row rhythm
          // instead of the 16px field-group gap.
          ,
          gap: 2,
          children: [openDays.length >= 2 && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)("div", {
            className: "aponto-wizard-hours-toolbar",
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Button, {
              className: "aponto-wizard-hours-apply",
              variant: "tertiary",
              onClick: applyToAllOpen,
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.sprintf)(/* translators: %s: weekday name, e.g. Monday. */
              (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Apply %s’s hours to all open days', 'aponto'), weekdayName(openDays[0]))
            })
          }), dayOrder.map(iso => {
            const day = hours[iso];
            const dayName = weekdayName(iso);
            // The client's own check first; the server's message for this day
            // (`data.fields[ weekday ]`) is the fallback for anything that
            // reached it anyway.
            const dayError = hourErrors[iso] || fieldErrors[iso] || '';
            return (
              /*#__PURE__*/
              /* Day at the row START, times at the row END: the grid then
                 uses the card's full width instead of ending a third of the
                 way in (QA V6). The row keeps a control-height floor so a
                 CLOSED day does not collapse tighter than an open one
                 (QA V7). Plain elements rather than Flex/FlexItem so the
                 rhythm is owned by one CSS rule. The wrapper exists so an
                 invalid range can put its message UNDER its own row instead
                 of at the bottom of the card (QA A). */
              (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsxs)("div", {
                className: "aponto-wizard-hours-item",
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsxs)("div", {
                  className: 'aponto-wizard-hours-row' + (day.open ? '' : ' is-closed'),
                  children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)("div", {
                    className: "aponto-wizard-hours-day",
                    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.ToggleControl, {
                      label: dayName
                      // Accessible name so screen-reader/keyboard users can tell
                      // which day each switch controls (fleet-r1 Fix 9e; finding
                      // U1 BUG-2 — the day label was an unassociated sibling).
                      ,
                      "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.sprintf)(/* translators: %s: weekday name. */
                      (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Open on %s', 'aponto'), dayName),
                      checked: day.open,
                      onChange: open => updateHours({
                        ...hours,
                        [iso]: {
                          ...day,
                          open
                        }
                      }),
                      __nextHasNoMarginBottom: true
                    })
                  }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)("div", {
                    className: "aponto-wizard-hours-times",
                    children: day.open ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.Fragment, {
                      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)("div", {
                        className: "aponto-wizard-hours-time",
                        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.SelectControl, {
                          __next40pxDefaultSize: true,
                          value: String(day.start),
                          options: timeOptions,
                          onChange: v => updateHours({
                            ...hours,
                            [iso]: {
                              ...day,
                              start: Number(v)
                            }
                          }),
                          __nextHasNoMarginBottom: true
                        })
                      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)("span", {
                        className: "aponto-wizard-hours-sep",
                        "aria-hidden": "true",
                        children: "\u2013"
                      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)("div", {
                        className: "aponto-wizard-hours-time",
                        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.SelectControl, {
                          __next40pxDefaultSize: true,
                          value: String(day.end),
                          options: timeOptions,
                          onChange: v => updateHours({
                            ...hours,
                            [iso]: {
                              ...day,
                              end: Number(v)
                            }
                          }),
                          __nextHasNoMarginBottom: true
                        })
                      })]
                    }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)("span", {
                      className: "aponto-wizard-muted",
                      children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Closed', 'aponto')
                    })
                  })]
                }), '' !== dayError && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)("p", {
                  className: "aponto-wizard-field-error",
                  "data-weekday": iso,
                  children: dayError
                })]
              }, iso)
            );
          })]
        }), step === 'staff' && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsxs)(_ui_jsx__WEBPACK_IMPORTED_MODULE_6__.StepShell, {
          headingRef: headingRef,
          title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Who takes the bookings?', 'aponto'),
          subtitle: MULTI_STAFF ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('We prefilled you. You can add the rest of your team from the Staff screen.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('We prefilled you. Add more staff later with Premium.', 'aponto'),
          footer: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Flex, {
            className: "aponto-wizard-actions",
            justify: "space-between",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.FlexItem, {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Button, {
                variant: "tertiary",
                onClick: () => go(2),
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Back', 'aponto')
              })
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Flex, {
              className: "aponto-wizard-actions-end",
              justify: "flex-end",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.FlexItem, {
                children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Button, {
                  variant: "tertiary",
                  onClick: () => go(4),
                  children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Skip', 'aponto')
                })
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.FlexItem, {
                children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Button, {
                  variant: "primary",
                  disabled: saving || '' !== staffNameError || '' !== staffEmailError,
                  onClick: () => save('staff', {
                    name: staff.name,
                    email: staff.email
                  }, 4),
                  children: busyLabel((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Continue', 'aponto'))
                })
              })]
            })]
          }),
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.TextControl, {
            __next40pxDefaultSize: true,
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Name', 'aponto'),
            value: staff.name,
            onChange: v => {
              setStaff({
                ...staff,
                name: v
              });
              // The server's verdict described the value that was just
              // replaced — drop it as soon as the founder edits the field.
              setFieldErrors({});
            },
            __nextHasNoMarginBottom: true
          }), '' !== (staffNameError || fieldErrors.name || '') && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)("p", {
            className: "aponto-wizard-field-error",
            children: staffNameError || fieldErrors.name
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.TextControl, {
            __next40pxDefaultSize: true,
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Email', 'aponto'),
            type: "email",
            value: staff.email,
            onChange: v => {
              setStaff({
                ...staff,
                email: v
              });
              // The server's message described the address that was just
              // replaced — drop it as soon as the founder edits the field.
              setFieldErrors({});
            },
            __nextHasNoMarginBottom: true
          }), '' !== (staffEmailError || fieldErrors.email || '') && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)("p", {
            className: "aponto-wizard-field-error",
            children: staffEmailError || fieldErrors.email
          })]
        }), step === 'service' && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsxs)(_ui_jsx__WEBPACK_IMPORTED_MODULE_6__.StepShell, {
          headingRef: headingRef,
          title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Add your first service', 'aponto'),
          subtitle: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('What can people book? You can add more later.', 'aponto'),
          footer: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Flex, {
            className: "aponto-wizard-actions",
            justify: "space-between",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.FlexItem, {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Button, {
                variant: "tertiary",
                onClick: () => go(3),
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Back', 'aponto')
              })
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Flex, {
              className: "aponto-wizard-actions-end",
              justify: "flex-end",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.FlexItem, {
                children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Button, {
                  variant: "tertiary",
                  onClick: () => go(5),
                  children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Skip', 'aponto')
                })
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.FlexItem, {
                children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Button, {
                  variant: "primary",
                  disabled: saving || !service.name,
                  onClick: () => save('service', {
                    name: service.name,
                    duration: service.duration,
                    price: service.price
                  }, 5),
                  children: busyLabel((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Create service', 'aponto'))
                })
              })]
            })]
          }),
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.TextControl, {
            __next40pxDefaultSize: true,
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Service name', 'aponto'),
            placeholder: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('e.g. Haircut', 'aponto'),
            value: service.name,
            onChange: v => setService({
              ...service,
              name: v
            }),
            __nextHasNoMarginBottom: true
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.SelectControl, {
            __next40pxDefaultSize: true,
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Duration', 'aponto'),
            value: String(service.duration),
            options: [15, 30, 45, 60, 90, 120].map(d => ({
              label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.sprintf)(/* translators: %d: minutes. */
              (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('%d minutes', 'aponto'), d),
              value: String(d)
            })),
            onChange: v => setService({
              ...service,
              duration: Number(v)
            }),
            __nextHasNoMarginBottom: true
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.TextControl, {
            __next40pxDefaultSize: true,
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_4__.__)('Price (optional)', 'aponto'),
            type: "number",
            value: service.price,
            onChange: v => setService({
              ...service,
              price: v
            }),
            __nextHasNoMarginBottom: true
          })]
        }), step === 'done' && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(_DoneStep_jsx__WEBPACK_IMPORTED_MODULE_7__.DoneStep, {
          headingRef: headingRef,
          page: page,
          saving: saving,
          busyLabel: busyLabel,
          onBack: () => go(4),
          onCreatePage: createPage,
          onFinish: finishSetup
        })]
      })
    })]
  });
}
const root = document.getElementById('aponto-wizard-root');
if (root) {
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.createRoot)(root).render(/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_9__.jsx)(Wizard, {}));
}
})();

/******/ })()
;
"use strict";
(globalThis["webpackChunkaponto"] = globalThis["webpackChunkaponto"] || []).push([["admin-chunk-modules"],{

/***/ "./assets/src/admin/modules/ModuleSettingsRoute.jsx"
/*!**********************************************************!*\
  !*** ./assets/src/admin/modules/ModuleSettingsRoute.jsx ***!
  \**********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ModuleSettingsRoute: () => (/* binding */ ModuleSettingsRoute),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _lib_config_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../lib/config.js */ "./assets/src/admin/lib/config.js");
/* harmony import */ var _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../lib/icon.jsx */ "./assets/src/admin/lib/icon.jsx");
/* harmony import */ var _lib_InflowWorkspace_jsx__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/InflowWorkspace.jsx */ "./assets/src/admin/lib/InflowWorkspace.jsx");
/* harmony import */ var _lib_module_panels_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../lib/module-panels.js */ "./assets/src/admin/lib/module-panels.js");
/* harmony import */ var _lib_toast_jsx__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../lib/toast.jsx */ "./assets/src/admin/lib/toast.jsx");
/* harmony import */ var _lib_page_title_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../lib/page-title.js */ "./assets/src/admin/lib/page-title.js");
/* harmony import */ var _ModulesSubnav_jsx__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./ModulesSubnav.jsx */ "./assets/src/admin/modules/ModulesSubnav.jsx");
/* harmony import */ var _module_state_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./module-state.js */ "./assets/src/admin/modules/module-state.js");
/* harmony import */ var _catalog_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./catalog.js */ "./assets/src/admin/modules/catalog.js");
/* harmony import */ var _enable_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./enable.js */ "./assets/src/admin/modules/enable.js");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__);
/**
 * One module's settings surface — the `#modules/{code}` route (D-R27).
 *
 * The catalog at `#modules` stays read-only; this is where an AVAILABLE module that
 * declares `has_settings` renders the panel its own bundle registered
 * (`lib/module-panels.js`). The route itself is free-shipped and completely generic:
 * it names no module, and it decides what to render from boot data plus the panel
 * registry, never from an edition comparison.
 *
 * States, in resolution order:
 *
 *   1. UNKNOWN code            → the not-found card. Same answer as a code that is not
 *                                in the registry at all, so the hash cannot be used to
 *                                enumerate what exists.
 *   2. UNAVAILABLE             → the same card, plus the compare link for a Premium
 *                                module. This mirrors the locked catalog card exactly:
 *                                a module the site does not own has one honest action,
 *                                and it is the pricing page (§6 + Guideline 5/11).
 *   3. DISABLED                → the module IS available to this site and is switched OFF
 *                                (D-R57). Says so, says the data and settings were kept
 *                                (D-R31), and offers the one action that resolves it:
 *                                "Enable module", on the same `PUT /modules/{code}` write
 *                                path the catalog switch uses. Before D-R57 this fell into
 *                                (2) and told an owner who had flipped the switch himself
 *                                that his site could not have the module. The card HOLDS
 *                                through the enable, because a module with a settings
 *                                surface reloads the document on success — see
 *                                `enablingNeedsReload()` for the two server-side reasons.
 *   4. AVAILABLE, no panel     → a neutral notice. An available module whose bundle did
 *      loaded                    not load (not built, not enqueued, failed) must say so
 *                                plainly rather than render an empty screen or, worse,
 *                                fake controls. Only the GENUINE case reaches it: an
 *                                enable-in-session is still on (3) when the reload lands.
 *   5. AVAILABLE + panel       → the module's own panel, handed its boot-data record.
 *
 * A module with no settings surface (`has_settings: false`) resolves as (1) in EVERY state: the
 * registry says it owns no settings resource, and REST answers the same uniform 404 for
 * `/modules/{code}/settings` (`ModulesController::schemaFor()`). One truth, two surfaces.
 *
 * Display only, as always: REST re-checks `Plan::has()` on every read and write
 * (§5 invariant 3).
 *
 * STALENESS IS EXPECTED HERE, and it is the panel's job to survive it. Boot data is a snapshot
 * taken when the page loaded; a module can be switched off afterwards — from another tab, by
 * another admin, or by a deploy — while this panel stays mounted. The server stops serving that
 * module's routes the moment its provider stops booting, so the panel's own fetches begin failing
 * with WordPress's `rest_no_route` (404) rather than an Aponto error code.
 *
 * PANEL CONTRACT (owned by each `assets/src/pro/{code}` bundle, not by this route): a
 * `rest_no_route` failure must be mapped to friendly copy along the lines of "this module is no
 * longer active — reload the page", NEVER surfaced raw. "No route was found matching the URL and
 * request method" is a framework string; showing it to a site owner reads as a broken plugin when
 * the truth is a setting they (or a colleague) just changed. The route cannot do this centrally
 * because it does not make the panel's requests — it only decides whether to mount one.
 */













/**
 * The shared page shell: a breadcrumb heading, the module's one-line description, then the
 * section subnav, then the page body — in that order, on EVERY state and every module.
 *
 * The heading is the app's existing record-editor pattern, reused VERBATIM from
 * `routes/ServiceEditor.jsx` ("Services › New service"): `.pd-record-editor-head` with an
 * `h1` of parent button + chevron + current label. Reused rather than re-styled so the panel
 * route inherits the exact type scale, hover underline and chevron sizing the editors already
 * have — the CSS keys on `h1 button`, which is also why the crumb is a BUTTON and not an
 * anchor.
 *
 * The DESCRIPTION (founder, 2026-09-04) is the same sentence the module's catalog card
 * carries, read from the one source both surfaces share (`MODULE_META` in `catalog.js`) —
 * a panel never writes a second copy of its own summary, so the card and the panel cannot
 * say different things. It renders in the position and with the class the Modules screen's
 * own description uses (`.pd-page-description`, styled once in plugin-dashboard.css beside
 * `.pd-page-header p`), which is what keeps the two surfaces identical.
 *
 * THE HOST OWNS THE RHYTHM. Head → description → subnav → body spacing lives here and in
 * `.ap-module-panel` (admin-extra.css), never in a module's own bundle: four panels each
 * choosing their own top margin is exactly how they drifted apart before.
 *
 * The route owns the ONE `h1` on the page, so a module panel renders its own sections and
 * `h2`s and never a second page title.
 *
 * A panel built on the shared inspector workspace (`lib/InflowWorkspace.jsx`) takes the head
 * over through `InflowPageHost`: breadcrumb, description and subnav then render at the top of
 * the workspace's MAIN pane (above the panel's own tabs), and the page drops its gutter and
 * max-width (`.is-inflow-host`, admin-extra.css). The inspector therefore runs from the shell
 * header to the viewport bottom beside them, exactly as on Bookings, instead of starting below a
 * full-width head. When the panes stack, the workspace renders the head above the inspector.
 *
 * @param {{code: string, label: string, description?: string, onNavigate: Function, children: any}} props Shell props.
 */

function ModulePage({
  code,
  label,
  description,
  onNavigate,
  children
}) {
  const [hosted, setHosted] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const head = /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.Fragment, {
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("header", {
      className: "pd-record-editor-head",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
        className: "pd-record-editor-title",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("h1", {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("button", {
            type: "button",
            onClick: () => onNavigate('modules'),
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Modules', 'aponto')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("span", {
            "aria-hidden": "true",
            children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_3__.renderIcon)('chevron')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("strong", {
            children: label
          })]
        }), description ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("p", {
          className: "pd-page-description",
          children: description
        }) : null]
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(_ModulesSubnav_jsx__WEBPACK_IMPORTED_MODULE_8__.ModulesSubnav, {
      current: code
    })]
  });
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
    className: `pd-page pd-record-editor-page ap-module-settings${hosted ? ' is-inflow-host' : ''}`,
    children: [hosted ? null : head, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(_lib_InflowWorkspace_jsx__WEBPACK_IMPORTED_MODULE_4__.InflowPageHost, {
      head: head,
      onHostedChange: setHosted,
      children: children
    })]
  });
}

/**
 * Not-found / locked presentation. `upsell` adds the per-placement compare link — the
 * SAME `modules-{code}` placement the locked catalog card carries, so the two surfaces
 * report as one placement rather than inventing a second.
 *
 * No heading of its own: the page's breadcrumb `h1` already names the module, and repeating
 * it here read as the title twice once the breadcrumb landed.
 */
function ModuleUnavailable({
  code,
  icon,
  upsell,
  onNavigate
}) {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("section", {
    className: "pd-card pd-placeholder",
    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
      className: "pd-placeholder-inner",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("span", {
        className: "pd-placeholder-icon",
        children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_3__.renderIcon)(icon)
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("p", {
        children: upsell ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('This module is part of Aponto Premium. It is not available on this site yet.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('This module is not available on this site.', 'aponto')
      }), upsell ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("a", {
        className: "pd-button",
        href: (0,_catalog_js__WEBPACK_IMPORTED_MODULE_10__.upgradeUrl)(`modules-${code}`),
        target: "_blank",
        rel: "noreferrer noopener",
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Compare plans', 'aponto')
      }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("button", {
        className: "pd-button is-ghost",
        type: "button",
        onClick: () => onNavigate('modules'),
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Back to Modules', 'aponto')
      })]
    })
  });
}

/**
 * SWITCHED OFF, and switchable back on by this very site (D-R57).
 *
 * The distinction this card exists to make is the one the catalog card already makes (D-R31):
 * "you turned this off" and "your site cannot have this" are opposite messages, and only one of
 * them has an action. The copy states the D-R31 guarantee explicitly, because the reason an owner
 * hesitates to re-enable is the fear that switching off threw their configuration away.
 *
 * "Enable module" is the SAME write as the catalog switch — `enable.js` owns it — so the two
 * places a module can be turned on cannot diverge. It is disabled while the request is in flight;
 * a failure snaps the session state back and explains itself in a danger toast, and this page then
 * simply stays on this card, which is the honest result.
 *
 * The secondary "Back to Modules" stays: this is still a page the owner may have reached by hash,
 * and every state of this route owes them a way out.
 *
 * `busy` runs `enabling` → `reloading` and never clears on the success path, because a module with
 * a settings surface is reloaded the moment the server confirms (D-R57). Holding this card through
 * that window is what keeps the route from flashing the "Rebuild the plugin assets" message at an
 * operator whose build is fine.
 *
 * @param {{icon: string, label: string, busy: string, onEnable: Function, onNavigate: Function}} props Card props.
 */
function ModuleDisabled({
  icon,
  label,
  busy,
  onEnable,
  onNavigate
}) {
  const action = 'reloading' === busy ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Reloading…', 'aponto') : 'enabling' === busy ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Enabling…', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Enable module', 'aponto');
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("section", {
    className: "pd-card pd-placeholder ap-module-disabled",
    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
      className: "pd-placeholder-inner",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("span", {
        className: "pd-placeholder-icon",
        children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_3__.renderIcon)(icon)
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("h2", {
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: %s: module name, e.g. "Multiple locations". */
        (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('%s is turned off', 'aponto'), label)
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("p", {
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('This module is available on this site — it is switched off. Its data and settings were kept, so turning it back on restores them.', 'aponto')
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("button", {
        className: "pd-button primary",
        type: "button",
        disabled: '' !== busy,
        onClick: onEnable,
        children: action
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("button", {
        className: "pd-button is-ghost",
        type: "button",
        onClick: () => onNavigate('modules'),
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Back to Modules', 'aponto')
      })]
    })
  });
}

/**
 * The `#modules/{code}` route.
 *
 * @param {{code: string, onNavigate: Function}} props Route props.
 */
function ModuleSettingsRoute({
  code,
  onNavigate,
  segments = []
}) {
  // SESSION store, not the boot snapshot: a module disabled from the catalog moments ago
  // must gate this route NOW, or it mounts a panel whose REST routes the server has
  // already stopped serving — the raw `rest_no_route` banner this fix removes.
  const mod = (0,_catalog_js__WEBPACK_IMPORTED_MODULE_10__.findModuleRecord)({
    modules: (0,_module_state_js__WEBPACK_IMPORTED_MODULE_9__.useModules)()
  }, code);
  const showToast = (0,_lib_toast_jsx__WEBPACK_IMPORTED_MODULE_6__.useToast)();
  // '' | 'enabling' | 'reloading' — see `ModuleDisabled`.
  const [busy, setBusy] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)('');
  // The shared latch (`enable.js`): a write for this module may also have been started from the
  // catalog before the hash change, and this page must not offer a second one either way.
  const pending = (0,_enable_js__WEBPACK_IMPORTED_MODULE_11__.useModuleBusy)().indexOf(code) !== -1;
  const meta = _catalog_js__WEBPACK_IMPORTED_MODULE_10__.MODULE_META[code] || {};
  const category = _catalog_js__WEBPACK_IMPORTED_MODULE_10__.CATEGORY_META[mod?.category] || {};
  const label = meta.label || code;
  (0,_lib_page_title_js__WEBPACK_IMPORTED_MODULE_7__.usePageTitle)(label);
  // The catalog card's own sentence — one source, two surfaces (see `ModulePage`).
  const description = meta.description || '';
  const icon = meta.icon || category.icon || 'cube';
  // ONE derivation, shared with the catalog card (D-R57).
  const availability = (0,_catalog_js__WEBPACK_IMPORTED_MODULE_10__.moduleAvailability)(mod, _lib_config_js__WEBPACK_IMPORTED_MODULE_2__.config.planEdition);
  // The card's own busy word. A refused call (`busy: true`) clears the local state but leaves the
  // latch held, so the button stays inert until the write that owns it finishes.
  const cardBusy = busy || (pending ? 'enabling' : '');
  const onEnable = () => {
    setBusy('enabling');
    // A module that needs a reload keeps this card — and its busy button — until the document
    // goes away. Clearing it would render the "no settings UI loaded" card for the length of
    // the reload delay, which is the exact wrong advice about a build that is fine.
    (0,_enable_js__WEBPACK_IMPORTED_MODULE_11__.setModuleEnabled)(code, true, showToast).then(res => setBusy(res?.reloading ? 'reloading' : ''));
  };

  // (1) + (2): unknown, settings-less, or genuinely not available to this site. A module with no
  // settings resource lands here in EVERY state — there is no page to host, switched on or off.
  if (!mod || mod.has_settings !== true || 'unavailable' === availability) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(ModulePage, {
      code: code,
      label: label,
      description: description,
      onNavigate: onNavigate,
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(ModuleUnavailable, {
        code: code,
        icon: icon
        // Same rule as the catalog cards (founder, 2026-08-28): a site that already
        // has Premium is never shown a pricing link. Without the `planEdition` term
        // this route contradicted the card it was reached from.
        ,
        upsell: mod?.edition === 'premium' && _lib_config_js__WEBPACK_IMPORTED_MODULE_2__.config.planEdition !== 'premium',
        onNavigate: onNavigate
      })
    });
  }

  // (3): switched off, and this site may switch it back on.
  //
  // `busy` holds this card from the click until the document is replaced. The shared write path
  // applies the new position OPTIMISTICALLY — right for a switch, which simply moves — but a
  // PAGE that swapped its whole body on an unconfirmed write would jump twice on a refusal, and
  // on the success path it would swap to a card about a broken build while the reload is on its
  // way. So the page waits, and the button is the feedback.
  if ('' !== cardBusy || 'disabled' === availability) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(ModulePage, {
      code: code,
      label: label,
      description: description,
      onNavigate: onNavigate,
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(ModuleDisabled, {
        icon: icon,
        label: label,
        busy: cardBusy,
        onEnable: onEnable,
        onNavigate: onNavigate
      })
    });
  }
  const Panel = (0,_lib_module_panels_js__WEBPACK_IMPORTED_MODULE_5__.getModuleSettingsPanel)(code);

  // (4): available since this page was built, and its bundle registered nothing. That really is a
  // build problem, so the copy is unchanged. A module ENABLED in this session never reaches here:
  // it is held on the disabled card above until the reload replaces the document (D-R57).
  if (!Panel) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(ModulePage, {
      code: code,
      label: label,
      description: description,
      onNavigate: onNavigate,
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("section", {
        className: "pd-card pd-placeholder",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsxs)("div", {
          className: "pd-placeholder-inner",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("span", {
            className: "pd-placeholder-icon",
            children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_3__.renderIcon)(icon)
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("h2", {
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('This module has no settings UI loaded', 'aponto')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("p", {
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: %s: module name, e.g. "Google Calendar". */
            (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('%s is active, but its settings screen did not load. Rebuild the plugin assets or reload the page.', 'aponto'), label)
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)("button", {
            className: "pd-button is-ghost",
            type: "button",
            onClick: () => onNavigate('modules'),
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Back to Modules', 'aponto')
          })]
        })
      })
    });
  }

  // (5): the module owns the surface from here.
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(ModulePage, {
    code: code,
    label: label,
    description: description,
    onNavigate: onNavigate,
    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_12__.jsx)(Panel, {
      module: mod,
      segments: segments
    })
  });
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ModuleSettingsRoute);

/***/ },

/***/ "./assets/src/admin/modules/ModulesApp.jsx"
/*!*************************************************!*\
  !*** ./assets/src/admin/modules/ModulesApp.jsx ***!
  \*************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ ModulesApp),
/* harmony export */   paymentModuleNeedsConfirm: () => (/* binding */ paymentModuleNeedsConfirm)
/* harmony export */ });
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _pressmaximum_dashboard_kit__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @pressmaximum/dashboard-kit */ "./node_modules/@pressmaximum/dashboard-kit/build/index.mjs");
/* harmony import */ var _pressmaximum_dashboard_kit_module_card__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @pressmaximum/dashboard-kit/module-card */ "./node_modules/@pressmaximum/dashboard-kit/build/module-card/index.mjs");
/* harmony import */ var _lib_config_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../lib/config.js */ "./assets/src/admin/lib/config.js");
/* harmony import */ var _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../lib/icon.jsx */ "./assets/src/admin/lib/icon.jsx");
/* harmony import */ var _lib_toast_jsx__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../lib/toast.jsx */ "./assets/src/admin/lib/toast.jsx");
/* harmony import */ var _lib_confirm_jsx__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../lib/confirm.jsx */ "./assets/src/admin/lib/confirm.jsx");
/* harmony import */ var _lib_ui_jsx__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../lib/ui.jsx */ "./assets/src/admin/lib/ui.jsx");
/* harmony import */ var _catalog_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./catalog.js */ "./assets/src/admin/modules/catalog.js");
/* harmony import */ var _enable_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./enable.js */ "./assets/src/admin/modules/enable.js");
/* harmony import */ var _filters_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./filters.js */ "./assets/src/admin/modules/filters.js");
/* harmony import */ var _ModulesSubnav_jsx__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ./ModulesSubnav.jsx */ "./assets/src/admin/modules/ModulesSubnav.jsx");
/* harmony import */ var _module_state_js__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ./module-state.js */ "./assets/src/admin/modules/module-state.js");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__);
/**
 * Modules — the catalog surface (SPEC-P1 §6), a first-level route
 * (`#modules`) rendered from the `Plan::FEATURES` registry (SPEC-P0 §3.2) shipped as
 * boot data. Category tabs (All · Booking · Payments · Connections · Site & Tools)
 * with counts, a search box and an Industry select (D-R21, founder-approved
 * 2026-07-25 — the three combine with AND) filter a grid of kit PMDKModuleCards;
 * a free-vs-premium CompareTable closes the page.
 *
 * The surface carries exactly one control — the D-R31 enable/disable switch on shipped
 * modules, wired to `PUT /modules/{code}` — and no license field or fake controls. It is
 * no longer an all-locked catalog (D-R22, founder-approved 2026-07-27): Free
 * capabilities that already ship render as "Included", Free modules still to come
 * render as "Coming soon" with NO upgrade link, and only Premium cards carry the
 * per-placement UTM comparison link (`utm_content=modules-{code}`) alongside the
 * page-level `menu` placement (§6 + Guideline 5/11).
 *
 * "Included" is a claim about the site, so the card points at the proof where one
 * exists: an Included capability with a real admin surface gets an internal "Open"
 * link to it (D-R22 addendum, founder-approved 2026-07-27) — navigation, not a control.
 * The one real control on the surface is the D-R31 enable/disable switch.
 */
















/** Controlled category tablist matching the kit `.pmdk-section-tabs` ARIA contract. */

function CategoryTabs({
  tabs,
  active,
  onSelect
}) {
  const refs = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)([]);
  const onKeyDown = (event, index) => {
    const last = tabs.length - 1;
    let next = null;
    if (event.key === 'ArrowRight') {
      next = index === last ? 0 : index + 1;
    } else if (event.key === 'ArrowLeft') {
      next = index === 0 ? last : index - 1;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = last;
    }
    if (next === null) {
      return;
    }
    event.preventDefault();
    onSelect(tabs[next].id);
    refs.current[next]?.focus();
  };
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsx)("div", {
    className: "pmdk-section-tabs",
    role: "tablist",
    "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Module categories', 'aponto'),
    children: tabs.map((tab, index) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsxs)("button", {
      ref: el => refs.current[index] = el,
      type: "button",
      role: "tab",
      id: `ap-modules-tab-${tab.id}`,
      "aria-controls": "ap-modules-grid",
      "aria-selected": active === tab.id,
      tabIndex: active === tab.id ? 0 : -1,
      onClick: () => onSelect(tab.id),
      onKeyDown: event => onKeyDown(event, index),
      children: [tab.label, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsx)("span", {
        children: tab.count
      })]
    }, tab.id))
  });
}

/**
 * One catalog card, in whichever state `moduleCardState()` resolves — Included, switched
 * OFF (D-R31), Coming soon, or the unchanged locked Premium card.
 * No roadmap-phase badge on production cards (divergence audit §2.7 — phase stays
 * registry/code-side only).
 *
 * A card carries AT MOST ONE action, and the two kinds never mix:
 *   - Premium → the outbound UTM compare link (unchanged);
 *   - Free/Included WITH a shipped admin surface → an internal "Open" hash link
 *     (D-R22 addendum, founder-approved 2026-07-27). Same accent affordance, but
 *     it stays in the app: no `target`, no `rel`, no UTM, no pricing page. The
 *     destination map + the "no destination → no link" rule live in catalog.js.
 * Free/planned cards and included cards without a surface keep no action at all.
 */
/**
 * Whether switching this module OFF should ask first (S2-74): an enabled payment module.
 *
 * @param {Object} mod Module record.
 * @return {boolean} Whether to confirm.
 */
function paymentModuleNeedsConfirm(mod) {
  return 'payments' === mod?.category && true === mod?.enabled;
}
function ModuleCard({
  module: mod,
  planEdition,
  busy,
  onToggle
}) {
  const meta = _catalog_js__WEBPACK_IMPORTED_MODULE_10__.MODULE_META[mod.code] || {
    label: mod.code
  };
  const category = _catalog_js__WEBPACK_IMPORTED_MODULE_10__.CATEGORY_META[mod.category] || {
    label: mod.category,
    icon: 'cube'
  };
  const iconName = meta.icon || category.icon;
  const card = (0,_catalog_js__WEBPACK_IMPORTED_MODULE_10__.moduleCardState)(mod, planEdition);
  const openHref = (0,_catalog_js__WEBPACK_IMPORTED_MODULE_10__.moduleOpenHref)(mod);
  // The next-step phrase rides the meta line: it is the one place on the card that already
  // carries "what kind of thing is this", and the phrase belongs beside it rather than competing
  // with the title or the toggle (D-R35). Which phrase it is depends on the module's category —
  // a calendar's 4-state and a gateway's test/live state are different questions (D-R39).
  const stateLabel = (0,_catalog_js__WEBPACK_IMPORTED_MODULE_10__.moduleStateLabel)(mod);
  const metaLine = `${category.label} · ${(0,_catalog_js__WEBPACK_IMPORTED_MODULE_10__.kindLabel)(mod.kind)}${stateLabel ? ` · ${stateLabel}` : ''}`;
  let action = null;
  if (card.upgrade) {
    action = /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsxs)("a", {
      className: "ap-module-link",
      href: (0,_catalog_js__WEBPACK_IMPORTED_MODULE_10__.upgradeUrl)(`modules-${mod.code}`),
      target: "_blank",
      rel: "noreferrer noopener",
      children: [(0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Compare plans', 'aponto'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsx)("span", {
        "aria-hidden": "true",
        children: " \u2192"
      })]
    });
  } else if (openHref) {
    action = /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsxs)("a", {
      className: "ap-module-link",
      href: openHref
      // Every card says the same word, so the accessible name has to carry the
      // module: "Open" alone gives a screen-reader user a list of identical links.
      ,
      "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.sprintf)(/* translators: %s: module name, e.g. "Email notifications". */
      (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Open %s', 'aponto'), meta.label),
      children: [(0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Open', 'aponto'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsx)("span", {
        "aria-hidden": "true",
        children: " \u2192"
      })]
    });
  }
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsx)(_pressmaximum_dashboard_kit_module_card__WEBPACK_IMPORTED_MODULE_4__.PMDKModuleCard, {
    icon: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_6__.renderIcon)(iconName),
    meta: metaLine,
    title: meta.label,
    description: meta.description,
    tier: card.tier,
    state: card.state,
    toggle: card.toggle
    // ONE write per module at a time (`enable.js`): a switch that stays live while its own
    // PUT is unanswered lets the operator queue responses that resolve out of order, and
    // the loser overwrites the winner.
    ,
    toggleDisabled: busy,
    statusLabel: card.statusLabel,
    plannedLabel: card.plannedLabel,
    action: action,
    onToggle: card.toggle ? next => onToggle(mod.code, next) : undefined,
    labels: {
      toggleOn: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Enabled', 'aponto'),
      toggleOff: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Disabled', 'aponto')
    }
  });
}

/**
 * Browse toolbar: search + Industry select (D-R21). The mockup's Status and
 * License selects stay unshipped: D-R21 approved the Industry filter only, and
 * D-R22 (which put mixed editions/states in the catalog) did not re-open that
 * scope. Category tabs + search cover browsing today.
 */
function ModuleToolbar({
  query,
  onQuery,
  industry,
  onIndustry
}) {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsxs)("div", {
    className: "pd-module-toolbar",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsxs)("label", {
      className: "pd-module-search",
      htmlFor: "ap-modules-search",
      children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_6__.renderIcon)('search'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsx)("input", {
        id: "ap-modules-search",
        type: "search",
        value: query,
        onChange: event => onQuery(event.target.value),
        placeholder: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Search modules', 'aponto'),
        "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Search modules', 'aponto'),
        autoComplete: "off"
      })]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsx)("div", {
      className: "pd-module-filter-controls",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsxs)("label", {
        className: "pd-module-select",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsx)("span", {
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Industry', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsx)("select", {
          value: industry,
          onChange: event => onIndustry(event.target.value),
          children: _catalog_js__WEBPACK_IMPORTED_MODULE_10__.INDUSTRY_OPTIONS.map(option => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsx)("option", {
            value: option.id,
            children: option.label
          }, option.id))
        })]
      })
    })]
  });
}
function ModulesApp() {
  const showToast = (0,_lib_toast_jsx__WEBPACK_IMPORTED_MODULE_7__.useToast)();
  // SESSION state, not route state (D-R31 fix). This used to be local `useState` layered over
  // the boot snapshot, which meant hash-navigating to a panel unmounted the route and threw the
  // toggle away — the card came back Enabled and the panel route mounted an editor for a module
  // the server had already stopped serving. `modules/module-state.js` outlives the route.
  const modules = (0,_module_state_js__WEBPACK_IMPORTED_MODULE_14__.useModules)();
  // Codes with a write in flight (or a reload pending) — their switches go inert until it lands.
  const busyCodes = (0,_enable_js__WEBPACK_IMPORTED_MODULE_11__.useModuleBusy)();

  /**
   * Flip a module. The write, the rollback, the toasts and the reload all live in `enable.js`,
   * shared verbatim with the "Enable module" action on a switched-off module's own page — two
   * places to turn a module on, one behaviour.
   *
   * @param {string}  code Module code.
   * @param {boolean} next Requested state.
   */
  const {
    confirm,
    dialog
  } = (0,_lib_confirm_jsx__WEBPACK_IMPORTED_MODULE_8__.useConfirmDialog)();
  const onToggle = async (code, next) => {
    // Switching OFF a module that takes money asks first (persona QA 2026-10-05, S2-74). It
    // used to flip instantly, even with checkouts still awaiting payment — and an off module's
    // settings and refund action are unreachable until it is on again. Keyed on the registry
    // CATEGORY, so core names no gateway; no module publishes a count of its open work yet, so
    // the question cannot say how many there are and is asked for every payment module.
    const mod = modules.find(entry => entry?.code === code);
    if (!next && paymentModuleNeedsConfirm(mod)) {
      const label = _catalog_js__WEBPACK_IMPORTED_MODULE_10__.MODULE_META[code]?.label || code;
      const ok = await confirm({
        title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.sprintf)(/* translators: %s: module name, e.g. "Stripe payments". */
        (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Turn off %s?', 'aponto'), label),
        message: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Customers can no longer pay with it. Bookings still waiting for a payment through it keep their place, but refunds and payment reviews from Aponto are unavailable — and its settings are hidden — until you turn it on again.', 'aponto'),
        confirmText: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Turn off', 'aponto'),
        destructive: true
      });
      if (!ok) {
        return;
      }
    }
    (0,_enable_js__WEBPACK_IMPORTED_MODULE_11__.setModuleEnabled)(code, next, showToast);
  };
  // Plan-marketing chrome — the page-level "Compare plans" CTA, the per-card upsell links and
  // the free-vs-premium table — is for people deciding whether to buy. A site that already has
  // Premium is shown none of it (founder, 2026-08-28). This is presentation only: what each
  // module can DO is `available` (`Plan::has()`), and REST enforces it regardless.
  const showPlanMarketing = _lib_config_js__WEBPACK_IMPORTED_MODULE_5__.config.planEdition !== 'premium';
  // A cross-route "open the catalog on this tab" (the Dashboard's payment warning, re-test N3) —
  // the same one-shot window seam the Bookings route reads for "open this booking".
  const [active, setActive] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(() => {
    const wanted = typeof window !== 'undefined' ? window.__apontoModulesCategory : '';
    if (typeof window !== 'undefined') {
      window.__apontoModulesCategory = '';
    }
    return _catalog_js__WEBPACK_IMPORTED_MODULE_10__.CATEGORY_TABS.some(tab => tab.id === wanted) ? wanted : _filters_js__WEBPACK_IMPORTED_MODULE_12__.CATEGORY_ALL;
  });
  const [query, setQuery] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('');
  const [industry, setIndustry] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(_filters_js__WEBPACK_IMPORTED_MODULE_12__.INDUSTRY_ALL);
  const tabs = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useMemo)(() => {
    const counts = {
      all: modules.length
    };
    _catalog_js__WEBPACK_IMPORTED_MODULE_10__.CATEGORY_TABS.forEach(tab => {
      if (tab.id !== 'all') {
        counts[tab.id] = modules.filter(mod => mod.category === tab.id).length;
      }
    });
    return _catalog_js__WEBPACK_IMPORTED_MODULE_10__.CATEGORY_TABS.map(tab => ({
      ...tab,
      count: counts[tab.id] || 0
    }));
  }, [modules]);

  // The three filters combine with AND (D-R21); tab counts stay whole-catalog.
  const filtered = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useMemo)(() => (0,_filters_js__WEBPACK_IMPORTED_MODULE_12__.filterModules)(modules, {
    category: active,
    industry,
    query
  }, _catalog_js__WEBPACK_IMPORTED_MODULE_10__.moduleSearchText), [modules, active, industry, query]);
  const isFiltered = (0,_filters_js__WEBPACK_IMPORTED_MODULE_12__.hasBrowseFilters)({
    industry,
    query
  });
  const clearFilters = () => {
    setQuery('');
    setIndustry(_filters_js__WEBPACK_IMPORTED_MODULE_12__.INDUSTRY_ALL);
  };
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsxs)("div", {
    className: "pd-page ap-modules",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsx)(_lib_ui_jsx__WEBPACK_IMPORTED_MODULE_9__.PageHeader, {
      title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Modules', 'aponto')
      // Same page, two framings (founder, 2026-08-28). A prospect is told what an
      // upgrade buys; an owner is told when their modules arrive — "with an upgrade"
      // is upsell copy aimed at someone who has already paid. Kept as two COMPLETE
      // sentences rather than a shared prefix plus a swapped tail: translators need
      // whole sentences, and concatenated fragments do not survive most languages.
      ,
      description: showPlanMarketing ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Everything Aponto does, and everything it will. Premium modules are included with an upgrade as each one ships.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Everything Aponto does, and everything it will. Premium modules light up here as each one ships.', 'aponto'),
      actions: showPlanMarketing ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsxs)("a", {
        className: "pd-button is-ghost",
        href: (0,_catalog_js__WEBPACK_IMPORTED_MODULE_10__.upgradeUrl)('menu'),
        target: "_blank",
        rel: "noreferrer noopener",
        children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_6__.renderIcon)('arrowRight'), (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Compare plans', 'aponto')]
      }) : null
    }), modules.length === 0 ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Notice, {
      status: "warning",
      isDismissible: false,
      children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('The module catalog could not be loaded.', 'aponto')
    }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.Fragment, {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsx)(_ModulesSubnav_jsx__WEBPACK_IMPORTED_MODULE_13__.ModulesSubnav, {
        current: ""
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsx)(CategoryTabs, {
        tabs: tabs,
        active: active,
        onSelect: setActive
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsx)(ModuleToolbar, {
        query: query,
        onQuery: setQuery,
        industry: industry,
        onIndustry: setIndustry
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsx)("div", {
        className: "pd-module-results-head",
        role: "status",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsx)("strong", {
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.sprintf)(/* translators: %d: number of modules matching the current filters. */
          (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__._n)('%d module', '%d modules', filtered.length, 'aponto'), filtered.length)
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsx)("div", {
        className: "pmdk-module-grid",
        id: "ap-modules-grid",
        role: "tabpanel",
        "aria-labelledby": `ap-modules-tab-${active}`,
        hidden: filtered.length === 0,
        children: filtered.map(mod => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsx)(ModuleCard, {
          module: mod,
          planEdition: _lib_config_js__WEBPACK_IMPORTED_MODULE_5__.config.planEdition,
          busy: busyCodes.indexOf(mod.code) !== -1,
          onToggle: onToggle
        }, mod.code))
      }), filtered.length === 0 && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsxs)("div", {
        className: "pd-module-empty",
        children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_6__.renderIcon)('search'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsx)("h2", {
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('No modules match', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsx)("p", {
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Clear a filter or try another search term.', 'aponto')
        }), isFiltered && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsx)("button", {
          className: "pd-button",
          type: "button",
          onClick: clearFilters,
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Clear filters', 'aponto')
        })]
      }), showPlanMarketing && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsxs)("section", {
        className: "ap-modules-compare",
        "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Free versus Premium', 'aponto'),
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsx)("h2", {
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Free vs Premium', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsx)("p", {
          className: "ap-modules-compare-note",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Premium modules roll out progressively — the column shows what belongs to each plan, not what has already shipped.', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_15__.jsx)(_pressmaximum_dashboard_kit__WEBPACK_IMPORTED_MODULE_3__.CompareTable, {
          sections: _catalog_js__WEBPACK_IMPORTED_MODULE_10__.COMPARE_SECTIONS,
          labels: {
            headFeature: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Feature', 'aponto'),
            headFree: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Free', 'aponto'),
            headPro: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Premium', 'aponto'),
            cellYes: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Included', 'aponto'),
            cellNo: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Not included', 'aponto')
          },
          footer: {
            title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Aponto Premium', 'aponto'),
            // D-R22: Stripe is a Free module now, so "payments" can no longer
            // be listed wholesale as a Premium reason to upgrade.
            description: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Staff, calendar sync, custom reminders, deposits and more — each module is included as it ships on the roadmap.', 'aponto'),
            ctaHref: (0,_catalog_js__WEBPACK_IMPORTED_MODULE_10__.upgradeUrl)('menu'),
            ctaLabel: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Compare plans', 'aponto')
          }
        })]
      })]
    }), dialog]
  });
}

/***/ },

/***/ "./assets/src/admin/modules/ModulesSubnav.jsx"
/*!****************************************************!*\
  !*** ./assets/src/admin/modules/ModulesSubnav.jsx ***!
  \****************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ModulesSubnav: () => (/* binding */ ModulesSubnav),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   subnavModules: () => (/* binding */ subnavModules)
/* harmony export */ });
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _catalog_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./catalog.js */ "./assets/src/admin/modules/catalog.js");
/* harmony import */ var _module_state_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./module-state.js */ "./assets/src/admin/modules/module-state.js");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__);
/**
 * Modules section sub-navigation (founder, 2026-08-28).
 *
 * Reaching a module's settings cost three steps — Modules, find the card, Open — for a surface an
 * owner returns to constantly. This row is the direct path: "All modules" plus one entry per
 * ACTIVE module that owns a settings page, rendered on BOTH the catalog (`#modules`) and every
 * panel (`#modules/{code}`), so the whole section is reachable from anywhere inside it.
 *
 * It is pure presentation over data the SPA already has: `available` (the boot projection of
 * `Plan::has()`) and `has_settings`. No new endpoint, no menu registration, and no entitlement
 * decision — REST re-checks every read and write (§5 invariant 3).
 *
 * VISUAL REGISTER is deliberate. On the catalog this sits ABOVE the category tabs, and two tab
 * rows of equal weight would read as siblings when they are not: the category tabs filter the
 * grid, this navigates the section. So it composes two idioms the app already owns rather than
 * inventing a third — the quiet 28px pill of `.pd-filter-chip` (surface-muted, caption type) with
 * the active treatment shared by `.pd-editor-nav a.is-active` and `.pd-segmented
 * button[aria-pressed="true"]` (accent-subtle fill, accent foreground). Same tokens, lighter
 * weight, clearly subordinate to the underlined tabs beneath it.
 *
 * Renders NOTHING when no active module owns a settings page — which is every Free build and any
 * Premium build before the first module ships, so today's catalog is untouched.
 */




/**
 * The section's navigable modules, in registry order (boot data preserves it).
 *
 * A module qualifies only when the site can actually USE it (`available`) AND it owns a settings
 * surface (`has_settings`) — the same pair the panel route itself requires, so this row can never
 * offer a destination that would answer "not available".
 *
 * @param {{modules?: Array}} bootConfig Admin boot config.
 * @return {Array<{code: string, label: string, href: string}>} Module entries.
 */

function subnavModules(bootConfig) {
  const modules = Array.isArray(bootConfig?.modules) ? bootConfig.modules : [];
  return modules.filter(mod => mod?.available === true && mod?.has_settings === true).map(mod => ({
    code: mod.code,
    label: _catalog_js__WEBPACK_IMPORTED_MODULE_1__.MODULE_META[mod.code]?.label || mod.code,
    href: `#modules/${mod.code}`
  }));
}

/**
 * The sub-navigation row, or null when there is nothing to navigate to.
 *
 * @param {{current?: string}} props `current` is the active module code, or '' on the catalog.
 */
function ModulesSubnav({
  current = ''
}) {
  // Reads the SESSION store, not the boot snapshot, so a module switched off leaves this row
  // immediately — including on a panel route, where the catalog that flipped it is unmounted.
  const modules = subnavModules({
    modules: (0,_module_state_js__WEBPACK_IMPORTED_MODULE_2__.useModules)()
  });

  // One "All modules" pill on its own is not navigation, it is a link to the page you are
  // already on — so the row appears only once a module has somewhere else to go.
  if (modules.length === 0) {
    return null;
  }
  const items = [{
    code: '',
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('All modules', 'aponto'),
    href: '#modules'
  }, ...modules];
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("nav", {
    className: "ap-module-subnav",
    "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Modules', 'aponto'),
    children: items.map(item => {
      const active = item.code === current;
      return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_3__.jsx)("a", {
        className: active ? 'ap-module-subnav-item is-active' : 'ap-module-subnav-item',
        href: item.href
        // `aria-current` is the state, not the class: a screen-reader user gets the
        // same "you are here" the accent fill gives a sighted one.
        ,
        "aria-current": active ? 'page' : undefined,
        children: item.label
      }, item.code || 'all');
    })
  });
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ModulesSubnav);

/***/ },

/***/ "./assets/src/admin/modules/enable.js"
/*!********************************************!*\
  !*** ./assets/src/admin/modules/enable.js ***!
  \********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   isModuleBusy: () => (/* binding */ isModuleBusy),
/* harmony export */   moduleLabel: () => (/* binding */ moduleLabel),
/* harmony export */   resetModuleWrites: () => (/* binding */ resetModuleWrites),
/* harmony export */   setModuleEnabled: () => (/* binding */ setModuleEnabled),
/* harmony export */   useModuleBusy: () => (/* binding */ useModuleBusy)
/* harmony export */ });
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _lib_api_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../lib/api.js */ "./assets/src/admin/lib/api.js");
/* harmony import */ var _lib_nav_guard_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../lib/nav-guard.js */ "./assets/src/admin/lib/nav-guard.js");
/* harmony import */ var _catalog_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./catalog.js */ "./assets/src/admin/modules/catalog.js");
/* harmony import */ var _module_state_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./module-state.js */ "./assets/src/admin/modules/module-state.js");
/**
 * The ONE write path behind every module on/off control (D-R57).
 *
 * Two surfaces switch a module: the catalog switch (`ModulesApp.jsx`, D-R31) and the "Enable
 * module" action on a switched-off module's own page (`ModuleSettingsRoute.jsx`). They must be
 * the same write — same route, same optimistic apply, same rollback, same words, same reload — or
 * the two places an owner can turn a module on behave differently. So the write lives here and
 * both import it.
 *
 * WHY NOT `module-state.js`: that file is in the ADMIN ENTRY (the router and four routes read the
 * session store), and `admin.min.js` is budget-capped in CI (§6). This file is only ever imported
 * from `admin-chunk-modules`, so the REST call and its copy ride the lazy chunk with the screens
 * that use them.
 *
 * MODULE-LEVEL STATE IS SAFE HERE, and that is a claim that has to be checked rather than assumed
 * (handoff 2026-09-21 §2: two webpack entries are two module instances, which is what broke
 * `lib/toast.jsx` and `lib/nav-guard.js`). The in-flight latch below is a module-level `let`, and
 * it stays correct because this file is imported ONLY by `ModulesApp.jsx` and
 * `ModuleSettingsRoute.jsx` — both in `admin-chunk-modules`, both in the admin entry's graph. No
 * module bundle (`assets/src/pro/{code}`, `assets/src/modules/{code}`) imports it, and none may:
 * a second copy would be a second latch, i.e. no latch at all. If a module bundle ever needs this
 * write, the latch moves onto `window.apontoAdmin` FIRST, the way the two files above did.
 *
 * ONE WRITE PER MODULE AT A TIME (Codex round 2, HIGH). `PUT /modules/{code}` responses can resolve
 * out of order: ON then quickly OFF meant the older ON answer overwrote the newer OFF in the
 * session store — and scheduled a reload for a module that is now off — while a failing older
 * request rolled the store back to a position captured before the newer success. The optimistic
 * apply cannot be made order-safe by itself, so the second write is simply refused: a code with a
 * request in flight answers `{ ok: false, busy: true }`, changes nothing and says nothing, and both
 * surfaces render that module's control disabled for the duration. DIFFERENT modules are
 * unaffected — the latch is per code, because there is no ordering relationship between them.
 *
 * THE RELOAD IS AUTOMATIC, and it is the SAME reload the catalog has performed since 2026-09-04 —
 * D-R57 only widened WHICH modules get it (`enablingNeedsReload()` in catalog.js carries both
 * reasons). It goes through `requestNav()` (Codex round 2, HIGH): "the toggle surfaces hold no
 * form" is true when the switch is clicked and NOT necessarily 600 ms later, by which time the
 * operator can be typing in the Staff editor. The dirty guard is the app's one answer to that
 * question, so the scheduled reload asks it like any other navigation. Declining is safe: the
 * module is already enabled server-side and the next page load picks it up.
 *
 * TONE (D-R64): every "enabled" toast — with or without the reload — is `success`; "disabled" is
 * the neutral `default`; a refusal is `danger`.
 *
 * ORDERING MATTERS (unchanged from the original): the session state is applied FIRST so a blocked
 * or slow reload still leaves the switch honest, and the toast gets a beat to paint — a message the
 * reload eats is not a message.
 */







/** How long the toast gets to paint before the document goes away. */
const RELOAD_DELAY_MS = 600;

/**
 * Module codes with a write in flight — see the latch note above.
 *
 * An ARRAY rather than a Set so subscribers get a new identity on every change and a React
 * consumer re-renders, the same idiom as `module-state.js`.
 *
 * @type {string[]}
 */
let writing = [];

/** @type {Set<Function>} */
const listeners = new Set();

/** The module's display name, or the raw code when the catalog has no entry for it. */
function moduleLabel(code) {
  return _catalog_js__WEBPACK_IMPORTED_MODULE_4__.MODULE_META[code]?.label || code;
}

/** Whether a write for this module is in flight (or its reload is pending). */
function isModuleBusy(code) {
  return writing.indexOf(code) !== -1;
}

/**
 * Take or release the latch, notifying subscribers only on a real change.
 *
 * @param {string}  code Module code.
 * @param {boolean} busy Whether a write is now in flight.
 */
function setModuleBusy(code, busy) {
  if (busy === isModuleBusy(code)) {
    return;
  }
  writing = busy ? [...writing, code] : writing.filter(entry => entry !== code);
  listeners.forEach(listener => listener(writing));
}

/**
 * The codes currently being written, re-rendering the caller when they change.
 *
 * @return {string[]} Module codes.
 */
function useModuleBusy() {
  const [state, setState] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(() => writing);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    listeners.add(setState);
    return () => listeners.delete(setState);
  }, []);
  return state;
}

/** Drop the latch so the next write starts clean. Test seam only. */
function resetModuleWrites() {
  writing = [];
  listeners.clear();
}

/**
 * Flip a module, optimistically, and say what happened.
 *
 * The switch (or the page) moves immediately and SNAPS BACK with the server's own message if the
 * write is refused — a control that silently lies about server state is worse than a slow one.
 * The success toast is the missing half of that: before D-R57 a toggle that WORKED said nothing
 * at all unless it also reloaded, so the only feedback most toggles ever gave was a failure.
 *
 * Never rejects. A toast is feedback about a write, and a caller resetting its busy flag must not
 * have to guard an unhandled rejection to do it.
 *
 * @param {string}    code       Module code.
 * @param {boolean}   next       Requested switch position.
 * @param {Function} [showToast] `useToast()` writer.
 * @param {Function} [reload]    TEST SEAM ONLY — how to reload the document. Nothing in the app
 *                               passes it; jsdom makes `window.location.reload` non-configurable,
 *                               so the reload is otherwise unassertable.
 * @return {Promise<{ok: boolean, busy: boolean, enabled: boolean, reloading: boolean}>} What
 *         happened. `busy` means the call was refused because this module already had a write in
 *         flight — nothing was sent, changed or said. `reloading` tells a caller not to clear its
 *         own busy state: this document is on its way out.
 */
function setModuleEnabled(code, next, showToast, reload) {
  const record = (0,_module_state_js__WEBPACK_IMPORTED_MODULE_5__.getModules)().find(mod => mod?.code === code) || null;
  const previous = record?.enabled === true;
  const label = moduleLabel(code);

  // Refused, silently: the operator's own first click is still being answered, and a toast about
  // a request that was never sent would be noise about nothing.
  if (isModuleBusy(code)) {
    return Promise.resolve({
      ok: false,
      busy: true,
      enabled: previous,
      reloading: false
    });
  }
  setModuleBusy(code, true);
  (0,_module_state_js__WEBPACK_IMPORTED_MODULE_5__.applyModuleEnabled)(code, next);
  return _lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.put(`/modules/${code}`, {
    enabled: next
  }).then(res => {
    // Trust the server's answer over the optimistic guess.
    const enabled = res?.enabled === true;
    (0,_module_state_js__WEBPACK_IMPORTED_MODULE_5__.applyModuleEnabled)(code, enabled);
    if (enabled && (0,_catalog_js__WEBPACK_IMPORTED_MODULE_4__.enablingNeedsReload)(record, enabled)) {
      showToast?.((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: %s: module name, e.g. "Multiple locations". */
      (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('%s enabled — reloading to load its screens.', 'aponto'), label), 'success');
      // The latch is HELD across the delay: until this document is replaced the module is
      // mid-change, and a second toggle in that window would race the reload.
      window.setTimeout(() => {
        const release = () => setModuleBusy(code, false);
        (0,_lib_nav_guard_js__WEBPACK_IMPORTED_MODULE_3__.requestNav)(() => {
          release();
          (reload || (() => window.location.reload()))();
        }, release);
      }, RELOAD_DELAY_MS);
      return {
        ok: true,
        busy: false,
        enabled,
        reloading: true
      };
    }
    setModuleBusy(code, false);
    // D-R64: ON is the `success` tone (green check); OFF stays neutral — switching a module off
    // is not a success state, and a refusal is `danger` below.
    showToast?.(enabled ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: %s: module name, e.g. "Multiple staff". */
    (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('%s enabled.', 'aponto'), label) : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: %s: module name, e.g. "Multiple staff". */
    (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('%s disabled.', 'aponto'), label), enabled ? 'success' : 'default');
    return {
      ok: true,
      busy: false,
      enabled,
      reloading: false
    };
  }, err => {
    (0,_module_state_js__WEBPACK_IMPORTED_MODULE_5__.applyModuleEnabled)(code, previous);
    setModuleBusy(code, false);
    showToast?.(err?.message || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('The module could not be updated.', 'aponto'), 'danger');
    return {
      ok: false,
      busy: false,
      enabled: previous,
      reloading: false
    };
  });
}

/***/ }

}]);
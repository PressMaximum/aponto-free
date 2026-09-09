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
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _lib_config_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../lib/config.js */ "./assets/src/admin/lib/config.js");
/* harmony import */ var _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../lib/icon.jsx */ "./assets/src/admin/lib/icon.jsx");
/* harmony import */ var _lib_module_panels_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../lib/module-panels.js */ "./assets/src/admin/lib/module-panels.js");
/* harmony import */ var _ModulesSubnav_jsx__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./ModulesSubnav.jsx */ "./assets/src/admin/modules/ModulesSubnav.jsx");
/* harmony import */ var _module_state_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./module-state.js */ "./assets/src/admin/modules/module-state.js");
/* harmony import */ var _catalog_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./catalog.js */ "./assets/src/admin/modules/catalog.js");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__);
/**
 * One module's settings surface — the `#modules/{code}` route (D-R27).
 *
 * The catalog at `#modules` stays read-only; this is where an AVAILABLE module that
 * declares `has_settings` renders the panel its own bundle registered
 * (`lib/module-panels.js`). The route itself is free-shipped and completely generic:
 * it names no module, and it decides what to render from boot data plus the panel
 * registry, never from an edition comparison.
 *
 * Four states, in resolution order:
 *
 *   1. UNKNOWN code            → the not-found card. Same answer as a code that is not
 *                                in the registry at all, so the hash cannot be used to
 *                                enumerate what exists.
 *   2. NOT AVAILABLE           → the same card, plus the compare link for a Premium
 *                                module. This mirrors the locked catalog card exactly:
 *                                a module the site does not own has one honest action,
 *                                and it is the pricing page (§6 + Guideline 5/11).
 *   3. AVAILABLE, no panel     → a neutral notice. An available module whose bundle did
 *      loaded                    not load (not built, not enqueued, failed) must say so
 *                                plainly rather than render an empty screen or, worse,
 *                                fake controls.
 *   4. AVAILABLE + panel       → the module's own panel, handed its boot-data record.
 *
 * A module with no settings surface (`has_settings: false`) resolves as (1): the
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
 * @param {{code: string, label: string, description?: string, onNavigate: Function, children: any}} props Shell props.
 */

function ModulePage({
  code,
  label,
  description,
  onNavigate,
  children
}) {
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
    className: "pd-page pd-record-editor-page ap-module-settings",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("header", {
      className: "pd-record-editor-head",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
        className: "pd-record-editor-title",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("h1", {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("button", {
            type: "button",
            onClick: () => onNavigate('modules'),
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Modules', 'aponto')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("span", {
            "aria-hidden": "true",
            children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_2__.renderIcon)('chevron')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("strong", {
            children: label
          })]
        }), description ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("p", {
          className: "pd-page-description",
          children: description
        }) : null]
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_ModulesSubnav_jsx__WEBPACK_IMPORTED_MODULE_4__.ModulesSubnav, {
      current: code
    }), children]
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
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("section", {
    className: "pd-card pd-placeholder",
    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
      className: "pd-placeholder-inner",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("span", {
        className: "pd-placeholder-icon",
        children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_2__.renderIcon)(icon)
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("p", {
        children: upsell ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('This module is part of Aponto Premium. It is not available on this site yet.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('This module is not available on this site.', 'aponto')
      }), upsell ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("a", {
        className: "pd-button",
        href: (0,_catalog_js__WEBPACK_IMPORTED_MODULE_6__.upgradeUrl)(`modules-${code}`),
        target: "_blank",
        rel: "noreferrer noopener",
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Compare plans', 'aponto')
      }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("button", {
        className: "pd-button is-ghost",
        type: "button",
        onClick: () => onNavigate('modules'),
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Back to Modules', 'aponto')
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
  onNavigate
}) {
  // SESSION store, not the boot snapshot: a module disabled from the catalog moments ago
  // must gate this route NOW, or it mounts a panel whose REST routes the server has
  // already stopped serving — the raw `rest_no_route` banner this fix removes.
  const mod = (0,_catalog_js__WEBPACK_IMPORTED_MODULE_6__.findModuleRecord)({
    modules: (0,_module_state_js__WEBPACK_IMPORTED_MODULE_5__.useModules)()
  }, code);
  const meta = _catalog_js__WEBPACK_IMPORTED_MODULE_6__.MODULE_META[code] || {};
  const category = _catalog_js__WEBPACK_IMPORTED_MODULE_6__.CATEGORY_META[mod?.category] || {};
  const label = meta.label || code;
  // The catalog card's own sentence — one source, two surfaces (see `ModulePage`).
  const description = meta.description || '';
  const icon = meta.icon || category.icon || 'cube';

  // (1) + (2): unknown, settings-less, or not owned by this site.
  if (!mod || mod.available !== true || mod.has_settings !== true) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(ModulePage, {
      code: code,
      label: label,
      description: description,
      onNavigate: onNavigate,
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(ModuleUnavailable, {
        code: code,
        icon: icon
        // Same rule as the catalog cards (founder, 2026-08-28): a site that already
        // has Premium is never shown a pricing link. Without the `planEdition` term
        // this route contradicted the card it was reached from.
        ,
        upsell: mod?.edition === 'premium' && _lib_config_js__WEBPACK_IMPORTED_MODULE_1__.config.planEdition !== 'premium',
        onNavigate: onNavigate
      })
    });
  }
  const Panel = (0,_lib_module_panels_js__WEBPACK_IMPORTED_MODULE_3__.getModuleSettingsPanel)(code);

  // (3): available, but the module's bundle registered nothing.
  if (!Panel) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(ModulePage, {
      code: code,
      label: label,
      description: description,
      onNavigate: onNavigate,
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("section", {
        className: "pd-card pd-placeholder",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
          className: "pd-placeholder-inner",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("span", {
            className: "pd-placeholder-icon",
            children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_2__.renderIcon)(icon)
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("h2", {
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('This module has no settings UI loaded', 'aponto')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("p", {
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.sprintf)(/* translators: %s: module name, e.g. "Google Calendar". */
            (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('%s is active, but its settings screen did not load. Rebuild the plugin assets or reload the page.', 'aponto'), label)
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("button", {
            className: "pd-button is-ghost",
            type: "button",
            onClick: () => onNavigate('modules'),
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Back to Modules', 'aponto')
          })]
        })
      })
    });
  }

  // (4): the module owns the surface from here.
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(ModulePage, {
    code: code,
    label: label,
    description: description,
    onNavigate: onNavigate,
    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(Panel, {
      module: mod
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
/* harmony export */   "default": () => (/* binding */ ModulesApp)
/* harmony export */ });
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _pressmaximum_dashboard_kit__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @pressmaximum/dashboard-kit */ "./node_modules/@pressmaximum/dashboard-kit/build/index.mjs");
/* harmony import */ var _pressmaximum_dashboard_kit_module_card__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @pressmaximum/dashboard-kit/module-card */ "./node_modules/@pressmaximum/dashboard-kit/build/module-card/index.mjs");
/* harmony import */ var _lib_api_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../lib/api.js */ "./assets/src/admin/lib/api.js");
/* harmony import */ var _lib_config_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../lib/config.js */ "./assets/src/admin/lib/config.js");
/* harmony import */ var _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../lib/icon.jsx */ "./assets/src/admin/lib/icon.jsx");
/* harmony import */ var _lib_toast_jsx__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../lib/toast.jsx */ "./assets/src/admin/lib/toast.jsx");
/* harmony import */ var _lib_ui_jsx__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../lib/ui.jsx */ "./assets/src/admin/lib/ui.jsx");
/* harmony import */ var _catalog_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./catalog.js */ "./assets/src/admin/modules/catalog.js");
/* harmony import */ var _filters_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./filters.js */ "./assets/src/admin/modules/filters.js");
/* harmony import */ var _ModulesSubnav_jsx__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./ModulesSubnav.jsx */ "./assets/src/admin/modules/ModulesSubnav.jsx");
/* harmony import */ var _module_state_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ./module-state.js */ "./assets/src/admin/modules/module-state.js");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__);
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
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsx)("div", {
    className: "pmdk-section-tabs",
    role: "tablist",
    "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Module categories', 'aponto'),
    children: tabs.map((tab, index) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsxs)("button", {
      ref: el => refs.current[index] = el,
      type: "button",
      role: "tab",
      id: `ap-modules-tab-${tab.id}`,
      "aria-controls": "ap-modules-grid",
      "aria-selected": active === tab.id,
      tabIndex: active === tab.id ? 0 : -1,
      onClick: () => onSelect(tab.id),
      onKeyDown: event => onKeyDown(event, index),
      children: [tab.label, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsx)("span", {
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
function ModuleCard({
  module: mod,
  planEdition,
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
    action = /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsxs)("a", {
      className: "ap-module-link",
      href: (0,_catalog_js__WEBPACK_IMPORTED_MODULE_10__.upgradeUrl)(`modules-${mod.code}`),
      target: "_blank",
      rel: "noreferrer noopener",
      children: [(0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Compare plans', 'aponto'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsx)("span", {
        "aria-hidden": "true",
        children: " \u2192"
      })]
    });
  } else if (openHref) {
    action = /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsxs)("a", {
      className: "ap-module-link",
      href: openHref
      // Every card says the same word, so the accessible name has to carry the
      // module: "Open" alone gives a screen-reader user a list of identical links.
      ,
      "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.sprintf)(/* translators: %s: module name, e.g. "Email notifications". */
      (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Open %s', 'aponto'), meta.label),
      children: [(0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Open', 'aponto'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsx)("span", {
        "aria-hidden": "true",
        children: " \u2192"
      })]
    });
  }
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsx)(_pressmaximum_dashboard_kit_module_card__WEBPACK_IMPORTED_MODULE_4__.PMDKModuleCard, {
    icon: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_7__.renderIcon)(iconName),
    meta: metaLine,
    title: meta.label,
    description: meta.description,
    tier: card.tier,
    state: card.state,
    toggle: card.toggle,
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
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsxs)("div", {
    className: "pd-module-toolbar",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsxs)("label", {
      className: "pd-module-search",
      htmlFor: "ap-modules-search",
      children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_7__.renderIcon)('search'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsx)("input", {
        id: "ap-modules-search",
        type: "search",
        value: query,
        onChange: event => onQuery(event.target.value),
        placeholder: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Search modules', 'aponto'),
        "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Search modules', 'aponto'),
        autoComplete: "off"
      })]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsx)("div", {
      className: "pd-module-filter-controls",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsxs)("label", {
        className: "pd-module-select",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsx)("span", {
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Industry', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsx)("select", {
          value: industry,
          onChange: event => onIndustry(event.target.value),
          children: _catalog_js__WEBPACK_IMPORTED_MODULE_10__.INDUSTRY_OPTIONS.map(option => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsx)("option", {
            value: option.id,
            children: option.label
          }, option.id))
        })]
      })
    })]
  });
}
function ModulesApp() {
  const showToast = (0,_lib_toast_jsx__WEBPACK_IMPORTED_MODULE_8__.useToast)();
  // SESSION state, not route state (D-R31 fix). This used to be local `useState` layered over
  // the boot snapshot, which meant hash-navigating to a panel unmounted the route and threw the
  // toggle away — the card came back Enabled and the panel route mounted an editor for a module
  // the server had already stopped serving. `modules/module-state.js` outlives the route.
  const modules = (0,_module_state_js__WEBPACK_IMPORTED_MODULE_13__.useModules)();

  /**
   * Flip a module, optimistically. On failure the switch snaps back and says why — a toggle that
   * silently lies about the server state is worse than one that is slow.
   *
   * @param {string}  code Module code.
   * @param {boolean} next Requested state.
   */
  const onToggle = (code, next) => {
    const record = modules.find(mod => mod.code === code);
    const previous = record?.enabled === true;
    (0,_module_state_js__WEBPACK_IMPORTED_MODULE_13__.applyModuleEnabled)(code, next);
    _lib_api_js__WEBPACK_IMPORTED_MODULE_5__.api.put(`/modules/${code}`, {
      enabled: next
    }).then(res => {
      // Trust the server's answer over the optimistic guess.
      const enabled = res?.enabled === true;
      (0,_module_state_js__WEBPACK_IMPORTED_MODULE_13__.applyModuleEnabled)(code, enabled);

      // An integration switched ON has no boot projection in THIS document (see
      // `enablingNeedsReload`), so the card would keep saying "Setup needed" about a module
      // that may already hold credentials. Reload rather than guess. The state above is
      // applied FIRST so a blocked or slow reload still leaves the switch honest, and the
      // toast gets a beat to paint — a message the reload eats is not a message.
      if (enabled && (0,_catalog_js__WEBPACK_IMPORTED_MODULE_10__.enablingNeedsReload)(record, next)) {
        showToast((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Module enabled — reloading to load its settings.', 'aponto'));
        window.setTimeout(() => window.location.reload(), 600);
      }
    }, err => {
      (0,_module_state_js__WEBPACK_IMPORTED_MODULE_13__.applyModuleEnabled)(code, previous);
      showToast(err?.message || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('The module could not be updated.', 'aponto'), 'danger');
    });
  };
  // Plan-marketing chrome — the page-level "Compare plans" CTA, the per-card upsell links and
  // the free-vs-premium table — is for people deciding whether to buy. A site that already has
  // Premium is shown none of it (founder, 2026-08-28). This is presentation only: what each
  // module can DO is `available` (`Plan::has()`), and REST enforces it regardless.
  const showPlanMarketing = _lib_config_js__WEBPACK_IMPORTED_MODULE_6__.config.planEdition !== 'premium';
  const [active, setActive] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(_filters_js__WEBPACK_IMPORTED_MODULE_11__.CATEGORY_ALL);
  const [query, setQuery] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('');
  const [industry, setIndustry] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(_filters_js__WEBPACK_IMPORTED_MODULE_11__.INDUSTRY_ALL);
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
  const filtered = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useMemo)(() => (0,_filters_js__WEBPACK_IMPORTED_MODULE_11__.filterModules)(modules, {
    category: active,
    industry,
    query
  }, _catalog_js__WEBPACK_IMPORTED_MODULE_10__.moduleSearchText), [modules, active, industry, query]);
  const isFiltered = (0,_filters_js__WEBPACK_IMPORTED_MODULE_11__.hasBrowseFilters)({
    industry,
    query
  });
  const clearFilters = () => {
    setQuery('');
    setIndustry(_filters_js__WEBPACK_IMPORTED_MODULE_11__.INDUSTRY_ALL);
  };
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsxs)("div", {
    className: "pd-page ap-modules",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsx)(_lib_ui_jsx__WEBPACK_IMPORTED_MODULE_9__.PageHeader, {
      title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Modules', 'aponto')
      // Same page, two framings (founder, 2026-08-28). A prospect is told what an
      // upgrade buys; an owner is told when their modules arrive — "with an upgrade"
      // is upsell copy aimed at someone who has already paid. Kept as two COMPLETE
      // sentences rather than a shared prefix plus a swapped tail: translators need
      // whole sentences, and concatenated fragments do not survive most languages.
      ,
      description: showPlanMarketing ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Everything Aponto does, and everything it will. Premium modules are included with an upgrade as each one ships.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Everything Aponto does, and everything it will. Premium modules light up here as each one ships.', 'aponto'),
      actions: showPlanMarketing ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsxs)("a", {
        className: "pd-button is-ghost",
        href: (0,_catalog_js__WEBPACK_IMPORTED_MODULE_10__.upgradeUrl)('menu'),
        target: "_blank",
        rel: "noreferrer noopener",
        children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_7__.renderIcon)('arrowRight'), (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Compare plans', 'aponto')]
      }) : null
    }), modules.length === 0 ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Notice, {
      status: "warning",
      isDismissible: false,
      children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('The module catalog could not be loaded.', 'aponto')
    }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.Fragment, {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsx)(_ModulesSubnav_jsx__WEBPACK_IMPORTED_MODULE_12__.ModulesSubnav, {
        current: ""
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsx)(CategoryTabs, {
        tabs: tabs,
        active: active,
        onSelect: setActive
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsx)(ModuleToolbar, {
        query: query,
        onQuery: setQuery,
        industry: industry,
        onIndustry: setIndustry
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsx)("div", {
        className: "pd-module-results-head",
        role: "status",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsx)("strong", {
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.sprintf)(/* translators: %d: number of modules matching the current filters. */
          (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__._n)('%d module', '%d modules', filtered.length, 'aponto'), filtered.length)
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsx)("div", {
        className: "pmdk-module-grid",
        id: "ap-modules-grid",
        role: "tabpanel",
        "aria-labelledby": `ap-modules-tab-${active}`,
        hidden: filtered.length === 0,
        children: filtered.map(mod => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsx)(ModuleCard, {
          module: mod,
          planEdition: _lib_config_js__WEBPACK_IMPORTED_MODULE_6__.config.planEdition,
          onToggle: onToggle
        }, mod.code))
      }), filtered.length === 0 && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsxs)("div", {
        className: "pd-module-empty",
        children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_7__.renderIcon)('search'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsx)("h2", {
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('No modules match', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsx)("p", {
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Clear a filter or try another search term.', 'aponto')
        }), isFiltered && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsx)("button", {
          className: "pd-button",
          type: "button",
          onClick: clearFilters,
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Clear filters', 'aponto')
        })]
      }), showPlanMarketing && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsxs)("section", {
        className: "ap-modules-compare",
        "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Free versus Premium', 'aponto'),
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsx)("h2", {
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Free vs Premium', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsx)("p", {
          className: "ap-modules-compare-note",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Premium modules roll out progressively — the column shows what belongs to each plan, not what has already shipped.', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_14__.jsx)(_pressmaximum_dashboard_kit__WEBPACK_IMPORTED_MODULE_3__.CompareTable, {
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
    })]
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

/***/ }

}]);
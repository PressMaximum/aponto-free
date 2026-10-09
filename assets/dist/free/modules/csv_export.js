/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./assets/src/admin/lib/api.js"
/*!*************************************!*\
  !*** ./assets/src/admin/lib/api.js ***!
  \*************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ApiError: () => (/* binding */ ApiError),
/* harmony export */   api: () => (/* binding */ api),
/* harmony export */   buildUrl: () => (/* binding */ buildUrl)
/* harmony export */ });
/* harmony import */ var _config_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./config.js */ "./assets/src/admin/lib/config.js");
/**
 * Minimal REST client for `aponto/v1`.
 *
 * Same-origin relative base + WP nonce header (mirrors the form harness) so the
 * 127.0.0.1↔localhost split never becomes a cross-origin request. Every error is
 * normalised to the contract envelope `{ code, message, status, data }` (error
 * registry) so callers surface `message` verbatim (SPEC-P1 §1.0).
 */

const BASE = _config_js__WEBPACK_IMPORTED_MODULE_0__.config.restUrl.replace(/\/$/, '');
function buildUrl(path, query) {
  const url = BASE + (path.startsWith('/') ? path : `/${path}`);
  if (!query) {
    return url;
  }
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    params.append(key, String(value));
  });
  const qs = params.toString();
  // Choose the separator by whether the base already carries a query string: a
  // plain-permalink REST base is `index.php?rest_route=/aponto/v1`, so a second `?`
  // would 404 the whole call (finding U4-04).
  return qs ? `${url}${url.indexOf('?') === -1 ? '?' : '&'}${qs}` : url;
}
class ApiError extends Error {
  constructor({
    code,
    message,
    status,
    data
  }) {
    super(message || 'Request failed.');
    this.name = 'ApiError';
    this.code = code || 'aponto_error';
    this.status = status || 0;
    this.data = data || null;
  }
}
async function request(method, path, {
  query,
  body,
  extraHeaders
} = {}) {
  const headers = {
    ...extraHeaders,
    'X-WP-Nonce': _config_js__WEBPACK_IMPORTED_MODULE_0__.config.nonce
  };
  const init = {
    method,
    headers,
    credentials: 'same-origin'
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  let response;
  try {
    response = await fetch(buildUrl(path, query), init);
  } catch (networkError) {
    throw new ApiError({
      code: 'aponto_network',
      message: networkError.message || 'Network error.',
      status: 0
    });
  }
  const isJson = (response.headers.get('content-type') || '').includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : await response.text();
  if (!response.ok) {
    const envelope = payload && typeof payload === 'object' ? payload : {};
    throw new ApiError({
      code: envelope.code || 'aponto_error',
      message: envelope.message || `Request failed (${response.status}).`,
      status: response.status,
      data: envelope.data || null
    });
  }
  return payload;
}
const api = {
  get: (path, query) => request('GET', path, {
    query
  }),
  post: (path, body, extraHeaders) => request('POST', path, {
    body,
    extraHeaders
  }),
  patch: (path, body) => request('PATCH', path, {
    body
  }),
  put: (path, body) => request('PUT', path, {
    body
  }),
  del: (path, query, body) => request('DELETE', path, {
    query,
    body
  })
};

/***/ },

/***/ "./assets/src/admin/lib/config.js"
/*!****************************************!*\
  !*** ./assets/src/admin/lib/config.js ***!
  \****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   businessTimeLine: () => (/* binding */ businessTimeLine),
/* harmony export */   config: () => (/* binding */ config)
/* harmony export */ });
/**
 * Boot config accessor. `window.apontoAdmin` is injected by AdminPage::bootConfig
 * (same-origin relative REST base + nonce + business/timezone/currency context +
 * curated settings + capability booleans).
 */
const raw = typeof window !== 'undefined' ? window.apontoAdmin || {} : {};
const config = {
  restUrl: raw.restUrl || '/wp-json/aponto/v1',
  nonce: raw.nonce || '',
  adminUrl: raw.adminUrl || '',
  pageSlug: raw.pageSlug || 'aponto',
  assetsUrl: raw.assetsUrl || '',
  locale: raw.locale || 'en-US',
  edition: raw.edition || 'free',
  // The site's PLAN edition, as opposed to `edition` above (the dist directory being served).
  // Drives MARKETING CHROME ONLY — upsell links, the free-vs-premium comparison — never what a
  // module can do: availability is `available`/`Plan::has()`, enforced in REST. Anything other
  // than a literal 'premium' normalizes to 'free', so boot data older than this bundle keeps
  // today's upsell behaviour rather than silently hiding it from a Free site.
  planEdition: raw.planEdition === 'premium' ? 'premium' : 'free',
  currency: raw.currency || 'USD',
  // THE CANONICAL minor-unit exponent for `currency`, shipped by PHP (`Settings::currencyExponent`).
  // Read with an INTEGER check rather than `||`, because 0 is a real exponent (JPY, VND, ISK) and
  // `||` would silently promote every zero-decimal store to 2 — the same class of 100× error this
  // field exists to remove. Boot data older than this bundle answers 2, the ISO default.
  currencyExponent: Number.isInteger(raw.currencyExponent) ? raw.currencyExponent : 2,
  business: {
    timezone: raw.business?.timezone || 'UTC',
    timezoneCity: raw.business?.timezoneCity || '',
    utcOffset: raw.business?.utcOffset || 'GMT',
    name: raw.business?.name || '',
    address: raw.business?.address || '',
    phone: raw.business?.phone || '',
    today: raw.business?.today || new Date().toISOString().slice(0, 10)
  },
  settings: {
    defaultBookingStatus: raw.settings?.defaultBookingStatus || 'pending',
    slotStep: Number(raw.settings?.slotStep) || 30,
    minLeadMinutes: Number(raw.settings?.minLeadMinutes) || 0,
    maxHorizonDays: Number(raw.settings?.maxHorizonDays) || 365,
    weekStartsOn: Number(raw.settings?.weekStartsOn) || 1,
    dateFormat: raw.settings?.dateFormat || 'F j, Y',
    timeFormat: raw.settings?.timeFormat || 'g:i a',
    phoneField: raw.settings?.phoneField || 'optional'
  },
  // The CURRENT user's saved workspace layouts (D-R74, rest-contract §2.23). `null` = nothing saved, so
  // the defaults apply; `lib/table-preferences.js` owns reading and writing it.
  preferences: {
    bookingsTable: raw.preferences?.bookingsTable && typeof raw.preferences.bookingsTable === 'object' ? raw.preferences.bookingsTable : null
  },
  caps: {
    bookings: raw.caps?.bookings !== false,
    services: Boolean(raw.caps?.services),
    staff: Boolean(raw.caps?.staff),
    settings: Boolean(raw.caps?.settings),
    media: Boolean(raw.caps?.media)
  },
  // Business-hours weekly rows (staff_id=0 scope) — boot data because no REST
  // route reads the business scope yet (see AdminPage::businessWeekly()).
  businessHours: Array.isArray(raw.businessHours) ? raw.businessHours : [],
  // D-R79: an enabled payment module is the site's exclusive checkout (ready or not).
  paymentExclusive: Boolean(raw.paymentExclusive),
  // Booking page the wizard created (readiness card), or null.
  bookingPage: raw.bookingPage && typeof raw.bookingPage === 'object' ? raw.bookingPage : null,
  wizardUrl: raw.wizardUrl || '',
  // Neutral global currency menu for the Settings currency select (same list as the wizard).
  currencies: Array.isArray(raw.currencies) ? raw.currencies : [],
  // Settings tab/panel grouping metadata (SPEC-P1 §1.6) — the Settings tabs render
  // from this; values come from GET /settings. Module catalog (SPEC-P0 §3.2) for the
  // read-only Modules surface. WP privacy tool deep-links for the Privacy launcher (§5).
  settingsSchema: Array.isArray(raw.settingsSchema) ? raw.settingsSchema : [],
  // `available` is the plan truth for THIS build (`Plan::has()`, D-R27) and it is what card
  // state and the `#modules/{code}` route key on. Normalized to a strict boolean here so a
  // bundle newer than the PHP (a half-rebuilt dev tree) degrades to `false` — "not available"
  // is the conservative answer: it keeps the lock and the upsell rather than claiming a
  // capability the site may not own.
  modules: Array.isArray(raw.modules) ? raw.modules.map(mod => ({
    ...mod,
    available: mod?.available === true
  })) : [],
  privacyTools: raw.privacyTools && typeof raw.privacyTools === 'object' ? raw.privacyTools : {},
  // Integration surface (D-R34/D-R35). `redirectUri` is DERIVED, not a setting — the site owner
  // must paste core's exact value into their own OAuth client. `connections` is the non-secret
  // per-staff projection (status / account / since) that the module panel and the staff editor's
  // read-only line both render; it never carries a token. `notice` is the one-shot result of an
  // OAuth return leg, already cleared server-side when this snapshot was built.
  integration: {
    redirectUri: raw.integration?.redirectUri || '',
    notice: raw.integration?.notice && typeof raw.integration.notice === 'object' ? raw.integration.notice : null,
    connections: raw.integration?.connections && typeof raw.integration.connections === 'object' ? raw.integration.connections : {}
  }
};

/** The single "Business time · City (offset)" context line (SPEC-P1 §1.4). */
const businessTimeLine = `Business time · ${config.business.timezoneCity} (${config.business.utcOffset})`;

/***/ },

/***/ "./assets/src/admin/routes/csv-import.css"
/*!************************************************!*\
  !*** ./assets/src/admin/routes/csv-import.css ***!
  \************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
// extracted by mini-css-extract-plugin


/***/ },

/***/ "./assets/src/modules/csv_export/export.css"
/*!**************************************************!*\
  !*** ./assets/src/modules/csv_export/export.css ***!
  \**************************************************/
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
/*!************************************************!*\
  !*** ./assets/src/modules/csv_export/index.js ***!
  \************************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CsvExportPanel: () => (/* binding */ CsvExportPanel)
/* harmony export */ });
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _admin_lib_api_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../admin/lib/api.js */ "./assets/src/admin/lib/api.js");
/* harmony import */ var _admin_routes_csv_import_css__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../admin/routes/csv-import.css */ "./assets/src/admin/routes/csv-import.css");
/* harmony import */ var _export_css__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./export.css */ "./assets/src/modules/csv_export/export.css");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__);






function CsvExportPanel() {
  const [entities, setEntities] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)([]);
  const [entity, setEntity] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)('');
  const [busy, setBusy] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [error, setError] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)('');
  const [count, setCount] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const alive = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useRef)(true);
  const running = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useRef)(false);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    alive.current = true;
    _admin_lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.get('/exports/schema').then(data => {
      if (alive.current) setEntities(data.entities);
    }).catch(e => {
      if (alive.current) setError(e.data?.fields?.export || e.message);
    });
    return () => {
      alive.current = false;
    };
  }, []);
  async function download(entity) {
    if (running.current || !entity) return;
    running.current = true;
    setEntity(entity);
    setBusy(true);
    setError('');
    setCount(0);
    try {
      const parts = [];
      let offset = 0,
        rows = 0,
        bytes = 0;
      do {
        const page = await _admin_lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.get('/exports/rows', {
          entity,
          offset
        });
        if (!alive.current) return;
        rows += page.count;
        bytes += new Blob([page.csv]).size;
        if (rows > 100000 || bytes > 100 * 1048576) throw new Error((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('This export exceeds the import limit of 100 MiB or 100000 rows.', 'aponto'));
        parts.push(page.csv);
        setCount(rows);
        if (page.next_offset !== null && page.next_offset <= offset) throw new Error((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Export could not advance. Please retry.', 'aponto'));
        offset = page.next_offset;
      } while (offset !== null);
      const url = URL.createObjectURL(new Blob(parts, {
        type: 'text/csv;charset=utf-8'
      }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `aponto-${entity}-export.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      if (alive.current) setError(e.data?.fields?.export || e.message);
    } finally {
      running.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("section", {
    className: "ap-module-panel ap-csv-import ap-csv-ui",
    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
      className: "ap-csv-ui__card",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("header", {
        className: "ap-csv-ui__rail",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("h2", {
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Export your CSV', 'aponto')
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("div", {
        className: "ap-csv-ui__body ap-csv-ui__form",
        children: [error && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("div", {
          role: "alert",
          className: "ap-csv-ui__notice is-error",
          children: error
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("table", {
          className: "ap-csv-export-list",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("tbody", {
            children: entities.filter(item => item.key !== 'staff_services').map(item => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("tr", {
              className: "ap-csv-export-row",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsxs)("td", {
                className: "ap-csv-export-row__details",
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("strong", {
                  children: item.label
                }), item.key === 'bookings' && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("p", {
                  className: "ap-module-panel__help",
                  children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Future pending and confirmed bookings.', 'aponto')
                }), item.key === entity && count !== null && !error && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("p", {
                  role: "status",
                  children: busy ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Preparing %d rows…', 'aponto'), count) : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Downloaded %d rows.', 'aponto'), count)
                })]
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("td", {
                className: "ap-csv-export-row__action",
                children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("button", {
                  className: "pd-button",
                  disabled: busy,
                  "aria-busy": busy && item.key === entity,
                  "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Export %s as CSV', 'aponto'), item.label),
                  onClick: () => download(item.key),
                  children: busy && item.key === entity ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Exporting…', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Export CSV', 'aponto')
                })
              })]
            }, item.key))
          })
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_5__.jsx)("p", {
          className: "ap-module-panel__help",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Uses the same columns as CSV import. Archived profiles are excluded. Import customers, locations and staff before services and bookings.', 'aponto')
        })]
      })]
    })
  });
}
const namespace = window.apontoAdmin = window.apontoAdmin || {};
if (typeof namespace.registerModuleSettingsPanel === 'function') namespace.registerModuleSettingsPanel('csv_export', CsvExportPanel);else {
  namespace.moduleSettingsPanels = namespace.moduleSettingsPanels || {};
  namespace.moduleSettingsPanels.csv_export = CsvExportPanel;
}
})();

/******/ })()
;
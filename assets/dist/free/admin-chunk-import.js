"use strict";
(globalThis["webpackChunkaponto"] = globalThis["webpackChunkaponto"] || []).push([["admin-chunk-import"],{

/***/ "./assets/src/admin/routes/CsvImport.jsx"
/*!***********************************************!*\
  !*** ./assets/src/admin/routes/CsvImport.jsx ***!
  \***********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CsvImport: () => (/* binding */ CsvImport)
/* harmony export */ });
/* harmony import */ var _CsvMapping_jsx__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./CsvMapping.jsx */ "./assets/src/admin/routes/CsvMapping.jsx");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _lib_api_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/api.js */ "./assets/src/admin/lib/api.js");
/* harmony import */ var _lib_config_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../lib/config.js */ "./assets/src/admin/lib/config.js");
/* harmony import */ var _lib_ui_jsx__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../lib/ui.jsx */ "./assets/src/admin/lib/ui.jsx");
/* harmony import */ var _modules_catalog_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../modules/catalog.js */ "./assets/src/admin/modules/catalog.js");
/* harmony import */ var _csv_import_state_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./csv-import-state.js */ "./assets/src/admin/routes/csv-import-state.js");
/* harmony import */ var _csv_import_css__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./csv-import.css */ "./assets/src/admin/routes/csv-import.css");
/* harmony import */ var _LargeCsvImport_jsx__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./LargeCsvImport.jsx */ "./assets/src/admin/routes/LargeCsvImport.jsx");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__);












function download(text, name) {
  const url = URL.createObjectURL(new Blob([text], {
    type: 'text/csv;charset=utf-8'
  }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function CsvImport({
  segments = [],
  embedded = false,
  basePath = 'import-csv'
}) {
  const [entity, setEntity] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)('');
  const [schema, setSchema] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
  const [error, setError] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
  const [busy, setBusy] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [csv, setCsv] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)('');
  const [delimiter, setDelimiter] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(',');
  const [inspected, setInspected] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
  const [mapping, setMapping] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)({});
  const [job, setJob] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
  const [page, setPage] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(0);
  const alive = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(true);
  const working = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(false);
  const fileRead = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(0);
  const jobId = segments[1];
  const allowed = (_lib_config_js__WEBPACK_IMPORTED_MODULE_5__.config.caps.bookings || _lib_config_js__WEBPACK_IMPORTED_MODULE_5__.config.caps.services || _lib_config_js__WEBPACK_IMPORTED_MODULE_5__.config.caps.staff || _lib_config_js__WEBPACK_IMPORTED_MODULE_5__.config.caps.settings) && (0,_modules_catalog_js__WEBPACK_IMPORTED_MODULE_7__.moduleAvailable)(_lib_config_js__WEBPACK_IMPORTED_MODULE_5__.config, 'csv_import');
  (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function action(task) {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (caught) {
      if (alive.current) setError(caught);
    } finally {
      working.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function load() {
    await action(async () => {
      const nextJob = jobId ? await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.get(`/imports/${encodeURIComponent(jobId)}`) : null;
      const nextEntity = nextJob?.entity || '';
      const nextSchema = await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.get('/imports/schema' + (nextEntity ? `?entity=${encodeURIComponent(nextEntity)}` : ''));
      if (alive.current) {
        setSchema(nextSchema);
        setEntity(nextEntity);
        setJob(nextJob);
        setPage(0);
      }
    });
  }
  (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (allowed) load();
  }, [jobId, allowed]);
  async function chooseEntity(nextEntity) {
    fileRead.current++;
    setEntity('');
    setCsv('');
    setInspected(null);
    setMapping({});
    setDelimiter(',');
    if (!nextEntity) return;
    await action(async () => {
      const nextSchema = await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.get(`/imports/schema?entity=${encodeURIComponent(nextEntity)}`);
      if (alive.current) {
        setSchema(nextSchema);
        setEntity(nextEntity);
      }
    });
  }
  const entityInfo = schema?.entities?.find(item => item.key === (job?.entity || entity));
  const counts = (0,_csv_import_state_js__WEBPACK_IMPORTED_MODULE_8__.rowCounts)(job?.rows);
  const problems = (0,_csv_import_state_js__WEBPACK_IMPORTED_MODULE_8__.mappingProblems)(inspected?.headers || [], mapping, schema?.fields || []);
  const canMap = !problems.undecided.length && !problems.missing.length && !problems.duplicates.length;
  const ready = job?.status === 'ready';
  async function run() {
    await action(async () => {
      let current = job;
      do {
        current = await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.post(`/imports/${encodeURIComponent(job.id)}/run`, {});
        if (alive.current) setJob(current);
      } while (alive.current && current.status === 'running');
    });
  }
  if (allowed && schema?.upload && (!job || job.paged) && (!jobId || job)) return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_LargeCsvImport_jsx__WEBPACK_IMPORTED_MODULE_10__.LargeCsvImport, {
    schema: schema,
    initialJob: job,
    embedded: embedded,
    basePath: basePath
  });
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("section", {
    className: "ap-csv-import",
    "aria-busy": busy,
    children: [!embedded && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_lib_ui_jsx__WEBPACK_IMPORTED_MODULE_6__.PageHeader, {
      title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('CSV import', 'aponto'),
      actions: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("a", {
        className: "pd-button",
        href: "#modules/csv_import",
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Module settings', 'aponto')
      })
    }), !allowed ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("p", {
      role: "alert",
      children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('CSV import requires permission to manage the selected data and an available CSV import module.', 'aponto')
    }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.Fragment, {
      children: [error && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
        role: "alert",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_lib_ui_jsx__WEBPACK_IMPORTED_MODULE_6__.RouteError, {
          message: error.message,
          onRetry: !schema || jobId && !job ? load : undefined
        }), error.code === 'aponto_validation' && error.data?.fields && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("ul", {
          children: Object.entries(error.data.fields).filter(([, message]) => typeof message === 'string').map(([field, message]) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("li", {
            children: message
          }, field))
        })]
      }), !schema && !error && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_lib_ui_jsx__WEBPACK_IMPORTED_MODULE_6__.RouteLoading, {
        label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Loading import options…', 'aponto')
      }), schema && !job && !jobId && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.Fragment, {
        children: [!inspected && schema.jobs?.length > 0 && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("details", {
          className: "ap-csv-recent",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("summary", {
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Recent imports (%d)', 'aponto'), schema.jobs.length)
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("div", {
            className: "pd-table-wrap",
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("table", {
              className: "pd-table",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("thead", {
                children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("tr", {
                  children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("th", {
                    children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Data type', 'aponto')
                  }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("th", {
                    children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('File', 'aponto')
                  }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("th", {
                    children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Progress', 'aponto')
                  }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("th", {
                    children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Actions', 'aponto')
                  })]
                })
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("tbody", {
                children: schema.jobs.map(recent => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("tr", {
                  children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("td", {
                    children: schema.entities?.find(item => item.key === recent.entity)?.label || recent.entity
                  }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("td", {
                    children: recent.filename || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('CSV file', 'aponto')
                  }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("td", {
                    children: recent.status === 'ready' ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Ready to import', 'aponto') : recent.status === 'completed' ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Completed', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('%1$d of %2$d rows processed', 'aponto'), recent.processed || 0, recent.total)
                  }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("td", {
                    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
                      className: "ap-csv-actions",
                      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("a", {
                        className: "pd-button sm",
                        href: `#${basePath}/${recent.id}`,
                        children: recent.status === 'completed' ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('View report', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Resume', 'aponto')
                      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("button", {
                        type: "button",
                        className: "pd-button sm",
                        disabled: busy,
                        onClick: () => action(async () => {
                          await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.del(`/imports/${encodeURIComponent(recent.id)}`);
                          setSchema(current => ({
                            ...current,
                            jobs: current.jobs.filter(item => item.id !== recent.id)
                          }));
                        }),
                        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Delete report', 'aponto')
                      })]
                    })
                  })]
                }, recent.id))
              })]
            })
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("p", {
            className: "ap-csv-hint",
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Previews and reports are kept for 24 hours. Deleting a report does not remove imported records.', 'aponto')
          })]
        }), !inspected && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
          className: "ap-csv-fields",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
            __nextHasNoMarginBottom: true,
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('What would you like to import?', 'aponto'),
            disabled: busy,
            value: entity,
            onChange: chooseEntity,
            options: [{
              value: '',
              label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Choose a data type…', 'aponto')
            }, ...(schema.entities || []).filter(item => item.available !== false && item.key !== 'staff_services').map(item => ({
              value: item.key,
              label: item.label
            }))]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("p", {
            className: "ap-csv-hint",
            children: entityInfo?.description || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Choose a data type, then upload its CSV file.', 'aponto')
          })]
        }), entity && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.Fragment, {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("ol", {
            className: "ap-csv-steps",
            "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Import steps', 'aponto'),
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("li", {
              "aria-current": !inspected ? 'step' : undefined,
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('1. Choose file', 'aponto')
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("li", {
              "aria-current": inspected ? 'step' : undefined,
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('2. Match columns', 'aponto')
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("li", {
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('3. Review and import', 'aponto')
            })]
          }), !inspected ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("form", {
            onSubmit: event => {
              event.preventDefault();
              action(async () => {
                const result = await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.post('/imports/inspect', {
                  entity,
                  csv,
                  delimiter
                });
                const suggestions = Object.fromEntries(result.headers.map(header => [header, Object.prototype.hasOwnProperty.call(result.mapping || {}, header) ? result.mapping[header] || undefined : undefined]));
                setMapping(suggestions);
                setInspected(result);
              });
            },
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
              className: "ap-csv-fields",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("label", {
                children: [(0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('CSV file (UTF-8)', 'aponto'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("input", {
                  type: "file",
                  accept: ".csv,text/csv",
                  required: true,
                  disabled: busy,
                  onChange: async e => {
                    const file = e.target.files[0];
                    const readId = ++fileRead.current;
                    setCsv('');
                    setError(null);
                    if (!file) return;
                    if (file.size > schema.limits.bytes) {
                      setError(new Error((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('The file exceeds the import size limit.', 'aponto')));
                      return;
                    }
                    try {
                      const text = await file.text();
                      if (alive.current && readId === fileRead.current) setCsv(text);
                    } catch (caught) {
                      if (alive.current && readId === fileRead.current) setError(caught);
                    }
                  }
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("small", {
                  children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Up to %1$d rows and %2$d KB.', 'aponto'), schema.limits.rows, Math.floor(schema.limits.bytes / 1024))
                })]
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
                __nextHasNoMarginBottom: true,
                label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Column separator', 'aponto'),
                disabled: busy,
                value: delimiter,
                onChange: setDelimiter,
                options: [{
                  value: ',',
                  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Comma', 'aponto')
                }, {
                  value: ';',
                  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Semicolon', 'aponto')
                }, {
                  value: '\t',
                  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Tab', 'aponto')
                }]
              })]
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
              className: "ap-csv-actions",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("button", {
                className: "pd-button primary",
                disabled: busy || !csv,
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Match columns', 'aponto')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("button", {
                type: "button",
                className: "pd-button",
                disabled: busy,
                onClick: () => action(async () => download(await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.get(`/imports/template?entity=${encodeURIComponent(entity)}`), `aponto-${entity}-example.csv`)),
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Download example CSV', 'aponto')
              })]
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("p", {
              className: "ap-module-panel__help",
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Includes sample records. Replace them with your own data before importing.', 'aponto')
            })]
          }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("form", {
            onSubmit: event => {
              event.preventDefault();
              action(async () => {
                const result = await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.post('/imports/preview', {
                  entity,
                  csv,
                  delimiter,
                  mapping
                });
                setJob(result);
                setPage(0);
                window.location.hash = `${basePath}/${result.id}`;
              });
            },
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("p", {
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Match each source column to a field, or explicitly choose to ignore it.', 'aponto')
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(_CsvMapping_jsx__WEBPACK_IMPORTED_MODULE_0__.CsvMapping, {
              fields: schema.fields,
              inspected: inspected,
              mapping: mapping,
              onChange: setMapping,
              busy: busy
            }), problems.missing.length > 0 && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("p", {
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Required fields: %s', 'aponto'), problems.missing.map(field => field.label).join(', '))
            }), problems.duplicates.length > 0 && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("p", {
              role: "alert",
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Each destination field can receive only one CSV column.', 'aponto')
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
              className: "ap-csv-actions",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("button", {
                className: "pd-button primary",
                disabled: busy || !canMap,
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Preview import', 'aponto')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("button", {
                className: "pd-button",
                type: "button",
                disabled: busy,
                onClick: () => setInspected(null),
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Back', 'aponto')
              })]
            })]
          })]
        })]
      }), job && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.Fragment, {
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("h2", {
          children: ready ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Review import', 'aponto') : job.status === 'completed' ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Import complete', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Import progress', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("p", {
          children: entityInfo?.label
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("p", {
          role: "status",
          "aria-live": "polite",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('%1$d new · %2$d existing · %3$d errors', 'aponto'), counts.create, counts.reuse, counts.error)
        }), ready ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("p", {
          children: entityInfo?.review_message || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Only valid rows will be imported. Rows with errors are skipped; existing records are kept unchanged.', 'aponto')
        }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.Fragment, {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("progress", {
            max: job.total || 1,
            value: job.processed || 0,
            "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Import progress', 'aponto')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("p", {
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('%1$d of %2$d rows processed.', 'aponto'), job.processed || 0, job.total)
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("div", {
          className: "pd-table-wrap",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("table", {
            className: "pd-table",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("thead", {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("tr", {
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("th", {
                  children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Row', 'aponto')
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("th", {
                  children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Result', 'aponto')
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("th", {
                  children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Details', 'aponto')
                })]
              })
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("tbody", {
              children: (job.rows || []).slice(page * 25, page * 25 + 25).map(row => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("tr", {
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("td", {
                  children: row.line
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("td", {
                  children: {
                    create: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Will create', 'aponto'),
                    reuse: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Use existing', 'aponto'),
                    created: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Created', 'aponto'),
                    reused: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Used existing', 'aponto'),
                    error: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Error', 'aponto')
                  }[row.status] || row.status
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("td", {
                  children: Object.values(row.errors || {}).join(' · ') || (ready ? Object.values(row.values || {}).filter(value => ['string', 'number', 'boolean'].includes(typeof value)).join(' · ') : row.target_id ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Record #%d', 'aponto'), row.target_id) : '')
                })]
              }, row.line))
            })]
          })
        }), job.rows?.length > 25 && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
          className: "ap-csv-actions",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("button", {
            className: "pd-button sm",
            disabled: page === 0,
            onClick: () => setPage(page - 1),
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Previous', 'aponto')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("span", {
            children: [page + 1, " / ", Math.ceil(job.rows.length / 25)]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("button", {
            className: "pd-button sm",
            disabled: (page + 1) * 25 >= job.rows.length,
            onClick: () => setPage(page + 1),
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Next', 'aponto')
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsxs)("div", {
          className: "ap-csv-actions",
          children: [job.status !== 'completed' && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("button", {
            className: "pd-button primary",
            disabled: busy || ready && counts.create + counts.reuse === 0,
            onClick: run,
            children: busy ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Importing…', 'aponto') : ready ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Import valid rows', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Continue import', 'aponto')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("button", {
            className: "pd-button",
            disabled: busy,
            onClick: () => action(async () => {
              await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.del(`/imports/${encodeURIComponent(job.id)}`);
              setJob(null);
              setInspected(null);
              setCsv('');
              window.location.hash = basePath;
            }),
            children: ready ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Discard preview', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Delete report', 'aponto')
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)("p", {
          className: "ap-csv-hint",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Previews and reports are kept for 24 hours. Deleting the preview or report does not remove imported records. Return from Recent imports or keep this page URL to resume.', 'aponto')
        })]
      })]
    })]
  });
}

/***/ },

/***/ "./assets/src/admin/routes/CsvMapping.jsx"
/*!************************************************!*\
  !*** ./assets/src/admin/routes/CsvMapping.jsx ***!
  \************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CsvMapping: () => (/* binding */ CsvMapping)
/* harmony export */ });
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__);



/** Display destination fields while retaining the REST header-to-field contract. */

function CsvMapping({
  fields,
  inspected,
  mapping,
  onChange,
  busy,
  submitted = false,
  entity
}) {
  const headers = inspected.headers;
  const valueOf = header => Object.prototype.hasOwnProperty.call(mapping, header) ? mapping[header] : undefined;
  const unused = headers.filter(header => !valueOf(header));
  const undecided = unused.filter(header => valueOf(header) !== '');
  function assign(field, header) {
    const next = Object.assign(Object.create(null), mapping);
    for (const previous of headers) {
      if (next[previous] === field) next[previous] = undefined;
    }
    if (header) next[header] = field;
    onChange(next);
  }
  function groupFor(field) {
    if (field.key.startsWith('location_')) return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Location', 'aponto');
    if (entity === 'services' && field.key.startsWith('staff_')) return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Staff', 'aponto');
    if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'time_off'].includes(field.key)) return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Work hours and time off', 'aponto');
    if (['buffer_before', 'buffer_after', 'slot_step_minutes', 'min_lead_minutes', 'max_horizon_days'].includes(field.key)) return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Booking settings', 'aponto');
    return entity === 'services' ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Service details', 'aponto') : entity === 'staff' ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Staff details', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Details', 'aponto');
  }
  const groups = new Map();
  for (const field of fields) {
    const name = entity ? groupFor(field) : '';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(field);
  }
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.Fragment, {
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("div", {
      className: "pd-table-wrap",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("table", {
        className: "ap-csv-mapping-table",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("colgroup", {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("col", {}), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("col", {}), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("col", {})]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("thead", {
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("tr", {
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("th", {
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Destination field', 'aponto')
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("th", {
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('CSV column', 'aponto')
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("th", {
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Example', 'aponto')
            })]
          })
        }), [...groups].map(([name, items]) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("tbody", {
          children: [name && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("tr", {
            className: "ap-csv-ui__group",
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("th", {
              colSpan: "3",
              scope: "colgroup",
              children: name
            })
          }), items.map(field => {
            const header = headers.find(candidate => valueOf(candidate) === field.key) || '';
            const sample = header ? inspected.sample?.[0]?.cells?.[headers.indexOf(header)] : '';
            const invalid = !!(submitted && field.required && !header);
            return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("tr", {
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("th", {
                scope: "row",
                children: [field.label, field.required && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.Fragment, {
                  children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
                    className: "ap-csv-required",
                    "aria-hidden": "true",
                    children: " *"
                  }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
                    className: "screen-reader-text",
                    children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)(' (required)', 'aponto')
                  })]
                })]
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("td", {
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.SelectControl, {
                  __nextHasNoMarginBottom: true,
                  "aria-required": !!field.required,
                  "aria-invalid": !!invalid,
                  "aria-describedby": invalid ? `csv-mapping-error-${field.key}` : undefined,
                  "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(field.required ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('CSV column for %s (required)', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('CSV column for %s', 'aponto'), field.label),
                  disabled: busy,
                  value: header,
                  onChange: value => assign(field.key, value),
                  options: [{
                    value: '',
                    label: field.required ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Choose CSV column…', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Not imported', 'aponto')
                  }, ...headers.map(value => ({
                    value,
                    label: value
                  }))]
                }), invalid && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("p", {
                  className: "ap-csv-ui__field-error",
                  id: `csv-mapping-error-${field.key}`,
                  role: "alert",
                  children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Choose a CSV column for %s.', 'aponto'), field.label)
                })]
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("td", {
                children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
                  className: "ap-csv-sample",
                  children: sample !== undefined && sample !== null && sample !== '' ? sample : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("span", {
                    className: "ap-csv-empty-sample",
                    title: header ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Empty cell in CSV', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('No CSV column selected', 'aponto'),
                    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
                      "aria-hidden": "true",
                      children: "\u2014"
                    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("span", {
                      className: "screen-reader-text",
                      children: header ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Empty cell in CSV', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('No CSV column selected', 'aponto')
                    })]
                  })
                })
              })]
            }, field.key);
          })]
        }, name))]
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("p", {
      className: "ap-module-panel__help",
      children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('— indicates an empty CSV cell or an unselected column; it is not an imported value.', 'aponto')
    }), unused.length > 0 && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxs)("div", {
      className: "ap-csv-unused",
      role: submitted && undecided.length ? 'alert' : undefined,
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("p", {
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Unused CSV columns: %s', 'aponto'), unused.join(', '))
      }), undecided.length > 0 ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("button", {
        type: "button",
        className: "pd-button",
        disabled: busy,
        onClick: () => onChange({
          ...mapping,
          ...Object.fromEntries(undecided.map(header => [header, '']))
        }),
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Ignore unused columns', 'aponto')
      }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_2__.jsx)("p", {
        className: "ap-module-panel__help",
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('These columns will be ignored.', 'aponto')
      })]
    })]
  });
}

/***/ },

/***/ "./assets/src/admin/routes/LargeCsvImport.jsx"
/*!****************************************************!*\
  !*** ./assets/src/admin/routes/LargeCsvImport.jsx ***!
  \****************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   LargeCsvImport: () => (/* binding */ LargeCsvImport)
/* harmony export */ });
/* harmony import */ var _CsvMapping_jsx__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./CsvMapping.jsx */ "./assets/src/admin/routes/CsvMapping.jsx");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _lib_api_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/api.js */ "./assets/src/admin/lib/api.js");
/* harmony import */ var _lib_ui_jsx__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../lib/ui.jsx */ "./assets/src/admin/lib/ui.jsx");
/* harmony import */ var _csv_import_state_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./csv-import-state.js */ "./assets/src/admin/routes/csv-import-state.js");
/* harmony import */ var _large_csv_state_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./large-csv-state.js */ "./assets/src/admin/routes/large-csv-state.js");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__);









function save(parts, filename) {
  const url = URL.createObjectURL(new Blob(parts, {
    type: 'text/csv;charset=utf-8'
  }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function LargeCsvImport({
  schema: initialSchema,
  initialJob = null,
  embedded,
  basePath
}) {
  const [schema, setSchema] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(initialSchema);
  const [job, setJob] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(initialJob);
  const [entity, setEntity] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(initialJob?.entity || '');
  const [file, setFile] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
  const [submitted, setSubmitted] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(0);
  const container = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
  const [dragging, setDragging] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const picker = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
  const dragDepth = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(0);
  const [delimiter, setDelimiter] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(',');
  const [updateStaff, setUpdateStaff] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [updateServices, setUpdateServices] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [inspected, setInspected] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
  const [mapping, setMapping] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)({});
  const [error, setError] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
  const [busy, setBusy] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [importing, setImporting] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const errorNotice = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
  (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (error) {
      errorNotice.current?.focus();
      errorNotice.current?.scrollIntoView?.({
        block: 'center'
      });
    }
  }, [error]);
  const [openingUpload, setOpeningUpload] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const live = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(true);
  const stop = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(false);
  const working = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(false);
  const generation = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(0);
  const operationId = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(0);
  const restored = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(initialJob?.id);
  const current = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(initialJob);
  const inspectionAttempt = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
  const info = schema.entities?.find(item => item.key === entity);
  (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    live.current = true;
    return () => {
      live.current = false;
      stop.current = true;
      generation.current++;
    };
  }, []);
  function accept(next) {
    current.current = next;
    if (live.current) {
      setJob(next);
      if (next?.id && window.location.hash !== `#${basePath}/${next.id}`) window.history.replaceState(window.history.state, '', `#${basePath}/${next.id}`);
    }
  }
  (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (initialJob?.id && initialJob.id !== restored.current) {
      inspectionAttempt.current = null;
      restored.current = initialJob.id;
      generation.current++;
      operationId.current++;
      stop.current = true;
      working.current = false;
      setBusy(false);
      setOpeningUpload(false);
      setError(null);
      setSchema(initialSchema);
      accept(initialJob);
      setEntity(initialJob.entity);
      setFile(null);
      setInspected(null);
      setMapping({});
      setSubmitted(0);
      setImporting(false);
    }
  }, [initialJob?.id]);
  async function task(callback) {
    if (working.current) return;
    working.current = true;
    stop.current = false;
    setBusy(true);
    setError(null);
    const version = generation.current;
    const operation = ++operationId.current;
    const stopped = () => stop.current || !live.current || version !== generation.current;
    try {
      await callback(stopped, next => {
        if (live.current && version === generation.current) accept(next);
      });
    } catch (caught) {
      if (live.current && version === generation.current) setError(caught);
    } finally {
      if (operation === operationId.current) working.current = false;
      if (live.current && version === generation.current && operation === operationId.current) {
        setBusy(false);
      }
    }
  }
  async function choose(key) {
    setSubmitted(0);
    setUpdateStaff(false);
    setUpdateServices(false);
    setEntity('');
    setFile(null);
    setMapping({});
    setInspected(null);
    setDelimiter(',');
    if (key) await task(async stopped => {
      const next = await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.get('/imports/schema', {
        entity: key
      });
      if (!stopped()) {
        setSchema(next);
        setEntity(key);
      }
    });
  }
  function openPicker() {
    if (busy || !picker.current) return;
    picker.current.value = '';
    picker.current.click();
  }
  function dropFile(event) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (busy) return;
    if (event.dataTransfer.files.length !== 1) {
      setFile(null);
      setError(new Error((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Choose one CSV file at a time.', 'aponto')));
      return;
    }
    pickFile(event.dataTransfer.files[0]);
  }
  (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    dragDepth.current = 0;
    setDragging(false);
  }, [busy, entity]);
  function pickFile(next) {
    setError(null);
    setFile(null);
    if (!next) return;
    if (!/\.csv$/i.test(next.name)) {
      setError(new Error((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Choose a CSV file ending in .csv.', 'aponto')));
      return;
    }
    if (!next.size || next.size > schema.upload.bytes) {
      setError(new Error((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Choose a non-empty CSV within the upload size limit.', 'aponto')));
      return;
    }
    if (job && next.size !== job.upload_size) {
      setError(new Error((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Choose the original file with the same size. Its contents will also be verified.', 'aponto')));
      return;
    }
    setFile(next);
  }
  async function inspect(active, stopped) {
    inspectionAttempt.current = active.id;
    const result = await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.post(`/imports/${encodeURIComponent(active.id)}/inspect-upload`, {});
    if (stopped()) return;
    setInspected(result);
    if (active.status !== 'uploaded') {
      setMapping(active.mapping || {});
      return;
    }
    setMapping(Object.fromEntries(result.headers.map(header => [header, Object.prototype.hasOwnProperty.call(result.mapping || {}, header) ? result.mapping[header] || undefined : undefined])));
  }
  (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    const canInspect = job?.status === 'uploaded' || ['validating', 'ready'].includes(job?.status) && Array.isArray(job?.headers) && job?.mapping;
    if (!canInspect || inspected || busy || working.current || inspectionAttempt.current === job.id || current.current?.id !== job.id) return;
    inspectionAttempt.current = job.id;
    task(stopped => inspect(job, stopped));
  }, [job?.id, job?.status, inspected, busy]);
  async function upload() {
    await task(async (stopped, update) => {
      let active = current.current;
      if (!active) {
        active = await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.post('/imports/uploads', {
          entity,
          filename: file.name,
          size: file.size,
          delimiter,
          ...(['services', 'staff'].includes(entity) ? {
            update_staff: updateStaff,
            update_services: updateServices
          } : {})
        });
        update(active);
      } else {
        active = await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.get(`/imports/${encodeURIComponent(active.id)}`);
        update(active);
      }
      if (stopped()) return;
      active = await (0,_large_csv_state_js__WEBPACK_IMPORTED_MODULE_7__.uploadChunks)({
        file,
        job: active,
        chunkBytes: schema.upload.chunk_bytes,
        put: _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.put,
        stopped,
        onJob: update
      });
      if (!stopped() && active.status === 'uploaded') await inspect(active, stopped);
    });
  }
  async function run() {
    if (working.current) return;
    setSubmitted(count => count + 1);
    if (needsCheck && !canMap) return;
    const version = generation.current;
    setImporting(true);
    try {
      await task(async (stopped, update) => {
        let active = current.current;
        if (needsCheck || active.status === 'validating') {
          let first = active.status !== 'validating';
          do {
            active = await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.post(`/imports/${encodeURIComponent(active.id)}/prepare`, first ? {
              mapping
            } : {});
            first = false;
            update(active);
          } while (!stopped() && active.status === 'validating');
        }
        if (stopped() || !['ready', 'running'].includes(active.status)) return;
        if (active.status === 'ready' && !(active.counts?.create || active.counts?.reuse)) return;
        do {
          active = await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.post(`/imports/${encodeURIComponent(active.id)}/run`, {});
          update(active);
        } while (!stopped() && active.status === 'running');
      });
    } finally {
      if (live.current && generation.current === version) setImporting(false);
    }
  }
  async function chooseAnother() {
    if (working.current) return;
    const version = generation.current;
    setOpeningUpload(true);
    try {
      await task(async stopped => {
        const next = await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.get('/imports/schema');
        if (stopped()) return;
        inspectionAttempt.current = null;
        restored.current = null;
        accept(null);
        setSchema(next);
        setSubmitted(0);
        setUpdateStaff(false);
        setUpdateServices(false);
        setEntity('');
        setFile(null);
        setInspected(null);
        setMapping({});
        setSubmitted(0);
        window.location.hash = basePath;
      });
    } finally {
      if (live.current && generation.current === version) setOpeningUpload(false);
    }
  }
  const problems = (0,_csv_import_state_js__WEBPACK_IMPORTED_MODULE_6__.mappingProblems)(inspected?.headers || [], mapping, schema.fields || []);
  const canMap = !problems.undecided.length && !problems.missing.length && !problems.duplicates.length;
  const mappingDirty = job?.status === 'ready' && inspected && inspected.headers.some(header => mapping[header] !== job.mapping?.[header]);
  const needsCheck = job?.status === 'uploaded' || mappingDirty;
  const counts = job?.counts || {};
  const fileStep = !job || job.status === 'uploading';
  const mappingPreview = inspected || (Array.isArray(job?.headers) && job?.mapping ? {
    headers: job.headers,
    sample: []
  } : null);
  const displayedMapping = inspected ? mapping : job?.mapping || {};
  const activeImport = importing || job?.status === 'running';
  const showMapping = !activeImport && mappingPreview && ['uploaded', 'validating', 'ready'].includes(job?.status);
  (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (submitted && !canMap) {
      const field = container.current?.querySelector('[aria-invalid="true"], .ap-csv-unused button');
      field?.focus();
      field?.scrollIntoView?.({
        block: 'center'
      });
    }
  }, [submitted]);
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("section", {
    className: "ap-module-panel ap-csv-import ap-csv-cards ap-csv-ui",
    "aria-busy": busy,
    ref: container,
    children: [!embedded && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_lib_ui_jsx__WEBPACK_IMPORTED_MODULE_5__.PageHeader, {
      title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('CSV import', 'aponto')
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("div", {
      className: "ap-csv-ui__card",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("header", {
        className: "ap-csv-ui__rail",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("h2", {
          children: fileStep ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Import your CSV', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Import: %s', 'aponto'), info?.label || entity)
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("div", {
        className: "ap-csv-ui__body",
        children: [!fileStep && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("div", {
          className: "ap-csv-ui__heading",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("p", {
            children: job?.status === 'completed' ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Your import has finished.', 'aponto') : activeImport ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Your records are being processed. Keep this page open until the import finishes.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Choose the CSV column for each field. Check the example to confirm the match.', 'aponto')
          })
        }), error && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("div", {
          className: "ap-csv-ui__notice is-error",
          role: "alert",
          tabIndex: -1,
          ref: errorNotice,
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("p", {
            children: error.message
          }), error.data?.fields && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("ul", {
            children: Object.values(error.data.fields).filter(text => typeof text === 'string').map((text, index) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("li", {
              children: text
            }, index))
          })]
        }), job && !fileStep && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("div", {
          className: "ap-csv-ui__file",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("span", {
            "aria-hidden": "true",
            children: "CSV"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("div", {
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("strong", {
              children: job.filename
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("small", {
              children: [info?.label, Number.isFinite(job.total) ? ` · ${(0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('%d records', 'aponto'), job.total)}` : '']
            })]
          }), showMapping && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("span", {
            className: "ap-csv-ui__file-note",
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Example shows the first data row', 'aponto')
          })]
        }), fileStep && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("div", {
          className: "ap-csv-ui__form",
          children: [!job && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.Fragment, {
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("div", {
              className: "ap-csv-fields",
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
                __nextHasNoMarginBottom: true,
                label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('What would you like to import?', 'aponto'),
                disabled: busy,
                value: entity,
                onChange: choose,
                options: [{
                  value: '',
                  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Choose a data type…', 'aponto')
                }, ...(schema.entities || []).filter(item => item.available !== false && item.key !== 'staff_services').map(item => ({
                  value: item.key,
                  label: item.label
                }))]
              })
            }), info?.description && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("p", {
              className: "ap-module-panel__intro",
              children: info.description
            })]
          }), entity && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.Fragment, {
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("input", {
              ref: picker,
              className: "ap-csv-file-input",
              hidden: true,
              type: "file",
              accept: ".csv,text/csv",
              "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('CSV file (UTF-8)', 'aponto'),
              disabled: busy,
              onChange: event => {
                const selected = event.target.files[0];
                event.target.value = '';
                if (!busy) pickFile(selected);
              }
            }, entity), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("div", {
              className: `ap-csv-ui__drop ap-csv-dropzone${dragging ? ' is-dragging' : ''}`,
              role: "button",
              tabIndex: busy ? -1 : 0,
              "aria-disabled": busy,
              "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Choose CSV file (UTF-8)', 'aponto'),
              onClick: openPicker,
              onKeyDown: event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openPicker();
                }
              },
              onDragEnter: event => {
                event.preventDefault();
                if (!busy) {
                  dragDepth.current++;
                  setDragging(true);
                }
              },
              onDragOver: event => {
                event.preventDefault();
                if (event.dataTransfer) event.dataTransfer.dropEffect = busy ? 'none' : 'copy';
              },
              onDragLeave: event => {
                event.preventDefault();
                dragDepth.current = Math.max(0, dragDepth.current - 1);
                if (!dragDepth.current) setDragging(false);
              },
              onDrop: dropFile,
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("svg", {
                width: "32",
                height: "32",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "1.5",
                "aria-hidden": "true",
                children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("path", {
                  d: "M12 16V3m-4 4 4-4 4 4M4 15v5h16v-5"
                })
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("span", {
                className: "ap-csv-dropzone__title",
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Drop your CSV file here', 'aponto')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("p", {
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('or click to choose a file', 'aponto')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("small", {
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('UTF-8 CSV · Up to %1$d MiB · %2$d rows', 'aponto'), Math.floor(schema.upload.bytes / 1048576), schema.upload.rows)
              })]
            }), file && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("p", {
              children: [file.name, " \xB7 ", (file.size / 1048576).toFixed(2), " MiB"]
            }), job && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("p", {
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('To resume, select the original file. Every previously uploaded part is verified before new parts are accepted.', 'aponto')
            }), !job && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("div", {
              className: "ap-csv-fields",
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
                __nextHasNoMarginBottom: true,
                label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Column separator', 'aponto'),
                disabled: busy,
                value: delimiter,
                onChange: setDelimiter,
                options: [{
                  value: ',',
                  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Comma', 'aponto')
                }, {
                  value: ';',
                  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Semicolon', 'aponto')
                }, {
                  value: '\t',
                  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Tab', 'aponto')
                }]
              })
            }), !job && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("p", {
              className: "ap-module-panel__help",
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Includes sample records. Replace them with your own data before importing.', 'aponto')
            }), !job && ['services', 'staff'].includes(entity) && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("div", {
              className: "ap-csv-fields",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.CheckboxControl, {
                label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Update existing staff', 'aponto'),
                help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Match by email and update supplied non-empty profile fields. Blank cells keep existing values.', 'aponto'),
                checked: updateStaff,
                onChange: setUpdateStaff,
                disabled: busy
              }), entity === 'services' && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.CheckboxControl, {
                label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Update existing services', 'aponto'),
                checked: updateServices,
                onChange: setUpdateServices,
                disabled: busy
              }), entity === 'staff' && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("p", {
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Supplied weekdays replace hours for those days; OFF closes a day. Blank days stay unchanged. Time off adds absences.', 'aponto')
              })]
            }), job?.status === 'uploading' && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.Fragment, {
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("progress", {
                value: job.upload_received,
                max: job.upload_size,
                "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Upload progress', 'aponto')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("p", {
                role: "status",
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('%1$d of %2$d bytes uploaded.', 'aponto'), job.upload_received, job.upload_size)
              })]
            })]
          })]
        }), !fileStep && !activeImport && ['uploaded', 'ready', 'validating'].includes(job?.status) && !inspected && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("p", {
          role: "status",
          children: busy ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Loading examples…', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Examples could not be loaded. Retry to load the CSV columns.', 'aponto')
        }), showMapping && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.Fragment, {
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_CsvMapping_jsx__WEBPACK_IMPORTED_MODULE_0__.CsvMapping, {
            fields: schema.fields,
            entity: entity,
            inspected: mappingPreview,
            mapping: displayedMapping,
            onChange: setMapping,
            submitted: submitted,
            busy: busy || !inspected || job.status === 'validating'
          }), submitted > 0 && problems.duplicates.length > 0 && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("p", {
            role: "alert",
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Each destination field can receive only one CSV column.', 'aponto')
          })]
        }), (importing || ['validating', 'running'].includes(job?.status)) && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("div", {
          className: "ap-csv-ui__notice",
          role: "status",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("strong", {
            children: job?.status === 'validating' || job?.status === 'uploaded' ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Checking your data…', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Importing…', 'aponto')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("p", {
            children: job?.status === 'validating' ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('%d rows validated.', 'aponto'), job.validated || 0) : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('%1$d of %2$d rows processed.', 'aponto'), job?.processed || 0, job?.total || 0)
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("progress", {
            value: job?.status === 'validating' ? job.validated || 0 : job?.processed || 0,
            max: job?.total || 1,
            "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Import progress', 'aponto')
          })]
        }), job?.status === 'ready' && !mappingDirty && !importing && !(counts.create || counts.reuse) && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("div", {
          className: "ap-csv-ui__notice is-error",
          role: "alert",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("p", {
            children: job.total === 0 ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('No data rows were found in this file. Add at least one row, then choose the file again. No records were imported.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('No rows are ready to import. Correct the CSV data and choose another file.', 'aponto')
          })
        }), job?.status === 'completed' && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("div", {
          className: "ap-csv-ui__metrics",
          role: "status",
          children: [[counts.created || 0, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Created', 'aponto')], [counts.reused || 0, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Existing records', 'aponto')], [counts.error || 0, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Error count', 'aponto')]].map(([number, label]) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("div", {
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("strong", {
              children: number
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("span", {
              children: label
            })]
          }, label))
        }), job?.status === 'failed' && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("div", {
          className: "ap-csv-ui__notice is-error",
          role: "alert",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("strong", {
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Import could not be prepared', 'aponto')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("p", {
            children: job.failure
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("p", {
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Choose another file to start again. No records were imported from this failed preview.', 'aponto')
          })]
        })]
      }), (job || entity) && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("footer", {
        className: "ap-csv-ui__footer ap-csv-workflow__actions",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("div", {
          className: "ap-csv-actions",
          children: [!job && entity && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("button", {
            className: "pd-button",
            disabled: busy,
            onClick: () => task(async stopped => {
              const text = await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.get('/imports/template', {
                entity
              });
              if (!stopped()) save([text], `aponto-${entity}-example.csv`);
            }),
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Download example CSV', 'aponto')
          }), job && job.status !== 'completed' && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("button", {
            className: "pd-button",
            disabled: busy || job.status === 'running',
            "aria-busy": openingUpload,
            onClick: chooseAnother,
            children: openingUpload ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Opening upload…', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Choose another file', 'aponto')
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)("div", {
          className: "ap-csv-actions",
          children: [fileStep && entity && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("button", {
            className: "pd-button primary",
            disabled: busy || !file,
            onClick: upload,
            children: job ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Resume upload', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Next', 'aponto')
          }), !fileStep && !activeImport && ['uploaded', 'ready'].includes(job?.status) && !inspected && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("button", {
            className: "pd-button",
            disabled: busy,
            onClick: () => task(stopped => inspect(job, stopped)),
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Retry loading examples', 'aponto')
          }), ['uploaded', 'ready', 'validating', 'running'].includes(job?.status) && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("button", {
            className: "pd-button primary",
            disabled: busy || job.status === 'uploaded' && !inspected || job.status === 'ready' && !mappingDirty && !(counts.create || counts.reuse),
            onClick: run,
            children: importing ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Importing…', 'aponto') : job.status === 'running' ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Continue import', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Start import', 'aponto')
          }), job?.status === 'completed' && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("button", {
            className: "pd-button primary",
            disabled: busy,
            "aria-busy": openingUpload,
            onClick: chooseAnother,
            children: openingUpload ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Opening upload…', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_3__.__)('Import another file', 'aponto')
          })]
        })]
      })]
    })]
  });
}

/***/ },

/***/ "./assets/src/admin/routes/csv-import-state.js"
/*!*****************************************************!*\
  !*** ./assets/src/admin/routes/csv-import-state.js ***!
  \*****************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   mappingProblems: () => (/* binding */ mappingProblems),
/* harmony export */   reportCsv: () => (/* binding */ reportCsv),
/* harmony export */   rowCounts: () => (/* binding */ rowCounts)
/* harmony export */ });
/** Validate column decisions without coupling the UI to any entity field list. */
function mappingProblems(headers, mapping, fields) {
  const owns = header => Object.prototype.hasOwnProperty.call(mapping, header);
  const selected = headers.map(header => owns(header) ? mapping[header] : undefined);
  return {
    undecided: headers.filter(header => !owns(header) || mapping[header] === undefined),
    missing: fields.filter(field => field.required && !selected.includes(field.key)),
    duplicates: selected.filter((key, index) => key && selected.indexOf(key) !== index)
  };
}
function rowCounts(rows = []) {
  return rows.reduce((counts, row) => {
    if (['create', 'created'].includes(row.status)) counts.create++;
    if (['reuse', 'reused'].includes(row.status)) counts.reuse++;
    if (row.status === 'error') counts.error++;
    return counts;
  }, {
    create: 0,
    reuse: 0,
    error: 0
  });
}

/** Reports contain only row numbers and outcomes, never source customer values. */
function reportCsv(rows = []) {
  const cell = value => '"' + String(value ?? '').replace(/^[=+@\-\t\r]/, "'$&").replace(/"/g, '""') + '"';
  return [['row', 'status', 'aponto_id', 'errors'], ...rows.map(row => [row.line, row.status, row.target_id, Object.values(row.errors || {}).join('; ')])].map(row => row.map(cell).join(',')).join('\r\n');
}

/***/ },

/***/ "./assets/src/admin/routes/large-csv-state.js"
/*!****************************************************!*\
  !*** ./assets/src/admin/routes/large-csv-state.js ***!
  \****************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   collectReport: () => (/* binding */ collectReport),
/* harmony export */   encodeSlice: () => (/* binding */ encodeSlice),
/* harmony export */   uploadChunks: () => (/* binding */ uploadChunks)
/* harmony export */ });
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _csv_import_state_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./csv-import-state.js */ "./assets/src/admin/routes/csv-import-state.js");



/** Encode one bounded binary slice, preserving split UTF-8 sequences. */
async function encodeSlice(file, start, end) {
  const bytes = new Uint8Array(await file.slice(start, end).arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}

/** Replay from zero on resume: the server verifies all previously accepted bytes. */
async function uploadChunks({
  file,
  job,
  chunkBytes,
  put,
  stopped,
  onJob
}) {
  for (let index = 0; index * chunkBytes < file.size && !stopped(); index++) {
    const data = await encodeSlice(file, index * chunkBytes, Math.min(file.size, (index + 1) * chunkBytes));
    if (stopped()) break;
    job = await put(`/imports/${encodeURIComponent(job.id)}/chunks/${index}`, {
      data
    });
    onJob(job);
  }
  return job;
}

/** Keep report text only; never retain all decrypted row objects. */
async function collectReport({
  id,
  total,
  get,
  stopped,
  maxBytes = 32 * 1024 * 1024,
  onProgress
}) {
  const parts = [];
  let size = 0;
  for (let offset = 0; offset < total; offset += 100) {
    if (stopped()) return null;
    const page = await get(`/imports/${encodeURIComponent(id)}/rows`, {
      offset,
      limit: 100
    });
    if (stopped()) return null;
    if (!page.rows?.length) throw new Error((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('The report page is unavailable.', 'aponto'));
    const text = (offset ? '\r\n' : '') + (offset ? (0,_csv_import_state_js__WEBPACK_IMPORTED_MODULE_1__.reportCsv)(page.rows).split('\r\n').slice(1).join('\r\n') : (0,_csv_import_state_js__WEBPACK_IMPORTED_MODULE_1__.reportCsv)(page.rows));
    size += new TextEncoder().encode(text).byteLength;
    if (size > maxBytes) throw new Error((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('The report exceeds the 32 MiB download limit. Use the paginated report instead.', 'aponto'));
    parts.push(text);
    onProgress?.(Math.min(total, offset + page.rows.length));
  }
  return parts.length ? parts : [(0,_csv_import_state_js__WEBPACK_IMPORTED_MODULE_1__.reportCsv)([])];
}

/***/ },

/***/ "./assets/src/admin/routes/csv-import.css"
/*!************************************************!*\
  !*** ./assets/src/admin/routes/csv-import.css ***!
  \************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
// extracted by mini-css-extract-plugin


/***/ }

}]);
"use strict";
(globalThis["webpackChunkaponto"] = globalThis["webpackChunkaponto"] || []).push([["admin-chunk-services"],{

/***/ "./assets/src/admin/lib/EditorCard.jsx"
/*!*********************************************!*\
  !*** ./assets/src/admin/lib/EditorCard.jsx ***!
  \*********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   EditorCard: () => (/* binding */ EditorCard)
/* harmony export */ });
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__);
/**
 * One CARD section of a full-page record editor (D-R55).
 *
 * The founder's reference is the Settings panel (`settings/SettingsApp.jsx`): a white surface
 * with a 1px border and a radius, a header holding the panel title and a one-line muted
 * description, a hairline under the header, then the fields in a padded body. Rather than
 * reproduce that look a second time, this component renders the SAME thing: the
 * `@wordpress/components` `Card`/`CardHeader`/`CardBody` trio carrying `.ap-settings-card`,
 * `.ap-settings-card-title` and `.ap-settings-card-desc`. One card anatomy, one stylesheet,
 * so a change to the Settings panels lands here too.
 *
 * `@wordpress/components` is an EXTERNAL in this build (`wp-components`, already a dependency
 * of the admin entry because the Settings chunk uses it), so the import costs the lazy chunk
 * no bytes.
 *
 * What this adds on top of a plain Settings card is the editor contract: the card is a real
 * `<section>` with the anchor id the sticky section nav scrolls to and the IntersectionObserver
 * watches, and it is labelled by its own heading (`aria-labelledby`) so the landmark is named.
 * The header can carry a trailing action (Customize, Add time off) at the inline end.
 *
 * REUSABLE ON PURPOSE, and reused: the Service editor took the same two steps on 2026-09-21 —
 * wrap its sections in `EditorCard`, add `ap-editor-cards` to the form element — which closes
 * the one-release gap D-R55 recorded between the two full-page record editors. Nothing here is
 * staff-specific. The remaining holdout on this shell is the Premium `multi_location` Location
 * form, which is owned elsewhere and is single-section.
 *
 * @param {Object}          props             Card props.
 * @param {string}          props.id          Anchor id, e.g. `staff-details`.
 * @param {string}          props.title       Card title (renders as the section's `h2`).
 * @param {string}          [props.description] One-line muted description under the title.
 * @param {import('react').ReactNode} [props.action]   Trailing header control.
 * @param {string}          [props.className] Extra class on the `<section>`.
 * @param {string}          [props.bodyClassName] Extra class on the body wrapper — the Service
 *                                            editor's grid sections need `pd-form-grid` here.
 * @param {import('react').ReactNode} props.children   Card body.
 * @return {JSX.Element} The card section.
 */


function EditorCard({
  id,
  title,
  description,
  action,
  className,
  bodyClassName,
  children
}) {
  const headingId = `${id}-heading`;
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("section", {
    id: id,
    className: className ? `ap-editor-card ${className}` : 'ap-editor-card',
    "aria-labelledby": headingId,
    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Card, {
      className: "ap-settings-card",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardHeader, {
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
          className: "ap-editor-card-head",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
            className: "ap-editor-card-head-copy",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("h2", {
              id: headingId,
              className: "ap-settings-card-title",
              children: title
            }), description ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("p", {
              className: "ap-settings-card-desc",
              children: description
            }) : null]
          }), action || null]
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.CardBody, {
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("div", {
          className: bodyClassName ? `pd-editor-section-body ${bodyClassName}` : 'pd-editor-section-body',
          children: children
        })
      })]
    })
  });
}

/***/ },

/***/ "./assets/src/admin/lib/MultiSelectPopover.jsx"
/*!*****************************************************!*\
  !*** ./assets/src/admin/lib/MultiSelectPopover.jsx ***!
  \*****************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MultiSelectPopover: () => (/* binding */ MultiSelectPopover)
/* harmony export */ });
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _multi_select_popover_styles_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./multi-select-popover-styles.js */ "./assets/src/admin/lib/multi-select-popover-styles.js");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__);
/**
 * Reusable multiple selector for bounded local catalogs and REST-backed catalogs.
 *
 * The caller owns the selected values and the selected item snapshots. An empty
 * value is deliberately valid so product surfaces can give it a domain meaning
 * such as "all services". Dynamic loaders run only while the popover is open,
 * are debounced, and cannot let an older response replace a newer search.
 */





(0,_multi_select_popover_styles_js__WEBPACK_IMPORTED_MODULE_3__.ensureMultiSelectPopoverStyles)();
let nextId = 0;
const defaultItemValue = item => item?.id ?? item?.value;
const defaultItemLabel = item => String(item?.label ?? item?.name ?? '');
const defaultItemDescription = item => String(item?.description ?? item?.meta ?? '');
const itemKey = value => String(value ?? '');
function mergeItems(localItems, remoteItems, getItemValue) {
  const merged = new Map();
  [...localItems, ...remoteItems].forEach(item => {
    const key = itemKey(getItemValue(item));
    if (key) {
      merged.set(key, item);
    }
  });
  return Array.from(merged.values());
}
function matchesQuery(item, query, getItemLabel, getItemDescription) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) {
    return true;
  }
  return `${getItemLabel(item)} ${getItemDescription(item)}`.toLocaleLowerCase().includes(needle);
}

/**
 * Render a click-to-open multiple selector with local and optional remote search.
 *
 * `loadItems` receives `{ search, perPage }` and may return an item array or a
 * REST-style `{ items, meta: { has_more } }` envelope. `onChange` receives both
 * the next value list and all selected item snapshots currently known.
 *
 * Two presentation props for a picker that sits INSIDE a list row (D-R64, the Service editor's
 * "Staff & locations" rows): `hideLabel` keeps `label` as the control's accessible name — the
 * trigger and the option group stay `aria-labelledby` it, so the name still reads "<label>,
 * <current value>" — without painting it as a heading above the trigger; `selectionText` replaces
 * the generic "N items selected" summary when the caller can say it better ("Downtown, Uptown").
 */
function MultiSelectPopover({
  label,
  value = [],
  items = [],
  onChange,
  loadItems,
  perPage = 10,
  debounceMs = 250,
  getItemValue = defaultItemValue,
  getItemLabel = defaultItemLabel,
  getItemDescription = defaultItemDescription,
  placeholder,
  searchPlaceholder,
  emptyText,
  loadingText,
  errorText,
  noSelectionText,
  selectionText,
  hideLabel = false,
  help,
  validationMessage,
  disabled = false
}) {
  const [id] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(() => `ap-multiselect-${++nextId}`);
  const [open, setOpen] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [query, setQuery] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('');
  const [remoteItems, setRemoteItems] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)([]);
  const [loading, setLoading] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [loadError, setLoadError] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [hasMore, setHasMore] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [retry, setRetry] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(0);
  const loaderRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)(loadItems);
  loaderRef.current = loadItems;
  const safeValue = Array.isArray(value) ? value : [];
  const safeItems = Array.isArray(items) ? items : [];
  const safeRemoteItems = Array.isArray(remoteItems) ? remoteItems : [];
  const selectedKeys = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useMemo)(() => new Set(safeValue.map(itemKey)), [safeValue]);
  const mergedItems = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useMemo)(() => mergeItems(safeItems, safeRemoteItems, getItemValue), [safeItems, safeRemoteItems, getItemValue]);
  const visibleItems = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useMemo)(() => mergedItems.filter(item => matchesQuery(item, query, getItemLabel, getItemDescription)), [mergedItems, query, getItemLabel, getItemDescription]);
  const knownByKey = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useMemo)(() => new Map(mergedItems.map(item => [itemKey(getItemValue(item)), item])), [mergedItems, getItemValue]);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    if (!open || typeof loaderRef.current !== 'function') {
      return undefined;
    }
    let active = true;
    setLoading(true);
    setLoadError(false);
    const timer = window.setTimeout(async () => {
      try {
        const response = await loaderRef.current({
          search: query.trim(),
          perPage
        });
        if (!active) {
          return;
        }
        const nextItems = Array.isArray(response) ? response : response?.items;
        setRemoteItems(Array.isArray(nextItems) ? nextItems : []);
        setHasMore(!Array.isArray(response) && !!response?.meta?.has_more);
      } catch {
        if (active) {
          setLoadError(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, debounceMs);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, query, perPage, debounceMs, retry]);
  const updateSelection = (item, checked) => {
    const rawValue = getItemValue(item);
    const key = itemKey(rawValue);
    const nextValues = checked ? [...safeValue.filter(current => itemKey(current) !== key), rawValue] : safeValue.filter(current => itemKey(current) !== key);
    const nextByKey = new Map(knownByKey);
    nextByKey.set(key, item);
    onChange?.(nextValues, nextValues.map(current => nextByKey.get(itemKey(current))).filter(Boolean));
  };
  // Focus moves to the search field BEFORE the selection empties (D-R63 fix round 1, browser QA
  // B2): Clear used to unmount itself with focus on it, focus fell to <body>, and the Popover's
  // Escape / focus-outside close stopped firing. The button now also stays mounted (disabled
  // when there is nothing to clear), so the toolbar does not shift under the pointer either.
  const searchRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
  const clear = () => {
    searchRef.current?.focus();
    onChange?.([], []);
  };
  const selectionCount = selectedKeys.size;
  const selectedItem = selectionCount === 1 ? knownByKey.get(Array.from(selectedKeys)[0]) : null;
  const triggerText = selectionCount === 0 ? noSelectionText || placeholder || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Select items', 'aponto') : selectionText ? selectionText : selectionCount === 1 && selectedItem ? getItemLabel(selectedItem) : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__._n)('%d item selected', '%d items selected', selectionCount, 'aponto'), selectionCount);
  // Escape closes the popover AND returns focus to the trigger (D-R63 fix round 2, a11y): the
  // focused search field unmounts with the popover, and focus used to fall to <body>. Only on
  // Escape — a click elsewhere moves focus where the operator clicked.
  const rootRef = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
  const escaped = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useRef)(false);
  const toggle = willOpen => {
    setOpen(willOpen);
    if (!willOpen) {
      setQuery('');
      setLoadError(false);
      if (escaped.current) {
        escaped.current = false;
        rootRef.current?.querySelector('.ap-multiselect__trigger')?.focus();
      }
    }
  };
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
    ref: rootRef,
    className: `ap-multiselect${validationMessage ? ' has-error' : ''}`,
    children: [hideLabel ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span", {
      className: "ap-multiselect__label screen-reader-text",
      id: `${id}-label`,
      children: label
    }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("label", {
      className: "ap-multiselect__label",
      id: `${id}-label`,
      children: label
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Dropdown, {
      className: "ap-multiselect__dropdown",
      contentClassName: "ap-multiselect-popover",
      open: open,
      onToggle: toggle,
      focusOnMount: "firstInputElement",
      popoverProps: {
        placement: 'bottom-start'
      },
      renderToggle: ({
        isOpen,
        onToggle
      }) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Button, {
        className: "ap-multiselect__trigger",
        variant: "secondary",
        disabled: disabled,
        onClick: onToggle,
        "aria-expanded": isOpen,
        "aria-labelledby": `${id}-label ${id}-value`,
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span", {
          id: `${id}-value`,
          className: selectionCount ? '' : 'is-placeholder',
          children: triggerText
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("svg", {
          className: "ap-multiselect__chevron",
          viewBox: "0 0 12 12",
          focusable: "false",
          "aria-hidden": "true",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("path", {
            d: "M2.25 4.25 6 8l3.75-3.75"
          })
        })]
      }),
      renderContent: () =>
      /*#__PURE__*/
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- only observes Escape on its way to the Dropdown's own close.
      (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
        className: "ap-multiselect-popover__inner",
        onKeyDown: event => {
          if ('Escape' === event.key) escaped.current = true;
        },
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
          className: "ap-multiselect-popover__header",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("input", {
            ref: searchRef,
            className: "ap-multiselect-popover__search",
            type: "search",
            value: query,
            placeholder: searchPlaceholder || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Search items…', 'aponto'),
            "aria-label": searchPlaceholder || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Search items', 'aponto'),
            autoComplete: "off",
            onChange: event => setQuery(event.target.value)
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
            className: "ap-multiselect-popover__toolbar",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span", {
              children: selectionCount ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__._n)('%d selected', '%d selected', selectionCount, 'aponto'), selectionCount) : placeholder || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Select items', 'aponto')
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Button, {
              variant: "link",
              onClick: clear,
              disabled: !selectionCount,
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Clear', 'aponto')
            })]
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("div", {
          className: "ap-multiselect-popover__list",
          role: "group",
          "aria-labelledby": `${id}-label`,
          children: [visibleItems.map(item => {
            const key = itemKey(getItemValue(item));
            const selected = selectedKeys.has(key);
            return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("label", {
              className: `ap-multiselect-popover__item${selected ? ' is-selected' : ''}`,
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("input", {
                type: "checkbox",
                checked: selected,
                onChange: event => updateSelection(item, event.target.checked)
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span", {
                className: "ap-multiselect-popover__checkbox",
                "aria-hidden": "true",
                children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("svg", {
                  viewBox: "0 0 16 16",
                  focusable: "false",
                  children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("path", {
                    d: "M3.5 8.5 6.6 11.5 12.7 4.9"
                  })
                })
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span", {
                className: "ap-multiselect-popover__item-label",
                children: getItemLabel(item)
              })]
            }, key);
          }), !visibleItems.length && !loading && !loadError ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("p", {
            className: "ap-multiselect-popover__state",
            children: emptyText || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('No matching items.', 'aponto')
          }) : null, loading ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("p", {
            className: "ap-multiselect-popover__state",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Spinner, {}), loadingText || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Loading…', 'aponto')]
          }) : null, loadError ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsxs)("p", {
            className: "ap-multiselect-popover__state is-error",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("span", {
              children: errorText || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Could not load items.', 'aponto')
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_0__.Button, {
              variant: "link",
              onClick: () => setRetry(current => current + 1),
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Retry', 'aponto')
            })]
          }) : null]
        }), hasMore && !loading ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("p", {
          className: "ap-multiselect-popover__more",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_2__.__)('Showing the first %d matches. Refine your search for more.', 'aponto'), perPage)
        }) : null]
      })
    }), help ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("p", {
      className: "ap-multiselect__help",
      children: help
    }) : null, validationMessage ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)("p", {
      className: "ap-multiselect__error",
      children: validationMessage
    }) : null]
  });
}

/***/ },

/***/ "./assets/src/admin/lib/assignment-pairs.js"
/*!**************************************************!*\
  !*** ./assets/src/admin/lib/assignment-pairs.js ***!
  \**************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   locationScopeLabel: () => (/* binding */ locationScopeLabel),
/* harmony export */   memberLocationIds: () => (/* binding */ memberLocationIds),
/* harmony export */   setMemberLocations: () => (/* binding */ setMemberLocations)
/* harmony export */ });
/**
 * Per-member branch math for the Service editor's "Staff & locations" section (D-R63, SPEC-P1
 * §1.1.4), over the per-pair wire of `PUT /services/{id}/eligibility` (rest-contract §2.18).
 *
 * The rule, in one line: an assigned member is EITHER "Every location" — exactly one wildcard pair
 * `{ staff_id, location_id: 0 }` — OR a set of branches, one pair per branch. Choosing branches
 * REPLACES that member's pairs; clearing every branch falls back to the wildcard, so an assigned
 * member never ends with an empty set (that would silently UN-assign them). Other members' pairs
 * are never touched, which is what keeps a non-cartesian mapping ("A everywhere, B only at
 * Uptown") intact through a round-trip.
 *
 * Pure and dependency-free: `tests/js` imports it under plain node.
 */

/**
 * The branches a member is assigned at, or `[]` for "Every location".
 *
 * A member holding a wildcard pair is assigned everywhere, whatever narrower rows sit beside it
 * (legacy data can hold both), so the wildcard wins and the answer is `[]`.
 *
 * @param {Array}  assignments Pairs `{ staff_id, location_id }`.
 * @param {number} staffId     Member.
 * @return {number[]} Location ids, ascending; `[]` = every location (or not assigned).
 */
function memberLocationIds(assignments, staffId) {
  const id = Number(staffId);
  const mine = (assignments || []).filter(pair => Number(pair?.staff_id) === id);
  if (mine.some(pair => 0 === (Number(pair.location_id) || 0))) {
    return [];
  }
  return [...new Set(mine.map(pair => Number(pair.location_id)))].sort((a, b) => a - b);
}

/**
 * Replace one member's pairs with the given branches — or with the wildcard when none are given.
 *
 * @param {Array}    assignments Current pairs.
 * @param {number}   staffId     Member to rewrite (must already be assigned; the checkbox owns
 *                               assign/unassign).
 * @param {number[]} locationIds Picked branches; `[]` = every location.
 * @return {Array} Next pairs.
 */
function setMemberLocations(assignments, staffId, locationIds) {
  const id = Number(staffId);
  const others = (assignments || []).filter(pair => Number(pair?.staff_id) !== id);
  const picked = [...new Set((locationIds || []).map(Number).filter(value => value > 0))].sort((a, b) => a - b);
  if (!picked.length) {
    return [...others, {
      staff_id: id,
      location_id: 0
    }];
  }
  return [...others, ...picked.map(locationId => ({
    staff_id: id,
    location_id: locationId
  }))];
}

/**
 * One-line reading of a member's scope for read-only summaries: "Every location", or the branch
 * names joined with ", " (an id the catalog does not name reads `#N` rather than vanishing).
 *
 * @param {number[]} locationIds  From {@see memberLocationIds}.
 * @param {Array}    locations    Catalog `[ { id, name } ]`.
 * @param {string}   everyLabel   Translated "Every location".
 * @return {string} Summary.
 */
function locationScopeLabel(locationIds, locations, everyLabel) {
  if (!locationIds || !locationIds.length) {
    return everyLabel;
  }
  const byId = new Map((locations || []).map(location => [Number(location.id), location.name]));
  return locationIds.map(locationId => byId.get(Number(locationId)) || `#${locationId}`).join(', ');
}

/***/ },

/***/ "./assets/src/admin/lib/combobox-options.js"
/*!**************************************************!*\
  !*** ./assets/src/admin/lib/combobox-options.js ***!
  \**************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   customerOptions: () => (/* binding */ customerOptions),
/* harmony export */   filterOptions: () => (/* binding */ filterOptions),
/* harmony export */   findOptionById: () => (/* binding */ findOptionById),
/* harmony export */   isSameOption: () => (/* binding */ isSameOption),
/* harmony export */   optionHaystack: () => (/* binding */ optionHaystack),
/* harmony export */   optionKey: () => (/* binding */ optionKey),
/* harmony export */   serviceOptions: () => (/* binding */ serviceOptions),
/* harmony export */   staffOptions: () => (/* binding */ staffOptions)
/* harmony export */ });
/* harmony import */ var _format_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./format.js */ "./assets/src/admin/lib/format.js");
/* harmony import */ var _shared_person_name_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../shared/person-name.js */ "./assets/src/shared/person-name.js");
/**
 * Option helpers for the admin `Combobox` (SPEC-P1 §6.7). Framework-free and
 * side-effect-free; the only ambient input is the store currency the shared money
 * formatter reads from the boot config.
 *
 * Option identity is the RECORD ID, never the display name. Two services (or staff,
 * or customers) may legitimately share a name — `wp aponto seed` plus the wizard's
 * default service both create "Haircut" — and using the name as identity broke twice
 * over: duplicate React keys in the listbox ("Encountered two children with the same
 * key") let rows be dropped/reused, and, worse, a selection could not say WHICH
 * record it meant, so the `service_id` written by POST /bookings was ambiguous.
 *
 * Contract for every option object: `id` decides identity (React key, aria-selected,
 * what gets submitted), `label` is display-only, `meta` is the row's secondary line,
 * `keywords` is extra typeahead text. Filtering always matches the label so typing a
 * name keeps working.
 *
 * Identity alone is invisible, though: two same-named rows still LOOK identical, so
 * the founder approved (2026-07-25) a disambiguation meta line for the two catalogs
 * that lacked one — services show `duration · price`, staff show their email — which
 * is the secondary line the customer picker already renders.
 */



/**
 * Stable listbox key + selection identity for one option.
 *
 * Prefixed so a record id and a fallback label can never collide, and so a
 * name-keyed regression is obvious in the DOM.
 *
 * @param {Object} option Combobox option.
 * @return {string} Identity string ('' for a missing option).
 */
function optionKey(option) {
  if (!option) {
    return '';
  }
  if (option.id !== undefined && option.id !== null && option.id !== '') {
    return `id:${option.id}`;
  }
  // Defensive only: catalogs always carry an id. Ambiguous by construction.
  return `label:${option.label ?? ''}`;
}

/**
 * The option for a record id, or null when the catalog does not carry it.
 *
 * Used to turn a prefilled id — e.g. the staff member whose calendar a free slot was clicked on
 * (D-R28) — into the option object the `Combobox` expects, WITHOUT inventing one: an id the
 * catalog does not contain (archived, or past the catalog's window) must leave the field empty
 * rather than select a record that is not really selectable.
 *
 * @param {Array}         options Combobox options.
 * @param {number|string} id      Record id.
 * @return {?Object} The matching option, or null.
 */
function findOptionById(options, id) {
  if (id === undefined || id === null || id === '') {
    return null;
  }
  return (options || []).find(option => String(option?.id) === String(id)) || null;
}

/**
 * True when both arguments are the same record (by id, not by name).
 *
 * @param {Object} a First option.
 * @param {Object} b Second option.
 * @return {boolean} Whether both options identify the same record.
 */
function isSameOption(a, b) {
  const keyA = optionKey(a);
  return !!keyA && keyA === optionKey(b);
}

/**
 * Typeahead text for one option: the label plus any extra keywords (email/phone).
 *
 * @param {Object} option Combobox option.
 * @return {string} Lowercased haystack.
 */
function optionHaystack(option) {
  return [option?.label, option?.keywords].filter(Boolean).join(' ').toLowerCase();
}

/**
 * Filter options by a raw query. An empty query keeps the full list.
 *
 * @param {Array}  options Option list.
 * @param {string} query   Raw user query.
 * @return {Array} Matching options (same order).
 */
function filterOptions(options = [], query = '') {
  const q = `${query || ''}`.trim().toLowerCase();
  if (!q) {
    return options;
  }
  return options.filter(option => optionHaystack(option).includes(q));
}

/** True for a value that is present enough to render (0 counts, '' / null do not). */
function present(value) {
  return value !== null && value !== undefined && value !== '';
}

/**
 * "30 min · $25.00" secondary line for one service.
 *
 * Both halves reuse what the admin already renders elsewhere, so the dropdown cannot
 * drift from the Services table: duration as `<minutes> min` (`routes/Services.jsx`
 * duration column + service editor readout), price through `format.js` `money()`,
 * which divides the integer minor units by the store currency's own ISO-4217 exponent
 * (invariant 7 — money is never hand-divided here). A service with no configured
 * price contributes no price segment, the same guard the Services table uses instead
 * of printing a fake "$0.00".
 *
 * @param {Object} item REST `/services` item.
 * @return {string} Meta line ('' when the record carries neither value).
 */
function serviceMeta(item) {
  const parts = [];
  if (present(item.duration_minutes)) {
    parts.push(`${item.duration_minutes} min`);
  }
  if (present(item.price_minor)) {
    parts.push((0,_format_js__WEBPACK_IMPORTED_MODULE_0__.money)(item.price_minor));
  }
  return parts.join(' · ');
}

/**
 * Service options. `duration`/`price` ride along so the schedule derivation follows
 * the PICKED record even when another service shares its name; `meta` puts the same
 * two values on screen so the user can SEE which "Haircut" is which before picking.
 *
 * @param {Array} items REST `/services` items.
 * @return {Array} Combobox options.
 */
function serviceOptions(items = []) {
  return (items || []).map(item => ({
    id: item.id,
    label: item.name,
    duration: item.duration_minutes,
    price: item.price_minor,
    meta: serviceMeta(item)
  }));
}

/**
 * The name parts of a person record as typeahead keywords (name split, 2026-10-01). The label is
 * already the display name, which holds both parts; listing them keeps a search by either part
 * working even when a record's composed `name` is missing or differs.
 *
 * @param {Object} item REST customer / staff item.
 * @return {Array} Non-empty parts.
 */
function nameKeywords(item) {
  return [item.first_name, item.last_name].filter(Boolean);
}

/**
 * Staff options. `meta` is the email — the one field that tells two same-named staff
 * apart — and it joins `keywords` exactly like the customer picker's contact details,
 * so what the row shows is also what the typeahead can match. The label is the display name;
 * the parts ride along.
 *
 * @param {Array} items REST `/staff` items.
 * @return {Array} Combobox options.
 */
function staffOptions(items = []) {
  return (items || []).map(item => ({
    id: item.id,
    label: (0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_1__.displayNameOf)(item),
    meta: item.email || '',
    keywords: [...nameKeywords(item), item.email].filter(Boolean).join(' '),
    first_name: item.first_name || '',
    last_name: item.last_name || ''
  }));
}

/**
 * Customer options. `meta` is the secondary line in the entity row; `keywords` adds the name
 * parts + email + phone to the typeahead (the label is the display name). The parts ride along
 * for `POST /bookings`, which takes `customer.first_name` / `customer.last_name`.
 *
 * An `anonymized` record (erased by a privacy request or the retention sweep) is not offered:
 * the route refuses it as `customer_id`, and "Deleted customer" is nobody to book for.
 *
 * @param {Array} items REST `/customers` items.
 * @return {Array} Combobox options.
 */
function customerOptions(items = []) {
  return (items || []).filter(item => !item.anonymized).map(item => ({
    id: item.id,
    label: (0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_1__.displayNameOf)(item),
    meta: item.email || item.phone || '',
    keywords: [...nameKeywords(item), item.email, item.phone].filter(Boolean).join(' '),
    name: (0,_shared_person_name_js__WEBPACK_IMPORTED_MODULE_1__.displayNameOf)(item),
    first_name: item.first_name || '',
    last_name: item.last_name || '',
    email: item.email,
    phone: item.phone
  }));
}

/***/ },

/***/ "./assets/src/admin/lib/editor-guards.js"
/*!***********************************************!*\
  !*** ./assets/src/admin/lib/editor-guards.js ***!
  \***********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hashRecord: () => (/* binding */ hashRecord),
/* harmony export */   useEditorGuards: () => (/* binding */ useEditorGuards)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _nav_guard_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./nav-guard.js */ "./assets/src/admin/lib/nav-guard.js");
/**
 * The TWO dirty-editor guards a full-page record editor needs, as one hook (D-R58).
 *
 * `routes/Staff.jsx` and `routes/Services.jsx` open their editors with NO guard of any kind —
 * no `setNavGuard`, no `beforeunload`, not even a question on Cancel — so the header nav, the
 * WordPress submenu and a hand-edited hash all discarded unsaved edits in silence. That is the
 * follow-up the founder delegated in
 * `docs/handoffs/multi-location-slice-1-2-handoff-2026-09-21.md` §4: "Reproduce first; if real,
 * give Staff (and Service) the same two guards Locations has."
 *
 * "The same two guards" is the point, so this is the LOCATIONS shape (D-R56, fix rounds 1–3),
 * extracted rather than copied:
 *
 *   1. **Cross-route** — `lib/nav-guard.js`. `router.js` runs every ROUTE change through it, so
 *      Bookings / Settings / a WP submenu item for another screen all ask first. The registering
 *      effect is keyed on the DIRTY FLAG and on stable callbacks, never dependency-free: a
 *      no-dependency effect re-registers on the re-render the dialog itself causes, so by the time
 *      the operator answers, the handler being cleared is not the handler that is registered, the
 *      clear-only-if-still-mine rule makes `clearNavGuard()` a no-op, and "Discard" re-asks
 *      forever. That bug was shipped once in `LocationEditor` and is not repeated here.
 *
 *   2. **Same-route** — router.js's own header reserves this to the route ("Same-route segment
 *      changes pass through; the owning route component guards its own sub-navigation"). It is a
 *      RENDER-TIME HOLD plus a MOUNT-LIFETIME listener, and it cannot be anything else: in a real
 *      browser `router.js`'s `hashchange` listener runs first, the browser takes a microtask
 *      checkpoint BETWEEN listeners, React flushes, and any listener owned by a re-running effect
 *      has already been torn down before its turn comes (QA instrumented this for D-R56 round 3;
 *      jsdom hides it, because a script-dispatched event has no checkpoint between listeners).
 *      So the hold is what protects the editor — {@link useEditorGuards} simply does not advance
 *      `shownPath`, and the editor is never unmounted — while the listener exists only to notice
 *      a SECOND attempt, which produces no prop change at all because the router's own state
 *      still holds the target.
 *
 * WHAT COUNTS AS A SAME-ROUTE EXIT IS THE CALLER'S TO SAY (`isExit`), and that is the one real
 * difference from Locations. `#locations/{id}` OWNS the Locations editor, so any other
 * `locations/*` path is an exit. Staff and Services open their editors from LOCAL STATE without
 * touching the hash (`#staff` stays put while the workspace is on screen), so most same-route
 * hashes there change no surface and destroy nothing — asking about them would be a dialog for a
 * navigation that is not happening. Each route names the moves that genuinely replace its open
 * editor and stays silent about the rest.
 *
 * NO MODULE-LEVEL STATE, deliberately (handoff §2): a module bundle is compiled its own copy of
 * every `assets/src/admin/lib/*` file it imports, so anything kept here would silently split in
 * two. Everything this hook owns lives in React state and refs, i.e. per mounted component; the
 * one genuinely shared slot is `nav-guard.js`'s, which already lives on `window.apontoAdmin`.
 * That is what would let `LocationsRoute` / `LocationEditor` adopt this hook later from inside
 * a module entry's own lazy chunk — not done in this change, which touches neither file.
 */



/** Stable empty default, so an omitted `segments` prop does not churn `hashPath`. */
const NO_SEGMENTS = [];

/**
 * The default `isExit`: no same-route hash change replaces this route's editor.
 *
 * @return {boolean} Always false.
 */
function neverExits() {
  return false;
}

/**
 * The record a `{route}/{id}` hash path names, or '' when it names none.
 *
 * Shared by the routes that need it, so "which record does this hash mean" has one answer. The
 * routes narrow it further — Services only accepts digits, because its second segment is also
 * where its tab ids live.
 *
 * @param {string} path Hash path, without the leading `#`.
 * @return {string} The second segment, or ''.
 */
function hashRecord(path) {
  const parts = String(path || '').split('/').filter(Boolean);
  return parts[1] ? String(parts[1]) : '';
}

/**
 * Guard one full-page record editor against both kinds of in-app navigation.
 *
 * @param {Object}   options               Hook options.
 * @param {string[]} [options.segments]    The router's hash segments for this route.
 * @param {boolean}  [options.dirty]       Whether the OPEN editor holds unsaved edits. False when
 *                                         no editor is open — the route reports it up from the
 *                                         editor's own dirty computation.
 * @param {Function} options.confirm       `confirm( opts )` from `lib/confirm.jsx`. Stable.
 * @param {Function} options.discardPrompt `() => opts` — the question, in the editor's own words,
 *                                         so both guards ask it identically. Must be stable
 *                                         (a module-level function), because it keys the
 *                                         registering effect.
 * @param {Function} [options.isExit]      `( nextPath ) => boolean` — whether this same-route move
 *                                         would replace or unmount the open editor. ONE argument
 *                                         on purpose (fix round 2): the answer must be decided
 *                                         against the RECORD THE ROUTE ACTUALLY HAS OPEN, never
 *                                         against the last path this hook was shown. Browser QA
 *                                         found the difference the hard way — see the note on
 *                                         {@link useEditorGuards}'s hold below. Read through a
 *                                         ref, so its identity may change freely.
 * @param {Function} [options.onDiscard]   Called synchronously when a confirmed discard leaves
 *                                         THIS route on screen (the same-route path). The route
 *                                         must use it to RESET the editor — bumping the key it
 *                                         renders the editor with is the honest way — because a
 *                                         discard that leaves the typed text in the form is not a
 *                                         discard. See the stranding note below.
 * @return {{shownPath: string, release: () => void}} `shownPath` is the hash path the surface on
 *         screen corresponds to — the route resolves its deep link / tab from THIS, not from
 *         `segments`, which is what makes the hold protect anything. `release()` drops the guard
 *         synchronously and marks the editor as leaving, for the paths the route settles itself
 *         (Save, a confirmed Cancel): without it the guard would still be registered when the
 *         close assigns a new hash, and the operator would be asked about a departure they just
 *         approved.
 */
function useEditorGuards({
  segments = NO_SEGMENTS,
  dirty = false,
  confirm,
  discardPrompt,
  isExit = neverExits,
  onDiscard
}) {
  // The operator has answered (or saved) and this editor is on its way out. It stops counting as
  // dirty from that moment, so the guard cannot RE-REGISTER between the answer and the editor
  // actually going — which would ask the same question a second time on the very navigation that
  // was just approved (the D-R56 round-1 guard-lifecycle bug).
  //
  // THE LATCH MUST NOT OUTLIVE THE TRANSITION IT WAS SET FOR (fix round 2). Browser QA found a
  // dirty editor left permanently UNGUARDED and still visibly dirty: a discard was confirmed for
  // a target that then replaced nothing, the editor never unmounted, so it never reported clean,
  // so the "drops when clean" rule below never fired. Two things close that off — `leavingFor`,
  // which retires the latch the moment the surface on screen IS the target it was set for, and
  // `onDiscard`, which makes the editor genuinely clean again. Either alone would do; together
  // the stranded state is unreachable, and the worst case if one ever failed is a guard that
  // re-arms too eagerly rather than an editor that silently loses work.
  const [leaving, setLeaving] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const guarded = Boolean(dirty) && !leaving;
  /** The path the current latch was set for, or null when the caller named none. */
  const leavingFor = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);

  /**
   * Release whatever guard is CURRENTLY registered, whoever registered it.
   *
   * Reads the ref, never a closure's own handler: a closure that has been waiting on a dialog
   * holds a handler the next render already replaced, and `clearNavGuard( stale )` is a no-op
   * under the only-if-still-mine rule — which is precisely how the round-1 Locations editor
   * intercepted the navigation the operator had just approved, forever.
   *
   * EVERY `release()` must be paired with an unmount or a reset. The route's own close paths
   * unmount the editor; the same-route discard below resets it through `onDiscard`. A `release()`
   * with neither leaves an editor holding edits that nothing is guarding.
   *
   * @param {string|null} [target] Hash path this release is for, when there is one. The latch
   *                               retires as soon as that path is the surface on screen.
   */
  const guardRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  const release = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)((target = null) => {
    if (guardRef.current) {
      (0,_nav_guard_js__WEBPACK_IMPORTED_MODULE_1__.clearNavGuard)(guardRef.current);
      guardRef.current = null;
    }
    leavingFor.current = 'string' === typeof target ? target : null;
    setLeaving(true);
  }, []);

  // GUARD 1 — CROSS-ROUTE (lib/nav-guard.js, honoured by router.js's `settle()`).
  //
  // Keyed on `[ guarded ]` and three stable callbacks, exactly like `settings/SettingsApp.jsx`:
  // the handler only ASKS A QUESTION, so it never needs a fresh closure over the form, and
  // re-registering it on every render is the bug, not the safety margin.
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!guarded) {
      return undefined;
    }
    const handler = (proceed, cancel) => {
      confirm(discardPrompt()).then(ok => {
        if (!ok) {
          cancel?.();
          return;
        }
        // Unregister SYNCHRONOUSLY — `leaving` only settles on the next render, and the
        // resumed hash assignment re-enters the router before that.
        release();
        proceed();
      });
    };
    guardRef.current = handler;
    (0,_nav_guard_js__WEBPACK_IMPORTED_MODULE_1__.setNavGuard)(handler);
    return () => {
      (0,_nav_guard_js__WEBPACK_IMPORTED_MODULE_1__.clearNavGuard)(handler);
      if (guardRef.current === handler) {
        guardRef.current = null;
      }
    };
  }, [guarded, confirm, discardPrompt, release]);

  // GUARD 2, PART 1 — THE RENDER-TIME HOLD.
  //
  // `shownPath` is the surface ON SCREEN, and it is STATE: when the incoming segments name a
  // different same-route path that WOULD replace the open editor, this render simply does not
  // advance it, so the editor is never unmounted and the form state — the thing being protected —
  // survives. A clean editor, or a move that replaces nothing, just follows.
  //
  // The trigger is the PREVIOUS props value, not `shownPath`: after a decline the router keeps
  // holding the target, and reacting to that standing disagreement would re-ask on every
  // unrelated re-render. The JUDGEMENT, though, is `isExit( hashPath )` alone — it is not given
  // `shownPath`, because deciding against the last path is what browser QA found broken (fix
  // round 2): Back from `#staff/3` to `#staff` is a non-exit, so the hold advanced `shownPath` to
  // `staff`, and pressing Forward straight back to `#staff/3` then looked like "another record's
  // deep link" and asked the operator to discard the record they were already editing. The route
  // knows which record is open; only that can answer the question.
  const hashPath = (Array.isArray(segments) ? segments : NO_SEGMENTS).join('/');
  const [shownPath, setShownPath] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(hashPath);
  const [pendingPath, setPendingPath] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const previousHash = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(hashPath);
  // Readable from the mount-lifetime listener below without re-subscribing. Assigned during
  // render, the same idiom `router.js` uses for its own route mirror.
  const shownRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(shownPath);
  shownRef.current = shownPath;
  const guardedRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(guarded);
  guardedRef.current = guarded;
  const isExitRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(isExit);
  isExitRef.current = isExit;
  // Read through a ref for the same reason: the route rebuilds this callback whenever the record
  // it has open changes, and the prompt effect must not be re-keyed by that.
  const onDiscardRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(onDiscard);
  onDiscardRef.current = onDiscard;
  // The target the operator has already refused. Without it, "Keep editing" would be re-asked on
  // the next render, because the router's own state still points at that target.
  const declined = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  if (hashPath !== previousHash.current) {
    previousHash.current = hashPath;
    if (hashPath !== shownPath) {
      if (guarded && isExit(hashPath)) {
        if (declined.current !== hashPath) {
          // Ask (part 2). Deliberately NOT advancing `shownPath`: the editor stays mounted.
          setPendingPath(hashPath);
        }
      } else {
        setShownPath(hashPath);
      }
    }
  }

  // RETIRE THE LATCH (fix round 2). Two independent conditions, because each covers a case the
  // other cannot: the transition the latch was set for has been APPLIED — the surface on screen
  // is now that target, so whatever was going to happen has happened — or some editor is
  // reporting clean again, which is how the paths that name no target (a confirmed Cancel, a
  // cross-route discard, a Save) retire theirs. Waiting only for the clean report is what left a
  // dirty editor permanently unguarded when the discard replaced nothing.
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!leaving) {
      return;
    }
    if (!dirty || null !== leavingFor.current && shownPath === leavingFor.current) {
      leavingFor.current = null;
      setLeaving(false);
    }
  }, [leaving, dirty, shownPath]);

  // GUARD 2, PART 2 — THE PROMPT.
  //
  // `pendingPath` IS the latch: it is set once by the hold (or by the listener in part 3), and
  // while it is non-null neither path can set it again, so two triggers for one move cannot stack
  // two dialogs. The hash is put back with `replaceState`, which fires no event and therefore
  // cannot re-enter anything.
  //
  // On DISCARD the target is applied here rather than left to the router, because the router's
  // state very often already holds it — that is how this route heard about the move at all — and
  // would answer a re-navigation with "already here".
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!pendingPath) {
      return undefined;
    }
    let live = true;
    window.history.replaceState(null, '', '#' + shownRef.current);
    confirm(discardPrompt()).then(ok => {
      if (!live) {
        return;
      }
      if (!ok) {
        // Stay. The hash is already back; remember the refusal so the standing prop
        // disagreement does not re-ask on the next render.
        declined.current = pendingPath;
        setPendingPath(null);
        return;
      }
      // The latch is named for THIS target, so it retires the moment the target is on screen
      // — whether or not anything unmounted.
      release(pendingPath);
      // DISCARD MEANS DISCARD (fix round 2). Applying the target usually replaces the editor
      // on its own, but it is not guaranteed to: a hand-edited hash can name a record the
      // list does not hold (the `per_page: 100` window), and then nothing remounts and the
      // operator is left looking at the very text they asked to throw away. The route resets
      // the editor for us, which is also what puts the sub-sections' drafts — work hours,
      // time off, staff assignments — back where they were.
      onDiscardRef.current?.();
      declined.current = null;
      setShownPath(pendingPath);
      setPendingPath(null);
      window.location.hash = pendingPath;
    });
    return () => {
      live = false;
    };
  }, [pendingPath, confirm, discardPrompt, release]);

  // GUARD 2, PART 3 — THE REPEATED ATTEMPT.
  //
  // Once part 2 has restored the hash, the router's state still holds the target while the URL
  // says editor — so a SECOND Back (or a second hand-edit to the same hash) produces no prop
  // change at all and the hold has nothing to react to. This listener is the only thing that can
  // notice it.
  //
  // Registered ONCE for the life of the route (`[]`), never re-registered by a render: that is
  // exactly the mistake round 2 made, where a re-render tore the listener down before the browser
  // reached it. Everything it needs is a ref, so there is nothing for a dependency array to
  // invalidate. It tolerates arriving after the hold has already handled the same event —
  // `pendingPath` is set, and the updater leaves it alone.
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    const onHash = () => {
      const now = window.location.hash.replace(/^#/, '');
      if (now === shownRef.current || !guardedRef.current) {
        return;
      }
      // A different ROUTE is `router.js`'s guard (which works); asking here too would prompt
      // twice for one navigation.
      if (now.split('/')[0] !== shownRef.current.split('/')[0]) {
        return;
      }
      if (!isExitRef.current(now)) {
        return;
      }
      // A fresh attempt deserves a fresh question, even one the operator refused before.
      declined.current = null;
      setPendingPath(current => current || now);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return {
    shownPath,
    release
  };
}

/***/ },

/***/ "./assets/src/admin/lib/focus-first-error.js"
/*!***************************************************!*\
  !*** ./assets/src/admin/lib/focus-first-error.js ***!
  \***************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   firstErrorControl: () => (/* binding */ firstErrorControl),
/* harmony export */   focusFirstError: () => (/* binding */ focusFirstError),
/* harmony export */   useFocusFirstError: () => (/* binding */ useFocusFirstError)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _ui_jsx__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./ui.jsx */ "./assets/src/admin/lib/ui.jsx");
/**
 * Take the operator to the first field a save rejected (founder QA 2026-09-21).
 *
 * THE BUG THIS ANSWERS. Both full-page record editors set field errors inline and did nothing
 * else: no scroll, no focus move, no announcement. With the carded layout a long editor is
 * several screens tall, so pressing Save on a service whose NAME is empty while the viewport sits
 * on "Booking policy" looked like the button was broken — the error was painted two screens up,
 * focus stayed on Save, and nothing said a word. That is true of a client-side refusal and of a
 * server `422` with `data.fields` alike, and it is the same gap in both editors, so it is one
 * helper rather than two near-copies.
 *
 * WHY IT SCROLLS THE CONTROL TO THE CENTRE. The editors sit under a sticky page chrome whose
 * height is not one number: the WordPress admin bar is 32px on the desktop breakpoint and 46px
 * at ≤782px, and the sticky section nav adds its own gap. `block: 'center'` is correct at every
 * one of those heights without a magic constant to keep in sync with the stylesheet, and a
 * centred field is also simply easier to find than one pinned to the top edge. The cards keep
 * their `scroll-margin-top` for the section NAV, which is a different job.
 *
 * WHY `preventScroll` ON THE FOCUS. `focus()` scrolls the element into view on its own, with no
 * behaviour or block control, so focusing first and scrolling second makes the browser jump twice
 * — once instantly, once smoothly, from two different positions. Focus with `preventScroll: true`
 * and let the explicit scroll be the only movement.
 */



/**
 * The control a field error belongs to, in DOM order.
 *
 * Looks for `.has-error` — the class BOTH editors already put on the field wrapper when a key of
 * `fieldError` is set — and takes the first focusable control inside it. Keying on the rendered
 * error rather than on the error OBJECT is deliberate: the object's keys are wire names
 * (`price_minor`, `min_lead_minutes`) that do not always match an input's `name`, while
 * `.has-error` is by construction exactly the set of fields the operator can see is wrong.
 *
 * @param {ParentNode} container Editor root to search.
 * @return {?HTMLElement} The control, or `null` when nothing is marked.
 */
function firstErrorControl(container) {
  if (!container) {
    return null;
  }

  // A real form control first; a BUTTON only as a fallback. The featured-image and avatar
  // fields are a preview plus a "Choose photo" button and hold no input at all, so without the
  // fallback a `422` on `avatar_id`/`image_id` would mark a field the operator cannot be sent
  // to. The order matters: a field that has both (the colour picker has an input AND a Clear
  // button) must hand back the input.
  const wrappers = container.querySelectorAll('.has-error');
  for (const wrapper of wrappers) {
    const control = wrapper.matches?.('input, select, textarea') ? wrapper : wrapper.querySelector('input, select, textarea') || wrapper.querySelector('button');
    if (control && !control.disabled) {
      return control;
    }
  }
  return null;
}

/**
 * Scroll to and focus the first rejected field, and say so.
 *
 * Safe to call when nothing is marked — it simply answers `false`, so a caller can use the
 * return value to decide whether it still owes the operator a toast of its own.
 *
 * @param {ParentNode} container      Editor root to search.
 * @param {Function}   [announce]     Called with the announcement string when a field was found.
 * @param {string}     [message]      Announcement copy.
 * @return {boolean} Whether a field was found, scrolled to and focused.
 */
function focusFirstError(container, announce, message = 'Check the highlighted fields.') {
  const control = firstErrorControl(container);
  if (!control) {
    return false;
  }
  control.focus?.({
    preventScroll: true
  });
  control.scrollIntoView?.({
    behavior: (0,_ui_jsx__WEBPACK_IMPORTED_MODULE_1__.motionScrollBehavior)(),
    block: 'center'
  });
  announce?.(message, 'danger');
  return true;
}

/**
 * Run the focus step after a save has painted its errors, WITHOUT depending on
 * `requestAnimationFrame` (founder QA 2026-09-21, round 3).
 *
 * THE BUG. Both editors scheduled the focus with `requestAnimationFrame`, and an embedded
 * browser pane — or an ordinary backgrounded tab — THROTTLES rAF, in some states to never. QA
 * caught `document.activeElement` still on `BODY` after a failed save with the pane hidden: the
 * error paint happened, the focus never did. rAF is a rendering hint, not a scheduler, and
 * correctness must not hang on it.
 *
 * A React EFFECT is the right instrument and needs no scheduler at all: it runs after the DOM
 * is committed, which is the only property the caller actually wanted. The `token` is a counter
 * the save path bumps, so two identical refusals in a row still fire — keying on the error
 * object would not, because a re-submitted form can produce an equal one.
 *
 * @param {number}                    token    Bumped once per refusal; `0` means "never yet".
 * @param {import('react').RefObject} rootRef  Editor root.
 * @param {import('react').RefObject} planRef  `{ announce, message }` for this refusal.
 */
function useFocusFirstError(token, rootRef, planRef) {
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!token) {
      return;
    }
    const plan = planRef.current || {};
    if (!focusFirstError(rootRef.current, plan.announce, plan.message)) {
      plan.fallback?.();
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
}

/***/ },

/***/ "./assets/src/admin/lib/in-flight.js"
/*!*******************************************!*\
  !*** ./assets/src/admin/lib/in-flight.js ***!
  \*******************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   runOnce: () => (/* binding */ runOnce),
/* harmony export */   useInFlight: () => (/* binding */ useInFlight)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/**
 * One request per press (persona QA 2026-10-05, T-065 / T-066 / T-067).
 *
 * Every Save in the admin disabled its button from a `saving` STATE, and state only reaches the
 * DOM on the next render. Two taps that land in the same frame — routine on a phone, where a
 * double tap is ~80 ms — both ran the handler while `saving` still read `false`, so both posted:
 * two identical services, two identical time-off blocks, business hours stored twice.
 *
 * A ref is synchronous. `useInFlight()` returns `run( task )`, which starts `task` only when no
 * earlier one is still pending and releases when it settles — whether it resolved, rejected,
 * threw, or returned early without a promise. A refused call returns `undefined` and does nothing:
 * no request, no toast, no validation pass.
 *
 * The `saving` state stays where it was — it is still what paints "Saving…" and the disabled
 * button — this only closes the window before that paint.
 */


/**
 * The guard itself, outside React, so it can be unit-tested under plain node.
 *
 * @param {{current: boolean}} flag Mutable in-flight flag.
 * @param {Function}           task The work; may return a promise.
 * @return {*} What `task` returned (a promise when it was async), or `undefined` when refused.
 */
function runOnce(flag, task) {
  if (flag.current) {
    return undefined;
  }
  flag.current = true;
  let result;
  try {
    result = task();
  } catch (error) {
    flag.current = false;
    throw error;
  }
  if (result && typeof result.then === 'function') {
    const release = () => {
      flag.current = false;
    };
    // Release on either outcome WITHOUT swallowing a rejection the caller may be awaiting.
    result.then(release, release);
    return result;
  }
  flag.current = false;
  return result;
}

/**
 * @return {Function} `run( task )` — see {@link runOnce}.
 */
function useInFlight() {
  const flag = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(false);
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(task => runOnce(flag, task), []);
}

/***/ },

/***/ "./assets/src/admin/lib/multi-select-popover-styles.js"
/*!*************************************************************!*\
  !*** ./assets/src/admin/lib/multi-select-popover-styles.js ***!
  \*************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ensureMultiSelectPopoverStyles: () => (/* binding */ ensureMultiSelectPopoverStyles)
/* harmony export */ });
const STYLE_ID = 'aponto-multi-select-popover-styles';

/**
 * Load the shared selector styles in every independently built admin entry.
 *
 * TOKENS, NOT LITERALS (D-R64): the sheet shipped with WP-admin literals (`#fff` surfaces,
 * `#8c8f94` borders, `#1d2327` text), so under `data-ap-color-scheme="dark"` the trigger, the
 * search field and the unselected option boxes stayed white on the dark workspace. Every colour now
 * reads the `--ap-*` role the admin's other controls use (`.pd-select`: surface + border-strong +
 * text), with the old literal as the fallback so a page with no token scope renders as before.
 * The popover is portalled to `document.body`, which `lib/theme.js` marks `.ap-token-scope` +
 * `data-ap-visual="v2"` + the scheme exactly so these roles resolve there too. The selected row
 * keeps the WP admin theme colour (white on it reads in both schemes).
 *
 * WP core's `forms.css` styles `input[type="search"]` / `input[type="checkbox"]` at (0,1,1) — more
 * specific than a bare class — so the popover's own inputs are addressed as
 * `.ap-multiselect-popover input.…[type="…"]` (0,3,1), or the search field stays WP-white in the dark
 * scheme (browser QA 2026-09-28). The option checkbox input is visually hidden; its box is our span.
 *
 * The trigger is a `variant="secondary"` Button, and the dark bridge re-colours secondary button
 * LABELS with the readable accent at (0,6,0) — right for a button, wrong for a field. So the value
 * text and the chevron carry their own colour here instead of fighting that rule's specificity.
 */
function ensureMultiSelectPopoverStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.ap-admin .ap-multiselect{display:flex;min-width:0;flex-direction:column;gap:7px}
.ap-admin .ap-multiselect__label{font-weight:650}
.ap-admin .ap-multiselect__dropdown{width:100%}
.ap-admin .ap-multiselect__trigger.components-button{display:flex;width:100%;min-height:40px;height:auto;justify-content:space-between;gap:12px;padding:7px 10px;border-color:var(--ap-color-border-strong,#8c8f94);background:var(--ap-color-surface,#fff);color:var(--ap-color-text,#1d2327);text-align:left;box-shadow:none}
.ap-admin .ap-multiselect__trigger.components-button:hover{border-color:var(--ap-color-accent,#2271b1);color:var(--ap-color-text,#1d2327)}
.ap-admin .ap-multiselect__trigger.components-button:focus-visible{border-color:var(--ap-color-accent,#2271b1);box-shadow:0 0 0 1px var(--ap-color-accent,#2271b1)}
.ap-admin .ap-multiselect__trigger.components-button:disabled{background:var(--ap-color-surface-subtle,#f6f7f7);color:var(--ap-color-text-soft,#646970)}
.ap-admin .ap-multiselect__trigger>span{color:var(--ap-color-text,#1d2327)}
.ap-admin .ap-multiselect__trigger>span.is-placeholder{color:var(--ap-color-text-muted,#646970)}
.ap-admin .ap-multiselect__trigger.components-button:disabled>span{color:var(--ap-color-text-soft,#646970)}
.ap-admin .ap-multiselect__chevron{width:12px;height:12px;flex:none;margin-right:1px;fill:none;stroke:var(--ap-color-text,#1d2327);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.ap-admin .ap-multiselect__help,.ap-admin .ap-multiselect__error{margin:0;font-size:12px;line-height:1.45}
.ap-admin .ap-multiselect__help{color:var(--ap-color-text-muted,#646970)}.ap-admin .ap-multiselect__error{color:var(--ap-color-danger,#b32d2e)}
.ap-admin .ap-multiselect.has-error .ap-multiselect__trigger.components-button{border-color:var(--ap-color-danger,#b32d2e)}
.ap-multiselect-popover.components-popover{z-index:100001}
.ap-multiselect-popover .components-popover__content{width:min(380px,calc(100vw - 32px));padding:0;border:1px solid var(--ap-color-border-strong,#c3c4c7);border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,.16);overflow:hidden;background:var(--ap-color-surface,#fff)}
.ap-multiselect-popover__inner{max-height:min(420px,calc(100vh - 48px));overflow-y:auto;overscroll-behavior:contain;color:var(--ap-color-text,#1d2327);background:var(--ap-color-surface,#fff)}
.ap-multiselect-popover__header{position:sticky;z-index:2;top:0;border-bottom:1px solid var(--ap-color-border,#eee);background:var(--ap-color-surface,#fff)}
.ap-multiselect-popover input.ap-multiselect-popover__search[type="search"]{display:block;width:calc(100% - 24px);min-height:40px;margin:12px;border:1px solid var(--ap-color-border-strong,#8c8f94);border-radius:4px;padding:6px 10px;box-sizing:border-box;background:var(--ap-color-surface,#fff);color:var(--ap-color-text,#1d2327)}
.ap-multiselect-popover input.ap-multiselect-popover__search[type="search"]::placeholder{color:var(--ap-color-text-soft,#646970)}
.ap-multiselect-popover input.ap-multiselect-popover__search[type="search"]:focus{border-color:var(--ap-color-accent,#2271b1);box-shadow:0 0 0 1px var(--ap-color-accent,#2271b1);outline:2px solid transparent}
.ap-multiselect-popover__toolbar{display:flex;min-height:34px;align-items:center;justify-content:space-between;gap:12px;padding:0 12px 8px;color:var(--ap-color-text-muted,#646970);font-size:12px}
.ap-multiselect-popover__toolbar .components-button{height:auto;min-height:0;padding:0}
.ap-multiselect-popover__list{padding:5px}
.ap-multiselect-popover__item{min-height:40px;display:grid;grid-template-columns:18px minmax(0,1fr);gap:9px;align-items:center;padding:0 9px;border-radius:0;color:var(--ap-color-text,#1d2327);cursor:pointer}
.ap-multiselect-popover__item:hover{background:var(--ap-color-surface-muted,#f0f0f1)}
.ap-multiselect-popover__item.is-selected{background:var(--wp-admin-theme-color,#3858e9);color:#fff}
.ap-multiselect-popover__item.is-selected:hover{background:var(--wp-admin-theme-color-darker-10,#2145e6)}
.ap-multiselect-popover .ap-multiselect-popover__item>input[type="checkbox"]{position:absolute;width:1px;height:1px;overflow:hidden;opacity:0}
.ap-multiselect-popover__checkbox{width:17px;height:17px;display:grid;place-items:center;border:1px solid var(--ap-color-border-strong,#8c8f94);border-radius:3px;background:var(--ap-color-surface,#fff);color:transparent;box-sizing:border-box}
.ap-multiselect-popover__checkbox svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.ap-multiselect-popover__item.is-selected .ap-multiselect-popover__checkbox{border-color:#fff;background:#fff;color:var(--wp-admin-theme-color,#3858e9)}
.ap-multiselect-popover__item>input:focus-visible+.ap-multiselect-popover__checkbox{outline:2px solid var(--wp-admin-theme-color,#3858e9);outline-offset:2px}
.ap-multiselect-popover__item.is-selected>input:focus-visible+.ap-multiselect-popover__checkbox{outline-color:#fff}
.ap-multiselect-popover__item-label{overflow:hidden;text-overflow:ellipsis;font-weight:550;white-space:nowrap}
.ap-multiselect-popover__state{display:flex;min-height:52px;align-items:center;justify-content:center;gap:8px;margin:0;padding:12px;color:var(--ap-color-text-muted,#646970);text-align:center}
.ap-multiselect-popover__state .components-spinner{margin:0}.ap-multiselect-popover__state.is-error{color:var(--ap-color-danger,#b32d2e)}
.ap-multiselect-popover__state.is-error .components-button{height:auto;min-height:0;padding:0}
.ap-multiselect-popover__more{margin:0;padding:8px 12px;border-top:1px solid var(--ap-color-border,#eee);color:var(--ap-color-text-muted,#646970);font-size:12px;line-height:1.4}
`;
  document.head.appendChild(style);
}

/***/ },

/***/ "./assets/src/admin/lib/section-nav.js"
/*!*********************************************!*\
  !*** ./assets/src/admin/lib/section-nav.js ***!
  \*********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   activeSectionId: () => (/* binding */ activeSectionId),
/* harmony export */   crossingLine: () => (/* binding */ crossingLine),
/* harmony export */   useSectionNav: () => (/* binding */ useSectionNav)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _ui_jsx__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./ui.jsx */ "./assets/src/admin/lib/ui.jsx");
/**
 * The sticky section nav of the full-page record editors: which item is lit, and how a click
 * gets you there (founder QA 2026-09-21, corrected after the round-2 browser pass).
 *
 * ROUND 1 replaced an IntersectionObserver whose `rootMargin` band was ~10% of the viewport
 * tall — several cards are SHORTER than that, so a one-paragraph card could never be
 * "intersecting" it and never lit at all.
 *
 * ROUND 2 found the replacement's own bug, and it is worth stating precisely because it is the
 * kind of thing that looks right in every unit test and is wrong on every real page. The
 * crossing line was `adminBarHeight() + 48` = **80px**, but a nav click lands a section at
 * **128px**: `html { scroll-padding-top: 32px }` plus the card's own
 * `scroll-margin-top: 96px`. So a section was never "crossed" at the exact position a click
 * put it — the spy disagreed with the scroller by 48px, every time. Measured consequences:
 * "Staff & locations" never activated on the Service editor, "Work hours" never activated on
 * the Staff editor, and a click on "Public profile" REVERTED to Details the moment the
 * optimistic lock expired.
 *
 * So the line is no longer a guess. It is read from the very properties the browser uses to
 * decide where `scrollIntoView` stops — {@see crossingLine} — which means the spy and the
 * scroller cannot drift apart again, whatever the sticky chrome does next.
 *
 * ROUND 3 replaced the tail of that rule. The crossing line was right, but a section whose
 * `reachY` (the scroll position at which it would cross) exceeds `maxScroll` can NEVER be
 * reached — the page clamps first — and the `atBottom` + viewport-middle heuristic that was
 * covering for it was both incomplete and non-monotonic. Measured: on the Service editor at
 * 1440x900 "Booking policy" never activated at any scroll position, a click on it reverted
 * ~0.7s later, and at 1440x1300 the bottom clamp jumped from "Public content" straight to
 * "Staff & locations", skipping "Duration & price" entirely.
 *
 * The replacement is one deterministic rule with no heuristics in it: the UNREACHABLE TAIL
 * SHARES THE FINAL STRETCH OF SCROLL. See {@see activeSectionId}. It guarantees that every nav
 * item activates, in document order, never backwards, on any viewport height, and it needs no
 * dead padding at the foot of the page to do it.
 *
 * Two more rules earn their place, each from a measured failure:
 *
 *  - **A clicked target holds until the OPERATOR scrolls**, not until a timer expires. Releasing
 *    on `scrollend` alone is what made a click on an unreachable section revert: the smooth
 *    scroll ends at the clamp, the lock lifts, and the rule answers with whatever is actually on
 *    the line. User intent is read from `wheel`, `touchmove` and the scrolling keys, plus a
 *    post-settle guard for anything else (a scrollbar drag).
 *  - **A page that cannot scroll has no spy.** `maxScroll <= 2` at load lit the LAST item.
 */



/**
 * Slack, in pixels, on the crossing test.
 *
 * Sub-pixel layout, zoom and fractional device ratios mean a section that the scroller put
 * exactly on the line can measure a hair below it. Without this the section a click just
 * scrolled to can fail its own crossing test by a quarter of a pixel.
 */
const CROSSING_TOLERANCE = 6;

/** Fallback for browsers without `scrollend`: how long a click owns the highlight. */
const SCROLL_SETTLE_MS = 700;

/**
 * Where a section comes to rest when it is scrolled to, which is the only sensible line for
 * "this section is now the current one".
 *
 * `scroll-padding-top` belongs to the scrolling element and `scroll-margin-top` to the target;
 * the browser adds them, and so do we. Both are read from computed style rather than mirrored
 * as constants, so a stylesheet change moves the nav's idea of "current" with it.
 *
 * @param {Element} section The section element.
 * @return {number} The crossing line in pixels from the top of the viewport.
 */
function crossingLine(section) {
  const view = section?.ownerDocument?.defaultView;
  if (!view?.getComputedStyle) {
    return CROSSING_TOLERANCE;
  }
  const padding = parseFloat(view.getComputedStyle(section.ownerDocument.documentElement).scrollPaddingTop);
  const margin = parseFloat(view.getComputedStyle(section).scrollMarginTop);
  return (padding || 0) + (margin || 0) + CROSSING_TOLERANCE;
}

/**
 * Which section is current, as a pure function of the page geometry.
 *
 * THE RULE, in two halves.
 *
 * **Reachable sections behave exactly as before.** A section's `reachY` is the scroll position
 * at which its top lands on its own line: `docTop - line`. While `scrollY` has passed a
 * section's `reachY` and not the next one's, that section is current.
 *
 * **The unreachable tail shares the final stretch.** A section whose `reachY` exceeds
 * `maxScroll` can never come to rest on its line, because the page stops scrolling first — that
 * is not an edge case, it is every last card on a tall viewport. Since `docTop` increases down
 * the page and the line is effectively constant, the unreachable sections are always a SUFFIX.
 * So the remaining scroll from the last reachable section's `reachY` (`y0`) to `maxScroll` is
 * divided into `tail.length + 1` equal slices: slice 0 belongs to that last reachable section,
 * slice k to the k-th unreachable one, and the last slice — anything within 2px of the bottom —
 * always belongs to the final section.
 *
 * That is what makes the guarantee total: EVERY item activates, in order, monotonically, at any
 * viewport height, with no padding added to the document to make room. A degenerate interval
 * (fewer pixels left than there are slices) falls back to "at the bottom, the last section",
 * which is the only honest answer when there is no scroll left to divide.
 *
 * @param {Array<{id: string, docTop: number, line: number}>} sections Sections in DOM order,
 *        each with its position in the DOCUMENT and its own crossing line.
 * @param {Object}  [options]             Rule inputs.
 * @param {number}  [options.scrollY]     Current scroll position.
 * @param {number}  [options.maxScroll]   `scrollHeight - innerHeight`, never negative.
 * @param {?string} [options.clicked]     A target the operator just asked for.
 * @return {?string} The active section id, or `null` when there are no sections.
 */
function activeSectionId(sections, options = {}) {
  const {
    scrollY = 0,
    maxScroll = 0,
    clicked = null
  } = options;
  if (!sections || !sections.length) {
    return null;
  }

  // An explicit request beats every derived answer, for as long as the hook holds it.
  if (clicked && sections.some(section => section.id === clicked)) {
    return clicked;
  }

  // Nothing to spy on: every section is on screen at once and no scrolling will change that,
  // so the honest answer is the first one.
  if (maxScroll <= 2) {
    return sections[0].id;
  }
  const reach = sections.map(section => section.docTop - section.line);

  // The last section that can actually come to rest on its line. `-1` when none can, which is
  // a real case on a very tall viewport: then the whole list is the tail.
  let lastReachable = -1;
  reach.forEach((y, i) => {
    if (y <= maxScroll) {
      lastReachable = i;
    }
  });

  // Ordinary crossing, for everything before the shared stretch.
  let current = -1;
  for (let i = 0; i <= lastReachable; i++) {
    if (scrollY >= reach[i]) {
      current = i;
    }
  }

  // Where the shared stretch starts, given the section that anchors it. When that anchor is
  // itself unreachable — a viewport so tall that not even the first card reaches its line —
  // the stretch starts at the very top, because there is no crossing to start it from.
  const startOf = i => reach[i] <= maxScroll ? Math.max(reach[i], 0) : 0;
  let base = Math.max(lastReachable, 0);
  let slices = sections.length - base;
  // A section can be reachable by a single pixel — `reachY` exactly equal to `maxScroll` —
  // which leaves the tail no room at all and would silently skip it. Widening the stretch one
  // section at a time until it can actually be divided is what turns the guarantee ("every
  // item activates") from a near-miss into a fact; it costs the anchor section its dedicated
  // crossing point, which is the right trade when the alternative is a dead nav entry.
  while (base > 0 && maxScroll - startOf(base) < slices) {
    base--;
    slices++;
  }

  // No tail to share: every section is reachable and the crossing rule is the whole answer.
  if (slices <= 1) {
    return current < 0 ? sections[0].id : sections[current].id;
  }

  // Still above the shared stretch: the ordinary crossing rule still applies. Guarded on
  // `base > 0`, because when the stretch starts at the very top there is nothing above it —
  // and `current` is legitimately `-1` there, since no section has a crossing to pass.
  if (base > 0 && current < base) {
    return current < 0 ? sections[0].id : sections[current].id;
  }
  const y0 = startOf(base);
  const span = maxScroll - y0;
  const atBottom = scrollY >= maxScroll - 2;

  // Fewer pixels left than slices even after widening: there is nothing meaningful to divide,
  // so the only defensible answers are "the anchor" and, at the bottom, "the last one".
  if (span < slices) {
    return atBottom ? sections[sections.length - 1].id : sections[base].id;
  }
  if (atBottom) {
    return sections[sections.length - 1].id;
  }
  if (scrollY <= y0) {
    return sections[base].id;
  }
  const step = Math.floor((scrollY - y0) / (span / slices));
  return sections[base + Math.min(Math.max(step, 0), slices - 1)].id;
}

/**
 * Sticky section nav for one record editor.
 *
 * @param {Object}                     options          Hook options.
 * @param {Array<Array<string>>}       options.anchors  `[ id, label ]` pairs, in DOM order.
 * @param {import('react').RefObject}  options.bodyRef  Ref to the element holding the sections.
 * @param {string}                     options.prefix   Anchor id prefix, e.g. `service-`.
 * @param {boolean}                    [options.ready]  False while the editor is still loading.
 * @return {{active: string, scrollTo: Function}} The lit anchor id and the click handler.
 */
function useSectionNav({
  anchors,
  bodyRef,
  prefix,
  ready = true
}) {
  const [active, setActive] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(anchors[0]?.[0] ?? '');
  // The target of a click the operator has not yet scrolled away from. A ref, not state: the
  // scroll listener reads it without re-subscribing on every change.
  const clicked = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  // Set once the programmatic scroll has settled. From then on ANY scroll movement of more
  // than a couple of pixels is the operator's, which covers the inputs we cannot observe
  // directly — a scrollbar drag above all.
  const armed = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(false);
  const lockedAt = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(0);
  const release = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(() => {});
  const ids = anchors.map(([id]) => id).join('|');
  const measure = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
    const root = bodyRef.current;
    if (!root) {
      return;
    }
    const scrollY = window.scrollY;
    const sections = ids.split('|').filter(Boolean).map(id => {
      const node = root.querySelector(`#${prefix}${id}`);
      if (!node) {
        return null;
      }
      // DOCUMENT-relative, because the rule reasons about the scroll position at which
      // a section would reach its line — a quantity that has to be comparable with
      // `maxScroll`, and a viewport-relative top is not.
      return {
        id,
        docTop: node.getBoundingClientRect().top + scrollY,
        line: crossingLine(node)
      };
    }).filter(Boolean);
    const doc = document.documentElement;
    const next = activeSectionId(sections, {
      scrollY,
      maxScroll: Math.max(doc.scrollHeight - window.innerHeight, 0),
      clicked: clicked.current
    });
    if (next) {
      setActive(next);
    }
  }, [bodyRef, ids, prefix]);

  // Drop the click lock and re-derive once. Kept in a ref so every listener registered by
  // `scrollTo` — and the unmount cleanup — reaches the current version.
  release.current = () => {
    clicked.current = null;
    armed.current = false;
    measure();
  };
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!ready) {
      return undefined;
    }
    let frame = 0;
    const onScroll = () => {
      // Post-settle guard: the scroll is moving and the programmatic one is over, so this
      // is the operator. Catches the inputs with no event of their own (scrollbar drag,
      // a trackpad fling still decelerating, programmatic scrolls from elsewhere).
      if (clicked.current && armed.current && Math.abs(window.scrollY - lockedAt.current) > 2) {
        release.current();
        return;
      }
      if (frame) {
        return;
      }
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };
    measure();
    window.addEventListener('scroll', onScroll, {
      passive: true
    });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [measure, ready]);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => () => {
    clicked.current = null;
    armed.current = false;
  }, []);

  /**
   * Go to a section and light its nav item.
   *
   * THE ONE PATH. A nav click and the Service editor's post-create hand-off both come through
   * here, so they cannot land in two different places again. The scroll itself is deferred to
   * the next frame because the post-create caller scrolls to a section the same state update
   * has just revealed — measuring before the next paint measures the OLD layout.
   *
   * THE LOCK IS RELEASED BY THE OPERATOR, NOT BY A CLOCK (founder QA 2026-09-21, round 3).
   * Releasing on `scrollend` alone is exactly what made a click on an unreachable section
   * revert half a second later: the smooth scroll ends at the page's clamp, the lock lifts,
   * and the derived answer is whatever is genuinely on the line — which for that section is
   * never itself. So the lock ends on evidence of INTENT: a wheel, a touch drag, a scrolling
   * key, or (once the programmatic scroll has settled) any real movement at all.
   *
   * @param {string} id Anchor id, without the prefix.
   */
  const scrollTo = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(id => {
    setActive(id);
    clicked.current = id;
    armed.current = false;
    const keys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar'];
    const onKey = event => {
      if (keys.includes(event.key)) {
        letGo();
      }
    };
    function letGo() {
      window.removeEventListener('wheel', letGo);
      window.removeEventListener('touchmove', letGo);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scrollend', arm);
      release.current();
    }
    // Arming does NOT release: the smooth scroll has merely finished, and the operator may
    // well be looking at exactly where they asked to be. It only says that from here on,
    // movement means them.
    function arm() {
      armed.current = true;
      lockedAt.current = window.scrollY;
    }
    window.addEventListener('wheel', letGo, {
      once: true,
      passive: true
    });
    window.addEventListener('touchmove', letGo, {
      once: true,
      passive: true
    });
    window.addEventListener('keydown', onKey);
    if ('onscrollend' in window) {
      window.addEventListener('scrollend', arm, {
        once: true
      });
    }
    // The timer is not a nicety: a browser without `scrollend`, or a scroll that never
    // starts because the target is already in place, would otherwise never arm the guard.
    window.setTimeout(arm, SCROLL_SETTLE_MS);
    window.requestAnimationFrame(() => {
      // Optional call: `scrollIntoView` is absent in jsdom, and an editor is mounted in
      // unit tests that exercise the save paths this handler now runs from.
      bodyRef.current?.querySelector(`#${prefix}${id}`)?.scrollIntoView?.({
        behavior: (0,_ui_jsx__WEBPACK_IMPORTED_MODULE_1__.motionScrollBehavior)(),
        block: 'start'
      });
    });
  }, [bodyRef, prefix]);
  return {
    active,
    scrollTo
  };
}

/***/ },

/***/ "./assets/src/admin/lib/service-deposit.free.js"
/*!******************************************************!*\
  !*** ./assets/src/admin/lib/service-deposit.free.js ***!
  \******************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   useServiceDeposit: () => (/* binding */ useServiceDeposit)
/* harmony export */ });
/** Free owns no service deposit editor or policy writes (D-R41). */
const NONE = Object.freeze({
  dirty: false,
  ready: true,
  section: null,
  nav: null,
  validate: () => {},
  save: async () => {}
});
function useServiceDeposit() {
  return NONE;
}

/***/ },

/***/ "./assets/src/admin/lib/upcoming-bookings.js"
/*!***************************************************!*\
  !*** ./assets/src/admin/lib/upcoming-bookings.js ***!
  \***************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   countUpcomingBookings: () => (/* binding */ countUpcomingBookings),
/* harmony export */   upcomingBookingsNote: () => (/* binding */ upcomingBookingsNote)
/* harmony export */ });
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./api.js */ "./assets/src/admin/lib/api.js");
/* harmony import */ var _format_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./format.js */ "./assets/src/admin/lib/format.js");
/**
 * How many UPCOMING bookings a change leaves behind (persona QA 2026-10-05, T-075).
 *
 * Archiving a service, or un-assigning a staff member from one, never touches bookings that
 * already exist — but neither dialog said so, and an operator with a full week ahead had to guess
 * whether those customers had just been cancelled. This reads the count the dialogs quote.
 *
 * Two reads of the existing list route, one row each: `total` is the count, and `pending` +
 * `confirmed` are the only statuses that still hold a slot. BEST-EFFORT by design — a failed read
 * (no bookings capability, a network blip) answers `null` and the caller simply says nothing
 * rather than blocking an archive on a courtesy line.
 */




/**
 * @param {{service_id?: number, staff_id?: number}} scope Filter for `GET /bookings`.
 * @return {Promise<?number>} Upcoming pending + confirmed bookings, or null when unknown.
 */
async function countUpcomingBookings(scope) {
  try {
    const from = (0,_format_js__WEBPACK_IMPORTED_MODULE_2__.toUtcInstant)(Date.now());
    const totals = await Promise.all(['pending', 'confirmed'].map(status => _api_js__WEBPACK_IMPORTED_MODULE_1__.api.get('/bookings', {
      ...scope,
      status,
      from,
      per_page: 1
    }).then(res => Number(res?.total) || 0)));
    return totals[0] + totals[1];
  } catch (error) {
    return null;
  }
}

/**
 * The sentence the dialogs append, or '' when there is nothing to say.
 *
 * @param {?number} count Result of {@link countUpcomingBookings}.
 * @return {string} e.g. "3 upcoming bookings keep their slot."
 */
function upcomingBookingsNote(count) {
  if (!count) {
    return '';
  }
  return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.sprintf)(/* translators: %d: number of upcoming bookings that are not affected by the change. */
  (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__._n)('%d upcoming booking keeps its slot.', '%d upcoming bookings keep their slot.', count, 'aponto'), count);
}

/***/ },

/***/ "./assets/src/admin/routes/ServiceEditor.jsx"
/*!***************************************************!*\
  !*** ./assets/src/admin/routes/ServiceEditor.jsx ***!
  \***************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ServiceEditor: () => (/* binding */ ServiceEditor),
/* harmony export */   branchPickerSummary: () => (/* binding */ branchPickerSummary),
/* harmony export */   discardPrompt: () => (/* binding */ discardPrompt),
/* harmony export */   eligibilityRows: () => (/* binding */ eligibilityRows),
/* harmony export */   leadHours: () => (/* binding */ leadHours),
/* harmony export */   leadMinutes: () => (/* binding */ leadMinutes),
/* harmony export */   locationScopedStaffIds: () => (/* binding */ locationScopedStaffIds),
/* harmony export */   toggleStaffAssignment: () => (/* binding */ toggleStaffAssignment)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _lib_api_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../lib/api.js */ "./assets/src/admin/lib/api.js");
/* harmony import */ var _lib_config_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../lib/config.js */ "./assets/src/admin/lib/config.js");
/* harmony import */ var _modules_catalog_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../modules/catalog.js */ "./assets/src/admin/modules/catalog.js");
/* harmony import */ var _lib_format_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../lib/format.js */ "./assets/src/admin/lib/format.js");
/* harmony import */ var _lib_combobox_options_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../lib/combobox-options.js */ "./assets/src/admin/lib/combobox-options.js");
/* harmony import */ var _lib_branches_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../lib/branches.js */ "./assets/src/admin/lib/branches.js");
/* harmony import */ var _lib_assignment_pairs_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../lib/assignment-pairs.js */ "./assets/src/admin/lib/assignment-pairs.js");
/* harmony import */ var _lib_MultiSelectPopover_jsx__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../lib/MultiSelectPopover.jsx */ "./assets/src/admin/lib/MultiSelectPopover.jsx");
/* harmony import */ var _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../lib/icon.jsx */ "./assets/src/admin/lib/icon.jsx");
/* harmony import */ var _lib_toast_jsx__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../lib/toast.jsx */ "./assets/src/admin/lib/toast.jsx");
/* harmony import */ var _lib_EditorCard_jsx__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../lib/EditorCard.jsx */ "./assets/src/admin/lib/EditorCard.jsx");
/* harmony import */ var _lib_focus_first_error_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../lib/focus-first-error.js */ "./assets/src/admin/lib/focus-first-error.js");
/* harmony import */ var _lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ../lib/field-error.jsx */ "./assets/src/admin/lib/field-error.jsx");
/* harmony import */ var _lib_section_nav_js__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ../lib/section-nav.js */ "./assets/src/admin/lib/section-nav.js");
/* harmony import */ var _aponto_admin_service_deposit__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! @aponto/admin-service-deposit */ "./assets/src/admin/lib/service-deposit.free.js");
/* harmony import */ var _lib_in_flight_js__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ../lib/in-flight.js */ "./assets/src/admin/lib/in-flight.js");
/* harmony import */ var _lib_upcoming_bookings_js__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ../lib/upcoming-bookings.js */ "./assets/src/admin/lib/upcoming-bookings.js");
/* harmony import */ var _lib_page_title_js__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! ../lib/page-title.js */ "./assets/src/admin/lib/page-title.js");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__);
/**
 * Service editor (SPEC-P1 §1.1) — full-page CARD sections (four since persona QA 2026-10-05,
 * T-074: the empty "Public content" seam card is not rendered until the module ships).
 *
 * D-R55 (extended 2026-09-21): the sections are cards with the Settings panel anatomy, rendered
 * by the shared `lib/EditorCard.jsx`, exactly as the Staff editor's are. Adopting it is the two
 * steps that component's docblock promised — `ap-editor-cards` on the form, `EditorCard` around
 * each section — and it closes the "known and deliberate one-release gap" D-R55 recorded, where
 * the two full-page record editors looked different from each other.
 *
 * Nothing about the editor's behaviour moves with it: same five sections in the same order, same
 * fields in the same order, same anchors (`#service-<id>`) for the sticky nav and the scroll spy,
 * same validation and the same create-then-edit flow. Each card gains ONE honest description line
 * saying what an operator uses it for, and the Public-content seam's "Free — coming soon" badge
 * moves from the old flat header into the card header's trailing `action` slot.
 *
 * The five sections:
 *   1. Details            — name*, category (+ quick-create), description, status
 *                           enum (active|draft|archived, Q3), featured image (Q7).
 *   2. Public content     — honest seam for `service_catalog` (free but unbuilt since
 *                           D-R22; registry phase P5). Card state copy mirrors the
 *                           Modules screen's free+planned state: no phase string, no
 *                           upgrade link, no placeholder controls. This is now the ONLY
 *                           seam left on this page.
 *   3. Duration & price   — duration*, price (minor units), buffers, slot step, color (Q7).
 *   4. Staff & locations   — the eligible-staff editor (SPEC-P1 §1.1.4): a searchable
 *                           multi-select over `GET|PUT /services/{id}/eligibility`
 *                           (rest-contract §2.18). Editable when `multi_staff` is
 *                           available (D-R28); read-only otherwise, since Free
 *                           auto-links its single staff member and there is nothing
 *                           to choose between. With ≥1 active location each assigned
 *                           member also picks WHERE — "Every location" or specific
 *                           branches, one pair per branch (D-R63).
 *   5. Booking policy     — min lead / max horizon (nullable overrides, SPEC-P0 §4.2).
 *
 * Create = POST /services; Edit = PATCH /services/{id}. Capacity is hidden (Q6).
 *
 * WHY the create flow does not simply close (D-R28): the Free staff policy auto-assigns
 * by design (r1 review item 1), so on premium a brand-new service has ZERO rows in
 * `aponto_staff_services` — any-staff availability returns [] and the service is unbookable until
 * someone is assigned. Creating therefore hands the owner straight to this section instead of
 * dropping them back on the list with a service that silently cannot be booked.
 */





















const STATUS_OPTIONS = [{
  value: 'active',
  label: 'Active'
}, {
  value: 'draft',
  label: 'Draft'
}, {
  value: 'archived',
  label: 'Archived'
}];
// R3 — full-page record-editor section nav (mockup .pd-record-editor-page).
//
// These labels are also the CARD TITLES since D-R55 (the same list drives both, so a nav button
// can never name something the page does not show). One consequence, recorded rather than
// silently applied: the Public-content section used to head itself "Public content & media"
// while its nav button said "Public content"; the card title is now the nav's shorter label.
const SECTIONS = [['details', 'Details'], ['pricing', 'Duration & price'], ['assignments', 'Staff & locations'], ['policy', 'Booking policy']];

/**
 * The discard question, in ONE place.
 *
 * THREE guards ask it now (D-R58; handoff 2026-09-21 §4): this editor's own Cancel,
 * `routes/Services.jsx`'s cross-route `nav-guard` handler, and the same-route hold in
 * `lib/editor-guards.js`. Asking it in three sets of words would read as three different features,
 * which is why `LocationEditor.jsx` exports its own the same way. Module-level, so its identity is
 * stable enough to key the registering effect.
 *
 * @return {Object} `useConfirmDialog` options.
 */
function discardPrompt() {
  return {
    title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Discard your changes?', 'aponto'),
    message: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('This service has edits that have not been saved. Leaving now discards them.', 'aponto'),
    confirmText: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Discard changes', 'aponto'),
    cancelText: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Keep editing', 'aponto'),
    destructive: true
  };
}

/**
 * The one-line description under each card title (D-R55 anatomy).
 *
 * A function rather than a module-level map because every line goes through `__()`, and a
 * translated const evaluated at import time would be built before the handle's script
 * translations are in place. Each line answers "what do I use this card for?" in the operator's
 * words, not the schema's.
 *
 * @param {string} id Section id, as listed in SECTIONS.
 * @return {string} The card's one-line description.
 */
function sectionDescription(id) {
  switch (id) {
    case 'details':
      return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('What customers are booking — its name, where it sits in your catalog, and whether it is live.', 'aponto');
    case 'pricing':
      return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('How long an appointment runs, what it costs, and the gap you keep around it.', 'aponto');
    case 'assignments':
      return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Who can be booked for this service — with nobody assigned, nobody can book it.', 'aponto');
    case 'policy':
      return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Per-service overrides for how soon and how far ahead this one can be booked.', 'aponto');
    default:
      return '';
  }
}
function blank() {
  return {
    name: '',
    category_id: '',
    description: '',
    status: 'active',
    image_id: null,
    duration_minutes: 30,
    price: '',
    buffer_before: 0,
    buffer_after: 0,
    slot_step_minutes: '',
    color: '',
    min_lead_minutes: '',
    max_horizon_days: ''
  };
}
function fromDto(dto) {
  return {
    name: dto.name || '',
    category_id: dto.category_id ? String(dto.category_id) : '',
    description: dto.description || '',
    status: dto.status || 'active',
    image_id: dto.image_id ?? null,
    duration_minutes: dto.duration_minutes ?? 30,
    price: dto.price_minor === null || dto.price_minor === undefined ? '' : String((0,_lib_format_js__WEBPACK_IMPORTED_MODULE_5__.minorToMajor)(dto.price_minor)),
    buffer_before: dto.buffer_before ?? 0,
    buffer_after: dto.buffer_after ?? 0,
    slot_step_minutes: dto.slot_step_minutes ?? '',
    color: dto.color || '',
    min_lead_minutes: leadHours(dto.min_lead_minutes),
    max_horizon_days: dto.max_horizon_days ?? ''
  };
}

/**
 * A stored per-service lead time (minutes) as the HOURS the field shows (persona QA 2026-10-05,
 * T-074). The global setting is entered in hours while this override asked for minutes, so "2"
 * meant two hours on one screen and two minutes on the other. The column, the REST field and the
 * form key stay `min_lead_minutes`; only what the operator types changed unit.
 *
 * @param {?number} minutes Stored minutes, or null/undefined for "use the default".
 * @return {string|number} Hours for the input, or '' when unset.
 */
function leadHours(minutes) {
  if (minutes === null || minutes === undefined || minutes === '') {
    return '';
  }
  return Math.round(Number(minutes) / 60 * 100) / 100;
}

/**
 * The hours typed into the lead-time field as whole stored minutes, or null for blank.
 *
 * @param {string|number} hours Field value.
 * @return {?number} Minutes (may be NaN/negative for the validator to refuse), or null.
 */
function leadMinutes(hours) {
  if (String(hours).trim() === '') {
    return null;
  }
  return Math.round(Number(hours) * 60);
}
function numOrNull(value) {
  return String(value).trim() === '' ? null : Number(value);
}

/**
 * @param {Object}    props                 Editor props.
 * @param {string}    props.mode            `create` or `edit`.
 * @param {Object}    [props.service]       The row the list handed over.
 * @param {Array}     props.categories      Category options.
 * @param {Function}  props.onCreateCategory Inline category create.
 * @param {Function}  props.onClose         Leave the editor.
 * @param {Function}  props.onSaved         Reload the list.
 * @param {Function}  [props.onDirtyChange] Report unsaved edits up to the route, which owns both
 *                                          nav guards (`lib/editor-guards.js`).
 * @param {Function}  [props.confirm]       `confirm( opts )` from the ROUTE's `useConfirmDialog`,
 *                                          passed in rather than created here on purpose: this
 *                                          module also exports the pure eligibility helpers, which
 *                                          `tests/js/multi-staff.test.js` imports under plain node,
 *                                          and `lib/confirm.jsx` pulls in `@wordpress/components`.
 *                                          The route renders the one dialog both guards and this
 *                                          editor's Cancel share.
 */
function ServiceEditor({
  mode,
  service,
  categories,
  onCreateCategory,
  onClose,
  onSaved,
  onDirtyChange,
  confirm
}) {
  const showToast = (0,_lib_toast_jsx__WEBPACK_IMPORTED_MODULE_11__.useToast)();
  const multiStaff = (0,_modules_catalog_js__WEBPACK_IMPORTED_MODULE_4__.moduleAvailable)(_lib_config_js__WEBPACK_IMPORTED_MODULE_3__.config, 'multi_staff');
  // A service created in THIS editor session (premium create-then-edit, see the file header).
  // Once set, the editor is editing that record: `creating` flips false, so Save becomes a
  // PATCH and the eligibility section — which needs a service id — comes alive.
  const [createdId, setCreatedId] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const creating = mode === 'create' && null === createdId;
  // The tab title names the record being edited — its SAVED name, not the one being typed.
  (0,_lib_page_title_js__WEBPACK_IMPORTED_MODULE_19__.usePageTitle)('create' === mode ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('New service', 'aponto') : service?.name);
  const serviceId = service?.id ?? createdId;
  const [loading, setLoading] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(!creating);
  const [saving, setSaving] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  // Pending eligibility edits, published by EligibilitySection as `{ dirty, save }` so the
  // page-level Save can flush them — the same one-continuous-form rule StaffWorkspace follows
  // for work hours (a section that silently drops a pending edit on unmount is a data-loss bug).
  const eligibilityRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  const [form, setForm] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(creating ? blank : () => service ? fromDto(service) : blank());
  const deposit = (0,_aponto_admin_service_deposit__WEBPACK_IMPORTED_MODULE_16__.useServiceDeposit)({
    serviceId,
    price: form.price,
    saving
  });
  const sections = deposit.nav ? [...SECTIONS.slice(0, 3), deposit.nav, ...SECTIONS.slice(3)] : SECTIONS;
  // Signature of the fields the SERVER currently holds — anything else is a pending edit. Moved
  // forward by the fresh GET below and by every successful write, so a save can never leave the
  // editor permanently "dirty" (which would have the guard ask about edits that are saved).
  const [baseline, setBaseline] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(() => JSON.stringify(creating ? blank() : service ? fromDto(service) : blank()));
  // Pending eligibility edits, as state rather than only through `eligibilityRef` — a ref cannot
  // re-render the guard that has to act on it. Same fact, same computation, one source.
  const [eligibilityDirty, setEligibilityDirty] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [fieldError, setFieldError] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)({});
  const [imageUrl, setImageUrl] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)('');
  const [addingCategory, setAddingCategory] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [newCategory, setNewCategory] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)('');
  const formRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  // A refusal counter plus what to say about it. Bumped by every save that rejects, and read
  // by the effect below — which runs after the DOM is committed, so it needs no scheduler.
  // It replaces a `requestAnimationFrame`, which an embedded or backgrounded browser pane
  // throttles to never: the errors painted and the focus simply never moved (round-3 QA).
  const [errorToken, setErrorToken] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(0);
  const errorPlan = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)({});
  (0,_lib_focus_first_error_js__WEBPACK_IMPORTED_MODULE_13__.useFocusFirstError)(errorToken, formRef, errorPlan);

  // Sticky section nav + scroll spy, shared with the Staff editor (`lib/section-nav.js`).
  // The IntersectionObserver band this replaces could not select a card shorter than itself,
  // which on this page meant "Public content" never lit and "Booking policy" was unreachable
  // (founder QA 2026-09-21).
  const {
    active,
    scrollTo
  } = (0,_lib_section_nav_js__WEBPACK_IMPORTED_MODULE_15__.useSectionNav)({
    anchors: sections,
    bodyRef: formRef,
    prefix: 'service-',
    ready: !loading
  });

  // Edit: load a fresh copy so the editor never drifts from the list window.
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (creating || !service?.id) {
      return;
    }
    let live = true;
    _lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.get(`/services/${service.id}`).then(dto => {
      if (live) {
        setForm(fromDto(dto));
        setBaseline(JSON.stringify(fromDto(dto)));
        setLoading(false);
      }
    }).catch(() => {
      if (live) {
        setLoading(false);
      }
    });
    return () => {
      live = false;
    };
  }, [creating, service]);

  /**
   * Whether this editor holds unsaved edits — the fields, a pending staff assignment, or a
   * new-category name typed into the inline create.
   *
   * Reported UP rather than guarded here: `routes/Services.jsx` owns both guards, because it is
   * the component that decides which surface is on screen (the editor opens from LOCAL STATE
   * without touching the hash) and it is the one that survives a same-route move. The unmount
   * report is what makes closing the editor, or discarding onto another record, clear the guard.
   *
   * Never while LOADING: the fresh GET has not landed yet, so the form on screen is the list's
   * row and every difference from it is the server's, not the operator's.
   */
  const dirty = !loading && (JSON.stringify(form) !== baseline || eligibilityDirty || deposit.dirty || Boolean(newCategory.trim()));
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => () => onDirtyChange?.(false), [onDirtyChange]);

  // Cancel asks the same question the nav guards ask. It used to close outright: one click, and a
  // half-filled service was gone with no request, no toast and no way back (handoff §4).
  const leave = async () => {
    if (dirty && confirm && !(await confirm(discardPrompt()))) {
      return;
    }
    onClose?.();
  };

  // Resolve the featured-image thumbnail for display (wp.media attachment).
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!form.image_id || !window.wp?.media) {
      setImageUrl('');
      return;
    }
    const attachment = window.wp.media.attachment(form.image_id);
    attachment.fetch().then(() => setImageUrl(attachment.get('sizes')?.thumbnail?.url || attachment.get('url') || ''));
  }, [form.image_id]);
  const set = key => e => setForm(f => ({
    ...f,
    [key]: e.target.value
  }));
  const pickImage = () => {
    if (!window.wp?.media) {
      showToast('The media library is unavailable on this screen.', 'danger');
      return;
    }
    const frame = window.wp.media({
      title: 'Select featured image',
      button: {
        text: 'Use image'
      },
      multiple: false,
      library: {
        type: 'image'
      }
    });
    frame.on('select', () => {
      const attachment = frame.state().get('selection').first().toJSON();
      setForm(f => ({
        ...f,
        image_id: attachment.id
      }));
      setImageUrl(attachment.sizes?.thumbnail?.url || attachment.url || '');
    });
    frame.open();
  };

  // One request per press (persona QA 2026-10-05, T-066). `saving` reaches the button only on
  // the next render — and was set AFTER validation — so two taps in one frame both posted and
  // "Create service" made two identical services. The ref closes that window synchronously.
  const once = (0,_lib_in_flight_js__WEBPACK_IMPORTED_MODULE_17__.useInFlight)();
  const confirmNewCategory = () => once(async () => {
    const name = newCategory.trim();
    if (!name) {
      return;
    }
    try {
      const created = await onCreateCategory(name);
      setForm(f => ({
        ...f,
        category_id: String(created.id)
      }));
      setAddingCategory(false);
      setNewCategory('');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });
  const saveNow = async () => {
    const errors = {};
    if (!form.name.trim()) {
      errors.name = 'A service name is required.';
    }
    const duration = Number(form.duration_minutes);
    if (!duration || duration < 5 || duration > 480 || duration % 5 !== 0) {
      errors.duration_minutes = 'Duration must be 5–480 minutes in steps of 5.';
    }
    // Price ceiling mirrors the server bound (`Args::MAX_PRICE_MINOR`, the `price_minor int
    // unsigned` column). Fail here with the number in the admin's own currency; the server
    // still rejects out-of-range prices on its own and its field error lands on this field.
    const priceMinor = (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_5__.majorToMinor)(form.price);
    if (priceMinor !== null && (priceMinor < 0 || priceMinor > _lib_format_js__WEBPACK_IMPORTED_MODULE_5__.MAX_PRICE_MINOR)) {
      errors.price_minor = (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: 1: lowest allowed price, 2: highest allowed price, both formatted money. */
      (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Price must be between %1$s and %2$s.', 'aponto'), (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_5__.money)(0), (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_5__.money)(_lib_format_js__WEBPACK_IMPORTED_MODULE_5__.MAX_PRICE_MINOR));
    }
    // The booking-policy overrides mirror their own columns the same way (`min_lead_minutes`
    // int unsigned, `max_horizon_days` smallint unsigned) — told here rather than after a
    // round-trip, and the server's field error lands on the same field when it gets there.
    const lead = leadMinutes(form.min_lead_minutes);
    if (lead !== null && (!Number.isInteger(lead) || lead < 0 || lead > _lib_format_js__WEBPACK_IMPORTED_MODULE_5__.MAX_LEAD_MINUTES)) {
      errors.min_lead_minutes = (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: %d: the highest allowed lead time in hours. */
      (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Lead time must be between 0 and %d hours.', 'aponto'), Math.floor(_lib_format_js__WEBPACK_IMPORTED_MODULE_5__.MAX_LEAD_MINUTES / 60));
    }
    const horizon = numOrNull(form.max_horizon_days);
    if (horizon !== null && (!Number.isInteger(horizon) || horizon < 1 || horizon > _lib_format_js__WEBPACK_IMPORTED_MODULE_5__.MAX_HORIZON_DAYS)) {
      errors.max_horizon_days = (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: %d: the highest allowed booking horizon in days. */
      (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Horizon must be a whole number of days between 1 and %d.', 'aponto'), _lib_format_js__WEBPACK_IMPORTED_MODULE_5__.MAX_HORIZON_DAYS);
    }
    if (Object.keys(errors).length) {
      setFieldError(errors);
      // A refusal the operator can act on (founder QA 2026-09-21). The error paint alone
      // is invisible when the offending field is a card or two off-screen, which the
      // carded layout made routine — so go there, put the caret in it, and say so.
      errorPlan.current = {
        announce: showToast,
        fallback: () => showToast((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Check the highlighted fields.', 'aponto'), 'danger')
      };
      setErrorToken(token => token + 1);
      return;
    }
    setSaving(true);
    setFieldError({});
    const body = {
      name: form.name.trim(),
      category_id: form.category_id ? Number(form.category_id) : null,
      description: form.description,
      status: form.status,
      image_id: form.image_id ?? null,
      duration_minutes: duration,
      price_minor: priceMinor,
      buffer_before: Number(form.buffer_before) || 0,
      buffer_after: Number(form.buffer_after) || 0,
      slot_step_minutes: numOrNull(form.slot_step_minutes),
      color: form.color ? form.color : null,
      min_lead_minutes: lead,
      max_horizon_days: numOrNull(form.max_horizon_days)
    };
    try {
      deposit.validate();
      if (creating) {
        const created = await _lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.post('/services', body);
        // Remember the created record before the separate policy write, so a retry never creates a duplicate.
        if (deposit.nav) {
          setCreatedId(created.id);
        }
        try {
          await deposit.save(created.id);
        } catch (depositError) {
          setBaseline(JSON.stringify(form));
          await onSaved?.();
          throw new Error((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Service created, but the deposit was not saved: %s', 'aponto'), depositError.message));
        }
        // The fields on screen are now the fields the server holds, so the editor stops
        // counting as dirty and the nav guard unregisters itself. It matters on the premium
        // create path below, which deliberately does NOT close.
        setBaseline(JSON.stringify(form));
        // AWAIT the parent reload before closing so the list/quick-view behind the editor
        // is already fresh when it reappears — no stale-price window (r1 item 9; U1 BUG-5).
        await onSaved?.();
        if (multiStaff && created?.id) {
          // Premium: the service exists but has NO eligible staff yet, so closing here
          // would hand back a service that cannot be booked and say nothing. Stay open on
          // the new record and point at the section that fixes it.
          setCreatedId(created.id);
          setSaving(false);
          showToast(`${body.name} created — now choose who can be booked for it.`, 'success');
          scrollTo('assignments');
          return;
        }
        showToast(`${body.name} created.`, 'success');
        onClose?.();
        return;
      }
      await _lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.patch(`/services/${serviceId}`, body);
      setBaseline(JSON.stringify(form));
      try {
        await deposit.save(serviceId);
      } catch (depositError) {
        await onSaved?.();
        throw new Error((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Service saved, but the deposit was not saved: %s', 'aponto'), depositError.message));
      }
      // This page is ONE continuous form: a pending eligibility edit must be written by the
      // page Save too, or it dies on unmount with no request and no error.
      const eligibility = eligibilityRef.current;
      if (eligibility?.dirty) {
        try {
          await eligibility.save();
        } catch (eligibilityError) {
          // Half-save: the service fields landed, the assignments did not. Say so and keep
          // the editor open so the staff selection can be retried.
          showToast((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: %s: the reason the staff assignments could not be saved. */
          (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Service saved, but the staff assignments were not: %s', 'aponto'), eligibilityError.message), 'danger');
          await onSaved?.();
          setSaving(false);
          return;
        }
      }
      showToast('Service saved.', 'success');
      await onSaved?.();
      onClose?.();
    } catch (err) {
      const fields = err.data?.fields;
      if (fields) {
        setFieldError(fields);
        // Same treatment as the client-side refusal: a server 422 names fields, and the
        // operator must be taken to the first one rather than left staring at Save.
        // No announcement from here — the server's own message is toasted below, and it
        // is more specific than ours; two toasts for one event would be wrong.
        errorPlan.current = {
          announce: null
        };
        setErrorToken(token => token + 1);
      }
      showToast(err.message, 'danger');
      setSaving(false);
    }
  };
  const save = () => once(saveNow);
  const editorHead = strong => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("header", {
    className: "pd-record-editor-head",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("h1", {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("button", {
        type: "button",
        onClick: leave,
        children: "Services"
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("span", {
        "aria-hidden": "true",
        children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_10__.renderIcon)('chevron')
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("strong", {
        children: strong
      })]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("div", {
      className: "pd-record-editor-actions",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("button", {
        className: "pd-button",
        type: "button",
        onClick: leave,
        children: "Cancel"
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("button", {
        className: "pd-button primary",
        type: "button",
        disabled: saving || loading || !deposit.ready,
        onClick: save,
        children: saving ? 'Saving…' : creating ? 'Create service' : 'Save changes'
      })]
    })]
  });
  if (loading) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("div", {
      className: "pd-page pd-record-editor-page pd-service-editor-page",
      children: [editorHead('Loading…'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("p", {
        className: "pd-editor-note",
        children: "Loading service\u2026"
      })]
    });
  }
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("div", {
    className: "pd-page pd-record-editor-page pd-service-editor-page",
    children: [editorHead(creating ? 'New service' : form.name || 'Edit service'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("div", {
      className: "pd-record-editor-layout",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("aside", {
        className: "pd-editor-nav",
        "aria-label": "Service editor sections",
        children: sections.map(([id, label]) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("button", {
          type: "button",
          className: active === id ? 'is-active' : undefined,
          "aria-current": active === id ? 'true' : undefined,
          onClick: () => scrollTo(id),
          children: label
        }, id))
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("form", {
        className: "pd-record-editor-form ap-editor-cards",
        ref: formRef,
        autoComplete: "off",
        onSubmit: e => e.preventDefault(),
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)(_lib_EditorCard_jsx__WEBPACK_IMPORTED_MODULE_12__.EditorCard, {
          id: "service-details",
          title: "Details",
          description: sectionDescription('details'),
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("label", {
            className: (0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldClass)('pd-compact-field', fieldError, 'name'),
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("input", {
              name: "name",
              value: form.name,
              placeholder: " ",
              required: true,
              onChange: set('name'),
              ...(0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldAria)('service', fieldError, 'name')
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("span", {
              className: "pd-compact-label",
              children: "Service name"
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)(_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.FieldErrors, {
            prefix: "service",
            fieldError: fieldError,
            keys: ['name']
          }), addingCategory ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("div", {
            className: "ap-inline-create",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("label", {
              className: "pd-compact-field",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("input", {
                value: newCategory,
                placeholder: " ",
                autoFocus: true,
                onChange: e => setNewCategory(e.target.value),
                onKeyDown: e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmNewCategory();
                  }
                }
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("span", {
                className: "pd-compact-label",
                children: "New category name"
              })]
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("button", {
              className: "pd-button primary sm",
              type: "button",
              onClick: confirmNewCategory,
              children: "Add"
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("button", {
              className: "pd-button sm",
              type: "button",
              onClick: () => {
                setAddingCategory(false);
                setNewCategory('');
              },
              children: "Cancel"
            })]
          }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("label", {
            className: (0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldClass)('pd-compact-field pd-compact-select is-filled', fieldError, 'category_id'),
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("select", {
              value: form.category_id,
              onChange: e => {
                if (e.target.value === '__new') {
                  setAddingCategory(true);
                } else {
                  setForm(f => ({
                    ...f,
                    category_id: e.target.value
                  }));
                }
              },
              ...(0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldAria)('service', fieldError, 'category_id'),
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("option", {
                value: "",
                children: "Uncategorized"
              }), categories.map(c => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("option", {
                value: c.id,
                children: c.name
              }, c.id)), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("option", {
                value: "__new",
                children: "+ New category\u2026"
              })]
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("span", {
              className: "pd-compact-label",
              children: "Category"
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("span", {
              className: "pd-field-end-icon",
              "aria-hidden": "true",
              children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_10__.renderIcon)('chevronDown')
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)(_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.FieldErrors, {
            prefix: "service",
            fieldError: fieldError,
            keys: ['category_id']
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("label", {
            className: "pd-compact-field pd-compact-notes",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("textarea", {
              name: "description",
              rows: "3",
              placeholder: " ",
              value: form.description,
              onChange: set('description')
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("span", {
              className: "pd-compact-label",
              children: "Description"
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("div", {
            className: "pd-form-grid",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("label", {
              className: (0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldClass)('pd-compact-field pd-compact-select is-filled', fieldError, 'status'),
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("select", {
                value: form.status,
                onChange: set('status'),
                ...(0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldAria)('service', fieldError, 'status'),
                children: STATUS_OPTIONS.map(s => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("option", {
                  value: s.value,
                  children: s.label
                }, s.value))
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("span", {
                className: "pd-compact-label",
                children: "Status"
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("span", {
                className: "pd-field-end-icon",
                "aria-hidden": "true",
                children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_10__.renderIcon)('chevronDown')
              })]
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("div", {
              className: (0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldClass)('ap-image-field', fieldError, 'image_id'),
              children: [imageUrl ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("img", {
                src: imageUrl,
                alt: "",
                className: "ap-image-thumb"
              }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("span", {
                className: "ap-image-placeholder",
                "aria-hidden": "true",
                children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_10__.renderIcon)('image')
              }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("div", {
                className: "ap-image-actions",
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("button", {
                  className: "pd-button sm",
                  type: "button",
                  onClick: pickImage,
                  ...(0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldAria)('service', fieldError, 'image_id'),
                  children: form.image_id ? 'Change image' : 'Set featured image'
                }), form.image_id ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("button", {
                  className: "pd-button text sm",
                  type: "button",
                  onClick: () => {
                    setForm(f => ({
                      ...f,
                      image_id: null
                    }));
                    setImageUrl('');
                  },
                  children: "Remove"
                }) : null]
              })]
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)(_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.FieldErrors, {
              prefix: "service",
              fieldError: fieldError,
              keys: ['status', 'image_id'],
              className: "ap-field-error-row"
            })]
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)(_lib_EditorCard_jsx__WEBPACK_IMPORTED_MODULE_12__.EditorCard, {
          id: "service-pricing",
          title: "Duration & price",
          description: sectionDescription('pricing'),
          bodyClassName: "pd-form-grid",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("label", {
            className: (0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldClass)('pd-compact-field', fieldError, 'duration_minutes'),
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("input", {
              type: "number",
              min: "5",
              max: "480",
              step: "5",
              value: form.duration_minutes,
              placeholder: " ",
              onChange: set('duration_minutes'),
              ...(0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldAria)('service', fieldError, 'duration_minutes')
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("span", {
              className: "pd-compact-label",
              children: "Duration (minutes)"
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("label", {
            className: (0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldClass)('pd-compact-field', fieldError, 'price_minor'),
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("input", {
              type: "number",
              min: "0",
              max: (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_5__.maxPriceMajor)(),
              step: "any",
              value: form.price,
              placeholder: " ",
              onChange: set('price'),
              ...(0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldAria)('service', fieldError, 'price_minor')
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("span", {
              className: "pd-compact-label",
              children: ["Price (", _lib_config_js__WEBPACK_IMPORTED_MODULE_3__.config.currency, ")"]
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)(_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.FieldErrors, {
            prefix: "service",
            fieldError: fieldError,
            keys: ['duration_minutes', 'price_minor'],
            className: "ap-field-error-row"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("label", {
            className: (0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldClass)('pd-compact-field', fieldError, 'buffer_before'),
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("input", {
              type: "number",
              min: "0",
              max: "120",
              value: form.buffer_before,
              placeholder: " ",
              onChange: set('buffer_before'),
              ...(0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldAria)('service', fieldError, 'buffer_before')
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("span", {
              className: "pd-compact-label",
              children: "Buffer before (min)"
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("label", {
            className: (0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldClass)('pd-compact-field', fieldError, 'buffer_after'),
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("input", {
              type: "number",
              min: "0",
              max: "120",
              value: form.buffer_after,
              placeholder: " ",
              onChange: set('buffer_after'),
              ...(0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldAria)('service', fieldError, 'buffer_after')
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("span", {
              className: "pd-compact-label",
              children: "Buffer after (min)"
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)(_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.FieldErrors, {
            prefix: "service",
            fieldError: fieldError,
            keys: ['buffer_before', 'buffer_after'],
            className: "ap-field-error-row"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("label", {
            className: (0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldClass)('pd-compact-field', fieldError, 'slot_step_minutes'),
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("input", {
              type: "number",
              min: "5",
              max: "480",
              step: "5",
              value: form.slot_step_minutes,
              placeholder: " ",
              onChange: set('slot_step_minutes'),
              ...(0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldAria)('service', fieldError, 'slot_step_minutes')
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("span", {
              className: "pd-compact-label",
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Slot step in minutes (leave blank to use the default)', 'aponto')
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("label", {
            className: (0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldClass)('ap-color-field', fieldError, 'color'),
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("span", {
              className: "ap-color-label",
              children: "Colour"
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("span", {
              className: "ap-color-input",
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("input", {
                type: "color",
                value: form.color || '#3858e9',
                onChange: set('color'),
                ...(0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldAria)('service', fieldError, 'color')
              }), form.color ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("button", {
                type: "button",
                className: "pd-button text sm",
                onClick: () => setForm(f => ({
                  ...f,
                  color: ''
                })),
                children: "Clear"
              }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("span", {
                className: "pd-editor-note",
                children: "Default"
              })]
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)(_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.FieldErrors, {
            prefix: "service",
            fieldError: fieldError,
            keys: ['slot_step_minutes', 'color'],
            className: "ap-field-error-row"
          })]
        }), deposit.section, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)(EligibilitySection, {
          serviceId: serviceId,
          editable: multiStaff,
          saveRef: eligibilityRef,
          showToast: showToast,
          onDirtyChange: setEligibilityDirty
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)(_lib_EditorCard_jsx__WEBPACK_IMPORTED_MODULE_12__.EditorCard, {
          id: "service-policy",
          title: "Booking policy",
          description: sectionDescription('policy'),
          bodyClassName: "pd-form-grid",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("label", {
            className: (0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldClass)('pd-compact-field', fieldError, 'min_lead_minutes'),
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("input", {
              type: "number",
              min: "0",
              max: Math.floor(_lib_format_js__WEBPACK_IMPORTED_MODULE_5__.MAX_LEAD_MINUTES / 60),
              step: "any",
              value: form.min_lead_minutes,
              placeholder: " ",
              onChange: set('min_lead_minutes'),
              ...(0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldAria)('service', fieldError, 'min_lead_minutes')
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("span", {
              className: "pd-compact-label",
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Min lead time in hours (leave blank to use the default)', 'aponto')
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("label", {
            className: (0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldClass)('pd-compact-field', fieldError, 'max_horizon_days'),
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("input", {
              type: "number",
              min: "1",
              max: _lib_format_js__WEBPACK_IMPORTED_MODULE_5__.MAX_HORIZON_DAYS,
              step: "1",
              value: form.max_horizon_days,
              placeholder: " ",
              onChange: set('max_horizon_days'),
              ...(0,_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.fieldAria)('service', fieldError, 'max_horizon_days')
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("span", {
              className: "pd-compact-label",
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Max horizon in days (leave blank to use the default)', 'aponto')
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)(_lib_field_error_jsx__WEBPACK_IMPORTED_MODULE_14__.FieldErrors, {
            prefix: "service",
            fieldError: fieldError,
            keys: ['min_lead_minutes', 'max_horizon_days'],
            className: "ap-field-error-row"
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("footer", {
          className: "pd-editor-footer",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("button", {
            className: "pd-button",
            type: "button",
            onClick: leave,
            children: "Cancel"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("button", {
            className: "pd-button primary",
            type: "button",
            disabled: saving || !deposit.ready,
            onClick: save,
            children: saving ? 'Saving…' : creating ? 'Create service' : 'Save changes'
          })]
        })]
      })]
    })]
  });
}

// --- Staff & locations (eligibility) ----------------------------------------
/**
 * Canonical assignment rows for `PUT /services/{id}/eligibility` (rest-contract §2.18, rev
 * 2026-07-19 per-pair): ascending `(staff_id, location_id)`. `JSON.stringify` of the result is
 * also the section's dirty-check signature, so "what we would send" and "what we compare" can
 * never drift — the same discipline `weeklyRows()` enforces for the schedule PUT.
 *
 * @param {Array} assignments Pairs `{staff_id, location_id}` in any order.
 * @return {Array} Sorted contract rows.
 */
function eligibilityRows(assignments) {
  return [...(assignments || [])].map(pair => ({
    staff_id: Number(pair.staff_id),
    location_id: Number(pair.location_id) || 0
  })).sort((a, b) => a.staff_id - b.staff_id || a.location_id - b.location_id);
}

/**
 * Toggle one staff member's eligibility for the service, preserving per-location detail.
 *
 * Selecting adds the WILDCARD pair `location_id: 0` — "bookable at every location", the value
 * invariant 11 defines as "no location" and the scope `ConnectionRepository::staffForService()`
 * always matches. Deselecting drops EVERY pair for that member, wildcard and per-location alike.
 *
 * Re-selecting a member who already has narrower rows leaves those rows untouched: the wire shape
 * is per-pair precisely so a non-cartesian mapping survives a round-trip, and a UI that cannot
 * express locations must not flatten one it did not create.
 *
 * @param {Array}  assignments Current pairs.
 * @param {number} staffId     Staff id to toggle.
 * @return {Array} Next pairs.
 */
function toggleStaffAssignment(assignments, staffId) {
  const id = Number(staffId);
  const current = assignments || [];
  if (current.some(pair => Number(pair.staff_id) === id)) {
    return current.filter(pair => Number(pair.staff_id) !== id);
  }
  return [...current, {
    staff_id: id,
    location_id: 0
  }];
}

/**
 * Staff ids whose assignment is LOCATION-SCOPED — they have pairs for this service, but none of
 * them is the `location_id: 0` wildcard, so they are eligible only at specific locations.
 *
 * This UI can preserve such rows but cannot author or edit them (`toggleStaffAssignment` only ever
 * writes wildcards), so without surfacing them the checkbox would silently mean two different
 * things for two different rows. Codex review: the section used to claim outright that "everyone
 * selected is available at every location", which is false exactly for these members.
 *
 * @param {Array} assignments Current pairs.
 * @return {Set<number>} Staff ids with no wildcard row.
 */
function locationScopedStaffIds(assignments) {
  const byStaff = new Map();
  (assignments || []).forEach(pair => {
    const id = Number(pair?.staff_id);
    const wildcard = 0 === (Number(pair?.location_id) || 0);
    byStaff.set(id, (byStaff.get(id) ?? false) || wildcard);
  });
  const scoped = new Set();
  byStaff.forEach((hasWildcard, id) => {
    if (!hasWildcard) {
      scoped.add(id);
    }
  });
  return scoped;
}

/**
 * The compact summary a member's branch picker shows on its trigger (D-R64): "Every location" for
 * the wildcard, the branch names for one or two ("Downtown", "Downtown, Uptown"), a count beyond
 * that ("3 locations") — the trigger is ~220px wide and sits at the end of the member's row. Names
 * come from the picker's own items, so an archived branch keeps its "(archived)" suffix here too.
 *
 * @param {number[]} ids        The member's branches ({@see memberLocationIds}); `[]` = every one.
 * @param {Array}    items      Picker items `[ { id, label } ]`.
 * @param {string}   everyLabel Translated "Every location".
 * @return {string} Trigger text.
 */
function branchPickerSummary(ids, items, everyLabel) {
  const picked = ids || [];
  if (!picked.length) {
    return everyLabel;
  }
  if (picked.length > 2) {
    return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: %d: number of locations a staff member is assigned at. */
    (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__._n)('%d location', '%d locations', picked.length, 'aponto'), picked.length);
  }
  return picked.map(id => (items || []).find(item => Number(item.id) === Number(id))?.label || `#${id}`).join(', ');
}

/**
 * The Staff & locations section.
 *
 * Editable only when `multi_staff` is available (D-R28). Without it the Free plan auto-links its
 * single staff member on create, so there is nothing to choose
 * between — the section shows that linked member read-only rather than a control whose every
 * second option the server would refuse with 403 `aponto_plan_limit`.
 *
 * @param {{serviceId: ?number, editable: boolean, saveRef: Object, showToast: Function,
 *          onDirtyChange: Function}} props Section props.
 */
function EligibilitySection({
  serviceId,
  editable,
  saveRef,
  showToast,
  onDirtyChange
}) {
  const [loading, setLoading] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(Boolean(serviceId));
  const [staff, setStaff] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)([]);
  const [assignments, setAssignments] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)([]);
  // Signature of the assignment set the server currently holds — anything else is a pending
  // edit. `null` until a GET succeeds, so a failed load can never look "dirty" and have the page
  // Save replace a real assignment set with an empty one (the WorkHoursSection lesson).
  const [baseline, setBaseline] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [query, setQuery] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)('');
  const [saving, setSaving] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  // D-R63: the location catalog, ALL statuses (fix round 1) — an existing pair at a branch archived
  // since must still read by its name and stay removable; only ACTIVE branches are offered as new
  // ones. Empty = the section is exactly its pre-D-R63 self (no picker, the "Specific locations"
  // marker kept for rows it cannot author).
  const [locations, setLocations] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)([]);
  // Fix round 3: a catalog that did not load COMPLETELY cannot be told from a smaller one, so the
  // branch pickers — which write location pairs — are disabled and say why.
  const [catalogIncomplete, setCatalogIncomplete] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    let live = true;
    (0,_lib_branches_js__WEBPACK_IMPORTED_MODULE_7__.fetchLocations)().then(({
      items,
      complete
    }) => {
      if (!live) {
        return;
      }
      if (items.length) {
        setLocations(items);
      }
      if (!complete) {
        setCatalogIncomplete(true);
      }
    });
    return () => {
      live = false;
    };
  }, []);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!serviceId) {
      setLoading(false);
      return undefined;
    }
    let live = true;
    setLoading(true);
    Promise.all([_lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.get('/staff', {
      status: 'active',
      per_page: 100
    }).catch(() => ({
      items: []
    })), _lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.get(`/services/${serviceId}/eligibility`)]).then(([staffRes, eligibility]) => {
      if (!live) {
        return;
      }
      const pairs = eligibility.assignments || [];
      setStaff(staffRes.items || []);
      setAssignments(pairs);
      setBaseline(JSON.stringify(eligibilityRows(pairs)));
      setLoading(false);
    }).catch(() => {
      if (live) {
        setLoading(false);
      }
    });
    return () => {
      live = false;
    };
  }, [serviceId]);

  // The one write path. REJECTS on failure so every caller decides how to surface it — the page
  // Save has to be able to say the service saved but the assignments did not.
  const persist = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(async next => {
    const rows = eligibilityRows(next);
    setSaving(true);
    try {
      const res = await _lib_api_js__WEBPACK_IMPORTED_MODULE_2__.api.put(`/services/${serviceId}/eligibility`, {
        assignments: rows
      });
      const saved = res.assignments || rows;
      setAssignments(saved);
      setBaseline(JSON.stringify(eligibilityRows(saved)));
    } finally {
      setSaving(false);
    }
  }, [serviceId]);

  // ONE pending-edit signature, read by the page Save (through `saveRef`), by this section's own
  // button, and by the dirty guards (through `onDirtyChange`). `null` baseline means the GET never
  // succeeded, so a failed load can neither look dirty nor have the page Save replace a real
  // assignment set with an empty one.
  const dirty = null !== baseline && JSON.stringify(eligibilityRows(assignments)) !== baseline;

  // Publish the pending edit to ServiceEditor so the page Save can flush it. Re-registered every
  // render so the closure over `assignments` is never stale.
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if (!saveRef) {
      return undefined;
    }
    const handle = {
      dirty,
      save: () => persist(assignments)
    };
    saveRef.current = handle;
    return () => {
      if (saveRef.current === handle) {
        saveRef.current = null;
      }
    };
  });

  // …and report the SAME fact up as state, because a ref cannot re-render the guard that has to
  // act on it. Keyed, so it does not fire on every render of this section.
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => () => onDirtyChange?.(false), [onDirtyChange]);
  const selected = new Set(assignments.map(pair => Number(pair.staff_id)));
  const locationScoped = locationScopedStaffIds(assignments);
  const hasBranches = locations.length > 0;
  // The picker's catalog for one member: every ACTIVE branch (selectable as new), plus any branch
  // the member is ALREADY assigned at that is not active — named "(archived)", or `#id` if the
  // catalog lost it — so the pair can be unticked rather than silently kept.
  const branchItems = ids => [...locations.filter(location => 'active' === location.status).map(location => ({
    id: location.id,
    label: location.name
  })), ...ids.filter(id => !locations.some(location => location.id === id && 'active' === location.status)).map(id => {
    const known = locations.find(location => location.id === id);
    return {
      id,
      label: known ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: %s: location name. */
      (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('%s (archived)', 'aponto'), known.name) : `#${id}`
    };
  })];
  const options = (0,_lib_combobox_options_js__WEBPACK_IMPORTED_MODULE_6__.staffOptions)(staff);
  const visible = (0,_lib_combobox_options_js__WEBPACK_IMPORTED_MODULE_6__.filterOptions)(options, query);
  // Job titles ride the row beside the name (D-R64); the roster carries them, the shared combobox
  // options do not.
  const titles = new Map(staff.map(member => [Number(member.id), String(member.title || '').trim()]));
  const onceSection = (0,_lib_in_flight_js__WEBPACK_IMPORTED_MODULE_17__.useInFlight)();
  const saveNow = () => onceSection(async () => {
    // Members this save REMOVES from the service. Their existing bookings are untouched, and
    // the toast says so (persona QA 2026-10-05, T-075) instead of leaving it to be assumed.
    const before = new Set((JSON.parse(baseline || '[]') || []).map(pair => Number(pair.staff_id)));
    const after = new Set(eligibilityRows(assignments).map(pair => pair.staff_id));
    const removed = [...before].filter(id => !after.has(id));
    try {
      await persist(assignments);
      let kept = 0;
      if (removed.length) {
        const counts = await Promise.all(removed.map(staffId => (0,_lib_upcoming_bookings_js__WEBPACK_IMPORTED_MODULE_18__.countUpcomingBookings)({
          service_id: serviceId,
          staff_id: staffId
        })));
        kept = counts.reduce((sum, count) => sum + (count || 0), 0);
      }
      const note = (0,_lib_upcoming_bookings_js__WEBPACK_IMPORTED_MODULE_18__.upcomingBookingsNote)(kept);
      showToast(note ? `Staff assignments saved. ${note}` : 'Staff assignments saved.', 'success');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  // The unbookable warning. Any-staff availability resolves through `aponto_staff_services`, so
  // a service with no eligible staff returns NO slots — it goes invisible on the booking form
  // rather than visibly broken, which is exactly why this has to be stated here. Shown in both
  // modes: an empty set is equally unbookable on Free.
  const empty = !loading && null !== baseline && 0 === assignments.length;
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)(_lib_EditorCard_jsx__WEBPACK_IMPORTED_MODULE_12__.EditorCard, {
    id: "service-assignments",
    title: "Staff & locations",
    description: sectionDescription('assignments'),
    children: !serviceId ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("p", {
      className: "pd-editor-note",
      children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Create the service first — then choose who can be booked for it.', 'aponto')
    }) : loading ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("p", {
      className: "pd-editor-note",
      children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Loading…', 'aponto')
    }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.Fragment, {
      children: [empty ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("p", {
        className: "ap-field-error",
        role: "status",
        children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('No staff assigned — this service is not bookable until someone can take it.', 'aponto')
      }) : null, editable ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.Fragment, {
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("p", {
          className: "pd-editor-note",
          children: hasBranches ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Tick who can be booked for this service; each person takes it at every location unless you pick locations for them.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Choose who can be booked for this service. Anyone you tick here is assigned at every location; staff already limited to specific locations keep that narrower scope, and are marked below.', 'aponto')
        }), catalogIncomplete ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("p", {
          className: "ap-field-error",
          role: "status",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Some locations could not be loaded, so where staff work cannot be changed right now. Reload the page to try again.', 'aponto')
        }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("label", {
          className: "pd-compact-field",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("input", {
            type: "search",
            value: query,
            placeholder: " ",
            onChange: e => setQuery(e.target.value)
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("span", {
            className: "pd-compact-label",
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Search staff', 'aponto')
          })]
        }), visible.length ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("ul", {
          className: "ap-eligibility-list",
          children: visible.map(option => {
            const id = Number(option.id);
            const ticked = selected.has(id);
            const title = titles.get(id);
            // D-R63: WHERE this member takes the service — only for a TICKED member on a
            // site with locations. Empty = "Every location" (the wildcard pair); picking
            // branches replaces their pairs with one per branch, and clearing them all
            // falls back to the wildcard — an assigned member never ends with no pair
            // (`lib/assignment-pairs.js`).
            const branchIds = hasBranches && ticked ? (0,_lib_assignment_pairs_js__WEBPACK_IMPORTED_MODULE_8__.memberLocationIds)(assignments, id) : null;
            const items = branchIds ? branchItems(branchIds) : null;

            // D-R64: ONE row per member — checkbox · name (+ job title) · email, and the
            // compact branch picker at the inline end of the same row. The "Locations for
            // <name>" text is the picker's accessible name, not a heading of its own.
            return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("li", {
              className: branchIds ? 'has-picker' : undefined,
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("label", {
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("input", {
                  className: "pd-table-checkbox",
                  type: "checkbox"
                  // Named explicitly (T-078): a tool that reads the control
                  // rather than its wrapping label announced every member
                  // as "on".
                  ,
                  "aria-label": (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: %s: staff member name. */
                  (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Assign %s', 'aponto'), option.label),
                  checked: ticked,
                  disabled: saving,
                  onChange: () => setAssignments(current => toggleStaffAssignment(current, option.id))
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)("span", {
                  className: "ap-eligibility-who",
                  children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("span", {
                    className: "ap-eligibility-name",
                    children: option.label
                  }), title ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("span", {
                    className: "ap-eligibility-title",
                    children: title
                  }) : null, option.meta ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("span", {
                    className: "ap-eligibility-meta pd-ltr",
                    children: option.meta
                  }) : null]
                }), !hasBranches && locationScoped.has(id) ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("span", {
                  className: "ap-eligibility-scope",
                  children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Specific locations', 'aponto')
                }) : null]
              }), branchIds ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("div", {
                className: "ap-eligibility-where",
                children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)(_lib_MultiSelectPopover_jsx__WEBPACK_IMPORTED_MODULE_9__.MultiSelectPopover, {
                  hideLabel: true,
                  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: %s: staff member name. */
                  (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Locations for %s', 'aponto'), option.label),
                  value: branchIds,
                  items: items,
                  selectionText: branchPickerSummary(branchIds, items, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Every location', 'aponto')),
                  noSelectionText: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Every location', 'aponto'),
                  placeholder: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Every location', 'aponto'),
                  searchPlaceholder: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Search locations…', 'aponto'),
                  emptyText: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('No matching locations.', 'aponto'),
                  disabled: saving || catalogIncomplete,
                  onChange: ids => setAssignments(current => (0,_lib_assignment_pairs_js__WEBPACK_IMPORTED_MODULE_8__.setMemberLocations)(current, option.id, ids))
                })
              }) : null]
            }, option.id);
          })
        }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("p", {
          className: "pd-editor-note",
          children: options.length ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('No staff match that search.', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('No active staff yet. Add someone on the Staff screen first.', 'aponto')
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("div", {
          className: "ap-hours-save",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("button", {
            type: "button",
            className: "pd-button primary sm",
            disabled: saving || !dirty,
            onClick: saveNow,
            children: saving ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Saving…', 'aponto') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Save assignments', 'aponto')
          })
        })]
      }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.Fragment, {
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("p", {
          className: "pd-editor-note",
          children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Your staff member takes every service automatically.', 'aponto')
        }), assignments.length ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("ul", {
          className: "ap-eligibility-list is-readonly",
          children: [...selected].map(id => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("li", {
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_20__.jsx)("span", {
              className: "ap-eligibility-name",
              children: options.find(option => Number(option.id) === id)?.label || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.sprintf)(/* translators: %d: the numeric id of a staff member that could not be resolved to a name. */
              (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Staff #%d', 'aponto'), id)
            })
          }, id))
        }) : null]
      })]
    })
  });
}

/***/ },

/***/ "./assets/src/admin/routes/ServiceReorder.jsx"
/*!****************************************************!*\
  !*** ./assets/src/admin/routes/ServiceReorder.jsx ***!
  \****************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ServiceReorder: () => (/* binding */ ServiceReorder)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _dnd_kit_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @dnd-kit/core */ "./node_modules/@dnd-kit/core/dist/core.esm.js");
/* harmony import */ var _dnd_kit_sortable__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @dnd-kit/sortable */ "./node_modules/@dnd-kit/sortable/dist/sortable.esm.js");
/* harmony import */ var _dnd_kit_utilities__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @dnd-kit/utilities */ "./node_modules/@dnd-kit/utilities/dist/utilities.esm.js");
/* harmony import */ var _lib_api_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/api.js */ "./assets/src/admin/lib/api.js");
/* harmony import */ var _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../lib/icon.jsx */ "./assets/src/admin/lib/icon.jsx");
/* harmony import */ var _lib_facet_options_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../lib/facet-options.js */ "./assets/src/admin/lib/facet-options.js");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__);
/**
 * Drag-reorder services within one selected category (SPEC-P1 §1.1). Only reachable
 * when exactly one category is filtered; `/services/reorder` is a full-set
 * replacement (rest-contract §2.3), so on save the new intra-category order is
 * spliced back into the global position order and the complete id list is posted.
 * dnd-kit sortable list (accessible: pointer + keyboard).
 *
 * The category arrives as the facet IDENTITY (`id:<id>` — lib/facet-options.js), never as
 * its display name: membership decided by name would splice two same-named categories
 * into one order and post a wrong full-set list.
 */








function SortableRow({
  service
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = (0,_dnd_kit_sortable__WEBPACK_IMPORTED_MODULE_2__.useSortable)({
    id: service.id
  });
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("li", {
    ref: setNodeRef,
    className: `ap-reorder-row${isDragging ? ' is-dragging' : ''}`,
    style: {
      transform: _dnd_kit_utilities__WEBPACK_IMPORTED_MODULE_3__.CSS.Transform.toString(transform),
      transition
    },
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("button", {
      className: "ap-reorder-handle",
      type: "button",
      "aria-label": `Drag ${service.name}`,
      ...attributes,
      ...listeners,
      children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_5__.renderIcon)('moreVertical')
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("span", {
      className: "ap-reorder-name",
      children: service.name
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("span", {
      className: "ap-status-pill is-small",
      children: [service.duration_minutes, " min"]
    })]
  });
}
function ServiceReorder({
  categoryIdentity,
  services,
  onCancel,
  onSaved,
  showToast
}) {
  const byPosition = (a, b) => a.position - b.position || a.id - b.id;
  const inCategory = service => (0,_lib_facet_options_js__WEBPACK_IMPORTED_MODULE_6__.facetIdentity)(service, 'categoryId', 'categoryName') === categoryIdentity;
  const categoryLabel = services.find(inCategory)?.categoryName || '';
  const [order, setOrder] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(() => services.filter(inCategory).sort(byPosition).map(s => s.id));
  const [saving, setSaving] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const sensors = (0,_dnd_kit_core__WEBPACK_IMPORTED_MODULE_1__.useSensors)((0,_dnd_kit_core__WEBPACK_IMPORTED_MODULE_1__.useSensor)(_dnd_kit_core__WEBPACK_IMPORTED_MODULE_1__.PointerSensor, {
    activationConstraint: {
      distance: 5
    }
  }), (0,_dnd_kit_core__WEBPACK_IMPORTED_MODULE_1__.useSensor)(_dnd_kit_core__WEBPACK_IMPORTED_MODULE_1__.KeyboardSensor, {
    coordinateGetter: _dnd_kit_sortable__WEBPACK_IMPORTED_MODULE_2__.sortableKeyboardCoordinates
  }));
  const nameById = Object.fromEntries(services.map(s => [s.id, s]));
  const onDragEnd = ({
    active,
    over
  }) => {
    if (!over || active.id === over.id) {
      return;
    }
    setOrder(ids => (0,_dnd_kit_sortable__WEBPACK_IMPORTED_MODULE_2__.arrayMove)(ids, ids.indexOf(active.id), ids.indexOf(over.id)));
  };
  const save = async () => {
    setSaving(true);
    // Splice the new intra-category order back into the global position order.
    const global = [...services].sort(byPosition);
    let cursor = 0;
    const fullIds = global.map(s => inCategory(s) ? order[cursor++] : s.id);
    try {
      await _lib_api_js__WEBPACK_IMPORTED_MODULE_4__.api.post('/services/reorder', {
        ids: fullIds
      });
      showToast('Service order saved.', 'success');
      onSaved?.();
    } catch (err) {
      showToast(err.message, 'danger');
      setSaving(false);
    }
  };
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
    className: "ap-reorder",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
      className: "ap-reorder-head",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("strong", {
          children: ["Reorder \u201C", categoryLabel, "\u201D"]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("span", {
          children: "Drag to set the order customers see."
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
        className: "ap-reorder-actions",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("button", {
          className: "pd-button sm",
          type: "button",
          onClick: onCancel,
          children: "Cancel"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("button", {
          className: "pd-button primary sm",
          type: "button",
          disabled: saving,
          onClick: save,
          children: saving ? 'Saving…' : 'Save order'
        })]
      })]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_dnd_kit_core__WEBPACK_IMPORTED_MODULE_1__.DndContext, {
      sensors: sensors,
      collisionDetection: _dnd_kit_core__WEBPACK_IMPORTED_MODULE_1__.closestCenter,
      onDragEnd: onDragEnd,
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_dnd_kit_sortable__WEBPACK_IMPORTED_MODULE_2__.SortableContext, {
        items: order,
        strategy: _dnd_kit_sortable__WEBPACK_IMPORTED_MODULE_2__.verticalListSortingStrategy,
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("ul", {
          className: "ap-reorder-list",
          children: order.map(id => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(SortableRow, {
            service: nameById[id]
          }, id))
        })
      })
    })]
  });
}

/***/ },

/***/ "./assets/src/admin/routes/Services.jsx"
/*!**********************************************!*\
  !*** ./assets/src/admin/routes/Services.jsx ***!
  \**********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Services: () => (/* binding */ Services),
/* harmony export */   reservedTabCopy: () => (/* binding */ reservedTabCopy)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _tanstack_react_table__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @tanstack/react-table */ "./node_modules/@tanstack/table-core/build/lib/index.mjs");
/* harmony import */ var _pressmaximum_dashboard_kit_table__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @pressmaximum/dashboard-kit/table */ "./node_modules/@pressmaximum/dashboard-kit/build/table/index.mjs");
/* harmony import */ var _dnd_kit_core__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @dnd-kit/core */ "./node_modules/@dnd-kit/core/dist/core.esm.js");
/* harmony import */ var _dnd_kit_sortable__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @dnd-kit/sortable */ "./node_modules/@dnd-kit/sortable/dist/sortable.esm.js");
/* harmony import */ var _dnd_kit_utilities__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @dnd-kit/utilities */ "./node_modules/@dnd-kit/utilities/dist/utilities.esm.js");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_6__);
/* harmony import */ var _lib_api_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../lib/api.js */ "./assets/src/admin/lib/api.js");
/* harmony import */ var _lib_config_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../lib/config.js */ "./assets/src/admin/lib/config.js");
/* harmony import */ var _lib_in_flight_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../lib/in-flight.js */ "./assets/src/admin/lib/in-flight.js");
/* harmony import */ var _lib_upcoming_bookings_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../lib/upcoming-bookings.js */ "./assets/src/admin/lib/upcoming-bookings.js");
/* harmony import */ var _lib_format_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../lib/format.js */ "./assets/src/admin/lib/format.js");
/* harmony import */ var _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../lib/icon.jsx */ "./assets/src/admin/lib/icon.jsx");
/* harmony import */ var _lib_ui_jsx__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../lib/ui.jsx */ "./assets/src/admin/lib/ui.jsx");
/* harmony import */ var _lib_toast_jsx__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ../lib/toast.jsx */ "./assets/src/admin/lib/toast.jsx");
/* harmony import */ var _lib_confirm_jsx__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ../lib/confirm.jsx */ "./assets/src/admin/lib/confirm.jsx");
/* harmony import */ var _lib_InflowWorkspace_jsx__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ../lib/InflowWorkspace.jsx */ "./assets/src/admin/lib/InflowWorkspace.jsx");
/* harmony import */ var _lib_RowMenu_jsx__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ../lib/RowMenu.jsx */ "./assets/src/admin/lib/RowMenu.jsx");
/* harmony import */ var _lib_facets_jsx__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ../lib/facets.jsx */ "./assets/src/admin/lib/facets.jsx");
/* harmony import */ var _lib_editor_guards_js__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! ../lib/editor-guards.js */ "./assets/src/admin/lib/editor-guards.js");
/* harmony import */ var _lib_router_js__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! ../lib/router.js */ "./assets/src/admin/lib/router.js");
/* harmony import */ var _ServiceEditor_jsx__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(/*! ./ServiceEditor.jsx */ "./assets/src/admin/routes/ServiceEditor.jsx");
/* harmony import */ var _ServiceReorder_jsx__WEBPACK_IMPORTED_MODULE_22__ = __webpack_require__(/*! ./ServiceReorder.jsx */ "./assets/src/admin/routes/ServiceReorder.jsx");
/* harmony import */ var _bookings_dashboard_stats_js__WEBPACK_IMPORTED_MODULE_23__ = __webpack_require__(/*! ../bookings/dashboard-stats.js */ "./assets/src/admin/bookings/dashboard-stats.js");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__);
/**
 * Services route (SPEC-P1 §1.1 / mockup §7.4). Flat list + internal section tabs
 * (Services · Categories · Bundles[Premium] · Extras[Premium], the last two
 * reserved with no controls). The Services tab is a PMDKDataTable consumer; the full editor is a
 * separate full-page view (ServiceEditor). Drag reorder is available only when a
 * single category is selected (`POST /services/reorder`, full-set replacement).
 * Categories are a peer table edited through the shared in-flow inspector.
 */

























// One line of why, for the pill's tooltip and the quick view (re-test R11).

const NOT_BOOKABLE_REASON = (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_6__.__)('No active staff member is assigned, so customers do not see this service. Assign staff in the service editor.', 'aponto');
const TABS = [{
  id: 'services',
  label: 'Services'
}, {
  id: 'categories',
  label: 'Categories'
}, {
  id: 'bundles',
  label: 'Bundles',
  reserved: true
}, {
  id: 'extras',
  label: 'Extras',
  reserved: true
}];

/**
 * The badge on a reserved (unbuilt) tab, and the sentence under its empty state.
 *
 * On a Free site these are honest upsell chrome: the feature will be a Premium module. On a
 * PREMIUM site the same "Premium" badge read as a second upsell to someone who had already paid,
 * and "ships with a later Premium module" as a roadmap note in their own product (persona QA
 * 2026-10-05, T-082) — there it says what is true for them: coming soon. `planEdition` is the
 * marketing-chrome switch `lib/config.js` documents, not a capability gate.
 *
 * @param {string} planEdition `free` or `premium`.
 * @return {{badge: string, note: string}} Copy for the reserved tabs.
 */
function reservedTabCopy(planEdition) {
  return 'premium' === planEdition ? {
    badge: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_6__.__)('Coming soon', 'aponto'),
    note: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_6__.__)('Coming soon — there is nothing to set up here yet.', 'aponto')
  } : {
    badge: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_6__.__)('Premium', 'aponto'),
    note: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_6__.__)('Ships with a later Premium module — there is nothing to set up here yet.', 'aponto')
  };
}
const STATUS_OPTIONS = [{
  value: 'active',
  label: 'Active'
}, {
  value: 'draft',
  label: 'Draft'
}, {
  value: 'archived',
  label: 'Archived'
}];
const UNCATEGORIZED = 'Uncategorized';
const WIDTH_KEY = 'aponto.admin.service-inspector-width.v1';
const columnHelper = (0,_tanstack_react_table__WEBPACK_IMPORTED_MODULE_1__.createColumnHelper)();

// The Category facet is keyed by the CATEGORY ID (`categoryId`, 0 = Uncategorized), not
// by the name: two categories may share a name, and a name-keyed facet would filter — and
// reorder — both of them as one. Status is an enum, so its value is its own identity.
const FACETS = [{
  id: 'categoryName',
  label: 'Category',
  type: 'multi',
  idKey: 'categoryId'
}, {
  id: 'status',
  label: 'Status',
  type: 'multi',
  options: STATUS_OPTIONS
}];
const CATEGORY_FACET_FILTER = (0,_lib_facets_jsx__WEBPACK_IMPORTED_MODULE_18__.recordFacetFilter)('categoryId', 'categoryName');

/**
 * The record a `services/...` hash path names, or '' for the list and for the tab hashes.
 *
 * Tab ids are never numeric, so the two segment shapes cannot collide — the same test the deep
 * link itself uses.
 *
 * @param {string} path Hash path, without the leading `#`.
 * @return {string} Record id, or ''.
 */
function deepLinkOf(path) {
  const second = (0,_lib_editor_guards_js__WEBPACK_IMPORTED_MODULE_19__.hashRecord)(path);
  return /^\d+$/.test(second) ? second : '';
}
function Services({
  segments = [],
  onNavigate
}) {
  const showToast = (0,_lib_toast_jsx__WEBPACK_IMPORTED_MODULE_14__.useToast)();
  const {
    confirm,
    dialog
  } = (0,_lib_confirm_jsx__WEBPACK_IMPORTED_MODULE_15__.useConfirmDialog)();
  // Whether the OPEN editor holds unsaved edits — reported up by `ServiceEditor` from its own
  // dirty computation (the form, a pending eligibility edit, a half-typed new category), because
  // this is the component that owns both guards (D-R58). Handoff 2026-09-21 §4: it had none at all.
  const [editorDirty, setEditorDirty] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  // The LANDING tab, from the landing hash — mount-only, exactly as before the guards existed.
  // Deliberately not read from `shownPath`: on the first render the two are equal by
  // construction, and reading the held path would tie a mount-time seed to a navigation guard.
  const landingTab = segments[1];
  const initialTab = TABS.some(t => t.id === landingTab) ? landingTab : 'services';
  const [tab, setTab] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(initialTab);
  const [state, setState] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)({
    status: 'loading',
    services: [],
    categories: [],
    error: null
  });
  const [staffCount, setStaffCount] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const [editor, setEditor] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null); // { mode, service }
  const [inspector, setInspector] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null); // { type:'quickview'|'category', ... }
  const [reorder, setReorder] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  /**
   * Bumped by a confirmed discard that leaves this route on screen, and part of the editor's
   * `key`, so the discard actually empties the form (fix round 2). Applying the target usually
   * replaces the editor by itself; it does not when the target names a record this list does not
   * hold — a hand-edited hash, or anything past the `per_page: 100` window — and the operator
   * would be left looking at the very text they asked to throw away, with nothing guarding it. A
   * remount is also what puts the pending staff assignments back.
   */
  const [editorEpoch, setEditorEpoch] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(0);
  const onDiscard = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => setEditorEpoch(epoch => epoch + 1), []);

  /** The record the editor is open on right now — `new` for a create, '' for the list. */
  const openRecord = editor ? String(editor.service?.id ?? 'new') : '';

  /**
   * Which same-route hash moves would REPLACE the open editor (`lib/editor-guards.js`).
   *
   * Only a deep link to a DIFFERENT record does: the effect below opens it with a new `key`,
   * which remounts the editor and takes the unsaved form with it. `#services`,
   * `#services/categories` and the other tab hashes change no surface while the editor is open —
   * it is local state and takes over the whole route — so a dialog for them would be a dialog
   * about nothing, and neither does the deep link of the record ALREADY being edited (fix round
   * 2: Back to `#services` then Forward to `#services/12` asked the operator to discard the
   * service they were still editing).
   */
  const isExit = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(next => {
    const target = deepLinkOf(next);
    return '' !== openRecord && '' !== target && target !== openRecord;
  }, [openRecord]);
  const {
    shownPath,
    release
  } = (0,_lib_editor_guards_js__WEBPACK_IMPORTED_MODULE_19__.useEditorGuards)({
    segments,
    dirty: editorDirty,
    confirm,
    discardPrompt: _ServiceEditor_jsx__WEBPACK_IMPORTED_MODULE_21__.discardPrompt,
    isExit,
    onDiscard
  });

  // Returns the reload promise so callers can AWAIT the fresh list before closing an editor —
  // the quick-view panel derives from this state and must never show a stale price after a save
  // (r1 review item 9; finding U1 BUG-5).
  const load = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
    setState(s => ({
      ...s,
      status: s.services.length || s.categories.length ? s.status : 'loading',
      error: null
    }));
    // Staff readiness (skip-path guidance): a service with no staff anywhere in the account
    // can't be booked. Fetched separately from the list so a /staff hiccup never blocks the
    // services table; null means "unknown", so the note stays hidden.
    _lib_api_js__WEBPACK_IMPORTED_MODULE_7__.api.get('/staff', {
      status: 'all',
      per_page: 1
    }).then(res => setStaffCount(Number(res.total) || 0)).catch(() => setStaffCount(null));
    return Promise.all([_lib_api_js__WEBPACK_IMPORTED_MODULE_7__.api.get('/services', {
      status: 'all',
      per_page: 100
    }), _lib_api_js__WEBPACK_IMPORTED_MODULE_7__.api.get('/service-categories')]).then(([svc, cat]) => {
      const categories = cat.items || [];
      const catName = Object.fromEntries(categories.map(c => [c.id, c.name]));
      const services = (svc.items || []).map(dto => ({
        ...dto,
        // Facet identity for the Category axis (0 = Uncategorized); the name is display-only.
        categoryId: Number(dto.category_id) || 0,
        categoryName: dto.category_id ? catName[dto.category_id] || UNCATEGORIZED : UNCATEGORIZED,
        staffCount: Number(dto.staff_count) || 0,
        // C1: Delete is offered only when this is 0 (otherwise Archive is the safe default).
        bookingCount: Number(dto.booking_count) || 0
      }));
      setState({
        status: 'ready',
        services,
        categories,
        error: null
      });
    }).catch(err => setState({
      status: 'error',
      services: [],
      categories: [],
      error: err.message
    }));
  }, []);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    load();
  }, [load]);

  // `#services/<id>` opens that service's editor, exactly as `#staff/<id>` opens a staff
  // workspace (routes/Staff.jsx): the hash SEEDS the surface, it does not own it. Tab ids are
  // never numeric, so the two segment shapes cannot collide. Added with D-R28 so the staff
  // workspace's assigned-services list can link somewhere real.
  //
  // Applied ONCE per requested id and only after the list has loaded (the editor needs the row
  // DTO). Never closes anything: an id that no longer exists — or an editor the admin closed by
  // hand — leaves the list on screen instead of fighting it.
  //
  // Resolved from `shownPath`, NOT from `segments`: that is the whole mechanism of the same-route
  // hold (`lib/editor-guards.js`). While a dirty editor is on screen the hold does not advance
  // `shownPath`, so this effect never sees the incoming id and never remounts the editor out from
  // under the typing.
  const deepLinkId = deepLinkOf(shownPath);
  const openedDeepLink = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)('');
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    if ('' === deepLinkId || openedDeepLink.current === deepLinkId || 'loading' === state.status) {
      return;
    }
    openedDeepLink.current = deepLinkId;
    const service = state.services.find(item => String(item.id) === deepLinkId);
    if (service) {
      setEditor({
        mode: 'edit',
        service
      });
    }
  }, [deepLinkId, state.status, state.services]);
  const createCategory = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(async name => {
    const created = await _lib_api_js__WEBPACK_IMPORTED_MODULE_7__.api.post('/service-categories', {
      name
    });
    setState(s => ({
      ...s,
      categories: [...s.categories, created]
    }));
    return created;
  }, []);
  const closeInspector = () => setInspector(null);

  // C1 archive-first (spec §1.1 addendum 2026-07-20; U2 data-loss scare): Archive is a safe,
  // reversible status change — NEVER a delete. It keeps the service for history and hides it from
  // new bookings.
  const onArchive = async service => {
    // Say what happens to the bookings already made (T-075) — nothing, which is exactly what
    // the dialog used to leave the operator to guess.
    const note = (0,_lib_upcoming_bookings_js__WEBPACK_IMPORTED_MODULE_10__.upcomingBookingsNote)(await (0,_lib_upcoming_bookings_js__WEBPACK_IMPORTED_MODULE_10__.countUpcomingBookings)({
      service_id: service.id
    }));
    const ok = await confirm({
      title: `Archive “${service.name}”?`,
      message: `It’s kept for history and hidden from new bookings. You can restore it any time.${note ? ` ${note}` : ''}`,
      confirmText: 'Archive',
      destructive: true
    });
    if (!ok) {
      return;
    }
    try {
      await _lib_api_js__WEBPACK_IMPORTED_MODULE_7__.api.patch(`/services/${service.id}`, {
        status: 'archived'
      });
      showToast(`${service.name} archived.`);
      await load();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // Restore an archived service back to active (reversible, no confirm needed).
  const onRestore = async service => {
    try {
      await _lib_api_js__WEBPACK_IMPORTED_MODULE_7__.api.patch(`/services/${service.id}`, {
        status: 'active'
      });
      showToast(`${service.name} restored.`, 'success');
      await load();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // Permanent delete — the row action is offered ONLY on a service with zero bookings (C1). The
  // 409 fallback covers the rare race where a booking lands between the list render and the
  // delete: archive instead so history is never lost.
  const onDelete = async service => {
    const ok = await confirm({
      title: `Delete “${service.name}” permanently?`,
      message: 'This can’t be undone — the service and its settings are removed for good. (Only possible because it has no bookings.)',
      confirmText: 'Delete permanently',
      destructive: true
    });
    if (!ok) {
      return;
    }
    try {
      await _lib_api_js__WEBPACK_IMPORTED_MODULE_7__.api.del(`/services/${service.id}`);
      showToast(`${service.name} deleted permanently.`);
      await load();
    } catch (err) {
      if (err.code === 'aponto_has_dependents') {
        try {
          await _lib_api_js__WEBPACK_IMPORTED_MODULE_7__.api.patch(`/services/${service.id}`, {
            status: 'archived'
          });
          showToast(`${service.name} just picked up a booking — archived instead of deleted.`);
          await load();
        } catch (e2) {
          showToast(e2.message, 'danger');
        }
      } else {
        showToast(err.message, 'danger');
      }
    }
  };

  // One request per press (persona QA 2026-10-05, T-066): a doubled "Duplicate as draft" made
  // two copies, exactly as a doubled "Create service" made two services.
  const once = (0,_lib_in_flight_js__WEBPACK_IMPORTED_MODULE_9__.useInFlight)();
  const onDuplicate = service => once(async () => {
    try {
      const copy = await _lib_api_js__WEBPACK_IMPORTED_MODULE_7__.api.post(`/services/${service.id}/duplicate`);
      showToast(`Duplicated “${copy.name}” as draft — activate when ready.`, 'success');
      await load();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  // "Services" pressed — header nav or WordPress sidebar — while the editor covers the list
  // (persona QA 2026-10-05, T-076). The editor is local state, so the hash never moved and the
  // press used to do nothing. It now does what the editor's own Cancel does: ask about unsaved
  // edits, then return to the list.
  (0,_lib_router_js__WEBPACK_IMPORTED_MODULE_20__.useRouteReselect)('services', async () => {
    if (!editor) {
      return;
    }
    if (editorDirty && !(await confirm((0,_ServiceEditor_jsx__WEBPACK_IMPORTED_MODULE_21__.discardPrompt)()))) {
      return;
    }
    release();
    setEditor(null);
  });

  // ---- Full-page editor takes over the whole route ----------------------
  if (editor) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.Fragment, {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)(_ServiceEditor_jsx__WEBPACK_IMPORTED_MODULE_21__.ServiceEditor, {
        mode: editor.mode,
        service: editor.service,
        categories: state.categories,
        onCreateCategory: createCategory
        // `release()` first: the editor has already asked its own question by the time it
        // calls back, so a guard still registered here would ask again on the next hash
        // the operator touches.
        ,
        onClose: () => {
          release();
          setEditor(null);
        },
        onSaved: load,
        onDirtyChange: setEditorDirty,
        confirm: confirm
      }, `${editor.mode}-${openRecord}-${editorEpoch}`), dialog]
    });
  }
  const reserved = reservedTabCopy(_lib_config_js__WEBPACK_IMPORTED_MODULE_8__.config.planEdition);
  const tabStrip = /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("div", {
    className: "pmdk-section-tabs",
    role: "tablist",
    "aria-label": "Service views",
    children: TABS.map(t => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("button", {
      type: "button",
      role: "tab",
      "aria-selected": tab === t.id ? 'true' : 'false',
      onClick: () => {
        setTab(t.id);
        setReorder(false);
      },
      children: [t.label, t.reserved ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("small", {
        className: "pd-nav-phase is-later",
        children: reserved.badge
      }) : null]
    }, t.id))
  });
  let panel;
  if (tab === 'categories') {
    panel = /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)(CategoriesPanel, {
      state: state,
      confirm: confirm,
      onReload: load,
      showToast: showToast
    });
  } else if (tab === 'bundles' || tab === 'extras') {
    panel = /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("div", {
      className: "ap-reserved-tab",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("span", {
        className: "ap-state-icon",
        "aria-hidden": "true",
        children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon)(tab === 'bundles' ? 'box' : 'tag')
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("h2", {
        children: tab === 'bundles' ? 'Bundles' : 'Extras'
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("p", {
        children: [tab === 'bundles' ? 'Sell packages of multiple services together.' : 'Add-ons customers can attach to a booking.', " ", reserved.note]
      })]
    });
  } else {
    panel = /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)(ServicesPanel, {
      state: state,
      reorder: reorder,
      setReorder: setReorder,
      onNew: () => setEditor({
        mode: 'create'
      }),
      onEdit: service => setEditor({
        mode: 'edit',
        service
      }),
      onQuickView: service => setInspector({
        type: 'quickview',
        serviceId: service.id,
        service
      }),
      onDuplicate: onDuplicate,
      onArchive: onArchive,
      onRestore: onRestore,
      onDelete: onDelete,
      onReload: load,
      showToast: showToast
    });
  }

  // Resolve the quick-view service from the LIVE list by id so an edit-then-save reflects the
  // fresh price immediately instead of a stale open-time snapshot (fleet-r1 Fix 9f; finding U1
  // BUG-5). Falls back to the snapshot only if the row is gone (e.g. just deleted).
  const quickViewService = inspector && inspector.type === 'quickview' ? state.services.find(s => s.id === inspector.serviceId) || inspector.service : null;
  const inspectorNode = inspector ? inspector.type === 'quickview' ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)(ServiceQuickView, {
    service: quickViewService,
    categories: state.categories,
    onEdit: () => {
      setEditor({
        mode: 'edit',
        service: quickViewService
      });
      closeInspector();
    },
    onClose: closeInspector
  }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)(CategoryForm, {
    mode: inspector.mode,
    category: inspector.category,
    onClose: closeInspector,
    onSaved: load,
    showToast: showToast
  }) : null;
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)(_lib_InflowWorkspace_jsx__WEBPACK_IMPORTED_MODULE_16__.InflowWorkspace, {
    widthKey: WIDTH_KEY,
    open: Boolean(inspector),
    label: "Service inspector",
    inspectorLabelledBy: "serviceInspectorTitle",
    inspector: inspectorNode,
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)(_lib_ui_jsx__WEBPACK_IMPORTED_MODULE_13__.PageHeader, {
      title: "Services",
      actions: tab === 'services' ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("button", {
        className: "pmdk-button primary sm",
        type: "button",
        onClick: () => setEditor({
          mode: 'create'
        }),
        children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon)('plus'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("span", {
          children: "New service"
        })]
      }) : tab === 'categories' ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("button", {
        className: "pmdk-button primary sm",
        type: "button",
        onClick: () => setInspector({
          type: 'category',
          mode: 'create'
        }),
        children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon)('plus'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("span", {
          children: "New category"
        })]
      }) : null
    }), tabStrip, tab === 'services' && staffCount === 0 && state.services.length > 0 ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("p", {
      className: "ap-list-note ap-staff-gap-note",
      role: "status",
      children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon)('alert'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("span", {
        className: "ap-staff-gap-text",
        children: "Services can\u2019t be booked until you add a staff member."
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("button", {
        className: "pd-button text sm",
        type: "button",
        onClick: () => onNavigate?.('staff'),
        children: "Add staff"
      })]
    }) : null, panel, dialog]
  });
}

// --- Services tab -----------------------------------------------------------
function ServicesPanel({
  state,
  reorder,
  setReorder,
  onNew,
  onEdit,
  onQuickView,
  onDuplicate,
  onArchive,
  onRestore,
  onDelete,
  onReload,
  showToast
}) {
  const [activeCategory, setActiveCategory] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const columns = (0,react__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => [columnHelper.accessor('name', {
    header: 'Service',
    size: 220,
    enableHiding: false,
    meta: {
      label: 'Service'
    },
    cell: info => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("span", {
      className: "ap-cell-identity",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("span", {
        className: "ap-color-dot",
        style: {
          background: info.row.original.color || 'var(--ap-color-border-strong)'
        },
        "aria-hidden": "true"
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("span", {
        className: "pmdk-cell-value pmdk-cell-strong",
        title: info.getValue(),
        children: info.getValue()
      })]
    })
  }), columnHelper.accessor('categoryName', {
    id: 'categoryName',
    header: 'Category',
    size: 150,
    meta: {
      label: 'Category'
    },
    filterFn: CATEGORY_FACET_FILTER,
    cell: info => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("span", {
      className: "pmdk-cell-value pmdk-cell-muted",
      children: info.getValue()
    })
  }), columnHelper.accessor('duration_minutes', {
    id: 'duration',
    header: 'Duration',
    size: 110,
    meta: {
      label: 'Duration',
      numeric: true
    },
    cell: info => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("span", {
      className: "pmdk-cell-value pmdk-cell-numeric",
      children: [info.getValue(), " min"]
    })
  }), columnHelper.accessor('price_minor', {
    id: 'price',
    header: 'Price',
    size: 110,
    meta: {
      label: 'Price',
      numeric: true
    },
    cell: info => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("span", {
      className: "pmdk-cell-value pmdk-cell-numeric",
      children: info.getValue() === null || info.getValue() === undefined ? '—' : (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_11__.money)(info.getValue())
    })
  }), columnHelper.accessor('staffCount', {
    id: 'staff',
    header: 'Staff',
    size: 90,
    enableSorting: false,
    meta: {
      label: 'Staff'
    },
    cell: info => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("span", {
      className: "pmdk-cell-value pmdk-cell-muted",
      children: [info.getValue(), " staff"]
    })
  }),
  // An ACTIVE service nobody active is assigned to is not bookable (re-test R11): the public
  // catalogue leaves it out (T-073), so the pill says that instead of a plain "active".
  columnHelper.accessor('status', {
    id: 'status',
    header: 'Status',
    size: 130,
    meta: {
      label: 'Status'
    },
    filterFn: _lib_facets_jsx__WEBPACK_IMPORTED_MODULE_18__.inArrayFilter,
    cell: info => (0,_bookings_dashboard_stats_js__WEBPACK_IMPORTED_MODULE_23__.serviceNotBookable)(info.row.original) ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("span", {
      className: "ap-status-pill is-draft",
      title: NOT_BOOKABLE_REASON,
      children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_6__.__)('Not bookable', 'aponto')
    }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("span", {
      className: `ap-status-pill is-${info.getValue()}`,
      children: info.getValue()
    })
  }), columnHelper.display({
    id: 'action',
    size: 60,
    enableHiding: false,
    enableSorting: false,
    header: 'Action',
    cell: info => {
      const svc = info.row.original;
      const items = [{
        action: 'edit',
        label: 'Edit service',
        icon: 'note'
      }, {
        action: 'duplicate',
        label: 'Duplicate as draft',
        icon: 'files'
      }];
      // Archive (reversible) is the default for a live service; an archived one offers
      // Restore instead. Delete (permanent) appears ONLY when the service has zero
      // bookings — otherwise history would be lost (C1).
      if (svc.status === 'archived') {
        items.push({
          action: 'restore',
          label: 'Restore service',
          icon: 'arrows',
          separatorBefore: true
        });
      } else {
        items.push({
          action: 'archive',
          label: 'Archive service',
          icon: 'prohibit',
          danger: true,
          separatorBefore: true
        });
      }
      if (!svc.bookingCount) {
        items.push({
          action: 'delete',
          label: 'Delete permanently',
          icon: 'trash',
          danger: true
        });
      }
      return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)(_lib_RowMenu_jsx__WEBPACK_IMPORTED_MODULE_17__.RowMenu, {
        label: `Actions for ${svc.name}`,
        renderIcon: _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon,
        items: items,
        onSelect: action => {
          if (action === 'edit') onEdit(svc);else if (action === 'duplicate') onDuplicate(svc);else if (action === 'archive') onArchive(svc);else if (action === 'restore') onRestore(svc);else if (action === 'delete') onDelete(svc);
        }
      });
    }
  })], [onEdit, onDuplicate, onArchive, onRestore, onDelete]);

  // The reorder affordance is only meaningful for a single selected category. The facet
  // value is the category IDENTITY (`id:<id>`), so reorder is scoped to that one record
  // even when another category shares its name.
  const onFiltersChanged = filters => {
    const cat = (filters || []).find(f => f.id === 'categoryName');
    const values = Array.isArray(cat?.value) ? cat.value : [];
    const only = values.length === 1 ? values[0] : null;
    setActiveCategory(only);
    if (!only && reorder) {
      setReorder(false);
    }
  };
  if (reorder && activeCategory) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("section", {
      className: "pd-data-list pmdk-data-list",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)(_ServiceReorder_jsx__WEBPACK_IMPORTED_MODULE_22__.ServiceReorder, {
        categoryIdentity: activeCategory,
        services: state.services,
        onCancel: () => setReorder(false),
        onSaved: () => {
          setReorder(false);
          onReload();
        },
        showToast: showToast
      })
    });
  }
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("section", {
    className: "pd-data-list pmdk-data-list",
    "aria-label": "Services list",
    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)(_pressmaximum_dashboard_kit_table__WEBPACK_IMPORTED_MODULE_2__.PMDKDataTable, {
      columns: columns,
      data: state.services,
      getRowId: row => String(row.id),
      status: state.status === 'ready' && !state.services.length ? 'empty' : state.status,
      states: {
        empty: {
          icon: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon)('tag'),
          title: 'No services yet',
          description: 'Create the services customers can book.',
          action: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("button", {
            className: "pmdk-button primary sm",
            type: "button",
            onClick: onNew,
            children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon)('plus'), "New service"]
          })
        },
        error: {
          title: 'Could not load services',
          description: state.error || '',
          action: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("button", {
            className: "pmdk-button sm",
            type: "button",
            onClick: onReload,
            children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon)('arrows'), "Retry"]
          })
        }
      },
      enableRowSelection: false,
      onColumnFiltersChange: onFiltersChanged,
      filterBuilder: ({
        table
      }) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)(_lib_facets_jsx__WEBPACK_IMPORTED_MODULE_18__.Facets, {
        table: table,
        defs: FACETS,
        renderIcon: _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon
      }),
      activeFilters: ({
        table
      }) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)(_lib_facets_jsx__WEBPACK_IMPORTED_MODULE_18__.FacetChips, {
        table: table,
        defs: FACETS,
        renderIcon: _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon
      }),
      filterCount: ({
        table
      }) => (0,_lib_facets_jsx__WEBPACK_IMPORTED_MODULE_18__.facetCount)(table, FACETS),
      toolbarControls: activeCategory ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("button", {
        className: "pmdk-toolbar-control",
        type: "button",
        onClick: () => setReorder(true),
        children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon)('list'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("span", {
          children: "Reorder"
        })]
      }) : null,
      onRowActivate: row => onQuickView(row),
      getRowAriaLabel: row => `Quick view ${row.name}`,
      renderIcon: _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon,
      itemsLabel: "services",
      labels: {
        searchPlaceholder: 'Search services…',
        searchAria: 'Search services'
      },
      persistenceKey: "aponto.admin.services.table.v1"
    })
  });
}

// --- Categories tab (C2: inline rename + drag-reorder) ----------------------
function CategoriesPanel({
  state,
  confirm,
  onReload,
  showToast
}) {
  // Local drag order (ids), synced from the server list which is already position-sorted
  // (GET /service-categories → ORDER BY position). Optimistic on drop; reverted if the reorder
  // POST fails. The public booking form reads the same position order, so a drag here changes the
  // order customers see (C2).
  const [order, setOrder] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(() => state.categories.map(c => c.id));
  const [savingOrder, setSavingOrder] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const [editingId, setEditingId] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
  const byId = (0,react__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => Object.fromEntries(state.categories.map(c => [c.id, c])), [state.categories]);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    setOrder(state.categories.map(c => c.id));
  }, [state.categories]);
  const sensors = (0,_dnd_kit_core__WEBPACK_IMPORTED_MODULE_3__.useSensors)((0,_dnd_kit_core__WEBPACK_IMPORTED_MODULE_3__.useSensor)(_dnd_kit_core__WEBPACK_IMPORTED_MODULE_3__.PointerSensor, {
    activationConstraint: {
      distance: 5
    }
  }), (0,_dnd_kit_core__WEBPACK_IMPORTED_MODULE_3__.useSensor)(_dnd_kit_core__WEBPACK_IMPORTED_MODULE_3__.KeyboardSensor, {
    coordinateGetter: _dnd_kit_sortable__WEBPACK_IMPORTED_MODULE_4__.sortableKeyboardCoordinates
  }));
  const rename = async (category, name) => {
    const next = (name || '').trim();
    setEditingId(null);
    if (!next || next === category.name) {
      return;
    }
    try {
      await _lib_api_js__WEBPACK_IMPORTED_MODULE_7__.api.patch(`/service-categories/${category.id}`, {
        name: next
      });
      showToast('Category renamed.', 'success');
      onReload();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };
  const removeCategory = async category => {
    const ok = await confirm({
      title: `Delete “${category.name}”?`,
      message: 'Its services move to Uncategorized. This can’t be undone.',
      confirmText: 'Delete',
      destructive: true
    });
    if (!ok) {
      return;
    }
    try {
      const res = await _lib_api_js__WEBPACK_IMPORTED_MODULE_7__.api.del(`/service-categories/${category.id}`);
      showToast(`Category deleted — ${res.services_uncategorized || 0} service${res.services_uncategorized === 1 ? '' : 's'} moved to Uncategorized.`);
      onReload();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };
  const onDragEnd = async ({
    active,
    over
  }) => {
    if (!over || active.id === over.id) {
      return;
    }
    const next = (0,_dnd_kit_sortable__WEBPACK_IMPORTED_MODULE_4__.arrayMove)(order, order.indexOf(active.id), order.indexOf(over.id));
    setOrder(next);
    setSavingOrder(true);
    try {
      // Full-set replacement (rest-contract §2.4).
      await _lib_api_js__WEBPACK_IMPORTED_MODULE_7__.api.post('/service-categories/reorder', {
        ids: next
      });
      showToast('Category order saved.', 'success');
      onReload();
    } catch (err) {
      setOrder(state.categories.map(c => c.id));
      showToast(err.message, 'danger');
    } finally {
      setSavingOrder(false);
    }
  };
  if (state.status === 'loading') {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("p", {
      className: "pd-editor-note",
      style: {
        padding: '16px 4px'
      },
      children: "Loading categories\u2026"
    });
  }
  if (!state.categories.length) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("div", {
      className: "ap-reserved-tab",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("span", {
        className: "ap-state-icon",
        "aria-hidden": "true",
        children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon)('tag')
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("h2", {
        children: "No categories yet"
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("p", {
        children: "Group related services under a category. Services without one show as \u201CUncategorized\u201D."
      })]
    });
  }
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("section", {
    className: "pd-data-list pmdk-data-list ap-simple-table ap-cat-table",
    "aria-label": "Categories",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("p", {
      className: "ap-list-note",
      role: "note",
      children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon)('list'), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("span", {
        children: "Drag to set the order customers see. Click a name to rename it."
      })]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("div", {
      className: "pmdk-table-wrap",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)(_dnd_kit_core__WEBPACK_IMPORTED_MODULE_3__.DndContext, {
        sensors: sensors,
        collisionDetection: _dnd_kit_core__WEBPACK_IMPORTED_MODULE_3__.closestCenter,
        onDragEnd: onDragEnd,
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)(_dnd_kit_sortable__WEBPACK_IMPORTED_MODULE_4__.SortableContext, {
          items: order,
          strategy: _dnd_kit_sortable__WEBPACK_IMPORTED_MODULE_4__.verticalListSortingStrategy,
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("table", {
            className: "pmdk-table",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("thead", {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("tr", {
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("th", {
                  scope: "col",
                  className: "ap-cat-drag-col",
                  children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("span", {
                    className: "screen-reader-text",
                    children: "Reorder"
                  })
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("th", {
                  scope: "col",
                  children: "Name"
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("th", {
                  scope: "col",
                  className: "pmdk-amount",
                  children: "Services"
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("th", {
                  scope: "col",
                  className: "pmdk-col-action",
                  children: "Action"
                })]
              })
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("tbody", {
              children: order.map(id => byId[id] ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)(SortableCategoryRow, {
                category: byId[id],
                editing: editingId === id,
                busy: savingOrder,
                onStartRename: () => setEditingId(id),
                onRename: name => rename(byId[id], name),
                onCancelRename: () => setEditingId(null),
                onDelete: () => removeCategory(byId[id])
              }, id) : null)
            })]
          })
        })
      })
    })]
  });
}

// One draggable, inline-renameable category row (C2).
function SortableCategoryRow({
  category,
  editing,
  busy,
  onStartRename,
  onRename,
  onCancelRename,
  onDelete
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = (0,_dnd_kit_sortable__WEBPACK_IMPORTED_MODULE_4__.useSortable)({
    id: category.id
  });
  const [draft, setDraft] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(category.name);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    setDraft(category.name);
  }, [category.name, editing]);
  const style = {
    transform: _dnd_kit_utilities__WEBPACK_IMPORTED_MODULE_5__.CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined
  };
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("tr", {
    ref: setNodeRef,
    style: style,
    className: isDragging ? 'is-dragging' : undefined,
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("td", {
      className: "ap-cat-drag",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("button", {
        type: "button",
        className: "ap-reorder-handle",
        "aria-label": `Reorder ${category.name}`,
        disabled: busy,
        ...attributes,
        ...listeners,
        children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon)('moreVertical')
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("td", {
      children: editing ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("input", {
        className: "ap-cat-rename-input",
        value: draft
        // eslint-disable-next-line jsx-a11y/no-autofocus
        ,
        autoFocus: true,
        "aria-label": `Rename ${category.name}`,
        onChange: e => setDraft(e.target.value),
        onBlur: () => onRename(draft),
        onKeyDown: e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onRename(draft);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancelRename();
          }
        }
      }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("button", {
        type: "button",
        className: "ap-cat-name",
        onClick: onStartRename,
        title: "Click to rename",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("span", {
          className: "pmdk-cell-value pmdk-cell-strong",
          children: category.name
        })
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("td", {
      className: "pmdk-amount",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("span", {
        className: "pmdk-cell-value pmdk-cell-numeric",
        children: category.count ?? 0
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("td", {
      className: "pmdk-col-action",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)(_lib_RowMenu_jsx__WEBPACK_IMPORTED_MODULE_17__.RowMenu, {
        label: `Actions for ${category.name}`,
        renderIcon: _lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon,
        items: [{
          action: 'rename',
          label: 'Rename category',
          icon: 'note'
        }, {
          action: 'delete',
          label: 'Delete category',
          icon: 'trash',
          danger: true,
          separatorBefore: true
        }],
        onSelect: action => {
          if (action === 'rename') onStartRename();else if (action === 'delete') onDelete();
        }
      })
    })]
  });
}

// --- Quick view (read-only) -------------------------------------------------
function ServiceQuickView({
  service,
  categories,
  onEdit,
  onClose
}) {
  const category = service.category_id ? categories.find(c => c.id === service.category_id)?.name || UNCATEGORIZED : UNCATEGORIZED;
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.Fragment, {
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("header", {
      className: "pd-booking-inspector-head pd-booking-editor-head",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("div", {
        className: "pd-booking-inspector-identity",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("h2", {
          id: "serviceInspectorTitle",
          children: service.name
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("button", {
        className: "pd-icon-button",
        type: "button",
        "aria-label": "Close service quick view",
        onClick: onClose,
        children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon)('close')
      })]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("div", {
      className: "pd-booking-inspector-body",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("section", {
        className: "pd-editor-section",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("div", {
          className: "pd-editor-section-head",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("h3", {
            children: "Overview"
          }), (0,_bookings_dashboard_stats_js__WEBPACK_IMPORTED_MODULE_23__.serviceNotBookable)(service) ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("span", {
            className: "ap-status-pill is-draft",
            children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_6__.__)('Not bookable', 'aponto')
          }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("span", {
            className: `ap-status-pill is-${service.status}`,
            children: service.status
          })]
        }), (0,_bookings_dashboard_stats_js__WEBPACK_IMPORTED_MODULE_23__.serviceNotBookable)(service) ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("p", {
          className: "ap-inspector-note",
          children: NOT_BOOKABLE_REASON
        }) : null, /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("div", {
          className: "pd-editor-readonly",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("span", {
            className: "pd-editor-readonly-label",
            children: "Category"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("strong", {
            children: category
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("div", {
          className: "pd-editor-readonly",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("span", {
            className: "pd-editor-readonly-label",
            children: "Duration"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("strong", {
            children: [service.duration_minutes, " min"]
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("div", {
          className: "pd-editor-readonly",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("span", {
            className: "pd-editor-readonly-label",
            children: "Price"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("strong", {
            children: service.price_minor === null || service.price_minor === undefined ? '—' : (0,_lib_format_js__WEBPACK_IMPORTED_MODULE_11__.money)(service.price_minor)
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("div", {
          className: "pd-editor-readonly",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("span", {
            className: "pd-editor-readonly-label",
            children: "Eligible staff"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("strong", {
            children: [service.staffCount, " staff"]
          })]
        })]
      }), service.description ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("section", {
        className: "pd-editor-section",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("div", {
          className: "pd-editor-section-head",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("h3", {
            children: "Description"
          })
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("p", {
          className: "ap-inspector-note",
          children: service.description
        })]
      }) : null]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("footer", {
      className: "pd-drawer-foot pd-booking-inspector-foot",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("div", {
        className: "pd-inspector-foot-actions",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("button", {
          className: "pd-button primary sm",
          type: "button",
          onClick: onEdit,
          children: [(0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon)('note'), "Edit service"]
        })
      })
    })]
  });
}

// --- Category create/rename (in-flow inspector, form mode) ------------------
function CategoryForm({
  mode,
  category,
  onClose,
  onSaved,
  showToast
}) {
  const [name, setName] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(category?.name || '');
  const [saving, setSaving] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
  const creating = mode === 'create';
  const once = (0,_lib_in_flight_js__WEBPACK_IMPORTED_MODULE_9__.useInFlight)();
  const save = () => once(async () => {
    if (!name.trim()) {
      return;
    }
    setSaving(true);
    try {
      if (creating) {
        await _lib_api_js__WEBPACK_IMPORTED_MODULE_7__.api.post('/service-categories', {
          name: name.trim()
        });
        showToast('Category created.', 'success');
      } else {
        await _lib_api_js__WEBPACK_IMPORTED_MODULE_7__.api.patch(`/service-categories/${category.id}`, {
          name: name.trim()
        });
        showToast('Category renamed.', 'success');
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      showToast(err.message, 'danger');
      setSaving(false);
    }
  });
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.Fragment, {
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("header", {
      className: "pd-booking-inspector-head pd-booking-editor-head",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("div", {
        className: "pd-booking-inspector-identity",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("h2", {
          id: "serviceInspectorTitle",
          children: creating ? 'New category' : 'Rename category'
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("button", {
        className: "pd-icon-button",
        type: "button",
        "aria-label": "Close category form",
        onClick: onClose,
        children: (0,_lib_icon_jsx__WEBPACK_IMPORTED_MODULE_12__.renderIcon)('close')
      })]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("form", {
      className: "pd-booking-inspector-body pd-compact-editor",
      onSubmit: e => {
        e.preventDefault();
        save();
      },
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("section", {
        className: "pd-editor-section",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("div", {
          className: "pd-editor-section-head",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("h3", {
            children: "Category"
          })
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("label", {
          className: "pd-compact-field",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("input", {
            value: name,
            placeholder: " ",
            autoFocus: true,
            required: true,
            onChange: e => setName(e.target.value)
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("span", {
            className: "pd-compact-label",
            children: "Name"
          })]
        })]
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("footer", {
      className: "pd-drawer-foot pd-booking-inspector-foot",
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsxs)("div", {
        className: "pd-inspector-foot-actions",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("button", {
          className: "pd-button sm",
          type: "button",
          onClick: onClose,
          children: "Cancel"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_24__.jsx)("button", {
          className: "pd-button primary sm",
          type: "button",
          disabled: saving,
          onClick: save,
          children: saving ? 'Saving…' : creating ? 'Create' : 'Save'
        })]
      })
    })]
  });
}

/***/ }

}]);
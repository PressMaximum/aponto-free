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

export const SHADOW_CSS = TOKENS + COMPONENTS;

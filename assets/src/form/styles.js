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
  /* The tick sits ON the accent, so it has to follow --ap-color-on-accent — which
   * a data URI cannot read. White is the default for the dark-to-mid accents;
   * resolveAppearanceVars() in lib/appearance.js re-emits this URL with the
   * derived near-black baked in whenever a light accent flips the foreground. */
  --ap-checkbox-check-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='m3.5 8.1 2.7 2.7 6.3-6.3' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  /* appearance:none takes the UA arrow with the UA border, so the affordance
   * comes back as a background. A data URI is its own document and cannot read
   * currentColor, hence the literal stroke restated by the dark preset. */
  --ap-select-chevron-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='m4 6.5 4 4 4-4' fill='none' stroke='%236f7479' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  /* Pure white (founder 2026-09-30): the warm #fdfdfb read as a second, dirtier white
   * next to every canvas-white control and popover. */
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

  /* text-muted/soft darkened to WCAG AA (4.5:1 on surface): muted 68→72%
   * (4.55→5.13), soft 52→70% (2.96→4.82). Fixes axe serious color-contrast on
   * .ap-step-fraction + .opt (both consume text-soft). Q-founder token decision. */
  --ap-tone-text-muted: 72%;
  --ap-tone-text-soft: 70%;
  --ap-tone-surface-subtle: 5%;
  --ap-tone-surface-muted: 7%;
  --ap-tone-avatar-surface: 5%;
  /* Two border roles on white: DIVIDERS (card edge, columns, section rules) stay quiet;
   * CONTROL outlines (inputs, slots, selects, option cards) keep enough edge to read as
   * operable. */
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
  /* The accent used as TEXT on a surface, as opposed to as a fill behind
   * --ap-color-on-accent. Identical to the accent in the light scheme; the dark preset
   * lightens it, because the raw brand accent on the dark surface measured 3.1:1 — below
   * the 4.5:1 a small glyph needs (fix round 1, B3). Declared as a token rather than as a
   * component override so the dark scheme stays "a token preset, not component CSS". */
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

  /* Caps the CARD; the two below cap the content column inside it. 960 (D-R49):
   * with the sidebar on from step 1 the content column is ~670px on every step, so
   * nothing shifts. The block's maxWidth overrides it on the host (480–1140). */
  --ap-layout-max: 960px;
  --ap-layout-content: 660px;
  --ap-layout-catalogue: 820px;
  --ap-layout-sidebar: 240px;
  --ap-layout-sidebar-wide: 288px;

  /* PUBLIC INPUT (D-R52), like the accent and the radius: a host page with its own
   * sticky header sets this on the widget host so the staff profile dialog — which is
   * pinned with position:sticky INSIDE the card, never fixed to the viewport — clears
   * it instead of opening underneath. 0 by default, because most themes have none. */
  --ap-sticky-offset: 0px;
  /* PUBLIC INPUT: the card's own side gutter at EVERY width (founder review 2026-09-30) —
   * a theme with no section padding put it flush against the screen edge, and the
   * shadow needs the room anyway. 0 turns it off. */
  --ap-edge-gap: 16px;

  /* Card elevation (founder review 2026-09-30): no border, shadow only, in three steps
   * the block picks with its "shadow" attribute (host attribute data-ap-shadow). Each step
   * layers a faint all-round edge (so the top is not cut off), a tight contact shadow and
   * a soft ambient one whose NEGATIVE spread keeps the blur tucked under the card. "flat" is the old hairline
   * frame with no shadow. The card radius is twice the control radius, so it still follows
   * the block's radius seed. */
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
  --ap-tone-border: 12%;
  --ap-tone-border-control: 12%;
  /* A shadow alone does not separate a dark card from a dark page: keep the hairline. */
  --ap-shadow-ink: #000000;
  --ap-card-border: 1px solid var(--ap-color-border);
  --ap-tone-border-strong: 20%;
  --ap-tone-accent-subtle: 22%;
  --ap-tone-accent-soft: 30%;
  /* ~7.5:1 on the dark surface, and still recognisably the site's accent hue. */
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
  /* Cap on the container-query element itself, so the query keeps measuring the
   * card (capped) and not the host (uncapped). See --ap-layout-max. */
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
/* "position: relative" is load-bearing since D-R52: the staff profile dialog is an absolutely
 * positioned CHILD of the card, so it covers the card (sidebar included) and nothing else. */
.ap { position: relative; width: 100%; background: var(--ap-color-surface); color: var(--ap-color-text);
  border: var(--ap-card-border); border-radius: calc(var(--ap-radius-control) * 2);
  box-shadow: var(--ap-shadow-card); font-family: inherit; font-size: var(--ap-font-size-body); font-weight: var(--ap-font-weight-regular);
  line-height: var(--ap-line-height-body); overflow: clip;
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
/* .ap itself is in the border-box list: content-box made the card cap+2px wide
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
/* A SECOND container, nested inside the card's own "apw" (D-R52). The card already answers
 * "how wide is the widget"; the staff Cards grid has to answer "how wide is the CONTENT
 * COLUMN", which is 240–288px narrower whenever the summary sidebar is on. Nesting is the only
 * way one build serves both. "contain" also makes this the containing block for absolutely
 * positioned descendants, which is why the dialog is rendered at CARD level, not inside a step. */
.ap-main { padding: 24px; min-width: 0; container-type: inline-size; container-name: apmain; }
.ap-main.narrow { width: 100%; max-width: var(--ap-layout-content); margin-inline: auto; }
.ap-main.service { width: 100%; max-width: var(--ap-layout-catalogue); margin-inline: auto; }
/* Summary column: hidden until the ≥700px query below reveals it. */
.ap-aside { display: none; flex-direction: column; min-height: 0; overflow: hidden;
  border-inline-start: 1px solid var(--ap-color-border); background: var(--ap-color-surface); padding: 24px; }

.ap-recap { border-bottom: 1px solid var(--ap-color-border); }
.ap-recap-bar { display: flex; align-items: center; gap: 12px; width: 100%; background: var(--ap-color-surface);
  border: 0; padding: 12px 24px; font: inherit; color: var(--ap-color-text); cursor: pointer; text-align: start; }
.ap-recap-line { display: flex; flex: 1; min-width: 0; font-size: var(--ap-font-size-sm); font-weight: var(--ap-font-weight-medium);
  white-space: nowrap; overflow: hidden; }
/* The time never truncates; the service name does (QA D05). */
.ap-recap-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.ap-recap-when { flex: none; }
.ap-recap-chev { flex: 0 0 auto; color: var(--ap-color-text-soft); display: grid; place-items: center; }
.ap-recap-chev svg { width: 16px; height: 16px; transform: rotate(90deg); transition: transform var(--ap-motion-standard); }
.ap-recap-chev.up svg { transform: rotate(-90deg); }
.ap-recap-panel { overflow: hidden; max-height: 0; transition: max-height var(--ap-motion-standard); background: var(--ap-color-surface); }
.ap-recap-panel.open { max-height: min(68vh, 560px); overflow-y: auto; }
.ap-recap-panel-in { padding: 16px 24px; border-top: 1px solid var(--ap-color-border); }

/* Adaptivity (SPEC-P1 §2.1, mockup index.html:101-110). Container queries, not
 * viewport media: one build serves a wide embed and a narrow one, and the summary
 * moves between sidebar and recap accordion with no re-render. has-summary is set
 * whenever the sidebar column exists (per summaryMode, D-R49; never Confirmation).
 * .solo = summaryMode "off": no sidebar to hand over to, so the recap stays. */
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

/* ONE-PAGE FRAME (D-R80, block layout "one-page"; mockup single-screen-layout.html block D).
 * The intro panel is the FIRST grid track — first in DOM order, so it is the inline-start
 * column under dir=rtl too — and the active screen is the second. Below 700px the two stack:
 * the intro is compact on the first screen (description + contact line behind "Show details")
 * and collapses to the shipped recap bar once a time is chosen. Tokens only, so the dark preset
 * reaches it unchanged; same 240/288px column widths as the summary sidebar it replaces. */
.ap-intro { display: flex; flex-direction: column; min-width: 0; border-bottom: 1px solid var(--ap-color-border);
  overflow-wrap: anywhere; }
.ap-intro .ap-recap-bar, .ap-intro-more { display: none; }
/* Same inset as .ap-main, so the intro's .ap-h title and the screen's heading share a baseline. */
.ap-intro-body { display: flex; flex: 1; flex-direction: column; padding: 24px; }
.ap-intro-main { flex: 1 0 auto; }
.ap-intro-pick { margin: 4px 0 12px; padding-top: 16px; border-top: 1px solid var(--ap-color-border); }
.ap-intro-desc { margin: 4px 0 0; font-size: var(--ap-font-size-sm); color: var(--ap-color-text-muted); }
.ap-intro-more { font-size: var(--ap-font-size-sm); }
.ap-intro .ap-sum-help { margin-top: 24px; }
/* Host / team (D-R85): avatar(s) + name on one line, the title or "You'll meet …" under it at
 * full width. The stack overlaps with a logical margin, so it mirrors under dir=rtl. */
.ap-intro-host { --ap-staff-av: 32px; margin: 0 0 16px; }
.ap-intro-host-row { display: flex; align-items: center; gap: 12px; min-width: 0; }
.ap-intro-host .ap-av { font-size: var(--ap-font-size-xs); }
.ap-intro-host-name { min-width: 0; font-weight: var(--ap-font-weight-medium); overflow-wrap: anywhere; }
.ap-intro-host-sub { margin: 8px 0 0; font-size: var(--ap-font-size-sm); color: var(--ap-color-text-muted); }
.ap-av-stack { display: flex; flex: 0 0 auto; }
.ap-av-stack .ap-av { box-shadow: 0 0 0 2px var(--ap-color-surface); }
.ap-av-stack .ap-av + .ap-av { margin-inline-start: -4px; }
/* "Change time" under the chosen time, and amounts that never split ("−" / "$7.50") in the
 * 240px column. */
.ap-intro-change { display: block; margin-top: 6px; font-size: var(--ap-font-size-xs); }
.ap-intro :is(.ap-amt, .ap-sum-total .v) { white-space: nowrap; }
/* The intro already says what and when, so the confirmation keeps only its action tiles —
 * on one row, so "Print" is never orphaned under the other two. */
.ap-op .ap-cal-tiles { grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); }
@container apw (min-width: 700px) {
  .ap-op { grid-template-columns: var(--ap-layout-sidebar) minmax(0, 1fr); }
  .ap-intro { border-bottom: 0; border-inline-end: 1px solid var(--ap-color-border); }
}
@container apw (min-width: 900px) { .ap-op { grid-template-columns: var(--ap-layout-sidebar-wide) minmax(0, 1fr); } }
/* AFTER the base rule above, at equal specificity, so it wins: the intro title and the screen
 * heading share one inline start at every width (fix round 1 — declared earlier, it lost). */
@container apw (max-width: 619.98px) { .ap-intro-body { padding: 20px; } }
@container apw (max-width: 699.98px) {
  .ap-intro-more { display: inline-block; }
  .ap-intro:not(.is-expanded):not(.is-recap) :is(.ap-intro-desc, .ap-sum-help) { display: none; }
  .ap-intro.is-recap .ap-recap-bar { display: flex; }
  .ap-intro.is-recap:not(.is-open) .ap-intro-body { display: none; }
  .ap-intro.is-recap .ap-intro-body { border-top: 1px solid var(--ap-color-border); }
}

/* MACRO PROGRESS (D-R53, block attribute stepDisplay = "horizontal"; ported from the v4
 * mockup's compactProgressHTML). An ordered list, not a bar: the steps are named, numbered and
 * countable, and the connector behind them is decoration. Items are NOT interactive — jumping
 * back releases a payment hold and can cross a live payment state, and the Back button already
 * owns those rules.
 *
 * "justify-content: space-between" in a flex row follows "direction", and the connector uses
 * "inset-inline", so the whole rail mirrors under dir=rtl with no extra rule. The item
 * background is what masks the connector line behind each label. */
.ap-steps { position: relative; display: flex; align-items: center; justify-content: space-between;
  width: 100%; margin: 0 0 20px; padding: 0; list-style: none; color: var(--ap-color-text-soft); }
.ap-steps::before { content: ""; position: absolute; z-index: 0; top: 10px; inset-inline: 10px;
  height: 1px; background: var(--ap-color-border); }
/* The label sits at the XS tier (13px), NOT at SM (15px) — the one deliberate divergence from
 * the v4 mockup's .ap-compact-steps li, which the rail otherwise copies token for token
 * (21px circle, 11px numeral, 7px gap, 18px bottom margin). At 15px the rail read as a second
 * heading next to the 24px .ap-h h2 it is supposed to be subordinate to (founder QA
 * 2026-09-20); the mockup gets away with it because its compact shell has no 24px heading
 * above the rail on the same screen. */
.ap-steps li { position: relative; z-index: 1; display: flex; align-items: center; gap: 7px;
  flex: 0 1 auto; padding: 0 7px; min-width: 0; white-space: nowrap;
  font-size: var(--ap-font-size-xs); background: var(--ap-color-surface); }
.ap-steps li:first-child { padding-inline-start: 0; }
.ap-steps li:last-child { padding-inline-end: 0; }
.ap-step-num { flex: 0 0 auto; width: 21px; height: 21px; display: grid; place-items: center;
  border: 1px solid var(--ap-color-border); border-radius: 50%; font-size: var(--ap-font-size-badge);
  line-height: 1; font-variant-numeric: tabular-nums; }
/* The visible label ELLIPSISES instead of overlapping its neighbour (fix round 1, P2-4). The
 * Staff label is operator text ("booking.staff_label", up to 40 characters) and a translation
 * can be long, so "nowrap and hope" was a desktop overlap waiting to happen. The full string
 * stays in the DOM — so assistive tech still reads it — and rides the item's "title" for a
 * sighted mouse user. The "ch" cap keeps one long word from eating the rail before flexbox
 * gets a say; the circle never shrinks. */
.ap-step-label { min-width: 0; max-width: 14ch; overflow: hidden; text-overflow: ellipsis; }
.ap-steps li[aria-current="step"] { color: var(--ap-color-text); font-weight: var(--ap-font-weight-semibold); }
.ap-steps li[aria-current="step"] .ap-step-num { border-color: var(--ap-color-accent); color: var(--ap-color-accent); }
.ap-steps li.is-done { color: var(--ap-color-text-muted); }
/* A done step is a button back to it (founder review 2026-09-30): same look, the label
 * turns the accent on hover. */
.ap-step-btn { display: inline-flex; align-items: center; gap: inherit; min-width: 0; margin: 0; padding: 0;
  border: 0; background: none; font: inherit; color: inherit; cursor: pointer; border-radius: var(--ap-radius-small); }
.ap-step-btn:hover .ap-step-label { color: var(--ap-color-accent-text); }
.ap-step-btn:hover .ap-step-num { filter: brightness(.94); }
.ap-steps li.is-done .ap-step-num { border-color: var(--ap-color-accent); background: var(--ap-color-accent); color: var(--ap-color-on-accent); }
/* Measured on the CONTENT column, because the summary sidebar eats 240-288px of the card. Six
 * labels never fit a 360px phone, so below 440px the rail keeps the numbered circles and the
 * words go visually hidden — they stay in the DOM, so a screen reader still reads them and the
 * "you are here" item is still named. Deliberately NOT the mockup's hover tooltip: a hover
 * affordance on the one viewport that has no hover is decoration with a maintenance cost. */
@container apmain (max-width: 439.98px) {
  .ap-steps li { gap: 0; padding-inline: 0; }
  .ap-step-label { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
}

/* A GRID, not a wrapping flex row (fix round 1, B1). Flex could only keep the fraction beside
 * the heading while the heading FIT: at 375px "Choose your staff member" is two lines, the row
 * wrapped, and "02 / 05" dropped ~60px below the heading it belongs to. Two columns —
 * "everything the heading needs" and "as much as the fraction takes" — mean the heading may
 * wrap to as many lines as it likes and the fraction stays pinned to the first one at the
 * inline end. "align-items: baseline" is what pins it to the FIRST line rather than centring it
 * against a two-line block; "justify-self: end" replaces a physical "margin-left: auto", so it
 * is also the RTL fix. The sub spans both columns underneath. */
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

/* Native control chrome is opt-OUT, and the opt-out was missing: a select (or an
 * input[type=checkbox]) keeps appearance:auto, so Chrome/WebKit paint the
 * platform widget — its own ~#767676 ring included — INSTEAD of the hairline
 * declared below. The declaration still applies, so getComputedStyle reports the
 * hairline while the screen shows a near-black ring; that is why the reported
 * "black border" survived two rounds of token auditing. Both select rules already
 * reserve right padding for an arrow, so the chevron just moves from the UA into
 * this sheet (physical, matching the physical padding those rules ship). */
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
/* A generic two-column field row (first + last name, email + phone — name split, 2026-10-01):
 * side by side once the CONTENT column holds two ~190px inputs — the same 400px line the staff
 * Cards use — and stacked below it, where plain block flow already does the job, so the narrow
 * case costs no rule at all. Any pair of .ap-field blocks may sit in one. */
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

/* Logical insets so the magnifier and the text indent both flip under dir=rtl. */
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
/* "Drill into this category" points the way the language runs. ":dir()" rather than an
 * "[dir]" ancestor selector because this stylesheet lives in a shadow root and cannot see the
 * host's attribute (D-R52 polish). */
.ap-cat .chev svg:dir(rtl) { transform: scaleX(-1); }
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
/* Staff portrait / initials (D-R51). ONE circle, ONE size per placement, whether or not a photo
 * exists — the media slot never collapses, so the row rhythm never changes and a half-marked
 * list can never read as broken. --ap-color-avatar-surface is the v4 token for exactly this
 * fill (booking-form/README.md), derived from --ap-color-text over the surface, so it tracks the
 * dark preset and never collides with an accent state. The size is a variable because the same
 * circle is 44px in a row, 72px in a card and 64px in the profile dialog (D-R52). */
.ap-av { position: relative; flex: 0 0 auto; width: var(--ap-staff-av, 40px); height: var(--ap-staff-av, 40px);
  border-radius: 50%; display: grid; place-items: center; overflow: hidden; font-size: var(--ap-font-size-sm);
  font-weight: var(--ap-font-weight-semibold); line-height: 1;
  background: var(--ap-color-avatar-surface); color: var(--ap-color-text-muted); }
/* The photo sits OVER the initials and is revealed only once it has loaded, so a Gravatar that
 * 404s (d=404 is how "no Gravatar" is now answered) costs neither a broken-image glyph nor a
 * reflow — the circle was already correct. */
.ap-av-img { position: absolute; inset: 0; width: 100%; height: 100%; display: block;
  object-fit: cover; border-radius: 50%; opacity: 0; }
.ap-av-img.is-loaded { opacity: 1; }

/* ============================================================
 * STAFF STEP — ONE component, TWO modes (D-R52, phase 2 of the staff public profile;
 * ported from docs/mockups/v4/booking-form/specialist-step.html, founder-approved 2026-09-20).
 *
 * The BASE is the list row. ".ap-staff-list.cards" is an override that only switches on above a
 * 400px CONTENT column, so "Cards degrades to List" is the same DOM losing one container
 * query — not a second implementation, not a JS re-render, and not a second set of a11y
 * semantics to get wrong.
 * ============================================================ */
.ap-staff-list { border: 1px solid var(--ap-color-border-control); border-radius: var(--ap-radius-control); overflow: hidden;
  --ap-staff-av: 44px; --ap-staff-pad: 14px; --ap-staff-gap: 12px; }
/* 12 staff: the LIST scrolls on the shipped .ap-list contract (352px ≈ 5½ rows, so the
 * half-cut row advertises the rest and Back stays on screen); CARDS do not — a card grid
 * clipped mid-row reads as broken layout rather than as a scroll region. No paging either way. */
.ap-staff-list.scroll { max-height: 352px; overflow-y: auto; }
.ap-staff-item { display: flex; align-items: stretch; background: var(--ap-color-surface);
  border-top: 1px solid var(--ap-color-border); min-width: 0; }
.ap-staff-item:first-child { border-top: 0; }
.ap-staff-item.is-sel { background: var(--ap-color-accent-subtle); }
/* The choice control. NEVER contains another interactive element: the profile disclosure is a
 * SIBLING, so there is no nested interactive content and reaching for "Learn more" can never
 * commit the step by accident. */
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
/* "Any available" is NOT a person: a rounded square with a neutral sparkle, never a portrait
 * and never initials — it stands for nobody. The Location step's pin uses the same slot (D-R62),
 * so the selected tint below is keyed on the mark alone and covers both. */
.ap-staff-mark { flex: 0 0 auto; width: var(--ap-staff-av); height: var(--ap-staff-av); border-radius: var(--ap-radius-control);
  display: grid; place-items: center; background: var(--ap-color-surface-muted); color: var(--ap-color-text-soft); }
.ap .ap-staff-mark svg { width: 20px; height: 20px; }
.ap-staff-item.any .ap-staff-name { font-weight: var(--ap-font-weight-medium); }
.ap-staff-item.is-sel .ap-staff-mark { background: var(--ap-color-accent-soft); color: var(--ap-color-accent); }
/* Selected affordance = the shipped one, and never colour-only: accent-subtle fill AND a filled
 * check circle AND aria-pressed. */
.ap-staff-tick { flex: 0 0 auto; width: var(--ap-size-selection); height: var(--ap-size-selection); border-radius: 50%;
  border: 1.5px solid var(--ap-color-border-strong); display: grid; place-items: center; margin-inline-start: 2px; }
.ap-staff-item.is-sel .ap-staff-tick { border-color: var(--ap-color-accent); background: var(--ap-color-accent); color: var(--ap-color-on-accent); }
.ap .ap-staff-tick svg { width: 11px; height: 11px; opacity: 0; }
.ap-staff-item.is-sel .ap-staff-tick svg { opacity: 1; }
/* Profile trigger — a SIBLING of the choice control. In a row it is a split secondary action
 * behind a hairline; in a card it is a 24px corner button. It opens the dialog, never selects. */
.ap-staff-info { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  min-width: 44px; padding: 0 12px; background: none; border: 0; border-inline-start: 1px solid var(--ap-color-border);
  font: inherit; font-size: var(--ap-font-size-xs); color: var(--ap-color-accent-text); cursor: pointer;
  transition: background var(--ap-motion-standard); }
.ap-staff-info:hover { background: var(--ap-color-row-hover); }
.ap .ap-staff-info svg { width: 16px; height: 16px; }
.ap-staff-info-t { display: none; white-space: nowrap; }
/* A GHOST of the trigger cell, rendered on rows that have no profile to open — but only while
 * some OTHER row in the same list does (fix round 1, B4). Without it the "Any available" row's
 * tick sat at the row end while every other tick sat before the "Learn more" cell, so the
 * column of ticks stepped in and out. It is the same element with the same box, so the widths
 * cannot drift apart as the label appears and disappears across container widths; it is a
 * "<span>", so it is not focusable, and "visibility: hidden" takes it out of the a11y tree as
 * well as off the screen. The hairline is transparent: only a REAL trigger gets a divider. */
.ap-staff-info-ghost { visibility: hidden; pointer-events: none; border-inline-start-color: transparent; }
/* Inside the button: cancel the gap and the button's end padding so the tick lands in the
 * same column as the rows that have a real trigger after the button. */
.ap-staff-btn > .ap-staff-info-ghost { align-self: stretch; margin-inline-start: calc(var(--ap-staff-pad) - var(--ap-staff-gap));
  margin-inline-end: calc(-1 * var(--ap-staff-pad)); }
/* The visible label only appears where the name can spare the horizontal space. */
@container apmain (min-width: 380px) { .ap-staff-info-t { display: inline; } }

/* ---- CARDS: only above a 400px CONTENT column (not card width — the sidebar eats 240–288px,
 * which is why .ap-main nests its own container). 400 is where a card still holds a 72px
 * portrait plus a two-line name at ~190px; below it a card is just a worse row. ---- */
@container apmain (min-width: 400px) {
  .ap-staff-list.cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;
    border: 0; border-radius: 0; overflow: visible; max-height: none; --ap-staff-av: 72px; --ap-staff-pad: 12px; }
  .ap-staff-list.cards .ap-staff-item { position: relative; border: 1px solid var(--ap-color-border-control);
    border-radius: var(--ap-radius-control); overflow: hidden; display: flex; flex-direction: column; }
  .ap-staff-list.cards .ap-staff-item.is-sel { border-color: var(--ap-color-accent-border); }
  /* Turning profiles ON must not change a card's height: the trigger mirrors the selection tick
   * in the OPPOSITE top corner, inside the card's own padding, instead of adding a footer strip. */
  .ap-staff-list.cards .ap-staff-info { position: absolute; top: 6px; inset-inline-start: 6px; z-index: 1;
    border: 0; border-radius: 50%; width: 24px; height: 24px; min-width: 0; padding: 0; }
  .ap-staff-list.cards .ap-staff-info:hover { background: var(--ap-color-surface-muted); }
  .ap-staff-list.cards .ap-staff-info-t { display: none; }
  /* The glyph read small beside the 18px selection tick opposite it, so it grows to 18px
   * inside the same 24px button — the card's height is unchanged either way (fix round 1, B3). */
  .ap .ap-staff-list.cards .ap-staff-info svg { width: 18px; height: 18px; }
  /* …and the TOUCH target grows past the painted button without moving anything: a 34px hit
   * box centred on a 24px circle, which is what a thumb actually aims at. */
  .ap-staff-list.cards .ap-staff-info::after { content: ""; position: absolute; inset: -5px; }
  /* The trigger is absolutely positioned here, so there is no trailing cell to line up with
   * and the ghost would only add an invisible column to every card. */
  .ap-staff-list.cards .ap-staff-info-ghost { display: none; }
  .ap-staff-list.cards .ap-staff-btn { flex-direction: column; align-items: center; text-align: center; gap: 9px;
    padding: 16px 12px 13px; flex: 1; }
  /* In a COLUMN flex the text block is sized to its content, so a long word escapes the card
   * unless it is explicitly stretched and allowed to shrink. */
  .ap-staff-list.cards .ap-staff-txt { width: 100%; min-width: 0; flex: 0 1 auto; }
  .ap-staff-list.cards .ap-staff-name { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden; overflow-wrap: anywhere; word-break: break-word; }
  .ap-staff-list.cards .ap-staff-role { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
  /* The tick leaves the flow and pins to the top-END corner so the card body stays centred. */
  .ap-staff-list.cards .ap-staff-tick { position: absolute; top: 9px; inset-inline-end: 9px; margin: 0;
    background: var(--ap-color-surface); }
  .ap-staff-list.cards .ap-staff-item.is-sel .ap-staff-tick { background: var(--ap-color-accent); }
  /* "Any available" is a full-width banner above the grid — never one card among people. */
  .ap-staff-list.cards .ap-staff-item.any { grid-column: 1 / -1; --ap-staff-av: 44px; }
  .ap-staff-list.cards .ap-staff-item.any .ap-staff-btn { flex-direction: row; text-align: start; align-items: center;
    gap: 12px; padding: 11px 14px; }
  .ap-staff-list.cards .ap-staff-item.any .ap-staff-tick { position: static; margin-inline-start: 2px; background: none; }
  .ap-staff-list.cards .ap-staff-item.any.is-sel .ap-staff-tick { background: var(--ap-color-accent); }
  .ap-staff-list.cards .ap-staff-item.any .ap-staff-name { -webkit-line-clamp: 1; }
  /* "Show photos" off (D-R52): no media slot anywhere, so a card is a TEXT card. Without the
   * 72px circle the body would collapse to two lines of type in a box a third of its former
   * height, and the grid would read as a table of chips — so the padding grows and a floor
   * keeps the cards square-ish. The mockup's Photos:none means "initials instead of a photo";
   * this setting is the other thing, and it is the variant the mockup did not draw. */
  .ap-staff-list.cards.no-photos .ap-staff-btn { justify-content: center; min-height: 92px; gap: 4px; padding: 18px 14px; }
  .ap-staff-list.cards.no-photos .ap-staff-item.any .ap-staff-btn { min-height: 0; justify-content: flex-start; }
}
@container apmain (min-width: 600px) {
  .ap-staff-list.cards { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
/* COLUMNS = min(people, 3) (fix round 1, B5). With exactly two staff the 3-column grid left a
 * dead third column under the full-width "Any available" banner, which reads as a missing card
 * rather than as a deliberate layout. The count rides in as a class so this stays CSS-only and
 * the grid rows still equalise every card's height. */
@container apmain (min-width: 400px) {
  .ap-staff-list.cards.cols-1 { grid-template-columns: minmax(0, 1fr); }
}
@container apmain (min-width: 600px) {
  .ap-staff-list.cards.cols-1 { grid-template-columns: minmax(0, 1fr); }
  .ap-staff-list.cards.cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
/* Below 400px Cards ARE the list, so they inherit the list's scroll contract too: one behaviour
 * on a phone, whichever layout the site picked. */
@container apmain (max-width: 399.98px) {
  .ap-staff-list.cards { max-height: 352px; overflow-y: auto; }
  /* A phone (persona QA 2026-10-05, T-098): the row chrome left a name ~9 characters a line, so
   * the portrait and the gutters give some of it back; and a service description may take a
   * second line instead of being cut after two words. */
  .ap-staff-list { --ap-staff-av: 36px; --ap-staff-pad: 10px; --ap-staff-gap: 10px; }
  .ap-svc .txt small { white-space: normal; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
}

/* ---- Profile dialog. Scoped to the booking CARD, not the page. ----
 * A page-level overlay would have to out-z-index sticky headers, cookie bars and the theme's
 * own modals, would inherit host body scroll-lock bugs, and would throw a full-viewport scrim
 * over somebody else's page. ".ap" already has overflow:clip, so the dialog is clipped to the
 * card for free. No box-shadow (house rule): separation is a scrim plus a strong hairline, the
 * same recipe as the timezone popover. */
.ap-modal { position: absolute; inset: 0; z-index: 40; display: flex; align-items: flex-start; justify-content: center; padding: 20px; }
.ap-modal-scrim { position: absolute; inset: 0; background: color-mix(in srgb, var(--ap-color-inverse-surface) 46%, transparent); }
/* A tall card (12 cards at 3 columns is ~1400px) would otherwise centre the panel somewhere off
 * screen. "sticky" pins it to the viewport for as long as the card is on screen WITHOUT
 * "position:fixed", which would escape the widget. "--ap-sticky-offset" (default 0px) is a
 * PUBLIC input: a host with its own sticky header sets it so the panel clears it. */
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
/* "pre-line" preserves the operator's paragraph breaks from a plain-text bio WITHOUT any HTML
 * ever being parsed — the string is rendered as a text node (D-R51: the column is plain text
 * precisely so it can be). */
.ap-modal-bio { margin: 0; font-size: var(--ap-font-size-sm); line-height: 1.55; color: var(--ap-color-text-muted);
  white-space: pre-line; overflow-wrap: anywhere; }
.ap-modal-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 16px; border-top: 1px solid var(--ap-color-border); }
/* Narrow container: the dialog becomes a sheet anchored to the bottom of the CARD. Same DOM. */
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
/* Open days carry full text colour at medium weight; closed and past days fall well back.
 * The today dot is the only per-day mark (D-R86); the cell height is fixed either way. */
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
/* The quiet timezone affordance (D-R48): a text label and a text button beside the
   heading, with the picker anchored to it. Never a control-looking box — the whole
   point is that a visitor already on the right clock sees nothing to operate. */
.ap-tz { position: relative; display: inline-flex; align-items: baseline; gap: 5px;
  font-size: var(--ap-font-size-xs); color: var(--ap-color-text-soft); }
.ap-tz-change, .ap-tz-pop-close { padding: 0; border: 0; background: none; font: inherit; cursor: pointer; }
.ap-tz-change { color: var(--ap-color-accent); text-decoration: underline; text-underline-offset: 2px; }
.ap-tz-pop-close { font-size: var(--ap-font-size-body); line-height: 1; color: var(--ap-color-text-soft); }
.ap-tz-change:hover, .ap-tz-pop-close:hover { color: var(--ap-color-text); }
/* The studio's own time, directly under the label it qualifies. */
.ap-studio-line { margin: 4px 0 0; font-size: var(--ap-font-size-xs); color: var(--ap-color-text-muted); }
/* A borderless floating layer in the card's own shadow recipe (D-R68), one step up (md) so it
   reads above a card that is itself sm — and it keeps its shadow when the card is set flat. */
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
/* Focus is the accent BORDER alone (founder 2026-10-02): no ring and no inset shadow inside a
   264px popover. The .ap prefix out-ranks the generic ".ap :focus-visible" outline rule. */
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
/* A very narrow column (QA N1): tracks may shrink below their content, digits never wrap, the
 * insets and the footer give way — nothing breaks out of the card down to ~200px. Last, so it
 * wins over the day, slot and 619.98px rules above. */
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

/* Payment (mockup paymentHTML). Method cards are labels wrapping a REAL radio —
 * platform grouping/arrow keys — so the dot is a sibling span and the 1px input
 * hands its focus ring to it. */
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
/* A gateway that owns the CTA has an attempt in flight: switching method there
 * releases a hold the gateway may be about to capture against (D-R40), so the
 * cards LOOK unavailable rather than only behaving that way. */
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

/* Summary. One .ap-summary-body serves both placements; only the .ap-aside-scoped
 * rules differ, and they change layout, never content. .ap-sum-title is an <h2> in
 * the sidebar (landmark name), so it must reset the UA heading metrics. */
.ap-sum-title { font-size: var(--ap-font-size-item); font-weight: var(--ap-font-weight-semibold);
  letter-spacing: var(--ap-letter-spacing-title); color: var(--ap-color-heading); line-height: var(--ap-line-height-title); margin: 0 0 16px; }
.ap-sum-svc, .ap-sum-start { font-size: var(--ap-font-size-control); font-weight: var(--ap-font-weight-medium); margin: 0 0 2px; }
.ap-sum-sub { font-size: var(--ap-font-size-sm); color: var(--ap-color-text-muted); margin: 0 0 16px; }
.ap-line { display: flex; align-items: baseline; gap: 5px; margin: 5px 0; font-size: var(--ap-font-size-sm); }
.ap-line .l { color: var(--ap-color-text-muted); white-space: nowrap; }
.ap-line .d { flex: 1; border-bottom: 1px dotted var(--ap-color-border-strong); transform: translateY(-3px); }
.ap-line .v { color: var(--ap-color-text); font-variant-numeric: tabular-nums; white-space: nowrap; text-align: end; }
/* Icon rows (location, specialist, date/time): icon in the soft tone, the name in full
 * text colour, its detail underneath in the muted tone (founder review 2026-09-30). */
.ap-sum-item { display: flex; align-items: flex-start; gap: 10px; margin: 0 0 12px; }
.ap .ap-sum-item > svg { width: 16px; height: 16px; margin-top: calc((var(--ap-font-size-sm) * 1.45 - 16px) / 2 + 1px); color: var(--ap-color-text-soft); }
.ap-sum-item .ap-sum-sub { margin: 0; min-width: 0; line-height: var(--ap-line-height-body); }
.ap-sum-item .k { color: var(--ap-color-text); font-weight: var(--ap-font-weight-medium); }
.ap-sum-when { flex: 1; min-width: 0; }
.ap-sum-when .ap-line { margin: 0; }
/* "Questions? Call …" — the foot of the summary. In the sidebar it pins to the column bottom
 * (the space the total used to take); in the accordion it closes the panel under a divider. */
.ap-sum-help { margin: 16px 0 0; padding-top: 16px; border-top: 1px solid var(--ap-color-border); font-size: var(--ap-font-size-sm); }
.ap-aside .ap-sum-help { margin-top: auto; }
/* margin-top:auto collapses to 0 when the column is short, so the block above keeps a floor
 * of its own below it. */
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
/* Nothing picked yet (D-R49, mockup .ap-compact-empty). */
.ap-sum-start + .ap-sum-empty { max-width: 22ch; margin: 2px 0 0; }
.ap-summary-body { min-height: 0; }
/* The price section: edition adjustment rows above the total, which keeps the
 * single divider. */
.ap-sum-sec { margin: 16px 0 0; }
.ap-sum-sec > .ap-sum-total:first-child { margin-top: 0; }
/* Sidebar only: item area scrolls; the total follows the items directly instead of
 * pinning to the column bottom (founder review 2026-09-30 — on the tall date step the
 * pinned total left a dead gap between the recap and its price). In the accordion the
 * same markup stays plain flow — the panel scrolls instead. */
.ap-aside .ap-summary-body { display: flex; flex: 1; flex-direction: column; min-height: 0; }
.ap-aside .ap-sum-scroll { min-height: 0; overflow-y: auto; overflow-wrap: anywhere; margin-inline-end: -5px; padding-inline-end: 5px; }
.ap-aside .ap-sum-sec { flex: 0 0 auto; }
/* The appointment's date/time line stacks in BOTH placements: the day, then the range,
 * then the zone caption — start-aligned, no dotted leader. At the 240–288px rail the
 * leader layout wrapped the range under a dangling leader (founder review 2026-09-30),
 * and the accordion now matches the sidebar's icon rows. overflow-y:auto also computes
 * overflow-x to auto, so nothing here may force a horizontal scroll. */
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

/* Forced colors (Windows High Contrast). The appearance:none opt-outs above trade
 * platform chrome for painted tokens — a background-color for the checked box, a
 * background-image for the tick and the chevron. Forced-colors mode overrides
 * author colors and drops background images, so those controls lose exactly the
 * paint that carried their state: a checked consent box reads as an empty square.
 * Hand them back to the platform, which paints an always-visible HC checkmark and
 * arrow, and drop the author decoration that would otherwise sit on top. */
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

export const SHADOW_CSS = TOKENS + COMPONENTS;

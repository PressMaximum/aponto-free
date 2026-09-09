/**
 * The Stripe panel's stylesheet, shipped inside the bundle.
 *
 * WHY A STRING AND NOT A `.css` FILE: `AdminPage::enqueueModuleBundles()` enqueues
 * `modules/{code}.js` and nothing else — there is no `wp_enqueue_style()` for a module bundle, so
 * `import './x.css'` would emit a stylesheet no page ever loads. One `<style>` element, appended
 * once, is the honest remaining option — the same call `assets/src/pro/calendar_google/styles.js`
 * makes.
 *
 * Everything is scoped under `.ap-admin .apst` and painted from the `--ap-*` semantic tokens
 * (`assets/src/admin/styles/aponto-tokens.css`), never from colour literals, so the panel follows
 * the Appearance accent AND the dark scheme exactly like every free screen.
 *
 * SPACING IS NOT HERE (founder, 2026-09-04). The panel shell, its sections, intros, field groups,
 * help lines and action rows come from the shared `.ap-module-panel*` classes the free-shipped
 * panel host owns (`admin-extra.css`), so all five module panels measure the same. What is left
 * below is genuinely module-specific: the derived mode banner, the endpoint field, the event list
 * and the test-result pill.
 *
 * NOTE FOR ANYONE EDITING THE CSS BELOW: it is a template literal, so it must contain no backtick
 * and no `${`. A class name written in backticks inside a CSS comment silently ENDS the string and
 * the rest is parsed as JavaScript.
 */

/** The element id, so a re-mount reuses the sheet instead of stacking copies. */
const STYLE_ID = 'aponto-payments-stripe-panel-css';

export const PANEL_CSS = `
.ap-admin .apst .components-button { gap: 6px; }
/* wp-components resolves its destructive tone from its OWN theme variables, which the dark scheme
   does not set — so "Clear" silently lost its red and read like any other action. */
.ap-admin .apst .components-button.is-destructive,
.ap-admin .apst .components-button.is-destructive:hover:not( :disabled ) { color: var( --ap-color-danger ); }

/* ---- The mode switch ----------------------------------------------------- */
/* Two large targets rather than a select: this is the control that decides whether real cards are
   charged, and a one-line dropdown makes the most consequential setting on the screen look like the
   least. They are a radiogroup with aria-checked because they ARE radios; they are buttons only so
   the whole tile is the hit area. */
.ap-admin .apst-modes {
	display: grid; grid-template-columns: repeat( auto-fit, minmax( 12rem, 1fr ) );
	gap: var( --ap-space-2 );
}
.ap-admin .apst-mode-option {
	display: flex; flex-direction: column; gap: 2px; text-align: start; cursor: pointer;
	padding: var( --ap-space-2 ) var( --ap-space-3 );
	border: 1px solid var( --ap-color-border-strong ); border-radius: var( --ap-radius-control );
	background: var( --ap-color-surface ); color: var( --ap-color-text );
	font: inherit;
}
.ap-admin .apst-mode-option:hover { border-color: var( --ap-color-accent ); }
.ap-admin .apst-mode-option:focus-visible {
	outline: 2px solid var( --ap-color-accent ); outline-offset: 2px;
}
/* The selected tile carries a ring AND a filled dot — colour is never the only carrier. */
.ap-admin .apst-mode-option.is-selected {
	border-color: var( --ap-color-accent );
	box-shadow: inset 0 0 0 1px var( --ap-color-accent );
	background: var( --ap-color-surface-muted );
}
.ap-admin .apst-mode-option__title {
	display: flex; align-items: center; gap: 6px;
	font-weight: var( --ap-font-weight-semibold );
}
.ap-admin .apst-mode-option__title::before {
	content: ""; flex: none; width: 10px; height: 10px; border-radius: 50%;
	border: 1px solid var( --ap-color-border-strong ); background: transparent;
}
.ap-admin .apst-mode-option.is-selected .apst-mode-option__title::before {
	border-color: var( --ap-color-accent ); background: var( --ap-color-accent );
}
.ap-admin .apst-mode-option__detail { color: var( --ap-color-text-muted ); font-size: var( --ap-font-size-meta ); }

/* The set-completeness line under the switch. Same shape as the test-connection result, because it
   answers the same kind of question — "is this working?" — one step earlier. */
.ap-admin .apst-status {
	display: flex; align-items: flex-start; gap: 6px; margin: 0;
	color: var( --ap-color-text ); font-size: var( --ap-font-size-meta ); line-height: var( --ap-line-height-body );
}

/* ---- Derived mode banner ------------------------------------------------ */
/* Test mode is the state worth interrupting for: money is NOT moving, and somebody who thinks it
   is will wait forever for a payout. Live mode is neutral chrome — it is the expected end state,
   and painting it green would celebrate a setting rather than report it. */
.ap-admin .apst-mode {
	display: flex; align-items: center; gap: var( --ap-space-2 ); flex-wrap: wrap;
	padding: var( --ap-space-2 ) var( --ap-space-3 );
	border: 1px solid var( --ap-color-border-strong ); border-radius: var( --ap-radius-control );
	background: var( --ap-color-surface-muted ); color: var( --ap-color-text );
	font-size: var( --ap-font-size-meta ); line-height: var( --ap-line-height-body );
}
.ap-admin .apst-mode strong { font-weight: var( --ap-font-weight-semibold ); }
/* The is-setup tone is the SERVER saying the gateway is not offered at checkout — the one state on
   this line that is a problem to fix rather than a mode to be aware of. */
.ap-admin .apst-mode.is-setup,
.ap-admin .apst-mode.is-test { border-color: var( --ap-color-warning ); }
/* The dot is a second, non-colour-dependent carrier beside the words. */
.ap-admin .apst-mode::before {
	content: ""; flex: none; width: 8px; height: 8px; border-radius: 50%;
	background: var( --ap-color-text-soft );
}
.ap-admin .apst-mode.is-setup::before,
.ap-admin .apst-mode.is-test::before { background: var( --ap-color-warning ); }

/* ---- The endpoint the owner has to copy --------------------------------- */
.ap-admin .apst-uri { display: flex; align-items: stretch; gap: var( --ap-space-2 ); flex-wrap: wrap; }
.ap-admin .apst-uri code {
	flex: 1 1 22rem; min-width: 0; overflow-x: auto; white-space: nowrap;
	padding: 8px 10px; border-radius: var( --ap-radius-control );
	border: 1px solid var( --ap-color-border-strong ); background: var( --ap-color-surface-muted );
	color: var( --ap-color-text ); font-size: 12px; line-height: 20px; direction: ltr;
}

/* ---- Event list --------------------------------------------------------- */
/* A list, not a sentence: these get copied into Stripe one at a time. */
.ap-admin .apst-events { display: flex; flex-wrap: wrap; gap: var( --ap-space-2 ); margin: 0; padding: 0; list-style: none; }
.ap-admin .apst-events li { margin: 0; }
.ap-admin .apst-events code {
	display: inline-block; padding: 3px 8px; border-radius: var( --ap-radius-control );
	border: 1px solid var( --ap-color-border ); background: var( --ap-color-surface-muted );
	color: var( --ap-color-text ); font-size: 12px; line-height: 18px; direction: ltr;
}

/* ---- Local-development disclosure --------------------------------------- */
.ap-admin .apst-details summary {
	cursor: pointer; color: var( --ap-color-text-muted );
	font-size: var( --ap-font-size-meta ); line-height: var( --ap-line-height-body );
}
.ap-admin .apst-details summary:focus-visible {
	outline: 2px solid var( --ap-color-accent ); outline-offset: 2px; border-radius: var( --ap-radius-control );
}
.ap-admin .apst-details[ open ] summary { margin-block-end: var( --ap-space-2 ); }
.ap-admin .apst-pre {
	margin: 0; overflow-x: auto; padding: 8px 10px;
	border: 1px solid var( --ap-color-border-strong ); border-radius: var( --ap-radius-control );
	background: var( --ap-color-surface-muted ); color: var( --ap-color-text );
	font-size: 12px; line-height: 20px; direction: ltr; white-space: pre;
}

/* ---- Status pill (saved secrets, test result) --------------------------- */
/* Status is a word plus a dot, not a colour alone — colour is never the only carrier of meaning. */
.ap-admin .apst-pill {
	display: inline-flex; align-items: center; gap: 6px;
	font-size: 12px; font-weight: 600; color: var( --ap-color-text-muted );
}
.ap-admin .apst-pill::before { content: ""; flex: none; width: 8px; height: 8px; border-radius: 50%; background: var( --ap-color-text-soft ); }
.ap-admin .apst-pill.is-ok::before { background: var( --ap-color-success ); }
.ap-admin .apst-pill.is-warn::before { background: var( --ap-color-warning ); }
.ap-admin .apst-pill.is-error::before { background: var( --ap-color-danger ); }
.ap-admin .apst-pill.is-ok { color: var( --ap-color-text ); }
.ap-admin .apst-result { display: flex; align-items: flex-start; gap: 6px; margin: 0; color: var( --ap-color-text ); font-size: var( --ap-font-size-meta ); line-height: var( --ap-line-height-body ); }
`;

/** Append the sheet once per document. */
export function ensurePanelStyles() {
	if ( typeof document === 'undefined' || document.getElementById( STYLE_ID ) ) {
		return;
	}
	const style = document.createElement( 'style' );
	style.id = STYLE_ID;
	style.textContent = PANEL_CSS;
	document.head.appendChild( style );
}

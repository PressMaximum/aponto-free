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
export function ensureMultiSelectPopoverStyles() {
	if (
		typeof document === 'undefined' ||
		document.getElementById( STYLE_ID )
	) {
		return;
	}

	const style = document.createElement( 'style' );
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
	document.head.appendChild( style );
}

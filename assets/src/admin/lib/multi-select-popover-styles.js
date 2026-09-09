const STYLE_ID = 'aponto-multi-select-popover-styles';

/** Load the shared selector styles in every independently built admin entry. */
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
.ap-admin .ap-multiselect__trigger.components-button{display:flex;width:100%;min-height:40px;height:auto;justify-content:space-between;gap:12px;padding:7px 10px;border-color:#8c8f94;background:#fff;color:#1d2327;text-align:left;box-shadow:none}
.ap-admin .ap-multiselect__trigger.components-button:hover{border-color:#2271b1;color:#1d2327}
.ap-admin .ap-multiselect__trigger.components-button:focus-visible{border-color:#2271b1;box-shadow:0 0 0 1px #2271b1}
.ap-admin .ap-multiselect__trigger .is-placeholder{color:#646970}
.ap-admin .ap-multiselect__chevron{width:12px;height:12px;flex:none;margin-right:1px;fill:none;stroke:#1d2327;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.ap-admin .ap-multiselect__help,.ap-admin .ap-multiselect__error{margin:0;font-size:12px;line-height:1.45}
.ap-admin .ap-multiselect__help{color:#646970}.ap-admin .ap-multiselect__error{color:#b32d2e}
.ap-admin .ap-multiselect.has-error .ap-multiselect__trigger.components-button{border-color:#b32d2e}
.ap-multiselect-popover.components-popover{z-index:100001}
.ap-multiselect-popover .components-popover__content{width:min(380px,calc(100vw - 32px));padding:0;border:1px solid #c3c4c7;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,.16);overflow:hidden;background:#fff}
.ap-multiselect-popover__inner{max-height:min(420px,calc(100vh - 48px));overflow-y:auto;overscroll-behavior:contain;color:#1d2327;background:#fff}
.ap-multiselect-popover__header{position:sticky;z-index:2;top:0;border-bottom:1px solid #eee;background:#fff}
.ap-multiselect-popover__search{display:block;width:calc(100% - 24px);min-height:40px;margin:12px;border:1px solid #8c8f94;border-radius:4px;padding:6px 10px;box-sizing:border-box}
.ap-multiselect-popover__search:focus{border-color:#2271b1;box-shadow:0 0 0 1px #2271b1;outline:2px solid transparent}
.ap-multiselect-popover__toolbar{display:flex;min-height:34px;align-items:center;justify-content:space-between;gap:12px;padding:0 12px 8px;color:#646970;font-size:12px}
.ap-multiselect-popover__toolbar .components-button{height:auto;min-height:0;padding:0}
.ap-multiselect-popover__list{padding:5px}
.ap-multiselect-popover__item{min-height:40px;display:grid;grid-template-columns:18px minmax(0,1fr);gap:9px;align-items:center;padding:0 9px;border-radius:0;color:#1d2327;cursor:pointer}
.ap-multiselect-popover__item:hover{background:#f0f0f1}
.ap-multiselect-popover__item.is-selected{background:var(--wp-admin-theme-color,#3858e9);color:#fff}
.ap-multiselect-popover__item.is-selected:hover{background:var(--wp-admin-theme-color-darker-10,#2145e6)}
.ap-multiselect-popover__item>input{position:absolute;width:1px;height:1px;overflow:hidden;opacity:0}
.ap-multiselect-popover__checkbox{width:17px;height:17px;display:grid;place-items:center;border:1px solid #8c8f94;border-radius:3px;background:#fff;color:transparent;box-sizing:border-box}
.ap-multiselect-popover__checkbox svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.ap-multiselect-popover__item.is-selected .ap-multiselect-popover__checkbox{border-color:#fff;color:var(--wp-admin-theme-color,#3858e9)}
.ap-multiselect-popover__item>input:focus-visible+.ap-multiselect-popover__checkbox{outline:2px solid var(--wp-admin-theme-color,#3858e9);outline-offset:2px}
.ap-multiselect-popover__item.is-selected>input:focus-visible+.ap-multiselect-popover__checkbox{outline-color:#fff}
.ap-multiselect-popover__item-label{overflow:hidden;text-overflow:ellipsis;font-weight:550;white-space:nowrap}
.ap-multiselect-popover__state{display:flex;min-height:52px;align-items:center;justify-content:center;gap:8px;margin:0;padding:12px;color:#646970;text-align:center}
.ap-multiselect-popover__state .components-spinner{margin:0}.ap-multiselect-popover__state.is-error{color:#b32d2e}
.ap-multiselect-popover__state.is-error .components-button{height:auto;min-height:0;padding:0}
.ap-multiselect-popover__more{margin:0;padding:8px 12px;border-top:1px solid #eee;color:#646970;font-size:12px;line-height:1.4}
`;
	document.head.appendChild( style );
}

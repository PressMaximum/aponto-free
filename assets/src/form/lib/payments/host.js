/**
 * Light-DOM plumbing every gateway adapter shares (spike §"Implementation notes").
 *
 * Separate from `lib/payments.js` so an adapter can reach these helpers without
 * importing the registry that imports the adapter.
 */

/**
 * The `<slot>` name one gateway projects through.
 *
 * The `ap-` prefix is load-bearing: {@link SHIELD_CSS} targets `[slot^="ap-"]`,
 * and zoid-style gateways that rename the slot themselves land under the
 * `shadow-slot-` prefix the same rule covers.
 *
 * @param {string} code Payment module code.
 * @return {string} Slot name.
 */
export function slotName( code ) {
	return 'ap-' + String( code || '' ).replace( /^payments_/, '' );
}

/** Id of the single light-DOM shield element. */
export const SHIELD_ID = 'aponto-payment-shield';

/**
 * The light-DOM shield (spike §"Implementation notes" #4).
 *
 * The gateway's box lives in the LIGHT DOM — that is the whole point of the slot
 * projection — so the site's theme CAN style it, and a hostile
 * `iframe{border:5px solid lime;font-size:30px}` measurably pushed the gateway
 * 10px past the widget's own edge. Scoped as tightly as it can be (only inside a
 * widget host, only on a slotted gateway container) so it neutralises that reach
 * without touching anything else on the page.
 */
const SHIELD_CSS =
	'[data-aponto-form] > [slot^="ap-"] iframe,' +
	'[data-aponto-form] > [slot^="shadow-slot-"] iframe' +
	'{border:0!important;font-size:medium!important;max-width:100%!important}' +
	'[data-aponto-form] > [slot^="ap-"],' +
	'[data-aponto-form] > [slot^="shadow-slot-"]' +
	'{box-sizing:border-box!important;margin:0!important;padding:0!important;width:100%}';

/**
 * Inject the shield once per document, immediately before the first gateway
 * mounts. Idempotent: a second widget, or a second method, reuses the element.
 *
 * @param {Document} doc Document owning the widget host.
 */
export function injectShield( doc ) {
	const d = doc || ( typeof document !== 'undefined' ? document : null );
	if ( ! d || ! d.head || d.getElementById( SHIELD_ID ) ) {
		return;
	}
	const style = d.createElement( 'style' );
	style.id = SHIELD_ID;
	style.textContent = SHIELD_CSS;
	d.head.appendChild( style );
}

/**
 * Create the light-DOM holder one gateway mounts into, as a direct child of the
 * widget host so the shield's child combinator matches it.
 *
 * @param {HTMLElement} host Widget host (`[data-aponto-form]`).
 * @param {string}      slot Slot name.
 * @return {HTMLElement} The holder.
 */
export function createHolder( host, slot ) {
	const doc = host.ownerDocument || document;
	injectShield( doc );
	const holder = doc.createElement( 'div' );
	holder.setAttribute( 'slot', slot );
	host.appendChild( holder );
	return holder;
}

/**
 * Resolve a `--ap-*` token to the value the browser actually computed.
 *
 * `getComputedStyle(el).getPropertyValue('--ap-color-border')` returns the token's
 * DECLARATION, not its value — for this stylesheet that is a literal
 * `color-mix(in srgb, …)` string. Gateways silently ignore a value they cannot
 * parse (measured: Stripe accepts the raw string, stays ready, and applies
 * nothing), so an unresolved token is a theming bug with no error attached to it.
 * Assigning the var to a REAL property on a throwaway probe inside the widget's
 * own scope, then reading that property back, is what forces the computation.
 *
 * @param {HTMLElement} scope Element whose custom-property scope to read (`.ap-wrap`).
 * @param {string}      name  Custom property name, e.g. `--ap-color-accent`.
 * @param {string}      prop  A real property to resolve it through, e.g. `color`.
 * @return {string} Computed value, or '' when it cannot be resolved.
 */
export function resolveToken( scope, name, prop ) {
	const doc = scope && scope.ownerDocument ? scope.ownerDocument : null;
	const win = doc ? doc.defaultView : null;
	if ( ! win || typeof win.getComputedStyle !== 'function' ) {
		return '';
	}
	const probe = doc.createElement( 'span' );
	probe.setAttribute( 'aria-hidden', 'true' );
	probe.style.cssText =
		'position:absolute;left:-9999px;top:0;' + prop + ':var(' + name + ')';
	scope.appendChild( probe );
	let out = '';
	try {
		out = String(
			win.getComputedStyle( probe ).getPropertyValue( prop ) || ''
		).trim();
	} catch {
		out = '';
	}
	probe.remove();
	return out;
}

/**
 * The font family the widget itself resolved to.
 *
 * `.ap-wrap` sets `font-family: inherit` on purpose so the widget blends with the
 * theme — which means the gateway has to be TOLD the resulting family, and that a
 * theme changing its font after mount needs an `update({appearance})` rather than
 * fixing itself.
 *
 * @param {HTMLElement} scope `.ap-wrap`.
 * @return {string} Computed font-family, or ''.
 */
export function computedFontFamily( scope ) {
	const doc = scope && scope.ownerDocument ? scope.ownerDocument : null;
	const win = doc ? doc.defaultView : null;
	if ( ! win || typeof win.getComputedStyle !== 'function' ) {
		return '';
	}
	try {
		return String(
			win.getComputedStyle( scope ).getPropertyValue( 'font-family' ) ||
				''
		).trim();
	} catch {
		return '';
	}
}

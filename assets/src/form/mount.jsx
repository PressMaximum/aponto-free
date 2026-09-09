/** @jsxImportSource preact */
/**
 * Mount the Preact booking widget into an OPEN ShadowRoot on a host element,
 * following the validated spike pattern (SPEC-P1 §2.1 / spikes/shadow-dom).
 *
 * All CSS is injected into the shadow so no host-theme rule reaches in and
 * nothing leaks out — except the one stylesheet that CANNOT be (`lib/payments/
 * host.js`'s light-DOM shield), because the node it protects is a payment
 * gateway's mount holder, which lives in the light DOM by necessity and is
 * injected lazily when a gateway first mounts. Appearance block attributes (accent/radius — Q11) are set as
 * inline custom properties on the HOST element; because inline styles beat the
 * shadow's `:host` defaults, a per-block accent wins and every derived token
 * recomputes from it — no remount needed for a live token change.
 */
import { render } from 'preact';
import { App } from './app.jsx';
import { SHADOW_CSS } from './styles.js';
import {
	readGlobalConfig,
	parseProps,
	resolveConfig,
} from './lib/config.js';
import {
	resolveAppearanceVars,
	resolveColorScheme,
} from './lib/appearance.js';

/**
 * Mount the widget onto a single host element (idempotent per host).
 *
 * @param {HTMLElement} hostEl Element carrying `data-aponto-form`.
 */
export function mountWidget( hostEl ) {
	if ( ! hostEl || hostEl.__apMounted ) {
		return;
	}
	hostEl.__apMounted = true;

	const props = parseProps( hostEl.getAttribute( 'data-props' ) );
	const config = resolveConfig( readGlobalConfig( window ), props );

	// Appearance → inline custom properties on the host (override :host defaults).
	const vars = resolveAppearanceVars( config.appearance );
	Object.keys( vars ).forEach( ( name ) => {
		hostEl.style.setProperty( name, vars[ name ] );
	} );

	// Color scheme → host attribute, which selects the shadow stylesheet's opt-in
	// dark preset. Always written (even for the `light` default) so the resolved
	// scheme is visible in the DOM and never inferred from the OS by accident.
	hostEl.setAttribute(
		'data-ap-color-scheme',
		resolveColorScheme( config.appearance )
	);

	const shadow = hostEl.attachShadow( { mode: 'open' } );
	injectCss( shadow, SHADOW_CSS );

	const mountPoint = ( shadow.ownerDocument || document ).createElement( 'div' );
	shadow.appendChild( mountPoint );

	render( <App config={ config } />, mountPoint );
}

/**
 * Inject CSS into a shadow root, preferring a constructable stylesheet built in
 * the shadow's own document (works inside the block-editor iframe too) and
 * falling back to a `<style>` element.
 *
 * @param {ShadowRoot} shadow Shadow root.
 * @param {string} cssText CSS.
 */
function injectCss( shadow, cssText ) {
	const doc = shadow.ownerDocument || document;
	const win = doc.defaultView || window;
	try {
		if ( win.CSSStyleSheet && 'adoptedStyleSheets' in doc ) {
			const sheet = new win.CSSStyleSheet();
			sheet.replaceSync( cssText );
			shadow.adoptedStyleSheets = [ ...shadow.adoptedStyleSheets, sheet ];
			return;
		}
	} catch ( e ) {
		// Fall through to a <style> element.
	}
	const style = doc.createElement( 'style' );
	style.textContent = cssText;
	shadow.appendChild( style );
}

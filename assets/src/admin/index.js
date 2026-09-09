/**
 * Aponto admin app entry (SPEC-P1 §1.0). Mounts the React shell into the WP page
 * root and imports the style stack in cascade order:
 *   1. aponto tokens (--ap-* engine, scoped .ap-token-scope on the root)
 *   2. dashboard-kit tokens + app theme (--pmdk-* base, .pmdk-theme-app)
 *   3. aponto→kit bridge (.ap-admin maps --ap-* → --pmdk-*)
 *   4. dashboard-kit primitives (.pmdk-dashboard .pmdk-* chrome — data-table,
 *      buttons, fields, popovers; the PMDKDataTable consumer surface). Named
 *      `style.css` so wp-scripts extracts it into the `style-admin.css` chunk
 *      that loads before `admin.css`, keeping product `.ap-*`/`.pd-*` overrides
 *      layered on top (B4b, Q13).
 *   5. Event Calendar base CSS
 *   6. reproduced mockup product chrome (.ap-admin .pd-*)
 *   7. calendar (EC restyle) + admin extras/new .ap-* daily surface
 *   8. dark-scheme bridge — `@wordpress/components` hard-codes light surfaces and
 *      a few kit tokens resolve in the `:root` cascade, so the dark scheme
 *      re-points both at `--ap-*` roles. Last, because it must also outrank the
 *      runtime emotion classes.
 *
 * The B3 Notifications app ships in the SETTINGS CHUNK, not in this bundle: inside
 * the SPA it renders as the Settings → Notifications tab (routes/SettingsRoute.jsx),
 * and the legacy standalone mount (`aponto-notifications-app`) — kept as a fallback
 * for any page that still prints that node — loads the same chunk on demand.
 */
import './styles/aponto-tokens.css';
import '@pressmaximum/dashboard-kit/style.css';
import '@pressmaximum/dashboard-kit/themes/app.css';
import '@pressmaximum/dashboard-kit/primitives/style.css';
import './styles/aponto-admin-bridge.css';
import '@event-calendar/core/index.css';
import './styles/plugin-dashboard.css';
import './styles/calendar.css';
import './styles/admin-extra.css';
import './styles/dark-scheme-bridge.css';

// Publishes `window.apontoAdmin.registerModuleSettingsPanel` for separately enqueued
// module bundles (D-R27). Imported for its side effect at BUNDLE load, not at mount:
// a module bundle runs as soon as its script tag executes, which is before the SPA
// has rendered anything, so the registration API has to exist by then.
import './lib/module-panels.js';

import { createRoot, createElement } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { App } from './App.jsx';
import { ToastProvider } from './lib/toast.jsx';

function boot() {
	const root = document.getElementById( 'aponto-admin-root' );
	if ( root ) {
		root.textContent = '';
		createRoot( root ).render( createElement( ToastProvider, null, createElement( App ) ) );
		return;
	}

	// Legacy standalone Notifications mount (B3) — only when the SPA root is absent. The app
	// itself lives in the settings chunk (it is the Settings → Notifications tab), so this
	// fallback pulls that chunk instead of keeping the whole editor in the entry bundle.
	const bootData = window.apontoAdmin || {};
	const node = document.getElementById( bootData.mount || 'aponto-notifications-app' );
	if ( node ) {
		import( /* webpackChunkName: "admin-chunk-settings" */ './notifications/NotificationsApp' )
			.then( ( module ) => createRoot( node ).render( createElement( module.default ) ) )
			// No React tree exists yet on this path, so there is no boundary to catch a failed
			// chunk — say so in the mount node rather than leaving the page silently empty.
			.catch( () => {
				node.textContent = __( 'This part of the dashboard could not be loaded. Reload the page to try again.', 'aponto' );
			} );
	}
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', boot );
} else {
	boot();
}

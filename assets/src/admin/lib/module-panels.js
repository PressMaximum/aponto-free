/**
 * Module settings-panel registry — the admin SPA's extension point for separately
 * enqueued module bundles (D-R27, extension-surface §3.3).
 *
 * A module's settings UI is its OWN webpack entry (`assets/src/pro/{code}/index.js`
 * → `assets/dist/{edition}/pro/{code}.js`), enqueued by
 * `Admin\AdminPage::enqueueModuleBundles()` with a dependency on the `aponto-admin`
 * handle. Two separate bundles cannot `import` from each other, so they meet on a
 * stable global — the same shape WordPress's own plugin API has: core publishes the
 * registration function, extensions call it.
 *
 * This file is FREE-SHIPPED and generic on purpose. It knows about no module, no
 * edition and no entitlement: it is a keyed store of React components. What may be
 * rendered is decided by `ModuleSettingsRoute`, from the boot-data `available` flag
 * the server computed with `Plan::has()` — and enforcement itself lives in REST
 * (§5 invariant 3, UI gating is display-only).
 *
 * CONTRACT for a module bundle:
 *
 *     window.apontoAdmin.registerModuleSettingsPanel( 'calendar_google', Panel );
 *
 * `Panel` is a component rendered as `<Panel module={ record } />`, where `record`
 * is the module's boot-data entry. It must use the SAME React instance as the SPA,
 * which the shared `wp.element` webpack externals guarantee for every entry.
 *
 * LOAD ORDER is tolerated in both directions. The enqueue dependency means the SPA
 * evaluates first in practice, but nothing here depends on that: `publish()` is
 * idempotent, and a component dropped into `window.apontoAdmin.moduleSettingsPanels`
 * before the SPA loaded is adopted rather than lost.
 */

/** Stable global namespace, the object `AdminPage::bootConfig()` already injects. */
const GLOBAL_KEY = 'apontoAdmin';

/** Property on that object holding the plain-object panel mirror (also the pre-boot drop box). */
const PANELS_KEY = 'moduleSettingsPanels';

/**
 * Authoritative store. A module-scoped Map rather than the global itself, so a later
 * reassignment of `window.apontoAdmin` cannot silently empty the registry the running
 * SPA reads from.
 *
 * @type {Map<string, Function>}
 */
const panels = new Map();

/** The global object to publish onto, or null when there is none (SSR / node tests). */
function host() {
	if ( typeof window !== 'undefined' ) {
		return window;
	}
	return typeof globalThis !== 'undefined' ? globalThis : null;
}

/** A module code is the registry's own shape — the same one REST's route regex accepts. */
function isCode( code ) {
	return typeof code === 'string' && /^[a-z0-9_]+$/.test( code );
}

/**
 * Publish the registration API onto the global, adopting anything a bundle already
 * dropped there. Idempotent: safe to call on every import and after any load order.
 *
 * @return {Object|null} The global namespace object, or null when there is no global.
 */
function publish() {
	const scope = host();
	if ( ! scope ) {
		return null;
	}
	if ( ! scope[ GLOBAL_KEY ] || typeof scope[ GLOBAL_KEY ] !== 'object' ) {
		scope[ GLOBAL_KEY ] = {};
	}
	const namespace = scope[ GLOBAL_KEY ];

	// Adopt a pre-boot drop box: a bundle that ran before this module was evaluated can
	// only have written the plain object, never called the (not yet published) function.
	const mirror = namespace[ PANELS_KEY ];
	if ( mirror && typeof mirror === 'object' ) {
		Object.keys( mirror ).forEach( ( code ) => {
			if ( isCode( code ) && typeof mirror[ code ] === 'function' && ! panels.has( code ) ) {
				panels.set( code, mirror[ code ] );
			}
		} );
	} else {
		namespace[ PANELS_KEY ] = {};
	}

	namespace.registerModuleSettingsPanel = registerModuleSettingsPanel;
	namespace.getModuleSettingsPanel = getModuleSettingsPanel;

	return namespace;
}

/**
 * Register a module's settings panel component.
 *
 * A later registration for the same code REPLACES the earlier one: a page carries at
 * most one bundle per module, so a second call means a reload, not a second panel.
 *
 * @param {string}   code      Registry module code (`[a-z0-9_]+`).
 * @param {Function} component React component rendered as `<component module={record} />`.
 * @return {boolean} Whether the panel was accepted.
 */
export function registerModuleSettingsPanel( code, component ) {
	if ( ! isCode( code ) || typeof component !== 'function' ) {
		return false;
	}
	panels.set( code, component );

	const namespace = publish();
	if ( namespace && namespace[ PANELS_KEY ] && typeof namespace[ PANELS_KEY ] === 'object' ) {
		namespace[ PANELS_KEY ][ code ] = component;
	}

	return true;
}

/**
 * The panel registered for a module code, or null when none is loaded.
 *
 * `null` is a NORMAL answer, not an error: an available module whose bundle is missing
 * (not built, not enqueued, failed to load) must render a neutral notice rather than a
 * blank screen — see `modules/ModuleSettingsRoute.jsx`.
 *
 * @param {string} code Registry module code.
 * @return {Function|null} Panel component, or null.
 */
export function getModuleSettingsPanel( code ) {
	if ( ! isCode( code ) ) {
		return null;
	}
	if ( panels.has( code ) ) {
		return panels.get( code );
	}

	// A bundle may have written the mirror directly before the API was published.
	const scope = host();
	const mirror = scope?.[ GLOBAL_KEY ]?.[ PANELS_KEY ];
	const candidate = mirror && typeof mirror === 'object' ? mirror[ code ] : null;

	return typeof candidate === 'function' ? candidate : null;
}

/** Drop every registered panel. Test seam only. */
export function resetModuleSettingsPanels() {
	panels.clear();
	const scope = host();
	if ( scope?.[ GLOBAL_KEY ] && typeof scope[ GLOBAL_KEY ] === 'object' ) {
		scope[ GLOBAL_KEY ][ PANELS_KEY ] = {};
	}
}

publish();

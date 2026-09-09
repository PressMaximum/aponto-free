/**
 * Stripe payments — the module's admin panel entry (D-R37 pipeline, D-R39 module).
 *
 * The whole contract between the module and the SPA: hand ONE component to the free-shipped panel
 * registry under the module's registry code, and let the panel host
 * (`admin/modules/ModuleSettingsRoute.jsx`) decide whether to render it. Registration is not
 * entitlement — the host only reaches this panel for a module the server reported `available`
 * (`Plan::has()`), and REST re-checks on every read and write.
 *
 * Registration goes through the GLOBAL, not an import of `lib/module-panels.js`: two webpack
 * entries cannot share a module instance, so importing it would bundle a second registry and leave
 * the two talking past each other. Load order is tolerated in both directions.
 *
 * THE `modules/` SHAPE, NOT `pro/` (D-R37). `payments_stripe` is `edition: free` (D-R22), and the
 * Free zip physically excludes `assets/src/pro/**` — a panel there could not exist in the only
 * build a Free site runs. This entry is therefore built in BOTH plans and enqueued by
 * `AdminPage::enqueueModuleBundles()`, which resolves the directory from the registry.
 */

import PaymentsStripePanel from './PaymentsStripePanel.jsx';

const MODULE_CODE = 'payments_stripe';

const namespace = ( window.apontoAdmin = window.apontoAdmin || {} );

if ( typeof namespace.registerModuleSettingsPanel === 'function' ) {
	namespace.registerModuleSettingsPanel( MODULE_CODE, PaymentsStripePanel );
} else {
	// Pre-boot drop box: the registry adopts anything already sitting here when it publishes.
	namespace.moduleSettingsPanels = namespace.moduleSettingsPanels || {};
	namespace.moduleSettingsPanels[ MODULE_CODE ] = PaymentsStripePanel;
}

export default PaymentsStripePanel;

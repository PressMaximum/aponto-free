/**
 * One module's settings surface — the `#modules/{code}` route (D-R27).
 *
 * The catalog at `#modules` stays read-only; this is where an AVAILABLE module that
 * declares `has_settings` renders the panel its own bundle registered
 * (`lib/module-panels.js`). The route itself is free-shipped and completely generic:
 * it names no module, and it decides what to render from boot data plus the panel
 * registry, never from an edition comparison.
 *
 * Four states, in resolution order:
 *
 *   1. UNKNOWN code            → the not-found card. Same answer as a code that is not
 *                                in the registry at all, so the hash cannot be used to
 *                                enumerate what exists.
 *   2. NOT AVAILABLE           → the same card, plus the compare link for a Premium
 *                                module. This mirrors the locked catalog card exactly:
 *                                a module the site does not own has one honest action,
 *                                and it is the pricing page (§6 + Guideline 5/11).
 *   3. AVAILABLE, no panel     → a neutral notice. An available module whose bundle did
 *      loaded                    not load (not built, not enqueued, failed) must say so
 *                                plainly rather than render an empty screen or, worse,
 *                                fake controls.
 *   4. AVAILABLE + panel       → the module's own panel, handed its boot-data record.
 *
 * A module with no settings surface (`has_settings: false`) resolves as (1): the
 * registry says it owns no settings resource, and REST answers the same uniform 404 for
 * `/modules/{code}/settings` (`ModulesController::schemaFor()`). One truth, two surfaces.
 *
 * Display only, as always: REST re-checks `Plan::has()` on every read and write
 * (§5 invariant 3).
 *
 * STALENESS IS EXPECTED HERE, and it is the panel's job to survive it. Boot data is a snapshot
 * taken when the page loaded; a module can be switched off afterwards — from another tab, by
 * another admin, or by a deploy — while this panel stays mounted. The server stops serving that
 * module's routes the moment its provider stops booting, so the panel's own fetches begin failing
 * with WordPress's `rest_no_route` (404) rather than an Aponto error code.
 *
 * PANEL CONTRACT (owned by each `assets/src/pro/{code}` bundle, not by this route): a
 * `rest_no_route` failure must be mapped to friendly copy along the lines of "this module is no
 * longer active — reload the page", NEVER surfaced raw. "No route was found matching the URL and
 * request method" is a framework string; showing it to a site owner reads as a broken plugin when
 * the truth is a setting they (or a colleague) just changed. The route cannot do this centrally
 * because it does not make the panel's requests — it only decides whether to mount one.
 */
import { __, sprintf } from '@wordpress/i18n';

import { config } from '../lib/config.js';
import { renderIcon } from '../lib/icon.jsx';
import { getModuleSettingsPanel } from '../lib/module-panels.js';
import { ModulesSubnav } from './ModulesSubnav.jsx';
import { useModules } from './module-state.js';
import { CATEGORY_META, MODULE_META, findModuleRecord, upgradeUrl } from './catalog.js';

/**
 * The shared page shell: a breadcrumb heading, the module's one-line description, then the
 * section subnav, then the page body — in that order, on EVERY state and every module.
 *
 * The heading is the app's existing record-editor pattern, reused VERBATIM from
 * `routes/ServiceEditor.jsx` ("Services › New service"): `.pd-record-editor-head` with an
 * `h1` of parent button + chevron + current label. Reused rather than re-styled so the panel
 * route inherits the exact type scale, hover underline and chevron sizing the editors already
 * have — the CSS keys on `h1 button`, which is also why the crumb is a BUTTON and not an
 * anchor.
 *
 * The DESCRIPTION (founder, 2026-09-04) is the same sentence the module's catalog card
 * carries, read from the one source both surfaces share (`MODULE_META` in `catalog.js`) —
 * a panel never writes a second copy of its own summary, so the card and the panel cannot
 * say different things. It renders in the position and with the class the Modules screen's
 * own description uses (`.pd-page-description`, styled once in plugin-dashboard.css beside
 * `.pd-page-header p`), which is what keeps the two surfaces identical.
 *
 * THE HOST OWNS THE RHYTHM. Head → description → subnav → body spacing lives here and in
 * `.ap-module-panel` (admin-extra.css), never in a module's own bundle: four panels each
 * choosing their own top margin is exactly how they drifted apart before.
 *
 * The route owns the ONE `h1` on the page, so a module panel renders its own sections and
 * `h2`s and never a second page title.
 *
 * @param {{code: string, label: string, description?: string, onNavigate: Function, children: any}} props Shell props.
 */
function ModulePage( { code, label, description, onNavigate, children } ) {
	return (
		<div className="pd-page pd-record-editor-page ap-module-settings">
			<header className="pd-record-editor-head">
				<div className="pd-record-editor-title">
					<h1>
						<button type="button" onClick={ () => onNavigate( 'modules' ) }>
							{ __( 'Modules', 'aponto' ) }
						</button>
						<span aria-hidden="true">{ renderIcon( 'chevron' ) }</span>
						<strong>{ label }</strong>
					</h1>
					{ description ? <p className="pd-page-description">{ description }</p> : null }
				</div>
			</header>
			{ /* The breadcrumb says where you ARE and gets you back up; the subnav moves you
			     ACROSS to the section's other surfaces. They complement rather than repeat. */ }
			<ModulesSubnav current={ code } />
			{ children }
		</div>
	);
}

/**
 * Not-found / locked presentation. `upsell` adds the per-placement compare link — the
 * SAME `modules-{code}` placement the locked catalog card carries, so the two surfaces
 * report as one placement rather than inventing a second.
 *
 * No heading of its own: the page's breadcrumb `h1` already names the module, and repeating
 * it here read as the title twice once the breadcrumb landed.
 */
function ModuleUnavailable( { code, icon, upsell, onNavigate } ) {
	return (
		<section className="pd-card pd-placeholder">
			<div className="pd-placeholder-inner">
				<span className="pd-placeholder-icon">{ renderIcon( icon ) }</span>
				<p>
					{ upsell
						? __( 'This module is part of Aponto Premium. It is not available on this site yet.', 'aponto' )
						: __( 'This module is not available on this site.', 'aponto' ) }
				</p>
				{ upsell ? (
					<a
						className="pd-button"
						href={ upgradeUrl( `modules-${ code }` ) }
						target="_blank"
						rel="noreferrer noopener"
					>
						{ __( 'Compare plans', 'aponto' ) }
					</a>
				) : null }
				<button className="pd-button is-ghost" type="button" onClick={ () => onNavigate( 'modules' ) }>
					{ __( 'Back to Modules', 'aponto' ) }
				</button>
			</div>
		</section>
	);
}

/**
 * The `#modules/{code}` route.
 *
 * @param {{code: string, onNavigate: Function}} props Route props.
 */
export function ModuleSettingsRoute( { code, onNavigate } ) {
	// SESSION store, not the boot snapshot: a module disabled from the catalog moments ago
	// must gate this route NOW, or it mounts a panel whose REST routes the server has
	// already stopped serving — the raw `rest_no_route` banner this fix removes.
	const mod = findModuleRecord( { modules: useModules() }, code );
	const meta = MODULE_META[ code ] || {};
	const category = CATEGORY_META[ mod?.category ] || {};
	const label = meta.label || code;
	// The catalog card's own sentence — one source, two surfaces (see `ModulePage`).
	const description = meta.description || '';
	const icon = meta.icon || category.icon || 'cube';

	// (1) + (2): unknown, settings-less, or not owned by this site.
	if ( ! mod || mod.available !== true || mod.has_settings !== true ) {
		return (
			<ModulePage code={ code } label={ label } description={ description } onNavigate={ onNavigate }>
				<ModuleUnavailable
					code={ code }
					icon={ icon }
					// Same rule as the catalog cards (founder, 2026-08-28): a site that already
					// has Premium is never shown a pricing link. Without the `planEdition` term
					// this route contradicted the card it was reached from.
					upsell={ mod?.edition === 'premium' && config.planEdition !== 'premium' }
					onNavigate={ onNavigate }
				/>
			</ModulePage>
		);
	}

	const Panel = getModuleSettingsPanel( code );

	// (3): available, but the module's bundle registered nothing.
	if ( ! Panel ) {
		return (
			<ModulePage code={ code } label={ label } description={ description } onNavigate={ onNavigate }>
				<section className="pd-card pd-placeholder">
					<div className="pd-placeholder-inner">
						<span className="pd-placeholder-icon">{ renderIcon( icon ) }</span>
						<h2>{ __( 'This module has no settings UI loaded', 'aponto' ) }</h2>
						<p>
							{ sprintf(
								/* translators: %s: module name, e.g. "Google Calendar". */
								__(
									'%s is active, but its settings screen did not load. Rebuild the plugin assets or reload the page.',
									'aponto'
								),
								label
							) }
						</p>
						<button className="pd-button is-ghost" type="button" onClick={ () => onNavigate( 'modules' ) }>
							{ __( 'Back to Modules', 'aponto' ) }
						</button>
					</div>
				</section>
			</ModulePage>
		);
	}

	// (4): the module owns the surface from here.
	return (
		<ModulePage code={ code } label={ label } description={ description } onNavigate={ onNavigate }>
			<Panel module={ mod } />
		</ModulePage>
	);
}

export default ModuleSettingsRoute;

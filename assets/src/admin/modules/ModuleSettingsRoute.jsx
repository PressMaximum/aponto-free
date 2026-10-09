/**
 * One module's settings surface — the `#modules/{code}` route (D-R27).
 *
 * The catalog at `#modules` stays read-only; this is where an AVAILABLE module that
 * declares `has_settings` renders the panel its own bundle registered
 * (`lib/module-panels.js`). The route itself is free-shipped and completely generic:
 * it names no module, and it decides what to render from boot data plus the panel
 * registry, never from an edition comparison.
 *
 * States, in resolution order:
 *
 *   1. UNKNOWN code            → the not-found card. Same answer as a code that is not
 *                                in the registry at all, so the hash cannot be used to
 *                                enumerate what exists.
 *   2. UNAVAILABLE             → the same card, plus the compare link for a Premium
 *                                module. This mirrors the locked catalog card exactly:
 *                                a module the site does not own has one honest action,
 *                                and it is the pricing page (§6 + Guideline 5/11).
 *   3. DISABLED                → the module IS available to this site and is switched OFF
 *                                (D-R57). Says so, says the data and settings were kept
 *                                (D-R31), and offers the one action that resolves it:
 *                                "Enable module", on the same `PUT /modules/{code}` write
 *                                path the catalog switch uses. Before D-R57 this fell into
 *                                (2) and told an owner who had flipped the switch himself
 *                                that his site could not have the module. The card HOLDS
 *                                through the enable, because a module with a settings
 *                                surface reloads the document on success — see
 *                                `enablingNeedsReload()` for the two server-side reasons.
 *   4. AVAILABLE, no panel     → a neutral notice. An available module whose bundle did
 *      loaded                    not load (not built, not enqueued, failed) must say so
 *                                plainly rather than render an empty screen or, worse,
 *                                fake controls. Only the GENUINE case reaches it: an
 *                                enable-in-session is still on (3) when the reload lands.
 *   5. AVAILABLE + panel       → the module's own panel, handed its boot-data record.
 *
 * A module with no settings surface (`has_settings: false`) resolves as (1) in EVERY state: the
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
import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

import { config } from '../lib/config.js';
import { renderIcon } from '../lib/icon.jsx';
import { InflowPageHost } from '../lib/InflowWorkspace.jsx';
import { getModuleSettingsPanel } from '../lib/module-panels.js';
import { useToast } from '../lib/toast.jsx';
import { usePageTitle } from '../lib/page-title.js';
import { ModulesSubnav } from './ModulesSubnav.jsx';
import { useModules } from './module-state.js';
import { CATEGORY_META, MODULE_META, findModuleRecord, moduleAvailability, upgradeUrl } from './catalog.js';
import { setModuleEnabled, useModuleBusy } from './enable.js';

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
 * A panel built on the shared inspector workspace (`lib/InflowWorkspace.jsx`) takes the head
 * over through `InflowPageHost`: breadcrumb, description and subnav then render at the top of
 * the workspace's MAIN pane (above the panel's own tabs), and the page drops its gutter and
 * max-width (`.is-inflow-host`, admin-extra.css). The inspector therefore runs from the shell
 * header to the viewport bottom beside them, exactly as on Bookings, instead of starting below a
 * full-width head. When the panes stack, the workspace renders the head above the inspector.
 *
 * @param {{code: string, label: string, description?: string, onNavigate: Function, children: any}} props Shell props.
 */
function ModulePage( { code, label, description, onNavigate, children } ) {
	const [ hosted, setHosted ] = useState( false );
	const head = (
		<>
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
		</>
	);
	return (
		<div className={ `pd-page pd-record-editor-page ap-module-settings${ hosted ? ' is-inflow-host' : '' }` }>
			{ hosted ? null : head }
			<InflowPageHost head={ head } onHostedChange={ setHosted }>
				{ children }
			</InflowPageHost>
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
 * SWITCHED OFF, and switchable back on by this very site (D-R57).
 *
 * The distinction this card exists to make is the one the catalog card already makes (D-R31):
 * "you turned this off" and "your site cannot have this" are opposite messages, and only one of
 * them has an action. The copy states the D-R31 guarantee explicitly, because the reason an owner
 * hesitates to re-enable is the fear that switching off threw their configuration away.
 *
 * "Enable module" is the SAME write as the catalog switch — `enable.js` owns it — so the two
 * places a module can be turned on cannot diverge. It is disabled while the request is in flight;
 * a failure snaps the session state back and explains itself in a danger toast, and this page then
 * simply stays on this card, which is the honest result.
 *
 * The secondary "Back to Modules" stays: this is still a page the owner may have reached by hash,
 * and every state of this route owes them a way out.
 *
 * `busy` runs `enabling` → `reloading` and never clears on the success path, because a module with
 * a settings surface is reloaded the moment the server confirms (D-R57). Holding this card through
 * that window is what keeps the route from flashing the "Rebuild the plugin assets" message at an
 * operator whose build is fine.
 *
 * @param {{icon: string, label: string, busy: string, onEnable: Function, onNavigate: Function}} props Card props.
 */
function ModuleDisabled( { icon, label, busy, onEnable, onNavigate } ) {
	const action =
		'reloading' === busy
			? __( 'Reloading…', 'aponto' )
			: 'enabling' === busy
				? __( 'Enabling…', 'aponto' )
				: __( 'Enable module', 'aponto' );

	return (
		<section className="pd-card pd-placeholder ap-module-disabled">
			<div className="pd-placeholder-inner">
				<span className="pd-placeholder-icon">{ renderIcon( icon ) }</span>
				<h2>
					{ sprintf(
						/* translators: %s: module name, e.g. "Multiple locations". */
						__( '%s is turned off', 'aponto' ),
						label
					) }
				</h2>
				<p>
					{ __(
						'This module is available on this site — it is switched off. Its data and settings were kept, so turning it back on restores them.',
						'aponto'
					) }
				</p>
				<button className="pd-button primary" type="button" disabled={ '' !== busy } onClick={ onEnable }>
					{ action }
				</button>
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
export function ModuleSettingsRoute( { code, onNavigate, segments = [] } ) {
	// SESSION store, not the boot snapshot: a module disabled from the catalog moments ago
	// must gate this route NOW, or it mounts a panel whose REST routes the server has
	// already stopped serving — the raw `rest_no_route` banner this fix removes.
	const mod = findModuleRecord( { modules: useModules() }, code );
	const showToast = useToast();
	// '' | 'enabling' | 'reloading' — see `ModuleDisabled`.
	const [ busy, setBusy ] = useState( '' );
	// The shared latch (`enable.js`): a write for this module may also have been started from the
	// catalog before the hash change, and this page must not offer a second one either way.
	const pending = useModuleBusy().indexOf( code ) !== -1;
	const meta = MODULE_META[ code ] || {};
	const category = CATEGORY_META[ mod?.category ] || {};
	const label = meta.label || code;
	usePageTitle( label );
	// The catalog card's own sentence — one source, two surfaces (see `ModulePage`).
	const description = meta.description || '';
	const icon = meta.icon || category.icon || 'cube';
	// ONE derivation, shared with the catalog card (D-R57).
	const availability = moduleAvailability( mod, config.planEdition );
	// The card's own busy word. A refused call (`busy: true`) clears the local state but leaves the
	// latch held, so the button stays inert until the write that owns it finishes.
	const cardBusy = busy || ( pending ? 'enabling' : '' );

	const onEnable = () => {
		setBusy( 'enabling' );
		// A module that needs a reload keeps this card — and its busy button — until the document
		// goes away. Clearing it would render the "no settings UI loaded" card for the length of
		// the reload delay, which is the exact wrong advice about a build that is fine.
		setModuleEnabled( code, true, showToast ).then( ( res ) =>
			setBusy( res?.reloading ? 'reloading' : '' )
		);
	};

	// (1) + (2): unknown, settings-less, or genuinely not available to this site. A module with no
	// settings resource lands here in EVERY state — there is no page to host, switched on or off.
	if ( ! mod || mod.has_settings !== true || 'unavailable' === availability ) {
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

	// (3): switched off, and this site may switch it back on.
	//
	// `busy` holds this card from the click until the document is replaced. The shared write path
	// applies the new position OPTIMISTICALLY — right for a switch, which simply moves — but a
	// PAGE that swapped its whole body on an unconfirmed write would jump twice on a refusal, and
	// on the success path it would swap to a card about a broken build while the reload is on its
	// way. So the page waits, and the button is the feedback.
	if ( '' !== cardBusy || 'disabled' === availability ) {
		return (
			<ModulePage code={ code } label={ label } description={ description } onNavigate={ onNavigate }>
				<ModuleDisabled
					icon={ icon }
					label={ label }
					busy={ cardBusy }
					onEnable={ onEnable }
					onNavigate={ onNavigate }
				/>
			</ModulePage>
		);
	}

	const Panel = getModuleSettingsPanel( code );

	// (4): available since this page was built, and its bundle registered nothing. That really is a
	// build problem, so the copy is unchanged. A module ENABLED in this session never reaches here:
	// it is held on the disabled card above until the reload replaces the document (D-R57).
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

	// (5): the module owns the surface from here.
	return (
		<ModulePage code={ code } label={ label } description={ description } onNavigate={ onNavigate }>
			<Panel module={ mod } segments={ segments } />
		</ModulePage>
	);
}

export default ModuleSettingsRoute;

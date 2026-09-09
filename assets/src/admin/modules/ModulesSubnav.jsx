/**
 * Modules section sub-navigation (founder, 2026-08-28).
 *
 * Reaching a module's settings cost three steps — Modules, find the card, Open — for a surface an
 * owner returns to constantly. This row is the direct path: "All modules" plus one entry per
 * ACTIVE module that owns a settings page, rendered on BOTH the catalog (`#modules`) and every
 * panel (`#modules/{code}`), so the whole section is reachable from anywhere inside it.
 *
 * It is pure presentation over data the SPA already has: `available` (the boot projection of
 * `Plan::has()`) and `has_settings`. No new endpoint, no menu registration, and no entitlement
 * decision — REST re-checks every read and write (§5 invariant 3).
 *
 * VISUAL REGISTER is deliberate. On the catalog this sits ABOVE the category tabs, and two tab
 * rows of equal weight would read as siblings when they are not: the category tabs filter the
 * grid, this navigates the section. So it composes two idioms the app already owns rather than
 * inventing a third — the quiet 28px pill of `.pd-filter-chip` (surface-muted, caption type) with
 * the active treatment shared by `.pd-editor-nav a.is-active` and `.pd-segmented
 * button[aria-pressed="true"]` (accent-subtle fill, accent foreground). Same tokens, lighter
 * weight, clearly subordinate to the underlined tabs beneath it.
 *
 * Renders NOTHING when no active module owns a settings page — which is every Free build and any
 * Premium build before the first module ships, so today's catalog is untouched.
 */
import { __ } from '@wordpress/i18n';

import { MODULE_META } from './catalog.js';
import { useModules } from './module-state.js';

/**
 * The section's navigable modules, in registry order (boot data preserves it).
 *
 * A module qualifies only when the site can actually USE it (`available`) AND it owns a settings
 * surface (`has_settings`) — the same pair the panel route itself requires, so this row can never
 * offer a destination that would answer "not available".
 *
 * @param {{modules?: Array}} bootConfig Admin boot config.
 * @return {Array<{code: string, label: string, href: string}>} Module entries.
 */
export function subnavModules( bootConfig ) {
	const modules = Array.isArray( bootConfig?.modules ) ? bootConfig.modules : [];

	return modules
		.filter( ( mod ) => mod?.available === true && mod?.has_settings === true )
		.map( ( mod ) => ( {
			code: mod.code,
			label: MODULE_META[ mod.code ]?.label || mod.code,
			href: `#modules/${ mod.code }`,
		} ) );
}

/**
 * The sub-navigation row, or null when there is nothing to navigate to.
 *
 * @param {{current?: string}} props `current` is the active module code, or '' on the catalog.
 */
export function ModulesSubnav( { current = '' } ) {
	// Reads the SESSION store, not the boot snapshot, so a module switched off leaves this row
	// immediately — including on a panel route, where the catalog that flipped it is unmounted.
	const modules = subnavModules( { modules: useModules() } );

	// One "All modules" pill on its own is not navigation, it is a link to the page you are
	// already on — so the row appears only once a module has somewhere else to go.
	if ( modules.length === 0 ) {
		return null;
	}

	const items = [
		{ code: '', label: __( 'All modules', 'aponto' ), href: '#modules' },
		...modules,
	];

	return (
		<nav className="ap-module-subnav" aria-label={ __( 'Modules', 'aponto' ) }>
			{ items.map( ( item ) => {
				const active = item.code === current;

				return (
					<a
						key={ item.code || 'all' }
						className={ active ? 'ap-module-subnav-item is-active' : 'ap-module-subnav-item' }
						href={ item.href }
						// `aria-current` is the state, not the class: a screen-reader user gets the
						// same "you are here" the accent fill gives a sighted one.
						aria-current={ active ? 'page' : undefined }
					>
						{ item.label }
					</a>
				);
			} ) }
		</nav>
	);
}

export default ModulesSubnav;

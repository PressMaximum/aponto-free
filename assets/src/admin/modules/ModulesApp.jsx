/**
 * Modules — the catalog surface (SPEC-P1 §6), a first-level route
 * (`#modules`) rendered from the `Plan::FEATURES` registry (SPEC-P0 §3.2) shipped as
 * boot data. Category tabs (All · Booking · Payments · Connections · Site & Tools)
 * with counts, a search box and an Industry select (D-R21, founder-approved
 * 2026-07-25 — the three combine with AND) filter a grid of kit PMDKModuleCards;
 * a free-vs-premium CompareTable closes the page.
 *
 * The surface carries exactly one control — the D-R31 enable/disable switch on shipped
 * modules, wired to `PUT /modules/{code}` — and no license field or fake controls. It is
 * no longer an all-locked catalog (D-R22, founder-approved 2026-07-27): Free
 * capabilities that already ship render as "Included", Free modules still to come
 * render as "Coming soon" with NO upgrade link, and only Premium cards carry the
 * per-placement UTM comparison link (`utm_content=modules-{code}`) alongside the
 * page-level `menu` placement (§6 + Guideline 5/11).
 *
 * "Included" is a claim about the site, so the card points at the proof where one
 * exists: an Included capability with a real admin surface gets an internal "Open"
 * link to it (D-R22 addendum, founder-approved 2026-07-27) — navigation, not a control.
 * The one real control on the surface is the D-R31 enable/disable switch.
 */
import { Notice } from '@wordpress/components';
import { useMemo, useRef, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { CompareTable } from '@pressmaximum/dashboard-kit';
import { PMDKModuleCard } from '@pressmaximum/dashboard-kit/module-card';

import { config } from '../lib/config.js';
import { renderIcon } from '../lib/icon.jsx';
import { useToast } from '../lib/toast.jsx';
import { useConfirmDialog } from '../lib/confirm.jsx';
import { PageHeader } from '../lib/ui.jsx';
import {
	CATEGORY_META,
	CATEGORY_TABS,
	COMPARE_SECTIONS,
	INDUSTRY_OPTIONS,
	MODULE_META,
	moduleStateLabel,
	kindLabel,
	moduleCardState,
	moduleOpenHref,
	moduleSearchText,
	upgradeUrl,
} from './catalog.js';
import { setModuleEnabled, useModuleBusy } from './enable.js';
import { CATEGORY_ALL, INDUSTRY_ALL, filterModules, hasBrowseFilters } from './filters.js';
import { ModulesSubnav } from './ModulesSubnav.jsx';
import { useModules } from './module-state.js';

/** Controlled category tablist matching the kit `.pmdk-section-tabs` ARIA contract. */
function CategoryTabs( { tabs, active, onSelect } ) {
	const refs = useRef( [] );

	const onKeyDown = ( event, index ) => {
		const last = tabs.length - 1;
		let next = null;
		if ( event.key === 'ArrowRight' ) {
			next = index === last ? 0 : index + 1;
		} else if ( event.key === 'ArrowLeft' ) {
			next = index === 0 ? last : index - 1;
		} else if ( event.key === 'Home' ) {
			next = 0;
		} else if ( event.key === 'End' ) {
			next = last;
		}
		if ( next === null ) {
			return;
		}
		event.preventDefault();
		onSelect( tabs[ next ].id );
		refs.current[ next ]?.focus();
	};

	return (
		<div className="pmdk-section-tabs" role="tablist" aria-label={ __( 'Module categories', 'aponto' ) }>
			{ tabs.map( ( tab, index ) => (
				<button
					key={ tab.id }
					ref={ ( el ) => ( refs.current[ index ] = el ) }
					type="button"
					role="tab"
					id={ `ap-modules-tab-${ tab.id }` }
					aria-controls="ap-modules-grid"
					aria-selected={ active === tab.id }
					tabIndex={ active === tab.id ? 0 : -1 }
					onClick={ () => onSelect( tab.id ) }
					onKeyDown={ ( event ) => onKeyDown( event, index ) }
				>
					{ tab.label }
					<span>{ tab.count }</span>
				</button>
			) ) }
		</div>
	);
}

/**
 * One catalog card, in whichever state `moduleCardState()` resolves — Included, switched
 * OFF (D-R31), Coming soon, or the unchanged locked Premium card.
 * No roadmap-phase badge on production cards (divergence audit §2.7 — phase stays
 * registry/code-side only).
 *
 * A card carries AT MOST ONE action, and the two kinds never mix:
 *   - Premium → the outbound UTM compare link (unchanged);
 *   - Free/Included WITH a shipped admin surface → an internal "Open" hash link
 *     (D-R22 addendum, founder-approved 2026-07-27). Same accent affordance, but
 *     it stays in the app: no `target`, no `rel`, no UTM, no pricing page. The
 *     destination map + the "no destination → no link" rule live in catalog.js.
 * Free/planned cards and included cards without a surface keep no action at all.
 */
/**
 * Whether switching this module OFF should ask first (S2-74): an enabled payment module.
 *
 * @param {Object} mod Module record.
 * @return {boolean} Whether to confirm.
 */
export function paymentModuleNeedsConfirm( mod ) {
	return 'payments' === mod?.category && true === mod?.enabled;
}

function ModuleCard( { module: mod, planEdition, busy, onToggle } ) {
	const meta = MODULE_META[ mod.code ] || { label: mod.code };
	const category = CATEGORY_META[ mod.category ] || { label: mod.category, icon: 'cube' };
	const iconName = meta.icon || category.icon;
	const card = moduleCardState( mod, planEdition );
	const openHref = moduleOpenHref( mod );
	// The next-step phrase rides the meta line: it is the one place on the card that already
	// carries "what kind of thing is this", and the phrase belongs beside it rather than competing
	// with the title or the toggle (D-R35). Which phrase it is depends on the module's category —
	// a calendar's 4-state and a gateway's test/live state are different questions (D-R39).
	const stateLabel = moduleStateLabel( mod );
	const metaLine = `${ category.label } · ${ kindLabel( mod.kind ) }${ stateLabel ? ` · ${ stateLabel }` : '' }`;

	let action = null;
	if ( card.upgrade ) {
		action = (
			<a
				className="ap-module-link"
				href={ upgradeUrl( `modules-${ mod.code }` ) }
				target="_blank"
				rel="noreferrer noopener"
			>
				{ __( 'Compare plans', 'aponto' ) }
				<span aria-hidden="true"> →</span>
			</a>
		);
	} else if ( openHref ) {
		action = (
			<a
				className="ap-module-link"
				href={ openHref }
				// Every card says the same word, so the accessible name has to carry the
				// module: "Open" alone gives a screen-reader user a list of identical links.
				aria-label={ sprintf(
					/* translators: %s: module name, e.g. "Email notifications". */
					__( 'Open %s', 'aponto' ),
					meta.label
				) }
			>
				{ __( 'Open', 'aponto' ) }
				<span aria-hidden="true"> →</span>
			</a>
		);
	}

	return (
		<PMDKModuleCard
			icon={ renderIcon( iconName ) }
			meta={ metaLine }
			title={ meta.label }
			description={ meta.description }
			tier={ card.tier }
			state={ card.state }
			toggle={ card.toggle }
			// ONE write per module at a time (`enable.js`): a switch that stays live while its own
			// PUT is unanswered lets the operator queue responses that resolve out of order, and
			// the loser overwrites the winner.
			toggleDisabled={ busy }
			statusLabel={ card.statusLabel }
			plannedLabel={ card.plannedLabel }
			action={ action }
			onToggle={ card.toggle ? ( next ) => onToggle( mod.code, next ) : undefined }
			labels={ {
				toggleOn: __( 'Enabled', 'aponto' ),
				toggleOff: __( 'Disabled', 'aponto' ),
			} }
		/>
	);
}

/**
 * Browse toolbar: search + Industry select (D-R21). The mockup's Status and
 * License selects stay unshipped: D-R21 approved the Industry filter only, and
 * D-R22 (which put mixed editions/states in the catalog) did not re-open that
 * scope. Category tabs + search cover browsing today.
 */
function ModuleToolbar( { query, onQuery, industry, onIndustry } ) {
	return (
		<div className="pd-module-toolbar">
			<label className="pd-module-search" htmlFor="ap-modules-search">
				{ renderIcon( 'search' ) }
				<input
					id="ap-modules-search"
					type="search"
					value={ query }
					onChange={ ( event ) => onQuery( event.target.value ) }
					placeholder={ __( 'Search modules', 'aponto' ) }
					aria-label={ __( 'Search modules', 'aponto' ) }
					autoComplete="off"
				/>
			</label>
			<div className="pd-module-filter-controls">
				<label className="pd-module-select">
					<span>{ __( 'Industry', 'aponto' ) }</span>
					<select value={ industry } onChange={ ( event ) => onIndustry( event.target.value ) }>
						{ INDUSTRY_OPTIONS.map( ( option ) => (
							<option key={ option.id } value={ option.id }>
								{ option.label }
							</option>
						) ) }
					</select>
				</label>
			</div>
		</div>
	);
}

export default function ModulesApp() {
	const showToast = useToast();
	// SESSION state, not route state (D-R31 fix). This used to be local `useState` layered over
	// the boot snapshot, which meant hash-navigating to a panel unmounted the route and threw the
	// toggle away — the card came back Enabled and the panel route mounted an editor for a module
	// the server had already stopped serving. `modules/module-state.js` outlives the route.
	const modules = useModules();
	// Codes with a write in flight (or a reload pending) — their switches go inert until it lands.
	const busyCodes = useModuleBusy();

	/**
	 * Flip a module. The write, the rollback, the toasts and the reload all live in `enable.js`,
	 * shared verbatim with the "Enable module" action on a switched-off module's own page — two
	 * places to turn a module on, one behaviour.
	 *
	 * @param {string}  code Module code.
	 * @param {boolean} next Requested state.
	 */
	const { confirm, dialog } = useConfirmDialog();
	const onToggle = async ( code, next ) => {
		// Switching OFF a module that takes money asks first (persona QA 2026-10-05, S2-74). It
		// used to flip instantly, even with checkouts still awaiting payment — and an off module's
		// settings and refund action are unreachable until it is on again. Keyed on the registry
		// CATEGORY, so core names no gateway; no module publishes a count of its open work yet, so
		// the question cannot say how many there are and is asked for every payment module.
		const mod = modules.find( ( entry ) => entry?.code === code );
		if ( ! next && paymentModuleNeedsConfirm( mod ) ) {
			const label = MODULE_META[ code ]?.label || code;
			const ok = await confirm( {
				title: sprintf(
					/* translators: %s: module name, e.g. "Stripe payments". */
					__( 'Turn off %s?', 'aponto' ),
					label
				),
				message: __(
					'Customers can no longer pay with it. Bookings still waiting for a payment through it keep their place, but refunds and payment reviews from Aponto are unavailable — and its settings are hidden — until you turn it on again.',
					'aponto'
				),
				confirmText: __( 'Turn off', 'aponto' ),
				destructive: true,
			} );
			if ( ! ok ) {
				return;
			}
		}
		setModuleEnabled( code, next, showToast );
	};
	// Plan-marketing chrome — the page-level "Compare plans" CTA, the per-card upsell links and
	// the free-vs-premium table — is for people deciding whether to buy. A site that already has
	// Premium is shown none of it (founder, 2026-08-28). This is presentation only: what each
	// module can DO is `available` (`Plan::has()`), and REST enforces it regardless.
	const showPlanMarketing = config.planEdition !== 'premium';
	// A cross-route "open the catalog on this tab" (the Dashboard's payment warning, re-test N3) —
	// the same one-shot window seam the Bookings route reads for "open this booking".
	const [ active, setActive ] = useState( () => {
		const wanted = typeof window !== 'undefined' ? window.__apontoModulesCategory : '';
		if ( typeof window !== 'undefined' ) {
			window.__apontoModulesCategory = '';
		}
		return CATEGORY_TABS.some( ( tab ) => tab.id === wanted ) ? wanted : CATEGORY_ALL;
	} );
	const [ query, setQuery ] = useState( '' );
	const [ industry, setIndustry ] = useState( INDUSTRY_ALL );

	const tabs = useMemo( () => {
		const counts = { all: modules.length };
		CATEGORY_TABS.forEach( ( tab ) => {
			if ( tab.id !== 'all' ) {
				counts[ tab.id ] = modules.filter( ( mod ) => mod.category === tab.id ).length;
			}
		} );
		return CATEGORY_TABS.map( ( tab ) => ( { ...tab, count: counts[ tab.id ] || 0 } ) );
	}, [ modules ] );

	// The three filters combine with AND (D-R21); tab counts stay whole-catalog.
	const filtered = useMemo(
		() => filterModules( modules, { category: active, industry, query }, moduleSearchText ),
		[ modules, active, industry, query ]
	);
	const isFiltered = hasBrowseFilters( { industry, query } );

	const clearFilters = () => {
		setQuery( '' );
		setIndustry( INDUSTRY_ALL );
	};

	return (
		<div className="pd-page ap-modules">
			<PageHeader
				title={ __( 'Modules', 'aponto' ) }
				// Same page, two framings (founder, 2026-08-28). A prospect is told what an
				// upgrade buys; an owner is told when their modules arrive — "with an upgrade"
				// is upsell copy aimed at someone who has already paid. Kept as two COMPLETE
				// sentences rather than a shared prefix plus a swapped tail: translators need
				// whole sentences, and concatenated fragments do not survive most languages.
				description={
					showPlanMarketing
						? __(
							'Everything Aponto does, and everything it will. Premium modules are included with an upgrade as each one ships.',
							'aponto'
						)
						: __(
							'Everything Aponto does, and everything it will. Premium modules light up here as each one ships.',
							'aponto'
						)
				}
				actions={
					showPlanMarketing ? (
						<a
							className="pd-button is-ghost"
							href={ upgradeUrl( 'menu' ) }
							target="_blank"
							rel="noreferrer noopener"
						>
							{ renderIcon( 'arrowRight' ) }
							{ __( 'Compare plans', 'aponto' ) }
						</a>
					) : null
				}
			/>

			{ modules.length === 0 ? (
				<Notice status="warning" isDismissible={ false }>
					{ __( 'The module catalog could not be loaded.', 'aponto' ) }
				</Notice>
			) : (
				<>
					{ /* Section navigation sits ABOVE the category tabs and is deliberately
					     quieter than them: this moves between module surfaces, the tabs filter
					     the grid below. Renders nothing until a settings-owning module is
					     active, so today's catalog is unchanged. */ }
					<ModulesSubnav current="" />

					<CategoryTabs tabs={ tabs } active={ active } onSelect={ setActive } />

					<ModuleToolbar
						query={ query }
						onQuery={ setQuery }
						industry={ industry }
						onIndustry={ setIndustry }
					/>

					<div className="pd-module-results-head" role="status">
						<strong>
							{ sprintf(
								/* translators: %d: number of modules matching the current filters. */
								_n( '%d module', '%d modules', filtered.length, 'aponto' ),
								filtered.length
							) }
						</strong>
					</div>

					<div
						className="pmdk-module-grid"
						id="ap-modules-grid"
						role="tabpanel"
						aria-labelledby={ `ap-modules-tab-${ active }` }
						hidden={ filtered.length === 0 }
					>
						{ filtered.map( ( mod ) => (
							<ModuleCard
								key={ mod.code }
								module={ mod }
								planEdition={ config.planEdition }
								busy={ busyCodes.indexOf( mod.code ) !== -1 }
								onToggle={ onToggle }
							/>
						) ) }
					</div>

					{ filtered.length === 0 && (
						<div className="pd-module-empty">
							{ renderIcon( 'search' ) }
							<h2>{ __( 'No modules match', 'aponto' ) }</h2>
							<p>{ __( 'Clear a filter or try another search term.', 'aponto' ) }</p>
							{ isFiltered && (
								<button className="pd-button" type="button" onClick={ clearFilters }>
									{ __( 'Clear filters', 'aponto' ) }
								</button>
							) }
						</div>
					) }

					{ /* The whole free-vs-premium section is buying-decision material: the matrix,
					     its "Aponto Premium" footer and that footer's pricing CTA. A Premium site
					     has made the decision, so the section does not render for it at all
					     (founder, 2026-08-28) rather than rendering in some softened form. */ }
					{ showPlanMarketing && (
					<section className="ap-modules-compare" aria-label={ __( 'Free versus Premium', 'aponto' ) }>
						<h2>{ __( 'Free vs Premium', 'aponto' ) }</h2>
						{ /*
						  * The table answers "which plan owns this", not "can I use it today":
						  * the Free column is shipped truth, while the Premium column is the
						  * edition's scope. Saying so here is what keeps a Premium checkmark
						  * from reading as an over-promise before Premium GA.
						  */ }
						<p className="ap-modules-compare-note">
							{ __(
								'Premium modules roll out progressively — the column shows what belongs to each plan, not what has already shipped.',
								'aponto'
							) }
						</p>
						<CompareTable
							sections={ COMPARE_SECTIONS }
							labels={ {
								headFeature: __( 'Feature', 'aponto' ),
								headFree: __( 'Free', 'aponto' ),
								headPro: __( 'Premium', 'aponto' ),
								cellYes: __( 'Included', 'aponto' ),
								cellNo: __( 'Not included', 'aponto' ),
							} }
							footer={ {
								title: __( 'Aponto Premium', 'aponto' ),
								// D-R22: Stripe is a Free module now, so "payments" can no longer
								// be listed wholesale as a Premium reason to upgrade.
								description: __(
									'Staff, calendar sync, custom reminders, deposits and more — each module is included as it ships on the roadmap.',
									'aponto'
								),
								ctaHref: upgradeUrl( 'menu' ),
								ctaLabel: __( 'Compare plans', 'aponto' ),
							} }
						/>
					</section>
					) }
				</>
			) }
			{ dialog }
		</div>
	);
}

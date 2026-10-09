/**
 * Aponto admin shell (SPEC-P1 §1.0). App-in-content-area + non-sticky top menu:
 * Dashboard · Bookings · Calendar · Customers | Offerings ▾ · Resources ▾ |
 * (right) Modules · Settings ▾ · Support ? · Workspace ⋮ (fullscreen +
 * Appearance). Hash routing with WP submenu sync; fullscreen collapses the WP
 * menu. Does not restyle WP chrome.
 *
 * Settings is a dropdown, not a flat route button (mockup index.html:69 +
 * plugin-dashboard.js:193-206): its trigger is a link straight to the default
 * section, and its menu lists the parent → child tree from settings/ia.js.
 *
 * The workspace overflow owns the Appearance radio group (Light · Dark · System,
 * mockup index.html:113-116) whose resolved value drives `data-ap-color-scheme`
 * on the token scope; the runtime + persistence contract lives in lib/theme.js.
 */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { __ } from '@wordpress/i18n';
import { useRoute, syncWpMenu, moduleRouteCode } from './lib/router.js';
import { ROUTE_TITLES, routeTitleParts, setRouteTitle } from './lib/page-title.js';
import { adminRouteIsOpen, orderAdminRouteItems, useAdminRoutes } from './lib/admin-routes.js';
import { findModuleRecord } from './modules/catalog.js';
import { useModules } from './modules/module-state.js';
import { renderIcon } from './lib/icon.jsx';
import { config } from './lib/config.js';
import { menuRovingKeydown } from './lib/ui.jsx';
import {
	THEME_MODES,
	applyColorScheme,
	prefersDarkNow,
	readThemeMode,
	resolveColorScheme,
	themeModeIcon,
	watchStoredScheme,
	watchSystemScheme,
	writeThemeMode,
} from './lib/theme.js';
import {
	SETTINGS_TREE,
	defaultSettingsChild,
	resolveSettingsRoute,
	settingsMenuSubline,
	settingsPath,
} from './settings/ia.js';
import { lazySurface } from './lib/lazy.jsx';
import { Dashboard } from './routes/Dashboard.jsx';
import { Bookings } from './routes/Bookings.jsx';
import { Calendar } from './routes/Calendar.jsx';
import { Customers } from './routes/Customers.jsx';
import { Placeholder } from './routes/Placeholder.jsx';

// ---- Lazy routes (admin bundle budget, AGENTS §6) ---------------------------
//
// The four DAILY routes above (Dashboard · Bookings · Calendar · Customers) stay in the
// entry bundle: they are the first paint, and any of the four can be the landing hash.
// The setup surfaces below are opened occasionally, are self-contained, and carry the
// heaviest imports in the app (the settings/module screens are the only consumers of the
// dashboard-kit main entry), so each is its own chunk. See lib/lazy.jsx.
const CsvImport = lazySurface(
	() => import( /* webpackChunkName: "admin-chunk-import" */ './routes/CsvImport.jsx' ),
	{ pick: 'CsvImport', label: __( 'Loading import…', 'aponto' ) }
);
const Services = lazySurface(
	() => import( /* webpackChunkName: "admin-chunk-services" */ './routes/Services.jsx' ),
	{ pick: 'Services', label: __( 'Loading services…', 'aponto' ) }
);
const Staff = lazySurface(
	() => import( /* webpackChunkName: "admin-chunk-staff" */ './routes/Staff.jsx' ),
	{ pick: 'Staff', label: __( 'Loading staff…', 'aponto' ) }
);
const SettingsRoute = lazySurface(
	() => import( /* webpackChunkName: "admin-chunk-settings" */ './routes/SettingsRoute.jsx' ),
	{ pick: 'SettingsRoute', label: __( 'Loading settings…', 'aponto' ) }
);
const ModulesApp = lazySurface(
	() => import( /* webpackChunkName: "admin-chunk-modules" */ './modules/ModulesApp.jsx' ),
	{ label: __( 'Loading modules…', 'aponto' ) }
);
const ModuleSettingsRoute = lazySurface(
	() => import( /* webpackChunkName: "admin-chunk-modules" */ './modules/ModuleSettingsRoute.jsx' ),
	{ pick: 'ModuleSettingsRoute', label: __( 'Loading module settings…', 'aponto' ) }
);

const DAILY = [
	{ id: 'dashboard', label: 'Dashboard' },
	{ id: 'bookings', label: 'Bookings' },
	{ id: 'calendar', label: 'Calendar' },
	{ id: 'customers', label: 'Customers' },
];
// The STATIC core entries of the two section menus. A module-owned screen is NOT listed here:
// it registers itself (`lib/admin-routes.js`, D-R56) and is appended below, because hard-coding
// an edition-owned nav item into this free-shipped file would ship a paid control in the wp.org
// archive (D-R41).
const OFFERINGS = [
	{ id: 'services', label: 'Services', description: 'Bookable services & categories' },
	{ id: 'events', label: 'Events', description: 'Fixed sessions & attendance', badge: __( 'Premium', 'aponto' ) },
];
const RESOURCES = [
	{ id: 'staff', label: 'Staff', description: 'People who take bookings' },
	{ id: 'shared-assets', label: 'Shared assets', description: 'Rooms & equipment', badge: __( 'Premium', 'aponto' ) },
];

/** Appearance menu copy, in the mockup's order (index.html:114-116). */
const THEME_LABELS = { light: 'Light', dark: 'Dark', system: 'System' };

/** Where the Settings ▾ trigger and a bare `#settings` both land. */
const defaultSettingsPath = settingsPath(
	SETTINGS_TREE[ 0 ].id,
	defaultSettingsChild( SETTINGS_TREE[ 0 ].id )
);

// Real brand mark (logo icon + wordmark), inlined so it costs no extra request
// and inherits no host recolor. Source: docs/mockups/v4/assets/img/aponto-logo.svg.
// `focusable`/`aria-hidden` keep it decorative — the button owns the label.
function BrandLogo() {
	return (
		<svg className="pd-brand-logo" viewBox="0 0 918 208" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
			<path d="M386.272 165H348.64C347.8 160.8 345.28 151.56 342.088 139.968C332.68 139.8 323.272 139.8 316.048 139.8C309.328 139.8 299.584 139.8 290.344 139.968C286.984 150.888 284.464 160.128 283.288 165H248.512C260.608 133.584 285.64 57.144 291.52 39H342.256C348.304 57.312 373.168 132.912 386.272 165ZM297.4 116.28C304.12 116.28 310.84 116.28 316.048 116.28C321.256 116.28 328.312 116.28 335.2 116.112C331.504 103.344 327.472 89.904 323.944 78.984C320.248 68.736 318.064 60.672 316.384 54.96C314.536 60.672 312.016 68.568 308.488 79.32C305.296 90.408 301.264 103.512 297.4 116.28ZM419.612 188.352H387.692C388.196 171.384 388.196 137.952 388.196 111.744C388.196 92.592 388.196 77.472 387.86 63.192H419.444C419.444 66.216 419.276 68.736 419.276 71.256C419.276 73.608 419.108 75.96 418.94 78.312L420.284 78.816C426.164 68.232 437.42 61.512 454.388 61.512C480.428 61.512 492.86 79.992 492.86 113.76C492.86 147.696 477.74 166.68 453.884 166.68C436.412 166.68 425.492 159.96 419.78 151.56L419.108 151.728C419.276 156.096 419.276 160.128 419.276 165C419.276 165.168 419.276 165.336 419.276 165.672C419.276 173.232 419.444 180.456 419.612 188.352ZM462.62 113.928C462.62 93.096 455.732 85.704 442.796 85.704C429.188 85.704 418.772 92.592 418.772 110.232V136.608C424.316 140.136 431.54 141.984 441.116 141.984C455.9 141.984 462.62 134.592 462.62 113.928ZM605.288 112.416C605.288 146.016 585.128 167.184 551.36 167.184C517.76 167.184 498.104 146.016 498.104 112.416C498.104 78.648 519.272 60.84 551.36 60.84C583.448 60.84 605.288 78.648 605.288 112.416ZM575.048 113.424C575.048 94.944 565.976 87.384 551.36 87.384C536.912 87.384 527.672 94.44 527.672 113.424C527.672 132.24 536.744 140.808 551.36 140.808C566.312 140.808 575.048 131.904 575.048 113.424ZM717.821 165H686.069C686.405 150.72 686.573 130.56 686.573 106.536C686.573 92.592 682.037 87.216 669.269 87.216C656.501 87.216 646.757 93.936 646.757 111.24C646.757 143.664 646.925 154.92 647.093 165H615.509C616.013 150.72 616.013 138.288 616.013 114.936C616.013 92.928 615.845 77.136 615.509 63.192H647.261C647.093 69.408 646.925 73.776 646.589 79.488L647.597 79.656C653.813 67.056 665.573 61.68 682.373 61.68C705.053 61.68 717.653 72.264 717.653 99.648C717.653 114.096 717.317 121.32 717.317 130.392C717.317 143.16 717.317 153.912 717.821 165ZM766.725 63.696C776.805 63.528 788.229 63.528 798.477 63.192C798.141 71.088 797.805 82.008 797.973 90.072C790.581 89.904 778.653 89.568 766.389 89.4C766.221 100.824 766.221 113.088 766.221 126.528C766.221 135.768 770.085 138.96 779.997 138.96C786.381 138.96 792.429 137.616 797.301 135.6C797.805 144.504 799.653 155.424 800.661 162.816C791.589 164.832 786.045 166.344 775.125 166.344C745.725 166.344 735.813 151.392 735.813 130.392C735.813 119.304 736.149 102.672 736.317 89.064C732.621 88.896 729.261 88.896 726.573 88.896C726.573 88.392 726.573 87.888 726.573 87.384C726.573 81.336 726.573 72.768 726.405 67.392C737.157 64.368 755.301 52.776 766.389 41.52H767.397C767.061 48.576 766.893 55.968 766.725 63.696ZM911.166 112.416C911.166 146.016 891.006 167.184 857.238 167.184C823.638 167.184 803.982 146.016 803.982 112.416C803.982 78.648 825.15 60.84 857.238 60.84C889.326 60.84 911.166 78.648 911.166 112.416ZM880.926 113.424C880.926 94.944 871.854 87.384 857.238 87.384C842.79 87.384 833.55 94.44 833.55 113.424C833.55 132.24 842.622 140.808 857.238 140.808C872.19 140.808 880.926 131.904 880.926 113.424Z" fill="#282828" />
			<circle cx="104" cy="104" r="104" fill="#1C1C1C" />
			<path d="M85.8135 55.2393C93.8964 41.2393 114.104 41.2393 122.187 55.2393L161.685 123.652C169.768 137.652 159.664 155.152 143.498 155.152H64.5018C48.336 155.152 38.2323 137.652 46.3152 123.652L85.8135 55.2393Z" fill="white" />
			<circle cx="144.413" cy="87.8912" r="29.2609" fill="white" stroke="#1C1C1C" strokeWidth="11" />
		</svg>
	);
}

function NavButton( { item, route, onNavigate } ) {
	return (
		<button
			className="pd-nav-button"
			type="button"
			aria-current={ route === item.id ? 'page' : undefined }
			onClick={ () => onNavigate( item.id ) }
		>
			<span>{ item.label }</span>
			{ item.badge ? <small className="pd-nav-phase is-later">{ item.badge }</small> : null }
		</button>
	);
}

/**
 * Header dropdown shared by Offerings ▾ · Resources ▾ · Settings ▾.
 *
 * `items` are already resolved by the caller ({ key, label, description, badge,
 * current, activate }) so a route menu and the settings tree can share one
 * trigger, one surface and one keyboard contract. `href` turns the trigger into
 * the mockup's Settings link (a direct path to the default section that still
 * discloses the menu on hover/focus); `alignEnd` mirrors the mockup's
 * `.pd-nav-menu-wrap.is-settings` right-edge anchoring.
 *
 * Keyboard (SPEC §11 + §6.6): Arrow Up/Down + Home/End roam the menu items,
 * Escape closes and returns focus to the trigger (handled globally in App).
 */
function NavDropdown( { id, label, items, active, href, alignEnd, openMenu, setOpenMenu } ) {
	const isOpen = openMenu === id;
	const triggerClass = 'pd-nav-button pd-nav-menu-trigger';
	return (
		<div
			className={ `pd-nav-menu-wrap${ alignEnd ? ' is-settings' : '' }` }
			data-nav-menu-wrap={ id }
			onMouseEnter={ () => setOpenMenu( id ) }
			onMouseLeave={ () => setOpenMenu( ( cur ) => ( cur === id ? null : cur ) ) }
			onFocus={ () => setOpenMenu( id ) }
			onBlur={ ( e ) => { if ( ! e.currentTarget.contains( e.relatedTarget ) ) setOpenMenu( ( cur ) => ( cur === id ? null : cur ) ); } }
		>
			{ href ? (
				<a
					className={ triggerClass }
					href={ href }
					aria-haspopup="menu"
					aria-expanded={ isOpen }
					aria-current={ active ? 'page' : undefined }
					onClick={ () => setOpenMenu( null ) }
				>
					{ label }{ renderIcon( 'chevronDown' ) }
				</a>
			) : (
				<button
					className={ triggerClass }
					type="button"
					aria-haspopup="menu"
					aria-expanded={ isOpen }
					aria-current={ active ? 'page' : undefined }
					onClick={ () => setOpenMenu( isOpen ? null : id ) }
				>
					{ label }{ renderIcon( 'chevronDown' ) }
				</button>
			) }
			<div className="pd-nav-dropdown" role="menu" hidden={ ! isOpen } onKeyDown={ menuRovingKeydown }>
				{ items.map( ( item ) => (
					<button
						key={ item.key }
						type="button"
						role="menuitem"
						aria-current={ item.current ? 'page' : undefined }
						onClick={ () => { item.activate(); setOpenMenu( null ); } }
					>
						<span>
							<strong>{ item.label }{ item.badge ? <small className="is-later">{ item.badge }</small> : null }</strong>
							<em>{ item.description }</em>
						</span>
					</button>
				) ) }
			</div>
		</div>
	);
}

/** Route entries (Offerings/Resources) projected onto the shared dropdown shape. */
function routeMenuItems( entries, route, onNavigate ) {
	return entries.map( ( item ) => ( {
		key: item.id,
		label: item.label,
		description: item.description,
		badge: item.badge,
		current: route === item.id,
		activate: () => onNavigate( item.id ),
	} ) );
}

export function App() {
	const { route, segments, navigate } = useRoute();
	// Module-owned routes (D-R56). Listed only while the owning module is `available` AND the
	// registry granted it this slug — one predicate, `adminRouteIsOpen()`, shared with the hash
	// router so the menu, the URL and the rendered screen cannot disagree. The module records come
	// from the session store, the same source `modules/ModuleSettingsRoute.jsx` reads, so a module
	// switched off in this session leaves the menu at once. Display only: REST re-checks every
	// write (§5 invariant 3).
	const adminRoutes = useAdminRoutes();
	const modules = useModules();
	const moduleRoutes = useMemo(
		() => adminRoutes.filter( ( entry ) => adminRouteIsOpen( entry, modules ) ),
		[ adminRoutes, modules ]
	);
	// `orderAdminRouteItems` honours each descriptor's `after`, so the dropdown and the WordPress
	// submenu agree: Locations sits directly behind Staff in both, not behind the Premium
	// "Shared assets" placeholder at the end of the menu (browser QA, 2026-09-21).
	const offerings = useMemo(
		() => orderAdminRouteItems( OFFERINGS, moduleRoutes.filter( ( entry ) => entry.group === 'offerings' ) ),
		[ moduleRoutes ]
	);
	const resources = useMemo(
		() => orderAdminRouteItems( RESOURCES, moduleRoutes.filter( ( entry ) => entry.group === 'resources' ) ),
		[ moduleRoutes ]
	);
	const moduleRoute = moduleRoutes.find( ( entry ) => entry.id === route ) || null;
	const [ openMenu, setOpenMenu ] = useState( null );
	const [ helpOpen, setHelpOpen ] = useState( false );
	const [ workspaceOpen, setWorkspaceOpen ] = useState( false );
	const [ focused, setFocused ] = useState( false );
	// Appearance: the stored mode (light|dark|system) plus the live OS preference
	// System resolves against. PHP already stamped the stored scheme on the token
	// scope before first paint, so mounting only has to keep them in sync.
	const [ themeMode, setThemeMode ] = useState( readThemeMode );
	const [ prefersDark, setPrefersDark ] = useState( prefersDarkNow );
	const helpRef = useRef( null );
	const workspaceRef = useRef( null );
	const helpTriggerRef = useRef( null );
	const workspaceTriggerRef = useRef( null );
	const helpPopoverRef = useRef( null );
	const workspacePopoverRef = useRef( null );
	// Mirrors of the open flags so the document-level Escape handler can restore focus
	// to the right trigger without re-registering listeners on every toggle.
	const helpOpenRef = useRef( false );
	const workspaceOpenRef = useRef( false );
	const openMenuRef = useRef( null );
	// Mockup uses `event.detail === 0` to tell keyboard activation from a mouse click
	// and only then moves focus into the popover (plugin-dashboard.js:2124, 2162).
	const openedByKeyboard = useRef( false );
	helpOpenRef.current = helpOpen;
	workspaceOpenRef.current = workspaceOpen;
	openMenuRef.current = openMenu;

	// Keep the WordPress submenu highlight in sync with the active route.
	useEffect( () => {
		syncWpMenu( route, segments );
		setOpenMenu( null );
		setHelpOpen( false );
		setWorkspaceOpen( false );
	}, [ route, segments ] );

	// Keep the CURRENT section in view when the header row scrolls (≤1100px of app width — see
	// "Narrow-shell nav guard" in admin-extra.css). On a phone the row opened on "Dashboard Boo…"
	// whatever route was on screen, so the operator could not see where they were (T-084).
	useEffect( () => {
		const current = document.querySelector( '.ap-admin .pd-navigation [aria-current="page"]' );
		if ( current && typeof current.scrollIntoView === 'function' ) {
			current.scrollIntoView( { block: 'nearest', inline: 'nearest' } );
		}
	}, [ route ] );

	// The browser tab names the screen (first-run QA D26; persona QA T-076): WordPress printed
	// "Dashboard ‹ …" once for the SPA's single menu page. Editors and module panels prepend their
	// own name on top of this through `usePageTitle()`.
	useEffect( () => {
		setRouteTitle( routeTitleParts( route, segments, moduleRoute ) );
	}, [ route, segments, moduleRoute ] );

	// Fullscreen (ca trực): the app root goes fixed inset-0 and the WP menu folds.
	useEffect( () => {
		const root = document.getElementById( 'aponto-admin-root' );
		if ( root ) {
			root.classList.toggle( 'is-focused', focused );
		}
		document.body.classList.toggle( 'folded', focused );
		return () => {
			root?.classList.remove( 'is-focused' );
		};
	}, [ focused ] );

	// System mode follows the OS live (mockup: `systemTheme.addEventListener('change', …)`).
	useEffect( () => watchSystemScheme( setPrefersDark ), [] );

	// One writer for `data-ap-color-scheme`: mode × OS preference → light|dark.
	useEffect( () => {
		applyColorScheme( resolveColorScheme( themeMode, prefersDark ) );
	}, [ themeMode, prefersDark ] );

	// A second Aponto tab changing the preference keeps this one in step
	// (subscription contract + normalization live in lib/theme.js).
	useEffect( () => watchStoredScheme( setThemeMode ), [] );

	// Keyboard-opened popovers move focus to their first command; closing returns focus
	// to the trigger (SPEC §11: "Popovers … restore focus to their trigger after close").
	useEffect( () => {
		if ( helpOpen && openedByKeyboard.current ) {
			helpPopoverRef.current?.querySelector( 'a,button' )?.focus();
		}
	}, [ helpOpen ] );
	useEffect( () => {
		if ( workspaceOpen && openedByKeyboard.current ) {
			workspacePopoverRef.current?.querySelector( '[role="menuitem"]' )?.focus();
		}
	}, [ workspaceOpen ] );

	// Global Escape + outside-click for header menus.
	useEffect( () => {
		const onKey = ( e ) => {
			if ( e.key === 'Escape' ) {
				// Focus must leave an open header dropdown before it closes: the ported
				// mockup CSS keeps `.pd-nav-dropdown` painted while the wrap has
				// `:focus-within`, so hiding it with focus still inside would clear
				// `aria-expanded` and leave the surface on screen. Returning focus to
				// the trigger is also the mockup's own `closeHeaderMenus( true )`
				// behaviour and SPEC §11 ("restore focus to their trigger after close").
				if ( openMenuRef.current ) {
					document
						.querySelector( `[data-nav-menu-wrap="${ openMenuRef.current }"] .pd-nav-menu-trigger` )
						?.focus();
				}
				setOpenMenu( null );
				if ( workspaceOpenRef.current ) {
					setWorkspaceOpen( false );
					workspaceTriggerRef.current?.focus();
				}
				if ( helpOpenRef.current ) {
					setHelpOpen( false );
					helpTriggerRef.current?.focus();
				}
			}
		};
		const onClick = ( e ) => {
			if ( ! e.target.closest( '.pd-nav-menu-wrap' ) ) {
				setOpenMenu( null );
			}
			if ( helpRef.current && ! helpRef.current.contains( e.target ) ) {
				setHelpOpen( false );
			}
			if ( workspaceRef.current && ! workspaceRef.current.contains( e.target ) ) {
				setWorkspaceOpen( false );
			}
		};
		document.addEventListener( 'keydown', onKey );
		document.addEventListener( 'pointerdown', onClick );
		return () => {
			document.removeEventListener( 'keydown', onKey );
			document.removeEventListener( 'pointerdown', onClick );
		};
	}, [] );

	const onNavigate = useCallback( ( next ) => navigate( next ), [ navigate ] );

	const chooseTheme = ( mode ) => {
		setThemeMode( writeThemeMode( mode ) );
		setWorkspaceOpen( false );
		workspaceTriggerRef.current?.focus();
	};

	// Which settings parent the current hash points at, so the Settings ▾ menu can
	// mark it `aria-current="page"` exactly like the mockup does.
	const settingsParent = route === 'settings' ? resolveSettingsRoute( segments ).parent : '';
	const settingsItems = SETTINGS_TREE.map( ( node ) => ( {
		key: node.id,
		label: node.label,
		description: settingsMenuSubline( node ),
		current: settingsParent === node.id,
		activate: () => {
			window.location.hash = settingsPath( node.id, defaultSettingsChild( node.id ) );
		},
	} ) );

	return (
		<>
			<header className="pd-shell-header">
				<div className="pd-shell-start">
					<button className="pd-brand" type="button" aria-label="Aponto dashboard" onClick={ () => onNavigate( 'dashboard' ) }>
						<BrandLogo />
					</button>
				</div>
				<nav className={ `pd-navigation${ openMenu ? ' has-open-menu' : '' }` } aria-label="Aponto sections">
					<div className="pd-nav-daily">
						{ DAILY.map( ( item ) => <NavButton key={ item.id } item={ item } route={ route } onNavigate={ onNavigate } /> ) }
						<NavDropdown
							id="offerings"
							label="Offerings"
							items={ routeMenuItems( offerings, route, onNavigate ) }
							active={ offerings.some( ( item ) => item.id === route ) }
							openMenu={ openMenu }
							setOpenMenu={ setOpenMenu }
						/>
						<NavDropdown
							id="resources"
							label="Resources"
							items={ routeMenuItems( resources, route, onNavigate ) }
							active={ resources.some( ( item ) => item.id === route ) }
							openMenu={ openMenu }
							setOpenMenu={ setOpenMenu }
						/>
					</div>
					<div className="pd-nav-tools">
						<NavButton item={ { id: 'modules', label: 'Modules' } } route={ route } onNavigate={ onNavigate } />
						{ /* Mockup trigger: a link straight to the default section that still
						     discloses the tree on hover/focus (plugin-dashboard.js:198-199). */ }
						<NavDropdown
							id="settings"
							label="Settings"
							items={ settingsItems }
							active={ route === 'settings' }
							href={ `#${ defaultSettingsPath }` }
							alignEnd
							openMenu={ openMenu }
							setOpenMenu={ setOpenMenu }
						/>
					</div>
				</nav>
				{ /* Right cluster mirrors the mockup shell: Support first, workspace overflow
				     second, both on the compact utility scale (SPEC §6.4 — "Header Help and
				     overflow use compact icon-button scale"; "shell kebab actions use the same
				     34px wrapper, 20px Phosphor ellipsis and full text contrast"). Fullscreen is
				     a command inside the workspace menu, not a bare top-bar glyph. */ }
				<div className="pd-shell-actions">
					{ /* Support is a disclosure of links, not a menu — the mockup gives its help
					     popover no role and no aria-haspopup (index.html:100-106); only the
					     workspace overflow is a real menu. */ }
					<div className="pd-help-wrap" ref={ helpRef }>
						<button
							className="pd-icon-button pd-shell-utility"
							type="button"
							ref={ helpTriggerRef }
							aria-expanded={ helpOpen }
							aria-label="Open support menu"
							title="Support"
							onClick={ ( event ) => {
								openedByKeyboard.current = event.detail === 0;
								setWorkspaceOpen( false );
								setHelpOpen( ( v ) => ! v );
							} }
						>
							{ renderIcon( 'help' ) }
						</button>
						{ helpOpen ? (
							<div className="pd-popover" ref={ helpPopoverRef }>
								<p className="pd-popover-label">Support &amp; resources</p>
								{ config.wizardUrl ? <a href={ config.wizardUrl }>Setup wizard<span>Re-run</span></a> : null }
								<a href="https://pressmaximum.com/aponto/docs" target="_blank" rel="noreferrer noopener">Documentation<span>↗</span></a>
								<a href="https://pressmaximum.com/support" target="_blank" rel="noreferrer noopener">Contact support<span>↗</span></a>
							</div>
						) : null }
					</div>
					<div className="pd-workspace-wrap" ref={ workspaceRef }>
						<button
							className="pd-icon-button pd-shell-utility"
							type="button"
							ref={ workspaceTriggerRef }
							aria-haspopup="menu"
							aria-expanded={ workspaceOpen }
							aria-label="Open workspace menu"
							title="Workspace options"
							onClick={ ( event ) => {
								openedByKeyboard.current = event.detail === 0;
								setHelpOpen( false );
								setWorkspaceOpen( ( v ) => ! v );
							} }
						>
							{ renderIcon( 'moreVertical' ) }
						</button>
						{ workspaceOpen ? (
							<div
								className="pd-popover pd-workspace-popover"
								role="menu"
								aria-label="Workspace options"
								ref={ workspacePopoverRef }
								onKeyDown={ menuRovingKeydown }
							>
								<button
									id="fullscreenButton"
									type="button"
									role="menuitem"
									aria-label={ focused ? 'Exit full screen' : 'Enter full screen' }
									onClick={ () => {
										setFocused( ( v ) => ! v );
										setWorkspaceOpen( false );
										workspaceTriggerRef.current?.focus();
									} }
								>
									{ renderIcon( focused ? 'collapse' : 'expand' ) }
									<span>{ focused ? 'Exit full screen' : 'Enter full screen' }</span>
								</button>
								{ /* Appearance group (mockup index.html:112-116): separator, quiet
								     section label, then Light · Dark · System as menuitemradio.
								     The visible label is paired with a real `role="group"` so AT
								     announces the three as one choice instead of loose commands. */ }
								<div className="pd-popover-separator" />
								<p className="pd-popover-label" id="ap-appearance-label">Appearance</p>
								<div role="group" aria-labelledby="ap-appearance-label">
									{ THEME_MODES.map( ( mode ) => (
										<button
											key={ mode }
											type="button"
											role="menuitemradio"
											data-app-theme={ mode }
											aria-checked={ themeMode === mode }
											onClick={ () => chooseTheme( mode ) }
										>
											{ renderIcon( themeModeIcon( mode ), 'pd-theme-icon' ) }
											<span>{ THEME_LABELS[ mode ] }</span>
											<span className="pd-theme-check">
												{ themeMode === mode ? renderIcon( 'check' ) : null }
											</span>
										</button>
									) ) }
								</div>
							</div>
						) : null }
					</div>
				</div>
			</header>
			{ /* Settings is full-bleed: the mockup drops the main gutter for that route
			     (`view.classList.toggle('is-settings', …)`) so the settings rail sits flush
			     against the content-area edge. `.pd-main.is-settings { padding: 0 }` ships
			     in plugin-dashboard.css already. The in-flow inspector routes drop it the
			     same way, but structurally (admin-extra.css `.pd-main:has(…)`) so a route
			     that renders a full-page editor instead of the list keeps its gutter. */ }
			<main className={ `pd-main${ route === 'settings' ? ' is-settings' : '' }` } id="aponto-view" tabIndex="-1">
				<Route
					route={ route }
					segments={ segments }
					onNavigate={ onNavigate }
					moduleRoute={ moduleRoute }
					modules={ modules }
				/>
			</main>
		</>
	);
}

function Route( { route, segments, onNavigate, moduleRoute = null, modules = [] } ) {
	switch ( route ) {
		case 'dashboard':
			return <Dashboard onNavigate={ onNavigate } />;
		case 'bookings':
			return <Bookings segments={ segments } />;
		case 'calendar':
			return <Calendar onNavigate={ onNavigate } />;
		case 'customers':
			return <Customers />;
		case 'import-csv':
			return <CsvImport key={ segments.join( '/' ) } segments={ segments } />;
		case 'services':
			return <Services segments={ segments } onNavigate={ onNavigate } />;
		case 'staff':
			return <Staff segments={ segments } />;
		case 'settings':
			return <SettingsRoute segments={ segments } />;
		case 'modules': {
			// `#modules` is the catalog; `#modules/{code}` is that module's own settings
			// surface (D-R27). One route entry, because the second is a deep link into
			// the first — exactly how `#settings/{parent}/{child}` already works.
			const code = moduleRouteCode( segments );

			return code
				? <ModuleSettingsRoute code={ code } segments={ segments } onNavigate={ onNavigate } />
				: <ModulesApp />;
		}
		default: {
			// A module-owned screen (D-R56). The component is the module bundle's own NAMED lazy
			// chunk, so it costs the first paint nothing; `module` is its boot-data record, the
			// same prop the settings-panel registry hands a panel.
			if ( moduleRoute ) {
				const Screen = moduleRoute.component;

				return (
					<Screen
						segments={ segments }
						onNavigate={ onNavigate }
						module={ findModuleRecord( { modules }, moduleRoute.moduleCode ) }
					/>
				);
			}

			return <Placeholder route={ route } title={ ROUTE_TITLES[ route ] || 'Page' } onNavigate={ onNavigate } />;
		}
	}
}

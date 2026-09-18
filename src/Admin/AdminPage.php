<?php
/**
 * Admin UI bootstrap — WordPress menu, asset enqueue and the mount point for the
 * Aponto admin single-page app (SPEC-P1 §1.0).
 *
 * Chrome model (chốt 2026-07-12/18): app-in-content-area + top menu. The plugin
 * does NOT reproduce or restyle the WordPress chrome; it renders one root node
 * into the normal content area and lets a React app own the IA top bar + hash
 * router. WP submenu items are hash deep-links kept in sync by the app.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Admin;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Onboarding\Funnel;
use Aponto\Onboarding\WizardPage;
use Aponto\Onboarding\WizardService;
use Aponto\Plan;
use Aponto\Rest\Policy;
use Aponto\Support\AssetManifest;
use Aponto\Support\Assets;
use Aponto\Support\Settings;

/**
 * Registers the `Aponto` admin menu + submenus, enqueues the admin bundle only on
 * the plugin page, and injects the same-origin REST config the app boots from.
 */
final class AdminPage {

	/**
	 * Top-level menu + page slug. Every submenu deep-links to `admin.php?page=aponto#route`.
	 */
	public const SLUG = 'aponto';

	/**
	 * Hook suffixes WordPress assigns to the visible app page and its hidden pre-onboarding page.
	 *
	 * A URL fragment is never sent to PHP, so `admin.php?page=aponto#settings` first has to pass
	 * WordPress's access check for `page=aponto`. While onboarding is incomplete the visible menu
	 * still belongs to `aponto-setup`, but the hidden page below registers `admin_page_aponto` so
	 * Settings remains directly reachable without exposing the full IA in the sidebar.
	 *
	 * @var list<string>
	 */
	private const APP_HOOK_SUFFIXES = array(
		'toplevel_page_aponto',
		'admin_page_aponto',
	);

	/**
	 * Id of the `.ap-token-scope` wrapper that carries `data-ap-color-scheme`.
	 * The app reads it back through `assets/src/admin/lib/theme.js::themeScope()`.
	 */
	public const SCOPE_ID = 'aponto-admin-scope';

	/**
	 * Namespaced + versioned Appearance preference key. MUST stay identical to
	 * `THEME_STORAGE_KEY` in `assets/src/admin/lib/theme.js`
	 * (DESIGN-SYSTEM.md §"Persistent workspace preferences").
	 */
	public const COLOR_SCHEME_KEY = 'aponto.dashboard.color-scheme.v1';

	/**
	 * Scheme rendered before the stored preference resolves — also the value a
	 * fresh install keeps.
	 */
	public const DEFAULT_COLOR_SCHEME = 'light';

	/**
	 * The wizard page whose menu entry this class owns (menu reconciliation
	 * 2026-07-18): collapsed-to-wizard while the funnel is incomplete, hidden but
	 * URL-reachable afterwards.
	 *
	 * @var WizardPage|null
	 */
	private static ?WizardPage $wizard = null;

	/**
	 * Wire the admin hooks. Called from the Kernel only when the schema is ready
	 * (the REST surface the app depends on is gated the same way).
	 *
	 * @param WizardPage|null $wizard Onboarding wizard page (menu entry owned here).
	 */
	public static function register( ?WizardPage $wizard = null ): void {
		self::$wizard = $wizard;
		add_action( 'admin_menu', array( self::class, 'registerMenu' ) );
		add_action( 'admin_enqueue_scripts', array( self::class, 'enqueueAssets' ) );
		// Plugins-page row "Settings" link (C11 — finding U4: the first-run reflex is to click the
		// plugin's own Settings link; without it the app feels hidden). Deep-links to the SPA
		// Settings route.
		add_filter( 'plugin_action_links_' . plugin_basename( APONTO_FILE ), array( self::class, 'pluginActionLinks' ) );
		// PHP_INT_MAX: the redirect must run AFTER registerMenu (which removes the wizard submenu)
		// and BEFORE WordPress's admin-page access check — which fires at the END of
		// `wp-admin/includes/menu.php`, right after the `admin_menu` action completes (admin_init
		// would be TOO LATE: the access check wp_die()s first).
		add_action( 'admin_menu', array( self::class, 'redirectCompletedWizard' ), PHP_INT_MAX );
	}

	/**
	 * Prepend a "Settings" action link to the plugin's row on the Plugins page (C11).
	 *
	 * Points at the SPA Settings route (`admin.php?page=aponto#settings`). The hash resolves to the
	 * General tab via the app router. The app page is registered but hidden while setup is pending,
	 * so this link remains usable without adding the full Aponto IA to the WordPress sidebar.
	 *
	 * @param mixed $links Existing action links (array of HTML anchors).
	 * @return mixed Links with "Settings" prepended.
	 */
	public static function pluginActionLinks( $links ) {
		if ( ! is_array( $links ) ) {
			return $links;
		}
		$settings = sprintf(
			'<a href="%s">%s</a>',
			esc_url( admin_url( 'admin.php?page=' . self::SLUG . '#settings' ) ),
			esc_html__( 'Settings', 'aponto' )
		);
		array_unshift( $links, $settings );

		return $links;
	}

	/**
	 * A plain visit to the wizard URL AFTER setup is complete redirects to the Aponto app instead
	 * of WordPress's "Sorry, you are not allowed to access this page" error — the wizard's submenu
	 * entry is removed post-completion, and WordPress denies direct access to removed submenu pages
	 * (fleet-r1 U2 F6). Deliberate re-entry (the Settings/Dashboard "Open setup wizard" links)
	 * carries `reopen=1` and is let through.
	 */
	public static function redirectCompletedWizard(): void {
		if ( ! self::wizardVisitNeedsRedirect() ) {
			return;
		}
		wp_safe_redirect( admin_url( 'admin.php?page=' . self::SLUG ) );
		exit;
	}

	/**
	 * Whether the CURRENT request is a plain (non-`reopen`) visit to the wizard page after the
	 * funnel is finished — the only case that bounces to the app. `reopen=1` (the Settings/Dashboard
	 * re-entry links) is ALWAYS let through, in EVERY finished state: completed AND skipped both
	 * satisfy {@see Funnel::isComplete()} (U4-02 — the fix covers skipped, not just completed). A
	 * mid-flow funnel is not complete, so its wizard stays the collapsed top-level page and is never
	 * redirected either. Extracted as a pure predicate so the routing decision is unit-testable
	 * without the `exit`.
	 */
	public static function wizardVisitNeedsRedirect(): bool {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only page-slug routing; no state change.
		$page = isset( $_GET['page'] ) ? sanitize_key( (string) wp_unslash( $_GET['page'] ) ) : '';
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only routing flag.
		$reopen = isset( $_GET['reopen'] );

		return WizardPage::slug() === $page && ! $reopen && ( new Funnel() )->isComplete();
	}

	/**
	 * Register the top-level menu and the IA submenus.
	 *
	 * Onboarding gate (SPEC-P1 §4): until the funnel is complete or skipped the
	 * Aponto menu collapses to ONE item hosting the wizard. Afterwards the full IA
	 * appears and the wizard page stays registered but hidden (re-entry from
	 * Settings). Submenu items other than the default deep-link into the SPA via a
	 * hash on the same page slug; highlight sync for the active hash is client-side.
	 */
	public static function registerMenu(): void {
		$capability = Policy::MANAGE_BOOKINGS;
		$wizard     = self::$wizard;

		if ( $wizard instanceof WizardPage && ! ( new Funnel() )->isComplete() ) {
			// Collapsed setup menu: only the wizard is visible until completed or skipped.
			$hook = add_menu_page(
				__( 'Aponto', 'aponto' ),
				__( 'Aponto', 'aponto' ),
				Policy::MANAGE_SETTINGS,
				WizardPage::slug(),
				array( $wizard, 'renderPage' ),
				'dashicons-calendar-alt',
				58
			);
			$wizard->attachHook( (string) $hook );

			// Register the SPA as a hidden admin page so direct Settings links work before onboarding.
			// WordPress cannot see `#settings` (URL fragments stay in the browser), therefore the base
			// `page=aponto` slug itself must pass the admin-page access check. `null` keeps the page out
			// of every visible menu while retaining its callback and `admin_page_aponto` hook suffix.
			add_submenu_page(
				'',
				__( 'Aponto Settings', 'aponto' ),
				__( 'Aponto Settings', 'aponto' ),
				Policy::MANAGE_SETTINGS,
				self::SLUG,
				array( self::class, 'renderRoot' )
			);

			return;
		}

		add_menu_page(
			__( 'Aponto', 'aponto' ),
			__( 'Aponto', 'aponto' ),
			$capability,
			self::SLUG,
			array( self::class, 'renderRoot' ),
			'dashicons-calendar-alt',
			58
		);

		$items = array(
			'dashboard' => __( 'Dashboard', 'aponto' ),
			'bookings'  => __( 'Bookings', 'aponto' ),
			'calendar'  => __( 'Calendar', 'aponto' ),
			'customers' => __( 'Customers', 'aponto' ),
			'services'  => __( 'Services', 'aponto' ),
			'staff'     => __( 'Staff', 'aponto' ),
			'modules'   => __( 'Modules', 'aponto' ),
			'settings'  => __( 'Settings', 'aponto' ),
		);

		foreach ( $items as $route => $label ) {
			// The first submenu re-uses the parent slug so the default landing renders
			// the app (which then resolves the hash, defaulting to Dashboard). Every
			// other item is a hash deep-link on the same page.
			$menu_slug = 'dashboard' === $route ? self::SLUG : 'admin.php?page=' . self::SLUG . '#' . $route;

			add_submenu_page(
				self::SLUG,
				$label,
				$label,
				$capability,
				$menu_slug,
				'dashboard' === $route ? array( self::class, 'renderRoot' ) : ''
			);
		}

		if ( $wizard instanceof WizardPage ) {
			// Post-completion: keep the wizard URL-reachable (Settings links to it)
			// but out of the visible menu.
			$hook = add_submenu_page(
				self::SLUG,
				__( 'Setup wizard', 'aponto' ),
				__( 'Setup wizard', 'aponto' ),
				Policy::MANAGE_SETTINGS,
				WizardPage::slug(),
				array( $wizard, 'renderPage' )
			);
			$wizard->attachHook( (string) $hook );
			// Remove the menu entry EXCEPT while the wizard page itself is being requested:
			// WordPress's admin-page access check denies removed submenu pages outright, which
			// made "URL-reachable" a lie — deliberate re-entry (`reopen=1`) 403'd with the WP
			// error page (fleet-r1 U2 F6 root cause). Keeping the registration for the wizard's
			// own request makes re-entry real; every other admin page still hides the item.
			if ( ! self::requestIsWizardPage() ) {
				remove_submenu_page( self::SLUG, WizardPage::slug() );
			}
		}
	}

	/**
	 * Whether the current admin request targets the wizard page slug.
	 */
	private static function requestIsWizardPage(): bool {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only page-slug routing; no state change.
		$page = isset( $_GET['page'] ) ? sanitize_key( (string) wp_unslash( $_GET['page'] ) ) : '';

		return WizardPage::slug() === $page;
	}

	/**
	 * Render the single mount node. No server-rendered chrome: the app owns the
	 * top bar and routing. The root carries the token/theme scope classes so the
	 * `--ap-*` engine, the kit `--pmdk-*` bridge and the app theme all resolve here.
	 */
	public static function renderRoot(): void {
		// The token scope is an OUTER wrapper and `.ap-admin` is the inner mount node,
		// because the reproduced mockup CSS scopes its visual-preset rules as
		// `.ap-token-scope[data-ap-visual=v2] .ap-admin …` (descendant combinator).
		// `.pmdk-dashboard` is the kit primitives chassis (equivalent of `.ap-admin`):
		// every `.pmdk-*` data-table/primitive rule is scoped under it (B4b, Q13).
		printf(
			'<div class="ap-token-scope pmdk-theme-app" id="%1$s" data-ap-visual="v2" data-ap-color-scheme="%2$s"><div class="ap-admin pmdk-dashboard" id="aponto-admin-root">%3$s</div></div>',
			esc_attr( self::SCOPE_ID ),
			esc_attr( self::DEFAULT_COLOR_SCHEME ),
			'<div class="ap-admin-boot" role="status" aria-live="polite"><span class="spinner is-active" style="float:none"></span> ' . esc_html__( 'Loading Aponto…', 'aponto' ) . '</div>'
		);

		self::printColorSchemeBoot();
	}

	/**
	 * Resolve the persisted Appearance preference onto the token scope BEFORE first
	 * paint, so a dark workspace never flashes light while `admin.js` (footer, deferred)
	 * loads.
	 *
	 * The preference is a workspace preference, not site data: DESIGN-SYSTEM.md
	 * §"Persistent workspace preferences" puts focused mode, inspector width and the
	 * color scheme in namespaced `localStorage`, and the v4 mockup does the same. PHP
	 * cannot read that, so the server emits the neutral default above and this tiny
	 * inline script upgrades the attribute synchronously, immediately after the element
	 * exists. `system` resolves through `prefers-color-scheme`; the React shell
	 * (lib/theme.js) then owns every later change. A storage failure leaves the default
	 * in place and is swallowed — it must never block the page.
	 */
	private static function printColorSchemeBoot(): void {
		$script = sprintf(
			'(function(){try{var r=document.getElementById(%1$s);if(!r)return;var m=window.localStorage.getItem(%2$s);'
			. "if(m!=='dark'&&m!=='light'&&m!=='system')m=%3\$s;"
			. "var d=m==='system'?!!(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches):m==='dark';"
			. "r.setAttribute('data-ap-color-scheme',d?'dark':'light');}catch(e){}})();",
			wp_json_encode( self::SCOPE_ID ),
			wp_json_encode( self::COLOR_SCHEME_KEY ),
			wp_json_encode( self::DEFAULT_COLOR_SCHEME )
		);

		wp_print_inline_script_tag( $script );
	}

	/**
	 * Enqueue the admin bundle + styles and inject boot config — only on the Aponto page.
	 *
	 * @param string $hook_suffix Current admin page hook suffix.
	 */
	public static function enqueueAssets( string $hook_suffix ): void {
		if ( ! in_array( $hook_suffix, self::APP_HOOK_SUFFIXES, true ) ) {
			return;
		}

		// A shipped build contains exactly one dist variant; a dev tree with both picks the
		// running edition's ({@see Assets::editionDir()}, D-R27).
		$dist_rel = self::resolveDistRel();
		if ( '' === $dist_rel ) {
			return;
		}
		$base_dir = plugin_dir_path( APONTO_FILE ) . $dist_rel;

		$js_name  = Assets::filename( 'admin.js' );
		$css_name = Assets::filename( 'admin.css' );
		$js_file  = $base_dir . '/' . $js_name;
		$css_file = $base_dir . '/' . $css_name;
		$base_url = plugins_url( $dist_rel, APONTO_FILE );

		// Never enqueue a URL with no file behind it. A 404 on the SPA bundle is a blank admin page
		// whose only symptom is a console error; leaving the screen unenqueued at least lets WordPress
		// render its own chrome, and matches the file_exists guard the two stylesheets already had.
		if ( ! is_file( $js_file ) ) {
			return;
		}

		$asset  = array(
			'dependencies' => array( 'react', 'react-dom', 'wp-i18n' ),
			'version'      => (string) filemtime( $js_file ),
		);
		$loaded = AssetManifest::read( 'admin' );
		if ( null !== $loaded ) {
			$asset = $loaded;
		}

		wp_enqueue_script(
			'aponto-admin',
			$base_url . '/' . $js_name,
			isset( $asset['dependencies'] ) ? (array) $asset['dependencies'] : array(),
			isset( $asset['version'] ) ? (string) $asset['version'] : APONTO_VERSION,
			true
		);

		// wp-scripts extracts the kit's `style.css` import into a separate
		// `style-admin.css` chunk (its `--pmdk-*` base). Load it first; the main
		// `admin.css` (aponto tokens + kit→aponto bridge + reproduced `.pd-*`
		// chrome + calendar) layers on top. Each enqueue records its own RTL/`.min`
		// variant data through {@see Assets::addStyleVariantData()} — one decision,
		// taken from the file that was actually resolved, shared by every registered
		// stylesheet in the plugin (the wizard included).
		$kit_name = Assets::filename( 'style-admin.css' );
		$kit_css  = $base_dir . '/' . $kit_name;
		$css_deps = array();
		if ( file_exists( $kit_css ) ) {
			wp_enqueue_style(
				'aponto-admin-kit',
				$base_url . '/' . $kit_name,
				array(),
				(string) filemtime( $kit_css )
			);
			Assets::addStyleVariantData( 'aponto-admin-kit', $kit_name );
			$css_deps[] = 'aponto-admin-kit';
		}

		// The folded Notifications tab (B3) renders @wordpress/components UI, whose
		// styles are a separate core stylesheet.
		wp_enqueue_style( 'wp-components' );

		// The service editor's featured-image field opens the WP media frame
		// (`wp.media`) for the attachment picker (SPEC-P1 §1.1 §Details, Q7).
		wp_enqueue_media();

		if ( file_exists( $css_file ) ) {
			wp_enqueue_style(
				'aponto-admin',
				$base_url . '/' . $css_name,
				$css_deps,
				(string) filemtime( $css_file )
			);
			Assets::addStyleVariantData( 'aponto-admin', $css_name );
		}

		wp_add_inline_script(
			'aponto-admin',
			'window.apontoAdmin = ' . wp_json_encode( self::bootConfig() ) . ';',
			'before'
		);

		\Aponto\Support\Translations::setScriptTranslations( 'aponto-admin' );

		self::enqueueModuleBundles( $base_url );

		self::cleanRoom();
	}

	/**
	 * Enqueue the admin bundle of every module that is actually available and owns a settings
	 * surface (D-R27, 2026-08-27).
	 *
	 * A module's settings panel is a SEPARATE webpack entry (extension-surface §3.3), and there are
	 * TWO entry shapes — one per OWNING edition (D-R27 amendment, 2026-09-04 — D-R37):
	 * `assets/src/pro/{code}/index.js` → `assets/dist/{edition}/pro/{code}.js`, built only in the
	 * premium build, and `assets/src/modules/{code}/index.js` →
	 * `assets/dist/{edition}/modules/{code}.js`, built in BOTH. A FREE module cannot ride the
	 * `pro/` shape at all: distribution.json keeps `assets/src/pro/**` out of the Free zip, so its
	 * panel would be absent from the only build a free site runs — and D-R22 flipped three registry
	 * entries to `edition: free`, two of which declare `has_settings: true`. Before D-R27 nothing
	 * enqueued a module bundle at all, so a shipped module's panel could never reach the browser.
	 *
	 * This is the generic loader: it walks the registry, never names a module and never mentions a
	 * premium namespace (§5 invariant 2 — shared code that referenced one would fail the leak-grep).
	 * WHICH codes load, and from WHICH of the two directories, is decided by
	 * {@see self::moduleBundleCodes()}; this method only loads them.
	 *
	 * Every handle depends on `aponto-admin`, so the SPA — and with it the panel registry the
	 * bundle registers into (`assets/src/admin/lib/module-panels.js`) — is always evaluated first.
	 * The registry tolerates the reverse order too, but load order should not be left to chance.
	 *
	 * @param string $base_url Public URL of the resolved dist directory.
	 */
	private static function enqueueModuleBundles( string $base_url ): void {
		foreach ( self::moduleBundleCodes() as $code => $dir ) {
			$entry  = $dir . '/' . $code;
			$script = Assets::filename( $entry . '.js' );
			$asset  = AssetManifest::read( $entry );
			if ( null === $asset || ! is_file( Assets::path( $script ) ) ) {
				continue;
			}

			$dependencies   = isset( $asset['dependencies'] ) ? (array) $asset['dependencies'] : array();
			$dependencies[] = 'aponto-admin';
			$handle         = 'aponto-module-' . $code;

			wp_enqueue_script(
				$handle,
				$base_url . '/' . $script,
				array_values( array_unique( $dependencies ) ),
				isset( $asset['version'] ) ? (string) $asset['version'] : APONTO_VERSION,
				true
			);
			\Aponto\Support\Translations::setScriptTranslations( $handle );
		}
	}

	/**
	 * Registry codes whose module bundle should load on this request, each mapped to the dist
	 * SUBDIRECTORY it loads from — the whole gate of {@see self::enqueueModuleBundles()}, bound to
	 * the live registry and the live entitlement gate.
	 *
	 * The decision itself is {@see self::resolveModuleBundles()}, which takes both as parameters;
	 * this is the production binding and the seam the integration test calls by reflection.
	 *
	 * @return array<string, string> Dist subdirectory keyed by module code, in registry order.
	 */
	private static function moduleBundleCodes(): array {
		$plan = Plan::instance();

		return self::resolveModuleBundles(
			Plan::FEATURES,
			static function ( string $code ) use ( $plan ): bool {
				return $plan->has( $code );
			}
		);
	}

	/**
	 * The ordered predicate behind {@see self::moduleBundleCodes()}, over an EXPLICIT registry and
	 * an explicit entitlement gate — a pure decision, so it is directly assertable without a script
	 * queue and without a build.
	 *
	 * The predicate is deliberately ORDERED:
	 *   1. `has_settings` — a module with no settings surface has no panel to load. Checking it
	 *      FIRST also keeps the D-R22 display-only capability cards off the entitlement path, the
	 *      same ordering {@see \Aponto\Rest\Controller\ModulesController::schemaFor()} uses.
	 *   2. the bundle DIRECTORY, resolved from registry metadata (D-R27 amendment, 2026-09-04 —
	 *      D-R37). {@see Plan::isPremiumFeature()} is METADATA, not a comparison on the running
	 *      edition: a premium entry's panel is built only into `pro/` (webpack.config.js adds
	 *      `assets/src/pro/*` to the bundle graph only when `APONTO_PLAN=premium`, and
	 *      distribution.json excludes that source tree from the Free zip), a free entry's only
	 *      into `modules/`, which BOTH plans build because a free module must deliver its panel
	 *      from the Free zip. This step used to SKIP every non-premium code, which left a free
	 *      `has_settings` module — D-R22 flipped three registry entries to `edition: free` — with
	 *      no way to ship a panel at all. It resolves a PATH and grants nothing (the same
	 *      distinction {@see \Aponto\Support\Assets::editionDir()} draws), and the two directories
	 *      are disjoint: a premium code is never looked for under `modules/`, a free code never
	 *      under `pro/`. A code the canonical registry does not know resolves to NEITHER — it is
	 *      skipped, because an unknown code has no owning edition (fail-closed).
	 *   3. `$has` — THE gate (§5 invariant 3), normally `Plan::has()`. An unshipped or switched-off
	 *      module loads nothing, so no build enqueues a module panel because a file happens to be
	 *      on disk.
	 *   4. the built `.asset.php` must exist IN THE RESOLVED DIRECTORY — a code with no built
	 *      bundle is skipped rather than enqueuing a 404.
	 *
	 * Non-empty since D-R29/D-R30/D-R35/D-R36 on a premium build that built them (`reminders`,
	 * `custom_fields`, `calendar_google`, `calendar_outlook`), still empty on a Free build: every
	 * free `has_settings` entry is unshipped today, so step 3 closes on it. `payments_stripe` (P3)
	 * is the first that will open, and {@see \Aponto\Tests\Integration\ModuleBundleEnqueueTest} is
	 * what will flag that the expectation moved.
	 *
	 * THE GATE is the parameter; the registry is only FILTERED. `$has` is injected because
	 * `Plan::SHIPPED_MODULE_CODES` is a constant — a test cannot fabricate a shipped free module,
	 * so the free branch of step 2 would otherwise have no positive case until P3 ships one.
	 * `$features` narrows WHICH candidates are considered and nothing else: every code is still
	 * resolved against the canonical `Plan::FEATURES`, and a code absent from it FAILS CLOSED —
	 * skipped, never resolved, never enqueued. Without that rule an unknown code would inherit
	 * `isPremiumFeature()`'s false answer and resolve into `modules/`, which is both the wrong
	 * answer and the shape that ships in the Free zip.
	 *
	 * @param array<string, array<string, mixed>> $features Candidate registry entries keyed by
	 *                                                      module code; entries unknown to
	 *                                                      `Plan::FEATURES` are skipped.
	 * @param callable(string): bool              $has      Entitlement gate for a module code.
	 * @return array<string, string> Dist subdirectory keyed by module code, in registry order.
	 */
	private static function resolveModuleBundles( array $features, callable $has ): array {
		$bundles = array();

		foreach ( $features as $code => $meta ) {
			$code = (string) $code;
			// `has_settings` FIRST: a module with no settings surface has no panel to load, and
			// checking it first keeps the D-R22 display-only cards off the entitlement path.
			if ( true !== ( $meta['has_settings'] ?? false ) ) {
				continue;
			}
			// FAIL CLOSED on a code the canonical registry does not know: the owning edition is
			// read from `Plan::FEATURES` (Plan owns edition semantics — §5 invariant 3 forbids an
			// edition literal here), so a code that is not in it has no owning edition to resolve
			// and must not fall through into either directory.
			if ( ! isset( Plan::FEATURES[ $code ] ) ) {
				continue;
			}
			// Registry metadata decides WHERE the panel was built, never WHETHER it may load.
			$dir = Plan::isPremiumFeature( $code ) ? 'pro' : 'modules';
			if ( ! $has( $code ) ) {
				continue;
			}
			if ( ! AssetManifest::exists( $dir . '/' . $code ) ) {
				continue;
			}

			$bundles[ $code ] = $dir;
		}

		return $bundles;
	}

	/**
	 * Controlled clean room (SPEC-P1 §1.0, review P2-11) — minimal: dequeue ONLY
	 * style/script handles on a known-conflict blocklist, and ONLY on the Aponto
	 * page. The blocklist starts empty (a config seam grown from support tickets);
	 * it never dequeues everything and never removes security/core notices. The
	 * "Notices (N)" collapse surface is a later addition.
	 */
	private static function cleanRoom(): void {
		/**
		 * Filter the admin asset dequeue blocklist for Aponto pages.
		 *
		 * @param list<string> $handles Style/script handles to dequeue on the Aponto page.
		 */
		$blocklist = apply_filters( 'aponto_admin_dequeue_blocklist', array() );
		if ( ! is_array( $blocklist ) ) {
			return;
		}
		foreach ( $blocklist as $handle ) {
			$handle = (string) $handle;
			wp_dequeue_style( $handle );
			wp_dequeue_script( $handle );
		}
	}

	/**
	 * The boot config injected as `window.apontoAdmin`.
	 *
	 * A same-origin RELATIVE REST base (so 127.0.0.1 vs localhost never becomes a
	 * cross-origin request — mirrors the form harness), the REST nonce, business
	 * timezone context for the "Business time" line, currency for money formatting,
	 * a curated slice of settings the app needs synchronously at first paint, and
	 * capability booleans used only to hide controls (REST re-checks every write).
	 *
	 * @return array<string, mixed>
	 */
	private static function bootConfig(): array {
		$settings = new Settings();

		$name = (string) $settings->get( 'business.name' );
		if ( '' === $name ) {
			// Decoded human text — React re-escapes on render (Fix 3).
			$name = Settings::blogName();
		}

		$tz_string = (string) wp_timezone_string();
		$business  = array(
			'timezone'     => $tz_string,
			'timezoneCity' => self::timezoneCity( $tz_string ),
			'utcOffset'    => self::timezoneOffsetLabel(),
			'name'         => $name,
			'address'      => (string) $settings->get( 'business.address' ),
			'phone'        => (string) $settings->get( 'business.phone' ),
			'today'        => wp_date( 'Y-m-d' ),
		);

		// Union shape: the B3 notifications keys (restBase/placeholders/urlKeys/mount)
		// ride the same global so the folded NotificationsApp works unchanged.
		return NotificationsPage::bootData() + array(
			'restUrl'          => wp_make_link_relative( rest_url( 'aponto/v1' ) ),
			'nonce'            => wp_create_nonce( 'wp_rest' ),
			'adminUrl'         => admin_url( 'admin.php?page=' . self::SLUG ),
			// `reopen=1` marks a deliberate re-entry so the post-completion redirect
			// ({@see self::redirectCompletedWizard()}) lets these links through (U2 F6).
			'wizardUrl'        => admin_url( 'admin.php?page=' . WizardPage::slug() . '&reopen=1' ),
			'pageSlug'         => self::SLUG,
			'assetsUrl'        => plugins_url( 'assets', APONTO_FILE ),
			'locale'           => str_replace( '_', '-', get_user_locale() ),
			'edition'          => self::currentVariant(),
			// The PLAN edition (`free`|`premium`), which is NOT `edition` above: that one is the
			// name of the dist directory being served, a build/diagnostics fact. This is what the
			// site's licence says, read through {@see Plan::metadata()} — the comparison-free
			// accessor Plan exposes for exactly this, so no edition literal leaves Plan (§5
			// invariant 3, PHPStan `PlanBoundaryRule`).
			//
			// It drives MARKETING CHROME ONLY (founder, 2026-08-28): whether the Modules screen
			// shows upsell treatment. It is NOT an entitlement signal — what a module can DO stays
			// `available` (`Plan::has()`), and REST re-checks every write regardless.
			'planEdition'      => (string) Plan::instance()->metadata()['edition'],
			'currency'         => (string) $settings->get( 'currency' ),
			// THE CANONICAL MINOR-UNIT EXPONENT for the store currency (Codex A1, 2026-09-04).
			// Additive: an older bundle ignores it.
			//
			// The JS side used to re-derive this from `Intl.NumberFormat(...).maximumFractionDigits`,
			// and {@see Settings::currencyExponent()} claimed the two tables agreed. They do not:
			// Intl follows CLDR's *display* conventions, which round six of our menu currencies to
			// whole units (COP, HUF, IDR, PKR, MGA) and, worst of all, report IQD as 0 where ISO-4217
			// — and this plugin's storage — uses 3. Every one of those is a 100× or 1000× error in a
			// figure the browser then sends to a payment gateway: a refund typed as "25.000" KWD-style
			// against IQD would parse as 25, and an MGA amount would be scaled by 100. Money scale is
			// not a display preference, so it is shipped from the one authority that stores it.
			'currencyExponent' => Settings::currencyExponent( (string) $settings->get( 'currency' ) ),
			// The neutral global currency menu (same list as the wizard) for the Settings
			// currency select (fleet-r1 U2 FB6).
			'currencies'       => Settings::currencyChoices(),
			'business'         => $business,
			'businessHours'    => self::businessWeekly(),
			'bookingPage'      => self::bookingPage(),
			'settings'         => array(
				'defaultBookingStatus' => (string) $settings->get( 'default_booking_status' ),
				'slotStep'             => (int) $settings->get( 'slot_step_default' ),
				'minLeadMinutes'       => (int) $settings->get( 'min_lead_minutes' ),
				'maxHorizonDays'       => (int) $settings->get( 'max_horizon_days' ),
				'weekStartsOn'         => (int) $settings->get( 'week_starts_on' ),
				'dateFormat'           => (string) $settings->get( 'date_format' ),
				'timeFormat'           => (string) $settings->get( 'time_format' ),
				'phoneField'           => (string) $settings->get( 'customer_fields.phone' ),
			),
			// Settings tab/panel grouping metadata (SPEC-P1 §1.6) — the app renders schema-driven
			// tabs from this and reads the values from GET /settings. Module catalog (SPEC-P0 §3.2)
			// for the read-only Modules surface (SPEC-P1 §6). WP privacy tool deep-links for the
			// Privacy launcher (§5). None of these fit the values-only REST DTOs, hence boot data.
			'settingsSchema'   => $settings->uiSchema(),
			'modules'          => self::modulesForBoot(),
			// Integration surface (extension-surface §4.1). `integrationRedirectUri` is DERIVED, not a
			// setting: the site owner has to paste it into their own OAuth client, so the panel must be
			// able to show the exact value core will honour. `integrationNotice` is the one-shot result
			// of an OAuth return leg, read and cleared here so the SPA can toast it — the redirect URL
			// itself carries no code, token or state.
			'integration'      => array(
				'redirectUri' => \Aponto\Integration\IntegrationRegistry::redirectUri(),
				'notice'      => \Aponto\Integration\OAuthCallback::takeNotice(),
				'connections' => self::integrationConnections(),
			),
			'privacyTools'     => array(
				'export' => admin_url( 'tools.php?page=export_personal_data' ),
				'erase'  => admin_url( 'tools.php?page=erase_personal_data' ),
			),
			'caps'             => array(
				'bookings' => current_user_can( Policy::MANAGE_BOOKINGS ),
				'services' => current_user_can( Policy::MANAGE_SERVICES ),
				'staff'    => current_user_can( Policy::MANAGE_STAFF ),
				'settings' => current_user_can( Policy::MANAGE_SETTINGS ),
			),
		);
	}

	/**
	 * The module catalog for the read-only Modules surface (SPEC-P1 §6), projected from the canonical
	 * {@see Plan::FEATURES} registry (SPEC-P0 §3.2 — single source of truth). Metadata only: entitlement
	 * `edition`/`phase`, the `category` tab, whether it is an integration vs a capability (`kind`),
	 * `has_settings`, the `industries` browse tags that feed the Industry filter (D-R21) and the
	 * `status` presentation flag (D-R22). No provider/menu/toggle state — the surface is still
	 * read-only: Included/Coming-soon cards for Free, locked cards + comparison for Premium, no
	 * controls (§6, Guideline 5). Presentation copy (label/description/icon) stays JS-side.
	 *
	 * `industries` was added additively (D-R21, 2026-07-25): an older bundle simply ignores it.
	 * `status` was added the same way (D-R22, 2026-07-27) — `included` when the capability is
	 * shipped in this build ({@see Plan::isShipped()}), `planned` otherwise. It lets the
	 * Modules screen tell "Free and already here" apart from "free, not built yet" instead of
	 * rendering an all-locked catalog. Boot data only: REST `/v1` is untouched (§5 invariant 9).
	 *
	 * The shipped list moved into {@see Plan::SHIPPED_MODULE_CODES} with D-R24 (2026-08-02) so this
	 * card and the runtime gate cannot disagree: a card rendered `planned` is exactly a code
	 * {@see Plan::has()} answers false for, in EVERY edition.
	 *
	 * `available` is the ninth field (D-R27, 2026-08-27) and it is the one a CARD may key on.
	 * `status` alone cannot: {@see Plan::SHIPPED_MODULE_CODES} is edition-blind, so the moment a
	 * premium module ships, a FREE build would also report `status => included` for it and the
	 * card would drop its lock and its upsell for a capability the site does not own. `available`
	 * is the plan truth for this build — see {@see self::moduleAvailable()}.
	 *
	 * `configured`, `connected_count` and `used_count` are the remaining tiers of the integration
	 * 4-state (extension-surface §4), added additively the same way: an older bundle ignores them.
	 *
	 * `payment_mode` is the fifteenth (D-R39a) and follows the same rule: `test`/`live` for a payment
	 * gateway whose driver answers, `''` everywhere else, and an older bundle ignores it.
	 *
	 * `ready` is the sixteenth (D-R40b) and is the field that lets a card say "Setup needed" for a
	 * module that IS `configured`. The two are genuinely different: `configured` counts required
	 * fields that have a value, which is all a generic controller can know, while `ready` is the
	 * module's own answer and can be false for a reason that lives nowhere near this screen — a site
	 * currency the gateway does not accept, a webhook id registered against the other environment.
	 * `null` means the module did not answer the seam, which is not the same as `false` and must not
	 * be rendered as one.
	 *
	 * @return list<array{code:string, category:string, kind:string, edition:string, phase:string, has_settings:bool, industries:list<string>, status:'included'|'planned', available:bool, toggleable:bool, enabled:bool, configured:bool, connected_count:int, used_count:int, payment_mode:string, ready:bool|null}>
	 */
	private static function modulesForBoot(): array {
		$out    = array();
		$states = self::integrationStates();
		foreach ( Plan::FEATURES as $code => $meta ) {
			$industries = array();
			foreach ( $meta['industries'] as $industry ) {
				$industries[] = (string) $industry;
			}

			// Integration 4-state (extension-surface §4). `configured` and `connected_count` stay
			// SEPARATE fields because the card has to be able to say two different things —
			// "paste your credentials" and "now connect a staff member"; merging them collapses a
			// two-step setup into one unexplained failure. All three are zero/false for a
			// non-integration card and for one this build cannot use, so the shape is uniform.
			$integration = $states[ (string) $code ] ?? array(
				'configured'      => false,
				'connected_count' => 0,
				'used_count'      => 0,
			);

			$out[] = array(
				'code'            => (string) $code,
				'category'        => (string) $meta['category'],
				'kind'            => (string) $meta['kind'],
				'edition'         => (string) $meta['edition'],
				'phase'           => (string) $meta['phase'],
				'has_settings'    => (bool) $meta['has_settings'],
				'industries'      => $industries,
				'status'          => Plan::isShipped( (string) $code ) ? 'included' : 'planned',
				'available'       => self::moduleAvailable( (string) $code, $meta ),
				'toggleable'      => (bool) $meta['toggleable'],
				'enabled'         => self::moduleEnabled( (string) $code, $meta ),
				'configured'      => $integration['configured'],
				'connected_count' => $integration['connected_count'],
				'used_count'      => $integration['used_count'],
				// Payments only (D-R39a), additive like every field above it: '' for every other
				// card. A gateway configured with TEST keys is `configured` and `enabled` and still
				// cannot charge a real customer, and without this the panel has no way to say so.
				'payment_mode'    => 'payments' === (string) $meta['category'] ? \Aponto\Payments\PaymentRegistry::mode( (string) $code ) : '',
				// The module's OWN readiness (D-R40b), `null` when it does not answer the seam. Asked
				// for every card rather than only for payments: a calendar connector whose token was
				// revoked has the same thing to say, and one vocabulary is the point of the seam.
				'ready'           => \Aponto\Extension\ModuleStatus::readyFlag( (string) $code ),
			);
		}

		return $out;
	}

	/**
	 * The NON-SECRET connection projection, per active integration: which staff members are
	 * connected, as what account, since when, and in what state.
	 *
	 * Boot data rather than a REST route on purpose. It is read straight off the autoloaded
	 * projection (no query), every consumer needs it at first paint — the module panel's staff table
	 * AND the read-only line in the staff editor — and a dedicated route would be a second way to
	 * ask a question the page already knows the answer to. It is a page-load SNAPSHOT: the panel
	 * updates its own rows from the responses of connect/disconnect/test, and a connect round-trips
	 * through the provider anyway, which reloads the page.
	 *
	 * Nothing token-shaped is here, by construction: the projection stores only status, account
	 * label and timestamp, and tokens live sealed in `aponto_staff_meta`.
	 *
	 * @return array<string, list<array{staff_id: int, status: string, account: string, connected_at: string}>>
	 */
	private static function integrationConnections(): array {
		if ( ! isset( $GLOBALS['wpdb'] ) || ! $GLOBALS['wpdb'] instanceof \wpdb ) {
			return array();
		}

		$index = \Aponto\Integration\ConnectionStore::make()->index();
		$out   = array();
		foreach ( \Aponto\Integration\IntegrationRegistry::activeCodes() as $code ) {
			$rows = array();
			foreach ( $index[ $code ] ?? array() as $staff_id => $entry ) {
				$rows[] = array(
					'staff_id'     => (int) $staff_id,
					'status'       => (string) $entry['status'],
					'account'      => (string) $entry['account'],
					'connected_at' => (string) $entry['connected_at'],
				);
			}
			$out[ $code ] = $rows;
		}

		return $out;
	}

	/**
	 * The integration 4-state for every `integration` code this build can use (extension-surface §4).
	 *
	 * Returns an EMPTY map — and touches no integration class at all — when there is no database
	 * handle. That is not defensive padding: the Plan/boot projection is exercised in a standalone
	 * PHP process by `tests/fixtures/premium-plan-harness.php`, which has a registry and no
	 * WordPress, and connection state is genuinely unknowable there. Callers fall back to the
	 * all-false shape, which is also the correct answer for every non-integration card.
	 *
	 * @return array<string, array{configured: bool, connected_count: int, used_count: int}>
	 */
	private static function integrationStates(): array {
		if ( ! isset( $GLOBALS['wpdb'] ) || ! $GLOBALS['wpdb'] instanceof \wpdb ) {
			return array();
		}

		$state = \Aponto\Integration\CatalogState::make();
		$out   = array();
		foreach ( \Aponto\Integration\IntegrationRegistry::activeCodes() as $code ) {
			$out[ $code ] = $state->forModule( $code );
		}

		return $out;
	}

	/**
	 * The module's own on/off switch position — the `userEnabled` term of {@see Plan::has()},
	 * isolated (D-R31).
	 *
	 * DISTINCT FROM `available`, and both are needed. `available` is the whole of `has()`, so it
	 * is false for a disabled module AND for one that has not shipped; the card has to tell those
	 * two apart, because "you turned this off" and "this does not exist yet" are opposite
	 * messages. `enabled` is the switch alone.
	 *
	 * Read through {@see Plan::userEnabled()} rather than re-reading the option here. This method
	 * originally carried its own `get_option` + missing-key default — a second copy of a rule the
	 * gate already owned, and the exact shape of divergence that hurts most: REST honouring a
	 * disabled module while the screen still renders it enabled. Sharing the reader makes that
	 * disagreement unrepresentable instead of merely unlikely.
	 *
	 * A missing option key means enabled (the option records only deviations), which is why a
	 * fresh install shows every shipped module on. The D-R22 display-only cards are not switchable
	 * at all, so they short-circuit to true and never consult an option they could not appear in.
	 *
	 * @param string               $code Registry key.
	 * @param array<string, mixed> $meta Registry metadata for that key.
	 */
	private static function moduleEnabled( string $code, array $meta ): bool {
		if ( true !== $meta['toggleable'] ) {
			return true;
		}

		return Plan::instance()->userEnabled( $code );
	}

	/**
	 * Whether the site can actually USE a registry code right now — edition × shipped-ness ×
	 * the module toggle, i.e. exactly {@see Plan::has()} (D-R27, 2026-08-27).
	 *
	 * Display-only capability cards take the other branch. The six D-R22 entries
	 * (`toggleable => false`) describe P1 core code that ships unconditionally, and NOTHING may
	 * ask `Plan::has()` about them — the prohibition is enforced by the source grep in
	 * {@see \Aponto\Tests\Unit\PlanRegistryTest}. Their availability is therefore read straight
	 * off the registry `edition`, which is `free` for all six: shipped core is present in every
	 * build, so the answer is a constant true rather than a gate lookup.
	 *
	 * That branch would be WRONG for a premium display-only card — it would render locked on a
	 * build that owns it — but such an entry cannot exist: {@see \Aponto\Tests\Unit\PlanRegistryTest}
	 * pins the non-toggleable set to exactly those six codes AND asserts each one is a `free`
	 * entry, so adding a premium non-toggleable card fails the suite before it can reach here.
	 *
	 * This is presentation data, not authorization: REST re-checks every write against
	 * `Plan::has()` (§5 invariant 3, UI gating is display-only).
	 *
	 * @param string               $code Registry key.
	 * @param array<string, mixed> $meta Registry metadata for that key.
	 */
	private static function moduleAvailable( string $code, array $meta ): bool {
		if ( true !== $meta['toggleable'] ) {
			return ! Plan::isPremiumFeature( $code );
		}

		return Plan::instance()->has( $code );
	}

	/**
	 * Business-hours weekly rows (`staff_id=0` wildcard scope, SPEC-P1 §1.3) in the
	 * same `{weekday, periods[]}` shape as `GET /staff/{id}/schedule`. Injected as
	 * boot data because no REST route reads the business scope yet (the schedule
	 * endpoint 404s on staff 0) — the calendar resolves an inheriting staff's
	 * effective week against this. A weekday present with empty periods is an
	 * explicit closed day.
	 *
	 * @return list<array{weekday:int, periods:list<array{start_minute:int, end_minute:int}>}>
	 */
	private static function businessWeekly(): array {
		global $wpdb;

		$map = array();
		foreach ( ( new \Aponto\Rest\Data\ScheduleGateway( $wpdb ) )->read( 0, 0, 0 ) as $row ) {
			$date = $row['date_override'] ?? null;
			if ( null !== $date && '' !== $date ) {
				continue; // Date overrides are out of scope for the weekly grid.
			}
			$weekday = (int) $row['weekday'];
			$start   = (int) $row['start_minute'];
			$end     = (int) $row['end_minute'];
			if ( ! isset( $map[ $weekday ] ) ) {
				$map[ $weekday ] = array();
			}
			if ( ! ( 0 === $start && 0 === $end ) ) {
				$map[ $weekday ][] = array(
					'start_minute' => $start,
					'end_minute'   => $end,
				);
			}
		}

		$weekly = array();
		foreach ( $map as $weekday => $periods ) {
			$weekly[] = array(
				'weekday' => $weekday,
				'periods' => $periods,
			);
		}

		return $weekly;
	}

	/**
	 * Booking-page readiness (Dashboard card): the page the wizard created
	 * (`aponto_booking_page_id`), or null when absent/trashed.
	 *
	 * @return array{id:int, status:string, url:string, editUrl:string}|null
	 */
	private static function bookingPage(): ?array {
		$page_id = (int) get_option( WizardService::BOOKING_PAGE_OPTION, 0 );
		if ( $page_id <= 0 ) {
			return null;
		}
		$post = get_post( $page_id );
		if ( ! $post instanceof \WP_Post || 'trash' === $post->post_status ) {
			return null;
		}

		return array(
			'id'      => $page_id,
			'status'  => (string) $post->post_status,
			'url'     => (string) get_permalink( $post ),
			'editUrl' => (string) get_edit_post_link( $page_id, 'raw' ),
		);
	}

	/**
	 * Relative path of the built admin asset dir that is actually present, or '' when nothing is
	 * built. A shipped build carries exactly one variant, so the preference order is invisible
	 * there; a dev tree with both dirs serves the running edition's (D-R27).
	 *
	 * ONE resolver for the whole plugin ({@see Assets::editionDir()}). This method used to prefer
	 * `premium` while {@see Assets} preferred `free`, which is harmless in a shipped zip (one dir
	 * exists) but silently split a DEV tree that has both: the admin SPA loaded
	 * `dist/premium/admin.js` while the wizard and the booking form loaded `dist/free/*`. When only
	 * one of the two dirs had been rebuilt, the site served a stale bundle against current PHP — the
	 * beta report of 2026-07-25 ("skip does nothing / Saving spins forever" on a checkout whose
	 * premium dist was several commits behind free). Sharing the resolver makes a stale dev build
	 * consistently stale instead of a hybrid, so the mismatch cannot hide.
	 */
	private static function resolveDistRel(): string {
		$rel = 'assets/dist/' . Assets::editionDir();

		return file_exists( plugin_dir_path( APONTO_FILE ) . $rel . '/admin.js' ) ? $rel : '';
	}

	/**
	 * The built variant name (`free`|`premium`) for display/diagnostics — the name of the dist dir
	 * actually being served, which is what a "which bundle am I running" readout has to report.
	 */
	private static function currentVariant(): string {
		$dist = self::resolveDistRel();

		return '' === $dist ? 'free' : basename( $dist );
	}

	/**
	 * Human-friendly city from an IANA timezone id (`Asia/Ho_Chi_Minh` → `Ho Chi Minh`).
	 * Manual UTC offsets (`+07:00`) fall back to the raw string.
	 *
	 * @param string $tz IANA timezone id or manual offset.
	 */
	private static function timezoneCity( string $tz ): string {
		if ( '' === $tz || false === strpos( $tz, '/' ) ) {
			return $tz;
		}
		$parts = explode( '/', $tz );
		$last  = (string) end( $parts );

		return str_replace( '_', ' ', $last );
	}

	/**
	 * Current business UTC offset as a friendly label (`GMT+7`, `GMT-5:30`, `GMT`).
	 */
	private static function timezoneOffsetLabel(): string {
		$seconds = (int) wp_timezone()->getOffset( new \DateTimeImmutable( 'now' ) );
		if ( 0 === $seconds ) {
			return 'GMT';
		}
		$sign    = $seconds < 0 ? '-' : '+';
		$seconds = abs( $seconds );
		$hours   = intdiv( $seconds, 3600 );
		$minutes = intdiv( $seconds % 3600, 60 );

		return 0 === $minutes
			? sprintf( 'GMT%s%d', $sign, $hours )
			: sprintf( 'GMT%s%d:%02d', $sign, $hours, $minutes );
	}
}

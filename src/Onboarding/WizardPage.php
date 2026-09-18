<?php
/**
 * Onboarding wizard admin surface.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Onboarding;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Support\AssetManifest;
use Aponto\Support\Assets;
use Aponto\Support\Clock;
use Aponto\Support\Settings;

/**
 * The onboarding wizard admin page + its admin-ajax endpoint (SPEC-P1 §4).
 *
 * Registers a single top-level "Aponto" menu that hosts the React wizard, enqueues
 * the wizard bundle only on that screen, and exposes ONE nonce-guarded admin-ajax
 * action (`aponto_wizard`) that dispatches to {@see WizardService}. No new REST
 * route is added — the rest-contract is frozen; wizard writes go through the PHP
 * service layer with a per-step capability gate.
 *
 * The screen is also a FULL-SCREEN takeover: {@see bodyClass()} marks it so the wizard stylesheet
 * can hide the admin menu, admin bar and footer, and {@see suppressNotices()} empties the notice
 * hooks — both strictly scoped to this one screen ({@see isWizardScreen()}), nothing global.
 */
final class WizardPage {

	/**
	 * Top-level menu / page slug.
	 */
	private const MENU_SLUG = 'aponto-setup';

	/**
	 * Wizard script handle.
	 */
	private const HANDLE = 'aponto-wizard';

	/**
	 * Shared nonce + admin-ajax action name.
	 */
	private const ACTION = 'aponto_wizard';

	/**
	 * Per-step capability gate.
	 *
	 * @var array<string, string>
	 */
	private const CAPS = array(
		'state'    => 'aponto_manage_settings',
		'business' => 'aponto_manage_settings',
		'hours'    => 'aponto_manage_staff',
		'staff'    => 'aponto_manage_staff',
		'service'  => 'aponto_manage_services',
		'page'     => 'aponto_manage_settings',
		'skip'     => 'aponto_manage_settings',
		'finish'   => 'aponto_manage_settings',
		'step'     => 'aponto_manage_settings',
	);

	/**
	 * Captured menu hook suffix (so assets load only on the wizard screen).
	 *
	 * @var string
	 */
	private string $hook_suffix = '';

	/**
	 * Construct the wizard page.
	 *
	 * @param Settings $settings Core settings.
	 */
	public function __construct(
		private Settings $settings
	) {}

	/**
	 * Hook the asset enqueue and ajax endpoint. The menu entry itself is owned by
	 * {@see \Aponto\Admin\AdminPage} (2026-07-18 menu reconciliation): while the
	 * funnel is incomplete the Aponto menu collapses to just this wizard; after
	 * completion/skip the wizard stays URL-reachable (hidden submenu) for re-entry
	 * from Settings. AdminPage calls {@see attachHook()} with the registered hook
	 * suffix so assets still load only on the wizard screen.
	 */
	public function register(): void {
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue' ) );
		add_action( 'wp_ajax_' . self::ACTION, array( $this, 'handleAjax' ) );
		// Full-screen takeover (SPEC-P1 §4) — both hooks no-op on every screen but the wizard's.
		add_filter( 'admin_body_class', array( $this, 'bodyClass' ) );
		add_action( 'in_admin_header', array( $this, 'suppressNotices' ), 0 );
	}

	/**
	 * Whether the CURRENT admin request is rendering the wizard screen.
	 *
	 * The hook suffix is handed over by {@see \Aponto\Admin\AdminPage::registerMenu()} on
	 * `admin_menu`, i.e. before anything below runs, and it is the only identity the wizard screen
	 * has (the slug alone would also match the ajax endpoint and the menu-reconciliation checks).
	 * Empty suffix → not registered on this request → never claim the screen.
	 */
	private function isWizardScreen(): bool {
		if ( '' === $this->hook_suffix || ! function_exists( 'get_current_screen' ) ) {
			return false;
		}

		$screen = get_current_screen();

		return null !== $screen && $screen->id === $this->hook_suffix;
	}

	/**
	 * Mark the wizard screen so the stylesheet can take the viewport over (SPEC-P1 §4).
	 *
	 * The wizard is a first-run flow, not a settings page: it renders full-screen with the admin
	 * menu, admin bar and footer hidden (the pattern WooCommerce's setup wizard established), so
	 * nothing competes with the six steps. The hiding itself lives in `wizard.css` under this one
	 * class — no other screen can match it.
	 *
	 * @param mixed $classes Space-separated admin body classes (filters are untyped input).
	 * @return string Body classes, with the wizard marker appended on the wizard screen.
	 */
	public function bodyClass( $classes ): string {
		$classes = is_string( $classes ) ? $classes : '';

		if ( ! $this->isWizardScreen() ) {
			return $classes;
		}

		return trim( $classes . ' aponto-wizard-fullscreen' );
	}

	/**
	 * Silence admin notices on the wizard screen only (SPEC-P1 §4).
	 *
	 * A first-run wizard that opens under three unrelated plugins' "rate us" banners reads as
	 * broken, and hiding them in CSS is not enough — a notice printed outside the notice markup
	 * still consumes layout. So the notice HOOKS are emptied, and ONLY here: this runs at priority 0
	 * on `in_admin_header` — the last hook before `admin-header.php` fires the notice hooks, so
	 * everything registered up to that point is cleared. A callback added to `in_admin_header` at a
	 * later priority could still re-register a notice afterwards; that is theoretically possible and
	 * accepted, since nothing in practice registers notices that late. It returns immediately on
	 * every other screen and removes nothing globally — the very next admin page renders its
	 * notices untouched.
	 */
	public function suppressNotices(): void {
		if ( ! $this->isWizardScreen() ) {
			return;
		}

		remove_all_actions( 'admin_notices' );
		remove_all_actions( 'all_admin_notices' );
		remove_all_actions( 'user_admin_notices' );
	}

	/**
	 * The wizard page slug (menu registration lives in AdminPage).
	 */
	public static function slug(): string {
		return self::MENU_SLUG;
	}

	/**
	 * Receive the hook suffix AdminPage registered the wizard page under.
	 *
	 * @param string $hook_suffix Admin page hook suffix.
	 */
	public function attachHook( string $hook_suffix ): void {
		$this->hook_suffix = $hook_suffix;
	}

	/**
	 * Render the React mount point.
	 *
	 * NOT wrapped in `.wrap` any more (SPEC-P1 §4): that class is what pins an admin page into the
	 * narrow column beside the menu, and the wizard now owns the whole viewport. The mount node
	 * carries the product token scope so `--ap-*` resolves for the wizard's own stylesheet —
	 * `data-ap-visual="v2"` is the dashboard preset, i.e. the same palette, radii and type scale as
	 * the admin SPA (`AdminPage::renderRoot()`).
	 */
	public function renderPage(): void {
		echo '<div id="aponto-wizard-root" class="aponto-wizard ap-token-scope" data-ap-visual="v2"></div>';
	}

	/**
	 * Enqueue the wizard bundle + bootstrap data on the wizard screen only.
	 *
	 * @param string $hook Current admin page hook suffix.
	 */
	public function enqueue( string $hook ): void {
		if ( '' === $this->hook_suffix || $hook !== $this->hook_suffix ) {
			return;
		}

		$script = Assets::filename( 'wizard.js' );
		$file   = Assets::path( $script );
		if ( ! is_file( $file ) ) {
			return;
		}

		$asset  = array(
			'dependencies' => array(),
			'version'      => (string) filemtime( $file ),
		);
		$loaded = AssetManifest::read( 'wizard' );
		if ( null !== $loaded ) {
			$asset = $loaded;
		}

		wp_enqueue_script(
			self::HANDLE,
			Assets::url( $script ),
			isset( $asset['dependencies'] ) ? (array) $asset['dependencies'] : array(),
			isset( $asset['version'] ) ? (string) $asset['version'] : APONTO_VERSION,
			true
		);
		\Aponto\Support\Translations::setScriptTranslations( self::HANDLE );
		wp_enqueue_style( 'wp-components' );

		// The wizard's own chrome (SPEC-P1 §4): full-screen takeover + the `--ap-*` product
		// surface. Emitted by the wizard entry, so it exists only where the wizard does, and it
		// depends on `wp-components` so the overrides land after the core sheet it overrides.
		// {@see Assets::addStyleVariantData()} swaps in the rtlcss-generated `wizard-rtl.css` on RTL
		// locales and records the `.min` suffix when one is being served — the same single decision
		// the admin bundle uses (D8).
		$style_name = Assets::filename( 'wizard.css' );
		$style      = Assets::path( $style_name );
		if ( is_file( $style ) ) {
			wp_enqueue_style(
				self::HANDLE,
				Assets::url( $style_name ),
				array( 'wp-components' ),
				(string) filemtime( $style )
			);
			Assets::addStyleVariantData( self::HANDLE, $style_name );
		}

		wp_add_inline_script(
			self::HANDLE,
			'window.apontoWizard = ' . wp_json_encode( $this->bootstrap() ) . ';',
			'before'
		);
	}

	/**
	 * Bootstrap payload for the React app.
	 *
	 * @return array<string, mixed>
	 */
	private function bootstrap(): array {
		return array(
			// Same-origin RELATIVE ajax URL: an absolute admin_url() breaks when the
			// admin is browsed via a host that differs from siteurl (127.0.0.1 vs
			// localhost) — the same convention as the form/admin REST bases.
			'ajaxUrl'    => wp_make_link_relative( admin_url( 'admin-ajax.php' ) ),
			'action'     => self::ACTION,
			'nonce'      => wp_create_nonce( self::ACTION ),
			// The Aponto app URL: after skip (or from the "done" screen) the wizard
			// redirects here so "I'll do it myself" lands on the dashboard instead of a
			// dead-end (finding U4-01). Relative, same host convention as ajaxUrl.
			'adminUrl'   => wp_make_link_relative( admin_url( 'admin.php?page=' . \Aponto\Admin\AdminPage::SLUG ) ),
			'state'      => $this->service()->state(),
			'timezones'  => timezone_identifiers_list(),
			'currencies' => Settings::currencyChoices(),
			'weekdays'   => $this->weekdayLabels(),
			'weekStart'  => (int) get_option( 'start_of_week' ),
			// One boolean so the Staff step's copy can stop saying "Add more staff later with
			// Premium" to a site that already has multi-staff (D-R28). Additive boot data on the
			// admin-ajax payload — not REST, so invariant 9 is not in play — and copy-only. The
			// wizard remains a create-or-adopt flow for the first owner row; REST row storage is
			// separately uncapped by D-R42. This copy-only flag reads the same module gate as the
			// multi-staff assignment and notification capabilities.
			'multiStaff' => \Aponto\Plan::instance()->has( 'multi_staff' ),
		);
	}

	/**
	 * Dispatch one wizard step over admin-ajax.
	 */
	public function handleAjax(): void {
		check_ajax_referer( self::ACTION, 'nonce' );

		$do = isset( $_POST['do'] ) ? sanitize_key( wp_unslash( $_POST['do'] ) ) : '';

		if ( ! isset( self::CAPS[ $do ] ) || ! current_user_can( self::CAPS[ $do ] ) ) {
			wp_send_json_error( array( 'message' => __( 'You are not allowed to do this.', 'aponto' ) ), 403 );
		}
		if ( 'page' === $do && ! current_user_can( 'edit_pages' ) ) {
			wp_send_json_error( array( 'message' => __( 'You are not allowed to create pages.', 'aponto' ) ), 403 );
		}

		$payload = $this->payload();
		$service = $this->service();

		try {
			// Page creation returns a richer payload (it terminates the request).
			if ( 'page' === $do ) {
				wp_send_json_success(
					array(
						'page'  => $service->createBookingPage(),
						'state' => $service->state(),
					)
				);
			}

			switch ( $do ) {
				case 'business':
					$service->saveBusiness( $payload );
					break;
				case 'hours':
					$days = isset( $payload['days'] ) && is_array( $payload['days'] ) ? $payload['days'] : array();
					$service->saveHours( $days );
					break;
				case 'staff':
					$service->saveStaff( $payload );
					break;
				case 'service':
					$service->saveService( $payload );
					break;
				case 'skip':
					$service->skip();
					break;
				case 'finish':
					$service->finish();
					break;
				case 'step':
					$service->saveStep( isset( $payload['step'] ) ? (int) $payload['step'] : 0 );
					break;
				case 'state':
				default:
					break;
			}
		} catch ( WizardValidationException $invalid ) {
			// A REFUSED step, not a failed one (beta reports 2026-08-01, QA A + QA B): the values are
			// unusable, nothing was written, and the founder can fix them. Same envelope as every
			// other wizard failure — `data.message` is what `assets/src/wizard/api.js` throws and the
			// step's Notice shows — plus `data.fields` (field key => message) so the client can mark
			// the offending control inline instead of only showing the notice.
			wp_send_json_error(
				array(
					'message' => $invalid->getMessage(),
					'fields'  => $invalid->fields(),
				),
				400
			);
		} catch ( \Throwable $error ) {
			wp_send_json_error( array( 'message' => __( 'That step could not be saved. Please try again.', 'aponto' ) ), 400 );
		}

		wp_send_json_success( array( 'state' => $service->state() ) );
	}

	/**
	 * Decode the JSON `payload` POST field. Individual fields are validated and
	 * sanitized downstream in {@see WizardService} / {@see Settings::update()}.
	 *
	 * @return array<string, mixed>
	 */
	private function payload(): array {
		// The nonce is verified by check_ajax_referer() in handleAjax() before this
		// runs; each decoded field is validated/sanitized in the service layer.
		// phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- See above.
		$raw    = isset( $_POST['payload'] ) ? wp_unslash( $_POST['payload'] ) : '';
		$parsed = is_string( $raw ) ? json_decode( $raw, true ) : null;

		return is_array( $parsed ) ? $parsed : array();
	}

	/**
	 * ISO-weekday (1=Mon … 7=Sun) → localized name map for the hours grid.
	 *
	 * @return array<int, string>
	 */
	private function weekdayLabels(): array {
		global $wp_locale;
		$labels = array();
		// ISO 1..7 = Mon..Sun; $wp_locale weekday index is 0=Sun..6=Sat, so ISO 7 maps to 0.
		for ( $iso = 1; $iso <= 7; $iso++ ) {
			$wp_index       = ( 7 === $iso ) ? 0 : $iso;
			$labels[ $iso ] = isset( $wp_locale ) && is_object( $wp_locale )
				? (string) $wp_locale->get_weekday( $wp_index )
				: (string) $iso;
		}

		return $labels;
	}

	/**
	 * Build a wizard service instance.
	 */
	private function service(): WizardService {
		global $wpdb;

		return new WizardService( $wpdb, $this->settings, new Funnel(), new Clock() );
	}
}

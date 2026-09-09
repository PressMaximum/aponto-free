<?php
/**
 * Booking-form block registration + view enqueue.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Frontend;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Booking\CustomFieldSchema;
use Aponto\Payments\PaymentRegistry;
use Aponto\Support\AssetManifest;
use Aponto\Support\Assets;
use Aponto\Support\Settings;

/**
 * Registers the dynamic `aponto/booking-form` Gutenberg block (SPEC-P1 §2.1, Q11/Q12).
 *
 * The block is metadata-registered from the built `block.json` (which ships in every edition under
 * `assets/dist/{edition}/form/`), with a PHP `render_callback` that emits ONLY the widget host
 * `<div data-aponto-form data-props='…'>`. The Preact widget mounts client-side into an open
 * ShadowRoot on that host. The view bundle is enqueued — and the page-global `window.apontoForm`
 * config is localized — ONLY when a block actually renders (acceptance §7.8), so a page without the
 * block ships zero booking assets.
 *
 * `data-props` carries the block attributes (serviceId/staffId/layout + appearance
 * accent/radius/colorScheme) and NEVER any secret; the REST base + nonce live in the page-global
 * config, not per block.
 */
final class BlockRegistrar {

	/**
	 * View (front-end) script handle — the Preact widget bundle.
	 */
	private const VIEW_HANDLE = 'aponto-booking-form-view';

	/**
	 * Editor script handle — block registration + live ShadowRoot preview.
	 */
	private const EDITOR_HANDLE = 'aponto-booking-form-editor';

	/**
	 * Whether the page-global config was already printed this request (print once).
	 *
	 * @var bool
	 */
	private bool $config_printed = false;

	/**
	 * Construct the block registrar.
	 *
	 * @param Settings $settings Core settings (business info + public field policy).
	 */
	public function __construct(
		private Settings $settings
	) {}

	/**
	 * Hook registration + the editor config localizer.
	 */
	public function register(): void {
		add_action( 'init', array( $this, 'registerBlock' ) );
		add_action( 'enqueue_block_editor_assets', array( $this, 'localizeEditor' ) );
	}

	/**
	 * Register the block's scripts and the block type itself (on `init`).
	 */
	public function registerBlock(): void {
		$this->registerScript( self::VIEW_HANDLE, 'form' );
		$this->registerScript( self::EDITOR_HANDLE, 'form-editor' );

		$metadata = Assets::path( 'form/block.json' );
		if ( ! is_file( $metadata ) ) {
			return;
		}

		register_block_type(
			$metadata,
			array(
				'render_callback'       => array( $this, 'render' ),
				'editor_script_handles' => array( self::EDITOR_HANDLE ),
				'view_script_handles'   => array( self::VIEW_HANDLE ),
			)
		);
	}

	/**
	 * Dynamic render: emit the widget host and enqueue the view bundle + config
	 * (only reached when the block is present on the page).
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @return string
	 */
	public function render( array $attributes ): string {
		if ( wp_script_is( self::VIEW_HANDLE, 'registered' ) ) {
			wp_enqueue_script( self::VIEW_HANDLE );
			$this->printConfigOnce( self::VIEW_HANDLE );
		}

		$wrapper = function_exists( 'get_block_wrapper_attributes' )
			? get_block_wrapper_attributes()
			: '';

		return sprintf(
			'<div %s data-aponto-form data-props="%s"></div>',
			$wrapper, // WordPress-escaped attribute string.
			esc_attr( (string) wp_json_encode( $this->props( $attributes ) ) )
		);
	}

	/**
	 * Localize the page-global config on the editor script so the in-editor preview
	 * can reach the REST API (fired on every editor load; harmless when the block
	 * is not inserted).
	 */
	public function localizeEditor(): void {
		if (
			wp_script_is( self::EDITOR_HANDLE, 'enqueued' ) ||
			wp_script_is( self::EDITOR_HANDLE, 'registered' )
		) {
			wp_add_inline_script(
				self::EDITOR_HANDLE,
				'window.apontoForm = ' . wp_json_encode( $this->config() ) . ';',
				'before'
			);
		}
	}

	/**
	 * The per-instance host props (block attributes only — no secrets).
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @return array<string, mixed>
	 */
	private function props( array $attributes ): array {
		$layout = isset( $attributes['layout'] ) && '' !== (string) $attributes['layout']
			? (string) $attributes['layout']
			: 'default';

		$props = array( 'layout' => $layout );

		$service = isset( $attributes['serviceId'] ) ? (int) $attributes['serviceId'] : 0;
		if ( $service > 0 ) {
			$props['serviceId'] = $service;
		}
		$staff = isset( $attributes['staffId'] ) ? (int) $attributes['staffId'] : 0;
		if ( $staff > 0 ) {
			$props['staffId'] = $staff;
		}

		$appearance = array();
		$accent     = isset( $attributes['accent'] ) ? $this->sanitizeAccent( $attributes['accent'] ) : '';
		if ( '' !== $accent ) {
			$appearance['accent'] = $accent;
		}
		if ( isset( $attributes['radius'] ) && is_numeric( $attributes['radius'] ) ) {
			$appearance['radius'] = $this->clampRadius( $attributes['radius'] );
		}
		$scheme = isset( $attributes['colorScheme'] )
			? $this->sanitizeColorScheme( $attributes['colorScheme'] )
			: 'light';
		if ( 'light' !== $scheme ) {
			// `light` is the default and the widget's fallback, so it is omitted to keep the
			// emitted `data-props` byte-identical for every block saved before this attribute.
			$appearance['colorScheme'] = $scheme;
		}
		if ( array() !== $appearance ) {
			$props['appearance'] = $appearance;
		}

		return $props;
	}

	/**
	 * Server-side sanitize a block accent attribute to a canonical `#RRGGBB` hex (the shape the
	 * widget's `--ap-color-accent` token expects), or `''` to drop it. A `#RGB` shorthand is
	 * expanded to 6 digits; anything else (arbitrary CSS, `rgb()`, empty, non-string) is rejected so
	 * nothing hostile ever reaches the escaped `data-props` payload. `sanitize_hex_color`-equivalent
	 * without depending on that admin-context helper being loaded during a front-end render.
	 *
	 * @param mixed $raw Raw accent attribute.
	 */
	private function sanitizeAccent( mixed $raw ): string {
		if ( ! is_string( $raw ) ) {
			return '';
		}
		$value = trim( $raw );
		if ( 1 === preg_match( '/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/', $value, $m ) ) {
			$value = '#' . $m[1] . $m[1] . $m[2] . $m[2] . $m[3] . $m[3];
		}

		return 1 === preg_match( '/^#[0-9a-fA-F]{6}$/', $value ) ? $value : '';
	}

	/**
	 * Sanitize the block `colorScheme` attribute to the widget's allow-list.
	 *
	 * The block is the ONLY source of truth for the public form's skin (founder ruling 2026-08-01):
	 * `light` (default) or `dark`, never a device or admin-workspace preference. Anything unknown —
	 * an absent attribute on a block saved before this existed, or a legacy `auto`/`system` string —
	 * resolves to `light`, matching the v4 design reference (`docs/mockups/v4/assets/css/
	 * aponto-tokens.css` pins `html{color-scheme:light}` and scopes its dark tokens to an explicit
	 * stage).
	 *
	 * @param mixed $raw Raw colorScheme attribute.
	 */
	private function sanitizeColorScheme( mixed $raw ): string {
		if ( ! is_string( $raw ) ) {
			return 'light';
		}
		$value = strtolower( trim( $raw ) );

		return in_array( $value, array( 'light', 'dark' ), true ) ? $value : 'light';
	}

	/**
	 * Clamp a block radius attribute to an integer within `0..24` (the widget's supported control
	 * radius range). A non-numeric radius is rejected upstream, so this only bounds valid numbers.
	 *
	 * @param mixed $raw Raw radius attribute (already `is_numeric`).
	 */
	private function clampRadius( mixed $raw ): int {
		return max( 0, min( 24, (int) $raw ) );
	}

	/**
	 * The page-global widget config (`window.apontoForm`) sourced from real Settings.
	 * Shape mirrors the B1 dev harness: relative REST base, a nonce, the display
	 * locale, the business timezone (drives the D1 init rule) + name, and the public
	 * field policy (phone mode + consent).
	 *
	 * @return array<string, mixed>
	 */
	public function config(): array {
		$name = (string) $this->settings->get( 'business.name' );
		if ( '' === $name ) {
			// Decoded human text — the widget re-escapes on render (Fix 3).
			$name = Settings::blogName();
		}

		return array(
			'restUrl'  => wp_make_link_relative( rest_url( 'aponto/v1' ) ),
			'nonce'    => wp_create_nonce( 'wp_rest' ),
			'locale'   => $this->locale(),
			'business' => array(
				'timezone' => (string) wp_timezone_string(),
				'name'     => $name,
			),
			'fields'   => array(
				'phone'   => (string) $this->settings->get( 'customer_fields.phone' ),
				'consent' => array(
					'enabled' => (bool) $this->settings->get( 'consent_checkbox.enabled' ),
					'text'    => (string) $this->settings->get( 'consent_checkbox.text' ),
				),
				// The site's extra booking-form fields (D-R30). PUBLIC data by definition — the
				// widget is about to render every one of them — and validated at the boundary by
				// {@see CustomFieldSchema}, so a malformed contribution can never reach the page.
				// Always an array: Free (and any site with none configured) prints `[]` and the
				// bundle, which is byte-identical in both editions, simply renders nothing extra.
				'custom'  => ( new CustomFieldSchema( $this->settings ) )->publicPayload(),
			),
			// What the visitor may pay with, and nothing else (D-R38). Everything here is public by
			// construction: the mode, the hold length the widget quotes in its "your slot is held
			// until…" copy, and — per gateway — only the config its own driver chose to publish
			// through {@see PaymentRegistry::clientConfig()}. No secret can reach this array, and no
			// gateway appears unless it is OFFERED (shipped ∧ enabled ∧ the driver says it can
			// actually charge), because a method that fails at the last step is worse than none.
			'payments' => $this->payments(),
		);
	}

	/**
	 * The public payment block of the widget config.
	 *
	 * `mode` collapses to `off` when nothing is offered, mirroring `PaymentService::enabled()`
	 * (D-R38a(1)): a `required` site whose gateway is not configured still has to take bookings, and
	 * the widget must not render a Payment step it cannot complete. Reporting the same collapse the
	 * server enforces means the client never derives a step the route would then reject.
	 *
	 * @return array<string, mixed>
	 */
	private function payments(): array {
		$mode     = (string) $this->settings->get( 'payments.mode' );
		$gateways = array();

		if ( 'off' !== $mode ) {
			foreach ( PaymentRegistry::offeredCodes() as $code ) {
				$gateways[] = array(
					'code'   => $code,
					'label'  => self::gatewayLabel( $code ),
					'client' => PaymentRegistry::clientConfig( $code ),
				);
			}
		}

		return array(
			'mode'              => array() === $gateways ? 'off' : $mode,
			'hold_minutes'      => (int) $this->settings->get( 'payments.hold_minutes' ),
			// The ISO exponent of the site's own currency, printed UNCONDITIONALLY —
			// a site that takes no online payment still needs it (D-R39a).
			//
			// Two jobs, and neither can be done in the browser. (1) DISPLAY: `Intl`
			// carries its own digit table, and it disagrees with ISO for at least MGA
			// (Intl says 0, ISO says 2), so a widget formatting from `Intl` alone
			// prints `700` where `7.00` was stored. (2) AMOUNT: a gateway's smallest
			// unit is ITS table's, not ours ({@see \Aponto\Payments\Stripe\Money}),
			// so the browser can only convert an order total into a gateway amount if
			// it knows BOTH exponents — this is the ours half, and the gateway half
			// travels in that gateway's own `client` config.
			'currency_exponent' => Settings::currencyExponent(
				(string) $this->settings->get( 'currency' )
			),
			'gateways'          => $gateways,
		);
	}

	/**
	 * A visitor-facing name for a payment method.
	 *
	 * A FALLBACK, not the design: the widget ships its own richer copy for the gateways it knows how
	 * to render (a card method gets its "Visa, Mastercard, Amex" sub-line), and only falls back to
	 * this string for a gateway some future driver adds. Keeping the fallback here means such a
	 * gateway still shows a usable label instead of a raw module code.
	 *
	 * @param string $code Payment module code.
	 */
	private static function gatewayLabel( string $code ): string {
		if ( 'payments_stripe' === $code ) {
			return __( 'Credit / debit card', 'aponto' );
		}
		if ( 'payments_paypal' === $code ) {
			return __( 'PayPal', 'aponto' );
		}

		return __( 'Online payment', 'aponto' );
	}

	/**
	 * Print the page-global config inline on a handle exactly once per request.
	 *
	 * @param string $handle Script handle.
	 */
	private function printConfigOnce( string $handle ): void {
		if ( $this->config_printed ) {
			return;
		}
		$this->config_printed = true;
		wp_add_inline_script(
			$handle,
			'window.apontoForm = ' . wp_json_encode( $this->config() ) . ';',
			'before'
		);
	}

	/**
	 * Register a built script by its dist basename, reading deps + version from the
	 * generated `*.asset.php` manifest.
	 *
	 * @param string $handle Script handle.
	 * @param string $entry  Logical webpack entry (e.g. `form` or `form-editor`).
	 */
	private function registerScript( string $handle, string $entry ): void {
		$filename = Assets::filename( $entry . '.js' );
		$file     = Assets::path( $filename );
		if ( ! is_file( $file ) ) {
			return;
		}

		$asset  = array(
			'dependencies' => array(),
			'version'      => (string) filemtime( $file ),
		);
		$loaded = AssetManifest::read( $entry );
		if ( null !== $loaded ) {
			$asset = $loaded;
		}

		wp_register_script(
			$handle,
			Assets::url( $filename ),
			isset( $asset['dependencies'] ) ? (array) $asset['dependencies'] : array(),
			isset( $asset['version'] ) ? (string) $asset['version'] : APONTO_VERSION,
			true
		);
		\Aponto\Support\Translations::setScriptTranslations( $handle );
	}

	/**
	 * The display locale as a BCP-47 tag (e.g. `en-US`), for the widget's Intl
	 * formatters. Falls back to `en-US`.
	 */
	private function locale(): string {
		$wp  = function_exists( 'get_user_locale' )
			? get_user_locale()
			: ( function_exists( 'get_locale' ) ? get_locale() : 'en_US' );
		$bcp = str_replace( '_', '-', (string) $wp );

		return '' !== $bcp ? $bcp : 'en-US';
	}
}

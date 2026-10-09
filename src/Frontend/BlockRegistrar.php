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
use Aponto\Plan;
use Aponto\Support\AssetManifest;
use Aponto\Payments\OrderPricing;
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
 * `data-props` carries the block attributes (serviceId/staffId/locationId/layout (D-R80)/summaryMode/
 * staffLayout/stepDisplay + appearance accent/radius/colorScheme/maxWidth) and NEVER any secret; the REST base + nonce live
 * in the page-global config, not per block.
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
	 * Default card width cap in px — the widget's own `--ap-layout-max` (D-R49).
	 */
	private const DEFAULT_MAX_WIDTH = 960;

	/**
	 * How the form is presented (D-R80): the step-by-step wizard (`default`) or the one-page
	 * frame for a block pinned to one service (`one-page`).
	 *
	 * @var list<string>
	 */
	private const LAYOUTS = array( 'default', 'one-page' );

	/**
	 * Default summary placement: the sidebar is on from the first step (D-R49).
	 */
	private const DEFAULT_SUMMARY_MODE = 'always';

	/**
	 * Staff-step layouts a block may pin, beside `''` = inherit the site setting (D-R52).
	 *
	 * @var list<string>
	 */
	private const STAFF_LAYOUTS = array( 'list', 'cards' );

	/**
	 * How the form shows progress (D-R53): the compact `01 / 05` fraction shipped since P1, or
	 * the v4 mockup's horizontal macro progress. `horizontal` is the DEFAULT since the founder
	 * review of 2026-09-30; a block that wants the quiet fraction saves it explicitly.
	 *
	 * @var list<string>
	 */
	private const STEP_DISPLAYS = array( 'fraction', 'horizontal' );

	/**
	 * Default step display (D-R53; flipped to the progress rail by the founder review
	 * of 2026-09-30 — a bare "02 / 04" never said what the next step is).
	 */
	private const DEFAULT_STEP_DISPLAY = 'horizontal';

	/**
	 * Card elevation (founder review 2026-09-30): `flat` is the old hairline frame, the other
	 * three are shadow-only steps with no border. `sm` is the default.
	 */
	private const SHADOWS = array( 'flat', 'sm', 'md', 'lg' );

	/**
	 * Default card elevation.
	 */
	private const DEFAULT_SHADOW = 'sm';

	/**
	 * Longest custom heading the contact-help block accepts.
	 */
	private const CONTACT_TEXT_MAX = 80;

	/**
	 * How the appointment takes place, for the one-page intro's meeting-method line (D-R82).
	 * `''` = no line.
	 *
	 * @var list<string>
	 */
	private const MEETING_TYPES = array( 'in_person', 'phone', 'online', 'custom' );

	/**
	 * Longest meeting-method detail line the block accepts (D-R82).
	 */
	private const MEETING_TEXT_MAX = 140;

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
			self::stripBareAlignClass( $wrapper ), // WordPress-escaped attribute string.
			esc_attr( (string) wp_json_encode( $this->props( $attributes ) ) )
		);
	}

	/**
	 * Render a standalone, token-bound balance checkout and only its script dependencies.
	 *
	 * The caller has already validated the manage token. No theme hooks are run here;
	 * WordPress still owns script tags, translations and inline configuration.
	 *
	 * @param string $token Validated raw manage token.
	 */
	public function renderBalanceCheckout( string $token ): string {
		$this->registerScript( self::VIEW_HANDLE, 'form' );
		$this->printConfigOnce( self::VIEW_HANDLE );
		$html  = '<div style="--ap-edge-gap:0" data-aponto-form data-aponto-balance-token="' . esc_attr( $token ) . '" data-props="' . esc_attr( (string) wp_json_encode( $this->props( array( 'shadow' => 'flat' ) ) ) ) . '"></div>';
		$html .= '<noscript><p>' . esc_html__( 'Please enable JavaScript to pay the remaining balance.', 'aponto' ) . '</p></noscript>';

		// Isolate the printing list from unrelated scripts queued by the theme or plugins.
		// Restore bookkeeping so repeated standalone renders remain complete in tests.
		$scripts        = wp_scripts();
		$pending        = $scripts->to_do;
		$done           = $scripts->done;
		$scripts->to_do = array();
		$scripts->done  = array();
		ob_start();
		$scripts->do_items( array( self::VIEW_HANDLE ), 1 );
		$html          .= (string) ob_get_clean();
		$scripts->to_do = $pending;
		$scripts->done  = $done;

		return $html;
	}

	/**
	 * Drop a bare `align` class token from a block wrapper attribute string (D-R49).
	 *
	 * Until D-R49 the block's `align` attribute defaulted to `wide`, so choosing "None" in the editor
	 * had to serialize `align: ""` — and core's align support then emits `'align' . $value`, i.e. the
	 * junk class `align`. The default is gone, but posts saved before it still carry the empty
	 * string. Only the EXACT token is removed: `alignwide` / `alignfull` (and any other class that
	 * merely starts with those letters) are left untouched.
	 *
	 * @param string $wrapper Output of `get_block_wrapper_attributes()`.
	 */
	public static function stripBareAlignClass( string $wrapper ): string {
		$stripped = preg_replace_callback(
			'/(^|\s)class="([^"]*)"/',
			static function ( array $m ): string {
				$tokens = preg_split( '/\s+/', trim( $m[2] ) );
				$tokens = array_filter(
					false === $tokens ? array() : $tokens,
					static fn ( string $token ): bool => '' !== $token && 'align' !== $token
				);

				return $m[1] . 'class="' . implode( ' ', $tokens ) . '"';
			},
			$wrapper
		);

		return is_string( $stripped ) ? $stripped : $wrapper;
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
		// Always emitted (a block saved before D-R80 keeps byte-identical `data-props`), and now
		// allow-listed like every other attribute: anything unknown is the wizard.
		$props = array( 'layout' => self::sanitizeLayout( $attributes['layout'] ?? null ) );

		$service = isset( $attributes['serviceId'] ) ? (int) $attributes['serviceId'] : 0;
		if ( $service > 0 ) {
			$props['serviceId'] = $service;
		}
		$staff = isset( $attributes['staffId'] ) ? (int) $attributes['staffId'] : 0;
		if ( $staff > 0 ) {
			$props['staffId'] = $staff;
		}
		// Block preset location (D-R62): pins the booking to one place and removes the Location
		// step. Omitted at 0 like the two presets above, so a block saved before the attribute
		// existed emits byte-identical `data-props`. Deliberately NO page-global `location`
		// block beside `staff`: the widget needs no display setting for this step, and the
		// roster's presence in `/public/services` is the only signal it reads.
		$location = isset( $attributes['locationId'] ) ? (int) $attributes['locationId'] : 0;
		if ( $location > 0 ) {
			$props['locationId'] = $location;
		}

		// Where the booking summary lives (D-R49). Behaviour, not paint, so it rides beside
		// serviceId/staffId rather than inside `appearance`; the `always` default is omitted for the
		// same byte-identical-`data-props` reason `colorScheme: light` is.
		$summary = isset( $attributes['summaryMode'] )
			? $this->sanitizeSummaryMode( $attributes['summaryMode'] )
			: self::DEFAULT_SUMMARY_MODE;
		if ( self::DEFAULT_SUMMARY_MODE !== $summary ) {
			$props['summaryMode'] = $summary;
		}

		// Per-block Staff LAYOUT (D-R52). The only one of the staff settings that is per-block,
		// because it is the only one a single landing page might legitimately want different
		// from the site: photos, titles, profiles and the term are disclosure/vocabulary
		// decisions, and a business answers those once. `''` means inherit and is OMITTED, so a
		// block saved before this attribute existed emits byte-identical `data-props`.
		$staff_layout = isset( $attributes['staffLayout'] )
			? $this->sanitizeStaffLayout( $attributes['staffLayout'] )
			: '';
		if ( '' !== $staff_layout ) {
			$props['staffLayout'] = $staff_layout;
		}

		// How the form shows progress (D-R53). An APPEARANCE choice — the block already owns the
		// form's skin (accent, radius, colorScheme) — but it is read by the widget's RENDER, not
		// by its stylesheet, so it rides beside `summaryMode` as a top-level prop rather than
		// inside `appearance`, which is the CSS-variable bucket. The default is omitted
		// from `data-props`; the widget normalizer resolves a missing value to the same default.
		$step_display = isset( $attributes['stepDisplay'] )
			? $this->sanitizeStepDisplay( $attributes['stepDisplay'] )
			: self::DEFAULT_STEP_DISPLAY;
		if ( self::DEFAULT_STEP_DISPLAY !== $step_display ) {
			$props['stepDisplay'] = $step_display;
		}

		// The "Questions? Call …" line at the foot of the summary (founder review 2026-09-30).
		// Behaviour, not paint. ON by default and omitted then; the number itself is never a
		// block attribute — it is the business's (or the chosen location's) own phone, so it
		// cannot drift from Settings.
		if ( isset( $attributes['contactHelp'] ) && false === (bool) $attributes['contactHelp'] ) {
			$props['contactHelp'] = false;
		}
		$contact_text = isset( $attributes['contactText'] ) && is_string( $attributes['contactText'] )
			? mb_substr( sanitize_text_field( $attributes['contactText'] ), 0, self::CONTACT_TEXT_MAX )
			: '';
		if ( '' !== $contact_text ) {
			$props['contactText'] = $contact_text;
		}

		// Preselect the first available day (D-R84): passed through only when the block SAYS so,
		// because unset follows the flow (on for step by step, off for one-page) in the widget.
		if ( isset( $attributes['preselectDate'] ) && is_bool( $attributes['preselectDate'] ) ) {
			$props['preselectDate'] = $attributes['preselectDate'];
		}

		// The one-page intro's meeting-method line (D-R82): only where it can render.
		$props += self::meetingProps( $attributes, $props['layout'] );

		// The one-page host / team line (D-R85). An explicit "off" travels so the widget also
		// stops naming the visitor's own pick there; the people themselves are resolved HERE,
		// server-side, from the public roster reader — never from a new route.
		if ( 'one-page' === $props['layout'] ) {
			if ( isset( $attributes['showHost'] ) && false === $attributes['showHost'] ) {
				$props['showHost'] = false;
			}
			global $wpdb;
			$props += ( new HostLine( $this->settings, $wpdb ) )->props( $attributes, $props['layout'] );
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
		if ( isset( $attributes['maxWidth'] ) && is_numeric( $attributes['maxWidth'] ) ) {
			// A token override like accent/radius (`--ap-layout-max`), so it lives with them. The
			// 960 default is omitted: the widget's stylesheet already says so (D-R49).
			$max_width = $this->clampMaxWidth( $attributes['maxWidth'] );
			if ( self::DEFAULT_MAX_WIDTH !== $max_width ) {
				$appearance['maxWidth'] = $max_width;
			}
		}
		// Card elevation — a host attribute like colorScheme, so it lives in `appearance`; the
		// default is omitted for the same byte-identical `data-props` reason.
		$shadow = isset( $attributes['shadow'] ) && is_string( $attributes['shadow'] )
			? strtolower( trim( $attributes['shadow'] ) )
			: self::DEFAULT_SHADOW;
		if ( in_array( $shadow, self::SHADOWS, true ) && self::DEFAULT_SHADOW !== $shadow ) {
			$appearance['shadow'] = $shadow;
		}
		if ( array() !== $appearance ) {
			$props['appearance'] = $appearance;
		}

		return $props;
	}

	/**
	 * Sanitize the block `layout` attribute to `default` or `one-page` (D-R80). Anything else —
	 * absent, empty, unknown, not a string — is `default`, which is what every block saved before
	 * the value existed means. `one-page` only ASKS for the frame: the widget grants it when the
	 * service is locked and falls back to the wizard otherwise.
	 *
	 * @param mixed $raw Raw layout attribute.
	 */
	public static function sanitizeLayout( mixed $raw ): string {
		if ( ! is_string( $raw ) ) {
			return 'default';
		}
		$value = strtolower( trim( $raw ) );

		return in_array( $value, self::LAYOUTS, true ) ? $value : 'default';
	}

	/**
	 * The meeting-method props of a block (D-R82): `meetingType` from the allow-list and
	 * `meetingText` as PLAIN text — tags stripped, whitespace collapsed, capped at 140
	 * characters. Emitted only for a `one-page` block with a type set, so every other block keeps
	 * byte-identical `data-props`. The text is public on the page and the widget renders it as a
	 * text node, never as HTML and never as a link. A `custom` type with no text is no line at all,
	 * so it is dropped here too.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @param string               $layout     The sanitized layout.
	 * @return array<string, string>
	 */
	public static function meetingProps( array $attributes, string $layout ): array {
		if ( 'one-page' !== $layout ) {
			return array();
		}
		$type = isset( $attributes['meetingType'] ) && is_string( $attributes['meetingType'] )
			? strtolower( trim( $attributes['meetingType'] ) )
			: '';
		if ( ! in_array( $type, self::MEETING_TYPES, true ) ) {
			return array();
		}
		$text = isset( $attributes['meetingText'] ) && is_string( $attributes['meetingText'] )
			? mb_substr( trim( sanitize_text_field( wp_strip_all_tags( $attributes['meetingText'] ) ) ), 0, self::MEETING_TEXT_MAX )
			: '';
		if ( 'custom' === $type && '' === $text ) {
			return array();
		}
		$props = array( 'meetingType' => $type );
		if ( '' !== $text ) {
			$props['meetingText'] = $text;
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
	 * Clamp a block `maxWidth` attribute to an integer within `480..1140` px (D-R49). 480 keeps a
	 * usable single-column form; 1140 is the widest container the v4 playground ever composed, past
	 * which the design is undefined.
	 *
	 * @param mixed $raw Raw maxWidth attribute (already `is_numeric`).
	 */
	private function clampMaxWidth( mixed $raw ): int {
		return max( 480, min( 1140, (int) $raw ) );
	}

	/**
	 * Sanitize the block `summaryMode` attribute to the widget's allow-list (D-R49): `always`
	 * (default — sidebar from the first step), `step2` (the pre-D-R49 behaviour) or `off` (recap
	 * bar only). Anything unknown resolves to the default.
	 *
	 * @param mixed $raw Raw summaryMode attribute.
	 */
	private function sanitizeSummaryMode( mixed $raw ): string {
		if ( ! is_string( $raw ) ) {
			return self::DEFAULT_SUMMARY_MODE;
		}
		$value = strtolower( trim( $raw ) );

		return in_array( $value, array( 'always', 'step2', 'off' ), true )
			? $value
			: self::DEFAULT_SUMMARY_MODE;
	}

	/**
	 * Sanitize the block `staffLayout` attribute to `''` (inherit the site setting), `list` or
	 * `cards` (D-R52). Anything unknown reads as inherit — the conservative direction, because
	 * inherit is what every block saved before this attribute existed means.
	 *
	 * @param mixed $raw Raw staffLayout attribute.
	 */
	private function sanitizeStaffLayout( mixed $raw ): string {
		if ( ! is_string( $raw ) ) {
			return '';
		}
		$value = strtolower( trim( $raw ) );

		return in_array( $value, self::STAFF_LAYOUTS, true ) ? $value : '';
	}

	/**
	 * Sanitize the block `stepDisplay` attribute to `fraction` or `horizontal` (default)
	 * (D-R53). Anything unknown resolves to the default, which is what every block saved before
	 * the attribute existed means.
	 *
	 * @param mixed $raw Raw stepDisplay attribute.
	 */
	private function sanitizeStepDisplay( mixed $raw ): string {
		if ( ! is_string( $raw ) ) {
			return self::DEFAULT_STEP_DISPLAY;
		}
		$value = strtolower( trim( $raw ) );

		return in_array( $value, self::STEP_DISPLAYS, true ) ? $value : self::DEFAULT_STEP_DISPLAY;
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

		$config = array(
			'restUrl'  => wp_make_link_relative( rest_url( 'aponto/v1' ) ),
			'nonce'    => wp_create_nonce( 'wp_rest' ),
			'locale'   => $this->locale(),
			'business' => array(
				'timezone'      => (string) wp_timezone_string(),
				// Which clock the form shows by default (D-R48). Rides the same block as the
				// business zone because the two are read together by one init rule in `tz.js`;
				// it is a presentation default and carries no capability meaning, so it is as
				// public as the zone it qualifies.
				'timezone_mode' => (string) $this->settings->get( 'booking.timezone_mode' ),
				'name'          => $name,
				// The business's own public phone, for the summary's contact-help line. The
				// owner publishes it on purpose (Settings → Business); '' when unset, and the
				// widget then prints nothing.
				'phone'         => (string) $this->settings->get( 'business.phone' ),
				// The site's time format, so the form's clock is the one the mails, the cart and
				// the manage page already use (persona QA 2026-10-05, T-071). The widget reads
				// only the 12 h / 24 h choice out of it.
				'time_format'   => (string) $this->settings->get( 'time_format' ),
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
			// Boolean capability only. The catalog and validation stay behind module-owned REST routes;
			// no coupon row or rule is exposed in page source (D-R67).
			'coupons'  => array( 'enabled' => OrderPricing::couponsAvailable() ),
		);

		// How the Staff step presents itself (D-R52). PAGE-GLOBAL, not REST: these are display
		// settings the widget needs before it has a roster, and putting them in
		// `/public/services` would make a cacheable catalogue response carry presentation state.
		// OMITTED ENTIRELY without `multi_staff` — the step cannot exist there, so the key would
		// be noise on every Free page — and the widget's own defaults (list / photos on / titles
		// on / profiles off / visitor / default term) are exactly what an absent key resolves to.
		$staff = $this->staffDisplay();
		if ( null !== $staff ) {
			$config['staff'] = $staff;
		}

		return $config;
	}

	/**
	 * The public Staff-step display block, or null when this build has no `multi_staff`.
	 *
	 * Everything here is public by construction: it is what the visitor is about to see. Note
	 * that `photos`/`titles`/`profiles` are repeated here only so the WIDGET can lay out rows
	 * without them — the DISCLOSURE gates are server-side, in
	 * {@see \Aponto\Rest\Controller\PublicServicesController}, which simply does not publish
	 * the field the switch turned off.
	 *
	 * `label` is the operator's own word for a staff member ("stylist", "doctor", "trainer").
	 * `''` means "use the widget's translated default", because Aponto serves many kinds of
	 * business and no noun belongs in the product. It is decoded human text, re-escaped by the
	 * widget as a text node on render — the same handling `business.name` gets.
	 *
	 * @return array<string, mixed>|null
	 */
	private function staffDisplay(): ?array {
		if ( ! Plan::instance()->has( 'multi_staff' ) ) {
			return null;
		}

		return array(
			'layout'   => (string) $this->settings->get( 'booking.staff_layout' ),
			'photos'   => (bool) $this->settings->get( 'booking.staff_photos' ),
			'titles'   => (bool) $this->settings->get( 'booking.staff_titles' ),
			'profiles' => (bool) $this->settings->get( 'booking.staff_profiles' ),
			'choice'   => (string) $this->settings->get( 'booking.staff_choice' ),
			'label'    => (string) $this->settings->get( 'booking.staff_label' ),
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
		$mode     = PaymentRegistry::effectiveMode( (string) $this->settings->get( 'payments.mode' ) );
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
			// D-R79 (opt-in): online payment is required, nothing can take one, and the owner chose
			// not to take paid bookings unpaid. The form says so when a PAID service is chosen; the
			// route enforces it. The same predicate `POST /public/bookings` evaluates.
			'paid_unavailable'  => 'refuse' === (string) $this->settings->get( 'payments.when_unavailable' )
				&& PaymentRegistry::requiredButUnavailable( (string) $this->settings->get( 'payments.mode' ) ),
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

<?php
/**
 * Plan / edition / feature registry (Free variant).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * Free-edition Plan.
 *
 * This is the Free build variant. The dual-build pipeline (build milestone) copies
 * the checked-in Free or Premium variant over `src/Plan.php`; the two variants
 * differ ONLY in the `provider` values of {@see self::FEATURES}. In this Free variant
 * EVERY `provider` is `null` (extension-surface §8 OQ2 RESOLVED), so this file contains
 * no premium provider FQCN and passes the CI leak-grep by construction (§1.2, §2.5).
 *
 * @phpstan-type FeatureMeta array{
 *     edition: 'free'|'premium',
 *     phase: string,
 *     kind: 'capability'|'engine_flag'|'integration',
 *     has_settings: bool,
 *     toggleable: bool,
 *     menu: ?string,
 *     provider: ?class-string,
 *     category: 'booking'|'payments'|'connections'|'site_tools',
 *     industries: non-empty-list<'all'|'beauty'|'coaching'|'fitness'|'healthcare'|'events'|'venues'|'agencies'|'field_services'>
 * }
 */
final class Plan {

	/**
	 * Canonical module catalog: 28 entries × 9 metadata fields, mixed editions.
	 *
	 * No longer a premium-only list (D-R22, founder-approved 2026-07-27): the Free tier
	 * expanded — `payments_stripe`, `csv_import` and `service_catalog` moved to
	 * `edition => 'free'`, and six DISPLAY-ONLY cards were added for P1 capabilities that
	 * already ship as core code (see the "Free core capability cards" block below). Those
	 * six are catalog entries, not gates: nothing may call {@see self::has()} on them.
	 *
	 * Const-only metadata (no callables/objects — extension-surface §3.1). `provider` is a
	 * ServiceProvider FQCN string or null; here it is null for all entries (Free variant).
	 * `phase` is documentation/upsell copy only. `menu` is the slug a module contributes to
	 * the admin menu, or null. `category` is the tab of the "Modules" screen (SPEC-P0 §3.2,
	 * amended 77df91a 2026-07-12): booking | payments | connections | site_tools.
	 *
	 * `industries` is the browse-only industry vocabulary of the "Modules" screen filter
	 * (SPEC-P0 §3.2 amended by D-R21, founder-approved 2026-07-25). The sentinel `all`
	 * means "every industry" and never combines with a narrower tag. It carries NO
	 * entitlement meaning — gating stays `edition` + {@see self::has()}.
	 *
	 * @var array<string, FeatureMeta>
	 */
	public const FEATURES = array(
		'multi_staff'         => array(
			'edition'      => 'premium',
			'phase'        => 'P2a',
			'kind'         => 'capability',
			'has_settings' => false,
			'toggleable'   => true,
			'menu'         => null,
			'provider'     => null,
			'category'     => 'booking',
			'industries'   => array( 'all' ),
		),
		'calendar_google'     => array(
			'edition'      => 'premium',
			'phase'        => 'P2a',
			'kind'         => 'integration',
			'has_settings' => true,
			'toggleable'   => true,
			'menu'         => null,
			'provider'     => null,
			'category'     => 'connections',
			'industries'   => array( 'all' ),
		),
		'reminders'           => array(
			'edition'      => 'premium',
			'phase'        => 'P2a',
			'kind'         => 'capability',
			'has_settings' => true,
			'toggleable'   => true,
			'menu'         => null,
			'provider'     => null,
			'category'     => 'booking',
			'industries'   => array( 'all' ),
		),
		'calendar_outlook'    => array(
			'edition'      => 'premium',
			'phase'        => 'P2b',
			'kind'         => 'integration',
			'has_settings' => true,
			'toggleable'   => true,
			'menu'         => null,
			'provider'     => null,
			'category'     => 'connections',
			'industries'   => array( 'all' ),
		),
		'video_links'         => array(
			'edition'      => 'premium',
			'phase'        => 'P2b',
			'kind'         => 'integration',
			'has_settings' => true,
			'toggleable'   => true,
			'menu'         => null,
			'provider'     => null,
			'category'     => 'connections',
			'industries'   => array( 'coaching', 'healthcare' ),
		),
		'custom_fields'       => array(
			'edition'      => 'premium',
			'phase'        => 'P2b',
			'kind'         => 'capability',
			'has_settings' => true,
			'toggleable'   => true,
			'menu'         => null,
			'provider'     => null,
			'category'     => 'booking',
			'industries'   => array( 'beauty', 'coaching', 'healthcare', 'field_services' ),
		),
		'csv_import'          => array(
			'edition'      => 'free',
			'phase'        => 'P2b',
			'kind'         => 'capability',
			'has_settings' => false,
			'toggleable'   => true,
			'menu'         => null,
			'provider'     => null,
			'category'     => 'site_tools',
			'industries'   => array( 'all' ),
		),
		'payments_stripe'     => array(
			'edition'      => 'free',
			'phase'        => 'P3',
			'kind'         => 'integration',
			'has_settings' => true,
			'toggleable'   => true,
			'menu'         => null,
			'provider'     => null,
			'category'     => 'payments',
			'industries'   => array( 'all' ),
		),
		'payments_paypal'     => array(
			'edition'      => 'premium',
			'phase'        => 'P3',
			'kind'         => 'integration',
			'has_settings' => true,
			'toggleable'   => true,
			'menu'         => null,
			'provider'     => null,
			'category'     => 'payments',
			'industries'   => array( 'all' ),
		),
		'deposits'            => array(
			'edition'      => 'premium',
			'phase'        => 'P3',
			'kind'         => 'engine_flag',
			'has_settings' => true,
			'toggleable'   => true,
			'menu'         => null,
			'provider'     => null,
			'category'     => 'payments',
			'industries'   => array( 'beauty', 'healthcare', 'fitness', 'events', 'field_services' ),
		),
		'coupons'             => array(
			'edition'      => 'premium',
			'phase'        => 'P3',
			'kind'         => 'capability',
			'has_settings' => true,
			'toggleable'   => true,
			'menu'         => null,
			'provider'     => null,
			'category'     => 'payments',
			'industries'   => array( 'all' ),
		),
		'group_capacity'      => array(
			'edition'      => 'premium',
			'phase'        => 'P4',
			'kind'         => 'engine_flag',
			'has_settings' => true,
			'toggleable'   => true,
			'menu'         => null,
			'provider'     => null,
			'category'     => 'booking',
			'industries'   => array( 'fitness', 'events' ),
		),
		'resources'           => array(
			'edition'      => 'premium',
			'phase'        => 'P4',
			'kind'         => 'engine_flag',
			'has_settings' => true,
			'toggleable'   => true,
			'menu'         => 'resources',
			'provider'     => null,
			'category'     => 'booking',
			'industries'   => array( 'venues', 'events', 'fitness' ),
		),
		'recurring'           => array(
			'edition'      => 'premium',
			'phase'        => 'P4',
			'kind'         => 'engine_flag',
			'has_settings' => true,
			'toggleable'   => true,
			'menu'         => null,
			'provider'     => null,
			'category'     => 'booking',
			'industries'   => array( 'beauty', 'coaching', 'healthcare', 'field_services' ),
		),
		'multi_location'      => array(
			'edition'      => 'premium',
			'phase'        => 'P4',
			'kind'         => 'engine_flag',
			'has_settings' => true,
			'toggleable'   => true,
			'menu'         => null,
			'provider'     => null,
			'category'     => 'booking',
			'industries'   => array( 'beauty', 'healthcare', 'fitness', 'venues' ),
		),
		'waitlist'            => array(
			'edition'      => 'premium',
			'phase'        => 'P4',
			'kind'         => 'capability',
			'has_settings' => true,
			'toggleable'   => true,
			'menu'         => null,
			'provider'     => null,
			'category'     => 'booking',
			'industries'   => array( 'beauty', 'healthcare', 'fitness', 'events' ),
		),
		'sms'                 => array(
			'edition'      => 'premium',
			'phase'        => 'P5',
			'kind'         => 'integration',
			'has_settings' => true,
			'toggleable'   => true,
			'menu'         => null,
			'provider'     => null,
			'category'     => 'connections',
			'industries'   => array( 'all' ),
		),
		'webhooks'            => array(
			'edition'      => 'premium',
			'phase'        => 'P5',
			'kind'         => 'integration',
			'has_settings' => true,
			'toggleable'   => true,
			'menu'         => null,
			'provider'     => null,
			'category'     => 'connections',
			'industries'   => array( 'all' ),
		),
		'woo_gateway'         => array(
			'edition'      => 'premium',
			'phase'        => 'P5',
			'kind'         => 'integration',
			'has_settings' => true,
			'toggleable'   => true,
			'menu'         => null,
			'provider'     => null,
			'category'     => 'payments',
			'industries'   => array( 'all' ),
		),
		'service_catalog'     => array(
			'edition'      => 'free',
			'phase'        => 'P5',
			'kind'         => 'capability',
			'has_settings' => true,
			'toggleable'   => true,
			'menu'         => null,
			'provider'     => null,
			'category'     => 'site_tools',
			'industries'   => array( 'all' ),
		),
		'roles'               => array(
			'edition'      => 'premium',
			'phase'        => 'P5',
			'kind'         => 'capability',
			'has_settings' => true,
			'toggleable'   => true,
			'menu'         => 'roles',
			'provider'     => null,
			'category'     => 'site_tools',
			'industries'   => array( 'agencies', 'beauty', 'healthcare', 'fitness' ),
		),
		'white_label'         => array(
			'edition'      => 'premium',
			'phase'        => 'P5',
			'kind'         => 'capability',
			'has_settings' => true,
			'toggleable'   => true,
			'menu'         => null,
			'provider'     => null,
			'category'     => 'site_tools',
			'industries'   => array( 'agencies' ),
		),

		/*
		 * Free core capability cards (D-R22, founder-approved 2026-07-27).
		 *
		 * DISPLAY-ONLY catalog entries for capabilities that already shipped in P1 as CORE
		 * code — the booking form, the availability engine, the built-in 24h reminder (A5),
		 * event emails, ICS/add-to-calendar links and the bookings CSV export. They exist so
		 * the Modules screen can show what Free already includes instead of an all-locked
		 * catalog; they are NOT gates. No runtime code may start calling {@see self::has()}
		 * on these codes: the capabilities are unconditional core, so a gate would introduce
		 * an off switch that the shipped code does not honour. Hence `toggleable => false`,
		 * `has_settings => false`, `menu => null`, `provider => null`.
		 */
		'booking_form'        => array(
			'edition'      => 'free',
			'phase'        => 'P1',
			'kind'         => 'capability',
			'has_settings' => false,
			'toggleable'   => false,
			'menu'         => null,
			'provider'     => null,
			'category'     => 'booking',
			'industries'   => array( 'all' ),
		),
		'availability_engine' => array(
			'edition'      => 'free',
			'phase'        => 'P1',
			'kind'         => 'capability',
			'has_settings' => false,
			'toggleable'   => false,
			'menu'         => null,
			'provider'     => null,
			'category'     => 'booking',
			'industries'   => array( 'all' ),
		),
		'booking_reminder'    => array(
			'edition'      => 'free',
			'phase'        => 'P1',
			'kind'         => 'capability',
			'has_settings' => false,
			'toggleable'   => false,
			'menu'         => null,
			'provider'     => null,
			'category'     => 'booking',
			'industries'   => array( 'all' ),
		),
		'email_notifications' => array(
			'edition'      => 'free',
			'phase'        => 'P1',
			'kind'         => 'capability',
			'has_settings' => false,
			'toggleable'   => false,
			'menu'         => null,
			'provider'     => null,
			'category'     => 'connections',
			'industries'   => array( 'all' ),
		),
		'ics_export'          => array(
			'edition'      => 'free',
			'phase'        => 'P1',
			'kind'         => 'capability',
			'has_settings' => false,
			'toggleable'   => false,
			'menu'         => null,
			'provider'     => null,
			'category'     => 'connections',
			'industries'   => array( 'all' ),
		),
		'csv_export'          => array(
			'edition'      => 'free',
			'phase'        => 'P1',
			'kind'         => 'capability',
			'has_settings' => false,
			'toggleable'   => false,
			'menu'         => null,
			'provider'     => null,
			'category'     => 'site_tools',
			'industries'   => array( 'all' ),
		),
	);

	/**
	 * Registry codes whose capability is actually SHIPPED in this build — the one shipped-ness
	 * truth for BOTH the presentation `status` field of the Modules screen and the runtime gate
	 * (D-R24, founder-approved 2026-08-02). Everything not listed is `planned`.
	 *
	 * D-R24: edition alone no longer implies capability. `has()` answers false for a code whose
	 * module has not shipped, in EVERY edition — a premium build must not lift a Free cap for a
	 * module whose admin UI does not exist (the 1.0.0 premium zip is Free + the update channel).
	 *
	 * MAINTENANCE: extend this list whenever a phase ships a module, in the SAME commit that ships
	 * it — adding the code here is what turns `has()` on. It holds the six P1 core capability cards
	 * (D-R22) plus every premium module shipped since; the rest join as P2…P5 land.
	 *
	 * NOTE the two reminder entries are DIFFERENT things and both belong here: `booking_reminder` is
	 * the D-R22 display-only card for the Free 24h email reminder that has always shipped, while
	 * `reminders` is the premium advanced-reminder module (custom offsets + follow-ups). The premium
	 * one is edition-gated by `editionAllows()`; the free card is not gated by anything, because
	 * nothing may gate on a display-only card (D-R22).
	 *
	 * @var list<string>
	 */
	public const SHIPPED_MODULE_CODES = array(
		'booking_form',
		'availability_engine',
		'booking_reminder',
		'email_notifications',
		'ics_export',
		'csv_export',
		// P2a, 2026-08-27 (D-R28; ownership corrected by D-R41/D-R42): operational multi-staff. PHP
		// storage has no numeric cap; Free's singleton count lives only in Staff.jsx. The provider
		// contributes no-autolink behavior; assignment/notification call Plan::has() directly. This
		// code remains in the cross-edition list so the
		// Free Modules catalog may describe the separately distributed add-on honestly.
		'multi_staff',
		// P4, pulled forward 2026-09-09 (D-R43): named-location CRUD and its module panel live
		// entirely in the separately distributed Premium provider. Core retains only read DTOs,
		// schema and engine seams so downgrade never hides existing booking data.
		'multi_location',
		// P2a, 2026-08-27 (D-R29): advanced reminders — admin-defined reminder steps with custom
		// offsets before the start and follow-ups after the end. The Free 24h email reminder is core
		// and unaffected; this code gates the module that adds steps beside it.
		'reminders',
		// P2b, 2026-08-27 (D-R30): extra booking-form fields. Core renders, validates and stores the
		// answers generically; this code gates the module that owns the DEFINITIONS and their admin
		// panel, and with it the `custom_fields` contribution to `aponto_public_form_fields`.
		'custom_fields',
		// P2a, 2026-09-03 (D-R35): two-way Google Calendar sync. The free-shipped half — the
		// `Aponto\Integration` plumbing, the connect/disconnect/test routes, the shared OAuth
		// callback, the remote busy adapter and the outbound event sync — is provider-agnostic and
		// registers unconditionally; this code gates the premium DRIVER and its admin panel,
		// and with them every per-key verb dispatch for `calendar_google` (D-R34).
		'calendar_google',
		// P2b, 2026-09-03 (D-R36): two-way Outlook / Microsoft 365 calendar sync. DRIVER-ONLY on the
		// same free-shipped `Aponto\Integration` plumbing D-R34 landed — not one core seam moved to
		// add a second calendar, which is the claim D-R34 made and this code is the receipt for. As
		// with Google, this code gates the premium DRIVER and its admin panel, and with them every
		// per-key verb dispatch for `calendar_outlook`.
		'calendar_outlook',
		// P3, 2026-09-04 (D-R39): Stripe payments. `payments_stripe` is `edition: free` (D-R22), and
		// the Free zip excludes `src/Pro/` — so its DRIVER is core code gated on `Plan::has()`, not a
		// `ServiceProvider`. The free-shipped half — the `Aponto\Payments`
		// registry, dispatch, state machine, ledger, routes and cron — is gateway-agnostic and
		// registers unconditionally; this code gates the driver and its admin panel, and with them
		// every per-key verb dispatch for `payments_stripe` (D-R38).
		'payments_stripe',
		// P3, 2026-09-04 (D-R40): PayPal payments. DRIVER-ONLY on the same free-shipped
		// `Aponto\Payments` core D-R38 landed — Orders v2, created and captured SERVER-side, with the
		// hold, ledger, webhook lease and refund use case untouched. That is the claim D-R38 made and
		// this code is the receipt for. `payments_paypal` is `edition: premium`, so unlike
		// `payments_stripe` its driver is a `ServiceProvider` under `src/Pro/` (the D-R35 shape); this
		// code gates that provider and its admin panel, and with them every per-key verb dispatch for
		// `payments_paypal` (D-R38).
		'payments_paypal',
	);

	/**
	 * Core ServiceProvider FQCNs registered unconditionally on boot.
	 *
	 * Edition-level providers that must boot independently of a module toggle. Free has none;
	 * Premium's generated variant owns its update, translation, and multi-staff policy providers.
	 *
	 * @var array<int, class-string<\Aponto\Extension\ServiceProvider>>
	 */
	private const CORE_PROVIDERS = array();

	/**
	 * Option key: per-module enabled flags (array<string,bool>; missing key = enabled).
	 */
	public const MODULES_ENABLED_OPTION = 'aponto_modules_enabled';

	/**
	 * Memoised singleton.
	 *
	 * @var self|null
	 */
	private static ?self $instance = null;

	/**
	 * Resolved edition: 'free' | 'premium'.
	 *
	 * @var 'free'|'premium'
	 */
	private string $edition;

	/**
	 * True when dev-mode requested premium but the Pro files are absent (degraded to free).
	 *
	 * @var bool
	 */
	private bool $requested_premium_unavailable;

	/**
	 * Private constructor; use {@see self::instance()}.
	 *
	 * @param 'free'|'premium' $edition                       Resolved edition.
	 * @param bool             $requested_premium_unavailable Whether premium was requested but unavailable.
	 */
	private function __construct( string $edition, bool $requested_premium_unavailable ) {
		$this->edition                       = $edition;
		$this->requested_premium_unavailable = $requested_premium_unavailable;
	}

	/**
	 * Resolve the singleton, honouring APONTO_DEV + the `aponto_dev_edition` option (§3.3).
	 *
	 * In this Free variant every registry provider is null, so {@see self::proAvailable()}
	 * is always false: requesting the premium edition in dev-mode degrades to free and raises
	 * an admin notice instead of fataling.
	 */
	public static function instance(): self {
		if ( null !== self::$instance ) {
			return self::$instance;
		}

		$edition                       = 'free';
		$requested_premium_unavailable = false;

		if ( APONTO_DEV ) {
			$requested = (string) get_option( 'aponto_dev_edition', 'free' );
			if ( 'premium' === $requested ) {
				if ( self::proAvailable() ) {
					$edition = 'premium';
				} else {
					$requested_premium_unavailable = true;
				}
			}
		}

		self::$instance = new self( $edition, $requested_premium_unavailable );

		return self::$instance;
	}

	/**
	 * Reset the memoised singleton. Test-only seam.
	 *
	 * @internal
	 */
	public static function reset(): void {
		self::$instance = null;
	}

	/**
	 * Pin an edition in the test process without weakening production resolution.
	 *
	 * @internal
	 * @param 'free'|'premium' $edition Test edition.
	 * @throws \LogicException Outside the test process.
	 */
	public static function setEditionForTesting( string $edition ): void {
		if ( ! defined( 'APONTO_TESTING' ) || ! APONTO_TESTING ) {
			throw new \LogicException( 'Plan test seam is unavailable in production.' );
		}
		self::$instance = new self( $edition, false );
	}

	/**
	 * The resolved edition.
	 *
	 * @return 'free'|'premium'
	 */
	public function edition(): string {
		return $this->edition;
	}

	/**
	 * Whether a registry code is a PREMIUM-edition entry (D-R27).
	 *
	 * A METADATA read, not a gate: it answers "which edition owns this module" — the same question
	 * the registry `edition` field answers — and it is deliberately independent of the RUNNING
	 * edition, of shipped-ness and of the user toggle. Entitlement is {@see self::has()} and
	 * nothing else (§5 invariant 3).
	 *
	 * It lives HERE because Plan owns edition semantics: the PHPStan `PlanBoundaryRule` bans
	 * `'premium' === …` literals everywhere else, so a caller that needs to know whether a registry
	 * entry is a paid one asks Plan instead of spelling the literal itself. Unknown codes answer
	 * false.
	 *
	 * @param string $feature Registry key.
	 */
	public static function isPremiumFeature( string $feature ): bool {
		if ( ! isset( self::FEATURES[ $feature ] ) ) {
			return false;
		}

		return 'premium' === self::FEATURES[ $feature ]['edition'];
	}

	/**
	 * Built-asset directory preference for this edition, most preferred first (D-R27).
	 *
	 * NOT a gate — it selects a BUILD ARTIFACT, not a capability. A shipped zip carries exactly one
	 * `assets/dist/{edition}` directory (distribution.json), so the order is invisible in
	 * production; it decides only what a DEV tree with BOTH dirs serves. It must serve the edition
	 * it is running, or `assets/dist/premium/pro/{code}.js` — the only place a premium module's
	 * admin panel lives — is unreachable and premium module work cannot be run against the working
	 * tree at all (docs/operations/premium-dev-mode.md).
	 *
	 * The order is a fallback CHAIN, not a requirement: {@see \Aponto\Support\Assets::editionDir()}
	 * takes the first directory that exists, so a premium build with only the free bundles built
	 * keeps working instead of 404-ing every asset.
	 *
	 * @return list<string> Directory names under `assets/dist/`, most preferred first.
	 */
	public function assetDirPreference(): array {
		return 'premium' === $this->edition ? array( 'premium', 'free' ) : array( 'free', 'premium' );
	}

	/**
	 * Public, comparison-free plan metadata for diagnostics.
	 *
	 * @return array{edition:'free'|'premium'}
	 */
	public function metadata(): array {
		return array( 'edition' => $this->edition );
	}

	/**
	 * Edition-level providers that must register even while schema maintenance is active.
	 *
	 * @return list<class-string<\Aponto\Extension\ServiceProvider>>
	 */
	public function editionProviders(): array {
		return self::CORE_PROVIDERS;
	}

	/**
	 * Whether a registry code's capability actually SHIPPED in this build (D-R24).
	 *
	 * Public so the presentation layer ({@see \Aponto\Admin\AdminPage::modulesForBoot()}) and the
	 * gate read the SAME truth — a card that says "planned" can never be a capability REST hands
	 * out. Unknown codes are not shipped.
	 *
	 * @param string $feature Registry key.
	 */
	public static function isShipped( string $feature ): bool {
		return in_array( $feature, self::SHIPPED_MODULE_CODES, true );
	}

	/**
	 * Whether a feature is available: edition allows it AND its module has SHIPPED AND the user has
	 * it enabled.
	 *
	 * The shipped-ness term is D-R24 (founder-approved 2026-08-02): edition alone no longer implies
	 * capability. QA on the 1.0.0 zips found the premium build blocking "Add staff" in the admin UI
	 * (the catalog correctly says `multi_staff` is `planned`, phase P2a) while REST lifted the staff
	 * cap by edition and created a staff row the UI cannot manage. The disagreement is fixed HERE, in
	 * the Plan truth, so every gate inherits it (§5 invariant 3 — all gating goes through `has()`;
	 * no controller learns about shipped-ness).
	 *
	 * The term is edition-independent by design: it does not weaken Free (a Free build could never
	 * reach a premium capability anyway) and it does not change the DISPLAY-ONLY capability cards
	 * (D-R22), which are shipped P1 core and keep answering true. The enabled-toggle semantics are
	 * untouched: a shipped module the user switched off still answers false, exactly as before.
	 *
	 * Unknown feature keys return false (defensive — forward-compat with newer registries).
	 *
	 * @param string $feature Registry key.
	 */
	public function has( string $feature ): bool {
		if ( ! isset( self::FEATURES[ $feature ] ) ) {
			return false;
		}

		return $this->editionAllows( $feature ) && self::isShipped( $feature ) && $this->userEnabled( $feature );
	}

	/**
	 * ServiceProvider FQCNs to register this request.
	 *
	 * Registry-derived providers are gated by {@see self::has()} (so the Free variant returns
	 * none); third-party providers added via `aponto_register_providers` pass through and are
	 * authoritatively gated (existence + moduleCode ↔ registry + has()) by the Kernel.
	 *
	 * @return list<class-string<\Aponto\Extension\ServiceProvider>>
	 */
	public function providers(): array {
		$providers = self::CORE_PROVIDERS;

		foreach ( self::FEATURES as $code => $meta ) {
			// The Premium build variant fills these with Pro FQCNs; in the Free variant they are null.
			// phpcs:ignore Generic.Commenting.DocComment.MissingShort -- Inline PHPStan type annotation.
			/** @var ?class-string<\Aponto\Extension\ServiceProvider> $provider */
			$provider = $meta['provider'];
			if ( is_string( $provider ) && $this->has( $code ) ) {
				$providers[] = $provider;
			}
		}

		/**
		 * Filter the ServiceProvider FQCNs discovered before conditional boot.
		 *
		 * @param list<class-string<\Aponto\Extension\ServiceProvider>> $providers Provider FQCNs.
		 */
		$providers = apply_filters( 'aponto_register_providers', $providers );

		if ( ! is_array( $providers ) ) {
			return array();
		}

		// phpcs:ignore Generic.Commenting.DocComment.MissingShort -- Inline PHPStan type annotation for the filtered list.
		/** @var list<class-string<\Aponto\Extension\ServiceProvider>> $unique */
		$unique = array_values( array_unique( $providers ) );

		return $unique;
	}

	/**
	 * Whether a provider belongs to the edition-level core list.
	 *
	 * @param class-string $provider Provider FQCN.
	 */
	public function isCoreProvider( string $provider ): bool {
		// @phpstan-ignore-next-line Free variant intentionally has no edition-level providers.
		return in_array( $provider, self::CORE_PROVIDERS, true );
	}

	/**
	 * True when dev-mode requested the premium edition but the Pro files are absent.
	 *
	 * The Kernel uses this to render a non-fatal admin notice (§3.3).
	 */
	public function requestedPremiumButUnavailable(): bool {
		return $this->requested_premium_unavailable;
	}

	/**
	 * Whether the current EDITION unlocks a feature, ignoring shipped-ness and the user toggle.
	 *
	 * Public since D-R31, because the module enable/disable route needs exactly this term and
	 * cannot use {@see self::has()}: a module the user switched OFF answers `has() === false`, so
	 * gating the toggle on `has()` would make disabling a module permanent. The route's predicate
	 * is instead `toggleable` + {@see self::isShipped()} + THIS — the terms that describe whether
	 * a module could ever run here, independent of whether it is running now.
	 *
	 * Kept inside Plan because it compares the edition literal, which §5 invariant 3 and the
	 * PHPStan `PlanBoundaryRule` reserve for this class. Unknown codes answer false.
	 *
	 * @param string $feature Registry key.
	 */
	public function editionAllows( string $feature ): bool {
		if ( ! isset( self::FEATURES[ $feature ] ) ) {
			return false;
		}
		$required = self::FEATURES[ $feature ]['edition'];

		return 'free' === $required || 'premium' === $this->edition;
	}

	/**
	 * Whether the user has left a feature enabled (missing catalog key = enabled).
	 *
	 * THE single reader of the module on/off switch (D-R31). Public so the admin boot projection
	 * reads the flag through the SAME code the gate does, instead of re-implementing
	 * `get_option` + the missing-key default beside it. Those were two copies of one rule, and a
	 * drift between them is invisible in exactly the worst way: REST honours a disabled module
	 * while the screen still shows it enabled. One reader makes that disagreement unrepresentable.
	 *
	 * This is the toggle term ALONE — not entitlement. Callers that mean "can the site use this"
	 * want {@see self::has()}, which multiplies this by edition and shipped-ness.
	 *
	 * @param string $feature Registry key.
	 */
	public function userEnabled( string $feature ): bool {
		$flags = get_option( self::MODULES_ENABLED_OPTION, array() );
		if ( ! is_array( $flags ) || ! array_key_exists( $feature, $flags ) ) {
			return true;
		}

		return (bool) $flags[ $feature ];
	}

	/**
	 * Whether any registry provider resolves to a loadable class.
	 *
	 * Deliberately avoids naming the premium namespace so the Free variant passes leak-grep: in
	 * the Free variant all providers are null (returns false); in the Premium variant the merged
	 * FQCN strings are probed here.
	 */
	private static function proAvailable(): bool {
		// @phpstan-ignore-next-line Free variant intentionally has no edition-level providers.
		foreach ( self::CORE_PROVIDERS as $provider ) {
			if ( class_exists( $provider ) ) {
				return true;
			}
		}

		foreach ( self::FEATURES as $meta ) {
			// phpcs:ignore Generic.Commenting.DocComment.MissingShort -- Inline PHPStan type annotation.
			/** @var ?class-string $provider */
			$provider = $meta['provider'];
			if ( is_string( $provider ) && class_exists( $provider ) ) {
				return true;
			}
		}

		return false;
	}
}

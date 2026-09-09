<?php
/**
 * Application kernel.
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

use Aponto\Booking\ManageToken;
use Aponto\Booking\TokenGenerator;
use Aponto\Database\Migrator;
use Aponto\Extension\ServiceProvider;
use Aponto\Installation\Cron;
use Aponto\Installation\Installer;
use Aponto\Support\Clock;
use Aponto\Support\Container;
use Aponto\Support\Logger;
use Aponto\Support\Settings;

/**
 * Boots the plugin: wires lifecycle hooks, the cleanup cron, admin notices, then registers the
 * ServiceProviders of enabled modules.
 *
 * Fail-closed runtime gate (R2-3): when the current site's schema is not ready — version behind
 * target or a recorded migration error — the Kernel boots in MAINTENANCE MODE: only the install/
 * retry machinery (lifecycle hooks, `admin_init` upgrade retry) and admin notices are registered;
 * providers, the cron handler and any future REST/public surface are NOT. This closes the gap
 * where a half-installed site (e.g. a multisite blog whose `wp_initialize_site` install failed)
 * would otherwise run runtime code against missing tables.
 *
 * No shared file (this Kernel included) ever references the premium namespace — provider FQCNs
 * arrive only as strings from {@see Plan::providers()} (§1.2), so the Free zip passes leak-grep
 * by construction.
 */
final class Kernel {

	/**
	 * Shared service container.
	 *
	 * @var Container
	 */
	private Container $container;

	/**
	 * Whether this request booted in maintenance mode (schema not ready).
	 *
	 * @var bool
	 */
	private bool $maintenance_mode = false;

	/**
	 * Optional edition-provider list used by the integration test harness.
	 *
	 * @var list<class-string<ServiceProvider>>|null
	 */
	private ?array $edition_provider_override;

	/**
	 * Construct the kernel.
	 *
	 * @param Plan                                     $plan                      Resolved plan/edition.
	 * @param list<class-string<ServiceProvider>>|null $edition_provider_override Test-only provider override.
	 */
	public function __construct( private Plan $plan, ?array $edition_provider_override = null ) {
		$this->container                 = new Container();
		$this->edition_provider_override = $edition_provider_override;
	}

	/**
	 * Boot the plugin — fully when the schema is ready, otherwise in maintenance mode.
	 */
	public function boot(): void {
		$this->registerCoreServices();
		$this->registerLifecycleHooks();
		$this->registerLoggerHooks();
		$this->registerEditionProviders();
		add_action( 'admin_notices', array( $this, 'renderNotices' ) );
		add_filter( 'site_status_tests', array( $this, 'registerSiteHealthTests' ) );

		if ( defined( 'WP_CLI' ) && WP_CLI ) {
			\Aponto\Cli\Commands::register();
		}

		if ( ! self::schemaReady() ) {
			// Maintenance mode: install/retry machinery only — no providers, no cron handler,
			// no runtime surface until the schema reaches the target shape.
			$this->maintenance_mode = true;

			return;
		}

		add_action( Cron::HOOK, array( Cron::class, 'run' ) );
		$this->registerRuntime();
		$this->registerProviders();
	}

	/**
	 * Register the runtime surface exposed only when the schema is ready (§6, §7): the REST API, the
	 * public manage/cancel token page (SPEC-P1 §3.4) and the privacy hooks. Notifications need no
	 * listener — every essential email is queued INSIDE the write transaction (V3 outbox) and
	 * flushed/cron-retried from the ledger.
	 */
	private function registerRuntime(): void {
		global $wpdb;
		add_action( 'rest_api_init', array( \Aponto\Rest\Bootstrap::class, 'register' ) );
		( new \Aponto\Frontend\BookingManagePage() )->register();
		( new \Aponto\Admin\NotificationsPage() )->register();
		\Aponto\Privacy\PersonalData::register( $wpdb );

		// Integration plumbing (extension-surface §4/§5, D-R34): the remote busy adapter, the outbound
		// event sync and its cron, the settings-schema bridge and the shared OAuth callback. Free-
		// shipped and provider-agnostic — it names no module and no premium class; a driver is just a
		// set of per-key filter callbacks. Inert on a site with no connection.
		\Aponto\Integration\Integrations::register();

		// Payment core (extension-surface §5b, D-R38): the per-key driver dispatch, the order payment
		// state machine, the transaction ledger and the payments tick. Free-shipped and
		// gateway-agnostic — it names no provider; a driver is a set of per-key filter callbacks.
		// Inert on a site that takes no online payments (the tick is not scheduled while no hold
		// exists, and the public routes 404 on the registry allow-list).
		\Aponto\Payments\Payments::register();

		// Onboarding funnel goal events (fire even when the wizard is skipped).
		( new \Aponto\Onboarding\Funnel() )->register();

		// Keep the Free promise real: auto-connect every newly created service to the single
		// staff so it is immediately bookable, whatever surface created it (fleet-r1 Fix 1).
		( new \Aponto\Onboarding\ServiceStaffAutolink( $wpdb ) )->register();

		$settings = $this->container->get( Settings::class );
		$wizard   = null;
		if ( $settings instanceof Settings ) {
			// Public booking-form block (SPEC-P1 §2.1) + onboarding wizard admin
			// surface (§4). Both are runtime-only (need the schema ready). The
			// wizard's MENU entry is owned by AdminPage (collapse-to-wizard gate).
			( new \Aponto\Frontend\BlockRegistrar( $settings ) )->register();
			$wizard = new \Aponto\Onboarding\WizardPage( $settings );
			$wizard->register();
		}

		if ( is_admin() ) {
			// Admin SPA (SPEC-P1 §1.0) — menu + enqueue, gated the same way as REST
			// since the app boots against the `aponto/v1` surface.
			\Aponto\Admin\AdminPage::register( $wizard );
		}
	}

	/**
	 * Whether the current site's schema is ready for runtime: core version at target AND no
	 * recorded migration error. Per-site options, so each multisite blog gates independently.
	 */
	public static function schemaReady(): bool {
		if ( (int) get_option( Migrator::VERSION_OPTION, 0 ) < Migrator::SCHEMA_VERSION ) {
			return false;
		}

		return false === get_option( Migrator::ERROR_OPTION, false );
	}

	/**
	 * Whether this request booted in maintenance mode.
	 */
	public function isInMaintenanceMode(): bool {
		return $this->maintenance_mode;
	}

	/**
	 * Shared container.
	 */
	public function container(): Container {
		return $this->container;
	}

	/**
	 * The resolved Plan.
	 */
	public function plan(): Plan {
		return $this->plan;
	}

	/**
	 * Register Aponto's Site Health checks.
	 *
	 * The REST-7 key-material condition used to be an admin notice on every screen, which greeted
	 * brand-new users with wp-config jargon on first activation (founder call 2026-08-03: first run
	 * must be quiet). Site Health is WordPress' own surface for exactly this kind of technical,
	 * non-urgent recommendation — the plugin degrades safely without the key (emails still send;
	 * encrypted retry storage and derived manage links are skipped), so nothing needs to shout.
	 *
	 * @param array<string, array<string, array<string, mixed>>> $tests Site Health test map.
	 * @return array<string, array<string, array<string, mixed>>>
	 */
	public function registerSiteHealthTests( array $tests ): array {
		$tests['direct']['aponto_secure_auth_key'] = array(
			'label' => __( 'Aponto can store notification payloads encrypted', 'aponto' ),
			'test'  => array( $this, 'secureAuthKeyTest' ),
		);

		$tests['direct']['aponto_manage_token_secret'] = array(
			'label' => __( 'Aponto can put a booking-management link in every email', 'aponto' ),
			'test'  => array( $this, 'manageTokenSecretTest' ),
		);

		return $tests;
	}

	/**
	 * Site Health test: can this site still derive manage links? (D-R39d, QA run 2 FINDING-1)
	 *
	 * The condition it exists for is INVISIBLE from anywhere else. When the derivation secret cannot
	 * be opened, `{manage_link}` and `{payment_link}` self-strip and the mail goes out without them —
	 * which on the "complete your payment" reminder means a deadline and no way to meet it, and the
	 * only evidence is an email nobody on the site ever sees.
	 *
	 * DETECTION IS AUTOMATIC, REPAIR IS NOT (D-R39d). Replacing the secret from runtime traffic would
	 * break a multi-node deployment whose nodes carry different but usable keys — each opens only its
	 * own blob, so the nodes would rotate the shared option back and forth indefinitely. So this test
	 * names the command (`wp aponto fixer`) and a person decides. It also reports a rotation for a
	 * window afterwards, because an operator who has just changed a key is the one person who might
	 * want to change it back.
	 *
	 * Read-only on purpose: {@see ManageToken::diagnose()} never mints, rotates or writes. Site
	 * Health is a diagnosis, and a diagnosis that changes the patient is not one.
	 *
	 * @return array<string, mixed> Site Health result shape.
	 */
	public function manageTokenSecretTest(): array {
		global $wpdb;
		$tokens  = new ManageToken( $wpdb, new TokenGenerator() );
		$state   = $tokens->diagnose();
		$rotated = $tokens->rotatedAt();

		$result = array(
			'label'       => __( 'Aponto can put a booking-management link in every email', 'aponto' ),
			'status'      => 'good',
			'badge'       => array(
				'label' => __( 'Security', 'aponto' ),
				'color' => 'blue',
			),
			'description' => sprintf( '<p>%s</p>', esc_html__( 'Aponto can rebuild each booking’s management link, so every customer email can carry one.', 'aponto' ) ),
			'actions'     => '',
			'test'        => 'aponto_manage_token_secret',
		);

		if ( ManageToken::STATE_NO_KEY === $state ) {
			// Already reported, with the wp-config instructions, by the key-material test above.
			// Saying it twice in different words would send an operator looking for two problems.
			$result['description'] = sprintf( '<p>%s</p>', esc_html__( 'Booking-management links can only be sent in the first email on this site, because there is no unique SECURE_AUTH_KEY. See the SECURE_AUTH_KEY check above.', 'aponto' ) );

			return $result;
		}

		if ( ManageToken::STATE_UNOPENABLE === $state ) {
			$result['status']      = 'recommended';
			$result['label']       = __( 'Aponto cannot read its booking-link secret', 'aponto' );
			$result['description'] = sprintf(
				'<p>%s</p><p><code>wp aponto fixer</code></p>',
				esc_html__( 'Aponto’s booking-link secret no longer opens under this site’s SECURE_AUTH_KEY, so customer emails are going out without a management link or a payment link. This happens when the key in wp-config.php changes — after a site copy, a restore, or a manual key rotation. If the key change was intended, run the repair command below: it replaces the secret so new bookings get links again, and keeps the old one. If it was NOT intended — or this site runs on several servers — put the original SECURE_AUTH_KEY back instead, which also restores links for existing bookings. Aponto never replaces the secret on its own, because a running request cannot tell those two cases apart.', 'aponto' )
			);

			return $result;
		}

		// A rotation is worth reporting for a WINDOW, not forever: after a month the site has moved
		// on and the old key is not coming back.
		$window = 30 * DAY_IN_SECONDS;
		if ( $rotated > 0 && ( time() - $rotated ) < $window ) {
			$result['status']      = 'recommended';
			$result['label']       = __( 'Aponto replaced its booking-link secret recently', 'aponto' );
			$result['description'] = sprintf(
				'<p>%s</p>',
				esc_html__( 'Aponto’s booking-link secret was replaced by a repair run, so new bookings get management links again. Bookings made before the change cannot have their links rebuilt unless the original SECURE_AUTH_KEY is restored — the previous secret is kept in the aponto_manage_token_secret_prev option in case it is. If you did not change the key deliberately, check whether wp-config.php was replaced.', 'aponto' )
			);
		}

		return $result;
	}

	/**
	 * Site Health test: is `SECURE_AUTH_KEY` real key material? (REST-7)
	 *
	 * @return array<string, mixed> Site Health result shape.
	 */
	public function secureAuthKeyTest(): array {
		$auth_key = defined( 'SECURE_AUTH_KEY' ) ? (string) SECURE_AUTH_KEY : '';
		$usable   = \Aponto\Support\Crypto::isUsableKeyMaterial( $auth_key );

		$result = array(
			'label'       => __( 'Aponto can store notification payloads encrypted', 'aponto' ),
			'status'      => 'good',
			'badge'       => array(
				'label' => __( 'Security', 'aponto' ),
				'color' => 'blue',
			),
			'description' => sprintf( '<p>%s</p>', esc_html__( 'SECURE_AUTH_KEY is set, so Aponto encrypts stored notification payloads and can retry failed emails.', 'aponto' ) ),
			'actions'     => '',
			'test'        => 'aponto_secure_auth_key',
		);

		if ( ! $usable ) {
			$result['status']      = 'recommended';
			$result['label']       = __( 'Aponto works best with a unique SECURE_AUTH_KEY', 'aponto' );
			$result['description'] = sprintf(
				'<p>%s</p>',
				esc_html__( 'SECURE_AUTH_KEY in wp-config.php is missing or still the placeholder. Aponto keeps working — bookings and emails are unaffected — but failed emails cannot be stored encrypted for retry, and booking-management links can only be sent in the first email. Most hosts set this key automatically; if yours did not, ask your host how to replace the WordPress security keys in wp-config.php.', 'aponto' )
			);
		}

		return $result;
	}

	/**
	 * Render admin notices: dev-mode degradation and migration failures (§3.3, §4.1). The REST-7
	 * key-material condition deliberately does NOT render here — see registerSiteHealthTests().
	 */
	public function renderNotices(): void {
		if ( $this->plan->requestedPremiumButUnavailable() ) {
			printf(
				'<div class="notice notice-warning"><p>%s</p></div>',
				esc_html__(
					'Aponto: the premium edition was requested (APONTO_DEV) but the Pro files are missing. Running in Free mode.',
					'aponto'
				)
			);
		}

		$error = get_option( Migrator::ERROR_OPTION, false );
		if ( is_array( $error ) && isset( $error['migration'] ) ) {
			printf(
				'<div class="notice notice-error"><p>%s</p></div>',
				esc_html(
					sprintf(
						/* translators: %s: migration identifier. */
						__( 'Aponto: a database migration did not complete (%s). It will be retried automatically.', 'aponto' ),
						(string) $error['migration']
					)
				)
			);
		}
	}

	/**
	 * Register core container bindings.
	 */
	private function registerCoreServices(): void {
		$this->container->instance( Plan::class, $this->plan );
		$this->container->bind( Clock::class, static fn (): Clock => new Clock() );
		$this->container->bind( Settings::class, static fn (): Settings => new Settings() );
		$this->container->bind(
			Logger::class,
			fn ( Container $container ): Logger => new Logger( $container->get( Settings::class ), $container->get( Clock::class ) )
		);
	}

	/** Register diagnostic emitters and the cron expiry check, including maintenance mode. */
	private function registerLoggerHooks(): void {
		$logger = $this->container->get( Logger::class );
		if ( ! $logger instanceof Logger ) {
			return;
		}
		add_action(
			Cron::HOOK,
			static function () use ( $logger ): void {
				$logger->disableIfExpired();
			},
			1
		);
		add_action(
			'aponto_reservation_anomaly',
			static function ( string $anomaly, array $context ) use ( $logger ): void {
				if ( 'rate_counter_unavailable' === $anomaly ) {
					$logger->log( 'aponto_service_unavailable', 'error', 'Abuse-control storage is unavailable; request refused (fail-closed).', $context );
					return;
				}
				$logger->log( 'aponto_reservation_anomaly', 'error', 'Reservation recovery anomaly detected.', array_merge( array( 'anomaly' => $anomaly ), $context ) );
			},
			10,
			2
		);
		add_action(
			'aponto_migration_failure',
			static function ( string $migration, int $version ) use ( $logger ): void {
				$logger->log(
					'aponto_migration_failed',
					'error',
					'Database migration failed.',
					array(
						'migration'         => $migration,
						'last_good_version' => $version,
					)
				);
			},
			10,
			2
		);
		add_action(
			'aponto_notification_send_failure',
			static function ( int $delivery_id, string $reason ) use ( $logger ): void {
				$logger->log(
					'aponto_notification_send_failed',
					'error',
					'Notification delivery failed.',
					array(
						'delivery_id' => $delivery_id,
						'reason'      => $reason,
					)
				);
			},
			10,
			2
		);
	}

	/**
	 * Register activation / deactivation / new-site / upgrade hooks.
	 */
	private function registerLifecycleHooks(): void {
		register_activation_hook( APONTO_FILE, array( Installer::class, 'activate' ) );
		register_deactivation_hook( APONTO_FILE, array( Installer::class, 'deactivate' ) );
		add_action( 'wp_initialize_site', array( Installer::class, 'newSite' ), 20 );
		add_action( 'admin_init', array( Installer::class, 'maybeUpgrade' ) );
		add_action( 'admin_init', array( \Aponto\Onboarding\ActivationRedirect::class, 'maybeRedirect' ), 20 );
	}

	/**
	 * Instantiate and register enabled module providers, injecting their migration manifests into
	 * the core migration pass.
	 *
	 * Every provider — including the third-party ones contributed through the
	 * `aponto_register_providers` filter — is validated here: it must be a real ServiceProvider
	 * subclass, its `moduleCode()` must be a CLAIMABLE registry code (see
	 * {@see self::isClaimableModuleCode()}, which rejects the D-R22 display-only cards), the plan
	 * must grant it, and no earlier provider may already own the code.
	 */
	private function registerProviders(): void {
		$manifests = array();
		$owners    = array();

		foreach ( $this->plan->providers() as $fqcn ) {
			if ( ! class_exists( $fqcn ) || ! is_subclass_of( $fqcn, ServiceProvider::class ) ) {
				continue;
			}
			if ( $this->plan->isCoreProvider( $fqcn ) ) {
				continue; // Edition-level providers were registered before the maintenance gate.
			}

			$code = $fqcn::moduleCode();
			if ( ! self::isClaimableModuleCode( $code ) || ! $this->plan->has( $code ) ) {
				continue;
			}
			if ( isset( $owners[ $code ] ) ) {
				$logger = $this->container->get( Logger::class );
				if ( $logger instanceof Logger ) {
					$logger->log(
						'aponto_duplicate_module_provider',
						'warning',
						'Duplicate module provider owner was rejected.',
						array(
							'module_code' => $code,
							'owner'       => $owners[ $code ],
							'rejected'    => $fqcn,
						)
					);
				}
				continue;
			}
			$owners[ $code ] = $fqcn;

			$provider = new $fqcn();
			$provider->register( $this );

			foreach ( $provider->migrations() as $manifest ) {
				$manifests[] = $manifest;
			}
		}

		if ( array() === $manifests ) {
			return;
		}

		add_filter(
			'aponto_module_migrations',
			static function ( array $existing ) use ( $manifests ): array {
				return array_merge( $existing, $manifests );
			}
		);
	}

	/**
	 * Whether a module code may be CLAIMED by a ServiceProvider.
	 *
	 * A provider contributed through `aponto_register_providers` names the registry entry it
	 * implements. Two registry facts disqualify a code before entitlement is even consulted:
	 * the code is absent from the registry, or the entry is `toggleable => false`. The latter
	 * marks the D-R22 display-only capability cards — catalog entries describing core code that
	 * already ships, with nothing to switch on or off. Letting a third party claim one would
	 * boot a provider under a code whose "enabled" state the shipped code does not honour, so
	 * such a claim is rejected on the same silent path as an unknown code.
	 *
	 * @param string $code Module code declared by the provider.
	 */
	private static function isClaimableModuleCode( string $code ): bool {
		$meta = Plan::FEATURES[ $code ] ?? null;

		return is_array( $meta ) && true === $meta['toggleable'];
	}

	/** Register edition-level guards before maintenance can return early. */
	private function registerEditionProviders(): void {
		$providers = $this->edition_provider_override ?? $this->plan->editionProviders();
		foreach ( $providers as $fqcn ) {
			if ( ! class_exists( $fqcn ) || ! is_subclass_of( $fqcn, ServiceProvider::class ) ) {
				continue;
			}
			$provider = new $fqcn();
			$provider->register( $this );
		}
	}
}

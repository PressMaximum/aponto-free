<?php
/**
 * Stripe module configuration: mode switch, two key sets, secrets, readiness (D-R39, D-R39b).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Payments\Stripe;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Integration\SettingsFieldContext;
use Aponto\Payments\PaymentRegistry;
use Aponto\Support\ModuleSecrets;
use Aponto\Support\Settings;

/**
 * The operator's own Stripe account: an explicit MODE and TWO complete key sets.
 *
 * ### Why the mode is stored, not derived (D-R39b, founder 2026-09-05)
 *
 * D-R39 derived `test`/`live` from the key prefix, on the reasoning that a stored copy is a second
 * source of truth that can drift. That reasoning was right about drift and wrong about the shape of
 * the job. Deriving the mode means the site can hold exactly ONE key set, so going live requires
 * pasting live keys over the test ones — destroying the test setup the owner uses to check the form
 * after every theme change, and giving them no way back except pasting the test keys again. The
 * usual sequence (set up in test → try a booking → go live → something looks wrong → go back to
 * test) was impossible without retyping credentials twice.
 *
 * So the mode is a SETTING and each mode keeps its own three credentials. The drift D-R39 feared is
 * prevented instead by validating each key against ITS OWN set — a `pk_live_` pasted into the test
 * set is a field error, not a silently mixed pair — so "mode says test" and "the keys are test
 * keys" cannot disagree.
 *
 * ### The two rules that survive unchanged
 *
 * **A secret that no longer opens counts as absent** (D-R34a). A cipher sealed under key material
 * this site has lost decrypts to nothing usable; returning the sealed blob as if it were the key
 * would send garbage to Stripe and produce an authentication error the operator cannot explain.
 * {@see self::credentials()} answers `''` instead, which flows through to {@see self::isReady()}
 * and takes the payment method off the booking form.
 *
 * **Only the ACTIVE set is ever used.** Every verb, the client config and the readiness answer read
 * {@see self::credentials()}, which resolves the set named by the mode. The other set is inert
 * storage — with one deliberate exception, the webhook leg, which peeks at it to recognise a
 * leftover delivery from the mode the site just switched away from (see {@see Driver::verifyWebhook()}).
 */
final class Config {

	/**
	 * Registry feature code.
	 */
	public const CODE = 'payments_stripe';

	/**
	 * Test mode: Stripe's sandbox, no real charges.
	 */
	public const MODE_TEST = 'test';

	/**
	 * Live mode: real cards, real money.
	 */
	public const MODE_LIVE = 'live';

	/**
	 * Both modes, in the order the panel renders them.
	 *
	 * @var list<string>
	 */
	public const MODES = array( self::MODE_TEST, self::MODE_LIVE );

	/**
	 * Maximum length Stripe accepts for a statement descriptor suffix.
	 */
	public const SUFFIX_MAX = 22;

	/**
	 * The events this driver's mapper acts on — the CANONICAL subscription list (D-R40b).
	 *
	 * Server-side, and published through `aponto_module_status_payments_stripe`, because the mapper
	 * is the only place that knows what it maps: a copy kept in the settings panel drifts the moment
	 * a case label moves, and the drift is silent until a payment that settled after the tab closed
	 * is never recorded. Subscribing to more than this costs a site nothing but `200`s; subscribing
	 * to less loses money — which is why {@see WebhookEndpoint::EVENTS}, the set the one-click
	 * registration subscribes, is an ALIAS of this list rather than a second array (D-R39b).
	 *
	 * `charge.refunded` stays for LEGACY payloads only (the embedded `refunds.data` Stripe stopped
	 * sending in 2022) — `refund.created` is the path a dashboard refund actually arrives on.
	 *
	 * @var list<string>
	 */
	public const WEBHOOK_EVENTS = array(
		'payment_intent.succeeded',
		'payment_intent.payment_failed',
		'payment_intent.canceled',
		'refund.created',
		'refund.updated',
		'refund.failed',
		'charge.refunded',
	);

	/**
	 * The three credential fields a mode set holds, in panel order.
	 *
	 * @var list<string>
	 */
	public const CREDENTIALS = array( 'publishable_key', 'secret_key', 'webhook_secret' );

	/**
	 * The PR-A single-set paths, still read so an existing install keeps working (see
	 * {@see self::resolve()}).
	 *
	 * @var list<string>
	 */
	public const LEGACY_PATHS = array( 'publishable_key', 'secret_key', 'webhook_secret' );

	/**
	 * Publishable key shape, per mode.
	 */
	private const SHAPE_PUBLISHABLE = '/^pk_%s_[A-Za-z0-9]+$/';

	/**
	 * Secret / restricted key shape, per mode. A restricted key (`rk_`) is accepted deliberately: it
	 * is the least-privilege way to run this integration, and every call the driver makes is inside
	 * the PaymentIntents + Refunds + Balance surface a restricted key can be scoped to.
	 */
	private const SHAPE_SECRET = '/^(sk|rk)_%s_[A-Za-z0-9]+$/';

	/**
	 * Webhook signing-secret shape. Carries no mode of its own — Stripe issues a DIFFERENT signing
	 * secret for the test and live endpoint, but neither string says which it is, so the set it was
	 * pasted into is the only thing that knows.
	 */
	private const SHAPE_WEBHOOK = '/^whsec_[A-Za-z0-9]+$/';

	/**
	 * Characters Stripe refuses in a statement descriptor suffix, expressed the other way round:
	 * letters, digits, spaces and `.`, `,`, `-` are what remains.
	 */
	private const SHAPE_SUFFIX = '/^[A-Za-z0-9 .,\-]*$/';

	/**
	 * Construct with a settings reader.
	 *
	 * @param Settings $settings Core settings/module-option reader.
	 */
	public function __construct( private Settings $settings ) {}

	/**
	 * The dotted path of one credential in one mode set.
	 *
	 * @param string $mode  `test` or `live`.
	 * @param string $field One of {@see self::CREDENTIALS}.
	 */
	public static function path( string $mode, string $field ): string {
		return $mode . '_' . $field;
	}

	/**
	 * The settings schema for a given active mode (`aponto_get_settings_fields_payments_stripe`).
	 *
	 * Flat `dotted-path => {type, default, secret?, required?}` — the shape the D-R27 generic
	 * controller consumes. PURE, and takes the mode explicitly, so the whole matrix is assertable
	 * without WordPress; {@see self::settingsFields()} is the bound entry point that supplies it.
	 *
	 * `required` is what drives the catalog's `configured` tier, and it follows the ACTIVE set for a
	 * reason worth stating: a site running in test mode with a complete test set IS configured, and
	 * marking both sets required would have it reading "not configured" until the owner had also
	 * pasted live credentials they may not have yet.
	 *
	 * @param string $mode Active mode.
	 * @return array<string, array<string, mixed>>
	 */
	public static function fieldsFor( string $mode ): array {
		$mode   = self::normalizeMode( $mode );
		$fields = array(
			'mode' => array(
				'type'    => 'string',
				'default' => self::MODE_TEST,
			),
		);

		foreach ( self::MODES as $set ) {
			$active = $set === $mode;

			$fields[ self::path( $set, 'publishable_key' ) ] = array(
				'type'     => 'string',
				'default'  => '',
				'required' => $active,
			);
			$fields[ self::path( $set, 'secret_key' ) ]      = array(
				'type'     => 'string',
				'default'  => '',
				'secret'   => true,
				'required' => $active,
			);
			// REQUIRED, and that is a product decision rather than a technical one. Every terminal
			// answer this integration can receive out-of-band — a payment that settles after the
			// customer closed the tab, a refund issued from Stripe's own dashboard, an intent Stripe
			// cancelled — arrives ONLY as a webhook. A site without the signing secret would take
			// money it never records. Stripe issues a SEPARATE signing secret per mode, which is the
			// other half of why one set could never serve both.
			$fields[ self::path( $set, 'webhook_secret' ) ] = array(
				'type'     => 'string',
				'default'  => '',
				'secret'   => true,
				'required' => $active,
			);
		}

		foreach ( self::MODES as $set ) {
			// NON-SECRET, and part of the schema so the controller's full-replacement PUT round-trips
			// it instead of erasing an endpoint the site is registered at (D-R39b). It is an id, not
			// a credential: it identifies the endpoint in Stripe's dashboard and authenticates
			// nothing.
			$fields[ WebhookEndpoint::idPath( $set ) ] = array(
				'type'    => 'string',
				'default' => '',
			);
		}

		// Default OFF: Aponto already sends its own booking confirmation, and a second receipt from
		// Stripe in the same minute reads as a double charge to a customer looking for exactly that.
		$fields['send_receipt']                = array(
			'type'    => 'boolean',
			'default' => false,
		);
		$fields['statement_descriptor_suffix'] = array(
			'type'    => 'string',
			'default' => '',
		);

		return $fields;
	}

	/**
	 * Bound schema contributor — resolves the active mode, then delegates.
	 *
	 * An instance method rather than the static it used to be, because the schema now DEPENDS on
	 * stored state and a static could only have guessed at it.
	 *
	 * @param mixed                $fields  Fields contributed so far.
	 * @param SettingsFieldContext $context Module code + derived redirect URI (unused: Stripe needs
	 *                                      no OAuth redirect — the operator pastes API keys).
	 * @return array<string, array<string, mixed>>
	 */
	public function settingsFields( $fields, SettingsFieldContext $context ): array {
		unset( $fields, $context );

		return self::fieldsFor( $this->mode() );
	}

	/**
	 * Publish what the module ACTUALLY resolves, without writing it (`aponto_module_settings_representation`).
	 *
	 * A PR-A install still stores one set at `publishable_key`/`secret_key`/`webhook_secret`;
	 * {@see self::resolve()} adopts those on read, so the gateway keeps working — but a settings
	 * response built from storage alone would show three empty boxes and "Test set incomplete" on a
	 * site that is charging cards. Two contradictory truths on one screen is worse than either.
	 *
	 * READ-ONLY, deliberately (D-R39c, Codex A.6). An earlier cut normalized the option here instead;
	 * that read-modify-writes the WHOLE option with no revision, so a concurrent settings `PUT` or a
	 * webhook registration landing between the read and the write lost its update silently. Nothing
	 * is written now: the panel is told the resolved shape, and the first ordinary `PUT` persists it
	 * — the controller's full replacement keeps only schema keys, so the legacy paths fall out then.
	 *
	 * @param mixed  $settings Masked settings contributed so far.
	 * @param string $code     Module code.
	 * @return array<string, mixed>
	 */
	public function representation( $settings, string $code ): array {
		$settings = is_array( $settings ) ? $settings : array();
		if ( self::CODE !== $code ) {
			return $settings;
		}

		$resolved = $this->resolve();
		if ( ! $resolved['legacy'] ) {
			return $settings;
		}

		$mode                     = $resolved['mode'];
		$settings['mode']         = $mode;
		$publishable              = self::path( $mode, 'publishable_key' );
		$settings[ $publishable ] = $resolved['publishable_key'];

		// MASKED, never the value: this is the same shape the controller publishes for a sealed
		// secret, and the panel only ever needs to know that one is there.
		foreach ( array( 'secret_key', 'webhook_secret' ) as $field ) {
			$settings[ self::path( $mode, $field ) ] = array( 'is_set' => '' !== $resolved[ $field ] );
		}

		// The legacy paths are not part of the current schema, so they would reach the panel as
		// unknown keys — and the sealed ciphertext of the two secrets with them.
		unset( $settings['publishable_key'], $settings['secret_key'], $settings['webhook_secret'] );

		return $settings;
	}

	/**
	 * Where the ACTIVE set's two secrets are still sealed, when they are still at the PR-A paths
	 * (`aponto_module_settings_migrate_payments_stripe`, extension-surface §5.3).
	 *
	 * The write-side other half of {@see self::representation()}, and it exists because that method
	 * publishes `{is_set: true}` at the canonical `{mode}_secret_key`/`{mode}_webhook_secret` for a
	 * legacy install — which is the truth, the gateway is charging cards — while the option itself
	 * still holds nothing there. The panel echoes `{keep: true}` for both, as it must for any secret
	 * it was never shown, and before this seam the controller looked at the canonical path, found it
	 * empty, kept nothing, and let the full replacement drop the legacy paths in the same write. An
	 * admin who opened the panel and pressed Save with no change wiped their Stripe keys
	 * (D-R39c round 2, Codex NEW-2).
	 *
	 * The SAME predicate as the read path, deliberately: both answer from {@see self::resolve()}, so
	 * the set the panel is told is present is exactly the set the write keeps. Only the ACTIVE mode
	 * appears — `resolve()` adopts the legacy values into the set their own prefix names, and the
	 * other set has nothing to migrate.
	 *
	 * @param mixed  $sources Map contributed so far.
	 * @param string $code    Module code.
	 * @return array<string, string> Canonical path => legacy path.
	 */
	public function legacySecretPaths( $sources, string $code ): array {
		$sources = is_array( $sources ) ? $sources : array();
		if ( self::CODE !== $code ) {
			return $sources;
		}

		$resolved = $this->resolve();
		if ( ! $resolved['legacy'] ) {
			return $sources;
		}

		$sources[ self::path( $resolved['mode'], 'secret_key' ) ]     = 'secret_key';
		$sources[ self::path( $resolved['mode'], 'webhook_secret' ) ] = 'webhook_secret';

		return $sources;
	}

	/**
	 * Declare the module's secret paths (extension-surface §5.3.3).
	 *
	 * Both sets, plus the two LEGACY paths: an option written by PR-A still holds ciphers at
	 * `secret_key`/`webhook_secret`, and a site that has not re-saved its settings yet must keep
	 * masking them on read rather than printing them.
	 *
	 * Only the `settings` scope exists here: a payment gateway has no per-staff connection, so the
	 * `staff_connection` scope is deliberately unanswered rather than answered empty.
	 *
	 * @param mixed  $keys  Paths declared so far.
	 * @param string $code  Module code.
	 * @param string $scope `settings` or `staff_connection`.
	 * @return list<string>
	 */
	public static function secretKeys( $keys, string $code, string $scope ): array {
		$keys = is_array( $keys ) ? array_values( array_filter( $keys, 'is_string' ) ) : array();
		if ( self::CODE !== $code || 'settings' !== $scope ) {
			return $keys;
		}

		foreach ( self::MODES as $set ) {
			$keys[] = self::path( $set, 'secret_key' );
			$keys[] = self::path( $set, 'webhook_secret' );
		}
		$keys[] = 'secret_key';
		$keys[] = 'webhook_secret';

		return array_values( array_unique( $keys ) );
	}

	/**
	 * The mode a Stripe key belongs to, or `''` when the string is not a key at all.
	 *
	 * @param string $key Publishable or secret key.
	 */
	public static function modeOf( string $key ): string {
		if ( 1 === preg_match( '/^(?:pk|sk|rk)_(test|live)_/', $key, $matches ) ) {
			return $matches[1];
		}

		return '';
	}

	/**
	 * Coerce anything to one of the two modes, defaulting to the safe one.
	 *
	 * @param mixed $mode Candidate.
	 */
	public static function normalizeMode( $mode ): string {
		return self::MODE_LIVE === $mode ? self::MODE_LIVE : self::MODE_TEST;
	}

	/**
	 * Field errors for a settings write, or `[]` when it is acceptable.
	 *
	 * PURE, and takes the EFFECTIVE plaintext values — what the stored option will mean after the
	 * write — so it can be asserted without WordPress and so `{keep: true}` is resolved by the
	 * caller once rather than reasoned about twice. An empty value is not an error: `required` is a
	 * catalog tier, and clearing a key is how an operator disconnects one mode.
	 *
	 * EACH KEY IS CHECKED AGAINST ITS OWN SET, which is the whole of what replaced D-R39's
	 * prefix-derived mode. A `pk_live_` pasted into the Test box is the mistake this catches, and it
	 * is a mistake worth catching loudly: the Payment Element would render, collect a REAL card, and
	 * then fail at confirmation with an error Stripe words as if the customer's card were at fault.
	 *
	 * @param array<string, string> $values Effective values, by dotted path.
	 * @return array<string, string> Field path => localized message.
	 */
	public static function validate( array $values ): array {
		$fields = array();

		foreach ( self::MODES as $set ) {
			$publishable = trim( (string) ( $values[ self::path( $set, 'publishable_key' ) ] ?? '' ) );
			$secret      = trim( (string) ( $values[ self::path( $set, 'secret_key' ) ] ?? '' ) );
			$webhook     = trim( (string) ( $values[ self::path( $set, 'webhook_secret' ) ] ?? '' ) );

			if ( '' !== $publishable && 1 !== preg_match( sprintf( self::SHAPE_PUBLISHABLE, $set ), $publishable ) ) {
				$fields[ self::path( $set, 'publishable_key' ) ] = self::MODE_TEST === $set
					? __( 'Enter the TEST publishable key from your Stripe dashboard. It starts with pk_test_.', 'aponto' )
					: __( 'Enter the LIVE publishable key from your Stripe dashboard. It starts with pk_live_.', 'aponto' );
			}
			if ( '' !== $secret && 1 !== preg_match( sprintf( self::SHAPE_SECRET, $set ), $secret ) ) {
				$fields[ self::path( $set, 'secret_key' ) ] = self::MODE_TEST === $set
					? __( 'Enter the TEST secret key from your Stripe dashboard. It starts with sk_test_ or rk_test_.', 'aponto' )
					: __( 'Enter the LIVE secret key from your Stripe dashboard. It starts with sk_live_ or rk_live_.', 'aponto' );
			}
			if ( '' !== $webhook && 1 !== preg_match( self::SHAPE_WEBHOOK, $webhook ) ) {
				$fields[ self::path( $set, 'webhook_secret' ) ] = __( 'Enter the signing secret of your Stripe webhook endpoint. It starts with whsec_.', 'aponto' );
			}
		}

		$suffix = (string) ( $values['statement_descriptor_suffix'] ?? '' );
		if ( mb_strlen( $suffix ) > self::SUFFIX_MAX ) {
			$fields['statement_descriptor_suffix'] = sprintf(
				/* translators: %d: maximum number of characters. */
				__( 'Keep the statement descriptor suffix to %d characters or fewer.', 'aponto' ),
				self::SUFFIX_MAX
			);
		} elseif ( 1 !== preg_match( self::SHAPE_SUFFIX, $suffix ) ) {
			$fields['statement_descriptor_suffix'] = __( 'The statement descriptor suffix may use letters, numbers, spaces and . , - only.', 'aponto' );
		}

		if ( isset( $values['mode'] ) && ! in_array( $values['mode'], self::MODES, true ) ) {
			$fields['mode'] = __( 'Choose Test mode or Live mode.', 'aponto' );
		}

		return $fields;
	}

	/**
	 * Validate one `PUT /modules/payments_stripe/settings` payload (`aponto_module_settings_validate`).
	 *
	 * Resolves the D-17 wire markers the way the controller will: a plaintext string REPLACES, an
	 * absent key or `null`/`''` CLEARS, and `{keep: true}` means the stored value survives — so each
	 * key is checked as it will actually be in force, not only when this request happened to include
	 * it.
	 *
	 * @param mixed  $fields Field errors contributed so far.
	 * @param string $code   Module code being written.
	 * @param mixed  $values Raw `dotted-path => value` map from the request.
	 * @return array<string, string>
	 */
	public function validateInput( $fields, string $code, $values ): array {
		$fields = is_array( $fields ) ? $fields : array();
		if ( self::CODE !== $code || ! is_array( $values ) || array() !== $fields ) {
			return $fields;
		}

		$effective = array();
		$paths     = array( 'mode', 'statement_descriptor_suffix' );
		foreach ( self::MODES as $set ) {
			foreach ( self::CREDENTIALS as $field ) {
				$paths[] = self::path( $set, $field );
			}
		}

		foreach ( $paths as $path ) {
			$raw = $values[ $path ] ?? null;
			if ( is_string( $raw ) ) {
				$effective[ $path ] = $raw;
				continue;
			}
			if ( is_array( $raw ) && isset( $raw['keep'] ) && true === $raw['keep'] ) {
				$effective[ $path ] = $this->storedPlaintext( $path );
				continue;
			}
			$effective[ $path ] = '';
		}

		// `mode` is only validated when the request actually carried one: an absent field is the
		// controller writing the schema default, not the operator choosing nonsense.
		if ( ! array_key_exists( 'mode', $values ) ) {
			unset( $effective['mode'] );
		}

		return self::validate( $effective );
	}

	/**
	 * The active mode's credentials, DECRYPTED for internal use.
	 *
	 * @return array{publishable_key: string, secret_key: string, webhook_secret: string}
	 */
	public function credentials(): array {
		$resolved = $this->resolve();

		return array(
			'publishable_key' => $resolved['publishable_key'],
			'secret_key'      => $resolved['secret_key'],
			'webhook_secret'  => $resolved['webhook_secret'],
		);
	}

	/**
	 * One SPECIFIC mode's credentials, whether or not it is the active one.
	 *
	 * The webhook leg is the only caller (D-R39b): a site that has just switched to Live still
	 * receives test-mode deliveries Stripe queued beforehand, and recognising them as "the other
	 * mode's, ignore" needs the other mode's signing secret.
	 *
	 * @param string $mode `test` or `live`.
	 * @return array{publishable_key: string, secret_key: string, webhook_secret: string}
	 */
	public function credentialsFor( string $mode ): array {
		return $this->readSet( $this->settings->moduleOption( self::CODE ), self::normalizeMode( $mode ) );
	}

	/**
	 * Whether the gateway can actually take money right now — the answer
	 * `aponto_payment_ready_payments_stripe` gives.
	 *
	 * The ACTIVE set's three credentials present, both of its secrets genuinely openable, and the
	 * module still active. Switching to a mode whose set is incomplete therefore takes the payment
	 * method off the booking form rather than offering one that cannot charge — which is exactly
	 * what the panel's "Setup needed" state is telling the operator.
	 *
	 * The module-active term is redundant while the driver is only registered under `Plan::has()`,
	 * and it is kept because this filter is public: a `ready` that answered true for a disabled
	 * module would put the method back on the form.
	 */
	public function isReady(): bool {
		if ( ! PaymentRegistry::isActive( self::CODE ) ) {
			return false;
		}
		$credentials = $this->credentials();

		return '' !== $credentials['publishable_key']
			&& '' !== $credentials['secret_key']
			&& '' !== $credentials['webhook_secret'];
	}

	/**
	 * The active mode (`test` or `live`) — the SETTING, never a key prefix.
	 */
	public function mode(): string {
		return $this->resolve()['mode'];
	}

	/**
	 * Whether each mode set is complete, for the panel's status line.
	 *
	 * @return array{test: bool, live: bool}
	 */
	public function completeness(): array {
		$stored   = $this->settings->moduleOption( self::CODE );
		$resolved = $this->resolve();
		$out      = array();

		foreach ( self::MODES as $set ) {
			// The ACTIVE set is read through `resolve()` so a not-yet-normalized PR-A option counts
			// as complete — it IS complete, the driver is charging cards with it.
			$keys        = $set === $resolved['mode'] ? $resolved : $this->readSet( $stored, $set );
			$out[ $set ] = '' !== $keys['publishable_key'] && '' !== $keys['secret_key'] && '' !== $keys['webhook_secret'];
		}

		return $out;
	}

	/**
	 * Stripe's exponent for the SITE's currency (Codex D2).
	 *
	 * Published to the booking page so the widget can convert an order's minor units into the unit
	 * Elements expects. It has to come from the GATEWAY's table rather than ISO's, because the two
	 * disagree — ISK is zero-decimal in ISO and two-decimal at Stripe, MGA is the reverse — and a
	 * widget dividing by a hard-coded 100 would show one of those customers a price out by a factor
	 * of a hundred. Reading the site currency here rather than in the driver keeps the settings
	 * handle in the one class that already owns it.
	 */
	public function gatewayExponent(): int {
		return Money::stripeExponent( (string) $this->settings->get( 'currency' ) );
	}

	/**
	 * Whether Stripe should email its own receipt.
	 */
	public function sendsReceipt(): bool {
		$stored = $this->settings->moduleOption( self::CODE );

		return isset( $stored['send_receipt'] ) && (bool) $stored['send_receipt'];
	}

	/**
	 * The statement descriptor suffix, trimmed to what Stripe accepts.
	 */
	public function statementDescriptorSuffix(): string {
		$stored = $this->settings->moduleOption( self::CODE );
		$suffix = isset( $stored['statement_descriptor_suffix'] ) && is_string( $stored['statement_descriptor_suffix'] )
			? trim( $stored['statement_descriptor_suffix'] )
			: '';

		if ( 1 !== preg_match( self::SHAPE_SUFFIX, $suffix ) ) {
			// Belt and braces: the value was validated on the way in, but an option can also be
			// written by WP-CLI or a migration, and sending a rejected character turns every payment
			// on the site into an `invalid_request_error`.
			return '';
		}

		return mb_substr( $suffix, 0, self::SUFFIX_MAX );
	}

	// -- Resolution -----------------------------------------------------------------------------

	/**
	 * The active mode and its three credentials, INCLUDING the PR-A single-set fallback.
	 *
	 * ### The migration, and why it is a read rather than a database rewrite
	 *
	 * PR-A stored one set at `publishable_key`/`secret_key`/`webhook_secret` with the mode derived
	 * from the prefix. Those installs exist — the founder's own site among them — and an upgrade
	 * that only understood the new paths would silently un-configure a working gateway: the form
	 * would stop offering card payment, with a panel showing three empty boxes and no explanation.
	 *
	 * So the legacy values are ADOPTED on read, into whichever set their prefix says they belong to,
	 * and the mode follows. Nothing is written here: a read-path migration cannot half-finish, needs
	 * no version flag, and runs correctly on a replica. The next settings PUT writes the new shape
	 * and the legacy paths fall out of the option, because the controller's full replacement only
	 * keeps the schema's own keys — so the adoption is self-clearing and idempotent either way.
	 *
	 * Legacy is consulted ONLY when the target set is entirely empty. An operator who has already
	 * saved a `test_*` set has answered the question, and a stale legacy key must not shadow it.
	 *
	 * @return array{mode: string, publishable_key: string, secret_key: string, webhook_secret: string, legacy: bool}
	 */
	private function resolve(): array {
		$stored     = $this->settings->moduleOption( self::CODE );
		$legacy     = $this->readLegacy( $stored );
		$has_legacy = '' !== $legacy['publishable_key'] || '' !== $legacy['secret_key'];

		$mode = array_key_exists( 'mode', $stored ) && in_array( $stored['mode'], self::MODES, true )
			? (string) $stored['mode']
			: '';

		if ( '' === $mode ) {
			// No stored mode: an install from PR-A, or a fresh one. The legacy keys' own prefix is
			// the only evidence available about which mode the site was actually running in, and
			// guessing `test` for a site that was live would take a working gateway offline.
			$legacy_mode = '' !== $legacy['secret_key']
				? self::modeOf( $legacy['secret_key'] )
				: self::modeOf( $legacy['publishable_key'] );
			$mode        = '' === $legacy_mode ? self::MODE_TEST : $legacy_mode;
		}

		$set = $this->readSet( $stored, $mode );

		if ( $has_legacy && '' === $set['publishable_key'] && '' === $set['secret_key'] && '' === $set['webhook_secret'] ) {
			$legacy_mode = '' !== $legacy['secret_key']
				? self::modeOf( $legacy['secret_key'] )
				: self::modeOf( $legacy['publishable_key'] );
			if ( $legacy_mode === $mode ) {
				return array(
					'mode'            => $mode,
					'publishable_key' => $legacy['publishable_key'],
					'secret_key'      => $legacy['secret_key'],
					'webhook_secret'  => $legacy['webhook_secret'],
					'legacy'          => true,
				);
			}
		}

		return array(
			'mode'            => $mode,
			'publishable_key' => $set['publishable_key'],
			'secret_key'      => $set['secret_key'],
			'webhook_secret'  => $set['webhook_secret'],
			'legacy'          => false,
		);
	}

	/**
	 * One mode set, decrypted.
	 *
	 * @param array<string, mixed> $stored Stored module option.
	 * @param string               $mode   `test` or `live`.
	 * @return array{publishable_key: string, secret_key: string, webhook_secret: string}
	 */
	private function readSet( array $stored, string $mode ): array {
		return $this->readPaths(
			$stored,
			self::path( $mode, 'publishable_key' ),
			self::path( $mode, 'secret_key' ),
			self::path( $mode, 'webhook_secret' )
		);
	}

	/**
	 * The PR-A single set, decrypted.
	 *
	 * @param array<string, mixed> $stored Stored module option.
	 * @return array{publishable_key: string, secret_key: string, webhook_secret: string}
	 */
	private function readLegacy( array $stored ): array {
		return $this->readPaths( $stored, 'publishable_key', 'secret_key', 'webhook_secret' );
	}

	/**
	 * Read one plain path and two secret paths, opening the secrets.
	 *
	 * @param array<string, mixed> $stored      Stored module option.
	 * @param string               $publishable Plain path.
	 * @param string               $secret      Secret path.
	 * @param string               $webhook     Secret path.
	 * @return array{publishable_key: string, secret_key: string, webhook_secret: string}
	 */
	private function readPaths( array $stored, string $publishable, string $secret, string $webhook ): array {
		$vault = ModuleSecrets::forSite();
		$out   = array(
			'publishable_key' => isset( $stored[ $publishable ] ) && is_string( $stored[ $publishable ] ) ? $stored[ $publishable ] : '',
			'secret_key'      => '',
			'webhook_secret'  => '',
		);

		$paths = array(
			'secret_key'     => $secret,
			'webhook_secret' => $webhook,
		);
		$open  = array();
		foreach ( $paths as $path ) {
			if ( $vault->opensAt( $stored, $path, self::CODE, 'settings' ) ) {
				$open[] = $path;
			}
		}
		if ( array() === $open ) {
			return $out;
		}

		$plain = $vault->decrypt( $stored, $open, self::CODE, 'settings' );
		foreach ( $paths as $field => $path ) {
			if ( in_array( $path, $open, true ) && isset( $plain[ $path ] ) && is_string( $plain[ $path ] ) ) {
				$out[ $field ] = $plain[ $path ];
			}
		}

		return $out;
	}

	/**
	 * The stored plaintext behind one dotted path, for resolving a `{keep: true}` marker.
	 *
	 * @param string $path Dotted path.
	 */
	private function storedPlaintext( string $path ): string {
		$stored = $this->settings->moduleOption( self::CODE );

		foreach ( self::MODES as $set ) {
			$keys = $this->readSet( $stored, $set );
			foreach ( self::CREDENTIALS as $field ) {
				if ( self::path( $set, $field ) === $path ) {
					return $keys[ $field ];
				}
			}
		}

		$value = $stored[ $path ] ?? '';

		return is_string( $value ) ? $value : '';
	}
}

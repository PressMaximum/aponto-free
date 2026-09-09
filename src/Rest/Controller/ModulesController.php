<?php
/**
 * Generic module `/modules/{code}/settings` controller (rest-contract §2.12, extension-surface §5.3).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Rest\Controller;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Database\LockFactory;
use Aponto\Extension\ModuleRepresentation;
use Aponto\Extension\ModuleSettingsLock;
use Aponto\Extension\ModuleStatus;
use Aponto\Plan;
use Aponto\Rest\Controller;
use Aponto\Rest\Errors;
use Aponto\Rest\Policy;
use Aponto\Rest\Services;
use Aponto\Support\ModuleSecrets;
use Aponto\Support\Settings;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Reads and writes a module's own config option (`aponto_module_{code}`, autoload off). The registry
 * is authoritative and is read FIRST: a code that is unknown or declares `has_settings => false`
 * (including the D-R22 display-only capability cards) owns no `/settings` resource at all and
 * answers `404` before `Plan::has()` or any schema/secret filter is consulted. `has_settings` is the
 * whole registry predicate — `kind` is NOT consulted (D-R27), so a `capability` or `engine_flag`
 * module that declares settings owns this resource exactly like an `integration` does.
 * Entitlement (`Plan::has(code)`) is checked next. Failure and missing schema both answer the same
 * enumeration-safe `404 aponto_not_found`.
 *
 * A registered schema is `dotted-path => array{type, default, secret, nullable?}`. Secret paths never
 * leave the server in plaintext: `GET` masks each to `{is_set: bool}` — re-masked and allow-listed
 * to the schema AFTER the representation filter, so no callback can publish a value where the
 * contract promises a marker — and `PUT` seals a new plaintext with {@see ModuleSecrets} before
 * storage. `PUT` is a full replacement (rest-contract §2.12 / D-17): an unknown key is rejected
 * `422`; a secret field accepts a new non-empty string (replace), the marker `{"keep": true}`
 * (retain the stored cipher unchanged and never re-encrypt it — unless the module names a legacy
 * path through `aponto_module_settings_migrate_{code}`, the one case where keeping means moving),
 * or `null`/empty (clear). `null` is the CLEAR MARKER OF A SECRET and nothing else: on a plain
 * field it is a `422` unless the schema declares `nullable: true`.
 *
 * Every write runs under the module's own advisory lock ({@see ModuleSettingsLock}), the same name a
 * module's domain route must take to write the same option — read, seal, write and read-back all
 * inside it, and a contended write answers the retryable `503 aponto_lock_timeout`.
 */
final class ModulesController implements Controller {

	/**
	 * The secret wire scope this controller owns.
	 */
	private const SCOPE = 'settings';

	/**
	 * Module config store (source of truth for `aponto_module_{code}`).
	 *
	 * @var Settings
	 */
	private Settings $settings;

	/**
	 * Encrypt / mask helper for a module's declared secret paths.
	 *
	 * @var ModuleSecrets
	 */
	private ModuleSecrets $secrets;

	/**
	 * Database handle, for the per-module settings lock.
	 *
	 * @var \wpdb
	 */
	private \wpdb $wpdb;

	/**
	 * Construct the controller.
	 *
	 * @param Services $services Service locator.
	 */
	public function __construct( Services $services ) {
		$this->settings = $services->settings();
		// The SHARED site vault, never a substituted key (Codex round 3, P1 #1). Constructing it is
		// always safe; storing through it is refused below when the site has no usable key material.
		$this->secrets = $services->moduleSecrets();
		$this->wpdb    = $services->wpdb();
	}

	/**
	 * Register routes.
	 *
	 * @param string $rest_namespace REST namespace.
	 */
	public function register( string $rest_namespace ): void {
		register_rest_route(
			$rest_namespace,
			'/modules/(?P<code>[a-z0-9_]+)',
			array(
				array(
					'methods'             => 'PUT',
					'permission_callback' => array( Policy::class, 'manageSettings' ),
					'callback'            => array( $this, 'setEnabled' ),
				),
			)
		);

		register_rest_route(
			$rest_namespace,
			'/modules/(?P<code>[a-z0-9_]+)/settings',
			array(
				array(
					'methods'             => 'GET',
					'permission_callback' => array( Policy::class, 'manageSettings' ),
					'callback'            => array( $this, 'index' ),
				),
				array(
					'methods'             => 'PUT',
					'permission_callback' => array( Policy::class, 'manageSettings' ),
					'callback'            => array( $this, 'update' ),
				),
			)
		);
	}

	/**
	 * GET /modules/{code}/settings.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function index( WP_REST_Request $request ) {
		$code   = sanitize_key( (string) $request->get_param( 'code' ) );
		$schema = $this->schemaFor( $code );
		if ( null === $schema ) {
			return Errors::notFound();
		}

		return new WP_REST_Response( $this->representation( $code, $schema ), 200 );
	}

	/**
	 * PUT /modules/{code} — turn a module on or off (D-R31, rest-contract §2.12).
	 *
	 * The gate is deliberately NOT {@see Plan::has()}. A module the user just disabled answers
	 * `has() === false`, so gating on it would make disabling a ONE-WAY DOOR — the switch could
	 * never come back on. {@see self::isToggleable()} asks the question that actually matters here:
	 * could this module ever run on this build, regardless of whether it is running now.
	 *
	 * Disabling hides the capability and every surface it owns; it DELETES NOTHING. The module's
	 * own option and any related blobs survive untouched, so re-enabling restores the previous
	 * configuration rather than a blank one (D-R31 — the retention half of the contract is what
	 * makes an undoable switch safe to offer without a confirmation step).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function setEnabled( WP_REST_Request $request ) {
		$code = sanitize_key( (string) $request->get_param( 'code' ) );
		if ( ! $this->isToggleable( $code ) ) {
			return Errors::notFound();
		}

		$enabled = $request->get_param( 'enabled' );
		if ( ! is_bool( $enabled ) ) {
			return Errors::validation( array( 'enabled' => __( 'A boolean enabled flag is required.', 'aponto' ) ) );
		}

		$this->settings->setModuleEnabled( $code, $enabled );

		return new WP_REST_Response(
			array(
				'code'    => $code,
				'enabled' => $enabled,
			),
			200
		);
	}

	/**
	 * Whether a registry code may be switched on or off on THIS build.
	 *
	 * Three registry/plan terms, and pointedly not the user toggle itself:
	 *   1. `toggleable` — the registry's own statement that the module owns a switch. It is also
	 *      what keeps the D-R22 display-only capability cards out: all six are `toggleable: false`,
	 *      so they answer the uniform 404 here and `Plan::has()` is never asked about them.
	 *   2. {@see Plan::isShipped()} — a module whose code does not exist in this build has no
	 *      switch to throw (D-R24).
	 *   3. {@see Plan::editionAllows()} — a premium entry needs a premium build; a Free site must
	 *      not be able to enable a module it does not own.
	 *
	 * Every failure answers the SAME 404 as an unknown code, so the route cannot be used to
	 * enumerate which modules exist, which have shipped, or which edition this site runs.
	 *
	 * @param string $code Sanitized module code.
	 */
	private function isToggleable( string $code ): bool {
		if ( 1 !== preg_match( '/^[a-z0-9_]+$/', $code ) ) {
			return false;
		}
		$meta = Plan::FEATURES[ $code ] ?? null;
		if ( ! is_array( $meta ) || true !== $meta['toggleable'] ) {
			return false;
		}
		if ( ! Plan::isShipped( $code ) ) {
			return false;
		}

		return Plan::instance()->editionAllows( $code );
	}

	/**
	 * PUT /modules/{code}/settings (full replacement).
	 *
	 * Every schema key is rebuilt from the request `settings` object: a non-secret value is taken from
	 * the input (or its schema default) and sanitized by declared type; a secret is replaced, kept or
	 * cleared per the D-17 wire markers. Only secrets receiving a new plaintext string are handed to
	 * {@see ModuleSecrets::encrypt()}, so a `{"keep": true}` blob is never double-encrypted.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function update( WP_REST_Request $request ) {
		$code   = sanitize_key( (string) $request->get_param( 'code' ) );
		$schema = $this->schemaFor( $code );
		if ( null === $schema ) {
			return Errors::notFound();
		}

		$input = $request->get_param( 'settings' );
		if ( ! is_array( $input ) ) {
			return Errors::validation( array( 'settings' => __( 'A settings object is required.', 'aponto' ) ) );
		}

		$values  = array();
		$unknown = $this->walkInput( $input, $schema, '', $values );
		if ( null !== $unknown ) {
			return Errors::validation( array( $unknown => __( 'Unknown setting key.', 'aponto' ) ) );
		}

		/**
		 * Filter per-module VALIDATION of a settings write (extension-surface §5.3).
		 *
		 * The generic schema knows types and nothing else, and for some modules a well-typed string
		 * is still unusable: an API key with the wrong prefix, or a live publishable key paired with
		 * a test secret key. Without this seam a module either accepts the value and fails later at
		 * the gateway — where the error reads as the customer's card being declined — or grows a
		 * second settings controller, which is exactly what D-R27 exists to prevent.
		 *
		 * Return a non-empty `dotted-path => localized message` map to refuse the write with `422`
		 * and per-field messages; return the input untouched to accept it. A validator that already
		 * sees field errors from an earlier one must leave them alone.
		 *
		 * The values are the REQUEST's own, before the D-17 wire markers are resolved — a secret
		 * arrives either as new plaintext or as `{keep:true}`, and a validator that needs the
		 * effective value resolves the marker against its own stored option. They are the same bytes
		 * any `rest_pre_dispatch` listener already sees, and a validator must not log or persist
		 * them.
		 *
		 * @param array<string, string> $fields Field errors so far (initial `[]`).
		 * @param string                $code   Module code being written.
		 * @param array<string, mixed>  $values Collected `dotted-path => value` map from the request.
		 */
		$invalid = apply_filters( 'aponto_module_settings_validate', array(), $code, $values );
		if ( is_array( $invalid ) && array() !== $invalid ) {
			return Errors::validation( $invalid );
		}

		// SERIALIZED AGAINST EVERY OTHER WRITER OF THIS OPTION (D-R39c round 2, Codex NEW-1). This
		// route used to read-modify-write `aponto_module_{code}` with no lock while a module's own
		// domain route — the Stripe one-click webhook registration — did the same write under a
		// private lock name of its own. A lock only one writer takes serializes nothing: a Save
		// landing between that registration's write and its read-back replaced the signing secret
		// Stripe had just shown for the only time it ever shows it, and the panel reported success
		// for both requests. The name now comes from {@see ModuleSettingsLock}, so the two writers
		// contend properly and the loser gets the retryable `503 aponto_lock_timeout` instead of a
		// silent overwrite. Everything the write depends on is re-read INSIDE the section — the
		// `{keep:true}` source, the sealed payload and the read-back representation.
		$lock = ( new LockFactory( $this->wpdb ) )->named( ModuleSettingsLock::name( $code, $this->wpdb ) );
		if ( ! $lock->acquire( ModuleSettingsLock::TIMEOUT ) ) {
			return Errors::lockTimeout();
		}

		try {
			$stored  = $this->settings->moduleOption( $code );
			$secrets = $this->secretKeys( $schema, $code );
			$built   = $this->applyWireMarkers( $schema, $values, $stored, $secrets, $code );

			if ( array() !== $built['fields'] ) {
				return Errors::validation( $built['fields'] );
			}

			// FAIL CLOSED on unusable key material (Codex round 3, P1 #1). A site with no unique
			// `SECURE_AUTH_KEY` cannot encrypt anything meaningfully, and the previous behaviour —
			// seal with a literal from the source — is strictly worse than refusing, because it
			// looks like encryption at rest to everyone who inspects the option afterwards. Only
			// writes that actually carry NEW secret plaintext are blocked, so a site in this state
			// can still edit its non-secret settings: an ordinary `{keep:true}` never re-encrypts,
			// and the legacy MIGRATION that does (NEW-2) cannot even start here — `opensAt()`
			// answers false without usable key material, so the old value reads as absent (D-R34a)
			// and nothing is queued for sealing.
			if ( array() !== $built['encrypt'] && ! ModuleSecrets::isAvailable() ) {
				return Errors::make(
					'aponto_internal',
					500,
					array(),
					__( 'Aponto cannot store this secret securely because this site has no unique SECURE_AUTH_KEY. See Tools → Site Health for how to add one.', 'aponto' )
				);
			}

			$payload = $this->secrets->encrypt( $built['payload'], $built['encrypt'], $code, self::SCOPE );
			$this->settings->updateModuleOption( $code, $payload );

			return new WP_REST_Response( $this->representation( $code, $schema ), 200 );
		} finally {
			$lock->release();
		}
	}

	/**
	 * Build the replacement payload from the validated input, applying the D-17 wire markers.
	 *
	 * Extracted from {@see self::update()} as its own step so the wire contract stays directly
	 * exercisable: since D-R24 every registry entry that owns a `/settings` resource is still
	 * UNSHIPPED, so `Plan::has()` answers false and the route itself can only ever be asserted at
	 * its `404`. The transform below is where the contract actually lives, and it is pure — it
	 * touches no gate, no option and no filter.
	 *
	 * Per schema key: a NON-SECRET takes the input value or its schema default, sanitized by the
	 * declared type. A SECRET honours the markers — a non-empty string REPLACES (and is listed for
	 * encryption), `''`/`null`/absent CLEARS, and `{"keep": true}` RETAINS the stored cipher
	 * verbatim so it is never re-encrypted. Any other secret shape is a field error.
	 *
	 * @param array<string, mixed> $schema  Module settings schema.
	 * @param array<string, mixed> $values  Collected `dotted-path => value` map from the request.
	 * @param array<string, mixed> $stored  Currently stored module option (source of `{keep:true}`).
	 * @param list<string>         $secrets Declared secret dotted paths.
	 * @param string               $code    Module code (for the legacy-secret seam and the vault context).
	 * @return array{payload: array<string, mixed>, encrypt: list<string>, fields: array<string, string>}
	 */
	private function applyWireMarkers( array $schema, array $values, array $stored, array $secrets, string $code ): array {
		$payload = array();
		$encrypt = array();
		$fields  = array();
		$legacy  = null;

		foreach ( $schema as $path => $entry ) {
			$path      = (string) $path;
			$type      = is_array( $entry ) && isset( $entry['type'] ) ? (string) $entry['type'] : '';
			$is_secret = in_array( $path, $secrets, true );

			if ( ! $is_secret ) {
				$default = is_array( $entry ) && array_key_exists( 'default', $entry ) ? $entry['default'] : null;
				$value   = array_key_exists( $path, $values ) ? $values[ $path ] : $default;

				// A NON-SCALAR FOR A PLAIN FIELD IS A 422, NOT A COERCION (QA BUG-7, widened D-R39c
				// Codex A.9). `sanitizeByType()` answers `''` for a non-scalar string, `0` for a
				// non-numeric integer and — the worst of the three — `true` for ANY non-empty array
				// on a boolean, so `{"keep": true}` sent to a toggle silently turned it ON. The guard
				// used to cover strings only; every plain type now refuses the same way, because
				// "your client sent the wrong shape" is a 422 whatever the column happens to be.
				if ( array_key_exists( $path, $values ) && null !== $value && ! is_scalar( $value ) ) {
					$fields[ $path ] = __( 'This value is invalid.', 'aponto' );
					continue;
				}

				// AND AN EXPLICIT `null` IS THE SAME KIND OF WRONG SHAPE (D-R39c round 2, Codex
				// NEW-5). `null` is the wire marker that CLEARS A SECRET (D-17); on a plain field it
				// means nothing, and `sanitizeByType()` silently turned it into `false`, `0` or `''`
				// — so a client sending `{"send_receipt": null}` for "leave this alone" switched the
				// setting OFF and got a `200` saying so. Refused unless the schema opts in with
				// `nullable: true`, in which case `null` is stored verbatim rather than coerced.
				$nullable = is_array( $entry ) && isset( $entry['nullable'] ) && true === $entry['nullable'];
				if ( array_key_exists( $path, $values ) && null === $values[ $path ] ) {
					if ( ! $nullable ) {
						$fields[ $path ] = __( 'This value is invalid.', 'aponto' );
						continue;
					}

					$payload = $this->setPath( $payload, $path, null );
					continue;
				}

				$payload = $this->setPath( $payload, $path, $this->sanitizeByType( $value, $type ) );
				continue;
			}

			if ( ! array_key_exists( $path, $values ) ) {
				$payload = $this->setPath( $payload, $path, '' );
				continue;
			}

			$raw = $values[ $path ];
			if ( is_string( $raw ) ) {
				// TRIMMED BEFORE SEALING (D-R40b, Codex #15). Every non-secret string already goes
				// through `sanitize_text_field()`, which strips newlines; a secret bypasses that
				// entirely, so an API secret copied out of a provider dashboard with its trailing
				// newline was stored — and then sent — with the newline inside an `Authorization`
				// header. The result is a gateway that rejects every call with an authentication
				// error no screen in either product can explain. No credential has meaningful
				// leading or trailing whitespace, so this loses nothing; interior control characters
				// remain a `422` from the module's own `aponto_module_settings_validate` callback,
				// which is the only layer that knows the shape a given credential should have.
				$raw = trim( $raw );
				if ( '' === $raw ) {
					// Whitespace-only reads as CLEAR, not as an empty value to seal: the operator
					// wiped the field, and sealing a blank would leave `is_set: true` behind it.
					$payload = $this->setPath( $payload, $path, '' );
				} else {
					$payload   = $this->setPath( $payload, $path, $raw );
					$encrypt[] = $path;
				}
				continue;
			}
			if ( null === $raw ) {
				$payload = $this->setPath( $payload, $path, '' );
				continue;
			}
			if ( is_array( $raw ) && isset( $raw['keep'] ) && true === $raw['keep'] ) {
				$existing = $this->getPath( $stored, $path );
				if ( is_string( $existing ) && '' !== $existing ) {
					$payload = $this->setPath( $payload, $path, $existing );
					continue;
				}

				// KEEP MEANS KEEP, EVEN WHEN THE VALUE IS NOT AT THIS PATH YET (D-R39c round 2,
				// Codex NEW-2). A module whose schema has moved resolves its secrets from OLDER
				// paths on read, and `aponto_module_settings_representation` publishes `{is_set:
				// true}` at the new one so the panel does not show empty boxes on a site that is
				// demonstrably working. The panel then echoes `{keep:true}` for a field the operator
				// never touched — and this branch used to look only at the canonical path, find
				// nothing, write `''`, and let the full replacement drop the old path in the same
				// write. An admin who opened the screen and pressed Save with no change lost the
				// gateway credentials. The value is now MOVED instead: opened at its legacy path and
				// re-sealed at the canonical one in this same `update_option()`, so the copy and the
				// removal are one atomic write and neither can happen without the other.
				if ( null === $legacy ) {
					$legacy = $this->legacySecretSources( $code, $schema );
				}
				$adopted = isset( $legacy[ $path ] ) ? $this->openLegacySecret( $stored, $legacy[ $path ], $code ) : '';
				if ( '' !== $adopted ) {
					$payload = $this->setPath( $payload, $path, $adopted );
					// Re-sealed rather than copied: {@see ModuleSecrets} binds every cipher to
					// `{code}|{scope}|{path}`, so the blob from the old path would not authenticate
					// at the new one. This is the one case where `{keep:true}` re-encrypts.
					$encrypt[] = $path;
					continue;
				}

				$payload = $this->setPath( $payload, $path, '' );
				continue;
			}

			$fields[ $path ] = __( 'This value is invalid.', 'aponto' );
		}

		return array(
			'payload' => $payload,
			'encrypt' => $encrypt,
			'fields'  => $fields,
		);
	}

	/**
	 * The LEGACY stored paths a module's declared secrets may still be sealed at.
	 *
	 * The generic half of the read-path migration `aponto_module_settings_representation` already
	 * owns (extension-surface §5b.5). That filter lets a module PUBLISH what it resolves from older
	 * paths; this one lets it say WHERE, so the first ordinary `PUT` can move the value instead of
	 * losing it. Both are needed and neither implies the other: one is what the panel sees, the
	 * other is what the write does.
	 *
	 * SECRETS ONLY, deliberately. A non-secret legacy value survives without a seam because the
	 * representation publishes its PLAINTEXT and the client echoes it back in the full replacement;
	 * a secret is published masked, so the only thing that can come back for it is `{keep:true}` —
	 * a marker that names no value and therefore needs the server to know where to look.
	 *
	 * @param string               $code   Module code (already registry-checked by {@see self::schemaFor()}).
	 * @param array<string, mixed> $schema Module settings schema.
	 * @return array<string, string> Canonical secret path => legacy stored path.
	 */
	private function legacySecretSources( string $code, array $schema ): array {
		/**
		 * Filter the legacy storage paths a module's secrets may still live at
		 * (`aponto_module_settings_migrate_{code}`, extension-surface §5.3).
		 *
		 * Return a `canonical dotted path => legacy dotted path` map. Core consults an entry ONLY
		 * when the request kept that secret and the canonical path holds nothing, opens the legacy
		 * cipher with the module's own vault context and re-seals it at the canonical path in the
		 * same write. A legacy value that no longer opens is treated as absent (D-R34a), and a
		 * canonical path outside the schema is ignored — the map cannot introduce storage keys the
		 * full replacement would then keep forever.
		 *
		 * @param array<string, string> $sources Canonical secret path => legacy stored path.
		 * @param string                $code    Module code.
		 */
		$sources = apply_filters( 'aponto_module_settings_migrate_' . $code, array(), $code ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound -- Prefixed `aponto_module_settings_migrate_` and built only for a code the registry knows, checked in `schemaFor()` before this method can run; the sniff cannot see through the guard.
		if ( ! is_array( $sources ) ) {
			return array();
		}

		$out = array();
		foreach ( $sources as $path => $source ) {
			if ( is_string( $path ) && is_string( $source ) && '' !== $source && $source !== $path && array_key_exists( $path, $schema ) ) {
				$out[ $path ] = $source;
			}
		}

		return $out;
	}

	/**
	 * The plaintext behind a legacy secret path, or `''` when there is nothing usable there.
	 *
	 * `opensAt()` first, because "a secret that no longer opens counts as absent" (D-R34a): a cipher
	 * sealed under key material this site has lost decrypts to nothing usable, and moving the blob
	 * to a new path would only file garbage under a name that claims to be a credential.
	 *
	 * @param array<string, mixed> $stored Stored module option.
	 * @param string               $source Legacy dotted path.
	 * @param string               $code   Module code.
	 */
	private function openLegacySecret( array $stored, string $source, string $code ): string {
		if ( ! $this->secrets->opensAt( $stored, $source, $code, self::SCOPE ) ) {
			return '';
		}

		$plain = $this->getPath( $this->secrets->decrypt( $stored, array( $source ), $code, self::SCOPE ), $source );

		return is_string( $plain ) ? $plain : '';
	}

	/**
	 * Resolve a module's settings schema, or null when the module is unavailable.
	 *
	 * `has_settings`, NOT `kind`, is the settings-surface truth (D-R27, 2026-08-27). The
	 * predicate used to additionally require `kind === 'integration'`, which silently denied
	 * a `/settings` resource to every capability/engine_flag module that declares
	 * `has_settings => true` (`reminders`, `custom_fields`, `deposits`, `coupons`, … — 11 of
	 * the 19 premium entries). The registry field that says "this module owns settings" is
	 * the one the route now reads; `kind` describes what a module IS, not what it exposes.
	 *
	 * Resolution order is deliberate. The registry entry is inspected FIRST, and an entry
	 * that declares `has_settings => false` answers the uniform `404` of an unknown code
	 * before {@see Plan::has()} is ever consulted: a module with no settings surface owns
	 * no `/settings` resource, whatever its entitlement says. That ordering is also what
	 * keeps the D-R22 display-only capability cards (`booking_form`, `availability_engine`,
	 * `booking_reminder`, `email_notifications`, `ics_export`, `csv_export`) out of the
	 * entitlement path — they are catalog entries describing shipped core code, never
	 * gates, so runtime must not ask `has()` about them, not even through a generic route
	 * that resolves an arbitrary registry code from the URL. All six declare
	 * `has_settings => false`, so widening the predicate to every `kind` does not put them
	 * on the entitlement path.
	 *
	 * @param string $code Sanitized module code.
	 * @return array<string, mixed>|null
	 */
	private function schemaFor( string $code ): ?array {
		if ( 1 !== preg_match( '/^[a-z0-9_]+$/', $code ) ) {
			return null;
		}
		$meta = Plan::FEATURES[ $code ] ?? null;
		if ( ! is_array( $meta ) || true !== $meta['has_settings'] ) {
			return null;
		}
		if ( ! Plan::instance()->has( $code ) ) {
			return null;
		}

		/**
		 * Filter a module's settings schema (extension-surface §5.3). A module registers a
		 * `dotted-path => array{type: string, default: mixed, secret: bool}` map only while it is
		 * available/enabled; any other value (the `null` default) means the module is unavailable.
		 *
		 * @param mixed  $schema Registered schema, or null.
		 * @param string $code   Module code.
		 */
		$schema = apply_filters( 'aponto_module_settings_schema', null, $code );
		if ( ! is_array( $schema ) || array() === $schema ) {
			return null;
		}

		return $schema;
	}

	/**
	 * Build the masked GET representation for a module.
	 *
	 * `status` is ADDITIVE and OMITTED when nothing answered the seam (D-R40b, rest-contract §2.12):
	 * a module that does not implement `aponto_module_status_{code}` has said nothing, which is not
	 * the same claim as "not ready" and must not be rendered as one. It lives here rather than on a
	 * route of its own because every consumer of it is already loading this resource, and a second
	 * route would be a second answer to a question with one truth.
	 *
	 * @param string               $code   Module code.
	 * @param array<string, mixed> $schema Module settings schema.
	 * @return array<string, mixed>
	 */
	private function representation( string $code, array $schema ): array {
		// THE FILTER'S ANSWER IS RE-NORMALIZED, NOT SHIPPED VERBATIM (D-R39c round 2, Codex NEW-3),
		// and the whole three-step — mask, dispatch, normalize — now lives in the generic module
		// layer ({@see ModuleRepresentation}). It moved because it grew a SECOND consumer: the
		// catalog's `configured` tier read the schema's required paths straight out of `wp_options`,
		// so a legacy single-set install reported "Setup needed" on the Modules card while this
		// route reported a fully configured gateway. One option, two screens, two verdicts. One
		// function is how that stops being expressible.
		$published = ModuleRepresentation::publish(
			$code,
			$this->settings->moduleOption( $code ),
			$schema,
			$this->secretKeys( $schema, $code ),
			$this->secrets
		);

		$out = array(
			'code'     => $code,
			'settings' => $published,
		);

		$status = ModuleStatus::forModule( $code );
		if ( null !== $status ) {
			$out['status'] = $status;
		}

		return $out;
	}

	/**
	 * The declared secret dotted paths (every entry whose `secret` is strictly true).
	 *
	 * @param array<string, mixed> $schema Module settings schema.
	 * @param string               $code   Module code.
	 * @return list<string>
	 */
	private function secretKeys( array $schema, string $code ): array {
		$keys = array();
		foreach ( $schema as $path => $entry ) {
			if ( is_array( $entry ) && isset( $entry['secret'] ) && true === $entry['secret'] ) {
				$keys[] = (string) $path;
			}
		}

		/**
		 * Filter secret paths for a module wire scope (extension-surface §2, §5.3.3).
		 *
		 * @param list<string> $keys  Schema-declared secret paths.
		 * @param string       $code  Module code.
		 * @param string       $scope Wire scope (`settings`).
		 */
		$filtered = apply_filters( 'aponto_module_secret_keys', $keys, $code, self::SCOPE );
		if ( is_array( $filtered ) ) {
			foreach ( $filtered as $path ) {
				if ( is_string( $path ) && array_key_exists( $path, $schema ) ) {
					$keys[] = $path;
				}
			}
		}

		return array_values( array_unique( $keys ) );
	}

	/**
	 * Walk the incoming `settings` object, collecting each schema-key value and returning the first
	 * unknown dotted key (or null when every key is known). Descent stops at any path that is itself
	 * a schema key so a secret's `{"keep": true}` marker object is captured as a value, not mistaken
	 * for nested unknown keys.
	 *
	 * @param array<string, mixed> $node   Current input node.
	 * @param array<string, mixed> $schema Module settings schema.
	 * @param string               $prefix Dotted prefix of the current node.
	 * @param array<string, mixed> $values Collected `dotted-path => value` map (by reference).
	 * @return string|null First unknown dotted key.
	 */
	private function walkInput( array $node, array $schema, string $prefix, array &$values ): ?string {
		foreach ( $node as $key => $value ) {
			$path = '' === $prefix ? (string) $key : $prefix . '.' . (string) $key;
			if ( array_key_exists( $path, $schema ) ) {
				$values[ $path ] = $value;
				continue;
			}
			if ( is_array( $value ) && $this->isSchemaPrefix( $path, $schema ) ) {
				$unknown = $this->walkInput( $value, $schema, $path, $values );
				if ( null !== $unknown ) {
					return $unknown;
				}
				continue;
			}

			return $path;
		}

		return null;
	}

	/**
	 * Whether any schema key is nested under the given dotted path (i.e. `{path}.` is a prefix).
	 *
	 * @param string               $path   Candidate dotted prefix.
	 * @param array<string, mixed> $schema Module settings schema.
	 */
	private function isSchemaPrefix( string $path, array $schema ): bool {
		$needle = $path . '.';
		foreach ( array_keys( $schema ) as $key ) {
			if ( is_string( $key ) && 0 === strpos( $key, $needle ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Sanitize a non-secret value by its declared schema type.
	 *
	 * @param mixed  $value Raw value.
	 * @param string $type  Declared type (`string`, `integer`, `boolean`, or other).
	 * @return mixed
	 */
	private function sanitizeByType( mixed $value, string $type ) {
		switch ( $type ) {
			case 'string':
				return is_scalar( $value ) ? sanitize_text_field( (string) $value ) : '';
			case 'integer':
				return is_numeric( $value ) ? (int) $value : 0;
			case 'boolean':
				return (bool) $value;
			default:
				return $value;
		}
	}

	/**
	 * Read a dotted path from a nested array.
	 *
	 * @param array<string, mixed> $payload Payload.
	 * @param string               $path    Dotted path.
	 * @return mixed Null when absent.
	 */
	private function getPath( array $payload, string $path ) {
		$node = $payload;
		foreach ( explode( '.', $path ) as $segment ) {
			if ( ! is_array( $node ) || ! array_key_exists( $segment, $node ) ) {
				return null;
			}
			$node = $node[ $segment ];
		}

		return $node;
	}

	/**
	 * Return a copy of the payload with a dotted path set.
	 *
	 * @param array<string, mixed> $payload Payload.
	 * @param string               $path    Dotted path.
	 * @param mixed                $value   New value.
	 * @return array<string, mixed>
	 */
	private function setPath( array $payload, string $path, $value ): array {
		$segments = explode( '.', $path );
		$key      = array_shift( $segments );

		if ( array() === $segments ) {
			$payload[ $key ] = $value;

			return $payload;
		}

		$child = $payload[ $key ] ?? array();
		if ( ! is_array( $child ) ) {
			$child = array();
		}
		$payload[ $key ] = $this->setPath( $child, implode( '.', $segments ), $value );

		return $payload;
	}
}

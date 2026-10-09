<?php
/**
 * Payment allow-list and hook vocabulary (extension-surface §5b.1, D-R38).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Payments;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Plan;

/**
 * The single place that answers "is this string a payment module code, and may this site use it" —
 * and the single place that turns a code into a hook name.
 *
 * Both halves exist to make one class of bug unrepresentable, exactly as
 * {@see \Aponto\Integration\IntegrationRegistry} does for calendars. Extension-surface §1 forbids
 * dispatching a `{key}` hook before the key has been allow-listed; a public route that took `{key}`
 * from the URL and interpolated it straight into `aponto_payment_capture_{key}` would be a
 * hook-injection surface reachable WITHOUT authentication. Every dispatch therefore goes through
 * {@see PaymentDispatcher}, which asks {@see self::isActive()} first, and {@see self::verbHook()}
 * refuses to build a name for a code that did not pass.
 *
 * A payment module is a registry entry with `kind === 'integration'` AND `category === 'payments'`.
 * The `kind` term is what lets a payment gateway reuse the integration settings transport
 * (`GET|PUT /modules/{code}/settings`, `POST /modules/{code}/test`) with no second controller; the
 * `category` term is what keeps a CALENDAR out of the payment verbs and vice versa.
 */
final class PaymentRegistry {

	/**
	 * The registry category that marks a payment gateway.
	 */
	private const CATEGORY = 'payments';

	/**
	 * Option holding the per-install idempotency salt (D-R40d). Autoload off: it is read on the
	 * payment path only, never on every page load.
	 */
	public const INSTALL_KEY_OPTION = 'aponto_payments_install_key';

	/**
	 * The shape a stored install salt must have to be adopted.
	 */
	private const INSTALL_KEY_SHAPE = '/^[0-9a-f]{16}$/';

	/**
	 * Memoised install salt, KEYED BY BLOG ID (D-R40e, Codex #1).
	 *
	 * Not a single static: `switch_to_blog()` moves the option store mid-request — a network cron
	 * tick, a WP-CLI command with `--url`, any loop over sites — and a process-wide memo would hand
	 * blog A's salt to blog B, putting two sites of ONE network back on colliding keys. The blog id
	 * is the identity of the option store, so it is the identity of the salt.
	 *
	 * @var array<int, string>
	 */
	private static array $install_keys = array();

	/**
	 * Hook prefix owned by the payment core.
	 */
	private const HOOK_PREFIX = 'aponto_payment_';

	/**
	 * The verbs a driver may answer (extension-surface §5b.2). A verb outside this list is a
	 * programming error, not a runtime condition — {@see self::verbHook()} throws on it rather than
	 * building a hook name nobody documented.
	 *
	 * @var list<string>
	 */
	public const VERBS = array( 'ready', 'exclusive', 'client_config', 'begin', 'capture', 'void', 'verify_webhook', 'refund', 'min_amount' );

	/**
	 * Whether a code names a payment entry in the registry. Pure metadata — no entitlement.
	 *
	 * @param string $code Candidate module code.
	 */
	public static function isPaymentModule( string $code ): bool {
		if ( 1 !== preg_match( '/^[a-z0-9_]+$/', $code ) ) {
			return false;
		}
		$meta = Plan::FEATURES[ $code ] ?? null;

		return is_array( $meta ) && 'integration' === $meta['kind'] && self::CATEGORY === $meta['category'];
	}

	/**
	 * Whether a code is a payment module this site may actually use right now: registry allow-list
	 * THEN {@see Plan::has()} (edition × shipped-ness × the module toggle).
	 *
	 * @param string $code Candidate module code.
	 */
	public static function isActive( string $code ): bool {
		return self::isPaymentModule( $code ) && Plan::instance()->has( $code );
	}

	/**
	 * Every payment code this site may use, in registry order.
	 *
	 * @return list<string>
	 */
	public static function activeCodes(): array {
		$out = array();
		foreach ( array_keys( Plan::FEATURES ) as $code ) {
			$code = (string) $code;
			if ( self::isActive( $code ) ) {
				$out[] = $code;
			}
		}

		return $out;
	}

	/**
	 * Every payment code this site may use AND whose driver says it can actually take money
	 * (Codex #1).
	 *
	 * `isActive()` answers "is this module switched on here" — edition, shipped-ness, toggle. That is
	 * necessary and not sufficient: a module can be shipped and enabled with no API keys entered, and
	 * offering a payment method whose driver cannot create an intent produces a booking form that
	 * fails at the last step. Shipping the code and being READY to charge are different facts, and
	 * only the driver knows the second one.
	 *
	 * This is the predicate every PUBLIC surface uses — the booking route's method allow-list, the
	 * widget's boot data, `PaymentService::enabled()`. `activeCodes()` remains the right question for
	 * anything acting on data that already exists (a refund, a webhook), because a gateway that has
	 * lost its credentials must still be able to receive the event for a payment it already took.
	 *
	 * @return list<string>
	 */
	public static function offeredCodes(): array {
		$out = array();
		foreach ( self::activeCodes() as $code ) {
			if ( PaymentDispatcher::isReady( $code ) ) {
				$out[] = $code;
			}
		}
		$exclusive = self::exclusiveCode( $out );

		return '' === $exclusive ? $out : array( $exclusive );
	}

	/**
	 * Whether this site REQUIRES online payment while no payment method can take one (D-R79).
	 *
	 * All of:
	 *  - the stored mode is not `off` (the owner's kill switch);
	 *  - at least one payment module is switched on here — a site that never enabled one never
	 *    asked for online payment, whatever the mode's default says;
	 *  - NOTHING is offered: {@see self::offeredCodes()} is empty, the very list the booking form
	 *    and `POST /public/bookings` draw the payment step from, so "no method is available" here
	 *    and "the form shows no payment step" cannot disagree;
	 *  - payment is required: the stored mode is `required`, or an enabled gateway declares itself
	 *    the site's exclusive checkout (D-R71c) — asked of the ENABLED codes, because the gateway
	 *    that is down is exactly the one that cannot be found among the ready ones.
	 *
	 * What happens in this state is the owner's choice (`payments.when_unavailable`); this method
	 * only names the state. Cheap: the readiness verbs it asks are the ones every public request
	 * already asks.
	 *
	 * @param string $stored Stored `payments.mode` value.
	 */
	public static function requiredButUnavailable( string $stored ): bool {
		if ( 'off' === $stored ) {
			return false;
		}
		$active = self::activeCodes();
		if ( array() === $active ) {
			return false;
		}
		$offered = array() !== self::offeredCodes();

		return self::decideRequiredButUnavailable( $stored, true, $offered, ! $offered && '' !== self::exclusiveCode( $active ) );
	}

	/**
	 * The rule of {@see self::requiredButUnavailable()} over plain facts — pure, so the whole
	 * matrix is pinned by a unit test that needs no plan, option or driver.
	 *
	 * @param string $stored      Stored `payments.mode`.
	 * @param bool   $any_enabled Whether at least one payment module is switched on.
	 * @param bool   $any_offered Whether at least one of them is ready (something is offered).
	 * @param bool   $exclusive   Whether an enabled module is the site's exclusive checkout.
	 */
	public static function decideRequiredButUnavailable( string $stored, bool $any_enabled, bool $any_offered, bool $exclusive ): bool {
		if ( 'off' === $stored || ! $any_enabled || $any_offered ) {
			return false;
		}

		return 'required' === $stored || $exclusive;
	}

	/**
	 * The effective public payment mode for a stored `payments.mode` (D-R71c).
	 *
	 * An exclusive checkout gateway makes online payment required for priced orders: its whole
	 * point is that checkout moves there, so a pay-later/on-site choice is not offered. `off` stays
	 * the merchant's explicit kill switch.
	 *
	 * @param string $stored Stored `payments.mode` value.
	 */
	public static function effectiveMode( string $stored ): string {
		return 'off' !== $stored && '' !== self::exclusiveCode() ? 'required' : $stored;
	}

	/**
	 * The ready gateway that takes over every NEW online checkout, or `''` (D-R71c).
	 *
	 * A driver answers the `exclusive` verb when enabling it means the site's checkout moves to that
	 * gateway, for example a commerce platform that owns the cart and every payment method. The
	 * first such code in registry order wins, and only among codes already ready. This narrows new
	 * offers only: {@see self::isOffered()} is unchanged, so a hold begun with another gateway before
	 * the switch can still be paid, voided and refunded through its own driver.
	 *
	 * @param list<string>|null $offered Ready codes already computed, or null to compute them.
	 */
	public static function exclusiveCode( ?array $offered = null ): string {
		if ( null === $offered ) {
			$offered = array();
			foreach ( self::activeCodes() as $code ) {
				if ( PaymentDispatcher::isReady( $code ) ) {
					$offered[] = $code;
				}
			}
		}
		foreach ( $offered as $code ) {
			/**
			 * Filter whether a ready payment driver takes over every new online checkout.
			 *
			 * @param bool   $exclusive Whether this gateway is exclusive (initial value `false`).
			 * @param string $code      Module code being asked about.
			 */
			if ( true === apply_filters( self::verbHook( 'exclusive', $code ), false, $code ) ) { // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound -- The name is BUILT by verbHook(), which prefixes `aponto_payment_` and refuses any code the registry does not allow-list; the sniff cannot see through the call.
				return $code;
			}
		}

		return '';
	}

	/**
	 * Whether a specific code is offered to the public right now.
	 *
	 * @param string $code Candidate module code.
	 */
	public static function isOffered( string $code ): bool {
		return self::isActive( $code ) && PaymentDispatcher::isReady( $code );
	}

	/**
	 * The PUBLIC client configuration a driver wants printed on the booking page (extension-surface
	 * §5b.6, D-R38).
	 *
	 * The widget has to hand the gateway's own JS a little configuration before any booking exists —
	 * a publishable key, a mode flag — which is a DIFFERENT question from the per-intent
	 * `client_params` of {@see PaymentBeginResult}: those describe one payment, these describe the
	 * gateway. Rather than teaching core what "publishable key" means, the seam is generic and the
	 * driver fills it, exactly as the verbs do.
	 *
	 * Two properties make it safe to print for an anonymous visitor:
	 *
	 *  - It is only asked for an OFFERED code, so a disabled or unconfigured gateway contributes
	 *    nothing and the hook is never dispatched for a code the registry did not allow-list (§1).
	 *  - The answer is coerced to the same bounded `string => string` shape `client_params` uses. A
	 *    driver that returns structure, or something enormous, cannot turn a public page into an
	 *    exfiltration channel. The rule core cannot check stays the driver's: **never a secret key
	 *    or a webhook signing secret** — only values the gateway designed to be public.
	 *
	 * @param string $code Payment module code.
	 * @return array<string, string>
	 * @param string $currency Optional stored order currency.
	 */
	public static function clientConfig( string $code, string $currency = '' ): array {
		if ( ! self::isOffered( $code ) ) {
			return array();
		}

		$config = apply_filters( self::verbHook( 'client_config', $code ), array(), $code, $currency ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound -- The name is BUILT by verbHook(), which prefixes `aponto_payment_` and refuses any code the registry does not allow-list; the sniff cannot see through the call.

		return is_array( $config ) ? self::publicScalars( $config ) : array();
	}

	/**
	 * Coerce a driver map into the bounded `string => string` shape core is willing to publish.
	 *
	 * Same bounds and the same drop-don't-throw policy as {@see PaymentBeginResult}: one unexpected
	 * value should cost that value, never the customer's ability to pay.
	 *
	 * @param array<string, mixed> $config Raw config from the driver.
	 * @return array<string, string>
	 */
	private static function publicScalars( array $config ): array {
		$out = array();
		foreach ( $config as $key => $value ) {
			if ( count( $out ) >= PaymentBeginResult::MAX_PARAMS ) {
				break;
			}
			$key = (string) $key;
			if ( 1 !== preg_match( '/^[A-Za-z0-9_]{1,64}$/', $key ) || ! is_scalar( $value ) ) {
				continue;
			}
			if ( is_bool( $value ) ) {
				$out[ $key ] = $value ? '1' : '0';
				continue;
			}
			$out[ $key ] = mb_substr( (string) $value, 0, PaymentBeginResult::MAX_VALUE_LENGTH );
		}

		return $out;
	}

	/**
	 * EVERY payment code in the registry, regardless of edition, shipped-ness or toggle.
	 *
	 * Distinct from {@see self::activeCodes()} and used only for CLEANUP and RETENTION reads, on the
	 * same reasoning as `IntegrationRegistry::allCodes()`: entitlement decides what may RUN, and must
	 * never decide what may be READ BACK or DELETED. A refunded order whose gateway module was
	 * switched off still has to render its transactions in the booking editor (D-R31 retention), and
	 * `Plan::has()` answers false for exactly that case.
	 *
	 * @return list<string>
	 */
	public static function allCodes(): array {
		$out = array();
		foreach ( Plan::FEATURES as $code => $meta ) {
			$code = (string) $code;
			if ( self::isPaymentModule( $code ) ) {
				$out[] = $code;
			}
		}

		return $out;
	}

	/**
	 * The hook name for a verb on an ALLOW-LISTED code.
	 *
	 * Refuses — loudly — for a code that is not a payment module: an unfiltered code reaching a hook
	 * name is the injection this class exists to prevent, and returning an empty string would just
	 * move the failure somewhere quieter. Entitlement (`Plan::has()`) is deliberately NOT checked
	 * here: {@see PaymentDispatcher} owns that gate, and a caller that legitimately builds a hook
	 * name for an inactive module (a test, an uninstall sweep) must not be blocked by this method.
	 *
	 * @param string $verb Verb from {@see self::VERBS}.
	 * @param string $code Module code.
	 * @throws \InvalidArgumentException When the verb is unknown or the code is not a payment module.
	 */
	public static function verbHook( string $verb, string $code ): string {
		if ( ! in_array( $verb, self::VERBS, true ) ) {
			throw new \InvalidArgumentException( esc_html( 'Aponto: unknown payment verb.' ) );
		}
		if ( ! self::isPaymentModule( $code ) ) {
			throw new \InvalidArgumentException( esc_html( 'Aponto: payment verb dispatched for a non-payment code.' ) );
		}

		return self::HOOK_PREFIX . $verb . '_' . $code;
	}

	/**
	 * The gateway MODE a driver is operating in (`test`, `live`, or `''` when it has no such notion
	 * or is not configured) — display metadata, never a gate.
	 *
	 * It exists because "this gateway is configured" and "this gateway is configured with TEST keys"
	 * are different facts and only the second one explains why a real customer's card was not
	 * charged. Deliberately NOT a verb: it takes no request, writes nothing, and is asked on the
	 * admin page's boot path, so putting it through {@see PaymentDispatcher} would mean building a
	 * dispatcher and a logger to render a badge.
	 *
	 * Allow-listed before interpolation like every other dynamic hook here (extension-surface §1),
	 * and NOT gated on `Plan::has()`: the admin catalog renders a card for a module the site has
	 * switched off, and a mode badge that vanished with the toggle would read as "the keys are gone".
	 *
	 * @param string $code Module code.
	 */
	public static function mode( string $code ): string {
		if ( ! self::isPaymentModule( $code ) ) {
			return '';
		}

		/**
		 * Filter the mode a payment driver is operating in.
		 *
		 * @param string $mode Mode so far (initial value `''`).
		 * @param string $code Module code being asked about.
		 */
		$mode = apply_filters( self::HOOK_PREFIX . 'mode_' . $code, '', $code ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound -- Prefixed `aponto_payment_` and built only for a code this registry allow-listed on the line above; the sniff cannot see through the guard.

		return in_array( $mode, array( 'test', 'live' ), true ) ? (string) $mode : '';
	}

	/**
	 * The stable idempotency key core hands a driver for one unit of work (extension-surface §5b.4).
	 *
	 * Stable across retries of the SAME work and different for different work, which is what makes a
	 * driver able to make the REMOTE operation idempotent — core's own bookkeeping only stops a
	 * duplicate dispatch, never a lost response to a successful call (the D-R34a reasoning, applied
	 * to money).
	 *
	 * **NAMESPACED PER INSTALL (D-R40d, QA run 2 BUG-1).** The first shape was
	 * `payments:{order_id}:{kind}:{n}` and carried nothing about WHICH site asked. Both providers key
	 * their replay cache per ACCOUNT, not per site, and order ids are per-install autoincrements — so
	 * two Aponto installs sharing one gateway account collide on their early orders as a matter of
	 * course. A gateway that REFUSES the collision costs the customer a "temporarily unavailable";
	 * one that does not answers `200` with the FIRST order, so site B would mount a payment sheet for
	 * site A's order and the buyer would be charged site A's amount.
	 * {@see self::installKey()} mixes in a per-install, non-guessable salt so the two sites cannot
	 * name the same unit of work.
	 *
	 * **AND A DEPLOYMENT COMPONENT (D-R40e, Codex #1).** A salt that lives in the database is copied
	 * BY the database: `wp db export` from production and import into staging carries it across
	 * verbatim, so two deployments end up with the same salt, the same order ids and therefore the
	 * same keys — the exact collision the salt exists to prevent, reached by the most ordinary
	 * operation there is. {@see self::deploymentHash()} adds the first 8 hex of the SHA-256 of the
	 * site's normalized DEPLOYMENT IDENTITY, which is not a secret and does not replace the salt: it
	 * is the component that MOVES when the deployment moves, with nobody having to remember to
	 * rotate anything.
	 *
	 * The limit is worth stating rather than hiding: a clone that keeps the deployment identity AND
	 * the database AND the gateway account is the same merchant site by every externally observable
	 * measure, and it SHOULD share this namespace — two live copies of one site minting different
	 * keys would double-charge on the first retry.
	 *
	 * Only NEW rows get the new shape: `capture`/`void`/`refund` reuse the `idempotency_key` STORED
	 * on the transaction row (D-R39a lesson 1 — the verb suffix is added by the driver), so an
	 * attempt already in flight keeps presenting the exact key it first used.
	 *
	 * @param int    $order_id Order id.
	 * @param string $kind     `charge` or `refund`.
	 * @param int    $sequence 1-based attempt/refund number.
	 */
	public static function idempotencyKey( int $order_id, string $kind, int $sequence ): string {
		return sprintf( 'ap:%s:%s:%d:%s:%d', self::installKey(), self::deploymentHash(), $order_id, $kind, $sequence );
	}

	/**
	 * The deployment component of {@see self::idempotencyKey()} (D-R40e).
	 *
	 * 8 hex of `sha256()` over the site's normalized deployment identity, read from `home_url()` so
	 * it follows `switch_to_blog()` exactly as the salt's option store does. A site with no readable
	 * identity falls back to a constant rather than to an empty segment: the key must keep its field
	 * count, and such a site is already relying on the salt alone, which is where it started.
	 *
	 * **THE IDENTITY IS THE WHOLE DEPLOYMENT, NOT THE HOST (D-R40e, verify B.3).** Hashing the
	 * hostname alone left the component blind to the two cheapest ways to make a second deployment
	 * out of one: a subdirectory install (`https://example.com/` cloned to `https://example.com/
	 * staging/`) and a second local port (`127.0.0.1:8991` beside `:8992`). Both keep the host, so
	 * both kept the same `host8` — and with the salt cloned along with the database, the pair that is
	 * supposed to name a deployment named two of them the same. Scheme, lower-cased host, an EXPLICIT
	 * port (defaulted from the scheme so `https://x` and `https://x:443` are one deployment, not two)
	 * and the base path with any trailing slash removed.
	 */
	public static function deploymentHash(): string {
		$identity = function_exists( 'home_url' ) && function_exists( 'wp_parse_url' )
			? self::deploymentIdentity( (string) home_url() )
			: '';

		return '' === $identity ? '00000000' : substr( hash( 'sha256', $identity ), 0, 8 );
	}

	/**
	 * Normalize a site URL to the string {@see self::deploymentHash()} hashes (D-R40e, verify B.3).
	 *
	 * Separate and `public` so the normalization itself is testable without a WordPress install:
	 * every interesting case here is a pair of URLs that must NOT collide, and asserting that on the
	 * hash alone would test a substring of SHA-256 rather than the rule.
	 *
	 * @param string $home The site's `home_url()`.
	 * @return string `scheme://host:port/base/path`, or '' when there is no readable host.
	 */
	public static function deploymentIdentity( string $home ): string {
		$parts = wp_parse_url( trim( $home ) );
		if ( ! is_array( $parts ) ) {
			return '';
		}

		$host = isset( $parts['host'] ) && is_string( $parts['host'] ) ? strtolower( trim( $parts['host'] ) ) : '';
		if ( '' === $host ) {
			return '';
		}

		$scheme = isset( $parts['scheme'] ) && is_string( $parts['scheme'] ) ? strtolower( trim( $parts['scheme'] ) ) : 'http';
		$port   = isset( $parts['port'] ) ? (int) $parts['port'] : 0;
		if ( $port < 1 ) {
			$port = 'https' === $scheme ? 443 : 80;
		}

		// The base path, without its trailing slash: `home_url()` answers with and without one
		// depending on how the option was saved, and a deployment must not change identity because
		// somebody re-saved Settings → General.
		$path = isset( $parts['path'] ) && is_string( $parts['path'] ) ? rtrim( trim( $parts['path'] ), '/' ) : '';

		return $scheme . '://' . $host . ':' . $port . $path;
	}

	/**
	 * The per-install salt that namespaces {@see self::idempotencyKey()} (D-R40d).
	 *
	 * 16 hex characters from `random_bytes`, stored once in a non-autoloaded option, and minted with
	 * the same `add_option`-then-re-read shape the calendar drivers use for their own per-install
	 * site key. Random rather than derived from the site URL or `SECURE_AUTH_KEY` for the reason that
	 * pattern gives: URLs get changed and salts get rotated, and a value that moves would stop naming
	 * the same unit of work. It also travels to the provider in a request header, so a guessable
	 * value would let somebody else reconstruct this site's keys.
	 *
	 * **Where this deliberately differs from that site key:** the calendar one REFUSES to run when it
	 * cannot be persisted, because an ephemeral salt would derive a new remote event id per request
	 * and every retry would create a duplicate event. Here the key is derived ONCE per unit of work
	 * and then stored on the transaction row, which is what every later verb reads — so a site that
	 * cannot write an option still gets a coherent, correctly-namespaced key for the request that
	 * mints it, and refusing to take money would be a far worse answer than a salt that is only
	 * request-stable.
	 *
	 * **The memo is per BLOG, not per process (D-R40e, Codex #1).** `switch_to_blog()` swaps the
	 * option store under a running request, so a single static would return blog A's salt while
	 * `get_option()` was reading blog B's tables — putting two sites of one network back on
	 * colliding keys, which is precisely what the salt exists to stop.
	 */
	public static function installKey(): string {
		$blog = function_exists( 'get_current_blog_id' ) ? (int) get_current_blog_id() : 0;
		if ( isset( self::$install_keys[ $blog ] ) ) {
			return self::$install_keys[ $blog ];
		}

		$minted = bin2hex( random_bytes( 8 ) );

		if ( ! function_exists( 'get_option' ) || ! function_exists( 'add_option' ) ) {
			// Unit-test path: no WordPress, so there is nowhere to persist. Memoised so the shape and
			// the stability contract still hold for the process asking.
			self::$install_keys[ $blog ] = $minted;

			return $minted;
		}

		$stored = get_option( self::INSTALL_KEY_OPTION, '' );
		if ( is_string( $stored ) && 1 === preg_match( self::INSTALL_KEY_SHAPE, $stored ) ) {
			self::$install_keys[ $blog ] = $stored;

			return $stored;
		}

		add_option( self::INSTALL_KEY_OPTION, $minted, '', false );

		// RE-READ rather than trust what was just generated: `add_option` returns false both when a
		// concurrent request won the race (their value is the truth) and when the write failed. Only
		// the stored value may be adopted; a failed write falls through to the ephemeral value.
		$stored                      = get_option( self::INSTALL_KEY_OPTION, '' );
		self::$install_keys[ $blog ] = is_string( $stored ) && 1 === preg_match( self::INSTALL_KEY_SHAPE, $stored )
			? $stored
			: $minted;

		return self::$install_keys[ $blog ];
	}

	/**
	 * Reset the memoised install salt for EVERY blog. Test-only seam, mirroring the calendar configs.
	 *
	 * @internal
	 */
	public static function resetInstallKey(): void {
		self::$install_keys = array();
	}
}

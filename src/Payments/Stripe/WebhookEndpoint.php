<?php
/**
 * One-click Stripe webhook registration (D-R39b).
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

use Aponto\Database\LockFactory;
use Aponto\Extension\ModuleSettingsLock;
use Aponto\Payments\PaymentRegistry;
use Aponto\Rest\Errors;
use Aponto\Rest\Policy;
use Aponto\Support\Clock;
use Aponto\Support\Logger;
use Aponto\Support\ModuleSecrets;
use Aponto\Support\Settings;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * `POST /aponto/v1/stripe/webhook-endpoint` — create or refresh this site's Stripe webhook endpoint
 * for one mode, and store the signing secret it hands back.
 *
 * ### Why this exists
 *
 * Pasting a signing secret is the step owners get wrong. It lives on a different Stripe screen from
 * the API keys, it is shown once, and — the part nobody expects — Stripe issues a DIFFERENT one for
 * test and live, so an owner who has just gone live and reused the test secret sees every webhook
 * rejected with no visible symptom until a payment fails to settle. The Stripe API can create the
 * endpoint and return the secret in one call, so the button does what the documentation was asking
 * the owner to do by hand.
 *
 * A module-owned domain route rather than a settings field (extension-surface §3.3): it is an
 * ACTION with a remote side effect, and modelling it as a PUT would mean a settings write that
 * sometimes calls Stripe.
 *
 * ### The refresh path, and the secret that cannot be re-read
 *
 * Stripe returns `secret` only when the endpoint is CREATED. So a second press does not recreate —
 * it fetches the stored id, and if that endpoint still exists at this URL it only updates the event
 * list, keeping the stored secret. Recreating instead would hand back a new secret and silently
 * orphan an endpoint that Stripe would keep delivering to. An id that 404s (the owner deleted it in
 * the dashboard) IS recreated, because then there is nothing to keep.
 */
final class WebhookEndpoint {

	/**
	 * The exact set the endpoint subscribes to — an ALIAS of {@see Config::WEBHOOK_EVENTS}, never a
	 * second list (D-R40b).
	 *
	 * One click here and the instructions the panel prints for a hand-made endpoint have to produce
	 * the SAME subscription, and the only place that knows what this integration acts on is the
	 * mapper — so the canonical list lives beside it, is published to the panel through
	 * `aponto_module_status_payments_stripe`, and is referenced rather than copied here. A copy
	 * would drift the day the mapper gains a case, silently, and the first symptom would be a
	 * payment that settled after the tab closed and was never recorded.
	 *
	 * @var list<string>
	 */
	public const EVENTS = Config::WEBHOOK_EVENTS;

	/**
	 * Construct.
	 *
	 * @param Config     $config   Module configuration.
	 * @param Settings   $settings Settings/module-option store.
	 * @param \wpdb|null $wpdb     Database handle for the config lock (defaults to the global).
	 */
	public function __construct(
		private Config $config,
		private Settings $settings,
		private ?\wpdb $wpdb = null
	) {
		if ( null === $this->wpdb && isset( $GLOBALS['wpdb'] ) && $GLOBALS['wpdb'] instanceof \wpdb ) {
			$this->wpdb = $GLOBALS['wpdb'];
		}
	}

	/**
	 * The commit landed and was read back.
	 */
	private const COMMIT_OK = 'ok';

	/**
	 * The credentials changed under this request, or the lock could not be taken — retry.
	 */
	private const COMMIT_CONFLICT = 'conflict';

	/**
	 * The write did not land. The endpoint at Stripe is rolled back.
	 */
	private const COMMIT_FAILED = 'failed';

	/**
	 * The non-secret setting holding the endpoint id for one mode.
	 *
	 * @param string $mode `test` or `live`.
	 */
	public static function idPath( string $mode ): string {
		return 'webhook_endpoint_id_' . Config::normalizeMode( $mode );
	}

	/**
	 * Attach the route.
	 */
	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'registerRoute' ) );
	}

	/**
	 * Register the route on the `aponto/v1` namespace.
	 */
	public function registerRoute(): void {
		register_rest_route(
			'aponto/v1',
			'/stripe/webhook-endpoint',
			array(
				'methods'             => 'POST',
				'permission_callback' => array( Policy::class, 'manageSettings' ),
				'callback'            => array( $this, 'create' ),
			)
		);
	}

	/**
	 * The webhook URL Stripe should deliver to.
	 */
	public static function url(): string {
		return rest_url( 'aponto/v1/public/payments/' . Config::CODE . '/webhook' );
	}

	/**
	 * POST /stripe/webhook-endpoint.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function create( WP_REST_Request $request ) {
		if ( ! PaymentRegistry::isActive( Config::CODE ) ) {
			return Errors::notFound();
		}

		$raw  = $request->get_param( 'mode' );
		$mode = is_string( $raw ) && '' !== $raw ? $raw : $this->config->mode();
		if ( ! in_array( $mode, Config::MODES, true ) ) {
			return Errors::validation( array( 'mode' => __( 'Choose Test mode or Live mode.', 'aponto' ) ) );
		}

		$secret_key = $this->config->credentialsFor( $mode )['secret_key'];
		if ( '' === $secret_key ) {
			return Errors::validation(
				array(
					Config::path( $mode, 'secret_key' ) => __( 'Save a valid secret key for this mode first.', 'aponto' ),
				)
			);
		}

		// REFUSED BEFORE THE CALL when the site cannot seal what comes back (D-R34a posture): Stripe
		// shows a signing secret exactly once, so creating an endpoint we could not store would leave
		// a live endpoint nobody can verify and no way to recover the secret.
		if ( ! ModuleSecrets::isAvailable() ) {
			return Errors::make(
				'aponto_internal',
				500,
				array(),
				__( 'Aponto cannot store this secret securely because this site has no unique SECURE_AUTH_KEY. See Tools → Site Health for how to add one.', 'aponto' )
			);
		}

		$fingerprint = self::fingerprint( $secret_key );
		$client      = new StripeClient( $secret_key, 15 );
		$url         = self::url();
		$stored      = $this->settings->moduleOption( Config::CODE );
		$existing    = isset( $stored[ self::idPath( $mode ) ] ) && is_string( $stored[ self::idPath( $mode ) ] )
			? $stored[ self::idPath( $mode ) ]
			: '';

		if ( '' !== $existing ) {
			$refreshed = $this->refresh( $client, $existing, $url, $mode );
			if ( null !== $refreshed ) {
				return $refreshed;
			}
			// Fell through: the id no longer exists at Stripe, so it is recreated below.
		}

		$created = $client->post(
			'/v1/webhook_endpoints',
			$this->body( $url ),
			'webhook_endpoint:' . $mode . ':' . md5( $url )
		);
		if ( $created instanceof WP_Error ) {
			return $this->failure( $created, $mode );
		}

		$id     = isset( $created['id'] ) && is_string( $created['id'] ) ? $created['id'] : '';
		$secret = isset( $created['secret'] ) && is_string( $created['secret'] ) ? $created['secret'] : '';
		if ( '' === $id || '' === $secret ) {
			// A MALFORMED CREATE IS STILL A CREATE (Codex round 2, NEW-6). An `id` with no `secret`
			// — a truncated body, a proxy that dropped a field, a future API version — used to
			// answer `502` and walk away, leaving a live endpoint in the operator's account whose
			// signing secret nobody has and Stripe will never show again. It delivers events this
			// site rejects until Stripe disables it, and no screen here can explain why. Every
			// branch after a create that returned an id now ends in either a verified commit or a
			// delete; this is the one that was missing.
			if ( '' !== $id ) {
				$this->rollback( $client, $id, $mode );
			}

			return Errors::make( 'aponto_payment_error', 502 );
		}

		$commit = $this->store( $mode, $id, $secret, $fingerprint );

		if ( self::COMMIT_OK !== $commit ) {
			// The endpoint exists at Stripe and this side cannot record its secret, so the account is
			// put back the way it was found before answering. `conflict` is retryable — somebody else
			// is mid-write — and `failed` is not.
			$this->rollback( $client, $id, $mode );

			return self::COMMIT_CONFLICT === $commit
				? Errors::lockTimeout()
				: Errors::internal();
		}

		return $this->response( $mode, $id, $url, false );
	}

	/**
	 * Try the stored endpoint: fetch it, and update its events when it still serves this URL.
	 *
	 * @param StripeClient $client Bound client.
	 * @param string       $id     Stored endpoint id.
	 * @param string       $url    This site's webhook URL.
	 * @param string       $mode   Mode being registered.
	 * @return WP_REST_Response|WP_Error|null `null` means "gone at Stripe — create a new one".
	 */
	private function refresh( StripeClient $client, string $id, string $url, string $mode ) {
		$found = $client->get( '/v1/webhook_endpoints/' . rawurlencode( $id ) );

		if ( $found instanceof WP_Error ) {
			$status = (int) ( $found->get_error_data()['status'] ?? 0 );
			if ( 404 === $status ) {
				return null;
			}

			return $this->failure( $found, $mode );
		}

		$found_url = isset( $found['url'] ) && is_string( $found['url'] ) ? $found['url'] : '';
		if ( $found_url !== $url ) {
			// The stored endpoint points somewhere else — the site moved, or the id was copied from
			// another install. Leave it alone (it may be serving that other site) and make a fresh one.
			return null;
		}

		$updated = $client->post(
			'/v1/webhook_endpoints/' . rawurlencode( $id ),
			$this->body( $url, false ),
			'webhook_endpoint_update:' . $mode . ':' . $id
		);
		if ( $updated instanceof WP_Error ) {
			return $this->failure( $updated, $mode );
		}

		// The SECRET IS NOT IN THIS RESPONSE and never can be: Stripe returns it only at creation.
		// The stored one is still the right one, so it is deliberately left untouched.
		return $this->response( $mode, $id, $url, true );
	}

	/**
	 * The create/update body.
	 *
	 * @param string $url    Webhook URL.
	 * @param bool   $create Whether this is the creating call (`url` and `api_version` are
	 *                       create-only parameters at Stripe).
	 * @return array<string, mixed>
	 */
	private function body( string $url, bool $create = true ): array {
		$body = array(
			'enabled_events' => array_values( self::EVENTS ),
			'description'    => 'Aponto ' . $this->host(),
		);
		if ( $create ) {
			$body['url'] = $url;
			// PINNED to the same version the client sends, so the payload shape a driver parses is
			// the shape Stripe delivers — webhooks otherwise follow the ACCOUNT's default version,
			// which is exactly how QA BUG-1 happened.
			$body['api_version'] = StripeClient::API_VERSION;
		}

		return $body;
	}

	/**
	 * Seal the signing secret into the mode's set and remember the endpoint id.
	 *
	 * Writes through the SAME paths and the same vault a settings PUT uses, so the value the driver
	 * reads afterwards cannot depend on how it got there.
	 *
	 * @param string $mode        Mode.
	 * @param string $id          Endpoint id.
	 * @param string $secret      Signing secret.
	 * @param string $fingerprint Hash of the secret key this operation started with.
	 * @return string One of the `COMMIT_*` constants.
	 */
	private function store( string $mode, string $id, string $secret, string $fingerprint ): string {
		if ( ! $this->wpdb instanceof \wpdb ) {
			return self::COMMIT_FAILED;
		}

		// THE SAME NAME THE GENERIC SETTINGS `PUT` TAKES (Codex round 2, NEW-1). This class used to
		// hold a literal of its own, which serialized this route against itself and against nothing
		// else — so a Save landing between the write and the read-back below overwrote the signing
		// secret Stripe shows exactly once. The name now comes from the module layer that owns the
		// option row: one row, one lock, every writer.
		$lock = ( new LockFactory( $this->wpdb ) )->named( ModuleSettingsLock::name( Config::CODE, $this->wpdb ) );
		if ( ! $lock->acquire( ModuleSettingsLock::TIMEOUT ) ) {
			return self::COMMIT_CONFLICT;
		}

		try {
			// RE-READ UNDER THE LOCK, AND CHECK IT IS STILL THE SAME ACCOUNT (D-R39c, Codex A.2). The
			// old shape snapshotted the secret key, spent several seconds at Stripe, then merged its
			// result into whatever the option had become — so an operator who pasted a DIFFERENT
			// account's keys during the call ended up with account A's endpoint id and signing secret
			// filed under account B's credentials, and every webhook from then on failed a signature
			// check with nothing on screen to explain it.
			if ( self::fingerprint( $this->config->credentialsFor( $mode )['secret_key'] ) !== $fingerprint ) {
				return self::COMMIT_CONFLICT;
			}

			$path                            = Config::path( $mode, 'webhook_secret' );
			$stored                          = $this->settings->moduleOption( Config::CODE );
			$stored[ self::idPath( $mode ) ] = $id;
			$stored[ $path ]                 = $secret;

			$this->settings->updateModuleOption(
				Config::CODE,
				ModuleSecrets::forSite()->encrypt( $stored, array( $path ), Config::CODE, 'settings' )
			);

			// VERIFIED BY READ-BACK, not by the writer's return value. `update_option()` answers
			// false both for "nothing changed" and for "the write failed", and a `200` on the second
			// would leave a live endpoint at Stripe whose signing secret exists nowhere — and Stripe
			// shows that secret exactly once, so nothing could ever recover it.
			$written = $this->config->credentialsFor( $mode );
			$after   = $this->settings->moduleOption( Config::CODE );
			$id_ok   = isset( $after[ self::idPath( $mode ) ] ) && $id === (string) $after[ self::idPath( $mode ) ];

			return $id_ok && $secret === $written['webhook_secret'] ? self::COMMIT_OK : self::COMMIT_FAILED;
		} finally {
			$lock->release();
		}
	}

	/**
	 * A non-reversible fingerprint of the secret key an operation started with.
	 *
	 * A HASH, never the key: it only has to answer "is this still the same credential", and the
	 * value is compared inside one request. `''` for an absent key, so a set that was cleared while
	 * the call was in flight can never match one that was present.
	 *
	 * @param string $secret_key Stripe secret or restricted key.
	 */
	private static function fingerprint( string $secret_key ): string {
		return '' === $secret_key ? '' : hash( 'sha256', $secret_key );
	}

	/**
	 * Delete an endpoint this request created but could not record (best effort).
	 *
	 * Stripe returns the signing secret only at creation, so an endpoint whose commit failed is one
	 * nobody can ever verify: it would sit in the operator's dashboard delivering events this site
	 * answers `400`, until Stripe disables it. Removing it is the only way to leave the account as it
	 * was found. A failure here is logged and swallowed — the request is already failing, and a
	 * second error would only hide the first.
	 *
	 * @param StripeClient $client Bound client.
	 * @param string       $id     Endpoint id.
	 * @param string       $mode   Mode, for the log context.
	 */
	private function rollback( StripeClient $client, string $id, string $mode ): void {
		$deleted = $client->delete( '/v1/webhook_endpoints/' . rawurlencode( $id ) );

		$this->log(
			$deleted instanceof WP_Error ? 'aponto_payment_anomaly' : 'aponto_payment_failed',
			$deleted instanceof WP_Error ? 'error' : 'warning',
			$deleted instanceof WP_Error
				? 'Stripe webhook endpoint could not be rolled back after a failed local write.'
				: 'Stripe webhook endpoint rolled back after a failed local write.',
			'endpoint_rollback_' . $mode
		);
	}

	/**
	 * One operational line under the payment context allow-list.
	 *
	 * @param string $code     `aponto_payment_failed` or `aponto_payment_anomaly`.
	 * @param string $severity Severity.
	 * @param string $message  Stable English message.
	 * @param string $reason   Short machine reason.
	 */
	private function log( string $code, string $severity, string $message, string $reason ): void {
		( new Logger( $this->settings, new Clock() ) )->log(
			$code,
			$severity,
			$message,
			array(
				'gateway'  => Config::CODE,
				'order_id' => 0,
				'code'     => $reason,
				'kind'     => 'webhook_endpoint',
			)
		);
	}

	/**
	 * The success payload. Deliberately carries NO secret — the browser has no use for one, and a
	 * signing secret in a REST response is a signing secret in somebody's devtools history.
	 *
	 * @param string $mode      Mode.
	 * @param string $id        Endpoint id.
	 * @param string $url       Webhook URL.
	 * @param bool   $refreshed Whether an existing endpoint was updated rather than created.
	 */
	private function response( string $mode, string $id, string $url, bool $refreshed ): WP_REST_Response {
		return new WP_REST_Response(
			array(
				'mode'        => $mode,
				'endpoint_id' => $id,
				'url'         => $url,
				'events'      => array_values( self::EVENTS ),
				'refreshed'   => $refreshed,
				'secret_set'  => '' !== $this->config->credentialsFor( $mode )['webhook_secret'],
			),
			200
		);
	}

	/**
	 * Map a Stripe failure to the REST answer.
	 *
	 * @param WP_Error $error Client failure.
	 * @param string   $mode  Mode being registered.
	 */
	private function failure( WP_Error $error, string $mode ): WP_Error {
		$data = is_array( $error->get_error_data() ) ? $error->get_error_data() : array();

		if ( StripeClient::INVALID_KEY === (string) ( $data['classification'] ?? '' ) ) {
			// The key is the operator's to fix, and it is a FIELD problem, so it goes back as one
			// rather than as a gateway failure they would read as "Stripe is down".
			return Errors::validation(
				array(
					Config::path( $mode, 'secret_key' ) => __( 'Save a valid secret key for this mode first.', 'aponto' ),
				)
			);
		}

		// THE URL STRIPE CANNOT REACH (D-R40d, QA run 2 BUG-4). A local, staging or intranet install
		// is exactly where an operator presses this button first, and the generic 502 answered them
		// with "Please try again" — advice that can never work, on a site whose whole problem is that
		// it is not on the public internet. Classified on Stripe's MACHINE fields only (`url_invalid`,
		// or `invalid_request_error` blaming the `url` parameter), never on its prose (§5b.4), and
		// answered with our own sentence plus the URL to register by hand. `409` rather than `502`
		// because nothing here is retryable: the site has to become reachable first.
		$reason = (string) ( $data['reason'] ?? '' );
		$param  = (string) ( $data['param'] ?? '' );
		if ( 'url_invalid' === $reason || ( 'url' === $param && 400 === (int) ( $data['status'] ?? 0 ) ) ) {
			return Errors::make(
				'aponto_payment_unavailable',
				409,
				array( 'reason' => 'url_not_public' ),
				__( 'Stripe cannot reach this site’s URL, so one-click registration only works on a publicly reachable site. Add the webhook by hand in your Stripe dashboard using the URL shown above.', 'aponto' )
			);
		}

		return Errors::make( 'aponto_payment_error', 502 );
	}

	/**
	 * Host of this site, for the endpoint description an operator reads in Stripe's dashboard.
	 */
	private function host(): string {
		$host = wp_parse_url( home_url(), PHP_URL_HOST );

		return is_string( $host ) ? $host : 'site';
	}
}

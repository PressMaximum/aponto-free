<?php
/**
 * `/modules/{code}/connect|disconnect|test` — the integration lifecycle (rest-contract §2.12b,
 * extension-surface §4.1).
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

use Aponto\Integration\ConnectionRef;
use Aponto\Integration\ConnectionStore;
use Aponto\Integration\IntegrationRegistry;
use Aponto\Integration\IntegrationService;
use Aponto\Integration\ProjectionUnavailable;
use Aponto\Rest\Args;
use Aponto\Rest\Controller;
use Aponto\Rest\Errors;
use Aponto\Rest\Policy;
use Aponto\Rest\Services;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * The three lifecycle routes an `integration` module owns, generically: core owns the transport and
 * the storage, the module owns only the driver behind the per-key verbs (extension-surface §5).
 *
 * ### Gate order, stated honestly
 *
 * WordPress runs `permission_callback` BEFORE the route's own arguments are validated and before any
 * handler code, so the real order is CAPABILITY FIRST — not registry-first, as this docblock used to
 * claim (Codex P2 #13). That ordering is WordPress's and is not worth fighting; what matters is that
 * it leaks nothing, because the capability gate answers `401`/`403` for a request that has not been
 * told anything about the code in the URL yet.
 *
 * Inside the handler the order is then exactly what extension-surface §5.3 pins, and each step is
 * load-bearing:
 *
 *   1. **Registry.** `{code}` arrives from the URL and is about to select a hook name. Allow-listing
 *      it against `kind === 'integration'` FIRST is what stops the route being a hook-injection
 *      surface (extension-surface §1) — an unknown or non-integration code never reaches a
 *      `Plan::has()` call, let alone an `apply_filters()`.
 *   2. **`Plan::has()`.** Entitlement: edition × shipped-ness × the module toggle (D-R24).
 *   3. **The staff member exists.** A connection is stored against a staff id; accepting an
 *      arbitrary one would mint OAuth state for, and later store a token against, a row that is not
 *      there — an orphan no screen can show and no admin can disconnect (Codex P2 #13).
 *
 * Every failure in steps 1–3 answers the SAME `404 aponto_not_found` as an unknown code, so the
 * route cannot be used to enumerate which integrations exist, which have shipped, which edition this
 * site runs, or which staff ids exist. The registered `args` schemas reject a malformed `staff_id`,
 * an over-long `authorization_code` or a bad `state` before any of that.
 *
 * The permission callback is deliberately the WIDER capability of the pair; the narrower one
 * (`aponto_manage_staff` on a staff-scoped probe) is re-checked in the handler, where the body has
 * been read and it is known whether a staff member was named.
 *
 * ### What crosses the wire
 *
 * Start leg: `{authorization_url, state}`. Return leg and disconnect: the sanitized connection
 * projection. Probe: `{ok, code, message}`. Never a token, never an authorization code, never a
 * driver's raw error text — a provider message can carry a token fragment or an internal URL, so
 * failures answer with the registry's own message and the detail goes to the log
 * ({@see \Aponto\Integration\IntegrationHealth}).
 */
final class IntegrationsController implements Controller {

	/**
	 * Connection storage.
	 *
	 * @var ConnectionStore
	 */
	private ConnectionStore $connections;

	/**
	 * Lifecycle orchestration.
	 *
	 * @var IntegrationService
	 */
	private IntegrationService $service;

	/**
	 * Staff reader, used only to confirm the target row exists.
	 *
	 * @var \Aponto\Rest\Data\StaffGateway
	 */
	private \Aponto\Rest\Data\StaffGateway $staff;

	/**
	 * Construct the controller.
	 *
	 * @param Services $services Service locator.
	 */
	public function __construct( Services $services ) {
		$this->connections = new ConnectionStore(
			$services->staffMetaRepository(),
			$services->moduleSecrets(),
			$services->clock()
		);
		$this->staff       = new \Aponto\Rest\Data\StaffGateway( $services->wpdb(), $services->clock() );
		$this->service     = new IntegrationService(
			$this->connections,
			new \Aponto\Integration\OAuthState( $services->clock(), new \Aponto\Database\LockFactory( $services->wpdb() ) ),
			// The service re-checks the staff row AFTER the exchange, under its lock — the up-front
			// check below cannot see a row deleted while the operator was on the consent screen
			// (Codex round 3, P1 #8).
			$this->staff,
			new \Aponto\Booking\StaffLockFactory( $services->wpdb() )
		);
	}

	/**
	 * Register routes.
	 *
	 * @param string $rest_namespace REST namespace.
	 */
	public function register( string $rest_namespace ): void {
		register_rest_route(
			$rest_namespace,
			'/modules/(?P<code>[a-z0-9_]+)/connect',
			array(
				array(
					'methods'             => 'POST',
					'permission_callback' => array( Policy::class, 'manageStaff' ),
					'callback'            => array( $this, 'connect' ),
					'args'                => array(
						'staff_id'           => Args::argId(),
						// Length caps rather than shape rules: an authorization code is an opaque
						// provider string, so the only honest validation is "a bounded string".
						'authorization_code' => self::argBoundedString( 2048 ),
						'state'              => self::argBoundedString( 128 ),
					),
				),
			)
		);

		register_rest_route(
			$rest_namespace,
			'/modules/(?P<code>[a-z0-9_]+)/disconnect',
			array(
				array(
					'methods'             => 'POST',
					'permission_callback' => array( Policy::class, 'manageStaff' ),
					'callback'            => array( $this, 'disconnect' ),
					'args'                => array( 'staff_id' => Args::argId() ),
				),
			)
		);

		register_rest_route(
			$rest_namespace,
			'/modules/(?P<code>[a-z0-9_]+)/test',
			array(
				array(
					'methods'             => 'POST',
					'permission_callback' => array( Policy::class, 'manageSettings' ),
					'callback'            => array( $this, 'test' ),
					// Optional: absent means the GLOBAL configuration probe.
					'args'                => array( 'staff_id' => Args::argId( false ) ),
				),
			)
		);
	}

	/**
	 * POST /modules/{code}/connect.
	 *
	 * Without `authorization_code` this STARTS the handshake and answers `{authorization_url,
	 * state}`; with one it FINISHES it and answers the stored connection. The client never invents
	 * the state — it echoes the one this route minted, and the server checks that it is the state
	 * bound to this module and staff member.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function connect( WP_REST_Request $request ) {
		$code = $this->resolve( $request );
		if ( ! is_string( $code ) ) {
			return $code;
		}

		$staff_id = (int) $request->get_param( 'staff_id' );
		if ( $staff_id <= 0 ) {
			return Errors::validation( array( 'staff_id' => __( 'A staff member is required.', 'aponto' ) ) );
		}
		if ( ! $this->staffExists( $staff_id ) ) {
			return Errors::notFound();
		}

		$authorization_code = (string) $request->get_param( 'authorization_code' );
		if ( '' === $authorization_code ) {
			// The START leg reads the existing connection and mints a state; both can fail on a
			// contended projection or a storage fault, and neither used to be mapped
			// (Codex round 4, P1 #2).
			try {
				$result = $this->service->startConnect( $code, $staff_id, get_current_user_id() );
			} catch ( ProjectionUnavailable $e ) {
				// The START leg writes nothing, so it can hit a contended projection but never a
				// failed compensation — no `CompensationFailed` branch here on purpose.
				return Errors::lockTimeout();
			} catch ( \Aponto\Database\StorageException $e ) {
				return Errors::internal();
			}

			return $result instanceof WP_Error ? $result : new WP_REST_Response( $result, 200 );
		}

		$state = (string) $request->get_param( 'state' );

		try {
			$result = $this->service->completeConnect( $state, $authorization_code, $code, $staff_id );
		} catch ( \Throwable $e ) {
			// ONE catch that branches. A projection that could not be LOCKED left nothing applied, so
			// the honest answer is the retryable one the rest of the admin surface uses for lock
			// contention. {@see CompensationFailed} deliberately does NOT extend it: a rollback that
			// failed leaves a state nobody has verified, and `503` would promise a safe retry this
			// code cannot guarantee (round 5, #1). Everything else is internal.
			return $e instanceof ProjectionUnavailable ? Errors::lockTimeout() : Errors::internal();
		}

		if ( $result instanceof WP_Error ) {
			return $result;
		}

		return new WP_REST_Response( $this->representation( $code, $result ), 200 );
	}

	/**
	 * POST /modules/{code}/disconnect. Idempotent — disconnecting twice succeeds.
	 *
	 * Does NOT clear the service `used` flags (extension-surface §4.1): disconnecting one staff
	 * member is not a statement about which services the integration serves, and silently dropping
	 * that configuration would be data loss disguised as tidiness.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function disconnect( WP_REST_Request $request ) {
		$code = $this->resolve( $request );
		if ( ! is_string( $code ) ) {
			return $code;
		}

		$staff_id = (int) $request->get_param( 'staff_id' );
		if ( $staff_id <= 0 ) {
			return Errors::validation( array( 'staff_id' => __( 'A staff member is required.', 'aponto' ) ) );
		}
		// Disconnect does NOT require the staff row to exist: a hard-deleted staff member can leave a
		// connection behind, and this route has to be able to clear it.

		try {
			$result = $this->service->disconnect( $code, $staff_id );
		} catch ( \Throwable $e ) {
			// Never report "disconnected" while the token row survives; see connect() for why a failed
			// compensation is not retryable.
			return $e instanceof ProjectionUnavailable ? Errors::lockTimeout() : Errors::internal();
		}

		return new WP_REST_Response(
			array(
				'code'      => $code,
				'staff_id'  => $staff_id,
				'connected' => false,
				'revoked'   => $result->revoked,
			),
			200
		);
	}

	/**
	 * POST /modules/{code}/test — a health probe that writes no business data.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function test( WP_REST_Request $request ) {
		$code = $this->resolve( $request );
		if ( ! is_string( $code ) ) {
			return $code;
		}

		$staff_id = (int) $request->get_param( 'staff_id' );
		if ( $staff_id > 0 && ! current_user_can( Policy::MANAGE_STAFF ) ) {
			// Probing a named staff member is a staff-scoped read (extension-surface §4.1).
			return Errors::forbidden();
		}
		if ( $staff_id > 0 && ! $this->staffExists( $staff_id ) ) {
			return Errors::notFound();
		}

		// The probe WRITES: a `needs_reconnect` answer flips the stored status, so it can fail on the
		// projection exactly like connect and disconnect (Codex round 4).
		try {
			$result = $this->service->test( $code, max( 0, $staff_id ) );
		} catch ( \Throwable $e ) {
			return $e instanceof ProjectionUnavailable ? Errors::lockTimeout() : Errors::internal();
		}

		if ( $result instanceof WP_Error ) {
			return $result;
		}

		return new WP_REST_Response(
			array(
				'ok'      => $result->ok,
				'code'    => $result->code,
				'message' => $result->message,
			),
			200
		);
	}

	/**
	 * Allow-list the URL code and check entitlement, or return the uniform 404.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return string|WP_Error Sanitized code, or the error to return.
	 */
	private function resolve( WP_REST_Request $request ) {
		$code = sanitize_key( (string) $request->get_param( 'code' ) );

		return IntegrationRegistry::isActive( $code ) ? $code : Errors::notFound();
	}

	/**
	 * Whether a staff row actually exists (Codex P2 #13).
	 *
	 * Answering `404` rather than `422` on a miss keeps this route from confirming which staff ids
	 * exist — the same enumeration posture as an unknown module code.
	 *
	 * @param int $staff_id Staff id.
	 */
	private function staffExists( int $staff_id ): bool {
		return null !== $this->staff->find( $staff_id );
	}

	/**
	 * A bounded, sanitized string argument.
	 *
	 * @param int $max Maximum length in bytes.
	 * @return array<string, mixed>
	 */
	private static function argBoundedString( int $max ): array {
		return array(
			'required'          => false,
			'default'           => '',
			'type'              => 'string',
			'sanitize_callback' => static fn ( $value ): string => is_scalar( $value ) ? trim( (string) $value ) : '',
			'validate_callback' => static function ( $value ) use ( $max ) {
				if ( ! is_scalar( $value ) ) {
					return new \WP_Error( 'aponto_field', __( 'This value is invalid.', 'aponto' ) );
				}

				return strlen( (string) $value ) <= $max
					? true
					: new \WP_Error( 'aponto_field', __( 'This value is too long.', 'aponto' ) );
			},
		);
	}

	/**
	 * The sanitized connection projection — everything the panel renders, nothing it must not see.
	 *
	 * @param string        $code       Module code.
	 * @param ConnectionRef $connection Connection.
	 * @return array<string, mixed>
	 */
	private function representation( string $code, ConnectionRef $connection ): array {
		return array(
			'code'         => $code,
			'staff_id'     => $connection->staff_id,
			'connected'    => true,
			'status'       => $connection->status,
			'account'      => $connection->account,
			'connected_at' => $connection->connected_at,
		);
	}
}

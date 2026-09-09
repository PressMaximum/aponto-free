<?php
/**
 * Connect / disconnect / test orchestration (extension-surface §4.1, §5.1, §5.2).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Integration;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Booking\StaffLockFactory;
use Aponto\Rest\Errors;
use Aponto\Rest\Data\StaffGateway;
use WP_Error;

/**
 * The lifecycle half of the integration surface: it dispatches the four V1 driver verbs and owns
 * everything around them — the allow-list, the state, the sealing, the projection.
 *
 * ONE service, two callers: the REST routes (`/modules/{code}/connect|disconnect|test`) and the
 * shared OAuth callback. They must behave identically — the return leg is the same exchange
 * whether the provider redirected the browser back or an admin pasted a code — and the only way to
 * guarantee that is for both to walk this code, not two copies of it.
 *
 * ### Dispatch contract (extension-surface §5.2)
 *
 * Every result-returning verb is dispatched with `WP_Error('aponto_driver_missing', …, 501)` as the
 * INITIAL value, so a code whose driver is absent — a shipped registry entry whose provider failed
 * to boot, an integration nobody implemented yet — answers `501` instead of silently succeeding.
 * A driver that returns anything other than the typed result or a `WP_Error` is treated as absent
 * for the same reason: an unrecognised shape is not evidence that the operation happened.
 *
 * ### What never crosses the boundary
 *
 * Authorization codes and tokens go IN to a driver and never come back out through this class: the
 * connect result's payload goes straight to {@see ConnectionStore::save()}, and what callers get
 * back is a {@see ConnectionRef} whose payload is unreachable without asking for it. Driver error
 * messages are NOT passed through to REST either — a provider's raw error text can carry a token
 * fragment or an internal URL, so it is logged and replaced by the registry's message.
 */
final class IntegrationService {

	/**
	 * Error code for a verb no driver answered (extension-surface §5.2).
	 */
	public const DRIVER_MISSING = 'aponto_driver_missing';

	/**
	 * Error code for a callback whose `state` is unknown, spent, expired or malformed.
	 */
	public const STATE_INVALID = 'aponto_oauth_state_invalid';

	/**
	 * Error code for a driver that answered with a failure.
	 */
	public const DRIVER_ERROR = 'aponto_integration_error';

	/**
	 * Construct the service.
	 *
	 * @param ConnectionStore       $connections Connection storage.
	 * @param OAuthState            $state       State minting/consumption.
	 * @param StaffGateway|null     $staff       Staff reader (existence recheck before storing).
	 * @param StaffLockFactory|null $staff_locks Per-staff lock factory.
	 */
	public function __construct(
		private ConnectionStore $connections,
		private OAuthState $state,
		private ?StaffGateway $staff = null,
		private ?StaffLockFactory $staff_locks = null
	) {}

	/**
	 * Build a service from the global handles.
	 *
	 * @param ConnectionStore|null $connections Store to share, or null to build one.
	 */
	public static function make( ?ConnectionStore $connections = null ): self {
		global $wpdb;

		return new self(
			// A caller that already holds the projection lock passes ITS store, so the lock registry,
			// the clock and the vault are the same objects the caller reasoned about
			// (Codex round 5, #6). Building a second store here is safe for the lock itself — the
			// registry is process-wide — but sharing the instance keeps the ownership obvious.
			$connections ?? ConnectionStore::make(),
			OAuthState::make(),
			new StaffGateway( $wpdb, new \Aponto\Support\Clock() ),
			new StaffLockFactory( $wpdb )
		);
	}

	/**
	 * START leg: mint a bound state and ask the driver for the provider's authorization URL.
	 *
	 * @param string $code     Module code (caller has already allow-listed it).
	 * @param int    $staff_id Staff member being connected.
	 * @param int    $user_id  WordPress user driving the flow.
	 * @return array{authorization_url: string, state: string}|WP_Error
	 */
	public function startConnect( string $code, int $staff_id, int $user_id ) {
		// Checked BEFORE the handshake starts, not after Google redirects back (Codex P1 #3): a site
		// that cannot seal a token must not send its operator through a consent screen whose result
		// it would then have to throw away.
		if ( ! ConnectionStore::canSeal() ) {
			return self::keyMaterialError();
		}

		$redirect_uri = IntegrationRegistry::redirectUri();
		$state        = $this->state->mint( $code, $staff_id, $user_id, $redirect_uri );

		$result = $this->dispatchConnect(
			new ConnectRequest(
				$code,
				$staff_id,
				$user_id,
				$redirect_uri,
				$state,
				'',
				$this->connections->find( $code, $staff_id )
			)
		);

		if ( $result instanceof WP_Error ) {
			return $result;
		}
		if ( '' === $result->authorization_url ) {
			return self::error( self::DRIVER_ERROR, 502 );
		}

		return array(
			'authorization_url' => $result->authorization_url,
			'state'             => $state,
		);
	}

	/**
	 * RETURN leg: consume the state, exchange the code and seal the connection.
	 *
	 * The state is what decides the module and the staff member; `$code`/`$staff_id` supplied by a
	 * caller are only CHECKED against it, never trusted over it. A REST caller that passes a
	 * different pair than the one bound at mint time is refused, because a mismatch means the
	 * handshake being completed is not the handshake that was started.
	 *
	 * @param string $raw_state          Raw state from the provider's redirect.
	 * @param string $authorization_code Authorization code from the provider.
	 * @param string $expect_code        Module code the caller believes this is, or ''.
	 * @param int    $expect_staff_id    Staff id the caller believes this is, or 0.
	 * @return ConnectionRef|WP_Error
	 * @throws ProjectionUnavailable When the connection projection cannot be updated — or, as
	 *                               {@see CompensationFailed}, when rolling that write back also
	 *                               failed and the resulting state is unverified.
	 * @throws \Aponto\Database\StorageException When the connection row cannot be written.
	 */
	public function completeConnect( string $raw_state, string $authorization_code, string $expect_code = '', int $expect_staff_id = 0 ) {
		// PEEK → VERIFY → CONSUME, the same order the denied leg uses (Codex round 5, #8). Consuming
		// first meant a second admin hitting this endpoint with someone else's state BURNED it before
		// the binding was ever compared — the owner then finished their consent screen and was told
		// the link had expired, with nothing to explain why. A state must only be spent by the person
		// it was minted for.
		$peeked = $this->state->peek( $raw_state );
		if ( null !== $peeked && 0 !== $peeked['user_id'] && get_current_user_id() !== $peeked['user_id'] ) {
			return self::error( self::STATE_INVALID, 400 );
		}

		$bound = $this->state->consume( $raw_state );
		if ( null === $bound ) {
			return self::error( self::STATE_INVALID, 400 );
		}
		if ( ( '' !== $expect_code && $expect_code !== $bound['code'] ) || ( 0 !== $expect_staff_id && $expect_staff_id !== $bound['staff_id'] ) ) {
			return self::error( self::STATE_INVALID, 400 );
		}
		// THE USER BINDING, enforced (Codex P1 #6). The state records who STARTED the handshake, and
		// until now nothing compared it: any admin holding `aponto_manage_staff` could finish a
		// colleague's flow — on a shared browser, from a copied redirect, or by racing them — and the
		// resulting connection would be attributed to a grant they never gave. The state binds five
		// facts; all five have to hold, or it is not the handshake that was started.
		if ( 0 !== $bound['user_id'] && get_current_user_id() !== $bound['user_id'] ) {
			return self::error( self::STATE_INVALID, 400 );
		}
		if ( ! IntegrationRegistry::isActive( $bound['code'] ) ) {
			return self::error( self::STATE_INVALID, 400 );
		}
		if ( ! ConnectionStore::canSeal() ) {
			return self::keyMaterialError();
		}

		$result = $this->dispatchConnect(
			new ConnectRequest(
				$bound['code'],
				$bound['staff_id'],
				$bound['user_id'],
				$bound['redirect_uri'],
				$raw_state,
				$authorization_code,
				$this->connections->find( $bound['code'], $bound['staff_id'] )
			)
		);

		if ( $result instanceof WP_Error ) {
			return $result;
		}
		if ( array() === $result->data ) {
			return self::error( self::DRIVER_ERROR, 502 );
		}

		// RECHECK THE STAFF ROW, UNDER ITS LOCK, BEFORE STORING (Codex round 3, P1 #8). The exchange
		// is a network round trip through a third party's consent screen, and the staff member can be
		// deleted while it is in flight — by another admin, or by this one in a second tab. Storing
		// then would create a connection nothing lists and nobody can disconnect, holding a live
		// Google grant. The lock is the SAME one the delete path takes, so the two serialize.
		$lock = null !== $this->staff_locks ? $this->staff_locks->forStaff( $bound['staff_id'] ) : null;
		if ( null !== $lock && ! $lock->acquire( 3 ) ) {
			$this->discardGrant( $bound['code'], $bound['staff_id'], $result->data, $result->account );

			return self::error( 'aponto_lock_timeout', 503 );
		}

		try {
			if ( null !== $this->staff && null === $this->staff->find( $bound['staff_id'] ) ) {
				// The grant is real but has no owner. Hand it back to the provider rather than
				// storing it, and answer with the same uniform 404 an unknown staff id gets.
				$this->discardGrant( $bound['code'], $bound['staff_id'], $result->data, $result->account );

				return Errors::notFound();
			}

			return $this->connections->save( $bound['code'], $bound['staff_id'], $result->data, $result->account );
		} catch ( ProjectionUnavailable $e ) {
			throw $e;
		} catch ( \Aponto\Database\StorageException $e ) {
			throw $e;
		} catch ( \Throwable $e ) {
			// A storage failure here MUST NOT read as a successful connect (Codex P1 #4). The token
			// is discarded with the exception; the operator retries and Google issues a new one.
			IntegrationHealth::make()->recordFailure( $bound['code'], 'connect', 'Storing the connection failed.', $bound['staff_id'] );

			return self::error( 'aponto_internal', 500 );
		} finally {
			if ( null !== $lock ) {
				$lock->release();
			}
		}
	}

	/**
	 * Hand a freshly issued grant back to the provider without ever storing it.
	 *
	 * Best effort by definition — the local side is already the state we want (nothing stored), and
	 * a provider that cannot be reached only means the operator may see a stale entry on their Google
	 * account page. Leaving a live grant behind silently is still worse than trying.
	 *
	 * @param string               $code     Module code.
	 * @param int                  $staff_id Staff id the grant was for.
	 * @param array<string, mixed> $data     Fresh connection payload (never persisted).
	 * @param string               $account  Account label.
	 */
	private function discardGrant( string $code, int $staff_id, array $data, string $account ): void {
		try {
			apply_filters(
				'aponto_disconnect_' . $code,
				self::error( self::DRIVER_MISSING, 501 ),
				new DisconnectRequest(
					$code,
					$staff_id,
					new ConnectionRef( $code, $staff_id, $account, ConnectionRef::ACTIVE, '', $data )
				)
			);
		} catch ( \Throwable $e ) {
			return;
		}
	}

	/**
	 * Revoke remotely (best effort) then delete the local connection.
	 *
	 * The local delete happens EVEN when the driver reports failure. A provider that is down, a
	 * token that is already dead and a network that is unreachable must never leave the operator
	 * unable to disconnect — that would be a one-way door in the opposite direction to D-R31's.
	 * Idempotent: disconnecting an already-disconnected staff member succeeds.
	 *
	 * @param string $code     Module code.
	 * @param int    $staff_id Staff id.
	 */
	public function disconnect( string $code, int $staff_id ): DisconnectResult {
		$connection = $this->connections->find( $code, $staff_id );

		$result = apply_filters(
			'aponto_disconnect_' . $code,
			self::error( self::DRIVER_MISSING, 501 ),
			new DisconnectRequest( $code, $staff_id, $connection )
		);

		// The LOCAL delete is what the caller is promised, so its failure is the caller's business
		// (Codex P1 #4): the repository throws, and the exception travels to the route, which answers
		// `aponto_internal`. Claiming "disconnected" while the token row survives is the one outcome
		// this method must never produce.
		$this->connections->delete( $code, $staff_id );

		return $result instanceof DisconnectResult ? $result : new DisconnectResult( false );
	}

	/**
	 * Probe a connection (or the global configuration when `$staff_id` is 0).
	 *
	 * A `needs_reconnect` answer is WRITTEN BACK to the connection status, which is the whole point
	 * of having a probe distinct from connect: the catalog must be able to stop claiming a staff
	 * member is connected without anyone booking anything (extension-surface §5.1).
	 *
	 * @param string $code     Module code.
	 * @param int    $staff_id Staff id, or 0 for a global probe.
	 * @return ConnectionTestResult|WP_Error
	 */
	public function test( string $code, int $staff_id = 0 ) {
		$connection = $staff_id > 0 ? $this->connections->find( $code, $staff_id ) : null;

		$result = apply_filters(
			'aponto_test_' . $code,
			self::error( self::DRIVER_MISSING, 501 ),
			new ConnectionTestRequest( $code, $staff_id, $connection )
		);

		if ( $result instanceof WP_Error ) {
			return $result;
		}
		if ( ! $result instanceof ConnectionTestResult ) {
			return self::error( self::DRIVER_MISSING, 501 );
		}

		// ONLY A DEFINITIVE ANSWER MOVES THE STATUS (Codex round 5, #3). The old branch was binary —
		// anything that was not `needs_reconnect` counted as healthy — so an INCONCLUSIVE probe
		// (rate-limited, unreachable, credentials missing) both failed to report and quietly reset a
		// connection that a previous call had already marked dead. A probe that could not reach an
		// opinion must leave the recorded one alone.
		if ( $staff_id > 0 && null !== $connection ) {
			if ( $result->needsReconnect() ) {
				$this->connections->markStatus( $code, $staff_id, ConnectionRef::NEEDS_RECONNECT );
			} elseif ( $result->ok ) {
				$this->connections->markStatus( $code, $staff_id, ConnectionRef::ACTIVE );
			}
		}

		return $result;
	}

	/**
	 * Remove every LOCAL connection a staff member holds, across all active integrations.
	 *
	 * Split from the remote revoke on purpose (Codex P1 #10). This half is pure SQL and safe to run
	 * inside the caller's serialized critical section — the staff hard-delete holds a per-staff
	 * advisory lock — while the revoke is HTTP and must happen after the lock is released. Returning
	 * the removed refs is what lets the caller do the second half without re-reading rows that no
	 * longer exist.
	 *
	 * @param int                  $staff_id Staff id.
	 * @param ProjectionLease|null $lease    Proof the caller already holds the projection lock — the
	 *                                       staff hard-delete takes it before opening its transaction,
	 *                                       and hands it down rather than letting this code guess.
	 * @return array<string, ConnectionRef> Removed connections, keyed by module code.
	 */
	public function forgetStaff( int $staff_id, ?ProjectionLease $lease = null ): array {
		$removed = array();
		// EVERY registry integration, not just the active ones (Codex round 3, P1 #6): the tokens
		// most in need of removal belong to a module that was switched off or lost to a downgrade,
		// and `Plan::has()` answers false for exactly those.
		foreach ( IntegrationRegistry::allCodes() as $code ) {
			try {
				$connection = $this->connections->find( $code, $staff_id );
			} catch ( \Throwable $e ) {
				// The envelope cannot be opened (key material gone). The ROW must still go — a token
				// nobody can read is still a token — so delete blind and skip the remote revoke.
				$this->connections->delete( $code, $staff_id, $lease );
				continue;
			}
			if ( null === $connection ) {
				continue;
			}
			$removed[ $code ] = $connection;
			$this->connections->delete( $code, $staff_id, $lease );
		}

		return $removed;
	}

	/**
	 * Best-effort remote revoke for connections already removed locally.
	 *
	 * Runs OUTSIDE any lock and swallows every failure: the local credential is already gone, so the
	 * only thing at stake is whether the grant also disappears from the provider's side, and a
	 * provider outage must not turn a staff deletion into an error.
	 *
	 * @param array<string, ConnectionRef> $removed Connections removed by {@see self::forgetStaff()}.
	 */
	public function revokeRemoved( array $removed ): void {
		foreach ( $removed as $code => $connection ) {
			// Only where a driver is actually loaded: dispatching for a disabled module would hand
			// the initial `aponto_driver_missing` straight back and log a failure for work that was
			// never possible.
			if ( ! has_filter( 'aponto_disconnect_' . $code ) ) {
				continue;
			}
			try {
				apply_filters(
					'aponto_disconnect_' . $code,
					self::error( self::DRIVER_MISSING, 501 ),
					new DisconnectRequest( (string) $code, $connection->staff_id, $connection )
				);
			} catch ( \Throwable $e ) {
				// Nothing to recover: the local side is already clean.
				continue;
			}
		}
	}

	/**
	 * The connection store this service writes through.
	 */
	public function connections(): ConnectionStore {
		return $this->connections;
	}

	/**
	 * Dispatch `aponto_connect_{key}` and normalise anything that is not a typed result.
	 *
	 * @param ConnectRequest $request Connect request.
	 * @return ConnectionResult|WP_Error
	 */
	private function dispatchConnect( ConnectRequest $request ) {
		$result = apply_filters(
			'aponto_connect_' . $request->module_code,
			self::error( self::DRIVER_MISSING, 501 ),
			$request
		);

		if ( $result instanceof ConnectionResult || $result instanceof WP_Error ) {
			return $result;
		}

		return self::error( self::DRIVER_MISSING, 501 );
	}

	/**
	 * The error for a site whose key material cannot protect a token (Codex P1 #3).
	 *
	 * Points at Site Health, which already carries the `SECURE_AUTH_KEY` check and the link to
	 * WordPress' key generator, rather than repeating wp-config instructions in a toast.
	 */
	private static function keyMaterialError(): WP_Error {
		return new WP_Error(
			'aponto_internal',
			__( 'Aponto cannot store this connection securely because this site has no unique SECURE_AUTH_KEY. See Tools → Site Health for how to add one.', 'aponto' ),
			array(
				'status' => 500,
				'fields' => (object) array(),
			)
		);
	}

	/**
	 * Build the initial/failure {@see WP_Error} in the registry's envelope shape.
	 *
	 * @param string $code   Stable error code.
	 * @param int    $status HTTP status.
	 */
	private static function error( string $code, int $status ): WP_Error {
		return new WP_Error(
			$code,
			\Aponto\Rest\Errors::message( $code ),
			array(
				'status' => $status,
				'fields' => (object) array(),
			)
		);
	}
}

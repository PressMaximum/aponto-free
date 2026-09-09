<?php
/**
 * Single-use, bound OAuth `state` (extension-surface §4.1).
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

use Aponto\Database\LockFactory;
use Aponto\Database\StorageException;
use Aponto\Support\Clock;

/**
 * Mints and consumes the OAuth `state` parameter — the ONLY thing that authenticates the shared
 * `admin-post.php?action=aponto_oauth_callback` return leg (extension-surface §4.1).
 *
 * Because the callback is one URL for every module and every staff member, the state has to carry
 * the whole decision: which module, which staff member, which WordPress user started it, and which
 * redirect URI was promised to the provider. All five facts are BOUND server-side and none of them
 * is read from the request, so a forged callback cannot steer the exchange at a module or a staff
 * member the operator never chose.
 *
 * Properties, and why each one is required rather than nice to have:
 *
 *   - **CSPRNG** (`random_bytes`, 32 bytes hex): the state doubles as the CSRF token for a
 *     side-effectful admin request, so it must be unguessable, not merely unique (§5 invariant 8).
 *   - **Hash-only storage**: the transient is keyed by `sha256(state)` and the raw value never
 *     touches the database — the same posture booking manage tokens use, so a database read cannot
 *     replay a live handshake.
 *   - **Single use**: {@see self::consume()} deletes the transient BEFORE returning, so a replayed
 *     callback (the browser back button, a leaked referrer) finds nothing.
 *   - **Short expiry** ({@see self::TTL}): a consent screen the operator abandons expires by itself.
 *
 * The state value is never logged, never echoed into a page and never returned by any route other
 * than the connect start leg that minted it.
 */
final class OAuthState {

	/**
	 * Transient key prefix.
	 */
	private const PREFIX = 'aponto_oauth_state_';

	/**
	 * Lifetime in seconds — long enough for a consent screen, short enough to be worthless later.
	 */
	public const TTL = 600;

	/**
	 * Construct.
	 *
	 * @param Clock|null       $clock Injectable clock (§5 invariant 7).
	 * @param LockFactory|null $locks Advisory-lock factory serializing consumption.
	 */
	public function __construct(
		private ?Clock $clock = null,
		private ?LockFactory $locks = null
	) {}

	/** Build from the global handles. */
	public static function make(): self {
		global $wpdb;

		return new self( new Clock(), new LockFactory( $wpdb ) );
	}

	/**
	 * Mint a state bound to one connect attempt and return the RAW value for the redirect URL.
	 *
	 * @param string $code         Module code (already allow-listed by the caller).
	 * @param int    $staff_id     Staff member being connected.
	 * @param int    $user_id      WordPress user driving the flow.
	 * @param string $redirect_uri Redirect URI promised to the provider.
	 * @return string Raw state value.
	 * @throws StorageException When the state could not be persisted.
	 */
	public function mint( string $code, int $staff_id, int $user_id, string $redirect_uri ): string {
		$state = bin2hex( random_bytes( 32 ) );
		$key   = self::key( $state );

		set_transient(
			$key,
			array(
				'code'         => $code,
				'staff_id'     => $staff_id,
				'user_id'      => $user_id,
				'redirect_uri' => $redirect_uri,
				'expires_at'   => $this->now() + self::TTL,
			),
			self::TTL
		);

		// VERIFY IT LANDED (Codex round 4, P2). An unchecked `set_transient` can hand the operator an
		// authorization URL whose state was never stored — they complete the whole consent flow on
		// Google and come back to "this link has expired", with nothing to explain it. Failing here
		// costs one click instead.
		if ( ! is_array( get_transient( $key ) ) ) {
			throw StorageException::fromSqlError( esc_html( 'oauth state mint' ), esc_html( 'the state transient did not persist' ) );
		}

		return $state;
	}

	/**
	 * Consume a state exactly once, returning its bound facts or null.
	 *
	 * Null covers every failure identically — unknown, already used, expired, malformed — because
	 * the caller must answer them all with the same message: distinguishing "expired" from "never
	 * existed" would tell an attacker whether a handshake is in flight.
	 *
	 * @param string $state Raw state value from the callback.
	 * @return array{code: string, staff_id: int, user_id: int, redirect_uri: string}|null
	 */
	public function consume( string $state ): ?array {
		if ( 1 !== preg_match( '/^[a-f0-9]{64}$/', $state ) ) {
			return null;
		}

		$key = self::key( $state );

		// `get_transient` then `delete_transient` is READ-THEN-WRITE, not an atomic consume: two
		// concurrent callbacks presenting the same state can both read it before either deletes, and
		// both would then complete a handshake the operator started once (Codex P2 #11). The pair is
		// therefore serialized under an advisory lock keyed by the state DIGEST — the same
		// {@see LockFactory} the reservation path uses, so SQLite is covered too (D-R20).
		//
		// A lock that cannot be acquired is treated as a REFUSAL here, unlike the projection's
		// best-effort lock: failing a connect attempt costs a retry, while admitting a second
		// consumer would defeat the single-use property this method exists to provide.
		// THE LOCK IS MANDATORY (Codex round 3, P2). A null factory used to mean "skip the lock", so a
		// production path that forgot to pass one silently lost the single-winner property this
		// method exists to provide. It is resolved from the global handle instead, and a lock that
		// cannot be taken REFUSES — failing a connect costs a retry; admitting a second consumer
		// completes a handshake the operator started once.
		$locks = $this->locks ?? new LockFactory( $GLOBALS['wpdb'] );
		$lock  = $locks->named( 'apt:oauth:' . substr( hash( 'sha256', $state ), 0, 24 ) );
		if ( ! $lock->acquire( 5 ) ) {
			return null;
		}

		try {
			$stored = get_transient( $key );

			// Delete before deciding: a state is spent the moment it is looked at, whatever the
			// outcome.
			delete_transient( $key );

			// A DELETE THAT DID NOT TAKE leaves the state live for a replay, so the state is marked
			// SPENT explicitly rather than trusted to be gone. `set_transient` over the same key
			// replaces the payload with a sentinel that no longer decodes into bound facts, which is
			// the same end state as deletion for every reader (Codex round 3, P2).
			if ( false !== get_transient( $key ) ) {
				set_transient( $key, array( 'spent' => true ), self::TTL );

				// CHECKED (Codex round 4, P2): if neither the delete nor the marker took, the state is
				// still live and replayable, and reporting a successful consume would be exactly the
				// single-use guarantee this method exists to provide, broken silently.
				$after = get_transient( $key );
				if ( ! is_array( $after ) || ! isset( $after['spent'] ) ) {
					return null;
				}
			}

			if ( ! is_array( $stored ) || isset( $stored['spent'] ) ) {
				return null;
			}
			if ( isset( $stored['expires_at'] ) && (int) $stored['expires_at'] < $this->now() ) {
				return null; // Belt and braces: a transient can outlive its TTL on an object cache.
			}

			return array(
				'code'         => (string) ( $stored['code'] ?? '' ),
				'staff_id'     => (int) ( $stored['staff_id'] ?? 0 ),
				'user_id'      => (int) ( $stored['user_id'] ?? 0 ),
				'redirect_uri' => (string) ( $stored['redirect_uri'] ?? '' ),
			);
		} finally {
			$lock->release();
		}
	}

	/**
	 * Read a state's bound facts WITHOUT consuming it.
	 *
	 * Exists for the denied leg (Codex round 4, P2). That path also has to spend the state — a denial
	 * must not leave a replayable handshake — but it has to check the USER BINDING first, and
	 * consuming before comparing let any admin burn a colleague's in-flight state by visiting the
	 * callback with an `error` parameter. Peek, verify, then consume.
	 *
	 * @param string $state Raw state value.
	 * @return array{code: string, staff_id: int, user_id: int, redirect_uri: string}|null
	 */
	public function peek( string $state ): ?array {
		if ( 1 !== preg_match( '/^[a-f0-9]{64}$/', $state ) ) {
			return null;
		}

		$stored = get_transient( self::key( $state ) );
		if ( ! is_array( $stored ) || isset( $stored['spent'] ) ) {
			return null;
		}

		return array(
			'code'         => (string) ( $stored['code'] ?? '' ),
			'staff_id'     => (int) ( $stored['staff_id'] ?? 0 ),
			'user_id'      => (int) ( $stored['user_id'] ?? 0 ),
			'redirect_uri' => (string) ( $stored['redirect_uri'] ?? '' ),
		);
	}

	/** The current instant, from the injected clock (§5 invariant 7). */
	private function now(): int {
		return ( $this->clock ?? new Clock() )->now()->getTimestamp();
	}

	/**
	 * Transient key for a raw state — hash-only, never the value itself.
	 *
	 * @param string $state Raw state value.
	 */
	private static function key( string $state ): string {
		return self::PREFIX . hash( 'sha256', $state );
	}
}

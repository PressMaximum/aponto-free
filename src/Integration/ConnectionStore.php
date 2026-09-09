<?php
/**
 * Per-staff integration connection storage (extension-surface §4, §5.3).
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

use Aponto\Booking\Repository\StaffMetaRepository;
use Aponto\Database\LockFactory;
use Aponto\Database\StorageException;
use Aponto\Database\TransactionGuard;
use Aponto\Support\Clock;
use Aponto\Support\Crypto;
use Aponto\Support\ModuleSecrets;

/**
 * Owns the `connected` tier of the integration 4-state (extension-surface §4): one VERSIONED
 * envelope per (module, staff), stored in `aponto_staff_meta` under `integration.{code}.connection`.
 *
 * Envelope shape (JSON, `autoload` is irrelevant — this is a table row, not an option):
 *
 *     {"v":1,"code":"…","status":"active","account":"…","connected_at":"…","updated_at":"…",
 *      "data":{ … driver payload, declared secret paths sealed … }}
 *
 * Only the paths a driver declares through `aponto_module_secret_keys($keys, $code,
 * 'staff_connection')` are encrypted, each under the context `{code}|staff_connection|{path}`
 * (extension-surface §5.3.5), so a cipher blob lifted from one field, scope or module cannot be
 * decrypted at another. Everything the ADMIN SCREEN needs — the account label, the status, the
 * connect timestamp — stays in clear inside the same envelope, which is what lets the catalog
 * render "Connected as …" without ever decrypting a token.
 *
 * ### The index
 *
 * A second, tiny, AUTOLOADED option (`aponto_integration_connections`) mirrors the non-secret
 * metadata of every connection. It is a projection, never a source of truth for tokens, and it
 * exists for one reason: the availability busy adapter runs on the display path of every public
 * availability request, and it must be able to answer "does this site have any connected staff at
 * all" WITHOUT a query. On a site with no integrations the adapter reads one autoloaded option that
 * WordPress has already loaded, finds it empty and returns — which is what keeps the CI-enforced
 * "≤ 5 SQL queries per staff-month availability call" budget intact (D-R34).
 *
 * A projection can drift, so the drift is defined rather than assumed: if the index names a staff
 * member whose envelope row is gone, {@see self::find()} answers null, the caller treats the staff
 * as NOT connected, and the entry is pruned. The opposite drift (a row with no index entry) is
 * repaired by {@see self::rebuildIndex()}, which every write already calls.
 */
final class ConnectionStore {

	/**
	 * Envelope version. Bump only with a reader that still understands version 1.
	 */
	public const VERSION = 1;

	/**
	 * Secret-declaration scope for connection payloads (extension-surface §2).
	 */
	public const SCOPE = 'staff_connection';

	/**
	 * Autoloaded projection of every connection's non-secret metadata.
	 */
	public const INDEX_OPTION = 'aponto_integration_connections';

	/**
	 * Name of the advisory lock serializing projection writes.
	 */
	public const PROJECTION_LOCK = 'apt:integration:index';

	/**
	 * How many times uninstall retries the projection lock before deferring its purge.
	 */
	private const UNINSTALL_LOCK_ATTEMPTS = 3;

	/**
	 * Module codes whose projection slice must be dropped by the next LOCKED projection write.
	 *
	 * The deferred half of uninstall (Codex round 7, P1-A). Uninstall must not leave the staff
	 * member's account email in an autoloaded option, but it also must not touch the SHARED
	 * projection without the lock: an unlocked `delete_option()` races every lock-holding writer, and
	 * loses either its own valid slice or the purge itself depending on who writes last.
	 *
	 * A marker is the way out. It is a SEPARATE option — writing it cannot corrupt the projection —
	 * and {@see self::index()} filters the named modules out on every read, so a purge-pending slice
	 * is invisible to `activeStaffIds()`, `hasAnyConnection()` and the cron the moment the marker
	 * lands. The bytes then leave the option at the next locked mutation, which is the only place
	 * that may rewrite it.
	 */
	public const PURGE_OPTION = 'aponto_integration_purge_pending';

	/**
	 * How many times a purge-marker compare-and-swap re-reads and retries before giving up.
	 */
	private const PURGE_CAS_ATTEMPTS = 5;

	/**
	 * Construct the store.
	 *
	 * @param StaffMetaRepository $meta    Staff metadata repository.
	 * @param ModuleSecrets       $secrets Secret sealing helper.
	 * @param Clock               $clock   Injectable clock (§5 invariant 7).
	 * @param LockFactory|null    $locks   Advisory-lock factory serializing projection writes.
	 */
	public function __construct(
		private StaffMetaRepository $meta,
		private ModuleSecrets $secrets,
		private Clock $clock,
		private ?LockFactory $locks = null
	) {}

	/**
	 * Build a store from the global handles.
	 *
	 * A named factory rather than container wiring, because a DRIVER calls this: a module refreshing
	 * an expired token inside `pull_busy` needs to persist the new one, and extension-surface §5.1
	 * deliberately gives it no `refresh` verb to do that through.
	 */
	public static function make(): self {
		global $wpdb;

		return new self(
			new StaffMetaRepository( $wpdb ),
			// NO substitute key material (Codex P1 #3). A placeholder such as `'fallback'` passes
			// `Crypto::isUsableKeyMaterial()` and would seal every site's tokens under a key printed
			// in the source — the illusion of encryption at rest, which REST-7/D-R15 forbid outright.
			// The real value is passed through as-is, and {@see self::assertSealable()} refuses to
			// store a connection when it is unusable.
			new ModuleSecrets( new Crypto( self::keyMaterial() ) ),
			new Clock(),
			new LockFactory( $wpdb )
		);
	}

	/** The site's raw key material — possibly empty, never substituted. */
	public static function keyMaterial(): string {
		return ModuleSecrets::siteKeyMaterial();
	}

	/**
	 * Whether this site can seal a connection at all.
	 *
	 * Split out so callers can ask BEFORE starting an OAuth handshake, instead of discovering it
	 * after the operator has authorized on Google's consent screen.
	 */
	public static function canSeal(): bool {
		return Crypto::isUsableKeyMaterial( self::keyMaterial() );
	}

	/**
	 * The decrypted connection for a staff member, or null when there is none.
	 *
	 * @param string $code     Module code.
	 * @param int    $staff_id Staff id.
	 */
	public function find( string $code, int $staff_id ): ?ConnectionRef {
		$raw = $this->meta->get( $staff_id, IntegrationRegistry::connectionKey( $code ) );
		if ( null === $raw || '' === $raw ) {
			// BEST EFFORT (Codex round 4, P1 #2). This is a read answering "is there a connection?",
			// and the answer is already known; pruning the stale projection entry is housekeeping the
			// caller did not ask for. Letting it take — and fail on — the projection WRITE lock turned
			// every lookup into a contention point, including the availability path.
			$this->forgetInIndex( $code, $staff_id, true );

			return null;
		}

		$envelope = json_decode( $raw, true );
		if ( ! is_array( $envelope ) || self::VERSION !== (int) ( $envelope['v'] ?? 0 ) ) {
			return null;
		}

		$data = is_array( $envelope['data'] ?? null ) ? $envelope['data'] : array();

		return new ConnectionRef(
			$code,
			$staff_id,
			(string) ( $envelope['account'] ?? '' ),
			(string) ( $envelope['status'] ?? ConnectionRef::ACTIVE ),
			(string) ( $envelope['connected_at'] ?? '' ),
			$this->secrets->decrypt( $data, $this->secretKeys( $code ), $code, self::SCOPE )
		);
	}

	/**
	 * Create or replace a staff member's connection, sealing every declared secret path.
	 *
	 * `connected_at` is preserved across a RE-authorization: the operator's mental model is "this
	 * staff member has been connected since …", and a silent re-auth (an added scope, a refreshed
	 * grant) is not a new connection.
	 *
	 * @param string               $code     Module code.
	 * @param int                  $staff_id Staff id.
	 * @param array<string, mixed> $data     Plaintext driver payload.
	 * @param string               $account  Human label (normally the authorized email).
	 * @param string               $status   Connection status.
	 * @param ProjectionLease|null $lease    Proof the caller already holds the projection lock.
	 * @throws ProjectionUnavailable When the projection cannot be updated (the row is rolled back).
	 * @throws CompensationFailed When that rollback ALSO failed and the state is unverified.
	 */
	public function save( string $code, int $staff_id, array $data, string $account = '', string $status = ConnectionRef::ACTIVE, ?ProjectionLease $lease = null ): ConnectionRef {
		self::assertSealable();

		$now      = $this->clock->nowSql();
		$existing = $this->rawEnvelope( $code, $staff_id );
		$since    = is_array( $existing ) && isset( $existing['connected_at'] ) && is_string( $existing['connected_at'] ) && '' !== $existing['connected_at']
			? $existing['connected_at']
			: $now;

		$envelope = array(
			'v'            => self::VERSION,
			'code'         => $code,
			'status'       => $status,
			'account'      => $account,
			'connected_at' => $since,
			'updated_at'   => $now,
			'data'         => $this->secrets->encrypt( $data, $this->secretKeys( $code ), $code, self::SCOPE ),
		);

		// AUTHORITATIVE ROW FIRST, projection second (Codex P1 #4). The repository throws on a failed
		// write, so a projection entry can never exist for a connection that was not stored — the
		// drift that would show "Connected as …" over nothing.
		$key      = IntegrationRegistry::connectionKey( $code );
		$previous = $this->meta->get( $staff_id, $key );
		$this->meta->set( $staff_id, $key, (string) wp_json_encode( $envelope ) );

		try {
			$this->rememberInIndex( $code, $staff_id, $status, $account, $since, $lease );
		} catch ( ProjectionUnavailable $e ) {
			// COMPENSATE (Codex round 3, P1 #2): the row is stored but nothing can see it, and a
			// caller that reported success would leave a token no screen lists and no admin can
			// disconnect. Put the row back the way it was and let the caller answer "try again".
			//
			// A compensation that FAILS changes the advice (Codex round 5, #1): the state is no longer
			// known to be clean, so "retry" would be a guarantee this code cannot make.
			if ( ! $this->restoreRow( $staff_id, $key, $previous ) ) {
				throw new CompensationFailed( 'The connection write could not be rolled back.' );
			}

			throw $e;
		}

		return new ConnectionRef( $code, $staff_id, $account, $status, $since, $data );
	}

	/**
	 * Refuse to store a connection on a site that cannot really encrypt it.
	 *
	 * @throws \RuntimeException When `SECURE_AUTH_KEY` is missing or is the wp-config placeholder.
	 */
	public static function assertSealable(): void {
		if ( self::canSeal() ) {
			return;
		}

		throw new \RuntimeException(
			esc_html( 'Aponto: refusing to store an integration connection because SECURE_AUTH_KEY is missing or is the placeholder value.' )
		);
	}

	/**
	 * Replace ONLY the driver payload, keeping account/status/timestamps.
	 *
	 * This is the transparent-token-refresh seam: a driver that renewed an access token inside
	 * `pull_busy`/`push` persists it here without pretending a new connection happened.
	 *
	 * @param string               $code     Module code.
	 * @param int                  $staff_id Staff id.
	 * @param array<string, mixed> $data     Plaintext driver payload.
	 */
	public function updateData( string $code, int $staff_id, array $data ): void {
		self::assertSealable();

		$envelope = $this->rawEnvelope( $code, $staff_id );
		if ( null === $envelope ) {
			return;
		}

		$envelope['data']       = $this->secrets->encrypt( $data, $this->secretKeys( $code ), $code, self::SCOPE );
		$envelope['updated_at'] = $this->clock->nowSql();

		$this->meta->set( $staff_id, IntegrationRegistry::connectionKey( $code ), (string) wp_json_encode( $envelope ) );
	}

	/**
	 * Flip a connection's status without touching its payload (e.g. to `needs_reconnect` after a
	 * probe reported the authorization is dead). No-op when there is no connection.
	 *
	 * @param string               $code     Module code.
	 * @param int                  $staff_id Staff id.
	 * @param string               $status   New status.
	 * @param ProjectionLease|null $lease    Proof the caller already holds the projection lock.
	 * @throws ProjectionUnavailable When the projection cannot be updated (the row is restored).
	 * @throws CompensationFailed When that rollback ALSO failed and the state is unverified.
	 */
	public function markStatus( string $code, int $staff_id, string $status, ?ProjectionLease $lease = null ): void {
		$envelope = $this->rawEnvelope( $code, $staff_id );
		if ( null === $envelope || (string) ( $envelope['status'] ?? '' ) === $status ) {
			return;
		}

		$key                    = IntegrationRegistry::connectionKey( $code );
		$previous               = $this->meta->get( $staff_id, $key );
		$envelope['status']     = $status;
		$envelope['updated_at'] = $this->clock->nowSql();
		$this->meta->set( $staff_id, $key, (string) wp_json_encode( $envelope ) );

		try {
			$this->rememberInIndex(
				$code,
				$staff_id,
				$status,
				(string) ( $envelope['account'] ?? '' ),
				(string) ( $envelope['connected_at'] ?? '' ),
				$lease
			);
		} catch ( ProjectionUnavailable $e ) {
			// Same compensation as save/delete (Codex round 4): the row now says `needs_reconnect`
			// while the projection still says `active`, so the catalog would keep offering a
			// connection the driver has already given up on. Put the envelope back and let the caller
			// answer "try again".
			if ( ! $this->restoreRow( $staff_id, $key, $previous ) ) {
				throw new CompensationFailed( 'The connection status change could not be rolled back.' );
			}

			throw $e;
		}
	}

	/**
	 * Remove a staff member's connection. Idempotent — the second disconnect is a no-op.
	 *
	 * @param string               $code     Module code.
	 * @param int                  $staff_id Staff id.
	 * @param ProjectionLease|null $lease    Proof the caller already holds the projection lock.
	 * @throws ProjectionUnavailable When the projection cannot be updated (the row is restored).
	 * @throws CompensationFailed When that rollback ALSO failed and the state is unverified.
	 */
	public function delete( string $code, int $staff_id, ?ProjectionLease $lease = null ): void {
		// The row goes first and the repository throws if the DELETE fails, so the projection is
		// never cleared while the token row survives — a disconnect that reported success while the
		// credential stayed on disk (Codex P1 #4).
		$key      = IntegrationRegistry::connectionKey( $code );
		$previous = $this->meta->get( $staff_id, $key );
		$this->meta->delete( $staff_id, $key );

		try {
			$this->forgetInIndex( $code, $staff_id, false, $lease );
		} catch ( ProjectionUnavailable $e ) {
			// Restore the envelope so the site is left in the state the caller will see reported:
			// still connected, and retryable. A row deleted while the projection still names it is
			// self-healing, but a caller told "disconnected" when the projection still says otherwise
			// is not (Codex round 3, P1 #2).
			if ( ! $this->restoreRow( $staff_id, $key, $previous ) ) {
				throw new CompensationFailed( 'The connection delete could not be rolled back.' );
			}

			throw $e;
		}
	}

	/**
	 * Put a connection row back to a captured pre-image (compensation only).
	 *
	 * Best effort by construction: this runs because something already failed, and throwing here
	 * would replace a reported failure with a different one. A leftover row is the SAFE direction —
	 * {@see self::find()} prunes a phantom projection entry, and {@see self::rebuildIndex()} repairs
	 * the reverse.
	 *
	 * @param int         $staff_id Staff id.
	 * @param string      $key      Connection meta key.
	 * @param string|null $previous Captured pre-image, or null when there was no row.
	 * @return bool Whether the pre-image is back.
	 */
	private function restoreRow( int $staff_id, string $key, ?string $previous ): bool {
		try {
			if ( null === $previous || '' === $previous ) {
				$this->meta->delete( $staff_id, $key );

				return true;
			}
			$this->meta->set( $staff_id, $key, $previous );

			return true;
		} catch ( \Throwable $e ) {
			// A COMPENSATION THAT FAILS IS THE WORST CASE IN THE FILE, and it used to be the quietest
			// (Codex round 4, P1 #2). The site is now genuinely inconsistent — a row and a projection
			// that disagree — and nobody can find out from the outside, because the caller is about to
			// report the ORIGINAL failure. It must at least be recorded loudly.
			IntegrationHealth::make()->recordFailure(
				self::moduleFromKey( $key ),
				'compensation',
				'Rolling back a connection write FAILED; the stored row and the projection disagree.',
				$staff_id
			);
			IntegrationHealth::make()->recordGlobalFailure(
				'compensation',
				'Rolling back a connection write FAILED; the stored state is unverified.',
				$staff_id
			);

			return false;
		}
	}

	/**
	 * The module code inside an `integration.{code}.connection` key.
	 *
	 * @param string $key Connection meta key.
	 */
	private static function moduleFromKey( string $key ): string {
		$parts = explode( '.', $key );

		return isset( $parts[1] ) ? $parts[1] : '';
	}

	/** The database handle behind the repository, for the lock factory fallback. */
	private function wpdb(): \wpdb {
		global $wpdb;

		return $wpdb;
	}

	/**
	 * Remove EVERY connection of a module (uninstall). Idempotent.
	 *
	 * @param string $code Module code.
	 * @return int Rows removed.
	 */
	public function deleteAll( string $code ): int {
		// ONE ORDERED PATH, AND IT NEVER ABORTS (Codex round 5, #5).
		//
		// Order: take the projection lock (bounded, best-effort) → delete the rows → write the
		// projection → release. Locking first is what stops the half-state that matters most during
		// uninstall — tokens gone, projection still naming them, so `hasAnyConnection()` keeps the
		// integrations cron alive for connections that no longer exist.
		//
		// Never aborting is the other half. Uninstall has no retry: whatever happens here, the caller
		// must go on to clear the cron and delete its options, so every failure is caught and logged
		// rather than thrown.
		//
		// A BOUNDED RETRY, then a fallback that cannot fail (Codex round 6, #5). "Best effort" was not
		// good enough on this path: the projection holds the staff member's ACCOUNT EMAIL, so skipping
		// the cleanup on contention left PII in an autoloaded option after the operator asked for
		// their data to be deleted.
		$lease = null;
		for ( $attempt = 0; $attempt < self::UNINSTALL_LOCK_ATTEMPTS; $attempt++ ) {
			$lease = $this->lockProjection( 3 );
			if ( null !== $lease ) {
				break;
			}
		}

		$removed = 0;

		try {
			$removed = $this->meta->deleteByKeyPrefix( IntegrationRegistry::namespacePrefix( $code ) );
		} catch ( \Throwable $e ) {
			IntegrationHealth::make()->recordGlobalFailure( 'uninstall', 'Removing integration connection rows failed during uninstall.', 0 );
		}

		try {
			$this->mutateIndex(
				static function ( array $index ) use ( $code ): array {
					unset( $index[ $code ] );

					return $index;
				},
				true,
				$lease
			);
		} catch ( \Throwable $e ) {
			// Belt and braces: `$best_effort` already swallows the lock and write failures on the
			// unheld path, and this catches the held path where the shortcut skips that branch.
			IntegrationHealth::make()->recordGlobalFailure( 'uninstall', 'Clearing the connection projection failed during uninstall.', 0 );
		} finally {
			if ( null !== $lease ) {
				$lease->release();
			}
		}

		// THE FALLBACK IS A MARKER, NEVER AN UNLOCKED WRITE (Codex round 7, P1-A). Round 6 dropped the
		// whole option here when the slice survived; the option is SHARED, so that write raced every
		// lock-holding writer and could equally well resurrect this module's slice from a stale read
		// or delete a rival's freshly committed one. A derived cache may be rebuilt, but not by a
		// writer that never took the lock.
		//
		// `markPendingPurge()` instead: {@see self::index()} hides the slice from every reader
		// immediately, so the module is already gone as far as the cron and the availability early-out
		// are concerned, and the BYTES leave the option at the next locked mutation
		// ({@see self::applyAndWrite()}). PII outlives the uninstall only inside an option nothing
		// reads, and only until the next projection write.
		if ( array_key_exists( $code, $this->index() ) ) {
			try {
				$this->markPendingPurge( $code );
				IntegrationHealth::make()->recordGlobalFailure(
					'uninstall',
					'The connection projection slice could not be removed under lock; it is hidden from readers and queued for the reconcile.',
					0
				);
			} catch ( \Throwable $e ) {
				// The marker is the FAST PATH, not the guarantee (Codex round 9, item 3). Losing it
				// costs the read-side filter — the slice stays visible until the reconcile runs — but
				// the reconcile finds the orphan from the rows regardless, so this is logged and the
				// uninstall continues.
				IntegrationHealth::make()->recordGlobalFailure(
					'uninstall',
					'The connection purge marker could not be written; the projection reconcile will find the orphan slice.',
					0
				);
			}
		}

		// UNCONDITIONALLY, whatever happened above (Codex round 9, item 1). The reconcile derives its
		// work from the rows, so booking it costs nothing when there is none — and it is the only
		// thing standing between a failed marker and an account email that outlives its module.
		ProjectionPurge::schedule();

		return $removed;
	}

	/**
	 * The non-secret projection: `code => staff_id => {status, account, connected_at}`.
	 *
	 * @return array<string, array<int, array{status: string, account: string, connected_at: string}>>
	 */
	public function index(): array {
		$stored = get_option( self::INDEX_OPTION, array() );
		if ( ! is_array( $stored ) ) {
			return array();
		}

		// A module whose purge is still pending is ALREADY GONE as far as every reader is concerned
		// (Codex round 7, P1-A). Its rows were deleted by uninstall; only the cached slice survives,
		// waiting for a locked write to remove it. Filtering here — rather than letting readers see
		// it — is what stops `hasAnyConnection()` keeping the cron alive for an uninstalled module,
		// and what keeps the deferral invisible to everything except the option's raw bytes.
		$pending = $this->pendingPurges();

		$out = array();
		foreach ( $stored as $code => $entries ) {
			if ( ! is_string( $code ) || ! is_array( $entries ) || in_array( $code, $pending, true ) ) {
				continue;
			}
			foreach ( $entries as $staff_id => $entry ) {
				if ( ! is_array( $entry ) ) {
					continue;
				}
				$out[ $code ][ (int) $staff_id ] = array(
					'status'       => isset( $entry['status'] ) ? (string) $entry['status'] : ConnectionRef::ACTIVE,
					'account'      => isset( $entry['account'] ) ? (string) $entry['account'] : '',
					'connected_at' => isset( $entry['connected_at'] ) ? (string) $entry['connected_at'] : '',
				);
			}
		}

		return $out;
	}

	/**
	 * Staff ids with an ACTIVE connection for a module, read from the projection (no query).
	 *
	 * @param string $code Module code.
	 * @return list<int>
	 */
	public function activeStaffIds( string $code ): array {
		$out = array();
		foreach ( $this->index()[ $code ] ?? array() as $staff_id => $entry ) {
			if ( ConnectionRef::ACTIVE === $entry['status'] ) {
				$out[] = (int) $staff_id;
			}
		}

		return $out;
	}

	/**
	 * Whether ANY module has at least one connection. One autoloaded option read, no query — the
	 * check the busy adapter and the cron scheduler both short-circuit on.
	 */
	public function hasAnyConnection(): bool {
		foreach ( $this->index() as $entries ) {
			if ( array() !== $entries ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Rebuild a module's projection from the authoritative rows (one query).
	 *
	 * The repair path for a projection that drifted — a restored database, a row deleted by hand,
	 * an index option lost to an incomplete migration.
	 *
	 * @param string $code Module code.
	 */
	public function rebuildIndex( string $code ): void {
		$entries = array();
		foreach ( $this->meta->allByKey( IntegrationRegistry::connectionKey( $code ) ) as $staff_id => $raw ) {
			$envelope = json_decode( $raw, true );
			if ( ! is_array( $envelope ) || self::VERSION !== (int) ( $envelope['v'] ?? 0 ) ) {
				continue;
			}
			$entries[ (int) $staff_id ] = array(
				'status'       => (string) ( $envelope['status'] ?? ConnectionRef::ACTIVE ),
				'account'      => (string) ( $envelope['account'] ?? '' ),
				'connected_at' => (string) ( $envelope['connected_at'] ?? '' ),
			);
		}

		$this->mutateIndex(
			static function ( array $index ) use ( $code, $entries ): array {
				if ( array() === $entries ) {
					unset( $index[ $code ] );
				} else {
					$index[ $code ] = $entries;
				}

				return $index;
			}
		);
	}

	/**
	 * The declared secret dotted paths for a module's connection scope.
	 *
	 * @param string $code Module code.
	 * @return list<string>
	 */
	private function secretKeys( string $code ): array {
		return $this->secrets->secretKeysFor( $code, self::SCOPE );
	}

	/**
	 * The stored envelope with its secrets STILL SEALED, or null when absent/unreadable.
	 *
	 * Used by the mutators that only touch metadata: re-sealing an already-sealed blob would
	 * double-encrypt it, so status/timestamp edits deliberately never decrypt.
	 *
	 * @param string $code     Module code.
	 * @param int    $staff_id Staff id.
	 * @return array<string, mixed>|null
	 */
	private function rawEnvelope( string $code, int $staff_id ): ?array {
		$raw = $this->meta->get( $staff_id, IntegrationRegistry::connectionKey( $code ) );
		if ( null === $raw || '' === $raw ) {
			return null;
		}
		$envelope = json_decode( $raw, true );

		return is_array( $envelope ) && self::VERSION === (int) ( $envelope['v'] ?? 0 ) ? $envelope : null;
	}

	/**
	 * Write one projection entry.
	 *
	 * @param string               $code         Module code.
	 * @param int                  $staff_id     Staff id.
	 * @param string               $status       Connection status.
	 * @param string               $account      Human label.
	 * @param string               $connected_at MySQL datetime.
	 * @param ProjectionLease|null $lease        Proof the caller already holds the lock.
	 */
	private function rememberInIndex( string $code, int $staff_id, string $status, string $account, string $connected_at, ?ProjectionLease $lease = null ): void {
		$this->mutateIndex(
			static function ( array $index ) use ( $code, $staff_id, $status, $account, $connected_at ): array {
				$index[ $code ][ $staff_id ] = array(
					'status'       => $status,
					'account'      => $account,
					'connected_at' => $connected_at,
				);

				return $index;
			},
			false,
			$lease
		);
	}

	/**
	 * Drop one projection entry.
	 *
	 * @param string               $code        Module code.
	 * @param int                  $staff_id    Staff id.
	 * @param bool                 $best_effort Whether a lock failure is tolerable (prune from a read).
	 * @param ProjectionLease|null $lease       Proof the caller already holds the lock.
	 */
	private function forgetInIndex( string $code, int $staff_id, bool $best_effort = false, ?ProjectionLease $lease = null ): void {
		$this->mutateIndex(
			static function ( array $index ) use ( $code, $staff_id ): array {
				if ( ! isset( $index[ $code ][ $staff_id ] ) ) {
					return $index;
				}
				unset( $index[ $code ][ $staff_id ] );
				if ( array() === $index[ $code ] ) {
					unset( $index[ $code ] );
				}

				return $index;
			},
			$best_effort,
			$lease
		);
	}

	/**
	 * Read-modify-write the projection under an advisory lock (Codex P2 #15).
	 *
	 * The projection is ONE option holding every module's entries, so two connects landing together
	 * — two admins, or a connect racing the staff-delete cleanup — would otherwise read the same
	 * snapshot and the second write would erase the first. `update_option` is atomic per call but
	 * gives no compare-and-set, so the read and the write are serialized instead, on the same
	 * {@see LockFactory} the reservation path uses (so SQLite is covered too, D-R20).
	 *
	 * The lock is REQUIRED, not best-effort (Codex round 3, P1 #2). The earlier version ran the
	 * mutation whether or not it held the lock, on the reasoning that a lost entry self-heals — but
	 * "self-heals" is only true for the reverse drift: {@see self::find()} prunes a phantom entry,
	 * while an entry silently DROPPED by a concurrent write leaves a real connection invisible to the
	 * busy adapter's early-out, and nothing repairs that until someone runs
	 * {@see self::rebuildIndex()}. A caller that must retry is a better outcome than a connect that
	 * reported success and did not happen.
	 *
	 * @param callable(array<string, mixed>): array<string, mixed> $mutate      Projection transform.
	 * @param bool                                                 $best_effort Tolerate a lock/write failure (prunes only).
	 * @param ProjectionLease|null                                 $lease       Proof the caller already holds the lock.
	 * @throws ProjectionUnavailable When the lock cannot be acquired or the write does not persist.
	 */
	private function mutateIndex( callable $mutate, bool $best_effort = false, ?ProjectionLease $lease = null ): void {
		// EXPLICIT re-entrancy (Codex round 6, #6 — revised). The caller PROVES it already holds the
		// lock by handing over its lease; nothing here consults global state to decide. A caller
		// without a lease acquires normally. The previous design used a process-global static, which
		// is the wrong shape in a PHP worker that serves many requests in one process: anything a
		// static remembers outlives the request that put it there.
		if ( null !== $lease && $lease->covers( self::PROJECTION_LOCK ) ) {
			$this->applyAndWrite( $mutate );

			return;
		}

		$locks = $this->locks ?? new LockFactory( $this->wpdb() );
		$lock  = $locks->named( self::PROJECTION_LOCK );

		// REQUIRED, not best-effort (Codex round 3, P1 #2). The projection is ONE option holding
		// every module's entries, so an unserialized read-modify-write silently drops whichever
		// concurrent change lost the race — and the loser is invisible, because both writes
		// "succeeded". Refusing is honest and retryable; proceeding is a lie about what happened.
		//
		// `$best_effort` is the ONE exception, and only for a PRUNE: {@see self::find()} tidies a
		// projection entry whose row has vanished, which is a cleanup the caller never asked for.
		// Making a READ take a write lock — and fail when it cannot — turned every connection lookup
		// into a contention point, including the start-connect leg and the availability path
		// (Codex round 4, P1 #2). A prune that cannot run is simply left for the next read.
		// A best-effort prune does not WAIT either (Codex round 4, P1 #2). Waiting three seconds and
		// then giving up is the worst of both: the read still blocks on a lock it does not need, and
		// still does not get the tidy-up. `0` means "take it if it is free, otherwise leave the prune
		// for the next read".
		if ( ! $lock->acquire( $best_effort ? 0 : 3 ) ) {
			if ( $best_effort ) {
				return;
			}

			throw new ProjectionUnavailable( 'Could not acquire the integration projection lock.' );
		}

		try {
			$this->applyAndWrite( $mutate );
		} catch ( ProjectionUnavailable $e ) {
			if ( $best_effort ) {
				return;
			}

			throw $e;
		} finally {
			$lock->release();
		}
	}

	/**
	 * Take the projection lock for a caller that needs it held ACROSS several writes.
	 *
	 * Exists for lock ORDER (Codex round 4, REG-3). The staff hard-delete holds the per-staff lock
	 * and opens a database transaction; if the projection lock were then taken inside the
	 * transaction, that path would hold a DB writer while waiting on a file lock (SQLite) which
	 * every ordinary projection writer takes BEFORE touching `wp_options` — a bounded lock-order
	 * inversion that shows up as 3-second stalls and rollbacks under concurrency. Taking it first,
	 * outside the transaction, removes the cycle.
	 *
	 * The lease it returns is the ONLY way a nested writer learns the lock is already held: it is
	 * passed explicitly down the call stack, never remembered in global state (Codex round 6, #6).
	 *
	 * @param int $timeout Seconds to wait.
	 * @return ProjectionLease|null The held lease, or null when the lock could not be taken.
	 */
	public function lockProjection( int $timeout = 3 ): ?ProjectionLease {
		$locks = $this->locks ?? new LockFactory( $this->wpdb() );
		$lock  = $locks->named( self::PROJECTION_LOCK );

		return $lock->acquire( $timeout )
			? new ProjectionLease( $lock, new TransactionGuard( $this->wpdb() ) )
			: null;
	}

	/**
	 * Apply any deferred purges, run the caller's transform and persist the result. LOCK HELD.
	 *
	 * The purge list is captured BEFORE the projection is read, which is the conservative order: a
	 * marker that lands mid-flight is either already invisible to {@see self::index()} and cleared
	 * next time, or not yet applied and not cleared — never cleared without having been applied.
	 * Clearing is unconditional afterwards because `index()` removed those slices from the base the
	 * transform ran against; anything the transform then adds under the same code is a NEW,
	 * post-purge connection and must survive (a reinstall that reconnects during the same request).
	 *
	 * Clearing is best-effort by design: a marker that fails to clear only makes the next locked
	 * write repeat a purge that has already happened, and the purge is idempotent.
	 *
	 * @param callable(array<string, mixed>): array<string, mixed> $mutate Projection transform.
	 * @throws ProjectionUnavailable When the write does not persist.
	 */
	private function applyAndWrite( callable $mutate ): void {
		$pending = $this->pendingPurges();
		$this->writeIndex( $mutate( $this->index() ) );

		if ( array() !== $pending ) {
			try {
				$this->clearPendingPurges( $pending );
			} catch ( \Throwable $e ) {
				// The PROJECTION write already succeeded, so this must not become the caller's failure
				// (Codex round 9, item 3). A marker that outlives its purge only costs the read-side
				// filter hiding a slice that is already gone; the reconcile retires it.
				IntegrationHealth::make()->recordGlobalFailure( 'uninstall', 'A connection purge marker could not be retired after its slice was removed.', 0 );
				ProjectionPurge::schedule();
			}
		}
	}

	/**
	 * Module codes still waiting for a locked write to drop their projection slice.
	 *
	 * @return list<string>
	 */
	private function pendingPurges(): array {
		return self::normalizePurges( get_option( self::PURGE_OPTION, array() ) );
	}

	/**
	 * A purge list in canonical form: known integration codes only, deduplicated and sorted.
	 *
	 * Canonical because the value is compare-and-swapped as a STRING (see
	 * {@see self::mutatePurgeMarker()}) — two writers that agree on the contents must agree on the
	 * bytes, or every swap would collide with an equivalent list written in a different order. The
	 * registry filter is also what BOUNDS the option: it can never hold more entries than there are
	 * integration modules, whatever ends up in it.
	 *
	 * @param mixed $raw Stored value.
	 * @return list<string>
	 */
	private static function normalizePurges( $raw ): array {
		if ( ! is_array( $raw ) ) {
			return array();
		}

		$known = IntegrationRegistry::allCodes();
		$out   = array_values( array_unique( array_filter( $raw, static fn ( $code ): bool => is_string( $code ) && in_array( $code, $known, true ) ) ) );
		sort( $out );

		return $out;
	}

	/**
	 * Record that a module's projection slice must go at the next locked write.
	 *
	 * @param string $code Module code.
	 */
	private function markPendingPurge( string $code ): void {
		$marked = $this->mutatePurgeMarker(
			static function ( array $pending ) use ( $code ): array {
				$pending[] = $code;

				return $pending;
			}
		);

		// A MARKER NEEDS AN EXECUTOR, and it must be one nothing else cancels (Codex round 9, item 1).
		// The integrations TICK cannot be it: it is scheduled while a connection exists and cleared
		// when none does, so uninstalling the last integration unschedules the very event booked to
		// finish that uninstall.
		if ( $marked ) {
			ProjectionPurge::schedule();
		}
	}

	/**
	 * Retire purge markers whose slices a write has removed. LOCK HELD.
	 *
	 * Only the codes this caller CAPTURED are removed — never the whole list — so a marker written
	 * by someone else between the capture and here survives (Codex round 8, P1-A1).
	 *
	 * @param list<string> $applied Codes purged by the write that just persisted.
	 */
	private function clearPendingPurges( array $applied ): void {
		$this->mutatePurgeMarker(
			static fn ( array $pending ): array => array_values( array_diff( $pending, $applied ) )
		);
	}

	/**
	 * Drop every cache that could still answer with the purge marker's pre-image.
	 *
	 * The row was written by SQL, so nothing invalidated the caches WordPress serves reads from: the
	 * option's own key, the `alloptions` bucket it belongs to as an autoloaded option, and
	 * `notoptions`, which remembers that it did not exist at all.
	 */
	private static function flushOptionCaches(): void {
		wp_cache_delete( self::PURGE_OPTION, 'options' );
		wp_cache_delete( 'alloptions', 'options' );
		wp_cache_delete( 'notoptions', 'options' );
	}

	/**
	 * Reconcile the projection against the authoritative rows, under the lock.
	 *
	 * ### Derived from the ROWS, not from the marker (Codex round 9, item 2)
	 *
	 * Round 8's version applied pending PURGES, so it inherited every way a marker can be lost: a
	 * concurrent write, a failed option write, a code the registry no longer knows. A marker is a
	 * hint about work; the work itself is visible without it — a projection slice whose module has no
	 * `integration.{code}.connection` rows left is an orphan, and an orphan slice holds a staff
	 * member's account email for a module that no longer exists.
	 *
	 * So this looks at both: the marked slices (already filtered out by {@see self::index()}, so
	 * persisting what it returns removes them) AND any slice the rows no longer support. That makes
	 * the marker a fast path — it hides a slice from readers the instant an uninstall defers — rather
	 * than the mechanism that must not fail.
	 *
	 * @return bool Whether the projection is settled (false = contended or failed; try again later).
	 */
	public function reconcileProjection(): bool {
		// Cheap early-out on the common case: no markers and no projection at all is nothing to do,
		// and both reads are autoloaded options rather than queries.
		if ( array() === $this->pendingPurges() && array() === $this->index() ) {
			return true;
		}

		$lease = $this->lockProjection( 3 );
		if ( null === $lease ) {
			return false;
		}

		try {
			$this->mutateIndex(
				function ( array $index ): array {
					foreach ( array_keys( $index ) as $code ) {
						$code = (string) $code;
						if ( array() === $this->meta->allByKey( IntegrationRegistry::connectionKey( $code ) ) ) {
							unset( $index[ $code ] );
						}
					}

					return $index;
				},
				false,
				$lease
			);
		} catch ( \Throwable $e ) {
			// ABORTS WITHOUT WRITING (Codex round 10, P2). The transform reads the authoritative rows
			// to decide what is an orphan, and it runs BEFORE the write — so a read that failed takes
			// the whole reconcile down rather than deleting a slice on the strength of an answer
			// nobody got. Re-booked, because the work is still there.
			IntegrationHealth::make()->recordGlobalFailure( 'uninstall', 'Reconciling the connection projection failed; no slice was removed.', 0 );
			ProjectionPurge::schedule();

			return false;
		} finally {
			$lease->release();
		}

		return array() === $this->pendingPurges();
	}

	/**
	 * Compare-and-swap the purge marker.
	 *
	 * ### Why this is not `update_option()`
	 *
	 * The marker is a SET that several unsynchronized writers touch: two uninstalls running in
	 * different requests, a clear from a locked projection write, and the tick's own sweep. A
	 * read-modify-write through `update_option()` loses one of two concurrent marks — and the marker
	 * that is lost is the one holding a staff member's account email out of view, so the stale slice
	 * becomes VISIBLE again (Codex round 8, P1-A1). Nor does `update_option()` tell you which
	 * happened: it answers `false` both for "the write failed" and for "the value was already that".
	 *
	 * `UPDATE … WHERE option_value = <the bytes I read>` answers exactly the right question — one
	 * affected row means this caller's read was still current when it wrote — and it is the same
	 * primitive the retry bookkeeping uses one table over
	 * ({@see \Aponto\Booking\Repository\BookingMetaRepository::replaceIfEquals()}). The read side
	 * deliberately bypasses the object cache, because a cached value cannot be compared against what
	 * the row actually holds, and the caches are dropped after a successful write so readers see it.
	 *
	 * @param callable(list<string>): list<string> $mutate Transform over the current list.
	 * @return bool Whether the marker CHANGED (false when the transform was a no-op or every attempt lost).
	 * @throws StorageException When the write FAILED rather than lost a race — see below.
	 */
	private function mutatePurgeMarker( callable $mutate ): bool {
		$wpdb = $this->wpdb();

		for ( $attempt = 0; $attempt < self::PURGE_CAS_ATTEMPTS; $attempt++ ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- The CAS pre-image must come from the ROW, not from a cache that may describe a different value.
			$stored = $wpdb->get_var( $wpdb->prepare( "SELECT option_value FROM {$wpdb->options} WHERE option_name = %s", self::PURGE_OPTION ) );

			if ( null === $stored ) {
				$first = self::normalizePurges( $mutate( array() ) );
				if ( array() === $first ) {
					return false; // Nothing to record and nothing to clear.
				}

				// A PLAIN INSERT, deliberately not `add_option()`: that helper upserts
				// (`ON DUPLICATE KEY UPDATE … option_value = VALUES(option_value)`), so a rival that
				// created the row a microsecond earlier would have its marker overwritten — the very
				// loss this CAS exists to prevent. A duplicate key here is the honest answer "someone
				// else got there first", and the loop retries into the UPDATE path.
				$suppressed = $wpdb->suppress_errors( true );
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Conditional create; a duplicate key is the concurrency signal.
				$inserted = $wpdb->insert(
					$wpdb->options,
					array(
						'option_name'  => self::PURGE_OPTION,
						'option_value' => maybe_serialize( $first ),
						// `yes` is the legacy value every supported WordPress still counts as
						// autoloaded (6.6 widened the column, it did not retire this one).
						'autoload'     => 'yes',
					)
				);
				$wpdb->suppress_errors( $suppressed );

				if ( false !== $inserted ) {
					self::flushOptionCaches();

					return true;
				}

				// Same discrimination as the UPDATE path below: a duplicate key means someone created
				// the row first (retry into that path), while a row that STILL does not exist after a
				// reported error is a storage failure, not a race.
				$error = (string) $wpdb->last_error;
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Post-write discriminator; a cache cannot say whether the row exists.
				$exists = $wpdb->get_var( $wpdb->prepare( "SELECT option_id FROM {$wpdb->options} WHERE option_name = %s", self::PURGE_OPTION ) );
				if ( null === $exists && '' !== $error ) {
					throw StorageException::fromSqlError( esc_html( 'integration purge marker' ), esc_html( $error ) );
				}

				continue;
			}

			$current = self::normalizePurges( maybe_unserialize( (string) $stored ) );
			$next    = self::normalizePurges( $mutate( $current ) );
			if ( $next === $current ) {
				return false; // Nothing to do; the caller's change is already in the row.
			}

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- The conditional write IS the concurrency control; caching it would defeat the comparison.
			$swapped = $wpdb->update(
				$wpdb->options,
				array( 'option_value' => maybe_serialize( $next ) ),
				array(
					'option_name'  => self::PURGE_OPTION,
					'option_value' => (string) $stored,
				)
			);

			if ( 1 === $swapped ) {
				self::flushOptionCaches();

				return true;
			}

			// NOT EVERY NON-1 IS CONTENTION (Codex round 9, item 3). `0` and `false` used to be
			// treated alike and abandoned after the ladder, which meant a broken connection or a
			// read-only database looked exactly like a busy one — and the caller was told nothing. The
			// row itself is the discriminator: re-read it and ask what actually happened.
			$error = (string) $wpdb->last_error;
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Post-write discriminator; a cache cannot say what the row holds.
			$after = $wpdb->get_var( $wpdb->prepare( "SELECT option_value FROM {$wpdb->options} WHERE option_name = %s", self::PURGE_OPTION ) );

			if ( null !== $after && self::normalizePurges( maybe_unserialize( (string) $after ) ) === $next ) {
				// Someone else — or a partially applied write — already achieved what this call wanted.
				self::flushOptionCaches();

				return true;
			}

			if ( (string) $after !== (string) $stored ) {
				continue; // The row moved on: honest contention, retry against the new pre-image.
			}

			if ( '' !== $error ) {
				// The row is unchanged AND the statement reported an error: this is storage, not
				// contention. Raising it is what makes the failure visible; the caller logs it and
				// books the reconcile, which does not need this marker to do its job.
				throw StorageException::fromSqlError( esc_html( 'integration purge marker' ), esc_html( $error ) );
			}
		}

		return false;
	}

	/**
	 * Persist the projection. AUTOLOADED on purpose — see the class docblock.
	 *
	 * @param array<string, array<int, array{status: string, account: string, connected_at: string}>> $index Projection.
	 * @throws ProjectionUnavailable When the option does not persist.
	 */
	private function writeIndex( array $index ): void {
		$written = update_option( self::INDEX_OPTION, $index, true );

		// `update_option()` returns FALSE both when the write failed and when the stored value was
		// already identical — the two must not be conflated (Codex round 3, P1 #2). The only
		// trustworthy check is to read the option back and compare.
		if ( ! $written ) {
			$stored = get_option( self::INDEX_OPTION, null );
			if ( ! is_array( $stored ) || wp_json_encode( $stored ) !== wp_json_encode( $index ) ) {
				throw new ProjectionUnavailable( 'The integration projection did not persist.' );
			}
		}

		/**
		 * Fires whenever the connection projection changed (D-R34).
		 *
		 * Core listens to keep the `aponto_integrations_tick` cron event scheduled only while at
		 * least one connection exists, so a site that never connects anything carries no orphan
		 * event (P2a debt item 5).
		 *
		 * @param array<string, array<int, array<string, string>>> $index Current projection.
		 */
		do_action( 'aponto_integration_connections_changed', $index );
	}
}

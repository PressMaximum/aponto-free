<?php
/**
 * An explicitly held projection lock, passed between collaborators (Codex round 6, #6 — revised).
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

use Aponto\Database\Lock;
use Aponto\Database\TransactionGuard;

/**
 * Proof that the CALLER already holds the connection-projection lock, handed down to the code that
 * writes under it.
 *
 * ### Why a token and not a registry
 *
 * The projection lock has to be re-entrant across collaborators: the staff hard-delete takes it,
 * then calls into {@see IntegrationService}, which writes the projection through
 * {@see ConnectionStore}. An earlier design tracked that with a PROCESS-GLOBAL static map keyed by
 * lock name — and process-global state is exactly the wrong shape for it, because a PHP worker
 * serves many requests in one process. Anything a static remembers outlives the request that put it
 * there, so a later request in the same worker could be told it holds a lock it never took.
 *
 * The lock drivers already own the only legitimate process-wide bookkeeping there is
 * ({@see \Aponto\Database\SqliteLock} keeps a per-process count for `GET_LOCK` parity); a second,
 * independent registry layered above them can only disagree with it.
 *
 * A token has none of that surface: it exists for the duration of one call stack, it is passed
 * explicitly, and code that was not handed one acquires the lock normally. "Do I already hold this?"
 * stops being a question about global state and becomes a question about the argument list.
 */
final class ProjectionLease {

	/**
	 * Construct the lease.
	 *
	 * @param Lock             $lock  The held lock.
	 * @param TransactionGuard $guard Reader of the CURRENT database session identity.
	 */
	public function __construct( private Lock $lock, private TransactionGuard $guard ) {}

	/**
	 * Whether this lease really covers a lock name AND the session that took it is still the one
	 * about to write.
	 *
	 * ### Why the session identity, not just "is it held"
	 *
	 * Advisory locks are PER CONNECTION. If wpdb silently reconnects ("server has gone away") MySQL
	 * drops every lock that connection held, but {@see \Aponto\Database\AdvisoryLock} still reports
	 * the id it PINNED at acquire time — the object cannot know the server let go. Asking only
	 * "is `connectionId()` non-null?" therefore accepted a lease whose lock no longer existed, and a
	 * nested write would then take the already-held shortcut and mutate the shared projection with
	 * NOTHING holding the lock (Codex round 7, P1-B).
	 *
	 * The check is the same E1 pre/post identity comparison every other critical section in the
	 * plugin uses ({@see TransactionGuard::currentConnectionId()}): the id pinned by `GET_LOCK` must
	 * still equal this session's `CONNECTION_ID()`. On SQLite that reader answers the constant
	 * {@see \Aponto\Database\SqliteLock::SESSION_ID} and the driver answers it only while this
	 * instance still owns an acquisition, so the same comparison degenerates to exactly the right
	 * question there: does this process still hold the `flock()`?
	 *
	 * A lease that no longer covers is not an error — the caller simply acquires the lock normally,
	 * and refuses with `ProjectionUnavailable` if it cannot.
	 *
	 * @param string $name Lock name the caller is about to write under.
	 */
	public function covers( string $name ): bool {
		if ( $this->lock->name() !== $name ) {
			return false;
		}

		$pinned = $this->lock->connectionId();

		return null !== $pinned && $pinned === $this->guard->currentConnectionId();
	}

	/** Release the underlying lock. */
	public function release(): void {
		$this->lock->release();
	}
}

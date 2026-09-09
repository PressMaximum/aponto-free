<?php
/**
 * Named advisory lock contract.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Database;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * The named lock every critical section in the plugin takes (§4.1, §5.6, review E1/E5).
 *
 * Two drivers implement it and {@see LockFactory} is the ONLY place that chooses between them
 * (D-R20, founder 2026-07-21):
 *
 *   - {@see AdvisoryLock} — MySQL/MariaDB, `GET_LOCK`/`RELEASE_LOCK` with a pinned
 *     `CONNECTION_ID()`. Unchanged; the recommended production engine behaves exactly as before.
 *   - {@see SqliteLock}   — SQLite, where the database itself serializes writers.
 *
 * The GLOBAL LOCK ORDER contract documented on {@see \Aponto\Booking\StaffLockFactory} is a
 * property of the ACQUISITION ORDER, not of the driver, so it holds for both.
 */
interface Lock {

	/**
	 * Acquire the lock, waiting up to the timeout.
	 *
	 * @param int $timeout Seconds to wait (0 = fail immediately when contended).
	 */
	public function acquire( int $timeout ): bool;

	/**
	 * The session identity pinned at acquire time, or null while the lock is not held.
	 *
	 * Impure for analysis: identity checks re-read this around writes (E1 pre/post pattern), and
	 * the result must never be "remembered" across the write — the value reflects volatile lock
	 * state. Compared against {@see TransactionGuard::currentConnectionId()}.
	 *
	 * @phpstan-impure
	 */
	public function connectionId(): ?string;

	/**
	 * The lock name (compensation paths reacquire fresh locks with the same name — R3-1/R3-2).
	 */
	public function name(): string;

	/**
	 * Release the lock.
	 */
	public function release(): void;
}

<?php
/**
 * Per-attempt context for an outbound remote-event verb (extension-surface §5.1, D-R34).
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

/**
 * The facts about THIS ATTEMPT that a driver needs and could not previously see: the stable
 * idempotency key, the deadline it must finish by, and which attempt this is.
 *
 * Added as a trailing parameter to the three P2 verbs (contract amendment 2026-09-03, logged in
 * D-R34). Additive: a driver that ignores it behaves exactly as before.
 *
 * ### Why the key has to reach the driver
 *
 * Core's own idempotency claim protects core's bookkeeping — it stops the same verb being
 * DISPATCHED twice. It cannot help with the failure that actually duplicates data: the remote call
 * SUCCEEDS and the response is lost (a timeout, a dropped connection, a killed worker). Core then
 * has no reference, retries, and a provider with server-assigned ids happily creates a second
 * event. The only cure is for the driver to make the remote operation itself idempotent, and to do
 * that it needs a value that is stable across retries of the same work — which is exactly the
 * `{key}:{booking_id}:{ics_sequence}:{verb}` key core already computes (extension-surface §5.2).
 *
 * A driver may use it directly (an `Idempotency-Key` header) or derive from the same inputs — the
 * Google driver derives a deterministic event id from (site salt, booking id) and reads the
 * resulting `409 already exists` as success.
 *
 * ### The deadline
 *
 * The first attempt runs INLINE in a post-commit listener, on the request that just confirmed a
 * booking; later attempts run on cron where a little more patience is fine. The deadline lets a
 * driver size its own HTTP timeout to the budget it actually has instead of guessing.
 */
final class RemoteEventContext {

	/**
	 * Construct the context.
	 *
	 * @param non-empty-string $idempotency_key Stable `{key}:{booking_id}:{ics_sequence}:{verb}`.
	 * @param string           $verb            `push`, `update` or `delete`.
	 * @param int              $attempt         1-based attempt number.
	 * @param int              $deadline        Unix timestamp this attempt must finish by.
	 * @param bool             $inline          Whether this runs inline in a post-commit listener.
	 */
	public function __construct(
		public readonly string $idempotency_key,
		public readonly string $verb,
		public readonly int $attempt,
		public readonly int $deadline,
		public readonly bool $inline = false
	) {}

	/**
	 * Seconds remaining before the deadline, floored at 1.
	 *
	 * A driver should use this as its HTTP timeout rather than a constant: the point of a deadline
	 * is that the budget shrinks as the attempt spends it.
	 *
	 * @param int $now Current unix timestamp.
	 */
	public function secondsLeft( int $now ): int {
		return max( 1, $this->deadline - $now );
	}
}

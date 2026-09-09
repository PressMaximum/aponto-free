<?php
/**
 * Per-attempt context for a payment verb (extension-surface §5b.3, D-R38).
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

/**
 * The facts about THIS ATTEMPT that a payment driver needs: the stable idempotency key, which
 * attempt this is, and the deadline it must finish inside.
 *
 * Deliberately the same shape as {@see \Aponto\Integration\RemoteEventContext}, for the same reason
 * (D-R34a #3): core's own claim only stops a duplicate DISPATCH. The failure that actually
 * duplicates data — or, here, CHARGES SOMEBODY TWICE — is a remote call that SUCCEEDS and whose
 * response is lost. Only the driver can make the remote operation itself idempotent, and to do that
 * it needs a value that is stable across retries of the same work; that value is
 * {@see PaymentRegistry::idempotencyKey()}.
 *
 * The deadline exists because these calls run in three very different budgets: inline on the request
 * that just committed a booking (a visitor is watching), inline on a webhook (a gateway is counting
 * milliseconds before it retries), and on cron (patient). A driver sizes its HTTP timeout from
 * {@see self::secondsLeft()} instead of guessing one constant that is wrong in two of the three.
 */
final class PaymentContext {

	/**
	 * Construct the context.
	 *
	 * @param string $idempotency_key Stable `ap:{salt16}:{host8}:{order_id}:{kind}:{n}` (extension-surface §5b.4).
	 * @param string $verb            Verb being dispatched (`begin`, `capture`, `void`, `refund`).
	 * @param int    $attempt         1-based attempt number.
	 * @param int    $deadline        Unix timestamp this attempt must finish by (0 = no deadline).
	 * @param bool   $inline          Whether this runs inline on a visitor-facing request.
	 */
	public function __construct(
		public readonly string $idempotency_key,
		public readonly string $verb,
		public readonly int $attempt = 1,
		public readonly int $deadline = 0,
		public readonly bool $inline = false
	) {}

	/**
	 * Seconds remaining before the deadline, floored at 1.
	 *
	 * `deadline = 0` means "no deadline was set" and is NOT the same as "the budget is spent" —
	 * conflating the two let an expired budget fall through to a client's full default timeout
	 * (D-R34c #4). A context with no deadline answers a sane default instead of infinity.
	 *
	 * @param int $now      Current unix timestamp.
	 * @param int $fallback Seconds to answer when no deadline was set.
	 */
	public function secondsLeft( int $now, int $fallback = 10 ): int {
		if ( 0 === $this->deadline ) {
			return max( 1, $fallback );
		}

		return max( 1, $this->deadline - $now );
	}
}

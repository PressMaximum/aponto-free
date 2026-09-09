<?php
/**
 * The outcome of claiming a webhook event, with the lease this worker owns (D-R38f, Codex E).
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
 * What {@see PaymentEventLedger::claim()} answers: whether this worker may apply the event, and —
 * when it may — the EXACT `claimed_at` value it wrote.
 *
 * The timestamp is the whole reason this is an object rather than a string. `record()` has to fence
 * on ownership: a worker whose lease expired mid-apply must not stamp the event terminal, because by
 * then another worker has reclaimed it and is applying it too. Comparing the stored `claimed_at`
 * against the one THIS worker set is the only evidence that the lease is still ours, and evidence
 * that lives in a return value cannot be lost the way a remembered fact can (D-R34f).
 */
final class EventClaim {

	/**
	 * Construct the claim.
	 *
	 * @param string $status     One of the `PaymentEventLedger::CLAIM_*` constants.
	 * @param string $claimed_at The lease timestamp this worker owns ('' when it owns none).
	 */
	public function __construct(
		public readonly string $status,
		public readonly string $claimed_at = ''
	) {}

	/**
	 * Whether this worker must apply the event (a fresh claim or a reclaimed dead lease).
	 */
	public function isOwned(): bool {
		return in_array( $this->status, array( PaymentEventLedger::CLAIM_TAKEN, PaymentEventLedger::CLAIM_RECLAIMED ), true );
	}
}

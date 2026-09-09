<?php
/**
 * Void result (extension-surface §5b.3, D-R38g).
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
 * The answer to "cancel this intent" — and the reason the verb exists at all.
 *
 * {@see self::ALREADY_PAID} is not an error and must never be reported as one: it says the money
 * arrived while core was deciding to release the slot, and the caller's correct response is to APPLY
 * the payment rather than cancel the hold. Folding it into a `WP_Error` would collapse "we could not
 * reach the gateway" and "the customer has paid" into one value, and the recovery for those two is
 * opposite — this is the D-R34c #1 rule (a failure and a finding need separate representations)
 * applied to money.
 */
final class VoidResult {

	/**
	 * The intent was cancelled.
	 */
	public const VOIDED = 'voided';

	/**
	 * The intent had already been paid — apply the payment instead of releasing the slot.
	 */
	public const ALREADY_PAID = 'already_paid';

	/**
	 * Nothing needed cancelling (no intent, already cancelled, or the gateway has no such concept).
	 */
	public const NOT_REQUIRED = 'not_required';

	/**
	 * Every status core understands.
	 *
	 * @var list<string>
	 */
	public const STATUSES = array( self::VOIDED, self::ALREADY_PAID, self::NOT_REQUIRED );

	/**
	 * Construct the result.
	 *
	 * @param string $status      One of {@see self::STATUSES}.
	 * @param string $payment_ref Gateway payment reference, when the intent turned out to be paid.
	 */
	public function __construct(
		public readonly string $status,
		public readonly string $payment_ref = ''
	) {}

	/**
	 * Whether the caller must apply a payment instead of releasing the hold.
	 */
	public function isAlreadyPaid(): bool {
		return self::ALREADY_PAID === $this->status;
	}

	/**
	 * Redacted debug view (§5 invariant 8).
	 *
	 * @return array<string, mixed>
	 */
	public function __debugInfo(): array {
		return array(
			'status'      => $this->status,
			'payment_ref' => $this->payment_ref,
		);
	}
}

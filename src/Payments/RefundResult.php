<?php
/**
 * Refund result (extension-surface §5b.3, D-R38j).
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
 * What the gateway says about a refund it accepted.
 *
 * `pending` is recorded by core as a SUCCEEDED refund, and the reason is worth stating rather than
 * discovering later: every gateway that answers `pending` here has already committed to returning
 * the money — the delay is in the card network, not in the decision — so treating it as unfinished
 * would leave the order stuck at `paid` while the customer watches the refund land in their
 * statement. The webhook leg reconciles the rare reversal, and the refund is keyed by `refund_ref`
 * so that reconciliation is idempotent.
 */
final class RefundResult {

	/**
	 * The refund is settled.
	 */
	public const SUCCEEDED = 'succeeded';

	/**
	 * The gateway accepted the refund and is settling it.
	 */
	public const PENDING = 'pending';

	/**
	 * Every status core understands.
	 *
	 * @var list<string>
	 */
	public const STATUSES = array( self::SUCCEEDED, self::PENDING );

	/**
	 * Construct the result.
	 *
	 * @param string $status       One of {@see self::STATUSES}.
	 * @param string $refund_ref   Gateway refund reference.
	 * @param int    $amount_minor Amount actually refunded, in minor units.
	 * @param string $currency     ISO-4217 currency the gateway reports.
	 */
	public function __construct(
		public readonly string $status,
		public readonly string $refund_ref = '',
		public readonly int $amount_minor = 0,
		public readonly string $currency = ''
	) {}

	/**
	 * Whether core should record this refund as settled.
	 */
	public function isAccepted(): bool {
		return in_array( $this->status, self::STATUSES, true );
	}

	/**
	 * Redacted debug view (§5 invariant 8).
	 *
	 * @return array<string, mixed>
	 */
	public function __debugInfo(): array {
		return array(
			'status'       => $this->status,
			'refund_ref'   => $this->refund_ref,
			'amount_minor' => $this->amount_minor,
			'currency'     => $this->currency,
		);
	}
}

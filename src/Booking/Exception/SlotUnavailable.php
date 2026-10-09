<?php
/**
 * Slot unavailable / lock timeout (§5.6, §8.2).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Booking\Exception;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Support\DomainException;

/**
 * The requested slot cannot be reserved. Reasons (§5.6):
 *
 *   - `taken`        — the slot is no longer free (`aponto_slot_taken`, 409, retry with a new slot).
 *   - `staff_unavailable` — the assigned staff is missing or inactive during re-claim.
 *   - `service_unavailable` — the service is missing or inactive during re-claim.
 *   - `location_unavailable` — the named location is missing or inactive during re-claim.
 *   - `lock_timeout` — the per-staff advisory lock could not be acquired within 3s
 *                      (`aponto_lock_timeout`, 503, retryable with the same key).
 */
final class SlotUnavailable extends DomainException {

	/**
	 * Construct the exception.
	 *
	 * @param string $reason One of `taken`|`staff_unavailable`|`service_unavailable`|`location_unavailable`|`lock_timeout`.
	 */
	public function __construct( private string $reason ) {
		parent::__construct(
			'lock_timeout' === $reason
				? 'Booking lock acquisition timed out.'
				: ( 'staff_unavailable' === $reason ? 'Assigned staff is no longer active.' : 'Requested booking slot is no longer available.' )
		);
	}

	/**
	 * Convenience constructor for a taken slot.
	 */
	public static function taken(): self {
		return new self( 'taken' );
	}

	/**
	 * Staff is missing or inactive when re-claiming a booking.
	 */
	public static function staffUnavailable(): self {
		return new self( 'staff_unavailable' );
	}

	/**
	 * Convenience constructor for a lock timeout.
	 */
	public static function lockTimeout(): self {
		return new self( 'lock_timeout' );
	}

	/**
	 * The reason discriminator (`taken`|`staff_unavailable`|`service_unavailable`|`location_unavailable`|`lock_timeout`).
	 */
	public function reason(): string {
		return $this->reason;
	}

	/**
	 * Stable REST error code (slot taken vs lock timeout).
	 */
	public function errorCode(): string {
		return 'lock_timeout' === $this->reason ? 'aponto_lock_timeout' : 'aponto_slot_taken';
	}

	/**
	 * HTTP status (409 taken, 503 lock timeout).
	 */
	public function httpStatus(): int {
		return 'lock_timeout' === $this->reason ? 503 : 409;
	}

	/**
	 * Only lock timeouts are retryable.
	 */
	public function retryable(): bool {
		return 'lock_timeout' === $this->reason;
	}
}

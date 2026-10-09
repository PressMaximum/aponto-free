<?php
/**
 * Booking draft — input to reserve()/reschedule (§5.6).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Booking;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * The immutable input to {@see ReservationService::reserve()} and the availability check
 * {@see \Aponto\Availability\Engine::is_slot_free()}. Slot identity is `start_utc` (§5.4); the
 * service is loaded fresh so its live buffers are frozen onto the booking at save time.
 *
 * `idempotency_key` is the RAW key from `X-Aponto-Idempotency` (null for the admin scope, which
 * skips the claim — §5.6); `request_hash` is the canonical request fingerprint the REST layer
 * computes. `scope` is `public` or `admin`.
 */
final class BookingDraft {

	/**
	 * Construct a booking draft.
	 *
	 * @param int                        $service_id        Service id.
	 * @param int|null                   $staff_id          Staff id, or null for any-staff resolution.
	 * @param int                        $location_id       Location id (0 = no location).
	 * @param \DateTimeImmutable         $start_utc         Slot start instant (UTC) — the slot identity.
	 * @param CustomerInput|null         $customer          Customer identity.
	 * @param string                     $customer_timezone Customer IANA timezone (may be empty).
	 * @param bool                       $consent           Whether the customer ticked consent.
	 * @param string|null                $idempotency_key   Raw idempotency key, or null (admin scope).
	 * @param string                     $request_hash      Canonical request fingerprint (idempotency).
	 * @param int                        $attendees         Requested attendee count (capacity ≥ 1).
	 * @param string                     $scope             Idempotency scope: `public`|`admin`.
	 * @param string|null                $status            Explicit initial status (`pending`|`confirmed`,
	 *                                                      caller-validated), or null to use the
	 *                                                      `default_booking_status` setting (REST-9).
	 * @param array<string, string|bool> $custom_fields Validated answers to the site's extra
	 *                                              booking-form fields, `slug => value` (D-R30).
	 *                                              Empty on every path that collects none.
	 * @param string                     $payment_method Payment module code the customer chose, or
	 *                                              `''` for none / pay on site (D-R38). Validated
	 *                                              against `PaymentRegistry::activeCodes()` at the
	 *                                              boundary; the engine only carries it.
	 * @param string                     $coupon_code Canonical coupon code, or `''` when none.
	 * @param int                        $coupon_user_id Server-resolved WordPress user id for coupon
	 *                                              scope: the LOGGED-IN visitor on the public path
	 *                                              (D-R67e), the customer's admin-linked account on
	 *                                              the admin path, or `0`.
	 * @param int|null                   $quoted_total_minor The total the boundary priced this draft at
	 *                                              (and decided the payment requirement from), or
	 *                                              null when not asserted. The reservation re-prices
	 *                                              under its locks and refuses a draft whose free vs
	 *                                              payable classification moved (D-R67m).
	 * @param string                     $exact_hash sha256 of the exact submitted body, stored on
	 *                                              the idempotency claim for early replay (D-R67u).
	 * @param string                     $amount_mode Validated initial payment choice: deposit or full.
	 * @param bool                       $deferred_checkout Trusted customerless external checkout hold.
	 */
	public function __construct(
		public readonly int $service_id,
		public readonly ?int $staff_id,
		public readonly int $location_id,
		public readonly \DateTimeImmutable $start_utc,
		public readonly ?CustomerInput $customer,
		public readonly string $customer_timezone = '',
		public readonly bool $consent = false,
		public readonly ?string $idempotency_key = null,
		public readonly string $request_hash = '',
		public readonly int $attendees = 1,
		public readonly string $scope = 'public',
		public readonly ?string $status = null,
		public readonly array $custom_fields = array(),
		public readonly string $payment_method = '',
		public readonly string $coupon_code = '',
		public readonly int $coupon_user_id = 0,
		public readonly ?int $quoted_total_minor = null,
		public readonly string $exact_hash = '',
		public readonly string $amount_mode = 'deposit',
		public readonly bool $deferred_checkout = false
	) {}

	/**
	 * Copy of this draft bound to a concrete staff id (used by any-staff resolution, §5.6).
	 *
	 * @param int $staff_id Concrete staff id.
	 */
	public function withStaff( int $staff_id ): self {
		return new self(
			$this->service_id,
			$staff_id,
			$this->location_id,
			$this->start_utc,
			$this->customer,
			$this->customer_timezone,
			$this->consent,
			$this->idempotency_key,
			$this->request_hash,
			$this->attendees,
			$this->scope,
			$this->status,
			$this->custom_fields,
			$this->payment_method,
			$this->coupon_code,
			$this->coupon_user_id,
			$this->quoted_total_minor,
			$this->exact_hash,
			$this->amount_mode,
			$this->deferred_checkout
		);
	}
}

<?php
/**
 * Persisted booking snapshot (§4.2).
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
 * An immutable snapshot of a persisted booking, hydrated from an `aponto_bookings` row (joined
 * with its order code). Passed to domain events and returned from the write services. The RAW
 * manage token is NEVER carried here — only `token_hash` is stored; the raw token lives solely in
 * the {@see ReservationResult} of the ORIGINAL request (§5.6, NB-4).
 */
final class Booking {

	/**
	 * Construct a booking snapshot.
	 *
	 * @param int                $id                Booking id.
	 * @param int                $service_id        Service id.
	 * @param int                $staff_id          Staff id.
	 * @param int                $location_id       Location id.
	 * @param \DateTimeImmutable $start_utc         Start instant (UTC).
	 * @param \DateTimeImmutable $end_utc           End instant (UTC).
	 * @param string             $local_date        Business-local date `Y-m-d`.
	 * @param int                $start_minute      Business-local start minute.
	 * @param int                $end_minute        Business-local end minute.
	 * @param int                $buffer_before     Frozen buffer before (minutes).
	 * @param int                $buffer_after      Frozen buffer after (minutes).
	 * @param string             $status            Status: pending|confirmed|cancelled|completed|no_show.
	 * @param int                $attendees         Attendee count.
	 * @param int                $customer_id       Customer id.
	 * @param string             $customer_timezone Customer IANA timezone (may be empty).
	 * @param string             $token_hash        SHA-256 hex of the raw manage token.
	 * @param int                $ics_sequence      ICS SEQUENCE (bumped on reschedule).
	 * @param int|null           $order_id          Order id (if any).
	 * @param string             $order_code        Public order code `AP-XXXXX` (if any).
	 * @param string             $updated_at        Raw `updated_at` MySQL datetime ('' if unknown) —
	 *                                              part of the FULL snapshot compensation restores (R3-1).
	 * @param int                $mutation_version  Optimistic mutation counter (R4-1): every booking
	 *                                              write bumps it atomically; compensation CAS keys
	 *                                              on it exclusively.
	 * @param string             $created_at        Raw `created_at` MySQL datetime ('' if unknown) —
	 *                                              half of the durable manage token's derivation
	 *                                              input (D-R26); immutable for the row's lifetime,
	 *                                              which is what makes the token stable.
	 */
	public function __construct(
		public readonly int $id,
		public readonly int $service_id,
		public readonly int $staff_id,
		public readonly int $location_id,
		public readonly \DateTimeImmutable $start_utc,
		public readonly \DateTimeImmutable $end_utc,
		public readonly string $local_date,
		public readonly int $start_minute,
		public readonly int $end_minute,
		public readonly int $buffer_before,
		public readonly int $buffer_after,
		public readonly string $status,
		public readonly int $attendees,
		public readonly int $customer_id,
		public readonly string $customer_timezone,
		public readonly string $token_hash,
		public readonly int $ics_sequence,
		public readonly ?int $order_id = null,
		public readonly string $order_code = '',
		public readonly string $updated_at = '',
		public readonly int $mutation_version = 0,
		public readonly string $created_at = ''
	) {}
}

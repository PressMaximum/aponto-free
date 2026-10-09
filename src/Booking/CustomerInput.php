<?php
/**
 * Customer input for a booking (§4.5).
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

use Aponto\Support\PersonName;

/**
 * Raw customer identity supplied with a booking request. `email_norm` is derived
 * (`strtolower(trim(email))`, NB-5) and is the dedupe key. On an EXISTING customer the stored
 * `first_name`/`last_name` win and only empty parts are filled; `phone` is never blanked (§4.5 as
 * amended by D-R73).
 *
 * The name is stored SPLIT (founder 2026-10-01, N1, D-R69); {@see self::displayName()} is the one
 * composed form, via {@see PersonName::display()}.
 *
 * Two ADMIN-only shapes (D-R77, front-desk bookings): `id > 0` names an EXISTING customer row the
 * operator picked — it is used as stored and never upserted — and an empty `email` with `id = 0`
 * is a walk-in with no email, which always becomes a NEW row. The public route produces neither.
 */
final class CustomerInput {

	/**
	 * Construct customer input.
	 *
	 * @param string $first_name First name.
	 * @param string $last_name  Last name.
	 * @param string $email      Email address (raw).
	 * @param string $phone      Phone number (may be empty per settings).
	 * @param string $note       Customer note (may be empty).
	 * @param int    $id         An existing customer row to use as stored, or 0 (D-R77).
	 */
	public function __construct(
		public readonly string $first_name,
		public readonly string $last_name,
		public readonly string $email,
		public readonly string $phone = '',
		public readonly string $note = '',
		public readonly int $id = 0
	) {}

	/**
	 * The composed display name (never stored).
	 */
	public function displayName(): string {
		return PersonName::display( $this->first_name, $this->last_name );
	}

	/**
	 * Normalised email (`strtolower(trim(email))`) — the customer dedupe key (§4.5, NB-5).
	 */
	public function emailNorm(): string {
		return strtolower( trim( $this->email ) );
	}
}

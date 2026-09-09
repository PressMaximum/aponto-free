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

/**
 * Raw customer identity supplied with a booking request. `email_norm` is derived
 * (`strtolower(trim(email))`, NB-5) and is the dedupe key; the display `email`/`name`/`phone`
 * are refreshed to the latest booking on an existing customer (§4.5).
 */
final class CustomerInput {

	/**
	 * Construct customer input.
	 *
	 * @param string $name  Display name.
	 * @param string $email Email address (raw).
	 * @param string $phone Phone number (may be empty per settings).
	 * @param string $note  Customer note (may be empty).
	 */
	public function __construct(
		public readonly string $name,
		public readonly string $email,
		public readonly string $phone = '',
		public readonly string $note = ''
	) {}

	/**
	 * Normalised email (`strtolower(trim(email))`) — the customer dedupe key (§4.5, NB-5).
	 */
	public function emailNorm(): string {
		return strtolower( trim( $this->email ) );
	}
}

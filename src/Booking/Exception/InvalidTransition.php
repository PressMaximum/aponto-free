<?php
/**
 * Illegal booking status transition (§5.6, §8.2).
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
 * A booking status transition is not permitted from the current state
 * (`aponto_invalid_transition`). An ILLEGAL matrix move is a 409 conflict; a PREMATURE transition
 * (legal move, its time simply has not come) is a 422 — the same request succeeds when resent with
 * `force: true` + reason, so the admin UI can offer a force dialog (SPEC-P1 §1.4; fleet-r1 U2 F3).
 *
 * TWO transitions are premature-able and they measure DIFFERENT instants, so the message branches
 * on the target status (D-R33, review 2026-09-03): `completed` is early before `end_utc` ("has not
 * ended"), `no_show` before `start_utc` ("has not started"). One code and one `premature` flag, two
 * sentences — telling an admin their appointment "has not ended yet" when the real objection is
 * that it has not begun sends them looking for the wrong thing.
 */
final class InvalidTransition extends DomainException {

	/**
	 * Construct the exception.
	 *
	 * @param string $from      Current status.
	 * @param string $to        Requested status.
	 * @param bool   $premature Whether this is a premature complete (forceable — 422, not 409).
	 */
	public function __construct(
		public readonly string $from,
		public readonly string $to,
		public readonly bool $premature = false
	) {
		parent::__construct( $premature ? self::prematureMessage( $to ) : 'Booking status transition is not allowed.' );
	}

	/**
	 * The English log message for a premature transition, by target status.
	 *
	 * @param string $to Requested status.
	 */
	private static function prematureMessage( string $to ): string {
		return 'no_show' === $to
			? 'The appointment has not started yet. Resend with force to mark it as a no-show early.'
			: 'The appointment has not ended yet. Resend with force to complete it early.';
	}

	/**
	 * Stable REST error code.
	 */
	public function errorCode(): string {
		return 'aponto_invalid_transition';
	}

	/**
	 * HTTP status: 422 for the forceable premature complete, 409 for an illegal matrix move.
	 */
	public function httpStatus(): int {
		return $this->premature ? 422 : 409;
	}
}

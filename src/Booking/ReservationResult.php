<?php
/**
 * Result of a reserve() call (§5.6).
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
 * The outcome of {@see ReservationService::reserve()}. Distinguishes the ORIGINAL request from an
 * idempotent REPLAY so the REST layer can honour the replay contract (§5.6, rest-contract §3.4):
 *
 *   - Original (`replay = false`): `raw_token` is the freshly minted manage token, present only in
 *     this in-memory result — the REST layer builds `manage_url`/`ics_url` and sets
 *     `links_available = true`.
 *   - Replay (`replay = true`): `raw_token` is null; the REST layer returns
 *     `links_available = false` and the "link sent to your email" message, with NO token/url.
 */
final class ReservationResult {

	/**
	 * Construct a reservation result.
	 *
	 * @param Booking     $booking   Persisted booking snapshot.
	 * @param string|null $raw_token Raw manage token (original request only), else null.
	 * @param bool        $replay    Whether this is an idempotent replay of a prior request.
	 */
	public function __construct(
		public readonly Booking $booking,
		public readonly ?string $raw_token,
		public readonly bool $replay
	) {}

	/**
	 * Whether manage/ics links can be built from this result (original request only).
	 */
	public function linksAvailable(): bool {
		return ! $this->replay && null !== $this->raw_token;
	}
}

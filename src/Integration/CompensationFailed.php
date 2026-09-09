<?php
/**
 * A rollback of a connection write did not itself succeed (Codex round 5, #1).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Integration;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * The compensation for a failed projection write ALSO failed, so the stored row and the projection
 * are now in a state nobody has verified.
 *
 * Distinct from {@see ProjectionUnavailable} because the two demand opposite advice. A projection
 * that could not be locked is CLEAN: nothing was applied, and "try again" is both true and safe —
 * `503`. A compensation that failed is not clean: a row was written or deleted and could not be put
 * back, so the next attempt starts from an unknown state and a retryable status would be a
 * guarantee this code cannot make. That is a `500`, and it is also the one failure in the
 * integration surface that always warrants a log entry of its own.
 */
final class CompensationFailed extends \RuntimeException {
}

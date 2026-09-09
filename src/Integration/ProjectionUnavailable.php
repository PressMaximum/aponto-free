<?php
/**
 * The connection projection could not be updated safely (Codex round 3, P1 #2).
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
 * Thrown when the autoloaded connection projection cannot be read-modify-written under its lock, or
 * when the write did not persist.
 *
 * This used to be a silent best-effort: the mutation ran whether or not the lock was acquired, and
 * `update_option()`'s return value was ignored. Both failures are invisible in the happy path and
 * produce the same shape of wrong answer — a projection that disagrees with the authoritative
 * `aponto_staff_meta` rows, which is what every "is this staff member connected" decision reads,
 * including the availability busy adapter's early-out.
 *
 * A caller turns this into `503 aponto_lock_timeout` (retryable, and true: the operation did not
 * happen) rather than reporting a connect or disconnect that only half occurred.
 */
final class ProjectionUnavailable extends \RuntimeException {
}

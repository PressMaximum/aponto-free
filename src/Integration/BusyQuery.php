<?php
/**
 * Remote busy query (extension-surface §5.1, §5.2).
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
 * What `aponto_pull_busy_{key}` receives: ONE staff member, ONE half-open UTC window, and the
 * connection to read it with (extension-surface §5.1).
 *
 * Deliberately NOT the core {@see \Aponto\Availability\SlotQuery}. A slot query is service-shaped
 * and may name no staff at all (any-staff display); a driver needs the opposite — a concrete staff
 * member and an absolute instant range — and must not be handed the service/location vocabulary it
 * has no business interpreting.
 *
 * Every dispatch is on the DISPLAY path. The reserve path never constructs one, because
 * `is_slot_free()` runs inside `GET_LOCK` + the reservation transaction and no HTTP may happen
 * there (D-R34); it reads the cache this query's results populated instead.
 *
 * A driver reports failure through {@see self::recordError()} AND by returning the periods it was
 * given unchanged; core then applies the fail-closed/stale-grace policy. A driver never decides
 * that policy, and it can never open a slot (extension-surface §2.1.2 subtract-only).
 */
final class BusyQuery {

	/**
	 * Error message recorded by the driver, if any.
	 *
	 * @var string
	 */
	private string $error = '';

	/**
	 * Construct the query.
	 *
	 * @param non-empty-string   $module_code Registry code.
	 * @param int                $staff_id    Concrete staff member.
	 * @param ConnectionRef      $connection  Decrypted connection for that staff member.
	 * @param \DateTimeImmutable $start_utc   Window start (UTC, inclusive).
	 * @param \DateTimeImmutable $end_utc     Window end (UTC, exclusive).
	 * @param int                $deadline    Unix timestamp the lookup must finish by (0 = none).
	 */
	public function __construct(
		public readonly string $module_code,
		public readonly int $staff_id,
		public readonly ConnectionRef $connection,
		public readonly \DateTimeImmutable $start_utc,
		public readonly \DateTimeImmutable $end_utc,
		public readonly int $deadline = 0
	) {}

	/**
	 * Seconds left before this lookup must stop, or 0 when no deadline was set.
	 *
	 * A driver that PAGES needs this (Codex round 3, P1 #4): the honest choices when a calendar has
	 * more pages than the budget allows are "keep going" or "report failure", and a fixed page cap
	 * silently chose a third — return what was fetched so far AS IF it were the whole answer, which
	 * on the busy path means offering booked time as free.
	 *
	 * @param int $now Current unix timestamp.
	 */
	public function secondsLeft( int $now ): int {
		return $this->deadline > 0 ? max( 0, $this->deadline - $now ) : 0;
	}

	/**
	 * Whether the deadline has passed (never true when no deadline was set).
	 *
	 * @param int $now Current unix timestamp.
	 */
	public function expired( int $now ): bool {
		return $this->deadline > 0 && $now >= $this->deadline;
	}

	/**
	 * Record a driver-side failure for this window (extension-surface §5.2).
	 *
	 * The message is an operator-facing English string; it must contain no token, no authorization
	 * code and no customer data — core writes it to the structured log and to Diagnostics.
	 *
	 * @param string $message Stable, PII-free failure description.
	 */
	public function recordError( string $message ): void {
		$this->error = $message;
	}

	/**
	 * Whether the driver reported a failure.
	 */
	public function failed(): bool {
		return '' !== $this->error;
	}

	/**
	 * The recorded failure message (empty when none).
	 */
	public function error(): string {
		return $this->error;
	}

	/**
	 * Redacted debug view (§5 invariant 8, Codex P1 #5) — the connection is summarised, not dumped.
	 *
	 * @return array<string, mixed>
	 */
	public function __debugInfo(): array {
		return array(
			'module_code' => $this->module_code,
			'staff_id'    => $this->staff_id,
			'connection'  => '[redacted ConnectionRef]',
			'start_utc'   => $this->start_utc->format( 'c' ),
			'end_utc'     => $this->end_utc->format( 'c' ),
			'error'       => $this->error,
		);
	}
}

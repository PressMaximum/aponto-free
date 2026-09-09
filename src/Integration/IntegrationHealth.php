<?php
/**
 * Operator-facing integration health record (D-R34).
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

use Aponto\Support\Clock;
use Aponto\Support\Logger;
use Aponto\Support\Settings;

/**
 * The last thing that went wrong per integration, kept so Diagnostics and the module panel can say
 * something concrete instead of "slots are missing and nobody knows why".
 *
 * Failures on the availability path are the ones this exists for: they are INVISIBLE by
 * construction. A remote busy source that cannot be reached fails CLOSED (D-R34) — the affected
 * staff member's slots disappear — which looks exactly like a staff member with a full calendar.
 * Without a recorded reason the operator has no way to tell those apart.
 *
 * One autoloaded-off option, one entry per module, last-writer-wins. Deliberately NOT a log
 * table: this is a "what is broken right now" signal, not history — history is the structured
 * logger's job, and {@see Logger} redacts what this must not repeat. The message stored here is a
 * driver-supplied English string that the driver contract requires to be free of tokens and PII.
 */
final class IntegrationHealth {

	/**
	 * Option holding the per-module health record.
	 */
	public const OPTION = 'aponto_integration_health';

	/**
	 * Construct the recorder.
	 *
	 * @param Settings    $settings Settings reader (for the logger's own enabled state).
	 * @param Logger|null $logger   Structured logger, or null to build one lazily.
	 * @param Clock|null  $clock    Injectable clock (§5 invariant 7).
	 */
	public function __construct(
		private Settings $settings,
		private ?Logger $logger = null,
		private ?Clock $clock = null
	) {}

	/**
	 * Build from the global handles.
	 */
	public static function make(): self {
		return new self( new Settings(), null, new Clock() );
	}

	/**
	 * Record a failure for one module, and mirror it into the structured log.
	 *
	 * @param string $code     Module code.
	 * @param string $scope    Where it happened: `busy` or `sync`.
	 * @param string $message  Stable English, PII-free description.
	 * @param int    $staff_id Staff member involved, or 0.
	 */
	public function recordFailure( string $code, string $scope, string $message, int $staff_id = 0 ): void {
		$record = $this->all();

		$record[ $code ] = array(
			'scope'    => $scope,
			'message'  => $message,
			'staff_id' => $staff_id,
			'at'       => $this->now()->format( 'Y-m-d H:i:s' ),
		);

		update_option( self::OPTION, $record, false );

		$logger = $this->logger ?? new Logger( $this->settings, $this->clock ?? new Clock() );
		$logger->log(
			'aponto_integration_failed',
			'warning',
			'Integration driver call failed.',
			array(
				'module_code' => $code,
				'scope'       => $scope,
				'staff_id'    => $staff_id,
			)
		);
	}

	/** The current instant in UTC, from the injected clock (§5 invariant 7). */
	private function now(): \DateTimeImmutable {
		return ( $this->clock ?? new Clock() )->now()->setTimezone( new \DateTimeZone( 'UTC' ) );
	}

	/**
	 * Record a failure that belongs to no single module — LOG ONLY, no option row.
	 *
	 * The per-module record answers "what is broken about THIS integration"; a cross-cutting failure
	 * (a compensation that could not restore several modules' connections at once) has no honest key
	 * there, and inventing one would put a fake module code on a screen. It still has to be loud,
	 * so it goes to the structured log.
	 *
	 * @param string $scope    Where it happened.
	 * @param string $message  Stable English, PII-free description.
	 * @param int    $staff_id Staff member involved, or 0.
	 */
	public function recordGlobalFailure( string $scope, string $message, int $staff_id = 0 ): void {
		$logger = $this->logger ?? new Logger( $this->settings, $this->clock ?? new Clock() );
		$logger->log(
			'aponto_integration_failed',
			'error',
			$message,
			array(
				'module_code' => '',
				'scope'       => $scope,
				'staff_id'    => $staff_id,
			)
		);
	}

	/**
	 * Clear a module's recorded failure (a later success).
	 *
	 * @param string $code Module code.
	 */
	public function clear( string $code ): void {
		$record = $this->all();
		if ( ! isset( $record[ $code ] ) ) {
			return;
		}
		unset( $record[ $code ] );
		update_option( self::OPTION, $record, false );
	}

	/**
	 * Every recorded failure, `code => {scope, message, staff_id, at}`.
	 *
	 * @return array<string, array<string, mixed>>
	 */
	public function all(): array {
		$stored = get_option( self::OPTION, array() );

		return is_array( $stored ) ? $stored : array();
	}

	/**
	 * The record for one module, or null.
	 *
	 * @param string $code Module code.
	 * @return array<string, mixed>|null
	 */
	public function forModule( string $code ): ?array {
		$record = $this->all()[ $code ] ?? null;

		return is_array( $record ) ? $record : null;
	}
}

<?php
/**
 * Connection test request (extension-surface §5.1).
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
 * A health/auth probe, deliberately separate from connect (extension-surface §5.1) so the catalog
 * can report `Needs reconnect` without writing a booking event or mutating any connection.
 *
 * `connection` is null for a GLOBAL probe — "are the credentials the site owner pasted usable at
 * all" — which is answerable before any staff has authorized.
 */
final class ConnectionTestRequest {

	/**
	 * Construct the request.
	 *
	 * @param non-empty-string   $module_code Registry code.
	 * @param int                $staff_id    Staff member probed, or 0 for a global probe.
	 * @param ConnectionRef|null $connection  Connection under test, or null for a global probe.
	 */
	public function __construct(
		public readonly string $module_code,
		public readonly int $staff_id = 0,
		public readonly ?ConnectionRef $connection = null
	) {}

	/**
	 * Redacted debug view (§5 invariant 8, Codex P1 #5).
	 *
	 * @return array<string, mixed>
	 */
	public function __debugInfo(): array {
		return array(
			'module_code' => $this->module_code,
			'staff_id'    => $this->staff_id,
			'connection'  => null === $this->connection ? null : '[redacted ConnectionRef]',
		);
	}
}

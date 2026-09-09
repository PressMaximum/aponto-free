<?php
/**
 * Disconnect request (extension-surface §5.1).
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
 * Asks a driver to revoke a staff member's remote authorization (extension-surface §5.1).
 *
 * The driver's revoke is BEST-EFFORT: core deletes the local connection whatever the driver
 * answers, so a provider that is unreachable can never strand a site with a connection it cannot
 * remove. `connection` is null when the local record is already gone — the idempotent second call.
 */
final class DisconnectRequest {

	/**
	 * Construct the request.
	 *
	 * @param non-empty-string   $module_code Registry code.
	 * @param int                $staff_id    Staff member disconnecting.
	 * @param ConnectionRef|null $connection  Connection being revoked, or null when absent.
	 */
	public function __construct(
		public readonly string $module_code,
		public readonly int $staff_id,
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

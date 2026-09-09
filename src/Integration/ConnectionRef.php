<?php
/**
 * A decrypted, read-only view of one staff member's connection (extension-surface §5.1).
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
 * What a driver receives whenever it must act AS a connected staff member (extension-surface §5.1).
 *
 * The payload is already decrypted — that is the whole point of handing the driver a ref instead of
 * the stored envelope — so this object is the most token-bearing value in the integration surface.
 * Two consequences are enforced here rather than left to caller discipline:
 *
 *   - the payload is PRIVATE and reachable only through {@see self::value()} / {@see self::data()},
 *     so it cannot be splatted into a log line by accident;
 *   - {@see self::__debugInfo()} redacts it, so `var_dump`, `print_r` via debug backtraces and every
 *     exception dump show the metadata and never the tokens (§5 invariant 8).
 *
 * `status` is core's view of the connection, not the provider's: `active` until a probe or a driver
 * error says otherwise, then `needs_reconnect`. The provider is asked with `aponto_test_{key}`.
 */
final class ConnectionRef {

	/**
	 * Status of a usable connection.
	 */
	public const ACTIVE = 'active';

	/**
	 * Status of a connection whose stored authorization no longer works.
	 */
	public const NEEDS_RECONNECT = 'needs_reconnect';

	/**
	 * Construct the ref.
	 *
	 * @param non-empty-string     $module_code  Registry code.
	 * @param int                  $staff_id     Staff member owning the connection.
	 * @param string               $account      Human label (normally the authorized email).
	 * @param string               $status       {@see self::ACTIVE} or {@see self::NEEDS_RECONNECT}.
	 * @param string               $connected_at MySQL datetime the connection was established.
	 * @param array<string, mixed> $data         DECRYPTED connection payload.
	 */
	public function __construct(
		public readonly string $module_code,
		public readonly int $staff_id,
		public readonly string $account,
		public readonly string $status,
		public readonly string $connected_at,
		private array $data = array()
	) {}

	/**
	 * The decrypted payload. Never log, echo or return this over REST.
	 *
	 * @return array<string, mixed>
	 */
	public function data(): array {
		return $this->data;
	}

	/**
	 * Read one dotted path out of the payload (`token.refresh_token`), or null when absent.
	 *
	 * @param string $path Dotted path.
	 * @return mixed
	 */
	public function value( string $path ) {
		$node = $this->data;
		foreach ( explode( '.', $path ) as $segment ) {
			if ( ! is_array( $node ) || ! array_key_exists( $segment, $node ) ) {
				return null;
			}
			$node = $node[ $segment ];
		}

		return $node;
	}

	/**
	 * Whether this connection is currently usable.
	 */
	public function isActive(): bool {
		return self::ACTIVE === $this->status;
	}

	/**
	 * Redacted debug view (§5 invariant 8).
	 *
	 * BOTH the payload and the ACCOUNT are withheld. The account is a staff member's email address —
	 * PII under `docs/privacy-inventory.md`, and the privacy contract's rule is that PII never
	 * reaches a log, not that tokens do not (Codex P1 #5). The payload is reduced to its key names,
	 * which is what a developer actually needs from a dump: the SHAPE, never the values.
	 *
	 * @return array<string, mixed>
	 */
	public function __debugInfo(): array {
		return array(
			'module_code'  => $this->module_code,
			'staff_id'     => $this->staff_id,
			'account'      => '[redacted]',
			'status'       => $this->status,
			'connected_at' => $this->connected_at,
			'data'         => '[redacted: ' . implode( ',', array_keys( $this->data ) ) . ']',
		);
	}
}

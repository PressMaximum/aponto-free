<?php
/**
 * Connection test result (extension-surface §5.1).
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
 * The sanitized answer of `aponto_test_{key}` (extension-surface §4.1): `{ok, code, message}` and
 * nothing else. No token, no raw provider payload, no URL — this shape goes straight out over REST.
 *
 * {@see self::NEEDS_RECONNECT} is the one code core reads rather than passes through: it means the
 * stored authorization is dead (revoked, expired beyond refresh, scope removed) and the connection
 * is flipped to `needs_reconnect` so the catalog stops claiming the staff member is connected.
 */
final class ConnectionTestResult {

	/**
	 * Driver code meaning "the stored authorization is no longer usable".
	 */
	public const NEEDS_RECONNECT = 'needs_reconnect';

	/**
	 * Driver code meaning "everything is fine".
	 */
	public const OK = 'ok';

	/**
	 * Construct the result.
	 *
	 * @param bool   $ok      Whether the probe succeeded.
	 * @param string $code    Stable machine code, e.g. `ok` or `needs_reconnect`.
	 * @param string $message Localized, sanitized message safe to render.
	 */
	public function __construct(
		public readonly bool $ok,
		public readonly string $code = self::OK,
		public readonly string $message = ''
	) {}

	/**
	 * Whether this result says the stored authorization must be re-established.
	 */
	public function needsReconnect(): bool {
		return self::NEEDS_RECONNECT === $this->code;
	}
}

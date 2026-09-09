<?php
/**
 * Connect result (extension-surface §5.1).
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
 * What a driver returns from `aponto_connect_{key}` (extension-surface §5.1).
 *
 * On the START leg only {@see self::$authorization_url} is set. On the RETURN leg the driver hands
 * back {@see self::$data} — the connection payload core seals per staff — plus the human label
 * (normally the authorized account's email) the catalog renders.
 *
 * `data` MAY contain plaintext secrets: it is going straight into
 * {@see ConnectionStore::save()}, which seals every dotted path the driver declared through
 * `aponto_module_secret_keys(…, 'staff_connection')` before the value ever reaches the database.
 * It must never be logged or returned over REST.
 */
final class ConnectionResult {

	/**
	 * Construct a result.
	 *
	 * @param string               $authorization_url Absolute URL to send the admin to (start leg).
	 * @param array<string, mixed> $data              Connection payload to seal (return leg).
	 * @param string               $account           Human label, e.g. the authorized email.
	 */
	public function __construct(
		public readonly string $authorization_url = '',
		public readonly array $data = array(),
		public readonly string $account = ''
	) {}

	/**
	 * A start-leg result carrying only the authorization URL.
	 *
	 * @param string $url Absolute authorization URL.
	 */
	public static function redirect( string $url ): self {
		return new self( $url );
	}

	/**
	 * A return-leg result carrying the connection payload.
	 *
	 * @param array<string, mixed> $data    Connection payload (plaintext secrets allowed).
	 * @param string               $account Human label.
	 */
	public static function connected( array $data, string $account = '' ): self {
		return new self( '', $data, $account );
	}

	/**
	 * Redacted debug view (§5 invariant 8, Codex P1 #5). The payload carries PLAINTEXT tokens on the
	 * return leg — it is on its way to be sealed — and the account is a staff email.
	 *
	 * @return array<string, mixed>
	 */
	public function __debugInfo(): array {
		return array(
			'authorization_url' => '' === $this->authorization_url ? '' : '[redacted]',
			'account'           => '' === $this->account ? '' : '[redacted]',
			'data'              => '[redacted: ' . implode( ',', array_keys( $this->data ) ) . ']',
		);
	}
}

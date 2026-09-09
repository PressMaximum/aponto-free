<?php
/**
 * Connect request (extension-surface §4.1, §5.1).
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
 * One leg of the OAuth handshake for ONE staff member (extension-surface §4.1).
 *
 * Two shapes travel through the SAME request object and the SAME driver filter, because they are
 * two halves of one operation and a driver that could only do one of them would be useless:
 *
 *   1. `authorization_code === ''` — START. The driver returns a {@see ConnectionResult} carrying
 *      only an `authorization_url`; core has already minted and bound the single-use `state`.
 *   2. `authorization_code !== ''` — FINISH. The driver exchanges the code and returns the token
 *      payload for core to seal per staff.
 *
 * The `state` is core's, not the driver's: it is minted, bound and consumed by {@see OAuthState}.
 * A driver must copy it into the authorization URL verbatim and never invent its own.
 */
final class ConnectRequest {

	/**
	 * Construct the request.
	 *
	 * @param non-empty-string   $module_code        Registry code.
	 * @param int                $staff_id           Staff member authorizing.
	 * @param int                $user_id            WordPress user driving the flow.
	 * @param string             $redirect_uri       Absolute redirect URI bound into the state.
	 * @param string             $state              Opaque single-use CSRF state (core-minted).
	 * @param string             $authorization_code Authorization code on the return leg, else ''.
	 * @param ConnectionRef|null $existing         Current connection, when re-authorizing.
	 */
	public function __construct(
		public readonly string $module_code,
		public readonly int $staff_id,
		public readonly int $user_id,
		public readonly string $redirect_uri,
		public readonly string $state,
		public readonly string $authorization_code = '',
		public readonly ?ConnectionRef $existing = null
	) {}

	/**
	 * Whether this is the RETURN leg (an authorization code is present).
	 */
	public function isExchange(): bool {
		return '' !== $this->authorization_code;
	}

	/**
	 * Redacted debug view (§5 invariant 8, Codex P1 #5).
	 *
	 * The authorization code is a one-time credential and the `state` is a live CSRF token; a dump
	 * of this object in an exception trace must not hand either to a log file.
	 *
	 * @return array<string, mixed>
	 */
	public function __debugInfo(): array {
		return array(
			'module_code'        => $this->module_code,
			'staff_id'           => $this->staff_id,
			'user_id'            => $this->user_id,
			'redirect_uri'       => $this->redirect_uri,
			'state'              => '[redacted]',
			'authorization_code' => '' === $this->authorization_code ? '' : '[redacted]',
			'existing'           => null === $this->existing ? null : 'ConnectionRef',
		);
	}
}

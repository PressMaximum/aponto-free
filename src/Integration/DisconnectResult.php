<?php
/**
 * Disconnect result (extension-surface §5.1).
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
 * What a driver returns from `aponto_disconnect_{key}` (extension-surface §5.1).
 *
 * `revoked` is INFORMATIONAL only. Core removes the local connection either way, so a false here
 * means "the remote token may still exist on the provider side", not "the disconnect failed".
 */
final class DisconnectResult {

	/**
	 * Construct the result.
	 *
	 * @param bool $revoked Whether the remote authorization was actually revoked.
	 */
	public function __construct( public readonly bool $revoked = false ) {}
}

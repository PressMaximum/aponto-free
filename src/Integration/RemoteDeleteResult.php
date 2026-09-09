<?php
/**
 * Result of a remote event delete (extension-surface §5.1).
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
 * What `aponto_delete_remote_event_{key}` returns (extension-surface §5.1).
 *
 * A provider answering `404`/`410` is a SUCCESS here, not an error: the contract is "the event is
 * not on the remote calendar any more", and an event someone already deleted by hand satisfies it.
 * That is what makes the retry loop safe to run any number of times.
 */
final class RemoteDeleteResult {

	/**
	 * Construct the result.
	 *
	 * @param bool $deleted Whether the event is now absent remotely.
	 */
	public function __construct( public readonly bool $deleted = true ) {}
}

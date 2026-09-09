<?php
/**
 * Result of a remote event create/update (extension-surface §5.1).
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
 * What `aponto_push_remote_event_{key}` and `aponto_update_remote_event_{key}` return
 * (extension-surface §5.1): the immutable remote id plus the fresh concurrency token, which core
 * stores so the NEXT update can be conditional.
 */
final class RemoteEventResult {

	/**
	 * Construct the result.
	 *
	 * @param string $remote_id Provider-side event id.
	 * @param string $etag      Fresh provider concurrency token (may be empty).
	 */
	public function __construct(
		public readonly string $remote_id,
		public readonly string $etag = ''
	) {}
}

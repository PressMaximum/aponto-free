<?php
/**
 * REST controller contract.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Rest;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * A controller registers one resource family's routes under the `aponto/v1` namespace.
 */
interface Controller {

	/**
	 * Register this controller's routes.
	 *
	 * @param string $rest_namespace REST namespace (`aponto/v1`).
	 */
	public function register( string $rest_namespace ): void;
}

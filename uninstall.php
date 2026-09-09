<?php
/**
 * Uninstall entry point.
 *
 * Loaded by WordPress when the plugin is deleted. Data is kept by default; it is only removed
 * when the core setting `delete_data_on_uninstall` is opted in (§4.1, P2-09).
 *
 * @package Aponto
 */

declare(strict_types=1);

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

require_once __DIR__ . '/src/autoload.php';

( new Aponto\Installation\Uninstaller() )->uninstall();

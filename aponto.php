<?php
/**
 * Plugin Name:       Aponto
 * Description:       Appointment booking plugin by PressMaximum.
 * Version:           1.1.1
 * Requires at least: 6.6
 * Requires PHP:      8.1
 * Author:            PressMaximum
 * Author URI:        https://pressmaximum.com
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       aponto
 * Domain Path:       /languages
 *
 * @package Aponto
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// wp-config can override this before the plugin loads (dev-mode edition switching, §3.3).
if ( ! defined( 'APONTO_DEV' ) ) {
	define( 'APONTO_DEV', false );
}

define( 'APONTO_VERSION', '1.1.1' );
define( 'APONTO_FILE', __FILE__ );

// Hand-written autoloader (NB-2) — runtime never depends on Composer (§1.2, §2.5).
require __DIR__ . '/src/autoload.php';

( new Aponto\Kernel( Aponto\Plan::instance() ) )->boot();

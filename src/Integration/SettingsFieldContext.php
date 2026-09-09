<?php
/**
 * Settings-field context handed to an integration driver (extension-surface §5.1).
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
 * The context passed to `aponto_get_settings_fields_{key}` so a driver can describe its global
 * configuration WITHOUT the generic settings controller hardcoding any provider
 * (extension-surface §5.1).
 *
 * It carries the derived OAuth redirect URI because that value is not a setting: the site owner
 * must paste it into their own OAuth client, so the driver needs it to build the read-only
 * instruction copy its panel renders.
 */
final class SettingsFieldContext {

	/**
	 * Construct the context.
	 *
	 * @param non-empty-string $module_code  Registry code the schema is being built for.
	 * @param string           $redirect_uri Absolute OAuth redirect URI core will honour.
	 */
	public function __construct(
		public readonly string $module_code,
		public readonly string $redirect_uri
	) {}
}

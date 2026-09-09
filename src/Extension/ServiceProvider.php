<?php
/**
 * Module ServiceProvider contract.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Extension;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Database\ModuleMigrationManifest;
use Aponto\Kernel;

/**
 * A module contributes services, hooks, migrations and uninstall behaviour through this
 * contract (extension-surface §3.2).
 *
 * Registry-derived module providers register only when `Plan::has(moduleCode())` is true — a
 * single conditional at boot, not runtime guards scattered through the module. An edition may
 * separately list non-toggleable boot providers through `Plan::editionProviders()` (D-R41).
 */
interface ServiceProvider {

	/**
	 * Registry feature code this provider owns (e.g. `calendar_google`). Must match a key in
	 * {@see \Aponto\Plan::FEATURES}.
	 */
	public static function moduleCode(): string;

	/**
	 * Bind services and attach hook contributions. No business work runs here.
	 *
	 * @param Kernel $kernel Booting kernel (container access).
	 */
	public function register( Kernel $kernel ): void;

	/**
	 * Schema manifests that ride the core migration pass (extension-surface §3.4).
	 *
	 * @return list<ModuleMigrationManifest>
	 */
	public function migrations(): array;

	/**
	 * Remove this module's data, honouring the global `delete_data_on_uninstall` policy.
	 *
	 * Must be idempotent and must not touch core entities (extension-surface §3.5).
	 *
	 * @param ModuleUninstallContext $context Scoped uninstall context.
	 */
	public function uninstall( ModuleUninstallContext $context ): void;
}

<?php
/**
 * Scoped context passed to a module's uninstall routine.
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

/**
 * Context handed to {@see ServiceProvider::uninstall()} (extension-surface §3.5).
 *
 * Exposes the module code, the global delete-data decision, and `$wpdb` scoped by convention
 * to the module's own tables. Typed core repositories (Staff/Service/Booking meta, etc.) are
 * added here when the domain layer lands in a later milestone; this V1 shape carries what the
 * contract needs to be runnable today.
 */
final class ModuleUninstallContext {

	/**
	 * Construct the uninstall context.
	 *
	 * @param non-empty-string $module_code Registry feature code owning the uninstall.
	 * @param bool             $delete_data Global `delete_data_on_uninstall` decision.
	 * @param \wpdb            $wpdb        Database handle (use only for module-owned tables).
	 */
	public function __construct(
		private string $module_code,
		private bool $delete_data,
		private \wpdb $wpdb
	) {}

	/**
	 * Registry feature code owning this uninstall.
	 *
	 * @return non-empty-string
	 */
	public function moduleCode(): string {
		return $this->module_code;
	}

	/**
	 * Whether the operator opted in to data deletion (§4.3 `delete_data_on_uninstall`).
	 */
	public function deleteData(): bool {
		return $this->delete_data;
	}

	/**
	 * Database handle. Use only for tables the module owns (extension-surface §3.5).
	 */
	public function db(): \wpdb {
		return $this->wpdb;
	}
}

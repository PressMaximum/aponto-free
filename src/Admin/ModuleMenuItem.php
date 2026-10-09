<?php
/**
 * One admin menu item contributed by a module (extension-surface §3.3, D-R56).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Admin;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * What a module hands to `aponto_admin_menu_items` to own one entry in the Aponto menu (D-R56).
 *
 * Specified in extension-surface §3.3 since P0 and implemented now, with the shape the SPA
 * actually needs: every Aponto submenu is a hash deep-link into ONE admin page
 * (`admin.php?page=aponto#{slug}`), so the spec's `parentSlug` and numeric `position` had
 * nothing to bind to and are replaced by `after` — the CORE route this item follows.
 *
 * This is free-shipped, edition-neutral core: it names no module and no premium namespace
 * (§5 invariant 2 — the CI leak-grep would fail the Free stage over the literal, which is the
 * point). Core ships the registry, the separately distributed bundle ships the entry — which
 * is what keeps an edition-owned control out of the wp.org archive (D-R41 ownership rule)
 * while the IA still puts Locations beside Staff.
 *
 * NOTHING here grants anything. {@see AdminPage::mergeMenuItems()} drops a contribution unless
 * `moduleCode` is a registry key the plan actually has and `slug` equals that module's registry
 * `menu` value, so the registry stays the single allow-list of which module may own which slug
 * and an open filter cannot become an open menu. `capability` is still WordPress's own menu
 * gate, and REST re-checks every read and write (§5 invariant 3).
 *
 * Properties are camelCase on purpose: extension-surface publishes this constructor with named
 * arguments (`moduleCode:`, `slug:`, …), which binds the parameter names to the contract.
 */
final class ModuleMenuItem {

	/**
	 * Describe the contributed item.
	 *
	 * @param string $moduleCode Registry code of the owning module (`Plan::FEATURES` key).
	 * @param string $slug       Hash route (`[a-z0-9-]+`); MUST equal the registry `menu` value.
	 * @param string $label      Translated menu label.
	 * @param string $capability One of the four `Rest\Policy::MANAGE_*` capabilities.
	 * @param string $after      Core route this item follows; unknown/empty lands before `modules`.
	 */
	public function __construct(
		// phpcs:ignore WordPress.NamingConventions.ValidVariableName.VariableNotSnakeCase -- Published contract property name (extension-surface §3.3).
		public readonly string $moduleCode,
		public readonly string $slug,
		public readonly string $label,
		public readonly string $capability,
		public readonly string $after = ''
	) {}
}

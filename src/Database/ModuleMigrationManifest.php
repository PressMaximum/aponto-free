<?php
/**
 * Module migration manifest.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Database;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * Declarative schema manifest a module hands to the core migration pass (extension-surface
 * §3.4). Immutable value object.
 *
 * Uses per-property `readonly` (PHP 8.1) rather than a `readonly class` (PHP 8.2) to honour the
 * pinned target `Requires PHP: 8.1`. Property names match the published contract so modules can
 * read `$manifest->moduleCode`, `$manifest->version`, etc.
 */
final class ModuleMigrationManifest {

	/**
	 * Construct an immutable manifest.
	 *
	 * @param non-empty-string          $moduleCode    Registry feature code owning the manifest.
	 * @param positive-int              $version       Manifest version applied monotonically.
	 * @param list<non-empty-string>    $schema        dbDelta-compatible CREATE/ALTER statements.
	 * @param callable(\wpdb):bool      $postcondition Returns true when the version's schema holds.
	 * @param callable(\wpdb):void|null $upgrade Optional local data migration, before validation.
	 * @param bool                      $repair Verify and repair this manifest after its version has been applied.
	 */
	public function __construct(
		// phpcs:ignore WordPress.NamingConventions.ValidVariableName.VariableNotSnakeCase -- Published contract property name (extension-surface §3.4).
		public readonly string $moduleCode,
		public readonly int $version,
		public readonly array $schema,
		public readonly mixed $postcondition,
		public readonly mixed $upgrade = null,
		public readonly bool $repair = false
	) {}
}

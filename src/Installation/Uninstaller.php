<?php
/**
 * Uninstall routine.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Installation;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Database\Migrations\Migration_0001_InitialSchema;
use Aponto\Extension\ModuleUninstallContext;
use Aponto\Extension\ServiceProvider;
use Aponto\Plan;
use Aponto\Support\Logger;
use Aponto\Support\Settings;

/**
 * Per-site uninstall (§4.1). Default keeps all data; only when the core setting
 * `delete_data_on_uninstall` is opted in (P2-09 — no standalone option) does it run every
 * module provider's uninstall routine (extension-surface §3.2 pt 5 — enumerated from the
 * registry/build INDEPENDENT of enabled state; review item 5), then drop core tables, options,
 * caps and cron for that site. Multisite iterates every blog.
 */
final class Uninstaller {

	/**
	 * Run uninstall across the site or the whole network.
	 */
	public function uninstall(): void {
		if ( is_multisite() ) {
			$ids = get_sites(
				array(
					'fields' => 'ids',
					'number' => 0,
				)
			);
			foreach ( array_map( 'intval', $ids ) as $blog_id ) {
				switch_to_blog( $blog_id );
				$this->uninstallSite();
				restore_current_blog();
			}

			return;
		}

		$this->uninstallSite();
	}

	/**
	 * Uninstall the current site, honouring the opt-in setting.
	 */
	private function uninstallSite(): void {
		$settings = new Settings();
		if ( ! (bool) $settings->get( 'delete_data_on_uninstall' ) ) {
			return;
		}

		$this->uninstallModules();
		$this->dropTables();
		// MUST run before deleteOptions(): the log directory name lives in `aponto_logger_state`,
		// which the `aponto\_%` sweep removes.
		$this->deleteLogDirectory();
		$this->deleteOptions();
		Capabilities::revoke();
		Cron::clear();
		\Aponto\Integration\RemoteEventSync::clearSchedule();
		\Aponto\Integration\ProjectionPurge::clearSchedule();
	}

	/**
	 * Remove the private debug-log directory written by {@see Logger} (S8).
	 *
	 * {@see Logger} stores its NDJSON generations in `{uploads}/aponto-logs-{16 hex}/`, where the
	 * suffix is persisted in the {@see Logger::OPTION} state — files that survived every earlier
	 * teardown step because they live outside the database. Uploads are per-site, so running this
	 * inside the switched-blog context of {@see self::uninstall()} resolves the right directory on
	 * multisite. Only a name matching the logger's own `[a-f0-9]{16}` shape is ever touched.
	 */
	private function deleteLogDirectory(): void {
		$state = get_option( Logger::OPTION, array() );
		$name  = is_array( $state ) && isset( $state['directory'] ) && is_string( $state['directory'] )
			? $state['directory']
			: '';
		if ( 1 !== preg_match( '/^[a-f0-9]{16}$/', $name ) ) {
			return;
		}

		// Drop the logger state before touching the filesystem: a request still running while we
		// uninstall would otherwise read the stale state and re-create the directory after it is
		// removed. The later options sweep would delete this option anyway; doing it first only
		// narrows that window.
		delete_option( Logger::OPTION );

		$uploads = wp_upload_dir( null, false );
		if ( ! is_array( $uploads ) || ! isset( $uploads['basedir'] ) || ! is_string( $uploads['basedir'] ) ) {
			return;
		}

		self::deleteFlatDirectory( rtrim( $uploads['basedir'], '/\\' ) . '/aponto-logs-' . $name );
	}

	/**
	 * Delete the flat log directory: its regular files, then the directory itself.
	 *
	 * {@see Logger} writes a flat directory — three NDJSON generations plus the `.htaccess` and
	 * `index.html` deny files — and never nests, so nothing here recurses: an entry that is not a
	 * plain file (a directory or symlink planted by someone else) is left in place, and `rmdir()`
	 * is then skipped because the directory is not empty. Leaving an unexpected entry behind is
	 * preferred over following it. `WP_Filesystem` is not guaranteed to be initialisable during
	 * uninstall (it can demand FTP credentials), so the plugin's own private directory is removed
	 * with direct calls — the same posture {@see Logger} uses to write it.
	 *
	 * @param string $directory Absolute directory path.
	 */
	private static function deleteFlatDirectory( string $directory ): void {
		if ( ! is_dir( $directory ) || is_link( $directory ) ) {
			return;
		}

		$entries = scandir( $directory );
		foreach ( is_array( $entries ) ? $entries : array() as $entry ) {
			if ( '.' === $entry || '..' === $entry ) {
				continue;
			}

			$path = $directory . '/' . $entry;
			// unlink() removes a symlink itself and never follows it, so a swapped entry cannot
			// redirect the delete outside the directory.
			if ( is_file( $path ) || is_link( $path ) ) {
				wp_delete_file( $path );
			}
		}

		$remaining = scandir( $directory );
		if ( is_array( $remaining ) && 2 === count( $remaining ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_rmdir -- Opt-in uninstall of the plugin's own private log directory; WP_Filesystem may be unavailable here.
			rmdir( $directory );
		}
	}

	/**
	 * Run every module provider's uninstall routine BEFORE core teardown.
	 *
	 * Enumeration is independent of the enabled state: the registry's provider FQCNs (all null in
	 * the Free build — the loop is then a no-op by construction) plus providers contributed via
	 * `aponto_register_providers` (third-party plugins are still loaded during uninstall). Each
	 * uninstall must be idempotent; one failing module never blocks core teardown.
	 */
	private function uninstallModules(): void {
		global $wpdb;

		foreach ( $this->providerClasses() as $fqcn ) {
			try {
				$code = $fqcn::moduleCode();
				if ( ! isset( Plan::FEATURES[ $code ] ) ) {
					continue;
				}

				( new $fqcn() )->uninstall( new ModuleUninstallContext( $code, true, $wpdb ) );
			} catch ( \Throwable ) {
				// A broken module must not block the rest of the teardown.
				continue;
			}
		}
	}

	/**
	 * Every known module provider FQCN, independent of enabled state.
	 *
	 * @return list<class-string<ServiceProvider>>
	 */
	private function providerClasses(): array {
		$classes = array();

		foreach ( Plan::FEATURES as $meta ) {
			// phpcs:ignore Generic.Commenting.DocComment.MissingShort -- Inline PHPStan type annotation.
			/** @var ?class-string<ServiceProvider> $provider */
			$provider = $meta['provider'];
			if ( is_string( $provider ) ) {
				$classes[] = $provider;
			}
		}

		/** This filter is documented in \Aponto\Plan::providers(). */
		$classes = apply_filters( 'aponto_register_providers', $classes );

		if ( ! is_array( $classes ) ) {
			return array();
		}

		$valid = array();
		foreach ( array_unique( $classes ) as $fqcn ) {
			if ( is_string( $fqcn ) && class_exists( $fqcn ) && is_subclass_of( $fqcn, ServiceProvider::class ) ) {
				$valid[] = $fqcn;
			}
		}

		return $valid;
	}

	/**
	 * Drop every Aponto table for the current site.
	 */
	private function dropTables(): void {
		global $wpdb;

		foreach ( \Aponto\Database\Migrator::coreTableSlugs() as $slug ) {
			$table = $wpdb->prefix . $slug;
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.SchemaChange -- table name from $wpdb->prefix, not user input; schema deletion is explicitly requested by opt-in uninstall.
			$wpdb->query( "DROP TABLE IF EXISTS {$table}" );
		}
	}

	/**
	 * Delete every Aponto option for the current site.
	 *
	 * Every core, onboarding and module option shares the `aponto_` prefix — core settings,
	 * schema/migration bookkeeping, the module-enabled map, the manage-page rewrite version, the
	 * onboarding funnel, the wizard booking-page id, logger state, the dev-edition override and
	 * every `aponto_module_*` payload. A single escaped `LIKE 'aponto\_%'` sweep therefore removes
	 * them all — including options added by future features, closing the reinstall-skips-wizard and
	 * stale-booking-page gaps a hardcoded list left open — while never matching a WordPress core or
	 * third-party option (the escaped underscore is a literal, not a `_` wildcard). Names are
	 * enumerated in SQL and removed with `delete_option()` so the object cache is busted per option.
	 */
	private function deleteOptions(): void {
		global $wpdb;

		$like = $wpdb->esc_like( 'aponto_' ) . '%';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Enumerate every Aponto option name to delete on opt-in uninstall.
		$names = $wpdb->get_col( $wpdb->prepare( "SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s", $like ) );

		foreach ( $names as $name ) {
			delete_option( (string) $name );
		}
	}
}

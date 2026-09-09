<?php
/**
 * Core migration contract.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Database\Migrations;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * A single, ordered, idempotent schema migration (§4.1).
 *
 * Migration 1 uses dbDelta; later migrations use explicit guarded SQL. Every migration must be
 * safe to run twice (DDL auto-commits, so a retried request re-runs it).
 */
interface Migration {

	/**
	 * Monotonic version this migration brings the schema to.
	 *
	 * @return positive-int
	 */
	public function version(): int;

	/**
	 * Apply the migration. Must be idempotent.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function up( \wpdb $wpdb ): void;

	/**
	 * Verify the migration's postcondition holds (schema reached the target shape).
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function verify( \wpdb $wpdb ): bool;
}

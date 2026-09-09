<?php
/**
 * Service reader with settings inheritance (§4.2, §5.3).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Booking\Repository;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Availability\ServiceDefinition;
use Aponto\Support\Settings;

/**
 * Loads a resolved {@see ServiceDefinition}: nullable `slot_step_minutes` / `min_lead_minutes` /
 * `max_horizon_days` inherit their global setting default (§4.2). One indexed primary-key lookup.
 */
final class ServiceRepository {

	/**
	 * Construct the repository.
	 *
	 * @param \wpdb    $wpdb     Database handle.
	 * @param Settings $settings Core settings (for inherited defaults).
	 */
	public function __construct(
		private \wpdb $wpdb,
		private Settings $settings
	) {}

	/**
	 * A service's display name, or '' when the service is gone.
	 *
	 * {@see ServiceDefinition} carries scheduling facts, not presentation, so it has no name — but
	 * anything that writes a HUMAN-READABLE artifact about a booking (a remote calendar event, an
	 * export, a message) needs one. Kept here rather than re-queried at each call site so a module
	 * never reaches into `aponto_services` itself (extension-surface §6).
	 *
	 * @param int $service_id Service id.
	 */
	public function nameOf( int $service_id ): string {
		$table = $this->wpdb->prefix . 'aponto_services';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; the id is bound via prepare().
		$name = $this->wpdb->get_var( $this->wpdb->prepare( "SELECT name FROM {$table} WHERE id = %d", $service_id ) );

		return null === $name ? '' : (string) $name;
	}

	/**
	 * Load a resolved service definition, or null when the service does not exist.
	 *
	 * @param int $service_id Service id.
	 */
	public function find( int $service_id ): ?ServiceDefinition {
		$table = $this->wpdb->prefix . 'aponto_services';
		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter -- table name from $wpdb->prefix, not user input.
		$row = $this->wpdb->get_row(
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- table name from $wpdb->prefix, not user input; value is passed to wpdb::prepare.
			$this->wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", $service_id ),
			ARRAY_A
		);

		if ( ! is_array( $row ) ) {
			return null;
		}

		$step    = null !== $row['slot_step_minutes'] ? (int) $row['slot_step_minutes'] : (int) $this->settings->get( 'slot_step_default' );
		$lead    = null !== $row['min_lead_minutes'] ? (int) $row['min_lead_minutes'] : (int) $this->settings->get( 'min_lead_minutes' );
		$horizon = null !== $row['max_horizon_days'] ? (int) $row['max_horizon_days'] : (int) $this->settings->get( 'max_horizon_days' );

		return new ServiceDefinition(
			(int) $row['id'],
			(int) $row['duration_minutes'],
			(int) $row['buffer_before'],
			(int) $row['buffer_after'],
			$step > 0 ? $step : 30,
			max( 1, (int) $row['capacity'] ),
			null !== $row['price_minor'] ? (int) $row['price_minor'] : null,
			max( 0, $lead ),
			max( 1, $horizon ),
			(string) $row['status']
		);
	}
}

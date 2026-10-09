<?php
/**
 * Public read gateway (services catalogue + location).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Rest\Data;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Support\StructuredAddress;

/**
 * Read queries for the public allow-list: the active-service catalogue with categories
 * (rest-contract §3.1) and the location name/address for token + ICS responses. Only active rows
 * and minimal fields are exposed.
 */
final class PublicGateway {

	/**
	 * Identifier allow-list for {@see self::name()}: table slug => interpolatable columns.
	 *
	 * `name()` is the one read on this gateway whose SQL identifiers come from parameters rather
	 * than literals, so the pair is validated against this map and anything else fails closed.
	 * Extend the map deliberately when a new lookup is needed; never widen it at the call site.
	 *
	 * @var array<string, list<string>>
	 */
	private const NAME_COLUMNS = array(
		'aponto_services'           => array( 'name' ),
		'aponto_service_categories' => array( 'name' ),
		'aponto_locations'          => array( 'name' ),
	);

	/**
	 * Construct the gateway.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct( private \wpdb $wpdb ) {}

	/**
	 * Active services with their category id (ordered).
	 *
	 * @return list<array<string, mixed>>
	 */
	public function activeServices(): array {
		$table = $this->wpdb->prefix . 'aponto_services';
		$sql   = "SELECT id, category_id, name, description, duration_minutes, price_minor FROM {$table} WHERE status = 'active' ORDER BY position ASC, id ASC";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; no user input.
		$rows = $this->wpdb->get_results( $sql, ARRAY_A );

		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * Categories with the count of active services each.
	 *
	 * @return list<array<string, mixed>>
	 */
	public function categories(): array {
		$categories = $this->wpdb->prefix . 'aponto_service_categories';
		$services   = $this->wpdb->prefix . 'aponto_services';
		$sql        = "SELECT c.id, c.name, c.position, ( SELECT COUNT(*) FROM {$services} s WHERE s.category_id = c.id AND s.status = 'active' ) AS count FROM {$categories} c ORDER BY c.position ASC, c.id ASC";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; no user input.
		$rows = $this->wpdb->get_results( $sql, ARRAY_A );

		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * Whether a service is active.
	 *
	 * @param int $service_id Service id.
	 */
	public function serviceIsActive( int $service_id ): bool {
		$table = $this->wpdb->prefix . 'aponto_services';
		$sql   = "SELECT COUNT(*) FROM {$table} WHERE id = %d AND status = 'active'";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		return (int) $this->wpdb->get_var( $this->wpdb->prepare( $sql, $service_id ) ) > 0;
	}

	/**
	 * A service's `{id, name, duration_minutes}` (or null).
	 *
	 * @param int $service_id Service id.
	 * @return array{id:int, name:string, duration_minutes:int}|null
	 */
	public function serviceSummary( int $service_id ): ?array {
		$table = $this->wpdb->prefix . 'aponto_services';
		$sql   = "SELECT id, name, duration_minutes FROM {$table} WHERE id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		$row = $this->wpdb->get_row( $this->wpdb->prepare( $sql, $service_id ), ARRAY_A );
		if ( ! is_array( $row ) ) {
			return null;
		}

		return array(
			'id'               => (int) $row['id'],
			'name'             => (string) $row['name'],
			'duration_minutes' => (int) $row['duration_minutes'],
		);
	}

	/**
	 * A location's name + structured address composed as one display string.
	 *
	 * @param int $location_id Location id.
	 * @return array{name:string, address:string}
	 */
	public function location( int $location_id ): array {
		$table = $this->wpdb->prefix . 'aponto_locations';
		$sql   = "SELECT name, address_line1, address_line2, city, region, postal_code, country FROM {$table} WHERE id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		$row = $this->wpdb->get_row( $this->wpdb->prepare( $sql, $location_id ), ARRAY_A );
		if ( ! is_array( $row ) ) {
			return array(
				'name'    => '',
				'address' => '',
			);
		}

		return array(
			'name'    => (string) $row['name'],
			'address' => StructuredAddress::display( $row ),
		);
	}

	/**
	 * A single column value by id.
	 *
	 * Both identifiers are interpolated into the statement (only `$id` can be bound), so the
	 * `$slug`/`$column` pair must appear in {@see self::NAME_COLUMNS} — an unknown pair returns
	 * `''` without touching the database instead of composing SQL from the caller's strings.
	 *
	 * @param string $slug   Table slug (e.g. `aponto_staff`).
	 * @param string $column Column name.
	 * @param int    $id     Row id.
	 */
	public function name( string $slug, string $column, int $id ): string {
		if ( ! in_array( $column, self::NAME_COLUMNS[ $slug ] ?? array(), true ) ) {
			return '';
		}

		$table = $this->wpdb->prefix . $slug;
		$sql   = "SELECT {$column} FROM {$table} WHERE id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Trusted constant slug/column; id bound via prepare().
		return (string) $this->wpdb->get_var( $this->wpdb->prepare( $sql, $id ) );
	}
}

<?php
/**
 * Business timezone resolver (§4.2, §5.4).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Availability;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * Resolves the business timezone for a location. A location may pin its own IANA `timezone`
 * (§4.2); when unset (V1 single-location default) the WordPress site timezone is used. Results are
 * memoised per request so the availability query budget (§5.8) is not charged per `get_slots` call
 * — the lookup happens once during warm-up.
 */
final class BusinessTimezone {

	/**
	 * Memoised zones keyed by location id.
	 *
	 * @var array<int, \DateTimeZone>
	 */
	private array $cache = array();

	/**
	 * Construct the resolver.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct( private \wpdb $wpdb ) {}

	/**
	 * The business timezone for a location.
	 *
	 * @param int $location_id Location id.
	 */
	public function forLocation( int $location_id ): \DateTimeZone {
		if ( isset( $this->cache[ $location_id ] ) ) {
			return $this->cache[ $location_id ];
		}

		$table = $this->wpdb->prefix . 'aponto_locations';
		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- table name from $wpdb->prefix, not user input; value is passed to wpdb::prepare.
		$name = $this->wpdb->get_var( $this->wpdb->prepare( "SELECT timezone FROM {$table} WHERE id = %d", $location_id ) );

		$zone = $this->zoneFrom( is_string( $name ) ? $name : '' );

		$this->cache[ $location_id ] = $zone;

		return $zone;
	}

	/**
	 * Build a timezone from a stored name, falling back to the WordPress site timezone.
	 *
	 * @param string $name Stored IANA name (may be empty).
	 */
	private function zoneFrom( string $name ): \DateTimeZone {
		$name = trim( $name );
		if ( '' !== $name ) {
			try {
				return new \DateTimeZone( $name );
			} catch ( \Exception $e ) {
				unset( $e );
			}
		}

		return function_exists( 'wp_timezone' ) ? wp_timezone() : new \DateTimeZone( 'UTC' );
	}
}

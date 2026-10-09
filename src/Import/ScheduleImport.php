<?php
/**
 * Apply sparse schedule input under the import's staff lock and transaction.
 *
 * @package Aponto
 */

declare(strict_types=1);
namespace Aponto\Import;

use Aponto\Database\StorageException;

/**
 * Replace only supplied weekdays; preserve overrides and all other scopes.
 */
final class ScheduleImport {
	/**
	 * Construct the database boundary.
	 *
	 * @param \wpdb $wpdb Database.
	 */
	public function __construct( private \wpdb $wpdb ) {}
	/**
	 * Import ScheduleImport contract.
	 *
	 * @param int                 $staff Staff.
	 * @param int                 $location Location scope.
	 * @param array<string,mixed> $weekly Parsed days.
	 * @param array<string,mixed> $absences UTC absences.
	 */
	public function write( int $staff, int $location, array $weekly, array $absences ): void {
		foreach ( $weekly as $weekday => $periods ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.NotPrepared -- Validated scoped weekday only, never date overrides.
			$result = $this->wpdb->query( $this->wpdb->prepare( 'DELETE FROM %i WHERE staff_id = %d AND service_id = 0 AND location_id = %d AND weekday = %d AND date_override IS NULL', $this->wpdb->prefix . 'aponto_schedules', $staff, $location, $weekday ) );
			$this->check( $result );
			if ( null === $periods ) {
				continue; // Explicit INHERIT removes this day without creating an OFF marker.
			}
			foreach ( $periods ? $periods : array(
				array(
					'start' => 0,
					'end'   => 0,
				),
			) as $period ) {
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- Validated minutes; transaction owned by importer.
				$this->check(
					$this->wpdb->insert(
						$this->wpdb->prefix . 'aponto_schedules',
						array(
							'staff_id'      => $staff,
							'service_id'    => 0,
							'location_id'   => $location,
							'weekday'       => $weekday,
							'date_override' => null,
							'start_minute'  => $period['start'],
							'end_minute'    => $period['end'],
						),
						array( '%d', '%d', '%d', '%d', '%s', '%d', '%d' )
					)
				);
			}
		}
		foreach ( $absences as $absence ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.NotPrepared -- Exact interval reuse under staff lock.
			$exists = $this->wpdb->get_var( $this->wpdb->prepare( 'SELECT id FROM %i WHERE staff_id = %d AND location_id = %d AND start_datetime_utc = %s AND end_datetime_utc = %s LIMIT 1', $this->wpdb->prefix . 'aponto_blocked_periods', $staff, $location, $absence['start'], $absence['end'] ) );
			$this->check( true );
			if ( null === $exists ) {
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- Same validated shape as blocked-period domain gateway.
				$this->check(
					$this->wpdb->insert(
						$this->wpdb->prefix . 'aponto_blocked_periods',
						array(
							'staff_id'           => $staff,
							'location_id'        => $location,
							'start_datetime_utc' => $absence['start'],
							'end_datetime_utc'   => $absence['end'],
							'reason'             => '',
							'source'             => 'manual',
						),
						array( '%d', '%d', '%s', '%s', '%s', '%s' )
					)
				);
			}
		}
	}
	/**
	 * Import ScheduleImport contract.
	 *
	 * @param mixed $result Database result.
	 * @throws \Aponto\Database\StorageException On failed storage.
	 */
	private function check( mixed $result ): void {
		if ( false === $result || '' !== $this->wpdb->last_error ) {
			throw StorageException::because( 'Import schedule write failed.' );
		}
	}
}

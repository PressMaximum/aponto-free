<?php
/**
 * Import-compatible, bounded CSV reads.
 *
 * @package Aponto
 */

declare(strict_types=1);
namespace Aponto\Export;

use Aponto\Import\CatalogFields;
use Aponto\Import\EntityRegistry;
use Aponto\Import\CsvParser;
use Aponto\Plan;
use Aponto\Rest\Errors;
use Aponto\Support\Clock;
use Aponto\Support\Settings;
use WP_Error;

/** Reads only allowlisted tables and projects the import schema. */
final class CsvExport {
	private const ENTITIES = array( 'customers', 'locations', 'staff', 'services', 'staff_services', 'bookings' );
	/**
	 * Construct reader.
	 *
	 * @param \wpdb $wpdb Database.
	 * @param Clock $clock Clock.
	 */
	public function __construct( private \wpdb $wpdb, private Clock $clock ) {}

	/**
	 * Check permissions.
	 *
	 * @param string $entity Entity.
	 */
	public function authorize( string $entity ): bool|WP_Error {
		if ( ! in_array( $entity, self::ENTITIES, true ) ) {
			return Errors::notFound();
		}
		$caps = match ( $entity ) {
			'customers', 'bookings' => array( 'bookings' ),
			'services', 'staff_services' => array( 'services', 'staff' ),
			'staff' => array( 'staff' ),
			default => array( 'settings' ),
		};
		if ( 'locations' === $entity && ! Plan::instance()->has( 'multi_location' ) ) {
			return Errors::planLimit();
		}
		foreach ( $caps as $cap ) {
			if ( ! current_user_can( 'aponto_manage_' . $cap ) ) {
				return Errors::forbidden();
			}
		}
		return true;
	}

	/**
	 * List choices.
	 *
	 * @return array<string,mixed> Result.
	 */
	public function schema(): array {
		$labels = array(
			'customers'      => __( 'Customers', 'aponto' ),
			'locations'      => __( 'Locations', 'aponto' ),
			'staff'          => __( 'Staff', 'aponto' ),
			'services'       => __( 'Services', 'aponto' ),
			'staff_services' => __( 'Staff–service assignments', 'aponto' ),
			'bookings'       => __( 'Bookings', 'aponto' ),
		);
		$out    = array();
		foreach ( $labels as $key => $label ) {
			if ( true === $this->authorize( $key ) ) {
				$out[] = array(
					'key'   => $key,
					'label' => $label,
				);
			}
		}
		return array( 'entities' => $out );
	}

	/**
	 * Portable source identity.
	 *
	 * @param string $entity Entity.
	 * @param int    $id Source ID.
	 */
	public static function identity( string $entity, int $id ): string {
		return $id > 0 ? 'aponto-' . substr( hash( 'sha256', home_url( '/' ) ), 0, 16 ) . '-' . $entity . '-' . $id : '';
	}

	/**
	 * Read a bounded page.
	 *
	 * @param string $entity Entity.
	 * @param int    $offset Offset.
	 * @return array<string,mixed>|WP_Error Result.
	 * @throws \InvalidArgumentException For unsupported values.
	 */
	public function page( string $entity, int $offset ): array|WP_Error {
		$allowed = $this->authorize( $entity );
		if ( true !== $allowed ) {
			return $allowed;
		}
		try {
			$table = $this->wpdb->prefix . 'aponto_' . $entity;
			$where = '';
			if ( in_array( $entity, array( 'services', 'staff', 'locations' ), true ) ) {
				$where = " WHERE status <> 'archived'";
			} elseif ( 'bookings' === $entity ) {
				$where = $this->wpdb->prepare( " WHERE status IN ('pending','confirmed') AND start_datetime_utc > %s", $this->clock->nowSql() );
			}
			$order = 'staff_services' === $entity ? 'staff_id, service_id, location_id' : 'id';
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Allowlisted clauses; values are prepared.
			$rows    = $this->read( $this->wpdb->prepare( "SELECT * FROM %i{$where} ORDER BY {$order} LIMIT 100 OFFSET %d", $table, $offset ) );
			$headers = array_column( EntityRegistry::fields( $entity )->fields(), 'key' );
			$csv     = 0 === $offset ? "\xEF\xBB\xBF" . self::line( $headers ) : '';
			$count   = 0;
			foreach ( $rows as $row ) {
				foreach ( $this->records( $entity, $row ) as $record ) {
					$cells = array();
					foreach ( $headers as $key ) {
						$value = (string) ( $record[ $key ] ?? '' );
						if ( strlen( $value ) > CsvParser::MAX_CELL_BYTES ) {
							throw new \InvalidArgumentException( 'An exported value exceeds the CSV import cell limit.' );
						}
						$cells[] = $value;
					}
					$csv .= self::line( $cells );
					++$count;
					if ( strlen( $csv ) > 8 * 1048576 || $count > 10000 ) {
						throw new \InvalidArgumentException( 'Too many related values in one export page.' );
					}
				}
			}
			return array(
				'csv'         => $csv,
				'count'       => $count,
				'next_offset' => count( $rows ) === 100 ? $offset + 100 : null,
			);
		} catch ( \InvalidArgumentException $error ) {
			return Errors::validation( array( 'export' => $error->getMessage() ) );
		} catch ( \Throwable $error ) {
			return Errors::internal();
		}
	}

	/**
	 * Encode CSV cells.
	 *
	 * @param list<string> $cells Cells.
	 * @throws \InvalidArgumentException For unsupported values.
	 */
	private static function line( array $cells ): string {
		foreach ( $cells as $cell ) {
			if ( preg_match( '/^[\s]*[=+@-]/', $cell ) && ! preg_match( '/^[+-]?[0-9 ()-]+$/D', $cell ) ) {
				throw new \InvalidArgumentException( 'A CSV value starts with a spreadsheet formula. Remove the formula before export; values are never silently changed.' );
			}
		}
		return implode( ',', array_map( static fn( $cell ) => '"' . str_replace( '"', '""', (string) $cell ) . '"', $cells ) ) . "\r\n";
	}

	/**
	 * Project related records.
	 *
	 * @param string              $entity Entity.
	 * @param array<string,mixed> $row Record.
	 * @return list<array<string,mixed>> Result.
	 * @throws \InvalidArgumentException For unsupported values.
	 */
	public function records( string $entity, array $row ): array {
		$id                 = (int) ( $row['id'] ?? 0 );
		$out                = $row;
		$out['external_id'] = self::identity( $entity, $id );
		$out['target_id']   = '';
		if ( in_array( $entity, array( 'bookings', 'staff_services' ), true ) ) {
			foreach ( array(
				'customer' => 'customers',
				'service'  => 'services',
				'staff'    => 'staff',
				'location' => 'locations',
			) as $key => $type ) {
				$out[ $key . '_external_id' ] = self::identity( $type, (int) ( $row[ $key . '_id' ] ?? 0 ) );
			}
			$out['start_utc'] = isset( $row['start_datetime_utc'] ) ? str_replace( ' ', 'T', $row['start_datetime_utc'] ) . 'Z' : '';
			$out['note']      = $row['customer_note'] ?? '';
			$out['consent']   = empty( $row['consent_at'] ) ? '0' : '1';
			$out['notify']    = '0';
			return array( $out );
		}
		if ( 'services' === $entity ) {
			$category                 = $this->one( 'service_categories', (int) ( $row['category_id'] ?? 0 ) );
			$out['category_name']     = $category['name'] ?? '';
			$out['category_position'] = $category['position'] ?? '';
			$out['currency']          = ( new Settings() )->get( 'currency' );
			$out['service_image_url'] = $this->image( (int) ( $row['image_id'] ?? 0 ) );
			// price_minor is authoritative; leave the optional decimal alias empty.
			$out['service_price'] = '';
			$pairs                = $this->read( $this->wpdb->prepare( 'SELECT * FROM %i WHERE service_id = %d ORDER BY staff_id, location_id LIMIT 10001', $this->wpdb->prefix . 'aponto_staff_services', $id ) );
			if ( count( $pairs ) > 10000 ) {
				throw new \InvalidArgumentException( 'Too many service assignments for CSV import.' );
			}
			$result = array();
			foreach ( $pairs ? $pairs : array(
				array(
					'staff_id'    => 0,
					'location_id' => 0,
				),
			) as $pair ) {
				$record = $out;
				if ( $pair['staff_id'] ) {
					$staff = $this->one( 'staff', (int) $pair['staff_id'] );
					if ( ! $staff || empty( $staff['email'] ) || 'archived' === $staff['status'] ) {
						throw new \InvalidArgumentException( 'A service assignment needs a non-archived staff profile with an email before export.' );
					}
					foreach ( array( 'first_name', 'last_name', 'email', 'phone' ) as $key ) {
						$record[ 'staff_' . $key ] = $staff[ $key ] ?? '';
					}
				}
				$result[] = array_merge( $record, $this->location( (int) $pair['location_id'] ) );
			}
			return $result;
		}
		if ( 'staff' === $entity ) {
			$business = $this->read( $this->wpdb->prepare( 'SELECT * FROM %i WHERE staff_id = 0 ORDER BY weekday, start_minute LIMIT 10001', $this->wpdb->prefix . 'aponto_schedules' ) );
			if ( count( $business ) > 10000 ) {
				throw new \InvalidArgumentException( 'Too many business schedule records for CSV import.' );
			}
			$days = array();
			foreach ( $business as $schedule ) {
				if ( ! empty( $schedule['service_id'] ) || ! empty( $schedule['location_id'] ) || null !== $schedule['date_override'] ) {
					throw new \InvalidArgumentException( 'Staff CSV cannot represent scoped business hours or business date overrides yet.' );
				}
				$day = CatalogFields::DAYS[ (int) $schedule['weekday'] - 1 ] ?? null;
				if ( null === $day ) {
					throw new \InvalidArgumentException( 'A business schedule has an unsupported weekday.' );
				}
				$days[ $day ][] = (int) $schedule['start_minute'] === (int) $schedule['end_minute'] ? 'OFF' : self::minute( (int) $schedule['start_minute'] ) . '-' . self::minute( (int) $schedule['end_minute'] );
			}
			foreach ( CatalogFields::DAYS as $day ) {
				if ( count( $days[ $day ] ?? array() ) > 100 ) {
					throw new \InvalidArgumentException( 'A business schedule cell exceeds the import interval limit.' );
				}
				$out[ 'business_' . $day ] = isset( $days[ $day ] ) ? implode( '|', $days[ $day ] ) : 'INHERIT';
			}
			$out['staff_avatar_url'] = $this->image( (int) ( $row['avatar_id'] ?? 0 ) );
			$user                    = empty( $row['wp_user_id'] ) ? false : get_userdata( (int) $row['wp_user_id'] );
			$out['wp_user_email']    = $user ? $user->user_email : '';
			$schedules               = $this->read( $this->wpdb->prepare( 'SELECT * FROM %i WHERE staff_id = %d ORDER BY location_id, weekday, start_minute LIMIT 10001', $this->wpdb->prefix . 'aponto_schedules', $id ) );
			$blocks                  = $this->read( $this->wpdb->prepare( 'SELECT * FROM %i WHERE staff_id = %d ORDER BY location_id, start_datetime_utc LIMIT 10001', $this->wpdb->prefix . 'aponto_blocked_periods', $id ) );
			if ( count( $schedules ) > 10000 || count( $blocks ) > 10000 ) {
				throw new \InvalidArgumentException( 'Too many schedule records for CSV import.' );
			}
			$scopes = array( 0 => array() );
			foreach ( $schedules as $schedule ) {
				if ( ! empty( $schedule['service_id'] ) || null !== $schedule['date_override'] ) {
					throw new \InvalidArgumentException( 'Staff CSV cannot represent date overrides or service-specific hours yet.' );
				}
				$day = CatalogFields::DAYS[ (int) $schedule['weekday'] - 1 ] ?? null;
				if ( null === $day ) {
					throw new \InvalidArgumentException( 'A schedule has an unsupported weekday.' );
				}
				$scopes[ (int) $schedule['location_id'] ][ $day ][] = (int) $schedule['start_minute'] === (int) $schedule['end_minute'] ? 'OFF' : self::minute( (int) $schedule['start_minute'] ) . '-' . self::minute( (int) $schedule['end_minute'] );
			}
			foreach ( $blocks as $block ) {
				if ( 'manual' !== $block['source'] ) {
					throw new \InvalidArgumentException( 'Calendar-derived blocks cannot be transferred as manual time off.' );
				}
				$scopes[ (int) $block['location_id'] ]['time_off'][] = str_replace( ' ', 'T', $block['start_datetime_utc'] ) . 'Z..' . str_replace( ' ', 'T', $block['end_datetime_utc'] ) . 'Z';
			}
			$result = array();
			foreach ( $scopes as $location => $cells ) {
				$record = array_merge( $out, $this->location( $location ) );
				foreach ( $cells as $key => $values ) {
					if ( count( $values ) > 100 ) {
						throw new \InvalidArgumentException( 'A schedule cell exceeds the import interval limit.' );
					}
					$record[ $key ] = implode( '|', $values );
				}
				$result[] = $record;
			}
			return $result;
		}
		return array( $out );
	}

	/**
	 * Format minutes.
	 *
	 * @param int $minute Minute.
	 */
	private static function minute( int $minute ): string {
		return sprintf( '%02d:%02d', intdiv( $minute, 60 ), $minute % 60 );
	}
	/**
	 * Resolve media URL.
	 *
	 * @param int $id Attachment ID.
	 * @throws \InvalidArgumentException For unsupported values.
	 */
	private function image( int $id ): string {
		if ( ! $id ) {
			return '';
		}
		$url = wp_get_attachment_url( $id );
		if ( ! $url ) {
			throw new \InvalidArgumentException( 'An image attachment is missing. Repair it before export.' );
		}
		return $url;
	}
	/**
	 * Read authorized location.
	 *
	 * @param int $id Location ID.
	 * @return array<string,mixed> Result.
	 * @throws \InvalidArgumentException For unsupported values.
	 */
	private function location( int $id ): array {
		if ( ! $id ) {
			return array( 'location_scope' => 'all' );
		}
		if ( ! Plan::instance()->has( 'multi_location' ) || ! current_user_can( 'aponto_manage_settings' ) ) {
			throw new \InvalidArgumentException( 'Enable Multiple locations and use an account with settings permission to export named location relationships.' );
		}
		$location = $this->one( 'locations', $id );
		if ( ! $location || 'archived' === $location['status'] ) {
			throw new \InvalidArgumentException( 'A related location is missing or archived.' );
		}
		$out = array( 'location_scope' => 'named' );
		foreach ( CatalogFields::LOCATION as $key ) {
			$out[ 'location_' . $key ] = $location[ $key ] ?? '';
		}
		return $out;
	}
	/**
	 * Read related record.
	 *
	 * @param string $entity Internal table.
	 * @param int    $id Record ID.
	 * @return array<string,mixed> Result.
	 */
	private function one( string $entity, int $id ): array {
		if ( ! $id ) {
			return array();
		}
		return $this->read( $this->wpdb->prepare( 'SELECT * FROM %i WHERE id = %d', $this->wpdb->prefix . 'aponto_' . $entity, $id ) )[0] ?? array();
	}
	/**
	 * Run prepared query.
	 *
	 * @param string $sql Prepared SQL.
	 * @return list<array<string,mixed>> Result.
	 * @throws \RuntimeException On read failure.
	 */
	private function read( string $sql ): array {
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Callers prepare every identifier and value.
		$rows = $this->wpdb->get_results( $sql, ARRAY_A );
		if ( '' !== $this->wpdb->last_error ) {
			throw new \RuntimeException( 'Export read failed.' );
		}
		return $rows ?? array();
	}
}

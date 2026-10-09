<?php
/**
 * Synthetic CSV download records keyed by the import schema.
 *
 * @package Aponto
 */

declare(strict_types=1);
namespace Aponto\Import;

/** Populated examples share identities without depending on documentation files. */
final class ExampleCsv {
	/**
	 * Render current schema columns; future optional columns remain blank.
	 *
	 * @param string             $entity Import entity.
	 * @param FieldRegistry|null $fields Optional extended schema.
	 * @return string CSV bytes including UTF-8 BOM.
	 * @throws \InvalidArgumentException If the entity has no example.
	 */
	public static function build( string $entity, ?FieldRegistry $fields = null ): string {
		$examples = self::records();
		if ( ! isset( $examples[ $entity ] ) ) {
			throw new \InvalidArgumentException( 'Unknown import example entity.' );
		}
		$fields  = $fields ?? EntityRegistry::fields( $entity );
		$headers = array_column( $fields->fields(), 'key' );
		$lines   = array( self::line( $headers ) );
		foreach ( $examples[ $entity ] as $record ) {
			$values = array();
			foreach ( $headers as $key ) {
				$values[] = $record[ $key ] ?? '';
			}
			$lines[] = self::line( $values );
		}
		return "\xEF\xBB\xBF" . implode( "\r\n", $lines ) . "\r\n";
	}
	/**
	 * Quote CSV cells, including embedded separators and quotes.
	 *
	 * @param list<string> $values Cells.
	 * @return string CSV record.
	 */
	private static function line( array $values ): string {
		return implode( ',', array_map( static fn( string $value ): string => '"' . str_replace( '"', '""', $value ) . '"', $values ) );
	}
	/**
	 * Define synthetic records with shared source identities.
	 *
	 * @return array<string,list<array<string,string>>> Synthetic records.
	 */
	private static function records(): array {
		$examples = array(
			'customers'      => array(
				array(
					'external_id' => '00015',
					'first_name'  => 'An',
					'last_name'   => 'Nguyễn',
					'email'       => 'an.nguyen@example.com',
					'phone'       => '',
					'note'        => 'Prefers morning appointments',
				),
				array(
					'external_id' => 'CUST-002',
					'first_name'  => 'Ana',
					'last_name'   => 'Silva',
					'email'       => 'ana.silva@example.com',
					'phone'       => '',
					'note'        => '',
				),
				array(
					'external_id' => 'Case-A',
					'first_name'  => 'Sam',
					'last_name'   => 'Lee',
					'email'       => 'sam.lee@example.com',
					'phone'       => '',
					'note'        => '',
				),
				array(
					'external_id' => 'case-a',
					'first_name'  => 'Kim',
					'last_name'   => 'Park',
					'email'       => 'kim.park@example.com',
					'phone'       => '',
					'note'        => '',
				),
			),
			'services'       => array(
				array(
					'external_id'      => 'SERVICE-01',
					'name'             => 'Initial consultation',
					'duration_minutes' => '30',
					'price_minor'      => '0',
					'status'           => 'active',
				),
				array(
					'external_id'      => 'SERVICE-02',
					'name'             => 'Mobility assessment',
					'duration_minutes' => '45',
					'price_minor'      => '4500',
					'status'           => 'active',
					'description'      => 'Movement review, personalised exercises and follow-up guidance.',
				),
				array(
					'external_id'      => 'SERVICE-03',
					'name'             => 'Atelier de relaxation',
					'duration_minutes' => '60',
					'price_minor'      => '6000',
					'status'           => 'active',
					'description'      => 'Séance individuelle de respiration et relaxation.',
				),
			),
			'staff'          => array(
				array(
					'external_id' => 'STAFF-01',
					'first_name'  => 'Jamie',
					'last_name'   => 'Chen',
					'email'       => 'jamie.chen@example.com',
					'title'       => 'Wellbeing practitioner',
					'bio'         => 'Supports clients with practical wellbeing routines.',
					'type'        => 'human',
					'status'      => 'active',
				),
				array(
					'external_id' => 'STAFF-02',
					'first_name'  => 'Linh',
					'last_name'   => 'Trần',
					'email'       => 'linh.tran@example.com',
					'title'       => 'Movement specialist',
					'bio'         => 'Guides mobility assessments and individual exercise plans.',
					'type'        => 'human',
					'status'      => 'active',
				),
				array(
					'external_id' => 'STAFF-03',
					'first_name'  => 'Sofia',
					'last_name'   => 'García',
					'email'       => 'sofia.garcia@example.com',
					'title'       => 'Relaxation instructor',
					'bio'         => 'Teaches breathing and relaxation techniques.',
					'type'        => 'human',
					'status'      => 'active',
				),
			),
			'locations'      => array(
				array(
					'external_id'   => 'LOC-01',
					'name'          => 'Central practice',
					'address_line1' => '1 Example Street',
					'city'          => 'Ho Chi Minh City',
					'country'       => 'VN',
					'timezone'      => 'Asia/Ho_Chi_Minh',
					'status'        => 'active',
				),
				array(
					'external_id'   => 'LOC-02',
					'name'          => 'Riverside practice',
					'address_line1' => '22 Sample Avenue',
					'city'          => 'London',
					'country'       => 'GB',
					'timezone'      => 'Europe/London',
					'status'        => 'active',
				),
				array(
					'external_id'   => 'LOC-03',
					'name'          => 'Studio Lumière',
					'address_line1' => '8 Rue Exemple',
					'city'          => 'Lyon',
					'country'       => 'FR',
					'timezone'      => 'Europe/Paris',
					'status'        => 'active',
				),
			),
			'staff_services' => array(
				array(
					'service_external_id'  => 'SERVICE-01',
					'staff_external_id'    => 'STAFF-01',
					'location_external_id' => '',
				),
				array(
					'service_external_id'  => 'SERVICE-02',
					'staff_external_id'    => 'STAFF-02',
					'location_external_id' => '',
				),
				array(
					'service_external_id'  => 'SERVICE-03',
					'staff_external_id'    => 'STAFF-03',
					'location_external_id' => '',
				),
			),
			'bookings'       => array(
				array(
					'external_id'          => 'BOOK-01',
					'customer_external_id' => '00015',
					'service_external_id'  => 'SERVICE-01',
					'staff_external_id'    => 'STAFF-01',
					'location_external_id' => '',
					'start_utc'            => '2030-01-15T02:00:00Z',
					'customer_timezone'    => 'Asia/Ho_Chi_Minh',
					'status'               => 'confirmed',
					'attendees'            => '1',
					'notify'               => '0',
					'consent'              => '0',
					'note'                 => 'Demo booking at business location',
				),
				array(
					'external_id'          => 'BOOK-02',
					'customer_external_id' => 'CUST-002',
					'service_external_id'  => 'SERVICE-02',
					'staff_external_id'    => 'STAFF-02',
					'location_external_id' => '',
					'start_utc'            => '2030-01-15T03:00:00Z',
					'customer_timezone'    => 'Asia/Ho_Chi_Minh',
					'status'               => 'pending',
					'attendees'            => '1',
					'notify'               => '0',
					'consent'              => '0',
					'note'                 => '',
				),
				array(
					'external_id'          => 'BOOK-03',
					'customer_external_id' => 'Case-A',
					'service_external_id'  => 'SERVICE-03',
					'staff_external_id'    => 'STAFF-03',
					'location_external_id' => '',
					'start_utc'            => '2030-01-15T09:00:00Z',
					'customer_timezone'    => 'Europe/Paris',
					'status'               => 'confirmed',
					'attendees'            => '1',
					'notify'               => '0',
					'consent'              => '0',
					'note'                 => 'Relaxation session; discuss breathing exercises.',
				),
			),
		);
		$defaults = array(
			'customers' => array(
				'phone' => '+12025550101',
				'note'  => 'Prefers appointment updates by email.',
			),
			'services'  => array(
				'description'       => 'One-to-one consultation to review goals and agree next steps.',
				'buffer_before'     => '5',
				'buffer_after'      => '10',
				'slot_step_minutes' => '15',
				'currency'          => 'USD',
				'color'             => '#3858E9',
				'min_lead_minutes'  => '60',
				'max_horizon_days'  => '365',
			),
			'staff'     => array(
				'phone'     => '+12025550111',
				'is_public' => '1',
			),
			'locations' => array(
				'address_line2' => 'Suite 101',
				'region'        => 'Ho Chi Minh City',
				'postal_code'   => '700000',
				'phone'         => '+12025550121',
			),
			'bookings'  => array( 'note' => 'Follow-up appointment to review progress.' ),
		);
		foreach ( $examples as $entity => &$records ) {
			foreach ( $records as $index => &$record ) {
				foreach ( $defaults[ $entity ] ?? array() as $key => $value ) {
					if ( '' === ( $record[ $key ] ?? '' ) ) {
						$record[ $key ] = $value;
					}
				}
				if ( isset( $record['phone'] ) ) {
					$record['phone'] = '+1202555' . sprintf( '%04d', 101 + $index + ( 'staff' === $entity ? 10 : ( 'locations' === $entity ? 20 : 0 ) ) );
				}
				if ( 'locations' === $entity && $index > 0 ) {
					$record['region']        = 1 === $index ? 'Greater London' : 'Auvergne-Rhône-Alpes';
					$record['postal_code']   = 1 === $index ? 'SW1A 1AA' : '69002';
					$record['address_line2'] = 1 === $index ? 'Second floor' : 'Bâtiment B';
				}
			}
			unset( $record );
		}
		unset( $records );
		foreach ( array( 'services', 'staff' ) as $entity ) {
			foreach ( $examples[ $entity ] as $index => &$record ) {
				$record['position']       = (string) $index;
				$record['location_scope'] = 'named';
				foreach ( CatalogFields::LOCATION as $key ) {
					$record[ 'location_' . $key ] = $examples['locations'][ $index ][ $key ] ?? '';
				}
				if ( 'services' === $entity ) {
					$record['category_name']     = 'Wellbeing';
					$record['category_position'] = '0';
					$record['service_price']     = array( '0.00', '45.00', '60.00' )[ $index ];
					$record['service_image_url'] = 'https://s.w.org/style/images/about/WordPress-logotype-wmark.png'; // phpcs:ignore PluginCheck.CodeAnalysis.Offloading.OffloadedContent -- Sample cell of the downloadable example CSV; the plugin loads nothing from it.
					foreach ( array( 'first_name', 'last_name', 'email', 'phone' ) as $key ) {
						$record[ 'staff_' . $key ] = $examples['staff'][ $index ][ $key ];
					}
				} else {
					$record['staff_avatar_url'] = 'https://s.w.org/style/images/about/WordPress-logotype-wmark.png'; // phpcs:ignore PluginCheck.CodeAnalysis.Offloading.OffloadedContent -- Sample cell of the downloadable example CSV; the plugin loads nothing from it.
					foreach ( CatalogFields::DAYS as $day ) {
						$record[ 'business_' . $day ] = in_array( $day, array( 'saturday', 'sunday' ), true ) ? 'INHERIT' : '09:00-17:00';
						$record[ $day ]               = in_array( $day, array( 'saturday', 'sunday' ), true ) ? 'OFF' : '08:00-12:00|13:00-17:00';
					}
					$record['tuesday']  = '08:00-09:00|09:30-10:30|11:00-12:00|13:00-14:00|14:30-15:30|16:00-17:00';
					$record['time_off'] = '2030-12-25|2030-12-31 13:00-17:00';
				}
			}
			unset( $record );
		}
		return $examples;
	}
}

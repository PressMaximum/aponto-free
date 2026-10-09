<?php
/**
 * Import entity schemas and capability ownership.
 *
 * @package Aponto
 */

declare(strict_types=1);
namespace Aponto\Import;

use Aponto\Plan;
use Aponto\Rest\Errors;
use Aponto\Support\Clock;
use WP_Error;

/** One entity catalog drives REST, CLI, adapters and UI choices. */
final class EntityRegistry {
	/**
	 * Runtime adapters.
	 *
	 * @var array<string,ImportAdapter>
	 */
	private array $adapters;
	/**
	 * Build core and separately shipped entity adapters.
	 *
	 * @param \wpdb $wpdb Database.
	 * @param Clock $clock Clock.
	 * @param Store $store Identity/job store.
	 */
	public function __construct( \wpdb $wpdb, Clock $clock, Store $store ) {
		$core           = array(
			'customers'      => new CustomerAdapter( $wpdb, $clock, $store ),
			'services'       => new RelatedCatalogAdapter( $wpdb, $clock, $store, 'services' ),
			'staff'          => new RelatedCatalogAdapter( $wpdb, $clock, $store, 'staff' ),
			'staff_services' => new StaffServiceAdapter( $wpdb, $clock, $store ),
			'bookings'       => new BookingAdapter( $wpdb, $clock, $store ),
		);
		$contributed    = apply_filters( 'aponto_import_adapters', array(), $wpdb, $clock, $store );
		$this->adapters = $core;
		if ( is_array( $contributed ) ) {
			foreach ( $contributed as $key => $adapter ) {
				if ( 'locations' === $key && $adapter instanceof ImportAdapter ) {
					$this->adapters[ $key ] = $adapter;
				}
			}
		}
	}
	/**
	 * Apply entity capabilities and module gates.
	 *
	 * @param string $entity Entity key.
	 * @return true|WP_Error Permission result.
	 */
	public function authorize( string $entity ): bool|WP_Error {
		$caps = array(
			'customers'      => array( 'bookings' ),
			'bookings'       => array( 'bookings' ),
			'services'       => array( 'services' ),
			'staff'          => array( 'staff' ),
			'staff_services' => array( 'staff', 'services' ),
			'locations'      => array( 'settings' ),
		);
		if ( ! isset( $caps[ $entity ], $this->adapters[ $entity ] ) || ! Plan::instance()->has( 'csv_import' ) ) {
			return Errors::notFound();
		}
		if ( 'locations' === $entity && ! Plan::instance()->has( 'multi_location' ) ) {
			return Errors::planLimit();
		}
		foreach ( $caps[ $entity ] as $cap ) {
			if ( ! current_user_can( 'aponto_manage_' . $cap ) ) {
				return Errors::forbidden();
			}
		}
		return true;
	}
	/**
	 * Describe the entities the current user may import.
	 *
	 * @return list<array<string,mixed>> Authorized choices.
	 */
	public function entities(): array {
		$labels       = array(
			'customers'      => __( 'Customers', 'aponto' ),
			'services'       => __( 'Services', 'aponto' ),
			'staff'          => __( 'Staff', 'aponto' ),
			'locations'      => __( 'Locations', 'aponto' ),
			'staff_services' => __( 'Staff–service assignments', 'aponto' ),
			'bookings'       => __( 'Bookings', 'aponto' ),
		);
		$descriptions = array(
			'customers'      => __( 'Contact details. Existing customers are matched by source ID or email.', 'aponto' ),
			'services'       => __( 'Services, categories and staff/location assignments in one file. Staff are matched by email.', 'aponto' ),
			'staff'          => __( 'Staff profiles, weekly work hours and time off. Existing staff are matched by email.', 'aponto' ),
			'locations'      => __( 'Named business locations. Requires Multiple locations.', 'aponto' ),
			'staff_services' => __( 'Link imported staff to services, using source IDs from the same source.', 'aponto' ),
			'bookings'       => __( 'Future bookings referencing previously imported customers, services and staff. Availability is checked again when importing.', 'aponto' ),
		);
		$result       = array();
		foreach ( $labels as $key => $label ) {
			if ( true === $this->authorize( $key ) ) {
				$result[] = array(
					'key'            => $key,
					'label'          => $label,
					'description'    => $descriptions[ $key ],
					'available'      => true,
					'review_message' => 'bookings' === $key
						? __( 'Only valid future bookings are imported. Availability is rechecked. Confirmation messages follow the notify column (off by default); normal reminders and integrations remain active. Payment history is not imported.', 'aponto' )
						: ( in_array( $key, array( 'services', 'staff' ), true )
							? __( 'Only valid rows are imported. Existing profiles change only when an update option is enabled. Supplied staff hours and time off are applied independently of profile updates.', 'aponto' )
							: __( 'Only valid rows are imported. Existing records are kept unchanged.', 'aponto' ) ),
				);
			}
		}
		return $result;
	}
	/**
	 * Select an already authorized domain writer.
	 *
	 * @param string $entity Entity key already authorized by caller.
	 */
	public function adapter( string $entity ): ImportAdapter {
		return $this->adapters[ $entity ];
	}
	/**
	 * Build declarative mapping fields for one entity.
	 *
	 * @param string $entity Entity key.
	 * @throws \InvalidArgumentException For an unknown entity key.
	 */
	public static function fields( string $entity ): FieldRegistry {
		if ( 'customers' === $entity ) {
			return new FieldRegistry();
		}
		$schemas = array(
			'services'       => array(
				array(
					'key'      => 'external_id',
					'label'    => __( 'Source ID', 'aponto' ),
					'type'     => 'external_id',
					'required' => true,
					'aliases'  => array( 'id' ),
				),
				array(
					'key'      => 'target_id',
					'label'    => __( 'Existing Aponto service ID', 'aponto' ),
					'type'     => 'raw',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'name',
					'label'    => __( 'Name', 'aponto' ),
					'type'     => 'text',
					'required' => true,
					'aliases'  => array(),
				),
				array(
					'key'      => 'description',
					'label'    => __( 'Description', 'aponto' ),
					'type'     => 'text',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'duration_minutes',
					'label'    => __( 'Duration (minutes)', 'aponto' ),
					'type'     => 'raw',
					'required' => true,
					'aliases'  => array(),
				),
				array(
					'key'      => 'buffer_before',
					'label'    => __( 'Buffer before (minutes)', 'aponto' ),
					'type'     => 'raw',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'buffer_after',
					'label'    => __( 'Buffer after (minutes)', 'aponto' ),
					'type'     => 'raw',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'slot_step_minutes',
					'label'    => __( 'Slot step (minutes)', 'aponto' ),
					'type'     => 'raw',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'price_minor',
					'label'    => __( 'Price (minor units)', 'aponto' ),
					'type'     => 'raw',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'currency',
					'label'    => __( 'Currency', 'aponto' ),
					'type'     => 'raw',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'color',
					'label'    => __( 'Color', 'aponto' ),
					'type'     => 'raw',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'min_lead_minutes',
					'label'    => __( 'Minimum lead (minutes)', 'aponto' ),
					'type'     => 'raw',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'max_horizon_days',
					'label'    => __( 'Booking horizon (days)', 'aponto' ),
					'type'     => 'raw',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'status',
					'label'    => __( 'Status', 'aponto' ),
					'type'     => 'raw',
					'required' => false,
					'aliases'  => array(),
				),
			),
			'staff'          => array(
				array(
					'key'      => 'external_id',
					'label'    => __( 'Source ID', 'aponto' ),
					'type'     => 'external_id',
					'required' => true,
					'aliases'  => array( 'id' ),
				),
				array(
					'key'      => 'target_id',
					'label'    => __( 'Existing Aponto staff ID', 'aponto' ),
					'type'     => 'raw',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'first_name',
					'label'    => __( 'First name', 'aponto' ),
					'type'     => 'first_name',
					'required' => true,
					'aliases'  => array(),
				),
				array(
					'key'      => 'last_name',
					'label'    => __( 'Last name', 'aponto' ),
					'type'     => 'last_name',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'email',
					'label'    => __( 'Email', 'aponto' ),
					'type'     => 'email',
					'required' => true,
					'aliases'  => array(),
				),
				array(
					'key'      => 'phone',
					'label'    => __( 'Phone', 'aponto' ),
					'type'     => 'phone',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'type',
					'label'    => __( 'Type', 'aponto' ),
					'type'     => 'raw',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'title',
					'label'    => __( 'Job title', 'aponto' ),
					'type'     => 'text',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'bio',
					'label'    => __( 'Biography', 'aponto' ),
					'type'     => 'text',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'is_public',
					'label'    => __( 'Public profile (0 or 1)', 'aponto' ),
					'type'     => 'raw',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'status',
					'label'    => __( 'Status', 'aponto' ),
					'type'     => 'raw',
					'required' => false,
					'aliases'  => array(),
				),
			),
			'staff_services' => array(
				array(
					'key'      => 'staff_external_id',
					'label'    => __( 'Staff source ID', 'aponto' ),
					'type'     => 'external_id',
					'required' => true,
					'aliases'  => array(),
				),
				array(
					'key'      => 'service_external_id',
					'label'    => __( 'Service source ID', 'aponto' ),
					'type'     => 'external_id',
					'required' => true,
					'aliases'  => array(),
				),
				array(
					'key'      => 'location_external_id',
					'label'    => __( 'Location source ID', 'aponto' ),
					'type'     => 'external_id',
					'required' => false,
					'aliases'  => array(),
				),
			),
			'locations'      => array(
				array(
					'key'      => 'external_id',
					'label'    => __( 'Source ID', 'aponto' ),
					'type'     => 'external_id',
					'required' => true,
					'aliases'  => array( 'id' ),
				),
				array(
					'key'      => 'target_id',
					'label'    => __( 'Existing Aponto location ID', 'aponto' ),
					'type'     => 'raw',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'name',
					'label'    => __( 'Name', 'aponto' ),
					'type'     => 'text',
					'required' => true,
					'aliases'  => array(),
				),
				array(
					'key'      => 'address_line1',
					'label'    => __( 'Address line 1', 'aponto' ),
					'type'     => 'text',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'address_line2',
					'label'    => __( 'Address line 2', 'aponto' ),
					'type'     => 'text',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'city',
					'label'    => __( 'City', 'aponto' ),
					'type'     => 'text',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'region',
					'label'    => __( 'Region', 'aponto' ),
					'type'     => 'text',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'postal_code',
					'label'    => __( 'Postal code', 'aponto' ),
					'type'     => 'text',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'country',
					'label'    => __( 'Country code', 'aponto' ),
					'type'     => 'raw',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'phone',
					'label'    => __( 'Phone', 'aponto' ),
					'type'     => 'phone',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'timezone',
					'label'    => __( 'Timezone', 'aponto' ),
					'type'     => 'raw',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'status',
					'label'    => __( 'Status', 'aponto' ),
					'type'     => 'raw',
					'required' => false,
					'aliases'  => array(),
				),
			),
			'bookings'       => array(
				array(
					'key'      => 'external_id',
					'label'    => __( 'Source ID', 'aponto' ),
					'type'     => 'external_id',
					'required' => true,
					'aliases'  => array( 'id' ),
				),
				array(
					'key'      => 'customer_external_id',
					'label'    => __( 'Customer source ID', 'aponto' ),
					'type'     => 'external_id',
					'required' => true,
					'aliases'  => array(),
				),
				array(
					'key'      => 'service_external_id',
					'label'    => __( 'Service source ID', 'aponto' ),
					'type'     => 'external_id',
					'required' => true,
					'aliases'  => array(),
				),
				array(
					'key'      => 'staff_external_id',
					'label'    => __( 'Staff source ID', 'aponto' ),
					'type'     => 'external_id',
					'required' => true,
					'aliases'  => array(),
				),
				array(
					'key'      => 'location_external_id',
					'label'    => __( 'Location source ID', 'aponto' ),
					'type'     => 'external_id',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'start_utc',
					'label'    => __( 'Start (UTC)', 'aponto' ),
					'type'     => 'utc',
					'required' => true,
					'aliases'  => array(),
				),
				array(
					'key'      => 'customer_timezone',
					'label'    => __( 'Customer timezone', 'aponto' ),
					'type'     => 'timezone',
					'required' => true,
					'aliases'  => array(),
				),
				array(
					'key'      => 'status',
					'label'    => __( 'Status', 'aponto' ),
					'type'     => 'booking_status',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'attendees',
					'label'    => __( 'Attendees', 'aponto' ),
					'type'     => 'positive_int',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'consent',
					'label'    => __( 'Consent (0 or 1)', 'aponto' ),
					'type'     => 'boolean',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'notify',
					'label'    => __( 'Send confirmation (0 or 1)', 'aponto' ),
					'type'     => 'boolean',
					'required' => false,
					'aliases'  => array(),
				),
				array(
					'key'      => 'note',
					'label'    => __( 'Note', 'aponto' ),
					'type'     => 'text',
					'required' => false,
					'aliases'  => array(),
				),
			),
		);
		if ( ! isset( $schemas[ $entity ] ) ) {
			throw new \InvalidArgumentException( 'Unknown import entity.' );
		}
		return new FieldRegistry( CatalogFields::expand( $entity, $schemas[ $entity ] ) );
	}
}

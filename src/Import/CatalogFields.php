<?php
/**
 * Related catalog field metadata.
 *
 * @package Aponto
 */

declare(strict_types=1);
namespace Aponto\Import;

/**
 * Additive aliases keep old CSV mappings usable.
 */
final class CatalogFields {
	public const DAYS     = array( 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday' );
	public const LOCATION = array( 'name', 'address_line1', 'address_line2', 'city', 'region', 'postal_code', 'country', 'phone', 'timezone', 'status' );

	/**
	 * Import CatalogFields contract.
	 *
	 * @param string                                                                              $entity Entity.
	 * @param list<array{key:string,label:string,type:string,required:bool,aliases:list<string>}> $fields Existing metadata.
	 * @return list<array{key:string,label:string,type:string,required:bool,aliases:list<string>}> Metadata.
	 */
	public static function expand( string $entity, array $fields ): array {
		if ( ! in_array( $entity, array( 'services', 'staff', 'locations' ), true ) ) {
			return $fields;
		}
		$prefix = array(
			'services'  => 'service_',
			'staff'     => 'staff_',
			'locations' => 'location_',
		)[ $entity ];
		foreach ( $fields as &$field ) {
			if ( 'external_id' === $field['key'] ) {
				$field['required'] = false;
			} elseif ( 'target_id' !== $field['key'] ) {
				$field['aliases'][] = $prefix . $field['key'];
			}
			if ( 'staff' === $entity && 'first_name' === $field['key'] ) {
				$field['required'] = false; // Required on creation, not subsequent location rows.
			}
			if ( 'title' === $field['key'] ) {
				$field['aliases'][] = 'staff_job_title';
			}
			if ( 'bio' === $field['key'] ) {
				$field['aliases'][] = 'staff_short_bio';
			}
		}
		unset( $field );
		$extra = array();
		if ( 'services' === $entity ) {
			$extra = array(
				'category_position' => __( 'Category display order', 'aponto' ),
				'category_name'     => __( 'Category', 'aponto' ),
				'service_image_url' => __( 'Service image URL', 'aponto' ),
				'service_price'     => __( 'Price', 'aponto' ),
				'position'          => __( 'Display order', 'aponto' ),
				'staff_first_name'  => __( 'Staff first name', 'aponto' ),
				'staff_last_name'   => __( 'Staff last name', 'aponto' ),
				'staff_email'       => __( 'Staff email', 'aponto' ),
				'staff_phone'       => __( 'Staff phone', 'aponto' ),
			);
		} elseif ( 'staff' === $entity ) {
			$extra = array(
				'staff_avatar_url' => __( 'Avatar URL', 'aponto' ),
				'position'         => __( 'Display order', 'aponto' ),
				'wp_user_email'    => __( 'WordPress user email', 'aponto' ),
				'time_off'         => __( 'Time off', 'aponto' ),
			);
			foreach ( self::DAYS as $day ) {
				$extra[ $day ]               = ucfirst( $day );
				$extra[ 'business_' . $day ] = 'Business ' . $day;
			}
		}
		if ( 'locations' !== $entity ) {
			$extra['location_scope'] = __( 'Location scope (all or named)', 'aponto' );
			foreach ( self::LOCATION as $key ) {
				$extra[ 'location_' . $key ] = 'Location ' . str_replace( '_', ' ', $key );
			}
		}
		foreach ( $extra as $key => $label ) {
			$fields[] = array(
				'key'      => $key,
				'label'    => $label,
				'type'     => 'raw',
				'required' => false,
				'aliases'  => 'position' === $key ? array( $prefix . $key ) : array(),
			);
		}
		return $fields;
	}
}

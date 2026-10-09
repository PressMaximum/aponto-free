<?php
/**
 * Whole-file catalog conflict groups.
 *
 * @package Aponto
 */

declare(strict_types=1);
namespace Aponto\Import;

/**
 * Relationship columns must not make a repeated service identity contradictory.
 */
final class CatalogGroups {
	/**
	 * Import CatalogGroups contract.
	 *
	 * @param string              $entity Entity.
	 * @param array<string,mixed> $values Row.
	 * @return array<string,array<string,mixed>> Identity groups.
	 */
	public static function forRow( string $entity, array $values ): array {
		if ( ! in_array( $entity, array( 'services', 'staff', 'locations' ), true ) ) {
			return array(); }
		$groups  = array();
		$profile = $values;
		foreach ( array_keys( $profile ) as $key ) {
			if ( str_starts_with( $key, '_' ) || str_starts_with( $key, 'business_' ) || str_starts_with( $key, 'location_' ) || in_array( $key, array_merge( CatalogFields::DAYS, array( 'time_off' ) ), true ) || ( 'services' === $entity && str_starts_with( $key, 'staff_' ) ) ) {
				unset( $profile[ $key ] );
			}
		}
		$identity = match ( $entity ) {
			'staff' => CatalogMatch::key( $values['email'] ?? '' ),
			'services' => CatalogMatch::key( $values['name'] ?? '' ) . '|' . CatalogMatch::key( $values['category_name'] ?? '' ),
			default => CatalogMatch::key( $values['name'] ?? '' ) . '|' . CatalogMatch::key( $values['address_line1'] ?? '' ),
		};
		$groups[ $entity . ':' . $identity ] = $profile;
		if ( ! empty( $values['external_id'] ) ) {
			$groups[ $entity . ':source:' . $values['external_id'] ] = $profile; }
		if ( 'services' === $entity && ! empty( $values['staff_email'] ) ) {
			$groups[ 'staff:' . CatalogMatch::key( $values['staff_email'] ) ] = RelatedCatalogAdapter::block( $values, 'staff_' );
		}
		if ( ! empty( $values['location_name'] ) ) {
			$location = RelatedCatalogAdapter::block( $values, 'location_' );
			$groups[ 'locations:' . CatalogMatch::key( $values['location_name'] ) . '|' . CatalogMatch::key( $values['location_address_line1'] ?? '' ) ] = $location;
		}
		if ( 'staff' === $entity ) {
			$groups[ 'schedule:' . $identity . ':' . CatalogMatch::key( $values['location_name'] ?? $values['location_scope'] ?? '' ) . ':' . CatalogMatch::key( $values['location_address_line1'] ?? '' ) ] = array_intersect_key( $values, array_flip( CatalogFields::DAYS ) );
		}
		if ( 'staff' === $entity ) {
			$groups['business-hours'] = array_intersect_key( $values, array_flip( array_map( static fn( $day ) => 'business_' . $day, CatalogFields::DAYS ) ) );
		}
		if ( 'services' === $entity && ! empty( $values['category_name'] ) ) {
			$groups[ 'category:' . CatalogMatch::key( $values['category_name'] ) ] = array_intersect_key( $values, array_flip( array( 'category_name', 'category_position' ) ) );
		}
		$out = array();
		foreach ( $groups as $key => $data ) {
			unset( $data['external_id'] );
			$out[ 'catalog:' . hash( 'sha256', $key ) ] = array_filter( $data, static fn( $v ) => '' !== trim( (string) $v ) );
		}
		return $out;
	}
	/**
	 * Import CatalogGroups contract.
	 *
	 * @param array<string,mixed>|null $previous Stored group.
	 * @param array<string,mixed>      $values Current fields.
	 * @return array<string,mixed> Merged group with sticky conflict.
	 */
	public static function merge( ?array $previous, array $values ): array {
		$out = $previous ?? array(
			'values'   => array(),
			'conflict' => false,
		);
		foreach ( $values as $key => $value ) {
			if ( isset( $out['values'][ $key ] ) && self::comparison( $key, (string) $out['values'][ $key ] ) !== self::comparison( $key, (string) $value ) ) {
				$out['conflict'] = true; }
			$out['values'][ $key ] = $value;
		}
		return $out;
	}
	/**
	 * Fill repeated Staff contact fields from the full-file definition.
	 *
	 * @param string              $entity Entity.
	 * @param array<string,mixed> $values Row values.
	 * @param callable            $read Read one stored conflict group.
	 * @return array<string,mixed> Enriched row.
	 */
	public static function completeStaff( string $entity, array $values, callable $read ): array {
		$prefix = 'services' === $entity ? 'staff_' : '';
		if ( ! in_array( $entity, array( 'services', 'staff' ), true ) || empty( $values[ $prefix . 'email' ] ) ) {
			return $values; }
		$key   = 'catalog:' . hash( 'sha256', 'staff:' . CatalogMatch::key( $values[ $prefix . 'email' ] ) );
		$group = $read( $key );
		if ( ! $group || $group['conflict'] ) {
			return $values; }
		foreach ( ( 'services' === $entity ? array( 'first_name', 'last_name', 'phone' ) : array( 'first_name', 'last_name', 'phone', 'title', 'bio', 'is_public', 'status', 'type', 'position', 'staff_avatar_url', 'wp_user_email' ) ) as $field ) {
			if ( empty( $values[ $prefix . $field ] ) && ! empty( $group['values'][ $field ] ) ) {
				$values[ $prefix . $field ] = $group['values'][ $field ]; }
		}
		return $values;
	}
	/**
	 * Normalize identity text only; URLs and other attributes remain case-sensitive.
	 *
	 * @param string $key Field.
	 * @param string $value Input.
	 */
	private static function comparison( string $key, string $value ): string {
		return in_array( $key, array( 'email', 'name', 'first_name', 'last_name', 'category_name' ), true ) ? CatalogMatch::key( $value ) : trim( $value );
	}
}

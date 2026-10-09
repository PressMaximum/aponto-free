<?php
/**
 * Business-field identity resolution.
 *
 * @package Aponto
 */

declare(strict_types=1);
namespace Aponto\Import;

use Aponto\Database\StorageException;

/**
 * Exact normalized matching; ambiguity never chooses the first row.
 */
final class CatalogMatch {
	/**
	 * Construct the database boundary.
	 *
	 * @param \wpdb $wpdb Database.
	 */
	public function __construct( private \wpdb $wpdb ) {}
	/**
	 * Import CatalogMatch contract.
	 *
	 * @param string $value Business field.
	 * @return string Comparison key.
	 */
	public static function key( string $value ): string {
		if ( class_exists( '\Normalizer' ) ) {
			$normalized = \Normalizer::normalize( $value );
			$value      = false === $normalized ? $value : $normalized;
		}
		return mb_strtolower( trim( preg_replace( '/\s+/u', ' ', $value ) ?? $value ) );
	}
	/**
	 * Import CatalogMatch contract.
	 *
	 * @param string              $entity Allowlisted table.
	 * @param array<string,mixed> $fields Identity fields.
	 * @return list<array<string,mixed>> Matching rows.
	 * @throws \InvalidArgumentException On invalid input.
	 * @throws \Aponto\Database\StorageException On failed storage.
	 */
	public function candidates( string $entity, array $fields ): array {
		if ( ! in_array( $entity, array( 'staff', 'services', 'locations', 'service_categories' ), true ) ) {
			throw new \InvalidArgumentException( 'Unknown catalog.' );
		}
		$cursor = 0;
		$out    = array();
		do {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.NotPrepared -- Allowlisted identifier; bounded keyset scan keeps normalization identical across database engines.
			$rows = $this->wpdb->get_results( $this->wpdb->prepare( 'SELECT * FROM %i WHERE id > %d ORDER BY id ASC LIMIT 250', $this->wpdb->prefix . 'aponto_' . $entity, $cursor ), ARRAY_A );
			if ( '' !== $this->wpdb->last_error ) {
				throw StorageException::because( 'Catalog matching failed.' );
			}
			$rows = is_array( $rows ) ? $rows : array();
			foreach ( $rows as $row ) {
				$cursor = (int) $row['id'];
				$match  = true;
				foreach ( $fields as $key => $value ) {
					if ( self::key( (string) ( $row[ $key ] ?? '' ) ) !== self::key( (string) $value ) ) {
						$match = false;
						break;
					}
				}
				if ( $match ) {
					$out[] = $row;
					if ( count( $out ) >= 2 ) {
						return $out; // Only uniqueness is needed.
					}
				}
			}
			$row_count = count( $rows );
		} while ( 250 === $row_count );
		return $out;
	}
	/**
	 * Import CatalogMatch contract.
	 *
	 * @param string              $entity Entity.
	 * @param array<string,mixed> $fields Identity.
	 * @return array<string,mixed>|null Unique row.
	 * @throws \InvalidArgumentException On invalid input.
	 */
	public function one( string $entity, array $fields ): ?array {
		$rows = $this->candidates( $entity, $fields );
		if ( count( $rows ) > 1 ) {
			throw new \InvalidArgumentException( 'More than one record matches. Add identifying information or resolve the duplicate records before importing.' );
		}
		return $rows[0] ?? null;
	}
	/**
	 * Import CatalogMatch contract.
	 *
	 * @param array<string,mixed> $values Unprefixed location fields.
	 * @return array<string,mixed>|null Unique row.
	 * @throws \InvalidArgumentException On invalid input.
	 */
	public function location( array $values ): ?array {
		$identity = array_filter( array_intersect_key( $values, array_flip( array( 'name', 'address_line1', 'address_line2', 'city', 'region', 'postal_code', 'country' ) ) ), static fn( $v ) => '' !== trim( (string) $v ) );
		if ( ! isset( $identity['name'] ) && ( empty( $identity['address_line1'] ) || ( empty( $identity['city'] ) && empty( $identity['postal_code'] ) ) || empty( $identity['country'] ) ) ) {
			throw new \InvalidArgumentException( 'Provide a location name or street, city/postal code and country.' );
		}
		$exact = $this->one( 'locations', $identity );
		if ( null !== $exact ) {
			if ( 'archived' === $exact['status'] ) {
				throw new \InvalidArgumentException( 'This location is archived. Review it before importing.' );
			}
			return $exact;
		}
		if ( isset( $identity['name'] ) && $this->candidates( 'locations', array( 'name' => $identity['name'] ) ) ) {
			throw new \InvalidArgumentException( 'Location name matches but address differs. Resolve the location details before importing.' );
		}
		unset( $identity['name'] );
		if ( ! empty( $identity['address_line1'] ) && $this->candidates( 'locations', $identity ) ) {
			throw new \InvalidArgumentException( 'Location address matches another name. Resolve the location details before importing.' );
		}
		return null;
	}
}

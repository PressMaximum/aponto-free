<?php
/**
 * Declarative import fields and column mapping (docs/import-css/PLAN.md).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Import;

use Aponto\Rest\RequestValidator;
use InvalidArgumentException;
use WP_Error;

/** One schema drives mapping, normalization and the template. */
final class FieldRegistry {
	/**
	 * Field descriptors.
	 *
	 * @var list<array{key:string,label:string,type:string,required:bool,aliases:list<string>}>
	 */
	private array $definitions;

	/**
	 * Construct a schema; null selects the customer schema.
	 *
	 * @param list<array{key:string,label:string,type:string,required:bool,aliases:list<string>}>|null $definitions Schema.
	 * @throws InvalidArgumentException On duplicate keys or unsupported types.
	 */
	public function __construct( ?array $definitions = null ) {
		$this->definitions = $definitions ?? array(
			array(
				'key'      => 'external_id',
				'label'    => __( 'Source ID', 'aponto' ),
				'type'     => 'external_id',
				'required' => false,
				'aliases'  => array( 'id', 'customer_id', 'client_id' ),
			),
			array(
				'key'      => 'first_name',
				'label'    => __( 'First name', 'aponto' ),
				'type'     => 'first_name',
				'required' => true,
				'aliases'  => array( 'first name', 'given_name' ),
			),
			array(
				'key'      => 'last_name',
				'label'    => __( 'Last name', 'aponto' ),
				'type'     => 'last_name',
				'required' => true,
				'aliases'  => array( 'last name', 'surname', 'family_name' ),
			),
			array(
				'key'      => 'email',
				'label'    => __( 'Email', 'aponto' ),
				'type'     => 'email',
				'required' => true,
				'aliases'  => array( 'e-mail', 'customer_email', 'email address' ),
			),
			array(
				'key'      => 'phone',
				'label'    => __( 'Phone', 'aponto' ),
				'type'     => 'phone',
				'required' => false,
				'aliases'  => array( 'telephone', 'phone_number' ),
			),
			array(
				'key'      => 'note',
				'label'    => __( 'Note', 'aponto' ),
				'type'     => 'text',
				'required' => false,
				'aliases'  => array( 'notes' ),
			),
		);
		$seen              = array();
		foreach ( $this->definitions as $definition ) {
			if ( ! preg_match( '/^[a-z][a-z0-9_.]*$/', $definition['key'] ) || isset( $seen[ $definition['key'] ] ) || ! in_array( $definition['type'], array( 'external_id', 'first_name', 'last_name', 'email', 'phone', 'text', 'raw', 'utc', 'timezone', 'positive_int', 'boolean', 'booking_status' ), true ) ) {
				throw new InvalidArgumentException( 'Import fields require unique stable keys and supported types.' );
			}
			$seen[ $definition['key'] ] = true;
		}
	}

	/**
	 * Public field metadata.
	 *
	 * @return list<array{key:string,label:string,type:string,required:bool,aliases:list<string>}>
	 */
	public function fields(): array {
		return $this->definitions;
	}

	/**
	 * Suggest only unambiguous one-to-one mappings. Unknown columns require an explicit choice.
	 *
	 * @param list<string> $headers CSV headers.
	 * @return array<string,string>
	 */
	public function suggest( array $headers ): array {
		$candidates = array();
		foreach ( $headers as $header ) {
			$matches = array();
			foreach ( $this->definitions as $definition ) {
				$aliases = array_merge( array( $definition['key'] ), $definition['aliases'] );
				if ( in_array( strtolower( $header ), array_map( 'strtolower', $aliases ), true ) ) {
					$matches[] = $definition['key'];
				}
			}
			if ( 1 === count( $matches ) ) {
				$candidates[ $header ] = $matches[0];
			}
		}
		$counts = array_count_values( $candidates );
		return array_filter( $candidates, static fn( string $key ): bool => 1 === $counts[ $key ] );
	}

	/**
	 * Require an explicit disposition for every input column.
	 *
	 * @param list<string>        $headers CSV headers.
	 * @param array<string,mixed> $mapping Header to field; empty string means ignored.
	 * @return WP_Error|null
	 */
	public function validateMapping( array $headers, array $mapping ): ?WP_Error {
		$validator = new RequestValidator();
		$known     = array_column( $this->definitions, 'key' );
		$targets   = array();
		foreach ( $mapping as $header => $target ) {
			if ( ! in_array( (string) $header, $headers, true ) || ! is_string( $target ) || ( '' !== $target && ! in_array( $target, $known, true ) ) ) {
				$validator->fail( 'mapping', __( 'The column mapping contains an unknown header or field.', 'aponto' ) );
				continue;
			}
			if ( '' !== $target ) {
				if ( isset( $targets[ $target ] ) ) {
					$validator->fail( 'mapping', __( 'Map each field only once.', 'aponto' ) );
				}
				$targets[ $target ] = true;
			}
		}
		foreach ( $headers as $header ) {
			if ( ! array_key_exists( $header, $mapping ) ) {
				$validator->fail( 'mapping', __( 'Map or explicitly ignore every column.', 'aponto' ) );
			}
		}
		foreach ( $this->definitions as $definition ) {
			if ( $definition['required'] && ! isset( $targets[ $definition['key'] ] ) ) {
				$validator->fail( $definition['key'], __( 'Map this required field.', 'aponto' ) );
			}
		}
		return $validator->failed() ? $this->error( $validator ) : null;
	}

	/**
	 * Normalize a mapped row through the existing customer validators.
	 *
	 * @param list<string>        $headers CSV headers.
	 * @param list<string>        $cells CSV row.
	 * @param array<string,mixed> $mapping Header to field key.
	 * @return array<string,string>|WP_Error
	 */
	public function normalize( array $headers, array $cells, array $mapping ): array|WP_Error {
		$error = $this->validateMapping( $headers, $mapping );
		if ( null !== $error ) {
			return $error;
		}
		$validator = new RequestValidator();
		if ( count( $headers ) !== count( $cells ) ) {
			$validator->fail( 'row', __( 'The row does not match the header.', 'aponto' ) );
			return $this->error( $validator );
		}
		$raw = array();
		foreach ( $headers as $index => $header ) {
			$key = $mapping[ $header ];
			if ( is_string( $key ) && '' !== $key ) {
				$raw[ $key ] = $cells[ $index ];
			}
		}
		$result = array();
		foreach ( $this->definitions as $definition ) {
			$key = $definition['key'];
			if ( ! array_key_exists( $key, $raw ) ) {
				continue;
			}
			$value = $raw[ $key ];
			if ( ! $definition['required'] && '' === trim( $value ) && in_array( $definition['type'], array( 'raw', 'utc', 'timezone', 'positive_int', 'boolean', 'booking_status' ), true ) ) {
				continue;
			}
			if ( 'utc' === $definition['type'] ) {
				$date = \DateTimeImmutable::createFromFormat( '!Y-m-d\TH:i:s\Z', $value, new \DateTimeZone( 'UTC' ) );
				if ( false === $date || $date->format( 'Y-m-d\TH:i:s\Z' ) !== $value ) {
					$validator->fail( $key, __( 'Use a valid UTC timestamp such as 2030-01-15T02:00:00Z.', 'aponto' ) ); }
			}
			if ( 'timezone' === $definition['type'] && ! in_array( $value, \DateTimeZone::listIdentifiers( \DateTimeZone::ALL_WITH_BC ), true ) ) {
				$validator->fail( $key, __( 'Use an IANA timezone such as Asia/Ho_Chi_Minh.', 'aponto' ) ); }
			if ( 'positive_int' === $definition['type'] && ( ! preg_match( '/^[1-9][0-9]{0,4}$/', $value ) || (int) $value > 65535 ) ) {
				$validator->fail( $key, __( 'Use a whole number from 1 to 65535.', 'aponto' ) ); }
			if ( 'boolean' === $definition['type'] && ! in_array( $value, array( '0', '1' ), true ) ) {
				$validator->fail( $key, __( 'Use 0 or 1.', 'aponto' ) ); }
			if ( 'booking_status' === $definition['type'] && ! in_array( $value, array( 'pending', 'confirmed' ), true ) ) {
				$validator->fail( $key, __( 'Import future bookings as pending or confirmed.', 'aponto' ) ); }
			if ( 'external_id' === $definition['type'] ) {
				if ( mb_strlen( $value ) > 191 || preg_match( '/[\x00-\x1f\x7f]/', $value ) ) {
					$validator->fail( $key, __( 'Source IDs must have at most 191 characters and no control characters.', 'aponto' ) );
				}
				$result[ $key ] = $value;
			} else {
				$result[ $key ] = match ( $definition['type'] ) {
					'first_name' => $validator->namePart( $key, $value, 'first', $definition['required'] ),
					'last_name' => $validator->namePart( $key, $value, 'last', $definition['required'] ),
					'email' => '' === $value && ! $definition['required'] ? '' : $validator->email( $key, $value ),
					'phone' => $validator->phone( $key, $value ),
					'raw', 'utc', 'timezone', 'positive_int', 'boolean', 'booking_status' => trim( $value ),
					default => $validator->text( $value ),
				};
			}
			if ( $definition['required'] && '' === trim( $result[ $key ] ) ) {
				$validator->fail( $key, __( 'This field is required.', 'aponto' ) );
			}
		}
		return $validator->failed() ? $this->error( $validator ) : $result;
	}

	/** Generate a header-only template from stable field keys. */
	public function template(): string {
		return implode( ',', array_column( $this->definitions, 'key' ) ) . "\r\n";
	}

	/**
	 * Build the existing REST validation error without echoing CSV content.
	 *
	 * @param RequestValidator $validator Accumulated validation.
	 */
	private function error( RequestValidator $validator ): WP_Error {
		return new WP_Error(
			'aponto_validation',
			__( 'Review the import fields.', 'aponto' ),
			array(
				'status' => 422,
				'fields' => $validator->errors(),
			)
		);
	}
}

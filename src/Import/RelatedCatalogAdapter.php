<?php
/**
 * Combined service relationships and complete Staff CSV.
 *
 * @package Aponto
 */

declare(strict_types=1);
namespace Aponto\Import;

use Aponto\Booking\StaffLockFactory;
use Aponto\Booking\Repository\ConnectionRepository;
use Aponto\Database\StorageException;
use Aponto\Plan;
use Aponto\Rest\Data\CategoryGateway;
use Aponto\Rest\Data\StaffGateway;
use Aponto\Rest\Data\ServiceGateway;
use Aponto\Rest\Errors;
use Aponto\Support\Settings;

/**
 * Import transactions own domain writes; media is prepared before taking domain locks.
 */
final class RelatedCatalogAdapter extends CatalogAdapter {
	/**
	 * Import RelatedCatalogAdapter contract.
	 *
	 * @var list<int>|null Identities whose domain locks were requested.
	 */
	private ?array $locked_targets = null;
	/**
	 * Import RelatedCatalogAdapter contract.
	 *
	 * @param array<string,mixed> $plan Resolved plan.
	 * @return list<int> IDs in domain order.
	 */
	private function targets( array $plan ): array {
		return array( (int) ( $plan['row']['id'] ?? 0 ), (int) ( $plan['staff']['id'] ?? 0 ), (int) ( $plan['location']['id'] ?? 0 ) );
	}
	/**
	 * Import RelatedCatalogAdapter contract.
	 *
	 * @param array<string,mixed> $values Row.
	 * @return array<string,mixed> Validated normalized values.
	 */
	private function amounts( array $values ): array {
		if ( 'services' !== $this->entity || ( empty( $values['service_price'] ) && '0' !== ( $values['service_price'] ?? '' ) ) ) {
			return $values;
		}
		$currency              = strtoupper( $values['currency'] ?? ( new Settings() )->get( 'currency' ) );
		$precision             = Settings::currencyExponent( $currency );
		$values['price_minor'] = self::minor( $values['service_price'], $precision, $values['price_minor'] ?? '' );
		return $values;
	}
	/**
	 * Import RelatedCatalogAdapter contract.
	 *
	 * @param string $amount Decimal amount.
	 * @param int    $precision Currency precision.
	 * @param string $minor Existing minor input.
	 * @return string Exact integer.
	 * @throws \InvalidArgumentException On invalid input.
	 */
	public static function minor( string $amount, int $precision, string $minor = '' ): string {
		if ( ! preg_match( '/^(0|[1-9][0-9]{0,9})(?:\.([0-9]+))?$/', $amount, $matches ) || strlen( $matches[2] ?? '' ) > $precision ) {
			throw new \InvalidArgumentException( 'Use a non-negative price with the currency decimal precision.' );
		}
		$result = ltrim( $matches[1] . str_pad( $matches[2] ?? '', $precision, '0' ), '0' );
		$result = '' === $result ? '0' : $result;
		if ( (int) $result > \Aponto\Rest\Args::MAX_PRICE_MINOR || ( '' !== $minor && ( ! ctype_digit( $minor ) || (int) $minor !== (int) $result ) ) ) {
			throw new \InvalidArgumentException( 'Price exceeds the allowed range or conflicts with price_minor.' );
		}
		return $result;
	}
	/**
	 * Import RelatedCatalogAdapter contract.
	 *
	 * @param array<string,mixed> $values Row.
	 * @return array<string,mixed>|\WP_Error Data.
	 */
	public function data( array $values ): array|\WP_Error {
		try {
			return parent::data( $this->amounts( $values ) );
		} catch ( \InvalidArgumentException $error ) {
			return Errors::validation( array( 'service_price' => $error->getMessage() ) );
		}
	}
	/**
	 * Import RelatedCatalogAdapter contract.
	 *
	 * @param array<string,mixed> $values Row.
	 * @param string              $prefix Prefix.
	 * @return array<string,mixed> Extracted block.
	 */
	public static function block( array $values, string $prefix ): array {
		$out = array();
		foreach ( $values as $key => $value ) {
			if ( str_starts_with( $key, $prefix ) && '' !== trim( (string) $value ) ) {
				$out[ substr( $key, strlen( $prefix ) ) ] = $value;
			}
		}
		return $out;
	}
	/**
	 * Import RelatedCatalogAdapter contract.
	 *
	 * @return ImportAdapter Premium-contributed writer; never reference a Premium class here.
	 * @throws \InvalidArgumentException On invalid input.
	 */
	private function locations(): ImportAdapter {
		$registry = new EntityRegistry( $this->wpdb, $this->clock, $this->store );
		if ( true !== $registry->authorize( 'locations' ) ) {
			throw new \InvalidArgumentException( 'Named locations require Multiple locations and permission to manage settings.' );
		}
		return $registry->adapter( 'locations' );
	}
	/**
	 * Resolve all identities and validate before writes.
	 *
	 * @param string              $source Source.
	 * @param array<string,mixed> $values Row.
	 * @return array<string,mixed> Plan.
	 * @throws \InvalidArgumentException On invalid input.
	 */
	private function plan( string $source, array $values ): array {
		$match    = new CatalogMatch( $this->wpdb );
		$category = null;
		if ( isset( $values['category_position'] ) && '' !== $values['category_position'] && ( ! ctype_digit( (string) $values['category_position'] ) || (float) $values['category_position'] > 4294967295 ) ) {
			throw new \InvalidArgumentException( 'Category display order must be an unsigned integer.' );
		}
		if ( 'services' === $this->entity && ! empty( $values['category_name'] ) ) {
			if ( mb_strlen( $values['category_name'] ) > 191 ) {
				throw new \InvalidArgumentException( 'Category name must have at most 191 characters.' );
			}
			$category = $match->one( 'service_categories', array( 'name' => $values['category_name'] ) );
		}
		$target   = null;
		$external = $values['external_id'] ?? '';
		$explicit = $values['target_id'] ?? '';
		if ( '' !== $external ) {
			$target = $this->store->resolve( $source, $this->entity, $external );
		}
		if ( '' !== $explicit ) {
			if ( ! ctype_digit( $explicit ) || (int) $explicit < 1 || strlen( $explicit ) > 18 || ( null !== $target && $target !== (int) $explicit ) ) {
				throw new \InvalidArgumentException( 'Existing target is invalid or conflicts with the source mapping.' );
			}
			$target = (int) $explicit;
		}
		$row = null === $target ? null : $this->find( $target );
		if ( null !== $target && null === $row ) {
			throw new \InvalidArgumentException( 'The linked record no longer exists.' );
		}
		if ( null === $row ) {
			if ( 'staff' === $this->entity ) {
				$row = $match->one( 'staff', array( 'email' => $values['email'] ?? '' ) );
			} elseif ( empty( $values['category_name'] ) || null !== $category ) {
				$identity = array( 'name' => $values['name'] ?? '' );
				if ( null !== $category ) {
					$identity['category_id'] = (string) $category['id'];
				}
				$row = $match->one( 'services', $identity );
			}
		}
		$validation = $values;
		if ( 'staff' === $this->entity && empty( $validation['first_name'] ) && null !== $row ) {
			$validation['first_name'] = $row['first_name'];
		}
		$data = $this->data( $validation );
		if ( is_wp_error( $data ) ) {
			return array( 'error' => $data );
		}
		if ( null !== $row && '' === $explicit && ( 'archived' === ( $row['status'] ?? '' ) ) ) {
			throw new \InvalidArgumentException( 'The matching record is archived. Review it before importing.' );
		}
		$staff        = null;
		$staff_values = 'services' === $this->entity ? self::block( $values, 'staff_' ) : array();
		if ( $staff_values ) {
			if ( ! current_user_can( 'aponto_manage_staff' ) ) {
				throw new \InvalidArgumentException( 'You need permission to manage staff.' );
			}
			$staff      = $match->one( 'staff', array( 'email' => $staff_values['email'] ?? '' ) );
			$staff_data = $staff_values;
			if ( $staff && empty( $staff_data['first_name'] ) ) {
				$staff_data['first_name'] = $staff['first_name'];
			}
			$checked = ( new CatalogAdapter( $this->wpdb, $this->clock, $this->store, 'staff' ) )->data( $staff_data );
			if ( is_wp_error( $checked ) ) {
				return array( 'error' => $checked );
			}
			if ( $staff && 'archived' === $staff['status'] ) {
				throw new \InvalidArgumentException( 'The matching staff profile is archived.' );
			}
		}
		$location_values = array_intersect_key( self::block( $values, 'location_' ), array_flip( CatalogFields::LOCATION ) );
		$has_schedule    = false;
		foreach ( array_merge( CatalogFields::DAYS, array( 'time_off' ) ) as $key ) {
			$has_schedule = $has_schedule || ! empty( $values[ $key ] );
		}
		$scope = $values['location_scope'] ?? '';
		if ( ! in_array( $scope, array( '', 'all', 'named' ), true ) || ( 'all' === $scope && $location_values ) || ( 'named' === $scope && ! $location_values ) ) {
			throw new \InvalidArgumentException( 'Choose location_scope=all without location details, or supply a named location.' );
		}
		$location = null;
		if ( $location_values ) {
			$this->locations();
			$location = $match->location( $location_values );
			if ( ! $location ) {
				$location_preview = $this->locations()->preview( $source, $location_values );
				if ( 'error' === $location_preview['status'] ) {
					throw new \InvalidArgumentException( 'Provide valid full location details to create the location.' );
				}
			}
			if ( 'services' === $this->entity && ! $staff_values ) {
				throw new \InvalidArgumentException( 'A service location needs a staff email to define the assignment.' );
			}
		} elseif ( ( $staff_values || $has_schedule ) && Plan::instance()->has( 'multi_location' ) && 'all' !== $scope ) {
			throw new \InvalidArgumentException( 'Supply a location or explicitly set location_scope to all.' );
		}
		if ( $row && $staff_values && ! Plan::instance()->has( 'multi_staff' ) ) {
			foreach ( ( new ConnectionRepository( $this->wpdb ) )->eligibilityForService( (int) $row['id'] ) as $pair ) {
				if ( (int) ( $staff['id'] ?? 0 ) !== $pair['staff_id'] ) {
					throw new \InvalidArgumentException( 'Enable Multiple staff before adding another staff member to this service.' );
				}
			}
		}
		$timezone = $location['timezone'] ?? $location_values['timezone'] ?? ( empty( $values['time_off'] ) ? 'UTC' : wp_timezone_string() );
		$timezone = $timezone ? $timezone : wp_timezone_string();
		$weekly   = array();
		foreach ( CatalogFields::DAYS as $index => $day ) {
			if ( ! empty( $values[ $day ] ) ) {
				$weekly[ $index + 1 ] = ScheduleCells::day( $values[ $day ] );
			}
		}
		$business_weekly = array();
		if ( 'staff' === $this->entity ) {
			foreach ( CatalogFields::DAYS as $index => $day ) {
				$cell = trim( (string) ( $values[ 'business_' . $day ] ?? '' ) );
				if ( '' !== $cell ) {
					if ( ! current_user_can( 'aponto_manage_settings' ) ) {
						throw new \InvalidArgumentException( 'Managing business hours requires permission to manage settings.' );
					}
					$business_weekly[ $index + 1 ] = 'INHERIT' === strtoupper( $cell ) ? null : ScheduleCells::day( $cell );
				}
			}
		}
		$time_off  = empty( $values['time_off'] ) ? array() : ScheduleCells::timeOff( $values['time_off'], $timezone );
		$image_key = 'staff' === $this->entity ? 'staff_avatar_url' : 'service_image_url';
		if ( ! empty( $values[ $image_key ] ) ) {
			$media_error = ImportMedia::validate( $values[ $image_key ] );
			if ( null !== $media_error ) {
				throw new \InvalidArgumentException( esc_html( $media_error ) );
			}
		}
		if ( ! empty( $values['wp_user_email'] ) ) {
			$user = get_user_by( 'email', $values['wp_user_email'] );
			if ( ! $user || ! current_user_can( 'edit_user', $user->ID ) ) {
				throw new \InvalidArgumentException( 'Choose an existing WordPress user you may edit.' );
			}
			$data['wp_user_id'] = (int) $user->ID;
		}
		$this->assertRead();
		return compact( 'row', 'data', 'category', 'staff', 'staff_values', 'location', 'location_values', 'weekly', 'time_off', 'business_weekly' );
	}
	/**
	 * Import RelatedCatalogAdapter contract.
	 *
	 * @param string              $source Source.
	 * @param array<string,mixed> $values Row.
	 * @return array<string,mixed> Preview.
	 */
	public function preview( string $source, array $values ): array {
		try {
			$plan = $this->plan( $source, $values );
			if ( isset( $plan['error'] ) ) {
				return array(
					'status' => 'error',
					'errors' => $plan['error']->get_error_data()['fields'],
				);
			}
			$references = array(
				'staff'    => (int) ( $plan['staff']['id'] ?? 0 ),
				'location' => (int) ( $plan['location']['id'] ?? 0 ),
			);
			foreach ( $references as $kind => $target ) {
				if ( ! empty( $values[ '_preview_' . $kind ] ) && (int) $values[ '_preview_' . $kind ] !== $target ) {
					return $this->error( '_', __( 'A related record changed after preview. Check the file again.', 'aponto' ) );
				}
			}
			return array_merge(
				array( 'references' => $references ),
				$plan['row'] ? array(
					'status'    => 'reuse',
					'target_id' => (int) $plan['row']['id'],
				) : array( 'status' => 'create' )
			);
		} catch ( \InvalidArgumentException $error ) {
			return $this->error( '_', $error->getMessage() );
		}
	}
	/**
	 * Prepare media outside transactions and domain locks.
	 *
	 * @param string              $source Source.
	 * @param array<string,mixed> $values Row.
	 * @return array<string,mixed> Row or error.
	 */
	public function prepareMedia( string $source, array $values ): array {
		$preview = $this->preview( $source, $values );
		if ( 'error' === $preview['status'] ) {
			return $preview;
		}
		$key = 'staff' === $this->entity ? 'staff_avatar_url' : 'service_image_url';
		if ( ! empty( $values[ $key ] ) && ( 'create' === $preview['status'] || '1' === ( $values[ '_update_' . $this->entity ] ?? '' ) ) ) {
			$id = ( new ImportMedia() )->import( $values[ $key ] );
			if ( is_wp_error( $id ) ) {
				return $this->error( $key, (string) ( $id->get_error_data()['fields']['image'] ?? $id->get_error_message() ) );
			}
			$values['_attachment_id'] = (string) $id;
		}
		return array( 'values' => $values );
	}
	/**
	 * Import RelatedCatalogAdapter contract.
	 *
	 * @param string              $source Source.
	 * @param array<string,mixed> $values Row.
	 * @return list<\Aponto\Database\Lock> Locks.
	 */
	public function locks( string $source, array $values ): array {
		try {
			$plan = $this->plan( $source, $values );
			if ( isset( $plan['error'] ) ) {
				return array();
			}
			$this->locked_targets = $this->targets( $plan );
			$factory              = new StaffLockFactory( $this->wpdb );
			$locks                = array();
			$staff_id             = 'staff' === $this->entity ? (int) ( $plan['row']['id'] ?? 0 ) : (int) ( $plan['staff']['id'] ?? 0 );
			if ( $staff_id ) {
				$locks[] = $factory->forStaff( $staff_id ); }
			if ( $plan['location'] ) {
				$locks[] = $factory->forLocation( (int) $plan['location']['id'] ); }
			if ( 'services' === $this->entity && $plan['row'] ) {
				$locks[] = $factory->forService( (int) $plan['row']['id'] ); }
			return $locks;
		} catch ( \InvalidArgumentException $error ) {
			return array();
		}
	}
	/**
	 * Import RelatedCatalogAdapter contract.
	 *
	 * @param string              $source Source.
	 * @param array<string,mixed> $values Row.
	 * @param int|null            $expected_target Preview target.
	 * @return array<string,mixed> Outcome.
	 * @throws \Aponto\Database\StorageException On failed storage.
	 */
	public function write( string $source, array $values, ?int $expected_target = null ): array {
		$result = $this->preview( $source, $values );
		if ( 'error' === $result['status'] ) {
			return $result; }
		if ( null !== $expected_target && ( $result['target_id'] ?? null ) !== $expected_target ) {
			return $this->error( '_', __( 'The target changed after preview. Check the file again.', 'aponto' ) );
		}
		$plan = $this->plan( $source, $values );
		if ( null !== $this->locked_targets && $this->locked_targets !== $this->targets( $plan ) ) {
			return $this->error( '_', __( 'Related records changed. Check the file again.', 'aponto' ) );
		}
		$data      = $plan['data'];
		$events    = array();
		$created   = ! $plan['row'];
		$update    = '1' === ( $values[ '_update_' . $this->entity ] ?? '' );
		$image_key = 'staff' === $this->entity ? 'staff_avatar_url' : 'service_image_url';
		if ( ! empty( $values[ $image_key ] ) && ( $created || $update ) && empty( $values['_attachment_id'] ) ) {
			return $this->error( $image_key, __( 'Import the image into the Media Library before assigning it.', 'aponto' ) );
		}
		if ( isset( $values['_attachment_id'] ) ) {
			$data[ 'staff' === $this->entity ? 'avatar_id' : 'image_id' ] = (int) $values['_attachment_id'];
		}
		if ( 'services' === $this->entity && ! empty( $values['category_name'] ) && ( $created || $update ) ) {
			$category_id = (int) ( $plan['category']['id'] ?? 0 );
			if ( ! $category_id ) {
				$category_id = ( new CategoryGateway( $this->wpdb ) )->create(
					array(
						'name'     => $values['category_name'],
						'position' => (int) ( $values['category_position'] ?? 0 ),
					)
				);
				$this->assertRead();
			}
			if ( $plan['category'] && $update && isset( $values['category_position'] ) && '' !== $values['category_position'] ) {
				( new CategoryGateway( $this->wpdb ) )->update( $category_id, array( 'position' => (int) $values['category_position'] ) );
				$this->assertRead();
			}
			$data['category_id'] = $category_id;
		}
		if ( $created ) {
			$id = $this->create( $data );
			$this->assertRead();
			if ( $id < 1 ) {
				throw StorageException::because( 'Catalog insert failed.' ); }
			$events = $this->events( $this->find( $id ) );
		} else {
			$id = (int) $plan['row']['id'];
			if ( $update ) {
				$patch = array_filter( $data, static fn( $value, $key ) => isset( $values[ $key ] ) && '' !== $values[ $key ], ARRAY_FILTER_USE_BOTH );
				foreach ( array(
					'avatar_id'   => 'staff_avatar_url',
					'image_id'    => 'service_image_url',
					'category_id' => 'category_name',
					'price_minor' => 'service_price',
					'wp_user_id'  => 'wp_user_email',
				) as $key => $input ) {
					if ( ! empty( $values[ $input ] ) && isset( $data[ $key ] ) ) {
						$patch[ $key ] = $data[ $key ]; }
				}
				$gateway = 'staff' === $this->entity ? new StaffGateway( $this->wpdb, $this->clock ) : new ServiceGateway( $this->wpdb, $this->clock );
				$gateway->update( $id, $patch );
				$events[] = array(
					'hook' => 'aponto_' . ( 'staff' === $this->entity ? 'staff' : 'service' ) . '_updated',
					'args' => 'staff' === $this->entity ? array( \Aponto\Support\PersonName::withDisplayName( $this->find( $id ) ), \Aponto\Support\PersonName::withDisplayName( $plan['row'] ) ) : array( $this->find( $id ), $plan['row'] ),
				);
			}
		}
		if ( ! empty( $values['external_id'] ) ) {
			$this->store->bind( $source, $this->entity, $values['external_id'], $id ); }
		$location_id = (int) ( $plan['location']['id'] ?? 0 );
		if ( $plan['location_values'] && ! $location_id ) {
			$outcome = $this->locations()->write( $source, $plan['location_values'] );
			if ( 'error' === $outcome['status'] ) {
				throw StorageException::because( 'Location changed during import.' ); }
			$location_id = $outcome['target_id'];
			$events      = array_merge( $events, $outcome['events'] ?? array() );
		}
		if ( 'services' === $this->entity && $plan['staff_values'] ) {
			$staff_values                  = $plan['staff_values'];
			$staff_values['_update_staff'] = $values['_update_staff'] ?? '0';
			$staff_target                  = isset( $plan['staff']['id'] ) ? (int) $plan['staff']['id'] : null;
			$staff_outcome                 = ( new self( $this->wpdb, $this->clock, $this->store, 'staff' ) )->write( $source, $staff_values, $staff_target );
			if ( 'error' === $staff_outcome['status'] ) {
				throw StorageException::because( 'Staff changed during import.' ); }
			$events = array_merge( $events, $staff_outcome['events'] ?? array() );
			$repo   = new ConnectionRepository( $this->wpdb );
			$before = $repo->eligibilityForService( $id );
			if ( $repo->addForImport( $id, $staff_outcome['target_id'], $location_id ) ) {
				$events[] = array(
					'hook' => 'aponto_service_eligibility_changed',
					'args' => array(
						array(
							'service_id'  => $id,
							'assignments' => $repo->eligibilityForService( $id ),
						),
						array(
							'service_id'  => $id,
							'assignments' => $before,
						),
					),
				);
			}
		}
		if ( 'staff' === $this->entity ) {
			( new ScheduleImport( $this->wpdb ) )->write( 0, 0, $plan['business_weekly'], array() );
			( new ScheduleImport( $this->wpdb ) )->write( $id, $location_id, $plan['weekly'], $plan['time_off'] );
		}
		$this->assertRead();
		return array(
			'status'    => $created ? 'created' : 'reused',
			'target_id' => $id,
			'events'    => $events,
		);
	}
}

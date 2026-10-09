<?php
/**
 * Future bookings imported through the ordinary reservation write model.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Import;

use Aponto\Booking\Booking;
use Aponto\Booking\BookingDraft;
use Aponto\Booking\CustomerInput;
use Aponto\Database\StorageException;
use Aponto\Rest\Services;
use Aponto\Rest\RequestValidator;
use Aponto\Support\Clock;
use Aponto\Support\DomainException;
use Aponto\Support\Settings;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- All identifiers and values are prepared; authoritative import lookups cannot be cached.
/** The reservation owns its transaction; the caller must not open an ambient transaction. */
final class BookingAdapter implements ImportAdapter {
	/**
	 * Construct adapter.
	 *
	 * @param \wpdb $wpdb Database.
	 * @param Clock $clock Clock.
	 * @param Store $store Source identity map.
	 */
	public function __construct( private \wpdb $wpdb, private Clock $clock, private Store $store ) {}

	/**
	 * The reservation write model acquires its own staff/location/service locks.
	 *
	 * @param string               $source Source UUID.
	 * @param array<string,string> $values Normalized values.
	 * @return list<\Aponto\Database\Lock> Locks.
	 */
	public function locks( string $source, array $values ): array {
		return array();
	}

	/**
	 * Resolve every foreign reference through this source namespace, never local numeric IDs.
	 *
	 * @param string               $source Source UUID.
	 * @param array<string,string> $values Normalized values.
	 * @return array<string,mixed> Outcome.
	 */
	public function preview( string $source, array $values ): array {
		$invalid = $this->validateValues( $values );
		if ( array() !== $invalid ) {
			return array(
				'status' => 'error',
				'errors' => $invalid,
			);
		}
		$resolved = $this->references( $source, $values );
		if ( isset( $resolved['errors'] ) ) {
			return $resolved;
		}
		$mapped = $this->store->resolve( $source, 'bookings', $values['external_id'] );
		if ( null !== $mapped ) {
			$row = $this->row( 'bookings', $mapped );
			if ( null === $row ) {
				return $this->error( 'external_id', __( 'The mapped booking no longer exists. This source ID will not create a replacement.', 'aponto' ) );
			}
			foreach ( array( 'customer_id', 'service_id', 'staff_id', 'location_id' ) as $key ) {
				if ( (int) $row[ $key ] !== $resolved[ $key ] ) {
					return $this->error( 'external_id', __( 'This source ID belongs to a booking with different references. It will not be updated.', 'aponto' ) );
				}
			}
			if ( (string) $row['start_datetime_utc'] !== $this->start( $values )->format( 'Y-m-d H:i:s' ) ) {
				return $this->error( 'external_id', __( 'This source ID belongs to a booking at a different time. It will not be rescheduled.', 'aponto' ) );
			}
			return array(
				'status'    => 'reuse',
				'target_id' => $mapped,
			);
		}
		if ( $this->start( $values ) <= $this->clock->now() ) {
			return $this->error( 'start_utc', __( 'Only future appointments can be imported. Historical bookings and payments are not imported.', 'aponto' ) );
		}
		$services = new Services( $this->wpdb, new Settings(), $this->clock );
		if ( ! $services->engine()->is_slot_free( $this->draft( $values, $resolved ) ) ) {
			return $this->error( 'start_utc', __( 'This appointment is outside availability or the slot is already full.', 'aponto' ) );
		}
		return array( 'status' => 'create' );
	}

	/**
	 * Reserve atomically with the source binding; return effects to run after the import lock.
	 *
	 * @param string               $source Source UUID.
	 * @param array<string,string> $values Normalized values.
	 * @param int|null             $expected_target Booking identity approved in preview.
	 * @param string|null          $privacy_epoch Preview privacy revision.
	 * @return array<string,mixed> Outcome and request-local post_commit effects (never persist them).
	 */
	public function write( string $source, array $values, ?int $expected_target = null, ?string $privacy_epoch = null ): array {
		$preview = $this->preview( $source, $values );
		if ( 'error' === $preview['status'] ) {
			return $preview;
		}
		if ( null !== $expected_target && ( $preview['target_id'] ?? null ) !== $expected_target ) {
			return $this->error( 'external_id', __( 'The booking matched during preview has changed. Create a new preview.', 'aponto' ) );
		}
		if ( 'reuse' === $preview['status'] ) {
			return array(
				'status'    => 'reused',
				'target_id' => $preview['target_id'],
			);
		}
		$resolved = $this->references( $source, $values );
		if ( isset( $resolved['errors'] ) ) {
			return $resolved;
		}
		$services = new Services( $this->wpdb, new Settings(), $this->clock );
		$reserve  = $services->reservationService();
		$effects  = array();
		$reserve->setPostCommitDispatch(
			static function ( callable $effect ) use ( &$effects ): void {
				$effects[] = $effect;
			}
		);
		$reserve->setCustomerResolver(
			function () use ( $source, $values, $resolved, $privacy_epoch ): int {
				$epoch = $this->store->privacyEpoch( true );
				if ( null !== $privacy_epoch && $epoch !== $privacy_epoch ) {
						throw StorageException::because( 'Import preview invalidated by privacy erasure.' );
				}
				$fresh = $this->references( $source, $values, true );
				if ( isset( $fresh['errors'] ) || $fresh['customer_id'] !== $resolved['customer_id'] ) {
					throw StorageException::because( 'Import booking customer identity changed.' );
				}
				foreach ( array( 'service_id', 'staff_id', 'location_id' ) as $key ) {
					if ( $fresh[ $key ] !== $resolved[ $key ] ) {
						throw StorageException::because( 'Import booking reference changed.' );
					}
				}
				if ( null !== $this->store->resolve( $source, 'bookings', $values['external_id'] ) ) {
					throw StorageException::because( 'Import booking identity was already bound.' );
				}
				if ( $this->start( $values ) <= $this->clock->now() ) {
					throw StorageException::because( 'Import appointment is no longer in the future.' );
				}
				return $fresh['customer_id'];
			}
		);
		$reserve->addOnPersist(
			function ( Booking $booking ) use ( $source, $values ): void {
				$this->store->bind( $source, 'bookings', $values['external_id'], $booking->id );
			}
		);
		$suppress = static fn (): string => 'suppress';
		$notify   = ( $values['notify'] ?? '0' ) === '1';
		if ( ! $notify ) {
			add_filter( 'aponto_notification_policy', $suppress );
		}
		try {
			$result = $reserve->reserve( $this->draft( $values, $resolved ) );
		} catch ( DomainException $exception ) {
			return $this->error( 'start_utc', __( 'The appointment could not be reserved. Recheck its availability and try a new preview.', 'aponto' ) );
		} finally {
			if ( ! $notify ) {
				remove_filter( 'aponto_notification_policy', $suppress );
			}
		}
		$effects[] = static function () use ( $services, $result ): void {
			$services->notificationDispatcher()->flushBooking( $result->booking->id );
		};
		return array(
			'status'      => 'created',
			'target_id'   => $result->booking->id,
			'post_commit' => $effects,
		);
	}

	/**
	 * Defense in depth for non-REST callers; never rely on PHP date coercion or enum casts.
	 *
	 * @param array<string,string> $values Values.
	 * @return array<string,string> Authored field errors.
	 */
	private function validateValues( array $values ): array {
		$validator = new RequestValidator();
		foreach ( array( 'external_id', 'customer_external_id', 'service_external_id', 'staff_external_id' ) as $key ) {
			if ( '' === trim( $values[ $key ] ?? '' ) ) {
				$validator->fail( $key, __( 'This source ID is required.', 'aponto' ) );
			}
		}
		$validator->utc( 'start_utc', $values['start_utc'] ?? null );
		$validator->timezone( 'customer_timezone', $values['customer_timezone'] ?? null );
		if ( ! in_array( $values['status'] ?? '', array( '', 'pending', 'confirmed' ), true ) ) {
			$validator->fail( 'status', __( 'Choose pending or confirmed.', 'aponto' ) );
		}
		$validator->intInRange( 'attendees', '' === ( $values['attendees'] ?? '' ) ? '1' : $values['attendees'], 1, 65535 );
		foreach ( array( 'notify', 'consent' ) as $key ) {
			if ( ! in_array( $values[ $key ] ?? '', array( '', '0', '1' ), true ) ) {
				$validator->fail( $key, __( 'Use 0 or 1.', 'aponto' ) );
			}
		}
		return $validator->errors();
	}

	/**
	 * Read references and their current rows.
	 *
	 * @param string               $source Source UUID.
	 * @param array<string,string> $values Values.
	 * @param bool                 $lock Lock the existing customer during the reservation transaction.
	 * @return array<string,mixed> Resolved IDs/customer or row error.
	 */
	private function references( string $source, array $values, bool $lock = false ): array {
		$out = array();
		foreach ( array(
			'customer' => 'customers',
			'service'  => 'services',
			'staff'    => 'staff',
			'location' => 'locations',
		) as $singular => $entity ) {
			$field    = $singular . '_external_id';
			$external = $values[ $field ] ?? '';
			if ( 'location' === $singular && '' === $external ) {
				$out['location_id'] = 0;
				continue;
			}
			$id  = '' === $external ? null : $this->store->resolve( $source, $entity, $external );
			$row = null === $id ? null : $this->row( $entity, $id, $lock && 'customer' === $singular );
			if ( null === $row ) {
				return $this->error( $field, __( 'Import this referenced record first, using the same import source and exact source ID.', 'aponto' ) );
			}
			if ( in_array( $singular, array( 'service', 'staff' ), true ) && 'active' !== $row['status'] ) {
				return $this->error( $field, __( 'The referenced record is not active.', 'aponto' ) );
			}
			$out[ $singular . '_id' ] = $id;
			if ( 'customer' === $singular ) {
				$out['customer'] = $row;
			}
		}
		return $out;
	}

	/**
	 * Fetch a known entity table; table names never come from request input.
	 *
	 * @param string $entity Known entity.
	 * @param int    $id Local ID.
	 * @param bool   $lock Whether to pin the row.
	 * @return array<string,mixed>|null Row.
	 * @throws StorageException On lookup errors.
	 */
	private function row( string $entity, int $id, bool $lock = false ): ?array {
		$sql = $this->wpdb->prepare( 'SELECT * FROM %i WHERE id = %d', $this->wpdb->prefix . 'aponto_' . $entity, $id );
		if ( $lock ) {
			$sql .= ' FOR UPDATE';
		}
		$row = $this->wpdb->get_row( $sql, ARRAY_A );
		if ( '' !== $this->wpdb->last_error ) {
			// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Internal SQL failure, never rendered.
			throw StorageException::fromWpdb( $this->wpdb, 'import booking reference lookup' );
		}
		return is_array( $row ) ? $row : null;
	}

	/**
	 * UTC input has already passed the registry's strict timestamp validator.
	 *
	 * @param array<string,string> $values Values.
	 */
	private function start( array $values ): \DateTimeImmutable {
		return ( new \DateTimeImmutable( $values['start_utc'], new \DateTimeZone( 'UTC' ) ) )->setTimezone( new \DateTimeZone( 'UTC' ) );
	}

	/**
	 * Build the ordinary admin booking draft. No gateway/coupon/payment snapshot is reconstructed.
	 *
	 * @param array<string,string> $values Values.
	 * @param array<string,mixed>  $resolved Local references.
	 */
	private function draft( array $values, array $resolved ): BookingDraft {
		$customer  = $resolved['customer'];
		$validator = new RequestValidator();
		return new BookingDraft(
			$resolved['service_id'],
			$resolved['staff_id'],
			$resolved['location_id'],
			$this->start( $values ),
			new CustomerInput( $customer['first_name'], $customer['last_name'], $customer['email'], $customer['phone'], $values['note'] ?? '' ),
			$validator->timezone( 'customer_timezone', $values['customer_timezone'] ),
			( $values['consent'] ?? '0' ) === '1',
			null,
			'',
			(int) ( '' === ( $values['attendees'] ?? '' ) ? '1' : $values['attendees'] ),
			'admin',
			'' === ( $values['status'] ?? '' ) ? 'pending' : $values['status']
		);
	}

	/**
	 * Build an authored row error.
	 *
	 * @param string $field Field.
	 * @param string $message Message.
	 * @return array<string,mixed> Outcome.
	 */
	private function error( string $field, string $message ): array {
		return array(
			'status' => 'error',
			'errors' => array( $field => $message ),
		);
	}
}

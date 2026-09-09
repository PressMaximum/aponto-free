<?php
/**
 * Stored reference to a remote calendar event (extension-surface §5.1, §5.2).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Integration;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * The remote identity core persists for a booking under `integration.{key}.remote_event`
 * (extension-surface §5.2), handed back to the driver on every update and delete.
 *
 * `etag` carries whatever optimistic-concurrency token the provider issues, so an update can refuse
 * to overwrite a version it has not seen. `sequence` is the booking's own `ics_sequence` at the time
 * of the last successful push — it is what makes the idempotency key
 * `{key}:{booking_id}:{ics_sequence}:{verb}` change when, and only when, the appointment moved.
 */
final class RemoteEventRef {

	/**
	 * Construct the ref.
	 *
	 * @param string $remote_id Provider-side event id.
	 * @param string $etag      Provider concurrency token (empty when the provider issues none).
	 * @param string $verb      Last verb applied: `push`, `update` or `delete`.
	 * @param int    $sequence  Booking `ics_sequence` at the last successful write.
	 */
	public function __construct(
		public readonly string $remote_id,
		public readonly string $etag = '',
		public readonly string $verb = '',
		public readonly int $sequence = 0
	) {}

	/**
	 * Rebuild from the stored JSON shape, or null when it is not a usable reference.
	 *
	 * @param array<string, mixed> $stored Decoded metadata payload.
	 */
	public static function fromArray( array $stored ): ?self {
		$id = isset( $stored['id'] ) && is_string( $stored['id'] ) ? $stored['id'] : '';
		if ( '' === $id ) {
			return null;
		}

		return new self(
			$id,
			isset( $stored['etag'] ) && is_string( $stored['etag'] ) ? $stored['etag'] : '',
			isset( $stored['verb'] ) && is_string( $stored['verb'] ) ? $stored['verb'] : '',
			isset( $stored['sequence'] ) ? (int) $stored['sequence'] : 0
		);
	}

	/**
	 * The stored JSON shape.
	 *
	 * @return array{id: string, etag: string, verb: string, sequence: int}
	 */
	public function toArray(): array {
		return array(
			'id'       => $this->remote_id,
			'etag'     => $this->etag,
			'verb'     => $this->verb,
			'sequence' => $this->sequence,
		);
	}
}

<?php
/**
 * Activity log writer (§4.2).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Booking\Repository;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Support\Clock;

/**
 * Appends rows to `aponto_activities` (§4.2) inside the reservation/transition transaction, so the
 * audit trail commits atomically with the change it records. `meta` is stored as JSON; PII is not
 * logged here (only ids, statuses and actor/reason).
 */
final class ActivityRepository {

	/**
	 * Construct the repository.
	 *
	 * @param \wpdb $wpdb  Database handle.
	 * @param Clock $clock Clock.
	 */
	public function __construct(
		private \wpdb $wpdb,
		private Clock $clock
	) {}

	/**
	 * Append an activity row; returns its id.
	 *
	 * The audit trail commits atomically with the change it records, so a failed insert must
	 * abort the whole transaction (E4) — a booking without its audit row is a partial state.
	 *
	 * @param string               $entity_type Entity type (e.g. `booking`).
	 * @param int                  $entity_id   Entity id.
	 * @param string               $action      Action verb (e.g. `created`).
	 * @param array<string, mixed> $meta        JSON-serialisable metadata (no PII).
	 * @param string               $initiated_by Actor descriptor (e.g. `public`, `admin:5`, `system`).
	 * @throws \Aponto\Database\StorageException When the insert fails.
	 */
	public function log( string $entity_type, int $entity_id, string $action, array $meta, string $initiated_by ): int {
		$result = $this->wpdb->insert(
			$this->wpdb->prefix . 'aponto_activities',
			array(
				'entity_type'  => $entity_type,
				'entity_id'    => $entity_id,
				'action'       => $action,
				'meta'         => (string) wp_json_encode( $meta ),
				'initiated_by' => $initiated_by,
				'created_at'   => $this->clock->nowSql(),
			),
			array( '%s', '%d', '%s', '%s', '%s', '%s' )
		);

		if ( false === $result ) {
				throw \Aponto\Database\StorageException::fromSqlError( esc_html( 'activity insert' ), esc_html( (string) $this->wpdb->last_error ) );
		}

		return (int) $this->wpdb->insert_id;
	}
}

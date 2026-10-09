<?php
/**
 * The one location wire serializer (rest-contract §2.17).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Rest\Support;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * Serializes a `aponto_locations` row for every location response, core and module alike.
 *
 * TWO controllers answer with a location DTO: core's read-only `GET /locations[/{id}]`
 * ({@see \Aponto\Rest\Controller\LocationsController}) and the separately distributed module's
 * `POST`/`PATCH /locations` (D-R43). Until D-R56 each held its own private `toDto()`, which is two
 * places to add a field to and one place to forget — the admin list would have shown `staff_count`
 * while the response to the save that produced the row would not. This is the single serializer
 * both call, so they cannot drift.
 *
 * It lives in CORE (§5 invariant 2): the module may call into core, never the reverse, and nothing
 * here names a module, an edition, or any class outside core.
 */
final class LocationDto {

	/**
	 * Serialize one location row with its admin counts.
	 *
	 * `staff_count` / `service_count` are ADDITIVE (D-R56, rest-contract §2.17) and are supplied
	 * by the caller rather than read here, because they are answered in BULK for a whole page by
	 * {@see \Aponto\Booking\Repository\ConnectionRepository::countsForLocations()} — a serializer
	 * that queried per row would be the N+1 that reader exists to avoid.
	 *
	 * @param array<string, mixed>                          $row    Location row (the columns
	 *                                                              `LocationGateway` selects).
	 * @param array{staff_count?: int, service_count?: int} $counts Connection counts for this row;
	 *                                                              an absent key answers `0`, which
	 *                                                              is what a location with no
	 *                                                              connection rows genuinely has.
	 * @return array<string, mixed>
	 */
	public static function fromRow( array $row, array $counts = array() ): array {
		return array(
			'id'            => (int) $row['id'],
			'name'          => (string) $row['name'],
			'address_line1' => (string) $row['address_line1'],
			'address_line2' => (string) $row['address_line2'],
			'city'          => (string) $row['city'],
			'region'        => (string) $row['region'],
			'postal_code'   => (string) $row['postal_code'],
			'country'       => (string) $row['country'],
			'phone'         => (string) $row['phone'],
			'timezone'      => Format::stringOrNull( $row['timezone'] ),
			'status'        => (string) $row['status'],
			'staff_count'   => (int) ( $counts['staff_count'] ?? 0 ),
			'service_count' => (int) ( $counts['service_count'] ?? 0 ),
		);
	}
}

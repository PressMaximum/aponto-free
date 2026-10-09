<?php
/**
 * The one-page intro's host / team line, resolved at render time (D-R85).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Frontend;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Booking\Repository\ConnectionRepository;
use Aponto\Plan;
use Aponto\Rest\Data\PublicGateway;
use Aponto\Rest\Support\LocationResolution;
use Aponto\Rest\Support\PublicStaffProfile;
use Aponto\Support\Settings;

/**
 * Who the visitor will meet, for a block in the one-page layout (D-R85).
 *
 * Resolved SERVER-SIDE into the block's `data-props` (no new REST route), from the SAME reader
 * and the SAME serializer the public roster uses:
 *
 *  - eligibility is {@see ConnectionRepository::rosterForActiveServices()} — active staff,
 *    `is_public = 1`, connected to the ACTIVE service at the location the booking route would
 *    resolve ({@see LocationResolution::forService()}: an invalid or archived preset names
 *    nobody; the D-R61 union while the visitor will choose), in `(position, id)` order;
 *  - `total` counts PUBLIC people only (it drives the "+N"); hidden staff the any-staff path may
 *    still assign set a boolean `others` and are never named or counted — the line then ends "or
 *    another team member" and no published number reveals how many hidden colleagues exist
 *    (review fix round 2). Assignment has no edition gate (`ReservationService::reserveAnyStaff()`
 *    → `staffForService()`), so a Free site holding two staff rows really does book either, and
 *    its line says so;
 *  - every published field goes through {@see PublicStaffProfile::entry()}: names composed by
 *    `PersonName`, avatars through `StaffAvatar` (network-free, D-R51), the `booking.staff_titles`
 *    and `booking.staff_photos` switches honoured in BOTH editions (defaults on; a site downgraded
 *    with photos off keeps them off), `bio` never, no email, phone or staff id;
 *  - a GRAVATAR URL (which carries core's hash of the staff email) only where the operator has
 *    the switch that removes it — `Plan::has( 'multi_staff' )`, the D-R52 Staff panel. Without it
 *    (Free) only an UPLOADED photo is published, so D-R66's "no gravatar.com URL reaches a Free
 *    site's visitors" still holds; the initials stand in.
 *
 * Emitted only for a `one-page` block whose `showHost` resolves true (unset = true) and whose
 * service resolves the way the widget resolves it (a preset the catalogue lists, else the lone
 * active service). A preset `staffId` names THAT person or nobody: a hidden, archived or
 * ineligible preset is no line at all, never the team in its place.
 *
 * The payload rides the page's HTML, so a page cache serves it until the page is purged — the same
 * as every other block prop; the operator's switches (`showHost`, `is_public`, photos, titles)
 * take effect on the next uncached render.
 */
final class HostLine {

	/**
	 * Members published for the team case — the avatars drawn and the names in "You'll meet …".
	 */
	public const TEAM_SHOWN = 3;

	/**
	 * Construct.
	 *
	 * @param Settings $settings Settings (the D-R52 switches, the location-roster gate).
	 * @param \wpdb    $wpdb     Database.
	 */
	public function __construct(
		private Settings $settings,
		private \wpdb $wpdb
	) {}

	/**
	 * The host props of one block: `['host' => …]`, or nothing.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @param string               $layout     The sanitized layout.
	 * @return array<string, mixed>
	 */
	public function props( array $attributes, string $layout ): array {
		if ( 'one-page' !== $layout || ! self::showHost( $attributes['showHost'] ?? null ) ) {
			return array();
		}

		$active  = array_map(
			static fn ( array $row ): int => (int) $row['id'],
			( new PublicGateway( $this->wpdb ) )->activeServices()
		);
		$service = self::lockedService( (int) ( $attributes['serviceId'] ?? 0 ), $active );
		if ( null === $service ) {
			return array();
		}

		// The location exactly as the booking route resolves it (review fix round 1, P1): a preset
		// must be an ACTIVE location serving this service — an archived or deleted one is
		// `INVALID` there, so it names nobody here; no preset is the assigned branch, or — while
		// the location roster is published and the visitor will choose (`MISSING`) — the union of
		// every active branch (D-R61), the scope the Location step offers from.
		$connections = new ConnectionRepository( $this->wpdb );
		$preset_loc  = (int) ( $attributes['locationId'] ?? 0 );
		$location    = LocationResolution::forService(
			$preset_loc > 0 ? $preset_loc : null,
			$service,
			$this->settings,
			$connections
		);
		if ( LocationResolution::INVALID === $location ) {
			return array();
		}
		$scope = LocationResolution::MISSING === $location ? null : $location;

		$host = self::payload(
			$connections->rosterForActiveServices( $scope ),
			$service,
			(int) ( $attributes['staffId'] ?? 0 ),
			(bool) $this->settings->get( 'booking.staff_titles' ),
			(bool) $this->settings->get( 'booking.staff_photos' ),
			Plan::instance()->has( 'multi_staff' ),
			// Everyone the any-staff path can ASSIGN here, hidden staff included
			// (`ReservationService::reserveAnyStaff()` reads `staffForService()`, no edition gate,
			// no `is_public` test). Used only to SET the `others` flag — never published as a number.
			null === $scope ? null : count( $connections->staffForService( $service, $scope ) )
		);

		return null === $host ? array() : array( 'host' => $host );
	}

	/**
	 * Whether the block shows the host line: an explicit boolean wins, unset is ON (D-R85).
	 *
	 * @param mixed $raw The `showHost` attribute.
	 */
	public static function showHost( mixed $raw ): bool {
		return is_bool( $raw ) ? $raw : true;
	}

	/**
	 * The service the widget will lock: the preset when the catalogue lists it; with NO preset,
	 * the lone active service; else none — the widget's own rule. A preset the catalogue no longer
	 * lists never falls back to the lone service (QA D01, 2026-10-05): the widget shows "This
	 * service is no longer available", so there is nobody to name.
	 *
	 * @param int       $preset Preset service id (0 = none).
	 * @param list<int> $active Active service ids.
	 */
	public static function lockedService( int $preset, array $active ): ?int {
		if ( $preset > 0 ) {
			return in_array( $preset, $active, true ) ? $preset : null;
		}

		return 1 === count( $active ) ? $active[0] : null;
	}

	/**
	 * The payload from a roster read — pure, so every case is unit-testable.
	 *
	 * `{members: [entry, …≤3], total: n, others?: true}` — `total` is the PUBLIC head-count, and
	 * `others` says at least one hidden colleague may also be assigned. One public member with no
	 * `others` is a person; anything else is the team. `null` when nothing is publishable — also
	 * when every assignable person is hidden.
	 *
	 * @param array{staff: list<array<string, mixed>>, by_service: array<int, list<int>>} $roster    Roster read.
	 * @param int                                                                         $service   Locked service id.
	 * @param int                                                                         $preset    Preset staff id (0 = none).
	 * @param bool                                                                        $titles    Publish job titles.
	 * @param bool                                                                        $photos    Publish photos.
	 * @param bool                                                                        $gravatar  Publish a Gravatar URL (else uploads only).
	 * @param int|null                                                                    $assignable Everyone assignable (hidden included), or null when unknown.
	 * @return array{members: list<array<string, mixed>>, total: int, others?: bool}|null
	 */
	public static function payload( array $roster, int $service, int $preset, bool $titles, bool $photos, bool $gravatar = true, ?int $assignable = null ): ?array {
		$by_id = array();
		foreach ( $roster['staff'] as $member ) {
			$by_id[ (int) $member['id'] ] = $member;
		}

		$eligible = array_values(
			array_filter(
				array_map( 'intval', $roster['by_service'][ $service ] ?? array() ),
				static fn ( int $id ): bool => isset( $by_id[ $id ] )
			)
		);
		if ( $preset > 0 ) {
			// The preset or nobody: never the team in place of a person the operator pinned.
			if ( ! in_array( $preset, $eligible, true ) ) {
				return null;
			}
			$eligible = array( $preset );
		}
		if ( array() === $eligible ) {
			return null;
		}

		$members = array();
		foreach ( array_slice( $eligible, 0, self::TEAM_SHOWN ) as $id ) {
			/**
			 * Roster row.
			 *
			 * @var array{id:int, name:string, first_name:string, last_name:string, title:string, avatar_id:int|null, email:string, wp_user_id:int|null} $row
			 */
			$row   = $by_id[ $id ];
			$entry = PublicStaffProfile::entry( $row, $titles, $photos );
			if ( ! $gravatar && 'upload' !== ( $entry['avatar']['source'] ?? 'upload' ) ) {
				unset( $entry['avatar'] );
			}
			$members[] = $entry;
		}

		$host = array(
			'members' => $members,
			'total'   => count( $eligible ),
		);
		// A preset is one person by definition. Otherwise a flag, never a count, for the hidden.
		if ( 0 === $preset && null !== $assignable && $assignable > $host['total'] ) {
			$host['others'] = true;
		}

		return $host;
	}
}

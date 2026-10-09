<?php
/**
 * Where a public booking happens (D-R60/D-R61, rest-contract §3.1 + §3.3 addenda 2026-09-23).
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

use Aponto\Booking\Repository\ConnectionRepository;
use Aponto\Plan;
use Aponto\Support\Settings;

/**
 * The public path's ONE answer to "which location?" — the roster gate `/public/services`
 * publishes behind, and the resolution order `POST /public/bookings` applies to `location_id`.
 *
 * Both routes read the gate from here so they cannot disagree: a form that was offered a Location
 * step must be refused a null `location_id`, and a form that was not offered one must be assigned
 * one silently. The gate mirrors D-R50's staff roster exactly — three conditions, cheap first:
 *
 *   1. `Plan::has( 'multi_location' )` — the direct module gate, the same shape
 *      `PublicServicesController::roster()` uses for `multi_staff` (D-R42's recorded
 *      exception). A Free site, or Premium with the module off, runs no SQL below.
 *   2. `booking.location_choice === 'visitor'` — `first` means "never ask".
 *   3. ≥2 active locations serving ≥1 active service ({@see ConnectionRepository::locationRoster()}
 *      and its capped twin {@see ConnectionRepository::countRosterLocations()}, which read the
 *      same serving triples). One location is a fact, not a choice (D-R60 rule 3).
 *
 * {@see self::resolve()} is PURE — no WordPress, no database — so the whole branch table is
 * asserted on the host; {@see self::forService()} binds its lookups to the repository for BOTH
 * public routes, which keeps them on one scope (fix round 2) and keeps the cheap-first order
 * honest: a lookup the branch does not reach never runs.
 */
final class LocationResolution {

	/**
	 * The threshold that makes a location a CHOICE rather than a fact (D-R61).
	 */
	public const MIN_ROSTER_LOCATIONS = 2;

	/**
	 * `resolve()` outcome: an explicit `location_id` that is not an active location serving the
	 * service — `422 aponto_validation`, field `location_id`.
	 */
	public const INVALID = -1;

	/**
	 * `resolve()` outcome: a null `location_id` while the roster is published — the D-R52
	 * required-argument shape, `422 aponto_validation`, field `location_id`.
	 */
	public const MISSING = -2;

	/**
	 * Conditions 1 and 2 of the roster gate — the two that cost no query.
	 *
	 * @param Settings $settings Settings.
	 */
	public static function rosterAsked( Settings $settings ): bool {
		return Plan::instance()->has( 'multi_location' )
			&& 'visitor' === (string) $settings->get( 'booking.location_choice' );
	}

	/**
	 * Whether `/public/services` publishes (or would publish) the location roster — all three
	 * conditions, the last one a capped two-row count rather than the whole roster.
	 *
	 * @param Settings             $settings    Settings.
	 * @param ConnectionRepository $connections Connection reader.
	 */
	public static function rosterPublished( Settings $settings, ConnectionRepository $connections ): bool {
		return self::rosterAsked( $settings )
			&& $connections->countRosterLocations( self::MIN_ROSTER_LOCATIONS ) >= self::MIN_ROSTER_LOCATIONS;
	}

	/**
	 * THE assigned location for a service — the first active location serving it, by
	 * `name ASC, id ASC` — or null when none does (D-R61, fix round 2).
	 *
	 * One definition for both routes: `/public/availability` draws a null request's grid here and
	 * `POST /public/bookings` books a null request here, so a single-branch site with its own
	 * pinned timezone (or its own blocked periods, or weight-5 schedule rows) offers exactly the
	 * slots the reservation will accept. The first cut drew the grid at scope `0` while booking
	 * at the branch, and every public booking on such a site answered `409`.
	 *
	 * @param int                  $service_id  Service id.
	 * @param ConnectionRepository $connections Connection reader.
	 */
	public static function assigned( int $service_id, ConnectionRepository $connections ): ?int {
		return $connections->servingLocations( $service_id, 1 )[0] ?? null;
	}

	/**
	 * Resolve a request's `location_id` for one service, binding {@see self::resolve()} to the
	 * repository and the settings — the single entry point BOTH public routes call.
	 *
	 * The booking route maps {@see self::INVALID} and {@see self::MISSING} to `422` on the field;
	 * the availability route, a read, maps INVALID to zero slots and MISSING to scope `0` (the
	 * widget must send an id while the roster is published — rest-contract §3.2).
	 *
	 * @param int|null             $requested   Request `location_id` (null = not sent).
	 * @param int                  $service_id  Active service id.
	 * @param Settings             $settings    Settings.
	 * @param ConnectionRepository $connections Connection reader (one per request; it memoises).
	 * @return int The resolved id (`>= 0`), or {@see self::INVALID} / {@see self::MISSING}.
	 */
	public static function forService( ?int $requested, int $service_id, Settings $settings, ConnectionRepository $connections ): int {
		return self::resolve(
			$requested,
			Plan::instance()->has( 'multi_location' ),
			(string) $settings->get( 'booking.location_choice' ),
			static fn ( int $location_id ): bool => $connections->locationServes( $location_id, $service_id ),
			static fn (): ?int => self::assigned( $service_id, $connections ),
			static fn (): bool => self::rosterPublished( $settings, $connections )
		);
	}

	/**
	 * Resolve a request's `location_id` in the order rest-contract §3.3 (addendum 2026-09-23)
	 * states:
	 *
	 *   1. an EXPLICIT id must be an active location serving the service (wildcard counts), and —
	 *      with the module available and `location_choice = first` — must BE the assigned one:
	 *      `first` means "online bookings only at the first branch" (fix round 2, option A);
	 *      else {@see self::INVALID};
	 *   2. null, the module available and ≥1 location serving the service: if the roster is
	 *      published the customer was asked and did not answer — {@see self::MISSING}; otherwise
	 *      (one location, or `first`) the assigned location, {@see self::assigned()};
	 *   3. anything else — `0`, today's value, so Free and location-less sites stay
	 *      byte-identical.
	 *
	 * @param int|null            $requested Request `location_id` (null = not sent).
	 * @param bool                $module    `Plan::has( 'multi_location' )`.
	 * @param string              $choice    `booking.location_choice`.
	 * @param callable(int): bool $serves    Whether a location is active and serves the service.
	 * @param callable(): ?int    $first     The assigned location, or null for none.
	 * @param callable(): bool    $published {@see self::rosterPublished()}, bound by the caller.
	 * @return int The resolved id (`>= 0`), or {@see self::INVALID} / {@see self::MISSING}.
	 */
	public static function resolve( ?int $requested, bool $module, string $choice, callable $serves, callable $first, callable $published ): int {
		if ( null !== $requested ) {
			// Edition-agnostic on purpose (contract step 1): the engine behind the id is core.
			if ( ! $serves( $requested ) ) {
				return self::INVALID;
			}
			// `first` = the other branches take no online bookings (module-owned setting).
			if ( $module && 'first' === $choice && $first() !== $requested ) {
				return self::INVALID;
			}

			return $requested;
		}
		if ( ! $module ) {
			return 0;
		}

		$assigned = $first();
		if ( null === $assigned ) {
			return 0;
		}

		return $published() ? self::MISSING : $assigned;
	}
}

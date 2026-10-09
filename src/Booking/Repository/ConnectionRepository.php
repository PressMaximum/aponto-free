<?php
/**
 * Staff-service connection reader (§5.3, §5.6).
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

use Aponto\Database\StorageException;
use Aponto\Database\TransactionGuard;
use Aponto\Support\PersonName;

/**
 * Resolves which ACTIVE staff are connected to a service at a location, ordered by `(position, id)`.
 * Used both by any-staff display (one extra "connection" query — budget §5.8) and by any-staff
 * reservation candidate resolution (§5.6). A `staff_services.location_id` of `0` is a wildcard
 * covering every location.
 */
final class ConnectionRepository {

	/**
	 * Construct the repository.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct( private \wpdb $wpdb ) {}

	/**
	 * Active staff connected to a service+location, ordered `(position, id)`.
	 *
	 * @param int $service_id  Service id.
	 * @param int $location_id Location id.
	 * @return list<int> Staff ids.
	 */
	public function staffForService( int $service_id, int $location_id ): array {
		$staff       = $this->wpdb->prefix . 'aponto_staff';
		$connections = $this->wpdb->prefix . 'aponto_staff_services';

		$sql = "SELECT s.id
			FROM {$staff} s
			INNER JOIN {$connections} ss ON ss.staff_id = s.id
			WHERE s.status = 'active'
			  AND ss.service_id = %d
			  AND ( ss.location_id = %d OR ss.location_id = 0 )
			GROUP BY s.id
			ORDER BY s.position ASC, s.id ASC";

		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.PreparedSQL.NotPrepared -- SQL identifiers are internal and all values are passed to wpdb::prepare.
		$ids = $this->wpdb->get_col( $this->wpdb->prepare( $sql, $service_id, $location_id ) );

		return array_map( 'intval', (array) $ids );
	}

	/**
	 * Whether a CONCRETE staff member is BOTH active AND connected — i.e. whether the any-staff
	 * path would have offered this person at all (D-R50 fix round 1).
	 *
	 * {@see self::isConnected()} deliberately does not look at `status`, and its two display-side
	 * callers did not look either, so an ARCHIVED staff member kept producing slots for a concrete
	 * `staff_id` while the reservation refused them under the lock (`targetsAreBookable()` has
	 * checked `status = 'active'` all along). The customer got an unbookable calendar and a
	 * `409 aponto_slot_taken` on every attempt. This is the single predicate both sides can agree
	 * on: exactly the terms of {@see self::staffForService()}, for one staff member.
	 *
	 * @param int $staff_id    Concrete staff id.
	 * @param int $service_id  Service id.
	 * @param int $location_id Location id (0 = no-location scope).
	 */
	public function isEligible( int $staff_id, int $service_id, int $location_id ): bool {
		$staff       = $this->wpdb->prefix . 'aponto_staff';
		$connections = $this->wpdb->prefix . 'aponto_staff_services';

		$sql = "SELECT 1
			FROM {$staff} s
			INNER JOIN {$connections} ss ON ss.staff_id = s.id
			WHERE s.id = %d
			  AND s.status = 'active'
			  AND ss.service_id = %d
			  AND ( ss.location_id = %d OR ss.location_id = 0 )
			LIMIT 1";

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; every value bound via prepare().
		return null !== $this->wpdb->get_var( $this->wpdb->prepare( $sql, $staff_id, $service_id, $location_id ) );
	}

	/**
	 * The BULK, display-side form of {@see self::staffForService()} (D-R50): the eligible active
	 * staff of EVERY ACTIVE SERVICE in ONE query, plus each one's display name, ordered by the same
	 * `(position, id)` the any-staff assignment walks.
	 *
	 * Exists so the public catalogue can publish a staff roster without asking this question
	 * once per service — `/public/services` returns the whole catalogue, so the per-service loop
	 * would be an N+1 on the single hottest public read. The scope test is copied from
	 * `staffForService()` verbatim, `location_id = 0` wildcard included, precisely because the
	 * roster the customer chooses from must be the set the reservation would consider: a form that
	 * offered somebody the engine would never assign is worse than no form at all.
	 *
	 * The active-service set is JOINED, not bound as an `IN ( %d, … )` list (fix round 1): a
	 * catalogue larger than the driver's bind-variable ceiling — SQLite's `SQLITE_MAX_VARIABLE_NUMBER`
	 * is 999 on plenty of builds — would have failed the statement and published an EMPTY roster,
	 * which looks exactly like "this site has one staff member" and is therefore silent. The join also
	 * keeps the "active" definition in ONE place: `status = 'active'`, byte-identical to
	 * {@see \Aponto\Rest\Data\PublicGateway::activeServices()}, which selects the very items this
	 * roster is attached to.
	 *
	 * **D-R51 — the roster is the PUBLIC set.** `is_public = 1` joins `status = 'active'` in the
	 * WHERE clause, so a staff member the operator has hidden appears neither in `staff[]` nor in
	 * any `staff_ids[]`. That is a DISPLAY filter and nothing more: the availability engine and
	 * `reserveAnyStaff()` never call this method, so a hidden member is still assigned
	 * automatically exactly as before. It also means both "≥2" gates — the site-wide one in
	 * `PublicServicesController::roster()` and the per-service one in the widget — re-derive
	 * themselves from the public set for free, which is the behaviour the founder asked for: a
	 * service with one visible staff member gets no Staff step.
	 *
	 * The profile columns travel with the name because they are what the row RENDERS, and a
	 * second query for them would reintroduce the N+1 this method exists to avoid. `email` and
	 * `wp_user_id` ride along for the SAME reason and are NEVER published: the avatar chain's
	 * Gravatar step resolves through core `get_avatar_url()`, which needs the user or the
	 * address to resolve — {@see \Aponto\Rest\Support\StaffAvatar}. The controller's wire
	 * serializer emits neither.
	 *
	 * **`bio` is selected ONLY when the caller asks for it** (D-R52). D-R51 shipped with the
	 * column simply absent from the statement, so the text could not leak by accident; phase 2
	 * adds it back behind the site-wide "Let customers view staff profiles" opt-in, and
	 * keeps exactly that property by making the SELECT LIST itself conditional rather than
	 * filtering after the read. With the gate off the string never enters PHP memory on the
	 * public path at all, so there is no later branch that can be got wrong.
	 *
	 * **D-R61 — `null` is the UNION scope** (rest-contract §3.1 addendum 2026-09-23, corrected
	 * after implementation). Once the location roster is published, the staff roster has to cover
	 * every branch, not just the wildcard: at scope `0` a staff member whose only rows name a
	 * concrete location never appears at all, so the widget's per-branch narrowing
	 * (`location_staff_ids`) could never offer them. `null` therefore
	 * accepts a wildcard row OR a row whose location is ACTIVE — a `LEFT JOIN` of
	 * `aponto_locations` on its primary key (at most one row per connection, so no fan-out and no
	 * bound id list), with `l.id IS NOT NULL` doing the "active" test. An archived or deleted
	 * location's rows drop out; the wildcard never needs the join. The int form keeps its exact
	 * predicate, so every caller that passes `0` or a concrete id reads what it read before.
	 *
	 * @param int|null $location_id Location id (0 = no-location scope, null = every active location).
	 * @param bool     $with_bio    Whether to select `bio` (only when the profile opt-in is ON).
	 * @return array{staff: list<array{id:int, name:string, first_name:string, last_name:string, title:string, bio?:string, avatar_id:int|null, email:string, wp_user_id:int|null}>, by_service: array<int, list<int>>}
	 */
	public function rosterForActiveServices( ?int $location_id, bool $with_bio = false ): array {
		$staff       = $this->wpdb->prefix . 'aponto_staff';
		$connections = $this->wpdb->prefix . 'aponto_staff_services';
		$services    = $this->wpdb->prefix . 'aponto_services';
		$locations   = $this->wpdb->prefix . 'aponto_locations';
		$bio_column  = $with_bio ? ', s.bio' : '';

		if ( null === $location_id ) {
			$sql = "SELECT DISTINCT ss.service_id, s.id, s.first_name, s.last_name, s.title{$bio_column}, s.avatar_id, s.email, s.wp_user_id, s.position
				FROM {$staff} s
				INNER JOIN {$connections} ss ON ss.staff_id = s.id
				INNER JOIN {$services} sv ON sv.id = ss.service_id AND sv.status = 'active'
				LEFT JOIN {$locations} l ON l.id = ss.location_id AND l.status = 'active'
				WHERE s.status = 'active'
				  AND s.is_public = 1
				  AND ( ss.location_id = 0 OR l.id IS NOT NULL )
				ORDER BY s.position ASC, s.id ASC";

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables and literals; nothing to bind.
			$rows = $this->wpdb->get_results( $sql, ARRAY_A );
		} else {
			$sql = "SELECT DISTINCT ss.service_id, s.id, s.first_name, s.last_name, s.title{$bio_column}, s.avatar_id, s.email, s.wp_user_id, s.position
				FROM {$staff} s
				INNER JOIN {$connections} ss ON ss.staff_id = s.id
				INNER JOIN {$services} sv ON sv.id = ss.service_id AND sv.status = 'active'
				WHERE s.status = 'active'
				  AND s.is_public = 1
				  AND ( ss.location_id = %d OR ss.location_id = 0 )
				ORDER BY s.position ASC, s.id ASC";

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; the location is bound via prepare().
			$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $location_id ), ARRAY_A );
		}

		$profiles   = array();
		$by_service = array();
		foreach ( (array) $rows as $row ) {
			$staff_id   = (int) $row['id'];
			$service_id = (int) $row['service_id'];

			// First sight wins, and the statement is already ordered, so insertion order IS
			// `(position, id)` — the order `reserveAnyStaff()` picks in.
			if ( ! isset( $profiles[ $staff_id ] ) ) {
				$profiles[ $staff_id ] = array(
					'id'         => $staff_id,
					// The composed display name (never stored) and the two stored parts (D-R69).
					'name'       => PersonName::display( (string) $row['first_name'], (string) $row['last_name'] ),
					'first_name' => (string) $row['first_name'],
					'last_name'  => (string) $row['last_name'],
					'title'      => (string) ( $row['title'] ?? '' ),
					'avatar_id'  => ( null === ( $row['avatar_id'] ?? null ) || '' === $row['avatar_id'] )
						? null
						: (int) $row['avatar_id'],
					// Server-side only: the avatar chain needs a subject for `get_avatar_url()`.
					'email'      => (string) ( $row['email'] ?? '' ),
					'wp_user_id' => ( null === ( $row['wp_user_id'] ?? null ) || '' === $row['wp_user_id'] )
						? null
						: (int) $row['wp_user_id'],
				);
				// The key EXISTS only when the gate is on, so a consumer that forgot to check
				// reads `null` rather than an empty string it might publish as `""` (D-R52).
				if ( $with_bio ) {
					$profiles[ $staff_id ]['bio'] = (string) ( $row['bio'] ?? '' );
				}
			}
			if ( ! isset( $by_service[ $service_id ] ) ) {
				$by_service[ $service_id ] = array();
			}
			$by_service[ $service_id ][] = $staff_id;
		}

		$roster = array_values( $profiles );

		return array(
			'staff'      => $roster,
			'by_service' => $by_service,
		);
	}

	/**
	 * How many PUBLIC, active, connected staff one service has — capped at `$limit` (D-R52,
	 * fix round 1 P3-2).
	 *
	 * The `booking.staff_choice = required` refusal only needs to know "does this service really
	 * have a choice in it", i.e. whether the count reaches TWO. The first cut answered that by
	 * building {@see self::rosterForActiveServices()} — the whole catalogue's roster, every
	 * profile column, every service — on every any-staff booking of a `required` site. This is
	 * the same question scoped to the one service, with the same eligibility semantics
	 * (`status = 'active'` ∧ `is_public = 1` ∧ a connection row ∧ the `location_id = 0`
	 * wildcard), one statement, and at most `$limit` rows read.
	 *
	 * `DISTINCT` + `LIMIT` rather than `COUNT(*)` over a derived table: a staff member connected
	 * to the same service at three locations must count once, and a driver-neutral `LIMIT` on a
	 * plain select is the one form MySQL, MariaDB and the SQLite drop-in all agree on.
	 *
	 * The SERVICE's own status is deliberately not tested here — every caller has already
	 * resolved an `active` service, and re-joining it would make this reader disagree with
	 * whichever definition the caller is holding.
	 *
	 * @param int $service_id  Service id.
	 * @param int $location_id Location id (0 = no-location scope).
	 * @param int $limit       Stop counting here (the caller only needs a threshold).
	 * @return int Capped count.
	 */
	public function countPublicEligible( int $service_id, int $location_id, int $limit = 2 ): int {
		$staff       = $this->wpdb->prefix . 'aponto_staff';
		$connections = $this->wpdb->prefix . 'aponto_staff_services';

		$sql = "SELECT DISTINCT s.id
			FROM {$staff} s
			INNER JOIN {$connections} ss ON ss.staff_id = s.id
			WHERE s.status = 'active'
			  AND s.is_public = 1
			  AND ss.service_id = %d
			  AND ( ss.location_id = %d OR ss.location_id = 0 )
			LIMIT %d";

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; every value bound via prepare().
		$ids = $this->wpdb->get_col( $this->wpdb->prepare( $sql, $service_id, $location_id, max( 1, $limit ) ) );

		return count( (array) $ids );
	}

	/**
	 * The services SOMEBODY can perform: every service id with at least one connection row to an
	 * ACTIVE staff member (persona QA 2026-10-05, T-073).
	 *
	 * The public catalogue listed every active service, so one no staff member had been assigned
	 * to was offered with its price and then answered with a calendar of nothing — for ever, since
	 * no month can have a slot nobody is there to give. This is the display-side form of the test
	 * {@see self::staffForService()} opens with (`status = 'active'` ∧ a connection row), for the
	 * whole catalogue in ONE statement with nothing bound.
	 *
	 * Deliberately NOT narrowed by location or by `is_public`: a service whose only rows sit at an
	 * archived branch stays in the catalogue with `location_ids: []` exactly as D-R61 publishes it,
	 * and a hidden staff member is still assigned automatically (D-R51) — so their service is
	 * bookable.
	 *
	 * @return list<int> Service ids.
	 */
	public function staffedServiceIds(): array {
		$staff       = $this->wpdb->prefix . 'aponto_staff';
		$connections = $this->wpdb->prefix . 'aponto_staff_services';

		$sql = "SELECT DISTINCT ss.service_id
			FROM {$connections} ss
			INNER JOIN {$staff} s ON s.id = ss.staff_id AND s.status = 'active'";

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; no user input.
		$ids = $this->wpdb->get_col( $sql );

		return array_values( array_map( 'intval', (array) $ids ) );
	}

	/**
	 * Memoised {@see self::activeLocations()} for this instance — one request's worth.
	 *
	 * @var list<array{id:int, name:string, address_line1:string, address_line2:string, city:string, region:string, postal_code:string, country:string, phone:string}>|null
	 */
	private ?array $active_locations = null;

	/**
	 * The public LOCATION roster behind `/public/services` `locations[]`, per-item
	 * `location_ids[]` and per-item `location_staff_ids` (D-R61, rest-contract §3.1 addendum
	 * 2026-09-23, "sửa lần 2").
	 *
	 * **Two statements, never a `locations × staff_services` product (fix round 2).** The first
	 * cut joined every active location to every connection row it matched, and the wildcard
	 * `location_id = 0` matches ALL of them: 100 branches × 5,000 wildcard rows is 500,000 rows
	 * into PHP on an anonymous route with no rate-limit bucket. Now:
	 *
	 *   (a) {@see self::activeLocations()} — `O(L)`, one row per active location with the
	 *       address columns, ordered `name ASC, id ASC`;
	 *   (b) {@see self::servingTriples()} — `O(C)`, one row per DISTINCT live
	 *       `(location_id, service_id, staff)` connection under the UNION predicate, the
	 *       wildcard left as `0`.
	 *
	 * The wildcard is expanded HERE, in PHP, into exactly the structures the payload publishes —
	 * so memory is bounded by the OUTPUT (`services × locations` ids, plus
	 * `services × locations × public staff` ids for `location_staff_ids`), never by an
	 * intermediate SQL product. That output bound is the contract's own shape: it is what the
	 * form needs to narrow the Staff step per (service, branch).
	 *
	 * "Serves" is the D-R61 predicate: an ACTIVE location, and a connection row for the service
	 * at that location or the wildcard, with an ACTIVE service and an ACTIVE staff member on it
	 * (the {@see self::isEligible()} term — a branch staffed only by archived staff is not
	 * offered). `location_staff` keeps only PUBLIC staff (`is_public = 1`, D-R51), in the
	 * `(position, id)` order the any-staff assignment walks; a hidden staff member still makes a
	 * branch serve, because any-staff still assigns them.
	 *
	 * @return array{locations: list<array{id:int, name:string, address_line1:string, address_line2:string, city:string, region:string, postal_code:string, country:string, phone:string}>, by_service: array<int, list<int>>, location_staff: array<int, array<int, list<int>>>}
	 */
	public function locationRoster(): array {
		$locations = $this->activeLocations();
		$all_ids   = array_column( $locations, 'id' );

		$serves = array(); // service => location => true.
		$public = array(); // service => location => staff => true, in (position, id) order.
		foreach ( $this->servingTriples( null ) as $triple ) {
			$targets = 0 === $triple['location_id'] ? $all_ids : array( $triple['location_id'] );
			foreach ( $targets as $location_id ) {
				$serves[ $triple['service_id'] ][ $location_id ] = true;
				if ( $triple['is_public'] ) {
					$public[ $triple['service_id'] ][ $location_id ][ $triple['staff_id'] ] = true;
				}
			}
		}

		// Emit in the published order: locations `name, id`, staff `(position, id)` — the
		// triples arrive in staff order, and PHP arrays keep insertion order.
		$by_service     = array();
		$location_staff = array();
		$used           = array();
		foreach ( $serves as $service_id => $at ) {
			foreach ( $all_ids as $location_id ) {
				if ( ! isset( $at[ $location_id ] ) ) {
					continue;
				}
				$by_service[ $service_id ][]                   = $location_id;
				$location_staff[ $service_id ][ $location_id ] = array_keys( $public[ $service_id ][ $location_id ] ?? array() );
				$used[ $location_id ]                          = true;
			}
		}

		return array(
			'locations'      => array_values(
				array_filter( $locations, static fn ( array $location ): bool => isset( $used[ $location['id'] ] ) )
			),
			'by_service'     => $by_service,
			'location_staff' => $location_staff,
		);
	}

	/**
	 * How many locations {@see self::locationRoster()} would publish — capped at `$limit`
	 * (D-R61).
	 *
	 * `POST /public/bookings` and `/public/availability` must know whether the roster WOULD be
	 * published, and that is a threshold question. BOUNDED reads only (review round 3 — the
	 * previous form materialised every site-wide connection triple on each null request, just to
	 * count to two):
	 *
	 *   1. is there ONE live wildcard row? `SELECT 1 … WHERE ss.location_id = 0 … LIMIT 1` —
	 *      if so every active location serves, and the answer is the active-location count,
	 *      read with `LIMIT $limit`;
	 *   2. otherwise the DISTINCT active location ids the live rows target, joined on the
	 *      locations PRIMARY KEY (no `OR`, no product), `LIMIT $limit`.
	 *
	 * At most two statements, each stopping at `$limit` rows.
	 *
	 * @param int $limit Stop counting here (the caller only needs a threshold).
	 * @return int Capped count.
	 */
	public function countRosterLocations( int $limit = 2 ): int {
		$limit       = max( 1, $limit );
		$connections = $this->wpdb->prefix . 'aponto_staff_services';
		$staff       = $this->wpdb->prefix . 'aponto_staff';
		$services    = $this->wpdb->prefix . 'aponto_services';
		$locations   = $this->wpdb->prefix . 'aponto_locations';
		$live        = "FROM {$connections} ss
			INNER JOIN {$staff} s ON s.id = ss.staff_id AND s.status = 'active'
			INNER JOIN {$services} sv ON sv.id = ss.service_id AND sv.status = 'active'";

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables and literals; nothing to bind.
		$wildcard = $this->wpdb->get_var( "SELECT 1 {$live} WHERE ss.location_id = 0 LIMIT 1" );

		if ( null !== $wildcard ) {
			$sql = "SELECT id FROM {$locations} WHERE status = 'active' LIMIT %d";
		} else {
			$sql = "SELECT DISTINCT l.id {$live}
				INNER JOIN {$locations} l ON l.id = ss.location_id AND l.status = 'active'
				LIMIT %d";
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; the limit is bound via prepare().
		return count( (array) $this->wpdb->get_col( $this->wpdb->prepare( $sql, $limit ) ) );
	}

	/**
	 * The active locations serving ONE service, in the published order `name ASC, id ASC` —
	 * capped at `$limit` (D-R61).
	 *
	 * The first element is THE assigned location ({@see \Aponto\Rest\Support\LocationResolution::assigned()}):
	 * where a single-location site, or a `booking.location_choice = first` site, books — and
	 * where `/public/availability` draws the grid for the same null request, so the two routes
	 * can never run at different scopes. Reads only this service's connection rows plus the
	 * active location list; archived branches are never chosen.
	 *
	 * **Collation.** "Name order" is the database's own `ORDER BY name`: MySQL's `*_ci` collations
	 * and SQLite's binary default can disagree on case and accents, so two branches whose names
	 * differ only that way may assign differently on the two engines.
	 *
	 * @param int $service_id Service id.
	 * @param int $limit      Maximum ids to return.
	 * @return list<int> Location ids.
	 */
	public function servingLocations( int $service_id, int $limit = 1 ): array {
		return $this->servingLocationIds( $service_id, max( 1, $limit ) );
	}

	/**
	 * Whether ONE concrete location is active AND serves the service (D-R61).
	 *
	 * The single predicate behind both public uses of an explicit `location_id`: availability
	 * answers `200` with zero slots when this is false (subtract-only — rest-contract §3.2
	 * addendum 2026-09-23), and the booking route refuses the id with `422 aponto_validation`
	 * field `location_id` (§3.3). It exists because the engine alone CANNOT say no to an unknown
	 * location: every eligibility read matches the wildcard `location_id = 0`, so a nonexistent
	 * or archived id would still resolve today's wildcard-only connections and produce a full
	 * calendar for a branch that is not there.
	 *
	 * One row of `aponto_locations` by primary key, and an `EXISTS` over THIS service's
	 * connection rows with the location id bound twice — no join between the two tables.
	 *
	 * @param int $location_id Concrete location id.
	 * @param int $service_id  Service id.
	 */
	public function locationServes( int $location_id, int $service_id ): bool {
		$locations   = $this->wpdb->prefix . 'aponto_locations';
		$connections = $this->wpdb->prefix . 'aponto_staff_services';
		$staff       = $this->wpdb->prefix . 'aponto_staff';
		$services    = $this->wpdb->prefix . 'aponto_services';

		$sql = "SELECT 1
			FROM {$locations}
			WHERE id = %d
			  AND status = 'active'
			  AND EXISTS (
				SELECT 1
				FROM {$connections} ss
				INNER JOIN {$staff} s ON s.id = ss.staff_id AND s.status = 'active'
				INNER JOIN {$services} sv ON sv.id = ss.service_id AND sv.status = 'active'
				WHERE ss.service_id = %d
				  AND ( ss.location_id = 0 OR ss.location_id = %d )
			  )
			LIMIT 1";

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; every value bound via prepare().
		return null !== $this->wpdb->get_var( $this->wpdb->prepare( $sql, $location_id, $service_id, $location_id ) );
	}

	/**
	 * Every ACTIVE location, `name ASC, id ASC`, with its address columns — `O(L)`, memoised for
	 * this instance (one request), because the roster, its threshold and the assignment all
	 * need the same ordered list.
	 *
	 * @return list<array{id:int, name:string, address_line1:string, address_line2:string, city:string, region:string, postal_code:string, country:string, phone:string}>
	 */
	private function activeLocations(): array {
		if ( null !== $this->active_locations ) {
			return $this->active_locations;
		}

		$table = $this->wpdb->prefix . 'aponto_locations';
		$sql   = "SELECT id, name, address_line1, address_line2, city, region, postal_code, country, phone
			FROM {$table}
			WHERE status = 'active'
			ORDER BY name ASC, id ASC";

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table and literals; nothing to bind.
		$rows = $this->wpdb->get_results( $sql, ARRAY_A );

		$out = array();
		foreach ( (array) $rows as $row ) {
			$out[] = array(
				'id'            => (int) $row['id'],
				'name'          => (string) $row['name'],
				'address_line1' => (string) ( $row['address_line1'] ?? '' ),
				'address_line2' => (string) ( $row['address_line2'] ?? '' ),
				'city'          => (string) ( $row['city'] ?? '' ),
				'region'        => (string) ( $row['region'] ?? '' ),
				'postal_code'   => (string) ( $row['postal_code'] ?? '' ),
				'country'       => (string) ( $row['country'] ?? '' ),
				'phone'         => (string) ( $row['phone'] ?? '' ),
			);
		}

		$this->active_locations = $out;

		return $out;
	}

	/**
	 * The DISTINCT live connection triples under the UNION predicate (D-R61) — `O(C)`, or the
	 * rows of one service when `$service_id` is given.
	 *
	 * A row counts when its staff member and its service are ACTIVE and it targets the wildcard
	 * (`location_id = 0`) or an ACTIVE location — the same `LEFT JOIN` on the locations PRIMARY
	 * KEY that {@see self::rosterForActiveServices()} uses at `null` (at most one location row
	 * per connection, so no fan-out). `0` is returned as `0`: expanding it is the caller's job.
	 * Ordered `(position, id)` so per-location staff lists come out in assignment order.
	 *
	 * @param int|null $service_id One service, or null for every active service.
	 * @return list<array{location_id:int, service_id:int, staff_id:int, is_public:bool}>
	 */
	private function servingTriples( ?int $service_id ): array {
		$connections = $this->wpdb->prefix . 'aponto_staff_services';
		$staff       = $this->wpdb->prefix . 'aponto_staff';
		$services    = $this->wpdb->prefix . 'aponto_services';
		$locations   = $this->wpdb->prefix . 'aponto_locations';
		$scope       = null === $service_id ? '' : ' AND ss.service_id = %d';

		$sql = "SELECT DISTINCT ss.location_id, ss.service_id, s.id, s.is_public, s.position
			FROM {$connections} ss
			INNER JOIN {$staff} s ON s.id = ss.staff_id AND s.status = 'active'
			INNER JOIN {$services} sv ON sv.id = ss.service_id AND sv.status = 'active'
			LEFT JOIN {$locations} l ON l.id = ss.location_id AND l.status = 'active'
			WHERE ( ss.location_id = 0 OR l.id IS NOT NULL ){$scope}
			ORDER BY s.position ASC, s.id ASC";

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; the optional service id is bound via prepare().
		$rows = $this->wpdb->get_results( null === $service_id ? $sql : $this->wpdb->prepare( $sql, $service_id ), ARRAY_A );

		$out = array();
		foreach ( (array) $rows as $row ) {
			$out[] = array(
				'location_id' => (int) $row['location_id'],
				'service_id'  => (int) $row['service_id'],
				'staff_id'    => (int) $row['id'],
				'is_public'   => 1 === (int) ( $row['is_public'] ?? 1 ),
			);
		}

		return $out;
	}

	/**
	 * The active locations serving one service (or any active service), `name ASC, id ASC`,
	 * capped at `$limit` — the core of the assignment read (D-R61).
	 *
	 * @param int|null $service_id One service, or null for any.
	 * @param int      $limit      Maximum ids to return.
	 * @return list<int> Location ids.
	 */
	private function servingLocationIds( ?int $service_id, int $limit ): array {
		$targets = array();
		foreach ( $this->servingTriples( $service_id ) as $triple ) {
			$targets[ $triple['location_id'] ] = true;
		}
		if ( array() === $targets ) {
			return array(); // Nothing serves: the location list is not even read.
		}

		$out = array();
		foreach ( $this->activeLocations() as $location ) {
			if ( isset( $targets[0] ) || isset( $targets[ $location['id'] ] ) ) {
				$out[] = $location['id'];
				if ( count( $out ) >= $limit ) {
					break;
				}
			}
		}

		return $out;
	}

	/**
	 * The REVERSE read of {@see self::staffForService()}: every service one staff member is
	 * eligible for, ascending by service id and distinct (a staff member connected to the same
	 * service at three locations appears once). Added with D-R28 (2026-08-27) to back the staff
	 * workspace's read-only "Services" list — the forward direction alone would have meant one
	 * eligibility request per service to answer "what does THIS person do".
	 *
	 * Deliberately unfiltered by service status: an archived or draft service the member is still
	 * connected to is a real assignment, and hiding it would make the list disagree with what a
	 * `PUT /services/{id}/eligibility` round-trip would show. Callers that only want live services
	 * intersect with their own catalog read.
	 *
	 * @param int $staff_id Staff id.
	 * @return list<int> Service ids.
	 */
	public function servicesForStaff( int $staff_id ): array {
		$table = $this->wpdb->prefix . 'aponto_staff_services';
		$sql   = "SELECT DISTINCT service_id FROM {$table} WHERE staff_id = %d ORDER BY service_id ASC";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		$ids = $this->wpdb->get_col( $this->wpdb->prepare( $sql, $staff_id ) );

		return array_map( 'intval', (array) $ids );
	}

	/**
	 * How many DISTINCT ACTIVE staff and DISTINCT ACTIVE services each of these locations has, in
	 * ONE statement for the whole page (D-R56, rest-contract §2.17 additive note).
	 *
	 * Backs the admin Locations list's Staff and Services columns, which until D-R56 printed a
	 * hard-coded "Any" — a placeholder an operator reads as a real answer. The reader lives HERE
	 * rather than in the controller because the question is this table's own: what the wildcard
	 * `location_id = 0` means is connection semantics, and the two predicates are copied verbatim
	 * from {@see self::isEligible()} / {@see self::rosterForActiveServices()} so the numbers on the
	 * screen agree with the eligibility the engine applies.
	 *
	 * **The one deliberate difference from the roster reader: `is_public` is NOT tested.** That is
	 * a booking-form DISPLAY filter (D-R51) — a staff member hidden from customers is still staffed
	 * at this location, and an admin count that quietly dropped them would under-report the
	 * operator's own configuration.
	 *
	 * **The two counts are INDEPENDENT.** A connection row whose staff is archived still counts its
	 * ACTIVE service, and vice versa: each `LEFT JOIN` carries its own `status = 'active'` test and
	 * each `COUNT( DISTINCT … )` collapses the fan-out, so a staff member connected at both the
	 * wildcard and this location counts once.
	 *
	 * BOUNDED bind list: the ids are one page of `GET /locations`, so at most `Args::argPerPage()`'s
	 * ceiling of 100 (§5 invariant 7 — every value through `prepare()`). Portable SQL only, no
	 * MySQL-only builtin (D-R54; `tests/Unit/RateLimiterSqlTest.php` scans `src/` for `IF(`).
	 *
	 * **COST, stated rather than assumed (Codex, D-R56 fix round 1).** The connection join filters
	 * on `location_id`, and `aponto_staff_services` is keyed `(staff_id, service_id, location_id)`
	 * — a leading-column prefix the planner cannot use for this predicate, so the statement scans
	 * the connection table once per location on the page. The bound is therefore
	 * `≤ 100 locations × |aponto_staff_services|`, on an ADMIN list read: a page nobody loads in a
	 * loop, behind a capability, with a table whose row count is `services × staff` and is small on
	 * every site that has locations to manage at all. **No index is added, deliberately:** this
	 * batch ships no migration (founder, D-R56 — current columns only), and an index for a screen
	 * is not worth a schema version on its own.
	 *
	 * Splitting the wildcard rows out and counting them once was considered and REJECTED: the
	 * answer is `|wildcard ∪ scoped( L )|`, so the union's overlap still has to be resolved per
	 * location, which is the same scan with more statements and a chance to get `DISTINCT` wrong.
	 * The place to revisit both decisions is when per-location pairs become authorable — at that
	 * point the wildcard stops dominating the table and an index on `location_id` earns its
	 * migration.
	 *
	 * @param list<int> $location_ids Location ids from ONE page of results.
	 * @return array<int, array{staff_count:int, service_count:int}> Keyed by location id.
	 */
	public function countsForLocations( array $location_ids ): array {
		$ids = array_values( array_unique( array_filter( array_map( 'intval', $location_ids ), static fn ( int $id ): bool => $id > 0 ) ) );
		if ( array() === $ids ) {
			return array();
		}

		$locations    = $this->wpdb->prefix . 'aponto_locations';
		$connections  = $this->wpdb->prefix . 'aponto_staff_services';
		$staff        = $this->wpdb->prefix . 'aponto_staff';
		$services     = $this->wpdb->prefix . 'aponto_services';
		$placeholders = implode( ', ', array_fill( 0, count( $ids ), '%d' ) );

		$sql = "SELECT l.id AS location_id,
				COUNT( DISTINCT s.id ) AS staff_count,
				COUNT( DISTINCT sv.id ) AS service_count
			FROM {$locations} l
			LEFT JOIN {$connections} ss ON ( ss.location_id = l.id OR ss.location_id = 0 )
			LEFT JOIN {$staff} s ON s.id = ss.staff_id AND s.status = 'active'
			LEFT JOIN {$services} sv ON sv.id = ss.service_id AND sv.status = 'active'
			WHERE l.id IN ( {$placeholders} )
			GROUP BY l.id";

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; every id bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $ids ), ARRAY_A );

		$counts = array();
		foreach ( (array) $rows as $row ) {
			$counts[ (int) $row['location_id'] ] = array(
				'staff_count'   => (int) $row['staff_count'],
				'service_count' => (int) $row['service_count'],
			);
		}

		return $counts;
	}

	/**
	 * Who is assigned at ONE location, and for what — the ACTIVE staff × ACTIVE service pairs whose
	 * connection row targets this location OR the wildcard `0` (the `isEligible()` terms), in staff
	 * order (`position ASC, id ASC`) then service order. ONE statement for the whole location, behind
	 * `GET /locations/{id}/hours` (rest-contract §2.17, D-R63 fix round 1): the Location editor's
	 * Hours card used to fan out one eligibility read per service to learn the same thing.
	 *
	 * `DISTINCT` because a member may hold both the wildcard and this location's row for a service.
	 * Portable SQL (D-R54). Cost: bounded by the connection rows at this location + the wildcard ones
	 * — the same scan `countsForLocations()` makes (§5 debt: no location-leading index yet).
	 *
	 * @param int $location_id Concrete location id.
	 * @return list<array{staff_id:int, staff_name:string, staff_first_name:string, staff_last_name:string, service_id:int, service_name:string}>
	 */
	public function assignmentsAtLocation( int $location_id ): array {
		$connections = $this->wpdb->prefix . 'aponto_staff_services';
		$staff       = $this->wpdb->prefix . 'aponto_staff';
		$services    = $this->wpdb->prefix . 'aponto_services';

		$sql = "SELECT DISTINCT st.id AS staff_id, st.first_name AS staff_first_name, st.last_name AS staff_last_name, st.position AS staff_position,
				sv.id AS service_id, sv.name AS service_name, sv.position AS service_position
			FROM {$connections} ss
			INNER JOIN {$staff} st ON st.id = ss.staff_id AND st.status = 'active'
			INNER JOIN {$services} sv ON sv.id = ss.service_id AND sv.status = 'active'
			WHERE ss.location_id = %d OR ss.location_id = 0
			ORDER BY st.position ASC, st.id ASC, sv.position ASC, sv.id ASC";

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant tables; id bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $location_id ), ARRAY_A );

		$out = array();
		foreach ( (array) $rows as $row ) {
			$out[] = array(
				'staff_id'         => (int) $row['staff_id'],
				'staff_name'       => PersonName::display( (string) $row['staff_first_name'], (string) $row['staff_last_name'] ),
				'staff_first_name' => (string) $row['staff_first_name'],
				'staff_last_name'  => (string) $row['staff_last_name'],
				'service_id'       => (int) $row['service_id'],
				'service_name'     => (string) $row['service_name'],
			);
		}

		return $out;
	}

	/**
	 * Whether a CONCRETE staff member is connected to a service at a location (§5.3, §5.6). Mirrors
	 * the `staffForService` scope test: a `staff_services.location_id` of `0` is the wildcard covering
	 * every location, so the row matches when it targets this exact location OR the wildcard. This is
	 * the concrete-staff eligibility guard the availability engine + reservation/reschedule write
	 * models apply so a staff member NOT assigned to a service can never be offered or booked for it
	 * (Codex engine review — the any-staff path already filtered by connection; the concrete path did
	 * not). Staff status is NOT checked here — the callers verify `active` separately.
	 *
	 * @param int $staff_id    Concrete staff id.
	 * @param int $service_id  Service id.
	 * @param int $location_id Location id (0 = no-location scope).
	 */
	public function isConnected( int $staff_id, int $service_id, int $location_id ): bool {
		$table = $this->wpdb->prefix . 'aponto_staff_services';
		$sql   = "SELECT 1 FROM {$table} WHERE staff_id = %d AND service_id = %d AND ( location_id = %d OR location_id = 0 ) LIMIT 1";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare(); in-transaction eligibility guard.
		return null !== $this->wpdb->get_var( $this->wpdb->prepare( $sql, $staff_id, $service_id, $location_id ) );
	}

	/**
	 * The eligibility assignments for a service (rest-contract §2.18, rev 2026-07-19 per-pair):
	 * the EXACT `(staff_id, location_id)` row set, ordered `(staff_id, location_id)` ascending.
	 * A `location_id` of `0` is the wildcard "all locations" — the wizard's default connect scope.
	 *
	 * @param int $service_id Service id.
	 * @return list<array{staff_id:int, location_id:int}>
	 */
	public function eligibilityForService( int $service_id ): array {
		$table = $this->wpdb->prefix . 'aponto_staff_services';
		$sql   = "SELECT staff_id, location_id FROM {$table} WHERE service_id = %d ORDER BY staff_id ASC, location_id ASC";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $service_id ), ARRAY_A );

		$assignments = array();
		foreach ( (array) $rows as $row ) {
			$assignments[] = array(
				'staff_id'    => (int) $row['staff_id'],
				'location_id' => (int) $row['location_id'],
			);
		}

		return $assignments;
	}

	/**
	 * Full-replacement of a service's eligibility (rest-contract §2.18 `PUT`, rev 2026-07-19):
	 * delete every row for the service, then insert EXACTLY the given `(staff_id, location_id)`
	 * pairs — per-pair, never a cross-product, so non-cartesian mappings survive round-trips.
	 *
	 * TRANSACTIONAL (Codex review #12): the delete and every insert run in ONE transaction with
	 * each statement's result checked; any failure rolls the whole replacement back and throws —
	 * the table is never left in a partial state.
	 *
	 * NOT SELF-SERIALIZING against reservations (Codex review, D-R28). Atomicity is not enough
	 * here: the reservation write model re-checks {@see self::isConnected()} inside its own
	 * transaction and then commits, so an unassign that lands in that window produces a booking for
	 * a staff member who is no longer eligible. The serialization lives one layer up, in
	 * {@see \Aponto\Rest\Controller\EligibilityController::replaceSerialized()}, which holds the
	 * per-service lock (`StaffLockFactory::forService()`) the reservation also holds — the same
	 * arrangement the service delete/archive path uses. Any OTHER caller that adds a write path to
	 * this method must take that lock too, or it reopens the race.
	 *
	 * @param int                                        $service_id  Service id.
	 * @param list<array{staff_id:int, location_id:int}> $assignments Distinct pairs ([] removes all).
	 * @throws StorageException When any statement fails (after rollback).
	 */
	public function replaceForService( int $service_id, array $assignments ): void {
		$table = $this->wpdb->prefix . 'aponto_staff_services';
		$guard = new TransactionGuard( $this->wpdb );

		$guard->begin();
		try {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Scoped full-replacement delete inside the transaction.
			$deleted = $this->wpdb->delete( $table, array( 'service_id' => $service_id ), array( '%d' ) );
			if ( false === $deleted ) {
				throw StorageException::fromWpdb( $this->wpdb, 'eligibility delete' );
			}

			foreach ( $assignments as $pair ) {
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Full-replacement insert inside the transaction.
				$inserted = $this->wpdb->insert(
					$table,
					array(
						'staff_id'    => (int) $pair['staff_id'],
						'service_id'  => $service_id,
						'location_id' => (int) $pair['location_id'],
					),
					array( '%d', '%d', '%d' )
				);
				if ( false === $inserted ) {
					throw StorageException::fromWpdb( $this->wpdb, 'eligibility insert' );
				}
			}

			$guard->commit();
		} catch ( StorageException $e ) {
			$guard->rollback();
			throw $e;
		}
	}
	/**
	 * Add one validated CSV assignment without removing existing pairs.
	 *
	 * Caller owns the staff/location/service locks and guarded transaction. Ignore is
	 * essential for SQLite: an expected duplicate must not abort that ambient transaction.
	 *
	 * @param int $service_id Service ID.
	 * @param int $staff_id Staff ID.
	 * @param int $location_id Location ID; zero is the business location.
	 * @return bool Whether a new pair was inserted.
	 * @throws StorageException On a database error.
	 */
	public function addForImport( int $service_id, int $staff_id, int $location_id ): bool {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- All identifiers and values are bound.
		$result = $this->wpdb->query( $this->wpdb->prepare( 'INSERT IGNORE INTO %i (staff_id,service_id,location_id) VALUES (%d,%d,%d)', $this->wpdb->prefix . 'aponto_staff_services', $staff_id, $service_id, $location_id ) );
		if ( false === $result ) {
			// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Stable exception message; raw SQL errors stay in exception properties.
			throw StorageException::fromWpdb( $this->wpdb, 'import eligibility' );
		}
		return 1 === $result;
	}
}

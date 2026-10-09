<?php
/**
 * Public `/public/services` controller (rest-contract §3.1).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Rest\Controller;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Booking\Repository\ConnectionRepository;
use Aponto\Plan;
use Aponto\Rest\Controller;
use Aponto\Rest\Data\PublicGateway;
use Aponto\Rest\Errors;
use Aponto\Rest\Policy;
use Aponto\Payments\PricingContext;
use Aponto\Rest\Services;
use Aponto\Rest\Support\Format;
use Aponto\Rest\Support\LocationResolution;
use Aponto\Rest\Support\PublicCache;
use Aponto\Rest\Support\PublicStaffProfile;
use Aponto\Support\StructuredAddress;
use WP_REST_Request;
use WP_REST_Response;

/**
 * The public active-service catalogue with categories. Unknown query params are rejected to keep the
 * allow-list tight (D-21). Only BOOKABLE services are published — see {@see self::bookable()}.
 *
 * Since D-R50 the payload may ALSO carry a staff roster (`staff[]` + per-item `staff_ids[]`),
 * and this controller is where that gate lives — not in the gateway, not in the widget. See
 * {@see self::roster()} for the three conditions and why each one is a condition.
 *
 * D-R51 adds the staff PUBLIC PROFILE to each roster entry — `title` and `avatar` — and both are
 * OMITTED when empty ({@see self::rosterEntry()}), so a site that has filled neither still emits
 * the exact bytes D-R50 emitted.
 *
 * D-R52 (phase 2) makes each published field answer to a site-wide switch and finally publishes
 * `bio` behind the one that defaults OFF. Three of the four new settings are visible here:
 * `booking.staff_photos` off OMITS `avatar` (so no gravatar.com URL, which carries core's hash of
 * the staff email, is published at all — the operator's third way out of the D-R51 disclosure),
 * `booking.staff_titles` off OMITS `title`, and `booking.staff_profiles` on publishes `bio` for
 * the staff who filled one. `booking.staff_layout` is presentation and never touches this payload:
 * it rides the page-global widget config instead ({@see \Aponto\Frontend\BlockRegistrar::config()}).
 *
 * D-R61 adds the LOCATION roster the same way — `locations[]`, per-item `location_ids[]` and
 * per-item `location_staff_ids`, all three omitted entirely unless the D-R50-shaped gate in
 * {@see self::locationRoster()} opens, so Free, a module-off Premium site, `location_choice =
 * first` and a single-location site all emit the exact bytes they emitted before.
 */
final class PublicServicesController implements Controller {

	/**
	 * WP-internal query params tolerated on the public allow-list.
	 *
	 * @var list<string>
	 */
	private const ALLOWED_PARAMS = array( '_locale', '_envelope', '_method', '_wpnonce', '_embed', '_fields', 'context', 'rest_route' );

	/**
	 * Public read gateway.
	 *
	 * @var PublicGateway
	 */
	private PublicGateway $gateway;

	/**
	 * Construct the controller.
	 *
	 * @param Services $services Service locator.
	 */
	public function __construct( private Services $services ) {
		$this->gateway = new PublicGateway( $services->wpdb() );
	}

	/**
	 * Register routes.
	 *
	 * @param string $rest_namespace REST namespace.
	 */
	public function register( string $rest_namespace ): void {
		register_rest_route(
			$rest_namespace,
			'/public/services',
			array(
				'methods'             => 'GET',
				'permission_callback' => '__return_true',
				'callback'            => array( $this, 'index' ),
			)
		);
	}

	/**
	 * GET /public/services.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function index( WP_REST_Request $request ) {
		foreach ( array_keys( $request->get_query_params() ) as $param ) {
			if ( ! in_array( $param, self::ALLOWED_PARAMS, true ) ) {
				return Errors::validation( array( $param => __( 'Unexpected parameter.', 'aponto' ) ) );
			}
		}

		$currency = (string) $this->services->settings()->get( 'currency' );
		$services = $this->bookable( $this->gateway->activeServices() );

		// Counted over the services actually PUBLISHED (T-073), so a category never claims a
		// service the list below does not carry.
		$count_by_id = array();
		foreach ( $services as $service ) {
			$category_id = Format::intOrNull( $service['category_id'] );
			if ( null !== $category_id ) {
				$count_by_id[ $category_id ] = ( $count_by_id[ $category_id ] ?? 0 ) + 1;
			}
		}

		$categories  = $this->gateway->categories();
		$name_by_id  = array();
		$category_dt = array();
		foreach ( $categories as $category ) {
			$name_by_id[ (int) $category['id'] ] = (string) $category['name'];
			$category_dt[]                       = array(
				'id'       => (int) $category['id'],
				'name'     => (string) $category['name'],
				'position' => (int) $category['position'],
				'count'    => $count_by_id[ (int) $category['id'] ] ?? 0,
			);
		}

		$locations = $this->locationRoster( $services );
		// The staff roster's scope follows the location roster (D-R61): the UNION over every
		// active branch while a Location step exists, the wildcard `0` exactly as before when not.
		$roster = $this->roster( $services, null !== $locations );

		$items = array();
		foreach ( $services as $service ) {
			$service_id  = (int) $service['id'];
			$category_id = Format::intOrNull( $service['category_id'] );
			$item        = array(
				'id'               => $service_id,
				'name'             => (string) $service['name'],
				'description'      => (string) $service['description'],
				'duration_minutes' => (int) $service['duration_minutes'],
				'price_minor'      => Format::intOrNull( $service['price_minor'] ),
				'currency'         => $currency,
				'category'         => ( null !== $category_id && isset( $name_by_id[ $category_id ] ) )
					? array(
						'id'   => $category_id,
						'name' => $name_by_id[ $category_id ],
					)
					: null,
			);

			// Same rule, one feature later (D-R61): OMITTED ENTIRELY unless the location roster
			// is published. A service no active location serves gets `[]` — it is still in the
			// catalogue, and the widget must be able to tell "nowhere" from "not asked".
			if ( null !== $locations ) {
				$item['location_ids'] = $locations['by_service'][ $service_id ] ?? array();
			}

			// OMITTED ENTIRELY, not `[]` (D-R50): on Free and on single-staff Premium the payload
			// has to stay byte-identical to what it was before this feature existed.
			if ( null !== $roster ) {
				$item['staff_ids'] = $roster['by_service'][ $service_id ] ?? array();
			}

			// Per (service, branch) staff — D-R61 fix round 2. Narrowing by a per-STAFF location
			// list was wrong: someone who does Cut at Main and Color at Uptown would be offered
			// for Cut at Uptown and answer 409. Published whenever the LOCATION roster is,
			// independent of the D-R50 staff gate (review round 3): a block preset `staffId` must
			// know which branches its person works at even on a site that never asks the customer
			// to choose staff. Without `staff[]` the ids are plain numbers — no names, no profile.
			if ( null !== $locations ) {
				$item['location_staff_ids'] = $this->locationStaffIds( $locations['location_staff'][ $service_id ] ?? array() );
			}

			$price = \Aponto\Payments\OrderPrice::base( $item['price_minor'], $currency );
			$terms = \Aponto\Payments\OrderPricing::terms( $price, PricingContext::forSite( PricingContext::SCOPE_PREVIEW, $service_id, $currency, $this->services->settings() ) );
			if ( $terms->isDeposit() ) {
				$item['payment_terms'] = $terms->preview( $price );
			}
			$items[] = $item;
		}

		$body = array(
			'items'      => $items,
			'categories' => $category_dt,
		);
		if ( null !== $roster ) {
			$body['staff'] = array_map( array( $this, 'rosterEntry' ), $roster['staff'] );
		}
		if ( null !== $locations ) {
			$body['locations'] = array_map(
				static fn ( array $location ): array => array(
					'id'      => $location['id'],
					'name'    => $location['name'],
					// The one-line display form the booking response already prints for this
					// location (§3.3), so the step and the confirmation cannot word it
					// differently. `timezone` and `status` are deliberately absent: the branch
					// clock is the server's job (§3.2). `phone` is the branch's PUBLIC number,
					// shown by the summary's contact-help line (founder review 2026-09-30).
					'address' => StructuredAddress::display( $location ),
					'phone'   => $location['phone'],
				),
				$locations['locations']
			);
		}

		// NEVER storable (fix round 1): WordPress sends no cache headers on an anonymous REST
		// response, so a CDN or page cache would keep serving a payload whose D-R52 privacy
		// gates — the Gravatar URL behind "Show staff photos", the `bio` behind "Let customers
		// view staff profiles" — the operator has since switched OFF. {@see PublicCache}.
		return PublicCache::noStore( new WP_REST_Response( $body, 200 ) );
	}

	/**
	 * The active services a customer can actually book: the ones at least one ACTIVE staff member
	 * is assigned to (persona QA 2026-10-05, T-073).
	 *
	 * A service nobody performs was listed with its price, and choosing it led to a calendar with
	 * every day greyed out and no explanation — a dead end the customer could not tell from "fully
	 * booked". It is the operator's unfinished setup, not an offer, so it is not published. The
	 * service row itself is untouched: assigning a staff member publishes it on the next read.
	 *
	 * @param list<array<string, mixed>> $services Active service rows.
	 * @return list<array<string, mixed>>
	 */
	private function bookable( array $services ): array {
		if ( array() === $services ) {
			return array();
		}

		$staffed = array_flip( ( new ConnectionRepository( $this->services->wpdb() ) )->staffedServiceIds() );

		return array_values(
			array_filter(
				$services,
				static fn ( array $service ): bool => isset( $staffed[ (int) $service['id'] ] )
			)
		);
	}

	/**
	 * The staff member roster this site publishes to the booking form, or `null` to publish none
	 * (D-R50).
	 *
	 * THREE conditions, all required, and the order they are tested in is the cheap-first order:
	 *
	 *   1. `Plan::has( 'multi_staff' )` — the same direct module gate the assignment and
	 *      notification paths use (D-R42's recorded exception: staff STORAGE is uncapped, the
	 *      capability is gated). A Free site runs none of the SQL below.
	 *   2. `booking.staff_choice === 'visitor'` — the owner's own answer. `any` means "always
	 *      assign automatically", so there is nothing for the customer to choose and nothing to
	 *      publish.
	 *   3. at least TWO distinct active staff eligible for at least one active service. One
	 *      staff member is not a choice, it is a fact, and a step that asks a question with one
	 *      answer is friction (the same reasoning that skips the Service step for a lone service,
	 *      SPEC-P1 §2.2 addendum B1).
	 *
	 * SUPERSEDED IN PART by D-R51 (founder 2026-09-20, later the same day): the entry now also
	 * carries the operator-authored PUBLIC PROFILE — job title and photo — because "name only"
	 * rows read as generic. Email, phone, schedule and BIO are still never published, and the
	 * published fields are opt-in per field: an empty one is omitted from the wire entirely
	 * (docs/privacy-inventory.md). `is_public = 0` staff are excluded from the roster altogether
	 * by the reader below, which is also what makes the ≥2 test read the PUBLIC set.
	 *
	 * No caching — this is the same read the reservation path will resolve against, and a stale
	 * roster offers somebody who is no longer there.
	 *
	 * **D-R61 scope.** While the location roster is published the reader runs at the UNION scope
	 * (`null` — every active location), so a staff member who works at one branch only is in
	 * `staff[]` and the widget narrows by `location_staff_ids`; the ≥2 test below then reads that
	 * union set. Otherwise it runs at `0` exactly as D-R50 shipped, so the payload is
	 * byte-identical (rest-contract §3.1 addendum 2026-09-23, corrected after implementation).
	 *
	 * @param list<array<string, mixed>> $services     Active service rows.
	 * @param bool                       $every_branch Whether the location roster is published.
	 * @return array{staff: list<array{id:int, name:string, first_name:string, last_name:string}>, by_service: array<int, list<int>>}|null
	 */
	private function roster( array $services, bool $every_branch = false ): ?array {
		if ( ! Plan::instance()->has( 'multi_staff' ) ) {
			return null;
		}
		// `visitor` OFFERS the choice, `required` DEMANDS it — both ask the same question and
		// therefore need the same roster. Only `any` ("always assign automatically") has nothing
		// to publish (D-R50; `required` added by D-R52).
		if ( ! in_array( (string) $this->services->settings()->get( 'booking.staff_choice' ), array( 'visitor', 'required' ), true ) ) {
			return null;
		}
		if ( array() === $services ) {
			return null;
		}

		// Location `0` (or, with a Location step, the union of every active branch — D-R61) is the
		// scope the any-staff engine would offer at, so the roster matches what it would offer. The
		// reader scopes itself to ACTIVE services with the same `status = 'active'` test that
		// produced `$services`, so no id list is bound (fix round 1 — an unbounded `IN` list is a
		// silent failure on a large catalogue under SQLite's bind-variable ceiling).
		// The bio gate is passed INTO the reader rather than applied to its result (D-R52): with
		// "Let customers view staff profiles" off the column is not in the SELECT list, so
		// the text never enters PHP memory on the public path and no later branch can leak it.
		$roster = ( new ConnectionRepository( $this->services->wpdb() ) )
			->rosterForActiveServices( $every_branch ? null : 0, $this->profilesPublished() );

		return count( $roster['staff'] ) >= 2 ? $roster : null;
	}

	/**
	 * The location roster this site publishes to the booking form, or `null` to publish none
	 * (D-R61, rest-contract §3.1 addendum 2026-09-23).
	 *
	 * The mirror of {@see self::roster()}: the two query-free conditions first
	 * ({@see LocationResolution::rosterAsked()} — `Plan::has( 'multi_location' )`, then
	 * `booking.location_choice === 'visitor'`), then ONE bulk read, then the threshold — at least
	 * {@see LocationResolution::MIN_ROSTER_LOCATIONS} active locations serving an active service.
	 * The gate's conditions live in {@see LocationResolution} rather than here because
	 * `POST /public/bookings` must reach the same verdict to know whether a null `location_id`
	 * is a missing argument; one definition, two callers.
	 *
	 * No caching, for the reason {@see self::roster()} gives: a stale roster offers a branch that
	 * has since been archived.
	 *
	 * **Hostile-client cost, stated (review round 3).** This route has NO rate-limit bucket, and
	 * with the location roster published each request reads the connection table twice at
	 * `O(C)` — the union staff roster and the serving triples — plus `O(L)` for the branches, and
	 * serializes `services × branches × public staff` ids. Bounded by the site's own data, never
	 * by the request, but repeatable at will; a `catalogue_ip` bucket is logged as a follow-up
	 * (handoff §5), deliberately not added in this slice.
	 *
	 * @param list<array<string, mixed>> $services Active service rows.
	 * @return array{locations: list<array{id:int, name:string, address_line1:string, address_line2:string, city:string, region:string, postal_code:string, country:string, phone:string}>, by_service: array<int, list<int>>, location_staff: array<int, array<int, list<int>>>}|null
	 */
	private function locationRoster( array $services ): ?array {
		if ( ! LocationResolution::rosterAsked( $this->services->settings() ) ) {
			return null;
		}
		if ( array() === $services ) {
			return null;
		}

		$roster = ( new ConnectionRepository( $this->services->wpdb() ) )->locationRoster();

		return count( $roster['locations'] ) >= LocationResolution::MIN_ROSTER_LOCATIONS ? $roster : null;
	}

	/**
	 * One item's `location_staff_ids` (D-R61 fix round 2): `{ "<location_id>": [staff ids] }`
	 * for every branch in the item's `location_ids`, each list the PUBLIC staff eligible for THIS
	 * service at THAT branch (wildcard or that branch's own row) in `(position, id)` order — the
	 * widget reads the Staff step's choices straight from it (and filters a block preset by it).
	 * A branch served only by hidden staff maps to `[]`.
	 *
	 * Always a JSON OBJECT: an empty map is `{}`, never `[]`, so a client can index it by id
	 * without first checking its type.
	 *
	 * @param array<int, list<int>> $by_location Public staff ids per location id.
	 * @return array<int, list<int>>|\stdClass
	 */
	private function locationStaffIds( array $by_location ) {
		return array() === $by_location ? new \stdClass() : $by_location;
	}

	/**
	 * One wire entry of `staff[]` (D-R51).
	 *
	 * **Empty keys are OMITTED, not emitted as `""`/`null`.** That is the same rule the whole
	 * roster follows (D-R50: both keys omitted entirely rather than published empty), applied one
	 * level down — so a Premium multi-staff site that has never opened the new fields produces a
	 * payload byte-identical to the one it produced yesterday, and a client written against
	 * D-R50 cannot tell this release happened. It also keeps the public disclosure honest: a key
	 * that is present is a key the operator filled in on purpose.
	 *
	 * **`bio` is here only behind "Let customers view staff profiles"** (D-R52), which
	 * defaults OFF. With the switch off the reader does not even select the column, so the key
	 * cannot appear; with it on, an empty bio is still omitted like every other optional key.
	 * Showing a customer a staff member's DETAILS is a per-business decision, and publishing the
	 * text while hiding it client-side would be the same disclosure with a curtain in front.
	 *
	 * **`title` and `avatar` are each behind their own switch too** — `booking.staff_titles` and
	 * `booking.staff_photos`. "Show photos" off is the one with teeth beyond paint: it removes
	 * the Gravatar URL, and with it the hash of the staff email, from the wire entirely.
	 *
	 * `email` and `wp_user_id` are present on the input and DELIBERATELY absent from the output:
	 * they exist only so the avatar chain can resolve a Gravatar, and a staff address is PII
	 * that never goes public (docs/privacy-inventory.md).
	 *
	 * `first_name` / `last_name` ride beside `name` under the SAME gates (name split, D-R69): the
	 * roster exists only where `name` does, so the parts publish nothing `name` did not.
	 *
	 * @param array{id:int, name:string, first_name:string, last_name:string, title:string, bio?:string, avatar_id:int|null, email:string, wp_user_id:int|null} $member Roster row.
	 * @return array<string, mixed>
	 */
	private function rosterEntry( array $member ): array {
		// The name, its parts, the title and the avatar come from the ONE public-profile
		// serializer the one-page host line also uses (D-R85), so the two can never disagree.
		// "Show photos" off removes the avatar from the WIRE, not just from the paint (D-R52):
		// the Gravatar leg of the chain publishes a URL containing core's hash of the staff
		// email, so hiding the circle client-side would leave the disclosure intact. Key order
		// (`id` first) is the order this payload has always had.
		$entry = array( 'id' => (int) $member['id'] ) + PublicStaffProfile::entry(
			$member,
			(bool) $this->services->settings()->get( 'booking.staff_titles' ),
			(bool) $this->services->settings()->get( 'booking.staff_photos' )
		);

		// `bio` exists on the row only when the gate is on, and even then an empty one is
		// omitted like every other optional key — so switching the opt-in on never publishes an
		// empty string for a colleague who left the field blank (D-R52).
		if ( isset( $member['bio'] ) ) {
			$bio = trim( (string) $member['bio'] );
			if ( '' !== $bio ) {
				$entry['bio'] = $bio;
			}
		}

		return $entry;
	}

	/**
	 * Whether this site publishes staff bios (D-R52, `booking.staff_profiles`).
	 *
	 * Defaults OFF, deliberately: publishing a person's write-up is a business decision, not a
	 * layout one, and plenty of clinics and salons will never want it. Kept as its own reader
	 * because it is consulted BEFORE the query (it changes the SELECT list) rather than while
	 * serializing a row.
	 */
	private function profilesPublished(): bool {
		return (bool) $this->services->settings()->get( 'booking.staff_profiles' );
	}
}

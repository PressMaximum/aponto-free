<?php
/**
 * Demo fixture seeder for `wp aponto seed`.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Cli;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Availability\SlotQuery;
use Aponto\Availability\TimezoneConverter;
use Aponto\Booking\Repository\OrderRepository;
use Aponto\Database\TransactionGuard;
use Aponto\Rest\Services;
use Aponto\Support\Clock;
use Aponto\Support\Settings;

/**
 * Seeds a coherent demo dataset (categories, services, staff with weekly hours, a customer and a
 * few future bookings with orders) so a fresh install has something to explore. All writes are
 * direct inserts against the Aponto tables; bookings use location 0 because locations are optional
 * and activation seeds only the notification templates.
 *
 * Demo bookings are placed in BUSINESS-LOCAL WORKING TIME (beta bug): every seeded booking used to
 * be written at `02:00` of the seeder's own UTC clock, which is outside the fixture's own Mon–Fri
 * 09:00–17:00 hours and outside the admin calendar's visible window — so a freshly seeded site
 * showed three rows in the Bookings list and an EMPTY calendar.
 *
 * Their times are not computed here at all: each demo appointment takes a slot the AVAILABILITY
 * ENGINE actually offers for that staff member, service and day (Codex review). Hand-stepping the
 * clock inside hardcoded hours was wrong the moment a service was reused with a different slot step,
 * duration or buffers — `wp aponto seed` reuses services by name — and it produced starts the
 * engine would never emit, with a busy envelope that did not match the service. Asking the engine
 * also gets closed days, lead time, horizon and existing bookings right for free.
 *
 * Each booking and its order graph is written in ONE transaction ({@see TransactionGuard}, the same
 * cross-engine helper the reservation path uses): a failure half-way used to leave a booking with no
 * order behind, and the natural-key rerun path would then skip it forever. The rerun path repairs a
 * booking whose order went missing rather than walking past it.
 */
final class Fixtures {

	/**
	 * The most extra staff members `wp aponto seed --staff=<n>` will create. A QA aid, not a load
	 * generator: five is enough to exercise any-staff aggregation, the calendar's staff selector
	 * and partial service maps without turning the demo data into noise.
	 */
	public const MAX_STAFF = 5;

	/**
	 * The primary member's weekly window — ISO weekdays and the open minute range. Named rather
	 * than inlined because the demo BOOKINGS are placed against it: the seeded appointments must
	 * fall on a day this member works and inside the hours they work, or the demo contradicts
	 * itself the moment anyone opens the calendar.
	 *
	 * @var list<int>
	 */
	private const PRIMARY_WEEKDAYS = array( 1, 2, 3, 4, 5 );

	/** Primary member's opening minute of day (09:00). */
	private const PRIMARY_START_MINUTE = 540;

	/** Primary member's closing minute of day (17:00). */
	private const PRIMARY_END_MINUTE = 1020;

	/** How far the search for an offered slot may walk before the seed gives up. */
	private const SLOT_SEARCH_DAYS = 14;

	/**
	 * The demo appointments: days ahead and the business-local start minute. Spread across three
	 * different days and three different times of day (10:00, 13:30, 15:00) so the calendar has
	 * something to show in both week and day view, and every one of them ends before 17:00 for the
	 * longest service seeded (Coloring, 120 minutes).
	 *
	 * @var list<array{offset:int, minute:int}>
	 */
	private const BOOKING_PLAN = array(
		array(
			'offset' => 3,
			'minute' => 600,
		),
		array(
			'offset' => 7,
			'minute' => 810,
		),
		array(
			'offset' => 12,
			'minute' => 900,
		),
	);

	/**
	 * The extra staff members, in order. Each carries its own weekday window and its own slice of
	 * the catalog so any-staff availability has something REAL to aggregate: overlapping-but-
	 * different hours, and services only some of them can take. A uniform team would have made
	 * every any-staff answer identical to the single-staff one and proved nothing.
	 *
	 * `services` is a list of catalog INDEXES into the service list seeded below; `weekdays` is
	 * ISO 1..7. Member 4 works the weekend, which is when a schedule bug is most visible.
	 *
	 * @var list<array{name:string, email:string, weekdays:list<int>, start:int, end:int, services:list<int>}>
	 */
	private const EXTRA_STAFF = array(
		array(
			'name'     => 'Blair Colorist',
			'email'    => 'blair@example.com',
			'weekdays' => array( 1, 2, 3, 4, 5 ),
			'start'    => 660,
			'end'      => 1140,
			'services' => array( 0, 1 ),
		),
		array(
			'name'     => 'Casey Nails',
			'email'    => 'casey@example.com',
			'weekdays' => array( 2, 3, 4, 5, 6 ),
			'start'    => 540,
			'end'      => 960,
			'services' => array( 2, 3 ),
		),
		array(
			'name'     => 'Devon Junior',
			'email'    => 'devon@example.com',
			'weekdays' => array( 1, 3, 5 ),
			'start'    => 600,
			'end'      => 840,
			'services' => array( 0 ),
		),
		array(
			'name'     => 'Emery Weekend',
			'email'    => 'emery@example.com',
			'weekdays' => array( 6, 7 ),
			'start'    => 600,
			'end'      => 1080,
			'services' => array( 0, 2, 3 ),
		),
		array(
			'name'     => 'Frankie Senior',
			'email'    => 'frankie@example.com',
			'weekdays' => array( 1, 2, 3, 4, 5 ),
			'start'    => 480,
			'end'      => 780,
			'services' => array( 1, 3 ),
		),
	);

	/**
	 * The business timezone demo bookings are placed in — resolved exactly as the ENGINE resolves
	 * it (location 0, i.e. the site timezone on a fresh install where locations are optional and
	 * none exist). It is deliberately not injectable: the seeder reads slots the engine computes,
	 * so a seeder-only timezone would describe those slots in a zone the engine never used.
	 *
	 * @var \DateTimeZone
	 */
	private \DateTimeZone $business_tz;

	/**
	 * Wall clock <-> UTC instant, the same converter the reservation path uses (§5.4).
	 *
	 * @var TimezoneConverter
	 */
	private TimezoneConverter $converter;

	/**
	 * Site settings — read for the order currency, exactly as the reservation path does.
	 *
	 * @var Settings
	 */
	private Settings $settings;

	/**
	 * The application service graph: the availability engine that decides which slots exist, the
	 * service definitions the engine reads, and the order writer the booking path uses. Sharing it
	 * is the point — a demo row must be the same shape as a booked one.
	 *
	 * @var Services
	 */
	private Services $services;

	/**
	 * The order writer the REAL booking path uses, so a demo order is byte-identical in shape to a
	 * booked one: `AP-` code from the shared alphabet with collision retries, `payment_status`
	 * `none`, and the unpriced-item semantics of {@see OrderRepository::createWithItem()}.
	 *
	 * @var OrderRepository
	 */
	private OrderRepository $orders;

	/**
	 * Cross-engine transaction helper (MySQL and the SQLite drop-in, D-R20).
	 *
	 * @var TransactionGuard
	 */
	private TransactionGuard $tx;

	/**
	 * Construct the seeder.
	 *
	 * @param \wpdb         $wpdb     Database handle.
	 * @param Clock         $clock    Clock.
	 * @param Settings|null $settings Settings reader; a plain one when omitted.
	 */
	public function __construct(
		private \wpdb $wpdb,
		private Clock $clock,
		?Settings $settings = null
	) {
		$this->settings    = $settings ?? new Settings();
		$this->services    = new Services( $wpdb, $this->settings, $clock );
		$this->business_tz = $this->services->businessTimezone()->forLocation( 0 );
		$this->converter   = $this->services->converter();
		$this->orders      = $this->services->orderRepository();
		$this->tx          = new TransactionGuard( $wpdb );
	}

	/**
	 * Seed the demo dataset.
	 *
	 * @param int $staff_count Total staff to seed, clamped to 1..{@see self::MAX_STAFF}.
	 * @return array{categories:int, services:int, staff:int, bookings:int}
	 */
	public function seed( int $staff_count = 1 ): array {
		$now = $this->clock->nowSql();

		// BUSINESS hours first (`staff_id = 0`, the wildcard scope every staff member inherits —
		// SPEC-P1 1.3). Production sets these in the onboarding wizard; `wp aponto seed` skips the
		// wizard entirely, so without this a seeded demo site had NO business hours at all: Settings
		// showed the whole week Closed and a staff member with no weekly rows of their own inherited
		// that same closed week in the staff editor (beta report 2026-09-17). Mon-Fri 09:00-17:00 is
		// the wizard's own default ({@see \Aponto\Onboarding\WizardService}), so the seeded site now
		// starts where a wizard-completed site starts.
		$this->weeklyHours( 0 );

		$hair  = $this->insertCategory( 'Hair', 0 );
		$nails = $this->insertCategory( 'Nails', 1 );

		$services   = array();
		$services[] = $this->insertService( 'Haircut', $hair, 60, 15000, $now );
		$services[] = $this->insertService( 'Coloring', $hair, 120, 45000, $now );
		$services[] = $this->insertService( 'Manicure', $nails, 45, 20000, $now );
		$services[] = $this->insertService( 'Pedicure', $nails, 60, 25000, $now );

		// The primary member keeps the original shape exactly: every service, Mon–Fri 9–5. A seed
		// without `--staff` must produce the dataset it always produced.
		$staff = $this->insertStaff( 'Alex Stylist', 'alex@example.com', $now );
		foreach ( $services as $service_id ) {
			$this->connect( $staff, $service_id );
		}
		$this->weeklyHours( $staff );

		$extra = max( 0, min( self::MAX_STAFF, $staff_count ) - 1 );
		for ( $i = 0; $i < $extra; $i++ ) {
			$spec = self::EXTRA_STAFF[ $i ];
			$id   = $this->insertStaff( $spec['name'], $spec['email'], $now );
			// Every index in EXTRA_STAFF addresses one of the four services seeded above; PHPStan
			// proves the offsets, so a defensive isset() here would be unreachable code.
			foreach ( $spec['services'] as $index ) {
				$this->connect( $id, $services[ $index ] );
			}
			$this->weeklyHours( $id, $spec['weekdays'], $spec['start'], $spec['end'] );
		}

		$customer = $this->insertCustomer( 'Sample Customer', 'sample.customer@example.com', $now );
		$bookings = 0;
		$planned  = 0;
		foreach ( self::BOOKING_PLAN as $slot ) {
			// The count REPORTED is the count that exists, never the count that was planned: a
			// booking the engine could not place must not be summarised as seeded (Codex review).
			if ( $this->insertBooking( $services[ $planned % count( $services ) ], $staff, $customer, $slot['offset'], $slot['minute'], $now ) ) {
				++$bookings;
			}
			++$planned;
		}

		return array(
			'categories' => 2,
			'services'   => count( $services ),
			'staff'      => 1 + $extra,
			'bookings'   => $bookings,
		);
	}

	/**
	 * Insert a category.
	 *
	 * @param string $name     Name.
	 * @param int    $position Position.
	 */
	private function insertCategory( string $name, int $position ): int {
		$table = $this->wpdb->prefix . 'aponto_service_categories';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared -- CLI fixture natural-key lookup.
		$id = (int) $this->wpdb->get_var( $this->wpdb->prepare( "SELECT id FROM {$table} WHERE name = %s LIMIT 1", $name ) );
		if ( $id > 0 ) {
			return $id;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- CLI fixture insert.
		$this->wpdb->insert(
			$table,
			array(
				'name'     => $name,
				'position' => $position,
			),
			array( '%s', '%d' )
		);

		return (int) $this->wpdb->insert_id;
	}

	/**
	 * Insert a service.
	 *
	 * @param string $name     Name.
	 * @param int    $category Category id.
	 * @param int    $duration Duration minutes.
	 * @param int    $price    Price minor.
	 * @param string $now      Timestamp.
	 */
	private function insertService( string $name, int $category, int $duration, int $price, string $now ): int {
		$table = $this->wpdb->prefix . 'aponto_services';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared -- CLI fixture natural-key lookup.
		$id = (int) $this->wpdb->get_var( $this->wpdb->prepare( "SELECT id FROM {$table} WHERE name = %s LIMIT 1", $name ) );
		if ( $id > 0 ) {
			return $id;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- CLI fixture insert.
		$this->wpdb->insert(
			$table,
			array(
				'category_id'      => $category,
				'name'             => $name,
				'description'      => 'Demo service seeded by wp aponto seed.',
				'duration_minutes' => $duration,
				'price_minor'      => $price,
				'status'           => 'active',
				'created_at'       => $now,
				'updated_at'       => $now,
			),
			array( '%d', '%s', '%s', '%d', '%d', '%s', '%s', '%s' )
		);

		return (int) $this->wpdb->insert_id;
	}

	/**
	 * Insert a staff member.
	 *
	 * This dev-only seeder (`wp aponto seed`) keeps a plain idempotent insert with natural-key reuse.
	 * REST staff storage is also uncapped (D-R42); onboarding alone uses the bounded helper because
	 * its first-owner create-or-adopt flow must converge under a double submission.
	 *
	 * @param string $name  Name.
	 * @param string $email Email.
	 * @param string $now   Timestamp.
	 */
	private function insertStaff( string $name, string $email, string $now ): int {
		$table = $this->wpdb->prefix . 'aponto_staff';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared -- CLI fixture natural-key lookup.
		$id = (int) $this->wpdb->get_var( $this->wpdb->prepare( "SELECT id FROM {$table} WHERE email = %s LIMIT 1", $email ) );
		if ( $id > 0 ) {
			return $id;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- CLI fixture insert.
		$this->wpdb->insert(
			$table,
			array(
				'type'       => 'human',
				'name'       => $name,
				'email'      => $email,
				'status'     => 'active',
				'created_at' => $now,
				'updated_at' => $now,
			),
			array( '%s', '%s', '%s', '%s', '%s', '%s' )
		);

		return (int) $this->wpdb->insert_id;
	}

	/**
	 * Connect a staff member to a service (wildcard location).
	 *
	 * @param int $staff   Staff id.
	 * @param int $service Service id.
	 */
	private function connect( int $staff, int $service ): void {
		$table = $this->wpdb->prefix . 'aponto_staff_services';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared -- CLI fixture natural-key lookup.
		$exists = (int) $this->wpdb->get_var( $this->wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE staff_id = %d AND service_id = %d AND location_id = 0", $staff, $service ) );
		if ( $exists > 0 ) {
			return;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- CLI fixture insert.
		$this->wpdb->insert(
			$table,
			array(
				'staff_id'    => $staff,
				'service_id'  => $service,
				'location_id' => 0,
			),
			array( '%d', '%d', '%d' )
		);
	}

	/**
	 * Insert weekly hours for a staff member (wildcard service/location). Defaults to the original
	 * Mon–Fri 09:00–17:00 window, so an unparameterised call behaves exactly as it always did.
	 *
	 * Staff id `0` is the BUSINESS-hours scope rather than a staff member, and is written the same
	 * way: the schedule table keys on `staff_id` and reserves 0 for the wildcard every member
	 * inherits, so no separate insert path is needed for it.
	 *
	 * @param int            $staff    Staff id, or 0 for the inherited business hours.
	 * @param list<int>|null $weekdays ISO weekdays (1 = Monday); primary window when null.
	 * @param int|null       $start    Start minute of day; primary window when null.
	 * @param int|null       $end      End minute of day; primary window when null.
	 */
	private function weeklyHours( int $staff, ?array $weekdays = null, ?int $start = null, ?int $end = null ): void {
		$weekdays = $weekdays ?? self::PRIMARY_WEEKDAYS;
		$start    = $start ?? self::PRIMARY_START_MINUTE;
		$end      = $end ?? self::PRIMARY_END_MINUTE;

		$table = $this->wpdb->prefix . 'aponto_schedules';
		foreach ( $weekdays as $weekday ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared -- CLI fixture natural-key lookup.
			$exists = (int) $this->wpdb->get_var( $this->wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE staff_id = %d AND service_id = 0 AND location_id = 0 AND weekday = %d AND date_override IS NULL AND start_minute = %d AND end_minute = %d", $staff, $weekday, $start, $end ) );
			if ( $exists > 0 ) {
				continue;
			}

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- CLI fixture insert.
			$this->wpdb->insert(
				$table,
				array(
					'staff_id'     => $staff,
					'service_id'   => 0,
					'location_id'  => 0,
					'weekday'      => $weekday,
					'start_minute' => $start,
					'end_minute'   => $end,
				),
				array( '%d', '%d', '%d', '%d', '%d', '%d' )
			);
		}
	}

	/**
	 * Insert a customer.
	 *
	 * @param string $name  Name.
	 * @param string $email Email.
	 * @param string $now   Timestamp.
	 */
	private function insertCustomer( string $name, string $email, string $now ): int {
		$table      = $this->wpdb->prefix . 'aponto_customers';
		$email_norm = strtolower( trim( $email ) );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared -- CLI fixture natural-key lookup.
		$id = (int) $this->wpdb->get_var( $this->wpdb->prepare( "SELECT id FROM {$table} WHERE email_norm = %s LIMIT 1", $email_norm ) );
		if ( $id > 0 ) {
			return $id;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- CLI fixture insert.
		$this->wpdb->insert(
			$table,
			array(
				'name'       => $name,
				'email'      => $email,
				'email_norm' => $email_norm,
				'note'       => '',
				'created_at' => $now,
			),
			array( '%s', '%s', '%s', '%s', '%s' )
		);

		return (int) $this->wpdb->insert_id;
	}

	/**
	 * The first slot the AVAILABILITY ENGINE offers at or after the planned wall clock.
	 *
	 * The engine is the only authority on which starts exist: it applies the service's own slot
	 * step, duration and buffers, the staff member's resolved schedule, blocked periods, existing
	 * bookings, lead time and horizon, and it drops wall clocks that do not exist (a DST gap, or a
	 * whole skipped day such as Pacific/Apia's 2011-12-30). Hand-stepping 30 minutes inside a
	 * hardcoded 09:00–17:00 agreed with it only for a pristine fixture — reuse a service with a
	 * 45-minute step or buffers, as a re-seed does, and the demo booking landed on a start the
	 * engine never emits (Codex review).
	 *
	 * Closed days need no special case any more: a closed day simply offers nothing, and the search
	 * walks to the next one.
	 *
	 * @param int $service      Service id.
	 * @param int $staff        Staff id.
	 * @param int $day_offset   Days ahead of today, business-local.
	 * @param int $start_minute Preferred start minute of day.
	 * @return array{date:string, start_minute:int, end_minute:int, start:\DateTimeImmutable, end:\DateTimeImmutable, service:\Aponto\Availability\ServiceDefinition}|null
	 *         The chosen slot, or null when the search window offers none.
	 */
	private function resolveSlot( int $service, int $staff, int $day_offset, int $start_minute ): ?array {
		$definition = $this->services->serviceRepository()->find( $service );
		if ( null === $definition ) {
			return null;
		}

		$day = $this->clock->now()
			->setTimezone( $this->business_tz )
			->modify( '+' . $day_offset . ' days' );

		for ( $i = 0; $i < self::SLOT_SEARCH_DAYS; $i++, $day = $day->modify( '+1 day' ) ) {
			$date    = $day->format( 'Y-m-d' );
			$grouped = $this->services->engine()->get_slots( new SlotQuery( $service, $staff, 0, $date, $date ) );

			// The preferred time of day is honoured on EVERY candidate day — that spread is the
			// point of the three demo bookings — and only a day that offers nothing at or after it
			// falls back to its first free slot.
			$slots = $grouped[ $date ] ?? array();
			$after = array_values( array_filter( $slots, static fn ( $candidate ): bool => $candidate->start_minute >= $start_minute ) );

			foreach ( array() !== $after ? $after : $slots as $slot ) {
				$wall       = $this->converter->instantToWall( $slot->start_utc, $this->business_tz );
				$end_minute = $wall['minute'] + $definition->duration_minutes;
				$end        = $this->converter->endInstant( $wall['date'], $end_minute, $this->business_tz );
				if ( null === $end ) {
					continue;
				}

				return array(
					'date'         => $wall['date'],
					'start_minute' => $wall['minute'],
					'end_minute'   => $end_minute,
					'start'        => $slot->start_utc,
					'end'          => $end,
					'service'      => $definition,
				);
			}
		}

		return null;
	}

	/**
	 * Insert a future booking with its order, atomically.
	 *
	 * The appointment takes a slot the availability engine offers ({@see self::resolveSlot()}), so
	 * `local_date`, `start_minute`/`end_minute`, the buffers and the two UTC columns all describe
	 * one appointment the engine itself would have produced. Previously the row was written at
	 * `02:00` UTC with a hardcoded 09:00–10:00 local minute pair that contradicted it, and with no
	 * buffers at all — the reservation path freezes the service's buffers into the row, and the busy
	 * envelope is read back from those columns.
	 *
	 * THE WRITE IS ONE TRANSACTION (Codex review). Booking, order and order item used to be three
	 * unguarded inserts: a failure after the booking left a booking with no order, and the
	 * natural-key check below then skipped that booking on every later run, so the site kept the
	 * broken graph forever. A rerun now REPAIRS a booking whose order went missing instead of
	 * walking past it.
	 *
	 * @param int    $service      Service id.
	 * @param int    $staff        Staff id.
	 * @param int    $customer     Customer id.
	 * @param int    $day_offset   Days ahead.
	 * @param int    $start_minute Preferred business-local start minute of day.
	 * @param string $now          Timestamp.
	 * @return bool Whether the booking exists after this call (created now, or already there).
	 * @throws \RuntimeException When the engine offers no slot in the search window, or the insert fails.
	 * @throws \Throwable When the order graph cannot be written; the transaction is rolled back first.
	 */
	private function insertBooking( int $service, int $staff, int $customer, int $day_offset, int $start_minute, string $now ): bool {
		$table = $this->wpdb->prefix . 'aponto_bookings';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared -- CLI fixture natural-key lookup.
		$existing = (int) $this->wpdb->get_var( $this->wpdb->prepare( "SELECT id FROM {$table} WHERE service_id = %d AND staff_id = %d AND customer_id = %d LIMIT 1", $service, $staff, $customer ) );
		if ( $existing > 0 ) {
			$this->repairOrder( $existing, $service );

			return true;
		}

		$slot = $this->resolveSlot( $service, $staff, $day_offset, $start_minute );
		if ( null === $slot ) {
			throw new \RuntimeException(
				esc_html(
					sprintf(
						'Aponto seed: no bookable slot for service %d and staff %d within %d days of the planned date. Check the seeded weekly hours, lead time and horizon.',
						$service,
						$staff,
						self::SLOT_SEARCH_DAYS
					)
				)
			);
		}

		$definition = $slot['service'];

		$this->tx->begin();
		try {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- CLI fixture insert.
			$ok         = $this->wpdb->insert(
				$table,
				array(
					'service_id'         => $service,
					'staff_id'           => $staff,
					'location_id'        => 0,
					'start_datetime_utc' => $slot['start']->format( 'Y-m-d H:i:s' ),
					'end_datetime_utc'   => $slot['end']->format( 'Y-m-d H:i:s' ),
					'local_date'         => $slot['date'],
					'start_minute'       => $slot['start_minute'],
					'end_minute'         => $slot['end_minute'],
					'buffer_before'      => $definition->buffer_before,
					'buffer_after'       => $definition->buffer_after,
					'status'             => 'confirmed',
					'attendees'          => 1,
					'customer_id'        => $customer,
					'customer_timezone'  => $this->business_tz->getName(),
					'customer_note'      => '',
					'token_hash'         => bin2hex( random_bytes( 32 ) ),
					'created_at'         => $now,
					'updated_at'         => $now,
				),
				array( '%d', '%d', '%d', '%s', '%s', '%s', '%d', '%d', '%d', '%d', '%s', '%d', '%d', '%s', '%s', '%s', '%s', '%s' )
			);
			$booking_id = (int) $this->wpdb->insert_id;
			if ( false === $ok || $booking_id <= 0 ) {
				throw new \RuntimeException( esc_html( 'Aponto seed: booking insert failed.' ) );
			}

			// The order is written by the REAL order writer, with the SITE's configured currency and
			// the booked service's own price snapshot — exactly what `ReservationService` passes it.
			// It used to be a hand-rolled insert of a hardcoded `15000` in `VND`: a Vietnam-specific
			// default in a deliberately locale-neutral product, a total that disagreed with the
			// service on two of the three demo bookings, and a code/`payment_status`/item-meta shape
			// of its own.
			$this->orders->createWithItem( $booking_id, $definition->price_minor, (string) $this->settings->get( 'currency' ) );

			$this->tx->commit();
		} catch ( \Throwable $e ) {
			$this->tx->rollback();

			throw $e;
		}

		return true;
	}

	/**
	 * Give a booking its order back when a previous run died between the two writes.
	 *
	 * Only reachable for a graph broken before the seeder became transactional (or by a crash
	 * mid-transaction on an engine without DDL-safe rollback), but the natural-key path is exactly
	 * where such a booking would otherwise be skipped forever.
	 *
	 * @param int $booking_id Existing booking id.
	 * @param int $service    Service id, for the price snapshot.
	 * @throws \Throwable When the order graph cannot be written.
	 */
	private function repairOrder( int $booking_id, int $service ): void {
		$items = $this->wpdb->prefix . 'aponto_order_items';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared -- CLI fixture natural-key lookup.
		$linked = (int) $this->wpdb->get_var( $this->wpdb->prepare( "SELECT COUNT(*) FROM {$items} WHERE booking_id = %d", $booking_id ) );
		if ( $linked > 0 ) {
			return;
		}

		$definition = $this->services->serviceRepository()->find( $service );
		$this->tx->begin();
		try {
			$this->orders->createWithItem( $booking_id, $definition?->price_minor, (string) $this->settings->get( 'currency' ) );
			$this->tx->commit();
		} catch ( \Throwable $e ) {
			$this->tx->rollback();

			throw $e;
		}
	}
}

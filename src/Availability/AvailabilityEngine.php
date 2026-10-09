<?php
/**
 * DB-backed availability engine (§5.1, §5.3, §5.5).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Availability;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Booking\BookingDraft;
use Aponto\Booking\Repository\BusyRepository;
use Aponto\Booking\Repository\ConnectionRepository;
use Aponto\Booking\Repository\ScheduleRepository;
use Aponto\Booking\Repository\ServiceRepository;
use Aponto\Support\Clock;

/**
 * The concrete {@see Engine}. It loads all data for a range in a small, fixed number of queries
 * (service, schedules, bookings, blocks — plus one connection query for any-staff) then generates
 * per day in memory, keeping within the ≤5-queries/staff-month budget (§5.8).
 *
 * `get_slots()` is the display path: it applies lead-time/horizon policy and the subtract-only
 * `aponto_slots_generated` filter. `is_slot_free()` is the authoritative booking check and never
 * touches the display filter (§8.1 invariant 4). `slotsForCustomerRange()` implements the
 * customer-timezone windowing of §5.5.
 */
final class AvailabilityEngine implements Engine {

	/**
	 * The UTC zone.
	 *
	 * @var \DateTimeZone
	 */
	private \DateTimeZone $utc;

	/**
	 * Construct the engine.
	 *
	 * @param ServiceRepository    $services    Service reader.
	 * @param ScheduleRepository   $schedules   Schedule reader.
	 * @param BusyRepository       $busy        Busy-source reader.
	 * @param ConnectionRepository $connections Staff-service connection reader.
	 * @param ScheduleResolver     $resolver    Weight-based resolver.
	 * @param SlotGenerator        $generator   Slot generator.
	 * @param TimezoneConverter    $converter   Wall-clock converter.
	 * @param BusinessTimezone     $timezones   Business-timezone resolver.
	 * @param Clock                $clock       Clock.
	 */
	public function __construct(
		private ServiceRepository $services,
		private ScheduleRepository $schedules,
		private BusyRepository $busy,
		private ConnectionRepository $connections,
		private ScheduleResolver $resolver,
		private SlotGenerator $generator,
		private TimezoneConverter $converter,
		private BusinessTimezone $timezones,
		private Clock $clock
	) {
		$this->utc = new \DateTimeZone( 'UTC' );
	}

	/**
	 * {@inheritDoc}
	 *
	 * @param SlotQuery $query Availability query.
	 * @return array<string, list<Slot>>
	 */
	public function get_slots( SlotQuery $query ): array {
		$service = $this->services->find( $query->service_id );
		if ( null === $service || 'active' !== $service->status ) {
			return array();
		}

		// Concrete-staff eligibility (§5.3): the any-staff path already filters candidates by the
		// `aponto_staff_services` connection AND by `status = 'active'`; a concrete staff query MUST
		// apply the SAME guard, or a staff member not assigned to this service (at this location, or
		// the `0` wildcard) would still surface availability (Codex engine review).
		//
		// `isEligible()` rather than `isConnected()` since D-R50 fix round 1: the ACTIVE half was
		// missing here while `ReservationService::targetsAreBookable()` has always enforced it, so
		// an ARCHIVED staff member displayed a full calendar and answered `409 aponto_slot_taken`
		// on every booking attempt — and the widget, which refetches on that 409, got the same
		// slots back and looped. Subtract-only: a non-active staff member simply has no slots.
		if ( null !== $query->staff_id && ! $this->connections->isEligible( $query->staff_id, $query->service_id, $query->location_id ) ) {
			return array();
		}

		$tz     = $this->timezones->forLocation( $query->location_id );
		$dates  = $this->businessDates( $query->from_date, $query->to_date );
		$window = $this->utcWindow( $query->from_date, $query->to_date, $tz );

		// `exclude_booking_id` (persona QA 2026-10-05, T-043) applies to the CONCRETE-staff path only:
		// it is the admin's "Edit time" read, which always names the booking's own staff member. The
		// any-staff union keeps every booking busy, exactly as before.
		$flat = null === $query->staff_id
			? $this->generateAnyStaff( $service, $query, $dates, $tz, $window[0], $window[1] )
			: $this->generateForStaff( $service, $query->staff_id, $query, $dates, $tz, $window[0], $window[1], $query->exclude_booking_id );

		$flat = $this->applyBookableWindow( $flat, $service, $query->front_desk ? $tz : null );
		$flat = $this->applyDisplayFilter( $flat, $query );

		return $this->groupByDate( $flat, $tz );
	}

	/**
	 * {@inheritDoc}
	 *
	 * @param BookingDraft $draft              Draft carrying the slot start and concrete staff.
	 * @param int|null     $exclude_booking_id Booking id to ignore in the busy set.
	 */
	public function is_slot_free( BookingDraft $draft, ?int $exclude_booking_id = null ): bool {
		if ( null === $draft->staff_id ) {
			return false;
		}

		$service = $this->services->find( $draft->service_id );
		if ( null === $service ) {
			return false;
		}

		// Concrete-staff eligibility (§5.3): the authoritative booking check rejects a staff member
		// not connected to this service at this location, mirroring the display guard in get_slots so
		// reserve() and reschedule() (both route through here) can never book an unassigned staff.
		if ( ! $this->connections->isConnected( $draft->staff_id, $draft->service_id, $draft->location_id ) ) {
			return false;
		}

		$tz   = $this->timezones->forLocation( $draft->location_id );
		$wall = $this->converter->instantToWall( $draft->start_utc, $tz );
		$date = $wall['date'];

		$rows    = $this->schedules->forStaff( $draft->staff_id );
		$periods = $this->resolver->resolve( $rows, $draft->staff_id, $draft->service_id, $draft->location_id, $date );

		$window = $this->utcWindow( $date, $date, $tz );
		// PURPOSE_RESERVE: this query is built inside `GET_LOCK` + the reservation transaction, so a
		// busy-source listener must not perform network work off it (D-R34).
		$one_day = new SlotQuery( $draft->service_id, $draft->staff_id, $draft->location_id, $date, $date, SlotQuery::PURPOSE_RESERVE );
		$busy    = $this->busy->forRange( $draft->staff_id, $draft->location_id, $window[0], $window[1], $one_day, $exclude_booking_id );
		$slots   = $this->generator->generate( $service, $periods, $busy, $date, $tz );

		$target = $draft->start_utc->getTimestamp();
		foreach ( $slots as $slot ) {
			if ( $slot->start_utc->getTimestamp() === $target ) {
				return $slot->remaining >= max( 1, $draft->attendees );
			}
		}

		return false;
	}

	/**
	 * Flat slots for a customer date range, windowed to the customer's timezone (§5.5). The range is
	 * inclusive in the CUSTOMER timezone; the server widens to business dates, generates, then keeps
	 * only slots whose `start_utc` falls in the customer UTC window. Returns an ascending flat list.
	 *
	 * @param int      $service_id  Service id.
	 * @param int|null $staff_id    Staff id, or null for any-staff.
	 * @param int      $location_id Location id.
	 * @param string   $from_date   Inclusive customer start date `Y-m-d`.
	 * @param string   $to_date     Inclusive customer end date `Y-m-d`.
	 * @param string   $customer_tz Customer IANA timezone.
	 * @param int|null $exclude_booking_id Booking to leave out of the busy set (T-043; see {@see SlotQuery}).
	 * @param bool     $front_desk  The admin "New booking" read (D-R77; see {@see SlotQuery}).
	 * @return list<Slot>
	 * @throws RangeTooWide When the inclusive range exceeds 62 days (§5.5).
	 */
	public function slotsForCustomerRange( int $service_id, ?int $staff_id, int $location_id, string $from_date, string $to_date, string $customer_tz, ?int $exclude_booking_id = null, bool $front_desk = false ): array {
		$this->assertRange( $from_date, $to_date );

		$cust_zone = $this->safeZone( $customer_tz );
		$biz_zone  = $this->timezones->forLocation( $location_id );

		// Customer UTC window: [from_date 00:00 cust, (to_date + 1 day) 00:00 cust).
		$lo = ( new \DateTimeImmutable( $from_date . ' 00:00:00', $cust_zone ) )->setTimezone( $this->utc );
		$hi = ( new \DateTimeImmutable( $to_date . ' 00:00:00', $cust_zone ) )->modify( '+1 day' )->setTimezone( $this->utc );

		// Business dates touching the window, widened ±1 day at the boundary (§5.5).
		$biz_from = $lo->setTimezone( $biz_zone )->modify( '-1 day' )->format( 'Y-m-d' );
		$biz_to   = $hi->setTimezone( $biz_zone )->modify( '+1 day' )->format( 'Y-m-d' );

		$query   = new SlotQuery( $service_id, $staff_id, $location_id, $biz_from, $biz_to, SlotQuery::PURPOSE_DISPLAY, $exclude_booking_id, $front_desk );
		$grouped = $this->get_slots( $query );

		$out = array();
		foreach ( $grouped as $slots ) {
			foreach ( $slots as $slot ) {
				$ts = $slot->start_utc->getTimestamp();
				if ( $ts >= $lo->getTimestamp() && $ts < $hi->getTimestamp() ) {
					$out[] = $slot;
				}
			}
		}

		usort( $out, static fn ( Slot $a, Slot $b ): int => $a->start_utc->getTimestamp() <=> $b->start_utc->getTimestamp() );

		return $out;
	}

	/**
	 * Generate the flat slot list for a single staff member across the date range.
	 *
	 * @param ServiceDefinition  $service      Resolved service.
	 * @param int                $staff_id     Staff id.
	 * @param SlotQuery          $query        Originating query.
	 * @param list<string>       $dates        Business dates `Y-m-d`.
	 * @param \DateTimeZone      $tz           Business timezone.
	 * @param \DateTimeImmutable $window_start UTC window start.
	 * @param \DateTimeImmutable $window_end   UTC window end.
	 * @param int|null           $exclude_id   Booking id to exclude from busy.
	 * @return list<Slot>
	 */
	private function generateForStaff( ServiceDefinition $service, int $staff_id, SlotQuery $query, array $dates, \DateTimeZone $tz, \DateTimeImmutable $window_start, \DateTimeImmutable $window_end, ?int $exclude_id ): array {
		$rows = $this->schedules->forStaff( $staff_id );
		$busy = $this->busy->forRange( $staff_id, $query->location_id, $window_start, $window_end, $query, $exclude_id );

		$out = array();
		foreach ( $dates as $date ) {
			$periods = $this->resolver->resolve( $rows, $staff_id, $query->service_id, $query->location_id, $date );
			foreach ( $this->generator->generate( $service, $periods, $busy, $date, $tz ) as $slot ) {
				$out[] = $slot;
			}
		}

		return $out;
	}

	/**
	 * Generate merged any-staff slots: `remaining` is the number of staff free at each start
	 * (§5.3). Staff schedules and busy are loaded in bulk (one query each), so the budget stays
	 * "4 engine + 1 connection".
	 *
	 * @param ServiceDefinition  $service      Resolved service.
	 * @param SlotQuery          $query        Originating query.
	 * @param list<string>       $dates        Business dates `Y-m-d`.
	 * @param \DateTimeZone      $tz           Business timezone.
	 * @param \DateTimeImmutable $window_start UTC window start.
	 * @param \DateTimeImmutable $window_end   UTC window end.
	 * @return list<Slot>
	 */
	private function generateAnyStaff( ServiceDefinition $service, SlotQuery $query, array $dates, \DateTimeZone $tz, \DateTimeImmutable $window_start, \DateTimeImmutable $window_end ): array {
		$candidates = $this->connections->staffForService( $query->service_id, $query->location_id );
		if ( array() === $candidates ) {
			return array();
		}

		$rows    = $this->schedules->forStaffIds( $candidates );
		$buckets = $this->busy->forStaffIds( $candidates, $query->location_id, $window_start, $window_end, $query );

		$merged = array();
		foreach ( $dates as $date ) {
			foreach ( $candidates as $staff_id ) {
				$periods = $this->resolver->resolve( $rows, $staff_id, $query->service_id, $query->location_id, $date );
				foreach ( $this->generator->generate( $service, $periods, $buckets[ $staff_id ] ?? array(), $date, $tz ) as $slot ) {
					$key = $slot->key();
					if ( ! isset( $merged[ $key ] ) ) {
						$merged[ $key ] = array(
							'minute' => $slot->start_minute,
							'start'  => $slot->start_utc,
							'count'  => 0,
						);
					}
					++$merged[ $key ]['count'];
				}
			}
		}

		$out = array();
		foreach ( $merged as $entry ) {
			$out[] = new Slot( $entry['start'], $entry['minute'], $entry['count'] );
		}

		return $out;
	}

	/**
	 * Drop slots outside the bookable window `[now + min_lead, now + max_horizon]` (display policy).
	 *
	 * The FRONT-DESK read (D-R77, `$front_desk_tz` set) is the admin recording a walk-in or a phone
	 * booking: the customer lead time and horizon are policies about what a CUSTOMER may ask for, so
	 * neither applies, and the floor is the start of the business's current day at this location —
	 * "now" and the earlier starts of today are offered, yesterday is not. Nothing else changes:
	 * the slots were generated from working hours minus busy time, and the reservation re-checks
	 * `is_slot_free()` under the lock exactly as for any booking.
	 *
	 * @param list<Slot>         $slots         Slots.
	 * @param ServiceDefinition  $service       Resolved service.
	 * @param \DateTimeZone|null $front_desk_tz Business timezone of the grid on the front-desk read; null otherwise.
	 * @return list<Slot>
	 */
	private function applyBookableWindow( array $slots, ServiceDefinition $service, ?\DateTimeZone $front_desk_tz = null ): array {
		$now   = $this->clock->now();
		$floor = $now->modify( '+' . $service->min_lead_minutes . ' minutes' )->getTimestamp();
		$ceil  = $now->modify( '+' . $service->max_horizon_days . ' days' )->getTimestamp();
		if ( null !== $front_desk_tz ) {
			$floor = ( new \DateTimeImmutable( $now->setTimezone( $front_desk_tz )->format( 'Y-m-d' ) . ' 00:00:00', $front_desk_tz ) )->getTimestamp();
			$ceil  = PHP_INT_MAX;
		}

		$out = array();
		foreach ( $slots as $slot ) {
			$ts = $slot->start_utc->getTimestamp();
			if ( $ts >= $floor && $ts <= $ceil ) {
				$out[] = $slot;
			}
		}

		return $out;
	}

	/**
	 * Apply the display-only `aponto_slots_generated` filter as a subtract-only intersection by
	 * `start_utc` (§8.1 invariant 3): the filter may hide slots but never add starts, raise
	 * `remaining`, or change identity. Core slots stay authoritative.
	 *
	 * @param list<Slot> $slots Core slots.
	 * @param SlotQuery  $query Originating query.
	 * @return list<Slot>
	 */
	private function applyDisplayFilter( array $slots, SlotQuery $query ): array {
		/**
		 * Filter generated slots for display only (subtract-only — §8.1). Never consulted by
		 * `is_slot_free()`/`reserve()`.
		 *
		 * @param list<Slot> $slots Core slots.
		 * @param SlotQuery  $query Originating query.
		 */
		$filtered = apply_filters( 'aponto_slots_generated', $slots, $query );
		if ( ! is_array( $filtered ) ) {
			return $slots;
		}

		$kept = array();
		foreach ( $filtered as $slot ) {
			if ( $slot instanceof Slot ) {
				$kept[ $slot->key() ] = true;
			}
		}

		$out = array();
		foreach ( $slots as $slot ) {
			if ( isset( $kept[ $slot->key() ] ) ) {
				$out[] = $slot;
			}
		}

		return $out;
	}

	/**
	 * Group a flat slot list by business-timezone date, each group ascending by start.
	 *
	 * @param list<Slot>    $slots Slots.
	 * @param \DateTimeZone $tz    Business timezone.
	 * @return array<string, list<Slot>>
	 */
	private function groupByDate( array $slots, \DateTimeZone $tz ): array {
		$groups = array();
		foreach ( $slots as $slot ) {
			$date              = $slot->start_utc->setTimezone( $tz )->format( 'Y-m-d' );
			$groups[ $date ][] = $slot;
		}

		ksort( $groups );
		foreach ( $groups as &$group ) {
			usort( $group, static fn ( Slot $a, Slot $b ): int => $a->start_utc->getTimestamp() <=> $b->start_utc->getTimestamp() );
		}
		unset( $group );

		return $groups;
	}

	/**
	 * The inclusive list of business dates `Y-m-d` from `$from` to `$to`.
	 *
	 * @param string $from Inclusive start `Y-m-d`.
	 * @param string $to   Inclusive end `Y-m-d`.
	 * @return list<string>
	 */
	private function businessDates( string $from, string $to ): array {
		$cursor = new \DateTimeImmutable( $from . ' 00:00:00', $this->utc );
		$end    = new \DateTimeImmutable( $to . ' 00:00:00', $this->utc );
		if ( $cursor > $end ) {
			return array();
		}

		$dates = array();
		while ( $cursor <= $end ) {
			$dates[] = $cursor->format( 'Y-m-d' );
			$cursor  = $cursor->modify( '+1 day' );
		}

		return $dates;
	}

	/**
	 * A padded UTC window covering the business-date range (±1 day of slack for buffers/DST).
	 *
	 * @param string        $from Inclusive start `Y-m-d`.
	 * @param string        $to   Inclusive end `Y-m-d`.
	 * @param \DateTimeZone $tz   Business timezone.
	 * @return array{0: \DateTimeImmutable, 1: \DateTimeImmutable}
	 */
	private function utcWindow( string $from, string $to, \DateTimeZone $tz ): array {
		$start = ( new \DateTimeImmutable( $from . ' 00:00:00', $tz ) )->modify( '-1 day' )->setTimezone( $this->utc );
		$end   = ( new \DateTimeImmutable( $to . ' 00:00:00', $tz ) )->modify( '+2 day' )->setTimezone( $this->utc );

		return array( $start, $end );
	}

	/**
	 * Assert the inclusive customer range does not exceed the maximum (§5.5).
	 *
	 * @param string $from Inclusive start `Y-m-d`.
	 * @param string $to   Inclusive end `Y-m-d`.
	 * @throws RangeTooWide When too wide.
	 */
	private function assertRange( string $from, string $to ): void {
		RangeTooWide::assertWithin( $from, $to );
	}

	/**
	 * A timezone from a name, falling back to UTC on an invalid name.
	 *
	 * @param string $name IANA timezone name.
	 */
	private function safeZone( string $name ): \DateTimeZone {
		try {
			return new \DateTimeZone( $name );
		} catch ( \Exception $e ) {
			unset( $e );

			return $this->utc;
		}
	}
}

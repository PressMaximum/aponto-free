<?php
/**
 * Remote busy adapter — `aponto_pull_busy_{key}` → `aponto_blocked_periods_for_range` (D-R34).
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

use Aponto\Availability\Period;
use Aponto\Availability\SlotQuery;
use Aponto\Support\Clock;
use WP_Error;

/**
 * Turns every connected staff member's REMOTE calendar into core busy time (extension-surface
 * §2.1.5): the only route from a driver's `aponto_pull_busy_{key}` into the engine is the core
 * subtract-only busy filter, so an integration can make a schedule busier and can never open a slot.
 *
 * ## D-R34 — the remote busy policy, in the order it matters
 *
 * **1. HTTP happens on the DISPLAY path only.** `is_slot_free()` runs inside `GET_LOCK` + the
 * reservation transaction (§5 invariant 5). A network call there would hold a database lock across
 * an uncontrolled remote timeout — the single worst thing this plugin could do to a busy site — so
 * the reserve path reads the CACHE and never dispatches. The two paths are told apart by
 * {@see SlotQuery::$purpose}, an explicit flag added for exactly this decision rather than inferred
 * from the shape of the query.
 *
 * **1b. And the reserve path spends almost no SQL either.** HTTP was never the only cost worth
 * bounding (Codex P1 #1): decrypting a connection is a `staff_meta` row read, and a per-day cache
 * would have been one option read per day of the window — inside the lock. So the reserve path
 * decides "is this staff member connected" from the AUTOLOADED projection alone, never decrypting,
 * and the cache is ONE transient per (module, staff) holding a bounded day map. Any range, on
 * either path, therefore costs at most one option read per connected module.
 *
 * **2. The cache is keyed by UTC DAY inside that one entry.** Display asks for a month and reserve
 * asks for one date; a range-keyed cache would never hit on the path that needs it most. Day
 * buckets make the two paths share entries: the month view that drew a slot warms the bucket the
 * booking is then validated against. Freshness is {@see self::TTL} seconds (filterable); buckets
 * survive up to {@see self::STALE_MAX} for the grace case, and the map is pruned to
 * {@see self::WINDOW_DAYS} days either side of today on every write so it cannot grow without
 * bound.
 *
 * **3. Every UNKNOWN is FAIL-CLOSED, with stale grace.** "Unknown" is wider than "the driver
 * returned an error" (Codex P1 #2), and each of these used to fail open: a driver that THREW, a
 * module with no `aponto_pull_busy_*` listener at all, and a request that hit the per-request
 * dispatch cap. All four now take the same path — serve the last known busy for that staff/day if
 * it is younger than {@see self::STALE_MAX}; with no cached answer at all, mark the uncached span
 * busy, hiding that staff member's slots there, and record the reason in {@see IntegrationHealth}.
 * Nothing that failed is ever CACHED, so a failure cannot be replayed as "free" for the next five
 * minutes.
 *
 * **4. The asymmetry on the reserve path is deliberate.** A cache MISS at reserve time is not a
 * driver error — nothing was attempted — so it contributes nothing rather than blocking the write.
 * Fail-closed there would make the first booking after activation, and every admin-created booking
 * that never rendered availability, impossible; and the signal being protected is advisory (a
 * private calendar event is not an Aponto booking). Display, which every customer booking passes
 * through, is where fail-closed actually bites. **Residual, stated so nobody "fixes" it without
 * seeing the trade:** a reservation made against a cold cache can overlap a remote event until the
 * next display pull refreshes that staff member's buckets.
 *
 * **5. The query budget survives.** The engine's "≤ 5 SQL queries per staff-month availability
 * call" is CI-enforced. A site with no connections leaves through
 * {@see ConnectionStore::hasAnyConnection()}, one already-autoloaded option and zero queries; a
 * connected staff member costs one transient read per module, memoised for the rest of the request.
 */
final class RemoteBusySource {

	/**
	 * Seconds a cached day bucket is considered FRESH.
	 */
	public const TTL = 300;

	/**
	 * Seconds a cached day bucket may still be served as STALE after a failure.
	 */
	public const STALE_MAX = 86400;

	/**
	 * Days either side of today the cache map retains. Two months of history and future comfortably
	 * covers the 62-day maximum availability range plus the reserve path's single day.
	 */
	public const WINDOW_DAYS = 62;

	/**
	 * Transient key prefix for one (module, staff) day map.
	 */
	private const CACHE_PREFIX = 'aponto_ibz_';

	/**
	 * Hard ceiling on driver dispatches per HTTP request, so one availability call can never fan
	 * out into an unbounded number of remote round trips.
	 */
	private const MAX_DISPATCHES = 8;

	/**
	 * Seconds ONE driver dispatch may spend, deadline included. Passed to the driver so a paging
	 * lookup can decide between continuing and reporting failure instead of silently truncating.
	 */
	private const DISPATCH_DEADLINE = 10;

	/**
	 * Driver dispatches already made this request.
	 *
	 * @var int
	 */
	private int $dispatches = 0;

	/**
	 * Per-request memo of the day maps already read, keyed `{code}|{staff}`.
	 *
	 * @var array<string, array<string, array{p: list<array{0:int,1:int}>, at: int}>>
	 */
	private array $memo = array();

	/**
	 * Construct the adapter.
	 *
	 * @param ConnectionStore   $connections Connection storage (and its autoloaded projection).
	 * @param IntegrationHealth $health      Failure recorder.
	 * @param Clock|null        $clock       Injectable clock (§5 invariant 7).
	 */
	public function __construct(
		private ConnectionStore $connections,
		private IntegrationHealth $health,
		private ?Clock $clock = null
	) {}

	/**
	 * Attach to the core busy filter.
	 */
	public function register(): void {
		add_filter( 'aponto_blocked_periods_for_range', array( $this, 'contribute' ), 10, 2 );
	}

	/**
	 * Contribute remote busy periods for the query's staff member (subtract-only).
	 *
	 * Returns the input untouched — the cheapest possible answer — whenever there is nothing to do:
	 * no connection anywhere on the site, an any-staff query that core has not yet narrowed to a
	 * candidate, or no active integration.
	 *
	 * @param mixed $periods Core busy periods so far.
	 * @param mixed $query   Originating {@see SlotQuery}.
	 * @return list<Period>
	 */
	public function contribute( $periods, $query = null ): array {
		$periods = is_array( $periods ) ? array_values( $periods ) : array();
		if ( ! $query instanceof SlotQuery || null === $query->staff_id || $query->staff_id <= 0 ) {
			return $periods;
		}
		if ( ! $this->connections->hasAnyConnection() ) {
			return $periods;
		}

		$window  = self::window( $query );
		$reserve = SlotQuery::PURPOSE_RESERVE === $query->purpose;

		foreach ( IntegrationRegistry::activeCodes() as $code ) {
			// The PROJECTION decides connectedness — an autoloaded option, no query, no decrypt.
			// This is the whole of the reserve path's knowledge about the connection (Codex P1 #1).
			if ( ! in_array( $query->staff_id, $this->connections->activeStaffIds( $code ), true ) ) {
				continue;
			}

			$found = $reserve
				? $this->fromCache( $code, $query->staff_id, $window )
				: $this->pull( $code, $query->staff_id, $window );

			foreach ( $found as $period ) {
				$periods[] = $period;
			}
		}

		return $periods;
	}

	/**
	 * RESERVE path: whatever the cache already holds, and nothing else.
	 *
	 * ONE transient read, no decrypt, no dispatch — this runs inside `GET_LOCK` + the reservation
	 * transaction. A day with no entry contributes nothing (policy item 4).
	 *
	 * @param string                                              $code     Module code.
	 * @param int                                                 $staff_id Staff id.
	 * @param array{0: \DateTimeImmutable, 1: \DateTimeImmutable} $window  UTC window.
	 * @return list<Period>
	 */
	private function fromCache( string $code, int $staff_id, array $window ): array {
		$map    = $this->dayMap( $code, $staff_id );
		$now    = $this->now();
		$usable = array();

		foreach ( self::days( $window[0], $window[1] ) as $day ) {
			$entry = $map[ $day ] ?? null;
			if ( is_array( $entry ) && (int) ( $entry['at'] ?? 0 ) >= $now - self::STALE_MAX ) {
				$usable[ $day ] = $entry;
			}
		}

		return self::periodsFrom( $usable, $window );
	}

	/**
	 * DISPLAY path: refresh whatever is stale or missing, then answer from the map.
	 *
	 * @param string                                              $code     Module code.
	 * @param int                                                 $staff_id Staff id.
	 * @param array{0: \DateTimeImmutable, 1: \DateTimeImmutable} $window  UTC window.
	 * @return list<Period>
	 */
	private function pull( string $code, int $staff_id, array $window ): array {
		$days  = self::days( $window[0], $window[1] );
		$map   = $this->dayMap( $code, $staff_id );
		$now   = $this->now();
		$ttl   = self::ttl();
		$fresh = array();
		$stale = array();

		foreach ( $days as $day ) {
			$entry = $map[ $day ] ?? null;
			if ( ! is_array( $entry ) || ! isset( $entry['at'] ) ) {
				continue;
			}
			if ( (int) $entry['at'] >= $now - $ttl ) {
				$fresh[ $day ] = $entry;
				continue;
			}
			if ( (int) $entry['at'] >= $now - self::STALE_MAX ) {
				$stale[ $day ] = $entry;
			}
		}

		$missing = array_values( array_diff( $days, array_keys( $fresh ) ) );
		if ( array() === $missing ) {
			return self::periodsFrom( $fresh, $window );
		}

		// NO LISTENER means the answer is UNKNOWN, not "free" (Codex P1 #2). A shipped module whose
		// provider failed to boot would otherwise have its staff member's calendar cached as empty
		// for the next five minutes.
		if ( ! has_filter( 'aponto_pull_busy_' . $code ) ) {
			return $this->onFailure( $code, $staff_id, 'No driver answered the remote busy verb.', $missing, $fresh, $stale, $window );
		}

		// CAP EXHAUSTION is also unknown, not free: past the ninth connected staff member on one
		// request, the honest answer is "could not look", and that must fail closed like any other.
		if ( $this->dispatches >= self::MAX_DISPATCHES ) {
			return $this->onFailure( $code, $staff_id, 'Remote busy dispatch budget exhausted for this request.', $missing, $fresh, $stale, $window );
		}

		// INSIDE the failure boundary (Codex round 3, P1 #11). Opening a connection derives a key,
		// and {@see \Aponto\Support\Crypto::deriveKey()} THROWS on unusable key material — so on a
		// site whose `SECURE_AUTH_KEY` was removed or rotated, this line used to throw straight out
		// of the availability request and blank the booking form for everyone, connected or not.
		try {
			$connection = $this->connections->find( $code, $staff_id );
		} catch ( \Throwable $e ) {
			$this->markNeedsReconnect( $code, $staff_id );

			return $this->onFailure( $code, $staff_id, 'Connection could not be opened (' . get_class( $e ) . ').', $missing, $fresh, $stale, $window );
		}

		if ( null === $connection || ! $connection->isActive() ) {
			// The projection said connected and the row disagrees — a drift, and an unknown.
			return $this->onFailure( $code, $staff_id, 'Connection record is missing or inactive.', $missing, $fresh, $stale, $window );
		}

		$span       = self::span( $missing );
		$busy_query = new BusyQuery( $code, $staff_id, $connection, $span[0], $span[1], $this->now() + self::DISPATCH_DEADLINE );
		++$this->dispatches;

		try {
			/**
			 * Filter the remote busy periods for one staff member and window (extension-surface §5.1).
			 *
			 * Output is subtract-only: core clips it to the queried window, canonicalizes it to
			 * half-open `[start, end)` and unions it with core busy — a driver can add busy and can
			 * never remove any. A driver reports failure through {@see BusyQuery::recordError()}, NOT
			 * by returning an empty list, which legitimately means "this calendar is free".
			 *
			 * @param list<Period> $periods Periods contributed so far (initial `[]`).
			 * @param BusyQuery    $query   The staff/window query.
			 */
			$result = apply_filters( 'aponto_pull_busy_' . $code, array(), $busy_query );
		} catch ( \Throwable $e ) {
			// A driver exception must never escape into the availability request and blank the form
			// (Codex P1 #2). The message is NOT propagated — a provider exception can carry a URL or
			// a token fragment — only the class name, which is diagnostic and inert.
			return $this->onFailure( $code, $staff_id, 'Remote busy driver threw ' . get_class( $e ) . '.', $missing, $fresh, $stale, $window );
		}

		if ( $busy_query->failed() || $result instanceof WP_Error || ! is_array( $result ) ) {
			$reason = $busy_query->failed() ? $busy_query->error() : 'Remote busy lookup failed.';

			return $this->onFailure( $code, $staff_id, $reason, $missing, $fresh, $stale, $window );
		}

		$fetched = $this->store( $code, $staff_id, $missing, $result );
		if ( null === $fetched ) {
			// Nothing was cached: `store()` writes only after the whole result validates.
			return $this->onFailure( $code, $staff_id, 'The driver returned a busy period core could not read.', $missing, $fresh, $stale, $window );
		}

		$this->health->clear( $code );

		return self::periodsFrom( array_merge( $stale, $fresh, $fetched ), $window );
	}

	/**
	 * Flip a connection to `needs_reconnect`, tolerating a projection that cannot be written.
	 *
	 * Called from the failure path, so it must not raise a second failure over the first.
	 *
	 * @param string $code     Module code.
	 * @param int    $staff_id Staff id.
	 */
	private function markNeedsReconnect( string $code, int $staff_id ): void {
		try {
			$this->connections->markStatus( $code, $staff_id, ConnectionRef::NEEDS_RECONNECT );
		} catch ( \Throwable $e ) {
			return;
		}
	}

	/**
	 * Fail-closed handling with stale grace (D-R34 item 3).
	 *
	 * Writes NOTHING to the cache: an unknown answer must not become a cached "free".
	 *
	 * @param string                                              $code     Module code.
	 * @param int                                                 $staff_id Staff id.
	 * @param string                                              $reason   PII-free failure reason.
	 * @param list<string>                                        $missing  Days without a fresh entry.
	 * @param array<string, array<string, mixed>>                 $fresh    Fresh entries.
	 * @param array<string, array<string, mixed>>                 $stale    Stale-but-usable entries.
	 * @param array{0: \DateTimeImmutable, 1: \DateTimeImmutable} $window  UTC window.
	 * @return list<Period>
	 */
	private function onFailure( string $code, int $staff_id, string $reason, array $missing, array $fresh, array $stale, array $window ): array {
		$this->health->recordFailure( $code, 'busy', '' !== $reason ? $reason : 'Remote busy lookup failed.', $staff_id );

		$periods  = self::periodsFrom( array_merge( $stale, $fresh ), $window );
		$uncached = array_values( array_diff( $missing, array_keys( $stale ) ) );

		// No answer at all for these days: mark them busy so the staff member's slots disappear
		// rather than being offered against a calendar nobody could read.
		foreach ( $uncached as $day ) {
			$start = new \DateTimeImmutable( $day . ' 00:00:00', new \DateTimeZone( 'UTC' ) );
			$clip  = self::clip( $start, $start->modify( '+1 day' ), $window );
			if ( null !== $clip ) {
				$periods[] = new Period( $clip[0], $clip[1] );
			}
		}

		return $periods;
	}

	/**
	 * The (module, staff) day map, read at most ONCE per request.
	 *
	 * @param string $code     Module code.
	 * @param int    $staff_id Staff id.
	 * @return array<string, array{p: list<array{0:int,1:int}>, at: int}>
	 */
	private function dayMap( string $code, int $staff_id ): array {
		$memo_key = $code . '|' . $staff_id;
		if ( isset( $this->memo[ $memo_key ] ) ) {
			return $this->memo[ $memo_key ];
		}

		$stored = get_transient( self::cacheKey( $code, $staff_id ) );
		$map    = is_array( $stored ) ? $stored : array();

		$this->memo[ $memo_key ] = $map;

		return $map;
	}

	/**
	 * Split driver output into UTC day buckets, merge them into the map and persist it.
	 *
	 * Splitting is what makes an event crossing midnight cacheable at all: each day keeps only its
	 * own clipped share, and the union at read time puts the event back together. The map is pruned
	 * to {@see self::WINDOW_DAYS} either side of today on every write, so a long-running site cannot
	 * accumulate an unbounded option (Codex P1 #1).
	 *
	 * @param string       $code     Module code.
	 * @param int          $staff_id Staff id.
	 * @param list<string> $days     Days the dispatch covered.
	 * @param array<mixed> $result   Raw driver output.
	 * @return array<string, array{p: list<array{0:int,1:int}>, at: int}>|null NULL when the driver
	 *                                                                        output was unusable.
	 */
	private function store( string $code, int $staff_id, array $days, array $result ): ?array {
		$now     = $this->now();
		$buckets = array();
		foreach ( $days as $day ) {
			$buckets[ $day ] = array(
				'p'  => array(),
				'at' => $now,
			);
		}

		foreach ( $result as $period ) {
			if ( ! $period instanceof Period || $period->end_utc <= $period->start_utc ) {
				// AN UNUSABLE PERIOD FAILS THE DISPATCH (Codex round 6, #2). Core validates driver
				// output at the boundary (extension-surface §2), and the only safe validation on this
				// path is all-or-nothing: dropping one period and caching the rest publishes a busy
				// set that is quietly incomplete, which reads to a customer as free time.
				return null;
			}
			foreach ( $days as $day ) {
				$day_start = new \DateTimeImmutable( $day . ' 00:00:00', new \DateTimeZone( 'UTC' ) );
				$clip      = self::clip( $period->start_utc, $period->end_utc, array( $day_start, $day_start->modify( '+1 day' ) ) );
				if ( null !== $clip ) {
					$buckets[ $day ]['p'][] = array( $clip[0]->getTimestamp(), $clip[1]->getTimestamp() );
				}
			}
		}

		$memo_key = $code . '|' . $staff_id;
		$map      = array_merge( $this->dayMap( $code, $staff_id ), $buckets );
		$map      = $this->prune( $map );

		$this->memo[ $memo_key ] = $map;
		set_transient( self::cacheKey( $code, $staff_id ), $map, self::STALE_MAX );

		return $buckets;
	}

	/**
	 * Drop buckets outside the retained window or older than the stale ceiling.
	 *
	 * @param array<string, array<string, mixed>> $map Day map.
	 * @return array<string, array{p: list<array{0:int,1:int}>, at: int}>
	 */
	private function prune( array $map ): array {
		$now    = $this->now();
		$today  = ( $this->clock ?? new Clock() )->now()->setTimezone( new \DateTimeZone( 'UTC' ) );
		$oldest = $today->modify( '-' . self::WINDOW_DAYS . ' days' )->format( 'Y-m-d' );
		$newest = $today->modify( '+' . self::WINDOW_DAYS . ' days' )->format( 'Y-m-d' );

		$out = array();
		foreach ( $map as $day => $entry ) {
			$day = (string) $day;
			if ( ! is_array( $entry ) || ! isset( $entry['at'] ) ) {
				continue;
			}
			if ( $day < $oldest || $day > $newest ) {
				continue;
			}
			if ( (int) $entry['at'] < $now - self::STALE_MAX ) {
				continue;
			}
			$out[ $day ] = array(
				'p'  => isset( $entry['p'] ) && is_array( $entry['p'] ) ? $entry['p'] : array(),
				'at' => (int) $entry['at'],
			);
		}

		return $out;
	}

	/**
	 * Rebuild {@see Period} objects from day buckets, clipped to the window and de-duplicated.
	 *
	 * @param array<string, array<string, mixed>>                 $buckets Day buckets.
	 * @param array{0: \DateTimeImmutable, 1: \DateTimeImmutable} $window  UTC window.
	 * @return list<Period>
	 */
	private static function periodsFrom( array $buckets, array $window ): array {
		$seen = array();
		$out  = array();
		$utc  = new \DateTimeZone( 'UTC' );

		foreach ( $buckets as $bucket ) {
			foreach ( (array) ( $bucket['p'] ?? array() ) as $pair ) {
				if ( ! is_array( $pair ) || 2 !== count( $pair ) ) {
					continue;
				}
				$start = ( new \DateTimeImmutable( '@' . (int) $pair[0] ) )->setTimezone( $utc );
				$end   = ( new \DateTimeImmutable( '@' . (int) $pair[1] ) )->setTimezone( $utc );
				$clip  = self::clip( $start, $end, $window );
				if ( null === $clip ) {
					continue;
				}
				$key = $clip[0]->getTimestamp() . '|' . $clip[1]->getTimestamp();
				if ( isset( $seen[ $key ] ) ) {
					continue;
				}
				$seen[ $key ] = true;
				$out[]        = new Period( $clip[0], $clip[1] );
			}
		}

		return $out;
	}

	/**
	 * Intersect `[start, end)` with a window, or null when they do not overlap.
	 *
	 * @param \DateTimeImmutable                                  $start  Interval start.
	 * @param \DateTimeImmutable                                  $end    Interval end.
	 * @param array{0: \DateTimeImmutable, 1: \DateTimeImmutable} $window Window.
	 * @return array{0: \DateTimeImmutable, 1: \DateTimeImmutable}|null
	 */
	private static function clip( \DateTimeImmutable $start, \DateTimeImmutable $end, array $window ): ?array {
		$lo = $start > $window[0] ? $start : $window[0];
		$hi = $end < $window[1] ? $end : $window[1];

		return $hi > $lo ? array( $lo, $hi ) : null;
	}

	/**
	 * The UTC window a slot query can possibly touch.
	 *
	 * The filter receives only the query's BUSINESS-timezone dates, not the UTC window core already
	 * computed, so the window is derived here — padded by a day on each side, which covers every
	 * real UTC offset (±14 h) without a timezone lookup. Over-fetching is harmless: everything is
	 * clipped on the way out and busy is subtract-only, so a wider window can only ever be
	 * discarded, never widen what is blocked.
	 *
	 * @param SlotQuery $query Slot query.
	 * @return array{0: \DateTimeImmutable, 1: \DateTimeImmutable}
	 */
	private static function window( SlotQuery $query ): array {
		$utc   = new \DateTimeZone( 'UTC' );
		$start = ( new \DateTimeImmutable( $query->from_date . ' 00:00:00', $utc ) )->modify( '-1 day' );
		$end   = ( new \DateTimeImmutable( $query->to_date . ' 00:00:00', $utc ) )->modify( '+2 days' );

		return array( $start, $end );
	}

	/**
	 * The `Y-m-d` UTC days a window touches.
	 *
	 * @param \DateTimeImmutable $start Window start.
	 * @param \DateTimeImmutable $end   Window end.
	 * @return list<string>
	 */
	private static function days( \DateTimeImmutable $start, \DateTimeImmutable $end ): array {
		$days   = array();
		$cursor = new \DateTimeImmutable( $start->format( 'Y-m-d' ) . ' 00:00:00', new \DateTimeZone( 'UTC' ) );
		while ( $cursor < $end ) {
			$days[] = $cursor->format( 'Y-m-d' );
			$cursor = $cursor->modify( '+1 day' );
		}

		return $days;
	}

	/**
	 * The single half-open UTC span covering a set of days (one dispatch, not one per day).
	 *
	 * @param list<string> $days Days `Y-m-d`.
	 * @return array{0: \DateTimeImmutable, 1: \DateTimeImmutable}
	 */
	private static function span( array $days ): array {
		sort( $days );
		$utc   = new \DateTimeZone( 'UTC' );
		$start = new \DateTimeImmutable( $days[0] . ' 00:00:00', $utc );
		$end   = ( new \DateTimeImmutable( (string) end( $days ) . ' 00:00:00', $utc ) )->modify( '+1 day' );

		return array( $start, $end );
	}

	/** The current instant, from the injected clock (§5 invariant 7). */
	private function now(): int {
		return ( $this->clock ?? new Clock() )->now()->getTimestamp();
	}

	/**
	 * Freshness TTL in seconds, filterable for hosts that want a tighter or looser window.
	 */
	private static function ttl(): int {
		/**
		 * Filter how long a cached remote-busy day bucket stays FRESH (D-R34).
		 *
		 * This does not change the stale-grace ceiling, which is what keeps a provider outage from
		 * emptying a calendar; it only decides how often the driver is asked.
		 *
		 * @param int $ttl Seconds.
		 */
		$ttl = (int) apply_filters( 'aponto_integration_busy_ttl', self::TTL );

		return max( 30, $ttl );
	}

	/**
	 * Transient key for one (module, staff) day map.
	 *
	 * @param string $code     Module code.
	 * @param int    $staff_id Staff id.
	 */
	private static function cacheKey( string $code, int $staff_id ): string {
		return self::CACHE_PREFIX . md5( $code . '|' . $staff_id );
	}
}

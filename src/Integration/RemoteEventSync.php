<?php
/**
 * Outbound booking → remote calendar sync (extension-surface §5.1 P2 verbs, D-R34).
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

use Aponto\Availability\BlockingPolicy;
use Aponto\Booking\Booking;
use Aponto\Booking\Repository\BookingMetaRepository;
use Aponto\Booking\Repository\BookingRepository;
use Aponto\Booking\Repository\ServiceMetaRepository;
use Aponto\Database\StorageException;
use Aponto\Support\Clock;
use Aponto\Support\Settings;
use WP_Error;

/**
 * Mirrors Aponto bookings onto every connected staff member's remote calendar.
 *
 * ## Where it runs, and where it must not
 *
 * Only from the three POST-COMMIT actions (`aponto_booking_created`,
 * `aponto_booking_status_changed`, `aponto_booking_rescheduled`) and from one cron event. Never
 * from inside {@see \Aponto\Booking\ReservationService}: §5 invariant 5 puts every side effect
 * strictly after `COMMIT` and outside the lock, and an HTTP call inside the transaction would hold
 * `GET_LOCK` for the length of somebody else's outage.
 *
 * ## Which verb, derived not hardcoded
 *
 * The rule is "the remote event exists exactly while the booking HOLDS the calendar", and holding
 * is {@see BlockingPolicy}'s definition, not a list of status names here. So:
 *
 *   - blocking status, no remote event  → `push`
 *   - blocking status, remote event     → `update`
 *   - non-blocking status, remote event → `delete`, but only while the appointment has NOT ended
 *
 * The end-time condition is what keeps history: a booking that reaches a terminal state after it
 * finished (completed, no-show, a late cancellation) blocks nothing any more, so deleting its event
 * would buy no availability and would erase the staff member's record of a real appointment. A
 * cancellation BEFORE the end is the case that matters, and it still frees the calendar. Neither
 * branch names a status, so the sibling worktree's `no_show` — and any status a third party adds
 * through `aponto_blocking_statuses` — is handled the day it lands.
 *
 * ## Idempotency and retry
 *
 * Each attempt is keyed `{key}:{booking_id}:{ics_sequence}:{verb}` (extension-surface §5.2) and
 * claimed through {@see BookingMetaRepository::claimKey()}, whose value-anchored semantics are the
 * exact fit: the same verb for the same sequence can only ever run once, while a RESCHEDULE — which
 * bumps `ics_sequence` — is allowed through as new work. The first attempt runs inline in the
 * listener (the confirmation email already sends synchronously there, so the latency budget is not
 * new); a failure writes a retry intent and the 5-minute `aponto_integrations_tick` picks it up with
 * backoff over roughly a day before giving up and marking the booking `sync_failed`.
 *
 * ## A booking moved to another staff member (D-R78)
 *
 * The remote event lives on ONE staff member's calendar and is reachable only through that staff
 * member's connection, so a booking that changes hands is never an `update`: the event is deleted
 * through the connection that wrote it and a new one is pushed through the new staff member's. The
 * reference records its owner ({@see RemoteEventRef::$staff_id}); the moment the owner and the
 * booking disagree the reference is PARKED under its own key (a local write, no HTTP), which frees
 * the booking to be pushed as if it had never been synced. The two legs are independent — the
 * parked delete has its own lease, attempt counter and due row, so a calendar that refuses the
 * delete never holds back the new staff member's event, and the other way round
 * ({@see self::releaseMovedEvents()}).
 *
 * ## No orphan cron
 *
 * The tick is scheduled only while at least one connection exists and unscheduled the moment the
 * last one goes (P2a debt item 5). A site that never connects anything never carries the event.
 */
final class RemoteEventSync {

	/**
	 * The core integrations cron event.
	 */
	public const TICK_HOOK = 'aponto_integrations_tick';

	/**
	 * Five-minute schedule slug (shared name; the interval is identical wherever it is declared).
	 */
	public const SCHEDULE = 'aponto_five_minutes';

	/**
	 * Schedule interval in seconds.
	 */
	private const INTERVAL = 300;

	/**
	 * Backoff ladder in seconds. SIX gaps spanning ~21 hours, and every one of them is reachable:
	 * the previous code gave up at `attempts >= count(BACKOFF)` while indexing `attempts - 1`, so the
	 * final 12-hour step could never be scheduled and the real span was ~9 hours (Codex P2 #16).
	 * Six gaps means SEVEN dispatches — the inline attempt plus six retries.
	 *
	 * @var list<int>
	 */
	private const BACKOFF = array( 300, 900, 2700, 7200, 21600, 43200 );

	/**
	 * Total dispatch attempts before a booking is marked `sync_failed` (inline + one per ladder gap).
	 */
	private const MAX_ATTEMPTS = 7;

	/**
	 * Seconds a retry lease is held. One tick interval plus headroom, so a worker that dies mid-flight
	 * releases its claim on the next-but-one tick instead of stranding the booking.
	 */
	private const LEASE_SECONDS = 600;

	/**
	 * Seconds an INLINE attempt may spend. The confirmation email already sends synchronously on this
	 * request, so the budget is real but not new.
	 */
	private const INLINE_DEADLINE = 10;

	/**
	 * Seconds a CRON attempt may spend — more patience is affordable off the request path.
	 */
	private const CRON_DEADLINE = 30;

	/**
	 * Bookings drained per tick, per module.
	 */
	private const BATCH = 25;

	/**
	 * Separates the due timestamp from the writing hook's nonce inside a retry row.
	 *
	 * A character that cannot occur in `Y-m-d H:i:s` or in a hex nonce, so the split is unambiguous
	 * and a legacy bare-timestamp row is recognised by its absence ({@see self::retryDueAt()}).
	 */
	private const NONCE_SEPARATOR = '|';


	/**
	 * Sync state: the last attempt failed and a retry is pending.
	 */
	public const STATE_PENDING = 'pending';

	/**
	 * Sync state: every attempt failed and the booking is no longer being retried.
	 */
	public const STATE_FAILED = 'sync_failed';

	/**
	 * Construct the sync.
	 *
	 * @param ConnectionStore       $connections  Connection storage.
	 * @param BookingMetaRepository $meta         Booking metadata repository.
	 * @param BookingRepository     $bookings     Booking repository (cron reload).
	 * @param ServiceMetaRepository $service_meta Service metadata repository (`used` tier).
	 * @param BlockingPolicy        $policy       Blocking-status policy.
	 * @param Settings              $settings     Settings/module-option reader.
	 * @param Clock                 $clock        Injectable clock.
	 * @param IntegrationHealth     $health       Failure recorder.
	 */
	public function __construct(
		private ConnectionStore $connections,
		private BookingMetaRepository $meta,
		private BookingRepository $bookings,
		private ServiceMetaRepository $service_meta,
		private BlockingPolicy $policy,
		private Settings $settings,
		private Clock $clock,
		private IntegrationHealth $health
	) {}

	/**
	 * Build from the global handles.
	 */
	public static function make(): self {
		global $wpdb;

		return new self(
			ConnectionStore::make(),
			new BookingMetaRepository( $wpdb ),
			new BookingRepository( $wpdb ),
			new ServiceMetaRepository( $wpdb ),
			new BlockingPolicy(),
			new Settings(),
			new Clock(),
			IntegrationHealth::make()
		);
	}

	/**
	 * Attach the post-commit listeners and the cron machinery.
	 */
	public function register(): void {
		add_action( 'aponto_booking_created', array( $this, 'onBookingChanged' ) );
		add_action( 'aponto_booking_status_changed', array( $this, 'onBookingChanged' ) );
		add_action( 'aponto_booking_rescheduled', array( $this, 'onBookingRescheduled' ), 10, 4 );

		add_filter( 'cron_schedules', array( self::class, 'addSchedule' ) ); // phpcs:ignore WordPress.WP.CronInterval.ChangeDetected -- A remote calendar that rejected a write must not stay wrong for an hour; five minutes is the retry resolution this queue needs, and it no-ops in one option read when nothing is queued.
		add_action( 'init', array( self::class, 'syncSchedule' ) );
		add_action( 'aponto_integration_connections_changed', array( self::class, 'syncSchedule' ) );
		add_action( self::TICK_HOOK, array( self::class, 'runTick' ) );
	}

	/**
	 * Declare the five-minute schedule if nothing else already did.
	 *
	 * Written as an add-if-absent rather than an assignment because another module may declare the
	 * same slug with the same interval; whoever runs first wins and the result is identical.
	 *
	 * @param mixed $schedules Registered cron schedules.
	 * @return mixed
	 */
	public static function addSchedule( $schedules ) {
		if ( ! is_array( $schedules ) ) {
			return $schedules;
		}
		if ( ! isset( $schedules[ self::SCHEDULE ] ) ) {
			$schedules[ self::SCHEDULE ] = array(
				'interval' => self::INTERVAL,
				'display'  => self::scheduleLabel(),
			);
		}

		return $schedules;
	}

	/**
	 * The schedule's display name — translated only once WordPress can load translations.
	 *
	 * `cron_schedules` is filtered whenever anything calls `wp_get_schedules()`, and a plugin
	 * installer may do that BEFORE `init` (WooCommerce's does, on activation). Translating there
	 * makes WordPress 6.7+ load the `aponto` text domain "just in time" and log
	 * `_load_textdomain_just_in_time was called incorrectly` (persona QA 2026-10-05, T-090 — seen
	 * by all three testers). The label is display-only (Tools → Cron screens), so before `init`
	 * the English source string is returned as it is; every later read is translated.
	 */
	private static function scheduleLabel(): string {
		if ( ! did_action( 'init' ) && ! doing_action( 'init' ) ) {
			return 'Every five minutes (Aponto)';
		}

		return __( 'Every five minutes (Aponto)', 'aponto' );
	}

	/**
	 * Keep the tick scheduled exactly while the site has at least one connection.
	 *
	 * Both directions matter. Scheduling on demand means a site that never connects anything never
	 * carries the event; UNSCHEDULING when the last connection goes is what closes the P2a debt item
	 * — a cron event whose owner has been switched off is an event with no owner.
	 */
	public static function syncSchedule(): void {
		$wanted    = ConnectionStore::make()->hasAnyConnection();
		$scheduled = false !== wp_next_scheduled( self::TICK_HOOK );

		if ( $wanted && ! $scheduled ) {
			// WordPress refuses an unknown schedule name, and this method also runs from contexts
			// that never called `register()` — the connection-projection hook, WP-CLI, a test. Adding
			// the declaration here makes scheduling work wherever it is invoked from; WordPress
			// de-duplicates an identical static callback, so a second add is free.
			add_filter( 'cron_schedules', array( self::class, 'addSchedule' ) ); // phpcs:ignore WordPress.WP.CronInterval.ChangeDetected -- Same five-minute schedule declared in register(); see that call site.
			wp_schedule_event( time(), self::SCHEDULE, self::TICK_HOOK );

			return;
		}
		if ( ! $wanted && $scheduled ) {
			wp_clear_scheduled_hook( self::TICK_HOOK );
		}
	}

	/**
	 * Remove the tick unconditionally (deactivation / uninstall).
	 */
	public static function clearSchedule(): void {
		wp_clear_scheduled_hook( self::TICK_HOOK );
	}

	/**
	 * Cron entry point.
	 */
	public static function runTick(): void {
		// OPPORTUNISTIC ONLY (Codex round 9, item 1). The projection reconcile has its OWN hook —
		// {@see ProjectionPurge} — because this one is connection-driven: `syncSchedule()` clears it
		// when no connection exists, which is exactly the state an uninstall creates. Running it here
		// as well is free on a settled site (two autoloaded option reads) and shortens the deadline on
		// a busy one; nothing depends on it.
		ConnectionStore::make()->reconcileProjection();
		self::make()->drain();
	}

	/**
	 * Post-commit listener: reconcile the booking against every active integration.
	 *
	 * Takes only the first action argument on purpose — the status/reschedule actions carry more,
	 * but the booking SNAPSHOT already holds everything the verb decision needs, and reading the
	 * transition would tempt this class into status literals it must not have.
	 *
	 * @param mixed $booking Booking snapshot from the action.
	 */
	public function onBookingChanged( $booking ): void {
		if ( ! $booking instanceof Booking ) {
			return;
		}
		$this->reconcileInline( $booking, 0 );
	}

	/**
	 * Post-commit listener for a reschedule: the same reconcile, told who had the booking before.
	 *
	 * The previous STAFF MEMBER is the one fact of the transition this class needs (D-R78, Codex
	 * review 2026-10-06): a reference written before {@see RemoteEventRef::$staff_id} existed does
	 * not say whose calendar the event is on, and after the move the booking no longer says it
	 * either. It is a staff id, not a status, so the "derive, do not hardcode" rule above stands.
	 *
	 * @param mixed $booking  Booking snapshot (new state).
	 * @param mixed $from     Previous start (unused).
	 * @param mixed $to       New start (unused).
	 * @param mixed $previous The booking before the move, when the dispatcher knows it.
	 */
	public function onBookingRescheduled( $booking, $from = null, $to = null, $previous = null ): void {
		unset( $from, $to );
		if ( ! $booking instanceof Booking ) {
			return;
		}
		$this->reconcileInline( $booking, $previous instanceof Booking ? $previous->staff_id : 0 );
	}

	/**
	 * Run the inline first attempt for every active integration.
	 *
	 * @param Booking $booking        Booking snapshot.
	 * @param int     $previous_staff Staff member before a reschedule, or 0 when unknown.
	 */
	private function reconcileInline( Booking $booking, int $previous_staff ): void {
		foreach ( IntegrationRegistry::activeCodes() as $code ) {
			try {
				$this->reconcile( $code, $booking, true, $previous_staff );
			} catch ( \Throwable $e ) {
				// A post-commit listener MUST NOT throw (extension-surface §1): the booking is already
				// committed, and an exception escaping here aborts the rest of the action chain — which
				// on `aponto_booking_created` is where the customer's confirmation email is flushed
				// (Codex P1 #7). A calendar that failed to sync is a retry; a confirmation that never
				// sent is a support ticket.
				//
				// The retry intent was persisted BEFORE the dispatch, so the work is not lost: the cron
				// picks it up whatever happened here.
				$this->health->recordFailure( $code, 'sync', 'Outbound sync threw ' . get_class( $e ) . '.', $booking->staff_id );
			}
		}
	}

	/**
	 * Drain the retry queue of every active integration.
	 */
	public function drain(): void {
		$now = $this->clock->nowSql();
		foreach ( IntegrationRegistry::activeCodes() as $code ) {
			// The PARKED deletes of bookings that changed staff member (D-R78) have their own due row,
			// because the retirement rule below is about the booking's CURRENT staff member and would
			// throw away a delete that belongs to the previous one.
			foreach ( $this->meta->dueByKey( self::movedRetryKey( $code ), $now, self::BATCH ) as $booking_id ) {
				$booking = $this->bookings->find( $booking_id );
				if ( null === $booking ) {
					$this->clearMoved( $code, $booking_id );
					continue;
				}
				try {
					$this->releaseMovedEvents( $code, $booking, false );
				} catch ( \Throwable $e ) {
					$this->health->recordFailure( $code, 'sync', 'Retry of a moved event threw ' . get_class( $e ) . '.', $booking->staff_id );
				}
			}

			foreach ( $this->meta->dueByKey( self::retryKey( $code ), $now, self::BATCH ) as $booking_id ) {
				$booking = $this->bookings->find( $booking_id );
				if ( null === $booking ) {
					// The booking was hard-deleted; its intent is dead work.
					$this->clearIntent( $code, $booking_id );
					continue;
				}

				// TERMINAL CLASSIFICATION (Codex P2 #16). An intent whose connection has since been
				// removed, or whose service left the integration's scope, can never succeed — and
				// leaving it queued lets a handful of dead rows occupy the 25-row batch forever while
				// live work starves behind them. Retire it instead of retrying it.
				if ( null === $this->connectionFor( $code, $booking ) || ! $this->servicePushes( $code, $booking->service_id ) ) {
					$this->clearIntent( $code, $booking_id );
					continue;
				}

				try {
					$this->reconcile( $code, $booking, false );
				} catch ( \Throwable $e ) {
					// One poisoned booking must not stop the queue draining for every other one.
					$this->health->recordFailure( $code, 'sync', 'Retry threw ' . get_class( $e ) . '.', $booking->staff_id );
				}
			}
		}
	}

	/**
	 * Bring ONE booking into agreement with ONE integration.
	 *
	 * Three steps, in this order:
	 *
	 *   1. PLACE the stored references (local writes only): an event on another staff member's
	 *      calendar is parked for deletion, so step 3 can never patch it through the wrong connection.
	 *   2. DELETE the parked events through the connections that own them. Guarded: whatever happens
	 *      here — a refused delete, a storage failure, a throwing driver — step 3 still runs.
	 *   3. The ordinary push / update / delete for the booking's current staff member.
	 *
	 * @param string  $code           Module code.
	 * @param Booking $booking        Booking snapshot.
	 * @param bool    $inline         Whether this is the inline first attempt.
	 * @param int     $previous_staff Staff member before a reschedule, or 0 when unknown.
	 */
	private function reconcile( string $code, Booking $booking, bool $inline, int $previous_staff = 0 ): void {
		$this->placeStoredRefs( $code, $booking, $previous_staff );

		try {
			$this->releaseMovedEvents( $code, $booking, $inline );
		} catch ( \Throwable $e ) {
			// The delete leg armed its own retry before dispatching; it must not cost the new staff
			// member their event.
			$this->health->recordFailure( $code, 'sync', 'Removing a moved event threw ' . get_class( $e ) . '.', $booking->staff_id );
		}

		$this->reconcileCurrent( $code, $booking, $inline );
	}

	/**
	 * Where each stored reference belongs once the booking's staff member is known. PURE.
	 *
	 * - The current reference stays current while its owner is the booking's staff member. An
	 *   unrecorded owner (`staff_id` 0, written before the field existed) is the staff member the
	 *   reschedule moved the booking FROM when the caller knows it, else the booking's own — the
	 *   behaviour every such reference had until now.
	 * - A current reference owned by somebody else is PARKED: it can only be deleted, and only
	 *   through its owner's connection.
	 * - A parked reference owned by the booking's staff member is taken BACK as current (the booking
	 *   returned before the delete ran): updating the event that is still there beats deleting it
	 *   and pushing a twin, and a provider with deterministic event ids would answer the twin's
	 *   insert with "already exists".
	 * - A parked duplicate of the current reference is dropped — it is the trace of a write that was
	 *   interrupted between the two rows, and deleting it would delete the live event.
	 *
	 * @param RemoteEventRef|null  $current        Stored current reference.
	 * @param list<RemoteEventRef> $parked         Stored parked references.
	 * @param int                  $booking_staff  The booking's staff member now.
	 * @param int                  $previous_staff Staff member before a reschedule, or 0 when unknown.
	 * @return array{current: RemoteEventRef|null, parked: list<RemoteEventRef>}
	 */
	public static function placeRefs( ?RemoteEventRef $current, array $parked, int $booking_staff, int $previous_staff = 0 ): array {
		if ( null !== $current ) {
			$owner = $current->staff_id;
			if ( $owner <= 0 ) {
				$owner = $previous_staff > 0 ? $previous_staff : $booking_staff;
			}
			if ( $owner !== $booking_staff ) {
				$parked[] = $current->withStaff( $owner );
				$current  = null;
			}
		}

		$kept = array();
		foreach ( $parked as $ref ) {
			if ( $ref->staff_id === $booking_staff ) {
				if ( null === $current ) {
					$current = $ref;
				}
				if ( $current->remote_id === $ref->remote_id ) {
					continue;
				}
			}
			$key = $ref->staff_id . '|' . $ref->remote_id;
			if ( ! isset( $kept[ $key ] ) ) {
				$kept[ $key ] = $ref;
			}
		}

		return array(
			'current' => $current,
			'parked'  => array_values( $kept ),
		);
	}

	/**
	 * Apply {@see self::placeRefs()} to the stored rows. Local writes only — no HTTP.
	 *
	 * WRITE ORDER: whichever row GAINS a reference is written first, so an interruption between the
	 * two statements leaves the reference in both places (which the next pass folds back into one)
	 * and never in neither — a lost reference is an event nobody will ever delete.
	 *
	 * @param string  $code           Module code.
	 * @param Booking $booking        Booking snapshot.
	 * @param int     $previous_staff Staff member before a reschedule, or 0 when unknown.
	 * @throws StorageException When a row does not persist.
	 */
	private function placeStoredRefs( string $code, Booking $booking, int $previous_staff ): void {
		$current = $this->remoteRef( $code, $booking->id );
		$moved   = $this->movedEvents( $code, $booking->id );
		if ( null === $current && array() === $moved['refs'] ) {
			return;
		}

		$placed = self::placeRefs( $current, $moved['refs'], $booking->staff_id, $previous_staff );

		$gained = array_values(
			array_filter(
				$placed['parked'],
				static fn ( RemoteEventRef $ref ): bool => ! self::holdsRef( $moved['refs'], $ref )
			)
		);
		if ( array() !== $gained ) {
			// The UNION first: a reference about to leave the current row must already be parked
			// before that row changes. New delete work, so its ladder starts over.
			$this->writeMoved( $code, $booking->id, 0, array_merge( $moved['refs'], $gained ) );
		}

		if ( ! self::sameRefs( array_filter( array( $current ) ), array_filter( array( $placed['current'] ) ) ) ) {
			$key     = IntegrationRegistry::remoteEventKey( $code );
			$written = null === $placed['current']
				? $this->meta->deleteKey( $booking->id, $key )
				: $this->meta->setKey( $booking->id, $key, (string) wp_json_encode( $placed['current']->toArray() ) );
			if ( ! $written ) {
				throw StorageException::fromSqlError(
					esc_html( 'integration remote event reference' ),
					esc_html( 'the remote event reference did not persist' )
				);
			}
		}

		if ( ! self::sameRefs( $placed['parked'], array() !== $gained ? array_merge( $moved['refs'], $gained ) : $moved['refs'] ) ) {
			$this->writeMoved( $code, $booking->id, array() !== $gained ? 0 : $moved['attempts'], $placed['parked'] );
		}
	}

	/**
	 * Whether two reference lists hold the same references in the same order.
	 *
	 * @param array<array-key, RemoteEventRef> $a One list.
	 * @param array<array-key, RemoteEventRef> $b The other.
	 */
	private static function sameRefs( array $a, array $b ): bool {
		$shape = static fn ( RemoteEventRef $ref ): array => $ref->toArray();

		return array_map( $shape, array_values( $a ) ) === array_map( $shape, array_values( $b ) );
	}

	/**
	 * Whether a list holds exactly this reference.
	 *
	 * @param list<RemoteEventRef> $refs List.
	 * @param RemoteEventRef       $ref  Reference looked for.
	 */
	private static function holdsRef( array $refs, RemoteEventRef $ref ): bool {
		foreach ( $refs as $candidate ) {
			if ( $candidate->toArray() === $ref->toArray() ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Delete the events a booking left behind on a previous staff member's calendar (D-R78).
	 *
	 * Its own small ladder rather than the main one, because the main intent belongs to the booking's
	 * CURRENT staff member: it is cleared when there is nothing to do for them and retired when they
	 * have no connection — either of which would silently drop a delete owed to somebody else.
	 *
	 * - SERIALIZED by a lease (inline and cron alike): one worker at a time, and a worker that dies
	 *   releases it by expiry.
	 * - DURABLE BEFORE DISPATCH: the attempt number and the next due time are stored first, so a
	 *   process killed mid-call leaves a retry, not a forgotten event.
	 * - IDEMPOTENT: the driver contract already reads "not there any more" as deleted, so a retry of
	 *   a delete whose answer was lost is a no-op at the provider.
	 * - An owner with NO active connection cannot be reached at all (and core reads no busy time from
	 *   a calendar it is not connected to), so its reference is dropped rather than retried for a day.
	 *
	 * @param string  $code    Module code.
	 * @param Booking $booking Booking snapshot (passed to the driver; it describes the booking NOW).
	 * @param bool    $inline  Whether this is the inline first attempt.
	 * @throws StorageException When the retry intent does not persist.
	 */
	private function releaseMovedEvents( string $code, Booking $booking, bool $inline ): void {
		$moved = $this->movedEvents( $code, $booking->id );
		if ( array() === $moved['refs'] ) {
			return;
		}

		if ( ! $inline ) {
			$due = $this->meta->getKey( $booking->id, self::movedRetryKey( $code ) );
			if ( null !== $due && $due > $this->clock->nowSql() ) {
				return; // The main queue reached this booking first; the delete keeps its own backoff.
			}
		}

		$now = $this->clock->now();
		if ( ! $this->meta->leaseKey(
			$booking->id,
			self::movedLeaseKey( $code ),
			$now->format( 'Y-m-d H:i:s' ),
			$now->modify( '-' . self::LEASE_SECONDS . ' seconds' )->format( 'Y-m-d H:i:s' )
		) ) {
			return;
		}

		try {
			$attempt = $moved['attempts'] + 1;
			$final   = $attempt >= self::MAX_ATTEMPTS;

			$this->writeMoved( $code, $booking->id, $attempt, $moved['refs'] );
			if ( $final ) {
				$this->meta->deleteKey( $booking->id, self::movedRetryKey( $code ) );
			} else {
				$due_at = $now->modify( '+' . self::BACKOFF[ $attempt - 1 ] . ' seconds' )->format( 'Y-m-d H:i:s' );
				if ( ! $this->meta->setKey( $booking->id, self::movedRetryKey( $code ), $due_at ) ) {
					throw StorageException::fromSqlError(
						esc_html( 'integration retry intent' ),
						esc_html( 'the retry intent did not persist' )
					);
				}
			}

			$deadline = $now->getTimestamp() + ( $inline ? self::INLINE_DEADLINE : self::CRON_DEADLINE );
			$done     = array();
			$failed   = '';
			foreach ( $moved['refs'] as $ref ) {
				$connection = $this->activeConnection( $code, $ref->staff_id );
				if ( null === $connection ) {
					$done[] = $ref;
					continue;
				}

				$context = new RemoteEventContext( $code . ':' . $booking->id . ':' . $ref->sequence . ':delete', 'delete', $attempt, $deadline, $inline );
				try {
					$result = $this->dispatch( $code, 'delete', $booking, $ref, $connection, $context );
				} catch ( \Throwable $e ) {
					$result = self::retryableError( 'aponto_integration_error' );
				}

				if ( ! $result instanceof WP_Error ) {
					$done[] = $ref;
					continue;
				}

				$failed = (string) $result->get_error_code();
				if ( $final || self::isTerminal( $result ) ) {
					// No retry can help (a revoked authorization, an absent driver) or the ladder is
					// spent: stop carrying the reference, and say so.
					$done[] = $ref;
					$this->health->recordFailure( $code, 'sync', 'Removing a moved event stopped after ' . $attempt . ' attempts (' . $failed . ').', $ref->staff_id );
					continue;
				}
				$this->health->recordFailure( $code, 'sync', 'Removing a moved event failed (' . $failed . ').', $ref->staff_id );
			}

			// RE-READ before writing back: a reschedule that committed while the calls above were in
			// flight may have parked another reference, and writing this call's own copy would lose it.
			$left  = array();
			$fresh = false;
			foreach ( $this->movedEvents( $code, $booking->id )['refs'] as $ref ) {
				if ( self::holdsRef( $done, $ref ) ) {
					continue;
				}
				$left[] = $ref;
				$fresh  = $fresh || ! self::holdsRef( $moved['refs'], $ref );
			}
			if ( array() === $left ) {
				$this->clearMoved( $code, $booking->id );
			} elseif ( $fresh ) {
				// That reschedule's own inline attempt could not take the lease this call holds, so
				// its reference has no due row yet: make it due now, on a ladder of its own.
				$this->writeMoved( $code, $booking->id, 0, $left );
				$this->meta->setKey( $booking->id, self::movedRetryKey( $code ), $this->clock->nowSql() );
			} else {
				$this->writeMoved( $code, $booking->id, $attempt, $left );
			}
		} finally {
			$this->meta->deleteKey( $booking->id, self::movedLeaseKey( $code ) );
		}
	}

	/**
	 * The push / update / delete owed to the booking's CURRENT staff member.
	 *
	 * @param string  $code    Module code.
	 * @param Booking $booking Booking snapshot.
	 * @param bool    $inline  Whether this is the inline first attempt.
	 */
	private function reconcileCurrent( string $code, Booking $booking, bool $inline ): void {
		$connection = $this->connectionFor( $code, $booking );
		if ( null === $connection ) {
			return;
		}
		if ( ! $this->servicePushes( $code, $booking->service_id ) ) {
			return;
		}

		$remote = $this->remoteRef( $code, $booking->id );
		$verb   = $this->verbFor( $booking, $remote );
		if ( '' === $verb ) {
			$this->clearIntent( $code, $booking->id );

			return;
		}

		$idempotency = $code . ':' . $booking->id . ':' . $booking->ics_sequence . ':' . $verb;

		// TWO different mutual exclusions, because the two paths race with different things.
		//
		// INLINE: the value-anchored claim (extension-surface §5.2) — the same verb at the same
		// `ics_sequence` may only be dispatched once, while a reschedule bumps the sequence and is
		// legitimately new work. Taken AFTER the durable intent; see below.
		//
		// RETRY: a LEASE, not a claim (Codex P1 #8). Two overlapping cron workers — a slow tick and
		// the next one, or WP-Cron racing a real cron — both saw the same due row and both dispatched,
		// which for a provider without idempotency is a duplicate event. The lease admits exactly one
		// worker and expires on its own if that worker dies, so nothing is stranded either.
		if ( ! $inline && ! $this->leaseAttempt( $code, $booking->id ) ) {
			return;
		}

		$state   = $this->syncState( $code, $booking->id );
		$attempt = (int) ( $state['attempts'] ?? 0 ) + 1;
		// PRE-IMAGES, so a hook that loses the claim can undo exactly its own write and nothing else.
		$prior_state = $this->meta->getKey( $booking->id, IntegrationRegistry::syncKey( $code ) );
		$prior_retry = $this->meta->getKey( $booking->id, self::retryKey( $code ) );
		$deadline    = $this->clock->now()->getTimestamp() + ( $inline ? self::INLINE_DEADLINE : self::CRON_DEADLINE );

		// PERSIST THE INTENT BEFORE DISPATCHING (Codex P1 #7). Previously the permanent claim was
		// written first and the retry intent only on a caught failure — so a process killed mid-call,
		// or an exception on the way back, left a booking that looked handled and would never be
		// retried. Writing the pending attempt first inverts that: the worst case is a duplicate
		// attempt (which the idempotency key exists to absorb), never a lost one.
		//
		// AND IT NOW HAPPENS BEFORE THE CLAIM (Codex round 4, P1 #9). The claim is PERMANENT for this
		// booking+sequence: taking it first meant that when the pending write threw, there was no
		// dispatch, no retry intent — and a claim that suppressed every later attempt for the same
		// sequence. The booking was silently un-syncable forever. Ordering the durable write first
		// makes the failure recoverable: nothing is claimed, so the next hook or the next tick tries
		// again.
		// A PER-HOOK NONCE (Codex round 6, #9). Two concurrent hooks derive the same attempt number
		// and the same verb, so "the state row says attempt 2 / push" identifies neither of them —
		// a loser comparing on that could match, and erase, the WINNER's durable retry. The nonce
		// makes each write uniquely identifiable, and the undo below is a compare-and-swap against
		// the exact bytes this call stored.
		$nonce   = bin2hex( random_bytes( 8 ) );
		$written = $this->recordPending( $code, $booking, $verb, $attempt, $nonce, $prior_retry );

		// INLINE only: the value-anchored claim (extension-surface §5.2). The retry path deliberately
		// does not take it — it is retrying the claim it already holds — and is serialized by the
		// lease above instead.
		if ( $inline && ! $this->meta->claimKey( $booking->id, self::opKey( $code ), $idempotency ) ) {
			// THE LOSER UNDOES EXACTLY ITS OWN WRITE (Codex round 5, #9). Writing the pending intent
			// before the claim is what makes a crash recoverable, but it also means a hook that LOSES
			// the claim has already written one — and if the winner finished first, that write
			// resurrects an intent the winner just cleared, leaving a due retry for work that is done.
			//
			// Restoring the PRE-IMAGE rather than deleting is what makes this safe in both
			// directions: after a winner that cleared everything the pre-image is "nothing", so the
			// rows go; after a genuine earlier failure the pre-image is that failure's own still-due
			// intent, which must survive untouched.
			$this->undoOwnIntent( $code, $booking->id, $written, $prior_state, $prior_retry );

			return;
		}

		$context = new RemoteEventContext( $idempotency, $verb, $attempt, $deadline, $inline );
		$result  = $this->dispatch( $code, $verb, $booking, $remote, $connection, $context );

		if ( $result instanceof WP_Error ) {
			$this->recordFailedAttempt( $code, $booking, $verb, $attempt, $result );

			return;
		}

		$this->applySuccess( $code, $booking, $verb, $remote, $result );
	}

	/**
	 * Put the retry rows back the way this attempt found them, and only if it still owns them.
	 *
	 * Compare-and-restore against a PER-HOOK NONCE, in one atomic statement (Codex round 6, #9). The
	 * previous version compared the attempt number and verb — values two concurrent hooks derive
	 * IDENTICALLY — and did the read and the write separately, so a loser could match the winner's
	 * row and erase a durable retry that was never its own.
	 *
	 * @param string                                                        $code        Module code.
	 * @param int                                                           $booking_id  Booking id.
	 * @param array{retry: string|null, retry_removed: bool, state: string} $written     What this call wrote.
	 * @param string|null                                                   $prior_state Sync-state row before this call.
	 * @param string|null                                                   $prior_retry Retry-due row before this call.
	 */
	private function undoOwnIntent( string $code, int $booking_id, array $written, ?string $prior_state, ?string $prior_retry ): void {
		// THE STATE ROW IS THE GATE, and the swap is ATOMIC. If this call's exact bytes are no longer
		// there, someone else owns the row and nothing happens — no read-then-write window in which
		// a winner's write could be overwritten by a loser's restore.
		if ( ! $this->meta->replaceIfEquals( $booking_id, IntegrationRegistry::syncKey( $code ), $written['state'], $prior_state ) ) {
			return;
		}

		// The state row was ours, so the retry row written alongside it is ours too — restored under
		// the same condition, so a newer attempt's due time is never clobbered either.
		if ( null !== $written['retry'] ) {
			$this->meta->replaceIfEquals( $booking_id, self::retryKey( $code ), $written['retry'], $prior_retry );

			return;
		}

		// THE FINAL-ATTEMPT PATH REMOVED a row instead of writing one (Codex round 8, P1-C), and only
		// when the conditional delete matched the pre-image THIS call had read. `replaceIfEquals()`
		// cannot undo that — it updates a row, it cannot recreate one — so the restore is a write,
		// reached only through the state gate above, and only by the caller that really did the
		// removing. A hook whose conditional delete lost removed nothing and restores nothing.
		if ( $written['retry_removed'] && null !== $prior_retry ) {
			// INSERT-IF-ABSENT, not an upsert (Codex round 9, P2). Between this call's conditional
			// delete and here, another hook may legitimately have armed a NEWER retry; `setKey()`
			// would have overwritten it with an older due time this call no longer owns. The
			// conditional insert restores only into the hole it made, reports whether it did, and
			// throws if the statement itself failed — so "someone else's row is there" and "the write
			// broke" stay different answers.
			$this->meta->insertIfAbsent( $booking_id, self::retryKey( $code ), $prior_retry );
		}
	}

	/**
	 * Take the retry lease for one booking, or report that another worker holds it.
	 *
	 * @param string $code       Module code.
	 * @param int    $booking_id Booking id.
	 */
	private function leaseAttempt( string $code, int $booking_id ): bool {
		$now = $this->clock->now();

		return $this->meta->leaseKey(
			$booking_id,
			self::leaseKeyName( $code ),
			$now->format( 'Y-m-d H:i:s' ),
			$now->modify( '-' . self::LEASE_SECONDS . ' seconds' )->format( 'Y-m-d H:i:s' )
		);
	}

	/**
	 * Dispatch the driver verb (extension-surface §5.1 P2 verbs).
	 *
	 * @param string              $code       Module code.
	 * @param string              $verb       `push`, `update` or `delete`.
	 * @param Booking             $booking    Booking snapshot.
	 * @param RemoteEventRef|null $remote     Stored remote reference.
	 * @param ConnectionRef       $connection Decrypted connection.
	 * @param RemoteEventContext  $context    Per-attempt idempotency key + deadline.
	 * @return RemoteEventResult|RemoteDeleteResult|WP_Error
	 */
	private function dispatch( string $code, string $verb, Booking $booking, ?RemoteEventRef $remote, ConnectionRef $connection, RemoteEventContext $context ) {
		$missing = new WP_Error(
			IntegrationService::DRIVER_MISSING,
			\Aponto\Rest\Errors::message( IntegrationService::DRIVER_MISSING ),
			array(
				'status' => 501,
				'fields' => (object) array(),
			)
		);

		if ( 'push' === $verb ) {
			$result = apply_filters( 'aponto_push_remote_event_' . $code, $missing, $booking, $connection, $context );

			return $result instanceof RemoteEventResult || $result instanceof WP_Error ? $result : $missing;
		}

		if ( null === $remote ) {
			return $missing;
		}

		if ( 'update' === $verb ) {
			$result = apply_filters( 'aponto_update_remote_event_' . $code, $missing, $booking, $remote, $connection, $context );

			return $result instanceof RemoteEventResult || $result instanceof WP_Error ? $result : $missing;
		}

		$result = apply_filters( 'aponto_delete_remote_event_' . $code, $missing, $booking, $remote, $connection, $context );
		if ( $result instanceof RemoteDeleteResult ) {
			// An UNSUCCESSFUL delete result is a failure, not a success (Codex P2 #16): the driver is
			// telling us the event may still be on the calendar, and treating that as done would drop
			// the retry and leave a cancelled booking blocking the staff member's time.
			//
			// It is a RETRYABLE failure, deliberately NOT the `driver_missing` sentinel: that carries
			// 501, which {@see self::isTerminal()} reads as "no retry can help" — and would therefore
			// abandon exactly the work the driver just asked us to try again.
			return $result->deleted ? $result : self::retryableError( 'aponto_integration_error' );
		}

		return $result instanceof WP_Error ? $result : $missing;
	}

	/**
	 * A failure the queue should try again later.
	 *
	 * @param string $code Stable error code.
	 */
	private static function retryableError( string $code ): WP_Error {
		return new WP_Error(
			$code,
			\Aponto\Rest\Errors::message( 'aponto_integration_error' ),
			array(
				'status' => 502,
				'fields' => (object) array(),
			)
		);
	}

	/**
	 * Persist the outcome of a successful verb and clear any retry intent.
	 *
	 * @param string                               $code    Module code.
	 * @param Booking                              $booking Booking snapshot.
	 * @param string                               $verb    Verb applied.
	 * @param RemoteEventRef|null                  $remote  Previous remote reference.
	 * @param RemoteEventResult|RemoteDeleteResult $result Driver result.
	 */
	private function applySuccess( string $code, Booking $booking, string $verb, ?RemoteEventRef $remote, $result ): void {
		if ( $result instanceof RemoteDeleteResult ) {
			// CONFIRM the reference is gone before declaring the booking reconciled (Codex round 3,
			// P2). Clearing the intent over a surviving reference would leave the booking looking
			// synced while core still believes a remote event exists for it — the next status change
			// would then try to UPDATE an event that is not there.
			if ( ! $this->meta->deleteKey( $booking->id, IntegrationRegistry::remoteEventKey( $code ) ) ) {
				$this->health->recordFailure( $code, 'sync', 'Removing the remote event reference failed; the attempt stays queued.', $booking->staff_id );

				return;
			}
		} else {
			$ref = new RemoteEventRef(
				'' !== $result->remote_id ? $result->remote_id : ( $remote instanceof RemoteEventRef ? $remote->remote_id : '' ),
				$result->etag,
				$verb,
				$booking->ics_sequence,
				// WHOSE calendar this is (D-R78): the connection the verb just went through.
				$booking->staff_id
			);
			// CHECKED (Codex P1 #7). The remote side already succeeded; if the local reference cannot
			// be stored, the intent must STAY so the next attempt reconciles — and it will collide with
			// the event this attempt created rather than duplicating it, which is exactly what the
			// stable idempotency key handed to the driver is for.
			if ( ! $this->meta->setKey( $booking->id, IntegrationRegistry::remoteEventKey( $code ), (string) wp_json_encode( $ref->toArray() ) ) ) {
				$this->health->recordFailure( $code, 'sync', 'Storing the remote event reference failed; the attempt stays queued.', $booking->staff_id );

				return;
			}
		}

		$this->clearIntent( $code, $booking->id );
		$this->health->clear( $code );
	}

	/**
	 * Arm the retry BEFORE the dispatch (Codex P1 #7): store the attempt number, the verb and the
	 * time the next attempt becomes due, so a process that dies mid-call leaves durable work rather
	 * than a permanent claim with nothing behind it.
	 *
	 * @param string      $code    Module code.
	 * @param Booking     $booking Booking snapshot.
	 * @param string      $verb    Verb about to be dispatched.
	 * @param int         $attempt     1-based attempt number.
	 * @param string      $nonce       Per-hook nonce identifying THIS call's write.
	 * @param string|null $prior_retry The retry row as this call found it, for an OWNED removal.
	 * @return array{retry: string|null, retry_removed: bool, state: string} What this call wrote.
	 * @throws StorageException When the intent or the state does not persist.
	 */
	private function recordPending( string $code, Booking $booking, string $verb, int $attempt, string $nonce, ?string $prior_retry ): array {
		if ( $attempt >= self::MAX_ATTEMPTS ) {
			// This is the final attempt: pre-arm the terminal state so a crash mid-dispatch cannot
			// leave the booking queued forever.
			//
			// THE REMOVAL IS OWNED TOO (Codex round 8, P1-C). It used to be an unconditional
			// `deleteKey()` issued BEFORE the permanent claim was contested, so a hook that went on to
			// LOSE the claim had already destroyed a durable retry belonging to someone else — and it
			// could not put it back either, because it had recorded nothing about what it removed.
			// A conditional delete against the pre-image fixes both halves: only the caller that
			// actually found that row removes it, and the fact that it did is carried into
			// {@see self::undoOwnIntent()} so a loser can restore it.
			$removed = null !== $prior_retry
				&& $this->meta->replaceIfEquals( $booking->id, self::retryKey( $code ), $prior_retry, null );

			return array(
				'retry'         => null,
				'retry_removed' => $removed,
				'state'         => $this->writeState( $code, $booking->id, self::STATE_FAILED, $verb, $attempt, 'in_flight', $nonce ),
			);
		}

		$delay = self::BACKOFF[ $attempt - 1 ];
		// THE RETRY ROW CARRIES THE NONCE TOO (Codex round 7, P1-C). Restoring the two rows is two
		// statements, and a timestamp identifies nobody: two hooks at the same attempt derive the
		// SAME due time, so a loser whose state CAS happened to win the gate could still overwrite a
		// retry row the winner had already replaced in between. With the nonce in the value, each row
		// is compare-and-swapped against bytes only ONE call stack could have written, so the pair
		// needs no atomicity beyond each statement's own.
		$retry_value = $this->clock->now()->modify( '+' . $delay . ' seconds' )->format( 'Y-m-d H:i:s' ) . self::NONCE_SEPARATOR . $nonce;
		$due         = $this->meta->setKey( $booking->id, self::retryKey( $code ), $retry_value );

		// THROWS when the intent did not persist (Codex round 3, P1 #9). The whole point of writing
		// it BEFORE the dispatch is that a crash leaves durable work; a write that silently failed
		// gives the opposite — a remote call with no record that it was ever attempted. Refusing to
		// dispatch is the only honest response, and the caller's listener/drain guard turns it into
		// a logged failure rather than an escaped exception.
		if ( ! $due ) {
			throw StorageException::fromSqlError(
				esc_html( 'integration retry intent' ),
				esc_html( 'the retry intent did not persist' )
			);
		}

		return array(
			'retry'         => $retry_value,
			'retry_removed' => false,
			'state'         => $this->writeState( $code, $booking->id, self::STATE_PENDING, $verb, $attempt, 'in_flight', $nonce ),
		);
	}

	/**
	 * Record the OUTCOME of a failed attempt. The retry time was already armed by
	 * {@see self::recordPending()}; this only replaces the placeholder error code and reports it.
	 *
	 * @param string   $code    Module code.
	 * @param Booking  $booking Booking snapshot.
	 * @param string   $verb    Verb that failed.
	 * @param int      $attempt Attempt number.
	 * @param WP_Error $error   Driver error (its code and status; never a raw provider message).
	 */
	private function recordFailedAttempt( string $code, Booking $booking, string $verb, int $attempt, WP_Error $error ): void {
		$error_code = $error->get_error_code();
		// TERMINAL failures stop NOW rather than burning the whole ladder. A revoked authorization or
		// an absent driver cannot succeed on the seventh try any more than on the first, and the
		// retries only delay the moment the operator is told to reconnect. A `429` or a `5xx` is the
		// opposite — the provider is busy or broken, which is exactly what backoff is for.
		$final = $attempt >= self::MAX_ATTEMPTS || self::isTerminal( $error );

		if ( $final ) {
			$this->meta->deleteKey( $booking->id, self::retryKey( $code ) );
		}

		$this->writeState( $code, $booking->id, $final ? self::STATE_FAILED : self::STATE_PENDING, $verb, $attempt, $error_code );
		$this->health->recordFailure(
			$code,
			'sync',
			$final
				? 'Remote event sync stopped after ' . $attempt . ' attempts (' . $error_code . ').'
				: 'Remote event sync attempt failed (' . $error_code . ').',
			$booking->staff_id
		);
	}

	/**
	 * Whether a driver failure can never be fixed by trying again.
	 *
	 * Read from the error's own HTTP status and code, so it holds for any driver rather than only
	 * for the one that happens to ship today.
	 *
	 * @param WP_Error $error Driver error.
	 */
	private static function isTerminal( WP_Error $error ): bool {
		$code = $error->get_error_code();
		if ( IntegrationService::DRIVER_MISSING === $code ) {
			return true;
		}

		// A `403` carrying a QUOTA reason is the provider saying "later", not "never"
		// (Codex round 4, REG-6). Giving up on it abandons work that would have succeeded, and the
		// backoff ladder is exactly the right response. Matched on the reason the driver encoded into
		// the error code, so this holds for any driver that follows the same convention.
		if ( 1 === preg_match( '/(ratelimit|quota|dailylimit|userratelimit)/i', (string) $code ) ) {
			return false;
		}

		$status = (int) ( $error->get_error_data()['status'] ?? 0 );

		return in_array( $status, array( 401, 403, 501 ), true );
	}

	/**
	 * Which verb, if any, brings the remote calendar into agreement (see the class docblock).
	 *
	 * @param Booking             $booking Booking snapshot.
	 * @param RemoteEventRef|null $remote  Stored remote reference.
	 * @return string `push`, `update`, `delete`, or '' for nothing to do.
	 */
	private function verbFor( Booking $booking, ?RemoteEventRef $remote ): string {
		$blocking = in_array( $booking->status, $this->policy->statuses(), true );

		if ( $blocking ) {
			if ( null === $remote ) {
				return 'push';
			}

			// Already in agreement. The idempotency CLAIM cannot answer this on its own, because
			// `push` and `update` are different verbs and therefore different keys (§5.2) — so a
			// duplicated post-commit event would spend one pointless remote write every time. The
			// state comparison is the honest question: does the remote already reflect THIS version
			// of the appointment?
			//
			// KNOWN LIMIT (V1): `ics_sequence` moves on a RESCHEDULE, so a details-only edit (a
			// renamed customer, a swapped service) does not re-push. That follows from the pinned
			// idempotency key rather than from this check — a details edit was already skipped by
			// the claim, which is keyed on the same sequence.
			return $remote->sequence === $booking->ics_sequence ? '' : 'update';
		}
		if ( null === $remote ) {
			return '';
		}

		// Already over: the event blocks nothing, and removing it would erase the staff member's
		// record of an appointment that really happened.
		return $booking->end_utc > $this->clock->now() ? 'delete' : '';
	}

	/**
	 * The ACTIVE connection that should carry this booking, or null.
	 *
	 * @param string  $code    Module code.
	 * @param Booking $booking Booking snapshot.
	 */
	private function connectionFor( string $code, Booking $booking ): ?ConnectionRef {
		return $this->activeConnection( $code, $booking->staff_id );
	}

	/**
	 * A staff member's ACTIVE connection, or null.
	 *
	 * @param string $code     Module code.
	 * @param int    $staff_id Staff id.
	 */
	private function activeConnection( string $code, int $staff_id ): ?ConnectionRef {
		if ( $staff_id <= 0 || ! in_array( $staff_id, $this->connections->activeStaffIds( $code ), true ) ) {
			return null;
		}
		$connection = $this->connections->find( $code, $staff_id );

		return ( null !== $connection && $connection->isActive() ) ? $connection : null;
	}

	/**
	 * Whether this service is in scope for the module.
	 *
	 * The default is ALL services, and a module opts into per-service selection by storing
	 * `sync_all_services => false` in its own option; the selection itself lives in service meta
	 * under the `used` key of the 4-state (extension-surface §4). Core reads both generically so no
	 * module name appears here.
	 *
	 * @param string $code       Module code.
	 * @param int    $service_id Service id.
	 */
	private function servicePushes( string $code, int $service_id ): bool {
		$option = $this->settings->moduleOption( $code );
		if ( ! array_key_exists( 'sync_all_services', $option ) || (bool) $option['sync_all_services'] ) {
			return true;
		}

		return '1' === $this->service_meta->get( $service_id, IntegrationRegistry::usageKey( $code ) );
	}

	/**
	 * The stored remote reference for a booking, or null.
	 *
	 * @param string $code       Module code.
	 * @param int    $booking_id Booking id.
	 */
	private function remoteRef( string $code, int $booking_id ): ?RemoteEventRef {
		$raw = $this->meta->getKey( $booking_id, IntegrationRegistry::remoteEventKey( $code ) );
		if ( null === $raw || '' === $raw ) {
			return null;
		}
		$decoded = json_decode( $raw, true );

		return is_array( $decoded ) ? RemoteEventRef::fromArray( $decoded ) : null;
	}

	/**
	 * The parked references of a booking — events on a previous staff member's calendar that still
	 * have to be deleted — and how many delete attempts were made.
	 *
	 * @param string $code       Module code.
	 * @param int    $booking_id Booking id.
	 * @return array{attempts: int, refs: list<RemoteEventRef>}
	 */
	private function movedEvents( string $code, int $booking_id ): array {
		$out = array(
			'attempts' => 0,
			'refs'     => array(),
		);
		$raw = $this->meta->getKey( $booking_id, self::movedKey( $code ) );
		if ( null === $raw || '' === $raw ) {
			return $out;
		}
		$decoded = json_decode( $raw, true );
		if ( ! is_array( $decoded ) ) {
			return $out;
		}

		$out['attempts'] = max( 0, (int) ( $decoded['attempts'] ?? 0 ) );
		foreach ( is_array( $decoded['refs'] ?? null ) ? $decoded['refs'] : array() as $stored ) {
			$ref = is_array( $stored ) ? RemoteEventRef::fromArray( $stored ) : null;
			if ( null !== $ref && $ref->staff_id > 0 ) {
				$out['refs'][] = $ref;
			}
		}

		return $out;
	}

	/**
	 * Store the parked references, or remove the row when none is left.
	 *
	 * @param string               $code       Module code.
	 * @param int                  $booking_id Booking id.
	 * @param int                  $attempts   Delete attempts made so far.
	 * @param list<RemoteEventRef> $refs       Parked references.
	 * @throws StorageException When the row does not persist.
	 */
	private function writeMoved( string $code, int $booking_id, int $attempts, array $refs ): void {
		if ( array() === $refs ) {
			$this->clearMoved( $code, $booking_id );

			return;
		}

		$payload = (string) wp_json_encode(
			array(
				'attempts' => $attempts,
				'refs'     => array_map( static fn ( RemoteEventRef $ref ): array => $ref->toArray(), $refs ),
			)
		);
		if ( ! $this->meta->setKey( $booking_id, self::movedKey( $code ), $payload ) ) {
			throw StorageException::fromSqlError(
				esc_html( 'integration moved events' ),
				esc_html( 'the moved event references did not persist' )
			);
		}
	}

	/**
	 * Drop the parked references and their due row.
	 *
	 * @param string $code       Module code.
	 * @param int    $booking_id Booking id.
	 */
	private function clearMoved( string $code, int $booking_id ): void {
		$this->meta->deleteKey( $booking_id, self::movedKey( $code ) );
		$this->meta->deleteKey( $booking_id, self::movedRetryKey( $code ) );
	}

	/**
	 * The stored sync state for a booking.
	 *
	 * @param string $code       Module code.
	 * @param int    $booking_id Booking id.
	 * @return array<string, mixed>
	 */
	private function syncState( string $code, int $booking_id ): array {
		$raw = $this->meta->getKey( $booking_id, IntegrationRegistry::syncKey( $code ) );
		if ( null === $raw || '' === $raw ) {
			return array();
		}
		$decoded = json_decode( $raw, true );

		return is_array( $decoded ) ? $decoded : array();
	}

	/**
	 * Write the sync state row.
	 *
	 * @param string $code       Module code.
	 * @param int    $booking_id Booking id.
	 * @param string $state      {@see self::STATE_PENDING} or {@see self::STATE_FAILED}.
	 * @param string $verb       Verb attempted.
	 * @param int    $attempts   Attempts so far.
	 * @param string $error_code Stable error code.
	 * @param string $nonce      Per-hook nonce identifying this write (empty when not applicable).
	 * @return string The exact JSON written, for a caller that needs to compare-and-swap on it.
	 * @throws StorageException When the state row does not persist.
	 */
	private function writeState( string $code, int $booking_id, string $state, string $verb, int $attempts, string $error_code, string $nonce = '' ): string {
		$payload = (string) wp_json_encode(
			array(
				'state'    => $state,
				'verb'     => $verb,
				'attempts' => $attempts,
				'error'    => $error_code,
				'at'       => $this->clock->nowSql(),
				'nonce'    => $nonce,
			)
		);

		$written = $this->meta->setKey(
			$booking_id,
			IntegrationRegistry::syncKey( $code ),
			$payload
		);

		if ( ! $written ) {
			throw StorageException::fromSqlError(
				esc_html( 'integration sync state' ),
				esc_html( 'the sync state did not persist' )
			);
		}

		return $payload;
	}

	/**
	 * Drop the retry intent, the sync state and the lease (the booking is in agreement again).
	 *
	 * @param string $code       Module code.
	 * @param int    $booking_id Booking id.
	 * @return bool Whether every row was removed.
	 */
	private function clearIntent( string $code, int $booking_id ): bool {
		$cleared = $this->meta->deleteKey( $booking_id, self::retryKey( $code ) );
		$cleared = $this->meta->deleteKey( $booking_id, IntegrationRegistry::syncKey( $code ) ) && $cleared;
		$cleared = $this->meta->deleteKey( $booking_id, self::leaseKeyName( $code ) ) && $cleared;

		return $cleared;
	}

	/**
	 * Booking-meta key holding the retry LEASE (Codex P1 #8).
	 *
	 * @param string $code Module code.
	 */
	private static function leaseKeyName( string $code ): string {
		return IntegrationRegistry::namespacePrefix( $code ) . 'lease';
	}

	/**
	 * Booking-meta key holding the references parked for deletion after a staff change (D-R78).
	 *
	 * Inside the module's own namespace, so a module uninstall removes it with everything else.
	 *
	 * @param string $code Module code.
	 */
	private static function movedKey( string $code ): string {
		return IntegrationRegistry::namespacePrefix( $code ) . 'moved_events';
	}

	/**
	 * Booking-meta key holding the due stamp of the next parked-delete retry (bare `Y-m-d H:i:s`).
	 *
	 * @param string $code Module code.
	 */
	private static function movedRetryKey( string $code ): string {
		return IntegrationRegistry::namespacePrefix( $code ) . 'moved_retry_at';
	}

	/**
	 * Booking-meta key holding the parked-delete lease.
	 *
	 * @param string $code Module code.
	 */
	private static function movedLeaseKey( string $code ): string {
		return IntegrationRegistry::namespacePrefix( $code ) . 'moved_lease';
	}

	/**
	 * Booking-meta key holding the due stamp of the next retry.
	 *
	 * @param string $code Module code.
	 */
	private static function retryKey( string $code ): string {
		return IntegrationRegistry::namespacePrefix( $code ) . 'retry_at';
	}

	/**
	 * The due time inside a retry row, whichever shape it is stored in.
	 *
	 * The row holds `Y-m-d H:i:s` optionally followed by {@see self::NONCE_SEPARATOR} and the nonce
	 * of the call stack that wrote it (Codex round 7, P1-C). Rows written before that change carry
	 * the bare timestamp, so every reader parses BOTH — this helper is the one place that knows.
	 *
	 * The scanner ({@see \Aponto\Booking\Repository\BookingMetaRepository::dueByKey()}) compares
	 * the raw value as a STRING, which the suffix leaves intact: the nonce sits after the fixed-width
	 * timestamp, so ordering is unchanged and the only effect is that a row whose due time equals the
	 * scan instant exactly is picked up by the next tick instead of that one. Against a backoff
	 * ladder measured in minutes and hours, one second is not a behaviour.
	 *
	 * @param string $stored Raw metadata value.
	 */
	public static function retryDueAt( string $stored ): string {
		$cut = strpos( $stored, self::NONCE_SEPARATOR );

		return false === $cut ? $stored : substr( $stored, 0, $cut );
	}

	/**
	 * Booking-meta key holding the last idempotency claim.
	 *
	 * @param string $code Module code.
	 */
	private static function opKey( string $code ): string {
		return IntegrationRegistry::namespacePrefix( $code ) . 'op';
	}
}

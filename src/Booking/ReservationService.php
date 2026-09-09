<?php
/**
 * Reservation write model (§5.6).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Booking;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Availability\BusinessTimezone;
use Aponto\Availability\Engine;
use Aponto\Availability\ServiceDefinition;
use Aponto\Availability\TimezoneConverter;
use Aponto\Booking\Event\BookingCreated;
use Aponto\Booking\Exception\IdempotencyConflict;
use Aponto\Booking\Exception\IdempotencyInFlight;
use Aponto\Booking\Exception\SlotUnavailable;
use Aponto\Booking\Repository\ActivityRepository;
use Aponto\Booking\Repository\BookingMetaRepository;
use Aponto\Booking\Repository\BookingRepository;
use Aponto\Booking\Repository\ConnectionRepository;
use Aponto\Booking\Repository\CustomerRepository;
use Aponto\Booking\Repository\IdempotencyRepository;
use Aponto\Booking\Repository\OrderRepository;
use Aponto\Booking\Repository\ServiceRepository;
use Aponto\Database\Lock;
use Aponto\Database\StorageException;
use Aponto\Database\TransactionGuard;
use Aponto\Support\Clock;
use Aponto\Support\Settings;

/**
 * Implements the reservation write model of §5.6, following the pinned pseudo-code exactly:
 *
 *   [E5] GET_LOCK apt:idem:sha256(...)  timeout 0 (public keys only; contended → 425 immediately)
 *   →    GET_LOCK apt:sha256(prefix|staff|id)[0:48] (3s) → START TRANSACTION (READ COMMITTED) →
 *   idempotency claim → is_slot_free → findOrCreateCustomer → insert booking (frozen buffers,
 *   token_hash, local fields, consent_at) → order + item (price snapshot) → idempotency complete
 *   (201) → activity → COMMIT; on any throw ROLLBACK; finally release every lock. The domain event
 *   is dispatched POST-COMMIT and OUTSIDE the locks, carrying the raw token that lives only in this
 *   request's memory (NB-4).
 *
 * Connection identity (review E1): each lock pins the MySQL connection id that acquired it.
 * Advisory locks die with their connection, and wpdb silently RECONNECTS on "server has gone
 * away" — after which every following write would autocommit unprotected. The identity is
 * therefore re-verified (one `SELECT CONNECTION_ID()`) at three points: before `SET TRANSACTION`,
 * before the first write, and immediately before `COMMIT`. A mismatch rolls back, best-effort
 * deletes any stray autocommitted rows of this attempt, and throws a retryable
 * `SlotUnavailable('lock_timeout')` — never continues. Residual window: a reconnect during one of
 * the write statements themselves re-runs only that statement on the new connection; the very
 * next identity check catches it and the stray cleanup removes the row.
 *
 * Retry classification (review E2): the loop restarts ONLY on a {@see StorageException} whose
 * SNAPSHOT says InnoDB advised restarting (deadlock / lock-wait timeout) — never by re-reading
 * `$wpdb->last_error` after other queries have run.
 *
 * The lock is site + staff (no date dimension, §5.6). Admin/manual bookings run the same path;
 * with no idempotency key the `admin` scope skips both the idempotency lock and the claim.
 *
 * Engine (D-R20, founder 2026-07-21): the pseudo-code above is the MySQL/MariaDB path and is
 * unchanged. On SQLite the same sequence runs with {@see \Aponto\Database\SqliteLock} in place of
 * `GET_LOCK` — the drop-in opens the transaction with `BEGIN IMMEDIATE`, so the database itself
 * grants exactly one writer at a time and the claim → `is_slot_free` → insert section is
 * serialized without a named lock. Connection identity is a constant there (no server connection
 * to lose), so the three E1 checks are pass-throughs rather than dead code.
 */
final class ReservationService {

	/**
	 * Maximum transaction attempts when InnoDB aborts on a deadlock / lock-wait timeout.
	 *
	 * Two concurrent reservations for the SAME new customer email but different staff can deadlock
	 * on the `email_norm` unique index (both upserting the same key). InnoDB rolls back one victim
	 * with "try restarting transaction"; a retry then finds the row committed and takes the clean
	 * UPDATE path. The per-staff advisory lock serialises same-staff races, so this only affects
	 * cross-staff customer contention.
	 */
	private const MAX_TX_ATTEMPTS = 3;

	/**
	 * Fail-closed transaction control + connection identity.
	 *
	 * @var TransactionGuard
	 */
	private TransactionGuard $tx;

	/**
	 * Optional pre-insert guard (REST review 2026-07-12, REST-4). Runs INSIDE the reservation
	 * transaction immediately before the booking insert, with the customer row already upserted.
	 * May throw a {@see \Aponto\Support\DomainException} to abort (full rollback, locks released).
	 * Generic seam — the engine knows nothing about the policy behind it (e.g. abuse limits).
	 *
	 * @var callable|null `function (BookingDraft $draft): void`
	 */
	private $pre_insert_guard = null;

	/**
	 * Post-persist steps (REST review 2026-07-12, REST-1). Each runs INSIDE the reservation
	 * transaction after the booking + order rows are inserted and BEFORE the idempotency claim is
	 * completed, receiving the persisted snapshot, the request-scoped raw token and the draft that
	 * produced them. Rows a step writes commit and roll back atomically with the booking
	 * (transactional outbox). A step MUST be internally fail-safe for non-essential work — an
	 * escaping exception aborts the reservation. Generic seam: the engine knows nothing about
	 * notifications or about form fields.
	 *
	 * A LIST, not a single slot (D-R30): the outbox owned the only slot, so a second writer would
	 * have SILENTLY replaced it and disabled every confirmation email. Steps run in registration
	 * order, which is the order a reader of `Services::reservationService()` sees them.
	 *
	 * @var list<callable> `function (Booking $booking, ?string $raw_token, BookingDraft $draft): void`
	 */
	private array $on_persist = array();

	/**
	 * Install/remove the pre-insert guard.
	 *
	 * @param callable|null $guard `function (BookingDraft $draft): void`, may throw DomainException.
	 */
	public function setPreInsertGuard( ?callable $guard ): void {
		$this->pre_insert_guard = $guard;
	}

	/**
	 * Append a post-persist step (runs after the ones already registered).
	 *
	 * @param callable $hook `function (Booking $booking, ?string $raw_token, BookingDraft $draft): void`.
	 */
	public function addOnPersist( callable $hook ): void {
		$this->on_persist[] = $hook;
	}

	/**
	 * Drop every registered post-persist step (test/rewiring seam).
	 */
	public function clearOnPersist(): void {
		$this->on_persist = array();
	}

	/**
	 * Construct the service.
	 *
	 * @param \wpdb                 $wpdb        Database handle.
	 * @param Clock                 $clock       Clock.
	 * @param Settings              $settings    Core settings.
	 * @param Engine                $engine      Availability engine.
	 * @param ServiceRepository     $services    Service reader.
	 * @param CustomerRepository    $customers   Customer repository.
	 * @param BookingRepository     $bookings    Booking repository.
	 * @param OrderRepository       $orders      Order repository.
	 * @param IdempotencyRepository $idempotency Idempotency repository.
	 * @param ActivityRepository    $activities  Activity log.
	 * @param ConnectionRepository  $connections Staff-service connections.
	 * @param TokenGenerator        $tokens      Token/code generator.
	 * @param EventDispatcher       $events      Domain-event dispatcher.
	 * @param TimezoneConverter     $converter   Wall-clock converter.
	 * @param BusinessTimezone      $timezones   Business-timezone resolver.
	 * @param StaffLockFactory      $locks        Reservation lock factory.
	 * @param ManageToken           $manage_token Durable manage-token derivation (D-R26).
	 */
	public function __construct(
		private \wpdb $wpdb,
		private Clock $clock,
		private Settings $settings,
		private Engine $engine,
		private ServiceRepository $services,
		private CustomerRepository $customers,
		private BookingRepository $bookings,
		private OrderRepository $orders,
		private IdempotencyRepository $idempotency,
		private ActivityRepository $activities,
		private ConnectionRepository $connections,
		private TokenGenerator $tokens,
		private EventDispatcher $events,
		private TimezoneConverter $converter,
		private BusinessTimezone $timezones,
		private StaffLockFactory $locks,
		private ManageToken $manage_token
	) {
		$this->tx = new TransactionGuard( $wpdb );
	}

	/**
	 * Reserve a slot for a concrete staff member (§5.6).
	 *
	 * @param BookingDraft $draft Draft with a concrete `staff_id`.
	 * @throws SlotUnavailable    Slot taken or lock timeout (incl. lost connection identity).
	 * @throws IdempotencyConflict Key reused with a different request.
	 * @throws IdempotencyInFlight Concurrent duplicate in progress (E5: immediate, via idem lock).
	 */
	public function reserve( BookingDraft $draft ): ReservationResult {
		$staff_id        = (int) $draft->staff_id;
		$use_idempotency = 'admin' !== $draft->scope && null !== $draft->idempotency_key && '' !== $draft->idempotency_key;
		$key_hash        = $use_idempotency ? hash( 'sha256', (string) $draft->idempotency_key ) : '';

		// D-R26: resolve the manage-token derivation secret HERE, before any lock or transaction.
		// Minting it writes an option row; inside the reservation transaction that write would roll
		// back with a restartable failure while the resolver still memoised the secret, and the
		// retry would anchor the booking to a secret that never persisted — an unrebuildable link.
		// Outside, the write either commits on its own or the anchor below simply finds no secret
		// and degrades. Not fail-closed on purpose: a site with no usable key material must still be
		// able to take bookings (REST-7 / D-R15).
		$this->manage_token->prewarm();

		$held = array();

		// E5: idempotency-key lock FIRST (global lock order: idem -> staff), zero timeout — a
		// concurrent duplicate gets its 425 immediately instead of queueing on the staff lock.
		if ( $use_idempotency ) {
			$idem_lock = $this->locks->forIdempotencyKey( $key_hash );
			if ( ! $idem_lock->acquire( 0 ) ) {
				throw new IdempotencyInFlight();
			}
			$held[] = $idem_lock;
		}

		$staff_lock = $this->locks->forStaff( $staff_id );
		if ( ! $staff_lock->acquire( 3 ) ) {
			$this->releaseAll( $held );
			throw SlotUnavailable::lockTimeout();
		}
		$held[] = $staff_lock;

		// Location delete-vs-book serialization (R2 #8): for a CONCRETE location, take the same
		// per-location lock the Premium ManageLocationsController::destroy holds, so a location delete and this
		// reservation can never interleave between existence-check and commit. Global lock order:
		// idem → staff → location → service (each delete holds only its own lock — no cycle). The
		// wildcard `location_id = 0` is not a row and needs no lock.
		if ( $draft->location_id > 0 ) {
			$location_lock = $this->locks->forLocation( $draft->location_id );
			if ( ! $location_lock->acquire( 3 ) ) {
				$this->releaseAll( $held );
				throw SlotUnavailable::lockTimeout();
			}
			$held[] = $location_lock;
		}

		// Service delete/archive-vs-book serialization (review F item 1): take the same per-service
		// lock ServicesController::destroy and its status-bearing PATCH hold, so a service delete or
		// archive and this reservation can never interleave between the bookability recheck and the
		// COMMIT — a booking must never reference a vanished or archived service.
		$service_lock = $this->locks->forService( $draft->service_id );
		if ( ! $service_lock->acquire( 3 ) ) {
			$this->releaseAll( $held );
			throw SlotUnavailable::lockTimeout();
		}
		$held[] = $service_lock;

		$event  = null;
		$result = null;
		try {
			$attempt = 0;
			while ( true ) {
				$began = false;
				try {
					// E1: verify the locks still belong to THIS connection before starting.
					$this->assertLocksIntact( $held );
					// READ COMMITTED: every statement sees the latest committed data, so the
					// customer upsert read-back and idempotency re-reads never hit REPEATABLE-READ
					// snapshot conflicts. Scoped to this transaction only.
					$this->tx->beginReadCommitted();
					$began   = true;
					$outcome = $this->runReservation( $draft, $staff_id, $use_idempotency, $key_hash, $held );
					// runReservation() re-verified identity as its last step; only COMMIT follows.
					$this->tx->commit();
					$result = $outcome['result'];
					$event  = $outcome['event'];
					break;
				} catch ( \Throwable $e ) {
					// R3-3: only roll back a transaction WE began — an ambient-transaction abort
					// must leave the caller's open transaction untouched.
					if ( $began ) {
						$this->tx->rollback();
						// D-R26 belt-and-braces to the pre-warm above: a rollback may have undone an
						// option write this resolver still remembers (it cannot happen on the
						// reservation path now, but an ambient transaction opened by a caller could
						// still wrap us). Forget it so the retry re-reads what is actually persisted
						// instead of anchoring to a phantom secret.
						$this->manage_token->forgetSecret();
					}
					// E2: classify from the exception's own error snapshot, never from a later
					// read of wpdb->last_error.
					if ( $e instanceof StorageException && $e->isRestartable() && ++$attempt < self::MAX_TX_ATTEMPTS ) {
						continue;
					}
					throw $e;
				}
			}
		} finally {
			$this->releaseAll( $held );
		}

		// POST-COMMIT, OUTSIDE the locks: dispatched RAW per standard WordPress semantics (verify
		// round V3) — the booking is committed and the created notification was queued IN the
		// transaction (outbox), so nothing here depends on listener behaviour; an extension
		// exception propagates as that extension's bug.
		if ( null !== $event ) {
			$this->events->dispatch( $event );
		}

		return $result;
	}

	/**
	 * Reserve without a fixed staff member: resolve candidates and try each until one succeeds
	 * (§5.6). Each candidate uses the standard {@see self::reserve()} (its own locks), so no two
	 * staff locks are ever held at once. An {@see IdempotencyInFlight} from the idem lock
	 * propagates immediately — a concurrent duplicate is already processing this key.
	 *
	 * @param BookingDraft $draft Draft with `staff_id = null`.
	 * @throws SlotUnavailable When every candidate is busy.
	 */
	public function reserveAnyStaff( BookingDraft $draft ): ReservationResult {
		$candidates = $this->connections->staffForService( $draft->service_id, $draft->location_id );
		if ( array() === $candidates ) {
			throw SlotUnavailable::taken();
		}

		if ( 1 === count( $candidates ) ) {
			return $this->reserve( $draft->withStaff( $candidates[0] ) );
		}

		foreach ( $candidates as $candidate ) {
			try {
				return $this->reserve( $draft->withStaff( $candidate ) );
			} catch ( SlotUnavailable $e ) {
				// Taken or lock timeout on this staff — try the next candidate (§5.6).
				unset( $e );
				continue;
			}
		}

		throw SlotUnavailable::taken();
	}

	/**
	 * The reservation body running inside the transaction.
	 *
	 * @param BookingDraft $draft           Draft (concrete staff).
	 * @param int          $staff_id        Concrete staff id.
	 * @param bool         $use_idempotency Whether the idempotency claim applies.
	 * @param string       $key_hash        Idempotency key hash ('' when unused).
	 * @param list<Lock>   $held            Locks whose identity guards this critical section.
	 * @return array{result: ReservationResult, event: BookingCreated|null}
	 */
	private function runReservation( BookingDraft $draft, int $staff_id, bool $use_idempotency, string $key_hash, array $held ): array {
		$ctx = array(
			'booking_id' => 0,
			'order_id'   => 0,
		);

		try {
			return $this->performReservation( $draft, $staff_id, $use_idempotency, $key_hash, $held, $ctx );
		} catch ( SlotUnavailable $e ) {
			// E1: an identity failure at ANY point after the claim may have left autocommitted
			// strays (incl. the claim row itself — an orphan would 425 this key until TTL expiry).
			// R4-2 ordering: recovery FIRST; the public anomaly action only fires AFTER it.
			if ( 'lock_timeout' === $e->reason() ) {
				$this->interleave( 'reserve_identity_failure' );
				$this->cleanupStrays( (int) $ctx['booking_id'], (int) $ctx['order_id'], $use_idempotency ? $key_hash : '', $draft->scope );
				$this->anomaly(
					'reserve_identity_failure',
					array(
						'booking_id' => (int) $ctx['booking_id'],
						'order_id'   => (int) $ctx['order_id'],
					)
				);
			}
			throw $e;
		}
	}

	/**
	 * Test-only interleaving probe (R4-2): injected by tests to interleave a second actor between
	 * identity-failure detection and recovery. Production never sets it — no public hook runs
	 * before recovery.
	 *
	 * @internal
	 * @var callable|null
	 */
	private $interleave_probe = null;

	/**
	 * Inject the test-only interleaving probe.
	 *
	 * @internal Test seam only.
	 * @param callable|null $probe `function (string $code): void`.
	 */
	public function setTestInterleaveProbe( ?callable $probe ): void {
		$this->interleave_probe = $probe;
	}

	/**
	 * Invoke the test-only probe (no-op in production).
	 *
	 * @param string $code Failure code.
	 */
	private function interleave( string $code ): void {
		if ( null !== $this->interleave_probe ) {
			( $this->interleave_probe )( $code );
		}
	}

	/**
	 * Surface a reservation-layer anomaly for structured logging (Logger arrives in §8.3; until
	 * then this diagnostic action is the stable, PII-free hook point — ids only, never PII).
	 * Wrapped fail-safe (R4-2): a throwing listener must never alter recovery control flow.
	 *
	 * @param string             $code    Stable anomaly code.
	 * @param array<string, int> $context Numeric context (ids).
	 */
	private function anomaly( string $code, array $context ): void {
		try {
			/**
			 * Fires when the reservation layer detects an anomaly (diagnostic only).
			 *
			 * @param string             $code    Stable anomaly code.
			 * @param array<string, int> $context Numeric context.
			 */
			do_action( 'aponto_reservation_anomaly', $code, $context );
		} catch ( \Throwable $listener_failure ) {
			unset( $listener_failure ); // Swallowed by design — diagnostics never block recovery.
		}
	}

	/**
	 * The reservation body proper (see {@see self::runReservation()} for the stray-cleanup wrap).
	 *
	 * @param BookingDraft       $draft           Draft (concrete staff).
	 * @param int                $staff_id        Concrete staff id.
	 * @param bool               $use_idempotency Whether the idempotency claim applies.
	 * @param string             $key_hash        Idempotency key hash ('' when unused).
	 * @param list<Lock>         $held            Locks guarding this critical section.
	 * @param array<string, int> $ctx             Mutable context collecting written row ids.
	 * @return array{result: ReservationResult, event: BookingCreated|null}
	 */
	private function performReservation( BookingDraft $draft, int $staff_id, bool $use_idempotency, string $key_hash, array $held, array &$ctx ): array {
		if ( $use_idempotency ) {
			$claim = $this->idempotency->claim( $key_hash, $draft->scope, $draft->request_hash );

			if ( 'conflict' === $claim['status'] ) {
				throw new IdempotencyConflict();
			}
			if ( 'in_flight' === $claim['status'] ) {
				throw new IdempotencyInFlight();
			}
			if ( 'replay' === $claim['status'] ) {
				$existing = $this->bookings->find( (int) $claim['booking_id'] );
				if ( null === $existing ) {
					throw new IdempotencyInFlight();
				}

				// Replay: same booking, NO token/url (§5.6). No domain event on replay.
				return array(
					'result' => new ReservationResult( $existing, null, true ),
					'event'  => null,
				);
			}
		}

		if ( ! $this->engine->is_slot_free( $draft ) ) {
			throw SlotUnavailable::taken();
		}

		// E1: verify identity IMMEDIATELY after the slot check — the pinned "kill between
		// is_slot_free and insert" scenario must surface as a retryable lock timeout before any
		// further read result can be misinterpreted or any write can run.
		$this->assertLocksIntact( $held );

		// Delete-vs-book race (entity lifecycle §4.4): the per-staff/per-location locks this section
		// holds also serialise the admin staff-delete/archive and location-delete (both re-check
		// under the SAME locks). A staff row removed/archived — or a concrete location removed — by
		// a concurrent request is therefore visible here under READ COMMITTED; a booking must NEVER
		// reference a non-bookable provider or a vanished location, so treat it as an unavailable
		// slot (reserveAnyStaff then falls through to the next candidate). Fast-fail here; the
		// AUTHORITATIVE recheck repeats immediately before the insert (R2 #3).
		if ( ! $this->targetsAreBookable( $draft, $staff_id ) ) {
			throw SlotUnavailable::taken();
		}

		$service = $this->services->find( $draft->service_id );
		if ( null === $service ) {
			throw SlotUnavailable::taken();
		}

		// E1: nothing beyond this point may run without the locks — re-verify before the FIRST write.
		$this->assertLocksIntact( $held );

		$customer_id = $this->customers->findOrCreateByEmail( $draft->customer );

		$tz           = $this->timezones->forLocation( $draft->location_id );
		$wall         = $this->converter->instantToWall( $draft->start_utc, $tz );
		$start_minute = $wall['minute'];
		$end_minute   = $start_minute + $service->duration_minutes;
		$end_utc      = $this->converter->endInstant( $wall['date'], $end_minute, $tz );
		if ( null === $end_utc ) {
			// The end falls strictly inside a DST gap; such candidates are never emitted (E3) so
			// this is defensive — the slot cannot be represented, treat as unavailable.
			throw SlotUnavailable::taken();
		}

		// REST-4 seam: the guard sees the final draft INSIDE the transaction, right before the
		// insert (race-safe under the staff lock); a throw rolls the whole reservation back.
		if ( null !== $this->pre_insert_guard ) {
			( $this->pre_insert_guard )( $draft );
		}

		// PROVISIONAL token (D-R26): the durable token derives from the auto-increment id, which
		// does not exist until the insert returns, so the row goes in with a CSPRNG value and is
		// re-anchored below — still inside this transaction, before the booking is visible to
		// anyone. On a site with no derivation secret (REST-7 degrade) this provisional value is
		// simply the final one, which is exactly D-R25 behaviour.
		$raw_token  = $this->tokens->rawToken();
		$token_hash = $this->tokens->hash( $raw_token );
		$now        = $this->clock->nowSql();
		$status     = null !== $draft->status && '' !== $draft->status
			? $draft->status
			: $this->defaultCreateStatus( $service );

		// R2 #3 — the AUTHORITATIVE bookability recheck at the LAST point before the insert: every
		// intermediate step above (customer upsert, tz conversion, pre-insert guard) ran queries a
		// reconnect could interleave with; re-reading staff + location HERE, still under the held
		// locks, guarantees the row the insert is about to reference exists at insert time.
		if ( ! $this->targetsAreBookable( $draft, $staff_id ) ) {
			throw SlotUnavailable::taken();
		}

		$booking_id        = $this->bookings->insert(
			array(
				'service_id'         => $draft->service_id,
				'staff_id'           => $staff_id,
				'location_id'        => $draft->location_id,
				'start_datetime_utc' => $draft->start_utc->setTimezone( new \DateTimeZone( 'UTC' ) )->format( 'Y-m-d H:i:s' ),
				'end_datetime_utc'   => $end_utc->format( 'Y-m-d H:i:s' ),
				'local_date'         => $wall['date'],
				'start_minute'       => $start_minute,
				'end_minute'         => $end_minute,
				'buffer_before'      => $service->buffer_before,
				'buffer_after'       => $service->buffer_after,
				'status'             => $status,
				'attendees'          => max( 1, $draft->attendees ),
				'customer_id'        => $customer_id,
				'customer_timezone'  => $draft->customer_timezone,
				'customer_note'      => $draft->customer->note,
				'consent_at'         => $draft->consent ? $now : null,
				'token_hash'         => $token_hash,
				'ics_sequence'       => 0,
				'created_at'         => $now,
				'updated_at'         => $now,
			)
		);
		$ctx['booking_id'] = $booking_id;

		// ANCHOR the durable manage token (D-R26): now that the id exists, replace the provisional
		// hash with the hash of `HMAC(secret, "{id}|{created_at}")`. Every later email re-derives
		// exactly this value, so the customer's link is the same in all of them — while the raw
		// token still never touches the database (§5 invariant 8). Fail-closed: the repository
		// throws unless exactly one row changed, rolling the whole reservation back rather than
		// committing a booking whose token could not be rebuilt.
		//
		// The derivation input is the STORED `created_at`, read back rather than reused from `$now`:
		// the send path derives from the hydrated column, so both sides must be the same bytes on
		// BOTH supported engines (MySQL normalizes a datetime, SQLite keeps text verbatim — D-R20).
		// Reading it back makes that identity structural instead of an assumption about formatting.
		// Fail-closed: an unreadable `created_at` throws out of here (StorageException) rather than
		// degrading — committing a booking that can never rebuild its link is worse than a retry.
		$created_at = $this->bookings->storedCreatedAt( $booking_id );
		$derived    = $this->manage_token->derive( $booking_id, $created_at );
		if ( null !== $derived ) {
			$raw_token  = $derived;
			$token_hash = $this->tokens->hash( $derived );
			$this->bookings->anchorTokenHash( $booking_id, $token_hash );
		}

		$order           = $this->orders->createWithItem( $booking_id, $service->price_minor, (string) $this->settings->get( 'currency' ) );
		$ctx['order_id'] = (int) $order['id'];

		$booking = new Booking(
			$booking_id,
			$draft->service_id,
			$staff_id,
			$draft->location_id,
			$draft->start_utc->setTimezone( new \DateTimeZone( 'UTC' ) ),
			$end_utc,
			$wall['date'],
			$start_minute,
			$end_minute,
			$service->buffer_before,
			$service->buffer_after,
			$status,
			max( 1, $draft->attendees ),
			$customer_id,
			$draft->customer_timezone,
			$token_hash,
			0,
			(int) $order['id'],
			(string) $order['code'],
			'',
			0,
			// The STORED value, so the in-memory snapshot handed to the outbox derives the same
			// token the send path will (D-R26). Guaranteed non-empty — storedCreatedAt() throws
			// rather than returning a blank.
			$created_at
		);

		// REST-1 seam: transactional-outbox steps — run after booking + order insert, BEFORE the
		// idempotency claim is completed, in registration order; whatever they write rolls back
		// with the booking.
		foreach ( $this->on_persist as $step ) {
			$step( $booking, $raw_token, $draft );
		}

		if ( $use_idempotency ) {
			$this->idempotency->complete( $key_hash, $draft->scope, $booking_id, 201 );
		}

		$this->activities->log(
			'booking',
			$booking_id,
			'created',
			array(
				'status'   => $status,
				'staff_id' => $staff_id,
				'order'    => $order['code'],
			),
			$draft->scope
		);

		// E1: LAST statement before COMMIT — if the connection changed mid-write-phase, any rows
		// written after the reconnect were autocommitted WITHOUT lock protection. Abort (the
		// wrapper removes the strays); never commit.
		$this->assertLocksIntact( $held );

		return array(
			'result' => new ReservationResult( $booking, $raw_token, false ),
			'event'  => new BookingCreated( $booking, $raw_token, 'send' ),
		);
	}

	/**
	 * The status a booking gets when the caller pins none. The customer form always defers here
	 * (its draft carries no status); the admin create pins an explicit status and never reaches
	 * this. Normally the `default_booking_status` setting — but a FREE service (price 0 or unset)
	 * is confirmed on the spot when `booking.auto_confirm_free` is ON (default), because a $0
	 * booking has nothing to collect or approve and a "pending" default only adds a needless manual
	 * step (B2 / SPEC-P1 §2.2 addendum 2026-07-20; finding U3 Jonas). The email branch keys off the
	 * resulting status, so a confirmed free booking automatically gets the confirmed template.
	 *
	 * @param ServiceDefinition $service The reserved service (price snapshot in scope).
	 */
	private function defaultCreateStatus( ServiceDefinition $service ): string {
		if ( ( null === $service->price_minor || 0 === $service->price_minor )
			&& (bool) $this->settings->get( 'booking.auto_confirm_free' ) ) {
			return 'confirmed';
		}

		return (string) $this->settings->get( 'default_booking_status' );
	}

	/**
	 * Verify every held lock still belongs to the CURRENT connection (review E1). A mismatch (or
	 * an unreadable connection id) means wpdb reconnected and the locks are gone — abort with a
	 * retryable lock timeout; the caller rolls back.
	 *
	 * @param list<Lock> $held Held locks.
	 * @throws SlotUnavailable When identity is lost.
	 */
	private function assertLocksIntact( array $held ): void {
		if ( array() === $held ) {
			return;
		}

		$current = $this->tx->currentConnectionId();
		foreach ( $held as $lock ) {
			if ( null === $current || $lock->connectionId() !== $current ) {
				throw SlotUnavailable::lockTimeout();
			}
		}
	}

	/**
	 * Whether the draft's write targets are still valid — the booking-create guard against the
	 * delete-vs-book races (§4.4, R2 #3/#8; review F item 1): the SERVICE exists AND is active, the
	 * staff member exists AND is active, is CONNECTED to the service at the draft location (§5.3
	 * eligibility), and a concrete (non-wildcard) location still exists. Read under the held
	 * per-staff/per-location/per-service locks (READ COMMITTED), so a concurrent committed
	 * delete/archive/unassign is visible — the authoritative recheck immediately before the
	 * insert (R2 #3) guarantees the rows the booking references are still bookable at insert time.
	 *
	 * @param BookingDraft $draft    Draft carrying the service + location.
	 * @param int          $staff_id Concrete staff id.
	 */
	private function targetsAreBookable( BookingDraft $draft, int $staff_id ): bool {
		// Service existence + active status (review F item 1): an archived/draft/deleted service is
		// not bookable — the ServicesController flips/deletes it under the SAME per-service lock this
		// section holds, so this read is race-free.
		$services = $this->wpdb->prefix . 'aponto_services';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; id bound via prepare(); in-transaction existence guard.
		$service_status = $this->wpdb->get_var( $this->wpdb->prepare( "SELECT status FROM {$services} WHERE id = %d", $draft->service_id ) );
		if ( 'active' !== $service_status ) {
			return false;
		}

		$staff = $this->wpdb->prefix . 'aponto_staff';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; id bound via prepare(); in-transaction existence guard.
		$status = $this->wpdb->get_var( $this->wpdb->prepare( "SELECT status FROM {$staff} WHERE id = %d", $staff_id ) );
		if ( 'active' !== $status ) {
			return false;
		}

		// Concrete-staff eligibility (§5.3): the staff member must be assigned to this service at the
		// draft's location (or the `0` wildcard). Rechecked in the lock so a connection removed by a
		// concurrent eligibility edit is visible before the insert (Codex engine review).
		if ( ! $this->connections->isConnected( $staff_id, $draft->service_id, $draft->location_id ) ) {
			return false;
		}

		if ( $draft->location_id > 0 ) {
			$locations = $this->wpdb->prefix . 'aponto_locations';
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; id bound via prepare(); in-transaction existence guard.
			if ( null === $this->wpdb->get_var( $this->wpdb->prepare( "SELECT id FROM {$locations} WHERE id = %d", $draft->location_id ) ) ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Best-effort removal of rows this attempt may have AUTOCOMMITTED on a reconnected session
	 * (review E1). On the healthy path these rows are uncommitted transaction state and the
	 * deletes match nothing; after a mid-write reconnect they are real orphans and are removed.
	 *
	 * @param int    $booking_id Booking id of this attempt (0 = none).
	 * @param int    $order_id   Order id of this attempt (0 = none).
	 * @param string $key_hash   Idempotency key hash ('' = none).
	 * @param string $scope      Idempotency scope.
	 */
	private function cleanupStrays( int $booking_id, int $order_id, string $key_hash, string $scope ): void {
		$suppressed = $this->wpdb->suppress_errors( true );

		if ( $booking_id > 0 ) {
			$this->wpdb->delete( $this->wpdb->prefix . 'aponto_bookings', array( 'id' => $booking_id ), array( '%d' ) );
			$this->wpdb->delete(
				$this->wpdb->prefix . 'aponto_activities',
				array(
					'entity_type' => 'booking',
					'entity_id'   => $booking_id,
				),
				array( '%s', '%d' )
			);
			// Outbox rows the on-persist hook may have autocommitted for this attempt (REST-1).
			$this->wpdb->delete( $this->wpdb->prefix . 'aponto_notification_deliveries', array( 'booking_id' => $booking_id ), array( '%d' ) );

			// Metadata an on-persist step may have autocommitted for this attempt — today the
			// customer's custom-field answers (D-R30), which are free text the person typed and
			// therefore the most sensitive rows this recovery can be asked to clean. Without this
			// they outlive the booking they belong to: the booking row is deleted above, so what
			// remains is orphaned plaintext PII under an id nothing points at any more, invisible
			// to the eraser (which walks bookings) and to the retention cron.
			//
			// Deleted GENERICALLY, by booking id, rather than by the `custom_fields.` prefix: this
			// id belonged to a booking that was created moments ago and rolled away, so it owns no
			// metadata that is not this attempt's, and any FUTURE on-persist meta writer is covered
			// without anyone remembering to extend this list.
			//
			// The repository throws on a failed statement; this cleanup runs inside a `catch`, in
			// best-effort mode with errors suppressed, and is about to rethrow the caller's
			// `SlotUnavailable`. Replacing that with a StorageException would turn a RETRYABLE
			// failure into an opaque one, so the failure is downgraded to the same PII-free anomaly
			// signal the claim-cleanup branch below uses.
			try {
				( new BookingMetaRepository( $this->wpdb ) )->deleteForBooking( $booking_id );
			} catch ( StorageException $failure ) {
				unset( $failure );
				$this->anomaly( 'reserve_meta_cleanup_failed', array( 'booking_id' => $booking_id ) );
			}
		}
		if ( $order_id > 0 ) {
			$this->wpdb->delete( $this->wpdb->prefix . 'aponto_order_items', array( 'order_id' => $order_id ), array( '%d' ) );
			$this->wpdb->delete( $this->wpdb->prefix . 'aponto_orders', array( 'id' => $order_id ), array( '%d' ) );
		}

		// R3-2: the claim row has no per-attempt id, so ownership must be re-established before
		// touching it. Reacquire the idem-key lock (timeout 0):
		// - fail    -> another request (B) is processing this key RIGHT NOW; every existing row
		// is presumed B's — skip the claim cleanup entirely.
		// - success -> nobody is processing the key; delete ONLY an OWNERLESS in-flight row
		// (booking_id IS NULL). A row with booking_id is a COMPLETED reservation —
		// replay is its holder's right; cleanup never deletes it.
		if ( '' !== $key_hash ) {
			$idem = $this->locks->forIdempotencyKey( $key_hash );
			if ( $idem->acquire( 0 ) ) {
				$table = $this->wpdb->prefix . 'aponto_idempotency';
				// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter -- table name from $wpdb->prefix, not user input.
				$this->wpdb->query(
					// phpcs:disable WordPress.DB.PreparedSQL.NotPrepared -- Values are passed to wpdb::prepare; sniff cannot recognize the injected wpdb property.
					$this->wpdb->prepare(
						// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- table name from $wpdb->prefix, not user input.
						"DELETE FROM {$table} WHERE key_hash = %s AND scope = %s AND booking_id IS NULL",
						$key_hash,
						$scope
					)
					// phpcs:enable WordPress.DB.PreparedSQL.NotPrepared
				);
				$idem->release();
			} else {
				$this->anomaly( 'reserve_claim_cleanup_skipped', array( 'booking_id' => $booking_id ) );
			}
		}

		$this->wpdb->suppress_errors( $suppressed );
	}

	/**
	 * Release every acquired lock (reverse order).
	 *
	 * @param list<Lock> $held Locks.
	 */
	private function releaseAll( array $held ): void {
		foreach ( array_reverse( $held ) as $lock ) {
			$lock->release();
		}
	}
}

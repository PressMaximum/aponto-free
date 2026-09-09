<?php
/**
 * Webhook replay guard — `aponto_payment_events` (D-R38f).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Payments;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Database\StorageException;
use Aponto\Support\Clock;

/**
 * The ledger that makes "apply this webhook" safe to call twice — and, since the Codex round,
 * safe to call twice when the FIRST call died half way through.
 *
 * Gateways retry aggressively: a 500, a slow response or a network blip all produce the same event
 * again, and some deliver it twice for no reason at all. Applying a `payment_succeeded` twice would
 * re-queue notifications and re-log activity; applying a `refund_succeeded` twice would genuinely
 * double-count the refunded amount. So the event id is claimed first, atomically.
 *
 * ### The claim is a LEASE, not a permanent mark
 *
 * The first cut wrote the row as `applied` up front and deleted it again if the apply threw. Both
 * halves were wrong. A worker killed between the INSERT and the apply — a PHP timeout, a redeployed
 * container, an OOM — leaves a row that says "handled" for a payment that was never applied, and the
 * gateway's retry is then answered `200 duplicate`. The payment is lost, silently and permanently,
 * and no retry can ever recover it because the gateway has been told everything is fine.
 *
 * The row is therefore written `processing` with a `claimed_at` timestamp, and only the caller's
 * successful apply promotes it to a terminal status. A retry meeting:
 *
 *   - a TERMINAL row (`applied`/`ignored`/`failed`) ⇒ genuinely a duplicate, answer 200;
 *   - a `processing` row older than {@see self::LEASE_SECONDS} ⇒ the previous worker died, RECLAIM it
 *     by compare-and-swap on `claimed_at` and apply again (the apply is idempotent by design);
 *   - a FRESH `processing` row ⇒ another worker has it right now, answer retryable so the gateway
 *     comes back rather than being told a lie in either direction.
 *
 * A failed INSERT is still never read as "already claimed" on its own (D-R34a): only a duplicate-key
 * errno followed by a successful read-back is, and anything else raises {@see StorageException} so
 * the route answers 500 and the gateway retries.
 */
final class PaymentEventLedger {

	/**
	 * The claim is held but the outcome is not decided yet.
	 */
	public const STATUS_PROCESSING = 'processing';

	/**
	 * The event was applied to an order.
	 */
	public const STATUS_APPLIED = 'applied';

	/**
	 * The event was understood but concerned nothing this site owns.
	 */
	public const STATUS_IGNORED = 'ignored';

	/**
	 * The event was claimed but could not be applied.
	 */
	public const STATUS_FAILED = 'failed';

	/**
	 * Statuses that mean the event is finished with.
	 *
	 * @var list<string>
	 */
	public const TERMINAL = array( self::STATUS_APPLIED, self::STATUS_IGNORED, self::STATUS_FAILED );

	/**
	 * This call owns the claim and must apply the event.
	 */
	public const CLAIM_TAKEN = 'taken';

	/**
	 * A previous worker's lease had expired; this call took it over and must apply the event.
	 */
	public const CLAIM_RECLAIMED = 'reclaimed';

	/**
	 * The event is already finished — answer the gateway `200 duplicate`.
	 */
	public const CLAIM_DUPLICATE = 'duplicate';

	/**
	 * Another worker holds a FRESH lease — answer the gateway retryable.
	 */
	public const CLAIM_IN_PROGRESS = 'in_progress';

	/**
	 * {@see self::record()} stored the terminal status.
	 */
	public const RECORD_DONE = 'recorded';

	/**
	 * {@see self::record()} found the lease had moved on — another worker owns the event now.
	 */
	public const RECORD_LOST = 'lost';

	/**
	 * {@see self::record()} could not talk to storage.
	 */
	public const RECORD_FAILED = 'failed';

	/**
	 * How long a claim may be held before another worker may take it over, in seconds.
	 *
	 * Comfortably longer than any single apply (which is bounded by the per-order lock's 3 s plus one
	 * gateway round trip) and comfortably shorter than a gateway's own retry ladder, so a dead
	 * worker's event is picked up by the next delivery rather than by a human.
	 */
	public const LEASE_SECONDS = 120;

	/**
	 * Maximum stored length of a provider event id — the `varchar(150)` the unique index is sized
	 * for. Longer ids are REFUSED rather than truncated (Codex #17): two different events whose
	 * first 150 characters match would collide on the unique key, and the second one would be
	 * answered "duplicate" for work nobody did.
	 */
	public const MAX_EVENT_ID = 150;

	/**
	 * Construct the ledger.
	 *
	 * @param \wpdb $wpdb  Database handle.
	 * @param Clock $clock Clock.
	 */
	public function __construct(
		private \wpdb $wpdb,
		private Clock $clock
	) {}

	/**
	 * Fully-qualified table name.
	 */
	private function table(): string {
		return $this->wpdb->prefix . 'aponto_payment_events';
	}

	/**
	 * Whether an event id fits the stored column (Codex #17).
	 *
	 * @param string $event_id Provider event id.
	 */
	public static function isStorableEventId( string $event_id ): bool {
		return '' !== $event_id && strlen( $event_id ) <= self::MAX_EVENT_ID;
	}

	/**
	 * Claim `(gateway, event_id)` for this request.
	 *
	 * @param string $gateway  Module code.
	 * @param string $event_id Provider event id (must already satisfy {@see self::isStorableEventId()}).
	 * @param string $type     Normalized event type.
	 * @return EventClaim The claim outcome, carrying the lease timestamp this worker owns.
	 * @throws StorageException When the storage layer failed (never reported as a duplicate).
	 */
	public function claim( string $gateway, string $event_id, string $type ): EventClaim {
		$now = $this->clock->nowSql();

		$suppressed = $this->wpdb->suppress_errors( true );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Atomic unique claim; a duplicate-key failure is the expected "already seen" answer, resolved below.
		$inserted = $this->wpdb->insert(
			$this->table(),
			array(
				'gateway'     => $gateway,
				'event_id'    => $event_id,
				'type'        => mb_substr( $type, 0, 64 ),
				'order_id'    => null,
				'status'      => self::STATUS_PROCESSING,
				'claimed_at'  => $now,
				'received_at' => $now,
			),
			array( '%s', '%s', '%s', '%d', '%s', '%s', '%s' )
		);
		$error    = (string) $this->wpdb->last_error;
		$this->wpdb->suppress_errors( $suppressed );

		if ( false !== $inserted ) {
			return new EventClaim( self::CLAIM_TAKEN, $now );
		}

		if ( ! $this->eventExists( $gateway, $event_id ) ) {
			throw StorageException::fromSqlError( esc_html( 'payment event claim' ), esc_html( $error ) );
		}

		return $this->resolveExistingClaim( $gateway, $event_id );
	}

	/**
	 * Whether the exact webhook identity exists after an INSERT failure.
	 *
	 * @param string $gateway  Module code.
	 * @param string $event_id Provider event id.
	 */
	private function eventExists( string $gateway, string $event_id ): bool {
		$table = $this->table();
		$sql   = $this->wpdb->prepare(
			'SELECT 1 FROM %i WHERE gateway = %s AND event_id = %s LIMIT 1',
			$table,
			$gateway,
			$event_id
		);
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared -- Identifier and values are bound above; collision read-back on the exact unique key.
		$value = $this->wpdb->get_var( $sql );

		return '1' === (string) $value;
	}

	/**
	 * Decide what an existing row means for the caller: finished, in flight, or abandoned.
	 *
	 * @param string $gateway  Module code.
	 * @param string $event_id Provider event id.
	 * @return EventClaim The claim outcome, carrying the lease timestamp when this worker won one.
	 * @throws StorageException When the read fails or the row vanished.
	 */
	private function resolveExistingClaim( string $gateway, string $event_id ): EventClaim {
		$sql = 'SELECT status, claimed_at FROM ' . $this->table() . ' WHERE gateway = %s AND event_id = %s';
		$this->wpdb->flush();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		$row = $this->wpdb->get_row( $this->wpdb->prepare( $sql, $gateway, $event_id ), ARRAY_A );
		if ( '' !== (string) $this->wpdb->last_error ) {
			throw StorageException::fromSqlError( esc_html( 'payment event claim read-back' ), esc_html( (string) $this->wpdb->last_error ) );
		}
		if ( ! is_array( $row ) ) {
			// The driver reported a duplicate key for a row that is not there. Nothing about this
			// state is safe to guess at, so it is raised rather than resolved.
			throw StorageException::because( esc_html( 'payment event claim reported a duplicate that does not exist' ) );
		}

		$status = (string) $row['status'];
		if ( in_array( $status, self::TERMINAL, true ) ) {
			return new EventClaim( self::CLAIM_DUPLICATE );
		}

		$claimed_at = (string) ( $row['claimed_at'] ?? '' );
		$cutoff     = $this->clock->now()->sub( new \DateInterval( 'PT' . self::LEASE_SECONDS . 'S' ) )->format( 'Y-m-d H:i:s' );
		if ( '' !== $claimed_at && $claimed_at > $cutoff ) {
			return new EventClaim( self::CLAIM_IN_PROGRESS );
		}

		// The lease has expired. Take it over by compare-and-swap on the EXACT timestamp we just
		// read: two workers noticing the same abandoned claim in the same second must not both apply
		// it, and the affected-row count is the only honest way to know which of them won.
		$mine   = $this->clock->nowSql();
		$update = 'UPDATE ' . $this->table() . ' SET claimed_at = %s WHERE gateway = %s AND event_id = %s AND status = %s AND claimed_at = %s';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare(); lease compare-and-swap.
		$affected = $this->wpdb->query( $this->wpdb->prepare( $update, $mine, $gateway, $event_id, self::STATUS_PROCESSING, $claimed_at ) );
		if ( false === $affected ) {
			throw StorageException::fromSqlError( esc_html( 'payment event lease reclaim' ), esc_html( (string) $this->wpdb->last_error ) );
		}

		return (int) $affected > 0
			? new EventClaim( self::CLAIM_RECLAIMED, $mine )
			: new EventClaim( self::CLAIM_IN_PROGRESS );
	}

	/**
	 * Record the terminal outcome of an event this request claimed.
	 *
	 * CHECKED, unlike the first cut (Codex #5): this write is what converts a lease into "finished",
	 * so a caller that answered the gateway `200` on the strength of a write that never landed would
	 * leave a `processing` row to be reclaimed and re-applied later. A failure is reported so the
	 * route answers 500 and the gateway retries — the apply is idempotent, so a re-run is safe and a
	 * lost terminal mark is not.
	 *
	 * @param string     $gateway  Module code.
	 * @param string     $event_id Provider event id.
	 * @param string     $status   One of {@see self::TERMINAL}.
	 * @param int|null   $order_id Order the event resolved to, if any.
	 * @param EventClaim $claim    The claim THIS worker won — its lease is the fence.
	 * @return string `recorded`, `lost` (the lease moved on) or `failed` (storage).
	 */
	public function record( string $gateway, string $event_id, string $status, ?int $order_id, EventClaim $claim ): string {
		if ( ! in_array( $status, self::TERMINAL, true ) || '' === $claim->claimed_at ) {
			return self::RECORD_FAILED;
		}

		// FENCED on ownership (Codex E). Without the `claimed_at` term a worker whose lease expired
		// mid-apply would stamp the event terminal on its way out — after another worker had already
		// reclaimed it and was applying it too. The loser must NOT be the one that closes the event,
		// and the affected-row count is the only honest way for it to find out it lost.
		$order_clause = null === $order_id ? '' : ', order_id = %d';
		$sql          = 'UPDATE ' . $this->table() . ' SET status = %s' . $order_clause
			. ' WHERE gateway = %s AND event_id = %s AND status = %s AND claimed_at = %s';

		$args = array( $status );
		if ( null !== $order_id ) {
			$args[] = $order_id;
		}
		$args[] = $gateway;
		$args[] = $event_id;
		$args[] = self::STATUS_PROCESSING;
		$args[] = $claim->claimed_at;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare -- Constant table; every value bound via prepare(); the interpolated fragment is a fixed %d clause.
		$affected = $this->wpdb->query( $this->wpdb->prepare( $sql, $args ) );

		if ( false === $affected ) {
			return self::RECORD_FAILED;
		}

		// Zero rows is NOT a storage failure: it means the lease is no longer ours. The caller answers
		// the gateway retryable, and the worker that DOES own it records the terminal state.
		return (int) $affected > 0 ? self::RECORD_DONE : self::RECORD_LOST;
	}

	/**
	 * Hand back a claim this worker owns but could not finish (D-R40d, QA run 2 BUG-2).
	 *
	 * The row is NOT deleted — deleting it races the very retry it is meant to enable, and the unique
	 * key is what stops two deliveries of the same event both inserting. Instead the LEASE is expired
	 * in place by back-dating `claimed_at` past {@see self::LEASE_SECONDS}, so the gateway's next
	 * delivery reclaims immediately (`CLAIM_RECLAIMED`) rather than being told `in_progress` for two
	 * more minutes. That two-minute stall is what turned ordinary lock contention between the events
	 * of one refund into a wall of `503`s with a `processing` row nobody could clear.
	 *
	 * FENCED on our own lease, exactly like {@see self::record()}: a worker whose lease already moved
	 * on must not reopen an event somebody else is applying right now.
	 *
	 * @param string     $gateway  Module code.
	 * @param string     $event_id Provider event id.
	 * @param EventClaim $claim    The claim THIS worker won.
	 * @return bool Whether the lease was ours to release.
	 */
	public function releaseClaim( string $gateway, string $event_id, EventClaim $claim ): bool {
		if ( '' === $claim->claimed_at ) {
			return false;
		}

		$expired = $this->clock->now()
			->sub( new \DateInterval( 'PT' . ( self::LEASE_SECONDS + 1 ) . 'S' ) )
			->format( 'Y-m-d H:i:s' );

		$sql = 'UPDATE ' . $this->table() . ' SET claimed_at = %s'
			. ' WHERE gateway = %s AND event_id = %s AND status = %s AND claimed_at = %s';

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; every value bound via prepare(); lease compare-and-swap. The sniff cannot follow a multi-line prepare() call, so the block is disabled rather than one line ignored.
		$affected = $this->wpdb->query(
			$this->wpdb->prepare( $sql, $expired, $gateway, $event_id, self::STATUS_PROCESSING, $claim->claimed_at )
		);
		// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		return false !== $affected && (int) $affected > 0;
	}

	/**
	 * The stored status of one event, or '' when there is no row.
	 *
	 * @param string $gateway  Module code.
	 * @param string $event_id Provider event id.
	 */
	public function statusOf( string $gateway, string $event_id ): string {
		$sql = 'SELECT status FROM ' . $this->table() . ' WHERE gateway = %s AND event_id = %s';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; values bound via prepare().
		return (string) $this->wpdb->get_var( $this->wpdb->prepare( $sql, $gateway, $event_id ) );
	}

	/**
	 * Prune events older than a cutoff (30 days, from the hourly cleanup).
	 *
	 * @param string $cutoff UTC `Y-m-d H:i:s`.
	 */
	public function pruneOlderThan( string $cutoff ): void {
		$sql = 'DELETE FROM ' . $this->table() . ' WHERE received_at < %s';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; cutoff bound via prepare().
		$this->wpdb->query( $this->wpdb->prepare( $sql, $cutoff ) );
	}
}

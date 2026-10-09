<?php
/**
 * Notification deliveries ledger (§7).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Notification;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Support\Clock;

/**
 * The `aponto_notification_deliveries` ledger. A delivery is CLAIMED with a unique `dispatch_key`
 * (an atomic INSERT that fails for a duplicate, blocking double-send — acceptance #9), then marked
 * `sent`/`failed`. Also serves the flood-cap counts, the cron retry query and the sent-row prune.
 */
final class DeliveryRepository {

	/**
	 * Construct the repository.
	 *
	 * @param \wpdb $wpdb  Database handle.
	 * @param Clock $clock Clock.
	 */
	public function __construct(
		private \wpdb $wpdb,
		private Clock $clock
	) {}

	/**
	 * Table name.
	 */
	private function table(): string {
		return $this->wpdb->prefix . 'aponto_notification_deliveries';
	}

	/**
	 * Claim a dispatch key (atomic, unique). Returns the new row id, or null when the key was
	 * already claimed (duplicate → double-send blocked).
	 *
	 * @param string   $dispatch_key    Deterministic dispatch key.
	 * @param string   $template_key    Template key.
	 * @param int|null $booking_id      Booking id (or null).
	 * @param string   $recipient_hash  SHA-256 of the recipient email.
	 * @param string   $payload_cipher  Encrypted payload blob ('' when no usable key — REST-7).
	 * @param string   $last_error_code Initial error marker (e.g. `no_secure_auth_key`).
	 */
	public function claim( string $dispatch_key, string $template_key, ?int $booking_id, string $recipient_hash, string $payload_cipher, string $last_error_code = '' ): ?int {
		$now = $this->clock->nowSql();
		// A duplicate key is an EXPECTED answer here, so it must not be a statement error: on the
		// SQLite tier a failed INSERT inside a caller's transaction rolls the WHOLE transaction back
		// silently (the later COMMIT still "succeeds"), erasing whatever the caller already wrote
		// (D-R71g). `INSERT IGNORE` answers 0 rows instead; the SQLite drop-in accepts the MySQL
		// spelling and maps it itself (it cannot parse SQLite's own `INSERT OR IGNORE`).
		$table      = $this->table();
		$owner      = null === $booking_id ? 'NULL' : '%d';
		$sql        = "INSERT IGNORE INTO {$table} ( dispatch_key, template_key, booking_id, recipient_hash, payload_cipher, status, attempts, last_error_code, created_at, updated_at )
			VALUES ( %s, %s, {$owner}, %s, %s, 'queued', 0, %s, %s, %s )";
		$args       = null === $booking_id
			? array( $dispatch_key, $template_key, $recipient_hash, $payload_cipher, mb_substr( $last_error_code, 0, 64 ), $now, $now )
			: array( $dispatch_key, $template_key, $booking_id, $recipient_hash, $payload_cipher, mb_substr( $last_error_code, 0, 64 ), $now, $now );
		$suppressed = $this->wpdb->suppress_errors( true );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table, verb and NULL literal; values bound via prepare(). Atomic unique claim.
		$result = $this->wpdb->query( $this->wpdb->prepare( $sql, ...$args ) );
		$this->wpdb->suppress_errors( $suppressed );

		if ( 1 !== $result ) {
			return null;
		}

		return (int) $this->wpdb->insert_id;
	}

	/**
	 * The queued (not yet sent) deliveries of one booking, oldest first (outbox flush, REST-1).
	 *
	 * @param int $booking_id Booking id.
	 * @return list<array{id:int, booking_id:?int, payload_cipher:string, attempts:int, last_error_code:string}>
	 */
	public function queuedForBooking( int $booking_id ): array {
		$table = $this->table();
		$sql   = "SELECT id, booking_id, payload_cipher, attempts, last_error_code FROM {$table} WHERE booking_id = %d AND status = 'queued' ORDER BY id ASC";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $booking_id ), ARRAY_A );

		return $this->hydratePending( is_array( $rows ) ? $rows : array() );
	}

	/**
	 * Mark a delivery sent.
	 *
	 * @param int $id Delivery id.
	 */
	public function markSent( int $id ): void {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Status update.
		$this->wpdb->update(
			$this->table(),
			array(
				'status'     => 'sent',
				'updated_at' => $this->clock->nowSql(),
			),
			array( 'id' => $id ),
			array( '%s', '%s' ),
			array( '%d' )
		);
	}

	/**
	 * Mark a delivery failed and record the error code (increments attempts).
	 *
	 * @param int    $id         Delivery id.
	 * @param int    $attempts   New attempts count.
	 * @param string $error_code Normalized error code.
	 */
	public function markFailed( int $id, int $attempts, string $error_code ): void {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching -- Status update.
		$this->wpdb->update(
			$this->table(),
			array(
				'status'          => 'failed',
				'attempts'        => $attempts,
				'last_error_code' => mb_substr( $error_code, 0, 64 ),
				'updated_at'      => $this->clock->nowSql(),
			),
			array( 'id' => $id ),
			array( '%s', '%d', '%s', '%s' ),
			array( '%d' )
		);
	}

	/**
	 * Flag one delivery row, addressed by its dispatch key, with a terminal error marker — WITHOUT
	 * touching its status (D-R29, review finding 3).
	 *
	 * The one caller is the reschedule path, retiring a reminder row whose key predates start-keyed
	 * reminder claims: such a row records a reminder for a start the booking no longer has, so the
	 * reminder scan must stop counting it as "already reminded" while the row itself stays exactly
	 * what it was for the Send log — a `sent` row is still a real email that really went out, and
	 * rewriting its status would falsify the audit trail to fix a scan.
	 *
	 * Idempotent: a row already carrying the marker is not touched, so a booking rescheduled twice
	 * reports one change, then none.
	 *
	 * @param string $dispatch_key Exact dispatch key.
	 * @param string $error_code   Terminal marker to set.
	 * @return int Rows changed (0 or 1 — the key is unique).
	 */
	public function markErrorByDispatchKey( string $dispatch_key, string $error_code ): int {
		$table  = $this->table();
		$marker = mb_substr( $error_code, 0, 64 );
		$sql    = "UPDATE {$table} SET last_error_code = %s, updated_at = %s WHERE dispatch_key = %s AND last_error_code <> %s";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; every value bound via prepare().
		return (int) $this->wpdb->query( $this->wpdb->prepare( $sql, $marker, $this->clock->nowSql(), $dispatch_key, $marker ) );
	}

	/**
	 * Count deliveries for a booking (per-booking flood cap).
	 *
	 * @param int $booking_id Booking id.
	 */
	public function countForBooking( int $booking_id ): int {
		$table = $this->table();
		$sql   = "SELECT COUNT(*) FROM {$table} WHERE booking_id = %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		return (int) $this->wpdb->get_var( $this->wpdb->prepare( $sql, $booking_id ) );
	}

	/**
	 * Count deliveries to a recipient on a calendar day (per-customer-day flood cap). Sargable
	 * half-open range on `created_at` (V4) so the `recipient_day` index applies — never
	 * `DATE(created_at)`.
	 *
	 * @param string $recipient_hash Recipient hash.
	 * @param string $day            Day `Y-m-d`.
	 */
	public function countForRecipientOnDay( string $recipient_hash, string $day ): int {
		$start = $day . ' 00:00:00';
		$next  = \DateTimeImmutable::createFromFormat( 'Y-m-d', $day, new \DateTimeZone( 'UTC' ) );
		$end   = false !== $next ? $next->modify( '+1 day' )->format( 'Y-m-d 00:00:00' ) : $day . ' 23:59:59';

		$table = $this->table();
		$sql   = "SELECT COUNT(*) FROM {$table} WHERE recipient_hash = %s AND created_at >= %s AND created_at < %s";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		return (int) $this->wpdb->get_var( $this->wpdb->prepare( $sql, $recipient_hash, $start, $end ) );
	}

	/**
	 * Atomically LEASE a delivery for sending (V1): conditional `queued|failed → processing`.
	 * Exactly one contender wins; everyone else sees 0 affected rows and must not send.
	 *
	 * @param int $id Delivery id.
	 * @return bool Whether THIS caller owns the send.
	 */
	public function lease( int $id ): bool {
		$table = $this->table();
		$sql   = "UPDATE {$table} SET status = 'processing', updated_at = %s WHERE id = %d AND status IN ( 'queued', 'failed' )";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare(); atomic conditional lease.
		$affected = $this->wpdb->query( $this->wpdb->prepare( $sql, $this->clock->nowSql(), $id ) );

		return 1 === (int) $affected;
	}

	/**
	 * Reclaim expired send leases (V1): `processing` rows older than the cutoff go back to
	 * `failed` so the cron can retry them (the sender died mid-send).
	 *
	 * @param string $cutoff_sql UTC cutoff `Y-m-d H:i:s`.
	 * @return int Rows reclaimed.
	 */
	public function reclaimExpiredLeases( string $cutoff_sql ): int {
		$table = $this->table();
		$sql   = "UPDATE {$table} SET status = 'failed', last_error_code = 'lease_expired', updated_at = %s WHERE status = 'processing' AND updated_at < %s";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		return (int) $this->wpdb->query( $this->wpdb->prepare( $sql, $this->clock->nowSql(), $cutoff_sql ) );
	}

	/**
	 * Deliveries the cron should (re)send from their ciphered payload (REST-1, §7): failed rows
	 * with one retry left, plus queued rows whose flush never ran (crash after commit) once they
	 * are stale. Rows without a cipher cannot be resent (REST-7: `no_secure_auth_key`) and are
	 * excluded.
	 *
	 * @param string $queued_stale_before UTC cutoff `Y-m-d H:i:s` for stale queued rows.
	 * @return list<array{id:int, booking_id:?int, payload_cipher:string, attempts:int, last_error_code:string}>
	 */
	public function pendingForRetry( string $queued_stale_before ): array {
		$table = $this->table();
		$sql   = "SELECT id, booking_id, payload_cipher, attempts, last_error_code FROM {$table}
			WHERE payload_cipher <> ''
			AND ( ( status = 'failed' AND attempts < 2 ) OR ( status = 'queued' AND updated_at < %s ) )
			ORDER BY id ASC";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, $queued_stale_before ), ARRAY_A );

		return $this->hydratePending( is_array( $rows ) ? $rows : array() );
	}

	/**
	 * Hydrate pending-delivery rows into their typed shape.
	 *
	 * @param list<array<string, mixed>> $rows Raw rows.
	 * @return list<array{id:int, booking_id:?int, payload_cipher:string, attempts:int, last_error_code:string}>
	 */
	private function hydratePending( array $rows ): array {
		$out = array();
		foreach ( $rows as $row ) {
			$out[] = array(
				'id'              => (int) $row['id'],
				'booking_id'      => null !== ( $row['booking_id'] ?? null ) ? (int) $row['booking_id'] : null,
				'payload_cipher'  => (string) $row['payload_cipher'],
				'attempts'        => (int) $row['attempts'],
				'last_error_code' => (string) $row['last_error_code'],
			);
		}

		return $out;
	}

	/**
	 * A page of the ledger for the admin Send log (A3), newest first. Returns the raw display
	 * columns plus the cipher (the dispatcher decrypts it in-memory only to mask the recipient —
	 * {@see \Aponto\Notification\NotificationDispatcher::mailLog()}).
	 *
	 * @param int $limit  Rows to return (already clamped by the caller).
	 * @param int $offset Row offset.
	 * @return list<array{id:int, template_key:string, payload_cipher:string, status:string, last_error_code:string, created_at:string, updated_at:string}>
	 */
	public function page( int $limit, int $offset ): array {
		$table = $this->table();
		$sql   = "SELECT id, template_key, payload_cipher, status, last_error_code, created_at, updated_at
			FROM {$table} ORDER BY created_at DESC, id DESC LIMIT %d OFFSET %d";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; limit/offset bound via prepare().
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( $sql, max( 1, $limit ), max( 0, $offset ) ), ARRAY_A );

		$out = array();
		foreach ( is_array( $rows ) ? $rows : array() as $row ) {
			$out[] = array(
				'id'              => (int) $row['id'],
				'template_key'    => (string) $row['template_key'],
				'payload_cipher'  => (string) $row['payload_cipher'],
				'status'          => (string) $row['status'],
				'last_error_code' => (string) $row['last_error_code'],
				'created_at'      => (string) $row['created_at'],
				'updated_at'      => (string) $row['updated_at'],
			);
		}

		return $out;
	}

	/**
	 * Total deliveries in the ledger (Send log pagination).
	 */
	public function countAll(): int {
		$table = $this->table();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; no user input.
		return (int) $this->wpdb->get_var( "SELECT COUNT(*) FROM {$table}" );
	}

	/**
	 * Delete sent deliveries older than a cutoff. Returns the number pruned.
	 *
	 * @param string $cutoff_sql UTC cutoff `Y-m-d H:i:s`.
	 */
	public function pruneSentOlderThan( string $cutoff_sql ): int {
		$table = $this->table();
		$sql   = "DELETE FROM {$table} WHERE status = 'sent' AND updated_at < %s";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		return (int) $this->wpdb->query( $this->wpdb->prepare( $sql, $cutoff_sql ) );
	}
}

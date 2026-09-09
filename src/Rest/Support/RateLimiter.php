<?php
/**
 * Public rate limiter — atomic counter (SPEC-P0 §6.4.1, §4.2).
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

use Aponto\Availability\BlockingPolicy;
use Aponto\Support\Clock;
use WP_REST_Request;

/**
 * Enforces the four public rate-limit buckets from SPEC-P0 §6.4.1 using the `aponto_rate_counters`
 * table with an atomic `INSERT ... ON DUPLICATE KEY UPDATE` upsert (no object-cache dependency,
 * §4.2). The counter is incremented on every request; when the incremented `hits` exceeds the
 * bucket limit the caller must return `429 aponto_rate_limited` with the returned `Retry-After`
 * seconds (time left in the current window).
 *
 * `counter_key = sha256("{type}|{identifier}")` where identifier is the IP or the request's
 * `email_norm`; the raw IP/email is never stored.
 */
final class RateLimiter {

	/**
	 * Construct the limiter.
	 *
	 * @param \wpdb $wpdb  Database handle.
	 * @param Clock $clock Clock.
	 */
	public function __construct(
		private \wpdb $wpdb,
		private Clock $clock
	) {}

	/**
	 * The seed rate-limit buckets (SPEC-P0 §6.4.1). Overridable via `aponto_public_rate_limits`.
	 *
	 * @return array<string, array{limit:int, window:int}>
	 */
	public static function defaults(): array {
		return array(
			'booking_ip'          => array(
				'limit'  => 10,
				'window' => 60,
			),
			'booking_email'       => array(
				'limit'  => 5,
				'window' => DAY_IN_SECONDS,
			),
			'availability_ip'     => array(
				'limit'  => 60,
				'window' => 60,
			),
			'cancel_ip'           => array(
				'limit'  => 20,
				'window' => 60,
			),
			// The two payment legs (D-R38). They are deliberately asymmetric: the CONFIRM leg is
			// driven by a human finishing one payment, so a tight bucket costs a legitimate visitor
			// nothing; the WEBHOOK leg is driven by a gateway that can genuinely burst (a batch of
			// settlements, a retry storm after an outage), and throttling it would drop money-bearing
			// events. The webhook bucket therefore exists to bound the work an attacker can make the
			// server do verifying signatures, not to shape a gateway's traffic.
			'payments_confirm_ip' => array(
				'limit'  => 20,
				'window' => 60,
			),
			'payments_webhook_ip' => array(
				'limit'  => 240,
				'window' => 60,
			),
		);
	}

	/**
	 * Record one hit for a bucket and report whether the client is now over the limit.
	 *
	 * @param string          $type       Bucket key (`booking_ip`, `availability_ip`, `cancel_ip`).
	 * @param string          $identifier IP address or normalized email.
	 * @param WP_REST_Request $request    Current request (passed to the filter).
	 * @return int|null Null when allowed; the `Retry-After` seconds when the limit is exceeded.
	 * @throws ServiceUnavailable When the counter storage fails (REST-6, fail-closed).
	 */
	public function hit( string $type, string $identifier, WP_REST_Request $request ): ?int {
		/**
		 * Filter the public rate-limit buckets (SPEC-P0 §6.4.1).
		 *
		 * @param array<string, array{limit:int, window:int}> $limits  Buckets.
		 * @param WP_REST_Request                             $request Current request.
		 */
		$limits = apply_filters( 'aponto_public_rate_limits', self::defaults(), $request );

		if ( ! isset( $limits[ $type ] ) ) {
			return null;
		}

		$limit  = (int) $limits[ $type ]['limit'];
		$window = (int) $limits[ $type ]['window'];
		if ( $limit <= 0 || $window <= 0 ) {
			return null;
		}

		$key       = hash( 'sha256', $type . '|' . $identifier );
		$now       = $this->clock->now();
		$now_sql   = $now->format( 'Y-m-d H:i:s' );
		$floor_sql = $now->sub( new \DateInterval( 'PT' . $window . 'S' ) )->format( 'Y-m-d H:i:s' );
		$table     = $this->wpdb->prefix . 'aponto_rate_counters';

		// Atomic upsert: a stale window (started before the floor) resets to a fresh window of 1,
		// otherwise the hit count increments in place. Single statement — no read-modify-write race.
		$upsert = "INSERT INTO {$table} (counter_key, window_start, hits) VALUES (%s, %s, 1)
			ON DUPLICATE KEY UPDATE
				hits = IF(window_start < %s, 1, hits + 1),
				window_start = IF(window_start < %s, %s, window_start)";

		$suppressed = $this->wpdb->suppress_errors( true );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Trusted constant table name; parameters bound via prepare(); atomic upsert, not cacheable.
		$upserted = $this->wpdb->query( $this->wpdb->prepare( $upsert, $key, $now_sql, $floor_sql, $floor_sql, $now_sql ) );

		$select = "SELECT hits, window_start FROM {$table} WHERE counter_key = %s";

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Trusted constant table name; parameters bound via prepare(); read-back of the atomically-updated counter row.
		$row = $this->wpdb->get_row( $this->wpdb->prepare( $select, $key ), ARRAY_A );
		$this->wpdb->suppress_errors( $suppressed );

		// REST-6: FAIL CLOSED — if the counter storage broke, refusing the request is the only
		// safe answer; failing open would disable rate limiting exactly under database pressure.
		if ( false === $upserted || ! is_array( $row ) ) {
			$this->anomaly( 'rate_counter_unavailable' );
			throw new ServiceUnavailable();
		}

		$hits = (int) $row['hits'];
		if ( $hits <= $limit ) {
			return null;
		}

		$window_start = \DateTimeImmutable::createFromFormat( 'Y-m-d H:i:s', (string) $row['window_start'], new \DateTimeZone( 'UTC' ) );
		if ( false === $window_start ) {
			return $window;
		}
		$elapsed = $now->getTimestamp() - $window_start->getTimestamp();

		return max( 1, $window - $elapsed );
	}

	/**
	 * The authoritative booking-email check (REST-4, spec §6.4.1): counts REAL bookings in a
	 * blocking status created inside the rolling window for the request's `email_norm`. Runs INSIDE
	 * the reserve transaction via the engine's pre-insert seam, so the just-inserted rows of
	 * committed competitors are visible (READ COMMITTED). Cross-staff races may overshoot by one —
	 * an accepted, documented tolerance; same-staff races are serialised by the staff lock.
	 *
	 * @param string $email_norm Normalized request email.
	 * @param int    $limit      Maximum blocking bookings inside the window.
	 * @param int    $window     Rolling window in seconds.
	 * @return int|null Null when allowed; `Retry-After` seconds when the limit is reached.
	 * @throws ServiceUnavailable When the count cannot be evaluated (fail-closed).
	 */
	public function emailBookingRetryAfter( string $email_norm, int $limit, int $window ): ?int {
		if ( $limit <= 0 || $window <= 0 ) {
			return null;
		}

		$now       = $this->clock->now();
		$floor_sql = $now->sub( new \DateInterval( 'PT' . $window . 'S' ) )->format( 'Y-m-d H:i:s' );
		$bookings  = $this->wpdb->prefix . 'aponto_bookings';
		$customers = $this->wpdb->prefix . 'aponto_customers';

		$statuses     = ( new BlockingPolicy() )->statuses();
		$placeholders = implode( ', ', array_fill( 0, count( $statuses ), '%s' ) );
		$params       = array_merge( array( $email_norm, $floor_sql ), $statuses );

		$sql = "SELECT COUNT(*), MIN(b.created_at) FROM {$bookings} b
			INNER JOIN {$customers} c ON c.id = b.customer_id
			WHERE c.email_norm = %s AND b.created_at > %s AND b.status IN ( {$placeholders} )";

		$suppressed = $this->wpdb->suppress_errors( true );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Trusted constant tables; parameters bound via prepare(); authoritative in-TX count.
		$row = $this->wpdb->get_row( $this->wpdb->prepare( $sql, $params ), ARRAY_N );
		$this->wpdb->suppress_errors( $suppressed );

		if ( ! is_array( $row ) ) {
			$this->anomaly( 'rate_counter_unavailable' );
			throw new ServiceUnavailable();
		}

		$count = (int) $row[0];
		if ( $count < $limit ) {
			return null;
		}

		$oldest = \DateTimeImmutable::createFromFormat( 'Y-m-d H:i:s', (string) $row[1], new \DateTimeZone( 'UTC' ) );
		if ( false === $oldest ) {
			return $window;
		}

		return max( 1, $oldest->getTimestamp() + $window - $now->getTimestamp() );
	}

	/**
	 * Surface an abuse-layer anomaly for structured logging (PII-free ids/codes only). Wrapped
	 * fail-safe: a throwing listener never alters the fail-closed control flow.
	 *
	 * @param string $code Stable anomaly code.
	 */
	private function anomaly( string $code ): void {
		try {
			/**
			 * Fires when the abuse-control layer detects an anomaly (diagnostic only).
			 *
			 * @param string             $code    Stable anomaly code.
			 * @param array<string, int> $context Numeric context.
			 */
			do_action( 'aponto_reservation_anomaly', $code, array() );
		} catch ( \Throwable $listener_failure ) {
			unset( $listener_failure );
		}
	}
}

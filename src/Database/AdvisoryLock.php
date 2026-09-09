<?php
/**
 * MySQL advisory lock.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Database;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * Thin wrapper around `GET_LOCK` / `RELEASE_LOCK`, shared by the migration pass and the
 * activation seeding pass (§4.1; Codex review item 7). A killed connection releases the lock
 * server-side automatically.
 *
 * Connection identity (review E1): advisory locks are PER-CONNECTION. If wpdb silently
 * reconnects ("server has gone away") every held lock is dropped even though this object still
 * believes it holds one. `acquire()` therefore pins `CONNECTION_ID()` in the SAME statement as
 * `GET_LOCK`; critical sections compare {@see self::connectionId()} against the current
 * connection id (via {@see TransactionGuard::currentConnectionId()}) and abort on mismatch.
 *
 * This is the MySQL/MariaDB {@see Lock} driver and is never instantiated on SQLite — see
 * {@see LockFactory} for the selection and {@see SqliteLock} for the other driver (D-R20).
 */
final class AdvisoryLock implements Lock {

	/**
	 * The MySQL connection id that acquired the lock, or null while not held.
	 *
	 * @var string|null
	 */
	private ?string $connection_id = null;

	/**
	 * Construct a named lock.
	 *
	 * @param \wpdb  $wpdb Database handle.
	 * @param string $name Lock name (e.g. `apt:wp_:migrate`).
	 */
	public function __construct(
		private \wpdb $wpdb,
		private string $name
	) {}

	/**
	 * Acquire the lock, waiting up to the timeout, pinning the acquiring connection id atomically.
	 *
	 * @param int $timeout Seconds to wait (0 = fail immediately when contended).
	 */
	public function acquire( int $timeout ): bool {
		$row = $this->wpdb->get_row(
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- Values are passed to wpdb::prepare; sniff cannot recognize the injected wpdb property.
			$this->wpdb->prepare( 'SELECT GET_LOCK(%s, %d) AS got, CONNECTION_ID() AS cid', $this->name, $timeout ),
			ARRAY_A
		);

		if ( is_array( $row ) && '1' === (string) ( $row['got'] ?? '' ) ) {
			$this->connection_id = (string) $row['cid'];

			return true;
		}

		$this->connection_id = null;

		return false;
	}

	/**
	 * The connection id pinned at acquire time, or null while the lock is not held.
	 *
	 * Impure for analysis: identity checks re-read this around writes (E1 pre/post pattern), and the
	 * result must never be "remembered" across the write — the value reflects volatile lock state.
	 *
	 * @phpstan-impure
	 */
	public function connectionId(): ?string {
		return $this->connection_id;
	}

	/**
	 * The lock name (compensation paths reacquire fresh locks with the same name — R3-1/R3-2).
	 */
	public function name(): string {
		return $this->name;
	}

	/**
	 * Release the lock.
	 */
	public function release(): void {
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- Value is passed to wpdb::prepare; sniff cannot recognize the injected wpdb property.
		$this->wpdb->query( $this->wpdb->prepare( 'SELECT RELEASE_LOCK(%s)', $this->name ) );
		$this->connection_id = null;
	}
}

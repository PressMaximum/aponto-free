<?php
/**
 * Fail-closed transaction control + connection identity (review E1/E4).
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

use Aponto\Support\DatabaseEngine;

/**
 * Transaction-control statements that THROW on failure (review E4): a `START TRANSACTION` or
 * `COMMIT` silently returning false must never let the caller continue as if a transaction were
 * active/committed. `rollback()` stays best-effort (it runs on error paths where the connection
 * may already be gone; the server rolls a dead connection's transaction back anyway).
 *
 * Also exposes the CURRENT MySQL connection id (review E1): advisory locks are per-connection, so
 * a wpdb auto-reconnect ("server has gone away") silently DROPS every held lock and the open
 * transaction. Callers pin the id at lock-acquire time and compare against {@see currentConnectionId()}
 * at the critical points; a mismatch means the critical section lost its locks mid-flight.
 */
final class TransactionGuard {

	/**
	 * Construct the guard.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct( private \wpdb $wpdb ) {}

	/**
	 * MySQL/MariaDB errno for "transaction characteristics can't be changed while a transaction
	 * is in progress" — the signature of an AMBIENT transaction already being open.
	 */
	private const ER_INSIDE_TRANSACTION = 1568;

	/**
	 * Whether THIS guard's own START TRANSACTION was observed open on the SQLite drop-in.
	 *
	 * Only a carrier that answered `true` right after our own start is trusted at commit time: the
	 * 2.x translator's plain PDO cannot see SQL-started transactions on PHP < 8.4, and reading its
	 * `false` as "rolled back" would refuse every commit. An untrusted carrier skips the check.
	 *
	 * @var bool
	 */
	private bool $sqlite_opened = false;

	/**
	 * Begin a transaction at READ COMMITTED (scoped to this transaction only).
	 *
	 * FAIL-CLOSED on an ambient transaction (R3-3): production reserve() must be the OUTERMOST
	 * transaction. If `SET TRANSACTION` fails with errno 1568 (compared by ERRNO, never by
	 * message string), some caller already has a transaction open; proceeding to
	 * `START TRANSACTION` would IMPLICITLY COMMIT that caller's transaction and destroy its
	 * atomicity — so this throws instead, leaving the ambient transaction untouched.
	 *
	 * Sole escape hatch: the test-only constant `APONTO_TEST_ALLOW_AMBIENT_TX` (defined by a test
	 * bootstrap, never in production) restores the tolerate-and-proceed behaviour for harnesses
	 * that cannot control their session's autocommit mode.
	 *
	 * SQLite (D-R20, founder 2026-07-21): the drop-in has no `SET TRANSACTION` statement at all, so
	 * the isolation statement is skipped — and is not needed, because SQLite transactions are
	 * SERIALIZABLE, strictly stronger than READ COMMITTED, and the drop-in opens the outermost
	 * explicit transaction with `BEGIN IMMEDIATE` (the write lock up front). R3-3 still applies in
	 * FULL, however: `WP_PDO_MySQL_On_SQLite::begin_user_transaction()` explicitly reproduces
	 * MySQL's implicit-commit semantics ("MySQL implicitly commits previous transaction when
	 * starting a new one") and COMMITS an active transaction before `BEGIN IMMEDIATE`. An earlier
	 * revision of this method assumed nesting became a SAVEPOINT — that is only true of the
	 * drop-in's INTERNAL per-statement wrapper, not of user transactions, and the hazard was
	 * verified live: a row written in an outer transaction survived its own ROLLBACK after a nested
	 * `START TRANSACTION` (Codex review round 2, BLOCKER 2). Ambient detection is therefore
	 * mandatory here too; {@see self::sqliteTransactionState()} supplies it, and an INDETERMINATE
	 * answer refuses just like a detected transaction (Codex review round 3).
	 *
	 * @throws StorageException When a statement fails or an ambient transaction is detected.
	 */
	public function beginReadCommitted(): void {
		if ( DatabaseEngine::isSqlite( $this->wpdb ) ) {
			$this->beginReadCommittedSqlite();

			return;
		}

		$suppressed = $this->wpdb->suppress_errors( true );
		$result     = $this->wpdb->query( 'SET TRANSACTION ISOLATION LEVEL READ COMMITTED' );
		$this->wpdb->suppress_errors( $suppressed );

		if ( false === $result ) {
			$ambient = self::ER_INSIDE_TRANSACTION === $this->lastErrno();
			$allowed = defined( 'APONTO_TEST_ALLOW_AMBIENT_TX' ) && APONTO_TEST_ALLOW_AMBIENT_TX;
			if ( ! $ambient || ! $allowed ) {
				// Do NOT run START TRANSACTION here — on the ambient path it would implicitly
				// commit the caller's open transaction.
					throw StorageException::fromSqlError( esc_html( 'set transaction isolation' ), esc_html( (string) $this->wpdb->last_error ) );
			}
		}

		$this->exec( 'START TRANSACTION', 'start transaction' );
	}

	/**
	 * The SQLite counterpart of {@see self::beginReadCommitted()} (D-R20; R3-3 preserved).
	 *
	 * Same contract as the MySQL branch: an ambient transaction is a hard, fail-closed refusal —
	 * running `START TRANSACTION` would implicitly commit the caller's transaction and destroy its
	 * atomicity — and the test-only `APONTO_TEST_ALLOW_AMBIENT_TX` constant is the sole escape
	 * hatch, exactly as on MySQL.
	 *
	 * ONLY a definite "no transaction" proceeds. An INDETERMINATE state refuses too, with its own
	 * message so the cause is distinguishable in a log (Codex review round 3).
	 *
	 * @throws StorageException When a transaction is or may be open, or when the statement fails.
	 */
	private function beginReadCommittedSqlite(): void {
		$state = $this->sqliteTransactionState();

		if ( false !== $state ) {
			$allowed = defined( 'APONTO_TEST_ALLOW_AMBIENT_TX' ) && APONTO_TEST_ALLOW_AMBIENT_TX;
			if ( ! $allowed ) {
				// Do NOT run START TRANSACTION here — the drop-in would implicitly commit the
				// caller's open transaction (class-wp-pdo-mysql-on-sqlite.php, begin_user_transaction).
				throw StorageException::because(
					esc_html(
						null === $state
							? 'sqlite transaction state could not be determined before start transaction'
							: 'ambient transaction detected before start transaction'
					)
				);
			}
		}

		$this->exec( 'START TRANSACTION', 'start transaction' );
		$this->markSqliteOpened();
	}

	/**
	 * The SQLite drop-in's transaction state: true = a transaction is open, false = none is open,
	 * NULL = it could not be determined.
	 *
	 * Asks the drop-in's own state through the PDO-compatible `inTransaction()` method. That method
	 * is public on `WP_PDO_MySQL_On_SQLite` (integration 3.x, reachable as
	 * `wpdb::$dbh->mysql_on_sqlite_driver`) and on the plain `PDO` the 2.x translator holds, so a
	 * shallow walk of the handle graph finds it on both generations — and on any future drop-in
	 * that keeps the PDO contract. Verified live on 3.0.0-rc.7: false outside a transaction, true
	 * inside, false again after ROLLBACK.
	 *
	 * INDETERMINATE IS NOT "NO" (Codex review round 3): a missing carrier, an inaccessible one, or
	 * an `inTransaction()` that throws or returns a non-boolean all yield null, and the caller
	 * refuses exactly as it does for a detected transaction. Reading "cannot determine" as "no
	 * transaction" would let `START TRANSACTION` run on top of a FOREIGN transaction and implicitly
	 * commit it (the drop-in's `begin_user_transaction()` does that by design), which is precisely
	 * the destruction R3-3 exists to prevent. This also mirrors the MySQL branch, where the probe
	 * always yields a definite answer and any other failure throws.
	 *
	 * @phpstan-impure
	 */
	private function sqliteTransactionState(): ?bool {
		$carrier = $this->transactionStateCarrier();
		if ( null === $carrier ) {
			return null;
		}

		try {
			$method = new \ReflectionMethod( $carrier, 'inTransaction' );
			$state  = $method->invoke( $carrier );
		} catch ( \Throwable $e ) {
			unset( $e ); // A carrier that cannot answer is indistinguishable from one that says yes.

			return null;
		}

		// Only a real boolean is an answer; anything else means this is not the contract we expect.
		return is_bool( $state ) ? $state : null;
	}

	/**
	 * The nearest object exposing `inTransaction()`, searched from `wpdb::$dbh` one level deep.
	 *
	 * Every reflective step is guarded: a drop-in may declare uninitialised typed properties (whose
	 * read throws `Error`, not `ReflectionException`) or refuse access entirely. A property that
	 * cannot be read is skipped rather than aborting the walk, and a walk that finds nothing
	 * returns null — which {@see self::sqliteTransactionState()} reports as INDETERMINATE, never as
	 * "no transaction".
	 *
	 * @phpstan-impure
	 */
	private function transactionStateCarrier(): ?object {
		try {
			$property = new \ReflectionProperty( \wpdb::class, 'dbh' );
			$dbh      = $property->getValue( $this->wpdb );
		} catch ( \Throwable $e ) {
			unset( $e );

			return null;
		}

		if ( ! is_object( $dbh ) ) {
			return null;
		}

		if ( method_exists( $dbh, 'inTransaction' ) ) {
			return $dbh;
		}

		try {
			$properties = ( new \ReflectionClass( $dbh ) )->getProperties();
		} catch ( \Throwable $e ) {
			unset( $e );

			return null;
		}

		foreach ( $properties as $property ) {
			try {
				$value = $property->getValue( $dbh );
			} catch ( \Throwable $e ) {
				unset( $e ); // Uninitialised typed property or blocked access — try the next one.
				continue;
			}

			if ( is_object( $value ) && method_exists( $value, 'inTransaction' ) ) {
				return $value;
			}
		}

		return null;
	}

	/**
	 * The errno of the last failed statement (0 when unavailable).
	 */
	private function lastErrno(): int {
		$dbh = $this->wpdb->__get( 'dbh' );

		return $dbh instanceof \mysqli ? (int) $dbh->errno : 0;
	}

	/**
	 * Begin a transaction at the session default isolation level.
	 *
	 * No ambient check here, on EITHER engine: `START TRANSACTION` implicitly commits an open
	 * transaction on MySQL, and the SQLite drop-in deliberately reproduces that. The behaviour is
	 * therefore identical on both, and R3-3's fail-closed refusal stays where the spec puts it — on
	 * the reserve path's {@see self::beginReadCommitted()}.
	 *
	 * @throws StorageException When the statement fails.
	 */
	public function begin(): void {
		$this->exec( 'START TRANSACTION', 'start transaction' );
		$this->markSqliteOpened();
	}

	/**
	 * Commit the transaction.
	 *
	 * SQLite (D-R20, D-R71 technical hardening): the official driver answers ANY failed statement
	 * inside a user transaction — a duplicate key, a parse error, a constraint — by rolling the
	 * WHOLE transaction back (`WP_MySQL_On_SQLite::query()` → `rollback_user_transaction()`). Every
	 * later statement then autocommits on its own and the final `COMMIT` is a silent no-op that
	 * reports success. Verified live on 3.0.2 (2026-10-01): an earlier write vanished while COMMIT
	 * returned 0. A caller that swallowed the failed statement would report a write that never
	 * landed — on the payment path, money recorded as settled with no row behind it. When this
	 * guard saw its own transaction open and the drop-in now definitely reports none, the commit
	 * refuses instead. The writes that ran after the hidden rollback are already durable; the
	 * refusal cannot undo them, it only stops the caller from claiming the unit succeeded.
	 *
	 * @throws StorageException When the statement fails or the transaction was already rolled back.
	 */
	public function commit(): void {
		$opened              = $this->sqlite_opened;
		$this->sqlite_opened = false;
		if ( $opened && false === $this->sqliteTransactionState() ) {
			throw StorageException::because( esc_html( 'sqlite transaction was rolled back by a failed statement before commit' ) );
		}
		$this->exec( 'COMMIT', 'commit' );
	}

	/**
	 * Remember whether the drop-in reports the transaction this guard just started (SQLite only).
	 */
	private function markSqliteOpened(): void {
		$this->sqlite_opened = DatabaseEngine::isSqlite( $this->wpdb ) && true === $this->sqliteTransactionState();
	}

	/**
	 * Roll back, best-effort (never throws — used on error paths).
	 */
	public function rollback(): void {
		$this->sqlite_opened = false;
		$suppressed          = $this->wpdb->suppress_errors( true );
		$this->wpdb->query( 'ROLLBACK' );
		$this->wpdb->suppress_errors( $suppressed );
	}

	/**
	 * The CURRENT MySQL connection id, or null when it cannot be read (dead connection).
	 *
	 * Impure for analysis: every call runs a live query against a connection that may have been
	 * silently replaced (wpdb reconnect) — repeated calls legitimately return different values.
	 *
	 * SQLite (D-R20): there is no `CONNECTION_ID()` and, more importantly, no server connection to
	 * silently re-establish and no server-side lock to lose — the drop-in talks to a local file
	 * through PDO. The E1 hazard therefore does not exist, and the stable
	 * {@see SqliteLock::SESSION_ID} is reported so identity checks pass instead of aborting every
	 * critical section with a phantom lock loss.
	 *
	 * @phpstan-impure
	 */
	public function currentConnectionId(): ?string {
		if ( DatabaseEngine::isSqlite( $this->wpdb ) ) {
			return SqliteLock::SESSION_ID;
		}

		$suppressed = $this->wpdb->suppress_errors( true );
		$id         = $this->wpdb->get_var( 'SELECT CONNECTION_ID()' );
		$this->wpdb->suppress_errors( $suppressed );

		return null === $id ? null : (string) $id;
	}

	/**
	 * Run a transaction-control statement fail-closed.
	 *
	 * @param string $sql       Statement.
	 * @param string $operation Operation label for the exception.
	 * @throws StorageException When the statement fails.
	 */
	private function exec( string $sql, string $operation ): void {
		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.PreparedSQL.NotPrepared -- SQL is restricted to private transaction-control constants, with no user input.
		if ( false === $this->wpdb->query( $sql ) ) {
				throw StorageException::fromSqlError( esc_html( $operation ), esc_html( (string) $this->wpdb->last_error ) );
		}
	}
}

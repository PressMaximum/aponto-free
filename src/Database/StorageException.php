<?php
/**
 * Storage write failure (review E2/E4).
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
 * A database WRITE (or transaction-control statement) failed. Thrown by the booking-layer
 * repositories the moment `$wpdb` reports failure, carrying a SNAPSHOT of `$wpdb->last_error`
 * taken before any further query can clear it (review E2). Classification for the reserve()
 * retry loop happens on this snapshot — never on a later read of `$wpdb->last_error`.
 *
 * `getMessage()` is a stable, PII-free English operation label; the raw SQL error (which may
 * contain key values) lives only in {@see self::sqlError()} for structured logging with redaction.
 */
final class StorageException extends \RuntimeException {

	/**
	 * Construct the exception.
	 *
	 * @param string $message   Stable PII-free message.
	 * @param string $sql_error Raw `$wpdb->last_error` snapshot (may be empty).
	 */
	private function __construct(
		string $message,
		private string $sql_error
	) {
		parent::__construct( $message );
	}

	/**
	 * Build from the CURRENT `$wpdb->last_error` — call immediately after the failing write.
	 *
	 * @param \wpdb  $wpdb      Database handle.
	 * @param string $operation Short operation label (e.g. `booking insert`).
	 */
	public static function fromWpdb( \wpdb $wpdb, string $operation ): self {
		return self::fromSqlError( $operation, (string) $wpdb->last_error );
	}

	/**
	 * Build from an already captured `$wpdb->last_error` snapshot.
	 *
	 * @param string $operation Short operation label.
	 * @param string $sql_error Raw SQL error snapshot.
	 */
	public static function fromSqlError( string $operation, string $sql_error ): self {
		return new self( 'Aponto storage write failed: ' . $operation . '.', $sql_error );
	}

	/**
	 * Build for a logical failure without a SQL error (e.g. an expected row was not affected).
	 *
	 * @param string $operation Short operation label.
	 */
	public static function because( string $operation ): self {
		return new self( 'Aponto storage write failed: ' . $operation . '.', '' );
	}

	/**
	 * The raw SQL error snapshot (empty for logical failures).
	 */
	public function sqlError(): string {
		return $this->sql_error;
	}

	/**
	 * Whether the engine advises restarting the transaction.
	 *
	 * MySQL/InnoDB: deadlock victim or lock-wait timeout. SQLite (D-R20): the single writer lock
	 * was still held when `BEGIN IMMEDIATE` gave up (`SQLITE_BUSY`/`SQLITE_LOCKED`) — the direct
	 * analogue, and the same right answer: roll back and try again. No MySQL server emits these
	 * SQLite wordings, so the MySQL classification is untouched.
	 */
	public function isRestartable(): bool {
		$error = strtolower( $this->sql_error );

		return str_contains( $error, 'deadlock' )
			|| str_contains( $error, 'lock wait timeout' )
			|| str_contains( $error, 'try restarting transaction' )
			|| str_contains( $error, 'database is locked' )
			|| str_contains( $error, 'database table is locked' );
	}
}

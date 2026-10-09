<?php
/**
 * Declarative module data lifecycle retained across physical edition replacement.
 *
 * @package Aponto
 */

declare(strict_types=1);
namespace Aponto\Extension;

// Nested rather than `&& ! defined( 'APONTO_TESTING' )`: Plugin Check's direct-file-access rule
// only recognises a bare `if ( ! defined( 'ABSPATH' ) )` guard, and this is the one core file it
// scans that the host unit suite loads without WordPress.
if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

// phpcs:disable WordPress.DB.DirectDatabaseQuery -- This repository owns uncached transactional erasure and bounded retention of module tables.

use Aponto\Database\LockFactory;
use Aponto\Database\Migrator;
use Aponto\Database\StorageException;
use Aponto\Database\TransactionGuard;
use Aponto\Support\Clock;

/** Executes bounded data-only descriptors, never SQL or callbacks from stored options. */
final class RetainedData {
	public const OPTION = 'aponto_retained_data';

	/**
	 * Persist ownership before a module creates or writes its storage.
	 *
	 * @param string              $code Module code.
	 * @param array<string,mixed> $descriptor Data-only lifecycle description.
	 * @throws StorageException If persistence fails.
	 * @throws \InvalidArgumentException If validation fails.
	 */
	public static function register( string $code, array $descriptor ): void {
		self::validate( $descriptor );
		if ( ! self::identifier( $code ) || $code !== $descriptor['module'] ) {
			throw new \InvalidArgumentException( 'Invalid retained data owner.' );
		}
		// Runs on every boot: an unchanged registry needs no lock and no write. The stored entry is
		// compared FIRST, so the steady state costs no artifact read and no registry-wide validation
		// (review L8); only a changed descriptor pays for the full merge.
		$stored = get_option( self::OPTION, array() );
		if ( is_array( $stored ) && ( $stored[ $code ] ?? null ) === $descriptor ) {
			return;
		}
		if ( self::merged( $code, $descriptor ) === $stored ) {
			return;
		}
		global $wpdb;
		$lock = ( new LockFactory( $wpdb ) )->named( 'apt:' . $wpdb->prefix . ':retained_data' );
		if ( ! $lock->acquire( 5 ) ) {
			throw StorageException::because( 'retained data registry busy' );
		}
		$guard = new TransactionGuard( $wpdb );
		try {
			if ( null === $lock->connectionId() || $lock->connectionId() !== $guard->currentConnectionId() ) {
				throw StorageException::because( 'retained data registry session lost' );
			}
			$all = self::merged( $code, $descriptor );
			if ( get_option( self::OPTION, array() ) !== $all ) {
				update_option( self::OPTION, $all, false );
			}
			if ( get_option( self::OPTION, array() ) !== $all || $lock->connectionId() !== $guard->currentConnectionId() ) {
				throw StorageException::because( 'retained data ownership persistence failed' );
			}
		} finally {
			if ( null !== $lock->connectionId() && $lock->connectionId() === $guard->currentConnectionId() ) {
				$lock->release();
			}
		}
	}

	/**
	 * The registry as it should be stored once this descriptor is registered.
	 *
	 * @param string              $code Module code.
	 * @param array<string,mixed> $descriptor Validated descriptor.
	 * @return array<string,array<string,mixed>>
	 */
	private static function merged( string $code, array $descriptor ): array {
		$all = self::descriptors();
		if ( ! isset( $all[ $code ] ) || $descriptor['version'] > $all[ $code ]['version'] ) {
			$all[ $code ] = $descriptor;
		}
		return $all;
	}

	/**
	 * Validate bounded identifiers and scalar equality/assignment values; no executable DSL.
	 *
	 * @param array<string,mixed> $descriptor Descriptor to validate.
	 * @throws \InvalidArgumentException When a descriptor is unsafe.
	 */
	public static function validate( array $descriptor ): void {
		if ( ! self::identifier( $descriptor['module'] ?? null ) || ! is_int( $descriptor['version'] ?? null ) || $descriptor['version'] < 1 || ! self::identifier( $descriptor['lock'] ?? null ) || ! is_array( $descriptor['tables'] ?? null ) || count( $descriptor['tables'] ) > 20 || ! is_array( $descriptor['cron'] ?? null ) || count( $descriptor['cron'] ) > 20 ) {
			throw new \InvalidArgumentException( 'Invalid retained data descriptor.' );
		}
		foreach ( $descriptor['cron'] as $hook ) {
			if ( ! self::identifier( $hook ) || ! str_starts_with( $hook, 'aponto_' ) ) {
				throw new \InvalidArgumentException( 'Invalid retained cron.' );
			}
		}
		foreach ( $descriptor['tables'] as $table ) {
			if ( ! is_array( $table ) || ! self::identifier( $table['name'] ?? null ) || ! str_starts_with( $table['name'], 'aponto_' ) || in_array( $table['name'], Migrator::coreTableSlugs(), true ) ) {
				throw new \InvalidArgumentException( 'Invalid retained table.' );
			}
			if ( isset( $table['expiry'] ) && ( ! self::identifier( $table['expiry'] ) || ! self::identifier( $table['identity'] ?? null ) ) ) {
				throw new \InvalidArgumentException( 'Invalid retained expiry.' );
			}
			foreach ( array( 'erase', 'optional_erase' ) as $key ) {
				self::validateFields( $table[ $key ] ?? array() );
			}
			$subjects = $table['subjects'] ?? array();
			if ( ! is_array( $subjects ) || count( $subjects ) > 20 ) {
				throw new \InvalidArgumentException( 'Invalid retained subjects.' );
			}
			foreach ( $subjects as $subject => $groups ) {
				if ( ! self::identifier( $subject ) || ! is_array( $groups ) || ! $groups || count( $groups ) > 10 ) {
					throw new \InvalidArgumentException( 'Invalid retained subject predicates.' );
				}
				foreach ( $groups as $group ) {
					self::validateFields( $group );
					if ( in_array( null, $group, true ) || ! in_array( '$id', $group, true ) ) {
						throw new \InvalidArgumentException( 'Retained subject must bind identity.' );
					}
				}
			}
		}
	}

	/**
	 * Validate column/value pairs.
	 *
	 * @param mixed $fields Column map.
	 * @throws \InvalidArgumentException When a field is unsafe.
	 */
	private static function validateFields( mixed $fields ): void {
		if ( ! is_array( $fields ) || count( $fields ) > 40 ) {
			throw new \InvalidArgumentException( 'Invalid retained fields.' );
		}
		foreach ( $fields as $field => $value ) {
			if ( ! self::identifier( $field ) || ( null !== $value && ! is_int( $value ) && ! is_string( $value ) ) || ( is_string( $value ) && strlen( $value ) > 200 ) ) {
				throw new \InvalidArgumentException( 'Invalid retained field value.' );
			}
		}
	}

	/**
	 * Test a portable SQL identifier without accepting punctuation or fragments.
	 *
	 * @param mixed $name Identifier.
	 */
	private static function identifier( mixed $name ): bool {
		return is_string( $name ) && 1 === preg_match( '/^[a-z][a-z0-9_]{0,63}$/', $name );
	}

	/**
	 * Load validated per-blog descriptors with a packaged downgrade fallback.
	 *
	 * Core privacy paths (booking DELETE, GDPR erasure) call this, so it degrades instead of
	 * failing closed whenever a trustworthy source remains (review L7): a missing or unreadable
	 * packaged artifact leaves the stored registry in charge, and an unreadable stored registry
	 * leaves the packaged artifact — which lists every shipped module's policy — in charge. Only
	 * when NEITHER source can be trusted does it throw, because module data may then exist that
	 * nothing describes. No descriptor at all is a no-op for every caller.
	 *
	 * @return array<string,array<string,mixed>> Validated descriptors.
	 * @throws StorageException When ownership data cannot be trusted.
	 */
	private static function descriptors(): array {
		$artifact = null;
		$path     = dirname( __DIR__, 2 ) . '/resources/module-data-policies.json';
		if ( is_readable( $path ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Local build-owned JSON, never a remote URL.
			$decoded = json_decode( (string) file_get_contents( $path ), true );
			if ( is_array( $decoded ) && 1 === ( $decoded['schema_version'] ?? null ) && is_array( $decoded['policies'] ?? null ) && count( $decoded['policies'] ) <= 50 ) {
				$artifact = self::validList( $decoded['policies'] );
			}
		}
		$stored = get_option( self::OPTION, array() );
		$stored = is_array( $stored ) && count( $stored ) <= 50 ? self::validList( array_values( $stored ) ) : null;
		if ( null === $artifact && null === $stored ) {
			throw StorageException::because( 'retained data registry invalid' );
		}
		$all = array();
		foreach ( array_merge( $artifact ?? array(), $stored ?? array() ) as $descriptor ) {
			$code = $descriptor['module'];
			if ( ! isset( $all[ $code ] ) || $descriptor['version'] > $all[ $code ]['version'] ) {
				$all[ $code ] = $descriptor;
			}
		}
		return $all;
	}

	/**
	 * Validate a descriptor list as a whole; one invalid entry makes the whole source untrusted.
	 *
	 * @param array<mixed> $candidates Candidate descriptors.
	 * @return list<array<string,mixed>>|null Null when any entry is invalid.
	 */
	private static function validList( array $candidates ): ?array {
		$valid = array();
		foreach ( $candidates as $descriptor ) {
			if ( ! is_array( $descriptor ) ) {
				return null;
			}
			try {
				self::validate( $descriptor );
			} catch ( \InvalidArgumentException $invalid ) {
				unset( $invalid );
				return null;
			}
			$valid[] = $descriptor;
		}
		return $valid;
	}

	/**
	 * Acquire all declared capture barriers before a privacy transaction, in stable order.
	 *
	 * @param \wpdb    $wpdb Database handle.
	 * @param callable $operation Transaction owner.
	 * @return mixed Operation result.
	 * @throws StorageException When a barrier cannot be held.
	 */
	public static function run( \wpdb $wpdb, callable $operation ): mixed {
		$names = array_unique( array_column( self::descriptors(), 'lock' ) );
		sort( $names, SORT_STRING );
		$locks = array();
		$guard = new TransactionGuard( $wpdb );
		try {
			foreach ( $names as $name ) {
				$lock = ( new LockFactory( $wpdb ) )->named( 'apt:' . $wpdb->prefix . ':' . $name );
				if ( ! $lock->acquire( 5 ) ) {
					throw StorageException::because( 'retained data barrier busy' );
				}
				$locks[] = $lock;
				foreach ( $locks as $held ) {
					if ( null === $held->connectionId() || $held->connectionId() !== $guard->currentConnectionId() ) {
						throw StorageException::because( 'retained data barrier session lost' );
					}
				}
			}
			$result = $operation();
			foreach ( $locks as $held ) {
				if ( null === $held->connectionId() || $held->connectionId() !== $guard->currentConnectionId() ) {
					throw StorageException::because( 'retained data barrier session lost' );
				}
			}
			return $result;
		} finally {
			foreach ( array_reverse( $locks ) as $lock ) {
				if ( null !== $lock->connectionId() && $lock->connectionId() === $guard->currentConnectionId() ) {
					$lock->release();
				}
			}
		}
	}

	/**
	 * Erase declared copies inside the caller's privacy transaction and outer barriers.
	 *
	 * @param \wpdb  $wpdb Database handle.
	 * @param string $subject Domain type.
	 * @param int    $id Domain identity.
	 */
	public static function erase( \wpdb $wpdb, string $subject, int $id ): void {
		foreach ( self::descriptors() as $descriptor ) {
			foreach ( $descriptor['tables'] as $table ) {
				$groups = $table['subjects'][ $subject ] ?? array();
				if ( ! $groups || ! self::exists( $wpdb, $table['name'] ) ) {
					continue;
				}
				$values = $table['erase'] ?? array();
				if ( ! empty( $table['optional_erase'] ) ) {
					$columns = $wpdb->get_col( $wpdb->prepare( 'SHOW COLUMNS FROM %i', $wpdb->prefix . $table['name'] ) );
					self::checked( $wpdb, '' === $wpdb->last_error );
					$values += array_intersect_key( $table['optional_erase'], array_flip( $columns ) );
				}
				$args   = array( $wpdb->prefix . $table['name'] );
				$assign = self::pairs( $values, $args, $id );
				if ( ! $assign ) {
					continue;
				}
				$where = array();
				foreach ( $groups as $group ) {
					$where[] = '(' . implode( ' AND ', self::pairs( $group, $args, $id ) ) . ')';
				}
				$sql = 'UPDATE %i SET ' . implode( ', ', $assign ) . ' WHERE ' . implode( ' OR ', $where );
				// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Compiler emits placeholders only; every identifier and value is bound through prepare() (the artifact smoke fails on any non-accepted Plugin Check warning).
				self::checked( $wpdb, false !== $wpdb->query( $wpdb->prepare( $sql, ...$args ) ) );
			}
		}
	}

	/**
	 * Compile validated equality/assignment pairs into prepared placeholders only.
	 *
	 * @param array<string,mixed> $values Column values.
	 * @param list<mixed>         $args Bound values.
	 * @param int                 $id Subject identity.
	 * @return list<string> Prepared fragments.
	 */
	private static function pairs( array $values, array &$args, int $id ): array {
		$parts = array();
		foreach ( $values as $column => $value ) {
			$args[] = $column;
			if ( null === $value ) {
				$parts[] = '%i = NULL';
				continue;
			}
			$value   = '$id' === $value ? $id : ( '$now' === $value ? ( new Clock() )->nowSql() : $value );
			$parts[] = is_int( $value ) ? '%i = %d' : '%i = %s';
			$args[]  = $value;
		}
		return $parts;
	}

	/**
	 * Prune expired records with an independent bounded batch per owned table.
	 *
	 * @param \wpdb $wpdb Database handle.
	 * @param Clock $clock UTC clock.
	 */
	public static function prune( \wpdb $wpdb, Clock $clock ): void {
		foreach ( self::descriptors() as $descriptor ) {
			foreach ( $descriptor['tables'] as $table ) {
				try {
					if ( ! isset( $table['expiry'] ) || ! self::exists( $wpdb, $table['name'] ) ) {
						continue;
					}
					$name = $wpdb->prefix . $table['name'];
					$ids  = $wpdb->get_col( $wpdb->prepare( 'SELECT %i FROM %i WHERE %i < %s ORDER BY %i LIMIT 500', $table['identity'], $name, $table['expiry'], $clock->nowSql(), $table['identity'] ) );
					self::checked( $wpdb, '' === $wpdb->last_error );
					foreach ( $ids as $id ) {
						self::checked( $wpdb, false !== $wpdb->query( $wpdb->prepare( 'DELETE FROM %i WHERE %i = %d AND %i < %s', $name, $table['identity'], (int) $id, $table['expiry'], $clock->nowSql() ) ) );
					}
				} catch ( \Throwable $failure ) {
					unset( $failure ); // One retained store must not block cleanup of the others.
				}
			}
		}
	}

	/**
	 * Called only after the operator's delete-data uninstall policy has been checked.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public static function uninstall( \wpdb $wpdb ): void {
		foreach ( self::descriptors() as $descriptor ) {
			foreach ( $descriptor['tables'] as $table ) {
				self::checked( $wpdb, false !== $wpdb->query( $wpdb->prepare( 'DROP TABLE IF EXISTS %i', $wpdb->prefix . $table['name'] ) ) );
			}
			foreach ( $descriptor['cron'] as $hook ) {
				wp_clear_scheduled_hook( $hook );
			}
		}
	}

	/**
	 * Missing tables are harmless; query failures are not an erasure success.
	 *
	 * @param \wpdb  $wpdb Database handle.
	 * @param string $slug Validated table slug.
	 */
	private static function exists( \wpdb $wpdb, string $slug ): bool {
		$name  = $wpdb->prefix . $slug;
		$found = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $name ) ) );
		self::checked( $wpdb, '' === $wpdb->last_error );
		return $name === $found;
	}

	/**
	 * Fail closed on storage errors without exposing data.
	 *
	 * @param \wpdb $wpdb Database handle.
	 * @param bool  $success Operation result.
	 * @throws StorageException When the database operation fails.
	 */
	private static function checked( \wpdb $wpdb, bool $success ): void {
		if ( ! $success ) {
			// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Fixed operation label; SQL details stay private.
			throw StorageException::fromWpdb( $wpdb, 'retained module data operation' );
		}
	}
}

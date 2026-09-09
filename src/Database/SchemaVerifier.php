<?php
/**
 * Structural schema verifier.
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
 * Verifies that live tables match the shape declared by CREATE TABLE statements: table exists,
 * storage engine is InnoDB (unknown engine = failure, NB-3), every declared column is present
 * with matching normalized type + nullability (R2-1 — defaults/collation/Extra are deliberately
 * NOT compared), the primary key matches, and every declared UNIQUE / plain KEY exists with the
 * declared columns and prefix lengths (Sub_part, R2-6). Extra columns are allowed —
 * forward-compat §4.1.
 *
 * NB-3 amendment (D-R20, founder 2026-07-21): the storage-engine check is a MYSQL-FAMILY rule. It
 * exists because MyISAM silently drops transactions and row locks, which would break the write
 * model (§5.6). SQLite has no storage engines and no non-transactional mode, so that check is
 * skipped there — and ONLY that check. Existence, columns, primary key and every index are still
 * verified on both engines through the drop-in's `SHOW TABLES`/`SHOW COLUMNS`/`SHOW INDEX`
 * emulation, so a genuinely broken schema still fails closed everywhere.
 *
 * Expectations are derived from the statements themselves via {@see DdlParser}, so there is no
 * second hand-maintained schema list (Codex review items 2 and 4). Used by the core migration
 * postcondition, the self-repair pass, the module manifest pass and the activation health check.
 *
 * @phpstan-import-type TableSpec from DdlParser
 * @phpstan-import-type IndexColumn from DdlParser
 */
final class SchemaVerifier {

	/**
	 * Construct the verifier.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct( private \wpdb $wpdb ) {}

	/**
	 * Verify every CREATE TABLE in the statements against the live schema.
	 *
	 * @param list<string> $statements SQL statements.
	 * @return string|null First failure description, or null when everything matches.
	 */
	public function verifyStatements( array $statements ): ?string {
		foreach ( DdlParser::tables( $statements ) as $spec ) {
			$error = $this->verifyTable( $spec );
			if ( null !== $error ) {
				return $error;
			}
		}

		return null;
	}

	/**
	 * Verify a single table spec.
	 *
	 * @param TableSpec $spec Expected table shape.
	 * @return string|null Failure description or null.
	 */
	private function verifyTable( array $spec ): ?string {
		$table = $spec['name'];

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- Value is passed to wpdb::prepare; sniff cannot recognize the injected wpdb property.
		$found = $this->wpdb->get_var( $this->wpdb->prepare( 'SHOW TABLES LIKE %s', $this->wpdb->esc_like( $table ) ) );
		if ( $found !== $table ) {
			return sprintf( 'table %s is missing', $table );
		}

		$engine_error = $this->verifyEngine( $table );
		if ( null !== $engine_error ) {
			return $engine_error;
		}

		$column_error = $this->verifyColumns( $table, $spec['columns'] );
		if ( null !== $column_error ) {
			return $column_error;
		}

		$indexes = $this->indexes( $table );

		if ( array() !== $spec['primary_key'] ) {
			if ( ! isset( $indexes['PRIMARY'] ) || $indexes['PRIMARY']['columns'] !== $spec['primary_key'] ) {
				return sprintf( 'primary key of %s does not match the schema', $table );
			}
		}

		foreach ( $spec['unique_keys'] as $name => $cols ) {
			if ( ! isset( $indexes[ $name ] ) ) {
				return sprintf( 'unique key %s is missing on %s', $name, $table );
			}
			if ( ! $indexes[ $name ]['unique'] || $indexes[ $name ]['columns'] !== $cols ) {
				return sprintf( 'unique key %s on %s does not match the schema', $name, $table );
			}
		}

		foreach ( $spec['keys'] as $name => $cols ) {
			if ( ! isset( $indexes[ $name ] ) || $indexes[ $name ]['columns'] !== $cols ) {
				return sprintf( 'key %s on %s is missing or does not match the schema', $name, $table );
			}
		}

		return null;
	}

	/**
	 * Verify the storage engine is InnoDB — an unknown engine is a failure too (NB-3).
	 *
	 * Skipped on SQLite (D-R20): the engine concept does not exist there, every write is
	 * transactional by construction, and `information_schema` is either unavailable (drop-in 2.x)
	 * or synthesised (drop-in 3.x reports a hardcoded `InnoDB`) — so the query answers nothing
	 * either way. See the class docblock for the NB-3 amendment.
	 *
	 * @param string $table Table name.
	 * @return string|null Failure description or null.
	 */
	private function verifyEngine( string $table ): ?string {
		if ( DatabaseEngine::isSqlite( $this->wpdb ) ) {
			return null;
		}

		$engine = $this->wpdb->get_var(
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- Table name is a value passed to wpdb::prepare; sniff cannot recognize the injected wpdb property.
			$this->wpdb->prepare(
				'SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s',
				// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- Table name is passed as a value to wpdb::prepare.
				$table
			)
		);
		if ( ! is_string( $engine ) || '' === $engine ) {
			return sprintf( 'storage engine of %s could not be determined', $table );
		}
		if ( 'INNODB' !== strtoupper( $engine ) ) {
			return sprintf( 'table %s uses engine %s but InnoDB is required', $table, $engine );
		}

		return null;
	}

	/**
	 * Verify declared columns exist with matching normalized type + nullability (R2-1).
	 *
	 * @param string                                             $table    Table name.
	 * @param array<string, array{type: string, nullable: bool}> $expected Declared columns.
	 * @return string|null Failure description or null.
	 */
	private function verifyColumns( string $table, array $expected ): ?string {
		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- table name from $wpdb->prefix and migration DDL, not user input.
		$rows   = $this->wpdb->get_results( "SHOW COLUMNS FROM {$table}", ARRAY_A );
		$actual = array();

		foreach ( (array) $rows as $row ) {
			if ( is_array( $row ) && isset( $row['Field'], $row['Type'] ) ) {
				$actual[ (string) $row['Field'] ] = array(
					'type'     => DdlParser::normalizeType( (string) $row['Type'] ),
					'nullable' => 'YES' === strtoupper( (string) ( $row['Null'] ?? 'YES' ) ),
				);
			}
		}

		foreach ( $expected as $name => $def ) {
			if ( ! isset( $actual[ $name ] ) ) {
				return sprintf( 'table %s is missing column %s', $table, $name );
			}
			if ( $actual[ $name ]['type'] !== $def['type'] ) {
				return sprintf(
					'column %s on %s has type %s but the schema declares %s',
					$name,
					$table,
					$actual[ $name ]['type'],
					$def['type']
				);
			}
			if ( $actual[ $name ]['nullable'] !== $def['nullable'] ) {
				return sprintf(
					'column %s on %s is %s but the schema declares %s',
					$name,
					$table,
					$actual[ $name ]['nullable'] ? 'nullable' : 'not nullable',
					$def['nullable'] ? 'nullable' : 'not nullable'
				);
			}
		}

		return null;
	}

	/**
	 * Live indexes of a table, keyed by index name with ordered columns + prefix lengths.
	 *
	 * @param string $table Table name.
	 * @return array<string, array{unique: bool, columns: list<IndexColumn>}>
	 */
	private function indexes( string $table ): array {
		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- table name from $wpdb->prefix and migration DDL, not user input.
		$rows    = $this->wpdb->get_results( "SHOW INDEX FROM {$table}", ARRAY_A );
		$grouped = array();

		foreach ( (array) $rows as $row ) {
			if ( ! is_array( $row ) || ! isset( $row['Key_name'], $row['Column_name'], $row['Seq_in_index'] ) ) {
				continue;
			}
			$name = (string) $row['Key_name'];
			if ( ! isset( $grouped[ $name ] ) ) {
				$grouped[ $name ] = array(
					'unique'  => '0' === (string) ( $row['Non_unique'] ?? '1' ),
					'columns' => array(),
				);
			}

			$subpart = $row['Sub_part'] ?? null;

			$grouped[ $name ]['columns'][ (int) $row['Seq_in_index'] ] = array(
				'column'  => (string) $row['Column_name'],
				'subpart' => null === $subpart || '' === $subpart ? null : (int) $subpart,
			);
		}

		$indexes = array();
		foreach ( $grouped as $name => $index ) {
			ksort( $index['columns'] );
			$indexes[ $name ] = array(
				'unique'  => $index['unique'],
				'columns' => array_values( $index['columns'] ),
			);
		}

		return $indexes;
	}
}

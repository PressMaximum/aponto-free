<?php
/**
 * Parser for the plugin's own dbDelta-style CREATE TABLE statements.
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
 * Derives the expected table shape FROM the migration's own CREATE TABLE statements, so schema
 * verification never maintains a second, hand-written list that could drift from the DDL
 * (Codex review items 2/4).
 *
 * Captured per table: columns with normalized type + nullability (R2-1), the primary key, and
 * every UNIQUE / plain KEY with per-component prefix lengths (R2-6). Deliberately NOT captured:
 * defaults, collations and Extra — cross-DB compatibility mines (MySQL 5.7/8.0, MariaDB render
 * them differently).
 *
 * Only understands the strict dbDelta dialect this plugin writes (§4.1): one column or key per
 * line, `PRIMARY KEY  (...)`, `UNIQUE KEY name (...)`, `KEY name (...)`. Non-CREATE statements
 * (e.g. guarded ALTERs in later migrations) are ignored.
 *
 * @phpstan-type IndexColumn array{column: string, subpart: int|null}
 * @phpstan-type ColumnSpec array{type: string, nullable: bool}
 * @phpstan-type TableSpec array{
 *     name: string,
 *     columns: array<string, ColumnSpec>,
 *     primary_key: list<IndexColumn>,
 *     unique_keys: array<string, list<IndexColumn>>,
 *     keys: array<string, list<IndexColumn>>
 * }
 */
final class DdlParser {

	/**
	 * Parse every CREATE TABLE statement into a table spec.
	 *
	 * @param list<string> $statements SQL statements (CREATE TABLE and others).
	 * @return list<TableSpec>
	 */
	public static function tables( array $statements ): array {
		$tables = array();

		foreach ( $statements as $sql ) {
			$spec = self::parseCreate( $sql );
			if ( null !== $spec ) {
				$tables[] = $spec;
			}
		}

		return $tables;
	}

	/**
	 * Normalize a column type for cross-database comparison (R2-1): lowercase, single spaces,
	 * and integer display widths stripped — `int(10) unsigned` ≡ `int unsigned` (MySQL 5.7 /
	 * MariaDB render widths, MySQL 8.0.17+ does not; `tinyint(1)` normalizes to `tinyint` on
	 * both sides). Char/varchar lengths are kept — they are real shape.
	 *
	 * @param string $raw Raw type string (from DDL or SHOW COLUMNS).
	 */
	public static function normalizeType( string $raw ): string {
		$type = strtolower( trim( (string) preg_replace( '/\s+/', ' ', $raw ) ) );

		return (string) preg_replace( '/^(tinyint|smallint|mediumint|int|integer|bigint)\(\d+\)/', '$1', $type );
	}

	/**
	 * Parse a single CREATE TABLE statement, or null when it is not one.
	 *
	 * @param string $sql SQL statement.
	 * @return TableSpec|null
	 */
	private static function parseCreate( string $sql ): ?array {
		if ( 1 !== preg_match( '/^\s*CREATE\s+TABLE\s+`?([^\s(`]+)`?\s*\(/i', $sql, $m ) ) {
			return null;
		}

		$columns     = array();
		$primary_key = array();
		$unique_keys = array();
		$keys        = array();

		foreach ( explode( "\n", $sql ) as $line ) {
			$line = rtrim( trim( $line ), ',' );

			if ( '' === $line || 0 === stripos( $line, 'CREATE TABLE' ) || str_starts_with( $line, ')' ) ) {
				continue;
			}

			if ( 1 === preg_match( '/^PRIMARY\s+KEY\s*\((.+)\)$/i', $line, $mm ) ) {
				$primary_key = self::indexColumns( $mm[1] );
				continue;
			}

			if ( 1 === preg_match( '/^UNIQUE\s+KEY\s+`?(\w+)`?\s*\((.+)\)$/i', $line, $mm ) ) {
				$unique_keys[ $mm[1] ] = self::indexColumns( $mm[2] );
				continue;
			}

			if ( 1 === preg_match( '/^KEY\s+`?(\w+)`?\s*\((.+)\)$/i', $line, $mm ) ) {
				$keys[ $mm[1] ] = self::indexColumns( $mm[2] );
				continue;
			}

			if ( 1 === preg_match( '/^`?(\w+)`?\s+(.+)$/', $line, $mm ) ) {
				$columns[ $mm[1] ] = self::columnSpec( $mm[2] );
			}
		}

		return array(
			'name'        => $m[1],
			'columns'     => $columns,
			'primary_key' => $primary_key,
			'unique_keys' => $unique_keys,
			'keys'        => $keys,
		);
	}

	/**
	 * Parse a column definition into normalized type + nullability.
	 *
	 * The type is everything before the first NULL / NOT NULL / DEFAULT / AUTO_INCREMENT
	 * keyword. Defaults, collations and Extra are intentionally ignored (R2-1).
	 *
	 * @param string $definition Column definition after the name.
	 * @return ColumnSpec
	 */
	private static function columnSpec( string $definition ): array {
		$upper = strtoupper( $definition );
		$cut   = strlen( $definition );

		foreach ( array( ' NOT NULL', ' NULL', ' DEFAULT', ' AUTO_INCREMENT' ) as $keyword ) {
			$pos = strpos( $upper, $keyword );
			if ( false !== $pos && $pos < $cut ) {
				$cut = $pos;
			}
		}

		return array(
			'type'     => self::normalizeType( substr( $definition, 0, $cut ) ),
			'nullable' => false === strpos( $upper, 'NOT NULL' ),
		);
	}

	/**
	 * Split an index column list into components with optional prefix lengths (R2-6).
	 *
	 * Accepts `name`, backticked names, `name(191)` and backticked-with-prefix forms — the
	 * prefix length is KEPT in the spec and compared against SHOW INDEX `Sub_part`
	 * (null ≡ no prefix).
	 *
	 * @param string $raw Raw parenthesised column list.
	 * @return list<IndexColumn>
	 */
	private static function indexColumns( string $raw ): array {
		$cols = array();

		foreach ( explode( ',', $raw ) as $component ) {
			$component = trim( $component );
			if ( 1 === preg_match( '/^`?(\w+)`?\s*(?:\(\s*(\d+)\s*\))?$/', $component, $m ) ) {
				$cols[] = array(
					'column'  => $m[1],
					'subpart' => isset( $m[2] ) && '' !== $m[2] ? (int) $m[2] : null,
				);
			}
		}

		return $cols;
	}
}

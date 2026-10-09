<?php
/**
 * The name-search predicate over a split person name (name split, founder 2026-10-01).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Rest\Data;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Support\DatabaseEngine;

/**
 * Builds `first_name LIKE %s OR last_name LIKE %s OR <first + ' ' + last> LIKE %s` for a table
 * alias, so a search for "Jane Doe" still finds the row whose parts are `Jane` / `Doe`
 * (rest-contract §2.5/§2.8/§2.10, D-R69).
 *
 * The concatenation is ENGINE-BRANCHED (D-R54): MySQL spells it `CONCAT_WS(' ', a, b)` — its `||`
 * is logical OR unless `PIPES_AS_CONCAT` is set, which would silently turn the predicate into a
 * boolean — and SQLite has no `CONCAT_WS` in older builds, so it gets the standard `a || ' ' || b`.
 * Both give `first + ' ' + last`; an empty `last_name` leaves a trailing space, which a `%…%`
 * pattern does not notice.
 *
 * Every caller binds {@see self::PLACEHOLDERS} copies of the same escaped `%term%` value.
 */
final class PersonNameSearch {

	/**
	 * How many `%s` placeholders {@see self::clause()} contains.
	 */
	public const PLACEHOLDERS = 3;

	/**
	 * The parenthesised predicate for one table alias (`''` for an unaliased single-table query).
	 *
	 * @param \wpdb  $wpdb  Database handle (engine detection only).
	 * @param string $alias Table alias, e.g. `c`; '' for none. Must be a literal identifier.
	 */
	public static function clause( \wpdb $wpdb, string $alias = '' ): string {
		$prefix = '' === $alias ? '' : $alias . '.';
		$first  = $prefix . 'first_name';
		$last   = $prefix . 'last_name';
		$full   = DatabaseEngine::isSqlite( $wpdb )
			? "{$first} || ' ' || {$last}"
			: "CONCAT_WS(' ', {$first}, {$last})";

		return "( {$first} LIKE %s OR {$last} LIKE %s OR {$full} LIKE %s )";
	}

	/**
	 * The bound values for one {@see self::clause()}.
	 *
	 * @param string $like Escaped `%term%` pattern.
	 * @return list<string>
	 */
	public static function args( string $like ): array {
		return array_fill( 0, self::PLACEHOLDERS, $like );
	}
}

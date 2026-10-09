<?php
/**
 * Per-user Bookings list column layout.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Admin;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * The column layout an operator picked in the Bookings list's Columns menu: which columns show
 * and in what order (D-R74, rest-contract §2.23).
 *
 * Stored as a USER OPTION, not plain user meta: `update_user_option()` prefixes the key with the
 * blog prefix, so on multisite each site keeps its own layout (one site may have a Location column
 * another does not). No stored value means "use the defaults" — the admin bundle owns what those
 * are, so resetting the layout DELETES the option rather than writing the defaults down.
 *
 * Only the SHAPE is checked here. Which column ids exist is the bundle's business, and it already
 * drops unknown ids on read, so a column renamed or removed by an update degrades to the default
 * instead of a refused save.
 */
final class BookingsTablePreferences {

	/** User option key (blog-prefixed by WordPress). */
	public const KEY = 'aponto_bookings_table';

	/** Upper bound on column entries — the table has 13; this only stops an unbounded payload. */
	private const MAX_COLUMNS = 40;

	/**
	 * The stored layout for a user, or null when there is none (or it is unreadable).
	 *
	 * @param int $user_id User id.
	 * @return array{column_visibility: array<string, bool>, column_order: list<string>}|null
	 */
	public static function get( int $user_id ): ?array {
		if ( $user_id < 1 ) {
			return null;
		}
		$stored = get_user_option( self::KEY, $user_id );
		if ( ! is_array( $stored ) ) {
			return null;
		}
		return self::sanitize( $stored );
	}

	/**
	 * Store a layout that already passed {@see self::sanitize()}.
	 *
	 * @param int                                                                       $user_id User id.
	 * @param array{column_visibility: array<string, bool>, column_order: list<string>} $layout  Layout.
	 */
	public static function save( int $user_id, array $layout ): void {
		update_user_option( $user_id, self::KEY, $layout );
	}

	/**
	 * Forget a user's layout, so the defaults apply again.
	 *
	 * @param int $user_id User id.
	 */
	public static function delete( int $user_id ): void {
		delete_user_option( $user_id, self::KEY );
	}

	/**
	 * Validate a raw layout.
	 *
	 * @param mixed                 $raw    Candidate `{ column_visibility, column_order }`.
	 * @param array<string, string> $fields Filled with a field => message map when it is malformed.
	 * @return array{column_visibility: array<string, bool>, column_order: list<string>}|null Clean layout, or null.
	 */
	public static function sanitize( $raw, array &$fields = array() ): ?array {
		$fields = array();
		if ( ! is_array( $raw ) ) {
			$fields['column_visibility'] = __( 'A column layout is required.', 'aponto' );
			return null;
		}

		$visibility = $raw['column_visibility'] ?? null;
		$clean_vis  = array();
		if ( ! is_array( $visibility ) || count( $visibility ) > self::MAX_COLUMNS ) {
			$fields['column_visibility'] = __( 'Must be an object of column ids to true or false.', 'aponto' );
		} else {
			foreach ( $visibility as $id => $visible ) {
				if ( ! self::isColumnId( $id ) || ! is_bool( $visible ) ) {
					$fields['column_visibility'] = __( 'Must be an object of column ids to true or false.', 'aponto' );
					break;
				}
				$clean_vis[ $id ] = $visible;
			}
		}

		$order       = $raw['column_order'] ?? null;
		$clean_order = array();
		if ( ! is_array( $order ) || ! array_is_list( $order ) || count( $order ) > self::MAX_COLUMNS ) {
			$fields['column_order'] = __( 'Must be a list of column ids.', 'aponto' );
		} else {
			foreach ( $order as $id ) {
				if ( ! self::isColumnId( $id ) ) {
					$fields['column_order'] = __( 'Must be a list of column ids.', 'aponto' );
					break;
				}
				$clean_order[] = $id;
			}
		}

		if ( array() !== $fields ) {
			return null;
		}

		return array(
			'column_visibility' => $clean_vis,
			'column_order'      => array_values( array_unique( $clean_order ) ),
		);
	}

	/**
	 * Whether a key is shaped like a table column id.
	 *
	 * @param mixed $id Candidate.
	 * @phpstan-assert-if-true string $id
	 */
	private static function isColumnId( $id ): bool {
		return is_string( $id ) && 1 === preg_match( '/^[a-z][a-z0-9_]{0,31}$/', $id );
	}
}

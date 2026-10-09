<?php
/**
 * The ONE person-name rule (name split, founder 2026-10-01, N1–N5).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Support;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * Customers and staff store `first_name` + `last_name`; every surface that shows ONE name composes
 * it here and nowhere else (name-split plan §2, D-R69). Display order "First Last" lives only in
 * {@see self::display()} and its JS twin `assets/src/shared/person-name.js`; both are pinned by
 * `tests/fixtures/person-name-lockstep.json`.
 *
 * Whitespace is matched with `[\s\p{Z}]` because PCRE `\s` alone stays ASCII-only under `/u`:
 * a no-break space (U+00A0) or an ideographic space (U+3000) typed into a name must trim and
 * collapse exactly like an ASCII space, or the stored part and its display would disagree with the
 * browser's `\s`.
 *
 * Pure and static: no WordPress call, no I/O.
 */
final class PersonName {

	/**
	 * One Unicode whitespace run.
	 */
	private const WHITESPACE = '/[\s\p{Z}]+/u';

	/**
	 * Normalize one name part: trim Unicode whitespace and collapse every internal run to one
	 * ASCII space. Invalid UTF-8 falls back to an ASCII-only collapse rather than returning ''.
	 *
	 * @param string $part Raw part.
	 */
	public static function normalize( string $part ): string {
		$collapsed = preg_replace( self::WHITESPACE, ' ', $part );
		if ( null === $collapsed ) {
			$collapsed = (string) preg_replace( '/\s+/', ' ', $part );
		}

		return trim( $collapsed, ' ' );
	}

	/**
	 * The composed display name: normalized first + ' ' + normalized last, or whichever part is
	 * non-empty ('' when both are empty).
	 *
	 * @param string $first First name.
	 * @param string $last  Last name.
	 */
	public static function display( string $first, string $last ): string {
		$parts = array_filter(
			array( self::normalize( $first ), self::normalize( $last ) ),
			static fn ( string $part ): bool => '' !== $part
		);

		return implode( ' ', $parts );
	}

	/**
	 * Initials: the first code point of the first word plus the first code point of the last word
	 * of {@see self::display()}, upper-cased. One word yields one letter; empty yields ''.
	 *
	 * @param string $first First name.
	 * @param string $last  Last name.
	 */
	public static function initials( string $first, string $last ): string {
		$display = self::display( $first, $last );
		if ( '' === $display ) {
			return '';
		}

		$words  = explode( ' ', $display );
		$letter = self::firstCodePoint( $words[0] );
		if ( count( $words ) > 1 ) {
			$letter .= self::firstCodePoint( $words[ count( $words ) - 1 ] );
		}

		return function_exists( 'mb_strtoupper' ) ? mb_strtoupper( $letter, 'UTF-8' ) : strtoupper( $letter );
	}

	/**
	 * Split a single full name: the last word becomes the last name, the rest the first name; one
	 * word is a first name only. Used ONLY by the wizard prefill fallback (a WordPress account
	 * without `first_name`/`last_name` user meta) — never to reinterpret stored data.
	 *
	 * @param string $full Full name.
	 * @return array{first_name: string, last_name: string}
	 */
	public static function split( string $full ): array {
		$normalized = self::normalize( $full );
		if ( '' === $normalized ) {
			return array(
				'first_name' => '',
				'last_name'  => '',
			);
		}

		$words = explode( ' ', $normalized );
		if ( 1 === count( $words ) ) {
			return array(
				'first_name' => $normalized,
				'last_name'  => '',
			);
		}

		$last = (string) array_pop( $words );

		return array(
			'first_name' => implode( ' ', $words ),
			'last_name'  => $last,
		);
	}

	/**
	 * A row carrying `first_name` + `last_name` with the composed `name` inserted right after
	 * `last_name` (or appended when the row has no `last_name` key).
	 *
	 * Outputs keep a `name` key that is the composed display name, never stored (name-split N2):
	 * the PHP hook rows (`aponto_customer_*`, `aponto_staff_*`) and the webhook snapshots built
	 * from them go through this one decorator. A row that already lacks both parts is returned
	 * unchanged, and a stale `name` key is always overwritten by the composed one.
	 *
	 * @param array<string, mixed> $row Row with `first_name` / `last_name`.
	 * @return array<string, mixed>
	 */
	public static function withDisplayName( array $row ): array {
		if ( ! array_key_exists( 'first_name', $row ) && ! array_key_exists( 'last_name', $row ) ) {
			return $row;
		}

		$name = self::display( (string) ( $row['first_name'] ?? '' ), (string) ( $row['last_name'] ?? '' ) );
		unset( $row['name'] );

		$out      = array();
		$inserted = false;
		foreach ( $row as $key => $value ) {
			$out[ $key ] = $value;
			if ( 'last_name' === $key ) {
				$out['name'] = $name;
				$inserted    = true;
			}
		}
		if ( ! $inserted ) {
			$out['name'] = $name;
		}

		return $out;
	}

	/**
	 * The first Unicode code point of a word (the first byte when the word is not valid UTF-8).
	 *
	 * @param string $word Word.
	 */
	private static function firstCodePoint( string $word ): string {
		if ( 1 === preg_match( '/^./us', $word, $match ) ) {
			return $match[0];
		}

		return substr( $word, 0, 1 );
	}
}

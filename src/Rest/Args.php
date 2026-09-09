<?php
/**
 * Reusable REST argument schemas + field validators (rest-contract §1.1).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Rest;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use WP_Error;
use WP_REST_Request;

/**
 * Central definition of the shared argument rules from rest-contract §1.1 (`id`, `nullable_id`,
 * `email`, `phone`, `name`, `text`, `utc`, `date`, `iana_tz`, `bool`, `page`, `per_page`, `search`,
 * `status_entity`, `booking_status`).
 *
 * Two surfaces share the same primitives:
 *   - `arg*()` builders return WP REST `args` definitions (validate + sanitize callbacks). A route
 *     that fails these surfaces a `rest_invalid_param`/`rest_missing_callback_param` error which
 *     {@see Router::normalizeErrors()} rewrites into the `aponto_validation` envelope.
 *   - `check*()` validators are pure and are called directly by controllers for nested objects
 *     (e.g. `customer{}`) and full-replacement bodies, returning a localized field message or the
 *     empty string when valid.
 */
final class Args {

	/**
	 * Maximum length for `varchar(191)` text fields.
	 */
	public const MAX_191 = 191;

	/**
	 * Maximum phone length (`varchar(64)`).
	 */
	public const MAX_PHONE = 64;

	/**
	 * Largest value an `int unsigned` column can store.
	 *
	 * Column ceilings are validation input, not an implementation detail: MySQL outside STRICT
	 * mode silently CLAMPS an oversized value to the column maximum instead of failing, so a
	 * write that looks accepted (`201`) comes back as a different, plausible number — while
	 * SQLite (D-R20) stores it verbatim, so the two supported engines disagree on the same
	 * request. Every unsigned numeric field therefore validates against its own column type in
	 * PHP and rejects with `aponto_validation` (error-registry) rather than letting the storage
	 * layer decide.
	 */
	public const MAX_INT_UNSIGNED = 4294967295;

	/**
	 * Largest value a `smallint unsigned` column can store (see {@see self::MAX_INT_UNSIGNED}).
	 */
	public const MAX_SMALLINT_UNSIGNED = 65535;

	/**
	 * Maximum service price in integer MINOR units (`aponto_services.price_minor int unsigned`,
	 * Migration_0001 §services).
	 *
	 * Money is integer minor units everywhere (invariant 7), so the bound is expressed in minor
	 * units and stays currency-neutral: it is 42,949,672.95 in a two-decimal currency and
	 * 4,294,967,295 in a zero-decimal one. Beta bug: `price_minor = 99999999900` was accepted
	 * with `201` and stored as 4294967295, which the public form then rendered as
	 * $42,949,672.95.
	 */
	public const MAX_PRICE_MINOR = self::MAX_INT_UNSIGNED;

	// -------------------------------------------------------------------------------------------
	// Pure field validators — return '' when valid, else a localized field message.
	// -------------------------------------------------------------------------------------------

	/**
	 * Validate a required positive integer id.
	 *
	 * @param mixed $value Raw value.
	 */
	public static function checkId( mixed $value ): string {
		if ( ! is_numeric( $value ) || (int) $value < 1 ) {
			return __( 'A valid identifier is required.', 'aponto' );
		}

		return '';
	}

	/**
	 * Validate a nullable positive integer id.
	 *
	 * @param mixed $value Raw value.
	 */
	public static function checkNullableId( mixed $value ): string {
		if ( null === $value || '' === $value ) {
			return '';
		}

		return self::checkId( $value );
	}

	/**
	 * Validate a display name (1..191 chars after trim).
	 *
	 * @param mixed $value Raw value.
	 */
	public static function checkName( mixed $value ): string {
		if ( ! is_string( $value ) ) {
			return __( 'A name is required.', 'aponto' );
		}
		$trimmed = trim( $value );
		if ( '' === $trimmed ) {
			return __( 'A name is required.', 'aponto' );
		}
		if ( mb_strlen( $trimmed ) > self::MAX_191 ) {
			return __( 'This name is too long.', 'aponto' );
		}

		return '';
	}

	/**
	 * Validate an email address.
	 *
	 * @param mixed $value Raw value.
	 */
	public static function checkEmail( mixed $value ): string {
		if ( ! is_string( $value ) || '' === $value || ! is_email( $value ) || mb_strlen( $value ) > self::MAX_191 ) {
			return __( 'A valid email address is required.', 'aponto' );
		}

		return '';
	}

	/**
	 * Validate an optional phone number (max 64).
	 *
	 * @param mixed $value Raw value.
	 */
	public static function checkPhone( mixed $value ): string {
		if ( null === $value || '' === $value ) {
			return '';
		}
		if ( ! is_string( $value ) || mb_strlen( $value ) > self::MAX_PHONE ) {
			return __( 'This phone number is invalid.', 'aponto' );
		}

		return '';
	}

	/**
	 * Validate an RFC3339 UTC instant (must end in `Z` and be a real instant).
	 *
	 * @param mixed $value Raw value.
	 */
	public static function checkUtc( mixed $value ): string {
		if ( ! is_string( $value ) || null === self::parseUtc( $value ) ) {
			return __( 'A valid UTC date-time is required.', 'aponto' );
		}

		return '';
	}

	/**
	 * Validate a Gregorian `Y-m-d` date.
	 *
	 * @param mixed $value Raw value.
	 */
	public static function checkDate( mixed $value ): string {
		if ( ! is_string( $value ) || ! self::isValidDate( $value ) ) {
			return __( 'A valid date is required.', 'aponto' );
		}

		return '';
	}

	/**
	 * Legacy → canonical IANA timezone aliases. Mirrors the client
	 * `assets/src/form/lib/tz.js` `ZONE_ALIASES` map so a browser reporting a
	 * deprecated zone name (some machines report `Asia/Saigon` for Vietnam) is
	 * accepted AND persisted in its canonical form. `timezone_identifiers_list()`
	 * omits these backward zones by default, so a strict check would 422 an
	 * otherwise-valid request; canonicalizing on write keeps the widget, emails and
	 * admin all reading one zone name.
	 *
	 * @var array<string, string>
	 */
	private const TZ_ALIASES = array(
		'Asia/Saigon'          => 'Asia/Ho_Chi_Minh',
		'Asia/Calcutta'        => 'Asia/Kolkata',
		'Asia/Katmandu'        => 'Asia/Kathmandu',
		'Asia/Rangoon'         => 'Asia/Yangon',
		'Asia/Ulan_Bator'      => 'Asia/Ulaanbaatar',
		'Asia/Thimbu'          => 'Asia/Thimphu',
		'Asia/Dacca'           => 'Asia/Dhaka',
		'Asia/Istanbul'        => 'Europe/Istanbul',
		'Europe/Kiev'          => 'Europe/Kyiv',
		'Europe/Uzhgorod'      => 'Europe/Kyiv',
		'Europe/Nicosia'       => 'Asia/Nicosia',
		'America/Buenos_Aires' => 'America/Argentina/Buenos_Aires',
		'America/Godthab'      => 'America/Nuuk',
		'Pacific/Ponape'       => 'Pacific/Pohnpei',
		'Pacific/Truk'         => 'Pacific/Chuuk',
		'GMT'                  => 'UTC',
		'Etc/GMT'              => 'UTC',
		'Etc/UTC'              => 'UTC',
	);

	/**
	 * IANA identifiers accepted for validation, including backward-compatibility
	 * zones (`DateTimeZone::ALL_WITH_BC`). Memoized per request.
	 *
	 * @return array<int, string>
	 */
	private static function timezoneIdentifiers(): array {
		static $list = null;
		if ( null === $list ) {
			$list = timezone_identifiers_list( \DateTimeZone::ALL_WITH_BC );
		}

		return $list;
	}

	/**
	 * Validate an IANA timezone identifier — canonical zone OR a known legacy alias.
	 *
	 * @param mixed $value Raw value.
	 */
	public static function checkTimezone( mixed $value ): string {
		if ( is_string( $value )
			&& ( isset( self::TZ_ALIASES[ $value ] ) || in_array( $value, self::timezoneIdentifiers(), true ) )
		) {
			return '';
		}

		return __( 'A valid timezone is required.', 'aponto' );
	}

	/**
	 * Map a possibly-legacy IANA zone name to its canonical form (identity for a
	 * zone that is already canonical or unrecognised). Callers should validate with
	 * {@see self::checkTimezone()} first.
	 *
	 * @param string $iana IANA name.
	 */
	public static function canonicalizeTimezone( string $iana ): string {
		return self::TZ_ALIASES[ $iana ] ?? $iana;
	}

	/**
	 * Validate a value against an enum list.
	 *
	 * @param mixed        $value   Raw value.
	 * @param list<string> $allowed Allowed values.
	 */
	public static function checkEnum( mixed $value, array $allowed ): string {
		if ( ! is_string( $value ) || ! in_array( $value, $allowed, true ) ) {
			return __( 'This value is not allowed.', 'aponto' );
		}

		return '';
	}

	// -------------------------------------------------------------------------------------------
	// Parsers / helpers.
	// -------------------------------------------------------------------------------------------

	/**
	 * Parse an RFC3339 UTC string ending in `Z` into an immutable UTC instant, or null.
	 *
	 * @param string $value Candidate string.
	 */
	public static function parseUtc( string $value ): ?\DateTimeImmutable {
		if ( 1 !== preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/', $value ) ) {
			return null;
		}
		$dt = \DateTimeImmutable::createFromFormat( 'Y-m-d\TH:i:s\Z', $value, new \DateTimeZone( 'UTC' ) );
		if ( false === $dt ) {
			return null;
		}
		// Reject values the parser silently rolled over (e.g. month 13).
		if ( $dt->format( 'Y-m-d\TH:i:s\Z' ) !== $value ) {
			return null;
		}

		return $dt->setTimezone( new \DateTimeZone( 'UTC' ) );
	}

	/**
	 * Whether a string is a valid `Y-m-d` Gregorian date.
	 *
	 * @param string $value Candidate string.
	 */
	public static function isValidDate( string $value ): bool {
		if ( 1 !== preg_match( '/^\d{4}-\d{2}-\d{2}$/', $value ) ) {
			return false;
		}
		$dt = \DateTimeImmutable::createFromFormat( 'Y-m-d', $value, new \DateTimeZone( 'UTC' ) );

		return false !== $dt && $dt->format( 'Y-m-d' ) === $value;
	}

	// -------------------------------------------------------------------------------------------
	// WP REST arg-definition builders.
	// -------------------------------------------------------------------------------------------

	/**
	 * A required positive-integer id argument.
	 *
	 * @param bool $required Whether the arg is required.
	 * @return array<string, mixed>
	 */
	public static function argId( bool $required = true ): array {
		return array(
			'required'          => $required,
			'type'              => 'integer',
			'sanitize_callback' => static fn ( $value ): int => absint( $value ),
			'validate_callback' => static fn ( $value ) => '' === self::checkId( $value ) ? true : new WP_Error( 'aponto_field', self::checkId( $value ) ),
		);
	}

	/**
	 * A nullable positive-integer id argument (default null).
	 *
	 * @return array<string, mixed>
	 */
	public static function argNullableId(): array {
		return array(
			'required'          => false,
			'default'           => null,
			'type'              => array( 'integer', 'null' ),
			'sanitize_callback' => static fn ( $value ) => ( null === $value || '' === $value ) ? null : absint( $value ),
			'validate_callback' => static fn ( $value ) => '' === self::checkNullableId( $value ) ? true : new WP_Error( 'aponto_field', self::checkNullableId( $value ) ),
		);
	}

	/**
	 * A `page` argument (default 1, >=1).
	 *
	 * @return array<string, mixed>
	 */
	public static function argPage(): array {
		return array(
			'required'          => false,
			'default'           => 1,
			'type'              => 'integer',
			'sanitize_callback' => static fn ( $value ): int => max( 1, absint( $value ) ),
			'validate_callback' => static fn ( $value ) => is_numeric( $value ) && (int) $value >= 1 ? true : new WP_Error( 'aponto_field', __( 'Page must be at least 1.', 'aponto' ) ),
		);
	}

	/**
	 * A `per_page` argument (default 20, 1..100).
	 *
	 * @return array<string, mixed>
	 */
	public static function argPerPage(): array {
		return array(
			'required'          => false,
			'default'           => 20,
			'type'              => 'integer',
			'sanitize_callback' => static fn ( $value ): int => min( 100, max( 1, absint( $value ) ) ),
			'validate_callback' => static fn ( $value ) => is_numeric( $value ) && (int) $value >= 1 && (int) $value <= 100 ? true : new WP_Error( 'aponto_field', __( 'Per-page must be between 1 and 100.', 'aponto' ) ),
		);
	}

	/**
	 * A `search` argument (default '', trimmed, max 191).
	 *
	 * @return array<string, mixed>
	 */
	public static function argSearch(): array {
		return array(
			'required'          => false,
			'default'           => '',
			'type'              => 'string',
			'sanitize_callback' => static fn ( $value ): string => mb_substr( sanitize_text_field( trim( (string) $value ) ), 0, self::MAX_191 ),
		);
	}

	/**
	 * An enum string argument.
	 *
	 * @param list<string> $allowed       Allowed values.
	 * @param string       $default_value Default value.
	 * @param bool         $required      Whether required.
	 * @return array<string, mixed>
	 */
	public static function argEnum( array $allowed, string $default_value = '', bool $required = false ): array {
		$arg = array(
			'required'          => $required,
			'type'              => 'string',
			'enum'              => $allowed,
			'sanitize_callback' => static fn ( $value ): string => sanitize_key( (string) $value ),
			'validate_callback' => static fn ( $value ) => in_array( sanitize_key( (string) $value ), $allowed, true ) ? true : new WP_Error( 'aponto_field', __( 'This value is not allowed.', 'aponto' ) ),
		);
		if ( ! $required ) {
			$arg['default'] = $default_value;
		}

		return $arg;
	}

	/**
	 * A required RFC3339 UTC argument.
	 *
	 * @param bool $required Whether required.
	 * @return array<string, mixed>
	 */
	public static function argUtc( bool $required = true ): array {
		return array(
			'required'          => $required,
			'type'              => 'string',
			'sanitize_callback' => static fn ( $value ): string => sanitize_text_field( (string) $value ),
			'validate_callback' => static fn ( $value ) => '' === self::checkUtc( $value ) ? true : new WP_Error( 'aponto_field', self::checkUtc( $value ) ),
		);
	}

	/**
	 * A required `Y-m-d` date argument.
	 *
	 * @return array<string, mixed>
	 */
	public static function argDate(): array {
		return array(
			'required'          => true,
			'type'              => 'string',
			'sanitize_callback' => static fn ( $value ): string => sanitize_text_field( (string) $value ),
			'validate_callback' => static fn ( $value ) => '' === self::checkDate( $value ) ? true : new WP_Error( 'aponto_field', self::checkDate( $value ) ),
		);
	}

	/**
	 * A required IANA timezone argument.
	 *
	 * @return array<string, mixed>
	 */
	public static function argTimezone(): array {
		return array(
			'required'          => true,
			'type'              => 'string',
			'sanitize_callback' => static fn ( $value ): string => sanitize_text_field( (string) $value ),
			'validate_callback' => static fn ( $value ) => '' === self::checkTimezone( $value ) ? true : new WP_Error( 'aponto_field', self::checkTimezone( $value ) ),
		);
	}

	/**
	 * A boolean argument.
	 *
	 * @param bool $default_value Default value.
	 * @return array<string, mixed>
	 */
	public static function argBool( bool $default_value = false ): array {
		return array(
			'required'          => false,
			'default'           => $default_value,
			'type'              => 'boolean',
			'sanitize_callback' => 'rest_sanitize_boolean',
		);
	}
}

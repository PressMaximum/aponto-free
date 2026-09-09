<?php
/**
 * Accumulating field validator for REST write bodies.
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

/**
 * Validates + sanitizes individual request fields, accumulating a `field => localized message` map
 * so a controller can emit ONE `aponto_validation` 422 covering every bad field at once
 * (rest-contract §1). Pure (no WP_REST_Request dependency) so callers control presence — the caller
 * reads the raw param and, for partial (PATCH) bodies, only validates the fields that were sent.
 */
final class RequestValidator {

	/**
	 * Accumulated field errors.
	 *
	 * @var array<string, string>
	 */
	private array $errors = array();

	/**
	 * Whether any field failed.
	 */
	public function failed(): bool {
		return array() !== $this->errors;
	}

	/**
	 * The accumulated field errors.
	 *
	 * @return array<string, string>
	 */
	public function errors(): array {
		return $this->errors;
	}

	/**
	 * Record a field error (first message wins).
	 *
	 * @param string $field   Field name.
	 * @param string $message Localized message.
	 */
	public function fail( string $field, string $message ): void {
		if ( ! isset( $this->errors[ $field ] ) ) {
			$this->errors[ $field ] = $message;
		}
	}

	/**
	 * Required display name (1..191).
	 *
	 * @param string $field Field name.
	 * @param mixed  $raw   Raw value.
	 */
	public function name( string $field, mixed $raw ): string {
		$error = Args::checkName( $raw );
		if ( '' !== $error ) {
			$this->fail( $field, $error );

			return '';
		}

		return sanitize_text_field( trim( (string) $raw ) );
	}

	/**
	 * Required email.
	 *
	 * @param string $field Field name.
	 * @param mixed  $raw   Raw value.
	 */
	public function email( string $field, mixed $raw ): string {
		$error = Args::checkEmail( $raw );
		if ( '' !== $error ) {
			$this->fail( $field, $error );

			return '';
		}

		return sanitize_email( (string) $raw );
	}

	/**
	 * Optional phone (max 64, default '').
	 *
	 * @param string $field Field name.
	 * @param mixed  $raw   Raw value.
	 */
	public function phone( string $field, mixed $raw ): string {
		$error = Args::checkPhone( $raw );
		if ( '' !== $error ) {
			$this->fail( $field, $error );

			return '';
		}

		return sanitize_text_field( (string) $raw );
	}

	/**
	 * Optional textarea text (default '').
	 *
	 * @param mixed $raw Raw value.
	 */
	public function text( mixed $raw ): string {
		return sanitize_textarea_field( (string) $raw );
	}

	/**
	 * Required positive-integer id.
	 *
	 * @param string $field Field name.
	 * @param mixed  $raw   Raw value.
	 */
	public function id( string $field, mixed $raw ): int {
		$error = Args::checkId( $raw );
		if ( '' !== $error ) {
			$this->fail( $field, $error );

			return 0;
		}

		return (int) $raw;
	}

	/**
	 * Nullable positive-integer id (null when empty/absent).
	 *
	 * @param string $field Field name.
	 * @param mixed  $raw   Raw value.
	 */
	public function nullableId( string $field, mixed $raw ): ?int {
		if ( null === $raw || '' === $raw ) {
			return null;
		}
		$error = Args::checkId( $raw );
		if ( '' !== $error ) {
			$this->fail( $field, $error );

			return null;
		}

		return (int) $raw;
	}

	/**
	 * Integer within an inclusive range, optionally a multiple of a step.
	 *
	 * @param string   $field    Field name.
	 * @param mixed    $raw      Raw value.
	 * @param int      $min      Minimum.
	 * @param int      $max      Maximum.
	 * @param int|null $multiple Required multiple (or null).
	 */
	public function intInRange( string $field, mixed $raw, int $min, int $max, ?int $multiple = null ): int {
		if ( ! is_numeric( $raw ) ) {
			$this->fail( $field, __( 'A number is required.', 'aponto' ) );

			return $min;
		}
		if ( ! self::isWholeNumber( $raw ) ) {
			$this->fail( $field, __( 'A whole number is required.', 'aponto' ) );

			return $min;
		}
		$value = (int) $raw;
		if ( $value < $min || $value > $max ) {
			/* translators: 1: minimum, 2: maximum. */
			$this->fail( $field, sprintf( __( 'Must be between %1$d and %2$d.', 'aponto' ), $min, $max ) );

			return $min;
		}
		if ( null !== $multiple && 0 !== $value % $multiple ) {
			/* translators: %d: step. */
			$this->fail( $field, sprintf( __( 'Must be a multiple of %d.', 'aponto' ), $multiple ) );

			return $min;
		}

		return $value;
	}

	/**
	 * Nullable integer with an inclusive minimum (and optional maximum).
	 *
	 * @param string   $field Field name.
	 * @param mixed    $raw   Raw value.
	 * @param int      $min   Minimum.
	 * @param int|null $max   Maximum (or null).
	 */
	public function nullableInt( string $field, mixed $raw, int $min, ?int $max = null ): ?int {
		if ( null === $raw || '' === $raw ) {
			return null;
		}
		if ( ! is_numeric( $raw ) ) {
			$this->fail( $field, __( 'A number is required.', 'aponto' ) );

			return null;
		}
		if ( ! self::isWholeNumber( $raw ) ) {
			$this->fail( $field, __( 'A whole number is required.', 'aponto' ) );

			return null;
		}
		$value = (int) $raw;
		if ( $value < $min || ( null !== $max && $value > $max ) ) {
			$this->fail( $field, __( 'This value is out of range.', 'aponto' ) );

			return null;
		}

		return $value;
	}

	/**
	 * Whether a numeric value is a WHOLE number, i.e. survives the `(int)` cast unchanged.
	 *
	 * Every field these two helpers feed is an integer column (minutes, days, minor units,
	 * counts), and the bounds used to be checked AFTER the cast — so `4294967295.9` truncated
	 * into range and `"-0.5"` truncated to `0`, both landing as a silently different value than
	 * the client sent (Codex review item 4). Fractions are refused with a field error instead of
	 * being rounded on the client's behalf; every previously accepted form (int, integral float,
	 * digit string such as `"10"`) still passes.
	 *
	 * @param mixed $raw Value already known to be `is_numeric()`.
	 */
	private static function isWholeNumber( mixed $raw ): bool {
		if ( is_int( $raw ) ) {
			return true;
		}
		if ( is_float( $raw ) ) {
			return is_finite( $raw ) && floor( $raw ) === $raw;
		}

		return is_string( $raw ) && 1 === preg_match( '/^[+-]?\d+$/', trim( $raw ) );
	}

	/**
	 * Enum value.
	 *
	 * @param string       $field   Field name.
	 * @param mixed        $raw     Raw value.
	 * @param list<string> $allowed Allowed values.
	 */
	public function enum( string $field, mixed $raw, array $allowed ): string {
		$key   = sanitize_key( (string) $raw );
		$error = Args::checkEnum( $key, $allowed );
		if ( '' !== $error ) {
			$this->fail( $field, $error );

			return (string) ( $allowed[0] ?? '' );
		}

		return $key;
	}

	/**
	 * Boolean (mirrors `rest_sanitize_boolean`: only the strings `false`/`0` are falsey).
	 *
	 * @param mixed $raw Raw value.
	 */
	public function bool( mixed $raw ): bool {
		if ( is_string( $raw ) ) {
			$lower = strtolower( $raw );
			if ( 'false' === $lower || '0' === $lower ) {
				return false;
			}
		}

		return (bool) $raw;
	}

	/**
	 * Nullable `#RRGGBB` hex color.
	 *
	 * @param string $field Field name.
	 * @param mixed  $raw   Raw value.
	 */
	public function hexColor( string $field, mixed $raw ): ?string {
		if ( null === $raw || '' === $raw ) {
			return null;
		}
		$color = sanitize_hex_color( (string) $raw );
		if ( null === $color || '' === $color || 1 !== preg_match( '/^#[0-9a-fA-F]{6}$/', $color ) ) {
			$this->fail( $field, __( 'A valid #RRGGBB color is required.', 'aponto' ) );

			return null;
		}

		return $color;
	}

	/**
	 * Required RFC3339 UTC instant.
	 *
	 * @param string $field Field name.
	 * @param mixed  $raw   Raw value.
	 */
	public function utc( string $field, mixed $raw ): ?\DateTimeImmutable {
		$error = Args::checkUtc( $raw );
		if ( '' !== $error ) {
			$this->fail( $field, $error );

			return null;
		}

		return Args::parseUtc( (string) $raw );
	}

	/**
	 * Required IANA timezone.
	 *
	 * @param string $field Field name.
	 * @param mixed  $raw   Raw value.
	 */
	public function timezone( string $field, mixed $raw ): string {
		$error = Args::checkTimezone( $raw );
		if ( '' !== $error ) {
			$this->fail( $field, $error );

			return '';
		}

		// Canonicalize legacy aliases (e.g. Asia/Saigon → Asia/Ho_Chi_Minh) so the
		// stored customer_timezone is always the canonical IANA name.
		return Args::canonicalizeTimezone( (string) $raw );
	}
}

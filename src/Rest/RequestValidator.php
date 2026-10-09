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

use Aponto\Support\PersonName;

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
	 * Refuse a field the route does not accept with the shared "Unknown field." copy — the exact
	 * message the public booking route's allow-list answers (rest-contract §9, D-R69 N2).
	 *
	 * @param string $field Field name (e.g. `customer.name`).
	 */
	public function unknownField( string $field ): void {
		$this->fail( $field, __( 'Unknown field.', 'aponto' ) );
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
	 * One part of a person name — `first_name` or `last_name` (name split, founder 2026-10-01,
	 * N2/N3, D-R69).
	 *
	 * The `Args::checkName()` rules per part (1..191 characters after trim, `sanitize_text_field`),
	 * and the value returned is NORMALIZED through {@see PersonName::normalize()}: Unicode
	 * whitespace trimmed and collapsed, so a no-break space typed around a name can neither pass
	 * the "required" check as content nor be stored. An OPTIONAL part (a staff `last_name`, N3)
	 * accepts `null`, '' and whitespace-only as the empty string; a required one refuses them
	 * with the part-specific message.
	 *
	 * @param string $field    Field name (e.g. `customer.first_name`).
	 * @param mixed  $raw      Raw value.
	 * @param string $part     `first` or `last` — picks the refusal copy.
	 * @param bool   $required Whether an empty value is refused.
	 */
	public function namePart( string $field, mixed $raw, string $part, bool $required = true ): string {
		$missing = 'last' === $part
			? __( 'A last name is required.', 'aponto' )
			: __( 'A first name is required.', 'aponto' );

		if ( null === $raw ) {
			if ( $required ) {
				$this->fail( $field, $missing );
			}

			return '';
		}
		if ( ! is_string( $raw ) && ! is_numeric( $raw ) ) {
			$this->fail( $field, $required ? $missing : __( 'This field must be text.', 'aponto' ) );

			return '';
		}

		$value = PersonName::normalize( sanitize_text_field( (string) $raw ) );
		if ( '' === $value ) {
			if ( $required ) {
				$this->fail( $field, $missing );
			}

			return '';
		}
		if ( mb_strlen( $value ) > Args::MAX_191 ) {
			$this->fail( $field, __( 'This name is too long.', 'aponto' ) );

			return '';
		}

		return $value;
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
	 * Optional bounded text with an explicit character ceiling (D-R51).
	 *
	 * `text()` sanitizes but never measures, and `name()`/`phone()` carry their own hardcoded
	 * column widths — neither fits a field whose ceiling is a PRODUCT decision rather than a
	 * column width (a 600-character bio is `text` in the database and could hold far more). The
	 * ceiling is REFUSED, never truncated: silently storing half a sentence is worse than a `422`
	 * naming the field, and the admin UI counts down to the same number.
	 *
	 * Measured with `mb_strlen()` so the limit means characters in every language, not bytes.
	 *
	 * @param string $field     Field name.
	 * @param mixed  $raw       Raw value (`null` reads as the empty string).
	 * @param int    $max       Maximum length in characters.
	 * @param bool   $multiline Whether to keep newlines (`sanitize_textarea_field`).
	 */
	public function boundedText( string $field, mixed $raw, int $max, bool $multiline = false ): string {
		if ( null === $raw ) {
			return '';
		}
		if ( ! is_string( $raw ) && ! is_numeric( $raw ) ) {
			$this->fail( $field, __( 'This field must be text.', 'aponto' ) );

			return '';
		}

		$value = trim( (string) $raw );
		$value = $multiline ? sanitize_textarea_field( $value ) : sanitize_text_field( $value );

		if ( mb_strlen( $value ) > $max ) {
			$this->fail(
				$field,
				sprintf(
					/* translators: %d: the maximum number of characters allowed. */
					__( 'This field must be %d characters or fewer.', 'aponto' ),
					$max
				)
			);

			return '';
		}

		return $value;
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
	 * Required IANA timezone — or, with `$allow_offset`, a DISPLAY timezone that may also be a fixed
	 * offset `±HH:MM` (the booking `tz`, D-R63 fix round 2; {@see Args::checkDisplayTimezone()}).
	 *
	 * @param string $field        Field name.
	 * @param mixed  $raw          Raw value.
	 * @param bool   $allow_offset Accept a fixed-offset identifier too.
	 */
	public function timezone( string $field, mixed $raw, bool $allow_offset = false ): string {
		$error = $allow_offset ? Args::checkDisplayTimezone( $raw ) : Args::checkTimezone( $raw );
		if ( '' !== $error ) {
			$this->fail( $field, $error );

			return '';
		}

		// Canonicalize legacy aliases (e.g. Asia/Saigon → Asia/Ho_Chi_Minh) so the
		// stored customer_timezone is always the canonical IANA name.
		return Args::canonicalizeTimezone( (string) $raw );
	}

	/**
	 * OPTIONAL IANA timezone — `null` / `''` means "inherit the site timezone" (D-R59).
	 *
	 * The sibling of {@see self::timezone()} for a record whose zone column is NULLABLE and whose
	 * engine already resolves an empty value to `wp_timezone()`. Two inputs answer `null`: an
	 * absent/`null` value, and a string that is empty once trimmed — an operator who clears a
	 * `<select>` sends `''`, and treating that as "no opinion" is the only reading that lets a
	 * pinned zone be cleared at all. Anything else is validated by the REQUIRED rule verbatim, so
	 * a bare UTC offset or a plausible non-zone is still refused with the same field message it
	 * has always been refused with; nothing is relaxed except the presence requirement itself.
	 *
	 * @param string $field Field name.
	 * @param mixed  $raw   Raw value.
	 */
	public function optionalTimezone( string $field, mixed $raw ): ?string {
		if ( null === $raw || ( is_string( $raw ) && '' === trim( $raw ) ) ) {
			return null;
		}

		$zone = $this->timezone( $field, $raw );

		return '' === $zone ? null : $zone;
	}
}

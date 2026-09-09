<?php
/**
 * One public booking-form field definition (extension-surface §2, `aponto_public_form_fields`).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Booking;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * The public, PII-free description of ONE extra field the booking form must render and the server
 * must accept (D-R30). Core owns this shape; a module contributes definitions through the
 * `aponto_public_form_fields` filter and never touches the form bundle or the public controller.
 *
 * Everything here is public-safe by construction: a definition carries only what the visitor's
 * browser is already going to see (label, type, required marker, select options, length cap). No
 * stored value, no module internals and no admin-only metadata may ride along — the same array is
 * printed into `window.apontoForm` (§5 invariant 8: PII never leaves through a page-global).
 *
 * The four types are exactly the ones the form stylesheet already draws (`.ap-input`, `.ap-textarea`,
 * `.ap-select`, `.ap-consent`), so a definition can never ask the widget for a control it has no CSS
 * for — the form's 10 KB gz CSS budget is a hard product constraint, not a target.
 */
final class CustomFieldDefinition {

	/**
	 * Single-line text input (`.ap-input`).
	 */
	public const TYPE_TEXT = 'text';

	/**
	 * Multi-line text input (`.ap-textarea`).
	 */
	public const TYPE_TEXTAREA = 'textarea';

	/**
	 * Single-choice dropdown (`.ap-select`).
	 */
	public const TYPE_SELECT = 'select';

	/**
	 * Boolean checkbox (`.ap-consent`).
	 */
	public const TYPE_CHECKBOX = 'checkbox';

	/**
	 * Every supported field type (V1).
	 *
	 * @var list<string>
	 */
	public const TYPES = array( self::TYPE_TEXT, self::TYPE_TEXTAREA, self::TYPE_SELECT, self::TYPE_CHECKBOX );

	/**
	 * Machine key pattern. The slug is the field's IDENTITY: it is the `custom_fields.{slug}`
	 * metadata key, so nothing re-keys it in place — a definition submitted under a different slug
	 * is a different field, and the old one's answers stay where they are (D-R30).
	 */
	public const SLUG_PATTERN = '/^[a-z0-9_]{1,32}$/';

	/**
	 * Maximum label length (characters).
	 */
	public const MAX_LABEL = 100;

	/**
	 * Maximum number of `select` options.
	 */
	public const MAX_OPTIONS = 20;

	/**
	 * Maximum stored length of one `select` option value.
	 */
	public const MAX_OPTION_VALUE = 64;

	/**
	 * Maximum length of one `select` option label.
	 */
	public const MAX_OPTION_LABEL = 100;

	/**
	 * Hard cap on a `text` answer.
	 */
	public const MAX_TEXT_LENGTH = 200;

	/**
	 * Default cap on a `text` answer.
	 */
	public const DEFAULT_TEXT_LENGTH = 200;

	/**
	 * Hard cap on a `textarea` answer.
	 */
	public const MAX_TEXTAREA_LENGTH = 1000;

	/**
	 * Default cap on a `textarea` answer.
	 */
	public const DEFAULT_TEXTAREA_LENGTH = 500;

	/**
	 * Construct a definition. Callers outside core build these through {@see self::fromArray()},
	 * which is the only place the invariants above are enforced.
	 *
	 * @param string                                    $slug       Immutable machine key.
	 * @param string                                    $label      Visitor-facing label.
	 * @param string                                    $type       One of {@see self::TYPES}.
	 * @param bool                                      $required   Whether an answer is mandatory.
	 * @param list<array{value: string, label: string}> $options  Choices (`select` only).
	 * @param int                                       $max_length Answer cap (0 for select/checkbox).
	 */
	public function __construct(
		public readonly string $slug,
		public readonly string $label,
		public readonly string $type,
		public readonly bool $required = false,
		public readonly array $options = array(),
		public readonly int $max_length = 0
	) {}

	/**
	 * Build a definition from a contributed array, or null when it is malformed.
	 *
	 * Core validates hook output at the boundary and drops contributions of the wrong shape
	 * (extension-surface §2) — a filter is untrusted input, and this one reaches both a public
	 * page-global and the public write path. Nothing is coerced into validity: an entry with a bad
	 * slug, an unknown type or an unusable option list is rejected whole rather than silently
	 * repaired into a field the site owner never configured.
	 *
	 * @param mixed $raw Contributed entry.
	 */
	public static function fromArray( mixed $raw ): ?self {
		if ( ! is_array( $raw ) ) {
			return null;
		}

		$slug = isset( $raw['slug'] ) && is_string( $raw['slug'] ) ? $raw['slug'] : '';
		if ( 1 !== preg_match( self::SLUG_PATTERN, $slug ) ) {
			return null;
		}

		$type = isset( $raw['type'] ) && is_string( $raw['type'] ) ? $raw['type'] : '';
		if ( ! in_array( $type, self::TYPES, true ) ) {
			return null;
		}

		$label = isset( $raw['label'] ) && is_string( $raw['label'] ) ? sanitize_text_field( $raw['label'] ) : '';
		if ( '' === $label || mb_strlen( $label ) > self::MAX_LABEL ) {
			return null;
		}

		$options = array();
		if ( self::TYPE_SELECT === $type ) {
			$options = self::normalizeOptions( $raw['options'] ?? null );
			if ( null === $options ) {
				return null;
			}
		}

		$max_length = self::normalizeMaxLength( $type, $raw['max_length'] ?? null );

		return new self( $slug, $label, $type, ! empty( $raw['required'] ), $options, $max_length );
	}

	/**
	 * The public-safe payload printed into `window.apontoForm` and read back by the validator.
	 *
	 * @return array{slug: string, label: string, type: string, required: bool, options: list<array{value: string, label: string}>, max_length: int}
	 */
	public function toPublicArray(): array {
		return array(
			'slug'       => $this->slug,
			'label'      => $this->label,
			'type'       => $this->type,
			'required'   => $this->required,
			'options'    => $this->options,
			'max_length' => $this->max_length,
		);
	}

	/**
	 * Whether a submitted `select` value is one of the declared choices.
	 *
	 * @param string $value Candidate value.
	 */
	public function allowsOption( string $value ): bool {
		foreach ( $this->options as $option ) {
			if ( $option['value'] === $value ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Validate + normalize a `select` option list, or null when it is unusable.
	 *
	 * @param mixed $raw Raw options.
	 * @return list<array{value: string, label: string}>|null
	 */
	private static function normalizeOptions( mixed $raw ): ?array {
		if ( ! is_array( $raw ) || array() === $raw || count( $raw ) > self::MAX_OPTIONS ) {
			return null;
		}

		$options = array();
		$seen    = array();
		foreach ( $raw as $entry ) {
			if ( ! is_array( $entry ) ) {
				return null;
			}
			$value = isset( $entry['value'] ) && is_string( $entry['value'] ) ? sanitize_text_field( $entry['value'] ) : '';
			$label = isset( $entry['label'] ) && is_string( $entry['label'] ) ? sanitize_text_field( $entry['label'] ) : '';
			if ( '' === $value || mb_strlen( $value ) > self::MAX_OPTION_VALUE ) {
				return null;
			}
			if ( '' === $label || mb_strlen( $label ) > self::MAX_OPTION_LABEL ) {
				return null;
			}
			if ( isset( $seen[ $value ] ) ) {
				return null;
			}
			$seen[ $value ] = true;
			$options[]      = array(
				'value' => $value,
				'label' => $label,
			);
		}

		return $options;
	}

	/**
	 * Clamp the answer cap for a type (0 where the concept does not apply).
	 *
	 * @param string $type Field type.
	 * @param mixed  $raw  Raw cap.
	 */
	private static function normalizeMaxLength( string $type, mixed $raw ): int {
		if ( self::TYPE_TEXT !== $type && self::TYPE_TEXTAREA !== $type ) {
			return 0;
		}

		$max     = self::TYPE_TEXT === $type ? self::MAX_TEXT_LENGTH : self::MAX_TEXTAREA_LENGTH;
		$default = self::TYPE_TEXT === $type ? self::DEFAULT_TEXT_LENGTH : self::DEFAULT_TEXTAREA_LENGTH;
		if ( ! is_int( $raw ) && ! ( is_string( $raw ) && 1 === preg_match( '/^\d+$/', $raw ) ) ) {
			return $default;
		}

		$value = (int) $raw;

		return $value < 1 ? $default : min( $value, $max );
	}
}

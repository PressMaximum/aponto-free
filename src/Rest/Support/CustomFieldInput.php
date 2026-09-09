<?php
/**
 * Server-side validation of submitted custom booking-form answers (D-R30).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Rest\Support;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Booking\CustomFieldDefinition;
use Aponto\Booking\CustomFieldSchema;

/**
 * Validates the `custom_fields` object of `POST /public/bookings` against the definitions core
 * resolved from {@see CustomFieldSchema} (D-R30). Generic by construction: this class knows the four
 * field TYPES and nothing about any module — the definitions are data.
 *
 * The client is never trusted with the rules. `required`, the length caps and the `select`
 * membership are all re-enforced here even though the widget enforces them too: the form is a
 * convenience, the contract is this function. Every failure is a `custom_fields.{slug}` entry in the
 * standard `aponto_validation` 422 field map, which is exactly the key the widget routes back to the
 * offending input.
 *
 * ORDER matters. The parse surface is bounded FIRST — key count, then per-value type and length —
 * before any sanitizer runs, so a hostile body cannot buy meaningful work with a megabyte of text
 * (the rate limiters upstream stay exactly where they are; this only refuses to do the work).
 */
final class CustomFieldInput {

	/**
	 * Absolute byte ceiling for a single submitted value, checked BEFORE sanitizing.
	 *
	 * Four bytes per character is UTF-8's maximum, so this admits every string a legitimate
	 * `textarea` answer can produce while refusing a body that is only large.
	 */
	private const MAX_RAW_BYTES = CustomFieldDefinition::MAX_TEXTAREA_LENGTH * 4;

	/**
	 * Validate submitted answers against the definitions.
	 *
	 * @param mixed                       $raw         Raw `custom_fields` request value.
	 * @param list<CustomFieldDefinition> $definitions Resolved definitions.
	 * @return array{values: array<string, string|bool>, fields: array<string, string>}
	 */
	public static function validate( mixed $raw, array $definitions ): array {
		$fields = array();

		// The contract declares a `{slug: value}` OBJECT. A scalar or a JSON array is not one — but
		// an EMPTY PHP array is the one shape that cannot be told apart from `{}`, so it is accepted
		// and behaves exactly like an absent key.
		if ( null === $raw ) {
			$input = array();
		} elseif ( is_array( $raw ) && ( array() === $raw || ! array_is_list( $raw ) ) ) {
			$input = $raw;
		} else {
			return array(
				'values' => array(),
				'fields' => array( 'custom_fields' => __( 'This value is invalid.', 'aponto' ) ),
			);
		}

		if ( count( $input ) > CustomFieldSchema::MAX_FIELDS ) {
			return array(
				'values' => array(),
				'fields' => array( 'custom_fields' => __( 'This value is invalid.', 'aponto' ) ),
			);
		}

		$by_slug = array();
		foreach ( $definitions as $definition ) {
			$by_slug[ $definition->slug ] = $definition;
		}

		foreach ( array_keys( $input ) as $slug ) {
			$slug = (string) $slug;
			if ( ! isset( $by_slug[ $slug ] ) ) {
				$fields[ 'custom_fields.' . $slug ] = __( 'Unknown field.', 'aponto' );
			}
		}

		$values = array();
		foreach ( $definitions as $definition ) {
			$key      = 'custom_fields.' . $definition->slug;
			$supplied = $input[ $definition->slug ] ?? null;

			if ( CustomFieldDefinition::TYPE_CHECKBOX === $definition->type ) {
				$checked = self::toBool( $supplied );
				if ( $definition->required && ! $checked ) {
					$fields[ $key ] = __( 'This field is required.', 'aponto' );
					continue;
				}
				if ( $checked ) {
					$values[ $definition->slug ] = true;
				}
				continue;
			}

			// STRINGS ONLY for text/textarea/select — no coercion (Codex review). Accepting any
			// scalar meant `true` arrived as `"1"` and the number `1` matched a `select` option
			// whose value is the STRING `"1"`, so a client could pass a type check it never
			// satisfied and store an answer the visitor could not have chosen. `null` (and an
			// absent key) still mean "not answered", which is what the widget omits.
			if ( null !== $supplied && ! is_string( $supplied ) ) {
				$fields[ $key ] = __( 'This value is invalid.', 'aponto' );
				continue;
			}

			$candidate = null === $supplied ? '' : $supplied;
			if ( strlen( $candidate ) > self::MAX_RAW_BYTES ) {
				$fields[ $key ] = __( 'This answer is too long.', 'aponto' );
				continue;
			}

			$value = CustomFieldDefinition::TYPE_TEXTAREA === $definition->type
				? sanitize_textarea_field( $candidate )
				: sanitize_text_field( $candidate );
			$value = trim( $value );

			if ( '' === $value ) {
				if ( $definition->required ) {
					$fields[ $key ] = __( 'This field is required.', 'aponto' );
				}
				continue;
			}

			if ( CustomFieldDefinition::TYPE_SELECT === $definition->type ) {
				if ( ! $definition->allowsOption( $value ) ) {
					$fields[ $key ] = __( 'This value is not allowed.', 'aponto' );
					continue;
				}
				$values[ $definition->slug ] = $value;
				continue;
			}

			if ( mb_strlen( $value ) > $definition->max_length ) {
				$fields[ $key ] = __( 'This answer is too long.', 'aponto' );
				continue;
			}

			$values[ $definition->slug ] = $value;
		}

		return array(
			'values' => $values,
			'fields' => $fields,
		);
	}

	/**
	 * Whether a checkbox answer counts as TICKED. The complete accepted set, and nothing else:
	 *
	 *   - the boolean `true`;
	 *   - the integer `1`;
	 *   - the strings `"1"`, `"true"`, `"on"`, `"yes"` — case-insensitive, surrounding space
	 *     trimmed. `"on"` is there because that is what an HTML checkbox posts.
	 *
	 * EVERYTHING else is unticked, silently and by design — including `false`, `0`, `"0"`,
	 * `"false"`, `""`, `null`, an absent key, and any array or object. A checkbox has no invalid
	 * state to report: "not ticked" is a legitimate answer, so an unrecognised value must not
	 * become a 422 that the widget has no way to explain. The one case that DOES fail is a
	 * REQUIRED checkbox left unticked, which the caller reports as a missing answer.
	 *
	 * Deliberately unlike text/textarea/select, which accept strings only and 422 otherwise: there
	 * a wrong type means a value the visitor could not have entered, and silently dropping it would
	 * store a different answer from the one that was sent.
	 *
	 * @param mixed $raw Raw value.
	 */
	private static function toBool( mixed $raw ): bool {
		if ( is_bool( $raw ) ) {
			return $raw;
		}
		if ( is_int( $raw ) ) {
			return 1 === $raw;
		}
		if ( is_string( $raw ) ) {
			return in_array( strtolower( trim( $raw ) ), array( '1', 'true', 'on', 'yes' ), true );
		}

		return false;
	}
}

<?php
/**
 * Resolver for the public booking-form field contributions (D-R30).
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

use Aponto\Support\Clock;
use Aponto\Support\Logger;
use Aponto\Support\Settings;

/**
 * The ONE place core resolves `aponto_public_form_fields` (D-R30). Three surfaces read it and they
 * must never disagree: the page-global the form renders from ({@see \Aponto\Frontend\BlockRegistrar}),
 * the server-side validation of `POST /public/bookings`, and the label lookup for the admin booking
 * detail. A second reader with its own normalization would be a way to submit a value the form never
 * offered, or to render a field the server rejects.
 *
 * Core owns the boundary, not the contribution: a filter is untrusted input (extension-surface §2),
 * so every entry goes through {@see CustomFieldDefinition::fromArray()} and a malformed one is
 * DROPPED with the stable log code `aponto_invalid_form_field` rather than repaired. Duplicate slugs
 * keep the first contribution — later ones lose, deterministically — and the list is capped at
 * {@see self::MAX_FIELDS}, so no contributor can grow the public payload without bound.
 *
 * FREE BUILD: nothing hooks the filter, so `definitions()` is `[]` and every path below collapses to
 * the pre-D-R30 behaviour — an empty `fields.custom` in the page-global and the existing unknown-field
 * 422 for any submitted `custom_fields`. The form bundle is byte-identical in both editions
 * (pixel-identical rule); Free simply receives an empty list.
 */
final class CustomFieldSchema {

	/**
	 * Filter that collects public booking-form field definitions.
	 */
	public const FILTER = 'aponto_public_form_fields';

	/**
	 * Metadata key prefix in `aponto_booking_meta` — one row per answered field.
	 */
	public const META_PREFIX = 'custom_fields.';

	/**
	 * Hard cap on the number of custom fields the public form may carry.
	 */
	public const MAX_FIELDS = 8;

	/**
	 * Stable operational log code for a rejected contribution (error-registry §operational codes).
	 */
	private const LOG_CODE = 'aponto_invalid_form_field';

	/**
	 * Memoised definitions for this request (the filter is read on several surfaces per request).
	 *
	 * @var list<CustomFieldDefinition>|null
	 */
	private ?array $cache = null;

	/**
	 * Construct the resolver.
	 *
	 * `Settings` is optional and used ONLY to build a {@see Logger} on the rejection path — the
	 * logger is constructed lazily there rather than in this constructor, because this class is
	 * built on every public form render and a rejected contribution is a configuration bug, not a
	 * request-path event.
	 *
	 * @param Settings|null $settings Settings (enables logging of rejected contributions).
	 * @param Clock|null    $clock    Clock for the log timestamp.
	 */
	public function __construct( private ?Settings $settings = null, private ?Clock $clock = null ) {}

	/**
	 * The validated field definitions for this request.
	 *
	 * @return list<CustomFieldDefinition>
	 */
	public function definitions(): array {
		if ( null !== $this->cache ) {
			return $this->cache;
		}

		/**
		 * Filter the extra fields the public booking form collects (extension-surface §2, D-R30).
		 *
		 * A module returns a list of `array{slug, label, type, required, options, max_length}`
		 * entries; core validates the shape at this boundary and drops anything malformed. The
		 * result is PUBLIC — it is printed into the page-global the visitor's browser reads — so a
		 * contribution must carry no stored value and no admin-only metadata.
		 *
		 * @param list<array<string, mixed>> $fields Contributed definitions (default none).
		 */
		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound -- The constant IS the `aponto_`-prefixed hook name.
		$contributed = apply_filters( self::FILTER, array() );

		$definitions = array();
		$seen        = array();
		$rejected    = 0;
		foreach ( is_array( $contributed ) ? $contributed : array() as $entry ) {
			if ( count( $definitions ) >= self::MAX_FIELDS ) {
				++$rejected;
				continue;
			}
			$definition = CustomFieldDefinition::fromArray( $entry );
			if ( null === $definition || isset( $seen[ $definition->slug ] ) ) {
				++$rejected;
				continue;
			}
			$seen[ $definition->slug ] = true;
			$definitions[]             = $definition;
		}

		if ( $rejected > 0 ) {
			$this->logRejected( $rejected );
		}

		$this->cache = $definitions;

		return $definitions;
	}

	/**
	 * The definitions keyed by slug.
	 *
	 * @return array<string, CustomFieldDefinition>
	 */
	public function bySlug(): array {
		$map = array();
		foreach ( $this->definitions() as $definition ) {
			$map[ $definition->slug ] = $definition;
		}

		return $map;
	}

	/**
	 * The public payload for `window.apontoForm.fields.custom`.
	 *
	 * @return list<array<string, mixed>>
	 */
	public function publicPayload(): array {
		return array_map(
			static fn ( CustomFieldDefinition $definition ): array => $definition->toPublicArray(),
			$this->definitions()
		);
	}

	/**
	 * The metadata key holding one field's answer.
	 *
	 * @param string $slug Field slug.
	 */
	public static function metaKey( string $slug ): string {
		return self::META_PREFIX . $slug;
	}

	/**
	 * The slug behind a metadata key, or null when the key is not a custom-field key.
	 *
	 * @param string $meta_key Metadata key.
	 */
	public static function slugFromMetaKey( string $meta_key ): ?string {
		if ( 0 !== strpos( $meta_key, self::META_PREFIX ) ) {
			return null;
		}

		$slug = substr( $meta_key, strlen( self::META_PREFIX ) );

		return 1 === preg_match( CustomFieldDefinition::SLUG_PATTERN, $slug ) ? $slug : null;
	}

	/**
	 * Record that contributions were dropped. PII-free by construction — only a count is logged,
	 * never a label, a slug or a value (§5 invariant 8).
	 *
	 * @param int $rejected Number of dropped contributions.
	 */
	private function logRejected( int $rejected ): void {
		if ( null === $this->settings ) {
			return;
		}

		( new Logger( $this->settings, $this->clock ?? new Clock() ) )->log(
			self::LOG_CODE,
			'warning',
			'Public booking-form field contribution was rejected.',
			array( 'rejected' => $rejected )
		);
	}
}

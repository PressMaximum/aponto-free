<?php
/**
 * The site's booking page (D-R75).
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
 * Which WordPress page hosts the booking form — the page emails ("Book again"), the resume-pay
 * "Pay now" link and checkout links lead back to.
 *
 * The answer lives in the standalone option {@see self::OPTION}, NOT inside `aponto_settings`:
 * the onboarding wizard has written it there since P1 and every reader
 * ({@see \Aponto\Notification\NotificationContext::bookingPageUrl()} and the admin boot data) reads
 * it there. D-R75 adds the second writer — Settings → Booking → Form presentation — on the same
 * option, so there is one source of truth and no data to move.
 *
 * A page counts only while it is a PUBLISHED `page`. A stored id whose page has since been
 * trashed, deleted or unpublished is reported as "none" plus `unpublished = true`, never as a
 * link: a customer email must not point at a 404 or a private permalink.
 */
final class BookingPage {

	/**
	 * Option holding the page id (0 / absent = none). Per site on multisite, and swept on
	 * uninstall with every other `aponto_*` option.
	 */
	public const OPTION = 'aponto_booking_page_id';

	/**
	 * The block that renders the booking form.
	 */
	public const BLOCK = 'aponto/booking-form';

	/**
	 * REST field name of the page id inside `PUT /settings` (rest-contract §2.11, D-R75).
	 */
	public const FIELD = 'booking_page.id';

	/**
	 * The stored page id, whatever state that page is in (0 = none).
	 */
	public static function storedId(): int {
		return max( 0, (int) get_option( self::OPTION, 0 ) );
	}

	/**
	 * Whether a REST write names an acceptable booking page: integer `0` (none) or the id of a
	 * published `page`. Strict on type — `"12"` is refused, as every other settings key refuses
	 * a value that would only be accepted through coercion.
	 *
	 * @param mixed $id Raw value.
	 */
	public static function accepts( mixed $id ): bool {
		if ( ! is_int( $id ) || $id < 0 ) {
			return false;
		}

		if ( 0 === $id ) {
			return true;
		}
		$post = self::published( $id );

		return null !== $post && 'page' === $post->post_type;
	}

	/**
	 * Record the booking page. Callers validate with {@see self::accepts()} first.
	 *
	 * Autoload stays off, matching the wizard's own write of this option.
	 *
	 * @param int $id Page id, or 0 for none.
	 */
	public static function save( int $id ): void {
		update_option( self::OPTION, max( 0, $id ), false );
	}

	/**
	 * The REST representation (rest-contract §2.11 addendum D-R75).
	 *
	 * `has_form` is computed here, from the page's own content, so the admin never guesses it:
	 * it answers "does this page contain the booking-form block?". A form reached another way
	 * (a synced pattern, a template part) reads `false`, which is why the admin treats it as a
	 * non-blocking hint.
	 *
	 * @return array{id:int, permalink:string, title:string, has_form:bool, edit_url:string, unpublished:bool}
	 */
	public static function dto(): array {
		$stored = self::storedId();
		$post   = $stored > 0 ? self::published( $stored ) : null;
		if ( null === $post ) {
			return array(
				'id'          => 0,
				'permalink'   => '',
				'title'       => '',
				'has_form'    => false,
				'edit_url'    => '',
				// A page WAS chosen and can no longer be linked — distinct from "never set".
				'unpublished' => $stored > 0,
			);
		}

		return array(
			'id'          => (int) $post->ID,
			'permalink'   => (string) get_permalink( $post ),
			'title'       => (string) get_the_title( $post ),
			'has_form'    => has_block( self::BLOCK, $post ),
			'edit_url'    => (string) get_edit_post_link( $post->ID, 'raw' ),
			'unpublished' => false,
		);
	}

	/**
	 * The published post with this id, or null. The READ side asks only for "published" — exactly
	 * the rule {@see \Aponto\Notification\NotificationContext::bookingPageUrl()} links by, so this
	 * class can never call a page missing while an email still links it; the WRITE side
	 * ({@see self::accepts()}) additionally requires the `page` post type.
	 *
	 * @param int $id Post id.
	 */
	private static function published( int $id ): ?\WP_Post {
		$post = get_post( $id );
		if ( ! $post instanceof \WP_Post || 'publish' !== $post->post_status ) {
			return null;
		}

		return $post;
	}
}

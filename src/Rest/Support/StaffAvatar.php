<?php
/**
 * Staff avatar serializer (D-R51).
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

/**
 * The ONE place a staff row becomes an avatar (D-R51). Admin DTO, public roster and the
 * post-booking staff object all come through here, so a site can never be shown two different
 * answers for the same person.
 *
 * **The priority chain (founder 2026-09-20):**
 *
 *   1. **Uploaded photo** — `aponto_staff.avatar_id`. Always wins; it is the one answer an
 *      operator chose on purpose.
 *   2. **Gravatar** — resolved through core `get_avatar_url()`, so this "behaves like
 *      WordPress": a local-avatar plugin filtering `pre_get_avatar_data`/`get_avatar_url` wins
 *      here exactly as it wins for comment authors, and a staff row carrying `wp_user_id` is
 *      resolved through the `WP_User` so a user-level avatar applies. Skipped entirely when
 *      Settings → Discussion has avatars switched off.
 *   3. **Nothing** — `null`, and every client draws its own text avatar (initials).
 *
 * **"Does this person actually have a Gravatar?" is answered in the BROWSER, not here** (founder
 * revision, same day). `default => '404'` makes gravatar.com answer `404` for an address it does
 * not know, and both clients already fall back to the initials mark on an image error — so the
 * URL is emitted unconditionally and the network decides, exactly the way core handles a comment
 * avatar. This class therefore performs **NO outbound HTTP** and keeps **no state**: the earlier
 * design cached a probed verdict in an option, and deleting it removed a lock, a cron-shaped
 * refresh rule and a stale-data problem in exchange for one 404 the client already handles.
 *
 * **What that publishes, stated plainly.** While `show_avatars` is on, an avatar carries a
 * gravatar.com URL containing a HASH OF THE STAFF EMAIL (core computes it — `md5()` in the older
 * supported releases, `hash( 'sha256', … )` in current core) and the browser requests it. That is
 * WordPress's own convention for comment authors and users, and the ways out are the operator's:
 * upload a photo, turn avatars off in Settings → Discussion, or — for the booking form — switch
 * `booking.staff_photos` off. See `docs/privacy-inventory.md`.
 *
 * **Exactly TWO surfaces resolve an avatar (D-R66, 2026-09-21), and no more.**
 * {@see self::admin()} for the authenticated staff screens, and {@see self::publicUrls()} for the
 * PRE-booking roster of `GET /public/services`, which is Premium-only (it needs `multi_staff` and
 * ≥2 public staff) and gated on `booking.staff_photos`. The POST-booking `staff` object —
 * create, confirm and the manage-token read — deliberately carries NO avatar: nothing rendered
 * one, and an unauthenticated payload is the last place a staff-email hash should appear for a
 * picture no surface draws.
 *
 * **Sizes.** Uploads use the CORE sizes `thumbnail` (150) and `medium`, never an
 * `add_image_size()` of our own: a registered size only exists for images uploaded AFTER the
 * registration, so every photo already in the library would resolve to the full-size original —
 * a 4000px JPEG behind a 40px circle, on exactly the sites that have been running longest.
 * Gravatars use 96 and 192, the standard 1x/2x pair for a 48px-ish mark.
 */
final class StaffAvatar {

	/**
	 * The registered size used for an upload's 1x URL.
	 */
	private const SIZE_1X = 'thumbnail';

	/**
	 * The registered size used for an upload's 2x URL. Falls back to the 1x URL when the library
	 * never generated it (an upload below the medium threshold has no `medium` file).
	 */
	private const SIZE_2X = 'medium';

	/**
	 * Gravatar pixel sizes for 1x and 2x.
	 */
	private const GRAVATAR_1X = 96;
	private const GRAVATAR_2X = 192;

	/**
	 * The ADMIN shape: `{url, url_2x, source}`, plus `id` when the source is an upload, or null.
	 *
	 * The attachment id is carried for uploads because the editor round-trips it — the media
	 * modal reselects the current attachment and `PATCH /staff/{id}` writes `avatar_id`, not a
	 * URL. A Gravatar has no id to carry.
	 *
	 * @param array{id:int, avatar_id:int|null, email:string, wp_user_id:int|null} $staff Staff row fields.
	 * @return array{id?:int, url:string, url_2x:string, source:string}|null
	 */
	public static function admin( array $staff ): ?array {
		$avatar = self::resolve( $staff );
		if ( null === $avatar ) {
			return null;
		}

		if ( 'upload' === $avatar['source'] ) {
			return array_merge( array( 'id' => (int) $staff['avatar_id'] ), $avatar );
		}

		return $avatar;
	}

	/**
	 * The PUBLIC shape: `{url, url_2x, source}` or null.
	 *
	 * No attachment id: a visitor has no use for one, and publishing an internal post id on an
	 * unauthenticated route is a disclosure with no reader (docs/privacy-inventory.md).
	 *
	 * @param array{id:int, avatar_id:int|null, email:string, wp_user_id:int|null} $staff Staff row fields.
	 * @return array{url:string, url_2x:string, source:string}|null
	 */
	public static function publicUrls( array $staff ): ?array {
		return self::resolve( $staff );
	}

	/**
	 * Walk the chain. Read-only and network-free in every branch.
	 *
	 * @param array{id:int, avatar_id:int|null, email:string, wp_user_id:int|null} $staff Staff row fields.
	 * @return array{url:string, url_2x:string, source:string}|null
	 */
	public static function resolve( array $staff ): ?array {
		$upload = self::uploadUrls( $staff['avatar_id'] ?? null );
		if ( null !== $upload ) {
			return $upload;
		}

		return self::gravatarUrls( $staff );
	}

	/**
	 * Whether an attachment id names an existing attachment carrying an IMAGE mime type.
	 *
	 * The admin write path's guard: `avatar_id` is a `nullable_id`, so any post id validates as a
	 * shape, and "an existing post that is not a picture" is a validation failure the operator can
	 * fix — `422 aponto_validation` with the field named — rather than a `404` about a record that
	 * does exist.
	 *
	 * @param int $attachment_id Candidate attachment id.
	 */
	public static function isImageAttachment( int $attachment_id ): bool {
		if ( $attachment_id <= 0 ) {
			return false;
		}
		$post = get_post( $attachment_id );
		if ( ! $post instanceof \WP_Post || 'attachment' !== $post->post_type ) {
			return false;
		}

		return str_starts_with( (string) get_post_mime_type( $post ), 'image/' );
	}

	/**
	 * The uploaded-photo branch.
	 *
	 * `wp_get_attachment_image_url()` doubles as the validity test: it returns `false` for a
	 * missing attachment, for a non-image and for an attachment whose metadata never generated,
	 * so a photo deleted from the media library falls THROUGH to the Gravatar branch rather than
	 * emitting a broken `<img>`.
	 *
	 * @param int|null $attachment_id Stored `avatar_id`.
	 * @return array{url:string, url_2x:string, source:string}|null
	 */
	private static function uploadUrls( ?int $attachment_id ): ?array {
		if ( null === $attachment_id || $attachment_id <= 0 ) {
			return null;
		}

		$url = wp_get_attachment_image_url( $attachment_id, self::SIZE_1X );
		if ( ! is_string( $url ) || '' === $url ) {
			return null;
		}

		$url_2x = wp_get_attachment_image_url( $attachment_id, self::SIZE_2X );

		return array(
			'url'    => $url,
			'url_2x' => ( is_string( $url_2x ) && '' !== $url_2x ) ? $url_2x : $url,
			'source' => 'upload',
		);
	}

	/**
	 * The Gravatar branch.
	 *
	 * No existence check and no state: `default => '404'` means gravatar.com answers `404` for
	 * an address it does not know, and the clients render their initials mark on the resulting
	 * image error. A filter that points this at a local file is published unchanged — that is
	 * the point of going through core.
	 *
	 * @param array{id:int, email:string, wp_user_id:int|null} $staff Staff row fields.
	 * @return array{url:string, url_2x:string, source:string}|null
	 */
	private static function gravatarUrls( array $staff ): ?array {
		if ( ! self::avatarsEnabled() ) {
			return null;
		}

		$url = self::avatarUrl( $staff, self::GRAVATAR_1X );
		if ( '' === $url ) {
			return null;
		}

		$url_2x = self::avatarUrl( $staff, self::GRAVATAR_2X );

		return array(
			'url'    => $url,
			'url_2x' => '' !== $url_2x ? $url_2x : $url,
			'source' => 'gravatar',
		);
	}

	/**
	 * `get_avatar_url()` for this staff member at one size, or `''`.
	 *
	 * The subject is the `WP_User` OBJECT when the staff row links to a real one, and the email
	 * string otherwise. Core resolves a user through the same filters a comment author goes
	 * through plus the user's own meta, which is what lets a user-level local avatar win; a
	 * `wp_user_id` pointing at a deleted user falls back to the address rather than resolving
	 * to nothing.
	 *
	 * `esc_url_raw()` is applied to the result because it is a URL from a filterable core
	 * function on its way into a REST response. It is the DB/raw context, so the query string
	 * survives intact — `&` is not entity-encoded, which matters for `?s=96&d=404&r=g`.
	 *
	 * @param array{email:string, wp_user_id:int|null} $staff Staff row fields.
	 * @param int                                      $size  Pixel size.
	 */
	private static function avatarUrl( array $staff, int $size ): string {
		$subject    = null;
		$wp_user_id = $staff['wp_user_id'] ?? null;
		if ( null !== $wp_user_id && $wp_user_id > 0 ) {
			$user = get_userdata( $wp_user_id );
			if ( $user instanceof \WP_User ) {
				$subject = $user;
			}
		}
		if ( null === $subject ) {
			$subject = (string) $staff['email'];
		}
		if ( '' === $subject ) {
			return '';
		}

		$url = get_avatar_url(
			$subject,
			array(
				'size'    => $size,
				'default' => '404',
			)
		);

		return is_string( $url ) ? esc_url_raw( $url ) : '';
	}

	/**
	 * Settings → Discussion → "Show Avatars". `get_avatar_url()` does NOT consult it (only
	 * `get_avatar()` does), so the chain asks for itself — an operator who switched avatars off
	 * for their site did not mean "except on the booking form".
	 */
	private static function avatarsEnabled(): bool {
		return (bool) get_option( 'show_avatars' );
	}
}

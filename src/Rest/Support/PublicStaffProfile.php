<?php
/**
 * The public staff profile entry (D-R51/D-R52), shared by the roster and the host line.
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
 * The ONE serializer of what a visitor may see about a staff member — the display name, its two
 * parts, the job title and the avatar — so the `/public/services` roster (D-R51) and the one-page
 * host line (D-R85) can never publish two different answers for the same person.
 *
 * **Empty keys are OMITTED**, never emitted as `""`/`null`: a key that is present is one the
 * operator filled in on purpose (D-R51). **`title` and `avatar` each answer to their switch**
 * (`booking.staff_titles`, `booking.staff_photos` — D-R52), and "photos off" removes the avatar
 * from the payload, not only from the paint, because the Gravatar leg of the chain publishes a URL
 * carrying core's hash of the staff email.
 *
 * Never here: `id` (the caller decides whether ids are already public), `bio` (its own opt-in,
 * applied by the roster only), `email`, `phone`, `wp_user_id` — the last two ride the input only
 * so {@see StaffAvatar} can resolve a Gravatar, and stay server-side (docs/privacy-inventory.md).
 */
final class PublicStaffProfile {

	/**
	 * One public entry.
	 *
	 * @param array{id:int, name:string, first_name:string, last_name:string, title:string, avatar_id:int|null, email:string, wp_user_id:int|null} $member Roster row (names composed by `PersonName`).
	 * @param bool                                                                                                                                 $titles Whether job titles are published (`booking.staff_titles`).
	 * @param bool                                                                                                                                 $photos Whether photos are published (`booking.staff_photos`).
	 * @return array{name:string, first_name:string, last_name:string, title?:string, avatar?:array{url:string, url_2x:string, source:string}}
	 */
	public static function entry( array $member, bool $titles, bool $photos ): array {
		$entry = array(
			'name'       => (string) $member['name'],
			'first_name' => (string) $member['first_name'],
			'last_name'  => (string) $member['last_name'],
		);

		if ( $titles ) {
			$title = trim( (string) $member['title'] );
			if ( '' !== $title ) {
				$entry['title'] = $title;
			}
		}

		if ( $photos ) {
			$avatar = StaffAvatar::publicUrls( $member );
			if ( null !== $avatar ) {
				$entry['avatar'] = $avatar;
			}
		}

		return $entry;
	}
}

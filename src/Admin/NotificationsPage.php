<?php
/**
 * Minimal standalone admin mount for the Notifications settings UI (SPEC-P1 §1.6 + §3).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Admin;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Notification\Placeholders;

/**
 * Registers a standalone admin screen that mounts the React Notifications editor (list of the eight
 * seeded templates, per-template subject/body editor with the placeholder whitelist, and the fixture
 * test-send). The REST surface (`/notifications`, `/notifications/test-send`) already exists (SPEC-P0
 * §7); this is only the admin surface.
 *
 * FOLDED INTO THE ADMIN SHELL (2026-07-18 menu reconciliation): the Notifications editor now renders
 * as the Settings → Notifications tab of the Aponto SPA (same `admin.js` bundle), so this class no
 * longer registers its own top-level menu or enqueue. It remains the PROVIDER of the notifications
 * boot-data contract ({@see bootData()}, merged into `window.apontoAdmin` by
 * {@see \Aponto\Admin\AdminPage}) and of the legacy mount id used by the standalone fallback boot.
 */
final class NotificationsPage {

	/**
	 * Legacy standalone page slug (menu no longer registered; kept for reference/UTMs).
	 */
	public const SLUG = 'aponto-notifications';

	/**
	 * DOM id the standalone fallback mounts into (`assets/src/admin/index.js`).
	 */
	public const MOUNT = 'aponto-notifications-app';

	/**
	 * No hooks: the SPA owns the surface. Kept so the Kernel wiring (one line per
	 * track) stays stable and future notification-page hooks have a home.
	 */
	public function register(): void {
		// Intentionally empty — see the class docblock.
	}

	/**
	 * Boot-data keys the NotificationsApp React component consumes (the stable B3
	 * contract): REST base, placeholder whitelist and which placeholders are URLs.
	 * The nonce rides the shared `window.apontoAdmin.nonce`.
	 *
	 * @return array<string, mixed>
	 */
	public static function bootData(): array {
		return array(
			'restBase'     => wp_make_link_relative( rest_url( 'aponto/v1' ) ),
			'mount'        => self::MOUNT,
			'placeholders' => array_values( Placeholders::WHITELIST ),
			// Derived from the renderer's own URL list so a new URL placeholder (e.g. the A4
			// booking_page_link) styles as a link chip without editing this contract twice.
			'urlKeys'      => array_values( Placeholders::URL_KEYS ),
		);
	}
}

<?php
/**
 * One-shot onboarding redirect after a successful activation.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Onboarding;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * Defers the onboarding redirect until WordPress has completed the activation request.
 *
 * WordPress redirects to the Plugins screen after it runs an activation hook, so attempting the
 * product redirect inside that hook would be overwritten. The durable marker below survives that
 * core redirect and is consumed only by the next eligible foreground admin GET. Background work
 * never steals it, while a completed funnel or bulk-activation landing clears it without redirect.
 */
final class ActivationRedirect {

	/**
	 * One-shot activation marker (autoload off).
	 */
	public const OPTION = 'aponto_activation_redirect';

	/**
	 * Queue the next eligible admin request for onboarding.
	 */
	public static function queue(): void {
		update_option( self::OPTION, 1, false );
	}

	/**
	 * Redirect the first eligible admin request after activation to the setup wizard.
	 */
	public static function maybeRedirect(): void {
		if ( 1 !== (int) get_option( self::OPTION, 0 ) ) {
			return;
		}

		// A completed setup is merely being reactivated. Bulk activation should keep WordPress's
		// own success summary instead of one plugin taking over the multi-plugin flow.
		if ( ( new Funnel() )->isComplete() || isset( $_GET['activate-multi'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only core landing marker; no submitted data is trusted.
			delete_option( self::OPTION );

			return;
		}

		if ( self::isBackgroundRequest() || is_network_admin() || ! current_user_can( 'aponto_manage_settings' ) ) {
			return;
		}

		delete_option( self::OPTION );
		wp_safe_redirect( admin_url( 'admin.php?page=' . WizardPage::slug() ) );
		exit;
	}

	/**
	 * Whether this request must leave the activation marker for a real admin-page visit.
	 */
	private static function isBackgroundRequest(): bool {
		if ( wp_doing_ajax() || wp_doing_cron() ) {
			return true;
		}
		if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) {
			return true;
		}
		if ( defined( 'WP_CLI' ) && WP_CLI ) {
			return true;
		}

		$method = strtoupper( (string) ( $_SERVER['REQUEST_METHOD'] ?? 'GET' ) );
		if ( 'GET' !== $method ) {
			return true;
		}

		global $pagenow;

		return in_array( (string) $pagenow, array( 'admin-ajax.php', 'admin-post.php' ), true );
	}
}

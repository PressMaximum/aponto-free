<?php
/**
 * The one OAuth return leg shared by every integration (extension-surface §4.1).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Integration;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Rest\Policy;
use WP_Error;

/**
 * Receives `admin-post.php?action=aponto_oauth_callback` — the redirect URI the site owner
 * registers with their provider, once, for every Aponto integration.
 *
 * ### Why one URL for every module
 *
 * The redirect URI is the single value the operator has to copy into a provider console by hand,
 * and every extra one is another chance to get it wrong. Nothing is lost by sharing it, because
 * nothing in the URL is trusted: the module, the staff member and the initiating user all come from
 * the bound single-use `state` ({@see OAuthState}), which is also what makes this endpoint
 * CSRF-safe — the usual nonce cannot survive a round trip through a third party's consent screen,
 * and the state is the OAuth-native token that can.
 *
 * ### Defence in depth
 *
 * The state proves the request came from a handshake this site started, but not that the browser
 * presenting it is still allowed to finish one, so the capability is re-checked here against the
 * CURRENT session — a logged-out or demoted browser replaying a live redirect is refused.
 *
 * ### What never appears in a URL or a log
 *
 * The provider's `code` and `state` arrive as query parameters and stop here: the response is a
 * redirect to the SPA route carrying nothing but a success/error flag, and the outcome message is
 * handed over out-of-band through a short-lived per-user transient the admin boot data reads once.
 * No token, authorization code or state value is ever written to the redirect target or to a log.
 */
final class OAuthCallback {

	/**
	 * Transient prefix for the one-shot per-user result notice.
	 */
	private const NOTICE_PREFIX = 'aponto_int_notice_';

	/**
	 * How long the one-shot notice survives if the admin never lands on the screen.
	 */
	private const NOTICE_TTL = 120;

	/**
	 * Construct the handler.
	 *
	 * @param IntegrationService $service Lifecycle orchestration.
	 */
	public function __construct( private IntegrationService $service ) {}

	/**
	 * Attach to `admin_post`.
	 */
	public function register(): void {
		add_action( 'admin_post_' . IntegrationRegistry::CALLBACK_ACTION, array( $this, 'handle' ) );
	}

	/**
	 * Handle one provider redirect and send the browser back to the module panel.
	 */
	public function handle(): void {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- The OAuth `state` IS the CSRF token here: a WordPress nonce cannot survive the round trip through the provider's consent screen. It is CSPRNG, single-use, server-bound and verified in IntegrationService::completeConnect().
		$state = isset( $_GET['state'] ) ? sanitize_text_field( wp_unslash( (string) $_GET['state'] ) ) : '';
		$code  = isset( $_GET['code'] ) ? sanitize_text_field( wp_unslash( (string) $_GET['code'] ) ) : '';
		$error = isset( $_GET['error'] ) ? sanitize_key( wp_unslash( (string) $_GET['error'] ) ) : '';
		// phpcs:enable WordPress.Security.NonceVerification.Recommended

		if ( ! is_user_logged_in() || ! current_user_can( Policy::MANAGE_STAFF ) ) {
			$this->finish( '', false, 'forbidden' );
		}

		if ( '' !== $error ) {
			// The provider itself refused (the operator clicked Deny, or the client is misconfigured).
			// PEEK → VERIFY → CONSUME (Codex round 4, P2). The state still has to be spent — a denial
			// must not leave a replayable handshake — but consuming BEFORE comparing the user binding
			// let any admin burn a colleague's in-flight state simply by visiting this callback with
			// an `error` parameter, which reads to that colleague as an unexplained failure.
			$oauth = OAuthState::make();
			$bound = $oauth->peek( $state );
			if ( null !== $bound && 0 !== $bound['user_id'] && get_current_user_id() !== $bound['user_id'] ) {
				$this->finish( '', false, IntegrationService::STATE_INVALID );
			}

			$spent = $oauth->consume( $state );
			$this->finish( null === $spent ? '' : $spent['code'], false, 'denied' );
		}

		if ( '' === $state || '' === $code ) {
			$this->finish( '', false, IntegrationService::STATE_INVALID );
		}

		$module = $this->moduleFromState( $state );

		$result = null;
		try {
			$result = $this->service->completeConnect( $state, $code );
		} catch ( \Throwable $e ) {
			// ONE catch that branches, rather than three: a projection that could not be locked left
			// nothing half-applied and is honestly retryable. {@see CompensationFailed} is a SEPARATE
			// type precisely so it does NOT match here — a rollback that failed leaves a state nobody
			// has verified, and must not be advertised as "try again" (round 4 P1 #2, round 5 #1).
			// Everything else is an internal failure.
			$retryable = $e instanceof ProjectionUnavailable;

			$this->finish( $module, false, $retryable ? 'busy' : 'aponto_internal' );
		}

		if ( ! $result instanceof \Aponto\Integration\ConnectionRef ) {
			$this->finish( $module, false, $result instanceof WP_Error ? $result->get_error_code() : 'aponto_internal' );
		}

		$this->finish( $result->module_code, true, '' );
	}

	/**
	 * Read (and clear) the one-shot notice for the current user.
	 *
	 * @return array{ok: bool, code: string, module: string}|null
	 */
	public static function takeNotice(): ?array {
		$key    = self::NOTICE_PREFIX . get_current_user_id();
		$stored = get_transient( $key );
		if ( ! is_array( $stored ) ) {
			return null;
		}
		delete_transient( $key );

		return array(
			'ok'     => (bool) ( $stored['ok'] ?? false ),
			'code'   => (string) ( $stored['code'] ?? '' ),
			'module' => (string) ( $stored['module'] ?? '' ),
		);
	}

	/**
	 * Peek at the module a state belongs to WITHOUT consuming it, so a failed exchange can still
	 * redirect to the right panel. Returns '' when the state is not readable.
	 *
	 * Deliberately re-reads the transient rather than trusting anything in the request: the module
	 * decides the redirect target, and a forged one would send the operator to a panel they never
	 * opened.
	 *
	 * @param string $state Raw state value.
	 */
	private function moduleFromState( string $state ): string {
		if ( 1 !== preg_match( '/^[a-f0-9]{64}$/', $state ) ) {
			return '';
		}
		$stored = get_transient( 'aponto_oauth_state_' . hash( 'sha256', $state ) );

		return is_array( $stored ) && isset( $stored['code'] ) ? (string) $stored['code'] : '';
	}

	/**
	 * Store the one-shot notice, redirect to the SPA and stop.
	 *
	 * @param string $module Module code (may be empty when the state was unreadable).
	 * @param bool   $ok     Whether the connection succeeded.
	 * @param string $code   Stable failure code, or '' on success.
	 */
	private function finish( string $module, bool $ok, string $code ): void {
		set_transient(
			self::NOTICE_PREFIX . get_current_user_id(),
			array(
				'ok'     => $ok,
				'code'   => $code,
				'module' => $module,
			),
			self::NOTICE_TTL
		);

		$target = admin_url( 'admin.php?page=aponto' );
		if ( '' !== $module ) {
			$target .= '#modules/' . $module;
		}

		wp_safe_redirect( $target );
		exit;
	}
}

<?php
/**
 * Synchronous notification sender (§7).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Notification;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Support\Settings;

/**
 * Sends a rendered notification via `wp_mail` post-commit (§7). A `false` return normalizes to a
 * failed delivery; the P2 `QueuedSender` swaps this behind the same call shape.
 *
 * Sender identity (A2 — U4): the configured `notifications.from_name` / `notifications.from_email`
 * override the WordPress default From, and `notifications.reply_to` sets a Reply-To header. The From
 * filters are added ONLY around Aponto's own `wp_mail` call and removed immediately after (in a
 * `finally`), so mail sent by the theme or other plugins is never touched. An empty setting means
 * "use the WordPress default" — no filter is registered for it.
 */
final class SyncSender {

	/**
	 * Construct the sender.
	 *
	 * @param Settings|null $settings Core settings for the sender identity, or null (WP defaults).
	 */
	public function __construct( private ?Settings $settings = null ) {}

	/**
	 * Send an HTML email under the configured Aponto sender identity.
	 *
	 * @param string $to      Recipient address.
	 * @param string $subject Subject.
	 * @param string $body    HTML body.
	 */
	public function send( string $to, string $subject, string $body ): bool {
		$headers = array( 'Content-Type: text/html; charset=UTF-8' );

		$from_email = $this->setting( 'notifications.from_email' );
		$from_name  = $this->setting( 'notifications.from_name' );
		$reply_to   = $this->setting( 'notifications.reply_to' );

		if ( '' !== $reply_to && false !== is_email( $reply_to ) ) {
			$headers[] = 'Reply-To: ' . $reply_to;
		}

		$filters = $this->addFromFilters( $from_email, $from_name );
		try {
			return (bool) wp_mail( $to, $subject, $body, $headers );
		} finally {
			$this->removeFromFilters( $filters );
		}
	}

	/**
	 * Read and trim one sender setting, or '' when no settings registry is wired.
	 *
	 * @param string $key Dotted setting key.
	 */
	private function setting( string $key ): string {
		if ( null === $this->settings ) {
			return '';
		}

		return trim( (string) $this->settings->get( $key ) );
	}

	/**
	 * Register the From filters for THIS send only, returning the callables to remove afterward.
	 * A valid `from_email` sets `wp_mail_from`; a non-empty `from_name` sets `wp_mail_from_name`.
	 *
	 * @param string $from_email Configured From address ('' = WP default).
	 * @param string $from_name  Configured From name ('' = WP default).
	 * @return array<string, callable> Filter name => callable, for removal.
	 */
	private function addFromFilters( string $from_email, string $from_name ): array {
		$filters = array();

		if ( '' !== $from_email && false !== is_email( $from_email ) ) {
			$filters['wp_mail_from'] = static fn (): string => $from_email;
		}
		if ( '' !== $from_name ) {
			$filters['wp_mail_from_name'] = static fn (): string => $from_name;
		}

		foreach ( $filters as $hook => $callback ) {
			// Late priority so an explicit site override still wins if one is registered later.
			add_filter( $hook, $callback, 99 );
		}

		return $filters;
	}

	/**
	 * Remove the per-send From filters at the same priority they were added.
	 *
	 * @param array<string, callable> $filters Filter name => callable map.
	 */
	private function removeFromFilters( array $filters ): void {
		foreach ( $filters as $hook => $callback ) {
			remove_filter( $hook, $callback, 99 );
		}
	}
}

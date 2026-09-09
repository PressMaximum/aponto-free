<?php
/**
 * Template placeholder rendering (SPEC-P1 §3.3).
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

/**
 * Renders the whitelisted placeholders (SPEC-P1 §3.3) into a template. Only the whitelist is
 * substituted; any other `{token}` is left literally. Subjects strip CR/LF (header-injection safe);
 * bodies escape text values with `esc_html`, build link values with `esc_url`, and emit minimal HTML
 * (`nl2br`).
 *
 * Body rendering is line-aware with an EXPLICIT optional-line contract (Codex review item 3): a
 * whole line is dropped only when it contains at least one placeholder from
 * {@see self::OPTIONAL_LINE_KEYS} — the conditional link/reason placeholders — and EVERY optional
 * placeholder on that line resolves to empty, while the line carries NO other placeholder. So a
 * dangling label such as "Manage your booking: {manage_link}" (a status email carries no token —
 * NB-4) or "Reason: {cancel_reason}" (no reason given) disappears cleanly, but a line built around
 * a regular placeholder — e.g. "Thank you {customer_name}" with an empty name — is NEVER dropped:
 * static copy outside the optional set always renders.
 */
final class Placeholders {

	/**
	 * The whitelisted placeholder keys (SPEC-P1 §3.3).
	 *
	 * @var list<string>
	 */
	public const WHITELIST = array(
		'customer_name',
		'customer_email',
		'customer_phone',
		'service_name',
		'staff_name',
		'booking_date',
		'booking_time',
		'booking_end_time',
		'booking_timezone',
		'business_name',
		'business_address',
		'business_phone',
		'site_name',
		'booking_status',
		'order_code',
		'cancel_reason',
		'manage_link',
		'cancel_link',
		'ics_link',
		// The public booking page permalink for the "Book again" CTA (A4 re-book): empty when the
		// site has no booking page configured, so its line self-strips (see OPTIONAL_LINE_KEYS).
		'booking_page_link',
		// Payments (D-R38). `{payment_status}` renders a LOCALIZED label, never the raw enum — a
		// customer should not read the word "partial" out of a database column. The four money
		// placeholders are major units with the currency code, formatted through the one ISO
		// exponent source; `{payment_deadline}` renders in the customer's display timezone through
		// the single formatter (D1 = A′), because a deadline printed in the wrong zone is worse
		// than no deadline at all.
		'payment_status',
		'amount_paid',
		'amount_due',
		'refund_amount',
		'payment_deadline',
		// The booking page + `#aponto_resume={token}` (the FRAGMENT — D-R39c, Codex A.10; a query
		// string would put a capability token in every access log) — the ONE link in a payment
		// reminder that can
		// actually take the payment. Empty when the site has no published booking page, and an
		// optional-line key, so the line removes itself rather than pointing at nothing.
		'payment_link',
	);

	/**
	 * Placeholder keys whose values are URLs (escaped with `esc_url`, not `esc_html`). Public so the
	 * admin boot-data contract ({@see \Aponto\Admin\NotificationsPage::bootData()}) styles the same
	 * URL chips the renderer treats as links, without duplicating the list.
	 *
	 * @var list<string>
	 */
	public const URL_KEYS = array( 'manage_link', 'cancel_link', 'ics_link', 'booking_page_link', 'payment_link' );

	/**
	 * The ONLY placeholders whose emptiness may remove a body line (explicit opt-in list — Codex
	 * review item 3): the token links (absent on every status email, NB-4), the booking-page link
	 * (absent until a booking page is configured — A4), the cancellation reason (absent unless the
	 * cancel carried one) and the customer phone (optional field, so the admin "Phone:
	 * {customer_phone}" line self-strips instead of rendering an empty label — fleet-r1 Fix 9a).
	 * Every other placeholder renders in place even when empty, so meaningful static copy around it
	 * is never lost.
	 *
	 * Public for the same reason {@see self::URL_KEYS} is: an editor that lets someone write template
	 * copy has to be able to TELL them which placeholders take their whole line with them when they
	 * resolve empty, and deriving that from the renderer's own list is the only way the advice cannot
	 * drift from the behaviour.
	 *
	 * @var list<string>
	 */
	public const OPTIONAL_LINE_KEYS = array( 'cancel_reason', 'manage_link', 'cancel_link', 'ics_link', 'booking_page_link', 'customer_phone', 'payment_deadline', 'payment_link' );

	/**
	 * Render a subject line: raw substitution + CR/LF stripped.
	 *
	 * @param string                $template Subject template.
	 * @param array<string, string> $context  Placeholder values.
	 */
	public static function renderSubject( string $template, array $context ): string {
		$out = $template;
		foreach ( self::WHITELIST as $key ) {
			$out = str_replace( '{' . $key . '}', $context[ $key ] ?? '', $out );
		}

		return trim( str_replace( array( "\r", "\n" ), ' ', $out ) );
	}

	/**
	 * Render an HTML body: escaped values + `nl2br`, dropping any line whose whitelisted
	 * placeholders all resolve to empty (see the class doc).
	 *
	 * @param string                $template Body template (plain text).
	 * @param array<string, string> $context  Placeholder values.
	 */
	public static function renderBody( string $template, array $context ): string {
		$kept = array();
		foreach ( explode( "\n", $template ) as $line ) {
			if ( self::lineDrops( $line, $context ) ) {
				continue;
			}
			$kept[] = self::substituteLine( $line, $context );
		}

		return nl2br( implode( "\n", $kept ), false );
	}

	/**
	 * Whether a body line should be removed entirely (explicit optional-line contract): the line
	 * carries at least one {@see self::OPTIONAL_LINE_KEYS} placeholder, ALL of its optional
	 * placeholders resolve to empty, and it carries NO placeholder outside the optional set. A
	 * line with any regular placeholder — whatever its value — or with no placeholders at all is
	 * always kept.
	 *
	 * @param string                $line    Raw template line (may keep a trailing CR).
	 * @param array<string, string> $context Placeholder values.
	 */
	private static function lineDrops( string $line, array $context ): bool {
		$has_optional = false;
		foreach ( self::WHITELIST as $key ) {
			if ( ! str_contains( $line, '{' . $key . '}' ) ) {
				continue;
			}
			if ( ! in_array( $key, self::OPTIONAL_LINE_KEYS, true ) ) {
				return false; // A regular placeholder anchors the line — never drop it.
			}
			$has_optional = true;
			if ( '' !== (string) ( $context[ $key ] ?? '' ) ) {
				return false; // An optional placeholder resolved — the line has content.
			}
		}

		return $has_optional;
	}

	/**
	 * Substitute the whitelisted placeholders in a single line (URL vs text escaping).
	 *
	 * @param string                $line    Template line.
	 * @param array<string, string> $context Placeholder values.
	 */
	private static function substituteLine( string $line, array $context ): string {
		foreach ( self::WHITELIST as $key ) {
			$value       = $context[ $key ] ?? '';
			$replacement = in_array( $key, self::URL_KEYS, true ) ? esc_url( $value ) : esc_html( $value );
			$line        = str_replace( '{' . $key . '}', $replacement, $line );
		}

		return $line;
	}
}

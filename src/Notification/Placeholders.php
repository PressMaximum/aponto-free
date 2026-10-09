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
		// The stored name parts (name split, founder 2026-10-01, D-R69). `{customer_name}` /
		// `{staff_name}` stay the composed display name; the default customer and staff
		// greetings use the first name (N4). Regular keys, NOT optional-line keys: a line
		// built around a name always renders.
		'customer_first_name',
		'customer_last_name',
		'customer_email',
		'customer_phone',
		'service_name',
		'staff_name',
		'staff_first_name',
		'staff_last_name',
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
		'order_total',
		'deposit_amount',
		'balance_due',
		'payment_summary',
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
		// The booking's own location (persona QA 2026-10-05, T-057): the branch NAME when the
		// booking has a real branch, and its address (the business address when it has none — the
		// same value `{business_address}` resolves to). Both are optional-line keys, so a
		// "Location: {location_name}" line removes itself on a site with no branches.
		'location_name',
		'location_address',
		// The booking in wp-admin (persona QA 2026-10-05, T-060). Resolved for the admin and staff
		// audience only — a customer email never carries a wp-admin URL — and an optional-line key.
		'admin_booking_link',
		// What a cancellation means for the money, or why the system released the slot (persona QA
		// 2026-10-05, T-056 / T-054). Empty for every other mail. A cancellation mail whose
		// template does not place it gets the note appended as its last paragraph
		// ({@see NotificationDispatcher}), so the sentence about a payment can never be edited out
		// by accident; a template that places it decides where it goes.
		'cancel_note',
	);

	/**
	 * Placeholder keys whose values are URLs (escaped with `esc_url`, not `esc_html`). Public so the
	 * admin boot-data contract ({@see \Aponto\Admin\NotificationsPage::bootData()}) styles the same
	 * URL chips the renderer treats as links, without duplicating the list.
	 *
	 * @var list<string>
	 */
	public const URL_KEYS = array( 'manage_link', 'cancel_link', 'ics_link', 'booking_page_link', 'payment_link', 'admin_booking_link' );

	/**
	 * The ONLY placeholders whose emptiness may remove a body line (explicit opt-in list — Codex
	 * review item 3): the token links (absent on every status email, NB-4), the booking-page link
	 * (absent until a booking page is configured — A4), the cancellation reason (absent unless the
	 * cancel carried one) and the customer phone (optional field, so the admin "Phone:
	 * {customer_phone}" line self-strips instead of rendering an empty label — fleet-r1 Fix 9a).
	 * Every other placeholder renders in place even when empty, so meaningful static copy around it
	 * is never lost.
	 *
	 * `amount_due` joined the list with T-024 (persona QA 2026-10-05): it resolves empty while the
	 * amount is not one core can vouch for (an external checkout that has not priced the order
	 * yet), and "Amount due: " with nothing after it is worse than no line.
	 *
	 * Public for the same reason {@see self::URL_KEYS} is: an editor that lets someone write template
	 * copy has to be able to TELL them which placeholders take their whole line with them when they
	 * resolve empty, and deriving that from the renderer's own list is the only way the advice cannot
	 * drift from the behaviour.
	 *
	 * @var list<string>
	 */
	public const OPTIONAL_LINE_KEYS = array( 'cancel_reason', 'manage_link', 'cancel_link', 'ics_link', 'booking_page_link', 'customer_phone', 'payment_deadline', 'payment_link', 'amount_due', 'location_name', 'location_address', 'admin_booking_link', 'cancel_note', 'payment_summary', 'deposit_amount' );

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
		// Whether a line was dropped since the last line with content. A dropped line that stood
		// alone as a paragraph leaves the blank lines that framed it meeting each other — on a site
		// with no booking page, "…\n\nBook again: {booking_page_link}\n\n{business_name}" became a
		// stray empty line in the cancellation mail (first-run QA D27). Only a gap a DROP created
		// is collapsed; blank lines the author typed are kept as written.
		$dropped = false;
		foreach ( explode( "\n", $template ) as $line ) {
			if ( self::lineDrops( $line, $context ) ) {
				$dropped = true;
				continue;
			}
			$blank = '' === trim( $line );
			if ( $blank && $dropped && ( array() === $kept || '' === trim( (string) end( $kept ) ) ) ) {
				continue;
			}
			if ( ! $blank ) {
				$dropped = false;
			}
			$kept[] = self::substituteLine( $line, $context );
		}
		// A drop at the very end must not leave the body ending on a break.
		while ( $dropped && array() !== $kept && '' === trim( (string) end( $kept ) ) ) {
			array_pop( $kept );
		}

		return nl2br( implode( "\n", $kept ), false );
	}

	/**
	 * Append one plain-text paragraph to an already rendered body (escaped like every other value).
	 * An empty paragraph changes nothing.
	 *
	 * @param string $body Rendered HTML body.
	 * @param string $text Plain text to append.
	 */
	public static function appendParagraph( string $body, string $text ): string {
		$text = trim( $text );
		if ( '' === $text ) {
			return $body;
		}

		return $body . "<br>\n<br>\n" . esc_html( $text );
	}

	/**
	 * A body TEMPLATE with one extra line placed before its sign-off, or null when the template has
	 * no sign-off this can recognise (persona QA 2026-10-05, re-test N5 / R7).
	 *
	 * The cancellation note was appended after everything, so it landed under the business name the
	 * mail is signed with. Every default customer template ends with a line that is exactly
	 * `{business_name}`; that line — or `{site_name}` — as the last non-blank line is the sign-off.
	 * Two shapes are recognised: the name alone after a blank line, and the name directly under ONE
	 * closing line ("Thanks," / name). The new line goes before that block, followed by a blank
	 * line. Anything else (no such last line, a name that closes a longer paragraph, a body that is
	 * only the sign-off) answers null and the caller keeps appending last.
	 *
	 * Works on the template text, before rendering, so the inserted line is substituted, escaped
	 * and line-dropped by {@see self::renderBody()} like any line the author wrote.
	 *
	 * @param string $template Body template (plain text).
	 * @param string $line     The line to insert, e.g. `{cancel_note}`.
	 */
	public static function insertBeforeSignature( string $template, string $line ): ?string {
		$lines = explode( "\n", $template );
		$last  = count( $lines ) - 1;
		while ( $last >= 0 && '' === trim( $lines[ $last ] ) ) {
			--$last;
		}
		if ( $last < 1 || ! in_array( trim( $lines[ $last ] ), array( '{business_name}', '{site_name}' ), true ) ) {
			return null;
		}

		$start = $last;
		if ( '' !== trim( $lines[ $last - 1 ] ) ) {
			// "Thanks," directly above the name: the sign-off is those two lines — but only when a
			// blank line sets them apart from the body.
			if ( $last < 3 || '' !== trim( $lines[ $last - 2 ] ) ) {
				return null;
			}
			$start = $last - 1;
		} elseif ( $last < 2 ) {
			return null;
		}

		array_splice( $lines, $start, 0, array( $line, '' ) );

		return implode( "\n", $lines );
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

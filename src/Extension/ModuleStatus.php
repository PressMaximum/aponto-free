<?php
/**
 * The generic module readiness seam (`aponto_module_status_{code}`, extension-surface §5.1).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Extension;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Plan;

/**
 * ONE question, asked of any module, in one shape: "can you do your job right now, and if not, what
 * is the machine reason?" (D-R40b).
 *
 * It exists because the alternative was the client inferring it. A settings panel could see which
 * fields had values and nothing else, so a gateway with perfect credentials on a site whose
 * currency that gateway does not accept reported "Ready" while the server never offered it on the booking
 * form (Codex #14) — and a webhook id left over from the other environment reported "Ready · Live"
 * while every event failed verification (Codex #4). Both facts are knowable ONLY on the server: one
 * lives in a general setting on a different screen, the other in a stamp the module writes. The
 * panel's job is to render an answer, not to derive one.
 *
 * Not a payment concept and deliberately not in `Aponto\Payments`: a calendar connector whose token
 * has been revoked has exactly the same thing to say, and giving each category its own vocabulary
 * would mean every screen learning a second set of words.
 *
 * ### Shape
 *
 * A callback returns `array{ready: bool, reason: ?string, message?: string, warnings?: list<string>,
 * webhook_url?: string, webhook_events?: list<string>}`, or leaves the initial `null` alone to say "I do not answer this",
 * in which case core omits the field entirely rather than inventing a `false`. "Not ready" and "did
 * not answer" are different claims, and only the first one belongs on a screen.
 *
 * `reason` is a CLOSED vocabulary ({@see self::REASONS}) for the same reason
 * `PaymentOutcome::FAILURE_CODES` is: it is what a UI branches on, so it has to be stable and
 * translation-free. An unrecognised value folds to `not_configured` — the term that is true of every
 * module that cannot work and has not said why.
 *
 * `message` is the human half of the same answer, and it is optional because not every module has
 * more to say than its token. It exists because the vocabulary is closed and the module set is not:
 * a panel meeting a token it has no copy for should still be able to tell its owner something, so it
 * renders this rather than falling silent. Stable English through `__()`, bounded, and never
 * provider prose or PII — the rule the payment drivers already follow for `POST /modules/{code}/test`.
 *
 * `warnings` is optional and NON-BLOCKING (2026-10-03): sentences about a module that IS ready but
 * whose owner should still act — a dependency setting that will hurt later, say. It never changes
 * `ready` or `reason`; a panel renders each entry as an ordinary warning notice. Same rules as
 * `message`: stable English through `__()`, bounded, sanitized, never provider prose or PII.
 *
 * `webhook_url` and `webhook_events` are optional and exist because a module owner has to type them
 * into a third-party dashboard by hand. The URL is built server-side with `rest_url()` and never
 * from the admin browser's own origin, which is a different host whenever WordPress sits behind a
 * reverse proxy or answers on an internal domain (Codex #18); the event list comes from the driver
 * because the driver's mapper is the only place that knows what it maps, and a copy kept in the
 * panel drifts silently — losing exactly the money that arrives after the tab is closed (Codex #3).
 */
final class ModuleStatus {

	/**
	 * The closed `reason` vocabulary (extension-surface §5.1).
	 *
	 * - `module_inactive` — switched off, unshipped, or not in this edition.
	 * - `not_configured` — a required credential is missing, or a stored secret no longer opens.
	 * - `unsupported_currency` — the site's currency is one this module cannot transact in.
	 *
	 * `webhook_environment_mismatch` was the fourth term between D-R40b and D-R40f (the same day) and
	 * is RETIRED. It existed for one module and one shape: `payments_paypal` held a single
	 * `webhook_id` for both PayPal environments, so a provenance stamp was the only record of which
	 * one had minted it. Now that the module stores a credential set per mode, a webhook id lives
	 * inside the set of its own environment by construction and the disagreement is no longer
	 * expressible — leaving the token here would be a closed vocabulary nothing can ever emit.
	 * Removing a term is a SUBTRACTIVE change and safe in the right direction: an older panel simply
	 * never meets it again, and this class already folds an unrecognised value to
	 * {@see self::REASON_DEFAULT}.
	 *
	 * @var list<string>
	 */
	public const REASONS = array(
		'module_inactive',
		'not_configured',
		'unsupported_currency',
	);

	/**
	 * The reason a module with nothing better to say reports.
	 */
	public const REASON_DEFAULT = 'not_configured';

	/**
	 * Maximum characters accepted for `webhook_url`.
	 */
	private const MAX_URL = 512;

	/**
	 * Maximum characters accepted for `message`.
	 */
	private const MAX_MESSAGE = 400;

	/**
	 * Maximum entries accepted in `warnings`.
	 */
	private const MAX_WARNINGS = 5;

	/**
	 * Maximum entries accepted in `webhook_events`.
	 */
	private const MAX_EVENTS = 40;

	/**
	 * Maximum characters accepted per event name.
	 */
	private const MAX_EVENT_LENGTH = 128;

	/**
	 * Ask one module for its status, or null when it does not answer.
	 *
	 * ALLOW-LISTED BEFORE INTERPOLATION, like every dynamic hook in this codebase (§1): the code
	 * comes from a URL segment on the settings route, and a hook name is the last place an
	 * unfiltered one may reach. A code absent from the registry answers `null` here and never
	 * produces a `do_action`-shaped string at all.
	 *
	 * @param string $code Module code.
	 * @return array{ready: bool, reason: ?string, message?: string, warnings?: list<string>, webhook_url?: string, webhook_events?: list<string>}|null
	 */
	public static function forModule( string $code ): ?array {
		if ( 1 !== preg_match( '/^[a-z0-9_]+$/', $code ) || ! isset( Plan::FEATURES[ $code ] ) ) {
			return null;
		}

		/**
		 * Filter a module's readiness for the settings screen (extension-surface §5.1).
		 *
		 * @param array<string, mixed>|null $status Status so far (initial `null` = no answer).
		 * @param string                    $code   Module code being asked about.
		 */
		$status = apply_filters( 'aponto_module_status_' . $code, null, $code ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound -- Prefixed `aponto_module_status_` and built only for a code present in the registry, checked on the line above; the sniff cannot see through the guard.

		return is_array( $status ) ? self::normalize( $status ) : null;
	}

	/**
	 * Just the `ready` flag, for the Modules card projection (`null` when nothing answered).
	 *
	 * @param string $code Module code.
	 */
	public static function readyFlag( string $code ): ?bool {
		$status = self::forModule( $code );

		return null === $status ? null : $status['ready'];
	}

	/**
	 * Coerce a driver's answer into the shape core is willing to publish.
	 *
	 * Same drop-don't-throw policy as `PaymentRegistry::clientConfig()`: one malformed field costs
	 * that field, never the screen. The bounds matter because this map reaches an admin page — a URL
	 * a module could make arbitrarily long, or an event list it could make arbitrarily large, is a
	 * rendering problem the panel should not have to defend against.
	 *
	 * @param array<string, mixed> $status Raw status from the module.
	 * @return array{ready: bool, reason: ?string, message?: string, warnings?: list<string>, webhook_url?: string, webhook_events?: list<string>}
	 */
	private static function normalize( array $status ): array {
		$ready = ! empty( $status['ready'] );

		// A READY module has no reason, whatever it said: the two together are a contradiction, and
		// the panel would have to decide which half to believe.
		$reason = null;
		if ( ! $ready ) {
			$raw    = isset( $status['reason'] ) && is_string( $status['reason'] ) ? strtolower( trim( $status['reason'] ) ) : '';
			$reason = in_array( $raw, self::REASONS, true ) ? $raw : self::REASON_DEFAULT;
		}

		$out = array(
			'ready'  => $ready,
			'reason' => $reason,
		);

		// Sanitized, not just bounded: this string is rendered on an admin screen, and a module is
		// free to build it from its own settings. `sanitize_text_field()` also collapses the newlines
		// and control characters a pasted value could carry into it.
		$message = isset( $status['message'] ) && is_string( $status['message'] ) ? sanitize_text_field( $status['message'] ) : '';
		if ( '' !== $message ) {
			$out['message'] = mb_substr( $message, 0, self::MAX_MESSAGE );
		}

		// Non-blocking warnings: the same sanitizing and bound as `message`, and a short list.
		$warnings = array();
		foreach ( isset( $status['warnings'] ) && is_array( $status['warnings'] ) ? $status['warnings'] : array() as $warning ) {
			if ( count( $warnings ) >= self::MAX_WARNINGS ) {
				break;
			}
			$warning = is_string( $warning ) ? sanitize_text_field( $warning ) : '';
			if ( '' !== $warning ) {
				$warnings[] = mb_substr( $warning, 0, self::MAX_MESSAGE );
			}
		}
		if ( array() !== $warnings ) {
			$out['warnings'] = $warnings;
		}

		$url = isset( $status['webhook_url'] ) && is_string( $status['webhook_url'] ) ? trim( $status['webhook_url'] ) : '';
		if ( '' !== $url && strlen( $url ) <= self::MAX_URL && 1 === preg_match( '#^https?://#i', $url ) ) {
			$out['webhook_url'] = $url;
		}

		$events = isset( $status['webhook_events'] ) && is_array( $status['webhook_events'] ) ? $status['webhook_events'] : array();
		$names  = array();
		foreach ( $events as $event ) {
			if ( count( $names ) >= self::MAX_EVENTS ) {
				break;
			}
			if ( ! is_string( $event ) ) {
				continue;
			}
			$event = trim( $event );
			if ( '' !== $event && strlen( $event ) <= self::MAX_EVENT_LENGTH && 1 === preg_match( '/^[A-Za-z0-9._-]+$/', $event ) ) {
				$names[] = $event;
			}
		}
		if ( array() !== $names ) {
			$out['webhook_events'] = $names;
		}

		return $out;
	}
}

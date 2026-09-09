<?php
/**
 * Durable manage-token derivation (D-R26).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Booking;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Support\Clock;
use Aponto\Support\Crypto;
use Aponto\Support\DatabaseEngine;
use Aponto\Support\Logger;
use Aponto\Support\Settings;

/**
 * Owns the site's manage-token DERIVATION SECRET and rebuilds a booking's durable manage token
 * from it (D-R26, founder-directed 2026-08-02 after competitor research: LatePoint/Amelia put a
 * working manage link in every customer email, and Aponto's D-R25 could only put it in the first).
 *
 * WHY A SECRET AND NOT A STORED TOKEN. §5 invariant 8 says the raw token is never at rest — only
 * `sha256(raw)`. Storing the token encrypted would satisfy the letter and lose the point. Instead
 * the token is a pure FUNCTION of the booking's identity under a site secret:
 * `raw = base64url(HMAC-SHA256(secret, "{booking_id}|{created_at}"))`. The database still holds
 * only the hash; a DB dump alone yields nothing, because the secret is not derivable from it.
 *
 * SECRET MANAGEMENT — mirrors {@see Crypto}'s posture, with one deliberate difference. Like the
 * mail cipher, everything ultimately hangs off `SECURE_AUTH_KEY` (wp-config, NOT the database), and
 * a missing/placeholder key degrades honestly instead of falling back to a source-code-known value
 * (REST-7 / D-R15). Unlike the mail cipher, the material here is a DEDICATED 32-byte CSPRNG secret
 * minted once at install/first use and kept SEALED under its own crypto domain
 * (`aponto-manage-token-secret`) in {@see self::SECRET_OPTION}. It is purpose-bound on purpose:
 *
 *   - It can be rotated (delete the option) without touching mail crypto or re-keying anything
 *     else. A shared key could not offer that — the same action would make every queued delivery
 *     payload unreadable.
 *   - The blast radius of a leak is scoped to manage links, not to the mail payloads that carry
 *     customer PII.
 *
 * WHAT ROTATING THE SECRET DOES — AND DOES NOT — DO. Token lookup is a pure hash match
 * (`findByTokenHash`) and never consults the secret, so deleting the option does NOT invalidate
 * URLs that were already issued: those keep resolving, because their hash is still the one stored
 * on the row. What it stops is FUTURE re-derivation — emails degrade to the legacy path
 * (first-email link only) for every existing booking, while new bookings anchor to the new secret.
 * Revoking an ISSUED link is a different operation with two existing paths: privacy erasure blanks
 * `token_hash` (the link 404s), and cancellation makes the page read-only. A lookup-time derivation
 * check would be the only way to make rotation revoke issued links, and it is deliberately NOT
 * implemented — it would 404 every legacy pre-D-R26 booking, whose hash no derivation reproduces.
 *
 * Two failure modes, neither of which may produce a weaker token:
 *
 *   - NO USABLE `SECURE_AUTH_KEY`: the secret can be neither sealed nor opened, so
 *     {@see self::secret()} returns '' and creation falls back to a CSPRNG token — D-R25 behaviour
 *     (first-email link only, later emails self-strip). Nothing this plugin can do fixes it.
 *   - `SECURE_AUTH_KEY` CHANGED after the secret was sealed: the stored secret no longer opens, so
 *     {@see self::secret()} returns '' and the runtime degrades to D-R25 exactly as before.
 *     Already-sent links keep working (their hash is untouched); re-derivation for EXISTING bookings
 *     is lost, and it was lost before anything noticed. What D-R39d adds is that the site no longer
 *     degrades SILENTLY and PERMANENTLY: {@see self::diagnose()} names the condition, the
 *     `aponto_manage_token_secret` Site Health test reports it, and {@see self::repair()} — run by an
 *     administrator through `wp aponto fixer` — seals a fresh secret so future bookings get durable
 *     links again, setting the unopenable blob aside in {@see self::PREVIOUS_OPTION}.
 *
 *     THE REPAIR IS ADMINISTRATIVE ON PURPOSE. Doing it from runtime traffic breaks a multi-node
 *     deployment whose nodes hold different but usable keys: each node opens only its own blob, so
 *     every request rotates the shared option and its neighbour rotates it back. A running request
 *     cannot tell that apart from a deliberate key change; a person running a repair command can.
 *
 * `created_at` IS PART OF THE TOKEN'S IDENTITY — treat the column as IMMUTABLE. Nothing in the
 * shipped write model ever updates it (the engine sets it once at insert), and nothing may start:
 * rewriting a booking's `created_at` changes its derived token, so the stored hash stops matching
 * and that customer's manage link silently degrades to the legacy path forever. A fixture, import
 * or repair script that backdates a booking must re-anchor `token_hash` in the same breath (derive
 * from the NEW value and store its hash) or knowingly accept a dead link for that row. The
 * derivation input is always the value the DATABASE holds — {@see \Aponto\Booking\Repository\BookingRepository::storedCreatedAt()}
 * explains why it is read back rather than assumed.
 *
 * LEGACY BOOKINGS. Rows created before D-R26 hold a random hash that no derivation can reproduce.
 * {@see self::rawFor()} therefore always VERIFIES — derive, hash, compare to the stored
 * `token_hash` — and returns null on mismatch. No migration, no rewriting stored hashes: a legacy
 * booking simply keeps D-R25 behaviour for the rest of its life. The same comparison is what makes
 * an ERASED booking render no link at all: {@see \Aponto\Privacy\Anonymizer} replaces `token_hash`
 * with fresh random bytes, so the derived hash can never match again.
 */
final class ManageToken {

	/**
	 * Option holding the SEALED derivation secret (autoload off — read only on the email/booking
	 * paths, never on a plain page view).
	 */
	public const SECRET_OPTION = 'aponto_manage_token_secret';

	/**
	 * Where a secret that no longer opens is SET ASIDE when the self-heal replaces it (D-R39d).
	 *
	 * Written insert-if-absent, so it always holds the FIRST blob displaced on this site and a second
	 * rotation cannot bury the original. Nothing in the plugin reads it: it exists so that an operator
	 * who restores the `SECURE_AUTH_KEY` this blob was sealed under still has the material to recover
	 * pre-rotation derivation by hand. Rotating is then non-destructive, which is what makes doing it
	 * automatically defensible.
	 */
	public const PREVIOUS_OPTION = 'aponto_manage_token_secret_prev';

	/**
	 * Unix timestamp of the last self-heal, so Site Health can say so (D-R39d).
	 */
	public const ROTATED_OPTION = 'aponto_manage_token_secret_rotated_at';

	/**
	 * {@see self::diagnose()}: derivation works.
	 */
	public const STATE_OK = 'ok';

	/**
	 * {@see self::diagnose()}: no usable `SECURE_AUTH_KEY` (REST-7) — nothing can be sealed at all.
	 */
	public const STATE_NO_KEY = 'no_key';

	/**
	 * {@see self::diagnose()}: usable key, no secret stored yet. The next booking mints one.
	 */
	public const STATE_UNMINTED = 'unminted';

	/**
	 * {@see self::diagnose()}: a secret is stored and does NOT open under this site's key.
	 */
	public const STATE_UNOPENABLE = 'unopenable';

	/**
	 * {@see self::repair()}: there was nothing to repair.
	 */
	public const REPAIR_OK = 'ok';

	/**
	 * {@see self::repair()}: an unopenable secret was replaced.
	 */
	public const REPAIR_ROTATED = 'rotated';

	/**
	 * {@see self::repair()}: no usable `SECURE_AUTH_KEY`, so nothing can be sealed at all (REST-7).
	 */
	public const REPAIR_NO_KEY = 'no_key';

	/**
	 * {@see self::repair()}: the replacement could not be sealed or stored.
	 */
	public const REPAIR_FAILED = 'failed';

	/**
	 * Crypto domain separating this secret from every other sealed value (`aponto-mail`,
	 * `aponto-module-secret`). A blob sealed here can never be opened elsewhere.
	 */
	private const DOMAIN = 'aponto-manage-token-secret';

	/**
	 * Secret length in raw bytes (256-bit MAC key).
	 */
	private const SECRET_BYTES = 32;

	/**
	 * Memoised per request: '' = resolved-and-unavailable, null = not resolved yet.
	 *
	 * @var string|null
	 */
	private ?string $secret = null;

	/**
	 * Whether THIS request has already self-healed. One rotation per request, always (D-R39d).
	 *
	 * @var bool
	 */
	private bool $resealed = false;

	/**
	 * Construct the resolver.
	 *
	 * @param \wpdb          $wpdb     Database handle (single-winner claim of the secret row).
	 * @param TokenGenerator $tokens   Token generator (derivation + hashing).
	 * @param string|null    $auth_key Key material override (tests); null reads SECURE_AUTH_KEY.
	 * @param Clock|null     $clock    Clock (tests); null builds the default.
	 * @param Logger|null    $logger   Operational logger (tests); null builds the default.
	 */
	public function __construct(
		private \wpdb $wpdb,
		private TokenGenerator $tokens,
		private ?string $auth_key = null,
		private ?Clock $clock = null,
		private ?Logger $logger = null
	) {}

	/**
	 * What state this site's derivation secret is in, WITHOUT minting, rotating or writing anything
	 * (D-R39d). Site Health's read; every writing path goes through {@see self::secret()}.
	 *
	 * @return string One of the `STATE_*` constants.
	 */
	public function diagnose(): string {
		$key = $this->auth_key ?? ( defined( 'SECURE_AUTH_KEY' ) ? (string) SECURE_AUTH_KEY : '' );
		if ( ! Crypto::isUsableKeyMaterial( $key ) ) {
			return self::STATE_NO_KEY;
		}

		$opened = $this->openStored( new Crypto( $key ) );
		if ( null === $opened ) {
			return self::STATE_UNMINTED;
		}

		return '' === $opened ? self::STATE_UNOPENABLE : self::STATE_OK;
	}

	/**
	 * When the last repair rotated the secret, or 0 (D-R39d).
	 */
	public function rotatedAt(): int {
		return (int) get_option( self::ROTATED_OPTION, 0 );
	}

	/**
	 * ADMINISTRATIVE repair: replace a derivation secret that no longer opens (D-R39d).
	 *
	 * The one caller is `wp aponto fixer` ({@see \Aponto\Cli\Fixer}), and the surface matters as much
	 * as the operation. Rotating from RUNTIME traffic looked attractive — the failure is invisible and
	 * the fix is mechanical — but it is unsafe on a multi-node deployment whose nodes hold different
	 * but individually usable `SECURE_AUTH_KEY`s: each node opens only its own blob, so every request
	 * rotates the shared option and the other node rotates it back, forever. No runtime request can
	 * distinguish "the site's key was changed on purpose" from "this fleet is inconsistent"; an
	 * administrator running a repair command has already made that judgement, and runs it once.
	 *
	 * Idempotent by construction: a healthy secret, an unminted one and a site with no usable key
	 * material all return without writing, so running the fixer twice rotates once.
	 *
	 * @return string One of the `REPAIR_*` constants.
	 */
	public function repair(): string {
		$key = $this->auth_key ?? ( defined( 'SECURE_AUTH_KEY' ) ? (string) SECURE_AUTH_KEY : '' );
		if ( ! Crypto::isUsableKeyMaterial( $key ) ) {
			return self::REPAIR_NO_KEY;
		}

		$crypto = new Crypto( $key );
		if ( self::STATE_UNOPENABLE !== $this->diagnose() ) {
			// Healthy, or unminted — and minting is the booking path's job, not a repair's. Nothing
			// here may write, or `wp aponto fixer` on a quiet site would start creating secrets.
			return self::REPAIR_OK;
		}

		$secret = $this->reseal( $crypto );
		if ( '' === $secret ) {
			return self::REPAIR_FAILED;
		}

		// The memo is dropped so anything holding this instance resolves the NEW secret.
		$this->secret = $secret;

		return self::REPAIR_ROTATED;
	}

	/**
	 * Whether durable derivation is available on this site at all (a usable key + a secret that
	 * could be minted or opened). False means honest degrade to D-R25 behaviour.
	 */
	public function available(): bool {
		return '' !== (string) $this->secret();
	}

	/**
	 * The raw durable token for a booking, or null when it cannot be produced.
	 *
	 * Null covers every honest-degrade case: no derivation secret (no usable `SECURE_AUTH_KEY`, or
	 * the secret no longer opens after a salt rotation), a LEGACY booking whose stored hash predates
	 * D-R26, and an ERASED booking whose hash the Anonymizer replaced. Callers render the link only
	 * when this returns a string, so a link is never shown that would not resolve.
	 *
	 * @param int    $booking_id Booking id.
	 * @param string $created_at Booking `created_at` exactly as stored.
	 * @param string $token_hash The booking's stored `token_hash` to verify against.
	 */
	public function rawFor( int $booking_id, string $created_at, string $token_hash ): ?string {
		if ( $booking_id <= 0 || '' === $created_at || '' === $token_hash ) {
			return null;
		}

		$raw = $this->derive( $booking_id, $created_at );
		if ( null === $raw ) {
			return null;
		}

		// hash_equals: the comparison is against a stored hash, so keep it timing-safe on principle
		// even though both sides are already digests.
		return hash_equals( $token_hash, $this->tokens->hash( $raw ) ) ? $raw : null;
	}

	/**
	 * Derive a booking's token WITHOUT verifying it against the stored hash. Used by the creation
	 * path, which is the one caller that legitimately has no hash to compare against yet — it is
	 * about to persist the hash of exactly this value.
	 *
	 * @param int    $booking_id Booking id.
	 * @param string $created_at Booking `created_at` exactly as stored.
	 */
	public function derive( int $booking_id, string $created_at ): ?string {
		$secret = $this->secret();
		if ( '' === $secret ) {
			return null;
		}

		return $this->tokens->derive( $secret, $booking_id, $created_at );
	}

	/**
	 * Resolve the secret NOW, before the caller enters a lock or a transaction.
	 *
	 * The reservation path calls this first (see {@see \Aponto\Booking\ReservationService::reserve()}):
	 * minting writes an option row, and that write must never happen inside the reservation
	 * transaction. If it did, a restartable failure would roll the option back while this object
	 * still memoised the secret, and the retry would anchor a booking to a secret no longer
	 * persisted — a permanently unrebuildable link. Pre-warming keeps the write strictly outside.
	 *
	 * @return bool Whether a derivation secret is available.
	 */
	public function prewarm(): bool {
		return $this->available();
	}

	/**
	 * Drop the memoised secret so the next resolution re-reads the database.
	 *
	 * The companion to {@see self::prewarm()} for the rollback path: if a transaction that could
	 * have contained the mint is rolled back, whatever this object cached may no longer be
	 * persisted, and continuing to derive from it would anchor bookings to a phantom secret.
	 *
	 * @internal
	 */
	public function forgetSecret(): void {
		$this->secret = null;
	}

	/**
	 * Resolve the raw derivation secret for this request, minting and sealing it on first use.
	 * Returns '' when no usable key material exists (REST-7 degrade) or the stored secret cannot be
	 * opened (salt rotation) — never a fallback constant.
	 */
	private function secret(): string {
		if ( null !== $this->secret ) {
			return $this->secret;
		}
		$this->secret = '';

		$key = $this->auth_key ?? ( defined( 'SECURE_AUTH_KEY' ) ? (string) SECURE_AUTH_KEY : '' );
		if ( ! Crypto::isUsableKeyMaterial( $key ) ) {
			return $this->secret; // REST-7 / D-R15: no secret under a source-code-known key.
		}

		$crypto = new Crypto( $key );
		$opened = $this->openStored( $crypto );
		if ( is_string( $opened ) && '' !== $opened ) {
			$this->secret = $opened;

			return $this->secret;
		}
		if ( is_string( $opened ) ) {
			// A STORED SECRET THAT DOES NOT OPEN DEGRADES HERE AND IS REPAIRED ELSEWHERE (D-R39d,
			// revised after the Codex round on PR #42). Rotating on this path — a public booking POST,
			// a notification flush, any runtime request — is unsafe on a MULTI-NODE deployment whose
			// nodes hold DIFFERENT but individually usable `SECURE_AUTH_KEY`s: each node can open only
			// its own blob, so every request would rotate the shared option and the other node would
			// rotate it straight back, with `PREVIOUS_OPTION` holding only the first generation. That
			// is worse than the degrade it was meant to cure, and no runtime request can tell a
			// changed key from an inconsistent fleet.
			//
			// So the runtime answer is the honest degrade it always was — '' — and the repair is
			// ADMINISTRATIVE and explicit: {@see self::repair()}, run by `wp aponto fixer`, where a
			// human has decided the key change was intended. Detection stays automatic: the condition
			// is reported by the `aponto_manage_token_secret` Site Health test, which names the
			// command.
			return $this->secret;
		}

		try {
			$sealed = $crypto->encrypt( random_bytes( self::SECRET_BYTES ), self::DOMAIN );
		} catch ( \Throwable $failure ) {
			unset( $failure ); // No CSPRNG / no cipher — degrade, never weaken.

			return $this->secret;
		}

		$this->claim( self::SECRET_OPTION, $sealed );

		// ALWAYS derive from what actually PERSISTED, never from the value this request minted.
		// `add_option()` is not a single-winner primitive — WordPress implements it as
		// `INSERT … ON DUPLICATE KEY UPDATE`, so two concurrent first-use requests can both report
		// success and the second silently replaces the first. {@see self::claim()} makes the write
		// insert-if-absent, and re-reading here means winner and loser end up on the SAME secret;
		// a request whose write did not persist at all (rolled back, or lost a race it could not
		// see) resolves to '' and degrades rather than anchoring to a secret nobody stored.
		$reread = $this->openStored( $crypto );
		if ( is_string( $reread ) ) {
			$this->secret = $reread;
		}

		return $this->secret;
	}

	/**
	 * Open the stored secret: the raw 32 bytes, '' when a blob exists but does not open under this
	 * site key (salt rotation / corruption), or null when no blob is stored at all.
	 *
	 * @param Crypto $crypto Cipher bound to the site key.
	 */
	private function openStored( Crypto $crypto ): ?string {
		$stored = get_option( self::SECRET_OPTION, '' );
		if ( ! is_string( $stored ) || '' === $stored ) {
			return null;
		}

		$opened = $crypto->decrypt( $stored, self::DOMAIN );

		return is_string( $opened ) && self::SECRET_BYTES === strlen( $opened ) ? $opened : '';
	}

	/**
	 * Persist a sealed secret ONLY if the site does not have one yet — a genuine single-winner
	 * claim, unlike `add_option()`.
	 *
	 * Engine-aware for the same reason the three other dialect divergences are (D-R20): `INSERT
	 * IGNORE` is MySQL, `INSERT OR IGNORE` is SQLite. Both are atomic against the `option_name`
	 * unique key, so exactly one concurrent minter wins and the losers' rows are discarded rather
	 * than overwriting the winner. `autoload = 'no'`: the secret is read on the booking and email
	 * paths only, never on a plain page view.
	 *
	 * The option caches are cleared afterwards because this bypassed the options API — without it
	 * the follow-up read could return the `notoptions` miss this request cached moments ago.
	 *
	 * @param string $option Option name.
	 * @param string $sealed Sealed secret blob.
	 */
	private function claim( string $option, string $sealed ): void {
		$verb = DatabaseEngine::isSqlite( $this->wpdb ) ? 'INSERT OR IGNORE' : 'INSERT IGNORE';
		$sql  = $verb . " INTO {$this->wpdb->options} (option_name, option_value, autoload) VALUES (%s, %s, %s)";

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Core options table; values bound via prepare(); insert-if-absent is not expressible through the options API (add_option upserts).
		$this->wpdb->query( $this->wpdb->prepare( $sql, $option, $sealed, 'no' ) );

		$this->flushOptionCaches( $option );
	}

	/**
	 * Replace a secret that no longer opens with a fresh one, exactly once (D-R39d).
	 *
	 * Reached only from {@see self::repair()}, i.e. only from `wp aponto fixer`. Every step is chosen
	 * so the operation cannot make anything worse than it already is:
	 *
	 *  1. `$this->resealed` — one attempt per instance, so a repair pass that resolves the secret
	 *     more than once cannot turn a cipher problem into a rotation loop;
	 *  2. the displaced blob is SET ASIDE first, insert-if-absent, before anything overwrites it;
	 *  3. the swap is a compare-and-swap on the exact blob this request read, so two requests meeting
	 *     the same broken secret produce ONE new one and the loser adopts the winner's;
	 *  4. the answer is re-read from storage, never the value this request generated — the same rule
	 *     the mint path follows, and for the same reason: a write that did not persist must degrade,
	 *     not anchor bookings to a phantom secret.
	 *
	 * @param Crypto $crypto Cipher bound to the site key.
	 * @return string The usable secret, or '' to degrade.
	 */
	private function reseal( Crypto $crypto ): string {
		$stale = get_option( self::SECRET_OPTION, '' );
		if ( $this->resealed || ! is_string( $stale ) || '' === $stale ) {
			return '';
		}
		$this->resealed = true;

		try {
			$sealed = $crypto->encrypt( random_bytes( self::SECRET_BYTES ), self::DOMAIN );
		} catch ( \Throwable $failure ) {
			unset( $failure ); // No CSPRNG / no cipher — degrade, and leave the stored blob untouched.

			return '';
		}

		$this->claim( self::PREVIOUS_OPTION, $stale );

		if ( $this->swap( $stale, $sealed ) ) {
			update_option( self::ROTATED_OPTION, $this->clock()->now()->getTimestamp(), false );
			$this->logger()->log(
				'aponto_manage_token_secret_rotated',
				'error',
				'Manage-token derivation secret could not be opened and was rotated.',
				array( 'reason' => 'unopenable' )
			);
		}

		$reread = $this->openStored( $crypto );

		return is_string( $reread ) ? $reread : '';
	}

	/**
	 * Compare-and-swap the stored secret, so exactly one concurrent request rotates.
	 *
	 * @param string $stale  The blob this request read and could not open.
	 * @param string $sealed The replacement.
	 * @return bool Whether THIS request performed the rotation.
	 */
	private function swap( string $stale, string $sealed ): bool {
		$sql = "UPDATE {$this->wpdb->options} SET option_value = %s WHERE option_name = %s AND option_value = %s";

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Core options table; values bound via prepare(); compare-and-swap is not expressible through the options API.
		$affected = $this->wpdb->query( $this->wpdb->prepare( $sql, $sealed, self::SECRET_OPTION, $stale ) );

		$this->flushOptionCaches( self::SECRET_OPTION );

		return false !== $affected && (int) $affected > 0;
	}

	/**
	 * Drop the option caches this class' direct SQL bypassed.
	 *
	 * @param string $option Option name.
	 */
	private function flushOptionCaches( string $option ): void {
		wp_cache_delete( $option, 'options' );
		wp_cache_delete( 'notoptions', 'options' );
		wp_cache_delete( 'alloptions', 'options' );
	}

	/**
	 * The clock, built on first use.
	 */
	private function clock(): Clock {
		if ( null === $this->clock ) {
			$this->clock = new Clock();
		}

		return $this->clock;
	}

	/**
	 * The operational logger, built on first use.
	 */
	private function logger(): Logger {
		if ( null === $this->logger ) {
			$this->logger = new Logger( new Settings(), $this->clock() );
		}

		return $this->logger;
	}
}

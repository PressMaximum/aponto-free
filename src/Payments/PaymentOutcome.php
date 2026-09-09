<?php
/**
 * Normalized payment outcome (extension-surface §5b.3, D-R38d).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Payments;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * What the GATEWAY says actually happened to one payment — the answer core applies, as opposed to
 * what the browser claims (D-R38d).
 *
 * The status vocabulary is closed and small on purpose. Every gateway has a rich, provider-specific
 * state machine; core only needs the four answers that lead to different WRITES:
 *
 * - `paid`    — money is committed; the order becomes `paid` and the booking may confirm.
 * - `pending` — the gateway has taken responsibility but not settled (an async method). Nothing is
 *               applied yet, and the hold stays alive; the webhook leg finishes the story.
 * - `failed`  — this attempt is over and the customer may try again while the hold lives.
 * - `expired` — the intent is dead; only a new attempt can help.
 *
 * A driver that cannot map a provider state to one of these must answer `pending`, which is the only
 * value that asserts nothing.
 */
final class PaymentOutcome {

	/**
	 * Money is committed.
	 */
	public const PAID = 'paid';

	/**
	 * Accepted but not settled — assert nothing yet.
	 */
	public const PENDING = 'pending';

	/**
	 * This attempt failed; a retry is possible while the hold lives.
	 */
	public const FAILED = 'failed';

	/**
	 * The intent is dead.
	 */
	public const EXPIRED = 'expired';

	/**
	 * Every status core understands.
	 *
	 * @var list<string>
	 */
	public const STATUSES = array( self::PAID, self::PENDING, self::FAILED, self::EXPIRED );

	/**
	 * A decline core has no more specific word for.
	 */
	public const FAILURE_OTHER = 'other';

	/**
	 * The CLOSED vocabulary of decline reasons core will repeat to a browser (Codex Q).
	 *
	 * A gateway's own decline text is written for a merchant reading a dashboard, not for the person
	 * who just typed their card number: it names issuer behaviour, carries provider identifiers and
	 * occasionally quotes the cardholder's own data back. None of that belongs in a public response,
	 * and passing it through would also make the shape of the response depend on which gateway a site
	 * happens to use. So a driver's code is mapped onto this list and anything unrecognized becomes
	 * {@see self::FAILURE_OTHER} — the widget can say something useful for the reasons a customer can
	 * actually act on, and nothing misleading for the rest.
	 *
	 * `unverified_amount` is the odd one out and the reason it must be listed EXPLICITLY: it is not a
	 * decline at all but a driver refusing to assert a figure it could not read, and its whole point
	 * is that the widget tells the customer NOT to retry (the amount is what is in doubt). Folded to
	 * `other` it would have been shown as a generic failure with a retry button — the single worst
	 * response to it. The widget copy for it already exists.
	 *
	 * `instrument_declined` is the second entry that earns its place by the ACTION it implies rather
	 * than by any one gateway's wording (D-R40a). A wallet gateway declines the FUNDING SOURCE the
	 * customer picked inside its own popup — not a card this site ever saw — and the cure is to pick
	 * a different one, which is a live control the widget can offer (wallet SDKs expose it as a
	 * restart of the same approval). Folded to `card_declined` it would tell a customer paying from a
	 * bank account or a wallet balance that their CARD was refused, and folded to `other` it would lose
	 * the one thing that distinguishes it: that retrying, with a different source, is likely to
	 * work. The term is deliberately gateway-neutral — "instrument" is what every wallet and PSP
	 * calls a funding source — so a third gateway can reuse it without a new word.
	 *
	 * `hold_released` is the third entry earned by an ACTION rather than a wording (D-R40b), and the
	 * only member of the list that means NO MONEY MOVED AT ALL. A driver whose capture would move
	 * money refuses to run it once `CaptureRequest::$hold_open` is false — the slot is already gone —
	 * so the honest thing to tell the customer is "nothing was charged, pick another time", not
	 * "your payment failed". Folded to `other` the widget would show a generic failure with a retry
	 * button, on a hold that no longer exists: the customer would try to pay again for an
	 * appointment they cannot have.
	 *
	 * @var list<string>
	 */
	public const FAILURE_CODES = array(
		'card_declined',
		'instrument_declined',
		'insufficient_funds',
		'expired_card',
		'incorrect_cvc',
		'processing_error',
		'authentication_failed',
		'unverified_amount',
		'hold_released',
		// A begin/resume that arrived after the deadline (D-R39c, Codex A.1). Distinct from
		// `hold_released`, which means a release already happened: this one means the slot is still
		// nominally held but its clock has run out, so no intent may be created and the customer must
		// pick another time rather than be shown a payment form for an appointment about to vanish.
		'hold_expired',
		self::FAILURE_OTHER,
	);

	/**
	 * Fold any decline code onto {@see self::FAILURE_CODES}; '' stays ''.
	 *
	 * @param string $code Raw code from a driver, an event, or a stored transaction row.
	 */
	public static function normalizeFailureCode( string $code ): string {
		$code = strtolower( trim( $code ) );
		if ( '' === $code ) {
			return '';
		}

		return in_array( $code, self::FAILURE_CODES, true ) ? $code : self::FAILURE_OTHER;
	}

	/**
	 * Construct the outcome.
	 *
	 * @param string                  $status       One of {@see self::STATUSES}.
	 * @param int                     $amount_minor Amount the gateway reports, in minor units.
	 * @param string                  $currency     Currency the gateway reports (ISO-4217).
	 * @param string                  $payment_ref  Gateway payment reference (intent/capture id).
	 * @param string                  $gateway_ref  Gateway-side reference the attempt was keyed on.
	 * @param string                  $failure_code Short, PII-free machine code when not paid.
	 * @param \DateTimeImmutable|null $occurred_at  When the gateway says it happened, if known.
	 */
	public function __construct(
		public readonly string $status,
		public readonly int $amount_minor = 0,
		public readonly string $currency = '',
		public readonly string $payment_ref = '',
		public readonly string $gateway_ref = '',
		public readonly string $failure_code = '',
		public readonly ?\DateTimeImmutable $occurred_at = null
	) {}

	/**
	 * Whether the status is one core knows how to act on.
	 */
	public function isRecognized(): bool {
		return in_array( $this->status, self::STATUSES, true );
	}

	/**
	 * Redacted debug view (§5 invariant 8).
	 *
	 * @return array<string, mixed>
	 */
	public function __debugInfo(): array {
		return array(
			'status'       => $this->status,
			'amount_minor' => $this->amount_minor,
			'currency'     => $this->currency,
			'payment_ref'  => $this->payment_ref,
			'gateway_ref'  => $this->gateway_ref,
			'failure_code' => $this->failure_code,
			'occurred_at'  => null === $this->occurred_at ? null : $this->occurred_at->format( 'Y-m-d H:i:s' ),
		);
	}
}

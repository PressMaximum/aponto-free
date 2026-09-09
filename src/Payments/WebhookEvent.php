<?php
/**
 * Gateway-neutral webhook event (extension-surface §5b.2, D-R38f).
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
 * A verified webhook, normalized to the vocabulary core acts on.
 *
 * The `type` set is CLOSED, and a driver that cannot map a provider event to one of them must answer
 * {@see self::IGNORED} rather than inventing a value. Core treats an unrecognized type as `ignored`
 * and still returns `200`: a gateway that starts sending a new event type must not turn the webhook
 * endpoint red, because a red endpoint gets disabled and then the events that DO matter stop
 * arriving too.
 *
 * `raw_type` is kept purely so an operator can see what the gateway actually called it. It is a
 * short provider-side identifier — never a payload, never PII.
 */
final class WebhookEvent {

	/**
	 * Money is committed for `gateway_ref`.
	 */
	public const PAYMENT_SUCCEEDED = 'payment_succeeded';

	/**
	 * The gateway accepted the payment but has not settled it.
	 */
	public const PAYMENT_PENDING = 'payment_pending';

	/**
	 * The payment attempt failed.
	 */
	public const PAYMENT_FAILED = 'payment_failed';

	/**
	 * The intent expired without being paid.
	 */
	public const SESSION_EXPIRED = 'session_expired';

	/**
	 * A refund settled at the gateway (possibly initiated from the gateway's own dashboard).
	 */
	public const REFUND_SUCCEEDED = 'refund_succeeded';

	/**
	 * A refund the gateway had accepted did NOT settle (Codex #7).
	 *
	 * The counterpart of {@see self::REFUND_SUCCEEDED} and the reason a `pending` refund may not
	 * settle the order optimistically: a provider that answers "pending" and later fails would
	 * otherwise leave an order marked `refunded` for money that never went back. Stripe reports it as
	 * `refund.failed` (or `charge.refund.updated` with `status = failed`); another gateway has no such
	 * event at all, which is why the vocabulary is core's rather than any one gateway's.
	 */
	public const REFUND_FAILED = 'refund_failed';

	/**
	 * Nothing core needs to do — answered `200`.
	 */
	public const IGNORED = 'ignored';

	/**
	 * `raw_type` marker: the event authenticated against a credential set the site is NOT using
	 * (D-R39c, Codex A.5).
	 *
	 * A driver that holds more than one environment's signing secret can tell a genuine leftover
	 * delivery from a forgery, and both are `ignored` — but they are not the same risk. A verified
	 * event still CLAIMS a replay-ledger row, and the ledger keeps rows for thirty days; somebody
	 * holding a retired signing secret could therefore fill that table on a live site simply by
	 * replaying with fresh event ids. So this one is answered `200` BEFORE the claim
	 * ({@see \Aponto\Rest\Controller\PaymentsController::webhook()}) rather than after it.
	 *
	 * It rides `raw_type` deliberately: the TYPE vocabulary is closed and core acts on it, while
	 * `raw_type` is diagnostic, so an older core simply records the string and behaves as before.
	 */
	public const FOREIGN_MODE = 'foreign_mode';

	/**
	 * Every type core understands.
	 *
	 * @var list<string>
	 */
	public const TYPES = array(
		self::PAYMENT_SUCCEEDED,
		self::PAYMENT_PENDING,
		self::PAYMENT_FAILED,
		self::SESSION_EXPIRED,
		self::REFUND_SUCCEEDED,
		self::REFUND_FAILED,
		self::IGNORED,
	);

	/**
	 * Construct the event.
	 *
	 * @param string                  $event_id     Provider event id — the replay-guard key.
	 * @param string                  $type         One of {@see self::TYPES}.
	 * @param string                  $gateway_ref  Intent/order reference the event is about.
	 * @param string                  $payment_ref  Gateway payment reference. For
	 *                                              {@see self::REFUND_SUCCEEDED} this is the REFUND's
	 *                                              own id (while `gateway_ref` still names the
	 *                                              original intent) — that is what lets core
	 *                                              recognise a refund it initiated itself when the
	 *                                              gateway echoes it back as an event.
	 * @param int                     $amount_minor Amount in minor units (refund delta for a refund).
	 * @param string                  $currency     ISO-4217 currency.
	 * @param string                  $order_code   Order code carried in gateway metadata, if any.
	 * @param int                     $booking_id   Booking id carried in gateway metadata, if any.
	 * @param \DateTimeImmutable|null $occurred_at  Provider timestamp, if supplied.
	 * @param string                  $raw_type     The provider's own event name, for diagnostics.
	 * @param string                  $failure_code Decline reason for a {@see self::PAYMENT_FAILED}
	 *                                              event (Codex Q). ADDITIVE and last, so every
	 *                                              existing driver call site keeps working. Folded
	 *                                              onto {@see PaymentOutcome::FAILURE_CODES} by
	 *                                              {@see self::failureCode()} — a gateway's own
	 *                                              wording is written for a merchant dashboard and
	 *                                              never repeated to a browser verbatim.
	 */
	public function __construct(
		public readonly string $event_id,
		public readonly string $type,
		public readonly string $gateway_ref = '',
		public readonly string $payment_ref = '',
		public readonly int $amount_minor = 0,
		public readonly string $currency = '',
		public readonly string $order_code = '',
		public readonly int $booking_id = 0,
		public readonly ?\DateTimeImmutable $occurred_at = null,
		public readonly string $raw_type = '',
		public readonly string $failure_code = ''
	) {}

	/**
	 * The decline reason, folded onto the closed vocabulary (Codex Q).
	 */
	public function failureCode(): string {
		return PaymentOutcome::normalizeFailureCode( $this->failure_code );
	}

	/**
	 * Whether this event asks core to do nothing (explicitly, or by naming a type core does not know).
	 */
	/**
	 * Whether this event was authenticated by a credential set the site is not using.
	 */
	public function isForeignMode(): bool {
		return self::FOREIGN_MODE === $this->raw_type;
	}

	/**
	 * Whether this event asks core to do nothing (explicitly, or by naming a type core does not know).
	 */
	public function isIgnorable(): bool {
		return self::IGNORED === $this->type || ! in_array( $this->type, self::TYPES, true );
	}

	/**
	 * Redacted debug view (§5 invariant 8).
	 *
	 * @return array<string, mixed>
	 */
	public function __debugInfo(): array {
		return array(
			'event_id'     => $this->event_id,
			'type'         => $this->type,
			'gateway_ref'  => $this->gateway_ref,
			'payment_ref'  => $this->payment_ref,
			'amount_minor' => $this->amount_minor,
			'currency'     => $this->currency,
			'order_code'   => $this->order_code,
			'booking_id'   => $this->booking_id,
			'raw_type'     => $this->raw_type,
			'failure_code' => $this->failureCode(),
		);
	}
}

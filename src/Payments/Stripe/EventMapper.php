<?php
/**
 * Stripe events → core's closed webhook vocabulary (D-R39).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Payments\Stripe;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Payments\PaymentOutcome;
use Aponto\Payments\WebhookEvent;

/**
 * The translation from Stripe's event catalogue to the seven values core acts on
 * (extension-surface §5b.2).
 *
 * Pure and WordPress-free, which is what lets the whole mapping be asserted against hand-written
 * fixtures on the host. `null` means REJECT (a `400` the gateway will retry-then-give-up on); a
 * {@see WebhookEvent} of type `ignored` means "understood, nothing to do", answered `200` so a new
 * Stripe event type can never turn the endpoint red and get it disabled.
 *
 * Two guards belong here rather than in core, because only a driver knows how its provider carries
 * them:
 *
 * - **`livemode` must match the key mode.** A test event arriving at a live site (or the reverse)
 *   is either a misconfigured endpoint or a probe, and applying it would move a real order on the
 *   strength of a test payment.
 * - **`metadata.aponto_site` must match this site.** One Stripe account shared between staging and
 *   production sends every webhook to BOTH endpoints; without this check, staging would apply
 *   production's payments to whatever local order happened to share a reference.
 */
final class EventMapper {

	/**
	 * Map one decoded Stripe event.
	 *
	 * @param array<string, mixed> $payload   Decoded event JSON (after the signature passed).
	 * @param string               $mode      Derived key mode (`test`|`live`).
	 * @param string               $site_host Host of `home_url()`, for the cross-site guard.
	 * @return WebhookEvent|null `null` rejects the request as invalid.
	 */
	public static function map( array $payload, string $mode, string $site_host ): ?WebhookEvent {
		$event_id = isset( $payload['id'] ) && is_string( $payload['id'] ) ? $payload['id'] : '';
		$type     = isset( $payload['type'] ) && is_string( $payload['type'] ) ? $payload['type'] : '';

		if ( 1 !== preg_match( '/^evt_[A-Za-z0-9_]{1,140}$/', $event_id ) || '' === $type ) {
			return null;
		}

		// `livemode` is REQUIRED to be a boolean. An event without it is not a Stripe event, and
		// defaulting it either way would decide a money question by omission.
		if ( ! array_key_exists( 'livemode', $payload ) || ! is_bool( $payload['livemode'] ) ) {
			return null;
		}
		$event_mode = $payload['livemode'] ? Config::MODE_LIVE : Config::MODE_TEST;
		if ( '' === $mode || $event_mode !== $mode ) {
			return null;
		}

		$object      = isset( $payload['data']['object'] ) && is_array( $payload['data']['object'] ) ? $payload['data']['object'] : array();
		$occurred_at = self::instant( $payload['created'] ?? ( $object['created'] ?? null ) );
		$ignored     = new WebhookEvent( $event_id, WebhookEvent::IGNORED, '', '', 0, '', '', 0, $occurred_at, $type );

		if ( array() === $object ) {
			return $ignored;
		}

		$metadata = isset( $object['metadata'] ) && is_array( $object['metadata'] ) ? $object['metadata'] : array();
		$site     = isset( $metadata['aponto_site'] ) && is_string( $metadata['aponto_site'] ) ? $metadata['aponto_site'] : '';
		if ( '' !== $site && '' !== $site_host && $site !== $site_host ) {
			return $ignored;
		}

		switch ( $type ) {
			case 'payment_intent.succeeded':
				return self::intent( $event_id, $type, $object, WebhookEvent::PAYMENT_SUCCEEDED, $occurred_at );

			case 'payment_intent.payment_failed':
				return self::intent( $event_id, $type, $object, WebhookEvent::PAYMENT_FAILED, $occurred_at );

			case 'payment_intent.canceled':
				return self::intent( $event_id, $type, $object, WebhookEvent::SESSION_EXPIRED, $occurred_at );

			case 'charge.refunded':
				return self::refunded( $event_id, $type, $object, $occurred_at );

			// The REFUND-object events, and since 2026-09-05 the ONLY ones that settle a refund made
			// outside Aponto. `refund.created` fires for every refund — dashboard, API, or one this
			// plugin issued itself (core recognises that one by its `refund_ref` and answers
			// `duplicate`) — and it carries the figures directly instead of hoping they are embedded
			// in a Charge.
			case 'refund.created':
			case 'refund.updated':
			case 'refund.failed':
			case 'charge.refund.updated':
				return self::refundEvent( $event_id, $type, $object, $occurred_at );

			default:
				return $ignored;
		}
	}

	/**
	 * Stripe's decline vocabulary → core's closed one (Codex D3).
	 *
	 * Core folds anything it does not recognise onto `other`
	 * ({@see \Aponto\Payments\PaymentOutcome::normalizeFailureCode()}), so this map only has to
	 * carry the codes whose NAMES differ. `authentication_required` is the one that matters: Stripe
	 * names it for what the bank wants next, core names it for what happened, and without the
	 * translation the single most common 3-D Secure failure would reach the customer as "other".
	 *
	 * @var array<string, string>
	 */
	private const FAILURE_CODES = array(
		'card_declined'           => 'card_declined',
		'insufficient_funds'      => 'insufficient_funds',
		'expired_card'            => 'expired_card',
		'incorrect_cvc'           => 'incorrect_cvc',
		'invalid_cvc'             => 'incorrect_cvc',
		'processing_error'        => 'processing_error',
		'authentication_required' => 'authentication_failed',
		'authentication_failure'  => 'authentication_failed',
	);

	/**
	 * The failure code for a failed intent, already folded onto core's closed vocabulary.
	 *
	 * `decline_code` is preferred over `code` because it is the SPECIFIC reason — Stripe answers
	 * `code: card_declined` with `decline_code: insufficient_funds`, and "your card was declined"
	 * helps a customer far less than "not enough funds".
	 *
	 * @param array<string, mixed> $intent The PaymentIntent object.
	 */
	private static function failureCodeOf( array $intent ): string {
		$error = isset( $intent['last_payment_error'] ) && is_array( $intent['last_payment_error'] )
			? $intent['last_payment_error']
			: array();

		$seen = false;
		foreach ( array( 'decline_code', 'code' ) as $key ) {
			$raw = isset( $error[ $key ] ) && is_string( $error[ $key ] ) ? self::sanitize( $error[ $key ] ) : '';
			if ( '' === $raw ) {
				continue;
			}
			$seen = true;
			if ( isset( self::FAILURE_CODES[ $raw ] ) ) {
				return self::FAILURE_CODES[ $raw ];
			}
		}

		// FALL THROUGH ON AN UNMAPPED VALUE, not only on an empty one (QA BUG-2). Stripe answers the
		// standard decline card with `code: card_declined` + `decline_code: generic_decline`, and
		// returning at the first non-empty key meant the specific-but-unmapped `generic_decline`
		// swallowed the general-but-mapped `card_declined` — so the commonest decline of all reached
		// the customer as `other`. The same held for `do_not_honor`, `lost_card`, `stolen_card`,
		// `fraudulent`, `transaction_not_allowed` and `card_velocity_exceeded`.
		return $seen ? PaymentOutcome::FAILURE_OTHER : '';
	}

	/**
	 * The provider's decline code for a failed intent, for the operational log only.
	 *
	 * @param array<string, mixed> $payload Decoded event JSON.
	 */
	public static function declineCode( array $payload ): string {
		$error = isset( $payload['data']['object']['last_payment_error'] ) && is_array( $payload['data']['object']['last_payment_error'] )
			? $payload['data']['object']['last_payment_error']
			: array();

		foreach ( array( 'decline_code', 'code' ) as $key ) {
			if ( isset( $error[ $key ] ) && is_string( $error[ $key ] ) && '' !== $error[ $key ] ) {
				return self::sanitize( $error[ $key ] );
			}
		}

		return '';
	}

	/**
	 * A provider code reduced to a safe machine token.
	 *
	 * @param string $code Raw provider code.
	 */
	private static function sanitize( string $code ): string {
		return (string) preg_replace( '/[^a-z0-9_]/', '', strtolower( $code ) );
	}

	/**
	 * Map a PaymentIntent-shaped event.
	 *
	 * `amount_received` is preferred over `amount`: the first is what Stripe actually collected and
	 * the second is what was asked for, and core compares the figure against the order before it
	 * settles anything.
	 *
	 * @param string                  $event_id    Provider event id.
	 * @param string                  $raw_type    Stripe's own event name.
	 * @param array<string, mixed>    $intent      The PaymentIntent object.
	 * @param string                  $type        Core event type.
	 * @param \DateTimeImmutable|null $occurred_at Provider timestamp.
	 */
	private static function intent( string $event_id, string $raw_type, array $intent, string $type, ?\DateTimeImmutable $occurred_at ): WebhookEvent {
		$id       = isset( $intent['id'] ) && is_string( $intent['id'] ) ? $intent['id'] : '';
		$currency = self::currency( $intent );
		$metadata = isset( $intent['metadata'] ) && is_array( $intent['metadata'] ) ? $intent['metadata'] : array();
		$amount   = 0;

		if ( WebhookEvent::PAYMENT_SUCCEEDED === $type ) {
			$received = self::settledAmount( $intent );
			if ( $received <= 0 || '' === $currency ) {
				// FAIL CLOSED (Codex D1). `amount_received` is what Stripe actually COLLECTED;
				// `amount` is what was asked for, and the two differ exactly when something went
				// wrong. Falling back to `amount` — or to `0`, which core would reject as a
				// mismatch and record as a payment anomaly — would let an event whose settled
				// figure is missing, null or a string decide that money arrived. `ignored` is the
				// only honest answer: nothing is applied, the hold stays alive, and the confirm leg
				// or a later event can still settle the order from the authoritative object.
				return new WebhookEvent( $event_id, WebhookEvent::IGNORED, $id, '', 0, '', '', 0, $occurred_at, $raw_type );
			}
			$amount = Money::toMinor( $received, $currency );
		}

		return new WebhookEvent(
			$event_id,
			$type,
			$id,
			$id,
			$amount,
			WebhookEvent::PAYMENT_SUCCEEDED === $type ? $currency : '',
			isset( $metadata['aponto_order_code'] ) && is_string( $metadata['aponto_order_code'] ) ? $metadata['aponto_order_code'] : '',
			isset( $metadata['aponto_booking_id'] ) && is_numeric( $metadata['aponto_booking_id'] ) ? (int) $metadata['aponto_booking_id'] : 0,
			$occurred_at,
			$raw_type,
			WebhookEvent::PAYMENT_FAILED === $type ? self::failureCodeOf( $intent ) : ''
		);
	}

	/**
	 * The amount Stripe says it SETTLED, or `-1` when the object does not state one (Codex D1).
	 *
	 * Deliberately `is_int()` and not `is_numeric()`. Stripe sends `amount_received` as a JSON
	 * NUMBER; a string in that field means the payload was rewritten somewhere between Stripe and
	 * this process, and `is_numeric()` would happily accept `"150000"` from whoever rewrote it.
	 * There is no fallback to `amount` on purpose — see {@see self::intent()}.
	 *
	 * @param array<string, mixed> $intent The PaymentIntent object.
	 */
	private static function settledAmount( array $intent ): int {
		if ( ! array_key_exists( 'amount_received', $intent ) || ! is_int( $intent['amount_received'] ) ) {
			return -1;
		}

		return $intent['amount_received'];
	}

	/**
	 * Map `charge.refunded` to ONE settled refund.
	 *
	 * Stripe sends this event once per refund and puts the CHARGE in the payload, so the refund the
	 * event is about has to be picked out of `refunds.data[]`: the newest `succeeded` entry. Its own
	 * `amount` is the delta core needs — deriving one from `amount_refunded` would require knowing
	 * the sum core already recorded, which is core's ledger, not the driver's business.
	 *
	 * `payment_ref` is the REFUND's id, which is what lets core recognise a refund it initiated
	 * itself when Stripe echoes it back (extension-surface §5b.2).
	 *
	 * @param string                  $event_id    Provider event id.
	 * @param string                  $raw_type    Stripe's own event name.
	 * @param array<string, mixed>    $charge      The Charge object.
	 * @param \DateTimeImmutable|null $occurred_at Provider timestamp.
	 */
	private static function refunded( string $event_id, string $raw_type, array $charge, ?\DateTimeImmutable $occurred_at ): WebhookEvent {
		$currency = self::currency( $charge );
		$intent   = isset( $charge['payment_intent'] ) && is_string( $charge['payment_intent'] ) ? $charge['payment_intent'] : '';
		$refund   = self::newestRefund( $charge, 'succeeded' );

		// LEGACY ONLY (QA BUG-1, 2026-09-05). Stripe delivers webhook payloads under the ACCOUNT's
		// default API version, not the version this client pins — and on any version from 2022 on,
		// the Charge in a `charge.refunded` payload carries NO `refunds` key at all. Reading it was
		// the whole of the bug: a dashboard refund left the order reading `paid` forever.
		//
		// The fix is deliberately NOT to fetch the charge back with `expand[]=refunds`. That would put
		// an HTTP call inside `verify_webhook` — a verb with no `PaymentContext` and therefore no
		// budget — on the one leg where a gateway is counting milliseconds before it retries. Instead
		// this branch stays exactly as strict as it was, and `refund.created` (routed above) carries
		// the refund. Both events are delivered for every refund, so nothing is lost; on a legacy
		// account both map to the same refund id and core answers the second one `duplicate`.
		if ( array() === $refund || '' === $currency ) {
			return new WebhookEvent( $event_id, WebhookEvent::IGNORED, $intent, '', 0, '', '', 0, $occurred_at, $raw_type );
		}

		$metadata = isset( $charge['metadata'] ) && is_array( $charge['metadata'] ) ? $charge['metadata'] : array();

		return new WebhookEvent(
			$event_id,
			WebhookEvent::REFUND_SUCCEEDED,
			$intent,
			isset( $refund['id'] ) && is_string( $refund['id'] ) ? $refund['id'] : '',
			Money::toMinor( isset( $refund['amount'] ) && is_numeric( $refund['amount'] ) ? (int) $refund['amount'] : 0, $currency ),
			$currency,
			isset( $metadata['aponto_order_code'] ) && is_string( $metadata['aponto_order_code'] ) ? $metadata['aponto_order_code'] : '',
			isset( $metadata['aponto_booking_id'] ) && is_numeric( $metadata['aponto_booking_id'] ) ? (int) $metadata['aponto_booking_id'] : 0,
			$occurred_at,
			$raw_type
		);
	}

	/**
	 * Map any event whose `data.object` is a REFUND — `refund.created`, `refund.updated`,
	 * `refund.failed`, `charge.refund.updated`.
	 *
	 * This is the path that makes a refund issued from Stripe's dashboard reach the order (QA BUG-1):
	 * the Refund object states `payment_intent`, `amount`, `currency` and `id` directly, so nothing
	 * has to be read out of a Charge that no longer embeds them.
	 *
	 * @param string                  $event_id    Provider event id.
	 * @param string                  $raw_type    Stripe's own event name.
	 * @param array<string, mixed>    $refund      The Refund object.
	 * @param \DateTimeImmutable|null $occurred_at Provider timestamp.
	 */
	private static function refundEvent( string $event_id, string $raw_type, array $refund, ?\DateTimeImmutable $occurred_at ): WebhookEvent {
		$status   = isset( $refund['status'] ) && is_string( $refund['status'] ) ? $refund['status'] : '';
		$intent   = isset( $refund['payment_intent'] ) && is_string( $refund['payment_intent'] ) ? $refund['payment_intent'] : '';
		$id       = isset( $refund['id'] ) && is_string( $refund['id'] ) ? $refund['id'] : '';
		$currency = self::currency( $refund );
		$amount   = '' === $currency ? 0 : Money::toMinor( isset( $refund['amount'] ) && is_numeric( $refund['amount'] ) ? (int) $refund['amount'] : 0, $currency );

		if ( 'succeeded' === $status && $amount > 0 && '' !== $intent ) {
			$metadata = isset( $refund['metadata'] ) && is_array( $refund['metadata'] ) ? $refund['metadata'] : array();

			return new WebhookEvent(
				$event_id,
				WebhookEvent::REFUND_SUCCEEDED,
				$intent,
				$id,
				$amount,
				$currency,
				isset( $metadata['aponto_order_code'] ) && is_string( $metadata['aponto_order_code'] ) ? $metadata['aponto_order_code'] : '',
				isset( $metadata['aponto_booking_id'] ) && is_numeric( $metadata['aponto_booking_id'] ) ? (int) $metadata['aponto_booking_id'] : 0,
				$occurred_at,
				$raw_type
			);
		}

		if ( 'failed' === $status || 'canceled' === $status ) {
			return new WebhookEvent( $event_id, WebhookEvent::REFUND_FAILED, $intent, $id, $amount, $currency, '', 0, $occurred_at, $raw_type );
		}

		// `pending`, `requires_action`, or a payload missing the reference or the figures: nothing to
		// apply. A later `refund.updated` carries the terminal status.
		return new WebhookEvent( $event_id, WebhookEvent::IGNORED, $intent, $id, 0, '', '', 0, $occurred_at, $raw_type );
	}

	/**
	 * The newest refund with a given status, out of a charge's embedded refund list.
	 *
	 * @param array<string, mixed> $charge The Charge object.
	 * @param string               $status Status to match.
	 * @return array<string, mixed>
	 */
	private static function newestRefund( array $charge, string $status ): array {
		$list = isset( $charge['refunds']['data'] ) && is_array( $charge['refunds']['data'] ) ? $charge['refunds']['data'] : array();

		$best    = array();
		$created = -1;
		foreach ( $list as $entry ) {
			if ( ! is_array( $entry ) ) {
				continue;
			}
			if ( ( isset( $entry['status'] ) && is_string( $entry['status'] ) ? $entry['status'] : '' ) !== $status ) {
				continue;
			}
			$at = isset( $entry['created'] ) && is_numeric( $entry['created'] ) ? (int) $entry['created'] : 0;
			// STRICTLY greater (Codex D4). Two refunds issued in the same second carry the same
			// `created`, and `>=` would silently prefer the LAST one in the list — which is not the
			// newest, only the last Stripe happened to serialize. Keeping the first entry at a tie is
			// stable and matches Stripe's own newest-first ordering; core still de-duplicates by
			// `event_id` and by `refund_ref`, so the other refund settles from its own event.
			if ( $at > $created ) {
				$created = $at;
				$best    = $entry;
			}
		}

		return $best;
	}

	/**
	 * Upper-case ISO currency off a Stripe object, or '' when it is not a currency.
	 *
	 * @param array<string, mixed> $source Stripe object.
	 */
	private static function currency( array $source ): string {
		$currency = isset( $source['currency'] ) && is_string( $source['currency'] ) ? strtoupper( trim( $source['currency'] ) ) : '';

		return 1 === preg_match( '/^[A-Z]{3}$/', $currency ) ? $currency : '';
	}

	/**
	 * A UTC instant from a Stripe unix timestamp.
	 *
	 * @param mixed $created Stripe `created` value.
	 */
	private static function instant( $created ): ?\DateTimeImmutable {
		if ( ! is_numeric( $created ) || (int) $created <= 0 ) {
			return null;
		}

		return new \DateTimeImmutable( '@' . (int) $created );
	}
}

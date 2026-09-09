<?php
/**
 * Payment initiation result (extension-surface §5b.3, D-R38c).
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
 * What a driver hands back after creating a gateway-side intent: the reference core stores, and the
 * parameters the BROWSER needs to finish the payment with the gateway's own JS.
 *
 * There is deliberately no redirect URL anywhere in this class or in core (D-R38c, founder
 * 2026-09-04): payment is inline. A driver that wants a redirect has to express it as client
 * parameters its own widget code understands, which keeps the decision inside the driver instead of
 * turning core into a redirect broker.
 *
 * ### Why `client_params` is constrained rather than free-form
 *
 * These values are handed to a public, unauthenticated browser AND stored in `transactions.meta`
 * while the intent is in flight. Two rules follow, and both are enforced here rather than trusted:
 * every value must be a SCALAR (an array would smuggle structure into a field the widget treats as
 * opaque strings, and JSON-encoding it into the response would hide what is actually being shipped),
 * and the map is bounded in count and length so a misbehaving driver cannot turn a public response
 * into an exfiltration channel or blow up the row it is stored in.
 *
 * The rule a driver must honour and core cannot check: **never a secret key or a webhook signing
 * secret.** A payment-intent client secret is browser-facing by the gateway's own design and scoped
 * to one payment, which is why it is allowed; an API key is not, and putting one here would publish
 * it. {@see self::__debugInfo()} redacts the whole map so a var_dump in a log never prints it.
 */
final class PaymentBeginResult {

	/**
	 * Maximum number of client parameters a driver may return.
	 */
	public const MAX_PARAMS = 10;

	/**
	 * Maximum length of one client-parameter value once stringified.
	 */
	public const MAX_VALUE_LENGTH = 512;

	/**
	 * Maximum stored length of a gateway reference — the `varchar(191)` the ledger column is sized
	 * for, and the width the `(gateway, gateway_ref)` index is built on.
	 */
	public const MAX_REF_LENGTH = 191;

	/**
	 * Sanitized client parameters.
	 *
	 * @var array<string, string>
	 */
	public readonly array $client_params;

	/**
	 * Construct the result.
	 *
	 * @param string                  $gateway_ref   Gateway-side reference (intent/order id).
	 * @param array<string, scalar>   $client_params Values the widget hands to the gateway's JS.
	 * @param \DateTimeImmutable|null $expires_at    When the intent stops being usable, if known.
	 */
	public function __construct(
		public readonly string $gateway_ref,
		array $client_params = array(),
		public readonly ?\DateTimeImmutable $expires_at = null
	) {
		$this->client_params = self::sanitize( $client_params );
	}

	/**
	 * Coerce a driver's map into the bounded `string => string` shape core is willing to publish.
	 *
	 * Dropping a bad entry rather than throwing is deliberate: a driver that returns one unexpected
	 * value should still produce a usable payment, and the alternative — failing the whole intent —
	 * would turn a cosmetic driver bug into a customer who cannot pay.
	 *
	 * @param array<string, scalar> $params Raw parameters from the driver.
	 * @return array<string, string>
	 */
	private static function sanitize( array $params ): array {
		$out = array();
		foreach ( $params as $key => $value ) {
			if ( count( $out ) >= self::MAX_PARAMS ) {
				break;
			}
			$key = (string) $key;
			if ( 1 !== preg_match( '/^[A-Za-z0-9_]{1,64}$/', $key ) ) {
				continue;
			}
			if ( ! is_scalar( $value ) ) {
				continue;
			}
			if ( is_bool( $value ) ) {
				$out[ $key ] = $value ? '1' : '0';
				continue;
			}
			$out[ $key ] = mb_substr( (string) $value, 0, self::MAX_VALUE_LENGTH );
		}

		return $out;
	}

	/**
	 * Whether the reference can actually be stored and looked up again (Codex O).
	 *
	 * An EMPTY reference is the shape of a driver that answered before its gateway did, and core used
	 * to accept it — writing a row nothing could ever resolve, so the confirm leg 404'd and the
	 * webhook could not find the order either. A reference longer than the column would be truncated
	 * by the database and then never match the value the gateway sends back. Both are refused at the
	 * dispatch boundary, BEFORE any local row claims to represent a real intent.
	 */
	public function isUsableRef(): bool {
		return '' !== $this->gateway_ref && strlen( $this->gateway_ref ) <= self::MAX_REF_LENGTH;
	}

	/**
	 * Redacted debug view (§5 invariant 8): the KEYS of the client parameters, never their values.
	 *
	 * @return array<string, mixed>
	 */
	public function __debugInfo(): array {
		return array(
			'gateway_ref'   => $this->gateway_ref,
			'client_params' => array_keys( $this->client_params ),
			'expires_at'    => null === $this->expires_at ? null : $this->expires_at->format( 'Y-m-d H:i:s' ),
		);
	}
}

<?php
/**
 * The Stripe driver: every `aponto_payment_*_payments_stripe` verb (D-R39, D-R39a).
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

use Aponto\Integration\ConnectionTestRequest;
use Aponto\Integration\ConnectionTestResult;
use Aponto\Payments\CaptureRequest;
use Aponto\Payments\PaymentBeginRequest;
use Aponto\Payments\PaymentBeginResult;
use Aponto\Payments\PaymentContext;
use Aponto\Payments\PaymentOutcome;
use Aponto\Payments\PaymentRegistry;
use Aponto\Payments\RefundRequest;
use Aponto\Payments\RefundResult;
use Aponto\Payments\VoidRequest;
use Aponto\Payments\VoidResult;
use Aponto\Payments\WebhookEvent;
use Aponto\Payments\WebhookRequest;
use Aponto\Support\Clock;
use Aponto\Support\Logger;
use Aponto\Support\Settings;
use WP_Error;

/**
 * The whole module, as far as core is concerned: a set of filter callbacks and no other entry point.
 *
 * ### The shape of the integration (D-R39, founder 2026-09-04)
 *
 * **PaymentIntents + Payment Element, inline.** The server creates the intent from the ORDER's
 * amount and hands the browser only the intent's client secret plus the publishable key. The
 * customer never tells us what they owe, and no secret key leaves the server.
 *
 * **`automatic_payment_methods[allow_redirects] = never` in V1.** Every method the Element then
 * offers finishes synchronously — cards, wallets, Link. The alternative is a redirect leg, and a
 * redirect leg means a customer who lands back on the site minutes later, after the hold that was
 * protecting their slot may already have expired. That is a product decision with a real cost
 * (no iDEAL, no Bancontact, no Boleto) and it is written here so the second gateway does not
 * quietly reintroduce it.
 *
 * **Manual capture is REJECTED, deliberately.** `capture_method` is always `automatic`. An
 * authorisation-then-capture flow looks like the natural fit for a booking, but it buys nothing that
 * this design does not already have — the SLOT is protected by the reserve-first hold, not by the
 * money — and it costs a great deal: authorisations expire on the card network's schedule (about
 * seven days, less for some issuers), a partial capture is irreversible, and every failure mode
 * lands on a customer whose card shows a pending charge nobody can explain. Holding the slot and
 * voiding the intent is the same guarantee with none of that.
 *
 * ### Failure vocabulary
 *
 * Stripe's status IS the decision table, and each branch is a choice: `401`/`403` means the operator
 * must fix a key and no retry helps; `402 card_error` is the CUSTOMER's decline and not a site
 * fault; `409`/`429`/`5xx`/transport say nothing at all about the outcome, which is exactly why the
 * idempotency key makes repeating them safe. None of Stripe's own prose ever reaches REST.
 */
final class Driver {

	/**
	 * The object states this site, this order and this booking (D-R40e).
	 */
	private const BINDING_OK = 'ok';

	/**
	 * The object states a binding and it is somebody else's (D-R40e).
	 */
	private const BINDING_WRONG = 'wrong';

	/**
	 * The object does not state its binding at all, so it has to be read from the source (D-R40e).
	 */
	private const BINDING_INCOMPLETE = 'incomplete';

	/**
	 * Construct the driver.
	 *
	 * @param Config        $config Module configuration.
	 * @param Clock         $clock  Injectable clock (webhook tolerance, HTTP budgets).
	 * @param Logger|null   $logger   Structured logger for operational detail.
	 * @param Settings|null $settings Settings store (defaults to a fresh reader).
	 */
	public function __construct(
		private Config $config,
		private Clock $clock,
		private ?Logger $logger = null,
		private ?Settings $settings = null
	) {
		$this->settings = $settings ?? new Settings();
	}

	/**
	 * Build from the global handles.
	 */
	public static function make(): self {
		$settings = new Settings();
		$clock    = new Clock();

		return new self( new Config( $settings ), $clock, new Logger( $settings, $clock ), $settings );
	}

	/**
	 * Attach every verb.
	 *
	 * The settings, secret-key and validation verbs are the SHARED integration transport
	 * (extension-surface §5b.1): a payment module reuses `GET|PUT /modules/{code}/settings` and
	 * `POST /modules/{code}/test` rather than owning a second controller.
	 */
	public function register(): void {
		$code = Config::CODE;

		add_filter( 'aponto_get_settings_fields_' . $code, array( $this->config, 'settingsFields' ), 10, 2 );
		add_filter( 'aponto_module_secret_keys', array( Config::class, 'secretKeys' ), 10, 3 );
		add_filter( 'aponto_module_settings_validate', array( $this->config, 'validateInput' ), 10, 3 );
		add_filter( 'aponto_module_settings_representation', array( $this->config, 'representation' ), 10, 2 );
		// The WRITE half of that read-path adoption: where the legacy ciphers are, so an unchanged
		// Save moves them to the canonical paths instead of dropping them (D-R39c round 2, NEW-2).
		add_filter( 'aponto_module_settings_migrate_' . $code, array( $this->config, 'legacySecretPaths' ), 10, 2 );
		add_filter( 'aponto_test_' . $code, array( $this, 'test' ), 10, 2 );

		add_filter( 'aponto_payment_min_amount_' . $code, array( self::class, 'minAmount' ), 10, 2 );
		add_filter( 'aponto_payment_ready_' . $code, array( $this, 'ready' ), 10, 2 );
		add_filter( 'aponto_payment_client_config_' . $code, array( $this, 'clientConfig' ), 10, 3 );
		add_filter( 'aponto_payment_begin_' . $code, array( $this, 'begin' ), 10, 3 );
		add_filter( 'aponto_payment_capture_' . $code, array( $this, 'capture' ), 10, 3 );
		add_filter( 'aponto_payment_void_' . $code, array( $this, 'void' ), 10, 3 );
		add_filter( 'aponto_payment_refund_' . $code, array( $this, 'refund' ), 10, 3 );
		add_filter( 'aponto_payment_verify_webhook_' . $code, array( $this, 'verifyWebhook' ), 10, 2 );

		add_filter( 'aponto_payment_mode_' . $code, array( $this, 'mode' ), 10, 2 );
		add_filter( 'aponto_module_status_' . $code, array( $this, 'moduleStatus' ), 10, 2 );

		// The one-click webhook registration route (D-R39b). Module-owned and admin-only; it is an
		// ACTION with a remote side effect, which is why it is not a settings field.
		( new WebhookEndpoint( $this->config, $this->settings ) )->register();
	}

	/**
	 * Published currency minimums; unknown currencies retain the optional verb's zero default.
	 * Settlement conversion can impose a different limit, which the gateway still enforces.
	 * Source: https://docs.stripe.com/currencies#minimum-and-maximum-charge-amounts.
	 *
	 * @param int    $minimum Prior minimum.
	 * @param string $currency Order currency.
	 */
	public static function minAmount( int $minimum, string $currency ): int {
		unset( $minimum );
		$amounts = array(
			'USD' => 50,
			'AED' => 200,
			'ARS' => 50,
			'AUD' => 50,
			'BRL' => 50,
			'CAD' => 50,
			'CHF' => 50,
			'COP' => 50,
			'CZK' => 1500,
			'DKK' => 250,
			'EUR' => 50,
			'GBP' => 30,
			'HKD' => 400,
			'HUF' => 17500,
			'IDR' => 50,
			'ILS' => 50,
			'INR' => 50,
			'JPY' => 50,
			'KRW' => 50,
			'MXN' => 1000,
			'MYR' => 200,
			'NOK' => 300,
			'NZD' => 50,
			'PHP' => 50,
			'PLN' => 200,
			'RON' => 200,
			'RUB' => 50,
			'SEK' => 300,
			'SGD' => 50,
			'THB' => 1000,
			'ZAR' => 50,
		);
		return $amounts[ strtoupper( $currency ) ] ?? 0;
	}

	/**
	 * `aponto_module_status_payments_stripe` — the generic readiness seam (extension-surface §5.1).
	 *
	 * Local and cheap, like `ready`: it is asked while rendering the settings screen and the Modules
	 * catalog, and an HTTP call here would make both pages as slow as the gateway.
	 *
	 * The two optional fields are here because a Stripe operator either types them into Stripe's own
	 * dashboard by hand or registers them with one press of the panel's button — and BOTH have to
	 * mean the same endpoint. So the URL is {@see WebhookEndpoint::url()}, built with `rest_url()`
	 * rather than by the panel from `window.location.origin`: an admin reaching WordPress through an
	 * internal hostname or a reverse proxy would otherwise be shown — and would register — an
	 * endpoint Stripe can never reach (D-R40b). The event list is {@see Config::WEBHOOK_EVENTS},
	 * which sits beside the mapper that consumes it and is the same list the one-click route
	 * subscribes.
	 *
	 * READINESS FOLLOWS THE SELECTED MODE (D-R39b). {@see Config::isReady()} resolves the ACTIVE key
	 * set, so a site holding a complete Test set and no Live one is ready in Test and NOT ready the
	 * moment the switch moves — which is exactly the state the message has to name, because the
	 * booking form silently stops offering card payment at that instant.
	 *
	 * @param mixed  $status Status contributed so far (initial `null`).
	 * @param string $code   Module code.
	 * @return array{ready: bool, reason: ?string, message: string, webhook_url: string, webhook_events: list<string>}|null
	 */
	public function moduleStatus( $status, string $code ): ?array {
		unset( $status );

		if ( Config::CODE !== $code ) {
			return null;
		}

		$ready  = $this->config->isReady();
		$active = PaymentRegistry::isActive( Config::CODE );
		$live   = Config::MODE_LIVE === $this->config->mode();

		if ( $ready ) {
			$message = $live
				? __( 'Ready to take payments through Stripe. Live mode: real cards are charged.', 'aponto' )
				: __( 'Ready to take payments through Stripe. Test mode: no real charges.', 'aponto' );
		} elseif ( $active ) {
			// Names the SET, not "your keys": the other mode's set may well be complete, and telling
			// an owner who has just flipped the switch to add keys they already pasted is how a
			// working gateway gets diagnosed as broken.
			$message = $live
				? __( 'Add your LIVE publishable key, secret key and webhook signing secret to finish setup.', 'aponto' )
				: __( 'Add your TEST publishable key, secret key and webhook signing secret to finish setup.', 'aponto' );
		} else {
			$message = __( 'This module is switched off, so Stripe is not offered at checkout.', 'aponto' );
		}

		return array(
			'ready'          => $ready,
			// Stripe has only the two terms: the module is switched off, or the ACTIVE set is
			// missing a credential or holds one this site can no longer open. It transacts in every
			// currency Aponto can express, so `unsupported_currency` never applies here.
			'reason'         => $ready ? null : ( $active ? 'not_configured' : 'module_inactive' ),
			'message'        => $message,
			'webhook_url'    => WebhookEndpoint::url(),
			'webhook_events' => Config::WEBHOOK_EVENTS,
		);
	}

	// -- Readiness and health ---------------------------------------------------------------------

	/**
	 * `aponto_payment_ready_payments_stripe` — can this driver take money right now?
	 *
	 * @param mixed  $ready Initial value (`false`).
	 * @param string $code  Module code.
	 */
	public function ready( $ready, string $code ): bool {
		unset( $ready );

		return Config::CODE === $code && $this->config->isReady();
	}

	/**
	 * `aponto_payment_client_config_payments_stripe` — what the booking page may print about this
	 * gateway BEFORE any booking exists (extension-surface §5b.6).
	 *
	 * The widget mounts the Payment Element on the payment step, which needs the publishable key
	 * before there is an order to create an intent for. That is a different question from the
	 * per-intent `client_params` of {@see PaymentBeginResult}: those describe ONE payment, these
	 * describe the GATEWAY.
	 *
	 * Exactly two values, and the list is closed deliberately. The publishable key is public by
	 * Stripe's own design — it appears in the HTML of every site that takes Stripe — and `mode` is
	 * derived from its prefix, so it reveals nothing the key does not already. **The secret key and
	 * the webhook signing secret must never appear here**, and that is a rule core cannot enforce:
	 * `PaymentRegistry::clientConfig()` bounds the SHAPE (ten scalars, 512 characters each) but has
	 * no way to know which of a driver's strings are secrets. Returning `credentials()` wholesale
	 * would publish both, which is why this method names its two keys rather than filtering a map.
	 *
	 * Empty when the gateway cannot take money. Core already asks only for an OFFERED code, so this
	 * is belt and braces — but the cost of being wrong is a publishable key printed for a gateway
	 * whose configuration is half-finished, and the check is one call.
	 *
	 * @param mixed  $config Config contributed so far (initial `[]`).
	 * @param string $code   Module code.
	 * @return array<string, string>
	 * @param string $currency Optional stored order currency.
	 */
	public function clientConfig( $config, string $code, string $currency = '' ): array {
		unset( $config );

		if ( Config::CODE !== $code || ! $this->config->isReady() ) {
			return array();
		}

		if ( '' !== $currency && Money::UNSUPPORTED_CURRENCY === Money::refusalFor( 1000000, $currency ) ) {
			return array();
		}

		$credentials = $this->config->credentials();

		return array(
			'publishable_key'  => $credentials['publishable_key'],
			'mode'             => $this->config->mode(),
			// Stripe's exponent for the SITE currency (Codex D2). The browser has to hand Elements an
			// amount in STRIPE's smallest unit, and that is not always ours: ISK is zero-decimal in
			// ISO and two-decimal at Stripe, MGA the other way round. Publishing the gateway's
			// exponent lets the widget convert `minor × 10^(gateway_exponent − currency_exponent)`
			// instead of hard-coding a divisor that is wrong for two currencies and three-decimal
			// ones. `PaymentRegistry::clientConfig()` stringifies it, so the wire value is `"2"`.
			'gateway_exponent' => '' === $currency ? $this->config->gatewayExponent() : Money::stripeExponent( $currency ),
		);
	}

	/**
	 * `aponto_payment_mode_payments_stripe` — the derived key mode, for the admin card.
	 *
	 * @param mixed  $mode Initial value (`''`).
	 * @param string $code Module code.
	 */
	public function mode( $mode, string $code ): string {
		unset( $mode );

		return Config::CODE === $code ? $this->config->mode() : '';
	}

	/**
	 * `aponto_test_payments_stripe` — a cheap probe that writes nothing.
	 *
	 * `GET /v1/balance` is the right probe precisely because it is boring: it needs only the key,
	 * touches no object, and a Stripe account answers it in test mode BEFORE it has been activated —
	 * which is the state most operators are in when they press this button.
	 *
	 * @param mixed                 $result  Initial value.
	 * @param ConnectionTestRequest $request Test request.
	 */
	public function test( $result, ConnectionTestRequest $request ): ConnectionTestResult {
		unset( $result );
		if ( Config::CODE !== $request->module_code ) {
			return new ConnectionTestResult( false, 'not_configured', '' );
		}

		$credentials = $this->config->credentials();
		if ( '' === $credentials['secret_key'] ) {
			return new ConnectionTestResult(
				false,
				'not_configured',
				__( 'Add your Stripe publishable key, secret key and webhook signing secret first.', 'aponto' )
			);
		}

		$balance = $this->client( $credentials['secret_key'], 10 )->get( '/v1/balance' );
		if ( $balance instanceof WP_Error ) {
			$classification = (string) ( $balance->get_error_data()['classification'] ?? StripeClient::PERMANENT );

			if ( StripeClient::INVALID_KEY === $classification ) {
				return new ConnectionTestResult(
					false,
					StripeClient::INVALID_KEY,
					__( 'Stripe rejected this secret key. Copy it again from your Stripe dashboard.', 'aponto' )
				);
			}
			if ( StripeClient::RETRYABLE === $classification ) {
				return new ConnectionTestResult(
					false,
					'unreachable',
					__( 'Could not reach Stripe. Check the connection and try again.', 'aponto' )
				);
			}

			return new ConnectionTestResult( false, 'error', __( 'Stripe could not complete the request.', 'aponto' ) );
		}

		return new ConnectionTestResult(
			true,
			ConnectionTestResult::OK,
			Config::MODE_LIVE === $this->config->mode()
				? __( 'Connected to Stripe (live mode).', 'aponto' )
				: __( 'Connected to Stripe (test mode).', 'aponto' )
		);
	}

	// -- Payment verbs ----------------------------------------------------------------------------

	/**
	 * `aponto_payment_begin_payments_stripe` — create the PaymentIntent.
	 *
	 * The money question is settled before any HTTP: {@see Money::refusalFor()} either clears the
	 * amount or names why Stripe cannot take it, so an unrepresentable amount costs a typed error
	 * rather than a gateway round trip and a message an operator cannot act on.
	 *
	 * @param mixed               $result  Initial value (`aponto_payment_driver_missing`).
	 * @param PaymentBeginRequest $request Initiation request.
	 * @param PaymentContext      $context Attempt context.
	 * @return PaymentBeginResult|WP_Error
	 */
	public function begin( $result, PaymentBeginRequest $request, PaymentContext $context ) {
		unset( $result );

		$credentials = $this->config->credentials();
		if ( '' === $credentials['secret_key'] || '' === $credentials['publishable_key'] ) {
			return $this->failure( 'not_configured' );
		}

		$refusal = Money::refusalFor( $request->amount_minor, $request->currency );
		if ( '' !== $refusal ) {
			// DETERMINISTIC, and it says so (D-R40d BUG-3, flag added by D-R40e): an amount Stripe's
			// own currency table cannot express refuses identically on every attempt, so core is told
			// with a flag rather than left to infer it from the `422`. The status stays a hint; the
			// flag is the classifier, because a `422` that came from the PROVIDER can clear.
			return $this->failure( $refusal, 422, true );
		}

		$body = array(
			'amount'                    => Money::toStripe( $request->amount_minor, $request->currency ),
			'currency'                  => strtolower( $request->currency ),
			'automatic_payment_methods' => array(
				'enabled'         => true,
				// V1: synchronous methods only. See the class docblock — a redirect method would
				// return the customer after the hold that protects their slot may have expired.
				'allow_redirects' => 'never',
			),
			// Manual capture is REJECTED (class docblock): the slot is protected by the hold, not by
			// an authorisation the card network expires on its own schedule.
			'capture_method'            => 'automatic',
			'description'               => $this->description( $request ),
			'metadata'                  => array(
				'aponto_order_code' => $request->order_code,
				'aponto_booking_id' => (string) $request->booking_id,
				'aponto_site'       => $this->siteHost(),
			),
		);

		if ( $this->config->sendsReceipt() && '' !== $request->customer_email ) {
			$body['receipt_email'] = $request->customer_email;
		}
		$suffix = $this->config->statementDescriptorSuffix();
		if ( '' !== $suffix ) {
			$body['statement_descriptor_suffix'] = $suffix;
		}

		$client = $this->client( $credentials['secret_key'], $this->budget( $context ) );
		$intent = $client->post(
			'/v1/payment_intents',
			$body,
			$this->idempotencyKey( $context )
		);
		if ( $intent instanceof WP_Error ) {
			return $intent;
		}

		$id     = isset( $intent['id'] ) && is_string( $intent['id'] ) ? $intent['id'] : '';
		$secret = isset( $intent['client_secret'] ) && is_string( $intent['client_secret'] ) ? $intent['client_secret'] : '';
		if ( '' === $id || '' === $secret ) {
			return $this->failure( 'malformed_intent' );
		}

		// THE INTENT STRIPE ANSWERED WITH MUST BE THE ONE WE ASKED FOR (D-R40d, QA run 2 BUG-1).
		// `POST /v1/payment_intents` is idempotent on the key, and while Stripe refuses a replay whose
		// PARAMETERS differ, a replay with identical parameters is answered with the FIRST intent —
		// which, before the key was namespaced per install, was reachable from a second site sharing
		// the account whose order happened to carry the same figures. The metadata is what tells the
		// two apart, and since D-R40e an ABSENT metadata map is retrieved rather than waved through.
		$conflict = $this->assertOwnIntent( $intent, $credentials['secret_key'], $context, $id, $body['amount'], $body['currency'], $request->order_code, $request->booking_id );
		if ( $conflict instanceof WP_Error ) {
			return $conflict;
		}

		return new PaymentBeginResult(
			$id,
			array(
				// A PaymentIntent client secret is browser-facing by Stripe's own design and scoped to
				// this one payment. The publishable key is public. Neither the secret key nor the
				// webhook secret may ever appear here (PaymentBeginResult's contract).
				'client_secret'   => $secret,
				'publishable_key' => $credentials['publishable_key'],
				'mode'            => $this->config->mode(),
			),
			$request->expires_at
		);
	}

	/**
	 * `aponto_payment_capture_payments_stripe` — ask Stripe what actually happened.
	 *
	 * A RETRIEVE, never a confirm: the browser confirms the intent with Stripe's own JS, and this leg
	 * exists to read the authoritative object rather than to believe what the browser reported. Core
	 * requires an exact amount and currency on a `paid` outcome, which is only answerable from the
	 * object itself.
	 *
	 * @param mixed          $result  Initial value.
	 * @param CaptureRequest $request Capture request.
	 * @param PaymentContext $context Attempt context.
	 * @return PaymentOutcome|WP_Error
	 */
	public function capture( $result, CaptureRequest $request, PaymentContext $context ) {
		unset( $result );

		$credentials = $this->config->credentials();
		if ( '' === $credentials['secret_key'] ) {
			return $this->failure( 'not_configured' );
		}

		$intent = $this->client( $credentials['secret_key'], $this->budget( $context ) )->get( '/v1/payment_intents/' . rawurlencode( $request->gateway_ref ) );
		if ( $intent instanceof WP_Error ) {
			return $intent;
		}

		// The intent must be the one this order created. A mismatch is never reported as PAID and
		// never as a generic failure either: it means two references have been crossed, and that is a
		// finding an operator has to see.
		$metadata   = isset( $intent['metadata'] ) && is_array( $intent['metadata'] ) ? $intent['metadata'] : array();
		$order_code = isset( $metadata['aponto_order_code'] ) && is_string( $metadata['aponto_order_code'] ) ? $metadata['aponto_order_code'] : '';
		if ( '' !== $order_code && '' !== $request->order_code && $order_code !== $request->order_code ) {
			return $this->failure( 'reference_conflict' );
		}

		$id     = isset( $intent['id'] ) && is_string( $intent['id'] ) ? $intent['id'] : $request->gateway_ref;
		$status = isset( $intent['status'] ) && is_string( $intent['status'] ) ? $intent['status'] : '';
		// SHAPE-CHECKED, like the mapper (2026-09-05). `strtoupper()` on any string produces a
		// non-empty string, so the `'' === $currency` guard below passed for `"usd "`, `"US"` or a
		// rewritten payload — and core would then compare that against the order's currency and
		// record an `amount_mismatch` for what is really an unreadable response. Anything that is not
		// three A-Z letters is treated as no currency at all, which routes it to the PENDING +
		// `unverified_amount` branch: assert nothing, keep the hold, settle later from an object that
		// does state its figures.
		$currency = isset( $intent['currency'] ) && is_string( $intent['currency'] ) ? strtoupper( trim( $intent['currency'] ) ) : '';
		$currency = 1 === preg_match( '/^[A-Z]{3}$/', $currency ) ? $currency : '';

		if ( 'succeeded' === $status ) {
			// FAIL CLOSED on an unverifiable figure (Codex D1). `amount_received` is what Stripe
			// COLLECTED; `amount` is what was asked for. Core requires an exact amount on a `paid`
			// outcome precisely so that "the gateway said paid" is never enough on its own — and
			// falling back to `amount`, or to `0`, would hand it a number this driver did not read
			// from the settled object. `is_int()` rather than `is_numeric()`: Stripe sends a JSON
			// number, so a string here means the payload was rewritten in transit.
			$received = array_key_exists( 'amount_received', $intent ) && is_int( $intent['amount_received'] )
				? $intent['amount_received']
				: -1;

			if ( $received <= 0 || '' === $currency ) {
				// PENDING is the one status that asserts nothing: the hold stays alive, the customer
				// can still finish, and a later retrieve or webhook settles it from an object that
				// does state its figures.
				return new PaymentOutcome( PaymentOutcome::PENDING, 0, $currency, '', $id, 'unverified_amount', null );
			}

			return new PaymentOutcome(
				PaymentOutcome::PAID,
				Money::toMinor( $received, $currency ),
				$currency,
				$id,
				$id,
				'',
				$this->instant( $intent['created'] ?? null )
			);
		}

		if ( 'canceled' === $status ) {
			return new PaymentOutcome( PaymentOutcome::EXPIRED, 0, $currency, '', $id, 'canceled', $this->instant( $intent['created'] ?? null ) );
		}

		// Everything else is PENDING — the one value that asserts nothing. `requires_payment_method`,
		// `requires_confirmation`, `requires_action` and `processing` are the ORDINARY in-flight
		// states of an intent the customer is still working through: they carry NO failure code,
		// because core now records a pending code on the row and shows it to the customer, and
		// labelling "you have not finished yet" as a reason would put an explanation on a screen
		// where nothing has gone wrong. `requires_capture` is the exception — it can only appear if
		// somebody changed `capture_method` outside this code, so it keeps a code an operator can
		// search for rather than stalling silently.
		$failure = 'requires_capture' === $status ? 'unexpected_capture_method' : '';

		return new PaymentOutcome( PaymentOutcome::PENDING, 0, $currency, '', $id, $failure, null );
	}

	/**
	 * `aponto_payment_void_payments_stripe` — cancel an uncaptured intent.
	 *
	 * `already_paid` is the outcome this verb exists for: the money arrived while core was deciding
	 * to release the slot, and the caller must APPLY the payment rather than cancel the hold. Stripe
	 * says it as a `400 payment_intent_unexpected_state`, so the branch is recognised by that code
	 * and then CONFIRMED by re-reading the intent — a cancel can also fail with that code for an
	 * intent that is already `canceled`, and the two must not be confused.
	 *
	 * @param mixed          $result  Initial value.
	 * @param VoidRequest    $request Void request.
	 * @param PaymentContext $context Attempt context.
	 * @return VoidResult|WP_Error
	 */
	public function void( $result, VoidRequest $request, PaymentContext $context ) {
		unset( $result );

		if ( '' === $request->gateway_ref ) {
			return new VoidResult( VoidResult::NOT_REQUIRED );
		}
		$credentials = $this->config->credentials();
		if ( '' === $credentials['secret_key'] ) {
			return $this->failure( 'not_configured' );
		}

		$client   = $this->client( $credentials['secret_key'], $this->budget( $context ) );
		$canceled = $client->post(
			'/v1/payment_intents/' . rawurlencode( $request->gateway_ref ) . '/cancel',
			array( 'cancellation_reason' => 'abandoned' ),
			$this->idempotencyKey( $context )
		);

		if ( ! $canceled instanceof WP_Error ) {
			return new VoidResult( VoidResult::VOIDED );
		}

		$data   = is_array( $canceled->get_error_data() ) ? $canceled->get_error_data() : array();
		$reason = (string) ( $data['reason'] ?? '' );
		if ( 'payment_intent_unexpected_state' !== $reason ) {
			return $canceled;
		}

		// Read the authoritative object before deciding which unexpected state it is.
		$intent = $client->get( '/v1/payment_intents/' . rawurlencode( $request->gateway_ref ) );
		if ( $intent instanceof WP_Error ) {
			return $intent;
		}
		$status = isset( $intent['status'] ) && is_string( $intent['status'] ) ? $intent['status'] : '';

		if ( 'succeeded' === $status ) {
			return new VoidResult( VoidResult::ALREADY_PAID, isset( $intent['id'] ) && is_string( $intent['id'] ) ? $intent['id'] : $request->gateway_ref );
		}
		if ( 'canceled' === $status ) {
			// Cancelling a cancelled intent is the outcome cancel was asked to achieve.
			return new VoidResult( VoidResult::VOIDED );
		}

		return $canceled;
	}

	/**
	 * `aponto_payment_refund_payments_stripe` — refund all or part of a settled charge.
	 *
	 * The mode guard is not paranoia. Keys get swapped from test to live on the day a site goes
	 * live, and the transactions from the test period stay in the ledger; refunding one of them with
	 * a live key would either fail confusingly or — worse, if the ids happened to resolve — move real
	 * money for a payment that never happened. `livemode` on the intent is the authoritative answer
	 * to "was this taken with the keys that are in force now", so it is read rather than remembered.
	 *
	 * @param mixed          $result  Initial value.
	 * @param RefundRequest  $request Refund request.
	 * @param PaymentContext $context Attempt context.
	 * @return RefundResult|WP_Error
	 */
	public function refund( $result, RefundRequest $request, PaymentContext $context ) {
		unset( $result );

		$credentials = $this->config->credentials();
		if ( '' === $credentials['secret_key'] ) {
			return $this->failure( 'not_configured' );
		}

		$refusal = Money::refusalFor( $request->amount_minor, $request->currency );
		if ( '' !== $refusal ) {
			// Same class of refusal as on `begin`, so it carries the same flag (D-R40e).
			return $this->failure( $refusal, 422, true );
		}

		// BEFORE ANY HTTP (D-R39c, Codex A.3). The cross-environment check used to read `livemode`
		// off a retrieve made with the ACTIVE key — but a live key cannot see a test payment, so the
		// retrieve returned `resource_missing` and the operator got `502 try again` forever instead
		// of the one sentence that fixes it. The mode the charge was taken in now travels on the
		// request, recorded by this driver when it created the intent.
		$active = $this->config->mode();
		if ( '' !== $request->gateway_mode && $request->gateway_mode !== $active ) {
			return $this->modeMismatch( $request->gateway_mode );
		}

		$client = $this->client( $credentials['secret_key'], $this->budget( $context ) );
		$intent = $client->get( '/v1/payment_intents/' . rawurlencode( $request->gateway_ref ) );
		if ( $intent instanceof WP_Error ) {
			return $intent;
		}

		// The charge this intent settled on, read from the AUTHORITATIVE object rather than from the
		// refund response that is about to be judged (D-R40e, verify A.2/B.5). It is what makes the
		// refund's own `charge` field comparable: both of this row's stored references are the INTENT
		// id, so without this a `ch_…` could be neither confirmed nor contradicted.
		$latest_charge = isset( $intent['latest_charge'] ) && is_string( $intent['latest_charge'] ) ? $intent['latest_charge'] : '';

		// The BELT to the pre-flight check's braces: a row written before the mode was recorded
		// carries `''`, and for those the retrieve is still the only evidence available.
		$live     = isset( $intent['livemode'] ) && true === $intent['livemode'];
		$taken_in = $live ? Config::MODE_LIVE : Config::MODE_TEST;
		if ( $taken_in !== $active ) {
			return $this->modeMismatch( $taken_in );
		}

		$refund = $client->post(
			'/v1/refunds',
			array(
				'payment_intent' => $request->gateway_ref,
				'amount'         => Money::toStripe( $request->amount_minor, $request->currency ),
				'reason'         => 'requested_by_customer',
				'metadata'       => array( 'aponto_order_code' => $request->order_code ),
			),
			$this->idempotencyKey( $context )
		);
		if ( $refund instanceof WP_Error ) {
			return $refund;
		}

		$status   = isset( $refund['status'] ) && is_string( $refund['status'] ) ? $refund['status'] : '';
		$id       = isset( $refund['id'] ) && is_string( $refund['id'] ) ? $refund['id'] : '';
		$currency = isset( $refund['currency'] ) && is_string( $refund['currency'] ) ? strtoupper( $refund['currency'] ) : $request->currency;
		$amount   = isset( $refund['amount'] ) && is_numeric( $refund['amount'] ) ? Money::toMinor( (int) $refund['amount'], $currency ) : 0;

		// WHOSE REFUND IS THIS? (D-R40e, Codex #2.) Status, amount and currency say what happened;
		// they do not say what it happened TO. A refund row minted before the install salt carries
		// the legacy key, a reconcile re-presents that key, and Stripe answers a key it already knows
		// with the refund it created FOR IT — which on an account shared with another Aponto site is
		// that site's refund. Agreeing amounts and currencies then made it settle this site's order.
		$binding = $this->refundBinding( $refund, $request, $latest_charge );
		if ( self::BINDING_WRONG === $binding ) {
			$this->log( 'aponto_payment_anomaly', 'error', 'Stripe returned a refund that belongs to another payment.', 'refund_reference_conflict', 'refund' );

			return $this->failure( 'refund_reference_conflict', 409 );
		}

		if ( 'succeeded' === $status || 'pending' === $status ) {
			if ( self::BINDING_OK !== $binding ) {
				// PENDING, not a failure and not a settlement: Stripe says the money moved, so telling
				// the operator it did not would be a lie, and settling on a relation we could not read
				// is how another site's refund closes this order. The row stays reserved and the
				// `refund.*` webhook — which states the intent it belongs to — finishes it. Same shape
				// and same reasoning as `unverified_amount` on the capture leg.
				//
				// AND THE ANOMALY IS WRITTEN WHATEVER STRIPE'S STATUS SAID (D-R40e, verify B.5). The
				// first cut logged it only when the status was `succeeded`, so an unbindable refund
				// Stripe reported as `pending` left the row waiting on a webhook with nothing in the
				// log to say why — which is the reading D-R40e's "unverifiable ⇒ PENDING + anomaly"
				// exists to make possible. Exactly one line, from this one place.
				$this->log( 'aponto_payment_anomaly', 'error', 'Stripe reported a refund that could not be bound to this payment.', 'refund_unverified', 'refund' );

				return new RefundResult( RefundResult::PENDING, $id, 0, $currency );
			}

			return new RefundResult(
				'succeeded' === $status ? RefundResult::SUCCEEDED : RefundResult::PENDING,
				$id,
				$amount,
				$currency
			);
		}

		// `failed` and `canceled`: Stripe accepted the request and then did not return the money.
		// Reporting it as an unrecognised RefundResult would settle an order against a refund that
		// never happened, so it is a driver failure instead.
		return $this->failure( 'refund_' . ( '' === $status ? 'unknown' : $status ) );
	}

	/**
	 * A refund refused because the payment belongs to the OTHER Stripe environment (D-R39b).
	 *
	 * A STATE problem, not a gateway failure: the site holds both key sets, so an order paid in test
	 * mode is still in the ledger after the owner goes live, and a live key cannot refund it.
	 * `502, try again` sends them round a loop; naming the switch is the whole fix, and it is two
	 * clicks away.
	 *
	 * @param string $taken_in The mode the charge was taken in.
	 */
	private function modeMismatch( string $taken_in ): WP_Error {
		return new WP_Error(
			'aponto_payment_state',
			Config::MODE_TEST === $taken_in
				? __( 'This payment was taken in test mode; switch the module to Test mode to refund it.', 'aponto' )
				: __( 'This payment was taken in live mode; switch the module to Live mode to refund it.', 'aponto' ),
			array(
				'status'         => 409,
				'classification' => StripeClient::PERMANENT,
				'reason'         => 'mode_mismatch',
				'decline_code'   => '',
			)
		);
	}

	/**
	 * `aponto_payment_verify_webhook_payments_stripe` — authenticate, then normalize.
	 *
	 * The ORDER is the contract: the body is not decoded until the signature over its RAW bytes has
	 * passed. Parsing first would run a JSON decoder on unauthenticated input and, worse, would
	 * invite a later edit to make a decision from a payload nobody has verified.
	 *
	 * @param mixed          $result  Initial value.
	 * @param WebhookRequest $request Raw webhook request.
	 * @return WebhookEvent|WP_Error
	 */
	public function verifyWebhook( $result, WebhookRequest $request ) {
		unset( $result );

		$active    = $this->config->mode();
		$signature = $request->header( 'Stripe-Signature' );
		$now       = $this->clock->now()->getTimestamp();

		// EVERY PRESENT SECRET IS TRIED, INDEPENDENTLY, ACTIVE FIRST (D-R39c, Codex A.4). The first
		// cut returned `not_configured` the moment the ACTIVE set had no signing secret — which is
		// precisely the state an owner is in for the minutes between switching to Live and finishing
		// the live setup, and during those minutes every queued TEST delivery was answered `400`.
		// Stripe retries a 400 for three days and then disables the endpoint, so a half-finished
		// switch could cost the site the endpoint it was about to need.
		$secrets = array();
		foreach ( array( $active, Config::MODE_TEST === $active ? Config::MODE_LIVE : Config::MODE_TEST ) as $mode ) {
			$secret = $this->config->credentialsFor( $mode )['webhook_secret'];
			if ( '' !== $secret ) {
				$secrets[ $mode ] = $secret;
			}
		}

		if ( array() === $secrets ) {
			return $this->failure( 'not_configured', 400 );
		}

		$signed_by = '';
		foreach ( $secrets as $mode => $secret ) {
			if ( Signature::verify( $request->body, $signature, $secret, $now ) ) {
				$signed_by = (string) $mode;
				break;
			}
		}

		if ( '' === $signed_by ) {
			return $this->failure( 'signature_invalid', 400 );
		}

		$payload = json_decode( $request->body, true );
		if ( ! is_array( $payload ) ) {
			return $this->failure( 'unparseable_body', 400 );
		}

		// The event's own `livemode` is checked against the mode of the secret that ACTUALLY
		// verified it, not against the active mode: a genuine test event on the test endpoint is
		// consistent, and it is the inconsistent pair — a live event signed by the test secret —
		// that is a forgery or a misconfigured endpoint and must still be refused outright.
		$event = EventMapper::map( $payload, $signed_by, $this->siteHost() );
		if ( null === $event ) {
			return $this->failure( 'event_invalid', 400 );
		}

		if ( $signed_by !== $active ) {
			// THE OTHER MODE'S ENDPOINT. Stripe keeps delivering — and retrying — events queued
			// before the owner flipped the switch, and each mode has its own signing secret.
			// Answering `400` would make the gateway retry for days and eventually disable an
			// endpoint that works perfectly; `200 ignored` tells the truth: the signature is genuine,
			// it just belongs to the mode this site is no longer running. It is NEVER applied.
			//
			// `FOREIGN_MODE` marks it so core can answer BEFORE the replay ledger claims a row
			// (D-R39c, Codex A.5): these events are authenticated by a secret the site is not using,
			// so a holder of the retired secret could otherwise mint an unbounded number of 30-day
			// ledger rows on a live site just by replaying with fresh ids.
			return new WebhookEvent(
				$event->event_id,
				WebhookEvent::IGNORED,
				$event->gateway_ref,
				'',
				0,
				'',
				'',
				0,
				$event->occurred_at,
				WebhookEvent::FOREIGN_MODE
			);
		}

		// Two findings that change nothing in the state machine but that an operator must be able to
		// see: why a card was declined, and that a dispute was opened. Both go to the operational log
		// under the allow-listed context, never into the event.
		if ( WebhookEvent::PAYMENT_FAILED === $event->type ) {
			$this->log( 'aponto_payment_failed', 'warning', 'Stripe reported a failed payment attempt.', EventMapper::declineCode( $payload ), 'webhook' );
		}
		if ( WebhookEvent::IGNORED === $event->type && 'payment_intent.succeeded' === $event->raw_type ) {
			// A `succeeded` event the mapper refused to settle (Codex D1): it stated no usable
			// `amount_received` or no currency. Nothing is applied, and an operator has to be able
			// to find out why a payment that Stripe shows as successful did not move the order.
			$this->log( 'aponto_payment_anomaly', 'error', 'Stripe reported a payment with no verifiable settled amount.', 'unverified_amount', 'webhook' );
		}
		if ( 'charge.dispute.created' === $event->raw_type ) {
			$this->log( 'aponto_payment_anomaly', 'error', 'Stripe opened a dispute against a payment.', 'dispute_created', 'webhook' );
		}

		return $event;
	}

	// -- Internals --------------------------------------------------------------------------------

	/**
	 * A client bound to a secret key and a timeout that fits the caller's budget.
	 *
	 * The key is PASSED IN rather than re-read, so one verb decrypts the vault once. Each verb
	 * already has to read the credentials to decide whether it can run at all, and a `credentials()`
	 * call inside here made that two or three decryptions per payment for no gain.
	 *
	 * @param string $secret_key Stripe secret or restricted key.
	 * @param int    $seconds    Seconds available.
	 */
	private function client( string $secret_key, int $seconds ): StripeClient {
		return new StripeClient( $secret_key, $seconds );
	}

	/**
	 * Seconds left in this attempt's budget.
	 *
	 * @param PaymentContext $context Attempt context.
	 */
	private function budget( PaymentContext $context ): int {
		return $context->secondsLeft( $this->clock->now()->getTimestamp() );
	}

	/**
	 * The `Idempotency-Key` for one POST.
	 *
	 * The VERB SUFFIX is load-bearing and is a correction to the brief's "use the context key
	 * verbatim". Core hands `void` the SAME `payments:{order}:charge:{n}` key it handed `begin`
	 * (`PaymentService::releaseHold()`), and Stripe refuses a key that is reused with different
	 * parameters — so an unsuffixed void would fail with `idempotency_key_in_use` on exactly the
	 * path whose job is to stop a customer paying for a slot that is being released. The suffix is
	 * deterministic, so a retry of the same work still presents the same key.
	 *
	 * @param PaymentContext $context Attempt context.
	 */
	private function idempotencyKey( PaymentContext $context ): string {
		return $context->idempotency_key . ':' . $context->verb;
	}

	/**
	 * The gateway-facing description: the service, then the order code an operator can search for.
	 *
	 * @param PaymentBeginRequest $request Initiation request.
	 */
	private function description( PaymentBeginRequest $request ): string {
		$name = trim( $request->description );

		return '' === $name ? $request->order_code : $name . ' · ' . $request->order_code;
	}

	/**
	 * Host of this site, for the cross-site metadata guard.
	 */
	private function siteHost(): string {
		$host = wp_parse_url( home_url(), PHP_URL_HOST );

		return is_string( $host ) ? $host : '';
	}

	/**
	 * A UTC instant from a Stripe unix timestamp.
	 *
	 * @param mixed $created Stripe `created` value.
	 */
	private function instant( $created ): ?\DateTimeImmutable {
		if ( ! is_numeric( $created ) || (int) $created <= 0 ) {
			return null;
		}

		return new \DateTimeImmutable( '@' . (int) $created );
	}

	/**
	 * Refuse an intent that is not the one this call asked to create (D-R40d, tightened by D-R40e).
	 *
	 * ABSENT IS NO LONGER TOLERATED HERE (Codex #1). The rule was borrowed from the capture leg,
	 * where an intent may legitimately have been created by something other than this plugin; on
	 * `begin` the object was created one HTTP call ago at OUR request, so a response with no metadata
	 * is not a stranger's intent — it is a rewritten or replayed payload, which is the case the check
	 * exists for. A missing binding costs a RETRIEVE and the fields are required on that read; still
	 * missing is refused exactly like a mismatch, and nothing is returned as a live intent.
	 *
	 * @param array<string, mixed> $intent     Created PaymentIntent.
	 * @param string               $secret_key Stripe secret, for the retrieval's own client.
	 * @param PaymentContext       $context    Attempt context, re-read for the retrieval's budget.
	 * @param string               $intent_id  The intent id Stripe answered with.
	 * @param int                  $amount     Amount asked for, in Stripe's own smallest unit.
	 * @param string               $currency   Lower-case currency asked for.
	 * @param string               $order_code This site's order code.
	 * @param int                  $booking_id The booking this intent pays for.
	 * @return WP_Error|null Null when the intent is ours.
	 */
	private function assertOwnIntent( array $intent, string $secret_key, PaymentContext $context, string $intent_id, int $amount, string $currency, string $order_code, int $booking_id ): ?WP_Error {
		$verdict = $this->intentBinding( $intent, $amount, $currency, $order_code, $booking_id );

		if ( self::BINDING_INCOMPLETE === $verdict ) {
			// A RETRIEVE carries no `Idempotency-Key`, so it cannot be answered out of the replay
			// cache the create call may have been answered from.
			//
			// A FRESH CLIENT, ON WHAT IS LEFT OF THE BUDGET (D-R40e, verify B.2). Reusing the client
			// built before the POST gave the GET the timeout the POST had been sized with, so a
			// create that took most of the attempt's seconds could be followed by a retrieve allowed
			// to take them all again — twice the `PaymentContext` deadline on the one leg that runs
			// inline while a visitor waits.
			$fetched = $this->client( $secret_key, $this->budget( $context ) )->get( '/v1/payment_intents/' . rawurlencode( $intent_id ) );

			// A RETRIEVE THAT DID NOT ARRIVE IS NOT A VERDICT (D-R40e, verify B.2). A timed-out GET
			// says nothing about the intent, and the intent certainly exists — the create that named
			// it succeeded. Core is told the verification is UNAVAILABLE, so the attempt stays live
			// and the retry replays the same key onto the same object instead of minting a second.
			if ( $fetched instanceof WP_Error ) {
				return self::verificationUnavailable();
			}

			$verdict = $this->intentBinding( $fetched, $amount, $currency, $order_code, $booking_id );
			if ( self::BINDING_INCOMPLETE === $verdict ) {
				$verdict = self::BINDING_WRONG;
			}
		}

		if ( self::BINDING_OK === $verdict ) {
			return null;
		}

		$this->log( 'aponto_payment_anomaly', 'error', 'Stripe returned an intent that does not match the one requested.', 'begin_reference_conflict', 'begin' );

		return $this->failure( 'reference_conflict', 409 );
	}

	/**
	 * Read a refund's binding to the charge it is supposed to give back (D-R40e, Codex #2).
	 *
	 * `payment_intent` is the authoritative half — it is the very reference this driver stores as the
	 * charge's `gateway_ref` — and `charge` is accepted as a fallback for the same reason a retrieve
	 * is: an older API version can answer with one and not the other. The order metadata is required
	 * alongside it, because the two together are what say "this refund, of this payment, for this
	 * order"; a reference alone would still match a refund of the right intent raised elsewhere.
	 *
	 * @param array<string, mixed> $refund        Refund object.
	 * @param RefundRequest        $request       The refund core asked for.
	 * @param string               $latest_charge `latest_charge` of the intent this call retrieved.
	 * @return string One of the `BINDING_*` verdicts.
	 */
	private function refundBinding( array $refund, RefundRequest $request, string $latest_charge = '' ): string {
		$intent   = isset( $refund['payment_intent'] ) && is_string( $refund['payment_intent'] ) ? $refund['payment_intent'] : '';
		$charge   = isset( $refund['charge'] ) && is_string( $refund['charge'] ) ? $refund['charge'] : '';
		$metadata = isset( $refund['metadata'] ) && is_array( $refund['metadata'] ) ? $refund['metadata'] : array();
		$code     = isset( $metadata['aponto_order_code'] ) && is_string( $metadata['aponto_order_code'] ) ? $metadata['aponto_order_code'] : '';

		// The charge-level references this refund may legitimately name. `latest_charge` comes from
		// the intent this very call retrieved a moment ago, which is what makes `charge` comparable
		// at all: this driver stores the INTENT id in both of the row's reference columns, so without
		// it a perfectly ordinary `ch_…` would have nothing to be measured against.
		$charge_refs = array();
		foreach ( array( $latest_charge, $request->payment_ref, $request->gateway_ref ) as $candidate ) {
			if ( '' !== $candidate && ! in_array( $candidate, $charge_refs, true ) ) {
				$charge_refs[] = $candidate;
			}
		}

		// PRESENT-AND-WRONG NEVER DEGRADES TO INCOMPLETE (D-R40e, verify A.2/B.5). Each relation
		// field is judged on its OWN merits: the first cut only refused on `payment_intent`, so a
		// contradictory `charge` was waved through when the intent agreed and softened to "not
		// stated" when the intent was absent — turning a response that actively names another
		// payment into a row that stays pending waiting for a webhook that will never come.
		if ( '' !== $intent && '' !== $request->gateway_ref && $intent !== $request->gateway_ref ) {
			return self::BINDING_WRONG;
		}
		if ( '' !== $code && '' !== $request->order_code && $code !== $request->order_code ) {
			return self::BINDING_WRONG;
		}

		$charge_known = '' !== $charge && in_array( $charge, $charge_refs, true );
		if ( '' !== $charge && ! $charge_known && '' !== $latest_charge ) {
			// The authoritative intent NAMED its charge and this is not it. Refused whatever
			// `payment_intent` said, and refused rather than softened to "not stated" when
			// `payment_intent` said nothing — a contradiction is evidence, not silence.
			//
			// The `latest_charge` guard is what keeps the rule honest: a value can only be called
			// wrong against one this call actually knows, and an API version that answers the intent
			// without `latest_charge` leaves this driver with two INTENT-shaped references and no
			// charge-level expectation at all. There, a `ch_…` is unreadable — never evidence for,
			// never evidence against.
			return self::BINDING_WRONG;
		}

		$known = '' !== $intent && $intent === $request->gateway_ref;
		if ( ! $known ) {
			// No usable `payment_intent`: the `charge` reference is the other name for the same
			// payment, so it counts when it matches one this call can vouch for.
			$known = $charge_known;
		}

		if ( ! $known || '' === $code || '' === $request->order_code || $code !== $request->order_code ) {
			return self::BINDING_INCOMPLETE;
		}

		return self::BINDING_OK;
	}

	/**
	 * Read one intent's binding: ours, not ours, or not stated (D-R40e).
	 *
	 * @param array<string, mixed> $intent     PaymentIntent object.
	 * @param int                  $amount     Amount asked for, in Stripe's own smallest unit.
	 * @param string               $currency   Lower-case currency asked for.
	 * @param string               $order_code This site's order code.
	 * @param int                  $booking_id The booking this intent pays for.
	 * @return string One of the `BINDING_*` verdicts.
	 */
	private function intentBinding( array $intent, int $amount, string $currency, string $order_code, int $booking_id ): string {
		$got_amount   = isset( $intent['amount'] ) && is_numeric( $intent['amount'] ) ? (int) $intent['amount'] : null;
		$got_currency = isset( $intent['currency'] ) && is_string( $intent['currency'] ) ? strtolower( $intent['currency'] ) : '';
		$metadata     = isset( $intent['metadata'] ) && is_array( $intent['metadata'] ) ? $intent['metadata'] : array();
		$got_code     = isset( $metadata['aponto_order_code'] ) && is_string( $metadata['aponto_order_code'] ) ? $metadata['aponto_order_code'] : '';
		$got_site     = isset( $metadata['aponto_site'] ) && is_string( $metadata['aponto_site'] ) ? $metadata['aponto_site'] : '';
		// The BOOKING id is compared too (D-R40e, Codex #7): `begin` has always SENT it and no leg
		// ever read it back, so an intent with the right order code but another booking passed.
		$got_booking = isset( $metadata['aponto_booking_id'] ) && is_scalar( $metadata['aponto_booking_id'] )
			? (string) $metadata['aponto_booking_id']
			: '';

		if ( null === $got_amount || '' === $got_currency || '' === $got_code || '' === $got_site || '' === $got_booking ) {
			return self::BINDING_INCOMPLETE;
		}

		if ( $got_amount !== $amount
			|| $got_currency !== $currency
			|| $got_code !== $order_code
			|| $got_site !== $this->siteHost()
			|| $got_booking !== (string) $booking_id
		) {
			return self::BINDING_WRONG;
		}

		return self::BINDING_OK;
	}

	/**
	 * "I created it and then could not read it back" — a RETRYABLE non-verdict (D-R40e, verify B.2).
	 *
	 * Deliberately NOT a `reference_conflict`: that claims the intent belongs to somebody else, and
	 * a timed-out GET supports no such claim. It is also deliberately not an ordinary gateway
	 * failure, because core's begin-failure path retires the row and the next attempt would create a
	 * SECOND intent for one hold. The flag tells core to keep the claim, and with it the key.
	 *
	 * @return WP_Error The retryable non-verdict.
	 */
	private static function verificationUnavailable(): WP_Error {
		return new WP_Error(
			'aponto_stripe_verification_unavailable',
			'Stripe could not be reached to verify the intent it created.',
			array(
				'status'                   => 502,
				'classification'           => StripeClient::RETRYABLE,
				'reason'                   => 'verification_unavailable',
				'decline_code'             => '',
				'deterministic_refusal'    => false,
				// The flag core reads (`PaymentService::isVerificationUnavailable()`): the intent
				// EXISTS under this attempt's key and only the confirming read failed, so the claim
				// must stay alive and the retry must present the same key.
				'verification_unavailable' => true,
			)
		);
	}

	/**
	 * A typed driver failure. The message is stable English for the server log; the customer sees
	 * core's own localized copy, and Stripe's prose reaches neither.
	 *
	 * `deterministic_refusal` is the flag core classifies on (D-R40e, Codex #4). It is set ONLY where
	 * this driver knows the next attempt produces the same answer — {@see Money::refusalFor()}'s
	 * precision and currency refusals — never for a status Stripe returned, because a provider-side
	 * `422` about account state stops being true the moment the account is fixed.
	 *
	 * @param string $reason        Short machine reason — this becomes the logged `code`.
	 * @param int    $status        HTTP status hint for core's own mapping.
	 * @param bool   $deterministic Whether retrying is certain to produce the same refusal.
	 */
	private function failure( string $reason, int $status = 502, bool $deterministic = false ): WP_Error {
		return new WP_Error(
			'aponto_stripe_' . $reason,
			'Stripe driver refused the request.',
			array(
				'status'                => $status,
				'classification'        => StripeClient::PERMANENT,
				'reason'                => $reason,
				'decline_code'          => '',
				'deterministic_refusal' => $deterministic,
			)
		);
	}

	/**
	 * Write one operational line under the payment context allow-list.
	 *
	 * @param string $code     `aponto_payment_failed` or `aponto_payment_anomaly`.
	 * @param string $severity Severity.
	 * @param string $message  Stable English message.
	 * @param string $reason   Short machine reason.
	 * @param string $kind     Verb this happened in.
	 */
	private function log( string $code, string $severity, string $message, string $reason, string $kind ): void {
		if ( ! $this->logger instanceof Logger || '' === $reason ) {
			return;
		}
		$this->logger->log(
			$code,
			$severity,
			$message,
			array(
				'gateway'  => Config::CODE,
				'order_id' => 0,
				'code'     => $reason,
				'kind'     => $kind,
			)
		);
	}
}

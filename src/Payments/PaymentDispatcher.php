<?php
/**
 * Hook-per-key payment verb dispatch (extension-surface §5b.2, §5b.4).
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

use Aponto\Support\Logger;
use WP_Error;

/**
 * The ONLY place a `aponto_payment_*_{key}` filter is applied.
 *
 * Three obligations live here so no caller has to remember them:
 *
 * 1. **Allow-list before interpolation.** `{key}` arrives from a public URL. It is checked against
 *    the registry AND `Plan::has()` before it can become a hook name (extension-surface §1); a code
 *    that fails answers the same typed failure as a missing driver, so a caller cannot tell the two
 *    apart and neither can an attacker.
 * 2. **A missing driver is a value, not a silence.** Every verb starts from
 *    `WP_Error('aponto_payment_driver_missing')` (§5.2), so "nobody answered" and "the driver said
 *    no" are the same shape and both fail closed. A verb returning the initial value is precisely
 *    the case where money must NOT be assumed to have moved.
 * 3. **The return type is checked at the boundary.** A driver that returns the wrong type is a
 *    driver bug, and admitting it would let a `null` or an array flow into the state machine as if
 *    it were an outcome. Wrong type is treated exactly like a driver failure — logged with the
 *    operational code, never surfaced to the customer.
 *
 * Nothing here writes to the database: dispatch is deliberately separable from the state machine so
 * {@see PaymentService} can hold its locks and transactions around it rather than through it.
 */
final class PaymentDispatcher {

	/**
	 * The `WP_Error` code every verb starts from.
	 */
	public const MISSING = 'aponto_payment_driver_missing';

	/**
	 * Construct the dispatcher.
	 *
	 * @param Logger|null $logger Optional structured logger for driver failures.
	 */
	public function __construct( private ?Logger $logger = null ) {}

	/**
	 * Dispatch `ready` — can this driver actually take money right now? (Codex #1)
	 *
	 * Static and boolean, the only verb of that shape, for two reasons. It is asked on READ paths
	 * (rendering the booking form, building boot data) where constructing a dispatcher and a logger
	 * to answer a yes/no question would be waste; and it has no request object because there is
	 * nothing to describe — the driver is being asked about ITSELF, not about an order.
	 *
	 * Defaults to FALSE. A module with no driver attached — which is exactly what
	 * `payments_stripe` is until its driver ships — must not be offered to a customer, however
	 * thoroughly it is shipped and enabled. That default is what keeps an intermediate commit from
	 * advertising a payment method that cannot charge anybody.
	 *
	 * @param string $code Module code (allow-listed here, before any interpolation).
	 */
	public static function isReady( string $code ): bool {
		if ( ! PaymentRegistry::isActive( $code ) ) {
			return false;
		}

		/**
		 * Filter whether a payment driver is configured and able to create intents.
		 *
		 * @param bool   $ready Whether the driver can take money (initial value `false`).
		 * @param string $code  Module code being asked about.
		 */
		return true === apply_filters( PaymentRegistry::verbHook( 'ready', $code ), false, $code ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound -- The name is BUILT by PaymentRegistry::verbHook(), which prefixes `aponto_payment_` and refuses any code the registry does not allow-list; the sniff cannot see through the call.
	}

	/**
	 * The smallest amount a gateway can charge in a currency, in minor units (D-R71a P2).
	 *
	 * Optional verb with a neutral initial value `0` (not the driver-missing error): a driver that does
	 * not answer declares no minimum. Asked on the booking-form path, so drivers answer from constants —
	 * never with HTTP. Negative or non-integer answers count as no minimum.
	 *
	 * @param string $code     Module code (allow-listed by the registry).
	 * @param string $currency ISO currency code.
	 */
	public static function minAmount( string $code, string $currency ): int {
		if ( ! PaymentRegistry::isActive( $code ) ) {
			return 0;
		}

		/**
		 * Filter the minimum chargeable amount of a payment driver.
		 *
		 * @param int    $minimum  Minimum in minor units (initial value `0`).
		 * @param string $currency ISO currency code.
		 */
		$minimum = apply_filters( PaymentRegistry::verbHook( 'min_amount', $code ), 0, strtoupper( $currency ) ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound -- Built by PaymentRegistry::verbHook(), which prefixes `aponto_payment_` and allow-lists the code.

		return is_int( $minimum ) && $minimum > 0 ? $minimum : 0;
	}

	/**
	 * Dispatch `client_config` — the browser-side configuration a gateway's own JS needs BEFORE any
	 * order exists (K, extension-surface §5b.2).
	 *
	 * Separate from `begin` because the two answer different questions at different moments. `begin`
	 * is per-order and needs a hold to exist; this is per-SITE — a publishable key, a locale, an SDK
	 * URL — and the widget needs it while the visitor is still choosing a time, so the payment step
	 * can render before anything is reserved. Dispatched ONLY for offered codes, so a module whose
	 * driver is not configured contributes nothing to a public page.
	 *
	 * The same rule as `client_params` applies and cannot be enforced from here: these values reach an
	 * unauthenticated browser, so a publishable key belongs in them and a secret key never does.
	 *
	 * @param string $code Module code.
	 * @return array<string, scalar> Browser-safe configuration, `[]` when the driver offers none.
	 */
	public static function clientConfig( string $code ): array {
		// One implementation only (merge of the widget and core branches, 2026-09-04): the registry
		// owns the offered-gate, the allow-listed hook name and the bounded public-scalar coercion.
		return PaymentRegistry::clientConfig( $code );
	}

	/**
	 * Dispatch `begin` — create the gateway-side intent for an order.
	 *
	 * @param PaymentBeginRequest $request Initiation request.
	 * @param PaymentContext      $context Attempt context.
	 * @return PaymentBeginResult|WP_Error
	 */
	public function begin( PaymentBeginRequest $request, PaymentContext $context ) {
		$result = $this->dispatch( 'begin', $request->module_code, PaymentBeginResult::class, array( $request, $context ), $request->order_id );

		// A reference core cannot store or look up again is a failed begin, not a successful one
		// (Codex O). Caught HERE, before the caller writes a row claiming to represent a live intent
		// that nothing could ever resolve — the confirm leg would 404 and the webhook would find no
		// order.
		if ( $result instanceof PaymentBeginResult && ! $result->isUsableRef() ) {
			$this->logFailure( $request->module_code, 'begin', $request->order_id, 'invalid_gateway_ref' );

			return new WP_Error(
				'aponto_payment_invalid_result',
				__( 'The payment gateway returned an unexpected response.', 'aponto' ),
				array( 'status' => 502 )
			);
		}

		return $result;
	}

	/**
	 * Dispatch `capture` — ask the gateway what really happened.
	 *
	 * @param CaptureRequest $request  Capture request.
	 * @param PaymentContext $context  Attempt context.
	 * @param int            $order_id Order id, for the failure log only.
	 * @return PaymentOutcome|WP_Error
	 */
	public function capture( CaptureRequest $request, PaymentContext $context, int $order_id = 0 ) {
		return $this->dispatch( 'capture', $request->module_code, PaymentOutcome::class, array( $request, $context ), $order_id );
	}

	/**
	 * Dispatch `void` — best-effort cancellation of an uncaptured intent.
	 *
	 * @param VoidRequest    $request  Void request.
	 * @param PaymentContext $context  Attempt context.
	 * @param int            $order_id Order id, for the failure log only.
	 * @return VoidResult|WP_Error
	 */
	public function void( VoidRequest $request, PaymentContext $context, int $order_id = 0 ) {
		return $this->dispatch( 'void', $request->module_code, VoidResult::class, array( $request, $context ), $order_id );
	}

	/**
	 * Dispatch `refund`.
	 *
	 * @param RefundRequest  $request  Refund request.
	 * @param PaymentContext $context  Attempt context.
	 * @param int            $order_id Order id, for the failure log only.
	 * @return RefundResult|WP_Error
	 */
	public function refund( RefundRequest $request, PaymentContext $context, int $order_id = 0 ) {
		$result = $this->dispatch( 'refund', $request->module_code, RefundResult::class, array( $request, $context ), $order_id );

		// The STATUS enum is enforced here, not trusted (Codex #7). `RefundResult` accepts any string
		// so a driver can be written before this vocabulary is memorised; letting an unrecognised one
		// through would settle an order against a refund whose real state nobody knows.
		if ( $result instanceof RefundResult && ! $result->isAccepted() ) {
			$this->logFailure( $request->module_code, 'refund', $order_id, 'invalid_status' );

			return new WP_Error(
				'aponto_payment_invalid_result',
				__( 'The payment gateway returned an unexpected response.', 'aponto' ),
				array( 'status' => 502 )
			);
		}

		return $result;
	}

	/**
	 * Dispatch `verify_webhook` — signature verification plus normalization.
	 *
	 * Takes no {@see PaymentContext}: before verification succeeds core does not know which order the
	 * request is about, so there is no attempt to describe. This is the one verb whose failure is a
	 * client-visible `400` rather than a `502`, because the caller is the gateway and the answer it
	 * needs is "this request was not from you".
	 *
	 * @param WebhookRequest $request Raw webhook request.
	 * @return WebhookEvent|WP_Error
	 */
	public function verifyWebhook( WebhookRequest $request ) {
		return $this->dispatch( 'verify_webhook', $request->module_code, WebhookEvent::class, array( $request ), 0 );
	}

	/**
	 * Apply one verb filter and validate what came back.
	 *
	 * @param string       $verb     Verb from {@see PaymentRegistry::VERBS}.
	 * @param string       $code     Module code (allow-listed here, before any interpolation).
	 * @param class-string $expected Result class the driver must return.
	 * @param list<object> $args     Filter arguments after the initial value.
	 * @param int          $order_id Order id, for the failure log only.
	 * @return object|WP_Error The driver's typed result, or a `WP_Error`.
	 */
	private function dispatch( string $verb, string $code, string $expected, array $args, int $order_id ) {
		$missing = new WP_Error(
			self::MISSING,
			__( 'This payment gateway is not available on this site.', 'aponto' ),
			array( 'status' => 501 )
		);

		if ( ! PaymentRegistry::isActive( $code ) ) {
			// Deliberately the SAME value as "no driver answered": an inactive module and an
			// unimplemented verb are indistinguishable from outside, which is what keeps the public
			// routes from becoming a module-enumeration oracle.
			return $missing;
		}

		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound -- The name is BUILT by PaymentRegistry::verbHook(), which prefixes `aponto_payment_` and refuses any code the registry does not allow-list; the sniff cannot see through the call.
		$result = apply_filters( PaymentRegistry::verbHook( $verb, $code ), $missing, ...$args );

		if ( $result instanceof $expected ) {
			return $result;
		}

		if ( $result instanceof WP_Error ) {
			$this->logFailure( $code, $verb, $order_id, (string) $result->get_error_code() );

			return $result;
		}

		// A driver answered with something core cannot use. Treated as a failure rather than
		// coerced: a wrong-typed value flowing into the state machine is how a payment gets applied
		// on the strength of a `null`.
		$this->logFailure( $code, $verb, $order_id, 'invalid_result' );

		return new WP_Error(
			'aponto_payment_invalid_result',
			__( 'The payment gateway returned an unexpected response.', 'aponto' ),
			array( 'status' => 502 )
		);
	}

	/**
	 * Record a driver failure with the operational code and its context allow-list.
	 *
	 * The allow-list is `gateway`/`order_id`/`code`/`kind` and nothing else (error-registry):
	 * no amount, no currency, no customer reference, and above all no provider message — those are
	 * exactly the fields that turn a debug log into a PII store.
	 *
	 * @param string $gateway  Module code.
	 * @param string $verb     Verb that failed.
	 * @param int    $order_id Order id (0 when unknown).
	 * @param string $code     Short machine reason.
	 */
	private function logFailure( string $gateway, string $verb, int $order_id, string $code ): void {
		if ( ! $this->logger instanceof Logger ) {
			return;
		}
		$this->logger->log(
			'aponto_payment_failed',
			'warning',
			'Payment driver call failed.',
			array(
				'gateway'  => $gateway,
				'order_id' => $order_id,
				'code'     => $code,
				'kind'     => $verb,
			)
		);
	}
}

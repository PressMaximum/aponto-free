<?php
/**
 * Payment routes: the public confirm/webhook legs and the admin refund (rest-contract §2.21, §3.8,
 * §3.9 — D-R38).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Rest\Controller;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Database\StorageException;
use Aponto\Payments\EventClaim;
use Aponto\Payments\PaymentEventLedger;
use Aponto\Payments\PaymentException;
use Aponto\Payments\PaymentRegistry;
use Aponto\Payments\WebhookEvent;
use Aponto\Payments\WebhookRequest;
use Aponto\Rest\Args;
use Aponto\Rest\Controller;
use Aponto\Rest\Errors;
use Aponto\Rest\Policy;
use Aponto\Rest\Services;
use Aponto\Rest\Support\ClientIp;
use Aponto\Rest\Support\Format;
use Aponto\Rest\Support\RateLimiter;
use Aponto\Support\DomainException;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Three routes, two of them public and unauthenticated — which is why the ORDER of the checks in
 * each handler is part of the contract rather than an implementation detail.
 *
 * **`POST /public/payments/{key}/confirm`** is the widget's leg. It never believes the browser: the
 * `ref` is only used to find a row, and the answer comes from asking the GATEWAY (the `capture`
 * verb). An unknown, foreign or refund-shaped reference gets the uniform `404` that an unknown
 * module code gets, so the route cannot be used to enumerate references.
 *
 * **`POST /public/payments/{key}/webhook`** is the gateway's leg. Its rules are unusual and all
 * three matter: the body is read RAW (a re-encode breaks every signature), every verification
 * failure answers ONE `400` with the same body and timing shape (distinguishing them tells an
 * attacker which secret is close), and a `2xx` is returned only after the durable write COMMITS —
 * a storage failure answers non-2xx precisely so the gateway retries, because a gateway that
 * receives `200` never sends that event again. Which non-2xx depends on WHY (D-R40d): storage that
 * the engine itself calls restartable — a deadlock, a lock-wait timeout — is CONTENTION and answers
 * the same retryable `503` the advisory lock does; only a genuine write failure is `500`. Either
 * way the ledger lease this request owns is handed back before answering, so the retry can reclaim
 * the event at once.
 *
 * **`POST /bookings/{id}/refund`** is ordinary admin surface, and its only subtlety is that the
 * module must be ACTIVE: disabling a gateway keeps its data readable (D-R31) but takes the action
 * away, which is `409 aponto_payment_unavailable` rather than a 404.
 */
final class PaymentsController implements Controller {

	/**
	 * Rate-limit bucket for the confirm leg.
	 */
	private const CONFIRM_BUCKET = 'payments_confirm_ip';

	/**
	 * Rate-limit bucket for the webhook leg.
	 */
	private const WEBHOOK_BUCKET = 'payments_webhook_ip';

	/**
	 * Rate limiter.
	 *
	 * @var RateLimiter
	 */
	private RateLimiter $limiter;

	/**
	 * Construct the controller.
	 *
	 * @param Services $services Service locator.
	 */
	public function __construct( private Services $services ) {
		$this->limiter = new RateLimiter( $services->wpdb(), $services->clock() );
	}

	/**
	 * Register routes.
	 *
	 * @param string $rest_namespace REST namespace.
	 */
	public function register( string $rest_namespace ): void {
		register_rest_route(
			$rest_namespace,
			'/public/payments/(?P<key>[a-z0-9_]+)/confirm',
			array(
				'methods'             => 'POST',
				'permission_callback' => '__return_true',
				'callback'            => array( $this, 'confirm' ),
			)
		);

		register_rest_route(
			$rest_namespace,
			'/public/payments/(?P<key>[a-z0-9_]+)/webhook',
			array(
				'methods'             => 'POST',
				'permission_callback' => '__return_true',
				'callback'            => array( $this, 'webhook' ),
			)
		);

		register_rest_route(
			$rest_namespace,
			'/bookings/(?P<id>\d+)/refund',
			array(
				'methods'             => 'POST',
				'permission_callback' => array( Policy::class, 'manageBookings' ),
				'callback'            => array( $this, 'refund' ),
				'args'                => array( 'id' => Args::argId() ),
			)
		);
	}

	/**
	 * POST /public/payments/{key}/confirm.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function confirm( WP_REST_Request $request ) {
		$key = (string) $request->get_param( 'key' );
		if ( ! PaymentRegistry::isActive( $key ) ) {
			return Errors::notFound();
		}

		$limited = $this->rateLimit( self::CONFIRM_BUCKET, $request );
		if ( null !== $limited ) {
			return $limited;
		}

		$ref = mb_substr( sanitize_text_field( (string) ( $request->get_param( 'ref' ) ?? '' ) ), 0, 191 );
		if ( '' === $ref ) {
			return Errors::validation( array( 'ref' => __( 'A payment reference is required.', 'aponto' ) ) );
		}

		try {
			$state = $this->services->paymentService()->confirm( $key, $ref );
		} catch ( DomainException $exception ) {
			return Errors::fromDomain( $exception );
		}

		if ( null === $state ) {
			return $this->privacyHeaders( rest_convert_error_to_response( Errors::notFound() ) );
		}

		return $this->privacyHeaders( new WP_REST_Response( $state, 200 ) );
	}

	/**
	 * POST /public/payments/{key}/webhook.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function webhook( WP_REST_Request $request ) {
		$key = (string) $request->get_param( 'key' );
		if ( ! PaymentRegistry::isActive( $key ) ) {
			// A disabled or unshipped module answers the uniform 404. Gateways retry a 404 for days
			// and then give up, which is the correct outcome for a site that has turned
			// payments off — and the event ledger keeps a later re-enable idempotent.
			return Errors::notFound();
		}

		$limited = $this->rateLimit( self::WEBHOOK_BUCKET, $request );
		if ( null !== $limited ) {
			return $limited;
		}

		$payments = $this->services->paymentService();

		// RAW body. Never `get_params()`, never a decode-and-re-encode: the signature covers exactly
		// the bytes the gateway transmitted, and a JSON round trip through PHP reorders keys and
		// rewrites escapes, after which every signature fails and the failure looks like a wrong key.
		$webhook = new WebhookRequest(
			$key,
			(string) $request->get_body(),
			$this->headerMap( $request ),
			ClientIp::resolve( (bool) $this->services->settings()->get( 'trusted_proxy' ) ),
			$this->services->clock()->now()
		);

		$event = $this->services->paymentDispatcher()->verifyWebhook( $webhook );
		if ( $event instanceof WP_Error ) {
			return Errors::make( 'aponto_webhook_invalid', 400 );
		}

		// A verified event with no id cannot be de-duplicated, and one longer than the stored column
		// cannot be stored WITHOUT TRUNCATION (Codex #17) — and truncating would let two different
		// events sharing a 150-character prefix collide on the unique key, the second answered
		// "duplicate" for work nobody did. Both are refused, and both read to the gateway exactly like
		// any other verification failure.
		$event_id = $event->event_id;
		if ( ! PaymentEventLedger::isStorableEventId( $event_id ) ) {
			return Errors::make( 'aponto_webhook_invalid', 400 );
		}

		// ANSWERED BEFORE THE LEDGER TOUCHES IT (D-R39c, Codex A.5). An event a driver marks
		// `foreign_mode` verified against a credential set this site is NOT using — a delivery queued
		// before an environment switch, or a replay by whoever still holds the retired secret. There
		// is nothing to de-duplicate, because there is nothing to apply; claiming a row for it would
		// let that holder fill a thirty-day table with fresh event ids at no cost. The `200` is what
		// stops the gateway retrying a delivery that will never be wanted.
		if ( $event->isForeignMode() ) {
			return new WP_REST_Response(
				array(
					'received' => true,
					'ignored'  => true,
				),
				200
			);
		}

		$ledger = $this->services->paymentEventLedger();

		try {
			$claim = $ledger->claim( $key, $event_id, $event->type );
		} catch ( StorageException $failure ) {
			// CONTENTION REACHES THE CLAIM STEP TOO (D-R40e, Codex #5). D-R40d classified storage
			// failures around `applyEvent()` and left this one answering a bare `500` with no trace —
			// which is backwards, because the conditional INSERT here is precisely where several
			// deliveries of ONE event collide: it is the row they all race for. A deadlock, a lock
			// wait or a `SQLITE_BUSY` on it is the engine saying "restart the transaction", and the
			// honest translation for a gateway is the same retryable `503` the advisory lock gets.
			// No claim is released: this request never got one.
			$restartable = $failure->isRestartable();
			$this->logWebhookFailure( $key, $failure, $restartable ? 'storage_contention' : 'storage_failed' );

			return $restartable ? Errors::lockTimeout() : Errors::internal();
		}

		if ( PaymentEventLedger::CLAIM_DUPLICATE === $claim->status ) {
			return new WP_REST_Response(
				array(
					'received'  => true,
					'duplicate' => true,
				),
				200
			);
		}

		if ( ! $claim->isOwned() ) {
			// Another worker holds a FRESH lease. Neither answer available to us is true — the event
			// is neither finished nor ours to apply — so the gateway is told to come back, which is
			// the one response that cannot lose a payment (Codex #5).
			return Errors::lockTimeout();
		}

		try {
			$result = $payments->applyEvent( $key, $event );
		} catch ( DomainException $failure ) {
			// A CONTENDED LOCK IS NOT AN INTERNAL ERROR (QA follow-up). Stripe delivers the events of
			// one refund in the same second, so several of them race for the same per-order lock and
			// the losers raise `PaymentLockTimeout` — a retryable `503 aponto_lock_timeout`, which is
			// exactly what the gateway should be told. Collapsing it into `500` said "this site is
			// broken" about ordinary, expected contention, and buried the one signal an operator
			// would use to tell the two apart.
			return $this->releaseAndFail( $ledger, $key, $event_id, $claim, Errors::fromDomain( $failure ) );
		} catch ( StorageException $failure ) {
			// CONTENTION REACHES US AS STORAGE TOO (QA run 2 BUG-2). `PaymentLockTimeout` covers the
			// advisory lock; an InnoDB deadlock or a lock-wait timeout raised INSIDE the apply's own
			// transaction arrives as a `StorageException`, which is a `RuntimeException` and not a
			// `DomainException` — so it fell through to the generic catch below and was answered
			// `500`. The engine itself says "restart the transaction"; the honest translation of that
			// for a gateway is the same retryable `503` the advisory lock gets.
			$restartable = $failure->isRestartable();
			$this->logWebhookFailure( $key, $failure, $restartable ? 'storage_contention' : 'storage_failed' );

			return $this->releaseAndFail(
				$ledger,
				$key,
				$event_id,
				$claim,
				$restartable ? Errors::lockTimeout() : Errors::internal()
			);
		} catch ( \Throwable $failure ) {
			// EVERY UNEXPECTED THROWABLE IS LOGGED (QA run 2 BUG-2). The first cut did `unset()` and
			// answered `500`, so the one bug that produced a 500 on this route left no trace anywhere
			// — an empty `debug.log` and a `processing` row were the entire evidence. The exception
			// CLASS is a safe machine token; its message is not (it can quote SQL values or provider
			// prose), so it never leaves the process.
			$this->logWebhookFailure( $key, $failure, 'unexpected' );

			return $this->releaseAndFail( $ledger, $key, $event_id, $claim, Errors::internal() );
		}

		// CHECKED, AND THE TWO FAILURES ARE DIFFERENT (Codex #5 + E). This write is what turns the
		// lease into "finished", so answering the gateway 2xx on the strength of a write that never
		// landed would leave a `processing` row for somebody to reclaim and re-apply later.
		//
		// LOST means our lease expired mid-apply and another worker reclaimed the event. The apply we
		// just ran may have been a no-op or a duplicate that the state machine absorbed, and the
		// worker that owns the lease now is the one entitled to close it; 503 is the honest answer —
		// come back, and by then the owner will have finished. FAILED means storage would not take
		// the write at all, which is a 500 and an ordinary gateway retry.
		$recorded = $ledger->record( $key, $event_id, $result['status'], $result['order_id'] > 0 ? $result['order_id'] : null, $claim );
		if ( PaymentEventLedger::RECORD_LOST === $recorded ) {
			return Errors::lockTimeout();
		}
		if ( PaymentEventLedger::RECORD_DONE !== $recorded ) {
			return $this->releaseAndFail( $ledger, $key, $event_id, $claim, Errors::internal() );
		}

		$body = array( 'received' => true );
		if ( PaymentEventLedger::STATUS_IGNORED === $result['status'] ) {
			$body['ignored'] = true;
		}

		return new WP_REST_Response( $body, 200 );
	}

	/**
	 * Expire the lease this request owns, then answer (QA run 2 BUG-2).
	 *
	 * Every non-2xx answer given while WE hold the claim ends here, so the ledger never keeps a
	 * `processing` row whose owner has already given up. The row itself stays — it is the unique key
	 * that stops two deliveries of one event both inserting — and only the lease is back-dated, so
	 * the gateway's retry reclaims it on the next delivery instead of being told `in_progress` for
	 * another two minutes. The apply is written to be safe to run twice, which is what makes handing
	 * the claim back the right answer rather than a hopeful one.
	 *
	 * @param PaymentEventLedger $ledger   Ledger.
	 * @param string             $key      Module code.
	 * @param string             $event_id Provider event id.
	 * @param EventClaim         $claim    The claim this request won.
	 * @param WP_Error           $answer   The answer to return.
	 */
	private function releaseAndFail( PaymentEventLedger $ledger, string $key, string $event_id, EventClaim $claim, WP_Error $answer ): WP_Error {
		try {
			$ledger->releaseClaim( $key, $event_id, $claim );
		} catch ( \Throwable $ignored ) {
			unset( $ignored ); // Best effort: the lease expires on its own in 120 s either way.
		}

		return $answer;
	}

	/**
	 * Record one webhook failure under the payment context allow-list (extension-surface §5b.4).
	 *
	 * The exception CLASS is the machine reason; the message never leaves the process, because a
	 * storage error quotes SQL values and a driver error can quote provider prose — neither belongs
	 * in a log file this plugin writes (§5 invariant 8).
	 *
	 * @param string     $key     Module code.
	 * @param \Throwable $failure The failure.
	 * @param string     $reason  Short machine reason.
	 */
	private function logWebhookFailure( string $key, \Throwable $failure, string $reason ): void {
		$parts = explode( '\\', get_class( $failure ) );
		$class = (string) preg_replace( '/[^a-z0-9_]/', '', strtolower( (string) end( $parts ) ) );

		try {
			$this->services->logger()->log(
				'aponto_payment_anomaly',
				'error',
				'A payment webhook could not be applied.',
				array(
					'gateway'  => $key,
					'order_id' => 0,
					'code'     => '' === $class ? $reason : $reason . ':' . $class,
					'kind'     => 'webhook',
				)
			);
		} catch ( \Throwable $ignored ) {
			// An unwritable log must not turn a retryable answer into a fatal: this runs on a path
			// that is ALREADY failing, and the gateway's answer matters more than the note.
			unset( $ignored );
		}
	}

	/**
	 * POST /bookings/{id}/refund.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function refund( WP_REST_Request $request ) {
		$booking_id = (int) $request->get_param( 'id' );
		$raw_amount = $request->get_param( 'amount_minor' );
		$amount     = null;

		if ( null !== $raw_amount && '' !== $raw_amount ) {
			if ( ! is_numeric( $raw_amount ) || (int) $raw_amount < 1 ) {
				return Errors::validation( array( 'amount_minor' => __( 'The refund amount must be a positive whole number of minor units.', 'aponto' ) ) );
			}
			$amount = (int) $raw_amount;
		}

		$reason = mb_substr( sanitize_textarea_field( (string) ( $request->get_param( 'reason' ) ?? '' ) ), 0, 1000 );

		try {
			$result = $this->services->paymentService()->refund( $booking_id, $amount, 'admin:' . get_current_user_id(), $reason );
		} catch ( PaymentException $exception ) {
			return Errors::fromDomain( $exception );
		} catch ( DomainException $exception ) {
			return Errors::fromDomain( $exception );
		} catch ( StorageException $exception ) {
			unset( $exception );

			return Errors::internal();
		}

		if ( null === $result ) {
			return Errors::notFound();
		}

		return new WP_REST_Response(
			array(
				'transaction' => self::transactionDto( $result['transaction'] ),
				'order'       => $result['order'],
			),
			200
		);
	}

	/**
	 * Serialize one transaction row for the wire (shared with the booking DTO).
	 *
	 * The gateway references are exposed WHOLE, not masked: every reader of this shape holds
	 * `aponto_manage_bookings`, and a truncated reference is one nobody can paste into the gateway's
	 * dashboard — which removes the only reason the field exists. The row carries no PII
	 * (privacy-inventory), so there is nothing else here to protect.
	 *
	 * @param array<string, mixed> $row Transaction row.
	 * @return array<string, mixed>
	 */
	public static function transactionDto( array $row ): array {
		if ( array() === $row ) {
			return array();
		}

		return array(
			'id'           => (int) ( $row['id'] ?? 0 ),
			'kind'         => (string) ( $row['kind'] ?? '' ),
			'status'       => (string) ( $row['status'] ?? '' ),
			'amount_minor' => (int) ( $row['amount_minor'] ?? 0 ),
			'currency'     => (string) ( $row['currency'] ?? '' ),
			'gateway'      => (string) ( $row['gateway'] ?? '' ),
			'gateway_ref'  => (string) ( $row['gateway_ref'] ?? '' ),
			'payment_ref'  => (string) ( $row['payment_ref'] ?? '' ),
			'failure_code' => (string) ( $row['failure_code'] ?? '' ),
			'created_at'   => Format::utcDatetime( (string) ( $row['created_at'] ?? '' ) ),
		);
	}

	/**
	 * Apply one rate-limit bucket, returning the error response when the client is over it.
	 *
	 * @param string          $bucket  Bucket key.
	 * @param WP_REST_Request $request Current request.
	 * @return WP_Error|null
	 */
	private function rateLimit( string $bucket, WP_REST_Request $request ): ?WP_Error {
		$ip = ClientIp::resolve( (bool) $this->services->settings()->get( 'trusted_proxy' ) );

		try {
			$retry = $this->limiter->hit( $bucket, $ip, $request );
		} catch ( DomainException $exception ) {
			return Errors::fromDomain( $exception );
		}

		return null === $retry ? null : Errors::rateLimited( $retry );
	}

	/**
	 * The request headers as a flat map for the driver.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return array<string, string>
	 */
	private function headerMap( WP_REST_Request $request ): array {
		$out = array();
		foreach ( $request->get_headers() as $name => $values ) {
			$out[ (string) $name ] = is_array( $values ) ? (string) reset( $values ) : (string) $values;
		}

		return $out;
	}

	/**
	 * Add the public-route privacy headers.
	 *
	 * @param WP_REST_Response $response Response.
	 */
	private function privacyHeaders( WP_REST_Response $response ): WP_REST_Response {
		$response->header( 'Cache-Control', 'private, no-store' );
		$response->header( 'Referrer-Policy', 'no-referrer' );

		return $response;
	}
}

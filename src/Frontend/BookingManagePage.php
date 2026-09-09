<?php
/**
 * Public manage/cancel page for a booking token (`/aponto/booking/{token}` — SPEC-P1 §3.4).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Frontend;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Notification\NotificationContext;
use Aponto\Rest\Bootstrap;
use Aponto\Rest\Controller\PublicBookingsController;
use Aponto\Rest\Services;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Standalone, theme-independent page that lets a customer view and cancel their booking from the
 * link in their email. It owns a rewrite rule (`/aponto/booking/{token}`) plus a registered query
 * var, and short-circuits `template_redirect` to render its own HTML document — never a theme
 * template (SPEC-P1 §3.4).
 *
 * Every response carries the same privacy headers as the token REST routes: `Cache-Control: private,
 * no-store`, `X-Robots-Tag: noindex` and `Referrer-Policy: no-referrer` (SPEC-P0 §6.2/§6.4). Booking
 * data and the cancel action reuse the canonical token service ({@see PublicBookingsController}) so
 * rate limits, the `min_cancel_hours` deadline, the activity snapshot and the notification flush all
 * run through one code path. Times render in the booking's display timezone using the same settings
 * format as the notification emails, so the slot picker, emails and this page stay consistent (the
 * anti-LatePoint invariant, SPEC-P1 §2.2). An invalid or terminal token is a uniform 404.
 */
final class BookingManagePage {
	/** WordPress style handle for the standalone customer page. */
	private const STYLE_HANDLE = 'aponto-booking-manage';

	/**
	 * Registered public query var carrying the raw manage token.
	 */
	public const QUERY_VAR = 'aponto_manage_token';

	/**
	 * Query var the BOOKING PAGE reads to resume an unpaid hold. Lives here, beside the token it
	 * carries, so the email placeholder, the manage page's button and the widget all name it once.
	 */
	public const RESUME_QUERY_VAR = 'aponto_resume';

	/**
	 * URL path prefix for the pretty permalink (`/{prefix}/{token}`).
	 */
	public const ROUTE_PREFIX = 'aponto/booking';

	/**
	 * Option storing the rewrite-rule version last flushed into the cached rule set.
	 */
	public const REWRITE_VERSION_OPTION = 'aponto_rewrite_version';

	/**
	 * Bump when the rewrite rule changes so a deploy re-flushes without needing reactivation.
	 */
	private const REWRITE_VERSION = '2';

	/**
	 * Optional injected service graph (test seam); null builds the production graph lazily.
	 *
	 * @var Services|null
	 */
	private ?Services $services;

	/**
	 * Construct the page.
	 *
	 * @param Services|null $services Injected service graph, or null to build the production graph.
	 */
	public function __construct( ?Services $services = null ) {
		$this->services = $services;
	}

	/**
	 * Register the rewrite rule. Static so activation flushing and the `init` hook share ONE rule
	 * definition (SPEC-P1 §3.4).
	 *
	 * The segment is deliberately wide (`[^/]+`, not the token alphabet): EVERY
	 * `/aponto/booking/*` path — including malformed tokens containing `.`/`%20`/etc. — must land
	 * in {@see self::handle()} and receive the uniform 404 WITH the privacy headers, instead of
	 * falling through to the theme 404 with WordPress's default cache headers. Token SHAPE
	 * validation stays in the controller's `lookupActive()` (strict 43-char regex).
	 */
	public static function addRewriteRules(): void {
		add_rewrite_rule(
			'^' . self::ROUTE_PREFIX . '/([^/]+)/?$',
			'index.php?' . self::QUERY_VAR . '=$matches[1]',
			'top'
		);
	}

	/**
	 * Wire the rewrite rule, query var and render hook.
	 */
	public function register(): void {
		add_action( 'init', array( self::class, 'addRewriteRules' ) );
		add_action( 'init', array( self::class, 'maybeFlushRewrites' ), 11 );
		add_filter( 'query_vars', array( $this, 'registerQueryVar' ) );
		add_action( 'template_redirect', array( $this, 'maybeRender' ), 5 );
		add_action( 'template_redirect', array( self::class, 'guardLegacyResumeUrl' ), 4 );
	}

	/**
	 * Harden a page reached with the LEGACY `?aponto_resume=` query form (D-R39c, Codex A.10).
	 *
	 * New links put the token in the fragment, which no server ever sees. Links already sitting in
	 * inboxes carry the query form, and for those the token has ALREADY been transmitted by the time
	 * this runs — so the residual cannot be undone, only bounded: stop the browser leaking it onward
	 * in a `Referer`, stop any cache keeping a copy of the page it addressed, and stop a crawler that
	 * somehow found the URL from indexing it.
	 *
	 * Only detectable for the query form, and that is worth saying plainly: a fragment link reaches
	 * PHP as an ordinary page view, so the fragment path needs none of this and gets none of it.
	 */
	public static function guardLegacyResumeUrl(): void {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only presence check on a public page; no state is changed.
		if ( ! isset( $_GET[ self::RESUME_QUERY_VAR ] ) || headers_sent() ) {
			return;
		}

		header( 'Referrer-Policy: no-referrer' );
		header( 'Cache-Control: no-store, no-cache, must-revalidate, max-age=0' );
		header( 'X-Robots-Tag: noindex, nofollow', true );
		add_filter( 'wp_robots', array( self::class, 'noindexResume' ) );
	}

	/**
	 * `noindex, nofollow` for a page addressed by a legacy resume link.
	 *
	 * @param array<string, mixed> $robots Directives so far.
	 * @return array<string, mixed>
	 */
	public static function noindexResume( array $robots ): array {
		$robots['noindex']  = true;
		$robots['nofollow'] = true;
		unset( $robots['index'], $robots['follow'] );

		return $robots;
	}

	/**
	 * Register the rewrite rule and refresh the cached rule set, recording the version. Called on
	 * activation and — once — after an in-place update via {@see self::maybeFlushRewrites()}.
	 */
	public static function flushRewrites(): void {
		self::addRewriteRules();
		flush_rewrite_rules( false );
		update_option( self::REWRITE_VERSION_OPTION, self::REWRITE_VERSION, true );
	}

	/**
	 * Flush once when the stored rewrite version is behind — covers in-place plugin updates that
	 * never re-run activation (the pretty permalink would otherwise 404 until permalinks are
	 * re-saved). Runs after {@see self::addRewriteRules()} (priority 11) so the rule is present in
	 * the regenerated set.
	 */
	public static function maybeFlushRewrites(): void {
		if ( (string) get_option( self::REWRITE_VERSION_OPTION, '' ) === self::REWRITE_VERSION ) {
			return;
		}
		self::flushRewrites();
	}

	/**
	 * Register the token query var (also enables the `?aponto_manage_token=` fallback when pretty
	 * permalinks are unavailable).
	 *
	 * @param array<int, string> $vars Registered query vars.
	 * @return array<int, string>
	 */
	public function registerQueryVar( array $vars ): array {
		$vars[] = self::QUERY_VAR;

		return $vars;
	}

	/**
	 * `template_redirect` handler: render the page and stop when our query var is present.
	 */
	public function maybeRender(): void {
		$response = $this->renderCurrentRequest();
		if ( null === $response ) {
			return;
		}

		nocache_headers();
		foreach ( $response->headers as $name => $value ) {
			header( $name . ': ' . $value );
		}
		status_header( $response->status );
		header( 'Content-Type: text/html; charset=' . get_bloginfo( 'charset' ) );

		// The document is assembled entirely from esc_html()/esc_attr()/esc_url() fragments.
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Pre-escaped in build.
		echo $response->html;

		exit;
	}

	/**
	 * Request-driven render core (testable): read the token from WordPress' parsed query
	 * ({@see get_query_var()} — populated by the rewrite rule under pretty permalinks and by the
	 * registered public query var under plain permalinks), derive the intent from the request
	 * superglobals, and return the page response — or null when this request is not ours. Performs
	 * no header/output side effects, so integration tests can drive a REAL routed request
	 * (`go_to( '?aponto_manage_token=…' )`) through it without the `exit` in
	 * {@see self::maybeRender()}.
	 */
	public function renderCurrentRequest(): ?PageResponse {
		$token = (string) get_query_var( self::QUERY_VAR );
		if ( '' === $token ) {
			return null;
		}

		$method = isset( $_SERVER['REQUEST_METHOD'] )
			? strtoupper( sanitize_text_field( wp_unslash( $_SERVER['REQUEST_METHOD'] ) ) )
			: 'GET';

		$intent = 'view';
		$reason = '';
		$nonce  = '';
		if ( 'POST' === $method ) {
			$intent = 'cancel';
			// Nonce is verified inside handle() via wp_verify_nonce(); the raw token is itself the
			// capability, so a stale nonce degrades to a re-prompt rather than a hard failure.
			// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Verified in handle().
			$nonce = isset( $_POST['aponto_manage_nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['aponto_manage_nonce'] ) ) : '';
			// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Verified in handle().
			$reason = isset( $_POST['aponto_reason'] ) ? sanitize_textarea_field( wp_unslash( $_POST['aponto_reason'] ) ) : '';
			// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only view toggle; no state change.
		} elseif ( isset( $_GET['confirm'] ) ) {
			// Read-only view toggle (shows the cancel confirmation step); no state changes.
			$intent = 'confirm';
		}

		return $this->handle( $token, $intent, $reason, $nonce );
	}

	/**
	 * Render core (testable): resolve the token, run the intent, and return a status/headers/HTML
	 * response. Never performs PHP header or output side effects.
	 *
	 * @param string $token  Raw manage token.
	 * @param string $intent One of `view`, `confirm`, `cancel`.
	 * @param string $reason Optional cancellation reason (cancel intent).
	 * @param string $nonce  Nonce value (cancel intent).
	 */
	public function handle( string $token, string $intent = 'view', string $reason = '', string $nonce = '' ): PageResponse {
		$controller = new PublicBookingsController( $this->services() );

		// A uniform 404 for invalid/COMPLETED/NO-SHOW/unknown tokens (D-R33) — read the current
		// booking first (SPEC-P0 §6.4). A cancelled booking is returned here (B4) rather than 404'd.
		$booking = $this->fetchDetail( $controller, $token );
		if ( null === $booking ) {
			return $this->page( 404, $this->renderNotFound() );
		}

		// B4 (U4): a CANCELLED booking renders a PERMANENT read-only view for every intent — never
		// the cancel flow — so the link in a cancellation email keeps showing the booking's details
		// instead of the short-lived 404 it used to decay into. Invalid/unknown tokens still 404
		// above (enumeration resistance unchanged); completed tokens stay terminal → 404.
		if ( 'cancelled' === (string) ( $booking['status'] ?? '' ) ) {
			return $this->page( 200, $this->renderCancelled( $booking ) );
		}

		if ( 'cancel' === $intent ) {
			if ( ! wp_verify_nonce( $nonce, self::nonceAction( $token ) ) ) {
				return $this->page( 200, $this->renderConfirm( $token, $booking, __( 'Please confirm the cancellation once more.', 'aponto' ) ) );
			}

			$outcome = $this->performCancel( $controller, $token, $reason );
			if ( 'not_found' === $outcome ) {
				return $this->page( 404, $this->renderNotFound() );
			}
			if ( 'cancelled' === $outcome ) {
				return $this->page( 200, $this->renderCancelled( $booking ) );
			}

			// Too-late / rate-limited / transient: re-read the still-active booking and surface the
			// policy message on the detail view.
			$fresh = $this->fetchDetail( $controller, $token ) ?? $booking;

			return $this->page( 200, $this->renderDetail( $token, $fresh, $this->cancelErrorNotice( $outcome ) ) );
		}

		if ( 'confirm' === $intent && (bool) ( $booking['can_cancel'] ?? false ) ) {
			return $this->page( 200, $this->renderConfirm( $token, $booking, '' ) );
		}

		return $this->page( 200, $this->renderDetail( $token, $booking, '' ) );
	}

	/**
	 * Nonce action bound to a specific token.
	 *
	 * @param string $token Raw manage token.
	 */
	public static function nonceAction( string $token ): string {
		return 'aponto_manage_cancel_' . $token;
	}

	/**
	 * The service graph (injected in tests, built from the global wiring otherwise).
	 */
	private function services(): Services {
		if ( null === $this->services ) {
			$this->services = Bootstrap::services();
		}

		return $this->services;
	}

	/**
	 * Fetch the booking DTO via the token GET route, or null for an invalid/terminal token.
	 *
	 * @param PublicBookingsController $controller Token controller.
	 * @param string                   $token      Raw manage token.
	 * @return array<string, mixed>|null
	 */
	private function fetchDetail( PublicBookingsController $controller, string $token ): ?array {
		// B4: goes through the controller's manage-view lookup, which returns a cancelled booking
		// read-only (the public REST GET route still 404s terminal tokens). Completed/invalid/unknown
		// tokens resolve to null → uniform 404.
		return $controller->manageDetail( $token );
	}

	/**
	 * Run the cancel through the canonical token service and classify the result.
	 *
	 * @param PublicBookingsController $controller Token controller.
	 * @param string                   $token      Raw manage token.
	 * @param string                   $reason     Optional reason.
	 * @return string One of `cancelled`, `not_found`, `too_late`, `rate_limited`, `error`.
	 */
	private function performCancel( PublicBookingsController $controller, string $token, string $reason ): string {
		$request = new WP_REST_Request( 'POST', '/aponto/v1/public/bookings/' . $token . '/cancel' );
		$request->set_param( 'token', $token );
		if ( '' !== $reason ) {
			$request->set_param( 'reason', $reason );
		}

		$response = $this->toResponse( $controller->cancel( $request ) );
		if ( $response->get_status() < 300 ) {
			return 'cancelled';
		}

		$data = $response->get_data();
		$code = is_array( $data ) ? (string) ( $data['code'] ?? '' ) : '';

		return match ( $code ) {
			'aponto_not_found'           => 'not_found',
			'aponto_too_late_to_cancel'  => 'too_late',
			'aponto_rate_limited'        => 'rate_limited',
			default                      => 'error',
		};
	}

	/**
	 * Normalise a controller return (WP_REST_Response or WP_Error) into a response.
	 *
	 * @param WP_REST_Response|\WP_Error $result Controller result.
	 */
	private function toResponse( $result ): WP_REST_Response {
		if ( is_wp_error( $result ) ) {
			return rest_convert_error_to_response( $result );
		}

		return rest_ensure_response( $result );
	}

	/**
	 * Build a page response with the shared privacy headers.
	 *
	 * @param int    $status HTTP status.
	 * @param string $inner  Escaped inner HTML.
	 */
	private function page( int $status, string $inner ): PageResponse {
		return new PageResponse( $status, self::headers(), $this->document( $inner ) );
	}

	/**
	 * The privacy headers every token surface must carry (SPEC-P0 §6.2/§6.4).
	 *
	 * @return array<string, string>
	 */
	private static function headers(): array {
		return array(
			'Cache-Control'   => 'private, no-store, max-age=0',
			'X-Robots-Tag'    => 'noindex, nofollow',
			'Referrer-Policy' => 'no-referrer',
		);
	}

	/**
	 * A cancellation error notice for the detail view.
	 *
	 * @param string $outcome Cancel outcome classification.
	 */
	private function cancelErrorNotice( string $outcome ): string {
		if ( 'rate_limited' === $outcome ) {
			return __( 'Too many attempts right now. Please wait a moment and try again.', 'aponto' );
		}

		return __( 'We could not cancel this booking. Please try again or contact the business.', 'aponto' );
	}

	/**
	 * Reduce the booking DTO to a display view model (dates rendered in the display timezone using
	 * the same settings format as the notification emails).
	 *
	 * @param array<string, mixed> $b Booking DTO.
	 * @return array<string, string|bool>
	 */
	private function viewModel( array $b ): array {
		$zone  = $this->safeZone( (string) ( $b['display_timezone'] ?? 'UTC' ) );
		$start = $this->instant( (string) ( $b['start_utc'] ?? '' ) );
		$end   = $this->instant( (string) ( $b['end_utc'] ?? '' ) );
		if ( null !== $start ) {
			$start = $start->setTimezone( $zone );
		}
		if ( null !== $end ) {
			$end = $end->setTimezone( $zone );
		}
		$deadline = $this->instant( (string) ( $b['cancel_deadline_utc'] ?? '' ) );
		if ( null !== $deadline ) {
			$deadline = $deadline->setTimezone( $zone );
		}

		$settings    = $this->services()->settings();
		$date_format = (string) $settings->get( 'date_format' );
		$time_format = (string) $settings->get( 'time_format' );

		$location_name = (string) ( $b['location']['name'] ?? '' );
		$order         = is_array( $b['order'] ?? null ) ? $b['order'] : array();

		// Studio-time parity (fleet-r1 Fix 9b): when the visitor is viewing in a different timezone
		// than the studio, show the appointment in the studio's own clock too — the same "… at the
		// studio" line the booking form and the confirmation email carry.
		$business_zone      = $this->safeZone( (string) ( $b['business_timezone'] ?? '' ) );
		$show_business_time = null !== $start && $business_zone->getName() !== $zone->getName();
		$business_time      = $show_business_time ? $start->setTimezone( $business_zone )->format( $time_format ) : '';
		$business_tz_label  = $show_business_time ? \Aponto\Rest\Support\TimezoneLabel::label( $business_zone, $start ) : '';

		return array(
			'status'            => (string) ( $b['status'] ?? '' ),
			'service'           => (string) ( $b['service']['name'] ?? '' ),
			'staff'             => (string) ( $b['staff']['name'] ?? '' ),
			'location_name'     => $location_name,
			'tz_label'          => (string) ( $b['timezone_label'] ?? '' ),
			'date'              => null !== $start ? $start->format( $date_format ) : '',
			'time_start'        => null !== $start ? $start->format( $time_format ) : '',
			'time_end'          => null !== $end ? $end->format( $time_format ) : '',
			'tile_day'          => null !== $start ? $start->format( 'j' ) : '',
			'tile_month'        => null !== $start ? $start->format( 'M' ) : '',
			'total'             => $this->formatMoney( (int) ( $order['total_minor'] ?? 0 ), (string) ( $order['currency'] ?? '' ) ),
			'can_cancel'        => (bool) ( $b['can_cancel'] ?? false ),
			'deadline'          => null !== $deadline ? $deadline->format( $date_format . ' · ' . $time_format ) : '',
			'business_time'     => $business_time,
			'business_tz_label' => $business_tz_label,
			'hold_deadline'     => $this->holdDeadline( $order, $zone, $time_format ),
		);
	}

	/**
	 * The local clock time a LIVE unpaid hold is released, or '' when this order is not one.
	 *
	 * '' covers every case that must NOT offer a payment: an order that is paid, one whose hold was
	 * released, and one whose deadline has already passed. The last is the subtle one — the expiry
	 * cron runs on its own schedule, so an order can be `pending` with a deadline in the past for a
	 * few minutes, and a "Pay now" button there would take money for a slot about to be handed to
	 * somebody else.
	 *
	 * @param array<string, mixed> $order       Order block from the booking DTO.
	 * @param \DateTimeZone        $zone        Display timezone.
	 * @param string               $time_format Site time format.
	 */
	private function holdDeadline( array $order, \DateTimeZone $zone, string $time_format ): string {
		if ( 'pending' !== (string) ( $order['payment_status'] ?? '' ) ) {
			return '';
		}
		$deadline = $this->instant( (string) ( $order['hold_expires_at'] ?? '' ) );
		// The injected clock, not `time()`: this page is rendered under the same clock the payment
		// state machine and the expiry cron use, and a page that disagreed with them about "now"
		// would offer to pay for a hold the cron had already released.
		if ( null === $deadline || $deadline->getTimestamp() <= $this->services()->clock()->now()->getTimestamp() ) {
			return '';
		}

		return $deadline->setTimezone( $zone )->format( $time_format );
	}

	/**
	 * Render the read-only detail view (with an optional notice banner).
	 *
	 * @param string               $token  Raw manage token.
	 * @param array<string, mixed> $b      Booking DTO.
	 * @param string               $notice Optional error notice.
	 */
	private function renderDetail( string $token, array $b, string $notice ): string {
		$vm      = $this->viewModel( $b );
		$is_past = ! $vm['can_cancel'] && in_array( $vm['status'], array( 'pending', 'confirmed' ), true );

		$html  = '<div class="ap-card">';
		$html .= '<div class="ap-head"><h1>' . esc_html__( 'Your appointment', 'aponto' ) . '</h1>' . $this->statusPill( (string) $vm['status'] ) . '</div>';
		$html .= $this->tile( $vm );

		if ( '' !== $vm['total'] ) {
			$html .= '<div class="ap-line"><span>' . esc_html__( 'Total', 'aponto' ) . '</span><span>' . esc_html( (string) $vm['total'] ) . '</span></div>';
		}

		// A LIVE unpaid hold outranks the ordinary "waiting for confirmation" note: the booking is
		// not waiting on the business, it is waiting on the customer, and the only useful thing this
		// page can do is send them somewhere they can finish. No gateway JS is loaded here — the
		// button is a link to the booking page's resume URL, which is where the Payment Element
		// lives (and where it is already allowed to load).
		//
		// THE BANNER IS KEYED ON THE HOLD, THE BUTTON ON THE LINK (QA run 2 FINDING-3). Both used to
		// hang off `resumeUrl()`, so a site with no `aponto_booking_page_id` fell through to
		// "Waiting for confirmation. We will email you when the business responds." for a booking that
		// is waiting on the customer's money and whose slot is minutes from being released — the one
		// sentence guaranteed to make them wait. What the page cannot do is invent a payment form: with
		// no booking page there is nowhere to send anyone, so the deadline and its consequence are
		// stated plainly instead of offering a control that goes nowhere.
		$has_hold = '' !== (string) $vm['hold_deadline'];
		$pay_url  = $has_hold ? self::resumeUrl( $token ) : '';
		if ( $has_hold ) {
			$html .= $this->banner(
				'warn',
				__( 'Payment pending', 'aponto' ),
				'' !== $pay_url
					? sprintf(
						/* translators: %s: local time the held slot is released, e.g. "3:45 PM". */
						__( 'Your slot is held until %s. Complete the payment to confirm it.', 'aponto' ),
						(string) $vm['hold_deadline']
					)
					: sprintf(
						/* translators: %s: local time the held slot is released, e.g. "3:45 PM". */
						__( 'Your slot is held until %s. If the payment does not arrive by then the business will release it — please contact them to pay.', 'aponto' ),
						(string) $vm['hold_deadline']
					)
			);
		}
		if ( '' !== $pay_url ) {
			$html .= '<div class="ap-foot"><a class="ap-btn" href="' . esc_url( $pay_url ) . '">' . esc_html__( 'Pay now', 'aponto' ) . '</a></div>';
		} elseif ( ! $has_hold && 'pending' === $vm['status'] ) {
			$html .= $this->banner( 'warn', __( 'Waiting for confirmation.', 'aponto' ), __( 'We will email you when the business responds.', 'aponto' ) );
		}

		if ( '' !== $notice ) {
			$html .= $this->banner( 'err', $notice, '' );
		}

		if ( $is_past ) {
			// Inside the min_cancel_hours window: no cancel CTA, only the policy message (SPEC-P1 §3.4).
			$html .= $this->banner(
				'warn',
				__( 'This booking can no longer be cancelled online.', 'aponto' ),
				__( 'Online cancellation has closed for this booking. Please contact the business to make changes.', 'aponto' )
			);
		}

		$html  .= '<div class="ap-foot">';
		$html  .= '<a class="ap-btn ghost" href="' . esc_url( $this->icsUrl( $token ) ) . '">' . esc_html__( 'Add to calendar (.ics)', 'aponto' ) . '</a>';
		$google = $this->googleUrl( $b, $vm );
		if ( '' !== $google ) {
			$html .= '<a class="ap-btn ghost" href="' . esc_url( $google ) . '" target="_blank" rel="noopener nofollow noreferrer">' . esc_html__( 'Add to Google', 'aponto' ) . '</a>';
		}
		// Reschedule by the customer is a Premium seam (D3) — a truthful badge, not a control. The
		// customer-facing page never leaks the internal phase code (fleet-r1 Fix 7; finding U3 BUG-07).
		$html .= '<span class="ap-btn ghost is-disabled" aria-disabled="true">' . esc_html__( 'Reschedule', 'aponto' ) . ' <span class="ap-phase">' . esc_html__( 'Premium', 'aponto' ) . '</span></span>';

		if ( (bool) $vm['can_cancel'] ) {
			$html .= '<a class="ap-btn danger" href="' . esc_url( self::manageUrl( $token, array( 'confirm' => 'cancel' ) ) ) . '">' . esc_html__( 'Cancel booking', 'aponto' ) . '</a>';
		}
		$html .= '</div>';

		if ( (bool) $vm['can_cancel'] && '' !== $vm['deadline'] ) {
			$html .= '<p class="ap-fineprint">' . sprintf(
				/* translators: %s: cancellation deadline date and time. */
				esc_html__( 'Free to cancel online until %s.', 'aponto' ),
				esc_html( (string) $vm['deadline'] )
			) . '</p>';
		}

		$html .= '</div>';

		return $html;
	}

	/**
	 * Render the cancel confirmation step (confirm + optional reason before POST).
	 *
	 * @param string               $token  Raw manage token.
	 * @param array<string, mixed> $b      Booking DTO.
	 * @param string               $notice Optional notice (e.g. stale nonce).
	 */
	private function renderConfirm( string $token, array $b, string $notice ): string {
		$vm      = $this->viewModel( $b );
		$summary = trim( $vm['service'] . ' · ' . $vm['date'] . ' ' . $vm['time_start'] . ' · ' . $vm['tz_label'], ' ·' );

		$html  = '<div class="ap-card">';
		$html .= '<h1>' . esc_html__( 'Cancel this appointment?', 'aponto' ) . '</h1>';
		$html .= '<p class="ap-muted">' . esc_html( $summary ) . '</p>';
		if ( '' !== $notice ) {
			$html .= $this->banner( 'warn', $notice, '' );
		}
		$html .= '<form class="ap-form" method="post" action="' . esc_url( self::manageUrl( $token ) ) . '">';
		$html .= '<label class="ap-label" for="aponto-reason">' . esc_html__( 'Reason', 'aponto' ) . ' <span class="ap-muted">' . esc_html__( '(optional)', 'aponto' ) . '</span></label>';
		$html .= '<textarea class="ap-textarea" id="aponto-reason" name="aponto_reason" rows="3" placeholder="' . esc_attr__( 'Tell the business why you are cancelling', 'aponto' ) . '"></textarea>';
		$html .= wp_nonce_field( self::nonceAction( $token ), 'aponto_manage_nonce', true, false );
		$html .= '<div class="ap-foot">';
		$html .= '<a class="ap-btn ghost" href="' . esc_url( self::manageUrl( $token ) ) . '">' . esc_html__( 'Keep appointment', 'aponto' ) . '</a>';
		$html .= '<button type="submit" class="ap-btn danger">' . esc_html__( 'Confirm cancellation', 'aponto' ) . '</button>';
		$html .= '</div>';
		$html .= '</form>';
		$html .= '</div>';

		return $html;
	}

	/**
	 * Render the terminal "cancelled" confirmation (from the pre-cancel snapshot).
	 *
	 * @param array<string, mixed> $b Booking DTO captured before cancellation.
	 */
	private function renderCancelled( array $b ): string {
		$vm = $this->viewModel( $b );

		$html  = '<div class="ap-card">';
		$html .= '<div class="ap-head"><h1>' . esc_html__( 'Your appointment', 'aponto' ) . '</h1>' . $this->statusPill( 'cancelled' ) . '</div>';
		$html .= $this->tile( $vm, true );
		$html .= $this->banner( 'info', __( 'This appointment was cancelled.', 'aponto' ), __( 'A confirmation has been emailed to you.', 'aponto' ) );
		$html .= '</div>';

		return $html;
	}

	/**
	 * Render the uniform 404 (invalid / expired / terminal token — SPEC-P0 §6.4).
	 */
	private function renderNotFound(): string {
		$html  = '<div class="ap-card ap-notfound">';
		$html .= '<div class="ap-404">404</div>';
		$html .= '<h1>' . esc_html__( 'This link is not valid', 'aponto' ) . '</h1>';
		$html .= '<p class="ap-muted">' . esc_html__( 'The booking link may have expired or already been used. Please check the latest email we sent you.', 'aponto' ) . '</p>';
		$html .= '</div>';

		return $html;
	}

	/**
	 * The date tile + service/meta block.
	 *
	 * @param array<string, string|bool> $vm    View model.
	 * @param bool                       $muted Whether to dim the tile (cancelled state).
	 */
	private function tile( array $vm, bool $muted = false ): string {
		$meta = array_filter(
			array(
				(string) $vm['staff'],
				(string) $vm['location_name'],
				(string) $vm['tz_label'],
			),
			static fn ( string $part ): bool => '' !== $part
		);

		$when = trim( (string) $vm['time_start'] . ( '' !== $vm['time_end'] ? ' → ' . (string) $vm['time_end'] : '' ) );

		$html  = '<div class="ap-tile' . ( $muted ? ' is-muted' : '' ) . '">';
		$html .= '<div class="ap-date"><span class="dd">' . esc_html( (string) $vm['tile_day'] ) . '</span><span class="mm">' . esc_html( (string) $vm['tile_month'] ) . '</span></div>';
		$html .= '<div class="ap-tile-body">';
		$html .= '<b class="ap-service">' . esc_html( (string) $vm['service'] ) . '</b>';
		$html .= '<span class="ap-when">' . esc_html( trim( (string) $vm['date'] . '  ' . $when ) ) . '</span>';
		if ( '' !== (string) ( $vm['business_time'] ?? '' ) ) {
			$html .= '<span class="ap-studio-time">' . esc_html(
				sprintf(
				/* translators: 1: time at the business, 2: the business time-zone label. */
					__( 'That’s %1$s at the studio · %2$s', 'aponto' ),
					(string) $vm['business_time'],
					(string) $vm['business_tz_label']
				)
			) . '</span>';
		}
		if ( array() !== $meta ) {
			$html .= '<span class="ap-meta">' . esc_html( implode( ' · ', $meta ) ) . '</span>';
		}
		$html .= '</div></div>';

		return $html;
	}

	/**
	 * A status pill.
	 *
	 * @param string $status Booking status.
	 */
	private function statusPill( string $status ): string {
		$labels = array(
			'pending'   => __( 'Pending', 'aponto' ),
			'confirmed' => __( 'Confirmed', 'aponto' ),
			'completed' => __( 'Completed', 'aponto' ),
			'cancelled' => __( 'Cancelled', 'aponto' ),
		);
		$label  = $labels[ $status ] ?? ucfirst( $status );

		return '<span class="ap-pill ap-pill-' . esc_attr( $status ) . '">' . esc_html( $label ) . '</span>';
	}

	/**
	 * A coloured banner.
	 *
	 * @param string $tone  One of `info`, `warn`, `err`.
	 * @param string $title Bold title.
	 * @param string $body  Secondary line (optional).
	 */
	private function banner( string $tone, string $title, string $body ): string {
		$html  = '<div class="ap-banner ap-banner-' . esc_attr( $tone ) . '">';
		$html .= '<b>' . esc_html( $title ) . '</b>';
		if ( '' !== $body ) {
			$html .= '<span>' . esc_html( $body ) . '</span>';
		}
		$html .= '</div>';

		return $html;
	}

	/**
	 * Build a working manage URL for a token — permalink-structure aware (SPEC-P1 §3.4).
	 *
	 * With pretty permalinks the clean `/{prefix}/{token}` path is used. Under PLAIN permalinks
	 * WordPress never processes rewrite rules, so that path would 404 — fall back to the registered
	 * `?aponto_manage_token={token}` query var (which {@see self::registerQueryVar()} enables). The
	 * email `{manage_link}`, the create-response `manage_url` and every in-page link share this ONE
	 * builder so a plain-permalink site is never handed a dead link. Static so the notification
	 * layer can call it without a page instance.
	 *
	 * @param string                $token Raw manage token.
	 * @param array<string, string> $args  Extra query args (e.g. the confirm-step toggle).
	 */
	public static function manageUrl( string $token, array $args = array() ): string {
		if ( '' === (string) get_option( 'permalink_structure', '' ) ) {
			$url = add_query_arg( self::QUERY_VAR, $token, home_url( '/' ) );
		} else {
			$url = home_url( '/' . self::ROUTE_PREFIX . '/' . rawurlencode( $token ) );
		}

		return array() === $args ? $url : add_query_arg( $args, $url );
	}

	/**
	 * The booking-page URL that resumes an unpaid hold (`#aponto_resume={token}`), or '' when the
	 * site has no published booking page to send anyone to.
	 *
	 * The token is the SAME manage token the email already carries in `manage_url` — this grants
	 * nothing new, it just points the existing capability at the one page that can render a payment
	 * form. `{payment_link}` in `payment_pending_customer` is built from this, and the manage page's
	 * own "Pay now" button links to it, so the two can never drift apart.
	 *
	 * IT RIDES THE FRAGMENT (D-R39c, Codex A.10). A query string is transmitted on every request for
	 * the page AND every subresource it loads — so a capability token in one reaches the access log,
	 * the host's analytics and the `Referer` header of same-origin assets, all before the JavaScript
	 * that strips it has run. A fragment is never sent to any server. The widget still ACCEPTS the
	 * query form for one release, because links already sitting in inboxes carry it.
	 *
	 * @param string $token Raw manage token.
	 */
	public static function resumeUrl( string $token ): string {
		$page = NotificationContext::bookingPageUrl();
		if ( '' === $page || '' === $token ) {
			return '';
		}

		// The fragment is appended to whatever the page URL already is, and replaces any fragment it
		// carried: a booking page configured with one would otherwise silently swallow the token.
		$base = (string) strtok( $page, '#' );

		return $base . '#' . self::RESUME_QUERY_VAR . '=' . rawurlencode( $token );
	}

	/**
	 * The ICS download URL for a token.
	 *
	 * @param string $token Raw manage token.
	 */
	private function icsUrl( string $token ): string {
		return rest_url( 'aponto/v1/public/bookings/' . rawurlencode( $token ) . '/ics' );
	}

	/**
	 * Build an "Add to Google Calendar" URL from the booking's UTC instants.
	 *
	 * @param array<string, mixed>       $b  Booking DTO.
	 * @param array<string, string|bool> $vm View model.
	 */
	private function googleUrl( array $b, array $vm ): string {
		$start = $this->instant( (string) ( $b['start_utc'] ?? '' ) );
		$end   = $this->instant( (string) ( $b['end_utc'] ?? '' ) );
		if ( null === $start || null === $end ) {
			return '';
		}

		$text     = (string) $vm['service'];
		$location = (string) ( $b['location']['name'] ?? '' );
		if ( '' !== $location ) {
			$text .= ' — ' . $location;
		}

		$params = array(
			'action'   => 'TEMPLATE',
			'text'     => $text,
			'dates'    => $start->format( 'Ymd\THis\Z' ) . '/' . $end->format( 'Ymd\THis\Z' ),
			'location' => (string) ( $b['location']['address'] ?? '' ),
		);

		$pairs = array();
		foreach ( $params as $key => $value ) {
			$pairs[] = $key . '=' . rawurlencode( (string) $value );
		}

		return 'https://calendar.google.com/calendar/render?' . implode( '&', $pairs );
	}

	/**
	 * Format a minor-unit amount for display. The decimal count comes from the central ISO-4217
	 * exponent table ({@see \Aponto\Support\Settings::currencyExponent()}), so zero-decimal (VND),
	 * two-decimal (USD) and three-decimal (KWD) currencies all render at the right scale.
	 *
	 * @param int    $minor    Minor units.
	 * @param string $currency ISO currency code.
	 */
	private function formatMoney( int $minor, string $currency ): string {
		if ( 0 === $minor || '' === $currency ) {
			return '';
		}

		$decimals = \Aponto\Support\Settings::currencyExponent( $currency );
		$amount   = $minor / ( 10 ** $decimals );

		// Match the booking form's `Intl.NumberFormat` currency output (e.g. "€90.00", not
		// "EUR 90.00") via ext-intl when available, so both surfaces render money identically
		// (fleet-r1 Fix 9c; finding U3 BUG-08). Fall back to the ISO code + localized number.
		if ( class_exists( '\NumberFormatter' ) ) {
			$formatter = new \NumberFormatter( get_locale(), \NumberFormatter::CURRENCY );
			$formatted = $formatter->formatCurrency( $amount, $currency );
			if ( is_string( $formatted ) && '' !== $formatted ) {
				return $formatted;
			}
		}

		return $currency . ' ' . number_format_i18n( $amount, $decimals );
	}

	/**
	 * Parse an RFC3339 UTC string, or null on failure.
	 *
	 * @param string $utc RFC3339 string.
	 */
	private function instant( string $utc ): ?\DateTimeImmutable {
		if ( '' === $utc ) {
			return null;
		}
		try {
			return new \DateTimeImmutable( $utc );
		} catch ( \Exception $e ) {
			unset( $e );

			return null;
		}
	}

	/**
	 * Resolve an IANA timezone, falling back to UTC.
	 *
	 * @param string $name IANA name.
	 */
	private function safeZone( string $name ): \DateTimeZone {
		try {
			return new \DateTimeZone( '' !== $name ? $name : 'UTC' );
		} catch ( \Exception $e ) {
			unset( $e );

			return new \DateTimeZone( 'UTC' );
		}
	}

	/**
	 * Wrap inner HTML in the standalone document shell (own head, own stylesheet — no theme).
	 *
	 * @param string $inner Escaped inner HTML.
	 */
	private function document( string $inner ): string {
		$lang = esc_attr( (string) get_bloginfo( 'language' ) );
		$dir  = is_rtl() ? ' dir="rtl"' : '';
		// Decoded once, escaped once — an "&" site title never renders as "&amp;amp;" (Fix 3).
		$site = esc_html( \Aponto\Support\Settings::blogName() );

		$html  = '<!doctype html>';
		$html .= '<html lang="' . $lang . '"' . $dir . '>';
		$html .= '<head>';
		$html .= '<meta charset="' . esc_attr( (string) get_bloginfo( 'charset' ) ) . '">';
		$html .= '<meta name="viewport" content="width=device-width, initial-scale=1">';
		$html .= '<meta name="robots" content="noindex, nofollow">';
		$html .= '<meta name="referrer" content="no-referrer">';
		$html .= '<title>' . esc_html__( 'Manage your booking', 'aponto' ) . '</title>';
		$html .= $this->styleLink();
		$html .= '</head>';
		$html .= '<body class="ap-manage"><main class="ap-shell">';
		$html .= $inner;
		$html .= '<p class="ap-brand">' . $site . '</p>';
		$html .= '</main></body></html>';

		return $html;
	}

	/**
	 * Register, enqueue, and print the static stylesheet inside this standalone
	 * document's own head. WordPress never reaches the theme's normal style
	 * printing hooks because this page short-circuits `template_redirect`.
	 */
	private function styleLink(): string {
		wp_register_style(
			self::STYLE_HANDLE,
			plugins_url( 'assets/src/form/booking-manage.css', APONTO_FILE ),
			array(),
			APONTO_VERSION
		);
		wp_enqueue_style( self::STYLE_HANDLE );

		ob_start();
		wp_print_styles( self::STYLE_HANDLE );

		return (string) ob_get_clean();
	}
}

<?php
/**
 * Admin `/notifications` controller (rest-contract §2.13).
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

use Aponto\Notification\Placeholders;
use Aponto\Notification\TemplateRepository;
use Aponto\Plan;
use Aponto\Rest\Args;
use Aponto\Rest\Controller;
use Aponto\Rest\Errors;
use Aponto\Rest\Policy;
use Aponto\Rest\RequestValidator;
use Aponto\Rest\Services;
use Aponto\Rest\Support\Format;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Reads and updates the eleven seeded templates and runs the fixture test-send. `recipient` and
 * `trigger_event` are server-owned (never written); `subject` strips CR/LF (max 255); every `{token}`
 * in subject/body must be in the placeholder whitelist (SPEC-P1 §3.3).
 */
final class NotificationsController implements Controller {

	/**
	 * The eleven seed template keys (SPEC-P1 §3.2 + 2026-07-20 addendum, the two `staff` templates
	 * D-R28 shipped with `multi_staff`, and `booking_no_show_customer` — D-R33, Free core, so it
	 * carries no plan term anywhere on its path).
	 *
	 * NOT gated: `PUT` requires the FULL set, and this list is what "full" means. The staff pair is
	 * editable in every edition on purpose — a site that upgrades to premium must not find its
	 * staff copy stuck at the seeded default because a Free build refused to save it, and the copy
	 * is inert while nothing queues those templates. Whether they are SENT is gated by the
	 * `multi_staff` module; whether they are SHOWN is the admin UI's business
	 * (NotificationsApp hides them, and still submits their untouched values).
	 *
	 * @var list<string>
	 */
	private const TEMPLATE_KEYS = array(
		'booking_received_customer',
		'booking_confirmed_customer',
		'booking_rescheduled_customer',
		'booking_cancelled_customer',
		'booking_completed_customer',
		'booking_no_show_customer',
		'booking_reminder_customer',
		'booking_created_admin',
		'booking_cancelled_admin',
		'booking_created_staff',
		'booking_cancelled_staff',
		// D-R38 payments. UNGATED like every other key: `PUT` is a full replacement and demands the
		// complete set, so hiding a key from one build would make every save fail there.
		'payment_pending_customer',
		'payment_refunded_customer',
	);

	/**
	 * Sender-identity fields the Notifications tab's Sender panel edits (A2), as DTO-leaf => core
	 * settings key. Kept in the core settings registry (so they round-trip GET/PUT /settings and
	 * clean up on uninstall) but written through this controller because the Notifications tab is a
	 * custom editor, not a schema panel — routing them through the full-replacement PUT /settings
	 * from here would risk clobbering the other tabs' values.
	 *
	 * @var array<string, string>
	 */
	private const SENDER_FIELDS = array(
		'from_name'  => 'notifications.from_name',
		'from_email' => 'notifications.from_email',
		'reply_to'   => 'notifications.reply_to',
	);

	/**
	 * Template store.
	 *
	 * @var TemplateRepository
	 */
	private TemplateRepository $templates;

	/**
	 * Construct the controller.
	 *
	 * @param Services $services Service locator.
	 */
	public function __construct( private Services $services ) {
		$this->templates = new TemplateRepository( $services->wpdb() );
	}

	/**
	 * Register routes.
	 *
	 * @param string $rest_namespace REST namespace.
	 */
	public function register( string $rest_namespace ): void {
		register_rest_route(
			$rest_namespace,
			'/notifications',
			array(
				array(
					'methods'             => 'GET',
					'permission_callback' => array( Policy::class, 'manageSettings' ),
					'callback'            => array( $this, 'index' ),
				),
				array(
					'methods'             => 'PUT',
					'permission_callback' => array( Policy::class, 'manageSettings' ),
					'callback'            => array( $this, 'replace' ),
				),
			)
		);

		register_rest_route(
			$rest_namespace,
			'/notifications/test-send',
			array(
				'methods'             => 'POST',
				'permission_callback' => array( Policy::class, 'manageSettings' ),
				'callback'            => array( $this, 'testSend' ),
				'args'                => array(
					'template_key'    => Args::argEnum( self::TEMPLATE_KEYS, '', true ),
					'recipient_email' => array( 'required' => true ),
				),
			)
		);

		// Read-only mail Send log (A3 — U4): the deliveries ledger with masked recipients. No resend
		// in V1 (rest-contract §2.13 addendum). Same manage_settings capability as the editor.
		register_rest_route(
			$rest_namespace,
			'/notifications/log',
			array(
				'methods'             => 'GET',
				'permission_callback' => array( Policy::class, 'manageSettings' ),
				'callback'            => array( $this, 'log' ),
				'args'                => array(
					'page'     => array(
						'type'    => 'integer',
						'default' => 1,
					),
					'per_page' => array(
						'type'    => 'integer',
						'default' => 20,
					),
				),
			)
		);
	}

	/**
	 * GET /notifications.
	 */
	public function index(): WP_REST_Response {
		$items   = array_map( array( $this, 'toDto' ), $this->templates->all() );
		$payload = Format::envelope( $items, 1, 100, count( $items ) );
		// The Sender panel (A2) rides the same payload the editor already loads.
		$payload['sender'] = $this->senderDto();

		return new WP_REST_Response( $payload, 200 );
	}

	/**
	 * GET /notifications/log — a page of the deliveries ledger for the read-only Send log (A3).
	 *
	 * @param WP_REST_Request $request Request.
	 */
	public function log( WP_REST_Request $request ): WP_REST_Response {
		$page     = max( 1, (int) $request->get_param( 'page' ) );
		$per_page = (int) $request->get_param( 'per_page' );
		$per_page = $per_page > 0 ? min( 100, $per_page ) : 20;

		$log = $this->services->notificationDispatcher()->mailLog( $page, $per_page );

		return new WP_REST_Response(
			Format::envelope( $log['items'], $log['page'], $log['per_page'], $log['total'] ),
			200
		);
	}

	/**
	 * PUT /notifications.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function replace( WP_REST_Request $request ) {
		$items = $request->get_param( 'items' );
		if ( ! is_array( $items ) ) {
			return Errors::validation( array( 'items' => __( 'A list of templates is required.', 'aponto' ) ) );
		}

		$fields    = array();
		$prepared  = array();
		$seen_keys = array();

		foreach ( $items as $index => $item ) {
			if ( ! is_array( $item ) ) {
				$fields[ 'items.' . $index ] = __( 'Each item must be an object.', 'aponto' );
				continue;
			}
			$key = is_string( $item['template_key'] ?? null ) ? sanitize_key( $item['template_key'] ) : '';
			if ( ! in_array( $key, self::TEMPLATE_KEYS, true ) ) {
				$fields[ 'items.' . $index . '.template_key' ] = __( 'Unknown template key.', 'aponto' );
				continue;
			}
			$seen_keys[ $key ] = true;

			$subject = mb_substr( trim( str_replace( array( "\r", "\n" ), ' ', sanitize_text_field( (string) ( $item['subject'] ?? '' ) ) ) ), 0, 255 );
			$body    = sanitize_textarea_field( (string) ( $item['body'] ?? '' ) );
			if ( '' === $subject ) {
				$fields[ 'items.' . $index . '.subject' ] = __( 'A subject is required.', 'aponto' );
			}
			if ( '' === $body ) {
				$fields[ 'items.' . $index . '.body' ] = __( 'A body is required.', 'aponto' );
			}
			$bad = $this->unknownPlaceholder( $subject . ' ' . $body );
			if ( '' !== $bad ) {
				/* translators: %s: placeholder token. */
				$fields[ 'items.' . $index ] = sprintf( __( 'Unknown placeholder: %s', 'aponto' ), $bad );
			}

			$prepared[ $key ] = array(
				'subject' => $subject,
				'body'    => $body,
				'enabled' => ( new RequestValidator() )->bool( $item['enabled'] ?? false ),
			);
		}

		if ( array() === $fields && count( $seen_keys ) !== count( self::TEMPLATE_KEYS ) ) {
			$fields['items'] = __( 'All templates are required.', 'aponto' );
		}

		$sender = $this->prepareSender( $request, $fields );

		if ( array() !== $fields ) {
			return Errors::validation( $fields );
		}

		foreach ( $prepared as $key => $data ) {
			$this->templates->update( $key, $data['subject'], $data['body'], $data['enabled'] );
		}
		$this->writeSender( $sender );

		return $this->index();
	}

	/**
	 * Validate the optional `sender` object (A2) into a flat `settings-key => value` map, appending
	 * any field errors. Absent = no change (the object is optional). Each leaf is validated STRICTLY
	 * through the settings registry, so `from_email`/`reply_to` must be a valid address or '' (clear)
	 * and nothing invalid is ever written.
	 *
	 * @param WP_REST_Request       $request Request.
	 * @param array<string, string> $fields  Field-error accumulator (by reference).
	 * @return array<string, mixed>|null Prepared `key => value` map, or null when no sender was sent.
	 */
	private function prepareSender( WP_REST_Request $request, array &$fields ): ?array {
		$sender = $request->get_param( 'sender' );
		if ( ! is_array( $sender ) ) {
			return null;
		}

		$settings = $this->services->settings();
		$out      = array();
		foreach ( self::SENDER_FIELDS as $leaf => $key ) {
			$value = array_key_exists( $leaf, $sender ) ? $sender[ $leaf ] : $settings->get( $key );
			try {
				$out[ $key ] = $settings->validate( $key, $value, true );
			} catch ( \InvalidArgumentException $e ) {
				unset( $e );
				$fields[ 'sender.' . $leaf ] = 'from_name' === $leaf
					? __( 'This value is invalid.', 'aponto' )
					: __( 'Enter a valid email address or leave it blank.', 'aponto' );
			}
		}

		return $out;
	}

	/**
	 * Persist the prepared sender map (A2). A no-op when no `sender` object was sent.
	 *
	 * @param array<string, mixed>|null $sender Prepared `settings-key => value` map.
	 */
	private function writeSender( ?array $sender ): void {
		if ( null === $sender ) {
			return;
		}
		$settings = $this->services->settings();
		foreach ( $sender as $key => $value ) {
			$settings->update( $key, $value, true );
		}
	}

	/**
	 * The current sender identity for the GET payload (A2).
	 *
	 * @return array<string, string>
	 */
	private function senderDto(): array {
		$settings = $this->services->settings();
		$dto      = array();
		foreach ( self::SENDER_FIELDS as $leaf => $key ) {
			$dto[ $leaf ] = (string) $settings->get( $key );
		}

		return $dto;
	}

	/**
	 * POST /notifications/test-send.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function testSend( WP_REST_Request $request ) {
		$template_key = (string) $request->get_param( 'template_key' );
		$email        = sanitize_email( (string) $request->get_param( 'recipient_email' ) );

		if ( '' === $email || ! is_email( $email ) ) {
			return Errors::validation( array( 'recipient_email' => __( 'A valid email address is required.', 'aponto' ) ) );
		}
		$template = $this->templates->find( $template_key );
		if ( null === $template ) {
			return Errors::notFound();
		}

		// Plan boundary on the `staff` templates (D-R28, Codex review). EDITING them stays open in
		// every edition — `PUT /notifications` is a full replacement that demands the whole key set,
		// so a Free build has to be able to round-trip copy it will never send (see TEMPLATE_KEYS).
		// SENDING is the opposite case: a test-send renders and actually delivers a real email, so
		// it is a USE of the capability, and on Free nothing else can ever queue these templates.
		// Without this check the one reachable premium mail surface on a Free build was a 200.
		if ( 'staff' === (string) ( $template['recipient'] ?? '' ) && ! Plan::instance()->has( 'multi_staff' ) ) {
			return Errors::planLimit();
		}

		$sent = $this->services->notificationDispatcher()->testSend( $template_key, $email );

		return new WP_REST_Response(
			array(
				'sent'            => $sent,
				'template_key'    => $template_key,
				'recipient_email' => $email,
			),
			200
		);
	}

	/**
	 * Return the first `{token}` that is not in the whitelist, or ''.
	 *
	 * @param string $text Text to scan.
	 */
	private function unknownPlaceholder( string $text ): string {
		preg_match_all( '/\{([a-z_]+)\}/', $text, $matches );
		foreach ( $matches[1] as $token ) {
			if ( ! in_array( $token, Placeholders::WHITELIST, true ) ) {
				return '{' . $token . '}';
			}
		}

		return '';
	}

	/**
	 * Serialize a template row.
	 *
	 * @param array<string, mixed> $row Row.
	 * @return array<string, mixed>
	 */
	private function toDto( array $row ): array {
		return array(
			'id'            => (int) $row['id'],
			'template_key'  => (string) $row['template_key'],
			'recipient'     => (string) $row['recipient'],
			'trigger_event' => (string) $row['trigger_event'],
			'subject'       => (string) $row['subject'],
			'body'          => (string) $row['body'],
			'enabled'       => 1 === (int) $row['enabled'],
		);
	}
}

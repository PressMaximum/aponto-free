<?php
/**
 * Raw webhook request handed to a driver for verification (extension-surface §5b.3, D-R38f).
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
 * The unmodified bytes a gateway sent, plus the headers that authenticate them.
 *
 * `body` is the RAW request body and core never decodes-and-re-encodes it. That is not fastidiousness:
 * a signature is computed over exactly the byte string the gateway transmitted, and a JSON round trip
 * through PHP silently reorders keys, rewrites number formats and changes unicode escaping — after
 * which every signature fails and the failure looks like a wrong secret.
 *
 * `remote_ip` is present for a driver's own diagnostics; core does NOT use it as an authorization
 * factor. Gateway source ranges change without notice, and a plugin that IP-allow-lists them silently
 * stops accepting payments on a day nobody is watching. The signature is the authentication.
 */
final class WebhookRequest {

	/**
	 * Header map, normalized: lower-cased, with `_` folded to `-`.
	 *
	 * @var array<string, string>
	 */
	public readonly array $headers;

	/**
	 * Construct the request.
	 *
	 * @param string                $module_code Payment module code.
	 * @param string                $body        RAW request body, byte-for-byte.
	 * @param array<string, string> $headers     Request headers; names are normalized below, so any
	 *                                           spelling of a name may be supplied or asked for.
	 * @param string                $remote_ip   Client IP, for driver diagnostics only.
	 * @param \DateTimeImmutable    $received_at When core received the request (UTC, injected Clock).
	 */
	public function __construct(
		public readonly string $module_code,
		public readonly string $body,
		array $headers,
		public readonly string $remote_ip,
		public readonly \DateTimeImmutable $received_at
	) {
		$normalized = array();
		foreach ( $headers as $name => $value ) {
			$normalized[ self::normalize( (string) $name ) ] = is_array( $value ) ? (string) reset( $value ) : (string) $value;
		}
		$this->headers = $normalized;
	}

	/**
	 * One header by name, or '' when absent.
	 *
	 * BOTH SIDES ARE NORMALIZED (Codex P). The map arrives from
	 * `WP_REST_Request::get_headers()`, whose keys are WordPress-canonical and use UNDERSCORES
	 * (`stripe_signature`, `x_provider_transmission_sig`), while a driver author reads the gateway's
	 * documentation and asks for the WIRE name (`Stripe-Signature`). Lower-casing alone left those
	 * two spellings as different keys, so the lookup answered '' and EVERY webhook failed
	 * verification — a failure that looks exactly like a wrong secret and sends the site owner
	 * hunting through their dashboard. Folding `_` to `-` on both sides makes the two spellings the
	 * same key, which is what both sides already believe.
	 *
	 * @param string $name Header name, in any spelling.
	 */
	public function header( string $name ): string {
		return $this->headers[ self::normalize( $name ) ] ?? '';
	}

	/**
	 * The one spelling this class stores and looks up by.
	 *
	 * @param string $name Header name.
	 */
	private static function normalize( string $name ): string {
		return str_replace( '_', '-', strtolower( $name ) );
	}

	/**
	 * Redacted debug view (§5 invariant 8): the webhook body is provider payload that can carry
	 * customer names, emails and addresses, and the signature header is key-derived material — so
	 * neither is ever printed. Only the SHAPE survives, which is what a diagnostic actually needs.
	 *
	 * @return array<string, mixed>
	 */
	public function __debugInfo(): array {
		return array(
			'module_code'  => $this->module_code,
			'body_bytes'   => strlen( $this->body ),
			'header_names' => array_keys( $this->headers ),
			'remote_ip'    => '[redacted]',
			'received_at'  => $this->received_at->format( 'Y-m-d H:i:s' ),
		);
	}
}

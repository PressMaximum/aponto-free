<?php
/**
 * Value object for a rendered public page (status + headers + HTML body).
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

/**
 * The result of rendering the public manage/cancel page: an HTTP status, the privacy headers that
 * every token surface must carry (SPEC-P0 §6.2/§6.4), and the fully-escaped HTML document. Split out
 * of {@see BookingManagePage} so the render core is testable without touching PHP's header/output
 * side effects.
 */
final class PageResponse {

	/**
	 * Construct the response.
	 *
	 * @param int                   $status  HTTP status code.
	 * @param array<string, string> $headers Response headers (name => value).
	 * @param string                $html    Fully-escaped HTML document.
	 */
	public function __construct(
		public readonly int $status,
		public readonly array $headers,
		public readonly string $html
	) {}
}

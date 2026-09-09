<?php
/**
 * Client IP resolution (SPEC-P0 §6.4.2).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Rest\Support;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * Resolves the client IP for rate limiting. Default source is `REMOTE_ADDR`; the
 * `X-Forwarded-For` header is honoured ONLY when the `trusted_proxy` setting is on.
 *
 * With `trusted_proxy` the list is parsed from the RIGHT and the LAST syntactically valid IP wins
 * (REST-5): that is the hop appended by YOUR proxy — the only part of the header the client cannot
 * forge. Taking the first (leftmost) entry would let any client spoof unlimited buckets by
 * prepending fake addresses. Only enable `trusted_proxy` when ALL traffic reaches PHP through your
 * own proxy layer; a CIDR allow-list for multi-hop setups is a P2 backlog item. An unresolvable
 * address collapses to `0.0.0.0` so the rate-counter key is always well-formed.
 */
final class ClientIp {

	/**
	 * Resolve the client IP.
	 *
	 * @param bool $trusted_proxy Whether the `trusted_proxy` setting is enabled.
	 */
	public static function resolve( bool $trusted_proxy ): string {
		if ( $trusted_proxy && isset( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) {
			$forwarded = sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_FORWARDED_FOR'] ) );
			foreach ( array_reverse( explode( ',', $forwarded ) ) as $candidate ) {
				$ip = trim( $candidate );
				if ( '' !== $ip && false !== filter_var( $ip, FILTER_VALIDATE_IP ) ) {
					return $ip;
				}
			}
		}

		$remote = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
		if ( '' !== $remote && false !== filter_var( $remote, FILTER_VALIDATE_IP ) ) {
			return $remote;
		}

		return '0.0.0.0';
	}
}

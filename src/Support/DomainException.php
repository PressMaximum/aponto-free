<?php
/**
 * Base domain exception carrying a stable REST error code (§8.2).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Support;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * Base class for domain exceptions. Every subclass exposes a stable `aponto_*` error code, an HTTP
 * status and a retry hint drawn from the error registry (`docs/error-registry.md`). The REST layer
 * (a later milestone) maps these directly; the domain layer never builds `WP_Error`/HTTP itself.
 *
 * The English `getMessage()` is the stable, PII-free server log message; user-facing copy is
 * localized at the REST boundary.
 */
abstract class DomainException extends \RuntimeException {

	/**
	 * Stable machine-readable error code (`aponto_*`).
	 */
	abstract public function errorCode(): string;

	/**
	 * HTTP status for the REST envelope.
	 */
	abstract public function httpStatus(): int;

	/**
	 * Whether a client may safely retry (per the error registry).
	 */
	public function retryable(): bool {
		return false;
	}
}

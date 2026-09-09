<?php
/**
 * The ONE advisory lock name every writer of a module's settings option takes (D-R39c round 2).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Extension;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * `aponto_module_{code}` is written and read as ONE option row, so every writer of it has to
 * serialize on the SAME name or none of them is serialized at all.
 *
 * The generic settings `PUT` was not one of them (Codex round 2, NEW-1). The Stripe one-click
 * webhook registration took a lock of its own — `apt:pay:stripe-config`, a literal private to that
 * class — and did its read → write → read-back under it, while `ModulesController::update()` wrote
 * the very same option with no lock at all. So an admin pressing Save while the registration was
 * in flight landed between the registration's write and its read-back, and the full-replacement
 * `PUT` overwrote the signing secret Stripe had just shown for the only time it will ever show it.
 * A lock only one of two writers takes is decoration.
 *
 * It lives in the GENERIC module layer for the same reason {@see ModuleStatus} does: the race is a
 * property of the shared option row, not of payments. Any module owning a domain route that writes
 * its own settings — a calendar re-issuing a token, a future gateway rotating a key — has the same
 * race with the same Save button, and each of them inventing a private literal is how the bug comes
 * back one module at a time.
 *
 * SCOPED PER MODULE AND PER SITE, because that is exactly how far the option row reaches. Two
 * modules are two rows, so one global settings lock would make one panel's Save block another's;
 * and on multisite `aponto_module_{code}` is a row in EACH site's own options table while
 * `GET_LOCK` names are global to the MySQL server — so the name carries `$wpdb->prefix`, the same
 * site scoping (and the same hash-to-48 shape) every other lock name in the plugin uses
 * ({@see \Aponto\Booking\StaffLockFactory}). The literal this replaced had neither.
 */
final class ModuleSettingsLock {

	/**
	 * Seconds a settings writer waits for the lock.
	 *
	 * Short on purpose, and the same number on both sides: no critical section under this name may
	 * contain a network call (the payment contract's "no HTTP inside the lock", extension-surface
	 * §5b.4), so anything slower than this is contention rather than work — and the honest answer to
	 * contention is the retryable `503 aponto_lock_timeout`, not a longer wait on an admin screen.
	 */
	public const TIMEOUT = 3;

	/**
	 * The lock name for one module code on this site.
	 *
	 * @param string $code Module code (registry code; already sanitized by the caller).
	 * @param \wpdb  $wpdb Database handle, for the site-scoping table prefix.
	 */
	public static function name( string $code, \wpdb $wpdb ): string {
		return 'apt:mod:' . substr( hash( 'sha256', $wpdb->prefix . '|module-settings|' . $code ), 0, 48 );
	}
}

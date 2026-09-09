<?php
/**
 * Integration plumbing registrar (extension-surface §4, §5; D-R34).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Integration;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * The one place core turns the integration surface on.
 *
 * Everything under `Aponto\Integration` is FREE-SHIPPED and provider-agnostic: it names no
 * provider, references no premium class at all (the PHPStan `PlanBoundaryRule` enforces that), and
 * dispatches only the per-key hooks extension-surface §5.1 defines. A driver is a set of filter
 * callbacks and nothing more, which is what makes the second calendar integration a
 * driver-only change.
 *
 * Registered unconditionally, deliberately. These seams are inert on a site with no integration
 * connected — the busy adapter leaves through one already-autoloaded option, the sync listeners find
 * no active code, the REST routes 404 on the registry allow-list — and registering them behind a
 * module gate would put a `Plan::has()` check on the availability hot path for no benefit. The gate
 * that matters is per-code and lives in {@see IntegrationRegistry::isActive()}.
 */
final class Integrations {

	/**
	 * Wire the busy adapter, the outbound sync, the settings bridge and the OAuth callback.
	 */
	public static function register(): void {
		$clock = new \Aponto\Support\Clock();

		( new SettingsFields() )->register();
		( new RemoteBusySource( ConnectionStore::make(), IntegrationHealth::make(), $clock ) )->register();
		RemoteEventSync::make()->register();
		ProjectionPurge::register();

		if ( is_admin() ) {
			( new OAuthCallback( IntegrationService::make() ) )->register();
		}
	}
}

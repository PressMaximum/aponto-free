<?php
/**
 * REST bootstrap — builds the controller graph on `rest_api_init`.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Rest;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Rest\Controller\BlockedPeriodsController;
use Aponto\Rest\Controller\BookingsController;
use Aponto\Rest\Controller\CustomersController;
use Aponto\Rest\Controller\DiagnosticsController;
use Aponto\Rest\Controller\EligibilityController;
use Aponto\Rest\Controller\ExportController;
use Aponto\Rest\Controller\IntegrationsController;
use Aponto\Rest\Controller\LocationsController;
use Aponto\Rest\Controller\ModulesController;
use Aponto\Rest\Controller\NotificationsController;
use Aponto\Rest\Controller\PaymentsController;
use Aponto\Rest\Controller\PublicAvailabilityController;
use Aponto\Rest\Controller\PublicBookingsController;
use Aponto\Rest\Controller\PublicServicesController;
use Aponto\Rest\Controller\ScheduleController;
use Aponto\Rest\Controller\ServiceCategoriesController;
use Aponto\Rest\Controller\ServicesController;
use Aponto\Rest\Controller\SettingsController;
use Aponto\Rest\Controller\StaffController;
use Aponto\Support\Clock;
use Aponto\Support\Settings;

/**
 * Wires the `aponto/v1` REST surface. The Kernel registers {@see self::register()} on
 * `rest_api_init` ONLY when the schema is ready (maintenance gate honoured), so no route is exposed
 * against a half-installed site.
 */
final class Bootstrap {

	/**
	 * Register all controllers + cross-cutting filters.
	 */
	public static function register(): void {
		$router = new Router( self::controllers( self::services() ) );
		$router->register();
	}

	/**
	 * Build the shared service locator.
	 */
	public static function services(): Services {
		global $wpdb;

		return new Services( $wpdb, new Settings(), new Clock() );
	}

	/**
	 * The controller list.
	 *
	 * @param Services $services Service locator.
	 * @return list<Controller>
	 */
	public static function controllers( Services $services ): array {
		return array(
			new ServicesController( $services ),
			new ServiceCategoriesController( $services ),
			new EligibilityController( $services ),
			new LocationsController( $services ),
			new StaffController( $services ),
			new ScheduleController( $services ),
			new BlockedPeriodsController( $services ),
			new BookingsController( $services ),
			new CustomersController( $services ),
			new SettingsController( $services ),
			new IntegrationsController( $services ),
			new ExportController( $services ),
			new DiagnosticsController( $services ),
			new NotificationsController( $services ),
			new ModulesController( $services ),
			new PaymentsController( $services ),
			new PublicServicesController( $services ),
			new PublicAvailabilityController( $services ),
			new PublicBookingsController( $services ),
		);
	}
}

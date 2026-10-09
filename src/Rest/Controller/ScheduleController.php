<?php
/**
 * Admin `/staff/{id}/schedule` controller (rest-contract §2.6).
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

use Aponto\Availability\ScheduleResolver;
use Aponto\Booking\Repository\ScheduleRepository;
use Aponto\Rest\Args;
use Aponto\Rest\Controller;
use Aponto\Rest\Data\ScheduleGateway;
use Aponto\Rest\Errors;
use Aponto\Rest\Policy;
use Aponto\Rest\Services;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Bulk weekly + override schedule for a `(staff, service, location)` scope. REST nulls for
 * service/location normalize to the DB wildcard `0`; an empty `periods` array closes a weekday/date.
 * PUT is a full replacement, validated for weekday/date uniqueness and sorted, non-overlapping
 * periods within `0..1440`.
 */
final class ScheduleController implements Controller {

	/**
	 * Schedule gateway.
	 *
	 * @var ScheduleGateway
	 */
	private ScheduleGateway $gateway;

	/**
	 * Candidate-row reader (own + wildcard `0`) shared with the availability engine.
	 *
	 * @var ScheduleRepository
	 */
	private ScheduleRepository $repository;

	/**
	 * Weight-based resolver (§5.2) — reused, unchanged, to expose the effective weekly set.
	 *
	 * @var ScheduleResolver
	 */
	private ScheduleResolver $resolver;

	/**
	 * Construct the controller.
	 *
	 * @param Services $services Service locator.
	 */
	public function __construct( Services $services ) {
		$this->gateway    = new ScheduleGateway( $services->wpdb() );
		$this->repository = new ScheduleRepository( $services->wpdb() );
		$this->resolver   = new ScheduleResolver();
	}

	/**
	 * Register routes.
	 *
	 * @param string $rest_namespace REST namespace.
	 */
	public function register( string $rest_namespace ): void {
		// Business-hours weekly grid — the `staff_id = 0` wildcard scope every staff inherits
		// (SPEC-P1 §1.3). The per-staff `/staff/{id}/schedule` route 404s on staff 0 by design,
		// so this dedicated route gives the manual (skip-wizard) path a place to SET business
		// hours from Settings → General (finding U4-03a). Weekly only (no date overrides), reusing
		// the same period validation as the staff schedule PUT.
		register_rest_route(
			$rest_namespace,
			'/business-hours',
			array(
				array(
					'methods'             => 'GET',
					'permission_callback' => array( Policy::class, 'manageStaff' ),
					'callback'            => array( $this, 'showBusiness' ),
				),
				array(
					'methods'             => 'PUT',
					'permission_callback' => array( Policy::class, 'manageStaff' ),
					'callback'            => array( $this, 'replaceBusiness' ),
				),
			)
		);

		register_rest_route(
			$rest_namespace,
			'/staff/(?P<id>\d+)/schedule',
			array(
				array(
					'methods'             => 'GET',
					'permission_callback' => array( Policy::class, 'manageStaff' ),
					'callback'            => array( $this, 'show' ),
					'args'                => array(
						'id'          => Args::argId(),
						'service_id'  => Args::argNullableId(),
						'location_id' => Args::argNullableId(),
						'resolved'    => Args::argBool( false ),
					),
				),
				array(
					'methods'             => 'PUT',
					'permission_callback' => array( Policy::class, 'manageStaff' ),
					'callback'            => array( $this, 'replace' ),
					'args'                => array(
						'id'          => Args::argId(),
						'service_id'  => Args::argNullableId(),
						'location_id' => Args::argNullableId(),
					),
				),
			)
		);
	}

	/**
	 * GET /staff/{id}/schedule.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function show( WP_REST_Request $request ) {
		$staff_id = (int) $request->get_param( 'id' );
		if ( ! $this->gateway->staffExists( $staff_id ) ) {
			return Errors::notFound();
		}

		$service_id  = (int) ( $request->get_param( 'service_id' ) ?? 0 );
		$location_id = (int) ( $request->get_param( 'location_id' ) ?? 0 );

		if ( (bool) $request->get_param( 'resolved' ) ) {
			return new WP_REST_Response( $this->resolvedRepresentation( $staff_id, $service_id, $location_id ), 200 );
		}

		return new WP_REST_Response( $this->representation( $staff_id, $service_id, $location_id ), 200 );
	}

	/**
	 * PUT /staff/{id}/schedule.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function replace( WP_REST_Request $request ) {
		$staff_id = (int) $request->get_param( 'id' );
		if ( ! $this->gateway->staffExists( $staff_id ) ) {
			return Errors::notFound();
		}

		$service_id  = (int) ( $request->get_param( 'service_id' ) ?? 0 );
		$location_id = (int) ( $request->get_param( 'location_id' ) ?? 0 );

		$fields = array();
		$rows   = array();

		$weekly = $request->get_param( 'weekly' );
		if ( ! is_array( $weekly ) ) {
			$fields['weekly'] = __( 'A weekly schedule is required.', 'aponto' );
		} else {
			$rows = array_merge( $rows, $this->weeklyRows( $weekly, $fields ) );
		}

		$overrides = $request->get_param( 'overrides' );
		if ( null !== $overrides && '' !== $overrides ) {
			if ( ! is_array( $overrides ) ) {
				$fields['overrides'] = __( 'Overrides must be a list.', 'aponto' );
			} else {
				$rows = array_merge( $rows, $this->overrideRows( $overrides, $fields ) );
			}
		}

		if ( array() !== $fields ) {
			return Errors::validation( $fields );
		}

		$refusal = $this->replaceRefusal( $this->gateway->replace( $staff_id, $service_id, $location_id, $rows ) );
		if ( null !== $refusal ) {
			return $refusal;
		}

		return new WP_REST_Response( $this->representation( $staff_id, $service_id, $location_id ), 200 );
	}

	/**
	 * GET /business-hours — the `staff_id = 0` weekly grid (SPEC-P1 §1.3).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function showBusiness( WP_REST_Request $request ) {
		unset( $request );

		return new WP_REST_Response( $this->representation( 0, 0, 0 ), 200 );
	}

	/**
	 * PUT /business-hours — full replacement of the `staff_id = 0` weekly grid. Weekly only (no date
	 * overrides): business hours are the base every staff schedule resolves against.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function replaceBusiness( WP_REST_Request $request ) {
		$fields = array();
		$rows   = array();

		$weekly = $request->get_param( 'weekly' );
		if ( ! is_array( $weekly ) ) {
			$fields['weekly'] = __( 'A weekly schedule is required.', 'aponto' );
		} else {
			$rows = $this->weeklyRows( $weekly, $fields );
		}

		if ( array() !== $fields ) {
			return Errors::validation( $fields );
		}

		$refusal = $this->replaceRefusal( $this->gateway->replace( 0, 0, 0, $rows ) );
		if ( null !== $refusal ) {
			return $refusal;
		}

		return new WP_REST_Response( $this->representation( 0, 0, 0 ), 200 );
	}

	/**
	 * Map a {@see ScheduleGateway::replace()} outcome to its REST refusal, or null on success.
	 *
	 * The replacement is serialized per scope and atomic (persona QA 2026-10-05, T-065): a writer
	 * that could not get the scope lock answers the retryable `503 aponto_lock_timeout`, a rolled
	 * back replacement `500 aponto_internal_error` — never a 200 over rows that were not written.
	 *
	 * @param string $outcome Gateway outcome.
	 */
	private function replaceRefusal( string $outcome ): ?\WP_Error {
		if ( ScheduleGateway::REPLACED === $outcome ) {
			return null;
		}

		return ScheduleGateway::LOCKED === $outcome ? Errors::lockTimeout() : Errors::internal();
	}

	/**
	 * Build the schedule representation for a scope.
	 *
	 * @param int $staff_id    Staff id.
	 * @param int $service_id  Service id (0 wildcard).
	 * @param int $location_id Location id (0 wildcard).
	 * @return array<string, mixed>
	 */
	private function representation( int $staff_id, int $service_id, int $location_id ): array {
		$weekly_map   = array();
		$override_map = array();

		foreach ( $this->gateway->read( $staff_id, $service_id, $location_id ) as $row ) {
			$start  = (int) $row['start_minute'];
			$end    = (int) $row['end_minute'];
			$date   = $row['date_override'];
			$period = ( 0 === $start && 0 === $end ) ? null : array(
				'start_minute' => $start,
				'end_minute'   => $end,
			);

			if ( null === $date || '' === $date ) {
				$weekday                  = (int) $row['weekday'];
				$weekly_map[ $weekday ] ??= array();
				if ( null !== $period ) {
					$weekly_map[ $weekday ][] = $period;
				}
			} else {
				$override_map[ (string) $date ] ??= array();
				if ( null !== $period ) {
					$override_map[ (string) $date ][] = $period;
				}
			}
		}

		ksort( $weekly_map );
		ksort( $override_map );

		$weekly = array();
		foreach ( $weekly_map as $weekday => $periods ) {
			$weekly[] = array(
				'weekday' => $weekday,
				'periods' => $periods,
			);
		}
		$overrides = array();
		foreach ( $override_map as $date => $periods ) {
			$overrides[] = array(
				'date'    => $date,
				'periods' => $periods,
			);
		}

		return array(
			'staff_id'    => $staff_id,
			'service_id'  => 0 === $service_id ? null : $service_id,
			'location_id' => 0 === $location_id ? null : $location_id,
			'weekly'      => $weekly,
			'overrides'   => $overrides,
		);
	}

	/**
	 * Build the RESOLVED weekly representation (`?resolved=1`, rest-contract §2.6 addendum
	 * 2026-07-18 B4/#12). Reuses {@see ScheduleResolver} — the SAME weight rule (§5.2) the
	 * availability engine applies per day — so the returned weekly is exactly the effective
	 * OPEN set: the staff's own weekday rows (weight +4) win over the business `staff_id=0`
	 * rows, and a weekday the staff never overrides inherits business. Only weekly rows are
	 * considered (date overrides are per-date exceptions, out of the weekly grid), so
	 * `overrides` is always empty here. A weekday with no effective open period is OMITTED
	 * (the calendar treats an absent weekday as closed, mirroring the raw representation).
	 *
	 * @param int $staff_id    Staff id.
	 * @param int $service_id  Service id (0 wildcard).
	 * @param int $location_id Location id (0 wildcard).
	 * @return array<string, mixed>
	 */
	private function resolvedRepresentation( int $staff_id, int $service_id, int $location_id ): array {
		// ONE resolver definition for this read and `GET /locations/{id}/hours` (D-R63 fix round 1).
		$weekly = $this->resolver->resolveWeek( $this->repository->forStaff( $staff_id ), $staff_id, $service_id, $location_id );

		return array(
			'staff_id'    => $staff_id,
			'service_id'  => 0 === $service_id ? null : $service_id,
			'location_id' => 0 === $location_id ? null : $location_id,
			'weekly'      => $weekly,
			'overrides'   => array(),
		);
	}

	/**
	 * Validate + flatten weekly items into rows.
	 *
	 * @param array<int, mixed>     $weekly Weekly items.
	 * @param array<string, string> $fields Field-error accumulator (by reference).
	 * @return list<array{weekday:int, date_override:null, start_minute:int, end_minute:int}>
	 */
	private function weeklyRows( array $weekly, array &$fields ): array {
		$rows = array();
		$seen = array();

		foreach ( $weekly as $item ) {
			if ( ! is_array( $item ) || ! isset( $item['weekday'] ) || ! is_numeric( $item['weekday'] ) ) {
				$fields['weekly'] = __( 'Each weekly entry needs a weekday.', 'aponto' );
				continue;
			}
			$weekday = (int) $item['weekday'];
			if ( $weekday < 1 || $weekday > 7 ) {
				$fields['weekly'] = __( 'Weekday must be between 1 and 7.', 'aponto' );
				continue;
			}
			if ( isset( $seen[ $weekday ] ) ) {
				$fields['weekly'] = __( 'Weekdays must be unique.', 'aponto' );
				continue;
			}
			$seen[ $weekday ] = true;

			$periods = $this->periods( $item['periods'] ?? array(), 'weekly', $fields );
			if ( array() === $periods ) {
				$rows[] = array(
					'weekday'       => $weekday,
					'date_override' => null,
					'start_minute'  => 0,
					'end_minute'    => 0,
				);
				continue;
			}
			foreach ( $periods as $period ) {
				$rows[] = array(
					'weekday'       => $weekday,
					'date_override' => null,
					'start_minute'  => $period['start_minute'],
					'end_minute'    => $period['end_minute'],
				);
			}
		}

		return $rows;
	}

	/**
	 * Validate + flatten override items into rows.
	 *
	 * @param array<int, mixed>     $overrides Override items.
	 * @param array<string, string> $fields    Field-error accumulator (by reference).
	 * @return list<array{weekday:int, date_override:string, start_minute:int, end_minute:int}>
	 */
	private function overrideRows( array $overrides, array &$fields ): array {
		$rows = array();
		$seen = array();

		foreach ( $overrides as $item ) {
			if ( ! is_array( $item ) || ! isset( $item['date'] ) || ! is_string( $item['date'] ) || ! Args::isValidDate( $item['date'] ) ) {
				$fields['overrides'] = __( 'Each override needs a valid date.', 'aponto' );
				continue;
			}
			$date = $item['date'];
			if ( isset( $seen[ $date ] ) ) {
				$fields['overrides'] = __( 'Override dates must be unique.', 'aponto' );
				continue;
			}
			$seen[ $date ] = true;

			$periods = $this->periods( $item['periods'] ?? array(), 'overrides', $fields );
			if ( array() === $periods ) {
				$rows[] = array(
					'weekday'       => 0,
					'date_override' => $date,
					'start_minute'  => 0,
					'end_minute'    => 0,
				);
				continue;
			}
			foreach ( $periods as $period ) {
				$rows[] = array(
					'weekday'       => 0,
					'date_override' => $date,
					'start_minute'  => $period['start_minute'],
					'end_minute'    => $period['end_minute'],
				);
			}
		}

		return $rows;
	}

	/**
	 * Validate a periods array (each `0..1440`, `start < end`, sorted ascending, non-overlapping).
	 *
	 * @param mixed                 $raw    Raw periods value.
	 * @param string                $field  Owning field name for errors.
	 * @param array<string, string> $fields Field-error accumulator (by reference).
	 * @return list<array{start_minute:int, end_minute:int}>
	 */
	private function periods( mixed $raw, string $field, array &$fields ): array {
		if ( ! is_array( $raw ) ) {
			$fields[ $field ] = __( 'Periods must be a list.', 'aponto' );

			return array();
		}

		$result   = array();
		$prev_end = -1;
		foreach ( $raw as $period ) {
			if ( ! is_array( $period ) || ! isset( $period['start_minute'], $period['end_minute'] ) || ! is_numeric( $period['start_minute'] ) || ! is_numeric( $period['end_minute'] ) ) {
				$fields[ $field ] = __( 'Each period needs a start and end minute.', 'aponto' );

				return array();
			}
			$start = (int) $period['start_minute'];
			$end   = (int) $period['end_minute'];
			if ( $start < 0 || $end > 1440 || $start >= $end ) {
				$fields[ $field ] = __( 'Periods must be within 0..1440 with start before end.', 'aponto' );

				return array();
			}
			if ( $start < $prev_end ) {
				$fields[ $field ] = __( 'Periods must be sorted and must not overlap.', 'aponto' );

				return array();
			}
			$prev_end = $end;
			$result[] = array(
				'start_minute' => $start,
				'end_minute'   => $end,
			);
		}

		return $result;
	}
}

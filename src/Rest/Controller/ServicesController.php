<?php
/**
 * Admin `/services` controller (rest-contract §2.1–§2.3).
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

use Aponto\Booking\Repository\ConnectionRepository;
use Aponto\Booking\StaffLockFactory;
use Aponto\Database\LockFactory;
use Aponto\Database\StorageException;
use Aponto\Database\TransactionGuard;
use Aponto\Rest\Args;
use Aponto\Rest\Controller;
use Aponto\Rest\Data\ServiceGateway;
use Aponto\Rest\Errors;
use Aponto\Rest\Policy;
use Aponto\Rest\RequestValidator;
use Aponto\Rest\Services;
use Aponto\Rest\Support\Format;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Services CRUD, duplicate and reorder. Delete is blocked with `409 aponto_has_dependents` when a
 * booking references the service (entity lifecycle §4.4); a category FK miss yields
 * `404 aponto_not_found`.
 */
final class ServicesController implements Controller {

	/**
	 * Service data gateway.
	 *
	 * @var ServiceGateway
	 */
	private ServiceGateway $gateway;

	/**
	 * Database handle (delete/archive serialization lock + connection identity — review F item 1).
	 *
	 * @var \wpdb
	 */
	private \wpdb $wpdb;

	/**
	 * Clock (the double-submit window of {@see self::create()} — persona QA 2026-10-05, T-066).
	 *
	 * @var \Aponto\Support\Clock
	 */
	private \Aponto\Support\Clock $clock;

	/**
	 * Seconds within which a second, field-for-field identical `POST /services` is answered with
	 * the service the first one created instead of creating a twin.
	 */
	private const DOUBLE_SUBMIT_WINDOW = 10;

	/**
	 * Construct the controller.
	 *
	 * @param Services $services Service locator.
	 */
	public function __construct( Services $services ) {
		$this->wpdb    = $services->wpdb();
		$this->clock   = $services->clock();
		$this->gateway = new ServiceGateway( $services->wpdb(), $services->clock() );
	}

	/**
	 * Register routes.
	 *
	 * @param string $rest_namespace REST namespace.
	 */
	public function register( string $rest_namespace ): void {
		register_rest_route(
			$rest_namespace,
			'/services',
			array(
				array(
					'methods'             => 'GET',
					'permission_callback' => array( Policy::class, 'manageServices' ),
					'callback'            => array( $this, 'index' ),
					'args'                => array(
						'status'   => Args::argEnum( array( 'active', 'draft', 'archived', 'all' ), 'active' ),
						'search'   => Args::argSearch(),
						'page'     => Args::argPage(),
						'per_page' => Args::argPerPage(),
					),
				),
				array(
					'methods'             => 'POST',
					'permission_callback' => array( Policy::class, 'manageServices' ),
					'callback'            => array( $this, 'create' ),
				),
			)
		);

		register_rest_route(
			$rest_namespace,
			'/services/(?P<id>\d+)',
			array(
				array(
					'methods'             => 'GET',
					'permission_callback' => array( Policy::class, 'manageServices' ),
					'callback'            => array( $this, 'show' ),
					'args'                => array( 'id' => Args::argId() ),
				),
				array(
					'methods'             => 'PATCH',
					'permission_callback' => array( Policy::class, 'manageServices' ),
					'callback'            => array( $this, 'update' ),
					'args'                => array( 'id' => Args::argId() ),
				),
				array(
					'methods'             => 'DELETE',
					'permission_callback' => array( Policy::class, 'manageServices' ),
					'callback'            => array( $this, 'destroy' ),
					'args'                => array( 'id' => Args::argId() ),
				),
			)
		);

		register_rest_route(
			$rest_namespace,
			'/services/(?P<id>\d+)/duplicate',
			array(
				'methods'             => 'POST',
				'permission_callback' => array( Policy::class, 'manageServices' ),
				'callback'            => array( $this, 'duplicate' ),
				'args'                => array( 'id' => Args::argId() ),
			)
		);

		register_rest_route(
			$rest_namespace,
			'/services/reorder',
			array(
				'methods'             => 'POST',
				'permission_callback' => array( Policy::class, 'manageServices' ),
				'callback'            => array( $this, 'reorder' ),
			)
		);
	}

	/**
	 * GET /services.
	 *
	 * @param WP_REST_Request $request Request.
	 */
	public function index( WP_REST_Request $request ): WP_REST_Response {
		$page     = (int) $request->get_param( 'page' );
		$per_page = (int) $request->get_param( 'per_page' );
		$result   = $this->gateway->list(
			(string) $request->get_param( 'status' ),
			(string) $request->get_param( 'search' ),
			$page,
			$per_page
		);

		$items         = array_map( array( $this, 'toDto' ), $result['items'] );
		$ids           = array_map( static fn ( array $row ): int => (int) $row['id'], $items );
		$counts        = $this->gateway->staffCountsFor( $ids );
		$booking_count = $this->gateway->bookingCountsFor( $ids );
		$active_counts = $this->gateway->activeStaffCountsFor( $ids );
		foreach ( $items as $index => $item ) {
			// Additive (persona QA 2026-10-05): distinct ACTIVE eligible staff. 0 on an active
			// service = customers cannot see it (the public catalogue's own rule, T-073).
			$items[ $index ]['active_staff_count'] = $active_counts[ (int) $item['id'] ] ?? 0;
			// Additive list-column extensions: distinct eligible staff count (B4b) and booking
			// count (C1 — the UI shows a permanent Delete only when this is 0; otherwise Archive).
			$items[ $index ]['staff_count']   = $counts[ (int) $item['id'] ] ?? 0;
			$items[ $index ]['booking_count'] = $booking_count[ (int) $item['id'] ] ?? 0;
		}

		return new WP_REST_Response( Format::envelope( $items, $page, $per_page, $result['total'] ), 200 );
	}

	/**
	 * POST /services.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function create( WP_REST_Request $request ) {
		$data = $this->validateBody( $request, false );
		if ( is_wp_error( $data ) ) {
			return $data;
		}

		// A double submit creates ONE service (persona QA 2026-10-05, T-066). A service has no
		// natural key — two services may legitimately share a name — so the server cannot refuse a
		// twin outright. What it can recognise is the double tap: a second POST whose every field
		// equals a service created in the last few seconds answers `200` with THAT service and
		// creates nothing. The look-up and the insert share one per-site lock, or two concurrent
		// POSTs would both miss and both insert. The editor also blocks the second click; this is
		// the half that still holds when two requests are already on the wire.
		$guard = new TransactionGuard( $this->wpdb );
		$lock  = ( new LockFactory( $this->wpdb ) )->named( 'apt:' . substr( hash( 'sha256', $this->wpdb->prefix . '|service-create' ), 0, 48 ) );
		if ( ! $lock->acquire( 3 ) ) {
			return Errors::lockTimeout();
		}

		$created = true;
		try {
			$id = $this->recentTwinId( $data );
			if ( $id > 0 ) {
				$created = false;
			} else {
				// E1 pre-write: a reconnect since acquire() silently dropped the lock.
				if ( null === $lock->connectionId() || $lock->connectionId() !== $guard->currentConnectionId() ) {
					return Errors::lockTimeout();
				}
				$id = $this->gateway->create( $data );
			}
		} finally {
			if ( null !== $lock->connectionId() && $lock->connectionId() === $guard->currentConnectionId() ) {
				$lock->release();
			}
		}

		$row = $this->gateway->find( $id );
		if ( null === $row ) {
			return Errors::notFound();
		}

		if ( ! $created ) {
			// The first request already announced this service; a replay is not a second creation.
			return new WP_REST_Response( $this->toDto( $row ), 200 );
		}

		try {
			/**
			 * Fires after a service is created and business locks are released (extension-surface §2).
			 *
			 * @param array<string, mixed> $row Persisted domain row.
			 */
			do_action( 'aponto_service_creation_committed', $row );
		} catch ( \Throwable $listener_failure ) {
			unset( $listener_failure ); // Post-commit extensions cannot invalidate the saved operation.
		}

		return new WP_REST_Response( $this->toDto( $row ), 201 );
	}

	/**
	 * The id of a service created within {@see self::DOUBLE_SUBMIT_WINDOW} seconds whose every
	 * submitted column equals `$data`, or 0.
	 *
	 * The candidates are narrowed in SQL on the two columns that are never null and compared
	 * column by column in PHP, which keeps the statement portable (no null-safe operator) and makes
	 * "identical" mean every field the request carried — a different price or category is a
	 * different service, however quickly it follows.
	 *
	 * @param array<string, mixed> $data Validated column data of the incoming create.
	 */
	private function recentTwinId( array $data ): int {
		$table = $this->wpdb->prefix . 'aponto_services';
		$since = $this->clock->now()->setTimezone( new \DateTimeZone( 'UTC' ) )->modify( '-' . self::DOUBLE_SUBMIT_WINDOW . ' seconds' )->format( 'Y-m-d H:i:s' );
		$sql   = "SELECT id FROM {$table} WHERE name = %s AND duration_minutes = %d AND created_at >= %s ORDER BY id DESC LIMIT 5";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		$ids = $this->wpdb->get_col( $this->wpdb->prepare( $sql, (string) ( $data['name'] ?? '' ), (int) ( $data['duration_minutes'] ?? 0 ), $since ) );

		foreach ( is_array( $ids ) ? $ids : array() as $candidate ) {
			$row = $this->gateway->find( (int) $candidate );
			if ( null !== $row && self::sameColumns( $data, $row ) ) {
				return (int) $candidate;
			}
		}

		return 0;
	}

	/**
	 * Whether a stored row holds exactly the submitted values (null stays distinct from 0 and '').
	 *
	 * @param array<string, mixed> $data Submitted column data.
	 * @param array<string, mixed> $row  Stored row.
	 */
	private static function sameColumns( array $data, array $row ): bool {
		foreach ( $data as $column => $value ) {
			if ( ! array_key_exists( $column, $row ) ) {
				continue;
			}
			$stored = $row[ $column ];
			if ( ( null === $value ) !== ( null === $stored ) ) {
				return false;
			}
			if ( null !== $value && (string) $value !== (string) $stored ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * GET /services/{id}.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function show( WP_REST_Request $request ) {
		$row = $this->gateway->find( (int) $request->get_param( 'id' ) );
		if ( null === $row ) {
			return Errors::notFound();
		}

		return new WP_REST_Response( $this->toDto( $row ), 200 );
	}

	/**
	 * PATCH /services/{id}.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function update( WP_REST_Request $request ) {
		$id     = (int) $request->get_param( 'id' );
		$before = $this->gateway->find( $id );
		if ( null === $before ) {
			return Errors::notFound();
		}

		$data = $this->validateBody( $request, true );
		if ( is_wp_error( $data ) ) {
			return $data;
		}

		// Archive-vs-book serialization (review F item 1, staff-status pattern): a status flip
		// (active → archived being the critical direction) changes bookability, and the reservation
		// engine's recheck reads the status under the per-service lock — so it must be serialized
		// through the SAME lock; a plain field edit (name/price/…) does not affect the
		// exists+active recheck and stays lock-free.
		if ( isset( $data['status'] ) ) {
			$locked = $this->updateStatusSerialized( $id, $data );
			if ( null !== $locked ) {
				return $locked;
			}
		} else {
			$this->gateway->update( $id, $data );
		}

		$row = $this->gateway->find( $id );
		if ( null === $row ) {
			return Errors::notFound();
		}

		if ( $before !== $row ) {
			try {
				/**
				 * Fires after a service is updated and business locks are released (extension-surface §2).
				 *
				 * @param array<string, mixed> $row Persisted domain row.
				 * @param array<string, mixed> $before Previous domain row.
				 */
				do_action( 'aponto_service_updated', $row, $before );
			} catch ( \Throwable $listener_failure ) {
				unset( $listener_failure ); // Post-commit extensions cannot invalidate the saved operation.
			}
		}

		return new WP_REST_Response( $this->toDto( $row ), 200 );
	}

	/**
	 * Apply a status-bearing PATCH under the per-service advisory lock (review F item 1) — the same
	 * lock every reservation holds — so an archive can never land BETWEEN a reservation's in-lock
	 * bookability recheck and its COMMIT. E1 identity checks bracket the write: a post-write
	 * mismatch means the UPDATE replayed on a fresh connection WITHOUT the lock, so the captured
	 * prior status is restored best-effort and the caller gets the retryable lock error.
	 *
	 * @param int                  $id   Service id.
	 * @param array<string, mixed> $data Validated PATCH columns (status present).
	 * @return WP_Error|null Lock/not-found error, or null on success.
	 */
	private function updateStatusSerialized( int $id, array $data ): ?WP_Error {
		$guard = new TransactionGuard( $this->wpdb );
		$lock  = ( new StaffLockFactory( $this->wpdb ) )->forService( $id );
		if ( ! $lock->acquire( 3 ) ) {
			// FAIL-CLOSED: a reservation (or another admin write) holds the lock — never flip the
			// status unserialized.
			return Errors::lockTimeout();
		}

		try {
			$row = $this->gateway->find( $id );
			if ( null === $row ) {
				return Errors::notFound();
			}
			$prior_status = (string) $row['status'];

			// E1 pre-write.
			if ( null === $lock->connectionId() || $lock->connectionId() !== $guard->currentConnectionId() ) {
				return Errors::lockTimeout();
			}

			$this->gateway->update( $id, $data );

			// E1 post-write — the write's own protection: a reconnect during the UPDATE replayed it
			// without the lock. Restore the captured prior status (deterministic pre-image; the other
			// PATCH fields do not affect bookability and may stand) and report the retryable loss.
			if ( null === $lock->connectionId() || $lock->connectionId() !== $guard->currentConnectionId() ) {
				$suppressed = $this->wpdb->suppress_errors( true );
				$this->gateway->update( $id, array( 'status' => $prior_status ) );
				$this->wpdb->suppress_errors( $suppressed );

				return Errors::lockTimeout();
			}

			return null;
		} finally {
			if ( null !== $lock->connectionId() && $lock->connectionId() === $guard->currentConnectionId() ) {
				$lock->release();
			}
		}
	}

	/**
	 * DELETE /services/{id}.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function destroy( WP_REST_Request $request ) {
		$id = (int) $request->get_param( 'id' );

		// Delete-vs-book serialization (review F item 1, location-delete pattern): the reservation
		// engine acquires this SAME per-service lock for every booking and re-verifies the service
		// exists + is active under it, so this delete and an in-flight reservation can never
		// interleave between the hasBookings check and either side's commit. Dependents are
		// re-checked UNDER the lock (a racer's committed booking is visible → 409), and the
		// post-delete identity check compensates a reconnect-replayed DELETE by restoring the
		// captured pre-image. FAIL-CLOSED throughout.
		$guard = new TransactionGuard( $this->wpdb );
		$lock  = ( new StaffLockFactory( $this->wpdb ) )->forService( $id );
		if ( ! $lock->acquire( 3 ) ) {
			return Errors::lockTimeout();
		}

		try {
			$row = $this->gateway->find( $id );
			if ( null === $row ) {
				return Errors::notFound();
			}
			if ( $this->gateway->hasBookings( $id ) ) {
				return Errors::hasDependents();
			}
			// E1 pre-write.
			if ( null === $lock->connectionId() || $lock->connectionId() !== $guard->currentConnectionId() ) {
				return Errors::lockTimeout();
			}

			$this->gateway->delete( $id );

			// E1 post-write: a reconnect during the DELETE replayed it without the lock — restore the
			// pre-image and report the retryable loss (the retry deletes cleanly under a fresh lock).
			if ( null === $lock->connectionId() || $lock->connectionId() !== $guard->currentConnectionId() ) {
				$suppressed = $this->wpdb->suppress_errors( true );
				$this->gateway->restore( $row );
				$this->wpdb->suppress_errors( $suppressed );

				return Errors::lockTimeout();
			}
		} finally {
			if ( null !== $lock->connectionId() && $lock->connectionId() === $guard->currentConnectionId() ) {
				$lock->release();
			}
		}

		try {
			/**
			 * Fires after a service is deleted and business locks are released (extension-surface §2).
			 *
			 * @param array<string, mixed> $row Deleted row pre-image.
			 */
			do_action( 'aponto_service_deleted', $row );
		} catch ( \Throwable $listener_failure ) {
			unset( $listener_failure ); // Post-commit extensions cannot invalidate the saved operation.
		}

		return new WP_REST_Response(
			array(
				'deleted' => true,
				'id'      => $id,
			),
			200
		);
	}

	/**
	 * POST /services/{id}/duplicate.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function duplicate( WP_REST_Request $request ) {
		$id  = (int) $request->get_param( 'id' );
		$row = $this->gateway->find( $id );
		if ( null === $row ) {
			return Errors::notFound();
		}

		/* translators: %s: original service name. */
		$copy_name = sprintf( __( '%s (copy)', 'aponto' ), (string) $row['name'] );
		$copy_name = mb_substr( $copy_name, 0, Args::MAX_191 );
		$new_id    = $this->gateway->duplicate( $id, $copy_name );
		$new_row   = $this->gateway->find( $new_id );
		if ( null === $new_row ) {
			return Errors::notFound();
		}

		// The copy keeps the source's staff × location assignments (persona QA 2026-10-05, T-075).
		// With `multi_staff` there is no auto-link, so a duplicate used to come back with NOBODY
		// assigned: activating it produced a service nobody could book, and re-ticking every member
		// and branch by hand is exactly the work "Duplicate" exists to save. The copy is a draft
		// with no bookings, so no reservation can race this write and the per-service lock the
		// eligibility PUT takes is not needed. A source with no assignments leaves whatever the
		// create hook seeded (the Free single-staff auto-link) untouched. Best-effort: the copy
		// already exists, and a failed assignment copy is repaired in its editor.
		$connections = new ConnectionRepository( $this->wpdb );
		$assignments = $connections->eligibilityForService( $id );
		if ( array() !== $assignments ) {
			try {
				$connections->replaceForService( $new_id, $assignments );
			} catch ( StorageException $failure ) {
				unset( $failure );
			}
		}

		try {
			/**
			 * Fires after a service is created and business locks are released (extension-surface §2).
			 *
			 * @param array<string, mixed> $row Persisted domain row.
			 */
			do_action( 'aponto_service_creation_committed', $new_row );
		} catch ( \Throwable $listener_failure ) {
			unset( $listener_failure ); // Post-commit extensions cannot invalidate the saved operation.
		}

		try {
			/**
			 * Copy module-owned metadata after the new service has been persisted.
			 *
			 * @param int $new_id New service id.
			 * @param int $id Source service id.
			 */
			do_action( 'aponto_service_duplicated', $new_id, $id );
		} catch ( \Throwable $listener_failure ) {
			unset( $listener_failure ); // Independent of creation listeners and the committed result.
		}

		return new WP_REST_Response( $this->toDto( $new_row ), 201 );
	}

	/**
	 * POST /services/reorder.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function reorder( WP_REST_Request $request ) {
		$raw = $request->get_param( 'ids' );
		if ( ! is_array( $raw ) || array() === $raw ) {
			return Errors::validation( array( 'ids' => __( 'A non-empty list of ids is required.', 'aponto' ) ) );
		}

		$ids = array();
		foreach ( $raw as $value ) {
			if ( ! is_numeric( $value ) || (int) $value < 1 ) {
				return Errors::validation( array( 'ids' => __( 'Every id must be a positive integer.', 'aponto' ) ) );
			}
			$ids[] = (int) $value;
		}
		if ( count( array_unique( $ids ) ) !== count( $ids ) ) {
			return Errors::validation( array( 'ids' => __( 'Ids must be distinct.', 'aponto' ) ) );
		}

		// Reorder serialization (review F item 4): validate-then-write under one per-site lock, so
		// two concurrent full-set replacements cannot interleave their per-row position UPDATEs into
		// duplicated positions — the loser waits and applies a complete permutation over the winner's.
		$guard = new TransactionGuard( $this->wpdb );
		$lock  = ( new StaffLockFactory( $this->wpdb ) )->forReorder( 'services' );
		if ( ! $lock->acquire( 3 ) ) {
			return Errors::lockTimeout();
		}

		$transaction_open = false;
		try {
			$previous = $this->gateway->allIds();
			$existing = $previous;
			sort( $existing );
			$sorted = $ids;
			sort( $sorted );
			if ( $sorted !== $existing ) {
				return Errors::validation( array( 'ids' => __( 'The list must contain exactly every service.', 'aponto' ) ) );
			}

			// E1 pre-write.
			if ( null === $lock->connectionId() || $lock->connectionId() !== $guard->currentConnectionId() ) {
				return Errors::lockTimeout();
			}

			$guard->beginReadCommitted();
			$transaction_open = true;
			if ( ! $this->gateway->reorder( $ids ) ) {
				return Errors::internal();
			}

			// A lost session cannot report or emit a successful reorder.
			if ( null === $lock->connectionId() || $lock->connectionId() !== $guard->currentConnectionId() ) {
				return Errors::lockTimeout();
			}
			$guard->commit();
			$transaction_open = false;
			if ( $lock->connectionId() !== $guard->currentConnectionId() ) {
				return Errors::lockTimeout();
			}
		} catch ( \Aponto\Database\StorageException $failure ) {
			unset( $failure );
			return Errors::internal();
		} finally {
			if ( $transaction_open ) {
				$guard->rollback();
			}
			if ( null !== $lock->connectionId() && $lock->connectionId() === $guard->currentConnectionId() ) {
				$lock->release();
			}
		}

		if ( $previous !== $ids ) {
			try {
				do_action( 'aponto_service_reordered', array( 'ids' => $ids ), array( 'ids' => $previous ) );
			} catch ( \Throwable $listener_failure ) {
				unset( $listener_failure ); // Keep the committed reorder successful.
			}
		}
		return new WP_REST_Response( array( 'ids' => $ids ), 200 );
	}

	/**
	 * Validate a create/update body.
	 *
	 * @param WP_REST_Request $request Request.
	 * @param bool            $partial Whether this is a partial (PATCH) body.
	 * @return array<string, mixed>|WP_Error
	 */
	private function validateBody( WP_REST_Request $request, bool $partial ) {
		$v    = new RequestValidator();
		$data = array();

		if ( $this->wants( $request, $partial, 'category_id' ) ) {
			$data['category_id'] = $v->nullableId( 'category_id', $request->get_param( 'category_id' ) );
		}
		if ( $this->wants( $request, $partial, 'name' ) ) {
			$data['name'] = $v->name( 'name', $request->get_param( 'name' ) );
		}
		if ( $this->wants( $request, $partial, 'description' ) ) {
			$data['description'] = $v->text( $request->get_param( 'description' ) ?? '' );
		}
		if ( $this->wants( $request, $partial, 'image_id' ) ) {
			$data['image_id'] = $v->nullableId( 'image_id', $request->get_param( 'image_id' ) );
		}
		if ( $this->wants( $request, $partial, 'color' ) ) {
			$data['color'] = $v->hexColor( 'color', $request->get_param( 'color' ) );
		}
		if ( $this->wants( $request, $partial, 'duration_minutes' ) ) {
			$data['duration_minutes'] = $v->intInRange( 'duration_minutes', $request->get_param( 'duration_minutes' ), 5, 480, 5 );
		}
		if ( $this->wants( $request, $partial, 'buffer_before' ) ) {
			$data['buffer_before'] = $v->intInRange( 'buffer_before', $request->get_param( 'buffer_before' ) ?? 0, 0, 120 );
		}
		if ( $this->wants( $request, $partial, 'buffer_after' ) ) {
			$data['buffer_after'] = $v->intInRange( 'buffer_after', $request->get_param( 'buffer_after' ) ?? 0, 0, 120 );
		}
		if ( $this->wants( $request, $partial, 'slot_step_minutes' ) ) {
			$data['slot_step_minutes'] = $v->nullableInt( 'slot_step_minutes', $request->get_param( 'slot_step_minutes' ), 5, 480 );
		}
		if ( $this->wants( $request, $partial, 'capacity' ) ) {
			/**
			 * V1 accepts the forward-compatible field but implements capacity=1. This is deliberately
			 * not a `Plan::has()` unlock (D-R41): a separately distributed group-capacity module must
			 * contribute the attendee/capacity write behavior it adds.
			 */
			$data['capacity'] = 1;
		}

		/*
		 * The three nullable numerics are bounded by their COLUMN types, not just at zero: without
		 * SQL strict mode an oversized value is silently clamped to the column maximum, so the write
		 * reports success and stores a different number (a price of 999,999,999 came back as
		 * 42,949,672.95 on the public form). Out of range is a `422 aponto_validation` on the field.
		 */
		if ( $this->wants( $request, $partial, 'price_minor' ) ) {
			$data['price_minor'] = $v->nullableInt( 'price_minor', $request->get_param( 'price_minor' ), 0, Args::MAX_PRICE_MINOR );
		}
		if ( $this->wants( $request, $partial, 'min_lead_minutes' ) ) {
			$data['min_lead_minutes'] = $v->nullableInt( 'min_lead_minutes', $request->get_param( 'min_lead_minutes' ), 0, Args::MAX_INT_UNSIGNED );
		}
		if ( $this->wants( $request, $partial, 'max_horizon_days' ) ) {
			$data['max_horizon_days'] = $v->nullableInt( 'max_horizon_days', $request->get_param( 'max_horizon_days' ), 1, Args::MAX_SMALLINT_UNSIGNED );
		}
		if ( $this->wants( $request, $partial, 'status' ) ) {
			$data['status'] = $v->enum( 'status', $request->get_param( 'status' ) ?? 'active', array( 'active', 'draft', 'archived' ) );
		}
		if ( ! $partial && $this->wants( $request, $partial, 'position' ) ) {
			$data['position'] = (int) ( $request->get_param( 'position' ) ?? 0 );
		}

		if ( $v->failed() ) {
			return Errors::validation( $v->errors() );
		}
		if ( $partial && array() === $data ) {
			return Errors::validation( array( '_' => __( 'At least one field must be provided.', 'aponto' ) ) );
		}

		if ( isset( $data['category_id'] ) && null !== $data['category_id'] && ! $this->gateway->categoryExists( (int) $data['category_id'] ) ) {
			return Errors::notFound();
		}

		return $data;
	}

	/**
	 * Whether a field should be processed (always for POST; only when present for PATCH).
	 *
	 * @param WP_REST_Request $request Request.
	 * @param bool            $partial Partial mode.
	 * @param string          $field   Field name.
	 */
	private function wants( WP_REST_Request $request, bool $partial, string $field ): bool {
		return ! $partial || $request->has_param( $field );
	}

	/**
	 * Serialize a service row to its DTO.
	 *
	 * @param array<string, mixed> $row Raw row.
	 * @return array<string, mixed>
	 */
	private function toDto( array $row ): array {
		return array(
			'id'                => (int) $row['id'],
			'category_id'       => Format::intOrNull( $row['category_id'] ),
			'name'              => (string) $row['name'],
			'description'       => (string) $row['description'],
			'image_id'          => Format::intOrNull( $row['image_id'] ),
			'color'             => Format::stringOrNull( $row['color'] ),
			'duration_minutes'  => (int) $row['duration_minutes'],
			'buffer_before'     => (int) $row['buffer_before'],
			'buffer_after'      => (int) $row['buffer_after'],
			'slot_step_minutes' => Format::intOrNull( $row['slot_step_minutes'] ),
			'capacity'          => (int) $row['capacity'],
			'price_minor'       => Format::intOrNull( $row['price_minor'] ),
			'min_lead_minutes'  => Format::intOrNull( $row['min_lead_minutes'] ),
			'max_horizon_days'  => Format::intOrNull( $row['max_horizon_days'] ),
			'status'            => (string) $row['status'],
			'position'          => (int) $row['position'],
			'created_at'        => Format::utcDatetime( (string) $row['created_at'] ),
			'updated_at'        => Format::utcDatetime( (string) $row['updated_at'] ),
		);
	}
}

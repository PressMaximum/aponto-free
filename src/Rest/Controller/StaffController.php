<?php
/**
 * Admin `/staff` controller (rest-contract §2.5).
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
use Aponto\Database\TransactionGuard;
use Aponto\Integration\IntegrationService;
use Aponto\Integration\RemoteEventSync;
use Aponto\Rest\Args;
use Aponto\Rest\Controller;
use Aponto\Rest\Data\StaffGateway;
use Aponto\Rest\Errors;
use Aponto\Rest\Policy;
use Aponto\Rest\RequestValidator;
use Aponto\Rest\Services;
use Aponto\Rest\Support\Format;
use Aponto\Rest\Support\RequestFields;
use Aponto\Rest\Support\StaffAvatar;
use Aponto\Support\PersonName;
use WP_Error;
use WP_Post;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Staff CRUD. Storage accepts multiple rows in every edition (D-R42); the Free admin presentation
 * owns its one-staff Add boundary rather than turning a direct REST create into a plan error.
 * Create rejects unknown `avatar_id`/`wp_user_id` references with `404 aponto_not_found`. Delete
 * is blocked with `409 aponto_has_dependents` when a booking references the staff member (entity
 * lifecycle §4.4).
 */
final class StaffController implements Controller {

	/**
	 * Maximum `title` length — the `varchar(191)` column width (migration 0011).
	 */
	private const TITLE_MAX = 191;

	/**
	 * Maximum `bio` length. A PRODUCT ceiling, not a column one: the column is `text`, and the
	 * booking form's staff row has room for a sentence or two, not an essay. The admin
	 * counter counts down to this same number (D-R51).
	 */
	private const BIO_MAX = 600;

	/**
	 * Staff data gateway.
	 *
	 * @var StaffGateway
	 */
	private StaffGateway $gateway;

	/**
	 * Database handle (delete serialization lock + connection identity).
	 *
	 * @var \wpdb
	 */
	private \wpdb $wpdb;

	/**
	 * Eligibility reader — backs the `service_ids` field of the detail response.
	 *
	 * @var ConnectionRepository
	 */
	private ConnectionRepository $connections;

	/**
	 * Construct the controller.
	 *
	 * @param Services $services Service locator.
	 */
	public function __construct( Services $services ) {
		$this->wpdb        = $services->wpdb();
		$this->gateway     = new StaffGateway( $services->wpdb(), $services->clock() );
		$this->connections = $services->connectionRepository();
	}

	/**
	 * Register routes.
	 *
	 * @param string $rest_namespace REST namespace.
	 */
	public function register( string $rest_namespace ): void {
		register_rest_route(
			$rest_namespace,
			'/staff',
			array(
				array(
					'methods'             => 'GET',
					'permission_callback' => array( Policy::class, 'manageStaff' ),
					'callback'            => array( $this, 'index' ),
					'args'                => array(
						'status'   => Args::argEnum( array( 'active', 'archived', 'all' ), 'active' ),
						'search'   => Args::argSearch(),
						'page'     => Args::argPage(),
						'per_page' => Args::argPerPage(),
						'order_by' => Args::argEnum( array( 'position', 'id' ), 'position' ),
					),
				),
				array(
					'methods'             => 'POST',
					'permission_callback' => array( Policy::class, 'manageStaff' ),
					'callback'            => array( $this, 'create' ),
				),
			)
		);

		register_rest_route(
			$rest_namespace,
			'/staff/(?P<id>\d+)',
			array(
				array(
					'methods'             => 'GET',
					'permission_callback' => array( Policy::class, 'manageStaff' ),
					'callback'            => array( $this, 'show' ),
					'args'                => array( 'id' => Args::argId() ),
				),
				array(
					'methods'             => 'PATCH',
					'permission_callback' => array( Policy::class, 'manageStaff' ),
					'callback'            => array( $this, 'update' ),
					'args'                => array( 'id' => Args::argId() ),
				),
				array(
					'methods'             => 'DELETE',
					'permission_callback' => array( Policy::class, 'manageStaff' ),
					'callback'            => array( $this, 'destroy' ),
					'args'                => array( 'id' => Args::argId() ),
				),
			)
		);
	}

	/**
	 * GET /staff.
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
			$per_page,
			(string) $request->get_param( 'order_by' )
		);

		$items = array_map( array( $this, 'toDto' ), $result['items'] );
		$aggs  = $this->gateway->aggregatesFor( array_map( static fn ( array $row ): int => (int) $row['id'], $items ) );
		foreach ( $items as $index => $item ) {
			// Additive list-column extensions (B4b): eligibility count + work-hours mode.
			$agg                                 = $aggs[ (int) $item['id'] ] ?? array(
				'service_count'    => 0,
				'has_custom_hours' => false,
			);
			$items[ $index ]['service_count']    = (int) $agg['service_count'];
			$items[ $index ]['has_custom_hours'] = (bool) $agg['has_custom_hours'];
		}

		return new WP_REST_Response( Format::envelope( $items, $page, $per_page, $result['total'] ), 200 );
	}

	/**
	 * POST /staff.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function create( WP_REST_Request $request ) {
		$data = $this->validateBody( $request, false );
		if ( is_wp_error( $data ) ) {
			return $data;
		}

		$error = $this->checkForeignKeys( $data );
		if ( null !== $error ) {
			return $error;
		}

		if ( ! isset( $data['position'] ) ) {
			$data['position'] = $this->gateway->maxPosition() + 1;
		}

		$id = $this->gateway->create( $data );
		if ( $id <= 0 ) {
			// The insert statement itself failed — a real 500, never a fabricated "created".
			return Errors::internal();
		}

		$row = $this->gateway->find( $id );
		if ( null === $row ) {
			return Errors::notFound();
		}

		try {
			/**
			 * Fires after a staff is created and business locks are released (extension-surface §2).
			 *
			 * @param array<string, mixed> $row Persisted domain row.
			 */
			do_action( 'aponto_staff_creation_committed', PersonName::withDisplayName( $row ) );
		} catch ( \Throwable $listener_failure ) {
			unset( $listener_failure ); // Post-commit extensions cannot invalidate the saved operation.
		}

		return new WP_REST_Response( $this->toDto( $row ), 201 );
	}

	/**
	 * GET /staff/{id}.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function show( WP_REST_Request $request ) {
		$id  = (int) $request->get_param( 'id' );
		$row = $this->gateway->find( $id );
		if ( null === $row ) {
			return Errors::notFound();
		}

		// `service_ids` is DETAIL-ONLY and additive (rest-contract §2.5, D-R28 2026-08-27): the
		// reverse of `GET /services/{id}/eligibility`, so the staff workspace can list what this
		// member is assigned to in ONE request instead of one per service. Kept off the list
		// response on purpose — that would be a per-row query on a screen that already caps at 100
		// rows, and the list already carries the `service_count` aggregate it needs.
		$dto                = $this->toDto( $row );
		$dto['service_ids'] = $this->connections->servicesForStaff( $id );

		return new WP_REST_Response( $dto, 200 );
	}

	/**
	 * PATCH /staff/{id}.
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

		$error = $this->checkForeignKeys( $data );
		if ( null !== $error ) {
			return $error;
		}

		// A status change (archive/restore) flips BOOKABILITY, which the reservation engine verifies
		// under the per-staff lock — so it must be serialized through the SAME lock (R2 #2); a plain
		// field edit (name/email/...) does not affect bookability and stays lock-free.
		if ( array_key_exists( 'status', $data ) ) {
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
				 * Fires after a staff is updated and business locks are released (extension-surface §2).
				 *
				 * @param array<string, mixed> $row Persisted domain row.
				 * @param array<string, mixed> $before Previous domain row.
				 */
				do_action( 'aponto_staff_updated', PersonName::withDisplayName( $row ), PersonName::withDisplayName( $before ) );
			} catch ( \Throwable $listener_failure ) {
				unset( $listener_failure ); // Post-commit extensions cannot invalidate the saved operation.
			}
		}

		return new WP_REST_Response( $this->toDto( $row ), 200 );
	}

	/**
	 * Apply a status-bearing PATCH under the per-staff advisory lock (R2 #2) — the same lock every
	 * reservation holds — so an archive can never land BETWEEN a reservation's in-lock bookability
	 * check and its commit. Reconnect handling (E1): identity is verified before AND after the write;
	 * a post-write mismatch means the UPDATE replayed on a fresh connection WITHOUT the lock, so the
	 * captured prior status is restored best-effort and the caller gets the retryable lock error.
	 *
	 * @param int                  $id   Staff id.
	 * @param array<string, mixed> $data Validated PATCH columns (contains `status`).
	 * @return WP_Error|null Error to return, or null when the update committed cleanly.
	 */
	private function updateStatusSerialized( int $id, array $data ): ?WP_Error {
		$guard = new TransactionGuard( $this->wpdb );
		$lock  = ( new StaffLockFactory( $this->wpdb ) )->forStaff( $id );
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
	 * Integration connection storage, used only by the hard-delete compensation path.
	 *
	 * @var \Aponto\Integration\ConnectionStore|null
	 */
	private ?\Aponto\Integration\ConnectionStore $integration_connections = null;

	/**
	 * DELETE /staff/{id}.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function destroy( WP_REST_Request $request ) {
		$id = (int) $request->get_param( 'id' );

		// Delete-vs-reservation race (entity lifecycle §4.4): a concurrent booking for THIS staff
		// holds the per-staff advisory lock through its transaction, and the reservation re-verifies
		// the staff is still bookable under that lock. We take the SAME lock, then check existence +
		// dependents UNDER it — so a booking a racer just committed is visible and yields 409 instead
		// of leaving an orphan. FAIL-CLOSED: without the lock we never delete unserialized.
		$guard                         = new TransactionGuard( $this->wpdb );
		$removed_connections           = array();
		$this->integration_connections = $this->integration_connections ?? \Aponto\Integration\ConnectionStore::make();
		// SHARE the store this method locks (Codex round 5, #6): the service performs the nested
		// projection writes, and it must reason about the same ownership this method established.
		$integrations = IntegrationService::make( $this->integration_connections );
		$lock         = ( new StaffLockFactory( $this->wpdb ) )->forStaff( $id );
		if ( ! $lock->acquire( 3 ) ) {
			return Errors::lockTimeout();
		}

		try {
			// Read against DB truth under the lock: existence (a racing delete) + dependents (a racing
			// reservation that committed while we waited). The full row is the recovery pre-image.
			$row = $this->gateway->find( $id );
			if ( null === $row ) {
				return Errors::notFound();
			}
			if ( $this->gateway->hasBookings( $id ) ) {
				return Errors::hasDependents();
			}
			// E1 pre-write: if wpdb reconnected since acquire, the lock is gone server-side — abort
			// rather than delete while a reservation could be mid-flight.
			if ( null === $lock->connectionId() || $lock->connectionId() !== $guard->currentConnectionId() ) {
				return Errors::lockTimeout();
			}

			// LOCK ORDER: staff lock → projection lock → transaction (Codex round 4, REG-3). The
			// projection lock must be taken BEFORE the transaction opens: on SQLite it is a FILE lock,
			// and every ordinary projection writer takes it before touching `wp_options`. Acquiring it
			// while already holding the database writer would put this path on the opposite side of
			// that order — a bounded inversion that surfaces as 3-second stalls and rollbacks under
			// concurrency rather than as a deadlock, which is worse, because it looks like slowness.
			$projection_lease = $this->integration_connections->lockProjection( 3 );
			if ( null === $projection_lease ) {
				return Errors::lockTimeout();
			}

			// ONE TRANSACTION for the staff row AND its integration connections (Codex round 3, P1 #7).
			// They were two independent writes: a failure between them left either a deleted staff
			// member whose encrypted OAuth token survived — unlistable, undisconnectable — or, after
			// the E1 compensation restored the row, a staff member whose connections had been wiped.
			// Neither is recoverable by retrying, so they commit or roll back together.
			//
			// `beginReadCommitted()` rather than a raw `begin()`: it is the ambient-transaction
			// detecting entry the reservation path uses, and R3-3's fail-closed rule applies to every
			// transaction this plugin opens, not only to the booking one (Codex round 4, REG-3).
			//
			// The projection is NOT transactional (it is an option), which is why it is written last
			// and compensated by ConnectionStore itself: an option write that lands against a rolled
			// back row leaves a phantom entry, and a phantom entry is the self-healing direction —
			// `find()` prunes it on the next read.
			try {
				$guard->beginReadCommitted();
				try {
					// THROWS unless exactly one row went, so a failed DELETE cannot commit alongside a
					// successful connection cleanup (Codex round 4, P1 #7).
					$this->gateway->delete( $id );

					// Local rows only here — this is inside the transaction AND the per-staff advisory
					// lock, and the remote revoke is HTTP, so it happens after both are released.
					// ARCHIVING a staff member deliberately keeps everything; this is the hard-delete path.
					// The lease is handed DOWN rather than remembered globally (Codex round 6, #6): the
					// nested projection writes learn the lock is held from their argument list, which is
					// request-scoped by construction.
					$removed_connections = $integrations->forgetStaff( $id, $projection_lease );
					$guard->commit();
				} catch ( \Throwable $e ) {
					$guard->rollback();
					$removed_connections = array();

					return Errors::internal();
				}
			} finally {
				$projection_lease->release();
			}

			// E1 post-write (R2 #5) — the delete's own protection: a reconnect DURING the DELETE
			// replays it on a fresh connection WITHOUT the lock, so a reservation may have been
			// mid-flight against this staff. Recovery: re-insert the captured pre-image (deterministic;
			// any booking a racer committed then references an EXISTING row again) and report the
			// retryable lock loss — the client's retry deletes cleanly under a fresh lock.
			if ( null === $lock->connectionId() || $lock->connectionId() !== $guard->currentConnectionId() ) {
				$suppressed = $this->wpdb->suppress_errors( true );
				$restored   = $this->gateway->restore( $row );

				// Restore BOTH halves (Codex round 3, P1 #7): the compensation puts the staff member
				// back, so their connections have to come back with them or the retry would delete a
				// staff member whose integrations had already been silently unlinked.
				foreach ( $removed_connections as $connection_code => $connection ) {
					try {
						$this->integration_connections->save(
							(string) $connection_code,
							$id,
							$connection->data(),
							$connection->account,
							$connection->status
						);
					} catch ( \Throwable $e ) {
						// EXPLICIT, never silent (Codex round 4, P1 #7). A `continue` here meant the
						// route answered "retry" while a connection had really been destroyed — the
						// operator retries, the delete succeeds, and nobody ever learns a token was
						// lost in between.
						$restored = false;
					}
				}
				$removed_connections = array();
				$this->wpdb->suppress_errors( $suppressed );

				if ( ! $restored ) {
					\Aponto\Integration\IntegrationHealth::make()->recordGlobalFailure(
						'compensation',
						'Staff hard-delete compensation FAILED; the staff row or its connections were not restored.',
						$id
					);

					// `503` rather than the usual lock-timeout retry advice would be a lie about the
					// state, but `500` is the honest one: something is now inconsistent and a retry
					// cannot be assumed safe.
					return Errors::internal();
				}

				return Errors::lockTimeout();
			}
		} finally {
			if ( null !== $lock->connectionId() && $lock->connectionId() === $guard->currentConnectionId() ) {
				$lock->release();
			}
		}

		// Outside the lock: tell each provider the grant is over (best effort), then let the cron
		// scheduler re-decide — the tick exists only while some connection does (D-R34).
		$integrations->revokeRemoved( $removed_connections );
		RemoteEventSync::syncSchedule();

		try {
			/**
			 * Fires after a staff is deleted and business locks are released (extension-surface §2).
			 *
			 * @param array<string, mixed> $row Deleted row pre-image.
			 */
			do_action( 'aponto_staff_deleted', PersonName::withDisplayName( $row ) );
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
	 * Validate a create/update body.
	 *
	 * @param WP_REST_Request $request Request.
	 * @param bool            $partial Whether this is a partial (PATCH) body.
	 * @return array<string, mixed>|WP_Error
	 */
	private function validateBody( WP_REST_Request $request, bool $partial ) {
		$v    = new RequestValidator();
		$data = array();

		if ( $this->wants( $request, $partial, 'type' ) ) {
			$data['type'] = $v->enum( 'type', $request->get_param( 'type' ) ?? 'human', array( 'human', 'resource' ) );
		}
		// Name split (founder 2026-10-01, N3, D-R69): `first_name` is required on POST, `last_name`
		// is optional (a `resource` row — a room, a chair — has no surname), and a PATCH may send
		// either part alone. There is no `name` input any more (N2).
		if ( $this->wants( $request, $partial, 'first_name' ) ) {
			$data['first_name'] = $v->namePart( 'first_name', $request->get_param( 'first_name' ), 'first' );
		}
		if ( $this->wants( $request, $partial, 'last_name' ) ) {
			$data['last_name'] = $v->namePart( 'last_name', $request->get_param( 'last_name' ), 'last', false );
		}
		if ( $this->wants( $request, $partial, 'email' ) ) {
			$data['email'] = $v->email( 'email', $request->get_param( 'email' ) );
		}
		if ( $this->wants( $request, $partial, 'phone' ) ) {
			$data['phone'] = $v->phone( 'phone', $request->get_param( 'phone' ) ?? '' );
		}
		if ( $this->wants( $request, $partial, 'avatar_id' ) ) {
			$data['avatar_id'] = $v->nullableId( 'avatar_id', $request->get_param( 'avatar_id' ) );
		}
		if ( $this->wants( $request, $partial, 'wp_user_id' ) ) {
			$data['wp_user_id'] = $v->nullableId( 'wp_user_id', $request->get_param( 'wp_user_id' ) );
		}
		if ( $this->wants( $request, $partial, 'status' ) ) {
			$data['status'] = $v->enum( 'status', $request->get_param( 'status' ) ?? 'active', array( 'active', 'archived' ) );
		}
		// The PUBLIC PROFILE trio (D-R51). Core owns them in BOTH editions — the Free single
		// profile fills the same three fields — because the booking form that renders them is
		// pixel-identical across editions (§1 product rule: never gate form quality).
		if ( $this->wants( $request, $partial, 'title' ) ) {
			$data['title'] = $v->boundedText( 'title', $request->get_param( 'title' ) ?? '', self::TITLE_MAX );
		}
		if ( $this->wants( $request, $partial, 'bio' ) ) {
			// PLAIN TEXT, never HTML: this string is rendered inside the booking widget's shadow
			// root as a text node, and a `bio` that could carry markup would be a stored-XSS
			// surface reachable by anyone who can edit staff.
			$data['bio'] = $v->boundedText( 'bio', $request->get_param( 'bio' ) ?? '', self::BIO_MAX, true );
		}
		if ( $this->wants( $request, $partial, 'is_public' ) ) {
			$raw               = $request->get_param( 'is_public' );
			$data['is_public'] = ( null === $raw ? true : $v->bool( $raw ) ) ? 1 : 0;
		}
		if ( $request->has_param( 'position' ) ) {
			$position = $request->get_param( 'position' );
			if ( ! is_numeric( $position ) || (int) $position < 0 ) {
				$v->fail( 'position', __( 'Position must be zero or greater.', 'aponto' ) );
			} else {
				$data['position'] = (int) $position;
			}
		}

		// The legacy single `name` is REFUSED, never silently dropped (N2, D-R69) — and before the
		// "at least one field" check, so a PATCH carrying only `name` names the real problem.
		// Exactly this one key: the admin routes keep no allow-list.
		if ( RequestFields::submitted( $request, 'name' ) ) {
			$v->unknownField( 'name' );
		}

		if ( $v->failed() ) {
			return Errors::validation( $v->errors() );
		}
		if ( $partial && array() === $data ) {
			return Errors::validation( array( '_' => __( 'At least one field must be provided.', 'aponto' ) ) );
		}

		return $data;
	}

	/**
	 * Verify optional foreign keys resolve to real records; `null` when all are valid.
	 *
	 * @param array<string, mixed> $data Validated column map.
	 * @return WP_Error|null
	 */
	private function checkForeignKeys( array $data ): ?WP_Error {
		if ( isset( $data['avatar_id'] ) && null !== $data['avatar_id'] ) {
			$attachment_id = (int) $data['avatar_id'];
			$attachment    = get_post( $attachment_id );
			if ( ! $attachment instanceof WP_Post || 'attachment' !== $attachment->post_type ) {
				return Errors::notFound();
			}

			// THE ID IS USER INPUT, AND THE RESULT IS PUBLISHED UNAUTHENTICATED (Codex P2-3).
			// `aponto_manage_staff` is a booking capability; it says nothing about the media
			// library. Without this check a role granted staff management but not media access
			// could guess a private or draft attachment id, attach it, and have its URL served
			// to every visitor by the public roster (§3.1). `read_post` is the meta capability
			// WordPress itself uses to decide whether someone may see an attachment, so the
			// answer stays whatever the site's own roles and any media plugin already decided.
			//
			// The refusal is the SAME `404 aponto_not_found` an unknown id gets, deliberately:
			// distinguishing "does not exist" from "exists but is not yours" would confirm the
			// existence of a post the caller may not see, which is exactly what the probing
			// this check exists to stop is looking for. It also needs no new registry code and
			// no contract change — `404` for a bad `avatar_id` reference is already §2.5.
			if ( ! current_user_can( 'read_post', $attachment_id ) ) {
				return Errors::notFound();
			}

			// An attachment that EXISTS and is READABLE but is not a picture is a validation
			// failure, not a "not found" (D-R51): the record is right there, and `422` with the
			// field named is the only answer an operator who just picked a PDF can act on. It
			// is tested LAST so a `422` can never tell an unauthorized caller a mime type.
			if ( ! StaffAvatar::isImageAttachment( $attachment_id ) ) {
				return Errors::validation(
					array( 'avatar_id' => __( 'The photo must be an image file.', 'aponto' ) )
				);
			}
		}
		if ( isset( $data['wp_user_id'] ) && null !== $data['wp_user_id'] && false === get_userdata( (int) $data['wp_user_id'] ) ) {
			return Errors::notFound();
		}

		return null;
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
	 * The fields {@see StaffAvatar} needs from a staff row (D-R51).
	 *
	 * @param array<string, mixed> $row Raw row.
	 * @return array{id:int, avatar_id:int|null, email:string, wp_user_id:int|null}
	 */
	private static function avatarSubject( array $row ): array {
		return array(
			'id'         => (int) $row['id'],
			'avatar_id'  => Format::intOrNull( $row['avatar_id'] ?? null ),
			'email'      => (string) ( $row['email'] ?? '' ),
			'wp_user_id' => Format::intOrNull( $row['wp_user_id'] ?? null ),
		);
	}

	/**
	 * Serialize a staff row to its DTO.
	 *
	 * @param array<string, mixed> $row Raw row.
	 * @return array<string, mixed>
	 */
	private function toDto( array $row ): array {
		return array(
			'id'         => (int) $row['id'],
			'type'       => (string) $row['type'],
			// The composed display name (never stored) beside the two stored parts (N2, D-R69).
			'name'       => PersonName::display( (string) $row['first_name'], (string) $row['last_name'] ),
			'first_name' => (string) $row['first_name'],
			'last_name'  => (string) $row['last_name'],
			'email'      => (string) $row['email'],
			'phone'      => (string) $row['phone'],
			'avatar_id'  => Format::intOrNull( $row['avatar_id'] ),
			'wp_user_id' => Format::intOrNull( $row['wp_user_id'] ),
			'status'     => (string) $row['status'],
			'position'   => (int) $row['position'],
			// PUBLIC PROFILE (D-R51). `avatar` is the RESOLVED pair beside the raw `avatar_id`,
			// which stays because the editor round-trips the id, not a URL; `avatar` is null
			// whenever the attachment is gone, so the admin shows the initials fallback for
			// exactly the rows the booking form will.
			'title'      => (string) ( $row['title'] ?? '' ),
			'bio'        => (string) ( $row['bio'] ?? '' ),
			'is_public'  => (bool) ( $row['is_public'] ?? 1 ),
			'avatar'     => StaffAvatar::admin( self::avatarSubject( $row ) ),
			'created_at' => Format::utcDatetime( (string) $row['created_at'] ),
			'updated_at' => Format::utcDatetime( (string) $row['updated_at'] ),
		);
	}
}

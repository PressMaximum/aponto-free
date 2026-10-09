<?php
/**
 * REST service locator — the booking/availability object graph (§5.6, §1.2).
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

use Aponto\Availability\AvailabilityEngine;
use Aponto\Availability\BlockingPolicy;
use Aponto\Availability\BusinessTimezone;
use Aponto\Availability\ScheduleResolver;
use Aponto\Availability\SlotGenerator;
use Aponto\Availability\TimezoneConverter;
use Aponto\Booking\BookingStatusService;
use Aponto\Booking\EventDispatcher;
use Aponto\Booking\Repository\ActivityRepository;
use Aponto\Booking\Repository\BookingRepository;
use Aponto\Booking\Repository\BookingMetaRepository;
use Aponto\Booking\Repository\BusyRepository;
use Aponto\Booking\Repository\ConnectionRepository;
use Aponto\Booking\Repository\CustomerRepository;
use Aponto\Booking\Repository\IdempotencyRepository;
use Aponto\Booking\Repository\OrderRepository;
use Aponto\Booking\Repository\ScheduleRepository;
use Aponto\Booking\Repository\ServiceMetaRepository;
use Aponto\Booking\Repository\ServiceRepository;
use Aponto\Booking\Repository\StaffMetaRepository;
use Aponto\Booking\ReservationService;
use Aponto\Booking\RescheduleService;
use Aponto\Booking\StaffLockFactory;
use Aponto\Booking\ManageToken;
use Aponto\Booking\TokenGenerator;
use Aponto\Notification\NotificationDispatcher;
use Aponto\Payments\PaymentDispatcher;
use Aponto\Payments\PaymentEventLedger;
use Aponto\Payments\PaymentService;
use Aponto\Payments\TransactionRepository;
use Aponto\Support\Clock;
use Aponto\Support\Logger;
use Aponto\Support\ModuleSecrets;
use Aponto\Support\Settings;

/**
 * Constructs and memoises the booking/availability write model exactly as the test harness does
 * ({@see \Aponto\Tests\Integration\EngineTestCase}), so REST controllers, the notification
 * dispatcher and the cleanup cron all share one wiring source. Nothing here mutates the engine
 * services — it only assembles their dependency graph.
 */
final class Services {

	/**
	 * Memoised singletons keyed by method name.
	 *
	 * @var array<string, object>
	 */
	private array $cache = array();

	/**
	 * Construct the locator.
	 *
	 * @param \wpdb    $wpdb     Database handle.
	 * @param Settings $settings Core settings.
	 * @param Clock    $clock    Clock.
	 */
	public function __construct(
		private \wpdb $wpdb,
		private Settings $settings,
		private Clock $clock
	) {}

	/**
	 * Database handle.
	 */
	public function wpdb(): \wpdb {
		return $this->wpdb;
	}

	/**
	 * Core settings.
	 */
	public function settings(): Settings {
		return $this->settings;
	}

	/**
	 * Clock.
	 */
	public function clock(): Clock {
		return $this->clock;
	}

	/** Privacy-safe structured debug logger. */
	public function logger(): Logger {
		return $this->once( 'logger', fn (): Logger => new Logger( $this->settings, $this->clock ) );
	}

	/**
	 * Memoise a built instance.
	 *
	 * @template T of object
	 * @param string       $key     Cache key.
	 * @param callable():T $factory Factory.
	 * @return T
	 */
	private function once( string $key, callable $factory ): object {
		if ( ! isset( $this->cache[ $key ] ) ) {
			$this->cache[ $key ] = $factory();
		}

		return $this->cache[ $key ];
	}

	/**
	 * Availability engine.
	 */
	public function engine(): AvailabilityEngine {
		return $this->once(
			'engine',
			fn (): AvailabilityEngine => new AvailabilityEngine(
				$this->serviceRepository(),
				new ScheduleRepository( $this->wpdb ),
				new BusyRepository( $this->wpdb, new BlockingPolicy() ),
				$this->connectionRepository(),
				new ScheduleResolver(),
				new SlotGenerator( $this->converter() ),
				$this->converter(),
				$this->businessTimezone(),
				$this->clock
			)
		);
	}

	/**
	 * Reservation write model. The transactional-outbox hook (REST-1) is installed here: created
	 * notifications are rendered + queued INSIDE the reservation transaction; controllers flush
	 * them post-commit via {@see \Aponto\Notification\NotificationDispatcher::flushBooking()}.
	 */
	public function reservationService(): ReservationService {
		return $this->once(
			'reserve',
			function (): ReservationService {
				$service = new ReservationService(
					$this->wpdb,
					$this->clock,
					$this->settings,
					$this->engine(),
					$this->serviceRepository(),
					new CustomerRepository( $this->wpdb, $this->clock ),
					$this->bookingRepository(),
					new OrderRepository( $this->wpdb, $this->tokenGenerator(), $this->clock ),
					new IdempotencyRepository( $this->wpdb, $this->clock ),
					new ActivityRepository( $this->wpdb, $this->clock ),
					$this->connectionRepository(),
					$this->tokenGenerator(),
					new EventDispatcher(),
					$this->converter(),
					$this->businessTimezone(),
					new StaffLockFactory( $this->wpdb ),
					$this->manageToken()
				);

				// STEP 1 — the customer's answers to the site's extra booking-form fields
				// (D-R30). Written inside the same transaction as the booking, so a rolled-back
				// attempt leaves no orphan answers and a committed booking always carries the
				// answers the customer actually gave. Empty on every site that configures none,
				// which is every Free site.
				$service->addOnPersist(
					function ( \Aponto\Booking\Booking $booking, ?string $raw_token, \Aponto\Booking\BookingDraft $draft ): void {
						unset( $raw_token );
						if ( array() === $draft->custom_fields ) {
							return;
						}
						$this->bookingMetaRepository()->setCustomFields( $booking->id, $draft->custom_fields );
					}
				);

				// STEP 2 — the payment HOLD (D-R38b). Written inside the same transaction as the
				// booking, so a rolled-back attempt leaves no orphan hold and a committed pay-online
				// booking always carries the deadline that will release its slot.
				//
				// ORDER IS LOAD-BEARING: this step runs BEFORE the outbox, because the outbox reads
				// the order to decide whether the booking is a hold — and a hold suppresses the three
				// `created` emails. Registering it after would mean the customer is told "we received
				// your booking" for an appointment that is not booked yet.
				//
				// A draft with no method is every on-site booking, every free booking and every site
				// that takes no online payment: the step returns immediately and the behaviour below
				// is byte-identical to the pre-D-R38 build.
				$service->addOnPersist(
					function ( \Aponto\Booking\Booking $booking, ?string $raw_token, \Aponto\Booking\BookingDraft $draft ): void {
						unset( $raw_token );
						if ( '' === $draft->payment_method || null === $booking->order_id ) {
							return;
						}
						$this->orderRepository()->markHold(
							(int) $booking->order_id,
							$draft->payment_method,
							$this->paymentService()->holdDeadline()
						);
					}
				);

				// STEP 3 — the transactional outbox. This used to be the ONLY step, installed
				// through a single-slot setter; a second writer would have replaced it silently
				// and disabled every confirmation email, which is why the seam is a list.
				$service->addOnPersist(
					function ( \Aponto\Booking\Booking $booking, ?string $raw_token ): void {
						$this->notificationDispatcher()->queueCreated( $booking, $raw_token, 'send' );
					}
				);

				return $service;
			}
		);
	}

	/**
	 * Reschedule write model. The V3 outbox seam queues the reschedule notification INSIDE the
	 * write transaction; callers flush post-commit.
	 */
	public function rescheduleService(): RescheduleService {
		return $this->once(
			'reschedule',
			function (): RescheduleService {
				$service = new RescheduleService(
					$this->wpdb,
					$this->clock,
					$this->engine(),
					$this->serviceRepository(),
					$this->bookingRepository(),
					new ActivityRepository( $this->wpdb, $this->clock ),
					new EventDispatcher(),
					$this->converter(),
					$this->businessTimezone(),
					new StaffLockFactory( $this->wpdb )
				);

				$service->setOnPersist(
					function ( \Aponto\Booking\Event\BookingRescheduled $event ): void {
						$this->notificationDispatcher()->queueRescheduled( $event->booking, $event->notification_policy, $event->previous );
					}
				);

				return $service;
			}
		);
	}

	/**
	 * Booking status write model. The V3 outbox seam queues transition notifications INSIDE the
	 * write transaction; callers flush post-commit.
	 */
	public function bookingStatusService(): BookingStatusService {
		return $this->once(
			'status',
			function (): BookingStatusService {
				$service = new BookingStatusService(
					$this->wpdb,
					$this->clock,
					$this->engine(),
					$this->bookingRepository(),
					new ActivityRepository( $this->wpdb, $this->clock ),
					new EventDispatcher(),
					new StaffLockFactory( $this->wpdb )
				);

				// The seam RETURNS the delivery rows it claimed (review round 3, P2-1): the identity
				// failure compensation must delete its own rows and nobody else's, and the only
				// actor that knows which those are is the one that claimed them. A hook that
				// returns nothing still works — the write model treats a non-array as "none".
				$service->setOnPersist(
					function ( \Aponto\Booking\Event\BookingStatusChanged $event ): array {
						$dispatcher = $this->notificationDispatcher();
						$dispatcher->queueStatusChanged( $event->booking, $event->to, $event->notification_policy, $event->reason, $event->initiated_by );

						return $dispatcher->claimedDeliveryIdsFor( $event->booking->id );
					}
				);

				return $service;
			}
		);
	}

	/**
	 * Service reader.
	 */
	public function serviceRepository(): ServiceRepository {
		return $this->once( 'services', fn (): ServiceRepository => new ServiceRepository( $this->wpdb, $this->settings ) );
	}

	/**
	 * Booking repository.
	 */
	public function bookingRepository(): BookingRepository {
		return $this->once( 'bookings', fn (): BookingRepository => new BookingRepository( $this->wpdb ) );
	}

	/**
	 * Booking metadata repository.
	 */
	public function bookingMetaRepository(): BookingMetaRepository {
		return $this->once( 'booking_meta', fn (): BookingMetaRepository => new BookingMetaRepository( $this->wpdb ) );
	}

	/**
	 * Staff metadata repository — the home of an integration's per-staff connection
	 * (extension-surface §4).
	 */
	public function staffMetaRepository(): StaffMetaRepository {
		return $this->once( 'staff_meta', fn (): StaffMetaRepository => new StaffMetaRepository( $this->wpdb ) );
	}

	/**
	 * Service metadata repository — the home of an integration's `used` flag (extension-surface §4).
	 */
	public function serviceMetaRepository(): ServiceMetaRepository {
		return $this->once( 'service_meta', fn (): ServiceMetaRepository => new ServiceMetaRepository( $this->wpdb ) );
	}

	/**
	 * Module secret sealing helper (extension-surface §5.3).
	 *
	 * ONE factory, shared with the generic settings controller and every module `Config`, so a blob
	 * sealed by one and opened by another agrees on the key derivation — and so the site's key
	 * material is read in exactly one place ({@see ModuleSecrets::siteKeyMaterial()}). No
	 * substitution: a site without a usable `SECURE_AUTH_KEY` is refused at the write, never sealed
	 * under a literal from the source (Codex round 3, P1 #1).
	 */
	public function moduleSecrets(): ModuleSecrets {
		return $this->once( 'module_secrets', static fn (): ModuleSecrets => ModuleSecrets::forSite() );
	}

	/**
	 * Order repository.
	 */
	public function orderRepository(): OrderRepository {
		return $this->once( 'orders', fn (): OrderRepository => new OrderRepository( $this->wpdb, $this->tokenGenerator(), $this->clock ) );
	}

	/**
	 * Activity repository.
	 */
	public function activityRepository(): ActivityRepository {
		return $this->once( 'activities', fn (): ActivityRepository => new ActivityRepository( $this->wpdb, $this->clock ) );
	}

	/**
	 * Staff-service connection reader.
	 */
	public function connectionRepository(): ConnectionRepository {
		return $this->once( 'connections', fn (): ConnectionRepository => new ConnectionRepository( $this->wpdb ) );
	}

	/**
	 * Business-timezone resolver.
	 */
	public function businessTimezone(): BusinessTimezone {
		return $this->once( 'tz', fn (): BusinessTimezone => new BusinessTimezone( $this->wpdb ) );
	}

	/**
	 * Wall-clock converter.
	 */
	public function converter(): TimezoneConverter {
		return $this->once( 'converter', fn (): TimezoneConverter => new TimezoneConverter() );
	}

	/**
	 * Token / order-code generator.
	 */
	public function tokenGenerator(): TokenGenerator {
		return $this->once( 'tokens', fn (): TokenGenerator => new TokenGenerator() );
	}

	/**
	 * Durable manage-token derivation (D-R26). Memoised so the sealed derivation secret is opened
	 * at most once per request.
	 */
	public function manageToken(): ManageToken {
		return $this->once( 'manage_token', fn (): ManageToken => new ManageToken( $this->wpdb, $this->tokenGenerator() ) );
	}

	/**
	 * Payment transaction ledger (D-R38).
	 */
	public function transactionRepository(): TransactionRepository {
		return $this->once( 'transactions', fn (): TransactionRepository => new TransactionRepository( $this->wpdb, $this->clock ) );
	}

	/**
	 * Webhook replay guard (D-R38f).
	 */
	public function paymentEventLedger(): PaymentEventLedger {
		return $this->once( 'payment_events', fn (): PaymentEventLedger => new PaymentEventLedger( $this->wpdb, $this->clock ) );
	}

	/**
	 * Hook-per-key payment driver dispatch (extension-surface §5b.2).
	 */
	public function paymentDispatcher(): PaymentDispatcher {
		return $this->once( 'payment_dispatcher', fn (): PaymentDispatcher => new PaymentDispatcher( $this->logger() ) );
	}

	/**
	 * Order payment state machine (D-R38).
	 */
	public function paymentService(): PaymentService {
		return $this->once(
			'payments',
			fn (): PaymentService => new PaymentService(
				$this->wpdb,
				$this->clock,
				$this->settings,
				$this->orderRepository(),
				$this->transactionRepository(),
				$this->paymentDispatcher(),
				$this->bookingRepository(),
				$this->bookingStatusService(),
				$this->notificationDispatcher(),
				$this->activityRepository(),
				$this->bookingMetaRepository(),
				new StaffLockFactory( $this->wpdb ),
				$this->logger()
			)
		);
	}

	/**
	 * Notification dispatcher.
	 */
	public function notificationDispatcher(): NotificationDispatcher {
		return $this->once(
			'dispatcher',
			fn (): NotificationDispatcher => new NotificationDispatcher( $this->wpdb, $this->settings, $this->clock, $this->businessTimezone() )
		);
	}
}
